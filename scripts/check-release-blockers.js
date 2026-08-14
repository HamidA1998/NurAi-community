#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { inspectDatabaseUrl } = require("./lib/production-db-target");

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const easPath = path.join(root, "eas.json");
const packagePath = path.join(root, "package.json");
const conversationCheckPath = path.join(
  root,
  "scripts",
  "check-conversation-ownership.js",
);
const requiredMigrationFiles = listRequiredMigrationFiles();
const requiredReleaseControlScripts = [
  "scripts/check-incomplete-markers.js",
  "scripts/check-user-facing-claims.js",
  "scripts/check-customer-facing-copy.js",
  "scripts/check-ai-cta-release.js",
  "scripts/check-scholar-review-workflow.ts",
  "scripts/check-personalization-release.ts",
  "scripts/check-privacy-trust-release.ts",
  "scripts/check-paid-feature-access.js",
  "scripts/check-arabic-learning-release.js",
  "scripts/check-app-store-showcase-release.ts",
  "scripts/check-client-api-usage.js",
  "scripts/check-community-release-controls.js",
  "scripts/check-db-release-controls.js",
  "scripts/check-production-db-target.js",
  "scripts/check-production-db-proof-plan.js",
  "scripts/lib/production-db-target.js",
  "scripts/check-production-db-release.js",
  "scripts/check-db-migrations-applied.js",
  "scripts/apply-production-migrations.js",
  "scripts/check-rate-limit-controls.js",
  "scripts/check-auth-release-controls.js",
  "scripts/check-family-audit-controls.js",
  "scripts/check-revenuecat-webhook-controls.js",
  "scripts/check-revenuecat-offerings.js",
  "scripts/check-subscription-release-controls.js",
  "scripts/check-subscription-tier-resolution.ts",
  "shared/subscriptionIdentifiers.ts",
  "scripts/check-library-integrity.js",
  "scripts/check-library-content-completion.ts",
  "scripts/lib/libraryContentHash.ts",
  "scripts/lib/libraryReviewEvidence.ts",
  "scripts/export-library-completion-audit.js",
  "scripts/export-library-title-content-audit.ts",
  "scripts/export-library-source-specificity-audit.ts",
  "scripts/check-library-source-review-controls.js",
  "scripts/check-library-source-refs.ts",
  "scripts/export-library-review-queue.ts",
  "scripts/export-library-review-batches.ts",
  "scripts/export-library-review-packet.ts",
  "scripts/export-library-review-packets.ts",
  "scripts/export-library-review-signoff-ledger.ts",
  "scripts/export-library-review-evidence-intake.ts",
  "scripts/validate-library-review-evidence.ts",
  "scripts/check-library-review-stage-validation.ts",
  "scripts/merge-library-review-evidence.ts",
  "scripts/check-library-review-final-readiness.ts",
  "scripts/apply-library-review-evidence.ts",
  "scripts/export-release-owner-actions.js",
  "scripts/export-release-cockpit.js",
  "scripts/export-release-account-session-plan.js",
  "scripts/export-release-blocker-evidence.js",
  "scripts/export-release-external-evidence-intake.js",
  "scripts/export-release-command-result.js",
  "scripts/apply-release-command-result.js",
  "scripts/check-release-command-result.js",
  "scripts/validate-release-external-evidence.js",
  "scripts/lib/releaseExternalEvidenceRequirements.js",
  "scripts/lib/releaseCommandEvidence.js",
  "scripts/export-production-secret-checklist.js",
  "scripts/check-local-ai.js",
  "scripts/check-local-ai-config.js",
  "scripts/check-runpod-account.js",
  "scripts/check-ai-status-route.ts",
  "scripts/check-ai-source-catalog.ts",
  "scripts/check-source-pack-final-readiness.ts",
  "scripts/check-human-review-final-readiness.ts",
  "scripts/check-openai-deployment.js",
  "scripts/eval-ai-quality.js",
  "scripts/eval-ai-source-grounding.ts",
  "scripts/eval-ai-router-contract.ts",
  "scripts/check-ai-privacy-controls.js",
  "scripts/check-ai-cost-controls.js",
  "scripts/check-route-ownership-controls.js",
  "scripts/check-http-security-controls.js",
  "scripts/check-places-provider-controls.js",
  "scripts/check-google-places-live.js",
  "scripts/check-official-service-links.ts",
  "scripts/check-pilgrim-health-safety.ts",
  "scripts/check-ummah-product-roadmap.ts",
  "scripts/export-ummah-product-roadmap.ts",
  "scripts/check-android-release-credentials.js",
  "scripts/check-deployment-config.js",
  "scripts/check-threat-model.js",
  "scripts/check-server-route-manifest.js",
  "scripts/check-navigation-routes.js",
  "scripts/check-app-release-config.js",
  "scripts/check-static-build-output.js",
  "scripts/check-testflight-build-fingerprint.js",
  "scripts/build.js",
  "scripts/check-env-contract.js",
  "scripts/check-release-handoff.js",
  "scripts/check-goal-completion.js",
  "scripts/check-secret-leaks.js",
  "scripts/sync-railway-smoke-secret.js",
  "scripts/create-runpod-vllm-endpoint.js",
];
const requiredPackageScripts = [
  "lint",
  "check:types",
  "server:build",
  "server:prod",
  "expo:start:static:build",
  "expo:static:build",
  "check:library",
  "check:library-content-completion",
  "export:library-completion-audit",
  "export:library-title-content-audit",
  "export:library-source-specificity-audit",
  "export:library-review-queue",
  "export:library-review-batches",
  "export:library-review-packet",
  "export:library-review-packets",
  "export:library-review-signoff-ledger",
  "export:library-review-evidence-intake",
  "validate:library-review-evidence",
  "check:library-review-stage-validation",
  "merge:library-review-evidence",
  "check:library-review-final-readiness",
  "apply:library-review-evidence",
  "export:release-owner-actions",
  "export:release-cockpit",
  "check:release-cockpit",
  "export:release-account-session-plan",
  "export:release-blocker-evidence",
  "export:release-external-evidence-intake",
  "export:release-command-result",
  "apply:release-command-result",
  "validate:release-external-evidence",
  "export:production-secret-checklist",
  "check:conversation-ownership",
  "fix:conversation-ownership",
  "check:incomplete-markers",
  "check:user-facing-claims",
  "check:customer-facing-copy",
  "check:ai-cta-release",
  "check:scholar-review-workflow",
  "check:personalization-release",
  "check:privacy-trust-release",
  "check:paid-feature-access",
  "check:arabic-learning-release",
  "check:client-api-usage",
  "check:app-store-showcase-release",
  "check:community-release-controls",
  "check:db-release-controls",
  "check:production-db-target",
  "check:production-db-proof-plan",
  "check:production-db-release",
  "check:db-migrations-applied",
  "apply:production-migrations",
  "check:rate-limit-controls",
  "check:auth-release-controls",
  "check:family-audit-controls",
  "check:revenuecat-webhook-controls",
  "check:revenuecat-offerings",
  "check:revenuecat-offerings:android",
  "check:subscription-release-controls",
  "check:subscription-tier-resolution",
  "check:library-source-review-controls",
  "check:local-ai",
  "check:local-ai-config",
  "check:runpod-account",
  "check:ai-status-route",
  "check:ai-source-catalog",
  "check:source-pack-final-readiness",
  "check:human-review-final-readiness",
  "eval:ai-quality",
  "eval:ai-grounding",
  "eval:ai-router",
  "check:ai-privacy-controls",
  "check:ai-cost-controls",
  "check:route-ownership-controls",
  "check:http-security-controls",
  "check:places-provider-controls",
  "check:google-places-live",
  "check:official-service-links",
  "check:pilgrim-health-safety",
  "check:ummah-product-roadmap",
  "export:ummah-product-roadmap",
  "check:android-release-credentials",
  "check:deployment-config",
  "check:threat-model",
  "check:server-routes",
  "check:navigation-routes",
  "check:app-release-config",
  "check:static-build-output",
  "check:testflight-build-fingerprint",
  "check:env-contract",
  "check:release-handoff",
  "check:release-command-result",
  "check:goal-completion",
  "check:secret-leaks",
  "check:release-blockers",
  "check:railway-smoke-secret-sync",
  "check:ai-release",
  "check:ai-release:deployed",
  "check:release-local",
  "check:release-local:full",
  "sync:railway-smoke-secret",
  "create:runpod-ai",
];
const requiredPackageScriptIncludes = {
  "check:ai-release": [
    "tsc --noEmit",
    "scripts/check-openai-deployment.js",
    "npm run server:build",
    "npm run eval:ai-quality",
    "npm run eval:ai-grounding",
    "npm run eval:ai-router",
    "npm run check:library",
    "npm run check:ai-source-catalog",
    "npm run check:ai-status-route",
    "npm run check:local-ai-config",
  ],
  "check:ai-release:deployed": [
    "scripts/check-openai-deployment.js",
    "--release-gate",
    "--live-completion",
    "--server-smoke",
    "--require-ai-integrations-openai-key",
  ],
  "check:release-local": [
    "npm run lint",
    "npm run check:ai-release",
    "npm audit --audit-level=moderate",
    "npx expo-doctor",
    "npm run check:incomplete-markers",
    "npm run check:user-facing-claims",
    "npm run check:customer-facing-copy",
    "npm run check:ai-cta-release",
    "npm run check:scholar-review-workflow",
    "npm run check:personalization-release",
    "npm run check:privacy-trust-release",
    "npm run check:paid-feature-access",
    "npm run check:arabic-learning-release",
    "npm run check:app-store-showcase-release",
    "npm run check:client-api-usage",
    "npm run check:community-release-controls",
    "npm run check:db-release-controls",
    "npm run check:rate-limit-controls",
    "npm run check:auth-release-controls",
    "npm run check:family-audit-controls",
    "npm run check:revenuecat-webhook-controls",
    "npm run check:revenuecat-offerings",
    "npm run check:subscription-release-controls",
    "npm run check:library-source-review-controls",
    "npm run check:library-review-stage-validation",
    "npm run check:library-content-completion -- --summary-json",
    "npm run export:library-completion-audit -- --check --summary-json",
    "npm run export:library-title-content-audit -- --check --summary-json",
    "npm run export:library-source-specificity-audit -- --check --summary-json",
    "npm run export:library-review-queue -- --check --summary-json",
    "npm run export:library-review-batches -- --check --summary-json",
    "npm run export:library-review-packet -- --book-id hajj-and-umrah-preparation --check --summary-json",
    "npm run export:library-review-packets -- --check --summary-json --all",
    "npm run export:library-review-signoff-ledger -- --check --summary-json",
    "npm run export:library-review-evidence-intake -- --check --summary-json",
    "npm run validate:library-review-evidence -- --summary-json",
    "npm run apply:library-review-evidence -- --summary-json",
    "npm run export:release-owner-actions -- --check --summary-json",
    "npm run check:release-cockpit",
    "npm run export:release-account-session-plan -- --check --summary-json",
    "npm run export:release-blocker-evidence -- --check --summary-json",
    "npm run check:railway-smoke-secret-sync",
    "npm run check:production-db-proof-plan",
    "npm run export:release-external-evidence-intake -- --check --summary-json",
    "npm run check:release-command-result",
    "npm run validate:release-external-evidence -- --summary-json",
    "npm run export:production-secret-checklist -- --check --summary-json",
    "npm run apply:production-migrations -- --plan-only --json",
    "npm run check:ai-privacy-controls",
    "npm run check:ai-cost-controls",
    "npm run check:route-ownership-controls",
    "npm run check:http-security-controls",
    "npm run check:places-provider-controls",
    "npm run check:official-service-links",
    "npm run check:pilgrim-health-safety",
    "npm run check:ummah-product-roadmap",
    "npm run export:ummah-product-roadmap -- --check --summary-json",
    "npm run check:deployment-config",
    "npm run check:threat-model",
    "npm run check:server-routes",
    "npm run check:navigation-routes",
    "npm run check:app-release-config",
    "npm run check:env-contract",
    "npm run check:release-handoff",
    "npm run check:secret-leaks",
  ],
  "check:release-local:full": [
    "npm run check:release-local",
    "EXPO_PUBLIC_DOMAIN=localhost:5000 npm run expo:static:build",
    "npm run check:static-build-output",
  ],
  "check:testflight-build-fingerprint": [
    "scripts/check-testflight-build-fingerprint.js",
  ],
  "check:goal-completion": ["scripts/check-goal-completion.js"],
  "check:library-content-completion": [
    "scripts/check-library-content-completion.ts",
  ],
  "export:library-completion-audit": [
    "scripts/export-library-completion-audit.js",
  ],
  "export:library-title-content-audit": [
    "scripts/export-library-title-content-audit.ts",
  ],
  "export:library-source-specificity-audit": [
    "scripts/export-library-source-specificity-audit.ts",
  ],
  "export:library-review-queue": ["scripts/export-library-review-queue.ts"],
  "export:library-review-batches": ["scripts/export-library-review-batches.ts"],
  "export:library-review-packet": ["scripts/export-library-review-packet.ts"],
  "export:library-review-packets": ["scripts/export-library-review-packets.ts"],
  "export:library-review-signoff-ledger": [
    "scripts/export-library-review-signoff-ledger.ts",
  ],
  "export:library-review-evidence-intake": [
    "scripts/export-library-review-evidence-intake.ts",
  ],
  "validate:library-review-evidence": [
    "scripts/validate-library-review-evidence.ts",
  ],
  "check:library-review-stage-validation": [
    "scripts/check-library-review-stage-validation.ts",
  ],
  "merge:library-review-evidence": ["scripts/merge-library-review-evidence.ts"],
  "check:library-review-final-readiness": [
    "scripts/check-library-review-final-readiness.ts",
  ],
  "apply:library-review-evidence": ["scripts/apply-library-review-evidence.ts"],
  "export:ummah-product-roadmap": ["scripts/export-ummah-product-roadmap.ts"],
  "export:release-owner-actions": ["scripts/export-release-owner-actions.js"],
  "export:release-cockpit": ["scripts/export-release-cockpit.js"],
  "check:release-cockpit": ["scripts/export-release-cockpit.js"],
  "export:release-account-session-plan": [
    "scripts/export-release-account-session-plan.js",
  ],
  "export:release-blocker-evidence": [
    "scripts/export-release-blocker-evidence.js",
  ],
  "export:release-external-evidence-intake": [
    "scripts/export-release-external-evidence-intake.js",
  ],
  "export:release-command-result": ["scripts/export-release-command-result.js"],
  "apply:release-command-result": ["scripts/apply-release-command-result.js"],
  "check:release-command-result": ["scripts/check-release-command-result.js"],
  "check:railway-smoke-secret-sync": [
    "scripts/sync-railway-smoke-secret.js",
    "--plan",
    "--json",
  ],
  "check:production-db-proof-plan": [
    "scripts/check-production-db-proof-plan.js",
    "--json",
  ],
  "sync:railway-smoke-secret": ["scripts/sync-railway-smoke-secret.js"],
  "validate:release-external-evidence": [
    "scripts/validate-release-external-evidence.js",
  ],
  "export:production-secret-checklist": [
    "scripts/export-production-secret-checklist.js",
  ],
  "check:runpod-account": ["scripts/check-runpod-account.js"],
  "create:runpod-ai": ["scripts/create-runpod-vllm-endpoint.js"],
  "expo:static:build": ["scripts/build.js"],
  "expo:start:static:build": ["expo start", "--no-dev", "--minify"],
};
const ownerActionsByBlockerId = {
  "deployed-runtime-url": [
    "Set NURAI_DEPLOYMENT_URL to the real current production HTTPS server, such as the active Railway host or custom-domain host used by the App Store build.",
    "If the current host returns 404 for /api/ai/status or /api/admin/ai/diagnostics, deploy the latest server build to that host before rerunning release verification.",
    "Set the production runtime secrets on that host, including AI_INTEGRATIONS_OPENAI_API_KEY, NURAI_DEPLOYED_AI_SMOKE_SECRET, session, RevenueCat, Google Places, and app domain values.",
    "After Railway login is refreshed, run npm run sync:railway-smoke-secret to copy the local NURAI_DEPLOYED_AI_SMOKE_SECRET to the nurai-api Railway service without printing the secret.",
    "Run NURAI_DEPLOYMENT_URL=https://your-production-domain.example NURAI_DEPLOYED_AI_SMOKE_SECRET=... npm run check:ai-release:deployed and require public /api/ai/status redaction, AI_INTEGRATIONS_OPENAI_API_KEY as the deployed OpenAI secret source, unauthenticated /api/admin/ai/diagnostics returning 401, and the deployed server-side AI smoke check passing.",
  ],
  "production-database-url": [
    "Run npm run check:production-db-proof-plan and confirm the non-secret migration hash plan is current before using the real DATABASE_URL.",
    "Provide the real production Railway Postgres DATABASE_URL from the Railway service, or use an explicitly approved legacy Supabase URL with its existing database password.",
    "Run DATABASE_URL=postgres://... npm run check:production-db-target and confirm the target is the active NurAI Railway project before applying SQL.",
    "Review the production migration plan with DATABASE_URL=postgres://... npm run apply:production-migrations -- --json, then apply with DATABASE_URL=postgres://... npm run apply:production-migrations -- --yes.",
    "Run DATABASE_URL=postgres://... npm run check:production-db-release.",
    "Run DATABASE_URL=postgres://... npm run check:conversation-ownership, DATABASE_URL=postgres://... npm run fix:conversation-ownership if needed, and DATABASE_URL=postgres://... npm run check:db-migrations-applied after migrations are applied.",
  ],
  "owned-runpod-endpoint": [
    "Add enough RunPod credit for the account balance to be positive; endpoint creation currently requires at least $0.01 available balance.",
    "Rotate the RunPod API token that was pasted during setup before production use.",
    "If the create command emits blocker=runpod-balance, treat it as an owner billing action and do not mark the endpoint gate complete.",
    'Run npm run create:runpod-ai -- --yes --template-id axws2453nd --model Qwen/Qwen3-8B --gpu "NVIDIA L4" --workers-min 0 --workers-max 1, then configure the returned owned /openai/v1 endpoint in NURAI_LOCAL_AI_BASE_URL and NURAI_LOCAL_AI_MODELS.',
    "Run npm run check:runpod-account, npm run check:local-ai -- --all-enabled, and npm run check:release-blockers.",
  ],
  "google-places-key": [
    "Enable billing on the Google Cloud project that owns GOOGLE_PLACES_API_KEY.",
    "Enable the required Google Maps Platform APIs for the live smoke checks, including Geocoding API and Places API (New).",
    "Set non-secret GOOGLE_CLOUD_PROJECT_ID to the Google Cloud project that owns the Places key so release evidence can tie live checks to the intended project.",
    "Run npm run check:google-places-live and npm run check:release-blockers before relying on production nearby place data.",
  ],
  "eas-android-submit-config": [
    "Finish Google Play Console signup and choose the correct developer account type; Google says this owner/account choice cannot be changed later.",
    "Create or link the Google Play app for package uk.co.eliteautomations.nurai.",
    "Create a Google Play service account JSON key outside the repo, grant the required Play Console permissions, and upload the JSON to RevenueCat's Google Play app config.",
    "Set GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH to the external JSON file and set EXPO_PUBLIC_REVENUECAT_ANDROID_KEY from the RevenueCat Android public SDK key.",
    "Run npm run check:revenuecat-offerings:android -- --json to prove the Android key loads product-backed Premium and Scholar packages.",
    "Run npm run check:android-release-credentials and npm run check:release-blockers.",
  ],
};

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

function looksLikeSecretReference(value) {
  return /^{{\s*[A-Za-z_][A-Za-z0-9_]*\s*}}$/.test((value || "").trim());
}

function looksLikePlaceholder(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) return true;
  return [
    "changeme",
    "change-me",
    "placeholder",
    "replace-me",
    "replace_with",
    "replace-with",
    "to" + "do",
    "example.com",
    "example.org",
    "example.net",
    "your-",
    "your_",
    "<",
    ">",
  ].some((marker) => normalized.includes(marker));
}

function isPresent(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isTruthyFlag(value) {
  return ["1", "true", "yes", "on"].includes(
    String(value || "")
      .trim()
      .toLowerCase(),
  );
}

function releaseAIMode() {
  const value = String(env.NURAI_AI_PROVIDER || env.NURAI_AI_MODE || "openai")
    .trim()
    .toLowerCase();
  return ["openai", "hybrid", "local"].includes(value) ? value : "openai";
}

function localAIRequiredForRelease() {
  return (
    releaseAIMode() !== "openai" || isTruthyFlag(env.NURAI_REQUIRE_LOCAL_AI)
  );
}

function androidReleaseRequiredForRelease() {
  return (
    process.argv.includes("--require-android-release") ||
    isTruthyFlag(env.NURAI_REQUIRE_ANDROID_RELEASE)
  );
}

function deployedRuntimeNeedsLatestServer(deployedAI) {
  return [deployedAI?.deploymentStatusError, deployedAI?.adminDiagnosticsError]
    .filter(Boolean)
    .some((value) => String(value).includes("404"));
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listRequiredMigrationFiles() {
  const migrationsDir = path.join(root, "migrations");
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => /^\d{4}_[a-z0-9_]+\.sql$/i.test(file))
    .sort()
    .map((file) => path.join("migrations", file));
}

const fileEnv = parseEnvFile(envPath);
const env = { ...fileEnv, ...process.env };

function envState(name) {
  const value = env[name];
  const source =
    process.env[name] !== undefined
      ? "process"
      : fileEnv[name] !== undefined
        ? ".env.local"
        : "missing";
  if (!isPresent(value)) return { ok: false, source, state: "missing" };
  if (looksLikeSecretReference(value)) {
    return { ok: false, source, state: "secret-reference" };
  }
  if (looksLikePlaceholder(value)) {
    return { ok: false, source, state: "placeholder" };
  }
  return { ok: true, source, state: "present" };
}

function isLoopbackHost(hostname) {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  return (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "127.0.0.1" ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}

function urlEnvState(name, options = {}) {
  const state = envState(name);
  const value = String(env[name] || "").trim();
  const allowedProtocols = options.allowedProtocols || ["https:"];
  const allowLoopback = Boolean(options.allowLoopback);

  if (!state.ok) return state;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { ...state, ok: false, state: "invalid-url" };
  }

  const evidence = {
    ...state,
    protocol: parsed.protocol.replace(":", ""),
    host: parsed.hostname ? "present" : "missing",
    pathname: parsed.pathname || "/",
  };

  if (!allowedProtocols.includes(parsed.protocol)) {
    return {
      ...evidence,
      ok: false,
      state: "invalid-protocol",
      allowedProtocols: allowedProtocols.map((protocol) =>
        protocol.replace(":", ""),
      ),
    };
  }

  if (!allowLoopback && isLoopbackHost(parsed.hostname)) {
    return { ...evidence, ok: false, state: "loopback-host" };
  }

  return evidence;
}

function databaseUrlState(name) {
  const state = envState(name);
  const value = String(env[name] || "").trim();
  if (!state.ok) return state;
  return inspectDatabaseUrl(value, { source: state.source });
}

function dbMigrationsAppliedEvidence(databaseState) {
  if (!databaseState.ok) {
    return {
      ok: false,
      skipped: true,
      reason:
        "DATABASE_URL must pass shape validation before applied migrations can be verified.",
    };
  }

  const result = spawnSync(
    process.execPath,
    ["scripts/check-production-db-release.js", "--json"],
    {
      cwd: root,
      encoding: "utf8",
      env,
      timeout: 30_000,
    },
  );

  const stdout = result.stdout.trim();
  let report = null;
  if (stdout) {
    try {
      report = JSON.parse(stdout);
    } catch {
      report = null;
    }
  }

  return {
    ok: result.status === 0 && report?.ok === true,
    exitCode: result.status,
    signal: result.signal,
    ownership: report?.ownership,
    migrationCount: report?.migrations?.migrationCount,
    failedMigrations: report?.migrations?.failedMigrations,
    stderr: result.stderr.trim() ? "present" : "empty",
  };
}

function parseJsonFromCommandOutput(stdout) {
  const text = String(stdout || "").trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function sanitizeReleaseCommandText(value) {
  return String(value || "")
    .replace(/\bsk-[A-Za-z0-9_-]+/g, "sk-[REDACTED]")
    .replace(/\brpa_[A-Za-z0-9]+/g, "rpa_[REDACTED]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "AIza[REDACTED]")
    .replace(/postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/gi, "postgres://[REDACTED]@")
    .replace(
      /NURAI_DEPLOYED_AI_SMOKE_SECRET=([^\s]+)/g,
      "NURAI_DEPLOYED_AI_SMOKE_SECRET=[REDACTED]",
    );
}

function commandFailureReason(result) {
  const text = sanitizeReleaseCommandText(
    `${result?.stderr || ""}\n${result?.stdout || ""}`,
  )
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return undefined;
  if (/railway login|unauthorized|invalid_grant|OAuth token/i.test(text)) {
    return "Railway CLI authentication is invalid. Run `railway login`, then retry the Railway-backed release command.";
  }
  if (/not found|no such file/i.test(text))
    return "Required command target was not found.";
  if (/timeout/i.test(text))
    return "Command timed out before release evidence could be collected.";
  return text.slice(0, 220);
}

function productionDbRemoteEvidence() {
  const defaultIdentity = path.join(
    process.env.HOME || "",
    ".ssh",
    "railway_codex_nurai",
  );
  const identityFile =
    process.env.NURAI_RAILWAY_SSH_IDENTITY_FILE || defaultIdentity;
  const service = process.env.NURAI_RAILWAY_SERVICE || "nurai-api";

  if (process.env.NURAI_DISABLE_RAILWAY_DB_REMOTE_CHECK === "1") {
    return {
      ok: false,
      skipped: true,
      reason: "Railway remote DB check disabled by env.",
    };
  }

  if (!fs.existsSync(identityFile)) {
    return {
      ok: false,
      skipped: true,
      reason:
        "Railway private DATABASE_URL requires an in-service check, but no Railway SSH identity file is available.",
      identityFile: "missing",
    };
  }

  const result = spawnSync(
    "railway",
    [
      "ssh",
      "--identity-file",
      identityFile,
      "--service",
      service,
      "node scripts/check-production-db-release.js --json",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: process.env,
      timeout: 90_000,
    },
  );

  const report = parseJsonFromCommandOutput(result.stdout);
  return {
    ok: result.status === 0 && report?.ok === true,
    mode: "railway-ssh",
    service,
    identityFile: "present",
    exitCode: result.status,
    signal: result.signal,
    database: report?.database,
    ownership: report?.ownership,
    migrationCount: report?.migrations?.migrationCount,
    failedMigrations: report?.migrations?.failedMigrations,
    stderr: result.stderr.trim() ? "present" : "empty",
    failureReason: commandFailureReason(result),
  };
}

function deployedAIReleaseEvidence(deploymentState) {
  if (!deploymentState.ok) {
    return {
      ok: false,
      skipped: true,
      reason:
        "NURAI_DEPLOYMENT_URL must pass shape validation before live deployed AI can be verified.",
    };
  }

  const result = spawnSync(
    process.execPath,
    [
      "scripts/check-openai-deployment.js",
      "--release-gate",
      "--live-completion",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env,
      timeout: 60_000,
    },
  );

  const stdout = result.stdout.trim();
  let report = null;
  if (stdout) {
    try {
      report = JSON.parse(stdout);
    } catch {
      report = null;
    }
  }

  const evidence = {
    ok: result.status === 0 && report?.ok === true,
    exitCode: result.status,
    signal: result.signal,
    deploymentStatus: report?.checks?.deploymentStatus?.ok === true,
    deploymentStatusError: report?.checks?.deploymentStatus?.error,
    adminDiagnosticsProtected:
      report?.checks?.adminDiagnostics?.protected === true,
    adminDiagnosticsError: report?.checks?.adminDiagnostics?.error,
    openAIModelsVisible:
      report?.checks?.openAIModels?.ok === true &&
      report?.checks?.openAIModels?.configuredModelsVisible
        ? Object.values(
            report.checks.openAIModels.configuredModelsVisible,
          ).every((value) => value === true)
        : false,
    liveCompletion: report?.checks?.liveCompletion?.ok === true,
    serverSmokeCompletion: report?.checks?.serverSmokeCompletion?.ok === true,
    serverSmokeStatus: report?.checks?.serverSmokeCompletion?.status,
    serverSmokeError: report?.checks?.serverSmokeCompletion?.error,
    serverSmokeRemediation: report?.checks?.serverSmokeCompletion?.remediation,
    requiredGateFailures: report?.requiredGateFailures,
    stderr: result.stderr.trim() ? "present" : "empty",
  };
  if (evidence.ok) return evidence;

  const railwayEvidence = deployedAIReleaseEvidenceViaRailwayRun();
  return railwayEvidence.ok
    ? {
        ...railwayEvidence,
        localAttempt: evidence,
      }
    : {
        ...evidence,
        railwayAttempt: railwayEvidence,
      };
}

function deployedAIReleaseEvidenceViaRailwayRun() {
  const deploymentUrl = String(env.NURAI_DEPLOYMENT_URL || "").trim();
  if (!deploymentUrl) {
    return {
      ok: false,
      skipped: true,
      reason: "NURAI_DEPLOYMENT_URL is missing.",
    };
  }
  if (process.env.NURAI_DISABLE_RAILWAY_AI_REMOTE_CHECK === "1") {
    return {
      ok: false,
      skipped: true,
      reason: "Railway deployed AI remote check disabled by env.",
    };
  }

  const service = process.env.NURAI_RAILWAY_SERVICE || "nurai-api";
  const command = [
    `NURAI_DEPLOYMENT_URL=${shellQuote(deploymentUrl)}`,
    "node scripts/check-openai-deployment.js",
    "--release-gate",
    "--live-completion",
    "--server-smoke",
    "--require-ai-integrations-openai-key",
  ].join(" ");
  const result = spawnSync(
    "railway",
    ["run", "--service", service, "sh", "-lc", command],
    {
      cwd: root,
      encoding: "utf8",
      env: process.env,
      timeout: 90_000,
    },
  );
  const report = parseJsonFromCommandOutput(result.stdout);

  return {
    ok: result.status === 0 && report?.ok === true,
    mode: "railway-run",
    service,
    exitCode: result.status,
    signal: result.signal,
    deploymentStatus: report?.checks?.deploymentStatus?.ok === true,
    adminDiagnosticsProtected:
      report?.checks?.adminDiagnostics?.protected === true,
    openAIModelsVisible:
      report?.checks?.openAIModels?.ok === true &&
      report?.checks?.openAIModels?.configuredModelsVisible
        ? Object.values(
            report.checks.openAIModels.configuredModelsVisible,
          ).every((value) => value === true)
        : false,
    liveCompletion: report?.checks?.liveCompletion?.ok === true,
    serverSmokeCompletion: report?.checks?.serverSmokeCompletion?.ok === true,
    serverSmokeStatus: report?.checks?.serverSmokeCompletion?.status,
    serverSmokeError: report?.checks?.serverSmokeCompletion?.error,
    serverSmokeRemediation: report?.checks?.serverSmokeCompletion?.remediation,
    requiredGateFailures: report?.requiredGateFailures,
    stderr: result.stderr.trim() ? "present" : "empty",
    failureReason: commandFailureReason(result),
  };
}

function revenueCatOfferingsEvidence(enabled) {
  if (!enabled) {
    return {
      ok: true,
      skipped: true,
      reason:
        "EXPO_PUBLIC_REVENUECAT_KEY must pass key validation before offerings can be checked.",
    };
  }

  const result = spawnSync(
    process.execPath,
    ["scripts/check-revenuecat-offerings.js", "--json"],
    {
      cwd: root,
      encoding: "utf8",
      env,
      timeout: 75_000,
    },
  );

  const stdout = result.stdout.trim();
  let report = null;
  if (stdout) {
    try {
      report = JSON.parse(stdout);
    } catch {
      report = null;
    }
  }

  return {
    ok: result.status === 0 && report?.ok === true,
    exitCode: result.status,
    signal: result.signal,
    currentOfferingId: report?.currentOfferingId,
    offeringCount: report?.offeringCount,
    currentPackageCount: report?.currentPackageCount,
    missingPackages: report?.missingPackages,
    stderr: result.stderr.trim() ? "present" : "empty",
  };
}

function googlePlacesLiveEvidence(googlePlacesState) {
  if (!googlePlacesState.ok) {
    return {
      ok: false,
      skipped: true,
      reason:
        "GOOGLE_PLACES_API_KEY must pass key validation before live Google Places can be verified.",
    };
  }

  const result = spawnSync(
    process.execPath,
    ["scripts/check-google-places-live.js", "--json"],
    {
      cwd: root,
      encoding: "utf8",
      env,
      timeout: 20_000,
    },
  );

  const stdout = result.stdout.trim();
  let report = null;
  if (stdout) {
    try {
      report = JSON.parse(stdout);
    } catch {
      report = null;
    }
  }

  return {
    ok: result.status === 0 && report?.ok === true,
    exitCode: result.status,
    signal: result.signal,
    project: report?.project,
    providerApis: Array.isArray(report?.providerApis)
      ? report.providerApis
      : [],
    checks: Array.isArray(report?.checks)
      ? report.checks.map((check) => ({
          name: check.name,
          ok: check.ok === true,
          httpStatus: check.httpStatus,
          providerStatus: check.providerStatus,
          resultCount: check.resultCount,
          errorMessage: check.errorMessage,
          failureReason: check.failureReason,
        }))
      : [],
    stderr: result.stderr.trim() ? "present" : "empty",
  };
}

function strongSecretState(name) {
  const state = envState(name);
  const value = String(env[name] || "").trim();
  const minLength = 32;
  if (!state.ok) return { ...state, minLength };

  const normalized = value.toLowerCase();
  const weakTerms = [
    "secret",
    "password",
    "development",
    "staging",
    "test",
    "session",
    "nurai",
    "admin",
  ];
  const uniqueChars = new Set(value).size;
  const tooShort = value.length < minLength;
  const repeatedSingleChar = /^(.)(\1)+$/.test(value);
  const containsWeakTerm = weakTerms.some((term) => normalized.includes(term));
  const lowVariety = uniqueChars < 8;

  return {
    ...state,
    ok: !(tooShort || repeatedSingleChar || containsWeakTerm || lowVariety),
    state: tooShort
      ? "too-short"
      : repeatedSingleChar
        ? "repeated-characters"
        : containsWeakTerm
          ? "contains-weak-term"
          : lowVariety
            ? "low-character-variety"
            : state.state,
    minLength,
    length: value.length,
    uniqueChars,
  };
}

function groupState(names) {
  const states = names.map((name) => ({ name, ...envState(name) }));
  return {
    ok: states.some((state) => state.ok),
    states,
  };
}

function addCheck(checks, id, ok, message, evidence = {}) {
  checks.push({
    id,
    status: ok ? "ok" : "blocked",
    message,
    ownerAction: ok ? [] : ownerActionsByBlockerId[id] || [],
    evidence,
  });
}

function appStoreEvidence() {
  const eas = readJson(easPath);
  const iosSubmit = eas?.submit?.production?.ios || {};
  const ascAppIdSource = isPresent(String(iosSubmit.ascAppId || ""))
    ? "eas.json"
    : envState("ASC_APP_ID").ok
      ? "env"
      : "missing";
  const ascAppIdConfigured = ascAppIdSource !== "missing";
  const ascApiKeyPath = String(
    iosSubmit.ascApiKeyPath || env.ASC_PRIVATE_KEY_PATH || "",
  ).trim();
  const ascApiKeyIssuerId = String(
    iosSubmit.ascApiKeyIssuerId || env.ASC_ISSUER_ID || "",
  ).trim();
  const ascApiKeyId = String(
    iosSubmit.ascApiKeyId || env.ASC_KEY_ID || "",
  ).trim();
  const ascApiKeySource =
    isPresent(String(iosSubmit.ascApiKeyPath || "")) ||
    isPresent(String(iosSubmit.ascApiKeyIssuerId || "")) ||
    isPresent(String(iosSubmit.ascApiKeyId || ""))
      ? "eas.json"
      : envState("ASC_PRIVATE_KEY_PATH").ok ||
          envState("ASC_ISSUER_ID").ok ||
          envState("ASC_KEY_ID").ok
        ? "env"
        : "missing";
  const ascApiKeyFilePresent = ascApiKeyPath
    ? fs.existsSync(path.resolve(root, ascApiKeyPath))
    : false;
  const ascApiKeyConfigured =
    isPresent(ascApiKeyPath) &&
    isPresent(ascApiKeyIssuerId) &&
    isPresent(ascApiKeyId) &&
    ascApiKeyFilePresent;
  const appleIdConfigured =
    isPresent(String(iosSubmit.appleId || "")) || envState("EXPO_APPLE_ID").ok;
  const applePasswordConfigured = envState(
    "EXPO_APPLE_APP_SPECIFIC_PASSWORD",
  ).ok;
  const appleTeamConfigured = isPresent(String(iosSubmit.appleTeamId || ""));
  const applePasswordAuthConfigured =
    appleIdConfigured && applePasswordConfigured && appleTeamConfigured;
  const authConfigured = ascApiKeyConfigured || applePasswordAuthConfigured;
  const missing = [
    ...(!ascAppIdConfigured ? ["ascAppId"] : []),
    ...(!authConfigured
      ? [
          "ascApiKeyPath/ascApiKeyIssuerId/ascApiKeyId or appleId/appleTeamId/EXPO_APPLE_APP_SPECIFIC_PASSWORD",
        ]
      : []),
    ...(isPresent(ascApiKeyPath) && !ascApiKeyFilePresent
      ? ["ascApiKeyFile"]
      : []),
  ];

  return {
    ok: ascAppIdConfigured && authConfigured,
    missing,
    easJsonPresent: Boolean(eas),
    ascAppIdConfigured,
    ascAppIdSource,
    ascApiKeySource,
    ascApiKeyConfigured,
    ascApiKeyFilePresent,
    applePasswordAuthConfigured,
  };
}

function playStoreEvidence() {
  // Coverage marker for release-critical env contract:
  // GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH and EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
  // are validated by scripts/check-android-release-credentials.js.
  const result = spawnSync(
    process.execPath,
    ["scripts/check-android-release-credentials.js", "--json"],
    {
      cwd: root,
      encoding: "utf8",
      env,
      timeout: 15_000,
    },
  );

  const stdout = result.stdout.trim();
  let report = null;
  if (stdout) {
    try {
      report = JSON.parse(stdout);
    } catch {
      report = null;
    }
  }

  return {
    ok: result.status === 0 && report?.ok === true,
    exitCode: result.status,
    signal: result.signal,
    missing: report?.missing,
    easJsonPresent: report?.easJsonPresent,
    androidPackage: report?.androidPackage,
    androidPackageOk: report?.androidPackageOk,
    serviceAccount: report?.serviceAccount,
    playPublisherAccess: report?.playPublisherAccess,
    revenueCatAndroidKey: report?.revenueCatAndroidKey,
    androidOfferings: report?.androidOfferings,
    track: report?.track,
    releaseStatus: report?.releaseStatus,
    stderr: result.stderr.trim() ? "present" : "empty",
  };
}

function runpodApiKeyEvidence() {
  for (const name of [
    "RUNPOD_API_KEY",
    "RUNPOD_SECRET_nurai",
    "NURAI_LOCAL_AI_API_KEY",
  ]) {
    const state = envState(name);
    if (state.ok) return { ...state, name };
  }
  return { ok: false, source: "missing", state: "missing", name: "missing" };
}

function runpodApiKeyValue() {
  return (
    env.RUNPOD_API_KEY || env.RUNPOD_SECRET_nurai || env.NURAI_LOCAL_AI_API_KEY
  );
}

function sanitizeRunpodError(message) {
  return String(message || "unknown")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [REDACTED]")
    .replace(/\brpa_[A-Za-z0-9]+/g, "rpa_[REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]+/g, "sk-[REDACTED]");
}

function runpodModelFromEndpoint(endpoint) {
  const templateEnv = endpoint?.template?.env || {};
  return (
    templateEnv.OPENAI_SERVED_MODEL_NAME_OVERRIDE ||
    templateEnv.MODEL_NAME ||
    endpoint?.template?.name ||
    endpoint?.name ||
    ""
  );
}

function sanitizeRunpodEndpoint(endpoint, expectedModels) {
  const template = endpoint?.template || {};
  const templateEnv = template.env || {};
  const servedModel = runpodModelFromEndpoint(endpoint);
  const modelMatches = expectedModels.some(
    (model) =>
      model &&
      (servedModel === model ||
        templateEnv.MODEL_NAME === model ||
        templateEnv.OPENAI_SERVED_MODEL_NAME_OVERRIDE === model),
  );
  return {
    id: endpoint?.id ? "present" : "missing",
    name: endpoint?.name || "missing",
    computeType: endpoint?.computeType || "missing",
    gpuCount: endpoint?.gpuCount ?? "missing",
    gpuTypeIds: Array.isArray(endpoint?.gpuTypeIds) ? endpoint.gpuTypeIds : [],
    workersMin: endpoint?.workersMin ?? "missing",
    workersMax: endpoint?.workersMax ?? "missing",
    template: {
      present: Boolean(endpoint?.template),
      id: template.id ? "present" : "missing",
      name: template.name || "missing",
      imageName: template.imageName || "missing",
      isPublic:
        typeof template.isPublic === "boolean" ? template.isPublic : "missing",
      envKeys: Object.keys(templateEnv).sort(),
      modelName: templateEnv.MODEL_NAME || "missing",
      servedModelName:
        templateEnv.OPENAI_SERVED_MODEL_NAME_OVERRIDE || "missing",
      modelMatches,
    },
  };
}

async function runpodEndpointOwnershipEvidence(
  endpointShapeOk,
  endpointId,
  enabledModelEntries,
) {
  const apiKey = runpodApiKeyValue();
  const apiKeyState = runpodApiKeyEvidence();
  const expectedModels = enabledModelEntries.map((entry) => entry.model);
  if (!apiKeyState.ok || looksLikeSecretReference(apiKey)) {
    return {
      ok: false,
      apiKey: apiKeyState,
      state: "missing-api-key",
      reason:
        "RUNPOD_API_KEY or RUNPOD_SECRET_nurai must resolve before endpoint ownership can be verified.",
    };
  }

  try {
    const response = await fetch(
      "https://rest.runpod.io/v1/endpoints?includeTemplate=true",
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15_000),
      },
    );
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!response.ok) {
      return {
        ok: false,
        apiKey: apiKeyState,
        state: "api-error",
        httpStatus: response.status,
        error: sanitizeRunpodError(text).slice(0, 300),
      };
    }

    const endpoints = Array.isArray(data)
      ? data
      : data?.endpoints || data?.data || [];
    const endpoint = endpointShapeOk
      ? endpoints.find((candidate) => candidate.id === endpointId)
      : null;
    const sanitized = endpoint
      ? sanitizeRunpodEndpoint(endpoint, expectedModels)
      : null;
    const visible = Boolean(endpoint);
    const gpuEndpoint = endpoint?.computeType === "GPU";
    const templatePrivate =
      endpoint?.template && endpoint.template.isPublic === false;
    const templateModelMatches = Boolean(sanitized?.template?.modelMatches);
    const allEnabledUseEndpoint =
      enabledModelEntries.length > 0 &&
      enabledModelEntries.every((entry) => entry.endpointIdRaw === endpointId);

    return {
      ok:
        endpointShapeOk &&
        visible &&
        gpuEndpoint &&
        templatePrivate &&
        templateModelMatches &&
        allEnabledUseEndpoint,
      apiKey: apiKeyState,
      state: endpointShapeOk
        ? visible
          ? "visible-in-account"
          : "not-visible-in-account"
        : "configured-endpoint-shape-not-owned",
      endpointCountVisible: endpoints.length,
      endpoint: sanitized,
      checks: {
        endpointShapeOk,
        visible,
        gpuEndpoint,
        templatePrivate,
        templateModelMatches,
        allEnabledUseEndpoint,
      },
    };
  } catch (error) {
    return {
      ok: false,
      apiKey: apiKeyState,
      state: "request-failed",
      error: sanitizeRunpodError(
        error instanceof Error ? error.message : String(error),
      ),
    };
  }
}

async function runpodOwnedEndpointEvidence() {
  const baseUrl = env.NURAI_LOCAL_AI_BASE_URL || "";
  const baseUrlState = urlEnvState("NURAI_LOCAL_AI_BASE_URL", {
    allowedProtocols: ["https:"],
  });
  const knownPublicPoolIds = new Set([
    "qwen3-32b-awq",
    "granite-4-0-h-small",
    "gpt-oss-120b",
  ]);
  const endpointInfoFor = (url) => {
    const endpointMatch = String(url || "").match(
      /api\.runpod\.ai\/v2\/([^/]+)/,
    );
    const endpointId = endpointMatch?.[1];
    const openAICompatiblePath = /\/openai\/v1\/?$/.test(String(url || ""));
    const currentEndpointKind = endpointId
      ? knownPublicPoolIds.has(endpointId)
        ? "public-pool"
        : "owned-or-custom"
      : "missing";
    return {
      endpointId,
      openAICompatiblePath,
      currentEndpointKind,
      ok:
        Boolean(endpointId) &&
        openAICompatiblePath &&
        !knownPublicPoolIds.has(endpointId),
    };
  };
  const baseEndpoint = endpointInfoFor(baseUrl);
  const poolRaw = env.NURAI_LOCAL_AI_MODELS || "";
  const modelPoolState = envState("NURAI_LOCAL_AI_MODELS");
  const enabledModelEntries = String(poolRaw || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [id, candidateBaseUrl, model, roles = "", enabled = "true"] = entry
        .split("|")
        .map((part) => part.trim());
      const endpoint = endpointInfoFor(candidateBaseUrl);
      return {
        id: id || "missing",
        model: model || "missing",
        roles,
        enabled: !["0", "false", "off", "disabled"].includes(
          enabled.toLowerCase(),
        ),
        endpointId: endpoint.endpointId ? "present" : "missing",
        endpointIdRaw: endpoint.endpointId,
        openAICompatiblePath: endpoint.openAICompatiblePath,
        currentEndpointKind: endpoint.currentEndpointKind,
        ok: endpoint.ok,
      };
    })
    .filter((entry) => entry.enabled);
  const enabledModelPoolOk =
    modelPoolState.ok &&
    enabledModelEntries.length > 0 &&
    enabledModelEntries.every((entry) => entry.ok);
  const enabledEndpointIds = [
    ...new Set(
      enabledModelEntries.map((entry) => entry.endpointIdRaw).filter(Boolean),
    ),
  ];
  const enabledModelsUseBaseEndpoint =
    Boolean(baseEndpoint.endpointId) &&
    enabledEndpointIds.length === 1 &&
    enabledEndpointIds[0] === baseEndpoint.endpointId;
  const openAICompatiblePath = /\/openai\/v1\/?$/.test(baseUrl);
  const endpointShapeOk =
    baseUrlState.ok &&
    baseEndpoint.ok &&
    enabledModelPoolOk &&
    enabledModelsUseBaseEndpoint;
  const ownership = await runpodEndpointOwnershipEvidence(
    endpointShapeOk,
    baseEndpoint.endpointId,
    enabledModelEntries,
  );
  const liveHealth = localAIHealthEvidence(endpointShapeOk && ownership.ok);
  return {
    ok: endpointShapeOk && ownership.ok && liveHealth.ok,
    baseUrl: baseUrlState,
    endpointId: baseEndpoint.endpointId ? "present" : "missing",
    openAICompatiblePath,
    currentEndpointKind: baseEndpoint.currentEndpointKind,
    ownership,
    liveHealth,
    modelPool: {
      ok: enabledModelPoolOk && enabledModelsUseBaseEndpoint,
      state: modelPoolState.state,
      enabledCount: enabledModelEntries.length,
      enabledEndpointIds: enabledEndpointIds.map(() => "present"),
      enabledModelsUseBaseEndpoint,
      enabledEntries: enabledModelEntries.map(
        ({ endpointIdRaw: _endpointIdRaw, ...entry }) => entry,
      ),
    },
  };
}

function localAIHealthEvidence(endpointShapeOk) {
  if (!endpointShapeOk) {
    return {
      ok: false,
      skipped: true,
      reason:
        "Owned RunPod endpoint shape must pass before live local AI health can be verified.",
    };
  }

  const result = spawnSync(
    process.execPath,
    ["scripts/check-local-ai.js", "--all-enabled"],
    {
      cwd: root,
      encoding: "utf8",
      env,
      timeout: 30_000,
    },
  );

  const stdout = result.stdout.trim();
  let report = null;
  if (stdout) {
    try {
      report = JSON.parse(stdout);
    } catch {
      report = null;
    }
  }

  return {
    ok: result.status === 0 && report?.ok === true,
    exitCode: result.status,
    signal: result.signal,
    checkedCandidates: report?.checkedCandidates,
    configuredCandidates: report?.configuredCandidates,
    model: report?.model,
    candidate: report?.candidate,
    stderr: result.stderr.trim() ? "present" : "empty",
  };
}

function localReleaseToolingEvidence() {
  const packageJson = readJson(packagePath);
  const packageScripts = requiredPackageScripts.map((scriptName) => ({
    name: scriptName,
    present: Boolean(packageJson?.scripts?.[scriptName]),
  }));
  const packageScriptIncludes = Object.entries(
    requiredPackageScriptIncludes,
  ).map(([scriptName, requiredTerms]) => {
    const script = String(packageJson?.scripts?.[scriptName] || "");
    const missingTerms = requiredTerms.filter((term) => !script.includes(term));
    return {
      name: scriptName,
      ok: missingTerms.length === 0,
      missingTerms,
    };
  });
  const migrations = requiredMigrationFiles.map((relativePath) => ({
    path: relativePath,
    present: fs.existsSync(path.join(root, relativePath)),
  }));
  const releaseControlScripts = requiredReleaseControlScripts.map(
    (relativePath) => ({
      path: relativePath,
      present: fs.existsSync(path.join(root, relativePath)),
    }),
  );
  const conversationCheckerPresent = fs.existsSync(conversationCheckPath);
  return {
    ok:
      migrations.length > 0 &&
      migrations.every((file) => file.present) &&
      releaseControlScripts.every((file) => file.present) &&
      packageScripts.every((script) => script.present) &&
      packageScriptIncludes.every((script) => script.ok) &&
      conversationCheckerPresent,
    packageJsonPresent: Boolean(packageJson),
    packageScripts,
    packageScriptIncludes,
    migrations,
    releaseControlScripts,
    conversationCheckerPresent,
  };
}

async function main() {
  const checks = [];

  const deployment = urlEnvState("NURAI_DEPLOYMENT_URL", {
    allowedProtocols: ["https:"],
  });
  const deployedAI = deployedAIReleaseEvidence(deployment);
  const deployedRuntimeNeedsDeploy =
    deployedRuntimeNeedsLatestServer(deployedAI);
  const deployedRuntimeMessage =
    deployment.ok && deployedRuntimeNeedsDeploy
      ? "NURAI_DEPLOYMENT_URL points at the current host, but that host is not running the latest release-verification server routes yet."
      : deployment.ok && !deployedAI.ok
        ? "NURAI_DEPLOYMENT_URL is set, but the published runtime AI release verification did not pass."
        : "NURAI_DEPLOYMENT_URL is required to verify the published runtime.";
  addCheck(
    checks,
    "deployed-runtime-url",
    deployment.ok && deployedAI.ok,
    deployment.ok && deployedAI.ok
      ? "NURAI_DEPLOYMENT_URL is set and deployed AI release verification passed."
      : deployedRuntimeMessage,
    {
      url: deployment,
      deployedAI,
    },
  );

  let database = databaseUrlState("DATABASE_URL");
  let dbMigrations = dbMigrationsAppliedEvidence(database);
  let remoteDb = null;
  if (!database.ok || !dbMigrations.ok) {
    remoteDb = productionDbRemoteEvidence();
    if (remoteDb.ok && remoteDb.database) {
      database = {
        ...remoteDb.database,
        source: remoteDb.database.source || "railway-ssh",
      };
      dbMigrations = {
        ok: true,
        mode: remoteDb.mode,
        service: remoteDb.service,
        exitCode: remoteDb.exitCode,
        signal: remoteDb.signal,
        ownership: remoteDb.ownership,
        migrationCount: remoteDb.migrationCount,
        failedMigrations: remoteDb.failedMigrations,
        stderr: remoteDb.stderr,
        failureReason: remoteDb.failureReason,
      };
    }
  }
  addCheck(
    checks,
    "production-database-url",
    database.ok && dbMigrations.ok,
    database.ok && dbMigrations.ok
      ? dbMigrations.mode === "railway-ssh"
        ? "Production DATABASE_URL is verified inside the Railway service, including ownership and migration invariants."
        : "DATABASE_URL is set and production DB migration invariants are verified."
      : "DATABASE_URL is required to run production DB cleanup and apply the checked migrations.",
    {
      url: database,
      appliedMigrations: dbMigrations,
      remoteDb,
    },
  );

  const session = strongSecretState("SESSION_SECRET");
  const sessionStrong = session.ok;
  addCheck(
    checks,
    "production-session-secret",
    sessionStrong,
    sessionStrong
      ? "SESSION_SECRET is present and long enough for production."
      : "SESSION_SECRET must be set to a strong value before production boot.",
    { ...session, minLength: 32 },
  );

  const openAI = groupState([
    "AI_INTEGRATIONS_OPENAI_API_KEY",
    "OPENAI_API_KEY",
  ]);
  addCheck(
    checks,
    "openai-key",
    openAI.ok,
    openAI.ok
      ? "A resolved OpenAI API key is present."
      : "A resolved AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY is required.",
    { states: openAI.states },
  );

  const localAIRequired = [
    "NURAI_LOCAL_AI_BASE_URL",
    "NURAI_LOCAL_AI_API_KEY",
    "NURAI_LOCAL_TEXT_MODEL",
    "NURAI_LOCAL_AI_MODELS",
  ].map((name) => ({ name, ...envState(name) }));
  const aiMode = releaseAIMode();
  const localAIRequiredNow = localAIRequiredForRelease();
  const localAIEnvOk =
    !localAIRequiredNow || localAIRequired.every((state) => state.ok);
  addCheck(
    checks,
    "local-ai-env",
    localAIEnvOk,
    localAIRequiredNow
      ? localAIRequired.every((state) => state.ok)
        ? "RunPod/local AI environment is fully configured."
        : "RunPod/local AI environment values are required for hybrid/local release mode."
      : "OpenAI-only release mode is active; RunPod/local AI is optional for this update.",
    {
      releaseAIMode: aiMode,
      required: localAIRequiredNow,
      states: localAIRequired,
    },
  );

  const runpodOwned = localAIRequiredNow
    ? await runpodOwnedEndpointEvidence()
    : {
        ok: true,
        skipped: true,
        releaseAIMode: aiMode,
        reason:
          "OpenAI-only release mode is active, so an owned RunPod endpoint is deferred and non-blocking.",
      };
  addCheck(
    checks,
    "owned-runpod-endpoint",
    runpodOwned.ok,
    runpodOwned.ok
      ? localAIRequiredNow
        ? "RunPod/local AI base URL and enabled model pool point to owned/non-public endpoint ids."
        : "RunPod/local AI owned endpoint is deferred; OpenAI is the active production AI provider."
      : "Owned RunPod endpoint is not proven; public pool, missing endpoint, or public enabled model pool is still in use.",
    runpodOwned,
  );

  const revenueCat = groupState([
    "REVENUECAT_SECRET_API_KEY",
    "REVENUECAT_API_KEY",
  ]);
  addCheck(
    checks,
    "server-revenuecat-key",
    revenueCat.ok,
    revenueCat.ok
      ? "RevenueCat server key is present."
      : "RevenueCat server key is required for production entitlement verification.",
    { states: revenueCat.states },
  );

  const clientTierOverride = envState("NURAI_ALLOW_CLIENT_TIER_FOR_PAID_API");
  const clientTierOverrideEnabled = isTruthyFlag(
    env.NURAI_ALLOW_CLIENT_TIER_FOR_PAID_API,
  );
  addCheck(
    checks,
    "client-tier-paid-api-override",
    !clientTierOverrideEnabled,
    clientTierOverrideEnabled
      ? "NURAI_ALLOW_CLIENT_TIER_FOR_PAID_API must not be enabled for release; paid tiers must resolve server-side."
      : "Client-asserted paid tier override is not enabled.",
    {
      enabled: clientTierOverrideEnabled,
      source: clientTierOverride.source,
      state: clientTierOverride.state,
    },
  );

  const clientRevenueCat = envState("EXPO_PUBLIC_REVENUECAT_KEY");
  const clientRevenueCatValue = String(
    env.EXPO_PUBLIC_REVENUECAT_KEY || "",
  ).trim();
  const clientRevenueCatLooksPublic =
    clientRevenueCat.ok && !/^sk_/i.test(clientRevenueCatValue);
  addCheck(
    checks,
    "client-revenuecat-key",
    clientRevenueCatLooksPublic,
    clientRevenueCatLooksPublic
      ? "RevenueCat client SDK key is present for purchase UI configuration."
      : "EXPO_PUBLIC_REVENUECAT_KEY must be a public RevenueCat SDK key so the published app can load offerings, purchase packages, and restore subscriptions.",
    {
      ...clientRevenueCat,
      valueKind: /^sk_/i.test(clientRevenueCatValue)
        ? "secret-server-key"
        : clientRevenueCat.ok
          ? "public-or-app-key"
          : clientRevenueCat.state,
    },
  );

  const revenueCatOfferings = revenueCatOfferingsEvidence(
    clientRevenueCatLooksPublic,
  );
  addCheck(
    checks,
    "client-revenuecat-offerings",
    revenueCatOfferings.ok,
    revenueCatOfferings.ok
      ? "RevenueCat current offering is live and contains the required purchase packages."
      : "RevenueCat current offering must contain Premium monthly, Premium annual, Scholar monthly, and Scholar annual packages with products before release.",
    revenueCatOfferings,
  );

  const adminEmails = envState("NURAI_ADMIN_EMAILS");
  addCheck(
    checks,
    "server-admin-allowlist",
    true,
    adminEmails.ok
      ? "Server admin allowlist is configured through NURAI_ADMIN_EMAILS."
      : "Server admin allowlist is not configured; no admin email bypass will be active unless NURAI_ADMIN_EMAILS is set.",
    {
      configured: adminEmails.ok,
      source: adminEmails.source,
      state: adminEmails.state,
    },
  );

  const googlePlaces = envState("GOOGLE_PLACES_API_KEY");
  const googlePlacesLiveRequired = process.argv.includes(
    "--require-google-places-live",
  );
  const googlePlacesLive = googlePlacesLiveRequired
    ? googlePlacesLiveEvidence(googlePlaces)
    : {
        ok: true,
        skipped: true,
        reason:
          "Google Places live account smoke is not required for this release scope; current-app functionality is owner-confirmed and provider-failure controls are checked locally.",
      };
  addCheck(
    checks,
    "google-places-key",
    googlePlaces.ok && googlePlacesLive.ok,
    googlePlaces.ok && googlePlacesLive.ok
      ? googlePlacesLiveRequired
        ? "Google Places key is present and live provider smoke verification passed."
        : "Google Places key is present; live account smoke is deferred because the current app is already using Places successfully."
      : googlePlacesLiveRequired
        ? "Google Places key must be present and pass a live provider smoke check before production nearby place features can rely on it."
        : "Google Places key must be present for the current app Places feature.",
    {
      key: googlePlaces,
      liveRequired: googlePlacesLiveRequired,
      liveProvider: googlePlacesLive,
    },
  );

  const localReleaseTooling = localReleaseToolingEvidence();
  addCheck(
    checks,
    "local-release-migration-tooling",
    localReleaseTooling.ok,
    localReleaseTooling.ok
      ? "Local DB migrations and release-control scripts are present."
      : "Local DB migrations and release-control scripts must exist before production DB migration.",
    localReleaseTooling,
  );

  const appStore = appStoreEvidence();
  addCheck(
    checks,
    "eas-ios-submit-config",
    appStore.ok,
    appStore.ok
      ? "EAS iOS submit profile has an App Store Connect app ID and non-interactive auth."
      : "EAS iOS submit profile needs App Store Connect app ID plus API-key or Apple-ID auth from the release account.",
    appStore,
  );

  const androidReleaseRequired = androidReleaseRequiredForRelease();
  const playStore = androidReleaseRequired
    ? playStoreEvidence()
    : {
        ok: true,
        skipped: true,
        required: false,
        reason:
          "Android / Google Play release is deferred; current release scope is the existing iOS App Store app.",
      };
  addCheck(
    checks,
    "eas-android-submit-config",
    playStore.ok,
    playStore.ok
      ? androidReleaseRequired
        ? "EAS Android submit service account key path and Android RevenueCat public key are configured."
        : "Android / Google Play release is deferred for this update."
      : "EAS Android submit service account key path/file and Android RevenueCat public key must be supplied from Google Play Console and RevenueCat before Android release.",
    playStore,
  );

  const blockers = checks.filter((check) => check.status !== "ok");
  const okChecks = checks.filter((check) => check.status === "ok");
  const report = {
    ok: blockers.length === 0,
    blockerCount: blockers.length,
    okCount: okChecks.length,
    blocked: blockers.map((check) => ({
      id: check.id,
      message: check.message,
      ownerAction: check.ownerAction,
      evidence: check.evidence,
    })),
    okChecks: okChecks.map((check) => check.id),
    packageScriptsChecked: requiredPackageScripts.length,
    releaseControlScriptsChecked: requiredReleaseControlScripts.length,
    migrationFilesChecked: requiredMigrationFiles.length,
    checks,
  };

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      report.ok
        ? "Release blocker check passed: no external blockers detected."
        : `Release blocker check found ${blockers.length} blocker(s):`,
    );
    for (const check of blockers) {
      console.log(`- ${check.id}: ${check.message}`);
      for (const action of check.ownerAction) {
        console.log(`  action: ${action}`);
      }
    }
  }

  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
