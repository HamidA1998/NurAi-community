#!/usr/bin/env tsx

import {
  ARABIC_LEARNING_PROGRESS_TOTALS,
  buildArabicReviewRecoveryPlan,
  buildArabicReviewRetentionSummary,
  buildArabicStreakCarePlan,
  createDefaultArabicLearningProgress,
  getArabicLocalDateKey,
  getArabicLearningProgressScore,
  getArabicReviewScheduleStats,
  getDueArabicReviewItems,
  registerArabicPractice,
  registerArabicPracticeOnce,
  scheduleArabicReviewItem,
} from "../client/services/arabicLearningProgressService";
import { buildArabicDailyCoachPlan } from "../client/services/arabicDailyCoachPlanService";
import {
  buildArabicTeacherReviewPacketShareText,
  buildArabicWeeklyMasteryPlan,
} from "../client/services/arabicWeeklyMasteryPlanService";

function dateKeyAfter(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getArabicLocalDateKey(date);
}

function dateFromKey(key: string): Date {
  return new Date(`${key}T12:00:00.000Z`);
}

function assertCase(condition: boolean, message: string, failures: string[]) {
  if (!condition) failures.push(message);
}

const failures: string[] = [];

const defaultProgress = createDefaultArabicLearningProgress();
assertCase(
  getDueArabicReviewItems(defaultProgress).length === 0,
  "new Arabic progress should start with no due review items",
  failures,
);
assertCase(
  Object.keys(defaultProgress.conversationRoundCounts).length === 0 &&
    Object.keys(defaultProgress.conversationRoundStrongCounts).length === 0,
  "new Arabic progress should start with no completed conversation rounds",
  failures,
);
assertCase(
  ARABIC_LEARNING_PROGRESS_TOTALS.dialogues === 20,
  "Arabic dialogue total should match the full dialogue curriculum",
  failures,
);

const roundProgress = getArabicLearningProgressScore(
  {
    ...defaultProgress,
    conversationRoundCounts: { masjid: 1 },
    conversationRoundStrongCounts: { masjid: 1 },
  },
  ARABIC_LEARNING_PROGRESS_TOTALS,
);
assertCase(
  roundProgress.dialogues > 0,
  "completed conversation rounds should contribute to dialogue progress",
  failures,
);

const dictationListenProgress = getArabicLearningProgressScore(
  {
    ...defaultProgress,
    audioListenCounts: { "dictation-listen:masjid:0": 3 },
  },
  ARABIC_LEARNING_PROGRESS_TOTALS,
);
assertCase(
  dictationListenProgress.dialogues > 0,
  "dictation listening should contribute to dialogue progress",
  failures,
);

const firstLetterAward = registerArabicPracticeOnce(
  defaultProgress,
  4,
  "letter:0",
);
const duplicateLetterAward = registerArabicPracticeOnce(
  firstLetterAward,
  4,
  "letter:0",
);
assertCase(
  duplicateLetterAward.xp === firstLetterAward.xp,
  "lifetime Arabic practice awards should not add XP twice for the same key",
  failures,
);

const firstDailyAward = registerArabicPracticeOnce(
  defaultProgress,
  8,
  "daily-review:sounds",
  "daily",
);
const duplicateDailyAward = registerArabicPracticeOnce(
  firstDailyAward,
  8,
  "daily-review:sounds",
  "daily",
);
assertCase(
  duplicateDailyAward.xp === firstDailyAward.xp,
  "daily Arabic practice awards should not add XP twice on the same day",
  failures,
);

const newStreakCarePlan = buildArabicStreakCarePlan(defaultProgress);
assertCase(
  newStreakCarePlan.statusLabel === "Gentle restart" &&
    newStreakCarePlan.steps.length === 4 &&
    newStreakCarePlan.boundaryLabel.includes("does not certify fluency"),
  "Arabic streak care should start new learners with a gentle restart and certification boundary",
  failures,
);

const todayPracticeProgress = registerArabicPractice(defaultProgress, 5);
const protectedStreakCarePlan = buildArabicStreakCarePlan(
  todayPracticeProgress,
);
assertCase(
  protectedStreakCarePlan.statusLabel === "Protected today" &&
    protectedStreakCarePlan.proofLabel.includes("protected today") &&
    protectedStreakCarePlan.steps.find((step) => step.id === "today-proof")
      ?.complete === true,
  "Arabic streak care should show when today's practice proof protects the streak",
  failures,
);

const firstPassProgress = scheduleArabicReviewItem(defaultProgress, {
  key: "word:sabr",
  kind: "word",
  title: "صبر / sabr",
  quality: "good",
});
const firstPassItem = firstPassProgress.reviewSchedule["word:sabr"];

assertCase(
  !!firstPassItem,
  "good review should create a schedule item",
  failures,
);
assertCase(
  firstPassItem?.intervalDays === 2,
  "first good review should schedule a two-day interval",
  failures,
);
assertCase(
  firstPassItem?.dueAt === dateKeyAfter(2),
  "first good review should be due in two days",
  failures,
);
assertCase(
  getDueArabicReviewItems(firstPassProgress).length === 0,
  "future scheduled items should not appear in today's due queue",
  failures,
);
assertCase(
  getDueArabicReviewItems(firstPassProgress, dateFromKey(firstPassItem.dueAt))
    .length === 1,
  "scheduled items should appear when their due date arrives",
  failures,
);

const dueRetentionSummary = buildArabicReviewRetentionSummary(
  firstPassProgress,
  dateFromKey(firstPassItem.dueAt),
);
assertCase(
  dueRetentionSummary.retentionRisk === "due_today",
  "retention summary should flag reviews due today",
  failures,
);
assertCase(
  dueRetentionSummary.recallProofLabel.includes("1 due"),
  "retention summary should expose a recall proof label",
  failures,
);

const overdueRetentionSummary = buildArabicReviewRetentionSummary(
  firstPassProgress,
  dateFromKey(dateKeyAfter(3)),
);
assertCase(
  overdueRetentionSummary.retentionRisk === "overdue" &&
    overdueRetentionSummary.overdueCount === 1,
  "retention summary should flag overdue Arabic reviews",
  failures,
);
const overdueRecoveryPlan = buildArabicReviewRecoveryPlan(
  firstPassProgress,
  dateFromKey(dateKeyAfter(3)),
);
assertCase(
  overdueRecoveryPlan.statusLabel === "Recovery needed" &&
    overdueRecoveryPlan.steps.length === 4,
  "review recovery plan should create a four-step overdue recovery protocol",
  failures,
);
assertCase(
  overdueRecoveryPlan.prompt.includes("recall-before-reveal"),
  "review recovery plan should preserve recall-before-reveal coaching",
  failures,
);

const lapseProgress = scheduleArabicReviewItem(firstPassProgress, {
  key: "word:sabr",
  kind: "word",
  title: "صبر / sabr",
  quality: "again",
});
const lapseItem = lapseProgress.reviewSchedule["word:sabr"];

assertCase(
  lapseItem?.intervalDays === 1,
  "again review should reset to a one-day interval",
  failures,
);
assertCase(
  lapseItem?.dueAt === dateKeyAfter(1),
  "again review should be due tomorrow",
  failures,
);
assertCase(
  lapseItem?.lapseCount === 1,
  "again review should increment lapse count",
  failures,
);
assertCase(
  lapseItem?.reviewCount === 2,
  "rescheduling should preserve and increment review count",
  failures,
);

const lapseRetentionSummary = buildArabicReviewRetentionSummary(lapseProgress);
assertCase(
  lapseRetentionSummary.retentionRisk === "lapse_watch" &&
    lapseRetentionSummary.lapseCount === 1,
  "retention summary should flag lapse watch before the next due date",
  failures,
);
const lapseRecoveryPlan = buildArabicReviewRecoveryPlan(lapseProgress);
assertCase(
  lapseRecoveryPlan.statusLabel === "Repair the lapse" &&
    lapseRecoveryPlan.guardrail.includes("recalls before revealing"),
  "review recovery plan should guard lapse repair with recall-before-reveal proof",
  failures,
);

const secondItemProgress = scheduleArabicReviewItem(lapseProgress, {
  key: "dialogue:greeting:turn-1",
  kind: "dialogue",
  title: "Greeting turn one",
  quality: "easy",
});
const statsTomorrow = getArabicReviewScheduleStats(
  secondItemProgress,
  dateFromKey(dateKeyAfter(1)),
);

assertCase(
  statsTomorrow.scheduledCount === 2,
  "review stats should count all scheduled Arabic items",
  failures,
);
assertCase(
  statsTomorrow.dueCount === 1,
  "review stats should count only items due by the selected day",
  failures,
);
assertCase(
  statsTomorrow.nextDueAt === dateKeyAfter(1),
  "review stats should expose the nearest due date",
  failures,
);

const dailyCoachPlan = buildArabicDailyCoachPlan({
  progress: defaultProgress,
  dailyFluencyProgress: 0,
  placementAverageScore: 0,
  completedReviewCount: 0,
  totalReviewTasks: 5,
  dueReviewCount: 0,
  scheduledReviewCount: 0,
  selectedDialogueTitle: "Prayer Time",
  conversationRoundProgress: 0,
  dailyWordArabic: "نور",
  dailyWordTransliteration: "nur",
  dailyWordMeaningAttempts: 0,
  sentenceBuilderAttempts: 0,
});

assertCase(
  dailyCoachPlan.steps.length === 5,
  "Arabic daily coach should build a five-step lesson loop",
  failures,
);
assertCase(
  dailyCoachPlan.nextStepId === "listen",
  "new Arabic learners should start the daily coach with listening",
  failures,
);
assertCase(
  dailyCoachPlan.totalEstimatedMinutes === 13,
  "Arabic daily coach should expose a concrete daily timebox",
  failures,
);
assertCase(
  dailyCoachPlan.steps.every(
    (step) =>
      step.estimatedMinutes > 0 &&
      step.modeLabel.length > 0 &&
      step.freePracticeHint.length > 0,
  ),
  "every Arabic daily coach step should expose minutes, mode, and free practice hint",
  failures,
);
assertCase(
  dailyCoachPlan.prompt.includes("about 13 minutes"),
  "Arabic daily coach prompt should preserve the timebox",
  failures,
);

const weeklyMasteryPlan = buildArabicWeeklyMasteryPlan({
  selectedDialogueTitle: "Prayer Time",
  dailyWordArabic: "نور",
  dailyWordTransliteration: "nur",
  currentArabicLevelTitle: "Sound Starter",
  nextArabicLevelTitle: "Dialogue Builder",
  dailyFluencyProgress: 20,
  conversationRoundProgress: 10,
  placementAverageScore: 25,
  portfolioAverage: 18,
  completedReviewCount: 0,
  totalReviewTasks: 5,
  dueReviewCount: 2,
  scheduledReviewCount: 4,
  sentenceBuilderAttempts: 0,
  wordMeaningAttempts: 0,
  streakDays: 1,
  date: new Date("2026-06-01T12:00:00.000Z"),
});

assertCase(
  weeklyMasteryPlan.sessionHandoff.statusLabel === "Review before new Arabic" &&
    weeklyMasteryPlan.sessionHandoff.checklist.length === 4,
  "Arabic weekly mastery should expose a concrete session handoff when review is due",
  failures,
);
assertCase(
  weeklyMasteryPlan.sessionHandoff.coachPrompt.includes(
    "recall before reveal",
  ) &&
    weeklyMasteryPlan.sessionHandoff.claimBoundary.includes(
      "qualified teacher should assess",
    ),
  "Arabic weekly session handoff should preserve recall-first and public-claim boundaries",
  failures,
);
assertCase(
  weeklyMasteryPlan.teacherReviewPacket.checklist.length === 5 &&
    weeklyMasteryPlan.teacherReviewPacket.learnerClaimBoundary.includes(
      "NurAI does not certify pronunciation",
    ),
  "Arabic weekly mastery should expose a human teacher review packet without certification overclaims",
  failures,
);
assertCase(
  weeklyMasteryPlan.teacherReviewPacket.nextTeacherActionLabel ===
    "Clear due review first",
  "Arabic teacher review packet should clear due review before teacher submission",
  failures,
);
const teacherPacketShareText = buildArabicTeacherReviewPacketShareText(
  weeklyMasteryPlan.teacherReviewPacket,
  {
    selectedDialogueTitle: "Prayer Time",
    currentArabicLevelTitle: "Sound Starter",
    nextArabicLevelTitle: "Dialogue Builder",
    activeFocusLabel: weeklyMasteryPlan.activeFocus.label,
  },
);
assertCase(
  teacherPacketShareText.includes("Arabic Practice Summary") &&
    teacherPacketShareText.includes("Checklist") &&
    teacherPacketShareText.includes("human Arabic teacher") &&
    teacherPacketShareText.includes("not a certificate"),
  "Arabic teacher review packet share text should be human-review ready without certification overclaims",
  failures,
);

if (failures.length) {
  console.error("Arabic spaced-review check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Arabic spaced-review check passed: scheduling, due queue, lapse tracking, and review stats verified.",
);
