import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";

export interface NurAIUserProfile {
  gender: "brother" | "sister" | null;
  madhab: "hanafi" | "maliki" | "shafii" | "hanbali" | "jafari" | null;
  knowledgeLevel: "beginner" | "intermediate" | "advanced";
  arabicLevel: "none" | "basic" | "intermediate" | "fluent";

  quranReadingHabit: {
    averageDailyMinutes: number;
    preferredTime: string;
    currentSurah: number;
    completionPercentage: number;
    readingSince: string;
    favouriteSurahs: number[];
    surahsStarted: number;
    surahsCompleted: number;
  };

  streakData: {
    currentStreak: number;
    longestStreak: number;
    lastCompletedDate: string;
  };

  engagementPatterns: {
    appOpenTimes: string[];
    mostUsedFeatures: { feature: string; count: number }[];
    lastActive: string;
    totalDaysActive: number;
  };

  cycleData: {
    isTracking: boolean;
    averageCycleLength: number;
    currentPhase: "haidh" | "purity" | "istihadha" | "nifas" | null;
  } | null;

  prayerConsistency: number;
  lastProfileUpdate: string;
}

const PROFILE_KEY = "nurai_user_profile";
const OPEN_LOG_KEY = "nurai_app_opens";
const FEATURE_USE_KEY = "nurai_feature_usage";

function getDefaultProfile(): NurAIUserProfile {
  return {
    gender: null,
    madhab: null,
    knowledgeLevel: "beginner",
    arabicLevel: "none",
    quranReadingHabit: {
      averageDailyMinutes: 0,
      preferredTime: "random",
      currentSurah: 0,
      completionPercentage: 0,
      readingSince: "",
      favouriteSurahs: [],
      surahsStarted: 0,
      surahsCompleted: 0,
    },
    streakData: {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: "",
    },
    engagementPatterns: {
      appOpenTimes: [],
      mostUsedFeatures: [],
      lastActive: "",
      totalDaysActive: 0,
    },
    cycleData: null,
    prayerConsistency: 0,
    lastProfileUpdate: new Date().toISOString(),
  };
}

export async function loadProfile(): Promise<NurAIUserProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...getDefaultProfile(), ...parsed };
    }
  } catch {}
  return getDefaultProfile();
}

export async function saveProfile(profile: NurAIUserProfile): Promise<void> {
  try {
    profile.lastProfileUpdate = new Date().toISOString();
    await syncedSetItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {}
}

export async function buildProfileFromExistingData(): Promise<NurAIUserProfile> {
  const profile = await loadProfile();

  try {
    const quranProgressRaw = await AsyncStorage.getItem(
      "quran-all-surah-progress",
    );
    if (quranProgressRaw) {
      const quranData = JSON.parse(quranProgressRaw);
      const surahs = quranData.surahProgress || {};
      const entries = Object.values(surahs) as any[];

      if (entries.length > 0) {
        let totalVersesRead = 0;
        const sortedByTime = [...entries].sort(
          (a: any, b: any) => b.lastReadAt - a.lastReadAt,
        );
        const sortedByVisits = [...entries].sort(
          (a: any, b: any) => b.maxVerseRead - a.maxVerseRead,
        );

        entries.forEach((e: any) => {
          totalVersesRead += e.maxVerseRead || 0;
        });

        profile.quranReadingHabit.currentSurah =
          sortedByTime[0]?.surahNumber || 0;
        profile.quranReadingHabit.completionPercentage = Math.min(
          Math.round((totalVersesRead / 6236) * 100),
          100,
        );
        profile.quranReadingHabit.surahsStarted = entries.length;
        profile.quranReadingHabit.surahsCompleted = entries.filter(
          (e: any) => e.percentage >= 100,
        ).length;
        profile.quranReadingHabit.favouriteSurahs = sortedByVisits
          .slice(0, 5)
          .map((e: any) => e.surahNumber);

        if (sortedByTime.length > 0) {
          const earliest = [...entries].sort(
            (a: any, b: any) => a.lastReadAt - b.lastReadAt,
          );
          profile.quranReadingHabit.readingSince = new Date(
            earliest[0].lastReadAt,
          ).toISOString();
        }

        if (profile.quranReadingHabit.completionPercentage > 30) {
          profile.knowledgeLevel = "intermediate";
        }
        if (profile.quranReadingHabit.surahsCompleted > 20) {
          profile.knowledgeLevel = "advanced";
        }
      }
    }
  } catch {}

  try {
    const streakRaw = await AsyncStorage.getItem("daily_plan_streak");
    if (streakRaw) {
      const streakData = JSON.parse(streakRaw);
      profile.streakData.currentStreak = streakData.current || 0;
      profile.streakData.longestStreak = Math.max(
        streakData.current || 0,
        streakData.longest || 0,
        profile.streakData.longestStreak,
      );
      profile.streakData.lastCompletedDate = streakData.lastDate || "";
    }
  } catch {}

  try {
    const whConsentRaw = await AsyncStorage.getItem("womens_health_consent");
    if (whConsentRaw === "true" || whConsentRaw === "granted") {
      profile.gender = "sister";
      profile.cycleData = {
        isTracking: true,
        averageCycleLength: 28,
        currentPhase: null,
      };

      const madhabRaw = await AsyncStorage.getItem("womens_health_madhab");
      if (madhabRaw) {
        profile.madhab = madhabRaw as any;
      }
    }
  } catch {}

  try {
    const themeRaw = await AsyncStorage.getItem("nurai_theme_preference");
    if (themeRaw === "prayer") {
      if (profile.knowledgeLevel === "beginner") {
        profile.knowledgeLevel = "intermediate";
      }
    }
  } catch {}

  await saveProfile(profile);
  return profile;
}

export async function logAppOpen(): Promise<void> {
  try {
    const now = new Date().toISOString();
    const raw = await AsyncStorage.getItem(OPEN_LOG_KEY);
    let opens: string[] = [];
    if (raw) {
      opens = JSON.parse(raw);
    }
    opens.push(now);
    if (opens.length > 100) {
      opens = opens.slice(-100);
    }
    await syncedSetItem(OPEN_LOG_KEY, JSON.stringify(opens));
  } catch {}
}

export async function logFeatureUse(feature: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(FEATURE_USE_KEY);
    let usage: Record<string, number> = {};
    if (raw) {
      usage = JSON.parse(raw);
    }
    usage[feature] = (usage[feature] || 0) + 1;
    await syncedSetItem(FEATURE_USE_KEY, JSON.stringify(usage));
  } catch {}
}

export async function getFeatureUsage(): Promise<
  { feature: string; count: number }[]
> {
  try {
    const raw = await AsyncStorage.getItem(FEATURE_USE_KEY);
    if (raw) {
      const usage = JSON.parse(raw);
      return Object.entries(usage)
        .map(([feature, count]) => ({ feature, count: count as number }))
        .sort((a, b) => b.count - a.count);
    }
  } catch {}
  return [];
}
