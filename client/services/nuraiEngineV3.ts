import {
  loadProfileV3,
  saveProfileV3,
  recordAppOpenV3,
  recordFeatureUseV3,
  recordNudgeResponseV3,
  NurAIUserProfileV3,
} from "./nuraiProfileV3";
import { NurAIPatternDetectorV3 } from "./nuraiPatternsV3";
import {
  getHijriDate,
  isSunnahFastingDay,
  isRamadan,
  getUpcomingEvents,
  getDaysToRamadan,
  loadHijriAdjustment,
  HijriDate,
} from "./nuraiHijriEngine";
import {
  getEmotionalGreeting,
  updateEmotionalState,
} from "./nuraiEmotionEngine";
import {
  NurAIRuleEngineV3,
  NurAINudge,
  computePrayerWindow,
} from "./nuraiRuleEngineV3";
import {
  getContextForEmotion,
  getDailyMotivation,
  getQuranContext,
  QuranContext,
  DailyMotivation,
  TOTAL_QURAN_CONTEXTS,
  TOTAL_MOTIVATIONS,
} from "./nuraiContentDBV3";

export interface NurAIV3State {
  profile: NurAIUserProfileV3;
  nudges: NurAINudge[];
  greeting: string;
  hijriDate: HijriDate;
  dailyMotivation: DailyMotivation;
  quranInsight: QuranContext;
  isRamadan: boolean;
  daysToRamadan: number;
  sunnahFasting: { isSunnah: boolean; reason: string };
  upcomingEvents: ReturnType<typeof getUpcomingEvents>;
  overallScore: number;
  strongestArea: string;
  weakestArea: string;
  momentum: string;
  weeklyInsight: ReturnType<
    typeof NurAIPatternDetectorV3.generateWeeklyInsight
  >;
  engineVersion: string;
  lastComputedAt: string;
}

let cachedState: NurAIV3State | null = null;
let lastComputeDate: string = "";

export function invalidateV3Cache(): void {
  cachedState = null;
  lastComputeDate = "";
}

export async function initNurAIV3(): Promise<NurAIV3State> {
  try {
    await loadHijriAdjustment();
    const profile = await recordAppOpenV3();
    return computeState(profile);
  } catch (e) {
    console.warn("NurAI V3: init error", e);
    return fallbackState();
  }
}

export async function refreshNurAIV3(): Promise<NurAIV3State> {
  try {
    // A refresh can follow a newly recorded activity event. Do not let the
    // short-lived state cache keep yesterday's recommendation alive.
    invalidateV3Cache();
    const profile = await loadProfileV3();
    return computeState(profile);
  } catch {
    return cachedState || fallbackState();
  }
}

async function computeState(
  profile: NurAIUserProfileV3,
): Promise<NurAIV3State> {
  const td = new Date().toISOString().split("T")[0];
  if (
    cachedState &&
    lastComputeDate === td &&
    Date.now() - new Date(cachedState.lastComputedAt).getTime() < 60000
  ) {
    return cachedState;
  }

  const emotionalState = updateEmotionalState(profile);
  profile.emotionalContext.previousState =
    profile.emotionalContext.currentState;
  profile.emotionalContext.currentState = emotionalState;

  const personality = NurAIPatternDetectorV3.detectPersonalityType(profile);
  profile.personalityType = personality.type;
  profile.personalityConfidence = personality.confidence;

  const sleep = NurAIPatternDetectorV3.inferSleepPattern(
    profile.sleepData.lastActiveHours,
  );
  profile.sleepData.estimatedBedtime = sleep.bedtime;
  profile.sleepData.estimatedWakeTime = sleep.wakeTime;
  profile.sleepData.isNightOwl = sleep.isNightOwl;
  profile.sleepData.isFajrRiser = sleep.isFajrRiser;
  profile.sleepData.confidence = sleep.confidence;

  const engagement = NurAIPatternDetectorV3.detectEngagementTrend(
    profile.appOpenTimes,
  );
  profile.emotionalContext.engagementTrend = engagement;

  const fuse = NurAIPatternDetectorV3.fuseSignals(profile);

  const prayerWindow = computePrayerWindow();
  const nudges = await NurAIRuleEngineV3.evaluate(profile, prayerWindow);
  const hijri = getHijriDate();
  const greeting = getEmotionalGreeting(emotionalState, profile.name);
  const motivation = getDailyMotivation();
  const insight = getContextForEmotion(emotionalState);
  const weekly = NurAIPatternDetectorV3.generateWeeklyInsight(profile);

  // The return greeting/nudge is useful once, on the session that detected a
  // genuine multi-day gap. Persist the neutral state immediately so every
  // later Home refresh can respond to the user's real activity.
  if (emotionalState === "returning") {
    profile.emotionalContext.previousState = "returning";
    profile.emotionalContext.currentState = "neutral";
  }

  saveProfileV3(profile).catch(() => {});

  const state: NurAIV3State = {
    profile,
    nudges,
    greeting,
    hijriDate: hijri,
    dailyMotivation: motivation,
    quranInsight: insight,
    isRamadan: isRamadan(),
    daysToRamadan: getDaysToRamadan(),
    sunnahFasting: isSunnahFastingDay(),
    upcomingEvents: getUpcomingEvents(30),
    overallScore: fuse.overallScore,
    strongestArea: fuse.strongestArea,
    weakestArea: fuse.weakestArea,
    momentum: fuse.momentum,
    weeklyInsight: weekly,
    engineVersion: `3.0.0 (${TOTAL_QURAN_CONTEXTS}ctx/${TOTAL_MOTIVATIONS}mot)`,
    lastComputedAt: new Date().toISOString(),
  };

  cachedState = state;
  lastComputeDate = td;
  return state;
}

function fallbackState(): NurAIV3State {
  return {
    profile: {} as NurAIUserProfileV3,
    nudges: [],
    greeting: "Assalamu alaikum",
    hijriDate: getHijriDate(),
    dailyMotivation: getDailyMotivation(),
    quranInsight: getContextForEmotion("neutral"),
    isRamadan: false,
    daysToRamadan: 0,
    sunnahFasting: { isSunnah: false, reason: "" },
    upcomingEvents: [],
    overallScore: 0,
    strongestArea: "",
    weakestArea: "",
    momentum: "steady",
    weeklyInsight: null,
    engineVersion: "3.0.0-fallback",
    lastComputedAt: new Date().toISOString(),
  };
}

export async function trackFeature(feature: string): Promise<void> {
  await recordFeatureUseV3(feature);
}

export async function trackNudgeResponse(
  nudgeId: string,
  responded: boolean,
): Promise<void> {
  await recordNudgeResponseV3(nudgeId, responded);
}

export function getQuranVerseContext(
  surah: number,
  ayah: number,
): QuranContext | null {
  return getQuranContext(surah, ayah);
}

export { suggestHabit } from "./nuraiHabitEngine";
