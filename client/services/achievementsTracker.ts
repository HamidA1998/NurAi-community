import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";

const ACHIEVEMENTS_KEY = "achievements_data";
const STREAK_KEY = "achievements_streak_data";

export interface BadgeProgress {
  current: number;
  unlocked: boolean;
  unlockedDate?: string;
}

export type AchievementsData = Record<string, BadgeProgress>;

interface StreakData {
  prayerStreak: number;
  lastPrayerDate: string;
  fajrStreak: number;
  lastFajrDate: string;
  dhikrStreak: number;
  lastDhikrDate: string;
  quranStreak: number;
  lastQuranDate: string;
}

function getDefaultStreak(): StreakData {
  return {
    prayerStreak: 0,
    lastPrayerDate: "",
    fajrStreak: 0,
    lastFajrDate: "",
    dhikrStreak: 0,
    lastDhikrDate: "",
    quranStreak: 0,
    lastQuranDate: "",
  };
}

async function loadProgress(): Promise<AchievementsData> {
  try {
    const stored = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

async function saveProgress(data: AchievementsData): Promise<void> {
  try {
    await syncedSetItem(ACHIEVEMENTS_KEY, JSON.stringify(data));
  } catch {}
}

async function loadStreak(): Promise<StreakData> {
  try {
    const stored = await AsyncStorage.getItem(STREAK_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return getDefaultStreak();
}

async function saveStreak(data: StreakData): Promise<void> {
  try {
    await syncedSetItem(STREAK_KEY, JSON.stringify(data));
  } catch {}
}

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

function isYesterday(dateStr: string): boolean {
  if (!dateStr) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, "0")}-${yesterday.getDate().toString().padStart(2, "0")}`;
  return dateStr === yStr;
}

function updateBadge(
  data: AchievementsData,
  badgeId: string,
  current: number,
  target: number,
): boolean {
  if (!data[badgeId]) {
    data[badgeId] = { current: 0, unlocked: false };
  }
  data[badgeId].current = Math.max(data[badgeId].current, current);
  if (data[badgeId].current >= target && !data[badgeId].unlocked) {
    data[badgeId].unlocked = true;
    data[badgeId].unlockedDate = new Date().toISOString();
    return true;
  }
  return false;
}

export async function trackPrayerCompletion(
  prayersDone: number,
  fajrDone: boolean,
): Promise<string[]> {
  const data = await loadProgress();
  const streak = await loadStreak();
  const today = getToday();
  const newlyUnlocked: string[] = [];

  if (updateBadge(data, "first_prayer", prayersDone > 0 ? 1 : 0, 1))
    newlyUnlocked.push("First Prayer");
  if (updateBadge(data, "prayer_warrior", prayersDone, 5))
    newlyUnlocked.push("Prayer Warrior");

  if (prayersDone >= 5) {
    if (streak.lastPrayerDate === today) {
    } else if (
      streak.lastPrayerDate === "" ||
      isYesterday(streak.lastPrayerDate)
    ) {
      streak.prayerStreak =
        streak.lastPrayerDate === "" ? 1 : streak.prayerStreak + 1;
    } else if (streak.lastPrayerDate !== today) {
      streak.prayerStreak = 1;
    }
    streak.lastPrayerDate = today;
  }

  if (updateBadge(data, "prayer_streak_7", streak.prayerStreak, 7))
    newlyUnlocked.push("Prayer Streak 7");
  if (updateBadge(data, "prayer_streak_30", streak.prayerStreak, 30))
    newlyUnlocked.push("Prayer Streak 30");
  if (updateBadge(data, "prayer_master", streak.prayerStreak, 100))
    newlyUnlocked.push("Prayer Master");

  if (fajrDone) {
    if (streak.lastFajrDate === today) {
    } else if (streak.lastFajrDate === "" || isYesterday(streak.lastFajrDate)) {
      streak.fajrStreak =
        streak.lastFajrDate === "" ? 1 : streak.fajrStreak + 1;
    } else if (streak.lastFajrDate !== today) {
      streak.fajrStreak = 1;
    }
    streak.lastFajrDate = today;
  }

  if (updateBadge(data, "fajr_champion", streak.fajrStreak, 7))
    newlyUnlocked.push("Fajr Champion");

  await saveProgress(data);
  await saveStreak(streak);
  return newlyUnlocked;
}

export async function trackQuranReading(
  surahsStarted: number,
  surahsCompleted: number,
  totalVersesRead: number,
): Promise<string[]> {
  const data = await loadProgress();
  const streak = await loadStreak();
  const today = getToday();
  const newlyUnlocked: string[] = [];

  if (updateBadge(data, "first_surah", surahsStarted > 0 ? 1 : 0, 1))
    newlyUnlocked.push("First Surah");
  if (updateBadge(data, "quran_explorer", surahsStarted, 10))
    newlyUnlocked.push("Quran Explorer");
  if (updateBadge(data, "hafiz_journey", surahsCompleted, 5))
    newlyUnlocked.push("Hafiz Journey");

  const juzApprox = Math.floor(totalVersesRead / 110);
  if (updateBadge(data, "juz_reader", juzApprox > 0 ? 1 : 0, 1))
    newlyUnlocked.push("Juz Reader");

  if (surahsStarted > 0) {
    if (streak.lastQuranDate === today) {
    } else if (
      streak.lastQuranDate === "" ||
      isYesterday(streak.lastQuranDate)
    ) {
      streak.quranStreak =
        streak.lastQuranDate === "" ? 1 : streak.quranStreak + 1;
    } else if (streak.lastQuranDate !== today) {
      streak.quranStreak = 1;
    }
    streak.lastQuranDate = today;
  }

  if (updateBadge(data, "quran_lover", streak.quranStreak, 30))
    newlyUnlocked.push("Quran Lover");

  await saveProgress(data);
  await saveStreak(streak);
  return newlyUnlocked;
}

export async function trackDhikr(totalCount: number): Promise<string[]> {
  const data = await loadProgress();
  const streak = await loadStreak();
  const today = getToday();
  const newlyUnlocked: string[] = [];

  if (updateBadge(data, "first_dhikr", totalCount > 0 ? 1 : 0, 1))
    newlyUnlocked.push("First Dhikr");
  if (updateBadge(data, "tasbeeh_master", totalCount, 1000))
    newlyUnlocked.push("Tasbeeh Master");

  if (totalCount > 0) {
    if (streak.lastDhikrDate === today) {
    } else if (
      streak.lastDhikrDate === "" ||
      isYesterday(streak.lastDhikrDate)
    ) {
      streak.dhikrStreak =
        streak.lastDhikrDate === "" ? 1 : streak.dhikrStreak + 1;
    } else if (streak.lastDhikrDate !== today) {
      streak.dhikrStreak = 1;
    }
    streak.lastDhikrDate = today;
  }

  if (updateBadge(data, "dhikr_streak", streak.dhikrStreak, 7))
    newlyUnlocked.push("Dhikr Streak");

  await saveProgress(data);
  await saveStreak(streak);
  return newlyUnlocked;
}

export async function trackSadaqah(entryCount: number): Promise<string[]> {
  const data = await loadProgress();
  const newlyUnlocked: string[] = [];

  if (updateBadge(data, "generous_soul", entryCount, 10))
    newlyUnlocked.push("Generous Soul");

  await saveProgress(data);
  return newlyUnlocked;
}

export async function trackAIChat(messageCount: number): Promise<string[]> {
  const data = await loadProgress();
  const newlyUnlocked: string[] = [];

  if (updateBadge(data, "nurai_companion", messageCount, 10))
    newlyUnlocked.push("NurAI Companion");

  await saveProgress(data);
  return newlyUnlocked;
}

export async function trackAppUsageTime(): Promise<string[]> {
  const data = await loadProgress();
  const newlyUnlocked: string[] = [];
  const hour = new Date().getHours();

  if (hour >= 3 && hour < 5) {
    const current = (data["early_bird"]?.current || 0) + 1;
    if (updateBadge(data, "early_bird", current, 5))
      newlyUnlocked.push("Early Bird");
  }

  if (hour >= 1 && hour < 4) {
    const current = (data["night_owl"]?.current || 0) + 1;
    if (updateBadge(data, "night_owl", current, 5))
      newlyUnlocked.push("Night Owl");
  }

  await saveProgress(data);
  return newlyUnlocked;
}

export async function trackScreenVisit(
  visitedScreens: string[],
): Promise<string[]> {
  const data = await loadProgress();
  const newlyUnlocked: string[] = [];

  const requiredScreens = [
    "home",
    "prayer_times",
    "quran",
    "tasbeeh",
    "duas",
    "names_of_allah",
    "hadith",
    "islamic_calendar",
  ];
  const visitedCount = requiredScreens.filter((s) =>
    visitedScreens.includes(s),
  ).length;
  if (
    updateBadge(
      data,
      "app_explorer",
      visitedCount >= requiredScreens.length ? 1 : 0,
      1,
    )
  )
    newlyUnlocked.push("App Explorer");

  await saveProgress(data);
  return newlyUnlocked;
}

export async function trackHajjChecklist(): Promise<string[]> {
  const data = await loadProgress();
  const newlyUnlocked: string[] = [];

  if (updateBadge(data, "hajj_prepared", 1, 1))
    newlyUnlocked.push("Hajj Prepared");

  await saveProgress(data);
  return newlyUnlocked;
}

export async function trackRamadanGoals(): Promise<string[]> {
  const data = await loadProgress();
  const newlyUnlocked: string[] = [];

  if (updateBadge(data, "ramadan_warrior", 1, 1))
    newlyUnlocked.push("Ramadan Warrior");

  await saveProgress(data);
  return newlyUnlocked;
}

export async function computeAllProgress(): Promise<AchievementsData> {
  const data = await loadProgress();

  try {
    const today = getToday();
    const hasanatRaw = await AsyncStorage.getItem(`hasanat-${today}`);
    if (hasanatRaw) {
      const hasanat = JSON.parse(hasanatRaw);
      const prayers = hasanat.prayers || {};
      const prayersDone = Object.values(prayers).filter(Boolean).length;

      updateBadge(data, "first_prayer", prayersDone > 0 ? 1 : 0, 1);
      updateBadge(data, "prayer_warrior", prayersDone, 5);

      if (hasanat.dhikrSessions > 0) {
        updateBadge(data, "first_dhikr", 1, 1);
      }
    }
  } catch {}

  try {
    const quranRaw = await AsyncStorage.getItem("quran-all-surah-progress");
    if (quranRaw) {
      const quranData = JSON.parse(quranRaw);
      const surahs = Object.values(quranData.surahProgress || {}) as any[];
      const started = surahs.length;
      const completed = surahs.filter((s: any) => s.percentage >= 100).length;
      const totalVerses = surahs.reduce(
        (sum: number, s: any) => sum + (s.maxVerseRead || 0),
        0,
      );

      updateBadge(data, "first_surah", started > 0 ? 1 : 0, 1);
      updateBadge(data, "quran_explorer", started, 10);
      updateBadge(data, "hafiz_journey", completed, 5);
      if (totalVerses >= 110) {
        updateBadge(data, "juz_reader", 1, 1);
      }
    }
  } catch {}

  try {
    const tasbeehRaw = await AsyncStorage.getItem("tasbeeh_count");
    if (tasbeehRaw) {
      const count = parseInt(tasbeehRaw, 10);
      if (count > 0) {
        updateBadge(data, "first_dhikr", 1, 1);
        updateBadge(data, "tasbeeh_master", count, 1000);
      }
    }
  } catch {}

  try {
    const sadaqahRaw = await AsyncStorage.getItem("sadaqah_log");
    if (sadaqahRaw) {
      const entries = JSON.parse(sadaqahRaw);
      updateBadge(data, "generous_soul", entries.length, 10);
    }
  } catch {}

  await saveProgress(data);
  return data;
}
