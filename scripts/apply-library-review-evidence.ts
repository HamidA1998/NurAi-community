#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { LIBRARY_BOOKS } from "../client/data/libraryBooks";
import {
  QUALITY_CHECKLIST_FIELDS,
  normalized,
  type QualityChecklistKey,
} from "./lib/libraryReviewEvidence";

type EvidenceRecord = {
  bookId?: unknown;
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

type EvidenceFile = {
  schemaVersion?: unknown;
  records?: EvidenceRecord[];
};

type ValidationSummary = {
  valid?: boolean;
  readyForHighestStandardClaim?: boolean;
  stageValidationOnly?: boolean;
  reviewScopeStage?: string;
  bookCount?: number;
  evidenceRecordCount?: number;
  completeEvidenceCount?: number;
  blockerCount?: number;
  warningCount?: number;
};

const wantsWrite = process.argv.includes("--write");
const wantsSummaryJson = process.argv.includes("--summary-json");
const allowPartialImport = process.argv.includes("--allow-partial-import");

function argValue(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const evidencePath = path.resolve(
  process.cwd(),
  argValue("--file", "docs/audit/library-review-evidence.template.json"),
);
const libraryPath = path.resolve(
  process.cwd(),
  argValue("--library-file", "client/data/libraryBooks.ts"),
);

function fail(message: string, extra: Record<string, unknown> = {}): never {
  const payload = {
    ok: false,
    mode: wantsWrite ? "write" : "dry-run",
    evidencePath,
    libraryPath,
    error: message,
    ...extra,
  };

  if (wantsSummaryJson) {
    console.error(JSON.stringify(payload, null, 2));
  } else {
    console.error(`Library review evidence import failed: ${message}`);
    for (const [key, value] of Object.entries(extra)) {
      console.error(`${key}: ${JSON.stringify(value)}`);
    }
  }
  process.exit(1);
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readEvidenceFile(): EvidenceFile {
  try {
    return JSON.parse(fs.readFileSync(evidencePath, "utf8")) as EvidenceFile;
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

function validateEvidence(): ValidationSummary {
  const result = spawnSync(
    "npx",
    [
      "tsx",
      "scripts/validate-library-review-evidence.ts",
      "--file",
      evidencePath,
      "--summary-json",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    fail("Validator command failed.", {
      status: result.status,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    });
  }

  try {
    return JSON.parse(result.stdout) as ValidationSummary;
  } catch {
    fail("Validator did not return parseable summary JSON.", {
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    });
  }
}

function quoted(value: unknown) {
  return JSON.stringify(cleanText(value));
}

function evidenceLine(key: keyof EvidenceRecord, value: unknown) {
  return `      ${key}: ${quoted(value)},`;
}

function formatQualityChecklist(value: unknown) {
  const checklist =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<QualityChecklistKey, unknown>>)
      : {};
  return [
    "      qualityChecklist: {",
    ...QUALITY_CHECKLIST_FIELDS.map(
      (field) => `        ${field}: ${checklist[field] === true},`,
    ),
    "      },",
  ];
}

function hasGeneratedScaffoldSignals(
  chapter: (typeof LIBRARY_BOOKS)[number]["chapters"][number],
) {
  const text = normalized(
    [
      chapter.subtitle,
      ...chapter.sections.map((section) => section.body),
      ...chapter.reflectionQuestions,
      ...chapter.actionSteps,
      chapter.quiz.map((question) => question.question).join(" "),
      chapter.audioScript || "",
    ].join(" "),
  );

  return [
    "this lesson helps you understand",
    "without overwhelm. it frames the subject",
    "pause before you move on",
    "what is one small change you can keep for seven days",
    "what is the best first step after learning a new islamic habit",
    "is treated here as a lived piece of",
    "begin by naming where this subject already appears in your day",
    "the practical aim is steady growth with adab",
    "this chapter develops ruh focus through",
    "extends the ruh focus method into one concrete pressure point",
    "read it as a training session for the heart",
    "choose one action from the chapter and do it today before sleeping",
  ].some((signal) => text.includes(signal));
}

function validateTargetBooksArePublishable(bookIds: string[]) {
  const failures: string[] = [];
  const bookById = new Map(LIBRARY_BOOKS.map((book) => [book.id, book]));

  for (const bookId of bookIds) {
    const book = bookById.get(bookId);
    if (!book) {
      failures.push(`${bookId}: unknown book id`);
      continue;
    }

    if (
      !book.title.trim() ||
      !book.subtitle.trim() ||
      !book.description.trim()
    ) {
      failures.push(`${bookId}: missing title, subtitle, or description`);
    }
    if (!book.safetyNote.toLowerCase().includes("review")) {
      failures.push(`${bookId}: safety note must mention review boundary`);
    }
    if (!book.chapters.length) {
      failures.push(`${bookId}: no chapters`);
    }
    const estimatedMinutes = book.chapters.reduce(
      (sum, chapter) => sum + chapter.estimatedMinutes,
      0,
    );
    if (estimatedMinutes !== book.estimatedMinutes) {
      failures.push(`${bookId}: estimatedMinutes does not match chapter total`);
    }

    for (const chapter of book.chapters) {
      if (hasGeneratedScaffoldSignals(chapter)) {
        failures.push(`${bookId}/${chapter.id}: generated scaffold wording`);
      }
      if (chapter.sourceRefs.length < 2) {
        failures.push(`${bookId}/${chapter.id}: fewer than two source refs`);
      }
      if (!chapter.sections.length || !chapter.quiz.length) {
        failures.push(`${bookId}/${chapter.id}: missing sections or quiz`);
      }
      if (
        chapter.reflectionQuestions.length < 2 ||
        chapter.actionSteps.length < 2
      ) {
        failures.push(
          `${bookId}/${chapter.id}: missing reflection/action depth`,
        );
      }
      for (const sourceRef of chapter.sourceRefs) {
        if (
          !sourceRef.verified ||
          !sourceRef.reference.trim() ||
          !sourceRef.note.trim()
        ) {
          failures.push(`${bookId}/${chapter.id}: incomplete source ref`);
        }
      }
    }
  }

  if (failures.length) {
    fail("Target book content is not ready for publication evidence import.", {
      failures,
    });
  }
}

function formatRecord(record: EvidenceRecord) {
  const lines = [
    `  ${quoted(record.bookId)}: {`,
    `    verifiedContentStatus: "published",`,
    "    reviewEvidence: {",
    "      approvedForPublication: true,",
    evidenceLine("contentHash", record.contentHash),
    ...formatQualityChecklist(record.qualityChecklist),
    evidenceLine("editorialReviewer", record.editorialReviewer),
    evidenceLine("editorialReviewedAt", record.editorialReviewedAt),
    evidenceLine("editorialNotes", record.editorialNotes),
    evidenceLine("sourceReviewer", record.sourceReviewer),
    evidenceLine("sourceReviewedAt", record.sourceReviewedAt),
    evidenceLine("sourceNotes", record.sourceNotes),
    evidenceLine("publishApprover", record.publishApprover),
    evidenceLine("publishApprovedAt", record.publishApprovedAt),
    evidenceLine("publishNotes", record.publishNotes),
  ];

  for (const key of [
    "qualifiedScholarReviewer",
    "qualifiedScholarReviewedAt",
    "scholarReviewScope",
    "scholarNotes",
  ] satisfies (keyof EvidenceRecord)[]) {
    if (cleanText(record[key])) {
      lines.push(evidenceLine(key, record[key]));
    }
  }

  lines.push("    },", "  },");
  return lines.join("\n");
}

function buildEvidenceBlock(records: EvidenceRecord[]) {
  const startMarker = "  // REVIEW_EVIDENCE_START";
  const endMarker = "  // REVIEW_EVIDENCE_END";
  if (records.length === 0) {
    return [
      startMarker,
      "  // Real reviewer sign-off evidence is imported here by:",
      "  // npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --write",
      endMarker,
    ].join("\n");
  }

  return [
    startMarker,
    "  // Imported from validated real reviewer sign-off evidence.",
    "  // Do not add placeholders here.",
    ...records.map(formatRecord),
    endMarker,
  ].join("\n");
}

function replaceEvidenceBlock(text: string, nextBlock: string) {
  const startMarker = "  // REVIEW_EVIDENCE_START";
  const endMarker = "  // REVIEW_EVIDENCE_END";
  const startIndex = text.indexOf(startMarker);
  const endIndex = text.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    fail("Could not find review evidence import markers in libraryBooks.ts.");
  }
  return `${text.slice(0, startIndex)}${nextBlock}${text.slice(endIndex + endMarker.length)}`;
}

const validation = validateEvidence();
if ((validation.blockerCount ?? 0) > 0 || validation.valid === false) {
  fail("Evidence file did not pass validation.", {
    validation,
  });
}
if (validation.stageValidationOnly === true) {
  fail(
    "Stage-scoped reviewer evidence cannot be imported into published Library metadata.",
    {
      reviewScopeStage: validation.reviewScopeStage || "unknown",
      nextCommand:
        "Collect every required review stage, then validate and import a complete or partial-library publication evidence file.",
    },
  );
}

const evidence = readEvidenceFile();
if (evidence.schemaVersion !== 2 || !Array.isArray(evidence.records)) {
  fail("Evidence file must include schemaVersion 2 and a records array.");
}

const records = [...evidence.records].sort((left, right) =>
  cleanText(left.bookId).localeCompare(cleanText(right.bookId)),
);
const bookIds = records.map((record) => cleanText(record.bookId));
validateTargetBooksArePublishable(bookIds);

if (wantsWrite && records.length === 0) {
  fail("Refusing to write an empty evidence import block.");
}
if (
  wantsWrite &&
  records.length > 0 &&
  validation.readyForHighestStandardClaim !== true &&
  !allowPartialImport
) {
  fail(
    "Refusing to write a partial Library evidence import without --allow-partial-import.",
    {
      readyForHighestStandardClaim: Boolean(
        validation.readyForHighestStandardClaim,
      ),
      completeEvidenceCount: validation.completeEvidenceCount ?? 0,
      expectedBookCount: validation.bookCount ?? LIBRARY_BOOKS.length,
      nextCommand:
        "Re-run with --allow-partial-import only for intentional partial-library publication evidence, not stage-scoped reviewer evidence.",
    },
  );
}

const summary = {
  ok: true,
  mode: wantsWrite ? "write" : "dry-run",
  evidencePath,
  libraryPath,
  allowPartialImport,
  readyForHighestStandardClaim: Boolean(
    validation.readyForHighestStandardClaim,
  ),
  evidenceRecordCount: records.length,
  wouldApplyCount: records.length,
  appliedCount: wantsWrite ? records.length : 0,
  completeEvidenceCount: validation.completeEvidenceCount ?? 0,
  expectedBookCount: validation.bookCount ?? LIBRARY_BOOKS.length,
  validationBlockerCount: validation.blockerCount ?? 0,
  validationWarningCount: validation.warningCount ?? 0,
  bookIds,
};

if (wantsWrite) {
  const current = fs.readFileSync(libraryPath, "utf8");
  const next = replaceEvidenceBlock(current, buildEvidenceBlock(records));
  fs.writeFileSync(libraryPath, next);
}

if (wantsSummaryJson) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(
    wantsWrite
      ? `Imported ${records.length} validated review evidence record(s).`
      : `Dry run: ${records.length} validated review evidence record(s) would be imported.`,
  );
  if (records.length > 0) {
    console.log(`Books: ${bookIds.join(", ")}`);
  }
}
