#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const expectedMigrationFiles = [
  "0001_conversation_ownership.sql",
  "0002_community_profile_ownership.sql",
  "0003_ai_rate_limit_buckets.sql",
  "0004_subscription_entitlement_cache.sql",
  "0005_ai_feature_usage_monthly_quotas.sql",
  "0006_family_audit_events.sql",
  "0007_library_source_review_events.sql",
  "0008_family_members_unique.sql",
  "0009_message_ai_metadata.sql",
  "0010_nurai_migration_audit.sql",
  "0011_family_circle_collaboration.sql",
  "0012_nasheed_tracks.sql",
  "0013_smart_notifications.sql",
  "0014_family_messages_table_repair.sql",
  "0015_family_messages_created_at_repair.sql",
  "0016_family_creator_membership_backfill.sql",
  "0017_community_social_safety.sql",
  "0018_user_profile_photo.sql",
  "0019_community_daily_circles.sql",
  "0020_community_rooms_dedupe.sql",
  "0021_family_messages_sender_name_repair.sql",
  "0022_community_private_message_media.sql",
  "0023_community_private_post_feedback.sql",
  "0024_family_places_check_ins.sql",
];

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

function firstExecutableSql(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("--");
    })
    .join("\n")
    .trim();
}

function checkMigrationPlan(findings) {
  const migrationsDir = path.join(root, "migrations");
  if (!fs.existsSync(migrationsDir)) {
    findings.push("migrations/: missing directory");
    return;
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => /^\d{4}_[a-z0-9_]+\.sql$/i.test(file))
    .sort();

  if (migrationFiles.join("\n") !== expectedMigrationFiles.join("\n")) {
    findings.push(
      `migrations/: expected ${expectedMigrationFiles.join(", ")} but found ${migrationFiles.join(", ")}`,
    );
  }

  for (const file of migrationFiles) {
    const relativePath = `migrations/${file}`;
    const sql = read(relativePath);
    const trimmed = sql.trim();
    const executable = firstExecutableSql(sql);
    const upperSql = trimmed.toUpperCase();
    if (!/^BEGIN;\s/i.test(executable)) {
      findings.push(`${relativePath}: migration must start with BEGIN;`);
    }
    if (!/COMMIT;\s*$/i.test(trimmed)) {
      findings.push(`${relativePath}: migration must end with COMMIT;`);
    }
    if (!/Release note:/i.test(sql)) {
      findings.push(`${relativePath}: migration must include a release note.`);
    }
    const auditedEmptyPrototypeReplacement =
      file === "0017_community_social_safety.sql" &&
      /confirmed empty[\s\S]*DROP TABLE community_connections/i.test(sql);
    if (
      /\b(DROP\s+TABLE|TRUNCATE\s+TABLE)\b/i.test(sql) &&
      !auditedEmptyPrototypeReplacement
    ) {
      findings.push(`${relativePath}: destructive table operation is blocked.`);
    }
    if (/\bALTER\s+TABLE\b[\s\S]*?\bDROP\s+(COLUMN|CONSTRAINT)\b/i.test(sql)) {
      findings.push(
        `${relativePath}: destructive ALTER TABLE DROP is blocked.`,
      );
    }
    if (/\bCREATE\s+TABLE\b(?!\s+IF\s+NOT\s+EXISTS\b)/i.test(sql)) {
      findings.push(
        `${relativePath}: CREATE TABLE must use IF NOT EXISTS for repeat-safe release runs.`,
      );
    }
    if (
      /\bCREATE\s+(?:UNIQUE\s+)?INDEX\b(?!\s+IF\s+NOT\s+EXISTS\b)/i.test(sql)
    ) {
      findings.push(
        `${relativePath}: CREATE INDEX must use IF NOT EXISTS for repeat-safe release runs.`,
      );
    }
    if (/\bADD\s+COLUMN\b(?!\s+IF\s+NOT\s+EXISTS\b)/i.test(sql)) {
      findings.push(
        `${relativePath}: ADD COLUMN must use IF NOT EXISTS for repeat-safe release runs.`,
      );
    }
    if (
      /\bDELETE\s+FROM\b/i.test(sql) &&
      !/privacy|orphan|duplicate|release note/i.test(sql)
    ) {
      findings.push(
        `${relativePath}: DELETE migrations need an explicit release-note safety rationale.`,
      );
    }
    if (upperSql.includes("CREATE INDEX CONCURRENTLY")) {
      findings.push(
        `${relativePath}: CREATE INDEX CONCURRENTLY cannot run inside the migration transaction wrapper.`,
      );
    }
  }
}

function main() {
  const findings = [];
  let schemaText = "";
  let chatModelText = "";
  let migrationText = "";
  let messageMetadataMigrationText = "";
  let checkerText = "";
  let proofPlanText = "";
  let packageText = "";
  let chatStorageText = "";
  let chatRoutesText = "";
  let audioRoutesText = "";

  try {
    schemaText = read("shared/schema.ts");
    chatModelText = read("shared/models/chat.ts");
    migrationText = read("migrations/0001_conversation_ownership.sql");
    messageMetadataMigrationText = read(
      "migrations/0009_message_ai_metadata.sql",
    );
    checkerText = read("scripts/check-conversation-ownership.js");
    proofPlanText = read("scripts/check-production-db-proof-plan.js");
    packageText = read("package.json");
    chatStorageText = read("server/replit_integrations/chat/storage.ts");
    chatRoutesText = read("server/replit_integrations/chat/routes.ts");
    audioRoutesText = read("server/replit_integrations/audio/routes.ts");
  } catch (error) {
    findings.push(error instanceof Error ? error.message : String(error));
  }

  requireRegex(
    schemaText,
    "shared/schema.ts",
    [
      [
        "conversations.userId is non-null",
        /userId:\s*varchar\("user_id"\)\s*\n\s*\.notNull\(\)/,
      ],
      [
        "conversations.userId cascades to users",
        /\.references\(\(\)\s*=>\s*users\.id,\s*\{\s*onDelete:\s*"cascade"\s*\}\)/,
      ],
      [
        "messages.conversationId cascades to conversations",
        /conversationId:\s*integer\("conversation_id"\)\s*\n\s*\.notNull\(\)\s*\n\s*\.references\(\(\)\s*=>\s*conversations\.id,\s*\{\s*onDelete:\s*"cascade"\s*\}\)/,
      ],
      [
        "messages.metadata is non-null jsonb",
        /metadata:\s*jsonb\("metadata"\)\s*\n\s*\.default\(sql`'\{\}'::jsonb`\)\s*\n\s*\.notNull\(\)/,
      ],
    ],
    findings,
  );

  requireIncludes(
    chatModelText,
    "shared/models/chat.ts",
    [
      'from "../schema"',
      "conversations",
      "messages",
      "InsertConversation",
      "InsertMessage",
    ],
    findings,
  );
  if (chatModelText.includes('pgTable("conversations"')) {
    findings.push(
      "shared/models/chat.ts must not redeclare chat tables; it must re-export the canonical shared/schema.ts definitions.",
    );
  }

  requireIncludes(
    migrationText,
    "migrations/0001_conversation_ownership.sql",
    [
      "DELETE FROM messages",
      "DELETE FROM conversations",
      "WHERE conversations.user_id IS NULL OR users.id IS NULL",
      "ALTER COLUMN user_id SET NOT NULL",
      "ADD CONSTRAINT conversations_user_id_users_id_fk",
      "REFERENCES users(id)",
      "ON DELETE CASCADE",
      "CREATE INDEX IF NOT EXISTS conversations_user_id_created_at_idx",
    ],
    findings,
  );

  requireIncludes(
    messageMetadataMigrationText,
    "migrations/0009_message_ai_metadata.sql",
    [
      "ALTER TABLE messages",
      "ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb",
    ],
    findings,
  );

  requireIncludes(
    checkerText,
    "scripts/check-conversation-ownership.js",
    [
      "DATABASE_URL must be set to check conversation ownership.",
      "null_owner_count",
      "missing_user_count",
      "DELETE FROM messages",
      "DELETE FROM conversations",
      "information_schema.columns",
      "userIdNullable",
      "shouldFix",
      "Conversation ownership check failed. Run with --fix before applying the non-null migration.",
    ],
    findings,
  );

  requireIncludes(
    proofPlanText,
    "scripts/check-production-db-proof-plan.js",
    [
      "docs/audit/PRODUCTION_DB_PROOF_PLAN.md",
      "shouldWrite",
      "shouldCheck",
      "renderMarkdown",
      "Never commit, screenshot, log, paste, or attach the real `DATABASE_URL`",
      "migration hash and command plan only",
      "Run npm run export:production-db-proof-plan",
    ],
    findings,
  );
  requireIncludes(
    packageText,
    "package.json",
    [
      '"export:production-db-proof-plan": "node scripts/check-production-db-proof-plan.js --write"',
      '"check:production-db-proof-plan-artifact": "node scripts/check-production-db-proof-plan.js --check --json"',
    ],
    findings,
  );

  requireIncludes(
    chatStorageText,
    "server/replit_integrations/chat/storage.ts",
    [
      'import { conversations, messages } from "@shared/schema"',
      "eq(conversations.userId, userId)",
      ".values({ userId, title })",
      "metadata: Record<string, unknown> = {}",
      ".values({ conversationId, role, content, metadata })",
      "getConversation(conversationId, userId)",
      "deleteConversation(id: number, userId: string)",
    ],
    findings,
  );
  requireRegex(
    chatStorageText,
    "server/replit_integrations/chat/storage.ts",
    [
      [
        "deleteConversation verifies caller owns the conversation before delete",
        /async\s+deleteConversation\(id:\s*number,\s*userId:\s*string\)\s*\{[\s\S]*?const\s+conversation\s*=\s*await\s+this\.getConversation\(id,\s*userId\);[\s\S]*?if\s*\(!conversation\)\s*return\s+false;/,
      ],
    ],
    findings,
  );

  requireIncludes(
    chatRoutesText,
    "server/replit_integrations/chat/routes.ts",
    [
      'import { aiMessageMetadata } from "./messageMetadata"',
      "aiMessageMetadata({ completion, structuredExtras })",
    ],
    findings,
  );

  requireIncludes(
    audioRoutesText,
    "server/replit_integrations/audio/routes.ts",
    [
      'import { aiMessageMetadata } from "../chat/messageMetadata"',
      "aiMessageMetadata({ completion, structuredExtras })",
      "citations: structuredExtras.citations",
    ],
    findings,
  );

  try {
    checkMigrationPlan(findings);
  } catch (error) {
    findings.push(error instanceof Error ? error.message : String(error));
  }

  if (findings.length) {
    console.error("DB release-control check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "DB release-control check passed: canonical chat schema, production migration plan safety, ownership migration, AI message metadata migration, cleanup checker, and chat storage ownership/source-metadata guards verified.",
  );
}

main();
