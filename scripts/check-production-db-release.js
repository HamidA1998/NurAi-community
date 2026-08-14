#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { inspectDatabaseUrl } = require("./lib/production-db-target");

const root = process.cwd();
const wantsJson = process.argv.includes("--json");

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
  const value = String(process.env.DATABASE_URL || "").trim();
  return inspectDatabaseUrl(value, {
    source: envSource(fileEnv, assignedFromFile, "DATABASE_URL"),
  });
}

function runJsonCommand(args, timeoutMs) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    timeout: timeoutMs,
  });
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
    report,
    stderr: result.stderr.trim() ? "present" : "empty",
  };
}

function summarizeOwnership(commandResult) {
  const report = commandResult.report;
  return {
    ok: commandResult.ok,
    exitCode: commandResult.exitCode,
    signal: commandResult.signal,
    nullOwnerConversations: report?.nullOwnerConversations,
    missingUserConversations: report?.missingUserConversations,
    userIdNullable: report?.userIdNullable,
    fixApplied: report?.fixApplied,
    stderr: commandResult.stderr,
  };
}

function summarizeMigrations(commandResult) {
  const report = commandResult.report;
  return {
    ok: commandResult.ok,
    exitCode: commandResult.exitCode,
    signal: commandResult.signal,
    migrationCount: report?.migrationCount,
    failedMigrations: Array.isArray(report?.migrations)
      ? report.migrations
          .filter((migration) => migration.ok !== true)
          .map((migration) => migration.id)
      : undefined,
    stderr: commandResult.stderr,
  };
}

function main() {
  const { fileEnv, assignedFromFile } = loadEnvLocal();
  const database = databaseUrlEvidence(fileEnv, assignedFromFile);

  const ownership = database.ok
    ? summarizeOwnership(
        runJsonCommand(["scripts/check-conversation-ownership.js"], 30_000),
      )
    : {
        ok: false,
        skipped: true,
        reason:
          "DATABASE_URL must pass shape validation before ownership can be verified.",
      };

  const migrations = database.ok
    ? summarizeMigrations(
        runJsonCommand(
          ["scripts/check-db-migrations-applied.js", "--json"],
          30_000,
        ),
      )
    : {
        ok: false,
        skipped: true,
        reason:
          "DATABASE_URL must pass shape validation before migrations can be verified.",
      };

  const report = {
    ok: database.ok && ownership.ok && migrations.ok,
    database,
    ownership,
    migrations,
  };

  if (wantsJson) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.ok) {
    console.log(
      "Production DB release check passed: DATABASE_URL, conversation ownership, and migration invariants are verified.",
    );
  } else {
    console.error("Production DB release check failed:");
    if (!database.ok) console.error(`- DATABASE_URL: ${database.state}`);
    if (!ownership.ok && !ownership.skipped) {
      console.error("- conversation ownership invariant failed");
    }
    if (!migrations.ok && !migrations.skipped) {
      console.error("- applied migration invariant failed");
    }
  }

  if (!report.ok) process.exit(1);
}

main();
