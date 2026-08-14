#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const {
  commandSignature,
  containsSecretLikeText,
  sha256,
  stableJson,
} = require("./lib/releaseCommandEvidence");
const {
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

function parseExitCode(value) {
  if (!/^-?\d+$/.test(String(value || ""))) {
    fail("--exit-code must be an integer.");
  }
  return Number(value);
}

function parseDate(value) {
  const resolved = value || new Date().toISOString();
  const parsed = Date.parse(resolved);
  if (Number.isNaN(parsed)) {
    fail("--ran-at must be a valid ISO-like timestamp.");
  }
  if (parsed > Date.now() + 24 * 60 * 60 * 1000) {
    fail("--ran-at must not be more than 24 hours in the future.");
  }
  return new Date(parsed).toISOString();
}

function readJsonSummary() {
  const file = argValue("--summary-json-file");
  const inline = argValue("--summary-json");
  if (file && inline) {
    fail("Use only one of --summary-json-file or --summary-json.");
  }
  if (!file && !inline) return null;

  const raw = file ? fs.readFileSync(path.resolve(file), "utf8") : inline;
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(
      `Summary JSON could not be parsed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function validateGateCommand(gateId, command) {
  if (!gateId) return;
  const requirement = GATE_REQUIREMENTS[gateId];
  if (!requirement) {
    fail(
      `--gate-id must be one of: ${Object.keys(GATE_REQUIREMENTS).join(", ")}.`,
    );
  }
  const canonicalCommands = requirement.verificationCommands || [];
  const canonicalMatch = canonicalCommands.some(
    (canonicalCommand) => commandSignature(canonicalCommand) === command,
  );
  if (!canonicalMatch) {
    fail(
      `--command must match a canonical verification command for ${gateId}. Expected one of: ${canonicalCommands
        .map(commandSignature)
        .join(" | ")}`,
    );
  }
}

function main() {
  const command = commandSignature(argValue("--command"));
  const gateId = String(argValue("--gate-id")).trim();
  const notes = String(argValue("--notes")).trim();
  const includeSummaryJson = flag("--include-summary-json");
  const summaryJson = readJsonSummary();

  if (!command) fail("--command is required.");
  validateGateCommand(gateId, command);
  if (notes.length < MIN_NOTE_LENGTH) {
    fail(`--notes must be at least ${MIN_NOTE_LENGTH} characters.`);
  }
  if (containsSecretLikeText(summaryJson)) {
    fail(
      "Summary JSON appears to contain secret material. Provide a redacted summary before exporting release evidence.",
    );
  }

  const result = {
    gateId: gateId || undefined,
    command,
    exitCode: parseExitCode(argValue("--exit-code")),
    ranAt: parseDate(argValue("--ran-at")),
    summarySha256: summaryJson ? sha256(stableJson(summaryJson)) : "",
    summaryJson: includeSummaryJson ? summaryJson : null,
    nonSecretResultNotes: notes,
  };

  if (!result.summarySha256 && !result.summaryJson) {
    fail(
      "Provide --summary-json-file or --summary-json so the result has structured proof.",
    );
  }
  if (containsSecretLikeText(result)) {
    fail(
      "Command result appears to contain secret material. Use redacted env assignments and non-secret summaries only.",
    );
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
