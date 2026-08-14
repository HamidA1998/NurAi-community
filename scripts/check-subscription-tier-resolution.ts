import {
  createRecentPaidTier,
  findRevenueCatPackage,
  revenueCatCustomerInfoAppUserIds,
  resolvePlanTierWithRecentPaidTier,
  resolvePurchasedPackageTier,
  resolveRevenueCatPackagePeriod,
  resolveRevenueCatPlanTier,
  type PlanTier,
} from "../client/services/subscriptionTier";

type Case = {
  name: string;
  actual: PlanTier;
  expected: PlanTier;
};

const cases: Case[] = [
  {
    name: "active premium entitlement resolves premium",
    actual: resolveRevenueCatPlanTier({
      entitlements: { active: { premium: {} } },
    }),
    expected: "premium",
  },
  {
    name: "active scholar entitlement resolves scholar",
    actual: resolveRevenueCatPlanTier({
      entitlements: { active: { scholar: {} } },
    }),
    expected: "scholar",
  },
  {
    name: "live premium access entitlement resolves premium",
    actual: resolveRevenueCatPlanTier({
      entitlements: { active: { premium_access: {} } },
    }),
    expected: "premium",
  },
  {
    name: "live scholar access entitlement resolves scholar",
    actual: resolveRevenueCatPlanTier({
      entitlements: { active: { scholar_access: {} } },
    }),
    expected: "scholar",
  },
  {
    name: "active premium product resolves premium without entitlement",
    actual: resolveRevenueCatPlanTier({
      entitlements: { active: {} },
      activeSubscriptions: ["nurai.premium.monthly"],
    }),
    expected: "premium",
  },
  {
    name: "active scholar product resolves scholar without entitlement",
    actual: resolveRevenueCatPlanTier({
      entitlements: { active: {} },
      activeSubscriptions: ["nurai_scholar_yearly"],
    }),
    expected: "scholar",
  },
  {
    name: "scholar wins when both products are active",
    actual: resolveRevenueCatPlanTier({
      entitlements: { active: {} },
      activeSubscriptions: ["nurai.premium.yearly", "scholar_monthly"],
    }),
    expected: "scholar",
  },
  {
    name: "active entitlement product identifier resolves premium",
    actual: resolveRevenueCatPlanTier({
      entitlements: {
        active: {
          access: { productIdentifier: "nurai.premium.yearly" },
        },
      },
      activeSubscriptions: [],
    }),
    expected: "premium",
  },
  {
    name: "active entitlement product identifier resolves scholar",
    actual: resolveRevenueCatPlanTier({
      entitlements: {
        active: {
          access: { productIdentifier: "nurai_scholar_yearly" },
        },
      },
      activeSubscriptions: [],
    }),
    expected: "scholar",
  },
  {
    name: "premium purchase package fallback resolves premium",
    actual: resolvePurchasedPackageTier({
      identifier: "$rc_monthly",
      product: { identifier: "nurai.premium.monthly" },
    }),
    expected: "premium",
  },
  {
    name: "scholar purchase package fallback resolves scholar",
    actual: resolvePurchasedPackageTier({
      identifier: "Scholar",
      product: { identifier: "nurai_scholar_yearly" },
    }),
    expected: "scholar",
  },
  {
    name: "empty customer info stays free",
    actual: resolveRevenueCatPlanTier({}),
    expected: "free",
  },
  {
    name: "recent premium purchase survives lagging free customer info",
    actual: resolvePlanTierWithRecentPaidTier(
      resolveRevenueCatPlanTier({}),
      createRecentPaidTier("premium", 10_000),
      11_000,
    ),
    expected: "premium",
  },
  {
    name: "recent scholar purchase survives lagging premium customer info",
    actual: resolvePlanTierWithRecentPaidTier(
      resolveRevenueCatPlanTier({
        activeSubscriptions: ["nurai.premium.monthly"],
      }),
      createRecentPaidTier("scholar", 10_000),
      11_000,
    ),
    expected: "scholar",
  },
  {
    name: "expired recent purchase no longer overrides customer info",
    actual: resolvePlanTierWithRecentPaidTier(
      resolveRevenueCatPlanTier({}),
      createRecentPaidTier("premium", 10_000),
      10_000 + 5 * 60 * 1000 + 1,
    ),
    expected: "free",
  },
  {
    name: "customer info original app user id is collected for server refresh",
    actual:
      revenueCatCustomerInfoAppUserIds({
        originalAppUserId: "$RCAnonymousID:abc123",
      })[0] === "$RCAnonymousID:abc123"
        ? "premium"
        : "free",
    expected: "premium",
  },
  {
    name: "current RevenueCat app user id is collected before original id",
    actual:
      revenueCatCustomerInfoAppUserIds(
        { originalAppUserId: "$RCAnonymousID:abc123" },
        "user-123",
      )[0] === "user-123"
        ? "premium"
        : "free",
    expected: "premium",
  },
];

const packageCases: {
  name: string;
  actual: string;
  expected: string;
}[] = [
  {
    name: "premium monthly package period resolves from product id",
    actual: resolveRevenueCatPackagePeriod({
      identifier: "premium",
      product: { identifier: "nurai.premium.monthly" },
    }),
    expected: "monthly",
  },
  {
    name: "premium annual package period resolves from product id",
    actual: resolveRevenueCatPackagePeriod({
      identifier: "premium_yearly",
      product: { identifier: "nurai.premium.yearly" },
    }),
    expected: "annual",
  },
  {
    name: "scholar monthly package can be found from product id",
    actual:
      findRevenueCatPackage(
        [
          {
            identifier: "scholar",
            product: { identifier: "scholar_monthly" },
          },
        ],
        "scholar",
        "monthly",
      )?.product?.identifier || "missing",
    expected: "scholar_monthly",
  },
  {
    name: "scholar annual package can be found from product id",
    actual:
      findRevenueCatPackage(
        [
          {
            identifier: "Scholar",
            product: { identifier: "nurai_scholar_yearly" },
          },
        ],
        "scholar",
        "annual",
      )?.product?.identifier || "missing",
    expected: "nurai_scholar_yearly",
  },
];

const failures = [...cases, ...packageCases].filter(
  ({ actual, expected }) => actual !== expected,
);

if (failures.length) {
  console.error("Subscription tier-resolution check failed:");
  for (const failure of failures) {
    console.error(
      `- ${failure.name}: expected ${failure.expected}, received ${failure.actual}`,
    );
  }
  process.exit(1);
}

console.log(
  `Subscription tier-resolution check passed: ${cases.length + packageCases.length} RevenueCat entitlement, product, package, and billing-period cases verified.`,
);
