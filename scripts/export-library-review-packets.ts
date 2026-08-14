#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { LIBRARY_BOOKS } from "../client/data/libraryBooks";
import { computeBookContentHash } from "./lib/libraryContentHash";
import { isSensitiveBook, normalized } from "./lib/libraryReviewEvidence";

type Book = (typeof LIBRARY_BOOKS)[number];
type Chapter = Book["chapters"][number];
type Priority =
  | "qualified-scholar"
  | "editorial-first"
  | "scholar-plan"
  | "standard-editorial";

const priorityOrder: Priority[] = [
  "qualified-scholar",
  "editorial-first",
  "scholar-plan",
  "standard-editorial",
];

const wantsJson = process.argv.includes("--json");
const wantsSummaryJson = process.argv.includes("--summary-json");
const wantsCheck = process.argv.includes("--check");
const dryRun = process.argv.includes("--dry-run");
const includeAll = process.argv.includes("--all");
const includeSensitive = process.argv.includes("--sensitive");
const includeFree = process.argv.includes("--free");

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
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

function reviewPriority(book: Book): Priority {
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

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
      sensitive,
      priority: reviewPriority(book),
      safetyNote: book.safetyNote,
      previewChapterIds: book.previewChapterIds,
      generatedScaffoldChapterCount: generatedScaffoldChapters.length,
      generatedScaffoldChapters,
      contentHash: computeBookContentHash(book),
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

function renderPacketMarkdown(packet: ReturnType<typeof buildPacket>) {
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
  return `${lines.join("\n")}\n`;
}

function selectBooks() {
  const requestedPriorities = argValues("--priority") as Priority[];
  const requestedPlans = argValues("--plan");
  const limitValue = argValue("--limit");
  const limit = limitValue ? Number.parseInt(limitValue, 10) : null;
  if (limitValue && (!Number.isFinite(limit) || Number(limit) <= 0)) {
    throw new Error("--limit must be a positive integer.");
  }

  const validPriorities = new Set(priorityOrder);
  const invalidPriorities = requestedPriorities.filter(
    (priority) => !validPriorities.has(priority),
  );
  if (invalidPriorities.length) {
    throw new Error(`Invalid priority: ${invalidPriorities.join(", ")}`);
  }

  const selected = LIBRARY_BOOKS.filter((book) => {
    const priority = reviewPriority(book);
    if (includeAll) return true;
    if (requestedPriorities.length && requestedPriorities.includes(priority)) {
      return true;
    }
    if (requestedPlans.length && requestedPlans.includes(book.requiredPlan)) {
      return true;
    }
    if (includeSensitive && isSensitiveBook(book)) return true;
    if (includeFree && book.requiredPlan === "free") return true;
    return (
      !requestedPriorities.length &&
      !requestedPlans.length &&
      !includeSensitive &&
      !includeFree &&
      priority === "qualified-scholar"
    );
  }).sort((a, b) => {
    const priorityDelta =
      priorityOrder.indexOf(reviewPriority(a)) -
      priorityOrder.indexOf(reviewPriority(b));
    return priorityDelta || a.title.localeCompare(b.title);
  });

  return limit ? selected.slice(0, limit) : selected;
}

function packetPathFor(outDir: string, book: Book) {
  const priority = reviewPriority(book);
  return path.join(outDir, priority, `${slug(book.id)}.md`);
}

function renderIndex(
  outDir: string,
  books: Book[],
  written: { book: Book; file: string }[],
) {
  const relative = (file: string) =>
    path.relative(outDir, file).replace(/\\/g, "/");
  const lines = [
    "# Library Review Packet Index",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "These packets are editorial/scholar review artifacts. They do not make a book published, reviewed, or release-ready by themselves.",
    "",
    "| Priority | Plan | Book | Provenance | Status | Sensitive | Packet |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const { book, file } of written) {
    const priority = reviewPriority(book);
    lines.push(
      `| ${priority} | ${book.requiredPlan} | ${book.title} | ${book.provenanceLabel} | ${book.verifiedContentStatus} | ${isSensitiveBook(book) ? "yes" : "no"} | [packet](${relative(file)}) |`,
    );
  }
  lines.push("");
  lines.push("## Selection Summary");
  lines.push("");
  lines.push(`- Selected books: ${books.length}`);
  lines.push(
    `- Qualified scholar review: ${books.filter((book) => reviewPriority(book) === "qualified-scholar").length}`,
  );
  lines.push(
    `- Editorial first: ${books.filter((book) => reviewPriority(book) === "editorial-first").length}`,
  );
  lines.push(
    `- Scholar plan: ${books.filter((book) => reviewPriority(book) === "scholar-plan").length}`,
  );
  lines.push(
    `- Standard editorial: ${books.filter((book) => reviewPriority(book) === "standard-editorial").length}`,
  );
  lines.push("");
  lines.push("## Publish Rule");
  lines.push("");
  lines.push(
    "Do not move a book to `published` until final editorial review, source relevance review, a completed publication quality checklist, publish approval, and qualified-scholar review where required have been recorded as `reviewEvidence`.",
  );
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function normalizeGeneratedAt(value: string) {
  return value.replace(/^Generated: .+$/gm, "Generated: <normalized>");
}

function listMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".md") ? [fullPath] : [];
  });
}

function checkCurrentPackets(outDir: string, books: Book[]) {
  const expectedFiles = new Map<string, string>();
  const written = books.map((book) => {
    const file = packetPathFor(outDir, book);
    expectedFiles.set(
      path.resolve(file),
      renderPacketMarkdown(buildPacket(book)),
    );
    return { book, file };
  });
  const indexPath = path.join(outDir, "README.md");
  expectedFiles.set(
    path.resolve(indexPath),
    renderIndex(outDir, books, written),
  );

  const findings: string[] = [];
  if (!fs.existsSync(outDir)) {
    findings.push(
      `Missing library review packet directory: ${path.relative(process.cwd(), outDir)}`,
    );
  }

  for (const [file, expected] of expectedFiles.entries()) {
    if (!fs.existsSync(file)) {
      findings.push(
        `Missing review packet artifact: ${path.relative(process.cwd(), file)}`,
      );
      continue;
    }
    const existing = fs.readFileSync(file, "utf8");
    if (normalizeGeneratedAt(existing) !== normalizeGeneratedAt(expected)) {
      findings.push(
        `${path.relative(process.cwd(), file)} is stale; run npm run export:library-review-packets -- --all.`,
      );
    }
  }

  if (includeAll && fs.existsSync(outDir)) {
    const existingFiles = listMarkdownFiles(outDir).map((file) =>
      path.resolve(file),
    );
    const unexpectedFiles = existingFiles.filter(
      (file) => !expectedFiles.has(file),
    );
    for (const file of unexpectedFiles) {
      findings.push(
        `Unexpected stale review packet artifact: ${path.relative(process.cwd(), file)}`,
      );
    }
  }

  return {
    ok: findings.length === 0,
    checked: true,
    findings,
    expectedPacketCount: books.length,
    expectedFileCount: expectedFiles.size,
    outDir: path.relative(process.cwd(), outDir),
  };
}

try {
  const outDir = path.resolve(
    process.cwd(),
    argValue("--out-dir") || "docs/audit/library-review-packets",
  );
  const books = selectBooks();
  const rows = books.map((book) => ({
    id: book.id,
    title: book.title,
    plan: book.requiredPlan,
    status: book.verifiedContentStatus,
    priority: reviewPriority(book),
    sensitive: isSensitiveBook(book),
    file: packetPathFor(outDir, book),
  }));

  if (wantsCheck) {
    const check = checkCurrentPackets(outDir, books);
    const payload = {
      ...check,
      dryRun: false,
      willWrite: false,
      selectedCount: rows.length,
      rows: rows.map((row) => ({
        ...row,
        file: path.relative(process.cwd(), row.file),
      })),
    };
    if (wantsJson) {
      console.log(JSON.stringify(payload, null, 2));
    } else if (wantsSummaryJson) {
      const { rows: _rows, ...summary } = payload;
      console.log(JSON.stringify(summary, null, 2));
    } else if (check.ok) {
      console.log(
        `Library review packets are current at ${check.outDir} (${check.expectedPacketCount} packet(s)).`,
      );
    } else {
      console.error(check.findings.join("\n"));
    }
    if (!check.ok) process.exit(1);
    process.exit(0);
  }

  if (wantsJson || wantsSummaryJson || dryRun) {
    const payload = {
      ok: true,
      dryRun: true,
      willWrite: false,
      outDir: path.relative(process.cwd(), outDir),
      selectedCount: rows.length,
      rows: rows.map((row) => ({
        ...row,
        file: path.relative(process.cwd(), row.file),
      })),
    };
    if (wantsSummaryJson) {
      const { rows: _rows, ...summary } = payload;
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(JSON.stringify(payload, null, 2));
    }
    process.exit(0);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const written: { book: Book; file: string }[] = [];
  for (const book of books) {
    const file = packetPathFor(outDir, book);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, renderPacketMarkdown(buildPacket(book)));
    written.push({ book, file });
  }

  const indexPath = path.join(outDir, "README.md");
  fs.writeFileSync(indexPath, renderIndex(outDir, books, written));

  console.log(
    `Exported ${written.length} library review packet(s) to ${path.relative(
      process.cwd(),
      outDir,
    )}`,
  );
} catch (error) {
  console.error(
    `Library review packet batch export failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
}
