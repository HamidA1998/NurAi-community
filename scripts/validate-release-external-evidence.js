#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  DEFAULT_EVIDENCE_PATH,
  EXTERNAL_GATE_IDS,
  GATE_REQUIREMENTS,
  SCHEMA_VERSION,
  postClearWatchPlanForGate,
  rollbackMitigationPlanForGate,
} = require("./lib/releaseExternalEvidenceRequirements");
const {
  commandSignature,
  containsSecretLikeText,
} = require("./lib/releaseCommandEvidence");

const wantsSummaryJson = process.argv.includes("--summary-json");
const wantsJson = process.argv.includes("--json");
const allowCurrentBlockers =
  process.argv.includes("--allow-current-blockers") ||
  process.argv.includes("--allow-pending");
const MIN_PROOF_NOTE_LENGTH = 40;

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function runReleaseBlockers() {
  const result = spawnSync(
    process.execPath,
    ["scripts/check-release-blockers.js", "--json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
    },
  );
  const stdout = (result.stdout || "").trim();
  if (!stdout) {
    throw new Error(
      `check-release-blockers did not emit JSON. exitCode=${result.status}; stderr=${(
        result.stderr || ""
      ).trim()}`,
    );
  }
  return JSON.parse(stdout);
}

function validPastOrPresentDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return false;
  }
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed) && parsed <= Date.now() + 24 * 60 * 60 * 1000;
}

function hasRealText(value, minLength = 3) {
  if (typeof value !== "string" || value.trim().length < minLength) {
    return false;
  }
  const nonAnswers = new Set([
    "to" + "do",
    "tbd",
    "n/a",
    "na",
    "placeholder",
    "replace-me",
    "unknown",
  ]);
  const normalized = value.trim().toLowerCase();
  if (nonAnswers.has(normalized)) return false;
  return ![
    "replace with",
    "replace-me",
    "placeholder",
    "example",
    "fill this",
    "paste proof",
    "add notes",
  ].some((marker) => normalized.includes(marker));
}

function textLooksPlaceholder(value) {
  return !hasRealText(value);
}

function hasCommandText(value) {
  return typeof value === "string" && value.trim().length >= 3;
}

function unsafeNonSecretUrlReason(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "must be a non-empty URL string";
  }
  const trimmed = value.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "must be a valid URL";
  }
  if (parsed.protocol !== "https:") {
    return "must use https";
  }
  if (parsed.username || parsed.password) {
    return "must not include embedded credentials";
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local")
  ) {
    return "must not point at localhost or local-only hosts";
  }
  const unsafeQueryKeys = [
    "token",
    "key",
    "secret",
    "password",
    "signature",
    "auth",
    "session",
    "cookie",
  ];
  for (const key of parsed.searchParams.keys()) {
    const normalized = key.toLowerCase();
    if (unsafeQueryKeys.some((needle) => normalized.includes(needle))) {
      return `must not include ${key} query material`;
    }
  }
  return "";
}

function commandCoversRequired(requiredCommand, actualCommand) {
  const required = commandSignature(requiredCommand);
  const actual = commandSignature(actualCommand);
  return actual === required;
}

function commandListMatchesCanonical(gateId, actualCommands) {
  const expectedCommands =
    GATE_REQUIREMENTS[gateId]?.verificationCommands || [];
  if (!Array.isArray(actualCommands)) return false;
  if (actualCommands.length !== expectedCommands.length) return false;
  return expectedCommands.every(
    (command, index) =>
      commandSignature(actualCommands[index]) === commandSignature(command),
  );
}

function requiredEvidenceMatchesCanonical(gateId, actualEvidence) {
  const expectedEvidence = GATE_REQUIREMENTS[gateId]?.requiredEvidence || [];
  if (!Array.isArray(actualEvidence)) return false;
  if (actualEvidence.length !== expectedEvidence.length) return false;
  return expectedEvidence.every(
    (evidence, index) => actualEvidence[index] === evidence,
  );
}

function acceptanceChecklistMatchesCanonical(gateId, actualChecklist) {
  const expectedChecklist =
    GATE_REQUIREMENTS[gateId]?.acceptanceChecklist || [];
  if (!Array.isArray(actualChecklist)) return false;
  if (actualChecklist.length !== expectedChecklist.length) return false;
  return expectedChecklist.every(
    (item, index) => actualChecklist[index] === item,
  );
}

function evidenceCaptureChecklistMatchesCanonical(gateId, actualChecklist) {
  const expectedChecklist =
    GATE_REQUIREMENTS[gateId]?.evidenceCaptureChecklist || [];
  if (!Array.isArray(actualChecklist)) return false;
  if (actualChecklist.length !== expectedChecklist.length) return false;
  return expectedChecklist.every(
    (item, index) => actualChecklist[index] === item,
  );
}

function listMatchesExpected(expected, actual) {
  if (!Array.isArray(actual)) return false;
  if (actual.length !== expected.length) return false;
  return expected.every((item, index) => actual[index] === item);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasStructuredSummaryProof(result) {
  if (isPlainObject(result?.summaryJson)) {
    return Object.keys(result.summaryJson).length > 0;
  }
  return /^[a-f0-9]{64}$/i.test(String(result?.summarySha256 || "").trim());
}

function commandResultPassed(result) {
  return (
    hasCommandText(result?.command) &&
    result?.exitCode === 0 &&
    validPastOrPresentDate(result?.ranAt) &&
    hasStructuredSummaryProof(result) &&
    hasRealText(result?.nonSecretResultNotes, MIN_PROOF_NOTE_LENGTH)
  );
}

function validateRecord(record, currentCheck, currentBlockedIds, options = {}) {
  const findings = [];
  const allowPending = Boolean(options.allowPending);
  const gateId = record?.gateId || "unknown-gate";
  const evidence = record?.evidence || {};
  const requiredCommands =
    GATE_REQUIREMENTS[gateId]?.verificationCommands || [];
  const commandResults = Array.isArray(evidence.verificationCommandResults)
    ? evidence.verificationCommandResults
    : [];

  if (!EXTERNAL_GATE_IDS.includes(gateId)) {
    findings.push(`${gateId}: unknown external release gate id.`);
  }
  if (!currentCheck) {
    findings.push(`${gateId}: gate is missing from check-release-blockers.`);
  } else {
    if (record?.currentGateStatus !== currentCheck.status) {
      findings.push(
        `${gateId}: currentGateStatus is stale; regenerate the intake file.`,
      );
    }
    if (record?.currentGateMessage !== currentCheck.message) {
      findings.push(
        `${gateId}: currentGateMessage is stale; regenerate the intake file.`,
      );
    }
    if (
      JSON.stringify(record?.ownerActions || []) !==
      JSON.stringify(currentCheck.ownerAction || [])
    ) {
      findings.push(
        `${gateId}: ownerActions are stale; regenerate the intake file.`,
      );
    }
  }
  if (!allowPending && record?.currentGateStatus !== "ok") {
    findings.push(`${gateId}: currentGateStatus must be ok.`);
  }
  if (!requiredEvidenceMatchesCanonical(gateId, record?.requiredEvidence)) {
    findings.push(
      `${gateId}: requiredEvidence must match the canonical release requirements; regenerate the intake file.`,
    );
  }
  if (
    !acceptanceChecklistMatchesCanonical(gateId, record?.acceptanceChecklist)
  ) {
    findings.push(
      `${gateId}: acceptanceChecklist must match the canonical release requirements; regenerate the intake file.`,
    );
  }
  if (
    record?.noSecretBoundary !== GATE_REQUIREMENTS[gateId]?.noSecretBoundary
  ) {
    findings.push(
      `${gateId}: noSecretBoundary must match the canonical release requirements; regenerate the intake file.`,
    );
  }
  if (
    !evidenceCaptureChecklistMatchesCanonical(
      gateId,
      record?.evidenceCaptureChecklist,
    )
  ) {
    findings.push(
      `${gateId}: evidenceCaptureChecklist must match the canonical release requirements; regenerate the intake file.`,
    );
  }
  if (
    !listMatchesExpected(
      postClearWatchPlanForGate(gateId),
      record?.postClearWatchPlan,
    )
  ) {
    findings.push(
      `${gateId}: postClearWatchPlan must match the canonical release requirements; regenerate the intake file.`,
    );
  }
  if (
    !listMatchesExpected(
      rollbackMitigationPlanForGate(gateId),
      record?.rollbackMitigationPlan,
    )
  ) {
    findings.push(
      `${gateId}: rollbackMitigationPlan must match the canonical release requirements; regenerate the intake file.`,
    );
  }
  if (!allowPending && currentBlockedIds.has(gateId)) {
    findings.push(
      `${gateId}: current check-release-blockers still reports this gate as blocked.`,
    );
  }
  if (!allowPending && evidence.verified !== true) {
    findings.push(`${gateId}: evidence.verified must be true.`);
  }
  if (!allowPending && !validPastOrPresentDate(evidence.verifiedAt)) {
    findings.push(`${gateId}: evidence.verifiedAt must be a valid date.`);
  }
  if (!allowPending && !hasRealText(evidence.verifiedBy)) {
    findings.push(`${gateId}: evidence.verifiedBy is required.`);
  }
  if (
    !allowPending &&
    !hasRealText(evidence.nonSecretProofNotes, MIN_PROOF_NOTE_LENGTH)
  ) {
    findings.push(
      `${gateId}: non-secret proof notes must be at least ${MIN_PROOF_NOTE_LENGTH} characters.`,
    );
  }
  if (
    Array.isArray(evidence.nonSecretUrls) &&
    evidence.nonSecretUrls.some((url) => textLooksPlaceholder(url))
  ) {
    findings.push(`${gateId}: nonSecretUrls must not contain placeholders.`);
  }
  if (Array.isArray(evidence.nonSecretUrls)) {
    evidence.nonSecretUrls.forEach((url, index) => {
      const reason = unsafeNonSecretUrlReason(url);
      if (reason) {
        findings.push(
          `${gateId}: nonSecretUrls[${index}] ${reason}; use redacted HTTPS evidence links only.`,
        );
      }
    });
  }
  if (!Array.isArray(record?.verificationCommands)) {
    findings.push(`${gateId}: verificationCommands must be an array.`);
  } else if (
    !commandListMatchesCanonical(gateId, record.verificationCommands)
  ) {
    findings.push(
      `${gateId}: verificationCommands must match the canonical release requirements; regenerate the intake file.`,
    );
  }
  if (!Array.isArray(evidence.verificationCommandResults)) {
    findings.push(`${gateId}: verificationCommandResults must be an array.`);
  } else if (commandResults.length < 1) {
    findings.push(
      `${gateId}: at least one verification command result is required.`,
    );
  } else {
    for (const [index, result] of commandResults.entries()) {
      if (!hasCommandText(result?.command)) {
        findings.push(
          `${gateId}: command result ${index + 1} is missing command.`,
        );
      }
      if (!allowPending && result?.exitCode !== 0) {
        findings.push(
          `${gateId}: command result ${index + 1} must include exitCode 0.`,
        );
      }
      if (!allowPending && !validPastOrPresentDate(result?.ranAt)) {
        findings.push(
          `${gateId}: command result ${index + 1} must include a valid ranAt timestamp.`,
        );
      }
      if (!allowPending && !hasStructuredSummaryProof(result)) {
        findings.push(
          `${gateId}: command result ${index + 1} must include summaryJson or a summarySha256 hash.`,
        );
      }
      if (
        !allowPending &&
        !hasRealText(result?.nonSecretResultNotes, MIN_PROOF_NOTE_LENGTH)
      ) {
        findings.push(
          `${gateId}: command result ${index + 1} must include nonSecretResultNotes of at least ${MIN_PROOF_NOTE_LENGTH} characters.`,
        );
      }
    }
    if (!allowPending) {
      for (const requiredCommand of requiredCommands) {
        const covered = commandResults.some(
          (result) =>
            commandCoversRequired(requiredCommand, result?.command) &&
            commandResultPassed(result),
        );
        if (!covered) {
          findings.push(
            `${gateId}: missing structured passing result for required command "${requiredCommand}".`,
          );
        }
      }
    }
  }

  return findings;
}

function main() {
  const evidencePath = path.resolve(
    process.cwd(),
    argValue("--file", DEFAULT_EVIDENCE_PATH),
  );
  const report = runReleaseBlockers();
  const currentBlockedIds = new Set(
    (report.blocked || [])
      .map((blocker) => blocker.id)
      .filter((id) => EXTERNAL_GATE_IDS.includes(id)),
  );
  const currentChecksById = new Map(
    (report.checks || []).map((check) => [check.id, check]),
  );
  const findings = [];

  if (!fs.existsSync(evidencePath)) {
    findings.push(`${path.relative(process.cwd(), evidencePath)} is missing.`);
  }

  const evidence = fs.existsSync(evidencePath)
    ? JSON.parse(fs.readFileSync(evidencePath, "utf8"))
    : { records: [] };

  if (evidence.schemaVersion !== SCHEMA_VERSION) {
    findings.push(`schemaVersion must be ${SCHEMA_VERSION}.`);
  }
  if (!validPastOrPresentDate(evidence.generatedAt)) {
    findings.push("generatedAt must be a valid past or present timestamp.");
  }
  if (!Array.isArray(evidence.records)) {
    findings.push("records must be an array.");
  }
  const orderedRecordIds = (evidence.records || []).map(
    (record) => record.gateId,
  );
  if (orderedRecordIds.join(",") !== EXTERNAL_GATE_IDS.join(",")) {
    findings.push(
      `records must exactly match external gate order: ${EXTERNAL_GATE_IDS.join(", ")}.`,
    );
  }
  const recordIds = new Set(
    (evidence.records || []).map((record) => record.gateId),
  );
  for (const gateId of EXTERNAL_GATE_IDS) {
    if (!recordIds.has(gateId)) {
      findings.push(`${gateId}: release evidence record is missing.`);
    }
  }
  if (containsSecretLikeText(evidence)) {
    findings.push("release evidence file appears to contain secret material.");
  }
  for (const record of evidence.records || []) {
    findings.push(
      ...validateRecord(
        record,
        currentChecksById.get(record?.gateId),
        currentBlockedIds,
        { allowPending: allowCurrentBlockers },
      ),
    );
  }

  const summary = {
    valid: findings.length === 0,
    readyForExternalReleaseClaim:
      findings.length === 0 && !allowCurrentBlockers,
    allowCurrentBlockers,
    evidencePath,
    schemaVersion: evidence.schemaVersion || null,
    recordCount: evidence.records?.length || 0,
    currentBlockedExternalGateCount: currentBlockedIds.size,
    currentBlockedExternalGateIds: [...currentBlockedIds],
    blockerCount: findings.length,
    findings,
  };

  if (wantsSummaryJson || wantsJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else if (summary.valid) {
    console.log(
      `Release external evidence validation passed: ${summary.recordCount} gate record(s).`,
    );
  } else {
    console.error("Release external evidence validation failed:");
    for (const finding of findings) console.error(`- ${finding}`);
  }

  if (!summary.valid) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
