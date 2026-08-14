#!/usr/bin/env tsx

import { LIBRARY_BOOKS } from "../client/data/libraryBooks";
import { computeBookContentHash } from "./lib/libraryContentHash";
import {
  hasRealText,
  hasReviewStage,
  isSensitiveBook,
  normalized,
  qualityChecklistComplete,
} from "./lib/libraryReviewEvidence";

const wantsJson = process.argv.includes("--json");
const wantsSummaryJson = process.argv.includes("--summary-json");
const allowReviewPending = process.argv.includes("--allow-review-pending");

type Finding = {
  id: string;
  severity: "blocker" | "warning";
  message: string;
};

const findings: Finding[] = [];

function addFinding(
  id: string,
  severity: Finding["severity"],
  message: string,
) {
  findings.push({ id, severity, message });
}

function hasTemplateSignals(
  chapter: (typeof LIBRARY_BOOKS)[number]["chapters"][number],
) {
  const sectionBodies = chapter.sections.map((section) => section.body);
  const text = normalized(
    [
      chapter.subtitle,
      ...sectionBodies,
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

const statusCounts = new Map<string, number>();
const planCounts = new Map<string, number>();
let chapterCount = 0;
let sourceRefCount = 0;
let templateChapterCount = 0;
let sensitiveBookCount = 0;
let booksWithReviewEvidenceCount = 0;
let publishedBooksMissingReviewEvidenceCount = 0;
let bookMetadataIssueCount = 0;
let chapterStructureIssueCount = 0;
let sourceDiversityWarningCount = 0;
let repeatedSourceSetWarningCount = 0;
let reusedSourceNoteWarningCount = 0;
const seenBookIds = new Set<string>();
const seenBookTitles = new Set<string>();
const sourceNoteUsage = new Map<string, Set<string>>();

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hasPlaceholderText(value: unknown) {
  return !hasRealText(value);
}

function addBookMetadataFinding(
  id: string,
  severity: Finding["severity"],
  message: string,
) {
  bookMetadataIssueCount += 1;
  addFinding(id, severity, message);
}

function addChapterStructureFinding(
  id: string,
  severity: Finding["severity"],
  message: string,
) {
  chapterStructureIssueCount += 1;
  addFinding(id, severity, message);
}

function addSourceSpecificityFinding(id: string, message: string) {
  sourceDiversityWarningCount += 1;
  addFinding(id, "warning", message);
}

const REQUIRED_AUTHOR_NAME = "NurAI AI with Hamid Amjad";
const REQUIRED_PROVENANCE_LABEL = "AI-assisted in-app original";
const REQUIRED_CONTENT_ORIGIN = "nurai_exclusive_original";

function missingPublishedReviewEvidence(
  book: (typeof LIBRARY_BOOKS)[number],
  sensitive: boolean,
) {
  if (book.verifiedContentStatus !== "published") return [];
  const evidence = book.reviewEvidence;
  const missing: string[] = [];

  if (!evidence) {
    return [
      "editorial review evidence",
      "source relevance review evidence",
      "publish approval evidence",
      ...(sensitive
        ? ["qualified scholar review evidence", "scholar review scope"]
        : []),
    ];
  }

  if (evidence.approvedForPublication !== true) {
    missing.push("explicit approvedForPublication true flag");
  }
  if (!qualityChecklistComplete(evidence)) {
    missing.push("completed publication quality checklist");
  }

  if (!hasRealText(evidence.contentHash)) {
    missing.push("content hash tied to the reviewed packet");
  } else if (cleanText(evidence.contentHash) !== computeBookContentHash(book)) {
    missing.push("content hash matching the current book content");
  }

  if (
    !hasReviewStage(
      evidence.editorialReviewer,
      evidence.editorialReviewedAt,
      evidence.editorialNotes,
    )
  ) {
    missing.push("editorial review evidence with notes and valid date");
  }
  if (
    !hasReviewStage(
      evidence.sourceReviewer,
      evidence.sourceReviewedAt,
      evidence.sourceNotes,
    )
  ) {
    missing.push("source relevance review evidence with notes and valid date");
  }
  if (
    !hasReviewStage(
      evidence.publishApprover,
      evidence.publishApprovedAt,
      evidence.publishNotes,
    )
  ) {
    missing.push("publish approval evidence with notes and valid date");
  }
  if (
    sensitive &&
    !hasReviewStage(
      evidence.qualifiedScholarReviewer,
      evidence.qualifiedScholarReviewedAt,
      evidence.scholarNotes,
    )
  ) {
    missing.push("qualified scholar review evidence with notes and valid date");
  }
  if (sensitive && !hasRealText(evidence.scholarReviewScope)) {
    missing.push("scholar review scope");
  }
  if (
    sensitive &&
    hasRealText(evidence.scholarReviewScope) &&
    cleanText(evidence.scholarReviewScope).length < 40
  ) {
    missing.push("specific scholar review scope of at least 40 characters");
  }

  return missing;
}

function validateBookMetadata(book: (typeof LIBRARY_BOOKS)[number]) {
  const normalizedId = normalized(book.id);
  const normalizedTitle = normalized(book.title);

  if (seenBookIds.has(normalizedId)) {
    addBookMetadataFinding(
      `${book.id}:duplicate-book-id`,
      "blocker",
      `${book.title} repeats a book id already used in the library.`,
    );
  }
  seenBookIds.add(normalizedId);

  if (seenBookTitles.has(normalizedTitle)) {
    addBookMetadataFinding(
      `${book.id}:duplicate-title`,
      "blocker",
      `${book.title} repeats a book title already used in the library.`,
    );
  }
  seenBookTitles.add(normalizedTitle);

  if (book.title.length < 8 || book.title.length > 70) {
    addBookMetadataFinding(
      `${book.id}:title-length`,
      "warning",
      `${book.title} title should stay concise and app-store readable.`,
    );
  }
  if (book.subtitle.length < 20 || book.subtitle.length > 110) {
    addBookMetadataFinding(
      `${book.id}:subtitle-length`,
      "warning",
      `${book.title} subtitle should orient the reader in one clear line.`,
    );
  }
  if (book.description.length < 55 || book.description.length > 240) {
    addBookMetadataFinding(
      `${book.id}:description-length`,
      "warning",
      `${book.title} description should be useful enough for a premium library card without becoming a paragraph.`,
    );
  }

  for (const [field, value] of [
    ["title", book.title],
    ["subtitle", book.subtitle],
    ["description", book.description],
    ["author", book.authorName],
    ["provenance", book.provenanceLabel],
    ["safety note", book.safetyNote],
  ] as const) {
    if (hasPlaceholderText(value)) {
      addBookMetadataFinding(
        `${book.id}:placeholder-${field.replace(/\s+/g, "-")}`,
        "blocker",
        `${book.title} has missing or placeholder ${field}.`,
      );
    }
  }

  if (book.authorName !== REQUIRED_AUTHOR_NAME) {
    addBookMetadataFinding(
      `${book.id}:author-provenance`,
      "blocker",
      `${book.title} must keep the in-house author as ${REQUIRED_AUTHOR_NAME}.`,
    );
  }
  if (book.provenanceLabel !== REQUIRED_PROVENANCE_LABEL) {
    addBookMetadataFinding(
      `${book.id}:provenance-label`,
      "blocker",
      `${book.title} must keep the provenance label '${REQUIRED_PROVENANCE_LABEL}'.`,
    );
  }
  if (book.contentOrigin !== REQUIRED_CONTENT_ORIGIN) {
    addBookMetadataFinding(
      `${book.id}:content-origin`,
      "blocker",
      `${book.title} must keep contentOrigin as ${REQUIRED_CONTENT_ORIGIN}.`,
    );
  }

  const uniqueTags = new Set(book.tags.map((tag) => normalized(tag)));
  if (book.tags.length < 3 || uniqueTags.size !== book.tags.length) {
    addBookMetadataFinding(
      `${book.id}:tag-quality`,
      "warning",
      `${book.title} should have at least three unique discovery tags.`,
    );
  }
  if (book.tags.some(hasPlaceholderText)) {
    addBookMetadataFinding(
      `${book.id}:placeholder-tag`,
      "blocker",
      `${book.title} has a missing or placeholder tag.`,
    );
  }

  const chapterIds = new Set(book.chapters.map((chapter) => chapter.id));
  if (
    book.previewChapterIds.length === 0 ||
    book.previewChapterIds.some((chapterId) => !chapterIds.has(chapterId))
  ) {
    addBookMetadataFinding(
      `${book.id}:preview-chapter-ids`,
      "blocker",
      `${book.title} has no valid preview chapter id.`,
    );
  }

  const chapterMinutes = book.chapters.reduce(
    (sum, chapter) => sum + chapter.estimatedMinutes,
    0,
  );
  if (book.estimatedMinutes !== chapterMinutes) {
    addBookMetadataFinding(
      `${book.id}:estimated-minutes-mismatch`,
      "warning",
      `${book.title} estimated minutes (${book.estimatedMinutes}) do not match chapter total (${chapterMinutes}).`,
    );
  }
}

for (const book of LIBRARY_BOOKS) {
  const sensitive = isSensitiveBook(book);
  if (book.reviewEvidence) booksWithReviewEvidenceCount += 1;
  validateBookMetadata(book);

  statusCounts.set(
    book.verifiedContentStatus,
    (statusCounts.get(book.verifiedContentStatus) || 0) + 1,
  );
  planCounts.set(
    book.requiredPlan,
    (planCounts.get(book.requiredPlan) || 0) + 1,
  );

  if (book.verifiedContentStatus !== "published") {
    addFinding(
      `${book.id}:not-published`,
      "blocker",
      `${book.title} is ${book.verifiedContentStatus}, not published.`,
    );
  }

  if (!book.safetyNote.toLowerCase().includes("review")) {
    addFinding(
      `${book.id}:missing-review-safety-note`,
      "warning",
      `${book.title} safety note does not clearly mention review.`,
    );
  }

  if (sensitive) {
    sensitiveBookCount += 1;
    if (book.verifiedContentStatus !== "published") {
      addFinding(
        `${book.id}:sensitive-not-published`,
        "blocker",
        `${book.title} is sensitive/high-care content and still needs qualified review before final release claims.`,
      );
    }
  }

  const missingReviewEvidence = missingPublishedReviewEvidence(book, sensitive);
  if (missingReviewEvidence.length) {
    publishedBooksMissingReviewEvidenceCount += 1;
    addFinding(
      `${book.id}:published-without-review-evidence`,
      "blocker",
      `${book.title} is marked published but is missing ${missingReviewEvidence.join(", ")}.`,
    );
  }

  if (!book.chapters.length) {
    addFinding(`${book.id}:empty`, "blocker", `${book.title} has no chapters.`);
  }

  const seenChapterIds = new Set<string>();
  const seenChapterTitles = new Set<string>();
  const sourceSetCounts = new Map<string, string[]>();
  const uniqueBookSourceRefs = new Set<string>();
  let bookSourceRefCount = 0;

  for (const chapter of book.chapters) {
    chapterCount += 1;
    sourceRefCount += chapter.sourceRefs.length;
    bookSourceRefCount += chapter.sourceRefs.length;

    const normalizedChapterId = normalized(chapter.id);
    const normalizedChapterTitle = normalized(chapter.title);
    if (seenChapterIds.has(normalizedChapterId)) {
      addChapterStructureFinding(
        `${book.id}/${chapter.id}:duplicate-chapter-id`,
        "blocker",
        `${book.title} repeats chapter id ${chapter.id}.`,
      );
    }
    seenChapterIds.add(normalizedChapterId);
    if (seenChapterTitles.has(normalizedChapterTitle)) {
      addChapterStructureFinding(
        `${book.id}/${chapter.id}:duplicate-chapter-title`,
        "warning",
        `${book.title} repeats chapter title ${chapter.title}.`,
      );
    }
    seenChapterTitles.add(normalizedChapterTitle);

    if (hasTemplateSignals(chapter)) {
      templateChapterCount += 1;
      addFinding(
        `${book.id}/${chapter.id}:template-content`,
        "blocker",
        `${book.title} / ${chapter.title} still contains generated or repeated scaffold copy.`,
      );
    }

    const lessonWords = chapter.sections
      .filter((section) => section.type === "lesson")
      .map((section) => section.body.split(/\s+/).filter(Boolean).length)
      .reduce((sum, count) => sum + count, 0);
    if (lessonWords < 90) {
      addFinding(
        `${book.id}/${chapter.id}:short-lesson`,
        "warning",
        `${book.title} / ${chapter.title} has fewer than 90 lesson words.`,
      );
    }

    if (chapter.sourceRefs.length < 2) {
      addFinding(
        `${book.id}/${chapter.id}:low-source-count`,
        "warning",
        `${book.title} / ${chapter.title} has fewer than two source refs.`,
      );
    }

    const sourceSetKey = chapter.sourceRefs
      .map((sourceRef) =>
        [
          normalized(sourceRef.type),
          normalized(sourceRef.reference),
          normalized(sourceRef.note),
        ].join(":"),
      )
      .sort()
      .join("|");
    sourceSetCounts.set(sourceSetKey, [
      ...(sourceSetCounts.get(sourceSetKey) || []),
      chapter.id,
    ]);

    for (const sourceRef of chapter.sourceRefs) {
      uniqueBookSourceRefs.add(
        [
          normalized(sourceRef.type),
          normalized(sourceRef.reference),
          normalized(sourceRef.url || ""),
        ].join(":"),
      );
      const note = normalized(sourceRef.note);
      if (note) {
        const usageSet = sourceNoteUsage.get(note) || new Set<string>();
        usageSet.add(`${book.id}/${chapter.id}`);
        sourceNoteUsage.set(note, usageSet);
      }
    }

    if (chapter.reflectionQuestions.length < 2) {
      addChapterStructureFinding(
        `${book.id}/${chapter.id}:reflection-depth`,
        "warning",
        `${book.title} / ${chapter.title} should include at least two reflection prompts.`,
      );
    }
    if (chapter.actionSteps.length < 2) {
      addChapterStructureFinding(
        `${book.id}/${chapter.id}:action-depth`,
        "warning",
        `${book.title} / ${chapter.title} should include at least two action steps.`,
      );
    }
    if (chapter.quiz.length < 1) {
      addChapterStructureFinding(
        `${book.id}/${chapter.id}:quiz-missing`,
        "warning",
        `${book.title} / ${chapter.title} should include a retention quiz question.`,
      );
    }
  }

  for (const chapterIdsWithSameSources of sourceSetCounts.values()) {
    if (chapterIdsWithSameSources.length > 1) {
      repeatedSourceSetWarningCount += 1;
      addFinding(
        `${book.id}:repeated-source-set:${chapterIdsWithSameSources.join(",")}`,
        "warning",
        `${book.title} repeats the same source-card set across chapters ${chapterIdsWithSameSources.join(", ")}; source relevance review should confirm each card is chapter-specific.`,
      );
    }
  }

  const minimumUniqueRefs = Math.min(
    bookSourceRefCount,
    Math.max(8, Math.ceil(book.chapters.length * 1.75)),
  );
  if (
    book.chapters.length >= 4 &&
    uniqueBookSourceRefs.size < minimumUniqueRefs
  ) {
    addSourceSpecificityFinding(
      `${book.id}:low-source-diversity`,
      `${book.title} uses ${uniqueBookSourceRefs.size} unique source references across ${book.chapters.length} chapters; source relevance review should confirm broad source anchors are specific enough for every lesson.`,
    );
  }
}

for (const [note, usages] of sourceNoteUsage) {
  if (usages.size < 15) continue;
  reusedSourceNoteWarningCount += 1;
  const examples = [...usages].slice(0, 6).join(", ");
  addFinding(
    `source-note:reused:${note.slice(0, 48).replace(/[^a-z0-9]+/g, "-")}`,
    "warning",
    `Source note "${note}" is reused ${usages.size} times across the library. Source relevance review should confirm it is not being used as a generic placeholder. Examples: ${examples}.`,
  );
}

const blockerCount = findings.filter(
  (finding) => finding.severity === "blocker",
).length;
const warningCount = findings.filter(
  (finding) => finding.severity === "warning",
).length;
const reviewPublicationBlockerCount = findings.filter(
  (finding) =>
    finding.severity === "blocker" &&
    (finding.id.endsWith(":not-published") ||
      finding.id.endsWith(":sensitive-not-published") ||
      finding.id.endsWith(":published-without-review-evidence")),
).length;
const authoredContentBlockerCount =
  blockerCount - reviewPublicationBlockerCount;
const authoredContentComplete =
  authoredContentBlockerCount === 0 &&
  warningCount === 0 &&
  bookMetadataIssueCount === 0 &&
  chapterStructureIssueCount === 0 &&
  templateChapterCount === 0 &&
  sourceDiversityWarningCount === 0 &&
  repeatedSourceSetWarningCount === 0 &&
  reusedSourceNoteWarningCount === 0;
const readyForHighestStandardClaim = blockerCount === 0 && warningCount === 0;
const releaseReadyWithReviewPending =
  authoredContentComplete && publishedBooksMissingReviewEvidenceCount === 0;
const ok = allowReviewPending
  ? releaseReadyWithReviewPending
  : readyForHighestStandardClaim;
const report = {
  ok,
  readyForHighestStandardClaim,
  releaseReadyWithReviewPending,
  reviewPendingAcceptedForReleaseGate: allowReviewPending,
  authoredContentComplete,
  bookCount: LIBRARY_BOOKS.length,
  chapterCount,
  sourceRefCount,
  templateChapterCount,
  sensitiveBookCount,
  booksWithReviewEvidenceCount,
  publishedBooksMissingReviewEvidenceCount,
  bookMetadataIssueCount,
  chapterStructureIssueCount,
  sourceDiversityWarningCount,
  repeatedSourceSetWarningCount,
  reusedSourceNoteWarningCount,
  authoredContentBlockerCount,
  reviewPublicationBlockerCount,
  statusCounts: Object.fromEntries(statusCounts),
  planCounts: Object.fromEntries(planCounts),
  blockerCount,
  warningCount,
  findings,
};

if (wantsSummaryJson) {
  const { findings: _findings, ...summary } = report;
  console.log(JSON.stringify(summary, null, 2));
} else if (wantsJson) {
  console.log(JSON.stringify(report, null, 2));
} else if (report.ok) {
  console.log(
    allowReviewPending
      ? `Library authored-content release check passed: ${LIBRARY_BOOKS.length} book(s) have complete NurAI-authored content. Review evidence remains pending and must not be claimed.`
      : `Library content completion check passed: ${LIBRARY_BOOKS.length} book(s) are published and free of strict completion blockers or warnings.`,
  );
} else {
  console.error("Library content completion check failed:");
  console.error(`- ${blockerCount} blocker(s), ${warningCount} warning(s).`);
  console.error(
    `- ${templateChapterCount}/${chapterCount} chapter(s) still show generated/repeated scaffold signals.`,
  );
  console.error(
    `- Book metadata/title issues: ${bookMetadataIssueCount}; chapter structure issues: ${chapterStructureIssueCount}.`,
  );
  console.error(
    "- The library should not be described as fully reviewed, scholar-reviewed, published, or highest-standard complete until both blockers and warnings are resolved.",
  );
}

if (!report.ok) process.exit(1);
