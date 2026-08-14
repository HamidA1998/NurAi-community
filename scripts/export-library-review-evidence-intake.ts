#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

import { LIBRARY_BOOKS } from "../client/data/libraryBooks";
import { computeBookContentHash } from "./lib/libraryContentHash";
import {
  isSensitiveBook,
  QUALITY_CHECKLIST_FIELDS,
  type QualityChecklistKey,
} from "./lib/libraryReviewEvidence";

type Book = (typeof LIBRARY_BOOKS)[number];
type ReviewStageId =
  | "all"
  | "editorial-review"
  | "source-relevance-review"
  | "qualified-scholar-review"
  | "quality-checklist"
  | "publish-approval";
type BookAcceptancePacketStage = Exclude<ReviewStageId, "all">;

const DEFAULT_OUTPUT_PATH = "docs/audit/library-review-evidence.intake.json";

const wantsJson = process.argv.includes("--json");
const wantsSummaryJson = process.argv.includes("--summary-json");
const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");

function emptyQualityChecklist(): Record<QualityChecklistKey, boolean> {
  return Object.fromEntries(
    QUALITY_CHECKLIST_FIELDS.map((field) => [field, false]),
  ) as Record<QualityChecklistKey, boolean>;
}

function argValue(name: string, fallback: string | null = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const REVIEW_STAGE_SCOPES: Record<
  ReviewStageId,
  {
    title: string;
    owner: string;
    requiredFields: string[];
    acceptanceChecklist: string[];
    evidenceBoundary: string;
    outOfScopeBoundary: string;
  }
> = {
  all: {
    title: "Complete Library review evidence",
    owner: "Editorial, source, scholar, QA, and publish reviewers",
    requiredFields: [
      "editorialReviewer",
      "editorialReviewedAt",
      "editorialNotes",
      "sourceReviewer",
      "sourceReviewedAt",
      "sourceNotes",
      "qualityChecklist.*",
      "qualifiedScholarReviewer for sensitive books",
      "qualifiedScholarReviewedAt for sensitive books",
      "scholarReviewScope for sensitive books",
      "scholarNotes for sensitive books",
      "approvedForPublication",
      "publishApprover",
      "publishApprovedAt",
      "publishNotes",
      "contentHash",
    ],
    acceptanceChecklist: [
      "All required review stages are complete for every selected book.",
      "Every qualityChecklist field is true only after explicit human review.",
      "Publish approval follows editorial, source, and qualified-scholar review dates where required.",
      "The evidence file validates without --allow-review-pending before whole-library completion claims.",
    ],
    evidenceBoundary:
      "This scope is for complete evidence. It can support publication claims only after strict validation and import pass.",
    outOfScopeBoundary:
      "Do not use a partial or staged version of this file for whole-library, fully reviewed, or scholar-reviewed claims.",
  },
  "editorial-review": {
    title: "Editorial promise review",
    owner: "Editorial reviewer",
    requiredFields: [
      "editorialReviewer",
      "editorialReviewedAt",
      "editorialNotes",
      "qualityChecklist.titleAndPromiseAccurate",
      "qualityChecklist.chapterContentComplete",
      "qualityChecklist.audienceAndToneApproved",
    ],
    acceptanceChecklist: [
      "The title, subtitle, description, and chapter sequence match what the book actually teaches.",
      "Editorial notes are specific to the book and explain promise, audience, and tone decisions.",
      "Any thin chapter, overpromising card copy, or generated-draft feel is fixed before sign-off.",
    ],
    evidenceBoundary: "This stage can clear editorial promise review only.",
    outOfScopeBoundary:
      "It cannot be used as source relevance, scholar review, quality checklist completion, or publish approval evidence.",
  },
  "source-relevance-review": {
    title: "Source relevance review",
    owner: "Source reviewer",
    requiredFields: [
      "sourceReviewer",
      "sourceReviewedAt",
      "sourceNotes",
      "qualityChecklist.sourcesRelevantAndSpecific",
      "qualityChecklist.noUnsupportedClaims",
    ],
    acceptanceChecklist: [
      "Every source card is relevant to its chapter and supports the claims being made.",
      "Source notes identify any broad, repeated, or unrelated source card before evidence is accepted.",
      "Unsupported religious, medical, legal, or outcome claims are removed or explicitly rejected.",
    ],
    evidenceBoundary: "This stage can clear source relevance review only.",
    outOfScopeBoundary:
      "It does not approve publication, scholar scope, editorial promise, or final religious claims.",
  },
  "qualified-scholar-review": {
    title: "Qualified scholar review",
    owner: "Qualified scholar reviewer",
    requiredFields: [
      "qualifiedScholarReviewer",
      "qualifiedScholarReviewedAt",
      "scholarReviewScope",
      "scholarNotes",
    ],
    acceptanceChecklist: [
      "The scholar records exactly what high-care content was reviewed.",
      "scholarReviewScope explains what remains outside the review scope.",
      "Scholar notes are specific and dated before or on the publish approval date.",
    ],
    evidenceBoundary:
      "This stage can clear qualified-scholar review scope only.",
    outOfScopeBoundary:
      "It does not create publication approval, source relevance approval, or whole-library scholar-reviewed claims.",
  },
  "quality-checklist": {
    title: "Publication quality checklist",
    owner: "QA reviewer",
    requiredFields: QUALITY_CHECKLIST_FIELDS.map(
      (field) => `qualityChecklist.${field}`,
    ),
    acceptanceChecklist: [
      "Each checklist field is true only after the reviewer explicitly clears the current content hash.",
      "Checklist approval covers promise accuracy, chapter completeness, source relevance, unsupported claims, exercises, audience, tone, and safety boundaries.",
      "Partial checklist completion keeps the book review-ready and cannot support publication claims.",
    ],
    evidenceBoundary: "This stage can clear checklist readiness only.",
    outOfScopeBoundary:
      "Publication remains blocked until named review stages and publish approval also validate.",
  },
  "publish-approval": {
    title: "Publish approval decision",
    owner: "Publish approver",
    requiredFields: [
      "approvedForPublication",
      "publishApprover",
      "publishApprovedAt",
      "publishNotes",
      "contentHash",
    ],
    acceptanceChecklist: [
      "approvedForPublication is true only after editorial, source, required scholar review, and quality checklist evidence validate.",
      "publishNotes explain why the current content hash is ready to publish.",
      "Publish approval dates are not earlier than earlier required review dates.",
    ],
    evidenceBoundary:
      "This stage can clear the final publish decision only when earlier evidence is already valid for the same content hash.",
    outOfScopeBoundary:
      "It cannot bypass missing editorial, source, scholar, or quality checklist evidence.",
  },
};

function selectedReviewStage(): ReviewStageId {
  const stage = (argValue("--stage", "all") || "all") as ReviewStageId;
  if (!Object.prototype.hasOwnProperty.call(REVIEW_STAGE_SCOPES, stage)) {
    console.error(
      `Unknown --stage "${stage}". Expected one of: ${Object.keys(
        REVIEW_STAGE_SCOPES,
      ).join(", ")}.`,
    );
    process.exit(1);
  }
  return stage;
}

function reviewPriority(book: Book) {
  if (isSensitiveBook(book)) return "qualified-scholar";
  if (book.requiredPlan === "free" || book.featured) return "editorial-first";
  if (book.requiredPlan === "scholar") return "scholar-plan";
  return "standard-editorial";
}

function requiredReviewEvidence(book: Book) {
  return [
    "editorial-review",
    "source-relevance-review",
    "quality-checklist",
    ...(isSensitiveBook(book) ? ["qualified-scholar-review"] : []),
    "publish-approval",
  ];
}

function acceptanceStagesForBook(book: Book): BookAcceptancePacketStage[] {
  return [
    "editorial-review",
    "source-relevance-review",
    "quality-checklist",
    ...(isSensitiveBook(book)
      ? (["qualified-scholar-review"] as BookAcceptancePacketStage[])
      : []),
    "publish-approval",
  ];
}

function buildBookAcceptancePacket(book: Book) {
  const sensitive = isSensitiveBook(book);
  const evidenceFile = `/absolute/path/to/${book.id}-library-review-evidence.json`;
  return {
    bookId: book.id,
    title: book.title,
    priority: reviewPriority(book),
    sensitive,
    exportCommand: `npm run export:library-review-evidence-intake -- --write --book-id ${book.id} --out ${evidenceFile}`,
    evidenceFile,
    contentHashRule:
      "Preserve this record's contentHash exactly; validation rejects stale or changed hashes.",
    reviewerPath: sensitive
      ? "High-care book: qualified scholar scope must be completed before publish approval can count."
      : "Standard book: keep editorial, source, QA, and publish evidence separated.",
    noSecretBoundary:
      "Do not include private contact details, credentials, screenshots, chat transcripts, cookies, auth headers, database URLs, or API keys in reviewer evidence.",
    claimBoundary:
      "This packet is coordination only. It is not approval evidence until completed JSON validates, dry-runs, imports, and the strict Library gate passes.",
    handoffChecklist: [
      "Export this per-book packet fresh before review starts.",
      "Complete only the stages the reviewer is qualified to sign.",
      "Use real reviewer name, role, date, scoped notes, and matching contentHash.",
      "Run validation and dry-run import before any guarded write.",
    ],
    stages: acceptanceStagesForBook(book).map((stage) => {
      const scope = REVIEW_STAGE_SCOPES[stage];
      return {
        stage,
        owner: scope.owner,
        requiredFields: scope.requiredFields,
        acceptanceChecklist: scope.acceptanceChecklist,
        evidenceBoundary: scope.evidenceBoundary,
        outOfScopeBoundary: scope.outOfScopeBoundary,
      };
    }),
  };
}

function buildReviewProofPlan() {
  return {
    proofBoundary:
      "This intake is a blank, hash-bound reviewer workspace. It is not review evidence, publish approval, or a scholar-reviewed claim until a completed external copy validates and imports.",
    currentClaimAllowed:
      "The Library can be described as written, source-linked, and review-ready. It cannot be described as fully published, fully approved, or fully scholar-reviewed.",
    completedEvidenceFileRule:
      "Reviewers must complete a copy outside the repo or in a controlled evidence location, preserve every contentHash, and provide real names, dates, specific notes, quality-checklist decisions, and publication approval.",
    perBookAcceptancePacketRule:
      "Each record carries a reviewerAcceptancePacket naming the exact stage boundaries, no-secret rule, contentHash rule, and per-book export command reviewers must preserve in completed evidence.",
    reviewStageContracts: [
      {
        stage: "editorial-review",
        owner: "Editorial reviewer",
        requiredFields: [
          "editorialReviewer",
          "editorialReviewedAt",
          "editorialNotes",
          "qualityChecklist.titleAndPromiseAccurate",
          "qualityChecklist.chapterContentComplete",
          "qualityChecklist.audienceAndToneApproved",
        ],
        reviewerMustConfirm:
          "The book title, subtitle, description, chapter sequence, audience level, and tone match the actual content and do not overpromise what the book teaches.",
        rejectIf:
          "Any chapter is thin, confusing, mismatched to the promise, unsafe for the intended audience, or still reads like generated draft material.",
      },
      {
        stage: "source-relevance-review",
        owner: "Source reviewer",
        requiredFields: [
          "sourceReviewer",
          "sourceReviewedAt",
          "sourceNotes",
          "qualityChecklist.sourcesRelevantAndSpecific",
          "qualityChecklist.noUnsupportedClaims",
        ],
        reviewerMustConfirm:
          "Every source card is relevant to its chapter, supports the claims being made, and leaves unsupported religious, medical, legal, or outcome claims out of the published copy.",
        rejectIf:
          "A source is merely a broad URL, a repeated generic anchor, unrelated to the lesson, or being used to support a claim it does not actually establish.",
      },
      {
        stage: "qualified-scholar-review",
        owner: "Qualified scholar reviewer for sensitive books",
        requiredFields: [
          "qualifiedScholarReviewer",
          "qualifiedScholarReviewedAt",
          "scholarReviewScope",
          "scholarNotes",
        ],
        reviewerMustConfirm:
          "For high-care fiqh, hadith, family, finance, pilgrimage, and worship topics, the scholar records exactly what was reviewed and what remains outside the review scope.",
        rejectIf:
          "The book gives personal rulings, madhhab-specific direction, hadith grading, pilgrimage/legal/medical/financial advice, or sensitive worship instructions without qualified scope notes.",
      },
      {
        stage: "publish-approval",
        owner: "Publish approver",
        requiredFields: [
          "publishApprover",
          "publishApprovedAt",
          "publishNotes",
          "approvedForPublication",
          "contentHash",
        ],
        reviewerMustConfirm:
          "Publication approval happens only after the required earlier review stages are complete for the same contentHash and claims stay scoped to the evidence actually attached.",
        rejectIf:
          "The contentHash changed, reviewer notes are thin, quality checklist fields are incomplete, approval predates required review stages, or the evidence supports only a partial import.",
      },
    ],
    reviewerCommandFlow: [
      {
        step: "Refresh all packets before review",
        command: "npm run export:library-review-packets -- --all",
        expected:
          "Every reviewer reads the current packet version with the current contentHash.",
      },
      {
        step: "Verify the blank intake is current",
        command:
          "npm run export:library-review-evidence-intake -- --check --summary-json",
        expected:
          "The repo intake has all current book hashes and no in-repo reviewer approvals.",
      },
      {
        step: "Validate completed reviewer evidence",
        command:
          "npm run validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --strict --summary-json",
        expected:
          "Validation passes only after every book has real approval evidence for the current content hash.",
      },
      {
        step: "Dry-run the import",
        command:
          "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --summary-json",
        expected:
          "The importer confirms what would change without editing library metadata.",
      },
      {
        step: "Apply validated evidence",
        command:
          "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --write",
        expected:
          "Only validated complete-library evidence is written into the guarded reviewEvidence blocks. For an intentional staged import, add --allow-partial-import and keep release claims scoped to the reviewed books.",
      },
      {
        step: "Regenerate review artifacts",
        command:
          "npm run export:library-review-signoff-ledger -- --write && npm run export:library-completion-audit -- --write",
        expected:
          "The ledger and completion audit reflect imported evidence without stale status.",
      },
      {
        step: "Run final Library gate",
        command: "npm run check:library-content-completion -- --summary-json",
        expected:
          "The strict Library completion gate passes before highest-standard or published-library claims are made.",
      },
    ],
    acceptanceCriteria: [
      "All 60 books have approvedForPublication set to true only after real editorial review, source relevance review, and publish approval.",
      "All 12 sensitive/high-care books also have qualified-scholar reviewer, date, notes, and a specific scholarReviewScope.",
      "Every qualityChecklist field is true for every book.",
      "Every evidence contentHash exactly matches the current generated review packet.",
      "No placeholder names, future dates, thin notes, stale hashes, or publish approvals dated before the underlying reviews remain.",
      "Partial imports use --allow-partial-import and do not support whole-library published or scholar-reviewed claims.",
      "Every completed record preserves its reviewerAcceptancePacket so reviewers and release operators can audit what was assigned versus what was approved.",
      "check:library-content-completion passes without --allow-review-pending before final release claims.",
    ],
  };
}

function buildReviewScope(stage: ReviewStageId, books: Book[]) {
  const scope = REVIEW_STAGE_SCOPES[stage];
  return {
    stage,
    title: scope.title,
    owner: scope.owner,
    selectedBookCount: books.length,
    sensitiveBookCount: books.filter(isSensitiveBook).length,
    requiredFields: scope.requiredFields,
    acceptanceChecklist: scope.acceptanceChecklist,
    evidenceBoundary: scope.evidenceBoundary,
    outOfScopeBoundary: scope.outOfScopeBoundary,
    completionBoundary:
      stage === "all"
        ? "Strict validation and import can support completion only when every selected book has all required evidence."
        : "Stage-scoped intake helps a reviewer fill one lane; final Library completion still requires every required stage for every book.",
  };
}

function selectedBooks() {
  const priority = argValue("--priority");
  const bookId = argValue("--book-id");
  return [...LIBRARY_BOOKS]
    .filter((book) => !priority || reviewPriority(book) === priority)
    .filter((book) => !bookId || book.id === bookId)
    .sort((left, right) => {
      const leftPriority = reviewPriority(left);
      const rightPriority = reviewPriority(right);
      if (leftPriority !== rightPriority) {
        return leftPriority.localeCompare(rightPriority);
      }
      return left.title.localeCompare(right.title);
    });
}

function buildRecord(book: Book) {
  const sensitive = isSensitiveBook(book);
  return {
    bookId: book.id,
    title: book.title,
    authorName: book.authorName,
    provenanceLabel: book.provenanceLabel,
    contentOrigin: book.contentOrigin,
    reviewPriority: reviewPriority(book),
    sensitive,
    currentContentStatus: book.verifiedContentStatus,
    requiredReviewEvidence: requiredReviewEvidence(book),
    reviewerAcceptancePacket: buildBookAcceptancePacket(book),
    approvedForPublication: false,
    contentHash: computeBookContentHash(book),
    qualityChecklist: emptyQualityChecklist(),
    editorialReviewer: "",
    editorialReviewedAt: "",
    editorialNotes: "",
    sourceReviewer: "",
    sourceReviewedAt: "",
    sourceNotes: "",
    ...(sensitive
      ? {
          qualifiedScholarReviewer: "",
          qualifiedScholarReviewedAt: "",
          scholarReviewScope: "",
          scholarNotes: "",
        }
      : {}),
    publishApprover: "",
    publishApprovedAt: "",
    publishNotes: "",
  };
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hasText(value: unknown) {
  return cleanText(value).length > 0;
}

function checkExistingIntake() {
  const findings: string[] = [];
  if (!fs.existsSync(outputPath)) {
    findings.push(`${outputPath} does not exist.`);
  }

  let parsed: unknown = null;
  if (findings.length === 0) {
    try {
      parsed = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    } catch (error) {
      findings.push(error instanceof Error ? error.message : String(error));
    }
  }

  const object =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  if (findings.length === 0 && !object) {
    findings.push("Intake file must be a JSON object.");
  }
  if (object && object.schemaVersion !== 2) {
    findings.push("Intake file must set schemaVersion to 2.");
  }

  const reviewScope =
    object?.reviewScope &&
    typeof object.reviewScope === "object" &&
    !Array.isArray(object.reviewScope)
      ? (object.reviewScope as Record<string, unknown>)
      : null;
  if (!reviewScope) {
    findings.push("Intake file must include a reviewScope object.");
  } else {
    const stage = cleanText(reviewScope.stage) as ReviewStageId;
    if (!Object.prototype.hasOwnProperty.call(REVIEW_STAGE_SCOPES, stage)) {
      findings.push("reviewScope.stage must be a known review stage.");
    } else {
      const expectedScope = REVIEW_STAGE_SCOPES[stage];
      if (cleanText(reviewScope.owner) !== expectedScope.owner) {
        findings.push(`reviewScope.owner must match ${expectedScope.owner}.`);
      }
      if (cleanText(reviewScope.evidenceBoundary).length < 32) {
        findings.push("reviewScope.evidenceBoundary must be specific.");
      }
      if (cleanText(reviewScope.outOfScopeBoundary).length < 32) {
        findings.push("reviewScope.outOfScopeBoundary must be specific.");
      }
      if (!Array.isArray(reviewScope.requiredFields)) {
        findings.push("reviewScope.requiredFields must be an array.");
      }
      if (!Array.isArray(reviewScope.acceptanceChecklist)) {
        findings.push("reviewScope.acceptanceChecklist must be an array.");
      } else if (reviewScope.acceptanceChecklist.length < 3) {
        findings.push(
          "reviewScope.acceptanceChecklist must include at least three items.",
        );
      }
    }
  }

  const reviewProofPlan =
    object?.reviewProofPlan &&
    typeof object.reviewProofPlan === "object" &&
    !Array.isArray(object.reviewProofPlan)
      ? (object.reviewProofPlan as Record<string, unknown>)
      : null;
  if (!reviewProofPlan) {
    findings.push("Intake file must include a reviewProofPlan object.");
  } else {
    const requiredProofPlanFields = [
      "proofBoundary",
      "currentClaimAllowed",
      "completedEvidenceFileRule",
      "perBookAcceptancePacketRule",
      "reviewStageContracts",
      "reviewerCommandFlow",
      "acceptanceCriteria",
    ];
    for (const field of requiredProofPlanFields) {
      if (
        field === "reviewStageContracts" ||
        field === "reviewerCommandFlow" ||
        field === "acceptanceCriteria"
      ) {
        if (!Array.isArray(reviewProofPlan[field])) {
          findings.push(`reviewProofPlan.${field} must be an array.`);
        }
      } else if (!hasText(reviewProofPlan[field])) {
        findings.push(`reviewProofPlan.${field} must be filled.`);
      }
    }

    const stageContracts = Array.isArray(reviewProofPlan.reviewStageContracts)
      ? (reviewProofPlan.reviewStageContracts as Record<string, unknown>[])
      : [];
    for (const requiredStage of [
      "editorial-review",
      "source-relevance-review",
      "qualified-scholar-review",
      "publish-approval",
    ]) {
      const contract = stageContracts.find(
        (stage) => cleanText(stage.stage) === requiredStage,
      );
      if (!contract) {
        findings.push(
          `reviewProofPlan.reviewStageContracts must include ${requiredStage}.`,
        );
        continue;
      }
      if (!Array.isArray(contract.requiredFields)) {
        findings.push(`${requiredStage}.requiredFields must be an array.`);
      }
      for (const field of ["owner", "reviewerMustConfirm", "rejectIf"]) {
        if (!hasText(contract[field])) {
          findings.push(`${requiredStage}.${field} must be filled.`);
        }
      }
    }

    const commandFlow = Array.isArray(reviewProofPlan.reviewerCommandFlow)
      ? (reviewProofPlan.reviewerCommandFlow as Record<string, unknown>[])
      : [];
    for (const requiredCommand of [
      "export:library-review-packets",
      "validate:library-review-evidence",
      "apply:library-review-evidence",
      "check:library-content-completion",
    ]) {
      if (
        !commandFlow.some((step) =>
          cleanText(step.command).includes(requiredCommand),
        )
      ) {
        findings.push(
          `reviewProofPlan.reviewerCommandFlow must include ${requiredCommand}.`,
        );
      }
    }
  }

  const intakeRecords = Array.isArray(object?.records)
    ? (object.records as Record<string, unknown>[])
    : [];
  if (object && !Array.isArray(object.records)) {
    findings.push("Intake file must include a records array.");
  }
  if (intakeRecords.length !== LIBRARY_BOOKS.length) {
    findings.push(
      `Intake file has ${intakeRecords.length} record(s), expected ${LIBRARY_BOOKS.length}.`,
    );
  }

  const recordById = new Map<string, Record<string, unknown>>();
  for (const record of intakeRecords) {
    const bookId = cleanText(record.bookId);
    if (!bookId) {
      findings.push("Every intake record must include a bookId.");
      continue;
    }
    if (recordById.has(bookId)) {
      findings.push(`${bookId} has duplicate intake records.`);
      continue;
    }
    recordById.set(bookId, record);
  }

  const reviewerFields = [
    "editorialReviewer",
    "editorialReviewedAt",
    "editorialNotes",
    "sourceReviewer",
    "sourceReviewedAt",
    "sourceNotes",
    "qualifiedScholarReviewer",
    "qualifiedScholarReviewedAt",
    "scholarReviewScope",
    "scholarNotes",
    "publishApprover",
    "publishApprovedAt",
    "publishNotes",
  ];
  let staleContentHashCount = 0;
  let filledReviewerFieldCount = 0;
  let approvedInRepoCount = 0;
  let completedQualityChecklistCount = 0;

  for (const book of LIBRARY_BOOKS) {
    const record = recordById.get(book.id);
    if (!record) {
      findings.push(`${book.id} is missing from the intake file.`);
      continue;
    }
    const expectedContentHash = computeBookContentHash(book);
    const reviewerAcceptancePacket =
      record.reviewerAcceptancePacket &&
      typeof record.reviewerAcceptancePacket === "object" &&
      !Array.isArray(record.reviewerAcceptancePacket)
        ? (record.reviewerAcceptancePacket as Record<string, unknown>)
        : null;
    if (!reviewerAcceptancePacket) {
      findings.push(`${book.id} is missing reviewerAcceptancePacket.`);
    } else {
      if (cleanText(reviewerAcceptancePacket.bookId) !== book.id) {
        findings.push(`${book.id} reviewerAcceptancePacket.bookId mismatch.`);
      }
      if (
        !cleanText(reviewerAcceptancePacket.exportCommand).includes(book.id)
      ) {
        findings.push(
          `${book.id} reviewerAcceptancePacket.exportCommand must be scoped to the book.`,
        );
      }
      if (
        !cleanText(reviewerAcceptancePacket.claimBoundary).includes(
          "not approval evidence",
        )
      ) {
        findings.push(
          `${book.id} reviewerAcceptancePacket.claimBoundary must preserve approval boundary.`,
        );
      }
      if (
        !cleanText(reviewerAcceptancePacket.noSecretBoundary).includes(
          "credentials",
        )
      ) {
        findings.push(
          `${book.id} reviewerAcceptancePacket.noSecretBoundary must preserve no-secret guidance.`,
        );
      }
      const packetStages = Array.isArray(reviewerAcceptancePacket.stages)
        ? (reviewerAcceptancePacket.stages as Record<string, unknown>[])
        : [];
      for (const requiredStage of acceptanceStagesForBook(book)) {
        if (
          !packetStages.some(
            (stage) => cleanText(stage.stage) === requiredStage,
          )
        ) {
          findings.push(
            `${book.id} reviewerAcceptancePacket.stages missing ${requiredStage}.`,
          );
        }
      }
    }
    if (cleanText(record.contentHash) !== expectedContentHash) {
      staleContentHashCount += 1;
      findings.push(`${book.id} contentHash is stale or missing.`);
    }
    if (record.approvedForPublication === true) {
      approvedInRepoCount += 1;
      findings.push(`${book.id} is approved in the repo intake file.`);
    }
    const qualityChecklist =
      record.qualityChecklist &&
      typeof record.qualityChecklist === "object" &&
      !Array.isArray(record.qualityChecklist)
        ? (record.qualityChecklist as Record<string, unknown>)
        : null;
    if (!qualityChecklist) {
      findings.push(`${book.id} is missing the qualityChecklist object.`);
    } else {
      for (const field of QUALITY_CHECKLIST_FIELDS) {
        if (qualityChecklist[field] !== false) {
          completedQualityChecklistCount += 1;
          findings.push(
            `${book.id} has qualityChecklist.${field} filled in the repo intake file.`,
          );
        }
      }
    }
    for (const field of reviewerFields) {
      if (hasText(record[field])) {
        filledReviewerFieldCount += 1;
        findings.push(
          `${book.id} has ${field} filled in the repo intake file.`,
        );
      }
    }
  }

  return {
    ok: findings.length === 0,
    outputPath,
    checkedBookCount: LIBRARY_BOOKS.length,
    intakeRecordCount: intakeRecords.length,
    staleContentHashCount,
    approvedInRepoCount,
    filledReviewerFieldCount,
    completedQualityChecklistCount,
    findings,
  };
}

const books = selectedBooks();
const reviewStage = selectedReviewStage();
const records = books.map(buildRecord);
const outputPath = path.resolve(
  process.cwd(),
  argValue("--out", DEFAULT_OUTPUT_PATH) || DEFAULT_OUTPUT_PATH,
);
const generatedAt = new Date().toISOString();
const evidenceIntake = {
  schemaVersion: 2,
  generatedAt,
  generatedFrom: "scripts/export-library-review-evidence-intake.ts",
  purpose:
    "Draft intake for real reviewer sign-off. It is not approval evidence until reviewers complete the empty fields and validation passes.",
  reviewProofPlan: buildReviewProofPlan(),
  reviewScope: buildReviewScope(reviewStage, books),
  instructions: [
    "Keep the contentHash values bound to the exact book version reviewed.",
    "Only set approvedForPublication to true after editorial review, source relevance review, publish approval, and qualified-scholar review where required.",
    "Set every qualityChecklist field to true only after the reviewer explicitly clears title accuracy, chapter completeness, source relevance, unsupported claims, exercises, audience, tone, and safety boundaries.",
    "Write specific review notes for editorial, source, scholar, and publish fields; validation rejects thin notes under 40 characters.",
    "Publish approval dates must not be earlier than editorial, source, or qualified-scholar review dates.",
    "Use ISO-like dates such as 2026-05-17 for completed review events.",
    "Run: npm run validate:library-review-evidence -- --file /absolute/path/to/completed-review-evidence.json --summary-json",
    "Dry run import: npm run apply:library-review-evidence -- --file /absolute/path/to/completed-review-evidence.json --summary-json",
    "Apply after validation: npm run apply:library-review-evidence -- --file /absolute/path/to/completed-review-evidence.json --write",
    "For intentionally staged evidence, add --allow-partial-import to the write command and keep claims limited to the imported books.",
    "Use reviewScope.stage to keep each reviewer focused on their evidence lane; do not fill out-of-scope fields unless that reviewer is also signing those stages.",
  ],
  summary: {
    selectedBookCount: books.length,
    allLibraryBookCount: LIBRARY_BOOKS.length,
    sensitiveBookCount: books.filter(isSensitiveBook).length,
    generatedContentHashCount: records.filter((record) => record.contentHash)
      .length,
    qualityChecklistFieldCount:
      records.length * QUALITY_CHECKLIST_FIELDS.length,
  },
  records,
};

if (wantsWrite) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(evidenceIntake, null, 2)}\n`);
}

if (wantsCheck) {
  const checkReport = checkExistingIntake();
  if (wantsSummaryJson) {
    const { findings: _findings, ...summary } = checkReport;
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(JSON.stringify(checkReport, null, 2));
  }
  if (!checkReport.ok) {
    process.exitCode = 1;
  }
} else if (wantsSummaryJson) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        outputPath,
        written: wantsWrite,
        selectedBookCount: books.length,
        allLibraryBookCount: LIBRARY_BOOKS.length,
        sensitiveBookCount: books.filter(isSensitiveBook).length,
        generatedContentHashCount: records.filter(
          (record) => record.contentHash,
        ).length,
        hasReviewProofPlan: true,
        priority: argValue("--priority"),
        bookId: argValue("--book-id"),
        stage: reviewStage,
      },
      null,
      2,
    ),
  );
} else if (wantsJson || !wantsWrite) {
  console.log(JSON.stringify(evidenceIntake, null, 2));
} else {
  console.log(
    `Wrote ${records.length} library review evidence intake record(s) to ${outputPath}.`,
  );
}
