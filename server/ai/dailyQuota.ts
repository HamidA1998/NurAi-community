import type { Response } from "express";
import type { User } from "@shared/schema";
import { sql } from "drizzle-orm";
import { isAdminEmail } from "../admin";
import { db } from "../db";
import { resolvePlanTierForUser, type PlanTier } from "../subscriptions";

export const CHAT_DAILY_AI_LIMITS: Record<PlanTier, number> = {
  free: 5,
  premium: 100,
  scholar: 200,
};

export const CONTEXTUAL_DAILY_AI_LIMITS: Record<PlanTier, number> = {
  free: 0,
  premium: 50,
  scholar: 200,
};

export const IMAGE_DAILY_AI_LIMITS: Record<PlanTier, number> = {
  free: 0,
  premium: 10,
  scholar: 30,
};

export const HEALTH_FOOD_SCAN_DAILY_AI_LIMITS: Record<PlanTier, number> = {
  free: 0,
  premium: 8,
  scholar: 25,
};

export const AI_USAGE_COUNTER_RETENTION_DAYS = 45;
const AI_USAGE_COUNTER_PRUNE_INTERVAL_MS = 6 * 60 * 60_000;

export interface DailyAIQuotaDecision {
  userTier: PlanTier;
  limit: number | null;
  remaining: number | null;
  metered: boolean;
}

interface EnforceDailyAIQuotaOptions {
  user: User;
  assertedTier?: unknown;
  limits: Record<PlanTier, number>;
  upgradeRequiredBody?: Record<string, unknown>;
  limitReachedBody?: (tier: PlanTier, limit: number) => Record<string, unknown>;
}

let nextAIUsageCounterPruneAtMs = 0;

function dateKeyForRetentionCutoff(nowMs: number): string {
  return new Date(nowMs - AI_USAGE_COUNTER_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
}

export async function pruneAIUsageCounters(nowMs = Date.now()): Promise<void> {
  const cutoffDateKey = dateKeyForRetentionCutoff(nowMs);
  await db.execute(sql`
    DELETE FROM ai_usage
    WHERE date_key < ${cutoffDateKey}
  `);
}

export async function pruneAIUsageCountersIfDue(nowMs: number): Promise<void> {
  if (nowMs < nextAIUsageCounterPruneAtMs) return;

  nextAIUsageCounterPruneAtMs = nowMs + AI_USAGE_COUNTER_PRUNE_INTERVAL_MS;

  try {
    await pruneAIUsageCounters(nowMs);
  } catch (error) {
    console.warn("[ai-usage] daily counter prune failed", error);
  }
}

async function incrementDailyUsageWithinLimit(
  userId: string,
  dateKey: string,
  limit: number,
): Promise<number | null> {
  const result = await db.execute(sql`
    INSERT INTO ai_usage (user_id, message_count, date_key)
    VALUES (${userId}, 1, ${dateKey})
    ON CONFLICT (user_id, date_key)
    DO UPDATE SET
      message_count = ai_usage.message_count + 1,
      updated_at = NOW()
    WHERE ai_usage.message_count < ${limit}
    RETURNING message_count
  `);
  const rows =
    (result as unknown as { rows?: Record<string, unknown>[] }).rows || [];
  const messageCount = rows[0]?.message_count;
  return typeof messageCount === "number" ? messageCount : null;
}

function setDailyQuotaHeaders(
  res: Response,
  limit: number,
  remaining: number,
): void {
  res.setHeader("X-AI-DailyLimit-Limit", String(limit));
  res.setHeader("X-AI-DailyLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
}

export async function enforceDailyAIQuota(
  res: Response,
  {
    user,
    assertedTier,
    limits,
    upgradeRequiredBody,
    limitReachedBody,
  }: EnforceDailyAIQuotaOptions,
): Promise<DailyAIQuotaDecision | null> {
  if (isAdminEmail(user.email)) {
    res.setHeader("X-AI-DailyLimit-Policy", "not-metered");
    return {
      userTier: "scholar",
      limit: null,
      remaining: null,
      metered: false,
    };
  }

  const userTier = await resolvePlanTierForUser({
    user,
    assertedTier,
  });
  const limit = limits[userTier] || 0;

  if (limit <= 0) {
    res.status(429).json(
      upgradeRequiredBody || {
        error: "upgrade_required",
        message: "Upgrade to unlock this AI feature.",
        upgradeRequired: true,
      },
    );
    return null;
  }

  const nowMs = Date.now();
  await pruneAIUsageCountersIfDue(nowMs);

  const today = new Date(nowMs).toISOString().split("T")[0];
  const newCount = await incrementDailyUsageWithinLimit(user.id, today, limit);

  if (newCount === null) {
    res.status(429).json(
      limitReachedBody?.(userTier, limit) || {
        error: "daily_limit_reached",
        message: `Daily AI limit reached (${limit}/day). Limit resets at midnight.`,
        remaining: 0,
      },
    );
    return null;
  }

  const remaining = Math.max(limit - newCount, 0);
  setDailyQuotaHeaders(res, limit, remaining);
  return {
    userTier,
    limit,
    remaining,
    metered: true,
  };
}
