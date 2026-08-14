#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { sha256, stableJson } = require("./lib/releaseCommandEvidence");

const script = "scripts/export-release-command-result.js";
const applyScript = "scripts/apply-release-command-result.js";
const validateScript = "scripts/validate-release-external-evidence.js";

function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function runApply(args) {
  return spawnSync(process.execPath, [applyScript, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function runValidate(args) {
  return spawnSync(process.execPath, [validateScript, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function assert(condition, message, findings) {
  if (!condition) findings.push(message);
}

function parseStdoutJson(result, findings) {
  try {
    return JSON.parse(result.stdout);
  } catch {
    findings.push(`Expected JSON stdout, got: ${result.stdout}`);
    return null;
  }
}

function main() {
  const findings = [];
  const notes =
    "Production database target check passed against the known Supabase project without exposing the database password.";
  const summary = { b: 2, a: 1 };
  const success = run([
    "--gate-id",
    "production-database-url",
    "--command",
    "DATABASE_URL=postgresql://user:secret@example.supabase.co:5432/postgres npm run check:production-db-target -- --json",
    "--exit-code",
    "0",
    "--ran-at",
    "2026-05-31T00:00:00.000Z",
    "--summary-json",
    JSON.stringify(summary),
    "--notes",
    notes,
  ]);
  const payload = parseStdoutJson(success, findings);

  assert(
    success.status === 0,
    "Expected redacted command export to pass.",
    findings,
  );
  assert(
    payload?.command ===
      "DATABASE_URL=... npm run check:production-db-target -- --json",
    "Command output must redact DATABASE_URL assignment.",
    findings,
  );
  assert(
    payload?.gateId === "production-database-url",
    "gateId must be preserved when provided.",
    findings,
  );
  assert(payload?.exitCode === 0, "exitCode must be preserved.", findings);
  assert(
    payload?.summarySha256 === sha256(stableJson(summary)),
    "summarySha256 must use stable key ordering.",
    findings,
  );
  assert(
    payload?.summaryJson === null,
    "summaryJson must default to null.",
    findings,
  );
  assert(
    payload?.nonSecretResultNotes === notes,
    "nonSecretResultNotes must be preserved.",
    findings,
  );
  assert(
    !JSON.stringify(payload || {}).includes("secret@example"),
    "Output must not include the database password.",
    findings,
  );

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "nurai-release-command-result-"),
  );
  const intakePath = path.join(tempDir, "release-external-evidence.json");
  fs.copyFileSync(
    path.join(
      process.cwd(),
      "docs/audit/release-external-evidence.intake.json",
    ),
    intakePath,
  );
  const dryRunApply = runApply([
    "--file",
    intakePath,
    "--result-json",
    JSON.stringify(payload),
    "--summary-json",
  ]);
  const dryRunPayload = parseStdoutJson(dryRunApply, findings);
  assert(
    dryRunApply.status === 0 && dryRunPayload?.written === false,
    "Dry-run apply must accept a valid exported command result without writing.",
    findings,
  );
  const writeApply = runApply([
    "--file",
    intakePath,
    "--result-json",
    JSON.stringify(payload),
    "--write",
    "--summary-json",
  ]);
  const writePayload = parseStdoutJson(writeApply, findings);
  const updatedIntake = JSON.parse(fs.readFileSync(intakePath, "utf8"));
  const productionDbRecord = updatedIntake.records.find(
    (record) => record.gateId === "production-database-url",
  );
  assert(
    writeApply.status === 0 && writePayload?.written === true,
    "Write apply must report that it updated the intake file.",
    findings,
  );
  assert(
    productionDbRecord?.evidence?.verificationCommandResults?.some(
      (result) =>
        result.command === payload.command &&
        result.summarySha256 === payload.summarySha256 &&
        result.exitCode === 0,
    ),
    "Write apply must place the command result under the matching gate command slot.",
    findings,
  );

  productionDbRecord.evidence.nonSecretUrls = [
    "http://localhost:3000/proof?token=secret",
  ];
  fs.writeFileSync(intakePath, `${JSON.stringify(updatedIntake, null, 2)}\n`);
  const unsafeUrlValidation = runValidate([
    "--file",
    intakePath,
    "--allow-current-blockers",
    "--summary-json",
  ]);
  assert(
    unsafeUrlValidation.status !== 0 &&
      /nonSecretUrls\[0\].*https/i.test(unsafeUrlValidation.stdout),
    "Release external evidence validation must reject local, non-HTTPS, or tokenized proof URLs.",
    findings,
  );

  const includedSummary = run([
    "--gate-id",
    "deployed-runtime-url",
    "--command",
    "npm run check:release-blockers -- --json",
    "--exit-code",
    "0",
    "--ran-at",
    "2026-05-31T00:00:00.000Z",
    "--summary-json",
    JSON.stringify({ ok: true, blockerCount: 0 }),
    "--include-summary-json",
    "--notes",
    "Release blocker check passed after deployed runtime and database gates cleared.",
  ]);
  const includedPayload = parseStdoutJson(includedSummary, findings);
  assert(
    includedSummary.status === 0,
    "Expected include-summary-json mode to pass.",
    findings,
  );
  assert(
    includedPayload?.summaryJson?.ok === true,
    "include-summary-json must preserve non-secret summary JSON.",
    findings,
  );

  const unknownGate = run([
    "--gate-id",
    "unknown-gate",
    "--command",
    "npm run check:release-blockers -- --json",
    "--exit-code",
    "0",
    "--summary-json",
    JSON.stringify({ ok: true }),
    "--notes",
    "Release blocker check command should reject unknown gate identifiers.",
  ]);
  assert(
    unknownGate.status !== 0 &&
      /gate-id must be one of/i.test(unknownGate.stderr),
    "Unknown gate IDs must fail before evidence export.",
    findings,
  );

  const wrongGateCommand = run([
    "--gate-id",
    "production-database-url",
    "--command",
    "NURAI_DEPLOYMENT_URL=https://example.com NURAI_DEPLOYED_AI_SMOKE_SECRET=redacted npm run check:ai-release:deployed",
    "--exit-code",
    "0",
    "--summary-json",
    JSON.stringify({ ok: true }),
    "--notes",
    "Release evidence should reject commands attached to the wrong gate.",
  ]);
  assert(
    wrongGateCommand.status !== 0 &&
      /canonical verification command/i.test(wrongGateCommand.stderr),
    "Commands must match the supplied gate's canonical verification list.",
    findings,
  );

  const shortNotes = run([
    "--command",
    "npm run check:release-blockers -- --json",
    "--exit-code",
    "0",
    "--summary-json",
    JSON.stringify({ ok: true }),
    "--notes",
    "too short",
  ]);
  assert(
    shortNotes.status !== 0 &&
      /notes must be at least 40 characters/i.test(shortNotes.stderr),
    "Short notes must fail validation.",
    findings,
  );

  const missingSummary = run([
    "--command",
    "npm run check:release-blockers -- --json",
    "--exit-code",
    "0",
    "--notes",
    "Release blocker check passed with no structured output attached yet.",
  ]);
  assert(
    missingSummary.status !== 0 &&
      /structured proof/i.test(missingSummary.stderr),
    "Missing summary JSON/hash proof must fail validation.",
    findings,
  );

  const secretSummary = run([
    "--command",
    "npm run check:release-blockers -- --json",
    "--exit-code",
    "0",
    "--summary-json",
    JSON.stringify({ private_key: "redaction guard fixture" }),
    "--notes",
    "Release blocker check output was accidentally not redacted before export.",
  ]);
  assert(
    secretSummary.status !== 0 &&
      /Summary JSON appears to contain secret material/i.test(
        secretSummary.stderr,
      ),
    "Secret-like summary JSON must be rejected before hashing.",
    findings,
  );

  const smokeSecret = run([
    "--command",
    "NURAI_DEPLOYED_AI_SMOKE_SECRET=supersecretvalue123456 npm run check:ai-release:deployed",
    "--exit-code",
    "0",
    "--summary-json",
    JSON.stringify({ ok: true }),
    "--notes",
    "Deployed AI release command passed while keeping smoke secret out of evidence.",
  ]);
  const smokePayload = parseStdoutJson(smokeSecret, findings);
  assert(
    smokeSecret.status === 0,
    "Smoke-secret env command should redact and pass.",
    findings,
  );
  assert(
    smokePayload?.command ===
      "NURAI_DEPLOYED_AI_SMOKE_SECRET=... npm run check:ai-release:deployed",
    "Smoke secret env assignment must be redacted.",
    findings,
  );

  const refusedApply = runApply([
    "--file",
    intakePath,
    "--result-json",
    JSON.stringify({ ...payload, exitCode: 1 }),
    "--summary-json",
  ]);
  assert(
    refusedApply.status !== 0 &&
      /exitCode must be 0/i.test(refusedApply.stderr),
    "Apply helper must refuse failing command results.",
    findings,
  );

  if (findings.length > 0) {
    console.error(
      `Release command-result check failed with ${findings.length} finding(s):`,
    );
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Release command-result check passed: redaction, summary hashing, and failure guards verified.",
  );
}

main();
