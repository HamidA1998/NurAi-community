import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { GoldDivider } from "@/components/premium/svg/PremiumSvgs";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { NuraiTrendChart } from "@/design-system";
import {
  buildMuslimHealthPlan,
  createDefaultMuslimHealthProfile,
  loadRecentMuslimHealthCompletion,
  loadMuslimHealthProfile,
  toggleMuslimHealthAction,
  type MuslimHealthAction,
  type MuslimHealthCompletionEvent,
  type MuslimHealthPlan,
  type MuslimHealthProfile,
} from "@/services/muslimHealthService";
import {
  buildNativeHealthScoreSnapshot,
  hasNativeHealthMetrics,
  type NativeHealthDailySummary,
} from "@/services/nativeHealthDataService";
import type { FoodScanResult } from "@/services/foodScanService";
import { AppIcon, type AppIconName } from "@/components/icons";

type FeatherName = AppIconName;

const DOMAIN_ICONS: Record<MuslimHealthAction["domain"], FeatherName> = {
  hydration: "droplet",
  sleep: "moon",
  movement: "activity",
  nutrition: "coffee",
  fasting: "sunrise",
  stress: "wind",
  medical: "shield",
};

const MUSLIM_HEALTH_JOURNAL_KEY = "nurai_muslim_health_journal_v1";
const HEALTH_HISTORY_DAYS = 7;
const DAILY_CALORIE_TARGET = 2200;
const DAILY_CARBS_TARGET = 260;
const DAILY_FAT_TARGET = 70;
const SCORE_RING_SIZE = 148;
const SCORE_RING_STROKE = 12;

type HealthBriefing = {
  title: string;
  body: string;
  action: string;
  icon: FeatherName;
  colorRole: "primary" | "scholar" | "warning" | "success";
};

type HealthDriver = {
  label: string;
  value: string;
  detail: string;
  progress: number;
  icon: FeatherName;
  color: string;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatMinutesAsSleep(minutes?: number): string {
  if (!minutes) return "--";
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatOptional(value?: number, suffix = ""): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)}${suffix}`
    : "--";
}

function formatClock(value?: string): string {
  if (!value) return "--";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "--";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatPercent(value?: number): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)}%`
    : "--";
}

function formatCompactNumber(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  if (Math.abs(value) >= 1000) return `${Math.round(value / 100) / 10}k`;
  return `${Math.round(value)}`;
}

function formatScoreValue(value: number | null): string {
  return value == null ? "--" : `${value}`;
}

function formatStagePercent(
  stageMinutes?: number,
  totalMinutes?: number,
): string {
  if (!stageMinutes || !totalMinutes) return "--";
  return `${Math.round((stageMinutes / totalMinutes) * 100)}%`;
}

function formatFetchedAt(value?: string): string {
  if (!value) return "Not read yet";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not read yet";
  return `Read ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function buildHealthBriefing({
  summary,
  hasProviderData,
  sleepDebtMinutes,
  waterCups,
  waterTargetCups,
  caloriesLeft,
  recoveryScore,
  strainScore,
}: {
  summary?: NativeHealthDailySummary | null;
  hasProviderData: boolean;
  sleepDebtMinutes: number;
  waterCups: number;
  waterTargetCups: number;
  caloriesLeft: number;
  recoveryScore: number | null;
  strainScore: number | null;
}): HealthBriefing {
  if (!summary?.fetchedAt || !hasProviderData) {
    return {
      title: "Bring your body data in",
      body: "Read Health once to fill this dashboard with steps, sleep, calories, heart, water, workouts, and recovery trends.",
      action: "Read Health",
      icon: "activity",
      colorRole: "primary",
    };
  }

  if (sleepDebtMinutes >= 90) {
    return {
      title: "Protect recovery tonight",
      body: `You are about ${formatMinutesAsSleep(sleepDebtMinutes)} short of a strong sleep target. Keep the evening lighter and start wind-down early.`,
      action: "Plan sleep",
      icon: "moon",
      colorRole: "scholar",
    };
  }

  if ((recoveryScore ?? 100) < 55 && (strainScore ?? 0) > 55) {
    return {
      title: "Make today a recovery day",
      body: "Your load is ahead of recovery. Choose gentle movement, hydration, and an easier evening instead of chasing more strain.",
      action: "Lower strain",
      icon: "shield",
      colorRole: "warning",
    };
  }

  if ((summary.steps ?? 0) < 3000 && new Date().getHours() < 19) {
    return {
      title: "Add one calm walk",
      body: "Steps are still low today. A short walk before or after salah can lift movement without turning health into pressure.",
      action: "Start walk",
      icon: "map",
      colorRole: "success",
    };
  }

  if (waterCups < Math.max(2, Math.round(waterTargetCups * 0.45))) {
    return {
      title: "Hydrate before the next task",
      body: "Water is behind your daily target. Take one glass now, then let the rest of the day build from that small win.",
      action: "Log water",
      icon: "droplet",
      colorRole: "primary",
    };
  }

  if (caloriesLeft <= 350) {
    return {
      title: "Keep the next meal simple",
      body: "Calories left are low for the day. Choose a lighter plate and let the meal scanner keep the estimate honest.",
      action: "Scan meal",
      icon: "camera",
      colorRole: "warning",
    };
  }

  return {
    title: "Your body is steady today",
    body: "Keep the rhythm simple: protect prayer, maintain hydration, add gentle movement, and leave room for recovery tonight.",
    action: "Keep rhythm",
    icon: "heart",
    colorRole: "success",
  };
}

export default function MuslimHealthScreen() {
  const navigation = useNavigation<any>();
  // Meal photo intelligence is hidden until a vision model backend is wired.
  const MEAL_SCANNER_ENABLED = false;
  const { theme, isDark } = useTheme();
  const [profile, setProfile] = useState<MuslimHealthProfile | null>(null);
  const [healthSummary, setHealthSummary] =
    useState<NativeHealthDailySummary | null>(null);
  const [healthHistory, setHealthHistory] = useState<
    NativeHealthDailySummary[]
  >([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [foodScanResult, setFoodScanResult] = useState<FoodScanResult | null>(
    null,
  );
  const [foodScanLoading, setFoodScanLoading] = useState(false);
  const [foodScanError, setFoodScanError] = useState<string | null>(null);
  const [journalNote, setJournalNote] = useState("");
  const [journalSavedAt, setJournalSavedAt] = useState<string | null>(null);
  const [healthCompletion, setHealthCompletion] =
    useState<MuslimHealthCompletionEvent | null>(null);

  useEffect(() => {
    let mounted = true;
    loadMuslimHealthProfile()
      .then((loaded) => {
        if (mounted) setProfile(loaded);
      })
      .catch(() => {
        if (mounted) setProfile(createDefaultMuslimHealthProfile());
      });
    loadRecentMuslimHealthCompletion()
      .then((event) => {
        if (mounted) setHealthCompletion(event);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(MUSLIM_HEALTH_JOURNAL_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw) as {
          note?: string;
          savedAt?: string;
        };
        setJournalNote(parsed.note || "");
        setJournalSavedAt(parsed.savedAt || null);
      })
      .catch(() => {
        // Journal is optional local context; failing to load it should not block Health.
      });
    return () => {
      mounted = false;
    };
  }, []);

  const plan = useMemo<MuslimHealthPlan | null>(
    () => (profile ? buildMuslimHealthPlan(profile) : null),
    [profile],
  );

  const toggleAction = useCallback(
    async (actionId: string) => {
      if (!profile) return;
      const wasComplete =
        profile.completedActionIds[actionId] ===
        buildMuslimHealthPlan(profile).dateKey;
      const next = await toggleMuslimHealthAction(actionId, profile);
      setProfile(next);
      setHealthCompletion(
        wasComplete ? null : await loadRecentMuslimHealthCompletion(),
      );
    },
    [profile],
  );

  const openRoute = useCallback(
    (route?: string) => {
      if (!route) return;
      navigation.navigate(route);
    },
    [navigation],
  );

  const refreshHealthData = useCallback(
    async (requestPermission = false, includeHistory = requestPermission) => {
      setHealthLoading(true);
      setHealthError(null);
      try {
        const {
          readNativeDailyHealthSummary,
          readNativeHealthHistory,
          requestNativeHealthPermissions,
          saveLastHealthSummary,
        } = await import("@/services/nativeHealthDataService");
        if (requestPermission) {
          await requestNativeHealthPermissions();
        }
        const summary = await readNativeDailyHealthSummary();
        setHealthSummary(summary);
        // Cache today's real numbers so the Home + personal AI can reference them.
        if (hasNativeHealthMetrics(summary)) {
          void saveLastHealthSummary(summary);
        }

        if (includeHistory || hasNativeHealthMetrics(summary)) {
          const history = await readNativeHealthHistory(HEALTH_HISTORY_DAYS);
          setHealthHistory(history);
        }

        if (summary.status === "denied") {
          setHealthError(
            "Health permission is not granted yet. Allow access, then refresh.",
          );
        } else if (summary.status === "unavailable") {
          setHealthError("Health data is unavailable on this device or build.");
        }
      } catch (error) {
        setHealthError(
          error instanceof Error
            ? error.message
            : "Could not read health data right now.",
        );
      } finally {
        setHealthLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    refreshHealthData(false, false);
  }, [refreshHealthData]);

  const scanMeal = useCallback(async (source: "camera" | "library") => {
    setFoodScanLoading(true);
    setFoodScanError(null);
    try {
      const { scanMealFromLibrary, scanMealWithCamera } = await import(
        "@/services/foodScanService"
      );
      const result =
        source === "camera"
          ? await scanMealWithCamera()
          : await scanMealFromLibrary();
      if (result) setFoodScanResult(result);
    } catch (error) {
      setFoodScanError(
        error instanceof Error
          ? error.message
          : "Could not scan this meal right now.",
      );
    } finally {
      setFoodScanLoading(false);
    }
  }, []);

  const saveJournal = useCallback(async () => {
    const savedAt = new Date().toISOString();
    await AsyncStorage.setItem(
      MUSLIM_HEALTH_JOURNAL_KEY,
      JSON.stringify({ note: journalNote.trim(), savedAt }),
    );
    setJournalSavedAt(savedAt);
  }, [journalNote]);

  const completedIds = profile?.completedActionIds || {};
  const dateKey = plan?.dateKey || "";
  const focusAction =
    plan?.actions.find((action) => completedIds[action.id] !== dateKey) ||
    plan?.actions[0] ||
    null;
  const planProgress = plan?.progress || 0;
  const healthScores = useMemo(
    () => buildNativeHealthScoreSnapshot(healthSummary, planProgress),
    [healthSummary, planProgress],
  );
  const historyScores = useMemo(
    () =>
      healthHistory.map((summary) =>
        buildNativeHealthScoreSnapshot(summary, planProgress),
      ),
    [healthHistory, planProgress],
  );
  const hasProviderData = hasNativeHealthMetrics(healthSummary);
  const sleepMinutes = healthSummary?.sleepMinutes || 0;
  const sleepScore = healthScores.sleepScore;
  const strainScore = healthScores.strainScore;
  const recoveryScore = healthScores.recoveryScore;
  const stressScore = healthScores.stressBalanceScore;
  const energyScore = healthScores.energyScore;
  const score = healthScores.readinessScore ?? planProgress;
  const consumedCalories = foodScanResult?.caloriesKcal.midpoint || 0;
  const caloriesLeft = Math.max(0, DAILY_CALORIE_TARGET - consumedCalories);
  const carbsConsumed = foodScanResult?.macros?.carbsG || 0;
  const fatConsumed = foodScanResult?.macros?.fatG || 0;
  const carbsLeft = Math.max(0, DAILY_CARBS_TARGET - carbsConsumed);
  const fatLeft = Math.max(0, DAILY_FAT_TARGET - fatConsumed);
  const manualWaterCups =
    completedIds["water-before-prayer"] === dateKey ? 1 : 0;
  const healthWaterCups = healthSummary?.dietaryWaterMl
    ? Math.round(healthSummary.dietaryWaterMl / 240)
    : 0;
  const waterDone = Math.max(manualWaterCups, healthWaterCups);
  const waterTargetCups = profile?.hydrationTargetCups || 6;
  const waterValue = healthSummary?.dietaryWaterMl
    ? `${Math.round(healthSummary.dietaryWaterMl)}`
    : `${waterDone}/${waterTargetCups}`;
  const waterSuffix = healthSummary?.dietaryWaterMl ? "ml" : undefined;
  const sleepDebtMinutes = sleepMinutes
    ? Math.max(0, Math.round(7.5 * 60 - sleepMinutes))
    : 0;
  const readinessTrend = historyScores.map(
    (snapshot) => snapshot.readinessScore ?? 0,
  );
  const strainTrend = historyScores.map(
    (snapshot) => snapshot.strainScore ?? 0,
  );
  const stepsTrend = healthHistory.map((summary) => summary.steps || 0);
  const sleepTrend = healthHistory.map((summary) => summary.sleepMinutes || 0);
  const caloriesTrend = healthHistory.map(
    (summary) => summary.activeCaloriesKcal || 0,
  );
  const heartTrend = healthHistory.map(
    (summary) => summary.averageHeartRateBpm || 0,
  );
  const waterTrend = healthHistory.map(
    (summary) => summary.dietaryWaterMl || 0,
  );
  const workoutTrend = healthHistory.map(
    (summary) => summary.workoutMinutes || 0,
  );
  const healthStatusLabel = hasProviderData
    ? "Synced"
    : healthSummary?.status === "denied"
      ? "Needs access"
      : healthSummary?.status === "unavailable"
        ? "Unavailable"
        : healthSummary?.fetchedAt
          ? "Ready"
          : healthScores.statusLabel;
  const syncSummary = healthScores.syncSummary;
  const healthBriefing = useMemo(
    () =>
      buildHealthBriefing({
        summary: healthSummary,
        hasProviderData,
        sleepDebtMinutes,
        waterCups: waterDone,
        waterTargetCups,
        caloriesLeft,
        recoveryScore,
        strainScore,
      }),
    [
      caloriesLeft,
      hasProviderData,
      healthSummary,
      recoveryScore,
      sleepDebtMinutes,
      strainScore,
      waterDone,
      waterTargetCups,
    ],
  );
  const healthBriefingColor =
    healthBriefing.colorRole === "scholar"
      ? theme.scholar
      : healthBriefing.colorRole === "warning"
        ? theme.warning
        : healthBriefing.colorRole === "success"
          ? theme.success
          : theme.primary;
  const heroContributors = [
    {
      label: "Steps",
      value: formatCompactNumber(healthSummary?.steps),
      icon: "activity" as const,
      color: theme.primary,
    },
    {
      label: "Sleep",
      value: formatMinutesAsSleep(sleepMinutes),
      icon: "moon" as const,
      color: theme.scholar,
    },
    {
      label: "Calories",
      value: formatOptional(healthSummary?.activeCaloriesKcal),
      icon: "zap" as const,
      color: theme.warning,
    },
    {
      label: "Heart",
      value: formatOptional(healthSummary?.averageHeartRateBpm),
      icon: "heart" as const,
      color: theme.error,
    },
    {
      label: "Water",
      value: waterValue,
      icon: "droplet" as const,
      color: theme.primary,
    },
  ];
  const vitalsCollected = [
    healthSummary?.averageHeartRateBpm,
    healthSummary?.restingHeartRateBpm,
    healthSummary?.heartRateVariabilityMs,
    healthSummary?.oxygenSaturationPercent,
    healthSummary?.respiratoryRate,
    healthSummary?.bodyTemperatureC,
    healthSummary?.bloodGlucoseMgDl,
  ].filter((value) => typeof value === "number" && value > 0).length;
  const caloriesConsumedPercent = clampScore(
    (consumedCalories / DAILY_CALORIE_TARGET) * 100,
  );
  const healthDrivers: HealthDriver[] = [
    {
      label: "Recovery",
      value: formatScoreValue(recoveryScore),
      detail:
        recoveryScore == null
          ? "Needs sleep or heart samples"
          : "Sleep, HRV, resting HR, care rhythm",
      progress: recoveryScore ?? 0,
      icon: "shield",
      color: theme.primary,
    },
    {
      label: "Strain",
      value: formatScoreValue(strainScore),
      detail:
        strainScore == null
          ? "Needs steps, energy, or workout data"
          : "Steps, active energy, workout load",
      progress: strainScore ?? 0,
      icon: "activity",
      color: theme.warning,
    },
    {
      label: "Sleep debt",
      value: sleepMinutes ? formatMinutesAsSleep(sleepDebtMinutes) : "--",
      detail: sleepMinutes ? "Against a 7h 30m target" : "Needs sleep samples",
      progress: sleepMinutes
        ? clampScore(100 - (sleepDebtMinutes / 180) * 100)
        : 0,
      icon: "moon",
      color: theme.scholar,
    },
    {
      label: "Hydration",
      value: healthSummary?.dietaryWaterMl
        ? `${Math.round(healthSummary.dietaryWaterMl)} ml`
        : `${waterDone}/${waterTargetCups}`,
      detail: healthSummary?.dietaryWaterMl
        ? "From water logs"
        : "Manual water habit",
      progress: healthSummary?.dietaryWaterMl
        ? clampScore((healthSummary.dietaryWaterMl / 2000) * 100)
        : clampScore((waterDone / Math.max(1, waterTargetCups)) * 100),
      icon: "droplet",
      color: theme.primary,
    },
    {
      label: "Fuel",
      value: `${Math.round(caloriesLeft)} kcal`,
      detail: foodScanResult ? "From scanned meals" : "Scan a meal to refine",
      progress: caloriesConsumedPercent,
      icon: "coffee",
      color: theme.success,
    },
    {
      label: "Vitals",
      value: `${vitalsCollected}/7`,
      detail: "HR, HRV, SpO2, temp, RR, glucose",
      progress: clampScore((vitalsCollected / 7) * 100),
      icon: "heart",
      color: theme.error,
    },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.backgroundRoot }]}
    >
      <LinearGradient
        colors={[
          isDark ? "#030711" : "#F7FBFA",
          isDark ? "#061321" : "#FFFFFF",
          isDark ? "#050712" : "#ECFDF5",
        ]}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={healthLoading}
            onRefresh={() => refreshHealthData(false, true)}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[
              styles.iconButton,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <AppIcon name="arrow-left" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText style={[styles.eyebrow, { color: theme.scholar }]}>
              BODY AMANAH
            </ThemedText>
            <ThemedText style={[styles.title, { color: theme.text }]}>
              Health Companion
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textMuted }]}>
              Sleep, strain, food, heart, and recovery in one clear view.
            </ThemedText>
          </View>
        </View>

        <LinearGradient
          colors={[
            isDark ? "rgba(86,179,148,0.19)" : "rgba(16,185,129,0.16)",
            isDark ? "rgba(228,166,58,0.08)" : "rgba(255,255,255,0.9)",
            isDark ? "rgba(7,18,31,0.98)" : "rgba(255,255,255,0.86)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.amanahHero, { borderColor: theme.border }]}
          accessible
          accessibilityRole="summary"
          accessibilityLabel="Health Dashboard summary"
          accessibilityValue={{
            text: `${healthStatusLabel}. Amanah score ${score} out of 100. Data coverage ${healthScores.dataCoveragePercent} percent. ${syncSummary}`,
          }}
        >
          <View style={styles.amanahHeroTop}>
            <View style={styles.heroTitleBlock}>
              <ThemedText style={[styles.eyebrow, { color: theme.primary }]}>
                TODAY'S BODY SNAPSHOT
              </ThemedText>
              <ThemedText
                style={[styles.amanahHeroTitle, { color: theme.text }]}
              >
                Health Dashboard
              </ThemedText>
              <ThemedText
                style={[styles.amanahHeroBody, { color: theme.textSecondary }]}
              >
                {hasProviderData
                  ? "Recovery, strain, sleep, calories, heart, water, workouts, and care habits in one calm view."
                  : healthSummary?.fetchedAt
                    ? "Health read is ready. Today's steps, sleep, calories, heart, water, workouts, and recovery appear as samples arrive."
                    : "Read health data to bring in steps, sleep, calories, heart, water, workouts, and recovery."}
              </ThemedText>
            </View>
            <View
              style={[
                styles.heroStatusPill,
                {
                  backgroundColor: theme.scholarSoft,
                  borderColor: theme.border,
                },
              ]}
            >
              <AppIcon name="activity" size={12} color={theme.scholar} />
              <ThemedText
                style={[styles.heroStatusText, { color: theme.scholar }]}
              >
                {healthStatusLabel}
              </ThemedText>
            </View>
          </View>

          <View style={styles.heroScoreDeck}>
            <ScoreRing
              score={score}
              color={theme.primary}
              secondaryColor={theme.scholar}
              trackColor={theme.border}
              textColor={theme.text}
              mutedColor={theme.textMuted}
            />
            <View
              style={styles.heroInsightPanel}
              testID="muslim-health-data-quality"
            >
              <View style={styles.heroInsightTop}>
                <ThemedText
                  style={[styles.heroInsightLabel, { color: theme.primary }]}
                >
                  DATA COVERAGE
                </ThemedText>
                <ThemedText
                  style={[styles.heroInsightValue, { color: theme.text }]}
                >
                  {healthScores.dataCoveragePercent}%
                </ThemedText>
              </View>
              <ThemedText
                style={[styles.heroInsightBody, { color: theme.textSecondary }]}
              >
                {hasProviderData
                  ? syncSummary
                  : "No samples yet. Refresh after movement, sleep, a workout or water."}
              </ThemedText>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: theme.border },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${healthScores.dataCoveragePercent}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>
              <ThemedText
                style={[styles.progressText, { color: theme.textMuted }]}
                numberOfLines={1}
              >
                {formatFetchedAt(healthSummary?.fetchedAt)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.heroContributorGrid}>
            {heroContributors.map((item) => (
              <ContributorChip
                key={item.label}
                label={item.label}
                value={item.value}
                icon={item.icon}
                color={item.color}
              />
            ))}
          </View>
        </LinearGradient>

        <Pressable
          onPress={() => {
            const contextLine =
              [
                healthSummary?.steps
                  ? `Steps ${formatCompactNumber(healthSummary.steps)}`
                  : null,
                sleepMinutes
                  ? `Sleep ${formatMinutesAsSleep(sleepMinutes)}`
                  : null,
                recoveryScore != null ? `Recovery ${recoveryScore}%` : null,
                strainScore != null ? `Strain ${strainScore}%` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Body signals still syncing";
            navigation.navigate("PersonalGuide", {
              visiblePrompt:
                "How is my body doing today, and what is one small step that supports my worship and energy?",
              contextLine,
            });
          }}
          accessibilityRole="button"
          accessibilityLabel="Ask NurAI about your body"
          style={({ pressed }) => [
            styles.healthBriefingCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: `${healthBriefingColor}42`,
            },
            pressed && { opacity: 0.85 },
          ]}
          testID="muslim-health-smart-briefing"
        >
          <View
            style={[
              styles.healthBriefingIcon,
              { backgroundColor: `${healthBriefingColor}18` },
            ]}
          >
            <AppIcon
              name={healthBriefing.icon}
              size={20}
              color={healthBriefingColor}
            />
          </View>
          <View style={styles.healthBriefingCopy}>
            <ThemedText
              style={[
                styles.healthBriefingEyebrow,
                { color: healthBriefingColor },
              ]}
            >
              TODAY'S GUIDANCE
            </ThemedText>
            <ThemedText
              style={[styles.healthBriefingTitle, { color: theme.text }]}
              numberOfLines={2}
            >
              {healthBriefing.title}
            </ThemedText>
            <ThemedText
              style={[
                styles.healthBriefingBody,
                { color: theme.textSecondary },
              ]}
              numberOfLines={3}
            >
              {healthBriefing.body}
            </ThemedText>
          </View>
          <View
            style={[
              styles.healthBriefingAction,
              {
                backgroundColor: `${healthBriefingColor}14`,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              },
            ]}
          >
            <AppIcon
              name="message-circle"
              size={12}
              color={healthBriefingColor}
            />
            <ThemedText
              style={[
                styles.healthBriefingActionText,
                { color: healthBriefingColor },
              ]}
              numberOfLines={1}
            >
              Ask NurAI
            </ThemedText>
          </View>
        </Pressable>

        <View style={styles.scoreGrid}>
          <ScoreCard
            label="Recovery"
            value={recoveryScore}
            color={theme.primary}
            icon="shield"
            caption={recoveryScore == null ? "Sync for score" : "Body ready"}
          />
          <ScoreCard
            label="Strain"
            value={strainScore}
            color={theme.warning}
            icon="activity"
            caption={strainScore == null ? "No load yet" : "Daily load"}
          />
          <ScoreCard
            label="Sleep"
            value={sleepScore}
            color={theme.scholar}
            icon="moon"
            caption={
              sleepMinutes ? formatMinutesAsSleep(sleepMinutes) : "No sleep yet"
            }
          />
          <ScoreCard
            label="Stress"
            value={stressScore}
            color={theme.primary}
            icon="wind"
            caption={stressScore == null ? "Needs HR" : "Today"}
          />
          <ScoreCard
            label="Energy"
            value={energyScore}
            color={theme.success}
            icon="zap"
            caption={energyScore == null ? "Calculating" : "Fuel balance"}
          />
        </View>

        <View
          style={[
            styles.driverCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.border,
            },
          ]}
          testID="muslim-health-driver-card"
        >
          <View style={styles.panelHeader}>
            <View>
              <ThemedText
                style={[styles.nativeHealthEyebrow, { color: theme.primary }]}
              >
                BODY BATTERY DRIVERS
              </ThemedText>
              <ThemedText
                style={[styles.nativeHealthTitle, { color: theme.text }]}
              >
                Why today feels this way
              </ThemedText>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: theme.primaryMuted,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText style={[styles.statusText, { color: theme.primary }]}>
                {healthDrivers.filter((driver) => driver.progress > 0).length}/
                {healthDrivers.length}
              </ThemedText>
            </View>
          </View>
          <View style={styles.driverGrid}>
            {healthDrivers.map((driver) => (
              <DriverRow key={driver.label} driver={driver} />
            ))}
          </View>
        </View>

        <View
          style={[
            styles.chartCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.panelHeader}>
            <View>
              <ThemedText
                style={[styles.nativeHealthEyebrow, { color: theme.primary }]}
              >
                HEALTH MONITOR
              </ThemedText>
              <ThemedText
                style={[styles.nativeHealthTitle, { color: theme.text }]}
              >
                Seven-day health trends
              </ThemedText>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: theme.primaryMuted,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText style={[styles.statusText, { color: theme.primary }]}>
                7 days
              </ThemedText>
            </View>
          </View>
          <View style={styles.trendsGrid}>
            {[
              {
                label: "Readiness",
                data: readinessTrend,
                color: theme.primary,
                unit: "",
              },
              {
                label: "Strain",
                data: strainTrend,
                color: theme.warning,
                unit: "",
              },
              {
                label: "Steps",
                data: stepsTrend,
                color: theme.success,
                unit: "",
              },
              {
                label: "Sleep",
                data: sleepTrend.map((m) => Math.round((m / 60) * 10) / 10),
                color: theme.scholar,
                unit: "h",
              },
            ].map((t) => (
              <View
                key={t.label}
                style={[styles.trendCard, { borderColor: theme.borderSubtle }]}
              >
                <ThemedText
                  style={[styles.trendLabel, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {t.label}
                </ThemedText>
                <NuraiTrendChart
                  data={t.data}
                  accent={t.color}
                  unit={t.unit}
                  height={58}
                />
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.nativeHealthCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.border,
            },
          ]}
          testID="muslim-health-native-summary"
        >
          <View style={styles.panelHeader}>
            <View style={styles.nativeHealthCopy}>
              <ThemedText
                style={[styles.nativeHealthEyebrow, { color: theme.primary }]}
              >
                LIVE HEALTH SIGNALS
              </ThemedText>
              <ThemedText
                style={[styles.nativeHealthTitle, { color: theme.text }]}
              >
                Steps, sleep, calories, heart, water
              </ThemedText>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: theme.primaryMuted,
                  borderColor: theme.border,
                },
              ]}
            >
              <AppIcon name="activity" size={12} color={theme.primary} />
              <ThemedText style={[styles.statusText, { color: theme.primary }]}>
                {healthStatusLabel}
              </ThemedText>
            </View>
          </View>

          <View style={styles.healthMetricGrid}>
            <MetricTile
              icon="activity"
              label="Steps"
              value={healthSummary?.steps?.toLocaleString() || "--"}
              color={theme.primary}
              helper="Daily movement"
              trendValues={stepsTrend}
              trendMax={Math.max(10000, ...stepsTrend)}
            />
            <MetricTile
              icon="moon"
              label="Sleep"
              value={formatMinutesAsSleep(sleepMinutes)}
              color={theme.scholar}
              helper="Actual time asleep"
              trendValues={sleepTrend}
              trendMax={Math.max(450, ...sleepTrend)}
            />
            <MetricTile
              icon="zap"
              label="Active kcal"
              value={formatOptional(healthSummary?.activeCaloriesKcal)}
              color={theme.warning}
              suffix="kcal"
              helper={
                healthSummary?.totalCaloriesKcal
                  ? `${healthSummary.totalCaloriesKcal} total kcal`
                  : "Movement energy"
              }
              trendValues={caloriesTrend}
              trendMax={Math.max(650, ...caloriesTrend)}
            />
            <MetricTile
              icon="heart"
              label="Heart"
              value={formatOptional(healthSummary?.averageHeartRateBpm)}
              color={theme.error}
              suffix="bpm"
              helper={
                healthSummary?.restingHeartRateBpm
                  ? `${healthSummary.restingHeartRateBpm} resting`
                  : "Average today"
              }
              trendValues={heartTrend}
              trendMax={Math.max(120, ...heartTrend)}
            />
            <MetricTile
              icon="droplet"
              label="Water"
              value={waterValue}
              color={theme.primary}
              suffix={waterSuffix}
              helper={
                healthSummary?.dietaryWaterMl
                  ? "From water logs"
                  : "Manual care action"
              }
              trendValues={waterTrend}
              trendMax={Math.max(2000, ...waterTrend)}
            />
            <MetricTile
              icon="clock"
              label="Workouts"
              value={formatOptional(healthSummary?.workoutMinutes)}
              color={theme.success}
              suffix="min"
              helper={
                healthSummary?.workoutCount
                  ? `${healthSummary.workoutCount} sessions`
                  : "No workout logged"
              }
              trendValues={workoutTrend}
              trendMax={Math.max(60, ...workoutTrend)}
            />
          </View>

          {healthError ? (
            <ThemedText
              style={[styles.inlineError, { color: theme.warning }]}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {healthError}
            </ThemedText>
          ) : null}

          <View style={styles.actionButtons}>
            <Pressable
              onPress={() => refreshHealthData(true, true)}
              disabled={healthLoading}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                  opacity: healthLoading ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sync health data"
              testID="button-connect-native-health"
            >
              <AppIcon
                name="unlock"
                size={17}
                color={theme.primaryForeground}
              />
              <ThemedText
                style={[
                  styles.primaryButtonText,
                  { color: theme.primaryForeground },
                ]}
              >
                {healthLoading ? "Reading" : "Read Health"}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => refreshHealthData(false, true)}
              disabled={healthLoading}
              style={[styles.secondaryButton, { borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel="Refresh health data"
            >
              <AppIcon name="refresh-cw" size={16} color={theme.text} />
              <ThemedText
                style={[styles.secondaryButtonText, { color: theme.text }]}
              >
                Refresh
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.sleepCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.panelHeader}>
            <View>
              <ThemedText
                style={[styles.nativeHealthEyebrow, { color: theme.scholar }]}
              >
                SLEEP
              </ThemedText>
              <ThemedText
                style={[styles.nativeHealthTitle, { color: theme.text }]}
              >
                Sleep score and rhythm
              </ThemedText>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: theme.scholarSoft,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText style={[styles.statusText, { color: theme.scholar }]}>
                {sleepScore == null ? "Sync" : `${sleepScore}%`}
              </ThemedText>
            </View>
          </View>
          <View style={styles.sleepGrid}>
            <InsightCell
              label="Time asleep"
              value={formatMinutesAsSleep(sleepMinutes)}
              helper="Actual sleep"
            />
            <InsightCell
              label="Sleep debt"
              value={
                sleepMinutes ? formatMinutesAsSleep(sleepDebtMinutes) : "--"
              }
              helper="Target 7h 30m"
            />
            <InsightCell
              label="Efficiency"
              value={formatPercent(healthSummary?.sleepEfficiencyPercent)}
              helper="Time asleep / in bed"
            />
            <InsightCell
              label="Interruptions"
              value={formatOptional(healthSummary?.sleepInterruptions)}
              helper="Sleep-stage signal"
            />
            <InsightCell
              label="Bed time"
              value={formatClock(healthSummary?.sleepStartTime)}
              helper="Evening rhythm"
            />
            <InsightCell
              label="Wake time"
              value={formatClock(healthSummary?.sleepEndTime)}
              helper="Morning routine"
            />
          </View>
          <View style={styles.sleepStageRow}>
            <StagePill
              label="Deep"
              value={formatStagePercent(
                healthSummary?.deepSleepMinutes,
                sleepMinutes,
              )}
              color={theme.primary}
            />
            <StagePill
              label="Light"
              value={formatStagePercent(
                healthSummary?.lightSleepMinutes,
                sleepMinutes,
              )}
              color={theme.scholar}
            />
            <StagePill
              label="REM"
              value={formatStagePercent(
                healthSummary?.remSleepMinutes,
                sleepMinutes,
              )}
              color={theme.success}
            />
            <StagePill
              label="Awake"
              value={formatStagePercent(
                healthSummary?.awakeSleepMinutes,
                sleepMinutes,
              )}
              color={theme.warning}
            />
          </View>
        </View>

        <View
          style={[
            styles.nutritionCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.panelHeader}>
            <View>
              <ThemedText
                style={[styles.nativeHealthEyebrow, { color: theme.warning }]}
              >
                NUTRITION
              </ThemedText>
              <ThemedText
                style={[styles.nativeHealthTitle, { color: theme.text }]}
              >
                Calories and macros
              </ThemedText>
            </View>
            <AppIcon name="camera" size={20} color={theme.warning} />
          </View>
          <MacroProgress
            label="Calories left"
            value={caloriesLeft}
            target={DAILY_CALORIE_TARGET}
            suffix="kcal"
            color={theme.warning}
          />
          <MacroProgress
            label="Carbs left"
            value={carbsLeft}
            target={DAILY_CARBS_TARGET}
            suffix="g"
            color={theme.primary}
          />
          <MacroProgress
            label="Fat left"
            value={fatLeft}
            target={DAILY_FAT_TARGET}
            suffix="g"
            color={theme.scholar}
          />
        </View>

        <View style={styles.doublePanelGrid}>
          <View
            style={[
              styles.compactPanel,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText
              style={[styles.nativeHealthEyebrow, { color: theme.primary }]}
            >
              VITALS
            </ThemedText>
            <VitalRow
              label="HR"
              value={formatOptional(healthSummary?.averageHeartRateBpm, " bpm")}
            />
            <VitalRow
              label="HRV"
              value={formatOptional(
                healthSummary?.heartRateVariabilityMs,
                " ms",
              )}
            />
            <VitalRow
              label="SpO2"
              value={formatOptional(
                healthSummary?.oxygenSaturationPercent,
                "%",
              )}
            />
            <VitalRow
              label="Temp"
              value={formatOptional(healthSummary?.bodyTemperatureC, "C")}
            />
            <VitalRow
              label="RR"
              value={formatOptional(healthSummary?.respiratoryRate, "/min")}
            />
            <VitalRow
              label="Glucose"
              value={formatOptional(healthSummary?.bloodGlucoseMgDl, " mg/dL")}
            />
          </View>
          <View
            style={[
              styles.compactPanel,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText
              style={[styles.nativeHealthEyebrow, { color: theme.scholar }]}
            >
              ACTIVITY
            </ThemedText>
            <VitalRow
              label="Cardio load"
              value={strainScore == null ? "--" : `${strainScore}%`}
            />
            <VitalRow
              label="Workouts"
              value={formatOptional(healthSummary?.workoutCount)}
            />
            <VitalRow
              label="Cardio focus"
              value={healthSummary?.workoutMinutes ? "Base" : "--"}
            />
            <VitalRow
              label="Active energy"
              value={formatOptional(healthSummary?.activeCaloriesKcal, " kcal")}
            />
            <VitalRow
              label="Workout min"
              value={formatOptional(healthSummary?.workoutMinutes, "m")}
            />
            <VitalRow
              label="RHR"
              value={formatOptional(healthSummary?.restingHeartRateBpm, " bpm")}
            />
          </View>
        </View>

        {healthSummary?.workouts?.length ? (
          <View
            style={[
              styles.workoutCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.border,
              },
            ]}
            testID="muslim-health-workout-summary"
          >
            <View style={styles.panelHeader}>
              <View>
                <ThemedText
                  style={[styles.nativeHealthEyebrow, { color: theme.success }]}
                >
                  FITNESS ACTIVITY
                </ThemedText>
                <ThemedText
                  style={[styles.nativeHealthTitle, { color: theme.text }]}
                >
                  Recent movement sessions
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: theme.primaryMuted,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[styles.statusText, { color: theme.primary }]}
                >
                  {healthSummary.workouts.length}
                </ThemedText>
              </View>
            </View>
            {healthSummary.workouts.slice(0, 4).map((workout) => (
              <WorkoutRow
                key={workout.id}
                title={workout.activityType || "Workout"}
                minutes={workout.durationMinutes}
                calories={workout.activeCaloriesKcal}
                startTime={workout.startTime}
              />
            ))}
          </View>
        ) : null}

        <View
          style={[
            styles.journalCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.panelHeader}>
            <View>
              <ThemedText
                style={[styles.nativeHealthEyebrow, { color: theme.primary }]}
              >
                JOURNAL
              </ThemedText>
              <ThemedText
                style={[styles.nativeHealthTitle, { color: theme.text }]}
              >
                Body and deen note
              </ThemedText>
            </View>
            {journalSavedAt ? (
              <ThemedText style={[styles.statusText, { color: theme.primary }]}>
                Saved
              </ThemedText>
            ) : null}
          </View>
          <TextInput
            value={journalNote}
            onChangeText={setJournalNote}
            placeholder="Energy, sleep, food, stress, symptoms, training..."
            placeholderTextColor={theme.textMuted}
            multiline
            textAlignVertical="top"
            style={[
              styles.journalInput,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
              },
            ]}
            accessibilityLabel="Health journal note"
          />
          <Pressable
            onPress={saveJournal}
            style={[
              styles.primaryButton,
              {
                alignSelf: "flex-start",
                backgroundColor: theme.primary,
                borderColor: theme.primary,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save health journal note"
          >
            <AppIcon name="save" size={16} color={theme.primaryForeground} />
            <ThemedText
              style={[
                styles.primaryButtonText,
                { color: theme.primaryForeground },
              ]}
            >
              Save journal
            </ThemedText>
          </Pressable>
        </View>

        {MEAL_SCANNER_ENABLED ? (
          <View
            style={[
              styles.foodScanCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.border,
              },
            ]}
            testID="muslim-health-food-scan"
          >
            <View style={styles.nativeHealthTop}>
              <View style={styles.nativeHealthCopy}>
                <ThemedText
                  style={[styles.nativeHealthEyebrow, { color: theme.scholar }]}
                >
                  MEAL SCANNER
                </ThemedText>
                <ThemedText
                  style={[styles.nativeHealthTitle, { color: theme.text }]}
                >
                  Scan food for calories and ingredients
                </ThemedText>
                <ThemedText
                  style={[
                    styles.nativeHealthBody,
                    { color: theme.textSecondary },
                  ]}
                >
                  Estimate dish, visible ingredients, calories, macros, and
                  halal uncertainty from one photo.
                </ThemedText>
              </View>
              <View
                style={[
                  styles.nativeHealthIcon,
                  { backgroundColor: theme.scholarSoft },
                ]}
              >
                <AppIcon name="camera" size={22} color={theme.scholar} />
              </View>
            </View>

            {foodScanResult ? (
              <View
                style={[
                  styles.foodResultBox,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.providerTitleRow}>
                  <ThemedText
                    style={[styles.foodResultTitle, { color: theme.text }]}
                  >
                    {foodScanResult.dishName}
                  </ThemedText>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: theme.scholarSoft,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.statusText, { color: theme.scholar }]}
                    >
                      {foodScanResult.confidence} confidence
                    </ThemedText>
                  </View>
                </View>
                <ThemedText
                  style={[styles.foodCalories, { color: theme.primary }]}
                >
                  {foodScanResult.caloriesKcal.min}-
                  {foodScanResult.caloriesKcal.max} kcal estimate
                </ThemedText>
                <ThemedText
                  style={[styles.providerSummary, { color: theme.textMuted }]}
                >
                  Ingredients:{" "}
                  {foodScanResult.ingredients
                    .slice(0, 6)
                    .map((ingredient) => ingredient.name)
                    .join(", ")}
                </ThemedText>
                {foodScanResult.halalNotes[0] ? (
                  <ThemedText
                    style={[
                      styles.providerNote,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {foodScanResult.halalNotes[0]}
                  </ThemedText>
                ) : null}
                <ThemedText
                  style={[styles.providerNote, { color: theme.textSecondary }]}
                >
                  {foodScanResult.safetyNote}
                </ThemedText>
              </View>
            ) : null}

            {foodScanError ? (
              <ThemedText
                style={[styles.inlineError, { color: theme.warning }]}
              >
                {foodScanError}
              </ThemedText>
            ) : null}

            <View style={styles.actionButtons}>
              <Pressable
                onPress={() => scanMeal("camera")}
                disabled={foodScanLoading}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                    opacity: foodScanLoading ? 0.7 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Scan meal with camera"
                testID="button-scan-meal-camera"
              >
                <AppIcon
                  name="camera"
                  size={17}
                  color={theme.primaryForeground}
                />
                <ThemedText
                  style={[
                    styles.primaryButtonText,
                    { color: theme.primaryForeground },
                  ]}
                >
                  {foodScanLoading ? "Scanning" : "Scan meal"}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => scanMeal("library")}
                disabled={foodScanLoading}
                style={[styles.secondaryButton, { borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel="Choose meal photo"
              >
                <AppIcon name="image" size={16} color={theme.text} />
                <ThemedText
                  style={[styles.secondaryButtonText, { color: theme.text }]}
                >
                  Choose photo
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {healthCompletion ? (
          <View
            style={[
              styles.completionCard,
              {
                backgroundColor: theme.primaryMuted,
                borderColor: `${theme.primary}66`,
              },
            ]}
            accessibilityRole="summary"
            accessibilityLabel={`${healthCompletion.messageTitle}. ${healthCompletion.messageBody}`}
          >
            <View
              style={[
                styles.completionIcon,
                { backgroundColor: `${theme.primary}20` },
              ]}
            >
              <AppIcon name="check-circle" size={23} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText
                style={[styles.completionTitle, { color: theme.text }]}
              >
                {healthCompletion.messageTitle}
              </ThemedText>
              <ThemedText
                style={[styles.completionBody, { color: theme.textSecondary }]}
              >
                {healthCompletion.messageBody}
              </ThemedText>
              {healthCompletion.sourceAnchor ? (
                <ThemedText
                  style={[styles.completionSource, { color: theme.scholar }]}
                >
                  {healthCompletion.sourceAnchor}
                </ThemedText>
              ) : null}
            </View>
          </View>
        ) : null}

        {(focusAction ? [focusAction] : []).map((action) => {
          const done = completedIds[action.id] === dateKey;
          return (
            <View
              key={action.id}
              style={[
                styles.actionCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: done ? theme.primary : theme.border,
                },
              ]}
              testID={`muslim-health-action-${action.id}`}
            >
              <View style={styles.focusHeader}>
                <ThemedText
                  style={[styles.nativeHealthEyebrow, { color: theme.primary }]}
                >
                  TODAY'S FOCUS
                </ThemedText>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: done
                        ? theme.primaryMuted
                        : theme.scholarSoft,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.statusText,
                      { color: done ? theme.primary : theme.scholar },
                    ]}
                  >
                    {done ? "Done" : "Next"}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.actionTop}>
                <View
                  style={[
                    styles.actionIcon,
                    {
                      backgroundColor: done
                        ? theme.primaryMuted
                        : theme.surfaceGlass,
                    },
                  ]}
                >
                  <AppIcon
                    name={DOMAIN_ICONS[action.domain]}
                    size={22}
                    color={done ? theme.primary : theme.textMuted}
                  />
                </View>
                <View style={styles.actionCopy}>
                  <ThemedText
                    style={[styles.actionTitle, { color: theme.text }]}
                  >
                    {action.title}
                  </ThemedText>
                  <ThemedText
                    style={[styles.actionBody, { color: theme.textSecondary }]}
                  >
                    {action.body}
                  </ThemedText>
                </View>
              </View>
              <View
                style={[
                  styles.frameBox,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.border,
                  },
                ]}
              >
                <AppIcon name="book-open" size={15} color={theme.scholar} />
                <ThemedText
                  style={[styles.frameText, { color: theme.textSecondary }]}
                >
                  {action.islamicFrame}
                </ThemedText>
              </View>
              {action.safetyNote ? (
                <ThemedText
                  style={[styles.safetyText, { color: theme.warning }]}
                >
                  {action.safetyNote}
                </ThemedText>
              ) : null}
              <View style={styles.actionButtons}>
                <Pressable
                  onPress={() => toggleAction(action.id)}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: done
                        ? theme.surfaceGlass
                        : theme.primary,
                      borderColor: done ? theme.primary : theme.primary,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${done ? "Undo" : "Complete"} ${action.title}`}
                  testID={`button-muslim-health-toggle-${action.id}`}
                >
                  <AppIcon
                    name={done ? "check-circle" : "circle"}
                    size={17}
                    color={done ? theme.primary : theme.primaryForeground}
                  />
                  <ThemedText
                    style={[
                      styles.primaryButtonText,
                      {
                        color: done ? theme.primary : theme.primaryForeground,
                      },
                    ]}
                  >
                    {done ? "Done" : action.actionLabel}
                  </ThemedText>
                </Pressable>
                {action.route ? (
                  <Pressable
                    onPress={() => openRoute(action.route)}
                    style={[
                      styles.secondaryButton,
                      { borderColor: theme.border },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${action.route}`}
                  >
                    <ThemedText
                      style={[
                        styles.secondaryButtonText,
                        { color: theme.text },
                      ]}
                    >
                      Open
                    </ThemedText>
                    <AppIcon name="arrow-right" size={16} color={theme.text} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}

        <SectionTitle title="Health Boundaries" color={theme.scholar} />
        <View
          style={[
            styles.boundaryCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.border,
            },
          ]}
          testID="muslim-health-boundaries"
        >
          <View
            style={[
              styles.notice,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
          >
            <AppIcon name="alert-triangle" size={18} color={theme.warning} />
            <ThemedText
              style={[styles.noticeText, { color: theme.textSecondary }]}
            >
              It does not diagnose symptoms, prescribe treatment, change
              medication, or replace emergency care.
            </ThemedText>
          </View>
          {(plan?.safetyBoundaries || []).slice(0, 3).map((item, index) => (
            <View key={item} style={styles.boundaryRow}>
              <View
                style={[
                  styles.boundaryNumber,
                  { backgroundColor: theme.scholarSoft },
                ]}
              >
                <ThemedText
                  style={[styles.boundaryNumberText, { color: theme.scholar }]}
                >
                  {index + 1}
                </ThemedText>
              </View>
              <ThemedText
                style={[styles.boundaryText, { color: theme.textSecondary }]}
              >
                {item}
              </ThemedText>
            </View>
          ))}
        </View>

        <SectionTitle title="Source And Trust" color={theme.primary} />
        <View
          style={[
            styles.sourcesCard,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <GoldDivider />
          {(plan?.sourceAnchors || []).slice(0, 3).map((source) => (
            <View key={source} style={styles.sourceRow}>
              <AppIcon name="shield" size={16} color={theme.primary} />
              <ThemedText style={[styles.sourceText, { color: theme.text }]}>
                {source}
              </ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title, color }: { title: string; color: string }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={[styles.sectionDot, { backgroundColor: color }]} />
      <ThemedText style={[styles.sectionTitleText, { color }]}>
        {title}
      </ThemedText>
    </View>
  );
}

function ScoreRing({
  score,
  color,
  secondaryColor,
  trackColor,
  textColor,
  mutedColor,
}: {
  score: number | null;
  color: string;
  secondaryColor: string;
  trackColor: string;
  textColor: string;
  mutedColor: string;
}) {
  const radius = (SCORE_RING_SIZE - SCORE_RING_STROKE) / 2;
  const center = SCORE_RING_SIZE / 2;
  const circumference = 2 * Math.PI * radius;
  const hasScore = typeof score === "number" && Number.isFinite(score);
  const clampedScore = clampScore(hasScore ? score : 0);
  const offset = circumference - (clampedScore / 100) * circumference;

  return (
    <View
      style={styles.scoreRingShell}
      accessibilityLabel="Amanah Readiness score"
    >
      <Svg width={SCORE_RING_SIZE} height={SCORE_RING_SIZE}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={SCORE_RING_STROKE}
          fill="none"
          opacity={0.72}
        />
        <Circle
          cx={center}
          cy={center}
          r={radius - 18}
          stroke={secondaryColor}
          strokeWidth={2}
          fill="none"
          opacity={0.24}
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={SCORE_RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.scoreRingContent}>
        <ThemedText
          style={[styles.scoreRingValue, { color: textColor }]}
          numberOfLines={1}
        >
          {hasScore ? clampedScore : "--"}
        </ThemedText>
        <ThemedText style={[styles.scoreRingUnit, { color: mutedColor }]}>
          /100
        </ThemedText>
      </View>
    </View>
  );
}

function ContributorChip({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: FeatherName;
  color: string;
}) {
  return (
    <View style={styles.contributorChip}>
      <View style={[styles.contributorIcon, { backgroundColor: `${color}1A` }]}>
        <AppIcon name={icon} size={13} color={color} />
      </View>
      <View style={styles.contributorCopy}>
        <ThemedText style={styles.contributorLabel} numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText
          style={[styles.contributorValue, { color }]}
          numberOfLines={1}
        >
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

function TinyTrendBars({
  values,
  color,
  maxValue,
}: {
  values?: number[];
  color: string;
  maxValue?: number;
}) {
  const safeValues = values?.length ? values : [0, 0, 0, 0, 0, 0, 0];
  const hasData = safeValues.some((value) => value > 0);
  const safeMax = Math.max(1, maxValue || 0, ...safeValues);

  return (
    <View style={styles.tinyTrendBars}>
      {safeValues.slice(-7).map((value, index) => (
        <View key={`${value}-${index}`} style={styles.tinyTrendTrack}>
          <View
            style={[
              styles.tinyTrendFill,
              {
                height: `${hasData ? Math.max(12, (value / safeMax) * 100) : 8}%`,
                backgroundColor: color,
                opacity: hasData ? 0.95 : 0.22,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function MetricTile({
  icon,
  label,
  value,
  color,
  suffix,
  helper,
  trendValues,
  trendMax,
}: {
  icon: FeatherName;
  label: string;
  value: string;
  color: string;
  suffix?: string;
  helper?: string;
  trendValues?: number[];
  trendMax?: number;
}) {
  return (
    <View style={styles.metricTile}>
      <View style={styles.metricTileTop}>
        <AppIcon name={icon} size={15} color={color} />
        <ThemedText style={styles.metricTileLabel}>{label}</ThemedText>
      </View>
      <View style={styles.metricValueRow}>
        <ThemedText style={[styles.metricTileValue, { color }]}>
          {value}
        </ThemedText>
        {suffix ? (
          <ThemedText style={styles.metricTileSuffix}>{suffix}</ThemedText>
        ) : null}
      </View>
      {helper ? (
        <ThemedText style={styles.metricTileHelper} numberOfLines={1}>
          {helper}
        </ThemedText>
      ) : null}
      <TinyTrendBars values={trendValues} color={color} maxValue={trendMax} />
    </View>
  );
}

function ScoreCard({
  label,
  value,
  color,
  icon,
  caption,
}: {
  label: string;
  value: number | null;
  color: string;
  icon: FeatherName;
  caption: string;
}) {
  const scoreLabel = value == null ? "--" : `${value}`;
  return (
    <View style={styles.scoreCard}>
      <View style={styles.scoreCardTop}>
        <AppIcon name={icon} size={14} color={color} />
        <ThemedText
          style={styles.scoreCardLabel}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {label}
        </ThemedText>
      </View>
      <View style={styles.scoreCardValueRow}>
        <ThemedText
          style={[styles.scoreCardValue, { color }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {scoreLabel}
        </ThemedText>
        {value == null ? null : (
          <ThemedText style={styles.scoreCardUnit}>%</ThemedText>
        )}
      </View>
      <View style={styles.scoreCardTrack}>
        <View
          style={[
            styles.scoreCardFill,
            {
              width: `${value ?? 0}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <ThemedText style={styles.scoreCardCaption} numberOfLines={1}>
        {caption}
      </ThemedText>
    </View>
  );
}

function DriverRow({ driver }: { driver: HealthDriver }) {
  return (
    <View style={styles.driverRow}>
      <View
        style={[styles.driverIcon, { backgroundColor: `${driver.color}18` }]}
      >
        <AppIcon name={driver.icon} size={15} color={driver.color} />
      </View>
      <View style={styles.driverCopy}>
        <View style={styles.driverTop}>
          <ThemedText style={styles.driverLabel} numberOfLines={1}>
            {driver.label}
          </ThemedText>
          <ThemedText
            style={[styles.driverValue, { color: driver.color }]}
            numberOfLines={1}
          >
            {driver.value}
          </ThemedText>
        </View>
        <View style={styles.driverTrack}>
          <View
            style={[
              styles.driverFill,
              {
                width: `${driver.progress}%`,
                backgroundColor: driver.color,
              },
            ]}
          />
        </View>
        <ThemedText style={styles.driverDetail} numberOfLines={1}>
          {driver.detail}
        </ThemedText>
      </View>
    </View>
  );
}

function InsightCell({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <View style={styles.insightCell}>
      <ThemedText style={styles.insightLabel}>{label}</ThemedText>
      <ThemedText style={styles.insightValue}>{value}</ThemedText>
      <ThemedText style={styles.insightHelper} numberOfLines={1}>
        {helper}
      </ThemedText>
    </View>
  );
}

function StagePill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.stagePill}>
      <View style={[styles.stageDot, { backgroundColor: color }]} />
      <ThemedText style={styles.stageLabel}>{label}</ThemedText>
      <ThemedText style={[styles.stageValue, { color }]}>{value}</ThemedText>
    </View>
  );
}

function MacroProgress({
  label,
  value,
  target,
  suffix,
  color,
}: {
  label: string;
  value: number;
  target: number;
  suffix: string;
  color: string;
}) {
  const progress = clampScore(((target - value) / Math.max(1, target)) * 100);
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroTop}>
        <ThemedText style={styles.macroLabel}>{label}</ThemedText>
        <ThemedText style={[styles.macroValue, { color }]}>
          {Math.round(value)} {suffix}
        </ThemedText>
      </View>
      <View style={styles.macroTrack}>
        <View
          style={[
            styles.macroFill,
            { width: `${progress}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function VitalRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.vitalRow}>
      <ThemedText style={styles.vitalLabel}>{label}</ThemedText>
      <ThemedText style={styles.vitalValue}>{value}</ThemedText>
    </View>
  );
}

function WorkoutRow({
  title,
  minutes,
  calories,
  startTime,
}: {
  title: string;
  minutes?: number;
  calories?: number;
  startTime?: string;
}) {
  return (
    <View style={styles.workoutRow}>
      <View style={styles.workoutIcon}>
        <AppIcon name="activity" size={15} color="rgba(86,179,148,0.95)" />
      </View>
      <View style={styles.workoutCopy}>
        <ThemedText style={styles.workoutTitle} numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText style={styles.workoutMeta} numberOfLines={1}>
          {formatClock(startTime)} · {formatOptional(minutes, "m")}
        </ThemedText>
      </View>
      <ThemedText style={styles.workoutCalories} numberOfLines={1}>
        {formatOptional(calories, " kcal")}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  trendsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  trendCard: {
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  trendLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 44,
    gap: 15,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 3,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  amanahHero: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    overflow: "hidden",
    gap: 16,
  },
  amanahHeroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  heroTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  amanahHeroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
  heroStatusPill: {
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  heroStatusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
  },
  scoreValue: {
    fontSize: 64,
    lineHeight: 68,
    fontWeight: "900",
    letterSpacing: 0,
  },
  scoreUnit: {
    fontSize: 19,
    lineHeight: 32,
    fontWeight: "800",
  },
  amanahHeroBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  heroScoreDeck: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  scoreRingShell: {
    width: SCORE_RING_SIZE,
    height: SCORE_RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreRingContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreRingValue: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "900",
    letterSpacing: 0,
  },
  scoreRingUnit: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  heroInsightPanel: {
    flex: 1,
    minWidth: 0,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.035)",
    padding: 13,
    gap: 9,
  },
  heroInsightTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroInsightLabel: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  heroInsightValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
  },
  heroInsightBody: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
  },
  heroContributorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  contributorChip: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.035)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contributorIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  contributorCopy: {
    flex: 1,
    minWidth: 0,
  },
  contributorLabel: {
    color: "rgba(248,251,255,0.52)",
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "900",
  },
  contributorValue: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  hero: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 20,
    overflow: "hidden",
    gap: 12,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  progressPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.14)",
  },
  progressPillText: {
    fontSize: 16,
    fontWeight: "800",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 23,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "700",
  },
  notice: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  connectionsCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 12,
  },
  dataQualityCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 15,
    gap: 13,
  },
  dataCoverageDial: {
    width: 58,
    height: 58,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dataCoverageValue: {
    fontSize: 21,
    lineHeight: 24,
    fontWeight: "900",
  },
  dataCoverageLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
  },
  dataSignalRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  dataSignalChip: {
    minHeight: 30,
    maxWidth: "48%",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dataSignalText: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
  },
  healthEmptySyncBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  healthEmptySyncText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  dataMissingText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  connectionsHeader: {
    flexDirection: "row",
    gap: 12,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  connectionHeaderIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  connectionHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  connectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  connectionBody: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  providerRow: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: 13,
    flexDirection: "row",
    gap: 12,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  providerCopy: {
    flex: 1,
    gap: 8,
  },
  providerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  providerTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  statusPill: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  providerSummary: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  providerChipGrid: {
    gap: 8,
  },
  providerChip: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  providerChipCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  healthBriefingCard: {
    minHeight: 112,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  healthBriefingIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  healthBriefingCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  healthBriefingEyebrow: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  healthBriefingTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },
  healthBriefingBody: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
  },
  healthBriefingAction: {
    minHeight: 32,
    maxWidth: 92,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  healthBriefingActionText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
  },
  scoreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scoreCard: {
    flexBasis: "31%",
    flexGrow: 1,
    minWidth: 104,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 11,
    gap: 7,
  },
  scoreCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scoreCardLabel: {
    flexShrink: 1,
    color: "rgba(248,251,255,0.7)",
    fontSize: 11,
    fontWeight: "900",
  },
  scoreCardValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  scoreCardValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
  },
  scoreCardUnit: {
    color: "rgba(248,251,255,0.48)",
    fontSize: 10,
    lineHeight: 18,
    fontWeight: "900",
  },
  scoreCardTrack: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  scoreCardFill: {
    height: "100%",
    borderRadius: 999,
  },
  scoreCardCaption: {
    color: "rgba(248,251,255,0.5)",
    fontSize: 10,
    fontWeight: "800",
  },
  driverCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 13,
  },
  driverGrid: {
    gap: 9,
  },
  driverRow: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.035)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  driverIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  driverCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  driverTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  driverLabel: {
    flex: 1,
    color: "rgba(248,251,255,0.74)",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900",
  },
  driverValue: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900",
  },
  driverTrack: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  driverFill: {
    height: "100%",
    borderRadius: 999,
  },
  driverDetail: {
    color: "rgba(248,251,255,0.48)",
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: "700",
  },
  chartCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 14,
  },
  chartBlock: {
    gap: 8,
  },
  chartHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chartLabel: {
    color: "rgba(248,251,255,0.66)",
    fontSize: 12,
    fontWeight: "900",
  },
  chartValue: {
    fontSize: 13,
    fontWeight: "900",
  },
  chartBars: {
    height: 70,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
  },
  chartBarTrack: {
    flex: 1,
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  chartBarFill: {
    width: "100%",
    borderRadius: 999,
  },
  metricList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  metricPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  metricText: {
    fontSize: 11,
    fontWeight: "800",
  },
  providerNote: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  nativeHealthCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 13,
  },
  foodScanCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 13,
  },
  sleepCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 13,
  },
  sleepGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  insightCell: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 74,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.035)",
    padding: 11,
    gap: 3,
  },
  insightLabel: {
    color: "rgba(248,251,255,0.54)",
    fontSize: 11,
    fontWeight: "900",
  },
  insightValue: {
    color: "rgba(248,251,255,0.94)",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },
  insightHelper: {
    color: "rgba(248,251,255,0.46)",
    fontSize: 10.5,
    fontWeight: "700",
  },
  sleepStageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  stagePill: {
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.035)",
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  stageLabel: {
    color: "rgba(248,251,255,0.66)",
    fontSize: 11,
    fontWeight: "900",
  },
  stageValue: {
    fontSize: 11,
    fontWeight: "900",
  },
  nutritionCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 13,
  },
  macroRow: {
    gap: 7,
  },
  macroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  macroLabel: {
    color: "rgba(248,251,255,0.7)",
    fontSize: 13,
    fontWeight: "900",
  },
  macroValue: {
    fontSize: 13,
    fontWeight: "900",
  },
  macroTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  macroFill: {
    height: "100%",
    borderRadius: 999,
  },
  doublePanelGrid: {
    flexDirection: "row",
    gap: 10,
  },
  compactPanel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 14,
    gap: 10,
  },
  vitalRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  vitalLabel: {
    color: "rgba(248,251,255,0.58)",
    fontSize: 11,
    fontWeight: "900",
  },
  vitalValue: {
    color: "rgba(248,251,255,0.92)",
    fontSize: 12,
    fontWeight: "900",
  },
  journalCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 13,
  },
  workoutCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 10,
  },
  workoutRow: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.035)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  workoutIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(86,179,148,0.09)",
  },
  workoutCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  workoutTitle: {
    color: "rgba(248,251,255,0.92)",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },
  workoutMeta: {
    color: "rgba(248,251,255,0.48)",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  workoutCalories: {
    color: "rgba(255,212,107,0.94)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  journalInput: {
    minHeight: 104,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  nativeHealthTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  nativeHealthCopy: {
    flex: 1,
    gap: 5,
  },
  nativeHealthIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nativeHealthEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.2,
  },
  nativeHealthTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  nativeHealthBody: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  healthMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricTile: {
    minWidth: "47%",
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 12,
    gap: 7,
  },
  metricTileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  metricTileValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
  },
  metricTileLabel: {
    color: "rgba(248,251,255,0.64)",
    fontSize: 12,
    fontWeight: "800",
  },
  metricTileSuffix: {
    color: "rgba(248,251,255,0.52)",
    fontSize: 10,
    lineHeight: 18,
    fontWeight: "800",
  },
  metricTileHelper: {
    color: "rgba(248,251,255,0.45)",
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "700",
  },
  tinyTrendBars: {
    height: 28,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginTop: 2,
  },
  tinyTrendTrack: {
    flex: 1,
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  tinyTrendFill: {
    width: "100%",
    borderRadius: 999,
  },
  foodResultBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: 13,
    gap: 8,
  },
  foodResultTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
  },
  foodCalories: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },
  inlineError: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 2,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 13,
  },
  completionCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  completionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  completionTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700",
  },
  completionBody: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 21,
  },
  completionSource: {
    marginTop: Spacing.xs,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  focusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  actionTop: {
    flexDirection: "row",
    gap: 13,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: {
    flex: 1,
    gap: 4,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  actionBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  frameBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: 12,
    flexDirection: "row",
    gap: 9,
  },
  frameText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  safetyText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  boundaryCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 14,
  },
  boundaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  boundaryNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  boundaryNumberText: {
    fontSize: 12,
    fontWeight: "900",
  },
  boundaryText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  sourcesCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 12,
  },
  sourceRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  sourceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },
});
