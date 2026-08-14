#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

import {
  cleanText,
  clearedLicenseStatus,
  DEFAULT_TAFSIR_REVIEW_EVIDENCE_PATH,
  hasRealText,
  SOURCE_REVIEW_CHECKLIST_FIELDS,
  sourceCardHash,
  TAFSIR_REVIEW_EVIDENCE_SCHEMA_VERSION,
  tafsirDraftCards,
  type ReviewFinding,
  type TafsirReviewEvidenceFile,
  type TafsirReviewEvidenceRecord,
} from "./lib/tafsirSourceReview";
import { validateActivationProofPlan } from "./lib/sourceReviewActivationProofPlan";

const wantsSummaryJson = process.argv.includes("--summary-json");
const requireApproved = process.argv.includes("--require-approved");

function argValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const evidencePath = path.resolve(
  process.cwd(),
  argValue("--file", DEFAULT_TAFSIR_REVIEW_EVIDENCE_PATH),
);

const findings: ReviewFinding[] = [];

function addFinding(
  id: string,
  severity: ReviewFinding["severity"],
  message: string,
) {
  findings.push({ id, severity, message });
}

function readEvidenceFile(): TafsirReviewEvidenceFile {
  const parsed = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Evidence file must be a JSON object.");
  }
  return parsed as TafsirReviewEvidenceFile;
}

function validDate(value: unknown): boolean {
  const text = cleanText(value);
  if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return false;
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return false;
  return parsed <= Date.now() + 24 * 60 * 60 * 1000;
}

function requireRealField(
  record: TafsirReviewEvidenceRecord,
  draftId: string,
  field: keyof TafsirReviewEvidenceRecord,
  label: string,
): boolean {
  if (!hasRealText(record[field])) {
    addFinding(draftId, "blocker", `${label} is required.`);
    return false;
  }
  return true;
}

function requireDetailedField(
  record: TafsirReviewEvidenceRecord,
  draftId: string,
  field: keyof TafsirReviewEvidenceRecord,
  label: string,
  minLength: number,
): boolean {
  if (!requireRealField(record, draftId, field, label)) return false;
  if (cleanText(record[field]).length < minLength) {
    addFinding(
      draftId,
      "blocker",
      `${label} must include at least ${minLength} characters of specific review detail.`,
    );
    return false;
  }
  return true;
}

function validateApprovalRecord(
  record: TafsirReviewEvidenceRecord,
  draftId: string,
): boolean {
  let valid = true;
  const checklist =
    record.reviewChecklist &&
    typeof record.reviewChecklist === "object" &&
    !Array.isArray(record.reviewChecklist)
      ? (record.reviewChecklist as Record<string, unknown>)
      : null;

  if (!checklist) {
    addFinding(draftId, "blocker", "reviewChecklist is required.");
    valid = false;
  } else {
    for (const field of SOURCE_REVIEW_CHECKLIST_FIELDS) {
      if (checklist[field] !== true) {
        addFinding(
          draftId,
          "blocker",
          `reviewChecklist.${field} must be true.`,
        );
        valid = false;
      }
    }
  }

  if (!clearedLicenseStatus(record.licenseStatus)) {
    addFinding(
      draftId,
      "blocker",
      "licenseStatus must be licensed, public_domain, or owned.",
    );
    valid = false;
  }
  if (record.cardApprovedForActivation !== true) {
    addFinding(draftId, "blocker", "cardApprovedForActivation must be true.");
    valid = false;
  }

  valid =
    requireRealField(record, draftId, "reviewerName", "Reviewer name") && valid;
  valid =
    requireRealField(
      record,
      draftId,
      "reviewerQualification",
      "Reviewer qualification",
    ) && valid;
  valid =
    requireDetailedField(
      record,
      draftId,
      "reviewerNotes",
      "Reviewer notes",
      60,
    ) && valid;
  valid =
    requireDetailedField(
      record,
      draftId,
      "licensingEvidence",
      "Licensing evidence",
      40,
    ) && valid;
  valid =
    requireRealField(
      record,
      draftId,
      "activationApprover",
      "Activation approver",
    ) && valid;
  valid =
    requireDetailedField(
      record,
      draftId,
      "activationNotes",
      "Activation notes",
      40,
    ) && valid;
  valid =
    requireDetailedField(
      record,
      draftId,
      "reviewedExplanation",
      "Reviewed explanation",
      80,
    ) && valid;

  for (const [field, label] of [
    ["reviewerReviewedAt", "Reviewer reviewed date"],
    ["activationApprovedAt", "Activation approved date"],
  ] as const) {
    if (!validDate(record[field])) {
      addFinding(draftId, "blocker", `${label} must be an ISO-like date.`);
      valid = false;
    }
  }

  if (
    validDate(record.reviewerReviewedAt) &&
    validDate(record.activationApprovedAt) &&
    Date.parse(cleanText(record.activationApprovedAt)) <
      Date.parse(cleanText(record.reviewerReviewedAt))
  ) {
    addFinding(
      draftId,
      "blocker",
      "Activation approval date must not be before reviewer date.",
    );
    valid = false;
  }

  return valid;
}

let evidence: TafsirReviewEvidenceFile;
try {
  evidence = readEvidenceFile();
} catch (error) {
  addFinding(
    "evidence-file",
    "blocker",
    error instanceof Error ? error.message : String(error),
  );
  evidence = {};
}

if (evidence.schemaVersion !== TAFSIR_REVIEW_EVIDENCE_SCHEMA_VERSION) {
  addFinding(
    "schema-version",
    "blocker",
    `Evidence file must set schemaVersion to ${TAFSIR_REVIEW_EVIDENCE_SCHEMA_VERSION}.`,
  );
}

const activationProofPlanSummary = validateActivationProofPlan(
  evidence.activationProofPlan,
  "tafsir",
  addFinding,
);

const records = Array.isArray(evidence.records) ? evidence.records : [];
if (!Array.isArray(evidence.records)) {
  addFinding("records", "blocker", "Evidence file must include records.");
}

const recordById = new Map<string, TafsirReviewEvidenceRecord>();
for (const record of records) {
  const draftId = cleanText(record.draftId);
  if (!draftId) {
    addFinding("records", "blocker", "Every record must include draftId.");
    continue;
  }
  if (recordById.has(draftId)) {
    addFinding(draftId, "blocker", `${draftId} has duplicate records.`);
    continue;
  }
  recordById.set(draftId, record);
}

const approvedDraftIds = new Set<string>();
for (const card of tafsirDraftCards()) {
  const record = recordById.get(card.id);
  if (!record) {
    addFinding(card.id, "blocker", `${card.id} is missing from evidence.`);
    continue;
  }
  if (record.sourceCardHash !== sourceCardHash(card)) {
    addFinding(card.id, "blocker", "sourceCardHash is stale or incorrect.");
  }
  if (record.cardApprovedForActivation === true) {
    if (validateApprovalRecord(record, card.id)) {
      approvedDraftIds.add(card.id);
    }
  } else if (requireApproved) {
    addFinding(card.id, "blocker", `${card.id} is not approved.`);
  }
}

for (const draftId of recordById.keys()) {
  if (!tafsirDraftCards().some((card) => card.id === draftId)) {
    addFinding(draftId, "blocker", `${draftId} does not match a draft card.`);
  }
}

const blockerCount = findings.filter(
  (finding) => finding.severity === "blocker",
).length;
const activationReady =
  blockerCount === 0 && approvedDraftIds.size === tafsirDraftCards().length;
const valid = blockerCount === 0 && (!requireApproved || activationReady);
const report = {
  valid,
  activationReady,
  evidencePath: path.relative(process.cwd(), evidencePath),
  ...activationProofPlanSummary,
  draftCount: tafsirDraftCards().length,
  approvedCount: approvedDraftIds.size,
  blockerCount,
  warningCount: findings.filter((finding) => finding.severity === "warning")
    .length,
  findings,
};

if (wantsSummaryJson) {
  console.log(JSON.stringify(report, null, 2));
} else if (valid) {
  console.log(
    activationReady
      ? "Tafsir source review evidence is activation-ready."
      : "Tafsir source review evidence is valid but not activation-ready.",
  );
} else {
  console.error("Tafsir source review evidence failed validation:");
  for (const finding of findings) {
    console.error(`- [${finding.severity}] ${finding.id}: ${finding.message}`);
  }
}

if (!valid) process.exit(1);
