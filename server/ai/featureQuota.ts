import type { Response } from "express";
import type { User } from "@shared/schema";
import { isAdminEmail } from "../admin";
import { pool } from "../db";
import { resolvePlanTierForUser, type PlanTier } from "../subscriptions";
import { pruneAIUsageCountersIfDue } from "./dailyQuota";

export type PaidAIFeatureKey = "tafsir" | "image";

export const TAFSIR_MONTHLY_AI_LIMITS: Record<PlanTier, number> = {
  free: 0,
  premium: 0,
  scholar: 2500,
};

export const IMAGE_MONTHLY_AI_LIMITS: Record<PlanTier, number> = {
  free: 0,
  premium: 100,
  scholar: 300,
};

export const AI_FEATURE_USAGE_RETENTION_MONTHS = 18;
const AI_FEATURE_USAGE_PRUNE_INTERVAL_MS = 6 * 60 * 60_000;

export interface PaidAIFeatureQuotaDecision {
  userTier: PlanTier;
  dailyLimit: number | null;
  dailyRemaining: number | null;
  monthlyLimit: number | null;
  monthlyRemaining: number | null;
  metered: boolean;
}

interface EnforcePaidAIFeatureQuotaOptions {
  user: User;
  assertedTier?: unknown;
  featureKey: PaidAIFeatureKey;
  featureLabel: string;
  dailyLimits: Record<PlanTier, number>;
  monthlyLimits: Record<PlanTier, number>;
  dailyLimitReachedBody?: (
    tier: PlanTier,
    limit: number,
  ) => Record<string, unknown>;
  monthlyLimitReachedBody?: (
    tier: PlanTier,
    limit: number,
  ) => Record<string, unknown>;
}

let nextAIFeatureUsagePruneAtMs = 0;

function dateKey(nowMs: number): string {
  return new Date(nowMs).toISOString().split("T")[0];
}

function monthKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 7);
}

function retentionCutoffMonthKey(nowMs: number): string {
  const cutoff = new Date(nowMs);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - AI_FEATURE_USAGE_RETENTION_MONTHS);
  return cutoff.toISOString().slice(0, 7);
}

async function pruneAIFeatureUsage(nowMs: number): Promise<void> {
  const cutoffMonth = retentionCutoffMonthKey(nowMs);
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM ai_feature_usage WHERE period_key < $1", [
      cutoffMonth,
    ]);
  } finally {
    client.release();
  }
}

async function pruneAIFeatureUsageIfDue(nowMs: number): Promise<void> {
  if (nowMs < nextAIFeatureUsagePruneAtMs) return;

  nextAIFeatureUsagePruneAtMs = nowMs + AI_FEATURE_USAGE_PRUNE_INTERVAL_MS;

  try {
    await pruneAIFeatureUsage(nowMs);
  } catch (error) {
    console.warn("[ai-feature-quota] monthly counter prune failed", error);
  }
}

async function incrementDailyAndMonthlyUsageWithinLimits({
  userId,
  today,
  dailyLimit,
  featureKey,
  currentMonth,
  monthlyLimit,
}: {
  userId: string;
  today: string;
  dailyLimit: number;
  featureKey: PaidAIFeatureKey;
  currentMonth: string;
  monthlyLimit: number;
}): Promise<
  | { allowed: true; dailyCount: number; monthlyCount: number }
  | { allowed: false; reason: "daily" | "monthly" }
> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dailyResult = await client.query(
      `
        INSERT INTO ai_usage (user_id, message_count, date_key)
        VALUES ($1, 1, $2)
        ON CONFLICT (user_id, date_key)
        DO UPDATE SET
          message_count = ai_usage.message_count + 1,
          updated_at = NOW()
        WHERE ai_usage.message_count < $3
        RETURNING message_count
      `,
      [userId, today, dailyLimit],
    );

    const dailyCount = dailyResult.rows[0]?.message_count;
    if (typeof dailyCount !== "number") {
      await client.query("ROLLBACK");
      return { allowed: false, reason: "daily" };
    }

    const monthlyResult = await client.query(
      `
        INSERT INTO ai_feature_usage (
          user_id,
          feature_key,
          period_key,
          usage_count
        )
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (user_id, feature_key, period_key)
        DO UPDATE SET
          usage_count = ai_feature_usage.usage_count + 1,
          updated_at = NOW()
        WHERE ai_feature_usage.usage_count < $4
        RETURNING usage_count
      `,
      [userId, featureKey, currentMonth, monthlyLimit],
    );

    const monthlyCount = monthlyResult.rows[0]?.usage_count;
    if (typeof monthlyCount !== "number") {
      await client.query("ROLLBACK");
      return { allowed: false, reason: "monthly" };
    }

    await client.query("COMMIT");
    return { allowed: true, dailyCount, monthlyCount };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function setQuotaHeaders(
  res: Response,
  featureKey: PaidAIFeatureKey,
  dailyLimit: number,
  dailyRemaining: number,
  monthlyLimit: number,
  monthlyRemaining: number,
): void {
  res.setHeader("X-AI-DailyLimit-Limit", String(dailyLimit));
  res.setHeader("X-AI-DailyLimit-Remaining", String(dailyRemaining));
  res.setHeader("X-RateLimit-Remaining", String(dailyRemaining));
  res.setHeader("X-AI-MonthlyLimit-Feature", featureKey);
  res.setHeader("X-AI-MonthlyLimit-Limit", String(monthlyLimit));
  res.setHeader("X-AI-MonthlyLimit-Remaining", String(monthlyRemaining));
}

export async function enforcePaidAIFeatureQuota(
  res: Response,
  {
    user,
    assertedTier,
    featureKey,
    featureLabel,
    dailyLimits,
    monthlyLimits,
    dailyLimitReachedBody,
    monthlyLimitReachedBody,
  }: EnforcePaidAIFeatureQuotaOptions,
): Promise<PaidAIFeatureQuotaDecision | null> {
  if (isAdminEmail(user.email)) {
    res.setHeader("X-AI-DailyLimit-Policy", "not-metered");
    res.setHeader("X-AI-MonthlyLimit-Policy", "not-metered");
    return {
      userTier: "scholar",
      dailyLimit: null,
      dailyRemaining: null,
      monthlyLimit: null,
      monthlyRemaining: null,
      metered: false,
    };
  }

  const userTier = await resolvePlanTierForUser({ user, assertedTier });
  const dailyLimit = dailyLimits[userTier] || 0;
  const monthlyLimit = monthlyLimits[userTier] || 0;

  if (dailyLimit <= 0 || monthlyLimit <= 0) {
    res.status(429).json({
      error: "upgrade_required",
      message: `Upgrade to unlock ${featureLabel}.`,
      upgradeRequired: true,
    });
    return null;
  }

  const nowMs = Date.now();
  await pruneAIUsageCountersIfDue(nowMs);
  await pruneAIFeatureUsageIfDue(nowMs);

  const counts = await incrementDailyAndMonthlyUsageWithinLimits({
    userId: user.id,
    today: dateKey(nowMs),
    dailyLimit,
    featureKey,
    currentMonth: monthKey(nowMs),
    monthlyLimit,
  });

  if (!counts.allowed) {
    res.status(429).json(
      counts.reason === "monthly"
        ? monthlyLimitReachedBody?.(userTier, monthlyLimit) || {
            error: "monthly_limit_reached",
            message: `Monthly ${featureLabel} limit reached (${monthlyLimit}/month).`,
            remaining: 0,
          }
        : dailyLimitReachedBody?.(userTier, dailyLimit) || {
            error: "daily_limit_reached",
            message: `Daily ${featureLabel} limit reached (${dailyLimit}/day).`,
            remaining: 0,
          },
    );
    return null;
  }

  const dailyRemaining = Math.max(dailyLimit - counts.dailyCount, 0);
  const monthlyRemaining = Math.max(monthlyLimit - counts.monthlyCount, 0);

  setQuotaHeaders(
    res,
    featureKey,
    dailyLimit,
    dailyRemaining,
    monthlyLimit,
    monthlyRemaining,
  );

  return {
    userTier,
    dailyLimit,
    dailyRemaining,
    monthlyLimit,
    monthlyRemaining,
    metered: true,
  };
}
