import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  DRAFT_ISLAMIC_SOURCE_CARDS,
  ISLAMIC_SOURCE_PACK_MANIFEST,
  SOURCE_PACK_DOMAINS,
  VERIFIED_ISLAMIC_SOURCE_CARDS,
  sourcePackReadinessSummary,
  type DraftIslamicSourceCard,
  type IslamicSourcePackDomain,
} from "./islamicSourcePacks";

const CLEARED_LICENSE_STATUSES = new Set([
  "licensed",
  "public_domain",
  "owned",
]);

const CHECKLIST_FIELDS_BY_DOMAIN: Record<IslamicSourcePackDomain, string[]> = {
  tafsir: [
    "sourceUrlReviewed",
    "licensingCleared",
    "scopeSummaryAccurate",
    "noCopiedSourceText",
    "allowedUseApproved",
    "forbiddenUseApproved",
    "safeForActivation",
  ],
  hadith: [
    "sourceUrlReviewed",
    "referenceVerified",
    "authenticityScopeReviewed",
    "licensingCleared",
    "scopeSummaryAccurate",
    "noCopiedSourceText",
    "allowedUseApproved",
    "forbiddenUseApproved",
    "safeForActivation",
  ],
  fiqh: [
    "sourceUrlReviewed",
    "madhhabScopeReviewed",
    "qualifiedScholarReviewed",
    "licensingCleared",
    "scopeSummaryAccurate",
    "noCopiedSourceText",
    "allowedUseApproved",
    "forbiddenUseApproved",
    "safeForActivation",
  ],
  seerah: [
    "sourceUrlReviewed",
    "eventScopeReviewed",
    "timelineClaimsReviewed",
    "licensingCleared",
    "scopeSummaryAccurate",
    "noCopiedSourceText",
    "allowedUseApproved",
    "forbiddenUseApproved",
    "safeForActivation",
  ],
};

export interface SourcePackCardReviewStatus {
  draftId: string;
  title: string;
  reference: string;
  sourceWork: string;
  sourceUrl: string;
  sourceCardHash: string;
  approved: boolean;
  blockerCount: number;
  blockers: string[];
  reviewerName?: string;
  reviewedAt?: string;
}

export interface SourcePackDomainReviewStatus {
  domain: IslamicSourcePackDomain;
  manifest: {
    id: string;
    title: string;
    status: string;
    sourceTitle: string;
    licenseStatus: string;
    reviewStatus: string;
    importStatus: string;
  } | null;
  evidencePath: string;
  packetDir: string;
  evidenceExists: boolean;
  draftCount: number;
  approvedCount: number;
  blockerCount: number;
  activationReady: boolean;
  reviewHandoffLabel: string;
  reviewHandoffBody: string;
  nextActionCommand: string;
  nextActionChecklist: string[];
  activationRehearsalPlan: SourcePackActivationRehearsalPlan;
  draftCards: SourcePackCardReviewStatus[];
  dryRun?: SourcePackActivationDryRun;
}

export interface SourcePackActivationRehearsalPlan {
  title: string;
  summary: string;
  validationCommand: string;
  dryRunCommand: string;
  writeCommand: string;
  finalReadinessCommand: string;
  noSecretBoundary: string;
  noClaimBoundary: string;
  reviewerProofChecklist: string[];
}

export interface SourcePackActivationDryRun {
  ok: boolean;
  script: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

function isDomain(value: string): value is IslamicSourcePackDomain {
  return (SOURCE_PACK_DOMAINS as readonly string[]).includes(value);
}

export function parseSourcePackDomain(value: unknown): IslamicSourcePackDomain {
  const domain = String(value || "")
    .trim()
    .toLowerCase();
  if (!isDomain(domain)) {
    throw new Error(
      `Unsupported source-pack domain. Use one of: ${SOURCE_PACK_DOMAINS.join(", ")}.`,
    );
  }
  return domain;
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasRealText(value: unknown): boolean {
  const text = cleanText(value);
  if (!text) return false;
  return ![
    /\bto\s*do\b/i,
    /\btbd\b/i,
    /\bn\/a\b/i,
    /\bna\b/i,
    /\bplaceholder\b/i,
    /\bexample\b/i,
    /\bunknown\b/i,
    /\breplace[-_\s]?me\b/i,
  ].some((pattern) => pattern.test(text));
}

function validDate(value: unknown): boolean {
  const text = cleanText(value);
  if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return false;
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return false;
  return parsed <= Date.now() + 24 * 60 * 60 * 1000;
}

function stableForHash(card: DraftIslamicSourceCard) {
  return {
    id: card.id,
    packId: card.packId,
    domain: card.domain,
    type: card.type,
    reference: card.reference,
    title: card.title,
    sourceWork: card.sourceWork,
    sourceAuthor: card.sourceAuthor || "",
    sourceUrl: card.sourceUrl,
    scopeSummary: card.scopeSummary,
    keywords: card.keywords,
    allowedUse: card.allowedUse,
    forbiddenUse: card.forbiddenUse,
    licenseStatus: card.licenseStatus,
    reviewStatus: card.reviewStatus,
    active: card.active,
  };
}

export function sourcePackDraftCardHash(card: DraftIslamicSourceCard): string {
  return createHash("sha256")
    .update(JSON.stringify(stableForHash(card)))
    .digest("hex");
}

function evidencePathForDomain(domain: IslamicSourcePackDomain): string {
  return path.join(
    "docs",
    "audit",
    `${domain}-source-review-evidence.intake.json`,
  );
}

function packetDirForDomain(domain: IslamicSourcePackDomain): string {
  return path.join("docs", "audit", `${domain}-source-review-packets`);
}

function activationScriptForDomain(domain: IslamicSourcePackDomain): string {
  return path.join("scripts", `apply-${domain}-review-evidence.ts`);
}

function buildSourcePackReviewHandoff({
  domain,
  evidencePath,
  packetDir,
  evidenceExists,
  draftCount,
  approvedCount,
  blockerCount,
}: {
  domain: IslamicSourcePackDomain;
  evidencePath: string;
  packetDir: string;
  evidenceExists: boolean;
  draftCount: number;
  approvedCount: number;
  blockerCount: number;
}) {
  const activationReady = draftCount > 0 && approvedCount === draftCount;
  const reviewHandoffLabel = activationReady
    ? "Activation dry run ready"
    : evidenceExists
      ? "Evidence intake pending review"
      : "Review evidence missing";
  const reviewHandoffBody = activationReady
    ? `${domain} has approved evidence for every draft card. Run the dry run before moving any card into the verified catalog.`
    : evidenceExists
      ? `${domain} has an evidence intake template, but still has ${blockerCount} activation blocker(s). Keep all cards inactive until real review evidence, validation, and apply checks pass.`
      : `${domain} has ${draftCount} inactive draft card(s). Export packets and evidence intake for human source/licensing review before activation.`;
  const nextActionCommand = activationReady
    ? `npm run apply:${domain}-review-evidence -- --summary-json`
    : evidenceExists
      ? `npm run validate:${domain}-review-evidence -- --file ${evidencePath} --summary-json`
      : `npm run export:${domain}-review-packets -- --write && npm run export:${domain}-review-evidence-intake -- --write`;
  const nextActionChecklist = activationReady
    ? [
        "Run the activation dry run and inspect the reviewed card diff.",
        "Confirm reviewer names, dates, licensing evidence, and source-card hashes are non-placeholder and current.",
        "Only then rerun with --confirm-source-pack-activation to move concise reviewed cards into VERIFIED_ISLAMIC_SOURCE_CARDS.",
      ]
    : evidenceExists
      ? [
          "Fix every validation blocker in the external evidence file.",
          "Keep draft cards inactive while reviewer notes, licensing evidence, or hashes are incomplete.",
          "Re-run validation before any apply command or activation PR.",
        ]
      : [
          `Send packet files from ${packetDir} to qualified source/licensing reviewers.`,
          `Fill ${evidencePath} with real reviewer names, dates, notes, licensing evidence, and current source-card hashes.`,
          "Do not claim the source pack is verified or available to NurAI answers yet.",
        ];

  return {
    reviewHandoffLabel,
    reviewHandoffBody,
    nextActionCommand,
    nextActionChecklist,
  };
}

function buildSourcePackActivationRehearsalPlan({
  domain,
  evidencePath,
  draftCount,
  approvedCount,
  blockerCount,
}: {
  domain: IslamicSourcePackDomain;
  evidencePath: string;
  draftCount: number;
  approvedCount: number;
  blockerCount: number;
}): SourcePackActivationRehearsalPlan {
  const missingApprovalCount = Math.max(draftCount - approvedCount, 0);
  return {
    title: `${domain} activation rehearsal`,
    summary:
      blockerCount === 0 && missingApprovalCount === 0
        ? `${domain} can rehearse activation after validation passes with current reviewer evidence.`
        : `${domain} still needs ${missingApprovalCount} approval(s) and ${blockerCount} blocker fix(es) before activation rehearsal can become release proof.`,
    validationCommand: `npm run validate:${domain}-review-evidence -- --file ${evidencePath} --require-approved --summary-json`,
    dryRunCommand: `npm run apply:${domain}-review-evidence -- --file ${evidencePath} --summary-json`,
    writeCommand: `npm run apply:${domain}-review-evidence -- --file ${evidencePath} --write --confirm-source-pack-activation`,
    finalReadinessCommand:
      "npm run check:source-pack-final-readiness -- --summary-json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
    noSecretBoundary:
      "Evidence must not include API keys, auth headers, cookies, database URLs, private keys, JWTs, copied source text, or private reviewer contact data.",
    noClaimBoundary:
      "Do not claim verified source packs, qualified-scholar review, activation readiness, or active NurAI answer use until validation, dry-run activation, all-domain final readiness, and confirmed write evidence pass.",
    reviewerProofChecklist: [
      "Every current draft card appears exactly once with the current sourceCardHash.",
      "Reviewer name, qualification, notes, licensing evidence, reviewed explanation, activation approver, and activation notes are real and non-placeholder.",
      "All domain-specific checklist booleans are true, including safeForActivation.",
      "Dry-run output is inspected before any --write --confirm-source-pack-activation command.",
      "All-domain final readiness passes with zero secret-like evidence findings before any release claim.",
    ],
  };
}

function readEvidenceRecords(domain: IslamicSourcePackDomain): {
  evidenceExists: boolean;
  recordsByDraftId: Map<string, Record<string, unknown>>;
  fileBlockers: string[];
} {
  const absolutePath = path.resolve(
    process.cwd(),
    evidencePathForDomain(domain),
  );
  if (!fs.existsSync(absolutePath)) {
    return {
      evidenceExists: false,
      recordsByDraftId: new Map(),
      fileBlockers: [
        `Evidence file is missing at ${evidencePathForDomain(domain)}.`,
      ],
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as {
      records?: unknown;
    };
    if (!Array.isArray(parsed.records)) {
      return {
        evidenceExists: true,
        recordsByDraftId: new Map(),
        fileBlockers: ["Evidence file must include a records array."],
      };
    }
    const recordsByDraftId = new Map<string, Record<string, unknown>>();
    const fileBlockers: string[] = [];
    for (const record of parsed.records) {
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        fileBlockers.push("Every evidence record must be an object.");
        continue;
      }
      const typed = record as Record<string, unknown>;
      const draftId = cleanText(typed.draftId);
      if (!draftId) {
        fileBlockers.push("Every evidence record must include draftId.");
        continue;
      }
      if (recordsByDraftId.has(draftId)) {
        fileBlockers.push(`${draftId} has duplicate evidence records.`);
        continue;
      }
      recordsByDraftId.set(draftId, typed);
    }
    return { evidenceExists: true, recordsByDraftId, fileBlockers };
  } catch (error) {
    return {
      evidenceExists: true,
      recordsByDraftId: new Map(),
      fileBlockers: [
        error instanceof Error
          ? `Evidence file could not be parsed: ${error.message}`
          : "Evidence file could not be parsed.",
      ],
    };
  }
}

function validateCardEvidence(
  domain: IslamicSourcePackDomain,
  card: DraftIslamicSourceCard,
  record: Record<string, unknown> | undefined,
  fileBlockers: string[],
): SourcePackCardReviewStatus {
  const blockers = [...fileBlockers];
  const expectedHash = sourcePackDraftCardHash(card);

  if (!record) {
    blockers.push(`${card.id} is missing from review evidence.`);
  } else {
    if (record.sourceCardHash !== expectedHash) {
      blockers.push("sourceCardHash is stale or incorrect.");
    }
    if (record.cardApprovedForActivation !== true) {
      blockers.push("cardApprovedForActivation must be true.");
    }
    if (!CLEARED_LICENSE_STATUSES.has(cleanText(record.licenseStatus))) {
      blockers.push("licenseStatus must be licensed, public_domain, or owned.");
    }

    const checklist =
      record.reviewChecklist &&
      typeof record.reviewChecklist === "object" &&
      !Array.isArray(record.reviewChecklist)
        ? (record.reviewChecklist as Record<string, unknown>)
        : null;
    if (!checklist) {
      blockers.push("reviewChecklist is required.");
    } else {
      for (const field of CHECKLIST_FIELDS_BY_DOMAIN[domain]) {
        if (checklist[field] !== true) {
          blockers.push(`reviewChecklist.${field} must be true.`);
        }
      }
    }

    for (const [field, label, minLength] of [
      ["reviewerName", "Reviewer name", 2],
      ["reviewerQualification", "Reviewer qualification", 2],
      ["reviewerNotes", "Reviewer notes", 60],
      ["licensingEvidence", "Licensing evidence", 40],
      ["activationApprover", "Activation approver", 2],
      ["activationNotes", "Activation notes", 40],
      ["reviewedExplanation", "Reviewed explanation", 80],
    ] as const) {
      const text = cleanText(record[field]);
      if (!hasRealText(text)) {
        blockers.push(`${label} is required.`);
      } else if (text.length < minLength) {
        blockers.push(
          `${label} must include at least ${minLength} characters of specific review detail.`,
        );
      }
    }

    if (!validDate(record.reviewerReviewedAt)) {
      blockers.push("Reviewer reviewed date must be an ISO-like past date.");
    }
    if (!validDate(record.activationApprovedAt)) {
      blockers.push("Activation approved date must be an ISO-like past date.");
    }
    if (
      validDate(record.reviewerReviewedAt) &&
      validDate(record.activationApprovedAt) &&
      Date.parse(cleanText(record.activationApprovedAt)) <
        Date.parse(cleanText(record.reviewerReviewedAt))
    ) {
      blockers.push(
        "Activation approval date must not be before reviewer date.",
      );
    }
  }

  return {
    draftId: card.id,
    title: card.title,
    reference: card.reference,
    sourceWork: card.sourceWork,
    sourceUrl: card.sourceUrl,
    sourceCardHash: expectedHash,
    approved: blockers.length === 0,
    blockerCount: blockers.length,
    blockers,
    reviewerName: record
      ? cleanText(record.reviewerName) || undefined
      : undefined,
    reviewedAt: record
      ? cleanText(record.reviewerReviewedAt) || undefined
      : undefined,
  };
}

export function getSourcePackDomainReviewStatus(
  domain: IslamicSourcePackDomain,
): SourcePackDomainReviewStatus {
  const manifest =
    ISLAMIC_SOURCE_PACK_MANIFEST.find((pack) => pack.domain === domain) || null;
  const cards = DRAFT_ISLAMIC_SOURCE_CARDS.filter(
    (card) => card.domain === domain,
  );
  const { evidenceExists, recordsByDraftId, fileBlockers } =
    readEvidenceRecords(domain);
  const draftCards = cards.map((card) =>
    validateCardEvidence(
      domain,
      card,
      recordsByDraftId.get(card.id),
      fileBlockers,
    ),
  );
  const approvedCount = draftCards.filter((card) => card.approved).length;
  const blockerCount = draftCards.reduce(
    (sum, card) => sum + card.blockerCount,
    0,
  );
  const evidencePath = evidencePathForDomain(domain);
  const packetDir = packetDirForDomain(domain);
  const handoff = buildSourcePackReviewHandoff({
    domain,
    evidencePath,
    packetDir,
    evidenceExists,
    draftCount: cards.length,
    approvedCount,
    blockerCount,
  });
  const activationRehearsalPlan = buildSourcePackActivationRehearsalPlan({
    domain,
    evidencePath,
    draftCount: cards.length,
    approvedCount,
    blockerCount,
  });

  return {
    domain,
    manifest: manifest
      ? {
          id: manifest.id,
          title: manifest.title,
          status: manifest.status,
          sourceTitle: manifest.sourceTitle,
          licenseStatus: manifest.licenseStatus,
          reviewStatus: manifest.reviewStatus,
          importStatus: manifest.importStatus,
        }
      : null,
    evidencePath,
    packetDir,
    evidenceExists,
    draftCount: cards.length,
    approvedCount,
    blockerCount,
    activationReady: cards.length > 0 && approvedCount === cards.length,
    ...handoff,
    activationRehearsalPlan,
    draftCards,
  };
}

export function getAllSourcePackReviewStatuses(): {
  readiness: ReturnType<typeof sourcePackReadinessSummary>;
  verifiedCardCount: number;
  draftCardCount: number;
  domains: SourcePackDomainReviewStatus[];
} {
  const domains = SOURCE_PACK_DOMAINS.map(getSourcePackDomainReviewStatus);
  return {
    readiness: sourcePackReadinessSummary(),
    verifiedCardCount: VERIFIED_ISLAMIC_SOURCE_CARDS.length,
    draftCardCount: DRAFT_ISLAMIC_SOURCE_CARDS.length,
    domains,
  };
}

export function runSourcePackActivationDryRun(
  domain: IslamicSourcePackDomain,
): SourcePackActivationDryRun {
  const script = activationScriptForDomain(domain);
  const result = spawnSync("npx", ["tsx", script, "--summary-json"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    script,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    exitCode: result.status,
  };
}
