import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  NurAIUserProfile,
  buildProfileFromExistingData,
  logAppOpen,
  logFeatureUse,
} from "@/services/nuraiProfile";
import { initNurAIV3, NurAIV3State } from "@/services/nuraiEngineV3";
import { useNurAIV3 } from "@/hooks/useNurAIV3";
import {
  NurAINudge,
  getHomeInsight,
  getQuranRecommendation,
  getVerseContext,
  getSmartGreeting,
  getStreakMessage,
  resetSession,
  initializeEngine,
  QuranVerseContext,
  QuranRecommendation,
  TasbeehInsight,
  getTasbeehInsight,
  PrayerInsight,
  getPrayerInsights,
  getDuaRecommendation,
  HasanatInsight,
  getHasanatInsight,
  DailyPlanSuggestion,
  getDailyPlanSuggestions,
  WeeklyReflection,
  getWeeklyReflection,
  ActivityPattern,
  analyzeActivityPatterns,
  getPatternNudge,
  NameReflection,
  getDailyNameReflection,
  CalendarInsight,
  getCalendarInsight,
  RamadanInsight,
  getRamadanInsight,
  HajjStepInsight,
  getHajjStepInsight,
  FinanceInsight,
  getFinanceInsight,
  AchievementNudge,
  getAchievementNudge,
  ShareSuggestion,
  getShareSuggestion,
} from "@/services/nuraiEngine";

interface NurAIContextType {
  profile: NurAIUserProfile | null;
  isReady: boolean;
  currentNudge: NurAINudge | null;
  dismissNudge: () => void;
  refreshInsight: () => void;
  getVerseInsight: (surah: number, verse: number) => QuranVerseContext | null;
  getRecommendation: () => QuranRecommendation;
  getGreeting: (name?: string) => { greeting: string; subtitle: string };
  getStreak: () => { message: string; gardenState: string };
  trackFeature: (feature: string) => void;
  refreshProfile: () => Promise<void>;
  getTasbeehInsightFn: (count: number) => TasbeehInsight | null;
  getPrayerInsightsFn: () => PrayerInsight[];
  getDuaRecommendationFn: () => {
    categoryName: string;
    reason: string;
    icon: string;
  };
  getHasanatInsightFn: (
    totalPoints: number,
    prayersDone: number,
    isFasting: boolean,
  ) => HasanatInsight;
  getDailyPlanSuggestionsFn: () => DailyPlanSuggestion[];
  getWeeklyReflectionFn: (weeklyHasanat: number[]) => WeeklyReflection;
  activityPattern: ActivityPattern | null;
  getDailyNameReflectionFn: () => NameReflection;
  getCalendarInsightFn: (
    hijriMonth: number,
    hijriDay: number,
    upcomingEventName?: string,
  ) => CalendarInsight;
  getRamadanInsightFn: (
    tarawihCompleted: number,
    charityTotal: number,
    isBeforeIftar: boolean,
  ) => RamadanInsight;
  getHajjStepInsightFn: (stepId: number) => HajjStepInsight | null;
  getFinanceInsightFn: (
    sadaqahCount: number,
    sadaqahTotal: number,
    hasDebts: boolean,
  ) => FinanceInsight;
  getAchievementNudgeFn: (
    badges: {
      id: string;
      name: string;
      target: number;
      icon: string;
      category: string;
    }[],
    progress: Record<string, { current: number; unlocked: boolean }>,
  ) => AchievementNudge | null;
  getShareSuggestionFn: () => ShareSuggestion;
  v3State: NurAIV3State | null;
  v3Loading: boolean;
  v3Refresh: () => Promise<void>;
  v3RespondToNudge: (nudgeId: string, responded: boolean) => Promise<void>;
  v3AdjustHijri: (days: number) => Promise<void>;
  v3HijriAdjustment: number;
}

const NurAIContext = createContext<NurAIContextType>({
  profile: null,
  isReady: false,
  currentNudge: null,
  dismissNudge: () => {},
  refreshInsight: () => {},
  getVerseInsight: () => null,
  getRecommendation: () => ({
    type: "gentle_restart",
    surah: 1,
    surahName: "Al-Fatiha",
    reason: "Begin with the Opening",
  }),
  getGreeting: () => ({ greeting: "As-salamu alaykum", subtitle: "" }),
  getStreak: () => ({ message: "", gardenState: "empty" }),
  trackFeature: () => {},
  refreshProfile: async () => {},
  getTasbeehInsightFn: () => null,
  getPrayerInsightsFn: () => [],
  getDuaRecommendationFn: () => ({
    categoryName: "Prayer",
    reason: "",
    icon: "moon",
  }),
  getHasanatInsightFn: () => ({
    title: "",
    body: "",
    icon: "heart",
    type: "tip",
  }),
  getDailyPlanSuggestionsFn: () => [],
  getWeeklyReflectionFn: () => ({
    title: "",
    body: "",
    stats: [],
    encouragement: "",
  }),
  activityPattern: null,
  getDailyNameReflectionFn: () => ({
    nameIndex: 0,
    title: "",
    body: "",
    icon: "star",
  }),
  getCalendarInsightFn: () => ({ title: "", body: "", icon: "calendar" }),
  getRamadanInsightFn: () => ({
    title: "",
    body: "",
    icon: "moon",
    type: "fasting",
  }),
  getHajjStepInsightFn: () => null,
  getFinanceInsightFn: () => ({
    title: "",
    body: "",
    icon: "heart",
    type: "general",
  }),
  getAchievementNudgeFn: () => null,
  getShareSuggestionFn: () => ({
    tab: "verses",
    index: 0,
    reason: "",
    icon: "share-2",
  }),
  v3State: null,
  v3Loading: true,
  v3Refresh: async () => {},
  v3RespondToNudge: async () => {},
  v3AdjustHijri: async () => {},
  v3HijriAdjustment: 0,
});

export function useNurAI() {
  return useContext(NurAIContext);
}

export function NurAIProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<NurAIUserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentNudge, setCurrentNudge] = useState<NurAINudge | null>(null);
  const [activityPattern, setActivityPattern] =
    useState<ActivityPattern | null>(null);
  const initialized = useRef(false);

  const {
    state: v3State,
    loading: v3Loading,
    refresh: v3Refresh,
    respondToNudge: v3RespondToNudge,
    adjustHijri: v3AdjustHijri,
    hijriAdjustment: v3HijriAdjustment,
  } = useNurAIV3();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const p = await initializeEngine();
        setProfile(p);
        await logAppOpen();

        const nudge = getHomeInsight(p);
        if (nudge) {
          setCurrentNudge(nudge);
        }

        analyzeActivityPatterns()
          .then((pat) => {
            setActivityPattern(pat);
            if (!nudge) {
              const patNudge = getPatternNudge(pat);
              if (patNudge) setCurrentNudge(patNudge);
            }
          })
          .catch(() => {});

        initNurAIV3()
          .then((s) => {
            console.log(
              "[NurAI V3] Initialized:",
              s.engineVersion,
              "| Nudges:",
              s.nudges.length,
              "| Greeting:",
              s.greeting.substring(0, 30),
            );
          })
          .catch((e) => {
            console.warn("[NurAI V3] Init failed:", e);
          });
      } catch {}
      setIsReady(true);
    })();
  }, []);

  const dismissNudge = useCallback(() => {
    setCurrentNudge(null);
  }, []);

  const refreshInsight = useCallback(() => {
    if (!profile) return;
    resetSession();
    const nudge = getHomeInsight(profile);
    setCurrentNudge(nudge);
  }, [profile]);

  const getVerseInsight = useCallback(
    (surah: number, verse: number): QuranVerseContext | null => {
      return getVerseContext(surah, verse);
    },
    [],
  );

  const getRecommendation = useCallback((): QuranRecommendation => {
    if (!profile) {
      return {
        type: "gentle_restart",
        surah: 1,
        surahName: "Al-Fatiha",
        reason: "Begin with the Opening",
      };
    }
    return getQuranRecommendation(profile);
  }, [profile]);

  const getGreeting = useCallback(
    (name?: string) => {
      if (!profile) {
        return {
          greeting: "As-salamu alaykum",
          subtitle: "Welcome to NurAI",
        };
      }
      return getSmartGreeting(profile, name);
    },
    [profile],
  );

  const getStreak = useCallback(() => {
    if (!profile) {
      return { message: "", gardenState: "empty" };
    }
    return getStreakMessage(profile);
  }, [profile]);

  const trackFeature = useCallback((feature: string) => {
    logFeatureUse(feature).catch(() => {});
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const p = await buildProfileFromExistingData();
      setProfile(p);
    } catch {}
  }, []);

  const getTasbeehInsightFn = useCallback(
    (count: number) => getTasbeehInsight(count),
    [],
  );

  const getPrayerInsightsFn = useCallback(() => getPrayerInsights(), []);

  const getDuaRecommendationFn = useCallback(() => getDuaRecommendation(), []);

  const getHasanatInsightFn = useCallback(
    (totalPoints: number, prayersDone: number, isFasting: boolean) =>
      getHasanatInsight(totalPoints, prayersDone, isFasting),
    [],
  );

  const getDailyPlanSuggestionsFn = useCallback(() => {
    if (!profile) return [];
    return getDailyPlanSuggestions(profile);
  }, [profile]);

  const getWeeklyReflectionFn = useCallback(
    (weeklyHasanat: number[]) => {
      if (!profile) {
        return { title: "", body: "", stats: [], encouragement: "" };
      }
      return getWeeklyReflection(profile, weeklyHasanat);
    },
    [profile],
  );

  const getDailyNameReflectionFn = useCallback(
    () => getDailyNameReflection(),
    [],
  );

  const getCalendarInsightFn = useCallback(
    (hijriMonth: number, hijriDay: number, upcomingEventName?: string) =>
      getCalendarInsight(hijriMonth, hijriDay, upcomingEventName),
    [],
  );

  const getRamadanInsightFn = useCallback(
    (tarawihCompleted: number, charityTotal: number, isBeforeIftar: boolean) =>
      getRamadanInsight(tarawihCompleted, charityTotal, isBeforeIftar),
    [],
  );

  const getHajjStepInsightFn = useCallback(
    (stepId: number) => getHajjStepInsight(stepId),
    [],
  );

  const getFinanceInsightFn = useCallback(
    (sadaqahCount: number, sadaqahTotal: number, hasDebts: boolean) =>
      getFinanceInsight(sadaqahCount, sadaqahTotal, hasDebts),
    [],
  );

  const getAchievementNudgeFn = useCallback(
    (
      badges: {
        id: string;
        name: string;
        target: number;
        icon: string;
        category: string;
      }[],
      progress: Record<string, { current: number; unlocked: boolean }>,
    ) => getAchievementNudge(badges, progress),
    [],
  );

  const getShareSuggestionFn = useCallback(() => getShareSuggestion(), []);

  return (
    <NurAIContext.Provider
      value={{
        profile,
        isReady,
        currentNudge,
        dismissNudge,
        refreshInsight,
        getVerseInsight,
        getRecommendation,
        getGreeting,
        getStreak,
        trackFeature,
        refreshProfile,
        getTasbeehInsightFn,
        getPrayerInsightsFn,
        getDuaRecommendationFn,
        getHasanatInsightFn,
        getDailyPlanSuggestionsFn,
        getWeeklyReflectionFn,
        activityPattern,
        getDailyNameReflectionFn,
        getCalendarInsightFn,
        getRamadanInsightFn,
        getHajjStepInsightFn,
        getFinanceInsightFn,
        getAchievementNudgeFn,
        getShareSuggestionFn,
        v3State,
        v3Loading,
        v3Refresh,
        v3RespondToNudge,
        v3AdjustHijri,
        v3HijriAdjustment,
      }}
    >
      {children}
    </NurAIContext.Provider>
  );
}
