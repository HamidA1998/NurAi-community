import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiRequest } from "@/lib/query-client";
import { canReviewLibrarySources } from "@/services/libraryAccessControl";
import { getBooks } from "@/services/libraryService";
import {
  Book,
  Chapter,
  LibraryCategory,
  PlanType,
  SourceRef,
} from "@/types/library";

const REVIEW_STORAGE_KEY = "nurai_library_source_reviews_v1";
const TRUSTED_SOURCE_HOSTS = new Set([
  "quran.com",
  "www.quran.com",
  "sunnah.com",
  "www.sunnah.com",
]);
const SENSITIVE_CATEGORIES = new Set<LibraryCategory>([
  "Worship",
  "Family",
  "Wealth & Work",
  "Reverts",
]);

export type SourceReviewStatus = "approved" | "ready_for_review" | "needs_fix";
export type SourceReviewDecision = "approved" | "needs_revision";

export interface SourceReviewRecord {
  id: string;
  bookId: string;
  chapterId: string;
  decision: SourceReviewDecision;
  reviewerName: string;
  note?: string;
  reviewedAt: string;
  sourceFingerprint?: string;
  serverBacked?: boolean;
}

export interface ChapterSourceAudit {
  id: string;
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterTitle: string;
  category: LibraryCategory;
  sourceCount: number;
  verifiedCount: number;
  trustedUrlCount: number;
  missingUrlCount: number;
  issueCount: number;
  issues: string[];
  needsScholarReview: boolean;
  status: SourceReviewStatus;
  sources: SourceRef[];
  review?: SourceReviewRecord;
}

export interface LibrarySourceSummary {
  totalChapters: number;
  approvedChapters: number;
  readyForReview: number;
  needsFix: number;
  verifiedSources: number;
  totalSources: number;
  scholarReviewRecommended: number;
}

export interface LibraryPublicationReviewSummary {
  totalBooks: number;
  publishedBooks: number;
  booksMissingEvidence: number;
  editorialPending: number;
  sourceReviewPending: number;
  qualityChecklistPending: number;
  qualifiedScholarPending: number;
  publishDecisionPending: number;
  sensitiveBooks: number;
}

export interface LibraryPublicationReviewItem {
  bookId: string;
  title: string;
  category: LibraryCategory;
  requiredPlan: PlanType;
  verifiedContentStatus: Book["verifiedContentStatus"];
  chapterCount: number;
  sourceRefCount: number;
  sensitive: boolean;
  priorityLabel: string;
  missingEvidence: string[];
}

export interface LibraryReviewCompletionLane {
  id:
    | "editorial"
    | "source_relevance"
    | "quality_checklist"
    | "qualified_scholar"
    | "publish_decision";
  label: string;
  pending: number;
  total: number;
  ownerLabel: string;
  nextAction: string;
}

export interface LibraryReviewCompletionPlan {
  releaseStateLabel: string;
  progressLabel: string;
  completedEvidenceCount: number;
  totalEvidenceCount: number;
  completionPercent: number;
  blockerLabel: string;
  nextBookLabel: string;
  guardrail: string;
  lanes: LibraryReviewCompletionLane[];
}

export interface LibraryReviewEvidenceBatch {
  id:
    | "qualified_scholar"
    | "source_relevance"
    | "editorial"
    | "quality_checklist"
    | "publish_decision";
  title: string;
  ownerLabel: string;
  description: string;
  bookCount: number;
  sensitiveCount: number;
  missingEvidenceCount: number;
  firstBookTitles: string[];
  bookIds: string[];
  evidenceNeeded: string[];
  acceptanceChecklist: string[];
  proofBoundaryLabel: string;
  shareLabel: string;
}

export interface LibraryReviewBookAcceptancePacketStage {
  id:
    | "editorial"
    | "source_relevance"
    | "quality_checklist"
    | "qualified_scholar"
    | "publish_decision";
  label: string;
  ownerLabel: string;
  statusLabel: string;
  requiredFields: string[];
  reviewerMustConfirmLabel: string;
  rejectIfLabel: string;
  claimBoundaryLabel: string;
  icon: string;
  tone: "primary" | "scholar" | "warning";
}

export interface LibraryReviewBookAcceptancePacket {
  bookId: string;
  title: string;
  category: LibraryCategory;
  priorityLabel: string;
  statusLabel: string;
  reviewerPathLabel: string;
  exportCommandLabel: string;
  evidenceFileLabel: string;
  contentHashLabel: string;
  highCareBoundaryLabel: string;
  noSecretBoundaryLabel: string;
  handoffChecklist: string[];
  stages: LibraryReviewBookAcceptancePacketStage[];
  shareLabel: string;
}

export interface LibraryReviewEvidenceIntakeRunbook {
  title: string;
  statusLabel: string;
  reviewerScopeLabel: string;
  reviewerPacketCount: number;
  claimBoundaryLabel: string;
  commandLines: string[];
  guardrail: string;
  shareLabel: string;
}

export interface LibraryReviewStageContract {
  id:
    | "editorial_review"
    | "source_relevance_review"
    | "qualified_scholar_review"
    | "publish_approval";
  label: string;
  ownerLabel: string;
  pending: number;
  total: number;
  requiredEvidenceFields: string[];
  reviewerMustConfirmLabel: string;
  rejectIfLabel: string;
  claimBoundaryLabel: string;
  icon: string;
  tone: "primary" | "scholar" | "warning";
}

export interface LibraryReviewEvidenceAcceptanceContractItem {
  id: string;
  label: string;
  detail: string;
  statusLabel: string;
  icon: string;
  tone: "primary" | "scholar" | "warning";
}

export interface LibraryReviewEvidenceAcceptanceContract {
  title: string;
  statusLabel: string;
  summary: string;
  acceptedEvidenceTitle: string;
  rejectedEvidenceTitle: string;
  validationTitle: string;
  claimBoundaryLabel: string;
  acceptedEvidence: LibraryReviewEvidenceAcceptanceContractItem[];
  rejectedEvidence: LibraryReviewEvidenceAcceptanceContractItem[];
  validationSteps: LibraryReviewEvidenceAcceptanceContractItem[];
}

export interface LibraryReviewEvidenceImportReadinessItem {
  id: string;
  label: string;
  detail: string;
  commandLabel: string;
  statusLabel: string;
  icon: string;
  tone: "primary" | "scholar" | "warning";
}

export interface LibraryReviewEvidenceImportReadinessContract {
  title: string;
  statusLabel: string;
  summary: string;
  currentEvidenceLabel: string;
  blockingEvidenceLabel: string;
  privacyBoundaryLabel: string;
  claimBoundaryLabel: string;
  items: LibraryReviewEvidenceImportReadinessItem[];
}

export interface LibraryReviewEvidenceProofMatrixRow {
  id:
    | "packet_export"
    | "reviewer_completion"
    | "strict_validation"
    | "dry_run_import"
    | "guarded_write"
    | "ledger_refresh"
    | "release_gate";
  label: string;
  ownerLabel: string;
  statusLabel: string;
  commandLabel: string;
  proofNeededLabel: string;
  blockerLabel: string;
  claimBoundaryLabel: string;
  icon: string;
  tone: "primary" | "scholar" | "warning";
}

export interface LibraryReviewEvidenceProofMatrix {
  title: string;
  statusLabel: string;
  summary: string;
  activeBlockerLabel: string;
  noSecretBoundaryLabel: string;
  claimBoundaryLabel: string;
  shareLabel: string;
  rows: LibraryReviewEvidenceProofMatrixRow[];
}

export interface LibraryReviewSprintTask {
  id: string;
  title: string;
  ownerLabel: string;
  bookCount: number;
  sensitiveCount: number;
  detail: string;
  actionLabel: string;
  commandLabel: string;
  claimBoundaryLabel: string;
  icon: string;
  tone: "primary" | "scholar" | "warning";
}

export interface LibraryReviewSprintPlan {
  title: string;
  statusLabel: string;
  summary: string;
  sprintWindowLabel: string;
  dailyTargetLabel: string;
  priorityBookLabel: string;
  completionBoundaryLabel: string;
  tasks: LibraryReviewSprintTask[];
}

export interface LibraryReviewDailyWorkPlanTask {
  id: string;
  title: string;
  ownerLabel: string;
  bookCount: number;
  sensitiveCount: number;
  commandLabel: string;
  acceptanceLabel: string;
  claimBoundaryLabel: string;
  icon: string;
  tone: "primary" | "scholar" | "warning";
}

export interface LibraryReviewDailyWorkPlanDay {
  id: string;
  dayLabel: string;
  focusLabel: string;
  targetLabel: string;
  bookTitles: string[];
  tasks: LibraryReviewDailyWorkPlanTask[];
  evidenceBoundaryLabel: string;
  doneDefinitionLabel: string;
}

export interface LibraryReviewDailyWorkPlan {
  title: string;
  statusLabel: string;
  summary: string;
  dayCount: number;
  dailyTargetLabel: string;
  firstDayLabel: string;
  noOverclaimBoundaryLabel: string;
  shareLabel: string;
  days: LibraryReviewDailyWorkPlanDay[];
}

export interface LibraryReviewNextAction {
  title: string;
  ownerLabel: string;
  laneLabel: string;
  actionLabel: string;
  packetLabel: string;
  commandLabel: string;
  evidenceLabel: string;
  acceptanceChecklist: string[];
  guardrail: string;
  batchId: LibraryReviewEvidenceBatch["id"] | null;
  shareLabel: string;
}

export interface LibrarySourcePackActivationDomain {
  id: "tafsir" | "hadith" | "fiqh" | "seerah";
  label: string;
  statusLabel: string;
  draftCount: number;
  verifiedCount: number;
  activationReady: boolean;
  reviewerLabel: string;
  evidenceFileLabel: string;
  commandLabel: string;
  blockerLabel: string;
  claimBoundaryLabel: string;
  icon: string;
  tone: "primary" | "scholar" | "warning";
}

export interface LibrarySourcePackActivationContract {
  title: string;
  statusLabel: string;
  summary: string;
  draftSummaryLabel: string;
  finalReadinessCommandLabel: string;
  handoffCommandLabel: string;
  activationBoundaryLabel: string;
  noSecretBoundaryLabel: string;
  shareLabel: string;
  domains: LibrarySourcePackActivationDomain[];
}

export interface LibraryReviewOpsPassportLane {
  id:
    | "library_human_review"
    | "qualified_scholar_review"
    | "source_pack_activation"
    | "release_gate";
  label: string;
  statusLabel: string;
  ownerLabel: string;
  actionLabel: string;
  proofCommandLabel: string;
  boundaryLabel: string;
  icon: string;
  tone: "primary" | "scholar" | "warning";
}

export interface LibraryReviewOpsPassport {
  title: string;
  statusLabel: string;
  summary: string;
  progressLabel: string;
  nextOwnerLabel: string;
  nextProofCommandLabel: string;
  noClaimBoundaryLabel: string;
  noSecretBoundaryLabel: string;
  shareLabel: string;
  lanes: LibraryReviewOpsPassportLane[];
}

const SOURCE_PACK_DOMAIN_ROWS: Pick<
  LibrarySourcePackActivationDomain,
  "id" | "label" | "reviewerLabel" | "evidenceFileLabel" | "icon" | "tone"
>[] = [
  {
    id: "tafsir",
    label: "Tafsir",
    reviewerLabel: "Tafsir source reviewer",
    evidenceFileLabel: "docs/audit/tafsir-source-review-evidence.intake.json",
    icon: "book-open",
    tone: "scholar",
  },
  {
    id: "hadith",
    label: "Hadith",
    reviewerLabel: "Hadith source reviewer",
    evidenceFileLabel: "docs/audit/hadith-source-review-evidence.intake.json",
    icon: "feather",
    tone: "scholar",
  },
  {
    id: "fiqh",
    label: "Fiqh",
    reviewerLabel: "Qualified fiqh reviewer",
    evidenceFileLabel: "docs/audit/fiqh-source-review-evidence.intake.json",
    icon: "award",
    tone: "warning",
  },
  {
    id: "seerah",
    label: "Seerah",
    reviewerLabel: "Seerah source reviewer",
    evidenceFileLabel: "docs/audit/seerah-source-review-evidence.intake.json",
    icon: "map",
    tone: "primary",
  },
];

export function buildLibrarySourcePackActivationContract(): LibrarySourcePackActivationContract {
  const domains: LibrarySourcePackActivationDomain[] =
    SOURCE_PACK_DOMAIN_ROWS.map((domain) => ({
      ...domain,
      draftCount: 8,
      verifiedCount: 0,
      activationReady: false,
      statusLabel: "Reviewer evidence pending",
      commandLabel: `npm run validate:${domain.id}-review-evidence -- --file /absolute/path/to/real-${domain.id}-source-review-evidence.json --require-approved --summary-json`,
      blockerLabel:
        "All current draft cards need approved reviewer evidence before this source pack can activate.",
      claimBoundaryLabel:
        "Draft source-pack handoff material is not scholar approval, publication approval, or active AI answer evidence.",
    }));

  return {
    title: "AI source-pack activation checkpoint",
    statusLabel: "Blocked until real reviewed evidence passes",
    summary:
      "Tafsir, Hadith, Fiqh, and Seerah source packs stay inactive until every draft card has approved reviewer evidence and final readiness passes.",
    draftSummaryLabel:
      "32 draft cards, 0 verified cards, 0 activation-ready domains",
    finalReadinessCommandLabel:
      "npm run check:source-pack-final-readiness -- --summary-json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
    handoffCommandLabel:
      "npm run export:source-pack-review-handoff -- --check --summary-json",
    activationBoundaryLabel:
      "Do not claim source packs are verified, reviewed by qualified scholars, or active in NurAI answers until final readiness passes on real evidence.",
    noSecretBoundaryLabel:
      "Do not include API keys, auth headers, cookies, database URLs, reviewer private contact details, licensed private text, or private keys in source-pack evidence.",
    shareLabel: "Share activation handoff",
    domains,
  };
}

export function buildLibrarySourcePackActivationShareText(
  contract: LibrarySourcePackActivationContract,
): string {
  return [
    "NurAI AI source-pack activation checkpoint",
    "",
    contract.statusLabel,
    contract.summary,
    contract.draftSummaryLabel,
    "",
    "Domain review lanes:",
    ...contract.domains.map(
      (domain) =>
        `- ${domain.label}: ${domain.verifiedCount}/${domain.draftCount} verified. Owner: ${domain.reviewerLabel}. Evidence: ${domain.evidenceFileLabel}. Command: ${domain.commandLabel}`,
    ),
    "",
    `Final readiness: ${contract.finalReadinessCommandLabel}`,
    `Handoff freshness: ${contract.handoffCommandLabel}`,
    "",
    `Activation boundary: ${contract.activationBoundaryLabel}`,
    `No-secret boundary: ${contract.noSecretBoundaryLabel}`,
  ].join("\n");
}

export function buildLibraryReviewOpsPassport(params: {
  summary: LibraryPublicationReviewSummary;
  plan: LibraryReviewCompletionPlan;
  nextAction: LibraryReviewNextAction;
  sourcePack: LibrarySourcePackActivationContract;
}): LibraryReviewOpsPassport {
  const highCareLabel =
    params.summary.sensitiveBooks > 0
      ? `${params.summary.qualifiedScholarPending}/${params.summary.sensitiveBooks} high-care books need qualified scope`
      : "No high-care books pending qualified scope";
  const libraryClear =
    params.summary.booksMissingEvidence === 0 &&
    params.plan.completionPercent === 100;
  const sourcePackClear = params.sourcePack.domains.every(
    (domain) => domain.activationReady,
  );

  return {
    title: "Library review ops passport",
    statusLabel:
      libraryClear && sourcePackClear
        ? "Review proof can move to strict gates"
        : "Human review proof still blocks completion claims",
    summary:
      "A single owner-facing passport for Library publication evidence, high-care scholar scope, AI source-pack activation, and final release gates.",
    progressLabel: `${params.plan.completedEvidenceCount}/${params.plan.totalEvidenceCount} Library evidence lanes accepted; ${params.summary.booksMissingEvidence} books still missing evidence.`,
    nextOwnerLabel: params.nextAction.ownerLabel,
    nextProofCommandLabel: params.nextAction.commandLabel,
    noClaimBoundaryLabel:
      "Do not claim Library completion, scholar-reviewed books, source-pack activation, or App Store release readiness from this passport alone.",
    noSecretBoundaryLabel:
      "Share this passport without reviewer private contact details, credentials, chat transcripts, cookies, auth headers, database URLs, API keys, or private source text.",
    shareLabel: "Share ops passport",
    lanes: [
      {
        id: "library_human_review",
        label: "Library review evidence",
        statusLabel: `${params.summary.booksMissingEvidence} books pending`,
        ownerLabel: params.nextAction.ownerLabel,
        actionLabel: params.nextAction.actionLabel,
        proofCommandLabel: params.nextAction.commandLabel,
        boundaryLabel:
          "Library publication claims require validated current-content evidence imports, not shared handoff notes.",
        icon: "book-open",
        tone: "primary",
      },
      {
        id: "qualified_scholar_review",
        label: "High-care scholar scope",
        statusLabel: highCareLabel,
        ownerLabel: "Qualified scholar reviewer",
        actionLabel:
          "Record scope, reviewer, date, notes, and current content hash for sensitive books.",
        proofCommandLabel:
          "npm run check:library-review-final-readiness -- --file /absolute/path/to/merged-library-review-evidence.json --summary-json",
        boundaryLabel:
          "Scholar review applies only to the recorded scope and matching content hash.",
        icon: "award",
        tone: "scholar",
      },
      {
        id: "source_pack_activation",
        label: "AI source packs",
        statusLabel: params.sourcePack.draftSummaryLabel,
        ownerLabel: "Source-pack reviewers",
        actionLabel: params.sourcePack.summary,
        proofCommandLabel: params.sourcePack.finalReadinessCommandLabel,
        boundaryLabel: params.sourcePack.activationBoundaryLabel,
        icon: "shield",
        tone: "scholar",
      },
      {
        id: "release_gate",
        label: "Final release check",
        statusLabel: "Runtime and DB proof stay separate",
        ownerLabel: "Release owner",
        actionLabel:
          "After human review proof imports, rerun goal completion and external release evidence validation.",
        proofCommandLabel: "npm run check:goal-completion -- --summary-json",
        boundaryLabel:
          "Even perfect Library evidence does not prove deployed runtime, production database, or App Store submission readiness.",
        icon: "lock",
        tone: "warning",
      },
    ],
  };
}

export function buildLibraryReviewOpsPassportShareText(
  passport: LibraryReviewOpsPassport,
): string {
  return [
    "NurAI Library review ops passport",
    "",
    `Status: ${passport.statusLabel}`,
    passport.summary,
    `Progress: ${passport.progressLabel}`,
    `Next owner: ${passport.nextOwnerLabel}`,
    `Next proof command: ${passport.nextProofCommandLabel}`,
    "",
    "Owner lanes:",
    ...passport.lanes.flatMap((lane) => [
      `- ${lane.label}: ${lane.statusLabel}`,
      `  Owner: ${lane.ownerLabel}`,
      `  Action: ${lane.actionLabel}`,
      `  Proof: ${lane.proofCommandLabel}`,
      `  Boundary: ${lane.boundaryLabel}`,
    ]),
    "",
    `No-claim boundary: ${passport.noClaimBoundaryLabel}`,
    `No-secret boundary: ${passport.noSecretBoundaryLabel}`,
    "",
    "Guardrail: this ops passport coordinates review work only; it is not approval evidence, source-pack activation evidence, production deployment proof, or database proof.",
  ].join("\n");
}

function reviewId(bookId: string, chapterId: string): string {
  return `${bookId}:${chapterId}`;
}

function isTrustedSourceUrl(source: SourceRef): boolean {
  if (!source.url) return false;
  try {
    const url = new URL(source.url);
    return url.protocol === "https:" && TRUSTED_SOURCE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function validateSource(source: SourceRef): string[] {
  const issues: string[] = [];
  if (!source.reference.trim()) issues.push("Missing reference label.");
  if (!source.note.trim())
    issues.push(`${source.reference || "Source"} is missing a review note.`);
  if (!source.verified)
    issues.push(`${source.reference || "Source"} is not marked verified.`);
  if (!source.url) {
    issues.push(`${source.reference || "Source"} is missing a source URL.`);
  } else if (!isTrustedSourceUrl(source)) {
    issues.push(
      `${source.reference} URL is outside the trusted Quran.com/Sunnah.com source set.`,
    );
  }
  if (
    source.type === "quran" &&
    source.url &&
    !source.url.includes("quran.com")
  ) {
    issues.push(
      `${source.reference} is marked Quran but does not link to Quran.com.`,
    );
  }
  if (
    source.type === "hadith" &&
    source.url &&
    !source.url.includes("sunnah.com")
  ) {
    issues.push(
      `${source.reference} is marked Hadith but does not link to Sunnah.com.`,
    );
  }
  return issues;
}

function readReviewMap(
  records: SourceReviewRecord[],
): Record<string, SourceReviewRecord> {
  return Object.fromEntries(records.map((record) => [record.id, record]));
}

function normalizeReviewRecord(record: unknown): SourceReviewRecord | null {
  if (!record || typeof record !== "object") return null;
  const candidate = record as Partial<SourceReviewRecord>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.bookId !== "string" ||
    typeof candidate.chapterId !== "string" ||
    (candidate.decision !== "approved" &&
      candidate.decision !== "needs_revision") ||
    typeof candidate.reviewerName !== "string" ||
    typeof candidate.reviewedAt !== "string" ||
    candidate.serverBacked !== true
  ) {
    return null;
  }

  return {
    id: candidate.id,
    bookId: candidate.bookId,
    chapterId: candidate.chapterId,
    decision: candidate.decision,
    reviewerName: candidate.reviewerName,
    note: typeof candidate.note === "string" ? candidate.note : undefined,
    reviewedAt: candidate.reviewedAt,
    sourceFingerprint:
      typeof candidate.sourceFingerprint === "string"
        ? candidate.sourceFingerprint
        : undefined,
    serverBacked: true,
  };
}

async function readLocalReviewRecords(): Promise<SourceReviewRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(REVIEW_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeReviewRecord)
      .filter((record): record is SourceReviewRecord => Boolean(record));
  } catch {
    return [];
  }
}

async function writeReviewRecords(
  records: SourceReviewRecord[],
): Promise<void> {
  await AsyncStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(records));
}

async function readServerReviewRecords(): Promise<SourceReviewRecord[] | null> {
  try {
    const response = await apiRequest("GET", "/api/library/source-reviews");
    const data = await response.json();
    if (!Array.isArray(data?.reviews)) return null;
    const records = data.reviews
      .map(normalizeReviewRecord)
      .filter(
        (record: SourceReviewRecord | null): record is SourceReviewRecord =>
          Boolean(record),
      );
    await writeReviewRecords(records);
    return records;
  } catch {
    return null;
  }
}

async function saveServerReviewDecision(params: {
  bookId: string;
  chapterId: string;
  decision: SourceReviewDecision;
  reviewerPlan: PlanType;
  note?: string;
}): Promise<SourceReviewRecord> {
  const response = await apiRequest("POST", "/api/library/source-reviews", {
    bookId: params.bookId,
    chapterId: params.chapterId,
    decision: params.decision,
    note: params.note,
    userTier: params.reviewerPlan,
  });
  const data = await response.json();
  const record = normalizeReviewRecord(data?.review);
  if (!record) {
    throw new Error("Server did not return a valid source review record.");
  }
  return record;
}

async function readReviewRecords(): Promise<SourceReviewRecord[]> {
  const serverRecords = await readServerReviewRecords();
  return serverRecords ?? readLocalReviewRecords();
}

function auditChapter(
  book: Book,
  chapter: Chapter,
  recordsById: Record<string, SourceReviewRecord>,
): ChapterSourceAudit {
  const issues = chapter.sourceRefs.flatMap(validateSource);
  if (chapter.sourceRefs.length === 0) {
    issues.unshift("Chapter has no source cards.");
  }
  if (
    !chapter.sourceRefs.some(
      (source) =>
        source.verified &&
        (source.type === "quran" || source.type === "hadith"),
    )
  ) {
    issues.unshift(
      "Chapter needs at least one verified Quran or Hadith anchor.",
    );
  }

  const id = reviewId(book.id, chapter.id);
  const review = recordsById[id];
  const issueCount = issues.length;
  const status: SourceReviewStatus =
    review?.decision === "approved" && issueCount === 0
      ? "approved"
      : issueCount > 0 || review?.decision === "needs_revision"
        ? "needs_fix"
        : "ready_for_review";

  return {
    id,
    bookId: book.id,
    bookTitle: book.title,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    category: book.category,
    sourceCount: chapter.sourceRefs.length,
    verifiedCount: chapter.sourceRefs.filter((source) => source.verified)
      .length,
    trustedUrlCount: chapter.sourceRefs.filter(isTrustedSourceUrl).length,
    missingUrlCount: chapter.sourceRefs.filter((source) => !source.url).length,
    issueCount,
    issues,
    needsScholarReview: SENSITIVE_CATEGORIES.has(book.category),
    status,
    sources: chapter.sourceRefs,
    review,
  };
}

export function getBookSourceAuditSummary(book: Book): LibrarySourceSummary {
  const audits = book.chapters.map((chapter) =>
    auditChapter(book, chapter, {}),
  );
  return summarizeAudits(audits);
}

export async function getBookSourceAuditSummaryWithReviews(
  book: Book,
): Promise<LibrarySourceSummary> {
  const records = await readReviewRecords();
  const recordsById = readReviewMap(records);
  const audits = book.chapters.map((chapter) =>
    auditChapter(book, chapter, recordsById),
  );
  return summarizeAudits(audits);
}

export async function getChapterSourceAuditWithReviews(
  book: Book,
  chapter: Chapter,
): Promise<ChapterSourceAudit> {
  const records = await readReviewRecords();
  return auditChapter(book, chapter, readReviewMap(records));
}

export async function getLibrarySourceAudits(): Promise<ChapterSourceAudit[]> {
  const records = await readReviewRecords();
  const recordsById = readReviewMap(records);
  return getBooks().flatMap((book) =>
    book.chapters.map((chapter) => auditChapter(book, chapter, recordsById)),
  );
}

export async function getLibrarySourceSummary(): Promise<LibrarySourceSummary> {
  return summarizeAudits(await getLibrarySourceAudits());
}

function hasReviewText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length >= 3;
}

function hasReviewEvidenceDate(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}

function qualityChecklistComplete(evidence: Book["reviewEvidence"]): boolean {
  const checklist = evidence?.qualityChecklist;
  return Boolean(
    checklist?.titleAndPromiseAccurate &&
      checklist.chapterContentComplete &&
      checklist.sourcesRelevantAndSpecific &&
      checklist.noUnsupportedClaims &&
      checklist.exercisesUsefulAndSafe &&
      checklist.audienceAndToneApproved,
  );
}

function hasReviewerSignoff(params: {
  reviewer?: unknown;
  reviewedAt?: unknown;
  notes?: unknown;
}): boolean {
  return (
    hasReviewText(params.reviewer) &&
    hasReviewEvidenceDate(params.reviewedAt) &&
    hasReviewText(params.notes)
  );
}

function publicationReviewState(book: Book): {
  sensitive: boolean;
  editorialComplete: boolean;
  sourceComplete: boolean;
  checklistComplete: boolean;
  scholarComplete: boolean;
  publishComplete: boolean;
  bookComplete: boolean;
  missingEvidence: string[];
} {
  const evidence = book.reviewEvidence;
  const sensitive = SENSITIVE_CATEGORIES.has(book.category);
  const editorialComplete = hasReviewerSignoff({
    reviewer: evidence?.editorialReviewer,
    reviewedAt: evidence?.editorialReviewedAt,
    notes: evidence?.editorialNotes,
  });
  const sourceComplete = hasReviewerSignoff({
    reviewer: evidence?.sourceReviewer,
    reviewedAt: evidence?.sourceReviewedAt,
    notes: evidence?.sourceNotes,
  });
  const checklistComplete = qualityChecklistComplete(evidence);
  const scholarComplete =
    !sensitive ||
    (hasReviewerSignoff({
      reviewer: evidence?.qualifiedScholarReviewer,
      reviewedAt: evidence?.qualifiedScholarReviewedAt,
      notes: evidence?.scholarNotes,
    }) &&
      hasReviewText(evidence?.scholarReviewScope));
  const publishComplete =
    evidence?.approvedForPublication === true &&
    hasReviewerSignoff({
      reviewer: evidence?.publishApprover,
      reviewedAt: evidence?.publishApprovedAt,
      notes: evidence?.publishNotes,
    });
  const missingEvidence = [
    !editorialComplete ? "Editorial review evidence" : null,
    !sourceComplete ? "Source relevance review evidence" : null,
    !checklistComplete ? "Completed quality checklist" : null,
    !scholarComplete ? "Qualified scholar review scope and notes" : null,
    !publishComplete ? "Publish approval decision" : null,
  ].filter((item): item is string => Boolean(item));
  const bookComplete = missingEvidence.length === 0;

  return {
    sensitive,
    editorialComplete,
    sourceComplete,
    checklistComplete,
    scholarComplete,
    publishComplete,
    bookComplete,
    missingEvidence,
  };
}

export function getLibraryPublicationReviewSummary(): LibraryPublicationReviewSummary {
  return getBooks().reduce<LibraryPublicationReviewSummary>(
    (summary, book) => {
      const reviewState = publicationReviewState(book);

      return {
        totalBooks: summary.totalBooks + 1,
        publishedBooks:
          summary.publishedBooks +
          (book.verifiedContentStatus === "published" &&
          reviewState.bookComplete
            ? 1
            : 0),
        booksMissingEvidence:
          summary.booksMissingEvidence + (reviewState.bookComplete ? 0 : 1),
        editorialPending:
          summary.editorialPending + (reviewState.editorialComplete ? 0 : 1),
        sourceReviewPending:
          summary.sourceReviewPending + (reviewState.sourceComplete ? 0 : 1),
        qualityChecklistPending:
          summary.qualityChecklistPending +
          (reviewState.checklistComplete ? 0 : 1),
        qualifiedScholarPending:
          summary.qualifiedScholarPending +
          (reviewState.scholarComplete ? 0 : 1),
        publishDecisionPending:
          summary.publishDecisionPending +
          (reviewState.publishComplete ? 0 : 1),
        sensitiveBooks:
          summary.sensitiveBooks + (reviewState.sensitive ? 1 : 0),
      };
    },
    {
      totalBooks: 0,
      publishedBooks: 0,
      booksMissingEvidence: 0,
      editorialPending: 0,
      sourceReviewPending: 0,
      qualityChecklistPending: 0,
      qualifiedScholarPending: 0,
      publishDecisionPending: 0,
      sensitiveBooks: 0,
    },
  );
}

export function getLibraryPublicationReviewQueue(): LibraryPublicationReviewItem[] {
  return getBooks()
    .map((book) => {
      const reviewState = publicationReviewState(book);
      return {
        bookId: book.id,
        title: book.title,
        category: book.category,
        requiredPlan: book.requiredPlan,
        verifiedContentStatus: book.verifiedContentStatus,
        chapterCount: book.chapters.length,
        sourceRefCount: book.chapters.reduce(
          (total, chapter) => total + chapter.sourceRefs.length,
          0,
        ),
        sensitive: reviewState.sensitive,
        priorityLabel: reviewState.sensitive
          ? "Qualified scholar first"
          : book.requiredPlan === "free"
            ? "Editorial first"
            : "Standard editorial",
        missingEvidence: reviewState.missingEvidence,
      };
    })
    .filter((item) => item.missingEvidence.length > 0)
    .sort((a, b) => {
      if (a.sensitive !== b.sensitive) return a.sensitive ? -1 : 1;
      if (a.requiredPlan !== b.requiredPlan) {
        if (a.requiredPlan === "free") return -1;
        if (b.requiredPlan === "free") return 1;
      }
      return a.title.localeCompare(b.title);
    });
}

export function buildLibraryPublicationReviewShareText(
  summary: LibraryPublicationReviewSummary,
): string {
  return [
    "NurAI Library publication sign-off handoff",
    "",
    `${summary.publishedBooks}/${summary.totalBooks} books have complete publication approval evidence.`,
    `${summary.booksMissingEvidence} books still need one or more review records before NurAI can claim they are fully reviewed or published.`,
    "",
    "Pending evidence:",
    `- Editorial review: ${summary.editorialPending}`,
    `- Source relevance review: ${summary.sourceReviewPending}`,
    `- Quality checklist: ${summary.qualityChecklistPending}`,
    `- Qualified scholar review for high-care books: ${summary.qualifiedScholarPending}/${summary.sensitiveBooks}`,
    `- Publish decision: ${summary.publishDecisionPending}`,
    "",
    "Required before approval: current content hash, real reviewer names, valid dates, specific notes, completed quality checklist, qualified scholar scope where needed, and approvedForPublication true.",
  ].join("\n");
}

export function buildBookPublicationReviewShareText(
  item: LibraryPublicationReviewItem,
): string {
  return [
    `NurAI Library book review handoff: ${item.title}`,
    "",
    `Book ID: ${item.bookId}`,
    `Category: ${item.category}`,
    `Plan: ${item.requiredPlan}`,
    `Status: ${item.verifiedContentStatus}`,
    `Chapters: ${item.chapterCount}`,
    `Source cards: ${item.sourceRefCount}`,
    `Priority: ${item.priorityLabel}`,
    "",
    "Missing evidence:",
    ...item.missingEvidence.map((evidence) => `- ${evidence}`),
    "",
    "Do not mark this book published until real reviewer names, dates, notes, current content hash, checklist completion, and publish approval are recorded.",
  ].join("\n");
}

function bookAcceptanceStageForEvidence(
  missingEvidence: string,
): LibraryReviewBookAcceptancePacketStage | null {
  if (missingEvidence === "Editorial review evidence") {
    return {
      id: "editorial",
      label: "Editorial review",
      ownerLabel: "Editorial reviewer",
      statusLabel: "Missing",
      requiredFields: [
        "editorialReviewer",
        "editorialReviewedAt",
        "editorialNotes",
      ],
      reviewerMustConfirmLabel:
        "The title, promise, chapter order, audience level, exercises, and tone match the actual book.",
      rejectIfLabel:
        "Reject if the book feels thin, overpromises, repeats generic material, or needs rewriting before review.",
      claimBoundaryLabel:
        "Editorial acceptance clears content quality only; it is not source relevance, scholar review, or publication approval.",
      icon: "edit-3",
      tone: "primary",
    };
  }

  if (missingEvidence === "Source relevance review evidence") {
    return {
      id: "source_relevance",
      label: "Source relevance",
      ownerLabel: "Source reviewer",
      statusLabel: "Missing",
      requiredFields: ["sourceReviewer", "sourceReviewedAt", "sourceNotes"],
      reviewerMustConfirmLabel:
        "Every source card is relevant to the chapter and supports the claim it is attached to.",
      rejectIfLabel:
        "Reject broad anchors, unrelated source cards, repeated generic notes, or links that do not support the claim.",
      claimBoundaryLabel:
        "Source relevance review does not turn sensitive guidance into a personal ruling.",
      icon: "link",
      tone: "primary",
    };
  }

  if (missingEvidence === "Completed quality checklist") {
    return {
      id: "quality_checklist",
      label: "Quality checklist",
      ownerLabel: "QA reviewer",
      statusLabel: "Missing",
      requiredFields: [
        "titleAndPromiseAccurate",
        "chapterContentComplete",
        "sourcesRelevantAndSpecific",
        "noUnsupportedClaims",
        "exercisesUsefulAndSafe",
        "audienceAndToneApproved",
      ],
      reviewerMustConfirmLabel:
        "The publication checklist is complete and every field is true for the same content hash.",
      rejectIfLabel:
        "Reject if one checklist field is missing, false, or only implied by notes.",
      claimBoundaryLabel:
        "Checklist completion is required evidence, but it still does not approve publication by itself.",
      icon: "check-square",
      tone: "scholar",
    };
  }

  if (missingEvidence === "Qualified scholar review scope and notes") {
    return {
      id: "qualified_scholar",
      label: "Qualified scholar review",
      ownerLabel: "Qualified scholar",
      statusLabel: "Missing",
      requiredFields: [
        "qualifiedScholarReviewer",
        "qualifiedScholarReviewedAt",
        "scholarReviewScope",
        "scholarNotes",
      ],
      reviewerMustConfirmLabel:
        "The scholar notes name exactly which worship, family, wealth, revert, or other high-care scope was checked.",
      rejectIfLabel:
        "Reject unscoped approval, private legal advice, unsupported hadith grading, or guidance tied to changed content.",
      claimBoundaryLabel:
        "Qualified review applies only to the recorded scope and current content hash.",
      icon: "award",
      tone: "scholar",
    };
  }

  if (missingEvidence === "Publish approval decision") {
    return {
      id: "publish_decision",
      label: "Publish approval",
      ownerLabel: "Publish approver",
      statusLabel: "Missing",
      requiredFields: [
        "approvedForPublication",
        "publishApprover",
        "publishApprovedAt",
        "publishNotes",
        "contentHash",
      ],
      reviewerMustConfirmLabel:
        "Publication approval happens only after all required earlier evidence is complete for this book.",
      rejectIfLabel:
        "Reject if the content hash changed, notes are thin, approval predates required reviews, or a partial import is being overclaimed.",
      claimBoundaryLabel:
        "Publish approval is the only stage that can move this book toward public completion claims.",
      icon: "send",
      tone: "warning",
    };
  }

  return null;
}

export function buildLibraryReviewBookAcceptancePackets(
  queue: LibraryPublicationReviewItem[],
): LibraryReviewBookAcceptancePacket[] {
  return queue.slice(0, 8).map((book) => {
    const evidenceFilePath = `/absolute/path/to/${book.bookId}-library-review-evidence.json`;
    const stages = book.missingEvidence
      .map(bookAcceptanceStageForEvidence)
      .filter((stage): stage is LibraryReviewBookAcceptancePacketStage =>
        Boolean(stage),
      );

    return {
      bookId: book.bookId,
      title: book.title,
      category: book.category,
      priorityLabel: book.priorityLabel,
      statusLabel: `${stages.length} acceptance stage${stages.length === 1 ? "" : "s"} missing`,
      reviewerPathLabel: book.sensitive
        ? "High-care book: scholar scope must be recorded before publish approval."
        : "Standard book: editorial, source, QA, and publish evidence must stay separated.",
      exportCommandLabel: `npm run export:library-review-evidence-intake -- --write --book-id ${book.bookId} --out ${evidenceFilePath}`,
      evidenceFileLabel: evidenceFilePath,
      contentHashLabel:
        "Content hash must be copied from the freshly exported intake packet and preserved by every reviewer.",
      highCareBoundaryLabel: book.sensitive
        ? "Do not call this book scholar-reviewed until qualified scope, reviewer, date, notes, and matching content hash validate."
        : "Do not apply a scholar-reviewed claim to this book unless a qualified review is explicitly recorded.",
      noSecretBoundaryLabel:
        "Do not include private contact details, credentials, screenshots, chat transcripts, cookies, auth headers, or database URLs in the evidence file.",
      handoffChecklist: [
        "Export a fresh per-book packet before review starts.",
        "Keep reviewer lanes separate: editorial, source, QA, scholar if required, and publish approval.",
        "Require real reviewer name, role, date, scoped notes, and matching contentHash.",
        "Validate and dry-run the returned JSON before any guarded import.",
      ],
      stages,
      shareLabel: "Share acceptance packet",
    };
  });
}

export function buildLibraryReviewBookAcceptancePacketShareText(
  packet: LibraryReviewBookAcceptancePacket,
): string {
  return [
    `NurAI Library book acceptance packet: ${packet.title}`,
    "",
    `Book ID: ${packet.bookId}`,
    `Category: ${packet.category}`,
    `Priority: ${packet.priorityLabel}`,
    `Status: ${packet.statusLabel}`,
    `Reviewer path: ${packet.reviewerPathLabel}`,
    "",
    `Export command: ${packet.exportCommandLabel}`,
    `Evidence file: ${packet.evidenceFileLabel}`,
    `Content hash rule: ${packet.contentHashLabel}`,
    "",
    "Missing acceptance stages:",
    ...packet.stages.map(
      (stage) =>
        `- ${stage.label} (${stage.ownerLabel}): ${stage.requiredFields.join(", ")}. Boundary: ${stage.claimBoundaryLabel}`,
    ),
    "",
    "Handoff checklist:",
    ...packet.handoffChecklist.map((item) => `- ${item}`),
    "",
    `High-care boundary: ${packet.highCareBoundaryLabel}`,
    `No-secret boundary: ${packet.noSecretBoundaryLabel}`,
    "",
    "This packet is coordination only. It is not approval evidence until the returned JSON validates, dry-runs, imports, and the strict Library completion gate passes.",
  ].join("\n");
}

export function buildLibraryReviewCompletionPlan(
  summary: LibraryPublicationReviewSummary,
  queue: LibraryPublicationReviewItem[],
): LibraryReviewCompletionPlan {
  const totalEvidenceCount = summary.totalBooks * 4 + summary.sensitiveBooks;
  const pendingEvidenceCount =
    summary.editorialPending +
    summary.sourceReviewPending +
    summary.qualityChecklistPending +
    summary.qualifiedScholarPending +
    summary.publishDecisionPending;
  const completedEvidenceCount = Math.max(
    0,
    totalEvidenceCount - pendingEvidenceCount,
  );
  const completionPercent =
    totalEvidenceCount > 0
      ? Math.round((completedEvidenceCount / totalEvidenceCount) * 100)
      : 100;
  const nextBook = queue[0];

  return {
    releaseStateLabel:
      summary.booksMissingEvidence === 0
        ? "Publication evidence complete"
        : "Human review evidence still blocks highest-standard release",
    progressLabel: `${completedEvidenceCount}/${totalEvidenceCount} review evidence lanes complete`,
    completedEvidenceCount,
    totalEvidenceCount,
    completionPercent,
    blockerLabel:
      summary.booksMissingEvidence === 0
        ? "No book-level evidence blockers remain."
        : `${summary.booksMissingEvidence} book${summary.booksMissingEvidence === 1 ? "" : "s"} still need real reviewer names, dates, notes, checklist completion, and publish approval.`,
    nextBookLabel: nextBook
      ? `Start with ${nextBook.title} (${nextBook.priorityLabel}).`
      : "No pending book handoffs remain.",
    guardrail:
      "Do not mark a book published, qualified-review complete, or highest-standard complete until the current-content review evidence is imported and validated.",
    lanes: [
      {
        id: "editorial",
        label: "Editorial",
        pending: summary.editorialPending,
        total: summary.totalBooks,
        ownerLabel: "Editor",
        nextAction: "Confirm title, chapter substance, tone, and promises.",
      },
      {
        id: "source_relevance",
        label: "Sources",
        pending: summary.sourceReviewPending,
        total: summary.totalBooks,
        ownerLabel: "Source reviewer",
        nextAction: "Confirm every source card supports the chapter claim.",
      },
      {
        id: "quality_checklist",
        label: "Checklist",
        pending: summary.qualityChecklistPending,
        total: summary.totalBooks,
        ownerLabel: "QA reviewer",
        nextAction: "Complete the publication quality checklist.",
      },
      {
        id: "qualified_scholar",
        label: "Scholar",
        pending: summary.qualifiedScholarPending,
        total: summary.sensitiveBooks,
        ownerLabel: "Qualified scholar",
        nextAction: "Review sensitive books with scope and notes.",
      },
      {
        id: "publish_decision",
        label: "Publish",
        pending: summary.publishDecisionPending,
        total: summary.totalBooks,
        ownerLabel: "Publisher",
        nextAction: "Record final approval after all evidence is complete.",
      },
    ],
  };
}

export function buildLibraryReviewStageContracts(
  plan: LibraryReviewCompletionPlan,
): LibraryReviewStageContract[] {
  const laneById = Object.fromEntries(
    plan.lanes.map((lane) => [lane.id, lane]),
  );

  return [
    {
      id: "editorial_review",
      label: "Editorial review",
      ownerLabel: "Editorial reviewer",
      pending: laneById.editorial?.pending ?? 0,
      total: laneById.editorial?.total ?? 0,
      requiredEvidenceFields: [
        "editorialReviewer",
        "editorialReviewedAt",
        "editorialNotes",
        "title and chapter checklist fields",
      ],
      reviewerMustConfirmLabel:
        "Title, subtitle, description, chapter sequence, audience level, and tone match the book content.",
      rejectIfLabel:
        "Reject if chapters are thin, mismatched to the promise, unsafe for the audience, or still feel like draft material.",
      claimBoundaryLabel:
        "Editorial review supports content quality only; it is not source, scholar, or publish approval.",
      icon: "edit-3",
      tone: "primary",
    },
    {
      id: "source_relevance_review",
      label: "Source relevance",
      ownerLabel: "Source reviewer",
      pending: laneById.source_relevance?.pending ?? 0,
      total: laneById.source_relevance?.total ?? 0,
      requiredEvidenceFields: [
        "sourceReviewer",
        "sourceReviewedAt",
        "sourceNotes",
        "source specificity checklist fields",
      ],
      reviewerMustConfirmLabel:
        "Every source card is relevant to its chapter and supports the claims being made.",
      rejectIfLabel:
        "Reject broad URLs, repeated generic anchors, unrelated cards, or sources used for claims they do not establish.",
      claimBoundaryLabel:
        "Source relevance review does not make sensitive guidance a personal ruling.",
      icon: "link",
      tone: "primary",
    },
    {
      id: "qualified_scholar_review",
      label: "Qualified scholar",
      ownerLabel: "Qualified scholar reviewer",
      pending: laneById.qualified_scholar?.pending ?? 0,
      total: laneById.qualified_scholar?.total ?? 0,
      requiredEvidenceFields: [
        "qualifiedScholarReviewer",
        "qualifiedScholarReviewedAt",
        "scholarReviewScope",
        "scholarNotes",
      ],
      reviewerMustConfirmLabel:
        "High-care fiqh, hadith, family, finance, pilgrimage, and worship topics record exactly what was reviewed.",
      rejectIfLabel:
        "Reject if personal rulings, madhhab-specific direction, hadith grading, or worship instructions lack qualified scope notes.",
      claimBoundaryLabel:
        "Scholar review applies only to the recorded scope and current content hash.",
      icon: "award",
      tone: "scholar",
    },
    {
      id: "publish_approval",
      label: "Publish approval",
      ownerLabel: "Publish approver",
      pending: laneById.publish_decision?.pending ?? 0,
      total: laneById.publish_decision?.total ?? 0,
      requiredEvidenceFields: [
        "publishApprover",
        "publishApprovedAt",
        "publishNotes",
        "approvedForPublication",
        "contentHash",
      ],
      reviewerMustConfirmLabel:
        "Approval happens only after the required earlier stages are complete for the same content hash.",
      rejectIfLabel:
        "Reject if hashes changed, notes are thin, checklist fields are incomplete, or approval predates required reviews.",
      claimBoundaryLabel:
        "Publish approval is the only stage that can move a book toward public completion claims.",
      icon: "send",
      tone: "warning",
    },
  ];
}

function buildEvidenceBatch(params: {
  id: LibraryReviewEvidenceBatch["id"];
  title: string;
  ownerLabel: string;
  description: string;
  shareLabel: string;
  queue: LibraryPublicationReviewItem[];
  evidenceLabels: string[];
  filter: (item: LibraryPublicationReviewItem) => boolean;
}): LibraryReviewEvidenceBatch {
  const books = params.queue.filter(params.filter);
  const acceptanceChecklist = [
    "Reviewer identity, role, and review date are present.",
    "Evidence references the current content hash for every included book.",
    "Notes are specific enough to explain what was checked and what changed.",
    "Approval decisions are separated from staged reviewer handoff text.",
  ];
  return {
    id: params.id,
    title: params.title,
    ownerLabel: params.ownerLabel,
    description: params.description,
    bookCount: books.length,
    sensitiveCount: books.filter((book) => book.sensitive).length,
    missingEvidenceCount: books.reduce(
      (total, book) =>
        total +
        book.missingEvidence.filter((evidence) =>
          params.evidenceLabels.includes(evidence),
        ).length,
      0,
    ),
    firstBookTitles: books.slice(0, 5).map((book) => book.title),
    bookIds: books.slice(0, 12).map((book) => book.bookId),
    evidenceNeeded: params.evidenceLabels,
    acceptanceChecklist,
    proofBoundaryLabel:
      "Accept this batch only after validation passes for the exported evidence file; a shared handoff is not approval evidence.",
    shareLabel: params.shareLabel,
  };
}

export function buildLibraryReviewEvidenceBatches(
  queue: LibraryPublicationReviewItem[],
): LibraryReviewEvidenceBatch[] {
  return [
    buildEvidenceBatch({
      id: "qualified_scholar",
      title: "High-care scholar batch",
      ownerLabel: "Qualified scholar reviewer",
      description:
        "Sensitive worship, family, wealth, and revert books that need qualified review scope and notes before publication decisions.",
      shareLabel: "Share scholar batch",
      queue,
      evidenceLabels: ["Qualified scholar review scope and notes"],
      filter: (item) =>
        item.missingEvidence.includes(
          "Qualified scholar review scope and notes",
        ),
    }),
    buildEvidenceBatch({
      id: "source_relevance",
      title: "Source relevance batch",
      ownerLabel: "Source reviewer",
      description:
        "Books needing human confirmation that every source card directly supports the chapter content.",
      shareLabel: "Share source batch",
      queue,
      evidenceLabels: ["Source relevance review evidence"],
      filter: (item) =>
        item.missingEvidence.includes("Source relevance review evidence"),
    }),
    buildEvidenceBatch({
      id: "editorial",
      title: "Editorial promise batch",
      ownerLabel: "Editorial reviewer",
      description:
        "Books needing title, subtitle, chapter substance, audience, and tone review before sign-off.",
      shareLabel: "Share editorial batch",
      queue,
      evidenceLabels: ["Editorial review evidence"],
      filter: (item) =>
        item.missingEvidence.includes("Editorial review evidence"),
    }),
    buildEvidenceBatch({
      id: "quality_checklist",
      title: "Quality checklist batch",
      ownerLabel: "QA reviewer",
      description:
        "Books needing final checklist confirmation for promise accuracy, safe exercises, source specificity, and unsupported-claim checks.",
      shareLabel: "Share QA batch",
      queue,
      evidenceLabels: ["Completed quality checklist"],
      filter: (item) =>
        item.missingEvidence.includes("Completed quality checklist"),
    }),
    buildEvidenceBatch({
      id: "publish_decision",
      title: "Publish decision batch",
      ownerLabel: "Publisher",
      description:
        "Books needing final approval only after reviewer evidence is valid for the current content hash.",
      shareLabel: "Share publish batch",
      queue,
      evidenceLabels: ["Publish approval decision"],
      filter: (item) =>
        item.missingEvidence.includes("Publish approval decision"),
    }),
  ].filter((batch) => batch.bookCount > 0);
}

export function buildLibraryReviewEvidenceBatchShareText(
  batch: LibraryReviewEvidenceBatch,
): string {
  return [
    `NurAI Library review batch: ${batch.title}`,
    "",
    `Owner: ${batch.ownerLabel}`,
    `Books: ${batch.bookCount}`,
    `High-care books: ${batch.sensitiveCount}`,
    `Missing evidence records in this batch: ${batch.missingEvidenceCount}`,
    "",
    "Evidence needed:",
    ...batch.evidenceNeeded.map((evidence) => `- ${evidence}`),
    "",
    "Acceptance checklist:",
    ...batch.acceptanceChecklist.map((item) => `- ${item}`),
    "",
    `Proof boundary: ${batch.proofBoundaryLabel}`,
    "",
    "First books:",
    ...(batch.firstBookTitles.length > 0
      ? batch.firstBookTitles.map((title) => `- ${title}`)
      : ["- No pending books in this batch"]),
    "",
    "Book IDs for reviewer packet lookup:",
    ...(batch.bookIds.length > 0
      ? batch.bookIds.map((bookId) => `- ${bookId}`)
      : ["- none"]),
    "",
    "Guardrail: do not mark any book published or highest-standard complete until current-content review evidence is imported and validated.",
  ].join("\n");
}

export function buildLibraryReviewEvidenceIntakeRunbook(params: {
  summary: LibraryPublicationReviewSummary;
  queue: LibraryPublicationReviewItem[];
  batches: LibraryReviewEvidenceBatch[];
}): LibraryReviewEvidenceIntakeRunbook {
  const priorityBatch = params.batches[0];
  const nextBook = params.queue[0];
  const reviewerPacketCount = params.queue.length;
  const scopedEvidenceFile = priorityBatch
    ? `/absolute/path/to/${priorityBatch.id}-library-review-evidence.json`
    : nextBook
      ? `/absolute/path/to/${nextBook.bookId}-library-review-evidence.json`
      : "/absolute/path/to/completed-review-evidence.json";
  const scopedWriteFlag =
    priorityBatch || nextBook ? " --allow-partial-import" : "";
  const scopedExport =
    priorityBatch?.id === "qualified_scholar"
      ? `npm run export:library-review-evidence-intake -- --write --priority qualified-scholar --out ${scopedEvidenceFile}`
      : nextBook
        ? `npm run export:library-review-evidence-intake -- --write --book-id ${nextBook.bookId} --out ${scopedEvidenceFile}`
        : `npm run export:library-review-evidence-intake -- --write --out ${scopedEvidenceFile}`;

  return {
    title: "Evidence intake runbook",
    statusLabel:
      params.summary.booksMissingEvidence === 0
        ? "No intake export needed"
        : `${params.summary.booksMissingEvidence} books still need validated reviewer evidence`,
    reviewerScopeLabel: priorityBatch
      ? `${priorityBatch.ownerLabel}: ${priorityBatch.bookCount} book${priorityBatch.bookCount === 1 ? "" : "s"}`
      : "All reviewer lanes are clear",
    reviewerPacketCount,
    claimBoundaryLabel:
      priorityBatch || nextBook
        ? "Staged evidence only clears the exported reviewer scope; it does not support whole-library publication or scholar-reviewed claims."
        : "Complete-library evidence is required before NurAI can make whole-library publication or highest-standard claims.",
    commandLines: [
      scopedExport,
      `npm run validate:library-review-evidence -- --file ${scopedEvidenceFile} --summary-json`,
      `npm run apply:library-review-evidence -- --file ${scopedEvidenceFile} --summary-json`,
      `npm run apply:library-review-evidence -- --file ${scopedEvidenceFile} --write${scopedWriteFlag}`,
      "npm run check:library-content-completion",
      "npm run check:goal-completion -- --summary-json",
    ],
    guardrail:
      "Do not paste reviewer notes into source code manually; export the intake outside the repo, complete it as controlled evidence, validate it, then import only passing evidence for the current content hash.",
    shareLabel: "Share intake runbook",
  };
}

export function buildLibraryReviewEvidenceIntakeRunbookShareText(
  runbook: LibraryReviewEvidenceIntakeRunbook,
): string {
  return [
    "NurAI Library review evidence intake runbook",
    "",
    `Status: ${runbook.statusLabel}`,
    `Reviewer scope: ${runbook.reviewerScopeLabel}`,
    `Books awaiting evidence: ${runbook.reviewerPacketCount}`,
    `Claim boundary: ${runbook.claimBoundaryLabel}`,
    "",
    "Command path:",
    ...runbook.commandLines.map((command) => `- ${command}`),
    "",
    `Guardrail: ${runbook.guardrail}`,
  ].join("\n");
}

export function buildLibraryReviewNextAction(params: {
  plan: LibraryReviewCompletionPlan;
  queue: LibraryPublicationReviewItem[];
  batches: LibraryReviewEvidenceBatch[];
  runbook: LibraryReviewEvidenceIntakeRunbook;
}): LibraryReviewNextAction {
  const priorityBatch = params.batches[0];
  const nextBook = params.queue[0];
  const firstCommand =
    params.runbook.commandLines[0] ||
    "npm run export:library-review-evidence-intake -- --write";

  if (!priorityBatch || !nextBook) {
    return {
      title: "No reviewer handoff pending",
      ownerLabel: "All owners",
      laneLabel: params.plan.releaseStateLabel,
      actionLabel: "Run the completion gate before making release claims.",
      packetLabel: "No pending review packet",
      commandLabel:
        "npm run check:library-content-completion -- --summary-json",
      evidenceLabel: params.plan.progressLabel,
      acceptanceChecklist: [
        "Strict completion gate passes without review-pending allowances.",
        "No book-level publication blocker remains in the current content audit.",
        "Release claims still wait for deployed runtime and production database proof.",
      ],
      guardrail:
        "Only use this state after the strict completion gate confirms current-content evidence.",
      batchId: null,
      shareLabel: "Share completion check",
    };
  }

  return {
    title: "Next reviewer handoff",
    ownerLabel: priorityBatch.ownerLabel,
    laneLabel: priorityBatch.title,
    actionLabel: priorityBatch.description,
    packetLabel: `Start packet: ${nextBook.title} (${nextBook.priorityLabel})`,
    commandLabel: firstCommand,
    evidenceLabel: priorityBatch.evidenceNeeded.join(", "),
    acceptanceChecklist: priorityBatch.acceptanceChecklist,
    guardrail:
      "This is a reviewer handoff, not approval evidence. Complete one owner lane, validate the returned evidence file, then import it through the guarded command path.",
    batchId: priorityBatch.id,
    shareLabel: "Share next action",
  };
}

export function buildLibraryReviewEvidenceAcceptanceContract(params: {
  plan: LibraryReviewCompletionPlan;
  runbook: LibraryReviewEvidenceIntakeRunbook;
  nextAction: LibraryReviewNextAction;
  batches: LibraryReviewEvidenceBatch[];
}): LibraryReviewEvidenceAcceptanceContract {
  const priorityBatch = params.batches[0];
  const complete = params.plan.completionPercent === 100;
  const validationCommand =
    params.runbook.commandLines.find((command) =>
      command.includes("validate:library-review-evidence"),
    ) ?? "npm run validate:library-review-evidence -- --summary-json";
  const importCommand =
    params.runbook.commandLines.find((command) =>
      command.includes("apply:library-review-evidence"),
    ) ?? "npm run apply:library-review-evidence -- --summary-json";

  return {
    title: "Library evidence acceptance contract",
    statusLabel: complete
      ? "Evidence lanes ready for strict completion check"
      : `${params.plan.completedEvidenceCount}/${params.plan.totalEvidenceCount} evidence lanes accepted`,
    summary:
      "NurAI only accepts reviewer evidence that names who reviewed, what scope was checked, when it was checked, and which current content hash it applies to.",
    acceptedEvidenceTitle: "Accepted evidence",
    rejectedEvidenceTitle: "Rejected evidence",
    validationTitle: "Validation path",
    claimBoundaryLabel:
      "Reviewer handoffs, screenshots, and notes do not unlock Library completion claims until the evidence file validates and imports through the guarded command path.",
    acceptedEvidence: [
      {
        id: "identity-date-notes",
        label: "Reviewer identity, date, and notes",
        detail:
          "Every accepted record includes a real reviewer name, role, valid review date, and specific notes.",
        statusLabel: "Required",
        icon: "user-check",
        tone: "primary",
      },
      {
        id: "content-hash-scope",
        label: "Current content hash and scope",
        detail:
          "Evidence must name the content hash and the exact editorial, source, qualified review, QA, or publish scope.",
        statusLabel: "Required",
        icon: "hash",
        tone: "scholar",
      },
      {
        id: "lane-specific-fields",
        label: "Lane-specific fields",
        detail: priorityBatch
          ? `${priorityBatch.ownerLabel} must complete: ${priorityBatch.evidenceNeeded.join(", ")}.`
          : "All lane-specific evidence fields are present.",
        statusLabel: priorityBatch ? "Pending lane" : "Complete",
        icon: "check-square",
        tone: priorityBatch ? "warning" : "primary",
      },
    ],
    rejectedEvidence: [
      {
        id: "handoff-only",
        label: "Handoff-only notes",
        detail:
          "A shared packet or reviewer handoff is coordination, not approval evidence.",
        statusLabel: "Reject",
        icon: "x-circle",
        tone: "warning",
      },
      {
        id: "stale-content",
        label: "Stale content evidence",
        detail:
          "Reject evidence if the book changed after review or the content hash no longer matches.",
        statusLabel: "Reject",
        icon: "refresh-cw",
        tone: "warning",
      },
      {
        id: "whole-library-overclaim",
        label: "Whole-library overclaim",
        detail:
          "Partial imports only clear their exported reviewer scope and never support whole-library publication claims.",
        statusLabel: "Reject",
        icon: "lock",
        tone: "warning",
      },
    ],
    validationSteps: [
      {
        id: "export-intake",
        label: "Export scoped intake",
        detail: params.runbook.commandLines[0],
        statusLabel: "Step 1",
        icon: "download",
        tone: "primary",
      },
      {
        id: "validate-evidence",
        label: "Validate evidence file",
        detail: validationCommand,
        statusLabel: "Step 2",
        icon: "shield",
        tone: "scholar",
      },
      {
        id: "guarded-import",
        label: "Import through guard",
        detail: importCommand,
        statusLabel: "Step 3",
        icon: "upload-cloud",
        tone: "warning",
      },
      {
        id: "strict-completion",
        label: "Run strict completion",
        detail: params.nextAction.acceptanceChecklist[0],
        statusLabel: "Final gate",
        icon: "check-circle",
        tone: complete ? "primary" : "warning",
      },
    ],
  };
}

export function buildLibraryReviewEvidenceImportReadinessContract(params: {
  summary: LibraryPublicationReviewSummary;
  plan: LibraryReviewCompletionPlan;
  runbook: LibraryReviewEvidenceIntakeRunbook;
}): LibraryReviewEvidenceImportReadinessContract {
  const exportCommand =
    params.runbook.commandLines.find((command) =>
      command.includes("export:library-review-evidence-intake"),
    ) ?? "npm run export:library-review-evidence-intake -- --write";
  const validateCommand =
    params.runbook.commandLines.find((command) =>
      command.includes("validate:library-review-evidence"),
    ) ??
    "npm run validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --strict --summary-json";
  const dryRunCommand =
    params.runbook.commandLines.find(
      (command) =>
        command.includes("apply:library-review-evidence") &&
        command.includes("--summary-json"),
    ) ??
    "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --summary-json";
  const writeCommand =
    params.runbook.commandLines.find(
      (command) =>
        command.includes("apply:library-review-evidence") &&
        command.includes("--write"),
    ) ??
    "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --write";
  const rebuildCommand =
    "npm run export:library-review-signoff-ledger -- --write && npm run export:library-completion-audit -- --write";
  const strictGateCommand =
    "npm run check:library-content-completion -- --summary-json";

  return {
    title: "Reviewer evidence import readiness",
    statusLabel:
      params.summary.booksMissingEvidence === 0
        ? "Strict Library gate can be checked"
        : `${params.summary.booksMissingEvidence} books still need imported reviewer evidence`,
    summary:
      "This contract keeps reviewer evidence outside source code until a completed JSON file validates, dry-runs, imports, and refreshes the release audit.",
    currentEvidenceLabel: `${params.plan.completedEvidenceCount}/${params.plan.totalEvidenceCount} evidence lanes accepted in code`,
    blockingEvidenceLabel: `${params.summary.qualifiedScholarPending}/${params.summary.sensitiveBooks} high-care books still need qualified review evidence; ${params.summary.publishDecisionPending}/${params.summary.totalBooks} books still need publish decisions.`,
    privacyBoundaryLabel:
      "Do not place private contact details, credentials, screenshots, or informal chat approvals in the repo. Store only the minimum reviewer name, role, date, scoped notes, and current content hash needed for audit.",
    claimBoundaryLabel:
      "Generated packets, reviewer handoffs, and draft notes are coordination artifacts. Only validated imports for the current content hash can clear their recorded scope.",
    items: [
      {
        id: "export-controlled-intake",
        label: "Export controlled intake",
        detail:
          "Start from a fresh blank intake file so reviewers fill current hashes instead of editing source code directly.",
        commandLabel: exportCommand,
        statusLabel: "Step 1",
        icon: "download",
        tone: "primary",
      },
      {
        id: "validate-strict-evidence",
        label: "Validate returned evidence",
        detail:
          "Validation rejects stale hashes, thin notes, missing dates, missing checklist fields, and unsupported approval sequencing.",
        commandLabel: validateCommand,
        statusLabel: "Step 2",
        icon: "shield",
        tone: "scholar",
      },
      {
        id: "dry-run-import",
        label: "Dry-run import",
        detail:
          "Confirm exactly which book records would change before writing any guarded reviewEvidence blocks.",
        commandLabel: dryRunCommand,
        statusLabel: "Step 3",
        icon: "terminal",
        tone: "primary",
      },
      {
        id: "write-guarded-import",
        label: "Write through importer",
        detail:
          "Use --write only after validation and dry run pass; staged writes must keep --allow-partial-import and scoped claims.",
        commandLabel: writeCommand,
        statusLabel: "Step 4",
        icon: "upload-cloud",
        tone: "warning",
      },
      {
        id: "rebuild-release-ledgers",
        label: "Refresh ledgers and gates",
        detail:
          "Regenerate the signoff ledger and completion audit, then run the strict Library gate before public Library claims.",
        commandLabel: `${rebuildCommand} && ${strictGateCommand}`,
        statusLabel: "Final",
        icon: "check-circle",
        tone: "scholar",
      },
    ],
  };
}

export function buildLibraryReviewEvidenceProofMatrix(params: {
  summary: LibraryPublicationReviewSummary;
  plan: LibraryReviewCompletionPlan;
  runbook: LibraryReviewEvidenceIntakeRunbook;
  nextAction: LibraryReviewNextAction;
}): LibraryReviewEvidenceProofMatrix {
  const exportCommand =
    params.runbook.commandLines.find((command) =>
      command.includes("export:library-review-evidence-intake"),
    ) ?? "npm run export:library-review-evidence-intake -- --write";
  const validateCommand =
    params.runbook.commandLines.find((command) =>
      command.includes("validate:library-review-evidence"),
    ) ??
    "npm run validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --summary-json";
  const dryRunCommand =
    params.runbook.commandLines.find(
      (command) =>
        command.includes("apply:library-review-evidence") &&
        command.includes("--summary-json"),
    ) ??
    "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --summary-json";
  const writeCommand =
    params.runbook.commandLines.find(
      (command) =>
        command.includes("apply:library-review-evidence") &&
        command.includes("--write"),
    ) ??
    "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --write";
  const ledgerCommand =
    "npm run export:library-review-signoff-ledger -- --write && npm run export:library-completion-audit -- --write && npm run export:library-title-content-audit -- --write";
  const gateCommand =
    "npm run check:library-content-completion -- --summary-json && npm run check:goal-completion -- --summary-json";
  const complete = params.summary.booksMissingEvidence === 0;

  return {
    title: "Review evidence proof matrix",
    statusLabel: complete
      ? "All book evidence lanes can move to strict verification"
      : `${params.summary.booksMissingEvidence} books still need proof before Library completion`,
    summary:
      "This matrix tells reviewers exactly which artifact proves each Library review step, which command handles it, and which release claim stays blocked.",
    activeBlockerLabel: complete
      ? "Run the strict Library completion and full goal gates before changing release language."
      : `${params.plan.progressLabel}. Next proof focus: ${params.nextAction.packetLabel}.`,
    noSecretBoundaryLabel:
      "Never include private reviewer contact details, credentials, screenshots, chat transcripts, DATABASE_URL values, API keys, cookies, or auth headers in review evidence.",
    claimBoundaryLabel:
      "A proof row is complete only when its command succeeds for current content hashes; shared workplans, packets, and informal approvals do not clear release claims.",
    shareLabel: "Share proof matrix",
    rows: [
      {
        id: "packet_export",
        label: "Export reviewer packet",
        ownerLabel: params.nextAction.ownerLabel,
        statusLabel: params.runbook.reviewerScopeLabel,
        commandLabel: exportCommand,
        proofNeededLabel:
          "Fresh scoped intake file with current book IDs and content hashes.",
        blockerLabel:
          "Without a fresh packet, reviewers may sign off stale content.",
        claimBoundaryLabel:
          "Exported packets are assignments only; they are not review evidence.",
        icon: "download",
        tone: "primary",
      },
      {
        id: "reviewer_completion",
        label: "Complete reviewer evidence",
        ownerLabel: params.nextAction.ownerLabel,
        statusLabel: params.nextAction.evidenceLabel,
        commandLabel:
          "Reviewer fills the exported JSON outside source code with identity, role, date, notes, scope, checklist fields, and content hash.",
        proofNeededLabel:
          "Returned evidence file with real reviewer names, dates, scoped notes, decisions, and matching current content hashes.",
        blockerLabel:
          "Thin notes, missing roles, stale hashes, or unscoped scholar approval keep the book blocked.",
        claimBoundaryLabel:
          "Reviewer completion is still pending until validation and import succeed.",
        icon: "user-check",
        tone: "scholar",
      },
      {
        id: "strict_validation",
        label: "Validate evidence file",
        ownerLabel: "Release operator",
        statusLabel: "Required before import",
        commandLabel: validateCommand,
        proofNeededLabel:
          "Validation summary showing no stale hashes, missing fields, sequence errors, or unsupported approval claims.",
        blockerLabel:
          "Any validation finding blocks import and publication language.",
        claimBoundaryLabel:
          "Passing validation proves file shape and evidence completeness only; it does not write approval evidence.",
        icon: "shield",
        tone: "scholar",
      },
      {
        id: "dry_run_import",
        label: "Dry-run guarded import",
        ownerLabel: "Release operator",
        statusLabel: "Required before write",
        commandLabel: dryRunCommand,
        proofNeededLabel:
          "Dry-run summary naming exactly which books and review scopes would change.",
        blockerLabel:
          "Unexpected books, unscoped partial imports, or stale hashes stop the write.",
        claimBoundaryLabel:
          "Dry run is proof of planned change only; source data remains unchanged.",
        icon: "terminal",
        tone: "primary",
      },
      {
        id: "guarded_write",
        label: "Write imported evidence",
        ownerLabel: "Release operator",
        statusLabel: "Guarded write",
        commandLabel: writeCommand,
        proofNeededLabel:
          "Successful write summary for the scoped evidence file, using --allow-partial-import when the file is staged.",
        blockerLabel: "Partial writes without the explicit guard are refused.",
        claimBoundaryLabel:
          "A partial write clears only the imported reviewer scope, not whole-Library completion.",
        icon: "upload-cloud",
        tone: "warning",
      },
      {
        id: "ledger_refresh",
        label: "Refresh review ledgers",
        ownerLabel: "Release operator",
        statusLabel: "Required after write",
        commandLabel: ledgerCommand,
        proofNeededLabel:
          "Updated signoff ledger, completion audit, and title/content audit generated after evidence import.",
        blockerLabel:
          "Stale audit artifacts cannot prove current release readiness.",
        claimBoundaryLabel:
          "Generated audit artifacts report evidence state; they do not replace the strict gate.",
        icon: "file-text",
        tone: "primary",
      },
      {
        id: "release_gate",
        label: "Run strict Library gate",
        ownerLabel: "Release operator",
        statusLabel: complete ? "Ready to run" : "Still blocked",
        commandLabel: gateCommand,
        proofNeededLabel:
          "Strict Library completion and full goal audit results showing no Library blocker remains.",
        blockerLabel:
          "Any remaining book evidence gap keeps highest-standard Library claims blocked.",
        claimBoundaryLabel:
          "Even after Library passes, deployed runtime and production DB gates still need their own proof.",
        icon: "check-circle",
        tone: complete ? "primary" : "warning",
      },
    ],
  };
}

export function buildLibraryReviewEvidenceProofMatrixShareText(
  matrix: LibraryReviewEvidenceProofMatrix,
): string {
  return [
    `NurAI Library review evidence proof matrix: ${matrix.statusLabel}`,
    "",
    matrix.summary,
    "",
    `Active blocker: ${matrix.activeBlockerLabel}`,
    `No-secret boundary: ${matrix.noSecretBoundaryLabel}`,
    `Claim boundary: ${matrix.claimBoundaryLabel}`,
    "",
    "Proof rows:",
    ...matrix.rows.map(
      (row) =>
        `- ${row.label} (${row.ownerLabel}): ${row.proofNeededLabel} Command: ${row.commandLabel} Boundary: ${row.claimBoundaryLabel}`,
    ),
  ].join("\n");
}

export function buildLibraryReviewSprintPlan(params: {
  plan: LibraryReviewCompletionPlan;
  queue: LibraryPublicationReviewItem[];
  batches: LibraryReviewEvidenceBatch[];
  runbook: LibraryReviewEvidenceIntakeRunbook;
}): LibraryReviewSprintPlan {
  const pendingBooks = params.queue.length;
  const sensitiveBooks = params.queue.filter((book) => book.sensitive).length;
  const days = pendingBooks > 30 ? 10 : pendingBooks > 12 ? 7 : 5;
  const dailyBookTarget = pendingBooks > 0 ? Math.ceil(pendingBooks / days) : 0;
  const priorityBook = params.queue[0];
  const exportCommand = params.runbook.commandLines[0];

  const tasks: LibraryReviewSprintTask[] = params.batches
    .slice(0, 4)
    .map((batch) => {
      const tone: LibraryReviewSprintTask["tone"] =
        batch.id === "qualified_scholar"
          ? "scholar"
          : batch.id === "publish_decision"
            ? "warning"
            : "primary";
      const icon =
        batch.id === "qualified_scholar"
          ? "award"
          : batch.id === "source_relevance"
            ? "link"
            : batch.id === "quality_checklist"
              ? "check-square"
              : batch.id === "publish_decision"
                ? "send"
                : "edit-3";

      return {
        id: batch.id,
        title: batch.title,
        ownerLabel: batch.ownerLabel,
        bookCount: batch.bookCount,
        sensitiveCount: batch.sensitiveCount,
        detail: batch.description,
        actionLabel:
          batch.firstBookTitles.length > 0
            ? `Start with ${batch.firstBookTitles[0]}`
            : "No pending books in this lane",
        commandLabel: exportCommand,
        claimBoundaryLabel:
          "Sprint tasks coordinate reviewer work only; completion claims still require validated current-content evidence imports.",
        icon,
        tone,
      };
    });

  return {
    title: "Library review sprint plan",
    statusLabel:
      pendingBooks === 0
        ? "No sprint needed"
        : `${pendingBooks} book review packet${pendingBooks === 1 ? "" : "s"} to clear`,
    summary:
      "Use this sprint plan to assign real reviewers without mixing editorial, source, qualified review, QA, and publish decisions.",
    sprintWindowLabel:
      pendingBooks === 0
        ? "Strict completion check next"
        : `${days}-day review sprint`,
    dailyTargetLabel:
      pendingBooks === 0
        ? "0 daily packets"
        : `${dailyBookTarget} book packet${dailyBookTarget === 1 ? "" : "s"} per day`,
    priorityBookLabel: priorityBook
      ? `${priorityBook.title} (${priorityBook.priorityLabel})`
      : "No priority book remains",
    completionBoundaryLabel:
      sensitiveBooks > 0
        ? `${sensitiveBooks} high-care book${sensitiveBooks === 1 ? "" : "s"} still need qualified review evidence before public completion claims.`
        : params.plan.guardrail,
    tasks,
  };
}

export function buildLibraryReviewSprintPlanShareText(
  plan: LibraryReviewSprintPlan,
): string {
  return [
    `NurAI Library review sprint: ${plan.statusLabel}`,
    "",
    `Window: ${plan.sprintWindowLabel}`,
    `Daily target: ${plan.dailyTargetLabel}`,
    `Priority book: ${plan.priorityBookLabel}`,
    "",
    "Owner lanes:",
    ...(plan.tasks.length > 0
      ? plan.tasks.map(
          (task) =>
            `- ${task.ownerLabel}: ${task.bookCount} book(s), ${task.sensitiveCount} high-care. ${task.actionLabel}. Evidence boundary: ${task.claimBoundaryLabel}`,
        )
      : ["- No pending owner lanes. Run the strict completion gate next."]),
    "",
    "Command path:",
    ...Array.from(new Set(plan.tasks.map((task) => task.commandLabel))).map(
      (command) => `- ${command}`,
    ),
    "",
    `Completion boundary: ${plan.completionBoundaryLabel}`,
    "",
    "Guardrail: shared sprint plans coordinate reviewer work only; they are not approval evidence and do not support publication, qualified-review, or highest-standard claims.",
  ].join("\n");
}

export function buildLibraryReviewDailyWorkPlan(params: {
  plan: LibraryReviewSprintPlan;
  queue: LibraryPublicationReviewItem[];
  batches: LibraryReviewEvidenceBatch[];
  runbook: LibraryReviewEvidenceIntakeRunbook;
}): LibraryReviewDailyWorkPlan {
  const pendingBooks = params.queue.length;
  const dayCount = pendingBooks > 30 ? 10 : pendingBooks > 12 ? 7 : 5;
  const dailyTarget = pendingBooks > 0 ? Math.ceil(pendingBooks / dayCount) : 0;
  const exportCommand = params.runbook.commandLines[0];
  const days = Array.from({ length: dayCount }, (_, index) => {
    const books = params.queue.slice(
      index * dailyTarget,
      (index + 1) * dailyTarget,
    );
    const activeBatches = params.batches.filter((batch) =>
      books.some((book) =>
        batch.evidenceNeeded.some((evidence) =>
          book.missingEvidence.includes(evidence),
        ),
      ),
    );
    const fallbackBatches =
      activeBatches.length > 0 ? activeBatches : params.batches.slice(0, 2);
    const firstBook = books[0];

    return {
      id: `day-${index + 1}`,
      dayLabel: `Day ${index + 1}`,
      focusLabel: firstBook
        ? `${firstBook.priorityLabel}: ${firstBook.title}`
        : "Run strict completion checks",
      targetLabel:
        books.length > 0
          ? `${books.length} book packet${books.length === 1 ? "" : "s"}`
          : "No pending packets",
      bookTitles: books.slice(0, 4).map((book) => book.title),
      tasks: fallbackBatches.slice(0, 3).map((batch) => {
        const tone: LibraryReviewDailyWorkPlanTask["tone"] =
          batch.id === "qualified_scholar"
            ? "scholar"
            : batch.id === "publish_decision"
              ? "warning"
              : "primary";
        const icon =
          batch.id === "qualified_scholar"
            ? "award"
            : batch.id === "source_relevance"
              ? "link"
              : batch.id === "quality_checklist"
                ? "check-square"
                : batch.id === "publish_decision"
                  ? "send"
                  : "edit-3";

        return {
          id: `${index + 1}-${batch.id}`,
          title: batch.title,
          ownerLabel: batch.ownerLabel,
          bookCount: books.filter((book) =>
            batch.evidenceNeeded.some((evidence) =>
              book.missingEvidence.includes(evidence),
            ),
          ).length,
          sensitiveCount: books.filter(
            (book) =>
              book.sensitive &&
              batch.evidenceNeeded.some((evidence) =>
                book.missingEvidence.includes(evidence),
              ),
          ).length,
          commandLabel: exportCommand,
          acceptanceLabel:
            "Done means returned evidence validates, dry-runs cleanly, imports through the guarded path, and refreshes the Library ledgers.",
          claimBoundaryLabel:
            "Daily review work coordinates people only; it is not approval evidence until the validated import is recorded.",
          icon,
          tone,
        };
      }),
      evidenceBoundaryLabel:
        "Keep each day scoped to the listed packets. Partial progress clears only the imported current-content evidence scope.",
      doneDefinitionLabel:
        "A day is complete only when reviewer identity, date, notes, scope, checklist fields, and content hash are present for its imported records.",
    };
  });

  return {
    title: "Daily reviewer workplan",
    statusLabel:
      pendingBooks === 0
        ? "No daily packets pending"
        : `${pendingBooks} book packets spread across ${dayCount} review days`,
    summary:
      "This workplan turns the Library review blocker into day-by-day reviewer packets while keeping approval, publish, and release claims separate.",
    dayCount,
    dailyTargetLabel:
      dailyTarget > 0
        ? `${dailyTarget} book packet${dailyTarget === 1 ? "" : "s"} per review day`
        : "0 book packets per review day",
    firstDayLabel: days[0]?.focusLabel ?? params.plan.priorityBookLabel,
    noOverclaimBoundaryLabel:
      "Do not call a day complete, a book approved, or the Library finished until the returned evidence file validates, imports, and the strict Library gate passes.",
    shareLabel: "Share daily workplan",
    days,
  };
}

export function buildLibraryReviewDailyWorkPlanShareText(
  plan: LibraryReviewDailyWorkPlan,
): string {
  return [
    `NurAI Library daily reviewer workplan: ${plan.statusLabel}`,
    "",
    `Daily target: ${plan.dailyTargetLabel}`,
    `First focus: ${plan.firstDayLabel}`,
    "",
    ...plan.days.flatMap((day) => [
      `${day.dayLabel}: ${day.focusLabel}`,
      `Target: ${day.targetLabel}`,
      "Books:",
      ...(day.bookTitles.length > 0
        ? day.bookTitles.map((title) => `- ${title}`)
        : ["- No pending books; run strict completion checks."]),
      "Owner tasks:",
      ...day.tasks.map(
        (task) =>
          `- ${task.ownerLabel}: ${task.title}, ${task.bookCount} book(s), ${task.sensitiveCount} high-care. ${task.acceptanceLabel}`,
      ),
      `Evidence boundary: ${day.evidenceBoundaryLabel}`,
      `Done definition: ${day.doneDefinitionLabel}`,
      "",
    ]),
    `Claim boundary: ${plan.noOverclaimBoundaryLabel}`,
    "",
    "Guardrail: a daily workplan is scheduling help only, not review evidence, publish approval, or a release claim.",
  ].join("\n");
}

export function buildLibraryReviewNextActionShareText(
  action: LibraryReviewNextAction,
): string {
  return [
    `NurAI Library review next action: ${action.title}`,
    "",
    `Owner: ${action.ownerLabel}`,
    `Lane: ${action.laneLabel}`,
    `Packet: ${action.packetLabel}`,
    `Evidence needed: ${action.evidenceLabel}`,
    "",
    "Command:",
    `- ${action.commandLabel}`,
    "",
    "Acceptance checklist:",
    ...action.acceptanceChecklist.map((item) => `- ${item}`),
    "",
    `Guardrail: ${action.guardrail}`,
  ].join("\n");
}

export async function saveSourceReviewDecision(params: {
  bookId: string;
  chapterId: string;
  decision: SourceReviewDecision;
  reviewerPlan: PlanType;
  note?: string;
  reviewerName?: string;
}): Promise<void> {
  if (!canReviewLibrarySources(params.reviewerPlan)) {
    throw new Error("Only Scholar members can approve Library source reviews.");
  }
  const evidenceIssues = sourceReviewDecisionEvidenceIssues(params.note || "");
  if (evidenceIssues.length > 0) {
    throw new Error(evidenceIssues[0]);
  }

  const records = await readLocalReviewRecords();
  const nextRecord = await saveServerReviewDecision(params);
  const id = reviewId(params.bookId, params.chapterId);
  const nextRecords = records.filter((record) => record.id !== id);
  nextRecords.unshift(nextRecord);
  await writeReviewRecords(nextRecords);
}

export function sourceReviewDecisionEvidenceIssues(note: string): string[] {
  const clean = note.trim();
  if (clean.length < 24) {
    return ["Add review notes before saving this source review decision."];
  }
  return [];
}

export async function clearSourceReviewDecision(params: {
  bookId: string;
  chapterId: string;
  reviewerPlan: PlanType;
}): Promise<void> {
  if (!canReviewLibrarySources(params.reviewerPlan)) {
    throw new Error("Only Scholar members can clear Library source reviews.");
  }

  const records = await readLocalReviewRecords();
  await writeReviewRecords(
    records.filter(
      (record) => record.id !== reviewId(params.bookId, params.chapterId),
    ),
  );
}

function summarizeAudits(audits: ChapterSourceAudit[]): LibrarySourceSummary {
  return audits.reduce<LibrarySourceSummary>(
    (summary, audit) => ({
      totalChapters: summary.totalChapters + 1,
      approvedChapters:
        summary.approvedChapters + (audit.status === "approved" ? 1 : 0),
      readyForReview:
        summary.readyForReview + (audit.status === "ready_for_review" ? 1 : 0),
      needsFix: summary.needsFix + (audit.status === "needs_fix" ? 1 : 0),
      verifiedSources: summary.verifiedSources + audit.verifiedCount,
      totalSources: summary.totalSources + audit.sourceCount,
      scholarReviewRecommended:
        summary.scholarReviewRecommended + (audit.needsScholarReview ? 1 : 0),
    }),
    {
      totalChapters: 0,
      approvedChapters: 0,
      readyForReview: 0,
      needsFix: 0,
      verifiedSources: 0,
      totalSources: 0,
      scholarReviewRecommended: 0,
    },
  );
}
