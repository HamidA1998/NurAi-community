import type { HomeAIContext } from "@/services/homeAIContextService";
import type { HomeAIFeedbackState } from "@/services/homeAIFeedbackService";
import type { PersonalAIContext } from "@/services/personalAIContextService";
import {
  buildPersonalAIFeatureAdapter,
  type PersonalAIFeatureAdapter,
} from "@/services/personalAIFeatureAdapters";

export type HomeTasbeehSnapshot = {
  count: number;
  target: number;
  dhikrLabel: string;
  todayTotal: number;
};

export type HomeWomensHealthSnapshot = {
  enabled: boolean;
  cyclePhaseLabel?: string;
  regularityLabel?: string;
  careSignalLabel?: string;
};

export type HomePersonalisationSession = {
  displayName?: string;
  activityState: "new_session" | "active_rhythm" | "returned_after_gap";
  daysSincePreviousOpen?: number;
};

function buildHomeLearningContext({
  feedback,
  recommendation,
  now,
}: {
  feedback?: HomeAIFeedbackState | null;
  recommendation?: {
    title: string;
    category: string;
    reason: string;
  };
  now: Date;
}) {
  const records = Object.values(feedback?.records || {})
    .filter((record) => record && typeof record.lastFeedbackAt === "string")
    .sort((a, b) => Date.parse(b.lastFeedbackAt) - Date.parse(a.lastFeedbackAt))
    .slice(0, 4)
    .map((record) => ({
      category: record.category,
      lastFeedback: record.lastFeedback,
      ageDays: Math.max(
        0,
        Math.floor(
          (now.getTime() - Date.parse(record.lastFeedbackAt)) / 86400000,
        ),
      ),
    }));
  const recentlyShown = (feedback?.impressions || [])
    .slice(0, 4)
    .map((impression) => ({
      category: impression.category,
      ageHours: Math.max(
        0,
        Math.floor((now.getTime() - Date.parse(impression.shownAt)) / 3600000),
      ),
    }));
  const categoryWeights = feedback?.categoryWeights || {};
  const encouragedCategories = Object.entries(categoryWeights)
    .filter(([, weight]) => Number(weight) >= 4)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 3)
    .map(([category]) => category);
  const quieterCategories = Object.entries(categoryWeights)
    .filter(([, weight]) => Number(weight) <= -4)
    .sort(([, a], [, b]) => Number(a) - Number(b))
    .slice(0, 3)
    .map(([category]) => category);

  return {
    currentRecommendation: recommendation || null,
    recentFeedback: records,
    recentlyShown,
    categoryPreferences: {
      encouraged: encouragedCategories,
      quieter: quieterCategories,
    },
    feedbackCount: records.length,
  };
}

function buildHomeActivityLines(summary: string) {
  const lines = summary
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return Array.from(new Set([...lines.slice(0, 12), ...lines.slice(-5)])).slice(
    0,
    16,
  );
}

export function buildPersonalAIHomeSurfaceBundle(input: {
  context: HomeAIContext;
  tasbeeh?: HomeTasbeehSnapshot;
  womensHealth?: HomeWomensHealthSnapshot;
  isRevert?: boolean;
  daysSinceShahada?: number;
  session?: HomePersonalisationSession;
  recommendation?: {
    id?: string;
    title: string;
    category: string;
    reason: string;
  };
  feedback?: HomeAIFeedbackState | null;
  personalAIContext?: PersonalAIContext | null;
}): Record<string, unknown> {
  const {
    context,
    tasbeeh,
    womensHealth,
    isRevert,
    daysSinceShahada,
    session,
    recommendation,
    feedback,
    personalAIContext,
  } = input;
  const nextPrayer = context.nextPrayerName;
  const adapters: PersonalAIFeatureAdapter[] = [];

  adapters.push(
    buildPersonalAIFeatureAdapter("prayer", {
      nextPrayerLabel: nextPrayer,
      prayerWindowLabel:
        context.minutesToNextPrayer != null
          ? `${context.minutesToNextPrayer} minutes to ${nextPrayer}`
          : undefined,
    }),
  );

  if (context.quran?.surahName || (context.quran?.totalVersesRead || 0) > 0) {
    adapters.push(
      buildPersonalAIFeatureAdapter("quran", {
        surahName: context.quran?.surahName,
        ayahNumber: context.quran?.verse,
        progressLabel:
          context.quran?.totalVersesRead != null
            ? `${context.quran.totalVersesRead} ayahs read`
            : undefined,
      }),
    );
  }

  if (context.extras.arabic.dueCount > 0) {
    adapters.push(
      buildPersonalAIFeatureAdapter("arabic", {
        dueLabel: context.extras.arabic.retentionLabel,
        progressLabel: context.extras.arabic.retentionBody,
      }),
    );
  }

  if (context.extras.travel.enabled) {
    adapters.push(
      buildPersonalAIFeatureAdapter("travel", {
        destinationLabel: context.extras.travel.destination,
        readinessPercent: context.extras.travel.completionPercent,
        detectionTitle: context.extras.travel.detectionTitle,
      }),
    );
  }

  if (context.weather) {
    adapters.push(
      buildPersonalAIFeatureAdapter("weather", {
        conditionLabel: context.weather.conditionLabel,
        windKmh: context.weather.windKmh,
        rainProbability: context.weather.nextThreeHourPrecipitationProbability,
        nextPrayerLabel: nextPrayer,
      }),
    );
  }

  if (tasbeeh && (tasbeeh.todayTotal > 0 || tasbeeh.target > 0)) {
    adapters.push(
      buildPersonalAIFeatureAdapter("tasbeeh", {
        dhikrLabel: tasbeeh.dhikrLabel,
        countToday: tasbeeh.todayTotal,
        targetCount: tasbeeh.target,
        nextPrayerLabel: nextPrayer,
      }),
    );
  }

  const health = context.extras.health;
  if (health?.available) {
    adapters.push(
      buildPersonalAIFeatureAdapter("health", {
        stepsLabel: health.metrics?.stepsLabel,
        sleepLabel: health.metrics?.sleepLabel,
        recoveryLabel: health.metrics?.recoveryLabel,
        userGoalLabel: health.suggestion?.title,
      }),
    );
  }

  if (womensHealth?.enabled) {
    adapters.push(
      buildPersonalAIFeatureAdapter("womens_health", {
        cyclePhaseLabel: womensHealth.cyclePhaseLabel,
        regularityLabel: womensHealth.regularityLabel,
        careSignalLabel: womensHealth.careSignalLabel,
      }),
    );
  }

  const savedAnswers = context.extras.savedAnswers;
  if (
    savedAnswers.needsSourceReview > 0 ||
    savedAnswers.scholarReviewRecommended > 0
  ) {
    adapters.push(
      buildPersonalAIFeatureAdapter("library", {
        bookTitle: context.extras.latestSavedAnswerTitle,
        sourceStatusLabel: `${savedAnswers.needsSourceReview} need source review; ${savedAnswers.scholarReviewRecommended} recommend scholar review`,
      }),
    );
  }

  if (context.userMode === "new_muslim" || isRevert) {
    adapters.push(
      buildPersonalAIFeatureAdapter("revert_support", {
        daysSinceShahada,
        userGoalLabel: context.personalPlan?.familyLabel,
        emotionLabel: "New Muslim journey",
      }),
    );
  }

  if (
    context.activeGoalCategories.includes("reflection") ||
    context.primaryJourneyAction?.category === "reflection" ||
    (tasbeeh && tasbeeh.todayTotal === 0)
  ) {
    adapters.push(
      buildPersonalAIFeatureAdapter("duas", {
        situationLabel:
          context.primaryJourneyAction?.title || "Daily dua moment",
        userGoalLabel: context.primaryJourneyAction?.reason,
      }),
    );
  }

  if (
    context.activeGoalCategories.includes("quran") &&
    (context.quran?.totalVersesRead || 0) >= 40
  ) {
    adapters.push(
      buildPersonalAIFeatureAdapter("hifz", {
        memorizedRangeLabel: context.quran?.surahName,
        progressLabel: `${context.quran?.totalVersesRead || 0} ayahs read`,
        dueLabel: context.primaryJourneyAction?.subtitle,
      }),
    );
  }

  return {
    homeContextSummary: context.contextSummary,
    homeActivityLines: buildHomeActivityLines(context.contextSummary),
    personalAI: personalAIContext || null,
    homeSession: session || { activityState: "active_rhythm" },
    homeLearning: buildHomeLearningContext({
      feedback,
      recommendation,
      now: context.now,
    }),
    userMode: context.userMode,
    subscriptionMode: context.subscriptionMode,
    nextPrayerName: context.nextPrayerName,
    minutesToNextPrayer: context.minutesToNextPrayer,
    weather: context.weather
      ? {
          conditionLabel: context.weather.conditionLabel,
          windKmh: context.weather.windKmh,
          rainProbability:
            context.weather.nextThreeHourPrecipitationProbability,
          temperatureC: context.weather.temperatureC,
        }
      : null,
    quran: context.quran,
    travel: context.extras.travel,
    arabic: context.extras.arabic,
    health: health
      ? {
          available: health.available,
          planProgress: health.planProgress,
          pendingCount: health.pendingCount,
          metrics: health.metrics || { hasData: false },
          nextCareStep: health.suggestion
            ? {
                title: health.suggestion.title,
                domain: health.suggestion.domain,
                actionLabel: health.suggestion.actionLabel,
              }
            : null,
          privacyScope:
            "Only the summarized health context the user has allowed is used; raw samples and location are not sent.",
        }
      : null,
    savedAnswers: context.extras.savedAnswers,
    tasbeeh: tasbeeh || null,
    womensHealth: womensHealth?.enabled ? womensHealth : null,
    streak: {
      gardenDays: context.streakDays,
      dailyPlanDays: context.dailyPlanStreak,
      completedToday: context.dailyActionsCompleted,
      totalToday: context.dailyActionsTotal,
    },
    explore: {
      activeGoalCategories: context.activeGoalCategories,
      userMode: context.userMode,
      recentMediaKind: context.recentMedia?.kind || null,
    },
    personalAIFeatureAdapters: adapters,
    activeSurfaces: adapters.map((adapter) => adapter.surface),
  };
}
