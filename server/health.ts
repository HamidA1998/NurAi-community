import type { Express, Request, Response } from "express";
import express from "express";
import { z } from "zod";
import { requirePaidAPI } from "./middleware/requirePaidAPI";

const MAX_FOOD_IMAGE_BYTES = 4.5 * 1024 * 1024;

const foodScanSchema = z.object({
  imageBase64: z.string().min(200).max(7_000_000),
  mimeType: z
    .enum(["image/jpeg", "image/png", "image/webp"])
    .default("image/jpeg"),
  userNote: z.string().trim().max(500).optional(),
});

function decodeImageBytes(imageBase64: string): Buffer | null {
  if (!/^[A-Za-z0-9+/=\s]+$/.test(imageBase64)) return null;
  try {
    return Buffer.from(imageBase64.replace(/\s/g, ""), "base64");
  } catch {
    return null;
  }
}

export function registerHealthRoutes(app: Express): void {
  app.post(
    "/api/health/food-scan",
    requirePaidAPI("health_food_scan", "premium"),
    express.json({ limit: "6mb" }),
    async (req: Request, res: Response) => {
      try {
        const parsed = foodScanSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "invalid_food_scan_request",
            message: "Upload a valid meal photo.",
          });
        }

        const imageBytes = decodeImageBytes(parsed.data.imageBase64);
        if (!imageBytes || imageBytes.length > MAX_FOOD_IMAGE_BYTES) {
          return res.status(400).json({
            error: "food_image_too_large",
            message: "Meal photo must be under 4.5 MB after compression.",
          });
        }

        res.status(410).json({
          error: "ai_food_scan_removed",
          message:
            "Meal photo intelligence has been removed while NurAI's intelligence system is rebuilt from the ground up.",
          available: false,
        });
      } catch (error) {
        console.error("[health-food-scan] failed", error);
        res.status(500).json({
          error: "food_scan_failed",
          message: "We could not scan this meal. Try a clearer photo.",
        });
      }
    },
  );
}
