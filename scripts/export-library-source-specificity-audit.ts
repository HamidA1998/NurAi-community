#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

import { LIBRARY_BOOKS } from "../client/data/libraryBooks";

type Book = (typeof LIBRARY_BOOKS)[number];
type Chapter = Book["chapters"][number];
type SourceRef = Chapter["sourceRefs"][number];

const DEFAULT_OUT_PATH = "docs/audit/LIBRARY_SOURCE_SPECIFICITY_AUDIT.md";
const REUSED_NOTE_THRESHOLD = 15;

const wantsJson = process.argv.includes("--json");
const wantsSummaryJson = process.argv.includes("--summary-json");
const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");

function argValue(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function normalized(text: string) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function md(text: string | number | boolean | null | undefined) {
  return String(text ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function sourceIdentity(sourceRef: SourceRef) {
  return [
    normalized(sourceRef.type),
    normalized(sourceRef.reference),
    normalized(sourceRef.url || ""),
  ].join(":");
}

function sourceDisplay(sourceRef: SourceRef) {
  return `${sourceRef.reference} [${sourceRef.type}]`;
}

function chapterSourceSetKey(chapter: Chapter) {
  return chapter.sourceRefs
    .map((sourceRef) =>
      [
        normalized(sourceRef.type),
        normalized(sourceRef.reference),
        normalized(sourceRef.note),
      ].join(":"),
    )
    .sort()
    .join("|");
}

function minimumUniqueRefs(book: Book, sourceRefCount: number) {
  return Math.min(
    sourceRefCount,
    Math.max(8, Math.ceil(book.chapters.length * 1.75)),
  );
}

function bookSourceSpecificity(book: Book) {
  const sourceRefCount = book.chapters.reduce(
    (sum, chapter) => sum + chapter.sourceRefs.length,
    0,
  );
  const uniqueSourceRefs = new Map<string, SourceRef>();
  const sourceSetCounts = new Map<string, Chapter[]>();

  for (const chapter of book.chapters) {
    sourceSetCounts.set(chapterSourceSetKey(chapter), [
      ...(sourceSetCounts.get(chapterSourceSetKey(chapter)) || []),
      chapter,
    ]);
    for (const sourceRef of chapter.sourceRefs) {
      uniqueSourceRefs.set(sourceIdentity(sourceRef), sourceRef);
    }
  }

  const repeatedSourceSets = [...sourceSetCounts.values()]
    .filter((chapters) => chapters.length > 1)
    .map((chapters) => chapters.map((chapter) => chapter.id));
  const minimumUniqueSourceRefs = minimumUniqueRefs(book, sourceRefCount);
  const lowSourceDiversity =
    book.chapters.length >= 4 &&
    uniqueSourceRefs.size < minimumUniqueSourceRefs;

  return {
    id: book.id,
    title: book.title,
    category: book.category,
    plan: book.requiredPlan,
    status: book.verifiedContentStatus,
    chapterCount: book.chapters.length,
    sourceRefCount,
    uniqueSourceRefCount: uniqueSourceRefs.size,
    minimumUniqueSourceRefs,
    lowSourceDiversity,
    repeatedSourceSets,
    uniqueSourceRefs: [...uniqueSourceRefs.values()].map(sourceDisplay),
    chapters: book.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      sourceRefs: chapter.sourceRefs.map((sourceRef) => ({
        reference: sourceRef.reference,
        type: sourceRef.type,
        note: sourceRef.note,
        url: sourceRef.url || null,
      })),
    })),
  };
}

function buildReport() {
  const books = LIBRARY_BOOKS.map(bookSourceSpecificity);
  const sourceNoteUsage = new Map<
    string,
    {
      note: string;
      examples: string[];
      bookIds: Set<string>;
      count: number;
    }
  >();

  for (const book of LIBRARY_BOOKS) {
    for (const chapter of book.chapters) {
      for (const sourceRef of chapter.sourceRefs) {
        const note = sourceRef.note.trim();
        const key = normalized(note);
        if (!key) continue;
        const current =
          sourceNoteUsage.get(key) ||
          ({
            note,
            examples: [],
            bookIds: new Set<string>(),
            count: 0,
          } satisfies {
            note: string;
            examples: string[];
            bookIds: Set<string>;
            count: number;
          });
        current.count += 1;
        current.bookIds.add(book.id);
        if (current.examples.length < 8) {
          current.examples.push(
            `${book.id}/${chapter.id}: ${sourceDisplay(sourceRef)}`,
          );
        }
        sourceNoteUsage.set(key, current);
      }
    }
  }

  const reusedSourceNotes = [...sourceNoteUsage.values()]
    .filter((item) => item.count >= REUSED_NOTE_THRESHOLD)
    .sort((left, right) => right.count - left.count)
    .map((item) => ({
      note: item.note,
      count: item.count,
      bookCount: item.bookIds.size,
      examples: item.examples,
    }));
  const lowSourceDiversityBooks = books.filter(
    (book) => book.lowSourceDiversity,
  );
  const repeatedSourceSetBooks = books.filter(
    (book) => book.repeatedSourceSets.length > 0,
  );

  return {
    ok:
      lowSourceDiversityBooks.length === 0 &&
      repeatedSourceSetBooks.length === 0 &&
      reusedSourceNotes.length === 0,
    generatedAt: new Date().toISOString(),
    summary: {
      bookCount: books.length,
      chapterCount: books.reduce((sum, book) => sum + book.chapterCount, 0),
      sourceRefCount: books.reduce((sum, book) => sum + book.sourceRefCount, 0),
      lowSourceDiversityBookCount: lowSourceDiversityBooks.length,
      repeatedSourceSetBookCount: repeatedSourceSetBooks.length,
      repeatedSourceSetCount: repeatedSourceSetBooks.reduce(
        (sum, book) => sum + book.repeatedSourceSets.length,
        0,
      ),
      reusedSourceNoteCount: reusedSourceNotes.length,
      reusedSourceNoteThreshold: REUSED_NOTE_THRESHOLD,
    },
    lowSourceDiversityBooks,
    repeatedSourceSetBooks,
    reusedSourceNotes,
    books,
  };
}

function renderMarkdown(report: ReturnType<typeof buildReport>) {
  const lines = [
    "# NurAI Library Source Specificity Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "This audit does not approve or reject source cards by itself. It turns broad or repeated source-card patterns into a reviewer queue so source relevance can be checked chapter by chapter before any highest-standard release claim.",
    "",
    "## Summary",
    "",
    `- Books: ${report.summary.bookCount}`,
    `- Chapters: ${report.summary.chapterCount}`,
    `- Source refs: ${report.summary.sourceRefCount}`,
    `- Low source-diversity books: ${report.summary.lowSourceDiversityBookCount}`,
    `- Books with repeated source-card sets: ${report.summary.repeatedSourceSetBookCount}`,
    `- Repeated source-card sets: ${report.summary.repeatedSourceSetCount}`,
    `- Reused source-note patterns at ${report.summary.reusedSourceNoteThreshold}+ uses: ${report.summary.reusedSourceNoteCount}`,
    "",
    "## Reviewer Rule",
    "",
    "A source card should stay attached only when the reviewer can point to the exact chapter claim it supports. Valid URLs are not enough; the note must be specific enough for the lesson, and broad anchors should be replaced or approved with clear reviewer notes.",
    "",
    "## Low Source-Diversity Books",
    "",
  ];

  if (report.lowSourceDiversityBooks.length === 0) {
    lines.push("No low source-diversity books were detected.", "");
  } else {
    lines.push(
      "| Book | Plan | Chapters | Source refs | Unique refs | Minimum | Action |",
    );
    lines.push("| --- | --- | ---: | ---: | ---: | ---: | --- |");
    for (const book of report.lowSourceDiversityBooks) {
      lines.push(
        `| ${md(book.title)} | ${md(book.plan)} | ${book.chapterCount} | ${book.sourceRefCount} | ${book.uniqueSourceRefCount} | ${book.minimumUniqueSourceRefs} | Confirm broad anchors or add more chapter-specific sources. |`,
      );
    }
    lines.push("");
  }

  lines.push("## Reused Source Notes", "");
  if (report.reusedSourceNotes.length === 0) {
    lines.push("No heavily reused source-note patterns were detected.", "");
  } else {
    for (const note of report.reusedSourceNotes) {
      lines.push(`### ${note.count} uses across ${note.bookCount} books`, "");
      lines.push(note.note, "");
      lines.push("Examples:");
      for (const example of note.examples) lines.push(`- ${example}`);
      lines.push("");
    }
  }

  lines.push("## Repeated Source-Card Sets", "");
  if (report.repeatedSourceSetBooks.length === 0) {
    lines.push("No repeated full source-card sets were detected.", "");
  } else {
    for (const book of report.repeatedSourceSetBooks) {
      lines.push(`### ${book.title}`, "");
      for (const repeatedSet of book.repeatedSourceSets) {
        lines.push(`- Repeated across chapters: ${repeatedSet.join(", ")}`);
      }
      lines.push("");
    }
  }

  lines.push("## Verification", "");
  lines.push("```bash");
  lines.push(
    "npm run export:library-source-specificity-audit -- --check --summary-json",
  );
  lines.push("npm run check:library-content-completion -- --summary-json");
  lines.push(
    "npm run export:library-completion-audit -- --check --summary-json",
  );
  lines.push("```");
  lines.push("");

  return lines.join("\n");
}

const report = buildReport();
const outPath = path.resolve(
  process.cwd(),
  argValue("--out", DEFAULT_OUT_PATH),
);
const markdown = renderMarkdown(report);

if (wantsWrite) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, markdown);
}

function normalizeGeneratedAt(value: string) {
  return value.replace(/^Generated: .+$/m, "Generated: <normalized>");
}

function checkCurrent() {
  if (!fs.existsSync(outPath)) {
    return {
      ok: false,
      findings: [
        `Missing source-specificity audit artifact: ${path.relative(process.cwd(), outPath)}`,
      ],
    };
  }
  const existing = fs.readFileSync(outPath, "utf8");
  if (normalizeGeneratedAt(existing) !== normalizeGeneratedAt(markdown)) {
    return {
      ok: false,
      findings: [
        `${path.relative(process.cwd(), outPath)} is stale; run npm run export:library-source-specificity-audit -- --write.`,
      ],
    };
  }
  return { ok: true, findings: [] };
}

const artifactCheck = wantsCheck ? checkCurrent() : null;
const summaryReport = {
  ok: artifactCheck ? artifactCheck.ok : report.ok,
  outPath: path.relative(process.cwd(), outPath),
  written: wantsWrite,
  checked: wantsCheck,
  findings: artifactCheck ? artifactCheck.findings : [],
  ...report.summary,
};

if (wantsSummaryJson) {
  console.log(JSON.stringify(summaryReport, null, 2));
  if (artifactCheck && !artifactCheck.ok) process.exit(1);
} else if (wantsJson) {
  console.log(JSON.stringify({ ...report, artifact: summaryReport }, null, 2));
  if (artifactCheck && !artifactCheck.ok) process.exit(1);
} else if (wantsCheck) {
  if (!artifactCheck?.ok) {
    console.error(
      artifactCheck?.findings.join("\n") ||
        "Library source-specificity audit check failed.",
    );
    process.exit(1);
  }
  console.log(
    `Library source-specificity audit is current at ${summaryReport.outPath}.`,
  );
} else if (wantsWrite) {
  console.log(`Library source-specificity audit written to ${outPath}.`);
} else {
  console.log(markdown);
}
