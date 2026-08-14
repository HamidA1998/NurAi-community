import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";

const STORAGE_KEYS = {
  settings: "kids_settings",
  progress: "kids_progress",
  streaks: "kids_streaks",
  badges: "kids_badges",
  storyProgress: "kids_story_progress",
  quizScores: "kids_quiz_scores",
  memorization: "kids_memorization",
};

export type AgeGroup = "3-5" | "6-9" | "10-13" | null;

export interface KidsSettings {
  enabled: boolean;
  ageGroup: AgeGroup;
  childName: string;
  dailyGoalMinutes: number;
  parentPin: string;
}

export interface KidsStreak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  totalDaysActive: number;
}

export interface KidsBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedDate: string;
  category: string;
}

export interface StoryProgress {
  storyId: string;
  completed: boolean;
  quizScore: number | null;
  lastRead: string;
}

export interface QuizScore {
  quizId: string;
  category: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
}

export interface MemorizationProgress {
  itemId: string;
  type: "surah" | "dua";
  status: "not_started" | "learning" | "practicing" | "memorized";
  lastPracticed: string | null;
}

export interface KidsProgress {
  storiesRead: number;
  quizzesCompleted: number;
  gamesPlayed: number;
  surahsMemorized: number;
  duasMemorized: number;
  totalPoints: number;
  todayMinutes: number;
  todayDate: string;
}

const DEFAULT_SETTINGS: KidsSettings = {
  enabled: false,
  ageGroup: null,
  childName: "",
  dailyGoalMinutes: 15,
  parentPin: "",
};

const DEFAULT_STREAK: KidsStreak = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: "",
  totalDaysActive: 0,
};

const DEFAULT_PROGRESS: KidsProgress = {
  storiesRead: 0,
  quizzesCompleted: 0,
  gamesPlayed: 0,
  surahsMemorized: 0,
  duasMemorized: 0,
  totalPoints: 0,
  todayMinutes: 0,
  todayDate: new Date().toISOString().split("T")[0],
};

interface KidsModeContextType {
  settings: KidsSettings;
  updateSettings: (updates: Partial<KidsSettings>) => Promise<void>;
  streak: KidsStreak;
  badges: KidsBadge[];
  progress: KidsProgress;
  storyProgress: StoryProgress[];
  quizScores: QuizScore[];
  memorization: MemorizationProgress[];
  recordActivity: (minutes: number, points: number) => Promise<void>;
  recordGamePlayed: () => Promise<void>;
  markStoryRead: (storyId: string) => Promise<void>;
  saveQuizScore: (
    quizId: string,
    category: string,
    score: number,
    total: number,
  ) => Promise<void>;
  updateMemorization: (
    itemId: string,
    type: "surah" | "dua",
    status: MemorizationProgress["status"],
  ) => Promise<void>;
  awardBadge: (
    id: string,
    title: string,
    description: string,
    icon: string,
    category: string,
  ) => Promise<void>;
  resetAllKidsData: () => Promise<void>;
  isSetup: boolean;
}

const KidsModeContext = createContext<KidsModeContextType | null>(null);

export function KidsModeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<KidsSettings>(DEFAULT_SETTINGS);
  const [streak, setStreak] = useState<KidsStreak>(DEFAULT_STREAK);
  const [badges, setBadges] = useState<KidsBadge[]>([]);
  const [progress, setProgress] = useState<KidsProgress>(DEFAULT_PROGRESS);
  const [storyProgress, setStoryProgress] = useState<StoryProgress[]>([]);
  const [quizScores, setQuizScores] = useState<QuizScore[]>([]);
  const [memorization, setMemorization] = useState<MemorizationProgress[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [sRaw, pRaw, stRaw, bRaw, spRaw, qsRaw, mRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.settings),
        AsyncStorage.getItem(STORAGE_KEYS.progress),
        AsyncStorage.getItem(STORAGE_KEYS.streaks),
        AsyncStorage.getItem(STORAGE_KEYS.badges),
        AsyncStorage.getItem(STORAGE_KEYS.storyProgress),
        AsyncStorage.getItem(STORAGE_KEYS.quizScores),
        AsyncStorage.getItem(STORAGE_KEYS.memorization),
      ]);
      if (sRaw) setSettings(JSON.parse(sRaw));
      if (pRaw) {
        const p = JSON.parse(pRaw);
        const today = new Date().toISOString().split("T")[0];
        if (p.todayDate !== today) {
          p.todayMinutes = 0;
          p.todayDate = today;
        }
        setProgress(p);
      }
      if (stRaw) setStreak(JSON.parse(stRaw));
      if (bRaw) setBadges(JSON.parse(bRaw));
      if (spRaw) setStoryProgress(JSON.parse(spRaw));
      if (qsRaw) setQuizScores(JSON.parse(qsRaw));
      if (mRaw) setMemorization(JSON.parse(mRaw));
    } catch {}
    setLoaded(true);
  };

  const persist = async (key: string, value: any) => {
    await syncedSetItem(key, JSON.stringify(value));
  };

  const updateSettings = useCallback(async (updates: Partial<KidsSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      persist(STORAGE_KEYS.settings, next);
      return next;
    });
  }, []);

  const isSetup = settings.enabled && settings.ageGroup !== null;

  const recordActivity = useCallback(
    async (minutes: number, points: number) => {
      const today = new Date().toISOString().split("T")[0];
      setProgress((prev) => {
        const next = {
          ...prev,
          todayMinutes:
            (prev.todayDate === today ? prev.todayMinutes : 0) + minutes,
          todayDate: today,
          totalPoints: prev.totalPoints + points,
        };
        persist(STORAGE_KEYS.progress, next);
        return next;
      });
      setStreak((prev) => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        let newCurrent = prev.currentStreak;
        if (prev.lastActiveDate === today) {
          return prev;
        } else if (
          prev.lastActiveDate === yesterdayStr ||
          prev.lastActiveDate === ""
        ) {
          newCurrent = prev.currentStreak + 1;
        } else {
          newCurrent = 1;
        }
        const next: KidsStreak = {
          currentStreak: newCurrent,
          longestStreak: Math.max(prev.longestStreak, newCurrent),
          lastActiveDate: today,
          totalDaysActive: prev.totalDaysActive + 1,
        };
        persist(STORAGE_KEYS.streaks, next);
        return next;
      });
    },
    [],
  );

  const recordGamePlayed = useCallback(async () => {
    setProgress((prev) => {
      const next = { ...prev, gamesPlayed: prev.gamesPlayed + 1 };
      persist(STORAGE_KEYS.progress, next);
      return next;
    });
  }, []);

  const markStoryRead = useCallback(async (storyId: string) => {
    const today = new Date().toISOString().split("T")[0];
    setStoryProgress((prev) => {
      const existing = prev.find((s) => s.storyId === storyId);
      let next: StoryProgress[];
      if (existing) {
        next = prev.map((s) =>
          s.storyId === storyId
            ? { ...s, completed: true, lastRead: today }
            : s,
        );
      } else {
        next = [
          ...prev,
          { storyId, completed: true, quizScore: null, lastRead: today },
        ];
      }
      persist(STORAGE_KEYS.storyProgress, next);
      return next;
    });
    setProgress((prev) => {
      const next = { ...prev, storiesRead: prev.storiesRead + 1 };
      persist(STORAGE_KEYS.progress, next);
      return next;
    });
  }, []);

  const saveQuizScore = useCallback(
    async (quizId: string, category: string, score: number, total: number) => {
      const entry: QuizScore = {
        quizId,
        category,
        score,
        totalQuestions: total,
        completedAt: new Date().toISOString(),
      };
      setQuizScores((prev) => {
        const next = [entry, ...prev];
        persist(STORAGE_KEYS.quizScores, next);
        return next;
      });
      setProgress((prev) => {
        const next = { ...prev, quizzesCompleted: prev.quizzesCompleted + 1 };
        persist(STORAGE_KEYS.progress, next);
        return next;
      });
    },
    [],
  );

  const updateMemorization = useCallback(
    async (
      itemId: string,
      type: "surah" | "dua",
      status: MemorizationProgress["status"],
    ) => {
      setMemorization((prev) => {
        const existing = prev.find((m) => m.itemId === itemId);
        let next: MemorizationProgress[];
        if (existing) {
          next = prev.map((m) =>
            m.itemId === itemId
              ? {
                  ...m,
                  status,
                  lastPracticed: new Date().toISOString().split("T")[0],
                }
              : m,
          );
        } else {
          next = [
            ...prev,
            {
              itemId,
              type,
              status,
              lastPracticed: new Date().toISOString().split("T")[0],
            },
          ];
        }
        persist(STORAGE_KEYS.memorization, next);
        return next;
      });
      if (status === "memorized") {
        setProgress((prev) => {
          const key = type === "surah" ? "surahsMemorized" : "duasMemorized";
          const next = { ...prev, [key]: prev[key] + 1 };
          persist(STORAGE_KEYS.progress, next);
          return next;
        });
      }
    },
    [],
  );

  const awardBadge = useCallback(
    async (
      id: string,
      title: string,
      description: string,
      icon: string,
      category: string,
    ) => {
      setBadges((prev) => {
        if (prev.some((b) => b.id === id)) return prev;
        const badge: KidsBadge = {
          id,
          title,
          description,
          icon,
          category,
          earnedDate: new Date().toISOString(),
        };
        const next = [...prev, badge];
        persist(STORAGE_KEYS.badges, next);
        return next;
      });
    },
    [],
  );

  const resetAllKidsData = useCallback(async () => {
    await Promise.all(
      Object.values(STORAGE_KEYS).map((k) => AsyncStorage.removeItem(k)),
    );
    setSettings(DEFAULT_SETTINGS);
    setStreak(DEFAULT_STREAK);
    setBadges([]);
    setProgress(DEFAULT_PROGRESS);
    setStoryProgress([]);
    setQuizScores([]);
    setMemorization([]);
  }, []);

  if (!loaded) return null;

  return (
    <KidsModeContext.Provider
      value={{
        settings,
        updateSettings,
        streak,
        badges,
        progress,
        storyProgress,
        quizScores,
        memorization,
        recordActivity,
        recordGamePlayed,
        markStoryRead,
        saveQuizScore,
        updateMemorization,
        awardBadge,
        resetAllKidsData,
        isSetup,
      }}
    >
      {children}
    </KidsModeContext.Provider>
  );
}

export function useKidsMode() {
  const ctx = useContext(KidsModeContext);
  if (!ctx) throw new Error("useKidsMode must be used within KidsModeProvider");
  return ctx;
}
