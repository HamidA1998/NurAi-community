#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

import {
  ISLAMIC_SOURCE_PACK_MANIFEST,
  type DraftIslamicSourceCard,
} from "../server/ai/islamicSourcePacks";
import { fiqhDraftCards, sourceCardHash } from "./lib/fiqhSourceReview";

const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");
const wantsJson =
  process.argv.includes("--json") || process.argv.includes("--summary-json");

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function md(value: unknown): string {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeGeneratedAt(value: string): string {
  return value.replace(/^Generated: .+$/gm, "Generated: <normalized>");
}

const outDir = path.resolve(
  process.cwd(),
  argValue("--out-dir") || "docs/audit/fiqh-source-review-packets",
);

function packetFile(card: DraftIslamicSourceCard): string {
  return path.join(outDir, `${slug(card.id)}.md`);
}

function packFor(card: DraftIslamicSourceCard) {
  return ISLAMIC_SOURCE_PACK_MANIFEST.find((pack) => pack.id === card.packId);
}

function renderPacket(card: DraftIslamicSourceCard): string {
  const pack = packFor(card);
  return [
    `# ${card.title}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This packet is for human review only. It does not activate the fiqh card or make it available to NurAI answers.",
    "",
    "## Draft Card",
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Draft ID | ${md(card.id)} |`,
    `| Source card hash | ${md(sourceCardHash(card))} |`,
    `| Pack ID | ${md(card.packId)} |`,
    `| Pack status | ${md(pack?.status || "missing")} |`,
    `| Pack review | ${md(pack?.reviewStatus || "missing")} |`,
    `| Domain | ${md(card.domain)} |`,
    `| Reference | ${md(card.reference)} |`,
    `| Active | ${md(card.active)} |`,
    `| License status | ${md(card.licenseStatus)} |`,
    `| Review status | ${md(card.reviewStatus)} |`,
    `| Source work | ${md(card.sourceWork)} |`,
    `| Source author | ${md(card.sourceAuthor || "Unknown")} |`,
    `| Source URL | ${md(card.sourceUrl)} |`,
    "",
    "## Scope",
    "",
    card.scopeSummary,
    "",
    "## Keywords",
    "",
    card.keywords.map((keyword) => `- ${keyword}`).join("\n"),
    "",
    "## Allowed Use",
    "",
    card.allowedUse,
    "",
    "## Forbidden Use",
    "",
    card.forbiddenUse,
    "",
    "## Review Checklist",
    "",
    "- [ ] Source URL opens and points to the intended fiqh source.",
    "- [ ] Madhhab scope and qualified-scholar review requirement are checked.",
    "- [ ] Licensing or permission evidence is recorded.",
    "- [ ] Reviewer confirms the scope summary is accurate.",
    "- [ ] No copied fiqh wording or commentary is included in the app card.",
    "- [ ] Allowed use and forbidden use are correct and narrow.",
    "- [ ] Reviewer confirms this card is safe to activate.",
    "- [ ] Activation PR moves the card to `VERIFIED_ISLAMIC_SOURCE_CARDS` with `reviewedBy` and `reviewedAt`.",
    "",
    "## Reviewer Sign-Off",
    "",
    "| Reviewer | Qualification | Date | Licensing evidence | Decision | Notes |",
    "| --- | --- | --- | --- | --- | --- |",
    "|  |  |  |  |  |  |",
    "",
    "## Activation Note",
    "",
    "Only activate after real fiqh/source review. Keep this packet as evidence, update the source-pack manifest to reviewed/licensed/ready, then move a concise reviewed card into `VERIFIED_ISLAMIC_SOURCE_CARDS`.",
    "",
  ].join("\n");
}

function renderIndex(): string {
  const rows = fiqhDraftCards()
    .map((card) => {
      const pack = packFor(card);
      return `| [${md(card.title)}](${slug(card.id)}.md) | ${md(card.reference)} | ${md(card.sourceWork)} | ${md(card.licenseStatus)} | ${md(pack?.status || "missing")} |`;
    })
    .join("\n");

  return [
    "# Fiqh Source Review Packets",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "These packets prepare fiqh draft cards for real source, licensing, and qualified review. Draft cards remain inactive until separately moved into the verified source-card catalog.",
    "",
    "| Packet | Reference | Source work | License | Pack status |",
    "| --- | --- | --- | --- | --- |",
    rows,
    "",
    "## Activation Rules",
    "",
    "- Do not activate a card from a packet alone.",
    "- Do not quote fiqh wording unless the source license permits it.",
    "- Do not use fiqh packets for personal fatwa, medical advice, or sensitive rulings.",
    "- Keep every activated card narrow, source-backed, and reviewed.",
    "",
  ].join("\n");
}

function expectedArtifacts(): Map<string, string> {
  const artifacts = new Map<string, string>();
  artifacts.set(path.join(outDir, "README.md"), renderIndex());
  for (const card of fiqhDraftCards()) {
    artifacts.set(packetFile(card), renderPacket(card));
  }
  return artifacts;
}

function checkArtifacts(): string[] {
  const findings: string[] = [];
  for (const [file, expected] of expectedArtifacts()) {
    if (!fs.existsSync(file)) {
      findings.push(`${path.relative(process.cwd(), file)} is missing.`);
      continue;
    }
    const actual = fs.readFileSync(file, "utf8");
    if (normalizeGeneratedAt(actual) !== normalizeGeneratedAt(expected)) {
      findings.push(`${path.relative(process.cwd(), file)} is stale.`);
    }
  }
  return findings;
}

let written = 0;
if (wantsWrite) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const [file, content] of expectedArtifacts()) {
    fs.writeFileSync(file, content);
    written += 1;
  }
}

const findings = wantsCheck ? checkArtifacts() : [];
const summary = {
  ok: findings.length === 0,
  outDir: path.relative(process.cwd(), outDir),
  draftCount: fiqhDraftCards().length,
  artifactCount: expectedArtifacts().size,
  written,
  findings,
};

if (wantsJson) {
  console.log(JSON.stringify(summary, null, 2));
} else if (wantsCheck) {
  if (findings.length) {
    console.error("Fiqh review packets are not current:");
    for (const finding of findings) console.error(`- ${finding}`);
  } else {
    console.log(
      `Fiqh review packets are current: ${summary.artifactCount} artifacts.`,
    );
  }
} else if (wantsWrite) {
  console.log(`Wrote ${written} fiqh review packet artifacts.`);
} else {
  console.log(renderIndex());
}

if (findings.length) process.exit(1);
