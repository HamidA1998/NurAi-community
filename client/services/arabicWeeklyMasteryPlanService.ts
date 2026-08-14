import type { ArabicCoachPlanColorKey } from "@/services/arabicDailyCoachPlanService";

export type ArabicWeeklyPlanStatus = "complete" | "active" | "upcoming";

export type ArabicWeeklyMasteryDay = {
  id: string;
  dayLabel: string;
  title: string;
  focusLabel: string;
  detail: string;
  evidenceLabel: string;
  status: ArabicWeeklyPlanStatus;
  progress: number;
  estimatedMinutes: number;
  icon:
    | "headphones"
    | "message-square"
    | "book-open"
    | "edit-3"
    | "repeat"
    | "award"
    | "compass";
  colorKey: ArabicCoachPlanColorKey;
  prompt: string;
};

export type ArabicWeeklyMasteryFocusLane = {
  id: "listening" | "dialogue" | "meaning" | "writing" | "review" | "level";
  label: string;
  score: number;
  evidenceLabel: string;
  recommendation: string;
  dayId: ArabicWeeklyMasteryDay["id"];
  icon:
    | "headphones"
    | "message-square"
    | "book-open"
    | "edit-3"
    | "repeat"
    | "compass";
  colorKey: ArabicCoachPlanColorKey;
};

export type ArabicWeeklyMasteryPlan = {
  title: string;
  subtitle: string;
  readinessLabel: string;
  sprintProgress: number;
  totalEstimatedMinutes: number;
  activeDayId: string;
  activeFocus: ArabicWeeklyMasteryFocusLane;
  sessionHandoff: ArabicWeeklySessionHandoff;
  reviewContract: ArabicWeeklyReviewContract;
  levelGovernance: ArabicLevelGovernanceContract;
  proofBoundary: ArabicWeeklyProofBoundary;
  teacherReviewPacket: ArabicTeacherReviewPacket;
  evidenceReceipts: ArabicWeeklyEvidenceReceipt[];
  focusLanes: ArabicWeeklyMasteryFocusLane[];
  days: ArabicWeeklyMasteryDay[];
};

export type ArabicLevelGovernanceDecision =
  | "advance_ready"
  | "hold_for_review"
  | "build_foundations";

export type ArabicLevelGovernanceItem = {
  id: "current-level" | "next-level" | "evidence-gap" | "teacher-boundary";
  label: string;
  detail: string;
  statusLabel: string;
  icon: "compass" | "award" | "target" | "shield";
  colorKey: ArabicCoachPlanColorKey;
};

export type ArabicLevelGovernanceContract = {
  title: string;
  decision: ArabicLevelGovernanceDecision;
  statusLabel: string;
  nextActionLabel: string;
  prompt: string;
  claimBoundary: string;
  items: ArabicLevelGovernanceItem[];
};

export type ArabicWeeklyProofBoundary = {
  title: string;
  statusLabel: string;
  practiceClaimLabel: string;
  nextProofActionLabel: string;
  publicClaimGuardrail: string;
};

export type ArabicWeeklySessionHandoff = {
  title: string;
  statusLabel: string;
  activeDayLabel: string;
  nextActionLabel: string;
  proofToCaptureLabel: string;
  estimatedMinutesLabel: string;
  coachPrompt: string;
  claimBoundary: string;
  checklist: string[];
};

export type ArabicWeeklyReviewContractItem = {
  id:
    | "accepted-listening"
    | "accepted-recall"
    | "rejected-fluency"
    | "rejected-tajwid"
    | "next-review"
    | "next-teacher";
  label: string;
  detail: string;
  statusLabel: string;
  icon:
    | "check-circle"
    | "headphones"
    | "book-open"
    | "x-circle"
    | "repeat"
    | "user-check";
  colorKey: ArabicCoachPlanColorKey;
  prompt?: string;
};

export type ArabicWeeklyReviewContract = {
  title: string;
  statusLabel: string;
  acceptedEvidence: ArabicWeeklyReviewContractItem[];
  rejectedClaims: ArabicWeeklyReviewContractItem[];
  nextVerificationSteps: ArabicWeeklyReviewContractItem[];
  boundaryLabel: string;
};

export type ArabicTeacherReviewCheckpoint = {
  id: "listening" | "dialogue" | "meaning" | "writing" | "review";
  label: string;
  detail: string;
  complete: boolean;
  icon: "headphones" | "message-square" | "book-open" | "edit-3" | "repeat";
};

export type ArabicTeacherReviewPacket = {
  title: string;
  statusLabel: string;
  readinessScore: number;
  reviewerPrompt: string;
  learnerClaimBoundary: string;
  nextTeacherActionLabel: string;
  checklist: ArabicTeacherReviewCheckpoint[];
};

export type ArabicTeacherReviewPacketShareContext = {
  selectedDialogueTitle: string;
  currentArabicLevelTitle: string;
  nextArabicLevelTitle: string;
  activeFocusLabel: string;
};

export type ArabicWeeklyEvidenceReceipt = {
  id: "today-proof" | "weakest-skill" | "teacher-readiness" | "claim-boundary";
  title: string;
  evidenceLabel: string;
  saveLabel: string;
  boundaryLabel: string;
  actionLabel: string;
  prompt: string;
  icon: "clipboard" | "target" | "user-check" | "shield";
  colorKey: ArabicCoachPlanColorKey;
};

type ArabicWeeklyMasteryPlanInput = {
  selectedDialogueTitle: string;
  dailyWordArabic: string;
  dailyWordTransliteration: string;
  currentArabicLevelTitle: string;
  nextArabicLevelTitle: string;
  dailyFluencyProgress: number;
  conversationRoundProgress: number;
  placementAverageScore: number;
  portfolioAverage: number;
  completedReviewCount: number;
  totalReviewTasks: number;
  dueReviewCount: number;
  scheduledReviewCount: number;
  sentenceBuilderAttempts: number;
  wordMeaningAttempts: number;
  streakDays: number;
  date?: Date;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function planDayIndex(date = new Date()) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function withStatus(
  days: Omit<ArabicWeeklyMasteryDay, "status">[],
  activeIndex: number,
): ArabicWeeklyMasteryDay[] {
  const firstIncompleteIndex = days.findIndex((day) => day.progress < 70);
  const activeDayIndex =
    firstIncompleteIndex >= 0 ? firstIncompleteIndex : activeIndex;
  return days.map((day, index) => ({
    ...day,
    status:
      day.progress >= 85
        ? "complete"
        : index === activeDayIndex
          ? "active"
          : "upcoming",
  }));
}

function buildFocusLanes(
  input: ArabicWeeklyMasteryPlanInput,
): ArabicWeeklyMasteryFocusLane[] {
  const reviewProgress =
    input.totalReviewTasks > 0
      ? (input.completedReviewCount / input.totalReviewTasks) * 100
      : 0;
  const lanes: ArabicWeeklyMasteryFocusLane[] = [
    {
      id: "listening",
      label: "Listening",
      score: clampPercent(input.dailyFluencyProgress),
      evidenceLabel: `${input.dailyFluencyProgress}% daily fluency`,
      recommendation: `Listen again to "${input.selectedDialogueTitle}" before reading.`,
      dayId: "listen",
      icon: "headphones",
      colorKey: "emerald",
    },
    {
      id: "dialogue",
      label: "Dialogue",
      score: clampPercent(input.conversationRoundProgress),
      evidenceLabel: `${input.conversationRoundProgress}% round readiness`,
      recommendation: "Reply before reveal, then compare one correction.",
      dayId: "reply",
      icon: "message-square",
      colorKey: "blue",
    },
    {
      id: "meaning",
      label: "Quran word",
      score: clampPercent(input.wordMeaningAttempts * 34),
      evidenceLabel: `${input.wordMeaningAttempts} recall attempt(s)`,
      recommendation: `Explain ${input.dailyWordTransliteration} before checking.`,
      dayId: "quran-word",
      icon: "book-open",
      colorKey: "amber",
    },
    {
      id: "writing",
      label: "Writing",
      score: clampPercent(input.sentenceBuilderAttempts * 28),
      evidenceLabel: `${input.sentenceBuilderAttempts} sentence attempt(s)`,
      recommendation: "Produce one useful sentence from your own day.",
      dayId: "sentence",
      icon: "edit-3",
      colorKey: "purple",
    },
    {
      id: "review",
      label: "Review",
      score: clampPercent(reviewProgress),
      evidenceLabel: `${input.dueReviewCount} due, ${input.scheduledReviewCount} scheduled`,
      recommendation:
        input.dueReviewCount > 0
          ? "Clear due review before adding new Arabic."
          : "Schedule one item for tomorrow.",
      dayId: "review",
      icon: "repeat",
      colorKey: "rose",
    },
    {
      id: "level",
      label: "Level check",
      score: clampPercent(input.placementAverageScore),
      evidenceLabel: `${input.placementAverageScore}% placement confidence`,
      recommendation: `Check readiness from ${input.currentArabicLevelTitle} toward ${input.nextArabicLevelTitle}.`,
      dayId: "level-check",
      icon: "compass",
      colorKey: "blue",
    },
  ];
  return lanes.sort((a, b) => a.score - b.score).slice(0, 3);
}

function buildArabicWeeklyProofBoundary(
  input: ArabicWeeklyMasteryPlanInput,
  activeFocus: ArabicWeeklyMasteryFocusLane,
): ArabicWeeklyProofBoundary {
  return {
    title: "What your progress means",
    statusLabel:
      input.portfolioAverage >= 85
        ? "Strong practice history"
        : input.portfolioAverage >= 58
          ? "Practice history building"
          : "Keep practising",
    practiceClaimLabel: `${input.portfolioAverage}% practice readiness across listening, dialogue, writing, Quran words, and review.`,
    nextProofActionLabel: `Next focus: ${activeFocus.label} (${activeFocus.score}%)`,
    publicClaimGuardrail:
      "NurAI uses this to choose practice. Ask a teacher to assess overall fluency, pronunciation, or tajwid.",
  };
}

function buildArabicWeeklySessionHandoff(
  activeDay: ArabicWeeklyMasteryDay,
  activeFocus: ArabicWeeklyMasteryFocusLane,
  input: ArabicWeeklyMasteryPlanInput,
): ArabicWeeklySessionHandoff {
  const hasDueReview = input.dueReviewCount > 0;
  const nextActionLabel = hasDueReview
    ? "Clear due review first, then complete the active weekly drill."
    : `Start with ${activeDay.title.toLowerCase()} and save one practice note.`;
  const proofToCaptureLabel =
    activeFocus.id === "level"
      ? "Save a placement note after listening, reply, meaning, and sentence checks."
      : activeFocus.id === "review"
        ? "Mark again, hard, good, or easy before revealing answers."
        : `Save one ${activeFocus.label.toLowerCase()} note from the drill.`;

  return {
    title: "Weekly session",
    statusLabel: hasDueReview
      ? "Review before new Arabic"
      : `${activeDay.dayLabel}: ${activeDay.focusLabel}`,
    activeDayLabel: `${activeDay.dayLabel} - ${activeDay.title}`,
    nextActionLabel,
    proofToCaptureLabel,
    estimatedMinutesLabel: `${activeDay.estimatedMinutes} min now, ${input.streakDays} day streak context`,
    coachPrompt: `${activeDay.prompt} Keep the session to ${activeDay.estimatedMinutes} minutes, start with recall before reveal, and end by asking what I practised.`,
    claimBoundary:
      "This is a practice plan. A qualified teacher should assess fluency, pronunciation, tajwid, or interpretation skill.",
    checklist: [
      "Start with recall before reveal.",
      `Complete: ${activeDay.title}.`,
      proofToCaptureLabel,
      "Schedule or clear one review item before leaving.",
    ],
  };
}

function buildArabicWeeklyReviewContract(
  input: ArabicWeeklyMasteryPlanInput,
  activeDay: ArabicWeeklyMasteryDay,
  activeFocus: ArabicWeeklyMasteryFocusLane,
  proofBoundary: ArabicWeeklyProofBoundary,
  teacherReviewPacket: ArabicTeacherReviewPacket,
): ArabicWeeklyReviewContract {
  const listeningCaptured = input.dailyFluencyProgress >= 70;
  const recallCaptured =
    input.wordMeaningAttempts > 0 || input.completedReviewCount > 0;
  return {
    title: "Weekly mastery check",
    statusLabel:
      listeningCaptured && recallCaptured
        ? "Ready to review"
        : "Complete a little more practice",
    acceptedEvidence: [
      {
        id: "accepted-listening",
        label: "Listening sample",
        detail: listeningCaptured
          ? `${input.dailyFluencyProgress}% listening practice from ${input.selectedDialogueTitle}`
          : `Listen to ${input.selectedDialogueTitle} before reading, then save one line you heard.`,
        statusLabel: listeningCaptured ? "Complete" : "Try next",
        icon: "headphones",
        colorKey: "emerald",
        prompt: `Run a listening check for "${input.selectedDialogueTitle}". Make me listen first, then ask what I heard before showing the Arabic and meaning.`,
      },
      {
        id: "accepted-recall",
        label: "Recall before reveal",
        detail: recallCaptured
          ? `${input.wordMeaningAttempts} Quran-word attempt(s), ${input.completedReviewCount}/${input.totalReviewTasks} review task(s)`
          : `Recall ${input.dailyWordTransliteration} and one review item before checking answers.`,
        statusLabel: recallCaptured ? "Complete" : "Try next",
        icon: "book-open",
        colorKey: "amber",
        prompt: `Test my recall before reveal for ${input.dailyWordArabic} (${input.dailyWordTransliteration}) and one due review item. Keep it language coaching only.`,
      },
    ],
    rejectedClaims: [
      {
        id: "rejected-fluency",
        label: "Fluency assessment",
        detail: proofBoundary.publicClaimGuardrail,
        statusLabel: "Ask a teacher",
        icon: "x-circle",
        colorKey: "rose",
      },
      {
        id: "rejected-tajwid",
        label: "Tajwid or tafsir assessment",
        detail:
          "A qualified teacher should assess tajwid, Quran interpretation, and pronunciation.",
        statusLabel: "Ask a teacher",
        icon: "x-circle",
        colorKey: "rose",
      },
    ],
    nextVerificationSteps: [
      {
        id: "next-review",
        label: activeDay.title,
        detail: `Next drill: ${activeFocus.label}. ${activeFocus.recommendation}`,
        statusLabel: proofBoundary.nextProofActionLabel,
        icon: "repeat",
        colorKey: activeFocus.colorKey,
        prompt: `${activeDay.prompt} End with a short practice note and one clear next step.`,
      },
      {
        id: "next-teacher",
        label: "Teacher summary",
        detail: teacherReviewPacket.nextTeacherActionLabel,
        statusLabel: teacherReviewPacket.statusLabel,
        icon: "user-check",
        colorKey: "blue",
        prompt: teacherReviewPacket.reviewerPrompt,
      },
    ],
    boundaryLabel:
      "NurAI can guide the next drill. Ask a qualified teacher for formal assessment.",
  };
}

function buildArabicTeacherReviewPacket(
  input: ArabicWeeklyMasteryPlanInput,
  activeFocus: ArabicWeeklyMasteryFocusLane,
): ArabicTeacherReviewPacket {
  const reviewProgress =
    input.totalReviewTasks > 0
      ? (input.completedReviewCount / input.totalReviewTasks) * 100
      : 0;
  const meaningProgress = clampPercent(input.wordMeaningAttempts * 34);
  const writingProgress = clampPercent(input.sentenceBuilderAttempts * 28);
  const readinessScore = clampPercent(
    input.dailyFluencyProgress * 0.22 +
      input.conversationRoundProgress * 0.22 +
      meaningProgress * 0.16 +
      writingProgress * 0.14 +
      reviewProgress * 0.16 +
      input.placementAverageScore * 0.1,
  );
  const hasReviewDebt = input.dueReviewCount > 0;
  const statusLabel =
    readinessScore >= 82 && !hasReviewDebt
      ? "Ready to share with a teacher"
      : hasReviewDebt
        ? "Clear review before sharing"
        : "Keep practising first";
  const nextTeacherActionLabel = hasReviewDebt
    ? "Clear due review first"
    : readinessScore >= 82
      ? "Prepare teacher summary"
      : `Improve ${activeFocus.label}`;

  return {
    title: "Share with a teacher",
    statusLabel,
    readinessScore,
    reviewerPrompt: `Prepare a concise Arabic practice summary for my teacher using "${input.selectedDialogueTitle}", my dialogue replies, one Quranic word recall, one written sentence, placement self-ratings, and my weakest skill: ${activeFocus.label}.`,
    learnerClaimBoundary:
      "This summary helps a human teacher understand your practice; NurAI does not certify pronunciation, tajwid, fluency, or Quran interpretation.",
    nextTeacherActionLabel,
    checklist: [
      {
        id: "listening",
        label: "Listening sample",
        detail: `${input.dailyFluencyProgress}% daily fluency practice`,
        complete: input.dailyFluencyProgress >= 70,
        icon: "headphones",
      },
      {
        id: "dialogue",
        label: "Dialogue reply",
        detail: `${input.conversationRoundProgress}% round readiness`,
        complete: input.conversationRoundProgress >= 70,
        icon: "message-square",
      },
      {
        id: "meaning",
        label: "Quran word recall",
        detail: `${input.wordMeaningAttempts} recall attempt(s)`,
        complete: input.wordMeaningAttempts > 0,
        icon: "book-open",
      },
      {
        id: "writing",
        label: "Written sentence",
        detail: `${input.sentenceBuilderAttempts} sentence attempt(s)`,
        complete: input.sentenceBuilderAttempts > 0,
        icon: "edit-3",
      },
      {
        id: "review",
        label: "Review queue",
        detail: `${input.completedReviewCount}/${input.totalReviewTasks} today, ${input.dueReviewCount} due`,
        complete: input.dueReviewCount === 0 && input.completedReviewCount > 0,
        icon: "repeat",
      },
    ],
  };
}

function buildArabicWeeklyEvidenceReceipts(
  input: ArabicWeeklyMasteryPlanInput,
  activeDay: ArabicWeeklyMasteryDay,
  activeFocus: ArabicWeeklyMasteryFocusLane,
  proofBoundary: ArabicWeeklyProofBoundary,
  teacherReviewPacket: ArabicTeacherReviewPacket,
): ArabicWeeklyEvidenceReceipt[] {
  return [
    {
      id: "today-proof",
      title: "Today's practice",
      evidenceLabel: `${activeDay.dayLabel}: ${activeDay.evidenceLabel}`,
      saveLabel: "Save one practice note before leaving the session.",
      boundaryLabel:
        "This helps NurAI personalise practice; it is not a formal language assessment.",
      actionLabel: "Review practice",
      prompt: `${activeDay.prompt} End by telling me the short practice note I should save from this session.`,
      icon: "clipboard",
      colorKey: activeDay.colorKey,
    },
    {
      id: "weakest-skill",
      title: "Weakest skill",
      evidenceLabel: `${activeFocus.label}: ${activeFocus.score}% readiness`,
      saveLabel: activeFocus.recommendation,
      boundaryLabel:
        "Weakest-skill work should be recall-first before adding new material.",
      actionLabel: "Drill weakness",
      prompt: `Coach my weakest Arabic skill, ${activeFocus.label}. Start with recall before reveal, use my saved progress, and finish with one practice note.`,
      icon: "target",
      colorKey: activeFocus.colorKey,
    },
    {
      id: "teacher-readiness",
      title: "Teacher readiness",
      evidenceLabel: `${teacherReviewPacket.readinessScore}% ready to share`,
      saveLabel: teacherReviewPacket.nextTeacherActionLabel,
      boundaryLabel:
        "A human teacher can use this summary to guide a real assessment.",
      actionLabel: "Prepare summary",
      prompt: teacherReviewPacket.reviewerPrompt,
      icon: "user-check",
      colorKey: "blue",
    },
    {
      id: "claim-boundary",
      title: "Progress scope",
      evidenceLabel: proofBoundary.practiceClaimLabel,
      saveLabel: proofBoundary.nextProofActionLabel,
      boundaryLabel: proofBoundary.publicClaimGuardrail,
      actionLabel: "Explain progress",
      prompt: `Help me explain my Arabic progress honestly using ${proofBoundary.practiceClaimLabel}. Remind me when a teacher's assessment is needed.`,
      icon: "shield",
      colorKey: "amber",
    },
  ];
}

function buildArabicLevelGovernanceContract(
  input: ArabicWeeklyMasteryPlanInput,
  activeFocus: ArabicWeeklyMasteryFocusLane,
): ArabicLevelGovernanceContract {
  const hasDueReview = input.dueReviewCount > 0;
  const strongPortfolio = input.portfolioAverage >= 70;
  const strongPlacement = input.placementAverageScore >= 70;
  const enoughReview =
    input.totalReviewTasks > 0 &&
    input.completedReviewCount >= Math.min(input.totalReviewTasks, 4);
  const decision: ArabicLevelGovernanceDecision =
    hasDueReview || !enoughReview
      ? "hold_for_review"
      : strongPortfolio && strongPlacement
        ? "advance_ready"
        : "build_foundations";

  const statusLabel =
    decision === "advance_ready"
      ? "Ready for a careful next-level check"
      : decision === "hold_for_review"
        ? "Hold level until review is cleared"
        : "Build foundations before moving up";
  const nextActionLabel =
    decision === "advance_ready"
      ? "Run level check"
      : decision === "hold_for_review"
        ? "Clear review first"
        : `Strengthen ${activeFocus.label}`;

  return {
    title: "Arabic level progress",
    decision,
    statusLabel,
    nextActionLabel,
    prompt: `Help me choose whether to continue from ${input.currentArabicLevelTitle} toward ${input.nextArabicLevelTitle}. Consider my practice progress, due review, and weakest skill ${activeFocus.label}. Give one next drill and remind me when a teacher's assessment is needed.`,
    claimBoundary:
      "Levels personalise practice. A qualified teacher should assess fluency, pronunciation, tajwid, or Quran interpretation.",
    items: [
      {
        id: "current-level",
        label: "Current level",
        detail: input.currentArabicLevelTitle,
        statusLabel: `${input.portfolioAverage}% practice`,
        icon: "compass",
        colorKey: "blue",
      },
      {
        id: "next-level",
        label: "Next level",
        detail: input.nextArabicLevelTitle,
        statusLabel:
          decision === "advance_ready" ? "Check ready" : "More practice",
        icon: "award",
        colorKey: "emerald",
      },
      {
        id: "evidence-gap",
        label: "Practice gap",
        detail: hasDueReview
          ? `${input.dueReviewCount} due review item(s) must be cleared first.`
          : `${activeFocus.label} is the weakest skill to strengthen next.`,
        statusLabel: activeFocus.evidenceLabel,
        icon: "target",
        colorKey: activeFocus.colorKey,
      },
      {
        id: "teacher-boundary",
        label: "Teacher check",
        detail:
          "Ask a qualified teacher for formal assessment of fluency, tajwid, pronunciation, or interpretation skill.",
        statusLabel: "Practice guidance",
        icon: "shield",
        colorKey: "amber",
      },
    ],
  };
}

export function buildArabicWeeklyMasteryPlan(
  input: ArabicWeeklyMasteryPlanInput,
): ArabicWeeklyMasteryPlan {
  const reviewProgress =
    input.totalReviewTasks > 0
      ? (input.completedReviewCount / input.totalReviewTasks) * 100
      : 0;
  const activeIndex = planDayIndex(input.date);

  const days = withStatus(
    [
      {
        id: "listen",
        dayLabel: "Day 1",
        title: "Tune your ear",
        focusLabel: "Listening",
        detail: `Hear "${input.selectedDialogueTitle}", type one line, then repeat.`,
        evidenceLabel: `${input.dailyFluencyProgress}% daily fluency`,
        progress: clampPercent(input.dailyFluencyProgress),
        estimatedMinutes: 8,
        icon: "headphones",
        colorKey: "emerald",
        prompt: `Build day 1 of my Arabic weekly plan. Focus on listening to "${input.selectedDialogueTitle}", one listen-and-type line, Arabic, transliteration, meaning, and one sound cue.`,
      },
      {
        id: "reply",
        dayLabel: "Day 2",
        title: "Answer in context",
        focusLabel: "Dialogue",
        detail: "Reply before revealing, then compare against the model line.",
        evidenceLabel: `${input.conversationRoundProgress}% round readiness`,
        progress: clampPercent(input.conversationRoundProgress),
        estimatedMinutes: 10,
        icon: "message-square",
        colorKey: "blue",
        prompt: `Build day 2 of my Arabic weekly plan. Make me answer turns from "${input.selectedDialogueTitle}" before revealing the model reply, with Arabic, transliteration, meaning, and one correction.`,
      },
      {
        id: "quran-word",
        dayLabel: "Day 3",
        title: "Explain one Quranic word",
        focusLabel: "Meaning",
        detail: `Recall ${input.dailyWordTransliteration} before checking.`,
        evidenceLabel: `${input.wordMeaningAttempts} recall attempt(s)`,
        progress: clampPercent(input.wordMeaningAttempts * 34),
        estimatedMinutes: 7,
        icon: "book-open",
        colorKey: "amber",
        prompt: `Build day 3 of my Arabic weekly plan. Test my recall for "${input.dailyWordArabic}" (${input.dailyWordTransliteration}), then show meaning, transliteration, and one careful language note without giving a ruling.`,
      },
      {
        id: "sentence",
        dayLabel: "Day 4",
        title: "Produce your own line",
        focusLabel: "Writing",
        detail: "Turn one pattern into a sentence you would actually use.",
        evidenceLabel: `${input.sentenceBuilderAttempts} sentence attempt(s)`,
        progress: clampPercent(input.sentenceBuilderAttempts * 28),
        estimatedMinutes: 9,
        icon: "edit-3",
        colorKey: "purple",
        prompt:
          "Build day 4 of my Arabic weekly plan. Give one beginner pattern, make me write my own sentence first, then show Arabic, transliteration, meaning, and one grammar cue.",
      },
      {
        id: "review",
        dayLabel: "Day 5",
        title: "Bring it back",
        focusLabel: "Review",
        detail:
          input.dueReviewCount > 0
            ? "Clear due items before adding anything new."
            : "Schedule what should return tomorrow.",
        evidenceLabel: `${input.dueReviewCount} due, ${input.scheduledReviewCount} scheduled`,
        progress: clampPercent(reviewProgress),
        estimatedMinutes: 8,
        icon: "repeat",
        colorKey: "rose",
        prompt:
          "Build day 5 of my Arabic weekly plan. Run recall-first spaced review with one sound, one dialogue line, one sentence pattern, and one Quranic word.",
      },
      {
        id: "level-check",
        dayLabel: "Day 6",
        title: "Check your level",
        focusLabel: "Assessment",
        detail: `Move from ${input.currentArabicLevelTitle} toward ${input.nextArabicLevelTitle}.`,
        evidenceLabel: `${input.placementAverageScore}% placement confidence`,
        progress: clampPercent(input.placementAverageScore),
        estimatedMinutes: 10,
        icon: "compass",
        colorKey: "blue",
        prompt: `Build day 6 of my Arabic weekly plan. Run a practical level check from ${input.currentArabicLevelTitle} toward ${input.nextArabicLevelTitle}, covering listening, reply, meaning, and sentence building.`,
      },
      {
        id: "portfolio",
        dayLabel: "Day 7",
        title: "Review your week",
        focusLabel: "Portfolio",
        detail: "Review the progress you can share with a teacher.",
        evidenceLabel: `${input.portfolioAverage}% portfolio readiness`,
        progress: clampPercent(
          input.portfolioAverage * 0.78 + Math.min(22, input.streakDays * 3),
        ),
        estimatedMinutes: 8,
        icon: "award",
        colorKey: "emerald",
        prompt:
          "Build day 7 of my Arabic weekly plan. Summarize my practice progress, identify the weakest skill, and give one next-week Arabic drill.",
      },
    ],
    activeIndex,
  );

  const sprintProgress = clampPercent(
    days.reduce((sum, day) => sum + day.progress, 0) / days.length,
  );
  const totalEstimatedMinutes = days.reduce(
    (sum, day) => sum + day.estimatedMinutes,
    0,
  );
  const activeDay = days.find((day) => day.status === "active") ?? days[0];
  const focusLanes = buildFocusLanes(input);
  const activeFocus =
    focusLanes.find((lane) => lane.dayId === activeDay.id) ?? focusLanes[0];
  const proofBoundary = buildArabicWeeklyProofBoundary(input, activeFocus);
  const sessionHandoff = buildArabicWeeklySessionHandoff(
    activeDay,
    activeFocus,
    input,
  );
  const teacherReviewPacket = buildArabicTeacherReviewPacket(
    input,
    activeFocus,
  );
  const reviewContract = buildArabicWeeklyReviewContract(
    input,
    activeDay,
    activeFocus,
    proofBoundary,
    teacherReviewPacket,
  );
  const levelGovernance = buildArabicLevelGovernanceContract(
    input,
    activeFocus,
  );
  const evidenceReceipts = buildArabicWeeklyEvidenceReceipts(
    input,
    activeDay,
    activeFocus,
    proofBoundary,
    teacherReviewPacket,
  );
  const readinessLabel =
    sprintProgress >= 85
      ? "Ready to advance"
      : sprintProgress >= 58
        ? "Strong week"
        : sprintProgress >= 28
          ? "Build the loop"
          : "Start this week";

  return {
    title: `This week: ${activeDay.title}`,
    subtitle: `${activeDay.focusLabel}: ${activeDay.detail}`,
    readinessLabel,
    sprintProgress,
    totalEstimatedMinutes,
    activeDayId: activeDay.id,
    activeFocus,
    sessionHandoff,
    reviewContract,
    levelGovernance,
    proofBoundary,
    teacherReviewPacket,
    evidenceReceipts,
    focusLanes,
    days,
  };
}

export function buildArabicTeacherReviewPacketShareText(
  packet: ArabicTeacherReviewPacket,
  context: ArabicTeacherReviewPacketShareContext,
): string {
  const completedCount = packet.checklist.filter(
    (item) => item.complete,
  ).length;
  const checklist = packet.checklist
    .map(
      (item) => `[${item.complete ? "x" : " "}] ${item.label}: ${item.detail}`,
    )
    .join("\n");

  return [
    "Arabic Practice Summary",
    `Status: ${packet.statusLabel}`,
    `Practice readiness: ${packet.readinessScore}% (${completedCount}/${packet.checklist.length} checkpoints complete)`,
    `Dialogue focus: ${context.selectedDialogueTitle}`,
    `Level route: ${context.currentArabicLevelTitle} -> ${context.nextArabicLevelTitle}`,
    `Weakest focus: ${context.activeFocusLabel}`,
    "",
    "Checklist",
    checklist,
    "",
    `Next teacher action: ${packet.nextTeacherActionLabel}`,
    "",
    "Suggested teacher prompt",
    packet.reviewerPrompt,
    "",
    `Boundary: ${packet.learnerClaimBoundary}`,
    "This is a practice summary for a human Arabic teacher, not a certificate or formal assessment.",
  ].join("\n");
}
