import express from "express";
import type { Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { pool } from "./db";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;
const DEV_SESSION_SECRET = "nurai-dev-secret-change-in-prod";
const isProduction = process.env.NODE_ENV === "production";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    for (const host of configuredExternalHosts()) {
      origins.add(`https://${host}`);
    }

    const origin = req.header("origin");

    // Allow localhost origins for Expo web development (any port)
    const isLocalhost =
      !isProduction &&
      (origin?.startsWith("http://localhost:") ||
        origin?.startsWith("http://127.0.0.1:"));

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With",
      );
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  });
}

function setupSecurityHeaders(app: express.Application) {
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

    if (req.path.startsWith("/api")) {
      res.setHeader("Cache-Control", "no-store");
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  const defaultJsonParser = express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  });

  app.use((req, res, next) => {
    if (
      req.path === "/api/health/food-scan" ||
      req.path === "/api/audio/tts" ||
      /^\/api\/conversations\/[^/]+\/audio-messages$/.test(req.path)
    ) {
      return next();
    }
    return defaultJsonParser(req, res, next);
  });

  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    });

    next();
  });
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (
    isProduction &&
    (!secret || secret === DEV_SESSION_SECRET || secret.length < 32)
  ) {
    throw new Error(
      "SESSION_SECRET must be set to a strong value before production boot.",
    );
  }

  if (!secret) {
    console.warn("SESSION_SECRET is not set; using development-only fallback.");
  }

  return secret || DEV_SESSION_SECRET;
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function normalizeHostHeader(value: string | undefined | null): string | null {
  const host = value?.split(",")[0]?.trim().toLowerCase();
  if (!host || host.length > 253) return null;
  if (!/^[a-z0-9.-]+(?::\d{1,5})?$/.test(host)) return null;
  return host;
}

function configuredExternalHosts(): string[] {
  const hosts = new Set<string>();
  const addHost = (value: string | undefined) => {
    if (!value) return;
    for (const entry of value.split(",")) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      try {
        const parsed = trimmed.includes("://")
          ? new URL(trimmed)
          : new URL(`https://${trimmed}`);
        const host = normalizeHostHeader(parsed.host);
        if (host) hosts.add(host);
      } catch {
        const host = normalizeHostHeader(trimmed);
        if (host) hosts.add(host);
      }
    }
  };

  addHost(process.env.REPLIT_DEV_DOMAIN);
  addHost(process.env.REPLIT_DOMAINS);
  addHost(process.env.REPLIT_INTERNAL_APP_DOMAIN);
  addHost(process.env.RENDER_EXTERNAL_HOSTNAME);
  addHost(process.env.RENDER_EXTERNAL_URL);
  addHost(process.env.EXPO_PUBLIC_DOMAIN);
  addHost(process.env.NURAI_DEPLOYMENT_URL);

  return [...hosts];
}

function isLocalhost(host: string): boolean {
  const hostname = host.split(":")[0];
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function safeExternalBase(req: Request): { baseUrl: string; expsUrl: string } {
  const candidateHost =
    normalizeHostHeader(req.header("x-forwarded-host")) ||
    normalizeHostHeader(req.get("host"));
  const configuredHosts = configuredExternalHosts();
  const allowedHost =
    candidateHost &&
    (configuredHosts.includes(candidateHost) ||
      (!isProduction && isLocalhost(candidateHost)))
      ? candidateHost
      : configuredHosts[0] || "localhost:5000";

  const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestProto = req.protocol || "https";
  const protocol = isProduction
    ? "https"
    : forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : requestProto === "http" || requestProto === "https"
        ? requestProto
        : "https";

  return {
    baseUrl: `${protocol}://${allowedHost}`,
    expsUrl: allowedHost,
  };
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const { baseUrl, expsUrl } = safeExternalBase(req);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function serveRobotsTxt(req: Request, res: Response) {
  const { baseUrl } = safeExternalBase(req);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res
    .status(200)
    .send(
      [
        "User-agent: *",
        "Allow: /",
        "",
        `Sitemap: ${baseUrl}/sitemap.xml`,
        "",
      ].join("\n"),
    );
}

function serveSitemapXml(req: Request, res: Response) {
  const { baseUrl } = safeExternalBase(req);
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path === "/robots.txt") {
      return serveRobotsTxt(req, res);
    }

    if (req.path === "/sitemap.xml") {
      return serveSitemapXml(req, res);
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message =
      isProduction && status >= 500
        ? "Something went wrong. Please try again."
        : error.message || "Something went wrong. Please try again.";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

(async () => {
  if (isProduction || process.env.REPLIT_DOMAINS) {
    app.set("trust proxy", 1);
  }

  setupCors(app);
  setupSecurityHeaders(app);
  setupBodyParsing(app);

  const PgSession = connectPgSimple(session);
  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: getSessionSecret(),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    }),
  );

  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();
