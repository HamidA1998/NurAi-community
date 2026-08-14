#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const pg = require("pg");
const { inspectDatabaseUrl } = require("./lib/production-db-target");

const { Pool } = pg;

const root = process.cwd();
const migrationsDir = path.join(root, "migrations");
const wantsJson = process.argv.includes("--json");
const shouldApply = process.argv.includes("--yes");
const planOnly = process.argv.includes("--plan-only");
const SCRIPT_VERSION = "2026-05-17.2";

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

function databaseUrlEvidence(fileEnv, assignedFromFile) {
  return inspectDatabaseUrl(process.env.DATABASE_URL, {
    source: envSource(fileEnv, assignedFromFile, "DATABASE_URL"),
  });
}

function migrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error("migrations directory is missing.");
  }

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
        sql,
      };
    });
}

function runProductionDbCheck() {
  const result = spawnSync(
    process.execPath,
    ["scripts/check-production-db-release.js", "--json"],
    {
      cwd: root,
      encoding: "utf8",
      env: process.env,
      timeout: 60_000,
    },
  );

  let report = null;
  const stdout = result.stdout.trim();
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
    report,
    stderr: result.stderr.trim() ? "present" : "empty",
  };
}

async function applyMigrations(files) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const applied = [];

  try {
    const client = await pool.connect();
    let lockHeld = false;
    try {
      await client.query("SET lock_timeout = '10s'");
      await client.query("SET statement_timeout = '5min'");
      await client.query("SET idle_in_transaction_session_timeout = '2min'");
      const lockResult = await client.query(
        "SELECT pg_try_advisory_lock($1, $2) AS locked",
        [716872331, 20260517],
      );
      lockHeld = lockResult.rows[0]?.locked === true;
      if (!lockHeld) {
        throw new Error(
          "Another NurAI production migration run already holds the advisory lock.",
        );
      }

      await client.query(`
        CREATE TABLE IF NOT EXISTS "nurai_migration_audit" (
          "migration_id" text PRIMARY KEY,
          "file_path" text NOT NULL,
          "file_sha256" text NOT NULL,
          "file_bytes" integer NOT NULL,
          "script_version" text NOT NULL,
          "applied_at" timestamp NOT NULL DEFAULT now()
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS "nurai_migration_audit_applied_at_idx"
        ON "nurai_migration_audit" ("applied_at")
      `);

      for (const file of files) {
        const started = Date.now();
        await client.query(file.sql);
        await client.query(
          `
            INSERT INTO "nurai_migration_audit"
              ("migration_id", "file_path", "file_sha256", "file_bytes", "script_version", "applied_at")
            VALUES ($1, $2, $3, $4, $5, now())
            ON CONFLICT ("migration_id")
            DO UPDATE SET
              "file_path" = EXCLUDED."file_path",
              "file_sha256" = EXCLUDED."file_sha256",
              "file_bytes" = EXCLUDED."file_bytes",
              "script_version" = EXCLUDED."script_version",
              "applied_at" = EXCLUDED."applied_at"
          `,
          [file.id, file.file, file.sha256, file.bytes, SCRIPT_VERSION],
        );
        applied.push({
          id: file.id,
          file: file.file,
          bytes: file.bytes,
          sha256: file.sha256,
          applied: true,
          durationMs: Date.now() - started,
        });
      }
    } finally {
      if (lockHeld) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // Ignore: the last migration may not leave an open transaction.
        }
        await client.query(
          "SELECT pg_advisory_unlock($1, $2)",
          [716872331, 20260517],
        );
      }
      client.release();
    }
  } finally {
    await pool.end();
  }

  return applied;
}

function renderText(report) {
  if (report.dryRun) {
    console.log(
      `Production migration dry run ready: ${report.migrationCount} migration file(s) found.`,
    );
    console.log("No database connection was opened and no SQL was applied.");
    console.log(
      "Run DATABASE_URL=postgresql://... npm run apply:production-migrations -- --yes after reviewing the target database.",
    );
    return;
  }

  if (report.ok) {
    console.log(
      `Production migrations applied and verified: ${report.migrationCount} migration file(s).`,
    );
  } else {
    console.error("Production migration apply failed.");
    if (report.database?.state && report.database.state !== "present") {
      console.error(`- DATABASE_URL: ${report.database.state}`);
    }
    if (report.error) console.error(`- ${report.error}`);
    if (report.postCheck && !report.postCheck.ok) {
      console.error("- production DB post-check failed");
    }
  }
}

async function main() {
  const { fileEnv, assignedFromFile } = loadEnvLocal();
  const files = migrationFiles();
  if (!files.length) throw new Error("No migration SQL files were found.");
  const database =
    shouldApply || wantsJson || process.env.DATABASE_URL
      ? databaseUrlEvidence(fileEnv, assignedFromFile)
      : { checked: false };

  const report = {
    ok: true,
    dryRun: !shouldApply,
    willApply: shouldApply,
    migrationCount: files.length,
    migrations: files.map(({ id, file, bytes, sha256 }) => ({
      id,
      file,
      bytes,
      sha256,
      applied: false,
    })),
    database,
    postCheck: null,
  };

  if (!shouldApply) {
    if (wantsJson && !planOnly && !report.database.ok) {
      report.ok = false;
      report.error =
        "DATABASE_URL must be present and pass target validation for release JSON dry-runs. Use --plan-only only for a no-database file listing.";
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }
    if (wantsJson) console.log(JSON.stringify(report, null, 2));
    else renderText(report);
    return;
  }

  if (!report.database.ok) {
    report.ok = false;
    if (wantsJson) console.log(JSON.stringify(report, null, 2));
    else renderText(report);
    process.exit(1);
  }

  try {
    report.migrations = await applyMigrations(files);
    report.postCheck = runProductionDbCheck();
    report.ok = report.postCheck.ok === true;
  } catch (error) {
    report.ok = false;
    report.error = error instanceof Error ? error.message : String(error);
  }

  if (wantsJson) console.log(JSON.stringify(report, null, 2));
  else renderText(report);

  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  const report = {
    ok: false,
    dryRun: !shouldApply,
    willApply: shouldApply,
    error: error instanceof Error ? error.message : String(error),
  };

  if (wantsJson) console.log(JSON.stringify(report, null, 2));
  else renderText(report);
  process.exit(1);
});
