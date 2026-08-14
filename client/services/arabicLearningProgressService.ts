import { syncedGetItem, syncedSetItem } from "@/lib/progress-sync";

export type ArabicPracticeKind =
  | "letter"
  | "dialogue"
  | "dictation"
  | "pattern"
  | "word"
  | "review";

export type ArabicSkillKey = "sounds" | "dialogue" | "meaning" | "sentence";
export type ArabicReviewQuality = "again" | "hard" | "good" | "easy";
export type ArabicPracticeAwardScope = "lifetime" | "daily";

export type ArabicLevelId =
  | "sound-starter"
  | "dialogue-builder"
  | "meaning-maker"
  | "independent-reviewer";

export interface ArabicReviewScheduleItem {
  key: string;
  kind: ArabicPracticeKind | "listen";
  title: string;
  intervalDays: number;
  ease: number;
  dueAt: string;
  lastReviewedAt: string;
  reviewCount: number;
  lapseCount: number;
}

export type ArabicRetentionRisk =
  | "clear"
  | "due_today"
  | "overdue"
  | "lapse_watch";

export interface ArabicReviewRetentionSummary {
  scheduledCount: number;
  dueCount: number;
  masteredCount: number;
  overdueCount: number;
  lapseCount: number;
  nextDueAt: string | null;
  retentionRisk: ArabicRetentionRisk;
  retentionLabel: string;
  retentionBody: string;
  recallProofLabel: string;
}

export interface ArabicReviewRecoveryStep {
  id: "oldest-due" | "oral-recall" | "production-proof" | "reschedule";
  title: string;
  detail: string;
  actionLabel: string;
  estimatedMinutes: number;
}

export interface ArabicReviewRecoveryPlan {
  title: string;
  statusLabel: string;
  recoveryLabel: string;
  estimatedMinutes: number;
  priorityItemLabel: string;
  guardrail: string;
  prompt: string;
  steps: ArabicReviewRecoveryStep[];
}

export type ArabicStreakCareTone = "protected" | "open_today" | "restart";

export interface ArabicStreakCareStep {
  id: "today-proof" | "review-debt" | "tomorrow-anchor" | "gentle-restart";
  title: string;
  detail: string;
  actionLabel: string;
  icon: "check-circle" | "repeat" | "calendar" | "refresh-cw";
  complete: boolean;
}

export interface ArabicStreakCarePlan {
  title: string;
  statusLabel: string;
  primaryActionLabel: string;
  body: string;
  proofLabel: string;
  recoveryLabel: string;
  boundaryLabel: string;
  tone: ArabicStreakCareTone;
  steps: ArabicStreakCareStep[];
}

export interface ArabicLearningProgress {
  masteredLetterIndexes: number[];
  dialoguePracticeCounts: Record<string, number>;
  dialogueReplyAttemptCounts: Record<string, number>;
  dialogueReplyCorrectCounts: Record<string, number>;
  conversationRoundCounts: Record<string, number>;
  conversationRoundStrongCounts: Record<string, number>;
  dictationAttemptCounts: Record<string, number>;
  dictationStrongCounts: Record<string, number>;
  speakingShadowCounts: Record<string, number>;
  speakingConfidenceRatings: Record<string, number>;
  patternPracticeCounts: Record<string, number>;
  sentenceBuilderAttemptCounts: Record<string, number>;
  sentenceBuilderStrongCounts: Record<string, number>;
  wordReviewCounts: Record<string, number>;
  wordMeaningAttemptCounts: Record<string, number>;
  wordMeaningStrongCounts: Record<string, number>;
  latestDialogueReplyDrafts: Record<string, string>;
  latestDictationDrafts: Record<string, string>;
  latestSentenceBuilderDrafts: Record<string, string>;
  latestWordMeaningDrafts: Record<string, string>;
  audioListenCounts: Record<string, number>;
  gamePracticeCounts: Record<string, number>;
  arabicLevelId: ArabicLevelId;
  skillSelfRatings: Record<ArabicSkillKey, number>;
  placementCheckCount: number;
  lastPlacementAt: string | null;
  lastDialogueAttemptAt: string | null;
  lastConversationRoundAt: string | null;
  lastDictationAttemptAt: string | null;
  lastSpeakingPracticeAt: string | null;
  lastSentenceBuilderAttemptAt: string | null;
  lastWordMeaningAttemptAt: string | null;
  lastAudioListenAt: string | null;
  reviewSchedule: Record<string, ArabicReviewScheduleItem>;
  completedReviewTaskIds: string[];
  reviewDate: string;
  awardedPracticeKeys: string[];
  dailyAwardedPracticeKeys: string[];
  dailyAwardDate: string;
  xp: number;
  streakDays: number;
  lastPracticeDate: string | null;
  lastOpenedAt: string;
}

export const ARABIC_LEARNING_PROGRESS_KEY = "nurai_arabic_learning_progress";
export const ARABIC_LEARNING_PROGRESS_TOTALS = {
  letters: 28,
  dialogues: 20,
  patterns: 8,
  words: 10,
};

export function getArabicLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function yesterdayKey(date = new Date()): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return getArabicLocalDateKey(yesterday);
}

export function createDefaultArabicLearningProgress(): ArabicLearningProgress {
  return {
    masteredLetterIndexes: [],
    dialoguePracticeCounts: {},
    dialogueReplyAttemptCounts: {},
    dialogueReplyCorrectCounts: {},
    conversationRoundCounts: {},
    conversationRoundStrongCounts: {},
    dictationAttemptCounts: {},
    dictationStrongCounts: {},
    speakingShadowCounts: {},
    speakingConfidenceRatings: {},
    patternPracticeCounts: {},
    sentenceBuilderAttemptCounts: {},
    sentenceBuilderStrongCounts: {},
    wordReviewCounts: {},
    wordMeaningAttemptCounts: {},
    wordMeaningStrongCounts: {},
    latestDialogueReplyDrafts: {},
    latestDictationDrafts: {},
    latestSentenceBuilderDrafts: {},
    latestWordMeaningDrafts: {},
    audioListenCounts: {},
    gamePracticeCounts: {},
    arabicLevelId: "sound-starter",
    skillSelfRatings: {
      sounds: 0,
      dialogue: 0,
      meaning: 0,
      sentence: 0,
    },
    placementCheckCount: 0,
    lastPlacementAt: null,
    lastDialogueAttemptAt: null,
    lastConversationRoundAt: null,
    lastDictationAttemptAt: null,
    lastSpeakingPracticeAt: null,
    lastSentenceBuilderAttemptAt: null,
    lastWordMeaningAttemptAt: null,
    lastAudioListenAt: null,
    reviewSchedule: {},
    completedReviewTaskIds: [],
    reviewDate: getArabicLocalDateKey(),
    awardedPracticeKeys: [],
    dailyAwardedPracticeKeys: [],
    dailyAwardDate: getArabicLocalDateKey(),
    xp: 0,
    streakDays: 0,
    lastPracticeDate: null,
    lastOpenedAt: new Date().toISOString(),
  };
}

function uniqueNumbers(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values)]
    .filter((value): value is number => Number.isInteger(value) && value >= 0)
    .sort((a, b) => a - b);
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values)]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    .map((value) => value.trim())
    .sort((a, b) => a.localeCompare(b));
}

function normalizeCountMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, number> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, count]) => {
    if (typeof count === "number" && Number.isFinite(count) && count > 0) {
      result[key] = Math.round(count);
    }
  });
  return result;
}

function normalizeRatingMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, number> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, rating]) => {
    if (typeof rating === "number" && Number.isFinite(rating) && rating > 0) {
      result[key] = Math.min(4, Math.max(1, Math.round(rating)));
    }
  });
  return result;
}

function normalizeTextMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, string> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, text]) => {
    if (typeof text !== "string") return;
    const trimmed = text.trim().replace(/\s+/g, " ").slice(0, 360);
    if (trimmed) result[key] = trimmed;
  });
  return result;
}

function normalizeArabicLevelId(value: unknown): ArabicLevelId {
  return value === "dialogue-builder" ||
    value === "meaning-maker" ||
    value === "independent-reviewer"
    ? value
    : "sound-starter";
}

function normalizeSkillSelfRatings(
  value: unknown,
): Record<ArabicSkillKey, number> {
  const fallback = createDefaultArabicLearningProgress().skillSelfRatings;
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<Record<ArabicSkillKey, unknown>>;
  return {
    sounds:
      typeof raw.sounds === "number" && Number.isFinite(raw.sounds)
        ? Math.min(4, Math.max(0, Math.round(raw.sounds)))
        : 0,
    dialogue:
      typeof raw.dialogue === "number" && Number.isFinite(raw.dialogue)
        ? Math.min(4, Math.max(0, Math.round(raw.dialogue)))
        : 0,
    meaning:
      typeof raw.meaning === "number" && Number.isFinite(raw.meaning)
        ? Math.min(4, Math.max(0, Math.round(raw.meaning)))
        : 0,
    sentence:
      typeof raw.sentence === "number" && Number.isFinite(raw.sentence)
        ? Math.min(4, Math.max(0, Math.round(raw.sentence)))
        : 0,
  };
}

function dateKeyFromIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return getArabicLocalDateKey(parsed);
}

function addDaysKey(days: number, date = new Date()): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return getArabicLocalDateKey(next);
}

function daysBetweenDateKeys(fromKey: string, toKey: string): number | null {
  const fromTime = new Date(`${fromKey}T12:00:00.000Z`).getTime();
  const toTime = new Date(`${toKey}T12:00:00.000Z`).getTime();
  if (Number.isNaN(fromTime) || Number.isNaN(toTime)) return null;
  return Math.floor((toTime - fromTime) / 86_400_000);
}

function normalizeReviewSchedule(
  value: unknown,
): Record<string, ArabicReviewScheduleItem> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, ArabicReviewScheduleItem> = {};

  Object.entries(value as Record<string, unknown>).forEach(
    ([fallbackKey, rawItem]) => {
      if (!rawItem || typeof rawItem !== "object") return;
      const item = rawItem as Partial<ArabicReviewScheduleItem>;
      const key =
        typeof item.key === "string" && item.key.trim()
          ? item.key.trim()
          : fallbackKey;
      const title =
        typeof item.title === "string" && item.title.trim()
          ? item.title.trim()
          : key;
      const kind = item.kind;
      const normalizedKind: ArabicReviewScheduleItem["kind"] =
        kind === "letter" ||
        kind === "dialogue" ||
        kind === "dictation" ||
        kind === "pattern" ||
        kind === "word" ||
        kind === "review" ||
        kind === "listen"
          ? kind
          : "review";
      const intervalDays =
        typeof item.intervalDays === "number" &&
        Number.isFinite(item.intervalDays)
          ? Math.max(1, Math.min(90, Math.round(item.intervalDays)))
          : 1;
      const ease =
        typeof item.ease === "number" && Number.isFinite(item.ease)
          ? Math.max(1.3, Math.min(3, Number(item.ease.toFixed(2))))
          : 2.3;
      const dueAt = dateKeyFromIso(item.dueAt) || getArabicLocalDateKey();
      const lastReviewedAt =
        typeof item.lastReviewedAt === "string" &&
        !Number.isNaN(new Date(item.lastReviewedAt).getTime())
          ? item.lastReviewedAt
          : new Date().toISOString();
      const reviewCount =
        typeof item.reviewCount === "number" &&
        Number.isFinite(item.reviewCount)
          ? Math.max(0, Math.round(item.reviewCount))
          : 0;
      const lapseCount =
        typeof item.lapseCount === "number" && Number.isFinite(item.lapseCount)
          ? Math.max(0, Math.round(item.lapseCount))
          : 0;

      result[key] = {
        key,
        kind: normalizedKind,
        title,
        intervalDays,
        ease,
        dueAt,
        lastReviewedAt,
        reviewCount,
        lapseCount,
      };
    },
  );

  return result;
}

function normalizeProgress(value: unknown): ArabicLearningProgress {
  const fallback = createDefaultArabicLearningProgress();
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<ArabicLearningProgress>;
  const today = getArabicLocalDateKey();
  const currentReviewDate =
    typeof raw.reviewDate === "string" && raw.reviewDate
      ? raw.reviewDate
      : fallback.reviewDate;
  const currentDailyAwardDate =
    typeof raw.dailyAwardDate === "string" && raw.dailyAwardDate
      ? raw.dailyAwardDate
      : today;

  return {
    masteredLetterIndexes: uniqueNumbers(raw.masteredLetterIndexes),
    dialoguePracticeCounts: normalizeCountMap(raw.dialoguePracticeCounts),
    dialogueReplyAttemptCounts: normalizeCountMap(
      raw.dialogueReplyAttemptCounts,
    ),
    dialogueReplyCorrectCounts: normalizeCountMap(
      raw.dialogueReplyCorrectCounts,
    ),
    conversationRoundCounts: normalizeCountMap(raw.conversationRoundCounts),
    conversationRoundStrongCounts: normalizeCountMap(
      raw.conversationRoundStrongCounts,
    ),
    dictationAttemptCounts: normalizeCountMap(raw.dictationAttemptCounts),
    dictationStrongCounts: normalizeCountMap(raw.dictationStrongCounts),
    speakingShadowCounts: normalizeCountMap(raw.speakingShadowCounts),
    speakingConfidenceRatings: normalizeRatingMap(
      raw.speakingConfidenceRatings,
    ),
    patternPracticeCounts: normalizeCountMap(raw.patternPracticeCounts),
    sentenceBuilderAttemptCounts: normalizeCountMap(
      raw.sentenceBuilderAttemptCounts,
    ),
    sentenceBuilderStrongCounts: normalizeCountMap(
      raw.sentenceBuilderStrongCounts,
    ),
    wordReviewCounts: normalizeCountMap(raw.wordReviewCounts),
    wordMeaningAttemptCounts: normalizeCountMap(raw.wordMeaningAttemptCounts),
    wordMeaningStrongCounts: normalizeCountMap(raw.wordMeaningStrongCounts),
    latestDialogueReplyDrafts: normalizeTextMap(raw.latestDialogueReplyDrafts),
    latestDictationDrafts: normalizeTextMap(raw.latestDictationDrafts),
    latestSentenceBuilderDrafts: normalizeTextMap(
      raw.latestSentenceBuilderDrafts,
    ),
    latestWordMeaningDrafts: normalizeTextMap(raw.latestWordMeaningDrafts),
    audioListenCounts: normalizeCountMap(raw.audioListenCounts),
    gamePracticeCounts: normalizeCountMap(raw.gamePracticeCounts),
    arabicLevelId: normalizeArabicLevelId(raw.arabicLevelId),
    skillSelfRatings: normalizeSkillSelfRatings(raw.skillSelfRatings),
    placementCheckCount:
      typeof raw.placementCheckCount === "number" &&
      Number.isFinite(raw.placementCheckCount)
        ? Math.max(0, Math.round(raw.placementCheckCount))
        : 0,
    lastPlacementAt:
      typeof raw.lastPlacementAt === "string" ? raw.lastPlacementAt : null,
    lastDialogueAttemptAt:
      typeof raw.lastDialogueAttemptAt === "string"
        ? raw.lastDialogueAttemptAt
        : null,
    lastConversationRoundAt:
      typeof raw.lastConversationRoundAt === "string"
        ? raw.lastConversationRoundAt
        : null,
    lastDictationAttemptAt:
      typeof raw.lastDictationAttemptAt === "string"
        ? raw.lastDictationAttemptAt
        : null,
    lastSpeakingPracticeAt:
      typeof raw.lastSpeakingPracticeAt === "string"
        ? raw.lastSpeakingPracticeAt
        : null,
    lastSentenceBuilderAttemptAt:
      typeof raw.lastSentenceBuilderAttemptAt === "string"
        ? raw.lastSentenceBuilderAttemptAt
        : null,
    lastWordMeaningAttemptAt:
      typeof raw.lastWordMeaningAttemptAt === "string"
        ? raw.lastWordMeaningAttemptAt
        : null,
    lastAudioListenAt:
      typeof raw.lastAudioListenAt === "string" ? raw.lastAudioListenAt : null,
    reviewSchedule: normalizeReviewSchedule(raw.reviewSchedule),
    completedReviewTaskIds:
      currentReviewDate === getArabicLocalDateKey() &&
      Array.isArray(raw.completedReviewTaskIds)
        ? raw.completedReviewTaskIds.filter(
            (item): item is string =>
              typeof item === "string" && item.length > 0,
          )
        : [],
    reviewDate: currentReviewDate === today ? currentReviewDate : today,
    awardedPracticeKeys: uniqueStrings(raw.awardedPracticeKeys),
    dailyAwardedPracticeKeys:
      currentDailyAwardDate === today
        ? uniqueStrings(raw.dailyAwardedPracticeKeys)
        : [],
    dailyAwardDate:
      currentDailyAwardDate === today ? currentDailyAwardDate : today,
    xp:
      typeof raw.xp === "number" && Number.isFinite(raw.xp)
        ? Math.max(0, Math.round(raw.xp))
        : 0,
    streakDays:
      typeof raw.streakDays === "number" && Number.isFinite(raw.streakDays)
        ? Math.max(0, Math.round(raw.streakDays))
        : 0,
    lastPracticeDate:
      typeof raw.lastPracticeDate === "string" ? raw.lastPracticeDate : null,
    lastOpenedAt:
      typeof raw.lastOpenedAt === "string"
        ? raw.lastOpenedAt
        : fallback.lastOpenedAt,
  };
}

export async function loadArabicLearningProgress(): Promise<ArabicLearningProgress> {
  const raw = await syncedGetItem(ARABIC_LEARNING_PROGRESS_KEY);
  if (!raw) return createDefaultArabicLearningProgress();
  try {
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return createDefaultArabicLearningProgress();
  }
}

export async function saveArabicLearningProgress(
  progress: ArabicLearningProgress,
): Promise<void> {
  await syncedSetItem(
    ARABIC_LEARNING_PROGRESS_KEY,
    JSON.stringify(normalizeProgress(progress)),
  );
}

export function refreshArabicReviewForToday(
  progress: ArabicLearningProgress,
): ArabicLearningProgress {
  return normalizeProgress(progress);
}

export function registerArabicPractice(
  progress: ArabicLearningProgress,
  xp: number,
): ArabicLearningProgress {
  const today = getArabicLocalDateKey();
  const lastPracticeDate = progress.lastPracticeDate;
  const streakDays =
    lastPracticeDate === today
      ? progress.streakDays
      : lastPracticeDate === yesterdayKey()
        ? progress.streakDays + 1
        : 1;

  return normalizeProgress({
    ...progress,
    xp: progress.xp + xp,
    streakDays,
    lastPracticeDate: today,
    lastOpenedAt: new Date().toISOString(),
  });
}

export function registerArabicPracticeOnce(
  progress: ArabicLearningProgress,
  xp: number,
  awardKey: string,
  scope: ArabicPracticeAwardScope = "lifetime",
): ArabicLearningProgress {
  const key = awardKey.trim();
  if (!key) return registerArabicPractice(progress, xp);

  const today = getArabicLocalDateKey();
  const currentDailyKeys =
    progress.dailyAwardDate === today ? progress.dailyAwardedPracticeKeys : [];
  const hasAward =
    scope === "daily"
      ? currentDailyKeys.includes(key)
      : progress.awardedPracticeKeys.includes(key);

  if (hasAward) {
    return normalizeProgress({
      ...progress,
      dailyAwardedPracticeKeys: currentDailyKeys,
      dailyAwardDate: today,
      lastOpenedAt: new Date().toISOString(),
    });
  }

  const practicedProgress = registerArabicPractice(progress, xp);
  return normalizeProgress(
    scope === "daily"
      ? {
          ...practicedProgress,
          dailyAwardedPracticeKeys: [...currentDailyKeys, key],
          dailyAwardDate: today,
        }
      : {
          ...practicedProgress,
          awardedPracticeKeys: [...progress.awardedPracticeKeys, key],
          dailyAwardedPracticeKeys: currentDailyKeys,
          dailyAwardDate: today,
        },
  );
}

export function scheduleArabicReviewItem(
  progress: ArabicLearningProgress,
  params: {
    key: string;
    kind: ArabicReviewScheduleItem["kind"];
    title: string;
    quality: ArabicReviewQuality;
  },
): ArabicLearningProgress {
  const key = params.key.trim();
  if (!key) return normalizeProgress(progress);

  const current = progress.reviewSchedule[key];
  const currentInterval = current?.intervalDays ?? 1;
  const currentEase = current?.ease ?? 2.3;
  const reviewCount = (current?.reviewCount ?? 0) + 1;
  const nextEase =
    params.quality === "again"
      ? Math.max(1.3, currentEase - 0.25)
      : params.quality === "hard"
        ? Math.max(1.3, currentEase - 0.1)
        : params.quality === "easy"
          ? Math.min(3, currentEase + 0.15)
          : currentEase;
  const nextInterval =
    params.quality === "again"
      ? 1
      : params.quality === "hard"
        ? Math.max(1, Math.round(currentInterval * 1.2))
        : params.quality === "easy"
          ? reviewCount <= 1
            ? 3
            : Math.round(currentInterval * (nextEase + 0.35))
          : reviewCount <= 1
            ? 2
            : Math.round(currentInterval * nextEase);

  return normalizeProgress({
    ...progress,
    reviewSchedule: {
      ...progress.reviewSchedule,
      [key]: {
        key,
        kind: params.kind,
        title: params.title,
        intervalDays: Math.max(1, Math.min(90, nextInterval)),
        ease: Number(nextEase.toFixed(2)),
        dueAt: addDaysKey(Math.max(1, Math.min(90, nextInterval))),
        lastReviewedAt: new Date().toISOString(),
        reviewCount,
        lapseCount:
          (current?.lapseCount ?? 0) + (params.quality === "again" ? 1 : 0),
      },
    },
  });
}

export function getDueArabicReviewItems(
  progress: ArabicLearningProgress,
  date = new Date(),
): ArabicReviewScheduleItem[] {
  const today = getArabicLocalDateKey(date);
  return Object.values(progress.reviewSchedule)
    .filter((item) => item.dueAt <= today)
    .sort((a, b) => {
      if (a.dueAt !== b.dueAt) return a.dueAt.localeCompare(b.dueAt);
      if (a.lapseCount !== b.lapseCount) return b.lapseCount - a.lapseCount;
      return a.title.localeCompare(b.title);
    });
}

export function getArabicReviewScheduleStats(
  progress: ArabicLearningProgress,
  date = new Date(),
) {
  const dueItems = getDueArabicReviewItems(progress, date);
  const scheduledCount = Object.keys(progress.reviewSchedule).length;
  const masteredCount = Object.values(progress.reviewSchedule).filter(
    (item) => item.intervalDays >= 14 && item.lapseCount === 0,
  ).length;
  return {
    scheduledCount,
    dueCount: dueItems.length,
    nextDueAt:
      Object.values(progress.reviewSchedule)
        .map((item) => item.dueAt)
        .sort()[0] ?? null,
    masteredCount,
  };
}

export function buildArabicReviewRetentionSummary(
  progress: ArabicLearningProgress,
  date = new Date(),
): ArabicReviewRetentionSummary {
  const today = getArabicLocalDateKey(date);
  const stats = getArabicReviewScheduleStats(progress, date);
  const scheduledItems = Object.values(progress.reviewSchedule);
  const dueItems = getDueArabicReviewItems(progress, date);
  const overdueCount = dueItems.filter((item) => item.dueAt < today).length;
  const lapseCount = scheduledItems.reduce(
    (total, item) => total + item.lapseCount,
    0,
  );
  const retentionRisk: ArabicRetentionRisk =
    overdueCount > 0
      ? "overdue"
      : stats.dueCount > 0
        ? "due_today"
        : lapseCount > 0
          ? "lapse_watch"
          : "clear";

  const labelByRisk: Record<ArabicRetentionRisk, string> = {
    clear: "Memory protected",
    due_today: "Due today",
    overdue: "Recall overdue",
    lapse_watch: "Lapse watch",
  };
  const bodyByRisk: Record<ArabicRetentionRisk, string> = {
    clear:
      stats.scheduledCount > 0
        ? `No Arabic review is due today. ${stats.masteredCount} item${stats.masteredCount === 1 ? "" : "s"} are in long-interval review.`
        : "Start one recall-first drill and NurAI will begin spacing it for tomorrow.",
    due_today: `${stats.dueCount} Arabic review item${stats.dueCount === 1 ? "" : "s"} are ready. Recall before revealing the answer to keep memory honest.`,
    overdue: `${overdueCount} Arabic review item${overdueCount === 1 ? " is" : "s are"} overdue. Start with the oldest item and mark again, hard, good, or easy.`,
    lapse_watch: `${lapseCount} lapse${lapseCount === 1 ? "" : "s"} logged. Keep the next review short, oral, and recall-first.`,
  };

  return {
    ...stats,
    overdueCount,
    lapseCount,
    retentionRisk,
    retentionLabel: labelByRisk[retentionRisk],
    retentionBody: bodyByRisk[retentionRisk],
    recallProofLabel: `${stats.dueCount} due • ${stats.masteredCount} mastered • ${lapseCount} lapses`,
  };
}

export function buildArabicReviewRecoveryPlan(
  progress: ArabicLearningProgress,
  date = new Date(),
): ArabicReviewRecoveryPlan {
  const summary = buildArabicReviewRetentionSummary(progress, date);
  const dueItems = getDueArabicReviewItems(progress, date);
  const priorityItem = dueItems[0];
  const statusLabel =
    summary.retentionRisk === "clear"
      ? "Keep memory warm"
      : summary.retentionRisk === "due_today"
        ? "Clear due review"
        : summary.retentionRisk === "overdue"
          ? "Recovery needed"
          : "Repair the lapse";
  const recoveryLabel = priorityItem
    ? `${priorityItem.title} • ${priorityItem.kind}`
    : summary.scheduledCount > 0
      ? "No item is due; schedule one fresh recall."
      : "No review history yet; create the first recall card.";
  const steps: ArabicReviewRecoveryStep[] = [
    {
      id: "oldest-due",
      title: priorityItem
        ? "Start with the oldest due item"
        : "Create one recall item",
      detail: priorityItem
        ? `Recall ${priorityItem.title} before revealing the answer.`
        : "Use one sound, dialogue line, sentence, or Quranic word from today's lesson.",
      actionLabel: priorityItem ? "Recall first" : "Start memory",
      estimatedMinutes: 2,
    },
    {
      id: "oral-recall",
      title: "Say it before reading",
      detail:
        "Speak the Arabic, transliteration, and meaning aloud before checking help.",
      actionLabel: "Speak aloud",
      estimatedMinutes: 2,
    },
    {
      id: "production-proof",
      title: "Use it in one tiny output",
      detail:
        "Answer one dialogue turn or build one short sentence so review becomes usable.",
      actionLabel: "Use it",
      estimatedMinutes: 3,
    },
    {
      id: "reschedule",
      title: "Reschedule honestly",
      detail:
        "Mark again, hard, good, or easy based on recall before reveal, not recognition after reveal.",
      actionLabel: "Set next review",
      estimatedMinutes: 1,
    },
  ];

  return {
    title:
      summary.retentionRisk === "clear"
        ? "Memory maintenance plan"
        : "Review recovery plan",
    statusLabel,
    recoveryLabel,
    estimatedMinutes: steps.reduce(
      (sum, step) => sum + step.estimatedMinutes,
      0,
    ),
    priorityItemLabel: priorityItem
      ? `${priorityItem.title} is due now`
      : summary.nextDueAt
        ? `Next due ${summary.nextDueAt}`
        : "No review scheduled yet",
    guardrail:
      "Recovery proof only counts when the learner recalls before revealing the model answer.",
    prompt: `Build an Arabic review recovery session. Status: ${statusLabel}. Priority: ${recoveryLabel}. Use recall-before-reveal, one oral repetition, one tiny output, and an honest again/hard/good/easy reschedule.`,
    steps,
  };
}

export function buildArabicStreakCarePlan(
  progress: ArabicLearningProgress,
  date = new Date(),
): ArabicStreakCarePlan {
  const today = getArabicLocalDateKey(date);
  const lastPracticeKey = dateKeyFromIso(progress.lastPracticeDate);
  const daysSincePractice = lastPracticeKey
    ? daysBetweenDateKeys(lastPracticeKey, today)
    : null;
  const retentionSummary = buildArabicReviewRetentionSummary(progress, date);
  const practicedToday = daysSincePractice === 0;
  const practicedYesterday = daysSincePractice === 1;
  const needsRestart = daysSincePractice === null || daysSincePractice > 1;
  const streakCount =
    practicedToday || practicedYesterday ? progress.streakDays : 0;
  const hasReviewDebt = retentionSummary.dueCount > 0;

  const tone: ArabicStreakCareTone = practicedToday
    ? "protected"
    : needsRestart
      ? "restart"
      : "open_today";
  const statusLabel = practicedToday
    ? "Protected today"
    : needsRestart
      ? "Gentle restart"
      : "Open today";
  const primaryActionLabel = hasReviewDebt
    ? "Recall due review"
    : practicedToday
      ? "Schedule tomorrow"
      : "Save one proof";
  const recoveryLabel = practicedToday
    ? "Keep the streak light: one review item for tomorrow is enough."
    : needsRestart
      ? "Restart with one tiny recall; missed days do not become shame in NurAI."
      : "One recall, one spoken line, or one Quran-word explanation protects today.";

  const steps: ArabicStreakCareStep[] = [
    {
      id: "today-proof",
      title: practicedToday ? "Today protected" : "Save today's proof",
      detail: practicedToday
        ? "A practice action has already been saved for today."
        : "Complete one visible action: listen, reply, write, or explain one Quranic word.",
      actionLabel: practicedToday ? "Done" : "Start small",
      icon: "check-circle",
      complete: practicedToday,
    },
    {
      id: "review-debt",
      title: hasReviewDebt ? "Review before new Arabic" : "Review debt clear",
      detail: hasReviewDebt
        ? `${retentionSummary.dueCount} due item${retentionSummary.dueCount === 1 ? "" : "s"} should be recalled before adding new content.`
        : "No due review is blocking today's next lesson.",
      actionLabel: hasReviewDebt ? "Recall first" : "Keep clear",
      icon: "repeat",
      complete: !hasReviewDebt,
    },
    {
      id: "tomorrow-anchor",
      title: "Tomorrow anchor",
      detail: retentionSummary.nextDueAt
        ? `Next scheduled review: ${retentionSummary.nextDueAt}.`
        : "Schedule one sound, dialogue line, sentence, or Quranic word for tomorrow.",
      actionLabel: retentionSummary.nextDueAt
        ? "Review scheduled"
        : "Schedule one",
      icon: "calendar",
      complete: Boolean(retentionSummary.nextDueAt),
    },
    {
      id: "gentle-restart",
      title: needsRestart ? "Restart without guilt" : "No restart needed",
      detail: needsRestart
        ? "Use a two-minute recall-first drill, then rebuild the streak from today."
        : "The streak is still in rhythm; keep the next action tiny.",
      actionLabel: needsRestart ? "Restart gently" : "Stay light",
      icon: "refresh-cw",
      complete: !needsRestart,
    },
  ];

  return {
    title: "Arabic streak care",
    statusLabel,
    primaryActionLabel,
    body: "Streak care keeps Arabic consistent without turning worship or learning into pressure.",
    proofLabel:
      daysSincePractice === null
        ? "No saved practice day yet"
        : practicedToday
          ? `${Math.max(1, streakCount)} day streak protected today`
          : practicedYesterday
            ? `${Math.max(1, streakCount)} day streak can continue today`
            : `Last saved practice was ${daysSincePractice} days ago`,
    recoveryLabel,
    boundaryLabel:
      "Arabic streak care proves practice rhythm only; it does not certify fluency, tajwid, Quran interpretation, or religious status.",
    tone,
    steps,
  };
}

export function registerArabicGameCompletion(
  progress: ArabicLearningProgress,
  gameId: string,
  xp: number,
): ArabicLearningProgress {
  const current = progress.gamePracticeCounts[gameId] ?? 0;
  return registerArabicPractice(
    {
      ...progress,
      gamePracticeCounts: {
        ...progress.gamePracticeCounts,
        [gameId]: current + 1,
      },
    },
    xp,
  );
}

export function getArabicLearningProgressScore(
  progress: ArabicLearningProgress,
  totals: {
    letters: number;
    dialogues: number;
    patterns: number;
    words: number;
  },
) {
  const letterProgress =
    totals.letters > 0
      ? Math.round(
          (progress.masteredLetterIndexes.length / totals.letters) * 100,
        )
      : 0;
  const dialogueReps = Object.values(progress.dialoguePracticeCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const dialogueReplyAttempts = Object.values(
    progress.dialogueReplyAttemptCounts,
  ).reduce((sum, count) => sum + count, 0);
  const conversationRounds = Object.values(
    progress.conversationRoundCounts,
  ).reduce((sum, count) => sum + count, 0);
  const strongConversationRounds = Object.values(
    progress.conversationRoundStrongCounts,
  ).reduce((sum, count) => sum + count, 0);
  const dictationAttempts = Object.values(
    progress.dictationAttemptCounts,
  ).reduce((sum, count) => sum + count, 0);
  const dictationStrong = Object.values(progress.dictationStrongCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const speakingShadowReps = Object.values(
    progress.speakingShadowCounts,
  ).reduce((sum, count) => sum + count, 0);
  const confidentSpeakingLines = Object.values(
    progress.speakingConfidenceRatings,
  ).filter((rating) => rating >= 3).length;
  const patternReps = Object.values(progress.patternPracticeCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const sentenceAttempts = Object.values(
    progress.sentenceBuilderAttemptCounts,
  ).reduce((sum, count) => sum + count, 0);
  const wordReps = Object.values(progress.wordReviewCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const wordMeaningAttempts = Object.values(
    progress.wordMeaningAttemptCounts,
  ).reduce((sum, count) => sum + count, 0);
  const audioListenEntries = Object.entries(progress.audioListenCounts);
  const dialogueListenReps = audioListenEntries
    .filter(
      ([key]) =>
        key.startsWith("turn:") ||
        key.startsWith("reply:") ||
        key.startsWith("dialogue:") ||
        key.startsWith("dictation-listen:"),
    )
    .reduce((sum, [, count]) => sum + count, 0);
  const patternListenReps = audioListenEntries
    .filter(([key]) => key.startsWith("pattern:") || key.startsWith("draft:"))
    .reduce((sum, [, count]) => sum + count, 0);
  const wordListenReps = audioListenEntries
    .filter(([key]) => key.startsWith("word:"))
    .reduce((sum, [, count]) => sum + count, 0);

  return {
    letters: Math.min(100, letterProgress),
    dialogues: Math.min(
      100,
      Math.round(
        ((dialogueReps +
          dialogueReplyAttempts +
          conversationRounds * 2 +
          strongConversationRounds * 2 +
          dictationAttempts +
          dictationStrong +
          speakingShadowReps +
          confidentSpeakingLines +
          Math.floor(Math.min(dialogueListenReps, totals.dialogues * 6) / 3)) /
          (totals.dialogues * 4)) *
          100,
      ),
    ),
    patterns: Math.min(
      100,
      Math.round(
        ((patternReps +
          sentenceAttempts +
          Math.floor(Math.min(patternListenReps, totals.patterns * 4) / 4)) /
          (totals.patterns * 2)) *
          100,
      ),
    ),
    words: Math.min(
      100,
      Math.round(
        ((wordReps +
          wordMeaningAttempts +
          Math.floor(Math.min(wordListenReps, totals.words * 2) / 2)) /
          totals.words) *
          100,
      ),
    ),
  };
}
