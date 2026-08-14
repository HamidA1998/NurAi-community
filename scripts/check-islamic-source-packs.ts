#!/usr/bin/env tsx

import {
  ISLAMIC_SOURCE_PACK_MANIFEST,
  DRAFT_ISLAMIC_SOURCE_CARDS,
  DraftIslamicSourceCardSchema,
  IslamicSourcePackManifestSchema,
  SOURCE_PACK_DOMAINS,
  VERIFIED_ISLAMIC_SOURCE_CARDS,
  VerifiedIslamicSourceCardSchema,
} from "../server/ai/islamicSourcePacks";

const findings: string[] = [];

function fail(message: string) {
  findings.push(message);
}

const packIds = new Set<string>();
const domains = new Set<string>();

for (const pack of ISLAMIC_SOURCE_PACK_MANIFEST) {
  const parsed = IslamicSourcePackManifestSchema.safeParse(pack);
  if (!parsed.success) {
    fail(`${pack.id || "source pack"} manifest failed schema validation.`);
    continue;
  }

  if (packIds.has(pack.id)) fail(`${pack.id} is duplicated.`);
  packIds.add(pack.id);
  domains.add(pack.domain);

  if (pack.status === "verified") {
    if (pack.importStatus !== "ready") {
      fail(`${pack.id} cannot be verified before importStatus is ready.`);
    }
    if (pack.reviewStatus !== "approved") {
      fail(`${pack.id} cannot be verified before reviewStatus is approved.`);
    }
    if (
      pack.licenseStatus !== "licensed" &&
      pack.licenseStatus !== "public_domain" &&
      pack.licenseStatus !== "owned"
    ) {
      fail(`${pack.id} cannot be verified before licensing is cleared.`);
    }
  }
}

for (const domain of SOURCE_PACK_DOMAINS) {
  if (!domains.has(domain)) {
    fail(`Missing source-pack manifest for ${domain}.`);
  }
}

const cardIds = new Set<string>();
const draftIds = new Set<string>();

for (const card of DRAFT_ISLAMIC_SOURCE_CARDS) {
  const parsed = DraftIslamicSourceCardSchema.safeParse(card);
  if (!parsed.success) {
    fail(`${card.id || "draft source card"} failed schema validation.`);
    continue;
  }

  if (draftIds.has(card.id)) fail(`${card.id} is duplicated.`);
  draftIds.add(card.id);

  const pack = ISLAMIC_SOURCE_PACK_MANIFEST.find(
    (candidate) => candidate.id === card.packId,
  );
  if (!pack) {
    fail(`${card.id} points to missing draft pack ${card.packId}.`);
    continue;
  }
  if (card.active !== false) {
    fail(`${card.id} must remain inactive until verified.`);
  }
  if (card.domain !== pack.domain) {
    fail(`${card.id} domain ${card.domain} does not match ${pack.id}.`);
  }
  if (pack.status === "verified") {
    fail(
      `${card.id} must move to VERIFIED_ISLAMIC_SOURCE_CARDS before pack verification.`,
    );
  }
}

for (const card of VERIFIED_ISLAMIC_SOURCE_CARDS) {
  const parsed = VerifiedIslamicSourceCardSchema.safeParse(card);
  if (!parsed.success) {
    fail(`${card.id || "source card"} failed schema validation.`);
    continue;
  }

  if (cardIds.has(card.id)) fail(`${card.id} is duplicated.`);
  cardIds.add(card.id);

  const pack = ISLAMIC_SOURCE_PACK_MANIFEST.find(
    (candidate) => candidate.id === card.packId,
  );
  if (!pack) {
    fail(`${card.id} points to missing pack ${card.packId}.`);
    continue;
  }
  if (pack.status !== "verified") {
    fail(`${card.id} cannot be active because ${pack.id} is not verified.`);
  }
  if (pack.reviewStatus !== "approved") {
    fail(`${card.id} cannot be active because ${pack.id} is not approved.`);
  }
  if (pack.importStatus !== "ready") {
    fail(`${card.id} cannot be active because ${pack.id} import is not ready.`);
  }
  if (card.domain !== pack.domain) {
    fail(`${card.id} domain ${card.domain} does not match ${pack.id}.`);
  }
}

if (findings.length) {
  console.error("Islamic source-pack check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  `Islamic source-pack check passed: ${ISLAMIC_SOURCE_PACK_MANIFEST.length} manifests, ${DRAFT_ISLAMIC_SOURCE_CARDS.length} draft cards, ${VERIFIED_ISLAMIC_SOURCE_CARDS.length} verified cards.`,
);
