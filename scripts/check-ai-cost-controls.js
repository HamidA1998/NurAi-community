#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

const routeControls = [
  {
    file: path.join("server", "replit_integrations", "chat", "routes.ts"),
    checks: [
      "enforceDailyAIQuota",
      "CHAT_DAILY_AI_LIMITS",
      "await enforceAITextRateLimit",
      "generateAITextWithUsageLogging",
    ],
  },
  {
    file: path.join("server", "replit_integrations", "audio", "routes.ts"),
    checks: [
      "enforceDailyAIQuota",
      "CONTEXTUAL_DAILY_AI_LIMITS",
      'namespace: "ai:tts"',
      "await enforceAITextRateLimit",
      "generateAITextWithUsageLogging",
      "textToSpeech",
      "speechToText",
    ],
  },
  {
    file: path.join(
      "server",
      "replit_integrations",
      "nurai-context",
      "routes.ts",
    ),
    checks: [
      "enforceDailyAIQuota",
      "CONTEXTUAL_DAILY_AI_LIMITS",
      "await enforceAITextRateLimit",
      "generateAITextWithUsageLogging",
    ],
  },
  {
    file: path.join("server", "replit_integrations", "tafsir", "routes.ts"),
    checks: [
      'requirePaidAPI("tafsir", "scholar")',
      "enforcePaidAIFeatureQuota",
      "CONTEXTUAL_DAILY_AI_LIMITS",
      "TAFSIR_MONTHLY_AI_LIMITS",
      'featureKey: "tafsir"',
      "monthly_limit_reached",
      "await enforceAITextRateLimit",
      "generateAITextWithUsageLogging",
    ],
  },
  {
    file: path.join("server", "replit_integrations", "image", "routes.ts"),
    checks: [
      'requirePaidAPI("imageGeneration")',
      "enforcePaidAIFeatureQuota",
      "IMAGE_DAILY_AI_LIMITS",
      "IMAGE_MONTHLY_AI_LIMITS",
      'namespace: "ai:image"',
      'featureKey: "image"',
      "monthly_limit_reached",
      "await enforceAITextRateLimit",
      "ALLOWED_IMAGE_SIZES",
      "cleanPrompt.length >",
    ],
  },
];

const durableRateLimitControls = [
  {
    file: path.join("shared", "schema.ts"),
    checks: [
      "rateLimitBuckets = pgTable",
      '"rate_limit_buckets"',
      "rateLimitBuckets",
      "requestCount: integer",
      'uniqueIndex("rate_limit_buckets_namespace_subject_idx")',
      'index("rate_limit_buckets_reset_at_idx")',
    ],
  },
  {
    file: path.join("migrations", "0003_ai_rate_limit_buckets.sql"),
    checks: [
      "CREATE TABLE IF NOT EXISTS rate_limit_buckets",
      "namespace text NOT NULL",
      "subject_key text NOT NULL",
      "request_count integer NOT NULL DEFAULT 0",
      "CREATE UNIQUE INDEX IF NOT EXISTS rate_limit_buckets_namespace_subject_idx",
      "CREATE INDEX IF NOT EXISTS rate_limit_buckets_reset_at_idx",
    ],
  },
  {
    file: path.join("server", "ai", "rateLimit.ts"),
    checks: [
      "export class PostgresAIRateLimiter",
      "RATE_LIMIT_BUCKET_PRUNE_INTERVAL_MS",
      "await this.pruneExpiredBucketsIfDue(nowMs)",
      "ON CONFLICT (namespace, subject_key)",
      "rate_limit_buckets.request_count + 1",
      "DELETE FROM rate_limit_buckets",
      "export const durableAITextRateLimiter",
    ],
  },
  {
    file: path.join("server", "ai", "httpControls.ts"),
    checks: [
      "durableAITextRateLimiter",
      "await durableAITextRateLimiter.check",
      "Promise<AIRateLimitDecision | null>",
    ],
  },
  {
    file: path.join("shared", "schema.ts"),
    checks: [
      "aiFeatureUsage = pgTable",
      '"ai_feature_usage"',
      "usageCount: integer",
      'uniqueIndex("ai_feature_usage_user_feature_period_idx")',
      'index("ai_feature_usage_period_idx")',
    ],
  },
  {
    file: path.join("migrations", "0005_ai_feature_usage_monthly_quotas.sql"),
    checks: [
      "CREATE TABLE IF NOT EXISTS ai_feature_usage",
      "feature_key text NOT NULL",
      "period_key text NOT NULL",
      "usage_count integer NOT NULL DEFAULT 0",
      "CREATE UNIQUE INDEX IF NOT EXISTS ai_feature_usage_user_feature_period_idx",
      "CREATE INDEX IF NOT EXISTS ai_feature_usage_period_idx",
    ],
  },
  {
    file: path.join("server", "ai", "featureQuota.ts"),
    checks: [
      "TAFSIR_MONTHLY_AI_LIMITS",
      "IMAGE_MONTHLY_AI_LIMITS",
      "AI_FEATURE_USAGE_RETENTION_MONTHS",
      "enforcePaidAIFeatureQuota",
      "BEGIN",
      "ROLLBACK",
      "COMMIT",
      "INSERT INTO ai_feature_usage",
      "WHERE ai_feature_usage.usage_count <",
      "X-AI-MonthlyLimit-Remaining",
    ],
  },
];

function main() {
  const findings = [];

  for (const route of routeControls) {
    const filePath = path.join(root, route.file);
    if (!fs.existsSync(filePath)) {
      findings.push(`${route.file}: missing file`);
      continue;
    }

    const text = fs.readFileSync(filePath, "utf8");
    for (const requiredText of route.checks) {
      if (!text.includes(requiredText)) {
        findings.push(`${route.file}: missing ${JSON.stringify(requiredText)}`);
      }
    }
  }

  for (const control of durableRateLimitControls) {
    const filePath = path.join(root, control.file);
    if (!fs.existsSync(filePath)) {
      findings.push(`${control.file}: missing file`);
      continue;
    }

    const text = fs.readFileSync(filePath, "utf8");
    for (const requiredText of control.checks) {
      if (!text.includes(requiredText)) {
        findings.push(
          `${control.file}: missing ${JSON.stringify(requiredText)}`,
        );
      }
    }
  }

  if (findings.length > 0) {
    console.error("AI cost-control check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    `AI cost-control check passed: ${routeControls.length} high-cost route files and durable rate-limit controls verified.`,
  );
}

main();
