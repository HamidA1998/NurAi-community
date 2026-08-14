import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadProfileV3 } from "@/services/nuraiProfileV3";
import { getDailyLibraryStudy } from "@/services/libraryService";
import { getAllBookProgress } from "@/services/libraryProgressService";
import { getQuranReflectionCircleSummary } from "@/services/quranReflectionCircleService";

const DAILY_PLAN_TASKS_KEY = "daily_plan_tasks";
const DAILY_PLAN_COMPLETED_KEY = "daily_plan_completed";
const DAILY_PLAN_STREAK_KEY = "daily_plan_streak";
export const CUSTOM_DAILY_GOALS_KEY = "nurai_custom_daily_goals_v1";

export type DailyJourneyCategory =
  | "quran"
  | "prayer"
  | "arabic"
  | "dhikr"
  | "charity"
  | "learning"
  | "library"
  | "streak"
  | "reflection"
  | "revert";

export type CustomDailyGoalCategory =
  | "prayer"
  | "quran"
  | "arabic"
  | "charity"
  | "learning"
  | "reflection";

export type CustomDailyGoalPreference = {
  id: string;
  category: CustomDailyGoalCategory;
  label: string;
  targetPerWeek?: number;
  enabled: boolean;
  createdAt: string;
};

export type DailyJourneyAction = {
  id: string;
  title: string;
  subtitle: string;
  reason: string;
  icon: string;
  screen: string;
  params?: Record<string, unknown>;
  category: DailyJourneyCategory;
  completed?: boolean;
  priority: number;
  rewardLabel?: string;
};

export type DailyJourneyProgressSegment = {
  id: DailyJourneyCategory;
  label: string;
  completed: number;
  total: number;
  percent: number;
};

export type DailyDeenJourneyState = {
  date: string;
  title: string;
  insight: string;
  completionPercent: number;
  completedCount: number;
  totalCount: number;
  streak: number;
  primaryAction: DailyJourneyAction;
  actions: DailyJourneyAction[];
  progressSegments: DailyJourneyProgressSegment[];
};

type DailyPlanTaskSnapshot = {
  taskId: string;
  text: string;
  icon?: string;
};

type BuildInput = {
  dailyTasks?: DailyPlanTaskSnapshot[];
  completedTasks?: Record<string, boolean>;
  readingProgress?: {
    surah?: number;
    surahName?: string;
    verse?: number;
    totalVersesRead?: number;
  } | null;
  currentPrayer?: string;
  minutesToNextPrayer?: number | null;
};

export const DEFAULT_CUSTOM_DAILY_GOALS: CustomDailyGoalPreference[] = [
  {
    id: "custom:prayer",
    category: "prayer",
    label: "Protect salah focus",
    targetPerWeek: 7,
    enabled: true,
    createdAt: "system",
  },
  {
    id: "custom:quran",
    category: "quran",
    label: "Read or listen to Quran",
    targetPerWeek: 5,
    enabled: true,
    createdAt: "system",
  },
  {
    id: "custom:arabic",
    category: "arabic",
    label: "Learn one Arabic step",
    targetPerWeek: 4,
    enabled: true,
    createdAt: "system",
  },
  {
    id: "custom:charity",
    category: "charity",
    label: "Give or plan sadaqah",
    targetPerWeek: 2,
    enabled: true,
    createdAt: "system",
  },
  {
    id: "custom:learning",
    category: "learning",
    label: "Study one lesson",
    targetPerWeek: 4,
    enabled: true,
    createdAt: "system",
  },
  {
    id: "custom:reflection",
    category: "reflection",
    label: "Reflect with intention",
    targetPerWeek: 3,
    enabled: true,
    createdAt: "system",
  },
];

const CUSTOM_GOAL_META: Record<
  CustomDailyGoalCategory,
  {
    title: string;
    subtitle: string;
    icon: string;
    screen: string;
    journeyCategory: DailyJourneyCategory;
  }
> = {
  prayer: {
    title: "Protect salah focus",
    subtitle: "Open prayer times and prepare before the next salah.",
    icon: "clock",
    screen: "PrayerTimes",
    journeyCategory: "prayer",
  },
  quran: {
    title: "Read or listen to Quran",
    subtitle: "A small ayah with attention keeps the connection alive.",
    icon: "book-open",
    screen: "Quran",
    journeyCategory: "quran",
  },
  arabic: {
    title: "Learn one Arabic step",
    subtitle: "Review a word, dialogue, or Quran phrase.",
    icon: "type",
    screen: "ArabicLearning",
    journeyCategory: "arabic",
  },
  charity: {
    title: "Give or plan sadaqah",
    subtitle: "Record one act or set today’s giving intention.",
    icon: "heart",
    screen: "IslamicFinance",
    journeyCategory: "charity",
  },
  learning: {
    title: "Study one lesson",
    subtitle: "Continue a book, hadith, or guided learning path.",
    icon: "book",
    screen: "LibraryHome",
    journeyCategory: "learning",
  },
  reflection: {
    title: "Reflect with intention",
    subtitle: "Open a source-aware reflection path.",
    icon: "search",
    screen: "GlobalSearch",
    journeyCategory: "reflection",
  },
};

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeInterest(raw: string): string {
  return raw.toLowerCase().replace(/[_-]/g, " ").trim();
}

async function loadDailyPlanFallback(): Promise<
  Pick<BuildInput, "dailyTasks" | "completedTasks">
> {
  try {
    const [tasksRaw, completedRaw] = await Promise.all([
      AsyncStorage.getItem(DAILY_PLAN_TASKS_KEY),
      AsyncStorage.getItem(DAILY_PLAN_COMPLETED_KEY),
    ]);
    const dailyTasks = tasksRaw ? JSON.parse(tasksRaw) : [];
    const parsedCompleted = completedRaw ? JSON.parse(completedRaw) : null;
    const completedTasks =
      parsedCompleted?.date === todayKey()
        ? parsedCompleted.completed || {}
        : {};
    return {
      dailyTasks: Array.isArray(dailyTasks) ? dailyTasks : [],
      completedTasks,
    };
  } catch {
    return { dailyTasks: [], completedTasks: {} };
  }
}

async function loadDailyPlanStreak(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_PLAN_STREAK_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return typeof parsed?.streak === "number" ? parsed.streak : 0;
  } catch {
    return 0;
  }
}

async function loadOnboardingInterests(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem("onboarding_preferences");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const interests =
      parsed?.interests || parsed?.goals || parsed?.selectedInterests || [];
    return Array.isArray(interests)
      ? interests.map((item) => normalizeInterest(String(item)))
      : [];
  } catch {
    return [];
  }
}

function normalizeCustomGoal(
  value: Partial<CustomDailyGoalPreference> | null | undefined,
  fallback: CustomDailyGoalPreference,
): CustomDailyGoalPreference {
  const category = value?.category || fallback.category;
  return {
    id: typeof value?.id === "string" ? value.id : fallback.id,
    category,
    label:
      typeof value?.label === "string" && value.label.trim()
        ? value.label.trim().slice(0, 44)
        : fallback.label,
    targetPerWeek:
      typeof value?.targetPerWeek === "number" &&
      Number.isFinite(value.targetPerWeek)
        ? Math.max(1, Math.min(7, Math.round(value.targetPerWeek)))
        : fallback.targetPerWeek,
    enabled:
      typeof value?.enabled === "boolean" ? value.enabled : fallback.enabled,
    createdAt:
      typeof value?.createdAt === "string"
        ? value.createdAt
        : fallback.createdAt,
  };
}

export async function loadCustomDailyGoalPreferences(): Promise<
  CustomDailyGoalPreference[]
> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_DAILY_GOALS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const saved = Array.isArray(parsed) ? parsed : [];
    return DEFAULT_CUSTOM_DAILY_GOALS.map((fallback) => {
      const match = saved.find(
        (candidate) =>
          candidate?.id === fallback.id ||
          candidate?.category === fallback.category,
      );
      return normalizeCustomGoal(match, fallback);
    });
  } catch {
    return DEFAULT_CUSTOM_DAILY_GOALS;
  }
}

export async function saveCustomDailyGoalPreferences(
  goals: CustomDailyGoalPreference[],
): Promise<void> {
  const now = new Date().toISOString();
  const normalized = DEFAULT_CUSTOM_DAILY_GOALS.map((fallback) => {
    const match = goals.find(
      (candidate) =>
        candidate.id === fallback.id ||
        candidate.category === fallback.category,
    );
    return normalizeCustomGoal(
      match ? { ...match, createdAt: match.createdAt || now } : null,
      fallback,
    );
  });
  await AsyncStorage.setItem(
    CUSTOM_DAILY_GOALS_KEY,
    JSON.stringify(normalized),
  );
}

async function loadSadaqahStats(): Promise<{
  count: number;
  monthlyTotal: number;
}> {
  try {
    const raw = await AsyncStorage.getItem("sadaqah_log");
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return { count: 0, monthlyTotal: 0 };
    const now = new Date();
    const monthlyTotal = parsed.reduce((sum, entry) => {
      const date = new Date(entry?.date || 0);
      if (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      ) {
        return sum + (Number(entry?.amount) || 0);
      }
      return sum;
    }, 0);
    return { count: parsed.length, monthlyTotal };
  } catch {
    return { count: 0, monthlyTotal: 0 };
  }
}

function actionFromTask(
  task: DailyPlanTaskSnapshot,
  completedCount: number,
): DailyJourneyAction {
  const title =
    task.text.length > 36 ? `${task.text.slice(0, 34)}...` : task.text;
  const lower = task.text.toLowerCase();
  const isQuran = lower.includes("quran");
  const isPrayer =
    lower.includes("pray") || lower.includes("salah") || lower.includes("fajr");
  const isDhikr =
    lower.includes("dhikr") ||
    lower.includes("adhkar") ||
    lower.includes("istighfar");
  return {
    id: `task:${task.taskId}`,
    title,
    subtitle:
      completedCount === 0
        ? "Start your daily deen journey here."
        : "One more sincere step for today.",
    reason: "From your Daily Plan",
    icon:
      task.icon ||
      (isQuran
        ? "book-open"
        : isPrayer
          ? "clock"
          : isDhikr
            ? "repeat"
            : "target"),
    screen: isQuran
      ? "Quran"
      : isPrayer
        ? "PrayerTimes"
        : isDhikr
          ? "Tasbeeh"
          : "StreakGarden",
    category: isQuran
      ? "quran"
      : isPrayer
        ? "prayer"
        : isDhikr
          ? "dhikr"
          : "streak",
    priority: completedCount === 0 ? 95 : 75,
    rewardLabel: "+ daily progress",
  };
}

function inferTaskCategory(text: string): DailyJourneyCategory {
  const lower = text.toLowerCase();
  if (lower.includes("quran") || lower.includes("surah")) return "quran";
  if (
    lower.includes("pray") ||
    lower.includes("salah") ||
    lower.includes("fajr")
  ) {
    return "prayer";
  }
  if (
    lower.includes("dhikr") ||
    lower.includes("adhkar") ||
    lower.includes("tasbeeh")
  ) {
    return "dhikr";
  }
  if (lower.includes("book") || lower.includes("lesson")) return "library";
  if (lower.includes("reflect") || lower.includes("journal")) {
    return "reflection";
  }
  return "streak";
}

function buildProgressSegments(
  tasks: DailyPlanTaskSnapshot[],
  completed: Record<string, boolean>,
): DailyJourneyProgressSegment[] {
  const labels: Record<DailyJourneyCategory, string> = {
    quran: "Quran",
    prayer: "Prayer",
    arabic: "Arabic",
    dhikr: "Dhikr",
    charity: "Charity",
    learning: "Learning",
    library: "Books",
    streak: "Habits",
    reflection: "Reflect",
    revert: "New Muslim",
  };
  const buckets = new Map<
    DailyJourneyCategory,
    { completed: number; total: number }
  >();

  for (const task of tasks) {
    const category = inferTaskCategory(task.text);
    const current = buckets.get(category) || { completed: 0, total: 0 };
    current.total += 1;
    if (completed[task.taskId]) current.completed += 1;
    buckets.set(category, current);
  }

  return Array.from(buckets.entries())
    .map(([id, value]) => ({
      id,
      label: labels[id],
      completed: value.completed,
      total: value.total,
      percent:
        value.total > 0 ? Math.round((value.completed / value.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total || b.percent - a.percent)
    .slice(0, 4);
}

function buildInterestActions(interests: string[]): DailyJourneyAction[] {
  const actions: DailyJourneyAction[] = [];
  if (interests.some((i) => i.includes("quran") || i.includes("understand"))) {
    actions.push({
      id: "interest:quran",
      title: "Continue with Quran",
      subtitle: "Read, listen, or reflect for a few minutes.",
      reason: "Based on your onboarding goal",
      icon: "book-open",
      screen: "Quran",
      category: "quran",
      priority: 70,
      rewardLabel: "+ Quran growth",
    });
  }
  if (interests.some((i) => i.includes("arabic") || i.includes("language"))) {
    actions.push({
      id: "interest:arabic",
      title: "Learn one Quran word",
      subtitle: "A tiny Arabic step compounds fast.",
      reason: "Matched to your learning goal",
      icon: "type",
      screen: "ArabicLearning",
      category: "learning",
      priority: 62,
      rewardLabel: "+ XP",
    });
  }
  if (interests.some((i) => i.includes("memor") || i.includes("hifz"))) {
    actions.push({
      id: "interest:hifz",
      title: "Review your hifz",
      subtitle: "Protect what you have already memorised.",
      reason: "Matched to your memorisation goal",
      icon: "layers",
      screen: "Hifz",
      category: "quran",
      priority: 64,
      rewardLabel: "+ review",
    });
  }
  if (interests.some((i) => i.includes("discipline") || i.includes("habit"))) {
    actions.push({
      id: "interest:discipline",
      title: "Check your streak garden",
      subtitle: "Keep today’s seed alive.",
      reason: "Matched to your discipline goal",
      icon: "trending-up",
      screen: "StreakGarden",
      category: "streak",
      priority: 60,
      rewardLabel: "+ streak",
    });
  }
  return actions;
}

function buildCustomGoalActions(
  goals: CustomDailyGoalPreference[],
  context: {
    completedCount: number;
    completionPercent: number;
    minutesToNextPrayer?: number | null;
    hasReadingProgress: boolean;
    sadaqahCount: number;
    sadaqahMonthlyTotal: number;
  },
): DailyJourneyAction[] {
  return goals
    .filter((goal) => goal.enabled)
    .map((goal) => {
      const meta = CUSTOM_GOAL_META[goal.category];
      let priority = 52;
      if (
        goal.category === "prayer" &&
        (context.minutesToNextPrayer ?? 999) <= 45
      ) {
        priority = 84;
      } else if (goal.category === "quran" && context.hasReadingProgress) {
        priority = 74;
      } else if (goal.category === "charity" && context.sadaqahCount === 0) {
        priority = 66;
      } else if (
        goal.category === "reflection" &&
        context.completionPercent >= 50
      ) {
        priority = 64;
      } else if (context.completedCount === 0) {
        priority = 58;
      }

      const targetCopy = goal.targetPerWeek
        ? `Goal: ${goal.targetPerWeek}x weekly.`
        : "Chosen in your goals.";
      const charityCopy =
        goal.category === "charity" && context.sadaqahMonthlyTotal > 0
          ? ` ${context.sadaqahMonthlyTotal.toFixed(0)} logged this month.`
          : "";

      return {
        id: goal.id,
        title: goal.label || meta.title,
        subtitle: `${meta.subtitle} ${targetCopy}${charityCopy}`,
        reason: "Chosen in your goals",
        icon: meta.icon,
        screen: meta.screen,
        category: meta.journeyCategory,
        priority,
        rewardLabel:
          goal.category === "charity"
            ? "+ sadaqah"
            : goal.category === "arabic"
              ? "+ Arabic"
              : "+ intention",
      };
    });
}

export async function buildDailyDeenJourney(
  input: BuildInput = {},
): Promise<DailyDeenJourneyState> {
  const fallback =
    input.dailyTasks && input.completedTasks
      ? {}
      : await loadDailyPlanFallback();
  const dailyTasks = input.dailyTasks || fallback.dailyTasks || [];
  const completedTasks = input.completedTasks || fallback.completedTasks || {};
  const completedCount = dailyTasks.filter(
    (task) => completedTasks[task.taskId],
  ).length;
  const totalCount = dailyTasks.length;
  const completionPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const [
    profile,
    interests,
    streak,
    libraryProgress,
    customGoals,
    sadaqahStats,
    quranReflectionSummary,
  ] = await Promise.all([
    loadProfileV3(),
    loadOnboardingInterests(),
    loadDailyPlanStreak(),
    getAllBookProgress().catch(() => ({})),
    loadCustomDailyGoalPreferences(),
    loadSadaqahStats(),
    getQuranReflectionCircleSummary().catch(() => null),
  ]);

  const actions: DailyJourneyAction[] = [];
  const nextTask = dailyTasks.find((task) => !completedTasks[task.taskId]);
  if (nextTask) actions.push(actionFromTask(nextTask, completedCount));

  if (input.readingProgress?.surahName) {
    actions.push({
      id: "continue:quran",
      title: `Continue ${input.readingProgress.surahName}`,
      subtitle: input.readingProgress.verse
        ? `Pick up from ayah ${input.readingProgress.verse}.`
        : "Keep your Quran rhythm alive.",
      reason: "You recently read here",
      icon: "book-open",
      screen: "QuranReader",
      params: {
        surahNumber: input.readingProgress.surah || 1,
        initialVerse: input.readingProgress.verse || 1,
      },
      category: "quran",
      priority: nextTask ? 68 : 88,
      rewardLabel: "+ Quran streak",
    });
  }

  if (input.currentPrayer) {
    const minutes = input.minutesToNextPrayer;
    actions.push({
      id: "prayer:next",
      title: `${input.currentPrayer} is next`,
      subtitle:
        typeof minutes === "number" && minutes > 0
          ? `${minutes} minutes left. Prepare calmly.`
          : "Open prayer times and reset your day.",
      reason: "Based on current prayer time",
      icon: "clock",
      screen: "PrayerTimes",
      category: "prayer",
      priority: typeof minutes === "number" && minutes <= 45 ? 86 : 58,
      rewardLabel: "+ salah focus",
    });
  }

  actions.push(...buildInterestActions(interests));
  actions.push(
    ...buildCustomGoalActions(customGoals, {
      completedCount,
      completionPercent,
      minutesToNextPrayer: input.minutesToNextPrayer,
      hasReadingProgress: Boolean(input.readingProgress?.surahName),
      sadaqahCount: sadaqahStats.count,
      sadaqahMonthlyTotal: sadaqahStats.monthlyTotal,
    }),
  );

  if (quranReflectionSummary?.pendingReviewDrafts) {
    actions.push({
      id: "quran-circle:review-pending",
      title: "Review Quran reflections",
      subtitle: `${quranReflectionSummary.pendingReviewDrafts} circle-visible reflection${quranReflectionSummary.pendingReviewDrafts === 1 ? "" : "s"} need review before sharing.`,
      reason: "Quran reflection circle safety",
      icon: "shield",
      screen: "FamilyGroup",
      category: "reflection",
      priority: 81,
      rewardLabel: "+ safe sharing",
    });
  } else if (quranReflectionSummary?.open) {
    actions.push({
      id: "quran-circle:add-reflection",
      title: "Add an ayah reflection",
      subtitle:
        "Keep it private or circle-only with Quran references and source boundaries.",
      reason: "Open Quran reflection circle",
      icon: "users",
      screen: "FamilyGroup",
      category: "reflection",
      priority: 61,
      rewardLabel: "+ reflection",
    });
  }

  const dailyLibraryStudy = getDailyLibraryStudy(libraryProgress);
  actions.push({
    id: `library:${dailyLibraryStudy.book.id}`,
    title:
      dailyLibraryStudy.progressPercentage > 0
        ? `Continue ${dailyLibraryStudy.book.title}`
        : `Study ${dailyLibraryStudy.book.title}`,
    subtitle: dailyLibraryStudy.nextChapterTitle
      ? dailyLibraryStudy.nextChapterTitle
      : dailyLibraryStudy.book.subtitle,
    reason: dailyLibraryStudy.reason,
    icon: "book-open",
    screen: "BookDetail",
    params: { bookId: dailyLibraryStudy.book.id },
    category: "library",
    priority: dailyLibraryStudy.progressPercentage > 0 ? 78 : 56,
    rewardLabel: "+ knowledge",
  });

  if (profile.isRevert) {
    actions.push({
      id: "revert:next-step",
      title: "Take one revert step",
      subtitle: "A gentle next step for where you are today.",
      reason: "New Muslim mode is enabled",
      icon: "heart",
      screen: "NewMuslim",
      category: "revert",
      priority: 66,
      rewardLabel: "+ clarity",
    });
  }

  if ((profile.dhikrData?.totalCount || 0) === 0 || completionPercent >= 50) {
    actions.push({
      id: "dhikr:short-session",
      title: "Do a short dhikr session",
      subtitle: "Even one minute can soften the heart.",
      reason:
        completionPercent >= 50
          ? "A calm next step after progress"
          : "A simple first worship step",
      icon: "repeat",
      screen: "Tasbeeh",
      category: "dhikr",
      priority: completionPercent >= 50 ? 63 : 54,
      rewardLabel: "+ hasanat",
    });
  }

  actions.push({
    id: "reflection:search-focus",
    title: "Find a reflection focus",
    subtitle: "Search Quran, books, or a study path for today.",
    reason: "Personalised from your app activity",
    icon: "search",
    screen: "GlobalSearch",
    category: "reflection",
    priority: completionPercent === 100 ? 82 : 46,
    rewardLabel: "+ reflection",
  });

  const sortedActions = actions
    .filter(
      (action, index, arr) =>
        arr.findIndex((candidate) => candidate.id === action.id) === index,
    )
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);

  const primaryAction = sortedActions[0] || {
    id: "fallback:quran",
    title: "Read one ayah",
    subtitle: "Begin with a small step. Allah sees consistency.",
    reason: "Best first action",
    icon: "book-open",
    screen: "Quran",
    category: "quran",
    priority: 1,
    rewardLabel: "+ progress",
  };

  const title =
    completionPercent === 100
      ? "Today is complete"
      : completedCount > 0
        ? "Keep your momentum"
        : "Start today gently";
  const insight =
    completionPercent === 100
      ? "Alhamdulillah, your core plan is complete. Use the rest of today for reflection or extra Quran."
      : completedCount > 0
        ? `${completedCount} of ${totalCount || "your"} daily actions complete. The next step is already clear.`
        : "One sincere action is enough to begin the day. NurAI will guide the next step after that.";

  return {
    date: todayKey(),
    title,
    insight,
    completionPercent,
    completedCount,
    totalCount,
    streak,
    primaryAction,
    actions: sortedActions,
    progressSegments: buildProgressSegments(dailyTasks, completedTasks),
  };
}
