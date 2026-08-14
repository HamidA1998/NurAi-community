import type { ArabicCoachPlanColorKey } from "@/services/arabicDailyCoachPlanService";
import type { ArabicLearningProgress } from "@/services/arabicLearningProgressService";

export type ArabicCorrectionLedgerItemId =
  | "listening-gap"
  | "pronunciation-gap"
  | "meaning-gap"
  | "sentence-gap"
  | "review-lapse";

export type ArabicCorrectionLedgerItem = {
  id: ArabicCorrectionLedgerItemId;
  label: string;
  targetLabel: string;
  evidenceLabel: string;
  correctionLabel: string;
  actionLabel: string;
  prompt: string;
  priority: number;
  complete: boolean;
  icon: "headphones" | "mic" | "book-open" | "edit-3" | "repeat" | "shield";
  colorKey: ArabicCoachPlanColorKey;
};

export type ArabicCorrectionLedgerPlan = {
  title: string;
  statusLabel: string;
  summary: string;
  activeCorrectionLabel: string;
  teacherBoundaryLabel: string;
  claimBoundaryLabel: string;
  items: ArabicCorrectionLedgerItem[];
};

type ArabicCorrectionLedgerInput = {
  progress: ArabicLearningProgress;
  selectedDialogueTitle: string;
  selectedDialogueShadowRepTotal: number;
  selectedDialogueConfidenceAverage: number;
  dailyFluencyProgress: number;
  dailyWordArabic: string;
  dailyWordTransliteration: string;
  dailyWordMeaningAttemptCount: number;
  wordMeaningStrongTotal: number;
  sentenceBuilderAttemptTotal: number;
  sentenceBuilderStrongTotal: number;
  dueReviewCount: number;
  overdueReviewCount: number;
  lapseCount: number;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function averagePositive(values: number[]) {
  const positive = values.filter(
    (value) => Number.isFinite(value) && value > 0,
  );
  if (!positive.length) return 0;
  return positive.reduce((sum, value) => sum + value, 0) / positive.length;
}

export function buildArabicCorrectionLedgerPlan(
  input: ArabicCorrectionLedgerInput,
): ArabicCorrectionLedgerPlan {
  const globalConfidenceAverage = averagePositive(
    Object.values(input.progress.speakingConfidenceRatings),
  );
  const confidenceAverage =
    input.selectedDialogueConfidenceAverage || globalConfidenceAverage;
  const pronunciationComplete =
    input.selectedDialogueShadowRepTotal >= 2 && confidenceAverage >= 3;
  const meaningComplete =
    input.dailyWordMeaningAttemptCount > 0 && input.wordMeaningStrongTotal > 0;
  const sentenceComplete =
    input.sentenceBuilderAttemptTotal > 0 &&
    input.sentenceBuilderStrongTotal > 0;
  const reviewComplete = input.dueReviewCount === 0 && input.lapseCount === 0;

  const unsortedItems: ArabicCorrectionLedgerItem[] = [
    {
      id: "listening-gap",
      label: "Listening correction",
      targetLabel: input.selectedDialogueTitle,
      evidenceLabel: `${clampPercent(input.dailyFluencyProgress)}% listening path`,
      correctionLabel:
        input.dailyFluencyProgress >= 70
          ? "Listening proof is strong enough for today's drill."
          : "Listen before reading, then write the first word you heard.",
      actionLabel:
        input.dailyFluencyProgress >= 70 ? "Keep warm" : "Coach listening",
      prompt: `Run a listening correction for "${input.selectedDialogueTitle}". Make me listen before reading, ask what first word I heard, then show Arabic, transliteration, meaning, and one sound correction.`,
      priority: input.dailyFluencyProgress >= 70 ? 5 : 1,
      complete: input.dailyFluencyProgress >= 70,
      icon: "headphones",
      colorKey: "emerald",
    },
    {
      id: "pronunciation-gap",
      label: "Pronunciation correction",
      targetLabel: "Shadow aloud",
      evidenceLabel: `${input.selectedDialogueShadowRepTotal} shadow rep(s), ${confidenceAverage ? `${confidenceAverage.toFixed(1)}/4 confidence` : "no confidence rating"}`,
      correctionLabel: pronunciationComplete
        ? "Shadow reps and confidence are ready for review."
        : "Repeat one line twice and rate it before counting the turn.",
      actionLabel: pronunciationComplete ? "Review sample" : "Coach sound",
      prompt: `Coach my Arabic pronunciation for "${input.selectedDialogueTitle}". Use one short line, ask me to shadow it twice, then give one mouth-position correction. Do not certify tajwid or pronunciation mastery.`,
      priority: pronunciationComplete ? 6 : 2,
      complete: pronunciationComplete,
      icon: "mic",
      colorKey: "blue",
    },
    {
      id: "meaning-gap",
      label: "Quran-word correction",
      targetLabel: `${input.dailyWordArabic} (${input.dailyWordTransliteration})`,
      evidenceLabel: `${input.dailyWordMeaningAttemptCount} attempt(s), ${input.wordMeaningStrongTotal} strong recall(s)`,
      correctionLabel: meaningComplete
        ? "Meaning recall has at least one strong saved proof."
        : "Explain the word before reveal, then save one corrected meaning.",
      actionLabel: meaningComplete ? "Keep meaning" : "Coach meaning",
      prompt: `Correct my Quranic Arabic word recall for "${input.dailyWordArabic}" (${input.dailyWordTransliteration}). Ask me for the meaning before reveal, then show a beginner language note. Do not give tafsir, a fatwa, or Quran interpretation.`,
      priority: meaningComplete ? 7 : 3,
      complete: meaningComplete,
      icon: "book-open",
      colorKey: "amber",
    },
    {
      id: "sentence-gap",
      label: "Sentence correction",
      targetLabel: "One useful line",
      evidenceLabel: `${input.sentenceBuilderAttemptTotal} attempt(s), ${input.sentenceBuilderStrongTotal} strong`,
      correctionLabel: sentenceComplete
        ? "Writing has at least one strong sentence proof."
        : "Build one line, then fix word order or missing meaning.",
      actionLabel: sentenceComplete ? "Review line" : "Coach sentence",
      prompt:
        "Run a sentence correction drill. Give me one beginner Arabic pattern, ask me to write my own line, then correct only one thing: word order, missing word, or meaning mismatch.",
      priority: sentenceComplete ? 8 : 4,
      complete: sentenceComplete,
      icon: "edit-3",
      colorKey: "purple",
    },
    {
      id: "review-lapse",
      label: "Review-lapse correction",
      targetLabel: "Recall before reveal",
      evidenceLabel: `${input.dueReviewCount} due, ${input.overdueReviewCount} overdue, ${input.lapseCount} lapse(s)`,
      correctionLabel: reviewComplete
        ? "Review debt is clear; schedule one item for tomorrow."
        : "Do due items before new Arabic and mark again, hard, good, or easy.",
      actionLabel: reviewComplete ? "Schedule tomorrow" : "Clear lapse",
      prompt:
        "Run my Arabic review-lapse correction. Start with due items, require recall before reveal, then ask me to mark again, hard, good, or easy. Do not add new Arabic until review is clear.",
      priority: reviewComplete ? 9 : 0,
      complete: reviewComplete,
      icon: "repeat",
      colorKey: "rose",
    },
  ];
  const items = [...unsortedItems].sort((a, b) => a.priority - b.priority);

  const incompleteItems = items.filter((item) => !item.complete);
  const activeCorrection = incompleteItems[0] ?? items[0];

  return {
    title: "Arabic correction ledger",
    statusLabel:
      incompleteItems.length === 0
        ? "No correction debt"
        : `${incompleteItems.length} correction loop${incompleteItems.length === 1 ? "" : "s"} open`,
    summary:
      "The ledger turns daily practice evidence into specific corrections before NurAI lets the learner count the session as strong.",
    activeCorrectionLabel: activeCorrection
      ? `${activeCorrection.label}: ${activeCorrection.correctionLabel}`
      : "No active correction.",
    teacherBoundaryLabel:
      "Use this ledger for practice correction only; a human Arabic teacher must review pronunciation, fluency, tajwid, or Quran-recitation claims.",
    claimBoundaryLabel:
      "Correction loops improve the next drill and do not certify fluency, tajwid, Quran interpretation, or teacher approval.",
    items,
  };
}
