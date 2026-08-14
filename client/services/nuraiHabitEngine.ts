import type { AppIconName } from "@/components/icons";

export interface HabitSuggestion {
  id: string;
  name: string;
  cue: string;
  cueDescription: string;
  routine: string;
  routineDescription: string;
  difficulty: "tiny" | "small" | "medium";
  category: string;
}

const HABITS: HabitSuggestion[] = [
  {
    id: "fajr_sunnah",
    name: "Sunnah after Fajr",
    cue: "after_fajr",
    cueDescription: "Right after Fajr",
    routine: "2 rakah Sunnah",
    routineDescription: "Pray 2 rakah Sunnah of Fajr",
    difficulty: "tiny",
    category: "prayer",
  },
  {
    id: "quran_1page",
    name: "One Page of Quran",
    cue: "after_fajr",
    cueDescription: "After Fajr",
    routine: "1 page",
    routineDescription: "Just one page \u2014 no pressure",
    difficulty: "tiny",
    category: "quran",
  },
  {
    id: "morning_adhkar",
    name: "Morning Adhkar",
    cue: "after_fajr",
    cueDescription: "After Fajr",
    routine: "3x each",
    routineDescription: "3x SubhanAllah, Alhamdulillah, Allahu Akbar",
    difficulty: "tiny",
    category: "dhikr",
  },
  {
    id: "ayatul_kursi",
    name: "Ayatul Kursi after Salah",
    cue: "after_prayer",
    cueDescription: "After any prayer",
    routine: "Recite once",
    routineDescription:
      "Nothing prevents Jannah except death for whoever recites it.",
    difficulty: "tiny",
    category: "dhikr",
  },
  {
    id: "mulk_sleep",
    name: "Surah Al-Mulk",
    cue: "before_sleep",
    cueDescription: "Before sleeping",
    routine: "Listen/read",
    routineDescription: "Protection from the grave.",
    difficulty: "small",
    category: "quran",
  },
  {
    id: "dhuha",
    name: "Dhuha Prayer",
    cue: "mid_morning",
    cueDescription: "After sunrise",
    routine: "2 rakah",
    routineDescription: "Charity for every joint.",
    difficulty: "small",
    category: "prayer",
  },
  {
    id: "tasbeeh_33",
    name: "Post-Prayer Tasbeeh",
    cue: "after_prayer",
    cueDescription: "After fardh",
    routine: "33x each",
    routineDescription: "SubhanAllah, Alhamdulillah, Allahu Akbar",
    difficulty: "small",
    category: "dhikr",
  },
  {
    id: "quran_5min",
    name: "5 Min Quran",
    cue: "before_sleep",
    cueDescription: "Before bed",
    routine: "5 minutes",
    routineDescription: "End your day with Allah's words",
    difficulty: "tiny",
    category: "quran",
  },
  {
    id: "one_hadith",
    name: "One Hadith",
    cue: "after_isha",
    cueDescription: "After Isha",
    routine: "Read 1 hadith",
    routineDescription: "Knowledge compounds.",
    difficulty: "tiny",
    category: "knowledge",
  },
  {
    id: "sadaqah",
    name: "Daily Micro-Charity",
    cue: "app_open",
    cueDescription: "When opening NurAI",
    routine: "Give or smile",
    routineDescription: "Every kindness is charity.",
    difficulty: "tiny",
    category: "charity",
  },
];

export function suggestHabit(
  weakestArea: string,
  currentIds: string[],
): HabitSuggestion | null {
  const avail = HABITS.filter(
    (h) => h.category === weakestArea && !currentIds.includes(h.id),
  );
  if (avail.length === 0) {
    const any = HABITS.filter((h) => !currentIds.includes(h.id));
    return any.length > 0 ? any[0] : null;
  }
  const tiny = avail.filter((h) => h.difficulty === "tiny");
  return tiny.length > 0 ? tiny[0] : avail[0];
}

export function getHabitMotivation(
  streak: number,
  stage: "awareness" | "action" | "automation",
): string {
  if (stage === "awareness" && streak <= 3)
    return "Just showing up is the win. Keep it tiny.";
  if (stage === "awareness" && streak <= 7)
    return "One week! Small, steady worship habits are beginning to take root.";
  if (stage === "awareness")
    return `${streak} days! Building neural pathways. Gets easier from here.`;
  if (stage === "action" && streak <= 30)
    return `${streak} days. Becoming part of who you are.`;
  if (stage === "action")
    return `${streak} days! Past the hardest part. Taking root.`;
  return `${streak} days. Automatic now. You don't just do it \u2014 you ARE it. SubhanAllah.`;
}

export type HabitCategoryId =
  | "salah"
  | "quran"
  | "dhikr"
  | "charity"
  | "learning"
  | "reflection";

export interface HabitCategory {
  id: HabitCategoryId;
  label: string;
  icon: AppIconName;
  color: string;
  darkColor: string;
}

// Every habit uses the app's emerald as its accent (differentiated by icon,
// not by colour) so the garden reads as part of NurAI's Quiet Intelligence
// palette instead of a rainbow. Charity keeps a scholar-gold accent because
// sadaqah/generosity is exactly where the design language permits gold.
export const HABIT_CATEGORIES: HabitCategory[] = [
  {
    id: "salah",
    label: "Salah",
    icon: "prayer",
    color: "#3E8C78",
    darkColor: "#56B394",
  },
  {
    id: "quran",
    label: "Quran",
    icon: "quran",
    color: "#3E8C78",
    darkColor: "#56B394",
  },
  {
    id: "dhikr",
    label: "Dhikr",
    icon: "tasbeeh",
    color: "#3E8C78",
    darkColor: "#56B394",
  },
  {
    id: "charity",
    label: "Charity",
    icon: "charity",
    color: "#B0904B",
    darkColor: "#CFAE69",
  },
  {
    id: "learning",
    label: "Learning",
    icon: "arabic-learning",
    color: "#3E8C78",
    darkColor: "#56B394",
  },
  {
    id: "reflection",
    label: "Reflection",
    icon: "reflection",
    color: "#3E8C78",
    darkColor: "#56B394",
  },
];

export interface HabitStreakData {
  [habitId: string]: {
    checkedDays: string[];
    currentStreak: number;
    longestStreak: number;
  };
}

export function getHabitGrowthStage(streak: number): {
  key: string;
  label: string;
  minDays: number;
} {
  if (streak >= 30) return { key: "radiant", label: "Radiant", minDays: 30 };
  if (streak >= 14) return { key: "tree", label: "Tree", minDays: 14 };
  if (streak >= 7) return { key: "plant", label: "Plant", minDays: 7 };
  if (streak >= 1) return { key: "sprout", label: "Sprout", minDays: 1 };
  return { key: "seed", label: "Seed", minDays: 0 };
}

export function getHabitGrowthIcon(streak: number): AppIconName {
  if (streak >= 30) return "sun";
  if (streak >= 14) return "streak-garden";
  if (streak >= 7) return "trending-up";
  if (streak >= 1) return "progress";
  return "circle";
}

export function getHabitProgressPercent(streak: number): number {
  if (streak >= 30) return 100;
  if (streak >= 14) return Math.min(((streak - 14) / 16) * 100, 99);
  if (streak >= 7) return Math.min(((streak - 7) / 7) * 100, 99);
  if (streak >= 1) return Math.min(((streak - 1) / 6) * 100, 99);
  return 0;
}

export function calculateHabitStreak(checkedDays: string[]): {
  current: number;
  longest: number;
} {
  if (checkedDays.length === 0) return { current: 0, longest: 0 };

  const sorted = [...checkedDays].sort();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let longest = 0;
  let tempStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      tempStreak++;
    } else {
      longest = Math.max(longest, tempStreak);
      tempStreak = 1;
    }
  }
  longest = Math.max(longest, tempStreak);

  let current = 0;
  const lastDay = sorted[sorted.length - 1];
  if (lastDay === today || lastDay === yesterdayStr) {
    let streak = 1;
    for (let i = sorted.length - 2; i >= 0; i--) {
      const prev = new Date(sorted[i]);
      const curr = new Date(sorted[i + 1]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
    current = streak;
  }

  return { current, longest };
}

const WEEKLY_REFLECTIONS_POOL = [
  "Small, consistent deeds are easier to protect and grow.",
  "Every act of worship you maintain is a seed planted for the Hereafter.",
  "Consistency in good deeds is a sign of sincerity in faith.",
  "Small daily acts of worship can be more sustainable than occasional large ones.",
  "Your habits shape your character, and your character shapes your destiny.",
  "Take on worship habits at a pace you can maintain with sincerity.",
  "A moment of dhikr each day is worth more than hours of neglect.",
  "Building spiritual habits is like tending a garden -- patience and persistence yield beautiful growth.",
  "Regular Quran reading builds familiarity, reflection, and love for Allah's words.",
  "Charity trains the heart in trust, gratitude, and generosity.",
  "Knowledge gained today becomes the light that guides you tomorrow.",
  "Each salah protected on time strengthens your daily foundation.",
  "Reflection is the lamp of the heart. Without it, the heart has no light.",
  "Your spiritual journey is unique. Compare yourself only to who you were yesterday.",
];

export function getWeeklyReflection(
  weekNumber: number,
  weekChecked: number,
  totalStreak: number,
): string {
  if (weekChecked === 0)
    return "A new week awaits. Set your intention and begin with bismillah.";
  if (weekChecked === 7)
    return "A perfect week of consistency. MashaAllah, may Allah accept your efforts.";

  const index =
    (weekNumber * 7 + totalStreak + weekChecked) %
    WEEKLY_REFLECTIONS_POOL.length;
  return WEEKLY_REFLECTIONS_POOL[index];
}

export function getDeepReflectionPrompt(
  habits: HabitStreakData,
  weekChecked: number,
  options: {
    protectedPauseActive?: boolean;
    protectedPauseReason?: string;
    protectedDaysThisWeek?: number;
  } = {},
): string {
  const habitSummary = HABIT_CATEGORIES.map((cat) => {
    const data = habits[cat.id];
    const streak = data?.currentStreak ?? 0;
    return `${cat.label}: ${streak} day streak`;
  }).join(", ");
  const pauseContext = options.protectedPauseActive
    ? ` A mercy-based protected pause is active for ${options.protectedPauseReason || "a valid worship exemption"}; protected days this week: ${options.protectedDaysThisWeek ?? 0}. Do not imply laziness or broken worship.`
    : "";

  return `Provide a personalized Islamic weekly reflection for someone with these habit streaks: ${habitSummary}. They checked in ${weekChecked}/7 days this week.${pauseContext} Give gentle, encouraging advice grounded only in verified source cards when citing Quran or Sunnah. Keep it under 3 sentences and finish with one practical next action.`;
}
