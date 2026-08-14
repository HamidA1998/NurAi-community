import {
  buildArabicReviewRetentionSummary,
  loadArabicLearningProgress,
} from "@/services/arabicLearningProgressService";
import {
  listSavedAIAnswers,
  summarizeSavedAIAnswers,
  type SavedAIAnswerSummary,
} from "@/services/aiSavedAnswerService";
import type {
  DailyDeenJourneyState,
  DailyJourneyAction,
  CustomDailyGoalPreference,
} from "@/services/dailyDeenJourneyService";
import {
  getTravelCompletionPercent,
  loadTravelCompanionState,
  type TravelCompanionState,
} from "@/services/travelCompanionService";
import type { LiveWeatherSnapshot } from "@/services/weatherService";
import type { MediaResumeSession } from "@/services/mediaResumeService";
import type { PersonalHomePlanSummary } from "@/services/personalNurAIPlanService";
import {
  buildMuslimHealthPlan,
  loadRecentMuslimHealthCompletion,
  loadMuslimHealthProfile,
} from "@/services/muslimHealthService";
import { loadLastHealthSummary } from "@/services/nativeHealthDataService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type HomeAIUserMode =
  | "new_muslim"
  | "quran_learner"
  | "arabic_learner"
  | "traveller"
  | "family"
  | "busy_daily"
  | "ramadan"
  | "balanced";

export type HomeAISubscriptionMode = "free" | "premium" | "scholar";

export type HomeAIContextExtras = {
  savedAnswers: SavedAIAnswerSummary;
  latestSavedAnswerTitle?: string;
  arabic: {
    retentionLabel: string;
    retentionBody: string;
    retentionRisk: "clear" | "due_today" | "overdue" | "lapse_watch";
    dueCount: number;
    masteredCount: number;
  };
  travel: {
    enabled: boolean;
    destination?: string;
    completionPercent: number;
    detectionTitle?: string;
    updatedAt?: string;
  };
  tasbeeh?: {
    count: number;
    target: number;
    dhikrLabel: string;
    todayTotal: number;
  };
  womensHealth?: {
    enabled: boolean;
    cyclePhaseLabel?: string;
    careSignalLevel?: "normal" | "attention";
    careSignalTitle?: string;
    careSignalBody?: string;
  };
  health?: {
    available: boolean;
    planProgress: number;
    pendingCount: number;
    recentCompletion?: {
      actionId: string;
      actionTitle: string;
      messageTitle: string;
      messageBody: string;
      islamicFrame: string;
      sourceAnchor?: string;
      completedAt: string;
      planProgress: number;
    };
    suggestion?: {
      id: string;
      title: string;
      body: string;
      islamicFrame: string;
      domain: string;
      route?: string;
      actionLabel: string;
    };
    // Today's real HealthKit read, cached from the Health screen (may be absent).
    metrics?: {
      hasData: boolean;
      summaryLine?: string;
      stepsLabel?: string;
      sleepLabel?: string;
      recoveryLabel?: string;
      heartLabel?: string;
    };
  };
  notifications?: {
    permissionGranted: boolean;
    enabledPrayerReminderCount: number;
    quietHoursEnabled: boolean;
  };
};

export type HomeAIContextInput = {
  now: Date;
  locationLabel: string;
  hijriDateLabel: string;
  calculationMethod?: string;
  gender?: "brother" | "sister" | null;
  madhhab?: string | null;
  nextPrayerName: string;
  nextPrayerTimeLabel: string;
  minutesToNextPrayer: number | null;
  dailyActionsCompleted: number;
  dailyActionsTotal: number;
  streakDays: number;
  dailyPlanStreak: number;
  quran?: {
    surah?: number;
    surahName?: string;
    verse?: number;
    totalVersesRead?: number;
    totalPercentage?: number;
    recentDailyPace?: number;
    estimatedCompletionLabel?: string;
    paceConfidence?: "limited" | "established";
  } | null;
  weather: LiveWeatherSnapshot | null;
  dailyJourney: DailyDeenJourneyState | null;
  personalPlan: PersonalHomePlanSummary | null;
  personalPlanContextLine?: string | null;
  customGoals: CustomDailyGoalPreference[];
  recentMedia: MediaResumeSession | null;
  subscriptionMode: HomeAISubscriptionMode;
  isRamadan?: boolean;
  isRevert?: boolean;
  currentNudge?: {
    title: string;
    body: string;
    category?: string;
    priority?: string;
    actionRoute?: string;
    actionParams?: Record<string, unknown>;
  } | null;
  v3Nudge?: {
    id?: string;
    title: string;
    body: string;
    reason?: string;
    category?: string;
    priority?: string;
    actionLabel?: string;
    actionRoute?: string;
    actionParams?: Record<string, unknown>;
  } | null;
  extras: HomeAIContextExtras;
};

export type HomeAIContext = HomeAIContextInput & {
  userMode: HomeAIUserMode;
  contextSummary: string;
  safeSignals: string[];
  activeGoalCategories: string[];
  primaryJourneyAction: DailyJourneyAction | null;
};

const EMPTY_SAVED_ANSWERS: SavedAIAnswerSummary = {
  total: 0,
  sourceAware: 0,
  needsSourceReview: 0,
  scholarReviewRecommended: 0,
};

export function createDefaultHomeAIContextExtras(): HomeAIContextExtras {
  return {
    savedAnswers: EMPTY_SAVED_ANSWERS,
    arabic: {
      retentionLabel: "Arabic ready",
      retentionBody:
        "Open Arabic learning when you want a short Quranic language step.",
      retentionRisk: "clear",
      dueCount: 0,
      masteredCount: 0,
    },
    travel: {
      enabled: false,
      completionPercent: 0,
    },
  };
}

async function loadHomeNotificationContext(): Promise<
  HomeAIContextExtras["notifications"]
> {
  try {
    const raw = await AsyncStorage.getItem("notification_settings");
    if (!raw) return undefined;
    const settings = JSON.parse(raw) as {
      permissionGranted?: unknown;
      prayerReminders?: Record<string, { enabled?: unknown }>;
      quietHours?: { enabled?: unknown };
    };
    return {
      permissionGranted: settings.permissionGranted === true,
      enabledPrayerReminderCount: Object.values(
        settings.prayerReminders || {},
      ).filter((item) => item?.enabled === true).length,
      quietHoursEnabled: settings.quietHours?.enabled === true,
    };
  } catch {
    return undefined;
  }
}

export async function loadHomeAIContextExtras(): Promise<HomeAIContextExtras> {
  const fallback = createDefaultHomeAIContextExtras();
  const [
    savedAnswers,
    arabicProgress,
    travelState,
    healthProfile,
    notifications,
    cachedHealthSummary,
    recentHealthCompletion,
  ] = await Promise.all([
    listSavedAIAnswers().catch(() => []),
    loadArabicLearningProgress().catch(() => null),
    loadTravelCompanionState().catch(() => null),
    loadMuslimHealthProfile().catch(() => null),
    loadHomeNotificationContext(),
    loadLastHealthSummary().catch(() => null),
    loadRecentMuslimHealthCompletion().catch(() => null),
  ]);
  const arabicSummary = arabicProgress
    ? buildArabicReviewRetentionSummary(arabicProgress)
    : null;
  const travel = travelState as TravelCompanionState | null;

  // Care-habit signals (hydration, sleep, movement) that the Home can read
  // without a live HealthKit call — enough for a gentle, time-aware nudge.
  const healthExtra = (() => {
    // A user may connect Apple Health/Health Connect before creating a Muslim
    // wellbeing plan. Keep the real, already-authorised summary useful in that
    // case without prompting for permissions from Home.
    if (!healthProfile && !cachedHealthSummary) return undefined;
    const plan = healthProfile ? buildMuslimHealthPlan(healthProfile) : null;
    const pending = plan
      ? plan.actions.filter(
          (action) =>
            healthProfile?.completedActionIds?.[action.id] !== plan.dateKey,
        )
      : [];
    const suggestion = pending[0];

    // Real, today-only HealthKit numbers cached from the Health screen, so the
    // personal AI can reference actual activity/sleep/heart — not just reminders.
    const metrics = (() => {
      const s = cachedHealthSummary;
      if (!s) return { hasData: false };
      const today = new Date().toISOString().slice(0, 10);
      const cachedDay = s.cachedAt ? s.cachedAt.slice(0, 10) : today;
      if (cachedDay !== today) return { hasData: false };
      const heartBpm = s.restingHeartRateBpm ?? s.averageHeartRateBpm;
      const stepsLabel =
        typeof s.steps === "number" && s.steps > 0
          ? `${Math.round(s.steps).toLocaleString()} steps`
          : undefined;
      const sleepLabel =
        typeof s.sleepMinutes === "number" && s.sleepMinutes > 0
          ? `${Math.floor(s.sleepMinutes / 60)}h ${Math.round(s.sleepMinutes % 60)}m sleep`
          : undefined;
      const heartLabel =
        typeof heartBpm === "number" && heartBpm > 0
          ? `${Math.round(heartBpm)} bpm heart`
          : undefined;
      const caloriesLabel =
        typeof s.activeCaloriesKcal === "number" && s.activeCaloriesKcal > 0
          ? `${Math.round(s.activeCaloriesKcal)} active kcal`
          : undefined;
      const parts = [stepsLabel, sleepLabel, heartLabel, caloriesLabel].filter(
        Boolean,
      ) as string[];
      return {
        hasData: parts.length > 0,
        summaryLine: parts.length ? parts.join(" · ") : undefined,
        stepsLabel,
        sleepLabel,
        heartLabel,
      };
    })();

    return {
      available: true,
      planProgress: plan?.progress || 0,
      pendingCount: pending.length,
      recentCompletion: recentHealthCompletion || undefined,
      suggestion: suggestion
        ? {
            id: suggestion.id,
            title: suggestion.title,
            body: suggestion.body,
            islamicFrame: suggestion.islamicFrame,
            domain: suggestion.domain,
            route: suggestion.route,
            actionLabel: suggestion.actionLabel,
          }
        : undefined,
      metrics,
    };
  })();

  return {
    savedAnswers: summarizeSavedAIAnswers(savedAnswers),
    latestSavedAnswerTitle: savedAnswers[0]?.title,
    arabic: {
      retentionLabel: arabicSummary?.retentionLabel || "Arabic ready",
      retentionBody:
        arabicSummary?.retentionBody ||
        "Open Arabic learning when you want a short Quranic language step.",
      retentionRisk:
        arabicSummary?.retentionRisk || fallback.arabic.retentionRisk,
      dueCount: arabicSummary?.dueCount || 0,
      masteredCount: arabicSummary?.masteredCount || 0,
    },
    travel: {
      enabled: !!travel?.enabled,
      destination: travel?.destination || travel?.airportName,
      completionPercent: travel
        ? getTravelCompletionPercent(travel)
        : fallback.travel.completionPercent,
      detectionTitle: travel?.lastDetection?.title,
      updatedAt: travel?.updatedAt,
    },
    health: healthExtra,
    notifications,
  };
}

function inferUserMode(input: HomeAIContextInput): HomeAIUserMode {
  const activeGoals = input.customGoals
    .filter((goal) => goal.enabled)
    .map((goal) => goal.category);

  if (input.isRamadan) return "ramadan";
  if (input.isRevert) return "new_muslim";
  if (input.extras.travel.enabled) return "traveller";
  if (input.personalPlan?.familyLabel?.toLowerCase().includes("family")) {
    return "family";
  }
  if (
    activeGoals.includes("arabic") ||
    input.extras.arabic.retentionRisk === "due_today" ||
    input.extras.arabic.retentionRisk === "overdue"
  ) {
    return "arabic_learner";
  }
  if (
    activeGoals.includes("quran") ||
    (input.quran?.totalVersesRead || 0) > 0
  ) {
    return "quran_learner";
  }
  if (
    input.minutesToNextPrayer != null &&
    input.minutesToNextPrayer <= 45 &&
    input.dailyActionsCompleted < input.dailyActionsTotal
  ) {
    return "busy_daily";
  }
  return "balanced";
}

function compactLine(label: string, value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  return `${label}: ${value}`;
}

export function buildHomeAIContext(input: HomeAIContextInput): HomeAIContext {
  const activeGoalCategories = input.customGoals
    .filter((goal) => goal.enabled)
    .map((goal) => goal.category);
  const primaryJourneyAction = input.dailyJourney?.primaryAction || null;
  const userMode = inferUserMode(input);
  const quranLabel = input.quran?.surahName
    ? `${input.quran.surahName} ${input.quran.verse || ""}`.trim()
    : input.quran?.totalVersesRead
      ? `${input.quran.totalVersesRead} ayahs read`
      : "No saved Quran position yet";
  const safeSignals = [
    compactLine("Next prayer", input.nextPrayerName),
    input.minutesToNextPrayer != null
      ? `${input.minutesToNextPrayer}m to salah`
      : null,
    compactLine(
      "Daily actions",
      `${input.dailyActionsCompleted}/${input.dailyActionsTotal}`,
    ),
    compactLine("Quran", quranLabel),
    compactLine("Arabic", input.extras.arabic.retentionLabel),
    input.extras.travel.enabled
      ? compactLine(
          "Travel",
          input.extras.travel.destination || "Travel Mode active",
        )
      : null,
    input.extras.savedAnswers.scholarReviewRecommended > 0
      ? `${input.extras.savedAnswers.scholarReviewRecommended} saved answer review${input.extras.savedAnswers.scholarReviewRecommended === 1 ? "" : "s"}`
      : null,
    input.weather
      ? compactLine(
          "Weather",
          `${input.weather.conditionLabel}, ${Math.round(
            input.weather.temperatureC,
          )}C`,
        )
      : null,
    primaryJourneyAction
      ? compactLine("Journey", primaryJourneyAction.category)
      : null,
    input.v3Nudge ? compactLine("Guidance", input.v3Nudge.title) : null,
    activeGoalCategories.length
      ? compactLine("Goals", activeGoalCategories.join(", "))
      : null,
  ].filter(Boolean) as string[];

  const localTimeLabel = input.now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const contextSummary = [
    `Mode: ${userMode}; subscription: ${input.subscriptionMode}.`,
    `Location/date: ${input.locationLabel}; ${input.hijriDateLabel}; local time ${localTimeLabel}.`,
    `Prayer settings: calculation ${input.calculationMethod || "app default"}; madhhab ${input.madhhab || "not selected"}.`,
    `Profile guidance: ${input.gender || "gender-neutral"}; goals ${activeGoalCategories.join(", ") || "none selected"}.`,
    `Prayer: ${input.nextPrayerName} at ${input.nextPrayerTimeLabel}${
      input.minutesToNextPrayer != null
        ? `; ${input.minutesToNextPrayer} minutes away`
        : ""
    }.`,
    `Daily actions: ${input.dailyActionsCompleted}/${input.dailyActionsTotal}. Streaks: garden ${input.streakDays}, daily plan ${input.dailyPlanStreak}.`,
    `Quran: ${quranLabel}; completion ${input.quran?.totalPercentage ?? 0}%.`,
    input.quran?.recentDailyPace
      ? `Quran pace: about ${input.quran.recentDailyPace} ayahs per active day; estimated completion ${input.quran.estimatedCompletionLabel || "not available"}; confidence ${input.quran.paceConfidence || "limited"}.`
      : "Quran pace: not enough visible progress yet.",
    `Arabic: ${input.extras.arabic.retentionLabel}; ${input.extras.arabic.dueCount} due; ${input.extras.arabic.masteredCount} mastered.`,
    `Saved AI answers: ${input.extras.savedAnswers.total} total; ${input.extras.savedAnswers.needsSourceReview} need source review; ${input.extras.savedAnswers.scholarReviewRecommended} recommend scholar review.`,
    input.extras.travel.enabled
      ? `Travel: active for ${input.extras.travel.destination || "current journey"}; readiness ${input.extras.travel.completionPercent}%.`
      : "Travel: inactive.",
    input.extras.health?.available
      ? `Body care: ${input.extras.health.pendingCount} care action${input.extras.health.pendingCount === 1 ? "" : "s"} pending${input.extras.health.suggestion ? `; next: ${input.extras.health.suggestion.title}` : ""}.${input.extras.health.recentCompletion ? ` Recently completed: ${input.extras.health.recentCompletion.actionTitle}; ${input.extras.health.recentCompletion.islamicFrame}${input.extras.health.recentCompletion.sourceAnchor ? `; source ${input.extras.health.recentCompletion.sourceAnchor}` : ""}.` : ""}${input.extras.health.metrics?.hasData ? ` Today's health readings: ${input.extras.health.metrics.summaryLine}.` : ""}`
      : "Body care: none pending.",
    input.weather
      ? `Weather: ${input.weather.conditionLabel}; wind ${input.weather.windKmh} km/h; rain ${
          input.weather.nextThreeHourPrecipitationProbability ?? 0
        }%.`
      : "Weather: not loaded.",
    input.extras.tasbeeh
      ? `Dhikr: ${input.extras.tasbeeh.dhikrLabel}; ${input.extras.tasbeeh.todayTotal} logged today; target ${input.extras.tasbeeh.target}.`
      : "Dhikr: no tasbeeh signal loaded.",
    input.extras.womensHealth?.enabled
      ? `Women's health: ${input.extras.womensHealth.cyclePhaseLabel || "active"}; care signal ${input.extras.womensHealth.careSignalLevel || "normal"}.`
      : "Women's health: not in active guidance context.",
    input.extras.notifications
      ? `Notifications: ${input.extras.notifications.permissionGranted ? "allowed" : "not allowed"}; ${input.extras.notifications.enabledPrayerReminderCount} prayer reminder${input.extras.notifications.enabledPrayerReminderCount === 1 ? "" : "s"} enabled; quiet hours ${input.extras.notifications.quietHoursEnabled ? "on" : "off"}.`
      : "Notifications: preference context not loaded.",
    input.recentMedia
      ? `Unfinished media: ${input.recentMedia.kind}; ${input.recentMedia.title}; ${input.recentMedia.detailLabel}.`
      : "Unfinished media: none loaded.",
    input.v3Nudge
      ? `Current recommendation: ${input.v3Nudge.title}; ${input.v3Nudge.reason || input.v3Nudge.body}.`
      : "Current recommendation: none active.",
    primaryJourneyAction
      ? `Primary journey action: ${primaryJourneyAction.title}; ${primaryJourneyAction.reason}.`
      : "Primary journey action: none loaded.",
    input.personalPlanContextLine ||
      input.personalPlan?.aiContextLine ||
      "Personal plan: no onboarding summary loaded.",
    "Privacy: do not infer private journal text, hidden notes, secrets, or personal rulings from this context.",
  ].join("\n");

  return {
    ...input,
    userMode,
    contextSummary,
    safeSignals: Array.from(new Set(safeSignals)).slice(0, 8),
    activeGoalCategories,
    primaryJourneyAction,
  };
}
