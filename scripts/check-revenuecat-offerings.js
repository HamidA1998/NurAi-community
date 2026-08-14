#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const OFFERINGS_URL_APP_USER_ID = "nurai-release-offering-check";
const REQUEST_TIMEOUT_MS = 10_000;

const REQUIRED_PACKAGE_GROUPS = [
  {
    id: "premium-monthly",
    label: "Premium monthly",
    tier: "premium",
    period: "monthly",
    acceptedIdentifiers: ["$rc_monthly"],
    acceptedProductIds: ["nurai.premium.monthly", "nurai_premium_monthly"],
  },
  {
    id: "premium-annual",
    label: "Premium annual",
    tier: "premium",
    period: "annual",
    acceptedIdentifiers: ["$rc_annual"],
    acceptedProductIds: ["nurai.premium.yearly", "nurai_premium_yearly"],
  },
  {
    id: "scholar-monthly",
    label: "Scholar monthly",
    tier: "scholar",
    period: "monthly",
    acceptedIdentifiers: ["$rc_scholar_monthly", "scholar"],
    acceptedProductIds: ["scholar_monthly", "nurai.scholar.monthly"],
  },
  {
    id: "scholar-annual",
    label: "Scholar annual",
    tier: "scholar",
    period: "annual",
    acceptedIdentifiers: ["$rc_scholar_annual", "Scholar"],
    acceptedProductIds: ["nurai_scholar_yearly", "nurai.scholar.yearly"],
  },
];

function splitEnvList(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return [];
  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }
  return result;
}

function publicRevenueCatKey(env) {
  if (process.argv.includes("--android")) {
    return String(env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "").trim();
  }
  return String(
    env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || env.EXPO_PUBLIC_REVENUECAT_KEY || "",
  ).trim();
}

function normalized(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function uniqueNormalized(values) {
  return [...new Set(values.map(normalized).filter(Boolean))];
}

function configuredProductIds(env, tier, period) {
  const prefix = tier === "scholar" ? "SCHOLAR" : "PREMIUM";
  const defaultIds = REQUIRED_PACKAGE_GROUPS.filter(
    (group) => group.tier === tier,
  ).flatMap((group) => group.acceptedProductIds);
  const periodSpecificIds =
    period === "monthly"
      ? [
          ...splitEnvList(
            env[`EXPO_PUBLIC_REVENUECAT_${prefix}_MONTHLY_PRODUCT_IDS`],
          ),
          ...splitEnvList(env[`REVENUECAT_${prefix}_MONTHLY_PRODUCT_IDS`]),
        ]
      : [
          ...splitEnvList(
            env[`EXPO_PUBLIC_REVENUECAT_${prefix}_ANNUAL_PRODUCT_IDS`],
          ),
          ...splitEnvList(
            env[`EXPO_PUBLIC_REVENUECAT_${prefix}_YEARLY_PRODUCT_IDS`],
          ),
          ...splitEnvList(env[`REVENUECAT_${prefix}_ANNUAL_PRODUCT_IDS`]),
          ...splitEnvList(env[`REVENUECAT_${prefix}_YEARLY_PRODUCT_IDS`]),
        ];

  return uniqueNormalized([
    ...defaultIds,
    ...splitEnvList(env[`EXPO_PUBLIC_REVENUECAT_${prefix}_PRODUCT_IDS`]),
    ...splitEnvList(env[`REVENUECAT_${prefix}_PRODUCT_IDS`]),
    ...periodSpecificIds,
  ]);
}

function configuredPackageIds(env, tier, period) {
  const prefix = tier === "scholar" ? "SCHOLAR" : "PREMIUM";
  const defaultIds = REQUIRED_PACKAGE_GROUPS.filter(
    (group) => group.tier === tier,
  ).flatMap((group) => group.acceptedIdentifiers);
  const periodSpecificIds =
    period === "monthly"
      ? [
          ...splitEnvList(
            env[`EXPO_PUBLIC_REVENUECAT_${prefix}_MONTHLY_PACKAGE_IDS`],
          ),
          ...splitEnvList(env[`REVENUECAT_${prefix}_MONTHLY_PACKAGE_IDS`]),
        ]
      : [
          ...splitEnvList(
            env[`EXPO_PUBLIC_REVENUECAT_${prefix}_ANNUAL_PACKAGE_IDS`],
          ),
          ...splitEnvList(
            env[`EXPO_PUBLIC_REVENUECAT_${prefix}_YEARLY_PACKAGE_IDS`],
          ),
          ...splitEnvList(env[`REVENUECAT_${prefix}_ANNUAL_PACKAGE_IDS`]),
          ...splitEnvList(env[`REVENUECAT_${prefix}_YEARLY_PACKAGE_IDS`]),
        ];

  return uniqueNormalized([
    ...defaultIds,
    ...splitEnvList(env[`EXPO_PUBLIC_REVENUECAT_${prefix}_PACKAGE_IDS`]),
    ...splitEnvList(env[`REVENUECAT_${prefix}_PACKAGE_IDS`]),
    ...periodSpecificIds,
  ]);
}

function packagePeriod(values) {
  const normalizedValues = uniqueNormalized(values);
  if (
    normalizedValues.some(
      (value) =>
        value === "$rc_monthly" ||
        value === "$rc_scholar_monthly" ||
        /\b(month|monthly|p1m)\b/.test(value.replace(/[._-]+/g, " ")),
    )
  ) {
    return "monthly";
  }
  if (
    normalizedValues.some(
      (value) =>
        value === "$rc_annual" ||
        value === "$rc_scholar_annual" ||
        /\b(annual|year|yearly|p1y)\b/.test(value.replace(/[._-]+/g, " ")),
    )
  ) {
    return "annual";
  }
  return "unknown";
}

function matchesPackageGroup(pkg, group, env) {
  const identifiers = uniqueNormalized([
    pkg.identifier,
    pkg.platform_product_identifier,
    pkg.product?.identifier,
    pkg.product?.productIdentifier,
    pkg.product?.id,
  ]);
  const packageIds = configuredPackageIds(env, group.tier, group.period);
  const productIds = configuredProductIds(env, group.tier, group.period);
  const period = packagePeriod(identifiers);
  const exactPackageMatch = identifiers.some((value) =>
    packageIds.includes(value),
  );
  const exactProductMatch = identifiers.some((value) =>
    productIds.includes(value),
  );
  const tierWordMatch = identifiers.some((value) =>
    new RegExp(`\\b${group.tier}\\b`).test(value.replace(/[._-]+/g, " ")),
  );

  return (
    period === group.period &&
    (exactPackageMatch || exactProductMatch || tierWordMatch)
  );
}

function platform() {
  return process.argv.includes("--android") ? "android" : "ios";
}

function payloadValue(data) {
  if (data?.value && Array.isArray(data.value.offerings)) return data.value;
  return data || {};
}

function packageEvidence(currentOffering, env) {
  const packages = Array.isArray(currentOffering?.packages)
    ? currentOffering.packages
    : [];
  return REQUIRED_PACKAGE_GROUPS.map((group) => {
    const acceptedIdentifiers = configuredPackageIds(
      env,
      group.tier,
      group.period,
    );
    const acceptedProductIds = configuredProductIds(
      env,
      group.tier,
      group.period,
    );
    const matchedPackage = packages.find((pkg) =>
      matchesPackageGroup(pkg, group, env),
    );
    return {
      id: group.id,
      label: group.label,
      acceptedIdentifiers,
      acceptedProductIds,
      matchedIdentifier: matchedPackage?.identifier || null,
      productConfigured: Boolean(matchedPackage?.platform_product_identifier),
      productIdentifier: matchedPackage?.platform_product_identifier || null,
    };
  });
}

async function fetchOfferings(apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(
      OFFERINGS_URL_APP_USER_ID,
    )}/offerings`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Platform": platform(),
      },
      signal: controller.signal,
    },
  );
  clearTimeout(timeout);

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  return { response, data };
}

async function main() {
  const env = { ...parseEnvFile(envPath), ...process.env };
  const apiKey = publicRevenueCatKey(env);
  const json = process.argv.includes("--json");

  if (!apiKey) {
    const requiredKey = process.argv.includes("--android")
      ? "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY"
      : "EXPO_PUBLIC_REVENUECAT_KEY";
    const report = {
      ok: false,
      status: "missing-key",
      platform: platform(),
      message: `${requiredKey} is required for offering checks.`,
    };
    console.log(json ? JSON.stringify(report, null, 2) : report.message);
    process.exit(1);
  }

  let response;
  let data;
  try {
    ({ response, data } = await fetchOfferings(apiKey));
  } catch (error) {
    const report = {
      ok: false,
      status: "request-failed",
      message:
        error instanceof Error
          ? error.message
          : "RevenueCat offering request failed.",
    };
    console.log(json ? JSON.stringify(report, null, 2) : report.message);
    process.exit(1);
  }

  const value = payloadValue(data);
  const offerings = Array.isArray(value.offerings) ? value.offerings : [];
  const currentOffering =
    offerings.find(
      (offering) => offering.identifier === value.current_offering_id,
    ) || null;
  const packages = packageEvidence(currentOffering, env);
  const missingPackages = packages.filter(
    (pkg) => !pkg.matchedIdentifier || !pkg.productConfigured,
  );
  const ok =
    response.ok &&
    Boolean(value.current_offering_id) &&
    Boolean(currentOffering) &&
    missingPackages.length === 0;
  const report = {
    ok,
    platform: platform(),
    statusCode: response.status,
    currentOfferingId: value.current_offering_id || null,
    offeringCount: offerings.length,
    currentPackageCount: Array.isArray(currentOffering?.packages)
      ? currentOffering.packages.length
      : 0,
    packages,
    missingPackages: missingPackages.map((pkg) => ({
      id: pkg.id,
      label: pkg.label,
      acceptedIdentifiers: pkg.acceptedIdentifiers,
      acceptedProductIds: pkg.acceptedProductIds,
      productConfigured: pkg.productConfigured,
    })),
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (ok) {
    console.log(
      `RevenueCat offering check passed: current offering ${report.currentOfferingId} has ${packages.length} required package groups with products.`,
    );
  } else {
    console.error("RevenueCat offering check failed:");
    console.error(JSON.stringify(report, null, 2));
  }

  if (!ok) process.exit(1);
}

main();
