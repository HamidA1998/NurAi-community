import type { Express, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { adminAIConfig, publicAIConfig } from "./config";
import { sanitizeAIErrorMessage } from "./errorSanitizer";
import { generateAIText, getAIHealth } from "./router";
import {
  getAllSourcePackReviewStatuses,
  getSourcePackDomainReviewStatus,
  parseSourcePackDomain,
  runSourcePackActivationDryRun,
} from "./sourcePackReviewWorkflow";

async function requireAdminUser(req: Request, res: Response): Promise<boolean> {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }

  const [{ db }, { users }, { isAdminEmail }] = await Promise.all([
    import("../db"),
    import("@shared/schema"),
    import("../admin"),
  ]);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "User not found" });
    return false;
  }

  if (!isAdminEmail(user.email)) {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }

  return true;
}

function releaseSmokeSecretAccepted(req: Request): boolean {
  const configured = process.env.NURAI_DEPLOYED_AI_SMOKE_SECRET || "";
  const provided = String(req.header("x-nurai-release-smoke-secret") || "");

  if (configured.length < 32 || provided.length < 32) return false;
  const configuredBuffer = Buffer.from(configured);
  const providedBuffer = Buffer.from(provided);
  if (configuredBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(configuredBuffer, providedBuffer);
}

async function requireAdminOrReleaseSmokeSecret(
  req: Request,
  res: Response,
): Promise<boolean> {
  if (releaseSmokeSecretAccepted(req)) return true;
  return requireAdminUser(req, res);
}

export function registerAIRoutes(app: Express): void {
  app.get("/api/ai/status", async (_req: Request, res: Response) => {
    try {
      const config = publicAIConfig();
      res.setHeader("Cache-Control", "public, max-age=30");
      res.json({
        ...config,
        health: {
          cloud: {
            provider: "openai",
            configured: config.cloud.configured,
            healthy: config.cloud.configured,
            checkedAt: new Date().toISOString(),
          },
          local: {
            provider: "local",
            configured: config.local.configured,
            healthy: config.local.configured,
            checkedAt: new Date().toISOString(),
          },
        },
        liveHealth: "admin_only",
      });
    } catch (error) {
      console.warn(
        "[ai-status] public status unavailable:",
        sanitizeAIErrorMessage(error),
      );
      res.status(500).json({
        error: "Failed to read AI provider status",
        message: "Provider status unavailable.",
      });
    }
  });

  app.get("/api/admin/ai/diagnostics", async (req: Request, res: Response) => {
    try {
      const authorized = await requireAdminUser(req, res);
      if (!authorized) return;

      const health = await getAIHealth();
      res.json({
        ...adminAIConfig(),
        health,
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to read admin AI diagnostics",
        message:
          error instanceof Error
            ? sanitizeAIErrorMessage(error)
            : "Unknown error",
      });
    }
  });

  app.post("/api/admin/ai/smoke", async (req: Request, res: Response) => {
    try {
      const authorized = await requireAdminOrReleaseSmokeSecret(req, res);
      if (!authorized) return;

      const response = await generateAIText({
        useCase: "utility",
        risk: "low",
        complexity: "simple",
        modelPreference: "fast",
        localEligible: false,
        messages: [
          {
            role: "user",
            content: "Reply with exactly: openai deployment ready",
          },
        ],
        maxOutputTokens: 20,
        temperature: 0,
      });
      const textMatched = /openai deployment ready/i.test(response.text);

      res.status(textMatched ? 200 : 502).json({
        ok: textMatched,
        provider: response.provider,
        modelTier: response.modelTier,
        complexity: response.complexity,
        fallbackUsed: response.fallbackUsed,
        attemptedProviders: response.attemptedProviders,
        usage: response.usage
          ? {
              inputTokens: response.usage.inputTokens,
              outputTokens: response.usage.outputTokens,
              totalTokens: response.usage.totalTokens,
            }
          : undefined,
        textMatched,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: "Failed to run deployed AI smoke check",
        message:
          error instanceof Error
            ? sanitizeAIErrorMessage(error)
            : "Unknown error",
      });
    }
  });

  app.get(
    "/api/admin/ai/source-pack-reviews",
    async (req: Request, res: Response) => {
      try {
        const authorized = await requireAdminUser(req, res);
        if (!authorized) return;

        res.json(getAllSourcePackReviewStatuses());
      } catch (error) {
        res.status(500).json({
          error: "Failed to read AI source-pack review status",
          message:
            error instanceof Error
              ? sanitizeAIErrorMessage(error)
              : "Unknown error",
        });
      }
    },
  );

  app.get(
    "/api/admin/ai/source-pack-reviews/:domain",
    async (req: Request, res: Response) => {
      try {
        const authorized = await requireAdminUser(req, res);
        if (!authorized) return;

        const domain = parseSourcePackDomain(req.params.domain);
        res.json(getSourcePackDomainReviewStatus(domain));
      } catch (error) {
        const message =
          error instanceof Error
            ? sanitizeAIErrorMessage(error)
            : "Unknown error";
        res
          .status(
            message.includes("Unsupported source-pack domain") ? 400 : 500,
          )
          .json({
            error: "Failed to read AI source-pack review status",
            message,
          });
      }
    },
  );

  app.post(
    "/api/admin/ai/source-pack-reviews/:domain/dry-run",
    async (req: Request, res: Response) => {
      try {
        const authorized = await requireAdminUser(req, res);
        if (!authorized) return;

        const domain = parseSourcePackDomain(req.params.domain);
        const status = getSourcePackDomainReviewStatus(domain);
        const dryRun = runSourcePackActivationDryRun(domain);
        res.status(dryRun.ok ? 200 : 409).json({
          ...status,
          dryRun,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? sanitizeAIErrorMessage(error)
            : "Unknown error";
        res
          .status(
            message.includes("Unsupported source-pack domain") ? 400 : 500,
          )
          .json({
            error: "Failed to run AI source-pack activation dry run",
            message,
          });
      }
    },
  );
}
