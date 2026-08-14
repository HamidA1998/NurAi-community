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

export const HADITH_REVIEW_EVIDENCE_SCHEMA_VERSION = 1;
export const DEFAULT_HADITH_REVIEW_EVIDENCE_PATH =
  "docs/audit/hadith-source-review-evidence.intake.json";

export const HADITH_REVIEW_CHECKLIST_FIELDS = [
  "sourceUrlReviewed",
  "referenceVerified",
  "authenticityScopeReviewed",
  "licensingCleared",
  "scopeSummaryAccurate",
  "noCopiedSourceText",
  "allowedUseApproved",
  "forbiddenUseApproved",
  "safeForActivation",
] as const;

export type HadithReviewChecklistKey =
  (typeof HADITH_REVIEW_CHECKLIST_FIELDS)[number];

export type HadithReviewEvidenceRecord = {
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

export type HadithReviewEvidenceFile = {
  schemaVersion?: unknown;
  generatedFrom?: unknown;
  activationProofPlan?: SourcePackActivationProofPlan;
  records?: HadithReviewEvidenceRecord[];
};

export type ReviewFinding = {
  id: string;
  severity: "blocker" | "warning";
  message: string;
};

export function hadithDraftCards(): DraftIslamicSourceCard[] {
  return DRAFT_ISLAMIC_SOURCE_CARDS.filter((card) => card.domain === "hadith");
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
  HadithReviewChecklistKey,
  false
> {
  return Object.fromEntries(
    HADITH_REVIEW_CHECKLIST_FIELDS.map((field) => [field, false]),
  ) as Record<HadithReviewChecklistKey, false>;
}

export function buildTemplateRecord(
  card: DraftIslamicSourceCard,
): HadithReviewEvidenceRecord {
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

export function buildTemplateEvidenceFile(): Required<HadithReviewEvidenceFile> {
  return {
    schemaVersion: HADITH_REVIEW_EVIDENCE_SCHEMA_VERSION,
    generatedFrom: "DRAFT_ISLAMIC_SOURCE_CARDS",
    activationProofPlan: buildActivationProofPlan("hadith"),
    records: hadithDraftCards().map(buildTemplateRecord),
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

export function clearedLicenseStatus(
  value: unknown,
): value is Extract<
  IslamicSourcePackLicenseStatus,
  "licensed" | "public_domain" | "owned"
> {
  return value === "licensed" || value === "public_domain" || value === "owned";
}
