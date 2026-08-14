import { NurAIUserProfile, buildProfileFromExistingData } from "./nuraiProfile";
import quranContexts from "../data/quranContexts.json";

export type NudgeType =
  | "insight"
  | "reminder"
  | "celebration"
  | "protection"
  | "teaching";
export type NudgePriority = "low" | "medium" | "high" | "urgent";

export interface NurAINudge {
  id: string;
  type: NudgeType;
  title: string;
  body: string;
  icon: string;
  priority: NudgePriority;
  actions?: { label: string; screen?: string }[];
  dismissable: boolean;
  context: string;
  expiresAt?: number;
}

export interface QuranVerseContext {
  verseKey: string;
  contextType: "revelation" | "tafsir" | "hadith" | "practical" | "linguistic";
  content: string;
  source: string;
  relevanceTag?: string;
}

export interface QuranRecommendation {
  type: "timely" | "protection" | "gentle_restart" | "continue" | "milestone";
  surah: number;
  surahName?: string;
  reason: string;
}

const MAX_NUDGES_PER_SESSION = 3;
const MIN_NUDGE_INTERVAL_MS = 5 * 60 * 1000;

let lastNudgeTime = 0;
let sessionNudgeCount = 0;

function generateId(): string {
  return `nudge_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function getCurrentPrayerPeriod(): string {
  const hour = new Date().getHours();
  if (hour >= 3 && hour < 5) return "tahajjud";
  if (hour >= 5 && hour < 7) return "fajr";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 15) return "dhuhr";
  if (hour >= 15 && hour < 17) return "asr";
  if (hour >= 17 && hour < 19) return "maghrib";
  if (hour >= 19 && hour < 21) return "isha";
  return "night";
}

function isQuietHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 23 || hour < 4;
}

function canShowNudge(priority: NudgePriority): boolean {
  if (priority === "urgent") return true;
  if (isQuietHours()) return false;
  if (sessionNudgeCount >= MAX_NUDGES_PER_SESSION) return false;
  const now = Date.now();
  if (now - lastNudgeTime < MIN_NUDGE_INTERVAL_MS) return false;
  return true;
}

function markNudgeShown(): void {
  sessionNudgeCount++;
  lastNudgeTime = Date.now();
}

export function resetSession(): void {
  sessionNudgeCount = 0;
  lastNudgeTime = 0;
}

export function getQuranRecommendation(
  profile: NurAIUserProfile,
): QuranRecommendation {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const prayerPeriod = getCurrentPrayerPeriod();

  if (dayOfWeek === 5) {
    return {
      type: "timely",
      surah: 18,
      surahName: "Al-Kahf",
      reason: "It's Friday \u2014 revisit Surah Al-Kahf with calm focus.",
    };
  }

  if (prayerPeriod === "isha" || prayerPeriod === "night") {
    return {
      type: "protection",
      surah: 67,
      surahName: "Al-Mulk",
      reason: "A short night reading can help you close the day with Quran.",
    };
  }

  if (prayerPeriod === "fajr" || prayerPeriod === "tahajjud") {
    return {
      type: "timely",
      surah: 36,
      surahName: "Ya-Sin",
      reason: "The early hours are a calm time for reflection and Quran.",
    };
  }

  if (profile.streakData.currentStreak === 0) {
    return {
      type: "gentle_restart",
      surah: 112,
      surahName: "Al-Ikhlas",
      reason:
        "Just 4 verses to restart your journey. It equals a third of the Quran.",
    };
  }

  if (profile.quranReadingHabit.completionPercentage >= 50) {
    return {
      type: "milestone",
      surah: profile.quranReadingHabit.currentSurah || 1,
      reason: `You're ${profile.quranReadingHabit.completionPercentage}% through the Quran \u2014 keep going, you're past the halfway mark`,
    };
  }

  if (profile.quranReadingHabit.currentSurah > 0) {
    return {
      type: "continue",
      surah: profile.quranReadingHabit.currentSurah,
      reason: `Pick up where you left off \u2014 you're ${profile.quranReadingHabit.completionPercentage}% through`,
    };
  }

  return {
    type: "gentle_restart",
    surah: 1,
    surahName: "Al-Fatiha",
    reason: "Begin with the Opening \u2014 the greatest surah in the Quran",
  };
}

export function getVerseContext(
  surahNumber: number,
  verseNumber: number,
): QuranVerseContext | null {
  const key = `${surahNumber}:${verseNumber}`;
  const contexts = (quranContexts as Record<string, QuranVerseContext[]>)[key];
  if (!contexts || contexts.length === 0) return null;

  const prayerPeriod = getCurrentPrayerPeriod();

  const timeRelevant = contexts.find((c) => {
    if (!c.relevanceTag) return false;
    if (
      c.relevanceTag === "night_reading" &&
      (prayerPeriod === "isha" ||
        prayerPeriod === "night" ||
        prayerPeriod === "tahajjud")
    )
      return true;
    if (
      c.relevanceTag === "morning_reading" &&
      (prayerPeriod === "fajr" || prayerPeriod === "morning")
    )
      return true;
    if (c.relevanceTag === "time_based") return true;
    return false;
  });

  return timeRelevant || contexts[0];
}

export function getHomeInsight(profile: NurAIUserProfile): NurAINudge | null {
  if (!canShowNudge("medium")) return null;

  const prayerPeriod = getCurrentPrayerPeriod();
  const today = new Date();
  const dayOfWeek = today.getDay();

  if (profile.streakData.currentStreak >= 7) {
    markNudgeShown();
    const weeks = Math.floor(profile.streakData.currentStreak / 7);
    return {
      id: generateId(),
      type: "celebration",
      title: `${profile.streakData.currentStreak}-day streak`,
      body:
        weeks >= 4
          ? `MashaAllah \u2014 ${weeks} weeks of consistency. Small, steady deeds are easier to protect and grow.`
          : `Week ${weeks} of your streak \u2014 consistency is what counts. Keep it alive.`,
      icon: "zap",
      priority: "medium",
      dismissable: true,
      context: "home",
      actions: [{ label: "View Streaks", screen: "StreakGarden" }],
    };
  }

  if (dayOfWeek === 5) {
    markNudgeShown();
    return {
      id: generateId(),
      type: "reminder",
      title: "Jumu'ah Mubarak",
      body: "Send abundant salawat today and revisit Surah Al-Kahf with calm focus.",
      icon: "book-open",
      priority: "medium",
      dismissable: true,
      context: "home",
      actions: [{ label: "Read Al-Kahf", screen: "QuranReader" }],
    };
  }

  if (prayerPeriod === "tahajjud") {
    markNudgeShown();
    return {
      id: generateId(),
      type: "teaching",
      title: "The Last Third of the Night",
      body: "Allah descends to the lowest heaven now and says: 'Who is calling upon Me that I may answer?' Ask Him for anything.",
      icon: "star",
      priority: "medium",
      dismissable: true,
      context: "home",
    };
  }

  if (
    profile.quranReadingHabit.surahsStarted > 0 &&
    profile.quranReadingHabit.completionPercentage > 0
  ) {
    markNudgeShown();
    return {
      id: generateId(),
      type: "insight",
      title: "Your Quran Journey",
      body: `You've read through ${profile.quranReadingHabit.surahsStarted} surahs and completed ${profile.quranReadingHabit.completionPercentage}% of the Quran. Every verse is a light on the Day of Judgement.`,
      icon: "book-open",
      priority: "low",
      dismissable: true,
      context: "home",
      actions: [{ label: "Continue Reading", screen: "Quran" }],
    };
  }

  if (prayerPeriod === "fajr") {
    markNudgeShown();
    return {
      id: generateId(),
      type: "reminder",
      title: "Morning Adhkar",
      body: "Start your day with morning remembrance and a quiet intention.",
      icon: "sun",
      priority: "low",
      dismissable: true,
      context: "home",
    };
  }

  markNudgeShown();
  const dailyInsights = [
    {
      title: "Dhikr Reminder",
      body: "SubhanAllah, Alhamdulillah, Allahu Akbar \u2014 33 times each after every prayer. It takes less than 5 minutes.",
      icon: "repeat",
    },
    {
      title: "Water of Zamzam",
      body: "Drink with gratitude and make dua sincerely with every sip.",
      icon: "droplet",
    },
    {
      title: "Charity Multiplied",
      body: "Even a smile is charity. Look for one small good deed today \u2014 it weighs more than you think.",
      icon: "heart",
    },
    {
      title: "The Power of Istighfar",
      body: "Istighfar keeps the heart humble and returns you to Allah throughout the day.",
      icon: "refresh-cw",
    },
    {
      title: "Patience in Islam",
      body: "Verily, with hardship comes ease. Whatever you are going through, Allah has a plan for you.",
      icon: "shield",
    },
  ];
  const idx = today.getDate() % dailyInsights.length;
  const insight = dailyInsights[idx];

  return {
    id: generateId(),
    type: "insight",
    title: insight.title,
    body: insight.body,
    icon: insight.icon,
    priority: "low",
    dismissable: true,
    context: "home",
  };
}

export function getStreakMessage(profile: NurAIUserProfile): {
  message: string;
  gardenState: "empty" | "sprouting" | "growing" | "flourishing";
} {
  const streak = profile.streakData.currentStreak;

  if (streak === 0) {
    return {
      message:
        "Every garden starts with one seed. Complete one task today to plant yours.",
      gardenState: "empty",
    };
  }
  if (streak <= 7) {
    return {
      message: `${streak} day${streak > 1 ? "s" : ""} \u2014 your garden is sprouting. The first week is the hardest.`,
      gardenState: "sprouting",
    };
  }
  if (streak <= 30) {
    return {
      message: `${streak} days of consistency \u2014 your garden is growing beautifully.`,
      gardenState: "growing",
    };
  }
  return {
    message: `${streak} days \u2014 SubhanAllah. Your steady rhythm is becoming part of your life.`,
    gardenState: "flourishing",
  };
}

export function getSmartGreeting(
  profile: NurAIUserProfile,
  displayName?: string,
): { greeting: string; subtitle: string } {
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  const streak = profile.streakData.currentStreak;
  const name = displayName ? `, ${displayName}` : "";

  let greeting = "";
  let subtitle = "";

  if (hour >= 3 && hour < 5) {
    greeting = `As-salamu alaykum${name}`;
    subtitle =
      "The last part of the night is a quiet time for dua and reflection.";
  } else if (hour >= 5 && hour < 7) {
    greeting = `Good morning${name}`;
    subtitle = "Start your day with Bismillah and morning adhkar.";
  } else if (hour >= 7 && hour < 12) {
    greeting = `Good morning${name}`;
    subtitle = "A new day, a new chance to earn barakah.";
  } else if (hour >= 12 && hour < 15) {
    greeting = `As-salamu alaykum${name}`;
    subtitle =
      "Guard the Dhuhr prayer \u2014 it's the middle pillar of the day.";
  } else if (hour >= 15 && hour < 17) {
    greeting = `Good afternoon${name}`;
    subtitle =
      "Guard the Asr prayer carefully \u2014 the angels of day and night witness it.";
  } else if (hour >= 17 && hour < 19) {
    greeting = `Good evening${name}`;
    subtitle = "End the day with evening adhkar, gratitude, and calm.";
  } else if (hour >= 19 && hour < 21) {
    greeting = `Good evening${name}`;
    subtitle = "End your day with gratitude and reflection.";
  } else {
    greeting = `As-salamu alaykum${name}`;
    subtitle = "The night is for rest and remembrance.";
  }

  if (dayOfWeek === 5 && hour >= 5 && hour < 15) {
    subtitle = "Jumu'ah Mubarak \u2014 send salawat upon the Prophet \uFDFA.";
  }

  if (streak >= 30) {
    subtitle += ` (${streak}-day streak \u2014 MashaAllah)`;
  } else if (streak >= 7) {
    subtitle += ` (Week ${Math.floor(streak / 7)} streak)`;
  }

  return { greeting, subtitle };
}

export async function initializeEngine(): Promise<NurAIUserProfile> {
  const profile = await buildProfileFromExistingData();
  resetSession();
  return profile;
}

export interface TasbeehInsight {
  type: "milestone" | "suggestion" | "encouragement";
  title: string;
  body: string;
  icon: string;
}

export function getTasbeehInsight(count: number): TasbeehInsight | null {
  const prayerPeriod = getCurrentPrayerPeriod();

  if (count === 100) {
    return {
      type: "milestone",
      title: "100 counts",
      body: "A full 100 counts completed. Let the words settle in your heart.",
      icon: "award",
    };
  }
  if (count === 500) {
    return {
      type: "milestone",
      title: "500 counts",
      body: "MashaAllah \u2014 your dedication is building mountains of hasanat. Keep going.",
      icon: "trending-up",
    };
  }
  if (count === 1000) {
    return {
      type: "milestone",
      title: "1,000 counts",
      body: "SubhanAllah \u2014 a thousand moments of remembrance. Keep it sincere and steady.",
      icon: "star",
    };
  }
  if (count > 0 && count % 33 === 0) {
    return {
      type: "milestone",
      title: `${count} \u2014 Set complete`,
      body: "One set of 33 done. Continue at a pace that keeps your heart present.",
      icon: "check-circle",
    };
  }

  if (count === 0) {
    if (prayerPeriod === "fajr" || prayerPeriod === "morning") {
      return {
        type: "suggestion",
        title: "Morning Dhikr",
        body: "Start with SubhanAllah and let the morning begin with remembrance.",
        icon: "sunrise",
      };
    }
    if (prayerPeriod === "isha" || prayerPeriod === "night") {
      return {
        type: "suggestion",
        title: "Evening Remembrance",
        body: "Try Astaghfirullah before sleep and close the day by returning to Allah.",
        icon: "moon",
      };
    }
    if (prayerPeriod === "tahajjud") {
      return {
        type: "suggestion",
        title: "Night Dhikr",
        body: "La hawla wa la quwwata illa billah \u2014 a treasure from the treasures of Paradise.",
        icon: "star",
      };
    }
    return {
      type: "suggestion",
      title: "Start Your Dhikr",
      body: "SubhanAllahi wa bihamdihi \u2014 light on the tongue, heavy on the scales.",
      icon: "repeat",
    };
  }

  return null;
}

export interface PrayerInsight {
  prayerKey: string;
  type: "pre_prayer" | "post_prayer" | "sunnah";
  title: string;
  body: string;
}

export function getPrayerInsights(): PrayerInsight[] {
  const prayerPeriod = getCurrentPrayerPeriod();
  const insights: PrayerInsight[] = [];

  if (prayerPeriod === "fajr" || prayerPeriod === "morning") {
    insights.push({
      prayerKey: "fajr",
      type: "sunnah",
      title: "Fajr Sunnah",
      body: "The two raka'at of Fajr sunnah are better than the world and everything in it.",
    });
  }

  if (prayerPeriod === "dhuhr") {
    insights.push({
      prayerKey: "dhuhr",
      type: "sunnah",
      title: "Dhuhr Sunnah",
      body: "4 raka'at before and 2 after Dhuhr. Allah builds a house in Jannah for the one who prays 12 sunnah daily.",
    });
  }

  if (prayerPeriod === "asr") {
    insights.push({
      prayerKey: "asr",
      type: "pre_prayer",
      title: "Guard Your Asr",
      body: "Guard the middle prayer (Asr). The angels of day and night witness it.",
    });
  }

  if (prayerPeriod === "maghrib") {
    insights.push({
      prayerKey: "maghrib",
      type: "post_prayer",
      title: "After Maghrib",
      body: "Read evening adhkar after Maghrib for protection through the night.",
    });
  }

  if (prayerPeriod === "isha" || prayerPeriod === "night") {
    insights.push({
      prayerKey: "isha",
      type: "post_prayer",
      title: "Witr Prayer",
      body: "Don't forget Witr before sleeping. Make it the last prayer of your night.",
    });
  }

  insights.push({
    prayerKey: "all",
    type: "post_prayer",
    title: "Post-Prayer Adhkar",
    body: "SubhanAllah 33x, Alhamdulillah 33x, Allahu Akbar 34x after each prayer. A steady post-prayer rhythm.",
  });

  return insights;
}

export function getDuaRecommendation(): {
  categoryName: string;
  reason: string;
  icon: string;
} {
  const prayerPeriod = getCurrentPrayerPeriod();
  const dayOfWeek = new Date().getDay();

  if (prayerPeriod === "fajr" || prayerPeriod === "morning") {
    return {
      categoryName: "Morning",
      reason: "Start your day with morning adhkar and a calm intention.",
      icon: "sunrise",
    };
  }
  if (
    prayerPeriod === "maghrib" ||
    prayerPeriod === "isha" ||
    prayerPeriod === "night"
  ) {
    return {
      categoryName: "Evening",
      reason: "Evening adhkar help you close the day with remembrance.",
      icon: "sunset",
    };
  }
  if (prayerPeriod === "tahajjud") {
    return {
      categoryName: "Prayer",
      reason: "The last part of the night is a quiet time to make dua.",
      icon: "star",
    };
  }
  if (dayOfWeek === 5) {
    return {
      categoryName: "General",
      reason: "Friday is a meaningful day for salawat, Quran, and sincere dua.",
      icon: "heart",
    };
  }
  return {
    categoryName: "Prayer",
    reason:
      "The closest a servant is to Allah is during sujood. Make dua in your prayers.",
    icon: "moon",
  };
}

export interface HasanatInsight {
  title: string;
  body: string;
  icon: string;
  type: "encouragement" | "milestone" | "tip";
}

export function getHasanatInsight(
  totalPoints: number,
  prayersDone: number,
  isFasting: boolean,
): HasanatInsight {
  if (totalPoints >= 200) {
    return {
      title: "Daily Goal Reached",
      body: "MashaAllah! You've hit your 200-point goal. Keep each deed sincere and consistent.",
      icon: "award",
      type: "milestone",
    };
  }
  if (totalPoints >= 100) {
    return {
      title: "Over Halfway",
      body: `${totalPoints} points so far. You're past the halfway mark \u2014 keep the momentum going.`,
      icon: "trending-up",
      type: "encouragement",
    };
  }
  if (prayersDone === 5) {
    return {
      title: "All Prayers Complete",
      body: "All five prayers done \u2014 this is the foundation. Guard this rhythm with gratitude.",
      icon: "check-circle",
      type: "milestone",
    };
  }
  if (isFasting) {
    return {
      title: "Fasting Today",
      body: "You are fasting today. Protect your tongue, energy, and intention.",
      icon: "moon",
      type: "encouragement",
    };
  }
  if (totalPoints === 0) {
    return {
      title: "Every Deed Counts",
      body: "Even a smile is charity. Start with one prayer, one dhikr \u2014 the rest will follow naturally.",
      icon: "heart",
      type: "tip",
    };
  }
  return {
    title: "Keep Building",
    body: `${totalPoints} points earned. Small consistent deeds are more beloved to Allah than large occasional ones.`,
    icon: "layers",
    type: "encouragement",
  };
}

export interface DailyPlanSuggestion {
  id: string;
  title: string;
  icon: string;
  reason: string;
  screen?: string;
}

export function getDailyPlanSuggestions(
  profile: NurAIUserProfile,
): DailyPlanSuggestion[] {
  const suggestions: DailyPlanSuggestion[] = [];
  const dayOfWeek = new Date().getDay();
  const prayerPeriod = getCurrentPrayerPeriod();

  if (dayOfWeek === 5) {
    suggestions.push({
      id: "friday_kahf",
      title: "Read Surah Al-Kahf",
      icon: "book-open",
      reason: "Friday sunnah \u2014 light between two Fridays",
      screen: "QuranReader",
    });
  }

  if (
    profile.quranReadingHabit.currentSurah > 0 &&
    profile.quranReadingHabit.completionPercentage < 100
  ) {
    suggestions.push({
      id: "continue_quran",
      title: "Continue Quran Reading",
      icon: "book",
      reason: `${profile.quranReadingHabit.completionPercentage}% complete \u2014 keep your momentum`,
      screen: "Quran",
    });
  }

  if (profile.streakData.currentStreak === 0) {
    suggestions.push({
      id: "restart_streak",
      title: "Complete daily tasks for a streak",
      icon: "zap",
      reason: "Every garden starts with one seed",
    });
  }

  suggestions.push({
    id: "dhikr_33",
    title: "33x SubhanAllah, Alhamdulillah, Allahu Akbar",
    icon: "repeat",
    reason: "Post-prayer adhkar \u2014 fills the scales",
    screen: "Tasbeeh",
  });

  if (prayerPeriod === "morning" || prayerPeriod === "fajr") {
    suggestions.push({
      id: "morning_adhkar",
      title: "Morning Adhkar",
      icon: "sunrise",
      reason: "Protection and barakah until evening",
      screen: "Duas",
    });
  }

  if (prayerPeriod === "maghrib" || prayerPeriod === "isha") {
    suggestions.push({
      id: "evening_adhkar",
      title: "Evening Adhkar",
      icon: "sunset",
      reason: "Protection through the night",
      screen: "Duas",
    });
  }

  return suggestions.slice(0, 3);
}

export interface WeeklyReflection {
  title: string;
  body: string;
  stats: { label: string; value: string; icon: string }[];
  encouragement: string;
}

export function getWeeklyReflection(
  profile: NurAIUserProfile,
  weeklyHasanat: number[],
): WeeklyReflection {
  const totalWeekPoints = weeklyHasanat.reduce((a, b) => a + b, 0);
  const activeDays = weeklyHasanat.filter((v) => v > 0).length;
  const streak = profile.streakData.currentStreak;

  const stats = [
    {
      label: "Active Days",
      value: `${activeDays}/7`,
      icon: "calendar",
    },
    {
      label: "Week Points",
      value: `${totalWeekPoints}`,
      icon: "star",
    },
    {
      label: "Streak",
      value: `${streak} days`,
      icon: "zap",
    },
  ];

  let encouragement = "";
  if (activeDays >= 6) {
    encouragement =
      "Almost every day this week \u2014 MashaAllah. Consistency is the most beloved deed to Allah.";
  } else if (activeDays >= 4) {
    encouragement =
      "Solid week. A few more active days and you'll have a near-perfect record. You can do it.";
  } else if (activeDays >= 2) {
    encouragement =
      "You showed up this week. Even small efforts count \u2014 aim for one more day next week.";
  } else {
    encouragement =
      "A new week is a fresh start. Set one small goal today and build from there.";
  }

  return {
    title: "Your Week in Review",
    body: `${activeDays} active days this week with ${totalWeekPoints} total hasanat points.`,
    stats,
    encouragement,
  };
}

const PATTERN_KEY = "nurai_activity_pattern";

export interface ActivityPattern {
  weekdayActivity: number[];
  lastAnalyzed: string;
  riskDays: number[];
  strongDays: number[];
}

export async function analyzeActivityPatterns(): Promise<ActivityPattern> {
  try {
    const raw = await (
      await import("@react-native-async-storage/async-storage")
    ).default.getItem(PATTERN_KEY);
    if (raw) {
      const pattern = JSON.parse(raw) as ActivityPattern;
      const lastDate = new Date(pattern.lastAnalyzed);
      const now = new Date();
      if (now.getTime() - lastDate.getTime() < 24 * 60 * 60 * 1000) {
        return pattern;
      }
    }
  } catch {}

  const weekdayActivity = [0, 0, 0, 0, 0, 0, 0];
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

  try {
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const dayOfWeek = d.getDay();
      weekdayCounts[dayOfWeek]++;

      const stored = await AsyncStorage.getItem(`hasanat-${ds}`);
      if (stored) {
        const data = JSON.parse(stored);
        const pts =
          Object.values(data.prayers || {}).filter(Boolean).length * 10 +
          (data.quranPages || 0) * 10 +
          (data.dhikrSessions || 0) * 5 +
          (data.charityActs || 0) * 20 +
          (data.fasting ? 50 : 0) +
          (data.kindnessActs || 0) * 10 +
          (data.learningSessions || 0) * 15;
        if (pts > 0) {
          weekdayActivity[dayOfWeek]++;
        }
      }
    }
  } catch {}

  const rates = weekdayActivity.map((active, i) =>
    weekdayCounts[i] > 0 ? active / weekdayCounts[i] : 0,
  );
  const avgRate = rates.reduce((a, b) => a + b, 0) / 7;
  const riskDays = rates
    .map((r, i) => (r < avgRate * 0.5 && weekdayCounts[i] >= 2 ? i : -1))
    .filter((i) => i >= 0);
  const strongDays = rates
    .map((r, i) => (r > avgRate * 1.3 && weekdayCounts[i] >= 2 ? i : -1))
    .filter((i) => i >= 0);

  const pattern: ActivityPattern = {
    weekdayActivity: rates.map((r) => Math.round(r * 100)),
    lastAnalyzed: new Date().toISOString(),
    riskDays,
    strongDays,
  };

  try {
    const { syncedSetItem } = await import("@/lib/progress-sync");
    await syncedSetItem(PATTERN_KEY, JSON.stringify(pattern));
  } catch {}

  return pattern;
}

export function getPatternNudge(pattern: ActivityPattern): NurAINudge | null {
  if (!canShowNudge("low")) return null;

  const today = new Date().getDay();
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  if (pattern.riskDays.includes(today)) {
    markNudgeShown();
    return {
      id: generateId(),
      type: "protection",
      title: "Stay Consistent Today",
      body: `${dayNames[today]}s tend to be quieter for you. Even one small deed \u2014 a dua, a page of Quran \u2014 keeps your momentum alive.`,
      icon: "shield",
      priority: "medium",
      dismissable: true,
      context: "home",
      actions: [{ label: "Open Tasbeeh", screen: "Tasbeeh" }],
    };
  }

  if (pattern.strongDays.includes(today)) {
    markNudgeShown();
    return {
      id: generateId(),
      type: "celebration",
      title: `${dayNames[today]}s Are Your Best`,
      body: `You tend to be most active on ${dayNames[today]}s. Make the most of this energy \u2014 set a stretch goal today.`,
      icon: "trending-up",
      priority: "low",
      dismissable: true,
      context: "home",
    };
  }

  return null;
}

export interface NameReflection {
  nameIndex: number;
  title: string;
  body: string;
  icon: string;
}

export function getDailyNameReflection(): NameReflection {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const nameIndex = dayOfYear % 99;
  const prayerPeriod = getCurrentPrayerPeriod();

  const reflections: Record<string, string> = {
    morning:
      "Begin your morning reflecting on this Name. Let it shape your intentions for the day.",
    fajr: "As the day begins, carry this Name in your heart through your morning.",
    dhuhr:
      "Midday pause \u2014 reflect on how this attribute of Allah is present in your life right now.",
    asr: "The afternoon is a time of reflection. How does this Name connect to your day so far?",
    maghrib:
      "As the sun sets, contemplate this Name and thank Allah for the blessings of today.",
    isha: "End your day with this Name. Let it be your companion as you prepare for rest.",
    night:
      "The quiet of the night is perfect for deep reflection on Allah's Names.",
    tahajjud:
      "In the stillness of tahajjud, this Name carries special weight. Reflect deeply.",
  };

  return {
    nameIndex,
    title: "Today's Reflection",
    body: reflections[prayerPeriod] || reflections.morning,
    icon: "star",
  };
}

export interface CalendarInsight {
  title: string;
  body: string;
  icon: string;
  eventName?: string;
}

export function getCalendarInsight(
  hijriMonth: number,
  hijriDay: number,
  upcomingEventName?: string,
): CalendarInsight {
  if (hijriMonth === 1 && hijriDay <= 10) {
    return {
      title: "Blessed Days of Muharram",
      body:
        hijriDay === 10
          ? "Today is Ashura. Use the day for repentance, reflection, and steady worship."
          : `${10 - hijriDay} days until Ashura. Prepare with reflection, Quran, and sincere dua.`,
      icon: "calendar",
      eventName: "Ashura",
    };
  }

  if (hijriMonth === 9) {
    return {
      title: "The Month of Ramadan",
      body: "The Quran was revealed in Ramadan. Maximize your worship, charity, and Quran reading this blessed month.",
      icon: "moon",
      eventName: "Ramadan",
    };
  }

  if (hijriMonth === 12 && hijriDay <= 10) {
    return {
      title: "First 10 Days of Dhul Hijjah",
      body: "These are deeply meaningful days for worship. Increase dhikr, charity, Quran, and sincere dua.",
      icon: "sunrise",
      eventName: "Dhul Hijjah",
    };
  }

  if (hijriMonth === 7 && hijriDay >= 20) {
    return {
      title: "Approaching Isra and Mi'raj",
      body: "Use these nights for reflection on the gift of salah and the journey of faith.",
      icon: "moon",
      eventName: "Isra and Mi'raj",
    };
  }

  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 5) {
    return {
      title: "Blessed Friday",
      body: "Send abundant salawat today, read what you can of Surah Al-Kahf, and make sincere dua.",
      icon: "heart",
    };
  }

  if (upcomingEventName) {
    return {
      title: `Upcoming: ${upcomingEventName}`,
      body: "Prepare spiritually for this blessed occasion. Increase your worship and make special intentions.",
      icon: "calendar",
      eventName: upcomingEventName,
    };
  }

  return {
    title: "Every Day Is a Gift",
    body: "Make use of your health, time, energy, and opportunities before they pass.",
    icon: "sun",
  };
}

export interface RamadanInsight {
  title: string;
  body: string;
  icon: string;
  type: "fasting" | "quran" | "charity" | "worship";
}

export function getRamadanInsight(
  tarawihCompleted: number,
  charityTotal: number,
  isBeforeIftar: boolean,
): RamadanInsight {
  const prayerPeriod = getCurrentPrayerPeriod();

  if (prayerPeriod === "fajr" || prayerPeriod === "morning") {
    return {
      title: "Suhoor Reminder",
      body: "Prepare suhoor with intention, hydration, and enough energy for the day.",
      icon: "sunrise",
      type: "fasting",
    };
  }

  if (isBeforeIftar && (prayerPeriod === "asr" || prayerPeriod === "maghrib")) {
    return {
      title: "Dua Before Iftar",
      body: "The moments before iftar are precious. Slow down and make heartfelt dua.",
      icon: "moon",
      type: "worship",
    };
  }

  if (tarawihCompleted >= 15) {
    return {
      title: "Tarawih Consistency",
      body: `MashaAllah \u2014 ${tarawihCompleted} nights of Tarawih. Keep the intention sincere and the pace sustainable.`,
      icon: "star",
      type: "worship",
    };
  }

  if (charityTotal > 0) {
    return {
      title: "Ramadan Generosity",
      body: "Ramadan is a beautiful time to increase generosity. Give what you can with sincerity.",
      icon: "heart",
      type: "charity",
    };
  }

  return {
    title: "Quran in Ramadan",
    body: "Ramadan is the month of Quran. Set a daily reading goal you can protect.",
    icon: "book-open",
    type: "quran",
  };
}

export interface HajjStepInsight {
  title: string;
  body: string;
  icon: string;
}

const HAJJ_STEP_INSIGHTS: Record<number, HajjStepInsight> = {
  1: {
    title: "Entering Ihram",
    body: "Ihram is not just clothing \u2014 it's a state of the heart. When you put on Ihram, you leave behind worldly distinctions. Everyone stands equal before Allah.",
    icon: "heart",
  },
  2: {
    title: "Circling the Kaaba",
    body: "Tawaf is a moment of devotion, humility, and focus around the House of Allah. Make dua sincerely as you walk.",
    icon: "repeat",
  },
  3: {
    title: "Following Hajar's Footsteps",
    body: "Sa'i commemorates a mother's trust in Allah. Hajar ran between Safa and Marwa with complete reliance on Allah \u2014 and He answered with Zamzam.",
    icon: "trending-up",
  },
  4: {
    title: "Day of Preparation",
    body: "Mina is a day of preparation. Use it to settle your heart, organize your intentions, and prepare for Arafat.",
    icon: "compass",
  },
  5: {
    title: "The Greatest Day",
    body: "Arafat is the central standing of Hajj. Make sincere dua, seek forgiveness, and stay present with Allah.",
    icon: "star",
  },
  6: {
    title: "Night Under the Stars",
    body: "Muzdalifah is a night of peace and reflection. Rest, remember Allah, and prepare for the next rites.",
    icon: "moon",
  },
  7: {
    title: "Rejecting the Shaitan",
    body: "Stoning the pillars is a symbolic rejection of temptation, following Ibrahim's example. With each stone, renew your commitment to resist what leads you away from Allah.",
    icon: "shield",
  },
  8: {
    title: "The Sacrifice",
    body: "Qurbani honors Ibrahim's willingness to sacrifice everything for Allah. It reminds us that true devotion means putting Allah above all else.",
    icon: "gift",
  },
  9: {
    title: "A Fresh Start",
    body: "After Halq or Taqsir, pause with gratitude and make a sincere intention to return home changed for the better.",
    icon: "sunrise",
  },
  10: {
    title: "Final Tawaf",
    body: "Tawaf al-Ifadah completes the major rites. Walk these circles with gratitude \u2014 you have completed the journey of a lifetime.",
    icon: "check-circle",
  },
  11: {
    title: "The Farewell",
    body: "Tawaf al-Wada is your farewell to the House of Allah. Make dua that this is not your last visit. Leave with a heart full of gratitude and a resolve to be better.",
    icon: "heart",
  },
};

export function getHajjStepInsight(stepId: number): HajjStepInsight | null {
  return HAJJ_STEP_INSIGHTS[stepId] || null;
}

export interface FinanceInsight {
  title: string;
  body: string;
  icon: string;
  type: "sadaqah" | "general" | "debt";
}

export function getFinanceInsight(
  sadaqahCount: number,
  sadaqahTotal: number,
  hasDebts: boolean,
): FinanceInsight {
  const dayOfWeek = new Date().getDay();

  if (dayOfWeek === 5) {
    return {
      title: "Friday Charity",
      body: "Friday is a meaningful day to give. Even a small amount can train generosity and gratitude.",
      icon: "heart",
      type: "sadaqah",
    };
  }

  if (sadaqahCount >= 10) {
    return {
      title: "Generous Heart",
      body: `${sadaqahCount} acts of sadaqah recorded. Your generosity is becoming a real habit.`,
      icon: "award",
      type: "sadaqah",
    };
  }

  if (sadaqahCount > 0 && sadaqahCount < 10) {
    return {
      title: "Keep Giving",
      body: `${sadaqahCount} sadaqah entries so far. Keep giving in ways that are sincere and sustainable.`,
      icon: "trending-up",
      type: "sadaqah",
    };
  }

  if (hasDebts) {
    return {
      title: "Debt Management",
      body: "Pay off debts systematically. Even small consistent payments can make a difference.",
      icon: "file-text",
      type: "debt",
    };
  }

  return {
    title: "Halal Provision",
    body: "Seeking halal provision with honesty and care is part of a faithful life.",
    icon: "briefcase",
    type: "general",
  };
}

export interface AchievementNudge {
  badgeId: string;
  badgeName: string;
  current: number;
  target: number;
  message: string;
  icon: string;
}

export function getAchievementNudge(
  badges: {
    id: string;
    name: string;
    target: number;
    icon: string;
    category: string;
  }[],
  progress: Record<string, { current: number; unlocked: boolean }>,
): AchievementNudge | null {
  let closest: AchievementNudge | null = null;
  let closestPercent = 0;

  for (const badge of badges) {
    const bp = progress[badge.id];
    if (!bp || bp.unlocked) continue;
    if (bp.current === 0) continue;

    const pct = bp.current / badge.target;
    if (pct > closestPercent && pct < 1) {
      closestPercent = pct;
      const remaining = badge.target - bp.current;
      closest = {
        badgeId: badge.id,
        badgeName: badge.name,
        current: bp.current,
        target: badge.target,
        message:
          pct >= 0.75
            ? `Almost there! Just ${remaining} more to unlock ${badge.name}.`
            : pct >= 0.5
              ? `Over halfway to ${badge.name}. Keep it up!`
              : `${bp.current}/${badge.target} toward ${badge.name}. Every step counts.`,
        icon: badge.icon,
      };
    }
  }

  return closest;
}

export interface ShareSuggestion {
  tab: "verses" | "hadith" | "duas";
  index: number;
  reason: string;
  icon: string;
}

export function getShareSuggestion(): ShareSuggestion {
  const dayOfWeek = new Date().getDay();
  const prayerPeriod = getCurrentPrayerPeriod();

  if (dayOfWeek === 5) {
    return {
      tab: "verses",
      index: 6,
      reason:
        "Friday is a day of blessings. Share a verse of ease and trust in Allah.",
      icon: "heart",
    };
  }

  if (prayerPeriod === "fajr" || prayerPeriod === "morning") {
    return {
      tab: "hadith",
      index: 9,
      reason:
        "Morning is a calm time to share wisdom and encourage steady deeds.",
      icon: "sunrise",
    };
  }

  if (
    prayerPeriod === "isha" ||
    prayerPeriod === "night" ||
    prayerPeriod === "tahajjud"
  ) {
    return {
      tab: "duas",
      index: 0,
      reason:
        "Share a dua for knowledge. The night is perfect for reflection and learning.",
      icon: "moon",
    };
  }

  if (prayerPeriod === "asr") {
    return {
      tab: "verses",
      index: 3,
      reason:
        "Afternoon reminder \u2014 share a verse about finding peace in remembering Allah.",
      icon: "heart",
    };
  }

  return {
    tab: "hadith",
    index: 4,
    reason:
      "Every act of kindness is charity. Sharing beneficial knowledge is one of them.",
    icon: "share-2",
  };
}
