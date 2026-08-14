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

function rejectIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (text.includes(snippet)) {
      findings.push(
        `${relativePath}: must not include ${JSON.stringify(snippet)}`,
      );
    }
  }
}

function main() {
  const findings = [];
  let schemaText = "";
  let migrationText = "";
  let rateLimitText = "";

  try {
    schemaText = read("shared/schema.ts");
    migrationText = read("migrations/0003_ai_rate_limit_buckets.sql");
    rateLimitText = read("server/ai/rateLimit.ts");
  } catch (error) {
    findings.push(error instanceof Error ? error.message : String(error));
  }

  requireIncludes(
    schemaText,
    "shared/schema.ts",
    [
      "rateLimitBuckets = pgTable",
      '"rate_limit_buckets"',
      'uniqueIndex("rate_limit_buckets_namespace_subject_idx")',
      'index("rate_limit_buckets_reset_at_idx")',
    ],
    findings,
  );
  requireIncludes(
    migrationText,
    "migrations/0003_ai_rate_limit_buckets.sql",
    [
      "CREATE TABLE IF NOT EXISTS rate_limit_buckets",
      "namespace text NOT NULL",
      "subject_key text NOT NULL",
      "request_count integer NOT NULL DEFAULT 0",
      "CREATE UNIQUE INDEX IF NOT EXISTS rate_limit_buckets_namespace_subject_idx",
      "CREATE INDEX IF NOT EXISTS rate_limit_buckets_reset_at_idx",
    ],
    findings,
  );
  requireIncludes(
    rateLimitText,
    "server/ai/rateLimit.ts",
    [
      "RATE_LIMIT_BUCKET_PRUNE_INTERVAL_MS",
      "export class PostgresAIRateLimiter",
      "await this.pruneExpiredBucketsIfDue(nowMs)",
      "ON CONFLICT (namespace, subject_key)",
      "rate_limit_buckets.request_count + 1",
      'console.warn("[rate-limit] expired bucket prune failed"',
      "export const durableRateLimiter",
      "export const durableAITextRateLimiter = durableRateLimiter",
    ],
    findings,
  );

  const durableRouteChecks = [
    {
      file: "server/auth.ts",
      required: [
        "durableRateLimiter",
        "await durableRateLimiter.check",
        "async function enforceRateLimit",
        "await enforceRateLimit(req, res)",
        "await enforceRateLimit(req, res, USERNAME_CHECK_RATE_LIMIT_POLICY)",
      ],
    },
    {
      file: "server/family.ts",
      required: [
        "durableRateLimiter",
        "await durableRateLimiter.check",
        "async function enforceFamilySearchRateLimit",
        "await enforceFamilySearchRateLimit(req, res)",
      ],
    },
    {
      file: "server/places.ts",
      required: [
        "durableRateLimiter",
        "await durableRateLimiter.check",
        "async function enforcePlacesRateLimit",
        "await enforcePlacesRateLimit(req, res)",
      ],
    },
    {
      file: "server/nasheeds.ts",
      required: [
        "durableRateLimiter",
        "await durableRateLimiter.check",
        "async function enforceNasheedRateLimit",
        "await enforceNasheedRateLimit(req, res)",
      ],
    },
    {
      file: "server/ai/httpControls.ts",
      required: [
        "durableAITextRateLimiter",
        "await durableAITextRateLimiter.check",
      ],
    },
  ];

  for (const check of durableRouteChecks) {
    let text = "";
    try {
      text = read(check.file);
    } catch (error) {
      findings.push(error instanceof Error ? error.message : String(error));
      continue;
    }
    requireIncludes(text, check.file, check.required, findings);
    rejectIncludes(
      text,
      check.file,
      [
        "aiRateLimiter.check(",
        "if (!enforceRateLimit(",
        "if (!enforcePlacesRateLimit(",
        "if (!enforceFamilySearchRateLimit(",
      ],
      findings,
    );
  }

  if (findings.length) {
    console.error("Rate-limit control check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Rate-limit control check passed: auth, family search, Places, and AI short-window limits use durable Postgres buckets.",
  );
}

main();
