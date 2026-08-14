import AsyncStorage from "@react-native-async-storage/async-storage";

import { syncedSetItem } from "@/lib/progress-sync";
import {
  HABIT_CATEGORIES,
  calculateHabitStreak,
  type HabitCategoryId,
  type HabitStreakData,
} from "@/services/nuraiHabitEngine";

// Shared with StreakGardenScreen's existing local storage — this service
// becomes the one place that writes it, so every screen that calls
// recordGardenAction() feeds the same garden the screen already reads.
const HABIT_STREAK_KEY = "habit-streak-data";
const STREAK_KEY = "streak-data";
const GARDEN_STARS_KEY = "garden-stars-total";
const STARS_PER_CHECKIN = 10;

// Mirrors StreakGardenScreen's own StreakData shape — kept minimal here
// (no milestone/protected-pause logic, which is specific to that screen's
// own manual check-in flow) but additive-only, so it never clobbers what
// that screen has already written.
interface OverallStreakData {
  checkedDays: string[];
  protectedDays?: string[];
  currentStreak: number;
  longestStreak: number;
  milestoneEarnedDates?: Record<number, string>;
}

async function bumpOverallStreak(today: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    const existing: OverallStreakData = raw
      ? JSON.parse(raw)
      : {
          checkedDays: [],
          protectedDays: [],
          currentStreak: 0,
          longestStreak: 0,
        };
    if (existing.checkedDays.includes(today)) return;
    const checkedDays = [...existing.checkedDays, today];
    const { current, longest } = calculateHabitStreak(checkedDays);
    const next: OverallStreakData = {
      ...existing,
      checkedDays,
      currentStreak: current,
      longestStreak: Math.max(existing.longestStreak ?? 0, longest),
    };
    await syncedSetItem(STREAK_KEY, JSON.stringify(next));
  } catch {
    // Best-effort — a background action failing to bump the hero streak
    // shouldn't surface an error to whatever screen triggered it.
  }
}

export interface GardenActionResult {
  category: HabitCategoryId;
  /** False if this category was already checked in today — no duplicate
   * stars or celebration for repeat actions on the same day. */
  isNewToday: boolean;
  currentStreak: number;
  longestStreak: number;
  starsEarned: number;
  totalStars: number;
}

export interface GardenCategorySnapshot {
  id: HabitCategoryId;
  label: string;
  icon: string;
  checkedToday: boolean;
  currentStreak: number;
  longestStreak: number;
}

export interface GardenSnapshot {
  categories: GardenCategorySnapshot[];
  /** Days with at least one sincere action logged — the garden's own
   * streak, independent of any single category. */
  overallStreak: number;
  overallLongestStreak: number;
  checkedTodayCount: number;
  totalStars: number;
  growthStage: GardenGrowthStage;
}

export type GardenGrowthStageKey =
  | "seed"
  | "sprout"
  | "plant"
  | "tree"
  | "radiant";

export interface GardenGrowthStage {
  key: GardenGrowthStageKey;
  label: string;
  minDays: number;
  nextMinDays: number | null;
}

const GROWTH_STAGES: GardenGrowthStage[] = [
  { key: "seed", label: "Seed", minDays: 0, nextMinDays: 1 },
  { key: "sprout", label: "Sprout", minDays: 1, nextMinDays: 7 },
  { key: "plant", label: "Plant", minDays: 7, nextMinDays: 14 },
  { key: "tree", label: "Tree", minDays: 14, nextMinDays: 30 },
  { key: "radiant", label: "Radiant", minDays: 30, nextMinDays: null },
];

export function getGardenGrowthStage(overallStreak: number): GardenGrowthStage {
  let stage = GROWTH_STAGES[0];
  for (const candidate of GROWTH_STAGES) {
    if (overallStreak >= candidate.minDays) stage = candidate;
  }
  return stage;
}

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

async function readHabitData(): Promise<HabitStreakData> {
  try {
    const raw = await AsyncStorage.getItem(HABIT_STREAK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeHabitData(data: HabitStreakData): Promise<void> {
  await syncedSetItem(HABIT_STREAK_KEY, JSON.stringify(data));
}

async function readTotalStars(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(GARDEN_STARS_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * The single interlink point: call this from anywhere a sincere daily act
 * completes (a prayer marked prayed, a tasbeeh loop finished, a dua saved,
 * a Quran session read, sadaqah logged, a reflection written) and the
 * garden grows. Safe to call more than once a day — only the first call
 * per category per day counts toward the streak and stars.
 */
export async function recordGardenAction(
  categoryId: HabitCategoryId,
): Promise<GardenActionResult> {
  const today = todayKey();
  const data = await readHabitData();
  const existing = data[categoryId] ?? {
    checkedDays: [],
    currentStreak: 0,
    longestStreak: 0,
  };
  const isNewToday = !existing.checkedDays.includes(today);

  if (isNewToday) {
    const checkedDays = [...existing.checkedDays, today];
    const { current, longest } = calculateHabitStreak(checkedDays);
    data[categoryId] = {
      checkedDays,
      currentStreak: current,
      longestStreak: Math.max(existing.longestStreak, longest),
    };
    await writeHabitData(data);
    await bumpOverallStreak(today);
  }

  let totalStars = await readTotalStars();
  const starsEarned = isNewToday ? STARS_PER_CHECKIN : 0;
  if (starsEarned > 0) {
    totalStars += starsEarned;
    await syncedSetItem(GARDEN_STARS_KEY, totalStars.toString());
  }

  const finalEntry = data[categoryId] ?? existing;
  return {
    category: categoryId,
    isNewToday,
    currentStreak: finalEntry.currentStreak,
    longestStreak: finalEntry.longestStreak,
    starsEarned,
    totalStars,
  };
}

export async function getGardenSnapshot(): Promise<GardenSnapshot> {
  const data = await readHabitData();
  const today = todayKey();

  const categories: GardenCategorySnapshot[] = HABIT_CATEGORIES.map((cat) => {
    const entry = data[cat.id];
    return {
      id: cat.id,
      label: cat.label,
      icon: cat.icon,
      checkedToday: entry?.checkedDays.includes(today) ?? false,
      currentStreak: entry?.currentStreak ?? 0,
      longestStreak: entry?.longestStreak ?? 0,
    };
  });

  // "One sincere action keeps your garden growing" — reads the same
  // streak-data key StreakGardenScreen's own check-in flow owns (complete
  // with its protected/mercy-pause days), which recordGardenAction() now
  // also advances in the background. One number, one source of truth.
  let overallStreak = 0;
  let overallLongestStreak = 0;
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      overallStreak = parsed?.currentStreak ?? 0;
      overallLongestStreak = parsed?.longestStreak ?? 0;
    }
  } catch {
    // Fall back to zero — the screen's own loader will still compute it.
  }

  const totalStars = await readTotalStars();
  const checkedTodayCount = categories.filter((c) => c.checkedToday).length;

  return {
    categories,
    overallStreak,
    overallLongestStreak,
    checkedTodayCount,
    totalStars,
    growthStage: getGardenGrowthStage(overallStreak),
  };
}
