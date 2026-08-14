import { createHash } from "node:crypto";
import type { Express, Request, Response } from "express";

import { requireAuthenticatedUser } from "../requestAuth";
import {
  buildPrayerCompanionPkpass,
  walletPassSigningConfigured,
} from "./prayerCompanionPass";

const MAX_LABEL_LENGTH = 60;

function cleanLabel(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, MAX_LABEL_LENGTH) : fallback;
}

export function registerWalletPassRoutes(app: Express): void {
  // Lets the client show/hide the "Add to Apple Wallet" action without a
  // dead button — mirrors the storeReady / athanAlarmSupported pattern used
  // elsewhere for provider-gated features.
  app.get("/api/wallet/status", async (req: Request, res: Response) => {
    const user = await requireAuthenticatedUser(req, res);
    if (!user) return;
    res.json({ configured: walletPassSigningConfigured() });
  });

  app.post(
    "/api/wallet/next-prayer-pass",
    async (req: Request, res: Response) => {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      if (!walletPassSigningConfigured()) {
        res.status(503).json({
          error: "wallet_pass_not_configured",
          message: "Apple Wallet passes are not set up yet.",
        });
        return;
      }

      const { prayerLabel, prayerTimeIso, locationLabel } = req.body || {};
      const parsedTime =
        typeof prayerTimeIso === "string" ? new Date(prayerTimeIso) : null;
      if (!parsedTime || Number.isNaN(parsedTime.getTime())) {
        res.status(400).json({ error: "Missing or invalid prayerTimeIso" });
        return;
      }

      const millisecondsUntilPrayer = parsedTime.getTime() - Date.now();
      if (
        millisecondsUntilPrayer < -5 * 60 * 1000 ||
        millisecondsUntilPrayer > 48 * 60 * 60 * 1000
      ) {
        res.status(400).json({
          error: "prayer_time_out_of_range",
          message: "Refresh prayer times before adding this pass.",
        });
        return;
      }

      try {
        const serialNumber = createHash("sha256")
          .update(`nurai-prayer-pass:${user.id}`)
          .digest("hex")
          .slice(0, 32);
        const pkpass = await buildPrayerCompanionPkpass({
          prayerLabel: cleanLabel(prayerLabel, "Prayer"),
          prayerTimeIso: parsedTime.toISOString(),
          locationLabel: cleanLabel(locationLabel, "Your location"),
          serialNumber,
        });

        if (!pkpass) {
          res.status(503).json({
            error: "wallet_pass_not_configured",
            message: "Apple Wallet passes are not set up yet.",
          });
          return;
        }

        res.setHeader("Content-Type", "application/vnd.apple.pkpass");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="nurai-next-prayer.pkpass"',
        );
        res.send(pkpass);
      } catch (error) {
        console.error(
          "[wallet] pass generation failed:",
          error instanceof Error ? error.message : error,
        );
        res.status(500).json({
          error: "wallet_pass_generation_failed",
          message: "Could not generate the Wallet pass right now.",
        });
      }
    },
  );
}
