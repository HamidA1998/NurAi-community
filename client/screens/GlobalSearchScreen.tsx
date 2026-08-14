import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
  InteractionManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { HADITH_COLLECTIONS } from "@/data/hadithData";
import {
  ISLAMIC_CALENDAR_EVENTS,
  ISLAMIC_MONTHS,
} from "@/data/islamicCalendarEvents";
import { getBookById, getBooks } from "@/services/libraryService";
import { getAllBookProgress } from "@/services/libraryProgressService";
import { extractFlightNumberFromText } from "@/services/travelCompanionService";
import type { UserBookProgress } from "@/types/library";
import { AppIcon, type AppIconName } from "@/components/icons";

const RECENT_SEARCHES_KEY = "recent_searches";
const MAX_RECENT = 10;
const MAX_PER_CATEGORY = 5;

interface SurahItem {
  id: number;
  nameArabic: string;
  nameEnglish: string;
  meaningEnglish: string;
}

const SURAHS: SurahItem[] = [
  {
    id: 1,
    nameArabic: "\u0627\u0644\u0641\u0627\u062a\u062d\u0629",
    nameEnglish: "Al-Fatihah",
    meaningEnglish: "The Opening",
  },
  {
    id: 2,
    nameArabic: "\u0627\u0644\u0628\u0642\u0631\u0629",
    nameEnglish: "Al-Baqarah",
    meaningEnglish: "The Cow",
  },
  {
    id: 3,
    nameArabic: "\u0622\u0644 \u0639\u0645\u0631\u0627\u0646",
    nameEnglish: "Aal-E-Imran",
    meaningEnglish: "The Family of Imran",
  },
  {
    id: 4,
    nameArabic: "\u0627\u0644\u0646\u0633\u0627\u0621",
    nameEnglish: "An-Nisa",
    meaningEnglish: "The Women",
  },
  {
    id: 5,
    nameArabic: "\u0627\u0644\u0645\u0627\u0626\u062f\u0629",
    nameEnglish: "Al-Ma'idah",
    meaningEnglish: "The Table Spread",
  },
  {
    id: 6,
    nameArabic: "\u0627\u0644\u0623\u0646\u0639\u0627\u0645",
    nameEnglish: "Al-An'am",
    meaningEnglish: "The Cattle",
  },
  {
    id: 7,
    nameArabic: "\u0627\u0644\u0623\u0639\u0631\u0627\u0641",
    nameEnglish: "Al-A'raf",
    meaningEnglish: "The Heights",
  },
  {
    id: 8,
    nameArabic: "\u0627\u0644\u0623\u0646\u0641\u0627\u0644",
    nameEnglish: "Al-Anfal",
    meaningEnglish: "The Spoils of War",
  },
  {
    id: 9,
    nameArabic: "\u0627\u0644\u062a\u0648\u0628\u0629",
    nameEnglish: "At-Tawbah",
    meaningEnglish: "The Repentance",
  },
  {
    id: 10,
    nameArabic: "\u064a\u0648\u0646\u0633",
    nameEnglish: "Yunus",
    meaningEnglish: "Jonah",
  },
  {
    id: 11,
    nameArabic: "\u0647\u0648\u062f",
    nameEnglish: "Hud",
    meaningEnglish: "Hud",
  },
  {
    id: 12,
    nameArabic: "\u064a\u0648\u0633\u0641",
    nameEnglish: "Yusuf",
    meaningEnglish: "Joseph",
  },
  {
    id: 13,
    nameArabic: "\u0627\u0644\u0631\u0639\u062f",
    nameEnglish: "Ar-Ra'd",
    meaningEnglish: "The Thunder",
  },
  {
    id: 14,
    nameArabic: "\u0625\u0628\u0631\u0627\u0647\u064a\u0645",
    nameEnglish: "Ibrahim",
    meaningEnglish: "Abraham",
  },
  {
    id: 15,
    nameArabic: "\u0627\u0644\u062d\u062c\u0631",
    nameEnglish: "Al-Hijr",
    meaningEnglish: "The Rocky Tract",
  },
  {
    id: 16,
    nameArabic: "\u0627\u0644\u0646\u062d\u0644",
    nameEnglish: "An-Nahl",
    meaningEnglish: "The Bee",
  },
  {
    id: 17,
    nameArabic: "\u0627\u0644\u0625\u0633\u0631\u0627\u0621",
    nameEnglish: "Al-Isra",
    meaningEnglish: "The Night Journey",
  },
  {
    id: 18,
    nameArabic: "\u0627\u0644\u0643\u0647\u0641",
    nameEnglish: "Al-Kahf",
    meaningEnglish: "The Cave",
  },
  {
    id: 19,
    nameArabic: "\u0645\u0631\u064a\u0645",
    nameEnglish: "Maryam",
    meaningEnglish: "Mary",
  },
  {
    id: 20,
    nameArabic: "\u0637\u0647",
    nameEnglish: "Ta-Ha",
    meaningEnglish: "Ta-Ha",
  },
  {
    id: 21,
    nameArabic: "\u0627\u0644\u0623\u0646\u0628\u064a\u0627\u0621",
    nameEnglish: "Al-Anbiya",
    meaningEnglish: "The Prophets",
  },
  {
    id: 22,
    nameArabic: "\u0627\u0644\u062d\u062c",
    nameEnglish: "Al-Hajj",
    meaningEnglish: "The Pilgrimage",
  },
  {
    id: 23,
    nameArabic: "\u0627\u0644\u0645\u0624\u0645\u0646\u0648\u0646",
    nameEnglish: "Al-Mu'minun",
    meaningEnglish: "The Believers",
  },
  {
    id: 24,
    nameArabic: "\u0627\u0644\u0646\u0648\u0631",
    nameEnglish: "An-Nur",
    meaningEnglish: "The Light",
  },
  {
    id: 25,
    nameArabic: "\u0627\u0644\u0641\u0631\u0642\u0627\u0646",
    nameEnglish: "Al-Furqan",
    meaningEnglish: "The Criterion",
  },
  {
    id: 26,
    nameArabic: "\u0627\u0644\u0634\u0639\u0631\u0627\u0621",
    nameEnglish: "Ash-Shu'ara",
    meaningEnglish: "The Poets",
  },
  {
    id: 27,
    nameArabic: "\u0627\u0644\u0646\u0645\u0644",
    nameEnglish: "An-Naml",
    meaningEnglish: "The Ants",
  },
  {
    id: 28,
    nameArabic: "\u0627\u0644\u0642\u0635\u0635",
    nameEnglish: "Al-Qasas",
    meaningEnglish: "The Stories",
  },
  {
    id: 29,
    nameArabic: "\u0627\u0644\u0639\u0646\u0643\u0628\u0648\u062a",
    nameEnglish: "Al-Ankabut",
    meaningEnglish: "The Spider",
  },
  {
    id: 30,
    nameArabic: "\u0627\u0644\u0631\u0648\u0645",
    nameEnglish: "Ar-Rum",
    meaningEnglish: "The Romans",
  },
  {
    id: 31,
    nameArabic: "\u0644\u0642\u0645\u0627\u0646",
    nameEnglish: "Luqman",
    meaningEnglish: "Luqman",
  },
  {
    id: 32,
    nameArabic: "\u0627\u0644\u0633\u062c\u062f\u0629",
    nameEnglish: "As-Sajdah",
    meaningEnglish: "The Prostration",
  },
  {
    id: 33,
    nameArabic: "\u0627\u0644\u0623\u062d\u0632\u0627\u0628",
    nameEnglish: "Al-Ahzab",
    meaningEnglish: "The Combined Forces",
  },
  {
    id: 34,
    nameArabic: "\u0633\u0628\u0623",
    nameEnglish: "Saba",
    meaningEnglish: "Sheba",
  },
  {
    id: 35,
    nameArabic: "\u0641\u0627\u0637\u0631",
    nameEnglish: "Fatir",
    meaningEnglish: "The Originator",
  },
  {
    id: 36,
    nameArabic: "\u064a\u0633",
    nameEnglish: "Ya-Sin",
    meaningEnglish: "Ya-Sin",
  },
  {
    id: 37,
    nameArabic: "\u0627\u0644\u0635\u0627\u0641\u0627\u062a",
    nameEnglish: "As-Saffat",
    meaningEnglish: "Those Ranged in Ranks",
  },
  { id: 38, nameArabic: "\u0635", nameEnglish: "Sad", meaningEnglish: "Sad" },
  {
    id: 39,
    nameArabic: "\u0627\u0644\u0632\u0645\u0631",
    nameEnglish: "Az-Zumar",
    meaningEnglish: "The Groups",
  },
  {
    id: 40,
    nameArabic: "\u063a\u0627\u0641\u0631",
    nameEnglish: "Ghafir",
    meaningEnglish: "The Forgiver",
  },
  {
    id: 41,
    nameArabic: "\u0641\u0635\u0644\u062a",
    nameEnglish: "Fussilat",
    meaningEnglish: "Explained in Detail",
  },
  {
    id: 42,
    nameArabic: "\u0627\u0644\u0634\u0648\u0631\u0649",
    nameEnglish: "Ash-Shura",
    meaningEnglish: "The Consultation",
  },
  {
    id: 43,
    nameArabic: "\u0627\u0644\u0632\u062e\u0631\u0641",
    nameEnglish: "Az-Zukhruf",
    meaningEnglish: "The Gold Adornments",
  },
  {
    id: 44,
    nameArabic: "\u0627\u0644\u062f\u062e\u0627\u0646",
    nameEnglish: "Ad-Dukhan",
    meaningEnglish: "The Smoke",
  },
  {
    id: 45,
    nameArabic: "\u0627\u0644\u062c\u0627\u062b\u064a\u0629",
    nameEnglish: "Al-Jathiyah",
    meaningEnglish: "The Crouching",
  },
  {
    id: 46,
    nameArabic: "\u0627\u0644\u0623\u062d\u0642\u0627\u0641",
    nameEnglish: "Al-Ahqaf",
    meaningEnglish: "The Sand Dunes",
  },
  {
    id: 47,
    nameArabic: "\u0645\u062d\u0645\u062f",
    nameEnglish: "Muhammad",
    meaningEnglish: "Muhammad",
  },
  {
    id: 48,
    nameArabic: "\u0627\u0644\u0641\u062a\u062d",
    nameEnglish: "Al-Fath",
    meaningEnglish: "The Victory",
  },
  {
    id: 49,
    nameArabic: "\u0627\u0644\u062d\u062c\u0631\u0627\u062a",
    nameEnglish: "Al-Hujurat",
    meaningEnglish: "The Rooms",
  },
  { id: 50, nameArabic: "\u0642", nameEnglish: "Qaf", meaningEnglish: "Qaf" },
  {
    id: 51,
    nameArabic: "\u0627\u0644\u0630\u0627\u0631\u064a\u0627\u062a",
    nameEnglish: "Adh-Dhariyat",
    meaningEnglish: "The Scattering Winds",
  },
  {
    id: 52,
    nameArabic: "\u0627\u0644\u0637\u0648\u0631",
    nameEnglish: "At-Tur",
    meaningEnglish: "The Mount",
  },
  {
    id: 53,
    nameArabic: "\u0627\u0644\u0646\u062c\u0645",
    nameEnglish: "An-Najm",
    meaningEnglish: "The Star",
  },
  {
    id: 54,
    nameArabic: "\u0627\u0644\u0642\u0645\u0631",
    nameEnglish: "Al-Qamar",
    meaningEnglish: "The Moon",
  },
  {
    id: 55,
    nameArabic: "\u0627\u0644\u0631\u062d\u0645\u0646",
    nameEnglish: "Ar-Rahman",
    meaningEnglish: "The Most Gracious",
  },
  {
    id: 56,
    nameArabic: "\u0627\u0644\u0648\u0627\u0642\u0639\u0629",
    nameEnglish: "Al-Waqi'ah",
    meaningEnglish: "The Event",
  },
  {
    id: 57,
    nameArabic: "\u0627\u0644\u062d\u062f\u064a\u062f",
    nameEnglish: "Al-Hadid",
    meaningEnglish: "The Iron",
  },
  {
    id: 58,
    nameArabic: "\u0627\u0644\u0645\u062c\u0627\u062f\u0644\u0629",
    nameEnglish: "Al-Mujadila",
    meaningEnglish: "The Pleading",
  },
  {
    id: 59,
    nameArabic: "\u0627\u0644\u062d\u0634\u0631",
    nameEnglish: "Al-Hashr",
    meaningEnglish: "The Gathering",
  },
  {
    id: 60,
    nameArabic: "\u0627\u0644\u0645\u0645\u062a\u062d\u0646\u0629",
    nameEnglish: "Al-Mumtahanah",
    meaningEnglish: "The Examined One",
  },
  {
    id: 61,
    nameArabic: "\u0627\u0644\u0635\u0641",
    nameEnglish: "As-Saff",
    meaningEnglish: "The Ranks",
  },
  {
    id: 62,
    nameArabic: "\u0627\u0644\u062c\u0645\u0639\u0629",
    nameEnglish: "Al-Jumu'ah",
    meaningEnglish: "Friday",
  },
  {
    id: 63,
    nameArabic: "\u0627\u0644\u0645\u0646\u0627\u0641\u0642\u0648\u0646",
    nameEnglish: "Al-Munafiqun",
    meaningEnglish: "The Hypocrites",
  },
  {
    id: 64,
    nameArabic: "\u0627\u0644\u062a\u063a\u0627\u0628\u0646",
    nameEnglish: "At-Taghabun",
    meaningEnglish: "The Mutual Loss",
  },
  {
    id: 65,
    nameArabic: "\u0627\u0644\u0637\u0644\u0627\u0642",
    nameEnglish: "At-Talaq",
    meaningEnglish: "The Divorce",
  },
  {
    id: 66,
    nameArabic: "\u0627\u0644\u062a\u062d\u0631\u064a\u0645",
    nameEnglish: "At-Tahrim",
    meaningEnglish: "The Prohibition",
  },
  {
    id: 67,
    nameArabic: "\u0627\u0644\u0645\u0644\u0643",
    nameEnglish: "Al-Mulk",
    meaningEnglish: "The Sovereignty",
  },
  {
    id: 68,
    nameArabic: "\u0627\u0644\u0642\u0644\u0645",
    nameEnglish: "Al-Qalam",
    meaningEnglish: "The Pen",
  },
  {
    id: 69,
    nameArabic: "\u0627\u0644\u062d\u0627\u0642\u0629",
    nameEnglish: "Al-Haqqah",
    meaningEnglish: "The Inevitable",
  },
  {
    id: 70,
    nameArabic: "\u0627\u0644\u0645\u0639\u0627\u0631\u062c",
    nameEnglish: "Al-Ma'arij",
    meaningEnglish: "The Ways of Ascent",
  },
  {
    id: 71,
    nameArabic: "\u0646\u0648\u062d",
    nameEnglish: "Nuh",
    meaningEnglish: "Noah",
  },
  {
    id: 72,
    nameArabic: "\u0627\u0644\u062c\u0646",
    nameEnglish: "Al-Jinn",
    meaningEnglish: "The Jinn",
  },
  {
    id: 73,
    nameArabic: "\u0627\u0644\u0645\u0632\u0645\u0644",
    nameEnglish: "Al-Muzzammil",
    meaningEnglish: "The Enshrouded One",
  },
  {
    id: 74,
    nameArabic: "\u0627\u0644\u0645\u062f\u062b\u0631",
    nameEnglish: "Al-Muddaththir",
    meaningEnglish: "The Cloaked One",
  },
  {
    id: 75,
    nameArabic: "\u0627\u0644\u0642\u064a\u0627\u0645\u0629",
    nameEnglish: "Al-Qiyamah",
    meaningEnglish: "The Resurrection",
  },
  {
    id: 76,
    nameArabic: "\u0627\u0644\u0625\u0646\u0633\u0627\u0646",
    nameEnglish: "Al-Insan",
    meaningEnglish: "Man",
  },
  {
    id: 77,
    nameArabic: "\u0627\u0644\u0645\u0631\u0633\u0644\u0627\u062a",
    nameEnglish: "Al-Mursalat",
    meaningEnglish: "Those Sent Forth",
  },
  {
    id: 78,
    nameArabic: "\u0627\u0644\u0646\u0628\u0623",
    nameEnglish: "An-Naba",
    meaningEnglish: "The News",
  },
  {
    id: 79,
    nameArabic: "\u0627\u0644\u0646\u0627\u0632\u0639\u0627\u062a",
    nameEnglish: "An-Nazi'at",
    meaningEnglish: "Those Who Pull Out",
  },
  {
    id: 80,
    nameArabic: "\u0639\u0628\u0633",
    nameEnglish: "Abasa",
    meaningEnglish: "He Frowned",
  },
  {
    id: 81,
    nameArabic: "\u0627\u0644\u062a\u0643\u0648\u064a\u0631",
    nameEnglish: "At-Takwir",
    meaningEnglish: "The Folding Up",
  },
  {
    id: 82,
    nameArabic: "\u0627\u0644\u0627\u0646\u0641\u0637\u0627\u0631",
    nameEnglish: "Al-Infitar",
    meaningEnglish: "The Splitting",
  },
  {
    id: 83,
    nameArabic: "\u0627\u0644\u0645\u0637\u0641\u0641\u064a\u0646",
    nameEnglish: "Al-Mutaffifin",
    meaningEnglish: "The Defrauders",
  },
  {
    id: 84,
    nameArabic: "\u0627\u0644\u0627\u0646\u0634\u0642\u0627\u0642",
    nameEnglish: "Al-Inshiqaq",
    meaningEnglish: "The Splitting Asunder",
  },
  {
    id: 85,
    nameArabic: "\u0627\u0644\u0628\u0631\u0648\u062c",
    nameEnglish: "Al-Buruj",
    meaningEnglish: "The Stars",
  },
  {
    id: 86,
    nameArabic: "\u0627\u0644\u0637\u0627\u0631\u0642",
    nameEnglish: "At-Tariq",
    meaningEnglish: "The Morning Star",
  },
  {
    id: 87,
    nameArabic: "\u0627\u0644\u0623\u0639\u0644\u0649",
    nameEnglish: "Al-A'la",
    meaningEnglish: "The Most High",
  },
  {
    id: 88,
    nameArabic: "\u0627\u0644\u063a\u0627\u0634\u064a\u0629",
    nameEnglish: "Al-Ghashiyah",
    meaningEnglish: "The Overwhelming",
  },
  {
    id: 89,
    nameArabic: "\u0627\u0644\u0641\u062c\u0631",
    nameEnglish: "Al-Fajr",
    meaningEnglish: "The Dawn",
  },
  {
    id: 90,
    nameArabic: "\u0627\u0644\u0628\u0644\u062f",
    nameEnglish: "Al-Balad",
    meaningEnglish: "The City",
  },
  {
    id: 91,
    nameArabic: "\u0627\u0644\u0634\u0645\u0633",
    nameEnglish: "Ash-Shams",
    meaningEnglish: "The Sun",
  },
  {
    id: 92,
    nameArabic: "\u0627\u0644\u0644\u064a\u0644",
    nameEnglish: "Al-Layl",
    meaningEnglish: "The Night",
  },
  {
    id: 93,
    nameArabic: "\u0627\u0644\u0636\u062d\u0649",
    nameEnglish: "Ad-Duha",
    meaningEnglish: "The Forenoon",
  },
  {
    id: 94,
    nameArabic: "\u0627\u0644\u0634\u0631\u062d",
    nameEnglish: "Ash-Sharh",
    meaningEnglish: "The Opening Forth",
  },
  {
    id: 95,
    nameArabic: "\u0627\u0644\u062a\u064a\u0646",
    nameEnglish: "At-Tin",
    meaningEnglish: "The Fig",
  },
  {
    id: 96,
    nameArabic: "\u0627\u0644\u0639\u0644\u0642",
    nameEnglish: "Al-Alaq",
    meaningEnglish: "The Clot",
  },
  {
    id: 97,
    nameArabic: "\u0627\u0644\u0642\u062f\u0631",
    nameEnglish: "Al-Qadr",
    meaningEnglish: "The Power",
  },
  {
    id: 98,
    nameArabic: "\u0627\u0644\u0628\u064a\u0646\u0629",
    nameEnglish: "Al-Bayyinah",
    meaningEnglish: "The Clear Evidence",
  },
  {
    id: 99,
    nameArabic: "\u0627\u0644\u0632\u0644\u0632\u0644\u0629",
    nameEnglish: "Az-Zalzalah",
    meaningEnglish: "The Earthquake",
  },
  {
    id: 100,
    nameArabic: "\u0627\u0644\u0639\u0627\u062f\u064a\u0627\u062a",
    nameEnglish: "Al-Adiyat",
    meaningEnglish: "The Chargers",
  },
  {
    id: 101,
    nameArabic: "\u0627\u0644\u0642\u0627\u0631\u0639\u0629",
    nameEnglish: "Al-Qari'ah",
    meaningEnglish: "The Calamity",
  },
  {
    id: 102,
    nameArabic: "\u0627\u0644\u062a\u0643\u0627\u062b\u0631",
    nameEnglish: "At-Takathur",
    meaningEnglish: "The Rivalry",
  },
  {
    id: 103,
    nameArabic: "\u0627\u0644\u0639\u0635\u0631",
    nameEnglish: "Al-Asr",
    meaningEnglish: "The Time",
  },
  {
    id: 104,
    nameArabic: "\u0627\u0644\u0647\u0645\u0632\u0629",
    nameEnglish: "Al-Humazah",
    meaningEnglish: "The Slanderer",
  },
  {
    id: 105,
    nameArabic: "\u0627\u0644\u0641\u064a\u0644",
    nameEnglish: "Al-Fil",
    meaningEnglish: "The Elephant",
  },
  {
    id: 106,
    nameArabic: "\u0642\u0631\u064a\u0634",
    nameEnglish: "Quraysh",
    meaningEnglish: "Quraysh",
  },
  {
    id: 107,
    nameArabic: "\u0627\u0644\u0645\u0627\u0639\u0648\u0646",
    nameEnglish: "Al-Ma'un",
    meaningEnglish: "The Small Kindnesses",
  },
  {
    id: 108,
    nameArabic: "\u0627\u0644\u0643\u0648\u062b\u0631",
    nameEnglish: "Al-Kawthar",
    meaningEnglish: "The Abundance",
  },
  {
    id: 109,
    nameArabic: "\u0627\u0644\u0643\u0627\u0641\u0631\u0648\u0646",
    nameEnglish: "Al-Kafirun",
    meaningEnglish: "The Disbelievers",
  },
  {
    id: 110,
    nameArabic: "\u0627\u0644\u0646\u0635\u0631",
    nameEnglish: "An-Nasr",
    meaningEnglish: "The Help",
  },
  {
    id: 111,
    nameArabic: "\u0627\u0644\u0645\u0633\u062f",
    nameEnglish: "Al-Masad",
    meaningEnglish: "The Palm Fiber",
  },
  {
    id: 112,
    nameArabic: "\u0627\u0644\u0625\u062e\u0644\u0627\u0635",
    nameEnglish: "Al-Ikhlas",
    meaningEnglish: "The Sincerity",
  },
  {
    id: 113,
    nameArabic: "\u0627\u0644\u0641\u0644\u0642",
    nameEnglish: "Al-Falaq",
    meaningEnglish: "The Daybreak",
  },
  {
    id: 114,
    nameArabic: "\u0627\u0644\u0646\u0627\u0633",
    nameEnglish: "An-Nas",
    meaningEnglish: "Mankind",
  },
];

const SETTINGS_ITEMS: {
  title: string;
  subtitle: string;
  icon: AppIconName;
  screen: string;
}[] = [
  {
    title: "Prayer Times",
    subtitle: "Daily prayer schedule",
    icon: "clock",
    screen: "PrayerTimes",
  },
  {
    title: "Qibla Direction",
    subtitle: "Find Qibla",
    icon: "compass",
    screen: "Qibla",
  },
  {
    title: "Tasbeeh Counter",
    subtitle: "Digital dhikr counter",
    icon: "repeat",
    screen: "Tasbeeh",
  },
  {
    title: "99 Names of Allah",
    subtitle: "Al-Asma Al-Husna",
    icon: "star",
    screen: "NamesOfAllah",
  },
  {
    title: "Duas Collection",
    subtitle: "Daily prayers",
    icon: "heart",
    screen: "Duas",
  },
  {
    title: "Hadith Library",
    subtitle: "Browse hadith",
    icon: "book",
    screen: "HadithLibrary",
  },
  {
    title: "NurAI Library",
    subtitle: "Interactive Islamic books",
    icon: "book-open",
    screen: "LibraryHome",
  },
  {
    title: "Zakat Calculator",
    subtitle: "Calculate zakat",
    icon: "dollar-sign",
    screen: "Zakat",
  },
  {
    title: "Islamic Calendar",
    subtitle: "Hijri dates",
    icon: "calendar",
    screen: "IslamicCalendar",
  },
  {
    title: "Ramadan",
    subtitle: "Ramadan tools",
    icon: "moon",
    screen: "Ramadan",
  },
  {
    title: "Arabic Learning",
    subtitle: "Dialogue, Quran words, and daily coaching",
    icon: "type",
    screen: "ArabicLearning",
  },
  {
    title: "Arabic Games",
    subtitle: "Fun learning",
    icon: "play",
    screen: "ArabicGames",
  },
  {
    title: "Stories of Prophets",
    subtitle: "25 prophets",
    icon: "book-open",
    screen: "Prophets",
  },
  {
    title: "Salah & Wudu Guide",
    subtitle: "How to pray",
    icon: "compass",
    screen: "SalahGuide",
  },
  {
    title: "Islamic Scholars",
    subtitle: "Famous scholars",
    icon: "users",
    screen: "Scholars",
  },
  {
    title: "Fiqh Reference",
    subtitle: "Islamic jurisprudence",
    icon: "layers",
    screen: "Fiqh",
  },
  {
    title: "Islamic Timeline",
    subtitle: "History",
    icon: "clock",
    screen: "Timeline",
  },
  {
    title: "Hasanat Tracker",
    subtitle: "Good deeds tracker",
    icon: "check-circle",
    screen: "Hasanat",
  },
  {
    title: "Streak Garden",
    subtitle: "Habit streaks",
    icon: "award",
    screen: "StreakGarden",
  },
  {
    title: "Kids Mode",
    subtitle: "Children's content",
    icon: "smile",
    screen: "KidsMode",
  },
  {
    title: "Privacy and settings",
    subtitle: "App lock, permissions, account controls, and preferences",
    icon: "shield",
    screen: "Settings",
  },
  {
    title: "Settings",
    subtitle: "App preferences",
    icon: "settings",
    screen: "Settings",
  },
  {
    title: "Appearance",
    subtitle: "NurAI night atmosphere and accent themes",
    icon: "moon",
    screen: "Settings",
  },
  {
    title: "About NurAI",
    subtitle: "App information",
    icon: "info",
    screen: "About",
  },
];

const DUAS_INDEX = [
  {
    category: "Morning",
    text: "Morning remembrance duas, beneficial knowledge, provision, daily protection",
  },
  {
    category: "Evening",
    text: "Evening remembrance duas, protection, forgiveness, end of day reflection",
  },
  {
    category: "Prayer",
    text: "Duas before and after salah, sujood, tashahhud, prayer protection",
  },
  {
    category: "Protection",
    text: "Seeking Allah's protection, safety, anxiety, fear, evil eye, hardship",
  },
  {
    category: "Forgiveness",
    text: "Seeking forgiveness from Allah, repentance, istighfar, sins, returning",
  },
  {
    category: "Travel",
    text: "Duas for travelling safely, journey, airport, flight, car, leaving home",
  },
  {
    category: "Food",
    text: "Before and after eating, meal duas, gratitude, barakah",
  },
  {
    category: "Sleep",
    text: "Before sleeping and waking up, night duas, rest, protection",
  },
  {
    category: "General",
    text: "Everyday duas and supplications, guidance, family, relief, gratitude",
  },
];

const ADHKAR_INDEX = [
  {
    title: "Morning Adhkar",
    tab: "morning",
    text: "Morning adhkar, protection, Ayatul Kursi, Ikhlas, Falaq, Nas, forgiveness, salawat",
  },
  {
    title: "Evening Adhkar",
    tab: "evening",
    text: "Evening adhkar, night protection, Ayatul Kursi, Ikhlas, Falaq, Nas, reliance, salawat",
  },
  {
    title: "Ayatul Kursi",
    tab: "morning",
    text: "Ayatul Kursi, Quran 2:255, protection, morning and evening remembrance",
  },
  {
    title: "Three Quls",
    tab: "morning",
    text: "Surah Ikhlas, Surah Falaq, Surah Nas, quls, protection, morning and evening",
  },
  {
    title: "Istighfar",
    tab: "morning",
    text: "Astaghfirullah, forgiveness, repentance, morning remembrance",
  },
  {
    title: "Salawat",
    tab: "evening",
    text: "Send prayers upon the Prophet, salawat, salli ala Muhammad, evening remembrance",
  },
];

const HADITH_INDEX = [
  {
    collection: "Sahih al-Bukhari",
    reference: "Sahih al-Bukhari 1",
    topic: "Intentions",
  },
  {
    collection: "Sahih Muslim",
    reference: "Sahih Muslim 2699a",
    topic: "Seeking knowledge",
  },
  {
    collection: "Sahih al-Bukhari",
    reference: "Sahih al-Bukhari 10",
    topic: "Guarding speech and harm",
  },
  {
    collection: "Jami at-Tirmidhi",
    reference: "Jami at-Tirmidhi 3372",
    topic: "Dua as worship",
  },
];

const NAMES_OF_ALLAH_INDEX = [
  { transliteration: "Ar-Rahman", meaning: "The Most Gracious" },
  { transliteration: "Ar-Raheem", meaning: "The Most Merciful" },
  { transliteration: "Al-Malik", meaning: "The King" },
  { transliteration: "Al-Quddus", meaning: "The Most Sacred" },
  { transliteration: "As-Salam", meaning: "The Source of Peace" },
  { transliteration: "Al-Mu'min", meaning: "The Guardian of Faith" },
  { transliteration: "Al-Muhaymin", meaning: "The Protector" },
  { transliteration: "Al-Aziz", meaning: "The Almighty" },
  { transliteration: "Al-Jabbar", meaning: "The Compeller" },
  { transliteration: "Al-Mutakabbir", meaning: "The Supreme" },
  { transliteration: "Al-Khaliq", meaning: "The Creator" },
  { transliteration: "Al-Bari", meaning: "The Maker of Order" },
  { transliteration: "Al-Musawwir", meaning: "The Shaper of Beauty" },
  { transliteration: "Al-Ghaffar", meaning: "The Forgiving" },
  { transliteration: "Al-Qahhar", meaning: "The Subduer" },
  { transliteration: "Al-Wahhab", meaning: "The Giver of All" },
  { transliteration: "Ar-Razzaq", meaning: "The Sustainer" },
  { transliteration: "Al-Fattah", meaning: "The Opener" },
  { transliteration: "Al-Alim", meaning: "The Knower of All" },
  { transliteration: "Al-Qabid", meaning: "The Constrictor" },
  { transliteration: "Al-Basit", meaning: "The Reliever" },
  { transliteration: "Al-Khafid", meaning: "The Abaser" },
  { transliteration: "Ar-Rafi", meaning: "The Exalter" },
  { transliteration: "Al-Mu'izz", meaning: "The Bestower of Honors" },
  { transliteration: "Al-Mudhill", meaning: "The Humiliator" },
  { transliteration: "As-Sami", meaning: "The Hearer of All" },
  { transliteration: "Al-Basir", meaning: "The Seer of All" },
  { transliteration: "Al-Hakam", meaning: "The Judge" },
  { transliteration: "Al-Adl", meaning: "The Just" },
  { transliteration: "Al-Latif", meaning: "The Subtle One" },
  { transliteration: "Al-Khabir", meaning: "The All-Aware" },
  { transliteration: "Al-Halim", meaning: "The Forbearing" },
  { transliteration: "Al-Azim", meaning: "The Magnificent" },
  { transliteration: "Al-Ghafur", meaning: "The Great Forgiver" },
  { transliteration: "Ash-Shakur", meaning: "The Most Appreciative" },
  { transliteration: "Al-Ali", meaning: "The Highest" },
  { transliteration: "Al-Kabir", meaning: "The Greatest" },
  { transliteration: "Al-Hafiz", meaning: "The Preserver" },
  { transliteration: "Al-Muqit", meaning: "The Nourisher" },
  { transliteration: "Al-Hasib", meaning: "The Accounter" },
  { transliteration: "Al-Jalil", meaning: "The Mighty" },
  { transliteration: "Al-Karim", meaning: "The Generous" },
  { transliteration: "Ar-Raqib", meaning: "The Watchful One" },
  { transliteration: "Al-Mujib", meaning: "The Responsive" },
  { transliteration: "Al-Wasi", meaning: "The All-Comprehending" },
  { transliteration: "Al-Hakim", meaning: "The Perfectly Wise" },
  { transliteration: "Al-Wadud", meaning: "The Most Loving" },
  { transliteration: "Al-Majid", meaning: "The Majestic One" },
  { transliteration: "Al-Ba'ith", meaning: "The Resurrector" },
  { transliteration: "Ash-Shahid", meaning: "The Witness" },
  { transliteration: "Al-Haqq", meaning: "The Truth" },
  { transliteration: "Al-Wakil", meaning: "The Trustee" },
  { transliteration: "Al-Qawiyy", meaning: "The Possessor of All Strength" },
  { transliteration: "Al-Matin", meaning: "The Forceful One" },
  { transliteration: "Al-Waliyy", meaning: "The Governor" },
  { transliteration: "Al-Hamid", meaning: "The Praised One" },
  { transliteration: "Al-Muhsi", meaning: "The Appraiser" },
  { transliteration: "Al-Mubdi", meaning: "The Originator" },
  { transliteration: "Al-Mu'id", meaning: "The Restorer" },
  { transliteration: "Al-Muhyi", meaning: "The Giver of Life" },
  { transliteration: "Al-Mumit", meaning: "The Taker of Life" },
  { transliteration: "Al-Hayy", meaning: "The Ever Living One" },
  { transliteration: "Al-Qayyum", meaning: "The Self-Existing One" },
  { transliteration: "Al-Wajid", meaning: "The Finder" },
  { transliteration: "Al-Majid", meaning: "The Glorious" },
  { transliteration: "Al-Wahid", meaning: "The Only One" },
  { transliteration: "Al-Ahad", meaning: "The One" },
  { transliteration: "As-Samad", meaning: "The Satisfier of All Needs" },
  { transliteration: "Al-Qadir", meaning: "The All Powerful" },
  { transliteration: "Al-Muqtadir", meaning: "The Creator of All Power" },
  { transliteration: "Al-Muqaddim", meaning: "The Expediter" },
  { transliteration: "Al-Mu'akhkhir", meaning: "The Delayer" },
  { transliteration: "Al-Awwal", meaning: "The First" },
  { transliteration: "Al-Akhir", meaning: "The Last" },
  { transliteration: "Az-Zahir", meaning: "The Manifest One" },
  { transliteration: "Al-Batin", meaning: "The Hidden One" },
  { transliteration: "Al-Wali", meaning: "The Protecting Friend" },
  { transliteration: "Al-Muta'ali", meaning: "The Supreme One" },
  { transliteration: "Al-Barr", meaning: "The Doer of Good" },
  { transliteration: "At-Tawwab", meaning: "The Guide to Repentance" },
  { transliteration: "Al-Muntaqim", meaning: "The Avenger" },
  { transliteration: "Al-Afuww", meaning: "The Forgiver" },
  { transliteration: "Ar-Ra'uf", meaning: "The Clement" },
  { transliteration: "Malik-al-Mulk", meaning: "Owner of All" },
  {
    transliteration: "Dhul-Jalali Wal-Ikram",
    meaning: "Lord of Majesty and Bounty",
  },
  { transliteration: "Al-Muqsit", meaning: "The Equitable One" },
  { transliteration: "Al-Jami", meaning: "The Gatherer" },
  { transliteration: "Al-Ghani", meaning: "The Rich One" },
  { transliteration: "Al-Mughni", meaning: "The Enricher" },
  { transliteration: "Al-Mani", meaning: "The Preventer of Harm" },
  { transliteration: "Ad-Darr", meaning: "The Creator of The Harmful" },
  { transliteration: "An-Nafi", meaning: "The Creator of Good" },
  { transliteration: "An-Nur", meaning: "The Light" },
  { transliteration: "Al-Hadi", meaning: "The Guide" },
  { transliteration: "Al-Badi", meaning: "The Originator" },
  { transliteration: "Al-Baqi", meaning: "The Everlasting One" },
  { transliteration: "Al-Warith", meaning: "The Inheritor of All" },
  { transliteration: "Ar-Rashid", meaning: "The Righteous Teacher" },
  { transliteration: "As-Sabur", meaning: "The Patient One" },
];

const SCHOLARS = [
  "Imam Abu Hanifa",
  "Imam Malik",
  "Imam Al-Shafi'i",
  "Imam Ahmad ibn Hanbal",
  "Imam Al-Ghazali",
  "Ibn Taymiyyah",
  "Ibn Qayyim Al-Jawziyya",
  "Imam Al-Nawawi",
  "Ibn Kathir",
  "Imam Al-Bukhari",
  "Shah Waliullah",
  "Ibn Khaldun",
];

const PROPHETS = [
  "Adam",
  "Idris",
  "Nuh",
  "Hud",
  "Salih",
  "Ibrahim",
  "Ismail",
  "Ishaq",
  "Yaqub",
  "Yusuf",
  "Ayyub",
  "Shuayb",
  "Musa",
  "Harun",
  "Dhul-Kifl",
  "Dawud",
  "Sulayman",
  "Ilyas",
  "Al-Yasa",
  "Yunus",
  "Zakariyya",
  "Yahya",
  "Isa",
  "Muhammad",
];

const KIDS_STORIES = [
  "Story of Prophet Adam",
  "Story of Prophet Nuh",
  "Story of Prophet Ibrahim",
  "Story of Prophet Yusuf",
  "Story of Prophet Musa",
  "Story of Prophet Isa",
  "Story of Prophet Muhammad",
];

const FAMOUS_VERSES: {
  name: string;
  aliases: string[];
  surah: number;
  verse: number;
  description: string;
}[] = [
  {
    name: "Ayatul Kursi",
    aliases: ["ayah kursi", "verse of the throne", "kursi"],
    surah: 2,
    verse: 255,
    description: "The Throne Verse - Al-Baqarah 2:255",
  },
  {
    name: "Surah Ya-Sin",
    aliases: ["yasin", "yaseen", "ya sin"],
    surah: 36,
    verse: 1,
    description: "Heart of the Quran",
  },
  {
    name: "Ayatul Birr",
    aliases: ["verse of righteousness"],
    surah: 2,
    verse: 177,
    description: "The Verse of Righteousness - Al-Baqarah 2:177",
  },
  {
    name: "Last Two Verses of Al-Baqarah",
    aliases: ["amana rasul", "last verses baqarah"],
    surah: 2,
    verse: 285,
    description: "Al-Baqarah 2:285-286",
  },
  {
    name: "Surah Al-Mulk",
    aliases: ["mulk", "sovereignty", "tabarak"],
    surah: 67,
    verse: 1,
    description: "Protection from punishment of the grave",
  },
  {
    name: "Surah Ar-Rahman",
    aliases: ["rahman", "the merciful"],
    surah: 55,
    verse: 1,
    description: "The Most Gracious",
  },
  {
    name: "Surah Al-Kahf",
    aliases: ["kahf", "the cave", "cave"],
    surah: 18,
    verse: 1,
    description: "Recited on Fridays",
  },
  {
    name: "Four Quls",
    aliases: ["4 quls", "qul", "protection surahs"],
    surah: 112,
    verse: 1,
    description: "Al-Ikhlas, Al-Falaq, An-Nas, Al-Kafirun",
  },
  {
    name: "Bismillah",
    aliases: ["basmala", "in the name of allah"],
    surah: 1,
    verse: 1,
    description: "In the Name of Allah",
  },
  {
    name: "Surah Al-Fatiha",
    aliases: ["fatiha", "opening", "umm al-kitab"],
    surah: 1,
    verse: 1,
    description: "The Opening - Mother of the Quran",
  },
  {
    name: "Verse of Light",
    aliases: ["ayat an-nur", "noor verse", "light verse"],
    surah: 24,
    verse: 35,
    description: "An-Nur 24:35 - Allah is the Light",
  },
  {
    name: "Surah Al-Waqi'ah",
    aliases: ["waqiah", "the event", "wealth surah"],
    surah: 56,
    verse: 1,
    description: "Surah of Wealth",
  },
];

const POPULAR_SUGGESTIONS = [
  "Ayatul Kursi",
  "Al-Fatihah",
  "Surah Al-Mulk",
  "Ramadan begins",
  "Ashura",
  "Prayer Times",
  "Family Circle",
  "Travel Mode",
  "Track flight FR200",
  "Quran Arabic",
  "Smart notifications",
  "Prayer tracker",
  "Widgets",
  "Backup restore",
  "Ar-Rahman",
  "Zakat",
  "Prayer notifications",
];

const SEARCH_STARTER_ACTIONS: {
  id: string;
  label: string;
  query: string;
  helper: string;
  icon: AppIconName;
  tone: "primary" | "scholar" | "emerald";
}[] = [
  {
    id: "quran-ayah",
    label: "Open an ayah",
    query: "Quran 2:255",
    helper: "Jump to exact verses",
    icon: "book-open",
    tone: "scholar",
  },
  {
    id: "travel-flight",
    label: "Track a flight",
    query: "Track flight FR200",
    helper: "Travel mode deep link",
    icon: "navigation",
    tone: "primary",
  },
  {
    id: "family-messages",
    label: "Family messages",
    query: "Family messages",
    helper: "Open household chat",
    icon: "send",
    tone: "emerald",
  },
  {
    id: "source-library",
    label: "Source library",
    query: "source backed tafsir",
    helper: "Find books and references",
    icon: "shield",
    tone: "primary",
  },
];

const SEARCH_TRUST_LANES: {
  id: string;
  label: string;
  query: string;
  helper: string;
  icon: AppIconName;
  tone: "primary" | "scholar" | "emerald";
}[] = [
  {
    id: "quran",
    label: "Quran",
    query: "Quran 2:255",
    helper: "Ayah, surah, tafsir",
    icon: "book-open",
    tone: "scholar",
  },
  {
    id: "library",
    label: "Library",
    query: "daily salah guide",
    helper: "Books and paths",
    icon: "layers",
    tone: "emerald",
  },
  {
    id: "scholar",
    label: "Scholar Review",
    query: "source backed tafsir",
    helper: "Sensitive questions",
    icon: "shield",
    tone: "primary",
  },
];

const EMPTY_STATE_SUGGESTIONS = [
  "Quran 18:1",
  "flight FR200",
  "halal food",
  "family messages",
];

type SearchScopeId = "all" | "quran" | "library" | "tools";

const SEARCH_SCOPE_FILTERS: {
  id: SearchScopeId;
  label: string;
  helper: string;
  icon: AppIconName;
}[] = [
  {
    id: "all",
    label: "All",
    helper: "Every match",
    icon: "command",
  },
  {
    id: "quran",
    label: "Quran",
    helper: "Ayahs",
    icon: "book-open",
  },
  {
    id: "library",
    label: "Library",
    helper: "Books",
    icon: "layers",
  },
  {
    id: "tools",
    label: "Tools",
    helper: "Actions",
    icon: "grid",
  },
];

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: AppIconName;
  screen: string;
  params?: Record<string, any>;
  actionLabel?: string;
}

interface CategoryGroup {
  category: string;
  icon: AppIconName;
  results: SearchResult[];
}

type SearchableFeature = {
  title: string;
  subtitle: string;
  icon: AppIconName;
  screen: string;
  keywords: string[];
  params?: Record<string, any>;
  actionLabel?: string;
};

type SmartSearchCommand = SearchableFeature & {
  id: string;
  priority?: number;
};

const APP_FEATURES: SearchableFeature[] = [
  ...SETTINGS_ITEMS.map((item) => ({
    ...item,
    keywords: [item.title, item.subtitle],
  })),
  {
    title: "Home",
    subtitle: "Daily deen dashboard, prayer orb, streaks, and Today",
    icon: "home",
    screen: "Main",
    params: { screen: "Home" },
    keywords: ["dashboard", "today", "daily", "prayer orb", "home"],
  },
  {
    title: "Quran Hub",
    subtitle: "Surahs, reading plans, tafsir, audio, and Quran learning",
    icon: "book-open",
    screen: "Main",
    params: { screen: "Quran" },
    keywords: ["quran", "surah", "juz", "ayah", "reader", "recitation"],
  },
  {
    title: "Explore",
    subtitle: "All NurAI tools and learning paths",
    icon: "grid",
    screen: "Main",
    params: { screen: "Explore" },
    keywords: ["tools", "features", "menu", "more", "explore"],
  },
  {
    title: "Profile",
    subtitle: "Account, progress, subscription, and settings",
    icon: "user",
    screen: "Main",
    params: { screen: "More" },
    keywords: ["account", "profile", "plan", "subscription", "stats"],
  },
  {
    title: "Family Circle",
    subtitle: "Private family progress, goals, duas, and messages",
    icon: "users",
    screen: "FamilyGroup",
    keywords: ["family", "wife", "children", "messages", "goals", "duas"],
  },
  {
    title: "Community",
    subtitle: "Safe gender-aware community spaces",
    icon: "message-square",
    screen: "Main",
    params: { screen: "Community" },
    keywords: ["community", "brothers", "sisters", "posts", "ummah"],
  },
  {
    title: "Women’s Health",
    subtitle: "Private cycle tracking, qada, care signals, and streak pause",
    icon: "shield",
    screen: "WomensHealth",
    keywords: ["women", "cycle", "period", "qada", "privacy", "health"],
  },
  {
    title: "Prayer Notifications",
    subtitle:
      "Athan, reminders, smart prayer prompts, and notification controls",
    icon: "bell",
    screen: "NotificationSettings",
    keywords: ["notifications", "athan", "adhan", "reminders", "alerts"],
  },
  {
    title: "Nearby Mosques & Halal Food",
    subtitle: "Find masjids, directions, and halal places nearby",
    icon: "map-pin",
    screen: "NearbyMosques",
    keywords: ["nearby", "mosque", "masjid", "halal", "food", "directions"],
  },
  {
    title: "Nasheeds",
    subtitle: "NurAI nasheeds, playback, favourites, and background audio",
    icon: "music",
    screen: "Nasheeds",
    keywords: ["nasheed", "audio", "music", "background", "playlist"],
  },
  {
    title: "Bookmarks",
    subtitle: "Saved Quran ayahs, duas, adhkar, and library notes",
    icon: "bookmark",
    screen: "Bookmarks",
    keywords: ["saved", "bookmarks", "favourites", "notes", "highlights"],
  },
  {
    title: "Library Notes & Highlights",
    subtitle:
      "Search private book reflections, saved highlights, and reader notes",
    icon: "edit-3",
    screen: "LibraryAnnotations",
    keywords: [
      "library notes",
      "reader notes",
      "book notes",
      "highlights",
      "annotations",
      "reflections",
      "ebook notes",
      "saved passages",
    ],
    actionLabel: "Open annotation vault",
  },
  {
    title: "Subscription Plans",
    subtitle: "Premium and Scholar unlocks",
    icon: "award",
    screen: "Subscription",
    keywords: ["premium", "scholar", "paid", "upgrade", "plans", "pricing"],
  },
  {
    title: "Shareable Cards",
    subtitle: "Create beautiful Islamic reminders to share",
    icon: "share-2",
    screen: "ShareableCards",
    keywords: ["share", "cards", "image", "quote", "reminder"],
  },
  {
    title: "New Muslim Journey",
    subtitle: "Gentle first steps, basics, and guided learning",
    icon: "sunrise",
    screen: "NewMuslim",
    keywords: ["new muslim", "beginner", "revert", "convert", "basics"],
  },
  {
    title: "Revert Journey",
    subtitle: "Structured support for new and returning Muslims",
    icon: "navigation",
    screen: "RevertJourney",
    keywords: ["revert", "convert", "journey", "support"],
  },
  {
    title: "Janazah Guide",
    subtitle: "Calm guidance around death, burial, and family support",
    icon: "heart",
    screen: "Janazah",
    keywords: ["janazah", "funeral", "death", "burial", "grief"],
  },
  {
    title: "Achievements",
    subtitle: "Badges, milestones, and progress rewards",
    icon: "award",
    screen: "Achievements",
    keywords: ["badges", "achievements", "milestones", "rewards"],
  },
  {
    title: "Challenges",
    subtitle: "Guided habit challenges and streak goals",
    icon: "target",
    screen: "Challenges",
    keywords: ["challenges", "goals", "habits", "streak"],
  },
  {
    title: "Notifications",
    subtitle: "Your reminders and NurAI updates",
    icon: "bell",
    screen: "NotificationsCenter",
    keywords: ["notifications", "inbox", "reminders", "updates"],
  },
];

const KNOWLEDGE_TOPICS: SearchableFeature[] = [
  {
    title: "Word-by-word Quran",
    subtitle: "Open Quran word meanings, audio, review, and verse matches",
    icon: "type",
    screen: "QuranReader",
    params: { surahNumber: 1, initialVerse: 1, initialStudyMode: "words" },
    keywords: [
      "word by word",
      "quran words",
      "root",
      "arabic vocabulary",
      "word intelligence",
    ],
  },
  {
    title: "Ayah AI explanations",
    subtitle:
      "Hold an ayah in the Quran reader for meaning, context, and action",
    icon: "message-circle",
    screen: "QuranReader",
    params: { surahNumber: 1, initialVerse: 1, initialStudyMode: "meaning" },
    keywords: ["explain ayah", "verse meaning", "context", "tafseer", "tafsir"],
  },
  {
    title: "Beginner Quran Mode",
    subtitle: "Plain Quran context for new Muslims, guests, and returners",
    icon: "sunrise",
    screen: "QuranReader",
    params: {
      surahNumber: 1,
      initialVerse: 1,
      initialStudyMode: "context",
      initialAudience: "new_reader",
    },
    keywords: [
      "beginner quran",
      "new muslim",
      "non muslim",
      "simple explanation",
      "quran context",
    ],
  },
  {
    title: "Memorisation Mode",
    subtitle: "Hifz review, repeat, progress, and spaced revision",
    icon: "headphones",
    screen: "QuranReader",
    params: { surahNumber: 1, initialVerse: 1, memorisationMode: true },
    keywords: ["memorise", "memorize", "hifz", "revision", "repeat"],
  },
  {
    title: "Family Quran Challenges",
    subtitle: "Share a Quran goal and grow together as a household",
    icon: "users",
    screen: "FamilyGroup",
    keywords: [
      "family quran",
      "family challenge",
      "household quran",
      "quran goal",
    ],
  },
  {
    title: "Zakat & Islamic Finance",
    subtitle: "Zakat calculator, charity tracking, and finance guidance",
    icon: "dollar-sign",
    screen: "IslamicFinance",
    keywords: ["zakat", "charity", "sadaqah", "finance", "money"],
  },
  {
    title: "Hajj & Umrah",
    subtitle: "Step-by-step pilgrimage guidance",
    icon: "map",
    screen: "HajjUmrah",
    keywords: ["hajj", "umrah", "pilgrimage", "ihram", "tawaf", "sai"],
  },
];

const SMART_SEARCH_COMMANDS: SmartSearchCommand[] = [
  {
    id: "quran-sleep-timer",
    title: "Quran sleep timer",
    subtitle:
      "Open Quran audio settings for continuous, timed, and paid sleep timer controls.",
    icon: "moon",
    screen: "QuranReader",
    params: { surahNumber: 1, initialVerse: 1, initialSettingsPanel: "audio" },
    actionLabel: "Open audio settings",
    priority: 52,
    keywords: [
      "sleep timer",
      "quran timer",
      "audio timer",
      "continuous playback",
      "play all night",
      "stop recitation",
      "quran audio settings",
    ],
  },
  {
    id: "quran-offline-audio",
    title: "Download Quran audio",
    subtitle:
      "Save surah audio packs for offline listening and background playback.",
    icon: "download-cloud",
    screen: "QuranReader",
    params: { surahNumber: 1, initialVerse: 1, initialSettingsPanel: "audio" },
    actionLabel: "Manage downloads",
    priority: 50,
    keywords: [
      "offline quran",
      "download audio",
      "quran download",
      "audio pack",
      "offline mode",
      "background playback",
      "lock screen player",
    ],
  },
  {
    id: "quran-ayah-lens",
    title: "Explain an ayah",
    subtitle:
      "Open Quran with the ayah lens for meaning, context, words, reflection, and sources.",
    icon: "message-circle",
    screen: "QuranReader",
    params: { surahNumber: 1, initialVerse: 1, initialStudyMode: "meaning" },
    actionLabel: "Open ayah lens",
    priority: 54,
    keywords: [
      "explain ayah",
      "explain verse",
      "ayah meaning",
      "quran lens",
      "verse context",
      "why revealed",
      "asbab",
      "tafsir",
      "tafseer",
      "source cards",
    ],
  },
  {
    id: "quran-word-intelligence",
    title: "Quran word intelligence",
    subtitle:
      "Study Arabic words, roots, pronunciation, Quran occurrences, and save words to learn.",
    icon: "type",
    screen: "QuranReader",
    params: { surahNumber: 1, initialVerse: 1, initialStudyMode: "words" },
    actionLabel: "Study words",
    priority: 48,
    keywords: [
      "arabic word",
      "word meaning",
      "quran root",
      "quran vocabulary",
      "pronunciation",
      "learn word",
      "word by word",
    ],
  },
  {
    id: "quran-memorisation",
    title: "Memorisation mode",
    subtitle:
      "Open Hifz-focused Quran reading with repeat, recall, and revision support.",
    icon: "headphones",
    screen: "QuranReader",
    params: { surahNumber: 1, initialVerse: 1, memorisationMode: true },
    actionLabel: "Start hifz mode",
    priority: 42,
    keywords: [
      "memorise",
      "memorize",
      "hifz",
      "revision",
      "repeat ayah",
      "recitation practice",
      "hide ayah",
    ],
  },
  {
    id: "quran-recitation-coach",
    title: "Recitation coach",
    subtitle:
      "Open Quran practice for listen-repeat, recall, weak words, and future AI recitation feedback.",
    icon: "mic",
    screen: "QuranReader",
    params: { surahNumber: 1, initialVerse: 1, memorisationMode: true },
    actionLabel: "Open practice",
    priority: 46,
    keywords: [
      "recitation coach",
      "tajweed",
      "pronunciation",
      "listen repeat",
      "recite",
      "mistake log",
      "quran speaking",
      "ai recitation",
    ],
  },
  {
    id: "family-message",
    title: "Message Family Circle",
    subtitle:
      "Open private family messages, travel updates, duas, goals, and household progress.",
    icon: "send",
    screen: "FamilyGroup",
    params: { initialTab: "messages" },
    actionLabel: "Open messages",
    priority: 48,
    keywords: [
      "family message",
      "message wife",
      "message husband",
      "family chat",
      "family circle message",
      "household update",
      "private family",
    ],
  },
  {
    id: "family-progress",
    title: "Family progress",
    subtitle:
      "See shared family goals, Quran challenges, travel status, and weekly growth.",
    icon: "users",
    screen: "FamilyGroup",
    params: { initialTab: "challenges" },
    actionLabel: "Open family goals",
    priority: 42,
    keywords: [
      "family progress",
      "family goals",
      "family quran",
      "family challenge",
      "family streak",
      "children progress",
      "wife progress",
    ],
  },
  {
    id: "family-travel-share",
    title: "Family travel updates",
    subtitle:
      "Share flights, arrivals, trip duas, and safe check-ins with Family Circle.",
    icon: "send",
    screen: "FamilyGroup",
    params: { initialTab: "messages" },
    actionLabel: "Open travel updates",
    priority: 44,
    keywords: [
      "family travel",
      "share flight",
      "arrived",
      "safe check in",
      "journey update",
      "travel message",
      "family trip",
    ],
  },
  {
    id: "nearby-halal",
    title: "Find halal food nearby",
    subtitle:
      "Search halal food around your selected city with directions and confidence checks.",
    icon: "map-pin",
    screen: "NearbyMosques",
    params: { initialTab: "halal" },
    actionLabel: "Find halal food",
    priority: 46,
    keywords: [
      "halal food",
      "halal restaurant",
      "restaurant",
      "takeaway",
      "take away",
      "food near me",
      "dixy",
      "eat",
    ],
  },
  {
    id: "nearby-mosques",
    title: "Find nearby masjids",
    subtitle:
      "Search local masjids, get directions, and plan prayer around your location.",
    icon: "map-pin",
    screen: "NearbyMosques",
    params: { initialTab: "mosques" },
    actionLabel: "Find masjids",
    priority: 46,
    keywords: [
      "mosque",
      "masjid",
      "nearby prayer",
      "jummah",
      "jumuah",
      "friday prayer",
      "worship finder",
      "directions",
    ],
  },
  {
    id: "prayer-athan",
    title: "Athan and prayer reminders",
    subtitle:
      "Control smart reminders, full athan, per-prayer toggles, and paid NurAI prompts.",
    icon: "bell",
    screen: "NotificationSettings",
    actionLabel: "Open reminders",
    priority: 48,
    keywords: [
      "athan",
      "adhan",
      "azaan",
      "prayer reminder",
      "notification",
      "smart notification",
      "15 minutes",
      "per prayer",
      "prayer alert",
    ],
  },
  {
    id: "smart-nurai-notifications",
    title: "Smart NurAI notifications",
    subtitle:
      "Tune prayer reminders, progress prompts, family updates, and paid reminder controls.",
    icon: "zap",
    screen: "NotificationSettings",
    actionLabel: "Tune reminders",
    priority: 46,
    keywords: [
      "smart notifications",
      "advanced notifications",
      "paid reminders",
      "personalised reminders",
      "personalized reminders",
      "push",
      "open app reminders",
      "progress notifications",
    ],
  },
  {
    id: "home-widgets",
    title: "Home and lock-screen widgets",
    subtitle:
      "Find prayer countdown, streak garden, Quran continue, and daily goal widget setup.",
    icon: "smartphone",
    screen: "Settings",
    actionLabel: "Open widget settings",
    priority: 42,
    keywords: [
      "widget",
      "widgets",
      "lock screen",
      "home screen widget",
      "prayer widget",
      "streak widget",
      "quran widget",
      "daily goal widget",
    ],
  },
  {
    id: "prayer-tracker-heatmap",
    title: "Prayer tracker heatmap",
    subtitle: "Open prayer times and consistency tracking for salah progress.",
    icon: "bar-chart-2",
    screen: "PrayerTimes",
    actionLabel: "Open prayer tracker",
    priority: 40,
    keywords: [
      "prayer tracker",
      "salah tracker",
      "heatmap",
      "prayer progress",
      "consistency",
      "monthly salah",
      "prayed",
      "missed prayer",
    ],
  },
  {
    id: "backup-restore",
    title: "Backup and restore",
    subtitle:
      "Open settings for progress safety, saved preferences, Quran notes, and app data controls.",
    icon: "upload-cloud",
    screen: "Settings",
    actionLabel: "Open settings",
    priority: 38,
    keywords: [
      "backup",
      "restore",
      "sync",
      "progress safe",
      "saved progress",
      "bookmarks backup",
      "notes backup",
      "data controls",
    ],
  },
  {
    id: "women-qada",
    title: "Women’s health and qada",
    subtitle:
      "Open private cycle tracking, protected streak pause, qada progress, and care signals.",
    icon: "shield",
    screen: "WomensHealth",
    actionLabel: "Open private tracker",
    priority: 44,
    keywords: [
      "period",
      "cycle",
      "women health",
      "qada",
      "missed fast",
      "streak pause",
      "private health",
      "menstruation",
    ],
  },
  {
    id: "muslim-health-companion",
    title: "Muslim Health Companion",
    subtitle:
      "Daily body amanah plan for sleep, steps, calories, water, stress care, and medical boundaries.",
    icon: "heart",
    screen: "MuslimHealth",
    actionLabel: "Open health plan",
    priority: 45,
    keywords: [
      "health",
      "wellness",
      "body amanah",
      "self care",
      "sleep",
      "water",
      "hydration",
      "movement",
      "fitness",
      "stress",
      "medical safety",
    ],
  },
  {
    id: "tasbeeh-haptics",
    title: "Tasbeeh counter and haptics",
    subtitle:
      "Open the full-screen dhikr counter with vibration goals and target feedback.",
    icon: "repeat",
    screen: "Tasbeeh",
    actionLabel: "Open counter",
    priority: 38,
    keywords: [
      "tasbeeh",
      "tasbih",
      "dhikr counter",
      "vibrate",
      "haptic",
      "100 tasbeeh",
      "counter",
    ],
  },
  {
    id: "library-reader",
    title: "Continue books",
    subtitle:
      "Open the NurAI library with books, reader progress, highlights, notes, and narration.",
    icon: "book",
    screen: "LibraryHome",
    actionLabel: "Open library",
    priority: 36,
    keywords: [
      "book",
      "books",
      "library",
      "reader",
      "ebook",
      "highlight",
      "notes",
      "narration",
      "ruh focus",
    ],
  },
  {
    id: "global-zakat",
    title: "Zakat and charity tracker",
    subtitle: "Calculate zakat, track giving, and review charity progress.",
    icon: "dollar-sign",
    screen: "IslamicFinance",
    actionLabel: "Open finance",
    priority: 36,
    keywords: [
      "zakat",
      "charity",
      "sadaqah",
      "donation",
      "wealth",
      "gold",
      "savings",
      "finance",
    ],
  },
  {
    id: "nasheed-dhikr",
    title: "Dhikr nasheeds",
    subtitle:
      "Open owned and licensed nasheeds for dhikr, calm focus, and background listening.",
    icon: "music",
    screen: "Nasheeds",
    params: { initialCategory: "Dhikr" },
    actionLabel: "Open dhikr audio",
    priority: 34,
    keywords: [
      "nasheed",
      "nasheeds",
      "dhikr audio",
      "background nasheed",
      "islamic audio",
      "nur ai originals",
      "relaxing nasheed",
      "ramadan nasheed",
    ],
  },
];

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bpryaer\b/g, "prayer")
    .replace(/\bsalaah\b/g, "prayer")
    .replace(/\bsalah\b/g, "prayer")
    .replace(/\bnamaz\b/g, "prayer")
    .replace(/\bquran\b/g, "quran")
    .replace(/\bquraan\b/g, "quran")
    .replace(/\bkoran\b/g, "quran")
    .replace(/\bquibla\b/g, "qibla")
    .replace(/\bkibla\b/g, "qibla")
    .replace(/\badhan\b/g, "athan")
    .replace(/\bazaan\b/g, "athan")
    .replace(/\bmasjid\b/g, "mosque")
    .replace(/\bmasjids\b/g, "mosques")
    .replace(/\btraveller\b/g, "traveler")
    .replace(/\btreval\b/g, "travel")
    .replace(/\btrval\b/g, "travel")
    .replace(/\bfaily\b/g, "family")
    .replace(/\bfaimly\b/g, "family")
    .replace(/\bwidtgets\b/g, "widgets")
    .replace(/\bwigwts\b/g, "widgets")
    .replace(/\bsourse\b/g, "source")
    .replace(/\bsaurese\b/g, "sources")
    .replace(/\bnotifactions\b/g, "notifications")
    .replace(/\bnotidcation\b/g, "notification")
    .replace(/\bnotidcations\b/g, "notifications")
    .replace(/\bbackgrund\b/g, "background")
    .replace(/\bduaa\b/g, "dua")
    .replace(/\bduas\b/g, "dua")
    .replace(/\bramzan\b/g, "ramadan")
    .replace(/[-_']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Bounded Levenshtein — early-exits once distance provably exceeds `max`.
// Keeps typo tolerance cheap on a large corpus (never fully computes far pairs).
function boundedEditDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[b.length];
}

// Order-preserving character subsequence test (typo-robust "contains").
function isSubsequence(needle: string, text: string): boolean {
  if (!needle) return true;
  let i = 0;
  for (let j = 0; j < text.length && i < needle.length; j++) {
    if (needle[i] === text[j]) i++;
  }
  return i === needle.length;
}

// Best fuzzy similarity (0..1) of one query token against the words of a field.
function fuzzyTokenSimilarity(token: string, words: string[]): number {
  if (words.some((word) => word.includes(token))) return 1;
  if (words.some((word) => word.startsWith(token) || token.startsWith(word))) {
    return 0.82;
  }
  // typo tolerance scales with token length: short words allow 1 edit, long allow 3
  const maxDist = token.length <= 4 ? 1 : token.length <= 7 ? 2 : 3;
  let best = 0;
  for (const word of words) {
    if (Math.abs(word.length - token.length) > maxDist) continue;
    const dist = boundedEditDistance(token, word, maxDist);
    if (dist <= maxDist) {
      const sim = 1 - dist / Math.max(token.length, word.length);
      if (sim > best) best = sim;
    }
  }
  return best >= 0.6 ? best : 0;
}

// Unified relevance score used by every corpus. Blends exact substring, token
// coverage, prefix, typo-tolerant fuzzy matching, and a subsequence fallback so
// partial and misspelled queries still surface the right result.
function searchScore(query: string, haystack: string): number {
  const needle = normalizeSearchText(query);
  const text = normalizeSearchText(haystack);
  if (!needle || !text) return 0;
  if (text === needle) return 500;

  let score = text.includes(needle) ? 180 : 0;
  const words = text.split(" ");
  const tokens = needle.split(" ").filter((token) => token.length >= 2);

  let matched = 0;
  for (const token of tokens) {
    if (text.includes(token)) {
      matched += 1;
      score += 24;
    } else {
      const sim = fuzzyTokenSimilarity(token, words);
      if (sim > 0) {
        matched += 1;
        score += Math.round(22 * sim);
      }
    }
  }

  if (tokens.length > 0 && matched === tokens.length) score += 90;
  if (text.startsWith(needle)) score += 80;
  if (words.some((word) => word.startsWith(needle))) score += 18;

  // Last-resort typo-robust match for compact queries (e.g. "quraan" -> "quran").
  if (score === 0 && needle.length >= 3) {
    const flatNeedle = needle.replace(/\s+/g, "");
    const flatText = text.replace(/\s+/g, "");
    if (isSubsequence(flatNeedle, flatText)) score += 36;
  }

  return score;
}

// Rank any corpus by the unified fuzzy score, keeping the strongest matches.
function rankBySearchScore<T>(
  query: string,
  items: T[],
  getHaystack: (item: T) => string,
  limit: number = MAX_PER_CATEGORY,
): T[] {
  return items
    .map((item) => ({ item, score: searchScore(query, getHaystack(item)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

function buildFeatureResults(query: string): SearchResult[] {
  return APP_FEATURES.map((feature, index) => {
    const haystack = [
      feature.title,
      feature.subtitle,
      ...feature.keywords,
    ].join(" ");
    return {
      score: searchScore(query, haystack),
      result: {
        id: `feature-${index}`,
        title: feature.title,
        subtitle: feature.subtitle,
        category: "App & Tools",
        icon: feature.icon,
        screen: feature.screen,
        params: feature.params,
        actionLabel: feature.actionLabel,
      } satisfies SearchResult,
    };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_CATEGORY + 2)
    .map((item) => item.result);
}

function buildKnowledgeTopicResults(query: string): SearchResult[] {
  return KNOWLEDGE_TOPICS.map((topic, index) => {
    const haystack = [topic.title, topic.subtitle, ...topic.keywords].join(" ");
    return {
      score: searchScore(query, haystack),
      result: {
        id: `topic-${index}`,
        title: topic.title,
        subtitle: topic.subtitle,
        category: "Knowledge Paths",
        icon: topic.icon,
        screen: topic.screen,
        params: topic.params,
        actionLabel: topic.actionLabel,
      } satisfies SearchResult,
    };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_CATEGORY)
    .map((item) => item.result);
}

function buildSmartCommandResults(query: string): SearchResult[] {
  return SMART_SEARCH_COMMANDS.map((command) => {
    const haystack = [
      command.title,
      command.subtitle,
      ...command.keywords,
    ].join(" ");
    const rawScore = searchScore(query, haystack);
    return {
      rawScore,
      score: rawScore + (command.priority || 0),
      result: {
        id: `command-${command.id}`,
        title: command.title,
        subtitle: command.subtitle,
        category: "Exact Matches",
        icon: command.icon,
        screen: command.screen,
        params: command.params,
        actionLabel: command.actionLabel,
      } satisfies SearchResult,
    };
  })
    .filter((item) => item.rawScore > 0)
    .filter((item) => item.rawScore >= 24)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_CATEGORY)
    .map((item) => item.result);
}

function buildLibraryResults(query: string): SearchResult[] {
  return getBooks()
    .flatMap((book) => {
      const bookScore = searchScore(
        query,
        [
          book.title,
          book.subtitle,
          book.description,
          book.category,
          book.difficulty,
          book.authorName,
          ...book.tags,
        ].join(" "),
      );
      const results: { score: number; result: SearchResult }[] = [];
      if (bookScore > 0) {
        results.push({
          score: bookScore + 20,
          result: {
            id: `book-${book.id}`,
            title: book.title,
            subtitle: `${book.chapters.length} chapters • ${book.category}`,
            category: "Books",
            icon: "book-open",
            screen: "BookDetail",
            params: { bookId: book.id },
          },
        });
      }

      book.chapters.forEach((chapter, index) => {
        const chapterScore = searchScore(
          query,
          [
            book.title,
            chapter.title,
            chapter.subtitle,
            ...chapter.sections.flatMap((section) => [
              section.heading,
              section.body,
            ]),
            ...chapter.reflectionQuestions,
            ...chapter.actionSteps,
            ...chapter.sourceRefs.map((source) => source.reference),
          ]
            .filter(Boolean)
            .join(" "),
        );
        if (chapterScore > 0) {
          results.push({
            score: chapterScore,
            result: {
              id: `chapter-${book.id}-${chapter.id}`,
              title: chapter.title,
              subtitle: `${book.title} • Chapter ${index + 1}`,
              category: "Book Chapters",
              icon: "file-text",
              screen: "BookReader",
              params: { bookId: book.id, chapterId: chapter.id },
            },
          });
        }
      });
      return results;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_CATEGORY + 3)
    .map((item) => item.result);
}

function buildLibraryAnnotationResults(
  query: string,
  progressByBook: Record<string, UserBookProgress>,
): SearchResult[] {
  const results: { score: number; result: SearchResult }[] = [];

  Object.values(progressByBook).forEach((progress) => {
    const book = getBookById(progress.bookId);
    if (!book) return;

    progress.highlights.forEach((highlight) => {
      const chapter = book.chapters.find(
        (item) => item.id === highlight.chapterId,
      );
      if (!chapter) return;
      const score = searchScore(
        query,
        [
          "highlight",
          "saved passage",
          "library annotation",
          book.title,
          book.category,
          chapter.title,
          highlight.sectionHeading,
          highlight.excerpt,
        ].join(" "),
      );
      if (score <= 0) return;
      results.push({
        score: score + 28,
        result: {
          id: `library-highlight-${book.id}-${highlight.id}`,
          title: highlight.sectionHeading,
          subtitle: `${book.title} • ${chapter.title}`,
          category: "Library Highlights",
          icon: "star",
          screen: "BookReader",
          params: { bookId: book.id, chapterId: chapter.id },
          actionLabel: "Open highlighted chapter",
        },
      });
    });

    Object.entries(progress.reflections).forEach(([chapterId, note]) => {
      const trimmed = note.trim();
      if (!trimmed) return;
      const chapter = book.chapters.find((item) => item.id === chapterId);
      if (!chapter) return;
      const score = searchScore(
        query,
        [
          "note",
          "notes",
          "reflection",
          "library annotation",
          book.title,
          book.category,
          chapter.title,
          trimmed,
        ].join(" "),
      );
      if (score <= 0) return;
      results.push({
        score: score + 30,
        result: {
          id: `library-note-${book.id}-${chapter.id}`,
          title: chapter.title,
          subtitle: `${book.title} • ${trimmed.slice(0, 80)}`,
          category: "Library Notes",
          icon: "edit-3",
          screen: "BookReader",
          params: { bookId: book.id, chapterId: chapter.id },
          actionLabel: "Open note in reader",
        },
      });
    });
  });

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_CATEGORY)
    .map((item) => item.result);
}

function buildCalendarEventResults(query: string): SearchResult[] {
  return ISLAMIC_CALENDAR_EVENTS.map((event) => {
    const score = searchScore(
      query,
      [
        event.name,
        event.shortName,
        event.summary,
        event.whyItMatters,
        event.type,
        ...event.suggestedActions,
        ...event.sourceNotes,
      ].join(" "),
    );
    return {
      score,
      result: {
        id: `calendar-${event.id}`,
        title: event.name,
        subtitle: `${event.day} ${ISLAMIC_MONTHS[event.month - 1]} • ${event.summary}`,
        category: "Islamic Calendar",
        icon: event.icon,
        screen: "IslamicCalendar",
        params: { initialEventId: event.id },
        actionLabel: event.primaryActionLabel || "Open event",
      } satisfies SearchResult,
    };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_CATEGORY)
    .map((item) => item.result);
}

function buildNameResults(query: string): SearchResult[] {
  return NAMES_OF_ALLAH_INDEX.map((name) => {
    const score = searchScore(
      query,
      [name.transliteration, name.meaning, "99 names Allah divine name"].join(
        " ",
      ),
    );
    return {
      score,
      result: {
        id: `name-${name.transliteration}`,
        title: name.transliteration,
        subtitle: name.meaning,
        category: "99 Names",
        icon: "star",
        screen: "NamesOfAllah",
        params: { initialSearch: name.transliteration },
        actionLabel: "Open name",
      } satisfies SearchResult,
    };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_CATEGORY)
    .map((item) => item.result);
}

function buildAdhkarResults(query: string): SearchResult[] {
  return ADHKAR_INDEX.map((item) => {
    const score = searchScore(
      query,
      [item.title, item.text, "adhkar remembrance morning evening"].join(" "),
    );
    return {
      score,
      result: {
        id: `adhkar-${item.tab}-${item.title}`,
        title: item.title,
        subtitle: item.text,
        category: "Adhkar",
        icon: "repeat",
        screen: "Adhkar",
        params: { initialTab: item.tab },
        actionLabel: "Open adhkar",
      } satisfies SearchResult,
    };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_CATEGORY)
    .map((item) => item.result);
}

function buildHadithSourceResults(query: string): SearchResult[] {
  return HADITH_COLLECTIONS.flatMap((collection) =>
    collection.chapters.flatMap((chapter) => {
      const chapterScore = searchScore(
        query,
        [
          collection.name,
          collection.arabicName,
          collection.description,
          chapter.name,
          chapter.arabicName || "",
        ].join(" "),
      );
      const results: { score: number; result: SearchResult }[] = [];
      if (chapterScore > 0) {
        results.push({
          score: chapterScore + 20,
          result: {
            id: `hadith-chapter-${collection.id}-${chapter.name}`,
            title: chapter.name,
            subtitle: `${collection.name} • verified source links only`,
            category: "Hadith Source Index",
            icon: "book",
            screen: "HadithLibrary",
            params: {
              initialCollectionId: collection.id,
              initialSearchQuery: chapter.name,
            },
            actionLabel: "Open source links",
          },
        });
      }
      chapter.hadiths.slice(0, 24).forEach((hadith) => {
        const hadithScore = searchScore(
          query,
          [
            collection.name,
            chapter.name,
            hadith.sourceReference,
            hadith.originalReference,
            hadith.sourceCollectionName,
          ].join(" "),
        );
        if (hadithScore > 0) {
          results.push({
            score: hadithScore + 8,
            result: {
              id: `hadith-source-${collection.id}-${hadith.id}`,
              title: hadith.sourceReference,
              subtitle: `${chapter.name} • opens verified source index`,
              category: "Hadith Source Index",
              icon: "book",
              screen: "HadithLibrary",
              params: {
                initialCollectionId: collection.id,
                initialSearchQuery: hadith.sourceReference,
              },
              actionLabel: "Open source",
            },
          });
        }
      });
      return results;
    }),
  )
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_CATEGORY)
    .map((item) => item.result);
}

function buildSmartIntentResults(query: string): SearchResult[] {
  const q = normalizeSearchText(query);
  const results: SearchResult[] = [];
  const flightNumber = extractFlightNumberFromText(query);

  if (
    flightNumber &&
    (/flight|airport|boarding|gate|terminal|travel|trip/.test(q) ||
      q === normalizeSearchText(flightNumber))
  ) {
  }

  if (/halal|food|restaurant|eat|takeaway|take away/.test(q)) {
    results.push({
      id: "intent-halal-nearby",
      title: "Find halal food nearby",
      subtitle:
        "Open local halal search with distance, directions, and checks.",
      category: "Smart Actions",
      icon: "map-pin",
      screen: "NearbyMosques",
      params: { initialTab: "halal" },
    });
  }

  if (/mosque|masjid|jummah|jumuah|friday prayer|nearby prayer/.test(q)) {
    results.push({
      id: "intent-mosques-nearby",
      title: "Find nearby masjids",
      subtitle: "Open local masjid search with directions from your location.",
      category: "Smart Actions",
      icon: "map-pin",
      screen: "NearbyMosques",
      params: { initialTab: "mosques" },
    });
  }

  if (/qibla|kaaba|makkah|direction|compass/.test(q)) {
    results.push({
      id: "intent-qibla",
      title: "Open Qibla finder",
      subtitle: "Use the compass and haptics to face the qibla.",
      category: "Smart Actions",
      icon: "compass",
      screen: "Qibla",
    });
  }

  if (/adhan|athan|alert|reminder|notification|notify/.test(q)) {
    results.push({
      id: "intent-prayer-alerts",
      title: "Prayer alerts and athan",
      subtitle: "Control smart reminders, athan sounds, and prayer alerts.",
      category: "Smart Actions",
      icon: "bell",
      screen: "NotificationSettings",
    });
  }

  if (/zakat|sadaqah|charity|donation|wealth/.test(q)) {
    results.push({
      id: "intent-zakat-finance",
      title: "Open Zakat and charity tools",
      subtitle: "Calculate zakat and reflect on giving progress.",
      category: "Smart Actions",
      icon: "dollar-sign",
      screen: "IslamicFinance",
    });
  }

  return results.slice(0, MAX_PER_CATEGORY);
}

function getPrimarySearchResult(groups: CategoryGroup[]): SearchResult | null {
  const results = groups.flatMap((group) => group.results);
  const priorityCategories = [
    "Exact Matches",
    "Go to Verse",
    "Quran Surahs",
    "Famous Verses",
    "App & Tools",
    "Books & Chapters",
    "Books",
    "Book Chapters",
    "Knowledge Paths",
    "Hadith Source Index",
    "Islamic Calendar",
    "99 Names",
    "Duas",
    "Adhkar",
    "Smart Actions",
  ];
  return (
    results.find((result) => priorityCategories.includes(result.category)) ||
    results[0] ||
    null
  );
}

function getResultSearchScope(result: SearchResult): SearchScopeId {
  if (
    result.screen === "QuranReader" ||
    (result.screen === "Main" && result.params?.screen === "Quran") ||
    result.category === "Go to Verse"
  ) {
    return "quran";
  }

  if (
    [
      "Books",
      "Book Chapters",
      "Knowledge Paths",
      "Hadith Source Index",
    ].includes(result.category) ||
    result.screen === "LibraryHome" ||
    result.screen === "LibraryAnnotations" ||
    result.screen === "BookDetail" ||
    result.screen === "BookReader" ||
    result.screen === "HadithLibrary"
  ) {
    return "library";
  }

  return "tools";
}

function filterSearchGroupsByScope(
  groups: CategoryGroup[],
  scope: SearchScopeId,
): CategoryGroup[] {
  if (scope === "all") return groups;
  return groups
    .map((group) => ({
      ...group,
      results: group.results.filter(
        (result) => getResultSearchScope(result) === scope,
      ),
    }))
    .filter((group) => group.results.length > 0);
}

function countSearchScopeResults(
  groups: CategoryGroup[],
  scope: SearchScopeId,
): number {
  if (scope === "all") {
    return groups.reduce((sum, group) => sum + group.results.length, 0);
  }
  return groups.reduce(
    (sum, group) =>
      sum +
      group.results.filter((result) => getResultSearchScope(result) === scope)
        .length,
    0,
  );
}

function withLibraryAnnotationResults(
  groups: CategoryGroup[],
  query: string,
  libraryProgress: Record<string, UserBookProgress>,
): CategoryGroup[] {
  const annotationResults = buildLibraryAnnotationResults(
    query,
    libraryProgress,
  );
  if (annotationResults.length === 0) return groups;

  const annotationGroup: CategoryGroup = {
    category: "Library Notes & Highlights",
    icon: "edit-3",
    results: annotationResults,
  };
  const booksIndex = groups.findIndex(
    (group) => group.category === "Books & Chapters",
  );
  if (booksIndex < 0) return [...groups, annotationGroup];

  const nextGroups = [...groups];
  nextGroups.splice(booksIndex + 1, 0, annotationGroup);
  return nextGroups;
}

function performSearch(query: string): CategoryGroup[] {
  const q = normalizeSearchText(query);
  if (!q) return [];

  const groups: CategoryGroup[] = [];

  const smartCommandResults = buildSmartCommandResults(query);
  if (smartCommandResults.length > 0) {
    groups.push({
      category: "Exact Matches",
      icon: "command",
      results: smartCommandResults,
    });
  }

  const smartIntentResults = buildSmartIntentResults(query);
  if (smartIntentResults.length > 0) {
    groups.push({
      category: "Smart Actions",
      icon: "zap",
      results: smartIntentResults,
    });
  }

  const verseMatch = q.match(/^(\d{1,3})\s*[:\.]\s*(\d{1,3})$/);
  if (verseMatch) {
    const surahNum = parseInt(verseMatch[1], 10);
    const verseNum = parseInt(verseMatch[2], 10);
    const surah = SURAHS.find((s) => s.id === surahNum);
    if (surah && surahNum >= 1 && surahNum <= 114 && verseNum >= 1) {
      groups.push({
        category: "Go to Verse",
        icon: "navigation" as AppIconName,
        results: [
          {
            id: `goto-${surahNum}-${verseNum}`,
            title: `${surah.nameEnglish} (${surah.nameArabic}) - Ayah ${verseNum}`,
            subtitle: `Go to Surah ${surahNum}, Verse ${verseNum}`,
            category: "Go to Verse",
            icon: "navigation" as AppIconName,
            screen: "QuranReader",
            params: {
              surahNumber: surahNum,
              surahName: surah.nameEnglish,
              initialVerse: verseNum,
            },
          },
        ],
      });
    }
  }

  const wordVerseMatch = q.match(
    /^(?:surah\s+)?(\d{1,3})\s+(?:ayah|verse|ayat|v)\s+(\d{1,3})$/i,
  );
  if (wordVerseMatch && !groups.some((g) => g.category === "Go to Verse")) {
    const surahNum = parseInt(wordVerseMatch[1], 10);
    const verseNum = parseInt(wordVerseMatch[2], 10);
    const surah = SURAHS.find((s) => s.id === surahNum);
    if (surah && surahNum >= 1 && surahNum <= 114 && verseNum >= 1) {
      groups.push({
        category: "Go to Verse",
        icon: "navigation" as AppIconName,
        results: [
          {
            id: `goto-${surahNum}-${verseNum}`,
            title: `${surah.nameEnglish} (${surah.nameArabic}) - Ayah ${verseNum}`,
            subtitle: `Go to Surah ${surahNum}, Verse ${verseNum}`,
            category: "Go to Verse",
            icon: "navigation" as AppIconName,
            screen: "QuranReader",
            params: {
              surahNumber: surahNum,
              surahName: surah.nameEnglish,
              initialVerse: verseNum,
            },
          },
        ],
      });
    }
  }

  const namedAyahMatch = q.match(
    /^(?:surah\s+)?(.+?)\s+(?:ayah|ayat|verse|v)\s+(\d{1,3})$/i,
  );
  if (namedAyahMatch && !groups.some((g) => g.category === "Go to Verse")) {
    const namePart = namedAyahMatch[1].trim().toLowerCase();
    const verseNum = parseInt(namedAyahMatch[2], 10);
    const surah = SURAHS.find(
      (s) =>
        s.nameEnglish.toLowerCase().includes(namePart) ||
        normalizeSearchText(s.nameEnglish).includes(namePart) ||
        s.meaningEnglish.toLowerCase().includes(namePart) ||
        s.nameArabic.includes(namedAyahMatch[1].trim()),
    );
    if (surah && verseNum >= 1) {
      groups.push({
        category: "Go to Verse",
        icon: "navigation" as AppIconName,
        results: [
          {
            id: `goto-named-ayah-${surah.id}-${verseNum}`,
            title: `${surah.nameEnglish} (${surah.nameArabic}) - Ayah ${verseNum}`,
            subtitle: `Go directly to Surah ${surah.id}, Verse ${verseNum}`,
            category: "Go to Verse",
            icon: "navigation" as AppIconName,
            screen: "QuranReader",
            params: {
              surahNumber: surah.id,
              surahName: surah.nameEnglish,
              initialVerse: verseNum,
            },
          },
        ],
      });
    }
  }

  const nameVerseMatch = q.match(/^(.+?)\s+(\d{1,3})$/);
  if (nameVerseMatch && !groups.some((g) => g.category === "Go to Verse")) {
    const namePart = nameVerseMatch[1].trim().toLowerCase();
    const verseNum = parseInt(nameVerseMatch[2], 10);
    const surah = SURAHS.find(
      (s) =>
        s.nameEnglish.toLowerCase().includes(namePart) ||
        s.meaningEnglish.toLowerCase().includes(namePart) ||
        s.nameArabic.includes(nameVerseMatch[1].trim()),
    );
    if (surah && verseNum >= 1) {
      groups.push({
        category: "Go to Verse",
        icon: "navigation" as AppIconName,
        results: [
          {
            id: `goto-name-${surah.id}-${verseNum}`,
            title: `${surah.nameEnglish} (${surah.nameArabic}) - Ayah ${verseNum}`,
            subtitle: `Go to Surah ${surah.id}, Verse ${verseNum}`,
            category: "Go to Verse",
            icon: "navigation" as AppIconName,
            screen: "QuranReader",
            params: {
              surahNumber: surah.id,
              surahName: surah.nameEnglish,
              initialVerse: verseNum,
            },
          },
        ],
      });
    }
  }

  const numOnly = q.match(/^(\d{1,3})$/);
  const trimmedQuery = query.trim();
  const quranResults: SearchResult[] = SURAHS.map((s) => {
    let score = searchScore(query, `${s.nameEnglish} ${s.meaningEnglish}`);
    if (numOnly && s.id === parseInt(numOnly[1], 10)) {
      score = Math.max(score, 400);
    }
    if (trimmedQuery && s.nameArabic.includes(trimmedQuery)) {
      score = Math.max(score, 260);
    }
    return { s, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_CATEGORY)
    .map(({ s }) => ({
      id: `quran-${s.id}`,
      title: `${s.nameEnglish} (${s.nameArabic})`,
      subtitle: s.meaningEnglish,
      category: "Quran Surahs",
      icon: "book-open" as AppIconName,
      screen: "QuranReader",
      params: { surahNumber: s.id, surahName: s.nameEnglish },
    }));
  if (quranResults.length > 0) {
    groups.push({
      category: "Quran Surahs",
      icon: "book-open",
      results: quranResults,
    });
  }

  const verseResults: SearchResult[] = rankBySearchScore(
    query,
    FAMOUS_VERSES,
    (v) => `${v.name} ${v.description} ${v.aliases.join(" ")}`,
  ).map((v, i) => {
    const surah = SURAHS.find((s) => s.id === v.surah);
    return {
      id: `verse-${i}`,
      title: v.name,
      subtitle: v.description,
      category: "Famous Verses",
      icon: "bookmark" as AppIconName,
      screen: "QuranReader",
      params: {
        surahNumber: v.surah,
        surahName: surah?.nameEnglish || v.name,
        initialVerse: v.verse,
      },
    };
  });
  if (verseResults.length > 0) {
    groups.push({
      category: "Famous Verses",
      icon: "bookmark",
      results: verseResults,
    });
  }

  const libraryResults = buildLibraryResults(query);
  if (libraryResults.length > 0) {
    groups.push({
      category: "Books & Chapters",
      icon: "book-open",
      results: libraryResults,
    });
  }

  const topicResults = buildKnowledgeTopicResults(query);
  if (topicResults.length > 0) {
    groups.push({
      category: "Knowledge Paths",
      icon: "layers",
      results: topicResults,
    });
  }

  const calendarResults = buildCalendarEventResults(query);
  if (calendarResults.length > 0) {
    groups.push({
      category: "Islamic Calendar",
      icon: "calendar",
      results: calendarResults,
    });
  }

  const nameResults = buildNameResults(query);
  if (nameResults.length > 0) {
    groups.push({
      category: "99 Names",
      icon: "star",
      results: nameResults,
    });
  }

  const duaResults: SearchResult[] = rankBySearchScore(
    query,
    DUAS_INDEX,
    (d) => `${d.category} ${d.text}`,
  ).map((d, i) => ({
    id: `dua-${i}`,
    title: `${d.category} Duas`,
    subtitle: d.text,
    category: "Duas",
    icon: "heart" as AppIconName,
    screen: "Duas",
    params: { initialCategory: d.category },
    actionLabel: "Open duas",
  }));
  if (duaResults.length > 0) {
    groups.push({ category: "Duas", icon: "heart", results: duaResults });
  }

  const adhkarResults = buildAdhkarResults(query);
  if (adhkarResults.length > 0) {
    groups.push({
      category: "Adhkar",
      icon: "repeat",
      results: adhkarResults,
    });
  }

  const hadithSourceResults = buildHadithSourceResults(query);
  if (hadithSourceResults.length > 0) {
    groups.push({
      category: "Hadith Source Index",
      icon: "book",
      results: hadithSourceResults,
    });
  }

  const hadithResults: SearchResult[] = rankBySearchScore(
    query,
    HADITH_INDEX,
    (h) => `${h.collection} ${h.reference} ${h.topic}`,
  ).map((h, i) => ({
    id: `hadith-${i}`,
    title: h.collection,
    subtitle: `${h.reference} • ${h.topic}`,
    category: "Hadith",
    icon: "book" as AppIconName,
    screen: "HadithLibrary",
  }));
  if (hadithResults.length > 0) {
    groups.push({ category: "Hadith", icon: "book", results: hadithResults });
  }

  const scholarResults: SearchResult[] = rankBySearchScore(
    query,
    SCHOLARS,
    (s) => s,
  ).map((s, i) => ({
    id: `scholar-${i}`,
    title: s,
    subtitle: "Islamic Scholar",
    category: "Scholars",
    icon: "users" as AppIconName,
    screen: "Scholars",
  }));
  if (scholarResults.length > 0) {
    groups.push({
      category: "Scholars",
      icon: "users",
      results: scholarResults,
    });
  }

  const prophetResults: SearchResult[] = rankBySearchScore(
    query,
    PROPHETS,
    (p) => p,
  ).map((p, i) => ({
    id: `prophet-${i}`,
    title: `Prophet ${p}`,
    subtitle: "Prophet of Islam",
    category: "Prophets",
    icon: "star" as AppIconName,
    screen: "Prophets",
  }));
  if (prophetResults.length > 0) {
    groups.push({
      category: "Prophets",
      icon: "star",
      results: prophetResults,
    });
  }

  const kidsResults: SearchResult[] = rankBySearchScore(
    query,
    KIDS_STORIES,
    (s) => s,
  ).map((s, i) => ({
    id: `kids-${i}`,
    title: s,
    subtitle: "Kids Content",
    category: "Kids Content",
    icon: "smile" as AppIconName,
    screen: "KidsStories",
  }));
  if (kidsResults.length > 0) {
    groups.push({
      category: "Kids Content",
      icon: "smile",
      results: kidsResults,
    });
  }

  const settingsResults = buildFeatureResults(query);
  if (settingsResults.length > 0) {
    groups.push({
      category: "App & Tools",
      icon: "settings",
      results: settingsResults,
    });
  }

  return groups;
}

export default function GlobalSearchScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [activeScope, setActiveScope] = useState<SearchScopeId>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [libraryProgress, setLibraryProgress] = useState<
    Record<string, UserBookProgress>
  >({});

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getAllBookProgress()
        .then((progress) => {
          if (active) setLibraryProgress(progress);
        })
        .catch(() => {
          if (active) setLibraryProgress({});
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {}
  };

  const saveSearch = useCallback(
    async (term: string) => {
      try {
        const trimmed = term.trim();
        if (!trimmed) return;
        const updated = [
          trimmed,
          ...recentSearches.filter((s) => s !== trimmed),
        ].slice(0, MAX_RECENT);
        setRecentSearches(updated);
        await AsyncStorage.setItem(
          RECENT_SEARCHES_KEY,
          JSON.stringify(updated),
        );
      } catch {}
    },
    [recentSearches],
  );

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  };

  const removeRecentSearch = async (term: string) => {
    try {
      const updated = recentSearches.filter((s) => s !== term);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {}
  };

  const results = useMemo(
    () =>
      withLibraryAnnotationResults(
        performSearch(query),
        query,
        libraryProgress,
      ),
    [query, libraryProgress],
  );
  const scopedResults = useMemo(
    () => filterSearchGroupsByScope(results, activeScope),
    [activeScope, results],
  );
  const topResult = useMemo(
    () => getPrimarySearchResult(scopedResults),
    [scopedResults],
  );

  const handleResultPress = useCallback(
    (result: SearchResult) => {
      // Dismiss the keyboard before navigating so its collapse animation
      // doesn't fight the screen transition (the main cause of the judder
      // when opening a heavy destination like the Quran reader).
      Keyboard.dismiss();
      if (result.screen === "QuranReader" && result.params) {
        navigation.push(result.screen, result.params);
      } else if (result.params) {
        navigation.navigate(result.screen, result.params);
      } else {
        navigation.navigate(result.screen);
      }
      // Persist the search term after the transition settles, so the
      // AsyncStorage write + state update never stall the outgoing frame.
      InteractionManager.runAfterInteractions(() => saveSearch(query));
    },
    [navigation, query, saveSearch],
  );

  const handleSubmitSearch = useCallback(() => {
    if (topResult) {
      handleResultPress(topResult);
      return;
    }
    saveSearch(query);
  }, [handleResultPress, query, saveSearch, topResult]);

  const handleSuggestionPress = useCallback(
    (term: string) => {
      setQuery(term);
      saveSearch(term);
    },
    [saveSearch],
  );

  const hasQuery = query.trim().length > 0;
  const totalResults = scopedResults.reduce(
    (sum, g) => sum + g.results.length,
    0,
  );
  const allResultCount = countSearchScopeResults(results, "all");
  const activeScopeLabel =
    SEARCH_SCOPE_FILTERS.find((scope) => scope.id === activeScope)?.label ||
    "All";

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.searchDock,
          {
            paddingTop: insets.top + Spacing.sm,
            backgroundColor: isDark
              ? "rgba(5, 7, 18, 0.94)"
              : theme.backgroundRoot,
            borderBottomColor: theme.borderSubtle,
          },
        ]}
      >
        <View style={styles.searchDockTop}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
              pressed && { opacity: 0.6 },
            ]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back from NurAI search"
            hitSlop={8}
            testID="button-search-back"
          >
            <AppIcon name="arrow-left" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.searchDockCopy}>
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={[styles.searchDockEyebrow, { color: theme.primary }]}
            >
              COMMAND SEARCH
            </ThemedText>
            <ThemedText type="h4" numberOfLines={1}>
              Search app
            </ThemedText>
          </View>
        </View>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: theme.input, borderColor: theme.inputBorder },
          ]}
        >
          <AppIcon name="search" size={20} color={theme.textMuted} />
          <TextInput
            ref={inputRef}
            style={[
              styles.searchInput,
              { color: theme.text, fontFamily: "PlusJakartaSans_400Regular" },
            ]}
            accessibilityLabel="Search destinations, Quran, library, tools, and source references"
            placeholder="Search ayahs, books, flights, family, tools"
            placeholderTextColor={theme.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={handleSubmitSearch}
            autoCorrect={false}
            testID="input-global-search"
          />
          {query.length > 0 ? (
            <Pressable
              style={styles.clearSearchButton}
              onPress={() => setQuery("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear NurAI search"
              testID="button-clear-search"
            >
              <AppIcon name="x-circle" size={18} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <View
          style={[
            styles.searchTrustBoundary,
            {
              backgroundColor: `${theme.scholar}0F`,
              borderColor: `${theme.scholar}28`,
            },
          ]}
          accessibilityRole="summary"
          testID="global-search-trust-boundary"
        >
          <AppIcon name="shield" size={14} color={theme.scholar} />
          <ThemedText
            type="caption"
            numberOfLines={2}
            style={[styles.searchTrustBoundaryText, { color: theme.textMuted }]}
          >
            Destinations first. Quran, library, travel, family, and tools stay
            easy to reach while we rebuild NurAI intelligence from scratch.
          </ThemedText>
        </View>
        {hasQuery && allResultCount > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.searchScopeRailContent}
            style={styles.searchScopeRail}
            keyboardShouldPersistTaps="handled"
            testID="global-search-scope-rail"
          >
            {SEARCH_SCOPE_FILTERS.map((scope) => {
              const count = countSearchScopeResults(results, scope.id);
              const selected = activeScope === scope.id;
              const accent =
                scope.id === "library"
                  ? theme.success || theme.primary
                  : scope.id === "quran"
                    ? theme.scholar
                    : theme.primary;
              return (
                <Pressable
                  key={scope.id}
                  onPress={() => setActiveScope(scope.id)}
                  disabled={count === 0}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: count === 0 }}
                  accessibilityLabel={`${scope.label} search scope, ${count} result${count === 1 ? "" : "s"}`}
                  style={({ pressed }) => [
                    styles.searchScopeChip,
                    {
                      backgroundColor: selected
                        ? `${accent}1F`
                        : theme.surfaceGlass,
                      borderColor: selected
                        ? `${accent}70`
                        : theme.borderSubtle,
                      opacity: count === 0 ? 0.44 : pressed ? 0.76 : 1,
                    },
                  ]}
                  testID={`global-search-scope-${scope.id}`}
                >
                  <AppIcon
                    name={scope.icon}
                    size={14}
                    color={selected ? accent : theme.textMuted}
                  />
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{
                      color: selected ? theme.text : theme.textSecondary,
                      fontWeight: selected ? "900" : "700",
                    }}
                  >
                    {scope.label}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: selected ? accent : theme.textMuted }}
                  >
                    {count}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        {!hasQuery ? (
          <View
            style={styles.searchTrustLaneRail}
            testID="global-search-trust-lane-rail"
          >
            {SEARCH_TRUST_LANES.map((lane) => {
              const accent =
                lane.tone === "scholar"
                  ? theme.scholar
                  : lane.tone === "emerald"
                    ? theme.success || theme.primary
                    : theme.primary;
              return (
                <Pressable
                  key={lane.id}
                  onPress={() => handleSuggestionPress(lane.query)}
                  accessibilityRole="button"
                  accessibilityLabel={`${lane.label}: ${lane.helper}`}
                  style={({ pressed }) => [
                    styles.searchTrustLane,
                    {
                      backgroundColor: `${accent}0D`,
                      borderColor: `${accent}24`,
                    },
                    pressed
                      ? { opacity: 0.78, transform: [{ scale: 0.98 }] }
                      : null,
                  ]}
                  testID={`global-search-trust-lane-${lane.id}`}
                >
                  <View
                    style={[
                      styles.searchTrustLaneIcon,
                      { backgroundColor: `${accent}18` },
                    ]}
                  >
                    <AppIcon name={lane.icon} size={14} color={accent} />
                  </View>
                  <View style={styles.searchTrustLaneCopy}>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.text, fontWeight: "900" }}
                    >
                      {lane.label}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.textMuted }}
                    >
                      {lane.helper}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {hasQuery && topResult ? (
          <Pressable
            onPress={() => handleResultPress(topResult)}
            accessibilityRole="button"
            accessibilityLabel={`Open top result ${topResult.title}`}
            style={({ pressed }) => [
              styles.topResultCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.primaryBorder,
              },
              pressed ? { opacity: 0.84, transform: [{ scale: 0.99 }] } : null,
            ]}
            testID="button-search-top-result"
          >
            <View
              style={[
                styles.topResultIcon,
                {
                  backgroundColor: isDark
                    ? `${theme.primary}22`
                    : `${theme.primary}10`,
                },
              ]}
            >
              <AppIcon name={topResult.icon} size={17} color={theme.primary} />
            </View>
            <View style={styles.topResultText}>
              <ThemedText
                type="caption"
                style={{ color: theme.primary, fontWeight: "900" }}
              >
                BEST MATCH
              </ThemedText>
              <ThemedText type="body" numberOfLines={1}>
                {topResult.title}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: theme.textMuted }}
              >
                {topResult.actionLabel || topResult.subtitle}
              </ThemedText>
            </View>
            <View
              style={[
                styles.returnHint,
                {
                  backgroundColor: `${theme.primary}12`,
                  borderColor: `${theme.primary}28`,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{ color: theme.primary, fontWeight: "900" }}
              >
                Open
              </ThemedText>
            </View>
          </Pressable>
        ) : null}
        {hasQuery && totalResults > 0 ? (
          <View
            style={[
              styles.resultSummary,
              {
                backgroundColor: `${theme.primary}10`,
                borderColor: `${theme.primary}26`,
              },
            ]}
            testID="global-search-result-summary"
          >
            <AppIcon name="command" size={15} color={theme.primary} />
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={[styles.resultSummaryText, { color: theme.textSecondary }]}
            >
              {totalResults} match{totalResults === 1 ? "" : "es"} across{" "}
              {scopedResults.length} area
              {scopedResults.length === 1 ? "" : "s"} in {activeScopeLabel}.
              Press return to open the best match.
            </ThemedText>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {!hasQuery ? (
          <>
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={styles.section}
              testID="global-search-command-rail"
            >
              <View
                style={[
                  styles.commandRail,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.primaryBorder || theme.borderSubtle,
                  },
                ]}
              >
                <View style={styles.commandRailHeader}>
                  <View
                    style={[
                      styles.commandRailIcon,
                      {
                        backgroundColor: `${theme.primary}14`,
                        borderColor: `${theme.primary}24`,
                      },
                    ]}
                  >
                    <AppIcon name="search" size={18} color={theme.primary} />
                  </View>
                  <View style={styles.commandRailCopy}>
                    <ThemedText type="h4" style={styles.commandRailTitle}>
                      Search everything
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color: theme.textSecondary }}
                    >
                      Jump straight to ayahs, books, travel, family, tools, or
                      source references.
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.commandStarterGrid}>
                  {SEARCH_STARTER_ACTIONS.map((action) => {
                    const accent =
                      action.tone === "scholar"
                        ? theme.scholar
                        : action.tone === "emerald"
                          ? theme.success || theme.primary
                          : theme.primary;
                    return (
                      <Pressable
                        key={action.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${action.label}: ${action.helper}`}
                        onPress={() => handleSuggestionPress(action.query)}
                        style={({ pressed }) => [
                          styles.commandStarter,
                          {
                            backgroundColor: `${accent}0F`,
                            borderColor: `${accent}2B`,
                          },
                          pressed
                            ? { opacity: 0.78, transform: [{ scale: 0.98 }] }
                            : null,
                        ]}
                        testID={`global-search-starter-${action.id}`}
                      >
                        <View
                          style={[
                            styles.commandStarterIcon,
                            { backgroundColor: `${accent}16` },
                          ]}
                        >
                          <AppIcon
                            name={action.icon}
                            size={16}
                            color={accent}
                          />
                        </View>
                        <View style={styles.commandStarterCopy}>
                          <ThemedText
                            type="small"
                            numberOfLines={1}
                            style={{ color: theme.text, fontWeight: "800" }}
                          >
                            {action.label}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.textMuted }}
                          >
                            {action.helper}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Animated.View>

            {recentSearches.length > 0 ? (
              <Animated.View
                entering={FadeInDown.duration(300)}
                style={styles.section}
              >
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <AppIcon
                      name="clock"
                      size={16}
                      color={theme.textSecondary}
                    />
                    <ThemedText
                      type="small"
                      style={[
                        styles.sectionTitle,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Recent Searches
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={clearRecentSearches}
                    hitSlop={8}
                    testID="button-clear-recent"
                  >
                    <ThemedText type="caption" style={{ color: theme.primary }}>
                      Clear All
                    </ThemedText>
                  </Pressable>
                </View>
                {recentSearches.map((term, index) => (
                  <Animated.View
                    key={`recent-${term}`}
                    entering={FadeInDown.delay(index * 40).duration(300)}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.recentRow,
                        {
                          backgroundColor: theme.surfaceGlass,
                          borderColor: theme.borderSubtle,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => handleSuggestionPress(term)}
                      testID={`button-recent-${index}`}
                    >
                      <AppIcon name="clock" size={16} color={theme.textMuted} />
                      <ThemedText type="body" style={styles.recentText}>
                        {term}
                      </ThemedText>
                      <Pressable
                        onPress={() => removeRecentSearch(term)}
                        hitSlop={8}
                        testID={`button-remove-recent-${index}`}
                      >
                        <AppIcon name="x" size={16} color={theme.textMuted} />
                      </Pressable>
                    </Pressable>
                  </Animated.View>
                ))}
              </Animated.View>
            ) : null}

            <Animated.View
              entering={FadeInDown.delay(100).duration(300)}
              style={styles.section}
            >
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <AppIcon
                    name="trending-up"
                    size={16}
                    color={theme.textSecondary}
                  />
                  <ThemedText
                    type="small"
                    style={[
                      styles.sectionTitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Popular Searches
                  </ThemedText>
                </View>
              </View>
              <View style={styles.suggestionsGrid}>
                {POPULAR_SUGGESTIONS.map((suggestion, index) => (
                  <Pressable
                    key={suggestion}
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      {
                        backgroundColor: isDark
                          ? `${theme.primary}20`
                          : `${theme.primary}10`,
                        borderColor: isDark
                          ? `${theme.primary}40`
                          : `${theme.primary}25`,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleSuggestionPress(suggestion)}
                    testID={`button-suggestion-${index}`}
                  >
                    <ThemedText type="small" style={{ color: theme.primary }}>
                      {suggestion}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          </>
        ) : totalResults === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.emptyState}
          >
            <View
              style={[
                styles.emptyIconCircle,
                {
                  backgroundColor: isDark
                    ? `${theme.primary}20`
                    : `${theme.primary}10`,
                },
              ]}
            >
              <AppIcon name="search" size={32} color={theme.textMuted} />
            </View>
            <ThemedText
              type="h4"
              style={[styles.emptyTitle, { color: theme.textSecondary }]}
            >
              {allResultCount > 0
                ? `No ${activeScopeLabel} matches`
                : "No results found"}
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textMuted, textAlign: "center" }}
            >
              {allResultCount > 0
                ? "Switch scope or search an exact ayah, tool, book, or travel detail."
                : "Try an exact ayah, a tool name, a book title, or a flight number."}
            </ThemedText>
            <View style={styles.emptySuggestionWrap}>
              {EMPTY_STATE_SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => handleSuggestionPress(suggestion)}
                  style={({ pressed }) => [
                    styles.emptySuggestionChip,
                    {
                      backgroundColor: `${theme.primary}10`,
                      borderColor: `${theme.primary}28`,
                    },
                    pressed ? { opacity: 0.75 } : null,
                  ]}
                  testID={`global-search-empty-suggestion-${suggestion
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")}`}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    {suggestion}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={[styles.emptyTrustCopy, { color: theme.textMuted }]}
            >
              Sensitive religious questions should be handled carefully with
              qualified human guidance.
            </ThemedText>
          </Animated.View>
        ) : (
          scopedResults.map((group, groupIndex) => (
            <Animated.View
              key={group.category}
              entering={FadeInDown.delay(groupIndex * 60).duration(300)}
              style={styles.section}
            >
              <View style={styles.categoryHeader}>
                <View
                  style={[
                    styles.categoryIconCircle,
                    {
                      backgroundColor: isDark
                        ? `${theme.primary}20`
                        : `${theme.primary}10`,
                    },
                  ]}
                >
                  <AppIcon name={group.icon} size={16} color={theme.primary} />
                </View>
                <ThemedText
                  type="small"
                  style={[styles.categoryTitle, { color: theme.textSecondary }]}
                >
                  {group.category}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  {group.results.length} result
                  {group.results.length !== 1 ? "s" : ""}
                </ThemedText>
              </View>
              {group.results.map((result, resultIndex) => (
                <Animated.View
                  key={result.id}
                  entering={FadeInDown.delay(
                    groupIndex * 60 + resultIndex * 30,
                  ).duration(300)}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.resultRow,
                      {
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                      },
                      pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={() => handleResultPress(result)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${result.title}. ${result.subtitle}`}
                    testID={`button-result-${result.id}`}
                  >
                    <View
                      style={[
                        styles.resultIcon,
                        {
                          backgroundColor: isDark
                            ? `${theme.primary}20`
                            : `${theme.primary}10`,
                        },
                      ]}
                    >
                      <AppIcon
                        name={result.icon}
                        size={18}
                        color={theme.primary}
                      />
                    </View>
                    <View style={styles.resultContent}>
                      <ThemedText
                        type="body"
                        numberOfLines={1}
                        style={styles.resultTitle}
                      >
                        {result.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: theme.textSecondary }}
                      >
                        {result.subtitle}
                      </ThemedText>
                      {result.actionLabel ? (
                        <View
                          style={[
                            styles.resultActionPill,
                            {
                              backgroundColor: isDark
                                ? `${theme.primary}14`
                                : `${theme.primary}10`,
                              borderColor: isDark
                                ? `${theme.primary}30`
                                : `${theme.primary}20`,
                            },
                          ]}
                        >
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={[
                              styles.resultActionText,
                              { color: theme.primary },
                            ]}
                          >
                            {result.actionLabel}
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                    <AppIcon
                      name="chevron-right"
                      size={18}
                      color={theme.textMuted}
                    />
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchDock: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    zIndex: 5,
  },
  searchDockTop: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  searchDockCopy: {
    flex: 1,
    minWidth: 0,
  },
  searchDockEyebrow: {
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 1,
  },
  searchWrapper: {
    gap: Spacing.sm,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    minHeight: 56,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  clearSearchButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
  searchTrustBoundary: {
    minHeight: 38,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  searchTrustBoundaryText: {
    flex: 1,
    lineHeight: 17,
  },
  searchTrustLaneRail: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  searchTrustLane: {
    minHeight: 48,
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  searchTrustLaneIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchTrustLaneCopy: {
    flex: 1,
    minWidth: 0,
  },
  searchScopeRail: {
    marginHorizontal: -Spacing.lg,
  },
  searchScopeRailContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  searchScopeChip: {
    minHeight: 40,
    minWidth: 92,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  topResultCard: {
    minHeight: 74,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  topResultIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  topResultText: {
    flex: 1,
    minWidth: 0,
  },
  returnHint: {
    minHeight: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  resultSummary: {
    minHeight: 42,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  resultSummaryText: {
    flex: 1,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  commandRail: {
    borderRadius: BorderRadius["3xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: "hidden",
    gap: Spacing.md,
  },
  commandRailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  commandRailIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  commandRailCopy: {
    flex: 1,
    minWidth: 0,
  },
  commandRailTitle: {
    marginBottom: 2,
  },
  commandStarterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  commandStarter: {
    minHeight: 64,
    flexBasis: "48%",
    flexGrow: 1,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  commandStarterIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  commandStarterCopy: {
    flex: 1,
    minWidth: 0,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  recentText: {
    flex: 1,
  },
  suggestionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  suggestionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing["5xl"],
    gap: Spacing.md,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    marginBottom: Spacing.xs,
  },
  emptySuggestionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  emptySuggestionChip: {
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyAskButton: {
    minHeight: 46,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  emptyTrustCopy: {
    maxWidth: 320,
    textAlign: "center",
    lineHeight: 18,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  categoryIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitle: {
    flex: 1,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  resultContent: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    fontWeight: "500",
  },
  resultActionPill: {
    alignSelf: "flex-start",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    marginTop: 2,
  },
  resultActionText: {
    fontWeight: "700",
  },
});
