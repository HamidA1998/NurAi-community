import {
  revenueCatLookupIdsForUser,
  revenueCatSubscriberBelongsToAuthenticatedUser,
  resolveRevenueCatSubscriberPlanTier,
  sanitizePlanTier,
  type PlanTier,
} from "../server/subscriptionTier";
import fs from "node:fs";
import path from "node:path";

type TierCase = {
  name: string;
  actual: PlanTier;
  expected: PlanTier;
};

type StringCase = {
  name: string;
  actual: string;
  expected: string;
};

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const cases: TierCase[] = [
  {
    name: "premium entitlement id resolves premium",
    actual: resolveRevenueCatSubscriberPlanTier({
      entitlements: { premium: { expires_date: null } },
    }).tier,
    expected: "premium",
  },
  {
    name: "scholar entitlement id resolves scholar",
    actual: resolveRevenueCatSubscriberPlanTier({
      entitlements: { scholar: { expires_date: null } },
    }).tier,
    expected: "scholar",
  },
  {
    name: "premium product id in subscriptions resolves premium",
    actual: resolveRevenueCatSubscriberPlanTier({
      subscriptions: {
        "nurai.premium.monthly": { expires_date: futureDate },
      },
    }).tier,
    expected: "premium",
  },
  {
    name: "scholar product id in subscriptions resolves scholar",
    actual: resolveRevenueCatSubscriberPlanTier({
      subscriptions: {
        nurai_scholar_yearly: { expires_date: futureDate },
      },
    }).tier,
    expected: "scholar",
  },
  {
    name: "product identifier field resolves premium",
    actual: resolveRevenueCatSubscriberPlanTier({
      entitlements: {
        access: {
          product_identifier: "nurai.premium.yearly",
          expires_date: futureDate,
        },
      },
    }).tier,
    expected: "premium",
  },
  {
    name: "store product identifier field resolves scholar",
    actual: resolveRevenueCatSubscriberPlanTier({
      entitlements: {
        access: {
          store_product_identifier: "scholar_monthly",
          expires_date: futureDate,
        },
      },
    }).tier,
    expected: "scholar",
  },
  {
    name: "scholar wins when both tiers are active",
    actual: resolveRevenueCatSubscriberPlanTier({
      subscriptions: {
        "nurai.premium.yearly": { expires_date: futureDate },
        scholar_monthly: { expires_date: futureDate },
      },
    }).tier,
    expected: "scholar",
  },
  {
    name: "expired paid product resolves free",
    actual: resolveRevenueCatSubscriberPlanTier({
      subscriptions: {
        "nurai.premium.monthly": { expires_date: pastDate },
      },
    }).tier,
    expected: "free",
  },
  {
    name: "sanitizePlanTier rejects unknown input",
    actual: sanitizePlanTier("vip"),
    expected: "free",
  },
];

const lookupCases: StringCase[] = [
  {
    name: "authenticated user id is always first lookup candidate",
    actual: revenueCatLookupIdsForUser("user-123", [])[0] || "missing",
    expected: "user-123",
  },
  {
    name: "RevenueCat anonymous original id can be probed as a lag fallback",
    actual:
      revenueCatLookupIdsForUser("user-123", ["$RCAnonymousID:anon-123"])[1] ||
      "missing",
    expected: "$RCAnonymousID:anon-123",
  },
  {
    name: "other custom user ids are not accepted from the client",
    actual: String(
      revenueCatLookupIdsForUser("user-123", ["other-user-456"]).length,
    ),
    expected: "1",
  },
  {
    name: "anonymous subscriber linked by original app user id is trusted",
    actual: String(
      revenueCatSubscriberBelongsToAuthenticatedUser(
        "user-123",
        "$RCAnonymousID:anon-123",
        { original_app_user_id: "user-123" },
      ),
    ),
    expected: "true",
  },
  {
    name: "anonymous subscriber linked by alias is trusted",
    actual: String(
      revenueCatSubscriberBelongsToAuthenticatedUser(
        "user-123",
        "$RCAnonymousID:anon-123",
        { aliases: ["$RCAnonymousID:anon-123", "user-123"] },
      ),
    ),
    expected: "true",
  },
  {
    name: "anonymous subscriber without authenticated ownership is rejected",
    actual: String(
      revenueCatSubscriberBelongsToAuthenticatedUser(
        "user-123",
        "$RCAnonymousID:anon-123",
        { original_app_user_id: "other-user-456" },
      ),
    ),
    expected: "false",
  },
];

const failures = [...cases, ...lookupCases].filter(
  ({ actual, expected }) => actual !== expected,
);

const subscriptionsSource = fs.readFileSync(
  path.join(process.cwd(), "server/subscriptions.ts"),
  "utf8",
);

const sourceChecks: { name: string; passed: boolean }[] = [
  {
    name: "entitlement cache read failures are non-fatal",
    passed:
      subscriptionsSource.includes("readCachedEntitlementSafe") &&
      subscriptionsSource.includes(
        "Entitlement cache read unavailable; continuing without cached tier",
      ),
  },
  {
    name: "entitlement cache write failures do not discard live RevenueCat tier",
    passed:
      subscriptionsSource.includes("upsertCachedEntitlementSafe") &&
      subscriptionsSource.includes(
        "Entitlement cache write unavailable; continuing with live tier",
      ),
  },
  {
    name: "plan resolver still probes RevenueCat before any local development fallback",
    passed: subscriptionsSource.includes(
      "const revenueCatResult = await fetchRevenueCatTier(user.id)",
    ),
  },
];

for (const check of sourceChecks) {
  if (!check.passed) {
    failures.push({
      name: check.name,
      actual: "missing",
      expected: "present",
    });
  }
}

if (failures.length) {
  console.error("Server subscription tier-resolution check failed:");
  for (const failure of failures) {
    console.error(
      `- ${failure.name}: expected ${failure.expected}, received ${failure.actual}`,
    );
  }
  process.exit(1);
}

console.log(
  `Server subscription tier-resolution check passed: ${cases.length + lookupCases.length} RevenueCat entitlement, product, expiry, tier-sanitization, and lookup-alias cases verified.`,
);
