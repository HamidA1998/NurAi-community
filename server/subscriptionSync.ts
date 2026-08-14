import type { Express, Request, Response } from "express";

import { hasFullAccessEmail } from "./admin";
import { requireAuthenticatedUser } from "./requestAuth";
import {
  refreshRevenueCatEntitlementForUser,
  sanitizePlanTier,
} from "./subscriptions";

export function registerSubscriptionSyncRoutes(app: Express): void {
  app.post(
    "/api/subscriptions/refresh",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;

        if (hasFullAccessEmail(user.email)) {
          res.json({
            tier: "scholar",
            refreshed: true,
          });
          return;
        }

        const result = await refreshRevenueCatEntitlementForUser(
          user.id,
          req.body?.revenueCatAppUserIds,
        );
        const tier = sanitizePlanTier(result?.tier);
        res.json({
          tier,
          refreshed: Boolean(result),
        });
      } catch (error) {
        console.error(
          "[subscriptions] authenticated entitlement refresh failed:",
          error instanceof Error ? error.message : error,
        );
        res.status(503).json({
          error: "entitlement_refresh_unavailable",
          message:
            "Subscription status could not be refreshed right now. Please try again shortly.",
        });
      }
    },
  );
}
