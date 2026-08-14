import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useContext,
} from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Platform,
  AppState,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import Animated, {
  FadeInDown,
  FadeOut,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Swipeable } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";

import { Coordinates, PrayerTimes, Qibla } from "adhan";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  CategoryColors,
  getThemedCategoryColors,
  Shadows,
} from "@/constants/theme";
import { AuthContext } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { useNurAI } from "@/context/NurAIContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { NurAINudgeCard } from "@/components/NurAINudge";
import {
  GeneratedHomeExperience,
  type HomePulseItem,
  type HomeQuickAccessItem,
  type HomeRecentMediaSession,
} from "@/components/home/GeneratedHomeExperience";
import { LiveWeatherCard } from "@/components/home/LiveWeatherCard";
import {
  NurAINudgeV3Card,
  V3DailyMotivationCard,
} from "@/components/NurAINudgeV3";
import { SectionHeader } from "@/components/SectionHeader";
import { Aurora } from "@/design-system";
import { trackAppUsageTime } from "@/services/achievementsTracker";
import { getQuranStats } from "@/lib/quran-progress";
import {
  buildDailyDeenJourney,
  DEFAULT_CUSTOM_DAILY_GOALS,
  loadCustomDailyGoalPreferences,
  saveCustomDailyGoalPreferences,
  type CustomDailyGoalPreference,
  type DailyDeenJourneyState,
  type DailyJourneyAction,
} from "@/services/dailyDeenJourneyService";
import { updateProfileV3 } from "@/services/nuraiProfileV3";
import {
  requestPersonalAIResponse,
  type PersonalAIRespondResult,
} from "@/services/personalAIService";
import { personalAIUnavailableCopy } from "@/config/personalAIExperience";
import {
  saveNurAIWidgetSnapshot,
  type NurAIWidgetPrayerScheduleEntry,
} from "@/lib/widget-snapshot";
import {
  fetchLiveWeather,
  type LiveWeatherSnapshot,
} from "@/services/weatherService";
import {
  loadMediaResumeSession,
  type MediaResumeSession,
} from "@/services/mediaResumeService";
import {
  loadPersonalHomePlanSummary,
  type PersonalHomePlanSummary,
} from "@/services/personalNurAIPlanService";
import {
  buildQuranDailySessionHandoff,
  type QuranDailySessionHandoff,
} from "@/services/quranLearningService";
import {
  getQuranReflectionCircleSummary,
  type QuranReflectionCircleSummary,
} from "@/services/quranReflectionCircleService";
import { getHijriDate as getSharedHijriDate } from "@/services/nuraiHijriEngine";
import { getCalculationMethod } from "@/lib/prayer-utils";
import Svg, { Circle } from "react-native-svg";
import type {
  NurAIPlanTier,
  PersonalAIGuidanceContract,
} from "@shared/nuraiAI";
import {
  buildHomeAIContext,
  createDefaultHomeAIContextExtras,
  loadHomeAIContextExtras,
  type HomeAIContext,
} from "@/services/homeAIContextService";
import {
  loadHomeAIFeedback,
  recordHomeAIFeedback,
  recordHomeAIGuidanceImpression,
  type HomeAIFeedbackState,
  type HomeAIFeedbackValue,
} from "@/services/homeAIFeedbackService";
import {
  buildHomeGuidanceContextFingerprint,
  buildHomeGuidancePlan,
  buildHomeGuidanceRequestKey,
  selectLiveRelevantV3Nudge,
  type HomeGuidancePlan,
} from "@/services/homeGuidanceRanker";
import { buildPersonalAIHomeSurfaceBundle } from "@/services/personalAIHomeBundle";
import {
  loadPersonalAIContext,
  type PersonalAIContext,
} from "@/services/personalAIContextService";
import {
  buildPersonalIntelligenceBriefing,
  type PersonalIntelligenceBriefing,
} from "@/services/personalIntelligenceBriefingService";
import {
  buildPersonalGuideContextLines,
  buildPersonalGuideWeeklyReview,
} from "@/services/personalGuideReviewService";
import { AppIcon, type AppIconName } from "@/components/icons";

const ENABLE_QA_LOCATION_BYPASS =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_QA_AUTH_BYPASS === "true";

function normalizeDegrees(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function signedAngleDelta(target: number, current: number): number {
  return ((target - current + 540) % 360) - 180;
}

const TASBEEH_DHIKR_LABELS: Record<string, string> = {
  subhanallah: "SubhanAllah",
  alhamdulillah: "Alhamdulillah",
  allahuakbar: "Allahu Akbar",
  lailaha: "La ilaha illallah",
  astaghfirullah: "Astaghfirullah",
  subhanallahi_bihamdihi: "SubhanAllahi wa bihamdihi",
  lahawla: "La hawla wa la quwwata illa billah",
};

function parseWidgetNumber(value: string | null, fallback = 0): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function resolveTasbeehDailyTotal(raw: string | null): number {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
    return parsed?.date === todayStr
      ? parseWidgetNumber(String(parsed.total))
      : 0;
  } catch {
    return 0;
  }
}

const SURAH_ARABIC: Record<number, string> = {
  1: "\u0627\u0644\u0641\u0627\u062a\u062d\u0629",
  2: "\u0627\u0644\u0628\u0642\u0631\u0629",
  3: "\u0622\u0644 \u0639\u0645\u0631\u0627\u0646",
  4: "\u0627\u0644\u0646\u0633\u0627\u0621",
  5: "\u0627\u0644\u0645\u0627\u0626\u062f\u0629",
  6: "\u0627\u0644\u0623\u0646\u0639\u0627\u0645",
  7: "\u0627\u0644\u0623\u0639\u0631\u0627\u0641",
  8: "\u0627\u0644\u0623\u0646\u0641\u0627\u0644",
  9: "\u0627\u0644\u062a\u0648\u0628\u0629",
  10: "\u064a\u0648\u0646\u0633",
  11: "\u0647\u0648\u062f",
  12: "\u064a\u0648\u0633\u0641",
  13: "\u0627\u0644\u0631\u0639\u062f",
  14: "\u0625\u0628\u0631\u0627\u0647\u064a\u0645",
  15: "\u0627\u0644\u062d\u062c\u0631",
  16: "\u0627\u0644\u0646\u062d\u0644",
  17: "\u0627\u0644\u0625\u0633\u0631\u0627\u0621",
  18: "\u0627\u0644\u0643\u0647\u0641",
  19: "\u0645\u0631\u064a\u0645",
  20: "\u0637\u0647",
  21: "\u0627\u0644\u0623\u0646\u0628\u064a\u0627\u0621",
  22: "\u0627\u0644\u062d\u062c",
  23: "\u0627\u0644\u0645\u0624\u0645\u0646\u0648\u0646",
  24: "\u0627\u0644\u0646\u0648\u0631",
  25: "\u0627\u0644\u0641\u0631\u0642\u0627\u0646",
  26: "\u0627\u0644\u0634\u0639\u0631\u0627\u0621",
  27: "\u0627\u0644\u0646\u0645\u0644",
  28: "\u0627\u0644\u0642\u0635\u0635",
  29: "\u0627\u0644\u0639\u0646\u0643\u0628\u0648\u062a",
  30: "\u0627\u0644\u0631\u0648\u0645",
  31: "\u0644\u0642\u0645\u0627\u0646",
  32: "\u0627\u0644\u0633\u062c\u062f\u0629",
  33: "\u0627\u0644\u0623\u062d\u0632\u0627\u0628",
  34: "\u0633\u0628\u0623",
  35: "\u0641\u0627\u0637\u0631",
  36: "\u064a\u0633",
  37: "\u0627\u0644\u0635\u0627\u0641\u0627\u062a",
  38: "\u0635",
  39: "\u0627\u0644\u0632\u0645\u0631",
  40: "\u063a\u0627\u0641\u0631",
  41: "\u0641\u0635\u0644\u062a",
  42: "\u0627\u0644\u0634\u0648\u0631\u0649",
  43: "\u0627\u0644\u0632\u062e\u0631\u0641",
  44: "\u0627\u0644\u062f\u062e\u0627\u0646",
  45: "\u0627\u0644\u062c\u0627\u062b\u064a\u0629",
  46: "\u0627\u0644\u0623\u062d\u0642\u0627\u0641",
  47: "\u0645\u062d\u0645\u062f",
  48: "\u0627\u0644\u0641\u062a\u062d",
  49: "\u0627\u0644\u062d\u062c\u0631\u0627\u062a",
  50: "\u0642",
  51: "\u0627\u0644\u0630\u0627\u0631\u064a\u0627\u062a",
  52: "\u0627\u0644\u0637\u0648\u0631",
  53: "\u0627\u0644\u0646\u062c\u0645",
  54: "\u0627\u0644\u0642\u0645\u0631",
  55: "\u0627\u0644\u0631\u062d\u0645\u0646",
  56: "\u0627\u0644\u0648\u0627\u0642\u0639\u0629",
  57: "\u0627\u0644\u062d\u062f\u064a\u062f",
  58: "\u0627\u0644\u0645\u062c\u0627\u062f\u0644\u0629",
  59: "\u0627\u0644\u062d\u0634\u0631",
  60: "\u0627\u0644\u0645\u0645\u062a\u062d\u0646\u0629",
  61: "\u0627\u0644\u0635\u0641",
  62: "\u0627\u0644\u062c\u0645\u0639\u0629",
  63: "\u0627\u0644\u0645\u0646\u0627\u0641\u0642\u0648\u0646",
  64: "\u0627\u0644\u062a\u063a\u0627\u0628\u0646",
  65: "\u0627\u0644\u0637\u0644\u0627\u0642",
  66: "\u0627\u0644\u062a\u062d\u0631\u064a\u0645",
  67: "\u0627\u0644\u0645\u0644\u0643",
  68: "\u0627\u0644\u0642\u0644\u0645",
  69: "\u0627\u0644\u062d\u0627\u0642\u0629",
  70: "\u0627\u0644\u0645\u0639\u0627\u0631\u062c",
  71: "\u0646\u0648\u062d",
  72: "\u0627\u0644\u062c\u0646",
  73: "\u0627\u0644\u0645\u0632\u0645\u0644",
  74: "\u0627\u0644\u0645\u062f\u062b\u0631",
  75: "\u0627\u0644\u0642\u064a\u0627\u0645\u0629",
  76: "\u0627\u0644\u0625\u0646\u0633\u0627\u0646",
  77: "\u0627\u0644\u0645\u0631\u0633\u0644\u0627\u062a",
  78: "\u0627\u0644\u0646\u0628\u0623",
  79: "\u0627\u0644\u0646\u0627\u0632\u0639\u0627\u062a",
  80: "\u0639\u0628\u0633",
  81: "\u0627\u0644\u062a\u0643\u0648\u064a\u0631",
  82: "\u0627\u0644\u0625\u0646\u0641\u0637\u0627\u0631",
  83: "\u0627\u0644\u0645\u0637\u0641\u0641\u064a\u0646",
  84: "\u0627\u0644\u0625\u0646\u0634\u0642\u0627\u0642",
  85: "\u0627\u0644\u0628\u0631\u0648\u062c",
  86: "\u0627\u0644\u0637\u0627\u0631\u0642",
  87: "\u0627\u0644\u0623\u0639\u0644\u0649",
  88: "\u0627\u0644\u063a\u0627\u0634\u064a\u0629",
  89: "\u0627\u0644\u0641\u062c\u0631",
  90: "\u0627\u0644\u0628\u0644\u062f",
  91: "\u0627\u0644\u0634\u0645\u0633",
  92: "\u0627\u0644\u0644\u064a\u0644",
  93: "\u0627\u0644\u0636\u062d\u0649",
  94: "\u0627\u0644\u0634\u0631\u062d",
  95: "\u0627\u0644\u062a\u064a\u0646",
  96: "\u0627\u0644\u0639\u0644\u0642",
  97: "\u0627\u0644\u0642\u062f\u0631",
  98: "\u0627\u0644\u0628\u064a\u0646\u0629",
  99: "\u0627\u0644\u0632\u0644\u0632\u0644\u0629",
  100: "\u0627\u0644\u0639\u0627\u062f\u064a\u0627\u062a",
  101: "\u0627\u0644\u0642\u0627\u0631\u0639\u0629",
  102: "\u0627\u0644\u062a\u0643\u0627\u062b\u0631",
  103: "\u0627\u0644\u0639\u0635\u0631",
  104: "\u0627\u0644\u0647\u0645\u0632\u0629",
  105: "\u0627\u0644\u0641\u064a\u0644",
  106: "\u0642\u0631\u064a\u0634",
  107: "\u0627\u0644\u0645\u0627\u0639\u0648\u0646",
  108: "\u0627\u0644\u0643\u0648\u062b\u0631",
  109: "\u0627\u0644\u0643\u0627\u0641\u0631\u0648\u0646",
  110: "\u0627\u0644\u0646\u0635\u0631",
  111: "\u0627\u0644\u0645\u0633\u062f",
  112: "\u0627\u0644\u0625\u062e\u0644\u0627\u0635",
  113: "\u0627\u0644\u0641\u0644\u0642",
  114: "\u0627\u0644\u0646\u0627\u0633",
};

function getHijriDate() {
  const gregorian = new Date();
  const jd = Math.floor(gregorian.getTime() / 86400000) + 2440588;
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const lr = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - lr) / 5316) * Math.floor((50 * lr) / 17719) +
    Math.floor(lr / 5670) * Math.floor((43 * lr) / 15238);
  const ld =
    lr -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * ld) / 709);
  const day = ld - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  const months = [
    "Muharram",
    "Safar",
    "Rabi al-Awwal",
    "Rabi al-Thani",
    "Jumada al-Ula",
    "Jumada al-Thani",
    "Rajab",
    "Sha'ban",
    "Ramadan",
    "Shawwal",
    "Dhul Qi'dah",
    "Dhul Hijjah",
  ];
  return `${day} ${months[month - 1]} ${year} AH`;
}

function formatHijriDisplayDay(day: unknown) {
  const numericDay = Number(day);
  if (!Number.isFinite(numericDay)) return String(day ?? "");
  return String(Math.max(1, Math.round(numericDay)));
}

function isNearRamadan(): { isActive: boolean; daysUntil: number } {
  const { month, day } = getSharedHijriDate();
  if (month === 9) return { isActive: true, daysUntil: 0 };
  if (month === 8) {
    const daysLeft = 30 - day;
    if (daysLeft <= 14) return { isActive: true, daysUntil: daysLeft };
  }
  return { isActive: false, daysUntil: 0 };
}

function formatPrayerTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
}

const PRAYER_NAMES: Record<string, string> = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

const WIDGET_PRAYER_KEYS = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
] as const;

function buildWidgetPrayerSchedule({
  calculationMethod,
  countryName,
  latitude,
  longitude,
  now,
}: {
  calculationMethod: string;
  countryName?: string;
  latitude: number;
  longitude: number;
  now: Date;
}): NurAIWidgetPrayerScheduleEntry[] {
  const coords = new Coordinates(latitude, longitude);
  const params = getCalculationMethod(calculationMethod, {
    countryName,
    latitude,
  });
  const days = Array.from({ length: 30 }, (_, dayOffset) => {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    return day;
  });

  return days.flatMap((day) => {
    const times = new PrayerTimes(coords, day, params);
    return WIDGET_PRAYER_KEYS.map((name) => {
      const time = times[name];
      return {
        name,
        displayName: PRAYER_NAMES[name],
        timeISO: time.toISOString(),
        timeLabel: formatPrayerTime(time),
      };
    });
  });
}

const SHOW_LEGACY_HOME_FEED = false;

type CategoryColorKey = keyof typeof CategoryColors;

type QuickTile = {
  icon: AppIconName;
  label: string;
  screen: string;
  color: CategoryColorKey;
};

type FeatureDef = QuickTile & { id: string; category: string };

const ALL_FEATURES: FeatureDef[] = [
  {
    id: "quran",
    icon: "quran",
    label: "Quran",
    screen: "Quran",
    color: "emerald",
    category: "Utilities",
  },
  {
    id: "prayer",
    icon: "prayer",
    label: "Prayer",
    screen: "PrayerTimes",
    color: "emerald",
    category: "Utilities",
  },
  {
    id: "qibla",
    icon: "qibla",
    label: "Qibla",
    screen: "Qibla",
    color: "emerald",
    category: "Utilities",
  },
  {
    id: "duas",
    icon: "dua",
    label: "Duas",
    screen: "Duas",
    color: "emerald",
    category: "Utilities",
  },
  {
    id: "tasbeeh",
    icon: "tasbeeh",
    label: "Tasbeeh",
    screen: "Tasbeeh",
    color: "emerald",
    category: "Utilities",
  },
  {
    id: "calendar",
    icon: "moon-calendar",
    label: "Calendar",
    screen: "IslamicCalendar",
    color: "orange",
    category: "Utilities",
  },
  {
    id: "99names",
    icon: "names-of-allah",
    label: "99 Names",
    screen: "NamesOfAllah",
    color: "purple",
    category: "Utilities",
  },
  {
    id: "zakat",
    icon: "charity",
    label: "Zakat",
    screen: "Zakat",
    color: "green",
    category: "Utilities",
  },
  {
    id: "arabic_learning",
    icon: "arabic-learning",
    label: "Arabic",
    screen: "ArabicLearning",
    color: "blue",
    category: "Learning",
  },
  {
    id: "arabic_games",
    icon: "play-circle",
    label: "Games",
    screen: "ArabicGames",
    color: "blue",
    category: "Learning",
  },
  {
    id: "fiqh",
    icon: "file-text",
    label: "Fiqh Guide",
    screen: "Fiqh",
    color: "blue",
    category: "Learning",
  },
  {
    id: "salah_wudu",
    icon: "prayer",
    label: "Salah Guide",
    screen: "SalahGuide",
    color: "purple",
    category: "Learning",
  },
  {
    id: "hajj",
    icon: "kaaba",
    label: "Hajj Guide",
    screen: "HajjUmrah",
    color: "orange",
    category: "Learning",
  },
  {
    id: "timeline",
    icon: "clock",
    label: "Timeline",
    screen: "Timeline",
    color: "blue",
    category: "Learning",
  },
  {
    id: "tafsir",
    icon: "search",
    label: "Tafsir",
    screen: "Tafsir",
    color: "blue",
    category: "Learning",
  },
  {
    id: "library",
    icon: "book-open",
    label: "Library",
    screen: "LibraryHome",
    color: "amber",
    category: "Content",
  },
  {
    id: "hadith",
    icon: "hadith",
    label: "Hadith",
    screen: "Hadith",
    color: "purple",
    category: "Content",
  },
  {
    id: "prophets",
    icon: "book-open",
    label: "Prophets",
    screen: "Prophets",
    color: "orange",
    category: "Content",
  },
  {
    id: "scholars",
    icon: "scholar",
    label: "Scholars",
    screen: "Scholars",
    color: "blue",
    category: "Content",
  },
  {
    id: "nasheeds",
    icon: "headphones",
    label: "Nasheeds",
    screen: "Nasheeds",
    color: "purple",
    category: "Content",
  },
  {
    id: "inspiration",
    icon: "sun",
    label: "Inspiration",
    screen: "Inspiration",
    color: "purple",
    category: "Content",
  },
  {
    id: "share_cards",
    icon: "share-2",
    label: "Share",
    screen: "ShareableCards",
    color: "amber",
    category: "Content",
  },
  {
    id: "streak",
    icon: "streak-garden",
    label: "Streaks",
    screen: "StreakGarden",
    color: "amber",
    category: "Tracking",
  },
  {
    id: "hasanat",
    icon: "award",
    label: "Hasanat",
    screen: "Hasanat",
    color: "amber",
    category: "Tracking",
  },
  {
    id: "womens_health",
    icon: "women-space",
    label: "Health",
    screen: "WomensHealth",
    color: "pink",
    category: "Tracking",
  },
  {
    id: "muslim_health",
    icon: "health",
    label: "Health+",
    screen: "MuslimHealth",
    color: "green",
    category: "Tracking",
  },
  {
    id: "achievements",
    icon: "achievement",
    label: "Achievements",
    screen: "Achievements",
    color: "amber",
    category: "Tracking",
  },
  {
    id: "challenges",
    icon: "target",
    label: "Challenges",
    screen: "Challenges",
    color: "amber",
    category: "Tracking",
  },
  {
    id: "community",
    icon: "community",
    label: "Community",
    screen: "Community",
    color: "teal",
    category: "Social",
  },
  {
    id: "family",
    icon: "family",
    label: "Family",
    screen: "FamilyGroup",
    color: "teal",
    category: "Social",
  },
  {
    id: "mosques",
    icon: "mosque",
    label: "Mosques",
    screen: "NearbyMosques",
    color: "teal",
    category: "Social",
  },
  {
    id: "kids",
    icon: "smile",
    label: "Kids Mode",
    screen: "KidsMode",
    color: "teal",
    category: "Social",
  },
  {
    id: "finance",
    icon: "islamic-finance",
    label: "Finance",
    screen: "IslamicFinance",
    color: "green",
    category: "Finance",
  },
  {
    id: "ramadan",
    icon: "moon-calendar",
    label: "Ramadan",
    screen: "Ramadan",
    color: "orange",
    category: "Utilities",
  },
];

const FEATURE_MAP = new Map(ALL_FEATURES.map((f) => [f.id, f]));
const FEATURE_CATEGORIES = [
  "Utilities",
  "Learning",
  "Content",
  "Tracking",
  "Social",
  "Finance",
];

const QUICK_ACCESS_SLOT_COUNT = 4;
const DEFAULT_SLOT_IDS = ["quran", "prayer", "qibla", "duas"];
const QUICK_ACCESS_STORAGE_KEY = "quick_access_slots";
const QUICK_ACCESS_RECENTS_KEY = "quick_access_recent_ids";

type QuickAccessLiveContext = {
  nextPrayer: string;
  nextPrayerTime: Date | null;
  minutesToNextPrayer: number | null;
  readingProgress?: {
    surah: number;
    surahName?: string;
    verse: number;
  } | null;
  qiblaDegrees: number;
  qiblaFeedbackLabel?: string;
  qiblaHeadingAvailable: boolean;
  qiblaAligned: boolean;
  tasbeeh: {
    count: number;
    target: number;
  };
};

function quickAccessLiveValue(
  featureId: string,
  context: QuickAccessLiveContext,
): string | undefined {
  switch (featureId) {
    case "quran":
      return context.readingProgress
        ? `${context.readingProgress.surahName || `Surah ${context.readingProgress.surah}`} ${context.readingProgress.verse}`
        : "Start reading";
    case "prayer": {
      const prayerLabel = PRAYER_NAMES[context.nextPrayer] || "Next prayer";
      if (context.minutesToNextPrayer != null) {
        return `${prayerLabel} · ${context.minutesToNextPrayer}m`;
      }
      return context.nextPrayerTime
        ? `${prayerLabel} · ${formatPrayerTime(context.nextPrayerTime)}`
        : "Prayer times";
    }
    case "qibla":
      if (context.qiblaAligned) return "🕋 Facing";
      if (context.qiblaHeadingAvailable) {
        return context.qiblaFeedbackLabel || "Turn to Qibla";
      }
      return `${Math.round(context.qiblaDegrees)}° bearing`;
    case "duas":
      return "Daily dua";
    case "tasbeeh":
      return `${context.tasbeeh.count}/${context.tasbeeh.target}`;
    case "calendar":
      return "Hijri date";
    case "library":
      return "Read & learn";
    case "streak":
      return "Keep going";
    default:
      return undefined;
  }
}

function normalizeQuickAccessSlots(value: unknown): string[] {
  const requested = Array.isArray(value) ? value : [];
  const uniqueValidIds = requested.filter(
    (id, index): id is string =>
      typeof id === "string" &&
      FEATURE_MAP.has(id) &&
      requested.indexOf(id) === index,
  );

  for (const fallbackId of DEFAULT_SLOT_IDS) {
    if (
      uniqueValidIds.length >= QUICK_ACCESS_SLOT_COUNT ||
      uniqueValidIds.includes(fallbackId)
    ) {
      continue;
    }
    uniqueValidIds.push(fallbackId);
  }

  return uniqueValidIds.slice(0, QUICK_ACCESS_SLOT_COUNT);
}

const DAILY_PLAN_TASKS_KEY = "daily_plan_tasks";
const DAILY_PLAN_COMPLETED_KEY = "daily_plan_completed";
const TOTAL_QURAN_VERSES = 6236;

type HomePersonalAIRefreshFn = (options?: { force?: boolean }) => Promise<void>;

function formatHomePaceDuration(days: number): string {
  if (!Number.isFinite(days) || days <= 0) return "soon";
  if (days < 14) return `${Math.ceil(days)} days`;
  if (days < 70) return `${Math.ceil(days / 7)} weeks`;
  if (days < 730) return `${Math.ceil(days / 30)} months`;
  return `${Math.ceil(days / 365)} years`;
}

type DailyPlanTask = {
  taskId: string;
  icon: AppIconName;
  text: string;
  time: string;
  isDefault: boolean;
  scheduledTime?: { hour: number; minute: number };
  notificationId?: string;
};

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const TASK_ICON_OPTIONS: {
  name: AppIconName;
  label: string;
}[] = [
  { name: "sunrise", label: "Prayer" },
  { name: "book-open", label: "Quran" },
  { name: "heart", label: "Adhkar" },
  { name: "star", label: "General" },
  { name: "coffee", label: "Morning" },
  { name: "moon", label: "Night" },
  { name: "music", label: "Dhikr" },
  { name: "award", label: "Goal" },
  { name: "zap", label: "Energy" },
  { name: "droplet", label: "Water" },
  { name: "activity", label: "Exercise" },
  { name: "edit-3", label: "Journal" },
];

const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const DEFAULT_DAILY_TASKS: DailyPlanTask[] = [
  {
    taskId: "default_fajr",
    icon: "sunrise",
    text: "Pray Fajr on time",
    time: "5:00 AM",
    isDefault: true,
    scheduledTime: { hour: 5, minute: 0 },
  },
  {
    taskId: "default_quran",
    icon: "book-open",
    text: "Read 1 page of Quran",
    time: "After Fajr",
    isDefault: true,
  },
  {
    taskId: "default_adhkar",
    icon: "heart",
    text: "Morning Adhkar",
    time: "Morning",
    isDefault: true,
  },
  {
    taskId: "default_evening_adhkar",
    icon: "sunset",
    text: "Evening Adhkar",
    time: "Before Maghrib",
    isDefault: true,
  },
  {
    taskId: "default_dhikr",
    icon: "repeat",
    text: "Dhikr & Tasbeeh",
    time: "After Salah",
    isDefault: true,
  },
  {
    taskId: "default_istighfar",
    icon: "refresh-cw",
    text: "Istighfar (100x)",
    time: "Anytime",
    isDefault: true,
  },
];

const DAILY_PLAN_STREAK_KEY = "daily_plan_streak";

function getDailyPlanMotivation(completed: number, total: number): string {
  if (total === 0) return "Add tasks to start your day";
  const pct = completed / total;
  if (pct === 0) return "Bismillah, start your day strong";
  if (pct < 0.3) return "Great start, keep going";
  if (pct < 0.5) return "You're building momentum";
  if (pct < 0.75) return "MashaAllah, halfway there";
  if (pct < 1) return "Almost done, finish strong";
  return "Alhamdulillah, all tasks complete";
}

async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

async function scheduleTaskNotification(
  task: DailyPlanTask,
): Promise<string | undefined> {
  if (!task.scheduledTime) return undefined;
  try {
    const now = new Date();
    const triggerDate = new Date();
    triggerDate.setHours(
      task.scheduledTime.hour,
      task.scheduledTime.minute,
      0,
      0,
    );
    triggerDate.setMinutes(triggerDate.getMinutes() - 5);
    if (triggerDate <= now) return undefined;
    const secondsFromNow = Math.max(
      1,
      Math.floor((triggerDate.getTime() - now.getTime()) / 1000),
    );
    const triggerInput: any = { seconds: secondsFromNow, repeats: false };
    if (Notifications.SchedulableTriggerInputTypes) {
      triggerInput.type =
        Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL;
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: "Daily Plan", body: task.text },
      trigger: triggerInput,
    });
    return id;
  } catch {
    return undefined;
  }
}

async function cancelTaskNotification(notificationId?: string) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {}
}

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const CONTENT_TABS = ["Reading", "Hadith", "Daily Dua"] as const;

const WEEK_DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

function DailyPlanTaskRow({
  task,
  isCompleted,
  onToggle,
  onDelete,
  theme,
  isDark,
}: {
  task: DailyPlanTask;
  isCompleted: boolean;
  onToggle: () => void;
  onDelete: () => void;
  theme: any;
  isDark: boolean;
}) {
  const swipeableRef = useRef<Swipeable>(null);
  const checkScale = useSharedValue(isCompleted ? 1 : 0);

  useEffect(() => {
    checkScale.value = withSpring(isCompleted ? 1 : 0, {
      damping: 12,
      stiffness: 180,
    });
  }, [checkScale, isCompleted]);

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.8 + checkScale.value * 0.2 }],
  }));

  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        swipeableRef.current?.close();
        onDelete();
      }}
      style={[styles.swipeDeleteBtn, { backgroundColor: theme.error }]}
    >
      <AppIcon name="trash-2" size={18} color={theme.buttonText} />
    </Pressable>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <View
        style={[
          styles.dailyPlanRow,
          {
            backgroundColor: isDark
              ? theme.cardBackground
              : theme.cardBackground,
          },
        ]}
      >
        <View
          style={[
            styles.dailyPlanIcon,
            {
              backgroundColor: isCompleted
                ? theme.primaryMuted
                : isDark
                  ? theme.surfaceGlass
                  : theme.borderSubtle,
            },
          ]}
        >
          <AppIcon
            name={task.icon}
            size={17}
            color={isCompleted ? theme.primary : theme.iconMuted}
          />
        </View>
        <View style={{ flex: 1, opacity: isCompleted ? 0.55 : 1 }}>
          <ThemedText
            type="body"
            style={[
              { fontSize: 15, fontWeight: "500" },
              isCompleted
                ? {
                    textDecorationLine: "line-through" as const,
                    color: theme.textMuted,
                  }
                : undefined,
            ]}
          >
            {task.text}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}
          >
            {task.time}
          </ThemedText>
        </View>
        <Pressable
          onPress={onToggle}
          testID={`task-check-${task.taskId}`}
          hitSlop={8}
        >
          <Animated.View
            style={[
              styles.dailyPlanCheck,
              checkAnimStyle,
              isCompleted
                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                : { borderColor: theme.border, borderWidth: 2 },
            ]}
          >
            {isCompleted ? (
              <AppIcon name="check" size={13} color={theme.buttonText} />
            ) : null}
          </Animated.View>
        </Pressable>
      </View>
    </Swipeable>
  );
}

export default function HomeScreen() {
  const { theme, isDark, skinId } = useTheme();
  const ThemedCategoryColors = getThemedCategoryColors(theme, skinId);
  const { user, refreshUser } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { location, detectGPSLocation, gpsLoading } = useLocation();
  const { hasPaidAPIAccess, isScholar } = useSubscription();
  const {
    profile,
    currentNudge,
    dismissNudge,
    trackFeature,
    getDailyPlanSuggestionsFn,
    v3State,
    v3RespondToNudge,
    v3Refresh,
  } = useNurAI();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTab, setSelectedTab] =
    useState<(typeof CONTENT_TABS)[number]>("Reading");
  const [prayerData, setPrayerData] = useState<{
    nextPrayer: string;
    nextPrayerTime: Date | null;
    remainingMs: number;
  }>({ nextPrayer: "", nextPrayerTime: null, remainingMs: 0 });
  const [dailyTasks, setDailyTasks] = useState<DailyPlanTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(
    {},
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskIcon, setNewTaskIcon] = useState<AppIconName>("star");
  const [newTaskHour, setNewTaskHour] = useState(9);
  const [newTaskMinute, setNewTaskMinute] = useState(0);
  const [newTaskAmPm, setNewTaskAmPm] = useState<"AM" | "PM">("AM");
  const [newTaskHasTime, setNewTaskHasTime] = useState(false);
  const [notifPermissionRequested, setNotifPermissionRequested] =
    useState(false);
  const [streakData, setStreakData] = useState<{
    checkedDays: string[];
    currentStreak: number;
    longestStreak: number;
  }>({ checkedDays: [], currentStreak: 0, longestStreak: 0 });
  const [dailyPlanStreak, setDailyPlanStreak] = useState(0);
  const [readingProgress, setReadingProgress] = useState<{
    surah: number;
    surahName: string;
    verse: number;
    totalVersesRead: number;
    timestamp: number;
  } | null>(null);
  const [quranStats, setQuranStats] = useState<{
    totalPercentage: number;
    totalVersesRead: number;
  } | null>(null);
  const [dailyJourney, setDailyJourney] =
    useState<DailyDeenJourneyState | null>(null);
  const [quranReflectionSummary, setQuranReflectionSummary] =
    useState<QuranReflectionCircleSummary | null>(null);
  const [customGoals, setCustomGoals] = useState<CustomDailyGoalPreference[]>(
    DEFAULT_CUSTOM_DAILY_GOALS,
  );
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [weather, setWeather] = useState<LiveWeatherSnapshot | null>(null);
  const [recentMediaSession, setRecentMediaSession] =
    useState<MediaResumeSession | null>(null);
  const [personalHomePlan, setPersonalHomePlan] =
    useState<PersonalHomePlanSummary | null>(null);
  const [homeTasbeehState, setHomeTasbeehState] = useState({
    count: 0,
    target: 33,
    dhikrLabel: "Tasbeeh",
    todayTotal: 0,
  });
  const [homeAIContextExtras, setHomeAIContextExtras] = useState(
    createDefaultHomeAIContextExtras,
  );
  const [homeAIFeedback, setHomeAIFeedback] =
    useState<HomeAIFeedbackState | null>(null);
  const [personalAIContext, setPersonalAIContext] =
    useState<PersonalAIContext | null>(null);
  const [personalAIContextReady, setPersonalAIContextReady] = useState(false);
  const personalAITier: NurAIPlanTier = isScholar
    ? "scholar"
    : hasPaidAPIAccess
      ? "premium"
      : "free";
  const [homePersonalAIUpdatedAt, setHomePersonalAIUpdatedAt] = useState<
    string | null
  >(null);
  const [personalAIResponse, setPersonalAIResponse] =
    useState<PersonalAIRespondResult | null>(null);
  const [personalAILoading, setPersonalAILoading] = useState(false);
  const [personalAIError, setPersonalAIError] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [qiblaDeviceHeading, setQiblaDeviceHeading] = useState<number | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [namePromptValue, setNamePromptValue] = useState("");
  const [savingNamePrompt, setSavingNamePrompt] = useState(false);
  const [namePromptDismissed, setNamePromptDismissed] = useState(false);
  const [namePromptError, setNamePromptError] = useState("");
  const homeQiblaAlignedRef = useRef(false);
  const homePersonalAIRefreshRef = useRef<HomePersonalAIRefreshFn | null>(null);
  const homeAIContextRef = useRef<HomeAIContext | null>(null);
  const homeGuidancePlanRef = useRef<HomeGuidancePlan | null>(null);
  const lastRequestedGuidanceKeyRef = useRef<string | null>(null);
  const personalAIRequestIdRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const [streakRaw, readingRaw, recentMedia] = await Promise.all([
            AsyncStorage.getItem("streak-data"),
            AsyncStorage.getItem("quran-reading-progress"),
            loadMediaResumeSession(),
          ]);
          if (streakRaw) setStreakData(JSON.parse(streakRaw));
          if (readingRaw) setReadingProgress(JSON.parse(readingRaw));
          setRecentMediaSession(recentMedia);
        } catch {}
        try {
          setPersonalHomePlan(await loadPersonalHomePlanSummary());
        } catch {
          setPersonalHomePlan(null);
        }
        try {
          const stats = await getQuranStats();
          setQuranStats({
            totalPercentage: stats.totalPercentage,
            totalVersesRead: stats.totalVersesRead,
          });
        } catch {}
      };
      loadData();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadHomeIntelligenceContext = async () => {
        // Refresh only after Health has already returned a granted status from
        // an explicit Health-screen sync. Home never opens a permission prompt.
        try {
          const {
            loadLastHealthSummary,
            readNativeDailyHealthSummary,
            saveLastHealthSummary,
          } = await import("@/services/nativeHealthDataService");
          const cachedHealth = await loadLastHealthSummary();
          if (cachedHealth?.status === "granted") {
            const refreshedHealth = await readNativeDailyHealthSummary();
            if (
              refreshedHealth.status === "granted" ||
              refreshedHealth.status === "denied"
            ) {
              await saveLastHealthSummary(refreshedHealth);
            }
          }
        } catch {
          // Health is optional; the last safe cached context remains usable.
        }

        try {
          const [extras, feedback, personalContext] = await Promise.all([
            loadHomeAIContextExtras(),
            loadHomeAIFeedback(),
            loadPersonalAIContext(),
          ]);
          if (!active) return;
          setHomeAIContextExtras(extras);
          setHomeAIFeedback(feedback);
          setPersonalAIContext(personalContext);
          setPersonalAIContextReady(true);
        } catch {
          // Keep the on-device fallback if an optional context source fails.
          if (active) setPersonalAIContextReady(true);
        }
      };

      void loadHomeIntelligenceContext();
      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    trackAppUsageTime();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" || ENABLE_QA_LOCATION_BYPASS) return undefined;

    let subscription: Location.LocationSubscription | null = null;
    let mounted = true;

    const startHeading = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || !mounted) return;

        const updateHeading = (heading: Location.LocationHeadingObject) => {
          const nextHeading =
            heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
          if (nextHeading >= 0) {
            setQiblaDeviceHeading(normalizeDegrees(nextHeading));
          }
        };

        const initialHeading = await Location.getHeadingAsync();
        if (mounted) updateHeading(initialHeading);

        subscription = await Location.watchHeadingAsync(updateHeading);
      } catch {
        if (mounted) setQiblaDeviceHeading(null);
      }
    };

    startHeading();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  const isGenericName = useCallback((name: string | null | undefined) => {
    if (!name) return true;
    const genericNames = ["Apple User", "Google User", "User"];
    return genericNames.includes(name.trim());
  }, []);

  useEffect(() => {
    if (!user || namePromptDismissed) return;
    if (isGenericName(user.displayName)) {
      AsyncStorage.getItem("name_prompt_dismissed_v2").then((val) => {
        if (val !== user.displayName) {
          setShowNamePrompt(true);
        }
      });
    }
  }, [user, namePromptDismissed, isGenericName]);

  const handleSaveNamePrompt = async () => {
    const trimmed = namePromptValue.trim();
    if (!trimmed || trimmed.length < 2) return;
    setSavingNamePrompt(true);
    setNamePromptError("");
    try {
      const { apiRequest } = await import("@/lib/query-client");
      const res = await apiRequest("PUT", "/api/auth/profile", {
        displayName: trimmed,
      });
      await res.json();
      await refreshUser();
      await updateProfileV3({ name: trimmed });
      await v3Refresh();
      setShowNamePrompt(false);
      await AsyncStorage.setItem("name_prompt_dismissed_v2", trimmed);
    } catch (err: any) {
      console.error("[NamePrompt] Save failed:", err?.message || err);
      setNamePromptError(
        err?.status === 401
          ? "Please sign in again first."
          : "Could not save. Please try again.",
      );
    }
    setSavingNamePrompt(false);
  };

  const handleDismissNamePrompt = async () => {
    setShowNamePrompt(false);
    setNamePromptDismissed(true);
    if (user?.displayName) {
      await AsyncStorage.setItem("name_prompt_dismissed_v2", user.displayName);
    }
  };

  useEffect(() => {
    const loadDailyPlan = async () => {
      try {
        const savedTasks = await AsyncStorage.getItem(DAILY_PLAN_TASKS_KEY);
        if (savedTasks !== null) {
          const parsed = JSON.parse(savedTasks) as DailyPlanTask[];
          if (Array.isArray(parsed)) {
            setDailyTasks(parsed);
          }
        } else {
          setDailyTasks(DEFAULT_DAILY_TASKS);
          await syncedSetItem(
            DAILY_PLAN_TASKS_KEY,
            JSON.stringify(DEFAULT_DAILY_TASKS),
          );
        }
        const today = getTodayDateString();
        const savedCompleted = await AsyncStorage.getItem(
          DAILY_PLAN_COMPLETED_KEY,
        );
        if (savedCompleted) {
          const parsed = JSON.parse(savedCompleted) as {
            date: string;
            completed: Record<string, boolean>;
          };
          if (parsed.date === today) {
            setCompletedTasks(parsed.completed);
          }
        }
        const savedStreak = await AsyncStorage.getItem(DAILY_PLAN_STREAK_KEY);
        if (savedStreak) {
          const streakParsed = JSON.parse(savedStreak) as {
            streak: number;
            lastDate: string;
          };
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, "0")}-${yesterday.getDate().toString().padStart(2, "0")}`;
          if (
            streakParsed.lastDate === today ||
            streakParsed.lastDate === yStr
          ) {
            setDailyPlanStreak(streakParsed.streak);
          }
        }
      } catch {}
    };
    loadDailyPlan();
  }, []);

  const completedCount = useMemo(() => {
    return dailyTasks.filter((t) => completedTasks[t.taskId]).length;
  }, [dailyTasks, completedTasks]);

  const reloadDailyJourney = useCallback(async () => {
    try {
      const minutesToNextPrayer = prayerData.nextPrayerTime
        ? Math.max(
            0,
            Math.ceil(
              (prayerData.nextPrayerTime.getTime() - Date.now()) / 60000,
            ),
          )
        : null;
      const [state, circleSummary] = await Promise.all([
        buildDailyDeenJourney({
          dailyTasks,
          completedTasks,
          readingProgress,
          currentPrayer: prayerData.nextPrayer || undefined,
          minutesToNextPrayer,
        }),
        getQuranReflectionCircleSummary(),
      ]);
      setDailyJourney(state);
      setQuranReflectionSummary(circleSummary);
    } catch {
      setDailyJourney(null);
      setQuranReflectionSummary(null);
    }
  }, [
    completedTasks,
    dailyTasks,
    prayerData.nextPrayer,
    prayerData.nextPrayerTime,
    readingProgress,
  ]);

  useEffect(() => {
    reloadDailyJourney();
  }, [reloadDailyJourney]);

  useEffect(() => {
    loadCustomDailyGoalPreferences()
      .then(setCustomGoals)
      .catch(() => setCustomGoals(DEFAULT_CUSTOM_DAILY_GOALS));
  }, []);

  const persistCustomGoals = useCallback(
    async (nextGoals: CustomDailyGoalPreference[]) => {
      setCustomGoals(nextGoals);
      await saveCustomDailyGoalPreferences(nextGoals);
      Haptics.selectionAsync().catch(() => {});
      reloadDailyJourney();
    },
    [reloadDailyJourney],
  );

  const updateCustomGoal = useCallback(
    (
      goalId: string,
      updater: (goal: CustomDailyGoalPreference) => CustomDailyGoalPreference,
    ) => {
      const nextGoals = customGoals.map((goal) =>
        goal.id === goalId ? updater(goal) : goal,
      );
      persistCustomGoals(nextGoals);
    },
    [customGoals, persistCustomGoals],
  );

  const loadWeather = useCallback(
    async (_mode: "silent" | "manual" = "silent") => {
      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const nextWeather = await fetchLiveWeather(location);
        setWeather(nextWeather);
      } catch {
        setWeatherError("Live weather is unavailable right now.");
      } finally {
        setWeatherLoading(false);
      }
    },
    [location],
  );

  useEffect(() => {
    loadWeather("silent");
  }, [loadWeather]);

  const handleWeatherGps = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    const detected = await detectGPSLocation();
    if (!detected) {
      setWeatherLoading(false);
      setWeatherError("Allow location access to load local weather.");
      return;
    }
    try {
      const nextWeather = await fetchLiveWeather(detected);
      setWeather(nextWeather);
    } catch {
      setWeatherError("Could not load weather for this location.");
    } finally {
      setWeatherLoading(false);
    }
  }, [detectGPSLocation]);

  const toggleTaskCompletion = useCallback(
    async (taskId: string) => {
      const task = dailyTasks.find((t) => t.taskId === taskId);
      const wasCompleted = completedTasks[taskId];
      if (!wasCompleted) {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      }
      const updated = { ...completedTasks, [taskId]: !wasCompleted };
      setCompletedTasks(updated);
      const today = getTodayDateString();
      syncedSetItem(
        DAILY_PLAN_COMPLETED_KEY,
        JSON.stringify({ date: today, completed: updated }),
      ).catch(() => {});
      if (!wasCompleted && task?.notificationId) {
        cancelTaskNotification(task.notificationId);
      }
      const newCompletedCount = dailyTasks.filter(
        (t) => updated[t.taskId],
      ).length;
      if (
        newCompletedCount === dailyTasks.length &&
        dailyTasks.length > 0 &&
        !wasCompleted
      ) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        try {
          const savedStreak = await AsyncStorage.getItem(DAILY_PLAN_STREAK_KEY);
          let newStreak = 1;
          if (savedStreak) {
            const p = JSON.parse(savedStreak) as {
              streak: number;
              lastDate: string;
            };
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, "0")}-${yesterday.getDate().toString().padStart(2, "0")}`;
            if (p.lastDate === yStr || p.lastDate === today) {
              newStreak = p.lastDate === today ? p.streak : p.streak + 1;
            }
          }
          setDailyPlanStreak(newStreak);
          await syncedSetItem(
            DAILY_PLAN_STREAK_KEY,
            JSON.stringify({ streak: newStreak, lastDate: today }),
          );
        } catch {}
      }
    },
    [dailyTasks, completedTasks],
  );

  const addDailyTask = useCallback(async () => {
    const trimmed = newTaskName.trim();
    if (!trimmed) return;
    if (!notifPermissionRequested) {
      await requestNotificationPermission();
      setNotifPermissionRequested(true);
    }
    let timeDisplay = "Anytime";
    let scheduledTime: { hour: number; minute: number } | undefined;
    if (newTaskHasTime) {
      let hour24 = newTaskHour;
      if (newTaskAmPm === "PM" && newTaskHour !== 12) hour24 += 12;
      if (newTaskAmPm === "AM" && newTaskHour === 12) hour24 = 0;
      scheduledTime = { hour: hour24, minute: newTaskMinute };
      const minStr = newTaskMinute.toString().padStart(2, "0");
      timeDisplay = `${newTaskHour}:${minStr} ${newTaskAmPm}`;
    }
    const newTask: DailyPlanTask = {
      taskId: generateTaskId(),
      icon: newTaskIcon,
      text: trimmed,
      time: timeDisplay,
      isDefault: false,
      scheduledTime,
    };
    if (scheduledTime) {
      const notifId = await scheduleTaskNotification(newTask);
      if (notifId) newTask.notificationId = notifId;
    }
    const updated = [...dailyTasks, newTask];
    setDailyTasks(updated);
    setShowAddModal(false);
    setNewTaskName("");
    setNewTaskIcon("star");
    setNewTaskHour(9);
    setNewTaskMinute(0);
    setNewTaskAmPm("AM");
    setNewTaskHasTime(false);
    try {
      await syncedSetItem(DAILY_PLAN_TASKS_KEY, JSON.stringify(updated));
    } catch {}
  }, [
    newTaskName,
    newTaskIcon,
    newTaskHour,
    newTaskMinute,
    newTaskAmPm,
    newTaskHasTime,
    dailyTasks,
    notifPermissionRequested,
  ]);

  const deleteDailyTask = useCallback(
    async (taskId: string) => {
      const task = dailyTasks.find((t) => t.taskId === taskId);
      if (task?.notificationId) {
        cancelTaskNotification(task.notificationId);
      }
      const updated = dailyTasks.filter((t) => t.taskId !== taskId);
      setDailyTasks(updated);
      setCompletedTasks((prev) => {
        const newCompleted = { ...prev };
        delete newCompleted[taskId];
        const today = getTodayDateString();
        syncedSetItem(
          DAILY_PLAN_COMPLETED_KEY,
          JSON.stringify({ date: today, completed: newCompleted }),
        ).catch(() => {});
        return newCompleted;
      });
      try {
        await syncedSetItem(DAILY_PLAN_TASKS_KEY, JSON.stringify(updated));
      } catch {}
    },
    [dailyTasks],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const calculateNextPrayerData = useCallback(() => {
    const coords = new Coordinates(location.latitude, location.longitude);
    const params = getCalculationMethod(location.calculationMethod, {
      countryName: location.countryName,
      latitude: location.latitude,
    });
    const now = new Date();
    const pt = new PrayerTimes(coords, now, params);

    const prayerOrder: { name: string; time: Date }[] = [
      { name: "fajr", time: pt.fajr },
      { name: "sunrise", time: pt.sunrise },
      { name: "dhuhr", time: pt.dhuhr },
      { name: "asr", time: pt.asr },
      { name: "maghrib", time: pt.maghrib },
      { name: "isha", time: pt.isha },
    ];

    let next = prayerOrder.find((p) => p.time > now);
    if (!next) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const ptTomorrow = new PrayerTimes(coords, tomorrow, params);
      next = { name: "fajr", time: ptTomorrow.fajr };
    }

    setPrayerData({
      nextPrayer: next.name,
      nextPrayerTime: next.time,
      remainingMs: next.time.getTime() - now.getTime(),
    });
  }, [
    location.calculationMethod,
    location.countryName,
    location.latitude,
    location.longitude,
  ]);

  const prayerMinuteTick = useMemo(
    () => Math.floor(currentTime.getTime() / 60000),
    [currentTime],
  );

  useEffect(() => {
    calculateNextPrayerData();
  }, [calculateNextPrayerData, prayerMinuteTick]);

  useEffect(() => {
    if (!prayerData.nextPrayerTime) return undefined;
    const delay = Math.min(
      Math.max(750, prayerData.nextPrayerTime.getTime() - Date.now() + 1250),
      2_147_483_647,
    );
    const timeout = setTimeout(() => {
      setCurrentTime(new Date());
      calculateNextPrayerData();
    }, delay);
    return () => clearTimeout(timeout);
  }, [calculateNextPrayerData, prayerData.nextPrayerTime]);

  useFocusEffect(
    useCallback(() => {
      calculateNextPrayerData();
    }, [calculateNextPrayerData]),
  );

  useEffect(() => {
    if (Platform.OS === "web") return undefined;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setCurrentTime(new Date());
        calculateNextPrayerData();
      }
    });
    return () => subscription.remove();
  }, [calculateNextPrayerData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (v3State) {
        await v3Refresh();
      }
      calculateNextPrayerData();
      await Promise.all([
        reloadDailyJourney(),
        loadWeather("manual"),
        loadPersonalHomePlanSummary().then(setPersonalHomePlan),
        homePersonalAIRefreshRef.current?.({ force: true }) ??
          Promise.resolve(),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch {}
    setRefreshing(false);
  }, [
    calculateNextPrayerData,
    loadWeather,
    reloadDailyJourney,
    v3State,
    v3Refresh,
  ]);

  const minutesToNextPrayer = useMemo(() => {
    if (!prayerData.nextPrayerTime) return null;
    return Math.max(
      0,
      Math.ceil(
        (prayerData.nextPrayerTime.getTime() - currentTime.getTime()) / 60000,
      ),
    );
  }, [currentTime, prayerData.nextPrayerTime]);

  const liveRelevantV3Nudge = useMemo(
    () =>
      selectLiveRelevantV3Nudge(v3State?.nudges, {
        nextPrayerKey: prayerData.nextPrayer,
        minutesToNextPrayer,
      }),
    [minutesToNextPrayer, prayerData.nextPrayer, v3State?.nudges],
  );

  const qiblaDegrees = useMemo(() => {
    try {
      return Math.round(
        Qibla(new Coordinates(location.latitude, location.longitude)),
      );
    } catch {
      return 0;
    }
  }, [location.latitude, location.longitude]);
  const qiblaDelta = useMemo(() => {
    if (qiblaDeviceHeading == null) return null;
    return signedAngleDelta(qiblaDegrees, qiblaDeviceHeading);
  }, [qiblaDegrees, qiblaDeviceHeading]);
  const qiblaPointerDegrees = useMemo(
    () => (qiblaDelta == null ? qiblaDegrees : normalizeDegrees(qiblaDelta)),
    [qiblaDegrees, qiblaDelta],
  );
  const qiblaAligned = qiblaDelta != null && Math.abs(qiblaDelta) <= 6;
  const qiblaFeedbackLabel = useMemo(() => {
    if (qiblaDelta == null) return `${Math.round(qiblaDegrees)}°`;
    if (qiblaAligned) return "Facing Qibla";
    const turn = qiblaDelta >= 0 ? "right" : "left";
    return `Turn ${turn} ${Math.round(Math.abs(qiblaDelta))}°`;
  }, [qiblaAligned, qiblaDegrees, qiblaDelta]);

  useEffect(() => {
    if (Platform.OS === "web" || qiblaDelta == null) return;
    if (qiblaAligned && !homeQiblaAlignedRef.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    }
    homeQiblaAlignedRef.current = qiblaAligned;
  }, [qiblaAligned, qiblaDelta]);

  const todayDayIndex = useMemo(() => {
    const jsDay = currentTime.getDay();
    const mapping = [1, 2, 3, 4, 5, 6, 0];
    return mapping[jsDay];
  }, [currentTime]);

  const homePulseItems = useMemo<HomePulseItem[]>(() => {
    const tasks = dailyTasks.length > 0 ? dailyTasks : DEFAULT_DAILY_TASKS;
    return tasks.slice(0, 3).map((task) => ({
      id: task.taskId,
      title: task.text,
      subtitle: task.time,
      icon: task.icon,
      completed: !!completedTasks[task.taskId],
    }));
  }, [completedTasks, dailyTasks]);
  const homeQuranDailyHandoff = useMemo<QuranDailySessionHandoff>(() => {
    const quranPulse = homePulseItems.find((item) => {
      const label = `${item.id} ${item.title} ${item.icon}`.toLowerCase();
      return (
        label.includes("quran") ||
        label.includes("ayah") ||
        item.icon === "book-open"
      );
    });
    const reflectionPulse = homePulseItems.find((item) => {
      const label = `${item.id} ${item.title} ${item.icon}`.toLowerCase();
      return (
        label.includes("reflect") ||
        label.includes("journal") ||
        item.icon === "edit-3"
      );
    });
    const reference = readingProgress
      ? `${readingProgress.surahName || `Surah ${readingProgress.surah}`} ${readingProgress.verse}`
      : quranStats?.totalVersesRead
        ? `${quranStats.totalVersesRead} ayahs read`
        : "today's Quran start";
    const quranPathStep =
      personalHomePlan?.dailyPath.find((step) =>
        step.toLowerCase().includes("quran"),
      ) ||
      personalHomePlan?.quranLabel ||
      "Daily Quran rhythm";

    return buildQuranDailySessionHandoff({
      reference,
      identityTitle: personalHomePlan?.quranLabel || "Quran journey",
      ayahThemeLabel: quranPathStep,
      audioActive: recentMediaSession?.kind === "quran",
      wordSaved: (quranStats?.totalVersesRead ?? 0) > 0,
      lessonSaved: !!quranPulse?.completed || !!completedTasks.default_quran,
      recitationPracticed:
        recentMediaSession?.kind === "quran" && !!quranPulse?.completed,
      reflectionSaved: !!reflectionPulse?.completed,
      sourceBoundary:
        "Home shows a habit handoff from saved Quran progress. Open Reader for source cards, tafsir boundaries, recitation, and private notes.",
    });
  }, [
    completedTasks.default_quran,
    homePulseItems,
    personalHomePlan,
    quranStats?.totalVersesRead,
    readingProgress,
    recentMediaSession?.kind,
  ]);

  const homeHijriDate = useMemo(
    () => getSharedHijriDate(currentTime),
    [currentTime],
  );
  const homeHijriDateLabel = `${homeHijriDate.day} ${homeHijriDate.monthName} ${homeHijriDate.year}`;
  const homeQuranPace = useMemo(() => {
    const versesRead = Math.max(
      quranStats?.totalVersesRead ?? 0,
      readingProgress?.totalVersesRead ?? 0,
    );
    if (versesRead <= 0) return null;
    const observedDays = Math.max(
      1,
      Math.min(
        30,
        Math.max(
          streakData.checkedDays.length,
          dailyPlanStreak,
          streakData.currentStreak,
          1,
        ),
      ),
    );
    const recentDailyPace = Math.max(1, Math.round(versesRead / observedDays));
    const remainingVerses = Math.max(TOTAL_QURAN_VERSES - versesRead, 0);
    return {
      recentDailyPace,
      estimatedCompletionLabel:
        remainingVerses > 0
          ? formatHomePaceDuration(Math.ceil(remainingVerses / recentDailyPace))
          : "complete",
      paceConfidence:
        observedDays >= 7 ? ("established" as const) : ("limited" as const),
    };
  }, [
    dailyPlanStreak,
    quranStats?.totalVersesRead,
    readingProgress?.totalVersesRead,
    streakData.checkedDays.length,
    streakData.currentStreak,
  ]);

  const homeAIContext = useMemo(
    () =>
      buildHomeAIContext({
        now: currentTime,
        locationLabel:
          location.cityName || location.countryName || "Your location",
        hijriDateLabel: homeHijriDateLabel,
        calculationMethod: location.calculationMethod,
        gender: profile?.gender,
        madhhab: profile?.madhab,
        nextPrayerName: PRAYER_NAMES[prayerData.nextPrayer] || "Next prayer",
        nextPrayerTimeLabel: prayerData.nextPrayerTime
          ? formatPrayerTime(prayerData.nextPrayerTime)
          : "Not available",
        minutesToNextPrayer,
        dailyActionsCompleted: homePulseItems.filter((item) => item.completed)
          .length,
        dailyActionsTotal: homePulseItems.length,
        streakDays: streakData.currentStreak,
        dailyPlanStreak,
        quran: {
          surah: readingProgress?.surah,
          surahName: readingProgress?.surahName,
          verse: readingProgress?.verse,
          totalVersesRead: Math.max(
            quranStats?.totalVersesRead ?? 0,
            readingProgress?.totalVersesRead ?? 0,
          ),
          totalPercentage: quranStats?.totalPercentage,
          ...homeQuranPace,
        },
        weather,
        dailyJourney,
        personalPlan: personalHomePlan,
        personalPlanContextLine: personalHomePlan?.aiContextLine,
        customGoals,
        recentMedia: recentMediaSession,
        subscriptionMode: personalAITier,
        isRamadan: homeHijriDate.month === 9,
        currentNudge: currentNudge
          ? {
              title: currentNudge.title,
              body: currentNudge.body,
              category: currentNudge.type,
              priority: currentNudge.priority,
              actionRoute: currentNudge.actions?.[0]?.screen,
            }
          : null,
        v3Nudge: liveRelevantV3Nudge
          ? {
              id: liveRelevantV3Nudge.id,
              title: liveRelevantV3Nudge.title,
              body: liveRelevantV3Nudge.body,
              reason: liveRelevantV3Nudge.reason,
              category: liveRelevantV3Nudge.category,
              priority: liveRelevantV3Nudge.priority,
              actionLabel: liveRelevantV3Nudge.actionLabel,
              actionRoute: liveRelevantV3Nudge.actionRoute,
              actionParams: liveRelevantV3Nudge.actionParams,
            }
          : null,
        extras: {
          ...homeAIContextExtras,
          tasbeeh: homeTasbeehState,
        },
      }),
    [
      currentNudge,
      currentTime,
      customGoals,
      dailyJourney,
      dailyPlanStreak,
      homeAIContextExtras,
      homeHijriDate.month,
      homeHijriDateLabel,
      homePulseItems,
      homeQuranPace,
      homeTasbeehState,
      location.cityName,
      location.calculationMethod,
      location.countryName,
      minutesToNextPrayer,
      personalAITier,
      personalHomePlan,
      profile?.gender,
      profile?.madhab,
      prayerData.nextPrayer,
      prayerData.nextPrayerTime,
      quranStats?.totalPercentage,
      quranStats?.totalVersesRead,
      readingProgress,
      recentMediaSession,
      streakData.currentStreak,
      liveRelevantV3Nudge,
      weather,
    ],
  );

  const homePersonalisationSession = useMemo(() => {
    const appOpenTimes = v3State?.profile?.appOpenTimes || [];
    const previousOpen =
      appOpenTimes.length > 1
        ? Date.parse(appOpenTimes[appOpenTimes.length - 2] || "")
        : Number.NaN;
    const daysSincePreviousOpen = Number.isFinite(previousOpen)
      ? Math.max(
          0,
          Math.floor((currentTime.getTime() - previousOpen) / 86400000),
        )
      : undefined;
    const displayName =
      user?.displayName?.trim() ||
      v3State?.profile?.name?.trim() ||
      user?.username?.trim() ||
      undefined;

    return {
      displayName,
      activityState:
        daysSincePreviousOpen === undefined
          ? ("new_session" as const)
          : daysSincePreviousOpen >= 3
            ? ("returned_after_gap" as const)
            : ("active_rhythm" as const),
      daysSincePreviousOpen,
    };
  }, [currentTime, user?.displayName, user?.username, v3State?.profile]);

  const serverGuidance = useMemo<PersonalAIGuidanceContract | null>(() => {
    if (!personalAIResponse) return null;
    return {
      version: 1,
      surface: personalAIResponse.personalAI.surface,
      intent: personalAIResponse.personalAI.intent,
      modeId: personalAIResponse.personalAI.mode.id,
      actionPlan: personalAIResponse.personalAI.actionPlan,
      contextSummary: homeAIContext.contextSummary,
      generatedAt: homePersonalAIUpdatedAt || new Date().toISOString(),
    };
  }, [
    homeAIContext.contextSummary,
    homePersonalAIUpdatedAt,
    personalAIResponse,
  ]);

  const homeGuidancePlan = useMemo(
    () => buildHomeGuidancePlan(homeAIContext, homeAIFeedback, serverGuidance),
    [homeAIFeedback, homeAIContext, serverGuidance],
  );
  const homeGuidanceContextFingerprint = useMemo(
    () => buildHomeGuidanceContextFingerprint(homeAIContext),
    [homeAIContext],
  );
  const homeGuidanceRequestKey = useMemo(
    () => buildHomeGuidanceRequestKey(homeAIContext, homeGuidancePlan.main.id),
    [homeAIContext, homeGuidancePlan.main.id],
  );
  const personalAIContextFingerprint = useMemo(() => {
    if (!personalAIContext) return "none";
    return JSON.stringify({
      memorySummary: personalAIContext.memorySummary,
      behaviorSignals: personalAIContext.behaviorSignals,
      needsToKnow: personalAIContext.needsToKnow,
      recentActions: personalAIContext.recentActions,
      learnedPreferences: personalAIContext.learnedPreferences,
    });
  }, [personalAIContext]);
  const homePersonalAIRequestKey = useMemo(
    () =>
      `${homeGuidanceRequestKey}::${homePersonalisationSession.displayName || "anonymous"}::${homePersonalisationSession.activityState}::${personalAIContextFingerprint}`,
    [
      homeGuidanceRequestKey,
      homePersonalisationSession,
      personalAIContextFingerprint,
    ],
  );
  const homePersonalAIBriefing = useMemo(
    () =>
      buildPersonalIntelligenceBriefing({
        plan: homeGuidancePlan,
        tier: personalAITier,
        response: personalAIResponse,
      }),
    [homeGuidancePlan, personalAIResponse, personalAITier],
  );
  const homePersonalGuideWeeklyReview = useMemo(
    () =>
      buildPersonalGuideWeeklyReview({
        now: currentTime,
        checkedDays: streakData.checkedDays,
        context: homeAIContext,
      }),
    [currentTime, homeAIContext, streakData.checkedDays],
  );

  homeAIContextRef.current = homeAIContext;
  homeGuidancePlanRef.current = homeGuidancePlan;

  useEffect(() => {
    // Count only a card that remained on screen long enough to be seen. Do not
    // update React state here: that would rotate the message while it is being
    // read. The history is applied on the next focus or explicit refresh.
    const timer = setTimeout(() => {
      void recordHomeAIGuidanceImpression({
        recommendationId: homeGuidancePlan.main.id,
        category: homeGuidancePlan.main.category,
        contextFingerprint: homeGuidanceContextFingerprint,
        shownAt: new Date().toISOString(),
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    homeGuidanceContextFingerprint,
    homeGuidancePlan.main.category,
    homeGuidancePlan.main.id,
  ]);

  const widgetDateKey = currentTime.toDateString();
  const widgetGregorianDateLabel = useMemo(
    () =>
      new Date(widgetDateKey).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "long",
      }),
    [widgetDateKey],
  );

  useEffect(() => {
    let cancelled = false;

    const syncWidgetSnapshot = async () => {
      const [
        savedTasbeehCount,
        savedTasbeehTarget,
        savedTasbeehDhikr,
        savedTasbeehDailyTotal,
      ] = await Promise.all([
        AsyncStorage.getItem("tasbeeh_count"),
        AsyncStorage.getItem("tasbeeh_target"),
        AsyncStorage.getItem("tasbeeh_dhikr"),
        AsyncStorage.getItem("tasbeeh_daily_total"),
      ]);
      if (cancelled) return;

      const nextPrayerName =
        PRAYER_NAMES[prayerData.nextPrayer] || "Next prayer";
      const prayerSchedule = buildWidgetPrayerSchedule({
        calculationMethod: location.calculationMethod,
        countryName: location.countryName,
        latitude: location.latitude,
        longitude: location.longitude,
        now: new Date(),
      });
      const hijriDateLabel = v3State
        ? `${formatHijriDisplayDay(v3State.hijriDate.day)} ${v3State.hijriDate.monthName} ${v3State.hijriDate.year}`
        : getHijriDate();
      const completedPulseItems = homePulseItems.filter(
        (item) => item.completed,
      ).length;
      const weatherInsight = weather
        ? (weather.nextThreeHourPrecipitationProbability ?? 0) >= 50
          ? `Rain possible before ${nextPrayerName}`
          : (weather.windKmh ?? 0) >= 35
            ? `Windy around ${nextPrayerName}`
            : `Good conditions for ${nextPrayerName}`
        : null;
      const tasbeehDhikrLabel =
        TASBEEH_DHIKR_LABELS[savedTasbeehDhikr || ""] || "Tasbeeh";
      setHomeTasbeehState({
        count: parseWidgetNumber(savedTasbeehCount),
        target: parseWidgetNumber(savedTasbeehTarget, 33),
        dhikrLabel: tasbeehDhikrLabel,
        todayTotal: resolveTasbeehDailyTotal(savedTasbeehDailyTotal),
      });

      saveNurAIWidgetSnapshot({
        updatedAt: Date.now(),
        displayName: user?.displayName || user?.username || null,
        locationLabel: location.cityName || location.countryName || null,
        hijriDateLabel,
        gregorianDateLabel: widgetGregorianDateLabel,
        nextPrayerName,
        nextPrayerTimeISO: prayerData.nextPrayerTime?.toISOString() || null,
        prayerTimeLabel: prayerData.nextPrayerTime
          ? formatPrayerTime(prayerData.nextPrayerTime)
          : null,
        prayerSchedule,
        qiblaLabel: qiblaFeedbackLabel,
        weatherTemperatureC:
          typeof weather?.temperatureC === "number"
            ? Math.round(weather.temperatureC)
            : null,
        weatherCondition: weather?.conditionLabel || null,
        weatherInsight,
        streakDays: Math.max(streakData.currentStreak, dailyPlanStreak),
        checkedDays: streakData.checkedDays.slice(-7),
        quranContinueLabel: readingProgress
          ? `${readingProgress.surahName || `Surah ${readingProgress.surah}`} ${readingProgress.verse}`
          : quranStats?.totalVersesRead
            ? `${quranStats.totalVersesRead} ayahs read`
            : null,
        quranProgressLabel: quranStats?.totalPercentage
          ? `${quranStats.totalPercentage}% Quran progress`
          : readingProgress
            ? "Return to your last ayah"
            : "Start your Quran rhythm",
        quranContinueSurah: readingProgress?.surah ?? null,
        quranContinueVerse: readingProgress?.verse ?? null,
        dailyGoalLabel:
          homePulseItems[0]?.title || dailyJourney?.primaryAction.title,
        dailyGoalProgress:
          homePulseItems.length > 0
            ? Math.round((completedPulseItems / homePulseItems.length) * 100)
            : dailyJourney?.completionPercent,
        familyGoalLabel: "Invite family into one shared action",
        tasbeehCount: parseWidgetNumber(savedTasbeehCount),
        tasbeehTarget: parseWidgetNumber(savedTasbeehTarget, 33),
        tasbeehDhikrLabel,
        tasbeehTodayTotal: resolveTasbeehDailyTotal(savedTasbeehDailyTotal),
      }).catch(() => {});
    };

    syncWidgetSnapshot().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    dailyJourney?.completionPercent,
    dailyJourney?.primaryAction.title,
    dailyPlanStreak,
    homePulseItems,
    location.calculationMethod,
    location.cityName,
    location.countryName,
    location.latitude,
    location.longitude,
    prayerData.nextPrayer,
    prayerData.nextPrayerTime,
    qiblaFeedbackLabel,
    quranStats?.totalPercentage,
    quranStats?.totalVersesRead,
    readingProgress,
    streakData.checkedDays,
    streakData.currentStreak,
    user?.displayName,
    user?.username,
    v3State,
    weather,
    widgetGregorianDateLabel,
  ]);

  const refreshHomePersonalAI = useCallback<HomePersonalAIRefreshFn>(
    async (options) => {
      if ((hasPaidAPIAccess || isScholar) && !personalAIContextReady) {
        return;
      }
      // Free tier stays on the on-device V3 briefing (no server AI call).
      if (!hasPaidAPIAccess && !isScholar) {
        if (options?.force) {
          const context = homeAIContextRef.current;
          const plan = homeGuidancePlanRef.current;
          if (context && plan) {
            const nextFeedback = await recordHomeAIGuidanceImpression({
              recommendationId: plan.main.id,
              category: plan.main.category,
              contextFingerprint: buildHomeGuidanceContextFingerprint(context),
              shownAt: new Date().toISOString(),
            });
            setHomeAIFeedback(nextFeedback);
          }
        }
        setPersonalAIResponse(null);
        setPersonalAIError(null);
        setPersonalAILoading(false);
        return;
      }

      const context = homeAIContextRef.current;
      const plan = homeGuidancePlanRef.current;
      if (!context || !plan) return;
      if (
        !options?.force &&
        lastRequestedGuidanceKeyRef.current === homePersonalAIRequestKey
      ) {
        return;
      }
      lastRequestedGuidanceKeyRef.current = homePersonalAIRequestKey;
      const requestId = ++personalAIRequestIdRef.current;

      // Paid tiers: ask the real server AI. The server enforces tier + quota.
      // Until the AI model is funded/available, the service returns a local
      // fallback (provider "local"), which we treat as "no live AI yet" and
      // keep showing the rich V3 briefing.
      setPersonalAILoading(true);
      setPersonalAIError(null);
      try {
        const result = await requestPersonalAIResponse({
          // Keep the Home orchestration request neutral. The visible context
          // bundle still carries the recommendation details, but health and
          // other safety labels in that bundle must not be mistaken for a
          // user's request for sensitive personal advice.
          message: `Write today's NurAI Home guidance around the current recommendation "${plan.main.title}". Use the latest visible activity and personalisation signals supplied below, make the reason concrete, and avoid generic welcome-back language unless the session explicitly says the user returned after a multi-day gap.`,
          surface: "home",
          feature: "home",
          userTier: personalAITier,
          userProfile: {
            displayName: homePersonalisationSession.displayName,
            username: user?.username,
            madhab: v3State?.profile?.madhab || profile?.madhab,
            userLevel:
              v3State?.profile?.knowledgeLevel || profile?.knowledgeLevel,
            isRevert: v3State?.profile?.isRevert === true,
            daysSinceShahada: v3State?.profile?.revertData?.daysSinceShahada,
          },
          spiritualContext: {
            emotionalState:
              homePersonalisationSession.activityState === "returned_after_gap"
                ? "returning"
                : undefined,
            streak: {
              current: Math.max(
                homeAIContext.streakDays,
                homeAIContext.dailyPlanStreak,
              ),
            },
            quranProgress: {
              currentSurah: homeAIContext.quran?.surah,
              currentAyah: homeAIContext.quran?.verse,
            },
          },
          appContext: buildPersonalAIHomeSurfaceBundle({
            context,
            tasbeeh: context.extras.tasbeeh,
            session: homePersonalisationSession,
            recommendation: {
              id: plan.main.id,
              title: plan.main.title,
              category: plan.main.category,
              reason: plan.main.reason,
            },
            feedback: homeAIFeedback,
            personalAIContext,
          }),
          featureContext: {
            recommendationId: plan.main.id,
            recommendationContextKey:
              buildHomeGuidanceContextFingerprint(context),
            category: plan.main.category,
            title: plan.main.title,
            reason: plan.main.reason,
            safeSignals: plan.main.signals,
            allowedAction: {
              label: plan.main.ctaLabel,
              route: plan.main.routeName,
            },
          },
          context: context.contextSummary,
        });
        if (personalAIRequestIdRef.current !== requestId) return;
        const usedLocalFallback =
          result.ai?.provider === "local" || result.ai?.fallbackUsed === true;
        setPersonalAIResponse(usedLocalFallback ? null : result);
        setPersonalAIError(
          usedLocalFallback
            ? personalAIUnavailableCopy(personalAITier).message
            : null,
        );
        setHomePersonalAIUpdatedAt(new Date().toISOString());
      } catch {
        if (personalAIRequestIdRef.current !== requestId) return;
        lastRequestedGuidanceKeyRef.current = null;
        setPersonalAIError(personalAIUnavailableCopy(personalAITier).message);
        setPersonalAIResponse(null);
      } finally {
        if (personalAIRequestIdRef.current === requestId) {
          setPersonalAILoading(false);
        }
      }
    },
    [
      hasPaidAPIAccess,
      homeAIFeedback,
      homePersonalAIRequestKey,
      homePersonalisationSession,
      isScholar,
      personalAIContext,
      personalAIContextReady,
      personalAITier,
      profile,
      user,
      v3State,
    ],
  );

  useEffect(() => {
    refreshHomePersonalAI();
  }, [homePersonalAIRequestKey, refreshHomePersonalAI]);

  useEffect(() => {
    homePersonalAIRefreshRef.current = refreshHomePersonalAI;
    return () => {
      if (homePersonalAIRefreshRef.current === refreshHomePersonalAI) {
        homePersonalAIRefreshRef.current = null;
      }
    };
  }, [refreshHomePersonalAI]);

  useEffect(() => {
    if (!hasPaidAPIAccess) {
      setHomePersonalAIUpdatedAt(null);
    }
  }, [hasPaidAPIAccess]);

  const homeAccentTheme = useMemo(() => {
    if (!hasPaidAPIAccess || skinId === "default") return undefined;
    return {
      primary: theme.primary,
      primarySoft: theme.primarySubtle,
      primaryBorder: theme.primaryBorder,
      primaryText: theme.primaryText,
      gradientStart: theme.gradientStart,
      gradientEnd: theme.gradientEnd,
      gold: theme.scholar,
      surface: theme.surfaceGlass,
      skinId,
    };
  }, [
    hasPaidAPIAccess,
    skinId,
    theme.gradientEnd,
    theme.gradientStart,
    theme.primary,
    theme.primaryBorder,
    theme.primarySubtle,
    theme.primaryText,
    theme.scholar,
    theme.surfaceGlass,
  ]);

  const handleTilePress = useCallback(
    (tile: QuickTile) => {
      if (tile.screen === "Quran") {
        navigation.navigate("Main", { screen: "Quran" });
      } else if (tile.screen === "Community") {
        navigation.navigate("Main", { screen: "Community" });
      } else {
        navigation.navigate(tile.screen);
      }
    },
    [navigation],
  );

  const handleJourneyAction = useCallback(
    (action: DailyJourneyAction) => {
      trackFeature(action.screen);
      if (action.screen === "Quran") {
        navigation.navigate("Main", { screen: "Quran" });
      } else if (action.screen === "Community") {
        navigation.navigate("Main", { screen: "Community" });
      } else {
        navigation.navigate(action.screen as never, action.params as never);
      }
    },
    [navigation, trackFeature],
  );

  const [customSlotIds, setCustomSlotIds] =
    useState<string[]>(DEFAULT_SLOT_IDS);
  const [recentQuickAccessIds, setRecentQuickAccessIds] = useState<string[]>(
    [],
  );
  const [editMode, setEditMode] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(QUICK_ACCESS_STORAGE_KEY).then((val) => {
      if (val) {
        try {
          const parsed: unknown = JSON.parse(val);
          const normalized = normalizeQuickAccessSlots(parsed);
          setCustomSlotIds(normalized);
          if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
            syncedSetItem(
              QUICK_ACCESS_STORAGE_KEY,
              JSON.stringify(normalized),
            ).catch(() => {});
          }
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(QUICK_ACCESS_RECENTS_KEY).then((val) => {
      if (!val) return;
      try {
        const parsed: unknown = JSON.parse(val);
        if (!Array.isArray(parsed)) return;
        const recentIds = parsed
          .filter(
            (id, index): id is string =>
              typeof id === "string" &&
              FEATURE_MAP.has(id) &&
              parsed.indexOf(id) === index,
          )
          .slice(0, 6);
        setRecentQuickAccessIds(recentIds);
      } catch {}
    });
  }, []);

  const recordQuickAccessRecent = useCallback((featureId: string) => {
    setRecentQuickAccessIds((current) => {
      const next = [
        featureId,
        ...current.filter((id) => id !== featureId),
      ].slice(0, 6);
      syncedSetItem(QUICK_ACCESS_RECENTS_KEY, JSON.stringify(next)).catch(
        () => {},
      );
      return next;
    });
  }, []);

  const saveSlots = useCallback(async (ids: string[]) => {
    const normalized = normalizeQuickAccessSlots(ids);
    setCustomSlotIds(normalized);
    await syncedSetItem(QUICK_ACCESS_STORAGE_KEY, JSON.stringify(normalized));
  }, []);

  const quickTiles = useMemo(() => {
    return customSlotIds
      .map((id) => FEATURE_MAP.get(id))
      .filter(Boolean) as FeatureDef[];
  }, [customSlotIds]);
  const homeQuickAccessItems = useMemo<HomeQuickAccessItem[]>(
    () =>
      quickTiles.map((tile) => ({
        id: tile.id,
        icon: tile.icon,
        label: tile.label,
        category: tile.category,
        liveValue: quickAccessLiveValue(tile.id, {
          nextPrayer: prayerData.nextPrayer,
          nextPrayerTime: prayerData.nextPrayerTime,
          minutesToNextPrayer,
          readingProgress,
          qiblaDegrees,
          qiblaFeedbackLabel,
          qiblaHeadingAvailable: qiblaDeviceHeading != null,
          qiblaAligned,
          tasbeeh: homeTasbeehState,
        }),
      })),
    [
      homeTasbeehState,
      minutesToNextPrayer,
      prayerData.nextPrayer,
      prayerData.nextPrayerTime,
      qiblaAligned,
      qiblaDegrees,
      qiblaDeviceHeading,
      qiblaFeedbackLabel,
      quickTiles,
      readingProgress,
    ],
  );
  const allHomeQuickAccessItems = useMemo<HomeQuickAccessItem[]>(
    () =>
      ALL_FEATURES.map((feature) => ({
        id: feature.id,
        icon: feature.icon,
        label: feature.label,
        category: feature.category,
      })),
    [],
  );

  const homeRecentMedia = useMemo<HomeRecentMediaSession | null>(() => {
    if (!recentMediaSession) return null;
    return {
      kind: recentMediaSession.kind,
      title: recentMediaSession.title,
      subtitle: recentMediaSession.subtitle,
      detailLabel: recentMediaSession.detailLabel,
    };
  }, [recentMediaSession]);

  const handleSlotTap = (index: number) => {
    if (editMode) {
      Haptics.selectionAsync().catch(() => {});
      setEditingSlotIndex(index);
      setPickerVisible(true);
    }
  };

  const handlePickFeature = (featureId: string) => {
    if (editingSlotIndex === null) return;
    const newSlots = [...customSlotIds];
    const existingIndex = newSlots.indexOf(featureId);
    if (existingIndex !== -1 && existingIndex !== editingSlotIndex) {
      newSlots[existingIndex] = newSlots[editingSlotIndex];
    }
    newSlots[editingSlotIndex] = featureId;
    Haptics.selectionAsync().catch(() => {});
    saveSlots(newSlots);
    setPickerVisible(false);
    setEditingSlotIndex(null);
  };

  const handleQuickAccessReplace = useCallback(
    (slotIndex: number, featureId: string) => {
      if (
        slotIndex < 0 ||
        slotIndex >= QUICK_ACCESS_SLOT_COUNT ||
        !FEATURE_MAP.has(featureId)
      ) {
        return;
      }
      const newSlots = [...customSlotIds];
      const existingIndex = newSlots.indexOf(featureId);
      if (existingIndex !== -1 && existingIndex !== slotIndex) {
        newSlots[existingIndex] = newSlots[slotIndex];
      }
      newSlots[slotIndex] = featureId;
      Haptics.selectionAsync().catch(() => {});
      saveSlots(newSlots);
    },
    [customSlotIds, saveSlots],
  );

  const handleQuickAccessMove = useCallback(
    (slotIndex: number, direction: -1 | 1) => {
      const targetIndex = slotIndex + direction;
      if (
        slotIndex < 0 ||
        slotIndex >= customSlotIds.length ||
        targetIndex < 0 ||
        targetIndex >= customSlotIds.length
      ) {
        return;
      }
      const newSlots = [...customSlotIds];
      [newSlots[slotIndex], newSlots[targetIndex]] = [
        newSlots[targetIndex],
        newSlots[slotIndex],
      ];
      Haptics.selectionAsync().catch(() => {});
      saveSlots(newSlots);
    },
    [customSlotIds, saveSlots],
  );

  const handleQuickAccessPress = useCallback(
    (featureId: string) => {
      const feature = FEATURE_MAP.get(featureId);
      if (!feature) return;
      Haptics.selectionAsync().catch(() => {});
      recordQuickAccessRecent(featureId);
      handleTilePress(feature);
    },
    [handleTilePress, recordQuickAccessRecent],
  );

  const handlePersonalAIHomeActionPress = useCallback(
    (briefing: PersonalIntelligenceBriefing) => {
      Haptics.selectionAsync().catch(() => {});
      const { routeName, routeParams } = briefing.primaryAction;
      const safeRoutes = new Set([
        "PrayerTimes",
        "QuranReader",
        "ArabicLearning",
        "Tasbeeh",
        "WomensHealth",
        "Settings",
        "StreakGarden",
        "Subscription",
        "GlobalSearch",
        "Duas",
        "Hifz",
        "SalahGuide",
      ]);
      if (routeName && safeRoutes.has(routeName)) {
        navigation.navigate(routeName as never, routeParams as never);
        return;
      }
      const label = briefing.primaryAction.label;
      const normalizedLabel = label.toLowerCase();
      if (
        normalizedLabel.includes("quran") ||
        normalizedLabel.includes("reader") ||
        normalizedLabel.includes("ayah")
      ) {
        handleQuickAccessPress("quran");
        return;
      }
      if (
        normalizedLabel.includes("prayer") ||
        normalizedLabel.includes("salah") ||
        normalizedLabel.includes("weather")
      ) {
        navigation.navigate("PrayerTimes");
        return;
      }
      if (
        normalizedLabel.includes("tasbeeh") ||
        normalizedLabel.includes("dhikr")
      ) {
        handleQuickAccessPress("tasbeeh");
        return;
      }
      if (normalizedLabel.includes("search")) {
        navigation.navigate("GlobalSearch");
        return;
      }
      if (normalizedLabel.includes("streak")) {
        navigation.navigate("StreakGarden");
        return;
      }
      handleQuickAccessPress("quran");
    },
    [handleQuickAccessPress, navigation],
  );

  const handlePersonalAIFeedback = useCallback(
    async (
      key: string,
      category: PersonalIntelligenceBriefing["category"],
      feedback: HomeAIFeedbackValue,
    ) => {
      const next = await recordHomeAIFeedback({ key, category, feedback });
      setHomeAIFeedback(next);
      Haptics.selectionAsync().catch(() => {});
    },
    [],
  );

  const handleRecentMediaPress = useCallback(
    (_session: HomeRecentMediaSession) => {
      if (!recentMediaSession) return;
      Haptics.selectionAsync().catch(() => {});
      trackFeature(recentMediaSession.route);
      navigation.navigate(
        recentMediaSession.route as never,
        recentMediaSession.params as never,
      );
    },
    [navigation, recentMediaSession, trackFeature],
  );

  const handleV3NudgeAction = useCallback(
    (route: string, params?: Record<string, unknown>) => {
      Haptics.selectionAsync().catch(() => {});
      navigation.navigate(route as never, params as never);
    },
    [navigation],
  );

  const handleV3NudgeDismiss = useCallback(
    (nudgeId: string) => {
      v3RespondToNudge(nudgeId, false).catch(() => {});
    },
    [v3RespondToNudge],
  );

  const handleResetDefaults = () => {
    Haptics.selectionAsync().catch(() => {});
    saveSlots([...DEFAULT_SLOT_IDS]);
    setPickerVisible(false);
    setEditingSlotIndex(null);
    setEditMode(false);
  };

  const renderTabContent = () => {
    if (selectedTab === "Reading") {
      return (
        <Pressable
          onPress={() => {
            if (readingProgress) {
              navigation.navigate("QuranReader", {
                surahNumber: readingProgress.surah,
                initialVerse: readingProgress.verse,
              });
            } else {
              navigation.navigate("Main", { screen: "Quran" });
            }
          }}
          testID="button-continue-reading"
        >
          <LinearGradient
            colors={[theme.gradientMid, theme.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.readingCard}
          >
            <View style={styles.readingPatternOverlay}>
              <View
                style={[
                  styles.patternDot,
                  {
                    top: 8,
                    right: 40,
                    backgroundColor: theme.onGradientOverlay,
                  },
                ]}
              />
              <View
                style={[
                  styles.patternDot,
                  {
                    top: 24,
                    right: 80,
                    backgroundColor: theme.onGradientOverlay,
                  },
                ]}
              />
              <View
                style={[
                  styles.patternDot,
                  {
                    bottom: 12,
                    right: 20,
                    backgroundColor: theme.onGradientOverlay,
                  },
                ]}
              />
              <View
                style={[
                  styles.patternDot,
                  {
                    bottom: 8,
                    left: "50%",
                    backgroundColor: theme.onGradientOverlay,
                  },
                ]}
              />
            </View>
            <View style={styles.readingCardContent}>
              <View style={styles.readingCardLeft}>
                <View>
                  <Text
                    style={[styles.readingTitle, { color: theme.onGradient }]}
                  >
                    {readingProgress ? "Continue Reading" : "Start Reading"}
                  </Text>
                  <Text
                    style={[
                      styles.readingSubtitle,
                      { color: theme.onGradient },
                    ]}
                  >
                    {readingProgress ? readingProgress.surahName : "Open Quran"}
                  </Text>
                  {readingProgress ? (
                    <Text
                      style={[
                        styles.readingArabic,
                        { color: theme.onGradientMuted },
                      ]}
                    >
                      {SURAH_ARABIC[readingProgress.surah] || ""}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.progressRingWrap}>
                {(() => {
                  const pct = quranStats
                    ? quranStats.totalPercentage
                    : readingProgress
                      ? Math.min(
                          Math.round(
                            (readingProgress.totalVersesRead / 6236) * 100,
                          ),
                          100,
                        )
                      : 0;
                  const radius = 26;
                  const stroke = 4;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset =
                    circumference - (pct / 100) * circumference;
                  return (
                    <View style={styles.progressRingContainer}>
                      <Svg width={60} height={60}>
                        <Circle
                          cx={30}
                          cy={30}
                          r={radius}
                          stroke={theme.onGradientOverlayStrong}
                          strokeWidth={stroke}
                          fill="none"
                        />
                        <Circle
                          cx={30}
                          cy={30}
                          r={radius}
                          stroke={theme.onGradient}
                          strokeWidth={stroke}
                          fill="none"
                          strokeDasharray={`${circumference} ${circumference}`}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          transform={`rotate(-90 30 30)`}
                        />
                      </Svg>
                      <View style={styles.progressRingText}>
                        <Text
                          style={[
                            styles.progressPercent,
                            { color: theme.onGradient },
                          ]}
                        >
                          {pct}
                        </Text>
                        <Text
                          style={[
                            styles.progressPercentSign,
                            { color: theme.onGradientMuted },
                          ]}
                        >
                          %
                        </Text>
                      </View>
                    </View>
                  );
                })()}
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      );
    }

    if (selectedTab === "Hadith") {
      return (
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark
                ? theme.surfaceGlass
                : theme.surfaceGlassStrong,
              borderColor: theme.borderSubtle,
            },
            !isDark ? Shadows.softCard : undefined,
          ]}
        >
          <View style={styles.hadithHeader}>
            <AppIcon name="book" size={18} color={theme.primary} />
            <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
              Daily Hadith
            </ThemedText>
          </View>
          <ThemedText
            type="body"
            style={[styles.hadithText, { color: theme.textSecondary }]}
          >
            The Prophet (peace be upon him) said: &quot;The best among you are
            those who learn the Quran and teach it.&quot;
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            — Sahih al-Bukhari 5027
          </ThemedText>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark
              ? theme.surfaceGlass
              : theme.surfaceGlassStrong,
            borderColor: theme.borderSubtle,
          },
          !isDark ? Shadows.softCard : undefined,
        ]}
      >
        <View style={styles.hadithHeader}>
          <AppIcon name="heart" size={18} color={theme.primary} />
          <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
            Daily Dua
          </ThemedText>
        </View>
        <ThemedText
          type="body"
          style={{
            color: theme.text,
            textAlign: "right",
            fontSize: 22,
            lineHeight: 36,
            fontFamily: "PlusJakartaSans_400Regular",
            marginBottom: Spacing.sm,
          }}
        >
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </ThemedText>
        <ThemedText
          type="small"
          style={{
            color: theme.primary,
            fontStyle: "italic",
            marginBottom: Spacing.xs,
          }}
        >
          Bismillahir Rahmanir Raheem
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          In the name of Allah, the Most Gracious, the Most Merciful.
        </ThemedText>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: "#04060C" }]}>
      <StatusBar style="light" backgroundColor="#04060C" />
      <Aurora />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 0,
            paddingBottom: insets.bottom + 132,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <GeneratedHomeExperience
          userName={user?.displayName}
          locationLabel={location.cityName || "Your location"}
          hijriDateLabel={
            v3State
              ? `${formatHijriDisplayDay(v3State.hijriDate.day)} ${v3State.hijriDate.monthName} ${v3State.hijriDate.year}`
              : getHijriDate()
          }
          gregorianDateLabel={currentTime.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          prayerName={PRAYER_NAMES[prayerData.nextPrayer] || "\u2014"}
          prayerTimeLabel={
            prayerData.nextPrayerTime
              ? formatPrayerTime(prayerData.nextPrayerTime)
              : "\u2014"
          }
          nextPrayerTime={prayerData.nextPrayerTime}
          currentTime={currentTime}
          qiblaDegrees={qiblaDegrees}
          qiblaPointerDegrees={qiblaPointerDegrees}
          qiblaFeedbackLabel={qiblaFeedbackLabel}
          qiblaAligned={qiblaAligned}
          qiblaHeadingAvailable={qiblaDelta != null}
          weather={weather}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
          streakDays={streakData.currentStreak}
          checkedDays={streakData.checkedDays}
          todayDayIndex={todayDayIndex}
          accentTheme={homeAccentTheme}
          personalPlan={personalHomePlan}
          dailyJourney={dailyJourney}
          quranDailyHandoff={homeQuranDailyHandoff}
          quranReflectionCircleSummary={quranReflectionSummary}
          personalAITier={personalAITier}
          personalAIBriefing={homePersonalAIBriefing}
          personalAIResponse={personalAIResponse}
          personalAILoading={personalAILoading}
          personalAIError={personalAIError}
          personalAIUpdatedAt={homePersonalAIUpdatedAt}
          homeHealth={homeAIContext.extras.health}
          homeTasbeeh={homeTasbeehState}
          pulseItems={homePulseItems}
          recentMedia={homeRecentMedia}
          v3Greeting={v3State?.greeting}
          v3Nudge={liveRelevantV3Nudge}
          onPrayerPress={() => navigation.navigate("PrayerTimes")}
          onQiblaPress={() => navigation.navigate("Qibla")}
          onWeatherPress={() => loadWeather("manual")}
          onUpgradePress={() =>
            navigation.navigate("Subscription", { initialTab: "premium" })
          }
          onV3NudgeDismiss={handleV3NudgeDismiss}
          onV3NudgeAction={handleV3NudgeAction}
          onPulseComplete={toggleTaskCompletion}
          onPulseViewAll={() => setShowAddModal(true)}
          quickAccessItems={homeQuickAccessItems}
          allQuickAccessItems={allHomeQuickAccessItems}
          recentQuickAccessIds={recentQuickAccessIds}
          onQuickAccessPress={handleQuickAccessPress}
          onRecentMediaPress={handleRecentMediaPress}
          onQuickAccessReplace={handleQuickAccessReplace}
          onQuickAccessMove={handleQuickAccessMove}
          onQuickAccessReset={handleResetDefaults}
          onPersonalAIRefresh={() => refreshHomePersonalAI({ force: true })}
          onPersonalAIActionPress={handlePersonalAIHomeActionPress}
          onPersonalAIFeedback={handlePersonalAIFeedback}
          onGardenPress={() => navigation.navigate("StreakGarden")}
          onFamilyPress={() => navigation.navigate("FamilyGroup")}
          onSearchPress={() => {
            Haptics.selectionAsync().catch(() => {});
            navigation.navigate("GlobalSearch");
          }}
          onPersonalGuidePress={(prompt) => {
            Haptics.selectionAsync().catch(() => {});
            const firstPromptLine = prompt
              ?.split(/\r?\n/)
              .map((line) => line.trim())
              .find(Boolean);
            const internalPrompt =
              !firstPromptLine ||
              /^(?:mode|location\/date|prayer settings|profile guidance|prayer|daily actions|quran(?: pace)?|arabic|saved ai answers|travel|body care|weather|dhikr|women's health|notifications)\s*:/i.test(
                firstPromptLine,
              ) ||
              /\bsubscription\s*:/i.test(firstPromptLine);
            const visiblePrompt =
              !internalPrompt && firstPromptLine
                ? firstPromptLine.replace(
                    "NurAI home recommendation",
                    "recommendation",
                  )
                : "Help me choose one clear next step today.";
            navigation.navigate("PersonalGuide", {
              visiblePrompt,
              recommendationTitle: homePersonalAIBriefing.title,
              recommendationBody: homePersonalAIBriefing.fullBody,
              initialInsight: {
                id: homePersonalAIBriefing.id,
                title: homePersonalAIBriefing.title,
                body: homePersonalAIBriefing.fullBody,
                sourceLabel: homePersonalAIBriefing.sourceLabel,
                safetyNote: homePersonalAIBriefing.safetyNote,
              },
              weeklyReview: homePersonalGuideWeeklyReview,
              privateContextLines: buildPersonalGuideContextLines(
                homeAIContext,
                homePersonalGuideWeeklyReview,
              ),
              contextLine: `${PRAYER_NAMES[prayerData.nextPrayer] || "Next prayer"} at ${
                prayerData.nextPrayerTime
                  ? formatPrayerTime(prayerData.nextPrayerTime)
                  : "the next prayer window"
              }`,
            });
          }}
          onScholarReviewPress={() => {
            Haptics.selectionAsync().catch(() => {});
            trackFeature("Subscription");
            navigation.navigate("Subscription", { initialTab: "scholar" });
          }}
          onPersonalPlanControlsPress={() => {
            Haptics.selectionAsync().catch(() => {});
            trackFeature("Settings");
            navigation.navigate("Settings");
          }}
          onJourneyActionPress={handleJourneyAction}
          topInset={insets.top}
        />

        {SHOW_LEGACY_HOME_FEED && dailyJourney && currentNudge && v3State ? (
          <>
            <Animated.View
              entering={FadeInDown.delay(200).duration(400)}
              style={styles.tabsSection}
            >
              <View style={styles.tabsRow}>
                {CONTENT_TABS.map((tab) => {
                  const isSelected = selectedTab === tab;
                  return (
                    <Pressable
                      key={tab}
                      onPress={() => setSelectedTab(tab)}
                      style={[
                        styles.tabPill,
                        isSelected
                          ? { backgroundColor: theme.primary }
                          : {
                              backgroundColor: "transparent",
                              borderWidth: 1,
                              borderColor: theme.border,
                            },
                      ]}
                      testID={`tab-${tab.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      <Text
                        style={[
                          styles.tabPillText,
                          {
                            color: isSelected
                              ? theme.buttonText
                              : theme.textSecondary,
                            fontFamily: "PlusJakartaSans_600SemiBold",
                          },
                        ]}
                      >
                        {tab}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {renderTabContent()}
            </Animated.View>

            {dailyJourney ? (
              <Animated.View
                entering={FadeInDown.delay(240).duration(400)}
                style={styles.journeySection}
              >
                <View style={styles.journeyHeaderRow}>
                  <View>
                    <Text
                      style={[styles.journeyEyebrow, { color: theme.scholar }]}
                    >
                      Daily Deen Journey
                    </Text>
                    <ThemedText type="h3" style={styles.journeyTitle}>
                      {dailyJourney.title}
                    </ThemedText>
                  </View>
                  <View style={styles.journeyHeaderActions}>
                    <Pressable
                      onPress={() => setGoalsModalVisible(true)}
                      hitSlop={10}
                      style={({ pressed }) => [
                        styles.journeyTuneButton,
                        {
                          backgroundColor: theme.surfaceGlass,
                          borderColor: theme.borderSubtle,
                        },
                        pressed
                          ? { opacity: 0.7, transform: [{ scale: 0.98 }] }
                          : null,
                      ]}
                      accessibilityLabel="Customize Daily Deen goals"
                      testID="button-customize-daily-goals"
                    >
                      <AppIcon name="sliders" size={14} color={theme.primary} />
                    </Pressable>
                    <View
                      style={[
                        styles.journeyProgressPill,
                        {
                          backgroundColor: theme.primaryMuted,
                          borderColor: theme.primaryBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.journeyProgressText,
                          { color: theme.primaryText },
                        ]}
                      >
                        {dailyJourney.completionPercent}%
                      </Text>
                    </View>
                  </View>
                </View>

                {dailyJourney.progressSegments.length > 0 ? (
                  <View style={styles.journeySegmentsRow}>
                    {dailyJourney.progressSegments.map((segment) => (
                      <View
                        key={segment.id}
                        style={[
                          styles.journeySegment,
                          {
                            backgroundColor: theme.surfaceGlass,
                            borderColor: theme.borderSubtle,
                          },
                        ]}
                      >
                        <View style={styles.journeySegmentTop}>
                          <Text
                            style={[
                              styles.journeySegmentLabel,
                              { color: theme.textSecondary },
                            ]}
                            numberOfLines={1}
                          >
                            {segment.label}
                          </Text>
                          <Text
                            style={[
                              styles.journeySegmentCount,
                              { color: theme.primary },
                            ]}
                          >
                            {segment.completed}/{segment.total}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.journeySegmentTrack,
                            { backgroundColor: theme.backgroundTertiary },
                          ]}
                        >
                          <View
                            style={[
                              styles.journeySegmentFill,
                              {
                                backgroundColor: theme.primary,
                                width: `${segment.percent}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                <Pressable
                  onPress={() =>
                    handleJourneyAction(dailyJourney.primaryAction)
                  }
                  testID="button-daily-deen-primary"
                >
                  <LinearGradient
                    colors={[
                      theme.backgroundTertiary,
                      theme.backgroundSecondary,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.journeyPrimaryCard,
                      { borderColor: theme.primaryBorder },
                    ]}
                  >
                    <View
                      style={[
                        styles.journeyIconWrap,
                        {
                          backgroundColor: theme.primaryMuted,
                          borderColor: theme.primaryBorder,
                        },
                      ]}
                    >
                      <AppIcon
                        name={dailyJourney.primaryAction.icon as AppIconName}
                        size={20}
                        color={theme.primary}
                      />
                    </View>
                    <View style={styles.journeyPrimaryText}>
                      <Text
                        style={[styles.journeyReason, { color: theme.scholar }]}
                      >
                        {dailyJourney.primaryAction.reason}
                      </Text>
                      <ThemedText type="h4" style={styles.journeyActionTitle}>
                        {dailyJourney.primaryAction.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={[
                          styles.journeyActionSubtitle,
                          { color: theme.textMuted },
                        ]}
                      >
                        {dailyJourney.primaryAction.subtitle}
                      </ThemedText>
                    </View>
                    <View style={styles.journeyActionRight}>
                      {dailyJourney.primaryAction.rewardLabel ? (
                        <Text
                          style={[
                            styles.journeyReward,
                            { color: theme.primary },
                          ]}
                        >
                          {dailyJourney.primaryAction.rewardLabel}
                        </Text>
                      ) : null}
                      <AppIcon
                        name="arrow-right"
                        size={18}
                        color={theme.primary}
                      />
                    </View>
                  </LinearGradient>
                </Pressable>

                <View style={styles.journeyMiniRow}>
                  {dailyJourney.actions.slice(1, 4).map((action) => (
                    <Pressable
                      key={action.id}
                      onPress={() => handleJourneyAction(action)}
                      style={[
                        styles.journeyMiniAction,
                        {
                          backgroundColor: theme.surfaceGlass,
                          borderColor: theme.borderSubtle,
                        },
                      ]}
                    >
                      <AppIcon
                        name={action.icon as AppIconName}
                        size={14}
                        color={theme.primary}
                      />
                      <Text
                        style={[
                          styles.journeyMiniText,
                          { color: theme.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {action.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            ) : null}

            <Modal
              visible={goalsModalVisible}
              animationType="slide"
              transparent
              onRequestClose={() => setGoalsModalVisible(false)}
            >
              <View
                style={[
                  styles.goalsModalOverlay,
                  { backgroundColor: theme.modalBackdrop },
                ]}
              >
                <View
                  style={[
                    styles.goalsModalSheet,
                    {
                      backgroundColor: theme.backgroundRoot,
                      paddingBottom: insets.bottom + Spacing.lg,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.pickerHandle,
                      { backgroundColor: theme.handleBar },
                    ]}
                  />
                  <View style={styles.goalsModalHeader}>
                    <View>
                      <Text
                        style={[
                          styles.journeyEyebrow,
                          { color: theme.scholar },
                        ]}
                      >
                        Personalised Today
                      </Text>
                      <ThemedText type="h4">Daily Goals</ThemedText>
                    </View>
                    <Pressable
                      onPress={() => setGoalsModalVisible(false)}
                      hitSlop={12}
                      testID="button-close-daily-goals"
                    >
                      <AppIcon name="x" size={22} color={theme.textMuted} />
                    </Pressable>
                  </View>
                  <Text
                    style={[
                      styles.goalsModalIntro,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Choose what NurAI should prioritise on your Home screen.
                    This stays on this device and does not change your plan.
                  </Text>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.goalsModalContent}
                  >
                    {customGoals.map((goal) => {
                      const enabled = goal.enabled;
                      const iconName =
                        goal.category === "prayer"
                          ? "clock"
                          : goal.category === "quran"
                            ? "book-open"
                            : goal.category === "arabic"
                              ? "type"
                              : goal.category === "charity"
                                ? "heart"
                                : goal.category === "learning"
                                  ? "book"
                                  : "edit-3";
                      return (
                        <View
                          key={goal.id}
                          style={[
                            styles.goalPreferenceRow,
                            {
                              backgroundColor: enabled
                                ? theme.surfaceGlass
                                : theme.backgroundSecondary,
                              borderColor: enabled
                                ? theme.borderSubtle
                                : `${theme.borderSubtle}88`,
                            },
                          ]}
                        >
                          <Pressable
                            onPress={() =>
                              updateCustomGoal(goal.id, (current) => ({
                                ...current,
                                enabled: !current.enabled,
                              }))
                            }
                            style={styles.goalPreferenceMain}
                            testID={`button-toggle-goal-${goal.category}`}
                          >
                            <View
                              style={[
                                styles.goalPreferenceIcon,
                                {
                                  backgroundColor: enabled
                                    ? theme.primaryMuted
                                    : theme.backgroundTertiary,
                                  borderColor: enabled
                                    ? theme.primaryBorder
                                    : theme.borderSubtle,
                                },
                              ]}
                            >
                              <AppIcon
                                name={iconName}
                                size={16}
                                color={
                                  enabled ? theme.primary : theme.textMuted
                                }
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <ThemedText
                                type="small"
                                style={{
                                  fontWeight: "700",
                                  color: enabled ? theme.text : theme.textMuted,
                                }}
                              >
                                {goal.label}
                              </ThemedText>
                              <Text
                                style={[
                                  styles.goalPreferenceMeta,
                                  { color: theme.textMuted },
                                ]}
                              >
                                {enabled
                                  ? "Shown in Today"
                                  : "Hidden from Today"}
                              </Text>
                            </View>
                          </Pressable>
                          <View style={styles.goalTargetControls}>
                            <Pressable
                              onPress={() =>
                                updateCustomGoal(goal.id, (current) => ({
                                  ...current,
                                  targetPerWeek: Math.max(
                                    1,
                                    (current.targetPerWeek || 1) - 1,
                                  ),
                                }))
                              }
                              disabled={!enabled}
                              style={[
                                styles.goalStepButton,
                                {
                                  backgroundColor: theme.backgroundTertiary,
                                  opacity: enabled ? 1 : 0.35,
                                },
                              ]}
                              testID={`button-goal-minus-${goal.category}`}
                            >
                              <AppIcon
                                name="minus"
                                size={14}
                                color={theme.textSecondary}
                              />
                            </Pressable>
                            <Text
                              style={[
                                styles.goalTargetText,
                                {
                                  color: enabled
                                    ? theme.primary
                                    : theme.textMuted,
                                },
                              ]}
                            >
                              {goal.targetPerWeek || 1}x
                            </Text>
                            <Pressable
                              onPress={() =>
                                updateCustomGoal(goal.id, (current) => ({
                                  ...current,
                                  targetPerWeek: Math.min(
                                    7,
                                    (current.targetPerWeek || 1) + 1,
                                  ),
                                }))
                              }
                              disabled={!enabled}
                              style={[
                                styles.goalStepButton,
                                {
                                  backgroundColor: theme.backgroundTertiary,
                                  opacity: enabled ? 1 : 0.35,
                                },
                              ]}
                              testID={`button-goal-plus-${goal.category}`}
                            >
                              <AppIcon
                                name="plus"
                                size={14}
                                color={theme.textSecondary}
                              />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            <Animated.View
              entering={FadeInDown.delay(260).duration(400)}
              style={styles.weatherSection}
            >
              <LiveWeatherCard
                weather={weather}
                loading={weatherLoading}
                gpsLoading={gpsLoading}
                error={weatherError}
                locationLabel={`${location.cityName}${
                  location.countryName ? `, ${location.countryName}` : ""
                }`}
                nextPrayerName={prayerData.nextPrayer}
                minutesToNextPrayer={minutesToNextPrayer}
                onRefresh={() => loadWeather("manual")}
                onUseGps={handleWeatherGps}
              />
            </Animated.View>

            {currentNudge ? (
              <NurAINudgeCard
                nudge={currentNudge}
                onDismiss={dismissNudge}
                onAction={(screen) => {
                  dismissNudge();
                  trackFeature(screen);
                  if (screen === "QuranReader") {
                    navigation.navigate("QuranReader", { surahNumber: 18 });
                  } else {
                    navigation.navigate(screen as never);
                  }
                }}
              />
            ) : null}

            {v3State && v3State.nudges.length > 0
              ? v3State.nudges.slice(0, 2).map((nudge) => (
                  <NurAINudgeV3Card
                    key={nudge.id}
                    nudge={nudge}
                    onDismiss={(id) => {
                      v3RespondToNudge(id, false);
                    }}
                    onAction={(route, params) => {
                      v3RespondToNudge(nudge.id, true);
                      trackFeature(route);
                      navigation.navigate(route as never, params);
                    }}
                  />
                ))
              : null}

            {v3State && v3State.dailyMotivation.text ? (
              <V3DailyMotivationCard motivation={v3State.dailyMotivation} />
            ) : null}

            {isNearRamadan().isActive ? (
              <Animated.View entering={FadeInDown.delay(280).duration(400)}>
                <Pressable
                  onPress={() => navigation.navigate("Ramadan")}
                  testID="button-ramadan-seasonal"
                >
                  <LinearGradient
                    colors={
                      isDark
                        ? [
                            CategoryColors.purple.dark.text,
                            CategoryColors.violet.dark.text,
                          ]
                        : [
                            CategoryColors.violet.dark.text,
                            CategoryColors.purple.text,
                          ]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.ramadanBanner}
                  >
                    <View style={styles.ramadanBannerContent}>
                      <View style={styles.ramadanBannerLeft}>
                        <View
                          style={[
                            styles.ramadanIconCircle,
                            { backgroundColor: theme.onGradientOverlayStrong },
                          ]}
                        >
                          <AppIcon
                            name="moon"
                            size={20}
                            color={theme.onGradient}
                          />
                        </View>
                        <View>
                          <Text
                            style={[
                              styles.ramadanBannerTitle,
                              { color: theme.onGradient },
                            ]}
                          >
                            {isNearRamadan().daysUntil === 0
                              ? "Ramadan Mubarak"
                              : "Ramadan is Coming"}
                          </Text>
                          <Text
                            style={[
                              styles.ramadanBannerSubtitle,
                              { color: theme.onGradientMuted },
                            ]}
                          >
                            {isNearRamadan().daysUntil === 0
                              ? "Track your fasting, prayers & goals"
                              : `${isNearRamadan().daysUntil} days until Ramadan`}
                          </Text>
                        </View>
                      </View>
                      <AppIcon
                        name="chevron-right"
                        size={20}
                        color={theme.onGradientMuted}
                      />
                    </View>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            ) : null}

            <Animated.View
              entering={FadeInDown.delay(300).duration(400)}
              style={styles.quickAccessSection}
            >
              <View style={styles.sectionHeader}>
                <SectionHeader
                  title="Quick Access"
                  style={{ flex: 1, paddingHorizontal: 0, marginBottom: 0 }}
                />
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setEditMode(!editMode);
                  }}
                  hitSlop={12}
                  style={({ pressed }) => [
                    styles.editBtn,
                    {
                      backgroundColor: editMode
                        ? isDark
                          ? theme.gradientStart
                          : theme.gradientLightBg
                        : "transparent",
                    },
                    pressed && { opacity: 0.6 },
                  ]}
                  testID="button-edit-quick-access"
                >
                  <AppIcon
                    name={editMode ? "check" : "edit-2"}
                    size={16}
                    color={editMode ? theme.primary : theme.textMuted}
                  />
                </Pressable>
              </View>
              <View style={styles.tilesGrid}>
                {quickTiles.map((tile: QuickTile, index: number) => {
                  const catColor = isDark
                    ? ThemedCategoryColors[tile.color].dark
                    : ThemedCategoryColors[tile.color];
                  return (
                    <Pressable
                      key={`slot-${index}`}
                      onPress={() =>
                        editMode ? handleSlotTap(index) : handleTilePress(tile)
                      }
                      onLongPress={() => {
                        if (!editMode) setEditMode(true);
                      }}
                      style={({ pressed }) => [
                        styles.tile,
                        {
                          backgroundColor: isDark
                            ? catColor.bg + "18"
                            : catColor.text + "08",
                          borderColor: editMode
                            ? theme.primary + "50"
                            : isDark
                              ? catColor.text + "12"
                              : catColor.text + "15",
                        },
                        editMode ? { borderStyle: "dashed" as any } : null,
                        pressed ? { opacity: 0.7 } : null,
                      ]}
                      testID={`tile-${tile.label.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      {editMode ? (
                        <View
                          style={[
                            styles.editBadge,
                            { backgroundColor: theme.primary },
                          ]}
                        >
                          <AppIcon
                            name="repeat"
                            size={10}
                            color={theme.buttonText}
                          />
                        </View>
                      ) : null}
                      <View
                        style={[
                          styles.tileIcon,
                          {
                            backgroundColor: isDark
                              ? catColor.text + "15"
                              : catColor.text + "12",
                          },
                        ]}
                      >
                        <AppIcon
                          name={tile.icon}
                          size={20}
                          color={catColor.text}
                        />
                      </View>
                      <ThemedText
                        type="caption"
                        style={[
                          styles.tileLabel,
                          {
                            color: isDark ? catColor.text : theme.textSecondary,
                          },
                        ]}
                      >
                        {tile.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            <Modal
              visible={pickerVisible}
              animationType="slide"
              transparent
              onRequestClose={() => {
                setPickerVisible(false);
                setEditingSlotIndex(null);
              }}
            >
              <View
                style={[
                  styles.pickerOverlay,
                  { backgroundColor: theme.modalBackdrop },
                ]}
              >
                <View
                  style={[
                    styles.pickerSheet,
                    { backgroundColor: theme.backgroundRoot },
                  ]}
                >
                  <View
                    style={[
                      styles.pickerHandle,
                      { backgroundColor: theme.handleBar },
                    ]}
                  />
                  <View style={styles.pickerHeader}>
                    <ThemedText type="h4">Choose Feature</ThemedText>
                    <Pressable
                      onPress={() => {
                        setPickerVisible(false);
                        setEditingSlotIndex(null);
                      }}
                      hitSlop={12}
                      testID="button-close-picker"
                    >
                      <AppIcon name="x" size={22} color={theme.textMuted} />
                    </Pressable>
                  </View>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.pickerContent}
                  >
                    {FEATURE_CATEGORIES.map((cat) => {
                      const features = ALL_FEATURES.filter(
                        (f) => f.category === cat,
                      );
                      return (
                        <View key={cat} style={styles.pickerCategory}>
                          <ThemedText
                            type="caption"
                            style={[
                              styles.pickerCatLabel,
                              { color: theme.textMuted },
                            ]}
                          >
                            {cat.toUpperCase()}
                          </ThemedText>
                          <View style={styles.pickerGrid}>
                            {features.map((f) => {
                              const isActive = customSlotIds.includes(f.id);
                              const cc = isDark
                                ? ThemedCategoryColors[f.color].dark
                                : ThemedCategoryColors[f.color];
                              return (
                                <Pressable
                                  key={f.id}
                                  style={({ pressed }) => [
                                    styles.pickerItem,
                                    {
                                      backgroundColor: theme.cardBackground,
                                      borderColor: isActive
                                        ? theme.primary + "60"
                                        : theme.borderLight,
                                    },
                                    pressed && { opacity: 0.7 },
                                  ]}
                                  onPress={() => handlePickFeature(f.id)}
                                  testID={`picker-${f.id}`}
                                >
                                  {isActive ? (
                                    <View
                                      style={[
                                        styles.pickerCheck,
                                        { backgroundColor: theme.primary },
                                      ]}
                                    >
                                      <AppIcon
                                        name="check"
                                        size={8}
                                        color={theme.buttonText}
                                      />
                                    </View>
                                  ) : null}
                                  <View
                                    style={[
                                      styles.pickerItemIcon,
                                      { backgroundColor: cc.bg },
                                    ]}
                                  >
                                    <AppIcon
                                      name={f.icon}
                                      size={18}
                                      color={cc.text}
                                    />
                                  </View>
                                  <ThemedText
                                    type="caption"
                                    style={[
                                      styles.pickerItemLabel,
                                      { color: theme.text },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {f.label}
                                  </ThemedText>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                    <Pressable
                      style={({ pressed }) => [
                        styles.resetBtn,
                        { borderColor: theme.border },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={handleResetDefaults}
                      testID="button-reset-quick-access"
                    >
                      <AppIcon
                        name="rotate-ccw"
                        size={14}
                        color={theme.textMuted}
                      />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted }}
                      >
                        Reset to Default
                      </ThemedText>
                    </Pressable>
                  </ScrollView>
                </View>
              </View>
            </Modal>

            <Animated.View entering={FadeInDown.delay(400).duration(400)}>
              <Pressable
                onPress={() => navigation.navigate("StreakGarden")}
                testID="button-streak-garden"
              >
                <LinearGradient
                  colors={[theme.gradientLightBg, theme.gradientLightBg2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.card,
                    {
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.streakTop}>
                    <View style={styles.streakLeft}>
                      <View style={styles.streakFlameRow}>
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: BorderRadius.full,
                            backgroundColor: theme.scholarSoft,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <AppIcon name="zap" size={14} color={theme.warning} />
                        </View>
                        <ThemedText
                          type="h3"
                          style={{ marginLeft: Spacing.sm }}
                        >
                          {streakData.currentStreak > 0
                            ? `${streakData.currentStreak} Day Streak`
                            : "Start Today"}
                        </ThemedText>
                      </View>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, marginTop: 4 }}
                      >
                        {streakData.currentStreak > 0
                          ? "Your garden is growing!"
                          : "Plant your first seed today"}
                      </ThemedText>
                    </View>
                    <View style={styles.streakRight}>
                      <AppIcon
                        name="chevron-right"
                        size={18}
                        color={theme.textMuted}
                      />
                    </View>
                  </View>
                  <View style={styles.miniGardenRow}>
                    {(() => {
                      const plantStages = [
                        { min: 30, icon: "sun", color: theme.warning },
                        { min: 14, icon: "feather", color: theme.primary },
                        { min: 7, icon: "git-branch", color: theme.info },
                        {
                          min: 3,
                          icon: "trending-up",
                          color: CategoryColors.purple.dark.text,
                        },
                        { min: 1, icon: "chevrons-up", color: theme.success },
                        { min: 0, icon: "circle", color: theme.neutralMuted },
                      ];
                      const getStage = (days: number) =>
                        plantStages.find((s) => days >= s.min) ||
                        plantStages[plantStages.length - 1];
                      const sorted = [...streakData.checkedDays]
                        .sort()
                        .reverse();
                      const plants: { icon: string; color: string }[] = [];
                      let idx = 0;
                      while (plants.length < 6 && idx < sorted.length) {
                        let streak = 1;
                        while (idx + streak < sorted.length) {
                          const curr = new Date(sorted[idx + streak - 1]);
                          const prev = new Date(sorted[idx + streak]);
                          const diff =
                            (curr.getTime() - prev.getTime()) /
                            (1000 * 60 * 60 * 24);
                          if (diff === 1) {
                            streak++;
                          } else {
                            break;
                          }
                        }
                        const stage = getStage(streak);
                        plants.push({ icon: stage.icon, color: stage.color });
                        idx += streak;
                      }
                      while (plants.length < 6)
                        plants.push({
                          icon: "circle",
                          color: theme.neutralMuted,
                        });
                      return plants.slice(0, 6).map((p, i) => (
                        <View
                          key={i}
                          style={[
                            styles.miniPlant,
                            { backgroundColor: p.color + "15" },
                          ]}
                        >
                          <AppIcon
                            name={p.icon as any}
                            size={14}
                            color={p.color}
                          />
                        </View>
                      ));
                    })()}
                  </View>
                  <View style={styles.weekDots}>
                    {WEEK_DAYS.map((day, i) => {
                      const jsDay = currentTime.getDay();
                      const mapping = [1, 2, 3, 4, 5, 6, 0];
                      const currentSatOffset = mapping[jsDay];
                      const weekDate = new Date(currentTime);
                      weekDate.setDate(
                        currentTime.getDate() - currentSatOffset + i,
                      );
                      const dateStr = weekDate.toISOString().split("T")[0];
                      const isCheckedIn =
                        streakData.checkedDays.includes(dateStr);
                      const isToday = i === todayDayIndex;
                      return (
                        <View key={day} style={styles.dayDotCol}>
                          <View
                            style={[
                              styles.dayDot,
                              {
                                backgroundColor: isCheckedIn
                                  ? theme.primary
                                  : isToday
                                    ? "transparent"
                                    : isDark
                                      ? theme.backgroundTertiary
                                      : theme.backgroundSecondary,
                                borderWidth: isToday ? 2 : 0,
                                borderColor: theme.primary,
                              },
                            ]}
                          />
                          <ThemedText
                            type="caption"
                            style={{
                              color:
                                isToday || isCheckedIn
                                  ? theme.primary
                                  : theme.textMuted,
                              fontSize: 10,
                            }}
                          >
                            {day}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(500).duration(400)}
              style={{ marginTop: Spacing["2xl"] }}
            >
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark
                      ? theme.cardBackground
                      : theme.cardBackground,
                    borderColor: theme.borderSubtle,
                    overflow: "hidden",
                    padding: 0,
                  },
                  !isDark ? Shadows.softCard : undefined,
                ]}
              >
                <View
                  style={{
                    paddingHorizontal: Spacing.lg,
                    paddingTop: Spacing.lg,
                    paddingBottom: Spacing.md,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: Spacing.md,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: Spacing.sm + 2,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: BorderRadius.sm,
                          backgroundColor: theme.primaryMuted,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <AppIcon
                          name="target"
                          size={18}
                          color={theme.primary}
                        />
                      </View>
                      <View>
                        <ThemedText
                          type="h4"
                          style={{ fontSize: 17, letterSpacing: -0.3 }}
                        >
                          Daily Plan
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          style={{
                            color: theme.textMuted,
                            fontSize: 12,
                            marginTop: 1,
                          }}
                        >
                          {getDailyPlanMotivation(
                            completedCount,
                            dailyTasks.length,
                          )}
                        </ThemedText>
                      </View>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: Spacing.sm,
                      }}
                    >
                      {dailyPlanStreak > 0 ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: Spacing.xs,
                            backgroundColor: theme.scholarSoft,
                            paddingHorizontal: Spacing.sm,
                            paddingVertical: Spacing.xs,
                            borderRadius: BorderRadius.xs + 2,
                          }}
                        >
                          <AppIcon name="zap" size={12} color={theme.warning} />
                          <ThemedText
                            type="caption"
                            style={{
                              color: theme.warning,
                              fontSize: 12,
                              fontWeight: "700",
                            }}
                          >
                            {dailyPlanStreak}
                          </ThemedText>
                        </View>
                      ) : null}
                      <ThemedText
                        type="caption"
                        style={{
                          color:
                            completedCount === dailyTasks.length &&
                            dailyTasks.length > 0
                              ? theme.primary
                              : theme.textMuted,
                          fontSize: 13,
                          fontWeight: "600",
                        }}
                      >
                        {completedCount}/{dailyTasks.length}
                      </ThemedText>
                    </View>
                  </View>

                  <View
                    style={{
                      height: Spacing.xs,
                      borderRadius: Spacing.xs / 2,
                      backgroundColor: isDark
                        ? theme.borderSubtle
                        : theme.borderSubtle,
                      overflow: "hidden",
                    }}
                  >
                    <LinearGradient
                      colors={[theme.primary, theme.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        height: Spacing.xs,
                        borderRadius: Spacing.xs / 2,
                        width:
                          dailyTasks.length > 0
                            ? (`${(completedCount / dailyTasks.length) * 100}%` as any)
                            : 0,
                      }}
                    />
                  </View>
                </View>

                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: theme.borderSubtle,
                  }}
                >
                  {dailyTasks.length > 0 ? (
                    dailyTasks.map((item, idx) => (
                      <Animated.View
                        key={item.taskId}
                        layout={Layout.springify().damping(20).stiffness(200)}
                        exiting={FadeOut.duration(300)}
                        style={
                          idx > 0
                            ? {
                                borderTopWidth: 1,
                                borderTopColor: theme.borderSubtle,
                              }
                            : undefined
                        }
                      >
                        <DailyPlanTaskRow
                          task={item}
                          isCompleted={!!completedTasks[item.taskId]}
                          onToggle={() => toggleTaskCompletion(item.taskId)}
                          onDelete={() => deleteDailyTask(item.taskId)}
                          theme={theme}
                          isDark={isDark}
                        />
                      </Animated.View>
                    ))
                  ) : (
                    <View style={styles.emptyPlanState}>
                      <AppIcon
                        name="target"
                        size={32}
                        color={theme.iconMuted}
                      />
                      <ThemedText
                        type="body"
                        style={{
                          color: theme.textMuted,
                          textAlign: "center",
                          marginTop: Spacing.sm,
                          fontSize: 14,
                        }}
                      >
                        Tap + to plan your day
                      </ThemedText>
                      {getDailyPlanSuggestionsFn().length > 0 ? (
                        <View style={{ marginTop: Spacing.md, width: "100%" }}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: Spacing.xs,
                              marginBottom: Spacing.sm,
                            }}
                          >
                            <View
                              style={{
                                width: Spacing.xs,
                                height: Spacing.xs,
                                borderRadius: Spacing.xs / 2,
                                backgroundColor: theme.primary,
                              }}
                            />
                            <Text
                              style={{
                                fontSize: 10,
                                fontFamily: "PlusJakartaSans_600SemiBold",
                                color: theme.primary,
                                letterSpacing: 0.8,
                                textTransform: "uppercase",
                              }}
                            >
                              NurAI Suggests
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              justifyContent: "center",
                              gap: Spacing.sm,
                              paddingHorizontal: Spacing.sm,
                            }}
                          >
                            {getDailyPlanSuggestionsFn().map((s) => (
                              <Pressable
                                key={s.id}
                                onPress={() => {
                                  if (s.screen) {
                                    navigation.navigate(s.screen as any);
                                  } else {
                                    setNewTaskName(s.title);
                                    setNewTaskIcon(s.icon as any);
                                    setShowAddModal(true);
                                  }
                                }}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: Spacing.xs,
                                  paddingHorizontal: Spacing.sm + 2,
                                  paddingVertical: Spacing.sm,
                                  borderRadius: BorderRadius.xs + 2,
                                  backgroundColor: theme.primarySubtle,
                                  borderWidth: 1,
                                  borderColor: theme.primaryBorder,
                                }}
                              >
                                <AppIcon
                                  name={s.icon as any}
                                  size={12}
                                  color={theme.primary}
                                />
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontFamily: "PlusJakartaSans_500Medium",
                                    color: theme.primaryText,
                                  }}
                                >
                                  {s.title}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      ) : null}
                    </View>
                  )}
                  <Pressable
                    testID="button-add-task"
                    onPress={() => setShowAddModal(true)}
                    style={[
                      styles.dailyPlanAddRow,
                      {
                        borderTopWidth: 1,
                        borderTopColor: theme.borderSubtle,
                        backgroundColor: isDark
                          ? theme.surfaceGlass
                          : theme.backgroundSecondary,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.dailyPlanAddBtn,
                        { backgroundColor: theme.primaryMuted },
                      ]}
                    >
                      <AppIcon name="plus" size={18} color={theme.primary} />
                    </View>
                    <ThemedText
                      type="body"
                      style={{ color: theme.textMuted, fontSize: 14 }}
                    >
                      Add a task...
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(600).duration(400)}
              style={{ marginTop: Spacing["2xl"] }}
            >
              <Pressable
                onPress={() => navigation.navigate("FamilyGroup")}
                testID="button-family-group"
              >
                <LinearGradient
                  colors={
                    isDark
                      ? [theme.backgroundTertiary, theme.backgroundSecondary]
                      : [theme.gradientLightBg2, theme.gradientLightBg]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.card, { borderColor: theme.borderSubtle }]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={[
                        styles.dailyPlanIcon,
                        {
                          backgroundColor: isDark
                            ? theme.primaryMuted
                            : theme.primaryMuted,
                          marginRight: Spacing.md,
                        },
                      ]}
                    >
                      <AppIcon name="users" size={20} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="h4" style={{ letterSpacing: -0.3 }}>
                        Family Circle
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted }}
                      >
                        Pray together, grow together
                      </ThemedText>
                    </View>
                    <AppIcon
                      name="chevron-right"
                      size={20}
                      color={theme.textMuted}
                    />
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(700).duration(400)}
              style={{ marginTop: Spacing["2xl"] }}
            >
              <Pressable
                onPress={() =>
                  navigation.navigate("Main", { screen: "Community" })
                }
                testID="button-community-preview"
              >
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: isDark
                        ? theme.cardBackground
                        : theme.surfaceGlassStrong,
                      borderColor: theme.borderSubtle,
                      flexDirection: "row",
                      alignItems: "center",
                    },
                    !isDark ? Shadows.softCard : undefined,
                  ]}
                >
                  <View
                    style={[
                      styles.communityIconCircle,
                      {
                        backgroundColor: theme.primaryMuted,
                        borderColor: theme.primaryBorder,
                      },
                    ]}
                  >
                    <AppIcon name="users" size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <ThemedText type="h4" style={{ letterSpacing: -0.3 }}>
                      Community
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      Join supportive rooms for reminders and questions
                    </ThemedText>
                  </View>
                  <AppIcon
                    name="chevron-right"
                    size={20}
                    color={theme.textMuted}
                  />
                </View>
              </Pressable>
            </Animated.View>
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: theme.modalBackdrop },
          ]}
        >
          <Pressable
            style={styles.modalOverlayDismiss}
            onPress={() => setShowAddModal(false)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalHeader}>
                <ThemedText type="h4">New Task</ThemedText>
                <Pressable onPress={() => setShowAddModal(false)} hitSlop={8}>
                  <AppIcon name="x" size={24} color={theme.icon} />
                </Pressable>
              </View>

              <TextInput
                testID="input-new-task-name"
                style={[
                  styles.modalInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.borderLight,
                  },
                ]}
                placeholder="Task name"
                placeholderTextColor={theme.textMuted}
                value={newTaskName}
                onChangeText={setNewTaskName}
                autoFocus
              />

              <ThemedText
                type="small"
                style={{
                  color: theme.textSecondary,
                  marginTop: Spacing.lg,
                  marginBottom: Spacing.sm,
                }}
              >
                Icon
              </ThemedText>
              <View style={styles.iconGrid}>
                {TASK_ICON_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.name}
                    onPress={() => setNewTaskIcon(opt.name)}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor:
                          newTaskIcon === opt.name
                            ? theme.primaryMuted
                            : theme.backgroundSecondary,
                        borderColor:
                          newTaskIcon === opt.name
                            ? theme.primary
                            : "transparent",
                      },
                    ]}
                  >
                    <AppIcon
                      name={opt.name}
                      size={20}
                      color={
                        newTaskIcon === opt.name
                          ? theme.primary
                          : theme.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.iconLabel,
                        {
                          color:
                            newTaskIcon === opt.name
                              ? theme.primary
                              : theme.textMuted,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.timeToggleRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Set time
                </ThemedText>
                <Pressable
                  onPress={() => setNewTaskHasTime(!newTaskHasTime)}
                  style={[
                    styles.timeToggle,
                    {
                      backgroundColor: newTaskHasTime
                        ? theme.primary
                        : theme.switchTrack,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.timeToggleKnob,
                      {
                        backgroundColor: theme.buttonText,
                        transform: [{ translateX: newTaskHasTime ? 20 : 2 }],
                      },
                    ]}
                  />
                </Pressable>
              </View>

              {newTaskHasTime ? (
                <View style={styles.timePickerContainer}>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, marginBottom: 4 }}
                  >
                    Hour
                  </ThemedText>
                  <View style={styles.timePickerGrid}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <Pressable
                        key={h}
                        onPress={() => setNewTaskHour(h)}
                        style={[
                          styles.timePickerCell,
                          {
                            backgroundColor:
                              newTaskHour === h
                                ? theme.primary
                                : theme.backgroundSecondary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.timePickerCellText,
                            {
                              color:
                                newTaskHour === h
                                  ? theme.buttonText
                                  : theme.text,
                            },
                          ]}
                        >
                          {h}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.textMuted,
                      marginTop: Spacing.sm,
                      marginBottom: 4,
                    }}
                  >
                    Minute
                  </ThemedText>
                  <View style={styles.timePickerGrid}>
                    {MINUTE_OPTIONS.map((m) => (
                      <Pressable
                        key={m}
                        onPress={() => setNewTaskMinute(m)}
                        style={[
                          styles.timePickerCell,
                          {
                            backgroundColor:
                              newTaskMinute === m
                                ? theme.primary
                                : theme.backgroundSecondary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.timePickerCellText,
                            {
                              color:
                                newTaskMinute === m
                                  ? theme.buttonText
                                  : theme.text,
                            },
                          ]}
                        >
                          {m.toString().padStart(2, "0")}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.amPmRow}>
                    {(["AM", "PM"] as const).map((val) => (
                      <Pressable
                        key={val}
                        onPress={() => setNewTaskAmPm(val)}
                        style={[
                          styles.amPmBtn,
                          {
                            backgroundColor:
                              newTaskAmPm === val
                                ? theme.primary
                                : theme.backgroundSecondary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.amPmBtnText,
                            {
                              color:
                                newTaskAmPm === val
                                  ? theme.buttonText
                                  : theme.text,
                            },
                          ]}
                        >
                          {val}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              <Pressable
                testID="button-confirm-add-task"
                onPress={addDailyTask}
                style={[
                  styles.addTaskBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity: newTaskName.trim() ? 1 : 0.5,
                  },
                ]}
                disabled={!newTaskName.trim()}
              >
                <AppIcon name="plus" size={18} color={theme.buttonText} />
                <Text
                  style={[styles.addTaskBtnText, { color: theme.buttonText }]}
                >
                  Add Task
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showNamePrompt}
        transparent
        animationType="fade"
        onRequestClose={handleDismissNamePrompt}
      >
        <View
          style={[
            styles.namePromptOverlay,
            { backgroundColor: theme.modalBackdrop },
          ]}
        >
          <View
            style={[
              styles.namePromptContent,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <View
              style={[
                styles.namePromptIconCircle,
                { backgroundColor: theme.primaryMuted || `${theme.primary}20` },
              ]}
            >
              <AppIcon name="user" size={28} color={theme.primary} />
            </View>
            <ThemedText
              type="h4"
              style={{ textAlign: "center", marginBottom: Spacing.xs }}
            >
              Welcome to NurAI
            </ThemedText>
            <ThemedText
              type="body"
              style={{
                color: theme.textSecondary,
                textAlign: "center",
                marginBottom: Spacing.md,
              }}
            >
              What would you like us to call you?
            </ThemedText>
            <TextInput
              style={[
                styles.namePromptInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: namePromptError
                    ? theme.error
                    : theme.borderLight,
                },
              ]}
              value={namePromptValue}
              onChangeText={(t) => {
                setNamePromptValue(t);
                setNamePromptError("");
              }}
              placeholder="Enter your name"
              placeholderTextColor={theme.textMuted}
              autoFocus
              maxLength={50}
              testID="input-name-prompt"
            />
            {namePromptError ? (
              <Text style={{ color: theme.error, fontSize: 13, marginTop: 4 }}>
                {namePromptError}
              </Text>
            ) : null}
            <View style={styles.namePromptButtons}>
              <Pressable
                style={[
                  styles.namePromptBtn,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
                onPress={handleDismissNamePrompt}
              >
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  Skip
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.namePromptBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity: namePromptValue.trim().length < 2 ? 0.5 : 1,
                  },
                ]}
                onPress={handleSaveNamePrompt}
                disabled={namePromptValue.trim().length < 2}
                testID="button-save-name-prompt"
              >
                {savingNamePrompt ? (
                  <ActivityIndicator size="small" color={theme.buttonText} />
                ) : (
                  <ThemedText
                    type="body"
                    style={{ color: theme.buttonText, fontWeight: "600" }}
                  >
                    Save
                  </ThemedText>
                )}
              </Pressable>
            </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  heroSection: {
    marginBottom: Spacing["3xl"],
  },
  heroGradient: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    overflow: "hidden",
  },
  heroPatternOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGeometryPattern: {
    right: -36,
    top: -42,
  },
  heroPatternCircle: {
    position: "absolute",
    borderRadius: 999,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  heroGreeting: {
    flex: 1,
    marginRight: Spacing.md,
  },
  heroGreetingText: {
    fontSize: 32,
    fontFamily: "LibreBaskerville_700Bold",
    lineHeight: 40,
    letterSpacing: -0.6,
  },
  heroSubtitleText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    marginTop: Spacing.xs,
  },
  heroLocationBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  heroLocationText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  heroDivider: {
    height: 1,
    marginBottom: Spacing.lg,
  },
  heroPrayerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroPrayerLeft: {
    flex: 1,
  },
  heroPrayerLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  heroPrayerName: {
    fontSize: 36,
    fontFamily: "LibreBaskerville_700Bold",
    lineHeight: 44,
  },
  heroGoldDivider: {
    width: 148,
    marginTop: Spacing.sm,
    marginBottom: 2,
  },
  heroPrayerTime: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_400Regular",
    marginTop: Spacing.xs,
  },
  heroPrayerRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroCountdownRing: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  heroPrayerSvgWrap: {
    position: "absolute",
    top: -14,
    right: -6,
    opacity: 0.72,
  },
  heroCountdownInner: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCountdownValue: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  heroCountdownLabel: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans_400Regular",
    letterSpacing: 0.5,
    marginTop: -1,
  },
  heroWeatherStrip: {
    minHeight: 74,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  heroWeatherIconWrap: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  heroWeatherCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroWeatherLabel: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroWeatherGuidance: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  heroWeatherMeta: {
    width: 62,
    flexShrink: 0,
    alignItems: "flex-end",
  },
  heroWeatherTemp: {
    fontSize: 24,
    lineHeight: 29,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  heroWeatherCondition: {
    maxWidth: 72,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: "PlusJakartaSans_600SemiBold",
    textAlign: "right",
  },
  heroDateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroDateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.xs + 2,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
  },
  heroDateText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  heroTimeText: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  heroTimetableBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  heroTimetableBtnText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "600",
  },
  tabsSection: {
    marginBottom: Spacing["3xl"],
  },
  weatherSection: {
    marginTop: Spacing["2xl"],
    marginBottom: Spacing["3xl"],
  },
  tabsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tabPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  tabPillText: {
    fontSize: 13,
  },
  journeySection: {
    marginTop: -Spacing.md,
    marginBottom: Spacing["3xl"],
    gap: Spacing.md,
  },
  journeyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  journeyHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  journeyTuneButton: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  journeyEyebrow: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
  },
  journeyTitle: {
    fontSize: 22,
    letterSpacing: -0.4,
  },
  journeyProgressPill: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  journeyProgressText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  journeySegmentsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  journeySegment: {
    flexGrow: 1,
    flexBasis: "47%",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  journeySegmentTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
  journeySegmentLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  journeySegmentCount: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  journeySegmentTrack: {
    height: 4,
    borderRadius: 99,
    overflow: "hidden",
  },
  journeySegmentFill: {
    height: "100%",
    borderRadius: 99,
  },
  journeyPrimaryCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  journeyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  journeyPrimaryText: {
    flex: 1,
    minWidth: 0,
  },
  journeyReason: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  journeyActionTitle: {
    fontSize: 17,
    letterSpacing: -0.2,
  },
  journeyActionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  journeyActionRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  journeyReward: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  journeyMiniRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  journeyMiniAction: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  journeyMiniText: {
    flexShrink: 1,
    fontSize: 11,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  goalsModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  goalsModalSheet: {
    maxHeight: "78%",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
  },
  goalsModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  goalsModalIntro: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "PlusJakartaSans_500Medium",
    marginBottom: Spacing.lg,
  },
  goalsModalContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  goalPreferenceRow: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  goalPreferenceMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  goalPreferenceIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  goalPreferenceMeta: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "PlusJakartaSans_500Medium",
    marginTop: 2,
  },
  goalTargetControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  goalStepButton: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  goalTargetText: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  readingCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    overflow: "hidden",
  },
  readingPatternOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  patternDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  readingCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readingCardLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  readingTitle: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    opacity: 0.85,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  readingSubtitle: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "600",
    marginTop: Spacing.xs,
  },
  readingArabic: {
    fontSize: 16,
    marginTop: 2,
    textAlign: "left",
  },
  progressRingWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressRingContainer: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRingText: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "baseline",
  },
  progressPercent: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "600",
  },
  progressPercentSign: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  ramadanBanner: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  ramadanBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ramadanBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  ramadanIconCircle: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  ramadanBannerTitle: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "600",
  },
  ramadanBannerSubtitle: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_400Regular",
    marginTop: Spacing.xs / 2,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  hadithHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  hadithText: {
    lineHeight: 24,
    fontStyle: "italic",
    marginBottom: Spacing.sm,
  },
  quickAccessSection: {
    marginBottom: Spacing["3xl"],
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  tilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: Spacing.md,
  },
  tile: {
    width: "23%",
    alignItems: "center",
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    borderWidth: 1,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 14,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerSheet: {
    maxHeight: "75%",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing["4xl"],
  },
  pickerHandle: {
    width: 36,
    height: Spacing.xs,
    borderRadius: Spacing.xs / 2,
    alignSelf: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  pickerContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  pickerCategory: {
    marginBottom: Spacing.lg,
  },
  pickerCatLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  pickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm + 2,
  },
  pickerItem: {
    width: "22%",
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    position: "relative",
  },
  pickerCheck: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    width: 14,
    height: 14,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  pickerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  pickerItemLabel: {
    fontSize: 10,
    textAlign: "center",
    fontFamily: "PlusJakartaSans_500Medium",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  streakTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  streakLeft: {
    flex: 1,
  },
  streakFlameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniGardenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  miniPlant: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDots: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  dayDotCol: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  dayDot: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
  },
  communityIconCircle: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dailyPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  dailyPlanIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyPlanCheck: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyPlanAddRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  dailyPlanInput: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  dailyPlanAddBtn: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPlanState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  swipeDeleteBtn: {
    justifyContent: "center",
    alignItems: "center",
    width: 72,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlayDismiss: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalInput: {
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: Spacing.sm,
  },
  iconOption: {
    width: "23%",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    gap: 2,
  },
  iconLabel: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  timeToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  timeToggle: {
    width: 44,
    height: 24,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
  },
  timeToggleKnob: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
  },
  timePickerContainer: {
    marginTop: Spacing.md,
  },
  timePickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  timePickerCell: {
    width: 44,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  timePickerCellText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  amPmRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  amPmBtn: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  amPmBtnText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "600",
  },
  addTaskBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  addTaskBtnText: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "600",
  },
  namePromptOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  namePromptContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
  },
  namePromptIconCircle: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  namePromptInput: {
    width: "100%",
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  namePromptButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%",
    marginTop: Spacing.lg,
  },
  namePromptBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
