#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const scanRoots = ["client"];
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

function relative(file) {
  return path.relative(root, file);
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

function requireIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      findings.push(`${relativePath}: missing ${JSON.stringify(snippet)}`);
    }
  }
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function findMatchingParen(text, openParenIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = openParenIndex; index < text.length; index += 1) {
    const char = text[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function scanForbiddenPremiumComparisons(files) {
  const findings = [];
  const patterns = [
    {
      id: "direct-current-plan-premium-check",
      pattern: /\bcurrentPlan\s*(?:={2,3}|!={1,2})\s*["']premium["']/g,
      reason:
        'Use isPremium or hasAccess(currentPlan, "premium") so Scholar users inherit Premium features.',
    },
    {
      id: "derived-premium-from-exact-plan",
      pattern:
        /\b(?:const|let|var)\s+\w*Premium\w*\s*=\s*currentPlan\s*(?:={2,3}|!={1,2})\s*["']premium["']/g,
      reason:
        "Premium access must be rank-based, not exact-tier based, otherwise Scholar users can be locked out.",
    },
    {
      id: "floating-ai-exact-plan-gate",
      pattern:
        /<AIFloatingButton[\s\S]{0,500}isPremium=\{currentPlan\s*(?:={2,3}|!={1,2})\s*["']premium["']\}/g,
      reason:
        "NurAI floating CTAs must receive the rank-based isPremium value from useSubscription.",
    },
  ];

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const check of patterns) {
      check.pattern.lastIndex = 0;
      let match = check.pattern.exec(text);
      while (match) {
        findings.push(
          `${relative(file)}:${lineNumberForIndex(text, match.index)} matched ${check.id}. ${check.reason}`,
        );
        match = check.pattern.exec(text);
      }
    }
  }

  return findings;
}

function scanPaidAIHelperTierContracts(files) {
  const findings = [];
  const paidHelpers = [
    "getPrayerInsightsAI",
    "getHealthGuidance",
    "getRevertGuidance",
    "getDuaInsight",
    "getNameOfAllahInsight",
    "askFiqhQuestion",
  ];
  const serviceFile = path.join(root, "client/services/aiContextService.ts");

  for (const file of files) {
    if (file === serviceFile) continue;

    const text = fs.readFileSync(file, "utf8");
    for (const helper of paidHelpers) {
      const callPattern = new RegExp(`\\b${helper}\\s*\\(`, "g");
      let match = callPattern.exec(text);
      while (match) {
        const openParenIndex = text.indexOf("(", match.index);
        const closeParenIndex = findMatchingParen(text, openParenIndex);

        if (closeParenIndex === -1) {
          findings.push(
            `${relative(file)}:${lineNumberForIndex(text, match.index)}: ${helper} call could not be parsed by the release guard.`,
          );
          match = callPattern.exec(text);
          continue;
        }

        const callText = text.slice(openParenIndex + 1, closeParenIndex);
        if (!/\buserTier\s*:/.test(callText)) {
          findings.push(
            `${relative(file)}:${lineNumberForIndex(text, match.index)}: ${helper} must pass userTier so paid users keep the correct Premium/Scholar AI route.`,
          );
        }

        callPattern.lastIndex = closeParenIndex + 1;
        match = callPattern.exec(text);
      }
    }
  }

  return findings;
}

function main() {
  const findings = [];
  const packageJson = JSON.parse(read("package.json"));
  const subscriptionContextText = read(
    "client/context/SubscriptionContext.tsx",
  );
  const aiContextServiceText = read("client/services/aiContextService.ts");
  const entitlementText = read("client/config/entitlements.ts");
  const libraryAccessText = read("client/services/libraryAccessControl.ts");
  const subscriptionTierText = read("client/services/subscriptionTier.ts");
  const quranReaderText = read("client/screens/QuranReaderScreen.tsx");
  const newMuslimText = read("client/screens/NewMuslimScreen.tsx");
  const revertJourneyText = read("client/screens/RevertJourneyScreen.tsx");
  const prayerTimesText = read("client/screens/PrayerTimesScreen.tsx");
  const duasText = read("client/screens/DuasScreen.tsx");
  const namesText = read("client/screens/NamesOfAllahScreen.tsx");
  const womensHealthText = read("client/screens/WomensHealthScreen.tsx");
  const settingsText = read("client/screens/SettingsScreen.tsx");
  const kidsMemorizationText = read(
    "client/screens/KidsMemorizationScreen.tsx",
  );
  const bookReaderText = read("client/screens/BookReaderScreen.tsx");
  const bookDetailText = read("client/screens/BookDetailScreen.tsx");
  const nasheedsText = read("client/screens/NasheedsScreen.tsx");
  const arabicLearningText = read("client/screens/ArabicLearningScreen.tsx");
  const chatRoutesText = read("server/replit_integrations/chat/routes.ts");
  const audioRoutesText = read("server/replit_integrations/audio/routes.ts");
  const travelRoutesText = read("server/travel.ts");
  const files = scanRoots.flatMap((entry) => walk(path.join(root, entry)));

  findings.push(...scanForbiddenPremiumComparisons(files));
  findings.push(...scanPaidAIHelperTierContracts(files));

  requireIncludes(
    subscriptionContextText,
    "client/context/SubscriptionContext.tsx",
    [
      'const isPremium = tier === "premium" || tier === "scholar"',
      'const isScholar = tier === "scholar"',
      "const hasPaidAPIAccess = isPremium",
      "resolveRevenueCatPlanTier",
      "resolvePurchasedPackageTier",
      "higherPlanTier",
      "recentPaidTierRef",
      "resolvePlanTierWithRecentPaidTier",
      "createRecentPaidTier",
      "revenueCatRefreshPayload",
      "revenueCatCustomerInfoAppUserIds",
      "revenueCatAppUserIds",
      "Purchases.getAppUserID",
      "identifyPurchasesUser",
      "await identifyPurchasesUser()",
      "syncServerEntitlement(customerInfo)",
      "const purchasedPackageTier = resolvePurchasedPackageTier(pkg)",
      "const syncedTier = await syncPaidCustomerInfoToServer(customerInfo)",
      "const newTier = higherPlanTier(syncedTier, purchasedPackageTier)",
      "const newTier = await syncPaidCustomerInfoToServer(customerInfo)",
      "rememberPaidTier(newTier)",
    ],
    findings,
  );

  requireIncludes(
    subscriptionTierText,
    "client/services/subscriptionTier.ts",
    [
      "PURCHASE_TIER_GRACE_MS",
      "createRecentPaidTier",
      "resolvePlanTierWithRecentPaidTier",
      "higherPlanTier(recentPaidTier.tier, resolvedTier)",
      "revenueCatCustomerInfoAppUserIds",
    ],
    findings,
  );

  requireIncludes(
    aiContextServiceText,
    "client/services/aiContextService.ts",
    [
      "export type AIUserTier",
      "userTier?: AIUserTier",
      "userTier: params.userTier",
    ],
    findings,
  );

  requireIncludes(
    entitlementText,
    "client/config/entitlements.ts",
    [
      "export function hasAccess",
      "free: 0",
      "premium: 1",
      "scholar: 2",
      "return tierRank[userTier] >= tierRank[requiredTier]",
    ],
    findings,
  );

  requireIncludes(
    libraryAccessText,
    "client/services/libraryAccessControl.ts",
    [
      "premium: 1",
      "scholar: 2",
      "return PLAN_WEIGHT[userPlan] >= PLAN_WEIGHT[requiredPlan]",
      'return userPlan === "scholar"',
    ],
    findings,
  );

  requireIncludes(
    subscriptionTierText,
    "client/services/subscriptionTier.ts",
    [
      "value.productIdentifier",
      "value.product_identifier",
      "value.productId",
      "value.product_id",
      "activeSubscriptions",
      "resolvePlanTierWithRecentPaidTier",
      "revenueCatCustomerInfoAppUserIds",
    ],
    findings,
  );

  requireIncludes(
    quranReaderText,
    "client/screens/QuranReaderScreen.tsx",
    [
      "const { isPremium, isScholar } = useSubscription()",
      "isPremium={isPremium}",
      'userTier: isScholar ? "scholar" : "premium"',
    ],
    findings,
  );

  requireIncludes(
    newMuslimText,
    "client/screens/NewMuslimScreen.tsx",
    [
      "const { isPremium, isScholar } = useSubscription()",
      "isPremium={isPremium}",
      'userTier: isScholar ? "scholar" : "premium"',
    ],
    findings,
  );

  requireIncludes(
    revertJourneyText,
    "client/screens/RevertJourneyScreen.tsx",
    [
      "const { isPremium, isScholar } = useSubscription()",
      'setAiState("upgrade")',
      'userTier: isScholar ? "scholar" : "premium"',
    ],
    findings,
  );

  requireIncludes(
    prayerTimesText,
    "client/screens/PrayerTimesScreen.tsx",
    [
      "const { isPremium, isScholar } = useSubscription()",
      'userTier: isScholar ? "scholar" : "premium"',
    ],
    findings,
  );

  requireIncludes(
    duasText,
    "client/screens/DuasScreen.tsx",
    [
      "const { isPremium, isScholar } = useSubscription()",
      'userTier: isScholar ? "scholar" : "premium"',
    ],
    findings,
  );

  requireIncludes(
    namesText,
    "client/screens/NamesOfAllahScreen.tsx",
    [
      "const { isPremium, isScholar } = useSubscription()",
      'userTier: isScholar ? "scholar" : "premium"',
    ],
    findings,
  );

  requireIncludes(
    womensHealthText,
    "client/screens/WomensHealthScreen.tsx",
    [
      "const { isPremium, isScholar } = useSubscription()",
      'userTier: isScholar ? "scholar" : "premium"',
      'featureLabel="Women\'s Health Guidance"',
    ],
    findings,
  );

  requireIncludes(
    settingsText,
    "client/screens/SettingsScreen.tsx",
    [
      'const isPremium = hasAccess(currentPlan, "premium")',
      'currentPlan === "free"',
    ],
    findings,
  );

  requireIncludes(
    kidsMemorizationText,
    "client/screens/KidsMemorizationScreen.tsx",
    ['hasAccess(currentPlan, "premium")'],
    findings,
  );

  requireIncludes(
    bookReaderText,
    "client/screens/BookReaderScreen.tsx",
    [
      'hasAccess(currentPlan, "premium")',
      "canAccessChapter",
      'book?.requiredPlan === "scholar" ? "scholar" : "premium"',
      "initialTab: bookUpgradeTab",
    ],
    findings,
  );

  requireIncludes(
    bookDetailText,
    "client/screens/BookDetailScreen.tsx",
    [
      'book.requiredPlan === "scholar" ? "scholar" : "premium"',
      "initialTab: upgradeTab",
    ],
    findings,
  );

  requireIncludes(
    nasheedsText,
    "client/screens/NasheedsScreen.tsx",
    ['hasAccess(currentPlan, "premium")'],
    findings,
  );

  requireIncludes(
    arabicLearningText,
    "client/screens/ArabicLearningScreen.tsx",
    [
      "loading: subscriptionLoading",
      "if (!isPremium) {",
      'setAiState("upgrade")',
      'userTier: isScholar ? "scholar" : "premium"',
      "Unlock NurAI Arabic Coach",
    ],
    findings,
  );
  requireIncludes(
    chatRoutesText,
    "server/replit_integrations/chat/routes.ts",
    ["responseTier = dailyQuota.userTier"],
    findings,
  );
  requireIncludes(
    travelRoutesText,
    "server/travel.ts",
    ['requirePaidAPI("travel_flight_lookup", "premium")'],
    findings,
  );
  requireIncludes(
    audioRoutesText,
    "server/replit_integrations/audio/routes.ts",
    ["const responseTier = dailyQuota.userTier"],
    findings,
  );
  if (chatRoutesText.includes("sanitizePlanTier(userTier)")) {
    findings.push(
      "server/replit_integrations/chat/routes.ts: structured chat response tier must use the server-resolved quota tier, not the client asserted tier.",
    );
  }
  if (audioRoutesText.includes("sanitizePlanTier(req.body?.userTier)")) {
    findings.push(
      "server/replit_integrations/audio/routes.ts: structured voice response tier must use the server-resolved quota tier, not the client asserted tier.",
    );
  }

  const scripts = packageJson.scripts || {};
  if (
    scripts["check:paid-feature-access"] !==
    "node scripts/check-paid-feature-access.js"
  ) {
    findings.push(
      "package.json: check:paid-feature-access must run scripts/check-paid-feature-access.js.",
    );
  }
  if (
    !String(scripts["check:release-local"] || "").includes(
      "npm run check:paid-feature-access",
    )
  ) {
    findings.push(
      "package.json: check:release-local must include check:paid-feature-access.",
    );
  }

  if (findings.length) {
    console.error("Paid feature-access check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    `Paid feature-access check passed: ${files.length} client files scanned for exact-tier Premium lockouts, paid AI tier routing, and rank-based access wiring.`,
  );
}

main();
