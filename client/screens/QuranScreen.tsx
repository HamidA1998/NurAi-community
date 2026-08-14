import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  Text,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  GeometricCardPattern,
  GoldDivider,
  QuranIconSvg,
} from "@/components/premium/svg/PremiumSvgs";
import { Aurora } from "@/design-system/Aurora";
import { NuraiGlass } from "@/design-system/NuraiGlass";
import { NuraiSegmentedControl } from "@/design-system";
import {
  QuranSanctuaryArtwork,
  QuranVerseRosette,
} from "@/components/quran/QuranSanctuaryArtwork";
import {
  getRecentSurahs,
  getQuranStats,
  SurahProgress,
  QuranStats,
} from "@/lib/quran-progress";
import { AppIcon, type AppIconName } from "@/components/icons";

interface Surah {
  id: number;
  nameArabic: string;
  nameEnglish: string;
  meaningEnglish: string;
  versesCount: number;
  revelationType: string;
}

const QURAN_STUDY_ACTIONS: {
  id: string;
  title: string;
  subtitle: string;
  icon: AppIconName;
  tone: "primary" | "scholar" | "info";
  route: string;
}[] = [
  {
    id: "plan",
    title: "Reading Plan",
    subtitle: "Build a steady khatm rhythm",
    icon: "calendar",
    tone: "primary",
    route: "QuranReadingPlan",
  },
  {
    id: "tafsir",
    title: "Tafsir Study",
    subtitle: "Source-aware verse context",
    icon: "search",
    tone: "scholar",
    route: "Tafsir",
  },
  {
    id: "bookmarks",
    title: "Saved Ayahs",
    subtitle: "Return to what moved you",
    icon: "bookmark",
    tone: "primary",
    route: "Bookmarks",
  },
];

const SURAHS: Surah[] = [
  {
    id: 1,
    nameArabic: "\u0627\u0644\u0641\u0627\u062a\u062d\u0629",
    nameEnglish: "Al-Fatihah",
    meaningEnglish: "The Opening",
    versesCount: 7,
    revelationType: "Meccan",
  },
  {
    id: 2,
    nameArabic: "\u0627\u0644\u0628\u0642\u0631\u0629",
    nameEnglish: "Al-Baqarah",
    meaningEnglish: "The Cow",
    versesCount: 286,
    revelationType: "Medinan",
  },
  {
    id: 3,
    nameArabic: "\u0622\u0644 \u0639\u0645\u0631\u0627\u0646",
    nameEnglish: "Aal-E-Imran",
    meaningEnglish: "The Family of Imran",
    versesCount: 200,
    revelationType: "Medinan",
  },
  {
    id: 4,
    nameArabic: "\u0627\u0644\u0646\u0633\u0627\u0621",
    nameEnglish: "An-Nisa",
    meaningEnglish: "The Women",
    versesCount: 176,
    revelationType: "Medinan",
  },
  {
    id: 5,
    nameArabic: "\u0627\u0644\u0645\u0627\u0626\u062f\u0629",
    nameEnglish: "Al-Ma'idah",
    meaningEnglish: "The Table Spread",
    versesCount: 120,
    revelationType: "Medinan",
  },
  {
    id: 6,
    nameArabic: "\u0627\u0644\u0623\u0646\u0639\u0627\u0645",
    nameEnglish: "Al-An'am",
    meaningEnglish: "The Cattle",
    versesCount: 165,
    revelationType: "Meccan",
  },
  {
    id: 7,
    nameArabic: "\u0627\u0644\u0623\u0639\u0631\u0627\u0641",
    nameEnglish: "Al-A'raf",
    meaningEnglish: "The Heights",
    versesCount: 206,
    revelationType: "Meccan",
  },
  {
    id: 8,
    nameArabic: "\u0627\u0644\u0623\u0646\u0641\u0627\u0644",
    nameEnglish: "Al-Anfal",
    meaningEnglish: "The Spoils of War",
    versesCount: 75,
    revelationType: "Medinan",
  },
  {
    id: 9,
    nameArabic: "\u0627\u0644\u062a\u0648\u0628\u0629",
    nameEnglish: "At-Tawbah",
    meaningEnglish: "The Repentance",
    versesCount: 129,
    revelationType: "Medinan",
  },
  {
    id: 10,
    nameArabic: "\u064a\u0648\u0646\u0633",
    nameEnglish: "Yunus",
    meaningEnglish: "Jonah",
    versesCount: 109,
    revelationType: "Meccan",
  },
  {
    id: 11,
    nameArabic: "\u0647\u0648\u062f",
    nameEnglish: "Hud",
    meaningEnglish: "Hud",
    versesCount: 123,
    revelationType: "Meccan",
  },
  {
    id: 12,
    nameArabic: "\u064a\u0648\u0633\u0641",
    nameEnglish: "Yusuf",
    meaningEnglish: "Joseph",
    versesCount: 111,
    revelationType: "Meccan",
  },
  {
    id: 13,
    nameArabic: "\u0627\u0644\u0631\u0639\u062f",
    nameEnglish: "Ar-Ra'd",
    meaningEnglish: "The Thunder",
    versesCount: 43,
    revelationType: "Medinan",
  },
  {
    id: 14,
    nameArabic: "\u0625\u0628\u0631\u0627\u0647\u064a\u0645",
    nameEnglish: "Ibrahim",
    meaningEnglish: "Abraham",
    versesCount: 52,
    revelationType: "Meccan",
  },
  {
    id: 15,
    nameArabic: "\u0627\u0644\u062d\u062c\u0631",
    nameEnglish: "Al-Hijr",
    meaningEnglish: "The Rocky Tract",
    versesCount: 99,
    revelationType: "Meccan",
  },
  {
    id: 16,
    nameArabic: "\u0627\u0644\u0646\u062d\u0644",
    nameEnglish: "An-Nahl",
    meaningEnglish: "The Bee",
    versesCount: 128,
    revelationType: "Meccan",
  },
  {
    id: 17,
    nameArabic: "\u0627\u0644\u0625\u0633\u0631\u0627\u0621",
    nameEnglish: "Al-Isra",
    meaningEnglish: "The Night Journey",
    versesCount: 111,
    revelationType: "Meccan",
  },
  {
    id: 18,
    nameArabic: "\u0627\u0644\u0643\u0647\u0641",
    nameEnglish: "Al-Kahf",
    meaningEnglish: "The Cave",
    versesCount: 110,
    revelationType: "Meccan",
  },
  {
    id: 19,
    nameArabic: "\u0645\u0631\u064a\u0645",
    nameEnglish: "Maryam",
    meaningEnglish: "Mary",
    versesCount: 98,
    revelationType: "Meccan",
  },
  {
    id: 20,
    nameArabic: "\u0637\u0647",
    nameEnglish: "Ta-Ha",
    meaningEnglish: "Ta-Ha",
    versesCount: 135,
    revelationType: "Meccan",
  },
  {
    id: 21,
    nameArabic: "\u0627\u0644\u0623\u0646\u0628\u064a\u0627\u0621",
    nameEnglish: "Al-Anbiya",
    meaningEnglish: "The Prophets",
    versesCount: 112,
    revelationType: "Meccan",
  },
  {
    id: 22,
    nameArabic: "\u0627\u0644\u062d\u062c",
    nameEnglish: "Al-Hajj",
    meaningEnglish: "The Pilgrimage",
    versesCount: 78,
    revelationType: "Medinan",
  },
  {
    id: 23,
    nameArabic: "\u0627\u0644\u0645\u0624\u0645\u0646\u0648\u0646",
    nameEnglish: "Al-Mu'minun",
    meaningEnglish: "The Believers",
    versesCount: 118,
    revelationType: "Meccan",
  },
  {
    id: 24,
    nameArabic: "\u0627\u0644\u0646\u0648\u0631",
    nameEnglish: "An-Nur",
    meaningEnglish: "The Light",
    versesCount: 64,
    revelationType: "Medinan",
  },
  {
    id: 25,
    nameArabic: "\u0627\u0644\u0641\u0631\u0642\u0627\u0646",
    nameEnglish: "Al-Furqan",
    meaningEnglish: "The Criterion",
    versesCount: 77,
    revelationType: "Meccan",
  },
  {
    id: 26,
    nameArabic: "\u0627\u0644\u0634\u0639\u0631\u0627\u0621",
    nameEnglish: "Ash-Shu'ara",
    meaningEnglish: "The Poets",
    versesCount: 227,
    revelationType: "Meccan",
  },
  {
    id: 27,
    nameArabic: "\u0627\u0644\u0646\u0645\u0644",
    nameEnglish: "An-Naml",
    meaningEnglish: "The Ants",
    versesCount: 93,
    revelationType: "Meccan",
  },
  {
    id: 28,
    nameArabic: "\u0627\u0644\u0642\u0635\u0635",
    nameEnglish: "Al-Qasas",
    meaningEnglish: "The Stories",
    versesCount: 88,
    revelationType: "Meccan",
  },
  {
    id: 29,
    nameArabic: "\u0627\u0644\u0639\u0646\u0643\u0628\u0648\u062a",
    nameEnglish: "Al-Ankabut",
    meaningEnglish: "The Spider",
    versesCount: 69,
    revelationType: "Meccan",
  },
  {
    id: 30,
    nameArabic: "\u0627\u0644\u0631\u0648\u0645",
    nameEnglish: "Ar-Rum",
    meaningEnglish: "The Romans",
    versesCount: 60,
    revelationType: "Meccan",
  },
  {
    id: 31,
    nameArabic: "\u0644\u0642\u0645\u0627\u0646",
    nameEnglish: "Luqman",
    meaningEnglish: "Luqman",
    versesCount: 34,
    revelationType: "Meccan",
  },
  {
    id: 32,
    nameArabic: "\u0627\u0644\u0633\u062c\u062f\u0629",
    nameEnglish: "As-Sajdah",
    meaningEnglish: "The Prostration",
    versesCount: 30,
    revelationType: "Meccan",
  },
  {
    id: 33,
    nameArabic: "\u0627\u0644\u0623\u062d\u0632\u0627\u0628",
    nameEnglish: "Al-Ahzab",
    meaningEnglish: "The Combined Forces",
    versesCount: 73,
    revelationType: "Medinan",
  },
  {
    id: 34,
    nameArabic: "\u0633\u0628\u0623",
    nameEnglish: "Saba",
    meaningEnglish: "Sheba",
    versesCount: 54,
    revelationType: "Meccan",
  },
  {
    id: 35,
    nameArabic: "\u0641\u0627\u0637\u0631",
    nameEnglish: "Fatir",
    meaningEnglish: "The Originator",
    versesCount: 45,
    revelationType: "Meccan",
  },
  {
    id: 36,
    nameArabic: "\u064a\u0633",
    nameEnglish: "Ya-Sin",
    meaningEnglish: "Ya-Sin",
    versesCount: 83,
    revelationType: "Meccan",
  },
  {
    id: 37,
    nameArabic: "\u0627\u0644\u0635\u0627\u0641\u0627\u062a",
    nameEnglish: "As-Saffat",
    meaningEnglish: "Those Ranged in Ranks",
    versesCount: 182,
    revelationType: "Meccan",
  },
  {
    id: 38,
    nameArabic: "\u0635",
    nameEnglish: "Sad",
    meaningEnglish: "Sad",
    versesCount: 88,
    revelationType: "Meccan",
  },
  {
    id: 39,
    nameArabic: "\u0627\u0644\u0632\u0645\u0631",
    nameEnglish: "Az-Zumar",
    meaningEnglish: "The Groups",
    versesCount: 75,
    revelationType: "Meccan",
  },
  {
    id: 40,
    nameArabic: "\u063a\u0627\u0641\u0631",
    nameEnglish: "Ghafir",
    meaningEnglish: "The Forgiver",
    versesCount: 85,
    revelationType: "Meccan",
  },
  {
    id: 41,
    nameArabic: "\u0641\u0635\u0644\u062a",
    nameEnglish: "Fussilat",
    meaningEnglish: "Explained in Detail",
    versesCount: 54,
    revelationType: "Meccan",
  },
  {
    id: 42,
    nameArabic: "\u0627\u0644\u0634\u0648\u0631\u0649",
    nameEnglish: "Ash-Shura",
    meaningEnglish: "The Consultation",
    versesCount: 53,
    revelationType: "Meccan",
  },
  {
    id: 43,
    nameArabic: "\u0627\u0644\u0632\u062e\u0631\u0641",
    nameEnglish: "Az-Zukhruf",
    meaningEnglish: "The Gold Adornments",
    versesCount: 89,
    revelationType: "Meccan",
  },
  {
    id: 44,
    nameArabic: "\u0627\u0644\u062f\u062e\u0627\u0646",
    nameEnglish: "Ad-Dukhan",
    meaningEnglish: "The Smoke",
    versesCount: 59,
    revelationType: "Meccan",
  },
  {
    id: 45,
    nameArabic: "\u0627\u0644\u062c\u0627\u062b\u064a\u0629",
    nameEnglish: "Al-Jathiyah",
    meaningEnglish: "The Crouching",
    versesCount: 37,
    revelationType: "Meccan",
  },
  {
    id: 46,
    nameArabic: "\u0627\u0644\u0623\u062d\u0642\u0627\u0641",
    nameEnglish: "Al-Ahqaf",
    meaningEnglish: "The Sand Dunes",
    versesCount: 35,
    revelationType: "Meccan",
  },
  {
    id: 47,
    nameArabic: "\u0645\u062d\u0645\u062f",
    nameEnglish: "Muhammad",
    meaningEnglish: "Muhammad",
    versesCount: 38,
    revelationType: "Medinan",
  },
  {
    id: 48,
    nameArabic: "\u0627\u0644\u0641\u062a\u062d",
    nameEnglish: "Al-Fath",
    meaningEnglish: "The Victory",
    versesCount: 29,
    revelationType: "Medinan",
  },
  {
    id: 49,
    nameArabic: "\u0627\u0644\u062d\u062c\u0631\u0627\u062a",
    nameEnglish: "Al-Hujurat",
    meaningEnglish: "The Rooms",
    versesCount: 18,
    revelationType: "Medinan",
  },
  {
    id: 50,
    nameArabic: "\u0642",
    nameEnglish: "Qaf",
    meaningEnglish: "Qaf",
    versesCount: 45,
    revelationType: "Meccan",
  },
  {
    id: 51,
    nameArabic: "\u0627\u0644\u0630\u0627\u0631\u064a\u0627\u062a",
    nameEnglish: "Adh-Dhariyat",
    meaningEnglish: "The Scattering Winds",
    versesCount: 60,
    revelationType: "Meccan",
  },
  {
    id: 52,
    nameArabic: "\u0627\u0644\u0637\u0648\u0631",
    nameEnglish: "At-Tur",
    meaningEnglish: "The Mount",
    versesCount: 49,
    revelationType: "Meccan",
  },
  {
    id: 53,
    nameArabic: "\u0627\u0644\u0646\u062c\u0645",
    nameEnglish: "An-Najm",
    meaningEnglish: "The Star",
    versesCount: 62,
    revelationType: "Meccan",
  },
  {
    id: 54,
    nameArabic: "\u0627\u0644\u0642\u0645\u0631",
    nameEnglish: "Al-Qamar",
    meaningEnglish: "The Moon",
    versesCount: 55,
    revelationType: "Meccan",
  },
  {
    id: 55,
    nameArabic: "\u0627\u0644\u0631\u062d\u0645\u0646",
    nameEnglish: "Ar-Rahman",
    meaningEnglish: "The Most Gracious",
    versesCount: 78,
    revelationType: "Medinan",
  },
  {
    id: 56,
    nameArabic: "\u0627\u0644\u0648\u0627\u0642\u0639\u0629",
    nameEnglish: "Al-Waqi'ah",
    meaningEnglish: "The Event",
    versesCount: 96,
    revelationType: "Meccan",
  },
  {
    id: 57,
    nameArabic: "\u0627\u0644\u062d\u062f\u064a\u062f",
    nameEnglish: "Al-Hadid",
    meaningEnglish: "The Iron",
    versesCount: 29,
    revelationType: "Medinan",
  },
  {
    id: 58,
    nameArabic: "\u0627\u0644\u0645\u062c\u0627\u062f\u0644\u0629",
    nameEnglish: "Al-Mujadila",
    meaningEnglish: "The Pleading",
    versesCount: 22,
    revelationType: "Medinan",
  },
  {
    id: 59,
    nameArabic: "\u0627\u0644\u062d\u0634\u0631",
    nameEnglish: "Al-Hashr",
    meaningEnglish: "The Gathering",
    versesCount: 24,
    revelationType: "Medinan",
  },
  {
    id: 60,
    nameArabic: "\u0627\u0644\u0645\u0645\u062a\u062d\u0646\u0629",
    nameEnglish: "Al-Mumtahanah",
    meaningEnglish: "The Examined One",
    versesCount: 13,
    revelationType: "Medinan",
  },
  {
    id: 61,
    nameArabic: "\u0627\u0644\u0635\u0641",
    nameEnglish: "As-Saff",
    meaningEnglish: "The Ranks",
    versesCount: 14,
    revelationType: "Medinan",
  },
  {
    id: 62,
    nameArabic: "\u0627\u0644\u062c\u0645\u0639\u0629",
    nameEnglish: "Al-Jumu'ah",
    meaningEnglish: "Friday",
    versesCount: 11,
    revelationType: "Medinan",
  },
  {
    id: 63,
    nameArabic: "\u0627\u0644\u0645\u0646\u0627\u0641\u0642\u0648\u0646",
    nameEnglish: "Al-Munafiqun",
    meaningEnglish: "The Hypocrites",
    versesCount: 11,
    revelationType: "Medinan",
  },
  {
    id: 64,
    nameArabic: "\u0627\u0644\u062a\u063a\u0627\u0628\u0646",
    nameEnglish: "At-Taghabun",
    meaningEnglish: "The Mutual Loss",
    versesCount: 18,
    revelationType: "Medinan",
  },
  {
    id: 65,
    nameArabic: "\u0627\u0644\u0637\u0644\u0627\u0642",
    nameEnglish: "At-Talaq",
    meaningEnglish: "The Divorce",
    versesCount: 12,
    revelationType: "Medinan",
  },
  {
    id: 66,
    nameArabic: "\u0627\u0644\u062a\u062d\u0631\u064a\u0645",
    nameEnglish: "At-Tahrim",
    meaningEnglish: "The Prohibition",
    versesCount: 12,
    revelationType: "Medinan",
  },
  {
    id: 67,
    nameArabic: "\u0627\u0644\u0645\u0644\u0643",
    nameEnglish: "Al-Mulk",
    meaningEnglish: "The Sovereignty",
    versesCount: 30,
    revelationType: "Meccan",
  },
  {
    id: 68,
    nameArabic: "\u0627\u0644\u0642\u0644\u0645",
    nameEnglish: "Al-Qalam",
    meaningEnglish: "The Pen",
    versesCount: 52,
    revelationType: "Meccan",
  },
  {
    id: 69,
    nameArabic: "\u0627\u0644\u062d\u0627\u0642\u0629",
    nameEnglish: "Al-Haqqah",
    meaningEnglish: "The Inevitable",
    versesCount: 52,
    revelationType: "Meccan",
  },
  {
    id: 70,
    nameArabic: "\u0627\u0644\u0645\u0639\u0627\u0631\u062c",
    nameEnglish: "Al-Ma'arij",
    meaningEnglish: "The Ways of Ascent",
    versesCount: 44,
    revelationType: "Meccan",
  },
  {
    id: 71,
    nameArabic: "\u0646\u0648\u062d",
    nameEnglish: "Nuh",
    meaningEnglish: "Noah",
    versesCount: 28,
    revelationType: "Meccan",
  },
  {
    id: 72,
    nameArabic: "\u0627\u0644\u062c\u0646",
    nameEnglish: "Al-Jinn",
    meaningEnglish: "The Jinn",
    versesCount: 28,
    revelationType: "Meccan",
  },
  {
    id: 73,
    nameArabic: "\u0627\u0644\u0645\u0632\u0645\u0644",
    nameEnglish: "Al-Muzzammil",
    meaningEnglish: "The Enshrouded One",
    versesCount: 20,
    revelationType: "Meccan",
  },
  {
    id: 74,
    nameArabic: "\u0627\u0644\u0645\u062f\u062b\u0631",
    nameEnglish: "Al-Muddaththir",
    meaningEnglish: "The Cloaked One",
    versesCount: 56,
    revelationType: "Meccan",
  },
  {
    id: 75,
    nameArabic: "\u0627\u0644\u0642\u064a\u0627\u0645\u0629",
    nameEnglish: "Al-Qiyamah",
    meaningEnglish: "The Resurrection",
    versesCount: 40,
    revelationType: "Meccan",
  },
  {
    id: 76,
    nameArabic: "\u0627\u0644\u0625\u0646\u0633\u0627\u0646",
    nameEnglish: "Al-Insan",
    meaningEnglish: "Man",
    versesCount: 31,
    revelationType: "Medinan",
  },
  {
    id: 77,
    nameArabic: "\u0627\u0644\u0645\u0631\u0633\u0644\u0627\u062a",
    nameEnglish: "Al-Mursalat",
    meaningEnglish: "Those Sent Forth",
    versesCount: 50,
    revelationType: "Meccan",
  },
  {
    id: 78,
    nameArabic: "\u0627\u0644\u0646\u0628\u0623",
    nameEnglish: "An-Naba",
    meaningEnglish: "The News",
    versesCount: 40,
    revelationType: "Meccan",
  },
  {
    id: 79,
    nameArabic: "\u0627\u0644\u0646\u0627\u0632\u0639\u0627\u062a",
    nameEnglish: "An-Nazi'at",
    meaningEnglish: "Those Who Pull Out",
    versesCount: 46,
    revelationType: "Meccan",
  },
  {
    id: 80,
    nameArabic: "\u0639\u0628\u0633",
    nameEnglish: "Abasa",
    meaningEnglish: "He Frowned",
    versesCount: 42,
    revelationType: "Meccan",
  },
  {
    id: 81,
    nameArabic: "\u0627\u0644\u062a\u0643\u0648\u064a\u0631",
    nameEnglish: "At-Takwir",
    meaningEnglish: "The Folding Up",
    versesCount: 29,
    revelationType: "Meccan",
  },
  {
    id: 82,
    nameArabic: "\u0627\u0644\u0627\u0646\u0641\u0637\u0627\u0631",
    nameEnglish: "Al-Infitar",
    meaningEnglish: "The Splitting",
    versesCount: 19,
    revelationType: "Meccan",
  },
  {
    id: 83,
    nameArabic: "\u0627\u0644\u0645\u0637\u0641\u0641\u064a\u0646",
    nameEnglish: "Al-Mutaffifin",
    meaningEnglish: "The Defrauders",
    versesCount: 36,
    revelationType: "Meccan",
  },
  {
    id: 84,
    nameArabic: "\u0627\u0644\u0627\u0646\u0634\u0642\u0627\u0642",
    nameEnglish: "Al-Inshiqaq",
    meaningEnglish: "The Splitting Asunder",
    versesCount: 25,
    revelationType: "Meccan",
  },
  {
    id: 85,
    nameArabic: "\u0627\u0644\u0628\u0631\u0648\u062c",
    nameEnglish: "Al-Buruj",
    meaningEnglish: "The Stars",
    versesCount: 22,
    revelationType: "Meccan",
  },
  {
    id: 86,
    nameArabic: "\u0627\u0644\u0637\u0627\u0631\u0642",
    nameEnglish: "At-Tariq",
    meaningEnglish: "The Morning Star",
    versesCount: 17,
    revelationType: "Meccan",
  },
  {
    id: 87,
    nameArabic: "\u0627\u0644\u0623\u0639\u0644\u0649",
    nameEnglish: "Al-A'la",
    meaningEnglish: "The Most High",
    versesCount: 19,
    revelationType: "Meccan",
  },
  {
    id: 88,
    nameArabic: "\u0627\u0644\u063a\u0627\u0634\u064a\u0629",
    nameEnglish: "Al-Ghashiyah",
    meaningEnglish: "The Overwhelming",
    versesCount: 26,
    revelationType: "Meccan",
  },
  {
    id: 89,
    nameArabic: "\u0627\u0644\u0641\u062c\u0631",
    nameEnglish: "Al-Fajr",
    meaningEnglish: "The Dawn",
    versesCount: 30,
    revelationType: "Meccan",
  },
  {
    id: 90,
    nameArabic: "\u0627\u0644\u0628\u0644\u062f",
    nameEnglish: "Al-Balad",
    meaningEnglish: "The City",
    versesCount: 20,
    revelationType: "Meccan",
  },
  {
    id: 91,
    nameArabic: "\u0627\u0644\u0634\u0645\u0633",
    nameEnglish: "Ash-Shams",
    meaningEnglish: "The Sun",
    versesCount: 15,
    revelationType: "Meccan",
  },
  {
    id: 92,
    nameArabic: "\u0627\u0644\u0644\u064a\u0644",
    nameEnglish: "Al-Layl",
    meaningEnglish: "The Night",
    versesCount: 21,
    revelationType: "Meccan",
  },
  {
    id: 93,
    nameArabic: "\u0627\u0644\u0636\u062d\u0649",
    nameEnglish: "Ad-Duha",
    meaningEnglish: "The Forenoon",
    versesCount: 11,
    revelationType: "Meccan",
  },
  {
    id: 94,
    nameArabic: "\u0627\u0644\u0634\u0631\u062d",
    nameEnglish: "Ash-Sharh",
    meaningEnglish: "The Opening Forth",
    versesCount: 8,
    revelationType: "Meccan",
  },
  {
    id: 95,
    nameArabic: "\u0627\u0644\u062a\u064a\u0646",
    nameEnglish: "At-Tin",
    meaningEnglish: "The Fig",
    versesCount: 8,
    revelationType: "Meccan",
  },
  {
    id: 96,
    nameArabic: "\u0627\u0644\u0639\u0644\u0642",
    nameEnglish: "Al-Alaq",
    meaningEnglish: "The Clot",
    versesCount: 19,
    revelationType: "Meccan",
  },
  {
    id: 97,
    nameArabic: "\u0627\u0644\u0642\u062f\u0631",
    nameEnglish: "Al-Qadr",
    meaningEnglish: "The Power",
    versesCount: 5,
    revelationType: "Meccan",
  },
  {
    id: 98,
    nameArabic: "\u0627\u0644\u0628\u064a\u0646\u0629",
    nameEnglish: "Al-Bayyinah",
    meaningEnglish: "The Clear Evidence",
    versesCount: 8,
    revelationType: "Medinan",
  },
  {
    id: 99,
    nameArabic: "\u0627\u0644\u0632\u0644\u0632\u0644\u0629",
    nameEnglish: "Az-Zalzalah",
    meaningEnglish: "The Earthquake",
    versesCount: 8,
    revelationType: "Medinan",
  },
  {
    id: 100,
    nameArabic: "\u0627\u0644\u0639\u0627\u062f\u064a\u0627\u062a",
    nameEnglish: "Al-Adiyat",
    meaningEnglish: "The Chargers",
    versesCount: 11,
    revelationType: "Meccan",
  },
  {
    id: 101,
    nameArabic: "\u0627\u0644\u0642\u0627\u0631\u0639\u0629",
    nameEnglish: "Al-Qari'ah",
    meaningEnglish: "The Calamity",
    versesCount: 11,
    revelationType: "Meccan",
  },
  {
    id: 102,
    nameArabic: "\u0627\u0644\u062a\u0643\u0627\u062b\u0631",
    nameEnglish: "At-Takathur",
    meaningEnglish: "The Rivalry",
    versesCount: 8,
    revelationType: "Meccan",
  },
  {
    id: 103,
    nameArabic: "\u0627\u0644\u0639\u0635\u0631",
    nameEnglish: "Al-Asr",
    meaningEnglish: "The Time",
    versesCount: 3,
    revelationType: "Meccan",
  },
  {
    id: 104,
    nameArabic: "\u0627\u0644\u0647\u0645\u0632\u0629",
    nameEnglish: "Al-Humazah",
    meaningEnglish: "The Slanderer",
    versesCount: 9,
    revelationType: "Meccan",
  },
  {
    id: 105,
    nameArabic: "\u0627\u0644\u0641\u064a\u0644",
    nameEnglish: "Al-Fil",
    meaningEnglish: "The Elephant",
    versesCount: 5,
    revelationType: "Meccan",
  },
  {
    id: 106,
    nameArabic: "\u0642\u0631\u064a\u0634",
    nameEnglish: "Quraysh",
    meaningEnglish: "Quraysh",
    versesCount: 4,
    revelationType: "Meccan",
  },
  {
    id: 107,
    nameArabic: "\u0627\u0644\u0645\u0627\u0639\u0648\u0646",
    nameEnglish: "Al-Ma'un",
    meaningEnglish: "The Small Kindnesses",
    versesCount: 7,
    revelationType: "Meccan",
  },
  {
    id: 108,
    nameArabic: "\u0627\u0644\u0643\u0648\u062b\u0631",
    nameEnglish: "Al-Kawthar",
    meaningEnglish: "The Abundance",
    versesCount: 3,
    revelationType: "Meccan",
  },
  {
    id: 109,
    nameArabic: "\u0627\u0644\u0643\u0627\u0641\u0631\u0648\u0646",
    nameEnglish: "Al-Kafirun",
    meaningEnglish: "The Disbelievers",
    versesCount: 6,
    revelationType: "Meccan",
  },
  {
    id: 110,
    nameArabic: "\u0627\u0644\u0646\u0635\u0631",
    nameEnglish: "An-Nasr",
    meaningEnglish: "The Help",
    versesCount: 3,
    revelationType: "Medinan",
  },
  {
    id: 111,
    nameArabic: "\u0627\u0644\u0645\u0633\u062f",
    nameEnglish: "Al-Masad",
    meaningEnglish: "The Palm Fiber",
    versesCount: 5,
    revelationType: "Meccan",
  },
  {
    id: 112,
    nameArabic: "\u0627\u0644\u0625\u062e\u0644\u0627\u0635",
    nameEnglish: "Al-Ikhlas",
    meaningEnglish: "The Sincerity",
    versesCount: 4,
    revelationType: "Meccan",
  },
  {
    id: 113,
    nameArabic: "\u0627\u0644\u0641\u0644\u0642",
    nameEnglish: "Al-Falaq",
    meaningEnglish: "The Daybreak",
    versesCount: 5,
    revelationType: "Meccan",
  },
  {
    id: 114,
    nameArabic: "\u0627\u0644\u0646\u0627\u0633",
    nameEnglish: "An-Nas",
    meaningEnglish: "Mankind",
    versesCount: 6,
    revelationType: "Meccan",
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Kept during the staged Quran release so existing reader release assertions remain comparable.
function LegacyQuranScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState("");
  const [recentSurahs, setRecentSurahs] = useState<SurahProgress[]>([]);
  const [quranStats, setQuranStats] = useState<QuranStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const [recent, stats] = await Promise.all([
          getRecentSurahs(5),
          getQuranStats(),
        ]);
        setRecentSurahs(recent);
        setQuranStats(stats);
      };
      load();
    }, []),
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return SURAHS;
    const q = search.toLowerCase();
    return SURAHS.filter(
      (s) =>
        s.nameEnglish.toLowerCase().includes(q) ||
        s.meaningEnglish.toLowerCase().includes(q) ||
        s.nameArabic.includes(search) ||
        s.id.toString() === q,
    );
  }, [search]);

  const continueSurah = recentSurahs[0];

  const renderSurah = ({ item, index }: { item: Surah; index: number }) => {
    const isMeccan = item.revelationType === "Meccan";

    return (
      <AnimatedPressable
        entering={FadeInDown.delay(index * 20).duration(400)}
        style={({ pressed }) => [
          styles.surahCard,
          {
            backgroundColor: "transparent",
            borderColor: theme.borderSubtle,
          },
          pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
        ]}
        onPress={() =>
          navigation.navigate("QuranReader", {
            surahNumber: item.id,
            surahName: item.nameEnglish,
          })
        }
        testID={`surah-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${item.nameEnglish}, ${item.meaningEnglish}, ${item.versesCount} verses`}
      >
        <NuraiGlass
          pointerEvents="none"
          radius={BorderRadius.xl}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.diamondOuter,
            {
              backgroundColor: `${theme.scholar}${isDark ? "18" : "12"}`,
            },
          ]}
        >
          <View style={styles.diamondInner}>
            <Text style={[styles.diamondText, { color: theme.scholar }]}>
              {item.id}
            </Text>
          </View>
        </View>

        <View style={styles.surahInfo}>
          <ThemedText type="h4" style={styles.surahEnglishName}>
            {item.nameEnglish}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {item.meaningEnglish}
          </ThemedText>
          <View style={styles.metaRow}>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              {item.versesCount} verses
            </ThemedText>
            <View
              style={[
                styles.revelationBadge,
                {
                  backgroundColor: isMeccan
                    ? `${theme.scholar}14`
                    : theme.primarySubtle,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{
                  color: isMeccan ? theme.scholar : theme.primary,
                  fontWeight: "600",
                }}
              >
                {item.revelationType}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.surahArabicContainer}>
          <Text style={[styles.surahArabicText, { color: theme.text }]}>
            {item.nameArabic}
          </Text>
        </View>
      </AnimatedPressable>
    );
  };

  const renderSeparator = () => <View style={styles.separator} />;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Aurora />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerLeft}>
          {navigation.canGoBack() ? (
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.6 },
              ]}
              testID="button-quran-back"
            >
              <AppIcon name="arrow-left" size={24} color={theme.text} />
            </Pressable>
          ) : null}
          <ThemedText type="h1" style={{ color: theme.text }}>
            Quran
          </ThemedText>
        </View>
        <View style={{ flexDirection: "row", gap: Spacing.sm }}>
          <Pressable
            onPress={() => navigation.navigate("QuranReadingPlan" as never)}
            accessibilityRole="button"
            accessibilityLabel="Open Quran reading plan"
            style={({ pressed }) => [
              styles.tafsirBtn,
              {
                backgroundColor: "transparent",
                borderColor: theme.primaryBorder,
              },
              pressed && { opacity: 0.7 },
            ]}
            testID="button-reading-plan"
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.full}
              style={StyleSheet.absoluteFill}
            />
            <AppIcon name="calendar" size={14} color={theme.primary} />
            <Text style={[styles.tafsirBtnText, { color: theme.primary }]}>
              Plan
            </Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("Tafsir")}
            accessibilityRole="button"
            accessibilityLabel="Open Tafsir study"
            style={({ pressed }) => [
              styles.tafsirBtn,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderSubtle,
              },
              pressed && { opacity: 0.7 },
            ]}
            testID="button-tafsir"
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.full}
              style={StyleSheet.absoluteFill}
            />
            <AppIcon name="search" size={14} color={theme.scholar} />
            <Text style={[styles.tafsirBtnText, { color: theme.scholar }]}>
              Tafsir
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: "transparent",
              borderColor: theme.inputBorder,
            },
          ]}
        >
          <NuraiGlass
            pointerEvents="none"
            radius={BorderRadius.xl}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="search" size={20} color={theme.textMuted} />
          <TextInput
            style={[
              styles.searchInput,
              { color: theme.text, fontFamily: "PlusJakartaSans_400Regular" },
            ]}
            placeholder="Search surahs"
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search Quran surahs"
            testID="input-search-surah"
          />
          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch("")}
              accessibilityRole="button"
              accessibilityLabel="Clear Quran search"
              hitSlop={8}
              style={styles.clearSearchButton}
            >
              <AppIcon name="x-circle" size={18} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSurah}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          !search.trim() ? (
            <View style={styles.recentSection}>
              <View
                style={[
                  styles.quranHero,
                  { borderColor: `${theme.scholar}40` },
                ]}
              >
                <NuraiGlass
                  pointerEvents="none"
                  radius={28}
                  tint={
                    isDark ? "rgba(9,35,29,0.34)" : "rgba(255,255,255,0.54)"
                  }
                  style={StyleSheet.absoluteFill}
                />
                <GeometricCardPattern color={theme.scholar} opacity={0.012} />
                <View style={styles.quranHeroTop}>
                  <View
                    style={[
                      styles.quranHeroIcon,
                      { backgroundColor: `${theme.primary}18` },
                    ]}
                  >
                    <QuranIconSvg
                      size={34}
                      color={theme.primary}
                      accentColor={theme.scholar}
                    />
                  </View>
                  <View style={styles.quranHeroCopy}>
                    <ThemedText
                      type="caption"
                      style={[styles.heroEyebrow, { color: theme.scholar }]}
                    >
                      Quran journey
                    </ThemedText>
                    <ThemedText
                      type="h2"
                      style={{ color: theme.text, lineHeight: 38 }}
                    >
                      Read, listen, study
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted, lineHeight: 18 }}
                    >
                      A calmer Quran space for recitation, tafsir, audio, and
                      source-aware study.
                    </ThemedText>
                  </View>
                </View>
                <GoldDivider
                  color={theme.scholar}
                  opacity={0.62}
                  style={styles.heroDivider}
                />
                <View style={styles.quranHeroActions}>
                  <Pressable
                    testID="button-continue-quran"
                    accessibilityRole="button"
                    accessibilityLabel={
                      continueSurah
                        ? `Continue ${continueSurah.surahName}`
                        : "Start reading the Quran"
                    }
                    onPress={() =>
                      continueSurah
                        ? navigation.navigate("QuranReader", {
                            surahNumber: continueSurah.surahNumber,
                            surahName: continueSurah.surahName,
                            initialVerse: continueSurah.maxVerseRead,
                          })
                        : navigation.navigate("QuranReader", {
                            surahNumber: 1,
                            surahName: "Al-Fatihah",
                          })
                    }
                    style={({ pressed }) => [
                      styles.heroPrimaryAction,
                      { backgroundColor: theme.primary },
                      pressed ? { opacity: 0.78 } : null,
                    ]}
                  >
                    <AppIcon
                      name="play"
                      size={15}
                      color={theme.primaryForeground}
                    />
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.primaryForeground,
                        fontWeight: "900",
                      }}
                    >
                      {continueSurah ? "Continue" : "Start"}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => navigation.navigate("Bookmarks" as never)}
                    accessibilityRole="button"
                    accessibilityLabel="Open saved ayahs"
                    style={({ pressed }) => [
                      styles.heroSecondaryAction,
                      { borderColor: `${theme.scholar}45` },
                      pressed ? { opacity: 0.7 } : null,
                    ]}
                  >
                    <AppIcon name="bookmark" size={15} color={theme.scholar} />
                    <ThemedText
                      type="caption"
                      style={{ color: theme.scholar, fontWeight: "800" }}
                    >
                      Saved
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
              <View style={styles.studyActionRail}>
                {QURAN_STUDY_ACTIONS.map((action) => {
                  const accent =
                    action.tone === "scholar"
                      ? theme.scholar
                      : action.tone === "info"
                        ? theme.info
                        : theme.primary;
                  return (
                    <Pressable
                      key={action.id}
                      onPress={() => navigation.navigate(action.route as never)}
                      style={({ pressed }) => [
                        styles.studyActionCard,
                        {
                          backgroundColor: "transparent",
                          borderColor:
                            action.tone === "scholar"
                              ? `${theme.scholar}36`
                              : theme.borderSubtle,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${action.title}. ${action.subtitle}`}
                    >
                      <NuraiGlass
                        pointerEvents="none"
                        radius={22}
                        style={StyleSheet.absoluteFill}
                      />
                      <View
                        style={[
                          styles.studyActionIcon,
                          { backgroundColor: `${accent}18` },
                        ]}
                      >
                        <AppIcon name={action.icon} size={16} color={accent} />
                      </View>
                      <View style={styles.studyActionText}>
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: theme.text, fontWeight: "900" }}
                        >
                          {action.title}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{ color: theme.textMuted, lineHeight: 16 }}
                        >
                          {action.subtitle}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {quranStats ? (
                <View
                  style={[
                    styles.statsRow,
                    {
                      backgroundColor: "transparent",
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <NuraiGlass
                    pointerEvents="none"
                    radius={24}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.primary }]}>
                      {quranStats.totalPercentage}%
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: theme.textMuted }]}
                    >
                      Complete
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: theme.borderSubtle },
                    ]}
                  />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.primary }]}>
                      {quranStats.surahsStarted}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: theme.textMuted }]}
                    >
                      Started
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: theme.borderSubtle },
                    ]}
                  />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.primary }]}>
                      {quranStats.surahsCompleted}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: theme.textMuted }]}
                    >
                      Completed
                    </Text>
                  </View>
                </View>
              ) : null}
              {recentSurahs.length > 0 ? (
                <>
                  <SectionHeader
                    title="Recently Read"
                    style={{ paddingHorizontal: 0 }}
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recentScroll}
                  >
                    {recentSurahs.map((sp) => (
                      <Pressable
                        key={sp.surahNumber}
                        style={({ pressed }) => [
                          styles.recentCard,
                          {
                            backgroundColor: "transparent",
                            borderColor: theme.borderSubtle,
                          },
                          pressed && { opacity: 0.7 },
                        ]}
                        onPress={() =>
                          navigation.navigate("QuranReader", {
                            surahNumber: sp.surahNumber,
                            surahName: sp.surahName,
                            initialVerse: sp.maxVerseRead,
                          })
                        }
                        testID={`recent-surah-${sp.surahNumber}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Continue ${sp.surahName} at verse ${sp.maxVerseRead}`}
                      >
                        <NuraiGlass
                          pointerEvents="none"
                          radius={BorderRadius.lg}
                          style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.recentCardTop}>
                          <Text
                            style={[
                              styles.recentNumber,
                              { color: theme.primary },
                            ]}
                          >
                            {sp.surahNumber}
                          </Text>
                          <Text
                            style={[
                              styles.recentPct,
                              { color: theme.textMuted },
                            ]}
                          >
                            {sp.percentage}%
                          </Text>
                        </View>
                        <Text
                          style={[styles.recentName, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {sp.surahName}
                        </Text>
                        <Text
                          style={[
                            styles.recentVerse,
                            { color: theme.textSecondary },
                          ]}
                        >
                          Verse {sp.maxVerseRead}/{sp.totalVerses}
                        </Text>
                        <View
                          style={[
                            styles.recentProgressBg,
                            { backgroundColor: theme.surfaceGlassStrong },
                          ]}
                        >
                          <View
                            style={[
                              styles.recentProgressFill,
                              {
                                width: `${sp.percentage}%`,
                                backgroundColor: theme.primary,
                              },
                            ]}
                          />
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : null}
              <SectionHeader
                title="All Surahs"
                actionLabel="114 surahs"
                style={{ paddingHorizontal: 0, marginTop: Spacing.lg }}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View
            style={[
              styles.searchEmptyState,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={28}
              style={StyleSheet.absoluteFill}
            />
            <QuranIconSvg
              size={46}
              color={theme.primary}
              accentColor={theme.scholar}
              opacity={0.72}
            />
            <ThemedText
              type="h4"
              style={{ color: theme.text, marginTop: Spacing.md }}
            >
              No surah found
            </ThemedText>
            <ThemedText
              type="caption"
              style={{
                color: theme.textMuted,
                textAlign: "center",
                marginTop: Spacing.xs,
                lineHeight: 18,
              }}
            >
              Try the surah name, meaning, or number.
            </ThemedText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  tafsirBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 44,
    overflow: "hidden",
  },
  tafsirBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  searchWrapper: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    height: Spacing.inputHeight,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  clearSearchButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  separator: {
    height: Spacing.sm,
  },
  surahCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    overflow: "hidden",
  },
  diamondOuter: {
    width: 40,
    height: 40,
    transform: [{ rotate: "45deg" }],
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  diamondInner: {
    transform: [{ rotate: "-45deg" }],
  },
  diamondText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  surahInfo: {
    flex: 1,
    gap: 2,
  },
  surahEnglishName: {
    fontSize: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 4,
  },
  revelationBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  surahArabicContainer: {
    alignItems: "flex-end",
  },
  surahArabicText: {
    fontSize: 22,
    fontFamily: "PlusJakartaSans_700Bold",
    textAlign: "right",
  },
  recentSection: {
    marginBottom: Spacing.lg,
  },
  quranHero: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  quranHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  quranHeroIcon: {
    width: 62,
    height: 62,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  quranHeroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroDivider: {
    marginVertical: Spacing.md,
  },
  quranHeroActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  studyActionRail: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  studyActionCard: {
    flex: 1,
    minHeight: 116,
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  studyActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  studyActionText: {
    flex: 1,
    gap: 3,
  },
  quranAiConsole: {
    alignItems: "center",
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    minHeight: 126,
    overflow: "hidden",
    padding: Spacing.lg,
  },
  quranAiIcon: {
    alignItems: "center",
    borderRadius: 22,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  quranAiCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  quranAiPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 3,
  },
  quranAiPill: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  quranAiArrow: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  quranIntelligencePanel: {
    borderRadius: 28,
    borderWidth: 1,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
    padding: Spacing.lg,
  },
  quranIntelligenceHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
  },
  quranIntelligenceIcon: {
    alignItems: "center",
    borderRadius: 20,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  quranIntelligenceStats: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  quranIntelligenceStat: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    paddingVertical: Spacing.sm,
  },
  quranIntelligenceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  quranIntelligenceCard: {
    borderRadius: 20,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    gap: 6,
    minHeight: 116,
    minWidth: 132,
    padding: Spacing.md,
  },
  quranIntelligenceCardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quranIntelligenceCardIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  quranIntelligenceBadge: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  quranIntelligenceFooter: {
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  heroPrimaryAction: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  heroSecondaryAction: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: 24,
    gap: Spacing.md,
    overflow: "hidden",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_400Regular",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  recentScroll: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  recentCard: {
    width: 140,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 4,
    overflow: "hidden",
  },
  searchEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    overflow: "hidden",
  },
  recentCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recentNumber: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  recentPct: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  recentName: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  recentVerse: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  recentProgressBg: {
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  recentProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  recentDivider: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  surahCount: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_400Regular",
  },
});

type QuranHomeMode = "read" | "listen" | "study";

const QURAN_HOME_MODES = [
  { id: "read", label: "Read", icon: "book-open" as const },
  { id: "listen", label: "Listen", icon: "headphones" as const },
  { id: "study", label: "Study", icon: "feather" as const },
];

const QURAN_MODE_COPY: Record<
  QuranHomeMode,
  { eyebrow: string; title: string; body: string; cta: string }
> = {
  read: {
    eyebrow: "YOUR READING PLACE",
    title: "Return without losing the moment.",
    body: "Open the exact ayah you reached, with your translation and reading settings restored.",
    cta: "Continue reading",
  },
  listen: {
    eyebrow: "RECITATION",
    title: "Let the surah fill the room.",
    body: "Resume with your selected reciter, playback speed, offline audio, and sleep controls.",
    cta: "Listen now",
  },
  study: {
    eyebrow: "AYAH STUDY",
    title: "Meaning before more information.",
    body: "Move from translation to words, tafsir, reflection, and source-aware questions one layer at a time.",
    cta: "Open ayah study",
  },
};

export default function QuranScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<QuranHomeMode>("read");
  const [search, setSearch] = useState("");
  const [recentSurahs, setRecentSurahs] = useState<SurahProgress[]>([]);
  const [quranStats, setQuranStats] = useState<QuranStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getRecentSurahs(4), getQuranStats()]).then(
        ([recent, stats]) => {
          if (!active) return;
          setRecentSurahs(recent);
          setQuranStats(stats);
        },
      );
      return () => {
        active = false;
      };
    }, []),
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return SURAHS;
    return SURAHS.filter(
      (surah) =>
        surah.nameEnglish.toLowerCase().includes(query) ||
        surah.meaningEnglish.toLowerCase().includes(query) ||
        surah.nameArabic.includes(search.trim()) ||
        String(surah.id) === query,
    );
  }, [search]);

  const continueSurah = recentSurahs[0];
  const continueSurahName = continueSurah
    ? SURAHS.find((surah) => surah.id === continueSurah.surahNumber)
        ?.nameEnglish || continueSurah.surahName
    : "Al-Fatihah";
  const currentMode = QURAN_MODE_COPY[mode];
  const continueParams = {
    surahNumber: continueSurah?.surahNumber || 1,
    surahName: continueSurahName,
    initialVerse: continueSurah?.maxVerseRead || 1,
    ...(mode === "study" ? { initialStudyMode: "meaning" } : null),
  };

  const openCurrentMode = () => {
    navigation.navigate("QuranReader", continueParams);
  };

  const renderSurah = ({ item, index }: { item: Surah; index: number }) => (
    <AnimatedPressable
      entering={
        reduceMotion
          ? undefined
          : FadeInDown.delay(Math.min(index, 10) * 18).duration(260)
      }
      onPress={() =>
        navigation.navigate("QuranReader", {
          surahNumber: item.id,
          surahName: item.nameEnglish,
        })
      }
      testID={`surah-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.nameEnglish}, ${item.meaningEnglish}, ${item.versesCount} ayahs, ${item.revelationType}`}
      style={({ pressed }) => [
        sanctuaryStyles.surahRow,
        { borderBottomColor: theme.borderSubtle },
        pressed ? sanctuaryStyles.pressed : null,
      ]}
    >
      <View style={sanctuaryStyles.surahMarker}>
        <QuranVerseRosette color={theme.scholar} size={40} />
        <Text style={[sanctuaryStyles.surahNumber, { color: theme.scholar }]}>
          {item.id}
        </Text>
      </View>
      <View style={sanctuaryStyles.surahCopy}>
        <View style={sanctuaryStyles.surahTitleRow}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[sanctuaryStyles.surahName, { color: theme.text }]}
          >
            {item.nameEnglish}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            accessibilityLanguage="ar"
            style={[sanctuaryStyles.surahArabic, { color: theme.text }]}
          >
            {item.nameArabic}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[sanctuaryStyles.surahMeaning, { color: theme.textMuted }]}
        >
          {item.meaningEnglish} · {item.versesCount} ayahs ·{" "}
          {item.revelationType}
        </Text>
      </View>
      <AppIcon name="chevron-right" size={17} color={theme.textMuted} />
    </AnimatedPressable>
  );

  const modeActions: {
    label: string;
    icon: AppIconName;
    route: string;
    params?: Record<string, unknown>;
    testID?: string;
  }[] =
    mode === "read"
      ? [
          {
            label: "Reading plan",
            icon: "calendar" as const,
            route: "QuranReadingPlan",
            testID: "button-reading-plan",
          },
          {
            label: "Saved ayahs",
            icon: "bookmark" as const,
            route: "Bookmarks",
          },
        ]
      : mode === "listen"
        ? [
            {
              label: "Recitation settings",
              icon: "sliders" as const,
              route: "QuranReader",
              params: continueParams,
            },
            {
              label: "Offline audio",
              icon: "download-cloud" as const,
              route: "OfflineLibrary",
            },
          ]
        : [
            {
              label: "Tafsir",
              icon: "feather" as const,
              route: "Tafsir",
              testID: "button-tafsir",
            },
            { label: "Hifz", icon: "repeat" as const, route: "Hifz" },
          ];

  return (
    <View
      style={[
        sanctuaryStyles.screen,
        { backgroundColor: theme.backgroundRoot },
      ]}
    >
      <Aurora />
      <View style={[sanctuaryStyles.header, { paddingTop: insets.top + 10 }]}>
        <View style={sanctuaryStyles.headerCopy}>
          <Text
            style={[sanctuaryStyles.headerEyebrow, { color: theme.scholar }]}
          >
            THE NOBLE QURAN
          </Text>
          <Text
            accessibilityRole="header"
            style={[sanctuaryStyles.headerTitle, { color: theme.text }]}
          >
            Quran
          </Text>
        </View>
        <View style={sanctuaryStyles.headerActions}>
          <Pressable
            onPress={() => navigation.navigate("QuranReadingPlan")}
            accessibilityRole="button"
            accessibilityLabel="Open Quran reading plan"
            testID="button-reading-plan"
            style={sanctuaryStyles.headerButton}
          >
            <NuraiGlass
              interactive
              pointerEvents="none"
              radius={22}
              tint="rgba(86,179,148,0.12)"
              style={StyleSheet.absoluteFillObject}
            />
            <AppIcon name="calendar" size={18} color={theme.primary} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("Tafsir")}
            accessibilityRole="button"
            accessibilityLabel="Open Quran tafsir"
            testID="button-tafsir"
            style={sanctuaryStyles.headerButton}
          >
            <NuraiGlass
              interactive
              pointerEvents="none"
              radius={22}
              tint="rgba(207,174,105,0.11)"
              style={StyleSheet.absoluteFillObject}
            />
            <AppIcon name="feather" size={18} color={theme.scholar} />
          </Pressable>
        </View>
      </View>

      <View style={sanctuaryStyles.modeRailWrap}>
        <NuraiSegmentedControl
          testID="quran-home-mode-control"
          options={QURAN_HOME_MODES}
          value={mode}
          onChange={(value) => setMode(value as QuranHomeMode)}
        />
      </View>

      <FlatList
        style={sanctuaryStyles.list}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderSurah}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        ListHeaderComponent={
          <View>
            {!search.trim() ? (
              <>
                <Animated.View
                  entering={reduceMotion ? undefined : FadeInDown.duration(420)}
                  style={sanctuaryStyles.sanctuary}
                >
                  <QuranSanctuaryArtwork
                    emerald={theme.primary}
                    gold={theme.scholar}
                    style={sanctuaryStyles.sanctuaryArtwork}
                  />
                  <View style={sanctuaryStyles.sanctuaryCopy}>
                    <Text
                      style={[
                        sanctuaryStyles.sanctuaryEyebrow,
                        { color: theme.scholar },
                      ]}
                    >
                      {currentMode.eyebrow}
                    </Text>
                    <Text
                      style={[
                        sanctuaryStyles.sanctuaryArabic,
                        { color: theme.text },
                      ]}
                    >
                      القرآن الكريم
                    </Text>
                    <Text
                      style={[
                        sanctuaryStyles.sanctuaryTitle,
                        { color: theme.text },
                      ]}
                    >
                      {currentMode.title}
                    </Text>
                    <Text
                      style={[
                        sanctuaryStyles.sanctuaryBody,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {currentMode.body}
                    </Text>
                  </View>

                  <View style={sanctuaryStyles.continueMeta}>
                    <View style={sanctuaryStyles.continuePosition}>
                      <Text
                        style={[
                          sanctuaryStyles.continueName,
                          { color: theme.text },
                        ]}
                      >
                        {continueSurahName}
                      </Text>
                      <Text
                        style={[
                          sanctuaryStyles.continueVerse,
                          { color: theme.textMuted },
                        ]}
                      >
                        {continueSurah
                          ? `Ayah ${continueSurah.maxVerseRead} of ${continueSurah.totalVerses}`
                          : "Begin with the Opening"}
                      </Text>
                    </View>
                    <Text
                      style={[
                        sanctuaryStyles.continuePercent,
                        { color: theme.scholar },
                      ]}
                    >
                      {continueSurah?.percentage || 0}%
                    </Text>
                  </View>
                  <View
                    style={[
                      sanctuaryStyles.progressTrack,
                      { backgroundColor: `${theme.text}12` },
                    ]}
                  >
                    <View
                      style={[
                        sanctuaryStyles.progressFill,
                        {
                          backgroundColor: theme.primary,
                          width: `${Math.max(continueSurah?.percentage || 0, 2)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Pressable
                    onPress={openCurrentMode}
                    accessibilityRole="button"
                    accessibilityLabel={`${currentMode.cta}. ${continueSurahName}`}
                    testID="button-continue-quran"
                    style={({ pressed }) => [
                      sanctuaryStyles.continueButton,
                      { backgroundColor: theme.primary },
                      pressed ? sanctuaryStyles.pressed : null,
                    ]}
                  >
                    <AppIcon
                      name={
                        mode === "listen"
                          ? "headphones"
                          : mode === "study"
                            ? "feather"
                            : "book-open"
                      }
                      size={17}
                      color={theme.primaryForeground}
                    />
                    <Text
                      style={[
                        sanctuaryStyles.continueButtonText,
                        { color: theme.primaryForeground },
                      ]}
                    >
                      {currentMode.cta}
                    </Text>
                    <AppIcon
                      name="arrow-right"
                      size={17}
                      color={theme.primaryForeground}
                    />
                  </Pressable>
                </Animated.View>

                <View style={sanctuaryStyles.modeActions}>
                  {modeActions.map((action) => (
                    <Pressable
                      key={action.label}
                      testID={action.testID}
                      onPress={() =>
                        navigation.navigate(action.route, action.params)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={action.label}
                      style={({ pressed }) => [
                        sanctuaryStyles.modeAction,
                        { borderBottomColor: theme.borderSubtle },
                        pressed ? sanctuaryStyles.pressed : null,
                      ]}
                    >
                      <View
                        style={[
                          sanctuaryStyles.modeActionIcon,
                          { backgroundColor: `${theme.primary}12` },
                        ]}
                      >
                        <AppIcon
                          name={action.icon}
                          size={17}
                          color={theme.primary}
                        />
                      </View>
                      <Text
                        style={[
                          sanctuaryStyles.modeActionLabel,
                          { color: theme.text },
                        ]}
                      >
                        {action.label}
                      </Text>
                      <AppIcon
                        name="arrow-up-right"
                        size={16}
                        color={theme.textMuted}
                      />
                    </Pressable>
                  ))}
                </View>

                {quranStats ? (
                  <View
                    accessible
                    accessibilityLabel={`${quranStats.totalPercentage} percent complete. ${quranStats.surahsStarted} surahs started. ${quranStats.surahsCompleted} completed.`}
                    style={sanctuaryStyles.journeyRow}
                  >
                    <View style={sanctuaryStyles.journeyCopy}>
                      <Text
                        style={[
                          sanctuaryStyles.sectionEyebrow,
                          { color: theme.primary },
                        ]}
                      >
                        YOUR JOURNEY
                      </Text>
                      <Text
                        style={[
                          sanctuaryStyles.journeyTitle,
                          { color: theme.text },
                        ]}
                      >
                        {quranStats.totalPercentage}% of the Quran read
                      </Text>
                      <Text
                        style={[
                          sanctuaryStyles.journeyBody,
                          { color: theme.textMuted },
                        ]}
                      >
                        {quranStats.surahsStarted} started ·{" "}
                        {quranStats.surahsCompleted} completed
                      </Text>
                    </View>
                    <View
                      style={[
                        sanctuaryStyles.journeyMedallion,
                        { borderColor: `${theme.scholar}55` },
                      ]}
                    >
                      <Text
                        style={[
                          sanctuaryStyles.journeyValue,
                          { color: theme.scholar },
                        ]}
                      >
                        {quranStats.totalPercentage}%
                      </Text>
                    </View>
                  </View>
                ) : null}

                {recentSurahs.length > 0 ? (
                  <View style={sanctuaryStyles.recentSection}>
                    <Text
                      style={[
                        sanctuaryStyles.sectionEyebrow,
                        { color: theme.scholar },
                      ]}
                    >
                      RETURN TO
                    </Text>
                    <Text
                      style={[
                        sanctuaryStyles.sectionTitle,
                        { color: theme.text },
                      ]}
                    >
                      Recently read
                    </Text>
                    {recentSurahs.slice(0, 3).map((surah) => (
                      <Pressable
                        key={surah.surahNumber}
                        testID={`recent-surah-${surah.surahNumber}`}
                        onPress={() =>
                          navigation.navigate("QuranReader", {
                            surahNumber: surah.surahNumber,
                            surahName: surah.surahName,
                            initialVerse: surah.maxVerseRead,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Continue ${surah.surahName} at ayah ${surah.maxVerseRead}`}
                        style={({ pressed }) => [
                          sanctuaryStyles.recentRow,
                          { borderBottomColor: theme.borderSubtle },
                          pressed ? sanctuaryStyles.pressed : null,
                        ]}
                      >
                        <View
                          style={[
                            sanctuaryStyles.recentLine,
                            { backgroundColor: theme.primary },
                          ]}
                        />
                        <View style={sanctuaryStyles.recentCopy}>
                          <Text
                            style={[
                              sanctuaryStyles.recentName,
                              { color: theme.text },
                            ]}
                          >
                            {surah.surahName}
                          </Text>
                          <Text
                            style={[
                              sanctuaryStyles.recentDetail,
                              { color: theme.textMuted },
                            ]}
                          >
                            Ayah {surah.maxVerseRead} · {surah.percentage}%
                          </Text>
                        </View>
                        <AppIcon
                          name="arrow-right"
                          size={16}
                          color={theme.primary}
                        />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}

            <View style={sanctuaryStyles.indexHeader}>
              <View>
                <Text
                  style={[
                    sanctuaryStyles.sectionEyebrow,
                    { color: theme.primary },
                  ]}
                >
                  114 SURAHS
                </Text>
                <Text
                  style={[sanctuaryStyles.sectionTitle, { color: theme.text }]}
                >
                  Quran index
                </Text>
              </View>
            </View>
            <View style={sanctuaryStyles.searchWrap}>
              <NuraiGlass
                pointerEvents="none"
                radius={20}
                tint="rgba(7,20,22,0.52)"
                style={StyleSheet.absoluteFillObject}
              />
              <AppIcon name="search" size={19} color={theme.primary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by surah, meaning, or number"
                placeholderTextColor={theme.textMuted}
                accessibilityLabel="Search Quran surahs"
                testID="input-search-surah"
                style={[sanctuaryStyles.searchInput, { color: theme.text }]}
              />
              {search ? (
                <Pressable
                  onPress={() => setSearch("")}
                  accessibilityRole="button"
                  accessibilityLabel="Clear Quran search"
                  hitSlop={10}
                >
                  <AppIcon name="x-circle" size={18} color={theme.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={sanctuaryStyles.emptyState}>
            <QuranVerseRosette color={theme.scholar} size={54} />
            <Text style={[sanctuaryStyles.sectionTitle, { color: theme.text }]}>
              No surah found
            </Text>
            <Text
              style={[sanctuaryStyles.emptyBody, { color: theme.textMuted }]}
            >
              Try a surah name, its meaning, or a number from 1 to 114.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const sanctuaryStyles = StyleSheet.create({
  screen: { flex: 1 },
  list: { width: "100%" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCopy: { gap: 1 },
  headerEyebrow: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 1.3,
  },
  headerTitle: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 28,
    lineHeight: 36,
  },
  headerActions: { flexDirection: "row", gap: 8 },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    overflow: "hidden",
  },
  modeRailWrap: { paddingHorizontal: 20, paddingBottom: 10 },
  sanctuary: {
    minHeight: 488,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  sanctuaryArtwork: { bottom: 88, opacity: 0.62 },
  sanctuaryCopy: { alignItems: "center", paddingHorizontal: 8 },
  sanctuaryEyebrow: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 1.4,
    textAlign: "center",
  },
  sanctuaryArabic: {
    fontFamily: "AmiriQuran_400Regular",
    fontSize: 34,
    lineHeight: 54,
    textAlign: "center",
    writingDirection: "rtl",
  },
  sanctuaryTitle: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 24,
    lineHeight: 32,
    textAlign: "center",
    maxWidth: 320,
  },
  sanctuaryBody: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 320,
    marginTop: 8,
  },
  continueMeta: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 24,
  },
  continuePosition: { gap: 2 },
  continueName: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    lineHeight: 21,
  },
  continueVerse: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  continuePercent: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    lineHeight: 20,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  continueButton: {
    minHeight: 52,
    borderRadius: 18,
    marginTop: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  continueButtonText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    textAlign: "center",
  },
  modeActions: { paddingHorizontal: 20, marginBottom: 32 },
  modeAction: {
    minHeight: 58,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modeActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  modeActionLabel: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
  },
  journeyRow: {
    marginHorizontal: 20,
    marginBottom: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  journeyCopy: { flex: 1, gap: 3 },
  sectionEyebrow: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 1.25,
  },
  journeyTitle: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 18,
    lineHeight: 26,
  },
  journeyBody: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  journeyMedallion: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  journeyValue: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
  },
  recentSection: { paddingHorizontal: 20, marginBottom: 38 },
  sectionTitle: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 20,
    lineHeight: 28,
  },
  recentRow: {
    minHeight: 62,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recentLine: { width: 2, height: 28, borderRadius: 1 },
  recentCopy: { flex: 1, gap: 2 },
  recentName: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
  },
  recentDetail: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
  },
  indexHeader: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  searchWrap: {
    height: 52,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
  },
  surahRow: {
    minHeight: 82,
    marginHorizontal: 20,
    alignSelf: "stretch",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  surahMarker: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  surahNumber: {
    position: "absolute",
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
  },
  surahCopy: { flex: 1, minWidth: 0, gap: 2 },
  surahTitleRow: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  surahName: {
    flex: 1,
    minWidth: 0,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    lineHeight: 20,
  },
  surahMeaning: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10.5,
    lineHeight: 16,
  },
  surahArabic: {
    maxWidth: "44%",
    flexShrink: 1,
    fontFamily: "NotoNaskhArabic_600SemiBold",
    fontSize: 21,
    lineHeight: 34,
    writingDirection: "rtl",
    textAlign: "right",
  },
  emptyState: {
    paddingHorizontal: 36,
    paddingVertical: 56,
    alignItems: "center",
    gap: 10,
  },
  emptyBody: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
