#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

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

function main() {
  const findings = [];

  let authText = "";
  let indexText = "";
  let subscriptionsText = "";
  let adminText = "";
  let requirePaidText = "";
  let authContextText = "";
  let authScreenText = "";

  try {
    authText = read("server/auth.ts");
    indexText = read("server/index.ts");
    subscriptionsText = `${read("server/subscriptions.ts")}\n${read("server/subscriptionTier.ts")}`;
    adminText = read("server/admin.ts");
    requirePaidText = read("server/middleware/requirePaidAPI.ts");
    authContextText = read("client/context/AuthContext.tsx");
    authScreenText = read("client/screens/AuthScreen.tsx");
  } catch (error) {
    findings.push(error instanceof Error ? error.message : String(error));
  }

  requireIncludes(
    authText,
    "server/auth.ts",
    [
      "AUTH_RATE_LIMIT_POLICY",
      "USERNAME_CHECK_RATE_LIMIT_POLICY",
      "enforceRateLimit(req, res)",
      "req.session.regenerate",
      "req.session.destroy",
      'fetch("https://appleid.apple.com/auth/keys"',
      'header.alg !== "RS256"',
      'payload.iss !== "https://appleid.apple.com"',
      "payload.exp <= nowSeconds",
      "payload.iat > nowSeconds + 300",
      "expectedAppleAudiences()",
      'createVerify("RSA-SHA256")',
      'createPublicKey({ key: jwk, format: "jwk" })',
      "appJsonBundleIdentifier()",
      "bcrypt.hash(password, 12)",
      "bcrypt.compare(password, user.password)",
      "normalizeEmail",
      "cleanDisplayName",
    ],
    findings,
  );
  requireRegex(
    authText,
    "server/auth.ts",
    [
      ["Apple token length cap", /identityToken\.length\s*>\s*6000/],
      [
        "Apple JWKS timeout",
        /setTimeout\(\(\)\s*=>\s*controller\.abort\(\),\s*5000\)/,
      ],
      [
        "Apple audience match",
        /tokenAudiences\.some\(\(audience\)\s*=>\s*allowedAudiences\.includes\(audience\)\)/,
      ],
      ["rate limit 429 response", /res\.status\(429\)\.json\(/],
      ["password minimum length", /password\.length\s*<\s*6/],
    ],
    findings,
  );

  requireIncludes(
    indexText,
    "server/index.ts",
    [
      "DEV_SESSION_SECRET",
      "SESSION_SECRET must be set to a strong value before production boot.",
      "secret.length < 32",
      "connectPgSimple(session)",
      "store: new PgSession",
      "secret: getSessionSecret()",
      "saveUninitialized: false",
      "httpOnly: true",
      "secure: isProduction",
      'sameSite: "lax"',
    ],
    findings,
  );
  requireRegex(
    indexText,
    "server/index.ts",
    [
      [
        "30 day session max age",
        /maxAge:\s*30\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/,
      ],
    ],
    findings,
  );

  requireIncludes(
    subscriptionsText,
    "server/subscriptions.ts",
    [
      "REVENUECAT_SECRET_API_KEY",
      "REVENUECAT_API_KEY",
      "Authorization: `Bearer ${apiKey}`",
      "REVENUECAT_SCHOLAR_ENTITLEMENT",
      "REVENUECAT_PREMIUM_ENTITLEMENT",
      "hasFullAccessEmail(user.email)",
      "subscriptionEntitlements",
      "ENTITLEMENT_CACHE_MS",
      "PAID_ENTITLEMENT_STALE_MS",
      "upsertCachedEntitlement",
      "readCachedEntitlement",
      "const revenueCatResult = await fetchRevenueCatTier(user.id)",
      "await readCachedEntitlement(cacheUserId, true)",
      "refreshRevenueCatEntitlementForUser",
      "revenueCatLookupIdsForUser",
      ".onConflictDoUpdate",
      "if (clientTierFallbackAllowed())",
      'return "free"',
    ],
    findings,
  );
  requireRegex(
    subscriptionsText,
    "server/subscriptions.ts",
    [
      [
        "client tier fallback disabled unless explicitly allowed in local development",
        /function clientTierFallbackAllowed\(\): boolean \{\s*return \(\s*!isProduction\(\)\s*&&\s*process\.env\.ALLOW_UNVERIFIED_SUBSCRIPTION_TIER === "true"\s*&&\s*process\.env\.NODE_ENV === "development"\s*\);\s*\}/,
      ],
      [
        "RevenueCat timeout",
        /setTimeout\(\(\)\s*=>\s*controller\.abort\(\),\s*5000\)/,
      ],
      ["RevenueCat DB cache TTL", /ENTITLEMENT_CACHE_MS\s*=\s*5\s*\*\s*60_000/],
      [
        "RevenueCat stale paid fallback cap",
        /PAID_ENTITLEMENT_STALE_MS\s*=\s*24\s*\*\s*60\s*\*\s*60_000/,
      ],
    ],
    findings,
  );
  requireIncludes(
    read("shared/schema.ts"),
    "shared/schema.ts",
    [
      'subscriptionEntitlements = pgTable("subscription_entitlements"',
      'userId: varchar("user_id")',
      'tier: text("tier").notNull().default("free")',
      'cacheExpiresAt: timestamp("cache_expires_at").notNull()',
      'staleUntilAt: timestamp("stale_until_at").notNull()',
    ],
    findings,
  );
  requireIncludes(
    read("migrations/0004_subscription_entitlement_cache.sql"),
    "migrations/0004_subscription_entitlement_cache.sql",
    [
      "CREATE TABLE IF NOT EXISTS subscription_entitlements",
      "user_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE",
      "cache_expires_at timestamp NOT NULL",
      "stale_until_at timestamp NOT NULL",
    ],
    findings,
  );
  if (subscriptionsText.includes("NURAI_ALLOW_CLIENT_TIER_FOR_PAID_API")) {
    findings.push(
      "server/subscriptions.ts: must not allow env-based client-tier paid API override in production.",
    );
  }

  requireIncludes(
    adminText,
    "server/admin.ts",
    [
      "NURAI_ADMIN_EMAILS",
      "NURAI_FULL_ACCESS_EMAILS",
      "hasFullAccessEmail",
      '.split(",")',
      ".toLowerCase()",
    ],
    findings,
  );
  requireIncludes(
    requirePaidText,
    "server/middleware/requirePaidAPI.ts",
    [
      "req.session?.userId",
      "resolvePlanTierForRequest(req, user)",
      'userTier === "premium" || userTier === "scholar"',
      "return res.status(402).json",
    ],
    findings,
  );

  requireIncludes(
    authContextText,
    "client/context/AuthContext.tsx",
    [
      "AUTH_USER_CACHE_KEY",
      'apiRequest("GET", "/api/auth/me"',
      "error instanceof ApiRequestError && error.status === 401",
      "AsyncStorage.getItem(AUTH_USER_CACHE_KEY)",
      "AsyncStorage.removeItem(AUTH_USER_CACHE_KEY)",
      "prepareAuthenticatedSession(data)",
    ],
    findings,
  );
  requireIncludes(
    authScreenText,
    "client/screens/AuthScreen.tsx",
    [
      "function customerAuthError",
      'status === 409 || code === "email_already_exists"',
      'status === 401 || code === "invalid_credentials"',
      'accessibilityLabel="Create account"',
      'testID="button-submit-auth"',
    ],
    findings,
  );

  if (findings.length) {
    console.error("Auth release-control check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Auth release-control check passed: email and Apple sign-in, remembered-session recovery, accessible auth errors, session hardening, auth rate limits, RevenueCat entitlement resolution, admin allowlist, and paid API guards verified.",
  );
}

main();
