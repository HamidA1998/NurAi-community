import {
  DEFAULT_PREMIUM_ENTITLEMENT_IDS,
  DEFAULT_PREMIUM_PACKAGE_IDS,
  DEFAULT_PREMIUM_PRODUCT_IDS,
  DEFAULT_SCHOLAR_ENTITLEMENT_IDS,
  DEFAULT_SCHOLAR_PACKAGE_IDS,
  DEFAULT_SCHOLAR_PRODUCT_IDS,
} from "@shared/subscriptionIdentifiers";

export type PlanTier = "free" | "premium" | "scholar";
export type BillingPeriod = "monthly" | "annual" | "unknown";
export const PURCHASE_TIER_GRACE_MS = 5 * 60 * 1000;

export interface RecentPaidTier {
  tier: Exclude<PlanTier, "free">;
  expiresAt: number;
}

export function tierRank(plan: PlanTier) {
  if (plan === "scholar") return 2;
  if (plan === "premium") return 1;
  return 0;
}

export function higherPlanTier(a: PlanTier, b: PlanTier): PlanTier {
  return tierRank(a) >= tierRank(b) ? a : b;
}

export function createRecentPaidTier(
  tier: PlanTier,
  nowMs = Date.now(),
): RecentPaidTier | null {
  if (tier === "free") return null;
  return {
    tier,
    expiresAt: nowMs + PURCHASE_TIER_GRACE_MS,
  };
}

export function resolvePlanTierWithRecentPaidTier(
  resolvedTier: PlanTier,
  recentPaidTier: RecentPaidTier | null,
  nowMs = Date.now(),
): PlanTier {
  if (!recentPaidTier || recentPaidTier.expiresAt < nowMs) {
    return resolvedTier;
  }
  return higherPlanTier(recentPaidTier.tier, resolvedTier);
}

export function revenueCatCustomerInfoAppUserIds(
  customerInfo: any,
  currentAppUserId?: unknown,
): string[] {
  return uniqueTrimmedStrings([
    currentAppUserId,
    customerInfo?.originalAppUserId,
    customerInfo?.original_app_user_id,
    customerInfo?.originalApplicationUserId,
    customerInfo?.original_application_user_id,
  ]);
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

function uniqueTrimmedStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.map(normalized).filter(Boolean))];
}

function configuredPremiumEntitlementIds(): string[] {
  return uniqueStrings([
    ...DEFAULT_PREMIUM_ENTITLEMENT_IDS,
    ...singleEnvValue(process.env.EXPO_PUBLIC_REVENUECAT_PREMIUM_ENTITLEMENT),
  ]);
}

function configuredScholarEntitlementIds(): string[] {
  return uniqueStrings([
    ...DEFAULT_SCHOLAR_ENTITLEMENT_IDS,
    ...singleEnvValue(process.env.EXPO_PUBLIC_REVENUECAT_SCHOLAR_ENTITLEMENT),
  ]);
}

function configuredPremiumProductIds(): string[] {
  return uniqueStrings([
    ...DEFAULT_PREMIUM_PRODUCT_IDS,
    ...splitEnvList(process.env.EXPO_PUBLIC_REVENUECAT_PREMIUM_PRODUCT_IDS),
  ]);
}

function configuredScholarProductIds(): string[] {
  return uniqueStrings([
    ...DEFAULT_SCHOLAR_PRODUCT_IDS,
    ...splitEnvList(process.env.EXPO_PUBLIC_REVENUECAT_SCHOLAR_PRODUCT_IDS),
  ]);
}

function configuredPremiumPackageIds(): string[] {
  return uniqueStrings([
    ...DEFAULT_PREMIUM_PACKAGE_IDS,
    ...splitEnvList(process.env.EXPO_PUBLIC_REVENUECAT_PREMIUM_PACKAGE_IDS),
  ]);
}

function configuredScholarPackageIds(): string[] {
  return uniqueStrings([
    ...DEFAULT_SCHOLAR_PACKAGE_IDS,
    ...splitEnvList(process.env.EXPO_PUBLIC_REVENUECAT_SCHOLAR_PACKAGE_IDS),
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

function tierFromIdentifiers(identifiers: unknown[]): PlanTier {
  const values = uniqueStrings(identifiers);
  if (values.some(looksLikeScholarIdentifier)) return "scholar";
  if (values.some(looksLikePremiumIdentifier)) return "premium";
  return "free";
}

function tierFromPackageIdentifiers(identifiers: unknown[]): PlanTier {
  const values = uniqueStrings(identifiers);
  if (
    values.some(
      (value) =>
        matchesAnyIdentifier(value, configuredScholarPackageIds()) ||
        looksLikeScholarIdentifier(value),
    )
  ) {
    return "scholar";
  }
  if (
    values.some(
      (value) =>
        matchesAnyIdentifier(value, configuredPremiumPackageIds()) ||
        looksLikePremiumIdentifier(value),
    )
  ) {
    return "premium";
  }
  return "free";
}

function activeEntitlementIds(customerInfo: any): string[] {
  const active = customerInfo?.entitlements?.active;
  if (!active || typeof active !== "object") return [];
  return uniqueStrings(
    Object.entries(active).flatMap(([identifier, entitlement]) => {
      const value =
        entitlement && typeof entitlement === "object"
          ? (entitlement as Record<string, unknown>)
          : {};
      return [
        identifier,
        value.identifier,
        value.productIdentifier,
        value.product_identifier,
        value.productId,
        value.product_id,
      ];
    }),
  );
}

function activeSubscriptionIds(customerInfo: any): string[] {
  const ids = customerInfo?.activeSubscriptions;
  return Array.isArray(ids) ? ids : [];
}

export function resolveRevenueCatPlanTier(customerInfo: any): PlanTier {
  const entitlementTier = tierFromIdentifiers(
    activeEntitlementIds(customerInfo),
  );
  if (entitlementTier !== "free") return entitlementTier;

  const subscriptionTier = tierFromIdentifiers(
    activeSubscriptionIds(customerInfo),
  );
  if (subscriptionTier !== "free") return subscriptionTier;

  return "free";
}

export function resolvePurchasedPackageTier(pkg: any): PlanTier {
  return tierFromPackageIdentifiers([
    pkg?.identifier,
    pkg?.packageType,
    pkg?.product?.identifier,
    pkg?.product?.productIdentifier,
    pkg?.product?.id,
  ]);
}

export function resolveRevenueCatPackagePeriod(pkg: any): BillingPeriod {
  const values = uniqueStrings([
    pkg?.identifier,
    pkg?.packageType,
    pkg?.product?.identifier,
    pkg?.product?.productIdentifier,
    pkg?.product?.id,
    pkg?.product?.subscriptionPeriod,
    pkg?.product?.defaultOption?.billingPeriod?.iso8601,
    pkg?.product?.subscriptionOptions?.[0]?.billingPeriod?.iso8601,
  ]);

  if (
    values.some(
      (value) =>
        value === "$rc_monthly" ||
        /\b(month|monthly|p1m)\b/.test(value.replace(/[._-]+/g, " ")),
    )
  ) {
    return "monthly";
  }

  if (
    values.some(
      (value) =>
        value === "$rc_annual" ||
        /\b(annual|year|yearly|p1y)\b/.test(value.replace(/[._-]+/g, " ")),
    )
  ) {
    return "annual";
  }

  return "unknown";
}

export function findRevenueCatPackage(
  packages: any[],
  tier: Exclude<PlanTier, "free">,
  period: Exclude<BillingPeriod, "unknown">,
): any | null {
  const safePackages = Array.isArray(packages) ? packages : [];
  return (
    safePackages.find(
      (pkg) =>
        resolvePurchasedPackageTier(pkg) === tier &&
        resolveRevenueCatPackagePeriod(pkg) === period,
    ) || null
  );
}
