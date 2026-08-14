#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

import {
  buildTemplateEvidenceFile,
  DEFAULT_HADITH_REVIEW_EVIDENCE_PATH,
  hadithDraftCards,
  sourceCardHash,
} from "./lib/hadithSourceReview";

const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");
const wantsJson =
  process.argv.includes("--json") || process.argv.includes("--summary-json");

function argValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const outputPath = path.resolve(
  process.cwd(),
  argValue("--file", DEFAULT_HADITH_REVIEW_EVIDENCE_PATH),
);

function checkCurrent(): string[] {
  const findings: string[] = [];
  if (!fs.existsSync(outputPath)) {
    return [`${path.relative(process.cwd(), outputPath)} is missing.`];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }

  const expected = buildTemplateEvidenceFile();
  const object =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  if (!object) return ["Evidence intake must be a JSON object."];

  if (object.schemaVersion !== expected.schemaVersion) {
    findings.push("schemaVersion is stale or missing.");
  }
  if (
    JSON.stringify(object.activationProofPlan) !==
    JSON.stringify(expected.activationProofPlan)
  ) {
    findings.push("activationProofPlan is stale or missing.");
  }

  const records = Array.isArray(object.records)
    ? (object.records as Record<string, unknown>[])
    : [];
  if (!Array.isArray(object.records))
    findings.push("records must be an array.");
  if (records.length !== expected.records.length) {
    findings.push(
      `records has ${records.length} item(s), expected ${expected.records.length}.`,
    );
  }

  const recordById = new Map(
    records
      .filter((record) => typeof record.draftId === "string")
      .map((record) => [String(record.draftId), record]),
  );

  for (const card of hadithDraftCards()) {
    const record = recordById.get(card.id);
    if (!record) {
      findings.push(`${card.id} is missing from the evidence intake.`);
      continue;
    }
    if (record.sourceCardHash !== sourceCardHash(card)) {
      findings.push(`${card.id} sourceCardHash is stale.`);
    }
    if (record.cardApprovedForActivation === true) {
      findings.push(`${card.id} must not be approved in the repo template.`);
    }
  }

  return findings;
}

let written = 0;
if (wantsWrite) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(buildTemplateEvidenceFile(), null, 2)}\n`,
  );
  written = 1;
}

const findings = wantsCheck ? checkCurrent() : [];
const summary = {
  ok: findings.length === 0,
  outputPath: path.relative(process.cwd(), outputPath),
  draftCount: hadithDraftCards().length,
  written,
  findings,
};

if (wantsJson) {
  console.log(JSON.stringify(summary, null, 2));
} else if (wantsCheck) {
  if (findings.length) {
    console.error("Hadith review evidence intake is not current:");
    for (const finding of findings) console.error(`- ${finding}`);
  } else {
    console.log("Hadith review evidence intake is current.");
  }
} else if (wantsWrite) {
  console.log(`Wrote ${path.relative(process.cwd(), outputPath)}.`);
} else {
  console.log(JSON.stringify(buildTemplateEvidenceFile(), null, 2));
}

if (findings.length) process.exit(1);
