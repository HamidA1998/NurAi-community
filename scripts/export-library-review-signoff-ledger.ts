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
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

const outPath =
  argValue("--out") || "docs/audit/LIBRARY_REVIEW_SIGNOFF_LEDGER.md";

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

function contentState(book: (typeof LIBRARY_BOOKS)[number]) {
  const scaffoldChapterIds = book.chapters
    .filter(hasGeneratedScaffoldSignals)
    .map((chapter) => chapter.id);

  return {
    scaffoldChapterCount: scaffoldChapterIds.length,
    scaffoldChapterIds,
  };
}

function reviewPriority(book: (typeof LIBRARY_BOOKS)[number]) {
  if (isSensitiveBook(book)) return "qualified-scholar";
  if (book.requiredPlan === "free" || book.featured || book.recommended) {
    return "editorial-first";
  }
  if (book.requiredPlan === "scholar") return "scholar-plan";
  return "standard-editorial";
}

function evidenceState(book: (typeof LIBRARY_BOOKS)[number]) {
  const sensitive = isSensitiveBook(book);
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
  const scholar = sensitive ? hasQualifiedScholarReview(evidence) : true;
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

function packetPath(book: (typeof LIBRARY_BOOKS)[number]) {
  const targetPath = path.resolve(
    process.cwd(),
    "docs/audit/library-review-packets",
    reviewPriority(book),
    `${book.id}.md`,
  );
  return path
    .relative(path.dirname(path.resolve(process.cwd(), outPath)), targetPath)
    .replace(/\\/g, "/");
}

const rows = LIBRARY_BOOKS.map((book) => {
  const sensitive = isSensitiveBook(book);
  const evidence = evidenceState(book);
  const content = contentState(book);
  const missing = [
    ...(evidence.editorial ? [] : ["editorial"]),
    ...(evidence.source ? [] : ["source"]),
    ...(evidence.quality ? [] : ["quality-checklist"]),
    ...(content.scaffoldChapterCount ? ["content-rewrite"] : []),
    ...(evidence.scholar ? [] : ["qualified-scholar"]),
    ...(evidence.publish ? [] : ["publish"]),
  ];
  return {
    id: book.id,
    title: book.title,
    provenance: book.provenanceLabel,
    plan: book.requiredPlan,
    status: book.verifiedContentStatus,
    priority: reviewPriority(book),
    sensitive,
    content,
    packet: packetPath(book),
    evidence,
    missing,
  };
});

const summary = {
  evidenceOk: rows.every((row) => row.evidence.complete),
  bookCount: rows.length,
  completeEvidenceCount: rows.filter((row) => row.evidence.complete).length,
  incompleteEvidenceCount: rows.filter((row) => !row.evidence.complete).length,
  requiresQualifiedScholarCount: rows.filter((row) => row.sensitive).length,
  missingEditorialCount: rows.filter((row) => !row.evidence.editorial).length,
  missingSourceCount: rows.filter((row) => !row.evidence.source).length,
  missingQualityChecklistCount: rows.filter((row) => !row.evidence.quality)
    .length,
  missingQualifiedScholarCount: rows.filter((row) =>
    row.missing.includes("qualified-scholar"),
  ).length,
  missingPublishCount: rows.filter((row) => !row.evidence.publish).length,
  generatedScaffoldChapterCount: rows.reduce(
    (sum, row) => sum + row.content.scaffoldChapterCount,
    0,
  ),
  booksWithGeneratedScaffoldCount: rows.filter(
    (row) => row.content.scaffoldChapterCount > 0,
  ).length,
  outPath,
  written: wantsWrite,
  checked: wantsCheck,
};

function yn(value: boolean) {
  return value ? "yes" : "no";
}

function renderMarkdown() {
  const lines = [
    "# NurAI Library Review Sign-Off Ledger",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This ledger is a tracking artifact only. It does not create, imply, or replace real editorial, source, qualified-scholar, or publish approval evidence.",
    "",
    "A book can only be marked `published` after its real reviewer names, review dates, source relevance decision, completed quality checklist, publish approval, and qualified-scholar scope where required have been added to `reviewEvidence` in `client/data/libraryBooks.ts`.",
    "",
    "## Summary",
    "",
    `- Books: ${summary.bookCount}`,
    `- Books with complete evidence: ${summary.completeEvidenceCount}`,
    `- Books missing evidence: ${summary.incompleteEvidenceCount}`,
    `- Books requiring qualified-scholar review: ${summary.requiresQualifiedScholarCount}`,
    `- Missing editorial evidence: ${summary.missingEditorialCount}`,
    `- Missing source relevance evidence: ${summary.missingSourceCount}`,
    `- Missing publication quality checklist: ${summary.missingQualityChecklistCount}`,
    `- Missing qualified-scholar evidence/scope: ${summary.missingQualifiedScholarCount}`,
    `- Missing publish approval evidence: ${summary.missingPublishCount}`,
    `- Books with generated/repeated scaffold chapters: ${summary.booksWithGeneratedScaffoldCount}`,
    `- Generated/repeated scaffold chapters: ${summary.generatedScaffoldChapterCount}`,
    "",
    "## Ledger",
    "",
    "| Priority | Plan | Book | Provenance | Status | Sensitive | Scaffold chapters | Editorial | Source | Quality | Scholar | Publish | Missing | Packet |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${row.priority} | ${row.plan} | ${row.title} | ${row.provenance} | ${row.status} | ${yn(row.sensitive)} | ${row.content.scaffoldChapterCount} | ${yn(row.evidence.editorial)} | ${yn(row.evidence.source)} | ${yn(row.evidence.quality)} | ${yn(row.evidence.scholar)} | ${yn(row.evidence.publish)} | ${row.missing.join(", ") || "none"} | [packet](${row.packet}) |`,
    ),
    "",
    "## Evidence Fields Required",
    "",
    "- `approvedForPublication: true`",
    "- `contentHash` copied from the current review packet",
    "- `qualityChecklist` with title accuracy, chapter completeness, source relevance, unsupported-claim, exercise safety, and audience/tone fields all true",
    "- `editorialReviewer`, `editorialReviewedAt`, and `editorialNotes`",
    "- `sourceReviewer`, `sourceReviewedAt`, and `sourceNotes`",
    "- `publishApprover`, `publishApprovedAt`, and `publishNotes`",
    "- For sensitive/high-care books: `qualifiedScholarReviewer`, `qualifiedScholarReviewedAt`, `scholarReviewScope`, and `scholarNotes`",
    "",
    "Keep this ledger in sync by running:",
    "",
    "```bash",
    "npm run export:library-review-signoff-ledger -- --write",
    "npm run export:library-review-signoff-ledger -- --check --summary-json",
    "npm run validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --summary-json",
    "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --summary-json",
    "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --write",
    "npm run check:library-content-completion -- --summary-json",
    "```",
    "",
  ];
  return `${lines.join("\n")}`;
}

function normalizeGeneratedAt(value: string) {
  return value.replace(/^Generated: .+$/m, "Generated: <normalized>");
}

function checkCurrent(markdown: string) {
  const resolved = path.resolve(process.cwd(), outPath);
  if (!fs.existsSync(resolved)) {
    return {
      ok: false,
      findings: [`Missing library sign-off ledger artifact: ${outPath}`],
    };
  }

  const existing = fs.readFileSync(resolved, "utf8");
  if (normalizeGeneratedAt(existing) !== normalizeGeneratedAt(markdown)) {
    return {
      ok: false,
      findings: [
        `${outPath} is stale; run npm run export:library-review-signoff-ledger -- --write.`,
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
  ok: artifactCheck ? artifactCheck.ok : summary.evidenceOk,
  ...summary,
  findings: artifactCheck ? artifactCheck.findings : [],
};

if (wantsSummaryJson) {
  console.log(JSON.stringify(report, null, 2));
  if (artifactCheck && !artifactCheck.ok) process.exit(1);
} else if (wantsJson) {
  console.log(JSON.stringify({ ...report, rows }, null, 2));
  if (artifactCheck && !artifactCheck.ok) process.exit(1);
} else if (wantsCheck) {
  if (!artifactCheck?.ok) {
    console.error(
      artifactCheck?.findings.join("\n") ||
        "Library review sign-off ledger check failed.",
    );
    process.exit(1);
  }
  console.log(`Library review sign-off ledger is current at ${outPath}.`);
} else if (wantsWrite) {
  console.log(`Library review sign-off ledger written to ${outPath}.`);
} else {
  console.log(markdown);
}

if (!summary.evidenceOk) {
  process.exitCode = 0;
}
