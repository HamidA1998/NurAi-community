import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const PROFILE_KEY = "@nurai_profile_v3";
const V1_PROFILE_KEY = "@nurai_profile";
const SENSITIVE_KEY = "@nurai_sensitive_v3";

let SecureStore: any = null;

async function getSecureStore() {
  if (SecureStore !== null) return SecureStore;
  if (Platform.OS === "web") {
    SecureStore = false;
    return false;
  }
  try {
    SecureStore = await import("expo-secure-store");
    return SecureStore;
  } catch {
    SecureStore = false;
    return false;
  }
}

interface SensitiveData {
  cycleData?: NurAIUserProfileV3["cycleData"];
  revertData?: NurAIUserProfileV3["revertData"];
  isRevert?: boolean;
}

async function loadSensitive(): Promise<SensitiveData> {
  try {
    const ss = await getSecureStore();
    if (ss) {
      const v = await ss.getItemAsync(SENSITIVE_KEY);
      return v ? JSON.parse(v) : {};
    }
    const v = await AsyncStorage.getItem(SENSITIVE_KEY);
    return v ? JSON.parse(v) : {};
  } catch {
    return {};
  }
}

async function saveSensitive(data: SensitiveData): Promise<void> {
  try {
    const json = JSON.stringify(data);
    const ss = await getSecureStore();
    if (ss) {
      await ss.setItemAsync(SENSITIVE_KEY, json);
    } else {
      await AsyncStorage.setItem(SENSITIVE_KEY, json);
    }
  } catch {}
}

export type EmotionalState =
  | "neutral"
  | "contemplative"
  | "struggling"
  | "celebrating"
  | "anxious"
  | "grieving"
  | "motivated"
  | "coasting"
  | "returning"
  | "exploring"
  | "deepening"
  | "ramadan_mode";

export type PersonalityType =
  | "encourager"
  | "challenger"
  | "scholar"
  | "feeler";

export interface NurAIUserProfileV3 {
  name?: string;
  gender: "brother" | "sister" | null;
  madhab: "hanafi" | "maliki" | "shafii" | "hanbali" | "jafari" | null;
  knowledgeLevel: "beginner" | "intermediate" | "advanced";
  arabicLevel: "none" | "basic" | "intermediate" | "fluent";
  country?: string;
  language: string;

  personalityType: PersonalityType;
  personalityConfidence: number;
  personalitySignals: {
    celebrationDismissRate: number;
    challengeDismissRate: number;
    knowledgeDismissRate: number;
    storyEngagementRate: number;
  };

  isRevert: boolean;
  revertData?: {
    shahadaDate: string | null;
    isExploring: boolean;
    previousReligion?: string;
    daysSinceShahada: number;
    currentPhase: "foundations" | "growth" | "deepening" | "flourishing";
    completedMilestones: string[];
    supportNetwork: "strong" | "some" | "weak" | "none";
    familySituation: "supportive" | "neutral" | "hostile" | "unknown";
    biggestChallenge?: string;
    motivationForIslam?: string;
  };

  prayerConsistency: number;
  prayerLogs: {
    date: string;
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
  }[];
  prayerPatterns: {
    [prayer: string]: {
      averageDelayMinutes: number;
      missRate: number;
      bestDay: number;
    };
  };
  prayerStreaks: {
    currentAllFive: number;
    longestAllFive: number;
    currentFajr: number;
    longestFajr: number;
  };

  quranReadingHabit: {
    averageDailyMinutes: number;
    preferredTime: string;
    currentSurah: number;
    currentAyah: number;
    completionPercentage: number;
    favouriteSurahs: number[];
    totalPagesRead: number;
    totalVersesRead: number;
    readingSpeed: "slow" | "medium" | "fast";
    prefersTafsir: boolean;
    prefersAudio: boolean;
  };
  quranToday: number[];
  quranSessionHistory: {
    date: string;
    surah: number;
    duration: number;
    versesRead: number;
  }[];

  streakData: {
    currentStreak: number;
    longestStreak: number;
    strongestHabit: string;
    weakestHabit: string;
    lastCompletedDate: string;
    nearMissCount: number;
  };

  habitData: {
    habits: {
      id: string;
      name: string;
      cue: string;
      routine: string;
      completionRate: number;
      streak: number;
      bestStreak: number;
      lastCompleted?: string;
      createdAt: string;
    }[];
    habitFormationStage: "awareness" | "action" | "automation";
  };

  completedLessons: string[];
  quizScores: { topic: string; score: number; date: string }[];
  areasOfInterest: string[];
  learningPath: {
    currentPathway: string;
    currentLevel: number;
    learningSpeed: "slow" | "steady" | "fast";
    preferredStyle: "reading" | "audio" | "interactive" | "mixed";
  };

  vocabulary: {
    wordsLearned: string[];
    wordsInProgress: string[];
    nextReviewDates: { word: string; date: string }[];
  };

  cycleData?: {
    cycles: { startDate: string; length: number; duration: number }[];
    averageCycleLength: number;
    regularity: "regular" | "irregular" | "unknown";
    currentPhase: "haidh" | "purity" | "istihadha" | "nifas" | null;
    missedRamadanFasts: number;
    qadaFastsCompleted: number;
  };

  hasanatLog: { deed: string; date: string; points: number }[];
  totalHasanat: number;

  dhikrData: {
    totalCount: number;
    dailyAverage: number;
    preferredDhikr: string[];
    sessions: { date: string; type: string; count: number; duration: number }[];
  };

  appOpenTimes: string[];
  mostUsedFeatures: { feature: string; count: number; lastUsed: string }[];
  lastActive: string;
  totalDaysActive: number;
  searchHistory: string[];
  featureDiscovery: string[];

  sessionData: {
    currentSessionStart?: string;
    averageSessionDuration: number;
    sessionsToday: number;
    totalSessions: number;
    depthScore: number;
  };

  emotionalContext: {
    currentState: EmotionalState;
    previousState: EmotionalState;
    stateHistory: { state: EmotionalState; date: string; trigger: string }[];
    engagementTrend: "growing" | "stable" | "declining";
    respondsToEncouragement: boolean;
    respondsToAccountability: boolean;
    prefersGentle: boolean;
  };

  sleepData: {
    estimatedBedtime: string;
    estimatedWakeTime: string;
    confidence: number;
    isNightOwl: boolean;
    isFajrRiser: boolean;
    lastActiveHours: number[];
  };

  notificationData: {
    optimalHour: number;
    responseRate: number;
    dismissRate: number;
    fatigueLevel: "fresh" | "normal" | "tired";
    history: { date: string; type: string; responded: boolean }[];
  };

  prefersDetailedExplanations: boolean;
  prefersArabicFirst: boolean;
  prefersQuietReminders: boolean;

  privateMode: {
    enabled: boolean;
    stealthNotifications: boolean;
    quickHideEnabled: boolean;
  };

  familyData?: {
    role: "parent" | "child" | "spouse" | "individual";
    sharedStreakEnabled: boolean;
    kidsMode: boolean;
    kidsAgeGroup?: "4-6" | "7-9" | "10-12";
  };

  profileVersion: number;
  createdAt: string;
}

const DEFAULT_PROFILE: NurAIUserProfileV3 = {
  gender: null,
  madhab: null,
  knowledgeLevel: "beginner",
  arabicLevel: "none",
  language: "en",
  personalityType: "encourager",
  personalityConfidence: 0,
  personalitySignals: {
    celebrationDismissRate: 0,
    challengeDismissRate: 0,
    knowledgeDismissRate: 0,
    storyEngagementRate: 0,
  },
  isRevert: false,
  prayerConsistency: 0,
  prayerLogs: [],
  prayerPatterns: {},
  prayerStreaks: {
    currentAllFive: 0,
    longestAllFive: 0,
    currentFajr: 0,
    longestFajr: 0,
  },
  quranReadingHabit: {
    averageDailyMinutes: 0,
    preferredTime: "any",
    currentSurah: 1,
    currentAyah: 1,
    completionPercentage: 0,
    favouriteSurahs: [],
    totalPagesRead: 0,
    totalVersesRead: 0,
    readingSpeed: "medium",
    prefersTafsir: false,
    prefersAudio: false,
  },
  quranToday: [],
  quranSessionHistory: [],
  streakData: {
    currentStreak: 0,
    longestStreak: 0,
    strongestHabit: "none",
    weakestHabit: "none",
    lastCompletedDate: "",
    nearMissCount: 0,
  },
  habitData: { habits: [], habitFormationStage: "awareness" },
  completedLessons: [],
  quizScores: [],
  areasOfInterest: [],
  learningPath: {
    currentPathway: "general",
    currentLevel: 1,
    learningSpeed: "steady",
    preferredStyle: "mixed",
  },
  vocabulary: { wordsLearned: [], wordsInProgress: [], nextReviewDates: [] },
  hasanatLog: [],
  totalHasanat: 0,
  dhikrData: {
    totalCount: 0,
    dailyAverage: 0,
    preferredDhikr: [],
    sessions: [],
  },
  appOpenTimes: [],
  mostUsedFeatures: [],
  lastActive: new Date().toISOString(),
  totalDaysActive: 0,
  searchHistory: [],
  featureDiscovery: [],
  sessionData: {
    averageSessionDuration: 0,
    sessionsToday: 0,
    totalSessions: 0,
    depthScore: 0,
  },
  emotionalContext: {
    currentState: "neutral",
    previousState: "neutral",
    stateHistory: [],
    engagementTrend: "stable",
    respondsToEncouragement: true,
    respondsToAccountability: false,
    prefersGentle: false,
  },
  sleepData: {
    estimatedBedtime: "23:00",
    estimatedWakeTime: "06:00",
    confidence: 0,
    isNightOwl: false,
    isFajrRiser: false,
    lastActiveHours: [],
  },
  notificationData: {
    optimalHour: 9,
    responseRate: 0.5,
    dismissRate: 0.5,
    fatigueLevel: "fresh",
    history: [],
  },
  prefersDetailedExplanations: false,
  prefersArabicFirst: false,
  prefersQuietReminders: false,
  privateMode: {
    enabled: false,
    stealthNotifications: false,
    quickHideEnabled: false,
  },
  profileVersion: 3,
  createdAt: new Date().toISOString(),
};

export async function loadProfileV3(): Promise<NurAIUserProfileV3> {
  try {
    const stored = await AsyncStorage.getItem(PROFILE_KEY);
    let profile: NurAIUserProfileV3;
    if (stored) {
      const parsed = JSON.parse(stored);
      profile =
        parsed.profileVersion === 3
          ? { ...DEFAULT_PROFILE, ...parsed }
          : migrateProfile(parsed);
    } else {
      const v1 = await AsyncStorage.getItem(V1_PROFILE_KEY);
      profile = v1 ? migrateProfile(JSON.parse(v1)) : { ...DEFAULT_PROFILE };
    }
    const sensitive = await loadSensitive();
    if (sensitive.cycleData) profile.cycleData = sensitive.cycleData;
    if (sensitive.revertData) profile.revertData = sensitive.revertData;
    if (sensitive.isRevert !== undefined) profile.isRevert = sensitive.isRevert;
    return profile;
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function migrateProfile(old: any): NurAIUserProfileV3 {
  return {
    ...DEFAULT_PROFILE,
    ...old,
    profileVersion: 3,
    personalityType: old.personalityType || "encourager",
    personalityConfidence: 0,
    personalitySignals:
      old.personalitySignals || DEFAULT_PROFILE.personalitySignals,
    prayerStreaks: old.prayerStreaks || DEFAULT_PROFILE.prayerStreaks,
    habitData: old.habitData || DEFAULT_PROFILE.habitData,
    dhikrData: old.dhikrData || DEFAULT_PROFILE.dhikrData,
    sessionData: old.sessionData || DEFAULT_PROFILE.sessionData,
    sleepData: old.sleepData || DEFAULT_PROFILE.sleepData,
    notificationData: old.notificationData || DEFAULT_PROFILE.notificationData,
    featureDiscovery: old.featureDiscovery || [],
    quranSessionHistory: old.quranSessionHistory || [],
    emotionalContext: {
      ...DEFAULT_PROFILE.emotionalContext,
      ...(old.emotionalContext || {}),
    },
  };
}

export async function saveProfileV3(
  profile: NurAIUserProfileV3,
): Promise<void> {
  try {
    const sensitive: SensitiveData = {};
    if (profile.cycleData) sensitive.cycleData = profile.cycleData;
    if (profile.revertData) sensitive.revertData = profile.revertData;
    if (profile.isRevert) sensitive.isRevert = profile.isRevert;
    if (Object.keys(sensitive).length > 0) await saveSensitive(sensitive);

    const t = { ...profile };
    delete (t as any).cycleData;
    delete (t as any).revertData;
    t.appOpenTimes = (t.appOpenTimes || []).slice(-200);
    t.prayerLogs = (t.prayerLogs || []).slice(-180);
    t.hasanatLog = (t.hasanatLog || []).slice(-500);
    t.quranSessionHistory = (t.quranSessionHistory || []).slice(-100);
    t.emotionalContext.stateHistory = (
      t.emotionalContext?.stateHistory || []
    ).slice(-50);
    t.notificationData.history = (t.notificationData?.history || []).slice(
      -100,
    );
    t.sleepData.lastActiveHours = (t.sleepData?.lastActiveHours || []).slice(
      -30,
    );
    t.dhikrData.sessions = (t.dhikrData?.sessions || []).slice(-90);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(t));
  } catch (e) {
    console.warn("NurAI V3: Failed to save profile", e);
  }
}

export async function updateProfileV3(
  updates: Partial<NurAIUserProfileV3>,
): Promise<NurAIUserProfileV3> {
  const current = await loadProfileV3();
  const updated = { ...current };
  for (const key of Object.keys(updates) as (keyof NurAIUserProfileV3)[]) {
    const val = (updates as any)[key];
    if (
      val &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      (updated as any)[key] &&
      typeof (updated as any)[key] === "object"
    ) {
      (updated as any)[key] = { ...(updated as any)[key], ...val };
    } else {
      (updated as any)[key] = val;
    }
  }
  await saveProfileV3(updated);
  return updated;
}

export async function recordAppOpenV3(): Promise<NurAIUserProfileV3> {
  const profile = await loadProfileV3();
  const now = new Date();
  const nowISO = now.toISOString();
  const today = nowISO.split("T")[0];

  profile.appOpenTimes = [...(profile.appOpenTimes || []), nowISO].slice(-200);
  profile.lastActive = nowISO;

  const lastDate =
    profile.appOpenTimes.length > 1
      ? profile.appOpenTimes[profile.appOpenTimes.length - 2]?.split("T")[0]
      : null;
  if (lastDate !== today) {
    profile.totalDaysActive = (profile.totalDaysActive || 0) + 1;
    profile.sessionData.sessionsToday = 1;
  } else {
    profile.sessionData.sessionsToday =
      (profile.sessionData.sessionsToday || 0) + 1;
  }

  profile.sessionData.totalSessions =
    (profile.sessionData.totalSessions || 0) + 1;
  profile.sessionData.currentSessionStart = nowISO;

  const hour = now.getHours();
  profile.sleepData.lastActiveHours = [
    ...(profile.sleepData.lastActiveHours || []),
    hour,
  ].slice(-720);

  const daysAway = lastDate
    ? Math.floor((now.getTime() - new Date(lastDate).getTime()) / 86400000)
    : 0;
  if (daysAway >= 3) {
    profile.emotionalContext.previousState =
      profile.emotionalContext.currentState;
    profile.emotionalContext.currentState = "returning";
    profile.emotionalContext.stateHistory = [
      ...(profile.emotionalContext.stateHistory || []),
      {
        state: "returning" as EmotionalState,
        date: nowISO,
        trigger: `${daysAway} days away`,
      },
    ].slice(-50);
  } else if (profile.emotionalContext.currentState === "returning") {
    // Returning is an acknowledgement for the session that detected the gap,
    // not a lasting label. Clear stale values left by older builds so a normal
    // visit cannot keep producing the same welcome-back card.
    profile.emotionalContext.previousState = "returning";
    profile.emotionalContext.currentState = "neutral";
  }

  await saveProfileV3(profile);
  return profile;
}

export async function recordFeatureUseV3(feature: string): Promise<void> {
  try {
    const profile = await loadProfileV3();
    const existing = (profile.mostUsedFeatures || []).find(
      (f) => f.feature === feature,
    );
    if (existing) {
      existing.count++;
      existing.lastUsed = new Date().toISOString();
    } else {
      profile.mostUsedFeatures = [
        ...(profile.mostUsedFeatures || []),
        { feature, count: 1, lastUsed: new Date().toISOString() },
      ];
    }
    if (!(profile.featureDiscovery || []).includes(feature)) {
      profile.featureDiscovery = [...(profile.featureDiscovery || []), feature];
    }
    await saveProfileV3(profile);
  } catch {}
}

export async function recordNudgeResponseV3(
  nudgeType: string,
  responded: boolean,
): Promise<void> {
  try {
    const profile = await loadProfileV3();
    const alpha = 0.1;

    if (nudgeType.includes("celebration"))
      profile.personalitySignals.celebrationDismissRate =
        alpha * (responded ? 0 : 1) +
        (1 - alpha) * (profile.personalitySignals.celebrationDismissRate || 0);
    if (nudgeType.includes("challenge") || nudgeType.includes("streak"))
      profile.personalitySignals.challengeDismissRate =
        alpha * (responded ? 0 : 1) +
        (1 - alpha) * (profile.personalitySignals.challengeDismissRate || 0);
    if (nudgeType.includes("teaching") || nudgeType.includes("scholar"))
      profile.personalitySignals.knowledgeDismissRate =
        alpha * (responded ? 0 : 1) +
        (1 - alpha) * (profile.personalitySignals.knowledgeDismissRate || 0);
    if (nudgeType.includes("story") || nudgeType.includes("revert")) {
      profile.personalitySignals.storyEngagementRate =
        alpha * (responded ? 1 : 0) +
        (1 - alpha) * (profile.personalitySignals.storyEngagementRate || 0);
    }

    profile.notificationData.history = [
      ...(profile.notificationData.history || []).slice(-100),
      { date: new Date().toISOString(), type: nudgeType, responded },
    ];
    profile.notificationData.responseRate =
      alpha * (responded ? 1 : 0) +
      (1 - alpha) * (profile.notificationData.responseRate || 0.5);
    profile.notificationData.dismissRate =
      1 - profile.notificationData.responseRate;
    const recent = (profile.notificationData.history || []).slice(-10);
    const dismisses = recent.filter((h) => !h.responded).length;
    profile.notificationData.fatigueLevel =
      dismisses >= 8 ? "tired" : dismisses >= 5 ? "normal" : "fresh";
    await saveProfileV3(profile);
  } catch {}
}
