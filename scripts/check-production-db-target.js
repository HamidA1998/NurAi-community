#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  EXPECTED_RAILWAY_PROJECT_ID,
  EXPECTED_SUPABASE_PROJECT_REF,
  inspectDatabaseUrl,
} = require("./lib/production-db-target");

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

function main() {
  const { fileEnv, assignedFromFile } = loadEnvLocal();
  const source = envSource(fileEnv, assignedFromFile, "DATABASE_URL");
  const database = inspectDatabaseUrl(process.env.DATABASE_URL, { source });
  const report = {
    ok: database.ok,
    expectedSupabaseProjectRef: EXPECTED_SUPABASE_PROJECT_REF,
    expectedRailwayProjectId: EXPECTED_RAILWAY_PROJECT_ID,
    database,
  };

  if (wantsJson) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.ok) {
    console.log(
      `Production DB target check passed: DATABASE_URL points at an approved production DB target.`,
    );
  } else {
    console.error("Production DB target check failed:");
    console.error(`- DATABASE_URL: ${database.state}`);
  }

  if (!report.ok) process.exit(1);
}

main();
