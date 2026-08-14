import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import {
  GeometricCardPattern,
  GoldDivider,
  HifzIconSvg,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { syncedSetItem } from "@/lib/progress-sync";
import { PremiumGate } from "@/components/PremiumGate";
import { ENTITLEMENTS } from "@/config/entitlements";
import {
  loadAndPlay as transportPlay,
  stopPlayback as transportStop,
  setCallbacks as transportSetCallbacks,
  teardown as transportTeardown,
  TransportState,
} from "@/lib/audio-transport";
import {
  recordReview,
  getStats,
  getDueVerses,
  addVersesToSR,
  qualityFromAction,
  HifzSRStats,
  SM2VerseData,
} from "@/services/hifzSpacedRepetition";
import { AppIcon } from "@/components/icons";

const TOTAL_QURAN_VERSES = 6236;

const SURAH_NAMES = [
  {
    number: 1,
    name: "Al-Fatihah",
    arabic: "\u0627\u0644\u0641\u0627\u062a\u062d\u0629",
    verses: 7,
  },
  {
    number: 2,
    name: "Al-Baqarah",
    arabic: "\u0627\u0644\u0628\u0642\u0631\u0629",
    verses: 286,
  },
  {
    number: 3,
    name: "Aal-E-Imran",
    arabic: "\u0622\u0644 \u0639\u0645\u0631\u0627\u0646",
    verses: 200,
  },
  {
    number: 4,
    name: "An-Nisa",
    arabic: "\u0627\u0644\u0646\u0633\u0627\u0621",
    verses: 176,
  },
  {
    number: 5,
    name: "Al-Ma'idah",
    arabic: "\u0627\u0644\u0645\u0627\u0626\u062f\u0629",
    verses: 120,
  },
  {
    number: 6,
    name: "Al-An'am",
    arabic: "\u0627\u0644\u0623\u0646\u0639\u0627\u0645",
    verses: 165,
  },
  {
    number: 7,
    name: "Al-A'raf",
    arabic: "\u0627\u0644\u0623\u0639\u0631\u0627\u0641",
    verses: 206,
  },
  {
    number: 8,
    name: "Al-Anfal",
    arabic: "\u0627\u0644\u0623\u0646\u0641\u0627\u0644",
    verses: 75,
  },
  {
    number: 9,
    name: "At-Tawbah",
    arabic: "\u0627\u0644\u062a\u0648\u0628\u0629",
    verses: 129,
  },
  {
    number: 10,
    name: "Yunus",
    arabic: "\u064a\u0648\u0646\u0633",
    verses: 109,
  },
  { number: 11, name: "Hud", arabic: "\u0647\u0648\u062f", verses: 123 },
  {
    number: 12,
    name: "Yusuf",
    arabic: "\u064a\u0648\u0633\u0641",
    verses: 111,
  },
  {
    number: 13,
    name: "Ar-Ra'd",
    arabic: "\u0627\u0644\u0631\u0639\u062f",
    verses: 43,
  },
  {
    number: 14,
    name: "Ibrahim",
    arabic: "\u0625\u0628\u0631\u0627\u0647\u064a\u0645",
    verses: 52,
  },
  {
    number: 15,
    name: "Al-Hijr",
    arabic: "\u0627\u0644\u062d\u062c\u0631",
    verses: 99,
  },
  {
    number: 16,
    name: "An-Nahl",
    arabic: "\u0627\u0644\u0646\u062d\u0644",
    verses: 128,
  },
  {
    number: 17,
    name: "Al-Isra",
    arabic: "\u0627\u0644\u0625\u0633\u0631\u0627\u0621",
    verses: 111,
  },
  {
    number: 18,
    name: "Al-Kahf",
    arabic: "\u0627\u0644\u0643\u0647\u0641",
    verses: 110,
  },
  {
    number: 19,
    name: "Maryam",
    arabic: "\u0645\u0631\u064a\u0645",
    verses: 98,
  },
  { number: 20, name: "Taha", arabic: "\u0637\u0647", verses: 135 },
  {
    number: 21,
    name: "Al-Anbiya",
    arabic: "\u0627\u0644\u0623\u0646\u0628\u064a\u0627\u0621",
    verses: 112,
  },
  {
    number: 22,
    name: "Al-Hajj",
    arabic: "\u0627\u0644\u062d\u062c",
    verses: 78,
  },
  {
    number: 23,
    name: "Al-Mu'minun",
    arabic: "\u0627\u0644\u0645\u0624\u0645\u0646\u0648\u0646",
    verses: 118,
  },
  {
    number: 24,
    name: "An-Nur",
    arabic: "\u0627\u0644\u0646\u0648\u0631",
    verses: 64,
  },
  {
    number: 25,
    name: "Al-Furqan",
    arabic: "\u0627\u0644\u0641\u0631\u0642\u0627\u0646",
    verses: 77,
  },
  {
    number: 26,
    name: "Ash-Shu'ara",
    arabic: "\u0627\u0644\u0634\u0639\u0631\u0627\u0621",
    verses: 227,
  },
  {
    number: 27,
    name: "An-Naml",
    arabic: "\u0627\u0644\u0646\u0645\u0644",
    verses: 93,
  },
  {
    number: 28,
    name: "Al-Qasas",
    arabic: "\u0627\u0644\u0642\u0635\u0635",
    verses: 88,
  },
  {
    number: 29,
    name: "Al-Ankabut",
    arabic: "\u0627\u0644\u0639\u0646\u0643\u0628\u0648\u062a",
    verses: 69,
  },
  {
    number: 30,
    name: "Ar-Rum",
    arabic: "\u0627\u0644\u0631\u0648\u0645",
    verses: 60,
  },
  {
    number: 31,
    name: "Luqman",
    arabic: "\u0644\u0642\u0645\u0627\u0646",
    verses: 34,
  },
  {
    number: 32,
    name: "As-Sajdah",
    arabic: "\u0627\u0644\u0633\u062c\u062f\u0629",
    verses: 30,
  },
  {
    number: 33,
    name: "Al-Ahzab",
    arabic: "\u0627\u0644\u0623\u062d\u0632\u0627\u0628",
    verses: 73,
  },
  { number: 34, name: "Saba", arabic: "\u0633\u0628\u0623", verses: 54 },
  { number: 35, name: "Fatir", arabic: "\u0641\u0627\u0637\u0631", verses: 45 },
  { number: 36, name: "Ya-Sin", arabic: "\u064a\u0633", verses: 83 },
  {
    number: 37,
    name: "As-Saffat",
    arabic: "\u0627\u0644\u0635\u0627\u0641\u0627\u062a",
    verses: 182,
  },
  { number: 38, name: "Sad", arabic: "\u0635", verses: 88 },
  {
    number: 39,
    name: "Az-Zumar",
    arabic: "\u0627\u0644\u0632\u0645\u0631",
    verses: 75,
  },
  {
    number: 40,
    name: "Ghafir",
    arabic: "\u063a\u0627\u0641\u0631",
    verses: 85,
  },
  {
    number: 41,
    name: "Fussilat",
    arabic: "\u0641\u0635\u0644\u062a",
    verses: 54,
  },
  {
    number: 42,
    name: "Ash-Shura",
    arabic: "\u0627\u0644\u0634\u0648\u0631\u0649",
    verses: 53,
  },
  {
    number: 43,
    name: "Az-Zukhruf",
    arabic: "\u0627\u0644\u0632\u062e\u0631\u0641",
    verses: 89,
  },
  {
    number: 44,
    name: "Ad-Dukhan",
    arabic: "\u0627\u0644\u062f\u062e\u0627\u0646",
    verses: 59,
  },
  {
    number: 45,
    name: "Al-Jathiyah",
    arabic: "\u0627\u0644\u062c\u0627\u062b\u064a\u0629",
    verses: 37,
  },
  {
    number: 46,
    name: "Al-Ahqaf",
    arabic: "\u0627\u0644\u0623\u062d\u0642\u0627\u0641",
    verses: 35,
  },
  {
    number: 47,
    name: "Muhammad",
    arabic: "\u0645\u062d\u0645\u062f",
    verses: 38,
  },
  {
    number: 48,
    name: "Al-Fath",
    arabic: "\u0627\u0644\u0641\u062a\u062d",
    verses: 29,
  },
  {
    number: 49,
    name: "Al-Hujurat",
    arabic: "\u0627\u0644\u062d\u062c\u0631\u0627\u062a",
    verses: 18,
  },
  { number: 50, name: "Qaf", arabic: "\u0642", verses: 45 },
  {
    number: 51,
    name: "Adh-Dhariyat",
    arabic: "\u0627\u0644\u0630\u0627\u0631\u064a\u0627\u062a",
    verses: 60,
  },
  {
    number: 52,
    name: "At-Tur",
    arabic: "\u0627\u0644\u0637\u0648\u0631",
    verses: 49,
  },
  {
    number: 53,
    name: "An-Najm",
    arabic: "\u0627\u0644\u0646\u062c\u0645",
    verses: 62,
  },
  {
    number: 54,
    name: "Al-Qamar",
    arabic: "\u0627\u0644\u0642\u0645\u0631",
    verses: 55,
  },
  {
    number: 55,
    name: "Ar-Rahman",
    arabic: "\u0627\u0644\u0631\u062d\u0645\u0646",
    verses: 78,
  },
  {
    number: 56,
    name: "Al-Waqi'ah",
    arabic: "\u0627\u0644\u0648\u0627\u0642\u0639\u0629",
    verses: 96,
  },
  {
    number: 57,
    name: "Al-Hadid",
    arabic: "\u0627\u0644\u062d\u062f\u064a\u062f",
    verses: 29,
  },
  {
    number: 58,
    name: "Al-Mujadila",
    arabic: "\u0627\u0644\u0645\u062c\u0627\u062f\u0644\u0629",
    verses: 22,
  },
  {
    number: 59,
    name: "Al-Hashr",
    arabic: "\u0627\u0644\u062d\u0634\u0631",
    verses: 24,
  },
  {
    number: 60,
    name: "Al-Mumtahanah",
    arabic: "\u0627\u0644\u0645\u0645\u062a\u062d\u0646\u0629",
    verses: 13,
  },
  {
    number: 61,
    name: "As-Saff",
    arabic: "\u0627\u0644\u0635\u0641",
    verses: 14,
  },
  {
    number: 62,
    name: "Al-Jumu'ah",
    arabic: "\u0627\u0644\u062c\u0645\u0639\u0629",
    verses: 11,
  },
  {
    number: 63,
    name: "Al-Munafiqun",
    arabic: "\u0627\u0644\u0645\u0646\u0627\u0641\u0642\u0648\u0646",
    verses: 11,
  },
  {
    number: 64,
    name: "At-Taghabun",
    arabic: "\u0627\u0644\u062a\u063a\u0627\u0628\u0646",
    verses: 18,
  },
  {
    number: 65,
    name: "At-Talaq",
    arabic: "\u0627\u0644\u0637\u0644\u0627\u0642",
    verses: 12,
  },
  {
    number: 66,
    name: "At-Tahrim",
    arabic: "\u0627\u0644\u062a\u062d\u0631\u064a\u0645",
    verses: 12,
  },
  {
    number: 67,
    name: "Al-Mulk",
    arabic: "\u0627\u0644\u0645\u0644\u0643",
    verses: 30,
  },
  {
    number: 68,
    name: "Al-Qalam",
    arabic: "\u0627\u0644\u0642\u0644\u0645",
    verses: 52,
  },
  {
    number: 69,
    name: "Al-Haqqah",
    arabic: "\u0627\u0644\u062d\u0627\u0642\u0629",
    verses: 52,
  },
  {
    number: 70,
    name: "Al-Ma'arij",
    arabic: "\u0627\u0644\u0645\u0639\u0627\u0631\u062c",
    verses: 44,
  },
  { number: 71, name: "Nuh", arabic: "\u0646\u0648\u062d", verses: 28 },
  {
    number: 72,
    name: "Al-Jinn",
    arabic: "\u0627\u0644\u062c\u0646",
    verses: 28,
  },
  {
    number: 73,
    name: "Al-Muzzammil",
    arabic: "\u0627\u0644\u0645\u0632\u0645\u0644",
    verses: 20,
  },
  {
    number: 74,
    name: "Al-Muddaththir",
    arabic: "\u0627\u0644\u0645\u062f\u062b\u0631",
    verses: 56,
  },
  {
    number: 75,
    name: "Al-Qiyamah",
    arabic: "\u0627\u0644\u0642\u064a\u0627\u0645\u0629",
    verses: 40,
  },
  {
    number: 76,
    name: "Al-Insan",
    arabic: "\u0627\u0644\u0625\u0646\u0633\u0627\u0646",
    verses: 31,
  },
  {
    number: 77,
    name: "Al-Mursalat",
    arabic: "\u0627\u0644\u0645\u0631\u0633\u0644\u0627\u062a",
    verses: 50,
  },
  {
    number: 78,
    name: "An-Naba",
    arabic: "\u0627\u0644\u0646\u0628\u0623",
    verses: 40,
  },
  {
    number: 79,
    name: "An-Nazi'at",
    arabic: "\u0627\u0644\u0646\u0627\u0632\u0639\u0627\u062a",
    verses: 46,
  },
  { number: 80, name: "Abasa", arabic: "\u0639\u0628\u0633", verses: 42 },
  {
    number: 81,
    name: "At-Takwir",
    arabic: "\u0627\u0644\u062a\u0643\u0648\u064a\u0631",
    verses: 29,
  },
  {
    number: 82,
    name: "Al-Infitar",
    arabic: "\u0627\u0644\u0627\u0646\u0641\u0637\u0627\u0631",
    verses: 19,
  },
  {
    number: 83,
    name: "Al-Mutaffifin",
    arabic: "\u0627\u0644\u0645\u0637\u0641\u0641\u064a\u0646",
    verses: 36,
  },
  {
    number: 84,
    name: "Al-Inshiqaq",
    arabic: "\u0627\u0644\u0627\u0646\u0634\u0642\u0627\u0642",
    verses: 25,
  },
  {
    number: 85,
    name: "Al-Buruj",
    arabic: "\u0627\u0644\u0628\u0631\u0648\u062c",
    verses: 22,
  },
  {
    number: 86,
    name: "At-Tariq",
    arabic: "\u0627\u0644\u0637\u0627\u0631\u0642",
    verses: 17,
  },
  {
    number: 87,
    name: "Al-A'la",
    arabic: "\u0627\u0644\u0623\u0639\u0644\u0649",
    verses: 19,
  },
  {
    number: 88,
    name: "Al-Ghashiyah",
    arabic: "\u0627\u0644\u063a\u0627\u0634\u064a\u0629",
    verses: 26,
  },
  {
    number: 89,
    name: "Al-Fajr",
    arabic: "\u0627\u0644\u0641\u062c\u0631",
    verses: 30,
  },
  {
    number: 90,
    name: "Al-Balad",
    arabic: "\u0627\u0644\u0628\u0644\u062f",
    verses: 20,
  },
  {
    number: 91,
    name: "Ash-Shams",
    arabic: "\u0627\u0644\u0634\u0645\u0633",
    verses: 15,
  },
  {
    number: 92,
    name: "Al-Layl",
    arabic: "\u0627\u0644\u0644\u064a\u0644",
    verses: 21,
  },
  {
    number: 93,
    name: "Ad-Duha",
    arabic: "\u0627\u0644\u0636\u062d\u0649",
    verses: 11,
  },
  {
    number: 94,
    name: "Ash-Sharh",
    arabic: "\u0627\u0644\u0634\u0631\u062d",
    verses: 8,
  },
  {
    number: 95,
    name: "At-Tin",
    arabic: "\u0627\u0644\u062a\u064a\u0646",
    verses: 8,
  },
  {
    number: 96,
    name: "Al-Alaq",
    arabic: "\u0627\u0644\u0639\u0644\u0642",
    verses: 19,
  },
  {
    number: 97,
    name: "Al-Qadr",
    arabic: "\u0627\u0644\u0642\u062f\u0631",
    verses: 5,
  },
  {
    number: 98,
    name: "Al-Bayyinah",
    arabic: "\u0627\u0644\u0628\u064a\u0646\u0629",
    verses: 8,
  },
  {
    number: 99,
    name: "Az-Zalzalah",
    arabic: "\u0627\u0644\u0632\u0644\u0632\u0644\u0629",
    verses: 8,
  },
  {
    number: 100,
    name: "Al-Adiyat",
    arabic: "\u0627\u0644\u0639\u0627\u062f\u064a\u0627\u062a",
    verses: 11,
  },
  {
    number: 101,
    name: "Al-Qari'ah",
    arabic: "\u0627\u0644\u0642\u0627\u0631\u0639\u0629",
    verses: 11,
  },
  {
    number: 102,
    name: "At-Takathur",
    arabic: "\u0627\u0644\u062a\u0643\u0627\u062b\u0631",
    verses: 8,
  },
  {
    number: 103,
    name: "Al-Asr",
    arabic: "\u0627\u0644\u0639\u0635\u0631",
    verses: 3,
  },
  {
    number: 104,
    name: "Al-Humazah",
    arabic: "\u0627\u0644\u0647\u0645\u0632\u0629",
    verses: 9,
  },
  {
    number: 105,
    name: "Al-Fil",
    arabic: "\u0627\u0644\u0641\u064a\u0644",
    verses: 5,
  },
  {
    number: 106,
    name: "Quraysh",
    arabic: "\u0642\u0631\u064a\u0634",
    verses: 4,
  },
  {
    number: 107,
    name: "Al-Ma'un",
    arabic: "\u0627\u0644\u0645\u0627\u0639\u0648\u0646",
    verses: 7,
  },
  {
    number: 108,
    name: "Al-Kawthar",
    arabic: "\u0627\u0644\u0643\u0648\u062b\u0631",
    verses: 3,
  },
  {
    number: 109,
    name: "Al-Kafirun",
    arabic: "\u0627\u0644\u0643\u0627\u0641\u0631\u0648\u0646",
    verses: 6,
  },
  {
    number: 110,
    name: "An-Nasr",
    arabic: "\u0627\u0644\u0646\u0635\u0631",
    verses: 3,
  },
  {
    number: 111,
    name: "Al-Masad",
    arabic: "\u0627\u0644\u0645\u0633\u062f",
    verses: 5,
  },
  {
    number: 112,
    name: "Al-Ikhlas",
    arabic: "\u0627\u0644\u0625\u062e\u0644\u0627\u0635",
    verses: 4,
  },
  {
    number: 113,
    name: "Al-Falaq",
    arabic: "\u0627\u0644\u0641\u0644\u0642",
    verses: 5,
  },
  {
    number: 114,
    name: "An-Nas",
    arabic: "\u0627\u0644\u0646\u0627\u0633",
    verses: 6,
  },
];

const VERSE_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20,
  56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21,
  11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

const HIFZ_RECITERS = [
  {
    id: "7",
    name: "Mishary Rashid Alafasy",
    recitationId: 7,
    cdnPath: "ar.alafasy",
    bitrate: 128,
    everyayahFolder: "Alafasy_128kbps",
  },
  {
    id: "1",
    name: "Abdul Basit (Mujawwad)",
    recitationId: 1,
    cdnPath: "ar.abdulbasitmujawwad",
    bitrate: 128,
    everyayahFolder: "Abdul_Basit_Mujawwad_128kbps",
  },
];

function getAbsoluteVerseNumber(
  surahNumber: number,
  verseNumber: number,
): number {
  let total = 0;
  for (let i = 0; i < surahNumber - 1; i++) {
    total += VERSE_COUNTS[i];
  }
  return total + verseNumber;
}

function getHifzAudioUrl(surahNumber: number, verseNumber: number): string {
  const reciter = HIFZ_RECITERS[0];
  const absoluteVerse = getAbsoluteVerseNumber(surahNumber, verseNumber);
  return `https://cdn.islamic.network/quran/audio/${reciter.bitrate}/${reciter.cdnPath}/${absoluteVerse}.mp3`;
}

function getHifzFallbackUrl(surahNumber: number, verseNumber: number): string {
  const reciter = HIFZ_RECITERS[0];
  const surahPad = String(surahNumber).padStart(3, "0");
  const versePad = String(verseNumber).padStart(3, "0");
  return `https://everyayah.com/data/${reciter.everyayahFolder}/${surahPad}${versePad}.mp3`;
}

interface HifzProgress {
  memorized: number[];
  reviewing: number[];
  lastPracticed: string;
}

interface HifzMistake {
  surahNumber: number;
  verseNumber: number;
  note: string;
  timestamp: string;
}

type DailyActivity = Record<string, number>;

function getHeatmapData(
  activityData: DailyActivity,
): { date: string; count: number }[] {
  const days: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    days.push({ date: key, count: activityData[key] || 0 });
  }
  return days;
}

function getHeatmapColor(count: number, theme: any): string {
  if (count === 0) return `${theme.textMuted}10`;
  if (count <= 2) return `${theme.primary}30`;
  if (count <= 5) return `${theme.primary}60`;
  return theme.primary;
}

function getMonthLabels(
  days: { date: string }[],
): { label: string; index: number }[] {
  const months: { label: string; index: number }[] = [];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  let lastMonth = -1;
  for (let i = 0; i < days.length; i++) {
    const month = new Date(days[i].date).getMonth();
    if (month !== lastMonth) {
      months.push({ label: monthNames[month], index: Math.floor(i / 7) });
      lastMonth = month;
    }
  }
  return months;
}

function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const monthsDiff = Math.floor(days / 30);
  return `${monthsDiff}mo ago`;
}

interface PracticeVerse {
  verseNumber: number;
  arabic: string;
  translation: string;
}

type PracticeMode = "read" | "hide" | "test";
type ScreenView = "overview" | "practice";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

async function loadProgress(surahNumber: number): Promise<HifzProgress> {
  try {
    const raw = await AsyncStorage.getItem(`hifz_progress_${surahNumber}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { memorized: [], reviewing: [], lastPracticed: "" };
}

async function saveProgress(
  surahNumber: number,
  progress: HifzProgress,
): Promise<void> {
  const json = JSON.stringify(progress);
  await syncedSetItem(`hifz_progress_${surahNumber}`, json);
}

async function loadAllProgress(): Promise<Record<number, HifzProgress>> {
  const result: Record<number, HifzProgress> = {};
  try {
    const keys = SURAH_NAMES.map((s) => `hifz_progress_${s.number}`);
    const pairs = await AsyncStorage.multiGet(keys);
    for (const [key, value] of pairs) {
      if (value) {
        const num = parseInt(key.replace("hifz_progress_", ""), 10);
        if (!isNaN(num)) {
          result[num] = JSON.parse(value);
        }
      }
    }
  } catch {}
  return result;
}

function getPercentageBadgeColor(
  pct: number,
  isDark: boolean,
  primary: string,
): string {
  if (pct >= 100) return primary;
  if (pct > 50) return primary;
  if (pct > 0) return isDark ? "#FBBF24" : "#D97706";
  return isDark ? "rgba(255, 255, 255, 0.62)" : "#8B99AB";
}

function needsReview(progress: HifzProgress): boolean {
  if (progress.memorized.length === 0 && progress.reviewing.length === 0)
    return false;
  if (!progress.lastPracticed) return true;
  const last = new Date(progress.lastPracticed).getTime();
  return Date.now() - last >= THREE_DAYS_MS;
}

function getSortPriority(progress: HifzProgress): number {
  if (progress.reviewing.length > 0) return 0;
  if (progress.memorized.length > 0 && needsReview(progress)) return 1;
  if (progress.memorized.length > 0) return 2;
  return 3;
}

export default function HifzScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [view, setView] = useState<ScreenView>("overview");
  const [allProgress, setAllProgress] = useState<Record<number, HifzProgress>>(
    {},
  );
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("read");
  const [verses, setVerses] = useState<PracticeVerse[]>([]);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<HifzProgress>({
    memorized: [],
    reviewing: [],
    lastPracticed: "",
  });
  const [showStats, setShowStats] = useState(false);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity>({});
  const [mistakes, setMistakes] = useState<HifzMistake[]>([]);
  const [playingVerse, setPlayingVerse] = useState<number | null>(null);
  const [audioState, setAudioState] = useState<TransportState>("idle");
  const [srStats, setSrStats] = useState<HifzSRStats>({
    newToday: 5,
    dueReviews: 0,
    totalLearning: 0,
    totalMastered: 0,
    totalVerses: 0,
  });
  const [, setDueVerses] = useState<SM2VerseData[]>([]);

  useEffect(() => {
    transportSetCallbacks({
      onStateChange: (s) => setAudioState(s),
      onFinish: () => {
        setPlayingVerse(null);
        setAudioState("idle");
      },
      onError: () => {
        setPlayingVerse(null);
        setAudioState("idle");
      },
    });
    return () => {
      transportTeardown();
    };
  }, []);

  const refreshSRStats = useCallback(async () => {
    const [stats, due] = await Promise.all([getStats(), getDueVerses()]);
    setSrStats(stats);
    setDueVerses(due);
  }, []);

  useEffect(() => {
    loadAllProgress().then(setAllProgress);
    refreshSRStats();
    AsyncStorage.getItem("hifz_daily_activity").then((raw) => {
      if (raw) {
        try {
          setDailyActivity(JSON.parse(raw));
        } catch {}
      }
    });
    AsyncStorage.getItem("hifz_mistakes").then((raw) => {
      if (raw) {
        try {
          const parsed: HifzMistake[] = JSON.parse(raw);
          setMistakes(
            parsed
              .sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime(),
              )
              .slice(0, 10),
          );
        } catch {}
      }
    });
  }, [refreshSRStats]);

  const totalMemorized = Object.values(allProgress).reduce(
    (sum, p) => sum + p.memorized.length,
    0,
  );

  const sortedSurahs = [...SURAH_NAMES].sort((a, b) => {
    const pa = allProgress[a.number] || {
      memorized: [],
      reviewing: [],
      lastPracticed: "",
    };
    const pb = allProgress[b.number] || {
      memorized: [],
      reviewing: [],
      lastPracticed: "",
    };
    const prioA = getSortPriority(pa);
    const prioB = getSortPriority(pb);
    if (prioA !== prioB) return prioA - prioB;
    return a.number - b.number;
  });

  const playVerseAudio = useCallback(
    (surahNum: number, verseNum: number) => {
      if (playingVerse === verseNum && audioState === "playing") {
        transportStop();
        setPlayingVerse(null);
        return;
      }
      setPlayingVerse(verseNum);
      const url = getHifzAudioUrl(surahNum, verseNum);
      const fallback = getHifzFallbackUrl(surahNum, verseNum);
      transportPlay(url, fallback);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [playingVerse, audioState],
  );

  const openPractice = useCallback(async (surahNumber: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    transportStop();
    setPlayingVerse(null);
    setSelectedSurah(surahNumber);
    setView("practice");
    setCurrentVerseIndex(0);
    setRevealed(false);
    setPracticeMode("read");
    setLoading(true);

    const progress = await loadProgress(surahNumber);
    setCurrentProgress(progress);

    try {
      const [arabicRes, translationRes] = await Promise.all([
        fetch(
          `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahNumber}`,
        ),
        fetch(
          `https://api.quran.com/api/v4/quran/translations/131?chapter_number=${surahNumber}`,
        ),
      ]);
      const arabicData = await arabicRes.json();
      const translationData = await translationRes.json();

      const combined: PracticeVerse[] = (arabicData.verses || []).map(
        (v: any, i: number) => ({
          verseNumber: i + 1,
          arabic: v.text_uthmani || "",
          translation:
            translationData.translations?.[i]?.text
              ?.replace(/<sup[^>]*>.*?<\/sup>/gi, "")
              .replace(/<[^>]*>/g, "")
              .replace(/\s{2,}/g, " ")
              .trim() || "",
        }),
      );
      setVerses(combined);
    } catch {
      setVerses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const closePractice = useCallback(() => {
    transportStop();
    setPlayingVerse(null);
    setView("overview");
    loadAllProgress().then(setAllProgress);
    refreshSRStats();
  }, [refreshSRStats]);

  const goNextVerse = useCallback(() => {
    setRevealed(false);
    if (currentVerseIndex < verses.length - 1) {
      setCurrentVerseIndex((i) => i + 1);
    }
  }, [currentVerseIndex, verses.length]);

  const markMemorized = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const verse = verses[currentVerseIndex];
    if (!verse) return;
    const updated = { ...currentProgress };
    if (!updated.memorized.includes(verse.verseNumber)) {
      updated.memorized = [...updated.memorized, verse.verseNumber];
    }
    updated.reviewing = updated.reviewing.filter(
      (v) => v !== verse.verseNumber,
    );
    updated.lastPracticed = new Date().toISOString();
    setCurrentProgress(updated);
    await saveProgress(selectedSurah, updated);
    await addVersesToSR(selectedSurah, [verse.verseNumber]);
    await recordReview(
      selectedSurah,
      verse.verseNumber,
      qualityFromAction("memorized"),
    );
    goNextVerse();
  }, [currentProgress, currentVerseIndex, goNextVerse, selectedSurah, verses]);

  const markNeedsPractice = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const verse = verses[currentVerseIndex];
    if (!verse) return;
    const updated = { ...currentProgress };
    if (!updated.reviewing.includes(verse.verseNumber)) {
      updated.reviewing = [...updated.reviewing, verse.verseNumber];
    }
    updated.memorized = updated.memorized.filter(
      (v) => v !== verse.verseNumber,
    );
    updated.lastPracticed = new Date().toISOString();
    setCurrentProgress(updated);
    await saveProgress(selectedSurah, updated);
    await addVersesToSR(selectedSurah, [verse.verseNumber]);
    await recordReview(
      selectedSurah,
      verse.verseNumber,
      qualityFromAction("needsPractice"),
    );
    goNextVerse();
  }, [currentProgress, currentVerseIndex, goNextVerse, selectedSurah, verses]);

  const goPrevVerse = useCallback(() => {
    setRevealed(false);
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex((i) => i - 1);
    }
  }, [currentVerseIndex]);

  const currentVerse = verses[currentVerseIndex];
  const surahInfo = SURAH_NAMES.find((s) => s.number === selectedSurah);

  const getHiddenText = (arabic: string) => {
    const words = arabic.split(" ");
    const showCount = Math.max(1, Math.floor(words.length * 0.3));
    return {
      visible: words.slice(0, showCount).join(" "),
      hidden: words.slice(showCount).join(" "),
    };
  };

  const isVerseMemorized = (verseNum: number) =>
    currentProgress.memorized.includes(verseNum);
  const isVerseReviewing = (verseNum: number) =>
    currentProgress.reviewing.includes(verseNum);

  const renderSurahItem = useCallback(
    ({ item, index }: { item: (typeof SURAH_NAMES)[0]; index: number }) => {
      const progress = allProgress[item.number] || {
        memorized: [],
        reviewing: [],
        lastPracticed: "",
      };
      const memorizedCount = progress.memorized.length;
      const pct =
        item.verses > 0 ? Math.round((memorizedCount / item.verses) * 100) : 0;
      const review = needsReview(progress);
      const badgeColor = getPercentageBadgeColor(pct, isDark, theme.primary);
      const isLearning =
        progress.reviewing.length > 0 ||
        (memorizedCount > 0 && memorizedCount < item.verses);

      return (
        <Animated.View
          entering={FadeInDown.delay(Math.min(index * 30, 600)).duration(300)}
        >
          <Pressable
            style={({ pressed }) => [
              styles.surahCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: isLearning ? theme.primary : theme.borderSubtle,
                borderWidth: isLearning ? 1.5 : 1,
              },
              pressed ? { opacity: 0.8 } : null,
            ]}
            onPress={() => openPractice(item.number)}
            testID={`surah-card-${item.number}`}
          >
            <View style={styles.surahCardTop}>
              <View
                style={[
                  styles.surahNumber,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundTertiary
                      : theme.backgroundSecondary,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ fontWeight: "700", color: theme.textSecondary }}
                >
                  {item.number}
                </ThemedText>
              </View>
              <View style={styles.surahInfo}>
                <ThemedText style={styles.surahName}>{item.name}</ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  {item.verses} verses
                </ThemedText>
              </View>
              <View style={styles.surahRight}>
                <ThemedText style={styles.surahArabic}>
                  {item.arabic}
                </ThemedText>
                {review ? (
                  <View
                    style={[
                      styles.reviewBadge,
                      { backgroundColor: isDark ? "#451A03" : "#FFFBEB" },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{
                        color: isDark ? "#FBBF24" : "#D97706",
                        fontWeight: "600",
                        fontSize: 10,
                      }}
                    >
                      Review today
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.progressRow}>
              <View
                style={[
                  styles.progressBarBg,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundTertiary
                      : theme.backgroundSecondary,
                  },
                ]}
              >
                {pct > 0 ? (
                  <LinearGradient
                    colors={[theme.gradientStart, theme.gradientMid]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(pct, 100)}%` as any },
                    ]}
                  />
                ) : null}
              </View>
              <View
                style={[
                  styles.pctBadge,
                  { backgroundColor: `${badgeColor}20` },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ color: badgeColor, fontWeight: "700", fontSize: 11 }}
                >
                  {pct}%
                </ThemedText>
              </View>
            </View>

            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginTop: 2 }}
            >
              {memorizedCount} of {item.verses} memorized
            </ThemedText>
          </Pressable>
        </Animated.View>
      );
    },
    [allProgress, isDark, theme, openPractice],
  );

  if (view === "practice") {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed ? { opacity: 0.6 } : null,
            ]}
            onPress={closePractice}
            hitSlop={8}
          >
            <AppIcon name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText type="h4">
              {surahInfo?.name || `Surah ${selectedSurah}`}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {surahInfo?.arabic}
            </ThemedText>
          </View>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.segmentRow}>
          {(["read", "hide", "test"] as PracticeMode[]).map((mode) => (
            <Pressable
              key={mode}
              style={[
                styles.segmentButton,
                {
                  backgroundColor:
                    practiceMode === mode
                      ? theme.primary
                      : isDark
                        ? theme.backgroundTertiary
                        : theme.backgroundSecondary,
                },
              ]}
              onPress={() => {
                setPracticeMode(mode);
                setRevealed(false);
                Haptics.selectionAsync();
              }}
            >
              <ThemedText
                type="caption"
                style={{
                  color:
                    practiceMode === mode ? "#FFFFFF" : theme.textSecondary,
                  fontWeight: "600",
                }}
              >
                {mode === "read"
                  ? "Read"
                  : mode === "hide"
                    ? "Hide & Reveal"
                    : "Test"}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: Spacing.md }}
            >
              Loading verses...
            </ThemedText>
          </View>
        ) : currentVerse ? (
          <View style={styles.practiceContent}>
            <View style={styles.verseIndicator}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Verse {currentVerse.verseNumber} of {verses.length}
              </ThemedText>
              {isVerseMemorized(currentVerse.verseNumber) ? (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: theme.primaryMuted },
                  ]}
                >
                  <AppIcon
                    name="check-circle"
                    size={12}
                    color={theme.primary}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.primary,
                      fontWeight: "600",
                      marginLeft: 4,
                    }}
                  >
                    Memorized
                  </ThemedText>
                </View>
              ) : isVerseReviewing(currentVerse.verseNumber) ? (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: isDark ? "#451A03" : "#FFFBEB" },
                  ]}
                >
                  <AppIcon
                    name="rotate-cw"
                    size={12}
                    color={isDark ? "#FBBF24" : "#D97706"}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: isDark ? "#FBBF24" : "#D97706",
                      fontWeight: "600",
                      marginLeft: 4,
                    }}
                  >
                    Reviewing
                  </ThemedText>
                </View>
              ) : null}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.playAudioButton,
                {
                  backgroundColor:
                    playingVerse === currentVerse.verseNumber &&
                    audioState === "playing"
                      ? theme.primary
                      : theme.primaryMuted,
                },
                pressed ? { opacity: 0.7 } : null,
              ]}
              onPress={() =>
                playVerseAudio(selectedSurah, currentVerse.verseNumber)
              }
              testID={`button-play-verse-${currentVerse.verseNumber}`}
            >
              {audioState === "loading" &&
              playingVerse === currentVerse.verseNumber ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <AppIcon
                  name={
                    playingVerse === currentVerse.verseNumber &&
                    audioState === "playing"
                      ? "pause"
                      : "play"
                  }
                  size={18}
                  color={
                    playingVerse === currentVerse.verseNumber &&
                    audioState === "playing"
                      ? "#FFFFFF"
                      : theme.primary
                  }
                />
              )}
              <ThemedText
                type="small"
                style={{
                  color:
                    playingVerse === currentVerse.verseNumber &&
                    audioState === "playing"
                      ? "#FFFFFF"
                      : theme.primary,
                  fontWeight: "600",
                  marginLeft: 8,
                }}
              >
                {playingVerse === currentVerse.verseNumber &&
                audioState === "playing"
                  ? "Pause"
                  : "Listen to Qari"}
              </ThemedText>
            </Pressable>

            <View
              style={[
                styles.verseCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              {practiceMode === "read" ? (
                <>
                  <ThemedText style={styles.arabicText}>
                    {currentVerse.arabic}
                  </ThemedText>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: theme.borderSubtle },
                    ]}
                  />
                  <ThemedText
                    type="body"
                    style={{ color: theme.textSecondary, lineHeight: 24 }}
                  >
                    {currentVerse.translation}
                  </ThemedText>
                </>
              ) : practiceMode === "hide" ? (
                <>
                  {(() => {
                    const { visible, hidden } = getHiddenText(
                      currentVerse.arabic,
                    );
                    return (
                      <View>
                        <ThemedText style={styles.arabicText}>
                          {visible}{" "}
                          {revealed ? (
                            hidden
                          ) : (
                            <ThemedText
                              style={[
                                styles.arabicText,
                                {
                                  backgroundColor: isDark
                                    ? theme.backgroundTertiary
                                    : theme.backgroundTertiary,
                                  color: isDark
                                    ? theme.backgroundTertiary
                                    : theme.backgroundTertiary,
                                  borderRadius: 4,
                                },
                              ]}
                            >
                              {hidden}
                            </ThemedText>
                          )}
                        </ThemedText>
                      </View>
                    );
                  })()}
                  {!revealed ? (
                    <Pressable
                      style={[
                        styles.revealButton,
                        {
                          backgroundColor: theme.primaryMuted,
                        },
                      ]}
                      onPress={() => {
                        setRevealed(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <AppIcon name="eye" size={16} color={theme.primary} />
                      <ThemedText
                        type="small"
                        style={{
                          color: theme.primary,
                          fontWeight: "600",
                          marginLeft: 8,
                        }}
                      >
                        Tap to reveal
                      </ThemedText>
                    </Pressable>
                  ) : null}
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: theme.borderSubtle },
                    ]}
                  />
                  <ThemedText
                    type="body"
                    style={{ color: theme.textSecondary, lineHeight: 24 }}
                  >
                    {currentVerse.translation}
                  </ThemedText>
                </>
              ) : (
                <>
                  <View style={styles.testHeader}>
                    <ThemedText
                      type="h3"
                      style={{ color: theme.textSecondary }}
                    >
                      Verse {currentVerse.verseNumber}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.textMuted,
                        marginTop: Spacing.xs,
                      }}
                    >
                      Recite this verse from memory
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: theme.borderSubtle },
                    ]}
                  />
                  <ThemedText
                    type="body"
                    style={{ color: theme.textSecondary, lineHeight: 24 }}
                  >
                    {currentVerse.translation}
                  </ThemedText>
                </>
              )}
            </View>

            {practiceMode === "test" ||
            (practiceMode === "hide" && revealed) ? (
              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: theme.primaryMuted,
                    },
                    pressed ? { opacity: 0.7 } : null,
                  ]}
                  onPress={markMemorized}
                  testID="button-memorized"
                >
                  <AppIcon name="check" size={20} color={theme.primary} />
                  <ThemedText
                    type="small"
                    style={{
                      color: theme.primary,
                      fontWeight: "600",
                      marginLeft: 8,
                    }}
                  >
                    I got it
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: isDark ? "#451A03" : "#FFFBEB",
                    },
                    pressed ? { opacity: 0.7 } : null,
                  ]}
                  onPress={markNeedsPractice}
                  testID="button-needs-practice"
                >
                  <AppIcon
                    name="x"
                    size={20}
                    color={isDark ? "#FBBF24" : "#D97706"}
                  />
                  <ThemedText
                    type="small"
                    style={{
                      color: isDark ? "#FBBF24" : "#D97706",
                      fontWeight: "600",
                      marginLeft: 8,
                    }}
                  >
                    Need practice
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}

            <View
              style={[
                styles.navRow,
                { paddingBottom: insets.bottom + Spacing.md },
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.navButton,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                    opacity: currentVerseIndex === 0 ? 0.4 : pressed ? 0.7 : 1,
                  },
                ]}
                onPress={goPrevVerse}
                disabled={currentVerseIndex === 0}
              >
                <AppIcon name="chevron-left" size={20} color={theme.text} />
                <ThemedText
                  type="small"
                  style={{ marginLeft: 4, fontWeight: "500" }}
                >
                  Previous
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.navButton,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                    opacity:
                      currentVerseIndex >= verses.length - 1
                        ? 0.4
                        : pressed
                          ? 0.7
                          : 1,
                  },
                ]}
                onPress={goNextVerse}
                disabled={currentVerseIndex >= verses.length - 1}
              >
                <ThemedText
                  type="small"
                  style={{ marginRight: 4, fontWeight: "500" }}
                >
                  Next
                </ThemedText>
                <AppIcon name="chevron-right" size={20} color={theme.text} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              No verses available
            </ThemedText>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed ? { opacity: 0.6 } : null,
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h4">Hifz Tracker</ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed ? { opacity: 0.6 } : null,
          ]}
          onPress={() => setShowStats(!showStats)}
          hitSlop={8}
        >
          <AppIcon name="bar-chart-2" size={22} color={theme.text} />
        </Pressable>
      </View>

      <FlatList
        data={sortedSurahs}
        keyExtractor={(item) => String(item.number)}
        renderItem={renderSurahItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.duration(400)}>
            <LinearGradient
              colors={
                isDark
                  ? [theme.gradientStart, theme.gradientMid]
                  : [theme.gradientLightBg, theme.gradientLightBg2]
              }
              style={styles.statsCard}
            >
              <GeometricCardPattern color={theme.primary} opacity={0.012} />
              <View style={styles.statsTop}>
                <HifzIconSvg
                  size={28}
                  color={theme.primary}
                  accentColor={theme.scholar}
                />
                <ThemedText
                  style={[styles.statsTitle, { color: theme.primaryText }]}
                >
                  Overall Progress
                </ThemedText>
              </View>
              <GoldDivider
                color={theme.scholar}
                opacity={0.42}
                style={styles.statsGoldDivider}
              />
              <View style={styles.statsNumbers}>
                <ThemedText type="h2" style={{ color: theme.primaryText }}>
                  {totalMemorized}
                </ThemedText>
                <ThemedText
                  type="body"
                  style={{
                    color: theme.primaryText,
                    marginLeft: Spacing.sm,
                  }}
                >
                  / {TOTAL_QURAN_VERSES} verses
                </ThemedText>
              </View>
              <View
                style={[
                  styles.overallBarBg,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(0,0,0,0.08)",
                  },
                ]}
              >
                {totalMemorized > 0 ? (
                  <LinearGradient
                    colors={[theme.gradientStart, theme.gradientMid]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.overallBarFill,
                      {
                        width: `${Math.min(
                          Math.round(
                            (totalMemorized / TOTAL_QURAN_VERSES) * 100,
                          ),
                          100,
                        )}%` as any,
                      },
                    ]}
                  />
                ) : null}
              </View>
              <ThemedText
                type="caption"
                style={{
                  color: theme.primaryText,
                  marginTop: Spacing.sm,
                }}
              >
                {Math.round((totalMemorized / TOTAL_QURAN_VERSES) * 100)}%
                complete
              </ThemedText>
            </LinearGradient>

            <Animated.View entering={FadeInDown.delay(100).duration(300)}>
              <View
                style={[
                  styles.srDashboard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                <View style={styles.srDashboardHeader}>
                  <AppIcon name="clock" size={16} color={theme.primary} />
                  <ThemedText
                    style={[styles.srDashboardTitle, { color: theme.text }]}
                  >
                    Review plan
                  </ThemedText>
                </View>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    marginTop: 2,
                    marginBottom: Spacing.sm,
                    lineHeight: 18,
                  }}
                >
                  We bring memorised verses back just before you would forget
                  them, so what you learn stays with you.
                </ThemedText>
                <View style={styles.srStatsRow}>
                  <View
                    style={[
                      styles.srStatBox,
                      { backgroundColor: theme.primaryMuted },
                    ]}
                  >
                    <ThemedText type="h3" style={{ color: theme.primary }}>
                      {srStats.newToday}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      New today
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.srStatBox,
                      { backgroundColor: isDark ? "#451A03" : "#FFFBEB" },
                    ]}
                  >
                    <ThemedText
                      type="h3"
                      style={{ color: isDark ? "#FBBF24" : "#D97706" }}
                    >
                      {srStats.dueReviews}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      To review
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.srStatBox,
                      {
                        backgroundColor: isDark
                          ? "rgba(96,165,250,0.15)"
                          : "#EFF6FF",
                      },
                    ]}
                  >
                    <ThemedText
                      type="h3"
                      style={{ color: isDark ? "#60A5FA" : "#2563EB" }}
                    >
                      {srStats.totalMastered}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      Mastered
                    </ThemedText>
                  </View>
                </View>
                {srStats.totalVerses > 0 ? (
                  <View style={styles.srProgressRow}>
                    <View
                      style={[
                        styles.progressBarBg,
                        {
                          backgroundColor: isDark
                            ? theme.backgroundTertiary
                            : theme.backgroundSecondary,
                        },
                      ]}
                    >
                      {srStats.totalMastered > 0 ? (
                        <LinearGradient
                          colors={[theme.gradientStart, theme.gradientMid]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.progressBarFill,
                            {
                              width:
                                `${Math.min(Math.round((srStats.totalMastered / srStats.totalVerses) * 100), 100)}%` as any,
                            },
                          ]}
                        />
                      ) : null}
                    </View>
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.textSecondary,
                        marginLeft: Spacing.sm,
                      }}
                    >
                      {srStats.totalLearning} learning
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </Animated.View>

            {showStats ? (
              <Animated.View entering={FadeInDown.duration(300)}>
                <View
                  style={[
                    styles.detailStatsCard,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.statItem}>
                    <AppIcon
                      name="check-circle"
                      size={16}
                      color={theme.primary}
                    />
                    <ThemedText type="small" style={{ marginLeft: Spacing.sm }}>
                      Surahs completed:{" "}
                      {
                        Object.entries(allProgress).filter(
                          ([num, p]) =>
                            p.memorized.length >=
                            (SURAH_NAMES.find((s) => s.number === parseInt(num))
                              ?.verses || 0),
                        ).length
                      }
                    </ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <AppIcon
                      name="book"
                      size={16}
                      color={isDark ? "#60A5FA" : "#2563EB"}
                    />
                    <ThemedText type="small" style={{ marginLeft: Spacing.sm }}>
                      Surahs in progress:{" "}
                      {
                        Object.values(allProgress).filter(
                          (p) =>
                            p.memorized.length > 0 || p.reviewing.length > 0,
                        ).length
                      }
                    </ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <AppIcon
                      name="rotate-cw"
                      size={16}
                      color={isDark ? "#FBBF24" : "#D97706"}
                    />
                    <ThemedText type="small" style={{ marginLeft: Spacing.sm }}>
                      Need review:{" "}
                      {
                        Object.values(allProgress).filter((p) => needsReview(p))
                          .length
                      }
                    </ThemedText>
                  </View>
                </View>
              </Animated.View>
            ) : null}

            <PremiumGate
              requiredTier="premium"
              featureLabel="Progress Heatmap"
              upgradeMessage={ENTITLEMENTS.hifzAnalytics.upgradeMessage}
              mode="replace"
            >
              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <View
                  style={[
                    styles.heatmapCard,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.heatmapHeader}>
                    <AppIcon name="activity" size={16} color={theme.primary} />
                    <ThemedText
                      style={[styles.heatmapTitle, { color: theme.text }]}
                    >
                      Progress Heatmap
                    </ThemedText>
                  </View>

                  {(() => {
                    const heatmapDays = getHeatmapData(dailyActivity);
                    const monthLabels = getMonthLabels(heatmapDays);
                    const weeks: { date: string; count: number }[][] = [];
                    for (let i = 0; i < heatmapDays.length; i += 7) {
                      weeks.push(heatmapDays.slice(i, i + 7));
                    }
                    const hasActivity = Object.keys(dailyActivity).length > 0;

                    return (
                      <>
                        <View style={styles.heatmapMonthRow}>
                          <View style={{ width: 28 }} />
                          {monthLabels.map((m, i) => (
                            <ThemedText
                              key={`month-${i}`}
                              type="caption"
                              style={[
                                styles.heatmapMonthLabel,
                                {
                                  color: theme.textMuted,
                                  left: m.index * 14,
                                },
                              ]}
                            >
                              {m.label}
                            </ThemedText>
                          ))}
                        </View>

                        <View style={styles.heatmapBody}>
                          <View style={styles.heatmapDayLabels}>
                            <ThemedText
                              type="caption"
                              style={[
                                styles.heatmapDayLabel,
                                { color: theme.textMuted },
                              ]}
                            >
                              Mon
                            </ThemedText>
                            <ThemedText
                              type="caption"
                              style={[
                                styles.heatmapDayLabel,
                                { color: theme.textMuted },
                              ]}
                            >
                              Wed
                            </ThemedText>
                            <ThemedText
                              type="caption"
                              style={[
                                styles.heatmapDayLabel,
                                { color: theme.textMuted },
                              ]}
                            >
                              Fri
                            </ThemedText>
                          </View>

                          <View style={styles.heatmapGrid}>
                            {weeks.map((week, wi) => (
                              <View
                                key={`week-${wi}`}
                                style={styles.heatmapWeek}
                              >
                                {week.map((day, di) => (
                                  <View
                                    key={`day-${wi}-${di}`}
                                    style={[
                                      styles.heatmapCell,
                                      {
                                        backgroundColor: getHeatmapColor(
                                          day.count,
                                          theme,
                                        ),
                                      },
                                    ]}
                                  />
                                ))}
                              </View>
                            ))}
                          </View>
                        </View>

                        {!hasActivity ? (
                          <ThemedText
                            type="caption"
                            style={{
                              color: theme.textMuted,
                              textAlign: "center",
                              marginTop: Spacing.sm,
                            }}
                          >
                            Start memorizing to see your activity here
                          </ThemedText>
                        ) : null}

                        <View style={styles.heatmapLegend}>
                          <ThemedText
                            type="caption"
                            style={{ color: theme.textMuted }}
                          >
                            Less
                          </ThemedText>
                          <View
                            style={[
                              styles.heatmapLegendCell,
                              { backgroundColor: `${theme.textMuted}10` },
                            ]}
                          />
                          <View
                            style={[
                              styles.heatmapLegendCell,
                              { backgroundColor: `${theme.primary}30` },
                            ]}
                          />
                          <View
                            style={[
                              styles.heatmapLegendCell,
                              { backgroundColor: `${theme.primary}60` },
                            ]}
                          />
                          <View
                            style={[
                              styles.heatmapLegendCell,
                              { backgroundColor: theme.primary },
                            ]}
                          />
                          <ThemedText
                            type="caption"
                            style={{ color: theme.textMuted }}
                          >
                            More
                          </ThemedText>
                        </View>
                      </>
                    );
                  })()}
                </View>
              </Animated.View>
            </PremiumGate>

            <PremiumGate
              requiredTier="premium"
              featureLabel="Mistake Tracking"
              upgradeMessage={ENTITLEMENTS.hifzAnalytics.upgradeMessage}
              mode="replace"
            >
              <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                <View
                  style={[
                    styles.mistakesCard,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.mistakesHeader}>
                    <AppIcon
                      name="alert-circle"
                      size={16}
                      color={isDark ? "#FBBF24" : "#D97706"}
                    />
                    <ThemedText
                      style={[styles.mistakesTitle, { color: theme.text }]}
                    >
                      Common Mistakes
                    </ThemedText>
                  </View>

                  {mistakes.length > 0 ? (
                    mistakes.map((mistake, idx) => {
                      const surah = SURAH_NAMES.find(
                        (s) => s.number === mistake.surahNumber,
                      );
                      return (
                        <View
                          key={`mistake-${idx}`}
                          style={[
                            styles.mistakeItem,
                            {
                              borderBottomColor: theme.borderSubtle,
                              borderBottomWidth:
                                idx < mistakes.length - 1 ? 1 : 0,
                            },
                          ]}
                        >
                          <View style={styles.mistakeTop}>
                            <View style={styles.mistakeInfo}>
                              <ThemedText
                                style={[
                                  styles.mistakeSurah,
                                  { color: theme.text },
                                ]}
                              >
                                {surah
                                  ? surah.name
                                  : `Surah ${mistake.surahNumber}`}
                              </ThemedText>
                              <ThemedText
                                type="caption"
                                style={{ color: theme.textSecondary }}
                              >
                                Verse {mistake.verseNumber}
                              </ThemedText>
                            </View>
                            <ThemedText
                              type="caption"
                              style={{ color: theme.textMuted }}
                            >
                              {timeAgo(mistake.timestamp)}
                            </ThemedText>
                          </View>
                          {mistake.note ? (
                            <ThemedText
                              type="small"
                              style={{
                                color: theme.textSecondary,
                                marginTop: Spacing.xs,
                              }}
                            >
                              {mistake.note}
                            </ThemedText>
                          ) : null}
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.mistakesEmpty}>
                      <AppIcon
                        name="check-circle"
                        size={24}
                        color={theme.textMuted}
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color: theme.textMuted,
                          textAlign: "center",
                          marginTop: Spacing.sm,
                          lineHeight: 18,
                        }}
                      >
                        No mistakes tracked yet. Tap a verse in review to mark
                        areas for improvement.
                      </ThemedText>
                    </View>
                  )}
                </View>
              </Animated.View>
            </PremiumGate>
          </Animated.View>
        }
        testID="surah-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  statsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statsTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  statsGoldDivider: {
    marginBottom: Spacing.sm,
  },
  statsNumbers: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.sm,
  },
  overallBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  overallBarFill: {
    height: 8,
    borderRadius: 4,
  },
  detailStatsCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  surahCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  surahCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  surahNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  surahInfo: {
    flex: 1,
  },
  surahName: {
    fontSize: 15,
    fontWeight: "600",
  },
  surahRight: {
    alignItems: "flex-end",
  },
  surahArabic: {
    fontSize: 18,
    fontWeight: "400",
  },
  reviewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  pctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 40,
    alignItems: "center",
  },
  segmentRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  practiceContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  verseIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verseCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    flex: 1,
    gap: Spacing.md,
  },
  arabicText: {
    fontSize: 24,
    textAlign: "right",
    lineHeight: 42,
    fontFamily: "AmiriQuran_400Regular",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  testHeader: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  revealButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  heatmapCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heatmapHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  heatmapTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  heatmapMonthRow: {
    flexDirection: "row",
    marginBottom: 4,
    position: "relative",
    height: 16,
  },
  heatmapMonthLabel: {
    fontSize: 10,
    position: "absolute",
  },
  heatmapBody: {
    flexDirection: "row",
  },
  heatmapDayLabels: {
    width: 28,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  heatmapDayLabel: {
    fontSize: 10,
  },
  heatmapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    flex: 1,
  },
  heatmapWeek: {
    gap: 2,
  },
  heatmapCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  heatmapLegend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: Spacing.sm,
  },
  heatmapLegendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  mistakesCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  mistakesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  mistakesTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  mistakeItem: {
    paddingVertical: Spacing.sm,
  },
  mistakeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  mistakeInfo: {
    flex: 1,
  },
  mistakeSurah: {
    fontSize: 14,
    fontWeight: "600",
  },
  mistakesEmpty: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  playAudioButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  srDashboard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  srDashboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  srDashboardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  srStatsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  srStatBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  srProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
  },
});
