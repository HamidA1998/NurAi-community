import type { Request } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { hasFullAccessEmail } from "./admin";
import { subscriptionEntitlements, users, type User } from "@shared/schema";
import {
  isRevenueCatAnonymousAppUserId,
  revenueCatLookupIdsForUser,
  revenueCatSubscriberBelongsToAuthenticatedUser,
  revenueCatSubscriberIdentityIds,
  resolveRevenueCatSubscriberPlanTier,
  sanitizePlanTier,
  type RevenueCatSubscriberIdentity,
  type PlanTier,
  type RevenueCatTierResult,
} from "./subscriptionTier";

export {
  resolveRevenueCatSubscriberPlanTier,
  revenueCatLookupIdsForUser,
  sanitizePlanTier,
} from "./subscriptionTier";
export type { PlanTier, RevenueCatTierResult } from "./subscriptionTier";

interface RevenueCatTierLookupOptions {
  forceRefresh?: boolean;
  allowStaleOnFailure?: boolean;
  cacheUserId?: string;
  cacheResult?: boolean;
}

const ENTITLEMENT_CACHE_MS = 5 * 60_000;
const PAID_ENTITLEMENT_STALE_MS = 24 * 60 * 60_000;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function revenueCatApiKey(): string | null {
  const apiKey =
    process.env.REVENUECAT_SECRET_API_KEY || process.env.REVENUECAT_API_KEY;
  return apiKey?.trim() || null;
}

export function revenueCatServerKeyConfigured(): boolean {
  return Boolean(revenueCatApiKey());
}

function boundedStaleUntil(
  tier: PlanTier,
  entitlementExpiresAt: Date | null,
  nowMs = Date.now(),
): Date {
  const defaultFreshUntil = new Date(nowMs + ENTITLEMENT_CACHE_MS);
  if (tier === "free") return defaultFreshUntil;

  const maxStaleUntil = nowMs + PAID_ENTITLEMENT_STALE_MS;
  const entitlementUntil = entitlementExpiresAt?.getTime() || maxStaleUntil;
  return new Date(Math.min(entitlementUntil, maxStaleUntil));
}

async function upsertCachedEntitlement(
  appUserId: string,
  result: RevenueCatTierResult,
): Promise<void> {
  const now = new Date();
  const cacheExpiresAt = new Date(now.getTime() + ENTITLEMENT_CACHE_MS);
  const staleUntilAt = boundedStaleUntil(
    result.tier,
    result.entitlementExpiresAt,
    now.getTime(),
  );

  await db
    .insert(subscriptionEntitlements)
    .values({
      userId: appUserId,
      tier: result.tier,
      source: "revenuecat",
      entitlementExpiresAt: result.entitlementExpiresAt,
      cacheExpiresAt,
      staleUntilAt,
      checkedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: subscriptionEntitlements.userId,
      set: {
        tier: result.tier,
        source: "revenuecat",
        entitlementExpiresAt: result.entitlementExpiresAt,
        cacheExpiresAt,
        staleUntilAt,
        checkedAt: now,
        updatedAt: now,
      },
    });
}

async function readCachedEntitlement(
  appUserId: string,
  allowStalePaid: boolean,
): Promise<PlanTier | null> {
  const [cached] = await db
    .select()
    .from(subscriptionEntitlements)
    .where(eq(subscriptionEntitlements.userId, appUserId))
    .limit(1);
  if (!cached) return null;

  const tier = sanitizePlanTier(cached.tier);
  const now = Date.now();
  if (cached.cacheExpiresAt.getTime() > now) return tier;
  if (
    allowStalePaid &&
    tier !== "free" &&
    cached.staleUntilAt.getTime() > now
  ) {
    return tier;
  }
  return null;
}

async function readCachedEntitlementSafe(
  appUserId: string,
  allowStalePaid: boolean,
): Promise<PlanTier | null> {
  try {
    return await readCachedEntitlement(appUserId, allowStalePaid);
  } catch (error) {
    console.warn(
      "[subscriptions] Entitlement cache read unavailable; continuing without cached tier:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function readCachedEntitlementForRevenueCatFailure(
  cacheUserId: string,
): Promise<PlanTier | null> {
  try {
    return await readCachedEntitlement(cacheUserId, true);
  } catch (error) {
    console.warn(
      "[subscriptions] Stale entitlement cache read unavailable after RevenueCat failure:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function upsertCachedEntitlementSafe(
  appUserId: string,
  result: RevenueCatTierResult,
): Promise<void> {
  try {
    await upsertCachedEntitlement(appUserId, result);
  } catch (error) {
    console.warn(
      "[subscriptions] Entitlement cache write unavailable; continuing with live tier:",
      error instanceof Error ? error.message : error,
    );
  }
}

async function fetchRevenueCatTier(
  appUserId: string,
  options: RevenueCatTierLookupOptions = {},
): Promise<RevenueCatTierResult | null> {
  const {
    forceRefresh = false,
    allowStaleOnFailure = true,
    cacheUserId = appUserId,
    cacheResult = true,
  } = options;
  const apiKey = revenueCatApiKey();
  if (!apiKey) {
    if (allowStaleOnFailure) {
      const cached =
        await readCachedEntitlementForRevenueCatFailure(cacheUserId);
      return cached ? { tier: cached, entitlementExpiresAt: null } : null;
    }
    return null;
  }

  if (!forceRefresh) {
    const cached = await readCachedEntitlementSafe(cacheUserId, false);
    if (cached) {
      return { tier: cached, entitlementExpiresAt: null };
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      console.warn(
        `[subscriptions] RevenueCat lookup failed for user ${appUserId}: ${response.status}`,
      );
      if (allowStaleOnFailure) {
        const cached =
          await readCachedEntitlementForRevenueCatFailure(cacheUserId);
        return cached ? { tier: cached, entitlementExpiresAt: null } : null;
      }
      return null;
    }

    const data = (await response.json()) as {
      subscriber?: RevenueCatSubscriberIdentity & {
        entitlements?: Record<string, unknown>;
        subscriptions?: Record<string, unknown>;
      };
    };
    const identityIds = revenueCatSubscriberIdentityIds(data.subscriber);
    const result = {
      ...resolveRevenueCatSubscriberPlanTier(data.subscriber),
      subscriberAppUserId: appUserId,
      originalAppUserId: identityIds[0] ?? null,
      aliases: identityIds,
    };

    if (cacheResult) {
      await upsertCachedEntitlementSafe(cacheUserId, result);
    }
    return result;
  } catch (error) {
    console.warn(
      "[subscriptions] RevenueCat lookup unavailable:",
      error instanceof Error ? error.message : error,
    );
    if (allowStaleOnFailure) {
      const cached =
        await readCachedEntitlementForRevenueCatFailure(cacheUserId);
      return cached ? { tier: cached, entitlementExpiresAt: null } : null;
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function userExists(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return Boolean(user);
}

export async function refreshRevenueCatEntitlement(
  appUserId: string,
): Promise<RevenueCatTierResult | null> {
  const normalizedAppUserId = appUserId.trim();
  if (!normalizedAppUserId) return null;
  if (!(await userExists(normalizedAppUserId))) return null;

  return fetchRevenueCatTier(normalizedAppUserId, {
    forceRefresh: true,
    allowStaleOnFailure: false,
  });
}

export async function refreshRevenueCatEntitlementForUser(
  authenticatedUserId: string,
  clientCandidateIds: unknown,
): Promise<RevenueCatTierResult | null> {
  const normalizedUserId = authenticatedUserId.trim();
  if (!normalizedUserId) return null;
  if (!(await userExists(normalizedUserId))) return null;

  const lookupIds = revenueCatLookupIdsForUser(
    normalizedUserId,
    clientCandidateIds,
  );
  let lastResult: RevenueCatTierResult | null = null;
  let hadLookupFailure = false;

  for (const lookupAppUserId of lookupIds) {
    const result = await fetchRevenueCatTier(lookupAppUserId, {
      forceRefresh: true,
      allowStaleOnFailure: false,
      cacheUserId: normalizedUserId,
      cacheResult: false,
    });
    if (!result) {
      hadLookupFailure = true;
      continue;
    }
    if (
      isRevenueCatAnonymousAppUserId(lookupAppUserId) &&
      !revenueCatSubscriberBelongsToAuthenticatedUser(
        normalizedUserId,
        lookupAppUserId,
        {
          original_app_user_id: result.originalAppUserId,
          aliases: result.aliases,
        },
      )
    ) {
      console.warn(
        "[subscriptions] Ignoring unlinked RevenueCat anonymous entitlement candidate.",
      );
      continue;
    }
    lastResult = result;
    if (result.tier !== "free") {
      await upsertCachedEntitlementSafe(normalizedUserId, result);
      return result;
    }
  }

  if (lastResult) {
    await upsertCachedEntitlementSafe(normalizedUserId, lastResult);
    return lastResult;
  }

  if (hadLookupFailure) {
    const staleTier = await readCachedEntitlementSafe(normalizedUserId, true);
    if (staleTier && staleTier !== "free") {
      return { tier: staleTier, entitlementExpiresAt: null };
    }
  }

  return null;
}

function clientTierFallbackAllowed(): boolean {
  return (
    !isProduction() &&
    process.env.ALLOW_UNVERIFIED_SUBSCRIPTION_TIER === "true" &&
    process.env.NODE_ENV === "development"
  );
}

export async function resolvePlanTierForUser({
  user,
  assertedTier,
}: {
  user: User;
  assertedTier?: unknown;
}): Promise<PlanTier> {
  if (hasFullAccessEmail(user.email)) return "scholar";

  const revenueCatResult = await fetchRevenueCatTier(user.id);
  if (revenueCatResult?.tier && revenueCatResult.tier !== "free") {
    return revenueCatResult.tier;
  }

  if (clientTierFallbackAllowed()) {
    return sanitizePlanTier(assertedTier);
  }

  return "free";
}

export async function resolvePlanTierForRequest(
  req: Request,
  user: User,
): Promise<PlanTier> {
  return resolvePlanTierForUser({
    user,
    assertedTier:
      req.body?.userTier ??
      req.query?.userTier ??
      req.header("x-nurai-user-tier"),
  });
}
