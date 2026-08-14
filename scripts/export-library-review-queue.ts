#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { LIBRARY_BOOKS } from "../client/data/libraryBooks";
import { computeBookContentHash } from "./lib/libraryContentHash";
import {
  hasQualifiedScholarReview,
  hasReviewStage,
  isSensitiveBook,
  qualityChecklistComplete,
} from "./lib/libraryReviewEvidence";

const wantsJson = process.argv.includes("--json");
const wantsSummaryJson = process.argv.includes("--summary-json");
const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");
const strict = process.argv.includes("--strict");

function argValue(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const outPath = argValue("--out", "docs/audit/LIBRARY_REVIEW_QUEUE.md");

function reviewPriority(book: (typeof LIBRARY_BOOKS)[number]) {
  if (isSensitiveBook(book)) return "qualified-scholar";
  if (book.requiredPlan === "free" || book.featured) return "editorial-first";
  if (book.requiredPlan === "scholar") return "scholar-plan";
  return "standard-editorial";
}

function reviewEvidenceState(
  book: (typeof LIBRARY_BOOKS)[number],
  sensitive: boolean,
) {
  const evidence = book.reviewEvidence;
  const editorial =
    Boolean(evidence) &&
    hasReviewStage(
      evidence?.editorialReviewer,
      evidence?.editorialReviewedAt,
      evidence?.editorialNotes,
    );
  const source =
    Boolean(evidence) &&
    hasReviewStage(
      evidence?.sourceReviewer,
      evidence?.sourceReviewedAt,
      evidence?.sourceNotes,
    );
  const qualifiedScholarComplete = hasQualifiedScholarReview(evidence);
  const qualifiedScholar =
    !sensitive || qualifiedScholarComplete
      ? sensitive
        ? "complete"
        : "not_required"
      : "missing";
  const publish =
    Boolean(evidence) &&
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
    qualifiedScholarRequired: sensitive,
    qualifiedScholar,
    qualifiedScholarComplete,
    publish,
    quality,
    complete:
      editorial &&
      source &&
      (!sensitive || qualifiedScholarComplete) &&
      publish &&
      quality,
  };
}

function missingQualifiedScholarReview(
  book: (typeof LIBRARY_BOOKS)[number],
  sensitive: boolean,
) {
  return sensitive && !hasQualifiedScholarReview(book.reviewEvidence);
}

const rows = LIBRARY_BOOKS.map((book) => {
  const sensitive = isSensitiveBook(book);
  const reviewEvidence = reviewEvidenceState(book, sensitive);
  return {
    id: book.id,
    title: book.title,
    plan: book.requiredPlan,
    category: book.category,
    status: book.verifiedContentStatus,
    priority: reviewPriority(book),
    sensitive,
    chapters: book.chapters.length,
    sourceRefs: book.chapters.reduce(
      (sum, chapter) => sum + chapter.sourceRefs.length,
      0,
    ),
    reviewEvidence,
    reviewTasks: [
      ...(reviewEvidence.editorial ? [] : ["final editorial review"]),
      ...(reviewEvidence.source ? [] : ["source relevance review"]),
      ...(reviewEvidence.quality ? [] : ["publication quality checklist"]),
      ...(missingQualifiedScholarReview(book, sensitive)
        ? ["qualified scholar review"]
        : []),
      ...(reviewEvidence.publish ? [] : ["publish-status decision"]),
    ],
  };
}).sort((a, b) => {
  const priorityOrder = [
    "qualified-scholar",
    "editorial-first",
    "scholar-plan",
    "standard-editorial",
  ];
  return (
    priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority) ||
    a.title.localeCompare(b.title)
  );
});

const summary = {
  ok:
    rows.every((row) => row.status === "published") &&
    rows.every((row) => row.reviewEvidence.complete),
  bookCount: rows.length,
  unpublishedCount: rows.filter((row) => row.status !== "published").length,
  sensitiveCount: rows.filter((row) => row.sensitive).length,
  freeCount: rows.filter((row) => row.plan === "free").length,
  premiumCount: rows.filter((row) => row.plan === "premium").length,
  scholarCount: rows.filter((row) => row.plan === "scholar").length,
  reviewEvidenceCompleteCount: rows.filter((row) => row.reviewEvidence.complete)
    .length,
  priorityCounts: rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.priority] = (counts[row.priority] || 0) + 1;
    return counts;
  }, {}),
};

function renderMarkdown() {
  const lines = [
    "# Library Content Review Queue",
    "",
    "This queue tracks the remaining book/content work before the library can be described as fully reviewed, published, and signed off to the highest standard.",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Commands",
    "",
    "```bash",
    "npm run export:library-review-packets -- --all",
    "npm run export:library-review-evidence-intake -- --write",
    "npm run export:library-review-evidence-intake -- --check --summary-json",
    "npm run validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --summary-json",
    "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --summary-json",
    "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --write",
    "npm run check:library-content-completion -- --summary-json",
    "```",
    "",
    "## Summary",
    "",
    `Books: ${summary.bookCount}`,
    `Unpublished: ${summary.unpublishedCount}`,
    `Sensitive/high-care: ${summary.sensitiveCount}`,
    `Review evidence complete: ${summary.reviewEvidenceCompleteCount}`,
    `Free: ${summary.freeCount}`,
    `Premium: ${summary.premiumCount}`,
    `Scholar: ${summary.scholarCount}`,
    "",
    "## Review Standard",
    "",
    "Every NurAI-exclusive book must have real editorial review, source relevance review, publication approval, and a completed quality checklist before it can count as final.",
    "Sensitive/high-care books also need qualified-scholar review with a specific review scope.",
    "",
    "The quality checklist requires reviewers to explicitly clear:",
    "",
    "- Title, subtitle, and product promise accuracy",
    "- Chapter completeness and coherence",
    "- Source relevance and source specificity",
    "- Unsupported religious, medical, legal, or outcome claims",
    "- Reflection, action, and quiz safety/usefulness",
    "- Audience level, tone, and safety boundaries",
    "",
    "## Queue",
    "",
    "| Priority | Plan | Book | Category | Chapters | Source refs | Tasks |",
    "| --- | --- | --- | --- | ---: | ---: | --- |",
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.priority} | ${row.plan} | ${row.title} | ${row.category} | ${row.chapters} | ${row.sourceRefs} | ${row.reviewTasks.join(", ")} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function normalizeGeneratedAt(markdown: string) {
  return markdown.replace(/^Generated: .+$/m, "Generated: <normalized>");
}

function checkCurrent(markdown: string) {
  if (!fs.existsSync(outPath)) {
    return {
      ok: false,
      findings: [`Missing library review queue artifact: ${outPath}`],
    };
  }
  const existing = fs.readFileSync(outPath, "utf8");
  if (normalizeGeneratedAt(existing) !== normalizeGeneratedAt(markdown)) {
    return {
      ok: false,
      findings: [
        `${outPath} is stale; run npm run export:library-review-queue -- --write.`,
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
const artifactSummary = {
  ok: artifactCheck ? artifactCheck.ok : summary.ok,
  outPath,
  written: wantsWrite,
  checked: wantsCheck,
  findings: artifactCheck ? artifactCheck.findings : [],
  summary,
};

if (wantsSummaryJson) {
  console.log(JSON.stringify(artifactSummary, null, 2));
  if (artifactCheck && !artifactCheck.ok) process.exit(1);
} else if (wantsJson) {
  console.log(JSON.stringify({ ...artifactSummary, rows }, null, 2));
  if (artifactCheck && !artifactCheck.ok) process.exit(1);
} else if (wantsCheck) {
  if (!artifactCheck?.ok) {
    console.error(
      artifactCheck?.findings.join("\n") ||
        "Library review queue check failed.",
    );
    process.exit(1);
  }
  console.log(`Library review queue is current at ${outPath}.`);
} else if (wantsWrite) {
  console.log(`Wrote ${outPath}.`);
} else {
  console.log(markdown);
}

if (strict && !summary.ok) process.exit(1);
