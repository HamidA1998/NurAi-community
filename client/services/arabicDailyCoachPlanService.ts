import type { ArabicLearningProgress } from "@/services/arabicLearningProgressService";

export type ArabicCoachPlanColorKey =
  | "emerald"
  | "blue"
  | "amber"
  | "purple"
  | "rose";

export type ArabicCoachPlanStep = {
  id: string;
  title: string;
  detail: string;
  modeLabel: string;
  freePracticeHint: string;
  actionLabel: string;
  prompt: string;
  progress: number;
  estimatedMinutes: number;
  icon:
    | "headphones"
    | "message-square"
    | "book-open"
    | "edit-3"
    | "repeat"
    | "compass";
  colorKey: ArabicCoachPlanColorKey;
};

export type ArabicDailyPracticeQueueItem = {
  id: "review-debt" | "weakest-skill" | "practice-proof" | "tomorrow-review";
  label: string;
  detail: string;
  statusLabel: string;
  actionLabel: string;
  prompt: string;
  priority: number;
  estimatedMinutes: number;
  lockedByReview: boolean;
  icon:
    | "alert-circle"
    | "target"
    | "clipboard"
    | "calendar"
    | ArabicCoachPlanStep["icon"];
  colorKey: ArabicCoachPlanColorKey;
};

export type ArabicDailyCoachProofReceiptItem = {
  id:
    | "listening"
    | "speaking"
    | "meaning"
    | "writing"
    | "review"
    | "claim_boundary";
  label: string;
  detail: string;
  statusLabel: string;
  complete: boolean;
  colorKey: ArabicCoachPlanColorKey;
  icon:
    | "headphones"
    | "message-square"
    | "book-open"
    | "edit-3"
    | "repeat"
    | "shield";
};

export type ArabicDailySessionContractItem = {
  id: "start" | "proof" | "review" | "boundary";
  label: string;
  detail: string;
  actionLabel: string;
  prompt: string;
  icon: "play-circle" | "clipboard" | "repeat" | "shield";
  colorKey: ArabicCoachPlanColorKey;
  tone: "primary" | "attention" | "blocked";
};

export type ArabicDailySessionContract = {
  title: string;
  statusLabel: string;
  nextActionLabel: string;
  body: string;
  boundaryLabel: string;
  items: ArabicDailySessionContractItem[];
};

export type ArabicDailyCoachPlan = {
  title: string;
  subtitle: string;
  readinessLabel: string;
  readinessProgress: number;
  totalEstimatedMinutes: number;
  nextStepId: string;
  claimBoundaryLabel: string;
  prompt: string;
  sessionContract: ArabicDailySessionContract;
  proofReceipt: ArabicDailyCoachProofReceiptItem[];
  practiceQueue: ArabicDailyPracticeQueueItem[];
  steps: ArabicCoachPlanStep[];
};

type ArabicCoachPlanInput = {
  progress: ArabicLearningProgress;
  dailyFluencyProgress: number;
  placementAverageScore: number;
  completedReviewCount: number;
  totalReviewTasks: number;
  dueReviewCount: number;
  scheduledReviewCount: number;
  selectedDialogueTitle: string;
  conversationRoundProgress: number;
  dailyWordArabic: string;
  dailyWordTransliteration: string;
  dailyWordMeaningAttempts: number;
  sentenceBuilderAttempts: number;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function firstIncomplete(steps: ArabicCoachPlanStep[]) {
  return steps.find((step) => step.progress < 100) ?? steps[0];
}

function buildArabicDailyCoachProofReceipt(
  input: ArabicCoachPlanInput,
  reviewProgress: number,
): ArabicDailyCoachProofReceiptItem[] {
  const listeningComplete = input.dailyFluencyProgress >= 70;
  const speakingComplete = input.conversationRoundProgress >= 70;
  const meaningComplete = input.dailyWordMeaningAttempts > 0;
  const writingComplete = input.sentenceBuilderAttempts > 0;
  const reviewComplete =
    input.dueReviewCount === 0 && input.completedReviewCount > 0;

  return [
    {
      id: "listening",
      label: "Listening practice",
      detail: `${clampPercent(input.dailyFluencyProgress)}% daily fluency progress`,
      statusLabel: listeningComplete ? "Complete" : "Needs one listen",
      complete: listeningComplete,
      colorKey: "emerald",
      icon: "headphones",
    },
    {
      id: "speaking",
      label: "Speaking practice",
      detail: `${clampPercent(input.conversationRoundProgress)}% conversation round readiness`,
      statusLabel: speakingComplete ? "Complete" : "Reply before reveal",
      complete: speakingComplete,
      colorKey: "blue",
      icon: "message-square",
    },
    {
      id: "meaning",
      label: "Quran word recall",
      detail: `${input.dailyWordArabic} (${input.dailyWordTransliteration}) recall attempts: ${input.dailyWordMeaningAttempts}`,
      statusLabel: meaningComplete ? "Recall saved" : "Meaning still open",
      complete: meaningComplete,
      colorKey: "amber",
      icon: "book-open",
    },
    {
      id: "writing",
      label: "Writing practice",
      detail: `${input.sentenceBuilderAttempts} sentence attempt(s) saved`,
      statusLabel: writingComplete ? "Sentence saved" : "Build one line",
      complete: writingComplete,
      colorKey: "purple",
      icon: "edit-3",
    },
    {
      id: "review",
      label: "Memory review",
      detail: `${clampPercent(reviewProgress)}% review loop, ${input.dueReviewCount} due now`,
      statusLabel: reviewComplete ? "Review clear" : "Recall before reveal",
      complete: reviewComplete,
      colorKey: "rose",
      icon: "repeat",
    },
    {
      id: "claim_boundary",
      label: "What this means",
      detail:
        "These signals personalise practice. Ask a teacher to assess fluency, pronunciation, tajwid, or interpretation skill.",
      statusLabel: "Practice guidance",
      complete: true,
      colorKey: "amber",
      icon: "shield",
    },
  ];
}

function buildArabicDailySessionContract(input: {
  nextStep: ArabicCoachPlanStep;
  readinessProgress: number;
  dueReviewCount: number;
  selectedDialogueTitle: string;
  dailyWordArabic: string;
  dailyWordTransliteration: string;
  totalEstimatedMinutes: number;
}): ArabicDailySessionContract {
  const hasReviewDebt = input.dueReviewCount > 0;
  const needsGentleStart = input.readinessProgress < 38;

  return {
    title: "Today's session",
    statusLabel: hasReviewDebt
      ? "Review before new Arabic"
      : needsGentleStart
        ? "Start with one small step"
        : "Ready for today's path",
    nextActionLabel: hasReviewDebt
      ? "Clear review first"
      : input.nextStep.actionLabel,
    body: `Keep today's Arabic loop to about ${input.totalEstimatedMinutes} minutes: start with ${input.nextStep.title.toLowerCase()}, save one practice note, then end with recall before reveal.`,
    boundaryLabel:
      "This is a personal practice path. Ask a qualified teacher for formal assessment of fluency, pronunciation, tajwid, or interpretation.",
    items: [
      {
        id: "start",
        label: "Start here",
        detail: `${input.nextStep.title}: ${input.nextStep.freePracticeHint}`,
        actionLabel: input.nextStep.actionLabel,
        prompt: input.nextStep.prompt,
        icon: "play-circle",
        colorKey: input.nextStep.colorKey,
        tone: "primary",
      },
      {
        id: "proof",
        label: "Save practice note",
        detail: `Save one short practice note from "${input.selectedDialogueTitle}" or ${input.dailyWordTransliteration}.`,
        actionLabel: "Coach practice",
        prompt: `Help me practise "${input.selectedDialogueTitle}" or the Quranic word "${input.dailyWordArabic}" (${input.dailyWordTransliteration}). Ask me to recall before reveal, then suggest a short practice note to keep.`,
        icon: "clipboard",
        colorKey: "emerald",
        tone: "attention",
      },
      {
        id: "review",
        label: "Memory review",
        detail: hasReviewDebt
          ? `${input.dueReviewCount} due review item(s) must be recalled before adding new Arabic.`
          : "No due review debt. Schedule one item for tomorrow before leaving.",
        actionLabel: hasReviewDebt ? "Clear review" : "Schedule review",
        prompt:
          "Run a recall-before-reveal Arabic review. If anything is due, make me answer before showing it; if nothing is due, help me schedule one item for tomorrow.",
        icon: "repeat",
        colorKey: hasReviewDebt ? "rose" : "blue",
        tone: hasReviewDebt ? "blocked" : "attention",
      },
      {
        id: "boundary",
        label: "Teacher check",
        detail:
          "NurAI guides practice. Ask a teacher to assess fluency, pronunciation, tajwid, or Quran interpretation.",
        actionLabel: "Understand progress",
        prompt:
          "Explain my Arabic practice progress honestly and tell me which skills need a teacher's assessment.",
        icon: "shield",
        colorKey: "amber",
        tone: "attention",
      },
    ],
  };
}

function buildArabicDailyPracticeQueue(input: {
  steps: ArabicCoachPlanStep[];
  nextStep: ArabicCoachPlanStep;
  dueReviewCount: number;
  selectedDialogueTitle: string;
  dailyWordArabic: string;
  dailyWordTransliteration: string;
}): ArabicDailyPracticeQueueItem[] {
  const weakestStep =
    [...input.steps]
      .filter((step) => step.id !== "review")
      .sort((a, b) => a.progress - b.progress)[0] ?? input.nextStep;
  const hasReviewDebt = input.dueReviewCount > 0;

  const queue: ArabicDailyPracticeQueueItem[] = [
    {
      id: "review-debt",
      label: hasReviewDebt ? "Clear due review" : "Memory clear",
      detail: hasReviewDebt
        ? `Clear review before new Arabic. ${input.dueReviewCount} due Arabic item(s) must be recalled before new material.`
        : "No due review debt. Keep the next drill short and schedule one item.",
      statusLabel: hasReviewDebt ? "Do first" : "Clear",
      actionLabel: hasReviewDebt ? "Recall first" : "Keep warm",
      prompt: hasReviewDebt
        ? "Run my due Arabic review queue. Make me recall before reveal, then mark each item again, hard, good, or easy."
        : "Run a one-minute Arabic memory warm-up, then schedule one useful item for tomorrow.",
      priority: hasReviewDebt ? 1 : 4,
      estimatedMinutes: hasReviewDebt ? 3 : 1,
      lockedByReview: false,
      icon: hasReviewDebt ? "alert-circle" : "repeat",
      colorKey: hasReviewDebt ? "rose" : "emerald",
    },
    {
      id: "weakest-skill",
      label: "Weakest skill",
      detail: `${weakestStep.title}: ${weakestStep.freePracticeHint}`,
      statusLabel: `${weakestStep.progress}% ready`,
      actionLabel: weakestStep.actionLabel,
      prompt: weakestStep.prompt,
      priority: hasReviewDebt ? 2 : 1,
      estimatedMinutes: weakestStep.estimatedMinutes,
      lockedByReview: hasReviewDebt,
      icon: "target",
      colorKey: weakestStep.colorKey,
    },
    {
      id: "practice-proof",
      label: "Save practice note",
      detail: `Capture one short practice note from "${input.selectedDialogueTitle}" or ${input.dailyWordTransliteration}.`,
      statusLabel: "Practice progress",
      actionLabel: "Save note",
      prompt: `Help me practise "${input.selectedDialogueTitle}" or "${input.dailyWordArabic}" (${input.dailyWordTransliteration}), then suggest one short note and the next drill.`,
      priority: 3,
      estimatedMinutes: 2,
      lockedByReview: hasReviewDebt,
      icon: "clipboard",
      colorKey: "blue",
    },
    {
      id: "tomorrow-review",
      label: "Tomorrow's review",
      detail:
        "Schedule the item you struggled with most so tomorrow starts with recall.",
      statusLabel: "Finish here",
      actionLabel: "Schedule review",
      prompt:
        "Choose one Arabic item from today's practice to review tomorrow. Make the review recall-first and do not count it as mastered until I answer before reveal.",
      priority: 5,
      estimatedMinutes: 1,
      lockedByReview: false,
      icon: "calendar",
      colorKey: "amber",
    },
  ];

  return queue.sort((a, b) => a.priority - b.priority);
}

export function buildArabicDailyCoachPlan(
  input: ArabicCoachPlanInput,
): ArabicDailyCoachPlan {
  const reviewProgress =
    input.totalReviewTasks > 0
      ? (input.completedReviewCount / input.totalReviewTasks) * 100
      : 0;
  const readinessProgress = clampPercent(
    input.dailyFluencyProgress * 0.44 +
      input.placementAverageScore * 0.18 +
      reviewProgress * 0.2 +
      input.conversationRoundProgress * 0.14 +
      Math.min(100, input.progress.streakDays * 12) * 0.04,
  );

  const steps: ArabicCoachPlanStep[] = [
    {
      id: "listen",
      title: "Listen first",
      detail: `Warm up with "${input.selectedDialogueTitle}" before reading.`,
      modeLabel: "Listen",
      freePracticeHint: "Play one line below and repeat it twice.",
      actionLabel: "Coach listening",
      prompt: `Coach my Arabic listening for "${input.selectedDialogueTitle}". Give one short line, ask me what I heard first, then show Arabic, transliteration, meaning, and one pronunciation cue.`,
      progress: clampPercent(input.dailyFluencyProgress),
      estimatedMinutes: 2,
      icon: "headphones",
      colorKey: "emerald",
    },
    {
      id: "reply",
      title: "Reply out loud",
      detail: `Conversation round is ${clampPercent(input.conversationRoundProgress)}% ready.`,
      modeLabel: "Speak",
      freePracticeHint: "Answer the next dialogue turn before revealing it.",
      actionLabel: "Role-play",
      prompt: `Run a short Arabic role-play for "${input.selectedDialogueTitle}". Give one turn at a time, wait for my reply, then show the model Arabic, transliteration, meaning, and one correction.`,
      progress: clampPercent(input.conversationRoundProgress),
      estimatedMinutes: 3,
      icon: "message-square",
      colorKey: "blue",
    },
    {
      id: "word",
      title: "Explain one Quranic word",
      detail: `${input.dailyWordArabic} (${input.dailyWordTransliteration}) needs recall before checking.`,
      modeLabel: "Meaning",
      freePracticeHint: "Say the meaning first, then open the Meaning Lens.",
      actionLabel: "Meaning check",
      prompt: `Test my recall for the Quranic Arabic word "${input.dailyWordArabic}" (${input.dailyWordTransliteration}). Ask me to explain it first, then show meaning, transliteration, and one careful language note without giving a ruling.`,
      progress: clampPercent(input.dailyWordMeaningAttempts * 34),
      estimatedMinutes: 2,
      icon: "book-open",
      colorKey: "amber",
    },
    {
      id: "sentence",
      title: "Build one sentence",
      detail:
        input.sentenceBuilderAttempts > 0
          ? `${input.sentenceBuilderAttempts} sentence attempt(s) saved.`
          : "Use one pattern in your own daily-life sentence.",
      modeLabel: "Write",
      freePracticeHint: "Use one pattern to write a sentence from your day.",
      actionLabel: "Build sentence",
      prompt:
        "Give me one Arabic sentence builder drill. Start with a beginner pattern, ask me to make my own sentence, then show Arabic, transliteration, meaning, and one grammar cue.",
      progress: clampPercent(input.sentenceBuilderAttempts * 28),
      estimatedMinutes: 3,
      icon: "edit-3",
      colorKey: "purple",
    },
    {
      id: "review",
      title: "Lock it into review",
      detail:
        input.dueReviewCount > 0
          ? `${input.dueReviewCount} due now, ${input.scheduledReviewCount} scheduled.`
          : `${input.scheduledReviewCount} item(s) scheduled for later.`,
      modeLabel: "Review",
      freePracticeHint: "Mark one item again, good, or easy before leaving.",
      actionLabel: "Review loop",
      prompt:
        "Run my Arabic smart review loop. Include one sound, one dialogue line, one sentence pattern, and one Quranic word. Make me recall before showing each answer.",
      progress: clampPercent(reviewProgress),
      estimatedMinutes: 3,
      icon: "repeat",
      colorKey: "rose",
    },
  ];
  const nextStep = firstIncomplete(steps);
  const totalEstimatedMinutes = steps.reduce(
    (sum, step) => sum + step.estimatedMinutes,
    0,
  );
  const proofReceipt = buildArabicDailyCoachProofReceipt(input, reviewProgress);
  const practiceQueue = buildArabicDailyPracticeQueue({
    steps,
    nextStep,
    dueReviewCount: input.dueReviewCount,
    selectedDialogueTitle: input.selectedDialogueTitle,
    dailyWordArabic: input.dailyWordArabic,
    dailyWordTransliteration: input.dailyWordTransliteration,
  });
  const sessionContract = buildArabicDailySessionContract({
    nextStep,
    readinessProgress,
    dueReviewCount: input.dueReviewCount,
    selectedDialogueTitle: input.selectedDialogueTitle,
    dailyWordArabic: input.dailyWordArabic,
    dailyWordTransliteration: input.dailyWordTransliteration,
    totalEstimatedMinutes,
  });
  const readinessLabel =
    readinessProgress >= 85
      ? "Independent today"
      : readinessProgress >= 58
        ? "Good rhythm"
        : readinessProgress >= 28
          ? "Needs one loop"
          : "Start gently";

  return {
    title: `Today: ${nextStep.title}`,
    subtitle: nextStep.detail,
    readinessLabel,
    readinessProgress,
    totalEstimatedMinutes,
    nextStepId: nextStep.id,
    claimBoundaryLabel:
      "Today's signals personalise practice; a qualified teacher should assess fluency, pronunciation, tajwid, or interpretation skill.",
    prompt: `Build my Arabic plan for today from my saved progress. Keep it to about ${totalEstimatedMinutes} minutes. Prioritize "${nextStep.title}", use "${input.selectedDialogueTitle}", include the Quranic word "${input.dailyWordArabic}" (${input.dailyWordTransliteration}), then finish with tomorrow's review.`,
    sessionContract,
    proofReceipt,
    practiceQueue,
    steps,
  };
}
