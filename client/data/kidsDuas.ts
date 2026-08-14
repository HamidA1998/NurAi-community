// Extracted verbatim from KidsMemorizationScreen.tsx so this vetted content can be reused (e.g. by kids' games/quizzes) from a single source of truth. Only identifier names were renamed on export; the Arabic text and data below are unchanged.

export interface KidsDua {
  id: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  occasion: string;
  difficulty: "easy" | "medium";
}

export const KIDS_DUAS: KidsDua[] = [
  {
    id: "dua-eating-before",
    title: "Before Eating",
    arabic:
      "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650",
    transliteration: "Bismillah",
    translation: "In the name of Allah",
    occasion: "Before meals",
    difficulty: "easy",
  },
  {
    id: "dua-eating-after",
    title: "After Eating",
    arabic:
      "\u0627\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064F \u0644\u0650\u0644\u0651\u064E\u0647\u0650",
    transliteration: "Alhamdulillah",
    translation: "All praise is due to Allah",
    occasion: "After meals",
    difficulty: "easy",
  },
  {
    id: "dua-sleep",
    title: "Before Sleeping",
    arabic:
      "\u0628\u0650\u0627\u0633\u0652\u0645\u0650\u0643\u064E \u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0623\u064E\u0645\u064F\u0648\u062A\u064F \u0648\u064E\u0623\u064E\u062D\u0652\u064A\u064E\u0627",
    transliteration: "Bismika Allahumma amutu wa ahya",
    translation: "In Your name, O Allah, I die and I live",
    occasion: "Bedtime",
    difficulty: "easy",
  },
  {
    id: "dua-wakeup",
    title: "Waking Up",
    arabic:
      "\u0627\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064F \u0644\u0650\u0644\u0651\u064E\u0647\u0650 \u0627\u0644\u0651\u064E\u0630\u0650\u064A \u0623\u064E\u062D\u0652\u064A\u064E\u0627\u0646\u064E\u0627",
    transliteration: "Alhamdulillahil-ladhi ahyana",
    translation: "Praise to Allah who gave us life",
    occasion: "Morning",
    difficulty: "easy",
  },
  {
    id: "dua-enter-home",
    title: "Entering Home",
    arabic:
      "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0625\u0650\u0646\u0651\u0650\u064A \u0623\u064E\u0633\u0652\u0623\u064E\u0644\u064F\u0643\u064E \u062E\u064E\u064A\u0652\u0631\u064E \u0627\u0644\u0652\u0645\u064E\u0648\u0652\u0644\u0650\u062C\u0650",
    transliteration: "Allahumma inni as'aluka khayral-mawlij",
    translation: "O Allah, I ask You for the best entrance",
    occasion: "Arriving home",
    difficulty: "medium",
  },
  {
    id: "dua-bathroom",
    title: "Entering Bathroom",
    arabic:
      "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0625\u0650\u0646\u0651\u0650\u064A \u0623\u064E\u0639\u064F\u0648\u0630\u064F \u0628\u0650\u0643\u064E",
    transliteration: "Allahumma inni a'udhu bika minal-khubuthi wal-khaba'ith",
    translation: "O Allah, I seek refuge in You from evil",
    occasion: "Before bathroom",
    difficulty: "medium",
  },
  {
    id: "dua-wudu",
    title: "After Wudu",
    arabic:
      "\u0623\u064E\u0634\u0652\u0647\u064E\u062F\u064F \u0623\u064E\u0646\u0652 \u0644\u064E\u0627 \u0625\u0650\u0644\u064E\u0647\u064E \u0625\u0650\u0644\u0651\u064E\u0627 \u0627\u0644\u0644\u0651\u064E\u0647\u064F",
    transliteration: "Ash-hadu an la ilaha illallah...",
    translation: "I bear witness that there is no god but Allah",
    occasion: "After ablution",
    difficulty: "medium",
  },
  {
    id: "dua-rain",
    title: "When It Rains",
    arabic:
      "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0635\u064E\u064A\u0651\u0650\u0628\u064B\u0627 \u0646\u064E\u0627\u0641\u0650\u0639\u064B\u0627",
    transliteration: "Allahumma sayyiban nafi'a",
    translation: "O Allah, let it be a beneficial rain",
    occasion: "During rain",
    difficulty: "easy",
  },
  {
    id: "dua-leave-home",
    title: "Leaving Home",
    arabic:
      "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u062A\u064E\u0648\u064E\u0643\u0651\u064E\u0644\u0652\u062A\u064F \u0639\u064E\u0644\u064E\u0649 \u0627\u0644\u0644\u0651\u064E\u0647\u0650",
    transliteration: "Bismillahi tawakkaltu 'alAllah",
    translation: "In the name of Allah, I place my trust in Allah",
    occasion: "Leaving home",
    difficulty: "easy",
  },
  {
    id: "dua-parents",
    title: "For Parents",
    arabic:
      "\u0631\u064E\u0628\u0651\u0650 \u0627\u0631\u0652\u062D\u064E\u0645\u0652\u0647\u064F\u0645\u064E\u0627 \u0643\u064E\u0645\u064E\u0627 \u0631\u064E\u0628\u0651\u064E\u064A\u064E\u0627\u0646\u0650\u064A \u0635\u064E\u063A\u0650\u064A\u0631\u064E\u0627",
    transliteration: "Rabbir-hamhuma kama rabbayanee sagheera",
    translation:
      "My Lord, have mercy upon them as they raised me when I was small",
    occasion: "For parents",
    difficulty: "medium",
  },
];
