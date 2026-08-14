import type { HomeAIContext } from "@/services/homeAIContextService";

export type PersonalGuideWeeklyReviewTone =
  | "progress"
  | "forming"
  | "attention";

export type PersonalGuideWeeklyReviewSignal = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: PersonalGuideWeeklyReviewTone;
  icon: "check-circle" | "activity" | "book-open" | "heart" | "alert-circle";
};

export type PersonalGuideWeeklyReview = {
  title: string;
  summary: string;
  signals: PersonalGuideWeeklyReviewSignal[];
  contextLines: string[];
  prompt: string;
  sourceNote: string;
  recordedDays: number;
  windowLabel: string;
};

function boundedContextLine(
  label: string,
  values: (string | number | null | undefined)[],
) {
  const value = values
    .filter((item) => item != null && String(item).trim())
    .map((item) => String(item).replace(/\s+/g, " ").trim())
    .join("; ");
  return `${label}: ${value || "not recorded"}`.slice(0, 180);
}

export function buildPersonalGuideContextLines(
  context: HomeAIContext,
  review: PersonalGuideWeeklyReview,
): string[] {
  const health = context.extras.health;
  const notifications = context.extras.notifications;
  const women = context.extras.womensHealth;
  return [
    boundedContextLine("Current moment", [
      `${context.locationLabel}; ${context.hijriDateLabel}`,
      `${context.nextPrayerName} at ${context.nextPrayerTimeLabel}`,
      context.minutesToNextPrayer != null
        ? `${context.minutesToNextPrayer} minutes away`
        : null,
    ]),
    boundedContextLine("Daily rhythm", [
      `${context.dailyActionsCompleted}/${context.dailyActionsTotal} essentials today`,
      `${context.streakDays} garden days`,
      `${context.dailyPlanStreak} plan days`,
      context.primaryJourneyAction?.title,
    ]),
    boundedContextLine("Quran", [
      context.quran?.surahName
        ? `${context.quran.surahName} ${context.quran.verse || ""}`.trim()
        : null,
      context.quran?.totalVersesRead
        ? `${context.quran.totalVersesRead} ayahs saved`
        : "no saved position",
      context.quran?.recentDailyPace
        ? `${context.quran.recentDailyPace} ayahs per active day`
        : null,
    ]),
    boundedContextLine("Arabic and learning", [
      context.extras.arabic.retentionLabel,
      `${context.extras.arabic.dueCount} due`,
      `${context.extras.arabic.masteredCount} mastered`,
      context.activeGoalCategories.join(", "),
    ]),
    boundedContextLine("Journey and saved work", [
      context.extras.travel.enabled
        ? `travel ${context.extras.travel.destination || "active"} ${context.extras.travel.completionPercent}%`
        : "travel inactive",
      `${context.extras.savedAnswers.total} saved AI answers`,
      context.extras.latestSavedAnswerTitle,
      context.personalPlanContextLine || context.personalPlan?.aiContextLine,
    ]),
    boundedContextLine("Wellbeing and weather", [
      health?.metrics?.hasData ? health.metrics.summaryLine : null,
      health?.pendingCount != null
        ? `${health.pendingCount} care steps pending`
        : null,
      women?.enabled
        ? `women's health ${women.cyclePhaseLabel || "active"}`
        : null,
      context.weather
        ? `${context.weather.conditionLabel}, ${Math.round(context.weather.temperatureC)}C`
        : null,
    ]),
    boundedContextLine("Dhikr and reminders", [
      context.extras.tasbeeh
        ? `${context.extras.tasbeeh.dhikrLabel} ${context.extras.tasbeeh.todayTotal} today`
        : null,
      notifications
        ? `${notifications.enabledPrayerReminderCount} prayer reminders`
        : null,
      context.recentMedia
        ? `unfinished ${context.recentMedia.kind}: ${context.recentMedia.title}`
        : null,
    ]),
    boundedContextLine("Goals and guidance", [
      context.activeGoalCategories.join(", "),
      context.v3Nudge?.title,
      context.primaryJourneyAction?.reason,
    ]),
    ...review.contextLines.slice(0, 4),
    "Privacy boundary: use only these recorded or authorised signals; do not infer hidden activity, journal text, or rulings.",
  ].slice(0, 13);
}

function localDateKey(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    .toISOString()
    .slice(0, 10);
}

function recentDateKeys(now: Date): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(now.getDate() - (6 - index));
    return localDateKey(date);
  });
}

function uniqueRecordedDays(checkedDays: string[], weekKeys: string[]) {
  const week = new Set(weekKeys);
  return new Set(
    checkedDays
      .map((value) => value.trim().slice(0, 10))
      .filter((value) => week.has(value)),
  ).size;
}

export function buildPersonalGuideWeeklyReview({
  now,
  checkedDays,
  context,
}: {
  now: Date;
  checkedDays: string[];
  context: HomeAIContext;
}): PersonalGuideWeeklyReview {
  const weekKeys = recentDateKeys(now);
  const recordedDays = uniqueRecordedDays(checkedDays, weekKeys);
  const today = context.dailyActionsCompleted;
  const totalToday = context.dailyActionsTotal;
  const quranCount = context.quran?.totalVersesRead || 0;
  const health = context.extras.health;
  const signals: PersonalGuideWeeklyReviewSignal[] = [
    {
      id: "rhythm",
      label: "Daily rhythm",
      value: `${recordedDays}/7 days recorded`,
      detail:
        recordedDays > 0
          ? "Garden activity recorded in the last seven days."
          : "No garden activity is recorded in this seven-day window yet.",
      tone:
        recordedDays >= 5
          ? "progress"
          : recordedDays > 0
            ? "forming"
            : "attention",
      icon: recordedDays > 0 ? "activity" : "alert-circle",
    },
    {
      id: "today",
      label: "Today",
      value:
        totalToday > 0
          ? `${today}/${totalToday} essentials`
          : "No daily essentials set",
      detail:
        totalToday > 0
          ? "A current snapshot, included so the review stays grounded in what is visible."
          : "Add a small daily plan when you are ready.",
      tone:
        totalToday > 0 && today >= totalToday
          ? "progress"
          : today > 0
            ? "forming"
            : "attention",
      icon: today > 0 ? "check-circle" : "alert-circle",
    },
    {
      id: "quran",
      label: "Quran",
      value: quranCount > 0 ? `${quranCount} ayahs saved` : "No saved position",
      detail: context.quran?.surahName
        ? `Saved position: ${context.quran.surahName}${context.quran.verse ? ` ${context.quran.verse}` : ""}.`
        : "This is saved Quran progress, not a claim about every reading session.",
      tone: quranCount > 0 ? "progress" : "forming",
      icon: "book-open",
    },
  ];

  if (health?.available) {
    const healthValue = health.metrics?.hasData
      ? health.metrics.summaryLine || "Today's readings available"
      : health.pendingCount > 0
        ? `${health.pendingCount} care step${health.pendingCount === 1 ? "" : "s"} pending`
        : "No authorised reading today";
    signals.push({
      id: "wellbeing",
      label: "Wellbeing",
      value: healthValue,
      detail: health.metrics?.hasData
        ? "Only the authorised summary already available to NurAI is shown."
        : "Health context is optional and is never treated as a diagnosis.",
      tone: health.metrics?.hasData
        ? "progress"
        : health.pendingCount > 0
          ? "forming"
          : "attention",
      icon: health.metrics?.hasData ? "heart" : "alert-circle",
    });
  }

  const summary =
    recordedDays === 0
      ? "There is not enough recorded activity for a meaningful week comparison yet. Start with one small action and NurAI will keep future reviews grounded in what you choose to record."
      : recordedDays >= 5
        ? "Your recorded rhythm was present on most days. Keep the next week focused on one repeatable action rather than adding pressure."
        : "Some activity was recorded this week. A smaller, repeatable routine may make the next week easier to see. ";

  return {
    title: "Your week in view",
    summary: summary.trim(),
    signals: signals.slice(0, 4),
    contextLines: [
      `Weekly review window: ${weekKeys[0]} to ${weekKeys[weekKeys.length - 1]}.`,
      `Recorded rhythm: ${recordedDays} of 7 days had garden activity.`,
      `Current daily essentials: ${today}/${totalToday}.`,
      quranCount > 0
        ? `Saved Quran progress: ${quranCount} ayahs; position ${context.quran?.surahName || "available"}.`
        : "Saved Quran progress: no position visible in this review.",
      health?.available
        ? `Wellbeing context: ${health.metrics?.hasData ? health.metrics.summaryLine || "authorised summary available" : `${health.pendingCount} care step${health.pendingCount === 1 ? "" : "s"} pending`}.`
        : "Wellbeing context: not attached to this review.",
    ],
    prompt:
      "Review my recorded week using the weekly signals attached to this conversation. Separate recorded progress, unfinished areas, and one gentle focus for next week. Do not judge my faith, invent missing activity, or give a personal religious or medical ruling.",
    sourceNote:
      "Based on activity NurAI has recorded or that you have authorised. Missing activity is not treated as failure.",
    recordedDays,
    windowLabel: "Last 7 days",
  };
}
