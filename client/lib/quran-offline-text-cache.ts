import AsyncStorage from "@react-native-async-storage/async-storage";

const QURAN_TEXT_CACHE_PREFIX = "nurai_quran_text_cache_v1";
const QURAN_TEXT_CACHE_INDEX_KEY = "nurai_quran_text_cache_index_v1";

export type CachedQuranWord = {
  position: number;
  arabicWord: string;
  normalizedArabicWord?: string;
  translationWord: string;
  transliterationWord: string;
  charType: string;
  audioUrl?: string;
  location?: string;
  quranComWordId?: number;
};

export type CachedQuranVerse = {
  verseNumber: number;
  arabic: string;
  tajweed: string;
  translation: string;
  transliteration: string;
  words: CachedQuranWord[];
  isMuqattaat: boolean;
  wordLangAvailable: boolean;
};

export type QuranTextCachePayload = {
  schema: "nurai-quran-text-cache-v1";
  cachedAt: number;
  surahNumber: number;
  surahName: string;
  translationId: string;
  tajweedEnabled: boolean;
  verses: CachedQuranVerse[];
};

export type QuranTextCacheIndexEntry = {
  key: string;
  surahNumber: number;
  surahName: string;
  translationId: string;
  tajweedEnabled: boolean;
  verseCount: number;
  cachedAt: number;
};

function buildQuranTextCacheKey(params: {
  surahNumber: number;
  translationId: string;
  tajweedEnabled: boolean;
}): string {
  return [
    QURAN_TEXT_CACHE_PREFIX,
    params.surahNumber,
    params.translationId,
    params.tajweedEnabled ? "tajweed" : "plain",
  ].join(":");
}

async function readIndex(): Promise<QuranTextCacheIndexEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QURAN_TEXT_CACHE_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(entries: QuranTextCacheIndexEntry[]): Promise<void> {
  await AsyncStorage.setItem(
    QURAN_TEXT_CACHE_INDEX_KEY,
    JSON.stringify(
      entries
        .filter((entry) => entry?.key)
        .sort((a, b) => b.cachedAt - a.cachedAt)
        .slice(0, 80),
    ),
  );
}

export async function saveQuranTextCache(params: {
  surahNumber: number;
  surahName: string;
  translationId: string;
  tajweedEnabled: boolean;
  verses: CachedQuranVerse[];
}): Promise<void> {
  if (!params.verses.length) return;
  const key = buildQuranTextCacheKey(params);
  const payload: QuranTextCachePayload = {
    schema: "nurai-quran-text-cache-v1",
    cachedAt: Date.now(),
    surahNumber: params.surahNumber,
    surahName: params.surahName,
    translationId: params.translationId,
    tajweedEnabled: params.tajweedEnabled,
    verses: params.verses,
  };
  await AsyncStorage.setItem(key, JSON.stringify(payload));

  const index = await readIndex();
  await writeIndex([
    {
      key,
      surahNumber: params.surahNumber,
      surahName: params.surahName,
      translationId: params.translationId,
      tajweedEnabled: params.tajweedEnabled,
      verseCount: params.verses.length,
      cachedAt: payload.cachedAt,
    },
    ...index.filter((entry) => entry.key !== key),
  ]);
}

export async function getQuranTextCache(params: {
  surahNumber: number;
  translationId: string;
  tajweedEnabled: boolean;
}): Promise<QuranTextCachePayload | null> {
  try {
    const key = buildQuranTextCacheKey(params);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuranTextCachePayload;
    if (
      parsed?.schema !== "nurai-quran-text-cache-v1" ||
      parsed.surahNumber !== params.surahNumber ||
      parsed.translationId !== params.translationId ||
      parsed.tajweedEnabled !== params.tajweedEnabled ||
      !Array.isArray(parsed.verses)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function getQuranTextCacheIndex(): Promise<
  QuranTextCacheIndexEntry[]
> {
  return readIndex();
}

export async function removeQuranTextCacheEntry(key: string): Promise<void> {
  const index = await readIndex();
  await Promise.all([
    AsyncStorage.removeItem(key),
    writeIndex(index.filter((entry) => entry.key !== key)),
  ]);
}

export async function clearQuranTextCache(): Promise<void> {
  const index = await readIndex();
  await Promise.all([
    ...index.map((entry) => AsyncStorage.removeItem(entry.key)),
    AsyncStorage.removeItem(QURAN_TEXT_CACHE_INDEX_KEY),
  ]);
}
