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

  const webhookText = read("server/revenuecatWebhook.ts");
  const subscriptionText = read("server/subscriptions.ts");
  const routesText = read("server/routes.ts");
  const manifestText = read("scripts/check-server-route-manifest.js");
  const envContractText = read("scripts/check-env-contract.js");
  const runbookText = read("docs/release/PRODUCTION_RELEASE_RUNBOOK.md");
  const threatModelText = read("NurAI-Muslim-threat-model.md");

  requireIncludes(
    webhookText,
    "server/revenuecatWebhook.ts",
    [
      "REVENUECAT_WEBHOOK_AUTHORIZATION",
      "createHash",
      "timingSafeEqual",
      "refreshRevenueCatEntitlement",
      "revenueCatServerKeyConfigured",
      'app.post("/api/webhooks/revenuecat"',
      'req.get("authorization")',
      "candidateAppUserIds",
      "transferred_to",
      "transferred_from",
      "updatedUsers",
      "skippedUsers",
      "Promise.all",
    ],
    findings,
  );
  requireRegex(
    webhookText,
    "server/revenuecatWebhook.ts",
    [
      ["auth failure status", /res\.status\(401\)\.json/],
      ["missing config status", /res\.status\(503\)\.json/],
      ["RevenueCat-compatible success status", /res\.status\(200\)\.json/],
      ["candidate id length cap", /MAX_APP_USER_ID_LENGTH\s*=\s*256/],
      ["candidate id count cap", /MAX_APP_USER_IDS_PER_WEBHOOK\s*=\s*12/],
    ],
    findings,
  );
  if (webhookText.includes("req.session")) {
    findings.push(
      "server/revenuecatWebhook.ts: webhook auth must use the RevenueCat Authorization header, not user sessions.",
    );
  }
  if (webhookText.includes("tiers:")) {
    findings.push(
      "server/revenuecatWebhook.ts: webhook responses must not echo entitlement tier details.",
    );
  }

  requireIncludes(
    subscriptionText,
    "server/subscriptions.ts",
    [
      "export function revenueCatServerKeyConfigured",
      "export async function refreshRevenueCatEntitlement",
      "forceRefresh",
      "allowStaleOnFailure",
      "users.id",
      "return fetchRevenueCatTier(normalizedAppUserId, {",
      "allowStaleOnFailure: false",
    ],
    findings,
  );

  requireIncludes(
    routesText,
    "server/routes.ts",
    [
      'import { registerRevenueCatWebhookRoutes } from "./revenuecatWebhook"',
      "registerRevenueCatWebhookRoutes(app)",
    ],
    findings,
  );
  requireIncludes(
    manifestText,
    "scripts/check-server-route-manifest.js",
    [
      'file: "server/revenuecatWebhook.ts"',
      'exportName: "registerRevenueCatWebhookRoutes"',
      '["post", "/api/webhooks/revenuecat"]',
    ],
    findings,
  );
  requireIncludes(
    envContractText,
    "scripts/check-env-contract.js",
    ["REVENUECAT_WEBHOOK_AUTHORIZATION"],
    findings,
  );
  requireIncludes(
    runbookText,
    "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
    [
      "REVENUECAT_WEBHOOK_AUTHORIZATION",
      "/api/webhooks/revenuecat",
      "RevenueCat webhook",
    ],
    findings,
  );
  requireIncludes(
    threatModelText,
    "NurAI-Muslim-threat-model.md",
    [
      "/api/webhooks/revenuecat",
      "authenticated RevenueCat webhook",
      "npm run check:revenuecat-webhook-controls",
    ],
    findings,
  );
  if (threatModelText.includes("future signed webhook")) {
    findings.push(
      "NurAI-Muslim-threat-model.md: RevenueCat residual risk should describe the authenticated webhook now built, not a future signed webhook.",
    );
  }

  if (findings.length) {
    console.error("RevenueCat webhook-control check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "RevenueCat webhook-control check passed: authenticated webhook, force-refresh sync, route manifest, env contract, and docs verified.",
  );
}

main();
