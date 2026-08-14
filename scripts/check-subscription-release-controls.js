#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const ignoredDirs = new Set([
  ".expo",
  ".git",
  "assets",
  "build",
  "data",
  "dist",
  "node_modules",
  "server_dist",
  "static-build",
  "web-build",
]);
const textExtensions = new Set([".ts", ".tsx"]);

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath}: missing file`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      findings.push(`${relativePath}: missing ${JSON.stringify(snippet)}`);
    }
  }
}

function requireRegex(text, relativePath, checks, findings) {
  for (const [label, pattern] of checks) {
    if (!pattern.test(text)) {
      findings.push(`${relativePath}: missing ${label}`);
    }
  }
}

function relative(filePath) {
  return path.relative(root, filePath);
}

function walk(entryPath, files = []) {
  if (!fs.existsSync(entryPath)) return files;

  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    if (textExtensions.has(path.extname(entryPath))) files.push(entryPath);
    return files;
  }

  for (const entry of fs.readdirSync(entryPath, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(entryPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && textExtensions.has(path.extname(fullPath))) {
      files.push(fullPath);
    }
  }

  return files;
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function scanUntargetedSubscriptionRoutes(findings) {
  const files = walk(path.join(root, "client"));
  const pattern = /navigation\.navigate\("Subscription"\s*\)/g;

  for (const filePath of files) {
    const text = fs.readFileSync(filePath, "utf8");
    let match = pattern.exec(text);
    while (match) {
      findings.push(
        `${relative(filePath)}:${lineNumberForIndex(
          text,
          match.index,
        )}: Subscription navigation should pass initialTab so users land on the plan that matches the lock.`,
      );
      match = pattern.exec(text);
    }
  }
}

function main() {
  const findings = [];

  const packageJson = JSON.parse(read("package.json"));
  const contextText = read("client/context/SubscriptionContext.tsx");
  const tierResolverText = read("client/services/subscriptionTier.ts");
  const screenText = read("client/screens/SubscriptionScreen.tsx");
  const exploreText = read("client/screens/ExploreScreen.tsx");
  const profileText = read("client/screens/ProfileScreen.tsx");
  const premiumGateText = read("client/components/PremiumGate.tsx");
  const streakGardenText = read("client/screens/StreakGardenScreen.tsx");
  const badgeText = read("client/components/Badge.tsx");
  const buttonText = read("client/components/Button.tsx");
  const kidsMemorizationText = read(
    "client/screens/KidsMemorizationScreen.tsx",
  );
  const audioRoutesText = read("server/replit_integrations/audio/routes.ts");
  const tafsirRoutesText = read("server/replit_integrations/tafsir/routes.ts");
  const subscriptionSyncText = read("server/subscriptionSync.ts");
  const routesText = read("server/routes.ts");
  const featureQuotaText = read("server/ai/featureQuota.ts");
  const paidMiddlewareText = read("server/middleware/requirePaidAPI.ts");
  const libraryScreens = {
    "client/screens/LibraryHomeScreen.tsx": read(
      "client/screens/LibraryHomeScreen.tsx",
    ),
    "client/screens/LibraryCategoryScreen.tsx": read(
      "client/screens/LibraryCategoryScreen.tsx",
    ),
    "client/screens/BookDetailScreen.tsx": read(
      "client/screens/BookDetailScreen.tsx",
    ),
    "client/screens/BookReaderScreen.tsx": read(
      "client/screens/BookReaderScreen.tsx",
    ),
  };
  const serverSubscriptionText = `${read("server/subscriptions.ts")}\n${read("server/subscriptionTier.ts")}`;
  const sharedIdentifiersText = read("shared/subscriptionIdentifiers.ts");
  const runbookText = read("docs/release/PRODUCTION_RELEASE_RUNBOOK.md");
  const auditText = read("docs/audit/RELEASE_COMPLETION_AUDIT.md");
  scanUntargetedSubscriptionRoutes(findings);

  requireIncludes(
    screenText,
    "client/screens/SubscriptionScreen.tsx",
    [
      "subscription-trust-signals",
      "Built for serious Islamic learning",
      "Plan checks stay live",
      "Careful Islamic answers",
      "Private by default",
    ],
    findings,
  );

  requireIncludes(
    contextText,
    "client/context/SubscriptionContext.tsx",
    [
      "storeReady: boolean",
      "storeError: string | null",
      "function revenueCatPublicApiKey",
      "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
      "EXPO_PUBLIC_REVENUECAT_IOS_KEY",
      "const [storeError, setStoreError]",
      "ENTITLEMENT_REFRESH_THROTTLE_MS",
      "lastEntitlementCheckAtRef",
      "entitlementCheckInFlightRef",
      "Purchases.getOfferings()",
      "refreshRevenueCatOfferings",
      "RevenueCat offerings load error",
      "RevenueCat customer info error",
      "syncServerEntitlement",
      "syncPaidCustomerInfoToServer",
      "apiRequest(",
      '"/api/subscriptions/refresh"',
      "AppState.addEventListener",
      "checkEntitlements({ force: true })",
      "availablePackages.length",
      "allPackagesFromOfferings",
      "offeringWithAllAvailablePackages",
      "missingRequiredPlanOptions",
      "STORE_UNAVAILABLE_MESSAGE",
      "STORE_LOAD_ERROR_MESSAGE",
      "Plans are temporarily unavailable. Please try again shortly or restore an existing purchase.",
      "Plans could not be loaded. Please try again shortly or restore an existing purchase.",
      "const storeReady = offeringHasAllRequiredPlanOptions(offerings?.current)",
      "resolveRevenueCatPlanTier",
      "applyCustomerInfoTier",
      "syncPaidCustomerInfoToServer(customerInfo)",
      "higherPlanTier",
      "const purchasedPackageTier = resolvePurchasedPackageTier(pkg)",
      "const syncedTier = await syncPaidCustomerInfoToServer(customerInfo)",
      "const newTier = higherPlanTier(syncedTier, purchasedPackageTier)",
      "const newTier = await syncPaidCustomerInfoToServer(customerInfo)",
      "resolvePurchasedPackageTier",
      "revenueCatRefreshPayload",
      "revenueCatCustomerInfoAppUserIds",
      "Purchases.getAppUserID",
      "identifyPurchasesUser",
      "await identifyPurchasesUser()",
      "const serverTier = await syncServerEntitlement(customerInfo)",
      "rememberPaidTier(serverTier)",
      "RevenueCat restore unavailable",
      "throw error",
      "Purchases.logOut()",
      "lastLoggedInUserIdRef.current = user.id",
      "Purchases.getCustomerInfo().then(applyAnonymousCustomerInfo)",
      "RevenueCat anonymous customer info error",
      "const { checkEntitlements, currentPlan, loading } = subscription",
      'currentPlan === "free"',
      "checkEntitlements().catch",
      'setTier("free")',
    ],
    findings,
  );
  for (const [label, pattern] of [
    [
      "customer-info listener must not force anonymous purchasers to free",
      /addCustomerInfoUpdateListener[\s\S]{0,180}if\s*\(!activeUserIdRef\.current\)[\s\S]{0,80}setTier\("free"\)/,
    ],
    [
      "signed-out effect must not immediately force anonymous purchasers to free",
      /if\s*\(!user\?\.id\)\s*\{\s*setTier\("free"\)/,
    ],
    [
      "entitlement refresh must not return before checking anonymous RevenueCat customer info",
      /if\s*\(!activeUserIdRef\.current\s*&&\s*lastLoggedInUserIdRef\.current\)[\s\S]{0,80}setTier\("free"\)[\s\S]{0,40}return/,
    ],
    [
      "customer-info sync must still ask the server when local RevenueCat info looks free",
      /const\s+resolvedTier\s*=\s*applyCustomerInfoTier\(customerInfo\);\s*if\s*\(\s*resolvedTier\s*===\s*"free"\s*\)\s*return\s+resolvedTier\s*;/,
    ],
  ]) {
    if (pattern.test(contextText)) {
      findings.push(
        `client/context/SubscriptionContext.tsx: ${label}; anonymous App Store purchases must still unlock paid features on-device.`,
      );
    }
  }
  requireRegex(
    contextText,
    "client/context/SubscriptionContext.tsx",
    [
      [
        "production missing-key fallback remains free",
        /No RevenueCat key in production[\s\S]*setTier\("free"\)/,
      ],
      [
        "production init-error fallback remains free",
        /RevenueCat init error:[\s\S]*else\s*\{[\s\S]*setTier\("free"\)/,
      ],
    ],
    findings,
  );
  for (const unsupportedCopy of [
    "RevenueCat purchase store is not configured",
    "RevenueCat purchase store could not be loaded",
    "RevenueCat is not configured",
  ]) {
    if (contextText.includes(unsupportedCopy)) {
      findings.push(
        `client/context/SubscriptionContext.tsx: replace customer-visible store error ${JSON.stringify(
          unsupportedCopy,
        )} with customer-safe copy.`,
      );
    }
  }
  const firstOfferingsLoad = contextText.indexOf(
    "await refreshRevenueCatOfferings();",
  );
  const firstCustomerInfoLoad = contextText.indexOf(
    "const customerInfo = await Purchases.getCustomerInfo();",
  );
  if (
    firstOfferingsLoad === -1 ||
    firstCustomerInfoLoad === -1 ||
    firstOfferingsLoad > firstCustomerInfoLoad
  ) {
    findings.push(
      "client/context/SubscriptionContext.tsx: RevenueCat offerings must load before customer-info entitlement sync so plans still appear if entitlement refresh is temporarily unavailable.",
    );
  }

  requireIncludes(
    profileText,
    "client/screens/ProfileScreen.tsx",
    [
      "params?: Record<string, unknown>",
      'params: { initialTab: "premium" }',
      "navigation.navigate(link.screen, link.params)",
    ],
    findings,
  );

  requireIncludes(
    tierResolverText,
    "client/services/subscriptionTier.ts",
    [
      "resolveRevenueCatPlanTier",
      "resolvePurchasedPackageTier",
      "resolveRevenueCatPackagePeriod",
      "findRevenueCatPackage",
      "DEFAULT_PREMIUM_PRODUCT_IDS",
      "DEFAULT_SCHOLAR_PRODUCT_IDS",
      "activeSubscriptions",
      "value.productIdentifier",
    ],
    findings,
  );

  requireIncludes(
    serverSubscriptionText,
    "server/subscriptions.ts + server/subscriptionTier.ts",
    [
      "resolveRevenueCatSubscriberPlanTier",
      "subscriptions?: Record<string, unknown>",
      "DEFAULT_PREMIUM_PRODUCT_IDS",
      "DEFAULT_SCHOLAR_PRODUCT_IDS",
      "REVENUECAT_PREMIUM_PRODUCT_IDS",
      "REVENUECAT_SCHOLAR_PRODUCT_IDS",
      "revenueCatLookupIdsForUser",
      "revenueCatSubscriberBelongsToAuthenticatedUser",
      "revenueCatSubscriberIdentityIds",
      "refreshRevenueCatEntitlementForUser",
      "cacheUserId",
      "cacheResult",
      "cacheResult: false",
      "$RCAnonymousID:",
    ],
    findings,
  );

  requireIncludes(
    subscriptionSyncText,
    "server/subscriptionSync.ts",
    [
      "registerSubscriptionSyncRoutes",
      "app.post(",
      '"/api/subscriptions/refresh"',
      "requireAuthenticatedUser",
      "refreshRevenueCatEntitlementForUser",
      "req.body?.revenueCatAppUserIds",
      "sanitizePlanTier",
      "entitlement_refresh_unavailable",
    ],
    findings,
  );
  requireIncludes(
    routesText,
    "server/routes.ts",
    ["registerSubscriptionSyncRoutes", "registerSubscriptionSyncRoutes(app)"],
    findings,
  );

  requireIncludes(
    sharedIdentifiersText,
    "shared/subscriptionIdentifiers.ts",
    [
      "DEFAULT_PREMIUM_ENTITLEMENT_IDS",
      "DEFAULT_SCHOLAR_ENTITLEMENT_IDS",
      "DEFAULT_PREMIUM_PRODUCT_IDS",
      "DEFAULT_SCHOLAR_PRODUCT_IDS",
      "DEFAULT_PREMIUM_PACKAGE_IDS",
      "DEFAULT_SCHOLAR_PACKAGE_IDS",
      "nurai.premium.monthly",
      "nurai.premium.yearly",
      "scholar_monthly",
      "nurai_scholar_yearly",
    ],
    findings,
  );

  requireIncludes(
    screenText,
    "client/screens/SubscriptionScreen.tsx",
    [
      "STORE_SETUP_TITLE",
      "PARTIAL_STORE_TITLE",
      "STORE_SETUP_MESSAGE",
      "storeReady",
      "storeError",
      "checkEntitlements",
      "useFocusEffect",
      "refreshingPlans",
      "handleRefreshPlans",
      "const purchased = await purchasePackage(pkg)",
      "useRoute",
      "route.params?.initialTab",
      "const isPremiumOnly = isPremium && !isScholar",
      'route.params?.initialTab === "scholar" || isPremiumOnly',
      "} else if (isPremiumOnly) {",
      'setSelectedTab("scholar")',
      'Platform.OS === "android" ? "Google Play" : "App Store"',
      'Platform.OS === "android" ? "Google Play account" : "App Store account"',
      "Purchase received",
      "Your purchase was received. NurAI is refreshing your account now",
      "Restore received",
      "Your purchases were found. NurAI is refreshing your account now",
      "Purchase not completed",
      "No charge was completed. You can try again or restore an existing purchase.",
      "Restore unavailable",
      "We could not check your purchases right now. Please try again shortly.",
      "checkEntitlements({ force: true })",
      "notice-store-setup-required",
      "button-refresh-plans",
      "Refresh plans",
      "Refresh subscription plans",
      "Plans could not be refreshed. Please try again shortly.",
      "Plans unavailable",
      "Some plans unavailable",
      "Monthly unavailable",
      "Yearly unavailable",
      "findRevenueCatPackage",
      "resolvePurchasedPackageTier",
      "packageForTier",
      '"premium"',
      '"scholar"',
      '"monthly"',
      '"annual"',
    ],
    findings,
  );
  for (const prematureUnlockCopy of [
    "Plan active",
    "Your plan is active. Paid features are now unlocked.",
    "Restored",
    "Your purchases were restored successfully.",
  ]) {
    if (screenText.includes(prematureUnlockCopy)) {
      findings.push(
        `client/screens/SubscriptionScreen.tsx: avoid premature unlock confirmation ${JSON.stringify(
          prematureUnlockCopy,
        )}; wait for entitlement refresh before promising access.`,
      );
    }
  }
  for (const unsupportedCopy of [
    "setup required",
    "Setup required",
    "RevenueCat offering",
    "app store products",
  ]) {
    if (screenText.includes(unsupportedCopy)) {
      findings.push(
        `client/screens/SubscriptionScreen.tsx: replace developer-facing fallback copy ${JSON.stringify(
          unsupportedCopy,
        )} with customer-safe copy.`,
      );
    }
  }
  for (const [label, pattern] of [
    [
      "Quran Explore card must not imply the whole Quran is Premium",
      /title:\s*"Quran"[\s\S]{0,260}isPremium:\s*true/,
    ],
    [
      "Hifz Explore card must not imply the whole tracker is Premium",
      /title:\s*"Hifz Tracker"[\s\S]{0,260}isPremium:\s*true/,
    ],
    [
      "Hadith Explore card must not imply source browsing is Premium",
      /title:\s*"Hadith Library"[\s\S]{0,260}isPremium:\s*true/,
    ],
  ]) {
    if (pattern.test(exploreText)) {
      findings.push(`client/screens/ExploreScreen.tsx: ${label}.`);
    }
  }

  requireIncludes(
    premiumGateText,
    "client/components/PremiumGate.tsx",
    [
      'const tierColor = requiredTier === "scholar" ? theme.scholar : theme.primary',
      "const tierSoft",
      "defaultFeatureLabel",
      "defaultUpgradeMessage",
      "const upgradeCta = `See ${tierLabel} plans`",
      'initialTab: requiredTier === "scholar" ? "scholar" : "premium"',
      "theme.cardBackground",
      "replaceContainer",
      "accessibilityLabel={`${upgradeCta}",
    ],
    findings,
  );
  for (const unsupportedCopy of [
    "`${tierLabel} Feature`",
    "`Upgrade to ${tierLabel} to unlock this feature`",
    "#8B5CF6",
    "#F59E0B",
  ]) {
    if (premiumGateText.includes(unsupportedCopy)) {
      findings.push(
        `client/components/PremiumGate.tsx: replace generic or hardcoded paywall UI ${JSON.stringify(
          unsupportedCopy,
        )} with themed customer-facing copy.`,
      );
    }
  }

  requireIncludes(
    badgeText,
    "client/components/Badge.tsx",
    [
      "color: theme.primary",
      "bg: theme.primarySubtle",
      "border: theme.primaryBorder",
    ],
    findings,
  );
  if (badgeText.includes("#F59E0B")) {
    findings.push(
      "client/components/Badge.tsx: Premium badge must use theme tokens instead of hardcoded orange.",
    );
  }

  requireIncludes(
    buttonText,
    "client/components/Button.tsx",
    [
      "container: { backgroundColor: theme.primary }",
      "textColor: theme.primaryForeground",
    ],
    findings,
  );
  if (buttonText.includes("#F59E0B")) {
    findings.push(
      "client/components/Button.tsx: Premium button variant must use theme tokens instead of hardcoded orange.",
    );
  }

  for (const [relativePath, text] of Object.entries(libraryScreens)) {
    requireIncludes(
      text,
      relativePath,
      ["checkEntitlements", 'currentPlan === "free"'],
      findings,
    );
  }

  requireIncludes(
    kidsMemorizationText,
    "client/screens/KidsMemorizationScreen.tsx",
    [
      "PremiumGate",
      'hasAccess(currentPlan, "premium")',
      'navigation.navigate("Subscription", { initialTab: "premium" })',
      "Premium unlocks guided surah and dua memorization",
    ],
    findings,
  );
  requireIncludes(
    streakGardenText,
    "client/screens/StreakGardenScreen.tsx",
    ["Deep Reflection", 'mode="replace"', "Generate Deep Reflection"],
    findings,
  );

  requireIncludes(
    libraryScreens["client/screens/BookReaderScreen.tsx"],
    "client/screens/BookReaderScreen.tsx",
    [
      "canUsePremiumNarration",
      'hasAccess(currentPlan, "premium")',
      "Premium unlocks chapter narration and offline playback.",
      "Premium unlocks offline chapter narration",
      "customerNarrationErrorMessage",
      "OFFLINE_NARRATION_UNAVAILABLE_COPY",
      "DEVICE_NARRATION_CHUNK_COPY",
      "splitDeviceNarrationText",
      "setNarrationMessage(customerNarrationErrorMessage(message))",
      "isLibraryNarrationAuthorizationError",
      'initialTab: "premium"',
      'sourceFeature: "library narration"',
    ],
    findings,
  );
  requireIncludes(
    read("client/services/libraryNarrationService.ts"),
    "client/services/libraryNarrationService.ts",
    [
      "LibraryNarrationAuthorizationError",
      "isLibraryNarrationAuthorizationError",
      'body?.error === "upgrade_required"',
      "res.status === 402",
    ],
    findings,
  );
  if (
    libraryScreens["client/screens/BookReaderScreen.tsx"].includes(
      "setNarrationMessage(message)",
    )
  ) {
    findings.push(
      "client/screens/BookReaderScreen.tsx: audio playback errors must pass through customerNarrationErrorMessage before rendering.",
    );
  }
  if (
    libraryScreens["client/screens/BookReaderScreen.tsx"].includes(
      'error?.message || "Could not download this narration."',
    )
  ) {
    findings.push(
      "client/screens/BookReaderScreen.tsx: narration download errors must use customerNarrationErrorMessage instead of raw error.message.",
    );
  }

  requireIncludes(
    audioRoutesText,
    "server/replit_integrations/audio/routes.ts",
    [
      "CONTEXTUAL_DAILY_AI_LIMITS",
      "Premium unlocks AI narration and offline audio.",
      "upgradeRequiredBody",
    ],
    findings,
  );

  requireIncludes(
    tafsirRoutesText,
    "server/replit_integrations/tafsir/routes.ts",
    ['requirePaidAPI("tafsir", "scholar")'],
    findings,
  );
  requireRegex(
    read("client/screens/TafsirScreen.tsx"),
    "client/screens/TafsirScreen.tsx",
    [
      [
        'navigation.navigate("Subscription", { initialTab: "scholar" })',
        /navigation\.navigate\("Subscription",\s*\{[\s\S]{0,120}initialTab:\s*"scholar"/,
      ],
    ],
    findings,
  );
  requireIncludes(
    read("client/services/aiContextService.ts"),
    "client/services/aiContextService.ts",
    [
      'message.includes("429")',
      'message.toLowerCase().includes("scholar")',
      "Scholar gives you more daily AI guidance.",
      'message.includes("402")',
      'message.includes("403")',
    ],
    findings,
  );
  requireIncludes(
    paidMiddlewareText,
    "server/middleware/requirePaidAPI.ts",
    ["requiredTier: RequiredPlanTier", 'requiredTier === "scholar"'],
    findings,
  );
  requireRegex(
    featureQuotaText,
    "server/ai/featureQuota.ts",
    [
      [
        "Tafsir premium monthly quota is zero",
        /TAFSIR_MONTHLY_AI_LIMITS[\s\S]*premium:\s*0/,
      ],
    ],
    findings,
  );

  const scripts = packageJson.scripts || {};
  if (
    scripts["check:subscription-release-controls"] !==
    "node scripts/check-subscription-release-controls.js"
  ) {
    findings.push(
      "package.json: check:subscription-release-controls must run scripts/check-subscription-release-controls.js.",
    );
  }
  if (
    scripts["check:subscription-tier-resolution"] !==
    "tsx scripts/check-subscription-tier-resolution.ts && tsx scripts/check-server-subscription-tier-resolution.ts"
  ) {
    findings.push(
      "package.json: check:subscription-tier-resolution must run both client and server tier-resolution checks.",
    );
  }
  if (
    !String(scripts["check:release-local"] || "").includes(
      "npm run check:subscription-release-controls",
    )
  ) {
    findings.push(
      "package.json: check:release-local must include check:subscription-release-controls.",
    );
  }
  if (
    !String(scripts["check:release-local"] || "").includes(
      "npm run check:subscription-tier-resolution",
    )
  ) {
    findings.push(
      "package.json: check:release-local must include check:subscription-tier-resolution.",
    );
  }

  requireIncludes(
    runbookText,
    "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    [
      "npm run check:subscription-release-controls",
      "RevenueCat offering",
      "POST /api/subscriptions/refresh",
      "server entitlement cache",
      "Plans unavailable",
    ],
    findings,
  );
  requireIncludes(
    auditText,
    "docs/audit/RELEASE_COMPLETION_AUDIT.md",
    [
      "npm run check:subscription-release-controls",
      "subscription release-control scan",
      "POST /api/subscriptions/refresh",
      "server entitlement cache",
      "Plans unavailable",
    ],
    findings,
  );

  if (findings.length) {
    console.error("Subscription release-control check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Subscription release-control check passed: RevenueCat store readiness, product-tier fallback, honest purchase fallback UI, package IDs, local release wiring, and docs verified.",
  );
}

main();
