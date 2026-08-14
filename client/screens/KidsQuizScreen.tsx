import React, { useState } from "react";
import { View, ScrollView, Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  CategoryColors,
  Fonts,
} from "@/constants/theme";
import { useKidsMode } from "@/context/KidsModeContext";
import {
  AchievementBadgeSvg,
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon } from "@/components/icons";
import { KIDS_DUAS, type KidsDua } from "@/data/kidsDuas";
import { KidsCelebrationModal } from "@/components/kids/KidsCelebrationModal";

type ActiveSection =
  | "menu"
  | "quiz"
  | "letterMatch"
  | "pillarOrder"
  | "bingo"
  | "duaMatch";
type QuizCategory =
  | "All"
  | "Aqeedah"
  | "Pillars"
  | "Names of Allah"
  | "Seerah"
  | "Wudu & Salah"
  | "Surah Facts";

interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  ageGroup: "3-5" | "6-9" | "10-13" | "all";
  category: string;
}

const CATEGORY_COLOR_MAP: Record<string, keyof typeof CategoryColors> = {
  Aqeedah: "emerald",
  Pillars: "blue",
  "Names of Allah": "amber",
  Seerah: "purple",
  "Wudu & Salah": "teal",
  "Surah Facts": "green",
};

const FILTER_CATEGORIES: QuizCategory[] = [
  "All",
  "Aqeedah",
  "Pillars",
  "Names of Allah",
  "Seerah",
  "Wudu & Salah",
  "Surah Facts",
];

const QUIZ_DATA: QuizQuestion[] = [
  {
    id: "aq1",
    question: "Who created everything in the universe?",
    options: ["Angels", "Prophets", "Allah", "Humans"],
    correctIndex: 2,
    ageGroup: "3-5",
    category: "Aqeedah",
  },
  {
    id: "aq2",
    question: "How many pillars of Iman (faith) are there?",
    options: ["4", "5", "6", "7"],
    correctIndex: 2,
    ageGroup: "6-9",
    category: "Aqeedah",
  },
  {
    id: "aq3",
    question: "Which angel brought the Quran to Prophet Muhammad (PBUH)?",
    options: ["Mikail", "Israfil", "Jibreel", "Azrael"],
    correctIndex: 2,
    ageGroup: "6-9",
    category: "Aqeedah",
  },
  {
    id: "aq4",
    question: "What is the last holy book revealed by Allah?",
    options: ["Torah", "Zabur", "Injeel", "Quran"],
    correctIndex: 3,
    ageGroup: "all",
    category: "Aqeedah",
  },
  {
    id: "aq5",
    question: "What happens on the Day of Judgment?",
    options: [
      "Nothing",
      "Everyone sleeps",
      "Everyone is judged for their deeds",
      "The world starts over",
    ],
    correctIndex: 2,
    ageGroup: "6-9",
    category: "Aqeedah",
  },
  {
    id: "aq6",
    question: "What does Qadr mean?",
    options: ["Prayer", "Fasting", "Divine Decree", "Charity"],
    correctIndex: 2,
    ageGroup: "10-13",
    category: "Aqeedah",
  },
  {
    id: "aq7",
    question: "Who is the first prophet in Islam?",
    options: ["Musa (AS)", "Ibrahim (AS)", "Adam (AS)", "Nuh (AS)"],
    correctIndex: 2,
    ageGroup: "3-5",
    category: "Aqeedah",
  },
  {
    id: "aq8",
    question: "What are angels made of?",
    options: ["Fire", "Clay", "Light (Noor)", "Water"],
    correctIndex: 2,
    ageGroup: "6-9",
    category: "Aqeedah",
  },
  {
    id: "aq9",
    question: "How many holy books are mentioned in the Quran?",
    options: ["2", "3", "4", "5"],
    correctIndex: 2,
    ageGroup: "10-13",
    category: "Aqeedah",
  },
  {
    id: "aq10",
    question: "Who is the last and final prophet?",
    options: ["Isa (AS)", "Musa (AS)", "Ibrahim (AS)", "Muhammad (PBUH)"],
    correctIndex: 3,
    ageGroup: "all",
    category: "Aqeedah",
  },
  {
    id: "aq11",
    question: "What is Jannah?",
    options: ["A city", "Paradise", "A mountain", "A river"],
    correctIndex: 1,
    ageGroup: "3-5",
    category: "Aqeedah",
  },
  {
    id: "aq12",
    question: "Belief in the unseen is part of?",
    options: ["Ihsan", "Islam", "Iman", "Charity"],
    correctIndex: 2,
    ageGroup: "10-13",
    category: "Aqeedah",
  },

  {
    id: "pi1",
    question: "What is the first pillar of Islam?",
    options: ["Salah", "Shahada", "Zakat", "Hajj"],
    correctIndex: 1,
    ageGroup: "all",
    category: "Pillars",
  },
  {
    id: "pi2",
    question: "How many times a day do Muslims pray?",
    options: ["3", "4", "5", "7"],
    correctIndex: 2,
    ageGroup: "3-5",
    category: "Pillars",
  },
  {
    id: "pi3",
    question: "What is Zakat?",
    options: ["Fasting", "Pilgrimage", "Giving charity to the poor", "Prayer"],
    correctIndex: 2,
    ageGroup: "6-9",
    category: "Pillars",
  },
  {
    id: "pi4",
    question: "In which month do Muslims fast?",
    options: ["Shaban", "Rajab", "Ramadan", "Muharram"],
    correctIndex: 2,
    ageGroup: "all",
    category: "Pillars",
  },
  {
    id: "pi5",
    question: "Where do Muslims go for Hajj?",
    options: ["Madinah", "Jerusalem", "Makkah", "Cairo"],
    correctIndex: 2,
    ageGroup: "3-5",
    category: "Pillars",
  },
  {
    id: "pi6",
    question: "What does the Shahada declare?",
    options: [
      "Love for parents",
      "There is no god but Allah and Muhammad is His messenger",
      "A promise to fast",
      "Love of nature",
    ],
    correctIndex: 1,
    ageGroup: "6-9",
    category: "Pillars",
  },
  {
    id: "pi7",
    question: "Who must perform Hajj at least once?",
    options: [
      "All children",
      "Only scholars",
      "Every able Muslim who can afford it",
      "Only men",
    ],
    correctIndex: 2,
    ageGroup: "10-13",
    category: "Pillars",
  },
  {
    id: "pi8",
    question: "What do Muslims avoid during fasting?",
    options: ["Talking", "Eating and drinking", "Walking", "Sleeping"],
    correctIndex: 1,
    ageGroup: "3-5",
    category: "Pillars",
  },
  {
    id: "pi9",
    question: "What percentage of wealth is given as Zakat?",
    options: ["1%", "2.5%", "5%", "10%"],
    correctIndex: 1,
    ageGroup: "10-13",
    category: "Pillars",
  },
  {
    id: "pi10",
    question: "The second pillar of Islam is?",
    options: ["Hajj", "Sawm", "Salah", "Zakat"],
    correctIndex: 2,
    ageGroup: "6-9",
    category: "Pillars",
  },
  {
    id: "pi11",
    question: "Sawm means?",
    options: ["Prayer", "Charity", "Fasting", "Pilgrimage"],
    correctIndex: 2,
    ageGroup: "all",
    category: "Pillars",
  },
  {
    id: "pi12",
    question: "Which pillar involves traveling to the Kaaba?",
    options: ["Salah", "Zakat", "Shahada", "Hajj"],
    correctIndex: 3,
    ageGroup: "6-9",
    category: "Pillars",
  },

  {
    id: "na1",
    question: "What does Ar-Rahman mean?",
    options: ["The King", "The Most Merciful", "The Creator", "The Peace"],
    correctIndex: 1,
    ageGroup: "all",
    category: "Names of Allah",
  },
  {
    id: "na2",
    question: "What does Ar-Raheem mean?",
    options: [
      "The Judge",
      "The Especially Merciful",
      "The Provider",
      "The Healer",
    ],
    correctIndex: 1,
    ageGroup: "6-9",
    category: "Names of Allah",
  },
  {
    id: "na3",
    question: "Al-Malik means?",
    options: ["The Guardian", "The Creator", "The King", "The Strong"],
    correctIndex: 2,
    ageGroup: "6-9",
    category: "Names of Allah",
  },
  {
    id: "na4",
    question: "As-Salam means?",
    options: ["The Peace", "The Light", "The Guide", "The Wise"],
    correctIndex: 0,
    ageGroup: "all",
    category: "Names of Allah",
  },
  {
    id: "na5",
    question: "Al-Khaliq means?",
    options: ["The Provider", "The Forgiver", "The Creator", "The Protector"],
    correctIndex: 2,
    ageGroup: "6-9",
    category: "Names of Allah",
  },
  {
    id: "na6",
    question: "How many names of Allah are commonly known?",
    options: ["50", "77", "99", "100"],
    correctIndex: 2,
    ageGroup: "3-5",
    category: "Names of Allah",
  },
  {
    id: "na7",
    question: "Al-Aleem means?",
    options: [
      "The All-Knowing",
      "The All-Seeing",
      "The All-Hearing",
      "The Powerful",
    ],
    correctIndex: 0,
    ageGroup: "10-13",
    category: "Names of Allah",
  },
  {
    id: "na8",
    question: "Ar-Razzaq means?",
    options: ["The Healer", "The Provider", "The Judge", "The Opener"],
    correctIndex: 1,
    ageGroup: "6-9",
    category: "Names of Allah",
  },
  {
    id: "na9",
    question: "Al-Ghaffar means?",
    options: ["The Patient", "The Forgiver", "The Thankful", "The Witness"],
    correctIndex: 1,
    ageGroup: "10-13",
    category: "Names of Allah",
  },
  {
    id: "na10",
    question: "Al-Wadud means?",
    options: ["The Loving", "The Just", "The Wise", "The Kind"],
    correctIndex: 0,
    ageGroup: "all",
    category: "Names of Allah",
  },

  {
    id: "se1",
    question: "In which city was Prophet Muhammad (PBUH) born?",
    options: ["Madinah", "Makkah", "Taif", "Jerusalem"],
    correctIndex: 1,
    ageGroup: "all",
    category: "Seerah",
  },
  {
    id: "se2",
    question: "What was the name of the cave where the first revelation came?",
    options: ["Cave Thawr", "Cave Hira", "Cave Uhud", "Cave Badr"],
    correctIndex: 1,
    ageGroup: "6-9",
    category: "Seerah",
  },
  {
    id: "se3",
    question: "Who was the first wife of Prophet Muhammad (PBUH)?",
    options: ["Aisha (RA)", "Hafsa (RA)", "Khadijah (RA)", "Fatimah (RA)"],
    correctIndex: 2,
    ageGroup: "6-9",
    category: "Seerah",
  },
  {
    id: "se4",
    question: "What is the Hijrah?",
    options: [
      "A battle",
      "Migration from Makkah to Madinah",
      "A prayer",
      "A fast",
    ],
    correctIndex: 1,
    ageGroup: "10-13",
    category: "Seerah",
  },
  {
    id: "se5",
    question: "Who was the first man to accept Islam?",
    options: ["Umar (RA)", "Abu Bakr (RA)", "Ali (RA)", "Uthman (RA)"],
    correctIndex: 1,
    ageGroup: "6-9",
    category: "Seerah",
  },
  {
    id: "se6",
    question: "What was the first battle in Islam?",
    options: ["Uhud", "Khandaq", "Badr", "Hunayn"],
    correctIndex: 2,
    ageGroup: "10-13",
    category: "Seerah",
  },
  {
    id: "se7",
    question: "Who was the Prophet's uncle who protected him?",
    options: ["Abu Lahab", "Abu Talib", "Abbas", "Hamza"],
    correctIndex: 1,
    ageGroup: "10-13",
    category: "Seerah",
  },
  {
    id: "se8",
    question: "What was Prophet Muhammad (PBUH) known as before prophethood?",
    options: [
      "The Brave",
      "The Truthful and Trustworthy",
      "The Scholar",
      "The Warrior",
    ],
    correctIndex: 1,
    ageGroup: "6-9",
    category: "Seerah",
  },
  {
    id: "se9",
    question: "How old was the Prophet when he received the first revelation?",
    options: ["25", "30", "35", "40"],
    correctIndex: 3,
    ageGroup: "10-13",
    category: "Seerah",
  },
  {
    id: "se10",
    question: "Who was the Prophet's best friend and first Caliph?",
    options: ["Umar (RA)", "Uthman (RA)", "Ali (RA)", "Abu Bakr (RA)"],
    correctIndex: 3,
    ageGroup: "6-9",
    category: "Seerah",
  },
  {
    id: "se11",
    question: "What year did the Prophet (PBUH) pass away?",
    options: ["620 CE", "625 CE", "630 CE", "632 CE"],
    correctIndex: 3,
    ageGroup: "10-13",
    category: "Seerah",
  },
  {
    id: "se12",
    question: "What was the Prophet's grandfather's name?",
    options: ["Abu Talib", "Abdul Muttalib", "Abdullah", "Hashim"],
    correctIndex: 1,
    ageGroup: "10-13",
    category: "Seerah",
  },

  {
    id: "ws1",
    question: "What is the first step of Wudu?",
    options: [
      "Wash face",
      "Say Bismillah and wash hands",
      "Wipe head",
      "Wash feet",
    ],
    correctIndex: 1,
    ageGroup: "all",
    category: "Wudu & Salah",
  },
  {
    id: "ws2",
    question: "How many rakah is Fajr prayer?",
    options: ["2", "3", "4", "1"],
    correctIndex: 0,
    ageGroup: "3-5",
    category: "Wudu & Salah",
  },
  {
    id: "ws3",
    question: "How many rakah is Dhuhr prayer?",
    options: ["2", "3", "4", "5"],
    correctIndex: 2,
    ageGroup: "6-9",
    category: "Wudu & Salah",
  },
  {
    id: "ws4",
    question: "What breaks Wudu?",
    options: ["Drinking water", "Using the bathroom", "Talking", "Walking"],
    correctIndex: 1,
    ageGroup: "all",
    category: "Wudu & Salah",
  },
  {
    id: "ws5",
    question: "Which prayer is performed at sunset?",
    options: ["Fajr", "Asr", "Maghrib", "Isha"],
    correctIndex: 2,
    ageGroup: "3-5",
    category: "Wudu & Salah",
  },
  {
    id: "ws6",
    question: "How many rakah is Asr prayer?",
    options: ["2", "3", "4", "5"],
    correctIndex: 2,
    ageGroup: "6-9",
    category: "Wudu & Salah",
  },
  {
    id: "ws7",
    question: "What do you say when starting prayer?",
    options: ["Ameen", "SubhanAllah", "Allahu Akbar", "Alhamdulillah"],
    correctIndex: 2,
    ageGroup: "all",
    category: "Wudu & Salah",
  },
  {
    id: "ws8",
    question: "How many rakah is Maghrib prayer?",
    options: ["2", "3", "4", "5"],
    correctIndex: 1,
    ageGroup: "6-9",
    category: "Wudu & Salah",
  },
  {
    id: "ws9",
    question: "After washing hands in Wudu, what comes next?",
    options: ["Wash feet", "Rinse mouth", "Wipe head", "Wash ears"],
    correctIndex: 1,
    ageGroup: "6-9",
    category: "Wudu & Salah",
  },
  {
    id: "ws10",
    question: "How many rakah is Isha prayer?",
    options: ["2", "3", "4", "5"],
    correctIndex: 2,
    ageGroup: "6-9",
    category: "Wudu & Salah",
  },
  {
    id: "ws11",
    question: "What direction do Muslims face during Salah?",
    options: ["East", "West", "Towards Qibla (Kaaba)", "North"],
    correctIndex: 2,
    ageGroup: "3-5",
    category: "Wudu & Salah",
  },
  {
    id: "ws12",
    question: "What do you say in Ruku (bowing)?",
    options: [
      "Allahu Akbar",
      "SubhanAllah",
      "Subhana Rabbiyal Adheem",
      "Ameen",
    ],
    correctIndex: 2,
    ageGroup: "10-13",
    category: "Wudu & Salah",
  },
  {
    id: "ws13",
    question: "Does sleeping break Wudu?",
    options: [
      "Yes, deep sleep does",
      "No, never",
      "Only on Fridays",
      "Only at night",
    ],
    correctIndex: 0,
    ageGroup: "10-13",
    category: "Wudu & Salah",
  },
  {
    id: "ws14",
    question: "What do we say at the end of Salah?",
    options: [
      "Allahu Akbar",
      "Assalamu Alaikum wa Rahmatullah",
      "SubhanAllah",
      "Bismillah",
    ],
    correctIndex: 1,
    ageGroup: "all",
    category: "Wudu & Salah",
  },
  // "Surah Facts" is generated straight from KIDS_SURAHS (name/meaning/verse
  // count already reviewed for the Memorization screen) rather than new
  // religious content, so every fact here traces back to that one source.
  {
    id: "sf1",
    question: 'Which surah\'s name means "The Opening"?',
    options: ["Al-Fatiha", "Al-Ikhlas", "An-Nas", "Al-Kawthar"],
    correctIndex: 0,
    ageGroup: "3-5",
    category: "Surah Facts",
  },
  {
    id: "sf2",
    question: 'Which surah\'s name means "The Purity"?',
    options: ["Al-Ikhlas", "Al-Falaq", "Al-Asr", "Al-Fil"],
    correctIndex: 0,
    ageGroup: "3-5",
    category: "Surah Facts",
  },
  {
    id: "sf3",
    question: 'Which surah\'s name means "Mankind"?',
    options: ["An-Nas", "Al-Falaq", "Al-Masad", "An-Nasr"],
    correctIndex: 0,
    ageGroup: "3-5",
    category: "Surah Facts",
  },
  {
    id: "sf4",
    question: 'Which surah\'s name means "The Dawn"?',
    options: ["Al-Falaq", "An-Nas", "Al-Kawthar", "Al-Kafiroon"],
    correctIndex: 0,
    ageGroup: "6-9",
    category: "Surah Facts",
  },
  {
    id: "sf5",
    question: "How many verses (ayahs) are in Surah Al-Fatiha?",
    options: ["4", "7", "3", "6"],
    correctIndex: 1,
    ageGroup: "6-9",
    category: "Surah Facts",
  },
  {
    id: "sf6",
    question: "How many verses are in Surah Al-Ikhlas?",
    options: ["3", "4", "5", "7"],
    correctIndex: 1,
    ageGroup: "6-9",
    category: "Surah Facts",
  },
  {
    id: "sf7",
    question: 'Which surah\'s name means "The Elephant"?',
    options: ["Al-Fil", "Al-Masad", "An-Nasr", "Al-Kafiroon"],
    correctIndex: 0,
    ageGroup: "6-9",
    category: "Surah Facts",
  },
  {
    id: "sf8",
    question: 'Which surah\'s name means "The Time"?',
    options: ["Al-Asr", "Al-Kawthar", "An-Nasr", "Al-Fil"],
    correctIndex: 0,
    ageGroup: "10-13",
    category: "Surah Facts",
  },
  {
    id: "sf9",
    question: 'Which surah\'s name means "The Abundance"?',
    options: ["Al-Kawthar", "Al-Asr", "An-Nasr", "Al-Masad"],
    correctIndex: 0,
    ageGroup: "10-13",
    category: "Surah Facts",
  },
  {
    id: "sf10",
    question: 'Which surah\'s name means "The Victory"?',
    options: ["An-Nasr", "Al-Masad", "Al-Kafiroon", "Al-Fil"],
    correctIndex: 0,
    ageGroup: "10-13",
    category: "Surah Facts",
  },
  {
    id: "sf11",
    question: 'Which surah\'s name means "The Palm Fiber"?',
    options: ["Al-Masad", "An-Nasr", "Al-Kafiroon", "Al-Asr"],
    correctIndex: 0,
    ageGroup: "10-13",
    category: "Surah Facts",
  },
  {
    id: "sf12",
    question: 'Which surah\'s name means "The Disbelievers"?',
    options: ["Al-Kafiroon", "Al-Masad", "Al-Fil", "An-Nas"],
    correctIndex: 0,
    ageGroup: "10-13",
    category: "Surah Facts",
  },
];

const ARABIC_LETTERS = [
  { arabic: "\u0627", name: "Alif", transliteration: "a" },
  { arabic: "\u0628", name: "Ba", transliteration: "b" },
  { arabic: "\u062A", name: "Ta", transliteration: "t" },
  { arabic: "\u062B", name: "Tha", transliteration: "th" },
  { arabic: "\u062C", name: "Jeem", transliteration: "j" },
  { arabic: "\u062D", name: "Ha", transliteration: "h" },
  { arabic: "\u062E", name: "Kha", transliteration: "kh" },
  { arabic: "\u062F", name: "Dal", transliteration: "d" },
  { arabic: "\u0631", name: "Ra", transliteration: "r" },
  { arabic: "\u0633", name: "Seen", transliteration: "s" },
];

const PILLARS_CORRECT = ["Shahada", "Salah", "Zakat", "Sawm", "Hajj"];

const BINGO_DEEDS = [
  "Help Parents",
  "Read Quran",
  "Pray on Time",
  "Give Charity",
  "Smile",
  "Say Salam",
  "Dhikr",
  "Clean Room",
  "Share Food",
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateLetterMatchRounds() {
  const rounds: {
    arabic: string;
    name: string;
    correct: string;
    options: string[];
  }[] = [];
  const shuffled = shuffleArray(ARABIC_LETTERS).slice(0, 10);
  const allTransliterations = ARABIC_LETTERS.map((l) => l.transliteration);
  for (const letter of shuffled) {
    const wrong = shuffleArray(
      allTransliterations.filter((t) => t !== letter.transliteration),
    ).slice(0, 3);
    const options = shuffleArray([letter.transliteration, ...wrong]);
    rounds.push({
      arabic: letter.arabic,
      name: letter.name,
      correct: letter.transliteration,
      options,
    });
  }
  return rounds;
}

function generateDuaMatchRounds() {
  const rounds: {
    arabic: string;
    occasion: string;
    correct: string;
    options: string[];
  }[] = [];
  const shuffled = shuffleArray(KIDS_DUAS).slice(0, 8);
  const allTransliterations = KIDS_DUAS.map((d: KidsDua) => d.transliteration);
  for (const dua of shuffled) {
    const wrong = shuffleArray(
      allTransliterations.filter((t) => t !== dua.transliteration),
    ).slice(0, 3);
    const options = shuffleArray([dua.transliteration, ...wrong]);
    rounds.push({
      arabic: dua.arabic,
      occasion: dua.occasion,
      correct: dua.transliteration,
      options,
    });
  }
  return rounds;
}

function checkBingo(marked: boolean[]): boolean {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  return lines.some((line) => line.every((i) => marked[i]));
}

export default function KidsQuizScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {
    recordActivity,
    recordGamePlayed,
    saveQuizScore,
    awardBadge,
    quizScores,
    badges,
    settings,
  } = useKidsMode();

  const [celebration, setCelebration] = useState<{
    title: string;
    subtitle: string;
    points: number;
  } | null>(null);

  const showCelebration = (title: string, subtitle: string, points: number) => {
    setCelebration({ title, subtitle, points });
  };

  const [activeSection, setActiveSection] = useState<ActiveSection>("menu");
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory>("All");

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  const [letterRounds, setLetterRounds] = useState<
    ReturnType<typeof generateLetterMatchRounds>
  >([]);
  const [letterRound, setLetterRound] = useState(0);
  const [letterScore, setLetterScore] = useState(0);
  const [letterSelected, setLetterSelected] = useState<string | null>(null);
  const [letterFinished, setLetterFinished] = useState(false);

  const [pillarOrder, setPillarOrder] = useState<string[]>([]);
  const [pillarSelections, setPillarSelections] = useState<string[]>([]);
  const [pillarResults, setPillarResults] = useState<(boolean | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [pillarFinished, setPillarFinished] = useState(false);

  const [bingoMarked, setBingoMarked] = useState<boolean[]>(
    new Array(9).fill(false),
  );
  const [bingoWon, setBingoWon] = useState(false);

  const [duaRounds, setDuaRounds] = useState<
    ReturnType<typeof generateDuaMatchRounds>
  >([]);
  const [duaRound, setDuaRound] = useState(0);
  const [duaScore, setDuaScore] = useState(0);
  const [duaSelected, setDuaSelected] = useState<string | null>(null);
  const [duaFinished, setDuaFinished] = useState(false);

  const getColor = (key: keyof typeof CategoryColors) =>
    isDark ? CategoryColors[key].dark : CategoryColors[key];

  const startQuiz = (cat: QuizCategory) => {
    const pool =
      cat === "All" ? QUIZ_DATA : QUIZ_DATA.filter((q) => q.category === cat);
    const filtered = settings.ageGroup
      ? pool.filter(
          (q) => q.ageGroup === "all" || q.ageGroup === settings.ageGroup,
        )
      : pool;
    const selected = shuffleArray(filtered).slice(0, 10);
    setQuizQuestions(selected);
    setCurrentQuestion(0);
    setQuizScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setQuizFinished(false);
    setSelectedCategory(cat);
    setActiveSection("quiz");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleQuizAnswer = async (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    setShowResult(true);
    const correct = index === quizQuestions[currentQuestion].correctIndex;
    if (correct) {
      setQuizScore((s) => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setTimeout(() => {
      if (currentQuestion < quizQuestions.length - 1) {
        setCurrentQuestion((c) => c + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setQuizFinished(true);
        const finalScore = correct ? quizScore + 1 : quizScore;
        const points = finalScore * 10;
        recordActivity(2, points);
        saveQuizScore(
          `quiz-${Date.now()}`,
          selectedCategory,
          finalScore,
          quizQuestions.length,
        );
        showCelebration(
          finalScore === quizQuestions.length
            ? "Perfect score!"
            : "Quiz complete!",
          `You got ${finalScore}/${quizQuestions.length} right in ${selectedCategory}.`,
          points,
        );
        if (quizScores.length === 0) {
          awardBadge(
            "first-quiz",
            "Quiz Starter",
            "Completed your first quiz",
            "brain",
            "quiz",
          );
        }
        if (finalScore === quizQuestions.length) {
          awardBadge(
            "perfect-quiz",
            "Perfect Score",
            "Got all questions right",
            "trophy",
            "quiz",
          );
        }
      }
    }, 1200);
  };

  const startLetterMatch = () => {
    setLetterRounds(generateLetterMatchRounds());
    setLetterRound(0);
    setLetterScore(0);
    setLetterSelected(null);
    setLetterFinished(false);
    setActiveSection("letterMatch");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleLetterAnswer = (answer: string) => {
    if (letterSelected !== null) return;
    setLetterSelected(answer);
    const correct = answer === letterRounds[letterRound].correct;
    if (correct) {
      setLetterScore((s) => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => {
      if (letterRound < letterRounds.length - 1) {
        setLetterRound((r) => r + 1);
        setLetterSelected(null);
      } else {
        setLetterFinished(true);
        const finalScore = correct ? letterScore + 1 : letterScore;
        const points = finalScore * 5;
        recordActivity(2, points);
        recordGamePlayed();
        showCelebration(
          "Letters matched!",
          `You matched ${finalScore}/${letterRounds.length} Arabic letters.`,
          points,
        );
      }
    }, 1000);
  };

  const startPillarOrder = () => {
    setPillarOrder(shuffleArray(PILLARS_CORRECT));
    setPillarSelections([]);
    setPillarResults([null, null, null, null, null]);
    setPillarFinished(false);
    setActiveSection("pillarOrder");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePillarTap = (pillar: string) => {
    if (pillarSelections.includes(pillar) || pillarFinished) return;
    const nextIndex = pillarSelections.length;
    const isCorrect = pillar === PILLARS_CORRECT[nextIndex];
    const newSelections = [...pillarSelections, pillar];
    const newResults = [...pillarResults];
    newResults[nextIndex] = isCorrect;
    setPillarSelections(newSelections);
    setPillarResults(newResults);

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    if (newSelections.length === 5) {
      setPillarFinished(true);
      const correctCount = newResults.filter((r) => r === true).length;
      const points = correctCount * 10;
      recordActivity(1, points);
      recordGamePlayed();
      showCelebration(
        correctCount === 5 ? "Perfect order!" : "Pillars complete!",
        `You placed ${correctCount}/5 pillars correctly.`,
        points,
      );
    }
  };

  const startBingo = () => {
    setBingoMarked(new Array(9).fill(false));
    setBingoWon(false);
    setActiveSection("bingo");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleBingoTap = (index: number) => {
    if (bingoWon) return;
    const newMarked = [...bingoMarked];
    newMarked[index] = !newMarked[index];
    setBingoMarked(newMarked);
    Haptics.selectionAsync();

    if (checkBingo(newMarked)) {
      setBingoWon(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      recordActivity(2, 50);
      recordGamePlayed();
      showCelebration("Bingo!", "You completed a row of Good Deeds.", 50);
      if (!badges.some((b) => b.id === "first-bingo")) {
        awardBadge(
          "first-bingo",
          "Bingo Champion",
          "Completed your first Good Deeds Bingo",
          "star",
          "game",
        );
      }
    }
  };

  const startDuaMatch = () => {
    setDuaRounds(generateDuaMatchRounds());
    setDuaRound(0);
    setDuaScore(0);
    setDuaSelected(null);
    setDuaFinished(false);
    setActiveSection("duaMatch");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleDuaAnswer = (answer: string) => {
    if (duaSelected !== null) return;
    setDuaSelected(answer);
    const correct = answer === duaRounds[duaRound].correct;
    if (correct) {
      setDuaScore((s) => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => {
      if (duaRound < duaRounds.length - 1) {
        setDuaRound((r) => r + 1);
        setDuaSelected(null);
      } else {
        setDuaFinished(true);
        const finalScore = correct ? duaScore + 1 : duaScore;
        const points = finalScore * 5;
        recordActivity(2, points);
        recordGamePlayed();
        if (!badges.some((b) => b.id === "first-dua-match")) {
          awardBadge(
            "first-dua-match",
            "Dua Detective",
            "Completed your first Dua Match game",
            "heart",
            "game",
          );
        }
        showCelebration(
          "Duas matched!",
          `You matched ${finalScore}/${duaRounds.length} duas to their moments.`,
          points,
        );
      }
    }, 1000);
  };

  const goBack = () => {
    if (activeSection === "menu") {
      navigation.goBack();
    } else {
      setActiveSection("menu");
    }
    Haptics.selectionAsync();
  };

  const renderHeader = (title: string) => (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
      <Pressable onPress={goBack} style={styles.headerBtn} testID="button-back">
        <AppIcon name="arrow-left" size={24} color={theme.text} />
      </Pressable>
      <ThemedText type="h3">{title}</ThemedText>
      <View style={styles.headerBtn} />
    </View>
  );

  if (activeSection === "quiz") {
    if (quizFinished) {
      const percent = Math.round((quizScore / quizQuestions.length) * 100);
      return (
        <View
          style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        >
          <LinearGradient
            colors={
              isDark ? ["#7C3AED", "transparent"] : ["#EDE9FE", "transparent"]
            }
            style={styles.topGradient}
          />
          {renderHeader("Quiz Results")}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: Spacing.lg,
              paddingBottom: insets.bottom + 40,
            }}
          >
            <Animated.View entering={FadeInDown.duration(400)}>
              <LinearGradient
                colors={
                  percent >= 80
                    ? [theme.gradientEnd, theme.gradientStart]
                    : percent >= 50
                      ? ["#D97706", "#F59E0B"]
                      : ["#DC2626", "#EF4444"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resultCard}
              >
                <Text style={{ fontSize: 56 }}>
                  {percent === 100
                    ? "\u{1F3C6}"
                    : percent >= 70
                      ? "\u{2B50}"
                      : "\u{1F4AA}"}
                </Text>
                <Text
                  style={[styles.resultScore, { fontFamily: Fonts?.sansBold }]}
                >
                  {quizScore}/{quizQuestions.length}
                </Text>
                <Text
                  style={[
                    styles.resultPercent,
                    { fontFamily: Fonts?.sansSemiBold },
                  ]}
                >
                  {percent}% Correct
                </Text>
                <Text
                  style={[styles.resultMessage, { fontFamily: Fonts?.sans }]}
                >
                  {percent === 100
                    ? "MashaAllah! Perfect Score!"
                    : percent >= 70
                      ? "Great job! Keep learning!"
                      : "Good try! Practice makes perfect!"}
                </Text>
              </LinearGradient>
            </Animated.View>
            <Animated.View
              entering={FadeInDown.delay(200).duration(400)}
              style={{ gap: Spacing.sm, marginTop: Spacing.xl }}
            >
              <Pressable
                onPress={() => startQuiz(selectedCategory)}
                style={[
                  styles.actionBtn,
                  { backgroundColor: getColor("purple").bg },
                ]}
                testID="button-retry-quiz"
              >
                <AppIcon
                  name="refresh-cw"
                  size={20}
                  color={getColor("purple").text}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    {
                      color: getColor("purple").text,
                      fontFamily: Fonts?.sansSemiBold,
                    },
                  ]}
                >
                  Try Again
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveSection("menu")}
                style={[
                  styles.actionBtn,
                  { backgroundColor: getColor("blue").bg },
                ]}
                testID="button-back-to-menu"
              >
                <AppIcon name="grid" size={20} color={getColor("blue").text} />
                <Text
                  style={[
                    styles.actionBtnText,
                    {
                      color: getColor("blue").text,
                      fontFamily: Fonts?.sansSemiBold,
                    },
                  ]}
                >
                  Back to Menu
                </Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
          <KidsCelebrationModal
            visible={!!celebration}
            title={celebration?.title ?? ""}
            subtitle={celebration?.subtitle}
            points={celebration?.points}
            onClose={() => setCelebration(null)}
          />
        </View>
      );
    }

    const q = quizQuestions[currentQuestion];
    const catColor = CATEGORY_COLOR_MAP[q.category] || "purple";
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <LinearGradient
          colors={
            isDark ? ["#7C3AED", "transparent"] : ["#EDE9FE", "transparent"]
          }
          style={styles.topGradient}
        />
        {renderHeader(
          `Question ${currentQuestion + 1}/${quizQuestions.length}`,
        )}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + 40,
          }}
        >
          <Animated.View entering={FadeInDown.duration(300)}>
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
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: getColor(catColor).text,
                    width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.scoreRow}>
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: getColor("emerald").bg },
                ]}
              >
                <AppIcon
                  name="check-circle"
                  size={14}
                  color={getColor("emerald").text}
                />
                <Text
                  style={[
                    styles.scoreBadgeText,
                    {
                      color: getColor("emerald").text,
                      fontFamily: Fonts?.sansSemiBold,
                    },
                  ]}
                >
                  {quizScore}
                </Text>
              </View>
              <View
                style={[
                  styles.categoryPill,
                  { backgroundColor: getColor(catColor).bg },
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color: getColor(catColor).text,
                      fontFamily: Fonts?.sansSemiBold,
                    },
                  ]}
                >
                  {q.category}
                </Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View
              style={[
                styles.questionCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <ThemedText
                type="h4"
                style={{ textAlign: "center", lineHeight: 26 }}
              >
                {q.question}
              </ThemedText>
            </View>
          </Animated.View>

          <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
            {q.options.map((opt, i) => {
              let bg = theme.surfaceGlass;
              let borderColor = theme.borderSubtle;
              let textColor = theme.text;
              if (showResult) {
                if (i === q.correctIndex) {
                  bg = theme.primarySubtle;
                  borderColor = theme.primary;
                  textColor = theme.primary;
                } else if (i === selectedAnswer && i !== q.correctIndex) {
                  bg = isDark ? "#4C0519" : "#FFF1F2";
                  borderColor = isDark ? "#FB7185" : "#E11D48";
                  textColor = isDark ? "#FB7185" : "#E11D48";
                }
              } else if (selectedAnswer === i) {
                bg = getColor(catColor).bg;
                borderColor = getColor(catColor).text;
              }
              return (
                <Animated.View
                  key={i}
                  entering={FadeInDown.delay(200 + i * 80).duration(300)}
                >
                  <Pressable
                    onPress={() => handleQuizAnswer(i)}
                    style={[
                      styles.optionBtn,
                      { backgroundColor: bg, borderColor },
                    ]}
                    testID={`button-option-${i}`}
                  >
                    <View
                      style={[
                        styles.optionLetter,
                        {
                          backgroundColor:
                            showResult && i === q.correctIndex
                              ? theme.primary
                              : getColor(catColor).bg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionLetterText,
                          {
                            color:
                              showResult && i === q.correctIndex
                                ? "#FFFFFF"
                                : getColor(catColor).text,
                            fontFamily: Fonts?.sansBold,
                          },
                        ]}
                      >
                        {String.fromCharCode(65 + i)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        { color: textColor, fontFamily: Fonts?.sansSemiBold },
                      ]}
                    >
                      {opt}
                    </Text>
                    {showResult && i === q.correctIndex ? (
                      <AppIcon
                        name="check-circle"
                        size={20}
                        color={theme.primary}
                      />
                    ) : null}
                    {showResult &&
                    i === selectedAnswer &&
                    i !== q.correctIndex ? (
                      <AppIcon
                        name="x-circle"
                        size={20}
                        color={isDark ? "#FB7185" : "#E11D48"}
                      />
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (activeSection === "letterMatch") {
    if (letterFinished) {
      return (
        <View
          style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        >
          <LinearGradient
            colors={
              isDark ? ["#E11D48", "transparent"] : ["#FFF1F2", "transparent"]
            }
            style={styles.topGradient}
          />
          {renderHeader("Letter Match Results")}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: Spacing.lg,
              paddingBottom: insets.bottom + 40,
            }}
          >
            <Animated.View entering={FadeInDown.duration(400)}>
              <LinearGradient
                colors={["#E11D48", "#FB7185"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resultCard}
              >
                <Text style={{ fontSize: 56 }}>
                  {letterScore >= 8 ? "\u{1F3C6}" : "\u{2B50}"}
                </Text>
                <Text
                  style={[styles.resultScore, { fontFamily: Fonts?.sansBold }]}
                >
                  {letterScore}/{letterRounds.length}
                </Text>
                <Text
                  style={[styles.resultMessage, { fontFamily: Fonts?.sans }]}
                >
                  {letterScore === letterRounds.length
                    ? "MashaAllah! Perfect!"
                    : "Keep practicing Arabic letters!"}
                </Text>
              </LinearGradient>
            </Animated.View>
            <Animated.View
              entering={FadeInDown.delay(200).duration(400)}
              style={{ gap: Spacing.sm, marginTop: Spacing.xl }}
            >
              <Pressable
                onPress={startLetterMatch}
                style={[
                  styles.actionBtn,
                  { backgroundColor: getColor("rose").bg },
                ]}
                testID="button-retry-letters"
              >
                <AppIcon
                  name="refresh-cw"
                  size={20}
                  color={getColor("rose").text}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    {
                      color: getColor("rose").text,
                      fontFamily: Fonts?.sansSemiBold,
                    },
                  ]}
                >
                  Play Again
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveSection("menu")}
                style={[
                  styles.actionBtn,
                  { backgroundColor: getColor("blue").bg },
                ]}
                testID="button-back-menu-letter"
              >
                <AppIcon name="grid" size={20} color={getColor("blue").text} />
                <Text
                  style={[
                    styles.actionBtnText,
                    {
                      color: getColor("blue").text,
                      fontFamily: Fonts?.sansSemiBold,
                    },
                  ]}
                >
                  Back to Menu
                </Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
          <KidsCelebrationModal
            visible={!!celebration}
            title={celebration?.title ?? ""}
            subtitle={celebration?.subtitle}
            points={celebration?.points}
            onClose={() => setCelebration(null)}
          />
        </View>
      );
    }

    const round = letterRounds[letterRound];
    if (!round) return null;
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <LinearGradient
          colors={
            isDark ? ["#E11D48", "transparent"] : ["#FFF1F2", "transparent"]
          }
          style={styles.topGradient}
        />
        {renderHeader(`Round ${letterRound + 1}/${letterRounds.length}`)}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + 40,
          }}
        >
          <Animated.View entering={FadeInDown.duration(300)}>
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
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: getColor("rose").text,
                    width: `${((letterRound + 1) / letterRounds.length) * 100}%`,
                  },
                ]}
              />
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View
              style={[
                styles.letterDisplayCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <Text style={[styles.arabicLetter, { color: theme.text }]}>
                {round.arabic}
              </Text>
              <ThemedText type="h4" style={{ marginTop: Spacing.sm }}>
                {round.name}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Pick the correct transliteration
              </ThemedText>
            </View>
          </Animated.View>
          <View style={styles.letterOptionsGrid}>
            {round.options.map((opt, i) => {
              let bg = theme.surfaceGlass;
              let borderColor = theme.borderSubtle;
              if (letterSelected !== null) {
                if (opt === round.correct) {
                  bg = theme.primarySubtle;
                  borderColor = theme.primary;
                } else if (opt === letterSelected) {
                  bg = isDark ? "#4C0519" : "#FFF1F2";
                  borderColor = isDark ? "#FB7185" : "#E11D48";
                }
              }
              return (
                <Animated.View
                  key={i}
                  entering={FadeInDown.delay(200 + i * 80).duration(300)}
                >
                  <Pressable
                    onPress={() => handleLetterAnswer(opt)}
                    style={[
                      styles.letterOption,
                      { backgroundColor: bg, borderColor },
                    ]}
                    testID={`button-letter-${i}`}
                  >
                    <Text
                      style={[
                        styles.letterOptionText,
                        { color: theme.text, fontFamily: Fonts?.sansBold },
                      ]}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (activeSection === "pillarOrder") {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <LinearGradient
          colors={
            isDark ? ["#EA580C", "transparent"] : ["#FFF7ED", "transparent"]
          }
          style={styles.topGradient}
        />
        {renderHeader("Order the Pillars")}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + 40,
          }}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <View
              style={[
                styles.questionCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <ThemedText type="h4" style={{ textAlign: "center" }}>
                Tap the 5 Pillars of Islam in the correct order
              </ThemedText>
            </View>
          </Animated.View>

          <View style={{ marginTop: Spacing.lg }}>
            <ThemedText
              type="small"
              style={{ color: theme.textMuted, marginBottom: Spacing.sm }}
            >
              Your selections:
            </ThemedText>
            <View style={styles.pillarSelectionsRow}>
              {PILLARS_CORRECT.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.pillarSlot,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor:
                        pillarResults[i] === true
                          ? theme.primary
                          : pillarResults[i] === false
                            ? isDark
                              ? "#FB7185"
                              : "#E11D48"
                            : theme.borderSubtle,
                    },
                  ]}
                >
                  {pillarSelections[i] ? (
                    <>
                      <Text
                        style={[
                          styles.pillarSlotNum,
                          {
                            color: theme.textMuted,
                            fontFamily: Fonts?.sansBold,
                          },
                        ]}
                      >
                        {i + 1}
                      </Text>
                      <Text
                        style={[
                          styles.pillarSlotText,
                          {
                            color: theme.text,
                            fontFamily: Fonts?.sansSemiBold,
                          },
                        ]}
                      >
                        {pillarSelections[i]}
                      </Text>
                      {pillarResults[i] === true ? (
                        <AppIcon name="check" size={16} color={theme.primary} />
                      ) : null}
                      {pillarResults[i] === false ? (
                        <AppIcon
                          name="x"
                          size={16}
                          color={isDark ? "#FB7185" : "#E11D48"}
                        />
                      ) : null}
                    </>
                  ) : (
                    <Text
                      style={[
                        styles.pillarSlotNum,
                        { color: theme.textMuted, fontFamily: Fonts?.sansBold },
                      ]}
                    >
                      {i + 1}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>

          <View style={{ gap: Spacing.sm, marginTop: Spacing.xl }}>
            {pillarOrder.map((pillar, i) => {
              const selected = pillarSelections.includes(pillar);
              return (
                <Animated.View
                  key={pillar}
                  entering={FadeInDown.delay(200 + i * 80).duration(300)}
                >
                  <Pressable
                    onPress={() => handlePillarTap(pillar)}
                    style={[
                      styles.pillarBtn,
                      {
                        backgroundColor: selected
                          ? isDark
                            ? theme.backgroundTertiary
                            : theme.backgroundSecondary
                          : theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                        opacity: selected ? 0.5 : 1,
                      },
                    ]}
                    disabled={selected || pillarFinished}
                    testID={`button-pillar-${pillar}`}
                  >
                    <Text
                      style={[
                        styles.pillarBtnText,
                        { color: theme.text, fontFamily: Fonts?.sansSemiBold },
                      ]}
                    >
                      {pillar}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {pillarFinished ? (
            <Animated.View
              entering={FadeInDown.delay(100).duration(400)}
              style={{ gap: Spacing.sm, marginTop: Spacing.xl }}
            >
              <LinearGradient
                colors={["#EA580C", "#FB923C"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.resultCard, { paddingVertical: Spacing.lg }]}
              >
                <Text style={{ fontSize: 40 }}>
                  {pillarResults.every((r) => r) ? "\u{1F3C6}" : "\u{1F4AA}"}
                </Text>
                <Text
                  style={[
                    styles.resultPercent,
                    { fontFamily: Fonts?.sansBold },
                  ]}
                >
                  {pillarResults.filter((r) => r).length}/5 Correct
                </Text>
                <Text
                  style={[styles.resultMessage, { fontFamily: Fonts?.sans }]}
                >
                  {pillarResults.every((r) => r)
                    ? "MashaAllah! Perfect order!"
                    : "Keep practicing!"}
                </Text>
              </LinearGradient>
              <Pressable
                onPress={startPillarOrder}
                style={[
                  styles.actionBtn,
                  { backgroundColor: getColor("orange").bg },
                ]}
                testID="button-retry-pillars"
              >
                <AppIcon
                  name="refresh-cw"
                  size={20}
                  color={getColor("orange").text}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    {
                      color: getColor("orange").text,
                      fontFamily: Fonts?.sansSemiBold,
                    },
                  ]}
                >
                  Try Again
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveSection("menu")}
                style={[
                  styles.actionBtn,
                  { backgroundColor: getColor("blue").bg },
                ]}
                testID="button-back-menu-pillar"
              >
                <AppIcon name="grid" size={20} color={getColor("blue").text} />
                <Text
                  style={[
                    styles.actionBtnText,
                    {
                      color: getColor("blue").text,
                      fontFamily: Fonts?.sansSemiBold,
                    },
                  ]}
                >
                  Back to Menu
                </Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </ScrollView>
        <KidsCelebrationModal
          visible={!!celebration}
          title={celebration?.title ?? ""}
          subtitle={celebration?.subtitle}
          points={celebration?.points}
          onClose={() => setCelebration(null)}
        />
      </View>
    );
  }

  if (activeSection === "bingo") {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <LinearGradient
          colors={
            isDark ? ["#4F46E5", "transparent"] : ["#EEF2FF", "transparent"]
          }
          style={styles.topGradient}
        />
        {renderHeader("Good Deeds Bingo")}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + 40,
          }}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <View
              style={[
                styles.questionCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <ThemedText type="h4" style={{ textAlign: "center" }}>
                {bingoWon
                  ? "MashaAllah! BINGO!"
                  : "Mark the good deeds you've done today"}
              </ThemedText>
              {bingoWon ? (
                <Text
                  style={{
                    fontSize: 40,
                    textAlign: "center",
                    marginTop: Spacing.sm,
                  }}
                >
                  {"\u{1F389}"}
                </Text>
              ) : null}
            </View>
          </Animated.View>

          <View style={styles.bingoGrid}>
            {BINGO_DEEDS.map((deed, i) => {
              const marked = bingoMarked[i];
              return (
                <Animated.View
                  key={i}
                  entering={FadeInDown.delay(100 + i * 50).duration(300)}
                >
                  <Pressable
                    onPress={() => handleBingoTap(i)}
                    style={[
                      styles.bingoCell,
                      {
                        backgroundColor: marked
                          ? isDark
                            ? "#1E3A5F"
                            : "#EFF6FF"
                          : theme.surfaceGlass,
                        borderColor: marked
                          ? isDark
                            ? "#60A5FA"
                            : "#2563EB"
                          : theme.borderSubtle,
                      },
                    ]}
                    testID={`button-bingo-${i}`}
                  >
                    {marked ? (
                      <AppIcon
                        name="check-circle"
                        size={24}
                        color={isDark ? "#60A5FA" : "#2563EB"}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.bingoCellText,
                        {
                          color: marked
                            ? isDark
                              ? "#60A5FA"
                              : "#2563EB"
                            : theme.text,
                          fontFamily: Fonts?.sansSemiBold,
                        },
                      ]}
                    >
                      {deed}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {bingoWon ? (
            <Animated.View
              entering={FadeInDown.delay(200).duration(400)}
              style={{ marginTop: Spacing.lg }}
            >
              <LinearGradient
                colors={["#4F46E5", "#818CF8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.resultCard, { paddingVertical: Spacing.lg }]}
              >
                <Text style={{ fontSize: 48 }}>{"\u{2B50}"}</Text>
                <Text
                  style={[
                    styles.resultPercent,
                    { fontFamily: Fonts?.sansBold },
                  ]}
                >
                  +50 Points
                </Text>
                <Text
                  style={[styles.resultMessage, { fontFamily: Fonts?.sans }]}
                >
                  Great job doing good deeds!
                </Text>
              </LinearGradient>
            </Animated.View>
          ) : null}

          <Pressable
            onPress={() => setActiveSection("menu")}
            style={[
              styles.actionBtn,
              { backgroundColor: getColor("indigo").bg, marginTop: Spacing.lg },
            ]}
            testID="button-back-menu-bingo"
          >
            <AppIcon name="grid" size={20} color={getColor("indigo").text} />
            <Text
              style={[
                styles.actionBtnText,
                {
                  color: getColor("indigo").text,
                  fontFamily: Fonts?.sansSemiBold,
                },
              ]}
            >
              Back to Menu
            </Text>
          </Pressable>
        </ScrollView>
        <KidsCelebrationModal
          visible={!!celebration}
          title={celebration?.title ?? ""}
          subtitle={celebration?.subtitle}
          points={celebration?.points}
          onClose={() => setCelebration(null)}
        />
      </View>
    );
  }

  if (activeSection === "duaMatch") {
    if (duaFinished) {
      return (
        <View
          style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        >
          <LinearGradient
            colors={
              isDark ? ["#0D9488", "transparent"] : ["#CCFBF1", "transparent"]
            }
            style={styles.topGradient}
          />
          {renderHeader("Dua Match Results")}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: Spacing.lg,
              paddingBottom: insets.bottom + 40,
            }}
          >
            <Animated.View entering={FadeInDown.duration(400)}>
              <LinearGradient
                colors={["#0D9488", "#2DD4BF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resultCard}
              >
                <Text style={{ fontSize: 56 }}>
                  {duaScore >= duaRounds.length - 1 ? "\u{1F3C6}" : "\u{2B50}"}
                </Text>
                <Text
                  style={[styles.resultScore, { fontFamily: Fonts?.sansBold }]}
                >
                  {duaScore}/{duaRounds.length}
                </Text>
                <Text
                  style={[styles.resultMessage, { fontFamily: Fonts?.sans }]}
                >
                  {duaScore === duaRounds.length
                    ? "MashaAllah! Perfect!"
                    : "Keep practicing your daily duas!"}
                </Text>
              </LinearGradient>
            </Animated.View>
            <Animated.View
              entering={FadeInDown.delay(200).duration(400)}
              style={{ gap: Spacing.sm, marginTop: Spacing.xl }}
            >
              <Pressable
                onPress={startDuaMatch}
                style={[
                  styles.actionBtn,
                  { backgroundColor: getColor("teal").bg },
                ]}
                testID="button-retry-duas"
              >
                <AppIcon
                  name="refresh-cw"
                  size={20}
                  color={getColor("teal").text}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    {
                      color: getColor("teal").text,
                      fontFamily: Fonts?.sansSemiBold,
                    },
                  ]}
                >
                  Play Again
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveSection("menu")}
                style={[
                  styles.actionBtn,
                  { backgroundColor: getColor("blue").bg },
                ]}
                testID="button-back-menu-dua"
              >
                <AppIcon name="grid" size={20} color={getColor("blue").text} />
                <Text
                  style={[
                    styles.actionBtnText,
                    {
                      color: getColor("blue").text,
                      fontFamily: Fonts?.sansSemiBold,
                    },
                  ]}
                >
                  Back to Menu
                </Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
          <KidsCelebrationModal
            visible={!!celebration}
            title={celebration?.title ?? ""}
            subtitle={celebration?.subtitle}
            points={celebration?.points}
            onClose={() => setCelebration(null)}
          />
        </View>
      );
    }

    const round = duaRounds[duaRound];
    if (!round) return null;
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <LinearGradient
          colors={
            isDark ? ["#0D9488", "transparent"] : ["#CCFBF1", "transparent"]
          }
          style={styles.topGradient}
        />
        {renderHeader(`Round ${duaRound + 1}/${duaRounds.length}`)}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + 40,
          }}
        >
          <Animated.View entering={FadeInDown.duration(300)}>
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
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: getColor("teal").text,
                    width: `${((duaRound + 1) / duaRounds.length) * 100}%`,
                  },
                ]}
              />
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View
              style={[
                styles.letterDisplayCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <Text style={[styles.arabicLetter, { color: theme.text }]}>
                {round.arabic}
              </Text>
              <ThemedText type="h4" style={{ marginTop: Spacing.sm }}>
                {round.occasion}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Pick the dua we say for this moment
              </ThemedText>
            </View>
          </Animated.View>
          <View style={styles.letterOptionsGrid}>
            {round.options.map((opt, i) => {
              let bg = theme.surfaceGlass;
              let borderColor = theme.borderSubtle;
              if (duaSelected !== null) {
                if (opt === round.correct) {
                  bg = theme.primarySubtle;
                  borderColor = theme.primary;
                } else if (opt === duaSelected) {
                  bg = isDark ? "#4C0519" : "#FFF1F2";
                  borderColor = isDark ? "#FB7185" : "#E11D48";
                }
              }
              return (
                <Animated.View
                  key={i}
                  entering={FadeInDown.delay(200 + i * 80).duration(300)}
                >
                  <Pressable
                    onPress={() => handleDuaAnswer(opt)}
                    style={[
                      styles.letterOption,
                      { backgroundColor: bg, borderColor },
                    ]}
                    testID={`button-dua-${i}`}
                  >
                    <Text
                      style={[
                        styles.letterOptionText,
                        { color: theme.text, fontFamily: Fonts?.sansBold },
                      ]}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <LinearGradient
        colors={
          isDark ? ["#7C3AED", "transparent"] : ["#EDE9FE", "transparent"]
        }
        style={styles.topGradient}
      />
      {renderHeader("Quizzes & Games")}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            QUIZZES
          </ThemedText>
          <GoldDivider
            color={theme.scholar}
            opacity={0.52}
            style={styles.sectionDivider}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
          >
            {FILTER_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              const colorKey =
                cat === "All" ? "purple" : CATEGORY_COLOR_MAP[cat] || "purple";
              return (
                <Pressable
                  key={cat}
                  onPress={() => {
                    setSelectedCategory(cat);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active
                        ? getColor(colorKey as keyof typeof CategoryColors).text
                        : theme.surfaceGlass,
                      borderColor: active ? "transparent" : theme.borderSubtle,
                    },
                  ]}
                  testID={`button-cat-${cat}`}
                >
                  <Text
                    style={[
                      styles.pillText,
                      {
                        color: active ? "#FFFFFF" : theme.text,
                        fontFamily: Fonts?.sansSemiBold,
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={styles.quizCardsGrid}>
            {(selectedCategory === "All"
              ? Object.keys(CATEGORY_COLOR_MAP)
              : [selectedCategory]
            ).map((cat, i) => {
              const colorKey = CATEGORY_COLOR_MAP[cat] || "purple";
              const count = QUIZ_DATA.filter((q) => q.category === cat).length;
              const iconMap: Record<string, any> = {
                Aqeedah: "star",
                Pillars: "columns",
                "Names of Allah": "heart",
                Seerah: "book-open",
                "Wudu & Salah": "droplet",
                "Surah Facts": "moon",
              };
              return (
                <Animated.View
                  key={cat}
                  entering={FadeInDown.delay(150 + i * 80).duration(400)}
                >
                  <Pressable
                    onPress={() => startQuiz(cat as QuizCategory)}
                    style={[
                      styles.quizCard,
                      {
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                    testID={`button-start-quiz-${cat}`}
                  >
                    <GeometricCardPattern
                      color={
                        getColor(colorKey as keyof typeof CategoryColors).text
                      }
                      opacity={0.012}
                    />
                    <View
                      style={[
                        styles.quizCardIcon,
                        {
                          backgroundColor: getColor(
                            colorKey as keyof typeof CategoryColors,
                          ).bg,
                        },
                      ]}
                    >
                      <AppIcon
                        name={iconMap[cat] || "help-circle"}
                        size={24}
                        color={
                          getColor(colorKey as keyof typeof CategoryColors).text
                        }
                      />
                    </View>
                    <ThemedText type="h4" style={{ marginTop: Spacing.sm }}>
                      {cat}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {count} questions
                    </ThemedText>
                    <View
                      style={[
                        styles.startBadge,
                        {
                          backgroundColor: getColor(
                            colorKey as keyof typeof CategoryColors,
                          ).bg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.startBadgeText,
                          {
                            color: getColor(
                              colorKey as keyof typeof CategoryColors,
                            ).text,
                            fontFamily: Fonts?.sansSemiBold,
                          },
                        ]}
                      >
                        Start
                      </Text>
                      <AppIcon
                        name="play"
                        size={14}
                        color={
                          getColor(colorKey as keyof typeof CategoryColors).text
                        }
                      />
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            GAMES
          </ThemedText>
          <View style={{ gap: Spacing.sm }}>
            <Animated.View entering={FadeInDown.delay(350).duration(400)}>
              <Pressable
                onPress={startLetterMatch}
                style={[
                  styles.gameCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                ]}
                testID="button-game-letter-match"
              >
                <GeometricCardPattern
                  color={getColor("rose").text}
                  opacity={0.012}
                />
                <View
                  style={[
                    styles.gameCardIcon,
                    { backgroundColor: getColor("rose").bg },
                  ]}
                >
                  <AppIcon
                    name="type"
                    size={22}
                    color={getColor("rose").text}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <ThemedText type="h4">Letter Match</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    Match Arabic letters to their transliterations
                  </ThemedText>
                </View>
                <AppIcon
                  name="chevron-right"
                  size={22}
                  color={theme.textMuted}
                />
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(430).duration(400)}>
              <Pressable
                onPress={startPillarOrder}
                style={[
                  styles.gameCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                ]}
                testID="button-game-pillar-order"
              >
                <GeometricCardPattern
                  color={getColor("orange").text}
                  opacity={0.012}
                />
                <View
                  style={[
                    styles.gameCardIcon,
                    { backgroundColor: getColor("orange").bg },
                  ]}
                >
                  <AppIcon
                    name="list"
                    size={24}
                    color={getColor("orange").text}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <ThemedText type="h4">Pillar Ordering</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    Put the 5 pillars of Islam in order
                  </ThemedText>
                </View>
                <AppIcon
                  name="chevron-right"
                  size={22}
                  color={theme.textMuted}
                />
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(510).duration(400)}>
              <Pressable
                onPress={startBingo}
                style={[
                  styles.gameCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                ]}
                testID="button-game-bingo"
              >
                <GeometricCardPattern
                  color={getColor("indigo").text}
                  opacity={0.012}
                />
                <View
                  style={[
                    styles.gameCardIcon,
                    { backgroundColor: getColor("indigo").bg },
                  ]}
                >
                  <AchievementBadgeSvg
                    size={28}
                    color={getColor("indigo").text}
                    accentColor={getColor("indigo").bg}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <ThemedText type="h4">Good Deeds Bingo</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    Complete a row of good deeds to win
                  </ThemedText>
                </View>
                <AppIcon
                  name="chevron-right"
                  size={22}
                  color={theme.textMuted}
                />
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(590).duration(400)}>
              <Pressable
                onPress={startDuaMatch}
                style={[
                  styles.gameCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                ]}
                testID="button-game-dua-match"
              >
                <GeometricCardPattern
                  color={getColor("teal").text}
                  opacity={0.012}
                />
                <View
                  style={[
                    styles.gameCardIcon,
                    { backgroundColor: getColor("teal").bg },
                  ]}
                >
                  <AppIcon
                    name="heart"
                    size={22}
                    color={getColor("teal").text}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <ThemedText type="h4">Dua Match</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    Match everyday duas to the right moment
                  </ThemedText>
                </View>
                <AppIcon
                  name="chevron-right"
                  size={22}
                  color={theme.textMuted}
                />
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { marginTop: Spacing.xl, marginBottom: Spacing.md },
  sectionDivider: { marginTop: -Spacing.sm, marginBottom: Spacing.sm },
  pillsRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pillText: { fontSize: 13 },
  quizCardsGrid: { gap: Spacing.sm, marginTop: Spacing.sm },
  quizCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: "center",
    overflow: "hidden",
  },
  quizCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  startBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  startBadgeText: { fontSize: 13 },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  gameCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  progressBarFill: { height: 6, borderRadius: 3 },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  scoreBadgeText: { fontSize: 14 },
  categoryPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  categoryPillText: { fontSize: 12 },
  questionCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing["2xl"],
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLetterText: { fontSize: 14 },
  optionText: { flex: 1, fontSize: 15 },
  resultCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  resultScore: { color: "#FFFFFF", fontSize: 48, marginTop: Spacing.sm },
  resultPercent: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 18,
    marginTop: Spacing.xs,
  },
  resultMessage: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
  },
  actionBtnText: { fontSize: 15 },
  letterDisplayCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing["2xl"],
    alignItems: "center",
    marginTop: Spacing.md,
  },
  arabicLetter: { fontSize: 80, lineHeight: 100 },
  letterOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    justifyContent: "center",
  },
  letterOption: {
    width: 150,
    height: 60,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  letterOptionText: { fontSize: 22 },
  pillarSelectionsRow: { gap: Spacing.sm },
  pillarSlot: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: Spacing.md,
    gap: Spacing.sm,
    minHeight: 48,
  },
  pillarSlotNum: { fontSize: 14, width: 20 },
  pillarSlotText: { flex: 1, fontSize: 14 },
  pillarBtn: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: "center",
  },
  pillarBtnText: { fontSize: 16 },
  bingoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    justifyContent: "center",
  },
  bingoCell: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    minWidth: 95,
  },
  bingoCellText: { fontSize: 12, textAlign: "center", marginTop: 4 },
});
