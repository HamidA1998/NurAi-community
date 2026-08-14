#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const {
  commandSignature,
  containsSecretLikeText,
} = require("./lib/releaseCommandEvidence");
const {
  DEFAULT_EVIDENCE_PATH,
  EXTERNAL_GATE_IDS,
  GATE_REQUIREMENTS,
} = require("./lib/releaseExternalEvidenceRequirements");

const MIN_NOTE_LENGTH = 40;

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function flag(name) {
  return process.argv.includes(name);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    fail(
      `${label} could not be parsed as JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function readCommandResult() {
  const resultFile = argValue("--result-file");
  const inlineResult = argValue("--result-json");
  if (resultFile && inlineResult) {
    fail("Use only one of --result-file or --result-json.");
  }
  if (!resultFile && !inlineResult) {
    fail(
      "Provide --result-file or --result-json from export:release-command-result.",
    );
  }
  const raw = resultFile
    ? fs.readFileSync(path.resolve(resultFile), "utf8")
    : inlineResult;
  return readJson(raw, "Command result");
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
  const normalized = value.trim().toLowerCase();
  if (
    [
      "to" + "do",
      "tbd",
      "n/a",
      "na",
      "placeholder",
      "replace-me",
      "unknown",
    ].includes(normalized)
  ) {
    return false;
  }
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

function hasStructuredSummaryProof(result) {
  if (isPlainObject(result.summaryJson)) {
    return Object.keys(result.summaryJson).length > 0;
  }
  return /^[a-f0-9]{64}$/i.test(String(result.summarySha256 || "").trim());
}

function validateCommandResult(result) {
  const findings = [];
  if (!isPlainObject(result)) {
    return ["Command result must be a JSON object."];
  }
  if (!EXTERNAL_GATE_IDS.includes(result.gateId)) {
    findings.push(
      `gateId must be one of the current external gates: ${EXTERNAL_GATE_IDS.join(
        ", ",
      )}.`,
    );
  }
  if (typeof result.command !== "string" || result.command.trim().length < 3) {
    findings.push("command is required.");
  }
  if (result.exitCode !== 0) {
    findings.push("exitCode must be 0 before applying release evidence.");
  }
  if (!validPastOrPresentDate(result.ranAt)) {
    findings.push("ranAt must be a valid past or present ISO-like timestamp.");
  }
  if (!hasStructuredSummaryProof(result)) {
    findings.push("summaryJson or summarySha256 is required.");
  }
  if (!hasRealText(result.nonSecretResultNotes, MIN_NOTE_LENGTH)) {
    findings.push(
      `nonSecretResultNotes must be at least ${MIN_NOTE_LENGTH} characters of specific, non-placeholder text.`,
    );
  }
  if (containsSecretLikeText(result)) {
    findings.push("Command result appears to contain secret material.");
  }
  return findings;
}

function validateAgainstCanonical(result) {
  const requirement = GATE_REQUIREMENTS[result.gateId];
  if (!requirement) return ["Unknown gate requirement."];
  const command = commandSignature(result.command);
  const canonicalCommands =
    requirement.verificationCommands.map(commandSignature);
  if (!canonicalCommands.includes(command)) {
    return [
      `${result.gateId}: command must match one canonical verification command.`,
    ];
  }
  return [];
}

function applyCommandResult(intake, result) {
  const gateId = result.gateId;
  const record = (intake.records || []).find(
    (candidate) => candidate.gateId === gateId,
  );
  if (!record) {
    fail(`${gateId}: release evidence intake record is missing.`);
  }
  if (!Array.isArray(record.verificationCommands)) {
    fail(`${gateId}: verificationCommands must be present before applying.`);
  }
  const command = commandSignature(result.command);
  const expectedIndex = record.verificationCommands
    .map(commandSignature)
    .findIndex((candidate) => candidate === command);
  if (expectedIndex === -1) {
    fail(`${gateId}: command does not belong to this intake record.`);
  }
  if (!record.evidence || !isPlainObject(record.evidence)) {
    record.evidence = {};
  }
  if (!Array.isArray(record.evidence.verificationCommandResults)) {
    record.evidence.verificationCommandResults =
      record.verificationCommands.map((verificationCommand) => ({
        command: verificationCommand,
        exitCode: null,
        ranAt: "",
        summarySha256: "",
        summaryJson: null,
        nonSecretResultNotes: "",
      }));
  }

  const previous = record.evidence.verificationCommandResults[expectedIndex];
  record.evidence.verificationCommandResults[expectedIndex] = {
    command,
    exitCode: result.exitCode,
    ranAt: result.ranAt,
    summarySha256: result.summarySha256 || "",
    summaryJson: isPlainObject(result.summaryJson) ? result.summaryJson : null,
    nonSecretResultNotes: result.nonSecretResultNotes,
  };

  return {
    gateId,
    command,
    commandIndex: expectedIndex,
    replacedExistingPassingResult: previous?.exitCode === 0,
    remainingPlaceholderResultCount:
      record.evidence.verificationCommandResults.filter(
        (item) => item.exitCode !== 0 || !hasStructuredSummaryProof(item),
      ).length,
  };
}

function main() {
  const evidencePath = path.resolve(
    process.cwd(),
    argValue("--file", DEFAULT_EVIDENCE_PATH),
  );
  const wantsWrite = flag("--write");
  const wantsSummaryJson = flag("--summary-json");
  const result = readCommandResult();
  const resultFindings = [
    ...validateCommandResult(result),
    ...validateAgainstCanonical(result),
  ];
  if (resultFindings.length > 0) {
    fail(`Command result refused:\n- ${resultFindings.join("\n- ")}`);
  }
  if (!fs.existsSync(evidencePath)) {
    fail(`${path.relative(process.cwd(), evidencePath)} is missing.`);
  }
  const intake = readJson(
    fs.readFileSync(evidencePath, "utf8"),
    "Evidence file",
  );
  if (!isPlainObject(intake) || !Array.isArray(intake.records)) {
    fail("Release evidence intake must be a JSON object with records.");
  }
  if (containsSecretLikeText(intake)) {
    fail("Release evidence intake appears to contain secret material.");
  }

  const summary = applyCommandResult(intake, result);

  if (containsSecretLikeText(intake)) {
    fail("Updated release evidence intake appears to contain secret material.");
  }
  if (wantsWrite) {
    fs.writeFileSync(evidencePath, `${JSON.stringify(intake, null, 2)}\n`);
  }

  const report = {
    ok: true,
    written: wantsWrite,
    evidencePath,
    ...summary,
  };
  if (wantsSummaryJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `${wantsWrite ? "Applied" : "Dry-run accepted"} ${summary.gateId} command result ${summary.commandIndex + 1}: ${summary.command}`,
    );
  }
}

main();
