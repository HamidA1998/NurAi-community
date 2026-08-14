import {
  DEFAULT_PREMIUM_ENTITLEMENT_IDS,
  DEFAULT_PREMIUM_PRODUCT_IDS,
  DEFAULT_SCHOLAR_ENTITLEMENT_IDS,
  DEFAULT_SCHOLAR_PRODUCT_IDS,
} from "@shared/subscriptionIdentifiers";

export type PlanTier = "free" | "premium" | "scholar";

export interface RevenueCatTierResult {
  tier: PlanTier;
  entitlementExpiresAt: Date | null;
  subscriberAppUserId?: string;
  originalAppUserId?: string | null;
  aliases?: string[];
}

export interface RevenueCatSubscriberIdentity {
  original_app_user_id?: unknown;
  originalAppUserId?: unknown;
  aliases?: unknown;
}

const MAX_REVENUECAT_APP_USER_ID_LENGTH = 256;
const MAX_CLIENT_REVENUECAT_LOOKUP_IDS = 4;
const revenueCatAnonymousIdPrefix = "$RCAnonymousID:";

export function sanitizePlanTier(value: unknown): PlanTier {
  return value === "scholar" || value === "premium" ? value : "free";
}

function normalizeRevenueCatAppUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_REVENUECAT_APP_USER_ID_LENGTH) {
    return null;
  }
  return trimmed;
}

export function isRevenueCatAnonymousAppUserId(value: string): boolean {
  return value.startsWith(revenueCatAnonymousIdPrefix);
}

export function revenueCatSubscriberIdentityIds(
  subscriber?: RevenueCatSubscriberIdentity,
): string[] {
  if (!subscriber) return [];
  const aliasIds = Array.isArray(subscriber.aliases) ? subscriber.aliases : [];
  return [
    ...new Set([
      subscriber.original_app_user_id,
      subscriber.originalAppUserId,
      ...aliasIds,
    ]),
  ]
    .map(normalizeRevenueCatAppUserId)
    .filter((value): value is string => Boolean(value));
}

export function revenueCatSubscriberBelongsToAuthenticatedUser(
  authenticatedUserId: string,
  lookupAppUserId: string,
  subscriber?: RevenueCatSubscriberIdentity,
): boolean {
  const userId = normalizeRevenueCatAppUserId(authenticatedUserId);
  const lookupId = normalizeRevenueCatAppUserId(lookupAppUserId);
  if (!userId || !lookupId) return false;
  if (lookupId === userId) return true;
  if (!isRevenueCatAnonymousAppUserId(lookupId)) return false;
  return revenueCatSubscriberIdentityIds(subscriber).includes(userId);
}

export function revenueCatLookupIdsForUser(
  authenticatedUserId: string,
  clientCandidateIds: unknown,
): string[] {
  const userId = normalizeRevenueCatAppUserId(authenticatedUserId);
  if (!userId) return [];

  const ids = [userId];
  const candidates = Array.isArray(clientCandidateIds)
    ? clientCandidateIds
    : [];

  for (const candidate of candidates) {
    if (ids.length >= MAX_CLIENT_REVENUECAT_LOOKUP_IDS) break;
    const normalized = normalizeRevenueCatAppUserId(candidate);
    if (!normalized || ids.includes(normalized)) continue;

    // Only the authenticated NurAI user id and RevenueCat-generated anonymous
    // ids are accepted. Other custom ids could belong to another account.
    if (normalized === userId || isRevenueCatAnonymousAppUserId(normalized)) {
      ids.push(normalized);
    }
  }

  return ids;
}

function activeEntitlementExpiresAt(entitlement: unknown): Date | true | false {
  if (!entitlement || typeof entitlement !== "object") return false;
  const expiresDate = (entitlement as { expires_date?: unknown }).expires_date;
  const gracePeriodExpiresDate = (
    entitlement as { grace_period_expires_date?: unknown }
  ).grace_period_expires_date;

  if (expiresDate === null) return true;
  if (typeof expiresDate === "string") {
    const expiresAt = new Date(expiresDate);
    if (expiresAt.getTime() > Date.now()) return expiresAt;
  }
  if (typeof gracePeriodExpiresDate === "string") {
    const graceExpiresAt = new Date(gracePeriodExpiresDate);
    if (graceExpiresAt.getTime() > Date.now()) return graceExpiresAt;
  }
  return false;
}

function splitEnvList(value: string | undefined): string[] {
  const trimmed = value?.trim();
  if (!trimmed) return [];
  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function singleEnvValue(value: string | undefined): string[] {
  if (!value) return [];
  const trimmed = value.trim();
  return trimmed ? [trimmed] : [];
}

function normalized(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.map(normalized).filter(Boolean))];
}

function configuredPremiumEntitlementIds(): string[] {
  return uniqueStrings([
    ...DEFAULT_PREMIUM_ENTITLEMENT_IDS,
    ...singleEnvValue(process.env.REVENUECAT_PREMIUM_ENTITLEMENT),
    ...splitEnvList(process.env.REVENUECAT_PREMIUM_ENTITLEMENT_IDS),
  ]);
}

function configuredScholarEntitlementIds(): string[] {
  return uniqueStrings([
    ...DEFAULT_SCHOLAR_ENTITLEMENT_IDS,
    ...singleEnvValue(process.env.REVENUECAT_SCHOLAR_ENTITLEMENT),
    ...splitEnvList(process.env.REVENUECAT_SCHOLAR_ENTITLEMENT_IDS),
  ]);
}

function configuredPremiumProductIds(): string[] {
  return uniqueStrings([
    ...DEFAULT_PREMIUM_PRODUCT_IDS,
    ...splitEnvList(process.env.REVENUECAT_PREMIUM_PRODUCT_IDS),
  ]);
}

function configuredScholarProductIds(): string[] {
  return uniqueStrings([
    ...DEFAULT_SCHOLAR_PRODUCT_IDS,
    ...splitEnvList(process.env.REVENUECAT_SCHOLAR_PRODUCT_IDS),
  ]);
}

function matchesAnyIdentifier(value: string, configuredIds: string[]) {
  return configuredIds.some((id) => value === id);
}

function looksLikePremiumIdentifier(value: string) {
  return (
    matchesAnyIdentifier(value, configuredPremiumEntitlementIds()) ||
    matchesAnyIdentifier(value, configuredPremiumProductIds()) ||
    /\bpremium\b/.test(value.replace(/[._-]+/g, " "))
  );
}

function looksLikeScholarIdentifier(value: string) {
  return (
    matchesAnyIdentifier(value, configuredScholarEntitlementIds()) ||
    matchesAnyIdentifier(value, configuredScholarProductIds()) ||
    /\bscholar\b/.test(value.replace(/[._-]+/g, " "))
  );
}

function revenueCatRecordIdentifiers(
  identifier: string,
  record: unknown,
): string[] {
  if (!record || typeof record !== "object") return uniqueStrings([identifier]);
  const value = record as Record<string, unknown>;
  return uniqueStrings([
    identifier,
    value.product_identifier,
    value.product_id,
    value.store_product_identifier,
    value.product_plan_identifier,
  ]);
}

function activeRecordExpiresAt(
  records: Record<string, unknown>,
  matcher: (value: string) => boolean,
): Date | true | false {
  let latestExpiresAt: Date | false = false;

  for (const [identifier, record] of Object.entries(records)) {
    const identifiers = revenueCatRecordIdentifiers(identifier, record);
    if (!identifiers.some(matcher)) continue;

    const activeUntil = activeEntitlementExpiresAt(record);
    if (activeUntil === true) return true;
    if (
      activeUntil instanceof Date &&
      (!latestExpiresAt || activeUntil.getTime() > latestExpiresAt.getTime())
    ) {
      latestExpiresAt = activeUntil;
    }
  }

  return latestExpiresAt;
}

export function resolveRevenueCatSubscriberPlanTier(subscriber?: {
  entitlements?: Record<string, unknown>;
  subscriptions?: Record<string, unknown>;
}): RevenueCatTierResult {
  const entitlements = subscriber?.entitlements || {};
  const subscriptions = subscriber?.subscriptions || {};
  const scholarExpiresAt =
    activeRecordExpiresAt(entitlements, looksLikeScholarIdentifier) ||
    activeRecordExpiresAt(subscriptions, looksLikeScholarIdentifier);
  const premiumExpiresAt =
    activeRecordExpiresAt(entitlements, looksLikePremiumIdentifier) ||
    activeRecordExpiresAt(subscriptions, looksLikePremiumIdentifier);

  if (scholarExpiresAt) {
    return {
      tier: "scholar",
      entitlementExpiresAt: scholarExpiresAt === true ? null : scholarExpiresAt,
    };
  }

  if (premiumExpiresAt) {
    return {
      tier: "premium",
      entitlementExpiresAt: premiumExpiresAt === true ? null : premiumExpiresAt,
    };
  }

  return { tier: "free", entitlementExpiresAt: null };
}
