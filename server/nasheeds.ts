import type { Express, Request, Response } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { nasheedTracks } from "@shared/schema";
import {
  durableRateLimiter,
  getAIRateLimitSubjectFromRequest,
} from "./ai/rateLimit";

const NASHEED_CATEGORIES = [
  "Relaxing",
  "Motivational",
  "Ramadan",
  "Kids",
  "Dhikr",
  "Wedding",
  "Classical",
] as const;

const NASHEED_SOURCE_TYPES = ["owned", "licensed"] as const;

const adminNasheedSchema = z.object({
  slug: z.string().trim().min(2).max(90).optional(),
  title: z.string().trim().min(2).max(120),
  artist: z.string().trim().min(2).max(120).default("NurAI Originals"),
  duration: z.string().trim().min(2).max(16).default("--:--"),
  category: z.enum(NASHEED_CATEGORIES),
  audioUrl: z.string().trim().url().max(2000),
  fallbackUrl: z.string().trim().url().max(2000).nullable().optional(),
  coverUrl: z.string().trim().url().max(2000).nullable().optional(),
  sourceType: z.enum(NASHEED_SOURCE_TYPES).default("owned"),
  licenseLabel: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .default("NurAI owned/licensed audio"),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  metadata: z.record(z.unknown()).default({}),
});

const updateNasheedSchema = adminNasheedSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required",
  );

type AdminNasheedInput = z.infer<typeof adminNasheedSchema>;
type UpdateNasheedInput = z.infer<typeof updateNasheedSchema>;

async function enforceNasheedRateLimit(
  req: Request,
  res: Response,
): Promise<boolean> {
  const decision = await durableRateLimiter.check(
    getAIRateLimitSubjectFromRequest(req),
    {
      namespace: "nasheeds",
      windowMs: 60_000,
      maxRequests: 90,
    },
  );
  res.setHeader("X-RateLimit-Limit", String(decision.limit));
  res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
  if (decision.allowed) return true;

  res.setHeader("Retry-After", String(Math.ceil(decision.retryAfterMs / 1000)));
  res.status(429).json({
    error: "too_many_requests",
    message: "Please wait a moment before refreshing nasheeds again.",
  });
  return false;
}

function requireNasheedAdmin(req: Request, res: Response): boolean {
  const configuredSecret = process.env.NURAI_ADMIN_SECRET;
  if (!configuredSecret) {
    res.status(503).json({
      error: "admin_not_configured",
      message: "Nasheed management is not available yet.",
    });
    return false;
  }

  const suppliedSecret = req.header("x-admin-secret");
  if (suppliedSecret !== configuredSecret) {
    res.status(403).json({
      error: "forbidden",
      message: "You do not have permission to manage nasheeds.",
    });
    return false;
  }

  return true;
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function ensureHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      throw new Error("Audio and cover URLs must use HTTPS.");
    }
    return url.toString();
  } catch {
    throw new Error("Use a valid HTTPS URL for nasheed media.");
  }
}

function mapNasheedTrack(track: typeof nasheedTracks.$inferSelect) {
  return {
    id: track.id,
    slug: track.slug,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    category: track.category,
    isFeatured: track.isFeatured,
    audioUrl: track.audioUrl,
    fallbackUrl: track.fallbackUrl || track.audioUrl,
    coverUrl: track.coverUrl,
    sourceType: track.sourceType,
    licenseLabel: track.licenseLabel,
    sortOrder: track.sortOrder,
    updatedAt: track.updatedAt.toISOString(),
  };
}

function valuesFromCreateInput(input: AdminNasheedInput) {
  const audioUrl = ensureHttpsUrl(input.audioUrl);
  const fallbackUrl = ensureHttpsUrl(input.fallbackUrl);
  const coverUrl = ensureHttpsUrl(input.coverUrl);
  if (!audioUrl) {
    throw new Error("A nasheed audio URL is required.");
  }

  return {
    slug: normalizeSlug(input.slug || input.title),
    title: input.title,
    artist: input.artist,
    duration: input.duration,
    category: input.category,
    audioUrl,
    fallbackUrl,
    coverUrl,
    sourceType: input.sourceType,
    licenseLabel: input.licenseLabel,
    isFeatured: input.isFeatured,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
    metadata: input.metadata,
    updatedAt: new Date(),
  };
}

function valuesFromUpdateInput(input: UpdateNasheedInput) {
  const values: Partial<typeof nasheedTracks.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.slug !== undefined) values.slug = normalizeSlug(input.slug);
  if (input.title !== undefined) values.title = input.title;
  if (input.artist !== undefined) values.artist = input.artist;
  if (input.duration !== undefined) values.duration = input.duration;
  if (input.category !== undefined) values.category = input.category;
  if (input.audioUrl !== undefined) {
    const audioUrl = ensureHttpsUrl(input.audioUrl);
    if (!audioUrl) throw new Error("A nasheed audio URL is required.");
    values.audioUrl = audioUrl;
  }
  if (input.fallbackUrl !== undefined) {
    values.fallbackUrl = ensureHttpsUrl(input.fallbackUrl);
  }
  if (input.coverUrl !== undefined) {
    values.coverUrl = ensureHttpsUrl(input.coverUrl);
  }
  if (input.sourceType !== undefined) values.sourceType = input.sourceType;
  if (input.licenseLabel !== undefined) {
    values.licenseLabel = input.licenseLabel;
  }
  if (input.isFeatured !== undefined) values.isFeatured = input.isFeatured;
  if (input.isActive !== undefined) values.isActive = input.isActive;
  if (input.sortOrder !== undefined) values.sortOrder = input.sortOrder;
  if (input.metadata !== undefined) values.metadata = input.metadata;

  return values;
}

function sendNasheedError(res: Response, error: unknown) {
  const message =
    error instanceof Error && error.message.includes("HTTPS")
      ? error.message
      : "Nasheed catalogue could not be updated. Please try again.";
  res.status(400).json({
    error: "nasheed_catalogue_error",
    message,
  });
}

export function registerNasheedRoutes(app: Express) {
  app.get("/api/nasheeds", async (req, res) => {
    try {
      if (!(await enforceNasheedRateLimit(req, res))) return;

      const tracks = await db
        .select()
        .from(nasheedTracks)
        .where(eq(nasheedTracks.isActive, true))
        .orderBy(
          desc(nasheedTracks.isFeatured),
          asc(nasheedTracks.sortOrder),
          asc(nasheedTracks.title),
        );

      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
      res.json({
        tracks: tracks.map(mapNasheedTrack),
        source: "server",
      });
    } catch (error) {
      console.warn("[nasheeds] catalogue load failed", error);
      res.status(503).json({
        error: "nasheeds_unavailable",
        message: "Nasheeds are temporarily unavailable. Please try again.",
      });
    }
  });

  app.post("/api/admin/nasheeds", async (req, res) => {
    try {
      if (!requireNasheedAdmin(req, res)) return;

      const parsed = adminNasheedSchema.parse(req.body);
      const [track] = await db
        .insert(nasheedTracks)
        .values(valuesFromCreateInput(parsed))
        .returning();

      res.status(201).json({ track: mapNasheedTrack(track) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "invalid_nasheed",
          message: "Please check the nasheed details and try again.",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
        return;
      }
      sendNasheedError(res, error);
    }
  });

  app.put("/api/admin/nasheeds/:id", async (req, res) => {
    try {
      if (!requireNasheedAdmin(req, res)) return;

      const parsed = updateNasheedSchema.parse(req.body);
      const [track] = await db
        .update(nasheedTracks)
        .set(valuesFromUpdateInput(parsed))
        .where(eq(nasheedTracks.id, req.params.id))
        .returning();

      if (!track) {
        res.status(404).json({
          error: "nasheed_not_found",
          message: "That nasheed could not be found.",
        });
        return;
      }

      res.json({ track: mapNasheedTrack(track) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "invalid_nasheed",
          message: "Please check the nasheed details and try again.",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
        return;
      }
      sendNasheedError(res, error);
    }
  });

  app.delete("/api/admin/nasheeds/:id", async (req, res) => {
    try {
      if (!requireNasheedAdmin(req, res)) return;

      const [track] = await db
        .update(nasheedTracks)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(nasheedTracks.id, req.params.id))
        .returning();

      if (!track) {
        res.status(404).json({
          error: "nasheed_not_found",
          message: "That nasheed could not be found.",
        });
        return;
      }

      res.json({ removed: true, track: mapNasheedTrack(track) });
    } catch (error) {
      sendNasheedError(res, error);
    }
  });
}
