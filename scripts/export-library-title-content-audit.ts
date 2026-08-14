#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { LIBRARY_BOOKS } from "../client/data/libraryBooks";
import { computeBookContentHash } from "./lib/libraryContentHash";
import {
  hasQualifiedScholarReview,
  hasReviewStage,
  isSensitiveBook,
  normalized,
  qualityChecklistComplete,
} from "./lib/libraryReviewEvidence";

const wantsJson = process.argv.includes("--json");
const wantsSummaryJson = process.argv.includes("--summary-json");
const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const root = process.cwd();
const outPath = path.resolve(
  root,
  argValue("--out") ?? "docs/audit/LIBRARY_TITLE_CONTENT_AUDIT.md",
);

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "for",
  "from",
  "in",
  "into",
  "is",
  "of",
  "on",
  "non",
  "path",
  "the",
  "to",
  "upon",
  "with",
  "without",
]);

const OVERCLAIM_PATTERN =
  /\b(guarantee|guaranteed|master(?:y)?|perfect(?:ly|ion)?|cure|diagnose|fatwa|scholar-approved|fully verified|official ruling|always works|never fail)\b/i;

function normalizeWord(word: string) {
  let token = word
    .replace(/['’]s$/g, "")
    .replace(/['’]/g, "")
    .toLowerCase();
  if (token === "duas") return "dua";
  if (token.endsWith("ies") && token.length > 4) {
    token = `${token.slice(0, -3)}y`;
  } else if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) {
    token = token.slice(0, -1);
  }
  return token;
}

function words(text: string) {
  return normalized(text)
    .split(/[^a-z0-9]+/)
    .map(normalizeWord)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function reviewEvidenceState(
  book: (typeof LIBRARY_BOOKS)[number],
  highCare: boolean,
) {
  const evidence = book.reviewEvidence;
  const editorial = hasReviewStage(
    evidence?.editorialReviewer,
    evidence?.editorialReviewedAt,
    evidence?.editorialNotes,
  );
  const source = hasReviewStage(
    evidence?.sourceReviewer,
    evidence?.sourceReviewedAt,
    evidence?.sourceNotes,
  );
  const scholar = !highCare || hasQualifiedScholarReview(evidence);
  const publish =
    evidence?.approvedForPublication === true &&
    evidence?.contentHash === computeBookContentHash(book) &&
    hasReviewStage(
      evidence?.publishApprover,
      evidence?.publishApprovedAt,
      evidence?.publishNotes,
    );
  const quality = qualityChecklistComplete(evidence);
  return {
    editorial,
    source,
    scholar,
    publish,
    quality,
    complete: editorial && source && scholar && publish && quality,
  };
}

function bookBodyText(book: (typeof LIBRARY_BOOKS)[number]) {
  return normalized(
    book.chapters
      .flatMap((chapter) => [
        chapter.title,
        chapter.subtitle,
        ...chapter.sections.flatMap((section) => [
          section.heading,
          section.body,
        ]),
        ...chapter.reflectionQuestions,
        ...chapter.actionSteps,
        ...chapter.quiz.flatMap((question) => [
          question.question,
          question.explanation,
        ]),
        ...chapter.sourceRefs.flatMap((source) => [
          source.type,
          source.reference,
          source.note,
        ]),
      ])
      .join(" "),
  );
}

const rows = LIBRARY_BOOKS.map((book) => {
  const highCare = isSensitiveBook(book);
  const reviewEvidence = reviewEvidenceState(book, highCare);
  const titleTerms = unique(words(book.title));
  const promiseTerms = unique(
    words(
      [book.title, book.subtitle, book.description, ...book.tags].join(" "),
    ),
  );
  const bodyTerms = new Set(words(bookBodyText(book)));
  const coveredTitleTerms = titleTerms.filter((term) => bodyTerms.has(term));
  const missingTitleTerms = titleTerms.filter((term) => !bodyTerms.has(term));
  const coveredPromiseTerms = promiseTerms.filter((term) =>
    bodyTerms.has(term),
  );
  const titleCoverage =
    titleTerms.length === 0 ? 1 : coveredTitleTerms.length / titleTerms.length;
  const promiseCoverage =
    promiseTerms.length === 0
      ? 1
      : coveredPromiseTerms.length / promiseTerms.length;
  const metadataText = [
    book.title,
    book.subtitle,
    book.description,
    book.safetyNote,
  ].join(" ");
  const overclaim = OVERCLAIM_PATTERN.test(metadataText);
  const sourceRefs = book.chapters.reduce(
    (sum, chapter) => sum + chapter.sourceRefs.length,
    0,
  );
  const uniqueSourceReferences = new Set(
    book.chapters.flatMap((chapter) =>
      chapter.sourceRefs.map((source) =>
        [normalized(source.type), normalized(source.reference)].join(":"),
      ),
    ),
  ).size;
  const averageLessonWords =
    book.chapters.reduce((sum, chapter) => {
      const lessonWords = chapter.sections
        .filter((section) => section.type === "lesson")
        .flatMap((section) => section.body.split(/\s+/).filter(Boolean)).length;
      return sum + lessonWords;
    }, 0) / Math.max(1, book.chapters.length);
  const reviewTasks = [
    ...(reviewEvidence.editorial ? [] : ["editorial review"]),
    ...(reviewEvidence.source ? [] : ["source relevance review"]),
    ...(reviewEvidence.quality ? [] : ["publication quality checklist"]),
    ...(highCare && !reviewEvidence.scholar
      ? ["qualified scholar review"]
      : []),
    ...(reviewEvidence.publish ? [] : ["publish approval"]),
  ];
  const automatedConcerns = [
    ...(titleCoverage < 0.8
      ? [
          `Title terms not visible enough in chapters: ${missingTitleTerms.join(", ")}`,
        ]
      : []),
    ...(promiseCoverage < 0.45
      ? ["Subtitle/description promise needs manual alignment review"]
      : []),
    ...(overclaim
      ? ["Metadata may contain an overclaim that needs editorial review"]
      : []),
    ...(sourceRefs < book.chapters.length * 2
      ? ["Source coverage is thin for chapter count"]
      : []),
    ...(averageLessonWords < 90
      ? ["Average lesson body is short for a premium book"]
      : []),
  ];
  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    authorName: book.authorName,
    provenanceLabel: book.provenanceLabel,
    contentOrigin: book.contentOrigin,
    category: book.category,
    plan: book.requiredPlan,
    status: book.verifiedContentStatus,
    highCare,
    chapters: book.chapters.length,
    sourceRefs,
    uniqueSourceReferences,
    averageLessonWords: Math.round(averageLessonWords),
    titleTerms,
    coveredTitleTerms,
    missingTitleTerms,
    titleCoverage: Number(titleCoverage.toFixed(2)),
    promiseCoverage: Number(promiseCoverage.toFixed(2)),
    overclaim,
    reviewEvidence,
    reviewTasks,
    automatedConcerns,
    contentHash: computeBookContentHash(book),
    verdict: reviewEvidence.complete
      ? "Title/content evidence is complete for release."
      : "Do not claim highest-standard completion until review evidence is attached.",
  };
}).sort((a, b) => {
  if (a.reviewEvidence.complete !== b.reviewEvidence.complete) {
    return a.reviewEvidence.complete ? 1 : -1;
  }
  if (a.highCare !== b.highCare) return a.highCare ? -1 : 1;
  return a.title.localeCompare(b.title);
});

const summary = {
  ok: rows.every((row) => row.reviewEvidence.complete),
  readyForHighestStandardClaim: rows.every(
    (row) => row.reviewEvidence.complete,
  ),
  bookCount: rows.length,
  highCareBookCount: rows.filter((row) => row.highCare).length,
  reviewedBookCount: rows.filter((row) => row.reviewEvidence.complete).length,
  titleCoverageConcernCount: rows.filter((row) => row.titleCoverage < 0.8)
    .length,
  promiseCoverageConcernCount: rows.filter((row) => row.promiseCoverage < 0.45)
    .length,
  overclaimConcernCount: rows.filter((row) => row.overclaim).length,
  automatedConcernCount: rows.reduce(
    (sum, row) => sum + row.automatedConcerns.length,
    0,
  ),
  statusCounts: rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
    return counts;
  }, {}),
  planCounts: rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.plan] = (counts[row.plan] || 0) + 1;
    return counts;
  }, {}),
};

function renderMarkdown() {
  const lines = [
    "# NurAI Library Title And Content Audit",
    "",
    "This audit is for the founder/editor/reviewer question: are the book titles, product promises, chapters, and source-backed lessons finished to the highest standard?",
    "",
    "It does not create approval evidence. It surfaces the automated title/content signals and shows exactly which human review evidence is still missing.",
    "",
    "## Summary",
    "",
    `- Ready for highest-standard claim: ${summary.readyForHighestStandardClaim ? "yes" : "no"}`,
    `- Books: ${summary.bookCount}`,
    `- High-care books: ${summary.highCareBookCount}`,
    `- Books with complete review evidence: ${summary.reviewedBookCount}`,
    `- Title coverage concerns: ${summary.titleCoverageConcernCount}`,
    `- Promise coverage concerns: ${summary.promiseCoverageConcernCount}`,
    `- Metadata overclaim concerns: ${summary.overclaimConcernCount}`,
    `- Automated concerns total: ${summary.automatedConcernCount}`,
    "",
    "## Required Human Evidence",
    "",
    "- Editorial review that the title, subtitle, description, tone, exercises, and chapter structure are complete.",
    "- Source relevance review that every source card supports the exact chapter it appears in.",
    "- Completed publication quality checklist for every book.",
    "- Qualified-scholar review for high-care topics such as fiqh, zakat, marriage, women, Hajj/Umrah, hadith, purification, business, and wealth.",
    "- Publish approval tied to the current content hash.",
    "",
    "## Book Audit",
    "",
  ];

  for (const row of rows) {
    lines.push(`### ${row.title}`, "");
    lines.push(`- ID: ${row.id}`);
    lines.push(`- Subtitle: ${row.subtitle}`);
    lines.push(`- Author: ${row.authorName}`);
    lines.push(`- Provenance: ${row.provenanceLabel}`);
    lines.push(`- Content origin: ${row.contentOrigin}`);
    lines.push(`- Category: ${row.category}`);
    lines.push(`- Plan: ${row.plan}`);
    lines.push(`- Status: ${row.status}`);
    lines.push(`- High-care: ${row.highCare ? "yes" : "no"}`);
    lines.push(`- Chapters: ${row.chapters}`);
    lines.push(`- Source refs: ${row.sourceRefs}`);
    lines.push(`- Unique source references: ${row.uniqueSourceReferences}`);
    lines.push(`- Average lesson words: ${row.averageLessonWords}`);
    lines.push(`- Title coverage: ${row.titleCoverage}`);
    lines.push(`- Promise coverage: ${row.promiseCoverage}`);
    lines.push(
      `- Missing title terms in chapters: ${
        row.missingTitleTerms.length ? row.missingTitleTerms.join(", ") : "none"
      }`,
    );
    lines.push(`- Metadata overclaim concern: ${row.overclaim ? "yes" : "no"}`);
    lines.push(
      `- Review evidence complete: ${row.reviewEvidence.complete ? "yes" : "no"}`,
    );
    lines.push(
      `- Missing review tasks: ${
        row.reviewTasks.length ? row.reviewTasks.join(", ") : "none"
      }`,
    );
    lines.push(`- Verdict: ${row.verdict}`);
    if (row.automatedConcerns.length) {
      lines.push("", "Automated concerns:");
      for (const concern of row.automatedConcerns) lines.push(`- ${concern}`);
    }
    lines.push("");
  }

  lines.push("## Verification", "");
  lines.push("```bash");
  lines.push(
    "npm run export:library-title-content-audit -- --check --summary-json",
  );
  lines.push("npm run check:library-content-completion -- --summary-json");
  lines.push(
    "npm run validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --summary-json",
  );
  lines.push(
    "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --write",
  );
  lines.push("```");
  return lines.join("\n");
}

function checkCurrent(markdown: string) {
  if (!fs.existsSync(outPath)) {
    return {
      ok: false,
      findings: [
        `Missing title/content audit artifact: ${path.relative(root, outPath)}`,
      ],
    };
  }

  const existing = fs.readFileSync(outPath, "utf8");
  if (existing !== markdown) {
    return {
      ok: false,
      findings: [
        `${path.relative(root, outPath)} is stale; run npm run export:library-title-content-audit -- --write.`,
      ],
    };
  }

  return { ok: true, findings: [] };
}

const markdown = renderMarkdown();

if (wantsWrite) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, markdown);
}

const artifactCheck = wantsCheck ? checkCurrent(markdown) : null;

const report = {
  ok: artifactCheck ? artifactCheck.ok : summary.ok,
  outPath: path.relative(root, outPath),
  willWrite: wantsWrite,
  checked: wantsCheck,
  findings: artifactCheck ? artifactCheck.findings : [],
  summary,
  rows,
};

if (wantsSummaryJson) {
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        outPath: report.outPath,
        willWrite: report.willWrite,
        checked: report.checked,
        findings: report.findings,
        summary,
      },
      null,
      2,
    ),
  );
  if (artifactCheck && !artifactCheck.ok) process.exit(1);
} else if (wantsJson) {
  console.log(JSON.stringify(report, null, 2));
  if (artifactCheck && !artifactCheck.ok) process.exit(1);
} else if (wantsCheck) {
  if (!artifactCheck?.ok) {
    console.error(
      artifactCheck?.findings.join("\n") ||
        "Library title/content audit check failed.",
    );
    process.exit(1);
  }
  console.log(`Library title/content audit is current at ${report.outPath}.`);
} else if (wantsWrite) {
  console.log(`Wrote ${report.outPath}.`);
} else {
  console.log(markdown);
}
