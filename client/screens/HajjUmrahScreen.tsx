import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  TextInput,
  Share,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useNurAI } from "@/context/NurAIContext";
import { Spacing, BorderRadius, CategoryColors } from "@/constants/theme";
import {
  OFFICIAL_SERVICE_LINKS,
  OfficialServiceCategory,
} from "@/data/officialServiceLinks";
import {
  PILGRIM_EMERGENCY_CONTACTS,
  PILGRIM_HEALTH_READINESS_CHECKLIST,
  PILGRIM_HEALTH_SAFETY_LAST_REVIEWED,
  PILGRIM_HEALTH_SAFETY_TOPICS,
  PilgrimSafetyPhase,
  PilgrimSafetyRiskLevel,
} from "@/data/pilgrimHealthSafety";
import {
  clearPilgrimCard,
  EMPTY_PILGRIM_CARD,
  formatPilgrimCardForShare,
  hasPilgrimCardDetails,
  loadPilgrimCard,
  savePilgrimCard,
  type PilgrimCard,
} from "@/services/pilgrimCardService";
import { syncedSetItem } from "@/lib/progress-sync";
import {
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

const COLOR_KEYS = [
  "emerald",
  "blue",
  "amber",
  "purple",
  "teal",
  "rose",
  "indigo",
  "green",
  "orange",
  "violet",
  "pink",
] as const;

interface Step {
  id: number;
  titleArabic: string;
  titleEnglish: string;
  description: string;
  duaArabic: string;
  duaTransliteration: string;
  duaEnglish: string;
  tips: string;
}

type PilgrimCardField = Exclude<keyof PilgrimCard, "updatedAt">;

const PILGRIM_CARD_DISPLAY_FIELDS: {
  field: PilgrimCardField;
  label: string;
  phone?: boolean;
}[] = [
  { field: "hotelName", label: "Hotel" },
  { field: "hotelAddress", label: "Address" },
  { field: "groupLeaderName", label: "Group leader" },
  { field: "groupLeaderPhone", label: "Group phone", phone: true },
  { field: "emergencyContactName", label: "Emergency contact" },
  { field: "emergencyContactPhone", label: "Emergency phone", phone: true },
  { field: "meetingPoint", label: "Meeting point" },
  { field: "medicalNotes", label: "Medication or access notes" },
];

const HAJJ_STEPS: Step[] = [
  {
    id: 1,
    titleArabic: "\u0627\u0644\u0625\u062D\u0631\u0627\u0645",
    titleEnglish: "Ihram - Entering the Sacred State",
    description:
      "Enter the state of Ihram at the designated Miqat. Men wear two white unstitched cloths; women wear modest clothing. Make the intention (niyyah) for Hajj and begin reciting the Talbiyah.",
    duaArabic:
      "\u0644\u0628\u064E\u0651\u064A\u0643\u064E \u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u064E\u0651 \u0644\u0628\u064E\u0651\u064A\u0643\u064E\u060C \u0644\u0628\u064E\u0651\u064A\u0643\u064E \u0644\u0627 \u0634\u064E\u0631\u064A\u0643\u064E \u0644\u064E\u0643\u064E \u0644\u0628\u064E\u0651\u064A\u0643\u064E\u060C \u0625\u0646\u064E\u0651 \u0627\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064E \u0648\u0627\u0644\u0646\u0651\u0650\u0639\u0652\u0645\u064E\u0629\u064E \u0644\u064E\u0643\u064E \u0648\u0627\u0644\u0652\u0645\u064F\u0644\u0652\u0643\u064E\u060C \u0644\u0627 \u0634\u064E\u0631\u064A\u0643\u064E \u0644\u064E\u0643\u064E",
    duaTransliteration:
      "Labbayk Allahumma labbayk, labbayka la sharika laka labbayk, innal-hamda wan-ni'mata laka wal-mulk, la sharika lak",
    duaEnglish:
      "Here I am, O Allah, here I am. Here I am, You have no partner, here I am. Verily all praise, grace, and sovereignty belong to You. You have no partner.",
    tips: "Avoid wearing perfume, cutting nails or hair, and covering the head (for men) while in Ihram. Perform two rakaat of Ihram prayer before making your intention.",
  },
  {
    id: 2,
    titleArabic: "\u0627\u0644\u0637\u0648\u0627\u0641",
    titleEnglish: "Tawaf - Circling the Kaaba",
    description:
      "Perform Tawaf by circling the Kaaba seven times in a counter-clockwise direction, starting from the Black Stone (Hajar al-Aswad). Men should perform Raml (brisk walking) in the first three circuits.",
    duaArabic:
      "\u0631\u064E\u0628\u064E\u0651\u0646\u064E\u0627 \u0622\u062A\u0650\u0646\u064E\u0627 \u0641\u0650\u064A \u0627\u0644\u062F\u064F\u0651\u0646\u0652\u064A\u064E\u0627 \u062D\u064E\u0633\u064E\u0646\u064E\u0629\u064B \u0648\u064E\u0641\u0650\u064A \u0627\u0644\u0622\u062E\u0650\u0631\u064E\u0629\u0650 \u062D\u064E\u0633\u064E\u0646\u064E\u0629\u064B \u0648\u064E\u0642\u0650\u0646\u064E\u0627 \u0639\u064E\u0630\u064E\u0627\u0628\u064E \u0627\u0644\u0646\u064E\u0651\u0627\u0631\u0650",
    duaTransliteration:
      "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhab an-nar",
    duaEnglish:
      "Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",
    tips: "Recite this dua between the Yemeni corner and the Black Stone. You may make any personal dua during the remaining circuits. After Tawaf, pray two rakaat behind Maqam Ibrahim.",
  },
  {
    id: 3,
    titleArabic: "\u0627\u0644\u0633\u0639\u064A",
    titleEnglish: "Sa'i - Walking Between Safa and Marwa",
    description:
      "Walk between the hills of Safa and Marwa seven times, starting from Safa and ending at Marwa. This commemorates Hajar's search for water for her son Ismail.",
    duaArabic:
      "\u0625\u0650\u0646\u064E\u0651 \u0627\u0644\u0635\u064E\u0651\u0641\u064E\u0627 \u0648\u064E\u0627\u0644\u0652\u0645\u064E\u0631\u0652\u0648\u064E\u0629\u064E \u0645\u0650\u0646 \u0634\u064E\u0639\u064E\u0627\u0626\u0650\u0631\u0650 \u0627\u0644\u0644\u064E\u0651\u0647\u0650",
    duaTransliteration: "Innas-Safa wal-Marwata min sha'a'irillah",
    duaEnglish: "Indeed, Safa and Marwa are among the symbols of Allah.",
    tips: "Men should jog between the green markers. Begin each lap at Safa by facing the Kaaba and making dua. Drink Zamzam water after completing Sa'i.",
  },
  {
    id: 4,
    titleArabic: "\u0645\u0650\u0646\u064E\u0649",
    titleEnglish: "Mina - Day of Tarwiyah (8th Dhul Hijjah)",
    description:
      "On the 8th of Dhul Hijjah, proceed to Mina. Spend the day and night in Mina, performing all five daily prayers shortened (Dhuhr, Asr, and Isha as 2 rakaat each).",
    duaArabic:
      "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u064E\u0651 \u0625\u0650\u0646\u0651\u064A \u0623\u064E\u0633\u0652\u0623\u064E\u0644\u064F\u0643\u064E \u0627\u0644\u0652\u0647\u064F\u062F\u064E\u0649 \u0648\u064E\u0627\u0644\u062A\u064F\u0651\u0642\u064E\u0649 \u0648\u064E\u0627\u0644\u0652\u0639\u064E\u0641\u064E\u0627\u0641\u064E \u0648\u064E\u0627\u0644\u0652\u063A\u0650\u0646\u064E\u0649",
    duaTransliteration:
      "Allahumma inni as'alukal-huda wat-tuqa wal-'afafa wal-ghina",
    duaEnglish:
      "O Allah, I ask You for guidance, piety, chastity, and self-sufficiency.",
    tips: "Use this time to prepare spiritually for Arafat. Review your duas, make istighfar, and rest well for the important day ahead.",
  },
  {
    id: 5,
    titleArabic: "\u0639\u064E\u0631\u064E\u0641\u064E\u0629",
    titleEnglish: "Arafat - Standing at Arafat (9th Dhul Hijjah)",
    description:
      "The most important pillar of Hajj. Stand at the plain of Arafat from noon until sunset on the 9th of Dhul Hijjah. Spend the entire time in dua, dhikr, and supplication. The Prophet said: 'Hajj is Arafat.'",
    duaArabic:
      "\u0644\u0627 \u0625\u0650\u0644\u064E\u0647\u064E \u0625\u0650\u0644\u0651\u064E\u0627 \u0627\u0644\u0644\u064E\u0651\u0647\u064F \u0648\u064E\u062D\u0652\u062F\u064E\u0647\u064F \u0644\u0627 \u0634\u064E\u0631\u064A\u0643\u064E \u0644\u064E\u0647\u064F\u060C \u0644\u064E\u0647\u064F \u0627\u0644\u0652\u0645\u064F\u0644\u0652\u0643\u064F \u0648\u064E\u0644\u064E\u0647\u064F \u0627\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064F \u0648\u064E\u0647\u064F\u0648\u064E \u0639\u064E\u0644\u064E\u0649 \u0643\u064F\u0644\u064E\u0651 \u0634\u064E\u064A\u0652\u0621\u064D \u0642\u064E\u062F\u064A\u0631\u064C",
    duaTransliteration:
      "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shay'in qadir",
    duaEnglish:
      "There is no god but Allah alone, with no partner. To Him belongs the dominion and all praise, and He is over all things capable.",
    tips: "This is the best day for dua. The Prophet said the best dua is the dua of Arafat. Face the Qiblah, raise your hands, and pour your heart out to Allah. Combine Dhuhr and Asr prayers shortened.",
  },
  {
    id: 6,
    titleArabic:
      "\u0645\u064F\u0632\u0652\u062F\u064E\u0644\u0650\u0641\u064E\u0629",
    titleEnglish: "Muzdalifah - Night Under the Stars",
    description:
      "After sunset at Arafat, proceed to Muzdalifah. Pray Maghrib and Isha combined. Spend the night under the open sky. Collect 49-70 pebbles for the stoning ritual.",
    duaArabic:
      "\u0631\u064E\u0628\u064E\u0651\u0646\u064E\u0627 \u0627\u063A\u0652\u0641\u0650\u0631\u0652 \u0644\u064E\u0646\u064E\u0627 \u0630\u064F\u0646\u064F\u0648\u0628\u064E\u0646\u064E\u0627 \u0648\u064E\u0625\u0650\u0633\u0652\u0631\u064E\u0627\u0641\u064E\u0646\u064E\u0627 \u0641\u0650\u064A \u0623\u064E\u0645\u0652\u0631\u0650\u0646\u064E\u0627 \u0648\u064E\u062B\u064E\u0628\u064E\u0651\u062A\u0652 \u0623\u064E\u0642\u0652\u062F\u064E\u0627\u0645\u064E\u0646\u064E\u0627 \u0648\u064E\u0627\u0646\u0635\u064F\u0631\u0652\u0646\u064E\u0627 \u0639\u064E\u0644\u064E\u0649 \u0627\u0644\u0652\u0642\u064E\u0648\u0652\u0645\u0650 \u0627\u0644\u0652\u0643\u064E\u0627\u0641\u0650\u0631\u064A\u0646\u064E",
    duaTransliteration:
      "Rabbana ighfir lana dhunubana wa israfana fi amrina wa thabbit aqdamana wansurna 'alal-qawmil-kafirin",
    duaEnglish:
      "Our Lord, forgive us our sins and our excesses in our affairs, and plant firmly our feet and give us victory over the disbelieving people.",
    tips: "Collect small pebbles (slightly larger than chickpeas) for Rami. Pray Fajr at Muzdalifah before proceeding to Mina. The elderly and weak may leave after midnight.",
  },
  {
    id: 7,
    titleArabic:
      "\u0631\u0645\u064A \u0627\u0644\u062C\u0645\u0631\u0627\u062A",
    titleEnglish: "Rami al-Jamarat - Stoning the Pillars",
    description:
      "On the 10th of Dhul Hijjah, stone Jamrat al-Aqabah (the large pillar) with 7 pebbles, saying 'Allahu Akbar' with each throw. On the 11th and 12th, stone all three pillars (small, medium, large) with 7 pebbles each.",
    duaArabic:
      "\u0627\u0644\u0644\u064E\u0651\u0647\u064F \u0623\u064E\u0643\u0652\u0628\u064E\u0631\u064F",
    duaTransliteration: "Allahu Akbar",
    duaEnglish: "Allah is the Greatest.",
    tips: "Stone after Dhuhr on the 11th and 12th. After stoning the small and medium pillars, face the Qiblah and make dua. Do not stand after stoning the large pillar. Avoid peak times for safety.",
  },
  {
    id: 8,
    titleArabic:
      "\u0627\u0644\u0623\u064F\u0636\u0652\u062D\u0650\u064A\u064E\u0651\u0629",
    titleEnglish: "Sacrifice - Animal Sacrifice (Eid al-Adha)",
    description:
      "On the 10th of Dhul Hijjah (Eid al-Adha), an animal sacrifice (Qurbani/Hady) is performed. This commemorates Prophet Ibrahim's willingness to sacrifice his son Ismail for Allah's sake.",
    duaArabic:
      "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u064E\u0651\u0647\u0650 \u0648\u064E\u0627\u0644\u0644\u064E\u0651\u0647\u064F \u0623\u064E\u0643\u0652\u0628\u064E\u0631\u064F\u060C \u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u064E\u0651 \u062A\u064E\u0642\u064E\u0628\u064E\u0651\u0644\u0652 \u0645\u0650\u0646\u0651\u064A",
    duaTransliteration: "Bismillahi wallahu akbar, Allahumma taqabbal minni",
    duaEnglish:
      "In the name of Allah, and Allah is the Greatest. O Allah, accept this from me.",
    tips: "The sacrifice can be done on the 10th, 11th, or 12th of Dhul Hijjah. Many pilgrims purchase vouchers to have the sacrifice done on their behalf. The meat is distributed to the poor.",
  },
  {
    id: 9,
    titleArabic:
      "\u0627\u0644\u062D\u0644\u0642 / \u0627\u0644\u062A\u0642\u0635\u064A\u0631",
    titleEnglish: "Halq/Taqsir - Shaving or Cutting Hair",
    description:
      "After the sacrifice, men shave their heads completely (Halq) or shorten their hair (Taqsir). Women cut a fingertip's length from their hair. This marks a partial release from the state of Ihram.",
    duaArabic:
      "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u064E\u0651 \u0627\u063A\u0652\u0641\u0650\u0631\u0652 \u0644\u0650\u064A \u0648\u064E\u0627\u0631\u0652\u062D\u064E\u0645\u0652\u0646\u0650\u064A \u0648\u064E\u0627\u0647\u0652\u062F\u0650\u0646\u0650\u064A \u0648\u064E\u0627\u0631\u0632\u064F\u0642\u0652\u0646\u0650\u064A",
    duaTransliteration: "Allahumma ighfir li warhamni wahdini warzuqni",
    duaEnglish:
      "O Allah, forgive me, have mercy on me, guide me, and provide for me.",
    tips: "Halq (complete shaving) is preferred for men as the Prophet made dua three times for those who shave and once for those who trim. After this, most Ihram restrictions are lifted except marital relations.",
  },
  {
    id: 10,
    titleArabic:
      "\u0637\u0648\u0627\u0641 \u0627\u0644\u0625\u0641\u0627\u0636\u0629",
    titleEnglish: "Tawaf al-Ifadah - Final Tawaf",
    description:
      "Perform Tawaf al-Ifadah (also called Tawaf al-Ziyarah) by circling the Kaaba seven times. This is a pillar of Hajj and must be performed. Follow it with Sa'i if you have not done so earlier.",
    duaArabic:
      "\u0631\u064E\u0628\u064E\u0651\u0646\u064E\u0627 \u062A\u064E\u0642\u064E\u0628\u064E\u0651\u0644\u0652 \u0645\u0650\u0646\u064E\u0651\u0627 \u0625\u0650\u0646\u064E\u0651\u0643\u064E \u0623\u064E\u0646\u062A\u064E \u0627\u0644\u0633\u064E\u0651\u0645\u064A\u0639\u064F \u0627\u0644\u0652\u0639\u064E\u0644\u064A\u0645\u064F",
    duaTransliteration: "Rabbana taqabbal minna innaka antas-sami'ul-'alim",
    duaEnglish:
      "Our Lord, accept from us. Indeed, You are the All-Hearing, the All-Knowing.",
    tips: "This Tawaf can be performed on the 10th, 11th, or 12th of Dhul Hijjah. After completing it, all Ihram restrictions are fully lifted. Pray two rakaat behind Maqam Ibrahim.",
  },
  {
    id: 11,
    titleArabic:
      "\u0637\u0648\u0627\u0641 \u0627\u0644\u0648\u062F\u0627\u0639",
    titleEnglish: "Farewell Tawaf - Before Leaving Makkah",
    description:
      "The final act before leaving Makkah is Tawaf al-Wada (Farewell Tawaf). Circle the Kaaba seven times as a farewell. This is obligatory for all pilgrims except menstruating women.",
    duaArabic:
      "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u064E\u0651 \u0625\u0650\u0646\u064E\u0651 \u0647\u064E\u0630\u064E\u0627 \u0628\u064E\u064A\u0652\u062A\u064F\u0643\u064E\u060C \u0648\u064E\u0623\u064E\u0646\u0627 \u0639\u064E\u0628\u0652\u062F\u064F\u0643\u064E \u0648\u064E\u0627\u0628\u0652\u0646\u064F \u0639\u064E\u0628\u0652\u062F\u064E\u064A\u0652\u0643\u064E\u060C \u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u064E\u0651 \u0644\u0627 \u062A\u064E\u062C\u0652\u0639\u064E\u0644\u0652\u0647\u064F \u0622\u062E\u0650\u0631\u064E \u0627\u0644\u0652\u0639\u064E\u0647\u0652\u062F\u0650 \u0628\u0650\u0628\u064E\u064A\u0652\u062A\u0650\u0643\u064E",
    duaTransliteration:
      "Allahumma inna hadha baytuk, wa ana 'abduka wabnu 'abdayk, Allahumma la taj'alhu akhiral-'ahdi bi-baytik",
    duaEnglish:
      "O Allah, this is Your House, and I am Your servant and the child of Your servants. O Allah, do not make this my last visit to Your House.",
    tips: "Leave the Masjid walking backwards while facing the Kaaba if possible. Make dua that Allah invites you back. The Farewell Tawaf should be the last thing you do in Makkah.",
  },
];

const UMRAH_STEPS: Step[] = [
  {
    id: 1,
    titleArabic: "\u0627\u0644\u0625\u062D\u0631\u0627\u0645",
    titleEnglish: "Ihram - Entering the Sacred State",
    description:
      "Enter the state of Ihram at the designated Miqat. Perform ghusl (ritual bath), wear Ihram garments, pray two rakaat, and make the intention for Umrah. Begin reciting the Talbiyah.",
    duaArabic:
      "\u0644\u0628\u064E\u0651\u064A\u0643\u064E \u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u064E\u0651 \u0639\u064F\u0645\u0652\u0631\u064E\u0629\u064B\u060C \u0644\u0628\u064E\u0651\u064A\u0643\u064E \u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u064E\u0651 \u0644\u0628\u064E\u0651\u064A\u0643\u064E\u060C \u0644\u0628\u064E\u0651\u064A\u0643\u064E \u0644\u0627 \u0634\u064E\u0631\u064A\u0643\u064E \u0644\u064E\u0643\u064E \u0644\u0628\u064E\u0651\u064A\u0643\u064E",
    duaTransliteration:
      "Labbayk Allahumma 'Umratan, Labbayk Allahumma labbayk, labbayka la sharika laka labbayk",
    duaEnglish:
      "Here I am, O Allah, for Umrah. Here I am, O Allah, here I am. Here I am, You have no partner, here I am.",
    tips: "Stop reciting the Talbiyah when you begin Tawaf. Ensure you are in a state of purity before entering Ihram. Apply perfume to the body (not clothes) before entering Ihram.",
  },
  {
    id: 2,
    titleArabic: "\u0627\u0644\u0637\u0648\u0627\u0641",
    titleEnglish: "Tawaf - Circling the Kaaba (7 Circuits)",
    description:
      "Circle the Kaaba seven times counter-clockwise, beginning from the Black Stone. Men uncover their right shoulder (Idtiba) and perform Raml (brisk walking) in the first three circuits.",
    duaArabic:
      "\u0631\u064E\u0628\u064E\u0651\u0646\u064E\u0627 \u0622\u062A\u0650\u0646\u064E\u0627 \u0641\u0650\u064A \u0627\u0644\u062F\u064F\u0651\u0646\u0652\u064A\u064E\u0627 \u062D\u064E\u0633\u064E\u0646\u064E\u0629\u064B \u0648\u064E\u0641\u0650\u064A \u0627\u0644\u0622\u062E\u0650\u0631\u064E\u0629\u0650 \u062D\u064E\u0633\u064E\u0646\u064E\u0629\u064B \u0648\u064E\u0642\u0650\u0646\u064E\u0627 \u0639\u064E\u0630\u064E\u0627\u0628\u064E \u0627\u0644\u0646\u064E\u0651\u0627\u0631\u0650",
    duaTransliteration:
      "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhab an-nar",
    duaEnglish:
      "Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",
    tips: "Point towards the Black Stone and say 'Bismillahi Allahu Akbar' at the start of each circuit. After Tawaf, pray two rakaat behind Maqam Ibrahim and drink Zamzam water.",
  },
  {
    id: 3,
    titleArabic: "\u0627\u0644\u0633\u0639\u064A",
    titleEnglish: "Sa'i - 7 Laps Between Safa and Marwa",
    description:
      "Walk between the hills of Safa and Marwa seven times (Safa to Marwa is one lap, Marwa to Safa is another). This commemorates Hajar's desperate search for water.",
    duaArabic:
      "\u0625\u0650\u0646\u064E\u0651 \u0627\u0644\u0635\u064E\u0651\u0641\u064E\u0627 \u0648\u064E\u0627\u0644\u0652\u0645\u064E\u0631\u0652\u0648\u064E\u0629\u064E \u0645\u0650\u0646 \u0634\u064E\u0639\u064E\u0627\u0626\u0650\u0631\u0650 \u0627\u0644\u0644\u064E\u0651\u0647\u0650",
    duaTransliteration: "Innas-Safa wal-Marwata min sha'a'irillah",
    duaEnglish: "Indeed, Safa and Marwa are among the symbols of Allah.",
    tips: "Start from Safa, face the Kaaba and make dua. Men should hasten between the green markers. You may make any personal dua while walking. End at Marwa on the 7th lap.",
  },
  {
    id: 4,
    titleArabic:
      "\u0627\u0644\u062D\u0644\u0642 / \u0627\u0644\u062A\u0642\u0635\u064A\u0631",
    titleEnglish: "Halq/Taqsir - Shaving or Cutting Hair",
    description:
      "After completing Sa'i, men shave their heads completely (Halq, preferred) or trim their hair short (Taqsir). Women cut a fingertip's length from the ends of their hair. This completes the Umrah.",
    duaArabic:
      "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u064E\u0651 \u0627\u063A\u0652\u0641\u0650\u0631\u0652 \u0644\u0650\u064A \u0648\u064E\u0627\u0631\u0652\u062D\u064E\u0645\u0652\u0646\u0650\u064A \u0648\u064E\u0627\u0647\u0652\u062F\u0650\u0646\u0650\u064A \u0648\u064E\u0627\u0631\u0632\u064F\u0642\u0652\u0646\u0650\u064A",
    duaTransliteration: "Allahumma ighfir li warhamni wahdini warzuqni",
    duaEnglish:
      "O Allah, forgive me, have mercy on me, guide me, and provide for me.",
    tips: "After Halq/Taqsir, all Ihram restrictions are lifted and the Umrah is complete. Thank Allah and make dua for acceptance. You may now change into regular clothes.",
  },
];

const PACKING_CHECKLIST = [
  { id: "ihram_clothing", label: "Ihram clothing", icon: "layers" as const },
  { id: "prayer_mat", label: "Prayer mat", icon: "grid" as const },
  { id: "quran", label: "Quran", icon: "book" as const },
  { id: "medication", label: "Medication", icon: "heart" as const },
  {
    id: "comfortable_shoes",
    label: "Comfortable shoes",
    icon: "navigation" as const,
  },
  { id: "water_bottle", label: "Water bottle", icon: "droplet" as const },
  { id: "sunscreen", label: "Sunscreen", icon: "sun" as const },
  { id: "umbrella", label: "Umbrella", icon: "umbrella" as const },
  { id: "toiletries", label: "Toiletries", icon: "briefcase" as const },
  {
    id: "travel_documents",
    label: "Travel documents",
    icon: "file-text" as const,
  },
  { id: "money_belt", label: "Money belt", icon: "shield" as const },
  {
    id: "pebble_bag",
    label: "Small bag for pebbles",
    icon: "package" as const,
  },
  {
    id: "sleeping_bag",
    label: "Sleeping bag (for Muzdalifah)",
    icon: "moon" as const,
  },
];

const STORAGE_KEY_CHECKLIST = "@hajj_umrah_checklist";
const STORAGE_KEY_HEALTH_READINESS = "@hajj_umrah_health_readiness";

const OFFICIAL_SERVICE_PRIORITY = [
  "nusuk-official-platform",
  "nusuk-card-ministry",
  "nusuk-umrah-platform",
  "hajj-1447-registration-nusuk",
  "saudi-moh-pilgrim-health",
  "nusuk-umrah-health-guidelines",
  "travel-state-hajj-umrah",
  "haramain-high-speed-railway",
];

const OFFICIAL_SERVICE_ICONS: Record<OfficialServiceCategory, AppIconName> = {
  "official-platform": "shield",
  "visa-booking": "external-link",
  "permit-visit": "check-circle",
  identity: "credit-card",
  health: "heart",
  safety: "alert-triangle",
  transport: "navigation",
  guidance: "book-open",
};

const SAFETY_RISK_STYLES: Record<
  PilgrimSafetyRiskLevel,
  {
    label: string;
    icon: AppIconName;
    color: string;
    bg: string;
  }
> = {
  prepare: {
    label: "Prepare",
    icon: "check-circle",
    color: "#56B394",
    bg: "rgba(86, 179, 148, 0.14)",
  },
  watch: {
    label: "Watch",
    icon: "eye",
    color: "#F5C76B",
    bg: "rgba(245, 199, 107, 0.16)",
  },
  urgent: {
    label: "Urgent",
    icon: "alert-triangle",
    color: "#F87171",
    bg: "rgba(248, 113, 113, 0.14)",
  },
};

const READINESS_PHASE_STYLES: Record<
  PilgrimSafetyPhase,
  {
    label: string;
    icon: AppIconName;
  }
> = {
  "before-travel": {
    label: "Before travel",
    icon: "calendar",
  },
  "in-journey": {
    label: "In journey",
    icon: "navigation",
  },
  "urgent-help": {
    label: "Urgent help",
    icon: "alert-triangle",
  },
};

export default function HajjUmrahScreen() {
  const { theme, isDark } = useTheme();
  const { getHajjStepInsightFn } = useNurAI();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<"hajj" | "umrah">("hajj");
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [checkedHealthReadiness, setCheckedHealthReadiness] = useState<
    Record<string, boolean>
  >({});
  const [pilgrimCard, setPilgrimCard] = useState<PilgrimCard>({
    ...EMPTY_PILGRIM_CARD,
  });
  const [pilgrimCardStatus, setPilgrimCardStatus] = useState<
    "idle" | "saved" | "cleared"
  >("idle");
  const [showPilgrimCardLarge, setShowPilgrimCardLarge] = useState(false);
  const officialServices = useMemo(
    () =>
      OFFICIAL_SERVICE_PRIORITY.map((id) =>
        OFFICIAL_SERVICE_LINKS.find((link) => link.id === id),
      ).filter(Boolean) as typeof OFFICIAL_SERVICE_LINKS,
    [],
  );
  const officialServiceById = useMemo(
    () => new Map(OFFICIAL_SERVICE_LINKS.map((link) => [link.id, link])),
    [],
  );

  const loadChecklist = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_CHECKLIST);
      if (stored) {
        setCheckedItems(JSON.parse(stored));
      }
    } catch {}
  };

  const loadHealthReadinessChecklist = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_HEALTH_READINESS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          setCheckedHealthReadiness(parsed);
        }
      }
    } catch {}
  };

  const loadPilgrimCardDetails = useCallback(async () => {
    try {
      setPilgrimCard(await loadPilgrimCard());
    } catch {
      setPilgrimCard({ ...EMPTY_PILGRIM_CARD });
    }
  }, []);

  useEffect(() => {
    loadChecklist();
    loadHealthReadinessChecklist();
    loadPilgrimCardDetails();
  }, [loadPilgrimCardDetails]);

  const toggleCheckItem = useCallback(async (id: string) => {
    setCheckedItems((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      syncedSetItem(STORAGE_KEY_CHECKLIST, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleHealthReadinessItem = useCallback(async (id: string) => {
    setCheckedHealthReadiness((prev) => {
      const updated = { ...prev };
      if (updated[id]) {
        delete updated[id];
      } else {
        updated[id] = true;
      }
      AsyncStorage.setItem(
        STORAGE_KEY_HEALTH_READINESS,
        JSON.stringify(updated),
      ).catch(() => undefined);
      return updated;
    });
  }, []);

  const toggleStep = useCallback((id: number) => {
    setExpandedStep((prev) => (prev === id ? null : id));
  }, []);

  const openOfficialService = useCallback((url: string) => {
    Linking.openURL(url).catch(() => undefined);
  }, []);

  const updatePilgrimCardField = useCallback(
    (field: PilgrimCardField, value: string) => {
      setPilgrimCardStatus("idle");
      setPilgrimCard((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const savePilgrimCardDetails = useCallback(async () => {
    try {
      const saved = await savePilgrimCard(pilgrimCard);
      setPilgrimCard(saved);
      setPilgrimCardStatus(hasPilgrimCardDetails(saved) ? "saved" : "cleared");
    } catch {
      setPilgrimCardStatus("idle");
    }
  }, [pilgrimCard]);

  const clearPilgrimCardDetails = useCallback(async () => {
    try {
      setPilgrimCard(await clearPilgrimCard());
      setPilgrimCardStatus("cleared");
    } catch {
      setPilgrimCard({ ...EMPTY_PILGRIM_CARD });
    }
  }, []);

  const sharePilgrimCardDetails = useCallback(async () => {
    const message = formatPilgrimCardForShare(pilgrimCard);
    if (!message) return;
    try {
      await Share.share({
        title: "NurAI offline pilgrim card",
        message,
      });
    } catch {
      setPilgrimCardStatus("idle");
    }
  }, [pilgrimCard]);

  const callEmergencyContact = useCallback((value: string) => {
    const firstNumber = value.split(/[\/\s]+/).find(Boolean);
    if (!firstNumber) return;
    Linking.openURL(`tel:${firstNumber.replace(/[^\d+]/g, "")}`).catch(
      () => undefined,
    );
  }, []);

  const steps = activeTab === "hajj" ? HAJJ_STEPS : UMRAH_STEPS;
  const hasSavedPilgrimCard = hasPilgrimCardDetails(pilgrimCard);
  const healthReadinessCompleted = useMemo(
    () =>
      PILGRIM_HEALTH_READINESS_CHECKLIST.filter(
        (item) => checkedHealthReadiness[item.id],
      ).length,
    [checkedHealthReadiness],
  );
  const healthReadinessProgress = Math.round(
    (healthReadinessCompleted / PILGRIM_HEALTH_READINESS_CHECKLIST.length) *
      100,
  );
  const pilgrimCardDisplayRows = useMemo(
    () =>
      PILGRIM_CARD_DISPLAY_FIELDS.map((item) => ({
        ...item,
        value: pilgrimCard[item.field].trim(),
      })).filter((item) => item.value.length > 0),
    [pilgrimCard],
  );

  const getStepColor = (index: number) => {
    const key = COLOR_KEYS[index % COLOR_KEYS.length];
    return isDark ? CategoryColors[key].dark : CategoryColors[key];
  };

  const renderPilgrimCardField = (
    field: PilgrimCardField,
    label: string,
    options: {
      multiline?: boolean;
      keyboardType?: "default" | "phone-pad";
    } = {},
  ) => (
    <View style={styles.pilgrimField} key={field}>
      <ThemedText
        style={[styles.pilgrimFieldLabel, { color: theme.textMuted }]}
      >
        {label}
      </ThemedText>
      <TextInput
        value={pilgrimCard[field]}
        onChangeText={(value) => updatePilgrimCardField(field, value)}
        keyboardType={options.keyboardType || "default"}
        multiline={options.multiline}
        textAlignVertical={options.multiline ? "top" : "center"}
        style={[
          styles.pilgrimInput,
          options.multiline ? styles.pilgrimInputMultiline : null,
          {
            color: theme.text,
            borderColor: theme.borderSubtle,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.03)",
          },
        ]}
        placeholderTextColor={theme.textMuted}
        accessibilityLabel={label}
        testID={`pilgrim-card-${field}`}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color="#CFAE69" opacity={0.006} />
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
      >
        <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? { opacity: 0.6 } : null,
            ]}
            testID="hajj-umrah-back"
          >
            <AppIcon name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Hajj & Umrah Guide</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabRow}>
          <Pressable
            onPress={() => {
              setActiveTab("hajj");
              setExpandedStep(null);
            }}
            style={[
              styles.tabButton,
              activeTab === "hajj" ? styles.tabButtonActive : null,
            ]}
            testID="tab-hajj"
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === "hajj"
                  ? [styles.tabTextActive, { color: theme.primary }]
                  : null,
              ]}
            >
              Hajj
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              setActiveTab("umrah");
              setExpandedStep(null);
            }}
            style={[
              styles.tabButton,
              activeTab === "umrah" ? styles.tabButtonActive : null,
            ]}
            testID="tab-umrah"
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === "umrah"
                  ? [styles.tabTextActive, { color: theme.primary }]
                  : null,
              ]}
            >
              Umrah
            </ThemedText>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(280)}
          style={[
            styles.journeyHeroCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: "rgba(214, 168, 79, 0.28)",
            },
          ]}
        >
          <GeometricCardPattern color="#CFAE69" opacity={0.012} />
          <View
            style={[
              styles.journeyHeroIcon,
              { backgroundColor: isDark ? "rgba(214,168,79,0.14)" : "#FEF3C7" },
            ]}
          >
            <AppIcon name="navigation" size={22} color="#CFAE69" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText type="h3">
              {activeTab === "hajj"
                ? "Hajj journey mode"
                : "Umrah journey mode"}
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: 2 }}
              numberOfLines={2}
            >
              Step-by-step preparation with official links, safety checks, and
              an offline pilgrim card.
            </ThemedText>
          </View>
          <View
            style={[
              styles.journeyHeroBadge,
              { borderColor: "rgba(214,168,79,0.35)" },
            ]}
          >
            <ThemedText
              type="caption"
              style={{ color: "#CFAE69", fontWeight: "800" }}
            >
              {activeTab === "hajj" ? HAJJ_STEPS.length : UMRAH_STEPS.length}{" "}
              steps
            </ThemedText>
          </View>
        </Animated.View>

        <ThemedText
          type="h3"
          style={[styles.sectionTitle, { color: theme.text }]}
        >
          {activeTab === "hajj" ? "Steps of Hajj" : "Steps of Umrah"}
        </ThemedText>
        <ThemedText
          style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
        >
          {activeTab === "hajj"
            ? "Complete guide to performing Hajj with 11 essential steps"
            : "Complete guide to performing Umrah with 4 essential steps"}
        </ThemedText>

        <View
          style={[
            styles.officialPanel,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <GeometricCardPattern color="#CFAE69" opacity={0.012} />
          <View style={styles.officialHeader}>
            <View
              style={[
                styles.officialIconWrap,
                { backgroundColor: isDark ? "#143426" : "#DCFCE7" },
              ]}
            >
              <AppIcon name="shield" size={18} color={theme.primary} />
            </View>
            <View style={styles.officialHeaderText}>
              <ThemedText style={[styles.officialTitle, { color: theme.text }]}>
                Official routes first
              </ThemedText>
              <ThemedText
                style={[
                  styles.officialSubtitle,
                  { color: theme.textSecondary },
                ]}
              >
                Use NurAI to prepare, then complete permits, bookings, travel
                rules, and health checks with the live official source.
              </ThemedText>
            </View>
          </View>

          {officialServices.map((service) => (
            <Pressable
              key={service.id}
              onPress={() => openOfficialService(service.url)}
              style={({ pressed }) => [
                styles.officialLink,
                { borderColor: theme.borderSubtle },
                pressed ? { opacity: 0.78 } : null,
              ]}
              accessibilityRole="link"
              accessibilityLabel={`Open ${service.title}`}
              testID={`official-service-${service.id}`}
            >
              <View style={styles.officialLinkIcon}>
                <AppIcon
                  name={OFFICIAL_SERVICE_ICONS[service.category]}
                  size={17}
                  color={theme.primary}
                />
              </View>
              <View style={styles.officialLinkBody}>
                <ThemedText
                  style={[styles.officialLinkTitle, { color: theme.text }]}
                >
                  {service.title}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.officialLinkMeta,
                    { color: theme.textSecondary },
                  ]}
                >
                  {service.authority} · checked {service.lastChecked}
                </ThemedText>
                <ThemedText
                  numberOfLines={2}
                  style={[styles.officialLinkCopy, { color: theme.textMuted }]}
                >
                  {service.useFor}
                </ThemedText>
              </View>
              <AppIcon
                name="external-link"
                size={16}
                color={theme.textSecondary}
              />
            </Pressable>
          ))}
        </View>

        <View
          style={[
            styles.safetyPanel,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <GeometricCardPattern color="#56B394" opacity={0.012} />
          <View style={styles.officialHeader}>
            <View
              style={[
                styles.officialIconWrap,
                { backgroundColor: isDark ? "#302414" : "#FEF3C7" },
              ]}
            >
              <AppIcon name="heart" size={18} color="#CFAE69" />
            </View>
            <View style={styles.officialHeaderText}>
              <ThemedText style={[styles.officialTitle, { color: theme.text }]}>
                Pilgrim safety mode
              </ThemedText>
              <ThemedText
                style={[
                  styles.officialSubtitle,
                  { color: theme.textSecondary },
                ]}
              >
                Source-linked preparation for health, emergency contacts, and
                low-connectivity moments. Reviewed{" "}
                {PILGRIM_HEALTH_SAFETY_LAST_REVIEWED}.
              </ThemedText>
            </View>
          </View>

          <View style={styles.emergencyGrid}>
            {PILGRIM_EMERGENCY_CONTACTS.map((contact) => (
              <Pressable
                key={contact.id}
                onPress={() => callEmergencyContact(contact.value)}
                style={({ pressed }) => [
                  styles.emergencyCard,
                  {
                    backgroundColor: isDark
                      ? "rgba(248, 113, 113, 0.08)"
                      : "rgba(248, 113, 113, 0.1)",
                    borderColor: isDark
                      ? "rgba(248, 113, 113, 0.25)"
                      : "rgba(185, 28, 28, 0.2)",
                  },
                  pressed ? { opacity: 0.76 } : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Call ${contact.label} ${contact.value}`}
                testID={`pilgrim-emergency-${contact.id}`}
              >
                <ThemedText
                  style={[styles.emergencyValue, { color: "#F87171" }]}
                >
                  {contact.value}
                </ThemedText>
                <ThemedText
                  style={[styles.emergencyLabel, { color: theme.text }]}
                >
                  {contact.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View
            style={[
              styles.pilgrimCardBox,
              {
                backgroundColor: isDark
                  ? "rgba(86, 179, 148, 0.07)"
                  : "rgba(86, 179, 148, 0.08)",
                borderColor: isDark
                  ? "rgba(86, 179, 148, 0.2)"
                  : "rgba(5, 150, 105, 0.18)",
              },
            ]}
            testID="pilgrim-card-panel"
          >
            <GeometricCardPattern color="#CFAE69" opacity={0.012} />
            <View style={styles.pilgrimCardHeader}>
              <View
                style={[
                  styles.pilgrimCardIcon,
                  { backgroundColor: isDark ? "#123126" : "#D1FAE5" },
                ]}
              >
                <AppIcon name="credit-card" size={17} color={theme.primary} />
              </View>
              <View style={styles.officialHeaderText}>
                <ThemedText
                  style={[styles.pilgrimCardTitle, { color: theme.text }]}
                >
                  Offline pilgrim card
                </ThemedText>
                <ThemedText
                  style={[
                    styles.pilgrimCardSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Stored on this device for low-connectivity moments. Keep
                  official documents and emergency services primary.
                </ThemedText>
              </View>
            </View>

            <View style={styles.pilgrimFieldGrid}>
              {renderPilgrimCardField("hotelName", "Hotel or apartment name")}
              {renderPilgrimCardField("hotelAddress", "Hotel address", {
                multiline: true,
              })}
              {renderPilgrimCardField("groupLeaderName", "Group leader")}
              {renderPilgrimCardField("groupLeaderPhone", "Group phone", {
                keyboardType: "phone-pad",
              })}
              {renderPilgrimCardField(
                "emergencyContactName",
                "Emergency contact",
              )}
              {renderPilgrimCardField(
                "emergencyContactPhone",
                "Emergency phone",
                { keyboardType: "phone-pad" },
              )}
              {renderPilgrimCardField("meetingPoint", "Meeting point", {
                multiline: true,
              })}
              {renderPilgrimCardField(
                "medicalNotes",
                "Medication or access notes",
                { multiline: true },
              )}
            </View>

            <View style={styles.pilgrimCardActions}>
              <Pressable
                onPress={savePilgrimCardDetails}
                style={({ pressed }) => [
                  styles.pilgrimSaveButton,
                  { backgroundColor: theme.primary },
                  pressed ? { opacity: 0.82 } : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save offline pilgrim card"
                testID="pilgrim-card-save"
              >
                <AppIcon name="save" size={15} color="#04120D" />
                <ThemedText style={styles.pilgrimSaveButtonText}>
                  Save card
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={clearPilgrimCardDetails}
                disabled={!hasSavedPilgrimCard}
                style={({ pressed }) => [
                  styles.pilgrimClearButton,
                  {
                    borderColor: theme.borderSubtle,
                    opacity: !hasSavedPilgrimCard ? 0.42 : pressed ? 0.72 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Clear offline pilgrim card"
                testID="pilgrim-card-clear"
              >
                <AppIcon name="trash-2" size={15} color={theme.textSecondary} />
                <ThemedText
                  style={[
                    styles.pilgrimClearButtonText,
                    { color: theme.textSecondary },
                  ]}
                >
                  Clear
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={sharePilgrimCardDetails}
                disabled={!hasSavedPilgrimCard}
                style={({ pressed }) => [
                  styles.pilgrimShareButton,
                  {
                    borderColor: theme.borderSubtle,
                    opacity: !hasSavedPilgrimCard ? 0.42 : pressed ? 0.72 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Share offline pilgrim card"
                testID="pilgrim-card-share"
              >
                <AppIcon name="share-2" size={15} color={theme.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => setShowPilgrimCardLarge(true)}
                disabled={!hasSavedPilgrimCard}
                style={({ pressed }) => [
                  styles.pilgrimShareButton,
                  {
                    borderColor: theme.borderSubtle,
                    opacity: !hasSavedPilgrimCard ? 0.42 : pressed ? 0.72 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open large offline pilgrim card"
                testID="pilgrim-card-large-open"
              >
                <AppIcon
                  name="maximize-2"
                  size={15}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>

            {pilgrimCardStatus !== "idle" || pilgrimCard.updatedAt ? (
              <ThemedText
                style={[styles.pilgrimCardStatus, { color: theme.textMuted }]}
              >
                {pilgrimCardStatus === "saved"
                  ? "Saved on this device."
                  : pilgrimCardStatus === "cleared"
                    ? "Card cleared from this device."
                    : `Last saved ${new Date(
                        pilgrimCard.updatedAt || "",
                      ).toLocaleDateString()}.`}
              </ThemedText>
            ) : null}
          </View>

          <View
            style={[
              styles.readinessPanel,
              {
                backgroundColor: isDark
                  ? "rgba(214, 168, 79, 0.08)"
                  : "rgba(214, 168, 79, 0.11)",
                borderColor: isDark
                  ? "rgba(214, 168, 79, 0.24)"
                  : "rgba(146, 94, 19, 0.2)",
              },
            ]}
            testID="health-readiness-panel"
          >
            <GeometricCardPattern color="#CFAE69" opacity={0.012} />
            <View style={styles.readinessHeader}>
              <View style={styles.readinessHeaderText}>
                <View style={styles.readinessTitleRow}>
                  <AppIcon name="clipboard" size={15} color="#CFAE69" />
                  <ThemedText
                    style={[styles.readinessTitle, { color: theme.text }]}
                  >
                    Health readiness checklist
                  </ThemedText>
                </View>
                <ThemedText
                  style={[
                    styles.readinessSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Stored on this device. Use it for preparation, not diagnosis
                  or personal medical decisions.
                </ThemedText>
              </View>
              <View
                style={[
                  styles.readinessCountPill,
                  {
                    borderColor: isDark
                      ? "rgba(245, 199, 107, 0.35)"
                      : "rgba(146, 94, 19, 0.22)",
                  },
                ]}
              >
                <ThemedText
                  style={[styles.readinessCountText, { color: "#CFAE69" }]}
                >
                  {healthReadinessCompleted}/
                  {PILGRIM_HEALTH_READINESS_CHECKLIST.length}
                </ThemedText>
              </View>
            </View>

            <View
              style={[
                styles.readinessProgressTrack,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.08)",
                },
              ]}
              testID="health-readiness-progress"
            >
              <View
                style={[
                  styles.readinessProgressFill,
                  {
                    width: `${healthReadinessProgress}%`,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>

            <View style={styles.readinessList}>
              {PILGRIM_HEALTH_READINESS_CHECKLIST.map((item) => {
                const isChecked = Boolean(checkedHealthReadiness[item.id]);
                const phase = READINESS_PHASE_STYLES[item.phase];
                const sourceLinks = item.officialSourceIds
                  .map((id) => officialServiceById.get(id))
                  .filter(Boolean) as typeof OFFICIAL_SERVICE_LINKS;

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleHealthReadinessItem(item.id)}
                    style={({ pressed }) => [
                      styles.readinessItem,
                      {
                        borderColor: isChecked
                          ? "rgba(86, 179, 148, 0.34)"
                          : theme.borderSubtle,
                        backgroundColor: isChecked
                          ? isDark
                            ? "rgba(86, 179, 148, 0.1)"
                            : "rgba(86, 179, 148, 0.12)"
                          : isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(255,255,255,0.56)",
                      },
                      pressed ? { opacity: 0.78 } : null,
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isChecked }}
                    accessibilityLabel={`${item.title}: ${item.checkLabel}`}
                    testID={`health-readiness-item-${item.id}`}
                  >
                    <View
                      style={[
                        styles.readinessToggle,
                        {
                          backgroundColor: isChecked
                            ? theme.primary
                            : "transparent",
                          borderColor: isChecked
                            ? theme.primary
                            : theme.borderSubtle,
                        },
                      ]}
                      testID={`health-readiness-toggle-${item.id}`}
                    >
                      {isChecked ? (
                        <AppIcon name="check" size={14} color="#04120D" />
                      ) : null}
                    </View>

                    <View style={styles.readinessItemBody}>
                      <View style={styles.readinessItemHeader}>
                        <View
                          style={[
                            styles.readinessPhasePill,
                            {
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(0,0,0,0.04)",
                            },
                          ]}
                        >
                          <AppIcon
                            name={phase.icon}
                            size={11}
                            color="#CFAE69"
                          />
                          <ThemedText
                            style={[
                              styles.readinessPhaseText,
                              { color: "#CFAE69" },
                            ]}
                          >
                            {phase.label}
                          </ThemedText>
                        </View>
                        {item.offlineReady ? (
                          <View
                            style={[
                              styles.offlineBadge,
                              {
                                backgroundColor: isDark
                                  ? "rgba(86, 179, 148, 0.1)"
                                  : "rgba(86, 179, 148, 0.12)",
                              },
                            ]}
                          >
                            <AppIcon
                              name="download-cloud"
                              size={12}
                              color="#56B394"
                            />
                            <ThemedText
                              style={[
                                styles.offlineBadgeText,
                                { color: "#56B394" },
                              ]}
                            >
                              Offline
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>

                      <ThemedText
                        style={[
                          styles.readinessItemTitle,
                          { color: theme.text },
                        ]}
                      >
                        {item.title}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.readinessItemSummary,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {item.summary}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.readinessCheckLabel,
                          { color: isChecked ? theme.primary : theme.text },
                        ]}
                      >
                        {item.checkLabel}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.readinessSourceReason,
                          { color: theme.textMuted },
                        ]}
                      >
                        {item.sourceReason}
                      </ThemedText>

                      <View style={styles.sourceChipRow}>
                        {sourceLinks.map((source) => (
                          <Pressable
                            key={`${item.id}-${source.id}`}
                            onPress={() => openOfficialService(source.url)}
                            style={({ pressed }) => [
                              styles.sourceChip,
                              {
                                borderColor: theme.borderSubtle,
                                backgroundColor: isDark
                                  ? "rgba(255,255,255,0.04)"
                                  : "rgba(0,0,0,0.03)",
                              },
                              pressed ? { opacity: 0.75 } : null,
                            ]}
                            accessibilityRole="link"
                            accessibilityLabel={`Open ${source.title}`}
                            testID={`health-readiness-source-${item.id}-${source.id}`}
                          >
                            <AppIcon
                              name="external-link"
                              size={11}
                              color={theme.primary}
                            />
                            <ThemedText
                              numberOfLines={1}
                              style={[
                                styles.sourceChipText,
                                { color: theme.text },
                              ]}
                            >
                              {source.authority}
                            </ThemedText>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {PILGRIM_HEALTH_SAFETY_TOPICS.map((topic) => {
            const risk = SAFETY_RISK_STYLES[topic.riskLevel];
            const sourceLinks = topic.officialSourceIds
              .map((id) => officialServiceById.get(id))
              .filter(Boolean) as typeof OFFICIAL_SERVICE_LINKS;

            return (
              <View
                key={topic.id}
                style={[
                  styles.safetyTopic,
                  { borderTopColor: theme.borderSubtle },
                ]}
                testID={`pilgrim-safety-topic-${topic.id}`}
              >
                <View style={styles.safetyTopicHeader}>
                  <View
                    style={[styles.safetyBadge, { backgroundColor: risk.bg }]}
                  >
                    <AppIcon name={risk.icon} size={12} color={risk.color} />
                    <ThemedText
                      style={[styles.safetyBadgeText, { color: risk.color }]}
                    >
                      {risk.label}
                    </ThemedText>
                  </View>
                  {topic.offlineReady ? (
                    <View
                      style={[
                        styles.offlineBadge,
                        {
                          backgroundColor: isDark
                            ? "rgba(86, 179, 148, 0.1)"
                            : "rgba(86, 179, 148, 0.12)",
                        },
                      ]}
                    >
                      <AppIcon
                        name="download-cloud"
                        size={12}
                        color="#56B394"
                      />
                      <ThemedText
                        style={[styles.offlineBadgeText, { color: "#56B394" }]}
                      >
                        Offline
                      </ThemedText>
                    </View>
                  ) : null}
                </View>

                <ThemedText
                  style={[styles.safetyTopicTitle, { color: theme.text }]}
                >
                  {topic.title}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.safetyTopicSummary,
                    { color: theme.textSecondary },
                  ]}
                >
                  {topic.summary}
                </ThemedText>

                <View style={styles.safetyActions}>
                  {topic.userActions.slice(0, 2).map((action) => (
                    <View key={action} style={styles.safetyActionRow}>
                      <AppIcon name="check" size={13} color={theme.primary} />
                      <ThemedText
                        style={[styles.safetyActionText, { color: theme.text }]}
                      >
                        {action}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                <ThemedText
                  style={[styles.safetyEscalation, { color: theme.textMuted }]}
                >
                  {topic.escalation}
                </ThemedText>

                <View style={styles.sourceChipRow}>
                  {sourceLinks.map((source) => (
                    <Pressable
                      key={`${topic.id}-${source.id}`}
                      onPress={() => openOfficialService(source.url)}
                      style={({ pressed }) => [
                        styles.sourceChip,
                        {
                          borderColor: theme.borderSubtle,
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.03)",
                        },
                        pressed ? { opacity: 0.75 } : null,
                      ]}
                      accessibilityRole="link"
                      accessibilityLabel={`Open ${source.title}`}
                      testID={`pilgrim-source-${topic.id}-${source.id}`}
                    >
                      <AppIcon
                        name="external-link"
                        size={11}
                        color={theme.primary}
                      />
                      <ThemedText
                        numberOfLines={1}
                        style={[styles.sourceChipText, { color: theme.text }]}
                      >
                        {source.authority}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}

          <View
            style={[
              styles.safetyBoundary,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
              },
            ]}
          >
            <AppIcon
              name="info"
              size={14}
              color={theme.textSecondary}
              style={styles.safetyBoundaryIcon}
            />
            <ThemedText
              style={[styles.safetyBoundaryText, { color: theme.textMuted }]}
            >
              Use NurAI for preparation, saved links, and gentle reminders. For
              medical issues, emergencies, bookings, permits, or official
              service changes, follow the live official source or a qualified
              professional.
            </ThemedText>
          </View>
        </View>

        {steps.map((step, index) => {
          const isExpanded = expandedStep === step.id;
          const color = getStepColor(index);

          return (
            <Animated.View
              key={`${activeTab}-${step.id}`}
              entering={FadeInDown.delay(index * 60).duration(400)}
            >
              <Pressable
                onPress={() => toggleStep(step.id)}
                style={({ pressed }) => [
                  styles.stepCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                  pressed ? { opacity: 0.9 } : null,
                ]}
                testID={`step-card-${activeTab}-${step.id}`}
              >
                <GeometricCardPattern color={color.text} opacity={0.012} />
                <View style={styles.stepHeader}>
                  <View
                    style={[styles.stepNumber, { backgroundColor: color.bg }]}
                  >
                    <ThemedText
                      style={[styles.stepNumberText, { color: color.text }]}
                    >
                      {step.id}
                    </ThemedText>
                  </View>
                  <View style={styles.stepTitleContainer}>
                    <ThemedText
                      style={[styles.stepArabic, { color: color.text }]}
                    >
                      {step.titleArabic}
                    </ThemedText>
                    <ThemedText
                      style={[styles.stepEnglish, { color: theme.text }]}
                    >
                      {step.titleEnglish}
                    </ThemedText>
                  </View>
                  <AppIcon
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={theme.textSecondary}
                  />
                </View>

                {isExpanded ? (
                  <View style={styles.stepBody}>
                    {activeTab === "hajj"
                      ? (() => {
                          const stepInsight = getHajjStepInsightFn(step.id);
                          if (!stepInsight) return null;
                          return (
                            <LinearGradient
                              colors={
                                isDark
                                  ? [theme.gradientStart, theme.gradientMid]
                                  : [
                                      theme.gradientLightBg,
                                      theme.gradientLightBg2,
                                    ]
                              }
                              style={styles.nuraiCard}
                            >
                              <GeometricCardPattern
                                color={theme.primaryText}
                                opacity={0.012}
                              />
                              <View style={styles.nuraiHeader}>
                                <View
                                  style={[
                                    styles.nuraiDot,
                                    { backgroundColor: theme.primaryText },
                                  ]}
                                />
                                <ThemedText
                                  style={[
                                    styles.nuraiLabel,
                                    { color: theme.primaryText },
                                  ]}
                                >
                                  NurAI Insight
                                </ThemedText>
                              </View>
                              <View style={styles.nuraiBody}>
                                <AppIcon
                                  name={stepInsight.icon as AppIconName}
                                  size={18}
                                  color={theme.primaryText}
                                />
                                <View style={{ flex: 1 }}>
                                  <ThemedText
                                    style={[
                                      styles.nuraiTitle,
                                      { color: theme.primaryText },
                                    ]}
                                  >
                                    {stepInsight.title}
                                  </ThemedText>
                                  <ThemedText
                                    style={[
                                      styles.nuraiText,
                                      { color: theme.primaryText },
                                    ]}
                                  >
                                    {stepInsight.body}
                                  </ThemedText>
                                </View>
                              </View>
                            </LinearGradient>
                          );
                        })()
                      : null}

                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: theme.borderSubtle },
                      ]}
                    />

                    <View style={styles.stepSection}>
                      <View style={styles.sectionHeader}>
                        <AppIcon name="info" size={16} color={color.text} />
                        <ThemedText
                          style={[styles.sectionLabel, { color: color.text }]}
                        >
                          What to Do
                        </ThemedText>
                      </View>
                      <ThemedText
                        style={[styles.stepDescription, { color: theme.text }]}
                      >
                        {step.description}
                      </ThemedText>
                    </View>

                    <View
                      style={[
                        styles.duaContainer,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.02)",
                        },
                      ]}
                    >
                      <View style={styles.sectionHeader}>
                        <AppIcon
                          name="book-open"
                          size={16}
                          color={color.text}
                        />
                        <ThemedText
                          style={[styles.sectionLabel, { color: color.text }]}
                        >
                          Key Dua
                        </ThemedText>
                      </View>
                      <ThemedText
                        style={[styles.duaArabic, { color: theme.text }]}
                      >
                        {step.duaArabic}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.duaTransliteration,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {step.duaTransliteration}
                      </ThemedText>
                      <ThemedText
                        style={[styles.duaEnglish, { color: theme.textMuted }]}
                      >
                        {step.duaEnglish}
                      </ThemedText>
                    </View>

                    <View style={styles.stepSection}>
                      <View style={styles.sectionHeader}>
                        <AppIcon
                          name="alert-circle"
                          size={16}
                          color={color.text}
                        />
                        <ThemedText
                          style={[styles.sectionLabel, { color: color.text }]}
                        >
                          Tips & Notes
                        </ThemedText>
                      </View>
                      <ThemedText
                        style={[
                          styles.stepDescription,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {step.tips}
                      </ThemedText>
                    </View>
                  </View>
                ) : null}
              </Pressable>
            </Animated.View>
          );
        })}

        <View
          style={[styles.dividerLarge, { backgroundColor: theme.borderSubtle }]}
        />
        <GoldDivider color="#CFAE69" opacity={0.42} />

        <ThemedText
          type="h3"
          style={[styles.sectionTitle, { color: theme.text }]}
        >
          Packing Checklist
        </ThemedText>
        <ThemedText
          style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
        >
          Essential items for your journey
        </ThemedText>

        {PACKING_CHECKLIST.map((item, index) => {
          const isChecked = checkedItems[item.id] === true;

          return (
            <Animated.View
              key={item.id}
              entering={FadeInDown.delay((steps.length + index) * 40).duration(
                400,
              )}
            >
              <Pressable
                onPress={() => toggleCheckItem(item.id)}
                style={({ pressed }) => [
                  styles.checklistItem,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                  pressed ? { opacity: 0.85 } : null,
                ]}
                testID={`checklist-${item.id}`}
              >
                <GeometricCardPattern color="#56B394" opacity={0.012} />
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isChecked ? theme.primary : theme.textMuted,
                      backgroundColor: isChecked
                        ? theme.primary
                        : "transparent",
                    },
                  ]}
                >
                  {isChecked ? (
                    <AppIcon name="check" size={14} color="#FFFFFF" />
                  ) : null}
                </View>
                <AppIcon
                  name={item.icon}
                  size={18}
                  color={isChecked ? theme.textMuted : theme.icon}
                  style={styles.checklistIcon}
                />
                <ThemedText
                  style={[
                    styles.checklistLabel,
                    {
                      color: isChecked ? theme.textMuted : theme.text,
                      textDecorationLine: isChecked ? "line-through" : "none",
                    },
                  ]}
                >
                  {item.label}
                </ThemedText>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>

      <Modal
        visible={showPilgrimCardLarge}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPilgrimCardLarge(false)}
      >
        <View style={styles.largeCardBackdrop}>
          <View
            style={[
              styles.largeCardSheet,
              {
                paddingTop: insets.top + Spacing.lg,
                paddingBottom: insets.bottom + Spacing.lg,
                backgroundColor: theme.backgroundRoot,
              },
            ]}
            testID="pilgrim-card-large-view"
          >
            <View style={styles.largeCardHeader}>
              <View>
                <ThemedText
                  style={[styles.largeCardEyebrow, { color: theme.primary }]}
                >
                  Offline pilgrim card
                </ThemedText>
                <ThemedText
                  style={[styles.largeCardTitle, { color: theme.text }]}
                >
                  Show this if you are separated
                </ThemedText>
              </View>
              <Pressable
                onPress={() => setShowPilgrimCardLarge(false)}
                style={({ pressed }) => [
                  styles.largeCardClose,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close large offline pilgrim card"
                testID="pilgrim-card-large-close"
              >
                <AppIcon name="x" size={22} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.largeCardContent}
            >
              {pilgrimCardDisplayRows.map((row) => (
                <Pressable
                  key={row.field}
                  onPress={() => {
                    if (row.phone) callEmergencyContact(row.value);
                  }}
                  disabled={!row.phone}
                  style={({ pressed }) => [
                    styles.largeCardRow,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                      opacity: row.phone && pressed ? 0.76 : 1,
                    },
                  ]}
                  accessibilityRole={row.phone ? "button" : "text"}
                  accessibilityLabel={
                    row.phone ? `Call ${row.label} ${row.value}` : row.label
                  }
                  testID={`pilgrim-card-large-row-${row.field}`}
                >
                  <ThemedText
                    style={[
                      styles.largeCardRowLabel,
                      { color: theme.textMuted },
                    ]}
                  >
                    {row.label}
                  </ThemedText>
                  <View style={styles.largeCardRowValueWrap}>
                    <ThemedText
                      style={[
                        styles.largeCardRowValue,
                        { color: row.phone ? theme.primary : theme.text },
                      ]}
                    >
                      {row.value}
                    </ThemedText>
                    {row.phone ? (
                      <AppIcon
                        name="phone-call"
                        size={22}
                        color={theme.primary}
                      />
                    ) : null}
                  </View>
                </Pressable>
              ))}

              <View
                style={[
                  styles.largeCardBoundary,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                <AppIcon name="shield" size={17} color={theme.textSecondary} />
                <ThemedText
                  style={[
                    styles.largeCardBoundaryText,
                    { color: theme.textMuted },
                  ]}
                >
                  This is personal helper information only. Use official
                  documents, local emergency services, clinicians, and Saudi
                  official services for urgent decisions.
                </ThemedText>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: BorderRadius.xl,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  tabTextActive: {
    color: "#059669",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  journeyHeroCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  journeyHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  journeyHeroBadge: {
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  stepCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  stepNumberText: {
    fontSize: 15,
    fontWeight: "700",
  },
  stepTitleContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  stepArabic: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 2,
  },
  stepEnglish: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  stepBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.md,
  },
  dividerLarge: {
    height: 1,
    marginVertical: Spacing["2xl"],
  },
  stepSection: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  officialPanel: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  officialHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  officialIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  officialHeaderText: {
    flex: 1,
  },
  officialTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  officialSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  officialLink: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  officialLinkIcon: {
    width: 30,
    alignItems: "center",
  },
  officialLinkBody: {
    flex: 1,
    minWidth: 0,
  },
  officialLinkTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  officialLinkMeta: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  officialLinkCopy: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  safetyPanel: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  emergencyGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  emergencyCard: {
    flex: 1,
    minHeight: 78,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    justifyContent: "center",
  },
  emergencyValue: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    marginBottom: 4,
  },
  emergencyLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },
  pilgrimCardBox: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  pilgrimCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pilgrimCardIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pilgrimCardTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    marginBottom: 3,
  },
  pilgrimCardSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  pilgrimFieldGrid: {
    gap: Spacing.sm,
  },
  pilgrimField: {
    gap: 5,
  },
  pilgrimFieldLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pilgrimInput: {
    minHeight: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
  },
  pilgrimInputMultiline: {
    minHeight: 70,
  },
  pilgrimCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  pilgrimSaveButton: {
    minHeight: 44,
    flex: 1,
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  pilgrimSaveButtonText: {
    color: "#04120D",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  pilgrimClearButton: {
    minHeight: 44,
    minWidth: 96,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: Spacing.md,
  },
  pilgrimClearButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  pilgrimShareButton: {
    minHeight: 44,
    width: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  largeCardBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.76)",
    justifyContent: "flex-end",
  },
  largeCardSheet: {
    maxHeight: "96%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: Spacing.lg,
  },
  largeCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  largeCardEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  largeCardTitle: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "900",
  },
  largeCardClose: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  largeCardContent: {
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  largeCardRow: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  largeCardRowLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: Spacing.sm,
  },
  largeCardRowValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  largeCardRowValue: {
    flex: 1,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
  },
  largeCardBoundary: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  largeCardBoundaryText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  pilgrimCardStatus: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: Spacing.sm,
  },
  readinessPanel: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  readinessHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  readinessHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  readinessTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 4,
  },
  readinessTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },
  readinessSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  readinessCountPill: {
    minWidth: 48,
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  readinessCountText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  readinessProgressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  readinessProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  readinessList: {
    gap: Spacing.sm,
  },
  readinessItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  readinessToggle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  readinessItemBody: {
    flex: 1,
    minWidth: 0,
  },
  readinessItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  readinessPhasePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  readinessPhaseText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  readinessItemTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
    marginBottom: 5,
  },
  readinessItemSummary: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  readinessCheckLabel: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  readinessSourceReason: {
    fontSize: 11,
    lineHeight: 17,
    marginBottom: Spacing.sm,
  },
  safetyTopic: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
  },
  safetyTopicHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  safetyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  safetyBadgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  offlineBadgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  safetyTopicTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    marginBottom: 5,
  },
  safetyTopicSummary: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: Spacing.sm,
  },
  safetyActions: {
    gap: 7,
    marginBottom: Spacing.sm,
  },
  safetyActionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  safetyActionText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  safetyEscalation: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  sourceChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  sourceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "100%",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  sourceChipText: {
    maxWidth: 180,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  safetyBoundary: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  safetyBoundaryIcon: {
    marginTop: 2,
    marginRight: Spacing.sm,
  },
  safetyBoundaryText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  duaContainer: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  duaArabic: {
    fontSize: 20,
    lineHeight: 34,
    textAlign: "right",
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  duaTransliteration: {
    fontSize: 14,
    lineHeight: 22,
    fontStyle: "italic",
    marginBottom: Spacing.xs,
  },
  duaEnglish: {
    fontSize: 13,
    lineHeight: 20,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  checklistIcon: {
    marginRight: Spacing.md,
  },
  checklistLabel: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  nuraiCard: {
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  nuraiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  nuraiDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
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
    gap: 8,
  },
  nuraiTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  nuraiText: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.9,
  },
});
