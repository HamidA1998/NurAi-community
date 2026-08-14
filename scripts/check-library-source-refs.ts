#!/usr/bin/env tsx

import { LIBRARY_BOOKS } from "../client/data/libraryBooks";
import {
  cleanText,
  hasRealText,
  hasReviewStage,
  isSensitiveBook,
  qualityChecklistComplete,
} from "./lib/libraryReviewEvidence";

const quranVerseCounts = [
  0, 7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
  111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54,
  45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62,
  55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28,
  20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15,
  21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

type QuranReference = {
  surah: number;
  startAyah: number;
  endAyah: number;
};

const exactHadithPattern =
  /^(Sahih al-Bukhari|Sahih Muslim|Jami at-Tirmidhi|Sunan Abu Dawud|Sunan an-Nasa'i|Sunan Ibn Majah) (\d+[a-z]?)$/i;

function parseQuranReference(reference: string): QuranReference | null {
  const match = reference.match(/^Quran (\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?$/);
  if (!match) return null;

  const surah = Number.parseInt(match[1], 10);
  const startAyah = Number.parseInt(match[2], 10);
  const endAyah = match[3] ? Number.parseInt(match[3], 10) : startAyah;
  const verseCount = quranVerseCounts[surah];
  if (!verseCount) return null;
  if (startAyah < 1 || startAyah > verseCount) return null;
  if (endAyah < startAyah || endAyah > verseCount) return null;
  return { surah, startAyah, endAyah };
}

function expectedQuranUrls(reference: QuranReference): Set<string> {
  const urls = new Set<string>();
  if (reference.startAyah === reference.endAyah) {
    urls.add(`https://quran.com/${reference.surah}/${reference.startAyah}`);
    return urls;
  }

  urls.add(
    `https://quran.com/${reference.surah}/${reference.startAyah}-${reference.endAyah}`,
  );
  if (
    reference.startAyah === 1 &&
    reference.endAyah === quranVerseCounts[reference.surah]
  ) {
    urls.add(`https://quran.com/${reference.surah}`);
  }
  return urls;
}

function expectedHadithUrl(reference: string): string | null {
  const match = reference.match(exactHadithPattern);
  if (!match) return null;

  const collection = match[1].toLowerCase();
  const number = match[2].toLowerCase();
  const slug = collection.includes("bukhari")
    ? "bukhari"
    : collection.includes("muslim")
      ? "muslim"
      : collection.includes("tirmidhi")
        ? "tirmidhi"
        : collection.includes("dawud")
          ? "abudawud"
          : collection.includes("nasa")
            ? "nasai"
            : collection.includes("majah")
              ? "ibnmajah"
              : null;

  return slug ? `https://sunnah.com/${slug}:${number}` : null;
}

function fail(findings: string[], message: string) {
  findings.push(message);
}

function missingPublishedReviewEvidence(
  book: (typeof LIBRARY_BOOKS)[number],
  sensitive: boolean,
) {
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

const findings: string[] = [];
const referenceUrls = new Map<string, string>();
let sourceRefCount = 0;

for (const book of LIBRARY_BOOKS) {
  if (book.verifiedContentStatus === "published") {
    const missingReviewEvidence = missingPublishedReviewEvidence(
      book,
      isSensitiveBook(book),
    );
    if (missingReviewEvidence.length) {
      fail(
        findings,
        `${book.id} is marked published but missing ${missingReviewEvidence.join(", ")}.`,
      );
    }
  }
  if (book.verifiedContentStatus === "needs_review") {
    fail(
      findings,
      `${book.id} must not ship with needs_review content status.`,
    );
  }

  for (const chapter of book.chapters) {
    if (chapter.sourceRefs.length === 0) {
      fail(findings, `${book.id}/${chapter.id} must include sourceRefs.`);
    }

    const sourceIds = new Set<string>();
    for (const source of chapter.sourceRefs) {
      sourceRefCount += 1;
      const location = `${book.id}/${chapter.id}/${source.id}`;

      if (sourceIds.has(source.id)) {
        fail(findings, `${location} has a duplicate source id in its chapter.`);
      }
      sourceIds.add(source.id);

      if (!source.verified) {
        fail(findings, `${location} must be marked verified or removed.`);
      }
      if (!source.url) {
        fail(findings, `${location} must include a direct source URL.`);
        continue;
      }

      const previousUrl = referenceUrls.get(source.reference);
      if (previousUrl && previousUrl !== source.url) {
        fail(
          findings,
          `${location} uses ${source.url}, but ${source.reference} already maps to ${previousUrl}.`,
        );
      }
      referenceUrls.set(source.reference, source.url);

      if (source.type === "quran") {
        const parsed = parseQuranReference(source.reference);
        if (!parsed) {
          fail(
            findings,
            `${location} has invalid Quran reference ${source.reference}.`,
          );
          continue;
        }
        if (!expectedQuranUrls(parsed).has(source.url)) {
          fail(
            findings,
            `${location} URL must match ${source.reference}; got ${source.url}.`,
          );
        }
      } else if (source.type === "hadith") {
        const expected = expectedHadithUrl(source.reference);
        if (!expected) {
          fail(
            findings,
            `${location} has invalid Hadith reference ${source.reference}.`,
          );
          continue;
        }
        if (source.url !== expected) {
          fail(
            findings,
            `${location} URL must be ${expected}; got ${source.url}.`,
          );
        }
      } else {
        fail(
          findings,
          `${location} uses unsupported release source type ${source.type}.`,
        );
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Library source-ref check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  `Library source-ref check passed: ${sourceRefCount} source refs across ${LIBRARY_BOOKS.length} books, ${referenceUrls.size} unique references.`,
);
