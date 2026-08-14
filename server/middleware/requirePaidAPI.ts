import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { resolvePlanTierForRequest } from "../subscriptions";

type RequiredPlanTier = "premium" | "scholar";

export function requirePaidAPI(
  feature: string = "ai",
  requiredTier: RequiredPlanTier = "premium",
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const userTier = await resolvePlanTierForRequest(req, user);

      const hasAccess =
        requiredTier === "scholar"
          ? userTier === "scholar"
          : userTier === "premium" || userTier === "scholar";

      if (hasAccess) {
        return next();
      }

      return res.status(402).json({
        upgradeRequired: true,
        feature,
        requiredTier,
        message:
          requiredTier === "scholar"
            ? "This feature requires a Scholar subscription."
            : "This feature requires a Premium or Scholar subscription.",
      });
    } catch (error) {
      console.error("requirePaidAPI middleware error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
