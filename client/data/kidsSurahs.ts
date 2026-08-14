// Extracted verbatim from KidsMemorizationScreen.tsx so this vetted content can be reused (e.g. by kids' games/quizzes) from a single source of truth. Only identifier names were renamed on export; the Arabic text and data below are unchanged.

export interface KidsSurah {
  id: string;
  name: string;
  arabicName: string;
  number: number;
  verseCount: number;
  meaning: string;
  difficulty: "easy" | "medium" | "hard";
}

export const KIDS_SURAHS: KidsSurah[] = [
  {
    id: "surah-1",
    name: "Al-Fatiha",
    arabicName: "\u0627\u0644\u0641\u0627\u062A\u062D\u0629",
    number: 1,
    verseCount: 7,
    meaning: "The Opening",
    difficulty: "easy",
  },
  {
    id: "surah-112",
    name: "Al-Ikhlas",
    arabicName: "\u0627\u0644\u0625\u062E\u0644\u0627\u0635",
    number: 112,
    verseCount: 4,
    meaning: "The Purity",
    difficulty: "easy",
  },
  {
    id: "surah-113",
    name: "Al-Falaq",
    arabicName: "\u0627\u0644\u0641\u0644\u0642",
    number: 113,
    verseCount: 5,
    meaning: "The Dawn",
    difficulty: "easy",
  },
  {
    id: "surah-114",
    name: "An-Nas",
    arabicName: "\u0627\u0644\u0646\u0627\u0633",
    number: 114,
    verseCount: 6,
    meaning: "Mankind",
    difficulty: "easy",
  },
  {
    id: "surah-108",
    name: "Al-Kawthar",
    arabicName: "\u0627\u0644\u0643\u0648\u062B\u0631",
    number: 108,
    verseCount: 3,
    meaning: "The Abundance",
    difficulty: "easy",
  },
  {
    id: "surah-103",
    name: "Al-Asr",
    arabicName: "\u0627\u0644\u0639\u0635\u0631",
    number: 103,
    verseCount: 3,
    meaning: "The Time",
    difficulty: "medium",
  },
  {
    id: "surah-105",
    name: "Al-Fil",
    arabicName: "\u0627\u0644\u0641\u064A\u0644",
    number: 105,
    verseCount: 5,
    meaning: "The Elephant",
    difficulty: "medium",
  },
  {
    id: "surah-111",
    name: "Al-Masad",
    arabicName: "\u0627\u0644\u0645\u0633\u062F",
    number: 111,
    verseCount: 5,
    meaning: "The Palm Fiber",
    difficulty: "medium",
  },
  {
    id: "surah-110",
    name: "An-Nasr",
    arabicName: "\u0627\u0644\u0646\u0635\u0631",
    number: 110,
    verseCount: 3,
    meaning: "The Victory",
    difficulty: "medium",
  },
  {
    id: "surah-109",
    name: "Al-Kafiroon",
    arabicName: "\u0627\u0644\u0643\u0627\u0641\u0631\u0648\u0646",
    number: 109,
    verseCount: 6,
    meaning: "The Disbelievers",
    difficulty: "hard",
  },
];
