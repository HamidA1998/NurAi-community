#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  DRAFT_ISLAMIC_SOURCE_CARDS,
  VERIFIED_ISLAMIC_SOURCE_CARDS,
  type VerifiedIslamicSourceCard,
} from "../server/ai/islamicSourcePacks";
import {
  cleanText,
  DEFAULT_HADITH_REVIEW_EVIDENCE_PATH,
  hadithDraftCards,
  type HadithReviewEvidenceFile,
  type HadithReviewEvidenceRecord,
} from "./lib/hadithSourceReview";

const wantsWrite = process.argv.includes("--write");
const wantsSummaryJson = process.argv.includes("--summary-json");
const confirmSourcePackActivation = process.argv.includes(
  "--confirm-source-pack-activation",
);

function argValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const evidencePath = path.resolve(
  process.cwd(),
  argValue("--file", DEFAULT_HADITH_REVIEW_EVIDENCE_PATH),
);
const sourcePackPath = path.resolve(
  process.cwd(),
  argValue("--source-pack-file", "server/ai/islamicSourcePacks.ts"),
);

function fail(message: string, extra: Record<string, unknown> = {}): never {
  const payload = {
    ok: false,
    mode: wantsWrite ? "write" : "dry-run",
    evidencePath: path.relative(process.cwd(), evidencePath),
    sourcePackPath: path.relative(process.cwd(), sourcePackPath),
    error: message,
    ...extra,
  };
  if (wantsSummaryJson) {
    console.error(JSON.stringify(payload, null, 2));
  } else {
    console.error(`Hadith source activation failed: ${message}`);
    for (const [key, value] of Object.entries(extra)) {
      console.error(`${key}: ${JSON.stringify(value)}`);
    }
  }
  process.exit(1);
}

function validateEvidence(): void {
  const result = spawnSync(
    "npx",
    [
      "tsx",
      "scripts/validate-hadith-review-evidence.ts",
      "--file",
      evidencePath,
      "--require-approved",
      "--summary-json",
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  if (result.error) fail(result.error.message);
  if (result.status !== 0) {
    fail("Review evidence is not activation-ready.", {
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    });
  }
}

function readEvidenceFile(): Required<HadithReviewEvidenceFile> {
  const parsed = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail("Evidence file must be a JSON object.");
  }
  const records = (parsed as HadithReviewEvidenceFile).records;
  if (!Array.isArray(records)) fail("Evidence file must include records.");
  return parsed as Required<HadithReviewEvidenceFile>;
}

function quoted(value: unknown): string {
  return JSON.stringify(cleanText(value));
}

function isoDate(value: unknown): string {
  return new Date(cleanText(value)).toISOString();
}

function verifiedCardId(draftId: string): string {
  return draftId.replace(/^draft-/, "verified-");
}

function buildVerifiedCards(
  records: HadithReviewEvidenceRecord[],
): VerifiedIslamicSourceCard[] {
  const recordById = new Map(
    records.map((record) => [cleanText(record.draftId), record]),
  );
  return hadithDraftCards().map((card) => {
    const evidence = recordById.get(card.id);
    if (!evidence) fail(`${card.id} missing after validation.`);
    return {
      id: verifiedCardId(card.id),
      packId: card.packId,
      domain: card.domain,
      type: card.type,
      reference: card.reference,
      title: card.title.replace(/\s+candidate$/i, ""),
      explanation: cleanText(evidence.reviewedExplanation),
      url: card.sourceUrl,
      keywords: card.keywords,
      reviewedBy: cleanText(evidence.reviewerName),
      reviewedAt: isoDate(evidence.activationApprovedAt),
      verified: true,
    };
  });
}

function formatArray(values: string[], indent: string): string {
  return `[${values.map((value) => `${quoted(value)}`).join(", ")}]`
    .split("\n")
    .map((line) => `${indent}${line}`)
    .join("\n")
    .trimStart();
}

function formatVerifiedCard(card: VerifiedIslamicSourceCard): string {
  return [
    "  {",
    `    id: ${quoted(card.id)},`,
    `    packId: ${quoted(card.packId)},`,
    `    domain: ${quoted(card.domain)},`,
    `    type: ${quoted(card.type)},`,
    `    reference: ${quoted(card.reference)},`,
    `    title: ${quoted(card.title)},`,
    `    explanation: ${quoted(card.explanation)},`,
    `    url: ${quoted(card.url)},`,
    `    keywords: ${formatArray(card.keywords, "    ")},`,
    `    reviewedBy: ${quoted(card.reviewedBy)},`,
    `    reviewedAt: ${quoted(card.reviewedAt)},`,
    "    verified: true,",
    "  },",
  ].join("\n");
}

function formatDraftCards(cards: typeof DRAFT_ISLAMIC_SOURCE_CARDS): string {
  return JSON.stringify(cards, null, 2)
    .replace(/"([^"]+)":/g, "$1:")
    .replace(/"([^"]+)"/g, (_match, value: string) => JSON.stringify(value));
}

function updateHadithManifest(source: string, licenseStatus: string): string {
  let next = source;
  for (const [field, value] of [
    ["status", "verified"],
    ["sourceTitle", "Reviewed hadith source cards"],
    ["licenseStatus", licenseStatus],
    ["reviewStatus", "approved"],
    ["importStatus", "ready"],
  ] as const) {
    const pattern = new RegExp(
      `(id: "hadith-source-pack-staging",[\\s\\S]*?${field}: )"[^"]+"`,
    );
    next = next.replace(pattern, `$1"${value}"`);
  }
  return next;
}

function activateSourcePack(
  source: string,
  cards: VerifiedIslamicSourceCard[],
  licenseStatus: string,
): string {
  let next = updateHadithManifest(source, licenseStatus);
  const allVerifiedCards = [
    ...VERIFIED_ISLAMIC_SOURCE_CARDS.filter((card) => card.domain !== "hadith"),
    ...cards,
  ];
  const verifiedBlock = [
    "export const VERIFIED_ISLAMIC_SOURCE_CARDS: VerifiedIslamicSourceCard[] = [",
    ...allVerifiedCards.map(formatVerifiedCard),
    "];",
    "",
    "export const DRAFT_ISLAMIC_SOURCE_CARDS: DraftIslamicSourceCard[] = ",
    `${formatDraftCards(DRAFT_ISLAMIC_SOURCE_CARDS.filter((card) => card.domain !== "hadith"))};`,
  ].join("\n");

  next = next.replace(
    /export const VERIFIED_ISLAMIC_SOURCE_CARDS: VerifiedIslamicSourceCard\[\] = \[[\s\S]*?\];\n\nexport const DRAFT_ISLAMIC_SOURCE_CARDS: DraftIslamicSourceCard\[\] = \[[\s\S]*?\n\];/,
    verifiedBlock,
  );
  return next;
}

validateEvidence();
const evidence = readEvidenceFile();
const cards = buildVerifiedCards(evidence.records);
const licenseStatuses = new Set(
  evidence.records.map((record) => cleanText(record.licenseStatus)),
);
const licenseStatus =
  licenseStatuses.size === 1 ? [...licenseStatuses][0] : "licensed";
const currentSource = fs.readFileSync(sourcePackPath, "utf8");
const nextSource = activateSourcePack(currentSource, cards, licenseStatus);

if (currentSource === nextSource) {
  fail("Source-pack file did not change; activation markers were not found.");
}

if (wantsWrite && !confirmSourcePackActivation) {
  fail(
    "Refusing to write verified hadith source cards without --confirm-source-pack-activation.",
    {
      nextCommand:
        "Re-run with --confirm-source-pack-activation only after inspecting the dry-run diff and confirming real review evidence.",
    },
  );
}

if (wantsWrite) {
  fs.writeFileSync(sourcePackPath, nextSource);
}

const summary = {
  ok: true,
  mode: wantsWrite ? "write" : "dry-run",
  evidencePath: path.relative(process.cwd(), evidencePath),
  sourcePackPath: path.relative(process.cwd(), sourcePackPath),
  confirmSourcePackActivation,
  activatedCardCount: cards.length,
  licenseStatus,
  wrote: wantsWrite,
};

if (wantsSummaryJson) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(
    wantsWrite
      ? `Activated ${cards.length} reviewed hadith source cards.`
      : `Dry run passed: ${cards.length} reviewed hadith source cards are ready to activate.`,
  );
}
