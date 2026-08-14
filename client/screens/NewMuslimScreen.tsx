import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, CategoryColors, BorderRadius } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";
import { useSubscription } from "@/context/SubscriptionContext";
import AIFloatingButton from "@/components/AIFloatingButton";
import {
  AIResponseModal,
  customerSafeAIErrorMessage,
  type AIResponseState,
  type AIResponseData,
} from "@/components/AIResponseModal";
import { getRevertGuidance } from "@/services/aiContextService";
import { mapAIContextResponseToModalData } from "@/services/personalAIResponseMapper";
import {
  AIIconSvg,
  GeometricCardPattern,
  IslamicPatternBackground,
  QuranIconSvg,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

const STORAGE_KEY = "new_muslim_progress";

interface ProgressData {
  completedChapters: number[];
  currentChapter: number;
  startedAt: string;
}

interface Section {
  type: "heading" | "text" | "arabic" | "steps" | "list";
  title?: string;
  body?: string;
  arabic?: string;
  transliteration?: string;
  translation?: string;
  items?: {
    title: string;
    description: string;
    arabic?: string;
    transliteration?: string;
    translation?: string;
  }[];
}

interface Chapter {
  id: number;
  title: string;
  icon: AppIconName;
  description: string;
  colorKey: keyof typeof CategoryColors;
  sections: Section[];
}

const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: "The Shahada",
    icon: "star",
    description: "Declaration of Faith - the first step into Islam",
    colorKey: "emerald",
    sections: [
      {
        type: "heading",
        title: "The Declaration of Faith",
      },
      {
        type: "text",
        body: "The Shahada is the most fundamental declaration in Islam. It is the first pillar of Islam and the gateway to becoming a Muslim. By sincerely uttering these words with conviction in your heart, you enter the fold of Islam.",
      },
      {
        type: "arabic",
        arabic:
          "\u0623\u064E\u0634\u0652\u0647\u064E\u062F\u064F \u0623\u064E\u0646\u0652 \u0644\u064E\u0627 \u0625\u0650\u0644\u064E\u0670\u0647\u064E \u0625\u0650\u0644\u064E\u0651\u0627 \u0627\u0644\u0644\u064E\u0651\u0647\u064F \u0648\u064E\u0623\u064E\u0634\u0652\u0647\u064E\u062F\u064F \u0623\u064E\u0646\u064E\u0651 \u0645\u064F\u062D\u064E\u0645\u064E\u0651\u062F\u064B\u0627 \u0631\u064E\u0633\u064F\u0648\u0644\u064F \u0627\u0644\u0644\u064E\u0651\u0647\u0650",
        transliteration:
          "Ash-hadu an la ilaha illallah, wa ash-hadu anna Muhammadan Rasulullah",
        translation:
          "I bear witness that there is no god but Allah, and I bear witness that Muhammad is the Messenger of Allah",
      },
      {
        type: "heading",
        title: "What It Means to Be Muslim",
      },
      {
        type: "text",
        body: "Being Muslim means submitting your will to Allah (God) alone. It means believing in His oneness, following the guidance He sent through Prophet Muhammad (peace be upon him), and striving to live a life of righteousness, compassion, and worship. Islam is not just a religion but a complete way of life that brings peace, purpose, and community.",
      },
      {
        type: "heading",
        title: "The Six Pillars of Iman (Faith)",
      },
      {
        type: "list",
        items: [
          {
            title: "Belief in Allah",
            description:
              "The one and only God, Creator of everything, with no partners or equals.",
          },
          {
            title: "Belief in the Angels",
            description:
              "Created by Allah from light, they carry out His commands and record our deeds.",
          },
          {
            title: "Belief in the Holy Books",
            description:
              "The Quran, Torah, Psalms, and Gospel in their original forms, all revealed by Allah.",
          },
          {
            title: "Belief in the Prophets",
            description:
              "From Adam to Muhammad (peace be upon them all), sent to guide humanity.",
          },
          {
            title: "Belief in the Day of Judgment",
            description:
              "A day when all people will be held accountable for their deeds.",
          },
          {
            title: "Belief in Divine Decree",
            description:
              "Everything that happens is by the will and knowledge of Allah, both good and challenging.",
          },
        ],
      },
      {
        type: "heading",
        title: "The Five Pillars of Islam",
      },
      {
        type: "list",
        items: [
          {
            title: "Shahada",
            description:
              "The declaration of faith - testifying that there is no god but Allah and Muhammad is His Messenger.",
          },
          {
            title: "Salah",
            description:
              "The five daily prayers, a direct connection between you and Allah.",
          },
          {
            title: "Zakat",
            description:
              "Giving a portion of your wealth to those in need, purifying your earnings.",
          },
          {
            title: "Sawm",
            description:
              "Fasting during the month of Ramadan from dawn to sunset.",
          },
          {
            title: "Hajj",
            description:
              "The pilgrimage to Makkah, once in a lifetime for those who are able.",
          },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Purification (Taharah)",
    icon: "droplet",
    description: "Learn wudu, ghusl, and the importance of cleanliness",
    colorKey: "blue",
    sections: [
      {
        type: "heading",
        title: "Why Purification Matters",
      },
      {
        type: "text",
        body: "In Islam, physical cleanliness is closely tied to spiritual purity. Before standing in prayer before Allah, a Muslim must be in a state of ritual purity. This is achieved primarily through wudu (ablution) and, when necessary, ghusl (full body purification).",
      },
      {
        type: "heading",
        title: "Step-by-Step Wudu (Ablution)",
      },
      {
        type: "steps",
        items: [
          {
            title: "Intention (Niyyah)",
            description:
              "Make the intention in your heart to perform wudu for the sake of Allah. The intention does not need to be spoken aloud.",
          },
          {
            title: "Say Bismillah",
            description:
              'Begin by saying "Bismillah" (In the name of Allah) before starting.',
            arabic:
              "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u064E\u0651\u0647\u0650",
            transliteration: "Bismillah",
          },
          {
            title: "Wash Hands 3x",
            description:
              "Wash both hands up to the wrists three times, ensuring water reaches between the fingers.",
          },
          {
            title: "Rinse Mouth 3x",
            description:
              "Take water into your mouth, swirl it around thoroughly, and spit it out. Repeat three times.",
          },
          {
            title: "Clean Nose 3x",
            description:
              "Sniff water gently into your nostrils, then blow it out using your left hand. Repeat three times.",
          },
          {
            title: "Wash Face 3x",
            description:
              "Wash your entire face three times, from the hairline to the chin and from ear to ear.",
          },
          {
            title: "Wash Right Arm to Elbow 3x",
            description:
              "Wash your right arm from the fingertips up to and including the elbow three times.",
          },
          {
            title: "Wash Left Arm to Elbow 3x",
            description:
              "Wash your left arm from the fingertips up to and including the elbow three times.",
          },
          {
            title: "Wipe Head Once",
            description:
              "Wet your hands and wipe over your head once, moving from the front to the back and then back to the front.",
          },
          {
            title: "Clean Ears",
            description:
              "Using wet index fingers, wipe the inside of your ears, and use your thumbs to wipe behind them.",
          },
          {
            title: "Wash Feet 3x",
            description:
              "Wash your right foot up to the ankle three times, making sure water reaches between the toes. Then wash the left foot the same way.",
          },
        ],
      },
      {
        type: "heading",
        title: "Dua After Wudu",
      },
      {
        type: "arabic",
        arabic:
          "\u0623\u064E\u0634\u0652\u0647\u064E\u062F\u064F \u0623\u064E\u0646\u0652 \u0644\u064E\u0627 \u0625\u0650\u0644\u064E\u0670\u0647\u064E \u0625\u0650\u0644\u064E\u0651\u0627 \u0627\u0644\u0644\u064E\u0651\u0647\u064F \u0648\u064E\u062D\u0652\u062F\u064E\u0647\u064F \u0644\u064E\u0627 \u0634\u064E\u0631\u0650\u064A\u0643\u064E \u0644\u064E\u0647\u064F \u0648\u064E\u0623\u064E\u0634\u0652\u0647\u064E\u062F\u064F \u0623\u064E\u0646\u064E\u0651 \u0645\u064F\u062D\u064E\u0645\u064E\u0651\u062F\u064B\u0627 \u0639\u064E\u0628\u0652\u062F\u064F\u0647\u064F \u0648\u064E\u0631\u064E\u0633\u064F\u0648\u0644\u064F\u0647\u064F",
        transliteration:
          "Ash-hadu an la ilaha illallahu wahdahu la sharika lahu, wa ash-hadu anna Muhammadan abduhu wa rasuluh",
        translation:
          "I bear witness that there is no god but Allah alone, with no partner, and I bear witness that Muhammad is His servant and Messenger",
      },
      {
        type: "heading",
        title: "Ghusl (Full Body Purification)",
      },
      {
        type: "text",
        body: "Ghusl is a full body wash required after certain states of impurity, such as after marital relations or at the end of a menstrual cycle. The basic steps are: (1) Make the intention, (2) Say Bismillah, (3) Wash your hands, (4) Wash the private parts, (5) Perform a complete wudu, (6) Pour water over the head three times ensuring it reaches the roots of the hair, (7) Wash the entire body, starting with the right side then the left, ensuring water reaches every part.",
      },
      {
        type: "heading",
        title: "What Breaks Wudu",
      },
      {
        type: "list",
        items: [
          {
            title: "Natural discharge",
            description:
              "Anything that exits from the private parts (urine, stool, gas).",
          },
          {
            title: "Deep sleep",
            description:
              "Sleeping deeply while lying down or leaning breaks wudu.",
          },
          {
            title: "Loss of consciousness",
            description: "Fainting or losing consciousness for any reason.",
          },
          {
            title: "Touching private parts",
            description:
              "Directly touching one's own private parts without a barrier.",
          },
          {
            title: "Vomiting",
            description:
              "A large amount of vomit that fills the mouth (according to Hanafi school).",
          },
        ],
      },
    ],
  },
  {
    id: 3,
    title: "Learning to Pray (Salah)",
    icon: "clock",
    description: "The five daily prayers and how to perform them",
    colorKey: "purple",
    sections: [
      {
        type: "heading",
        title: "The Five Daily Prayers",
      },
      {
        type: "text",
        body: "Salah is the second pillar of Islam and the most important act of worship after the Shahada. Muslims pray five times a day at specific times, creating a rhythm of remembrance and connection with Allah throughout the day.",
      },
      {
        type: "list",
        items: [
          {
            title: "Fajr - 2 Rak'ah",
            description:
              "The dawn prayer, performed before sunrise. A peaceful start to the day.",
          },
          {
            title: "Dhuhr - 4 Rak'ah",
            description:
              "The midday prayer, performed after the sun passes its zenith.",
          },
          {
            title: "Asr - 4 Rak'ah",
            description:
              "The afternoon prayer, performed in the late afternoon.",
          },
          {
            title: "Maghrib - 3 Rak'ah",
            description: "The sunset prayer, performed just after sunset.",
          },
          {
            title: "Isha - 4 Rak'ah",
            description:
              "The night prayer, performed after twilight disappears.",
          },
        ],
      },
      {
        type: "heading",
        title: "Step-by-Step Prayer Guide",
      },
      {
        type: "steps",
        items: [
          {
            title: "Standing (Qiyam)",
            description:
              "Stand facing the Qibla (direction of the Kaaba in Makkah). Make your intention for the specific prayer.",
          },
          {
            title: "Takbiratul Ihram",
            description:
              "Raise both hands to ear level and say the opening Takbir to begin the prayer.",
            arabic:
              "\u0627\u0644\u0644\u064E\u0651\u0647\u064F \u0623\u064E\u0643\u0652\u0628\u064E\u0631\u064F",
            transliteration: "Allahu Akbar",
            translation: "Allah is the Greatest",
          },
          {
            title: "Opening Dua (Thana)",
            description:
              "Place your right hand over your left on your chest and recite the opening supplication.",
            arabic:
              "\u0633\u064F\u0628\u0652\u062D\u064E\u0627\u0646\u064E\u0643\u064E \u0627\u0644\u0644\u064E\u0651\u0647\u064F\u0645\u064E\u0651 \u0648\u064E\u0628\u0650\u062D\u064E\u0645\u0652\u062F\u0650\u0643\u064E \u0648\u064E\u062A\u064E\u0628\u064E\u0627\u0631\u064E\u0643\u064E \u0627\u0633\u0652\u0645\u064F\u0643\u064E \u0648\u064E\u062A\u064E\u0639\u064E\u0627\u0644\u064E\u0649 \u062C\u064E\u062F\u064F\u0651\u0643\u064E \u0648\u064E\u0644\u064E\u0627 \u0625\u0650\u0644\u064E\u0670\u0647\u064E \u063A\u064E\u064A\u0652\u0631\u064F\u0643\u064E",
            transliteration:
              "Subhanaka Allahumma wa bihamdika, wa tabaraka ismuka, wa ta'ala jadduka, wa la ilaha ghayruk",
            translation:
              "Glory be to You O Allah, and praise be to You. Blessed is Your name, exalted is Your majesty, and there is no god but You",
          },
          {
            title: "Surah Al-Fatihah",
            description:
              "Recite the opening chapter of the Quran. This is an essential pillar of every unit of prayer.",
            arabic:
              "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u064E\u0651\u0647\u0650 \u0627\u0644\u0631\u064E\u0651\u062D\u0652\u0645\u064E\u0670\u0646\u0650 \u0627\u0644\u0631\u064E\u0651\u062D\u0650\u064A\u0645\u0650 \u2022 \u0627\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064F \u0644\u0650\u0644\u064E\u0651\u0647\u0650 \u0631\u064E\u0628\u064E\u0651 \u0627\u0644\u0652\u0639\u064E\u0627\u0644\u064E\u0645\u0650\u064A\u0646\u064E \u2022 \u0627\u0644\u0631\u064E\u0651\u062D\u0652\u0645\u064E\u0670\u0646\u0650 \u0627\u0644\u0631\u064E\u0651\u062D\u0650\u064A\u0645\u0650 \u2022 \u0645\u064E\u0627\u0644\u0650\u0643\u0650 \u064A\u064E\u0648\u0652\u0645\u0650 \u0627\u0644\u062F\u064E\u0651\u064A\u0646\u0650 \u2022 \u0625\u0650\u064A\u064E\u0651\u0627\u0643\u064E \u0646\u064E\u0639\u0652\u0628\u064F\u062F\u064F \u0648\u064E\u0625\u0650\u064A\u064E\u0651\u0627\u0643\u064E \u0646\u064E\u0633\u0652\u062A\u064E\u0639\u0650\u064A\u0646\u064F \u2022 \u0627\u0647\u0652\u062F\u0650\u0646\u064E\u0627 \u0627\u0644\u0635\u064E\u0651\u0631\u064E\u0627\u0637\u064E \u0627\u0644\u0652\u0645\u064F\u0633\u0652\u062A\u064E\u0642\u0650\u064A\u0645\u064E \u2022 \u0635\u0650\u0631\u064E\u0627\u0637\u064E \u0627\u0644\u064E\u0651\u0630\u0650\u064A\u0646\u064E \u0623\u064E\u0646\u0652\u0639\u064E\u0645\u0652\u062A\u064E \u0639\u064E\u0644\u064E\u064A\u0652\u0647\u0650\u0645\u0652 \u063A\u064E\u064A\u0652\u0631\u0650 \u0627\u0644\u0652\u0645\u064E\u063A\u0652\u0636\u064F\u0648\u0628\u0650 \u0639\u064E\u0644\u064E\u064A\u0652\u0647\u0650\u0645\u0652 \u0648\u064E\u0644\u064E\u0627 \u0627\u0644\u0636\u064E\u0651\u0627\u0644\u064E\u0651\u064A\u0646\u064E",
            transliteration:
              "Bismillahir-Rahmanir-Rahim. Al-hamdu lillahi Rabbil-'alamin. Ar-Rahmanir-Rahim. Maliki yawmid-Din. Iyyaka na'budu wa iyyaka nasta'in. Ihdinas-siratal-mustaqim. Siratal-ladhina an'amta 'alayhim, ghayril-maghdubi 'alayhim wa lad-dallin",
            translation:
              "In the name of Allah, the Most Gracious, the Most Merciful. All praise is due to Allah, Lord of all the worlds. The Most Gracious, the Most Merciful. Master of the Day of Judgment. You alone we worship, and You alone we ask for help. Guide us to the straight path. The path of those upon whom You have bestowed favor, not of those who have earned anger nor of those who are astray",
          },
          {
            title: "Another Short Surah",
            description:
              "After Al-Fatihah in the first two rak'ah, recite any short surah. Surah Al-Ikhlas is recommended for beginners.",
            arabic:
              "\u0642\u064F\u0644\u0652 \u0647\u064F\u0648\u064E \u0627\u0644\u0644\u064E\u0651\u0647\u064F \u0623\u064E\u062D\u064E\u062F\u064C \u2022 \u0627\u0644\u0644\u064E\u0651\u0647\u064F \u0627\u0644\u0635\u064E\u0651\u0645\u064E\u062F\u064F \u2022 \u0644\u064E\u0645\u0652 \u064A\u064E\u0644\u0650\u062F\u0652 \u0648\u064E\u0644\u064E\u0645\u0652 \u064A\u064F\u0648\u0644\u064E\u062F\u0652 \u2022 \u0648\u064E\u0644\u064E\u0645\u0652 \u064A\u064E\u0643\u064F\u0646\u0652 \u0644\u064E\u0647\u064F \u0643\u064F\u0641\u064F\u0648\u064B\u0627 \u0623\u064E\u062D\u064E\u062F\u064C",
            transliteration:
              "Qul huwa Allahu ahad. Allahus-samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad",
            translation:
              "Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born. Nor is there to Him any equivalent",
          },
          {
            title: "Ruku (Bowing)",
            description:
              "Say 'Allahu Akbar' and bow down, placing your hands on your knees with your back straight. Say the dhikr three times.",
            arabic:
              "\u0633\u064F\u0628\u0652\u062D\u064E\u0627\u0646\u064E \u0631\u064E\u0628\u064E\u0651\u064A\u064E \u0627\u0644\u0652\u0639\u064E\u0638\u0650\u064A\u0645\u0650",
            transliteration: "Subhana Rabbiyal-'Adhim",
            translation: "Glory be to my Lord, the Almighty",
          },
          {
            title: "Standing from Ruku",
            description:
              "Rise from bowing to a standing position while saying the dhikr. Stand straight and still for a moment.",
            arabic:
              "\u0633\u064E\u0645\u0650\u0639\u064E \u0627\u0644\u0644\u064E\u0651\u0647\u064F \u0644\u0650\u0645\u064E\u0646\u0652 \u062D\u064E\u0645\u0650\u062F\u064E\u0647\u064F \u0631\u064E\u0628\u064E\u0651\u0646\u064E\u0627 \u0648\u064E\u0644\u064E\u0643\u064E \u0627\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064F",
            transliteration: "Sami'Allahu liman hamidah, Rabbana wa lakal-hamd",
            translation:
              "Allah hears the one who praises Him. Our Lord, to You is all praise",
          },
          {
            title: "Sujud (Prostration)",
            description:
              "Say 'Allahu Akbar' and prostrate with your forehead, nose, palms, knees, and toes touching the ground. Say the dhikr three times.",
            arabic:
              "\u0633\u064F\u0628\u0652\u062D\u064E\u0627\u0646\u064E \u0631\u064E\u0628\u064E\u0651\u064A\u064E \u0627\u0644\u0652\u0623\u064E\u0639\u0652\u0644\u064E\u0649",
            transliteration: "Subhana Rabbiyal-A'la",
            translation: "Glory be to my Lord, the Most High",
          },
          {
            title: "Sitting Between Sujud",
            description:
              "Rise to a sitting position saying 'Allahu Akbar.' Sit upright briefly, asking for forgiveness before the second prostration.",
            arabic:
              "\u0631\u064E\u0628\u064E\u0651 \u0627\u063A\u0652\u0641\u0650\u0631\u0652 \u0644\u0650\u064A",
            transliteration: "Rabbighfir li",
            translation: "My Lord, forgive me",
          },
          {
            title: "Tashahhud (Sitting)",
            description:
              "In the final sitting (or after every two rak'ah), recite the Tashahhud while pointing the index finger.",
            arabic:
              "\u0627\u0644\u062A\u064E\u0651\u062D\u0650\u064A\u064E\u0651\u0627\u062A\u064F \u0644\u0650\u0644\u064E\u0651\u0647\u0650 \u0648\u064E\u0627\u0644\u0635\u064E\u0651\u0644\u064E\u0648\u064E\u0627\u062A\u064F \u0648\u064E\u0627\u0644\u0637\u064E\u0651\u064A\u064E\u0651\u0628\u064E\u0627\u062A\u064F\u060C \u0627\u0644\u0633\u064E\u0651\u0644\u064E\u0627\u0645\u064F \u0639\u064E\u0644\u064E\u064A\u0652\u0643\u064E \u0623\u064E\u064A\u064F\u0651\u0647\u064E\u0627 \u0627\u0644\u0646\u064E\u0651\u0628\u0650\u064A\u064F\u0651 \u0648\u064E\u0631\u064E\u062D\u0652\u0645\u064E\u0629\u064F \u0627\u0644\u0644\u064E\u0651\u0647\u0650 \u0648\u064E\u0628\u064E\u0631\u064E\u0643\u064E\u0627\u062A\u064F\u0647\u064F\u060C \u0627\u0644\u0633\u064E\u0651\u0644\u064E\u0627\u0645\u064F \u0639\u064E\u0644\u064E\u064A\u0652\u0646\u064E\u0627 \u0648\u064E\u0639\u064E\u0644\u064E\u0649 \u0639\u0650\u0628\u064E\u0627\u062F\u0650 \u0627\u0644\u0644\u064E\u0651\u0647\u0650 \u0627\u0644\u0635\u064E\u0651\u0627\u0644\u0650\u062D\u0650\u064A\u0646\u064E",
            transliteration:
              "At-tahiyyatu lillahi was-salawatu wat-tayyibat. As-salamu 'alayka ayyuhan-Nabiyyu wa rahmatullahi wa barakatuh. As-salamu 'alayna wa 'ala 'ibadillahis-salihin",
            translation:
              "All greetings, prayers, and pure words are for Allah. Peace be upon you, O Prophet, and the mercy of Allah and His blessings. Peace be upon us and upon the righteous servants of Allah",
          },
          {
            title: "Salawat on the Prophet",
            description:
              "In the final sitting, after the Tashahhud, send blessings upon Prophet Muhammad and his family.",
            arabic:
              "\u0627\u0644\u0644\u064E\u0651\u0647\u064F\u0645\u064E\u0651 \u0635\u064E\u0644\u064E\u0651 \u0639\u064E\u0644\u064E\u0649 \u0645\u064F\u062D\u064E\u0645\u064E\u0651\u062F\u064D \u0648\u064E\u0639\u064E\u0644\u064E\u0649 \u0622\u0644\u0650 \u0645\u064F\u062D\u064E\u0645\u064E\u0651\u062F\u064D\u060C \u0643\u064E\u0645\u064E\u0627 \u0635\u064E\u0644\u064E\u0651\u064A\u0652\u062A\u064E \u0639\u064E\u0644\u064E\u0649 \u0625\u0650\u0628\u0652\u0631\u064E\u0627\u0647\u0650\u064A\u0645\u064E \u0648\u064E\u0639\u064E\u0644\u064E\u0649 \u0622\u0644\u0650 \u0625\u0650\u0628\u0652\u0631\u064E\u0627\u0647\u0650\u064A\u0645\u064E",
            transliteration:
              "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad, kama sallayta 'ala Ibrahima wa 'ala ali Ibrahim",
            translation:
              "O Allah, send blessings upon Muhammad and the family of Muhammad, as You sent blessings upon Ibrahim and the family of Ibrahim",
          },
          {
            title: "Salam to End Prayer",
            description:
              "End the prayer by turning your head to the right and then to the left, saying the salam each time.",
            arabic:
              "\u0627\u0644\u0633\u064E\u0651\u0644\u064E\u0627\u0645\u064F \u0639\u064E\u0644\u064E\u064A\u0652\u0643\u064F\u0645\u0652 \u0648\u064E\u0631\u064E\u062D\u0652\u0645\u064E\u0629\u064F \u0627\u0644\u0644\u064E\u0651\u0647\u0650",
            transliteration: "As-salamu 'alaykum wa rahmatullah",
            translation: "Peace and mercy of Allah be upon you",
          },
        ],
      },
    ],
  },
  {
    id: 4,
    title: "Essential Knowledge",
    icon: "book-open",
    description: "Daily phrases, halal lifestyle, and mosque etiquette",
    colorKey: "amber",
    sections: [
      {
        type: "heading",
        title: "Halal and Haram Basics",
      },
      {
        type: "text",
        body: "Islam provides clear guidance on what is permissible (halal) and what is forbidden (haram). For food, Muslims eat meat that is slaughtered in Allah's name (zabiha/halal), avoid pork and its by-products, and do not consume alcohol or intoxicants. In lifestyle, honesty, kindness, and modesty are encouraged, while lying, cheating, backbiting, and harmful actions are forbidden.",
      },
      {
        type: "heading",
        title: "Islamic Greetings",
      },
      {
        type: "arabic",
        arabic:
          "\u0627\u0644\u0633\u064E\u0651\u0644\u064E\u0627\u0645\u064F \u0639\u064E\u0644\u064E\u064A\u0652\u0643\u064F\u0645\u0652",
        transliteration: "As-salamu alaykum",
        translation: "Peace be upon you (the standard Islamic greeting)",
      },
      {
        type: "arabic",
        arabic:
          "\u0648\u064E\u0639\u064E\u0644\u064E\u064A\u0652\u0643\u064F\u0645\u0652 \u0627\u0644\u0633\u064E\u0651\u0644\u064E\u0627\u0645\u064F",
        transliteration: "Wa alaykum as-salam",
        translation: "And upon you be peace (the response)",
      },
      {
        type: "heading",
        title: "Common Daily Phrases",
      },
      {
        type: "list",
        items: [
          {
            title: "Bismillah",
            description: "Said before starting any action, especially eating.",
            arabic:
              "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u064E\u0651\u0647\u0650",
          },
          {
            title: "Alhamdulillah",
            description: "Said to express gratitude and praise to Allah.",
            arabic:
              "\u0627\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064F \u0644\u0650\u0644\u064E\u0651\u0647\u0650",
          },
          {
            title: "SubhanAllah",
            description:
              "Said to glorify Allah, often in amazement at His creation.",
            arabic:
              "\u0633\u064F\u0628\u0652\u062D\u064E\u0627\u0646\u064E \u0627\u0644\u0644\u064E\u0651\u0647\u0650",
          },
          {
            title: "MashaAllah",
            description:
              "Said to appreciate something good, acknowledging it is by Allah's will.",
            arabic:
              "\u0645\u064E\u0627 \u0634\u064E\u0627\u0621\u064E \u0627\u0644\u0644\u064E\u0651\u0647\u064F",
          },
          {
            title: "InshaAllah",
            description:
              "Said when intending to do something in the future, meaning 'God willing.'",
            arabic:
              "\u0625\u0650\u0646\u0652 \u0634\u064E\u0627\u0621\u064E \u0627\u0644\u0644\u064E\u0651\u0647\u064F",
          },
        ],
      },
      {
        type: "heading",
        title: "Islamic Calendar Basics",
      },
      {
        type: "text",
        body: "The Islamic (Hijri) calendar is a lunar calendar with 12 months. Important months include Ramadan (the month of fasting), Dhul Hijjah (the month of Hajj pilgrimage), and Muharram (the first month of the Islamic year). The calendar began with the migration (Hijrah) of Prophet Muhammad from Makkah to Madinah.",
      },
      {
        type: "heading",
        title: "Mosque Etiquette",
      },
      {
        type: "list",
        items: [
          {
            title: "Enter with your right foot",
            description: "Say 'Bismillah' and the dua for entering the mosque.",
          },
          {
            title: "Remove your shoes",
            description: "Place them neatly in the designated area.",
          },
          {
            title: "Pray two rak'ah upon entering",
            description:
              "This is called Tahiyyatul Masjid (greeting the mosque).",
          },
          {
            title: "Maintain silence and respect",
            description:
              "Avoid loud conversations, especially when others are praying.",
          },
          {
            title: "Dress modestly",
            description:
              "Wear clean, modest clothing that covers appropriately.",
          },
          {
            title: "Turn off your phone",
            description: "Or set it to silent mode to avoid disturbing others.",
          },
        ],
      },
      {
        type: "heading",
        title: "Friday Prayer (Jumu'ah)",
      },
      {
        type: "text",
        body: "Friday (Jumu'ah) prayer is obligatory for Muslim men and highly recommended for women. It replaces the Dhuhr prayer on Fridays and consists of a sermon (khutbah) followed by two rak'ah of congregational prayer. It is recommended to take a bath, wear clean clothes, and arrive early. Listen attentively to the khutbah and avoid talking during it.",
      },
    ],
  },
  {
    id: 5,
    title: "Growing in Faith",
    icon: "trending-up",
    description: "Quran, Ramadan, Zakat, and building lasting habits",
    colorKey: "teal",
    sections: [
      {
        type: "heading",
        title: "Reading the Quran",
      },
      {
        type: "text",
        body: "The Quran is the word of Allah revealed to Prophet Muhammad (peace be upon him). As a new Muslim, start with short surahs at the end of the Quran (Juz Amma). Surah Al-Fatihah, Al-Ikhlas, Al-Falaq, and An-Nas are excellent starting points. Read with a translation to understand the meaning. Even reading one verse a day is a blessed start. Consider finding a teacher or using this app's Quran reader to help with pronunciation.",
      },
      {
        type: "heading",
        title: "Fasting in Ramadan",
      },
      {
        type: "text",
        body: "During Ramadan, Muslims fast from dawn (Fajr) to sunset (Maghrib), abstaining from food, drink, and marital relations. The pre-dawn meal is called Suhoor, and the meal to break the fast is Iftar. Fasting teaches self-discipline, gratitude, and empathy for those less fortunate. If this is your first Ramadan, ease into it gradually. Those who are ill, traveling, pregnant, or nursing may be exempt.",
      },
      {
        type: "heading",
        title: "Zakat (Charitable Giving)",
      },
      {
        type: "text",
        body: "Zakat is the third pillar of Islam, requiring Muslims who meet a minimum wealth threshold (nisab) to give 2.5% of their savings annually to those in need. It purifies wealth and helps build a more equitable society. Categories of Zakat recipients include the poor, the needy, those in debt, and travelers in need.",
      },
      {
        type: "heading",
        title: "Making Dua (Personal Supplication)",
      },
      {
        type: "text",
        body: "Dua is your personal conversation with Allah. You can make dua in any language, at any time, for anything. Raise your hands, face the Qibla if possible, and speak to Allah from your heart. Begin by praising Allah and sending blessings on the Prophet. The best times for dua include the last third of the night, between the adhan and iqamah, while prostrating in prayer, and on Friday.",
      },
      {
        type: "heading",
        title: "Building Good Habits Gradually",
      },
      {
        type: "list",
        items: [
          {
            title: "Start with the five daily prayers",
            description:
              "This is the foundation. Even if you miss some initially, keep trying.",
          },
          {
            title: "Learn one new surah at a time",
            description:
              "Begin with short surahs and gradually work your way through the Quran.",
          },
          {
            title: "Make dhikr throughout the day",
            description:
              "Remember Allah with SubhanAllah, Alhamdulillah, and Allahu Akbar.",
          },
          {
            title: "Read Quran daily",
            description:
              "Even a few verses a day will build consistency over time.",
          },
          {
            title: "Attend Friday prayers",
            description:
              "This will help you connect with the Muslim community.",
          },
          {
            title: "Be patient with yourself",
            description:
              "Build a small, steady routine you can keep with sincerity.",
          },
        ],
      },
      {
        type: "heading",
        title: "Finding a Muslim Community",
      },
      {
        type: "text",
        body: "Community is essential in Islam. Visit your local mosque, attend Islamic classes and events, and connect with other Muslims. Many mosques offer new Muslim support groups and mentoring programs. Online communities can also provide support and knowledge. Do not hesitate to ask questions - the Muslim community is generally welcoming and eager to help new brothers and sisters.",
      },
      {
        type: "heading",
        title: "Recommended Next Steps",
      },
      {
        type: "list",
        items: [
          {
            title: "Use the Quran reader in this app",
            description:
              "Read with translation and transliteration to build understanding.",
          },
          {
            title: "Explore the Duas section",
            description: "Learn daily supplications for various occasions.",
          },
          {
            title: "Set up prayer time notifications",
            description: "Use the Prayer Times feature to never miss a prayer.",
          },
          {
            title: "Track your daily progress",
            description:
              "Use the app's streak and progress features to stay motivated.",
          },
          {
            title: "Learn about the Prophets",
            description:
              "Explore the stories of the Prophets to strengthen your faith.",
          },
          {
            title: "Join the community",
            description:
              "Connect with other Muslims through the app's community features.",
          },
        ],
      },
    ],
  },
];

const REVERT_QUESTIONS = [
  { label: "I feel lonely as a new Muslim", concern: "loneliness" },
  { label: "My family doesn't understand", concern: "family" },
  { label: "Do I need to change my name?", concern: "identity" },
  { label: "How do I explain Islam to friends?", concern: "social" },
  { label: "I'm struggling with some changes", concern: "adjustment" },
  { label: "What should I learn first?", concern: "learning" },
  { label: "How do I deal with cultural expectations?", concern: "culture" },
  { label: "Are my past sins forgiven?", concern: "forgiveness" },
  { label: "Can I still celebrate holidays with family?", concern: "holidays" },
  { label: "How do I find Muslim community near me?", concern: "community" },
];

const DEFAULT_PROGRESS: ProgressData = {
  completedChapters: [],
  currentChapter: 1,
  startedAt: new Date().toISOString(),
};

const normalizeProgress = (value: any): ProgressData => {
  if (!value || typeof value !== "object") return DEFAULT_PROGRESS;
  const completedChapters = Array.isArray(value.completedChapters)
    ? value.completedChapters
        .filter(
          (chapter: unknown) =>
            typeof chapter === "number" &&
            chapter >= 1 &&
            chapter <= CHAPTERS.length,
        )
        .filter(
          (chapter: number, index: number, chapters: number[]) =>
            chapters.indexOf(chapter) === index,
        )
    : [];
  return {
    completedChapters,
    currentChapter:
      typeof value.currentChapter === "number" && value.currentChapter >= 1
        ? Math.min(value.currentChapter, CHAPTERS.length)
        : 1,
    startedAt:
      typeof value.startedAt === "string"
        ? value.startedAt
        : new Date().toISOString(),
  };
};

export default function NewMuslimScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isPremium, isScholar } = useSubscription();
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [progress, setProgress] = useState<ProgressData>(DEFAULT_PROGRESS);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiState, setAiState] = useState<AIResponseState>("loading");
  const [aiData, setAiData] = useState<AIResponseData | null>(null);
  const [aiError, setAiError] = useState<string | undefined>();
  const [aiFeatureLabel, setAiFeatureLabel] = useState("Revert Support");
  const [customQuestion, setCustomQuestion] = useState("");
  const [pendingRetry, setPendingRetry] = useState<(() => void) | null>(null);

  const emerald = isDark ? CategoryColors.emerald.dark : CategoryColors.emerald;

  const askRevertQuestion = useCallback(
    async (question: string, concern?: string) => {
      if (!isPremium) {
        setAiState("upgrade");
        setAiModalVisible(true);
        return;
      }

      setAiState("loading");
      setAiData(null);
      setAiError(undefined);
      setAiModalVisible(true);

      const doRequest = async () => {
        setAiState("loading");
        try {
          const result = await getRevertGuidance({
            question,
            concern,
            userTier: isScholar ? "scholar" : "premium",
          });
          if (!result.success) {
            setAiError(
              "NurAI could not prepare this guidance. Please try again.",
            );
            setAiState("error");
            return;
          }
          setAiData(mapAIContextResponseToModalData(result));
          setAiState("success");
        } catch (err: any) {
          if (err?.code === "UPGRADE_REQUIRED") {
            setAiState("upgrade");
          } else if (err?.code === "RATE_LIMIT") {
            setAiState("rateLimit");
          } else {
            setAiError(
              customerSafeAIErrorMessage(
                err?.message || "Unable to get guidance. Please try again.",
              ),
            );
            setAiState("error");
          }
        }
      };

      setPendingRetry(() => doRequest);
      doRequest();
    },
    [isPremium, isScholar],
  );

  const handleChapterAIPress = useCallback(() => {
    const chapter = CHAPTERS.find((c) => c.id === selectedChapter);
    if (!chapter) return;
    setAiFeatureLabel(`Ask about: ${chapter.title}`);
    askRevertQuestion(
      `I'm reading about "${chapter.title}" in the new Muslim guide. Can you help me understand this topic better and how it applies to my journey as a new Muslim?`,
      "learning",
    );
  }, [selectedChapter, askRevertQuestion]);

  const handlePrebuiltQuestion = useCallback(
    (q: (typeof REVERT_QUESTIONS)[number]) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setAiFeatureLabel("Revert Support");
      askRevertQuestion(q.label, q.concern);
    },
    [askRevertQuestion],
  );

  const handleCustomQuestion = useCallback(() => {
    if (!customQuestion.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAiFeatureLabel("Revert Support");
    askRevertQuestion(customQuestion.trim());
    setCustomQuestion("");
  }, [customQuestion, askRevertQuestion]);

  const loadProgress = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setProgress(normalizeProgress(JSON.parse(raw)));
      } else {
        const initial = {
          ...DEFAULT_PROGRESS,
          startedAt: new Date().toISOString(),
        };
        await syncedSetItem(STORAGE_KEY, JSON.stringify(initial));
        setProgress(initial);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const markChapterComplete = useCallback(async (chapterId: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setProgress((prev) => {
      const completed = prev.completedChapters.includes(chapterId)
        ? prev.completedChapters
        : [...prev.completedChapters, chapterId];
      const next = Math.min(chapterId + 1, CHAPTERS.length);
      const updated: ProgressData = {
        ...prev,
        completedChapters: completed,
        currentChapter: Math.max(prev.currentChapter, next),
      };
      syncedSetItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const openChapter = useCallback(
    (id: number) => {
      const isLocked =
        id > progress.currentChapter &&
        !progress.completedChapters.includes(id);
      if (isLocked) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Chapter locked",
          "Complete your current lesson first so the path stays simple and gentle.",
          [{ text: "Continue" }],
        );
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedChapter(id);
    },
    [progress.completedChapters, progress.currentChapter],
  );

  const getColor = (key: keyof typeof CategoryColors) => {
    const c = CategoryColors[key];
    return isDark ? c.dark : c;
  };

  if (selectedChapter !== null) {
    const chapter = CHAPTERS.find((c) => c.id === selectedChapter);
    if (!chapter) return null;
    const color = getColor(chapter.colorKey);
    const isCompleted = progress.completedChapters.includes(chapter.id);
    const prevChapter = chapter.id > 1 ? chapter.id - 1 : null;
    const nextChapter = chapter.id < CHAPTERS.length ? chapter.id + 1 : null;

    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed ? { opacity: 0.6 } : null,
            ]}
            onPress={() => setSelectedChapter(null)}
            hitSlop={8}
            testID="button-back-chapter"
          >
            <AppIcon name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText
              type="caption"
              style={{ textAlign: "center", color: theme.textSecondary }}
            >
              Chapter {chapter.id} of {CHAPTERS.length}
            </ThemedText>
            <ThemedText type="h4" style={{ textAlign: "center" }}>
              {chapter.title}
            </ThemedText>
          </View>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + 120,
          }}
        >
          {chapter.sections.map((section, sIndex) => (
            <Animated.View
              key={`s-${sIndex}`}
              entering={FadeInDown.delay(sIndex * 40).duration(350)}
            >
              {section.type === "heading" ? (
                <View style={styles.sectionHeading}>
                  <View
                    style={[styles.headingDot, { backgroundColor: color.text }]}
                  />
                  <ThemedText type="h4" style={{ flex: 1 }}>
                    {section.title}
                  </ThemedText>
                </View>
              ) : null}

              {section.type === "text" ? (
                <ThemedText
                  type="small"
                  style={[styles.bodyText, { color: theme.textSecondary }]}
                >
                  {section.body}
                </ThemedText>
              ) : null}

              {section.type === "arabic" ? (
                <View
                  style={[
                    styles.arabicCard,
                    {
                      backgroundColor: isDark
                        ? theme.backgroundSecondary
                        : theme.surfaceElevated,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <ThemedText
                    style={[styles.arabicText, { color: theme.primary }]}
                  >
                    {section.arabic}
                  </ThemedText>
                  {section.transliteration ? (
                    <ThemedText
                      type="small"
                      style={[styles.transliteration, { color: color.text }]}
                    >
                      {section.transliteration}
                    </ThemedText>
                  ) : null}
                  {section.translation ? (
                    <ThemedText
                      type="small"
                      style={{
                        color: theme.textSecondary,
                        marginTop: Spacing.xs,
                      }}
                    >
                      {section.translation}
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}

              {section.type === "steps" && section.items ? (
                <View style={{ gap: Spacing.sm }}>
                  {section.items.map((step, i) => (
                    <View
                      key={`step-${i}`}
                      style={[
                        styles.stepCard,
                        {
                          backgroundColor: theme.surfaceGlass,
                          borderColor: theme.borderSubtle,
                        },
                      ]}
                    >
                      <View style={styles.stepHeader}>
                        <View
                          style={[
                            styles.stepBadge,
                            { backgroundColor: color.bg },
                          ]}
                        >
                          <ThemedText
                            type="caption"
                            style={[
                              styles.stepBadgeText,
                              { color: color.text },
                            ]}
                          >
                            {i + 1}
                          </ThemedText>
                        </View>
                        <ThemedText type="h4" style={{ flex: 1 }}>
                          {step.title}
                        </ThemedText>
                      </View>
                      <ThemedText
                        type="small"
                        style={[
                          styles.stepDescription,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {step.description}
                      </ThemedText>
                      {step.arabic ? (
                        <View
                          style={[
                            styles.stepArabicContainer,
                            {
                              backgroundColor: isDark
                                ? theme.backgroundSecondary
                                : theme.surfaceElevated,
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.stepArabicText,
                              { color: theme.primary },
                            ]}
                          >
                            {step.arabic}
                          </ThemedText>
                          {step.transliteration ? (
                            <ThemedText
                              type="small"
                              style={[
                                styles.transliteration,
                                { color: color.text },
                              ]}
                            >
                              {step.transliteration}
                            </ThemedText>
                          ) : null}
                          {step.translation ? (
                            <ThemedText
                              type="small"
                              style={{
                                color: theme.textSecondary,
                                marginTop: 2,
                              }}
                            >
                              {step.translation}
                            </ThemedText>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}

              {section.type === "list" && section.items ? (
                <View style={{ gap: Spacing.sm }}>
                  {section.items.map((item, i) => (
                    <View
                      key={`list-${i}`}
                      style={[
                        styles.listCard,
                        {
                          backgroundColor: theme.surfaceGlass,
                          borderColor: theme.borderSubtle,
                        },
                      ]}
                    >
                      <View style={styles.listHeader}>
                        <View
                          style={[
                            styles.listDot,
                            { backgroundColor: color.text },
                          ]}
                        />
                        <ThemedText
                          type="small"
                          style={{ fontWeight: "600", flex: 1 }}
                        >
                          {item.title}
                        </ThemedText>
                      </View>
                      <ThemedText
                        type="small"
                        style={{ color: theme.textSecondary, marginLeft: 18 }}
                      >
                        {item.description}
                      </ThemedText>
                      {item.arabic ? (
                        <ThemedText
                          style={[styles.listArabic, { color: theme.primary }]}
                        >
                          {item.arabic}
                        </ThemedText>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </Animated.View>
          ))}
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.backgroundRoot,
              paddingBottom: insets.bottom + Spacing.md,
              borderTopColor: theme.borderSubtle,
            },
          ]}
        >
          <View style={styles.navRow}>
            {prevChapter ? (
              <Pressable
                style={({ pressed }) => [
                  styles.navButton,
                  { backgroundColor: theme.backgroundSecondary },
                  pressed ? { opacity: 0.7 } : null,
                ]}
                onPress={() => openChapter(prevChapter)}
                testID="button-prev-chapter"
              >
                <AppIcon name="chevron-left" size={18} color={theme.text} />
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  Previous
                </ThemedText>
              </Pressable>
            ) : (
              <View style={styles.navButton} />
            )}

            <Pressable
              style={({ pressed }) => [
                styles.markReadButton,
                {
                  backgroundColor: isCompleted
                    ? theme.backgroundSecondary
                    : theme.primary,
                },
                pressed ? { opacity: 0.8 } : null,
              ]}
              onPress={() => markChapterComplete(chapter.id)}
              testID="button-mark-read"
            >
              <AppIcon
                name={isCompleted ? "check-circle" : "check"}
                size={18}
                color={isCompleted ? theme.primary : "#FFFFFF"}
              />
              <ThemedText
                type="small"
                style={{
                  fontWeight: "700",
                  color: isCompleted ? theme.primary : "#FFFFFF",
                }}
              >
                {isCompleted ? "Completed" : "Mark as Read"}
              </ThemedText>
            </Pressable>

            {nextChapter ? (
              <Pressable
                style={({ pressed }) => [
                  styles.navButton,
                  { backgroundColor: theme.backgroundSecondary },
                  pressed ? { opacity: 0.7 } : null,
                ]}
                onPress={() => openChapter(nextChapter)}
                testID="button-next-chapter"
              >
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  Next
                </ThemedText>
                <AppIcon name="chevron-right" size={18} color={theme.text} />
              </Pressable>
            ) : (
              <View style={styles.navButton} />
            )}
          </View>
        </View>

        <AIFloatingButton
          visible={true}
          onPress={handleChapterAIPress}
          isPremium={isPremium}
          position="bottom-right"
          bottomOffset={insets.bottom + 80}
        />

        <AIResponseModal
          visible={aiModalVisible}
          onClose={() => setAiModalVisible(false)}
          state={aiState}
          data={aiData}
          onRetry={pendingRetry || undefined}
          onFollowUp={askRevertQuestion}
          errorMessage={aiError}
          featureLabel={aiFeatureLabel}
          requiredTier="premium"
        />
      </View>
    );
  }

  const completedCount = progress.completedChapters.length;
  const totalChapters = CHAPTERS.length;
  const progressPercent =
    totalChapters > 0 ? completedCount / totalChapters : 0;

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
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h4" accessibilityRole="header">
          New Muslim Guide
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={
              isDark
                ? [theme.gradientStart, theme.gradientMid]
                : [theme.gradientLightBg, theme.gradientLightBg2]
            }
            style={styles.welcomeCard}
          >
            <GeometricCardPattern color={theme.primaryText} opacity={0.012} />
            <View style={styles.welcomeIconRow}>
              <View
                style={[
                  styles.welcomeIcon,
                  { backgroundColor: theme.primaryMuted },
                ]}
              >
                <QuranIconSvg size={28} color={theme.primary} />
              </View>
            </View>
            <ThemedText
              type="h3"
              style={{ color: theme.primaryText, marginBottom: Spacing.sm }}
            >
              Welcome to Islam
            </ThemedText>
            <ThemedText
              type="small"
              style={{
                color: theme.primaryText,
                lineHeight: 22,
              }}
            >
              This guide will help you learn the essentials at your own pace.
              Take your time with each chapter and revisit them whenever you
              need.
            </ThemedText>

            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.primaryText, fontWeight: "600" }}
                >
                  Your Progress
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.primaryText }}>
                  {completedCount} / {totalChapters} chapters
                </ThemedText>
              </View>
              <View
                style={[
                  styles.progressBarBg,
                  { backgroundColor: theme.primaryMuted },
                ]}
              >
                <LinearGradient
                  colors={[theme.gradientStart, theme.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.max(progressPercent * 100, 2)}%` as any },
                  ]}
                />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <View style={styles.aiSectionHeader}>
            <View
              style={[
                styles.aiSectionIcon,
                { backgroundColor: theme.primaryMuted },
              ]}
            >
              <AIIconSvg size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">Common Concerns</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Questions every new Muslim has
              </ThemedText>
            </View>
            {!isPremium ? (
              <View
                style={[
                  styles.premiumBadgeInline,
                  {
                    backgroundColor: theme.scholarSoft,
                    borderColor: theme.scholar + "44",
                  },
                ]}
              >
                <AppIcon name="lock" size={10} color={theme.scholar} />
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.scholar,
                    fontWeight: "700",
                    fontSize: 10,
                  }}
                >
                  Premium
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View style={styles.questionsGrid}>
            {REVERT_QUESTIONS.map((q, index) => (
              <Pressable
                key={q.concern}
                style={({ pressed }) => [
                  styles.questionChip,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => handlePrebuiltQuestion(q)}
                testID={`button-revert-q-${index}`}
              >
                <GeometricCardPattern color={theme.primary} opacity={0.012} />
                <AppIcon
                  name="message-circle"
                  size={14}
                  color={theme.primary}
                />
                <ThemedText type="small" style={{ flex: 1, color: theme.text }}>
                  {q.label}
                </ThemedText>
                <AppIcon
                  name="chevron-right"
                  size={14}
                  color={theme.textMuted}
                />
              </Pressable>
            ))}
          </View>

          <View
            style={[
              styles.customQuestionRow,
              {
                borderColor: theme.borderSubtle,
                backgroundColor: theme.surfaceGlass,
              },
            ]}
          >
            <TextInput
              style={[styles.customQuestionInput, { color: theme.text }]}
              placeholder="Ask your own question"
              placeholderTextColor={theme.textMuted}
              value={customQuestion}
              onChangeText={setCustomQuestion}
              returnKeyType="send"
              onSubmitEditing={handleCustomQuestion}
              testID="input-custom-question"
            />
            <Pressable
              style={({ pressed }) => [
                styles.customQuestionButton,
                {
                  backgroundColor: customQuestion.trim()
                    ? theme.primary
                    : theme.backgroundSecondary,
                },
                pressed ? { opacity: 0.7 } : null,
              ]}
              onPress={handleCustomQuestion}
              disabled={!customQuestion.trim()}
              testID="button-send-question"
            >
              <AppIcon
                name="send"
                size={16}
                color={
                  customQuestion.trim()
                    ? theme.primaryForeground
                    : theme.textMuted
                }
              />
            </Pressable>
          </View>
        </Animated.View>

        <View style={styles.chaptersHeaderRow}>
          <ThemedText type="h4">Learning Chapters</ThemedText>
        </View>

        {CHAPTERS.map((chapter, index) => {
          const color = getColor(chapter.colorKey);
          const isCompleted = progress.completedChapters.includes(chapter.id);
          const isCurrent = progress.currentChapter === chapter.id;
          const isLocked = chapter.id > progress.currentChapter && !isCompleted;
          const sectionCount = chapter.sections.length;

          return (
            <Animated.View
              key={chapter.id}
              entering={FadeInDown.delay(100 + index * 60).duration(350)}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.chapterCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: isCompleted
                      ? emerald.text + "40"
                      : isCurrent
                        ? color.text + "40"
                        : theme.borderSubtle,
                    opacity: isLocked ? 0.6 : pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => openChapter(chapter.id)}
                testID={`chapter-${chapter.id}`}
              >
                <GeometricCardPattern color={color.text} opacity={0.012} />
                <View style={styles.chapterRow}>
                  <View
                    style={[
                      styles.chapterBadge,
                      {
                        backgroundColor: isCompleted ? emerald.bg : color.bg,
                      },
                    ]}
                  >
                    {isCompleted ? (
                      <AppIcon name="check" size={18} color={emerald.text} />
                    ) : (
                      <ThemedText
                        type="body"
                        style={{ fontWeight: "700", color: color.text }}
                      >
                        {chapter.id}
                      </ThemedText>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.chapterTitleRow}>
                      <ThemedText type="h4" style={{ flex: 1 }}>
                        {chapter.title}
                      </ThemedText>
                      {isLocked ? (
                        <AppIcon
                          name="lock"
                          size={14}
                          color={theme.textMuted}
                          style={{ marginLeft: Spacing.sm }}
                        />
                      ) : null}
                    </View>
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary, marginTop: 2 }}
                    >
                      {chapter.description}
                    </ThemedText>

                    <View style={styles.chapterMeta}>
                      <View
                        style={[
                          styles.sectionsBadge,
                          { backgroundColor: color.bg },
                        ]}
                      >
                        <AppIcon
                          name={chapter.icon}
                          size={12}
                          color={color.text}
                        />
                        <ThemedText
                          type="caption"
                          style={{
                            color: color.text,
                            fontWeight: "600",
                            marginLeft: 4,
                          }}
                        >
                          {sectionCount} sections
                        </ThemedText>
                      </View>
                      {isCompleted ? (
                        <View
                          style={[
                            styles.sectionsBadge,
                            { backgroundColor: emerald.bg },
                          ]}
                        >
                          <AppIcon
                            name="check-circle"
                            size={12}
                            color={emerald.text}
                          />
                          <ThemedText
                            type="caption"
                            style={{
                              color: emerald.text,
                              fontWeight: "600",
                              marginLeft: 4,
                            }}
                          >
                            Complete
                          </ThemedText>
                        </View>
                      ) : isCurrent ? (
                        <View
                          style={[
                            styles.sectionsBadge,
                            { backgroundColor: color.bg },
                          ]}
                        >
                          <ThemedText
                            type="caption"
                            style={{ color: color.text, fontWeight: "600" }}
                          >
                            Current
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <AppIcon
                    name="chevron-right"
                    size={20}
                    color={theme.textMuted}
                  />
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>

      <AIResponseModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        state={aiState}
        data={aiData}
        onRetry={pendingRetry || undefined}
        onFollowUp={askRevertQuestion}
        errorMessage={aiError}
        featureLabel={aiFeatureLabel}
        requiredTier="premium"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  welcomeCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  welcomeIconRow: {
    marginBottom: Spacing.md,
  },
  welcomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  progressSection: {
    marginTop: Spacing.lg,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  chapterCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  chapterBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  chapterTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chapterMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionsBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  headingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bodyText: {
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  arabicCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  arabicText: {
    fontSize: 22,
    textAlign: "right",
    lineHeight: 38,
    fontWeight: "500",
  },
  transliteration: {
    fontStyle: "italic",
    marginTop: Spacing.sm,
  },
  stepCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  stepBadgeText: {
    fontWeight: "700",
  },
  stepDescription: {
    lineHeight: 20,
    marginLeft: 44,
  },
  stepArabicContainer: {
    marginTop: Spacing.md,
    marginLeft: 44,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  stepArabicText: {
    fontSize: 20,
    textAlign: "right",
    lineHeight: 34,
    fontWeight: "500",
  },
  listCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: "hidden",
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listArabic: {
    fontSize: 18,
    textAlign: "right",
    lineHeight: 30,
    marginTop: Spacing.sm,
    marginLeft: 18,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 80,
    justifyContent: "center",
  },
  markReadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
  },
  aiSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  aiSectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumBadgeInline: {
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  questionsGrid: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  questionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  customQuestionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingLeft: Spacing.md,
    marginBottom: Spacing.xl,
  },
  customQuestionInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: Spacing.md,
  },
  customQuestionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.xs,
  },
  chaptersHeaderRow: {
    marginBottom: Spacing.md,
  },
});
