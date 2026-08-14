import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";

export interface QuranLearnedWord {
  id: string;
  arabicWord: string;
  normalizedArabicWord?: string;
  translationWord: string;
  transliterationWord?: string;
  wordLocation?: string;
  surahNumber: number;
  ayahNumber: number;
  position: number;
  learnedAt: string;
  reviewCount: number;
}

export interface QuranMemoryCard {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  translation: string;
  savedAt: string;
  prompt: string;
}

export interface QuranReflectionNote {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  note: string;
  prompt: string;
  sourceReference: string;
  savedAt: string;
  updatedAt: string;
}

export type QuranRecitationPracticeQuality = "confident" | "repeat" | "teacher";

export interface QuranRecitationPractice {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  quality: QuranRecitationPracticeQuality;
  practicedAt: string;
  practiceCount: number;
}

export interface QuranWordOccurrence {
  verseKey: string;
  text: string;
  translation?: string;
}

export interface QuranLearningStats {
  learnedWords: number;
  savedLessons: number;
  reflectionNotes: number;
  recitationSessions: number;
  lastWord?: QuranLearnedWord;
  lastLesson?: QuranMemoryCard;
  lastReflectionNote?: QuranReflectionNote;
  lastRecitationPractice?: QuranRecitationPractice;
}

export interface QuranWordMastery {
  saved: boolean;
  reviewCount: number;
  firstLearnedAt?: string;
  lastLearnedAt?: string;
  sameNormalizedWordCount: number;
}

export interface QuranWordLearningPlan {
  statusLabel: string;
  statusBody: string;
  nextReviewLabel: string;
  dueNow: boolean;
  masteryPercent: number;
  practiceSteps: {
    id: "listen" | "meaning" | "find" | "review";
    title: string;
    body: string;
  }[];
}

export interface QuranStreakRecoveryKhatmahPlan {
  statusLabel: string;
  statusBody: string;
  recoveryLabel: string;
  khatmahPaceLabel: string;
  planningWindowLabel: string;
  accountabilityLabel: string;
  nextAction: string;
  sourceNote: string;
  proofReceipts: QuranPlanProofReceipt[];
  milestones: {
    id: "today" | "week" | "ramadan" | "review";
    title: string;
    body: string;
    evidenceLabel: string;
  }[];
  steps: {
    id: "recover" | "pace" | "reflect";
    title: string;
    body: string;
  }[];
}

export interface QuranPlanProofReceipt {
  id: "reading" | "recitation" | "reflection" | "claim-boundary";
  title: string;
  evidenceLabel: string;
  saveLabel: string;
  boundaryLabel: string;
  icon: "book-open" | "headphones" | "edit-3" | "shield";
  tone: "primary" | "scholar" | "danger";
}

export type QuranDailySessionActionId =
  | "listen"
  | "learn_word"
  | "understand"
  | "recite"
  | "reflect";

export interface QuranDailySessionHandoff {
  title: string;
  statusLabel: string;
  nextActionId: QuranDailySessionActionId;
  nextActionLabel: string;
  proofLabel: string;
  boundaryLabel: string;
  checklist: string[];
}

export type QuranReadingSessionActionId =
  | "play_audio"
  | "ask_source"
  | "practice_recitation"
  | "save_reflection"
  | "create_review_packet";

export interface QuranReadingSessionContractItem {
  id:
    | "quran_anchor"
    | "audio_state"
    | "reflection_note"
    | "tafsir_review"
    | "khatmah_recovery";
  title: string;
  statusLabel: string;
  body: string;
  icon: "book-open" | "headphones" | "edit-3" | "shield" | "refresh-cw";
  tone: "primary" | "scholar" | "danger";
}

export interface QuranReadingSessionContract {
  title: string;
  statusLabel: string;
  sourceLabel: string;
  nextActionId: QuranReadingSessionActionId;
  nextActionLabel: string;
  trustBoundary: string;
  items: QuranReadingSessionContractItem[];
}

export interface QuranScholarReviewEscalationItem {
  id: "quran_anchor" | "sensitive_scope" | "missing_context" | "packet_handoff";
  title: string;
  body: string;
  actionLabel: string;
  tone: "primary" | "scholar" | "danger";
}

export interface QuranScholarReviewEscalationContract {
  title: string;
  statusLabel: string;
  packetTitle: string;
  packetQuestion: string;
  answerSummary: string;
  sourceStatus: string;
  sourceRefs: string[];
  sourceCoverage: string;
  warning: string;
  reviewPrompt: string;
  boundaryLabel: string;
  reasons: string[];
  contextNeeded: string[];
  items: QuranScholarReviewEscalationItem[];
}

export interface QuranAyahJourneyWord {
  arabicWord: string;
  translationWord?: string;
  transliterationWord?: string;
  normalizedArabicWord?: string;
  position: number;
}

export interface QuranAyahJourney {
  reference: string;
  themeLabel: string;
  themeBody: string;
  beginnerContext: string;
  beginnerTerms: QuranBeginnerTerm[];
  actionPoint: string;
  reflectionPrompt: string;
  memorisationPrompt: string;
  sourceNote: string;
  wordFocus?: QuranAyahJourneyWord;
}

export interface QuranBeginnerTerm {
  term: string;
  meaning: string;
}

export interface QuranAyahPracticeStatus {
  memorySaved: boolean;
  savedLessonAt?: string;
  recitationPracticeCount: number;
  lastRecitationQuality?: QuranRecitationPracticeQuality;
  lastPracticedAt?: string;
}

export type QuranProgressIdentityId =
  | "quran_journey"
  | "reflective_reader"
  | "word_builder"
  | "memorisation_builder"
  | "recitation_builder";

export interface QuranProgressIdentity {
  id: QuranProgressIdentityId;
  title: string;
  body: string;
  icon: "book-open" | "edit-3" | "type" | "repeat" | "mic";
  nextAction: string;
  familyPrompt: string;
  accent: "primary" | "scholar";
}

export type QuranIntelligenceModuleId =
  | "word_intelligence"
  | "ayah_journey"
  | "beginner_mode"
  | "memorisation_mode"
  | "family_challenges";

export interface QuranIntelligenceModule {
  id: QuranIntelligenceModuleId;
  title: string;
  subtitle: string;
  outcome: string;
  icon: "type" | "compass" | "sunrise" | "repeat" | "users";
  accent: "primary" | "scholar";
  premium?: boolean;
}

const LEARNED_WORDS_KEY = "quran_learned_words_v1";
const MEMORY_CARDS_KEY = "quran_memory_cards_v1";
const REFLECTION_NOTES_KEY = "quran_reflection_notes_v1";
const RECITATION_PRACTICE_KEY = "quran_recitation_practice_v1";
const FAMILY_CHALLENGES_KEY = "family_challenges";
const QURAN_WORD_AUDIO_BASE_URL = "https://audio.qurancdn.com/";

export const QURAN_INTELLIGENCE_MODULES: QuranIntelligenceModule[] = [
  {
    id: "word_intelligence",
    title: "Word Intelligence",
    subtitle: "Tap Arabic words for meaning, audio, review, and Quran matches.",
    outcome: "Learn one Quran word in context.",
    icon: "type",
    accent: "primary",
  },
  {
    id: "ayah_journey",
    title: "Ayah Journey",
    subtitle:
      "Meaning, context, action point, memory cue, and source boundary.",
    outcome: "Turn one ayah into one action.",
    icon: "compass",
    accent: "scholar",
    premium: true,
  },
  {
    id: "beginner_mode",
    title: "Beginner Mode",
    subtitle:
      "Plain explanations for new Muslims, returning Muslims, and guests.",
    outcome: "Understand without needing background knowledge.",
    icon: "sunrise",
    accent: "primary",
    premium: true,
  },
  {
    id: "memorisation_mode",
    title: "Memorisation Mode",
    subtitle: "Hide, repeat, reveal, mark recall, and build spaced review.",
    outcome: "Practise one ayah honestly.",
    icon: "repeat",
    accent: "scholar",
  },
  {
    id: "family_challenges",
    title: "Family Quran Challenges",
    subtitle: "Create shared listen, reflect, and apply goals from any ayah.",
    outcome: "Make Quran a family habit.",
    icon: "users",
    accent: "primary",
    premium: true,
  },
];

export function normalizeArabicSearchTerm(value: string): string {
  return value
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ـ۞۩]/g, "")
    .trim();
}

export function quranWordAudioUrl(audioUrl?: string | null): string | null {
  const url = audioUrl?.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${QURAN_WORD_AUDIO_BASE_URL}${url.replace(/^\/+/, "")}`;
}

function stableWordId(params: {
  surahNumber: number;
  ayahNumber: number;
  position: number;
  arabicWord: string;
}) {
  return `${params.surahNumber}:${params.ayahNumber}:${params.position}:${params.arabicWord}`;
}

function compactText(value?: string, maxLength = 180): string {
  const clean = value?.replace(/\s+/g, " ").trim() || "";
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}...`;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function formatReviewWait(days: number): string {
  if (days <= 0) return "Due now";
  if (days === 1) return "Review tomorrow";
  return `Review in ${days} days`;
}

function safeDaysSince(timestamp?: number | null): number | null {
  if (!timestamp || !Number.isFinite(timestamp)) return null;
  const start = new Date(timestamp);
  if (!Number.isFinite(start.getTime())) return null;
  return Math.max(0, daysBetween(start, new Date()));
}

export function buildQuranStreakRecoveryKhatmahPlan(input: {
  totalVersesRead?: number;
  totalVerses?: number;
  lastReadAt?: number | null;
  lastReadLabel?: string | null;
  currentSurahName?: string;
  currentVerseNumber?: number;
  currentSurahRemaining?: number;
  savedLessons?: number;
  reflectionNotes?: number;
  recitationSessions?: number;
}): QuranStreakRecoveryKhatmahPlan {
  const totalVerses = Math.max(1, input.totalVerses || 6236);
  const totalVersesRead = Math.max(0, input.totalVersesRead || 0);
  const savedLessons = Math.max(0, input.savedLessons || 0);
  const reflectionNotes = Math.max(0, input.reflectionNotes || 0);
  const recitationSessions = Math.max(0, input.recitationSessions || 0);
  const remaining = Math.max(0, totalVerses - totalVersesRead);
  const daysAway = safeDaysSince(input.lastReadAt);
  const dailyThirtyDayPace = Math.max(1, Math.ceil(remaining / 30));
  const weeklyPace = Math.max(1, dailyThirtyDayPace * 7);
  const currentSurahRemaining = Math.max(0, input.currentSurahRemaining || 0);
  const currentReference = `${input.currentSurahName || "this surah"} ${input.currentVerseNumber || 1}`;
  const completedPercent = Math.min(
    100,
    Math.round((totalVersesRead / totalVerses) * 100),
  );

  const recoveryLabel =
    daysAway === null
      ? "Start your streak today"
      : daysAway <= 1
        ? "Streak protected"
        : `${daysAway}-day recovery`;
  const statusLabel =
    remaining === 0
      ? "Khatmah completed"
      : daysAway && daysAway > 1
        ? "Streak recovery ready"
        : "Khatmah rhythm active";
  const statusBody =
    remaining === 0
      ? "You have a complete-reading milestone recorded. Keep returning with review, reflection, and recitation."
      : daysAway && daysAway > 1
        ? `Return gently from ${input.lastReadLabel || "your last saved place"} with one ayah, one reflection, and a small pace. No guilt, just a restart.`
        : `Keep today simple: continue from ${currentReference}, then save one lesson so the reading becomes memory.`;

  return {
    statusLabel,
    statusBody,
    recoveryLabel,
    khatmahPaceLabel:
      remaining === 0
        ? "Review mode"
        : `${dailyThirtyDayPace} ayah/day for 30 days`,
    planningWindowLabel:
      remaining === 0
        ? "Review and retention window"
        : "Ramadan/Khatmah planning window",
    accountabilityLabel:
      remaining === 0
        ? "Keep a revision trail with listening, recitation, and reflection."
        : `${remaining} ayah remaining • ${completedPercent}% recorded • ${weeklyPace} ayah/week gentle pace`,
    nextAction:
      currentSurahRemaining > 0
        ? `Read ${Math.min(currentSurahRemaining, dailyThirtyDayPace)} more ayah from this surah.`
        : "Open the next surah and read one ayah slowly.",
    sourceNote:
      "This is a habit and Khatmah planning aid from your saved reading progress, not a religious ruling or promise of reward.",
    proofReceipts: [
      {
        id: "reading",
        title: "Reading progress",
        evidenceLabel: `${totalVersesRead}/${totalVerses} ayah recorded`,
        saveLabel:
          currentSurahRemaining > 0
            ? `Save ${Math.min(currentSurahRemaining, dailyThirtyDayPace)} more ayah from this surah.`
            : "Open the next surah and save one ayah slowly.",
        boundaryLabel:
          "This records reading only; it does not mark memorisation or spiritual rank.",
        icon: "book-open",
        tone: "primary",
      },
      {
        id: "recitation",
        title: "Recitation practice",
        evidenceLabel: `${recitationSessions} recitation practice session(s) saved`,
        saveLabel: "Listen once, then mark honest recitation quality.",
        boundaryLabel:
          "Audio and recitation marks support practice; a qualified teacher should assess tajwid.",
        icon: "headphones",
        tone: recitationSessions > 0 ? "primary" : "scholar",
      },
      {
        id: "reflection",
        title: "Reflection notes",
        evidenceLabel: `${reflectionNotes} private reflection note(s) saved`,
        saveLabel:
          savedLessons > 0
            ? "Connect one saved lesson to a private reflection."
            : "Save one lesson or reflection before calling today complete.",
        boundaryLabel:
          "Private reflections support learning; they are not tafsir, a fatwa, or a claim about reward.",
        icon: "edit-3",
        tone: "scholar",
      },
      {
        id: "claim-boundary",
        title: "Plan limits",
        evidenceLabel:
          remaining === 0 ? "Khatmah review mode" : "Khatmah in progress",
        saveLabel: "Keep your Khatmah pace gentle and your source notes clear.",
        boundaryLabel:
          "This is personal planning support, not a ruling or promise of reward.",
        icon: "shield",
        tone: "danger",
      },
    ],
    milestones: [
      {
        id: "today",
        title: "Today",
        body:
          daysAway && daysAway > 1
            ? "Restart with one ayah and one honest note."
            : "Protect today's ayah with listening and reflection.",
        evidenceLabel: currentReference,
      },
      {
        id: "week",
        title: "7-day pace",
        body:
          remaining === 0
            ? "Repeat recent surahs and keep revision gentle."
            : `Aim for ${weeklyPace} ayah this week without rushing.`,
        evidenceLabel:
          remaining === 0 ? "Revision trail" : `${weeklyPace} ayah target`,
      },
      {
        id: "ramadan",
        title: "Ramadan/Khatmah",
        body:
          remaining === 0
            ? "Use Ramadan mode for reflection and revision, not only count."
            : `Use ${dailyThirtyDayPace} ayah/day as a planning pace when you want a 30-day rhythm.`,
        evidenceLabel:
          remaining === 0 ? "Review mode" : `${dailyThirtyDayPace}/day`,
      },
      {
        id: "review",
        title: "Retention",
        body: "Save one lesson, word, or recitation mark so progress becomes reviewable.",
        evidenceLabel: "Private learning progress",
      },
    ],
    steps: [
      {
        id: "recover",
        title: daysAway && daysAway > 1 ? "Recover" : "Continue",
        body:
          daysAway && daysAway > 1
            ? "Read one ayah slowly, then stop before the restart feels heavy."
            : "Read or listen to the current ayah with attention.",
      },
      {
        id: "pace",
        title: "Khatmah pace",
        body:
          remaining === 0
            ? "Review recent surahs instead of chasing a new count."
            : `Use ${dailyThirtyDayPace} ayah per day as a gentle Ramadan/Khatmah pace.`,
      },
      {
        id: "reflect",
        title: "Anchor",
        body: "Save one private reflection so progress becomes a lived lesson.",
      },
    ],
  };
}

export function buildQuranDailySessionHandoff(input: {
  reference: string;
  identityTitle?: string;
  ayahThemeLabel?: string;
  audioActive?: boolean;
  wordSaved?: boolean;
  lessonSaved?: boolean;
  recitationPracticed?: boolean;
  reflectionSaved?: boolean;
  sourceBoundary?: string;
}): QuranDailySessionHandoff {
  const reference = input.reference || "today's ayah";
  const theme = input.ayahThemeLabel || "Reflection";
  const identity = input.identityTitle || "Quran journey";

  const nextActionId: QuranDailySessionActionId = !input.audioActive
    ? "listen"
    : !input.wordSaved
      ? "learn_word"
      : !input.lessonSaved
        ? "understand"
        : !input.recitationPracticed
          ? "recite"
          : "reflect";

  const nextActionCopy: Record<QuranDailySessionActionId, string> = {
    listen: `Listen to ${reference} once before studying.`,
    learn_word: "Learn one Quran word from this ayah.",
    understand: "Ask for a source-aware meaning and save the lesson.",
    recite: "Practise recitation and mark the honest quality.",
    reflect: "Save one private reflection or action point.",
  };

  const completedCount = [
    input.audioActive,
    input.wordSaved,
    input.lessonSaved,
    input.recitationPracticed,
    input.reflectionSaved,
  ].filter(Boolean).length;

  return {
    title: "Today's Quran handoff",
    statusLabel:
      completedCount >= 4
        ? `${identity}: session nearly complete`
        : `${identity}: ${completedCount}/5 steps anchored`,
    nextActionId,
    nextActionLabel: nextActionCopy[nextActionId],
    proofLabel: `${reference} • ${theme} • listen, word, meaning, recite, reflect`,
    boundaryLabel:
      input.sourceBoundary ||
      "This is a learning handoff from your saved Quran activity, not tafsir, a fatwa, or a claim about reward.",
    checklist: [
      input.audioActive ? "Listening started" : "Listen once",
      input.wordSaved ? "Word saved" : "Learn one word",
      input.lessonSaved ? "Lesson saved" : "Understand the meaning",
      input.recitationPracticed ? "Recitation logged" : "Practise recitation",
      input.reflectionSaved ? "Reflection saved" : "Write one reflection",
    ],
  };
}

export function buildQuranReadingSessionContract(input: {
  reference: string;
  sourceStatusLabel?: string;
  audioActive?: boolean;
  reflectionSaved?: boolean;
  lessonSaved?: boolean;
  recitationPracticed?: boolean;
  hasVerifiedContext?: boolean;
  recoveryLabel?: string;
  khatmahPaceLabel?: string;
}): QuranReadingSessionContract {
  const reference = input.reference || "the selected ayah";
  const sourceLabel = input.hasVerifiedContext
    ? input.sourceStatusLabel || "Quran anchor plus context available"
    : input.sourceStatusLabel ||
      "Quran ayah anchored; deeper context needs review";
  const anchoredCount = [
    true,
    input.audioActive,
    input.lessonSaved,
    input.recitationPracticed,
    input.reflectionSaved,
    input.hasVerifiedContext,
  ].filter(Boolean).length;

  const nextActionId: QuranReadingSessionActionId = !input.audioActive
    ? "play_audio"
    : !input.lessonSaved
      ? "ask_source"
      : !input.recitationPracticed
        ? "practice_recitation"
        : !input.reflectionSaved
          ? "save_reflection"
          : "create_review_packet";

  const nextActionCopy: Record<QuranReadingSessionActionId, string> = {
    play_audio: `Play ${reference} once before study.`,
    ask_source: "Ask for a source-aware meaning, then save the lesson.",
    practice_recitation: "Practise recitation and mark honest quality.",
    save_reflection: "Save one private reflection or action point.",
    create_review_packet:
      "Prepare a clear question for a qualified scholar when the topic is sensitive.",
  };

  return {
    title: "Today's Quran reading path",
    statusLabel: `${anchoredCount}/6 signals ready for ${reference}`,
    sourceLabel,
    nextActionId,
    nextActionLabel: nextActionCopy[nextActionId],
    trustBoundary:
      "Quran reading, listening, memorisation practice, and private reflection can continue here. Ask a qualified scholar about sensitive tafsir, fiqh, tajwid assessment, or personal circumstances.",
    items: [
      {
        id: "quran_anchor",
        title: "Quran anchor",
        statusLabel: reference,
        body: "The selected ayah stays attached to every study action.",
        icon: "book-open",
        tone: "primary",
      },
      {
        id: "audio_state",
        title: "Audio state",
        statusLabel: input.audioActive ? "Listening active" : "Not started",
        body: input.audioActive
          ? "Audio is part of today's practice."
          : "Listen once before asking for deeper meaning.",
        icon: "headphones",
        tone: input.audioActive ? "primary" : "scholar",
      },
      {
        id: "reflection_note",
        title: "Reflection note",
        statusLabel: input.reflectionSaved ? "Private note saved" : "Waiting",
        body: input.reflectionSaved
          ? "Reflection is saved as personal learning, not tafsir."
          : "Save one private note after reading the ayah.",
        icon: "edit-3",
        tone: "scholar",
      },
      {
        id: "tafsir_review",
        title: "Source review",
        statusLabel: sourceLabel,
        body: input.hasVerifiedContext
          ? "Context is present, but rulings and sensitive cases still need review."
          : "Plain reflection can continue; tafsir or ruling claims need sources.",
        icon: "shield",
        tone: input.hasVerifiedContext ? "scholar" : "danger",
      },
      {
        id: "khatmah_recovery",
        title: "Khatmah rhythm",
        statusLabel: input.khatmahPaceLabel || "Gentle pace",
        body: input.recoveryLabel
          ? `${input.recoveryLabel}. Keep the pace gentle and personal.`
          : "Keep the pace gentle and personal.",
        icon: "refresh-cw",
        tone: "primary",
      },
    ],
  };
}

export function buildQuranScholarReviewEscalationContract(input: {
  reference: string;
  surahName?: string;
  translation?: string;
  ayahThemeLabel?: string;
  audienceLabel?: string;
  hasVerifiedContext?: boolean;
}): QuranScholarReviewEscalationContract {
  const reference = input.reference || "the selected ayah";
  const surahName = input.surahName || "the current surah";
  const theme = input.ayahThemeLabel || "Quran study";
  const audience = input.audienceLabel || "the selected audience";
  const hasVerifiedContext = Boolean(input.hasVerifiedContext);
  const translation = compactText(
    input.translation ||
      "Translation text should be included by the reviewer from the selected ayah.",
    260,
  );

  return {
    title: "When to ask a scholar",
    statusLabel: hasVerifiedContext
      ? "Quran reference and context ready"
      : "Quran reference ready; deeper context should be checked",
    packetTitle: `Quran review: ${reference}`,
    packetQuestion: `Please review a NurAI Quran study answer or user question connected to ${reference} in ${surahName}. Audience lens: ${audience}. Confirm what can remain educational, what needs tafsir/source support, and what must be referred to a qualified local scholar.`,
    answerSummary: `${reference} is being studied under "${theme}". Translation/context snapshot: ${translation}`,
    sourceStatus: hasVerifiedContext
      ? "The selected ayah and available context are attached. A qualified scholar should check sensitive tafsir, fiqh, or personal rulings."
      : "The selected ayah is attached. Deeper tafsir, fiqh, and personal rulings need reliable sources and a qualified scholar.",
    sourceRefs: [`Quran ${reference.replace(/^Quran\s+/i, "")}`],
    sourceCoverage: hasVerifiedContext
      ? "quran_anchor_with_context"
      : "quran_anchor_only",
    warning:
      "This question is not a fatwa, tafsir approval, tajwid certification, medical advice, marital advice, or financial ruling.",
    reviewPrompt: `Review the educational explanation for ${reference}. Check source coverage, missing context, sensitive ruling risk, and whether the answer should stay educational-only, request more context, or refer to a qualified local scholar.`,
    boundaryLabel:
      "Quran study can continue. Prepare a clear question for a qualified scholar when rulings, deeper tafsir, or personal circumstances are involved.",
    reasons: [
      "The selected ayah may be enough for personal reflection, but not for issuing a ruling.",
      "Tafsir, asbab al-nuzul, fiqh, tajwid certification, and personal circumstances require qualified human review.",
      "NurAI should preserve the exact Quran anchor, translation snapshot, and missing context before sharing.",
    ],
    contextNeeded: [
      "Exact user question and intended use",
      "Madhhab or scholar preference where relevant",
      "Personal circumstances, dates, location, and urgency if the question is high-care",
      "Which sources or tafsir claims the user wants reviewed",
    ],
    items: [
      {
        id: "quran_anchor",
        title: "Quran anchor",
        body: `${reference} and the translation stay together when you share the question.`,
        actionLabel: "Keep reference",
        tone: "primary",
      },
      {
        id: "sensitive_scope",
        title: "Sensitive scope",
        body: "Fiqh, family, health, finance, or personal ruling questions are not answered casually.",
        actionLabel: "Ask a scholar",
        tone: "danger",
      },
      {
        id: "missing_context",
        title: "Missing context",
        body: "Reviewer sees what context is missing before giving any decision.",
        actionLabel: "Add context",
        tone: "scholar",
      },
      {
        id: "packet_handoff",
        title: "Prepare a question",
        body: "Keep the Quran reference, available sources, and missing context together for a qualified scholar.",
        actionLabel: "Prepare question",
        tone: "scholar",
      },
    ],
  };
}

export function buildQuranWordLearningPlan(input: {
  mastery?: QuranWordMastery | null;
  arabicWord?: string;
  translationWord?: string;
  transliterationWord?: string;
  occurrenceCount?: number;
  hasAudio?: boolean;
}): QuranWordLearningPlan {
  const mastery = input.mastery;
  const saved = Boolean(mastery?.saved);
  const reviewCount = Math.max(0, mastery?.reviewCount || 0);
  const intervals = [0, 1, 3, 7, 14, 30, 60];
  const lastReview = mastery?.lastLearnedAt
    ? new Date(mastery.lastLearnedAt)
    : null;
  const intervalDays = intervals[Math.min(reviewCount, intervals.length - 1)];
  const nextReviewAt =
    lastReview && Number.isFinite(lastReview.getTime())
      ? new Date(lastReview.getTime() + intervalDays * 24 * 60 * 60 * 1000)
      : null;
  const daysUntilReview = nextReviewAt
    ? daysBetween(new Date(), nextReviewAt)
    : 0;
  const dueNow = !saved || daysUntilReview <= 0;
  const occurrenceCount = Math.max(0, input.occurrenceCount || 0);
  const masteryPercent = saved
    ? Math.min(100, 28 + reviewCount * 16 + occurrenceCount * 4)
    : 0;

  const readableWord =
    input.translationWord?.trim() ||
    input.transliterationWord?.trim() ||
    "word";

  return {
    statusLabel: saved ? "Learning rhythm active" : "Start this word",
    statusBody: saved
      ? `You have reviewed "${readableWord}" ${reviewCount} time${reviewCount === 1 ? "" : "s"}. Keep it alive by hearing it, finding it, then using it in reflection.`
      : `Save "${readableWord}" to begin a private Quran vocabulary trail. NurAI will track reviews locally and show where it appears again.`,
    nextReviewLabel: saved ? formatReviewWait(daysUntilReview) : "Save today",
    dueNow,
    masteryPercent,
    practiceSteps: [
      {
        id: "listen",
        title: input.hasAudio ? "Hear" : "Listen in ayah",
        body: input.hasAudio
          ? "Play the word once, then listen to the full ayah."
          : "Play the ayah and repeat this word in context.",
      },
      {
        id: "meaning",
        title: "Meaning",
        body: input.translationWord
          ? `Connect it to "${input.translationWord}".`
          : "Read its available translation and say it back.",
      },
      {
        id: "find",
        title: "Find",
        body:
          occurrenceCount > 0
            ? `Open one of the ${occurrenceCount} Quran matches below.`
            : "Search for it again after saving the word.",
      },
      {
        id: "review",
        title: saved ? "Review" : "Save",
        body: saved
          ? "Log one review when you can recognise it without help."
          : "Add it to your Quran words for spaced review.",
      },
    ],
  };
}

function detectAyahTheme(translation: string): {
  label: string;
  body: string;
  action: string;
} {
  const lower = translation.toLowerCase();
  const checks: {
    label: string;
    words: string[];
    body: string;
    action: string;
  }[] = [
    {
      label: "Mercy",
      words: ["mercy", "merciful", "forgive", "forgiveness", "compassion"],
      body: "Read this ayah through Allah's mercy and the hope it opens for sincere return.",
      action:
        "Make one private dua for mercy, then show mercy to one person today.",
    },
    {
      label: "Guidance",
      words: ["guide", "guidance", "path", "straight", "light"],
      body: "This ayah points the reader toward guidance, clarity, and choosing the path that pleases Allah.",
      action:
        "Ask Allah for guidance before your next decision, even if it feels small.",
    },
    {
      label: "Prayer",
      words: ["prayer", "pray", "salah", "worship", "bow", "prostrate"],
      body: "This ayah connects knowledge to worship, not only information.",
      action:
        "Protect your next salah and pause for one sincere moment before starting.",
    },
    {
      label: "Patience",
      words: ["patient", "patience", "steadfast", "endure", "persevere"],
      body: "This ayah trains the heart to stay steady when worship, pressure, or hardship feels heavy.",
      action:
        "Choose one difficulty today and respond with restraint before reacting.",
    },
    {
      label: "Gratitude",
      words: ["thanks", "thankful", "grateful", "gratitude", "favor"],
      body: "This ayah turns attention toward gifts, responsibility, and remembering the Giver.",
      action: "Name one blessing, then use it in a way that pleases Allah.",
    },
    {
      label: "Accountability",
      words: ["day", "judgment", "account", "return", "reward", "punishment"],
      body: "This ayah reminds the reader that choices matter and that the akhirah gives life its direction.",
      action:
        "Leave one avoidable wrong today because you remember returning to Allah.",
    },
    {
      label: "Tawhid",
      words: ["allah", "lord", "creator", "one", "alone", "worship"],
      body: "This ayah centres the heart on Allah, His right to be worshipped, and our dependence on Him.",
      action:
        "Renew your intention before one routine action and make it for Allah.",
    },
  ];

  const match = checks.find((item) =>
    item.words.some((word) => lower.includes(word)),
  );

  return (
    match || {
      label: "Reflection",
      body: "This ayah deserves a slow read: understand the plain meaning, notice the heart lesson, then carry one action into the day.",
      action:
        "Read the ayah once more slowly and write one sentence about what it asks from you.",
    }
  );
}

function chooseWordFocus(
  words?: QuranAyahJourneyWord[],
): QuranAyahJourneyWord | undefined {
  const candidates =
    words?.filter(
      (word) =>
        word.arabicWord?.trim() &&
        word.translationWord?.trim() &&
        !/^[.,;:!?،؛]+$/.test(word.translationWord.trim()),
    ) || [];

  return (
    candidates.find((word) => (word.translationWord || "").length >= 4) ||
    candidates[0]
  );
}

function buildBeginnerTerms(input: {
  translation?: string;
  themeLabel: string;
  wordFocus?: QuranAyahJourneyWord;
}): QuranBeginnerTerm[] {
  const text = `${input.translation || ""} ${input.themeLabel}`.toLowerCase();
  const terms: QuranBeginnerTerm[] = [
    {
      term: "Ayah",
      meaning: "A verse of the Quran.",
    },
    {
      term: "Surah",
      meaning: "A chapter of the Quran.",
    },
  ];

  const candidates: { keys: string[]; term: string; meaning: string }[] = [
    {
      keys: ["allah", "lord", "god"],
      term: "Allah",
      meaning: "The Arabic name for God, used by Muslims.",
    },
    {
      keys: ["mercy", "merciful", "forgive"],
      term: "Rahmah",
      meaning: "Mercy, care, and compassion from Allah.",
    },
    {
      keys: ["guide", "guidance", "path"],
      term: "Hidayah",
      meaning: "Guidance from Allah toward what is right.",
    },
    {
      keys: ["worship", "prayer", "pray", "bow", "prostrate"],
      term: "Ibadah",
      meaning: "Worship and obedience done for Allah.",
    },
    {
      keys: ["return", "judgment", "reward", "account"],
      term: "Akhirah",
      meaning: "The life after death and final accountability.",
    },
  ];

  for (const item of candidates) {
    if (item.keys.some((key) => text.includes(key))) {
      terms.push({ term: item.term, meaning: item.meaning });
    }
  }

  if (input.wordFocus?.translationWord && input.wordFocus?.arabicWord) {
    terms.push({
      term: input.wordFocus.arabicWord,
      meaning: `A word in this ayah meaning "${input.wordFocus.translationWord}".`,
    });
  }

  return terms
    .filter(
      (term, index, list) =>
        list.findIndex((item) => item.term === term.term) === index,
    )
    .slice(0, 5);
}

export function buildQuranAyahJourney(input: {
  surahNumber: number;
  ayahNumber: number;
  surahName?: string;
  translation?: string;
  words?: QuranAyahJourneyWord[];
  verifiedContext?: string;
}): QuranAyahJourney {
  const reference = `Quran ${input.surahNumber}:${input.ayahNumber}`;
  const translation = input.translation?.trim() || "";
  const theme = detectAyahTheme(translation);
  const wordFocus = chooseWordFocus(input.words);
  const sourceContext = compactText(input.verifiedContext, 170);
  const beginnerTerms = buildBeginnerTerms({
    translation,
    themeLabel: theme.label,
    wordFocus,
  });

  return {
    reference,
    themeLabel: theme.label,
    themeBody: theme.body,
    beginnerContext: sourceContext
      ? `Verified app context: ${sourceContext}`
      : "This journey stays anchored to the selected ayah and translation. No revelation background, tafsir detail, or ruling is inferred unless a verified source is available.",
    beginnerTerms,
    actionPoint: theme.action,
    reflectionPrompt: `After reading ${reference}, ask: what belief, habit, or choice should change today?`,
    memorisationPrompt: wordFocus
      ? `Repeat the ayah once, then say ${wordFocus.arabicWord} and its meaning "${wordFocus.translationWord}" before listening again.`
      : "Listen once, hide the translation, then recite the ayah back slowly in short parts.",
    sourceNote: sourceContext
      ? "Context is supported by the bundled NurAI Quran context for this ayah."
      : "Plain meaning only. Deeper tafsir or asbab should use verified sources when available.",
    wordFocus,
  };
}

export function buildQuranProgressIdentity(input: {
  learnedWords?: number;
  savedLessons?: number;
  recitationSessions?: number;
  masteredVerses?: number;
  dueReviews?: number;
  versesRead?: number;
}): QuranProgressIdentity {
  const learnedWords = input.learnedWords || 0;
  const savedLessons = input.savedLessons || 0;
  const recitationSessions = input.recitationSessions || 0;
  const masteredVerses = input.masteredVerses || 0;
  const dueReviews = input.dueReviews || 0;
  const versesRead = input.versesRead || 0;

  if (recitationSessions >= 5) {
    return {
      id: "recitation_builder",
      title: "Recitation Builder",
      body: `${recitationSessions} recitation practice session${recitationSessions === 1 ? "" : "s"} logged.`,
      icon: "mic",
      nextAction: "Listen once, recite back, then mark your confidence.",
      familyPrompt:
        "Each person listens once, recites one ayah slowly, then shares where they need practice.",
      accent: "scholar",
    };
  }

  if (masteredVerses > 0 || dueReviews > 0) {
    return {
      id: "memorisation_builder",
      title: "Memorisation Builder",
      body:
        dueReviews > 0
          ? `${dueReviews} ayah review${dueReviews === 1 ? "" : "s"} waiting.`
          : "Your review rhythm is starting to form.",
      icon: "repeat",
      nextAction: "Open hifz desk, hide the ayah, and review honestly.",
      familyPrompt:
        "Pick one ayah to review together, then let each person share one memory cue.",
      accent: "scholar",
    };
  }

  if (learnedWords >= 5) {
    return {
      id: "word_builder",
      title: "Quranic Word Builder",
      body: `${learnedWords} Quran word${learnedWords === 1 ? "" : "s"} saved for review.`,
      icon: "type",
      nextAction: "Learn one word from today's ayah and listen for it again.",
      familyPrompt:
        "Each person chooses one Arabic word, says its meaning, and finds it in the ayah.",
      accent: "primary",
    };
  }

  if (savedLessons >= 3) {
    return {
      id: "reflective_reader",
      title: "Reflective Reader",
      body: `${savedLessons} ayah lesson${savedLessons === 1 ? "" : "s"} saved.`,
      icon: "edit-3",
      nextAction: "Save one lesson and choose one action for today.",
      familyPrompt:
        "Read the ayah together and let everyone share one lesson and one action.",
      accent: "primary",
    };
  }

  return {
    id: "quran_journey",
    title: "Quran Journey",
    body:
      versesRead > 0
        ? `${versesRead} ayah${versesRead === 1 ? "" : "s"} read across your journey.`
        : "Read, understand, save, and return with purpose.",
    icon: "book-open",
    nextAction: "Read one ayah slowly, then open its Ayah Journey.",
    familyPrompt:
      "Start with one ayah together: listen, read the meaning, and share one reflection.",
    accent: "primary",
  };
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function learnQuranWord(input: {
  arabicWord: string;
  normalizedArabicWord?: string;
  translationWord: string;
  transliterationWord?: string;
  wordLocation?: string;
  surahNumber: number;
  ayahNumber: number;
  position: number;
}): Promise<QuranLearnedWord> {
  const words = await readJson<QuranLearnedWord[]>(LEARNED_WORDS_KEY, []);
  const id = stableWordId(input);
  const existing = words.find((word) => word.id === id);
  const next: QuranLearnedWord = existing
    ? {
        ...existing,
        reviewCount: existing.reviewCount + 1,
        learnedAt: new Date().toISOString(),
      }
    : {
        id,
        arabicWord: input.arabicWord,
        normalizedArabicWord:
          input.normalizedArabicWord ||
          normalizeArabicSearchTerm(input.arabicWord),
        translationWord: input.translationWord,
        transliterationWord: input.transliterationWord,
        wordLocation: input.wordLocation,
        surahNumber: input.surahNumber,
        ayahNumber: input.ayahNumber,
        position: input.position,
        learnedAt: new Date().toISOString(),
        reviewCount: 1,
      };

  const updated = [next, ...words.filter((word) => word.id !== id)].slice(
    0,
    400,
  );
  await syncedSetItem(LEARNED_WORDS_KEY, JSON.stringify(updated));
  return next;
}

export async function getQuranLearnedWords(): Promise<QuranLearnedWord[]> {
  return readJson<QuranLearnedWord[]>(LEARNED_WORDS_KEY, []);
}

export async function getQuranWordMastery(input: {
  arabicWord: string;
  normalizedArabicWord?: string;
  surahNumber: number;
  ayahNumber: number;
  position: number;
}): Promise<QuranWordMastery> {
  const words = await getQuranLearnedWords();
  const normalized =
    input.normalizedArabicWord || normalizeArabicSearchTerm(input.arabicWord);
  const id = stableWordId({
    surahNumber: input.surahNumber,
    ayahNumber: input.ayahNumber,
    position: input.position,
    arabicWord: input.arabicWord,
  });
  const exact = words.find((word) => word.id === id);
  const sameNormalized = normalized
    ? words.filter(
        (word) =>
          (word.normalizedArabicWord ||
            normalizeArabicSearchTerm(word.arabicWord)) === normalized,
      )
    : [];

  return {
    saved: Boolean(exact),
    reviewCount: exact?.reviewCount || 0,
    firstLearnedAt: exact?.learnedAt,
    lastLearnedAt: exact?.learnedAt,
    sameNormalizedWordCount: sameNormalized.length,
  };
}

export async function saveAyahMemoryCard(input: {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  translation: string;
}): Promise<QuranMemoryCard> {
  const cards = await readJson<QuranMemoryCard[]>(MEMORY_CARDS_KEY, []);
  const id = `${input.surahNumber}:${input.ayahNumber}`;
  const next: QuranMemoryCard = {
    id,
    surahNumber: input.surahNumber,
    ayahNumber: input.ayahNumber,
    surahName: input.surahName,
    translation: input.translation,
    savedAt: new Date().toISOString(),
    prompt: "What did this ayah teach me, and how can I live it today?",
  };
  const updated = [next, ...cards.filter((card) => card.id !== id)].slice(
    0,
    300,
  );
  await syncedSetItem(MEMORY_CARDS_KEY, JSON.stringify(updated));
  return next;
}

export async function saveQuranReflectionNote(input: {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  note: string;
  prompt?: string;
}): Promise<QuranReflectionNote> {
  const notes = await readJson<QuranReflectionNote[]>(REFLECTION_NOTES_KEY, []);
  const id = `${input.surahNumber}:${input.ayahNumber}`;
  const existing = notes.find((note) => note.id === id);
  const now = new Date().toISOString();
  const next: QuranReflectionNote = {
    id,
    surahNumber: input.surahNumber,
    ayahNumber: input.ayahNumber,
    surahName: input.surahName,
    note: compactText(input.note, 1200),
    prompt:
      input.prompt ||
      "What belief, habit, or choice should change after this ayah?",
    sourceReference: `Quran ${input.surahNumber}:${input.ayahNumber}`,
    savedAt: existing?.savedAt || now,
    updatedAt: now,
  };
  const updated = [next, ...notes.filter((note) => note.id !== id)].slice(
    0,
    400,
  );
  await syncedSetItem(REFLECTION_NOTES_KEY, JSON.stringify(updated));
  return next;
}

export async function getQuranReflectionNote(input: {
  surahNumber: number;
  ayahNumber: number;
}): Promise<QuranReflectionNote | null> {
  const notes = await readJson<QuranReflectionNote[]>(REFLECTION_NOTES_KEY, []);
  const id = `${input.surahNumber}:${input.ayahNumber}`;
  return notes.find((note) => note.id === id) || null;
}

export async function getQuranReflectionNotes(): Promise<
  QuranReflectionNote[]
> {
  return readJson<QuranReflectionNote[]>(REFLECTION_NOTES_KEY, []);
}

export async function getQuranLearningStats(): Promise<QuranLearningStats> {
  const [words, cards, reflectionNotes, practice] = await Promise.all([
    readJson<QuranLearnedWord[]>(LEARNED_WORDS_KEY, []),
    readJson<QuranMemoryCard[]>(MEMORY_CARDS_KEY, []),
    readJson<QuranReflectionNote[]>(REFLECTION_NOTES_KEY, []),
    readJson<QuranRecitationPractice[]>(RECITATION_PRACTICE_KEY, []),
  ]);

  return {
    learnedWords: words.length,
    savedLessons: cards.length,
    reflectionNotes: reflectionNotes.length,
    recitationSessions: practice.reduce(
      (total, item) => total + Math.max(1, item.practiceCount || 1),
      0,
    ),
    lastWord: words[0],
    lastLesson: cards[0],
    lastReflectionNote: reflectionNotes[0],
    lastRecitationPractice: practice[0],
  };
}

export async function getQuranAyahPracticeStatus(input: {
  surahNumber: number;
  ayahNumber: number;
}): Promise<QuranAyahPracticeStatus> {
  const [cards, practice] = await Promise.all([
    readJson<QuranMemoryCard[]>(MEMORY_CARDS_KEY, []),
    readJson<QuranRecitationPractice[]>(RECITATION_PRACTICE_KEY, []),
  ]);
  const id = `${input.surahNumber}:${input.ayahNumber}`;
  const memory = cards.find((card) => card.id === id);
  const recitation = practice.find((item) => item.id === id);

  return {
    memorySaved: Boolean(memory),
    savedLessonAt: memory?.savedAt,
    recitationPracticeCount: recitation?.practiceCount || 0,
    lastRecitationQuality: recitation?.quality,
    lastPracticedAt: recitation?.practicedAt,
  };
}

export async function saveQuranRecitationPractice(input: {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  quality: QuranRecitationPracticeQuality;
}): Promise<QuranRecitationPractice> {
  const practice = await readJson<QuranRecitationPractice[]>(
    RECITATION_PRACTICE_KEY,
    [],
  );
  const id = `${input.surahNumber}:${input.ayahNumber}`;
  const existing = practice.find((item) => item.id === id);
  const next: QuranRecitationPractice = {
    id,
    surahNumber: input.surahNumber,
    ayahNumber: input.ayahNumber,
    surahName: input.surahName,
    quality: input.quality,
    practicedAt: new Date().toISOString(),
    practiceCount: (existing?.practiceCount || 0) + 1,
  };
  const updated = [next, ...practice.filter((item) => item.id !== id)].slice(
    0,
    400,
  );
  await syncedSetItem(RECITATION_PRACTICE_KEY, JSON.stringify(updated));
  return next;
}

export async function createFamilyQuranChallenge(input: {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  translation?: string;
  quranIdentityTitle?: string;
  quranIdentityId?: QuranProgressIdentityId;
  familyPrompt?: string;
  nextAction?: string;
}): Promise<void> {
  const current = await readJson<any[]>(FAMILY_CHALLENGES_KEY, []);
  const id = `family-quran-${input.surahNumber}-${input.ayahNumber}`;
  const description =
    compactText(input.translation, 140) ||
    "Read this ayah together and share one lesson as a family.";
  const challenge = {
    id,
    title: `${input.surahName} family ayah journey`,
    description,
    icon: "book-open",
    target: 3,
    current: 0,
    unit: "check-ins",
    daysLeft: 3,
    category: "quran",
    reference: `Quran ${input.surahNumber}:${input.ayahNumber}`,
    actionPrompt:
      input.familyPrompt ||
      "Each family member shares one meaning, one question, or one action from this ayah.",
    nextAction:
      input.nextAction ||
      "Listen together, read the meaning, then share one action.",
    quranIdentityTitle: input.quranIdentityTitle || "Family Quran Circle",
    quranIdentityId: input.quranIdentityId || "quran_journey",
    journeyStage: "listen_reflect_apply",
    rewardLabel: "Shared Quran light",
    familyMilestones: ["Listen", "Reflect", "Apply"],
    createdFrom: "quran_reader",
  };
  const updated = [
    challenge,
    ...current.filter((item) => item.id !== id),
  ].slice(0, 30);
  await syncedSetItem(FAMILY_CHALLENGES_KEY, JSON.stringify(updated));
}

export async function searchQuranWordOccurrences(
  arabicWord: string,
): Promise<QuranWordOccurrence[]> {
  const queries = Array.from(
    new Set(
      [arabicWord.trim(), normalizeArabicSearchTerm(arabicWord)].filter(
        Boolean,
      ),
    ),
  );
  if (!queries.length) return [];

  for (const query of queries) {
    const response = await fetch(
      `https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}&size=8&language=en`,
    );
    if (!response.ok) continue;
    const data = await response.json();
    const results = data?.search?.results || data?.results || [];
    const mapped = results
      .map((item: any) => ({
        verseKey: String(item.verse_key || item.verseKey || ""),
        text: String(item.text || item.highlighted || "").replace(
          /<[^>]+>/g,
          "",
        ),
        translation:
          item.translations?.[0]?.text ||
          item.translation ||
          item.translated_text ||
          undefined,
      }))
      .filter((item: QuranWordOccurrence) => item.verseKey && item.text)
      .slice(0, 6);
    if (mapped.length) return mapped;
  }

  return [];
}
