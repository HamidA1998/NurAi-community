#!/usr/bin/env tsx

import fs from "node:fs";

import { LIBRARY_BOOKS } from "../client/data/libraryBooks";
import { computeBookContentHash } from "./lib/libraryContentHash";
import {
  QUALITY_CHECKLIST_FIELD_LABELS,
  QUALITY_CHECKLIST_FIELDS,
  hasRealText,
  isSensitiveBook,
  type QualityChecklistKey,
} from "./lib/libraryReviewEvidence";

type Book = (typeof LIBRARY_BOOKS)[number];

const wantsSummaryJson = process.argv.includes("--summary-json");
const wantsStrict = process.argv.includes("--strict");

function argValue(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const evidencePath = argValue(
  "--file",
  "docs/audit/library-review-evidence.template.json",
);

type Severity = "blocker" | "warning";

type Finding = {
  id: string;
  severity: Severity;
  message: string;
};

type EvidenceRecord = {
  bookId?: unknown;
  reviewerAcceptancePacket?: unknown;
  approvedForPublication?: unknown;
  contentHash?: unknown;
  qualityChecklist?: unknown;
  editorialReviewer?: unknown;
  editorialReviewedAt?: unknown;
  editorialNotes?: unknown;
  sourceReviewer?: unknown;
  sourceReviewedAt?: unknown;
  sourceNotes?: unknown;
  qualifiedScholarReviewer?: unknown;
  qualifiedScholarReviewedAt?: unknown;
  scholarReviewScope?: unknown;
  scholarNotes?: unknown;
  publishApprover?: unknown;
  publishApprovedAt?: unknown;
  publishNotes?: unknown;
};

type ReviewProofPlan = {
  proofBoundary?: unknown;
  currentClaimAllowed?: unknown;
  completedEvidenceFileRule?: unknown;
  perBookAcceptancePacketRule?: unknown;
  reviewStageContracts?: unknown;
  reviewerCommandFlow?: unknown;
  acceptanceCriteria?: unknown;
};

type ReviewScope = {
  stage?: unknown;
  title?: unknown;
  owner?: unknown;
  selectedBookCount?: unknown;
  sensitiveBookCount?: unknown;
  requiredFields?: unknown;
  acceptanceChecklist?: unknown;
  evidenceBoundary?: unknown;
  outOfScopeBoundary?: unknown;
  completionBoundary?: unknown;
};
type ReviewStageId =
  | "all"
  | "editorial-review"
  | "source-relevance-review"
  | "qualified-scholar-review"
  | "quality-checklist"
  | "publish-approval";

const MIN_REVIEW_NOTE_LENGTH = 40;
const REVIEW_SCOPE_STAGES = new Set([
  "all",
  "editorial-review",
  "source-relevance-review",
  "qualified-scholar-review",
  "quality-checklist",
  "publish-approval",
]);
const STAGE_QUALITY_CHECKLIST_FIELDS = {
  "editorial-review": [
    "titleAndPromiseAccurate",
    "chapterContentComplete",
    "audienceAndToneApproved",
  ],
  "source-relevance-review": [
    "sourcesRelevantAndSpecific",
    "noUnsupportedClaims",
  ],
  "quality-checklist": QUALITY_CHECKLIST_FIELDS,
} satisfies Partial<Record<ReviewStageId, readonly QualityChecklistKey[]>>;

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validDate(value: unknown) {
  if (!hasText(value)) return false;
  const text = cleanText(value);
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return false;
  return /^\d{4}-\d{2}-\d{2}/.test(text);
}

function isFutureDate(value: unknown) {
  if (!validDate(value)) return false;
  return Date.parse(cleanText(value)) > Date.now() + 24 * 60 * 60 * 1000;
}

function loadEvidenceFile() {
  const raw = fs.readFileSync(evidencePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Evidence file must be a JSON object.");
  }
  const object = parsed as Record<string, unknown>;
  const records = object.records;
  if (!Array.isArray(records)) {
    throw new Error("Evidence file must include a records array.");
  }
  return {
    schemaVersion: object.schemaVersion,
    generatedFrom: object.generatedFrom,
    reviewProofPlan: object.reviewProofPlan as ReviewProofPlan | undefined,
    reviewScope: object.reviewScope as ReviewScope | undefined,
    records: records as EvidenceRecord[],
  };
}

const findings: Finding[] = [];

function addFinding(id: string, severity: Severity, message: string) {
  findings.push({ id, severity, message });
}

const bookById = new Map(LIBRARY_BOOKS.map((book) => [book.id, book]));
let evidence;

try {
  evidence = loadEvidenceFile();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const report = {
    valid: false,
    readyForHighestStandardClaim: false,
    evidencePath,
    blockerCount: 1,
    warningCount: 0,
    findings: [
      {
        id: "evidence-file",
        severity: "blocker",
        message,
      },
    ],
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

if (evidence.schemaVersion !== 2) {
  addFinding(
    "schema-version",
    "blocker",
    "Evidence file must set schemaVersion to 2.",
  );
}

function validateReviewProofPlan(reviewProofPlan: ReviewProofPlan | undefined) {
  if (
    !reviewProofPlan ||
    typeof reviewProofPlan !== "object" ||
    Array.isArray(reviewProofPlan)
  ) {
    addFinding(
      "review-proof-plan",
      "blocker",
      "Evidence file must include the reviewProofPlan boundary from the current intake.",
    );
    return {
      hasReviewProofPlan: false,
      reviewerCommandFlowCount: 0,
      acceptanceCriteriaCount: 0,
    };
  }

  const requiredTextFields = [
    "proofBoundary",
    "currentClaimAllowed",
    "completedEvidenceFileRule",
    "perBookAcceptancePacketRule",
  ] satisfies (keyof ReviewProofPlan)[];
  for (const field of requiredTextFields) {
    if (!hasRealText(reviewProofPlan[field])) {
      addFinding(
        `review-proof-plan:${field}`,
        "blocker",
        `reviewProofPlan.${field} must be carried into completed evidence files.`,
      );
    }
  }

  const commandFlow = Array.isArray(reviewProofPlan.reviewerCommandFlow)
    ? (reviewProofPlan.reviewerCommandFlow as Record<string, unknown>[])
    : [];
  if (commandFlow.length === 0) {
    addFinding(
      "review-proof-plan:reviewer-command-flow",
      "blocker",
      "reviewProofPlan.reviewerCommandFlow must include the validation and import command flow.",
    );
  }

  const requiredCommands = [
    "export:library-review-packets",
    "export:library-review-evidence-intake",
    "validate:library-review-evidence",
    "apply:library-review-evidence",
    "check:library-content-completion",
  ];
  for (const command of requiredCommands) {
    const present = commandFlow.some((step) =>
      cleanText(step.command).includes(command),
    );
    if (!present) {
      addFinding(
        `review-proof-plan:${command}`,
        "blocker",
        `reviewProofPlan.reviewerCommandFlow must include ${command}.`,
      );
    }
  }

  const acceptanceCriteria = Array.isArray(reviewProofPlan.acceptanceCriteria)
    ? reviewProofPlan.acceptanceCriteria
    : [];
  if (acceptanceCriteria.length < 5) {
    addFinding(
      "review-proof-plan:acceptance-criteria",
      "blocker",
      "reviewProofPlan.acceptanceCriteria must carry the publication acceptance criteria.",
    );
  }

  const stageContracts = Array.isArray(reviewProofPlan.reviewStageContracts)
    ? (reviewProofPlan.reviewStageContracts as Record<string, unknown>[])
    : [];
  const requiredStageContracts = [
    {
      stage: "editorial-review",
      fields: [
        "editorialReviewer",
        "editorialReviewedAt",
        "editorialNotes",
        "qualityChecklist.titleAndPromiseAccurate",
        "qualityChecklist.chapterContentComplete",
      ],
    },
    {
      stage: "source-relevance-review",
      fields: [
        "sourceReviewer",
        "sourceReviewedAt",
        "sourceNotes",
        "qualityChecklist.sourcesRelevantAndSpecific",
        "qualityChecklist.noUnsupportedClaims",
      ],
    },
    {
      stage: "qualified-scholar-review",
      fields: [
        "qualifiedScholarReviewer",
        "qualifiedScholarReviewedAt",
        "scholarReviewScope",
        "scholarNotes",
      ],
    },
    {
      stage: "publish-approval",
      fields: [
        "publishApprover",
        "publishApprovedAt",
        "publishNotes",
        "approvedForPublication",
        "contentHash",
      ],
    },
  ];
  for (const requiredStage of requiredStageContracts) {
    const contract = stageContracts.find(
      (stage) => cleanText(stage.stage) === requiredStage.stage,
    );
    if (!contract) {
      addFinding(
        `review-proof-plan:${requiredStage.stage}`,
        "blocker",
        `reviewProofPlan.reviewStageContracts must include ${requiredStage.stage}.`,
      );
      continue;
    }
    if (
      !hasRealText(contract.owner) ||
      !hasRealText(contract.reviewerMustConfirm) ||
      !hasRealText(contract.rejectIf)
    ) {
      addFinding(
        `review-proof-plan:${requiredStage.stage}:guidance`,
        "blocker",
        `${requiredStage.stage} must include owner, reviewerMustConfirm, and rejectIf guidance.`,
      );
    }
    const fields = Array.isArray(contract.requiredFields)
      ? contract.requiredFields.map(cleanText)
      : [];
    for (const field of requiredStage.fields) {
      if (!fields.includes(field)) {
        addFinding(
          `review-proof-plan:${requiredStage.stage}:${field}`,
          "blocker",
          `${requiredStage.stage} must list ${field} in requiredFields.`,
        );
      }
    }
  }

  return {
    hasReviewProofPlan: true,
    reviewStageContractCount: stageContracts.length,
    reviewerCommandFlowCount: commandFlow.length,
    acceptanceCriteriaCount: acceptanceCriteria.length,
  };
}

const reviewProofPlanSummary = validateReviewProofPlan(
  evidence.reviewProofPlan,
);

function validateReviewScope(reviewScope: ReviewScope | undefined) {
  if (
    !reviewScope ||
    typeof reviewScope !== "object" ||
    Array.isArray(reviewScope)
  ) {
    addFinding(
      "review-scope",
      "blocker",
      "Evidence file must include reviewScope from the current intake so reviewer stage, owner, and boundaries are preserved.",
    );
    return {
      hasReviewScope: false,
      reviewScopeStage: "",
      reviewScopeRequiredFieldCount: 0,
      reviewScopeAcceptanceCount: 0,
    };
  }

  const stage = cleanText(reviewScope.stage);
  if (!REVIEW_SCOPE_STAGES.has(stage)) {
    addFinding(
      "review-scope:stage",
      "blocker",
      "reviewScope.stage must be a known stage from the generated intake.",
    );
  }

  for (const field of [
    "title",
    "owner",
    "evidenceBoundary",
    "outOfScopeBoundary",
    "completionBoundary",
  ] satisfies (keyof ReviewScope)[]) {
    if (!hasRealText(reviewScope[field])) {
      addFinding(
        `review-scope:${field}`,
        "blocker",
        `reviewScope.${field} must be carried into completed evidence files.`,
      );
    }
  }

  const requiredFields = Array.isArray(reviewScope.requiredFields)
    ? reviewScope.requiredFields.map(cleanText).filter(Boolean)
    : [];
  if (requiredFields.length === 0) {
    addFinding(
      "review-scope:required-fields",
      "blocker",
      "reviewScope.requiredFields must list the fields this reviewer is expected to complete.",
    );
  }

  const acceptanceChecklist = Array.isArray(reviewScope.acceptanceChecklist)
    ? reviewScope.acceptanceChecklist.map(cleanText).filter(Boolean)
    : [];
  if (acceptanceChecklist.length < 3) {
    addFinding(
      "review-scope:acceptance-checklist",
      "blocker",
      "reviewScope.acceptanceChecklist must carry at least three acceptance items.",
    );
  }

  if (
    typeof reviewScope.selectedBookCount !== "number" ||
    reviewScope.selectedBookCount < 1
  ) {
    addFinding(
      "review-scope:selected-book-count",
      "blocker",
      "reviewScope.selectedBookCount must name the reviewer batch size.",
    );
  }

  return {
    hasReviewScope: true,
    reviewScopeStage: stage,
    reviewScopeRequiredFieldCount: requiredFields.length,
    reviewScopeAcceptanceCount: acceptanceChecklist.length,
  };
}

const reviewScopeSummary = validateReviewScope(evidence.reviewScope);

const seenBookIds = new Set<string>();
const completeBookIds = new Set<string>();
const sensitiveCompleteBookIds = new Set<string>();

function validateReviewerAcceptancePacket(record: EvidenceRecord, book: Book) {
  const bookId = book.id;
  const packet =
    record.reviewerAcceptancePacket &&
    typeof record.reviewerAcceptancePacket === "object" &&
    !Array.isArray(record.reviewerAcceptancePacket)
      ? (record.reviewerAcceptancePacket as Record<string, unknown>)
      : null;
  if (!packet) {
    addFinding(
      bookId,
      "blocker",
      "reviewerAcceptancePacket must be preserved from the generated intake.",
    );
    return {
      hasReviewerAcceptancePacket: false,
      reviewerAcceptanceStageCount: 0,
    };
  }

  if (cleanText(packet.bookId) !== bookId) {
    addFinding(
      bookId,
      "blocker",
      "reviewerAcceptancePacket.bookId must match the evidence record bookId.",
    );
  }
  for (const field of [
    "exportCommand",
    "contentHashRule",
    "reviewerPath",
    "noSecretBoundary",
    "claimBoundary",
  ]) {
    if (!hasRealText(packet[field])) {
      addFinding(
        bookId,
        "blocker",
        `reviewerAcceptancePacket.${field} must be carried into completed evidence.`,
      );
    }
  }
  if (!cleanText(packet.exportCommand).includes(bookId)) {
    addFinding(
      bookId,
      "blocker",
      "reviewerAcceptancePacket.exportCommand must be scoped to this book.",
    );
  }
  if (
    !cleanText(packet.claimBoundary).includes("not approval evidence") ||
    !cleanText(packet.noSecretBoundary).includes("credentials")
  ) {
    addFinding(
      bookId,
      "blocker",
      "reviewerAcceptancePacket must preserve claim and no-secret boundaries.",
    );
  }

  const stages = Array.isArray(packet.stages)
    ? (packet.stages as Record<string, unknown>[])
    : [];
  const requiredStages = [
    "editorial-review",
    "source-relevance-review",
    "quality-checklist",
    ...(isSensitiveBook(book) ? ["qualified-scholar-review"] : []),
    "publish-approval",
  ];
  for (const stage of requiredStages) {
    const packetStage = stages.find(
      (candidate) => cleanText(candidate.stage) === stage,
    );
    if (!packetStage) {
      addFinding(
        bookId,
        "blocker",
        `reviewerAcceptancePacket.stages must include ${stage}.`,
      );
      continue;
    }
    if (
      !hasRealText(packetStage.owner) ||
      !Array.isArray(packetStage.requiredFields) ||
      !hasRealText(packetStage.evidenceBoundary) ||
      !hasRealText(packetStage.outOfScopeBoundary)
    ) {
      addFinding(
        bookId,
        "blocker",
        `${stage} acceptance packet stage must include owner, requiredFields, evidenceBoundary, and outOfScopeBoundary.`,
      );
    }
  }

  return {
    hasReviewerAcceptancePacket: true,
    reviewerAcceptanceStageCount: stages.length,
  };
}

function requireRealField(
  record: EvidenceRecord,
  bookId: string,
  field: keyof EvidenceRecord,
  label: string,
) {
  if (!hasRealText(record[field])) {
    addFinding(bookId, "blocker", `${label} is required.`);
    return false;
  }
  return true;
}

function requireDetailedField(
  record: EvidenceRecord,
  bookId: string,
  field: keyof EvidenceRecord,
  label: string,
) {
  if (!requireRealField(record, bookId, field, label)) return false;
  if (cleanText(record[field]).length < MIN_REVIEW_NOTE_LENGTH) {
    addFinding(
      bookId,
      "blocker",
      `${label} must include at least ${MIN_REVIEW_NOTE_LENGTH} characters of specific review detail.`,
    );
    return false;
  }
  return true;
}

function requireDateField(
  record: EvidenceRecord,
  bookId: string,
  field: keyof EvidenceRecord,
  label: string,
) {
  if (!validDate(record[field])) {
    addFinding(bookId, "blocker", `${label} must be an ISO-like date.`);
    return false;
  }
  if (isFutureDate(record[field])) {
    addFinding(bookId, "blocker", `${label} must not be in the future.`);
    return false;
  }
  return true;
}

function requireNotBefore(
  record: EvidenceRecord,
  bookId: string,
  earlierField: keyof EvidenceRecord,
  laterField: keyof EvidenceRecord,
  earlierLabel: string,
  laterLabel: string,
) {
  if (!validDate(record[earlierField]) || !validDate(record[laterField])) {
    return false;
  }
  if (
    Date.parse(cleanText(record[laterField])) <
    Date.parse(cleanText(record[earlierField]))
  ) {
    addFinding(
      bookId,
      "blocker",
      `${laterLabel} must not be before ${earlierLabel}.`,
    );
    return false;
  }
  return true;
}

function qualityChecklistComplete(record: EvidenceRecord, bookId: string) {
  const checklist = record.qualityChecklist;
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    addFinding(
      bookId,
      "blocker",
      "Quality checklist is required before publication approval.",
    );
    return false;
  }

  let complete = true;
  const values = checklist as Partial<Record<QualityChecklistKey, unknown>>;
  for (const field of QUALITY_CHECKLIST_FIELDS) {
    if (values[field] !== true) {
      addFinding(
        bookId,
        "blocker",
        `Quality checklist missing: ${QUALITY_CHECKLIST_FIELD_LABELS[field]}.`,
      );
      complete = false;
    }
  }
  return complete;
}

function qualityChecklistFieldsComplete(
  record: EvidenceRecord,
  bookId: string,
  fields: readonly QualityChecklistKey[],
) {
  const checklist = record.qualityChecklist;
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    addFinding(
      bookId,
      "blocker",
      "Quality checklist is required before stage evidence can be accepted.",
    );
    return false;
  }

  let complete = true;
  const values = checklist as Partial<Record<QualityChecklistKey, unknown>>;
  for (const field of fields) {
    if (values[field] !== true) {
      addFinding(
        bookId,
        "blocker",
        `Stage checklist missing: ${QUALITY_CHECKLIST_FIELD_LABELS[field]}.`,
      );
      complete = false;
    }
  }
  return complete;
}

function validateRecord(record: EvidenceRecord, index: number) {
  const bookId = cleanText(record.bookId);
  if (!bookId) {
    addFinding(
      `record-${index + 1}:bookId`,
      "blocker",
      "Every evidence record must include a bookId.",
    );
    return;
  }
  const book = bookById.get(bookId);
  if (!book) {
    addFinding(bookId, "blocker", `Unknown bookId '${bookId}'.`);
    return;
  }
  if (seenBookIds.has(bookId)) {
    addFinding(bookId, "blocker", `${book.title} has duplicate evidence.`);
    return;
  }
  seenBookIds.add(bookId);

  const sensitive = isSensitiveBook(book);
  const expectedContentHash = computeBookContentHash(book);
  validateReviewerAcceptancePacket(record, book);
  const requiredChecks = [
    requireRealField(record, bookId, "contentHash", "Content hash"),
    requireRealField(record, bookId, "editorialReviewer", "Editorial reviewer"),
    requireDateField(
      record,
      bookId,
      "editorialReviewedAt",
      "Editorial review date",
    ),
    requireDetailedField(record, bookId, "editorialNotes", "Editorial notes"),
    requireRealField(record, bookId, "sourceReviewer", "Source reviewer"),
    requireDateField(record, bookId, "sourceReviewedAt", "Source review date"),
    requireDetailedField(
      record,
      bookId,
      "sourceNotes",
      "Source relevance notes",
    ),
    requireRealField(record, bookId, "publishApprover", "Publish approver"),
    requireDateField(
      record,
      bookId,
      "publishApprovedAt",
      "Publish approval date",
    ),
    requireDetailedField(record, bookId, "publishNotes", "Publish notes"),
    qualityChecklistComplete(record, bookId),
    requireNotBefore(
      record,
      bookId,
      "editorialReviewedAt",
      "publishApprovedAt",
      "Editorial review date",
      "Publish approval date",
    ),
    requireNotBefore(
      record,
      bookId,
      "sourceReviewedAt",
      "publishApprovedAt",
      "Source review date",
      "Publish approval date",
    ),
  ];

  if (
    hasRealText(record.contentHash) &&
    cleanText(record.contentHash) !== expectedContentHash
  ) {
    addFinding(
      bookId,
      "blocker",
      `${book.title} evidence contentHash does not match the current book packet. Expected ${expectedContentHash}.`,
    );
    requiredChecks.push(false);
  }

  if (record.approvedForPublication !== true) {
    addFinding(
      bookId,
      "blocker",
      `${book.title} must explicitly set approvedForPublication to true before it can count as complete review evidence.`,
    );
    requiredChecks.push(false);
  }

  if (sensitive) {
    requiredChecks.push(
      requireRealField(
        record,
        bookId,
        "qualifiedScholarReviewer",
        "Qualified scholar reviewer",
      ),
      requireDateField(
        record,
        bookId,
        "qualifiedScholarReviewedAt",
        "Qualified scholar review date",
      ),
      requireRealField(
        record,
        bookId,
        "scholarReviewScope",
        "Scholar review scope",
      ),
      requireDetailedField(record, bookId, "scholarNotes", "Scholar notes"),
      requireNotBefore(
        record,
        bookId,
        "qualifiedScholarReviewedAt",
        "publishApprovedAt",
        "Qualified scholar review date",
        "Publish approval date",
      ),
    );
    if (
      hasRealText(record.scholarReviewScope) &&
      cleanText(record.scholarReviewScope).length < 40
    ) {
      addFinding(
        bookId,
        "blocker",
        "Scholar review scope must be specific enough to describe what was and was not reviewed.",
      );
      requiredChecks.push(false);
    }
  }

  if (requiredChecks.every(Boolean)) {
    completeBookIds.add(bookId);
    if (sensitive) sensitiveCompleteBookIds.add(bookId);
  }
}

function validateStageRecord(
  record: EvidenceRecord,
  index: number,
  stage: Exclude<ReviewStageId, "all">,
) {
  const bookId = cleanText(record.bookId);
  if (!bookId) {
    addFinding(
      `record-${index + 1}:bookId`,
      "blocker",
      "Every evidence record must include a bookId.",
    );
    return;
  }
  const book = bookById.get(bookId);
  if (!book) {
    addFinding(bookId, "blocker", `Unknown bookId '${bookId}'.`);
    return;
  }
  if (seenBookIds.has(bookId)) {
    addFinding(bookId, "blocker", `${book.title} has duplicate evidence.`);
    return;
  }
  seenBookIds.add(bookId);

  const sensitive = isSensitiveBook(book);
  const expectedContentHash = computeBookContentHash(book);
  validateReviewerAcceptancePacket(record, book);

  const requiredChecks = [
    requireRealField(record, bookId, "contentHash", "Content hash"),
  ];

  if (
    hasRealText(record.contentHash) &&
    cleanText(record.contentHash) !== expectedContentHash
  ) {
    addFinding(
      bookId,
      "blocker",
      `${book.title} evidence contentHash does not match the current book packet. Expected ${expectedContentHash}.`,
    );
    requiredChecks.push(false);
  }

  if (stage === "editorial-review") {
    requiredChecks.push(
      requireRealField(
        record,
        bookId,
        "editorialReviewer",
        "Editorial reviewer",
      ),
      requireDateField(
        record,
        bookId,
        "editorialReviewedAt",
        "Editorial review date",
      ),
      requireDetailedField(record, bookId, "editorialNotes", "Editorial notes"),
      qualityChecklistFieldsComplete(
        record,
        bookId,
        STAGE_QUALITY_CHECKLIST_FIELDS["editorial-review"],
      ),
    );
  }

  if (stage === "source-relevance-review") {
    requiredChecks.push(
      requireRealField(record, bookId, "sourceReviewer", "Source reviewer"),
      requireDateField(
        record,
        bookId,
        "sourceReviewedAt",
        "Source review date",
      ),
      requireDetailedField(
        record,
        bookId,
        "sourceNotes",
        "Source relevance notes",
      ),
      qualityChecklistFieldsComplete(
        record,
        bookId,
        STAGE_QUALITY_CHECKLIST_FIELDS["source-relevance-review"],
      ),
    );
  }

  if (stage === "quality-checklist") {
    requiredChecks.push(
      qualityChecklistFieldsComplete(
        record,
        bookId,
        STAGE_QUALITY_CHECKLIST_FIELDS["quality-checklist"],
      ),
    );
  }

  if (stage === "qualified-scholar-review") {
    if (!sensitive) {
      addFinding(
        bookId,
        "warning",
        `${book.title} is not flagged as sensitive/high-care; qualified scholar stage evidence is not required for this book.`,
      );
    } else {
      requiredChecks.push(
        requireRealField(
          record,
          bookId,
          "qualifiedScholarReviewer",
          "Qualified scholar reviewer",
        ),
        requireDateField(
          record,
          bookId,
          "qualifiedScholarReviewedAt",
          "Qualified scholar review date",
        ),
        requireRealField(
          record,
          bookId,
          "scholarReviewScope",
          "Scholar review scope",
        ),
        requireDetailedField(record, bookId, "scholarNotes", "Scholar notes"),
      );
      if (
        hasRealText(record.scholarReviewScope) &&
        cleanText(record.scholarReviewScope).length < 40
      ) {
        addFinding(
          bookId,
          "blocker",
          "Scholar review scope must be specific enough to describe what was and was not reviewed.",
        );
        requiredChecks.push(false);
      }
    }
  }

  if (stage === "publish-approval") {
    requiredChecks.push(
      requireRealField(record, bookId, "publishApprover", "Publish approver"),
      requireDateField(
        record,
        bookId,
        "publishApprovedAt",
        "Publish approval date",
      ),
      requireDetailedField(record, bookId, "publishNotes", "Publish notes"),
    );
    if (record.approvedForPublication !== true) {
      addFinding(
        bookId,
        "blocker",
        `${book.title} must explicitly set approvedForPublication to true before publish-approval stage evidence can count.`,
      );
      requiredChecks.push(false);
    }
  }

  if (requiredChecks.every(Boolean)) {
    completeBookIds.add(bookId);
    if (sensitive) sensitiveCompleteBookIds.add(bookId);
  }
}

const reviewScopeStage = reviewScopeSummary.reviewScopeStage;
const stageValidationOnly =
  reviewScopeStage !== "" && reviewScopeStage !== "all";

if (stageValidationOnly) {
  evidence.records.forEach((record, index) =>
    validateStageRecord(
      record,
      index,
      reviewScopeStage as Exclude<ReviewStageId, "all">,
    ),
  );
} else {
  evidence.records.forEach(validateRecord);
}

if (!stageValidationOnly) {
  for (const book of LIBRARY_BOOKS) {
    if (!seenBookIds.has(book.id)) {
      addFinding(
        book.id,
        "warning",
        `${book.title} has no review evidence record in ${evidencePath}.`,
      );
    }
  }
}

const sensitiveBookCount = LIBRARY_BOOKS.filter(isSensitiveBook).length;
const qualityChecklistCompleteCount = evidence.records.filter((record) => {
  const checklist = record.qualityChecklist;
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    return false;
  }
  const values = checklist as Partial<Record<QualityChecklistKey, unknown>>;
  return QUALITY_CHECKLIST_FIELDS.every((field) => values[field] === true);
}).length;
const blockerCount = findings.filter(
  (finding) => finding.severity === "blocker",
).length;
const warningCount = findings.filter(
  (finding) => finding.severity === "warning",
).length;
const readyForHighestStandardClaim =
  !stageValidationOnly &&
  blockerCount === 0 &&
  completeBookIds.size === LIBRARY_BOOKS.length;

const report = {
  valid: blockerCount === 0,
  readyForHighestStandardClaim,
  stageValidationOnly,
  stageCompleteEvidenceCount: stageValidationOnly ? completeBookIds.size : 0,
  evidencePath,
  schemaVersion: evidence.schemaVersion,
  ...reviewProofPlanSummary,
  ...reviewScopeSummary,
  bookCount: LIBRARY_BOOKS.length,
  evidenceRecordCount: evidence.records.length,
  completeEvidenceCount: completeBookIds.size,
  qualityChecklistCompleteCount,
  missingEvidenceCount: stageValidationOnly
    ? 0
    : LIBRARY_BOOKS.length - seenBookIds.size,
  sensitiveBookCount,
  sensitiveCompleteEvidenceCount: sensitiveCompleteBookIds.size,
  blockerCount,
  warningCount,
  findings,
};

if (wantsSummaryJson) {
  const { findings: _findings, ...summary } = report;
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(JSON.stringify(report, null, 2));
}

if (
  blockerCount > 0 ||
  (wantsStrict && !stageValidationOnly && !readyForHighestStandardClaim)
) {
  process.exitCode = 1;
}
