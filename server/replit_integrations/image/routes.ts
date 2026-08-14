import type { Express, Request, Response } from "express";
import { getCloudOpenAIClient } from "../../ai";
import { IMAGE_DAILY_AI_LIMITS } from "../../ai/dailyQuota";
import {
  IMAGE_MONTHLY_AI_LIMITS,
  enforcePaidAIFeatureQuota,
} from "../../ai/featureQuota";
import { enforceAITextRateLimit } from "../../ai/httpControls";
import { requirePaidAPI } from "../../middleware/requirePaidAPI";
import { requireAuthenticatedUser } from "../../requestAuth";

const ALLOWED_IMAGE_SIZES = new Set(["1024x1024", "512x512", "256x256"]);
type AllowedImageSize = "1024x1024" | "512x512" | "256x256";

export function registerImageRoutes(app: Express): void {
  app.post(
    "/api/generate-image",
    requirePaidAPI("imageGeneration"),
    async (req: Request, res: Response) => {
      try {
        const { prompt, size = "1024x1024" } = req.body;
        const cleanPrompt = typeof prompt === "string" ? prompt.trim() : "";
        const requestedSize = typeof size === "string" ? size : "1024x1024";

        if (!cleanPrompt) {
          return res.status(400).json({ error: "Prompt is required" });
        }
        if (cleanPrompt.length > 2000) {
          return res.status(400).json({ error: "Prompt is too long" });
        }
        if (!ALLOWED_IMAGE_SIZES.has(requestedSize)) {
          return res.status(400).json({ error: "Unsupported image size" });
        }

        const aiRateLimit = await enforceAITextRateLimit(req, res, {
          namespace: "ai:image",
          windowMs: 60 * 60 * 1000,
          maxRequests: 20,
        });
        if (!aiRateLimit) return;

        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        const featureQuota = await enforcePaidAIFeatureQuota(res, {
          user,
          assertedTier: req.body?.userTier,
          featureKey: "image",
          featureLabel: "image generation",
          dailyLimits: IMAGE_DAILY_AI_LIMITS,
          monthlyLimits: IMAGE_MONTHLY_AI_LIMITS,
          dailyLimitReachedBody: (tier, limit) => ({
            error: "daily_limit_reached",
            message:
              tier === "premium"
                ? "Daily image generation limit reached. Scholar includes a higher daily image allowance."
                : `Daily image generation limit reached (${limit}/day). Limit resets at midnight.`,
            remaining: 0,
          }),
          monthlyLimitReachedBody: (tier, limit) => ({
            error: "monthly_limit_reached",
            message:
              tier === "premium"
                ? "Monthly image generation limit reached. Scholar includes a higher monthly image allowance."
                : `Monthly image generation limit reached (${limit}/month). Limit resets next month.`,
            remaining: 0,
          }),
        });
        if (!featureQuota) return;

        const response = await getCloudOpenAIClient().images.generate({
          model: "gpt-image-1",
          prompt: cleanPrompt,
          n: 1,
          size: requestedSize as AllowedImageSize,
        });

        const imageData = response.data?.[0];
        res.json({
          url: imageData?.url,
          b64_json: imageData?.b64_json,
        });
      } catch (error) {
        console.error("Error generating image:", error);
        res.status(500).json({ error: "Failed to generate image" });
      }
    },
  );
}
