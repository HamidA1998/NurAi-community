/* eslint-disable @typescript-eslint/no-unused-vars -- This generated Home experience keeps dormant panel variants while the active Home surface is simplified and verified. */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

import { NurAILogoMark } from "@/components/NurAILogoMark";
import { PersonalAIActionLane } from "@/components/PersonalAIActionLane";
import {
  NurAIContextCard,
  type NurAIContextSignal,
} from "@/components/home/NurAIContextCard";
import { useTheme } from "@/hooks/useTheme";
import { NuraiGlass } from "@/design-system";
import { personalAIActionStepsFromPlan } from "@/services/personalAIResponseBridge";
import type { HomeAIFeedbackValue } from "@/services/homeAIFeedbackService";
import type { PersonalIntelligenceBriefing } from "@/services/personalIntelligenceBriefingService";
import { resolvePersonalAIExperience } from "@/config/personalAIExperience";
import {
  isHomeAIContextMessageSaved,
  loadLastPresentedHomeAIContextMessageId,
  markHomeAIContextMessagePresented,
  removeSavedHomeAIContextMessage,
  saveHomeAIContextMessage,
} from "@/services/homeAIContextCardStateService";
import type {
  NurAIPlanTier,
  NurAIResponseContract,
  PersonalAIActionPlanContract,
} from "@shared/nuraiAI";
import type { ThemeColors } from "@/constants/theme";
import type { NurAINudge } from "@/services/nuraiRuleEngineV3";
import type {
  DailyDeenJourneyState,
  DailyJourneyAction,
} from "@/services/dailyDeenJourneyService";
import type { PersonalHomePlanSummary } from "@/services/personalNurAIPlanService";
import type { QuranReflectionCircleSummary } from "@/services/quranReflectionCircleService";
import type {
  QuranDailySessionActionId,
  QuranDailySessionHandoff,
} from "@/services/quranLearningService";
import {
  buildWeeklySpiritualGrowthCompanion,
  saveSpiritualGrowthReflectionNote,
  type SpiritualGrowthCompanion,
  type SpiritualGrowthCompanionSignalId,
} from "@/services/spiritualGrowthCompanionService";
import type { LiveWeatherSnapshot } from "@/services/weatherService";
import { AppIcon, type AppIconName } from "@/components/icons";
import { QuickAccessIcon } from "@/components/home/QuickAccessIcon";
import type { HomeAIContextExtras } from "@/services/homeAIContextService";

const COLORS = {
  bg: "#050712",
  bg2: "#061B1F",
  emerald: "#56B394",
  teal: "#56B394",
  logoLime: "#A8E65D",
  gold: "#E4A63A",
  goldBright: "#FFD46B",
  text: "#F8FBFF",
  muted: "rgba(231,242,246,0.7)",
  faint: "rgba(231,242,246,0.42)",
  glass: "rgba(8, 28, 35, 0.74)",
  glassStrong: "rgba(7, 36, 42, 0.9)",
  border: "rgba(255,212,107,0.38)",
  tealBorder: "rgba(86,179,148,0.3)",
};

function alphaColor(
  color: string | undefined,
  alpha: number,
  fallback: string,
) {
  const value = color || fallback;
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((part) => `${part}${part}`)
            .join("")
        : hex;
    if (full.length === 6) {
      const red = Number.parseInt(full.slice(0, 2), 16);
      const green = Number.parseInt(full.slice(2, 4), 16);
      const blue = Number.parseInt(full.slice(4, 6), 16);
      if ([red, green, blue].every(Number.isFinite)) {
        return `rgba(${red},${green},${blue},${alpha})`;
      }
    }
  }
  if (value.startsWith("rgb(")) {
    return value.replace("rgb(", "rgba(").replace(")", `,${alpha})`);
  }
  if (value.startsWith("rgba(")) {
    return value.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${alpha})`);
  }
  return fallback;
}

export type HomePulseItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: AppIconName;
  completed: boolean;
};

export type HomeAiInsight = {
  title: string;
  body: string;
  prompt: string;
  planLabel: string;
  isPaid: boolean;
  ctaLabel?: string;
  signals?: string[];
  category?: string;
  reason?: string;
  safetyNote?: string;
  feedbackKey?: string;
  confidence?: number;
  score?: number;
  priority?: "critical" | "high" | "medium" | "low";
  actionType?: "route" | "ai";
  routeName?: string;
  routeParams?: Record<string, unknown>;
  secondary?: HomeAiInsightOption[];
};

export type HomeAiInsightOption = Pick<
  HomeAiInsight,
  | "title"
  | "body"
  | "prompt"
  | "planLabel"
  | "isPaid"
  | "ctaLabel"
  | "signals"
  | "category"
  | "reason"
  | "safetyNote"
  | "feedbackKey"
  | "confidence"
  | "score"
  | "priority"
  | "actionType"
  | "routeName"
  | "routeParams"
>;

export type HomeAiMode = "local" | "premium" | "scholar";

export type HomeAccentTheme = {
  primary: string;
  primarySoft: string;
  primaryBorder: string;
  primaryText: string;
  gradientStart: string;
  gradientEnd: string;
  gold: string;
  surface?: string;
  skinId?: string;
};

type FamilyMemberPreview = {
  id: string | number;
  name: string;
  role: string;
};

export type HomeQuickAccessItem = {
  id: string;
  icon: AppIconName;
  label: string;
  category: string;
  liveValue?: string;
};

export type HomeRecentMediaSession = {
  kind: "quran" | "nasheed";
  title: string;
  subtitle: string;
  detailLabel: string;
};

export type HomeHealthSnapshot = NonNullable<HomeAIContextExtras["health"]>;

type QuickAccessOpenMode = "browse" | "edit";

type HomeFocusCategory =
  | "auto"
  | "prayer"
  | "quran"
  | "arabic"
  | "charity"
  | "reflection";

type HomePriority = {
  category: Exclude<HomeFocusCategory, "auto">;
  title: string;
  body: string;
  actionLabel: string;
  icon: AppIconName;
  taskId?: string;
};

type HomeLocalInsight = {
  title: string;
  body: string;
  icon: AppIconName;
  tone: "prayer" | "weather" | "progress" | "quran";
};

type HomeContinueItem = {
  id: string;
  title: string;
  body: string;
  icon: AppIconName;
  featureId: string;
  category: Exclude<HomeFocusCategory, "auto">;
  accent: "gold" | "teal" | "emerald";
};

type TodayCommandItem = {
  id: "prayer" | "quran" | "learn" | "dua" | "family";
  title: string;
  body: string;
  meta: string;
  icon: AppIconName;
  color: string;
  completed?: boolean;
};

type TodayNurAINudge = {
  title: string;
  body: string;
  cta: string;
  prompt: string;
};

type QuranHomeContinuityState = {
  eyebrow: string;
  title: string;
  body: string;
  meta: string;
  icon: AppIconName;
};

type HomeQuranDailyActionStep = {
  id:
    | "read"
    | "listen"
    | "learn_word"
    | "understand"
    | "recite"
    | "reflect"
    | "sources";
  title: string;
  body: string;
  status: string;
  icon: AppIconName;
  tone: "gold" | "teal" | "emerald";
  completed?: boolean;
};

type HomeTasbeehSummary = {
  count: number;
  target: number;
  dhikrLabel: string;
  todayTotal: number;
};

type HomePersonalAIResponse = {
  answer?: string;
  response: NurAIResponseContract;
  personalAI?: {
    mode?: {
      label?: string;
    };
    actionPlan?: PersonalAIActionPlanContract;
    actionSteps?: string[];
  };
  ai?: {
    cached?: boolean;
    modelTier?: string;
    sourceCoverage?: string;
  };
};

type GeneratedHomeExperienceProps = {
  userName?: string | null;
  locationLabel: string;
  hijriDateLabel: string;
  gregorianDateLabel: string;
  prayerName: string;
  prayerTimeLabel: string;
  nextPrayerTime: Date | null;
  currentTime: Date;
  qiblaDegrees: number;
  qiblaPointerDegrees?: number;
  qiblaFeedbackLabel?: string;
  qiblaAligned?: boolean;
  qiblaHeadingAvailable?: boolean;
  weather: LiveWeatherSnapshot | null;
  weatherLoading: boolean;
  weatherError: string | null;
  streakDays: number;
  checkedDays: string[];
  todayDayIndex: number;
  accentTheme?: HomeAccentTheme;
  personalPlan?: PersonalHomePlanSummary | null;
  dailyJourney?: DailyDeenJourneyState | null;
  quranDailyHandoff?: QuranDailySessionHandoff | null;
  quranReflectionCircleSummary?: QuranReflectionCircleSummary | null;
  personalAITier?: NurAIPlanTier;
  personalAIBriefing: PersonalIntelligenceBriefing;
  personalAIResponse?: HomePersonalAIResponse | null;
  personalAILoading?: boolean;
  personalAIError?: string | null;
  personalAIUpdatedAt?: string | null;
  homeHealth?: HomeHealthSnapshot;
  homeTasbeeh?: HomeTasbeehSummary;
  pulseItems: HomePulseItem[];
  onPrayerPress: () => void;
  onQiblaPress: () => void;
  onWeatherPress: () => void;
  onUpgradePress?: () => void;
  v3Greeting?: string;
  v3Nudge?: NurAINudge | null;
  onV3NudgeDismiss?: (nudgeId: string) => void;
  onV3NudgeAction?: (route: string, params?: Record<string, unknown>) => void;
  onPulseComplete: (id: string) => void;
  onPulseViewAll: () => void;
  quickAccessItems: HomeQuickAccessItem[];
  allQuickAccessItems: HomeQuickAccessItem[];
  recentQuickAccessIds?: string[];
  recentMedia?: HomeRecentMediaSession | null;
  onQuickAccessPress: (id: string) => void;
  onRecentMediaPress?: (session: HomeRecentMediaSession) => void;
  onQuickAccessReplace: (slotIndex: number, featureId: string) => void;
  onQuickAccessMove: (slotIndex: number, direction: -1 | 1) => void;
  onQuickAccessReset: () => void;
  onPersonalAIRefresh?: () => void;
  onPersonalAIActionPress?: (briefing: PersonalIntelligenceBriefing) => void;
  onPersonalAIFeedback?: (
    key: string,
    category: PersonalIntelligenceBriefing["category"],
    feedback: HomeAIFeedbackValue,
  ) => void;
  onGardenPress: () => void;
  onFamilyPress: () => void;
  onSearchPress: () => void;
  onPersonalGuidePress: (prompt?: string) => void;
  onScholarReviewPress: () => void;
  onPersonalPlanControlsPress: () => void;
  onJourneyActionPress: (action: DailyJourneyAction) => void;
  topInset?: number;
};

function cleanName(name?: string | null) {
  const trimmed = name?.trim();
  if (!trimmed || ["Apple User", "Google User", "User"].includes(trimmed)) {
    return "Brother/Sister";
  }
  return trimmed;
}

function formatCountdown(nextPrayerTime: Date | null, currentTime: Date) {
  if (!nextPrayerTime) return "--:--:--";
  const diff = Math.max(0, nextPrayerTime.getTime() - currentTime.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((part) => part.toString().padStart(2, "0"))
    .join(":");
}

function formatCountdownCompact(countdown: string) {
  const [hoursRaw, minutesRaw, secondsRaw] = countdown
    .split(":")
    .map((part) => Number(part));
  const hours = Number.isFinite(hoursRaw) ? hoursRaw : 0;
  const minutes = Number.isFinite(minutesRaw) ? minutesRaw : 0;
  const seconds = Number.isFinite(secondsRaw) ? secondsRaw : 0;

  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  return `${seconds}s`;
}

function formatCurrentClock(currentTime: Date) {
  return currentTime.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function prayerPeriodLabel(
  prayerName: string,
  nextPrayerTime: Date | null,
  currentTime: Date,
) {
  if (!nextPrayerTime) return "Today";
  const lower = prayerName.toLowerCase();
  if (nextPrayerTime.toDateString() !== currentTime.toDateString()) {
    return "Tomorrow";
  }
  if (lower === "maghrib" || lower === "isha") return "Tonight";
  if (lower === "fajr" || lower === "sunrise") return "Morning";
  return "Today";
}

function weekDateKey(currentDate: Date, weekIndex: number) {
  const jsDay = currentDate.getDay();
  const mondayBasedToday = jsDay === 0 ? 6 : jsDay - 1;
  const date = new Date(currentDate);
  date.setHours(12, 0, 0, 0);
  date.setDate(currentDate.getDate() - mondayBasedToday + weekIndex);
  return date.toISOString().split("T")[0];
}

function weatherIconName(weather: LiveWeatherSnapshot | null) {
  if (!weather) return "cloud";
  const code = weather.weatherCode;
  if (code === 0) return weather.isDay ? "sun" : "moon";
  if ([1, 2, 3].includes(code)) return "cloud";
  if ([45, 48].includes(code)) return "cloud-drizzle";
  if (code >= 51 && code <= 82) return "cloud-rain";
  if (code >= 95) return "cloud-lightning";
  return "cloud";
}

function weatherGuidance(
  weather: LiveWeatherSnapshot | null,
  prayerName: string,
  error: string | null,
) {
  if (error && !weather) return error;
  if (!weather) return "Live conditions loading";
  if ((weather.nextThreeHourPrecipitationProbability ?? 0) >= 60) {
    return `Rain before ${prayerName}`;
  }
  if (weather.temperatureC >= 30) return `Hydrate before ${prayerName}`;
  if (weather.temperatureC <= 2) return `Dress warmly for ${prayerName}`;
  if (weather.windKmh >= 40 || weather.windGustKmh >= 55) {
    return `Windy before ${prayerName}`;
  }
  return `Good for ${prayerName}`;
}

function formatWeatherHour(time: string) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "Now";
  return date.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function prayerWindowHour(
  weather: LiveWeatherSnapshot | null,
  nextPrayerTime: Date | null,
) {
  if (!weather?.hourly?.length || !nextPrayerTime) return null;
  return weather.hourly.reduce((closest, hour) => {
    const hourTime = new Date(hour.time).getTime();
    const closestTime = new Date(closest.time).getTime();
    const target = nextPrayerTime.getTime();
    return Math.abs(hourTime - target) < Math.abs(closestTime - target)
      ? hour
      : closest;
  }, weather.hourly[0]);
}

function weatherAlertText(
  weather: LiveWeatherSnapshot | null,
  prayerName: string,
) {
  if (!weather) return "Live weather will update with your location.";
  const rainChance = weather.nextThreeHourPrecipitationProbability ?? 0;
  if (rainChance >= 60 || weather.precipitationMm > 0.2) {
    return `Rain risk before ${prayerName}. Keep extra time for the journey.`;
  }
  if (weather.windKmh >= 40 || weather.windGustKmh >= 55) {
    return `Windy before ${prayerName}. Leave a little earlier if walking.`;
  }
  if (weather.temperatureC >= 30) {
    return `Hot before ${prayerName}. Hydrate and avoid rushing.`;
  }
  if (weather.temperatureC <= 2) {
    return `Cold before ${prayerName}. Dress warmly for the masjid.`;
  }
  return `Conditions look steady before ${prayerName}.`;
}

function mosqueWalkGuidance(weather: LiveWeatherSnapshot | null) {
  const hours = weather?.hourly?.slice(0, 3) ?? [];
  if (!hours.length) return "Walk guidance appears once hourly weather loads.";
  const best = [...hours].sort((a, b) => {
    const aRain = a.precipitationProbability ?? 0;
    const bRain = b.precipitationProbability ?? 0;
    return aRain * 2 + a.windKmh - (bRain * 2 + b.windKmh);
  })[0];
  if (!best) return "Walk guidance appears once hourly weather loads.";
  const rain = best.precipitationProbability ?? 0;
  if (rain >= 60) return "Rain is likely soon. Plan cover or transport.";
  if (best.windKmh >= 40)
    return "Winds are high. Leave calmly and avoid rushing.";
  return `${formatWeatherHour(best.time)} looks best for a masjid walk.`;
}

const HOME_FOCUS_OPTIONS: {
  id: HomeFocusCategory;
  label: string;
  icon: AppIconName;
}[] = [
  { id: "auto", label: "Auto", icon: "zap" },
  { id: "prayer", label: "Prayer", icon: "prayer" },
  { id: "quran", label: "Quran", icon: "quran" },
  { id: "arabic", label: "Arabic", icon: "arabic-learning" },
  { id: "charity", label: "Charity", icon: "charity" },
  { id: "reflection", label: "Reflect", icon: "reflection" },
];

function pulseCategory(
  item: HomePulseItem,
): Exclude<HomeFocusCategory, "auto"> {
  const text = `${item.title} ${item.subtitle} ${item.icon}`.toLowerCase();
  if (
    text.includes("quran") ||
    text.includes("surah") ||
    item.icon === "book-open" ||
    item.icon === "quran"
  ) {
    return "quran";
  }
  if (
    text.includes("arabic") ||
    text.includes("lesson") ||
    item.icon === "type" ||
    item.icon === "arabic-learning"
  ) {
    return "arabic";
  }
  if (
    text.includes("charity") ||
    text.includes("sadaq") ||
    item.icon === "heart" ||
    item.icon === "charity"
  ) {
    return "charity";
  }
  if (
    text.includes("reflect") ||
    text.includes("journal") ||
    item.icon === "edit-3" ||
    item.icon === "reflection"
  ) {
    return "reflection";
  }
  return "prayer";
}

function spiritualSignalFromPulse(
  item: HomePulseItem,
): SpiritualGrowthCompanionSignalId | null {
  const text =
    `${item.id} ${item.title} ${item.subtitle} ${item.icon}`.toLowerCase();
  if (
    text.includes("quran") ||
    text.includes("surah") ||
    text.includes("ayah") ||
    item.icon === "book-open" ||
    item.icon === "quran"
  ) {
    return "quran";
  }
  if (
    text.includes("arabic") ||
    text.includes("lesson") ||
    text.includes("grammar") ||
    text.includes("library") ||
    text.includes("learn") ||
    item.icon === "type" ||
    item.icon === "arabic-learning"
  ) {
    return "learning";
  }
  if (
    text.includes("dua") ||
    text.includes("du'a") ||
    text.includes("dhikr") ||
    text.includes("adhkar") ||
    text.includes("tasbeeh") ||
    item.icon === "repeat"
  ) {
    return "dhikr";
  }
  if (
    text.includes("reflect") ||
    text.includes("journal") ||
    item.icon === "edit-3" ||
    item.icon === "reflection"
  ) {
    return "reflection";
  }
  if (
    text.includes("family") ||
    text.includes("child") ||
    text.includes("kids") ||
    text.includes("parent")
  ) {
    return "family";
  }
  if (
    text.includes("prayer") ||
    text.includes("salah") ||
    text.includes("fajr") ||
    text.includes("dhuhr") ||
    text.includes("asr") ||
    text.includes("maghrib") ||
    text.includes("isha") ||
    item.icon === "sunrise" ||
    item.icon === "prayer"
  ) {
    return "prayer";
  }
  return null;
}

function categoryCopy(category: Exclude<HomeFocusCategory, "auto">) {
  switch (category) {
    case "quran":
      return {
        title: "Continue your Quran journey",
        body: "A small page today keeps the connection alive.",
        actionLabel: "Open Quran",
        icon: "quran" as const,
      };
    case "arabic":
      return {
        title: "Build Quranic Arabic today",
        body: "One short lesson compounds into real understanding.",
        actionLabel: "Start lesson",
        icon: "arabic-learning" as const,
      };
    case "charity":
      return {
        title: "Add a charity intention",
        body: "Track one act of giving or service for today.",
        actionLabel: "Log charity",
        icon: "charity" as const,
      };
    case "reflection":
      return {
        title: "Take a quiet reflection",
        body: "Capture one lesson before the day moves on.",
        actionLabel: "Reflect",
        icon: "reflection" as const,
      };
    default:
      return {
        title: "Protect the next prayer",
        body: "Prepare early and let the next salah anchor your day.",
        actionLabel: "View prayer",
        icon: "prayer" as const,
      };
  }
}

function minutesUntil(nextPrayerTime: Date | null, currentTime: Date) {
  if (!nextPrayerTime) return null;
  return Math.max(
    0,
    Math.ceil((nextPrayerTime.getTime() - currentTime.getTime()) / 60000),
  );
}

function buildHomePriority({
  focus,
  pulseItems,
  prayerName,
  nextPrayerTime,
  currentTime,
}: {
  focus: HomeFocusCategory;
  pulseItems: HomePulseItem[];
  prayerName: string;
  nextPrayerTime: Date | null;
  currentTime: Date;
}): HomePriority {
  const incomplete = pulseItems.filter((item) => !item.completed);
  const focusedTask =
    focus === "auto"
      ? null
      : incomplete.find((item) => pulseCategory(item) === focus);
  if (focusedTask && focus !== "auto") {
    const copy = categoryCopy(focus);
    return {
      category: focus,
      title: focusedTask.title,
      body: focusedTask.subtitle || copy.body,
      actionLabel: "Complete",
      icon: focusedTask.icon,
      taskId: focusedTask.id,
    };
  }

  const mins = minutesUntil(nextPrayerTime, currentTime);
  if (mins != null && mins <= 45) {
    return {
      category: "prayer",
      title: `${prayerName} is close`,
      body: `${mins} min left. Prepare calmly and leave enough time.`,
      actionLabel: "View prayer",
      icon: "clock",
    };
  }

  const isFriday = currentTime.getDay() === 5;
  const quranTask = incomplete.find((item) => pulseCategory(item) === "quran");
  if (isFriday && quranTask) {
    return {
      category: "quran",
      title: "Friday Quran light",
      body: quranTask.title,
      actionLabel: "Start",
      icon: quranTask.icon,
      taskId: quranTask.id,
    };
  }

  const nextTask = incomplete[0];
  if (nextTask) {
    return {
      category: pulseCategory(nextTask),
      title: nextTask.title,
      body: nextTask.subtitle,
      actionLabel: "Complete",
      icon: nextTask.icon,
      taskId: nextTask.id,
    };
  }

  return {
    category: "reflection",
    title: "Today’s journey is complete",
    body: "Take a moment to reflect on what Allah helped you do today.",
    actionLabel: "Reflect",
    icon: "check-circle",
  };
}

function buildLocalInsight({
  prayerName,
  nextPrayerTime,
  currentTime,
  weather,
  completedToday,
  totalToday,
}: {
  prayerName: string;
  nextPrayerTime: Date | null;
  currentTime: Date;
  weather: LiveWeatherSnapshot | null;
  completedToday: number;
  totalToday: number;
}): HomeLocalInsight {
  const mins = minutesUntil(nextPrayerTime, currentTime);
  const rainChance = weather?.nextThreeHourPrecipitationProbability ?? 0;
  if (mins != null && mins <= 30) {
    return {
      title: `${prayerName} is soon`,
      body: `${mins} min left. NurAI suggests preparing before the rush.`,
      icon: "clock",
      tone: "prayer",
    };
  }
  if (rainChance >= 50 || (weather?.windKmh ?? 0) >= 35) {
    return {
      title: "Weather may affect your prayer journey",
      body: weatherAlertText(weather, prayerName),
      icon: rainChance >= 50 ? "umbrella" : "wind",
      tone: "weather",
    };
  }
  if (currentTime.getDay() === 5) {
    return {
      title: "Friday Quran guidance",
      body: "A short Quran session today keeps the day anchored.",
      icon: "quran",
      tone: "quran",
    };
  }
  if (totalToday > 0 && completedToday === totalToday) {
    return {
      title: "Your day is complete",
      body: "Reflect once now so tomorrow starts with intention.",
      icon: "check-circle",
      tone: "progress",
    };
  }
  return {
    title: "Your next step is ready",
    body: `${completedToday}/${totalToday || 3} daily actions complete. Keep the rhythm gentle.`,
    icon: "zap",
    tone: "progress",
  };
}

function customerSafeAiCopy(value: string) {
  return value
    .replace(/\bnudges\b/gi, "guidance")
    .replace(/\bnudge\b/gi, "guidance");
}

function featureIdForCategory(category: Exclude<HomeFocusCategory, "auto">) {
  switch (category) {
    case "quran":
      return "quran";
    case "arabic":
      return "arabic_learning";
    case "charity":
      return "zakat";
    case "reflection":
      return "inspiration";
    default:
      return "prayer";
  }
}

function continueAccent(category: Exclude<HomeFocusCategory, "auto">) {
  if (category === "quran" || category === "reflection") return "gold";
  if (category === "arabic") return "teal";
  return "emerald";
}

function buildContinueItems({
  pulseItems,
  prayerName,
  prayerTimeLabel,
}: {
  pulseItems: HomePulseItem[];
  prayerName: string;
  prayerTimeLabel: string;
}): HomeContinueItem[] {
  const byCategory = new Map<
    Exclude<HomeFocusCategory, "auto">,
    HomePulseItem
  >();
  pulseItems
    .filter((item) => !item.completed)
    .forEach((item) => {
      const category = pulseCategory(item);
      if (!byCategory.has(category)) byCategory.set(category, item);
    });

  const order: Exclude<HomeFocusCategory, "auto">[] = [
    "quran",
    "arabic",
    "reflection",
    "prayer",
    "charity",
  ];
  const items = order
    .map((category) => {
      const task = byCategory.get(category);
      if (!task) return null;
      const copy = categoryCopy(category);
      return {
        id: `continue-${category}`,
        title:
          category === "quran"
            ? "Continue Quran"
            : category === "arabic"
              ? "Continue Arabic"
              : category === "reflection"
                ? "Open reflection"
                : task.title,
        body: task.subtitle || copy.body,
        icon: task.icon || copy.icon,
        featureId: featureIdForCategory(category),
        category,
        accent: continueAccent(category),
      } satisfies HomeContinueItem;
    })
    .filter(Boolean) as HomeContinueItem[];

  if (items.length) return items.slice(0, 3);

  return [
    {
      id: "continue-prayer",
      title: `Prepare for ${prayerName}`,
      body: `${prayerName} is at ${prayerTimeLabel}. Keep the next salah central.`,
      icon: "prayer",
      featureId: "prayer",
      category: "prayer",
      accent: "emerald",
    },
  ];
}

function findPulseItem(
  pulseItems: HomePulseItem[],
  category: Exclude<HomeFocusCategory, "auto">,
) {
  return pulseItems.find((item) => pulseCategory(item) === category);
}

function findDuaOrAdhkarPulseItem(pulseItems: HomePulseItem[]) {
  return pulseItems.find((item) => {
    const text = `${item.title} ${item.subtitle} ${item.icon}`.toLowerCase();
    return (
      text.includes("dua") ||
      text.includes("du'a") ||
      text.includes("dhikr") ||
      text.includes("adhkar") ||
      text.includes("tasbeeh") ||
      item.icon === "heart" ||
      item.icon === "repeat"
    );
  });
}

function buildTodayCommandItems({
  pulseItems,
  prayerName,
  prayerTimeLabel,
  quranDailyHandoff,
  quranReflectionCircleSummary,
}: {
  pulseItems: HomePulseItem[];
  prayerName: string;
  prayerTimeLabel: string;
  quranDailyHandoff?: QuranDailySessionHandoff | null;
  quranReflectionCircleSummary?: QuranReflectionCircleSummary | null;
}): TodayCommandItem[] {
  const quranTask = findPulseItem(pulseItems, "quran");
  const arabicTask = findPulseItem(pulseItems, "arabic");
  const duaTask = findDuaOrAdhkarPulseItem(pulseItems);
  const reflectionTask = findPulseItem(pulseItems, "reflection");
  const hasPendingCircleReflection =
    (quranReflectionCircleSummary?.pendingReviewDrafts || 0) > 0;
  const hasOpenCircle = (quranReflectionCircleSummary?.open || 0) > 0;
  const familyReflectionTitle = hasPendingCircleReflection
    ? "Review Quran reflections"
    : hasOpenCircle
      ? "Quran reflection circle"
      : reflectionTask?.title || "Family or reflection";
  const pendingCircleCount =
    quranReflectionCircleSummary?.pendingReviewDrafts || 0;
  const familyReflectionBody = hasPendingCircleReflection
    ? `${pendingCircleCount} note${pendingCircleCount === 1 ? "" : "s"} need review before circle sharing.`
    : hasOpenCircle
      ? "Add today's ayah reflection; private by default with source boundaries."
      : reflectionTask?.subtitle || "Share one calm action or save a note.";
  const familyReflectionMeta = hasPendingCircleReflection
    ? "Review first"
    : hasOpenCircle
      ? `${quranReflectionCircleSummary?.open} open`
      : reflectionTask?.completed
        ? "Done today"
        : "Gentle";

  return [
    {
      id: "prayer",
      title: prayerName,
      body: "Protect the next salah window.",
      meta: prayerTimeLabel,
      icon: "prayer",
      color: COLORS.teal,
    },
    {
      id: "quran",
      title: quranTask?.title || "Quran light",
      body:
        quranDailyHandoff?.nextActionLabel ||
        quranTask?.subtitle ||
        "Read, listen, or reflect on one ayah.",
      meta: quranTask?.completed
        ? "Done today"
        : quranDailyHandoff
          ? "Reader synced"
          : "Flagship",
      icon: quranTask?.icon || "quran",
      color: COLORS.teal,
      completed: quranTask?.completed,
    },
    {
      id: "learn",
      title: arabicTask?.title || "Daily learning",
      body: arabicTask?.subtitle || "Continue Arabic or a Library lesson.",
      meta: arabicTask?.completed ? "Done today" : "5 min",
      icon: arabicTask?.icon || "type",
      color: COLORS.teal,
      completed: arabicTask?.completed,
    },
    {
      id: "dua",
      title: duaTask?.title || "Dua and adhkar",
      body: duaTask?.subtitle || "Read one dua or keep a short dhikr session.",
      meta: duaTask?.completed ? "Done today" : "2 min",
      icon: duaTask?.icon || "heart",
      color: COLORS.teal,
      completed: duaTask?.completed,
    },
    {
      id: "family",
      title: familyReflectionTitle,
      body: familyReflectionBody,
      meta: familyReflectionMeta,
      icon: hasPendingCircleReflection
        ? "shield"
        : reflectionTask?.icon || "users",
      color: COLORS.teal,
      completed: reflectionTask?.completed,
    },
  ];
}

const QURAN_DAILY_ACTION_META: Record<
  QuranDailySessionActionId,
  {
    title: string;
    icon: AppIconName;
    tone: HomeQuranDailyActionStep["tone"];
    completeLabel: string;
  }
> = {
  listen: {
    title: "Listen",
    icon: "headphones",
    tone: "teal",
    completeLabel: "Listening started",
  },
  learn_word: {
    title: "Word",
    icon: "arabic-learning",
    tone: "gold",
    completeLabel: "Word saved",
  },
  understand: {
    title: "Meaning",
    icon: "quran",
    tone: "teal",
    completeLabel: "Lesson saved",
  },
  recite: {
    title: "Recite",
    icon: "mic",
    tone: "emerald",
    completeLabel: "Recitation logged",
  },
  reflect: {
    title: "Reflect",
    icon: "reflection",
    tone: "emerald",
    completeLabel: "Reflection saved",
  },
};

function buildHomeQuranReaderSyncedActionSteps(
  handoff: QuranDailySessionHandoff,
): HomeQuranDailyActionStep[] {
  return (
    [
      "listen",
      "learn_word",
      "understand",
      "recite",
      "reflect",
    ] as QuranDailySessionActionId[]
  ).map((id, index) => {
    const meta = QURAN_DAILY_ACTION_META[id];
    const checklistLabel = handoff.checklist[index] || meta.completeLabel;
    const completed = checklistLabel === meta.completeLabel;
    return {
      id,
      title: meta.title,
      body:
        id === handoff.nextActionId ? handoff.nextActionLabel : checklistLabel,
      status: completed
        ? "Done"
        : id === handoff.nextActionId
          ? "Next"
          : "Open",
      icon: completed ? "check-circle" : meta.icon,
      tone: meta.tone,
      completed,
    };
  });
}

function buildTodayDeenNurAINudge({
  items,
  personalPlan,
  completedToday,
  totalToday,
  prayerName,
  prayerTimeLabel,
}: {
  items: TodayCommandItem[];
  personalPlan?: PersonalHomePlanSummary | null;
  completedToday: number;
  totalToday: number;
  prayerName: string;
  prayerTimeLabel: string;
}): TodayNurAINudge {
  const nextIncomplete = items.find((item) => !item.completed) || items[0];
  const total = totalToday || items.length;
  const planLine = personalPlan
    ? `Personal plan: ${personalPlan.headline}. First action: ${personalPlan.recommendedActionLabel}. Boundary: ${personalPlan.personalizationBoundaryLabel}.`
    : "No personal plan is loaded; use only the visible home actions.";
  const actionLines = items
    .map(
      (item) =>
        `- ${item.id}: ${item.title} (${item.completed ? "done" : "open"}) - ${item.body}`,
    )
    .join("\n");

  return {
    title: personalPlan?.recommendedActionLabel || nextIncomplete.title,
    body: personalPlan
      ? "Your journey update turns the plan into one calm next step."
      : `Your journey update chooses one calm next step from ${completedToday}/${total} visible actions.`,
    cta: personalPlan ? "Use my plan" : "Next step",
    prompt: `Use only this visible NurAI Home context to suggest my next step.\n\n${planLine}\nNext prayer: ${prayerName} (${prayerTimeLabel}).\nToday's Deen actions:\n${actionLines}\n\nReturn: 1) one next action, 2) one optional Quran, dua, or learning step if relevant, 3) one privacy-safe reflection prompt. Do not invent private journal text, hidden progress, religious rulings, or source references. If the issue is sensitive or fiqh-related, route me to scholar review instead of answering as a ruling.`,
  };
}

function buildHomeQuranContinuityState({
  completed,
  quranTask,
  recentMedia,
  personalPlan,
}: {
  completed: boolean;
  quranTask?: HomePulseItem;
  recentMedia?: HomeRecentMediaSession | null;
  personalPlan?: PersonalHomePlanSummary | null;
}): QuranHomeContinuityState {
  if (recentMedia) {
    return {
      eyebrow: "RESUME QURAN",
      title: recentMedia.title,
      body: recentMedia.subtitle,
      meta: recentMedia.detailLabel,
      icon: "headphones",
    };
  }

  if (completed) {
    return {
      eyebrow: "TODAY PROTECTED",
      title: "Reflect once before tomorrow",
      body: "Your Quran action is marked done. Save one note or listen again to keep the meaning alive.",
      meta: "Review + reflection",
      icon: "check-circle",
    };
  }

  if (personalPlan) {
    return {
      eyebrow: "PERSONAL QURAN PATH",
      title: personalPlan.quranLabel,
      body:
        personalPlan.dailyPath.find((step) =>
          step.toLowerCase().includes("quran"),
        ) ||
        personalPlan.dailyPath[1] ||
        "Read or listen with focus, then save one reflection.",
      meta: personalPlan.reviewCadenceLabel,
      icon: "map",
    };
  }

  return {
    eyebrow: "GENTLE RECOVERY",
    title: quranTask?.title || "Start with one ayah",
    body:
      quranTask?.subtitle ||
      "One ayah can restart the rhythm. Recovery and Khatmah planning continue inside Reader.",
    meta: "Read • Listen • Reflect",
    icon: "refresh-cw",
  };
}

function buildHomeQuranDailyActionSteps({
  completed,
  quranTask,
  recentMedia,
  personalPlan,
}: {
  completed: boolean;
  quranTask?: HomePulseItem;
  recentMedia?: HomeRecentMediaSession | null;
  personalPlan?: PersonalHomePlanSummary | null;
}): HomeQuranDailyActionStep[] {
  const quranPlanStep =
    personalPlan?.dailyPath.find((step) =>
      step.toLowerCase().includes("quran"),
    ) || quranTask?.subtitle;
  const trustFirst = personalPlan?.trustMode === "scholar_review_first";

  return [
    {
      id: "read",
      title: completed ? "Review" : "Read",
      body:
        quranPlanStep ||
        "Open one ayah with translation and keep the session small.",
      status: completed ? "Protected" : "Start",
      icon: completed ? "check-circle" : "quran",
      tone: "gold",
      completed,
    },
    {
      id: "listen",
      title: recentMedia ? "Resume" : "Listen",
      body: recentMedia?.detailLabel || "Use recitation to slow the heart.",
      status: recentMedia ? "Ready" : "Optional",
      icon: "headphones",
      tone: "teal",
    },
    {
      id: "reflect",
      title: "Reflect",
      body:
        personalPlan?.recommendedActionReason ||
        "Save one private note after the ayah lands.",
      status: completed ? "Deepen" : "After reading",
      icon: "reflection",
      tone: "emerald",
    },
    {
      id: "sources",
      title: trustFirst ? "Review" : "Sources",
      body: trustFirst
        ? "Sensitive questions should become scholar packets."
        : "Keep NurAI Quran answers anchored and humble.",
      status: trustFirst ? "Scholar-first" : "Source-first",
      icon: "shield",
      tone: "teal",
    },
  ];
}

function qiblaDisplayState({
  qiblaDegrees,
  qiblaFeedbackLabel,
  qiblaAligned,
  qiblaHeadingAvailable,
}: {
  qiblaDegrees: number;
  qiblaFeedbackLabel?: string;
  qiblaAligned: boolean;
  qiblaHeadingAvailable: boolean;
}) {
  if (!qiblaHeadingAvailable) {
    return {
      eyebrow: "QIBLA DIRECTION",
      status: `${Math.round(qiblaDegrees)}° from north`,
      kaabaCopy: "Open compass",
      accessibility: `Open Qibla compass. Heading unavailable. Kaaba bearing ${Math.round(
        qiblaDegrees,
      )} degrees from north.`,
    };
  }
  if (qiblaAligned) {
    return {
      eyebrow: "FACING KAABA",
      status: "Facing Qibla",
      kaabaCopy: "Facing the Kaaba",
      accessibility: "Open Qibla compass. You are facing Qibla.",
    };
  }
  return {
    eyebrow: "LIVE KAABA",
    status: qiblaFeedbackLabel ?? "Turn toward Qibla",
    kaabaCopy: "Turn to Kaaba",
    accessibility: `Open Qibla compass. ${qiblaFeedbackLabel ?? "Turn toward Qibla"}.`,
  };
}

function relationLabel(role?: string) {
  if (!role) return "Member";
  if (role === "creator") return "Family";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function GeneratedHomeExperience({
  userName,
  locationLabel,
  hijriDateLabel,
  gregorianDateLabel,
  prayerName,
  prayerTimeLabel,
  nextPrayerTime,
  currentTime,
  qiblaDegrees,
  qiblaPointerDegrees,
  qiblaFeedbackLabel,
  qiblaAligned = false,
  qiblaHeadingAvailable = false,
  weather,
  weatherLoading,
  weatherError,
  streakDays,
  checkedDays,
  todayDayIndex,
  accentTheme,
  personalPlan,
  dailyJourney,
  quranDailyHandoff,
  quranReflectionCircleSummary,
  personalAITier = "free",
  personalAIBriefing,
  personalAIResponse,
  personalAILoading = false,
  personalAIError,
  personalAIUpdatedAt,
  homeHealth,
  homeTasbeeh,
  pulseItems,
  onPrayerPress,
  onQiblaPress,
  onWeatherPress,
  onUpgradePress,
  v3Greeting,
  v3Nudge,
  onV3NudgeDismiss,
  onV3NudgeAction,
  onPulseComplete,
  quickAccessItems,
  allQuickAccessItems,
  recentQuickAccessIds,
  recentMedia,
  onQuickAccessPress,
  onRecentMediaPress,
  onQuickAccessReplace,
  onQuickAccessMove,
  onQuickAccessReset,
  onPersonalAIRefresh,
  onPersonalAIActionPress,
  onPersonalAIFeedback,
  onFamilyPress,
  onSearchPress,
  onPersonalGuidePress,
  onScholarReviewPress,
  onPersonalPlanControlsPress,
  onJourneyActionPress,
  onGardenPress,
  topInset = 0,
}: GeneratedHomeExperienceProps) {
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const [quickAccessVisible, setQuickAccessVisible] = useState(false);
  const [quickAccessOpenMode, setQuickAccessOpenMode] =
    useState<QuickAccessOpenMode>("browse");
  const [editingQuickAccessSlot, setEditingQuickAccessSlot] = useState<
    number | null
  >(null);
  const openQuickAccess = useCallback(
    (mode: QuickAccessOpenMode = "browse") => {
      setQuickAccessOpenMode(mode);
      setEditingQuickAccessSlot(mode === "edit" ? 0 : null);
      setQuickAccessVisible(true);
    },
    [],
  );
  const closeQuickAccess = useCallback(() => {
    setQuickAccessVisible(false);
    setQuickAccessOpenMode("browse");
    setEditingQuickAccessSlot(null);
  }, []);
  const displayName = cleanName(userName);
  const completedPulseCount = useMemo(
    () => pulseItems.filter((item) => item.completed).length,
    [pulseItems],
  );
  const totalToday = pulseItems.length || 3;
  const priority = useMemo(
    () =>
      buildHomePriority({
        focus: "auto",
        pulseItems,
        prayerName,
        nextPrayerTime,
        currentTime,
      }),
    [currentTime, nextPrayerTime, prayerName, pulseItems],
  );
  const localInsight = useMemo(
    () =>
      buildLocalInsight({
        prayerName,
        nextPrayerTime,
        currentTime,
        weather,
        completedToday: completedPulseCount,
        totalToday,
      }),
    [
      completedPulseCount,
      currentTime,
      nextPrayerTime,
      prayerName,
      totalToday,
      weather,
    ],
  );
  const continueItems = useMemo(
    () =>
      buildContinueItems({
        pulseItems,
        prayerName,
        prayerTimeLabel,
      }),
    [prayerName, prayerTimeLabel, pulseItems],
  );
  const todayCommandItems = useMemo(
    () =>
      buildTodayCommandItems({
        pulseItems,
        prayerName,
        prayerTimeLabel,
        quranDailyHandoff,
        quranReflectionCircleSummary,
      }),
    [
      prayerName,
      prayerTimeLabel,
      pulseItems,
      quranDailyHandoff,
      quranReflectionCircleSummary,
    ],
  );
  const todayNurAINudge = useMemo(
    () =>
      buildTodayDeenNurAINudge({
        items: todayCommandItems,
        personalPlan,
        completedToday: completedPulseCount,
        totalToday,
        prayerName,
        prayerTimeLabel,
      }),
    [
      completedPulseCount,
      personalPlan,
      prayerName,
      prayerTimeLabel,
      totalToday,
      todayCommandItems,
    ],
  );
  const countdown = formatCountdown(nextPrayerTime, currentTime);
  const periodLabel = prayerPeriodLabel(
    prayerName,
    nextPrayerTime,
    currentTime,
  );
  const weatherSummary = weatherGuidance(weather, prayerName, weatherError);
  const handleTodayCommandPress = useCallback(
    (id: TodayCommandItem["id"]) => {
      if (id === "prayer") {
        onPrayerPress();
        return;
      }
      if (id === "quran") {
        onQuickAccessPress("quran");
        return;
      }
      if (id === "learn") {
        onQuickAccessPress("arabic_learning");
        return;
      }
      if (id === "dua") {
        onQuickAccessPress("duas");
        return;
      }
      onFamilyPress();
    },
    [onFamilyPress, onPrayerPress, onQuickAccessPress],
  );
  const handlePrimaryActionPress = useCallback(() => {
    if (dailyJourney?.primaryAction) {
      onJourneyActionPress(dailyJourney.primaryAction);
      return;
    }
    if (priority.taskId) {
      onPulseComplete(priority.taskId);
      return;
    }
    onQuickAccessPress(featureIdForCategory(priority.category));
  }, [
    dailyJourney,
    onJourneyActionPress,
    onPulseComplete,
    onQuickAccessPress,
    priority.category,
    priority.taskId,
  ]);
  const safeTopPadding = Math.max(topInset + 12, 70);
  const visibleCommands = todayCommandItems.slice(0, 3);
  const visibleContinueItems = continueItems.slice(0, 2);
  const weekKeys = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => weekDateKey(currentTime, index)),
    [currentTime],
  );
  const primaryActionTitle =
    dailyJourney?.primaryAction.title || priority.title;
  const primaryActionBody =
    dailyJourney?.primaryAction.subtitle || priority.body;

  return (
    <LinearGradient
      colors={["transparent", "transparent", "transparent"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.shell,
        styles.cleanHomeShell,
        { paddingTop: safeTopPadding },
      ]}
    >
      <MasjidBackdrop />
      <View style={styles.cleanHomeHeader}>
        <View style={styles.cleanGreetingCopy}>
          <Text style={styles.cleanGreetingKicker}>As-salamu alaykum</Text>
          <View style={styles.cleanNameRow}>
            <Text style={styles.cleanGreetingName} numberOfLines={1}>
              {displayName}
            </Text>
          </View>
          <Text style={styles.cleanGreetingSubcopy} numberOfLines={1}>
            Prayer, Quran and daily progress.
          </Text>
        </View>
        <View style={styles.cleanHeaderRight}>
          <Pressable
            onPress={onPrayerPress}
            style={styles.cleanLocationPill}
            accessibilityRole="button"
            accessibilityLabel={`Open prayer times for ${locationLabel}`}
            testID="button-home-location"
          >
            <AppIcon name="map-pin" size={14} color={COLORS.emerald} />
            <Text style={styles.cleanLocationText} numberOfLines={1}>
              {locationLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={onPrayerPress}
            style={styles.dateBlock}
            testID="button-home-date"
            accessibilityRole="button"
            accessibilityLabel={`Open prayer times. ${hijriDateLabel}. ${gregorianDateLabel}. ${prayerName} at ${prayerTimeLabel}.`}
          >
            <View style={styles.dateBlockText}>
              <Text style={styles.hijriDate} numberOfLines={1}>
                {hijriDateLabel}
              </Text>
              <Text style={styles.gregDate} numberOfLines={1}>
                {gregorianDateLabel}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View
        style={[styles.orbStage, weatherExpanded ? styles.orbStageOpen : null]}
      >
        <HomePrayerOrb
          prayerName={prayerName}
          countdown={countdown}
          prayerTimeLabel={prayerTimeLabel}
          periodLabel={periodLabel}
          qiblaDegrees={qiblaDegrees}
          qiblaPointerDegrees={qiblaPointerDegrees}
          qiblaFeedbackLabel={qiblaFeedbackLabel}
          qiblaAligned={qiblaAligned}
          qiblaHeadingAvailable={qiblaHeadingAvailable}
          onPress={onPrayerPress}
          onQiblaPress={onQiblaPress}
        />
        <HomeWeatherPill
          weather={weather}
          weatherLoading={weatherLoading}
          guidance={weatherSummary}
          prayerName={prayerName}
          nextPrayerTime={nextPrayerTime}
          locationLabel={locationLabel}
          expanded={weatherExpanded}
          onPress={() => {
            setWeatherExpanded((current) => !current);
            if (!weather && !weatherLoading) onWeatherPress();
          }}
        />
      </View>

      <UnifiedPersonalAICard
        briefing={personalAIBriefing}
        userTier={personalAITier}
        prayerName={prayerName}
        prayerTimeLabel={prayerTimeLabel}
        quranDailyHandoff={quranDailyHandoff}
        homeHealth={homeHealth}
        loading={personalAILoading}
        error={personalAIError}
        onRefresh={onPersonalAIRefresh}
        onAskPress={onPersonalGuidePress}
        onFeedback={onPersonalAIFeedback}
      />

      <CompactStreakCard
        streakDays={streakDays}
        checkedDays={checkedDays}
        weekKeys={weekKeys}
        todayDayIndex={todayDayIndex}
        completedToday={completedPulseCount}
        totalToday={totalToday}
        onPress={onGardenPress}
      />

      <CompactHomeShortcutRow
        quickAccessItems={quickAccessItems}
        continueItems={visibleContinueItems}
        recentMedia={recentMedia}
        onQuickAccessPress={onQuickAccessPress}
        onRecentMediaPress={onRecentMediaPress}
        onSearchPress={onSearchPress}
        onOpenSheet={() => openQuickAccess("browse")}
        onOpenEditor={() => openQuickAccess("edit")}
      />

      <QuickAccessSheet
        visible={quickAccessVisible}
        selectedItems={quickAccessItems}
        allItems={allQuickAccessItems}
        startInCustomizeMode={quickAccessOpenMode === "edit"}
        recentIds={recentQuickAccessIds}
        editingSlot={editingQuickAccessSlot}
        onSelectSlot={setEditingQuickAccessSlot}
        onReplace={(featureId) => {
          if (editingQuickAccessSlot == null) return;
          onQuickAccessReplace(editingQuickAccessSlot, featureId);
          setEditingQuickAccessSlot(null);
        }}
        suggestedIds={quickAccessCategoryPriority(priority.category)}
        onMove={(direction) => {
          if (editingQuickAccessSlot == null) return;
          const nextSlot = editingQuickAccessSlot + direction;
          if (nextSlot < 0 || nextSlot >= quickAccessItems.length) return;
          onQuickAccessMove(editingQuickAccessSlot, direction);
          setEditingQuickAccessSlot(nextSlot);
        }}
        onOpen={(id) => {
          closeQuickAccess();
          onQuickAccessPress(id);
        }}
        onReset={() => {
          onQuickAccessReset();
          setEditingQuickAccessSlot(null);
        }}
        onClose={closeQuickAccess}
      />
    </LinearGradient>
  );
}

function chipLabel(value?: string | null) {
  const words = (value || "").trim().split(/\s+/).slice(0, 2).join(" ");
  return words.length > 15
    ? `${words.slice(0, 14).trim()}…`
    : words || "Signal";
}

function chipLabelFor(row: { id?: string; title?: string }) {
  switch (row.id) {
    case "quran":
      return "Quran";
    case "prayer":
      return "Prayer";
    case "weather":
      return "Weather";
    case "tasbeeh":
      return "Dhikr";
    case "charity":
      return "Giving";
    case "arabic":
      return "Arabic";
    default:
      return chipLabel(row.title);
  }
}

function compactBriefingText(value?: string | null, fallback = "") {
  const clean = value?.replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.length > 260 ? `${clean.slice(0, 257).trim()}...` : clean;
}

function formatBriefingUpdatedAt(updatedAt?: string | null) {
  if (!updatedAt) return null;
  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - parsed.getTime()) / 60_000),
  );
  if (elapsedMinutes < 1) return "Updated now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  return `Updated ${parsed.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  })}`;
}

function localPersonalAIBriefingBody({
  localInsight,
  quranDailyHandoff,
  weatherSummary,
  prayerName,
  tasbeeh,
}: {
  localInsight: HomeLocalInsight;
  quranDailyHandoff?: QuranDailySessionHandoff | null;
  weatherSummary: string;
  prayerName: string;
  tasbeeh?: HomeTasbeehSummary;
}) {
  const weatherLooksActionable =
    /(rain|wind|hydrate|warm|cold|risk|journey)/i.test(weatherSummary || "");
  if ((tasbeeh?.todayTotal ?? 0) > 0) {
    return `You have completed ${tasbeeh?.todayTotal} ${tasbeeh?.dhikrLabel || "dhikr"} today. Protect ${prayerName}, then add one short round when your day opens again.`;
  }
  if (quranDailyHandoff) {
    const weatherTail =
      weatherLooksActionable && weatherSummary ? ` ${weatherSummary}.` : "";
    return `${quranDailyHandoff.title}: ${quranDailyHandoff.nextActionLabel}. Keep this pace steady; one visible Quran step today is enough to move your journey forward.${weatherTail}`;
  }
  if (
    weatherSummary &&
    !weatherSummary.toLowerCase().includes("tap for live") &&
    weatherLooksActionable
  ) {
    return `${weatherSummary}. Prepare for ${prayerName}, then keep one small Quran or dhikr action moving.`;
  }
  return localInsight.body;
}

function localPersonalAIActionLabel(localInsight: HomeLocalInsight) {
  if (localInsight.tone === "quran") return "Open Quran";
  if (localInsight.tone === "weather" || localInsight.tone === "prayer") {
    return "Prayer Times";
  }
  if (localInsight.tone === "progress") return "Continue today";
  return "Open Quran";
}

function UnifiedPersonalAICard({
  briefing,
  userTier,
  prayerName,
  prayerTimeLabel,
  quranDailyHandoff,
  homeHealth,
  loading,
  error,
  onRefresh,
  onAskPress,
  onFeedback,
}: {
  briefing: PersonalIntelligenceBriefing;
  userTier: NurAIPlanTier;
  prayerName: string;
  prayerTimeLabel: string;
  quranDailyHandoff?: QuranDailySessionHandoff | null;
  homeHealth?: HomeHealthSnapshot;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onAskPress?: (prompt?: string) => void;
  onFeedback?: (
    key: string,
    category: PersonalIntelligenceBriefing["category"],
    feedback: HomeAIFeedbackValue,
  ) => void;
}) {
  const [isSaved, setIsSaved] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const aiExperience = resolvePersonalAIExperience(userTier, "home");
  const contextLabel =
    briefing.category === "prayer"
      ? "Before your next prayer"
      : briefing.category === "quran"
        ? "Your Quran rhythm"
        : briefing.category === "reflection"
          ? "A thought for today"
          : briefing.category === "health"
            ? "A gentle check-in"
            : briefing.category === "trust"
              ? "A careful next step"
              : userTier === "free"
                ? aiExperience.customerLabel
                : "For your day";
  const personalisationSource =
    briefing.modelMode === "personalized"
      ? ("v3_paid_ai" as const)
      : error
        ? ("v3_offline_fallback" as const)
        : ("v3_on_device" as const);
  const contextSignals = useMemo(() => {
    if (userTier === "free") return [];
    return buildPaidHomeContextSignals({
      briefing,
      prayerName,
      prayerTimeLabel,
      quranDailyHandoff,
      homeHealth,
    });
  }, [
    briefing,
    homeHealth,
    prayerName,
    prayerTimeLabel,
    quranDailyHandoff,
    userTier,
  ]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      isHomeAIContextMessageSaved(briefing.id),
      loadLastPresentedHomeAIContextMessageId(),
    ]).then(([saved, lastPresentedId]) => {
      if (cancelled) return;
      setIsSaved(saved);
      setIsNew(lastPresentedId !== briefing.id);
      void markHomeAIContextMessagePresented(briefing.id);
    });
    return () => {
      cancelled = true;
    };
  }, [briefing.id]);

  const handleSave = useCallback(async () => {
    if (isSaved) {
      await removeSavedHomeAIContextMessage(briefing.id);
      setIsSaved(false);
      return;
    }
    await saveHomeAIContextMessage({
      id: briefing.id,
      category: briefing.category,
      headline: briefing.title,
      message: briefing.body,
      contextLabel,
      personalisationSource,
      askPrompt: briefing.askPrompt,
    });
    setIsSaved(true);
  }, [briefing, contextLabel, isSaved, personalisationSource]);

  return (
    <NurAIContextCard
      headline={briefing.title}
      message={briefing.body}
      contextLabel={contextLabel}
      userTier={userTier}
      aiStatus={
        error ? "ai_unavailable" : isSaved ? "saved" : isNew ? "new" : "ready"
      }
      loading={loading}
      error={error}
      onPress={() => onAskPress?.(briefing.askPrompt)}
      onDismiss={() => {
        setIsNew(false);
        onFeedback?.(briefing.feedbackKey, briefing.category, "not_now");
      }}
      onSave={() => void handleSave()}
      onShowFewer={() =>
        onFeedback?.(briefing.feedbackKey, briefing.category, "show_less")
      }
      onRefresh={userTier === "free" ? undefined : onRefresh}
      personalisationSource={personalisationSource}
      contextSignals={contextSignals}
      messageId={briefing.id}
      accessibilityLabel={`Nur AI. ${aiExperience.customerLabel}${isSaved ? ", saved" : ""}. ${contextLabel}. ${briefing.title}. ${briefing.body}.${contextSignals.length ? ` Today's context: ${contextSignals.map((signal) => `${signal.label}, ${signal.value}`).join(". ")}.` : ""} Opens your private guide with this context.`}
    />
  );
}

function buildPaidHomeContextSignals({
  briefing,
  prayerName,
  prayerTimeLabel,
  quranDailyHandoff,
  homeHealth,
}: {
  briefing: PersonalIntelligenceBriefing;
  prayerName: string;
  prayerTimeLabel: string;
  quranDailyHandoff?: QuranDailySessionHandoff | null;
  homeHealth?: HomeHealthSnapshot;
}): NurAIContextSignal[] {
  const total = briefing.daySnapshot.total;
  const completed = briefing.daySnapshot.completed;
  const signals: NurAIContextSignal[] = [
    {
      id: "today-progress",
      label: "Today",
      value: total > 0 ? `${completed}/${total} complete` : "Start gently",
      icon: "check-circle",
      quickAccessId: "streak",
      tone: "emerald",
    },
  ];

  if (quranDailyHandoff) {
    signals.push({
      id: "quran-rhythm",
      label: "Quran",
      value: chipLabel(
        quranDailyHandoff.statusLabel || quranDailyHandoff.title,
      ),
      icon: "book-open",
      quickAccessId: "quran",
      tone: "gold",
    });
  } else {
    const prayerValue = [prayerName, prayerTimeLabel]
      .filter((value) => value && value !== "—")
      .join(" · ");
    signals.push({
      id: "next-prayer",
      label: "Next prayer",
      value: chipLabel(prayerValue || "Preparing"),
      icon: "clock",
      quickAccessId: "prayer",
      tone: "gold",
    });
  }

  const healthValue = homeHealth?.metrics?.hasData
    ? homeHealth.metrics.stepsLabel ||
      homeHealth.metrics.sleepLabel ||
      homeHealth.metrics.heartLabel ||
      "Today's data"
    : homeHealth?.available && homeHealth.pendingCount > 0
      ? `${homeHealth.pendingCount} care step${homeHealth.pendingCount === 1 ? "" : "s"}`
      : null;
  if (healthValue) {
    signals.push({
      id: "body-care",
      label: "Body care",
      value: chipLabel(healthValue),
      icon: "heart",
      quickAccessId: "muslim_health",
      tone: "emerald",
    });
  }

  return signals.slice(0, 3);
}

function PaidVerifiedBadge({
  mode,
  accentColor,
}: {
  mode: Exclude<HomeAiMode, "local">;
  accentColor?: string;
}) {
  const isScholar = mode === "scholar";
  const label = isScholar ? "Scholar access" : "Premium verified";
  const accent =
    accentColor ?? (isScholar ? COLORS.goldBright : COLORS.emerald);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Subscription access: ${label}`}
      style={[
        styles.paidVerifiedBadge,
        {
          borderColor: alphaColor(accent, 0.32, "rgba(255,212,107,0.32)"),
          backgroundColor: alphaColor(accent, 0.12, "rgba(255,212,107,0.12)"),
        },
      ]}
      testID="home-paid-verified-badge"
    >
      <View style={[styles.paidVerifiedIcon, { backgroundColor: accent }]}>
        <AppIcon name="check" size={9} color="#04120D" />
      </View>
      <Text style={[styles.paidVerifiedText, { color: accent }]}>{label}</Text>
    </View>
  );
}

function CompactPrayerStatusCard({
  hijriDateLabel,
  gregorianDateLabel,
  prayerName,
  prayerTimeLabel,
  compactCountdown,
  periodLabel,
  weather,
  weatherLoading,
  weatherSummary,
  qiblaState,
  onPrayerPress,
  onQiblaPress,
  onWeatherPress,
}: {
  hijriDateLabel: string;
  gregorianDateLabel: string;
  prayerName: string;
  prayerTimeLabel: string;
  compactCountdown: string;
  periodLabel: string;
  weather: LiveWeatherSnapshot | null;
  weatherLoading: boolean;
  weatherSummary: string;
  qiblaState: ReturnType<typeof qiblaDisplayState>;
  onPrayerPress: () => void;
  onQiblaPress: () => void;
  onWeatherPress: () => void;
}) {
  return (
    <View style={styles.compactPrayerCard} testID="home-compact-prayer-card">
      <Pressable
        onPress={onPrayerPress}
        style={({ pressed }) => [
          styles.compactPrayerMain,
          pressed ? styles.cleanPressed : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open prayer times. Next prayer ${prayerName} at ${prayerTimeLabel}, ${compactCountdown} left.`}
        testID="button-home-prayer-summary"
      >
        <View style={styles.compactPrayerDateRow}>
          <Text style={styles.compactHijriDate} numberOfLines={1}>
            {hijriDateLabel}
          </Text>
          <Text style={styles.compactGregDate} numberOfLines={1}>
            {gregorianDateLabel}
          </Text>
        </View>
        <View style={styles.compactPrayerNameRow}>
          <View style={styles.compactPrayerIcon}>
            <AppIcon name="moon" size={18} color={COLORS.goldBright} />
          </View>
          <View style={styles.compactPrayerCopy}>
            <Text style={styles.compactPrayerEyebrow}>NEXT PRAYER</Text>
            <Text style={styles.compactPrayerName} numberOfLines={1}>
              {prayerName}
            </Text>
          </View>
          <View style={styles.compactPrayerTimeBlock}>
            <Text style={styles.compactPrayerTime} numberOfLines={1}>
              {prayerTimeLabel}
            </Text>
            <Text style={styles.compactPrayerCountdown} numberOfLines={1}>
              {compactCountdown} left
            </Text>
          </View>
        </View>
        <Text style={styles.compactPrayerPeriod} numberOfLines={1}>
          {periodLabel}
        </Text>
      </Pressable>

      <View style={styles.compactPrayerMetaGrid}>
        <Pressable
          onPress={onWeatherPress}
          style={styles.compactMetaPill}
          accessibilityRole="button"
          accessibilityLabel={`Weather. ${weatherSummary}`}
        >
          {weatherLoading ? (
            <ActivityIndicator color={COLORS.teal} size="small" />
          ) : (
            <AppIcon
              name={weatherIconName(weather)}
              size={15}
              color={COLORS.teal}
            />
          )}
          <Text style={styles.compactMetaText} numberOfLines={1}>
            {weather?.temperatureC != null
              ? `${Math.round(weather.temperatureC)}° • ${weatherSummary}`
              : weatherSummary}
          </Text>
        </Pressable>
        <Pressable
          onPress={onQiblaPress}
          style={styles.compactMetaPill}
          accessibilityRole="button"
          accessibilityLabel={qiblaState.accessibility}
        >
          <AppIcon name="navigation" size={15} color={COLORS.goldBright} />
          <Text style={styles.compactMetaText} numberOfLines={1}>
            {qiblaState.status}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function CompactTodaySystemCard({
  completedToday,
  totalToday,
  primaryTitle,
  primaryBody,
  commands,
  onPrimaryPress,
  onCommandPress,
}: {
  completedToday: number;
  totalToday: number;
  primaryTitle: string;
  primaryBody: string;
  commands: TodayCommandItem[];
  onPrimaryPress: () => void;
  onCommandPress: (id: TodayCommandItem["id"]) => void;
}) {
  const { theme } = useTheme();
  const accent = theme.primary;
  return (
    <View style={styles.compactTodayCard} testID="home-compact-today-card">
      <NuraiGlass
        style={StyleSheet.absoluteFill}
        radius={24}
        pointerEvents="none"
        tint="rgba(86,179,148,0.05)"
      />
      <View style={styles.compactTodayHeader}>
        <View>
          <Text style={[styles.compactSectionEyebrow, { color: accent }]}>
            TODAY
          </Text>
          <Text style={styles.compactTodayTitle} numberOfLines={1}>
            Essentials only
          </Text>
        </View>
        <View style={styles.compactProgressPill}>
          <Text style={styles.compactProgressText}>
            {completedToday}/{totalToday}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onPrimaryPress}
        style={({ pressed }) => [
          styles.compactPrimaryAction,
          {
            borderColor: alphaColor(accent, 0.22, "rgba(86,179,148,0.22)"),
            backgroundColor: alphaColor(accent, 0.07, "rgba(86,179,148,0.07)"),
          },
          pressed ? styles.cleanPressed : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${primaryTitle}. ${primaryBody}`}
        testID="button-home-primary-action"
      >
        <View style={[styles.compactPrimaryIcon, { backgroundColor: accent }]}>
          <AppIcon name="zap" size={18} color="#04120D" />
        </View>
        <View style={styles.compactPrimaryCopy}>
          <Text style={[styles.compactPrimaryLabel, { color: accent }]}>
            NEXT BEST STEP
          </Text>
          <Text style={styles.compactPrimaryTitle} numberOfLines={1}>
            {primaryTitle}
          </Text>
          <Text style={styles.compactPrimaryBody} numberOfLines={2}>
            {primaryBody}
          </Text>
        </View>
        <AppIcon name="arrow-right" size={18} color={accent} />
      </Pressable>

      <View style={styles.compactCommandList}>
        {commands.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onCommandPress(item.id)}
            style={({ pressed }) => [
              styles.compactCommandRow,
              item.completed ? styles.compactCommandRowComplete : null,
              pressed ? styles.cleanPressed : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.body}`}
            testID={`button-home-compact-command-${item.id}`}
          >
            <View
              style={[
                styles.compactCommandIcon,
                {
                  borderColor: alphaColor(
                    accent,
                    0.32,
                    "rgba(86,179,148,0.32)",
                  ),
                  backgroundColor: alphaColor(
                    accent,
                    0.1,
                    "rgba(86,179,148,0.1)",
                  ),
                },
              ]}
            >
              <AppIcon
                name={item.completed ? "check" : item.icon}
                size={16}
                color={accent}
              />
            </View>
            <View style={styles.compactCommandCopy}>
              <Text style={styles.compactCommandTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.compactCommandBody} numberOfLines={1}>
                {item.body}
              </Text>
            </View>
            <Text style={[styles.compactCommandMeta, { color: accent }]}>
              {item.meta}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CompactStreakCard({
  streakDays,
  checkedDays,
  weekKeys,
  todayDayIndex,
  completedToday,
  totalToday,
  onPress,
}: {
  streakDays: number;
  checkedDays: string[];
  weekKeys: string[];
  todayDayIndex: number;
  completedToday: number;
  totalToday: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const checkedSet = new Set(checkedDays);
  const completedThisWeek = weekKeys.filter((day) =>
    checkedSet.has(day),
  ).length;
  const title =
    streakDays > 0 ? `${streakDays} day streak` : "Plant your first day";
  const body =
    completedToday > 0
      ? `${completedToday} of ${totalToday} essentials watered today.`
      : "One sincere action keeps your garden growing.";
  const dayLetter = (day: string) => {
    const parsed = new Date(day);
    return Number.isNaN(parsed.getTime())
      ? ""
      : ["S", "M", "T", "W", "T", "F", "S"][parsed.getDay()];
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.compactStreakCard,
        pressed ? styles.cleanPressed : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open your deeds garden. ${title}. ${body}`}
      testID="button-home-compact-streak"
    >
      <NuraiGlass
        style={StyleSheet.absoluteFill}
        radius={22}
        pointerEvents="none"
        tint="rgba(86,179,148,0.05)"
      />
      <View style={styles.compactStreakHeader}>
        <View style={styles.compactStreakIcon}>
          <AppIcon name="sun" size={18} color={theme.scholar} />
        </View>
        <View style={styles.compactStreakCopy}>
          <Text
            style={[styles.compactSectionEyebrow, { color: theme.primary }]}
          >
            YOUR GARDEN
          </Text>
          <Text style={styles.compactStreakTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.compactStreakBody} numberOfLines={2}>
            {body}
          </Text>
        </View>
        <View style={styles.compactStreakCountBadge}>
          <Text style={styles.compactStreakCountValue}>
            {completedThisWeek}
          </Text>
          <Text style={styles.compactStreakCountLabel}>/7</Text>
        </View>
      </View>

      <View style={styles.compactGardenRow}>
        {weekKeys.map((day, index) => {
          const checked = checkedSet.has(day);
          const isToday = index === todayDayIndex;
          return (
            <View key={day} style={styles.compactGardenPlant}>
              <View
                style={[
                  styles.compactGardenBud,
                  checked ? styles.compactGardenBudChecked : null,
                  isToday ? styles.compactGardenBudToday : null,
                ]}
              >
                {checked ? (
                  <AppIcon name="check" size={11} color="#04120D" />
                ) : null}
              </View>
              <View
                style={[
                  styles.compactGardenStem,
                  checked ? styles.compactGardenStemChecked : null,
                ]}
              />
              <Text
                style={[
                  styles.compactGardenDay,
                  isToday ? styles.compactGardenDayToday : null,
                ]}
              >
                {dayLetter(day)}
              </Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

function CompactHomeShortcutRow({
  quickAccessItems,
  continueItems,
  recentMedia,
  onQuickAccessPress,
  onRecentMediaPress,
  onSearchPress,
  onOpenSheet,
  onOpenEditor,
}: {
  quickAccessItems: HomeQuickAccessItem[];
  continueItems: HomeContinueItem[];
  recentMedia?: HomeRecentMediaSession | null;
  onQuickAccessPress: (id: string) => void;
  onRecentMediaPress?: (session: HomeRecentMediaSession) => void;
  onSearchPress: () => void;
  onOpenSheet: () => void;
  onOpenEditor: () => void;
}) {
  const { theme } = useTheme();
  const accent = theme.primary;
  // Two different jobs, so two different treatments. Things already in
  // progress carry real state ("Al-Baqarah 2:52") and earn a full row that
  // shows it. Plain destinations only carry a static category, which as a
  // subtitle is noise — they read better as a compact tile row.
  const resumeItem = continueItems.slice(0, 1).map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    icon: item.icon,
    onPress: () => onQuickAccessPress(item.featureId),
  }))[0];
  const destinations = quickAccessItems.slice(0, 4).map((item) => ({
    id: item.id,
    title: item.label,
    icon: item.icon,
    liveValue: item.liveValue,
    onPress: () => onQuickAccessPress(item.id),
  }));

  return (
    <View style={styles.compactShortcutSection}>
      <View style={styles.compactShortcutHeader}>
        <View style={styles.compactShortcutHeadingCopy}>
          <Text style={[styles.compactSectionEyebrow, { color: accent }]}>
            QUICK ACCESS
          </Text>
          <Text style={styles.compactShortcutHint}>Your four, your way</Text>
        </View>
        <View style={styles.compactShortcutHeaderActions}>
          <Pressable
            onPress={onSearchPress}
            style={({ pressed }) => [
              styles.compactShortcutHeaderButton,
              pressed ? styles.cleanPressed : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Search NurAI"
            testID="button-home-quick-search"
          >
            <AppIcon name="search" size={16} color={accent} />
          </Pressable>
          <Pressable
            onPress={onOpenEditor}
            style={({ pressed }) => [
              styles.compactShortcutManageButton,
              pressed ? styles.cleanPressed : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Edit Home quick access"
            accessibilityHint="Opens the editor with your first shortcut selected."
            testID="button-home-open-launchpad"
          >
            <Text style={styles.compactShortcutManageText}>Edit</Text>
            <AppIcon name="sliders" size={14} color={accent} />
          </Pressable>
        </View>
      </View>

      {recentMedia && onRecentMediaPress ? (
        <Pressable
          onPress={() => onRecentMediaPress(recentMedia)}
          style={({ pressed }) => [
            styles.compactRecentMedia,
            {
              borderColor: alphaColor(accent, 0.18, "rgba(86,179,148,0.18)"),
              backgroundColor: alphaColor(
                accent,
                0.06,
                "rgba(86,179,148,0.06)",
              ),
            },
            pressed ? styles.cleanPressed : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Resume ${recentMedia.title}. ${recentMedia.subtitle}`}
        >
          <AppIcon
            name={recentMedia.kind === "quran" ? "headphones" : "music"}
            size={17}
            color={accent}
          />
          <View style={styles.compactRecentCopy}>
            <Text style={styles.compactRecentTitle} numberOfLines={1}>
              {recentMedia.title}
            </Text>
            <Text style={styles.compactRecentBody} numberOfLines={1}>
              {recentMedia.subtitle}
            </Text>
          </View>
          <AppIcon name="play" size={15} color={accent} />
        </Pressable>
      ) : null}

      {!recentMedia && resumeItem ? (
        <Pressable
          onPress={resumeItem.onPress}
          style={({ pressed }) => [
            styles.compactShortcutTile,
            pressed ? styles.cleanPressed : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Continue ${resumeItem.title}. ${resumeItem.body}`}
        >
          <NuraiGlass
            style={StyleSheet.absoluteFill}
            radius={18}
            pointerEvents="none"
            tint="rgba(86,179,148,0.035)"
          />
          <View style={styles.compactShortcutIcon}>
            <AppIcon name={resumeItem.icon} size={19} color={accent} />
          </View>
          <View style={styles.compactShortcutCopy}>
            <Text style={styles.compactContinueEyebrow}>CONTINUE</Text>
            <Text style={styles.compactShortcutText} numberOfLines={1}>
              {resumeItem.title}
            </Text>
            {resumeItem.body ? (
              <Text style={styles.compactShortcutBody} numberOfLines={1}>
                {resumeItem.body}
              </Text>
            ) : null}
          </View>
          <View style={styles.compactContinueAction}>
            <AppIcon name="arrow-right" size={16} color={accent} />
          </View>
        </Pressable>
      ) : null}

      <View style={styles.compactShortcutRail}>
        <NuraiGlass
          style={StyleSheet.absoluteFill}
          radius={22}
          pointerEvents="none"
          tint="rgba(12,22,25,0.08)"
        />
        {destinations.map((item) => (
          <Pressable
            key={item.id}
            onPress={item.onPress}
            onLongPress={onOpenEditor}
            delayLongPress={420}
            style={({ pressed }) => [
              styles.compactDestinationAction,
              pressed ? styles.cleanPressed : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.title}`}
            accessibilityHint="Long press to edit your Quick Access shortcuts."
            testID={`button-home-quick-${item.id}`}
          >
            <View style={styles.compactDestinationIconWrap}>
              <PremiumQuickAccessIcon id={item.id} icon={item.icon} size={23} />
            </View>
            <Text
              style={styles.compactDestinationText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {item.title}
            </Text>
            {item.liveValue ? (
              <Text style={styles.compactDestinationMeta} numberOfLines={1}>
                {item.liveValue}
              </Text>
            ) : null}
          </Pressable>
        ))}
        <Pressable
          onPress={onOpenSheet}
          style={({ pressed }) => [
            styles.compactDestinationExpandAction,
            pressed ? styles.cleanPressed : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Expand Quick Access"
          testID="button-home-expand-launchpad"
        >
          <View style={styles.compactDestinationExpandIcon}>
            <AppIcon name="maximize" size={18} color={accent} />
          </View>
          <Text style={styles.compactDestinationExpandText}>Expand</Text>
        </Pressable>
      </View>
    </View>
  );
}

function dailyProofAccent(category: DailyJourneyAction["category"]) {
  if (category === "quran" || category === "library") return COLORS.goldBright;
  if (category === "arabic" || category === "learning") return COLORS.teal;
  if (category === "reflection" || category === "dhikr") return COLORS.logoLime;
  return COLORS.emerald;
}

function DailyProofRail({
  journey,
  personalPlan,
  onPressAction,
}: {
  journey?: DailyDeenJourneyState | null;
  personalPlan?: PersonalHomePlanSummary | null;
  onPressAction: (action: DailyJourneyAction) => void;
}) {
  if (!journey) return null;

  const primaryAccent = dailyProofAccent(journey.primaryAction.category);
  const secondaryActions = journey.actions
    .filter((action) => action.id !== journey.primaryAction.id)
    .slice(0, 2);
  const sourceLabel = personalPlan
    ? `${personalPlan.planFreshnessLabel} • ${personalPlan.planReviewDueLabel}`
    : "Local journey signals only";

  return (
    <View style={styles.dailyProofRail} testID="home-daily-proof-rail">
      <View style={styles.dailyProofHeader}>
        <View style={styles.dailyProofHeaderCopy}>
          <Text style={styles.dailyProofEyebrow}>DAILY PROOF</Text>
          <Text style={styles.dailyProofTitle} numberOfLines={1}>
            {journey.title}
          </Text>
        </View>
        <View style={styles.dailyProofPercentPill}>
          <Text style={styles.dailyProofPercentText}>
            {journey.completionPercent}%
          </Text>
        </View>
      </View>

      <Text style={styles.dailyProofInsight} numberOfLines={2}>
        {journey.insight}
      </Text>

      <Pressable
        onPress={() => onPressAction(journey.primaryAction)}
        accessibilityRole="button"
        accessibilityLabel={`${journey.primaryAction.title}. ${journey.primaryAction.subtitle}`}
        accessibilityHint="Opens the next Daily Deen action from your current progress."
        testID="button-home-daily-proof-primary"
        style={({ pressed }) => [
          styles.dailyProofPrimaryAction,
          { borderColor: `${primaryAccent}33` },
          pressed ? styles.dailyProofPressed : null,
        ]}
      >
        <View
          style={[
            styles.dailyProofPrimaryIcon,
            { backgroundColor: `${primaryAccent}18` },
          ]}
        >
          <AppIcon
            name={journey.primaryAction.icon as AppIconName}
            size={17}
            color={primaryAccent}
          />
        </View>
        <View style={styles.dailyProofPrimaryCopy}>
          <Text style={styles.dailyProofReason} numberOfLines={1}>
            {journey.primaryAction.reason}
          </Text>
          <Text style={styles.dailyProofActionTitle} numberOfLines={1}>
            {journey.primaryAction.title}
          </Text>
          <Text style={styles.dailyProofActionBody} numberOfLines={2}>
            {journey.primaryAction.subtitle}
          </Text>
        </View>
        <View style={styles.dailyProofActionRight}>
          {journey.primaryAction.rewardLabel ? (
            <Text
              style={[styles.dailyProofReward, { color: primaryAccent }]}
              numberOfLines={1}
            >
              {journey.primaryAction.rewardLabel}
            </Text>
          ) : null}
          <AppIcon name="arrow-right" size={15} color={primaryAccent} />
        </View>
      </Pressable>

      {journey.progressSegments.length > 0 ? (
        <View style={styles.dailyProofSegments}>
          {journey.progressSegments.slice(0, 3).map((segment) => {
            const accent = dailyProofAccent(segment.id);
            return (
              <View
                key={segment.id}
                style={styles.dailyProofSegment}
                testID={`home-daily-proof-segment-${segment.id}`}
              >
                <View style={styles.dailyProofSegmentTop}>
                  <Text style={styles.dailyProofSegmentLabel} numberOfLines={1}>
                    {segment.label}
                  </Text>
                  <Text
                    style={[styles.dailyProofSegmentCount, { color: accent }]}
                  >
                    {segment.completed}/{segment.total}
                  </Text>
                </View>
                <View style={styles.dailyProofSegmentTrack}>
                  <View
                    style={[
                      styles.dailyProofSegmentFill,
                      { width: `${segment.percent}%`, backgroundColor: accent },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {secondaryActions.length > 0 ? (
        <View style={styles.dailyProofMiniActions}>
          {secondaryActions.map((action) => {
            const accent = dailyProofAccent(action.category);
            return (
              <Pressable
                key={action.id}
                onPress={() => onPressAction(action)}
                accessibilityRole="button"
                accessibilityLabel={`${action.title}. ${action.subtitle}`}
                testID={`button-home-daily-proof-action-${action.id}`}
                style={({ pressed }) => [
                  styles.dailyProofMiniAction,
                  pressed ? styles.dailyProofPressed : null,
                ]}
              >
                <AppIcon
                  name={action.icon as AppIconName}
                  size={13}
                  color={accent}
                />
                <Text style={styles.dailyProofMiniText} numberOfLines={1}>
                  {action.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View
        style={styles.dailyProofBoundary}
        testID="home-daily-proof-boundary"
      >
        <AppIcon name="shield" size={12} color={COLORS.teal} />
        <Text style={styles.dailyProofBoundaryText} numberOfLines={2}>
          {sourceLabel}. Daily Proof uses visible tasks, Quran progress, goals,
          and prayer timing; it does not read private notes or make rulings.
        </Text>
      </View>
    </View>
  );
}

function QuranFlagshipPanel({
  quranTask,
  recentMedia,
  personalPlan,
  quranDailyHandoff,
  aiPaid,
  onOpenQuran,
  onAskNurAI,
}: {
  quranTask?: HomePulseItem;
  recentMedia?: HomeRecentMediaSession | null;
  personalPlan?: PersonalHomePlanSummary | null;
  quranDailyHandoff?: QuranDailySessionHandoff | null;
  aiPaid: boolean;
  onOpenQuran: () => void;
  onAskNurAI: () => void;
}) {
  const completed = !!quranTask?.completed;
  const dailyActionSteps = quranDailyHandoff
    ? buildHomeQuranReaderSyncedActionSteps(quranDailyHandoff)
    : buildHomeQuranDailyActionSteps({
        completed,
        quranTask,
        recentMedia,
        personalPlan,
      });
  const quranContinuity = buildHomeQuranContinuityState({
    completed,
    quranTask,
    recentMedia,
    personalPlan,
  });
  const nextQuranAction =
    dailyActionSteps.find((step) => step.status === "Next") ||
    dailyActionSteps.find((step) => !step.completed) ||
    dailyActionSteps[0];
  const nextQuranAccent =
    nextQuranAction?.tone === "gold"
      ? COLORS.goldBright
      : nextQuranAction?.tone === "emerald"
        ? COLORS.logoLime
        : COLORS.teal;
  const quranBody =
    quranTask?.subtitle ||
    recentMedia?.subtitle ||
    (personalPlan
      ? `${personalPlan.quranLabel}: ${personalPlan.dailyPath[1] || "read or listen with focus"}.`
      : "Read one ayah, listen with focus, then save one reflection.");
  return (
    <View style={styles.quranFlagshipPanel}>
      <LinearGradient
        colors={["rgba(255,212,107,0.16)", "rgba(86,179,148,0.06)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.quranFlagshipTop}>
        <View style={styles.quranFlagshipSeal}>
          <AppIcon name="quran" size={22} color={COLORS.goldBright} />
        </View>
        <View style={styles.quranFlagshipCopy}>
          <Text style={styles.quranFlagshipEyebrow}>QURAN IS THE ANCHOR</Text>
          <Text style={styles.quranFlagshipTitle} numberOfLines={1}>
            {completed ? "Quran light protected" : "Begin with Quran today"}
          </Text>
          <Text style={styles.quranFlagshipBody} numberOfLines={2}>
            {quranBody}
          </Text>
        </View>
        <View
          style={[
            styles.quranFlagshipStatus,
            completed ? styles.quranFlagshipStatusComplete : null,
          ]}
        >
          <AppIcon
            name={completed ? "check" : "star"}
            size={11}
            color={completed ? COLORS.bg : COLORS.goldBright}
          />
          <Text
            style={[
              styles.quranFlagshipStatusText,
              completed ? styles.quranFlagshipStatusTextComplete : null,
            ]}
          >
            {completed ? "Done" : "Today"}
          </Text>
        </View>
      </View>

      <View
        style={styles.quranContinuityCard}
        testID="home-quran-continuity-card"
      >
        <View style={styles.quranContinuityIcon}>
          <AppIcon
            name={quranContinuity.icon}
            size={16}
            color={COLORS.goldBright}
          />
        </View>
        <View style={styles.quranContinuityCopy}>
          <Text style={styles.quranContinuityEyebrow}>QURAN CONTINUITY</Text>
          <Text style={styles.quranContinuityTitle} numberOfLines={1}>
            {quranContinuity.title}
          </Text>
          <Text style={styles.quranContinuityBody} numberOfLines={2}>
            {quranContinuity.body}
          </Text>
        </View>
        <View style={styles.quranContinuityMetaPill}>
          <Text style={styles.quranContinuityMetaText} numberOfLines={1}>
            {quranContinuity.meta}
          </Text>
        </View>
      </View>

      {nextQuranAction ? (
        <Pressable
          onPress={nextQuranAction.id === "sources" ? onAskNurAI : onOpenQuran}
          style={({ pressed }) => [
            styles.quranNextActionRail,
            { borderColor: `${nextQuranAccent}42` },
            pressed ? { opacity: 0.84, transform: [{ scale: 0.99 }] } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Next Quran step. ${nextQuranAction.title}. ${nextQuranAction.body}. ${nextQuranAction.status}.`}
          testID="button-home-quran-next-step"
        >
          <View
            style={[
              styles.quranNextActionIcon,
              { backgroundColor: `${nextQuranAccent}16` },
            ]}
          >
            <AppIcon
              name={nextQuranAction.icon}
              size={16}
              color={nextQuranAccent}
            />
          </View>
          <View style={styles.quranNextActionCopy}>
            <Text
              style={[
                styles.quranNextActionEyebrow,
                { color: nextQuranAccent },
              ]}
            >
              NEXT QURAN STEP
            </Text>
            <Text style={styles.quranNextActionTitle} numberOfLines={1}>
              {nextQuranAction.title}
            </Text>
            <Text style={styles.quranNextActionBody} numberOfLines={2}>
              {nextQuranAction.body}
            </Text>
            <Text
              style={styles.quranNextActionProof}
              numberOfLines={1}
              testID="home-quran-next-step-proof"
            >
              {quranDailyHandoff?.proofLabel ||
                personalPlan?.reviewCadenceLabel ||
                "Read, listen, reflect, and keep sources clear"}
            </Text>
          </View>
          <View
            style={[
              styles.quranNextActionPill,
              { borderColor: `${nextQuranAccent}55` },
            ]}
          >
            <Text
              style={[
                styles.quranNextActionPillText,
                { color: nextQuranAccent },
              ]}
              numberOfLines={1}
            >
              {nextQuranAction.status}
            </Text>
            <AppIcon name="arrow-right" size={12} color={nextQuranAccent} />
          </View>
        </Pressable>
      ) : null}

      <View
        style={styles.quranDailyActionPlan}
        testID="home-quran-daily-action-plan"
      >
        <View style={styles.quranDailyActionHeader}>
          <Text style={styles.quranDailyActionEyebrow}>
            TODAY'S QURAN ACTION
          </Text>
          <View style={styles.quranDailyActionSourcePill}>
            <AppIcon name="shield" size={11} color={COLORS.teal} />
            <Text style={styles.quranDailyActionSourceText}>
              {quranDailyHandoff ? "Reader-synced" : "Source-aware"}
            </Text>
          </View>
        </View>

        {quranDailyHandoff ? (
          <View
            style={styles.quranDailyHandoffSummary}
            testID="home-quran-daily-handoff-summary"
          >
            <Text style={styles.quranDailyHandoffStatus}>
              Reader-synced Quran habit handoff
            </Text>
            <Text style={styles.quranDailyHandoffProof} numberOfLines={2}>
              {quranDailyHandoff.proofLabel ||
                "Home shows a habit handoff from saved Quran progress."}
            </Text>
            <View
              style={styles.quranDailyHandoffBoundary}
              testID="home-quran-daily-handoff-boundary"
            >
              <AppIcon name="shield" size={12} color={COLORS.goldBright} />
              <Text
                style={styles.quranDailyHandoffBoundaryText}
                numberOfLines={2}
              >
                Source-aware Quran help uses reader progress and visible app
                signals only; sensitive questions should go to scholar review.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.quranDailyActionGrid}>
          {dailyActionSteps.map((step) => {
            const accent =
              step.tone === "gold"
                ? COLORS.goldBright
                : step.tone === "emerald"
                  ? COLORS.logoLime
                  : COLORS.teal;
            return (
              <Pressable
                key={step.id}
                onPress={step.id === "sources" ? onAskNurAI : onOpenQuran}
                accessibilityRole="button"
                accessibilityLabel={`${step.title}. ${step.body}. ${step.status}.`}
                testID={`button-home-quran-daily-action-${step.id}`}
                style={({ pressed }) => [
                  styles.quranDailyActionStep,
                  step.completed ? styles.quranDailyActionStepComplete : null,
                  { borderColor: `${accent}2E` },
                  pressed
                    ? { opacity: 0.84, transform: [{ scale: 0.992 }] }
                    : null,
                ]}
              >
                <View
                  style={[
                    styles.quranDailyActionIcon,
                    { backgroundColor: `${accent}16` },
                  ]}
                >
                  <AppIcon name={step.icon} size={15} color={accent} />
                </View>
                <View style={styles.quranDailyActionCopy}>
                  <View style={styles.quranDailyActionTitleRow}>
                    <Text
                      style={styles.quranDailyActionTitle}
                      numberOfLines={1}
                    >
                      {step.title}
                    </Text>
                    <Text
                      style={[styles.quranDailyActionStatus, { color: accent }]}
                      numberOfLines={1}
                    >
                      {step.status}
                    </Text>
                  </View>
                  <Text style={styles.quranDailyActionBody} numberOfLines={2}>
                    {step.body}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {personalPlan ? (
        <View
          style={styles.quranPersonalBoundary}
          testID="home-quran-personalization-boundary"
        >
          <AppIcon name="shield" size={12} color={COLORS.teal} />
          <View style={styles.quranPersonalBoundaryCopy}>
            <Text style={styles.quranPersonalBoundaryText} numberOfLines={1}>
              {personalPlan.quranLabel} • {personalPlan.prayerHabitLabel} •{" "}
              {personalPlan.guidanceLabel}
            </Text>
            <Text style={styles.quranPersonalBoundarySubtext} numberOfLines={1}>
              {personalPlan.arabicLabel} • {personalPlan.familyLabel} • visible
              app signals only
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.quranFlagshipActions}>
        <Pressable
          onPress={onOpenQuran}
          style={({ pressed }) => [
            styles.quranPrimaryAction,
            pressed ? { opacity: 0.86, transform: [{ scale: 0.99 }] } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open the Quran reader"
          testID="button-home-quran-flagship-open"
        >
          <Text style={styles.quranPrimaryActionText}>
            {recentMedia ? "Resume Quran" : "Open Reader"}
          </Text>
          <AppIcon name="arrow-right" size={15} color={COLORS.bg} />
        </Pressable>
        <Pressable
          onPress={onAskNurAI}
          style={({ pressed }) => [
            styles.quranSecondaryAction,
            pressed ? { opacity: 0.82 } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            aiPaid ? "Create a Quran plan" : "Upgrade to create a Quran plan"
          }
          testID="button-home-quran-flagship-ai"
        >
          <AppIcon
            name={aiPaid ? "zap" : "lock"}
            size={14}
            color={COLORS.teal}
          />
          <Text style={styles.quranSecondaryActionText}>
            {aiPaid ? "Plan" : "Unlock"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function TodayDeenCommandCenter({
  items,
  nuraiNudge,
  personalPlan,
  completedToday,
  totalToday,
  aiPaid,
  onAskNurAI,
  onOpenPlanControls,
  onPress,
}: {
  items: TodayCommandItem[];
  nuraiNudge: TodayNurAINudge;
  personalPlan?: PersonalHomePlanSummary | null;
  completedToday: number;
  totalToday: number;
  aiPaid: boolean;
  onAskNurAI: (prompt: string) => void;
  onOpenPlanControls: () => void;
  onPress: (id: TodayCommandItem["id"]) => void;
}) {
  const total = totalToday || items.length;
  const planChips = personalPlan?.dailyPath.slice(0, 3) || [];
  return (
    <View style={styles.commandCenterPanel}>
      <View style={styles.commandCenterHeader}>
        <View>
          <Text style={styles.commandCenterEyebrow}>TODAY'S DEEN</Text>
          <Text style={styles.commandCenterTitle}>
            {personalPlan?.headline || "One calm path through the app"}
          </Text>
        </View>
        <View style={styles.commandCenterProgress}>
          <Text style={styles.commandCenterProgressText}>
            {completedToday}/{total}
          </Text>
        </View>
      </View>
      {personalPlan ? (
        <View
          style={styles.commandPersonalBrief}
          testID="home-personal-plan-first-action"
        >
          <View style={styles.commandPersonalBriefTop}>
            <View style={styles.commandPersonalBriefIcon}>
              <AppIcon name="play-circle" size={14} color={COLORS.goldBright} />
            </View>
            <View style={styles.commandPersonalBriefCopy}>
              <Text style={styles.commandPersonalBriefEyebrow}>
                PERSONAL FIRST ACTION
              </Text>
              <Text style={styles.commandPersonalBriefTitle} numberOfLines={2}>
                {personalPlan.recommendedActionLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.commandPersonalBriefBody} numberOfLines={2}>
            {personalPlan.recommendedActionReason}
          </Text>
          <View style={styles.commandPersonalBriefFooterRow}>
            <View style={styles.commandPersonalBriefFooter}>
              <AppIcon name="calendar" size={12} color={COLORS.teal} />
              <Text
                style={styles.commandPersonalBriefFooterText}
                numberOfLines={1}
              >
                {personalPlan.reviewCadenceLabel}
              </Text>
            </View>
            <View
              style={styles.commandPersonalFreshnessPill}
              testID="home-personal-plan-freshness"
            >
              <AppIcon name="refresh-cw" size={12} color={COLORS.goldBright} />
              <Text
                style={styles.commandPersonalFreshnessText}
                numberOfLines={1}
              >
                {personalPlan.planFreshnessLabel}
              </Text>
            </View>
            <View
              style={styles.commandPersonalFreshnessPill}
              testID="home-personal-plan-review-due"
            >
              <AppIcon name="clock" size={12} color={COLORS.goldBright} />
              <Text
                style={styles.commandPersonalFreshnessText}
                numberOfLines={1}
              >
                {personalPlan.planReviewDueLabel}
              </Text>
            </View>
          </View>
          <View
            style={styles.commandPersonalTrustLine}
            testID="home-personal-plan-trust-boundary"
          >
            <AppIcon name="shield" size={12} color={COLORS.goldBright} />
            <Text style={styles.commandPersonalTrustLineText} numberOfLines={2}>
              {personalPlan.personalizationBoundaryLabel}
            </Text>
          </View>
          <View
            style={styles.commandPersonalReceipt}
            testID="home-personalization-receipt"
          >
            <View style={styles.commandPersonalReceiptHeader}>
              <Text style={styles.commandPersonalReceiptEyebrow}>
                WHY THIS PLAN
              </Text>
              <Text style={styles.commandPersonalReceiptCount}>
                {personalPlan.personalizationReceipts.length} signals
              </Text>
            </View>
            {personalPlan.personalizationReceipts.slice(0, 3).map((receipt) => (
              <View
                key={receipt.id}
                style={styles.commandPersonalReceiptRow}
                testID={`home-personalization-receipt-${receipt.id}`}
              >
                <View style={styles.commandPersonalReceiptIcon}>
                  <AppIcon name="check-circle" size={12} color={COLORS.teal} />
                </View>
                <View style={styles.commandPersonalReceiptCopy}>
                  <Text
                    style={styles.commandPersonalReceiptTitle}
                    numberOfLines={1}
                  >
                    {receipt.label}
                  </Text>
                  <Text
                    style={styles.commandPersonalReceiptEvidence}
                    numberOfLines={1}
                  >
                    {receipt.evidenceLabel}
                  </Text>
                  <Text
                    style={styles.commandPersonalReceiptBoundary}
                    numberOfLines={2}
                  >
                    {receipt.boundaryLabel}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <View
            style={styles.commandPlanSafetyPanel}
            testID="home-personal-plan-safety-receipts"
          >
            <View style={styles.commandPlanSafetyHeader}>
              <Text style={styles.commandPlanSafetyEyebrow}>
                PLAN SAFETY CHECKS
              </Text>
              <Text style={styles.commandPlanSafetyCount}>
                {personalPlan.planSafetyReceipts.length} checks
              </Text>
            </View>
            {personalPlan.planSafetyReceipts.map((receipt) => (
              <View
                key={receipt.id}
                style={styles.commandPlanSafetyRow}
                testID={`home-personal-plan-safety-${receipt.id}`}
              >
                <View style={styles.commandPlanSafetyIcon}>
                  <AppIcon
                    name={receipt.id === "user_control" ? "edit-3" : "shield"}
                    size={12}
                    color={COLORS.goldBright}
                  />
                </View>
                <View style={styles.commandPlanSafetyCopy}>
                  <View style={styles.commandPlanSafetyTop}>
                    <Text
                      style={styles.commandPlanSafetyTitle}
                      numberOfLines={1}
                    >
                      {receipt.title}
                    </Text>
                    <Text
                      style={styles.commandPlanSafetyEvidence}
                      numberOfLines={1}
                    >
                      {receipt.evidenceLabel}
                    </Text>
                  </View>
                  <Text
                    style={styles.commandPlanSafetyAction}
                    numberOfLines={2}
                  >
                    {receipt.actionLabel}
                  </Text>
                  <Text
                    style={styles.commandPlanSafetyBoundary}
                    numberOfLines={2}
                  >
                    {receipt.boundaryLabel}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <View
            style={styles.commandPlanAdjustmentPanel}
            testID="home-personal-plan-adjustment"
          >
            <View style={styles.commandPlanAdjustmentHeader}>
              <View style={styles.commandPlanAdjustmentIcon}>
                <AppIcon name="sliders" size={14} color={COLORS.goldBright} />
              </View>
              <View style={styles.commandPlanAdjustmentCopy}>
                <Text style={styles.commandPlanAdjustmentEyebrow}>
                  PLAN ADJUSTMENT
                </Text>
                <Text
                  style={styles.commandPlanAdjustmentTitle}
                  numberOfLines={1}
                >
                  {personalPlan.planAdjustment.title}
                </Text>
                <Text
                  style={styles.commandPlanAdjustmentStatus}
                  numberOfLines={2}
                >
                  {personalPlan.planAdjustment.statusLabel}
                </Text>
              </View>
            </View>
            <View style={styles.commandPlanAdjustmentItems}>
              {personalPlan.planAdjustment.items.map((item) => (
                <View
                  key={item.id}
                  style={styles.commandPlanAdjustmentItem}
                  testID={`home-personal-plan-adjustment-${item.id}`}
                >
                  <Text
                    style={styles.commandPlanAdjustmentItemTitle}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={styles.commandPlanAdjustmentItemEvidence}
                    numberOfLines={1}
                  >
                    {item.evidenceLabel}
                  </Text>
                  <Text
                    style={styles.commandPlanAdjustmentItemBoundary}
                    numberOfLines={2}
                  >
                    {item.boundaryLabel}
                  </Text>
                </View>
              ))}
            </View>
            <View
              style={styles.commandPlanAdjustmentBoundary}
              testID="home-personal-plan-adjustment-boundary"
            >
              <AppIcon name="shield" size={12} color={COLORS.goldBright} />
              <Text
                style={styles.commandPlanAdjustmentBoundaryText}
                numberOfLines={2}
              >
                {personalPlan.planAdjustment.boundaryLabel}
              </Text>
            </View>
            <View style={styles.commandPlanAdjustmentActions}>
              <Pressable
                onPress={() => onAskNurAI(personalPlan.planAdjustment.prompt)}
                accessibilityRole="button"
                accessibilityLabel="Safely adjust my personal plan"
                accessibilityHint="Uses visible plan signals only and keeps scholar-review boundaries."
                testID="button-home-personal-plan-adjust"
                style={({ pressed }) => [
                  styles.commandPlanAdjustmentPrimary,
                  pressed
                    ? { opacity: 0.84, transform: [{ scale: 0.985 }] }
                    : null,
                ]}
              >
                <Text style={styles.commandPlanAdjustmentPrimaryText}>
                  {personalPlan.planAdjustment.actionLabel}
                </Text>
                <AppIcon name="arrow-right" size={13} color={COLORS.bg} />
              </Pressable>
              <Pressable
                onPress={onOpenPlanControls}
                accessibilityRole="button"
                accessibilityLabel="Open personal plan controls in settings"
                accessibilityHint="Inspect, export, or delete personalization controls."
                testID="button-home-personal-plan-controls"
                style={({ pressed }) => [
                  styles.commandPlanAdjustmentSecondary,
                  pressed
                    ? { opacity: 0.84, transform: [{ scale: 0.985 }] }
                    : null,
                ]}
              >
                <AppIcon name="lock" size={13} color={COLORS.teal} />
                <Text style={styles.commandPlanAdjustmentSecondaryText}>
                  {personalPlan.planAdjustment.controlsLabel}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
      {planChips.length > 0 ? (
        <View style={styles.commandPlanChips}>
          {planChips.map((label, index) => (
            <View key={`${label}-${index}`} style={styles.commandPlanChip}>
              <Text style={styles.commandPlanChipIndex}>{index + 1}</Text>
              <Text style={styles.commandPlanChipText} numberOfLines={1}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <Pressable
        onPress={() => onAskNurAI(nuraiNudge.prompt)}
        style={({ pressed }) => [
          styles.commandAiNudge,
          pressed ? styles.commandAiNudgePressed : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open a source-aware next step. ${nuraiNudge.title}`}
        accessibilityHint="Uses only visible home context and routes sensitive questions to scholar review."
        testID="button-home-today-deen-ai-nudge"
      >
        <View style={styles.commandAiIcon}>
          <AppIcon name="zap" size={15} color={COLORS.bg} />
        </View>
        <View style={styles.commandAiCopy}>
          <Text style={styles.commandAiEyebrow} numberOfLines={1}>
            SOURCE-AWARE NURAI NUDGE
          </Text>
          <Text style={styles.commandAiTitle} numberOfLines={1}>
            {nuraiNudge.title}
          </Text>
          <Text style={styles.commandAiBody} numberOfLines={2}>
            {nuraiNudge.body}
          </Text>
        </View>
        <View style={styles.commandAiCta}>
          <Text style={styles.commandAiCtaText}>
            {aiPaid ? nuraiNudge.cta : "Preview"}
          </Text>
          <AppIcon name="arrow-right" size={13} color={COLORS.bg} />
        </View>
      </Pressable>
      <View style={styles.commandGrid}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onPress(item.id)}
            style={({ pressed }) => [
              styles.commandTile,
              item.completed ? styles.commandTileComplete : null,
              pressed ? { opacity: 0.84, transform: [{ scale: 0.985 }] } : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.body}`}
            testID={`button-home-command-${item.id}`}
          >
            <View
              style={[
                styles.commandIcon,
                {
                  backgroundColor: `${item.color}14`,
                  borderColor: `${item.color}34`,
                },
              ]}
            >
              <AppIcon
                name={item.completed ? "check" : item.icon}
                size={16}
                color={item.color}
              />
            </View>
            <View style={styles.commandCopy}>
              <View style={styles.commandTitleRow}>
                <Text style={styles.commandTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.commandMeta, { color: item.color }]}>
                  {item.meta}
                </Text>
              </View>
              <Text style={styles.commandBody} numberOfLines={2}>
                {item.body}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MasjidBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Svg width="100%" height="100%" viewBox="0 0 390 880">
        <Defs>
          <RadialGradient id="bgAuraTeal" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={COLORS.teal} stopOpacity="0.22" />
            <Stop offset="0.55" stopColor={COLORS.emerald} stopOpacity="0.07" />
            <Stop offset="1" stopColor={COLORS.teal} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="bgAuraGold" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={COLORS.goldBright} stopOpacity="0.14" />
            <Stop offset="1" stopColor={COLORS.goldBright} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="bgAuraEmerald" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={COLORS.emerald} stopOpacity="0.1" />
            <Stop offset="1" stopColor={COLORS.emerald} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {/* Soft halo of light framing the prayer orb */}
        <Circle cx="195" cy="250" r="262" fill="url(#bgAuraTeal)" />
        {/* Warm accent glow, upper right */}
        <Circle cx="344" cy="118" r="150" fill="url(#bgAuraGold)" />
        {/* Cool depth, lower left */}
        <Circle cx="44" cy="624" r="226" fill="url(#bgAuraEmerald)" />
      </Svg>
    </View>
  );
}

function NurAIAuroraOrb({ size = 50 }: { size?: number }) {
  const spin = useSharedValue(0);
  const breathe = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.linear }),
      -1,
      false,
    );
    breathe.value = withRepeat(
      withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [spin, breathe]);
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + breathe.value * 0.45,
    transform: [{ scale: 0.95 + breathe.value * 0.12 }],
  }));
  const r = size / 2;
  const glowSize = size * 1.7;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: glowSize,
            height: glowSize,
          },
          glowStyle,
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="auraOrbGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={COLORS.teal} stopOpacity="0.5" />
              <Stop
                offset="0.55"
                stopColor={COLORS.emerald}
                stopOpacity="0.16"
              />
              <Stop offset="1" stopColor={COLORS.teal} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill="url(#auraOrbGlow)" />
        </Svg>
      </Animated.View>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: r,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.16)",
        }}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <RadialGradient id="auraOrbBase" cx="50%" cy="42%" r="68%">
              <Stop offset="0" stopColor="#0C322D" />
              <Stop offset="1" stopColor="#04130F" />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill="url(#auraOrbBase)" />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="auraBlobA" cx="50%" cy="50%" r="50%">
                <Stop
                  offset="0"
                  stopColor={COLORS.emerald}
                  stopOpacity="0.95"
                />
                <Stop offset="1" stopColor={COLORS.emerald} stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="auraBlobB" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={COLORS.teal} stopOpacity="0.9" />
                <Stop offset="1" stopColor={COLORS.teal} stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="auraBlobC" cx="50%" cy="50%" r="50%">
                <Stop
                  offset="0"
                  stopColor={COLORS.goldBright}
                  stopOpacity="0.75"
                />
                <Stop
                  offset="1"
                  stopColor={COLORS.goldBright}
                  stopOpacity="0"
                />
              </RadialGradient>
            </Defs>
            <Circle cx="36" cy="37" r="30" fill="url(#auraBlobA)" />
            <Circle cx="66" cy="45" r="28" fill="url(#auraBlobB)" />
            <Circle cx="50" cy="70" r="24" fill="url(#auraBlobC)" />
          </Svg>
        </Animated.View>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id="auraSpec" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="34" cy="29" r="14" fill="url(#auraSpec)" />
        </Svg>
        <View
          style={[
            StyleSheet.absoluteFill,
            { alignItems: "center", justifyContent: "center" },
          ]}
        >
          <AppIcon
            name="moon"
            size={size * 0.32}
            color="rgba(255,255,255,0.92)"
          />
        </View>
      </View>
    </View>
  );
}

function AiCardOrnament() {
  return (
    <View pointerEvents="none" style={styles.aiCardOrnament}>
      <Svg width={140} height={140} viewBox="0 0 140 140">
        <Defs>
          <RadialGradient id="aiOrnGlow" cx="66%" cy="32%" r="58%">
            <Stop offset="0" stopColor={COLORS.goldBright} stopOpacity="0.18" />
            <Stop offset="0.6" stopColor={COLORS.teal} stopOpacity="0.05" />
            <Stop offset="1" stopColor={COLORS.goldBright} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="96" cy="44" r="74" fill="url(#aiOrnGlow)" />
        <G
          transform="translate(96 44)"
          stroke={COLORS.goldBright}
          strokeWidth="1"
          fill="none"
        >
          <G opacity="0.24">
            <Path d="M0 -32 L32 0 L0 32 L-32 0 Z" />
            <Path d="M-22.6 -22.6 H22.6 V22.6 H-22.6 Z" />
          </G>
          <Circle cx="0" cy="0" r="7.5" opacity="0.32" />
          <Circle cx="0" cy="0" r="44" opacity="0.1" />
        </G>
      </Svg>
    </View>
  );
}

function HomePrayerOrb({
  prayerName,
  countdown,
  prayerTimeLabel,
  periodLabel,
  qiblaDegrees,
  qiblaPointerDegrees,
  qiblaFeedbackLabel,
  qiblaAligned,
  qiblaHeadingAvailable,
  onPress,
  onQiblaPress,
}: {
  prayerName: string;
  countdown: string;
  prayerTimeLabel: string;
  periodLabel: string;
  qiblaDegrees: number;
  qiblaPointerDegrees?: number;
  qiblaFeedbackLabel?: string;
  qiblaAligned: boolean;
  qiblaHeadingAvailable: boolean;
  onPress: () => void;
  onQiblaPress: () => void;
}) {
  const pulse = useSharedValue(0);
  const compactCountdown = formatCountdownCompact(countdown);
  const qiblaPointer = qiblaPointerDegrees ?? qiblaDegrees;
  const qiblaState = qiblaDisplayState({
    qiblaDegrees,
    qiblaFeedbackLabel,
    qiblaAligned,
    qiblaHeadingAvailable,
  });

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.035 }],
    opacity: 0.7 + pulse.value * 0.28,
  }));
  const kaabaMarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.04 }],
    opacity: 0.88 + pulse.value * 0.12,
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${qiblaPointer}deg` }, { translateY: -118 }],
  }));

  return (
    <View style={styles.orbPressable}>
      <Pressable
        onPress={onPress}
        style={styles.orbMainPressable}
        accessibilityRole="button"
        accessibilityLabel={`Next prayer ${prayerName} at ${prayerTimeLabel}, ${countdown} remaining`}
        testID="button-home-prayer-orb"
      >
        <Animated.View style={[styles.orbPulse, pulseStyle]} />
        <Svg
          width={286}
          height={286}
          viewBox="0 0 306 306"
          style={styles.orbSvg}
        >
          <Defs>
            <RadialGradient id="orbCore" cx="50%" cy="42%" r="62%">
              <Stop offset="0" stopColor="#123D35" stopOpacity="0.96" />
              <Stop offset="0.45" stopColor="#061E24" stopOpacity="0.97" />
              <Stop offset="1" stopColor="#02070F" stopOpacity="0.99" />
            </RadialGradient>
            <RadialGradient id="orbGlow" cx="50%" cy="50%" r="52%">
              <Stop offset="0" stopColor={COLORS.teal} stopOpacity="0.18" />
              <Stop
                offset="0.62"
                stopColor={COLORS.emerald}
                stopOpacity="0.08"
              />
              <Stop offset="1" stopColor={COLORS.goldBright} stopOpacity="0" />
            </RadialGradient>
            <SvgLinearGradient id="goldRing" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#805F20" />
              <Stop offset="0.45" stopColor={COLORS.goldBright} />
              <Stop offset="1" stopColor="#8B661E" />
            </SvgLinearGradient>
            <SvgLinearGradient id="tealRing" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={COLORS.teal} stopOpacity="0.28" />
              <Stop offset="0.5" stopColor={COLORS.emerald} />
              <Stop offset="1" stopColor={COLORS.teal} stopOpacity="0.44" />
            </SvgLinearGradient>
          </Defs>
          <Circle cx="153" cy="153" r="146" fill="url(#orbGlow)" />
          <Circle
            cx="153"
            cy="153"
            r="149"
            stroke={COLORS.gold}
            strokeOpacity="0.22"
            strokeWidth="1"
            fill="none"
            strokeDasharray="2 5"
          />
          <Circle
            cx="153"
            cy="153"
            r="128"
            stroke="url(#goldRing)"
            strokeWidth="6.5"
            fill="url(#orbCore)"
          />
          <Circle
            cx="153"
            cy="153"
            r="122"
            stroke={COLORS.goldBright}
            strokeOpacity="0.22"
            strokeWidth="1"
            fill="none"
          />
          <Circle
            cx="153"
            cy="153"
            r="111"
            stroke="url(#tealRing)"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
          <Circle
            cx="153"
            cy="153"
            r="111"
            stroke={COLORS.goldBright}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray="62 630"
            rotation="-84"
            origin="153 153"
            fill="none"
            opacity="0.9"
          />
          <Circle
            cx="153"
            cy="153"
            r="96"
            stroke={COLORS.teal}
            strokeOpacity="0.18"
            strokeWidth="1"
            fill="none"
          />
          <G opacity="0.08" stroke={COLORS.gold} strokeWidth="0.8">
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * Math.PI) / 6;
              const x1 = 153 + Math.cos(angle) * 118;
              const y1 = 153 + Math.sin(angle) * 118;
              const x2 = 153 + Math.cos(angle) * 136;
              const y2 = 153 + Math.sin(angle) * 136;
              return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
          </G>
          <Circle cx="64" cy="210" r="5" fill={COLORS.teal} opacity="0.85" />
          <Circle
            cx="245"
            cy="72"
            r="5"
            fill={COLORS.goldBright}
            opacity="0.85"
          />
          <Path
            d="M72 206 C100 195 126 198 153 188 C181 178 208 183 236 171"
            stroke={COLORS.goldBright}
            strokeOpacity="0.13"
            strokeWidth="1.5"
            fill="none"
          />
        </Svg>
        <Animated.View style={[styles.qiblaArrow, arrowStyle]}>
          <Svg width={31} height={36} viewBox="0 0 31 36">
            <Defs>
              <SvgLinearGradient id="pointerGold" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFF1AA" />
                <Stop offset="0.48" stopColor={COLORS.goldBright} />
                <Stop offset="1" stopColor="#A06F1C" />
              </SvgLinearGradient>
            </Defs>
            <Path
              d="M15.5 1 L29 34 L15.5 27 L2 34 Z"
              fill="url(#pointerGold)"
              stroke="rgba(255,255,255,0.44)"
              strokeWidth="1"
            />
          </Svg>
        </Animated.View>
        <View style={styles.orbCopy}>
          <CrescentSigil />
          <Text style={styles.orbEyebrow}>NEXT PRAYER</Text>
          <Text style={styles.orbPrayer}>{prayerName}</Text>
          <View style={styles.orbTimeChip}>
            <AppIcon name="clock" size={12} color={COLORS.goldBright} />
            <Text style={styles.orbTimeChipText}>{prayerTimeLabel}</Text>
            <Text style={styles.orbTimeChipDivider}>•</Text>
            <Text style={styles.orbTimeChipText}>{compactCountdown} left</Text>
          </View>
          <Text style={styles.orbPeriod}>{periodLabel}</Text>
        </View>
      </Pressable>
      <View
        pointerEvents="none"
        style={[
          styles.kaabaStateChip,
          qiblaAligned ? styles.kaabaStateChipAligned : null,
        ]}
      >
        <Animated.View
          style={[
            styles.kaabaMiniMark,
            qiblaAligned ? styles.kaabaMiniMarkAligned : null,
            qiblaAligned ? kaabaMarkStyle : null,
          ]}
        >
          {qiblaAligned ? (
            <Text style={styles.kaabaMiniEmoji}>🕋</Text>
          ) : (
            <KaabaGlyph size={15} />
          )}
        </Animated.View>
        <Text
          style={[
            styles.kaabaStateText,
            qiblaAligned ? styles.kaabaStateTextAligned : null,
          ]}
          numberOfLines={1}
        >
          {qiblaState.kaabaCopy}
        </Text>
      </View>
      <Pressable
        onPress={onQiblaPress}
        style={({ pressed }) => [
          styles.qiblaLabel,
          qiblaAligned ? styles.qiblaLabelAligned : null,
          pressed ? styles.qiblaLabelPressed : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel={qiblaState.accessibility}
        testID="button-home-qibla"
        hitSlop={10}
      >
        <AppIcon
          name={qiblaAligned ? "check-circle" : "navigation"}
          size={13}
          color={qiblaAligned ? COLORS.logoLime : COLORS.goldBright}
        />
        <Text style={styles.qiblaText}>{qiblaState.eyebrow}</Text>
        <Text
          style={[styles.qiblaDegree, qiblaAligned ? styles.qiblaFacing : null]}
          numberOfLines={1}
        >
          {qiblaState.status}
        </Text>
      </Pressable>
    </View>
  );
}

function CrescentSigil() {
  return (
    <Svg width={43} height={43} viewBox="0 0 43 43" style={styles.crescentSvg}>
      <Defs>
        <SvgLinearGradient id="crescentGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF4B8" />
          <Stop offset="0.55" stopColor={COLORS.goldBright} />
          <Stop offset="1" stopColor="#A06F1C" />
        </SvgLinearGradient>
      </Defs>
      <Path
        d="M25.8 7.2 C16.4 9.5 10.8 18.7 13.8 27.5 C16.5 35.3 24.9 39.2 32.5 36 C24.2 35.9 17.7 30.3 17.6 22.9 C17.5 16.5 20.8 11.3 25.8 7.2Z"
        fill="url(#crescentGold)"
      />
      <Path
        d="M31.3 12.8 L32.7 16.3 L36.3 17.5 L32.8 18.9 L31.4 22.4 L30 18.9 L26.5 17.6 L30 16.3Z"
        fill={COLORS.goldBright}
      />
    </Svg>
  );
}

function KaabaGlyph({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="m3.5 7.1 8.5-3.7 8.5 3.7-8.5 3.8Z"
        fill="#29363A"
        stroke={COLORS.goldBright}
        strokeOpacity="0.58"
        strokeWidth="0.7"
      />
      <Path
        d="M3.5 7.1v9.4l8.5 4v-9.6Z"
        fill="#081012"
        stroke={COLORS.goldBright}
        strokeOpacity="0.46"
        strokeWidth="0.7"
      />
      <Path
        d="M12 10.9v9.6l8.5-4V7.1Z"
        fill="#030708"
        stroke={COLORS.goldBright}
        strokeOpacity="0.36"
        strokeWidth="0.7"
      />
      <Path
        d="m6.2 8.3 5.8 2.6 5.8-2.6"
        stroke={COLORS.goldBright}
        strokeOpacity="0.72"
        strokeWidth="0.8"
        fill="none"
      />
      <Path
        d="m7.6 10.9 2.1 1v4.6l-2.1-1Z"
        fill={COLORS.goldBright}
        fillOpacity="0.86"
      />
    </Svg>
  );
}

function HomeWeatherPill({
  weather,
  weatherLoading,
  guidance,
  prayerName,
  nextPrayerTime,
  locationLabel,
  expanded,
  onPress,
}: {
  weather: LiveWeatherSnapshot | null;
  weatherLoading: boolean;
  guidance: string;
  prayerName: string;
  nextPrayerTime: Date | null;
  locationLabel: string;
  expanded: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const rainChance = weather?.nextThreeHourPrecipitationProbability;
  const prayerHour = prayerWindowHour(weather, nextPrayerTime);
  const hourlyPreview = weather?.hourly?.slice(0, 3) ?? [];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.weatherPill,
        expanded ? styles.weatherPillExpanded : null,
        pressed ? { opacity: 0.86 } : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        expanded ? "Collapse weather details" : "Expand weather details"
      }
      testID="button-hero-weather"
    >
      <NuraiGlass
        style={StyleSheet.absoluteFill}
        radius={28}
        pointerEvents="none"
        tint="rgba(255,255,255,0.03)"
      />
      <View style={styles.weatherMainRow}>
        <View style={styles.weatherIconBubble}>
          {weatherLoading && !weather ? (
            <ActivityIndicator size="small" color={COLORS.goldBright} />
          ) : (
            <AppIcon
              name={weatherIconName(weather)}
              size={25}
              color="rgba(255,255,255,0.88)"
            />
          )}
        </View>
        <Text style={styles.weatherTemp}>
          {weather ? `${Math.round(weather.temperatureC)}°` : "--"}
        </Text>
        <View style={styles.weatherCopy}>
          <View style={styles.weatherLabelRow}>
            <Text style={styles.weatherLabel}>PRAYER CONDITIONS</Text>
            {rainChance != null ? (
              <Text
                style={[styles.weatherRainChance, { color: theme.primary }]}
              >
                Rain {Math.round(rainChance)}%
              </Text>
            ) : null}
          </View>
          <Text
            style={[styles.weatherGuidance, { color: theme.primary }]}
            numberOfLines={1}
          >
            {guidance}
          </Text>
          <Text style={styles.weatherMeta} numberOfLines={1}>
            {weather
              ? `${weather.conditionLabel} • ${weather.windKmh} km/h winds`
              : weatherLoading
                ? "Checking local conditions"
                : "Tap to refresh weather"}
          </Text>
        </View>
        <AppIcon
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={COLORS.goldBright}
        />
      </View>
      {expanded ? (
        <View style={styles.weatherExpandedContent}>
          <View style={styles.weatherInsightBanner}>
            <View style={styles.weatherInsightIcon}>
              <AppIcon
                name={
                  rainChance != null && rainChance >= 60
                    ? "umbrella"
                    : "navigation"
                }
                size={15}
                color={COLORS.goldBright}
              />
            </View>
            <Text style={styles.weatherInsightText} numberOfLines={2}>
              {weatherAlertText(weather, prayerName)}
            </Text>
          </View>

          <View style={styles.weatherDetailsRow}>
            <WeatherMetric
              icon="thermometer"
              label="Feels"
              value={
                weather?.feelsLikeC != null
                  ? `${Math.round(weather.feelsLikeC)}°`
                  : "—"
              }
            />
            <WeatherMetric
              icon="clock"
              label={`${prayerName}`}
              value={
                prayerHour
                  ? `${prayerHour.temperatureC}° • ${
                      prayerHour.precipitationProbability ?? 0
                    }%`
                  : "—"
              }
            />
            <WeatherMetric
              icon="wind"
              label="Gusts"
              value={weather ? `${Math.round(weather.windGustKmh)} km/h` : "—"}
            />
          </View>

          {hourlyPreview.length ? (
            <View style={styles.hourlyWeatherRow}>
              {hourlyPreview.map((hour, index) => (
                <View key={`${hour.time}-${index}`} style={styles.hourlyChip}>
                  <Text style={styles.hourlyTime}>
                    {index === 0 ? "Now" : formatWeatherHour(hour.time)}
                  </Text>
                  <AppIcon
                    name={weatherIconName({
                      ...(weather as LiveWeatherSnapshot),
                      weatherCode: hour.weatherCode,
                    })}
                    size={14}
                    color={COLORS.teal}
                  />
                  <Text style={styles.hourlyValue}>
                    {hour.temperatureC}° · {hour.precipitationProbability ?? 0}%
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.weatherConfidenceRow}>
            <View style={styles.weatherConfidenceItem}>
              <AppIcon name="map-pin" size={12} color={COLORS.emerald} />
              <Text style={styles.weatherConfidenceText} numberOfLines={1}>
                {locationLabel && locationLabel !== "Your location"
                  ? `${locationLabel} area`
                  : "Confirm location"}
              </Text>
            </View>
            <View style={styles.weatherConfidenceItem}>
              <AppIcon name="database" size={12} color={COLORS.goldBright} />
              <Text style={styles.weatherConfidenceText} numberOfLines={1}>
                {weather ? weather.source : "Live source"}
              </Text>
            </View>
          </View>

          <View style={styles.walkGuidanceRow}>
            <AppIcon name="navigation" size={13} color={COLORS.teal} />
            <Text style={styles.walkGuidanceText} numberOfLines={1}>
              {mosqueWalkGuidance(weather)}
            </Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

function TodayPriorityPanel({
  priority,
  focus,
  completedToday,
  totalToday,
  accentTheme,
  onFocusChange,
  onAction,
}: {
  priority: HomePriority;
  focus: HomeFocusCategory;
  completedToday: number;
  totalToday: number;
  accentTheme?: HomeAccentTheme;
  onFocusChange: (focus: HomeFocusCategory) => void;
  onAction: () => void;
}) {
  const progress =
    totalToday > 0 ? Math.min(1, Math.max(0, completedToday / totalToday)) : 0;
  const accentPrimary = accentTheme?.primary ?? COLORS.teal;
  const accentSoft = accentTheme?.primarySoft ?? "rgba(86,179,148,0.06)";
  const accentBorder = accentTheme?.primaryBorder ?? "rgba(255,212,107,0.24)";
  const accentGold = accentTheme?.gold ?? COLORS.goldBright;

  return (
    <View
      style={[
        styles.priorityPanel,
        accentTheme
          ? {
              borderColor: accentBorder,
              shadowColor: accentPrimary,
            }
          : null,
      ]}
    >
      <View style={styles.priorityTopRow}>
        <View
          style={[
            styles.priorityIcon,
            accentTheme
              ? { backgroundColor: accentSoft, borderColor: accentBorder }
              : null,
          ]}
        >
          <AppIcon name={priority.icon} size={20} color={accentGold} />
        </View>
        <View style={styles.priorityCopy}>
          <View style={styles.priorityMetaRow}>
            <Text style={styles.priorityEyebrow}>BEST NEXT STEP</Text>
            <Text style={styles.priorityProgressText}>
              {completedToday}/{totalToday || 3} complete
            </Text>
          </View>
          <Text style={styles.priorityTitle} numberOfLines={1}>
            {priority.title}
          </Text>
          <Text style={styles.priorityBody} numberOfLines={2}>
            {priority.body}
          </Text>
          <View style={styles.priorityProgressTrack}>
            <View
              style={[
                styles.priorityProgressFill,
                {
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: accentGold,
                },
              ]}
            />
          </View>
        </View>
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.priorityButton,
            accentTheme ? { backgroundColor: accentGold } : null,
            pressed ? { opacity: 0.84 } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel={priority.actionLabel}
          testID="button-home-priority-action"
        >
          <Text style={styles.priorityButtonText}>{priority.actionLabel}</Text>
        </Pressable>
      </View>
      <View style={styles.focusChipsRow}>
        {HOME_FOCUS_OPTIONS.map((option) => {
          const selected = option.id === focus;
          return (
            <Pressable
              key={option.id}
              onPress={() => onFocusChange(option.id)}
              style={[
                styles.focusChip,
                selected ? styles.focusChipSelected : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Set Home focus to ${option.label}`}
              testID={`button-home-focus-${option.id}`}
            >
              <AppIcon
                name={option.icon}
                size={12}
                color={selected ? COLORS.bg : accentPrimary}
              />
              <Text
                style={[
                  styles.focusChipText,
                  accentTheme ? { color: accentPrimary } : null,
                  selected ? styles.focusChipTextSelected : null,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TodayCompletePanel({
  streakDays,
  onReflect,
}: {
  streakDays: number;
  onReflect: () => void;
}) {
  return (
    <Pressable
      onPress={onReflect}
      style={({ pressed }) => [
        styles.completePanel,
        pressed ? { opacity: 0.88 } : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Reflect on today's completed deen journey"
      testID="button-home-complete-reflect"
    >
      <View style={styles.completeGlow}>
        <AppIcon name="check-circle" size={22} color={COLORS.bg} />
      </View>
      <View style={styles.completeCopy}>
        <Text style={styles.completeEyebrow}>TODAY COMPLETE</Text>
        <Text style={styles.completeTitle} numberOfLines={1}>
          Deen journey complete
        </Text>
        <Text style={styles.completeBody} numberOfLines={1}>
          {streakDays > 0
            ? `${streakDays} day streak protected. Reflect before tomorrow.`
            : "Reflect once and start building your streak."}
        </Text>
      </View>
      <AppIcon name="arrow-right" size={18} color={COLORS.goldBright} />
    </Pressable>
  );
}

function ContinueJourneyPanel({
  items,
  recentMedia,
  accentTheme,
  onOpenFeature,
  onOpenRecentMedia,
}: {
  items: HomeContinueItem[];
  recentMedia?: HomeRecentMediaSession | null;
  accentTheme?: HomeAccentTheme;
  onOpenFeature: (id: string) => void;
  onOpenRecentMedia?: (session: HomeRecentMediaSession) => void;
}) {
  const accentBorder = accentTheme?.primaryBorder ?? "rgba(86,179,148,0.18)";
  const accentSoft = accentTheme?.primarySoft ?? "rgba(86,179,148,0.055)";

  return (
    <View
      style={[
        styles.continuePanel,
        accentTheme ? { borderColor: accentBorder } : null,
      ]}
    >
      <View style={styles.compactSectionHeader}>
        <View>
          <Text style={styles.continueEyebrow}>
            CONTINUE WHERE YOU LEFT OFF
          </Text>
          <Text style={styles.continueSubtitle}>
            Your next small step is ready
          </Text>
        </View>
        <AppIcon name="arrow-down-right" size={17} color={COLORS.goldBright} />
      </View>
      <View style={styles.continueRows}>
        {recentMedia ? (
          <Pressable
            onPress={() => onOpenRecentMedia?.(recentMedia)}
            style={({ pressed }) => [
              styles.continueRow,
              styles.continueListeningRow,
              { backgroundColor: accentTheme ? accentSoft : undefined },
              pressed ? { opacity: 0.82, transform: [{ scale: 0.992 }] } : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Continue listening to ${recentMedia.title}`}
            testID="button-home-continue-listening"
          >
            <LinearGradient
              colors={
                recentMedia.kind === "quran"
                  ? ["rgba(255,212,107,0.22)", "rgba(86,179,148,0.08)"]
                  : ["rgba(86,179,148,0.2)", "rgba(86,179,148,0.08)"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.continueListeningGlow}
            />
            <View
              style={[
                styles.continueIcon,
                {
                  borderColor:
                    recentMedia.kind === "quran"
                      ? `${COLORS.goldBright}55`
                      : `${COLORS.teal}55`,
                  backgroundColor:
                    recentMedia.kind === "quran"
                      ? `${COLORS.goldBright}16`
                      : `${COLORS.teal}16`,
                },
              ]}
            >
              <AppIcon
                name={recentMedia.kind === "quran" ? "headphones" : "music"}
                size={17}
                color={
                  recentMedia.kind === "quran" ? COLORS.goldBright : COLORS.teal
                }
              />
            </View>
            <View style={styles.continueCopy}>
              <Text style={styles.continueTitle} numberOfLines={1}>
                Continue listening
              </Text>
              <Text style={styles.continueBody} numberOfLines={1}>
                {recentMedia.title} · {recentMedia.detailLabel}
              </Text>
              <Text style={styles.continueMeta} numberOfLines={1}>
                {recentMedia.subtitle}
              </Text>
            </View>
            <AppIcon
              name="play-circle"
              size={20}
              color={
                recentMedia.kind === "quran" ? COLORS.goldBright : COLORS.teal
              }
            />
          </Pressable>
        ) : null}
        {items.map((item) => {
          const color =
            item.accent === "gold"
              ? COLORS.goldBright
              : item.accent === "teal"
                ? COLORS.teal
                : COLORS.emerald;
          return (
            <Pressable
              key={item.id}
              onPress={() => onOpenFeature(item.featureId)}
              style={({ pressed }) => [
                styles.continueRow,
                { backgroundColor: accentTheme ? accentSoft : undefined },
                pressed
                  ? { opacity: 0.82, transform: [{ scale: 0.992 }] }
                  : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              testID={`button-home-continue-${item.category}`}
            >
              <View
                style={[
                  styles.continueIcon,
                  {
                    borderColor: `${color}42`,
                    backgroundColor: `${color}12`,
                  },
                ]}
              >
                <AppIcon name={item.icon} size={17} color={color} />
              </View>
              <View style={styles.continueCopy}>
                <Text style={styles.continueTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.continueBody} numberOfLines={1}>
                  {item.body}
                </Text>
              </View>
              <AppIcon name="chevron-right" size={18} color={color} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function WeeklyGrowthPanel({
  companion,
  accentTheme,
  onReflectWithNurAI,
}: {
  companion: SpiritualGrowthCompanion;
  accentTheme?: HomeAccentTheme;
  onReflectWithNurAI: () => void;
}) {
  const accentPrimary = accentTheme?.primary ?? COLORS.emerald;
  const accentGold = accentTheme?.gold ?? COLORS.goldBright;
  const [activeMetric, todayMetric, streakMetric] = companion.metrics;
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [reflectionSaving, setReflectionSaving] = useState(false);
  const [reflectionSavedLabel, setReflectionSavedLabel] = useState<
    string | null
  >(null);

  const savePrivateReflection = async () => {
    const note = reflectionDraft.trim();
    if (!note || reflectionSaving) return;
    const [completedToday, totalToday] = todayMetric.value
      .split("/")
      .map((value) => Number.parseInt(value, 10));
    setReflectionSaving(true);
    try {
      await saveSpiritualGrowthReflectionNote({
        prompt: companion.reflectionPrompt,
        note,
        activeDaysThisWeek: Number.parseInt(activeMetric.value, 10),
        completedToday: Number.isFinite(completedToday)
          ? completedToday
          : undefined,
        totalToday: Number.isFinite(totalToday) ? totalToday : undefined,
        evidenceSignals: companion.evidenceSignals,
      });
      setReflectionDraft("");
      setReflectionSavedLabel("Private note saved on this device.");
    } catch {
      setReflectionSavedLabel("Could not save this note. Try again.");
    } finally {
      setReflectionSaving(false);
    }
  };

  return (
    <View style={styles.weeklyGrowthPanel}>
      <View style={styles.weeklyGrowthHeader}>
        <View>
          <Text style={styles.weeklyGrowthEyebrow}>WEEKLY GROWTH</Text>
          <Text style={styles.weeklyGrowthTitle}>{companion.title}</Text>
          <Text style={styles.weeklyGrowthBody} numberOfLines={2}>
            {companion.body}
          </Text>
        </View>
        <View style={styles.weeklyGrowthRing}>
          <Text style={styles.weeklyGrowthRingValue}>
            {companion.rhythmLabel.split(" ")[0]}
          </Text>
        </View>
      </View>
      <View style={styles.weeklyGrowthStats}>
        <View style={styles.weeklyGrowthStat}>
          <AppIcon name="calendar" size={14} color={accentPrimary} />
          <Text style={styles.weeklyGrowthStatValue}>{activeMetric.value}</Text>
          <Text style={styles.weeklyGrowthStatLabel}>{activeMetric.label}</Text>
        </View>
        <View style={styles.weeklyGrowthStat}>
          <AppIcon name="target" size={14} color={accentGold} />
          <Text style={styles.weeklyGrowthStatValue}>{todayMetric.value}</Text>
          <Text style={styles.weeklyGrowthStatLabel}>{todayMetric.label}</Text>
        </View>
        <View style={styles.weeklyGrowthStat}>
          <AppIcon name="trending-up" size={14} color={COLORS.teal} />
          <Text style={styles.weeklyGrowthStatValue}>{streakMetric.value}</Text>
          <Text style={styles.weeklyGrowthStatLabel}>{streakMetric.label}</Text>
        </View>
      </View>
      <View style={styles.weeklyGrowthTrack}>
        <View
          style={[
            styles.weeklyGrowthFill,
            { width: `${companion.progressPercent}%` },
          ]}
        />
      </View>
      <View style={styles.weeklyGrowthIntention}>
        <View style={styles.weeklyGrowthIntentionIcon}>
          <AppIcon name="reflection" size={14} color={COLORS.goldBright} />
        </View>
        <View style={styles.weeklyGrowthIntentionCopy}>
          <Text style={styles.weeklyGrowthIntentionTitle} numberOfLines={1}>
            {companion.primaryIntention.title}
          </Text>
          <Text style={styles.weeklyGrowthIntentionBody} numberOfLines={2}>
            {companion.primaryIntention.body}
          </Text>
        </View>
      </View>
      <Text style={styles.weeklyGrowthBoundary} numberOfLines={2}>
        {companion.privacyBoundaryLabel}
      </Text>
      <TextInput
        value={reflectionDraft}
        onChangeText={(value) => {
          setReflectionDraft(value);
          setReflectionSavedLabel(null);
        }}
        multiline
        maxLength={280}
        placeholder="Save one private weekly reflection"
        placeholderTextColor={COLORS.faint}
        style={styles.weeklyGrowthReflectionInput}
        accessibilityLabel="Private weekly reflection note"
        accessibilityHint="Write a private reflection saved on this device"
        testID="input-home-weekly-growth-reflection"
      />
      {reflectionSavedLabel ? (
        <Text style={styles.weeklyGrowthSavedLabel}>
          {reflectionSavedLabel}
        </Text>
      ) : null}
      <View style={styles.weeklyGrowthActionRow}>
        <Pressable
          onPress={onReflectWithNurAI}
          style={({ pressed }) => [
            styles.weeklyGrowthAction,
            pressed ? styles.weeklyGrowthActionPressed : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Reflect on weekly growth with NurAI"
          accessibilityHint="Uses visible app activity only and avoids scoring faith"
          testID="button-home-weekly-growth-reflect"
        >
          <AppIcon name="message-circle" size={15} color={COLORS.bg} />
          <Text style={styles.weeklyGrowthActionText}>Reflect with NurAI</Text>
        </Pressable>
        <Pressable
          onPress={savePrivateReflection}
          disabled={!reflectionDraft.trim() || reflectionSaving}
          style={({ pressed }) => [
            styles.weeklyGrowthSaveAction,
            !reflectionDraft.trim() || reflectionSaving
              ? styles.weeklyGrowthSaveActionDisabled
              : null,
            pressed ? styles.weeklyGrowthActionPressed : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save private weekly reflection"
          accessibilityHint="Saves this weekly reflection on this device until you export or delete it"
          testID="button-home-weekly-growth-save-reflection"
        >
          <AppIcon name="save" size={15} color={COLORS.goldBright} />
          <Text style={styles.weeklyGrowthSaveActionText}>
            {reflectionSaving ? "Saving" : "Save"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function quickAccessCategoryPriority(
  category: Exclude<HomeFocusCategory, "auto">,
) {
  switch (category) {
    case "quran":
      return ["quran", "library", "tafsir", "hadith"];
    case "arabic":
      return ["arabic_learning", "arabic_games", "quran", "library"];
    case "charity":
      return ["zakat", "finance", "hasanat", "challenges"];
    case "reflection":
      return ["inspiration", "share_cards", "duas", "library"];
    default:
      return ["prayer", "qibla", "duas", "tasbeeh"];
  }
}

function PremiumQuickAccessIcon({
  id,
  icon,
  size = 30,
  active = false,
}: {
  id: string;
  icon: AppIconName;
  size?: number;
  active?: boolean;
}) {
  return <QuickAccessIcon id={id} icon={icon} size={size} active={active} />;
}

function QuickAccessSheet({
  visible,
  selectedItems,
  allItems,
  startInCustomizeMode = false,
  editingSlot,
  onSelectSlot,
  onReplace,
  recentIds = [],
  suggestedIds = [],
  onMove,
  onOpen,
  onReset,
  onClose,
}: {
  visible: boolean;
  selectedItems: HomeQuickAccessItem[];
  allItems: HomeQuickAccessItem[];
  startInCustomizeMode?: boolean;
  editingSlot: number | null;
  onSelectSlot: (slot: number | null) => void;
  onReplace: (featureId: string) => void;
  recentIds?: string[];
  suggestedIds?: string[];
  onMove: (direction: -1 | 1) => void;
  onOpen: (id: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const categories = useMemo(
    () => Array.from(new Set(allItems.map((item) => item.category))),
    [allItems],
  );
  const activeIds = useMemo(
    () => new Set(selectedItems.map((item) => item.id)),
    [selectedItems],
  );
  const [customizeMode, setCustomizeMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const wasVisibleRef = useRef(false);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      allItems.filter((item) => {
        if (!normalizedQuery) return true;
        return `${item.label} ${item.category}`
          .toLowerCase()
          .includes(normalizedQuery);
      }),
    [allItems, normalizedQuery],
  );
  const suggestedItems = useMemo(
    () =>
      suggestedIds
        .map((id) => allItems.find((item) => item.id === id))
        .filter((item): item is HomeQuickAccessItem => Boolean(item))
        .filter((item) => {
          if (!normalizedQuery) return true;
          return `${item.label} ${item.category}`
            .toLowerCase()
            .includes(normalizedQuery);
        })
        .slice(0, 4),
    [allItems, normalizedQuery, suggestedIds],
  );
  const recentItems = useMemo(
    () =>
      recentIds
        .map((id) => allItems.find((item) => item.id === id))
        .filter((item): item is HomeQuickAccessItem => Boolean(item))
        .slice(0, 4),
    [allItems, recentIds],
  );
  const handleToolPress = useCallback(
    (featureId: string) => {
      if (customizeMode) {
        if (editingSlot != null) onReplace(featureId);
        return;
      }
      onOpen(featureId);
    },
    [customizeMode, editingSlot, onOpen, onReplace],
  );
  const renderMiniTool = useCallback(
    (item: HomeQuickAccessItem, keyPrefix: string) => {
      const disabled = customizeMode && editingSlot == null;
      return (
        <Pressable
          key={`${keyPrefix}-${item.id}`}
          onPress={() => handleToolPress(item.id)}
          style={({ pressed }) => [
            styles.quickMiniTool,
            activeIds.has(item.id) ? styles.quickMiniToolActive : null,
            disabled ? styles.quickToolItemDisabled : null,
            pressed ? styles.quickToolItemPressed : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            disabled
              ? `Select a shortcut slot before setting ${item.label}`
              : customizeMode
                ? `Set shortcut to ${item.label}`
                : `Open ${item.label}`
          }
          accessibilityState={{ disabled }}
        >
          <View style={styles.quickMiniToolIcon}>
            <QuickAccessIcon
              id={item.id}
              icon={item.icon}
              size={23}
              active={activeIds.has(item.id)}
            />
          </View>
          <View style={styles.quickMiniToolCopy}>
            <Text style={styles.quickMiniToolLabel} numberOfLines={1}>
              {item.label}
            </Text>
            {item.liveValue ? (
              <Text style={styles.quickMiniToolValue} numberOfLines={1}>
                {item.liveValue}
              </Text>
            ) : null}
          </View>
          {activeIds.has(item.id) ? (
            <AppIcon name="check" size={13} color={COLORS.goldBright} />
          ) : (
            <AppIcon name="chevron-right" size={14} color={COLORS.faint} />
          )}
        </Pressable>
      );
    },
    [activeIds, customizeMode, editingSlot, handleToolPress],
  );

  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;
      setCustomizeMode(false);
      setSearchQuery("");
      onSelectSlot(null);
      return;
    }
    if (!wasVisibleRef.current) {
      setCustomizeMode(startInCustomizeMode);
      onSelectSlot(startInCustomizeMode && selectedItems.length > 0 ? 0 : null);
      wasVisibleRef.current = true;
    }
  }, [onSelectSlot, selectedItems.length, startInCustomizeMode, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.quickSheetOverlay}>
        <Pressable style={styles.quickSheetBackdrop} onPress={onClose} />
        <View style={styles.quickSheet}>
          <View style={styles.quickSheetHandle} />
          <View style={styles.quickSheetHeader}>
            <View>
              <Text style={styles.quickSheetTitle}>Quick Access</Text>
              <Text style={styles.quickSheetSubtitle}>
                Four places for what matters to you.
              </Text>
            </View>
            <View style={styles.quickSheetActions}>
              <Pressable
                onPress={() => {
                  setCustomizeMode((current) => !current);
                  onSelectSlot(null);
                }}
                style={[
                  styles.quickSheetModeButton,
                  customizeMode ? styles.quickSheetModeButtonActive : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  customizeMode
                    ? "Finish customising quick access"
                    : "Edit your four quick access shortcuts"
                }
                testID="button-customise-launchpad"
              >
                <AppIcon
                  name={customizeMode ? "check" : "sliders"}
                  size={14}
                  color={customizeMode ? COLORS.bg : COLORS.goldBright}
                />
                <Text
                  style={[
                    styles.quickSheetModeText,
                    customizeMode ? styles.quickSheetModeTextActive : null,
                  ]}
                >
                  {customizeMode ? "Done" : "Edit shortcuts"}
                </Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={styles.quickSheetClose}
                accessibilityRole="button"
                accessibilityLabel="Close quick access"
                testID="button-close-launchpad"
              >
                <AppIcon name="x" size={18} color={COLORS.muted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.quickSheetSearch}>
            <AppIcon name="search" size={17} color={theme.iconMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Find a tool"
              placeholderTextColor={theme.textMuted}
              style={styles.quickSheetSearchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Find a Quick Access tool"
              testID="input-quick-access-search"
            />
            {searchQuery ? (
              <Pressable
                onPress={() => setSearchQuery("")}
                style={styles.quickSheetSearchClear}
                accessibilityRole="button"
                accessibilityLabel="Clear Quick Access search"
                hitSlop={8}
              >
                <AppIcon name="x" size={14} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.quickSelectedHeading}>
            <Text style={styles.quickCategoryTitle}>YOUR SHORTCUTS</Text>
            <Text style={styles.quickSelectedCount}>
              {selectedItems.length} of 4
            </Text>
          </View>
          <View style={styles.quickSelectedRow}>
            {selectedItems.slice(0, 4).map((item, index) => {
              const selected = editingSlot === index;
              return (
                <Pressable
                  key={`${item.id}-${index}`}
                  onPress={() => {
                    if (customizeMode) {
                      onSelectSlot(selected ? null : index);
                      return;
                    }
                    onOpen(item.id);
                  }}
                  onLongPress={() => {
                    setCustomizeMode(true);
                    onSelectSlot(selected ? null : index);
                  }}
                  delayLongPress={380}
                  style={({ pressed }) => [
                    styles.quickSelectedSlot,
                    selected ? styles.quickSelectedSlotActive : null,
                    pressed ? styles.quickSelectedSlotPressed : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    customizeMode
                      ? `Edit shortcut ${index + 1}, ${item.label}`
                      : `Open shortcut ${index + 1}, ${item.label}`
                  }
                  accessibilityHint={
                    customizeMode
                      ? "Select this shortcut, then choose a tool below or move it."
                      : "Long press to edit this shortcut."
                  }
                  testID={`button-edit-launchpad-slot-${index}`}
                >
                  <Text style={styles.quickSelectedSlotIndex}>{index + 1}</Text>
                  <View style={styles.quickSelectedSlotIcon}>
                    <PremiumQuickAccessIcon
                      id={item.id}
                      icon={item.icon}
                      size={25}
                      active={selected}
                    />
                  </View>
                  <Text
                    style={[
                      styles.quickSelectedSlotText,
                      selected ? styles.quickSelectedSlotTextActive : null,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {item.liveValue ? (
                    <Text
                      style={styles.quickSelectedSlotValue}
                      numberOfLines={1}
                    >
                      {item.liveValue}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.quickSheetHintRow}>
            <AppIcon
              name={customizeMode ? "sliders" : "star"}
              size={13}
              color={customizeMode ? COLORS.goldBright : COLORS.teal}
            />
            <Text style={styles.quickSheetHintText}>
              {customizeMode
                ? editingSlot == null
                  ? "Tap a shortcut to select it, then choose a tool below."
                  : `Editing shortcut ${editingSlot + 1}. Choose a tool below, or move it.`
                : "Open anything now, or edit these four shortcuts to make Home yours."}
            </Text>
          </View>

          {customizeMode && editingSlot != null ? (
            <View style={styles.quickReorderBar}>
              <View style={styles.quickReorderCopy}>
                <Text style={styles.quickReorderEyebrow}>SHORTCUT ORDER</Text>
                <Text style={styles.quickReorderText}>
                  Position {editingSlot + 1} of {selectedItems.length}
                </Text>
              </View>
              <View style={styles.quickReorderActions}>
                <Pressable
                  onPress={() => onMove(-1)}
                  disabled={editingSlot === 0}
                  style={({ pressed }) => [
                    styles.quickReorderButton,
                    editingSlot === 0
                      ? styles.quickReorderButtonDisabled
                      : null,
                    pressed ? styles.quickReorderButtonPressed : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Move shortcut left"
                  accessibilityState={{ disabled: editingSlot === 0 }}
                  testID="button-move-launchpad-slot-left"
                >
                  <AppIcon
                    name="chevron-left"
                    size={16}
                    color={COLORS.goldBright}
                  />
                </Pressable>
                <Pressable
                  onPress={() => onMove(1)}
                  disabled={editingSlot === selectedItems.length - 1}
                  style={({ pressed }) => [
                    styles.quickReorderButton,
                    editingSlot === selectedItems.length - 1
                      ? styles.quickReorderButtonDisabled
                      : null,
                    pressed ? styles.quickReorderButtonPressed : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Move shortcut right"
                  accessibilityState={{
                    disabled: editingSlot === selectedItems.length - 1,
                  }}
                  testID="button-move-launchpad-slot-right"
                >
                  <AppIcon
                    name="chevron-right"
                    size={16}
                    color={COLORS.goldBright}
                  />
                </Pressable>
              </View>
            </View>
          ) : null}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.quickSheetScroll}
            keyboardShouldPersistTaps="handled"
          >
            {!normalizedQuery && recentItems.length ? (
              <View style={styles.quickRecentSection}>
                <View style={styles.quickSuggestionHeader}>
                  <View>
                    <Text style={styles.quickCategoryTitle}>RECENTLY USED</Text>
                    <Text style={styles.quickSuggestionSubtitle}>
                      Pick up where you left off
                    </Text>
                  </View>
                  <AppIcon name="clock" size={15} color={COLORS.teal} />
                </View>
                <View style={styles.quickMiniToolGrid}>
                  {recentItems.map((item) => renderMiniTool(item, "recent"))}
                </View>
              </View>
            ) : null}

            {!normalizedQuery && suggestedItems.length ? (
              <View style={styles.quickSuggestionSection}>
                <View style={styles.quickSuggestionHeader}>
                  <View>
                    <Text style={styles.quickCategoryTitle}>FOR TODAY</Text>
                    <Text style={styles.quickSuggestionSubtitle}>
                      A quiet starting point from your current rhythm
                    </Text>
                  </View>
                  <AppIcon name="star" size={15} color={COLORS.goldBright} />
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickSuggestionRow}
                >
                  {suggestedItems.map((item) => (
                    <Pressable
                      key={`suggested-${item.id}`}
                      onPress={() => handleToolPress(item.id)}
                      style={({ pressed }) => [
                        styles.quickSuggestionItem,
                        activeIds.has(item.id)
                          ? styles.quickSuggestionItemActive
                          : null,
                        customizeMode && editingSlot == null
                          ? styles.quickToolItemDisabled
                          : null,
                        pressed ? styles.quickToolItemPressed : null,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        !customizeMode
                          ? `Open suggested tool ${item.label}`
                          : editingSlot == null
                            ? `Select a shortcut slot before setting ${item.label}`
                            : `Set shortcut to ${item.label}`
                      }
                      accessibilityState={{
                        disabled: customizeMode && editingSlot == null,
                      }}
                    >
                      <View style={styles.quickSuggestionIcon}>
                        <PremiumQuickAccessIcon
                          id={item.id}
                          icon={item.icon}
                          size={23}
                          active={activeIds.has(item.id)}
                        />
                      </View>
                      <Text
                        style={styles.quickSuggestionLabel}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {categories.map((category) => {
              const categoryItems = filteredItems.filter(
                (item) => item.category === category,
              );
              if (!categoryItems.length) return null;
              return (
                <View key={category} style={styles.quickCategoryBlock}>
                  <Text style={styles.quickCategoryTitle}>{category}</Text>
                  <View style={styles.quickToolGrid}>
                    {categoryItems.map((item) => {
                      const active = activeIds.has(item.id);
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => handleToolPress(item.id)}
                          style={({ pressed }) => [
                            styles.quickToolItem,
                            active ? styles.quickToolItemActive : null,
                            customizeMode && editingSlot == null
                              ? styles.quickToolItemDisabled
                              : null,
                            pressed ? styles.quickToolItemPressed : null,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={
                            !customizeMode
                              ? `Open ${item.label}`
                              : editingSlot == null
                                ? `Select a shortcut slot before setting ${item.label}`
                                : `Set shortcut to ${item.label}`
                          }
                          accessibilityState={{
                            disabled: customizeMode && editingSlot == null,
                          }}
                          accessibilityHint={
                            customizeMode && editingSlot == null
                              ? "Choose one of your shortcuts above first"
                              : undefined
                          }
                          testID={`button-launchpad-tool-${item.id}`}
                        >
                          {active ? (
                            <View style={styles.quickActiveDot}>
                              <AppIcon
                                name="check"
                                size={8}
                                color={COLORS.bg}
                              />
                            </View>
                          ) : null}
                          <View style={styles.quickToolIcon}>
                            <PremiumQuickAccessIcon
                              id={item.id}
                              icon={item.icon}
                              size={30}
                              active={active}
                            />
                          </View>
                          <Text style={styles.quickToolLabel} numberOfLines={1}>
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            {!filteredItems.length ? (
              <View style={styles.quickEmptyState}>
                <View style={styles.quickEmptyIcon}>
                  <AppIcon name="search" size={18} color={COLORS.teal} />
                </View>
                <Text style={styles.quickEmptyTitle}>No tools found</Text>
                <Text style={styles.quickEmptyBody}>
                  Try a different word, such as Quran, prayer, learning, or
                  family.
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={onReset}
              style={({ pressed }) => [
                styles.quickResetButton,
                pressed ? { opacity: 0.76 } : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Restore default quick access shortcuts"
              testID="button-reset-launchpad"
            >
              <AppIcon name="rotate-ccw" size={14} color={COLORS.muted} />
              <Text style={styles.quickResetText}>Restore defaults</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function WeatherMetric({
  icon,
  label,
  value,
}: {
  icon: AppIconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.weatherMetric}>
      <AppIcon name={icon} size={13} color={COLORS.emerald} />
      <Text style={styles.weatherMetricLabel}>{label}</Text>
      <Text style={styles.weatherMetricValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function homeInsightFitLabel(confidence?: number) {
  if ((confidence || 0) >= 0.9) return "Strong fit";
  if ((confidence || 0) >= 0.78) return "Good fit";
  return "Context fit";
}

function homeInsightPriorityLabel(priority?: HomeAiInsight["priority"]) {
  if (priority === "critical") return "Urgent";
  if (priority === "high") return "High value";
  if (priority === "medium") return "Useful now";
  return "Optional";
}

function homeInsightCategoryIcon(
  category?: HomeAiInsight["category"],
): AppIconName {
  switch (category) {
    case "prayer":
      return "clock";
    case "quran":
      return "quran";
    case "arabic":
      return "arabic-learning";
    case "travel":
      return "map";
    case "saved_answer":
      return "shield";
    case "daily_plan":
      return "check-circle";
    case "weather":
      return "cloud";
    default:
      return "target";
  }
}

function HomeAIInsightPanel({
  insight,
  aiMode,
  accentTheme,
  localInsight,
  onPress,
  onFeedback,
}: {
  insight?: HomeAiInsight;
  aiMode: HomeAiMode;
  accentTheme?: HomeAccentTheme;
  localInsight: HomeLocalInsight;
  onPress: (
    prompt: string,
    isPaid: boolean,
    insight?: HomeAiInsight | HomeAiInsightOption,
  ) => void;
  onFeedback?: (
    feedbackKey: string,
    category: string,
    feedback: "helpful" | "not_now" | "show_less",
  ) => void;
}) {
  const safeInsight =
    insight ??
    ({
      title: "Review personal journey update",
      body: "Prayer, Quran, dhikr, weather, goals, and saved progress become one calm journey update.",
      prompt:
        "Review my visible prayer, Quran, dhikr, weather, goals, and habit context. Give one calm journey update and one next step.",
      planLabel: "Personal guide",
      isPaid: false,
      ctaLabel: "Open",
      signals: [],
      secondary: [],
    } satisfies HomeAiInsight);
  const insightTitle = customerSafeAiCopy(safeInsight.title);
  const insightBody = customerSafeAiCopy(safeInsight.body);
  const insightReason = safeInsight.reason
    ? customerSafeAiCopy(safeInsight.reason)
    : "Chosen from visible prayer, Quran, learning, and plan signals.";
  const isLocalMode = aiMode === "local";
  const isScholarMode = aiMode === "scholar";
  const modeEyebrow = "NEXT BEST STEP";
  const modeFootnote = isLocalMode
    ? "Learns from saved app activity, preferences, and your follow-up chats when enabled."
    : isScholarMode
      ? "Adds source-aware Quran, prayer, travel, and learning context without making unsupported rulings."
      : "Uses your app progress, goals, and recent behaviour to shape the next best step.";
  const modeIcon: AppIconName = isLocalMode
    ? "cpu"
    : isScholarMode
      ? "award"
      : "zap";
  const planText = isLocalMode ? "Local memory" : safeInsight.planLabel;
  const insightSignals = safeInsight.signals ?? [];
  const secondaryOptions = (safeInsight.secondary ?? []).slice(0, 3);
  const feedbackKey = safeInsight.feedbackKey;
  const category = safeInsight.category || "trust";
  const fitLabel = homeInsightFitLabel(safeInsight.confidence);
  const priorityLabel = homeInsightPriorityLabel(safeInsight.priority);
  const categoryIcon = homeInsightCategoryIcon(safeInsight.category);
  const contextSignals =
    insightSignals.length > 0
      ? insightSignals
      : ["Prayer", "Quran", "Goals", "Travel"];
  const accentPrimary = accentTheme?.primary ?? COLORS.emerald;
  const accentSoft = accentTheme?.primarySoft ?? "rgba(86,179,148,0.08)";
  const accentBorder = accentTheme?.primaryBorder ?? "rgba(86,179,148,0.18)";
  const accentGold = accentTheme?.gold ?? COLORS.goldBright;
  const livePulse = useSharedValue(0);

  useEffect(() => {
    livePulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [livePulse]);

  const liveDotStyle = useAnimatedStyle(() => ({
    opacity: 0.58 + livePulse.value * 0.42,
    transform: [{ scale: 0.9 + livePulse.value * 0.28 }],
  }));

  return (
    <Pressable
      onPress={() =>
        onPress(safeInsight.prompt, safeInsight.isPaid, safeInsight)
      }
      style={({ pressed }) => [
        styles.aiInsightPanel,
        accentTheme
          ? {
              borderColor: accentBorder,
              backgroundColor: accentTheme.surface ?? "rgba(7, 18, 31, 0.92)",
              shadowColor: accentPrimary,
            }
          : null,
        pressed ? styles.aiInsightPanelPressed : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Personal journey update. ${localInsight.title}. ${planText}. ${insightTitle}`}
      testID="button-home-ai-insight"
    >
      <View
        style={[
          styles.aiIconShell,
          accentTheme
            ? { borderColor: accentBorder, backgroundColor: accentSoft }
            : null,
        ]}
      >
        <NurAILogoMark
          size={34}
          borderRadius={13}
          color={accentGold}
          fallbackStyle={styles.aiLogoFrame}
        />
      </View>
      <View style={styles.aiInsightCopy}>
        <View style={styles.aiInsightMetaRow}>
          <View style={styles.aiInsightLabelLeft}>
            <Animated.View
              style={[
                styles.aiLiveDot,
                { backgroundColor: isLocalMode ? COLORS.teal : accentGold },
                liveDotStyle,
              ]}
            />
            <Text style={styles.aiInsightEyebrow}>{modeEyebrow}</Text>
          </View>
          <View
            style={[
              styles.aiPlanBadge,
              safeInsight.isPaid ? styles.aiPlanBadgePaid : null,
              accentTheme
                ? { borderColor: accentBorder, backgroundColor: accentSoft }
                : null,
            ]}
          >
            <AppIcon
              name={modeIcon}
              size={10}
              color={safeInsight.isPaid ? accentGold : accentPrimary}
            />
            <Text
              style={[
                styles.aiPlanBadgeText,
                safeInsight.isPaid ? styles.aiPlanBadgePaidText : null,
              ]}
            >
              {planText}
            </Text>
          </View>
        </View>
        <View style={styles.aiDecisionRow}>
          <View style={styles.aiDecisionPill}>
            <AppIcon name={categoryIcon} size={10} color={accentGold} />
            <Text style={styles.aiDecisionText} numberOfLines={1}>
              {priorityLabel}
            </Text>
          </View>
          <View style={styles.aiDecisionPill}>
            <AppIcon name="bar-chart-2" size={10} color={accentPrimary} />
            <Text style={styles.aiDecisionText} numberOfLines={1}>
              {fitLabel}
            </Text>
          </View>
        </View>
        <View style={styles.localInsightRow}>
          <View
            style={[
              styles.localInsightIcon,
              localInsight.tone === "weather"
                ? styles.localInsightIconWeather
                : null,
              localInsight.tone === "quran"
                ? styles.localInsightIconQuran
                : null,
            ]}
          >
            <AppIcon
              name={localInsight.icon}
              size={13}
              color={
                localInsight.tone === "quran"
                  ? accentGold
                  : localInsight.tone === "weather"
                    ? COLORS.teal
                    : accentPrimary
              }
            />
          </View>
          <View style={styles.localInsightCopy}>
            <Text style={styles.localInsightTitle} numberOfLines={1}>
              {localInsight.title}
            </Text>
            <Text style={styles.localInsightBody} numberOfLines={1}>
              {localInsight.body}
            </Text>
          </View>
        </View>
        <Text style={styles.aiInsightTitle} numberOfLines={1}>
          {insightTitle}
        </Text>
        <Text style={styles.aiInsightBody} numberOfLines={1}>
          {insightBody}
        </Text>
        <View style={styles.aiReasonRow}>
          <AppIcon name="target" size={11} color={accentGold} />
          <Text style={styles.aiReasonText} numberOfLines={2}>
            {insightReason}
          </Text>
        </View>
        <View style={styles.aiSignalRow}>
          {contextSignals.slice(0, 4).map((signal) => (
            <View key={signal} style={styles.aiSignalChip}>
              <AppIcon name="activity" size={10} color={COLORS.teal} />
              <Text style={styles.aiSignalText} numberOfLines={1}>
                {customerSafeAiCopy(signal)}
              </Text>
            </View>
          ))}
        </View>
        {secondaryOptions.length > 0 ? (
          <View style={styles.aiSecondaryRow}>
            {secondaryOptions.map((option) => (
              <Pressable
                key={`${option.feedbackKey || option.title}-${option.ctaLabel}`}
                onPress={() => onPress(option.prompt, option.isPaid, option)}
                style={({ pressed }) => [
                  styles.aiSecondaryChip,
                  pressed ? styles.aiSecondaryChipPressed : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Alternative next step: ${customerSafeAiCopy(option.title)}`}
              >
                <Text style={styles.aiSecondaryChipText} numberOfLines={1}>
                  {customerSafeAiCopy(option.ctaLabel || option.title)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {safeInsight.safetyNote ? (
          <View style={styles.aiSafetyNoteRow}>
            <AppIcon name="shield" size={10} color={accentGold} />
            <Text style={styles.aiSafetyNoteText} numberOfLines={1}>
              {customerSafeAiCopy(safeInsight.safetyNote)}
            </Text>
          </View>
        ) : null}
        <View style={styles.aiModeFootnoteRow}>
          <AppIcon
            name={isLocalMode ? "shield" : "layers"}
            size={11}
            color={isLocalMode ? COLORS.teal : accentGold}
          />
          <Text style={styles.aiModeFootnote} numberOfLines={1}>
            {modeFootnote}
          </Text>
        </View>
        {feedbackKey && onFeedback ? (
          <View style={styles.aiFeedbackRow}>
            {[
              ["Helpful", "helpful"],
              ["Not now", "not_now"],
              ["Less", "show_less"],
            ].map(([label, feedback]) => (
              <Pressable
                key={feedback}
                onPress={() =>
                  onFeedback(
                    feedbackKey,
                    category,
                    feedback as "helpful" | "not_now" | "show_less",
                  )
                }
                style={({ pressed }) => [
                  styles.aiFeedbackButton,
                  pressed ? styles.aiFeedbackButtonPressed : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Mark Personal AI home recommendation as ${label}`}
              >
                <Text style={styles.aiFeedbackText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.aiInsightAction}>
        {safeInsight.ctaLabel ? (
          <Text
            style={[
              styles.aiInsightActionText,
              { color: safeInsight.isPaid ? accentGold : accentPrimary },
            ]}
            numberOfLines={1}
          >
            {safeInsight.ctaLabel}
          </Text>
        ) : null}
        <AppIcon
          name={safeInsight.isPaid ? "chevron-right" : "arrow-up-right"}
          size={18}
          color={safeInsight.isPaid ? accentGold : accentPrimary}
        />
      </View>
    </Pressable>
  );
}

function LivingDeenGardenPanel({
  streakDays,
  checkedDays,
  todayDayIndex,
  currentTime,
  completedToday,
  totalToday,
  completedCategories,
  onPress,
}: {
  streakDays: number;
  checkedDays: string[];
  todayDayIndex: number;
  currentTime: Date;
  completedToday: number;
  totalToday: number;
  completedCategories: Exclude<HomeFocusCategory, "auto">[];
  onPress: () => void;
}) {
  const weekLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const growthStage =
    streakDays >= 7
      ? "Blooming"
      : completedToday > 0 || streakDays > 0
        ? "Growing"
        : "Seed";
  const totalActions = totalToday || 3;

  return (
    <Pressable onPress={onPress} testID="button-streak-garden">
      <LinearGradient
        colors={["rgba(7,30,35,0.93)", "rgba(5,12,25,0.97)"]}
        style={styles.gardenPanel}
      >
        <View style={styles.gardenScallopLeft} />
        <View style={styles.gardenScallopRight} />
        <View style={styles.gardenHeader}>
          <View>
            <Text style={styles.panelEyebrow}>⌁ LIVING DEEN GARDEN</Text>
            <Text style={styles.gardenTitle}>
              {streakDays > 0 ? `${streakDays} Day Streak` : "Start Today"}
            </Text>
            <Text style={styles.panelSubtitle}>
              {streakDays > 0
                ? "Your garden is growing!"
                : "Plant your first seed today"}
            </Text>
          </View>
          <View style={styles.gardenStageBadge}>
            <Text style={styles.gardenStageLabel}>{growthStage}</Text>
            <Text style={styles.gardenStageValue}>
              {completedToday}/{totalActions} today
            </Text>
          </View>
        </View>
        <GardenIllustration
          growthStage={growthStage}
          completedCategories={completedCategories}
        />
        <View style={styles.gardenActionRow}>
          {[
            { id: "prayer", icon: "prayer", label: "Salah" },
            { id: "quran", icon: "quran", label: "Quran" },
            { id: "arabic", icon: "arabic-learning", label: "Arabic" },
            { id: "charity", icon: "charity", label: "Giving" },
          ].map((item) => {
            const active = completedCategories.includes(
              item.id as Exclude<HomeFocusCategory, "auto">,
            );
            return (
              <View
                key={item.id}
                style={[
                  styles.gardenActionChip,
                  active ? styles.gardenActionChipActive : null,
                ]}
              >
                <AppIcon
                  name={item.icon as AppIconName}
                  size={12}
                  color={active ? COLORS.bg : COLORS.faint}
                />
                <Text
                  style={[
                    styles.gardenActionText,
                    active ? styles.gardenActionTextActive : null,
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={styles.weekSoilRow}>
          {weekLabels.map((label, index) => {
            const checked = checkedDays.includes(
              weekDateKey(currentTime, index),
            );
            const isToday = index === todayDayIndex;
            return (
              <View key={`${label}-${index}`} style={styles.weekSoilCol}>
                <Text
                  style={[
                    styles.weekLabel,
                    isToday ? styles.weekLabelActive : null,
                  ]}
                >
                  {label}
                </Text>
                <View
                  style={[
                    styles.weekDot,
                    checked ? styles.weekDotChecked : null,
                    isToday ? styles.weekDotToday : null,
                  ]}
                />
              </View>
            );
          })}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function GardenIllustration({
  growthStage,
  completedCategories,
}: {
  growthStage: "Seed" | "Growing" | "Blooming";
  completedCategories: Exclude<HomeFocusCategory, "auto">[];
}) {
  const showGrowth = growthStage !== "Seed";
  const showBloom = growthStage === "Blooming";
  const hasQuran = completedCategories.includes("quran");
  const hasCharity = completedCategories.includes("charity");
  const hasArabic = completedCategories.includes("arabic");

  return (
    <View pointerEvents="none" style={styles.gardenArt}>
      <Svg width="100%" height="150" viewBox="0 0 352 150">
        <Defs>
          <SvgLinearGradient id="soilGlow" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={COLORS.teal} stopOpacity="0.08" />
            <Stop
              offset="0.5"
              stopColor={COLORS.goldBright}
              stopOpacity="0.7"
            />
            <Stop offset="1" stopColor={COLORS.teal} stopOpacity="0.12" />
          </SvgLinearGradient>
          <SvgLinearGradient id="gardenSky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLORS.teal} stopOpacity="0.1" />
            <Stop offset="1" stopColor={COLORS.bg} stopOpacity="0" />
          </SvgLinearGradient>
          <SvgLinearGradient id="treeGlow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={COLORS.goldBright} />
            <Stop offset="0.52" stopColor={COLORS.logoLime} />
            <Stop offset="1" stopColor={COLORS.teal} />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M0 0 H352 V116 C264 126 132 120 0 140 Z"
          fill="url(#gardenSky)"
        />
        <G opacity="0.62">
          <Circle cx="35" cy="30" r="1.4" fill={COLORS.goldBright} />
          <Circle cx="76" cy="18" r="1" fill={COLORS.teal} />
          <Circle cx="296" cy="26" r="1.3" fill={COLORS.goldBright} />
          <Circle cx="322" cy="52" r="1" fill={COLORS.teal} />
          <Path
            d="M268 35 C257 30 255 16 267 9 C263 20 271 29 283 28 C280 35 274 38 268 35Z"
            fill={COLORS.goldBright}
            opacity="0.9"
          />
        </G>
        <Path
          d="M4 122 C74 94 126 108 171 92 C226 73 282 83 350 55"
          stroke="url(#soilGlow)"
          strokeWidth="2.4"
          fill="none"
        />
        <Path
          d="M0 150 C70 110 130 122 181 100 C244 74 294 82 352 51 V150 Z"
          fill="rgba(255,212,107,0.07)"
        />
        <G
          stroke={COLORS.goldBright}
          strokeWidth="1.6"
          fill="rgba(255,212,107,0.04)"
          opacity="0.9"
        >
          <Path d="M127 113 V82 C127 62 144 48 164 48 C184 48 201 62 201 82 V113" />
          <Path d="M112 113 H216" />
          <Path d="M150 48 C153 35 159 27 164 23 C169 27 175 35 178 48" />
          <Path d="M99 113 V65 M229 113 V65" />
          <Path d="M99 65 C99 56 108 56 108 65 V113" />
          <Path d="M229 65 C229 56 220 56 220 65 V113" />
          <Path d="M143 113 V91 C143 82 151 75 164 75 C177 75 185 82 185 91 V113" />
        </G>
        {showGrowth ? (
          <>
            <G stroke="url(#treeGlow)" strokeWidth="1.8" fill="none">
              <Path d="M258 118 C258 95 260 75 266 56" />
              <Path d="M262 84 C246 70 236 62 225 55" />
              <Path d="M263 78 C281 65 292 55 304 40" />
              <Path d="M259 102 C242 96 231 91 218 85" />
              <Path d="M260 96 C279 91 294 86 313 78" />
              <Path d="M266 56 C272 67 278 74 287 81" />
            </G>
            <G
              stroke={COLORS.teal}
              strokeWidth="1.3"
              fill="rgba(86,179,148,0.14)"
            >
              {[
                [226, 55],
                [242, 68],
                [287, 81],
                [303, 41],
                [312, 78],
                [219, 85],
              ].map(([x, y], index) => (
                <Path
                  key={index}
                  d={`M${x} ${y} C${x - 8} ${y - 10} ${x - 15} ${y - 5} ${x - 12} ${y + 4} C${x - 3} ${y + 7} ${x + 4} ${y + 4} ${x} ${y}`}
                />
              ))}
            </G>
          </>
        ) : (
          <G stroke="url(#treeGlow)" strokeWidth="1.8" fill="none">
            <Path d="M258 118 C253 106 256 96 267 88" />
            <Path d="M263 99 C252 94 244 92 236 87" />
            <Path d="M263 98 C273 91 282 87 292 81" />
          </G>
        )}
        {showBloom ? (
          <G fill={COLORS.goldBright} opacity="0.86">
            <Circle cx="226" cy="55" r="2.6" />
            <Circle cx="287" cy="81" r="2.5" />
            <Circle cx="303" cy="41" r="2.7" />
          </G>
        ) : null}
        <G stroke={COLORS.goldBright} strokeWidth="1.4" fill="none">
          <Path d="M67 128 C70 109 78 95 93 82" />
          <Path d="M47 136 C52 125 60 118 72 114" />
          <Path d="M320 103 C329 91 338 85 349 80" />
          <Path d="M20 134 C32 119 44 119 56 132" />
        </G>
        <G stroke={COLORS.teal} strokeWidth="1.5" fill="rgba(86,179,148,0.08)">
          <Path d="M62 118 C54 107 43 111 43 121 C51 126 58 124 62 118Z" />
          <Path d="M82 101 C74 91 63 96 64 106 C72 110 79 108 82 101Z" />
          <Path d="M326 91 C318 82 307 86 308 96 C316 101 323 99 326 91Z" />
        </G>
        <G stroke={COLORS.goldBright} strokeWidth="1.5" fill="none">
          {hasQuran ? (
            <>
              <Path d="M284 121 C292 112 307 112 315 121" />
              <Path d="M284 121 L284 134 C292 126 307 126 315 134 V121" />
              <Path d="M299 116 V130" />
            </>
          ) : null}
        </G>
        <G fill={hasCharity ? COLORS.goldBright : COLORS.teal} opacity="0.78">
          {[
            34,
            79,
            111,
            ...(hasArabic ? [151, 176] : []),
            204,
            234,
            276,
            318,
          ].map((x, index) => (
            <Circle key={index} cx={x} cy={122 - (index % 3) * 8} r="2.3" />
          ))}
        </G>
        <G stroke={COLORS.teal} strokeWidth="1.3" fill="none" opacity="0.8">
          <Path d="M42 129 C50 116 62 116 70 127" />
          <Path d="M300 114 C309 101 323 101 331 114" />
        </G>
      </Svg>
    </View>
  );
}

function DailyPulsePanel({
  items,
  onComplete,
  onViewAll,
}: {
  items: HomePulseItem[];
  onComplete: (id: string) => void;
  onViewAll: () => void;
}) {
  const visibleItems = items.slice(0, 3);
  return (
    <View style={styles.pulsePanel}>
      <View style={styles.panelHeaderRow}>
        <View>
          <Text style={styles.panelEyebrow}>DAILY PULSE</Text>
          <Text style={styles.panelSubtitle}>AI suggestions for your day</Text>
        </View>
        <Text style={styles.tasksCount}>{visibleItems.length} tasks</Text>
      </View>
      <View style={styles.pulseRows}>
        {visibleItems.map((item) => (
          <View key={item.id} style={styles.pulseRow}>
            <View style={styles.pulseIcon}>
              <AppIcon name={item.icon} size={22} color={COLORS.emerald} />
            </View>
            <View style={styles.pulseCopy}>
              <Text
                style={[
                  styles.pulseTitle,
                  item.completed ? styles.pulseCompletedText : null,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={styles.pulseSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            </View>
            <Pressable
              onPress={() => onComplete(item.id)}
              style={[
                styles.pulseCheck,
                item.completed ? styles.pulseCheckDone : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Complete ${item.title}`}
              testID={`button-home-pulse-${item.id}`}
            >
              <AppIcon
                name="check"
                size={20}
                color={item.completed ? COLORS.bg : COLORS.goldBright}
              />
            </Pressable>
          </View>
        ))}
      </View>
      <Pressable
        onPress={onViewAll}
        style={styles.viewAllButton}
        testID="button-home-pulse-view-all"
      >
        <Text style={styles.viewAllText}>View all</Text>
        <AppIcon name="chevron-right" size={19} color={COLORS.emerald} />
      </Pressable>
    </View>
  );
}

function FamilyCirclePreview({
  members,
  onPress,
}: {
  members: FamilyMemberPreview[];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.familyPanel}
      testID="button-family-group"
    >
      <View style={styles.panelHeaderRow}>
        <View style={styles.familyHeaderLeft}>
          <AppIcon name="heart" size={20} color={COLORS.emerald} />
          <View>
            <Text style={styles.panelEyebrow}>FAMILY CIRCLE</Text>
            <Text style={styles.panelSubtitle}>
              Stay connected, grow together
            </Text>
          </View>
        </View>
        <View style={styles.familyViewAll}>
          <Text style={styles.viewAllText}>View all</Text>
          <AppIcon name="chevron-right" size={18} color={COLORS.emerald} />
        </View>
      </View>
      <View style={styles.familyMembersRow}>
        {members.slice(0, 4).map((member, index) => (
          <View key={member.id} style={styles.familyMember}>
            <View
              style={[
                styles.familyAvatar,
                { borderColor: index === 0 ? COLORS.emerald : COLORS.teal },
              ]}
            >
              <Text style={styles.familyInitial}>
                {member.name.charAt(0).toUpperCase()}
              </Text>
              <View style={styles.familyOnlineDot} />
            </View>
            <Text style={styles.familyName} numberOfLines={1}>
              {member.name.split(" ")[0]}
            </Text>
            <Text style={styles.familyRole} numberOfLines={1}>
              {member.role}
            </Text>
          </View>
        ))}
        <View style={styles.familyMember}>
          <View style={styles.addMemberCircle}>
            <AppIcon name="plus" size={28} color={COLORS.emerald} />
          </View>
          <Text style={styles.familyName}>Add</Text>
          <Text style={styles.familyRole}>Member</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingBottom: 118,
    overflow: "hidden",
  },
  cleanHomeShell: {
    paddingBottom: 42,
    gap: 16,
  },
  cleanHomeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cleanHeaderRight: {
    alignItems: "flex-end",
    gap: 10,
  },
  dateBlockText: {
    alignItems: "flex-end",
  },
  cleanGreetingCopy: {
    flex: 1,
    minWidth: 0,
  },
  cleanGreetingKicker: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12.5,
    lineHeight: 17,
  },
  cleanNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 1,
  },
  cleanGreetingName: {
    flexShrink: 1,
    maxWidth: "100%",
    color: COLORS.goldBright,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 23,
    lineHeight: 30,
    letterSpacing: 0,
  },
  cleanGreetingSubcopy: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
  },
  cleanLocationPill: {
    maxWidth: 144,
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.25)",
    backgroundColor: "rgba(86,179,148,0.07)",
    paddingHorizontal: 11,
  },
  cleanLocationText: {
    flexShrink: 1,
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12.5,
  },
  paidVerifiedBadge: {
    minHeight: 23,
    maxWidth: 142,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
  },
  paidVerifiedIcon: {
    width: 14,
    height: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  paidVerifiedText: {
    flexShrink: 1,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
    letterSpacing: 0.2,
  },
  cleanPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  homePersonalBriefCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.2)",
    backgroundColor: "rgba(6,16,27,0.96)",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
    shadowColor: COLORS.teal,
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  luxCardOuter: {
    borderRadius: 24,
    padding: 1.2,
    overflow: "hidden",
    shadowColor: COLORS.teal,
    shadowOpacity: 0.14,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
  },
  luxCardInner: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 23,
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 12,
  },
  cardTopSheen: {
    position: "absolute",
    top: 0,
    left: 22,
    right: 22,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  luxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  luxIdentityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  luxEyebrow: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.8,
  },
  luxStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  luxStatus: {
    flex: 1,
    minWidth: 0,
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11.5,
    letterSpacing: 0.1,
  },
  luxBody: {
    gap: 8,
  },
  luxHeadline: {
    color: COLORS.text,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 20.5,
    lineHeight: 27,
    letterSpacing: 0.1,
  },
  luxSubcopy: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    lineHeight: 19.5,
  },
  luxMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  luxMetaText: {
    flex: 1,
    minWidth: 0,
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11.5,
    letterSpacing: 0.1,
  },
  luxMetaPct: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  luxDivider: {
    height: 1,
    backgroundColor: "rgba(255,212,107,0.13)",
  },
  luxAskBar: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "rgba(86,179,148,0.05)",
    paddingHorizontal: 12,
  },
  luxAskSpark: {
    width: 30,
    height: 30,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  luxAskText: {
    flex: 1,
    minWidth: 0,
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    letterSpacing: 0.1,
  },
  luxTrust: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  luxTrustText: {
    flex: 1,
    minWidth: 0,
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10,
    letterSpacing: 0.1,
  },
  aiCardOrnament: {
    position: "absolute",
    right: -10,
    top: -12,
  },
  cardTopHighlight: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  homePersonalBriefHeader: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  homePersonalBriefIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  homePersonalBriefLogo: {
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.34)",
    backgroundColor: "rgba(86,179,148,0.075)",
  },
  homePersonalBriefKickerBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  homePersonalBriefEyebrow: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 8.5,
    letterSpacing: 1.2,
  },
  homePersonalBriefState: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 9.4,
    lineHeight: 12.5,
  },
  homePersonalBriefRight: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  homePersonalBriefRefresh: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.22)",
    backgroundColor: "rgba(86,179,148,0.075)",
  },
  homePersonalBriefRefreshDisabled: {
    opacity: 0.62,
  },
  homePersonalBriefHero: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 11,
  },
  homePersonalBriefHeroCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 6,
  },
  homePersonalBriefMessage: {
    gap: 6,
    paddingTop: 0,
  },
  homePersonalBriefTitle: {
    color: COLORS.text,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 20.5,
    lineHeight: 27,
    letterSpacing: 0,
  },
  homePersonalBriefBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12.4,
    lineHeight: 17.8,
  },
  homePersonalBriefJourneyPill: {
    minWidth: 58,
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  homePersonalBriefJourney: {
    minHeight: 55,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  homePersonalBriefJourneyTop: {
    minHeight: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  homePersonalBriefJourneyValue: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11,
  },
  homePersonalBriefJourneyTrack: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  homePersonalBriefJourneyFill: {
    height: "100%",
    borderRadius: 999,
  },
  homePersonalBriefVisual: {
    width: 92,
    minHeight: 112,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.28)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  homePersonalBriefVisualGlow: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(86,179,148,0.2)",
    opacity: 0.78,
  },
  homePersonalBriefVisualImage: {
    width: 78,
    height: 78,
    borderRadius: 20,
  },
  homePersonalBriefSignals: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 38,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 7,
    paddingVertical: 5,
    gap: 5,
  },
  homePersonalBriefInsightStrip: {
    minHeight: 40,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  homePersonalBriefInsightLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  homePersonalBriefSignal: {
    flex: 1,
    minWidth: 0,
    minHeight: 28,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    position: "relative",
    paddingHorizontal: 2,
  },
  homePersonalBriefSignalCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  homePersonalBriefSignalLabel: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 8,
    lineHeight: 10,
  },
  homePersonalBriefSignalValue: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    lineHeight: 13.2,
  },
  homePersonalBriefSignalDivider: {
    position: "absolute",
    right: 5,
    top: 2,
    bottom: 2,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  homePersonalBriefFooter: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  homePersonalBriefTrust: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  homePersonalBriefTrustText: {
    flex: 1,
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 9.8,
  },
  homePersonalBriefAction: {
    flexShrink: 0,
    maxWidth: "52%",
    borderRadius: 15,
    overflow: "hidden",
    shadowColor: COLORS.emerald,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  homePersonalBriefActionGradient: {
    minHeight: 40,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  aiHeader: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  aiIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  aiAvatarRing: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  aiIdentityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  aiNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  aiName: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  aiBriefLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  aiStatusTag: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  aiStatusSub: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10.5,
    letterSpacing: 0.1,
  },
  aiChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  aiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 9,
  },
  aiChipText: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10.5,
    letterSpacing: 0.1,
  },
  aiAskBar: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.035)",
    paddingHorizontal: 10,
  },
  aiAskSpark: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  aiAskText: {
    flex: 1,
    minWidth: 0,
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.1,
  },
  briefProgressBlock: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(5,12,22,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 7,
  },
  briefProgressTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  briefProgressLabelRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  briefProgressLabel: {
    flex: 1,
    minWidth: 0,
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11.5,
    letterSpacing: 0.2,
  },
  briefProgressPercent: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  briefProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  briefProgressFill: {
    height: 6,
    borderRadius: 999,
  },
  briefProgressMeta: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  homePersonalBriefActionText: {
    flexShrink: 1,
    color: COLORS.bg,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11.2,
  },
  homePersonalBriefVisualBadge: {
    position: "absolute",
    left: 7,
    right: 7,
    bottom: 7,
    minHeight: 23,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    backgroundColor: "rgba(5,10,18,0.68)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 6,
  },
  homePersonalBriefVisualBadgeText: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 8.8,
    letterSpacing: 0.2,
  },
  homePersonalBriefSparkLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginBottom: 1,
  },
  homePersonalBriefSparkText: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 8.8,
    letterSpacing: 1.05,
    textTransform: "uppercase",
  },
  homePersonalBriefError: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10.5,
    lineHeight: 14,
  },
  unifiedAICard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.16)",
    backgroundColor: "rgba(5,10,18,0.98)",
    padding: 14,
    gap: 12,
    shadowColor: COLORS.emerald,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  unifiedAIOrbGlow: {
    position: "absolute",
    right: -52,
    top: -58,
    width: 148,
    height: 148,
    borderRadius: 74,
    opacity: 0.76,
  },
  unifiedAIRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  unifiedAIHeader: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  unifiedAIIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  unifiedAILogoShell: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.16)",
  },
  unifiedAIKickerBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  unifiedAICopy: {
    flex: 1,
    minWidth: 0,
  },
  unifiedAIMetaRow: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },
  unifiedAIEyebrow: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
    letterSpacing: 1.4,
  },
  unifiedAIStateText: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10.5,
    lineHeight: 14,
  },
  unifiedAIBadge: {
    minHeight: 25,
    maxWidth: 142,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
    backgroundColor: "rgba(86,179,148,0.07)",
    paddingHorizontal: 7,
  },
  unifiedAIBadgeText: {
    flexShrink: 1,
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
  },
  unifiedAIHero: {
    minHeight: 110,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.035)",
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    padding: 10,
  },
  unifiedAIMetricDial: {
    width: 96,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  unifiedAIMetricValue: {
    maxWidth: "100%",
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: 0,
    textAlign: "center",
  },
  unifiedAIMetricLabel: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10.5,
    lineHeight: 14,
    textAlign: "center",
    marginTop: 3,
  },
  unifiedAIHeroCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 6,
  },
  unifiedAITitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 18.5,
    lineHeight: 23.5,
    letterSpacing: 0,
  },
  unifiedAIBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12.8,
    lineHeight: 18.6,
  },
  unifiedAIFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  unifiedAIInsightList: {
    gap: 8,
  },
  unifiedAIPrimaryInsight: {
    minHeight: 82,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  unifiedAIPrimaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  unifiedAIPrimaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  unifiedAIMainAction: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  unifiedAIMainActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4,18,13,0.12)",
  },
  unifiedAIMainActionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  unifiedAIMainActionLabel: {
    color: "rgba(4,18,13,0.68)",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10.5,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  unifiedAIMainActionText: {
    color: "#04120D",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 14,
    lineHeight: 18,
  },
  unifiedAISignalRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  unifiedAISignalChip: {
    flex: 1,
    minWidth: "42%",
    minHeight: 42,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  unifiedAISignalText: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10.5,
    lineHeight: 14,
  },
  unifiedAISignalMeta: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
    marginTop: 1,
  },
  unifiedAISecondaryGrid: {
    flexDirection: "row",
    gap: 8,
  },
  unifiedAISecondaryChip: {
    flex: 1,
    minHeight: 50,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 9,
  },
  unifiedAISecondaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  unifiedAISecondaryTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11.5,
    lineHeight: 15,
  },
  unifiedAISecondaryMeta: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    marginTop: 1,
  },
  unifiedAIInsightRow: {
    minHeight: 70,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  unifiedAIInsightIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  unifiedAIInsightCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  unifiedAIInsightTitleRow: {
    minHeight: 19,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unifiedAIInsightTitle: {
    flex: 1,
    minWidth: 0,
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 14,
    lineHeight: 19,
  },
  unifiedAIInsightMeta: {
    maxWidth: 110,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11,
  },
  unifiedAIInsightBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11.5,
    lineHeight: 16,
  },
  unifiedAIInsightAction: {
    minWidth: 74,
    alignItems: "flex-end",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  unifiedAIInsightActionText: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11,
  },
  unifiedAIContextPill: {
    minHeight: 29,
    maxWidth: 158,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.075)",
    paddingHorizontal: 9,
  },
  unifiedAIContextText: {
    flexShrink: 1,
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11.5,
  },
  unifiedAIActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 9,
  },
  unifiedAITrustLine: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  unifiedAITrustText: {
    flex: 1,
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    lineHeight: 15,
  },
  unifiedAICTA: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    backgroundColor: COLORS.emerald,
    paddingHorizontal: 12,
  },
  unifiedAICTAText: {
    color: "#04120D",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12.5,
  },
  compactPrayerCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.2)",
    backgroundColor: "rgba(7,18,31,0.82)",
    padding: 14,
    gap: 12,
  },
  compactPrayerMain: {
    gap: 11,
  },
  compactPrayerDateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  compactHijriDate: {
    flex: 1,
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 13,
  },
  compactGregDate: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    textAlign: "right",
  },
  compactPrayerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  compactPrayerIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.24)",
    backgroundColor: "rgba(255,212,107,0.09)",
  },
  compactPrayerCopy: {
    flex: 1,
    minWidth: 0,
  },
  compactPrayerEyebrow: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.6,
  },
  compactPrayerName: {
    color: COLORS.text,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 27,
    lineHeight: 34,
    letterSpacing: 0,
  },
  compactPrayerTimeBlock: {
    alignItems: "flex-end",
    maxWidth: 118,
  },
  compactPrayerTime: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 14,
  },
  compactPrayerCountdown: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
    marginTop: 3,
  },
  compactPrayerPeriod: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
  },
  compactPrayerMetaGrid: {
    flexDirection: "row",
    gap: 9,
  },
  compactMetaPill: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 11,
  },
  compactMetaText: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11.5,
  },
  compactTodayCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "transparent",
    padding: 14,
    gap: 12,
  },
  compactTodayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  compactSectionEyebrow: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.8,
  },
  compactTodayTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
    marginTop: 2,
  },
  compactProgressPill: {
    minWidth: 54,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.24)",
    backgroundColor: "rgba(255,212,107,0.08)",
    paddingHorizontal: 10,
  },
  compactProgressText: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 14,
  },
  compactPrimaryAction: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.22)",
    backgroundColor: "rgba(86,179,148,0.07)",
    padding: 12,
  },
  compactPrimaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.teal,
  },
  compactPrimaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  compactPrimaryLabel: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.4,
  },
  compactPrimaryTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    marginTop: 4,
  },
  compactPrimaryBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 3,
  },
  compactCommandList: {
    gap: 8,
  },
  compactCommandRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(10,22,32,0.38)",
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  compactCommandRowComplete: {
    borderColor: "rgba(86,179,148,0.26)",
    backgroundColor: "rgba(86,179,148,0.06)",
  },
  compactCommandIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  compactCommandCopy: {
    flex: 1,
    minWidth: 0,
  },
  compactCommandTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14.5,
  },
  compactCommandBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    marginTop: 3,
  },
  compactCommandMeta: {
    maxWidth: 76,
    textAlign: "right",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12,
  },
  compactStreakCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "transparent",
    padding: 14,
    gap: 14,
  },
  compactStreakHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  compactStreakIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.24)",
    backgroundColor: "rgba(86,179,148,0.09)",
  },
  compactStreakCopy: {
    flex: 1,
    minWidth: 0,
  },
  compactStreakTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 16,
    marginTop: 3,
  },
  compactStreakBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  compactStreakCountBadge: {
    minWidth: 48,
    height: 42,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.22)",
    backgroundColor: "rgba(86,179,148,0.08)",
    paddingHorizontal: 9,
    gap: 1,
  },
  compactStreakCountValue: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 17,
  },
  compactStreakCountLabel: {
    color: "rgba(86,179,148,0.6)",
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
  },
  compactGardenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 2,
  },
  compactGardenPlant: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  compactGardenBud: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  compactGardenBudChecked: {
    borderColor: "rgba(86,179,148,0.5)",
    backgroundColor: COLORS.emerald,
  },
  compactGardenBudToday: {
    borderColor: COLORS.emerald,
    borderWidth: 1.5,
  },
  compactGardenStem: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  compactGardenStemChecked: {
    backgroundColor: "rgba(86,179,148,0.45)",
  },
  compactGardenDay: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
    marginTop: 1,
  },
  compactGardenDayToday: {
    color: COLORS.emerald,
  },
  compactShortcutSection: {
    gap: 10,
  },
  compactShortcutHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  compactShortcutHeadingCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  compactShortcutHint: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
  },
  compactShortcutHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compactShortcutHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  compactShortcutManageButton: {
    minWidth: 68,
    height: 44,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(86,179,148,0.2)",
    backgroundColor: "rgba(86,179,148,0.055)",
  },
  compactShortcutManageText: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12.5,
  },
  compactRecentMedia: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
    backgroundColor: "rgba(86,179,148,0.06)",
    paddingHorizontal: 14,
  },
  compactRecentCopy: {
    flex: 1,
    minWidth: 0,
  },
  compactRecentTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
  },
  compactRecentBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  compactShortcutRail: {
    minHeight: 98,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    overflow: "hidden",
    gap: 2,
    paddingHorizontal: 3,
  },
  compactDestinationAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 3,
    paddingVertical: 10,
  },
  compactDestinationIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(86,179,148,0.13)",
  },
  compactDestinationText: {
    maxWidth: "100%",
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12.5,
    lineHeight: 16,
    textAlign: "center",
  },
  compactDestinationMeta: {
    maxWidth: "100%",
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 9.2,
    lineHeight: 12,
    textAlign: "center",
  },
  compactDestinationExpandAction: {
    width: 48,
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
  },
  compactDestinationExpandIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.24)",
    backgroundColor: "rgba(255,212,107,0.08)",
  },
  compactDestinationExpandText: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9.5,
  },
  compactShortcutTile: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(184,194,189,0.12)",
    backgroundColor: "transparent",
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: "hidden",
  },
  compactShortcutIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(86,179,148,0.2)",
    backgroundColor: "rgba(86,179,148,0.065)",
  },
  compactShortcutCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  compactContinueEyebrow: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 1.1,
  },
  compactShortcutText: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14.5,
    lineHeight: 19,
  },
  compactShortcutBody: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  compactContinueAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(86,179,148,0.08)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  greetingCopy: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15.5,
    lineHeight: 19,
    letterSpacing: 0,
  },
  greetingName: {
    color: COLORS.goldBright,
  },
  motivation: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12.5,
    marginTop: 2,
  },
  topUtilityCluster: {
    width: 152,
    maxWidth: "42%",
    alignItems: "stretch",
    gap: 7,
  },
  topUtilityActions: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  locationPill: {
    minHeight: 40,
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.26)",
    backgroundColor: "rgba(86,179,148,0.07)",
    paddingHorizontal: 11,
  },
  locationText: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
  },
  dateBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  hijriDate: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14.5,
    textAlign: "right",
  },
  gregDate: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    textAlign: "right",
    marginTop: 2,
  },
  orbStage: {
    height: 358,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: -8,
  },
  orbStageOpen: {
    height: 548,
  },
  orbPressable: {
    width: 276,
    height: 276,
    alignItems: "center",
    justifyContent: "center",
  },
  orbMainPressable: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  orbPulse: {
    position: "absolute",
    width: 264,
    height: 264,
    borderRadius: 132,
    backgroundColor: "rgba(86,179,148,0.055)",
    shadowColor: COLORS.teal,
    shadowOpacity: 0.42,
    shadowRadius: 22,
  },
  orbSvg: {
    position: "absolute",
  },
  qiblaLabel: {
    position: "absolute",
    top: 10,
    zIndex: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 34,
    maxWidth: 276,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: "rgba(3, 23, 15, 0.52)",
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.22)",
  },
  qiblaLabelAligned: {
    borderColor: "rgba(168,230,93,0.42)",
    backgroundColor: "rgba(86,179,148,0.12)",
  },
  qiblaLabelPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  qiblaText: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9.2,
    letterSpacing: 1,
    flexShrink: 1,
  },
  qiblaDegree: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
    maxWidth: 122,
  },
  qiblaFacing: {
    color: COLORS.logoLime,
  },
  qiblaArrow: {
    position: "absolute",
    zIndex: 1,
    width: 31,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.88,
  },
  kaabaStateChip: {
    position: "absolute",
    top: 52,
    zIndex: 4,
    minHeight: 25,
    maxWidth: 164,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.18)",
    backgroundColor: "rgba(3, 23, 15, 0.46)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  kaabaStateChipAligned: {
    borderColor: "rgba(168,230,93,0.32)",
    backgroundColor: "rgba(86,179,148,0.1)",
  },
  kaabaMiniMark: {
    width: 19,
    height: 19,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.36)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,212,107,0.1)",
  },
  kaabaMiniMarkAligned: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderColor: "rgba(168,230,93,0.42)",
    backgroundColor: "rgba(168,230,93,0.1)",
    shadowColor: COLORS.logoLime,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  kaabaMiniEmoji: {
    fontSize: 14,
    lineHeight: 18,
  },
  kaabaStateText: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  kaabaStateTextAligned: {
    color: COLORS.logoLime,
  },
  orbCopy: {
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 18,
  },
  crescentSvg: {
    marginBottom: -2,
  },
  orbEyebrow: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
    letterSpacing: 1.4,
    marginTop: 0,
  },
  orbPrayer: {
    color: COLORS.text,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 35,
    letterSpacing: 0,
    marginTop: 5,
  },
  orbTimeChip: {
    minHeight: 29,
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.2)",
    backgroundColor: "rgba(255,212,107,0.07)",
    paddingHorizontal: 11,
  },
  orbTimeChipText: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
  },
  orbTimeChipDivider: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
  },
  orbPeriod: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    marginTop: 7,
  },
  orbTime: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
    marginTop: 4,
  },
  orbTonight: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    marginTop: 4,
  },
  countdownRibbon: {
    position: "absolute",
    bottom: 35,
    zIndex: 3,
    minHeight: 33,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.28)",
    backgroundColor: "rgba(3, 23, 15, 0.76)",
    paddingHorizontal: 13,
    shadowColor: COLORS.goldBright,
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  countdownRibbonLabel: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
  },
  countdownRibbonValue: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
  weatherPill: {
    position: "absolute",
    bottom: 2,
    width: "88%",
    minHeight: 66,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "transparent",
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: COLORS.goldBright,
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  weatherPillExpanded: {
    width: "92%",
    minHeight: 236,
    borderRadius: 30,
    bottom: 4,
    backgroundColor: "rgba(8, 28, 35, 0.96)",
  },
  weatherMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  weatherIconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(86,179,148,0.1)",
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
  },
  weatherTemp: {
    color: COLORS.text,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 25,
    minWidth: 46,
  },
  weatherCopy: {
    flex: 1,
    minWidth: 0,
  },
  weatherLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  weatherLabel: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 8.5,
    letterSpacing: 0.9,
  },
  weatherRainChance: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9.5,
  },
  weatherGuidance: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
  },
  weatherMeta: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  weatherExpandedContent: {
    marginTop: 12,
    gap: 10,
  },
  weatherInsightBanner: {
    minHeight: 46,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.16)",
    backgroundColor: "rgba(255,212,107,0.07)",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  weatherInsightIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,212,107,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.2)",
  },
  weatherInsightText: {
    flex: 1,
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11.5,
    lineHeight: 15,
  },
  weatherDetailsRow: {
    flexDirection: "row",
    gap: 8,
  },
  weatherMetric: {
    flex: 1,
    minHeight: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.14)",
    backgroundColor: "rgba(86,179,148,0.07)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  weatherMetricLabel: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 9.5,
    marginTop: 2,
  },
  weatherMetricValue: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10.5,
    marginTop: 1,
  },
  hourlyWeatherRow: {
    flexDirection: "row",
    gap: 8,
  },
  hourlyChip: {
    flex: 1,
    minHeight: 56,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.14)",
    backgroundColor: "rgba(86,179,148,0.07)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  hourlyTime: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9.5,
    marginBottom: 3,
  },
  hourlyValue: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
    marginTop: 3,
  },
  weatherConfidenceRow: {
    flexDirection: "row",
    gap: 8,
  },
  weatherConfidenceItem: {
    flex: 1,
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 9,
  },
  weatherConfidenceText: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10.5,
  },
  walkGuidanceRow: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.16)",
    backgroundColor: "rgba(86,179,148,0.07)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 10,
  },
  walkGuidanceText: {
    flexShrink: 1,
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11.5,
  },
  priorityPanel: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.24)",
    backgroundColor: "rgba(7, 18, 31, 0.92)",
    padding: 13,
    shadowColor: COLORS.goldBright,
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  priorityTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  priorityIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,212,107,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.22)",
  },
  priorityCopy: {
    flex: 1,
    minWidth: 0,
  },
  priorityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  priorityEyebrow: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  priorityProgressText: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
  },
  priorityTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 15,
    marginTop: 4,
  },
  priorityBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11.5,
    lineHeight: 15,
    marginTop: 2,
  },
  priorityProgressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(86,179,148,0.12)",
    overflow: "hidden",
    marginTop: 8,
  },
  priorityProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.goldBright,
  },
  priorityButton: {
    minHeight: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.goldBright,
    paddingHorizontal: 13,
  },
  priorityButtonText: {
    color: COLORS.bg,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11.5,
  },
  focusChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
  },
  focusChip: {
    minHeight: 31,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.16)",
    backgroundColor: "rgba(86,179,148,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
  },
  focusChipSelected: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  focusChipText: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10.5,
  },
  focusChipTextSelected: {
    color: COLORS.bg,
  },
  completePanel: {
    minHeight: 72,
    marginTop: 0,
    marginBottom: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.34)",
    backgroundColor: "rgba(255,212,107,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  completeGlow: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.goldBright,
    shadowColor: COLORS.goldBright,
    shadowOpacity: 0.55,
    shadowRadius: 14,
  },
  completeCopy: {
    flex: 1,
    minWidth: 0,
  },
  completeEyebrow: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  completeTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 15,
    marginTop: 3,
  },
  completeBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11.5,
    marginTop: 2,
  },
  quranFlagshipPanel: {
    marginTop: 0,
    marginBottom: 10,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.32)",
    backgroundColor: "rgba(6,20,31,0.86)",
    overflow: "hidden",
    padding: 14,
  },
  quranFlagshipTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  quranFlagshipSeal: {
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.38)",
    backgroundColor: "rgba(255,212,107,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  quranFlagshipCopy: {
    flex: 1,
    minWidth: 0,
  },
  quranFlagshipEyebrow: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.25,
  },
  quranFlagshipTitle: {
    color: COLORS.text,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 18,
    lineHeight: 24,
    marginTop: 3,
  },
  quranFlagshipBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 3,
  },
  quranFlagshipStatus: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.28)",
    backgroundColor: "rgba(255,212,107,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
  },
  quranFlagshipStatusComplete: {
    backgroundColor: COLORS.goldBright,
    borderColor: COLORS.goldBright,
  },
  quranFlagshipStatusText: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
  },
  quranFlagshipStatusTextComplete: {
    color: COLORS.bg,
  },
  quranFlagshipSteps: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 13,
  },
  quranFlagshipStep: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.18)",
    backgroundColor: "rgba(255,212,107,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
  },
  quranFlagshipStepText: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10.5,
  },
  quranContinuityCard: {
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.22)",
    backgroundColor: "rgba(5,12,20,0.44)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    padding: 10,
  },
  quranContinuityIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.26)",
    backgroundColor: "rgba(255,212,107,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  quranContinuityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  quranContinuityEyebrow: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
    letterSpacing: 0.85,
  },
  quranContinuityTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12.5,
  },
  quranContinuityBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    lineHeight: 15,
  },
  quranContinuityMetaPill: {
    maxWidth: 104,
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.22)",
    backgroundColor: "rgba(86,179,148,0.07)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  quranContinuityMetaText: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
  },
  quranNextActionRail: {
    minHeight: 92,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: "rgba(5,12,20,0.54)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    padding: 10,
  },
  quranNextActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  quranNextActionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  quranNextActionEyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
    letterSpacing: 0.9,
  },
  quranNextActionTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 13,
  },
  quranNextActionBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    lineHeight: 15,
  },
  quranNextActionProof: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9.5,
    marginTop: 2,
  },
  quranNextActionPill: {
    minWidth: 68,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
  },
  quranNextActionPillText: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
  },
  quranPersonalBoundary: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
    backgroundColor: "rgba(86,179,148,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  quranPersonalBoundaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  quranPersonalBoundaryText: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10.5,
  },
  quranPersonalBoundarySubtext: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 9.5,
  },
  quranDailyActionPlan: {
    marginTop: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
    backgroundColor: "rgba(3,13,22,0.46)",
    padding: 10,
  },
  quranDailyActionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 9,
  },
  quranDailyActionEyebrow: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
    letterSpacing: 0.9,
  },
  quranDailyActionSourcePill: {
    minHeight: 26,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.24)",
    backgroundColor: "rgba(86,179,148,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
  },
  quranDailyActionSourceText: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
  },
  quranDailyActionGrid: {
    gap: 8,
  },
  quranDailyActionStep: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.035)",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 9,
  },
  quranDailyActionStepComplete: {
    backgroundColor: "rgba(255,212,107,0.08)",
  },
  quranDailyActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  quranDailyActionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  quranDailyActionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  quranDailyActionTitle: {
    color: COLORS.text,
    flex: 1,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12,
  },
  quranDailyActionStatus: {
    maxWidth: 96,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
  },
  quranDailyActionBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10.5,
    lineHeight: 14,
  },
  quranDailyHandoffSummary: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.18)",
    backgroundColor: "rgba(255,212,107,0.055)",
    marginBottom: 9,
    padding: 10,
  },
  quranDailyHandoffStatus: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11.5,
  },
  quranDailyHandoffProof: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },
  quranDailyHandoffBoundary: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.16)",
    backgroundColor: "rgba(5,12,20,0.38)",
    flexDirection: "row",
    gap: 7,
    marginTop: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  quranDailyHandoffBoundaryText: {
    color: COLORS.faint,
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    lineHeight: 14,
  },
  personalPlanBand: {
    minHeight: 42,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.2)",
    backgroundColor: "rgba(255,212,107,0.07)",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  personalPlanBandIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,212,107,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  personalPlanBandCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  personalPlanBandText: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
    lineHeight: 15,
  },
  personalPlanBoundaryText: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    lineHeight: 14,
  },
  quranFlagshipActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 13,
  },
  quranPrimaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: COLORS.goldBright,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  quranPrimaryActionText: {
    color: COLORS.bg,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 13,
  },
  quranSecondaryAction: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.28)",
    backgroundColor: "rgba(86,179,148,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
  },
  quranSecondaryActionText: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12.5,
  },
  dailyProofRail: {
    marginBottom: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(168,230,93,0.18)",
    backgroundColor: "rgba(4,18,23,0.74)",
    padding: 13,
    gap: 10,
  },
  dailyProofHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dailyProofHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  dailyProofEyebrow: {
    color: COLORS.logoLime,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
    letterSpacing: 1.1,
  },
  dailyProofTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 15,
    marginTop: 2,
  },
  dailyProofPercentPill: {
    minWidth: 48,
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(168,230,93,0.24)",
    backgroundColor: "rgba(168,230,93,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  dailyProofPercentText: {
    color: COLORS.logoLime,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12,
  },
  dailyProofInsight: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11.4,
    lineHeight: 16,
  },
  dailyProofPrimaryAction: {
    minHeight: 72,
    borderRadius: 19,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.035)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
  },
  dailyProofPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  dailyProofPrimaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyProofPrimaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  dailyProofReason: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
  },
  dailyProofActionTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 13.5,
    marginTop: 2,
  },
  dailyProofActionBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  dailyProofActionRight: {
    alignItems: "flex-end",
    gap: 5,
  },
  dailyProofReward: {
    maxWidth: 86,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
  },
  dailyProofSegments: {
    flexDirection: "row",
    gap: 8,
  },
  dailyProofSegment: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.075)",
    backgroundColor: "rgba(5,12,20,0.34)",
    padding: 8,
    justifyContent: "center",
  },
  dailyProofSegmentTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 7,
  },
  dailyProofSegmentLabel: {
    color: COLORS.muted,
    flex: 1,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
  },
  dailyProofSegmentCount: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
  },
  dailyProofSegmentTrack: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dailyProofSegmentFill: {
    height: "100%",
    borderRadius: 999,
  },
  dailyProofMiniActions: {
    flexDirection: "row",
    gap: 8,
  },
  dailyProofMiniAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.16)",
    backgroundColor: "rgba(86,179,148,0.055)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 9,
  },
  dailyProofMiniText: {
    color: COLORS.text,
    flexShrink: 1,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10.5,
  },
  dailyProofBoundary: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.15)",
    backgroundColor: "rgba(86,179,148,0.05)",
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dailyProofBoundaryText: {
    color: COLORS.faint,
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    lineHeight: 14,
  },
  commandCenterPanel: {
    marginBottom: 10,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
    backgroundColor: "rgba(5,15,25,0.82)",
    padding: 13,
  },
  commandCenterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  commandCenterEyebrow: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  commandCenterTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 15,
    marginTop: 2,
  },
  commandCenterProgress: {
    minWidth: 46,
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.24)",
    backgroundColor: "rgba(255,212,107,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  commandCenterProgressText: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12,
  },
  commandPersonalBrief: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.24)",
    backgroundColor: "rgba(255,212,107,0.075)",
    padding: 11,
    gap: 7,
    marginBottom: 10,
  },
  commandPersonalBriefTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  commandPersonalBriefIcon: {
    width: 32,
    height: 32,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,212,107,0.14)",
  },
  commandPersonalBriefCopy: {
    flex: 1,
    minWidth: 0,
  },
  commandPersonalBriefEyebrow: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
    letterSpacing: 1.1,
  },
  commandPersonalBriefTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  commandPersonalBriefBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11.5,
    lineHeight: 16,
  },
  commandPersonalBriefFooterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  commandPersonalBriefFooter: {
    minHeight: 24,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(86,179,148,0.08)",
    paddingHorizontal: 9,
  },
  commandPersonalBriefFooterText: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10.5,
    maxWidth: 260,
  },
  commandPersonalFreshnessPill: {
    minHeight: 24,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.18)",
    backgroundColor: "rgba(255,212,107,0.07)",
    paddingHorizontal: 9,
  },
  commandPersonalFreshnessText: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10.5,
    maxWidth: 236,
  },
  commandPersonalTrustLine: {
    minHeight: 34,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.18)",
    backgroundColor: "rgba(255,212,107,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  commandPersonalTrustLineText: {
    color: COLORS.muted,
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10.5,
    lineHeight: 15,
  },
  commandPersonalReceipt: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.17)",
    backgroundColor: "rgba(86,179,148,0.055)",
    gap: 8,
    padding: 9,
  },
  commandPersonalReceiptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  commandPersonalReceiptEyebrow: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9,
    letterSpacing: 0.9,
  },
  commandPersonalReceiptCount: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
  },
  commandPersonalReceiptRow: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.075)",
    backgroundColor: "rgba(5,12,20,0.3)",
    flexDirection: "row",
    gap: 8,
    padding: 8,
  },
  commandPersonalReceiptIcon: {
    width: 25,
    height: 25,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
    backgroundColor: "rgba(86,179,148,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  commandPersonalReceiptCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  commandPersonalReceiptTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11.5,
  },
  commandPersonalReceiptEvidence: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
  },
  commandPersonalReceiptBoundary: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 9.8,
    lineHeight: 13,
    marginTop: 1,
  },
  commandPlanSafetyPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.18)",
    backgroundColor: "rgba(255,212,107,0.055)",
    gap: 8,
    padding: 9,
  },
  commandPlanSafetyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  commandPlanSafetyEyebrow: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9,
    letterSpacing: 0.9,
  },
  commandPlanSafetyCount: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
  },
  commandPlanSafetyRow: {
    minHeight: 70,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.075)",
    backgroundColor: "rgba(5,12,20,0.3)",
    flexDirection: "row",
    gap: 8,
    padding: 8,
  },
  commandPlanSafetyIcon: {
    width: 25,
    height: 25,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.2)",
    backgroundColor: "rgba(255,212,107,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  commandPlanSafetyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  commandPlanSafetyTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  commandPlanSafetyTitle: {
    color: COLORS.text,
    flex: 1,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11.5,
  },
  commandPlanSafetyEvidence: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
    maxWidth: 116,
  },
  commandPlanSafetyAction: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    lineHeight: 13,
  },
  commandPlanSafetyBoundary: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 9.5,
    lineHeight: 13,
  },
  commandPlanAdjustmentPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
    backgroundColor: "rgba(86,179,148,0.055)",
    gap: 8,
    padding: 9,
  },
  commandPlanAdjustmentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  commandPlanAdjustmentIcon: {
    width: 30,
    height: 30,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.22)",
    backgroundColor: "rgba(255,212,107,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  commandPlanAdjustmentCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  commandPlanAdjustmentEyebrow: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9,
    letterSpacing: 0.9,
  },
  commandPlanAdjustmentTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12,
  },
  commandPlanAdjustmentStatus: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10.5,
    lineHeight: 14,
  },
  commandPlanAdjustmentItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  commandPlanAdjustmentItem: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.075)",
    backgroundColor: "rgba(5,12,20,0.3)",
    padding: 8,
    gap: 2,
  },
  commandPlanAdjustmentItemTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10.5,
  },
  commandPlanAdjustmentItemEvidence: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9.5,
  },
  commandPlanAdjustmentItemBoundary: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 9.4,
    lineHeight: 12.5,
  },
  commandPlanAdjustmentBoundary: {
    minHeight: 34,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.18)",
    backgroundColor: "rgba(255,212,107,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  commandPlanAdjustmentBoundaryText: {
    color: COLORS.muted,
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    lineHeight: 14,
  },
  commandPlanAdjustmentActions: {
    flexDirection: "row",
    gap: 7,
  },
  commandPlanAdjustmentPrimary: {
    flex: 1.08,
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: COLORS.goldBright,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  commandPlanAdjustmentPrimaryText: {
    color: COLORS.bg,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10.5,
  },
  commandPlanAdjustmentSecondary: {
    flex: 0.92,
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.28)",
    backgroundColor: "rgba(86,179,148,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  commandPlanAdjustmentSecondaryText: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10.5,
  },
  commandPlanChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 10,
  },
  commandPlanChip: {
    maxWidth: "100%",
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
    backgroundColor: "rgba(86,179,148,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 7,
    paddingRight: 10,
  },
  commandPlanChipIndex: {
    width: 17,
    height: 17,
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor: "rgba(86,179,148,0.16)",
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    lineHeight: 17,
    textAlign: "center",
  },
  commandPlanChipText: {
    color: COLORS.muted,
    flexShrink: 1,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10.5,
  },
  commandAiNudge: {
    minHeight: 78,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.28)",
    backgroundColor: "rgba(86,179,148,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    marginBottom: 10,
  },
  commandAiNudgePressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  commandAiIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: COLORS.emerald,
    alignItems: "center",
    justifyContent: "center",
  },
  commandAiCopy: {
    flex: 1,
    minWidth: 0,
  },
  commandAiEyebrow: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9,
    letterSpacing: 0.9,
  },
  commandAiTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 13.5,
    lineHeight: 17,
    marginTop: 2,
  },
  commandAiBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11.2,
    lineHeight: 15.5,
    marginTop: 2,
  },
  commandAiCta: {
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: COLORS.emerald,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
  },
  commandAiCtaText: {
    color: COLORS.bg,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10.5,
  },
  commandGrid: {
    gap: 8,
  },
  commandTile: {
    minHeight: 62,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.035)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
  },
  commandTileComplete: {
    borderColor: "rgba(168,230,93,0.24)",
    backgroundColor: "rgba(168,230,93,0.07)",
  },
  commandIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  commandCopy: {
    flex: 1,
    minWidth: 0,
  },
  commandTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  commandTitle: {
    color: COLORS.text,
    flex: 1,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 13.5,
  },
  commandMeta: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10.5,
  },
  commandBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11.5,
    lineHeight: 15.5,
    marginTop: 2,
  },
  continuePanel: {
    marginTop: 0,
    marginBottom: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
    backgroundColor: "rgba(6,20,31,0.74)",
    padding: 13,
  },
  compactSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  continueEyebrow: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.1,
  },
  continueSubtitle: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11.5,
    marginTop: 2,
  },
  continueRows: {
    gap: 8,
  },
  continueRow: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.035)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
  },
  continueListeningRow: {
    minHeight: 68,
    overflow: "hidden",
    borderColor: "rgba(255,212,107,0.2)",
  },
  continueListeningGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.72,
  },
  continueIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  continueCopy: {
    flex: 1,
    minWidth: 0,
  },
  continueTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 13.5,
  },
  continueBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11.2,
    marginTop: 2,
  },
  continueMeta: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10.5,
    marginTop: 2,
  },
  weeklyGrowthPanel: {
    marginTop: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.16)",
    backgroundColor: "rgba(7,18,31,0.72)",
    padding: 14,
  },
  weeklyGrowthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  weeklyGrowthEyebrow: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.1,
  },
  weeklyGrowthTitle: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
    maxWidth: 235,
  },
  weeklyGrowthBody: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
    maxWidth: 238,
  },
  weeklyGrowthRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(86,179,148,0.45)",
    backgroundColor: "rgba(86,179,148,0.08)",
  },
  weeklyGrowthRingValue: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12.5,
  },
  weeklyGrowthStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  weeklyGrowthStat: {
    flex: 1,
    minHeight: 58,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.12)",
    backgroundColor: "rgba(86,179,148,0.055)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  weeklyGrowthStatValue: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12.5,
    marginTop: 3,
  },
  weeklyGrowthStatLabel: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 9.5,
    marginTop: 1,
  },
  weeklyGrowthTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(86,179,148,0.12)",
    overflow: "hidden",
    marginTop: 12,
  },
  weeklyGrowthFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.emerald,
  },
  weeklyGrowthIntention: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.17)",
    backgroundColor: "rgba(255,212,107,0.055)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    padding: 10,
  },
  weeklyGrowthIntentionIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,212,107,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.2)",
  },
  weeklyGrowthIntentionCopy: {
    flex: 1,
    minWidth: 0,
  },
  weeklyGrowthIntentionTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12.5,
  },
  weeklyGrowthIntentionBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    lineHeight: 14.5,
    marginTop: 2,
  },
  weeklyGrowthBoundary: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 10,
  },
  weeklyGrowthReflectionInput: {
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.16)",
    backgroundColor: "rgba(255,255,255,0.045)",
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
  weeklyGrowthSavedLabel: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10.5,
    marginTop: 7,
  },
  weeklyGrowthActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  weeklyGrowthAction: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: COLORS.emerald,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  weeklyGrowthActionPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9,
  },
  weeklyGrowthActionText: {
    color: COLORS.bg,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12,
  },
  weeklyGrowthSaveAction: {
    minWidth: 92,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.34)",
    backgroundColor: "rgba(255,212,107,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  weeklyGrowthSaveActionDisabled: {
    opacity: 0.48,
  },
  weeklyGrowthSaveActionText: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12,
  },
  quickSheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  quickSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  quickSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(86,179,148,0.2)",
    backgroundColor: "#071A1A",
    paddingHorizontal: 20,
    paddingBottom: 34,
    overflow: "hidden",
  },
  quickSheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(231,242,246,0.22)",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 14,
  },
  quickSheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  quickSheetActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickSheetTitle: {
    color: COLORS.text,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 23,
  },
  quickSheetSubtitle: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    marginTop: 4,
  },
  quickSheetClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  quickSheetModeButton: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.22)",
    backgroundColor: "rgba(255,212,107,0.07)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
  },
  quickSheetModeButtonActive: {
    backgroundColor: COLORS.goldBright,
    borderColor: COLORS.goldBright,
  },
  quickSheetModeText: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10.5,
  },
  quickSheetModeTextActive: {
    color: COLORS.bg,
  },
  quickSheetSearch: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.2)",
    backgroundColor: "rgba(255,255,255,0.045)",
    paddingHorizontal: 13,
    marginTop: 16,
  },
  quickSheetSearchInput: {
    flex: 1,
    minHeight: 44,
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    paddingVertical: 0,
  },
  quickSheetSearchClear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  quickSelectedHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  quickSelectedCount: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10.5,
  },
  quickSelectedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 1,
  },
  quickSelectedSlot: {
    width: "23%",
    minHeight: 94,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.18)",
    backgroundColor: "rgba(255,212,107,0.055)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 7,
  },
  quickSelectedSlotPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  quickSelectedSlotActive: {
    backgroundColor: "rgba(255,212,107,0.16)",
    borderColor: COLORS.goldBright,
  },
  quickSelectedSlotIndex: {
    position: "absolute",
    top: 6,
    right: 7,
    color: "rgba(255,212,107,0.58)",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9,
  },
  quickSelectedSlotIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(86,179,148,0.1)",
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
  },
  quickSelectedSlotText: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9.2,
    maxWidth: "100%",
  },
  quickSelectedSlotTextActive: {
    color: COLORS.goldBright,
  },
  quickSelectedSlotValue: {
    maxWidth: "100%",
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 8.5,
    lineHeight: 11,
    textAlign: "center",
  },
  quickSheetHintRow: {
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: "rgba(86,179,148,0.07)",
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    marginTop: 12,
  },
  quickSheetHintText: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10.5,
  },
  quickReorderBar: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.16)",
    backgroundColor: "rgba(255,212,107,0.055)",
    paddingHorizontal: 12,
    marginTop: 9,
  },
  quickReorderCopy: {
    flex: 1,
    minWidth: 0,
  },
  quickReorderEyebrow: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1,
  },
  quickReorderText: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    marginTop: 2,
  },
  quickReorderActions: {
    flexDirection: "row",
    gap: 7,
  },
  quickReorderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,212,107,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.22)",
  },
  quickReorderButtonDisabled: {
    opacity: 0.3,
  },
  quickReorderButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  quickSheetScroll: {
    paddingTop: 16,
    paddingBottom: 18,
  },
  quickRecentSection: {
    marginBottom: 18,
  },
  quickMiniToolGrid: {
    gap: 8,
  },
  quickMiniTool: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.15)",
    backgroundColor: "rgba(86,179,148,0.055)",
    paddingHorizontal: 10,
  },
  quickMiniToolActive: {
    borderColor: "rgba(255,212,107,0.28)",
    backgroundColor: "rgba(255,212,107,0.055)",
  },
  quickMiniToolIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(86,179,148,0.1)",
  },
  quickMiniToolCopy: {
    flex: 1,
    minWidth: 0,
  },
  quickMiniToolLabel: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
  },
  quickMiniToolValue: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    marginTop: 2,
  },
  quickSuggestionSection: {
    marginBottom: 18,
  },
  quickSuggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  quickSuggestionSubtitle: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10.5,
    marginTop: -4,
  },
  quickSuggestionRow: {
    gap: 9,
    paddingRight: 4,
  },
  quickSuggestionItem: {
    width: 106,
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.16)",
    backgroundColor: "rgba(255,212,107,0.055)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  quickSuggestionItemActive: {
    borderColor: "rgba(86,179,148,0.32)",
    backgroundColor: "rgba(86,179,148,0.08)",
  },
  quickSuggestionIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(86,179,148,0.1)",
  },
  quickSuggestionLabel: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10.5,
    textAlign: "center",
  },
  quickCategoryBlock: {
    marginBottom: 18,
  },
  quickCategoryTitle: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10.5,
    letterSpacing: 1.2,
    marginBottom: 9,
  },
  quickToolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  quickToolItem: {
    width: "31%",
    minHeight: 82,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.12)",
    backgroundColor: "rgba(86,179,148,0.055)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  quickToolItemActive: {
    borderColor: "rgba(255,212,107,0.28)",
    backgroundColor: "rgba(255,212,107,0.06)",
  },
  quickToolItemDisabled: {
    opacity: 0.62,
  },
  quickToolItemPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  quickActiveDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.goldBright,
  },
  quickToolIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(86,179,148,0.1)",
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
    marginBottom: 7,
  },
  quickToolLabel: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10.5,
    textAlign: "center",
  },
  quickEmptyState: {
    minHeight: 154,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  quickEmptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(86,179,148,0.1)",
    marginBottom: 10,
  },
  quickEmptyTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
  },
  quickEmptyBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 4,
  },
  quickResetButton: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickResetText: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
  },
  nextActionPanel: {
    minHeight: 76,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.26)",
    backgroundColor: "rgba(7, 18, 31, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    shadowColor: COLORS.teal,
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  nextActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(86,179,148,0.1)",
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.24)",
  },
  nextActionCopy: {
    flex: 1,
    minWidth: 0,
  },
  nextActionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  nextActionEyebrow: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1,
  },
  nextActionProgressText: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10.5,
  },
  nextActionTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 15,
    marginTop: 4,
  },
  nextActionCompleted: {
    color: COLORS.goldBright,
  },
  nextActionBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  nextActionProgressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(86,179,148,0.12)",
    overflow: "hidden",
    marginTop: 7,
  },
  nextActionProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.goldBright,
  },
  nextActionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.goldBright,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.42)",
  },
  nextActionButtonSecondary: {
    backgroundColor: "rgba(86,179,148,0.08)",
    borderColor: "rgba(86,179,148,0.28)",
  },
  aiInsightPanel: {
    minHeight: 106,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.22)",
    backgroundColor: "rgba(7, 18, 31, 0.95)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 11,
    shadowColor: COLORS.teal,
    shadowOpacity: 0.1,
    shadowRadius: 22,
  },
  aiInsightPanelPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.992 }],
  },
  aiIconShell: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,212,107,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.24)",
  },
  aiLogoFrame: {
    backgroundColor: "transparent",
  },
  aiInsightCopy: {
    flex: 1,
    minWidth: 0,
  },
  aiInsightMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  aiInsightLabelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
  },
  aiDecisionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  aiDecisionPill: {
    minHeight: 23,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.18)",
    backgroundColor: "rgba(255,212,107,0.07)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
  },
  aiDecisionText: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.6,
  },
  aiLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.emerald,
    shadowColor: COLORS.emerald,
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  aiInsightEyebrow: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.1,
  },
  localInsightRow: {
    minHeight: 40,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.14)",
    backgroundColor: "rgba(255,212,107,0.055)",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  localInsightIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(86,179,148,0.1)",
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
  },
  localInsightIconWeather: {
    backgroundColor: "rgba(86,179,148,0.1)",
    borderColor: "rgba(86,179,148,0.18)",
  },
  localInsightIconQuran: {
    backgroundColor: "rgba(255,212,107,0.1)",
    borderColor: "rgba(255,212,107,0.2)",
  },
  localInsightCopy: {
    flex: 1,
    minWidth: 0,
  },
  localInsightTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12,
  },
  localInsightBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10.5,
    marginTop: 2,
  },
  aiPlanBadge: {
    minHeight: 21,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: "rgba(86,179,148,0.09)",
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
    paddingHorizontal: 7,
  },
  aiPlanBadgePaid: {
    backgroundColor: "rgba(255,212,107,0.1)",
    borderColor: "rgba(255,212,107,0.24)",
  },
  aiPlanBadgeText: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9.5,
  },
  aiPlanBadgePaidText: {
    color: COLORS.goldBright,
  },
  aiInsightTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12.6,
  },
  aiInsightBody: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 10.8,
    lineHeight: 15,
    marginTop: 3,
  },
  aiReasonRow: {
    minHeight: 34,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.16)",
    backgroundColor: "rgba(255,212,107,0.055)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  aiReasonText: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10.4,
    lineHeight: 14,
  },
  aiSignalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 7,
  },
  aiSignalChip: {
    maxWidth: "31.5%",
    minHeight: 21,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.16)",
    backgroundColor: "rgba(86,179,148,0.07)",
    paddingHorizontal: 7,
  },
  aiSignalText: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9.2,
  },
  aiSecondaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 7,
  },
  aiSecondaryChip: {
    maxWidth: "32%",
    minHeight: 32,
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.2)",
    backgroundColor: "rgba(255,212,107,0.08)",
    paddingHorizontal: 8,
  },
  aiSecondaryChipPressed: {
    opacity: 0.76,
  },
  aiSecondaryChipText: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.4,
    textAlign: "center",
  },
  aiSafetyNoteRow: {
    minHeight: 21,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 7,
  },
  aiSafetyNoteText: {
    flex: 1,
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
  },
  aiModeFootnoteRow: {
    minHeight: 21,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 7,
  },
  aiModeFootnote: {
    flex: 1,
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10.2,
  },
  aiFeedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  aiFeedbackButton: {
    minHeight: 32,
    minWidth: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.16)",
    backgroundColor: "rgba(86,179,148,0.06)",
    paddingHorizontal: 8,
  },
  aiFeedbackButtonPressed: {
    opacity: 0.72,
  },
  aiFeedbackText: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9.2,
  },
  aiInsightAction: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 10,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,212,107,0.075)",
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.16)",
  },
  aiInsightActionText: {
    maxWidth: 68,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10.2,
  },
  gardenPanel: {
    minHeight: 258,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    overflow: "hidden",
  },
  gardenScallopLeft: {
    position: "absolute",
    left: -2,
    top: -2,
    width: 38,
    height: 38,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gardenScallopRight: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 38,
    height: 38,
    borderTopRightRadius: 28,
    borderTopLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gardenHeader: {
    zIndex: 2,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  panelEyebrow: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
    letterSpacing: 1.1,
  },
  gardenTitle: {
    color: COLORS.goldBright,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 24,
    marginTop: 4,
  },
  panelSubtitle: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    marginTop: 3,
  },
  gardenStageBadge: {
    minWidth: 82,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.22)",
    backgroundColor: "rgba(255,212,107,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "flex-end",
  },
  gardenStageLabel: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11,
  },
  gardenStageValue: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    marginTop: 2,
  },
  gardenArt: {
    height: 150,
    marginTop: -4,
    marginHorizontal: -12,
  },
  gardenActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 7,
    marginTop: -11,
    marginBottom: 8,
  },
  gardenActionChip: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
  },
  gardenActionChipActive: {
    backgroundColor: COLORS.goldBright,
    borderColor: COLORS.goldBright,
  },
  gardenActionText: {
    color: COLORS.faint,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
  },
  gardenActionTextActive: {
    color: COLORS.bg,
  },
  weekSoilRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 19,
    marginTop: -16,
  },
  weekSoilCol: {
    alignItems: "center",
    gap: 6,
  },
  weekLabel: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
  },
  weekLabelActive: {
    color: COLORS.goldBright,
  },
  weekDot: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(86,179,148,0.45)",
    backgroundColor: "rgba(86,179,148,0.02)",
  },
  weekDotChecked: {
    backgroundColor: "rgba(86,179,148,0.28)",
    shadowColor: COLORS.emerald,
    shadowOpacity: 0.75,
    shadowRadius: 10,
  },
  weekDotToday: {
    borderColor: COLORS.goldBright,
  },
  pulsePanel: {
    marginTop: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.tealBorder,
    backgroundColor: "rgba(6,20,31,0.88)",
    padding: 16,
  },
  panelHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  tasksCount: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
  },
  pulseRows: {
    marginTop: 15,
    gap: 8,
  },
  pulseRow: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.12)",
    backgroundColor: "rgba(9, 37, 44, 0.52)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    gap: 10,
  },
  pulseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.28)",
    backgroundColor: "rgba(86,179,148,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  pulseCopy: {
    flex: 1,
    minWidth: 0,
  },
  pulseTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14.5,
  },
  pulseCompletedText: {
    color: COLORS.muted,
    textDecorationLine: "line-through",
  },
  pulseSubtitle: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    marginTop: 3,
  },
  pulseCheck: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: COLORS.goldBright,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseCheckDone: {
    backgroundColor: COLORS.goldBright,
  },
  viewAllButton: {
    minHeight: 44,
    marginTop: 6,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewAllText: {
    color: COLORS.emerald,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
  },
  familyPanel: {
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.tealBorder,
    backgroundColor: "rgba(6,20,31,0.9)",
    padding: 18,
  },
  familyHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  familyViewAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  familyMembersRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  familyMember: {
    width: 61,
    alignItems: "center",
  },
  familyAvatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    borderWidth: 1.5,
    backgroundColor: "rgba(86,179,148,0.11)",
    alignItems: "center",
    justifyContent: "center",
  },
  familyInitial: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 21,
  },
  familyOnlineDot: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: COLORS.emerald,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  addMemberCircle: {
    width: 55,
    height: 55,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(86,179,148,0.48)",
    alignItems: "center",
    justifyContent: "center",
  },
  familyName: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    marginTop: 8,
  },
  familyRole: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
});
