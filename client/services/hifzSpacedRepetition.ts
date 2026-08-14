import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";

export interface SM2VerseData {
  surah: number;
  ayah: number;
  status: "new" | "learning" | "review" | "mastered";
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: string;
  lastScore: number;
  repetitions: number;
  lastReviewedAt: string;
}

export interface HifzSRStats {
  newToday: number;
  dueReviews: number;
  totalLearning: number;
  totalMastered: number;
  totalVerses: number;
}

const STORAGE_KEY = "hifz_sr_data";
const NEW_VERSES_PER_DAY = 5;

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function makeKey(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

export function computeSM2(prev: SM2VerseData, quality: number): SM2VerseData {
  const q = Math.max(0, Math.min(5, quality));
  let { easeFactor, intervalDays, repetitions } = prev;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 3;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const now = new Date();
  const nextReview = addDays(now, intervalDays);

  let status: SM2VerseData["status"] = "learning";
  if (intervalDays >= 21 && q >= 4) {
    status = "mastered";
  } else if (intervalDays >= 7) {
    status = "review";
  }

  return {
    ...prev,
    easeFactor,
    intervalDays,
    repetitions,
    lastScore: q,
    status,
    nextReviewAt: nextReview.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}

export async function loadAllSRData(): Promise<Record<string, SM2VerseData>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export async function saveSRData(
  data: Record<string, SM2VerseData>,
): Promise<void> {
  await syncedSetItem(STORAGE_KEY, JSON.stringify(data));
}

export async function recordReview(
  surah: number,
  ayah: number,
  quality: number,
): Promise<SM2VerseData> {
  const all = await loadAllSRData();
  const key = makeKey(surah, ayah);
  const existing = all[key] || createNewVerse(surah, ayah);
  const updated = computeSM2(existing, quality);
  all[key] = updated;
  await saveSRData(all);
  return updated;
}

export function createNewVerse(surah: number, ayah: number): SM2VerseData {
  return {
    surah,
    ayah,
    status: "new",
    easeFactor: 2.5,
    intervalDays: 0,
    nextReviewAt: new Date().toISOString(),
    lastScore: 0,
    repetitions: 0,
    lastReviewedAt: "",
  };
}

export async function getStats(): Promise<HifzSRStats> {
  const all = await loadAllSRData();
  const entries = Object.values(all);
  const today = todayStr();

  let dueReviews = 0;
  let totalLearning = 0;
  let totalMastered = 0;

  for (const v of entries) {
    if (v.status === "mastered") {
      totalMastered++;
      const reviewDate = v.nextReviewAt.split("T")[0];
      if (reviewDate <= today) dueReviews++;
    } else if (v.status !== "new") {
      totalLearning++;
      const reviewDate = v.nextReviewAt.split("T")[0];
      if (reviewDate <= today) dueReviews++;
    }
  }

  const learnedToday = entries.filter(
    (v) => v.lastReviewedAt && v.lastReviewedAt.startsWith(today),
  ).length;

  return {
    newToday: Math.max(0, NEW_VERSES_PER_DAY - learnedToday),
    dueReviews,
    totalLearning,
    totalMastered,
    totalVerses: entries.length,
  };
}

export async function getDueVerses(): Promise<SM2VerseData[]> {
  const all = await loadAllSRData();
  const today = todayStr();
  return Object.values(all).filter((v) => {
    if (v.status === "new") return false;
    const reviewDate = v.nextReviewAt.split("T")[0];
    return reviewDate <= today;
  });
}

export async function addVersesToSR(
  surah: number,
  verses: number[],
): Promise<void> {
  const all = await loadAllSRData();
  for (const ayah of verses) {
    const key = makeKey(surah, ayah);
    if (!all[key]) {
      all[key] = createNewVerse(surah, ayah);
    }
  }
  await saveSRData(all);
}

export function qualityFromAction(
  action: "memorized" | "needsPractice",
): number {
  return action === "memorized" ? 4 : 2;
}
