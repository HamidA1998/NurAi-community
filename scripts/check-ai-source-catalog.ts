#!/usr/bin/env tsx

import { TRUSTED_SOURCES } from "../server/ai/sourceGrounding";
import {
  isValidQuranReference,
  quranVerseCount,
} from "../server/ai/quranReference";

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
  if (!isValidQuranReference(surah, startAyah, endAyah)) return null;
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
    reference.endAyah === quranVerseCount(reference.surah)
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

const findings: string[] = [];
const ids = new Set<string>();
const references = new Map<string, string>();

for (const source of TRUSTED_SOURCES) {
  const location = source.id || source.reference;

  if (!source.id || typeof source.id !== "string") {
    fail(findings, `${location} must have a stable id.`);
  } else if (ids.has(source.id)) {
    fail(findings, `${source.id} is duplicated.`);
  }
  ids.add(source.id);

  if (source.type !== "quran" && source.type !== "hadith") {
    fail(findings, `${location} uses unsupported source type ${source.type}.`);
  }
  if (!source.explanation || source.explanation.trim().length < 24) {
    fail(findings, `${location} must include a meaningful explanation.`);
  }
  if (!Array.isArray(source.keywords) || source.keywords.length === 0) {
    fail(findings, `${location} must include at least one keyword.`);
  }
  if (source.keywords.some((keyword) => !keyword.trim())) {
    fail(findings, `${location} contains a blank keyword.`);
  }
  if (!source.url) {
    fail(findings, `${location} must include a direct source URL.`);
    continue;
  }

  const previousUrl = references.get(source.reference);
  if (previousUrl && previousUrl !== source.url) {
    fail(
      findings,
      `${location} maps ${source.reference} to ${source.url}, but it already maps to ${previousUrl}.`,
    );
  }
  references.set(source.reference, source.url);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(source.url);
  } catch {
    fail(findings, `${location} has invalid URL ${source.url}.`);
    continue;
  }
  if (parsedUrl.protocol !== "https:") {
    fail(findings, `${location} source URL must use https.`);
  }

  if (source.type === "quran") {
    const parsedReference = parseQuranReference(source.reference);
    if (!parsedReference) {
      fail(
        findings,
        `${location} has invalid Quran reference ${source.reference}.`,
      );
      continue;
    }
    if (parsedUrl.hostname !== "quran.com") {
      fail(findings, `${location} Quran source URL must use quran.com.`);
    }
    if (!expectedQuranUrls(parsedReference).has(source.url)) {
      fail(
        findings,
        `${location} URL must match ${source.reference}; got ${source.url}.`,
      );
    }
  }

  if (source.type === "hadith") {
    const expected = expectedHadithUrl(source.reference);
    if (!expected) {
      fail(
        findings,
        `${location} has invalid Hadith reference ${source.reference}.`,
      );
      continue;
    }
    if (parsedUrl.hostname !== "sunnah.com") {
      fail(findings, `${location} Hadith source URL must use sunnah.com.`);
    }
    if (source.url !== expected) {
      fail(findings, `${location} URL must be ${expected}; got ${source.url}.`);
    }
  }
}

if (findings.length > 0) {
  console.error("AI source catalog check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  `AI source catalog check passed: ${TRUSTED_SOURCES.length} trusted source cards, ${references.size} unique references.`,
);
