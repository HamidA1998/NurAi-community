#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { LIBRARY_BOOKS } from "../client/data/libraryBooks";
import { computeBookContentHash } from "./lib/libraryContentHash";
import {
  QUALITY_CHECKLIST_FIELDS,
  isSensitiveBook,
  type QualityChecklistKey,
} from "./lib/libraryReviewEvidence";

type ReviewStageId =
  | "all"
  | "editorial-review"
  | "source-relevance-review"
  | "qualified-scholar-review"
  | "quality-checklist"
  | "publish-approval";

type EvidenceRecord = {
  bookId?: unknown;
  reviewerAcceptancePacket?: unknown;
  approvedForPublication?: unknown;
  contentHash?: unknown;
  qualityChecklist?: Record<string, unknown>;
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

type EvidenceFile = {
  schemaVersion?: unknown;
  generatedAt?: unknown;
  generatedFrom?: unknown;
  purpose?: unknown;
  reviewProofPlan?: unknown;
  reviewScope?: {
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
  instructions?: unknown;
  summary?: unknown;
  records?: EvidenceRecord[];
  mergeMetadata?: unknown;
};

type ValidationSummary = {
  valid?: boolean;
  readyForHighestStandardClaim?: boolean;
  stageValidationOnly?: boolean;
  reviewScopeStage?: string;
  completeEvidenceCount?: number;
  blockerCount?: number;
  warningCount?: number;
};

const wantsWrite = process.argv.includes("--write");
const wantsSummaryJson = process.argv.includes("--summary-json");
const requireCompleteStageCoverage = process.argv.includes(
  "--require-complete-stage-coverage",
);
const requireAllLibraryBooks = process.argv.includes(
  "--require-all-library-books",
);

function argValue(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function argValues(name: string) {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
    }
  }
  return values;
}

const inputPaths = argValues("--file").map((filePath) =>
  path.resolve(process.cwd(), filePath),
);
const outputPath = path.resolve(
  process.cwd(),
  argValue("--out", "docs/audit/library-review-evidence.merged.json"),
);
const coveragePathArg = argValue("--coverage-out", "");
const coverageOutputPath = coveragePathArg
  ? path.resolve(process.cwd(), coveragePathArg)
  : "";

function fail(message: string, extra: Record<string, unknown> = {}): never {
  const payload = {
    ok: false,
    mode: wantsWrite ? "write" : "dry-run",
    outputPath,
    error: message,
    ...extra,
  };

  if (wantsSummaryJson) {
    console.error(JSON.stringify(payload, null, 2));
  } else {
    console.error(`Library review evidence merge failed: ${message}`);
    for (const [key, value] of Object.entries(extra)) {
      console.error(`${key}: ${JSON.stringify(value)}`);
    }
  }
  process.exit(1);
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readJson(filePath: string): EvidenceFile {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as EvidenceFile;
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error), { filePath });
  }
}

function runValidator(filePath: string, strict = true) {
  const result = spawnSync(
    "npx",
    [
      "tsx",
      "scripts/validate-library-review-evidence.ts",
      "--file",
      filePath,
      "--summary-json",
      ...(strict ? ["--strict"] : []),
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  let summary: ValidationSummary = {};
  try {
    summary = JSON.parse(result.stdout.trim()) as ValidationSummary;
  } catch {
    summary = {};
  }

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    summary,
  };
}

function currentBlankIntake() {
  const result = spawnSync(
    "npx",
    ["tsx", "scripts/export-library-review-evidence-intake.ts", "--json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    fail("Could not generate the current blank Library evidence intake.", {
      status: result.status,
      stderr: result.stderr.trim(),
    });
  }
  try {
    return JSON.parse(result.stdout.trim()) as EvidenceFile;
  } catch (error) {
    fail("Current blank intake was not parseable JSON.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function cloneRecord(record: EvidenceRecord): EvidenceRecord {
  return JSON.parse(JSON.stringify(record)) as EvidenceRecord;
}

function copyQualityFields(
  target: EvidenceRecord,
  source: EvidenceRecord,
  fields: readonly QualityChecklistKey[],
) {
  target.qualityChecklist = {
    ...(target.qualityChecklist || {}),
  };
  const sourceChecklist = source.qualityChecklist || {};
  for (const field of fields) {
    target.qualityChecklist[field] = sourceChecklist[field] === true;
  }
}

const STAGE_FIELD_COPY: Record<ReviewStageId, (keyof EvidenceRecord)[]> = {
  all: [
    "approvedForPublication",
    "contentHash",
    "qualityChecklist",
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
  ],
  "editorial-review": [
    "editorialReviewer",
    "editorialReviewedAt",
    "editorialNotes",
  ],
  "source-relevance-review": [
    "sourceReviewer",
    "sourceReviewedAt",
    "sourceNotes",
  ],
  "qualified-scholar-review": [
    "qualifiedScholarReviewer",
    "qualifiedScholarReviewedAt",
    "scholarReviewScope",
    "scholarNotes",
  ],
  "quality-checklist": [],
  "publish-approval": [
    "approvedForPublication",
    "publishApprover",
    "publishApprovedAt",
    "publishNotes",
  ],
};

const STAGE_QUALITY_FIELDS: Partial<
  Record<ReviewStageId, readonly QualityChecklistKey[]>
> = {
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
};

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{16,}/,
  /postgres(?:ql)?:\/\/[^/\s]+:[^@\s]+@/i,
  /bearer\s+[A-Za-z0-9._-]{16,}/i,
  /authorization\s*:/i,
  /cookie\s*:/i,
];

function assertNoSecretLikeStageText(
  record: EvidenceRecord,
  stage: ReviewStageId,
) {
  const fields = [
    ...STAGE_FIELD_COPY[stage],
    ...(stage === "all" ? [] : (["contentHash"] as (keyof EvidenceRecord)[])),
  ];
  for (const field of fields) {
    const value = record[field];
    if (typeof value !== "string") continue;
    if (SECRET_PATTERNS.some((pattern) => pattern.test(value))) {
      fail("Reviewer evidence contains secret-like material.", {
        bookId: cleanText(record.bookId),
        stage,
        field,
      });
    }
  }
}

function copyStage(
  target: EvidenceRecord,
  source: EvidenceRecord,
  stage: ReviewStageId,
) {
  target.contentHash = source.contentHash;
  target.reviewerAcceptancePacket = source.reviewerAcceptancePacket;
  for (const field of STAGE_FIELD_COPY[stage]) {
    if (field === "qualityChecklist") {
      target.qualityChecklist = {
        ...(target.qualityChecklist || {}),
        ...(source.qualityChecklist || {}),
      };
    } else {
      target[field] = source[field];
    }
  }

  const checklistFields = STAGE_QUALITY_FIELDS[stage];
  if (checklistFields) copyQualityFields(target, source, checklistFields);
}

function requiredStagesForBook(book: (typeof LIBRARY_BOOKS)[number]) {
  return [
    "editorial-review",
    "source-relevance-review",
    "quality-checklist",
    ...(isSensitiveBook(book) ? ["qualified-scholar-review"] : []),
    "publish-approval",
  ] as ReviewStageId[];
}

function renderCoverageMarkdown({
  records,
  appliedStages,
  missingStageEntries,
  sourceSummaries,
  mergedValidation,
  completeStageBookCount,
  booksMissingStageCount,
  missingStageCount,
  missingLibraryBookIds,
}: {
  records: EvidenceRecord[];
  appliedStages: Map<string, Set<ReviewStageId>>;
  missingStageEntries: [string, ReviewStageId[]][];
  sourceSummaries: Record<string, unknown>[];
  mergedValidation: ValidationSummary;
  completeStageBookCount: number;
  booksMissingStageCount: number;
  missingStageCount: number;
  missingLibraryBookIds: string[];
}) {
  const bookById = new Map(LIBRARY_BOOKS.map((book) => [book.id, book]));
  const missingByBook = new Map(missingStageEntries);
  const lines = [
    "# Library Review Merge Coverage",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This artifact summarizes a merged Library review evidence candidate. It is not publication approval, app metadata, or a scholar-reviewed claim.",
    "",
    "## Summary",
    "",
    `- Candidate books: ${records.length}`,
    `- All Library books: ${LIBRARY_BOOKS.length}`,
    `- Library books missing from candidate: ${missingLibraryBookIds.length}`,
    `- Books with every required reviewer stage present: ${completeStageBookCount}`,
    `- Books still missing at least one reviewer stage: ${booksMissingStageCount}`,
    `- Missing reviewer stages: ${missingStageCount}`,
    `- Complete evidence records after validation: ${mergedValidation.completeEvidenceCount ?? 0}`,
    `- Ready for highest-standard whole-library claim: ${mergedValidation.readyForHighestStandardClaim ? "yes" : "no"}`,
    `- Validation blockers: ${mergedValidation.blockerCount ?? 0}`,
    `- Validation warnings: ${mergedValidation.warningCount ?? 0}`,
    "",
    "## Source Files",
    "",
    "| Stage | Records | Source |",
    "| --- | --- | --- |",
    ...sourceSummaries.map(
      (source) =>
        `| ${source.stage || ""} | ${source.recordCount || 0} | ${source.inputPath || ""} |`,
    ),
    "",
    "## Per-Book Stage Coverage",
    "",
    "| Book | Sensitive | Applied stages | Missing stages |",
    "| --- | --- | --- | --- |",
    ...records.map((record) => {
      const bookId = cleanText(record.bookId);
      const book = bookById.get(bookId);
      const applied = [...(appliedStages.get(bookId) || new Set())].sort();
      const missing = missingByBook.get(bookId) || [];
      return `| ${book?.title || bookId} | ${book ? (isSensitiveBook(book) ? "yes" : "no") : "unknown"} | ${applied.join(", ") || "none"} | ${missing.join(", ") || "none"} |`;
    }),
    "",
    "## Next Commands",
    "",
    "```bash",
    `npm run validate:library-review-evidence -- --file ${outputPath} --summary-json`,
    `npm run apply:library-review-evidence -- --file ${outputPath} --summary-json`,
    `npm run apply:library-review-evidence -- --file ${outputPath} --write`,
    "npm run check:library-content-completion -- --summary-json",
    "```",
    "",
  ];
  return lines.join("\n");
}

function main() {
  if (inputPaths.length === 0) {
    fail("At least one --file path is required.");
  }

  const blank = currentBlankIntake();
  const blankRecords = new Map(
    (blank.records || []).map((record) => [cleanText(record.bookId), record]),
  );
  const bookById = new Map(LIBRARY_BOOKS.map((book) => [book.id, book]));
  const mergedRecords = new Map<string, EvidenceRecord>();
  const appliedStages = new Map<string, Set<ReviewStageId>>();
  const sourceSummaries: Record<string, unknown>[] = [];

  for (const inputPath of inputPaths) {
    const evidence = readJson(inputPath);
    if (evidence.schemaVersion !== 2 || !Array.isArray(evidence.records)) {
      fail("Input evidence file must include schemaVersion 2 and records.", {
        inputPath,
      });
    }

    const stage = cleanText(evidence.reviewScope?.stage) as ReviewStageId;
    if (!STAGE_FIELD_COPY[stage]) {
      fail("Input evidence file has an unknown reviewScope.stage.", {
        inputPath,
        stage,
      });
    }
    if (stage === "all") {
      fail("All-stage review evidence cannot be used as a merge input.", {
        inputPath,
        stage,
        nextAction:
          "Run validate:library-review-evidence and apply:library-review-evidence on all-stage evidence directly, or merge only stage-scoped reviewer files.",
      });
    }

    const validation = runValidator(inputPath, true);
    if (!validation.ok || validation.summary.valid !== true) {
      fail("Input evidence file did not pass validation.", {
        inputPath,
        validation: validation.summary,
        stderr: validation.stderr,
      });
    }

    sourceSummaries.push({
      inputPath,
      stage,
      recordCount: evidence.records.length,
      readyForHighestStandardClaim: Boolean(
        validation.summary.readyForHighestStandardClaim,
      ),
    });

    for (const sourceRecord of evidence.records) {
      const bookId = cleanText(sourceRecord.bookId);
      const book = bookById.get(bookId);
      const blankRecord = blankRecords.get(bookId);
      if (!book || !blankRecord) {
        fail("Input evidence file references an unknown Library book.", {
          inputPath,
          bookId,
        });
      }

      const expectedHash = computeBookContentHash(book);
      if (cleanText(sourceRecord.contentHash) !== expectedHash) {
        fail(
          "Input evidence contentHash does not match current book content.",
          {
            inputPath,
            bookId,
            expectedHash,
          },
        );
      }

      assertNoSecretLikeStageText(sourceRecord, stage);
      const target = mergedRecords.get(bookId) || cloneRecord(blankRecord);
      const stages = appliedStages.get(bookId) || new Set<ReviewStageId>();
      if (stages.has(stage)) {
        fail("Duplicate reviewer stage evidence cannot be merged.", {
          bookId,
          stage,
          inputPath,
          nextAction:
            "Merge only one validated evidence file per reviewer stage and book, or reconcile the reviewer evidence outside this command first.",
        });
      }
      copyStage(target, sourceRecord, stage);
      mergedRecords.set(bookId, target);

      stages.add(stage);
      appliedStages.set(bookId, stages);
    }
  }

  const records = [...mergedRecords.values()].sort((left, right) =>
    cleanText(left.bookId).localeCompare(cleanText(right.bookId)),
  );
  const missingStagesByBookId = new Map<string, ReviewStageId[]>();
  for (const record of records) {
    const bookId = cleanText(record.bookId);
    const book = bookById.get(bookId);
    if (!book) continue;
    const stages = appliedStages.get(bookId) || new Set<ReviewStageId>();
    missingStagesByBookId.set(
      bookId,
      requiredStagesForBook(book).filter((stage) => !stages.has(stage)),
    );
  }
  const missingStageEntries = [...missingStagesByBookId.entries()];
  const completeStageBookCount = missingStageEntries.filter(
    ([, stages]) => stages.length === 0,
  ).length;
  const missingStageCount = missingStageEntries.reduce(
    (sum, [, stages]) => sum + stages.length,
    0,
  );
  const booksMissingStageCount = missingStageEntries.filter(
    ([, stages]) => stages.length > 0,
  ).length;
  const mergedBookIds = new Set(
    records.map((record) => cleanText(record.bookId)),
  );
  const missingLibraryBookIds = LIBRARY_BOOKS.map((book) => book.id).filter(
    (bookId) => !mergedBookIds.has(bookId),
  );

  if (requireCompleteStageCoverage && missingStageCount > 0) {
    fail("Merged reviewer evidence is missing required stages.", {
      completeStageBookCount,
      booksMissingStageCount,
      missingStageCount,
      missingStagesByBookId: Object.fromEntries(missingStageEntries),
      nextAction:
        "Add the missing stage-scoped evidence files, then rerun the merge with --require-complete-stage-coverage before validation or import.",
    });
  }

  if (requireAllLibraryBooks && missingLibraryBookIds.length > 0) {
    fail("Merged reviewer evidence does not include every Library book.", {
      mergedRecordCount: records.length,
      allLibraryBookCount: LIBRARY_BOOKS.length,
      missingLibraryBookCount: missingLibraryBookIds.length,
      missingLibraryBookIds,
      nextAction:
        "Add validated stage-scoped evidence covering every Library book, then rerun the merge with --require-all-library-books before making whole-Library release claims.",
    });
  }

  const merged: EvidenceFile = {
    ...blank,
    generatedAt: new Date().toISOString(),
    generatedFrom: "scripts/merge-library-review-evidence.ts",
    purpose:
      "Merged candidate publication evidence assembled from validated reviewer-stage files. It is not imported app metadata until validate/apply commands pass.",
    reviewScope: {
      ...(blank.reviewScope || {}),
      stage: "all",
      title: "Merged Library publication evidence candidate",
      selectedBookCount: records.length,
      sensitiveBookCount: records.filter((record) => {
        const book = bookById.get(cleanText(record.bookId));
        return Boolean(
          book &&
            [
              book.title,
              book.subtitle,
              book.description,
              book.category,
              ...book.tags,
            ]
              .join(" ")
              .toLowerCase()
              .match(
                /fiqh|zakat|marriage|women|hajj|umrah|hadith|purification|wudu|business|wealth/,
              ),
        );
      }).length,
      completionBoundary:
        "This merged file can support publication import only after validation confirms every included book has all required evidence for the current contentHash.",
    },
    mergeMetadata: {
      generatedBy: "scripts/merge-library-review-evidence.ts",
      generatedAt: new Date().toISOString(),
      sourceFiles: sourceSummaries,
      claimBoundary:
        "Merged evidence is a candidate workspace only. It does not publish books or support whole-library claims until strict validation, guarded import, and Library completion checks pass.",
      noSecretBoundary:
        "Inputs are validated and scanned for secret-like reviewer field material before merge.",
      appliedStagesByBookId: Object.fromEntries(
        [...appliedStages.entries()].map(([bookId, stages]) => [
          bookId,
          [...stages].sort(),
        ]),
      ),
      missingStagesByBookId: Object.fromEntries(
        missingStageEntries.map(([bookId, stages]) => [bookId, stages]),
      ),
      missingLibraryBookIds,
    },
    summary: {
      selectedBookCount: records.length,
      allLibraryBookCount: LIBRARY_BOOKS.length,
      missingLibraryBookCount: missingLibraryBookIds.length,
      mergedSourceFileCount: inputPaths.length,
      completeStageBookCount,
      booksMissingStageCount,
      missingStageCount,
    },
    records,
  };

  if (wantsWrite) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`);
  }

  let mergedValidation: ValidationSummary = {};
  if (wantsWrite) {
    mergedValidation = runValidator(outputPath, false).summary;
  } else {
    const tempPath = path.join(
      process.cwd(),
      ".tmp-library-review-evidence-merge.json",
    );
    try {
      fs.writeFileSync(tempPath, `${JSON.stringify(merged, null, 2)}\n`);
      mergedValidation = runValidator(tempPath, false).summary;
    } finally {
      fs.rmSync(tempPath, { force: true });
    }
  }

  if (wantsWrite && coverageOutputPath) {
    fs.mkdirSync(path.dirname(coverageOutputPath), { recursive: true });
    fs.writeFileSync(
      coverageOutputPath,
      renderCoverageMarkdown({
        records,
        appliedStages,
        missingStageEntries,
        sourceSummaries,
        mergedValidation,
        completeStageBookCount,
        booksMissingStageCount,
        missingStageCount,
        missingLibraryBookIds,
      }),
    );
  }

  const summary = {
    ok: true,
    mode: wantsWrite ? "write" : "dry-run",
    outputPath,
    coverageOutputPath: coverageOutputPath || null,
    written: wantsWrite,
    coverageWritten: Boolean(wantsWrite && coverageOutputPath),
    requireCompleteStageCoverage,
    requireAllLibraryBooks,
    inputCount: inputPaths.length,
    mergedRecordCount: records.length,
    allLibraryBookCount: LIBRARY_BOOKS.length,
    missingLibraryBookCount: missingLibraryBookIds.length,
    completeStageBookCount,
    booksMissingStageCount,
    missingStageCount,
    completeEvidenceCount: mergedValidation.completeEvidenceCount ?? 0,
    readyForHighestStandardClaim: Boolean(
      mergedValidation.readyForHighestStandardClaim,
    ),
    validationBlockerCount: mergedValidation.blockerCount ?? 0,
    validationWarningCount: mergedValidation.warningCount ?? 0,
    bookIds: records.map((record) => cleanText(record.bookId)),
  };

  if (wantsSummaryJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else if (wantsWrite) {
    console.log(
      `Wrote merged Library review evidence candidate for ${records.length} book(s) to ${outputPath}.`,
    );
  } else {
    console.log(
      `Dry run: merged Library review evidence candidate for ${records.length} book(s).`,
    );
  }
}

main();
