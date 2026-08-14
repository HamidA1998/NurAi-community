#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

import { LIBRARY_BOOKS } from "../client/data/libraryBooks";
import { computeBookContentHash } from "./lib/libraryContentHash";
import { isSensitiveBook, normalized } from "./lib/libraryReviewEvidence";

type Book = (typeof LIBRARY_BOOKS)[number];
type Chapter = Book["chapters"][number];

const DEFAULT_BOOK_ID = "hajj-and-umrah-preparation";

const wantsJson = process.argv.includes("--json");
const wantsSummaryJson = process.argv.includes("--summary-json");
const wantsList = process.argv.includes("--list");
const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function md(text: string | number | boolean | null | undefined) {
  return String(text ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function bullet(text: string) {
  return `- ${text}`;
}

function numbered(items: string[]) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function hasGeneratedScaffoldSignals(chapter: Chapter) {
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

function reviewPriority(book: Book) {
  if (isSensitiveBook(book)) return "qualified-scholar";
  if (book.requiredPlan === "free" || book.featured) return "editorial-first";
  if (book.requiredPlan === "scholar") return "scholar-plan";
  return "standard-editorial";
}

function uniqueSourceRefs(book: Book) {
  const byKey = new Map<string, Chapter["sourceRefs"][number]>();
  for (const chapter of book.chapters) {
    for (const sourceRef of chapter.sourceRefs) {
      byKey.set(
        `${sourceRef.type}:${sourceRef.reference}:${sourceRef.note}`,
        sourceRef,
      );
    }
  }
  return [...byKey.values()];
}

function reviewTasks(book: Book) {
  const sensitive = isSensitiveBook(book);
  return [
    ...(book.verifiedContentStatus === "published"
      ? []
      : ["final editorial review"]),
    "source relevance review",
    "publication quality checklist",
    ...(sensitive ? ["qualified scholar review"] : []),
    "publish-status decision",
  ];
}

function buildPacket(book: Book) {
  const allSourceRefs = book.chapters.flatMap((chapter) => chapter.sourceRefs);
  const uniqueSources = uniqueSourceRefs(book);
  const sensitive = isSensitiveBook(book);
  const generatedScaffoldChapters = book.chapters
    .filter(hasGeneratedScaffoldSignals)
    .map((chapter) => chapter.id);
  return {
    generatedAt: new Date().toISOString(),
    book: {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle,
      description: book.description,
      authorName: book.authorName,
      provenanceLabel: book.provenanceLabel,
      contentOrigin: book.contentOrigin,
      category: book.category,
      difficulty: book.difficulty,
      requiredPlan: book.requiredPlan,
      status: book.verifiedContentStatus,
      featured: Boolean(book.featured),
      recommended: Boolean(book.recommended),
      tags: book.tags,
      estimatedMinutes: book.estimatedMinutes,
      chapterCount: book.chapters.length,
      sourceRefCount: allSourceRefs.length,
      uniqueSourceRefCount: uniqueSources.length,
      contentHash: computeBookContentHash(book),
      sensitive,
      priority: reviewPriority(book),
      safetyNote: book.safetyNote,
      previewChapterIds: book.previewChapterIds,
      generatedScaffoldChapterCount: generatedScaffoldChapters.length,
      generatedScaffoldChapters,
    },
    reviewTasks: reviewTasks(book),
    reviewChecklist: [
      "Read every chapter end to end for accuracy, repetition, tone, and usefulness.",
      "Check every source card for relevance to the exact lesson, not only URL validity.",
      "Set qualityChecklist.titleAndPromiseAccurate only after title, subtitle, description, and marketing promise match the actual book.",
      "Set qualityChecklist.chapterContentComplete only after every chapter is coherent, non-repetitive, complete, and useful.",
      "Set qualityChecklist.sourcesRelevantAndSpecific only after each source card supports the exact nearby claim.",
      "Set qualityChecklist.noUnsupportedClaims only after unsupported religious, medical, legal, and outcome claims are removed or softened.",
      "Set qualityChecklist.exercisesUsefulAndSafe only after reflections, actions, and quizzes are practical, safe, and not manipulative.",
      "Set qualityChecklist.audienceAndToneApproved only after the intended audience, tone, and safety boundaries are appropriate.",
      ...(sensitive
        ? [
            "Record qualified scholar review notes before changing status to published.",
          ]
        : []),
      "Confirm the safety note matches the book scope and does not overstate religious authority.",
      "Confirm the book can be marketed without claiming certainty beyond the reviewed sources.",
    ],
    sourceRefs: uniqueSources,
    chapters: book.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      subtitle: chapter.subtitle,
      estimatedMinutes: chapter.estimatedMinutes,
      sections: chapter.sections,
      reflectionQuestions: chapter.reflectionQuestions,
      actionSteps: chapter.actionSteps,
      quiz: chapter.quiz,
      sourceRefs: chapter.sourceRefs,
      audioScript: chapter.audioScript || null,
      generatedScaffold: hasGeneratedScaffoldSignals(chapter),
    })),
  };
}

function printBookList() {
  console.log("# Library Books");
  console.log("");
  for (const book of [...LIBRARY_BOOKS].sort((a, b) =>
    a.title.localeCompare(b.title),
  )) {
    console.log(
      `- ${book.id} (${book.title}, ${reviewPriority(book)}, ${book.verifiedContentStatus})`,
    );
  }
}

function renderMarkdown(packet: ReturnType<typeof buildPacket>) {
  const lines: string[] = [];
  const { book } = packet;
  lines.push(`# ${book.title} Review Packet`);
  lines.push("");
  lines.push(`Generated: ${packet.generatedAt}`);
  lines.push("");
  lines.push("## Release Status");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("| --- | --- |");
  lines.push(`| Book ID | ${md(book.id)} |`);
  lines.push(`| Author | ${md(book.authorName)} |`);
  lines.push(`| Provenance | ${md(book.provenanceLabel)} |`);
  lines.push(`| Subtitle | ${md(book.subtitle)} |`);
  lines.push(`| Category | ${md(book.category)} |`);
  lines.push(`| Plan | ${md(book.requiredPlan)} |`);
  lines.push(`| Difficulty | ${md(book.difficulty)} |`);
  lines.push(`| Content status | ${md(book.status)} |`);
  lines.push(`| Content hash | ${md(book.contentHash)} |`);
  lines.push(`| Review priority | ${md(book.priority)} |`);
  lines.push(`| Sensitive/high-care | ${book.sensitive ? "yes" : "no"} |`);
  lines.push(`| Chapters | ${book.chapterCount} |`);
  lines.push(
    `| Generated/repeated scaffold chapters | ${book.generatedScaffoldChapterCount} |`,
  );
  lines.push(
    `| Source refs | ${book.sourceRefCount} total, ${book.uniqueSourceRefCount} unique |`,
  );
  lines.push(`| Estimated minutes | ${book.estimatedMinutes} |`);
  lines.push("");
  lines.push("## Automated Content Findings");
  lines.push("");
  if (book.generatedScaffoldChapters.length) {
    lines.push(
      "These chapters still match known generated/repeated scaffold wording and need real editorial rewrite before a highest-standard claim:",
    );
    lines.push("");
    lines.push(book.generatedScaffoldChapters.map(bullet).join("\n"));
  } else {
    lines.push("No known generated/repeated scaffold wording was detected.");
  }
  lines.push("");
  lines.push("## Safety Note");
  lines.push("");
  lines.push(book.safetyNote);
  lines.push("");
  lines.push("## Review Tasks");
  lines.push("");
  lines.push(packet.reviewTasks.map(bullet).join("\n"));
  lines.push("");
  lines.push("## Review Checklist");
  lines.push("");
  lines.push(packet.reviewChecklist.map(bullet).join("\n"));
  lines.push("");
  lines.push("## Unique Source Refs");
  lines.push("");
  for (const sourceRef of packet.sourceRefs) {
    const url = sourceRef.url ? ` (${sourceRef.url})` : "";
    lines.push(
      bullet(
        `${sourceRef.reference} [${sourceRef.type}] - ${sourceRef.note}${url}`,
      ),
    );
  }
  lines.push("");
  lines.push("## Chapter Review");
  for (const chapter of packet.chapters) {
    lines.push("");
    lines.push(`### ${chapter.title}`);
    lines.push("");
    lines.push(`ID: ${chapter.id}`);
    lines.push("");
    lines.push(
      `Automated scaffold flag: ${chapter.generatedScaffold ? "yes" : "no"}`,
    );
    lines.push("");
    lines.push(`Subtitle: ${chapter.subtitle}`);
    lines.push("");
    lines.push(`Estimated minutes: ${chapter.estimatedMinutes}`);
    lines.push("");
    lines.push("#### Sections");
    for (const section of chapter.sections) {
      lines.push("");
      lines.push(`- ${section.heading} (${section.type})`);
      lines.push("");
      lines.push(section.body);
    }
    lines.push("");
    lines.push("#### Reflection Questions");
    lines.push(numbered(chapter.reflectionQuestions));
    lines.push("");
    lines.push("#### Action Steps");
    lines.push(numbered(chapter.actionSteps));
    lines.push("");
    lines.push("#### Quiz");
    for (const question of chapter.quiz) {
      lines.push("");
      lines.push(bullet(question.question));
      lines.push(`  - Correct answer: ${question.correctAnswer}`);
      lines.push(`  - Explanation: ${question.explanation}`);
    }
    lines.push("");
    lines.push("#### Chapter Sources");
    for (const sourceRef of chapter.sourceRefs) {
      const url = sourceRef.url ? ` (${sourceRef.url})` : "";
      lines.push(
        bullet(
          `${sourceRef.reference} [${sourceRef.type}] - ${sourceRef.note}${url}`,
        ),
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}

if (wantsList) {
  printBookList();
  process.exit(0);
}

const bookId = argValue("--book-id") || DEFAULT_BOOK_ID;
const book = LIBRARY_BOOKS.find((candidate) => candidate.id === bookId);

if (!book) {
  console.error(`Book not found: ${bookId}`);
  console.error(
    "Run `npm run export:library-review-packet -- --list` to see book IDs.",
  );
  process.exit(1);
}

const outPath =
  argValue("--out") ||
  (bookId === DEFAULT_BOOK_ID
    ? "docs/audit/HAJJ_UMRAH_REVIEW_PACKET.md"
    : `docs/audit/library-review-packets/${reviewPriority(book)}/${bookId}.md`);
const packet = buildPacket(book);
const markdown = renderMarkdown(packet);

function normalizeGeneratedAt(value: string) {
  return value.replace(/^Generated: .+$/gm, "Generated: <normalized>");
}

function checkCurrent() {
  const resolved = path.resolve(process.cwd(), outPath);
  if (!fs.existsSync(resolved)) {
    return {
      ok: false,
      findings: [`Missing library review packet artifact: ${outPath}`],
    };
  }
  const existing = fs.readFileSync(resolved, "utf8");
  if (normalizeGeneratedAt(existing) !== normalizeGeneratedAt(markdown)) {
    return {
      ok: false,
      findings: [
        `${outPath} is stale; run npm run export:library-review-packet -- --book-id ${bookId} --write.`,
      ],
    };
  }
  return { ok: true, findings: [] };
}

if (wantsWrite) {
  const resolved = path.resolve(process.cwd(), outPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, markdown);
}

const artifactCheck = wantsCheck ? checkCurrent() : null;

if (wantsSummaryJson) {
  console.log(
    JSON.stringify(
      {
        ok: artifactCheck ? artifactCheck.ok : true,
        outPath,
        written: wantsWrite,
        checked: wantsCheck,
        findings: artifactCheck ? artifactCheck.findings : [],
        book: packet.book,
        reviewTasks: packet.reviewTasks,
      },
      null,
      2,
    ),
  );
  if (artifactCheck && !artifactCheck.ok) process.exit(1);
} else if (wantsJson) {
  console.log(
    JSON.stringify(
      {
        ...packet,
        artifact: {
          ok: artifactCheck ? artifactCheck.ok : true,
          outPath,
          written: wantsWrite,
          checked: wantsCheck,
          findings: artifactCheck ? artifactCheck.findings : [],
        },
      },
      null,
      2,
    ),
  );
  if (artifactCheck && !artifactCheck.ok) process.exit(1);
} else if (wantsCheck) {
  if (!artifactCheck?.ok) {
    console.error(
      artifactCheck?.findings.join("\n") ||
        "Library review packet check failed.",
    );
    process.exit(1);
  }
  console.log(`Library review packet is current at ${outPath}.`);
} else if (wantsWrite) {
  console.log(`Library review packet written to ${outPath}.`);
} else {
  console.log(markdown);
}
