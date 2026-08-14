import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";

import {
  AIResponseData,
  AIResponseModal,
  AIResponseState,
  customerSafeAIErrorMessage,
} from "@/components/AIResponseModal";
import { ThemedText } from "@/components/ThemedText";
import {
  ArabicIconSvg,
  GoldDivider,
} from "@/components/premium/svg/PremiumSvgs";
import { BorderRadius, CategoryColors, Spacing } from "@/constants/theme";
import { useSubscription } from "@/context/SubscriptionContext";
import { useTheme } from "@/hooks/useTheme";
import {
  createDefaultArabicLearningProgress,
  buildArabicReviewRecoveryPlan,
  buildArabicReviewRetentionSummary,
  buildArabicStreakCarePlan,
  getArabicReviewScheduleStats,
  getArabicLearningProgressScore,
  getDueArabicReviewItems,
  loadArabicLearningProgress,
  registerArabicPractice,
  registerArabicPracticeOnce,
  refreshArabicReviewForToday,
  saveArabicLearningProgress,
  scheduleArabicReviewItem,
  type ArabicLevelId,
  type ArabicLearningProgress,
  type ArabicSkillKey,
  ARABIC_LEARNING_PROGRESS_TOTALS,
  getArabicLocalDateKey,
} from "@/services/arabicLearningProgressService";
import {
  buildArabicDailyCoachPlan,
  type ArabicCoachPlanStep,
} from "@/services/arabicDailyCoachPlanService";
import {
  buildArabicCorrectionLedgerPlan,
  type ArabicCorrectionLedgerPlan,
} from "@/services/arabicCorrectionLedgerService";
import {
  buildArabicQuranBridgePlan,
  toArabicQuranBridgeWord,
} from "@/services/arabicQuranBridgeService";
import {
  buildArabicTeacherReviewPacketShareText,
  buildArabicWeeklyMasteryPlan,
} from "@/services/arabicWeeklyMasteryPlanService";
import { learnTopic } from "@/services/aiContextService";
import {
  getQuranLearnedWords,
  type QuranLearnedWord,
} from "@/services/quranLearningService";
import { AppIcon, type AppIconName } from "@/components/icons";
import { recordGardenAction } from "@/services/gardenService";

type FeatherName = AppIconName;

const ALPHABET = [
  { arabic: "ا", name: "Alif", sound: "long aa / carrier" },
  { arabic: "ب", name: "Ba", sound: "b" },
  { arabic: "ت", name: "Ta", sound: "t" },
  { arabic: "ث", name: "Tha", sound: "th as in thin" },
  { arabic: "ج", name: "Jim", sound: "j" },
  { arabic: "ح", name: "Ha (deep)", sound: "deep throat h" },
  { arabic: "خ", name: "Kha", sound: "kh" },
  { arabic: "د", name: "Dal", sound: "d" },
  { arabic: "ذ", name: "Dhal", sound: "dh as in this" },
  { arabic: "ر", name: "Ra", sound: "rolled r" },
  { arabic: "ز", name: "Zay", sound: "z" },
  { arabic: "س", name: "Sin", sound: "s" },
  { arabic: "ش", name: "Shin", sound: "sh" },
  { arabic: "ص", name: "Sad", sound: "emphatic s" },
  { arabic: "ض", name: "Dad", sound: "emphatic d" },
  { arabic: "ط", name: "Ta (emphatic)", sound: "heavy t" },
  { arabic: "ظ", name: "Dha (emphatic)", sound: "heavy dh" },
  { arabic: "ع", name: "Ayn", sound: "deep voiced throat" },
  { arabic: "غ", name: "Ghayn", sound: "gh" },
  { arabic: "ف", name: "Fa", sound: "f" },
  { arabic: "ق", name: "Qaf", sound: "deep q" },
  { arabic: "ك", name: "Kaf", sound: "k" },
  { arabic: "ل", name: "Lam", sound: "l" },
  { arabic: "م", name: "Mim", sound: "m" },
  { arabic: "ن", name: "Nun", sound: "n" },
  { arabic: "ه", name: "Ha (soft)", sound: "h" },
  { arabic: "و", name: "Waw", sound: "w / oo" },
  { arabic: "ي", name: "Ya", sound: "y / ee" },
];

const JOURNEY_TRACKS: {
  id: string;
  title: string;
  subtitle: string;
  icon: FeatherName;
  progress: number;
  colorKey: keyof typeof CategoryColors;
}[] = [
  {
    id: "sounds",
    title: "Script & Sounds",
    subtitle: "Letters, joins, and mouth position",
    icon: "type",
    progress: 42,
    colorKey: "emerald",
  },
  {
    id: "dialogue",
    title: "Real Dialogue",
    subtitle: "Masjid, home, travel, study",
    icon: "message-circle",
    progress: 28,
    colorKey: "blue",
  },
  {
    id: "quran",
    title: "Quranic Words",
    subtitle: "Meaning in salah and recitation",
    icon: "book-open",
    progress: 36,
    colorKey: "amber",
  },
  {
    id: "patterns",
    title: "Sentence Patterns",
    subtitle: "Build useful sentences fast",
    icon: "layers",
    progress: 24,
    colorKey: "purple",
  },
];

const DIALOGUES = [
  {
    id: "masjid",
    title: "At the Masjid",
    goal: "Greet someone and ask how they are",
    level: "Beginner",
    lines: [
      {
        speaker: "A",
        arabic: "السَّلَامُ عَلَيْكُمْ",
        transliteration: "As-salamu alaykum",
        meaning: "Peace be upon you",
      },
      {
        speaker: "B",
        arabic: "وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللهِ",
        transliteration: "Wa alaykumu as-salam wa rahmatullah",
        meaning: "And peace and Allah's mercy be upon you",
      },
      {
        speaker: "A",
        arabic: "كَيْفَ حَالُكَ اليَوْمَ؟",
        transliteration: "Kayfa haluka al-yawm?",
        meaning: "How are you today?",
      },
      {
        speaker: "B",
        arabic: "الحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ",
        transliteration: "Alhamdulillah, ana bikhayr",
        meaning: "All praise is for Allah, I am well",
      },
    ],
  },
  {
    id: "quran-study",
    title: "Quran Study",
    goal: "Ask about a word without guessing",
    level: "Meaning",
    lines: [
      {
        speaker: "A",
        arabic: "أُرِيدُ أَنْ أَفْهَمَ هَذِهِ الآيَةَ",
        transliteration: "Uridu an afham hadhihi al-ayah",
        meaning: "I want to understand this ayah",
      },
      {
        speaker: "B",
        arabic: "نَبْدَأُ بِالكَلِمَاتِ المُهِمَّةِ",
        transliteration: "Nabda'u bil-kalimat al-muhimmah",
        meaning: "We begin with the important words",
      },
      {
        speaker: "A",
        arabic: "مَاذَا تَعْنِي كَلِمَةُ رَحْمَةٍ؟",
        transliteration: "Madha ta'ni kalimatu rahmah?",
        meaning: "What does the word rahmah mean?",
      },
      {
        speaker: "B",
        arabic: "رَحْمَةٌ تَعْنِي لُطْفًا وَإِحْسَانًا",
        transliteration: "Rahmah ta'ni lutfan wa ihsanan",
        meaning: "Rahmah means mercy, gentleness, and goodness",
      },
    ],
  },
  {
    id: "umrah",
    title: "Umrah Help",
    goal: "Ask for direction politely",
    level: "Travel",
    lines: [
      {
        speaker: "A",
        arabic: "أَيْنَ بَابُ السَّلَامِ؟",
        transliteration: "Ayna babu as-salam?",
        meaning: "Where is Bab as-Salam?",
      },
      {
        speaker: "B",
        arabic: "هُوَ أَمَامَكَ، اِمْشِ مُسْتَقِيمًا",
        transliteration: "Huwa amamaka, imshi mustaqiman",
        meaning: "It is in front of you, walk straight",
      },
      {
        speaker: "A",
        arabic: "هَلِ المَسْجِدُ قَرِيبٌ؟",
        transliteration: "Hal al-masjidu qarib?",
        meaning: "Is the mosque near?",
      },
      {
        speaker: "B",
        arabic: "نَعَمْ، هُوَ قَرِيبٌ جِدًّا",
        transliteration: "Na'am, huwa qarib jiddan",
        meaning: "Yes, it is very near",
      },
    ],
  },
  {
    id: "prayer-time",
    title: "Prayer Time",
    goal: "Ask about salah time and wudu clearly",
    level: "Daily worship",
    lines: [
      {
        speaker: "A",
        arabic: "مَتَى صَلَاةُ العَصْرِ؟",
        transliteration: "Mata salatu al-asr?",
        meaning: "When is the Asr prayer?",
      },
      {
        speaker: "B",
        arabic: "بَعْدَ قَلِيلٍ إِنْ شَاءَ اللهُ",
        transliteration: "Ba'da qalilin in sha Allah",
        meaning: "In a little while, if Allah wills",
      },
      {
        speaker: "A",
        arabic: "أَيْنَ مَكَانُ الوُضُوءِ؟",
        transliteration: "Ayna makanu al-wudu?",
        meaning: "Where is the place for wudu?",
      },
      {
        speaker: "B",
        arabic: "هُنَاكَ، قُرْبَ البَابِ",
        transliteration: "Hunaka, qurba al-bab",
        meaning: "Over there, near the door",
      },
    ],
  },
  {
    id: "home-family",
    title: "At Home",
    goal: "Speak gently about simple daily needs",
    level: "Family",
    lines: [
      {
        speaker: "A",
        arabic: "مَاذَا تَفْعَلُ الآنَ؟",
        transliteration: "Madha taf'alu al-an?",
        meaning: "What are you doing now?",
      },
      {
        speaker: "B",
        arabic: "أَقْرَأُ كِتَابًا مُفِيدًا",
        transliteration: "Aqra'u kitaban mufidan",
        meaning: "I am reading a beneficial book",
      },
      {
        speaker: "A",
        arabic: "هَلْ تُرِيدُ الشَّايَ؟",
        transliteration: "Hal turidu ash-shay?",
        meaning: "Do you want tea?",
      },
      {
        speaker: "B",
        arabic: "نَعَمْ، جَزَاكَ اللهُ خَيْرًا",
        transliteration: "Na'am, jazakallahu khayran",
        meaning: "Yes, may Allah reward you with good",
      },
    ],
  },
  {
    id: "market-water",
    title: "Market & Water",
    goal: "Buy something and ask for what you need",
    level: "Travel",
    lines: [
      {
        speaker: "A",
        arabic: "بِكَمْ هَذَا؟",
        transliteration: "Bikam hadha?",
        meaning: "How much is this?",
      },
      {
        speaker: "B",
        arabic: "هَذَا بِعَشَرَةِ رِيَالَاتٍ",
        transliteration: "Hadha bi'asharati riyalat",
        meaning: "This is ten riyals",
      },
      {
        speaker: "A",
        arabic: "هَلْ عِنْدَكَ مَاءٌ؟",
        transliteration: "Hal 'indaka ma'un?",
        meaning: "Do you have water?",
      },
      {
        speaker: "B",
        arabic: "نَعَمْ، عِنْدِي مَاءٌ بَارِدٌ",
        transliteration: "Na'am, 'indi ma'un barid",
        meaning: "Yes, I have cold water",
      },
    ],
  },
  {
    id: "study-feelings",
    title: "Study Feelings",
    goal: "Explain effort, tiredness, and review needs",
    level: "Speaking",
    lines: [
      {
        speaker: "A",
        arabic: "أَشْعُرُ بِالتَّعَبِ",
        transliteration: "Ash'uru bit-ta'ab",
        meaning: "I feel tired",
      },
      {
        speaker: "B",
        arabic: "خُذْ قَلِيلًا مِنَ الرَّاحَةِ",
        transliteration: "Khudh qalilan mina ar-rahah",
        meaning: "Take a little rest",
      },
      {
        speaker: "A",
        arabic: "أَحْتَاجُ إِلَى المُرَاجَعَةِ",
        transliteration: "Ahtaju ila al-muraja'ah",
        meaning: "I need review",
      },
      {
        speaker: "B",
        arabic: "نُرَاجِعُ خُطْوَةً خُطْوَةً",
        transliteration: "Nuraji'u khutwatan khutwatan",
        meaning: "We review step by step",
      },
    ],
  },
  {
    id: "teacher-help",
    title: "With a Teacher",
    goal: "Ask for reading help and repeat correctly",
    level: "Correction",
    lines: [
      {
        speaker: "A",
        arabic: "يَا أُسْتَاذُ، كَيْفَ أَقْرَأُ هَذِهِ الكَلِمَةَ؟",
        transliteration: "Ya ustadh, kayfa aqra'u hadhihi al-kalimah?",
        meaning: "Teacher, how do I read this word?",
      },
      {
        speaker: "B",
        arabic: "اِقْرَأْهَا بِهُدُوءٍ: الرَّحْمَةُ",
        transliteration: "Iqra'ha bihudu': ar-rahmah",
        meaning: "Read it calmly: ar-rahmah",
      },
      {
        speaker: "A",
        arabic: "هَلْ أُعِيدُهَا؟",
        transliteration: "Hal u'iduha?",
        meaning: "Should I repeat it?",
      },
      {
        speaker: "B",
        arabic: "نَعَمْ، أَعِدْهَا مَرَّةً أُخْرَى",
        transliteration: "Na'am, a'idha marratan ukhra",
        meaning: "Yes, repeat it one more time",
      },
    ],
  },
  {
    id: "hotel-stay",
    title: "Hotel Stay",
    goal: "Ask for room basics during travel",
    level: "Travel",
    lines: [
      {
        speaker: "A",
        arabic: "أَيْنَ مِفْتَاحُ الغُرْفَةِ؟",
        transliteration: "Ayna miftahu al-ghurfah?",
        meaning: "Where is the room key?",
      },
      {
        speaker: "B",
        arabic: "المِفْتَاحُ هُنَا",
        transliteration: "Al-miftahu huna",
        meaning: "The key is here",
      },
      {
        speaker: "A",
        arabic: "أُرِيدُ مَاءً مِنْ فَضْلِكَ",
        transliteration: "Uridu ma'an min fadlik",
        meaning: "I would like water, please",
      },
      {
        speaker: "B",
        arabic: "تَفَضَّلْ، هَذَا مَاءٌ",
        transliteration: "Tafaddal, hadha ma'",
        meaning: "Here you are, this is water",
      },
    ],
  },
  {
    id: "airport-arrival",
    title: "Airport Arrival",
    goal: "Find transport and ask for simple help",
    level: "Travel",
    lines: [
      {
        speaker: "A",
        arabic: "أَيْنَ مَكَانُ السَّيَّارَاتِ؟",
        transliteration: "Ayna makanu as-sayyarat?",
        meaning: "Where is the car pickup area?",
      },
      {
        speaker: "B",
        arabic: "اِتْبَعِ اللَّافِتَةَ إِلَى الخَارِجِ",
        transliteration: "Ittabi' al-lafitah ila al-kharij",
        meaning: "Follow the sign to the outside",
      },
      {
        speaker: "A",
        arabic: "هَلْ يُمْكِنُكَ مُسَاعَدَتِي؟",
        transliteration: "Hal yumkinuka musa'adati?",
        meaning: "Can you help me?",
      },
      {
        speaker: "B",
        arabic: "نَعَمْ، أَنَا أُسَاعِدُكَ",
        transliteration: "Na'am, ana usa'iduka",
        meaning: "Yes, I will help you",
      },
    ],
  },
  {
    id: "asking-directions",
    title: "Asking Directions",
    goal: "Move through a city without guessing",
    level: "Travel",
    lines: [
      {
        speaker: "A",
        arabic: "كَيْفَ أَذْهَبُ إِلَى المَسْجِدِ؟",
        transliteration: "Kayfa adhhabu ila al-masjid?",
        meaning: "How do I go to the mosque?",
      },
      {
        speaker: "B",
        arabic: "اِذْهَبْ يَمِينًا ثُمَّ يَسَارًا",
        transliteration: "Idhhab yaminan thumma yasaran",
        meaning: "Go right, then left",
      },
      {
        speaker: "A",
        arabic: "هَلْ هُوَ بَعِيدٌ؟",
        transliteration: "Hal huwa ba'id?",
        meaning: "Is it far?",
      },
      {
        speaker: "B",
        arabic: "لَا، هُوَ قَرِيبٌ",
        transliteration: "La, huwa qarib",
        meaning: "No, it is near",
      },
    ],
  },
  {
    id: "doctor-visit",
    title: "Doctor Visit",
    goal: "Explain a simple need with calm language",
    level: "Care",
    lines: [
      {
        speaker: "A",
        arabic: "أَشْعُرُ بِأَلَمٍ فِي رَأْسِي",
        transliteration: "Ash'uru bi-alamin fi ra'si",
        meaning: "I feel pain in my head",
      },
      {
        speaker: "B",
        arabic: "مُنْذُ مَتَى تَشْعُرُ بِذَلِكَ؟",
        transliteration: "Mundhu mata tash'uru bidhalik?",
        meaning: "Since when have you felt that?",
      },
      {
        speaker: "A",
        arabic: "مُنْذُ هَذَا الصَّبَاحِ",
        transliteration: "Mundhu hadha as-sabah",
        meaning: "Since this morning",
      },
      {
        speaker: "B",
        arabic: "اِشْرَبْ مَاءً وَاسْتَرِحْ قَلِيلًا",
        transliteration: "Ishrab ma'an wastarih qalilan",
        meaning: "Drink water and rest a little",
      },
    ],
  },
  {
    id: "charity-kindness",
    title: "Charity & Kindness",
    goal: "Offer help and respond with gratitude",
    level: "Character",
    lines: [
      {
        speaker: "A",
        arabic: "هَلْ تَحْتَاجُ إِلَى مُسَاعَدَةٍ؟",
        transliteration: "Hal tahtaju ila musa'adah?",
        meaning: "Do you need help?",
      },
      {
        speaker: "B",
        arabic: "نَعَمْ، أَحْتَاجُ إِلَى الطَّعَامِ",
        transliteration: "Na'am, ahtaju ila at-ta'am",
        meaning: "Yes, I need food",
      },
      {
        speaker: "A",
        arabic: "تَفَضَّلْ، هَذَا لَكَ",
        transliteration: "Tafaddal, hadha laka",
        meaning: "Here you are, this is for you",
      },
      {
        speaker: "B",
        arabic: "شُكْرًا، جَزَاكَ اللهُ خَيْرًا",
        transliteration: "Shukran, jazakallahu khayran",
        meaning: "Thank you, may Allah reward you with good",
      },
    ],
  },
  {
    id: "reading-circle",
    title: "Reading Circle",
    goal: "Ask to read, listen, and correct gently",
    level: "Study",
    lines: [
      {
        speaker: "A",
        arabic: "هَلْ أَقْرَأُ الآنَ؟",
        transliteration: "Hal aqra'u al-an?",
        meaning: "Should I read now?",
      },
      {
        speaker: "B",
        arabic: "نَعَمْ، اِقْرَأْ بِصَوْتٍ وَاضِحٍ",
        transliteration: "Na'am, iqra' bisawtin wadih",
        meaning: "Yes, read with a clear voice",
      },
      {
        speaker: "A",
        arabic: "هَلْ القِرَاءَةُ صَحِيحَةٌ؟",
        transliteration: "Hal al-qira'atu sahihah?",
        meaning: "Is the reading correct?",
      },
      {
        speaker: "B",
        arabic: "نَعَمْ، وَلَكِنْ أَعِدِ الكَلِمَةَ الأُولَى",
        transliteration: "Na'am, walakin a'id al-kalimah al-ula",
        meaning: "Yes, but repeat the first word",
      },
    ],
  },
  {
    id: "family-visit",
    title: "Family Visit",
    goal: "Welcome family and ask about their journey",
    level: "Family",
    lines: [
      {
        speaker: "A",
        arabic: "أَهْلًا وَسَهْلًا بِكُمْ",
        transliteration: "Ahlan wa sahlan bikum",
        meaning: "Welcome to you all",
      },
      {
        speaker: "B",
        arabic: "شُكْرًا، سُرِرْنَا بِلِقَائِكُمْ",
        transliteration: "Shukran, surirna biliqa'ikum",
        meaning: "Thank you, we are happy to meet you",
      },
      {
        speaker: "A",
        arabic: "كَيْفَ كَانَ السَّفَرُ؟",
        transliteration: "Kayfa kana as-safar?",
        meaning: "How was the journey?",
      },
      {
        speaker: "B",
        arabic: "كَانَ السَّفَرُ طَوِيلًا وَلَكِنْ سَهْلًا",
        transliteration: "Kana as-safaru tawilan walakin sahlan",
        meaning: "The journey was long but easy",
      },
    ],
  },
  {
    id: "lost-meeting-point",
    title: "Lost & Meeting Point",
    goal: "Explain you are lost and agree where to meet",
    level: "Safety",
    lines: [
      {
        speaker: "A",
        arabic: "أَنَا تَائِهٌ، هَلْ تُسَاعِدُنِي؟",
        transliteration: "Ana ta'ih, hal tusa'iduni?",
        meaning: "I am lost. Can you help me?",
      },
      {
        speaker: "B",
        arabic: "نَعَمْ، أَيْنَ تُرِيدُ أَنْ تَذْهَبَ؟",
        transliteration: "Na'am, ayna turidu an tadhhaba?",
        meaning: "Yes, where do you want to go?",
      },
      {
        speaker: "A",
        arabic: "أُرِيدُ أَنْ أَذْهَبَ إِلَى نُقْطَةِ اللِّقَاءِ",
        transliteration: "Uridu an adhhab ila nuqtati al-liqa'",
        meaning: "I want to go to the meeting point",
      },
      {
        speaker: "B",
        arabic: "اِمْشِ مَعِي، هِيَ قَرِيبَةٌ",
        transliteration: "Imshi ma'i, hiya qaribah",
        meaning: "Walk with me, it is nearby",
      },
    ],
  },
  {
    id: "halal-food",
    title: "Halal Food",
    goal: "Ask clearly about food and ingredients",
    level: "Travel",
    lines: [
      {
        speaker: "A",
        arabic: "هَلْ هَذَا الطَّعَامُ حَلَالٌ؟",
        transliteration: "Hal hadha at-ta'amu halal?",
        meaning: "Is this food halal?",
      },
      {
        speaker: "B",
        arabic: "نَعَمْ، هَذَا طَعَامٌ حَلَالٌ",
        transliteration: "Na'am, hadha ta'amun halal",
        meaning: "Yes, this is halal food",
      },
      {
        speaker: "A",
        arabic: "هَلْ فِيهِ لَحْمٌ؟",
        transliteration: "Hal fihi lahm?",
        meaning: "Does it contain meat?",
      },
      {
        speaker: "B",
        arabic: "لَا، فِيهِ خُضَارٌ وَأَرُزٌّ",
        transliteration: "La, fihi khudarun wa aruzz",
        meaning: "No, it has vegetables and rice",
      },
    ],
  },
  {
    id: "work-study",
    title: "Work & Study",
    goal: "Talk about tasks, time, and help politely",
    level: "Daily life",
    lines: [
      {
        speaker: "A",
        arabic: "عِنْدِي عَمَلٌ كَثِيرٌ اليَوْمَ",
        transliteration: "'Indi 'amalun kathirun al-yawm",
        meaning: "I have a lot of work today",
      },
      {
        speaker: "B",
        arabic: "نُرَتِّبُ الوَقْتَ مَعًا",
        transliteration: "Nurattibu al-waqta ma'an",
        meaning: "We will organise the time together",
      },
      {
        speaker: "A",
        arabic: "هَلْ تُسَاعِدُنِي فِي هَذَا الدَّرْسِ؟",
        transliteration: "Hal tusa'iduni fi hadha ad-dars?",
        meaning: "Will you help me with this lesson?",
      },
      {
        speaker: "B",
        arabic: "نَعَمْ، نَبْدَأُ بِالسُّؤَالِ الأَوَّلِ",
        transliteration: "Na'am, nabda'u bis-su'al al-awwal",
        meaning: "Yes, we begin with the first question",
      },
    ],
  },
  {
    id: "parent-child",
    title: "Parent & Child",
    goal: "Use kind family Arabic for reminders and care",
    level: "Family",
    lines: [
      {
        speaker: "A",
        arabic: "يَا بُنَيَّ، حَانَ وَقْتُ الصَّلَاةِ",
        transliteration: "Ya bunayya, hana waqtus-salah",
        meaning: "My dear child, it is time for prayer",
      },
      {
        speaker: "B",
        arabic: "نَعَمْ، سَأَتَوَضَّأُ الآنَ",
        transliteration: "Na'am, sa'atawadda'u al-an",
        meaning: "Yes, I will make wudu now",
      },
      {
        speaker: "A",
        arabic: "بَعْدَ الصَّلَاةِ نُرَاجِعُ دَرْسَكَ",
        transliteration: "Ba'da as-salah nuraji'u darsaka",
        meaning: "After prayer we will review your lesson",
      },
      {
        speaker: "B",
        arabic: "جَيِّدٌ، أُرِيدُ أَنْ أَتَعَلَّمَ أَكْثَرَ",
        transliteration: "Jayyid, uridu an ata'allama akthar",
        meaning: "Good, I want to learn more",
      },
    ],
  },
  {
    id: "ask-clarification",
    title: "Ask for Clarification",
    goal: "Slow the conversation down and check meaning",
    level: "Speaking",
    lines: [
      {
        speaker: "A",
        arabic: "مِنْ فَضْلِكَ، تَكَلَّمْ بِبُطْءٍ",
        transliteration: "Min fadlik, takallam bibut'",
        meaning: "Please speak slowly",
      },
      {
        speaker: "B",
        arabic: "طَيِّبٌ، أُعِيدُ الجُمْلَةَ",
        transliteration: "Tayyib, u'idu al-jumlah",
        meaning: "Okay, I will repeat the sentence",
      },
      {
        speaker: "A",
        arabic: "مَاذَا تَعْنِي هَذِهِ الكَلِمَةُ؟",
        transliteration: "Madha ta'ni hadhihi al-kalimah?",
        meaning: "What does this word mean?",
      },
      {
        speaker: "B",
        arabic: "تَعْنِي أَنَّ الأَمْرَ سَهْلٌ",
        transliteration: "Ta'ni anna al-amra sahl",
        meaning: "It means that the matter is easy",
      },
    ],
  },
];

const PATTERNS = [
  {
    pattern: "أُرِيدُ أَنْ ...",
    meaning: "I want to...",
    exampleArabic: "أُرِيدُ أَنْ أَتَعَلَّمَ",
    exampleMeaning: "I want to learn",
  },
  {
    pattern: "أَيْنَ ...؟",
    meaning: "Where is...?",
    exampleArabic: "أَيْنَ المَسْجِدُ؟",
    exampleMeaning: "Where is the mosque?",
  },
  {
    pattern: "مَاذَا يَعْنِي ...؟",
    meaning: "What does ... mean?",
    exampleArabic: "مَاذَا يَعْنِي نُورٌ؟",
    exampleMeaning: "What does nur mean?",
  },
  {
    pattern: "هَلْ يُمْكِنُكَ ...؟",
    meaning: "Can you...?",
    exampleArabic: "هَلْ يُمْكِنُكَ مُسَاعَدَتِي؟",
    exampleMeaning: "Can you help me?",
  },
  {
    pattern: "عِنْدِي ...",
    meaning: "I have...",
    exampleArabic: "عِنْدِي وَقْتٌ قَلِيلٌ",
    exampleMeaning: "I have a little time",
  },
  {
    pattern: "أَحْتَاجُ إِلَى ...",
    meaning: "I need...",
    exampleArabic: "أَحْتَاجُ إِلَى المُرَاجَعَةِ",
    exampleMeaning: "I need review",
  },
  {
    pattern: "لَا أَفْهَمُ ...",
    meaning: "I do not understand...",
    exampleArabic: "لَا أَفْهَمُ هَذِهِ الكَلِمَةَ",
    exampleMeaning: "I do not understand this word",
  },
  {
    pattern: "نُرَاجِعُ ...",
    meaning: "We review...",
    exampleArabic: "نُرَاجِعُ خُطْوَةً خُطْوَةً",
    exampleMeaning: "We review step by step",
  },
];

const QURANIC_WORDS = [
  {
    arabic: "نُور",
    transliteration: "Nur",
    meaning: "Light",
    note: "A word of guidance, clarity, and spiritual light.",
    source: "Quran 24:35",
  },
  {
    arabic: "رَحْمَة",
    transliteration: "Rahmah",
    meaning: "Mercy",
    note: "Mercy, care, kindness, and compassion.",
    source: "Quran 21:107",
  },
  {
    arabic: "هُدًى",
    transliteration: "Huda",
    meaning: "Guidance",
    note: "Direction from Allah toward what is true and good.",
    source: "Quran 2:2",
  },
  {
    arabic: "قَلْب",
    transliteration: "Qalb",
    meaning: "Heart",
    note: "The inner heart that turns, feels, chooses, and believes.",
    source: "Quran 26:89",
  },
  {
    arabic: "صَبْر",
    transliteration: "Sabr",
    meaning: "Patience",
    note: "Steadiness, restraint, and perseverance through difficulty.",
    source: "Quran 2:153",
  },
  {
    arabic: "تَقْوَى",
    transliteration: "Taqwa",
    meaning: "God-consciousness",
    note: "Awareness of Allah that protects choices and actions.",
    source: "Quran 2:197",
  },
  {
    arabic: "شُكْر",
    transliteration: "Shukr",
    meaning: "Gratitude",
    note: "Recognising a blessing and responding with thanks and obedience.",
    source: "Quran 14:7",
  },
  {
    arabic: "ذِكْر",
    transliteration: "Dhikr",
    meaning: "Remembrance",
    note: "Remembering Allah with the tongue, heart, and actions.",
    source: "Quran 13:28",
  },
  {
    arabic: "حَقّ",
    transliteration: "Haqq",
    meaning: "Truth and right",
    note: "What is true, due, real, and rightly owed.",
    source: "Quran 17:81",
  },
  {
    arabic: "خَيْر",
    transliteration: "Khayr",
    meaning: "Good",
    note: "Goodness, benefit, and what is better in outcome.",
    source: "Quran 3:110",
  },
];

const MASTERY_LADDER: {
  title: string;
  subtitle: string;
  icon: FeatherName;
}[] = [
  {
    title: "Hear it",
    subtitle: "Recognise the sound before trying to produce it.",
    icon: "headphones",
  },
  {
    title: "Say it",
    subtitle: "Repeat aloud and notice mouth position.",
    icon: "mic",
  },
  {
    title: "Understand it",
    subtitle: "Connect Arabic to meaning, not only English words.",
    icon: "search",
  },
  {
    title: "Use it",
    subtitle: "Put the phrase into a real dialogue.",
    icon: "message-circle",
  },
  {
    title: "Review it",
    subtitle: "Return tomorrow so the word actually stays.",
    icon: "repeat",
  },
];

interface CanDoMission {
  id: string;
  mode: string;
  title: string;
  target: string;
  evidence: string;
  progress: number;
  actionLabel: string;
  prompt: string;
  icon: FeatherName;
  colorKey: keyof typeof CategoryColors;
}

interface ProficiencyLane {
  id: string;
  label: string;
  title: string;
  evidence: string;
  progress: number;
  prompt: string;
  icon: FeatherName;
  colorKey: keyof typeof CategoryColors;
}

interface ArabicLevelMilestone {
  id: ArabicLevelId;
  level: string;
  title: string;
  promise: string;
  requirement: string;
  evidence: string;
  progress: number;
  ctaLabel: string;
  prompt: string;
  icon: FeatherName;
  colorKey: keyof typeof CategoryColors;
}

interface ArabicReviewFocus {
  id: string;
  label: string;
  title: string;
  evidence: string;
  progress: number;
  actionLabel: string;
  prompt: string;
  icon: FeatherName;
  colorKey: keyof typeof CategoryColors;
}

interface ArabicSkillPortfolioItem {
  id: string;
  label: string;
  title: string;
  evidence: string;
  progress: number;
  actionLabel: string;
  prompt: string;
  icon: FeatherName;
  colorKey: keyof typeof CategoryColors;
}

interface ArabicDailyDrillStep {
  id: string;
  title: string;
  detail: string;
  modeLabel?: string;
  proofLabel?: string;
  actionLabel?: string;
  prompt?: string;
  progress: number;
  icon: FeatherName;
  colorKey: keyof typeof CategoryColors;
}

interface ArabicAssessmentMetric {
  id: string;
  label: string;
  title: string;
  evidence: string;
  progress: number;
  prompt: string;
  icon: FeatherName;
  colorKey: keyof typeof CategoryColors;
}

const PLACEMENT_SKILLS: {
  id: ArabicSkillKey;
  label: string;
  subtitle: string;
  icon: FeatherName;
  colorKey: keyof typeof CategoryColors;
}[] = [
  {
    id: "sounds",
    label: "Sounds",
    subtitle: "Letters and pronunciation",
    icon: "volume-2",
    colorKey: "emerald",
  },
  {
    id: "dialogue",
    label: "Dialogue",
    subtitle: "Reply in real moments",
    icon: "message-circle",
    colorKey: "blue",
  },
  {
    id: "meaning",
    label: "Meaning",
    subtitle: "Understand Quranic words",
    icon: "book-open",
    colorKey: "amber",
  },
  {
    id: "sentence",
    label: "Sentences",
    subtitle: "Build your own lines",
    icon: "edit-3",
    colorKey: "purple",
  },
];

const PLACEMENT_RATINGS = [
  { value: 1, label: "New" },
  { value: 2, label: "Know" },
  { value: 3, label: "Use" },
  { value: 4, label: "Explain" },
] as const;

const SPEAKING_CONFIDENCE_RATINGS = [
  { value: 1, label: "Hard" },
  { value: 2, label: "Almost" },
  { value: 3, label: "Clear" },
  { value: 4, label: "Natural" },
] as const;

const MEANING_LENSES: {
  title: string;
  subtitle: string;
  example: string;
  prompt: string;
  icon: FeatherName;
}[] = [
  {
    title: "Question tools",
    subtitle: "Ask where, when, what, and how without freezing.",
    example: "أَيْنَ / مَتَى / مَاذَا / كَيْفَ",
    prompt:
      "Teach me the Arabic question tools ayna, mata, madha, and kayfa using the current dialogue. Give Arabic, transliteration, meaning, and one mini quiz.",
    icon: "help-circle",
  },
  {
    title: "Possession",
    subtitle: "Say I have, you have, and where something is.",
    example: "عِنْدِي مَاءٌ / عِنْدَكَ كِتَابٌ",
    prompt:
      "Teach me beginner Arabic possession with 'indi and 'indaka. Use examples from travel, masjid, and home dialogue.",
    icon: "archive",
  },
  {
    title: "Verb starts",
    subtitle: "Recognise common first-person actions in speech.",
    example: "أُرِيدُ / أَحْتَاجُ / أَقْرَأُ",
    prompt:
      "Teach me the Arabic first-person verb starters uridu, ahtaju, and aqra'u. Include pronunciation, meaning, and three practice sentences.",
    icon: "play-circle",
  },
  {
    title: "Root meaning",
    subtitle: "Notice how related words carry a family of meaning.",
    example: "رَحْمَة / الرَّحْمٰن / رَحِيم",
    prompt:
      "Explain the Arabic root idea behind rahmah, ar-Rahman, and Rahim in beginner language. Keep it language-focused and avoid giving a religious ruling.",
    icon: "git-branch",
  },
];

const REVIEW_TASKS: {
  id: string;
  title: string;
  subtitle: string;
  xp: number;
  icon: FeatherName;
}[] = [
  {
    id: "letters",
    title: "Read 6 letters out loud",
    subtitle: "Tap mastered letters as you practise them.",
    xp: 8,
    icon: "type",
  },
  {
    id: "dialogue",
    title: "Shadow one dialogue twice",
    subtitle: "Listen, repeat, then swap speaker roles.",
    xp: 12,
    icon: "message-circle",
  },
  {
    id: "patterns",
    title: "Build 3 sentences from patterns",
    subtitle: "Use the sentence cards below as templates.",
    xp: 10,
    icon: "layers",
  },
  {
    id: "quranic-words",
    title: "Review 4 Quranic words",
    subtitle: "Say the Arabic and meaning before checking.",
    xp: 10,
    icon: "book-open",
  },
];

type DialogueLine = (typeof DIALOGUES)[number]["lines"][number];
type SentencePattern = (typeof PATTERNS)[number];
type QuranicWord = (typeof QURANIC_WORDS)[number];

function normalizeArabicPracticeText(value: string) {
  return value
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .trim();
}

function getTokenOverlapScore(learnerText: string, targetText: string) {
  const learnerTokens = new Set(learnerText.split(" ").filter(Boolean));
  const targetTokens = targetText.split(" ").filter(Boolean);
  if (!learnerTokens.size || !targetTokens.length) return 0;
  const matched = targetTokens.filter((token) => learnerTokens.has(token));
  const targetChars = targetText.replace(/\s+/g, "").length;
  const learnerChars = learnerText.replace(/\s+/g, "").length;
  const coverage = Math.min(1, learnerChars / Math.max(1, targetChars));
  return Math.round(
    (matched.length / targetTokens.length) * 100 * Math.min(1, coverage * 1.15),
  );
}

function getMeaningfulContainmentScore(
  learnerText: string,
  targetText: string,
) {
  if (!learnerText || !targetText) return 0;
  const targetChars = targetText.replace(/\s+/g, "").length;
  const learnerChars = learnerText.replace(/\s+/g, "").length;
  if (learnerText.includes(targetText)) return 94;
  if (targetText.includes(learnerText) && learnerChars >= targetChars * 0.62) {
    return 84;
  }
  return 0;
}

function getDialogueReplyMatchScore(draft: string, reply: DialogueLine) {
  const learnerText = normalizeArabicPracticeText(draft);
  if (!learnerText) return 0;

  const arabicTarget = normalizeArabicPracticeText(reply.arabic);
  const transliterationTarget = normalizeArabicPracticeText(
    reply.transliteration,
  );

  if (learnerText === arabicTarget || learnerText === transliterationTarget) {
    return 100;
  }

  return Math.max(
    getMeaningfulContainmentScore(learnerText, arabicTarget),
    getMeaningfulContainmentScore(learnerText, transliterationTarget),
    getTokenOverlapScore(learnerText, arabicTarget),
    getTokenOverlapScore(learnerText, transliterationTarget),
  );
}

function getSentencePatternAnchor(pattern: string) {
  return normalizeArabicPracticeText(
    pattern.replace("...", "").replace("؟", ""),
  );
}

function getSentencePatternMatchScore(draft: string, pattern: SentencePattern) {
  const learnerText = normalizeArabicPracticeText(draft);
  if (!learnerText) return 0;

  const patternAnchor = getSentencePatternAnchor(pattern.pattern);
  const exampleTarget = normalizeArabicPracticeText(pattern.exampleArabic);

  if (learnerText === exampleTarget) return 100;
  const learnerTokenCount = learnerText.split(" ").filter(Boolean).length;
  const anchorTokenCount = patternAnchor.split(" ").filter(Boolean).length;
  const anchorScore =
    patternAnchor &&
    learnerText.includes(patternAnchor) &&
    learnerTokenCount > anchorTokenCount
      ? 78
      : 0;
  return Math.max(
    anchorScore,
    getTokenOverlapScore(learnerText, exampleTarget),
    getTokenOverlapScore(learnerText, patternAnchor),
  );
}

function normalizeMeaningPracticeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[-–—]/g, " ")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .trim();
}

function getQuranicWordMeaningMatchScore(draft: string, word: QuranicWord) {
  const learnerText = normalizeMeaningPracticeText(draft);
  if (!learnerText) return 0;

  const meaningTarget = normalizeMeaningPracticeText(word.meaning);
  const noteTarget = normalizeMeaningPracticeText(word.note);
  const exactScore =
    learnerText === meaningTarget
      ? 100
      : learnerText.includes(meaningTarget)
        ? 94
        : getMeaningfulContainmentScore(learnerText, meaningTarget);

  return Math.max(
    exactScore,
    getTokenOverlapScore(learnerText, meaningTarget),
    Math.round(getTokenOverlapScore(learnerText, noteTarget) * 0.82),
  );
}

function getArabicRubricBand(progress: number) {
  if (progress >= 82) return "Independent";
  if (progress >= 55) return "Building";
  if (progress >= 28) return "Emerging";
  return "Starter";
}

function cappedRecord(
  record: Record<string, number>,
  limit: number,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit),
  );
}

function cappedTextRecord(
  record: Record<string, string>,
  limit: number,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => value.trim().length > 0)
      .slice(-limit),
  );
}

function reviewTitleFromKey(key: string) {
  return key
    .replace(/^listen:/, "")
    .replace(/^draft:/, "your sentence")
    .replace(/:/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
}

export default function ArabicLearningScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {
    isPremium,
    isScholar,
    loading: subscriptionLoading,
  } = useSubscription();
  const [learningProgress, setLearningProgress] =
    useState<ArabicLearningProgress>(createDefaultArabicLearningProgress);
  const learningProgressRef = useRef<ArabicLearningProgress>(
    createDefaultArabicLearningProgress(),
  );
  const progressLoadPromiseRef = useRef<Promise<void> | null>(null);
  const progressReadyRef = useRef(false);
  const progressSaveQueueRef = useRef(Promise.resolve());
  const [progressLoading, setProgressLoading] = useState(true);
  const [selectedDialogueId, setSelectedDialogueId] = useState(DIALOGUES[0].id);
  const [dialogueTurnIndex, setDialogueTurnIndex] = useState(0);
  const [showDialogueReply, setShowDialogueReply] = useState(false);
  const [dialogueReplyDraft, setDialogueReplyDraft] = useState("");
  const [dialogueAttemptFeedback, setDialogueAttemptFeedback] = useState("");
  const [dictationDraft, setDictationDraft] = useState("");
  const [dictationFeedback, setDictationFeedback] = useState("");
  const [conversationRoundFeedback, setConversationRoundFeedback] =
    useState("");
  const [showDictationAnswer, setShowDictationAnswer] = useState(false);
  const [sentenceDrafts, setSentenceDrafts] = useState<Record<string, string>>(
    {},
  );
  const [sentenceFeedbackByPattern, setSentenceFeedbackByPattern] = useState<
    Record<string, string>
  >({});
  const [wordRecallDraft, setWordRecallDraft] = useState("");
  const [wordRecallFeedback, setWordRecallFeedback] = useState("");
  const [showDailyWordMeaning, setShowDailyWordMeaning] = useState(false);
  const [quranSavedWords, setQuranSavedWords] = useState<QuranLearnedWord[]>(
    [],
  );
  const [speakingArabicKey, setSpeakingArabicKey] = useState<string | null>(
    null,
  );
  const [audioPlaybackIssue, setAudioPlaybackIssue] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [placementProfileFeedback, setPlacementProfileFeedback] = useState("");
  const [aiVisible, setAiVisible] = useState(false);
  const [aiState, setAiState] = useState<AIResponseState>("loading");
  const [aiData, setAiData] = useState<AIResponseData | null>(null);
  const [aiError, setAiError] = useState<string | undefined>();
  const [aiFeatureLabel, setAiFeatureLabel] = useState("Arabic Tutor");
  const [lastArabicTutorIntent, setLastArabicTutorIntent] = useState(
    "Create a short Arabic role-play drill. Include Arabic, transliteration, English meaning, and three corrections a beginner should watch for.",
  );

  const selectedDialogue = useMemo(
    () =>
      DIALOGUES.find((dialogue) => dialogue.id === selectedDialogueId) ??
      DIALOGUES[0],
    [selectedDialogueId],
  );
  const currentDialogueTurnIndex = selectedDialogue.lines.length
    ? dialogueTurnIndex % selectedDialogue.lines.length
    : 0;
  const replyDialogueTurnIndex = selectedDialogue.lines.length
    ? (dialogueTurnIndex + 1) % selectedDialogue.lines.length
    : 0;
  const currentDialogueTurn =
    selectedDialogue.lines[currentDialogueTurnIndex] ??
    selectedDialogue.lines[0];
  const replyDialogueTurn =
    selectedDialogue.lines[replyDialogueTurnIndex] ?? selectedDialogue.lines[0];
  const replyAttemptKey = `${selectedDialogue.id}:${currentDialogueTurnIndex}:${replyDialogueTurnIndex}`;
  const dictationKey = `${selectedDialogue.id}:${currentDialogueTurnIndex}`;

  useEffect(() => {
    setDialogueTurnIndex(0);
    setShowDialogueReply(false);
    setDialogueReplyDraft("");
    setDialogueAttemptFeedback("");
    setDictationDraft("");
    setDictationFeedback("");
    setConversationRoundFeedback("");
    setShowDictationAnswer(false);
  }, [selectedDialogueId]);

  useEffect(() => {
    learningProgressRef.current = learningProgress;
  }, [learningProgress]);

  const selectedLetters = useMemo(
    () => new Set(learningProgress.masteredLetterIndexes),
    [learningProgress.masteredLetterIndexes],
  );

  useEffect(() => {
    let mounted = true;
    const loadTask = loadArabicLearningProgress()
      .then((savedProgress) => {
        if (!mounted) return;
        learningProgressRef.current = savedProgress;
        setLearningProgress(savedProgress);
      })
      .catch(() => {})
      .finally(() => {
        progressReadyRef.current = true;
        if (mounted) setProgressLoading(false);
      });
    progressLoadPromiseRef.current = loadTask;

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    getQuranLearnedWords()
      .then((words) => {
        if (mounted) setQuranSavedWords(words);
      })
      .catch(() => {
        if (mounted) setQuranSavedWords([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(
    () => () => {
      Speech.stop().catch(() => {});
    },
    [],
  );

  const starterDailyWord = useMemo(() => {
    const index = new Date().getDate() % QURANIC_WORDS.length;
    return QURANIC_WORDS[index];
  }, []);
  const quranReaderWord = useMemo(() => {
    const savedWords = quranSavedWords.filter((word) =>
      word.arabicWord?.trim(),
    );
    if (!savedWords.length) return null;
    return savedWords[new Date().getDate() % savedWords.length];
  }, [quranSavedWords]);
  const dailyWord = useMemo(
    () => toArabicQuranBridgeWord(quranReaderWord, starterDailyWord),
    [quranReaderWord, starterDailyWord],
  );

  const trackProgress = useMemo(
    () =>
      getArabicLearningProgressScore(
        learningProgress,
        ARABIC_LEARNING_PROGRESS_TOTALS,
      ),
    [learningProgress],
  );

  const todayLearningProgress = useMemo(
    () => refreshArabicReviewForToday(learningProgress),
    [learningProgress],
  );

  const persistLearningProgress = useCallback(
    async (
      nextProgressOrUpdater:
        | ArabicLearningProgress
        | ((current: ArabicLearningProgress) => ArabicLearningProgress),
    ) => {
      if (!progressReadyRef.current && progressLoadPromiseRef.current) {
        await progressLoadPromiseRef.current;
      }
      const currentProgress = learningProgressRef.current;
      const nextProgress =
        typeof nextProgressOrUpdater === "function"
          ? nextProgressOrUpdater(currentProgress)
          : nextProgressOrUpdater;

      learningProgressRef.current = nextProgress;
      setLearningProgress(nextProgress);

      const saveTask = progressSaveQueueRef.current.then(() =>
        saveArabicLearningProgress(nextProgress),
      );
      progressSaveQueueRef.current = saveTask.catch(() => {});
      await saveTask.catch(() => {});
    },
    [],
  );

  useEffect(() => {
    if (progressLoading) return;
    if (
      todayLearningProgress.reviewDate !== learningProgress.reviewDate ||
      todayLearningProgress.completedReviewTaskIds.length !==
        learningProgress.completedReviewTaskIds.length
    ) {
      persistLearningProgress(todayLearningProgress);
    }
  }, [
    learningProgress,
    persistLearningProgress,
    progressLoading,
    todayLearningProgress,
  ]);

  const overallProgressScore = Math.round(
    (trackProgress.letters +
      trackProgress.dialogues +
      trackProgress.patterns +
      trackProgress.words) /
      4,
  );

  const completedReviewCount =
    todayLearningProgress.completedReviewTaskIds.length;
  const dueArabicReviewItems = useMemo(
    () => getDueArabicReviewItems(todayLearningProgress).slice(0, 4),
    [todayLearningProgress],
  );
  const arabicReviewScheduleStats = useMemo(
    () => getArabicReviewScheduleStats(todayLearningProgress),
    [todayLearningProgress],
  );
  const arabicRetentionSummary = useMemo(
    () => buildArabicReviewRetentionSummary(todayLearningProgress),
    [todayLearningProgress],
  );
  const arabicReviewRecoveryPlan = useMemo(
    () => buildArabicReviewRecoveryPlan(todayLearningProgress),
    [todayLearningProgress],
  );
  const arabicStreakCarePlan = useMemo(
    () => buildArabicStreakCarePlan(todayLearningProgress),
    [todayLearningProgress],
  );
  const audioListenTotal = useMemo(
    () =>
      Object.values(learningProgress.audioListenCounts).reduce(
        (sum, count) => sum + count,
        0,
      ),
    [learningProgress.audioListenCounts],
  );
  const selectedDialoguePracticeCount =
    learningProgress.dialoguePracticeCounts[selectedDialogue.id] ?? 0;
  const selectedDialogueAudioListenTotal = useMemo(
    () =>
      Object.entries(learningProgress.audioListenCounts)
        .filter(
          ([key]) =>
            key.startsWith(`turn:${selectedDialogue.id}:`) ||
            key.startsWith(`reply:${selectedDialogue.id}:`) ||
            key.startsWith(`dialogue:${selectedDialogue.id}:`) ||
            key.startsWith(`dictation-listen:${selectedDialogue.id}:`),
        )
        .reduce((sum, [, count]) => sum + count, 0),
    [learningProgress.audioListenCounts, selectedDialogue.id],
  );
  const selectedDialogueReplyAttemptTotal = useMemo(
    () =>
      Object.entries(learningProgress.dialogueReplyAttemptCounts)
        .filter(([key]) => key.startsWith(`${selectedDialogue.id}:`))
        .reduce((sum, [, count]) => sum + count, 0),
    [learningProgress.dialogueReplyAttemptCounts, selectedDialogue.id],
  );
  const selectedDialogueReplyCorrectTotal = useMemo(
    () =>
      Object.entries(learningProgress.dialogueReplyCorrectCounts)
        .filter(([key]) => key.startsWith(`${selectedDialogue.id}:`))
        .reduce((sum, [, count]) => sum + count, 0),
    [learningProgress.dialogueReplyCorrectCounts, selectedDialogue.id],
  );
  const selectedDialogueDictationAttemptTotal = useMemo(
    () =>
      Object.entries(learningProgress.dictationAttemptCounts)
        .filter(([key]) => key.startsWith(`${selectedDialogue.id}:`))
        .reduce((sum, [, count]) => sum + count, 0),
    [learningProgress.dictationAttemptCounts, selectedDialogue.id],
  );
  const selectedDialogueDictationStrongTotal = useMemo(
    () =>
      Object.entries(learningProgress.dictationStrongCounts)
        .filter(([key]) => key.startsWith(`${selectedDialogue.id}:`))
        .reduce((sum, [, count]) => sum + count, 0),
    [learningProgress.dictationStrongCounts, selectedDialogue.id],
  );
  const currentLineShadowKey = `${selectedDialogue.id}:${currentDialogueTurnIndex}`;
  const currentLineShadowCount =
    learningProgress.speakingShadowCounts[currentLineShadowKey] ?? 0;
  const currentLineSpeakingConfidence =
    learningProgress.speakingConfidenceRatings[currentLineShadowKey] ?? 0;
  const selectedDialogueShadowRepTotal = useMemo(
    () =>
      Object.entries(learningProgress.speakingShadowCounts)
        .filter(([key]) => key.startsWith(`${selectedDialogue.id}:`))
        .reduce((sum, [, count]) => sum + count, 0),
    [learningProgress.speakingShadowCounts, selectedDialogue.id],
  );
  const selectedDialogueConfidenceRatings = useMemo(
    () =>
      Object.entries(learningProgress.speakingConfidenceRatings)
        .filter(([key]) => key.startsWith(`${selectedDialogue.id}:`))
        .map(([, rating]) => rating),
    [learningProgress.speakingConfidenceRatings, selectedDialogue.id],
  );
  const selectedDialogueConfidentLineCount = useMemo(
    () =>
      selectedDialogueConfidenceRatings.filter((rating) => rating >= 3).length,
    [selectedDialogueConfidenceRatings],
  );
  const selectedDialogueConfidenceAverage = useMemo(() => {
    if (!selectedDialogueConfidenceRatings.length) return 0;
    const ratingTotal = selectedDialogueConfidenceRatings.reduce(
      (sum, rating) => sum + rating,
      0,
    );
    return Math.round(
      (ratingTotal / (selectedDialogueConfidenceRatings.length * 4)) * 100,
    );
  }, [selectedDialogueConfidenceRatings]);
  const pronunciationConfidenceProgress = useMemo(
    () =>
      Math.min(
        100,
        Math.round(
          selectedDialogueAudioListenTotal * 8 +
            selectedDialogueShadowRepTotal * 12 +
            selectedDialogueConfidentLineCount * 18 +
            currentLineSpeakingConfidence * 7,
        ),
      ),
    [
      currentLineSpeakingConfidence,
      selectedDialogueAudioListenTotal,
      selectedDialogueConfidentLineCount,
      selectedDialogueShadowRepTotal,
    ],
  );
  const selectedConversationRoundCount =
    learningProgress.conversationRoundCounts[selectedDialogue.id] ?? 0;
  const selectedConversationRoundStrongCount =
    learningProgress.conversationRoundStrongCounts[selectedDialogue.id] ?? 0;
  const conversationRoundLineCount = Math.max(1, selectedDialogue.lines.length);
  const conversationRoundSteps = useMemo<ArabicDailyDrillStep[]>(
    () => [
      {
        id: "listen",
        title: "Hear every line",
        detail: `${Math.min(selectedDialogueAudioListenTotal, conversationRoundLineCount)}/${conversationRoundLineCount} dialogue listens`,
        progress: Math.min(
          100,
          Math.round(
            (selectedDialogueAudioListenTotal / conversationRoundLineCount) *
              100,
          ),
        ),
        icon: "headphones",
        colorKey: "emerald",
      },
      {
        id: "dictate",
        title: "Catch what was said",
        detail: `${Math.min(selectedDialogueDictationAttemptTotal, conversationRoundLineCount)}/${conversationRoundLineCount} listen-and-type attempts`,
        progress: Math.min(
          100,
          Math.round(
            (selectedDialogueDictationAttemptTotal /
              conversationRoundLineCount) *
              100,
          ),
        ),
        icon: "edit-2",
        colorKey: "amber",
      },
      {
        id: "reply",
        title: "Answer as the other speaker",
        detail: `${Math.min(selectedDialogueReplyAttemptTotal, conversationRoundLineCount)}/${conversationRoundLineCount} saved replies`,
        progress: Math.min(
          100,
          Math.round(
            (selectedDialogueReplyAttemptTotal / conversationRoundLineCount) *
              100,
          ),
        ),
        icon: "message-square",
        colorKey: "blue",
      },
      {
        id: "shadow",
        title: "Shadow and swap roles",
        detail: `${Math.min(selectedDialoguePracticeCount, 2)}/2 shadow rounds`,
        progress: Math.min(100, selectedDialoguePracticeCount * 50),
        icon: "repeat",
        colorKey: "purple",
      },
    ],
    [
      conversationRoundLineCount,
      selectedDialogueAudioListenTotal,
      selectedDialogueDictationAttemptTotal,
      selectedDialoguePracticeCount,
      selectedDialogueReplyAttemptTotal,
    ],
  );
  const conversationRoundProgress = useMemo(
    () =>
      Math.round(
        conversationRoundSteps.reduce((sum, step) => sum + step.progress, 0) /
          conversationRoundSteps.length,
      ),
    [conversationRoundSteps],
  );
  const canSaveConversationRound = useMemo(
    () =>
      conversationRoundProgress >= 50 &&
      conversationRoundSteps.every((step) => step.progress > 0),
    [conversationRoundProgress, conversationRoundSteps],
  );
  const dialogueReplyAttemptCount =
    learningProgress.dialogueReplyAttemptCounts[replyAttemptKey] ?? 0;
  const dialogueReplyCorrectCount =
    learningProgress.dialogueReplyCorrectCounts[replyAttemptKey] ?? 0;
  const dialogueReplyMatchScore = useMemo(
    () => getDialogueReplyMatchScore(dialogueReplyDraft, replyDialogueTurn),
    [dialogueReplyDraft, replyDialogueTurn],
  );
  const dictationAttemptCount =
    learningProgress.dictationAttemptCounts[dictationKey] ?? 0;
  const dictationStrongCount =
    learningProgress.dictationStrongCounts[dictationKey] ?? 0;
  const dictationMatchScore = useMemo(
    () => getDialogueReplyMatchScore(dictationDraft, currentDialogueTurn),
    [currentDialogueTurn, dictationDraft],
  );
  const sentenceBuilderAttemptTotal = useMemo(
    () =>
      Object.values(learningProgress.sentenceBuilderAttemptCounts).reduce(
        (sum, count) => sum + count,
        0,
      ),
    [learningProgress.sentenceBuilderAttemptCounts],
  );
  const sentenceBuilderStrongTotal = useMemo(
    () =>
      Object.values(learningProgress.sentenceBuilderStrongCounts).reduce(
        (sum, count) => sum + count,
        0,
      ),
    [learningProgress.sentenceBuilderStrongCounts],
  );
  const wordMeaningAttemptTotal = useMemo(
    () =>
      Object.values(learningProgress.wordMeaningAttemptCounts).reduce(
        (sum, count) => sum + count,
        0,
      ),
    [learningProgress.wordMeaningAttemptCounts],
  );
  const wordMeaningStrongTotal = useMemo(
    () =>
      Object.values(learningProgress.wordMeaningStrongCounts).reduce(
        (sum, count) => sum + count,
        0,
      ),
    [learningProgress.wordMeaningStrongCounts],
  );
  const dailyWordMeaningAttemptCount =
    learningProgress.wordMeaningAttemptCounts[dailyWord.arabic] ?? 0;
  const dailyWordMeaningStrongCount =
    learningProgress.wordMeaningStrongCounts[dailyWord.arabic] ?? 0;
  const dailyWordAudioListenCount =
    learningProgress.audioListenCounts[`word:${dailyWord.arabic}`] ?? 0;
  const dailyWordMeaningMatchScore = useMemo(
    () => getQuranicWordMeaningMatchScore(wordRecallDraft, dailyWord),
    [dailyWord, wordRecallDraft],
  );
  const arabicQuranBridgePlan = useMemo(
    () =>
      buildArabicQuranBridgePlan({
        savedWords: quranSavedWords,
        fallbackWord: starterDailyWord,
        recallAttemptCount: dailyWordMeaningAttemptCount,
      }),
    [dailyWordMeaningAttemptCount, quranSavedWords, starterDailyWord],
  );
  const placementAverageScore = useMemo(() => {
    const total = PLACEMENT_SKILLS.reduce(
      (sum, skill) => sum + (learningProgress.skillSelfRatings[skill.id] ?? 0),
      0,
    );
    return Math.round((total / (PLACEMENT_SKILLS.length * 4)) * 100);
  }, [learningProgress.skillSelfRatings]);
  const unratedPlacementSkills = useMemo(
    () =>
      PLACEMENT_SKILLS.filter(
        (skill) => (learningProgress.skillSelfRatings[skill.id] ?? 0) <= 0,
      ),
    [learningProgress.skillSelfRatings],
  );
  const canSavePlacementProfile = unratedPlacementSkills.length === 0;

  const dailyFluencyDrill = useMemo<ArabicDailyDrillStep[]>(
    () => [
      {
        id: "hear",
        title: "Hear and write the line",
        detail: `${selectedDialogue.title}: listen, type, then reveal`,
        modeLabel: "Listen",
        proofLabel: `${selectedDialogueDictationAttemptTotal} dictations`,
        actionLabel: "Run dictation",
        prompt: `Run a listen-and-type Arabic dictation for "${selectedDialogue.title}". Use one short line, make me predict what I heard before revealing, then show Arabic, transliteration, meaning, and one sound cue.`,
        progress: Math.min(
          100,
          selectedDialogueAudioListenTotal * 12 +
            selectedDialogueDictationAttemptTotal * 22 +
            selectedDialogueDictationStrongTotal * 26,
        ),
        icon: "headphones",
        colorKey: "emerald",
      },
      {
        id: "reply",
        title: "Reply without freezing",
        detail: `Answer Speaker ${currentDialogueTurn.speaker}, then shadow it aloud`,
        modeLabel: "Speak",
        proofLabel: `${selectedDialogueReplyAttemptTotal} saved replies`,
        actionLabel: "Coach reply",
        prompt: `Run an Arabic reply drill for "${selectedDialogue.title}". Give me the current prompt, ask me to answer before reveal, then show the expected reply, transliteration, meaning, and one gentle correction.`,
        progress: Math.min(
          100,
          selectedDialogueReplyAttemptTotal * 24 +
            selectedDialogueReplyCorrectTotal * 18 +
            selectedConversationRoundCount * 16 +
            selectedConversationRoundStrongCount * 20 +
            selectedDialogueShadowRepTotal * 5 +
            selectedDialogueConfidentLineCount * 10,
        ),
        icon: "message-square",
        colorKey: "blue",
      },
      {
        id: "build",
        title: "Build your own sentence",
        detail: "Adapt one pattern to something you would actually say",
        modeLabel: "Write",
        proofLabel: `${sentenceBuilderAttemptTotal} sentences`,
        actionLabel: "Build sentence",
        prompt:
          "Run a short Arabic sentence-builder drill. Give one useful beginner pattern, ask me to write my own version first, then show a model answer, transliteration, meaning, and one correction.",
        progress: Math.min(
          100,
          sentenceBuilderAttemptTotal * 22 + sentenceBuilderStrongTotal * 18,
        ),
        icon: "edit-3",
        colorKey: "purple",
      },
      {
        id: "meaning",
        title: "Explain the meaning",
        detail: `${dailyWord.transliteration}: recall before checking`,
        modeLabel: "Quran word",
        proofLabel: `${dailyWordMeaningAttemptCount} recalls`,
        actionLabel: "Recall word",
        prompt: `Run a Quranic Arabic recall drill for "${dailyWord.arabic}" (${dailyWord.transliteration}). Ask me to explain the meaning before revealing, then show Arabic, transliteration, meaning, one careful language note, and no religious ruling.`,
        progress: Math.min(
          100,
          dailyWordMeaningAttemptCount * 28 + dailyWordMeaningStrongCount * 22,
        ),
        icon: "book-open",
        colorKey: "amber",
      },
      {
        id: "retain",
        title: "Schedule tomorrow",
        detail: `${arabicReviewScheduleStats.scheduledCount} items in smart review`,
        modeLabel: "Retain",
        proofLabel: `${completedReviewCount}/${REVIEW_TASKS.length} today`,
        actionLabel: "Plan review",
        prompt:
          "Run my Arabic retention drill. Use one sound, one dialogue line, one sentence pattern, and one Quranic word. Make me recall before revealing each answer, then schedule tomorrow's review.",
        progress: Math.min(
          100,
          Math.round(
            (completedReviewCount / REVIEW_TASKS.length) * 72 +
              Math.min(28, arabicReviewScheduleStats.scheduledCount * 4),
          ),
        ),
        icon: "repeat",
        colorKey: "rose",
      },
    ],
    [
      arabicReviewScheduleStats.scheduledCount,
      completedReviewCount,
      currentDialogueTurn.speaker,
      dailyWord.arabic,
      dailyWord.transliteration,
      dailyWordMeaningAttemptCount,
      dailyWordMeaningStrongCount,
      selectedDialogue.title,
      selectedDialogueAudioListenTotal,
      selectedDialogueDictationAttemptTotal,
      selectedDialogueDictationStrongTotal,
      selectedDialogueReplyAttemptTotal,
      selectedDialogueReplyCorrectTotal,
      selectedDialogueConfidentLineCount,
      selectedDialogueShadowRepTotal,
      selectedConversationRoundCount,
      selectedConversationRoundStrongCount,
      sentenceBuilderAttemptTotal,
      sentenceBuilderStrongTotal,
    ],
  );

  const dailyFluencyProgress = useMemo(
    () =>
      Math.round(
        dailyFluencyDrill.reduce((sum, step) => sum + step.progress, 0) /
          dailyFluencyDrill.length,
      ),
    [dailyFluencyDrill],
  );

  const arabicSkillPortfolio = useMemo<ArabicSkillPortfolioItem[]>(
    () => [
      {
        id: "listening-proof",
        label: "Listening",
        title: "Hear Arabic before reading the help",
        evidence: `${audioListenTotal} listen reps • ${selectedDialogueDictationAttemptTotal} dictations • ${selectedDialogueDictationStrongTotal} strong`,
        progress: Math.min(
          100,
          Math.round(
            audioListenTotal * 3 +
              selectedDialogueDictationAttemptTotal * 14 +
              selectedDialogueDictationStrongTotal * 20,
          ),
        ),
        actionLabel: "Hear next line",
        prompt: `Build a listening drill from "${selectedDialogue.title}". Play one short Arabic line in text form, ask me to predict the meaning first, then show Arabic, transliteration, meaning, and one sound cue.`,
        icon: "headphones",
        colorKey: "emerald",
      },
      {
        id: "dialogue-proof",
        label: "Dialogue",
        title: "Reply in a real exchange",
        evidence: `${selectedDialogueReplyAttemptTotal} replies • ${selectedDialogueShadowRepTotal} shadow reps • ${selectedConversationRoundCount} rounds`,
        progress: Math.min(
          100,
          Math.round(
            selectedDialogueReplyAttemptTotal * 13 +
              selectedDialogueReplyCorrectTotal * 19 +
              selectedDialogueShadowRepTotal * 5 +
              selectedDialogueConfidentLineCount * 12 +
              selectedConversationRoundCount * 14 +
              selectedConversationRoundStrongCount * 22,
          ),
        ),
        actionLabel: "Coach reply",
        prompt: `Build a dialogue drill for "${selectedDialogue.title}". Give one realistic Arabic prompt, make me answer before revealing, then show the expected reply, transliteration, meaning, and one correction.`,
        icon: "message-square",
        colorKey: "blue",
      },
      {
        id: "writing-proof",
        label: "Writing",
        title: "Produce your own useful sentence",
        evidence: `${sentenceBuilderAttemptTotal} sentences • ${sentenceBuilderStrongTotal} strong pattern matches`,
        progress: Math.min(
          100,
          Math.round(
            trackProgress.patterns * 0.28 +
              sentenceBuilderAttemptTotal * 12 +
              sentenceBuilderStrongTotal * 20,
          ),
        ),
        actionLabel: "Build sentence",
        prompt:
          "Build a writing drill for my Arabic. Give one beginner sentence pattern, ask me to write my own sentence first, then show Arabic, transliteration, meaning, and one correction.",
        icon: "edit-3",
        colorKey: "purple",
      },
      {
        id: "quran-word-proof",
        label: "Quran words",
        title: "Explain meaning with care",
        evidence: `${wordMeaningAttemptTotal} recalls • ${wordMeaningStrongTotal} strong • ${trackProgress.words}% word path`,
        progress: Math.min(
          100,
          Math.round(
            trackProgress.words * 0.34 +
              wordMeaningAttemptTotal * 10 +
              wordMeaningStrongTotal * 20,
          ),
        ),
        actionLabel: "Recall word",
        prompt: `Build a Quranic Arabic drill for "${dailyWord.arabic}" (${dailyWord.transliteration}). Ask me to explain it first, then show meaning, transliteration, one careful language note, and no religious ruling.`,
        icon: "book-open",
        colorKey: "amber",
      },
      {
        id: "review-proof",
        label: "Review",
        title: "Bring it back tomorrow",
        evidence: `${completedReviewCount}/${REVIEW_TASKS.length} review tasks today • ${arabicReviewScheduleStats.scheduledCount} scheduled`,
        progress: Math.min(
          100,
          Math.round(
            (completedReviewCount / REVIEW_TASKS.length) * 58 +
              Math.min(26, arabicReviewScheduleStats.scheduledCount * 4) +
              Math.min(16, learningProgress.streakDays * 3),
          ),
        ),
        actionLabel: "Run review",
        prompt:
          "Build a review session for my Arabic practice. Use one sound, one dialogue reply, one sentence, and one Quranic word. Make me recall before revealing each answer.",
        icon: "repeat",
        colorKey: "rose",
      },
    ],
    [
      arabicReviewScheduleStats.scheduledCount,
      audioListenTotal,
      completedReviewCount,
      dailyWord.arabic,
      dailyWord.transliteration,
      learningProgress.streakDays,
      selectedDialogue.title,
      selectedDialogueDictationAttemptTotal,
      selectedDialogueDictationStrongTotal,
      selectedDialogueReplyAttemptTotal,
      selectedDialogueReplyCorrectTotal,
      selectedDialogueConfidentLineCount,
      selectedDialogueShadowRepTotal,
      selectedConversationRoundCount,
      selectedConversationRoundStrongCount,
      sentenceBuilderAttemptTotal,
      sentenceBuilderStrongTotal,
      trackProgress.patterns,
      trackProgress.words,
      wordMeaningAttemptTotal,
      wordMeaningStrongTotal,
    ],
  );

  const portfolioAverage = useMemo(
    () =>
      Math.round(
        arabicSkillPortfolio.reduce((sum, item) => sum + item.progress, 0) /
          arabicSkillPortfolio.length,
      ),
    [arabicSkillPortfolio],
  );

  const dailyFluencyPrompt = useMemo(
    () =>
      `Run today's complete Arabic fluency workout for "${selectedDialogue.title}". Use five parts: listen-and-type dictation, repeat, reply, build one sentence, explain the Quranic word "${dailyWord.arabic}" (${dailyWord.transliteration}), and schedule tomorrow's review. Use Arabic, transliteration, meaning, one correction, and one tap-friendly follow-up for each part.`,
    [dailyWord.arabic, dailyWord.transliteration, selectedDialogue.title],
  );

  const assessmentRubric = useMemo<ArabicAssessmentMetric[]>(
    () => [
      {
        id: "interpretive",
        label: "Interpretive",
        title: "Understands what is heard or read",
        evidence: `${audioListenTotal} listens, ${selectedDialogueDictationAttemptTotal} dictations, ${selectedLetters.size}/28 letters`,
        progress: Math.min(
          100,
          Math.round(
            trackProgress.letters * 0.32 +
              trackProgress.words * 0.36 +
              audioListenTotal * 2 +
              selectedDialogueDictationAttemptTotal * 8 +
              selectedDialogueDictationStrongTotal * 14,
          ),
        ),
        prompt:
          "Assess my Arabic interpretive skill. Give one heard/read line, ask what I understand first, then show Arabic, transliteration, meaning, and one listening cue.",
        icon: "headphones",
        colorKey: "emerald",
      },
      {
        id: "interpersonal",
        label: "Interpersonal",
        title: "Replies in real dialogue",
        evidence: `${selectedDialogueReplyAttemptTotal} replies, ${selectedDialogueReplyCorrectTotal} strong, ${selectedConversationRoundCount} full rounds`,
        progress: Math.min(
          100,
          selectedDialoguePracticeCount * 16 +
            selectedDialogueReplyAttemptTotal * 13 +
            selectedDialogueReplyCorrectTotal * 21 +
            selectedConversationRoundCount * 14 +
            selectedConversationRoundStrongCount * 20,
        ),
        prompt: `Assess my Arabic conversation skill through "${selectedDialogue.title}". Give two realistic turns, model replies, transliteration, meaning, and a correction.`,
        icon: "message-circle",
        colorKey: "blue",
      },
      {
        id: "presentational",
        label: "Presentational",
        title: "Explains meaning clearly",
        evidence: `${wordMeaningAttemptTotal} recalls, ${wordMeaningStrongTotal} strong explanations`,
        progress: Math.min(
          100,
          Math.round(
            trackProgress.words * 0.42 +
              wordMeaningAttemptTotal * 9 +
              wordMeaningStrongTotal * 18,
          ),
        ),
        prompt: `Assess my ability to explain Quranic Arabic. Use "${dailyWord.arabic}" (${dailyWord.transliteration}), make me explain first, then show a careful language-focused model answer.`,
        icon: "book-open",
        colorKey: "amber",
      },
      {
        id: "literacy",
        label: "Literacy",
        title: "Builds and reads useful sentences",
        evidence: `${sentenceBuilderAttemptTotal} sentences, ${sentenceBuilderStrongTotal} strong, ${trackProgress.patterns}% pattern path`,
        progress: Math.min(
          100,
          Math.round(
            trackProgress.patterns * 0.44 +
              sentenceBuilderAttemptTotal * 10 +
              sentenceBuilderStrongTotal * 18,
          ),
        ),
        prompt:
          "Assess my Arabic sentence literacy. Give one pattern, make me produce a sentence, then show the model answer, transliteration, meaning, and one grammar cue.",
        icon: "edit-3",
        colorKey: "purple",
      },
      {
        id: "retention",
        label: "Retention",
        title: "Keeps Arabic alive over time",
        evidence: `${arabicReviewScheduleStats.dueCount} due, ${arabicReviewScheduleStats.scheduledCount} scheduled, ${learningProgress.streakDays} day streak`,
        progress: Math.min(
          100,
          Math.round(
            (completedReviewCount / REVIEW_TASKS.length) * 45 +
              Math.min(35, arabicReviewScheduleStats.scheduledCount * 5) +
              Math.min(20, learningProgress.streakDays * 4),
          ),
        ),
        prompt:
          "Assess my Arabic retention. Build a recall-first review using due items, one dialogue line, one sentence pattern, and one Quranic word.",
        icon: "repeat",
        colorKey: "rose",
      },
    ],
    [
      arabicReviewScheduleStats.dueCount,
      arabicReviewScheduleStats.scheduledCount,
      audioListenTotal,
      completedReviewCount,
      dailyWord.arabic,
      dailyWord.transliteration,
      learningProgress.streakDays,
      selectedDialogue.title,
      selectedDialogueDictationAttemptTotal,
      selectedDialogueDictationStrongTotal,
      selectedDialoguePracticeCount,
      selectedDialogueReplyAttemptTotal,
      selectedDialogueReplyCorrectTotal,
      selectedConversationRoundCount,
      selectedConversationRoundStrongCount,
      selectedLetters.size,
      sentenceBuilderAttemptTotal,
      sentenceBuilderStrongTotal,
      trackProgress.letters,
      trackProgress.patterns,
      trackProgress.words,
      wordMeaningAttemptTotal,
      wordMeaningStrongTotal,
    ],
  );

  const canDoMissions = useMemo<CanDoMission[]>(
    () => [
      {
        id: "sound-check",
        mode: "Listen & read",
        title: "I can recognise and pronounce a new phrase",
        target: "Use letters, mouth cues, and transliteration together.",
        evidence: `${selectedLetters.size}/28 letters known • ${audioListenTotal} listens • ${selectedDialogueDictationAttemptTotal} dictations`,
        progress: Math.min(
          100,
          Math.round(
            trackProgress.letters * 0.72 +
              audioListenTotal * 2 +
              selectedDialogueDictationAttemptTotal * 8 +
              selectedDialogueDictationStrongTotal * 12,
          ),
        ),
        actionLabel: "Sound check",
        prompt:
          "Run a can-do Arabic sound check for me. Use six letters I may know, one short phrase from beginner dialogue, mouth-position cues, transliteration, and a quick self-check.",
        icon: "headphones",
        colorKey: "emerald",
      },
      {
        id: "real-conversation",
        mode: "Speak with someone",
        title: "I can handle a real conversation",
        target: `Use "${selectedDialogue.title}" without freezing.`,
        evidence: `${selectedDialoguePracticeCount} shadow reps, ${selectedDialogueReplyAttemptTotal} saved replies, ${selectedConversationRoundCount} full rounds`,
        progress: Math.min(
          100,
          selectedDialoguePracticeCount * 22 +
            selectedDialogueAudioListenTotal * 5 +
            selectedDialogueReplyAttemptTotal * 10 +
            selectedDialogueReplyCorrectTotal * 18 +
            selectedConversationRoundCount * 16 +
            selectedConversationRoundStrongCount * 20,
        ),
        actionLabel: "Role-play",
        prompt: `Test my can-do ability for "${selectedDialogue.title}". Give me one realistic Arabic line at a time, then show the ideal reply, meaning, transliteration, and one gentle correction.`,
        icon: "message-circle",
        colorKey: "blue",
      },
      {
        id: "explain-meaning",
        mode: "Explain meaning",
        title: "I can explain what a Quranic word means",
        target: `Teach ${dailyWord.transliteration} in simple language.`,
        evidence: `${wordMeaningAttemptTotal} meaning recalls, ${wordMeaningStrongTotal} strong`,
        progress: Math.min(
          100,
          Math.round(
            trackProgress.words * 0.55 +
              wordMeaningAttemptTotal * 8 +
              wordMeaningStrongTotal * 18,
          ),
        ),
        actionLabel: "Meaning check",
        prompt: `Check if I can explain the Quranic Arabic word "${dailyWord.arabic}" (${dailyWord.transliteration}). Ask me one question, then give Arabic, transliteration, meaning, and a careful non-ruling note.`,
        icon: "book-open",
        colorKey: "amber",
      },
      {
        id: "make-sentences",
        mode: "Use it yourself",
        title: "I can build my own useful sentence",
        target: "Turn one pattern into a sentence for daily life.",
        evidence: `${sentenceBuilderAttemptTotal} written sentences, ${sentenceBuilderStrongTotal} strong`,
        progress: Math.min(
          100,
          Math.round(
            trackProgress.patterns * 0.45 +
              sentenceBuilderAttemptTotal * 10 +
              sentenceBuilderStrongTotal * 18,
          ),
        ),
        actionLabel: "Build",
        prompt:
          "Give me a can-do sentence builder drill. Start with one beginner pattern, ask me to make a sentence, then show Arabic, transliteration, meaning, and one common mistake.",
        icon: "edit-3",
        colorKey: "purple",
      },
      {
        id: "daily-retention",
        mode: "Review tomorrow",
        title: "I can remember it after a day",
        target: "Complete the daily loop so Arabic stays with you.",
        evidence: `${completedReviewCount}/${REVIEW_TASKS.length} review tasks today`,
        progress: Math.round(
          (completedReviewCount / REVIEW_TASKS.length) * 100,
        ),
        actionLabel: "Review coach",
        prompt:
          "Coach me through a five-minute Arabic spaced review. Include one sound, one dialogue line, one sentence pattern, and one Quranic word with Arabic, transliteration, and meaning.",
        icon: "repeat",
        colorKey: "rose",
      },
    ],
    [
      completedReviewCount,
      dailyWord,
      audioListenTotal,
      selectedDialogueDictationAttemptTotal,
      selectedDialogueDictationStrongTotal,
      selectedDialogueAudioListenTotal,
      selectedDialogue.title,
      selectedDialoguePracticeCount,
      selectedDialogueReplyAttemptTotal,
      selectedDialogueReplyCorrectTotal,
      selectedConversationRoundCount,
      selectedConversationRoundStrongCount,
      selectedLetters.size,
      sentenceBuilderAttemptTotal,
      sentenceBuilderStrongTotal,
      trackProgress.letters,
      trackProgress.patterns,
      trackProgress.words,
      wordMeaningAttemptTotal,
      wordMeaningStrongTotal,
    ],
  );

  const proficiencyCompass = useMemo<ProficiencyLane[]>(
    () => [
      {
        id: "interpretive",
        label: "Listen & read",
        title: "I can recognise what I hear or see",
        evidence: `${audioListenTotal} listen reps, ${selectedDialogueDictationAttemptTotal} dictations, ${trackProgress.words}% Quranic words`,
        progress: Math.min(
          100,
          Math.round(
            (trackProgress.letters + trackProgress.words) / 2 +
              audioListenTotal * 2 +
              selectedDialogueDictationAttemptTotal * 7 +
              selectedDialogueDictationStrongTotal * 12,
          ),
        ),
        prompt:
          "Run an Arabic interpretive practice check. Give me one short line from beginner dialogue, ask what I understand, then show Arabic, transliteration, meaning, and one listening cue.",
        icon: "headphones",
        colorKey: "emerald",
      },
      {
        id: "interpersonal",
        label: "Dialogue",
        title: "I can reply in a real exchange",
        evidence: `${selectedDialogueAudioListenTotal} listens, ${selectedDialogueReplyAttemptTotal} saved replies, ${selectedConversationRoundCount} full rounds in ${selectedDialogue.title}`,
        progress: Math.min(
          100,
          selectedDialoguePracticeCount * 18 +
            selectedDialogueAudioListenTotal * 5 +
            selectedDialogueReplyAttemptTotal * 12 +
            selectedDialogueReplyCorrectTotal * 20 +
            selectedConversationRoundCount * 16 +
            selectedConversationRoundStrongCount * 20,
        ),
        prompt: `Run a live turn-by-turn Arabic exchange for "${selectedDialogue.title}". Give one Arabic line, expected reply, transliteration, meaning, and one correction before the next turn.`,
        icon: "message-square",
        colorKey: "blue",
      },
      {
        id: "presentational",
        label: "Explain",
        title: "I can explain a word or sentence clearly",
        evidence: `${wordMeaningAttemptTotal} meaning recalls and ${trackProgress.patterns}% patterns`,
        progress: Math.min(
          100,
          Math.round(
            (trackProgress.patterns + trackProgress.words) * 0.36 +
              wordMeaningAttemptTotal * 8 +
              wordMeaningStrongTotal * 16,
          ),
        ),
        prompt: `Test if I can explain the word "${dailyWord.arabic}" (${dailyWord.transliteration}) and one sentence pattern. Ask first, then give a model answer with Arabic, transliteration, and meaning.`,
        icon: "book-open",
        colorKey: "amber",
      },
      {
        id: "production",
        label: "Build",
        title: "I can make my own useful sentence",
        evidence: `${sentenceBuilderAttemptTotal} saved sentences from patterns`,
        progress: Math.min(
          100,
          Math.round(
            trackProgress.patterns * 0.4 +
              sentenceBuilderAttemptTotal * 12 +
              sentenceBuilderStrongTotal * 20,
          ),
        ),
        prompt:
          "Coach me to produce my own Arabic sentence. Give one useful pattern, ask me to adapt it, then show the model answer, transliteration, meaning, and common mistake.",
        icon: "edit-3",
        colorKey: "purple",
      },
      {
        id: "retention",
        label: "Remember",
        title: "I can still recall it tomorrow",
        evidence: `${completedReviewCount}/${REVIEW_TASKS.length} review tasks complete today`,
        progress: Math.round(
          (completedReviewCount / REVIEW_TASKS.length) * 100,
        ),
        prompt:
          "Run a retention check for today's Arabic. Include one sound, one dialogue reply, one pattern, and one Quranic word. Make me recall first, then show the answer.",
        icon: "repeat",
        colorKey: "rose",
      },
    ],
    [
      completedReviewCount,
      dailyWord,
      audioListenTotal,
      selectedDialogueDictationAttemptTotal,
      selectedDialogueDictationStrongTotal,
      selectedDialogueAudioListenTotal,
      selectedDialogue.title,
      selectedDialoguePracticeCount,
      selectedDialogueReplyAttemptTotal,
      selectedDialogueReplyCorrectTotal,
      selectedConversationRoundCount,
      selectedConversationRoundStrongCount,
      sentenceBuilderAttemptTotal,
      sentenceBuilderStrongTotal,
      trackProgress.letters,
      trackProgress.patterns,
      trackProgress.words,
      wordMeaningAttemptTotal,
      wordMeaningStrongTotal,
    ],
  );

  const speakingModes = useMemo(
    () => [
      {
        title: "Guided role-play",
        subtitle: "One turn at a time with gentle correction.",
        icon: "message-circle" as FeatherName,
        prompt: `Run a guided Arabic role-play for "${selectedDialogue.title}". Give one learner line, wait by showing the ideal reply, explain one correction, then offer the next turn.`,
      },
      {
        title: "Pronunciation coach",
        subtitle: "Mouth cues for difficult sounds.",
        icon: "mic" as FeatherName,
        prompt: `Coach my pronunciation for "${selectedDialogue.title}". Pick three hard words from the dialogue and explain mouth position, stress, transliteration, and one repetition drill.`,
      },
      {
        title: "Meaning breakdown",
        subtitle: "See how the sentence is built.",
        icon: "search" as FeatherName,
        prompt: `Break down the Arabic sentences in "${selectedDialogue.title}". For each line, show key words, sentence pattern, and a simple English meaning.`,
      },
      {
        title: "Free conversation",
        subtitle: "Use the same words in a new situation.",
        icon: "shuffle" as FeatherName,
        prompt: `Create a new beginner Arabic conversation using the same vocabulary from "${selectedDialogue.title}". Keep it practical, include transliteration, meaning, and three follow-up prompts.`,
      },
    ],
    [selectedDialogue.title],
  );

  const arabicLevelMilestones = useMemo<ArabicLevelMilestone[]>(
    () => [
      {
        id: "sound-starter",
        level: "Level 1",
        title: "Sound Starter",
        promise:
          "I can recognise letters, say beginner sounds, and read a short phrase with help.",
        requirement:
          "Know 10 letters, complete one sound check, and finish today's review loop.",
        evidence: `${selectedLetters.size}/10 starter letters, ${audioListenTotal} listen reps, sounds rated ${learningProgress.skillSelfRatings.sounds}/4`,
        progress: Math.min(
          100,
          Math.round(
            (selectedLetters.size / 10) * 50 +
              (learningProgress.skillSelfRatings.sounds / 4) * 24 +
              Math.min(12, audioListenTotal * 2) +
              (completedReviewCount / REVIEW_TASKS.length) * 20,
          ),
        ),
        ctaLabel: "Run placement check",
        prompt:
          "Run a beginner Arabic placement check for my sound level. Test six letters, one short phrase, and one listening cue. Give a clear level, what I can do now, and the next drill.",
        icon: "volume-2",
        colorKey: "emerald",
      },
      {
        id: "dialogue-builder",
        level: "Level 2",
        title: "Dialogue Builder",
        promise:
          "I can answer useful lines in masjid, home, travel, and study situations.",
        requirement:
          "Shadow at least three turns and handle a guided reply without freezing.",
        evidence: `${selectedDialogueReplyAttemptTotal} saved replies, ${selectedDialogueReplyCorrectTotal} strong matches, ${selectedConversationRoundCount} full rounds`,
        progress: Math.min(
          100,
          Math.round(
            selectedDialoguePracticeCount * 14 +
              selectedDialogueReplyAttemptTotal * 10 +
              selectedDialogueReplyCorrectTotal * 16 +
              selectedConversationRoundCount * 12 +
              selectedConversationRoundStrongCount * 16 +
              trackProgress.dialogues * 0.12 +
              (learningProgress.skillSelfRatings.dialogue / 4) * 28,
          ),
        ),
        ctaLabel: "Test dialogue",
        prompt: `Run a dialogue placement check for "${selectedDialogue.title}". Ask me two realistic turns, show the ideal reply, give transliteration, meaning, and one correction after each turn.`,
        icon: "message-circle",
        colorKey: "blue",
      },
      {
        id: "meaning-maker",
        level: "Level 3",
        title: "Meaning Maker",
        promise:
          "I can explain Quranic words and build my own simple sentence from a pattern.",
        requirement:
          "Review Quranic words, practise sentence patterns, and explain one meaning clearly.",
        evidence: `${sentenceBuilderAttemptTotal} written sentences, ${wordMeaningAttemptTotal} meaning recalls`,
        progress: Math.min(
          100,
          Math.round(
            (trackProgress.words + trackProgress.patterns) * 0.25 +
              sentenceBuilderAttemptTotal * 5 +
              sentenceBuilderStrongTotal * 8 +
              wordMeaningStrongTotal * 8 +
              ((learningProgress.skillSelfRatings.meaning +
                learningProgress.skillSelfRatings.sentence) /
                8) *
                34,
          ),
        ),
        ctaLabel: "Check meaning",
        prompt: `Run a meaning placement check. Test the Quranic Arabic word "${dailyWord.arabic}" and one beginner sentence pattern. Ask first, then show Arabic, transliteration, meaning, and one non-ruling explanation note.`,
        icon: "book-open",
        colorKey: "amber",
      },
      {
        id: "independent-reviewer",
        level: "Level 4",
        title: "Independent Reviewer",
        promise:
          "I can keep Arabic alive with daily recall, short conversation, and careful meaning review.",
        requirement:
          "Keep a streak, complete review loops, and balance listening, reply, explanation, and production.",
        evidence: `${learningProgress.streakDays} day streak, ${placementAverageScore}% placement confidence`,
        progress: Math.min(
          100,
          Math.round(
            overallProgressScore * 0.45 +
              placementAverageScore * 0.35 +
              Math.min(20, learningProgress.streakDays * 4),
          ),
        ),
        ctaLabel: "Plan next level",
        prompt:
          "Build my next Arabic study plan from my current progress. Give a practical seven-day plan covering listening, speaking, reading, writing, Quranic vocabulary, and spaced review.",
        icon: "compass",
        colorKey: "purple",
      },
    ],
    [
      completedReviewCount,
      dailyWord.arabic,
      audioListenTotal,
      learningProgress.skillSelfRatings.dialogue,
      learningProgress.skillSelfRatings.meaning,
      learningProgress.skillSelfRatings.sentence,
      learningProgress.skillSelfRatings.sounds,
      learningProgress.streakDays,
      overallProgressScore,
      placementAverageScore,
      selectedDialogue.title,
      selectedDialoguePracticeCount,
      selectedDialogueReplyAttemptTotal,
      selectedDialogueReplyCorrectTotal,
      selectedConversationRoundCount,
      selectedConversationRoundStrongCount,
      selectedLetters.size,
      sentenceBuilderAttemptTotal,
      sentenceBuilderStrongTotal,
      trackProgress.dialogues,
      trackProgress.patterns,
      trackProgress.words,
      wordMeaningAttemptTotal,
      wordMeaningStrongTotal,
    ],
  );

  const currentArabicLevel = useMemo(
    () =>
      [...arabicLevelMilestones]
        .reverse()
        .find((milestone) => milestone.progress >= 70) ??
      arabicLevelMilestones[0],
    [arabicLevelMilestones],
  );

  const currentArabicLevelIndex = useMemo(
    () =>
      Math.max(
        0,
        arabicLevelMilestones.findIndex(
          (milestone) => milestone.id === currentArabicLevel.id,
        ),
      ),
    [arabicLevelMilestones, currentArabicLevel.id],
  );

  const nextArabicLevel = useMemo(() => {
    const upcoming = arabicLevelMilestones
      .slice(currentArabicLevelIndex + 1)
      .find((milestone) => milestone.progress < 100);
    if (upcoming) return upcoming;
    return currentArabicLevel.progress < 100
      ? currentArabicLevel
      : arabicLevelMilestones[arabicLevelMilestones.length - 1];
  }, [arabicLevelMilestones, currentArabicLevel, currentArabicLevelIndex]);

  const nextArabicMission = useMemo(() => {
    if (learningProgress.placementCheckCount === 0) {
      return {
        title: "Set your Arabic level",
        subtitle: "Rate four skills, save your profile, then run placement.",
        icon: "compass" as FeatherName,
        actionLabel: "Place me",
        prompt:
          "Run my first Arabic placement session using my saved self-profile. Test sounds, dialogue, meaning, and sentence building. Give a level, what I can do now, and the next lesson.",
      };
    }

    if (completedReviewCount < REVIEW_TASKS.length) {
      const nextTask =
        REVIEW_TASKS.find(
          (task) =>
            !todayLearningProgress.completedReviewTaskIds.includes(task.id),
        ) ?? REVIEW_TASKS[0];
      return {
        title: "Finish today's review loop",
        subtitle: nextTask.title,
        icon: nextTask.icon,
        actionLabel: "Coach me",
        prompt: `Coach me through this Arabic review task: ${nextTask.title}. Keep it beginner-friendly and give me one Arabic example, transliteration, meaning, and a short speaking drill.`,
      };
    }

    if (selectedDialogueAudioListenTotal < 3) {
      return {
        title: "Build your ear first",
        subtitle: `Listen and repeat three lines in "${selectedDialogue.title}".`,
        icon: "volume-2" as FeatherName,
        actionLabel: "Listening coach",
        prompt: `Coach my listen-and-repeat practice for "${selectedDialogue.title}". Pick three beginner lines, give Arabic, transliteration, meaning, mouth cue, and a repeat-after-me rhythm.`,
      };
    }

    if (selectedDialogueDictationAttemptTotal < 1) {
      return {
        title: "Prove you heard it",
        subtitle: `Listen to one hidden line in "${selectedDialogue.title}", then type it before revealing.`,
        icon: "headphones" as FeatherName,
        actionLabel: "Dictation coach",
        prompt: `Coach my listen-and-type dictation for "${selectedDialogue.title}". Use one short line, make me type what I heard before revealing, then show Arabic, transliteration, meaning, and one listening cue.`,
      };
    }

    if (selectedDialogueReplyAttemptTotal < 2) {
      return {
        title: "Answer before revealing",
        subtitle: `Type two replies in "${selectedDialogue.title}" and save them.`,
        icon: "edit-3" as FeatherName,
        actionLabel: "Coach reply",
        prompt: `Coach me through two answer-before-reveal turns for "${selectedDialogue.title}". Ask one line at a time, wait by showing the model reply, and explain how close my answer was.`,
      };
    }

    if (selectedConversationRoundCount < 1) {
      return {
        title: "Finish one full conversation",
        subtitle: `${conversationRoundProgress}% ready in "${selectedDialogue.title}". Save a round after listen, dictation, reply, and shadow.`,
        icon: "message-circle" as FeatherName,
        actionLabel: "Coach round",
        prompt: `Coach one full Arabic conversation round for "${selectedDialogue.title}". Current readiness: ${conversationRoundProgress}%. Make me hear every line, answer as the other speaker, type one hidden line, then swap roles. Include Arabic, transliteration, meaning, one correction, and one next step.`,
      };
    }

    if (sentenceBuilderAttemptTotal < 2) {
      return {
        title: "Build your own sentence",
        subtitle: "Write two personal lines from the patterns below.",
        icon: "edit-3" as FeatherName,
        actionLabel: "Coach sentence",
        prompt:
          "Coach me through two Arabic sentence-builder attempts. Give one beginner pattern, wait by showing a model answer, then explain Arabic, transliteration, meaning, and one gentle correction.",
      };
    }

    if (wordMeaningAttemptTotal < 2) {
      return {
        title: "Explain a Quranic word",
        subtitle: `Recall ${dailyWord.transliteration} in your own words before checking.`,
        icon: "book-open" as FeatherName,
        actionLabel: "Coach meaning",
        prompt: `Coach me to recall the Quranic Arabic word "${dailyWord.arabic}" (${dailyWord.transliteration}) before seeing the answer. Ask me to explain it first, then show meaning, transliteration, one careful language note, and one short recall drill.`,
      };
    }

    if (trackProgress.letters < 100) {
      return {
        title: "Strengthen your letter map",
        subtitle: "Practise six letters by sound, shape, and name.",
        icon: "type" as FeatherName,
        actionLabel: "Drill letters",
        prompt:
          "Give me a six-letter Arabic recognition drill with Arabic letter, transliteration, mouth-position cue, and one memory hook for each.",
      };
    }

    if (trackProgress.dialogues < 100) {
      return {
        title: "Move into real speech",
        subtitle: `Shadow "${selectedDialogue.title}" and answer as speaker B.`,
        icon: "message-circle" as FeatherName,
        actionLabel: "Role-play",
        prompt: `Role-play "${selectedDialogue.title}" with me. Give one line at a time, wait by giving me a suggested reply, then correct the Arabic gently.`,
      };
    }

    if (trackProgress.patterns < 100) {
      return {
        title: "Build sentence control",
        subtitle: "Turn one pattern into three useful sentences.",
        icon: "layers" as FeatherName,
        actionLabel: "Build sentences",
        prompt:
          "Give me a sentence-builder drill using three beginner Arabic patterns. Include Arabic, transliteration, meaning, and one mistake to avoid.",
      };
    }

    return {
      title: "Add Quranic meaning",
      subtitle: `Review ${dailyWord.transliteration} and use it in a short reflection.`,
      icon: "book-open" as FeatherName,
      actionLabel: "Explain word",
      prompt: `Teach me the Quranic Arabic word "${dailyWord.arabic}" (${dailyWord.transliteration}). Explain the meaning, pronunciation, and one simple sentence using it without giving a religious ruling.`,
    };
  }, [
    completedReviewCount,
    dailyWord,
    learningProgress.placementCheckCount,
    conversationRoundProgress,
    selectedDialogue.title,
    selectedDialogueAudioListenTotal,
    selectedDialogueDictationAttemptTotal,
    selectedDialogueReplyAttemptTotal,
    selectedConversationRoundCount,
    sentenceBuilderAttemptTotal,
    todayLearningProgress.completedReviewTaskIds,
    trackProgress.dialogues,
    trackProgress.letters,
    trackProgress.patterns,
    wordMeaningAttemptTotal,
  ]);

  const smartReviewQueue = useMemo<ArabicReviewFocus[]>(
    () =>
      [
        ...(dueArabicReviewItems.length > 0
          ? [
              {
                id: "spaced-due",
                label: "Recall",
                title: arabicRetentionSummary.retentionLabel,
                evidence: arabicRetentionSummary.recallProofLabel,
                progress: 0,
                actionLabel: "Recall due",
                prompt: `Run my due Arabic spaced review. Retention risk: ${arabicRetentionSummary.retentionRisk}. Progress: ${arabicRetentionSummary.recallProofLabel}. Due items: ${dueArabicReviewItems.map((item) => `${item.title} (${item.kind})`).join(", ")}. Ask me to recall first, then show Arabic, transliteration, meaning, and one correction for each item.`,
                icon: "clock" as FeatherName,
                colorKey: "rose" as keyof typeof CategoryColors,
              },
            ]
          : []),
        {
          id: "listen-repeat",
          label: "Listening",
          title:
            selectedDialogueDictationAttemptTotal > 0
              ? "Tighten what you heard"
              : "Start listen-and-type dictation",
          evidence: `${selectedDialogueAudioListenTotal} listens • ${selectedDialogueDictationAttemptTotal} dictations • ${selectedDialogueDictationStrongTotal} strong`,
          progress: Math.min(
            100,
            selectedDialogueAudioListenTotal * 10 +
              selectedDialogueDictationAttemptTotal * 18 +
              selectedDialogueDictationStrongTotal * 24,
          ),
          actionLabel: "Dictation coach",
          prompt: `Build a listen-and-type Arabic dictation drill from "${selectedDialogue.title}". Give one hidden line, ask me to type it before revealing, then show Arabic, transliteration, meaning, mouth-position cue, and one repeat rhythm.`,
          icon: "volume-2" as FeatherName,
          colorKey: "emerald" as keyof typeof CategoryColors,
        },
        {
          id: "dialogue-reply",
          label: "Conversation",
          title:
            selectedDialogueReplyAttemptTotal > 0
              ? "Make your replies sharper"
              : "Save your first real reply",
          evidence: `${selectedDialogueReplyAttemptTotal} saved replies • ${selectedDialogueReplyCorrectTotal} strong`,
          progress: Math.min(
            100,
            selectedDialogueReplyAttemptTotal * 18 +
              selectedDialogueReplyCorrectTotal * 24,
          ),
          actionLabel: "Coach reply",
          prompt: `Build a focused Arabic review from my saved replies in "${selectedDialogue.title}". Start with one realistic prompt, make me answer before showing the model reply, then give Arabic, transliteration, meaning, and one correction.`,
          icon: "message-square" as FeatherName,
          colorKey: "blue" as keyof typeof CategoryColors,
        },
        {
          id: "sentence-builder",
          label: "Production",
          title:
            sentenceBuilderAttemptTotal > 0
              ? "Turn patterns into natural speech"
              : "Write your first useful sentence",
          evidence: `${sentenceBuilderAttemptTotal} sentences • ${sentenceBuilderStrongTotal} strong`,
          progress: Math.min(
            100,
            sentenceBuilderAttemptTotal * 16 + sentenceBuilderStrongTotal * 26,
          ),
          actionLabel: "Build sentence",
          prompt:
            "Review my Arabic sentence-builder progress. Give me one pattern I should practise next, ask me to write a sentence first, then show a model answer with Arabic, transliteration, meaning, and one correction.",
          icon: "edit-3" as FeatherName,
          colorKey: "purple" as keyof typeof CategoryColors,
        },
        {
          id: "meaning-recall",
          label: "Meaning",
          title:
            wordMeaningAttemptTotal > 0
              ? "Recall meanings before looking"
              : "Explain one Quranic word",
          evidence: `${wordMeaningAttemptTotal} recalls • ${wordMeaningStrongTotal} strong`,
          progress: Math.min(
            100,
            wordMeaningAttemptTotal * 16 + wordMeaningStrongTotal * 28,
          ),
          actionLabel: "Recall word",
          prompt: `Run a Quranic Arabic recall review for "${dailyWord.arabic}" (${dailyWord.transliteration}). Ask me to explain the word before showing the meaning, then give one careful language note and one non-ruling reminder.`,
          icon: "book-open" as FeatherName,
          colorKey: "amber" as keyof typeof CategoryColors,
        },
        {
          id: "daily-retention",
          label: "Retention",
          title:
            completedReviewCount >= REVIEW_TASKS.length
              ? "Keep the streak alive tomorrow"
              : "Finish today's memory loop",
          evidence: `${completedReviewCount}/${REVIEW_TASKS.length} review tasks done`,
          progress: Math.round(
            (completedReviewCount / REVIEW_TASKS.length) * 100,
          ),
          actionLabel: "Review now",
          prompt:
            "Run my smart Arabic review queue. Include one sound, one dialogue reply, one sentence pattern, and one Quranic word. Make me recall before showing each answer.",
          icon: "repeat" as FeatherName,
          colorKey: "emerald" as keyof typeof CategoryColors,
        },
      ]
        .sort((a, b) => a.progress - b.progress)
        .slice(0, 3),
    [
      completedReviewCount,
      dailyWord.arabic,
      dailyWord.transliteration,
      dueArabicReviewItems,
      arabicRetentionSummary.recallProofLabel,
      arabicRetentionSummary.retentionLabel,
      arabicRetentionSummary.retentionRisk,
      selectedDialogue.title,
      selectedDialogueAudioListenTotal,
      selectedDialogueDictationAttemptTotal,
      selectedDialogueDictationStrongTotal,
      selectedDialogueReplyAttemptTotal,
      selectedDialogueReplyCorrectTotal,
      sentenceBuilderAttemptTotal,
      sentenceBuilderStrongTotal,
      wordMeaningAttemptTotal,
      wordMeaningStrongTotal,
    ],
  );

  const getColor = (key: keyof typeof CategoryColors) => {
    const color = CategoryColors[key] || CategoryColors.emerald;
    return isDark ? color.dark : color;
  };
  const retentionTone = getColor(
    arabicRetentionSummary.retentionRisk === "clear" ? "emerald" : "rose",
  );
  const streakCareColor =
    arabicStreakCarePlan.tone === "restart"
      ? theme.scholar
      : arabicStreakCarePlan.tone === "open_today"
        ? getColor("rose").text
        : theme.primary;

  const toggleLetter = async (index: number) => {
    await persistLearningProgress((currentProgress) => {
      const isRemoving = currentProgress.masteredLetterIndexes.includes(index);
      const nextIndexes = isRemoving
        ? currentProgress.masteredLetterIndexes.filter((item) => item !== index)
        : [...currentProgress.masteredLetterIndexes, index];
      const practicedProgress = isRemoving
        ? {
            ...currentProgress,
            masteredLetterIndexes: nextIndexes,
            lastOpenedAt: new Date().toISOString(),
          }
        : registerArabicPracticeOnce(
            {
              ...currentProgress,
              masteredLetterIndexes: nextIndexes,
            },
            4,
            `letter:${index}`,
          );
      return isRemoving
        ? practicedProgress
        : scheduleArabicReviewItem(practicedProgress, {
            key: `letter:${index}`,
            kind: "letter",
            title:
              `${ALPHABET[index]?.arabic ?? ""} ${ALPHABET[index]?.name ?? "Letter"}`.trim(),
            quality: "good",
          });
    });
  };

  const recordDialoguePractice = async () => {
    await persistLearningProgress((currentProgress) => {
      const current =
        currentProgress.dialoguePracticeCounts[selectedDialogue.id] ?? 0;
      const practicedProgress = registerArabicPractice(
        {
          ...currentProgress,
          dialoguePracticeCounts: {
            ...currentProgress.dialoguePracticeCounts,
            [selectedDialogue.id]: current + 1,
          },
        },
        12,
      );
      return scheduleArabicReviewItem(practicedProgress, {
        key: `dialogue-shadow:${selectedDialogue.id}`,
        kind: "dialogue",
        title: `${selectedDialogue.title} shadow practice`,
        quality: "good",
      });
    });
  };

  const recordDialogueReplyAttempt = async () => {
    const trimmedDraft = dialogueReplyDraft.trim();
    if (!trimmedDraft) {
      setDialogueAttemptFeedback("Type your Arabic or transliteration first.");
      return;
    }

    const isStrongMatch = dialogueReplyMatchScore >= 70;
    setShowDialogueReply(true);
    setDialogueAttemptFeedback(
      isStrongMatch
        ? "Strong reply saved. Now compare it with the model answer."
        : "Attempt saved. Compare it, adjust one word, and try again.",
    );
    await persistLearningProgress((currentProgress) => {
      const currentAttempts =
        currentProgress.dialogueReplyAttemptCounts[replyAttemptKey] ?? 0;
      const currentCorrect =
        currentProgress.dialogueReplyCorrectCounts[replyAttemptKey] ?? 0;
      const practicedProgress = registerArabicPractice(
        {
          ...currentProgress,
          dialogueReplyAttemptCounts: {
            ...currentProgress.dialogueReplyAttemptCounts,
            [replyAttemptKey]: currentAttempts + 1,
          },
          dialogueReplyCorrectCounts: {
            ...currentProgress.dialogueReplyCorrectCounts,
            [replyAttemptKey]: isStrongMatch
              ? currentCorrect + 1
              : currentCorrect,
          },
          latestDialogueReplyDrafts: {
            ...currentProgress.latestDialogueReplyDrafts,
            [replyAttemptKey]: trimmedDraft,
          },
          lastDialogueAttemptAt: new Date().toISOString(),
        },
        isStrongMatch ? 14 : 6,
      );
      return scheduleArabicReviewItem(practicedProgress, {
        key: `dialogue-reply:${replyAttemptKey}`,
        kind: "dialogue",
        title: `${selectedDialogue.title}: ${replyDialogueTurn.transliteration}`,
        quality: isStrongMatch ? "good" : "again",
      });
    });
  };

  const recordConversationRound = async () => {
    if (!canSaveConversationRound) {
      setConversationRoundFeedback(
        "Complete at least one listen, dictation, reply, and shadow round before saving the full conversation.",
      );
      return;
    }

    const isStrongRound = conversationRoundProgress >= 72;
    setConversationRoundFeedback(
      isStrongRound
        ? "Full round saved. Strong enough to review as one conversation."
        : "Round saved. Finish the weaker steps, then save a stronger round.",
    );

    await persistLearningProgress((currentProgress) => {
      const currentRounds =
        currentProgress.conversationRoundCounts[selectedDialogue.id] ?? 0;
      const currentStrongRounds =
        currentProgress.conversationRoundStrongCounts[selectedDialogue.id] ?? 0;
      const practicedProgress = registerArabicPractice(
        {
          ...currentProgress,
          conversationRoundCounts: {
            ...currentProgress.conversationRoundCounts,
            [selectedDialogue.id]: currentRounds + 1,
          },
          conversationRoundStrongCounts: {
            ...currentProgress.conversationRoundStrongCounts,
            [selectedDialogue.id]: isStrongRound
              ? currentStrongRounds + 1
              : currentStrongRounds,
          },
          lastConversationRoundAt: new Date().toISOString(),
        },
        isStrongRound ? 18 : 10,
      );
      return scheduleArabicReviewItem(practicedProgress, {
        key: `conversation-round:${selectedDialogue.id}`,
        kind: "dialogue",
        title: `${selectedDialogue.title} full conversation round`,
        quality: isStrongRound ? "easy" : "hard",
      });
    });
  };

  const updateDictationDraft = (value: string) => {
    setDictationDraft(value);
    if (dictationFeedback) setDictationFeedback("");
  };

  const recordDictationAttempt = async () => {
    const trimmedDraft = dictationDraft.trim();
    if (!trimmedDraft) {
      setDictationFeedback("Type what you heard first.");
      return;
    }

    const isStrongMatch = dictationMatchScore >= 70;
    setShowDictationAnswer(true);
    setDictationFeedback(
      isStrongMatch
        ? "Strong listening match saved. Now read it aloud once."
        : "Dictation saved. Compare one sound, then listen again.",
    );

    await persistLearningProgress((currentProgress) => {
      const currentAttempts =
        currentProgress.dictationAttemptCounts[dictationKey] ?? 0;
      const currentStrong =
        currentProgress.dictationStrongCounts[dictationKey] ?? 0;
      const practicedProgress = registerArabicPractice(
        {
          ...currentProgress,
          dictationAttemptCounts: {
            ...currentProgress.dictationAttemptCounts,
            [dictationKey]: currentAttempts + 1,
          },
          dictationStrongCounts: {
            ...currentProgress.dictationStrongCounts,
            [dictationKey]: isStrongMatch ? currentStrong + 1 : currentStrong,
          },
          latestDictationDrafts: {
            ...currentProgress.latestDictationDrafts,
            [dictationKey]: trimmedDraft,
          },
          lastDictationAttemptAt: new Date().toISOString(),
        },
        isStrongMatch ? 12 : 6,
      );
      return scheduleArabicReviewItem(practicedProgress, {
        key: `dictation:${dictationKey}`,
        kind: "dictation",
        title: `${selectedDialogue.title}: hear ${currentDialogueTurn.transliteration}`,
        quality: isStrongMatch ? "good" : "again",
      });
    });
  };

  const recordSpeakingShadowConfidence = async (rating?: number) => {
    const confidenceRating =
      typeof rating === "number" ? rating : currentLineSpeakingConfidence || 2;
    await persistLearningProgress((currentProgress) => {
      const currentCount =
        currentProgress.speakingShadowCounts[currentLineShadowKey] ?? 0;
      const practicedProgress = registerArabicPractice(
        {
          ...currentProgress,
          speakingShadowCounts: {
            ...currentProgress.speakingShadowCounts,
            [currentLineShadowKey]: currentCount + 1,
          },
          speakingConfidenceRatings: {
            ...currentProgress.speakingConfidenceRatings,
            [currentLineShadowKey]: confidenceRating,
          },
          lastSpeakingPracticeAt: new Date().toISOString(),
        },
        confidenceRating >= 3 ? 10 : 5,
      );
      return scheduleArabicReviewItem(practicedProgress, {
        key: `speaking-shadow:${currentLineShadowKey}`,
        kind: "dialogue",
        title: `${selectedDialogue.title}: pronounce ${currentDialogueTurn.transliteration}`,
        quality:
          confidenceRating >= 4
            ? "easy"
            : confidenceRating >= 3
              ? "good"
              : "hard",
      });
    });
  };

  const askPronunciationConfidenceCoach = () => {
    askArabicTutor(
      `Coach my Arabic pronunciation confidence for "${selectedDialogue.title}". Current line: "${currentDialogueTurn.arabic}" (${currentDialogueTurn.transliteration}) meaning "${currentDialogueTurn.meaning}". Practice progress: ${currentLineShadowCount} shadow reps on this line, confidence ${currentLineSpeakingConfidence || "not rated"}/4, ${selectedDialogueShadowRepTotal} total shadow reps in this dialogue, ${selectedDialogueConfidenceAverage}% average confidence. Give mouth-position cues, stress rhythm, two repeat-after-me passes, and one correction to listen for.`,
      "Pronunciation Confidence Coach",
    );
  };

  const goToNextDialogueTurn = () => {
    setDialogueTurnIndex((current) =>
      selectedDialogue.lines.length
        ? (current + 1) % selectedDialogue.lines.length
        : 0,
    );
    setShowDialogueReply(false);
    setDialogueReplyDraft("");
    setDialogueAttemptFeedback("");
    setDictationDraft("");
    setDictationFeedback("");
    setShowDictationAnswer(false);
  };

  const askCurrentDialogueTurnCoach = () => {
    const learnerDraft = dialogueReplyDraft.trim();
    askArabicTutor(
      `Coach this exact Arabic dialogue turn from "${selectedDialogue.title}". Learner line: "${currentDialogueTurn.arabic}" (${currentDialogueTurn.transliteration}) meaning "${currentDialogueTurn.meaning}". Learner draft reply: "${learnerDraft || "not attempted yet"}". Expected reply: "${replyDialogueTurn.arabic}" (${replyDialogueTurn.transliteration}) meaning "${replyDialogueTurn.meaning}". Give a one-turn role-play, pronunciation cue, meaning check, and one gentle correction.`,
      "Dialogue Turn Coach",
    );
  };

  const askConversationRoundCoach = () => {
    askArabicTutor(
      `Coach a full Arabic conversation round for "${selectedDialogue.title}". Current round score: ${conversationRoundProgress}%. Practice progress: ${selectedDialogueAudioListenTotal} listens, ${selectedDialogueDictationAttemptTotal} dictations, ${selectedDialogueReplyAttemptTotal} saved replies, ${selectedDialoguePracticeCount} shadow rounds, ${selectedConversationRoundCount} completed full rounds. Build a dialogue-first session with four phases: hear every line, answer as the other speaker, type one hidden line, then swap roles. Include Arabic, transliteration, meaning, one correction, and one next turn.`,
      "Conversation Round Coach",
    );
  };

  const askDictationCoach = () => {
    askArabicTutor(
      `Coach my Arabic listening dictation for "${selectedDialogue.title}". Target line: "${currentDialogueTurn.arabic}" (${currentDialogueTurn.transliteration}) meaning "${currentDialogueTurn.meaning}". My dictation attempt: "${dictationDraft.trim() || "not attempted yet"}". Give one listening cue, missing sounds to check, the correct Arabic, transliteration, meaning, and one repeat-after-me drill.`,
      "Arabic Dictation Coach",
    );
  };

  const recordPatternPractice = async (patternId: string) => {
    await persistLearningProgress((currentProgress) => {
      const current = currentProgress.patternPracticeCounts[patternId] ?? 0;
      const practicedProgress = registerArabicPractice(
        {
          ...currentProgress,
          patternPracticeCounts: {
            ...currentProgress.patternPracticeCounts,
            [patternId]: current + 1,
          },
        },
        8,
      );
      return scheduleArabicReviewItem(practicedProgress, {
        key: `pattern-drill:${patternId}`,
        kind: "pattern",
        title: `Pattern drill: ${patternId}`,
        quality: "good",
      });
    });
  };

  const updateSentenceDraft = (patternId: string, value: string) => {
    setSentenceDrafts((current) => ({ ...current, [patternId]: value }));
    if (sentenceFeedbackByPattern[patternId]) {
      setSentenceFeedbackByPattern((current) => ({
        ...current,
        [patternId]: "",
      }));
    }
  };

  const recordSentenceBuilderAttempt = async (pattern: SentencePattern) => {
    const patternId = pattern.pattern;
    const trimmedDraft = (sentenceDrafts[patternId] || "").trim();
    if (!trimmedDraft) {
      setSentenceFeedbackByPattern((current) => ({
        ...current,
        [patternId]: "Write your own Arabic sentence or transliteration first.",
      }));
      return;
    }

    const matchScore = getSentencePatternMatchScore(trimmedDraft, pattern);
    const isStrongMatch = matchScore >= 60;
    setSentenceFeedbackByPattern((current) => ({
      ...current,
      [patternId]: isStrongMatch
        ? "Sentence saved. Strong pattern use."
        : "Sentence saved. Compare with the model and tighten the pattern.",
    }));
    await persistLearningProgress((currentProgress) => {
      const currentAttempts =
        currentProgress.sentenceBuilderAttemptCounts[patternId] ?? 0;
      const currentStrong =
        currentProgress.sentenceBuilderStrongCounts[patternId] ?? 0;
      const practicedProgress = registerArabicPractice(
        {
          ...currentProgress,
          sentenceBuilderAttemptCounts: {
            ...currentProgress.sentenceBuilderAttemptCounts,
            [patternId]: currentAttempts + 1,
          },
          sentenceBuilderStrongCounts: {
            ...currentProgress.sentenceBuilderStrongCounts,
            [patternId]: isStrongMatch ? currentStrong + 1 : currentStrong,
          },
          latestSentenceBuilderDrafts: {
            ...currentProgress.latestSentenceBuilderDrafts,
            [patternId]: trimmedDraft,
          },
          lastSentenceBuilderAttemptAt: new Date().toISOString(),
        },
        isStrongMatch ? 12 : 6,
      );
      return scheduleArabicReviewItem(practicedProgress, {
        key: `sentence-pattern:${patternId}`,
        kind: "pattern",
        title: `Pattern: ${pattern.pattern}`,
        quality: isStrongMatch ? "good" : "hard",
      });
    });
  };

  const askSentenceBuilderCoach = (pattern: SentencePattern) => {
    const learnerSentence = (sentenceDrafts[pattern.pattern] || "").trim();
    askArabicTutor(
      `Coach my Arabic sentence-builder attempt. Pattern: "${pattern.pattern}" meaning "${pattern.meaning}". Model sentence: "${pattern.exampleArabic}" meaning "${pattern.exampleMeaning}". My attempt: "${learnerSentence || "not attempted yet"}". Give Arabic, transliteration, meaning, one correction, and one improved sentence I can repeat.`,
      "Sentence Builder Coach",
    );
  };

  const recordWordReview = async (wordId: string) => {
    await persistLearningProgress((currentProgress) => {
      const current = currentProgress.wordReviewCounts[wordId] ?? 0;
      const practicedProgress = registerArabicPractice(
        {
          ...currentProgress,
          wordReviewCounts: {
            ...currentProgress.wordReviewCounts,
            [wordId]: current + 1,
          },
        },
        6,
      );
      return scheduleArabicReviewItem(practicedProgress, {
        key: `word-review:${wordId}`,
        kind: "word",
        title: `Word review: ${wordId}`,
        quality: "good",
      });
    });
  };

  const updateWordRecallDraft = (value: string) => {
    setWordRecallDraft(value);
    if (wordRecallFeedback) setWordRecallFeedback("");
  };

  const recordWordMeaningAttempt = async () => {
    const trimmedDraft = wordRecallDraft.trim();
    if (!trimmedDraft) {
      setWordRecallFeedback("Explain the word in your own words first.");
      return;
    }

    const isStrongRecall = dailyWordMeaningMatchScore >= 60;
    setShowDailyWordMeaning(true);
    setWordRecallFeedback(
      isStrongRecall
        ? "Strong recall saved. Compare your wording with the meaning."
        : "Attempt saved. Read the meaning, then rewrite it more clearly.",
    );
    await persistLearningProgress((currentProgress) => {
      const currentAttempts =
        currentProgress.wordMeaningAttemptCounts[dailyWord.arabic] ?? 0;
      const currentStrong =
        currentProgress.wordMeaningStrongCounts[dailyWord.arabic] ?? 0;
      const practicedProgress = registerArabicPractice(
        {
          ...currentProgress,
          wordMeaningAttemptCounts: {
            ...currentProgress.wordMeaningAttemptCounts,
            [dailyWord.arabic]: currentAttempts + 1,
          },
          wordMeaningStrongCounts: {
            ...currentProgress.wordMeaningStrongCounts,
            [dailyWord.arabic]: isStrongRecall
              ? currentStrong + 1
              : currentStrong,
          },
          latestWordMeaningDrafts: {
            ...currentProgress.latestWordMeaningDrafts,
            [dailyWord.arabic]: trimmedDraft,
          },
          lastWordMeaningAttemptAt: new Date().toISOString(),
        },
        isStrongRecall ? 12 : 6,
      );
      return scheduleArabicReviewItem(practicedProgress, {
        key: `quranic-word:${dailyWord.arabic}`,
        kind: "word",
        title: `${dailyWord.arabic} (${dailyWord.transliteration})`,
        quality: isStrongRecall ? "good" : "again",
      });
    });
  };

  const askWordMeaningCoach = () => {
    askArabicTutor(
      `Coach my Quranic Arabic word recall. Word: "${dailyWord.arabic}" (${dailyWord.transliteration}). Meaning: "${dailyWord.meaning}". Note: "${dailyWord.note}". My explanation attempt: "${wordRecallDraft.trim() || "not attempted yet"}". Ask me one recall question first, then give Arabic, transliteration, meaning, one language note, and one careful non-ruling reminder.`,
      "Quranic Word Recall Coach",
    );
  };

  const toggleReviewTask = async (taskId: string, xp: number) => {
    await persistLearningProgress((progress) => {
      const currentProgress = refreshArabicReviewForToday(progress);
      const completed = currentProgress.completedReviewTaskIds.includes(taskId);
      const nextCompleted = completed
        ? currentProgress.completedReviewTaskIds.filter(
            (item) => item !== taskId,
          )
        : [...currentProgress.completedReviewTaskIds, taskId];
      const baseProgress = {
        ...currentProgress,
        completedReviewTaskIds: nextCompleted,
        reviewDate: getArabicLocalDateKey(),
        lastOpenedAt: new Date().toISOString(),
      };
      const practicedProgress = completed
        ? baseProgress
        : registerArabicPracticeOnce(
            baseProgress,
            xp,
            `daily-review:${taskId}`,
            "daily",
          );
      const task = REVIEW_TASKS.find((item) => item.id === taskId);
      return completed || !task
        ? practicedProgress
        : scheduleArabicReviewItem(practicedProgress, {
            key: `daily-review:${taskId}`,
            kind: "review",
            title: task.title,
            quality: "good",
          });
    });
  };

  const updatePlacementRating = async (
    skillId: ArabicSkillKey,
    rating: number,
  ) => {
    setPlacementProfileFeedback("");
    await persistLearningProgress((progress) => ({
      ...progress,
      skillSelfRatings: {
        ...progress.skillSelfRatings,
        [skillId]: rating,
      },
      lastOpenedAt: new Date().toISOString(),
    }));
  };

  const savePlacementProfile = async () => {
    if (!canSavePlacementProfile) {
      const missingSkills = unratedPlacementSkills
        .map((skill) => skill.label)
        .join(", ");
      setPlacementProfileFeedback(
        `Rate ${missingSkills} before saving your Arabic profile.`,
      );
      return;
    }

    setPlacementProfileFeedback("");
    await persistLearningProgress((progress) =>
      registerArabicPracticeOnce(
        {
          ...progress,
          arabicLevelId: currentArabicLevel.id,
          placementCheckCount: progress.placementCheckCount + 1,
          lastPlacementAt: new Date().toISOString(),
        },
        10,
        `placement:${currentArabicLevel.id}:${Object.entries(
          progress.skillSelfRatings,
        )
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, value]) => `${key}-${value}`)
          .join("|")}`,
        "daily",
      ),
    );
  };

  const recordArabicAudioListen = useCallback(
    async (key: string) => {
      await persistLearningProgress((progress) => {
        const current = progress.audioListenCounts[key] ?? 0;
        const practicedProgress = registerArabicPractice(
          {
            ...progress,
            audioListenCounts: {
              ...progress.audioListenCounts,
              [key]: current + 1,
            },
            lastAudioListenAt: new Date().toISOString(),
          },
          current < 2 ? 2 : 0,
        );
        if (key.startsWith("draft:")) return practicedProgress;
        return scheduleArabicReviewItem(practicedProgress, {
          key: `listen:${key}`,
          kind: "listen",
          title: `Listen again: ${reviewTitleFromKey(key)}`,
          quality: current < 2 ? "hard" : "good",
        });
      });
    },
    [persistLearningProgress],
  );

  const playArabicSpeech = async (text: string, key: string) => {
    const speechText = text.trim();
    if (!speechText) return;

    if (speakingArabicKey === key) {
      await Speech.stop().catch(() => {});
      setSpeakingArabicKey(null);
      return;
    }

    await Speech.stop().catch(() => {});
    setAudioPlaybackIssue(null);
    setSpeakingArabicKey(key);
    let recordedListen = false;
    Speech.speak(speechText, {
      language: "ar",
      rate: 0.78,
      pitch: 1,
      useApplicationAudioSession: false,
      onStart: () => {
        if (recordedListen) return;
        recordedListen = true;
        recordArabicAudioListen(key).catch(() => {});
      },
      onDone: () =>
        setSpeakingArabicKey((current) => (current === key ? null : current)),
      onStopped: () =>
        setSpeakingArabicKey((current) => (current === key ? null : current)),
      onError: () => {
        setSpeakingArabicKey((current) => (current === key ? null : current));
        setAudioPlaybackIssue({
          key,
          message:
            "Audio could not play on this device. Try again or keep reading the transliteration.",
        });
      },
    });
  };

  const renderArabicListenButton = (
    text: string,
    key: string,
    label = "Listen",
  ) => {
    const active = speakingArabicKey === key;
    const failed = audioPlaybackIssue?.key === key;
    return (
      <Pressable
        onPress={() => playArabicSpeech(text, key)}
        style={({ pressed }) => [
          styles.listenButton,
          {
            backgroundColor: active
              ? theme.primarySubtle
              : theme.backgroundSecondary,
            borderColor: active ? theme.primary : theme.borderSubtle,
            ...(failed
              ? {
                  backgroundColor: theme.error + "14",
                  borderColor: theme.error + "55",
                }
              : null),
          },
          pressed && { opacity: 0.75 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${active ? "Stop" : failed ? "Retry audio for" : "Listen to"} ${label}`}
        accessibilityHint={failed ? audioPlaybackIssue.message : undefined}
      >
        <AppIcon
          name={active ? "stop-circle" : failed ? "alert-circle" : "volume-2"}
          size={13}
          color={
            active ? theme.primary : failed ? theme.error : theme.textSecondary
          }
        />
        <ThemedText
          type="caption"
          style={{
            color: active
              ? theme.primary
              : failed
                ? theme.error
                : theme.textSecondary,
            fontWeight: "800",
          }}
        >
          {active ? "Playing" : failed ? "Try again" : label}
        </ThemedText>
      </Pressable>
    );
  };

  const askArabicTutor = async (
    intent: string,
    featureLabel = "Arabic Tutor",
  ) => {
    setLastArabicTutorIntent(intent);
    setAiFeatureLabel(featureLabel);
    setAiVisible(true);
    if (subscriptionLoading) {
      setAiState("error");
      setAiData(null);
      setAiError("Checking your plan. Please try again in a moment.");
      return;
    }

    if (!isPremium) {
      setAiState("upgrade");
      setAiData(null);
      setAiError(undefined);
      return;
    }

    setAiState("loading");
    setAiData(null);
    setAiError(undefined);
    try {
      const response = await learnTopic({
        topic: intent,
        category: "Arabic learning dialogue practice",
        context: {
          mode: "arabic_tutor",
          selectedDialogue: {
            id: selectedDialogue.id,
            title: selectedDialogue.title,
            goal: selectedDialogue.goal,
            level: selectedDialogue.level,
            lines: selectedDialogue.lines,
          },
          progress: {
            overall: overallProgressScore,
            tracks: trackProgress,
            xp: learningProgress.xp,
            streakDays: learningProgress.streakDays,
            arabicLevelId: learningProgress.arabicLevelId,
            skillSelfRatings: learningProgress.skillSelfRatings,
            placementCheckCount: learningProgress.placementCheckCount,
            lastPlacementAt: learningProgress.lastPlacementAt,
            masteredLetterCount: learningProgress.masteredLetterIndexes.length,
            completedReviewTaskIds:
              todayLearningProgress.completedReviewTaskIds,
            dueArabicReviewItems: dueArabicReviewItems.map((item) => ({
              key: item.key,
              kind: item.kind,
              title: item.title,
              dueAt: item.dueAt,
              intervalDays: item.intervalDays,
              lapseCount: item.lapseCount,
            })),
            arabicReviewScheduleStats,
            arabicRetentionSummary: {
              retentionRisk: arabicRetentionSummary.retentionRisk,
              retentionLabel: arabicRetentionSummary.retentionLabel,
              recallProofLabel: arabicRetentionSummary.recallProofLabel,
              overdueCount: arabicRetentionSummary.overdueCount,
              lapseCount: arabicRetentionSummary.lapseCount,
            },
            dailyFluencyProgress,
            dailyFluencyDrill: dailyFluencyDrill.map((step) => ({
              id: step.id,
              title: step.title,
              progress: step.progress,
            })),
            portfolioAverage,
            arabicSkillPortfolio: arabicSkillPortfolio.map((item) => ({
              id: item.id,
              label: item.label,
              progress: item.progress,
              evidence: item.evidence,
            })),
            assessmentRubric: assessmentRubric.map((metric) => ({
              id: metric.id,
              label: metric.label,
              progress: metric.progress,
              band: getArabicRubricBand(metric.progress),
            })),
            arabicWeeklyMasteryPlan: {
              title: arabicWeeklyMasteryPlan.title,
              sprintProgress: arabicWeeklyMasteryPlan.sprintProgress,
              readinessLabel: arabicWeeklyMasteryPlan.readinessLabel,
              activeDayId: arabicWeeklyMasteryPlan.activeDayId,
              activeFocus: arabicWeeklyMasteryPlan.activeFocus,
              levelGovernance: {
                decision: arabicWeeklyMasteryPlan.levelGovernance.decision,
                statusLabel:
                  arabicWeeklyMasteryPlan.levelGovernance.statusLabel,
                nextActionLabel:
                  arabicWeeklyMasteryPlan.levelGovernance.nextActionLabel,
                claimBoundary:
                  arabicWeeklyMasteryPlan.levelGovernance.claimBoundary,
              },
              reviewContract: {
                statusLabel: arabicWeeklyMasteryPlan.reviewContract.statusLabel,
                acceptedEvidence:
                  arabicWeeklyMasteryPlan.reviewContract.acceptedEvidence.map(
                    (item) => ({
                      id: item.id,
                      label: item.label,
                      statusLabel: item.statusLabel,
                    }),
                  ),
                rejectedClaims:
                  arabicWeeklyMasteryPlan.reviewContract.rejectedClaims.map(
                    (item) => ({
                      id: item.id,
                      label: item.label,
                      statusLabel: item.statusLabel,
                    }),
                  ),
                nextVerificationSteps:
                  arabicWeeklyMasteryPlan.reviewContract.nextVerificationSteps.map(
                    (item) => ({
                      id: item.id,
                      label: item.label,
                      statusLabel: item.statusLabel,
                    }),
                  ),
              },
              focusLanes: arabicWeeklyMasteryPlan.focusLanes.map((lane) => ({
                id: lane.id,
                label: lane.label,
                score: lane.score,
                evidenceLabel: lane.evidenceLabel,
                recommendation: lane.recommendation,
                dayId: lane.dayId,
              })),
              teacherReviewPacket: {
                statusLabel:
                  arabicWeeklyMasteryPlan.teacherReviewPacket.statusLabel,
                readinessScore:
                  arabicWeeklyMasteryPlan.teacherReviewPacket.readinessScore,
                nextTeacherActionLabel:
                  arabicWeeklyMasteryPlan.teacherReviewPacket
                    .nextTeacherActionLabel,
                learnerClaimBoundary:
                  arabicWeeklyMasteryPlan.teacherReviewPacket
                    .learnerClaimBoundary,
                reviewerPrompt:
                  arabicWeeklyMasteryPlan.teacherReviewPacket.reviewerPrompt,
              },
              days: arabicWeeklyMasteryPlan.days.map((day) => ({
                id: day.id,
                title: day.title,
                focusLabel: day.focusLabel,
                status: day.status,
                progress: day.progress,
                evidenceLabel: day.evidenceLabel,
              })),
            },
            arabicCorrectionLedgerPlan: {
              statusLabel: arabicCorrectionLedgerPlan.statusLabel,
              activeCorrectionLabel:
                arabicCorrectionLedgerPlan.activeCorrectionLabel,
              claimBoundaryLabel: arabicCorrectionLedgerPlan.claimBoundaryLabel,
              teacherBoundaryLabel:
                arabicCorrectionLedgerPlan.teacherBoundaryLabel,
              items: arabicCorrectionLedgerPlan.items.map((item) => ({
                id: item.id,
                label: item.label,
                evidenceLabel: item.evidenceLabel,
                correctionLabel: item.correctionLabel,
                complete: item.complete,
              })),
            },
            dialoguePracticeCount:
              learningProgress.dialoguePracticeCounts[selectedDialogue.id] ?? 0,
            dialogueReplyAttemptCounts: cappedRecord(
              learningProgress.dialogueReplyAttemptCounts,
              8,
            ),
            dialogueReplyCorrectCounts: cappedRecord(
              learningProgress.dialogueReplyCorrectCounts,
              8,
            ),
            latestSavedDialogueReplies: cappedTextRecord(
              learningProgress.latestDialogueReplyDrafts,
              8,
            ),
            dialogueReplyAttemptCount,
            dialogueReplyCorrectCount,
            lastDialogueAttemptAt: learningProgress.lastDialogueAttemptAt,
            latestDialogueReplyDraft: dialogueReplyDraft.trim() || undefined,
            dictationAttemptCounts: cappedRecord(
              learningProgress.dictationAttemptCounts,
              8,
            ),
            dictationStrongCounts: cappedRecord(
              learningProgress.dictationStrongCounts,
              8,
            ),
            latestSavedDictations: cappedTextRecord(
              learningProgress.latestDictationDrafts,
              8,
            ),
            dictationAttemptCount,
            dictationStrongCount,
            lastDictationAttemptAt: learningProgress.lastDictationAttemptAt,
            latestDictationDraft: dictationDraft.trim() || undefined,
            audioListenCounts: cappedRecord(
              learningProgress.audioListenCounts,
              12,
            ),
            audioListenTotal,
            selectedDialogueAudioListenTotal,
            lastAudioListenAt: learningProgress.lastAudioListenAt,
            speakingShadowCounts: cappedRecord(
              learningProgress.speakingShadowCounts,
              10,
            ),
            speakingConfidenceRatings: cappedRecord(
              learningProgress.speakingConfidenceRatings,
              10,
            ),
            currentLineShadowCount,
            currentLineSpeakingConfidence,
            selectedDialogueShadowRepTotal,
            selectedDialogueConfidenceAverage,
            lastSpeakingPracticeAt: learningProgress.lastSpeakingPracticeAt,
            sentenceBuilderAttemptCounts: cappedRecord(
              learningProgress.sentenceBuilderAttemptCounts,
              8,
            ),
            sentenceBuilderStrongCounts: cappedRecord(
              learningProgress.sentenceBuilderStrongCounts,
              8,
            ),
            latestSavedSentences: cappedTextRecord(
              learningProgress.latestSentenceBuilderDrafts,
              8,
            ),
            sentenceBuilderAttemptTotal,
            sentenceBuilderStrongTotal,
            lastSentenceBuilderAttemptAt:
              learningProgress.lastSentenceBuilderAttemptAt,
            latestSentenceBuilderDrafts: Object.fromEntries(
              Object.entries(sentenceDrafts)
                .filter(([, value]) => value.trim().length > 0)
                .slice(-4),
            ),
            wordMeaningAttemptCounts: cappedRecord(
              learningProgress.wordMeaningAttemptCounts,
              8,
            ),
            wordMeaningStrongCounts: cappedRecord(
              learningProgress.wordMeaningStrongCounts,
              8,
            ),
            latestSavedWordMeanings: cappedTextRecord(
              learningProgress.latestWordMeaningDrafts,
              8,
            ),
            wordMeaningAttemptTotal,
            wordMeaningStrongTotal,
            lastWordMeaningAttemptAt: learningProgress.lastWordMeaningAttemptAt,
            latestWordMeaningDraft: wordRecallDraft.trim() || undefined,
            gamePracticeCounts: cappedRecord(
              learningProgress.gamePracticeCounts,
              6,
            ),
          },
          instruction:
            "Act as a warm Arabic dialogue tutor. Use only the supplied dialogue, beginner Arabic patterns, and general language teaching. Give Arabic, transliteration, meaning, and one short correction. Do not invent religious rulings.",
        },
        userTier: isScholar ? "scholar" : "premium",
      });
      setAiData(response);
      setAiState("success");
      recordGardenAction("learning").catch(() => {});
    } catch (error: any) {
      if (error?.code === "UPGRADE_REQUIRED") {
        setAiState("upgrade");
      } else if (error?.code === "RATE_LIMIT") {
        setAiState("rateLimit");
      } else {
        setAiError(
          customerSafeAIErrorMessage(
            error?.message ||
              "Arabic Tutor is temporarily unavailable. Keep studying the lesson and try again shortly.",
          ),
        );
        setAiState("error");
      }
    }
  };

  const shareArabicTeacherReviewPacket = async () => {
    const packet = arabicWeeklyMasteryPlan.teacherReviewPacket;
    const message = buildArabicTeacherReviewPacketShareText(packet, {
      selectedDialogueTitle: selectedDialogue.title,
      currentArabicLevelTitle: currentArabicLevel.title,
      nextArabicLevelTitle: nextArabicLevel.title,
      activeFocusLabel: arabicWeeklyMasteryPlan.activeFocus.label,
    });

    try {
      await Share.share({
        title: "Arabic practice summary",
        message,
      });
    } catch {
      // Sharing can be unavailable in some shells; keep the packet visible.
    }
  };

  const arabicCommandCenterCards = useMemo(
    () => [
      {
        id: "placement",
        title: "Placement",
        value:
          learningProgress.placementCheckCount > 0
            ? `${currentArabicLevel.progress}%`
            : "Start",
        detail:
          learningProgress.placementCheckCount > 0
            ? currentArabicLevel.level
            : "Find your level",
        icon: "compass" as FeatherName,
        accent: theme.scholar,
      },
      {
        id: "workout",
        title: "Daily path",
        value: `${dailyFluencyProgress}%`,
        detail:
          dailyFluencyProgress >= 100
            ? "Completed today"
            : "Listen, reply, recall",
        icon: "activity" as FeatherName,
        accent: theme.primary,
      },
      {
        id: "review",
        title: "Smart review",
        value: `${arabicReviewScheduleStats.dueCount}`,
        detail:
          arabicReviewScheduleStats.dueCount === 1
            ? "item due now"
            : "items due now",
        icon: "refresh-cw" as FeatherName,
        accent: theme.primary,
      },
      {
        id: "quran-word",
        title: "Quran word",
        value: dailyWord.transliteration,
        detail: dailyWord.arabic,
        icon: "book-open" as FeatherName,
        accent: theme.scholar,
      },
    ],
    [
      arabicReviewScheduleStats.dueCount,
      currentArabicLevel.level,
      currentArabicLevel.progress,
      dailyFluencyProgress,
      dailyWord.arabic,
      dailyWord.transliteration,
      learningProgress.placementCheckCount,
      theme.primary,
      theme.scholar,
    ],
  );
  const arabicDailyCoachPlan = useMemo(
    () =>
      buildArabicDailyCoachPlan({
        progress: learningProgress,
        dailyFluencyProgress,
        placementAverageScore,
        completedReviewCount,
        totalReviewTasks: REVIEW_TASKS.length,
        dueReviewCount: arabicReviewScheduleStats.dueCount,
        scheduledReviewCount: arabicReviewScheduleStats.scheduledCount,
        selectedDialogueTitle: selectedDialogue.title,
        conversationRoundProgress,
        dailyWordArabic: dailyWord.arabic,
        dailyWordTransliteration: dailyWord.transliteration,
        dailyWordMeaningAttempts: dailyWordMeaningAttemptCount,
        sentenceBuilderAttempts: sentenceBuilderAttemptTotal,
      }),
    [
      arabicReviewScheduleStats.dueCount,
      arabicReviewScheduleStats.scheduledCount,
      completedReviewCount,
      conversationRoundProgress,
      dailyFluencyProgress,
      dailyWord.arabic,
      dailyWord.transliteration,
      dailyWordMeaningAttemptCount,
      learningProgress,
      placementAverageScore,
      selectedDialogue.title,
      sentenceBuilderAttemptTotal,
    ],
  );
  const arabicWeeklyMasteryPlan = useMemo(
    () =>
      buildArabicWeeklyMasteryPlan({
        selectedDialogueTitle: selectedDialogue.title,
        dailyWordArabic: dailyWord.arabic,
        dailyWordTransliteration: dailyWord.transliteration,
        currentArabicLevelTitle: currentArabicLevel.title,
        nextArabicLevelTitle: nextArabicLevel.title,
        dailyFluencyProgress,
        conversationRoundProgress,
        placementAverageScore,
        portfolioAverage,
        completedReviewCount,
        totalReviewTasks: REVIEW_TASKS.length,
        dueReviewCount: arabicReviewScheduleStats.dueCount,
        scheduledReviewCount: arabicReviewScheduleStats.scheduledCount,
        sentenceBuilderAttempts: sentenceBuilderAttemptTotal,
        wordMeaningAttempts: wordMeaningAttemptTotal,
        streakDays: learningProgress.streakDays,
      }),
    [
      arabicReviewScheduleStats.dueCount,
      arabicReviewScheduleStats.scheduledCount,
      completedReviewCount,
      conversationRoundProgress,
      currentArabicLevel.title,
      dailyFluencyProgress,
      dailyWord.arabic,
      dailyWord.transliteration,
      learningProgress.streakDays,
      nextArabicLevel.title,
      placementAverageScore,
      portfolioAverage,
      selectedDialogue.title,
      sentenceBuilderAttemptTotal,
      wordMeaningAttemptTotal,
    ],
  );
  const arabicCorrectionLedgerPlan = useMemo(
    () =>
      buildArabicCorrectionLedgerPlan({
        progress: learningProgress,
        selectedDialogueTitle: selectedDialogue.title,
        selectedDialogueShadowRepTotal,
        selectedDialogueConfidenceAverage,
        dailyFluencyProgress,
        dailyWordArabic: dailyWord.arabic,
        dailyWordTransliteration: dailyWord.transliteration,
        dailyWordMeaningAttemptCount,
        wordMeaningStrongTotal,
        sentenceBuilderAttemptTotal,
        sentenceBuilderStrongTotal,
        dueReviewCount: arabicReviewScheduleStats.dueCount,
        overdueReviewCount: arabicRetentionSummary.overdueCount,
        lapseCount: arabicRetentionSummary.lapseCount,
      }),
    [
      arabicRetentionSummary.lapseCount,
      arabicRetentionSummary.overdueCount,
      arabicReviewScheduleStats.dueCount,
      dailyFluencyProgress,
      dailyWord.arabic,
      dailyWord.transliteration,
      dailyWordMeaningAttemptCount,
      learningProgress,
      selectedDialogue.title,
      selectedDialogueConfidenceAverage,
      selectedDialogueShadowRepTotal,
      sentenceBuilderAttemptTotal,
      sentenceBuilderStrongTotal,
      wordMeaningStrongTotal,
    ],
  );
  const priorityPracticeItem = arabicDailyCoachPlan.practiceQueue[0];
  const priorityPracticeColor = getColor(
    priorityPracticeItem?.colorKey ?? "emerald",
  );
  const renderArabicCoachStepRow = (step: ArabicCoachPlanStep) => {
    const color = getColor(step.colorKey);
    return (
      <Pressable
        key={step.id}
        onPress={() => askArabicTutor(step.prompt, step.title)}
        style={({ pressed }) => [
          styles.dailyCoachStep,
          {
            backgroundColor: color.bg,
            borderColor: `${color.text}32`,
          },
          pressed ? { opacity: 0.84 } : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${step.title}. ${step.detail}. ${step.progress}% complete`}
        testID={`button-arabic-daily-coach-step-${step.id}`}
      >
        <View style={styles.dailyCoachStepIcon}>
          <AppIcon name={step.icon} size={13} color={color.text} />
        </View>
        <View style={styles.dailyCoachStepCopy}>
          <View style={styles.dailyCoachStepTop}>
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{ color: color.text, fontWeight: "900" }}
            >
              {step.title}
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: color.text, fontWeight: "900" }}
            >
              {step.progress}%
            </ThemedText>
          </View>
          <View style={styles.dailyCoachStepMetaRow}>
            <View
              style={[
                styles.dailyCoachStepPill,
                { borderColor: `${color.text}40` },
              ]}
            >
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: color.text, fontWeight: "900" }}
              >
                {step.modeLabel}
              </ThemedText>
            </View>
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{ color: theme.textMuted, flex: 1 }}
            >
              {step.estimatedMinutes} min
            </ThemedText>
          </View>
          <ThemedText
            type="caption"
            numberOfLines={2}
            style={{ color: theme.textMuted, lineHeight: 16 }}
          >
            {step.detail}
          </ThemedText>
          <ThemedText
            type="caption"
            numberOfLines={2}
            style={{ color: theme.textSecondary, lineHeight: 16 }}
          >
            {step.freePracticeHint}
          </ThemedText>
          <View style={styles.dailyCoachProgressTrack}>
            <View
              style={[
                styles.dailyCoachProgressFill,
                { width: `${step.progress}%`, backgroundColor: color.text },
              ]}
            />
          </View>
        </View>
      </Pressable>
    );
  };
  const renderArabicCorrectionLedgerCard = (
    plan: ArabicCorrectionLedgerPlan,
  ) => (
    <View
      style={[
        styles.arabicCorrectionLedgerCard,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.scholar + "35",
        },
      ]}
      testID="arabic-correction-ledger"
      accessible
      accessibilityLabel={`${plan.title}. ${plan.statusLabel}. ${plan.claimBoundaryLabel}`}
    >
      <View style={styles.arabicCorrectionLedgerHeader}>
        <View
          style={[
            styles.arabicCorrectionLedgerIcon,
            { backgroundColor: theme.scholarSoft },
          ]}
        >
          <AppIcon name="edit-3" size={16} color={theme.scholar} />
        </View>
        <View style={styles.arabicCorrectionLedgerCopy}>
          <ThemedText
            type="caption"
            style={[styles.dailyCoachEyebrow, { color: theme.scholar }]}
          >
            CORRECTION LEDGER
          </ThemedText>
          <ThemedText type="small" numberOfLines={1}>
            {plan.statusLabel}
          </ThemedText>
          <ThemedText
            type="caption"
            numberOfLines={2}
            style={{ color: theme.textMuted, lineHeight: 17 }}
          >
            {plan.summary}
          </ThemedText>
        </View>
      </View>

      <View
        style={[
          styles.arabicCorrectionLedgerActive,
          {
            backgroundColor: `${theme.warning}0D`,
            borderColor: `${theme.warning}28`,
          },
        ]}
        testID="arabic-correction-ledger-active"
      >
        <AppIcon name="alert-circle" size={13} color={theme.warning} />
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
        >
          {plan.activeCorrectionLabel}
        </ThemedText>
      </View>

      <View style={styles.arabicCorrectionLedgerList}>
        {plan.items.map((item) => {
          const color = getColor(item.colorKey);
          return (
            <Pressable
              key={item.id}
              onPress={() => askArabicTutor(item.prompt, item.label)}
              style={({ pressed }) => [
                styles.arabicCorrectionLedgerItem,
                {
                  backgroundColor: color.bg,
                  borderColor: `${color.text}30`,
                },
                pressed ? { opacity: 0.84 } : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}. ${item.correctionLabel}. ${item.actionLabel}`}
              testID={`button-arabic-correction-ledger-${item.id}`}
            >
              <View
                style={[
                  styles.arabicCorrectionLedgerItemIcon,
                  { backgroundColor: `${color.text}14` },
                ]}
              >
                <AppIcon
                  name={item.complete ? "check" : item.icon}
                  size={12}
                  color={color.text}
                />
              </View>
              <View style={styles.arabicCorrectionLedgerItemCopy}>
                <View style={styles.arabicCorrectionLedgerItemTop}>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: color.text, fontWeight: "900" }}
                  >
                    {item.label}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: color.text, fontWeight: "900" }}
                  >
                    {item.actionLabel}
                  </ThemedText>
                </View>
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: theme.textSecondary }}
                >
                  {item.targetLabel} - {item.evidenceLabel}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted, lineHeight: 16 }}
                >
                  {item.correctionLabel}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          styles.arabicCorrectionLedgerBoundary,
          {
            backgroundColor: `${theme.warning}0D`,
            borderColor: `${theme.warning}28`,
          },
        ]}
        testID="arabic-correction-ledger-boundary"
      >
        <AppIcon name="shield" size={13} color={theme.warning} />
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
        >
          {plan.claimBoundaryLabel}
        </ThemedText>
      </View>
      <View
        style={[
          styles.arabicCorrectionLedgerBoundary,
          {
            backgroundColor: `${theme.scholar}0D`,
            borderColor: `${theme.scholar}28`,
          },
        ]}
        testID="arabic-correction-ledger-teacher-boundary"
      >
        <AppIcon name="user-check" size={13} color={theme.scholar} />
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
        >
          {plan.teacherBoundaryLabel}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            { borderColor: theme.borderSubtle },
            pressed && { opacity: 0.65 },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <AppIcon name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitle}>
          <ThemedText type="h4">Arabic Learning</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Dialogue, Quran words, and meaning
          </ThemedText>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            { borderColor: theme.primaryBorder },
            pressed && { opacity: 0.65 },
          ]}
          onPress={() => navigation.navigate("ArabicGames")}
          accessibilityRole="button"
          accessibilityLabel="Open Arabic games"
        >
          <AppIcon name="target" size={20} color={theme.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(320)}>
          <LinearGradient
            colors={[theme.gradientStart, "#0F766E", theme.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroIcon}>
                <ArabicIconSvg
                  size={34}
                  color={theme.onGradient}
                  accentColor={theme.scholar}
                />
              </View>
              <View style={styles.heroPill}>
                <AppIcon
                  name={isPremium ? "star" : "lock"}
                  size={13}
                  color={theme.onGradient}
                />
                <ThemedText type="caption" style={styles.heroPillText}>
                  {isPremium ? "Tutor enabled" : "Dialogue path"}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="h1" style={styles.heroTitle}>
              Understand Arabic as a living language
            </ThemedText>
            <GoldDivider
              color={theme.onGradientHigh}
              opacity={0.48}
              style={styles.heroGoldDivider}
            />
            <ThemedText type="body" style={styles.heroSubtitle}>
              Practise real dialogue, unlock Quranic vocabulary, and learn the
              patterns behind the words you read every day.
            </ThemedText>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <ThemedText style={styles.heroStatValue}>
                  {progressLoading ? "..." : `${selectedLetters.size}/28`}
                </ThemedText>
                <ThemedText type="caption" style={styles.heroStatLabel}>
                  letters known
                </ThemedText>
              </View>
              <View style={styles.heroStat}>
                <ThemedText style={styles.heroStatValue}>
                  {progressLoading ? "..." : learningProgress.streakDays}
                </ThemedText>
                <ThemedText type="caption" style={styles.heroStatLabel}>
                  day streak
                </ThemedText>
              </View>
              <View style={styles.heroStat}>
                <ThemedText style={styles.heroStatValue}>
                  {progressLoading ? "..." : learningProgress.xp}
                </ThemedText>
                <ThemedText type="caption" style={styles.heroStatLabel}>
                  Arabic XP
                </ThemedText>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(36).duration(320)}
          style={styles.commandCenterGrid}
        >
          {arabicCommandCenterCards.map((item) => (
            <View
              key={item.id}
              style={[
                styles.commandCenterCard,
                {
                  backgroundColor: theme.surfaceGlassStrong,
                  borderColor: item.accent + "38",
                },
              ]}
            >
              <View
                style={[
                  styles.commandCenterIcon,
                  { backgroundColor: item.accent + "18" },
                ]}
              >
                <AppIcon name={item.icon} size={16} color={item.accent} />
              </View>
              <ThemedText
                type="caption"
                style={[styles.commandCenterLabel, { color: theme.textMuted }]}
              >
                {item.title}
              </ThemedText>
              <ThemedText
                type="h4"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={styles.commandCenterValue}
              >
                {item.value}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: item.accent }}
              >
                {item.detail}
              </ThemedText>
            </View>
          ))}
        </Animated.View>

        {priorityPracticeItem ? (
          <Animated.View entering={FadeInDown.delay(38).duration(320)}>
            <Pressable
              onPress={() =>
                askArabicTutor(
                  priorityPracticeItem.prompt,
                  priorityPracticeItem.label,
                )
              }
              style={({ pressed }) => [
                styles.priorityArabicPracticeRail,
                {
                  backgroundColor: theme.surfaceGlassStrong,
                  borderColor: `${priorityPracticeColor.text}42`,
                },
                pressed
                  ? { opacity: 0.84, transform: [{ scale: 0.99 }] }
                  : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Next Arabic practice. ${priorityPracticeItem.label}. ${priorityPracticeItem.detail}. ${priorityPracticeItem.estimatedMinutes} minutes. ${priorityPracticeItem.lockedByReview ? "Clear review before counting this as new practice." : priorityPracticeItem.statusLabel}`}
              testID="button-arabic-priority-practice"
            >
              <View
                style={[
                  styles.priorityArabicPracticeIcon,
                  { backgroundColor: priorityPracticeColor.bg },
                ]}
              >
                <AppIcon
                  name={priorityPracticeItem.icon}
                  size={18}
                  color={priorityPracticeColor.text}
                />
              </View>
              <View style={styles.priorityArabicPracticeCopy}>
                <ThemedText
                  type="caption"
                  style={[
                    styles.priorityArabicPracticeEyebrow,
                    { color: priorityPracticeColor.text },
                  ]}
                >
                  NEXT ARABIC PRACTICE
                </ThemedText>
                <ThemedText type="h4" numberOfLines={1}>
                  {priorityPracticeItem.label}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted, lineHeight: 17 }}
                >
                  {priorityPracticeItem.detail}
                </ThemedText>
                <View style={styles.priorityArabicPracticeMeta}>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{
                      color: priorityPracticeColor.text,
                      fontWeight: "900",
                    }}
                  >
                    {priorityPracticeItem.estimatedMinutes} min now
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: theme.textSecondary, flex: 1 }}
                  >
                    {priorityPracticeItem.lockedByReview
                      ? "Review gate active"
                      : arabicDailyCoachPlan.readinessLabel}
                  </ThemedText>
                </View>
              </View>
              <View
                style={[
                  styles.priorityArabicPracticeAction,
                  { borderColor: `${priorityPracticeColor.text}55` },
                ]}
              >
                <AppIcon
                  name={isPremium ? "zap" : "lock"}
                  size={13}
                  color={priorityPracticeColor.text}
                />
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{
                    color: priorityPracticeColor.text,
                    fontWeight: "900",
                  }}
                >
                  {isPremium ? priorityPracticeItem.actionLabel : "Unlock"}
                </ThemedText>
              </View>
            </Pressable>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(40).duration(320)}>
          <View
            testID="arabic-streak-care-plan"
            style={[
              styles.streakCareCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: `${streakCareColor}38`,
              },
            ]}
            accessible
            accessibilityLabel={`Arabic streak care. ${arabicStreakCarePlan.statusLabel}. ${arabicStreakCarePlan.proofLabel}`}
          >
            <View style={styles.streakCareHeader}>
              <View
                style={[
                  styles.streakCareIcon,
                  { backgroundColor: `${streakCareColor}1A` },
                ]}
              >
                <AppIcon name="trending-up" size={17} color={streakCareColor} />
              </View>
              <View style={styles.streakCareCopy}>
                <ThemedText
                  type="caption"
                  style={[styles.streakCareEyebrow, { color: streakCareColor }]}
                >
                  STREAK CARE
                </ThemedText>
                <ThemedText type="h4">{arabicStreakCarePlan.title}</ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted, lineHeight: 18 }}
                >
                  {arabicStreakCarePlan.body}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.streakCareBadge,
                  { borderColor: `${streakCareColor}55` },
                ]}
              >
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: streakCareColor, fontWeight: "900" }}
                >
                  {arabicStreakCarePlan.statusLabel}
                </ThemedText>
              </View>
            </View>
            <View style={styles.streakCareProofRow}>
              <ThemedText
                type="caption"
                style={{ color: streakCareColor, fontWeight: "900" }}
              >
                {arabicStreakCarePlan.proofLabel}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, flex: 1 }}
              >
                {arabicStreakCarePlan.recoveryLabel}
              </ThemedText>
            </View>
            <View style={styles.streakCareSteps}>
              {arabicStreakCarePlan.steps.map((step) => (
                <View
                  key={step.id}
                  testID={`arabic-streak-care-${step.id}`}
                  style={[
                    styles.streakCareStep,
                    {
                      backgroundColor: step.complete
                        ? theme.primarySubtle
                        : theme.surfaceGlass,
                      borderColor: step.complete
                        ? theme.primaryBorder
                        : `${streakCareColor}30`,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.streakCareStepIcon,
                      {
                        backgroundColor: step.complete
                          ? theme.primarySubtle
                          : `${streakCareColor}17`,
                      },
                    ]}
                  >
                    <AppIcon
                      name={step.icon}
                      size={13}
                      color={step.complete ? theme.primary : streakCareColor}
                    />
                  </View>
                  <View style={styles.streakCareStepCopy}>
                    <View style={styles.streakCareStepTop}>
                      <ThemedText type="small" numberOfLines={1}>
                        {step.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{
                          color: step.complete
                            ? theme.primary
                            : streakCareColor,
                          fontWeight: "900",
                        }}
                      >
                        {step.actionLabel}
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color: theme.textMuted, lineHeight: 16 }}
                    >
                      {step.detail}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
            <View
              style={[
                styles.streakCareBoundary,
                { borderColor: `${streakCareColor}34` },
              ]}
              testID="arabic-streak-care-boundary"
            >
              <AppIcon name="shield" size={13} color={streakCareColor} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
              >
                {arabicStreakCarePlan.boundaryLabel}
              </ThemedText>
            </View>
            <Pressable
              onPress={() =>
                askArabicTutor(
                  `Coach my Arabic streak care. Status: ${arabicStreakCarePlan.statusLabel}. Progress: ${arabicStreakCarePlan.proofLabel}. Recovery: ${arabicStreakCarePlan.recoveryLabel}. Start with due review if any, keep it under five minutes, and remind me when a teacher's assessment is needed.`,
                  "Arabic Streak Care",
                )
              }
              style={({ pressed }) => [
                styles.streakCareButton,
                { borderColor: `${streakCareColor}55` },
                pressed && { opacity: 0.75 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Coach Arabic streak care with NurAI"
              testID="button-arabic-streak-care-coach"
            >
              <AppIcon
                name={isPremium ? "zap" : "lock"}
                size={13}
                color={streakCareColor}
              />
              <ThemedText
                type="caption"
                style={{ color: streakCareColor, fontWeight: "900" }}
              >
                {isPremium
                  ? arabicStreakCarePlan.primaryActionLabel
                  : "Unlock coach"}
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(42).duration(320)}>
          <View
            style={[
              styles.dailyCoachCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: theme.primaryBorder,
              },
            ]}
          >
            <View style={styles.dailyCoachHeader}>
              <View
                style={[
                  styles.dailyCoachIcon,
                  { backgroundColor: theme.primarySubtle },
                ]}
              >
                <AppIcon name="compass" size={18} color={theme.primary} />
              </View>
              <View style={styles.dailyCoachCopy}>
                <ThemedText
                  type="caption"
                  style={[styles.dailyCoachEyebrow, { color: theme.primary }]}
                >
                  TODAY'S ARABIC COACH
                </ThemedText>
                <ThemedText type="h4">{arabicDailyCoachPlan.title}</ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted }}
                >
                  {arabicDailyCoachPlan.subtitle}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "900" }}
                  testID="arabic-daily-coach-timebox"
                >
                  {arabicDailyCoachPlan.totalEstimatedMinutes} minute daily path
                </ThemedText>
              </View>
              <View
                style={[
                  styles.dailyCoachScore,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.primaryBorder,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "900" }}
                >
                  {arabicDailyCoachPlan.readinessProgress}%
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: theme.textMuted }}
                >
                  {arabicDailyCoachPlan.readinessLabel}
                </ThemedText>
              </View>
            </View>
            <View
              style={[
                styles.dailySessionContract,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.primaryBorder,
                },
              ]}
              testID="arabic-daily-session-contract"
              accessible
              accessibilityLabel={`${arabicDailyCoachPlan.sessionContract.title}. ${arabicDailyCoachPlan.sessionContract.statusLabel}. ${arabicDailyCoachPlan.sessionContract.boundaryLabel}`}
            >
              <View style={styles.dailySessionContractHeader}>
                <View
                  style={[
                    styles.dailySessionContractIcon,
                    { backgroundColor: theme.primarySubtle },
                  ]}
                >
                  <AppIcon
                    name="check-square"
                    size={15}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.dailySessionContractCopy}>
                  <ThemedText
                    type="caption"
                    style={[styles.dailyCoachEyebrow, { color: theme.primary }]}
                  >
                    TODAY'S SESSION
                  </ThemedText>
                  <ThemedText type="small" numberOfLines={1}>
                    {arabicDailyCoachPlan.sessionContract.statusLabel}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textMuted, lineHeight: 17 }}
                  >
                    {arabicDailyCoachPlan.sessionContract.body}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.dailySessionContractGrid}>
                {arabicDailyCoachPlan.sessionContract.items.map((item) => {
                  const color = getColor(item.colorKey);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => askArabicTutor(item.prompt, item.label)}
                      style={({ pressed }) => [
                        styles.dailySessionContractItem,
                        {
                          backgroundColor: color.bg,
                          borderColor: `${color.text}30`,
                        },
                        pressed ? { opacity: 0.84 } : null,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.label}. ${item.detail}. ${item.actionLabel}`}
                      testID={`button-arabic-daily-session-contract-${item.id}`}
                    >
                      <View
                        style={[
                          styles.dailySessionContractItemIcon,
                          { backgroundColor: `${color.text}14` },
                        ]}
                      >
                        <AppIcon
                          name={item.icon}
                          size={12}
                          color={color.text}
                        />
                      </View>
                      <View style={styles.dailySessionContractItemCopy}>
                        <View style={styles.dailySessionContractItemTop}>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: color.text, fontWeight: "900" }}
                          >
                            {item.label}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: color.text, fontWeight: "900" }}
                          >
                            {item.actionLabel}
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{ color: theme.textMuted, lineHeight: 16 }}
                        >
                          {item.detail}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <View
                style={[
                  styles.dailySessionContractBoundary,
                  {
                    backgroundColor: `${theme.warning}0D`,
                    borderColor: `${theme.warning}28`,
                  },
                ]}
                testID="arabic-daily-session-contract-boundary"
              >
                <AppIcon name="shield" size={13} color={theme.warning} />
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    flex: 1,
                    lineHeight: 17,
                  }}
                >
                  {arabicDailyCoachPlan.sessionContract.boundaryLabel}
                </ThemedText>
              </View>
            </View>
            <View
              style={[
                styles.dailyPracticeQueue,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.primaryBorder,
                },
              ]}
              testID="arabic-daily-practice-queue"
              accessible
              accessibilityLabel={`Adaptive Arabic practice queue. ${arabicDailyCoachPlan.practiceQueue[0]?.label ?? "No active queue item"}. ${arabicDailyCoachPlan.claimBoundaryLabel}`}
            >
              <View style={styles.dailyPracticeQueueHeader}>
                <View
                  style={[
                    styles.dailyPracticeQueueIcon,
                    { backgroundColor: theme.primarySubtle },
                  ]}
                >
                  <AppIcon name="list" size={15} color={theme.primary} />
                </View>
                <View style={styles.dailyPracticeQueueCopy}>
                  <ThemedText
                    type="caption"
                    style={[styles.dailyCoachEyebrow, { color: theme.primary }]}
                  >
                    ADAPTIVE PRACTICE QUEUE
                  </ThemedText>
                  <ThemedText type="small" numberOfLines={1}>
                    {arabicDailyCoachPlan.practiceQueue[0]?.statusLabel ??
                      arabicDailyCoachPlan.readinessLabel}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textMuted, lineHeight: 17 }}
                  >
                    Due review, your weakest skill, one practice note, and
                    tomorrow's recall stay in one order.
                  </ThemedText>
                </View>
              </View>
              <View style={styles.dailyPracticeQueueList}>
                {arabicDailyCoachPlan.practiceQueue.map((item, index) => {
                  const color = getColor(item.colorKey);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => askArabicTutor(item.prompt, item.label)}
                      style={({ pressed }) => [
                        styles.dailyPracticeQueueItem,
                        {
                          backgroundColor: color.bg,
                          borderColor: `${color.text}30`,
                        },
                        pressed ? { opacity: 0.84 } : null,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${index + 1}. ${item.label}. ${item.detail}. ${item.lockedByReview ? "Clear review before counting this as new practice." : item.statusLabel}`}
                      testID={`button-arabic-daily-practice-queue-${item.id}`}
                    >
                      <View
                        style={[
                          styles.dailyPracticeQueueRank,
                          { borderColor: `${color.text}42` },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          style={{ color: color.text, fontWeight: "900" }}
                        >
                          {index + 1}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.dailyPracticeQueueItemIcon,
                          { backgroundColor: `${color.text}14` },
                        ]}
                      >
                        <AppIcon
                          name={item.icon}
                          size={12}
                          color={color.text}
                        />
                      </View>
                      <View style={styles.dailyPracticeQueueItemCopy}>
                        <View style={styles.dailyPracticeQueueItemTop}>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: color.text, fontWeight: "900" }}
                          >
                            {item.label}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: color.text, fontWeight: "900" }}
                          >
                            {item.estimatedMinutes} min
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{ color: theme.textMuted, lineHeight: 16 }}
                        >
                          {item.detail}
                        </ThemedText>
                        {item.lockedByReview ? (
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.warning, fontWeight: "800" }}
                          >
                            Clear review before new Arabic.
                          </ThemedText>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.dailyCoachSteps}>
              {arabicDailyCoachPlan.steps.map(renderArabicCoachStepRow)}
            </View>
            <View
              style={[
                styles.dailyCoachProofReceipt,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.primaryBorder,
                },
              ]}
              testID="arabic-daily-coach-proof-receipt"
            >
              <View style={styles.dailyCoachProofHeader}>
                <AppIcon name="shield" size={15} color={theme.primary} />
                <View style={styles.dailyCoachProofHeaderCopy}>
                  <ThemedText
                    type="caption"
                    style={[styles.dailyCoachEyebrow, { color: theme.primary }]}
                  >
                    TODAY'S PROGRESS
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "900" }}
                  >
                    Practice guidance
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, lineHeight: 17 }}
                  >
                    {arabicDailyCoachPlan.claimBoundaryLabel}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.dailyCoachProofGrid}>
                {arabicDailyCoachPlan.proofReceipt.map((item) => {
                  const color = getColor(item.colorKey);
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.dailyCoachProofItem,
                        {
                          backgroundColor: color.bg,
                          borderColor: `${color.text}32`,
                        },
                      ]}
                      testID={`arabic-daily-proof-receipt-${item.id}`}
                    >
                      <View
                        style={[
                          styles.dailyCoachProofIcon,
                          { backgroundColor: color.bg },
                        ]}
                      >
                        <AppIcon
                          name={item.complete ? "check" : item.icon}
                          size={12}
                          color={color.text}
                        />
                      </View>
                      <View style={styles.dailyCoachProofCopy}>
                        <View style={styles.dailyCoachProofTop}>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.text, fontWeight: "900" }}
                          >
                            {item.label}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: color.text, fontWeight: "900" }}
                          >
                            {item.statusLabel}
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{ color: theme.textMuted, lineHeight: 16 }}
                        >
                          {item.detail}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            {renderArabicCorrectionLedgerCard(arabicCorrectionLedgerPlan)}
            <Pressable
              onPress={() =>
                askArabicTutor(
                  arabicDailyCoachPlan.prompt,
                  "Arabic Daily Coach",
                )
              }
              style={({ pressed }) => [
                styles.dailyCoachButton,
                {
                  backgroundColor: isPremium
                    ? theme.primary
                    : theme.backgroundSecondary,
                  borderColor: theme.primaryBorder,
                },
                pressed
                  ? { opacity: 0.82, transform: [{ scale: 0.99 }] }
                  : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isPremium
                  ? "Ask Arabic Daily Coach"
                  : "Unlock Arabic Daily Coach"
              }
              testID="button-arabic-daily-coach"
            >
              <AppIcon
                name={isPremium ? "message-circle" : "lock"}
                size={15}
                color={isPremium ? theme.primaryForeground : theme.primary}
              />
              <ThemedText
                type="caption"
                style={{
                  color: isPremium ? theme.primaryForeground : theme.primary,
                  fontWeight: "900",
                }}
              >
                {isPremium ? "Coach today" : "Unlock coach"}
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(44).duration(320)}>
          <View
            style={[
              styles.quranBridgeCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: theme.scholar + "38",
              },
            ]}
            testID="arabic-quran-vocabulary-bridge"
            accessible
            accessibilityLabel={`${arabicQuranBridgePlan.title}. ${arabicQuranBridgePlan.statusLabel}. ${arabicQuranBridgePlan.boundaryLabel}`}
            accessibilityHint="Saved Quran words become Arabic vocabulary practice only."
          >
            <View style={styles.quranBridgeHeader}>
              <View
                style={[
                  styles.quranBridgeIcon,
                  { backgroundColor: theme.scholarSoft },
                ]}
              >
                <AppIcon name="book-open" size={18} color={theme.scholar} />
              </View>
              <View style={styles.quranBridgeCopy}>
                <ThemedText
                  type="caption"
                  style={[styles.dailyCoachEyebrow, { color: theme.scholar }]}
                >
                  QURAN VOCABULARY BRIDGE
                </ThemedText>
                <ThemedText type="h4">
                  {arabicQuranBridgePlan.word.transliteration}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted, lineHeight: 17 }}
                >
                  {arabicQuranBridgePlan.statusLabel} •{" "}
                  {arabicQuranBridgePlan.word.source}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.quranBridgeWordBadge,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.scholar + "42",
                  },
                ]}
              >
                <ThemedText
                  type="body"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={styles.quranBridgeArabic}
                >
                  {arabicQuranBridgePlan.word.arabic}
                </ThemedText>
              </View>
            </View>

            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, lineHeight: 18 }}
            >
              {arabicQuranBridgePlan.word.meaning}.{" "}
              {arabicQuranBridgePlan.word.note}
            </ThemedText>

            <View style={styles.quranBridgeItemGrid}>
              {arabicQuranBridgePlan.items.map((item) => {
                const color =
                  item.tone === "quran"
                    ? theme.scholar
                    : item.tone === "review"
                      ? theme.primary
                      : item.tone === "practice"
                        ? getColor("blue").text
                        : theme.warning;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.quranBridgeItem,
                      {
                        backgroundColor: `${color}0B`,
                        borderColor: `${color}28`,
                      },
                    ]}
                    testID={`arabic-quran-bridge-${item.id}`}
                  >
                    <View
                      style={[
                        styles.quranBridgeItemIcon,
                        { backgroundColor: `${color}16` },
                      ]}
                    >
                      <AppIcon name={item.icon} size={12} color={color} />
                    </View>
                    <View style={styles.quranBridgeItemCopy}>
                      <View style={styles.quranBridgeItemTop}>
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: theme.text, fontWeight: "900" }}
                        >
                          {item.label}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color, fontWeight: "900" }}
                        >
                          {item.statusLabel}
                        </ThemedText>
                      </View>
                      <ThemedText
                        type="caption"
                        numberOfLines={2}
                        style={{ color: theme.textMuted, lineHeight: 16 }}
                      >
                        {item.detail}
                      </ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>

            <View
              style={[
                styles.quranBridgeBoundary,
                {
                  backgroundColor: `${theme.warning}0D`,
                  borderColor: `${theme.warning}26`,
                },
              ]}
              testID="arabic-quran-bridge-boundary"
            >
              <AppIcon name="shield" size={14} color={theme.warning} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
              >
                {arabicQuranBridgePlan.boundaryLabel}
              </ThemedText>
            </View>

            <Pressable
              onPress={() =>
                askArabicTutor(
                  arabicQuranBridgePlan.prompt,
                  "Arabic Quran Vocabulary Bridge",
                )
              }
              style={({ pressed }) => [
                styles.quranBridgeButton,
                {
                  backgroundColor: isPremium
                    ? theme.scholar
                    : theme.backgroundSecondary,
                  borderColor: theme.scholar + "42",
                },
                pressed
                  ? { opacity: 0.82, transform: [{ scale: 0.99 }] }
                  : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isPremium
                  ? "Coach Quran vocabulary bridge"
                  : "Unlock Quran vocabulary bridge coach"
              }
              testID="button-arabic-quran-bridge-coach"
            >
              <AppIcon
                name={isPremium ? "message-circle" : "lock"}
                size={15}
                color={isPremium ? "#170F05" : theme.scholar}
              />
              <ThemedText
                type="caption"
                style={{
                  color: isPremium ? "#170F05" : theme.scholar,
                  fontWeight: "900",
                }}
              >
                {isPremium ? "Coach vocabulary" : "Unlock coach"}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("QuranReader")}
              style={({ pressed }) => [
                styles.quranBridgeReaderButton,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.scholar + "30",
                },
                pressed
                  ? { opacity: 0.82, transform: [{ scale: 0.99 }] }
                  : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open Quran Reader to save or review vocabulary words"
              testID="button-arabic-quran-bridge-open-reader"
            >
              <AppIcon name="book-open" size={15} color={theme.scholar} />
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: theme.scholar, fontWeight: "900" }}
              >
                Open Quran Reader
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(46).duration(320)}>
          <View
            style={[
              styles.weeklyMasteryCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: theme.scholar + "38",
              },
            ]}
            testID="arabic-weekly-mastery-plan"
          >
            <View style={styles.weeklyMasteryHeader}>
              <View
                style={[
                  styles.weeklyMasteryIcon,
                  { backgroundColor: theme.scholarSoft },
                ]}
              >
                <AppIcon name="calendar" size={18} color={theme.scholar} />
              </View>
              <View style={styles.weeklyMasteryCopy}>
                <ThemedText
                  type="caption"
                  style={[
                    styles.weeklyMasteryEyebrow,
                    { color: theme.scholar },
                  ]}
                >
                  7-DAY MASTERY PLAN
                </ThemedText>
                <ThemedText type="h4">
                  {arabicWeeklyMasteryPlan.title}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted }}
                >
                  {arabicWeeklyMasteryPlan.subtitle}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.weeklyMasteryScore,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.scholar + "38",
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.scholar, fontWeight: "900" }}
                >
                  {arabicWeeklyMasteryPlan.sprintProgress}%
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: theme.textMuted }}
                >
                  {arabicWeeklyMasteryPlan.readinessLabel}
                </ThemedText>
              </View>
            </View>
            <View style={styles.weeklyMasteryMetaRow}>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                {arabicWeeklyMasteryPlan.totalEstimatedMinutes} minutes across
                the week
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.scholar, fontWeight: "900" }}
              >
                {currentArabicLevel.title} to {nextArabicLevel.title}
              </ThemedText>
            </View>
            <View
              style={[
                styles.weeklySessionHandoffCard,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.primary + "2F",
                },
              ]}
              accessible
              accessibilityLabel={`${arabicWeeklyMasteryPlan.sessionHandoff.title}. ${arabicWeeklyMasteryPlan.sessionHandoff.statusLabel}. ${arabicWeeklyMasteryPlan.sessionHandoff.claimBoundary}`}
              testID="arabic-weekly-session-handoff"
            >
              <View style={styles.weeklySessionHandoffHeader}>
                <View
                  style={[
                    styles.weeklySessionHandoffIcon,
                    { backgroundColor: theme.primarySoft },
                  ]}
                >
                  <AppIcon name="clipboard" size={16} color={theme.primary} />
                </View>
                <View style={styles.weeklySessionHandoffCopy}>
                  <ThemedText
                    type="caption"
                    style={[
                      styles.weeklyMasteryEyebrow,
                      { color: theme.primary },
                    ]}
                  >
                    SESSION HANDOFF
                  </ThemedText>
                  <ThemedText type="small">
                    {arabicWeeklyMasteryPlan.sessionHandoff.statusLabel}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textMuted, lineHeight: 16 }}
                  >
                    {arabicWeeklyMasteryPlan.sessionHandoff.nextActionLabel}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.weeklySessionHandoffRows}>
                {arabicWeeklyMasteryPlan.sessionHandoff.checklist.map(
                  (item, index) => (
                    <View
                      key={`${item}-${index}`}
                      style={styles.weeklySessionHandoffRow}
                    >
                      <AppIcon
                        name="check-circle"
                        size={13}
                        color={theme.primary}
                      />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary, flex: 1 }}
                      >
                        {item}
                      </ThemedText>
                    </View>
                  ),
                )}
              </View>
              <View style={styles.weeklySessionHandoffFooter}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, flex: 1, lineHeight: 16 }}
                >
                  {arabicWeeklyMasteryPlan.sessionHandoff.proofToCaptureLabel}
                  {" · "}
                  {arabicWeeklyMasteryPlan.sessionHandoff.estimatedMinutesLabel}
                </ThemedText>
                <Pressable
                  onPress={() =>
                    askArabicTutor(
                      arabicWeeklyMasteryPlan.sessionHandoff.coachPrompt,
                      "Arabic Weekly Session Handoff",
                    )
                  }
                  style={({ pressed }) => [
                    styles.weeklySessionHandoffButton,
                    {
                      backgroundColor: isPremium
                        ? theme.primary
                        : theme.primarySoft,
                    },
                    pressed ? { opacity: 0.84 } : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Coach this Arabic weekly session handoff"
                  testID="button-arabic-weekly-session-handoff"
                >
                  <AppIcon
                    name={isPremium ? "zap" : "lock"}
                    size={13}
                    color={isPremium ? theme.primaryForeground : theme.primary}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: isPremium
                        ? theme.primaryForeground
                        : theme.primary,
                      fontWeight: "900",
                    }}
                  >
                    {isPremium ? "Coach handoff" : "Unlock"}
                  </ThemedText>
                </Pressable>
              </View>
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, lineHeight: 16 }}
              >
                {arabicWeeklyMasteryPlan.sessionHandoff.claimBoundary}
              </ThemedText>
            </View>
            <View
              style={[
                styles.weeklyEvidenceReceiptDeck,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.scholar + "2F",
                },
              ]}
              testID="arabic-weekly-evidence-receipts"
            >
              <View style={styles.weeklyEvidenceReceiptHeader}>
                <View>
                  <ThemedText
                    type="caption"
                    style={[
                      styles.weeklyMasteryEyebrow,
                      { color: theme.scholar },
                    ]}
                  >
                    THIS WEEK'S PRACTICE
                  </ThemedText>
                  <ThemedText type="small">See what you practised</ThemedText>
                </View>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{
                    color: theme.textMuted,
                    flex: 1,
                    textAlign: "right",
                  }}
                >
                  Practice progress and teacher assessment stay clearly
                  separated.
                </ThemedText>
              </View>
              <View style={styles.weeklyEvidenceReceiptRows}>
                {arabicWeeklyMasteryPlan.evidenceReceipts.map((receipt) => {
                  const color = getColor(receipt.colorKey);
                  return (
                    <Pressable
                      key={receipt.id}
                      onPress={() =>
                        askArabicTutor(
                          receipt.prompt,
                          `Arabic Practice: ${receipt.title}`,
                        )
                      }
                      style={({ pressed }) => [
                        styles.weeklyEvidenceReceiptRow,
                        {
                          backgroundColor: `${color.text}0D`,
                          borderColor: `${color.text}34`,
                        },
                        pressed ? { opacity: 0.84 } : null,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${receipt.title}. ${receipt.evidenceLabel}. ${receipt.boundaryLabel}`}
                      testID={`button-arabic-weekly-evidence-${receipt.id}`}
                    >
                      <View
                        style={[
                          styles.weeklyEvidenceReceiptIcon,
                          { backgroundColor: `${color.text}18` },
                        ]}
                      >
                        <AppIcon
                          name={receipt.icon}
                          size={13}
                          color={color.text}
                        />
                      </View>
                      <View style={styles.weeklyEvidenceReceiptCopy}>
                        <View style={styles.weeklyEvidenceReceiptTop}>
                          <ThemedText type="caption" numberOfLines={1}>
                            {receipt.title}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: color.text, fontWeight: "900" }}
                          >
                            {receipt.actionLabel}
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{ color: theme.textSecondary, lineHeight: 16 }}
                        >
                          {receipt.evidenceLabel}
                        </ThemedText>
                        <View style={styles.weeklyEvidenceReceiptFooter}>
                          <AppIcon name="save" size={12} color={color.text} />
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{
                              color: theme.textMuted,
                              flex: 1,
                              lineHeight: 16,
                            }}
                          >
                            {receipt.saveLabel}
                          </ThemedText>
                        </View>
                        <View style={styles.weeklyEvidenceReceiptBoundary}>
                          <AppIcon
                            name="shield"
                            size={12}
                            color={theme.scholar}
                          />
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{
                              color: theme.textMuted,
                              flex: 1,
                              lineHeight: 16,
                            }}
                          >
                            {receipt.boundaryLabel}
                          </ThemedText>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View
              style={[
                styles.weeklyReviewContractCard,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.primary + "2F",
                },
              ]}
              accessible
              accessibilityLabel={`${arabicWeeklyMasteryPlan.reviewContract.title}. ${arabicWeeklyMasteryPlan.reviewContract.statusLabel}. ${arabicWeeklyMasteryPlan.reviewContract.boundaryLabel}`}
              testID="arabic-weekly-review-contract"
            >
              <View style={styles.weeklyReviewContractHeader}>
                <View
                  style={[
                    styles.weeklyReviewContractIcon,
                    { backgroundColor: theme.primarySoft },
                  ]}
                >
                  <AppIcon name="file-text" size={16} color={theme.primary} />
                </View>
                <View style={styles.weeklyReviewContractCopy}>
                  <ThemedText
                    type="caption"
                    style={[
                      styles.weeklyMasteryEyebrow,
                      { color: theme.primary },
                    ]}
                  >
                    WEEKLY MASTERY CHECK
                  </ThemedText>
                  <ThemedText type="small">
                    {arabicWeeklyMasteryPlan.reviewContract.statusLabel}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textMuted, lineHeight: 16 }}
                  >
                    {arabicWeeklyMasteryPlan.reviewContract.boundaryLabel}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.weeklyReviewContractSection}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "900" }}
                >
                  COMPLETED SIGNALS
                </ThemedText>
                {arabicWeeklyMasteryPlan.reviewContract.acceptedEvidence.map(
                  (item) => {
                    const color = getColor(item.colorKey);
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() =>
                          item.prompt
                            ? askArabicTutor(
                                item.prompt,
                                `Arabic Mastery Check: ${item.label}`,
                              )
                            : undefined
                        }
                        style={({ pressed }) => [
                          styles.weeklyReviewContractRow,
                          {
                            backgroundColor: `${color.text}0D`,
                            borderColor: `${color.text}32`,
                          },
                          pressed ? { opacity: 0.84 } : null,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.label}. ${item.statusLabel}. ${item.detail}`}
                        testID={`button-arabic-review-contract-${item.id}`}
                      >
                        <View
                          style={[
                            styles.weeklyReviewContractRowIcon,
                            { backgroundColor: `${color.text}18` },
                          ]}
                        >
                          <AppIcon
                            name={item.icon}
                            size={12}
                            color={color.text}
                          />
                        </View>
                        <View style={styles.weeklyReviewContractRowCopy}>
                          <View style={styles.weeklyReviewContractRowTop}>
                            <ThemedText type="caption" numberOfLines={1}>
                              {item.label}
                            </ThemedText>
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{
                                color: color.text,
                                fontWeight: "900",
                              }}
                            >
                              {item.statusLabel}
                            </ThemedText>
                          </View>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{ color: theme.textMuted, lineHeight: 16 }}
                          >
                            {item.detail}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  },
                )}
              </View>
              <View style={styles.weeklyReviewContractSection}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.scholar, fontWeight: "900" }}
                >
                  NOT COUNTED YET
                </ThemedText>
                {arabicWeeklyMasteryPlan.reviewContract.rejectedClaims.map(
                  (item) => {
                    const color = getColor(item.colorKey);
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.weeklyReviewContractRow,
                          {
                            backgroundColor: `${color.text}0D`,
                            borderColor: `${color.text}32`,
                          },
                        ]}
                        testID={`arabic-review-contract-rejected-${item.id}`}
                      >
                        <View
                          style={[
                            styles.weeklyReviewContractRowIcon,
                            { backgroundColor: `${color.text}18` },
                          ]}
                        >
                          <AppIcon
                            name={item.icon}
                            size={12}
                            color={color.text}
                          />
                        </View>
                        <View style={styles.weeklyReviewContractRowCopy}>
                          <View style={styles.weeklyReviewContractRowTop}>
                            <ThemedText type="caption" numberOfLines={1}>
                              {item.label}
                            </ThemedText>
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{
                                color: color.text,
                                fontWeight: "900",
                              }}
                            >
                              {item.statusLabel}
                            </ThemedText>
                          </View>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{ color: theme.textMuted, lineHeight: 16 }}
                          >
                            {item.detail}
                          </ThemedText>
                        </View>
                      </View>
                    );
                  },
                )}
              </View>
              <View style={styles.weeklyReviewContractSection}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "900" }}
                >
                  NEXT PRACTICE
                </ThemedText>
                {arabicWeeklyMasteryPlan.reviewContract.nextVerificationSteps.map(
                  (item) => {
                    const color = getColor(item.colorKey);
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() =>
                          askArabicTutor(
                            item.prompt ||
                              `Coach my next Arabic verification step: ${item.label}.`,
                            `Arabic Mastery Check: ${item.label}`,
                          )
                        }
                        style={({ pressed }) => [
                          styles.weeklyReviewContractRow,
                          {
                            backgroundColor: `${color.text}0D`,
                            borderColor: `${color.text}32`,
                          },
                          pressed ? { opacity: 0.84 } : null,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.label}. ${item.statusLabel}. ${item.detail}`}
                        testID={`button-arabic-review-contract-${item.id}`}
                      >
                        <View
                          style={[
                            styles.weeklyReviewContractRowIcon,
                            { backgroundColor: `${color.text}18` },
                          ]}
                        >
                          <AppIcon
                            name={item.icon}
                            size={12}
                            color={color.text}
                          />
                        </View>
                        <View style={styles.weeklyReviewContractRowCopy}>
                          <View style={styles.weeklyReviewContractRowTop}>
                            <ThemedText type="caption" numberOfLines={1}>
                              {item.label}
                            </ThemedText>
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{
                                color: color.text,
                                fontWeight: "900",
                              }}
                            >
                              {item.statusLabel}
                            </ThemedText>
                          </View>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{ color: theme.textMuted, lineHeight: 16 }}
                          >
                            {item.detail}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  },
                )}
              </View>
            </View>
            <View
              style={styles.weeklyMasteryFocusDeck}
              testID="arabic-weekly-mastery-focus-lanes"
            >
              <View style={styles.weeklyMasteryFocusHeader}>
                <View>
                  <ThemedText
                    type="caption"
                    style={[
                      styles.weeklyMasteryEyebrow,
                      { color: theme.primary },
                    ]}
                  >
                    WEAKEST SKILL FIRST
                  </ThemedText>
                  <ThemedText type="small">
                    {arabicWeeklyMasteryPlan.activeFocus.label}:{" "}
                    {arabicWeeklyMasteryPlan.activeFocus.score}%
                  </ThemedText>
                </View>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{
                    color: theme.textMuted,
                    flex: 1,
                    textAlign: "right",
                  }}
                >
                  {arabicWeeklyMasteryPlan.activeFocus.recommendation}
                </ThemedText>
              </View>
              <View style={styles.weeklyMasteryFocusGrid}>
                {arabicWeeklyMasteryPlan.focusLanes.map((lane) => {
                  const color = getColor(lane.colorKey);
                  const linkedDay = arabicWeeklyMasteryPlan.days.find(
                    (day) => day.id === lane.dayId,
                  );
                  return (
                    <Pressable
                      key={lane.id}
                      onPress={() =>
                        askArabicTutor(
                          linkedDay?.prompt ||
                            `Coach my weakest Arabic skill: ${lane.label}. Use my saved practice progress and give one recall-first drill.`,
                          `Arabic Focus: ${lane.label}`,
                        )
                      }
                      style={({ pressed }) => [
                        styles.weeklyMasteryFocusCard,
                        {
                          backgroundColor: `${color.text}10`,
                          borderColor: `${color.text}34`,
                        },
                        pressed ? { opacity: 0.84 } : null,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${lane.label} focus. ${lane.score}% ready. ${lane.evidenceLabel}. ${lane.recommendation}`}
                      testID={`button-arabic-weekly-focus-${lane.id}`}
                    >
                      <View
                        style={[
                          styles.weeklyMasteryFocusIcon,
                          { backgroundColor: `${color.text}18` },
                        ]}
                      >
                        <AppIcon
                          name={lane.icon}
                          size={13}
                          color={color.text}
                        />
                      </View>
                      <View style={styles.weeklyMasteryFocusCopy}>
                        <ThemedText type="caption" numberOfLines={1}>
                          {lane.label}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: color.text, fontWeight: "900" }}
                        >
                          {lane.score}% · {lane.evidenceLabel}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.weeklyMasteryTimeline}>
              {arabicWeeklyMasteryPlan.days.map((day) => {
                const color = getColor(day.colorKey);
                const active = day.status === "active";
                const complete = day.status === "complete";
                return (
                  <Pressable
                    key={day.id}
                    onPress={() =>
                      askArabicTutor(day.prompt, `Weekly Plan: ${day.title}`)
                    }
                    style={({ pressed }) => [
                      styles.weeklyMasteryDay,
                      {
                        backgroundColor: active
                          ? color.bg
                          : theme.backgroundSecondary,
                        borderColor: active
                          ? color.text
                          : complete
                            ? `${color.text}42`
                            : theme.borderSubtle,
                      },
                      pressed ? { opacity: 0.84 } : null,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${day.dayLabel}. ${day.title}. ${day.focusLabel}. ${day.progress}% complete. ${day.evidenceLabel}`}
                    testID={`button-arabic-weekly-plan-${day.id}`}
                  >
                    <View style={styles.weeklyMasteryDayTop}>
                      <View
                        style={[
                          styles.weeklyMasteryDayIcon,
                          { backgroundColor: `${color.text}18` },
                        ]}
                      >
                        <AppIcon
                          name={complete ? "check" : day.icon}
                          size={13}
                          color={color.text}
                        />
                      </View>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: color.text, fontWeight: "900" }}
                      >
                        {day.dayLabel}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" numberOfLines={1}>
                      {day.title}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color: theme.textMuted, lineHeight: 16 }}
                    >
                      {day.detail}
                    </ThemedText>
                    <View
                      style={[
                        styles.weeklyMasteryProgressTrack,
                        { backgroundColor: theme.backgroundDefault + "66" },
                      ]}
                      accessibilityRole="progressbar"
                      accessibilityValue={{
                        min: 0,
                        max: 100,
                        now: day.progress,
                      }}
                    >
                      <View
                        style={[
                          styles.weeklyMasteryProgressFill,
                          {
                            width: `${day.progress}%`,
                            backgroundColor: color.text,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.weeklyMasteryDayFooter}>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: color.text, flex: 1 }}
                      >
                        {day.evidenceLabel}
                      </ThemedText>
                      <AppIcon
                        name={isPremium ? "zap" : "lock"}
                        size={12}
                        color={color.text}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(47).duration(320)}>
          <View
            style={[
              styles.arabicProofBoundaryCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: theme.scholar + "34",
              },
            ]}
            accessible
            accessibilityLabel={`${arabicWeeklyMasteryPlan.proofBoundary.title}. ${arabicWeeklyMasteryPlan.proofBoundary.statusLabel}. ${arabicWeeklyMasteryPlan.proofBoundary.publicClaimGuardrail}`}
            testID="arabic-proof-boundary-card"
          >
            <View style={styles.arabicProofBoundaryHeader}>
              <View
                style={[
                  styles.arabicProofBoundaryIcon,
                  { backgroundColor: theme.scholarSoft },
                ]}
              >
                <AppIcon name="shield" size={18} color={theme.scholar} />
              </View>
              <View style={styles.arabicProofBoundaryCopy}>
                <ThemedText
                  type="caption"
                  style={[
                    styles.weeklyMasteryEyebrow,
                    { color: theme.scholar },
                  ]}
                >
                  WHAT THIS PROGRESS MEANS
                </ThemedText>
                <ThemedText type="h4">
                  {arabicWeeklyMasteryPlan.proofBoundary.statusLabel}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textSecondary, lineHeight: 17 }}
                >
                  {arabicWeeklyMasteryPlan.proofBoundary.practiceClaimLabel}
                </ThemedText>
              </View>
            </View>
            <View style={styles.arabicProofBoundaryRows}>
              <View style={styles.arabicProofBoundaryRow}>
                <AppIcon name="target" size={13} color={theme.primary} />
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted, flex: 1, lineHeight: 16 }}
                >
                  {arabicWeeklyMasteryPlan.proofBoundary.nextProofActionLabel}
                </ThemedText>
              </View>
              <View style={styles.arabicProofBoundaryRow}>
                <AppIcon
                  name="alert-triangle"
                  size={13}
                  color={theme.scholar}
                />
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted, flex: 1, lineHeight: 16 }}
                >
                  {arabicWeeklyMasteryPlan.proofBoundary.publicClaimGuardrail}
                </ThemedText>
              </View>
            </View>
            <Pressable
              onPress={() =>
                askArabicTutor(
                  `Help me practise ${arabicWeeklyMasteryPlan.activeFocus.label}. Use one recall-first drill and remind me when a teacher's assessment is needed.`,
                  "Arabic Progress",
                )
              }
              style={({ pressed }) => [
                styles.arabicProofBoundaryButton,
                {
                  backgroundColor: theme.scholarSoft,
                  borderColor: theme.scholar + "34",
                },
                pressed ? { opacity: 0.84 } : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Build next Arabic practice drill for ${arabicWeeklyMasteryPlan.activeFocus.label}`}
              testID="button-arabic-proof-boundary-next"
            >
              <AppIcon
                name="arrow-right-circle"
                size={15}
                color={theme.scholar}
              />
              <ThemedText
                type="caption"
                style={{ color: theme.scholar, fontWeight: "900" }}
              >
                Build next practice drill
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(48).duration(320)}>
          <View
            style={[
              styles.arabicLevelGovernanceCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.primary + "30",
              },
            ]}
            accessible
            accessibilityLabel={`${arabicWeeklyMasteryPlan.levelGovernance.title}. ${arabicWeeklyMasteryPlan.levelGovernance.statusLabel}. ${arabicWeeklyMasteryPlan.levelGovernance.claimBoundary}`}
            testID="arabic-level-governance-card"
          >
            <View style={styles.arabicLevelGovernanceHeader}>
              <View
                style={[
                  styles.arabicLevelGovernanceIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <AppIcon name="compass" size={18} color={theme.primary} />
              </View>
              <View style={styles.arabicLevelGovernanceCopy}>
                <ThemedText
                  type="caption"
                  style={[
                    styles.weeklyMasteryEyebrow,
                    { color: theme.primary },
                  ]}
                >
                  LEVEL PROGRESS
                </ThemedText>
                <ThemedText type="h4">
                  {arabicWeeklyMasteryPlan.levelGovernance.statusLabel}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textSecondary, lineHeight: 17 }}
                >
                  {arabicWeeklyMasteryPlan.levelGovernance.claimBoundary}
                </ThemedText>
              </View>
            </View>

            <View style={styles.arabicLevelGovernanceGrid}>
              {arabicWeeklyMasteryPlan.levelGovernance.items.map((item) => {
                const color = getColor(item.colorKey);
                return (
                  <View
                    key={item.id}
                    testID={`arabic-level-governance-${item.id}`}
                    style={[
                      styles.arabicLevelGovernanceItem,
                      {
                        backgroundColor: color.bg,
                        borderColor: `${color.text}34`,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.arabicLevelGovernanceItemIcon,
                        { backgroundColor: `${color.text}18` },
                      ]}
                    >
                      <AppIcon name={item.icon} size={13} color={color.text} />
                    </View>
                    <View style={styles.arabicLevelGovernanceItemCopy}>
                      <View style={styles.arabicLevelGovernanceItemTop}>
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: color.text, fontWeight: "900" }}
                        >
                          {item.label}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{
                            color: color.text,
                            fontWeight: "900",
                            fontSize: 10,
                          }}
                        >
                          {item.statusLabel}
                        </ThemedText>
                      </View>
                      <ThemedText
                        type="caption"
                        numberOfLines={2}
                        style={{ color: theme.textMuted, lineHeight: 16 }}
                      >
                        {item.detail}
                      </ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>

            <Pressable
              onPress={() =>
                askArabicTutor(
                  arabicWeeklyMasteryPlan.levelGovernance.prompt,
                  "Arabic Level Progress",
                )
              }
              style={({ pressed }) => [
                styles.arabicLevelGovernanceButton,
                {
                  backgroundColor: isPremium
                    ? theme.primary
                    : theme.primarySoft,
                  borderColor: theme.primaryBorder,
                },
                pressed ? { opacity: 0.84 } : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${arabicWeeklyMasteryPlan.levelGovernance.nextActionLabel} with Arabic Coach`}
              testID="button-arabic-level-governance"
            >
              <AppIcon
                name={isPremium ? "arrow-right-circle" : "lock"}
                size={15}
                color={isPremium ? theme.primaryForeground : theme.primary}
              />
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{
                  color: isPremium ? theme.primaryForeground : theme.primary,
                  fontWeight: "900",
                }}
              >
                {arabicWeeklyMasteryPlan.levelGovernance.nextActionLabel}
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(49).duration(320)}>
          <View
            style={[
              styles.teacherReviewPacketCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.primary + "34",
              },
            ]}
            accessible
            accessibilityLabel={`${arabicWeeklyMasteryPlan.teacherReviewPacket.title}. ${arabicWeeklyMasteryPlan.teacherReviewPacket.statusLabel}. ${arabicWeeklyMasteryPlan.teacherReviewPacket.learnerClaimBoundary}`}
            testID="arabic-teacher-review-packet"
          >
            <View style={styles.teacherReviewPacketHeader}>
              <View
                style={[
                  styles.teacherReviewPacketIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <AppIcon name="user-check" size={18} color={theme.primary} />
              </View>
              <View style={styles.teacherReviewPacketCopy}>
                <ThemedText
                  type="caption"
                  style={[
                    styles.weeklyMasteryEyebrow,
                    { color: theme.primary },
                  ]}
                >
                  SHARE WITH A TEACHER
                </ThemedText>
                <ThemedText type="h4">
                  {arabicWeeklyMasteryPlan.teacherReviewPacket.statusLabel}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textSecondary, lineHeight: 17 }}
                >
                  {
                    arabicWeeklyMasteryPlan.teacherReviewPacket
                      .learnerClaimBoundary
                  }
                </ThemedText>
              </View>
              <View
                style={[
                  styles.teacherReviewPacketScore,
                  { borderColor: theme.primaryBorder },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "900" }}
                >
                  {arabicWeeklyMasteryPlan.teacherReviewPacket.readinessScore}%
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: theme.textMuted }}
                >
                  teacher-ready
                </ThemedText>
              </View>
            </View>
            <View style={styles.teacherReviewChecklist}>
              {arabicWeeklyMasteryPlan.teacherReviewPacket.checklist.map(
                (item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.teacherReviewChecklistItem,
                      {
                        backgroundColor: item.complete
                          ? theme.primarySoft
                          : theme.backgroundSecondary,
                        borderColor: item.complete
                          ? theme.primaryBorder
                          : theme.borderSubtle,
                      },
                    ]}
                    testID={`arabic-teacher-review-checkpoint-${item.id}`}
                  >
                    <View
                      style={[
                        styles.teacherReviewChecklistIcon,
                        {
                          backgroundColor: item.complete
                            ? theme.primary
                            : theme.scholarSoft,
                        },
                      ]}
                    >
                      <AppIcon
                        name={item.complete ? "check" : item.icon}
                        size={12}
                        color={
                          item.complete
                            ? theme.primaryForeground
                            : theme.scholar
                        }
                      />
                    </View>
                    <View style={styles.teacherReviewChecklistCopy}>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ fontWeight: "900" }}
                      >
                        {item.label}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={2}
                        style={{ color: theme.textMuted, lineHeight: 16 }}
                      >
                        {item.detail}
                      </ThemedText>
                    </View>
                  </View>
                ),
              )}
            </View>
            <Pressable
              onPress={shareArabicTeacherReviewPacket}
              style={({ pressed }) => [
                styles.teacherReviewPacketButton,
                {
                  backgroundColor: theme.primary,
                  borderColor: theme.primaryBorder,
                },
                pressed ? { opacity: 0.84 } : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Share Arabic practice summary with a teacher"
              accessibilityHint="Shares your local practice progress so a teacher can guide a real assessment."
              testID="button-arabic-teacher-review-packet"
            >
              <AppIcon name="send" size={14} color={theme.primaryForeground} />
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{
                  color: theme.primaryForeground,
                  fontWeight: "900",
                }}
              >
                Share with teacher
              </ThemedText>
            </Pressable>
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, lineHeight: 17 }}
            >
              {
                arabicWeeklyMasteryPlan.teacherReviewPacket
                  .nextTeacherActionLabel
              }{" "}
              before asking for detailed feedback.
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(49).duration(320)}>
          <View
            style={[
              styles.portfolioCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: theme.primaryBorder,
              },
            ]}
            testID="arabic-skill-portfolio"
          >
            <View style={styles.portfolioHeader}>
              <View
                style={[
                  styles.portfolioSeal,
                  { backgroundColor: theme.primarySubtle },
                ]}
              >
                <AppIcon name="award" size={19} color={theme.primary} />
              </View>
              <View style={styles.portfolioTitleWrap}>
                <ThemedText
                  type="caption"
                  style={[styles.portfolioEyebrow, { color: theme.primary }]}
                >
                  Arabic Skill Portfolio
                </ThemedText>
                <ThemedText type="h4">Progress from real practice</ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted }}
                >
                  Progress from listening, replies, writing, Quran words, and
                  review.
                </ThemedText>
              </View>
              <View
                style={[
                  styles.portfolioReadiness,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.primaryBorder,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "900" }}
                >
                  {portfolioAverage}%
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: theme.textMuted }}
                >
                  ready
                </ThemedText>
              </View>
            </View>

            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, fontWeight: "800" }}
            >
              Portfolio readiness
            </ThemedText>
            <View
              style={[
                styles.portfolioReadinessTrack,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: portfolioAverage }}
            >
              <View
                style={[
                  styles.portfolioReadinessFill,
                  {
                    width: `${portfolioAverage}%`,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>

            <View style={styles.portfolioGrid}>
              {arabicSkillPortfolio.map((item) => {
                const color = getColor(item.colorKey);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => askArabicTutor(item.prompt, item.label)}
                    style={({ pressed }) => [
                      styles.portfolioItem,
                      {
                        backgroundColor: color.bg,
                        borderColor: `${color.text}34`,
                      },
                      pressed && { opacity: 0.84 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.label}. ${item.title}. ${item.progress}% complete. ${item.actionLabel}`}
                    testID={`button-arabic-portfolio-${item.id}`}
                  >
                    <View
                      style={[
                        styles.portfolioItemIcon,
                        { backgroundColor: `${color.text}18` },
                      ]}
                    >
                      <AppIcon name={item.icon} size={14} color={color.text} />
                    </View>
                    <View style={styles.portfolioItemCopy}>
                      <View style={styles.portfolioItemTopLine}>
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={[
                            styles.portfolioItemLabel,
                            { color: color.text },
                          ]}
                        >
                          {item.label}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          style={{ color: color.text, fontWeight: "900" }}
                        >
                          {item.progress}%
                        </ThemedText>
                      </View>
                      <ThemedText type="small" numberOfLines={1}>
                        {item.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={2}
                        style={{ color: theme.textMuted, lineHeight: 16 }}
                      >
                        {item.evidence}
                      </ThemedText>
                      <View
                        style={[
                          styles.portfolioItemTrack,
                          { backgroundColor: theme.backgroundDefault + "66" },
                        ]}
                        accessibilityRole="progressbar"
                        accessibilityValue={{
                          min: 0,
                          max: 100,
                          now: item.progress,
                        }}
                      >
                        <View
                          style={[
                            styles.portfolioItemFill,
                            {
                              width: `${item.progress}%`,
                              backgroundColor: color.text,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View
                      style={[
                        styles.portfolioActionPill,
                        { borderColor: `${color.text}48` },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: color.text, fontWeight: "900" }}
                      >
                        {item.actionLabel}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(56).duration(320)}>
          <View
            style={[
              styles.courseMapCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: theme.scholar + "35",
              },
            ]}
          >
            <View style={styles.courseMapHeader}>
              <View
                style={[
                  styles.courseMapIcon,
                  { backgroundColor: theme.scholarSoft },
                ]}
              >
                <AppIcon name="map" size={18} color={theme.scholar} />
              </View>
              <View style={styles.courseMapCopy}>
                <ThemedText
                  type="caption"
                  style={[styles.courseMapEyebrow, { color: theme.scholar }]}
                >
                  Arabic Learning Path
                </ThemedText>
                <ThemedText type="h4">
                  {currentArabicLevel.title} to {nextArabicLevel.title}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Your next mission: {nextArabicMission.title}
                </ThemedText>
              </View>
              <Pressable
                onPress={() =>
                  askArabicTutor(
                    nextArabicMission.prompt,
                    nextArabicMission.title,
                  )
                }
                style={({ pressed }) => [
                  styles.courseMapButton,
                  {
                    backgroundColor: isPremium
                      ? theme.scholar
                      : theme.backgroundSecondary,
                    borderColor: theme.scholar + "44",
                  },
                  pressed && { opacity: 0.82 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${nextArabicMission.actionLabel} with Arabic Coach`}
              >
                <AppIcon
                  name={isPremium ? "play" : "lock"}
                  size={13}
                  color={isPremium ? theme.primaryForeground : theme.scholar}
                />
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{
                    color: isPremium ? theme.primaryForeground : theme.scholar,
                    fontWeight: "800",
                  }}
                >
                  {nextArabicMission.actionLabel}
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.courseMapPillars}>
              {arabicLevelMilestones.map((milestone) => {
                const color = getColor(milestone.colorKey);
                const active = milestone.id === currentArabicLevel.id;
                return (
                  <View
                    key={milestone.id}
                    style={[
                      styles.courseMapPillar,
                      {
                        backgroundColor: active
                          ? color.bg
                          : theme.backgroundSecondary,
                        borderColor: active ? color.text : theme.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.courseMapPillarTop}>
                      <AppIcon
                        name={milestone.icon}
                        size={13}
                        color={active ? color.text : theme.textMuted}
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color: active ? color.text : theme.textMuted,
                          fontWeight: "800",
                        }}
                      >
                        {milestone.level}
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: active ? color.text : theme.text }}
                    >
                      {milestone.title}
                    </ThemedText>
                    <View
                      style={[
                        styles.courseMapProgressTrack,
                        { backgroundColor: theme.backgroundDefault + "66" },
                      ]}
                      accessibilityRole="progressbar"
                      accessibilityValue={{
                        min: 0,
                        max: 100,
                        now: milestone.progress,
                      }}
                    >
                      <View
                        style={[
                          styles.courseMapProgressFill,
                          {
                            width: `${milestone.progress}%`,
                            backgroundColor: color.text,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(64).duration(320)}>
          <View
            style={[
              styles.passportCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: theme.scholar + "40",
              },
            ]}
          >
            <View style={styles.passportHeader}>
              <View
                style={[
                  styles.passportSeal,
                  { backgroundColor: theme.scholarSoft },
                ]}
              >
                <AppIcon
                  name={currentArabicLevel.icon}
                  size={20}
                  color={theme.scholar}
                />
              </View>
              <View style={styles.passportTitleWrap}>
                <ThemedText
                  type="caption"
                  style={[styles.passportEyebrow, { color: theme.scholar }]}
                >
                  Can-Do Passport
                </ThemedText>
                <ThemedText type="h4">
                  {currentArabicLevel.level}: {currentArabicLevel.title}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  {currentArabicLevel.promise}
                </ThemedText>
              </View>
            </View>

            <View
              style={[
                styles.passportProgressTrack,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: currentArabicLevel.progress,
              }}
            >
              <View
                style={[
                  styles.passportProgressFill,
                  {
                    width: `${currentArabicLevel.progress}%`,
                    backgroundColor: theme.scholar,
                  },
                ]}
              />
            </View>

            <View style={styles.passportProofRow}>
              <View style={styles.passportProofCopy}>
                <ThemedText type="small">Next practice</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  {nextArabicLevel.requirement}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  {nextArabicLevel.evidence}
                </ThemedText>
              </View>
              {isPremium ? (
                <Pressable
                  onPress={() =>
                    askArabicTutor(
                      nextArabicLevel.prompt,
                      "Arabic Placement Coach",
                    )
                  }
                  style={({ pressed }) => [
                    styles.passportButton,
                    { backgroundColor: theme.scholar },
                    pressed && { opacity: 0.84 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${nextArabicLevel.ctaLabel} with NurAI Arabic Coach`}
                >
                  <AppIcon
                    name="compass"
                    size={14}
                    color={theme.primaryForeground}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.primaryForeground,
                      fontWeight: "800",
                    }}
                  >
                    {nextArabicLevel.ctaLabel}
                  </ThemedText>
                </Pressable>
              ) : (
                <View
                  style={[
                    styles.passportButton,
                    styles.freeGuidePill,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.scholar + "44",
                    },
                  ]}
                >
                  <AppIcon name="map" size={14} color={theme.scholar} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "800" }}
                  >
                    Free path
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.levelRail}>
              {arabicLevelMilestones.map((milestone) => {
                const color = getColor(milestone.colorKey);
                const active = milestone.id === currentArabicLevel.id;
                return (
                  <View
                    key={milestone.id}
                    style={[
                      styles.levelPillCard,
                      {
                        backgroundColor: active
                          ? color.bg
                          : theme.backgroundSecondary,
                        borderColor: active ? color.text : theme.borderSubtle,
                      },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{
                        color: active ? color.text : theme.textMuted,
                        fontWeight: "800",
                      }}
                    >
                      {milestone.title}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: active ? color.text : theme.textMuted }}
                    >
                      {milestone.progress}%
                    </ThemedText>
                  </View>
                );
              })}
            </View>

            <View
              style={[
                styles.placementPanel,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <View style={styles.placementPanelHeader}>
                <View>
                  <ThemedText type="small">Self profile</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    {learningProgress.placementCheckCount > 0
                      ? `Saved profile ${learningProgress.placementCheckCount}x`
                      : "Rate yourself, then save your first placement"}
                  </ThemedText>
                </View>
                <ThemedText
                  type="caption"
                  style={{ color: theme.scholar, fontWeight: "800" }}
                >
                  {placementAverageScore}%
                </ThemedText>
              </View>

              <View style={styles.placementGrid}>
                {PLACEMENT_SKILLS.map((skill) => {
                  const color = getColor(skill.colorKey);
                  const rating = learningProgress.skillSelfRatings[skill.id];
                  return (
                    <View
                      key={skill.id}
                      style={[
                        styles.placementSkillCard,
                        {
                          backgroundColor: theme.cardBackground,
                          borderColor: theme.borderSubtle,
                        },
                      ]}
                    >
                      <View style={styles.placementSkillHeader}>
                        <View
                          style={[
                            styles.placementSkillIcon,
                            { backgroundColor: color.bg },
                          ]}
                        >
                          <AppIcon
                            name={skill.icon}
                            size={14}
                            color={color.text}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText type="caption" style={styles.skillLabel}>
                            {skill.label}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.textMuted }}
                          >
                            {skill.subtitle}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.ratingRow}>
                        {PLACEMENT_RATINGS.map((option) => {
                          const selected = rating === option.value;
                          return (
                            <Pressable
                              key={`${skill.id}-${option.value}`}
                              onPress={() =>
                                updatePlacementRating(skill.id, option.value)
                              }
                              style={[
                                styles.ratingChip,
                                {
                                  backgroundColor: selected
                                    ? color.bg
                                    : theme.surfaceGlass,
                                  borderColor: selected
                                    ? color.text
                                    : theme.borderSubtle,
                                },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`Rate ${skill.label} as ${option.label}`}
                              accessibilityState={{ selected }}
                            >
                              <ThemedText
                                type="caption"
                                style={{
                                  color: selected
                                    ? color.text
                                    : theme.textMuted,
                                  fontWeight: "800",
                                }}
                              >
                                {option.label}
                              </ThemedText>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.placementActions}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    Last saved:{" "}
                    {learningProgress.lastPlacementAt
                      ? new Date(
                          learningProgress.lastPlacementAt,
                        ).toLocaleDateString()
                      : "not yet"}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    Saved as {learningProgress.arabicLevelId.replace(/-/g, " ")}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={savePlacementProfile}
                  disabled={!canSavePlacementProfile}
                  style={({ pressed }) => [
                    styles.savePlacementButton,
                    { backgroundColor: theme.primary },
                    !canSavePlacementProfile && {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.borderSubtle,
                    },
                    pressed && { opacity: 0.84 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Save Arabic placement profile"
                  accessibilityState={{ disabled: !canSavePlacementProfile }}
                >
                  <AppIcon
                    name="check"
                    size={14}
                    color={
                      canSavePlacementProfile
                        ? theme.primaryForeground
                        : theme.textMuted
                    }
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: canSavePlacementProfile
                        ? theme.primaryForeground
                        : theme.textMuted,
                      fontWeight: "800",
                    }}
                  >
                    Save profile
                  </ThemedText>
                </Pressable>
              </View>
              {placementProfileFeedback ? (
                <ThemedText
                  type="caption"
                  style={[styles.placementFeedback, { color: theme.error }]}
                >
                  {placementProfileFeedback}
                </ThemedText>
              ) : null}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(70).duration(320)}>
          <View
            style={[
              styles.aiCoachCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: isPremium
                  ? theme.primaryBorder
                  : theme.scholar + "55",
              },
            ]}
          >
            <View
              style={[
                styles.coachIcon,
                { backgroundColor: theme.primarySubtle },
              ]}
            >
              <AppIcon name="message-square" size={21} color={theme.primary} />
            </View>
            <View style={styles.coachCopy}>
              <ThemedText type="h4">NurAI Arabic Coach</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                {isPremium
                  ? "Get a custom drill, pronunciation tips, and a role-play based on the lesson you are studying."
                  : "Premium unlocks live role-play, pronunciation coaching, and corrections for the lesson you are studying."}
              </ThemedText>
            </View>
            <Pressable
              onPress={() =>
                askArabicTutor(
                  `Create a short Arabic role-play drill for "${selectedDialogue.title}". Include Arabic, transliteration, English meaning, and three corrections a beginner should watch for.`,
                  "Arabic Role-play Coach",
                )
              }
              style={({ pressed }) => [
                styles.coachButton,
                {
                  backgroundColor: isPremium ? theme.primary : theme.scholar,
                },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isPremium
                  ? "Practise Arabic with NurAI"
                  : "Unlock NurAI Arabic Coach"
              }
            >
              <AppIcon
                name={isPremium ? "zap" : "lock"}
                size={15}
                color={theme.primaryForeground}
              />
              <ThemedText
                type="caption"
                style={[
                  styles.coachButtonText,
                  { color: theme.primaryForeground },
                ]}
              >
                {isPremium ? "Practise" : "Unlock"}
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(76).duration(320)}>
          <View
            style={[
              styles.pronunciationStudioCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: theme.primaryBorder,
              },
            ]}
            testID="arabic-pronunciation-confidence-studio"
          >
            <View style={styles.pronunciationStudioHeader}>
              <View
                style={[
                  styles.pronunciationStudioIcon,
                  { backgroundColor: theme.primarySubtle },
                ]}
              >
                <AppIcon name="mic" size={19} color={theme.primary} />
              </View>
              <View style={styles.pronunciationStudioCopy}>
                <ThemedText
                  type="caption"
                  style={[
                    styles.pronunciationStudioEyebrow,
                    { color: theme.primary },
                  ]}
                >
                  Pronunciation Confidence Studio
                </ThemedText>
                <ThemedText type="h4">Hear, shadow, then rate it</ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted }}
                >
                  Turn the current dialogue line into speaking practice before
                  moving on.
                </ThemedText>
              </View>
              <View
                style={[
                  styles.pronunciationScoreBadge,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.primaryBorder,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "900" }}
                >
                  {pronunciationConfidenceProgress}%
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: theme.textMuted }}
                >
                  voice
                </ThemedText>
              </View>
            </View>

            <View
              style={[
                styles.pronunciationLineCard,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.pronunciationArabic,
                  { color: theme.text, textAlign: "right" },
                ]}
              >
                {currentDialogueTurn.arabic}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, fontWeight: "800" }}
              >
                {currentDialogueTurn.transliteration}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                {currentDialogueTurn.meaning}
              </ThemedText>
              <View style={styles.listenRow}>
                {renderArabicListenButton(
                  currentDialogueTurn.arabic,
                  `pronunciation:${selectedDialogue.id}:${currentDialogueTurnIndex}`,
                  "Listen to model",
                )}
              </View>
            </View>

            <View style={styles.pronunciationEvidenceRow}>
              <View style={styles.pronunciationEvidenceItem}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, fontWeight: "800" }}
                >
                  This line
                </ThemedText>
                <ThemedText type="h4">{currentLineShadowCount} reps</ThemedText>
              </View>
              <View style={styles.pronunciationEvidenceItem}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, fontWeight: "800" }}
                >
                  Dialogue
                </ThemedText>
                <ThemedText type="h4">
                  {selectedDialogueShadowRepTotal} reps
                </ThemedText>
              </View>
              <View style={styles.pronunciationEvidenceItem}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, fontWeight: "800" }}
                >
                  Confidence
                </ThemedText>
                <ThemedText type="h4">
                  {selectedDialogueConfidenceAverage}%
                </ThemedText>
              </View>
            </View>

            <View style={styles.pronunciationRatingRow}>
              {SPEAKING_CONFIDENCE_RATINGS.map((option) => {
                const selected = currentLineSpeakingConfidence === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => recordSpeakingShadowConfidence(option.value)}
                    style={[
                      styles.pronunciationRatingChip,
                      {
                        backgroundColor: selected
                          ? theme.primarySubtle
                          : theme.surfaceGlass,
                        borderColor: selected
                          ? theme.primary
                          : theme.borderSubtle,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Rate this Arabic line as ${option.label}`}
                    accessibilityState={{ selected }}
                    testID={`button-arabic-speaking-confidence-${option.value}`}
                  >
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{
                        color: selected ? theme.primary : theme.textSecondary,
                        fontWeight: "900",
                      }}
                    >
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.pronunciationActions}>
              <Pressable
                onPress={() => recordSpeakingShadowConfidence()}
                style={[
                  styles.pronunciationPrimaryButton,
                  { backgroundColor: theme.primary },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save one Arabic shadow repetition"
                testID="button-arabic-shadow-rep"
              >
                <AppIcon
                  name="check-circle"
                  size={14}
                  color={theme.primaryForeground}
                />
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.primaryForeground,
                    fontWeight: "900",
                  }}
                >
                  Mark shadow rep
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={askPronunciationConfidenceCoach}
                style={[
                  styles.pronunciationSecondaryButton,
                  { borderColor: theme.scholar + "55" },
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  isPremium
                    ? "Ask NurAI to coach pronunciation confidence"
                    : "Unlock pronunciation confidence coaching"
                }
                testID="button-arabic-pronunciation-confidence-coach"
              >
                <AppIcon
                  name={isPremium ? "message-square" : "lock"}
                  size={14}
                  color={theme.scholar}
                />
                <ThemedText
                  type="caption"
                  style={{ color: theme.scholar, fontWeight: "900" }}
                >
                  {isPremium ? "Coach voice" : "Unlock coach"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(78).duration(320)}>
          <View
            style={[
              styles.dailyWorkoutCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: theme.primaryBorder,
              },
            ]}
            testID="arabic-today-mastery-loop"
          >
            <View style={styles.dailyWorkoutHeader}>
              <View
                style={[
                  styles.dailyWorkoutIcon,
                  { backgroundColor: theme.primarySubtle },
                ]}
              >
                <AppIcon name="activity" size={20} color={theme.primary} />
              </View>
              <View style={styles.dailyWorkoutCopy}>
                <ThemedText
                  type="caption"
                  style={[styles.dailyWorkoutEyebrow, { color: theme.primary }]}
                >
                  TODAY'S ARABIC MASTERY LOOP
                </ThemedText>
                <ThemedText type="h4">One complete Arabic session</ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted, lineHeight: 17 }}
                >
                  Listen, answer, build, explain, then lock it into review.
                </ThemedText>
              </View>
              <View
                style={[
                  styles.dailyWorkoutScore,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "800" }}
                >
                  {dailyFluencyProgress}%
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  today
                </ThemedText>
              </View>
            </View>

            <View
              style={[
                styles.masteryLoopMetaRail,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <View style={styles.masteryLoopMetaItem}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, fontWeight: "800" }}
                >
                  Dialogue
                </ThemedText>
                <ThemedText type="caption" numberOfLines={1}>
                  {selectedDialogue.title}
                </ThemedText>
              </View>
              <View style={styles.masteryLoopMetaDivider} />
              <View style={styles.masteryLoopMetaItem}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, fontWeight: "800" }}
                >
                  Quran word
                </ThemedText>
                <ThemedText type="caption" numberOfLines={1}>
                  {dailyWord.transliteration} / {dailyWord.arabic}
                </ThemedText>
              </View>
            </View>

            <View style={styles.dailyWorkoutSteps}>
              {dailyFluencyDrill.map((step) => {
                const color = getColor(step.colorKey);
                const complete = step.progress >= 70;
                return (
                  <Pressable
                    key={step.id}
                    onPress={() =>
                      askArabicTutor(
                        step.prompt ?? dailyFluencyPrompt,
                        step.actionLabel ?? step.title,
                      )
                    }
                    style={[
                      styles.dailyWorkoutStep,
                      {
                        backgroundColor: complete
                          ? `${color.text}10`
                          : theme.backgroundSecondary,
                        borderColor: complete ? color.text : theme.borderSubtle,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${step.modeLabel ?? step.title}. ${step.title}. ${step.detail}. ${step.proofLabel ?? `${step.progress}% complete`}. ${step.actionLabel ?? "Start drill"}`}
                    testID={`button-arabic-mastery-loop-${step.id}`}
                  >
                    <View
                      style={[
                        styles.dailyWorkoutStepIcon,
                        { backgroundColor: color.bg },
                      ]}
                    >
                      <AppIcon name={step.icon} size={14} color={color.text} />
                    </View>
                    <View style={styles.dailyWorkoutStepCopy}>
                      <ThemedText type="caption" style={styles.stepTitle}>
                        {step.title}
                      </ThemedText>
                      <View style={styles.masteryLoopModeRow}>
                        <View
                          style={[
                            styles.masteryLoopModePill,
                            {
                              backgroundColor: color.bg,
                              borderColor: `${color.text}30`,
                            },
                          ]}
                        >
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{
                              color: color.text,
                              fontWeight: "900",
                            }}
                          >
                            {step.modeLabel}
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: theme.textMuted, flex: 1 }}
                        >
                          {step.proofLabel}
                        </ThemedText>
                      </View>
                      <ThemedText
                        type="caption"
                        numberOfLines={2}
                        style={{ color: theme.textMuted }}
                      >
                        {step.detail}
                      </ThemedText>
                      <View
                        style={[
                          styles.masteryLoopProgressTrack,
                          { backgroundColor: theme.borderSubtle },
                        ]}
                      >
                        <View
                          style={[
                            styles.masteryLoopProgressFill,
                            {
                              width: `${Math.min(100, step.progress)}%`,
                              backgroundColor: color.text,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.masteryLoopActionStack}>
                      <View
                        style={[
                          styles.masteryLoopCheck,
                          {
                            backgroundColor: complete
                              ? color.text
                              : "transparent",
                            borderColor: `${color.text}55`,
                          },
                        ]}
                      >
                        <AppIcon
                          name={complete ? "check" : "arrow-up-right"}
                          size={12}
                          color={complete ? theme.backgroundRoot : color.text}
                        />
                      </View>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: color.text, fontWeight: "900" }}
                      >
                        {step.progress}%
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {isPremium ? (
              <Pressable
                onPress={() =>
                  askArabicTutor(dailyFluencyPrompt, "Daily Arabic Workout")
                }
                style={({ pressed }) => [
                  styles.dailyWorkoutButton,
                  { backgroundColor: theme.primary },
                  pressed && { opacity: 0.84 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Start today's Arabic fluency workout with NurAI"
              >
                <AppIcon
                  name="play"
                  size={15}
                  color={theme.primaryForeground}
                />
                <ThemedText
                  type="caption"
                  style={{ color: theme.primaryForeground, fontWeight: "800" }}
                >
                  Start guided workout
                </ThemedText>
              </Pressable>
            ) : (
              <View
                style={[
                  styles.dailyWorkoutButton,
                  styles.freeGuidePill,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.primaryBorder,
                  },
                ]}
              >
                <AppIcon name="arrow-down" size={15} color={theme.primary} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "800" }}
                >
                  Use drills below
                </ThemedText>
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(320)}>
          <View
            style={[
              styles.missionCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.scholar + "33",
              },
            ]}
          >
            <View
              style={[
                styles.missionIcon,
                { backgroundColor: theme.scholarSoft },
              ]}
            >
              <AppIcon
                name={nextArabicMission.icon}
                size={19}
                color={theme.scholar}
              />
            </View>
            <View style={styles.missionCopy}>
              <ThemedText
                type="caption"
                style={[styles.missionEyebrow, { color: theme.scholar }]}
              >
                Today's best next step
              </ThemedText>
              <ThemedText type="h4">{nextArabicMission.title}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                {nextArabicMission.subtitle}
              </ThemedText>
            </View>
            {isPremium ? (
              <Pressable
                onPress={() =>
                  askArabicTutor(
                    nextArabicMission.prompt,
                    nextArabicMission.title,
                  )
                }
                style={({ pressed }) => [
                  styles.missionButton,
                  { borderColor: theme.scholar + "55" },
                  pressed && { opacity: 0.75 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${nextArabicMission.actionLabel} with NurAI`}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.scholar, fontWeight: "800" }}
                >
                  {nextArabicMission.actionLabel}
                </ThemedText>
              </Pressable>
            ) : (
              <View
                style={[
                  styles.missionButton,
                  {
                    borderColor: theme.borderSubtle,
                    backgroundColor: theme.backgroundSecondary,
                  },
                ]}
              >
                <AppIcon name="arrow-down" size={12} color={theme.scholar} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.scholar, fontWeight: "800" }}
                >
                  Start below
                </ThemedText>
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(82).duration(320)}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="h4">Smart Review Queue</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                {arabicReviewScheduleStats.dueCount > 0
                  ? `${arabicReviewScheduleStats.dueCount} due now from ${arabicReviewScheduleStats.scheduledCount} scheduled items`
                  : `Your weakest active skills, from ${arabicReviewScheduleStats.scheduledCount} scheduled items`}
              </ThemedText>
            </View>
          </View>
          <View
            testID="arabic-retention-proof-card"
            style={[
              styles.retentionProofCard,
              {
                backgroundColor: retentionTone.bg,
                borderColor: `${retentionTone.text}44`,
              },
            ]}
          >
            <View style={styles.retentionProofHeader}>
              <View
                style={[
                  styles.retentionProofIcon,
                  { backgroundColor: `${retentionTone.text}1F` },
                ]}
              >
                <AppIcon name="shield" size={17} color={retentionTone.text} />
              </View>
              <View style={styles.retentionProofCopy}>
                <ThemedText
                  type="caption"
                  style={[
                    styles.retentionProofEyebrow,
                    { color: retentionTone.text },
                  ]}
                >
                  RETENTION SHIELD
                </ThemedText>
                <ThemedText type="h4">
                  {arabicRetentionSummary.retentionLabel}
                </ThemedText>
              </View>
              <ThemedText
                type="caption"
                style={[
                  styles.retentionProofBadge,
                  {
                    color: retentionTone.text,
                    borderColor: `${retentionTone.text}55`,
                  },
                ]}
              >
                {arabicRetentionSummary.retentionRisk.replace("_", " ")}
              </ThemedText>
            </View>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, lineHeight: 18 }}
            >
              {arabicRetentionSummary.retentionBody}
            </ThemedText>
            <View style={styles.retentionProofMetaRow}>
              <ThemedText
                type="caption"
                style={{ color: retentionTone.text, fontWeight: "800" }}
              >
                {arabicRetentionSummary.recallProofLabel}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                {arabicRetentionSummary.nextDueAt
                  ? `Next due ${arabicRetentionSummary.nextDueAt}`
                  : "No review scheduled yet"}
              </ThemedText>
            </View>
          </View>
          <View
            testID="arabic-review-recovery-plan"
            style={[
              styles.reviewRecoveryCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: `${retentionTone.text}34`,
              },
            ]}
            accessible
            accessibilityLabel={`Arabic Review Recovery Plan. ${arabicReviewRecoveryPlan.statusLabel}. ${arabicReviewRecoveryPlan.guardrail}`}
          >
            <View style={styles.reviewRecoveryHeader}>
              <View
                style={[
                  styles.reviewRecoveryIcon,
                  { backgroundColor: `${retentionTone.text}1A` },
                ]}
              >
                <AppIcon name="activity" size={17} color={retentionTone.text} />
              </View>
              <View style={styles.reviewRecoveryCopy}>
                <ThemedText
                  type="caption"
                  style={[
                    styles.retentionProofEyebrow,
                    { color: retentionTone.text },
                  ]}
                >
                  REVIEW RECOVERY PLAN
                </ThemedText>
                <ThemedText type="h4">
                  {arabicReviewRecoveryPlan.title}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted, lineHeight: 18 }}
                >
                  {arabicReviewRecoveryPlan.recoveryLabel}
                </ThemedText>
              </View>
              <ThemedText
                type="caption"
                style={[
                  styles.retentionProofBadge,
                  {
                    color: retentionTone.text,
                    borderColor: `${retentionTone.text}55`,
                  },
                ]}
              >
                {arabicReviewRecoveryPlan.estimatedMinutes} min
              </ThemedText>
            </View>
            <View style={styles.reviewRecoverySteps}>
              {arabicReviewRecoveryPlan.steps.map((step, index) => (
                <View key={step.id} style={styles.reviewRecoveryStep}>
                  <View
                    style={[
                      styles.reviewRecoveryStepIndex,
                      { borderColor: `${retentionTone.text}55` },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{ color: retentionTone.text, fontWeight: "900" }}
                    >
                      {index + 1}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText type="small">{step.title}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted, lineHeight: 17 }}
                    >
                      {step.detail}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
            <View
              style={[
                styles.reviewRecoveryGuardrail,
                { borderColor: `${retentionTone.text}33` },
              ]}
            >
              <AppIcon name="shield" size={13} color={retentionTone.text} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
              >
                {arabicReviewRecoveryPlan.guardrail}
              </ThemedText>
            </View>
            <Pressable
              onPress={() =>
                askArabicTutor(
                  arabicReviewRecoveryPlan.prompt,
                  "Arabic Review Recovery",
                )
              }
              style={({ pressed }) => [
                styles.reviewRecoveryButton,
                { borderColor: `${retentionTone.text}55` },
                pressed && { opacity: 0.75 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Coach Arabic review recovery with NurAI"
              testID="button-arabic-review-recovery-coach"
            >
              <AppIcon
                name={isPremium ? "zap" : "lock"}
                size={13}
                color={retentionTone.text}
              />
              <ThemedText
                type="caption"
                style={{ color: retentionTone.text, fontWeight: "800" }}
              >
                {isPremium ? "Coach recovery" : "Unlock coach"}
              </ThemedText>
            </Pressable>
          </View>
          <View
            style={[
              styles.reviewQueueCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            {smartReviewQueue.map((focus) => {
              const color = getColor(focus.colorKey);
              return (
                <View key={focus.id} style={styles.reviewFocusRow}>
                  <View
                    style={[
                      styles.reviewFocusIcon,
                      { backgroundColor: color.bg },
                    ]}
                  >
                    <AppIcon name={focus.icon} size={16} color={color.text} />
                  </View>
                  <View style={styles.reviewFocusCopy}>
                    <View style={styles.reviewFocusTopLine}>
                      <ThemedText
                        type="caption"
                        style={[styles.reviewFocusLabel, { color: color.text }]}
                      >
                        {focus.label}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: color.text, fontWeight: "800" }}
                      >
                        {focus.progress}%
                      </ThemedText>
                    </View>
                    <ThemedText type="small">{focus.title}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {focus.evidence}
                    </ThemedText>
                    <View
                      style={[
                        styles.reviewFocusProgressTrack,
                        { backgroundColor: theme.backgroundSecondary },
                      ]}
                      accessibilityRole="progressbar"
                      accessibilityValue={{
                        min: 0,
                        max: 100,
                        now: focus.progress,
                      }}
                    >
                      <View
                        style={[
                          styles.reviewFocusProgressFill,
                          {
                            width: `${focus.progress}%`,
                            backgroundColor: color.text,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  {isPremium ? (
                    <Pressable
                      onPress={() => askArabicTutor(focus.prompt, focus.title)}
                      style={({ pressed }) => [
                        styles.reviewFocusButton,
                        { borderColor: `${color.text}55` },
                        pressed && { opacity: 0.75 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${focus.actionLabel} with NurAI Arabic Coach`}
                    >
                      <AppIcon name="zap" size={13} color={color.text} />
                      <ThemedText
                        type="caption"
                        style={{ color: color.text, fontWeight: "800" }}
                      >
                        {focus.actionLabel}
                      </ThemedText>
                    </Pressable>
                  ) : (
                    <View
                      style={[
                        styles.reviewFocusButton,
                        {
                          borderColor: theme.borderSubtle,
                          backgroundColor: theme.backgroundSecondary,
                        },
                      ]}
                    >
                      <AppIcon
                        name="check-circle"
                        size={13}
                        color={color.text}
                      />
                      <ThemedText
                        type="caption"
                        style={{ color: color.text, fontWeight: "800" }}
                      >
                        Practice
                      </ThemedText>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(86).duration(320)}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="h4">Fluency Compass</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Train every skill: understand, reply, explain, build, remember
              </ThemedText>
            </View>
          </View>
          <View style={styles.compassGrid}>
            {proficiencyCompass.map((lane) => {
              const color = getColor(lane.colorKey);
              return (
                <View
                  key={lane.id}
                  style={[
                    styles.compassCard,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.compassHeader}>
                    <View
                      style={[
                        styles.compassIcon,
                        { backgroundColor: color.bg },
                      ]}
                    >
                      <AppIcon name={lane.icon} size={16} color={color.text} />
                    </View>
                    <View style={styles.compassCopy}>
                      <ThemedText
                        type="caption"
                        style={[styles.compassLabel, { color: color.text }]}
                      >
                        {lane.label}
                      </ThemedText>
                      <ThemedText type="small">{lane.title}</ThemedText>
                    </View>
                    <ThemedText
                      type="caption"
                      style={{ color: color.text, fontWeight: "800" }}
                    >
                      {lane.progress}%
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.compassProgressTrack,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <View
                      style={[
                        styles.compassProgressFill,
                        {
                          width: `${lane.progress}%`,
                          backgroundColor: color.text,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    {lane.evidence}
                  </ThemedText>
                  <Pressable
                    onPress={() => askArabicTutor(lane.prompt, lane.title)}
                    style={({ pressed }) => [
                      styles.compassButton,
                      { borderColor: `${color.text}55` },
                      pressed && { opacity: 0.75 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPremium
                        ? `Coach ${lane.label} with NurAI Arabic Coach`
                        : "Unlock NurAI Arabic Coach"
                    }
                  >
                    <AppIcon
                      name={isPremium ? "zap" : "lock"}
                      size={13}
                      color={color.text}
                    />
                    <ThemedText
                      type="caption"
                      style={{ color: color.text, fontWeight: "800" }}
                    >
                      {isPremium ? "Coach skill" : "Unlock"}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(88).duration(320)}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="h4">Assessment Rubric</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Progress across listening, dialogue, explanation, writing, and
                retention
              </ThemedText>
            </View>
          </View>
          <View
            style={[
              styles.rubricCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            {assessmentRubric.map((metric) => {
              const color = getColor(metric.colorKey);
              const band = getArabicRubricBand(metric.progress);
              return (
                <Pressable
                  key={metric.id}
                  onPress={() => askArabicTutor(metric.prompt, metric.title)}
                  style={({ pressed }) => [
                    styles.rubricRow,
                    pressed && { opacity: 0.78 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isPremium
                      ? `Coach ${metric.label} Arabic skill`
                      : `Unlock ${metric.label} Arabic coaching`
                  }
                >
                  <View
                    style={[styles.rubricIcon, { backgroundColor: color.bg }]}
                  >
                    <AppIcon name={metric.icon} size={15} color={color.text} />
                  </View>
                  <View style={styles.rubricCopy}>
                    <View style={styles.rubricTopLine}>
                      <ThemedText
                        type="caption"
                        style={[styles.rubricLabel, { color: color.text }]}
                      >
                        {metric.label}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: color.text, fontWeight: "800" }}
                      >
                        {band}
                      </ThemedText>
                    </View>
                    <ThemedText type="small">{metric.title}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {metric.evidence}
                    </ThemedText>
                    <View
                      style={[
                        styles.rubricProgressTrack,
                        { backgroundColor: theme.backgroundSecondary },
                      ]}
                      accessibilityRole="progressbar"
                      accessibilityValue={{
                        min: 0,
                        max: 100,
                        now: metric.progress,
                      }}
                    >
                      <View
                        style={[
                          styles.rubricProgressFill,
                          {
                            width: `${metric.progress}%`,
                            backgroundColor: color.text,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <AppIcon
                    name={isPremium ? "chevron-right" : "lock"}
                    size={16}
                    color={color.text}
                  />
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90).duration(320)}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="h4">Mastery Method</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                The loop every lesson follows
              </ThemedText>
            </View>
          </View>
          <View
            style={[
              styles.ladderCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            {MASTERY_LADDER.map((step, index) => (
              <View key={step.title} style={styles.ladderRow}>
                <View
                  style={[
                    styles.ladderIcon,
                    {
                      backgroundColor:
                        index <= completedReviewCount
                          ? theme.primarySubtle
                          : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <AppIcon
                    name={step.icon}
                    size={15}
                    color={
                      index <= completedReviewCount
                        ? theme.primary
                        : theme.textMuted
                    }
                  />
                </View>
                <View style={styles.ladderCopy}>
                  <ThemedText type="small">{step.title}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    {step.subtitle}
                  </ThemedText>
                </View>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, fontWeight: "800" }}
                >
                  {index + 1}
                </ThemedText>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(92).duration(320)}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="h4">Can-Do Mission Board</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Build abilities you can actually use
              </ThemedText>
            </View>
          </View>
          <View style={styles.canDoList}>
            {canDoMissions.map((mission) => {
              const color = getColor(mission.colorKey);
              return (
                <View
                  key={mission.id}
                  style={[
                    styles.canDoCard,
                    {
                      backgroundColor: theme.cardBackground,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <View
                    style={[styles.canDoIcon, { backgroundColor: color.bg }]}
                  >
                    <AppIcon name={mission.icon} size={17} color={color.text} />
                  </View>
                  <View style={styles.canDoCopy}>
                    <View style={styles.canDoTopLine}>
                      <ThemedText
                        type="caption"
                        style={[styles.canDoMode, { color: color.text }]}
                      >
                        {mission.mode}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, fontWeight: "800" }}
                      >
                        {mission.progress}%
                      </ThemedText>
                    </View>
                    <ThemedText type="small">{mission.title}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {mission.target}
                    </ThemedText>
                    <View
                      style={[
                        styles.canDoProgressTrack,
                        { backgroundColor: theme.backgroundSecondary },
                      ]}
                    >
                      <View
                        style={[
                          styles.canDoProgressFill,
                          {
                            width: `${mission.progress}%`,
                            backgroundColor: color.text,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      {mission.evidence}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() =>
                      askArabicTutor(mission.prompt, mission.title)
                    }
                    style={({ pressed }) => [
                      styles.canDoButton,
                      { borderColor: `${color.text}55` },
                      pressed && { opacity: 0.75 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPremium
                        ? `${mission.actionLabel} with NurAI Arabic Coach`
                        : "Unlock NurAI Arabic Coach"
                    }
                  >
                    <AppIcon
                      name={isPremium ? "zap" : "lock"}
                      size={13}
                      color={color.text}
                    />
                    <ThemedText
                      type="caption"
                      style={{ color: color.text, fontWeight: "800" }}
                    >
                      {isPremium ? mission.actionLabel : "Unlock"}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(95).duration(320)}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="h4">Speaking Modes</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Turn every lesson into a dialogue coach
              </ThemedText>
            </View>
          </View>
          <View style={styles.speakingGrid}>
            {speakingModes.map((mode) => (
              <Pressable
                key={mode.title}
                onPress={() => askArabicTutor(mode.prompt, mode.title)}
                style={({ pressed }) => [
                  styles.speakingMode,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.borderSubtle,
                  },
                  pressed && { opacity: 0.78 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${mode.title} with NurAI Arabic Coach`}
              >
                <View
                  style={[
                    styles.speakingIcon,
                    {
                      backgroundColor: isPremium
                        ? theme.primarySubtle
                        : theme.scholarSoft,
                    },
                  ]}
                >
                  <AppIcon
                    name={mode.icon}
                    size={16}
                    color={isPremium ? theme.primary : theme.scholar}
                  />
                </View>
                <View style={styles.speakingCopy}>
                  <ThemedText type="small">{mode.title}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    {mode.subtitle}
                  </ThemedText>
                </View>
                <AppIcon
                  name={isPremium ? "chevron-right" : "lock"}
                  size={16}
                  color={isPremium ? theme.primary : theme.scholar}
                />
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(320)}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="h4">Your Arabic Path</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Build from sound to meaning
              </ThemedText>
            </View>
            <ThemedText
              type="caption"
              style={[styles.pathProgressText, { color: theme.primary }]}
            >
              {overallProgressScore}% overall
            </ThemedText>
          </View>
          {progressLoading ? (
            <View
              style={[
                styles.progressLoadingRow,
                { backgroundColor: theme.surfaceGlass },
              ]}
            >
              <ActivityIndicator size="small" color={theme.primary} />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Loading your Arabic progress
              </ThemedText>
            </View>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.trackRow}>
              {JOURNEY_TRACKS.map((track) => {
                const color = getColor(track.colorKey);
                const progress =
                  track.id === "sounds"
                    ? trackProgress.letters
                    : track.id === "dialogue"
                      ? trackProgress.dialogues
                      : track.id === "quran"
                        ? trackProgress.words
                        : trackProgress.patterns;
                return (
                  <View
                    key={track.id}
                    style={[
                      styles.trackCard,
                      {
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                  >
                    <View
                      style={[styles.trackIcon, { backgroundColor: color.bg }]}
                    >
                      <AppIcon name={track.icon} size={18} color={color.text} />
                    </View>
                    <ThemedText type="small" style={styles.trackTitle}>
                      {track.title}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {track.subtitle}
                    </ThemedText>
                    <View
                      style={[
                        styles.trackBar,
                        { backgroundColor: theme.backgroundSecondary },
                      ]}
                    >
                      <View
                        style={[
                          styles.trackBarFill,
                          {
                            width: `${progress}%`,
                            backgroundColor: color.text,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText
                      type="caption"
                      style={{ color: color.text, fontWeight: "800" }}
                    >
                      {progress}% complete
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(320)}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="h4">Dialogue Lab</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Learn full sentences, not isolated words
              </ThemedText>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dialogueTabs}>
              {DIALOGUES.map((dialogue) => {
                const active = selectedDialogue.id === dialogue.id;
                return (
                  <Pressable
                    key={dialogue.id}
                    onPress={() => setSelectedDialogueId(dialogue.id)}
                    style={[
                      styles.dialogueTab,
                      {
                        backgroundColor: active
                          ? theme.primarySubtle
                          : theme.surfaceGlass,
                        borderColor: active
                          ? theme.primary
                          : theme.borderSubtle,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${dialogue.title} dialogue`}
                    accessibilityState={{ selected: active }}
                  >
                    <ThemedText
                      type="caption"
                      style={{
                        color: active ? theme.primary : theme.textSecondary,
                        fontFamily: "PlusJakartaSans_700Bold",
                      }}
                    >
                      {dialogue.title}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <View
            style={[
              styles.dialogueCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.dialogueHeader}>
              <View>
                <ThemedText type="h3">{selectedDialogue.title}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  {selectedDialogue.goal}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.levelPill,
                  { backgroundColor: theme.scholarSoft },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.scholar,
                    fontFamily: "PlusJakartaSans_700Bold",
                  }}
                >
                  {selectedDialogue.level}
                </ThemedText>
              </View>
            </View>
            <View
              style={[
                styles.conversationRoundCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.scholar + "40",
                },
              ]}
            >
              <View style={styles.conversationRoundHeader}>
                <View
                  style={[
                    styles.conversationRoundIcon,
                    { backgroundColor: theme.scholarSoft },
                  ]}
                >
                  <AppIcon
                    name="message-circle"
                    size={18}
                    color={theme.scholar}
                  />
                </View>
                <View style={styles.conversationRoundCopy}>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "800" }}
                  >
                    Conversation Round
                  </ThemedText>
                  <ThemedText type="small">
                    Practise this as one real exchange
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    Hear every line, answer, type one hidden line, then swap
                    roles.
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.conversationRoundScore,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "800" }}
                  >
                    {conversationRoundProgress}%
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    round
                  </ThemedText>
                </View>
              </View>
              <View style={styles.conversationRoundSteps}>
                {conversationRoundSteps.map((step) => {
                  const color = getColor(step.colorKey);
                  const complete = step.progress >= 70;
                  return (
                    <View
                      key={step.id}
                      style={[
                        styles.conversationRoundStep,
                        {
                          backgroundColor: theme.backgroundSecondary,
                          borderColor: complete
                            ? color.text
                            : theme.borderSubtle,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.conversationRoundStepIcon,
                          { backgroundColor: color.bg },
                        ]}
                      >
                        <AppIcon
                          name={step.icon}
                          size={13}
                          color={color.text}
                        />
                      </View>
                      <View style={styles.conversationRoundStepCopy}>
                        <ThemedText type="caption" style={styles.stepTitle}>
                          {step.title}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{ color: theme.textMuted }}
                        >
                          {step.detail}
                        </ThemedText>
                      </View>
                      <ThemedText
                        type="caption"
                        style={{ color: color.text, fontWeight: "800" }}
                      >
                        {step.progress}%
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
              <View style={styles.conversationRoundMeta}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, flex: 1 }}
                >
                  {selectedConversationRoundCount} rounds saved •{" "}
                  {selectedConversationRoundStrongCount} strong
                </ThemedText>
                {conversationRoundFeedback ? (
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "800" }}
                  >
                    {conversationRoundFeedback}
                  </ThemedText>
                ) : null}
              </View>
              <View style={styles.conversationRoundActions}>
                <Pressable
                  onPress={recordConversationRound}
                  disabled={!canSaveConversationRound}
                  style={[
                    styles.conversationRoundPrimaryButton,
                    {
                      backgroundColor: theme.scholar,
                      opacity: canSaveConversationRound ? 1 : 0.55,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Save this full Arabic conversation round"
                  accessibilityState={{ disabled: !canSaveConversationRound }}
                >
                  <AppIcon
                    name="check-circle"
                    size={14}
                    color={theme.accentForeground}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.accentForeground,
                      fontWeight: "800",
                    }}
                  >
                    {canSaveConversationRound
                      ? "Save full round"
                      : "Finish steps first"}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={askConversationRoundCoach}
                  style={[
                    styles.conversationRoundSecondaryButton,
                    { borderColor: theme.primaryBorder },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isPremium
                      ? "Coach this full Arabic conversation round"
                      : "Unlock full conversation round coaching"
                  }
                >
                  <AppIcon
                    name={isPremium ? "message-square" : "lock"}
                    size={14}
                    color={theme.primary}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    {isPremium ? "Coach full round" : "Unlock coach"}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
            <View
              style={[
                styles.dialogueTrainerCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.primaryBorder,
                },
              ]}
            >
              <View style={styles.dialogueTrainerTop}>
                <View>
                  <ThemedText
                    type="caption"
                    style={[
                      styles.dialogueTrainerEyebrow,
                      { color: theme.primary },
                    ]}
                  >
                    Dialogue Turn Trainer
                  </ThemedText>
                  <ThemedText type="small">
                    Turn {dialogueTurnIndex + 1} of{" "}
                    {selectedDialogue.lines.length}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.speakerBadge,
                    { backgroundColor: theme.primarySubtle },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    Speaker {currentDialogueTurn.speaker}
                  </ThemedText>
                </View>
              </View>
              <View
                style={[
                  styles.turnPromptCard,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText
                  style={[
                    styles.turnArabic,
                    { color: theme.text, textAlign: "right" },
                  ]}
                >
                  {currentDialogueTurn.arabic}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, fontWeight: "700" }}
                >
                  {currentDialogueTurn.transliteration}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  {currentDialogueTurn.meaning}
                </ThemedText>
                <View style={styles.listenRow}>
                  {renderArabicListenButton(
                    currentDialogueTurn.arabic,
                    `turn:${selectedDialogue.id}:${currentDialogueTurnIndex}`,
                    "Listen turn",
                  )}
                </View>
              </View>
              <View
                style={[
                  styles.dictationStudioCard,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.scholar + "40",
                  },
                ]}
              >
                <View style={styles.dictationHeader}>
                  <View style={styles.dictationTitleWrap}>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.scholar, fontWeight: "800" }}
                    >
                      Dictation Studio
                    </ThemedText>
                    <ThemedText type="small">
                      Listen, then type what you heard
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      Tap play, look away if you want the harder test, then save
                      your answer.
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.dictationScoreBadge,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{ color: theme.primary, fontWeight: "800" }}
                    >
                      {dictationDraft.trim()
                        ? `${dictationMatchScore}%`
                        : "Ready"}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.listenRow}>
                  {renderArabicListenButton(
                    currentDialogueTurn.arabic,
                    `dictation-listen:${selectedDialogue.id}:${currentDialogueTurnIndex}`,
                    "Play hidden line",
                  )}
                </View>
                <TextInput
                  value={dictationDraft}
                  onChangeText={updateDictationDraft}
                  placeholder="Type the Arabic or transliteration you heard"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  autoCorrect={false}
                  style={[
                    styles.dictationInput,
                    {
                      color: theme.text,
                      borderColor: theme.scholar + "40",
                      backgroundColor: theme.backgroundSecondary,
                    },
                  ]}
                  accessibilityLabel="Type the Arabic line you heard"
                />
                <View style={styles.dictationMetaRow}>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, flex: 1 }}
                  >
                    {dictationAttemptCount} saved • {dictationStrongCount}{" "}
                    strong
                  </ThemedText>
                  {dictationFeedback ? (
                    <ThemedText
                      type="caption"
                      style={{ color: theme.scholar, fontWeight: "800" }}
                    >
                      {dictationFeedback}
                    </ThemedText>
                  ) : null}
                </View>
                <View style={styles.dictationActions}>
                  <Pressable
                    onPress={recordDictationAttempt}
                    style={[
                      styles.dictationPrimaryButton,
                      { backgroundColor: theme.primary },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Save this Arabic dictation attempt"
                  >
                    <AppIcon
                      name="check"
                      size={14}
                      color={theme.primaryForeground}
                    />
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.primaryForeground,
                        fontWeight: "800",
                      }}
                    >
                      Save dictation
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowDictationAnswer((value) => !value)}
                    style={[
                      styles.dictationSecondaryButton,
                      { borderColor: theme.scholar + "55" },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showDictationAnswer
                        ? "Hide the dictation line"
                        : "Show the dictation line"
                    }
                  >
                    <AppIcon
                      name={showDictationAnswer ? "eye-off" : "eye"}
                      size={14}
                      color={theme.scholar}
                    />
                    <ThemedText
                      type="caption"
                      style={{ color: theme.scholar, fontWeight: "800" }}
                    >
                      {showDictationAnswer ? "Hide line" : "Check line"}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={askDictationCoach}
                    style={[
                      styles.dictationSecondaryButton,
                      { borderColor: theme.primaryBorder },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPremium
                        ? "Ask NurAI to coach this dictation attempt"
                        : "Unlock dictation coaching"
                    }
                  >
                    <AppIcon
                      name={isPremium ? "message-square" : "lock"}
                      size={14}
                      color={theme.primary}
                    />
                    <ThemedText
                      type="caption"
                      style={{ color: theme.primary, fontWeight: "800" }}
                    >
                      {isPremium ? "Coach dictation" : "Unlock coach"}
                    </ThemedText>
                  </Pressable>
                </View>
                {showDictationAnswer ? (
                  <View
                    style={[
                      styles.dictationAnswerCard,
                      {
                        backgroundColor: theme.scholarSoft,
                        borderColor: theme.scholar + "44",
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.dictationAnswerArabic,
                        { color: theme.scholar },
                      ]}
                    >
                      {currentDialogueTurn.arabic}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary, fontWeight: "700" }}
                    >
                      {currentDialogueTurn.transliteration}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {currentDialogueTurn.meaning}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <View
                style={[
                  styles.replyAttemptPanel,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                <View style={styles.replyAttemptHeader}>
                  <View style={styles.replyAttemptTitleWrap}>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.scholar, fontWeight: "800" }}
                    >
                      Try your reply before checking
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      Arabic or transliteration both count. Save the attempt so
                      your coach can see real progress.
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.replyScoreBadge,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{ color: theme.primary, fontWeight: "800" }}
                    >
                      {dialogueReplyDraft.trim()
                        ? `${dialogueReplyMatchScore}%`
                        : "Ready"}
                    </ThemedText>
                  </View>
                </View>
                <TextInput
                  value={dialogueReplyDraft}
                  onChangeText={(text) => {
                    setDialogueReplyDraft(text);
                    if (dialogueAttemptFeedback) setDialogueAttemptFeedback("");
                  }}
                  placeholder="Type your answer here"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  autoCorrect={false}
                  style={[
                    styles.replyAttemptInput,
                    {
                      color: theme.text,
                      borderColor: theme.primaryBorder,
                      backgroundColor: theme.backgroundSecondary,
                    },
                  ]}
                  accessibilityLabel="Type your Arabic dialogue reply"
                />
                <View style={styles.replyAttemptMetaRow}>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, flex: 1 }}
                  >
                    {dialogueReplyAttemptCount} saved attempts •{" "}
                    {dialogueReplyCorrectCount} strong matches
                  </ThemedText>
                  {dialogueAttemptFeedback ? (
                    <ThemedText
                      type="caption"
                      style={{ color: theme.scholar, fontWeight: "800" }}
                    >
                      {dialogueAttemptFeedback}
                    </ThemedText>
                  ) : null}
                </View>
                <View style={styles.replyAttemptActions}>
                  <Pressable
                    onPress={recordDialogueReplyAttempt}
                    style={[
                      styles.saveReplyAttemptButton,
                      { backgroundColor: theme.primary },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Save this Arabic reply attempt"
                  >
                    <AppIcon
                      name="check"
                      size={14}
                      color={theme.primaryForeground}
                    />
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.primaryForeground,
                        fontWeight: "800",
                      }}
                    >
                      Save attempt
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={askCurrentDialogueTurnCoach}
                    style={[
                      styles.coachReplyAttemptButton,
                      { borderColor: theme.scholar + "55" },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPremium
                        ? "Ask NurAI to coach this reply attempt"
                        : "Unlock reply coaching"
                    }
                  >
                    <AppIcon
                      name={isPremium ? "message-square" : "lock"}
                      size={14}
                      color={theme.scholar}
                    />
                    <ThemedText
                      type="caption"
                      style={{ color: theme.scholar, fontWeight: "800" }}
                    >
                      {isPremium ? "Coach attempt" : "Unlock coach"}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
              {showDialogueReply ? (
                <View
                  style={[
                    styles.replyCard,
                    { backgroundColor: theme.primarySubtle },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    Expected reply
                  </ThemedText>
                  <ThemedText
                    style={[styles.replyArabic, { color: theme.primary }]}
                  >
                    {replyDialogueTurn.arabic}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primaryText, fontWeight: "700" }}
                  >
                    {replyDialogueTurn.transliteration}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    {replyDialogueTurn.meaning}
                  </ThemedText>
                  <View style={styles.listenRow}>
                    {renderArabicListenButton(
                      replyDialogueTurn.arabic,
                      `reply:${selectedDialogue.id}:${replyDialogueTurnIndex}`,
                      "Listen reply",
                    )}
                  </View>
                </View>
              ) : null}
              <View style={styles.turnActions}>
                <Pressable
                  onPress={() => setShowDialogueReply((value) => !value)}
                  style={[
                    styles.turnActionButton,
                    { borderColor: theme.primaryBorder },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showDialogueReply
                      ? "Hide expected dialogue reply"
                      : "Show expected dialogue reply"
                  }
                >
                  <AppIcon
                    name={showDialogueReply ? "eye-off" : "eye"}
                    size={14}
                    color={theme.primary}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    {showDialogueReply ? "Hide reply" : "Check reply"}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={goToNextDialogueTurn}
                  style={[
                    styles.turnActionButton,
                    { borderColor: theme.borderSubtle },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Move to next dialogue turn"
                >
                  <AppIcon
                    name="skip-forward"
                    size={14}
                    color={theme.textSecondary}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, fontWeight: "800" }}
                  >
                    Next turn
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={askCurrentDialogueTurnCoach}
                  style={[
                    styles.turnActionButton,
                    { borderColor: theme.scholar + "55" },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isPremium
                      ? "Ask NurAI to coach this dialogue turn"
                      : "Unlock dialogue turn coaching"
                  }
                >
                  <AppIcon
                    name={isPremium ? "message-square" : "lock"}
                    size={14}
                    color={theme.scholar}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "800" }}
                  >
                    {isPremium ? "Coach turn" : "Unlock coach"}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
            {selectedDialogue.lines.map((line, index) => {
              const isA = line.speaker === "A";
              return (
                <View
                  key={`${line.arabic}-${index}`}
                  style={[
                    styles.dialogueLine,
                    {
                      alignSelf: isA ? "flex-start" : "flex-end",
                      backgroundColor: isA
                        ? theme.surfaceElevated
                        : theme.primarySubtle,
                      borderColor: isA ? theme.border : theme.primaryBorder,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.dialogueArabic,
                      { color: isA ? theme.text : theme.primary },
                    ]}
                  >
                    {line.arabic}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{
                      color: isA ? theme.textSecondary : theme.primaryText,
                      fontFamily: "PlusJakartaSans_700Bold",
                    }}
                  >
                    {line.transliteration}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    {line.meaning}
                  </ThemedText>
                  <View style={styles.listenRow}>
                    {renderArabicListenButton(
                      line.arabic,
                      `dialogue:${selectedDialogue.id}:${index}`,
                      "Listen",
                    )}
                  </View>
                </View>
              );
            })}
            <View style={styles.dialogueActions}>
              <View style={styles.shadowSteps}>
                {["Listen", "Repeat", "Swap roles"].map((step, index) => (
                  <View key={step} style={styles.shadowStep}>
                    <View
                      style={[
                        styles.stepDot,
                        { backgroundColor: theme.primary },
                      ]}
                    >
                      <ThemedText style={styles.stepNumber}>
                        {index + 1}
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      {step}
                    </ThemedText>
                  </View>
                ))}
              </View>
              <Pressable
                onPress={recordDialoguePractice}
                style={[
                  styles.outlineButton,
                  { borderColor: theme.scholar + "55" },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Mark ${selectedDialogue.title} dialogue practice complete`}
              >
                <AppIcon name="check-circle" size={15} color={theme.scholar} />
                <ThemedText type="caption" style={{ color: theme.scholar }}>
                  Mark shadow practice
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  {learningProgress.dialoguePracticeCounts[
                    selectedDialogue.id
                  ] ?? 0}
                  x
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() =>
                  askArabicTutor(
                    `Start an interactive "${selectedDialogue.title}" Arabic role-play. Give me speaker B's first line, the expected learner reply, a gentle correction tip, and short follow-up prompts I can tap for the next turn.`,
                    "Dialogue Role-play",
                  )
                }
                style={[
                  styles.outlineButton,
                  { borderColor: theme.primaryBorder },
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  isPremium
                    ? "Role-play this dialogue with NurAI"
                    : "Unlock dialogue role-play with NurAI"
                }
              >
                <AppIcon
                  name={isPremium ? "mic" : "lock"}
                  size={15}
                  color={theme.primary}
                />
                <ThemedText type="caption" style={{ color: theme.primary }}>
                  {isPremium ? "Role-play with NurAI" : "Unlock role-play"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(320)}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="h4">Sentence Builder</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Reusable patterns for real situations
              </ThemedText>
            </View>
          </View>
          <View style={styles.patternGrid}>
            {PATTERNS.map((pattern) => {
              const draft = sentenceDrafts[pattern.pattern] || "";
              const matchScore = getSentencePatternMatchScore(draft, pattern);
              const attemptCount =
                learningProgress.sentenceBuilderAttemptCounts[
                  pattern.pattern
                ] ?? 0;
              const strongCount =
                learningProgress.sentenceBuilderStrongCounts[pattern.pattern] ??
                0;
              const feedback = sentenceFeedbackByPattern[pattern.pattern];

              return (
                <View
                  key={pattern.pattern}
                  style={[
                    styles.patternCard,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.patternHeader}>
                    <View style={styles.patternTitleWrap}>
                      <ThemedText
                        style={[styles.patternArabic, { color: theme.text }]}
                      >
                        {pattern.pattern}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary }}
                      >
                        {pattern.meaning}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.patternScoreBadge,
                        { backgroundColor: theme.backgroundSecondary },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: theme.primary, fontWeight: "800" }}
                      >
                        {draft.trim() ? `${matchScore}%` : `${attemptCount}x`}
                      </ThemedText>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.patternExample,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <ThemedText style={styles.exampleArabic}>
                      {pattern.exampleArabic}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {pattern.exampleMeaning}
                    </ThemedText>
                    <View style={styles.listenRow}>
                      {renderArabicListenButton(
                        pattern.exampleArabic,
                        `pattern:${pattern.pattern}`,
                        "Listen pattern",
                      )}
                    </View>
                  </View>
                  <View
                    style={[
                      styles.sentenceBuilderBox,
                      {
                        backgroundColor: theme.surfaceElevated,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{ color: theme.scholar, fontWeight: "800" }}
                    >
                      Make it your own
                    </ThemedText>
                    <TextInput
                      value={draft}
                      onChangeText={(value) =>
                        updateSentenceDraft(pattern.pattern, value)
                      }
                      placeholder="Write your own sentence"
                      placeholderTextColor={theme.textMuted}
                      multiline
                      autoCorrect={false}
                      style={[
                        styles.sentenceBuilderInput,
                        {
                          color: theme.text,
                          borderColor: theme.primaryBorder,
                          backgroundColor: theme.backgroundSecondary,
                        },
                      ]}
                      accessibilityLabel={`Write your own sentence for ${pattern.meaning}`}
                    />
                    <View style={styles.sentenceBuilderMeta}>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary, flex: 1 }}
                      >
                        {attemptCount} saved • {strongCount} strong
                      </ThemedText>
                      {feedback ? (
                        <ThemedText
                          type="caption"
                          style={{ color: theme.scholar, fontWeight: "800" }}
                        >
                          {feedback}
                        </ThemedText>
                      ) : null}
                    </View>
                    <View style={styles.sentenceBuilderActions}>
                      <Pressable
                        onPress={() => recordSentenceBuilderAttempt(pattern)}
                        style={[
                          styles.saveSentenceButton,
                          { backgroundColor: theme.primary },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Save sentence for ${pattern.meaning}`}
                      >
                        <AppIcon
                          name="check"
                          size={14}
                          color={theme.primaryForeground}
                        />
                        <ThemedText
                          type="caption"
                          style={{
                            color: theme.primaryForeground,
                            fontWeight: "800",
                          }}
                        >
                          Save sentence
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => askSentenceBuilderCoach(pattern)}
                        style={[
                          styles.coachSentenceButton,
                          { borderColor: theme.scholar + "55" },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={
                          isPremium
                            ? `Ask NurAI to coach ${pattern.meaning}`
                            : "Unlock sentence coaching"
                        }
                      >
                        <AppIcon
                          name={isPremium ? "message-square" : "lock"}
                          size={14}
                          color={theme.scholar}
                        />
                        <ThemedText
                          type="caption"
                          style={{ color: theme.scholar, fontWeight: "800" }}
                        >
                          {isPremium ? "Coach sentence" : "Unlock coach"}
                        </ThemedText>
                      </Pressable>
                      {draft.trim()
                        ? renderArabicListenButton(
                            draft,
                            `draft:${pattern.pattern}`,
                            "Hear mine",
                          )
                        : null}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => recordPatternPractice(pattern.pattern)}
                    style={[
                      styles.practiceMiniButton,
                      { borderColor: theme.primaryBorder },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Practise pattern ${pattern.meaning}`}
                  >
                    <AppIcon
                      name="plus-circle"
                      size={14}
                      color={theme.primary}
                    />
                    <ThemedText
                      type="caption"
                      style={{ color: theme.primary, fontWeight: "800" }}
                    >
                      Pattern reps{" "}
                      {learningProgress.patternPracticeCounts[
                        pattern.pattern
                      ] ?? 0}
                      x
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(320)}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="h4">Meaning Lens</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Understand what the Arabic is doing
              </ThemedText>
            </View>
          </View>
          <View style={styles.lensList}>
            {MEANING_LENSES.map((lens) => (
              <Pressable
                key={lens.title}
                onPress={() => askArabicTutor(lens.prompt, lens.title)}
                style={({ pressed }) => [
                  styles.lensCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                  pressed && { opacity: 0.78 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  isPremium
                    ? `Study ${lens.title} with NurAI`
                    : `Unlock ${lens.title} coaching with NurAI`
                }
              >
                <View
                  style={[
                    styles.lensIcon,
                    { backgroundColor: theme.scholarSoft },
                  ]}
                >
                  <AppIcon name={lens.icon} size={16} color={theme.scholar} />
                </View>
                <View style={styles.lensCopy}>
                  <ThemedText type="small">{lens.title}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    {lens.subtitle}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={[styles.lensExample, { color: theme.scholar }]}
                  >
                    {lens.example}
                  </ThemedText>
                </View>
                <AppIcon
                  name={isPremium ? "message-circle" : "lock"}
                  size={15}
                  color={theme.primary}
                />
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(320)}>
          <View
            style={[
              styles.wordCard,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: theme.scholar + "33",
              },
            ]}
          >
            <View style={styles.wordTop}>
              <View
                style={[
                  styles.wordIcon,
                  { backgroundColor: theme.scholarSoft },
                ]}
              >
                <AppIcon name="sun" size={19} color={theme.scholar} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="h4">Quranic Word Today</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Learn the word, then notice it in recitation
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.wordArabic, { color: theme.scholar }]}>
              {dailyWord.arabic}
            </ThemedText>
            <ThemedText type="h3">{dailyWord.transliteration}</ThemedText>
            <View style={styles.listenRow}>
              {renderArabicListenButton(
                dailyWord.arabic,
                `word:${dailyWord.arabic}`,
                "Listen word",
              )}
            </View>
            <View
              style={[
                styles.wordRecallPanel,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <View style={styles.wordRecallTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "800" }}
                  >
                    Recall before checking
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    Explain the meaning in your own words, then reveal it.
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.wordRecallScore,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    {wordRecallDraft.trim()
                      ? `${dailyWordMeaningMatchScore}%`
                      : `${dailyWordMeaningAttemptCount}x`}
                  </ThemedText>
                </View>
              </View>
              <TextInput
                value={wordRecallDraft}
                onChangeText={updateWordRecallDraft}
                placeholder="What does this word mean?"
                placeholderTextColor={theme.textMuted}
                multiline
                autoCorrect
                style={[
                  styles.wordRecallInput,
                  {
                    color: theme.text,
                    borderColor: theme.primaryBorder,
                    backgroundColor: theme.backgroundSecondary,
                  },
                ]}
                accessibilityLabel={`Explain the meaning of ${dailyWord.transliteration}`}
              />
              <View style={styles.wordRecallMeta}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, flex: 1 }}
                >
                  {dailyWordAudioListenCount} listens •{" "}
                  {dailyWordMeaningAttemptCount} recalls •{" "}
                  {dailyWordMeaningStrongCount} strong
                </ThemedText>
                {wordRecallFeedback ? (
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "800" }}
                  >
                    {wordRecallFeedback}
                  </ThemedText>
                ) : null}
              </View>
              <View style={styles.wordRecallActions}>
                <Pressable
                  onPress={recordWordMeaningAttempt}
                  style={[
                    styles.wordRecallButton,
                    { backgroundColor: theme.primary },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Save recall attempt for ${dailyWord.transliteration}`}
                >
                  <AppIcon
                    name="check"
                    size={14}
                    color={theme.primaryForeground}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.primaryForeground,
                      fontWeight: "800",
                    }}
                  >
                    Save recall
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setShowDailyWordMeaning((value) => !value)}
                  style={[
                    styles.wordRevealButton,
                    { borderColor: theme.scholar + "55" },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showDailyWordMeaning
                      ? "Hide Quranic word meaning"
                      : "Show Quranic word meaning"
                  }
                >
                  <AppIcon
                    name={showDailyWordMeaning ? "eye-off" : "eye"}
                    size={14}
                    color={theme.scholar}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "800" }}
                  >
                    {showDailyWordMeaning ? "Hide meaning" : "Check meaning"}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={askWordMeaningCoach}
                  style={[
                    styles.wordRevealButton,
                    { borderColor: theme.primaryBorder },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isPremium
                      ? "Ask NurAI to coach this Quranic word recall"
                      : "Unlock Quranic word recall coach"
                  }
                >
                  <AppIcon
                    name={isPremium ? "message-square" : "lock"}
                    size={14}
                    color={theme.primary}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    {isPremium ? "Coach recall" : "Unlock coach"}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
            {showDailyWordMeaning ? (
              <View
                style={[
                  styles.wordMeaningPanel,
                  {
                    backgroundColor: theme.scholarSoft,
                    borderColor: theme.scholar + "44",
                  },
                ]}
              >
                <ThemedText type="body" style={{ textAlign: "center" }}>
                  {dailyWord.meaning}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={[styles.wordNote, { color: theme.textMuted }]}
                >
                  {dailyWord.note}
                </ThemedText>
                <View
                  style={[
                    styles.wordSourcePill,
                    { borderColor: theme.scholar + "55" },
                  ]}
                >
                  <AppIcon name="book-open" size={12} color={theme.scholar} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "800" }}
                  >
                    Source anchor: {dailyWord.source}
                  </ThemedText>
                </View>
              </View>
            ) : null}
            <Pressable
              onPress={() => recordWordReview(dailyWord.arabic)}
              style={[
                styles.wordReviewButton,
                { backgroundColor: theme.scholarSoft },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Mark ${dailyWord.transliteration} reviewed`}
            >
              <AppIcon name="check" size={15} color={theme.scholar} />
              <ThemedText
                type="caption"
                style={{ color: theme.scholar, fontWeight: "800" }}
              >
                Reviewed{" "}
                {learningProgress.wordReviewCounts[dailyWord.arabic] ?? 0}x
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(320)}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="h4">Alphabet Studio</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Mark letters you can recognise and pronounce
              </ThemedText>
            </View>
          </View>
          <View style={styles.alphabetGrid}>
            {ALPHABET.map((letter, index) => {
              const selected = selectedLetters.has(index);
              return (
                <Pressable
                  key={`${letter.arabic}-${letter.name}`}
                  onPress={() => toggleLetter(index)}
                  style={[
                    styles.letterCell,
                    {
                      backgroundColor: selected
                        ? theme.primarySubtle
                        : theme.surfaceGlass,
                      borderColor: selected
                        ? theme.primary
                        : theme.borderSubtle,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${letter.name}, ${letter.sound}`}
                  accessibilityState={{ selected }}
                  testID={`arabic-letter-${index}`}
                >
                  <ThemedText
                    style={[
                      styles.arabicLetter,
                      { color: selected ? theme.primary : theme.text },
                    ]}
                  >
                    {letter.arabic}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{
                      color: selected ? theme.primary : theme.textMuted,
                      textAlign: "center",
                    }}
                  >
                    {letter.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(320)}>
          <View
            style={[
              styles.reviewCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.reviewHeader}>
              <View>
                <ThemedText type="h4">Today's Review Loop</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  {completedReviewCount}/{REVIEW_TASKS.length} done today
                </ThemedText>
              </View>
              <AppIcon name="repeat" size={22} color={theme.primary} />
            </View>
            {REVIEW_TASKS.map((task) => {
              const completed =
                todayLearningProgress.completedReviewTaskIds.includes(task.id);
              return (
                <Pressable
                  key={task.id}
                  onPress={() => toggleReviewTask(task.id, task.xp)}
                  style={styles.reviewTask}
                  accessibilityRole="button"
                  accessibilityLabel={`${completed ? "Unmark" : "Complete"} ${task.title}`}
                >
                  <View
                    style={[
                      styles.reviewCheck,
                      {
                        backgroundColor: completed
                          ? theme.primary
                          : theme.backgroundSecondary,
                      },
                    ]}
                  >
                    <AppIcon
                      name={completed ? "check" : task.icon}
                      size={13}
                      color={
                        completed ? theme.primaryForeground : theme.textMuted
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="small">{task.title}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {task.subtitle}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    style={{
                      color: completed ? theme.primary : theme.textMuted,
                    }}
                  >
                    +{task.xp} XP
                  </ThemedText>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => navigation.navigate("ArabicGames")}
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Start Arabic games"
            >
              <AppIcon name="play" size={16} color={theme.primaryForeground} />
              <ThemedText
                type="body"
                style={{ color: theme.primaryForeground, fontWeight: "700" }}
              >
                Start practice games
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      <AIResponseModal
        visible={aiVisible}
        onClose={() => setAiVisible(false)}
        state={aiState}
        data={aiData}
        errorMessage={aiError}
        onRetry={() => askArabicTutor(lastArabicTutorIntent, aiFeatureLabel)}
        onFollowUp={(question) => askArabicTutor(question, aiFeatureLabel)}
        featureLabel={aiFeatureLabel}
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
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  heroCard: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    gap: Spacing.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  heroPillText: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0,
  },
  heroGoldDivider: {
    width: 190,
    marginTop: -Spacing.xs,
    marginBottom: -Spacing.xs,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.78)",
    lineHeight: 24,
  },
  heroStats: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  heroStat: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroStatValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.68)",
  },
  commandCenterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  commandCenterCard: {
    flexGrow: 1,
    flexBasis: "48%",
    minHeight: 128,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  commandCenterIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  commandCenterLabel: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  commandCenterValue: {
    fontSize: 22,
    lineHeight: 28,
  },
  priorityArabicPracticeRail: {
    minHeight: 118,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  priorityArabicPracticeIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityArabicPracticeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  priorityArabicPracticeEyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 0.7,
  },
  priorityArabicPracticeMeta: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  priorityArabicPracticeAction: {
    minWidth: 76,
    minHeight: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  streakCareCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  streakCareHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  streakCareIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  streakCareCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  streakCareEyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 0.7,
  },
  streakCareBadge: {
    maxWidth: 122,
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  streakCareProofRow: {
    minHeight: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: Spacing.sm,
    gap: 4,
  },
  streakCareSteps: {
    gap: Spacing.xs,
  },
  streakCareStep: {
    minHeight: 66,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  streakCareStepIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  streakCareStepCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  streakCareStepTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  streakCareBoundary: {
    minHeight: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  streakCareButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  dailyCoachCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  dailyCoachHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dailyCoachIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyCoachCopy: {
    flex: 1,
    minWidth: 0,
  },
  dailyCoachEyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 0.7,
  },
  dailyCoachScore: {
    width: 78,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
  },
  dailyCoachSteps: {
    gap: Spacing.xs,
  },
  dailySessionContract: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dailySessionContractHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  dailySessionContractIcon: {
    width: 32,
    height: 32,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  dailySessionContractCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  dailySessionContractGrid: {
    gap: Spacing.xs,
  },
  dailySessionContractItem: {
    minHeight: 62,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dailySessionContractItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dailySessionContractItemCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  dailySessionContractItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  dailySessionContractBoundary: {
    minHeight: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  dailyPracticeQueue: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dailyPracticeQueueHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  dailyPracticeQueueIcon: {
    width: 32,
    height: 32,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyPracticeQueueCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  dailyPracticeQueueList: {
    gap: Spacing.xs,
  },
  dailyPracticeQueueItem: {
    minHeight: 68,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dailyPracticeQueueRank: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyPracticeQueueItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyPracticeQueueItemCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  dailyPracticeQueueItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  dailyCoachStep: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dailyCoachStepIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  dailyCoachStepCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  dailyCoachStepTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  dailyCoachStepMetaRow: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  dailyCoachStepPill: {
    minHeight: 22,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    justifyContent: "center",
  },
  dailyCoachProgressTrack: {
    height: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  dailyCoachProgressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  dailyCoachProofReceipt: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dailyCoachProofHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  dailyCoachProofHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  dailyCoachProofGrid: {
    gap: Spacing.xs,
  },
  dailyCoachProofItem: {
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dailyCoachProofIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyCoachProofCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  dailyCoachProofTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  arabicCorrectionLedgerCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  arabicCorrectionLedgerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  arabicCorrectionLedgerIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  arabicCorrectionLedgerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  arabicCorrectionLedgerActive: {
    minHeight: 38,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  arabicCorrectionLedgerList: {
    gap: Spacing.xs,
  },
  arabicCorrectionLedgerItem: {
    minHeight: 78,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  arabicCorrectionLedgerItemIcon: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  arabicCorrectionLedgerItemCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  arabicCorrectionLedgerItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  arabicCorrectionLedgerBoundary: {
    minHeight: 38,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  dailyCoachButton: {
    minHeight: 46,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  quranBridgeCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  quranBridgeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quranBridgeIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quranBridgeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  quranBridgeWordBadge: {
    minWidth: 72,
    maxWidth: 96,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  quranBridgeArabic: {
    fontSize: 24,
    lineHeight: 34,
    textAlign: "center",
    writingDirection: "rtl",
  },
  quranBridgeItemGrid: {
    gap: Spacing.xs,
  },
  quranBridgeItem: {
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quranBridgeItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quranBridgeItemCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  quranBridgeItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  quranBridgeBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  quranBridgeButton: {
    minHeight: 46,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  quranBridgeReaderButton: {
    minHeight: 44,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  weeklyMasteryCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  weeklyMasteryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  weeklyMasteryIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyMasteryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  weeklyMasteryEyebrow: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  weeklyMasteryScore: {
    minWidth: 72,
    minHeight: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  weeklyMasteryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  weeklyMasteryFocusDeck: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(86,179,148, 0.18)",
    backgroundColor: "rgba(86,179,148, 0.055)",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  weeklyMasteryFocusHeader: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  weeklyMasteryFocusGrid: {
    gap: Spacing.sm,
  },
  weeklyMasteryFocusCard: {
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  weeklyMasteryFocusIcon: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyMasteryFocusCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  weeklyMasteryTimeline: {
    gap: Spacing.sm,
  },
  weeklyMasteryDay: {
    minHeight: 122,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  weeklyMasteryDayTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  weeklyMasteryDayIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyMasteryProgressTrack: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  weeklyMasteryProgressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  weeklyMasteryDayFooter: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  weeklySessionHandoffCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  weeklySessionHandoffHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  weeklySessionHandoffIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  weeklySessionHandoffCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  weeklySessionHandoffRows: {
    gap: 7,
  },
  weeklySessionHandoffRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  weeklySessionHandoffFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  weeklySessionHandoffButton: {
    minHeight: 38,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  weeklyEvidenceReceiptDeck: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  weeklyEvidenceReceiptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  weeklyEvidenceReceiptRows: {
    gap: Spacing.sm,
  },
  weeklyEvidenceReceiptRow: {
    minHeight: 112,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  weeklyEvidenceReceiptIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyEvidenceReceiptCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  weeklyEvidenceReceiptTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  weeklyEvidenceReceiptFooter: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  weeklyEvidenceReceiptBoundary: {
    minHeight: 34,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.18)",
    backgroundColor: "rgba(255,212,107,0.05)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  weeklyReviewContractCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  weeklyReviewContractHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  weeklyReviewContractIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyReviewContractCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  weeklyReviewContractSection: {
    gap: Spacing.sm,
  },
  weeklyReviewContractRow: {
    minHeight: 70,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  weeklyReviewContractRowIcon: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyReviewContractRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  weeklyReviewContractRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  arabicProofBoundaryCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  arabicProofBoundaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  arabicProofBoundaryIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  arabicProofBoundaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  arabicProofBoundaryRows: {
    gap: Spacing.sm,
  },
  arabicProofBoundaryRow: {
    minHeight: 42,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  arabicProofBoundaryButton: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  arabicLevelGovernanceCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  arabicLevelGovernanceHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  arabicLevelGovernanceIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  arabicLevelGovernanceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  arabicLevelGovernanceGrid: {
    gap: Spacing.sm,
  },
  arabicLevelGovernanceItem: {
    minHeight: 74,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  arabicLevelGovernanceItemIcon: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  arabicLevelGovernanceItemCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  arabicLevelGovernanceItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  arabicLevelGovernanceButton: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  teacherReviewPacketCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  teacherReviewPacketHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  teacherReviewPacketIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  teacherReviewPacketCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  teacherReviewPacketScore: {
    minWidth: 84,
    minHeight: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  teacherReviewChecklist: {
    gap: Spacing.sm,
  },
  teacherReviewChecklistItem: {
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  teacherReviewChecklistIcon: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  teacherReviewChecklistCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  teacherReviewPacketButton: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  courseMapCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  courseMapHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  courseMapIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  courseMapCopy: {
    flex: 1,
    minWidth: 0,
  },
  courseMapEyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  courseMapButton: {
    minHeight: 42,
    maxWidth: 132,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  courseMapPillars: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  courseMapPillar: {
    flexGrow: 1,
    flexBasis: "48%",
    minHeight: 84,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 6,
  },
  courseMapPillarTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
  courseMapProgressTrack: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    marginTop: "auto",
  },
  courseMapProgressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  portfolioCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  portfolioHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  portfolioSeal: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  portfolioTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  portfolioEyebrow: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  portfolioReadiness: {
    width: 72,
    minHeight: 50,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
  },
  portfolioReadinessTrack: {
    height: 7,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  portfolioReadinessFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  portfolioGrid: {
    gap: Spacing.sm,
  },
  portfolioItem: {
    minHeight: 104,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  portfolioItemIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  portfolioItemCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  portfolioItemTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  portfolioItemLabel: {
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    flex: 1,
  },
  portfolioItemTrack: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    marginTop: Spacing.xs,
  },
  portfolioItemFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  portfolioActionPill: {
    minHeight: 38,
    maxWidth: 108,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  aiCoachCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  coachIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  coachCopy: {
    flex: 1,
    gap: 2,
  },
  coachButton: {
    minHeight: 42,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  coachButtonText: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  pronunciationStudioCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  pronunciationStudioHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  pronunciationStudioIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pronunciationStudioCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  pronunciationStudioEyebrow: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  pronunciationScoreBadge: {
    minWidth: 64,
    minHeight: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  pronunciationLineCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  pronunciationArabic: {
    fontSize: 25,
    lineHeight: 38,
    fontFamily: "NotoNaskhArabic_700Bold",
  },
  pronunciationEvidenceRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  pronunciationEvidenceItem: {
    flex: 1,
    minHeight: 66,
    justifyContent: "center",
    gap: 2,
  },
  pronunciationRatingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pronunciationRatingChip: {
    flexGrow: 1,
    minHeight: 42,
    minWidth: "22%",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  pronunciationActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pronunciationPrimaryButton: {
    flex: 1,
    minHeight: 46,
    minWidth: 156,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  pronunciationSecondaryButton: {
    flex: 1,
    minHeight: 46,
    minWidth: 146,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  dailyWorkoutCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  dailyWorkoutHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  dailyWorkoutIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyWorkoutCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  dailyWorkoutEyebrow: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  dailyWorkoutScore: {
    minWidth: 58,
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  masteryLoopMetaRail: {
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  masteryLoopMetaItem: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  masteryLoopMetaDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dailyWorkoutSteps: {
    gap: Spacing.sm,
  },
  dailyWorkoutStep: {
    minHeight: 92,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  dailyWorkoutStepIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyWorkoutStepCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  stepTitle: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  masteryLoopModeRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  masteryLoopModePill: {
    maxWidth: 112,
    minHeight: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    justifyContent: "center",
  },
  masteryLoopProgressTrack: {
    height: 5,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  masteryLoopProgressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  masteryLoopActionStack: {
    minWidth: 42,
    alignItems: "center",
    gap: Spacing.xs,
  },
  masteryLoopCheck: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyWorkoutButton: {
    minHeight: 48,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  freeGuidePill: {
    borderWidth: 1,
  },
  missionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  missionIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  missionCopy: {
    flex: 1,
    gap: 2,
  },
  missionEyebrow: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  missionButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  reviewQueueCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  retentionProofCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  retentionProofHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  retentionProofIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  retentionProofCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  retentionProofEyebrow: {
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  retentionProofBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    textTransform: "capitalize",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  retentionProofMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  reviewRecoveryCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  reviewRecoveryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  reviewRecoveryIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewRecoveryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  reviewRecoverySteps: {
    gap: Spacing.sm,
  },
  reviewRecoveryStep: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  reviewRecoveryStepIndex: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  reviewRecoveryGuardrail: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  reviewRecoveryButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  reviewFocusRow: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  reviewFocusIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewFocusCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  reviewFocusTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  reviewFocusLabel: {
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  reviewFocusProgressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: Spacing.xs,
  },
  reviewFocusProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  reviewFocusButton: {
    minHeight: 44,
    minWidth: 82,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  passportCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  passportHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  passportSeal: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  passportTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  passportEyebrow: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  passportProgressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  passportProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  passportProofRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  passportProofCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  passportButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  levelRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  levelPillCard: {
    minWidth: "47%",
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 1,
  },
  placementPanel: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  placementPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  placementGrid: {
    gap: Spacing.sm,
  },
  placementSkillCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  placementSkillHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  placementSkillIcon: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  skillLabel: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  ratingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  ratingChip: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  placementActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  savePlacementButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  placementFeedback: {
    lineHeight: 18,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  compassGrid: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  compassCard: {
    minHeight: 138,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  compassHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  compassIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  compassCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  compassLabel: {
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  compassProgressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
  },
  compassProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  compassButton: {
    minHeight: 44,
    alignSelf: "flex-start",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  rubricCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  rubricRow: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  rubricIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rubricCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rubricTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  rubricLabel: {
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  rubricProgressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: Spacing.xs,
  },
  rubricProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  ladderCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  ladderRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  ladderIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  ladderCopy: {
    flex: 1,
    gap: 2,
  },
  canDoList: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  canDoCard: {
    minHeight: 122,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  canDoIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  canDoCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  canDoTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  canDoMode: {
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  canDoProgressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: Spacing.xs,
  },
  canDoProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  canDoButton: {
    minHeight: 44,
    minWidth: 86,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  speakingGrid: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  speakingMode: {
    minHeight: 74,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  speakingIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  speakingCopy: {
    flex: 1,
    gap: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  pathProgressText: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  progressLoadingRow: {
    minHeight: 38,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  trackRow: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingRight: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  trackCard: {
    width: 188,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  trackIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  trackTitle: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  trackBar: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: Spacing.xs,
  },
  trackBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  dialogueTabs: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingRight: Spacing.lg,
  },
  dialogueTab: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dialogueCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  dialogueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  dialogueTrainerCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  conversationRoundCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  conversationRoundHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  conversationRoundIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  conversationRoundCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  conversationRoundScore: {
    minWidth: 58,
    minHeight: 38,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  conversationRoundSteps: {
    gap: Spacing.sm,
  },
  conversationRoundStep: {
    minHeight: 54,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  conversationRoundStepIcon: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  conversationRoundStepCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  conversationRoundMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  conversationRoundActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  conversationRoundPrimaryButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  conversationRoundSecondaryButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  dialogueTrainerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  dialogueTrainerEyebrow: {
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  speakerBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  turnPromptCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  listenRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  listenButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  turnArabic: {
    fontSize: 25,
    lineHeight: 38,
    fontFamily: "NotoNaskhArabic_700Bold",
  },
  replyCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  replyAttemptPanel: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dictationStudioCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dictationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  dictationTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  dictationScoreBadge: {
    minHeight: 32,
    minWidth: 58,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  dictationInput: {
    minHeight: 78,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 17,
    lineHeight: 25,
    fontFamily: "PlusJakartaSans_600SemiBold",
    textAlignVertical: "top",
  },
  dictationMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  dictationActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  dictationPrimaryButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  dictationSecondaryButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  dictationAnswerCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  dictationAnswerArabic: {
    fontSize: 22,
    lineHeight: 34,
    textAlign: "right",
    fontFamily: "NotoNaskhArabic_700Bold",
  },
  replyAttemptHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  replyAttemptTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  replyScoreBadge: {
    minHeight: 32,
    minWidth: 58,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  replyAttemptInput: {
    minHeight: 86,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 17,
    lineHeight: 25,
    fontFamily: "PlusJakartaSans_600SemiBold",
    textAlignVertical: "top",
  },
  replyAttemptMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  replyAttemptActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  saveReplyAttemptButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  coachReplyAttemptButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  replyArabic: {
    fontSize: 22,
    lineHeight: 34,
    textAlign: "right",
    fontFamily: "NotoNaskhArabic_700Bold",
  },
  turnActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  turnActionButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  levelPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dialogueLine: {
    width: "92%",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  dialogueArabic: {
    fontSize: 24,
    lineHeight: 38,
    textAlign: "right",
    fontFamily: "NotoNaskhArabic_700Bold",
  },
  dialogueActions: {
    gap: Spacing.md,
  },
  shadowSteps: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  shadowStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  outlineButton: {
    minHeight: 46,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  patternGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  patternCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  patternHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  patternTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  patternScoreBadge: {
    minHeight: 32,
    minWidth: 52,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  patternArabic: {
    fontSize: 25,
    lineHeight: 36,
    textAlign: "right",
    fontFamily: "NotoNaskhArabic_700Bold",
  },
  patternExample: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  sentenceBuilderBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sentenceBuilderInput: {
    minHeight: 78,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 17,
    lineHeight: 25,
    fontFamily: "PlusJakartaSans_600SemiBold",
    textAlignVertical: "top",
  },
  sentenceBuilderMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sentenceBuilderActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Spacing.sm,
  },
  saveSentenceButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  coachSentenceButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  practiceMiniButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  exampleArabic: {
    fontSize: 20,
    lineHeight: 30,
    textAlign: "right",
    fontFamily: "NotoNaskhArabic_400Regular",
  },
  lensList: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  lensCard: {
    minHeight: 92,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  lensIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  lensCopy: {
    flex: 1,
    gap: 3,
  },
  lensExample: {
    textAlign: "right",
    fontFamily: "NotoNaskhArabic_700Bold",
  },
  wordCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  wordTop: {
    width: "100%",
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  wordIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  wordArabic: {
    fontSize: 58,
    lineHeight: 74,
    fontFamily: "NotoNaskhArabic_700Bold",
  },
  wordNote: {
    textAlign: "center",
    lineHeight: 19,
  },
  wordRecallPanel: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  wordRecallTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  wordRecallScore: {
    minHeight: 32,
    minWidth: 54,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  wordRecallInput: {
    minHeight: 78,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "PlusJakartaSans_600SemiBold",
    textAlignVertical: "top",
  },
  wordRecallMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Spacing.sm,
  },
  wordRecallActions: {
    alignItems: "stretch",
    gap: Spacing.sm,
  },
  wordRecallButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  wordRevealButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  wordMeaningPanel: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  wordSourcePill: {
    alignSelf: "center",
    minHeight: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  wordReviewButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  alphabetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  letterCell: {
    width: "22.5%",
    aspectRatio: 0.86,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    gap: 2,
  },
  arabicLetter: {
    fontSize: 31,
    lineHeight: 42,
    fontFamily: "NotoNaskhArabic_700Bold",
  },
  reviewCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  reviewTask: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: 44,
  },
  reviewCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
});
