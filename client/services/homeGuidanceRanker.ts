import type { PersonalAIGuidanceContract } from "@shared/nuraiAI";
import type { HomeAIContext } from "@/services/homeAIContextService";
import type { HomeAIFeedbackState } from "@/services/homeAIFeedbackService";
import { homeAIFeedbackPenalty } from "@/services/homeAIFeedbackRanking";

export type HomeGuidancePriority = "critical" | "high" | "medium" | "low";
export type HomeGuidanceActionType = "route" | "ai";

export type HomeGuidanceRanking = {
  urgency: number;
  relevance: number;
  confidence: number;
  freshness: number;
  sensitivity: number;
  feedback: number;
  recency: number;
  total: number;
};

export type HomeGuidanceCard = {
  id: string;
  category:
    | "prayer"
    | "quran"
    | "arabic"
    | "travel"
    | "health"
    | "saved_answer"
    | "daily_plan"
    | "weather"
    | "reflection"
    | "trust";
  title: string;
  body: string;
  reason: string;
  prompt: string;
  ctaLabel: string;
  planLabel: string;
  isPaid: boolean;
  actionType: HomeGuidanceActionType;
  routeName?: string;
  routeParams?: Record<string, unknown>;
  priority: HomeGuidancePriority;
  score: number;
  ranking: HomeGuidanceRanking;
  confidence: number;
  safetyNote?: string;
  signals: string[];
  feedbackKey: string;
};

export type HomeGuidancePlan = {
  main: HomeGuidanceCard;
  secondary: HomeGuidanceCard[];
  daySnapshot: {
    completed: number;
    total: number;
    completedLabels: string[];
    remainingLabels: string[];
  };
  userMode: HomeAIContext["userMode"];
  contextSummary: string;
  generatedAt: string;
};

type DraftCandidate = Omit<
  HomeGuidanceCard,
  "score" | "ranking" | "signals" | "feedbackKey" | "planLabel" | "isPaid"
> & {
  baseScore: number;
  signalHints?: string[];
};

const PRIORITY_WEIGHT: Record<HomeGuidancePriority, number> = {
  critical: 32,
  high: 22,
  medium: 12,
  low: 4,
};

const PRIORITY_LABEL: Record<HomeGuidancePriority, string> = {
  critical: "Urgent",
  high: "High value",
  medium: "Useful now",
  low: "Optional",
};

function userModeBoost(
  context: HomeAIContext,
  category: HomeGuidanceCard["category"],
) {
  const mode = context.userMode;
  if (mode === "traveller" && category === "travel") return 10;
  if (mode === "arabic_learner" && category === "arabic") return 22;
  if (mode === "quran_learner" && category === "quran") return 20;
  if (mode === "new_muslim" && category === "trust") return 18;
  if (mode === "busy_daily" && category === "prayer") return 18;
  if (
    mode === "ramadan" &&
    (category === "quran" || category === "reflection")
  ) {
    return 14;
  }
  return 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function confidenceScore(value: number) {
  return Math.max(0, Math.min(12, Math.round(value * 12)));
}

function prayerWindowBucket(minutes: number | null) {
  if (minutes == null) return "unknown";
  if (minutes <= 15) return "now";
  if (minutes <= 45) return "soon";
  if (minutes <= 75) return "near";
  if (minutes <= 180) return "later";
  return "open";
}

/**
 * A privacy-safe, deterministic key for changes that can genuinely alter the
 * next best action. It deliberately ignores minute-by-minute clock drift.
 */
export function buildHomeGuidanceContextFingerprint(context: HomeAIContext) {
  const now = context.now;
  const localDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const dayPart = Math.floor(now.getHours() / 4);
  const quran = context.quran;
  const health = context.extras.health;
  const healthMetrics = health?.metrics;
  const travel = context.extras.travel;
  return [
    localDate,
    `daypart:${dayPart}`,
    `prayer:${context.nextPrayerName}:${prayerWindowBucket(context.minutesToNextPrayer)}`,
    `actions:${context.dailyActionsCompleted}/${context.dailyActionsTotal}`,
    `quran:${quran?.surah || 0}:${quran?.verse || 0}:${quran?.totalVersesRead || 0}`,
    `dhikr:${context.extras.tasbeeh?.todayTotal || 0}:${context.extras.tasbeeh?.count || 0}`,
    `arabic:${context.extras.arabic.retentionRisk}:${context.extras.arabic.dueCount}`,
    `travel:${travel.enabled ? 1 : 0}:${Math.floor(travel.completionPercent / 10)}:${travel.updatedAt?.slice(0, 10) || "none"}`,
    `health:${health?.suggestion?.id || "none"}:${Math.floor((health?.planProgress || 0) / 10)}`,
    `health-complete:${health?.recentCompletion?.actionId || "none"}:${health?.recentCompletion?.completedAt.slice(0, 13) || "none"}`,
    `health-data:${healthMetrics?.hasData ? 1 : 0}:${healthMetrics?.stepsLabel ? 1 : 0}:${healthMetrics?.sleepLabel ? 1 : 0}:${healthMetrics?.recoveryLabel ? 1 : 0}:${healthMetrics?.heartLabel ? 1 : 0}`,
    `journey:${context.primaryJourneyAction?.category || "none"}:${context.primaryJourneyAction?.priority || 0}`,
    `nudge:${context.v3Nudge?.id || "none"}`,
    `mode:${context.userMode}`,
  ].join("|");
}

export function buildHomeGuidanceRequestKey(
  context: HomeAIContext,
  recommendationId: string,
) {
  return `${recommendationId}::${buildHomeGuidanceContextFingerprint(context)}`;
}

function guidanceRecencyScore(
  context: HomeAIContext,
  feedback: HomeAIFeedbackState | null | undefined,
  candidate: DraftCandidate,
) {
  if (candidate.priority === "critical") return 0;
  const impressions = feedback?.impressions || [];
  if (!impressions.length) return 0;
  const fingerprint = buildHomeGuidanceContextFingerprint(context);
  const now = context.now.getTime();
  const exact = impressions.find(
    (item) => item.recommendationId === candidate.id,
  );
  const sameCategory = impressions.find(
    (item) => item.category === candidate.category,
  );
  let penalty = 0;

  if (exact) {
    const ageMinutes = Math.max(0, (now - Date.parse(exact.shownAt)) / 60_000);
    if (exact.contextFingerprint === fingerprint) {
      penalty +=
        ageMinutes <= 15
          ? -30
          : ageMinutes <= 120
            ? -22
            : ageMinutes <= 480
              ? -14
              : ageMinutes <= 1440
                ? -8
                : 0;
    } else if (ageMinutes <= 30) {
      // Material context changed, so the recommendation can return; retain
      // only a small visual-variety penalty during the same short session.
      penalty -= 4;
    }
  }

  if (sameCategory && sameCategory.recommendationId !== candidate.id) {
    const ageMinutes = Math.max(
      0,
      (now - Date.parse(sameCategory.shownAt)) / 60_000,
    );
    if (sameCategory.contextFingerprint === fingerprint) {
      penalty += ageMinutes <= 15 ? -6 : ageMinutes <= 120 ? -3 : 0;
    }
  }

  return penalty;
}

function isPaidMode(context: HomeAIContext) {
  return (
    context.subscriptionMode === "premium" ||
    context.subscriptionMode === "scholar"
  );
}

function planLabel(context: HomeAIContext) {
  if (context.subscriptionMode === "scholar") return "Scholar access";
  if (context.subscriptionMode === "premium") return "Premium guidance";
  return "Free guidance";
}

function guidancePrompt(context: HomeAIContext, candidate: DraftCandidate) {
  return [
    `Help me with this NurAI home recommendation: ${candidate.title}.`,
    candidate.reason,
    "",
    "Use only this visible app context:",
    context.contextSummary,
    "",
    "Return: 1) one next action, 2) why it fits today, 3) one optional follow-up, 4) any trust boundary if needed. Do not invent private journal text, hidden progress, personal rulings, or source references.",
  ].join("\n");
}

function makeCandidate(
  context: HomeAIContext,
  candidate: Omit<DraftCandidate, "prompt"> & { prompt?: string },
): DraftCandidate {
  return {
    ...candidate,
    prompt:
      candidate.prompt || guidancePrompt(context, candidate as DraftCandidate),
  };
}

const V3_CATEGORY_MAP: Record<string, HomeGuidanceCard["category"]> = {
  prayer: "prayer",
  quran: "quran",
  learning: "arabic",
  arabic: "arabic",
  travel: "travel",
  health: "health",
  emotional: "reflection",
  dhikr: "reflection",
  reflection: "reflection",
  calendar: "reflection",
  habit: "daily_plan",
  streak: "daily_plan",
  family: "daily_plan",
  engagement: "daily_plan",
  womensHealth: "trust",
  revert: "trust",
  discovery: "trust",
};

const V3_SAFE_ROUTES = new Set([
  "PrayerTimes",
  "QuranReader",
  "ArabicLearning",
  "Tasbeeh",
  "WomensHealth",
  "StreakGarden",
  "Duas",
  "Hifz",
  "SalahGuide",
]);

function v3Priority(value: string | undefined): HomeGuidancePriority {
  return value === "critical" ||
    value === "high" ||
    value === "medium" ||
    value === "low"
    ? value
    : "medium";
}

export function selectLiveRelevantV3Nudge<T extends { id: string }>(
  nudges: readonly T[] | null | undefined,
  livePrayer: {
    nextPrayerKey?: string | null;
    minutesToNextPrayer?: number | null;
  },
): T | null {
  const nextPrayer = String(livePrayer.nextPrayerKey || "").toLowerCase();
  const minutes = livePrayer.minutesToNextPrayer;

  return (
    nudges?.find((nudge) => {
      switch (nudge.id) {
        case "prayer_fajr_now":
          return nextPrayer === "sunrise";
        case "prayer_dhuha":
          return nextPrayer === "dhuhr" && minutes != null && minutes > 30;
        case "dhikr_morning":
          return (
            nextPrayer === "sunrise" ||
            (nextPrayer === "dhuhr" && minutes != null && minutes > 120)
          );
        case "dhikr_evening":
          return nextPrayer === "maghrib";
        default:
          return true;
      }
    }) ?? null
  );
}

function buildCandidates(context: HomeAIContext): DraftCandidate[] {
  const candidates: DraftCandidate[] = [];
  const paid = isPaidMode(context);
  const nextPrayer = context.nextPrayerName || "the next prayer";
  const minutes = context.minutesToNextPrayer;

  if (context.v3Nudge) {
    const rawCategory = context.v3Nudge.category || "daily_plan";
    const category = V3_CATEGORY_MAP[rawCategory] || "daily_plan";
    const priority = v3Priority(context.v3Nudge.priority);
    const routeName =
      context.v3Nudge.actionRoute &&
      V3_SAFE_ROUTES.has(context.v3Nudge.actionRoute)
        ? context.v3Nudge.actionRoute
        : undefined;
    candidates.push(
      makeCandidate(context, {
        id: `v3-${context.v3Nudge.id || rawCategory}`,
        category,
        title: context.v3Nudge.title.slice(0, 120),
        body: context.v3Nudge.body.slice(0, 240),
        reason:
          context.v3Nudge.reason ||
          "NurAI selected this from current app activity.",
        ctaLabel: context.v3Nudge.actionLabel || "Open",
        actionType: "route",
        routeName,
        routeParams: routeName ? context.v3Nudge.actionParams : undefined,
        priority,
        confidence: priority === "critical" ? 0.94 : 0.86,
        baseScore:
          priority === "critical"
            ? 48
            : priority === "high"
              ? 44
              : priority === "medium"
                ? 30
                : 16,
        signalHints: ["Daily guidance", context.v3Nudge.reason || rawCategory],
      }),
    );
  }

  if (minutes != null) {
    const urgent = minutes <= 15;
    const near = minutes <= 75;
    candidates.push(
      makeCandidate(context, {
        id: "prayer-window",
        category: "prayer",
        title: urgent
          ? `Prepare for ${nextPrayer}`
          : near
            ? `Protect ${nextPrayer}`
            : `Plan around ${nextPrayer}`,
        body: urgent
          ? `${nextPrayer} is close. Make the next step simple and prayer-first.`
          : near
            ? `Use the window before ${nextPrayer} for one calm worship action.`
            : `${nextPrayer} is later. There is room for one useful step first.`,
        reason: `${nextPrayer} is ${minutes} minutes away.`,
        ctaLabel: urgent ? "Prepare" : "Open",
        actionType: "route",
        routeName: "PrayerTimes",
        priority: urgent ? "critical" : near ? "high" : "low",
        confidence: urgent ? 0.94 : 0.86,
        baseScore: urgent ? 48 : near ? 30 : 8,
        signalHints: [`${minutes}m to salah`, nextPrayer],
      }),
    );
  }

  const saved = context.extras.savedAnswers;
  if (saved.scholarReviewRecommended > 0 || saved.needsSourceReview > 0) {
    const needsScholar = saved.scholarReviewRecommended > 0;
    candidates.push(
      makeCandidate(context, {
        id: "saved-answer-trust",
        category: "saved_answer",
        title: needsScholar ? "Review a sensitive answer" : "Check source gaps",
        body: needsScholar
          ? "A saved NurAI answer is marked for qualified review before relying on it."
          : "A saved answer has source gaps. Follow up before acting on extra detail.",
        reason: `${saved.scholarReviewRecommended} scholar review and ${saved.needsSourceReview} source review signal${saved.needsSourceReview === 1 ? "" : "s"} found.`,
        ctaLabel: "Review",
        actionType: "route",
        routeName: "Settings",
        priority: needsScholar ? "critical" : "high",
        confidence: 0.9,
        safetyNote:
          "Sensitive religious, health, finance, family, or legal matters need qualified human support.",
        baseScore: needsScholar ? 52 : 39,
        signalHints: ["Trust boundary", "Saved answer"],
      }),
    );
  }

  if (
    context.extras.arabic.retentionRisk === "overdue" ||
    context.extras.arabic.retentionRisk === "due_today"
  ) {
    const overdue = context.extras.arabic.retentionRisk === "overdue";
    candidates.push(
      makeCandidate(context, {
        id: "arabic-review",
        category: "arabic",
        title: overdue ? "Recover Arabic recall" : "Review Arabic today",
        body: context.extras.arabic.retentionBody,
        reason: context.extras.arabic.retentionLabel,
        ctaLabel: "Review",
        actionType: "route",
        routeName: "ArabicLearning",
        priority: overdue ? "high" : "medium",
        confidence: 0.84,
        baseScore: overdue ? 38 : 27,
        signalHints: [
          context.extras.arabic.retentionLabel,
          `${context.extras.arabic.dueCount} due`,
        ],
      }),
    );
  }

  const health = context.extras.health;
  if (health?.available && health.recentCompletion) {
    const completion = health.recentCompletion;
    const completionAgeMinutes = Math.max(
      0,
      Math.round(
        (context.now.getTime() - new Date(completion.completedAt).getTime()) /
          60_000,
      ),
    );
    if (completionAgeMinutes <= 12 * 60) {
      candidates.push(
        makeCandidate(context, {
          id: `health-complete-${completion.actionId}`,
          category: "health",
          title: completion.messageTitle,
          body: completion.messageBody,
          reason:
            completion.sourceAnchor ||
            "Recorded from a care action completed in Health",
          ctaLabel: "View progress",
          actionType: "route",
          routeName: "MuslimHealth",
          priority: completionAgeMinutes <= 120 ? "high" : "medium",
          confidence: 0.94,
          baseScore: completionAgeMinutes <= 120 ? 38 : 18,
          signalHints: [
            `${completion.planProgress}% care plan`,
            completion.actionTitle,
          ],
        }),
      );
    }
  }
  if (health?.available && health.suggestion) {
    const suggestion = health.suggestion;
    const prayerNear = minutes != null && minutes <= 90;
    const timeSensitive = suggestion.domain === "hydration" && prayerNear;
    const withPrayer = (value: string) =>
      value.replace(/the next (?:prayer|salah)(?: window)?/i, nextPrayer);
    candidates.push(
      makeCandidate(context, {
        id: `health-${suggestion.id}`,
        category: "health",
        title: timeSensitive ? withPrayer(suggestion.title) : suggestion.title,
        body: timeSensitive ? withPrayer(suggestion.body) : suggestion.body,
        reason: suggestion.islamicFrame,
        ctaLabel: suggestion.actionLabel || "Open Health",
        actionType: "route",
        routeName: "MuslimHealth",
        priority: timeSensitive ? "high" : "medium",
        confidence: 0.72,
        baseScore: timeSensitive ? 34 : 12,
        signalHints: [
          `${health.pendingCount} care action${health.pendingCount === 1 ? "" : "s"} pending`,
          timeSensitive ? `Before ${nextPrayer}` : suggestion.domain,
        ],
      }),
    );
  }

  if (context.primaryJourneyAction) {
    candidates.push(
      makeCandidate(context, {
        id: "daily-journey",
        category: "daily_plan",
        title: context.primaryJourneyAction.title,
        body:
          context.primaryJourneyAction.subtitle ||
          context.primaryJourneyAction.reason,
        reason: context.primaryJourneyAction.reason,
        ctaLabel: context.primaryJourneyAction.rewardLabel || "Do",
        actionType: "route",
        routeName: context.primaryJourneyAction.screen,
        routeParams: context.primaryJourneyAction.params,
        priority:
          context.primaryJourneyAction.priority >= 80 ? "high" : "medium",
        confidence: 0.8,
        baseScore: Math.min(
          36,
          12 + Math.round(context.primaryJourneyAction.priority / 3),
        ),
        signalHints: [context.primaryJourneyAction.category, "Daily journey"],
      }),
    );
  }

  const quranReference = context.quran?.surahName
    ? `${context.quran.surahName} ${context.quran.verse || ""}`.trim()
    : "your Quran rhythm";
  candidates.push(
    makeCandidate(context, {
      id: "quran-next",
      category: "quran",
      title:
        (context.quran?.totalVersesRead || 0) > 0
          ? `Continue ${quranReference}`
          : "Start one Quran moment",
      body:
        context.quran?.recentDailyPace &&
        context.quran?.estimatedCompletionLabel
          ? `${context.quran.totalVersesRead || 0} ayahs read. At about ${context.quran.recentDailyPace} per active day, a full reading could take ${context.quran.estimatedCompletionLabel}. Keep the next session small.`
          : (context.quran?.totalVersesRead || 0) > 0
            ? "Return to your saved Quran position with one small, source-aware step."
            : "Begin with one ayah, one listen, or one short reflection.",
      reason:
        context.quran?.recentDailyPace &&
        context.quran?.estimatedCompletionLabel
          ? `${context.quran.recentDailyPace} ayahs per active day; ${context.quran.paceConfidence || "limited"} pace estimate.`
          : quranReference,
      ctaLabel: "Open",
      actionType: "route",
      routeName: "QuranReader",
      priority: "medium",
      confidence: 0.78,
      baseScore: (context.quran?.totalVersesRead || 0) > 0 ? 25 : 20,
      signalHints: [
        quranReference,
        context.quran?.recentDailyPace
          ? `${context.quran.recentDailyPace} ayahs per active day`
          : "Quran progress",
      ],
    }),
  );

  const tasbeeh = context.extras.tasbeeh;
  if (tasbeeh && (tasbeeh.todayTotal > 0 || tasbeeh.target > 0)) {
    const remaining = Math.max(0, tasbeeh.target - tasbeeh.count);
    candidates.push(
      makeCandidate(context, {
        id: "tasbeeh-dhikr",
        category: "reflection",
        title:
          remaining > 0 ? "Finish your dhikr round" : "Start a dhikr round",
        body:
          tasbeeh.todayTotal > 0
            ? `${tasbeeh.dhikrLabel}: ${tasbeeh.count}/${tasbeeh.target} today. One calm round after ${nextPrayer}.`
            : `Start with ${tasbeeh.target} ${tasbeeh.dhikrLabel} after ${nextPrayer}.`,
        reason: `${tasbeeh.dhikrLabel} · ${tasbeeh.todayTotal} logged today`,
        ctaLabel: tasbeeh.todayTotal > 0 ? "Continue" : "Open",
        actionType: "route",
        routeName: "Tasbeeh",
        priority: remaining > 0 && remaining <= 10 ? "high" : "medium",
        confidence: 0.82,
        baseScore: remaining > 0 ? 30 : 24,
        signalHints: ["Dhikr", tasbeeh.dhikrLabel],
      }),
    );
  }

  const womens = context.extras.womensHealth;
  if (womens?.enabled && womens.careSignalLevel === "attention") {
    candidates.push(
      makeCandidate(context, {
        id: "womens-health-care",
        category: "trust",
        title: womens.careSignalTitle || "Review cycle guidance",
        body:
          womens.careSignalBody ||
          "Your saved cycle pattern may need careful worship planning today.",
        reason: womens.cyclePhaseLabel || "Women's health signal",
        ctaLabel: "Review",
        actionType: "route",
        routeName: "WomensHealth",
        priority: "high",
        confidence: 0.88,
        safetyNote:
          "This is not medical advice. Worship rulings need qualified scholar support when unclear.",
        baseScore: 40,
        signalHints: ["Women's health", womens.cyclePhaseLabel || "Cycle"],
      }),
    );
  }

  if (
    (context.weather?.nextThreeHourPrecipitationProbability || 0) >= 50 ||
    (context.weather?.windKmh || 0) >= 35
  ) {
    candidates.push(
      makeCandidate(context, {
        id: "weather-prayer",
        category: "weather",
        title: "Plan around the weather",
        body:
          (context.weather?.nextThreeHourPrecipitationProbability || 0) >= 50
            ? "Rain may affect your prayer or masjid plan. Decide early."
            : "Wind is elevated. Keep the next outdoor step realistic.",
        reason: context.weather
          ? `${context.weather.conditionLabel}, wind ${context.weather.windKmh} km/h, rain ${
              context.weather.nextThreeHourPrecipitationProbability ?? 0
            }%.`
          : "Weather signal found.",
        ctaLabel: "Check",
        actionType: "route",
        routeName: "PrayerTimes",
        priority: "medium",
        confidence: 0.7,
        baseScore: 22,
        signalHints: ["Weather", nextPrayer],
      }),
    );
  }

  candidates.push(
    makeCandidate(context, {
      id: "journey-update",
      category: "trust",
      title: paid ? "Journey update ready" : "Local guidance is active",
      body: paid
        ? "Turn today's prayer, Quran, dhikr, weather, and progress into one careful next step."
        : "Your on-device routine ranks the next step from visible app progress.",
      reason:
        "Some questions need broader explanation than a single route action.",
      ctaLabel: paid ? "Review update" : "Open plan",
      actionType: "route",
      routeName: paid ? "Home" : "Subscription",
      priority: "low",
      confidence: 0.66,
      baseScore: paid ? 18 : 10,
      signalHints: ["Context ready", context.userMode],
      prompt: [
        "Build my NurAI home plan for today.",
        "",
        "Use only this visible context:",
        context.contextSummary,
        "",
        "Return one next best action, two optional actions, and any source or scholar-review boundaries.",
      ].join("\n"),
    }),
  );

  return candidates;
}

function scoreCandidate(
  context: HomeAIContext,
  feedback: HomeAIFeedbackState | null | undefined,
  candidate: DraftCandidate,
) {
  const urgency = PRIORITY_WEIGHT[candidate.priority];
  const relevance = userModeBoost(context, candidate.category);
  const confidence = confidenceScore(candidate.confidence);
  const feedbackScore = homeAIFeedbackPenalty(
    feedback,
    candidate.id,
    candidate.category,
  );
  const recency = guidanceRecencyScore(context, feedback, candidate);
  const freshness =
    candidate.id === "prayer-window" && context.minutesToNextPrayer != null
      ? context.minutesToNextPrayer <= 15
        ? 14
        : 8
      : candidate.id === "arabic-review" &&
          context.extras.arabic.retentionRisk === "overdue"
        ? 12
        : candidate.id === "travel-mode" &&
            (context.extras.travel.destination ||
              context.extras.travel.detectionTitle)
          ? 8
          : candidate.id === "daily-journey"
            ? 8
            : candidate.id === "quran-next" && context.quran?.surahName
              ? 7
              : candidate.category === "health"
                ? 11
                : 4;
  const sensitivity =
    candidate.priority === "critical" ||
    candidate.category === "saved_answer" ||
    candidate.safetyNote
      ? 12
      : candidate.category === "trust"
        ? 6
        : 0;
  const total = clampScore(
    candidate.baseScore * 0.55 +
      urgency +
      relevance * 0.65 +
      confidence +
      freshness -
      sensitivity * 0.65 +
      feedbackScore +
      recency,
  );

  return {
    urgency,
    relevance,
    confidence,
    freshness,
    sensitivity,
    feedback: feedbackScore,
    recency,
    total,
  };
}

const ROUTE_CATEGORY_HINTS: Record<string, HomeGuidanceCard["category"]> = {
  QuranReader: "quran",
  ArabicLearning: "arabic",
  PrayerTimes: "prayer",
  SalahGuide: "prayer",
  Hifz: "quran",
  Duas: "reflection",
  Scholars: "trust",
  Tasbeeh: "reflection",
  WomensHealth: "trust",
  Home: "daily_plan",
  StreakGarden: "daily_plan",
  Subscription: "trust",
  Settings: "trust",
  GlobalSearch: "daily_plan",
};

function applyServerGuidanceBoost(
  context: HomeAIContext,
  candidates: DraftCandidate[],
  guidance?: PersonalAIGuidanceContract | null,
) {
  if (!guidance?.actionPlan?.primary) return candidates;

  const primary = guidance.actionPlan.primary;
  const routeCategory = primary.route
    ? ROUTE_CATEGORY_HINTS[primary.route]
    : undefined;
  const boosted = candidates.map((candidate) => {
    const routeMatch =
      primary.route &&
      candidate.routeName === primary.route &&
      candidate.actionType === "route";
    const categoryMatch = routeCategory && candidate.category === routeCategory;
    const labelMatch = candidate.title
      .toLowerCase()
      .includes(primary.label.toLowerCase());
    const boost = routeMatch ? 28 : categoryMatch ? 16 : labelMatch ? 10 : 0;
    if (!boost) return candidate;
    return {
      ...candidate,
      baseScore: candidate.baseScore + boost,
      reason:
        routeMatch || categoryMatch
          ? `Personal AI orchestrator: ${primary.label}. ${candidate.reason}`
          : candidate.reason,
      signalHints: [
        ...(candidate.signalHints || []),
        "Personal AI orchestrator",
        primary.label,
      ],
    };
  });

  if (
    primary.route &&
    !boosted.some((candidate) => candidate.routeName === primary.route)
  ) {
    boosted.push(
      makeCandidate(context, {
        id: "personal-ai-orchestrator",
        category: routeCategory || "trust",
        title: primary.label,
        body:
          primary.reason || "Personal AI ranked this as your next best step.",
        reason: guidance.contextSummary,
        ctaLabel: "Open",
        actionType: "route",
        routeName: primary.route,
        priority: "high",
        confidence: 0.88,
        baseScore: 42,
        signalHints: ["Personal AI orchestrator", primary.label],
      }),
    );
  }

  return boosted;
}

export function buildHomeGuidancePlan(
  context: HomeAIContext,
  feedback: HomeAIFeedbackState | null | undefined,
  serverGuidance?: PersonalAIGuidanceContract | null,
): HomeGuidancePlan {
  const paid = isPaidMode(context);
  const label = planLabel(context);
  const ranked = applyServerGuidanceBoost(
    context,
    buildCandidates(context),
    serverGuidance,
  )
    .map<HomeGuidanceCard>((candidate) => {
      const ranking = scoreCandidate(context, feedback, candidate);
      return {
        ...candidate,
        reason: `${PRIORITY_LABEL[candidate.priority]}: ${candidate.reason}`,
        score: ranking.total,
        ranking,
        signals: Array.from(
          new Set([...(candidate.signalHints || []), ...context.safeSignals]),
        ).slice(0, 4),
        feedbackKey: candidate.id,
        planLabel: label,
        isPaid: paid,
      };
    })
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence);

  const [main, ...rest] = ranked;
  const completedLabels = [
    context.dailyActionsCompleted > 0
      ? `${context.dailyActionsCompleted} daily essential${context.dailyActionsCompleted === 1 ? "" : "s"}`
      : null,
    (context.extras.tasbeeh?.todayTotal || 0) > 0
      ? `${context.extras.tasbeeh?.todayTotal} dhikr logged`
      : null,
  ].filter(Boolean) as string[];
  const remainingLabels = [
    context.dailyActionsTotal > context.dailyActionsCompleted
      ? `${context.dailyActionsTotal - context.dailyActionsCompleted} daily essential${context.dailyActionsTotal - context.dailyActionsCompleted === 1 ? "" : "s"}`
      : null,
    main?.title || null,
    ...rest.slice(0, 1).map((item) => item.title),
  ].filter(Boolean) as string[];
  return {
    main,
    secondary: rest.slice(0, 3),
    daySnapshot: {
      completed: context.dailyActionsCompleted,
      total: context.dailyActionsTotal,
      completedLabels: Array.from(new Set(completedLabels)).slice(0, 2),
      remainingLabels: Array.from(new Set(remainingLabels)).slice(0, 2),
    },
    userMode: context.userMode,
    contextSummary: context.contextSummary,
    generatedAt: new Date().toISOString(),
  };
}
