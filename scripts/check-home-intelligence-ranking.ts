#!/usr/bin/env tsx

import assert from "node:assert/strict";

import type {
  HomeAIContext,
  HomeAIContextExtras,
  HomeAIContextInput,
} from "../client/services/homeAIContextService";
import type { HomeAIFeedbackState } from "../client/services/homeAIFeedbackService";
import {
  buildHomeGuidanceContextFingerprint,
  buildHomeGuidancePlan,
  buildHomeGuidanceRequestKey,
  selectLiveRelevantV3Nudge,
} from "../client/services/homeGuidanceRanker";
import { buildPersonalIntelligenceBriefing } from "../client/services/personalIntelligenceBriefingService";

function createDefaultHomeAIContextExtras(): HomeAIContextExtras {
  return {
    savedAnswers: {
      total: 0,
      sourceAware: 0,
      needsSourceReview: 0,
      scholarReviewRecommended: 0,
    },
    arabic: {
      retentionLabel: "Arabic ready",
      retentionBody: "Open Arabic learning for a short step.",
      retentionRisk: "clear",
      dueCount: 0,
      masteredCount: 0,
    },
    travel: { enabled: false, completionPercent: 0 },
  };
}

function context(
  overrides: Partial<HomeAIContextInput> = {},
  extras = createDefaultHomeAIContextExtras(),
): HomeAIContext {
  const input: HomeAIContextInput = {
    now: new Date("2026-07-05T12:00:00Z"),
    locationLabel: "London",
    hijriDateLabel: "20 Muharram 1448",
    nextPrayerName: "Asr",
    nextPrayerTimeLabel: "5:30 PM",
    minutesToNextPrayer: 330,
    dailyActionsCompleted: 0,
    dailyActionsTotal: 3,
    streakDays: 4,
    dailyPlanStreak: 4,
    quran: null,
    weather: null,
    dailyJourney: null,
    personalPlan: null,
    customGoals: [],
    recentMedia: null,
    subscriptionMode: "free",
    extras,
    ...overrides,
  };
  const activeGoalCategories = input.customGoals
    .filter((goal) => goal.enabled)
    .map((goal) => goal.category);
  const userMode = input.extras.travel.enabled
    ? "traveller"
    : activeGoalCategories.includes("quran") ||
        (input.quran?.totalVersesRead || 0) > 0
      ? "quran_learner"
      : "balanced";

  return {
    ...input,
    userMode,
    contextSummary: "Release-check context",
    safeSignals: [],
    activeGoalCategories,
    primaryJourneyAction: input.dailyJourney?.primaryAction || null,
  };
}

const prayerPlan = buildHomeGuidancePlan(
  context({ minutesToNextPrayer: 10 }),
  null,
);
assert.equal(prayerPlan.main.id, "prayer-window");
assert.equal(prayerPlan.main.priority, "critical");

const quranPlan = buildHomeGuidancePlan(
  context({
    quran: {
      surahName: "Al-Baqarah",
      verse: 24,
      totalVersesRead: 120,
      totalPercentage: 2,
      recentDailyPace: 12,
      estimatedCompletionLabel: "17 months",
      paceConfidence: "established",
    },
    customGoals: [
      {
        id: "quran",
        category: "quran",
        label: "Quran",
        enabled: true,
        targetPerWeek: 7,
        createdAt: "2026-07-01T00:00:00Z",
      },
    ],
  }),
  null,
);
assert.equal(quranPlan.main.id, "quran-next");
assert.match(quranPlan.main.body, /12 per active day/);

const v3Plan = buildHomeGuidancePlan(
  context({
    v3Nudge: {
      title: "Continue your Quran rhythm",
      body: "Return to the ayah you saved and keep today’s session small.",
      category: "quran",
      priority: "high",
      actionRoute: "QuranReader",
      actionParams: { surahNumber: 2, initialVerse: 24 },
    },
  }),
  null,
);
assert.equal(
  v3Plan.main.id,
  "v3-quran",
  "The active V3 recommendation should reach the compact Home card",
);

const liveDhuhrNudge = selectLiveRelevantV3Nudge(
  [
    { id: "prayer_fajr_now", title: "Fajr Time" },
    { id: "dhikr_morning", title: "Morning Adhkar" },
  ],
  { nextPrayerKey: "dhuhr", minutesToNextPrayer: 446 },
);
assert.equal(
  liveDhuhrNudge?.id,
  "dhikr_morning",
  "A stale fallback Fajr window must not override the live local prayer window",
);

const urgentPrayerWindow = buildHomeGuidancePlan(
  context({ minutesToNextPrayer: 8 }, createDefaultHomeAIContextExtras()),
  null,
);
assert.equal(
  urgentPrayerWindow.main.id,
  "prayer-window",
  "An urgent prayer window must win the primary slot",
);

const feedback: HomeAIFeedbackState = {
  version: 1,
  updatedAt: new Date().toISOString(),
  categoryWeights: { quran: -30 },
  records: {
    "quran-next": {
      key: "quran-next",
      category: "quran",
      helpfulCount: 0,
      notNowCount: 0,
      showLessCount: 1,
      lastFeedback: "show_less",
      lastFeedbackAt: new Date().toISOString(),
    },
  },
};
const reranked = buildHomeGuidancePlan(
  context({
    quran: {
      totalVersesRead: 120,
      recentDailyPace: 12,
      estimatedCompletionLabel: "17 months",
    },
  }),
  feedback,
);
assert.notEqual(reranked.main.id, "quran-next");

const repeatableContext = context({
  now: new Date("2026-07-05T12:05:00Z"),
  quran: {
    surah: 2,
    surahName: "Al-Baqarah",
    verse: 24,
    totalVersesRead: 120,
    totalPercentage: 2,
  },
  customGoals: [
    {
      id: "quran",
      category: "quran",
      label: "Quran",
      enabled: true,
      targetPerWeek: 7,
      createdAt: "2026-07-01T00:00:00Z",
    },
  ],
  v3Nudge: {
    id: "quran_return",
    title: "Continue your Quran rhythm",
    body: "Return to the ayah you saved and keep today’s session small.",
    category: "quran",
    priority: "high",
    actionRoute: "QuranReader",
  },
});
const firstRepeatablePlan = buildHomeGuidancePlan(repeatableContext, null);
assert.equal(firstRepeatablePlan.main.id, "v3-quran_return");
const recentImpression: HomeAIFeedbackState = {
  version: 1,
  updatedAt: "2026-07-05T12:04:00Z",
  categoryWeights: {},
  records: {},
  impressions: [
    {
      recommendationId: firstRepeatablePlan.main.id,
      category: firstRepeatablePlan.main.category,
      contextFingerprint:
        buildHomeGuidanceContextFingerprint(repeatableContext),
      shownAt: "2026-07-05T12:04:00Z",
    },
  ],
};
const rotatedPlan = buildHomeGuidancePlan(repeatableContext, recentImpression);
assert.notEqual(
  rotatedPlan.main.id,
  firstRepeatablePlan.main.id,
  "A recently shown non-critical card should yield to another relevant action",
);

const criticalContext = context({
  now: new Date("2026-07-05T12:05:00Z"),
  minutesToNextPrayer: 10,
});
const criticalRepeat = buildHomeGuidancePlan(criticalContext, {
  version: 1,
  updatedAt: "2026-07-05T12:04:00Z",
  categoryWeights: {},
  records: {},
  impressions: [
    {
      recommendationId: "prayer-window",
      category: "prayer",
      contextFingerprint: buildHomeGuidanceContextFingerprint(criticalContext),
      shownAt: "2026-07-05T12:04:00Z",
    },
  ],
});
assert.equal(
  criticalRepeat.main.id,
  "prayer-window",
  "Critical prayer guidance must remain eligible even when recently shown",
);

const stableFingerprint = buildHomeGuidanceContextFingerprint(
  context({ now: new Date("2026-07-05T12:05:00Z") }),
);
assert.equal(
  stableFingerprint,
  buildHomeGuidanceContextFingerprint(
    context({ now: new Date("2026-07-05T12:09:00Z") }),
  ),
  "Minute-by-minute clock drift must not trigger a paid AI request",
);
const changedActionContext = context({
  now: new Date("2026-07-05T12:09:00Z"),
  dailyActionsCompleted: 1,
});
assert.notEqual(
  stableFingerprint,
  buildHomeGuidanceContextFingerprint(changedActionContext),
  "A completed action must invalidate stale guidance",
);
assert.notEqual(
  buildHomeGuidanceRequestKey(repeatableContext, firstRepeatablePlan.main.id),
  buildHomeGuidanceRequestKey(
    { ...repeatableContext, nextPrayerName: "Maghrib" },
    firstRepeatablePlan.main.id,
  ),
  "Paid guidance must refresh when material prayer context changes",
);

const briefing = buildPersonalIntelligenceBriefing({
  plan: quranPlan,
  tier: "free",
});
assert.equal(briefing.primaryAction.routeName, "QuranReader");
assert.equal(briefing.modelMode, "on_device");
assert.equal(briefing.modelLabel, "Free · on device");
assert.match(briefing.capabilityLabel, /ranked privately on this device/i);
assert.ok(briefing.evidence.length <= 2);

console.log(
  "Home intelligence ranking check passed: urgency, Quran pace, travel, feedback, shown-message diversity, material context refresh, and controlled actions.",
);
