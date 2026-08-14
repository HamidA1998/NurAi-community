import type { SavedAIAnswerSummary } from "@/services/aiSavedAnswerService";
import type {
  LibraryPublicationReviewSummary,
  LibrarySourceSummary,
} from "@/services/librarySourceReviewService";
import type { ScholarReviewPacketSummary } from "@/services/scholarReviewPacketService";

export type PrivacyTrustEvidenceTone = "clear" | "attention" | "blocked";

export type PrivacyTrustDataControlRow = {
  id: string;
  title: string;
  storageLabel: string;
  evidenceLabel: string;
  controlLabel: string;
  actionLabel: string;
  routeName: string;
  icon: string;
  tone: PrivacyTrustEvidenceTone;
};

export type PrivacyTrustEvidenceRow = {
  id: string;
  title: string;
  statusLabel: string;
  detail: string;
  evidenceLabel: string;
  artifactLabel?: string;
  proofCommandLabel?: string;
  actionLabel: string;
  tone: PrivacyTrustEvidenceTone;
};

export type PrivacyTrustReleaseGateRow = {
  id: string;
  title: string;
  statusLabel: string;
  detail: string;
  evidenceRequiredLabel: string;
  proofCommandLabel: string;
  ownerActionLabel: string;
  acceptanceChecklist: string[];
  noSecretBoundaryLabel: string;
  actionLabel: string;
  routeName: string;
  icon: string;
  tone: PrivacyTrustEvidenceTone;
};

export type PrivacyTrustClaimReceiptRow = {
  id:
    | "local-trust-state"
    | "source-scholar-boundary"
    | "release-proof-boundary"
    | "library-review-boundary";
  title: string;
  publicClaimLabel: string;
  evidenceLabel: string;
  cannotClaimLabel: string;
  actionLabel: string;
  routeName: string;
  icon: string;
  tone: PrivacyTrustEvidenceTone;
};

export type PrivacyTrustClaimRiskQueueRow = {
  id:
    | "release-readiness-claim"
    | "library-publication-claim"
    | "scholar-answer-claim"
    | "local-privacy-claim";
  title: string;
  riskLabel: string;
  blockedClaimLabel: string;
  evidenceGapLabel: string;
  nextActionLabel: string;
  routeName: string;
  icon: string;
  priority: number;
  tone: PrivacyTrustEvidenceTone;
};

export type PrivacyTrustDataLifecycleItem = {
  id: "local-only" | "exportable" | "deletable" | "release-separated";
  title: string;
  detail: string;
  actionLabel: string;
  routeName: string;
  icon: string;
  tone: PrivacyTrustEvidenceTone;
};

export type PrivacyTrustDataLifecycleContract = {
  title: string;
  statusLabel: string;
  boundaryLabel: string;
  exportBoundaryLabel: string;
  deleteBoundaryLabel: string;
  releaseBoundaryLabel: string;
  items: PrivacyTrustDataLifecycleItem[];
};

export type PrivacyTrustAIHandoffReceiptRow = {
  id:
    | "context-minimization"
    | "personalization-boundary"
    | "scholar-packet-boundary"
    | "export-share-boundary";
  title: string;
  statusLabel: string;
  evidenceLabel: string;
  boundaryLabel: string;
  actionLabel: string;
  routeName: string;
  icon: string;
  tone: PrivacyTrustEvidenceTone;
};

export type PrivacyTrustAIContextFirewallRow = {
  id:
    | "active-question-context"
    | "personal-plan-context"
    | "private-note-context"
    | "sensitive-review-context";
  title: string;
  statusLabel: string;
  includedLabel: string;
  excludedLabel: string;
  actionLabel: string;
  routeName: string;
  icon: string;
  tone: PrivacyTrustEvidenceTone;
};

export type PrivacyTrustAIContextFirewall = {
  title: string;
  statusLabel: string;
  body: string;
  boundaryLabel: string;
  noSecretLabel: string;
  rows: PrivacyTrustAIContextFirewallRow[];
};

export type PrivacyTrustConsentLedgerRow = {
  id:
    | "location-permission"
    | "notification-permission"
    | "womens-health-consent"
    | "ai-personalization-consent";
  title: string;
  statusLabel: string;
  signalLabel: string;
  userControlLabel: string;
  aiUseBoundaryLabel: string;
  actionLabel: string;
  routeName: string;
  icon: string;
  tone: PrivacyTrustEvidenceTone;
};

export type PrivacyTrustConsentLedger = {
  title: string;
  statusLabel: string;
  body: string;
  boundaryLabel: string;
  noSecretLabel: string;
  rows: PrivacyTrustConsentLedgerRow[];
};

export type PrivacyTrustOperationBoundaryRow = {
  id:
    | "private-data-lane"
    | "ai-answer-reuse-lane"
    | "scholar-review-lane"
    | "release-evidence-lane";
  title: string;
  laneLabel: string;
  allowedNowLabel: string;
  heldBackLabel: string;
  nextActionLabel: string;
  routeName: string;
  icon: string;
  tone: PrivacyTrustEvidenceTone;
};

export type PrivacyTrustOperationBoundaryContract = {
  title: string;
  statusLabel: string;
  body: string;
  noSecretLabel: string;
  rows: PrivacyTrustOperationBoundaryRow[];
};

export type PrivacyTrustReviewChecklistItem = {
  id:
    | "refresh-local-signals"
    | "review-sensitive-handoffs"
    | "share-non-secret-proof"
    | "resolve-next-action";
  title: string;
  statusLabel: string;
  detail: string;
  actionLabel: string;
  routeName: string;
  icon: string;
  tone: PrivacyTrustEvidenceTone;
};

export type PrivacyTrustReviewChecklist = {
  title: string;
  statusLabel: string;
  body: string;
  boundaryLabel: string;
  noSecretLabel: string;
  items: PrivacyTrustReviewChecklistItem[];
};

export type PrivacyTrustReadinessSummary = {
  totalCount: number;
  clearCount: number;
  attentionCount: number;
  blockedCount: number;
  readinessTone: PrivacyTrustEvidenceTone;
  readinessLabel: string;
  readinessBody: string;
  releaseClaimLabel: string;
  nextActionLabel: string;
  nextActionRouteName: string;
};

export type PrivacyTrustActionPlan = {
  statusLabel: string;
  headline: string;
  body: string;
  localActionLabel: string;
  localActionRouteName: string;
  localBoundaryLabel: string;
  releaseActionLabel: string;
  releaseActionRouteName: string;
  releaseBoundaryLabel: string;
  proofBoundaryLabel: string;
  tone: PrivacyTrustEvidenceTone;
};

export type PrivacyTrustEvidencePassportRow = {
  id: "local-signals" | "claim-boundaries" | "release-proof" | "next-action";
  title: string;
  valueLabel: string;
  detail: string;
  icon: string;
  tone: PrivacyTrustEvidenceTone;
};

export type PrivacyTrustEvidencePassport = {
  title: string;
  statusLabel: string;
  summaryLabel: string;
  localClaimLabel: string;
  releaseClaimLabel: string;
  nextActionLabel: string;
  nextActionRouteName: string;
  boundaryLabel: string;
  noSecretLabel: string;
  shareTitle: string;
  shareText: string;
  rows: PrivacyTrustEvidencePassportRow[];
};

export const AI_SOURCE_PACK_HANDOFF_ARTIFACT =
  "docs/audit/AI_SOURCE_PACK_REVIEW_HANDOFF.md";

export const AI_SOURCE_PACK_HANDOFF_PROOF_COMMAND =
  "npm run export:source-pack-review-handoff -- --check --summary-json";
export const AI_SOURCE_PACK_FINAL_READINESS_PROOF_COMMAND =
  "npm run check:source-pack-final-readiness -- --summary-json --tafsir-file /absolute/path/to/tafsir-source-pack.json --hadith-file /absolute/path/to/hadith-source-pack.json --fiqh-file /absolute/path/to/fiqh-source-pack.json --seerah-file /absolute/path/to/seerah-source-pack.json";

export const AI_SOURCE_PACK_HANDOFF_DRAFT_CARDS = 32;
export const AI_SOURCE_PACK_HANDOFF_VERIFIED_CARDS = 0;
export const AI_SOURCE_PACK_HANDOFF_ACTIVATION_READY_DOMAINS = 0;
export const AI_SOURCE_PACK_HANDOFF_DRAFT_LABEL = "32 draft cards";
export const AI_SOURCE_PACK_HANDOFF_VERIFIED_LABEL = "0 verified cards";
export const AI_SOURCE_PACK_HANDOFF_ACTIVATION_READY_LABEL =
  "0 activation-ready domains";

function pluralize(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function sourceCoveragePercent(summary: LibrarySourceSummary) {
  if (summary.totalSources === 0) return 0;
  return Math.round((summary.verifiedSources / summary.totalSources) * 100);
}

function countTone(
  rows: { tone: PrivacyTrustEvidenceTone }[],
  tone: PrivacyTrustEvidenceTone,
) {
  return rows.filter((row) => row.tone === tone).length;
}

export function buildPrivacyTrustDataControlRows(params: {
  appLockEnabled: boolean;
  hasOnboardingPreferences: boolean;
  quranReflectionNotesCount: number;
  weeklyReflectionNotesCount: number;
  reviewSummary: ScholarReviewPacketSummary;
  savedAnswerSummary: SavedAIAnswerSummary;
  sourceSummary: LibrarySourceSummary;
}): PrivacyTrustDataControlRow[] {
  const {
    appLockEnabled,
    hasOnboardingPreferences,
    quranReflectionNotesCount,
    weeklyReflectionNotesCount,
    reviewSummary,
    savedAnswerSummary,
    sourceSummary,
  } = params;

  return [
    {
      id: "private-quran-reflections",
      title: "Quran reflection notes",
      storageLabel: "On-device private notes",
      evidenceLabel:
        quranReflectionNotesCount > 0
          ? `${quranReflectionNotesCount} note${quranReflectionNotesCount === 1 ? "" : "s"} saved locally`
          : "No private notes saved yet",
      controlLabel: "Export or remove through private backup controls.",
      actionLabel: "Open backup",
      routeName: "Settings",
      icon: "edit-3",
      tone: "clear",
    },
    {
      id: "weekly-growth-reflections",
      title: "Weekly growth reflections",
      storageLabel: "Private weekly notes",
      evidenceLabel:
        weeklyReflectionNotesCount > 0
          ? `${weeklyReflectionNotesCount} weekly note${weeklyReflectionNotesCount === 1 ? "" : "s"} saved locally`
          : "No weekly reflections saved yet",
      controlLabel:
        "Export or delete weekly reflections from the Trust Center.",
      actionLabel: "Open controls",
      routeName: "Settings",
      icon: "file-text",
      tone: "clear",
    },
    {
      id: "saved-ai-answers",
      title: "Saved AI answers",
      storageLabel: "On-device answer library",
      evidenceLabel:
        savedAnswerSummary.total > 0
          ? `${savedAnswerSummary.total} saved, ${savedAnswerSummary.needsSourceReview} need source review`
          : "No saved AI answers",
      controlLabel: "Review source gaps before reusing an answer.",
      actionLabel: "Open answers",
      routeName: "Settings",
      icon: "bookmark",
      tone:
        savedAnswerSummary.needsSourceReview > 0 ||
        savedAnswerSummary.scholarReviewRecommended > 0
          ? "attention"
          : "clear",
    },
    {
      id: "scholar-review-packets",
      title: "Scholar review packets",
      storageLabel: "Local review queue",
      evidenceLabel:
        reviewSummary.total > 0
          ? `${reviewSummary.total} packet(s), ${reviewSummary.needsIntake} need intake`
          : "No sensitive packets waiting",
      controlLabel: "Share only when ready; keep educational boundary visible.",
      actionLabel: "Open packets",
      routeName: "Settings",
      icon: "award",
      tone:
        reviewSummary.needsIntake > 0
          ? "blocked"
          : reviewSummary.readyForScholar > 0
            ? "attention"
            : "clear",
    },
    {
      id: "personalization-profile",
      title: "Personal NurAI plan",
      storageLabel: "On-device preferences",
      evidenceLabel: hasOnboardingPreferences
        ? "Goal, learning, and trust preferences saved"
        : "Personal plan not set",
      controlLabel: "Update preferences before relying on personalization.",
      actionLabel: "Open settings",
      routeName: "Settings",
      icon: "sliders",
      tone: hasOnboardingPreferences ? "clear" : "attention",
    },
    {
      id: "app-lock-backup",
      title: "App lock and backup",
      storageLabel: "Device security controls",
      evidenceLabel: appLockEnabled
        ? "App Lock protected"
        : "App Lock available",
      controlLabel:
        "Enable lock, export backup, or delete account from Settings.",
      actionLabel: "Open settings",
      routeName: "Settings",
      icon: appLockEnabled ? "lock" : "unlock",
      tone: appLockEnabled ? "clear" : "attention",
    },
    {
      id: "library-source-controls",
      title: "Library source controls",
      storageLabel: "In-app source metadata",
      evidenceLabel: `${sourceSummary.verifiedSources}/${sourceSummary.totalSources} source cards verified`,
      controlLabel: "Keep source review pending where evidence is incomplete.",
      actionLabel: "Open source review",
      routeName: "LibrarySourceReview",
      icon: sourceSummary.needsFix > 0 ? "alert-triangle" : "shield",
      tone:
        sourceSummary.needsFix > 0
          ? "blocked"
          : sourceSummary.readyForReview > 0
            ? "attention"
            : "clear",
    },
  ];
}

export function buildPrivacyTrustEvidenceRows(params: {
  sourceSummary: LibrarySourceSummary;
  publicationSummary: LibraryPublicationReviewSummary;
  reviewSummary: ScholarReviewPacketSummary;
  savedAnswerSummary: SavedAIAnswerSummary;
}): PrivacyTrustEvidenceRow[] {
  const {
    publicationSummary,
    reviewSummary,
    savedAnswerSummary,
    sourceSummary,
  } = params;
  const sourceCoverage = sourceCoveragePercent(sourceSummary);
  const allBooksHavePublicationEvidence =
    publicationSummary.booksMissingEvidence === 0;
  const savedAnswersNeedReview =
    savedAnswerSummary.needsSourceReview > 0 ||
    savedAnswerSummary.scholarReviewRecommended > 0;

  return [
    {
      id: "ai-source-pack-handoff",
      title: "AI source pack handoff",
      statusLabel: "Review evidence pending",
      detail: `${AI_SOURCE_PACK_HANDOFF_DRAFT_LABEL}, ${AI_SOURCE_PACK_HANDOFF_VERIFIED_LABEL}, ${AI_SOURCE_PACK_HANDOFF_ACTIVATION_READY_LABEL}. Source packs stay inactive until real review evidence is attached.`,
      evidenceLabel:
        "Draft source packs are reviewer handoff material, not human or scholar review evidence.",
      artifactLabel: AI_SOURCE_PACK_HANDOFF_ARTIFACT,
      proofCommandLabel: AI_SOURCE_PACK_HANDOFF_PROOF_COMMAND,
      actionLabel: "Run export check",
      tone: "blocked",
    },
    {
      id: "library-source-coverage",
      title: "Library source coverage",
      statusLabel:
        sourceSummary.needsFix > 0
          ? "Needs source fixes"
          : sourceSummary.readyForReview > 0
            ? "Ready for source review"
            : "Source cards attached",
      detail: `${sourceSummary.verifiedSources}/${sourceSummary.totalSources} source cards verified across ${sourceSummary.totalChapters} chapters.`,
      evidenceLabel: `${sourceCoverage}% verified, ${sourceSummary.scholarReviewRecommended} high-care chapter(s) flagged`,
      actionLabel: "Open source review",
      tone:
        sourceSummary.needsFix > 0
          ? "blocked"
          : sourceSummary.readyForReview > 0
            ? "attention"
            : "clear",
    },
    {
      id: "publication-evidence",
      title: "Publication evidence",
      statusLabel: allBooksHavePublicationEvidence
        ? "Evidence complete"
        : "Review evidence pending",
      detail: `${publicationSummary.publishedBooks}/${publicationSummary.totalBooks} books have complete publication approval evidence recorded.`,
      evidenceLabel: `${publicationSummary.booksMissingEvidence} book(s) still need review evidence; ${publicationSummary.qualifiedScholarPending} qualified scholar item(s) pending.`,
      actionLabel: "Keep claims pending",
      tone: allBooksHavePublicationEvidence ? "clear" : "blocked",
    },
    {
      id: "scholar-packet-handoff",
      title: "Scholar packet handoff",
      statusLabel: reviewSummary.nextHandoffLabel,
      detail: `${reviewSummary.total} packet(s): ${reviewSummary.readyForScholar} ready, ${reviewSummary.needsIntake} need intake, ${reviewSummary.reviewed} reviewed.`,
      evidenceLabel: `${reviewSummary.highCare} high-care packet(s), oldest ready ${reviewSummary.oldestReadyAgeDays} day(s).`,
      actionLabel: "Open review packets",
      tone:
        reviewSummary.needsIntake > 0
          ? "blocked"
          : reviewSummary.readyForScholar > 0
            ? "attention"
            : "clear",
    },
    {
      id: "saved-answer-source-gaps",
      title: "Saved answer source gaps",
      statusLabel: savedAnswersNeedReview
        ? "Follow-up review needed"
        : "No saved gaps waiting",
      detail: `${savedAnswerSummary.total} saved answer(s), ${savedAnswerSummary.sourceAware} with source-aware status.`,
      evidenceLabel: `${savedAnswerSummary.needsSourceReview} need source review, ${savedAnswerSummary.scholarReviewRecommended} recommend scholar review.`,
      actionLabel: "Open saved answers",
      tone: savedAnswersNeedReview ? "attention" : "clear",
    },
  ];
}

export function buildPrivacyTrustReleaseGateRows(params: {
  publicationSummary: LibraryPublicationReviewSummary;
}): PrivacyTrustReleaseGateRow[] {
  const { publicationSummary } = params;
  const libraryEvidenceBlocked =
    publicationSummary.booksMissingEvidence > 0 ||
    publicationSummary.qualifiedScholarPending > 0;

  return [
    {
      id: "deployed-runtime-proof",
      title: "Deployed AI runtime proof",
      statusLabel: "External proof required",
      detail:
        "Production launch needs the real HTTPS server to pass AI status, admin 401, and deployed smoke checks.",
      evidenceRequiredLabel:
        "Run check:ai-release:deployed against the live host, then record redacted evidence.",
      proofCommandLabel:
        "NURAI_DEPLOYMENT_URL=https://... npm run check:ai-release:deployed",
      ownerActionLabel:
        "Deploy the latest server, set production secrets in the host, then export a redacted command result.",
      acceptanceChecklist: [
        "Proof notes name the exact production HTTPS host without exposing secrets.",
        "Status, diagnostics, smoke, and release-blocker command results are represented.",
      ],
      noSecretBoundaryLabel:
        "Do not record smoke secrets, OpenAI keys, session secrets, headers, cookies, or private account payloads.",
      actionLabel: "Open showcase",
      routeName: "AppStoreShowcase",
      icon: "cloud",
      tone: "blocked",
    },
    {
      id: "production-database-proof",
      title: "Production database proof",
      statusLabel: "Database proof required",
      detail:
        "Release needs the real production Postgres target, checked migrations, and ownership checks to pass.",
      evidenceRequiredLabel:
        "Use DATABASE_URL only in the release shell; never paste it into notes, screenshots, or committed files.",
      proofCommandLabel:
        "DATABASE_URL=postgresql://... npm run check:production-db-target -- --json",
      ownerActionLabel:
        "Verify the production target, run guarded migrations, then record non-secret proof output.",
      acceptanceChecklist: [
        "Target check passes before any migration apply result is accepted.",
        "Dry-run, apply, release, ownership, migration-applied, and blocker results are represented.",
      ],
      noSecretBoundaryLabel:
        "Do not record the DATABASE_URL, database password, service role key, private SQL, or connection strings.",
      actionLabel: "Open showcase",
      routeName: "AppStoreShowcase",
      icon: "database",
      tone: "blocked",
    },
    {
      id: "source-pack-activation-proof",
      title: "AI source pack activation proof",
      statusLabel: "Activation proof required",
      detail: `${AI_SOURCE_PACK_HANDOFF_DRAFT_LABEL}, ${AI_SOURCE_PACK_HANDOFF_VERIFIED_LABEL}, ${AI_SOURCE_PACK_HANDOFF_ACTIVATION_READY_LABEL}. AI source packs must stay inactive until final readiness passes with real reviewed files.`,
      evidenceRequiredLabel:
        "Attach reviewed tafsir, hadith, fiqh, and seerah source-pack files, then record redacted final readiness output.",
      proofCommandLabel: AI_SOURCE_PACK_FINAL_READINESS_PROOF_COMMAND,
      ownerActionLabel:
        "Have source, licensing, and qualified Islamic content reviewers approve the real files before activation.",
      acceptanceChecklist: [
        "Final readiness passes for tafsir, hadith, fiqh, and seerah packs using reviewed non-placeholder files.",
        "Reviewer approval, licensing status, source provenance, and activation decision are recorded outside generated handoff text.",
      ],
      noSecretBoundaryLabel:
        "Do not record private reviewer contacts, unpublished licensed text, vendor credentials, or claim draft handoff packets as activation evidence.",
      actionLabel: "Open source review",
      routeName: "LibrarySourceReview",
      icon: "file-check",
      tone: "blocked",
    },
    {
      id: "library-human-review-proof",
      title: "Library human review proof",
      statusLabel: libraryEvidenceBlocked
        ? "Human evidence pending"
        : "Review evidence attached",
      detail: libraryEvidenceBlocked
        ? `${publicationSummary.booksMissingEvidence} book(s) still need complete review evidence; ${publicationSummary.qualifiedScholarPending} qualified scholar item(s) pending.`
        : "Library publication metadata has complete review evidence for the current content state.",
      evidenceRequiredLabel: libraryEvidenceBlocked
        ? "Import real editorial, source, quality-checklist, publish, and scholar evidence before stronger claims."
        : "Keep reviewer names, dates, content hashes, and quality checklist evidence current.",
      proofCommandLabel:
        "npm run validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --summary-json",
      ownerActionLabel: libraryEvidenceBlocked
        ? "Collect reviewer names, dates, notes, quality checklist decisions, and current content hashes outside the repo."
        : "Re-run the evidence validator after any Library content change.",
      acceptanceChecklist: libraryEvidenceBlocked
        ? [
            "Reviewer identity, role, date, notes, checklist decisions, and current content hash are present.",
            "Generated packets and handoff text stay separate from human approval evidence.",
          ]
        : [
            "Strict Library evidence validation still passes for the current content hashes.",
            "Release claims stay scoped to the books with imported review evidence.",
          ],
      noSecretBoundaryLabel:
        "Do not record private reviewer contact details, unpublished private notes, or claim generated packets as approval.",
      actionLabel: "Open source review",
      routeName: "LibrarySourceReview",
      icon: "award",
      tone: libraryEvidenceBlocked ? "blocked" : "clear",
    },
  ];
}

export function buildPrivacyTrustDataLifecycleContract(params: {
  hasPersonalPlan: boolean;
  weeklyReflectionCount: number;
  savedAnswerCount: number;
  reviewPacketCount: number;
  releaseGateBlockedCount: number;
}): PrivacyTrustDataLifecycleContract {
  const {
    hasPersonalPlan,
    releaseGateBlockedCount,
    reviewPacketCount,
    savedAnswerCount,
    weeklyReflectionCount,
  } = params;
  const personalPlanLabel = hasPersonalPlan
    ? "a personal plan"
    : "no personal plan";
  const savedAnswerLabel = pluralize(savedAnswerCount, "saved AI answer");
  const reviewPacketLabel = pluralize(reviewPacketCount, "review packet");
  const weeklyReflectionLabel = pluralize(
    weeklyReflectionCount,
    "weekly reflection",
  );

  return {
    title: "Data lifecycle contract",
    statusLabel:
      releaseGateBlockedCount > 0
        ? "Local controls before launch claims"
        : "Export/delete controls visible",
    boundaryLabel:
      "This dashboard describes data lifecycle controls; it is not deployed-runtime, production-database, source-pack activation, or human-review proof.",
    exportBoundaryLabel:
      "Exports are user-controlled snapshots and may include personal notes; review before sharing.",
    deleteBoundaryLabel:
      "Delete actions remove supported local data on this device; they do not erase external accounts or production backups.",
    releaseBoundaryLabel:
      "Release proof still requires deployed runtime, production database, AI source-pack activation, and human review evidence.",
    items: [
      {
        id: "local-only",
        title: "Local-only by default",
        detail: `NurAI currently sees ${personalPlanLabel}, ${weeklyReflectionLabel}, ${savedAnswerLabel}, and ${reviewPacketLabel} in local trust surfaces unless you export or share them.`,
        actionLabel: "Review controls",
        routeName: "Settings",
        icon: "smartphone",
        tone: "clear",
      },
      {
        id: "exportable",
        title: "Exportable snapshots",
        detail:
          "Personal plan and weekly reflection exports are manual snapshots, so the user can inspect them before sending anything outside NurAI.",
        actionLabel: "Open exports",
        routeName: "Settings",
        icon: "download",
        tone:
          hasPersonalPlan || weeklyReflectionCount > 0 ? "attention" : "clear",
      },
      {
        id: "deletable",
        title: "Deletable local notes",
        detail:
          "Supported local reset and delete actions are scoped so personal plan data and weekly reflections can be removed without claiming external erasure.",
        actionLabel: "Open deletes",
        routeName: "Settings",
        icon: "trash-2",
        tone: "clear",
      },
      {
        id: "release-separated",
        title: "Release proof stays separate",
        detail:
          releaseGateBlockedCount > 0
            ? `${releaseGateBlockedCount} release proof gate(s) remain blocked, so local privacy controls must not be used as launch proof.`
            : "Local privacy controls are visible, but production runtime, database, source-pack activation, and human review proof still need current evidence.",
        actionLabel: "Open proof",
        routeName: "AppStoreShowcase",
        icon: "shield",
        tone: releaseGateBlockedCount > 0 ? "blocked" : "attention",
      },
    ],
  };
}

export function buildPrivacyTrustDataLifecycleShareText(
  contract: PrivacyTrustDataLifecycleContract,
) {
  const itemLines = contract.items
    .map(
      (item) =>
        `- ${item.title}: ${item.detail} Next action: ${item.actionLabel}.`,
    )
    .join("\n");

  return [
    "NurAI data lifecycle receipt",
    `Status: ${contract.statusLabel}`,
    `Boundary: ${contract.boundaryLabel}`,
    "",
    "Local data lanes:",
    itemLines,
    "",
    `Export boundary: ${contract.exportBoundaryLabel}`,
    `Delete boundary: ${contract.deleteBoundaryLabel}`,
    `Release boundary: ${contract.releaseBoundaryLabel}`,
    "",
    "No-secret boundary: Do not include API keys, database URLs, smoke secrets, cookies, headers, private review contacts, or pasted personal notes in this receipt.",
    "This receipt is a local data-control summary only. It is not external account deletion proof, production deployment proof, source-pack activation proof, or scholar-review evidence.",
  ].join("\n");
}

export function buildPrivacyTrustAIHandoffReceiptRows(params: {
  hasPersonalPlan: boolean;
  quranReflectionNotesCount: number;
  weeklyReflectionCount: number;
  savedAnswerCount: number;
  reviewPacketCount: number;
  reviewPacketsNeedingIntake: number;
}): PrivacyTrustAIHandoffReceiptRow[] {
  const {
    hasPersonalPlan,
    quranReflectionNotesCount,
    reviewPacketCount,
    reviewPacketsNeedingIntake,
    savedAnswerCount,
    weeklyReflectionCount,
  } = params;
  const privateNoteCount = quranReflectionNotesCount + weeklyReflectionCount;

  return [
    {
      id: "context-minimization",
      title: "AI context minimization",
      statusLabel: "Question first",
      evidenceLabel: `${pluralize(savedAnswerCount, "saved answer")} visible for review; private notes are not attached by this dashboard.`,
      boundaryLabel:
        "AI help should use the active question, selected feature context, and source status before adding personal history.",
      actionLabel: "Open saved answers",
      routeName: "Settings",
      icon: "filter",
      tone: savedAnswerCount > 0 ? "attention" : "clear",
    },
    {
      id: "personalization-boundary",
      title: "Personalization boundary",
      statusLabel: hasPersonalPlan ? "Plan can guide tone" : "No plan loaded",
      evidenceLabel: hasPersonalPlan
        ? "Personal plan exists as on-device preferences, not a religious ruling."
        : "No personal plan is currently available to guide AI tone or daily focus.",
      boundaryLabel:
        "Personalization may shape learning nudges, but it must not become scholar approval, medical advice, or release proof.",
      actionLabel: "Open controls",
      routeName: "Settings",
      icon: "sliders",
      tone: hasPersonalPlan ? "clear" : "attention",
    },
    {
      id: "scholar-packet-boundary",
      title: "Scholar packet boundary",
      statusLabel:
        reviewPacketCount > 0
          ? `${pluralize(reviewPacketCount, "packet")} saved`
          : "No packets waiting",
      evidenceLabel:
        reviewPacketsNeedingIntake > 0
          ? `${pluralize(reviewPacketsNeedingIntake, "packet")} still need intake before sharing.`
          : "Sensitive packets keep source status, missing context, and educational boundaries visible.",
      boundaryLabel:
        "Sensitive questions should become review packets for a qualified human reviewer, not casual AI verdicts.",
      actionLabel: "Open packets",
      routeName: "Settings",
      icon: "award",
      tone:
        reviewPacketsNeedingIntake > 0
          ? "blocked"
          : reviewPacketCount > 0
            ? "attention"
            : "clear",
    },
    {
      id: "export-share-boundary",
      title: "Export and share boundary",
      statusLabel:
        privateNoteCount > 0
          ? `${pluralize(privateNoteCount, "private note")} local`
          : "No private notes",
      evidenceLabel:
        "Exports are manual snapshots through the share sheet; review them before sending outside NurAI.",
      boundaryLabel:
        "Deleting local notes on this device does not erase screenshots, external shares, production backups, or reviewer copies.",
      actionLabel: "Open exports",
      routeName: "Settings",
      icon: "share-2",
      tone: privateNoteCount > 0 ? "attention" : "clear",
    },
  ];
}

export function buildPrivacyTrustAIContextFirewall(params: {
  hasPersonalPlan: boolean;
  quranReflectionNotesCount: number;
  weeklyReflectionCount: number;
  savedAnswerCount: number;
  savedAnswersNeedingReview: number;
  reviewPacketCount: number;
  reviewPacketsNeedingIntake: number;
}): PrivacyTrustAIContextFirewall {
  const {
    hasPersonalPlan,
    quranReflectionNotesCount,
    reviewPacketCount,
    reviewPacketsNeedingIntake,
    savedAnswerCount,
    savedAnswersNeedingReview,
    weeklyReflectionCount,
  } = params;
  const privateNoteCount = quranReflectionNotesCount + weeklyReflectionCount;
  const needsReviewCount =
    savedAnswersNeedingReview + reviewPacketsNeedingIntake;
  const activeLaneCount = [
    hasPersonalPlan,
    privateNoteCount > 0,
    savedAnswerCount > 0,
    reviewPacketCount > 0,
  ].filter(Boolean).length;

  return {
    title: "AI context firewall",
    statusLabel:
      needsReviewCount > 0
        ? `${pluralize(needsReviewCount, "context item")} needs review`
        : activeLaneCount > 0
          ? `${activeLaneCount} context lane${activeLaneCount === 1 ? "" : "s"} visible`
          : "Question-only by default",
    body: "Before NurAI answers, this firewall shows which context can guide the response, which private data stays out by default, and where sensitive context must be reviewed first.",
    boundaryLabel:
      "NurAI should use the active question and explicit feature context first; private notes, health data, location, and sensitive review packets need intentional user action.",
    noSecretLabel:
      "Never paste private notes, health details, API keys, cookies, database URLs, reviewer contacts, or production evidence into an AI prompt.",
    rows: [
      {
        id: "active-question-context",
        title: "Active question context",
        statusLabel: "Allowed by default",
        includedLabel:
          "Current question, selected screen, source status, and answer mode can guide the response.",
        excludedLabel:
          "Background notes, location, health data, and saved history are not assumed from this dashboard.",
        actionLabel: "Ask with sources",
        routeName: "GlobalSearch",
        icon: "message-circle",
        tone: "clear",
      },
      {
        id: "personal-plan-context",
        title: "Personal plan context",
        statusLabel: hasPersonalPlan ? "Available with consent" : "No plan set",
        includedLabel: hasPersonalPlan
          ? "Goal, learning level, trust preference, and daily path can shape tone and next steps."
          : "No onboarding plan is available, so NurAI should stay general and source-first.",
        excludedLabel:
          "A personal plan is not scholar approval, medical advice, family consent, or release proof.",
        actionLabel: hasPersonalPlan ? "Review plan" : "Set plan",
        routeName: hasPersonalPlan ? "Settings" : "Settings",
        icon: "sliders",
        tone: hasPersonalPlan ? "attention" : "clear",
      },
      {
        id: "private-note-context",
        title: "Private notes context",
        statusLabel:
          privateNoteCount > 0
            ? `${pluralize(privateNoteCount, "private note")} protected`
            : "No private notes",
        includedLabel:
          "Weekly reflections and Quran notes stay local unless the user exports or intentionally brings them into a feature.",
        excludedLabel:
          "Private notes are not silently added to AI prompts, review packets, screenshots, or release evidence.",
        actionLabel: "Open controls",
        routeName: "Settings",
        icon: "lock",
        tone: privateNoteCount > 0 ? "attention" : "clear",
      },
      {
        id: "sensitive-review-context",
        title: "Sensitive review context",
        statusLabel:
          reviewPacketsNeedingIntake > 0
            ? `${pluralize(reviewPacketsNeedingIntake, "packet")} need intake`
            : reviewPacketCount > 0
              ? `${pluralize(reviewPacketCount, "packet")} visible`
              : savedAnswersNeedingReview > 0
                ? `${pluralize(savedAnswersNeedingReview, "saved answer")} need review`
                : "No sensitive queue",
        includedLabel:
          "Saved answers and scholar review packets can show source gaps, uncertainty, and missing context for review.",
        excludedLabel:
          "Sensitive questions must not become final rulings or public trust claims without qualified human review.",
        actionLabel:
          reviewPacketCount > 0 ? "Open packets" : "Open saved answers",
        routeName: reviewPacketCount > 0 ? "Settings" : "Settings",
        icon: "shield",
        tone:
          reviewPacketsNeedingIntake > 0
            ? "blocked"
            : savedAnswersNeedingReview > 0 || reviewPacketCount > 0
              ? "attention"
              : "clear",
      },
    ],
  };
}

export function buildPrivacyTrustConsentLedger(params: {
  hasSavedLocation: boolean;
  locationSourceLabel: string;
  locationPermissionLabel: string;
  notificationPermissionLabel: string;
  notificationSettingsSaved: boolean;
  enabledNotificationCategoryCount: number;
  smartNuraiRemindersEnabled: boolean;
  womensHealthConsentGiven: boolean;
  hasPersonalPlan: boolean;
}): PrivacyTrustConsentLedger {
  const {
    enabledNotificationCategoryCount,
    hasPersonalPlan,
    hasSavedLocation,
    locationPermissionLabel,
    locationSourceLabel,
    notificationPermissionLabel,
    notificationSettingsSaved,
    smartNuraiRemindersEnabled,
    womensHealthConsentGiven,
  } = params;
  const locationPermissionGranted = /granted/i.test(locationPermissionLabel);
  const notificationPermissionGranted = /granted/i.test(
    notificationPermissionLabel,
  );
  const attentionCount = [
    hasSavedLocation && locationPermissionGranted,
    notificationPermissionGranted || enabledNotificationCategoryCount > 0,
    womensHealthConsentGiven,
    hasPersonalPlan,
  ].filter(Boolean).length;

  return {
    title: "Consent and permission ledger",
    statusLabel:
      attentionCount > 0
        ? `${attentionCount} consent lane${attentionCount === 1 ? "" : "s"} active`
        : "No optional consent lanes active",
    body: "Device permissions and sensitive feature consent stay visible before NurAI uses location, reminders, health data, or personalization context.",
    boundaryLabel:
      "Consent here is a user-control ledger, not a claim that data was uploaded, externally deleted, or reviewed by a scholar.",
    noSecretLabel:
      "Do not put private locations, health details, push tokens, database URLs, API keys, or personal notes into proof screenshots.",
    rows: [
      {
        id: "location-permission",
        title: "Location for prayer accuracy",
        statusLabel: hasSavedLocation
          ? `Saved ${locationSourceLabel}`
          : "Default city fallback",
        signalLabel: `Permission: ${locationPermissionLabel}`,
        userControlLabel:
          "Change saved city or GPS permission before relying on prayer-time personalization.",
        aiUseBoundaryLabel:
          "Location should guide prayer, Qibla, mosque, and travel features; it should not be silently added to unrelated AI prompts.",
        actionLabel: "Open prayer",
        routeName: "PrayerTimes",
        icon: "map-pin",
        tone: hasSavedLocation
          ? locationPermissionGranted
            ? "attention"
            : "clear"
          : "attention",
      },
      {
        id: "notification-permission",
        title: "Notification permission",
        statusLabel: notificationPermissionGranted
          ? `${enabledNotificationCategoryCount} reminder type${enabledNotificationCategoryCount === 1 ? "" : "s"} active`
          : "Permission not granted",
        signalLabel: notificationSettingsSaved
          ? `Settings saved; smart NurAI reminders ${smartNuraiRemindersEnabled ? "on" : "off"}`
          : "No saved notification settings",
        userControlLabel:
          "Use Notification Settings to enable, quiet, or disable reminders without changing learning data.",
        aiUseBoundaryLabel:
          "Smart reminders may suggest daily actions, but they must not expose private notes or sensitive religious questions.",
        actionLabel: "Open reminders",
        routeName: "NotificationSettings",
        icon: "bell",
        tone: notificationPermissionGranted ? "attention" : "clear",
      },
      {
        id: "womens-health-consent",
        title: "Women's health consent",
        statusLabel: womensHealthConsentGiven
          ? "Consent recorded"
          : "Consent not given",
        signalLabel: womensHealthConsentGiven
          ? "Sensitive health tools are unlocked locally"
          : "Sensitive health tools remain gated",
        userControlLabel:
          "Open Women's Health to review consent, settings, and local data controls.",
        aiUseBoundaryLabel:
          "Health-cycle data must stay out of general AI answers unless the user intentionally opens that feature context.",
        actionLabel: "Open health",
        routeName: "WomensHealth",
        icon: "heart",
        tone: womensHealthConsentGiven ? "attention" : "clear",
      },
      {
        id: "ai-personalization-consent",
        title: "AI personalization consent",
        statusLabel: hasPersonalPlan ? "Personal plan active" : "No plan set",
        signalLabel: hasPersonalPlan
          ? "Goal, learning, Arabic, prayer, and trust preferences can shape tone"
          : "NurAI should answer without personal-plan context",
        userControlLabel:
          "Export or reset the personal plan from this dashboard whenever the user wants a clean slate.",
        aiUseBoundaryLabel:
          "Personalization can guide learning nudges; it must not become a fatwa, scholar approval, medical advice, or release proof.",
        actionLabel: "Review plan",
        routeName: "Settings",
        icon: "sliders",
        tone: hasPersonalPlan ? "attention" : "clear",
      },
    ],
  };
}

export function buildPrivacyTrustOperationBoundaryContract(params: {
  hasPersonalPlan: boolean;
  quranReflectionNotesCount: number;
  weeklyReflectionCount: number;
  savedAnswerCount: number;
  savedAnswersNeedingReview: number;
  reviewPacketCount: number;
  reviewPacketsNeedingIntake: number;
  releaseGateBlockedCount: number;
}): PrivacyTrustOperationBoundaryContract {
  const {
    hasPersonalPlan,
    quranReflectionNotesCount,
    releaseGateBlockedCount,
    reviewPacketCount,
    reviewPacketsNeedingIntake,
    savedAnswerCount,
    savedAnswersNeedingReview,
    weeklyReflectionCount,
  } = params;
  const privateNoteCount = quranReflectionNotesCount + weeklyReflectionCount;
  const attentionCount = [
    hasPersonalPlan || privateNoteCount > 0,
    savedAnswerCount > 0,
    reviewPacketCount > 0,
  ].filter(Boolean).length;
  const blockedCount = [
    savedAnswersNeedingReview > 0,
    reviewPacketsNeedingIntake > 0,
    releaseGateBlockedCount > 0,
  ].filter(Boolean).length;

  return {
    title: "Trust operation boundary",
    statusLabel:
      blockedCount > 0
        ? `${blockedCount} lane${blockedCount === 1 ? "" : "s"} held back`
        : attentionCount > 0
          ? "Trust lanes need review"
          : "Trust lanes clear",
    body: "Each lane shows what a user can safely do now, what NurAI holds back, and the next place to resolve trust work.",
    noSecretLabel:
      "Operation notes must not include keys, database URLs, private review contacts, cookies, headers, or pasted personal notes.",
    rows: [
      {
        id: "private-data-lane",
        title: "Private data lane",
        laneLabel:
          hasPersonalPlan || privateNoteCount > 0
            ? "Local data present"
            : "No local notes",
        allowedNowLabel:
          "Export personal plan and weekly reflections through manual share sheets.",
        heldBackLabel:
          "Private Quran and reflection notes are not silently attached to AI prompts, release proof, or reviewer packets.",
        nextActionLabel: "Open controls",
        routeName: "Settings",
        icon: "lock",
        tone: hasPersonalPlan || privateNoteCount > 0 ? "attention" : "clear",
      },
      {
        id: "ai-answer-reuse-lane",
        title: "AI answer reuse lane",
        laneLabel:
          savedAnswerCount > 0
            ? pluralize(savedAnswerCount, "saved answer")
            : "No saved answers",
        allowedNowLabel:
          "Saved answers can be reopened for learning context and follow-up planning.",
        heldBackLabel:
          savedAnswersNeedingReview > 0
            ? `${pluralize(savedAnswersNeedingReview, "answer")} need source or scholar review before stronger reuse.`
            : "Saved answers still keep source state visible before being reused.",
        nextActionLabel: "Open answers",
        routeName: "Settings",
        icon: "bookmark",
        tone: savedAnswersNeedingReview > 0 ? "attention" : "clear",
      },
      {
        id: "scholar-review-lane",
        title: "Scholar review lane",
        laneLabel:
          reviewPacketCount > 0
            ? pluralize(reviewPacketCount, "packet")
            : "No packets",
        allowedNowLabel:
          "Sensitive packets can be inspected locally with missing context and source status visible.",
        heldBackLabel:
          reviewPacketsNeedingIntake > 0
            ? `${pluralize(reviewPacketsNeedingIntake, "packet")} need intake before sharing or stronger wording.`
            : "Review packets remain educational handoff material until a qualified human review is recorded.",
        nextActionLabel: "Open packets",
        routeName: "Settings",
        icon: "award",
        tone:
          reviewPacketsNeedingIntake > 0
            ? "blocked"
            : reviewPacketCount > 0
              ? "attention"
              : "clear",
      },
      {
        id: "release-evidence-lane",
        title: "Release evidence lane",
        laneLabel:
          releaseGateBlockedCount > 0
            ? `${releaseGateBlockedCount} gate${releaseGateBlockedCount === 1 ? "" : "s"} blocked`
            : "No blocked gates",
        allowedNowLabel:
          "The release cockpit can point owners to redacted runtime, database, source-pack, and Library evidence checks.",
        heldBackLabel:
          releaseGateBlockedCount > 0
            ? "Local privacy signals cannot clear deployed runtime, production database, source-pack activation, or human review gates."
            : "Current proof still needs to stay attached to the exact build, host, database target, source packs, and content state.",
        nextActionLabel: "Open proof",
        routeName: "AppStoreShowcase",
        icon: "shield",
        tone: releaseGateBlockedCount > 0 ? "blocked" : "attention",
      },
    ],
  };
}

export function buildPrivacyTrustReviewChecklist(params: {
  readinessSummary: PrivacyTrustReadinessSummary;
  releaseGateRows: PrivacyTrustReleaseGateRow[];
  aiHandoffReceiptRows: PrivacyTrustAIHandoffReceiptRow[];
}): PrivacyTrustReviewChecklist {
  const { aiHandoffReceiptRows, readinessSummary, releaseGateRows } = params;
  const blockedReleaseGateCount = countTone(releaseGateRows, "blocked");
  const sensitiveHandoffCount = aiHandoffReceiptRows.filter(
    (row) =>
      row.id === "scholar-packet-boundary" ||
      row.id === "export-share-boundary",
  ).length;
  const firstBlockedReleaseGate = releaseGateRows.find(
    (row) => row.tone === "blocked",
  );

  return {
    title: "Trust review checklist",
    statusLabel:
      readinessSummary.readinessTone === "blocked" ||
      blockedReleaseGateCount > 0
        ? "Review before stronger claims"
        : readinessSummary.readinessTone === "attention"
          ? "Review language carefully"
          : "Local checklist clear",
    body: "Use this quick checklist before relying on AI answers, sharing proof, or presenting NurAI as ready for stronger public trust claims.",
    boundaryLabel:
      "This checklist is a review rhythm for local trust surfaces; it does not replace source review, scholar review, source-pack activation, deployed runtime proof, or production database proof.",
    noSecretLabel:
      "Checklist notes must stay non-secret: no keys, database URLs, smoke secrets, cookies, headers, reviewer contact details, or pasted private notes.",
    items: [
      {
        id: "refresh-local-signals",
        title: "Refresh local trust signals",
        statusLabel:
          readinessSummary.totalCount > 0
            ? `${readinessSummary.totalCount} signal(s) loaded`
            : "Signals not loaded",
        detail:
          "Reload the dashboard after changing saved answers, review packets, personal plan data, or Library source controls.",
        actionLabel: "Refresh dashboard",
        routeName: "Settings",
        icon: "refresh-cw",
        tone: readinessSummary.totalCount > 0 ? "clear" : "attention",
      },
      {
        id: "review-sensitive-handoffs",
        title: "Review sensitive handoffs",
        statusLabel: `${sensitiveHandoffCount} handoff boundary row(s) visible`,
        detail:
          "Check scholar packets and export/share boundaries before sensitive questions, private notes, or saved answers leave this screen.",
        actionLabel: "Open packets",
        routeName: "Settings",
        icon: "award",
        tone:
          readinessSummary.blockedCount > 0
            ? "blocked"
            : readinessSummary.attentionCount > 0
              ? "attention"
              : "clear",
      },
      {
        id: "share-non-secret-proof",
        title: "Share only non-secret proof",
        statusLabel:
          blockedReleaseGateCount > 0
            ? `${blockedReleaseGateCount} release proof gate(s) blocked`
            : "No blocked release proof rows",
        detail: firstBlockedReleaseGate
          ? `Start with ${firstBlockedReleaseGate.title}; attach redacted command evidence, not secrets.`
          : "Keep evidence tied to the current host, database target, app build, and content state.",
        actionLabel: "Open proof",
        routeName: "AppStoreShowcase",
        icon: "shield",
        tone: blockedReleaseGateCount > 0 ? "blocked" : "attention",
      },
      {
        id: "resolve-next-action",
        title: "Resolve next safest action",
        statusLabel: readinessSummary.nextActionLabel,
        detail:
          "Use the dashboard's next action before moving to lower-risk polish or stronger user-facing claims.",
        actionLabel: readinessSummary.nextActionLabel,
        routeName: readinessSummary.nextActionRouteName,
        icon: "arrow-right",
        tone: readinessSummary.readinessTone,
      },
    ],
  };
}

export function buildPrivacyTrustClaimReceiptRows(params: {
  readinessSummary: PrivacyTrustReadinessSummary;
  releaseGateRows: PrivacyTrustReleaseGateRow[];
  evidenceRows: PrivacyTrustEvidenceRow[];
}): PrivacyTrustClaimReceiptRow[] {
  const { evidenceRows, readinessSummary, releaseGateRows } = params;
  const publicationEvidence = evidenceRows.find(
    (row) => row.id === "publication-evidence",
  );
  const scholarPacketEvidence = evidenceRows.find(
    (row) => row.id === "scholar-packet-handoff",
  );
  const blockedReleaseGates = countTone(releaseGateRows, "blocked");
  const publicationEvidenceLabel =
    publicationEvidence && publicationEvidence.evidenceLabel.length > 24
      ? publicationEvidence.evidenceLabel
      : "Publication evidence loads from the Library review summary and strict completion gate.";

  return [
    {
      id: "local-trust-state",
      title: "Local trust state",
      publicClaimLabel:
        readinessSummary.readinessTone === "clear"
          ? "Local trust controls are visible in-app."
          : "Local trust controls show what still needs review.",
      evidenceLabel: `${readinessSummary.clearCount} clear, ${readinessSummary.attentionCount} review, ${readinessSummary.blockedCount} blocked trust signal(s).`,
      cannotClaimLabel:
        "Do not describe local controls as deployed runtime, database, source-pack activation, or scholar approval proof.",
      actionLabel: readinessSummary.nextActionLabel,
      routeName: readinessSummary.nextActionRouteName,
      icon:
        readinessSummary.readinessTone === "blocked"
          ? "alert-triangle"
          : "check-circle",
      tone: readinessSummary.readinessTone,
    },
    {
      id: "source-scholar-boundary",
      title: "AI source and scholar boundary",
      publicClaimLabel:
        "NurAI separates source-aware education from scholar review handoff.",
      evidenceLabel:
        scholarPacketEvidence?.evidenceLabel ??
        "Scholar packet handoff evidence loads from saved review packets.",
      cannotClaimLabel:
        "Do not call sensitive AI answers final rulings or qualified scholar approvals.",
      actionLabel: scholarPacketEvidence?.actionLabel ?? "Open review packets",
      routeName: "Settings",
      icon: "award",
      tone: scholarPacketEvidence?.tone ?? "attention",
    },
    {
      id: "release-proof-boundary",
      title: "Release proof boundary",
      publicClaimLabel:
        blockedReleaseGates > 0
          ? "Release proof is tracked separately from device trust signals."
          : "Release proof rows are attached for this build state.",
      evidenceLabel:
        blockedReleaseGates > 0
          ? `${blockedReleaseGates} external proof gate(s) still require redacted evidence.`
          : "No blocked release proof rows are visible in this dashboard.",
      cannotClaimLabel:
        "Do not make App Store-ready runtime, production database, or source-pack activation claims from this screen alone.",
      actionLabel:
        releaseGateRows.find((row) => row.tone === "blocked")?.actionLabel ??
        "Open showcase",
      routeName:
        releaseGateRows.find((row) => row.tone === "blocked")?.routeName ??
        "AppStoreShowcase",
      icon: "shield",
      tone: blockedReleaseGates > 0 ? "blocked" : "attention",
    },
    {
      id: "library-review-boundary",
      title: "Library review boundary",
      publicClaimLabel:
        publicationEvidence?.tone === "clear"
          ? "Library review evidence is attached for current content."
          : "Library content is prepared for human review, not final approval.",
      evidenceLabel: publicationEvidenceLabel,
      cannotClaimLabel:
        "Do not claim all books are published, scholar-reviewed, or highest-standard complete until evidence passes.",
      actionLabel: publicationEvidence?.actionLabel ?? "Keep claims pending",
      routeName: "LibrarySourceReview",
      icon: "book-open",
      tone: publicationEvidence?.tone ?? "blocked",
    },
  ];
}

export function buildPrivacyTrustClaimRiskQueueRows(params: {
  readinessSummary: PrivacyTrustReadinessSummary;
  releaseGateRows: PrivacyTrustReleaseGateRow[];
  claimReceiptRows: PrivacyTrustClaimReceiptRow[];
  evidenceRows: PrivacyTrustEvidenceRow[];
}): PrivacyTrustClaimRiskQueueRow[] {
  const { claimReceiptRows, evidenceRows, readinessSummary, releaseGateRows } =
    params;
  const blockedReleaseGate = releaseGateRows.find(
    (row) => row.tone === "blocked",
  );
  const publicationEvidence = evidenceRows.find(
    (row) => row.id === "publication-evidence",
  );
  const scholarBoundary = claimReceiptRows.find(
    (row) => row.id === "source-scholar-boundary",
  );
  const localTrustReceipt = claimReceiptRows.find(
    (row) => row.id === "local-trust-state",
  );
  const blockedReleaseCount = countTone(releaseGateRows, "blocked");
  const publicationEvidenceGap =
    publicationEvidence && publicationEvidence.evidenceLabel.length > 48
      ? publicationEvidence.evidenceLabel
      : "Library publication evidence must include editorial, source, quality-checklist, publish, and scholar evidence where required.";
  const localEvidenceGap =
    localTrustReceipt && localTrustReceipt.evidenceLabel.length > 48
      ? localTrustReceipt.evidenceLabel
      : `${readinessSummary.readinessBody} Local privacy proof remains separate from cloud deletion, deployed runtime, and database migration evidence.`;

  const rows: PrivacyTrustClaimRiskQueueRow[] = [
    {
      id: "release-readiness-claim",
      title: "App Store readiness claim",
      riskLabel:
        blockedReleaseCount > 0
          ? `${blockedReleaseCount} external proof gate(s) still blocked`
          : "Release proof still needs current build review",
      blockedClaimLabel:
        "Do not say NurAI is App Store-ready, production-ready, or externally verified from local trust signals.",
      evidenceGapLabel: blockedReleaseGate
        ? `${blockedReleaseGate.title}: ${blockedReleaseGate.evidenceRequiredLabel}`
        : "Keep deployed runtime, production database, source-pack activation, and Library proof tied to the current build.",
      nextActionLabel: blockedReleaseGate?.actionLabel ?? "Open showcase",
      routeName: blockedReleaseGate?.routeName ?? "AppStoreShowcase",
      icon: "shield",
      priority: blockedReleaseCount > 0 ? 1 : 4,
      tone: blockedReleaseCount > 0 ? "blocked" : "attention",
    },
    {
      id: "library-publication-claim",
      title: "Library publication claim",
      riskLabel:
        publicationEvidence?.tone === "clear"
          ? "Library evidence row currently clear"
          : "Human review evidence still pending",
      blockedClaimLabel:
        "Do not call Library books published, certified, or fully reviewed until strict human evidence is attached.",
      evidenceGapLabel: publicationEvidenceGap,
      nextActionLabel: publicationEvidence?.actionLabel ?? "Open source review",
      routeName: "LibrarySourceReview",
      icon: "book-open",
      priority: publicationEvidence?.tone === "blocked" ? 2 : 5,
      tone: publicationEvidence?.tone ?? "blocked",
    },
    {
      id: "scholar-answer-claim",
      title: "Scholar answer claim",
      riskLabel:
        scholarBoundary?.tone === "clear"
          ? "Scholar handoff queue currently clear"
          : "Sensitive answers need review boundaries",
      blockedClaimLabel:
        "Do not describe sensitive AI answers as fatwas, final rulings, or qualified scholar approvals.",
      evidenceGapLabel:
        scholarBoundary?.evidenceLabel ??
        "Scholar review packets must be handled as review handoffs, not casual AI verdicts.",
      nextActionLabel: scholarBoundary?.actionLabel ?? "Open review packets",
      routeName: scholarBoundary?.routeName ?? "Settings",
      icon: "award",
      priority: scholarBoundary?.tone === "blocked" ? 3 : 6,
      tone: scholarBoundary?.tone ?? "attention",
    },
    {
      id: "local-privacy-claim",
      title: "Local privacy claim",
      riskLabel: readinessSummary.releaseClaimLabel,
      blockedClaimLabel:
        "Do not present on-device privacy controls as proof of cloud deletion, deployed runtime safety, or database migration success.",
      evidenceGapLabel: localEvidenceGap,
      nextActionLabel: readinessSummary.nextActionLabel,
      routeName: readinessSummary.nextActionRouteName,
      icon: "lock",
      priority: readinessSummary.readinessTone === "blocked" ? 4 : 7,
      tone: readinessSummary.readinessTone,
    },
  ];

  return rows.sort((a, b) => {
    const toneRank: Record<PrivacyTrustEvidenceTone, number> = {
      blocked: 0,
      attention: 1,
      clear: 2,
    };
    if (toneRank[a.tone] !== toneRank[b.tone]) {
      return toneRank[a.tone] - toneRank[b.tone];
    }
    return a.priority - b.priority;
  });
}

export function buildPrivacyTrustReadinessSummary(
  dataControlRows: PrivacyTrustDataControlRow[],
  evidenceRows: PrivacyTrustEvidenceRow[],
): PrivacyTrustReadinessSummary {
  const allRows = [...dataControlRows, ...evidenceRows];
  const blockedCount = countTone(allRows, "blocked");
  const attentionCount = countTone(allRows, "attention");
  const clearCount = countTone(allRows, "clear");
  const nextActionRow =
    dataControlRows.find((row) => row.tone === "blocked") ??
    dataControlRows.find((row) => row.tone === "attention") ??
    dataControlRows[0];

  if (allRows.length === 0) {
    return {
      totalCount: 0,
      clearCount: 0,
      attentionCount: 0,
      blockedCount: 0,
      readinessTone: "attention",
      readinessLabel: "Checking trust signals",
      readinessBody:
        "Refresh to load local privacy controls, saved AI answers, review packets, and source evidence.",
      releaseClaimLabel: "Refresh trust dashboard",
      nextActionLabel: "Open settings",
      nextActionRouteName: "Settings",
    };
  }

  if (blockedCount > 0) {
    return {
      totalCount: allRows.length,
      clearCount,
      attentionCount,
      blockedCount,
      readinessTone: "blocked",
      readinessLabel: "Trust work pending",
      readinessBody: `${blockedCount} trust gate${blockedCount === 1 ? "" : "s"} need resolution before NurAI should make stronger public trust claims. Start with ${nextActionRow?.title ?? "the highest-risk item"}.`,
      releaseClaimLabel: "Keep trust claims pending",
      nextActionLabel: nextActionRow?.actionLabel ?? "Review trust item",
      nextActionRouteName: nextActionRow?.routeName ?? "Settings",
    };
  }

  if (attentionCount > 0) {
    return {
      totalCount: allRows.length,
      clearCount,
      attentionCount,
      blockedCount,
      readinessTone: "attention",
      readinessLabel: "Review attention needed",
      readinessBody: `${attentionCount} trust item${attentionCount === 1 ? "" : "s"} need review language or source follow-up before being used in stronger user-facing claims.`,
      releaseClaimLabel: "Use reviewed-with-care language",
      nextActionLabel: nextActionRow?.actionLabel ?? "Review trust item",
      nextActionRouteName: nextActionRow?.routeName ?? "Settings",
    };
  }

  return {
    totalCount: allRows.length,
    clearCount,
    attentionCount,
    blockedCount,
    readinessTone: "clear",
    readinessLabel: "Local trust signals clear",
    readinessBody:
      "No local trust warnings are visible here. Keep external release, database, and scholar-review evidence as separate gates.",
    releaseClaimLabel: "Local trust checks clear",
    nextActionLabel: nextActionRow?.actionLabel ?? "Open settings",
    nextActionRouteName: nextActionRow?.routeName ?? "Settings",
  };
}

export function buildPrivacyTrustActionPlan(params: {
  readinessSummary: PrivacyTrustReadinessSummary;
  releaseGateRows: PrivacyTrustReleaseGateRow[];
}): PrivacyTrustActionPlan {
  const { readinessSummary, releaseGateRows } = params;
  const firstBlockedReleaseGate =
    releaseGateRows.find((row) => row.tone === "blocked") ??
    releaseGateRows.find((row) => row.tone === "attention");
  const releaseBlockedCount = countTone(releaseGateRows, "blocked");
  const releaseAttentionCount = countTone(releaseGateRows, "attention");
  const hasLocalBlock = readinessSummary.readinessTone === "blocked";
  const hasLocalAttention = readinessSummary.readinessTone === "attention";
  const hasReleaseBlock = releaseBlockedCount > 0;
  const hasReleaseAttention = releaseAttentionCount > 0;
  const tone: PrivacyTrustEvidenceTone =
    hasLocalBlock || hasReleaseBlock
      ? "blocked"
      : hasLocalAttention || hasReleaseAttention
        ? "attention"
        : "clear";

  if (tone === "clear") {
    return {
      statusLabel: "Trust actions clear",
      headline: "Local controls and release proof are in a clean state",
      body: "Keep privacy controls, source evidence, and external proof current after any AI, Library, or data change.",
      localActionLabel: readinessSummary.nextActionLabel,
      localActionRouteName: readinessSummary.nextActionRouteName,
      localBoundaryLabel:
        "Local privacy controls can be described as clear for this device.",
      releaseActionLabel:
        firstBlockedReleaseGate?.actionLabel ?? "Open showcase",
      releaseActionRouteName:
        firstBlockedReleaseGate?.routeName ?? "AppStoreShowcase",
      releaseBoundaryLabel:
        "Release proof still needs to stay attached to the current build and content hash.",
      proofBoundaryLabel:
        "Do not reuse old proof after changing AI prompts, database targets, or Library content.",
      tone,
    };
  }

  const releaseGateTitle =
    firstBlockedReleaseGate?.title ?? "external release proof";
  const releaseGateAction =
    firstBlockedReleaseGate?.actionLabel ?? "Open showcase";
  const releaseGateRoute =
    firstBlockedReleaseGate?.routeName ?? "AppStoreShowcase";

  return {
    statusLabel:
      tone === "blocked" ? "Trust action needed" : "Trust review needed",
    headline:
      tone === "blocked"
        ? "Resolve the highest-risk trust gap before stronger claims"
        : "Review trust language before using stronger claims",
    body: "Use the local lane for user-controlled privacy and source gaps. Use the release lane for runtime, database, source-pack activation, and human evidence that must be proven outside this device.",
    localActionLabel: readinessSummary.nextActionLabel,
    localActionRouteName: readinessSummary.nextActionRouteName,
    localBoundaryLabel:
      readinessSummary.readinessTone === "clear"
        ? "Local trust signals are clear here, but they do not prove the live release."
        : `${readinessSummary.blockedCount} blocked and ${readinessSummary.attentionCount} review item(s) remain in local trust signals.`,
    releaseActionLabel: releaseGateAction,
    releaseActionRouteName: releaseGateRoute,
    releaseBoundaryLabel: hasReleaseBlock
      ? `${releaseBlockedCount} release proof gate(s) remain blocked; start with ${releaseGateTitle}.`
      : "Release proof needs review language, not stronger public claims yet.",
    proofBoundaryLabel:
      "Stronger public claims require redacted proof, current content hashes, and no secrets in screenshots or committed files.",
    tone,
  };
}

export function buildPrivacyTrustEvidencePassport(params: {
  readinessSummary: PrivacyTrustReadinessSummary;
  actionPlan: PrivacyTrustActionPlan;
  releaseGateRows: PrivacyTrustReleaseGateRow[];
  claimReceiptRows: PrivacyTrustClaimReceiptRow[];
}): PrivacyTrustEvidencePassport {
  const { actionPlan, claimReceiptRows, readinessSummary, releaseGateRows } =
    params;
  const blockedReleaseGates = countTone(releaseGateRows, "blocked");
  const attentionReleaseGates = countTone(releaseGateRows, "attention");
  const blockedClaimReceipts = countTone(claimReceiptRows, "blocked");
  const attentionClaimReceipts = countTone(claimReceiptRows, "attention");
  const releaseGateLabel =
    blockedReleaseGates > 0
      ? `${blockedReleaseGates} release proof gate${blockedReleaseGates === 1 ? "" : "s"} blocked`
      : attentionReleaseGates > 0
        ? `${attentionReleaseGates} release proof gate${attentionReleaseGates === 1 ? "" : "s"} need review`
        : "Release proof rows clear";
  const claimBoundaryLabel =
    blockedClaimReceipts > 0
      ? `${blockedClaimReceipts} claim ${blockedClaimReceipts === 1 ? "boundary" : "boundaries"} blocked`
      : attentionClaimReceipts > 0
        ? `${attentionClaimReceipts} claim ${attentionClaimReceipts === 1 ? "boundary" : "boundaries"} need review`
        : "Claim boundaries clear";
  const localClaimLabel =
    readinessSummary.readinessTone === "clear"
      ? "Local privacy controls are visible and have no current local blockers."
      : "Local trust state still shows review work, so public trust language must stay careful.";
  const releaseClaimLabel =
    blockedReleaseGates > 0
      ? "Do not claim production release readiness until live runtime, database, source-pack activation, and human-review proof are attached."
      : "Release proof rows must stay tied to the current host, database target, build, and Library content state.";
  const statusLabel =
    actionPlan.tone === "blocked"
      ? "Not ready for stronger public claims"
      : actionPlan.tone === "attention"
        ? "Careful language required"
        : "Local evidence passport clear";
  const summaryLabel = `${readinessSummary.clearCount} clear, ${readinessSummary.attentionCount} review, ${readinessSummary.blockedCount} blocked local trust signal(s). ${releaseGateLabel}.`;
  const boundaryLabel =
    "This passport is a user-readable evidence summary; it is not a substitute for deployed runtime, production database, source-pack activation, or qualified human-review proof.";
  const noSecretLabel =
    "Share only non-secret summaries. Never include API keys, database URLs, smoke secrets, cookies, headers, private review contacts, or pasted personal notes.";
  const rows: PrivacyTrustEvidencePassportRow[] = [
    {
      id: "local-signals",
      title: "Local trust signals",
      valueLabel: readinessSummary.releaseClaimLabel,
      detail: readinessSummary.readinessBody,
      icon:
        readinessSummary.readinessTone === "blocked"
          ? "alert-triangle"
          : readinessSummary.readinessTone === "attention"
            ? "eye"
            : "check-circle",
      tone: readinessSummary.readinessTone,
    },
    {
      id: "claim-boundaries",
      title: "Claim boundaries",
      valueLabel: claimBoundaryLabel,
      detail:
        "Public claims stay paired with evidence, cannot-claim copy, and scholar/source boundaries.",
      icon: "file-text",
      tone:
        blockedClaimReceipts > 0
          ? "blocked"
          : attentionClaimReceipts > 0
            ? "attention"
            : "clear",
    },
    {
      id: "release-proof",
      title: "Release proof",
      valueLabel: releaseGateLabel,
      detail:
        "Runtime, database, source-pack activation, and Library human-review gates remain separate from local device controls.",
      icon: "shield",
      tone:
        blockedReleaseGates > 0
          ? "blocked"
          : attentionReleaseGates > 0
            ? "attention"
            : "clear",
    },
    {
      id: "next-action",
      title: "Next safest action",
      valueLabel: actionPlan.statusLabel,
      detail: actionPlan.headline,
      icon: "arrow-right",
      tone: actionPlan.tone,
    },
  ];

  return {
    title: "Evidence passport",
    statusLabel,
    summaryLabel,
    localClaimLabel,
    releaseClaimLabel,
    nextActionLabel: actionPlan.localActionLabel,
    nextActionRouteName: actionPlan.localActionRouteName,
    boundaryLabel,
    noSecretLabel,
    shareTitle: "NurAI trust evidence passport",
    shareText: [
      "NurAI trust evidence passport",
      statusLabel,
      summaryLabel,
      localClaimLabel,
      releaseClaimLabel,
      boundaryLabel,
      noSecretLabel,
      `Next action: ${actionPlan.localActionLabel}`,
    ].join("\n\n"),
    rows,
  };
}
