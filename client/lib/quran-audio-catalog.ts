export const QURAN_VERSE_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20,
  56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21,
  11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
] as const;

export type QuranAudioRange = {
  surahNumber: number;
  startVerse: number;
  endVerse: number;
  surahName: string;
};

export type QuranOfflinePackPlan = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  badge: string;
  ranges: QuranAudioRange[];
};

export const DEFAULT_QURAN_AUDIO_RECITER = {
  id: 7,
  name: "Mishary Rashid Alafasy",
  cdnPath: "ar.alafasy",
  bitrate: 128,
  everyayahFolder: "Alafasy_128kbps",
} as const;

export const QURAN_OFFLINE_PACK_PLANS: QuranOfflinePackPlan[] = [
  {
    id: "juz-amma",
    title: "Juz Amma",
    subtitle: "Surah An-Naba to An-Nas",
    body: "A compact memorisation and travel pack for the surahs most people revisit often.",
    badge: "37 surahs",
    ranges: Array.from({ length: 37 }, (_, index) => {
      const surahNumber = 78 + index;
      return {
        surahNumber,
        startVerse: 1,
        endVerse: QURAN_VERSE_COUNTS[surahNumber - 1] || 1,
        surahName: `Surah ${surahNumber}`,
      };
    }),
  },
  {
    id: "night-protection",
    title: "Night Protection",
    subtitle: "Al-Mulk, Al-Kafirun, Ikhlas, Falaq, Nas",
    body: "A small night pack for bedtime listening, reflection, and offline travel moments.",
    badge: "5 surahs",
    ranges: [67, 109, 112, 113, 114].map((surahNumber) => ({
      surahNumber,
      startVerse: 1,
      endVerse: QURAN_VERSE_COUNTS[surahNumber - 1] || 1,
      surahName: `Surah ${surahNumber}`,
    })),
  },
  {
    id: "friday-light",
    title: "Friday Light",
    subtitle: "Surah Al-Kahf",
    body: "Save Al-Kahf so Friday recitation works even with weak signal.",
    badge: "110 ayahs",
    ranges: [
      {
        surahNumber: 18,
        startVerse: 1,
        endVerse: QURAN_VERSE_COUNTS[17] || 110,
        surahName: "Al-Kahf",
      },
    ],
  },
];

export function getAbsoluteQuranVerseNumber(
  surahNumber: number,
  verseNumber: number,
): number {
  let total = 0;
  for (let index = 0; index < surahNumber - 1; index++) {
    total += QURAN_VERSE_COUNTS[index] || 0;
  }
  return total + verseNumber;
}

export function getQuranOfflinePackVerseTotal(
  plan: QuranOfflinePackPlan,
): number {
  return plan.ranges.reduce(
    (sum, range) => sum + Math.max(0, range.endVerse - range.startVerse + 1),
    0,
  );
}

export function buildDefaultQuranAudioUrl(
  surahNumber: number,
  verseNumber: number,
): string {
  const absoluteVerse = getAbsoluteQuranVerseNumber(surahNumber, verseNumber);
  return `https://cdn.islamic.network/quran/audio/${DEFAULT_QURAN_AUDIO_RECITER.bitrate}/${DEFAULT_QURAN_AUDIO_RECITER.cdnPath}/${absoluteVerse}.mp3`;
}

export function buildDefaultQuranFallbackAudioUrl(
  surahNumber: number,
  verseNumber: number,
): string {
  const surahPad = String(surahNumber).padStart(3, "0");
  const versePad = String(verseNumber).padStart(3, "0");
  return `https://everyayah.com/data/${DEFAULT_QURAN_AUDIO_RECITER.everyayahFolder}/${surahPad}${versePad}.mp3`;
}
