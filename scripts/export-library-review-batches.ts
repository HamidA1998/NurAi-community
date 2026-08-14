#!/usr/bin/env tsx

import { createHash } from "node:crypto";
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

type Book = (typeof LIBRARY_BOOKS)[number];

const wantsJson = process.argv.includes("--json");
const wantsSummaryJson = process.argv.includes("--summary-json");
const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");

function argValue(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const outPath = argValue("--out", "docs/audit/LIBRARY_REVIEW_BATCHES.md");

const EVIDENCE = {
  editorial: "Editorial review evidence",
  source: "Source relevance review evidence",
  quality: "Completed quality checklist",
  scholar: "Qualified scholar review scope and notes",
  publish: "Publish approval decision",
} as const;

function reviewPriority(book: Book) {
  if (isSensitiveBook(book)) return "qualified-scholar";
  if (book.requiredPlan === "free" || book.featured) return "editorial-first";
  if (book.requiredPlan === "scholar") return "scholar-plan";
  return "standard-editorial";
}

function missingEvidence(book: Book) {
  const evidence = book.reviewEvidence;
  const sensitive = isSensitiveBook(book);
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
  const quality = qualityChecklistComplete(evidence);
  const scholar = !sensitive || hasQualifiedScholarReview(evidence);
  const publish =
    evidence?.approvedForPublication === true &&
    evidence?.contentHash === computeBookContentHash(book) &&
    hasReviewStage(
      evidence?.publishApprover,
      evidence?.publishApprovedAt,
      evidence?.publishNotes,
    );

  return [
    ...(editorial ? [] : [EVIDENCE.editorial]),
    ...(source ? [] : [EVIDENCE.source]),
    ...(quality ? [] : [EVIDENCE.quality]),
    ...(scholar ? [] : [EVIDENCE.scholar]),
    ...(publish ? [] : [EVIDENCE.publish]),
  ];
}

const queue = LIBRARY_BOOKS.map((book) => ({
  id: book.id,
  title: book.title,
  category: book.category,
  plan: book.requiredPlan,
  status: book.verifiedContentStatus,
  priority: reviewPriority(book),
  sensitive: isSensitiveBook(book),
  chapters: book.chapters.length,
  sourceRefs: book.chapters.reduce(
    (total, chapter) => total + chapter.sourceRefs.length,
    0,
  ),
  contentHash: computeBookContentHash(book),
  reviewPacketPath: path.join(
    "docs",
    "audit",
    "library-review-packets",
    reviewPriority(book),
    `${book.id}.md`,
  ),
  missingEvidence: missingEvidence(book),
})).filter((book) => book.missingEvidence.length > 0);

const batchDefinitions: {
  id: string;
  title: string;
  owner: string;
  evidence: string[];
  description: string;
  acceptanceChecklist: string[];
  evidenceBoundary: string;
}[] = [
  {
    id: "qualified-scholar",
    title: "High-care scholar batch",
    owner: "Qualified scholar reviewer",
    evidence: [EVIDENCE.scholar],
    description:
      "Sensitive worship, family, wealth, and revert books that need qualified review scope and notes before publication decisions.",
    acceptanceChecklist: [
      "qualifiedScholarReviewer, qualifiedScholarReviewedAt, scholarReviewScope, and scholarNotes are filled with real reviewer evidence for every high-care book in scope.",
      "scholarReviewScope explains what was reviewed and what remains outside the scholar review scope.",
      "Scholar sign-off is dated before or on the publish approval date and never replaces editorial or source review evidence.",
    ],
    evidenceBoundary:
      "This batch can clear qualified-scholar review scope only. It does not create publication approval, whole-library approval, or final religious authority claims by itself.",
  },
  {
    id: "source-relevance",
    title: "Source relevance batch",
    owner: "Source reviewer",
    evidence: [EVIDENCE.source],
    description:
      "Books needing human confirmation that every source card directly supports the chapter content.",
    acceptanceChecklist: [
      "sourceReviewer, sourceReviewedAt, and sourceNotes are filled with specific source-to-chapter relevance notes.",
      "The reviewer confirms source cards support the claims being made, not just that URLs are valid.",
      "Any broad, repeated, or unrelated source card is corrected before source review evidence is accepted.",
    ],
    evidenceBoundary:
      "This batch can clear source relevance only. It does not approve publication, scholar scope, or unsupported religious outcome claims.",
  },
  {
    id: "editorial",
    title: "Editorial promise batch",
    owner: "Editorial reviewer",
    evidence: [EVIDENCE.editorial],
    description:
      "Books needing title, subtitle, chapter substance, audience, and tone review before sign-off.",
    acceptanceChecklist: [
      "editorialReviewer, editorialReviewedAt, and editorialNotes are filled with book-specific promise, audience, and tone review.",
      "The reviewer confirms the title, subtitle, description, and chapters match what the book actually teaches.",
      "Any thin chapter, overpromising card copy, or generated-draft feel is fixed before editorial review evidence is accepted.",
    ],
    evidenceBoundary:
      "This batch can clear editorial promise review only. It cannot be used as source review, scholar review, or publish approval evidence.",
  },
  {
    id: "quality-checklist",
    title: "Quality checklist batch",
    owner: "QA reviewer",
    evidence: [EVIDENCE.quality],
    description:
      "Books needing final checklist confirmation for promise accuracy, safe exercises, source specificity, and unsupported-claim checks.",
    acceptanceChecklist: [
      "Every qualityChecklist field is true only after the reviewer explicitly clears that field for the current content hash.",
      "Checklist approval covers title accuracy, chapter completeness, source relevance, unsupported claims, exercises, audience, tone, and safety boundaries.",
      "A partial checklist keeps the book review-ready; it does not support published or highest-standard completion claims.",
    ],
    evidenceBoundary:
      "This batch can clear checklist readiness only. Publication remains blocked until named review stages and publish approval also validate.",
  },
  {
    id: "publish-decision",
    title: "Publish decision batch",
    owner: "Publisher",
    evidence: [EVIDENCE.publish],
    description:
      "Books needing final approval only after reviewer evidence is valid for the current content hash.",
    acceptanceChecklist: [
      "approvedForPublication is true only after editorial review, source review, required scholar review, and the quality checklist are complete.",
      "publishApprover, publishApprovedAt, and publishNotes explain why the current content hash is ready to publish.",
      "Publish approval dates are not earlier than editorial, source, or required qualified-scholar review dates.",
    ],
    evidenceBoundary:
      "This batch can clear the final publish decision only when earlier evidence is already valid for the same content hash.",
  },
] as const;

const batches = batchDefinitions
  .map((definition) => {
    const books = queue.filter((book) =>
      book.missingEvidence.some((evidence) =>
        definition.evidence.includes(evidence),
      ),
    );
    const batchHash = createHash("sha256")
      .update(
        JSON.stringify({
          id: definition.id,
          evidence: definition.evidence,
          books: books.map((book) => ({
            id: book.id,
            contentHash: book.contentHash,
            missingEvidence: book.missingEvidence.filter((evidence) =>
              definition.evidence.includes(evidence),
            ),
          })),
        }),
      )
      .digest("hex");
    return {
      ...definition,
      batchHash,
      bookCount: books.length,
      sensitiveCount: books.filter((book) => book.sensitive).length,
      missingEvidenceCount: books.reduce(
        (total, book) =>
          total +
          book.missingEvidence.filter((evidence) =>
            definition.evidence.includes(evidence),
          ).length,
        0,
      ),
      books,
    };
  })
  .filter((batch) => batch.bookCount > 0);

const summary = {
  ok: batches.length === 0,
  batchCount: batches.length,
  pendingBookCount: queue.length,
  sensitivePendingBookCount: queue.filter((book) => book.sensitive).length,
  missingEvidenceCount: batches.reduce(
    (total, batch) => total + batch.missingEvidenceCount,
    0,
  ),
  nextBatchId: batches[0]?.id || "",
  nextBatchTitle: batches[0]?.title || "",
  nextBatchHash: batches[0]?.batchHash || "",
  batchCounts: Object.fromEntries(
    batches.map((batch) => [batch.id, batch.bookCount]),
  ),
  batchHashes: Object.fromEntries(
    batches.map((batch) => [batch.id, batch.batchHash]),
  ),
};

function batchEvidenceFile(batchId: string) {
  return `/absolute/path/to/${batchId}-library-review-evidence.json`;
}

function batchReviewStage(batchId: string) {
  const stages: Record<string, string> = {
    "qualified-scholar": "qualified-scholar-review",
    "source-relevance": "source-relevance-review",
    editorial: "editorial-review",
    "quality-checklist": "quality-checklist",
    "publish-decision": "publish-approval",
  };
  return stages[batchId] || "all";
}

function batchIntakeCommand(batchId: string) {
  const out = batchEvidenceFile(batchId);
  const stage = batchReviewStage(batchId);
  return batchId === "qualified-scholar"
    ? `npm run export:library-review-evidence-intake -- --write --priority qualified-scholar --stage ${stage} --out ${out}`
    : `npm run export:library-review-evidence-intake -- --write --stage ${stage} --out ${out}`;
}

function batchValidationCommands(batchId: string) {
  const out = batchEvidenceFile(batchId);
  return [
    batchIntakeCommand(batchId),
    `npm run validate:library-review-evidence -- --file ${out} --summary-json`,
    `npm run apply:library-review-evidence -- --file ${out} --summary-json`,
    `npm run apply:library-review-evidence -- --file ${out} --write --allow-partial-import`,
    "npm run export:library-review-signoff-ledger -- --write",
    "npm run check:library-content-completion -- --summary-json --allow-review-pending",
  ];
}

function renderMarkdown() {
  const lines = [
    "# NurAI Library Review Batches",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This artifact groups the remaining Library review work into owner-specific batches. It is a planning and handoff aid only; it does not create review evidence or approval.",
    "",
    "## Commands",
    "",
    "```bash",
    "npm run export:library-review-batches -- --write",
    "npm run export:library-review-batches -- --check --summary-json",
    "npm run export:library-review-packets -- --all",
    "npm run export:library-review-evidence-intake -- --write",
    "npm run validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --summary-json",
    "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --write",
    "npm run merge:library-review-evidence -- --file /absolute/path/to/editorial-review.json --file /absolute/path/to/source-review.json --file /absolute/path/to/quality-checklist.json --file /absolute/path/to/qualified-scholar-review.json --file /absolute/path/to/publish-approval.json --out /absolute/path/to/merged-library-review-evidence.json --coverage-out /absolute/path/to/merged-library-review-coverage.md --write --require-complete-stage-coverage --require-all-library-books",
    "npm run check:library-review-final-readiness -- --file /absolute/path/to/merged-library-review-evidence.json --summary-json",
    "npm run check:library-content-completion -- --summary-json",
    "```",
    "",
    "## Summary",
    "",
    `- Pending batches: ${summary.batchCount}`,
    `- Pending books: ${summary.pendingBookCount}`,
    `- Pending high-care books: ${summary.sensitivePendingBookCount}`,
    `- Missing evidence records across batches: ${summary.missingEvidenceCount}`,
    `- Next owner batch: ${summary.nextBatchTitle || "none"}`,
    "",
    "## Guardrail",
    "",
    "Do not mark any book published, fully reviewed, or highest-standard complete until real current-content reviewer evidence is imported, validated, and passes the strict completion gate.",
    "",
    "Staged batch imports require `--allow-partial-import` and only clear the reviewed scope. Whole-library, published, scholar-reviewed, or highest-standard claims remain blocked until the full strict gate passes without review-pending allowances.",
    "",
    "## Batches",
    "",
  ];

  for (const batch of batches) {
    lines.push(
      `### ${batch.title}`,
      "",
      `Owner: ${batch.owner}`,
      "",
      batch.description,
      "",
      `Books: ${batch.bookCount}`,
      `High-care books: ${batch.sensitiveCount}`,
      `Missing evidence records: ${batch.missingEvidenceCount}`,
      `Batch hash: \`${batch.batchHash}\``,
      "",
      "Evidence needed:",
      ...batch.evidence.map((evidence) => `- ${evidence}`),
      "",
      "Acceptance checklist:",
      ...batch.acceptanceChecklist.map((item) => `- ${item}`),
      "",
      `Evidence boundary: ${batch.evidenceBoundary}`,
      "",
      "Reviewer workspace commands:",
      "",
      "```bash",
      ...batchValidationCommands(batch.id),
      "```",
      "",
      "| Priority | Plan | Book | Category | Chapters | Sources | Missing evidence | Content hash | Review packet |",
      "| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |",
    );

    for (const book of batch.books) {
      lines.push(
        `| ${book.priority} | ${book.plan} | ${book.title} | ${book.category} | ${book.chapters} | ${book.sourceRefs} | ${book.missingEvidence.join(", ")} | \`${book.contentHash}\` | \`${book.reviewPacketPath}\` |`,
      );
    }

    lines.push("");
  }

  if (batches.length === 0) {
    lines.push("No pending review batches remain.", "");
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
      findings: [`Missing Library review batches artifact: ${outPath}`],
    };
  }
  const existing = fs.readFileSync(outPath, "utf8");
  if (normalizeGeneratedAt(existing) !== normalizeGeneratedAt(markdown)) {
    return {
      ok: false,
      findings: [
        `${outPath} is stale; run npm run export:library-review-batches -- --write.`,
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
  console.log(JSON.stringify({ ...artifactSummary, batches }, null, 2));
  if (artifactCheck && !artifactCheck.ok) process.exit(1);
} else if (wantsCheck) {
  if (!artifactCheck?.ok) {
    console.error(
      `Library review batches are not current:\n${artifactCheck?.findings
        .map((finding) => `- ${finding}`)
        .join("\n")}`,
    );
    process.exit(1);
  }
  console.log("Library review batches are current.");
} else if (wantsWrite) {
  console.log(`Wrote Library review batches to ${outPath}.`);
} else {
  console.log(markdown);
}
