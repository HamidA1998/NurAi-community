import { sql } from "drizzle-orm";

export type AIRateLimitSubjectType = "user" | "ip" | "anonymous";

export interface AIRateLimitPolicy {
  windowMs: number;
  maxRequests: number;
  namespace?: string;
}

export interface AIRateLimitSubject {
  userId?: string | number | null;
  ip?: string | null;
}

export interface AIRateLimitDecision {
  allowed: boolean;
  key: string;
  subjectType: AIRateLimitSubjectType;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterMs: number;
}

export interface RequestLikeForAIRateLimit {
  session?: {
    userId?: string | number | null;
  };
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: {
    remoteAddress?: string;
  };
}

const DEFAULT_NAMESPACE = "ai";
const RATE_LIMIT_BUCKET_PRUNE_INTERVAL_MS = 30 * 60_000;

function cleanIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const firstForwardedIp = ip.split(",")[0]?.trim();
  return firstForwardedIp || null;
}

function headerValue(
  headers: RequestLikeForAIRateLimit["headers"],
  key: string,
): string | undefined {
  if (!headers) return undefined;
  const value = headers[key] ?? headers[key.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function getAIRateLimitSubject(subject: AIRateLimitSubject): {
  key: string;
  type: AIRateLimitSubjectType;
} {
  if (subject.userId !== undefined && subject.userId !== null) {
    return { key: `user:${String(subject.userId)}`, type: "user" };
  }

  const ip = cleanIp(subject.ip);
  if (ip) {
    return { key: `ip:${ip}`, type: "ip" };
  }

  return { key: "anonymous", type: "anonymous" };
}

export function getAIRateLimitSubjectFromRequest(
  req: RequestLikeForAIRateLimit,
): AIRateLimitSubject {
  return {
    userId: req.session?.userId,
    ip:
      cleanIp(req.ip) ||
      cleanIp(req.socket?.remoteAddress) ||
      cleanIp(headerValue(req.headers, "x-real-ip")) ||
      cleanIp(headerValue(req.headers, "x-forwarded-for")),
  };
}

function coerceCount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseInt(value, 10);
  return 0;
}

function coerceDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return fallback;
}

export class PostgresAIRateLimiter {
  private nextPruneAtMs = 0;

  async check(
    subject: AIRateLimitSubject,
    policy: AIRateLimitPolicy,
    nowMs = Date.now(),
  ): Promise<AIRateLimitDecision> {
    await this.pruneExpiredBucketsIfDue(nowMs);

    const namespace = policy.namespace || DEFAULT_NAMESPACE;
    const identity = getAIRateLimitSubject(subject);
    const now = new Date(nowMs);
    const nextResetAt = new Date(nowMs + policy.windowMs);

    const { db } = await import("../db");
    const result = await db.execute(sql`
      INSERT INTO rate_limit_buckets (
        namespace,
        subject_key,
        subject_type,
        request_count,
        reset_at,
        updated_at
      )
      VALUES (
        ${namespace},
        ${identity.key},
        ${identity.type},
        1,
        ${nextResetAt},
        NOW()
      )
      ON CONFLICT (namespace, subject_key)
      DO UPDATE SET
        subject_type = EXCLUDED.subject_type,
        request_count = CASE
          WHEN rate_limit_buckets.reset_at <= ${now} THEN 1
          ELSE rate_limit_buckets.request_count + 1
        END,
        reset_at = CASE
          WHEN rate_limit_buckets.reset_at <= ${now} THEN ${nextResetAt}
          ELSE rate_limit_buckets.reset_at
        END,
        updated_at = NOW()
      RETURNING request_count, reset_at
    `);

    const rows =
      (result as unknown as { rows?: Record<string, unknown>[] }).rows || [];
    const row = rows[0] || {};
    const count = coerceCount(row.request_count);
    const resetAt = coerceDate(row.reset_at, nextResetAt);
    const allowed = count <= policy.maxRequests;
    const remaining = Math.max(policy.maxRequests - count, 0);
    const retryAfterMs = allowed
      ? 0
      : Math.max(resetAt.getTime() - now.getTime(), 0);

    return {
      allowed,
      key: `${namespace}:${identity.key}`,
      subjectType: identity.type,
      limit: policy.maxRequests,
      remaining,
      resetAt,
      retryAfterMs,
    };
  }

  async prune(nowMs = Date.now()): Promise<void> {
    const { db } = await import("../db");
    await db.execute(sql`
      DELETE FROM rate_limit_buckets
      WHERE reset_at <= ${new Date(nowMs)}
    `);
  }

  private async pruneExpiredBucketsIfDue(nowMs: number): Promise<void> {
    if (nowMs < this.nextPruneAtMs) return;

    this.nextPruneAtMs = nowMs + RATE_LIMIT_BUCKET_PRUNE_INTERVAL_MS;

    try {
      await this.prune(nowMs);
    } catch (error) {
      console.warn("[rate-limit] expired bucket prune failed", error);
    }
  }
}

export const durableRateLimiter = new PostgresAIRateLimiter();
export const durableAITextRateLimiter = durableRateLimiter;

export const DEFAULT_AI_TEXT_RATE_LIMIT: AIRateLimitPolicy = {
  namespace: "ai:text",
  windowMs: 60_000,
  maxRequests: 20,
};
