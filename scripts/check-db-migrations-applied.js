#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const pg = require("pg");
const { inspectDatabaseUrl } = require("./lib/production-db-target");

const { Pool } = pg;
const root = process.cwd();
const migrationsDir = path.join(root, "migrations");

const REQUIRED_MIGRATIONS = [
  {
    id: "0001_conversation_ownership",
    description: "Conversation ownership is non-null, indexed, and FK-backed.",
    checks: [
      {
        type: "column",
        table: "conversations",
        column: "user_id",
        nullable: false,
      },
      {
        type: "constraint",
        name: "conversations_user_id_users_id_fk",
      },
      { type: "index", name: "conversations_user_id_created_at_idx" },
      { type: "queryZero", name: "conversation_orphans" },
    ],
  },
  {
    id: "0002_community_profile_ownership",
    description:
      "Community profiles have explicit authenticated user ownership.",
    checks: [
      {
        type: "column",
        table: "community_profiles",
        column: "user_id",
        nullable: false,
      },
      {
        type: "constraint",
        name: "community_profiles_user_id_users_id_fk",
      },
      { type: "index", name: "community_profiles_user_id_idx" },
      { type: "queryZero", name: "community_profile_orphans" },
    ],
  },
  {
    id: "0003_ai_rate_limit_buckets",
    description: "Durable short-window rate-limit buckets are present.",
    checks: [
      { type: "table", table: "rate_limit_buckets" },
      { type: "index", name: "rate_limit_buckets_namespace_subject_idx" },
      { type: "index", name: "rate_limit_buckets_reset_at_idx" },
    ],
  },
  {
    id: "0004_subscription_entitlement_cache",
    description: "Server-owned subscription entitlement cache is present.",
    checks: [
      { type: "table", table: "subscription_entitlements" },
      { type: "column", table: "subscription_entitlements", column: "tier" },
      {
        type: "column",
        table: "subscription_entitlements",
        column: "cache_expires_at",
      },
      {
        type: "column",
        table: "subscription_entitlements",
        column: "stale_until_at",
      },
    ],
  },
  {
    id: "0005_ai_feature_usage_monthly_quotas",
    description: "Monthly paid AI feature quota table and indexes are present.",
    checks: [
      { type: "table", table: "ai_feature_usage" },
      { type: "index", name: "ai_feature_usage_user_feature_period_idx" },
      { type: "index", name: "ai_feature_usage_period_idx" },
    ],
  },
  {
    id: "0006_family_audit_events",
    description: "Durable family audit events table and indexes are present.",
    checks: [
      { type: "table", table: "family_audit_events" },
      { type: "column", table: "family_audit_events", column: "actor_id" },
      { type: "column", table: "family_audit_events", column: "metadata" },
      { type: "index", name: "family_audit_events_group_created_idx" },
      { type: "index", name: "family_audit_events_actor_created_idx" },
      { type: "index", name: "family_audit_events_invitation_idx" },
    ],
  },
  {
    id: "0007_library_source_review_events",
    description:
      "Library Source QA audit events table and indexes are present.",
    checks: [
      { type: "table", table: "library_source_review_events" },
      {
        type: "column",
        table: "library_source_review_events",
        column: "reviewer_id",
      },
      {
        type: "column",
        table: "library_source_review_events",
        column: "source_fingerprint",
      },
      {
        type: "index",
        name: "library_source_review_events_chapter_created_idx",
      },
      {
        type: "index",
        name: "library_source_review_events_reviewer_created_idx",
      },
      {
        type: "index",
        name: "library_source_review_events_fingerprint_idx",
      },
    ],
  },
  {
    id: "0008_family_members_unique",
    description: "Family memberships are unique per group and user.",
    checks: [
      { type: "index", name: "family_members_group_user_idx" },
      { type: "queryZero", name: "duplicate_family_memberships" },
    ],
  },
  {
    id: "0009_message_ai_metadata",
    description: "Saved chat messages preserve AI source/review metadata.",
    checks: [
      {
        type: "column",
        table: "messages",
        column: "metadata",
        nullable: false,
      },
    ],
  },
  {
    id: "0010_nurai_migration_audit",
    description: "Release migrations are recorded with file hashes.",
    checks: [
      { type: "table", table: "nurai_migration_audit" },
      { type: "index", name: "nurai_migration_audit_applied_at_idx" },
    ],
  },
  {
    id: "0011_family_circle_collaboration",
    description:
      "Family Circle messages and shared progress tables are present.",
    checks: [
      { type: "table", table: "family_messages" },
      { type: "column", table: "family_messages", column: "kind" },
      { type: "column", table: "family_messages", column: "content" },
      { type: "column", table: "family_messages", column: "metadata" },
      { type: "index", name: "family_messages_group_created_idx" },
      { type: "index", name: "family_messages_sender_created_idx" },
      { type: "table", table: "family_progress_events" },
      { type: "index", name: "family_progress_events_group_created_idx" },
      { type: "index", name: "family_progress_events_user_created_idx" },
      { type: "index", name: "family_progress_events_group_category_idx" },
    ],
  },
  {
    id: "0012_nasheed_tracks",
    description:
      "Server-backed owned/licensed nasheed catalogue table is present.",
    checks: [
      { type: "table", table: "nasheed_tracks" },
      { type: "column", table: "nasheed_tracks", column: "audio_url" },
      { type: "column", table: "nasheed_tracks", column: "is_active" },
      { type: "index", name: "nasheed_tracks_slug_idx" },
      { type: "index", name: "nasheed_tracks_active_sort_idx" },
      { type: "index", name: "nasheed_tracks_category_idx" },
    ],
  },
  {
    id: "0013_smart_notifications",
    description:
      "Server-side push token registry and Smart NurAI notification events are present.",
    checks: [
      { type: "table", table: "notification_push_tokens" },
      { type: "index", name: "notification_push_tokens_user_token_idx" },
      { type: "index", name: "notification_push_tokens_user_enabled_idx" },
      { type: "table", table: "smart_notification_events" },
      { type: "index", name: "smart_notification_events_user_kind_date_idx" },
      { type: "index", name: "smart_notification_events_status_created_idx" },
    ],
  },
  {
    id: "0014_family_messages_table_repair",
    description:
      "Older Family Circle message tables are upgraded to the current server contract.",
    checks: [
      {
        type: "column",
        table: "family_messages",
        column: "content",
        nullable: false,
      },
      {
        type: "column",
        table: "family_messages",
        column: "kind",
        nullable: false,
      },
      {
        type: "column",
        table: "family_messages",
        column: "metadata",
        nullable: false,
      },
      { type: "index", name: "family_messages_group_created_idx" },
      { type: "index", name: "family_messages_sender_created_idx" },
    ],
  },
  {
    id: "0015_family_messages_created_at_repair",
    description:
      "Older Family Circle message tables have the timestamp needed by the message API.",
    checks: [
      {
        type: "column",
        table: "family_messages",
        column: "created_at",
        nullable: false,
      },
      { type: "index", name: "family_messages_group_created_idx" },
      { type: "index", name: "family_messages_sender_created_idx" },
    ],
  },
  {
    id: "0016_family_creator_membership_backfill",
    description:
      "Every Family Circle creator has an active membership for message access.",
    checks: [{ type: "queryZero", name: "missing_family_creator_memberships" }],
  },
  {
    id: "0017_community_social_safety",
    description:
      "Community discovery, same-audience connections, direct messages, blocking, and moderation safeguards are present.",
    checks: [
      { type: "column", table: "community_profiles", column: "bio" },
      {
        type: "column",
        table: "community_profiles",
        column: "discoverable_by_username",
        nullable: false,
      },
      {
        type: "column",
        table: "community_profiles",
        column: "discoverable_by_email",
        nullable: false,
      },
      {
        type: "column",
        table: "community_profiles",
        column: "allow_connection_requests",
        nullable: false,
      },
      { type: "table", table: "community_connections" },
      { type: "index", name: "community_connections_one_status_idx" },
      { type: "index", name: "community_connections_two_status_idx" },
      { type: "table", table: "community_blocks" },
      { type: "index", name: "community_blocks_blocked_idx" },
      { type: "table", table: "community_conversations" },
      {
        type: "index",
        name: "community_conversations_one_recent_idx",
      },
      {
        type: "index",
        name: "community_conversations_two_recent_idx",
      },
      { type: "table", table: "community_direct_messages" },
      {
        type: "index",
        name: "community_direct_messages_conversation_created_idx",
      },
      { type: "table", table: "community_reports" },
      { type: "index", name: "community_reports_status_created_idx" },
      { type: "trigger", name: "community_profiles_audience_immutable" },
      { type: "trigger", name: "community_posts_same_audience" },
      { type: "trigger", name: "community_replies_same_audience" },
      { type: "trigger", name: "community_connections_same_audience" },
      { type: "trigger", name: "community_blocks_same_audience" },
      { type: "trigger", name: "community_conversations_same_audience" },
      { type: "trigger", name: "community_direct_messages_sender_guard" },
    ],
  },
  {
    id: "0018_user_profile_photo",
    description:
      "Optional private profile-photo field on users, validated at upload.",
    checks: [{ type: "column", table: "users", column: "profile_photo" }],
  },
  {
    id: "0019_community_daily_circles",
    description:
      "Daily Circles: same-audience groups with a one-check-in-per-day feed.",
    checks: [
      { type: "table", table: "community_circles" },
      { type: "index", name: "community_circles_invite_code_idx" },
      { type: "table", table: "community_circle_members" },
      { type: "index", name: "community_circle_members_profile_idx" },
      { type: "table", table: "community_circle_checkins" },
      { type: "index", name: "community_circle_checkins_circle_date_idx" },
      { type: "trigger", name: "community_circles_audience_immutable" },
      { type: "trigger", name: "community_circle_members_same_audience" },
      { type: "trigger", name: "community_circle_checkins_membership_guard" },
    ],
  },
  {
    id: "0020_community_rooms_dedupe",
    description:
      "Dedupes double-seeded community boards and adds a unique board-name constraint.",
    checks: [{ type: "constraint", name: "community_rooms_name_unique" }],
  },
  {
    id: "0021_family_messages_sender_name_repair",
    description:
      "Relaxes the legacy NOT NULL family_messages.sender_name column so message inserts succeed.",
    checks: [
      {
        type: "column",
        table: "family_messages",
        column: "sender_name",
        nullable: true,
      },
    ],
  },
  {
    id: "0022_community_private_message_media",
    description:
      "Private direct-message JPEG media is ownership-linked and bounded.",
    checks: [
      { type: "table", table: "community_direct_message_media" },
      {
        type: "index",
        name: "community_direct_message_media_message_idx",
      },
      { type: "index", name: "community_direct_message_media_owner_idx" },
    ],
  },
  {
    id: "0023_community_private_post_feedback",
    description:
      "Per-member show-less feedback remains private and unique per post.",
    checks: [
      { type: "table", table: "community_post_feedback" },
      {
        type: "index",
        name: "community_post_feedback_post_profile_idx",
      },
    ],
  },
  {
    id: "0024_family_places_check_ins",
    description:
      "Family Circle places and current, consented check-ins are migration-backed without a location history.",
    checks: [
      { type: "table", table: "family_places" },
      { type: "index", name: "family_places_group_created_idx" },
      { type: "index", name: "family_places_creator_idx" },
      { type: "table", table: "family_check_ins" },
      { type: "index", name: "family_check_ins_group_user_idx" },
      { type: "index", name: "family_check_ins_group_updated_idx" },
      { type: "index", name: "family_check_ins_expires_idx" },
    ],
  },
];

const QUERY_ZERO_CHECKS = {
  conversation_orphans: `
    SELECT COUNT(*)::int AS count
    FROM conversations
    LEFT JOIN users ON users.id = conversations.user_id
    WHERE conversations.user_id IS NULL OR users.id IS NULL
  `,
  community_profile_orphans: `
    SELECT COUNT(*)::int AS count
    FROM community_profiles
    LEFT JOIN users ON users.id = community_profiles.user_id
    WHERE community_profiles.user_id IS NULL OR users.id IS NULL
  `,
  duplicate_family_memberships: `
    SELECT COUNT(*)::int AS count
    FROM (
      SELECT group_id, user_id
      FROM family_members
      GROUP BY group_id, user_id
      HAVING COUNT(*) > 1
    ) duplicates
  `,
  missing_family_creator_memberships: `
    SELECT COUNT(*)::int AS count
    FROM family_groups
    LEFT JOIN family_members
      ON family_members.group_id = family_groups.id
      AND family_members.user_id = family_groups.creator_id
    WHERE family_members.id IS NULL
  `,
};

function hasJsonFlag() {
  return process.argv.includes("--json");
}

function parseEnvValue(raw) {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath))
    return { fileEnv: {}, assignedFromFile: new Set() };
  const fileEnv = {};
  const assignedFromFile = new Set();

  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = line.slice(0, equalsIndex).trim();
    const value = parseEnvValue(line.slice(equalsIndex + 1));
    fileEnv[key] = value;
    if (process.env[key] === undefined) {
      process.env[key] = value;
      assignedFromFile.add(key);
    }
  }

  return { fileEnv, assignedFromFile };
}

function envSource(fileEnv, assignedFromFile, key) {
  if (process.env[key] === undefined) return "missing";
  if (assignedFromFile.has(key)) return ".env.local";
  if (fileEnv[key] !== undefined && process.env[key] === fileEnv[key]) {
    return ".env.local";
  }
  return "process";
}

function migrationFiles() {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => /^\d{4}_[a-z0-9_]+\.sql$/i.test(file))
    .sort()
    .map((file) => {
      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, "utf8");
      return {
        id: file.replace(/\.sql$/i, ""),
        file: path.relative(root, fullPath),
        bytes: Buffer.byteLength(sql, "utf8"),
        sha256: crypto.createHash("sha256").update(sql).digest("hex"),
      };
    });
}

async function scalar(client, text, values = []) {
  const result = await client.query(text, values);
  return result.rows[0];
}

async function checkTable(client, table) {
  const row = await scalar(client, "SELECT to_regclass($1) AS regclass", [
    table,
  ]);
  return Boolean(row?.regclass);
}

async function checkIndex(client, name) {
  const row = await scalar(client, "SELECT to_regclass($1) AS regclass", [
    name,
  ]);
  return Boolean(row?.regclass);
}

async function checkConstraint(client, name) {
  const row = await scalar(
    client,
    `
      SELECT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = $1
      ) AS exists
    `,
    [name],
  );
  return Boolean(row?.exists);
}

async function checkTrigger(client, name) {
  const row = await scalar(
    client,
    `
      SELECT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = $1
          AND NOT tgisinternal
      ) AS exists
    `,
    [name],
  );
  return Boolean(row?.exists);
}

async function checkColumn(client, table, column, nullable) {
  const row = await scalar(
    client,
    `
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    [table, column],
  );

  if (!row) return false;
  if (typeof nullable === "boolean") {
    return nullable ? row.is_nullable === "YES" : row.is_nullable === "NO";
  }
  return true;
}

async function checkQueryZero(client, name) {
  const sql = QUERY_ZERO_CHECKS[name];
  if (!sql) return false;
  const row = await scalar(client, sql);
  return Number(row?.count || 0) === 0;
}

async function runCheck(client, check) {
  if (check.type === "table") {
    return checkTable(client, check.table);
  }
  if (check.type === "index") {
    return checkIndex(client, check.name);
  }
  if (check.type === "constraint") {
    return checkConstraint(client, check.name);
  }
  if (check.type === "trigger") {
    return checkTrigger(client, check.name);
  }
  if (check.type === "column") {
    return checkColumn(client, check.table, check.column, check.nullable);
  }
  if (check.type === "queryZero") {
    return checkQueryZero(client, check.name);
  }
  return false;
}

async function checkMigrationAudit(client) {
  const expectedFiles = migrationFiles();
  const tablePresent = await checkTable(client, "nurai_migration_audit");
  if (!tablePresent) {
    return {
      ok: false,
      tablePresent,
      expectedCount: expectedFiles.length,
      rows: [],
    };
  }

  const rows = [];
  for (const file of expectedFiles) {
    const row = await scalar(
      client,
      `
        SELECT migration_id, file_path, file_sha256, file_bytes, script_version, applied_at
        FROM "nurai_migration_audit"
        WHERE migration_id = $1
        LIMIT 1
      `,
      [file.id],
    );
    const ok =
      row?.file_path === file.file &&
      row?.file_sha256 === file.sha256 &&
      Number(row?.file_bytes) === file.bytes &&
      Boolean(row?.applied_at);
    rows.push({
      id: file.id,
      file: file.file,
      ok,
      rowPresent: Boolean(row),
      hashMatches: row?.file_sha256 === file.sha256,
      bytesMatch: Number(row?.file_bytes) === file.bytes,
      pathMatches: row?.file_path === file.file,
      scriptVersion: row?.script_version || "missing",
      appliedAt: row?.applied_at ? "present" : "missing",
    });
  }

  return {
    ok: rows.every((row) => row.ok),
    tablePresent,
    expectedCount: expectedFiles.length,
    rows,
  };
}

async function main() {
  const { fileEnv, assignedFromFile } = loadEnvLocal();
  const databaseUrl = process.env.DATABASE_URL;
  const database = inspectDatabaseUrl(databaseUrl, {
    source: envSource(fileEnv, assignedFromFile, "DATABASE_URL"),
  });

  if (!database.ok) {
    const report = {
      ok: false,
      migrationCount: REQUIRED_MIGRATIONS.length,
      database,
      migrations: [],
    };

    if (hasJsonFlag()) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.error("DB migration application check failed:");
      console.error(`- DATABASE_URL: ${database.state}`);
    }
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const client = await pool.connect();
    try {
      const migrations = [];

      for (const migration of REQUIRED_MIGRATIONS) {
        const checks = [];
        for (const check of migration.checks) {
          checks.push({
            ...check,
            ok: await runCheck(client, check),
          });
        }

        migrations.push({
          id: migration.id,
          description: migration.description,
          ok: checks.every((check) => check.ok),
          checks,
        });
      }
      const migrationAudit = await checkMigrationAudit(client);

      const report = {
        ok: migrations.every((migration) => migration.ok) && migrationAudit.ok,
        database,
        migrationCount: migrations.length,
        migrations,
        migrationAudit,
      };

      if (hasJsonFlag()) {
        console.log(JSON.stringify(report, null, 2));
      } else if (report.ok) {
        console.log(
          `DB migration application check passed: ${migrations.length} migration invariant(s) verified.`,
        );
      } else {
        console.error("DB migration application check failed:");
        for (const migration of migrations.filter((item) => !item.ok)) {
          const failedChecks = migration.checks
            .filter((check) => !check.ok)
            .map((check) => check.name || `${check.table}.${check.column}`)
            .join(", ");
          console.error(`- ${migration.id}: ${failedChecks}`);
        }
        if (!migrationAudit.ok) {
          console.error("- nurai_migration_audit hash ledger is incomplete.");
        }
      }

      if (!report.ok) process.exit(1);
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    `DB migration application check failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
});
