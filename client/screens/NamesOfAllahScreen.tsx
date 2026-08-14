import React, { useState, useMemo, useCallback } from "react";
import { View, FlatList, TextInput, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import {
  CrescentMark,
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useNurAI } from "@/context/NurAIContext";
import {
  AIResponseModal,
  AIResponseState,
  AIResponseData,
  customerSafeAIErrorMessage,
} from "@/components/AIResponseModal";
import {
  getNameOfAllahInsight,
  AIContextError,
} from "@/services/aiContextService";
import { mapAIContextResponseToModalData } from "@/services/personalAIResponseMapper";
import { useSubscription } from "@/context/SubscriptionContext";
import { AppIcon, type AppIconName } from "@/components/icons";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Name {
  number: number;
  arabic: string;
  transliteration: string;
  meaning: string;
}

const NAMES: Name[] = [
  {
    number: 1,
    arabic:
      "\u0627\u0644\u0631\u064e\u0651\u062d\u0652\u0645\u064e\u0646\u064f",
    transliteration: "Ar-Rahman",
    meaning: "The Most Gracious",
  },
  {
    number: 2,
    arabic: "\u0627\u0644\u0631\u064e\u0651\u062d\u0650\u064a\u0645\u064f",
    transliteration: "Ar-Raheem",
    meaning: "The Most Merciful",
  },
  {
    number: 3,
    arabic: "\u0627\u0644\u0652\u0645\u064e\u0644\u0650\u0643\u064f",
    transliteration: "Al-Malik",
    meaning: "The King",
  },
  {
    number: 4,
    arabic:
      "\u0627\u0644\u0652\u0642\u064f\u062f\u064f\u0651\u0648\u0633\u064f",
    transliteration: "Al-Quddus",
    meaning: "The Most Sacred",
  },
  {
    number: 5,
    arabic: "\u0627\u0644\u0633\u064e\u0651\u0644\u0627\u064e\u0645\u064f",
    transliteration: "As-Salam",
    meaning: "The Source of Peace",
  },
  {
    number: 6,
    arabic:
      "\u0627\u0644\u0652\u0645\u064f\u0624\u0652\u0645\u0650\u0646\u064f",
    transliteration: "Al-Mu'min",
    meaning: "The Guardian of Faith",
  },
  {
    number: 7,
    arabic:
      "\u0627\u0644\u0652\u0645\u064f\u0647\u064e\u064a\u0652\u0645\u0650\u0646\u064f",
    transliteration: "Al-Muhaymin",
    meaning: "The Protector",
  },
  {
    number: 8,
    arabic: "\u0627\u0644\u0652\u0639\u064e\u0632\u0650\u064a\u0632\u064f",
    transliteration: "Al-Aziz",
    meaning: "The Almighty",
  },
  {
    number: 9,
    arabic:
      "\u0627\u0644\u0652\u062c\u064e\u0628\u064e\u0651\u0627\u0631\u064f",
    transliteration: "Al-Jabbar",
    meaning: "The Compeller",
  },
  {
    number: 10,
    arabic:
      "\u0627\u0644\u0652\u0645\u064f\u062a\u064e\u0643\u064e\u0628\u0650\u0651\u0631\u064f",
    transliteration: "Al-Mutakabbir",
    meaning: "The Supreme",
  },
  {
    number: 11,
    arabic: "\u0627\u0644\u0652\u062e\u064e\u0627\u0644\u0650\u0642\u064f",
    transliteration: "Al-Khaliq",
    meaning: "The Creator",
  },
  {
    number: 12,
    arabic: "\u0627\u0644\u0652\u0628\u064e\u0627\u0631\u0650\u0626\u064f",
    transliteration: "Al-Bari",
    meaning: "The Maker of Order",
  },
  {
    number: 13,
    arabic:
      "\u0627\u0644\u0652\u0645\u064f\u0635\u064e\u0648\u0650\u0651\u0631\u064f",
    transliteration: "Al-Musawwir",
    meaning: "The Shaper of Beauty",
  },
  {
    number: 14,
    arabic:
      "\u0627\u0644\u0652\u063a\u064e\u0641\u064e\u0651\u0627\u0631\u064f",
    transliteration: "Al-Ghaffar",
    meaning: "The Forgiving",
  },
  {
    number: 15,
    arabic:
      "\u0627\u0644\u0652\u0642\u064e\u0647\u064e\u0651\u0627\u0631\u064f",
    transliteration: "Al-Qahhar",
    meaning: "The Subduer",
  },
  {
    number: 16,
    arabic:
      "\u0627\u0644\u0652\u0648\u064e\u0647\u064e\u0651\u0627\u0628\u064f",
    transliteration: "Al-Wahhab",
    meaning: "The Giver of All",
  },
  {
    number: 17,
    arabic:
      "\u0627\u0644\u0631\u064e\u0651\u0632\u064e\u0651\u0627\u0642\u064f",
    transliteration: "Ar-Razzaq",
    meaning: "The Sustainer",
  },
  {
    number: 18,
    arabic:
      "\u0627\u0644\u0652\u0641\u064e\u062a\u064e\u0651\u0627\u062d\u064f",
    transliteration: "Al-Fattah",
    meaning: "The Opener",
  },
  {
    number: 19,
    arabic: "\u0627\u0644\u0652\u0639\u064e\u0644\u0650\u064a\u0645\u064f",
    transliteration: "Al-Alim",
    meaning: "The Knower of All",
  },
  {
    number: 20,
    arabic: "\u0627\u0644\u0652\u0642\u064e\u0627\u0628\u0650\u0636\u064f",
    transliteration: "Al-Qabid",
    meaning: "The Constrictor",
  },
  {
    number: 21,
    arabic: "\u0627\u0644\u0652\u0628\u064e\u0627\u0633\u0650\u0637\u064f",
    transliteration: "Al-Basit",
    meaning: "The Reliever",
  },
  {
    number: 22,
    arabic: "\u0627\u0644\u0652\u062e\u064e\u0627\u0641\u0650\u0636\u064f",
    transliteration: "Al-Khafid",
    meaning: "The Abaser",
  },
  {
    number: 23,
    arabic: "\u0627\u0644\u0631\u064e\u0651\u0627\u0641\u0650\u0639\u064f",
    transliteration: "Ar-Rafi",
    meaning: "The Exalter",
  },
  {
    number: 24,
    arabic: "\u0627\u0644\u0652\u0645\u064f\u0639\u0650\u0632\u064f\u0651",
    transliteration: "Al-Mu'izz",
    meaning: "The Bestower of Honors",
  },
  {
    number: 25,
    arabic: "\u0627\u0644\u0645\u064f\u0630\u0650\u0644\u064f\u0651",
    transliteration: "Al-Mudhill",
    meaning: "The Humiliator",
  },
  {
    number: 26,
    arabic: "\u0627\u0644\u0633\u064e\u0651\u0645\u0650\u064a\u0639\u064f",
    transliteration: "As-Sami",
    meaning: "The Hearer of All",
  },
  {
    number: 27,
    arabic: "\u0627\u0644\u0652\u0628\u064e\u0635\u0650\u064a\u0631\u064f",
    transliteration: "Al-Basir",
    meaning: "The Seer of All",
  },
  {
    number: 28,
    arabic: "\u0627\u0644\u0652\u062d\u064e\u0643\u064e\u0645\u064f",
    transliteration: "Al-Hakam",
    meaning: "The Judge",
  },
  {
    number: 29,
    arabic: "\u0627\u0644\u0652\u0639\u064e\u062f\u0652\u0644\u064f",
    transliteration: "Al-Adl",
    meaning: "The Just",
  },
  {
    number: 30,
    arabic: "\u0627\u0644\u0644\u064e\u0651\u0637\u0650\u064a\u0641\u064f",
    transliteration: "Al-Latif",
    meaning: "The Subtle One",
  },
  {
    number: 31,
    arabic: "\u0627\u0644\u0652\u062e\u064e\u0628\u0650\u064a\u0631\u064f",
    transliteration: "Al-Khabir",
    meaning: "The All-Aware",
  },
  {
    number: 32,
    arabic: "\u0627\u0644\u0652\u062d\u064e\u0644\u0650\u064a\u0645\u064f",
    transliteration: "Al-Halim",
    meaning: "The Forbearing",
  },
  {
    number: 33,
    arabic: "\u0627\u0644\u0652\u0639\u064e\u0638\u0650\u064a\u0645\u064f",
    transliteration: "Al-Azim",
    meaning: "The Magnificent",
  },
  {
    number: 34,
    arabic: "\u0627\u0644\u0652\u063a\u064e\u0641\u064f\u0648\u0631\u064f",
    transliteration: "Al-Ghafur",
    meaning: "The Great Forgiver",
  },
  {
    number: 35,
    arabic: "\u0627\u0644\u0634\u064e\u0651\u0643\u064f\u0648\u0631\u064f",
    transliteration: "Ash-Shakur",
    meaning: "The Most Appreciative",
  },
  {
    number: 36,
    arabic: "\u0627\u0644\u0652\u0639\u064e\u0644\u0650\u064a\u064f\u0651",
    transliteration: "Al-Ali",
    meaning: "The Highest",
  },
  {
    number: 37,
    arabic: "\u0627\u0644\u0652\u0643\u064e\u0628\u0650\u064a\u0631\u064f",
    transliteration: "Al-Kabir",
    meaning: "The Greatest",
  },
  {
    number: 38,
    arabic: "\u0627\u0644\u0652\u062d\u064e\u0641\u0650\u064a\u0638\u064f",
    transliteration: "Al-Hafiz",
    meaning: "The Preserver",
  },
  {
    number: 39,
    arabic: "\u0627\u0644\u0645\u064f\u0642\u0650\u064a\u062a\u064f",
    transliteration: "Al-Muqit",
    meaning: "The Nourisher",
  },
  {
    number: 40,
    arabic: "\u0627\u0644\u0652\u062d\u0633\u0650\u064a\u0628\u064f",
    transliteration: "Al-Hasib",
    meaning: "The Accounter",
  },
  {
    number: 41,
    arabic: "\u0627\u0644\u0652\u062c\u064e\u0644\u0650\u064a\u0644\u064f",
    transliteration: "Al-Jalil",
    meaning: "The Mighty",
  },
  {
    number: 42,
    arabic: "\u0627\u0644\u0652\u0643\u064e\u0631\u0650\u064a\u0645\u064f",
    transliteration: "Al-Karim",
    meaning: "The Generous",
  },
  {
    number: 43,
    arabic: "\u0627\u0644\u0631\u064e\u0651\u0642\u0650\u064a\u0628\u064f",
    transliteration: "Ar-Raqib",
    meaning: "The Watchful One",
  },
  {
    number: 44,
    arabic: "\u0627\u0644\u0652\u0645\u064f\u062c\u0650\u064a\u0628\u064f",
    transliteration: "Al-Mujib",
    meaning: "The Responsive",
  },
  {
    number: 45,
    arabic: "\u0627\u0644\u0652\u0648\u064e\u0627\u0633\u0650\u0639\u064f",
    transliteration: "Al-Wasi",
    meaning: "The All-Comprehending",
  },
  {
    number: 46,
    arabic: "\u0627\u0644\u0652\u062d\u064e\u0643\u0650\u064a\u0645\u064f",
    transliteration: "Al-Hakim",
    meaning: "The Perfectly Wise",
  },
  {
    number: 47,
    arabic: "\u0627\u0644\u0652\u0648\u064e\u062f\u064f\u0648\u062f\u064f",
    transliteration: "Al-Wadud",
    meaning: "The Most Loving",
  },
  {
    number: 48,
    arabic: "\u0627\u0644\u0652\u0645\u064e\u062c\u0650\u064a\u062f\u064f",
    transliteration: "Al-Majid",
    meaning: "The Majestic One",
  },
  {
    number: 49,
    arabic: "\u0627\u0644\u0652\u0628\u064e\u0627\u0639\u0650\u062b\u064f",
    transliteration: "Al-Ba'ith",
    meaning: "The Resurrector",
  },
  {
    number: 50,
    arabic: "\u0627\u0644\u0634\u064e\u0651\u0647\u0650\u064a\u062f\u064f",
    transliteration: "Ash-Shahid",
    meaning: "The Witness",
  },
  {
    number: 51,
    arabic: "\u0627\u0644\u0652\u062d\u064e\u0642\u064f\u0651",
    transliteration: "Al-Haqq",
    meaning: "The Truth",
  },
  {
    number: 52,
    arabic: "\u0627\u0644\u0652\u0648\u064e\u0643\u0650\u064a\u0644\u064f",
    transliteration: "Al-Wakil",
    meaning: "The Trustee",
  },
  {
    number: 53,
    arabic: "\u0627\u0644\u0652\u0642\u064e\u0648\u0650\u064a\u064f\u0651",
    transliteration: "Al-Qawiyy",
    meaning: "The Possessor of All Strength",
  },
  {
    number: 54,
    arabic: "\u0627\u0644\u0652\u0645\u064e\u062a\u0650\u064a\u0646\u064f",
    transliteration: "Al-Matin",
    meaning: "The Forceful One",
  },
  {
    number: 55,
    arabic: "\u0627\u0644\u0652\u0648\u064e\u0644\u0650\u064a\u064f\u0651",
    transliteration: "Al-Waliyy",
    meaning: "The Governor",
  },
  {
    number: 56,
    arabic: "\u0627\u0644\u0652\u062d\u064e\u0645\u0650\u064a\u062f\u064f",
    transliteration: "Al-Hamid",
    meaning: "The Praised One",
  },
  {
    number: 57,
    arabic: "\u0627\u0644\u0652\u0645\u064f\u062d\u0652\u0635\u0650\u064a",
    transliteration: "Al-Muhsi",
    meaning: "The Appraiser",
  },
  {
    number: 58,
    arabic:
      "\u0627\u0644\u0652\u0645\u064f\u0628\u0652\u062f\u0650\u0626\u064f",
    transliteration: "Al-Mubdi",
    meaning: "The Originator",
  },
  {
    number: 59,
    arabic: "\u0627\u0644\u0652\u0645\u064f\u0639\u0650\u064a\u062f\u064f",
    transliteration: "Al-Mu'id",
    meaning: "The Restorer",
  },
  {
    number: 60,
    arabic: "\u0627\u0644\u0652\u0645\u064f\u062d\u0652\u064a\u0650\u064a",
    transliteration: "Al-Muhyi",
    meaning: "The Giver of Life",
  },
  {
    number: 61,
    arabic:
      "\u0627\u064e\u0644\u0652\u0645\u064f\u0645\u0650\u064a\u062a\u064f",
    transliteration: "Al-Mumit",
    meaning: "The Taker of Life",
  },
  {
    number: 62,
    arabic: "\u0627\u0644\u0652\u062d\u064e\u064a\u064f\u0651",
    transliteration: "Al-Hayy",
    meaning: "The Ever Living One",
  },
  {
    number: 63,
    arabic:
      "\u0627\u0644\u0652\u0642\u064e\u064a\u064f\u0651\u0648\u0645\u064f",
    transliteration: "Al-Qayyum",
    meaning: "The Self-Existing One",
  },
  {
    number: 64,
    arabic: "\u0627\u0644\u0652\u0648\u064e\u0627\u062c\u0650\u062f\u064f",
    transliteration: "Al-Wajid",
    meaning: "The Finder",
  },
  {
    number: 65,
    arabic: "\u0627\u0644\u0652\u0645\u064e\u0627\u062c\u0650\u062f\u064f",
    transliteration: "Al-Majid",
    meaning: "The Glorious",
  },
  {
    number: 66,
    arabic: "\u0627\u0644\u0648\u064e\u0627\u062d\u0650\u062f\u064f",
    transliteration: "Al-Wahid",
    meaning: "The Only One",
  },
  {
    number: 67,
    arabic: "\u0627\u0644\u0623\u064e\u062d\u064e\u062f\u064f",
    transliteration: "Al-Ahad",
    meaning: "The One",
  },
  {
    number: 68,
    arabic: "\u0627\u0644\u0635\u064e\u0651\u0645\u064e\u062f\u064f",
    transliteration: "As-Samad",
    meaning: "The Satisfier of All Needs",
  },
  {
    number: 69,
    arabic: "\u0627\u0644\u0652\u0642\u064e\u0627\u062f\u0650\u0631\u064f",
    transliteration: "Al-Qadir",
    meaning: "The All Powerful",
  },
  {
    number: 70,
    arabic:
      "\u0627\u0644\u0652\u0645\u064f\u0642\u0652\u062a\u064e\u062f\u0650\u0631\u064f",
    transliteration: "Al-Muqtadir",
    meaning: "The Creator of All Power",
  },
  {
    number: 71,
    arabic:
      "\u0627\u0644\u0652\u0645\u064f\u0642\u064e\u062f\u0650\u0651\u0645\u064f",
    transliteration: "Al-Muqaddim",
    meaning: "The Expediter",
  },
  {
    number: 72,
    arabic:
      "\u0627\u0644\u0652\u0645\u064f\u0624\u064e\u062e\u0650\u0651\u0631\u064f",
    transliteration: "Al-Mu'akhkhir",
    meaning: "The Delayer",
  },
  {
    number: 73,
    arabic: "\u0627\u0644\u0623\u064e\u0648\u064e\u0651\u0644\u064f",
    transliteration: "Al-Awwal",
    meaning: "The First",
  },
  {
    number: 74,
    arabic: "\u0627\u0644\u0622\u062e\u0650\u0631\u064f",
    transliteration: "Al-Akhir",
    meaning: "The Last",
  },
  {
    number: 75,
    arabic: "\u0627\u0644\u0638\u064e\u0651\u0627\u0647\u0650\u0631\u064f",
    transliteration: "Az-Zahir",
    meaning: "The Manifest One",
  },
  {
    number: 76,
    arabic: "\u0627\u0644\u0652\u0628\u064e\u0627\u0637\u0650\u0646\u064f",
    transliteration: "Al-Batin",
    meaning: "The Hidden One",
  },
  {
    number: 77,
    arabic: "\u0627\u0644\u0652\u0648\u064e\u0627\u0644\u0650\u064a",
    transliteration: "Al-Wali",
    meaning: "The Protecting Friend",
  },
  {
    number: 78,
    arabic:
      "\u0627\u0644\u0652\u0645\u064f\u062a\u064e\u0639\u064e\u0627\u0644\u0650\u064a",
    transliteration: "Al-Muta'ali",
    meaning: "The Supreme One",
  },
  {
    number: 79,
    arabic: "\u0627\u0644\u0652\u0628\u064e\u0631\u064f\u0651",
    transliteration: "Al-Barr",
    meaning: "The Doer of Good",
  },
  {
    number: 80,
    arabic: "\u0627\u0644\u062a\u064e\u0651\u0648\u064e\u0627\u0628\u064f",
    transliteration: "At-Tawwab",
    meaning: "The Guide to Repentance",
  },
  {
    number: 81,
    arabic:
      "\u0627\u0644\u0652\u0645\u064f\u0646\u062a\u064e\u0642\u0650\u0645\u064f",
    transliteration: "Al-Muntaqim",
    meaning: "The Avenger",
  },
  {
    number: 82,
    arabic: "\u0627\u0644\u0639\u064e\u0641\u064f\u0648\u064f\u0651",
    transliteration: "Al-Afuww",
    meaning: "The Forgiver",
  },
  {
    number: 83,
    arabic: "\u0627\u0644\u0631\u064e\u0651\u0624\u064f\u0648\u0641\u064f",
    transliteration: "Ar-Ra'uf",
    meaning: "The Clement",
  },
  {
    number: 84,
    arabic:
      "\u0645\u064e\u0627\u0644\u0650\u0643\u064f \u0627\u0644\u0652\u0645\u064f\u0644\u0652\u0643\u0650",
    transliteration: "Malik-al-Mulk",
    meaning: "Owner of All",
  },
  {
    number: 85,
    arabic:
      "\u0630\u064f\u0648\u0627\u0644\u0652\u062c\u064e\u0644\u0627\u064e\u0644\u0650 \u0648\u064e\u0627\u0644\u0625\u0643\u0652\u0631\u064e\u0627\u0645\u0650",
    transliteration: "Dhul-Jalali Wal-Ikram",
    meaning: "Lord of Majesty and Bounty",
  },
  {
    number: 86,
    arabic:
      "\u0627\u0644\u0652\u0645\u064f\u0642\u0652\u0633\u0650\u0637\u064f",
    transliteration: "Al-Muqsit",
    meaning: "The Equitable One",
  },
  {
    number: 87,
    arabic: "\u0627\u0644\u0652\u062c\u064e\u0627\u0645\u0650\u0639\u064f",
    transliteration: "Al-Jami",
    meaning: "The Gatherer",
  },
  {
    number: 88,
    arabic: "\u0627\u0644\u0652\u063a\u064e\u0646\u0650\u064a\u064f\u0651",
    transliteration: "Al-Ghani",
    meaning: "The Rich One",
  },
  {
    number: 89,
    arabic: "\u0627\u0644\u0652\u0645\u064f\u063a\u0652\u0646\u0650\u064a",
    transliteration: "Al-Mughni",
    meaning: "The Enricher",
  },
  {
    number: 90,
    arabic:
      "\u0627\u064e\u0644\u0652\u0645\u064e\u0627\u0646\u0650\u0639\u064f",
    transliteration: "Al-Mani",
    meaning: "The Preventer of Harm",
  },
  {
    number: 91,
    arabic: "\u0627\u0644\u0636\u064e\u0651\u0627\u0631\u064f\u0651",
    transliteration: "Ad-Darr",
    meaning: "The Creator of The Harmful",
  },
  {
    number: 92,
    arabic: "\u0627\u0644\u0646\u064e\u0651\u0627\u0641\u0650\u0639\u064f",
    transliteration: "An-Nafi",
    meaning: "The Creator of Good",
  },
  {
    number: 93,
    arabic: "\u0627\u0644\u0646\u064f\u0651\u0648\u0631\u064f",
    transliteration: "An-Nur",
    meaning: "The Light",
  },
  {
    number: 94,
    arabic: "\u0627\u0644\u0652\u0647\u064e\u0627\u062f\u0650\u064a",
    transliteration: "Al-Hadi",
    meaning: "The Guide",
  },
  {
    number: 95,
    arabic: "\u0627\u0644\u0652\u0628\u064e\u062f\u0650\u064a\u0639\u064f",
    transliteration: "Al-Badi",
    meaning: "The Originator",
  },
  {
    number: 96,
    arabic: "\u0627\u064e\u0644\u0652\u0628\u064e\u0627\u0642\u0650\u064a",
    transliteration: "Al-Baqi",
    meaning: "The Everlasting One",
  },
  {
    number: 97,
    arabic: "\u0627\u0644\u0652\u0648\u064e\u0627\u0631\u0650\u062b\u064f",
    transliteration: "Al-Warith",
    meaning: "The Inheritor of All",
  },
  {
    number: 98,
    arabic: "\u0627\u0644\u0631\u064e\u0651\u0634\u0650\u064a\u062f\u064f",
    transliteration: "Ar-Rashid",
    meaning: "The Righteous Teacher",
  },
  {
    number: 99,
    arabic: "\u0627\u0644\u0635\u064e\u0651\u0628\u064f\u0648\u0631\u064f",
    transliteration: "As-Sabur",
    meaning: "The Patient One",
  },
];

export default function NamesOfAllahScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [search, setSearch] = useState(
    String(route.params?.initialSearch || ""),
  );
  const { getDailyNameReflectionFn } = useNurAI();
  const nameReflection = getDailyNameReflectionFn();
  const [showInsight, setShowInsight] = useState(true);
  const { isPremium, isScholar } = useSubscription();

  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiState, setAiState] = useState<AIResponseState>("loading");
  const [aiData, setAiData] = useState<AIResponseData | null>(null);
  const [aiError, setAiError] = useState<string | undefined>();
  const [selectedName, setSelectedName] = useState<Name | null>(null);

  const handleAIInsight = useCallback(
    async (name: Name, question?: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedName(name);
      setAiModalVisible(true);

      if (!isPremium) {
        setAiState("upgrade");
        return;
      }

      setAiState("loading");
      setAiData(null);
      setAiError(undefined);

      try {
        const result = await getNameOfAllahInsight({
          name: name.transliteration,
          arabicName: name.arabic,
          meaning: name.meaning,
          index: name.number,
          question,
          userTier: isScholar ? "scholar" : "premium",
        });
        setAiData(mapAIContextResponseToModalData(result));
        setAiState("success");
      } catch (err: any) {
        if (err instanceof AIContextError) {
          if (err.code === "UPGRADE_REQUIRED") {
            setAiState("upgrade");
          } else if (err.code === "RATE_LIMIT") {
            setAiState("rateLimit");
          } else {
            setAiError(customerSafeAIErrorMessage(err.message));
            setAiState("error");
          }
        } else {
          setAiError("Something went wrong. Please try again.");
          setAiState("error");
        }
      }
    },
    [isPremium, isScholar],
  );

  const handleRetry = useCallback(() => {
    if (selectedName) {
      handleAIInsight(selectedName);
    }
  }, [selectedName, handleAIInsight]);

  const handleAiFollowUp = useCallback(
    (prompt: string) => {
      if (!selectedName) return;
      handleAIInsight(selectedName, prompt);
    },
    [selectedName, handleAIInsight],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return NAMES;
    const q = search.toLowerCase();
    return NAMES.filter(
      (n) =>
        n.transliteration.toLowerCase().includes(q) ||
        n.meaning.toLowerCase().includes(q) ||
        n.arabic.includes(search) ||
        n.number.toString() === q,
    );
  }, [search]);

  const gradientColors: [string, string] = [
    theme.gradientStart,
    theme.gradientEnd,
  ];

  const searchShadow = !isDark
    ? {
        shadowColor: theme.modalBackdrop,
        shadowOffset: { width: 0, height: Spacing.xs },
        shadowOpacity: 0.12,
        shadowRadius: Spacing.xs,
        elevation: 2,
      }
    : {};

  const renderName = ({ item, index }: { item: Name; index: number }) => (
    <AnimatedPressable
      entering={FadeInDown.delay(Math.min(index * 20, 300)).duration(300)}
      style={({ pressed }) => [
        styles.nameCard,
        {
          backgroundColor: theme.surfaceGlass,
          borderColor: theme.borderSubtle,
        },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.85 },
      ]}
      testID={`card-name-${item.number}`}
    >
      <GeometricCardPattern color={theme.scholar} opacity={0.012} />
      <ThemedText style={styles.arabicName}>{item.arabic}</ThemedText>
      <GoldDivider
        color={theme.scholar}
        opacity={0.36}
        style={styles.nameGoldDivider}
      />

      <ThemedText style={[styles.transliteration, { color: theme.text }]}>
        {item.transliteration}
      </ThemedText>

      <View style={styles.bottomRow}>
        <View style={styles.diamondBadge}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.diamondGradient}
          >
            <ThemedText
              style={[styles.numberText, { color: theme.primaryForeground }]}
            >
              {item.number}
            </ThemedText>
          </LinearGradient>
        </View>
        <ThemedText
          type="small"
          style={[styles.meaningText, { color: theme.textSecondary }]}
        >
          {item.meaning}
        </ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.aiInsightButton,
            { backgroundColor: theme.primaryMuted },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => handleAIInsight(item)}
          hitSlop={8}
          testID={`button-ai-name-${item.number}`}
        >
          <AppIcon name="zap" size={14} color={theme.primary} />
        </Pressable>
      </View>
    </AnimatedPressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <CrescentMark
            size={30}
            color={theme.scholar}
            accentColor={theme.primary}
          />
          <ThemedText type="h4" accessibilityRole="header">
            99 Names of Allah
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Al-Asma ul-Husna
          </ThemedText>
          <View
            style={[styles.decorativeLine, { backgroundColor: theme.primary }]}
          />
        </View>
        <View style={styles.headerButton} />
      </View>

      <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm }}>
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
              searchShadow,
            ]}
          >
            <AppIcon name="search" size={18} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search names"
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
              testID="input-search-names"
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch("")}>
                <AppIcon name="x" size={18} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <ThemedText
            type="caption"
            style={[styles.counter, { color: theme.textSecondary }]}
          >
            {filtered.length} of 99
          </ThemedText>
        </View>
      </View>

      {showInsight ? (
        <Animated.View
          entering={FadeInDown.delay(100).duration(300)}
          style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm }}
        >
          <LinearGradient
            colors={
              isDark
                ? [theme.gradientStart, theme.gradientMid]
                : [theme.gradientLightBg, theme.gradientLightBg2]
            }
            style={styles.nuraiCard}
          >
            <GeometricCardPattern color={theme.primaryText} opacity={0.012} />
            <View style={styles.nuraiHeader}>
              <View style={styles.nuraiHeaderLeft}>
                <View
                  style={[
                    styles.nuraiDot,
                    { backgroundColor: theme.primaryText },
                  ]}
                />
                <ThemedText
                  style={[styles.nuraiLabel, { color: theme.primaryText }]}
                >
                  NurAI Reflection
                </ThemedText>
              </View>
              <Pressable onPress={() => setShowInsight(false)} hitSlop={8}>
                <AppIcon name="x" size={14} color={theme.primaryText} />
              </Pressable>
            </View>
            <View style={styles.nuraiBody}>
              <AppIcon
                name={nameReflection.icon as AppIconName}
                size={18}
                color={theme.primaryText}
              />
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[styles.nuraiTitle, { color: theme.primaryText }]}
                >
                  {nameReflection.title}:{" "}
                  {NAMES[nameReflection.nameIndex]?.transliteration || ""}
                </ThemedText>
                <ThemedText
                  style={[styles.nuraiText, { color: theme.primaryText }]}
                >
                  {nameReflection.body}
                </ThemedText>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.number.toString()}
        renderItem={renderName}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      />

      <AIResponseModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        state={aiState}
        data={aiData}
        onRetry={handleRetry}
        onFollowUp={handleAiFollowUp}
        errorMessage={aiError}
        featureLabel={
          selectedName
            ? `${selectedName.transliteration} — ${selectedName.meaning}`
            : "Name of Allah Insight"
        }
        requiredTier="premium"
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
    gap: Spacing.xs,
  },
  decorativeLine: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginTop: Spacing.xs,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    height: Spacing.inputHeight,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 16 },
  counter: {
    fontWeight: "600",
  },
  listContent: { paddingHorizontal: Spacing.lg },
  nameCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    alignItems: "center",
    gap: Spacing.sm,
  },
  arabicName: {
    fontSize: 30,
    lineHeight: 42,
    fontWeight: "600",
    textAlign: "center",
  },
  nameGoldDivider: {
    width: 154,
    marginTop: -Spacing.xs,
    marginBottom: -Spacing.xs,
  },
  transliteration: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: Spacing.xs,
    gap: Spacing.md,
  },
  diamondBadge: {
    width: 46,
    height: 46,
    transform: [{ rotate: "45deg" }],
    borderRadius: 8,
    overflow: "hidden",
  },
  diamondGradient: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontSize: 14,
    fontWeight: "700",
    transform: [{ rotate: "-45deg" }],
  },
  meaningText: {
    flex: 1,
    fontSize: 14,
    textAlign: "right",
  },
  aiInsightButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nuraiCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  nuraiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  nuraiHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  nuraiDot: {
    width: Spacing.xs,
    height: Spacing.xs,
    borderRadius: Spacing.xs / 2,
  },
  nuraiLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  nuraiBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  nuraiTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  nuraiText: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.9,
  },
});
