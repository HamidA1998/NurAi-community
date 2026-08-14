import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { createPublicKey, createVerify, type JsonWebKey } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "./db";
import { users, userProgress } from "@shared/schema";
import { eq, or } from "drizzle-orm";
import {
  durableRateLimiter,
  getAIRateLimitSubjectFromRequest,
  type AIRateLimitPolicy,
} from "./ai/rateLimit";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

interface AppleJwtHeader {
  alg?: string;
  kid?: string;
}

interface AppleIdentityClaims {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  sub?: string;
  email?: string;
}

interface AppleJwksCache {
  expiresAt: number;
  keys: JsonWebKey[];
}

const AUTH_RATE_LIMIT_POLICY: AIRateLimitPolicy = {
  namespace: "auth",
  windowMs: 15 * 60_000,
  maxRequests: 20,
};

const USERNAME_CHECK_RATE_LIMIT_POLICY: AIRateLimitPolicy = {
  namespace: "auth:username",
  windowMs: 60_000,
  maxRequests: 30,
};

const PROFILE_UPDATE_RATE_LIMIT_POLICY: AIRateLimitPolicy = {
  namespace: "auth:profile",
  windowMs: 60_000,
  maxRequests: 12,
};

const MAX_PROFILE_PHOTO_BYTES = 512 * 1024;

let appleJwksCache: AppleJwksCache | null = null;

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function normalizeUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const username = value.trim().toLowerCase();
  if (username.length < 3 || username.length > 30) return null;
  if (!/^[a-z0-9._]+$/.test(username)) return null;
  return username;
}

function cleanDisplayName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const clean = value.trim().replace(/\s+/g, " ").slice(0, 80);
  return clean || fallback;
}

function normalizeProfilePhoto(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 1_100_000) {
    throw new Error("invalid_profile_photo");
  }

  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(
    value,
  );
  if (!match) throw new Error("invalid_profile_photo");

  const mimeSubtype = match[1];
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error("invalid_profile_photo");
  }

  const isJpeg =
    mimeSubtype === "jpeg" &&
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;
  const isPng =
    mimeSubtype === "png" &&
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  const isWebp =
    mimeSubtype === "webp" &&
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP";

  if (!isJpeg && !isPng && !isWebp) {
    throw new Error("invalid_profile_photo");
  }

  return `data:image/${mimeSubtype};base64,${bytes.toString("base64")}`;
}

async function enforceRateLimit(
  req: Request,
  res: Response,
  policy: AIRateLimitPolicy = AUTH_RATE_LIMIT_POLICY,
): Promise<boolean> {
  const decision = await durableRateLimiter.check(
    getAIRateLimitSubjectFromRequest(req),
    policy,
  );

  res.setHeader("X-RateLimit-Limit", String(decision.limit));
  res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
  res.setHeader("X-RateLimit-Reset", decision.resetAt.toISOString());

  if (decision.allowed) return true;

  res.setHeader("Retry-After", String(Math.ceil(decision.retryAfterMs / 1000)));
  res.status(429).json({
    error: "rate_limited",
    message: "Too many attempts. Please wait and try again.",
  });
  return false;
}

function establishSession(req: Request, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }
      req.session.userId = userId;
      resolve();
    });
  });
}

function decodeBase64UrlJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function appJsonBundleIdentifier(): string | null {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    return typeof appJson.expo?.ios?.bundleIdentifier === "string"
      ? appJson.expo.ios.bundleIdentifier
      : null;
  } catch {
    return null;
  }
}

function expectedAppleAudiences(): string[] {
  return [
    process.env.APPLE_CLIENT_ID,
    process.env.APPLE_SERVICE_ID,
    process.env.EXPO_PUBLIC_APPLE_SERVICE_ID,
    process.env.APPLE_BUNDLE_ID,
    process.env.EXPO_PUBLIC_APPLE_CLIENT_ID,
    appJsonBundleIdentifier(),
  ]
    .map((value) => value?.trim())
    .filter((value, index, all): value is string =>
      Boolean(value && all.indexOf(value) === index),
    );
}

async function fetchAppleJwks(): Promise<JsonWebKey[]> {
  if (appleJwksCache && appleJwksCache.expiresAt > Date.now()) {
    return appleJwksCache.keys;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch("https://appleid.apple.com/auth/keys", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Apple JWKS request failed with ${response.status}`);
    }
    const body = (await response.json()) as { keys?: JsonWebKey[] };
    if (!Array.isArray(body.keys) || body.keys.length === 0) {
      throw new Error("Apple JWKS response did not include signing keys");
    }
    appleJwksCache = {
      keys: body.keys,
      expiresAt: Date.now() + 60 * 60_000,
    };
    return body.keys;
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyAppleIdentityToken(
  identityToken: string,
): Promise<Required<Pick<AppleIdentityClaims, "sub">> & { email?: string }> {
  if (typeof identityToken !== "string" || identityToken.length > 6000) {
    throw new Error("Invalid Apple identity token");
  }

  const parts = identityToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid Apple identity token");
  }

  const header = decodeBase64UrlJson<AppleJwtHeader>(parts[0]);
  const payload = decodeBase64UrlJson<AppleIdentityClaims>(parts[1]);

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unsupported Apple identity token signature");
  }
  if (payload.iss !== "https://appleid.apple.com") {
    throw new Error("Invalid Apple token issuer");
  }
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Apple token is missing a subject");
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= nowSeconds) {
    throw new Error("Apple token has expired");
  }
  if (payload.iat && payload.iat > nowSeconds + 300) {
    throw new Error("Apple token issue time is invalid");
  }

  const allowedAudiences = expectedAppleAudiences();
  const tokenAudiences = Array.isArray(payload.aud)
    ? payload.aud
    : payload.aud
      ? [payload.aud]
      : [];
  if (
    allowedAudiences.length === 0 ||
    !tokenAudiences.some((audience) => allowedAudiences.includes(audience))
  ) {
    throw new Error("Apple token audience is not allowed for this app");
  }

  const keys = await fetchAppleJwks();
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) {
    throw new Error("Apple signing key was not found");
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();

  const verified = verifier.verify(
    createPublicKey({ key: jwk, format: "jwk" }),
    Buffer.from(parts[2], "base64url"),
  );
  if (!verified) {
    throw new Error("Apple identity token signature verification failed");
  }

  return {
    sub: payload.sub,
    email: normalizeEmail(payload.email) || undefined,
  };
}

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      if (!(await enforceRateLimit(req, res))) return;

      const { email, password, displayName } = req.body;
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail || !password) {
        return res
          .status(400)
          .json({ error: "A valid email and password are required" });
      }
      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters" });
      }

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (existing.length > 0) {
        return res
          .status(409)
          .json({ error: "An account with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const username =
        normalizedEmail.split("@")[0] + "_" + Date.now().toString(36);

      const [user] = await db
        .insert(users)
        .values({
          username,
          email: normalizedEmail,
          password: hashedPassword,
          displayName: cleanDisplayName(
            displayName,
            normalizedEmail.split("@")[0],
          ),
          authProvider: "email",
        })
        .returning();

      await establishSession(req, user.id);

      return res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        profilePhoto: user.profilePhoto,
        authProvider: user.authProvider,
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      if (!(await enforceRateLimit(req, res))) return;

      const { email, identifier, password } = req.body;
      const loginIdentifier = identifier ?? email;
      const normalizedEmail = normalizeEmail(loginIdentifier);
      const normalizedUsername = normalizedEmail
        ? null
        : normalizeUsername(loginIdentifier);

      if ((!normalizedEmail && !normalizedUsername) || !password) {
        return res.status(400).json({
          error: "A valid email or username and password are required",
        });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(
          normalizedEmail
            ? eq(users.email, normalizedEmail)
            : eq(users.username, normalizedUsername!),
        )
        .limit(1);
      if (!user || !user.password) {
        return res
          .status(401)
          .json({ error: "Invalid email, username, or password" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res
          .status(401)
          .json({ error: "Invalid email, username, or password" });
      }

      await establishSession(req, user.id);

      return res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        profilePhoto: user.profilePhoto,
        authProvider: user.authProvider,
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/apple", async (req: Request, res: Response) => {
    try {
      if (!(await enforceRateLimit(req, res))) return;

      const { identityToken, fullName } = req.body;
      if (!identityToken) {
        return res.status(400).json({ error: "Identity token is required" });
      }

      const appleClaims = await verifyAppleIdentityToken(identityToken);
      const appleUserId = appleClaims.sub;
      const verifiedEmail = appleClaims.email;
      if (!appleUserId) {
        return res.status(400).json({ error: "Invalid identity token" });
      }

      const lookupCondition = verifiedEmail
        ? or(
            eq(users.providerAccountId, appleUserId),
            eq(users.email, verifiedEmail),
          )
        : eq(users.providerAccountId, appleUserId);

      let [user] = await db
        .select()
        .from(users)
        .where(lookupCondition)
        .limit(1);

      if (!user) {
        const name = fullName?.givenName
          ? `${fullName.givenName}${fullName.familyName ? " " + fullName.familyName : ""}`
          : "Apple User";
        const username = "apple_" + Date.now().toString(36);

        [user] = await db
          .insert(users)
          .values({
            username,
            email: verifiedEmail || null,
            displayName: name,
            authProvider: "apple",
            providerAccountId: appleUserId,
          })
          .returning();
      } else {
        const updates: any = {};
        if (!user.providerAccountId && user.authProvider !== "apple") {
          updates.providerAccountId = appleUserId;
          updates.authProvider = "apple";
        }
        if (
          fullName?.givenName &&
          (user.displayName === "Apple User" || !user.displayName)
        ) {
          updates.displayName = cleanDisplayName(
            `${fullName.givenName}${fullName.familyName ? " " + fullName.familyName : ""}`,
            user.displayName || "Apple User",
          );
        }
        if (!user.email && verifiedEmail) {
          updates.email = verifiedEmail;
        }
        if (Object.keys(updates).length > 0) {
          [user] = await db
            .update(users)
            .set(updates)
            .where(eq(users.id, user.id))
            .returning();
        }
      }

      await establishSession(req, user.id);

      return res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        profilePhoto: user.profilePhoto,
        authProvider: user.authProvider,
      });
    } catch (error) {
      console.error("Apple auth error:", error);
      const message = error instanceof Error ? error.message : "";
      if (
        message.includes("Apple") ||
        message.includes("token") ||
        message.includes("signature") ||
        message.includes("audience") ||
        message.includes("issuer")
      ) {
        return res.status(400).json({ error: "Invalid Apple identity token" });
      }
      return res.status(500).json({ error: "Apple sign-in failed" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found" });
      }

      return res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        profilePhoto: user.profilePhoto,
        authProvider: user.authProvider,
      });
    } catch (error) {
      console.error("Auth check error:", error);
      return res.status(500).json({ error: "Authentication check failed" });
    }
  });

  app.get("/api/auth/username/check", async (req: Request, res: Response) => {
    try {
      if (!(await enforceRateLimit(req, res, USERNAME_CHECK_RATE_LIMIT_POLICY)))
        return;

      const { username } = req.query;
      if (
        !username ||
        typeof username !== "string" ||
        username.trim().length < 3
      ) {
        return res.json({
          available: false,
          reason: "Username must be at least 3 characters",
        });
      }
      const clean = username.trim().toLowerCase();
      if (!/^[a-z0-9._]+$/.test(clean)) {
        return res.json({
          available: false,
          reason: "Only letters, numbers, dots, and underscores allowed",
        });
      }
      if (clean.length > 30) {
        return res.json({
          available: false,
          reason: "Username must be 30 characters or less",
        });
      }
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.username, clean))
        .limit(1);
      if (existing) {
        return res.json({
          available: false,
          reason: "This username is already taken",
        });
      }
      return res.json({ available: true });
    } catch (error) {
      console.error("Username check error:", error);
      return res.status(500).json({ error: "Check failed" });
    }
  });

  app.put("/api/auth/username", async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { username } = req.body;
      if (!username || typeof username !== "string") {
        return res.status(400).json({ error: "Username is required" });
      }
      const clean = username.trim().toLowerCase();
      if (clean.length < 3) {
        return res
          .status(400)
          .json({ error: "Username must be at least 3 characters" });
      }
      if (clean.length > 30) {
        return res
          .status(400)
          .json({ error: "Username must be 30 characters or less" });
      }
      if (!/^[a-z0-9._]+$/.test(clean)) {
        return res.status(400).json({
          error: "Only letters, numbers, dots, and underscores allowed",
        });
      }
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.username, clean))
        .limit(1);
      if (existing && existing.id !== userId) {
        return res
          .status(409)
          .json({ error: "This username is already taken" });
      }
      const [updated] = await db
        .update(users)
        .set({ username: clean })
        .where(eq(users.id, userId))
        .returning();
      return res.json({
        id: updated.id,
        email: updated.email,
        username: updated.username,
        displayName: updated.displayName,
        profilePhoto: updated.profilePhoto,
        authProvider: updated.authProvider,
      });
    } catch (error) {
      console.error("Set username error:", error);
      return res.status(500).json({ error: "Failed to set username" });
    }
  });

  app.put("/api/auth/profile", async (req: Request, res: Response) => {
    try {
      if (!(await enforceRateLimit(req, res, PROFILE_UPDATE_RATE_LIMIT_POLICY)))
        return;

      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { displayName, profilePhoto } = req.body;
      const updates: { displayName?: string; profilePhoto?: string | null } =
        {};

      if (displayName !== undefined) {
        if (typeof displayName !== "string" || !displayName.trim()) {
          return res.status(400).json({ error: "Display name is required" });
        }
        updates.displayName = cleanDisplayName(displayName, "NurAI User");
      }

      if (profilePhoto !== undefined) {
        try {
          updates.profilePhoto = normalizeProfilePhoto(profilePhoto);
        } catch {
          return res.status(400).json({
            error:
              "Choose a JPEG, PNG, or WebP profile photo smaller than 512 KB.",
          });
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No profile changes supplied" });
      }

      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning();
      return res.json({
        id: updated.id,
        email: updated.email,
        username: updated.username,
        displayName: updated.displayName,
        profilePhoto: updated.profilePhoto,
        authProvider: updated.authProvider,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true });
    });
  });

  app.delete("/api/auth/account", async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { conversations: convTable } = await import("@shared/schema");
      const userConversations = await db
        .select({ id: convTable.id })
        .from(convTable)
        .where(eq(convTable.userId, userId));

      if (userConversations.length > 0) {
        const { messages: msgTable } = await import("@shared/schema");
        for (const conv of userConversations) {
          await db.delete(msgTable).where(eq(msgTable.conversationId, conv.id));
        }
        await db.delete(convTable).where(eq(convTable.userId, userId));
      }

      await db.delete(userProgress).where(eq(userProgress.userId, userId));
      await db.delete(users).where(eq(users.id, userId));

      req.session.destroy(() => {});
      res.clearCookie("connect.sid");

      return res.json({ success: true });
    } catch (error) {
      console.error("Account deletion error:", error);
      return res.status(500).json({ error: "Account deletion failed" });
    }
  });
}
