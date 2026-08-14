import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";
import { updateNurAIWidgetSnapshot } from "@/lib/widget-snapshot";

const PROGRESS_KEY = "quran-all-surah-progress";
const LAST_READ_KEY = "quran-last-read-surah";
const LEGACY_KEY = "quran-reading-progress";

export const VERSE_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20,
  56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21,
  11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

export const TOTAL_QURAN_VERSES = 6236;

export interface SurahProgress {
  surahNumber: number;
  surahName: string;
  maxVerseRead: number;
  totalVerses: number;
  percentage: number;
  lastReadAt: number;
}

export interface QuranProgressData {
  surahProgress: Record<string, SurahProgress>;
}

export interface QuranStats {
  totalVersesRead: number;
  totalPercentage: number;
  surahsStarted: number;
  surahsCompleted: number;
  lastReadSurah: SurahProgress | null;
  recentSurahs: SurahProgress[];
}

async function loadAllProgress(): Promise<QuranProgressData> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { surahProgress: {} };
}

async function saveAllProgress(data: QuranProgressData): Promise<void> {
  try {
    await syncedSetItem(PROGRESS_KEY, JSON.stringify(data));
  } catch {}
}

export async function updateSurahProgress(
  surahNumber: number,
  surahName: string,
  currentVerse: number,
): Promise<void> {
  const data = await loadAllProgress();
  const key = String(surahNumber);
  const totalVerses = VERSE_COUNTS[surahNumber - 1] || 1;
  const existing = data.surahProgress[key];

  const maxVerseRead = existing
    ? Math.max(existing.maxVerseRead, currentVerse)
    : currentVerse;

  const percentage = Math.min(
    Math.round((maxVerseRead / totalVerses) * 100),
    100,
  );

  data.surahProgress[key] = {
    surahNumber,
    surahName: surahName || existing?.surahName || `Surah ${surahNumber}`,
    maxVerseRead,
    totalVerses,
    percentage,
    lastReadAt: Date.now(),
  };

  await saveAllProgress(data);

  await syncedSetItem(LAST_READ_KEY, JSON.stringify(data.surahProgress[key]));

  const legacyData = {
    surah: surahNumber,
    surahName: data.surahProgress[key].surahName,
    verse: currentVerse,
    totalVersesRead: computeTotalVersesRead(data),
    timestamp: Date.now(),
  };
  await syncedSetItem(LEGACY_KEY, JSON.stringify(legacyData));

  await AsyncStorage.setItem(
    `quran-surah-position-${surahNumber}`,
    String(currentVerse),
  );

  updateNurAIWidgetSnapshot({
    quranContinueLabel: `${data.surahProgress[key].surahName} ${currentVerse}`,
    quranProgressLabel: `${data.surahProgress[key].percentage}% of ${data.surahProgress[key].surahName}`,
    quranContinueSurah: surahNumber,
    quranContinueVerse: currentVerse,
  }).catch(() => {});
}

function computeTotalVersesRead(data: QuranProgressData): number {
  let total = 0;
  for (const key of Object.keys(data.surahProgress)) {
    total += data.surahProgress[key].maxVerseRead;
  }
  return total;
}

export async function getQuranStats(): Promise<QuranStats> {
  const data = await loadAllProgress();
  const entries = Object.values(data.surahProgress);

  const totalVersesRead = computeTotalVersesRead(data);
  const totalPercentage = Math.min(
    Math.round((totalVersesRead / TOTAL_QURAN_VERSES) * 100),
    100,
  );
  const surahsStarted = entries.length;
  const surahsCompleted = entries.filter((e) => e.percentage >= 100).length;

  const sorted = [...entries].sort((a, b) => b.lastReadAt - a.lastReadAt);
  const lastReadSurah = sorted[0] || null;
  const recentSurahs = sorted.slice(0, 5);

  return {
    totalVersesRead,
    totalPercentage,
    surahsStarted,
    surahsCompleted,
    lastReadSurah,
    recentSurahs,
  };
}

export async function getSurahProgress(
  surahNumber: number,
): Promise<SurahProgress | null> {
  const data = await loadAllProgress();
  return data.surahProgress[String(surahNumber)] || null;
}

export async function getRecentSurahs(
  limit: number = 5,
): Promise<SurahProgress[]> {
  const data = await loadAllProgress();
  const entries = Object.values(data.surahProgress);
  return entries.sort((a, b) => b.lastReadAt - a.lastReadAt).slice(0, limit);
}

export async function migrateFromLegacy(): Promise<void> {
  const data = await loadAllProgress();
  if (Object.keys(data.surahProgress).length > 0) return;

  try {
    const legacyRaw = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (legacy.surah && legacy.verse) {
        const totalVerses = VERSE_COUNTS[legacy.surah - 1] || 1;
        data.surahProgress[String(legacy.surah)] = {
          surahNumber: legacy.surah,
          surahName: legacy.surahName || `Surah ${legacy.surah}`,
          maxVerseRead: legacy.verse,
          totalVerses,
          percentage: Math.min(
            Math.round((legacy.verse / totalVerses) * 100),
            100,
          ),
          lastReadAt: legacy.timestamp || Date.now(),
        };
        await saveAllProgress(data);
      }
    }
  } catch {}
}
