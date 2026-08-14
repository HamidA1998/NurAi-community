#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
  EXPECTED_RAILWAY_PROJECT_ID,
  EXPECTED_SUPABASE_PROJECT_REF,
  inspectDatabaseUrl,
} = require("./lib/production-db-target");

const root = process.cwd();
const migrationsDir = path.join(root, "migrations");
const outputPath = "docs/audit/PRODUCTION_DB_PROOF_PLAN.md";
const wantsJson = process.argv.includes("--json");
const shouldWrite = process.argv.includes("--write");
const shouldCheck = process.argv.includes("--check");

const REQUIRED_COMMANDS = [
  "DATABASE_URL=postgresql://... npm run check:production-db-target -- --json",
  "DATABASE_URL=postgresql://... npm run check:conversation-ownership",
  "DATABASE_URL=postgresql://... npm run apply:production-migrations -- --json",
  "DATABASE_URL=postgresql://... npm run apply:production-migrations -- --yes --json",
  "DATABASE_URL=postgresql://... npm run check:production-db-release -- --json",
  "DATABASE_URL=postgresql://... npm run check:db-migrations-applied -- --json",
  "npm run check:release-blockers -- --json",
];

function buildDbEvidenceContract(plan) {
  return {
    title: "Production database evidence contract",
    statusLabel: plan.ok
      ? "Migration proof plan is ready for credentialed verification."
      : "Migration proof plan has local blockers.",
    credentialBoundary:
      "Use DATABASE_URL only in the release shell or production secret manager; never commit, screenshot, log, or paste it into evidence.",
    preflightChecklist: [
      `Confirm active Railway project id is ${EXPECTED_RAILWAY_PROJECT_ID} and database name is railway before apply.`,
      "Run check:production-db-proof-plan first and save only non-secret migration hashes.",
      "Run check:production-db-target before any apply command.",
      "Review apply:production-migrations -- --json output before --yes.",
      "Keep conversation ownership and db-migrations-applied checks in the same evidence packet.",
    ],
    stopRules: [
      "Stop before apply if check:production-db-target does not identify the active Railway project.",
      "Stop before apply if migration hashes differ from the proof plan.",
      "Stop before apply if dry-run JSON requires a missing or placeholder DATABASE_URL.",
      "Stop and preserve redacted output if production DB release or ownership checks fail.",
    ],
    evidenceToCapture: [
      "Non-secret migration file list with sha256 hashes.",
      "Redacted target-check summary for the active Railway project.",
      "Redacted dry-run summary before applying SQL.",
      "Redacted apply summary with migration audit rows.",
      "Redacted production DB release, ownership, migration-applied, and release-blocker summaries.",
    ],
    noGoClaims: [
      "Do not claim production database is verified from this plan alone.",
      "Do not use local, preview, or placeholder DATABASE_URL output as production proof.",
      "Do not accept screenshots or logs that expose connection strings or private user data.",
    ],
    requiredCommandCount: REQUIRED_COMMANDS.length,
    migrationHashCount: plan.migrationCount,
  };
}

function parseEnvValue(raw) {
  const trimmed = String(raw || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvLocalValue(name) {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return undefined;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = line.slice(0, equalsIndex).trim();
    if (key === name) return parseEnvValue(line.slice(equalsIndex + 1));
  }
  return undefined;
}

function databaseUrlState() {
  const processValue = process.env.DATABASE_URL;
  const envLocalValue = loadEnvLocalValue("DATABASE_URL");
  const value = processValue || envLocalValue || "";
  const source = processValue
    ? "process"
    : envLocalValue
      ? ".env.local"
      : "missing";
  return inspectDatabaseUrl(value, { source });
}

function migrationPlan() {
  const findings = [];
  if (!fs.existsSync(migrationsDir)) {
    return {
      ok: false,
      migrationCount: 0,
      migrations: [],
      findings: ["migrations directory is missing."],
    };
  }

  const migrations = fs
    .readdirSync(migrationsDir)
    .filter((file) => /^\d{4}_[a-z0-9_]+\.sql$/i.test(file))
    .sort()
    .map((file) => {
      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, "utf8");
      if (!/Release note:/i.test(sql)) {
        findings.push(`${file}: missing release note.`);
      }
      const auditedEmptyPrototypeReplacement =
        file === "0017_community_social_safety.sql" &&
        /confirmed empty[\s\S]*DROP TABLE community_connections/i.test(sql);
      if (
        /\b(DROP\s+TABLE|TRUNCATE\s+TABLE)\b/i.test(sql) &&
        !auditedEmptyPrototypeReplacement
      ) {
        findings.push(`${file}: destructive table operation is blocked.`);
      }
      return {
        file: path.relative(root, fullPath),
        bytes: Buffer.byteLength(sql, "utf8"),
        sha256: crypto.createHash("sha256").update(sql).digest("hex"),
      };
    });

  return {
    ok: migrations.length > 0 && findings.length === 0,
    migrationCount: migrations.length,
    migrations,
    findings,
  };
}

function buildReport() {
  const database = databaseUrlState();
  const plan = migrationPlan();
  return {
    ok: plan.ok,
    readyForCredential: plan.ok,
    readyForProductionDbClaim: false,
    expectedSupabaseProjectRef: EXPECTED_SUPABASE_PROJECT_REF,
    expectedRailwayProjectId: EXPECTED_RAILWAY_PROJECT_ID,
    database,
    migrationPlan: plan,
    credentialBoundary:
      "This plan is not production DB proof. The gate passes only after the real DATABASE_URL is set in the release shell and every required command exits 0.",
    evidenceContract: buildDbEvidenceContract(plan),
    requiredCommands: REQUIRED_COMMANDS,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# Production DB Proof Plan",
    "",
    "Generated from the current migration files. This is a non-secret release planning artifact, not production database proof.",
    "",
    `Ready for credentialed verification: ${report.readyForCredential ? "yes" : "no"}`,
    `Ready for production DB claim: ${report.readyForProductionDbClaim ? "yes" : "no"}`,
    `Expected Supabase project ref: ${report.expectedSupabaseProjectRef}`,
    `Expected Railway project id: ${report.expectedRailwayProjectId}`,
    `Migration count: ${report.migrationPlan.migrationCount}`,
    "",
    "## Credential Boundary",
    "",
    report.credentialBoundary,
    "",
    report.evidenceContract.credentialBoundary,
    "",
    "Never commit, screenshot, log, paste, or attach the real `DATABASE_URL`, database password, service-role key, SQL containing private user data, or an unredacted connection string.",
    "",
    "## Preflight Checklist",
    "",
    ...report.evidenceContract.preflightChecklist.map((item) => `- ${item}`),
    "",
    "## Stop Rules",
    "",
    ...report.evidenceContract.stopRules.map((item) => `- ${item}`),
    "",
    "## Evidence To Capture",
    "",
    ...report.evidenceContract.evidenceToCapture.map((item) => `- ${item}`),
    "",
    "## Required Commands",
    "",
    ...report.requiredCommands.map((command) => `- \`${command}\``),
    "",
    "## Migration Hashes",
    "",
  ];

  if (report.migrationPlan.migrations.length === 0) {
    lines.push("- No migration files found.");
  } else {
    for (const migration of report.migrationPlan.migrations) {
      lines.push(
        `- \`${migration.file}\` (${migration.bytes} bytes): \`${migration.sha256}\``,
      );
    }
  }

  lines.push("", "## No-Go Claims", "");
  lines.push(...report.evidenceContract.noGoClaims.map((item) => `- ${item}`));

  if (report.migrationPlan.findings.length > 0) {
    lines.push("", "## Local Findings", "");
    lines.push(...report.migrationPlan.findings.map((item) => `- ${item}`));
  }

  lines.push(
    "",
    "Guardrail: this artifact is a migration hash and command plan only. The release gate passes only after credentialed production commands pass and redacted command-result evidence is validated.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

function main() {
  const report = buildReport();
  const rendered = renderMarkdown(report);

  if (shouldWrite) {
    const absoluteOutputPath = path.join(root, outputPath);
    fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
    fs.writeFileSync(absoluteOutputPath, rendered);
    if (!wantsJson) {
      console.log(`Wrote ${outputPath}.`);
    }
  }

  if (shouldCheck) {
    const absoluteOutputPath = path.join(root, outputPath);
    if (!fs.existsSync(absoluteOutputPath)) {
      if (wantsJson) {
        console.log(
          JSON.stringify(
            {
              ...report,
              ok: false,
              outputPath,
              finding: `${outputPath} is missing.`,
            },
            null,
            2,
          ),
        );
      } else {
        console.error(`${outputPath} is missing.`);
      }
      process.exit(1);
    }
    const current = fs.readFileSync(absoluteOutputPath, "utf8");
    if (current !== rendered) {
      if (wantsJson) {
        console.log(
          JSON.stringify(
            {
              ...report,
              ok: false,
              outputPath,
              finding:
                "Production DB proof plan is out of date. Run npm run export:production-db-proof-plan.",
            },
            null,
            2,
          ),
        );
      } else {
        console.error(
          "Production DB proof plan is out of date. Run npm run export:production-db-proof-plan.",
        );
      }
      process.exit(1);
    }
  }

  if (wantsJson) {
    console.log(JSON.stringify({ ...report, outputPath }, null, 2));
  } else {
    console.log(
      `Production DB proof plan ready: ${report.migrationPlan.migrationCount} migration file(s) indexed.`,
    );
    console.log(report.credentialBoundary);
    console.log(`${report.evidenceContract.title}:`);
    console.log(`- ${report.evidenceContract.credentialBoundary}`);
    for (const rule of report.evidenceContract.stopRules) {
      console.log(`- ${rule}`);
    }
    for (const command of REQUIRED_COMMANDS) {
      console.log(`- ${command}`);
    }
    if (!shouldWrite) {
      console.log(`Persist with: npm run export:production-db-proof-plan`);
    }
  }

  if (!report.ok) process.exit(1);
}

main();
