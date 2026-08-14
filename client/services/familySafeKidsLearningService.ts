import type {
  AgeGroup,
  KidsBadge,
  KidsProgress,
  KidsSettings,
} from "@/context/KidsModeContext";

export type FamilyKidsLaneId =
  | "reviewed-stories"
  | "quran-manners"
  | "dua-memorization"
  | "family-challenge";

export type FamilyKidsSafetyBoundaryId =
  | "no-open-ai-chat"
  | "review-before-child-view"
  | "no-external-video-feeds"
  | "parent-pin-settings"
  | "healthy-rewards";

export type FamilyKidsLearningLane = {
  id: FamilyKidsLaneId;
  title: string;
  description: string;
  stateLabel: string;
  parentActionLabel: string;
};

export type FamilyKidsSafetyBoundary = {
  id: FamilyKidsSafetyBoundaryId;
  label: string;
  description: string;
};

export type FamilyKidsWeeklyMission = {
  id: "story" | "quran-manners" | "dua" | "family-service";
  title: string;
  cadenceLabel: string;
  parentProofLabel: string;
  childViewLabel: string;
};

export type FamilyKidsReviewReceipt = {
  id: "age-band" | "time-limit" | "parent-pin" | "content-review";
  title: string;
  evidenceLabel: string;
  boundaryLabel: string;
};

export type FamilySafeKidsLearningPlan = {
  title: string;
  subtitle: string;
  ageBandLabel: string;
  dailyLimitLabel: string;
  reviewQueueLabel: string;
  nextParentReviewLabel: string;
  parentApprovalLabel: string;
  childSafeExplanationPolicy: string;
  lanes: FamilyKidsLearningLane[];
  safetyBoundaries: FamilyKidsSafetyBoundary[];
  weeklyMissions: FamilyKidsWeeklyMission[];
  reviewReceipts: FamilyKidsReviewReceipt[];
};

type BuildFamilySafeKidsLearningPlanInput = {
  settings: Pick<
    KidsSettings,
    "ageGroup" | "dailyGoalMinutes" | "childName" | "parentPin"
  >;
  progress: Pick<
    KidsProgress,
    | "storiesRead"
    | "quizzesCompleted"
    | "surahsMemorized"
    | "duasMemorized"
    | "todayMinutes"
  >;
  badges: Pick<KidsBadge, "id">[];
};

function getAgeBandLabel(ageGroup: AgeGroup): string {
  if (ageGroup === "3-5") return "Little Muslim path, ages 3 to 5";
  if (ageGroup === "6-9") return "Young Believer path, ages 6 to 9";
  if (ageGroup === "10-13") return "Growing Muslim path, ages 10 to 13";
  return "Choose an age band before lessons unlock";
}

function getReviewQueueLabel(input: BuildFamilySafeKidsLearningPlanInput) {
  const completedSignals =
    input.progress.storiesRead +
    input.progress.quizzesCompleted +
    input.progress.surahsMemorized +
    input.progress.duasMemorized +
    input.badges.length;

  if (completedSignals >= 8) {
    return "Review queue: ready for the next parent-approved challenge";
  }

  if (completedSignals >= 3) {
    return "Review queue: keep the current lessons approved this week";
  }

  return "Review queue: parent approval needed before new explanations";
}

function getNextParentReviewLabel(input: BuildFamilySafeKidsLearningPlanInput) {
  if (input.settings.parentPin.length !== 4) {
    return "Next parent review: add a 4-digit PIN before expanding lessons";
  }

  if (input.progress.todayMinutes >= input.settings.dailyGoalMinutes) {
    return "Next parent review: approve tomorrow's calm family mission";
  }

  if (input.progress.storiesRead === 0) {
    return "Next parent review: approve the first story card";
  }

  return "Next parent review: check progress and keep lessons age-matched";
}

export function buildFamilySafeKidsLearningPlan(
  input: BuildFamilySafeKidsLearningPlanInput,
): FamilySafeKidsLearningPlan {
  const childName = input.settings.childName.trim() || "your child";
  const minutes = Math.max(0, input.settings.dailyGoalMinutes || 0);
  const parentPinReady = input.settings.parentPin.length === 4;

  return {
    title: "Parent-approved learning",
    subtitle: `A calm Kids Deen plan for ${childName}, built around reviewed lessons, family practice, and clear parent controls.`,
    ageBandLabel: getAgeBandLabel(input.settings.ageGroup),
    dailyLimitLabel:
      minutes > 0
        ? `Daily limit: ${minutes} minutes with gentle progress, not pressure`
        : "Daily limit: set a gentle time goal in Parent Dashboard",
    reviewQueueLabel: getReviewQueueLabel(input),
    nextParentReviewLabel: getNextParentReviewLabel(input),
    parentApprovalLabel: parentPinReady
      ? "Parent PIN protects settings and review decisions"
      : "Add a 4-digit Parent PIN before expanding Kids Mode",
    childSafeExplanationPolicy:
      "Child-safe explanations must be reviewed before child view; NurAI should not publish AI-generated narration or answers directly to Kids Mode.",
    lanes: [
      {
        id: "reviewed-stories",
        title: "Reviewed story cards",
        description:
          "Age-banded Prophet, seerah, and akhlaq stories should use approved NurAI content before a child sees them.",
        stateLabel:
          input.progress.storiesRead > 0
            ? `${input.progress.storiesRead} story card${input.progress.storiesRead === 1 ? "" : "s"} read`
            : "Start with one reviewed story card",
        parentActionLabel: "Approve the next story set",
      },
      {
        id: "quran-manners",
        title: "Quran manners games",
        description:
          "Short games should teach respect for Quran, prayer habits, kindness, and gratitude without pressure loops.",
        stateLabel:
          input.progress.quizzesCompleted > 0
            ? `${input.progress.quizzesCompleted} quiz check${input.progress.quizzesCompleted === 1 ? "" : "s"} completed`
            : "Ready for a gentle manners quiz",
        parentActionLabel: "Review today's mission",
      },
      {
        id: "dua-memorization",
        title: "Dua and surah practice",
        description:
          "Memorization practice stays short, encouraging, and parent visible, with no shame for missed days.",
        stateLabel: `${input.progress.surahsMemorized} surah${input.progress.surahsMemorized === 1 ? "" : "s"} and ${input.progress.duasMemorized} dua${input.progress.duasMemorized === 1 ? "" : "s"} memorized`,
        parentActionLabel: "Choose the next practice item",
      },
      {
        id: "family-challenge",
        title: "Family challenge",
        description:
          "One shared good deed can turn screen time into family worship, service, and conversation.",
        stateLabel:
          input.progress.todayMinutes >= minutes && minutes > 0
            ? "Today's family learning goal complete"
            : "Pick one family good deed today",
        parentActionLabel: "Set a home challenge",
      },
    ],
    weeklyMissions: [
      {
        id: "story",
        title: "One reviewed story",
        cadenceLabel: "2 times this week",
        parentProofLabel:
          input.progress.storiesRead > 0
            ? `${input.progress.storiesRead} story read with parent visibility`
            : "Needs parent-approved story set",
        childViewLabel: "Story cards only after review",
      },
      {
        id: "quran-manners",
        title: "Quran manners moment",
        cadenceLabel: "1 gentle game",
        parentProofLabel:
          input.progress.quizzesCompleted > 0
            ? `${input.progress.quizzesCompleted} manners or quiz check(s) completed`
            : "Ready for a short manners check",
        childViewLabel: "No rulings, no pressure loops",
      },
      {
        id: "dua",
        title: "Dua or surah practice",
        cadenceLabel: "3 tiny reviews",
        parentProofLabel: `${input.progress.surahsMemorized + input.progress.duasMemorized} memorization item(s) recorded`,
        childViewLabel: "Short, encouraging practice",
      },
      {
        id: "family-service",
        title: "Family good deed",
        cadenceLabel: "1 shared action",
        parentProofLabel:
          input.progress.todayMinutes > 0
            ? `${input.progress.todayMinutes} minute(s) of learning today`
            : "Choose one home kindness mission",
        childViewLabel: "Worship is never gamed or shamed",
      },
    ],
    reviewReceipts: [
      {
        id: "age-band",
        title: "Age band",
        evidenceLabel: getAgeBandLabel(input.settings.ageGroup),
        boundaryLabel: "Lessons stay age-matched before harder topics unlock.",
      },
      {
        id: "time-limit",
        title: "Time limit",
        evidenceLabel:
          minutes > 0
            ? `${minutes} minutes selected`
            : "Parent still needs to set a daily limit",
        boundaryLabel: "Progress should encourage routine, not pressure.",
      },
      {
        id: "parent-pin",
        title: "Parent PIN",
        evidenceLabel: parentPinReady
          ? "Parent PIN ready"
          : "Parent PIN needed",
        boundaryLabel: "Settings and review decisions stay with a guardian.",
      },
      {
        id: "content-review",
        title: "Content review",
        evidenceLabel: "Reviewed before child view",
        boundaryLabel:
          "No open AI chat or unreviewed generated answers are shown to kids.",
      },
    ],
    safetyBoundaries: [
      {
        id: "no-open-ai-chat",
        label: "No open AI chat for kids",
        description:
          "Children should not receive unsupervised open-ended AI answers in Kids Mode.",
      },
      {
        id: "review-before-child-view",
        label: "Reviewed before child view",
        description:
          "Stories, explanations, quizzes, and narration need source and child-safety review first.",
      },
      {
        id: "no-external-video-feeds",
        label: "No external video feeds",
        description:
          "Kids Mode should prefer owned or licensed in-app learning over embedded feeds.",
      },
      {
        id: "parent-pin-settings",
        label: "Parent PIN for settings",
        description:
          "Age band, daily limits, data export, and reset controls stay in Parent Dashboard.",
      },
      {
        id: "healthy-rewards",
        label: "Healthy rewards only",
        description:
          "Badges should encourage learning without pressuring worship or shaming missed days.",
      },
    ],
  };
}
