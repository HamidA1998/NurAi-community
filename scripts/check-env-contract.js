#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const PRODUCTION_ENV_TEMPLATE_PATH = ".env.production.example";

const SCAN_TARGETS = [
  "server",
  "scripts",
  "deploy/local-ai",
  "package.json",
  "app.json",
  "eas.json",
];
const DOC_PATHS = [
  PRODUCTION_ENV_TEMPLATE_PATH,
  "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
  "LOCAL_AI_SETUP.md",
  "deploy/local-ai/README.md",
  "deploy/local-ai/.env.example",
  "server/ai/README.md",
  "docs/audit/AI_RELEASE_STATUS.md",
  "docs/audit/evals/README.md",
];

const ENV_CONTRACT = {
  AI_INTEGRATIONS_OPENAI_API_KEY: {
    kind: "release-required",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md", "LOCAL_AI_SETUP.md"],
  },
  OPENAI_API_KEY: {
    kind: "release-required-alias",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md", "LOCAL_AI_SETUP.md"],
  },
  AI_INTEGRATIONS_OPENAI_BASE_URL: {
    kind: "optional-runtime",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  NURAI_DEPLOYED_AI_SMOKE_SECRET: {
    kind: "release-required",
    releaseBlocker: true,
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  OPENAI_BASE_URL: {
    kind: "optional-runtime-alias",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  OPENAI_ORGANIZATION: {
    kind: "optional-openai-client",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  OPENAI_PROJECT: {
    kind: "optional-openai-client",
    docs: ["LOCAL_AI_SETUP.md"],
  },

  DATABASE_URL: {
    kind: "release-required",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  SESSION_SECRET: {
    kind: "release-required",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  NURAI_DEPLOYMENT_URL: {
    kind: "release-required",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  NURAI_RAILWAY_PROJECT_ID: {
    kind: "optional-release-verifier",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  RAILWAY_PROJECT_ID: {
    kind: "platform-runtime",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  RAILWAY_TCP_PROXY_DOMAIN: {
    kind: "platform-runtime",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  NURAI_RAILWAY_SERVICE: {
    kind: "optional-release-verifier",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  NURAI_RAILWAY_SSH_IDENTITY_FILE: {
    kind: "optional-release-verifier",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  NURAI_DISABLE_RAILWAY_AI_REMOTE_CHECK: {
    kind: "optional-release-verifier",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  NURAI_DISABLE_RAILWAY_DB_REMOTE_CHECK: {
    kind: "optional-release-verifier",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  EXPO_PUBLIC_DOMAIN: {
    kind: "build-runtime",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  HOME: {
    kind: "platform-runtime",
  },
  NODE_ENV: {
    kind: "platform-runtime",
  },
  PORT: {
    kind: "platform-runtime",
  },
  REPLIT_DEV_DOMAIN: {
    kind: "platform-runtime",
  },
  REPLIT_DOMAINS: {
    kind: "platform-runtime",
  },
  REPLIT_INTERNAL_APP_DOMAIN: {
    kind: "platform-runtime",
  },
  RENDER_EXTERNAL_URL: {
    kind: "platform-runtime",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  RENDER_EXTERNAL_HOSTNAME: {
    kind: "platform-runtime",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },

  NURAI_AI_PROVIDER: {
    kind: "optional-ai-routing",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  NURAI_AI_MODE: {
    kind: "optional-ai-routing-alias",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  NURAI_AI_REVIEW_MODE: {
    kind: "optional-ai-safety",
    docs: ["server/ai/README.md", "LOCAL_AI_SETUP.md"],
  },
  NURAI_DISABLE_AI_FALLBACK: {
    kind: "optional-ai-safety",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  NURAI_REQUIRE_LOCAL_AI: {
    kind: "optional-ai-safety",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  NURAI_REQUIRE_ANDROID_RELEASE: {
    kind: "optional-release-verifier",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  NURAI_ALLOW_LOCAL_RELIGIOUS_AI: {
    kind: "optional-ai-safety",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  NURAI_ALLOW_LOCAL_SENSITIVE_AI: {
    kind: "optional-ai-safety",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  NURAI_CLOUD_TEXT_MODEL: {
    kind: "optional-ai-model",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  NURAI_CLOUD_FAST_MODEL: {
    kind: "optional-ai-model",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  NURAI_CLOUD_BALANCED_MODEL: {
    kind: "optional-ai-model",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  NURAI_CLOUD_DEEP_MODEL: {
    kind: "optional-ai-model",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  NURAI_TTS_MODEL: {
    kind: "optional-ai-model",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  NURAI_LOCAL_AI_BASE_URL: {
    kind: "optional-ai-runtime",
    docs: [
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
      "LOCAL_AI_SETUP.md",
      "deploy/local-ai/README.md",
    ],
  },
  NURAI_LOCAL_AI_API_KEY: {
    kind: "optional-ai-runtime",
    docs: [
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
      "LOCAL_AI_SETUP.md",
      "deploy/local-ai/README.md",
      "deploy/local-ai/.env.example",
    ],
  },
  NURAI_LOCAL_TEXT_MODEL: {
    kind: "optional-ai-model",
    docs: [
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
      "LOCAL_AI_SETUP.md",
      "deploy/local-ai/README.md",
      "deploy/local-ai/.env.example",
    ],
  },
  NURAI_LOCAL_AI_MODELS: {
    kind: "optional-ai-model",
    docs: [
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
      "LOCAL_AI_SETUP.md",
      "deploy/local-ai/README.md",
    ],
  },
  NURAI_LOCAL_AI_TIMEOUT_MS: {
    kind: "optional-ai-runtime",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  NURAI_LOCAL_AI_CHECK_TIMEOUT_MS: {
    kind: "optional-ai-runtime",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  NURAI_LIVE_SOURCE_CHECK_CONCURRENCY: {
    kind: "optional-source-audit",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  NURAI_LIVE_SOURCE_CHECK_RETRIES: {
    kind: "optional-source-audit",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  OLLAMA_UPSTREAM_URL: {
    kind: "deploy-local-ai-runtime",
    docs: ["deploy/local-ai/README.md", "deploy/local-ai/.env.example"],
  },
  AI_USAGE_LOGGING: {
    kind: "optional-ai-observability",
    docs: ["server/ai/README.md"],
  },
  NURAI_AI_EVAL_ENDPOINT: {
    kind: "eval-only",
    docs: ["docs/audit/evals/README.md"],
  },
  NURAI_AI_EVAL_TOKEN: {
    kind: "eval-only",
    docs: ["docs/audit/evals/README.md"],
  },

  REVENUECAT_SECRET_API_KEY: {
    kind: "release-required",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  REVENUECAT_API_KEY: {
    kind: "release-required-alias",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  EXPO_PUBLIC_REVENUECAT_KEY: {
    kind: "release-required",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: {
    kind: "optional-subscription",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: {
    kind: "eas-submit-secret",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  REVENUECAT_SCHOLAR_ENTITLEMENT: {
    kind: "optional-subscription",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  REVENUECAT_PREMIUM_ENTITLEMENT: {
    kind: "optional-subscription",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  REVENUECAT_SCHOLAR_ENTITLEMENT_IDS: {
    kind: "optional-subscription",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  REVENUECAT_PREMIUM_ENTITLEMENT_IDS: {
    kind: "optional-subscription",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  REVENUECAT_SCHOLAR_PRODUCT_IDS: {
    kind: "optional-subscription",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  REVENUECAT_PREMIUM_PRODUCT_IDS: {
    kind: "optional-subscription",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  EXPO_PUBLIC_REVENUECAT_SCHOLAR_ENTITLEMENT: {
    kind: "optional-subscription",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  EXPO_PUBLIC_REVENUECAT_PREMIUM_ENTITLEMENT: {
    kind: "optional-subscription",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  EXPO_PUBLIC_REVENUECAT_SCHOLAR_PRODUCT_IDS: {
    kind: "optional-subscription",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  EXPO_PUBLIC_REVENUECAT_PREMIUM_PRODUCT_IDS: {
    kind: "optional-subscription",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  EXPO_PUBLIC_REVENUECAT_SCHOLAR_PACKAGE_IDS: {
    kind: "optional-subscription",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  EXPO_PUBLIC_REVENUECAT_PREMIUM_PACKAGE_IDS: {
    kind: "optional-subscription",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  REVENUECAT_WEBHOOK_AUTHORIZATION: {
    kind: "optional-subscription",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  NURAI_ADMIN_EMAILS: {
    kind: "optional-server-admin",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  NURAI_ADMIN_SECRET: {
    kind: "optional-server-admin-secret",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
      "docs/nasheeds-server-catalog.md",
    ],
  },
  NURAI_FULL_ACCESS_EMAILS: {
    kind: "optional-server-access-override",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  NURAI_SMART_NOTIFICATION_SECRET: {
    kind: "optional-server-job-secret",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  NURAI_ALLOW_CLIENT_TIER_FOR_PAID_API: {
    kind: "forbidden-release-override",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  ALLOW_UNVERIFIED_SUBSCRIPTION_TIER: {
    kind: "development-only-subscription-test-override",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },

  GOOGLE_PLACES_API_KEY: {
    kind: "release-required",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  GEOAPIFY_API_KEY: {
    kind: "optional-places-provider",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  MAPBOX_ACCESS_TOKEN: {
    kind: "optional-places-provider",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  MAPBOX_GEOCODING_PERMANENT: {
    kind: "optional-places-provider",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  AVIATIONSTACK_API_KEY: {
    kind: "optional-travel-provider",
    docs: [
      ".env.production.example",
      "docs/travel/TRAVEL_MODE_PROVIDER_SETUP.md",
    ],
  },
  AMADEUS_CLIENT_ID: {
    kind: "optional-travel-provider",
    docs: [
      ".env.production.example",
      "docs/travel/TRAVEL_MODE_PROVIDER_SETUP.md",
    ],
  },
  AMADEUS_CLIENT_SECRET: {
    kind: "optional-travel-provider-secret",
    docs: [
      ".env.production.example",
      "docs/travel/TRAVEL_MODE_PROVIDER_SETUP.md",
    ],
  },
  AMADEUS_BASE_URL: {
    kind: "optional-travel-provider",
    docs: [
      ".env.production.example",
      "docs/travel/TRAVEL_MODE_PROVIDER_SETUP.md",
    ],
  },
  DUFFEL_API_KEY: {
    kind: "optional-travel-provider-secret",
    docs: [
      ".env.production.example",
      "docs/travel/TRAVEL_MODE_PROVIDER_SETUP.md",
    ],
  },
  GOOGLE_CLOUD_PROJECT_ID: {
    kind: "release-required-public-id",
    releaseBlocker: true,
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  GOOGLE_PLACES_CHECK_TIMEOUT_MS: {
    kind: "optional-release-verifier",
    docs: [
      ".env.production.example",
      "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    ],
  },
  NURAI_SKIP_RELEASE_REMAINING_TIME_CHECK: {
    kind: "optional-local-release-verifier",
    docs: [".env.production.example"],
  },
  NURAI_GOAL_COMPLETION_REPORT_JSON: {
    kind: "optional-local-release-verifier",
    docs: [".env.production.example"],
  },
  NURAI_SKIP_RELEASE_COCKPIT_CHECK: {
    kind: "optional-local-release-verifier",
    docs: [".env.production.example"],
  },
  NURAI_SKIP_RELEASE_HANDOFF_ARTIFACT_CHECK: {
    kind: "optional-local-release-verifier",
    docs: [".env.production.example"],
  },
  GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH: {
    kind: "eas-submit-secret",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },

  APPLE_CLIENT_ID: {
    kind: "optional-apple-auth",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  APPLE_SERVICE_ID: {
    kind: "optional-apple-auth",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  APPLE_BUNDLE_ID: {
    kind: "optional-apple-auth",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  APPLE_PASS_TYPE_IDENTIFIER: {
    kind: "optional-wallet-pass-secret",
    docs: [".env.production.example", "docs/WALLET_PASSKIT_SETUP.md"],
  },
  APPLE_TEAM_IDENTIFIER: {
    kind: "optional-wallet-pass-secret",
    docs: [".env.production.example", "docs/WALLET_PASSKIT_SETUP.md"],
  },
  APPLE_PASS_SIGNING_CERT_PEM: {
    kind: "optional-wallet-pass-secret",
    docs: [".env.production.example", "docs/WALLET_PASSKIT_SETUP.md"],
  },
  APPLE_PASS_SIGNING_KEY_PEM: {
    kind: "optional-wallet-pass-secret",
    docs: [".env.production.example", "docs/WALLET_PASSKIT_SETUP.md"],
  },
  APPLE_WWDR_CERT_PEM: {
    kind: "optional-wallet-pass-secret",
    docs: [".env.production.example", "docs/WALLET_PASSKIT_SETUP.md"],
  },
  APPLE_PASS_ASSET_DIR: {
    kind: "optional-wallet-pass-runtime",
    docs: [".env.production.example", "docs/WALLET_PASSKIT_SETUP.md"],
  },
  EXPO_PUBLIC_APPLE_SERVICE_ID: {
    kind: "optional-apple-auth",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  EXPO_PUBLIC_APPLE_CLIENT_ID: {
    kind: "optional-apple-auth",
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  EXPO_APPLE_ID: {
    kind: "eas-submit-secret",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  EXPO_APPLE_APP_SPECIFIC_PASSWORD: {
    kind: "eas-submit-secret",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  ASC_APP_ID: {
    kind: "eas-submit-secret",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  ASC_KEY_ID: {
    kind: "eas-submit-secret",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  ASC_ISSUER_ID: {
    kind: "eas-submit-secret",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },
  ASC_PRIVATE_KEY_PATH: {
    kind: "eas-submit-secret",
    releaseBlocker: true,
    docs: ["docs/release/PRODUCTION_RELEASE_RUNBOOK.md"],
  },

  RUNPOD_API_KEY: {
    kind: "runpod-cli-secret",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  RUNPOD_SECRET_nurai: {
    kind: "runpod-cli-secret-alias",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  NURAI_ALLOW_RUNPOD_PUBLIC_POOL: {
    kind: "development-runpod-override",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  RUNPOD_ENDPOINT_ID: {
    kind: "runpod-cli-input",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  RUNPOD_MODEL: {
    kind: "runpod-cli-input",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  RUNPOD_MODEL_ID: {
    kind: "runpod-cli-input",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  RUNPOD_TEMPLATE_ID: {
    kind: "runpod-cli-input",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  RUNPOD_VLLM_TEMPLATE_ID: {
    kind: "runpod-cli-input",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  RAW_OPENAI_OUTPUT: {
    kind: "runpod-template-env",
    docs: ["LOCAL_AI_SETUP.md"],
  },
  OPENAI_SERVED_MODEL_NAME_OVERRIDE: {
    kind: "runpod-template-env",
    docs: ["LOCAL_AI_SETUP.md"],
  },
};

const IGNORED_UPPERCASE_TOKENS = new Set([
  "DEV_SESSION_SECRET",
  // Documentation artifact names can look like env vars to the broad scanner.
  "NURAI_LOGICAL_COMMIT_PLAN",
  "NURAI_AI_MODE_IDS",
  "RUNPOD_PUBLIC_TEXT_MODELS",
  "RUNPOD_SECRET",
  "BOS",
  "CHI",
  "USD",
]);

function readText(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function walkFiles(target) {
  const fullPath = path.join(root, target);
  if (!fs.existsSync(fullPath)) return [];
  const stat = fs.statSync(fullPath);
  if (stat.isFile()) return [target];

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === "server_dist" ||
      entry.name === "static-build" ||
      entry.name.startsWith(".")
    ) {
      continue;
    }
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

function discoverEnvNames() {
  const names = new Set();
  const files = SCAN_TARGETS.flatMap(walkFiles);
  const patterns = [
    /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
    /process\.env\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g,
    /envState\(['"]([A-Za-z_][A-Za-z0-9_]*)['"]\)/g,
    /readArg\(['"][^'"]+['"],\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\)/g,
    /readLocalEnv\(['"]([A-Za-z_][A-Za-z0-9_]*)['"]\)/g,
    /\b((?:AI_INTEGRATIONS|NURAI|REVENUECAT|EXPO_PUBLIC|EXPO_APPLE|APPLE|GOOGLE|RUNPOD|OPENAI|REPLIT|ASC)_[A-Za-z0-9_]+|DATABASE_URL|SESSION_SECRET|NODE_ENV|PORT|RAW_OPENAI_OUTPUT)\b/g,
  ];

  for (const file of files) {
    const text = readText(file);
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const name = match[1];
        if (!name || name.endsWith("_")) continue;
        if (IGNORED_UPPERCASE_TOKENS.has(name)) continue;
        names.add(name);
      }
    }
  }
  return [...names].sort();
}

function includesName(relativePath, name) {
  return readText(relativePath).includes(name);
}

function main() {
  const errors = [];
  const discoveredNames = discoverEnvNames();
  const knownNames = new Set(Object.keys(ENV_CONTRACT));
  const blockerText = readText("scripts/check-release-blockers.js");

  const unknownNames = discoveredNames.filter((name) => !knownNames.has(name));
  if (unknownNames.length) {
    errors.push(
      `Undocumented env var(s) found in source: ${unknownNames.join(", ")}`,
    );
  }

  for (const [name, contract] of Object.entries(ENV_CONTRACT)) {
    if (contract.releaseBlocker && !blockerText.includes(name)) {
      errors.push(
        `${name} is release-critical but is not covered by check-release-blockers.js`,
      );
    }

    if (
      contract.releaseBlocker &&
      !includesName(PRODUCTION_ENV_TEMPLATE_PATH, name)
    ) {
      errors.push(`${name} is missing from ${PRODUCTION_ENV_TEMPLATE_PATH}`);
    }

    for (const docPath of contract.docs || []) {
      if (!includesName(docPath, name)) {
        errors.push(`${name} is missing from required env docs: ${docPath}`);
      }
    }
  }

  if (errors.length) {
    console.error(`Env contract check failed with ${errors.length} issue(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  const byKind = Object.values(ENV_CONTRACT).reduce((counts, contract) => {
    counts[contract.kind] = (counts[contract.kind] || 0) + 1;
    return counts;
  }, {});

  console.log("Env contract check passed.");
  console.log(
    `Verified ${discoveredNames.length} discovered env var(s) against ${Object.keys(ENV_CONTRACT).length} contract entries.`,
  );
  console.log(
    `Documentation files checked: ${DOC_PATHS.filter((docPath) => fs.existsSync(path.join(root, docPath))).length}/${DOC_PATHS.length}.`,
  );
  console.log(
    `Contract coverage: ${Object.entries(byKind)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([kind, count]) => `${kind}=${count}`)
      .join(", ")}`,
  );
}

main();
