import crypto from "node:crypto";

import {
  DRAFT_ISLAMIC_SOURCE_CARDS,
  type DraftIslamicSourceCard,
  type IslamicSourcePackLicenseStatus,
} from "../../server/ai/islamicSourcePacks";
import {
  buildActivationProofPlan,
  type SourcePackActivationProofPlan,
} from "./sourceReviewActivationProofPlan";

export const TAFSIR_REVIEW_EVIDENCE_SCHEMA_VERSION = 1;
export const DEFAULT_TAFSIR_REVIEW_EVIDENCE_PATH =
  "docs/audit/tafsir-source-review-evidence.intake.json";

export const SOURCE_REVIEW_CHECKLIST_FIELDS = [
  "sourceUrlReviewed",
  "licensingCleared",
  "scopeSummaryAccurate",
  "noCopiedSourceText",
  "allowedUseApproved",
  "forbiddenUseApproved",
  "safeForActivation",
] as const;

export type SourceReviewChecklistKey =
  (typeof SOURCE_REVIEW_CHECKLIST_FIELDS)[number];

export type TafsirReviewEvidenceRecord = {
  draftId?: unknown;
  title?: unknown;
  reference?: unknown;
  sourceWork?: unknown;
  sourceUrl?: unknown;
  sourceCardHash?: unknown;
  cardApprovedForActivation?: unknown;
  licenseStatus?: unknown;
  reviewChecklist?: unknown;
  reviewerName?: unknown;
  reviewerQualification?: unknown;
  reviewerReviewedAt?: unknown;
  reviewerNotes?: unknown;
  licensingEvidence?: unknown;
  activationApprover?: unknown;
  activationApprovedAt?: unknown;
  activationNotes?: unknown;
  reviewedExplanation?: unknown;
};

export type TafsirReviewEvidenceFile = {
  schemaVersion?: unknown;
  generatedFrom?: unknown;
  activationProofPlan?: SourcePackActivationProofPlan;
  records?: TafsirReviewEvidenceRecord[];
};

export type ReviewFinding = {
  id: string;
  severity: "blocker" | "warning";
  message: string;
};

export function tafsirDraftCards(): DraftIslamicSourceCard[] {
  return DRAFT_ISLAMIC_SOURCE_CARDS.filter((card) => card.domain === "tafsir");
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

export function sourceCardHash(card: DraftIslamicSourceCard): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stableForHash(card)))
    .digest("hex");
}

export function emptyReviewChecklist(): Record<
  SourceReviewChecklistKey,
  false
> {
  return Object.fromEntries(
    SOURCE_REVIEW_CHECKLIST_FIELDS.map((field) => [field, false]),
  ) as Record<SourceReviewChecklistKey, false>;
}

export function buildTemplateRecord(
  card: DraftIslamicSourceCard,
): TafsirReviewEvidenceRecord {
  return {
    draftId: card.id,
    title: card.title,
    reference: card.reference,
    sourceWork: card.sourceWork,
    sourceUrl: card.sourceUrl,
    sourceCardHash: sourceCardHash(card),
    cardApprovedForActivation: false,
    licenseStatus: card.licenseStatus,
    reviewChecklist: emptyReviewChecklist(),
    reviewerName: "",
    reviewerQualification: "",
    reviewerReviewedAt: "",
    reviewerNotes: "",
    licensingEvidence: "",
    activationApprover: "",
    activationApprovedAt: "",
    activationNotes: "",
    reviewedExplanation: "",
  };
}

export function buildTemplateEvidenceFile(): Required<TafsirReviewEvidenceFile> {
  return {
    schemaVersion: TAFSIR_REVIEW_EVIDENCE_SCHEMA_VERSION,
    generatedFrom: "DRAFT_ISLAMIC_SOURCE_CARDS",
    activationProofPlan: buildActivationProofPlan("tafsir"),
    records: tafsirDraftCards().map(buildTemplateRecord),
  };
}

export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function hasRealText(value: unknown): boolean {
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

export function validReviewDate(value: unknown): boolean {
  const text = cleanText(value);
  if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return false;
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return false;
  return parsed <= Date.now() + 24 * 60 * 60 * 1000;
}

export function clearedLicenseStatus(
  value: unknown,
): value is Extract<
  IslamicSourcePackLicenseStatus,
  "licensed" | "public_domain" | "owned"
> {
  return value === "licensed" || value === "public_domain" || value === "owned";
}
