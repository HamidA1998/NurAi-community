import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  localDateKey,
  PRAYER_KEYS,
  type PrayerKey,
} from "@/lib/prayer-intelligence";
import { syncedSetItem } from "@/lib/progress-sync";

export type PrayerTrackerStatus = "prayed" | "late" | "missed" | "excused";

export type PrayerTrackerDay = Partial<Record<PrayerKey, PrayerTrackerStatus>>;

export type PrayerTrackerState = Record<string, PrayerTrackerDay>;

export type PrayerTrackerSummary = {
  todayKey: string;
  today: PrayerTrackerDay;
  todayCompleted: number;
  todayPercent: number;
  currentStreak: number;
  monthPercent: number;
  heatmap: { dateKey: string; count: number; percent: number }[];
};

export const PRAYER_TRACKER_STORAGE_KEY = "nurai_prayer_tracker_v1";

export async function loadPrayerTrackerState(): Promise<PrayerTrackerState> {
  try {
    const raw = await AsyncStorage.getItem(PRAYER_TRACKER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function savePrayerTrackerState(
  state: PrayerTrackerState,
): Promise<void> {
  await syncedSetItem(PRAYER_TRACKER_STORAGE_KEY, JSON.stringify(state));
}

export async function setPrayerTrackerStatus(
  prayer: PrayerKey,
  status: PrayerTrackerStatus | null,
  date = new Date(),
): Promise<PrayerTrackerState> {
  const key = localDateKey(date);
  const state = await loadPrayerTrackerState();
  const day = { ...(state[key] || {}) };
  if (status) {
    day[prayer] = status;
  } else {
    delete day[prayer];
  }
  state[key] = day;
  await savePrayerTrackerState(state);
  return state;
}

export async function togglePrayerPrayed(
  prayer: PrayerKey,
  date = new Date(),
): Promise<PrayerTrackerState> {
  const key = localDateKey(date);
  const state = await loadPrayerTrackerState();
  const current = state[key]?.[prayer];
  return setPrayerTrackerStatus(
    prayer,
    current === "prayed" ? null : "prayed",
    date,
  );
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dayCount(day?: PrayerTrackerDay): number {
  if (!day) return 0;
  return PRAYER_KEYS.reduce(
    (total, key) =>
      total + (day[key] === "prayed" || day[key] === "excused" ? 1 : 0),
    0,
  );
}

export function getPrayerTrackerSummary(
  state: PrayerTrackerState,
  now = new Date(),
): PrayerTrackerSummary {
  const todayKey = localDateKey(now);
  const today = state[todayKey] || {};
  const todayCompleted = dayCount(today);
  const heatmap = Array.from({ length: 30 }, (_, index) => {
    const date = addDays(now, index - 29);
    const dateKey = localDateKey(date);
    const count = dayCount(state[dateKey]);
    return {
      dateKey,
      count,
      percent: Math.round((count / PRAYER_KEYS.length) * 100),
    };
  });

  let currentStreak = 0;
  for (let offset = 0; offset < 365; offset++) {
    const key = localDateKey(addDays(now, -offset));
    if (dayCount(state[key]) >= PRAYER_KEYS.length) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  const totalMonthSlots = heatmap.length * PRAYER_KEYS.length;
  const monthDone = heatmap.reduce((sum, day) => sum + day.count, 0);

  return {
    todayKey,
    today,
    todayCompleted,
    todayPercent: Math.round((todayCompleted / PRAYER_KEYS.length) * 100),
    currentStreak,
    monthPercent: Math.round((monthDone / totalMonthSlots) * 100),
    heatmap,
  };
}
