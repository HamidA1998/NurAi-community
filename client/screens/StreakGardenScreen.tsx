import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { syncedSetItem } from "@/lib/progress-sync";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { PremiumGate } from "@/components/PremiumGate";
import { useSubscription } from "@/context/SubscriptionContext";
import { useWomensHealth } from "@/context/WomensHealthContext";
import type { AICitation } from "@/services/aiContextService";
import { StreakGardenSvg } from "@/components/premium/svg/PremiumSvgs";
import {
  HABIT_CATEGORIES,
  HabitStreakData,
  calculateHabitStreak,
  getHabitGrowthStage,
  getHabitGrowthIcon,
  getHabitProgressPercent,
  getWeeklyReflection,
  type HabitCategoryId,
} from "@/services/nuraiHabitEngine";
import { AppIcon, type AppIconName } from "@/components/icons";
import {
  getGardenSnapshot,
  recordGardenAction,
  type GardenActionResult,
} from "@/services/gardenService";
import {
  evaluateGardenRewards,
  type GardenRewards,
} from "@/services/gardenRewardsService";
import { Aurora, NuraiSpring, NuraiToast } from "@/design-system";

const STREAK_KEY = "streak-data";
const HABIT_STREAK_KEY = "habit-streak-data";

// Aligned to the app's "Quiet Intelligence" tokens so the garden reads as
// part of NurAI, not a separate bright-green world. Gold stays as the
// garden's signature accent — this is a milestone/reward space, which is
// exactly where the design language permits gold.
const GARDEN_COLORS = {
  bg: "#0B1114",
  bgDeep: "#071A1A",
  glass: "rgba(16, 28, 29, 0.86)",
  glassStrong: "rgba(20, 36, 37, 0.94)",
  emerald: "#56B394",
  emeraldSoft: "#3E8C78",
  gold: "#CFAE69",
  goldBright: "#E8C76F",
  text: "#F3F0E8",
  muted: "rgba(184, 194, 189, 0.72)",
  border: "rgba(184, 194, 189, 0.16)",
};

interface StreakData {
  checkedDays: string[];
  protectedDays?: string[];
  currentStreak: number;
  longestStreak: number;
  milestoneEarnedDates?: Record<number, string>;
}

const defaultData: StreakData = {
  checkedDays: [],
  protectedDays: [],
  currentStreak: 0,
  longestStreak: 0,
  milestoneEarnedDates: {},
};

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function shiftDateString(dateStr: string, deltaDays: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return getDateString(d);
}

function normalizeStreakData(value: any): StreakData {
  const checkedDays = Array.isArray(value?.checkedDays)
    ? value.checkedDays.filter(
        (day: unknown): day is string => typeof day === "string",
      )
    : [];
  const protectedDays = Array.isArray(value?.protectedDays)
    ? value.protectedDays.filter(
        (day: unknown): day is string => typeof day === "string",
      )
    : [];
  const recalculated = calculateStreak(checkedDays, protectedDays);
  return {
    checkedDays,
    protectedDays,
    currentStreak:
      typeof value?.currentStreak === "number"
        ? value.currentStreak
        : recalculated.current,
    longestStreak:
      typeof value?.longestStreak === "number"
        ? value.longestStreak
        : recalculated.longest,
    milestoneEarnedDates:
      value?.milestoneEarnedDates &&
      typeof value.milestoneEarnedDates === "object"
        ? value.milestoneEarnedDates
        : {},
  };
}

function getCurrentWeekDays(): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const saturdayOffset = dayOfWeek === 6 ? 0 : -(dayOfWeek + 1);
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + saturdayOffset);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(saturday);
    d.setDate(saturday.getDate() + i);
    days.push(d);
  }
  return days;
}

const dayLabels = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

function getMotivationalMessage(streak: number): string {
  if (streak === 0) return "Start your journey today! Every step counts.";
  if (streak < 3) return "Great start! Keep the momentum going.";
  if (streak < 7) return "MashaAllah! You're building a wonderful habit.";
  if (streak < 14) return "SubhanAllah! A full week of dedication!";
  if (streak < 30)
    return "Incredible consistency! Allah rewards the steadfast.";
  if (streak < 60) return "A month of devotion! You are truly inspiring.";
  return "What an amazing journey! May Allah bless your perseverance.";
}

function calculateStreak(
  checkedDays: string[],
  protectedDays: string[] = [],
): {
  current: number;
  longest: number;
} {
  if (checkedDays.length === 0 && protectedDays.length === 0) {
    return { current: 0, longest: 0 };
  }

  const checkedSet = new Set(checkedDays);
  const continuityDays = new Set([...checkedDays, ...protectedDays]);
  const sorted = Array.from(continuityDays).sort();
  const today = getDateString(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getDateString(yesterday);

  let current = 0;
  let longest = 0;
  let tempStreak = checkedSet.has(sorted[0]) ? 1 : 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      if (checkedSet.has(sorted[i])) tempStreak++;
    } else {
      longest = Math.max(longest, tempStreak);
      tempStreak = checkedSet.has(sorted[i]) ? 1 : 0;
    }
  }
  longest = Math.max(longest, tempStreak);

  const startDay = continuityDays.has(today)
    ? today
    : continuityDays.has(yesterdayStr)
      ? yesterdayStr
      : null;
  if (startDay) {
    let cursor = startDay;
    while (continuityDays.has(cursor)) {
      if (checkedSet.has(cursor)) current++;
      cursor = shiftDateString(cursor, -1);
    }
  }

  return { current, longest };
}

const MILESTONES = [
  { days: 7, icon: "target" as const, label: "1 Week" },
  { days: 14, icon: "feather" as const, label: "2 Weeks" },
  { days: 30, icon: "shield" as const, label: "1 Month" },
  { days: 60, icon: "compass" as const, label: "2 Months" },
  { days: 90, icon: "hexagon" as const, label: "3 Months" },
  { days: 180, icon: "award" as const, label: "6 Months" },
];

interface GrowthStage {
  key: string;
  icon: string;
  label: string;
  color: string;
  minDays: number;
  maxDays: number;
}

interface DeepReflectionResult {
  response: string;
  citations: AICitation[];
  actionSteps: string[];
  warnings: string[];
  sourceCoverage?: string;
}

const GROWTH_STAGES: GrowthStage[] = [
  {
    key: "seed",
    icon: "circle",
    label: "Seed",
    color: "#6B7280",
    minDays: 0,
    maxDays: 0,
  },
  {
    key: "sprout",
    icon: "chevrons-up",
    label: "Sprout",
    color: "#4ADE80",
    minDays: 1,
    maxDays: 6,
  },
  {
    key: "plant",
    icon: "trending-up",
    label: "Plant",
    color: "#60A5FA",
    minDays: 7,
    maxDays: 13,
  },
  {
    key: "tree",
    icon: "git-branch",
    label: "Tree",
    color: "#34D399",
    minDays: 14,
    maxDays: 29,
  },
  {
    key: "radiant",
    icon: "sun",
    label: "Radiant",
    color: "#FBBF24",
    minDays: 30,
    maxDays: Infinity,
  },
];

function getGrowthStage(streak: number): GrowthStage {
  for (let i = GROWTH_STAGES.length - 1; i >= 0; i--) {
    if (streak >= GROWTH_STAGES[i].minDays) return GROWTH_STAGES[i];
  }
  return GROWTH_STAGES[0];
}

function getNextGrowthStage(streak: number): GrowthStage | null {
  const current = getGrowthStage(streak);
  const idx = GROWTH_STAGES.indexOf(current);
  if (idx < GROWTH_STAGES.length - 1) return GROWTH_STAGES[idx + 1];
  return null;
}

function PulsingGlow() {
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [glowOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.heroGlow,
        { backgroundColor: GARDEN_COLORS.emerald },
        animatedStyle,
      ]}
    />
  );
}

function HeaderGoldDivider() {
  return (
    <Svg
      width={150}
      height={18}
      viewBox="0 0 150 18"
      style={styles.headerDividerSvg}
    >
      <Path
        d="M0 9H61"
        stroke={GARDEN_COLORS.goldBright}
        strokeOpacity="0.24"
      />
      <Path
        d="M89 9H150"
        stroke={GARDEN_COLORS.goldBright}
        strokeOpacity="0.24"
      />
      <Path
        d="M75 2 82 9 75 16 68 9Z"
        fill="none"
        stroke={GARDEN_COLORS.goldBright}
        strokeOpacity="0.7"
      />
      <Circle
        cx="75"
        cy="9"
        r="2.2"
        fill={GARDEN_COLORS.goldBright}
        opacity="0.84"
      />
    </Svg>
  );
}

function HeroGrowthLineSvg() {
  return (
    <Svg
      width="100%"
      height={48}
      viewBox="0 0 290 48"
      style={styles.heroGrowthLine}
    >
      <Defs>
        <SvgLinearGradient id="growthLine" x1="0" y1="0" x2="1" y2="0">
          <Stop
            offset="0"
            stopColor={GARDEN_COLORS.goldBright}
            stopOpacity="0.18"
          />
          <Stop
            offset="0.6"
            stopColor={GARDEN_COLORS.emerald}
            stopOpacity="0.78"
          />
          <Stop offset="1" stopColor={GARDEN_COLORS.emerald} stopOpacity="1" />
        </SvgLinearGradient>
      </Defs>
      <Path
        d="M2 34 C38 20 67 31 98 25 C134 18 160 30 192 17 C225 4 246 20 288 9"
        stroke="url(#growthLine)"
        strokeWidth="1.8"
        fill="none"
      />
      <Circle cx="288" cy="9" r="4" fill={GARDEN_COLORS.emerald} />
      <Circle
        cx="288"
        cy="9"
        r="9"
        fill={GARDEN_COLORS.emerald}
        opacity="0.16"
      />
    </Svg>
  );
}

function StagePlantOrb({
  stageColor,
  progress,
}: {
  stageColor: string;
  progress: number;
}) {
  const clamped = Math.min(1, Math.max(0, progress));
  const dash = 283 * clamped;

  return (
    <View style={styles.stageOrbWrap}>
      <Svg width={142} height={142} viewBox="0 0 142 142">
        <Defs>
          <SvgLinearGradient id="orbPlant" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#CBE8DC" />
            <Stop offset="0.45" stopColor={stageColor} />
            <Stop offset="1" stopColor={GARDEN_COLORS.goldBright} />
          </SvgLinearGradient>
          <SvgLinearGradient id="orbRing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={GARDEN_COLORS.goldBright} />
            <Stop offset="0.5" stopColor={stageColor} />
            <Stop offset="1" stopColor={GARDEN_COLORS.gold} />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx="71"
          cy="71"
          r="58"
          fill="rgba(0,0,0,0.13)"
          stroke={GARDEN_COLORS.goldBright}
          strokeOpacity="0.32"
          strokeWidth="1"
        />
        <Circle
          cx="71"
          cy="71"
          r="51"
          fill="rgba(7, 34, 26, 0.72)"
          stroke={GARDEN_COLORS.goldBright}
          strokeOpacity="0.46"
          strokeWidth="1.2"
        />
        <Circle
          cx="71"
          cy="71"
          r="45"
          fill="none"
          stroke={stageColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} 283`}
          rotation="-82"
          origin="71 71"
          opacity="0.95"
        />
        <Circle cx="71" cy="96" r="2.4" fill={GARDEN_COLORS.goldBright} />
        <Path
          d="M71 96 C71 82 71 69 72 56"
          stroke="url(#orbPlant)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Path
          d="M72 66 C53 50 42 49 33 56 C40 76 58 77 72 66Z"
          fill="url(#orbPlant)"
          opacity="0.92"
        />
        <Path
          d="M72 66 C89 48 103 48 112 56 C104 78 87 78 72 66Z"
          fill="url(#orbPlant)"
          opacity="0.92"
        />
        <Path
          d="M50 101 C63 96 77 96 92 101"
          stroke={GARDEN_COLORS.goldBright}
          strokeOpacity="0.42"
          fill="none"
        />
        <Path
          d="M77 31 79 36 84 38 79 40 77 45 75 40 70 38 75 36Z"
          fill={GARDEN_COLORS.goldBright}
          opacity="0.9"
        />
        <Path
          d="M56 25 57 28 60 29 57 30 56 33 55 30 52 29 55 28Z"
          fill={GARDEN_COLORS.goldBright}
          opacity="0.7"
        />
      </Svg>
    </View>
  );
}

function HabitGardenSection({
  habitData,
  onToggle,
  today,
}: {
  habitData: HabitStreakData;
  onToggle: (habitId: HabitCategoryId) => void;
  today: string;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(250).duration(500)}>
      <View style={styles.habitGardenBlock}>
        <View style={styles.gardenSectionHeader}>
          <View style={styles.gardenSectionTitleRow}>
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <G
                stroke={GARDEN_COLORS.goldBright}
                strokeWidth="1"
                fill="none"
                opacity="0.8"
              >
                <Path d="M12 1 15 9 23 12 15 15 12 23 9 15 1 12 9 9Z" />
                <Circle cx="12" cy="12" r="4" />
              </G>
            </Svg>
            <ThemedText type="h3" style={styles.gardenSectionTitle}>
              Habit Garden
            </ThemedText>
          </View>
          <View style={styles.gardenSectionLine} />
        </View>
        <ThemedText type="caption" style={styles.gardenSectionSubtitle}>
          Each habit grows independently based on your consistency
        </ThemedText>
        {HABIT_CATEGORIES.map((cat, idx) => {
          const data = habitData[cat.id];
          const streak = data?.currentStreak ?? 0;
          const isCheckedToday = data?.checkedDays?.includes(today) ?? false;
          const growthStage = getHabitGrowthStage(streak);
          const growthIcon = getHabitGrowthIcon(streak);
          const progress = getHabitProgressPercent(streak);
          const catColor = cat.darkColor;

          return (
            <Animated.View
              key={cat.id}
              entering={FadeInDown.delay(300 + idx * 60).duration(400)}
            >
              <View style={[styles.habitRow, { borderColor: catColor + "40" }]}>
                <View
                  style={[
                    styles.habitIconWrap,
                    {
                      backgroundColor: catColor + "1c",
                      borderWidth: 1,
                      borderColor: catColor + "40",
                    },
                  ]}
                >
                  <AppIcon
                    name={cat.icon}
                    size={26}
                    color={catColor}
                    decorative
                  />
                </View>
                <View style={styles.habitInfo}>
                  <View style={styles.habitLabelRow}>
                    <ThemedText type="body" style={styles.habitName}>
                      {cat.label}
                    </ThemedText>
                    <View
                      style={[
                        styles.habitStageBadge,
                        {
                          backgroundColor: catColor + "12",
                          borderColor: catColor + "25",
                        },
                      ]}
                    >
                      <AppIcon
                        name={growthIcon as any}
                        size={12}
                        color={catColor}
                      />
                      <ThemedText
                        type="caption"
                        style={[styles.habitStageText, { color: catColor }]}
                      >
                        {growthStage.label}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.habitProgressRow}>
                    <View
                      style={[
                        styles.habitProgressTrack,
                        { backgroundColor: catColor + "18" },
                      ]}
                    >
                      <View
                        style={[
                          styles.habitProgressFill,
                          { backgroundColor: catColor, width: `${progress}%` },
                        ]}
                      />
                    </View>
                    <ThemedText type="small" style={styles.habitDays}>
                      {streak}d
                    </ThemedText>
                  </View>
                </View>
                <Pressable
                  onPress={() => onToggle(cat.id)}
                  style={[
                    styles.habitCheckBtn,
                    isCheckedToday
                      ? { backgroundColor: catColor }
                      : {
                          borderColor: GARDEN_COLORS.goldBright + "90",
                          borderWidth: 1.5,
                          backgroundColor: "transparent",
                        },
                  ]}
                  testID={`button-habit-${cat.id}`}
                >
                  {isCheckedToday ? (
                    <AppIcon name="check" size={19} color="#FFFFFF" />
                  ) : (
                    <AppIcon
                      name="plus"
                      size={22}
                      color={GARDEN_COLORS.goldBright}
                    />
                  )}
                </Pressable>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );
}

function ReflectionLogCard({
  onSaved,
}: {
  onSaved: (result: GardenActionResult) => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedToday, setSavedToday] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(`garden-reflection-${getDateString(new Date())}`)
      .then((saved) => {
        if (saved) {
          setNote(saved);
          setSavedToday(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = useCallback(async () => {
    if (!note.trim() || saving) return;
    setSaving(true);
    try {
      await syncedSetItem(
        `garden-reflection-${getDateString(new Date())}`,
        note.trim(),
      );
      const result = await recordGardenAction("reflection");
      onSaved(result);
      setSavedToday(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } finally {
      setSaving(false);
    }
  }, [note, saving, onSaved]);

  return (
    <Animated.View entering={FadeInDown.delay(320).duration(500)}>
      <View style={styles.reflectionLogCard}>
        <View style={styles.gardenSectionTitleRow}>
          <AppIcon
            name="reflection"
            size={18}
            color={GARDEN_COLORS.goldBright}
          />
          <ThemedText type="h3" style={styles.gardenSectionTitle}>
            Today's Reflection
          </ThemedText>
        </View>
        <ThemedText type="caption" style={styles.gardenSectionSubtitle}>
          One honest line is enough — writing it is the sincere action.
        </ThemedText>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What did today teach you?"
          placeholderTextColor={GARDEN_COLORS.muted}
          style={styles.reflectionInput}
          multiline
          editable={!savedToday}
          testID="input-garden-reflection"
        />
        {savedToday ? (
          <View style={styles.reflectionSavedRow}>
            <AppIcon name="check" size={14} color={GARDEN_COLORS.emerald} />
            <ThemedText type="caption" style={{ color: GARDEN_COLORS.emerald }}>
              Saved today
            </ThemedText>
          </View>
        ) : (
          <Pressable
            onPress={handleSave}
            disabled={!note.trim() || saving}
            style={[styles.reflectionSaveBtn, !note.trim() && { opacity: 0.5 }]}
            testID="button-save-reflection"
          >
            <AppIcon name="plus" size={16} color={GARDEN_COLORS.bgDeep} />
            <ThemedText
              type="small"
              style={{ color: GARDEN_COLORS.bgDeep, fontWeight: "700" }}
            >
              Save reflection
            </ThemedText>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

function WeeklyReflectionCard({
  weekCheckedCount,
  weekProtectedCount,
  habitData,
  totalStreak,
  protectedPauseActive,
  protectedPauseReason,
}: {
  weekCheckedCount: number;
  weekProtectedCount: number;
  habitData: HabitStreakData;
  totalStreak: number;
  protectedPauseActive: boolean;
  protectedPauseReason?: string;
}) {
  const { theme, isDark } = useTheme();
  const { hasPaidAPIAccess } = useSubscription();
  const [deepReflection, setDeepReflection] =
    useState<DeepReflectionResult | null>(null);
  const [loadingDeep, setLoadingDeep] = useState(false);

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) +
      startOfYear.getDay() +
      1) /
      7,
  );
  const freeReflection = getWeeklyReflection(
    weekNumber,
    weekCheckedCount,
    totalStreak,
  );

  const handleDeepReflection = useCallback(async () => {
    setLoadingDeep(true);
    try {
      setDeepReflection({
        response:
          "Deep reflection is being simplified. Use the weekly reflection above for now.",
        citations: [],
        actionSteps: [],
        warnings: [],
      });
    } catch {
      setDeepReflection({
        response:
          "NurAI could not prepare a deep reflection right now. Your weekly reflection is still saved above.",
        citations: [],
        actionSteps: [],
        warnings: [],
      });
    } finally {
      setLoadingDeep(false);
    }
  }, []);

  return (
    <Animated.View entering={FadeInDown.delay(500).duration(500)}>
      <View
        style={[
          styles.card,
          {
            borderColor: theme.borderSubtle,
            backgroundColor: isDark
              ? theme.surfaceGlass
              : theme.surfaceGlassStrong,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <AppIcon name="edit-3" size={16} color={theme.primary} />
          <ThemedText
            type="h4"
            style={[
              styles.sectionTitle,
              { marginBottom: 0, marginLeft: Spacing.sm },
            ]}
          >
            Weekly Reflection
          </ThemedText>
        </View>
        <ThemedText
          type="caption"
          style={{ color: theme.textMuted, marginBottom: Spacing.md }}
        >
          This Week's Focus
        </ThemedText>
        <View
          style={[
            styles.reflectionPromptBox,
            {
              backgroundColor: theme.primarySubtle,
              borderColor: theme.primaryBorder,
            },
          ]}
        >
          <AppIcon
            name="message-circle"
            size={14}
            color={theme.primary}
            style={{ marginRight: Spacing.sm, marginTop: 2 }}
          />
          <ThemedText type="small" style={{ color: theme.text, flex: 1 }}>
            {freeReflection}
          </ThemedText>
        </View>
        <View style={styles.reflectionStatsRow}>
          <View style={styles.reflectionStatItem}>
            <ThemedText type="h4" style={{ color: theme.primary }}>
              {weekCheckedCount}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Days Active
            </ThemedText>
          </View>
          <View
            style={[
              styles.reflectionDivider,
              { backgroundColor: theme.borderSubtle },
            ]}
          />
          <View style={styles.reflectionStatItem}>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {Math.max(0, 7 - weekCheckedCount - weekProtectedCount)}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Remaining
            </ThemedText>
          </View>
          <View
            style={[
              styles.reflectionDivider,
              { backgroundColor: theme.borderSubtle },
            ]}
          />
          <View style={styles.reflectionStatItem}>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {weekCheckedCount + weekProtectedCount > 0
                ? `${Math.round(((weekCheckedCount + weekProtectedCount) / 7) * 100)}%`
                : "0%"}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Covered
            </ThemedText>
          </View>
        </View>

        {weekProtectedCount > 0 ? (
          <View
            style={[
              styles.deepTrustCard,
              {
                backgroundColor: theme.primarySubtle,
                borderColor: theme.primaryBorder,
                marginTop: Spacing.md,
              },
            ]}
          >
            <AppIcon name="shield" size={14} color={theme.primary} />
            <ThemedText
              type="caption"
              style={[styles.deepTrustText, { color: theme.primary }]}
            >
              {`${weekProtectedCount} protected ${weekProtectedCount === 1 ? "day" : "days"} counted as mercy pauses, not broken streaks.`}
            </ThemedText>
          </View>
        ) : null}

        <View
          style={[
            styles.deepReflectionSection,
            { borderTopColor: theme.borderSubtle },
          ]}
        >
          <PremiumGate
            requiredTier="premium"
            featureLabel="Deep Reflection"
            upgradeMessage="Get personalized AI-powered weekly reflections grounded in Quran & Sunnah"
            mode="replace"
          >
            <View style={styles.deepReflectionContent}>
              <View style={styles.deepReflectionHeader}>
                <AppIcon name="zap" size={14} color={theme.primary} />
                <ThemedText
                  type="small"
                  style={{
                    color: theme.text,
                    fontFamily: "PlusJakartaSans_600SemiBold",
                    marginLeft: Spacing.sm,
                  }}
                >
                  Deep Reflection
                </ThemedText>
              </View>
              {deepReflection ? (
                <View style={styles.deepReflectionResult}>
                  <View
                    style={[
                      styles.reflectionPromptBox,
                      {
                        backgroundColor: theme.primarySubtle,
                        borderColor: theme.primaryBorder,
                      },
                    ]}
                  >
                    <AppIcon
                      name="star"
                      size={14}
                      color={theme.primary}
                      style={{ marginRight: Spacing.sm, marginTop: 2 }}
                    />
                    <ThemedText
                      type="small"
                      style={{ color: theme.text, flex: 1 }}
                    >
                      {deepReflection.response}
                    </ThemedText>
                  </View>

                  {deepReflection.sourceCoverage ||
                  deepReflection.warnings.length ? (
                    <View
                      style={[
                        styles.deepTrustCard,
                        {
                          backgroundColor:
                            deepReflection.sourceCoverage === "verified_context"
                              ? theme.primarySubtle
                              : `${theme.warning}12`,
                          borderColor:
                            deepReflection.sourceCoverage === "verified_context"
                              ? theme.primaryBorder
                              : `${theme.warning}35`,
                        },
                      ]}
                    >
                      <AppIcon
                        name={
                          deepReflection.sourceCoverage === "verified_context"
                            ? "shield"
                            : "alert-circle"
                        }
                        size={14}
                        color={
                          deepReflection.sourceCoverage === "verified_context"
                            ? theme.primary
                            : theme.warning
                        }
                      />
                      <ThemedText
                        type="caption"
                        style={[
                          styles.deepTrustText,
                          {
                            color:
                              deepReflection.sourceCoverage ===
                              "verified_context"
                                ? theme.primary
                                : theme.textSecondary,
                          },
                        ]}
                      >
                        {deepReflection.warnings[0] ||
                          "Source-aware reflection with app context attached."}
                      </ThemedText>
                    </View>
                  ) : null}

                  {deepReflection.citations.length ? (
                    <View style={styles.deepEvidenceSection}>
                      <ThemedText
                        type="caption"
                        style={[
                          styles.deepEvidenceLabel,
                          { color: theme.textMuted },
                        ]}
                      >
                        SOURCE SIGNALS
                      </ThemedText>
                      {deepReflection.citations
                        .slice(0, 3)
                        .map((citation, index) => (
                          <View
                            key={`${citation.reference}-${index}`}
                            style={[
                              styles.deepEvidenceRow,
                              {
                                backgroundColor: theme.surfaceGlass,
                                borderColor: theme.borderSubtle,
                              },
                            ]}
                          >
                            <AppIcon
                              name="book-open"
                              size={13}
                              color={theme.primary}
                            />
                            <View style={{ flex: 1 }}>
                              <ThemedText
                                type="caption"
                                style={{
                                  color: theme.text,
                                  fontFamily: "PlusJakartaSans_600SemiBold",
                                }}
                              >
                                {citation.reference}
                              </ThemedText>
                              {citation.explanation ? (
                                <ThemedText
                                  type="caption"
                                  style={{
                                    color: theme.textMuted,
                                    marginTop: 2,
                                  }}
                                >
                                  {citation.explanation}
                                </ThemedText>
                              ) : null}
                            </View>
                          </View>
                        ))}
                    </View>
                  ) : null}

                  {deepReflection.actionSteps.length ? (
                    <View style={styles.deepEvidenceSection}>
                      <ThemedText
                        type="caption"
                        style={[
                          styles.deepEvidenceLabel,
                          { color: theme.textMuted },
                        ]}
                      >
                        NEXT STEPS
                      </ThemedText>
                      {deepReflection.actionSteps
                        .slice(0, 3)
                        .map((step, index) => (
                          <View
                            key={`${step}-${index}`}
                            style={styles.deepActionRow}
                          >
                            <View
                              style={[
                                styles.deepActionNumber,
                                { backgroundColor: theme.primaryMuted },
                              ]}
                            >
                              <ThemedText
                                type="caption"
                                style={{ color: theme.primary, fontSize: 10 }}
                              >
                                {index + 1}
                              </ThemedText>
                            </View>
                            <ThemedText
                              type="caption"
                              style={{ color: theme.textSecondary, flex: 1 }}
                            >
                              {step}
                            </ThemedText>
                          </View>
                        ))}
                    </View>
                  ) : null}
                </View>
              ) : (
                <Pressable
                  onPress={hasPaidAPIAccess ? handleDeepReflection : undefined}
                  style={[
                    styles.deepReflectionBtn,
                    {
                      backgroundColor: theme.primaryMuted,
                      borderColor: theme.primaryBorder,
                    },
                  ]}
                  testID="button-deep-reflection"
                >
                  {loadingDeep ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <>
                      <AppIcon name="star" size={14} color={theme.primary} />
                      <ThemedText
                        type="small"
                        style={{ color: theme.primary, marginLeft: Spacing.sm }}
                      >
                        Generate Deep Reflection
                      </ThemedText>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </PremiumGate>
        </View>
      </View>
    </Animated.View>
  );
}

function StreakRiskCard({
  currentStreak,
  isTodayChecked,
}: {
  currentStreak: number;
  isTodayChecked: boolean;
}) {
  const { theme, isDark } = useTheme();

  if (isTodayChecked || currentStreak < 3) return null;

  const getMessage = () => {
    if (currentStreak >= 30) {
      return {
        title: "Your garden is flourishing",
        body: `You have built ${currentStreak} days of beautiful consistency. Take a moment today to nurture it further.`,
        icon: "heart" as const,
      };
    }
    if (currentStreak >= 14) {
      return {
        title: "Keep your momentum going",
        body: `${currentStreak} days strong -- a quick check-in today keeps your garden growing beautifully.`,
        icon: "sunrise" as const,
      };
    }
    if (currentStreak >= 7) {
      return {
        title: "A wonderful streak awaits",
        body: `You have been consistent for ${currentStreak} days. Today is another chance to grow.`,
        icon: "wind" as const,
      };
    }
    return {
      title: "Your streak is growing",
      body: `${currentStreak} days and counting. Check in today to keep it alive.`,
      icon: "feather" as const,
    };
  };

  const msg = getMessage();

  return (
    <Animated.View entering={FadeInDown.delay(250).duration(500)}>
      <View
        style={[
          styles.riskCard,
          {
            backgroundColor: isDark
              ? theme.surfaceGlass
              : theme.surfaceGlassStrong,
            borderColor: theme.warning + "30",
          },
        ]}
      >
        <View
          style={[
            styles.riskIconWrap,
            { backgroundColor: theme.warning + "15" },
          ]}
        >
          <AppIcon name={msg.icon} size={20} color={theme.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText
            type="small"
            style={{
              color: theme.text,
              fontFamily: "PlusJakartaSans_600SemiBold",
            }}
          >
            {msg.title}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
          >
            {msg.body}
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );
}

function ProtectedPauseCard({
  title,
  body,
  suggestedActions,
}: {
  title: string;
  body: string;
  suggestedActions: string[];
}) {
  const { theme, isDark } = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(235).duration(500)}>
      <View
        style={[
          styles.riskCard,
          {
            backgroundColor: isDark
              ? theme.surfaceGlass
              : theme.surfaceGlassStrong,
            borderColor: theme.primaryBorder,
          },
        ]}
      >
        <View
          style={[styles.riskIconWrap, { backgroundColor: theme.primaryMuted }]}
        >
          <AppIcon name="shield" size={20} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText
            type="small"
            style={{
              color: theme.text,
              fontFamily: "PlusJakartaSans_600SemiBold",
            }}
          >
            {title}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
          >
            {body}
          </ThemedText>
          {suggestedActions.length > 0 ? (
            <View style={styles.pauseActionRow}>
              {suggestedActions.slice(0, 4).map((action) => (
                <View
                  key={action}
                  style={[
                    styles.pauseActionChip,
                    {
                      backgroundColor: theme.primarySubtle,
                      borderColor: theme.primaryBorder,
                    },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontSize: 10 }}
                  >
                    {action}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

function AnimatedCheckInButton({
  onPress,
  label = "Check In Today",
  icon = "check-circle",
}: {
  onPress: () => void;
  label?: string;
  icon?: AppIconName;
}) {
  const scale = useSharedValue(1);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [glowScale]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: 0.4,
  }));

  // Tap-down/tap-up is plain feedback — no bounce. The brief overshoot
  // in handlePress is deliberate: it only plays once, on a successful
  // check-in, where a small bounce reads as delight rather than jank.
  const handlePressIn = () => {
    scale.value = withSpring(0.93, {
      ...NuraiSpring.gentle,
      overshootClamping: true,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      ...NuraiSpring.gentle,
      overshootClamping: true,
    });
  };

  const handlePress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withSequence(
      withSpring(1.06, NuraiSpring.celebration),
      withSpring(1, { ...NuraiSpring.gentle, overshootClamping: true }),
    );
    onPress();
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(300).duration(500)}
      style={{ alignItems: "center", marginBottom: Spacing.xl }}
    >
      <View style={{ position: "relative" }}>
        <Animated.View
          style={[
            styles.checkInGlow,
            { backgroundColor: GARDEN_COLORS.emerald },
            glowStyle,
          ]}
        />
        <Animated.View style={buttonStyle}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            testID="button-check-in"
          >
            <LinearGradient
              colors={[
                "rgba(20, 36, 37, 0.94)",
                "rgba(16, 28, 29, 0.98)",
                "rgba(20, 36, 37, 0.94)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.checkInButton}
            >
              <AppIcon
                name={icon}
                size={22}
                color={GARDEN_COLORS.emerald}
                style={{ marginRight: Spacing.sm }}
              />
              <ThemedText type="h4" style={styles.checkInButtonText}>
                {label}
              </ThemedText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const defaultHabitData: HabitStreakData = {};

export default function StreakGardenScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { settings: womenSettings, derived: womenDerived } = useWomensHealth();
  const [streakData, setStreakData] = useState<StreakData>(defaultData);
  const [habitData, setHabitData] = useState<HabitStreakData>(defaultHabitData);
  const [, setLoading] = useState(true);
  const [totalStars, setTotalStars] = useState(0);
  const [rewards, setRewards] = useState<GardenRewards | null>(null);
  const [showAllRewards, setShowAllRewards] = useState(false);
  const [starsToast, setStarsToast] = useState<{
    stars: number;
    category: HabitCategoryId;
  } | null>(null);

  const today = getDateString(new Date());
  const isTodayChecked = streakData.checkedDays.includes(today);
  const isTodayProtected = streakData.protectedDays?.includes(today) ?? false;
  const protectedPause =
    womenSettings.enabled && womenDerived.streakProtection.active
      ? womenDerived.streakProtection
      : null;
  const weekDays = getCurrentWeekDays();

  const nextMilestone =
    MILESTONES.find((m) => m.days > streakData.currentStreak) ||
    MILESTONES[MILESTONES.length - 1];
  const currentStage = getGrowthStage(streakData.currentStreak);
  const nextStage = getNextGrowthStage(streakData.currentStreak);
  const daysToNextMilestone = nextMilestone.days - streakData.currentStreak;
  const daysToNextStage = nextStage
    ? nextStage.minDays - streakData.currentStreak
    : 0;

  useEffect(() => {
    loadData();
  }, []);

  // Actions logged from Prayer Times, Tasbeeh, Quran, Zakat, Duas, or
  // Arabic Learning while this screen wasn't mounted still need to show
  // up when the user comes back to look at the garden.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    try {
      const [raw, habitRaw, snapshot] = await Promise.all([
        AsyncStorage.getItem(STREAK_KEY),
        AsyncStorage.getItem(HABIT_STREAK_KEY),
        getGardenSnapshot(),
      ]);
      if (raw) {
        setStreakData(normalizeStreakData(JSON.parse(raw)));
      }
      if (habitRaw) {
        setHabitData(JSON.parse(habitRaw));
      }
      setTotalStars(snapshot.totalStars);
      setRewards(evaluateGardenRewards(snapshot));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (data: StreakData) => {
    try {
      await syncedSetItem(STREAK_KEY, JSON.stringify(data));
    } catch {}
  };

  const saveHabitData = async (data: HabitStreakData) => {
    try {
      await syncedSetItem(HABIT_STREAK_KEY, JSON.stringify(data));
    } catch {}
  };

  const weekCheckedCount = weekDays.filter((d) =>
    streakData.checkedDays.includes(getDateString(d)),
  ).length;
  const weekProtectedCount = weekDays.filter((d) =>
    (streakData.protectedDays || []).includes(getDateString(d)),
  ).length;

  const handleCheckIn = useCallback(async () => {
    if (isTodayChecked || isTodayProtected) return;

    const protectedMode = Boolean(protectedPause);
    const newCheckedDays = protectedMode
      ? streakData.checkedDays
      : [...streakData.checkedDays, today];
    const newProtectedDays = protectedMode
      ? Array.from(new Set([...(streakData.protectedDays || []), today]))
      : streakData.protectedDays || [];
    const { current, longest } = calculateStreak(
      newCheckedDays,
      newProtectedDays,
    );

    const existingDates = streakData.milestoneEarnedDates || {};
    const updatedDates = { ...existingDates };
    for (const m of MILESTONES) {
      if (!updatedDates[m.days] && (current >= m.days || longest >= m.days)) {
        updatedDates[m.days] = today;
      }
    }

    const newData: StreakData = {
      checkedDays: newCheckedDays,
      protectedDays: newProtectedDays,
      currentStreak: current,
      longestStreak: longest,
      milestoneEarnedDates: updatedDates,
    };

    setStreakData(newData);
    await saveData(newData);
  }, [streakData, today, isTodayChecked, isTodayProtected, protectedPause]);

  const handleHabitToggle = useCallback(
    async (habitId: HabitCategoryId) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const current = habitData[habitId] || {
        checkedDays: [],
        currentStreak: 0,
        longestStreak: 0,
      };
      const isChecked = current.checkedDays.includes(today);

      if (isChecked) {
        // Unchecking is a correction, not a "broken streak" — plain
        // removal, no stars clawed back, no message about it.
        const newCheckedDays = current.checkedDays.filter((d) => d !== today);
        const { current: newCurrent, longest: newLongest } =
          calculateHabitStreak(newCheckedDays);
        const updatedHabitData = {
          ...habitData,
          [habitId]: {
            checkedDays: newCheckedDays,
            currentStreak: newCurrent,
            longestStreak: newLongest,
          },
        };
        setHabitData(updatedHabitData);
        await saveHabitData(updatedHabitData);
        return;
      }

      const result = await recordGardenAction(habitId);
      setHabitData((prev) => ({
        ...prev,
        [habitId]: {
          checkedDays: [...(prev[habitId]?.checkedDays ?? []), today],
          currentStreak: result.currentStreak,
          longestStreak: result.longestStreak,
        },
      }));
      if (result.starsEarned > 0) {
        setTotalStars(result.totalStars);
        setStarsToast({ stars: result.starsEarned, category: habitId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // The hero streak may have just advanced too (first sincere action
      // of the day), so refresh it from storage rather than recomputing
      // the protected-day/milestone logic twice.
      const raw = await AsyncStorage.getItem(STREAK_KEY);
      if (raw) setStreakData(normalizeStreakData(JSON.parse(raw)));
    },
    [habitData, today],
  );

  useEffect(() => {
    if (!starsToast) return undefined;
    const timeout = setTimeout(() => setStarsToast(null), 2600);
    return () => clearTimeout(timeout);
  }, [starsToast]);

  const visibleRewardAchievements = rewards
    ? showAllRewards
      ? rewards.achievements
      : [
          ...rewards.achievements.filter((item) => item.earned).slice(-2),
          ...rewards.achievements.filter(
            (item) =>
              !item.earned &&
              item.achievement.id === rewards.nextAchievement?.id,
          ),
        ].filter(
          (item, index, items) =>
            items.findIndex(
              (candidate) => candidate.achievement.id === item.achievement.id,
            ) === index,
        )
    : [];

  return (
    <LinearGradient
      colors={[GARDEN_COLORS.bgDeep, GARDEN_COLORS.bg, GARDEN_COLORS.bg]}
      style={styles.container}
    >
      <Aurora />
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="button-back"
        >
          <AppIcon
            name="arrow-left"
            size={24}
            color={GARDEN_COLORS.goldBright}
          />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText type="h2" style={styles.headerTitle}>
            Streak Garden
          </ThemedText>
          <HeaderGoldDivider />
          <ThemedText type="caption" style={styles.headerSubtitle}>
            Nurture faith. Grow every day.
          </ThemedText>
        </View>
        <View style={styles.starsBadge} testID="text-garden-stars">
          <AppIcon name="star" size={13} color={GARDEN_COLORS.goldBright} />
          <ThemedText type="caption" style={styles.starsBadgeText}>
            {totalStars}
          </ThemedText>
        </View>
      </View>

      {starsToast ? (
        <View
          style={[styles.starsToastWrap, { top: insets.top + 78 }]}
          pointerEvents="none"
        >
          <NuraiToast
            message={`+${starsToast.stars} stars earned — ${
              HABIT_CATEGORIES.find((c) => c.id === starsToast.category)
                ?.label ?? "Garden"
            } logged today`}
            tone="success"
          />
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={styles.heroWrapper}>
            <PulsingGlow />
            <LinearGradient
              colors={["rgba(20, 36, 37, 0.92)", "rgba(16, 28, 29, 0.97)"]}
              style={styles.heroCard}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroLeft}>
                  <View style={styles.heroStageBadge}>
                    <AppIcon
                      name={currentStage.icon as any}
                      size={14}
                      color={GARDEN_COLORS.emerald}
                    />
                    <ThemedText type="caption" style={styles.heroStageText}>
                      {currentStage.label}
                    </ThemedText>
                  </View>
                  <ThemedText type="hero" style={styles.heroStreakCount}>
                    {streakData.currentStreak}
                  </ThemedText>
                  <ThemedText type="body" style={styles.heroLabel}>
                    Day Streak
                  </ThemedText>
                </View>
                <View style={styles.heroRight}>
                  <StagePlantOrb
                    stageColor={GARDEN_COLORS.emerald}
                    progress={streakData.currentStreak / nextMilestone.days}
                  />
                </View>
              </View>
              <HeroGrowthLineSvg />
              <View style={styles.heroDivider} />

              <View style={styles.heroMilestoneRow}>
                <View style={styles.heroMilestoneInfo}>
                  <AppIcon
                    name={nextMilestone.icon as any}
                    size={14}
                    color={GARDEN_COLORS.goldBright}
                  />
                  <ThemedText type="small" style={styles.heroMilestoneText}>
                    {daysToNextMilestone > 0
                      ? `${daysToNextMilestone} days to ${nextMilestone.label}`
                      : `${nextMilestone.label} reached`}
                  </ThemedText>
                </View>
                {nextStage ? (
                  <View style={styles.heroNextStageChip}>
                    <AppIcon
                      name="trending-up"
                      size={13}
                      color={GARDEN_COLORS.emerald}
                    />
                    <ThemedText type="caption" style={styles.heroNextStageText}>
                      {daysToNextStage}d
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              <ThemedText type="small" style={styles.heroMotivation}>
                {getMotivationalMessage(streakData.currentStreak)}
              </ThemedText>
            </LinearGradient>
          </View>
        </Animated.View>

        {nextStage ? (
          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <View style={styles.nextMilestoneCard}>
              <View style={styles.nextMilestoneContent}>
                <View style={styles.nextMilestoneIconWrap}>
                  <StreakGardenSvg
                    size={34}
                    color={GARDEN_COLORS.emerald}
                    accentColor={GARDEN_COLORS.goldBright}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={styles.nextMilestoneTitle}>
                    Next: {nextStage.label} Stage
                  </ThemedText>
                  <ThemedText type="caption" style={styles.nextMilestoneCopy}>
                    {daysToNextStage} more{" "}
                    {daysToNextStage === 1 ? "day" : "days"} of consistency
                  </ThemedText>
                </View>
              </View>
              <View style={styles.nextMilestoneProgress}>
                <View
                  style={[
                    styles.nextMilestoneProgressFill,
                    {
                      width: `${Math.min(((streakData.currentStreak - currentStage.minDays) / (nextStage.minDays - currentStage.minDays)) * 100, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </Animated.View>
        ) : null}

        {protectedPause ? (
          <ProtectedPauseCard
            title={protectedPause.title}
            body={protectedPause.body}
            suggestedActions={protectedPause.suggestedActions}
          />
        ) : (
          <StreakRiskCard
            currentStreak={streakData.currentStreak}
            isTodayChecked={isTodayChecked}
          />
        )}

        {!isTodayChecked && !isTodayProtected ? (
          <AnimatedCheckInButton
            onPress={handleCheckIn}
            label={protectedPause ? "Protect Today" : "Check In Today"}
            icon={protectedPause ? "shield" : "check-circle"}
          />
        ) : (
          <Animated.View
            entering={FadeInDown.delay(300).duration(500)}
            style={{ alignItems: "center", marginBottom: Spacing.xl }}
          >
            <View
              style={[
                styles.checkedInBadge,
                isTodayProtected ? styles.checkedInBadgeProtected : null,
              ]}
            >
              <AppIcon
                name={isTodayProtected ? "shield" : "check-circle"}
                size={22}
                color={GARDEN_COLORS.goldBright}
              />
              <ThemedText type="body" style={styles.checkedInBadgeText}>
                {isTodayProtected
                  ? "Streak protected today"
                  : "Checked in today"}
              </ThemedText>
            </View>
          </Animated.View>
        )}

        <HabitGardenSection
          habitData={habitData}
          onToggle={handleHabitToggle}
          today={today}
        />

        <ReflectionLogCard
          onSaved={(result) => {
            setHabitData((prev) => ({
              ...prev,
              reflection: {
                checkedDays: [...(prev.reflection?.checkedDays ?? []), today],
                currentStreak: result.currentStreak,
                longestStreak: result.longestStreak,
              },
            }));
            if (result.starsEarned > 0) {
              setTotalStars(result.totalStars);
              setStarsToast({
                stars: result.starsEarned,
                category: "reflection",
              });
            }
          }}
        />

        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <View
            style={[
              styles.card,
              {
                borderColor: theme.borderSubtle,
                backgroundColor: isDark
                  ? theme.surfaceGlass
                  : theme.surfaceGlassStrong,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <AppIcon name="calendar" size={16} color={theme.primary} />
              <ThemedText
                type="h4"
                style={[
                  styles.sectionTitle,
                  { marginBottom: 0, marginLeft: Spacing.sm },
                ]}
              >
                This Week
              </ThemedText>
            </View>
            <View style={styles.weekRow}>
              {weekDays.map((day, index) => {
                const dateStr = getDateString(day);
                const isChecked = streakData.checkedDays.includes(dateStr);
                const isProtected =
                  streakData.protectedDays?.includes(dateStr) ?? false;
                const isToday = dateStr === today;

                return (
                  <View key={index} style={styles.dayColumn}>
                    <ThemedText
                      type="caption"
                      style={{
                        color: isToday ? theme.primary : theme.textMuted,
                        fontFamily: isToday
                          ? "PlusJakartaSans_700Bold"
                          : undefined,
                      }}
                    >
                      {dayLabels[index]}
                    </ThemedText>
                    <View
                      style={[
                        styles.dayCircle,
                        isChecked
                          ? { backgroundColor: theme.primary }
                          : isProtected
                            ? {
                                backgroundColor: theme.primarySubtle,
                                borderColor: theme.primaryBorder,
                                borderWidth: 1.5,
                              }
                            : isToday
                              ? {
                                  borderColor: theme.primary,
                                  borderWidth: 2,
                                  backgroundColor: theme.primarySubtle,
                                }
                              : {
                                  borderColor: theme.borderSubtle,
                                  borderWidth: 1,
                                  backgroundColor: "transparent",
                                },
                      ]}
                    >
                      {isChecked ? (
                        <AppIcon
                          name="check"
                          size={14}
                          color={theme.primaryForeground}
                        />
                      ) : isProtected ? (
                        <AppIcon
                          name="shield"
                          size={13}
                          color={theme.primary}
                        />
                      ) : (
                        <ThemedText
                          type="caption"
                          style={{
                            color: isToday ? theme.primary : theme.textMuted,
                          }}
                        >
                          {day.getDate()}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {rewards ? (
          <Animated.View entering={FadeInDown.delay(430).duration(500)}>
            <View
              style={[
                styles.card,
                {
                  borderColor: theme.borderSubtle,
                  backgroundColor: isDark
                    ? theme.surfaceGlass
                    : theme.surfaceGlassStrong,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <AppIcon name="achievement" size={16} color={theme.scholar} />
                <ThemedText
                  type="h4"
                  style={[
                    styles.sectionTitle,
                    { marginBottom: 0, marginLeft: Spacing.sm },
                  ]}
                >
                  Rewards
                </ThemedText>
                <View style={{ flex: 1 }} />
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  {rewards.earnedCount}/{rewards.totalCount}
                </ThemedText>
              </View>

              <View style={styles.rankRow}>
                <View
                  style={[
                    styles.rankBadge,
                    {
                      backgroundColor: theme.scholarSoft,
                      borderColor: `${theme.scholar}44`,
                    },
                  ]}
                >
                  <AppIcon
                    name={rewards.rank.rank.icon}
                    size={22}
                    color={theme.scholar}
                    decorative
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: "800" }}>
                    {rewards.rank.rank.label}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, marginTop: 1 }}
                  >
                    {rewards.rank.nextRank
                      ? `${rewards.rank.starsIntoRank}/${rewards.rank.starsForNext} stars to ${rewards.rank.nextRank.label}`
                      : "Highest rank reached — masha'Allah"}
                  </ThemedText>
                  <View
                    style={[
                      styles.rankTrack,
                      { backgroundColor: theme.borderSubtle },
                    ]}
                  >
                    <View
                      style={[
                        styles.rankFill,
                        {
                          width: `${Math.round(rewards.rank.progress * 100)}%`,
                          backgroundColor: theme.scholar,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.achievementsGrid}>
                {visibleRewardAchievements.map(({ achievement, earned }) => {
                  const tierColor =
                    achievement.tier === "gold"
                      ? theme.scholar
                      : achievement.tier === "silver"
                        ? theme.primary
                        : theme.textSecondary;
                  return (
                    <View
                      key={achievement.id}
                      style={[
                        styles.achievementTile,
                        {
                          borderColor: earned
                            ? `${tierColor}55`
                            : theme.borderSubtle,
                          backgroundColor: earned
                            ? `${tierColor}14`
                            : "transparent",
                          opacity: earned ? 1 : 0.5,
                        },
                      ]}
                      accessibilityLabel={`${achievement.label}. ${earned ? "Earned" : "Locked"}. ${achievement.description}`}
                    >
                      <AppIcon
                        name={earned ? achievement.icon : "lock"}
                        size={19}
                        color={earned ? tierColor : theme.textMuted}
                        decorative
                      />
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={styles.achievementLabel}
                      >
                        {achievement.label}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={2}
                        style={[
                          styles.achievementDescription,
                          { color: theme.textMuted },
                        ]}
                      >
                        {earned ? "Earned" : achievement.description}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>

              {rewards.nextAchievement ? (
                <View
                  style={[
                    styles.nextRewardRow,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <AppIcon name="target" size={13} color={theme.primary} />
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{
                      color: theme.textSecondary,
                      flex: 1,
                      marginLeft: 6,
                    }}
                  >
                    Next: {rewards.nextAchievement.description}
                  </ThemedText>
                </View>
              ) : null}
              {rewards.totalCount > visibleRewardAchievements.length ||
              showAllRewards ? (
                <Pressable
                  onPress={() => setShowAllRewards((value) => !value)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showAllRewards ? "Show fewer rewards" : "View all rewards"
                  }
                  style={({ pressed }) => [
                    styles.rewardsDisclosure,
                    { borderColor: theme.borderSubtle },
                    pressed ? { opacity: 0.72 } : null,
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    {showAllRewards ? "Show less" : "View all rewards"}
                  </ThemedText>
                  <AppIcon
                    name={showAllRewards ? "chevron-up" : "chevron-right"}
                    size={14}
                    color={theme.primary}
                  />
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(450).duration(500)}>
          <View
            style={[
              styles.card,
              {
                borderColor: theme.borderSubtle,
                backgroundColor: isDark
                  ? theme.surfaceGlass
                  : theme.surfaceGlassStrong,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <AppIcon name="award" size={16} color={theme.primary} />
              <ThemedText
                type="h4"
                style={[
                  styles.sectionTitle,
                  { marginBottom: 0, marginLeft: Spacing.sm },
                ]}
              >
                Milestones
              </ThemedText>
            </View>
            <View style={styles.milestonesGrid}>
              {MILESTONES.map((milestone, index) => {
                const achieved =
                  streakData.longestStreak >= milestone.days ||
                  streakData.currentStreak >= milestone.days;
                const earnedDate =
                  streakData.milestoneEarnedDates?.[milestone.days];
                const formattedDate = earnedDate
                  ? new Date(earnedDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : null;

                return (
                  <Animated.View
                    key={milestone.days}
                    entering={FadeInDown.delay(500 + index * 80).duration(400)}
                    style={styles.milestoneOuter}
                  >
                    <View
                      style={[
                        styles.milestoneItem,
                        {
                          backgroundColor: achieved
                            ? theme.primaryMuted
                            : theme.surfaceGlass,
                          borderColor: achieved
                            ? theme.primaryBorder
                            : theme.borderSubtle,
                        },
                      ]}
                    >
                      {!achieved ? (
                        <View
                          style={[
                            styles.milestoneLockedOverlay,
                            { backgroundColor: theme.surfaceGlass },
                          ]}
                        />
                      ) : null}
                      <View
                        style={[
                          styles.milestoneIcon,
                          {
                            backgroundColor: achieved
                              ? theme.primarySubtle
                              : theme.surfaceGlass,
                          },
                        ]}
                      >
                        <AppIcon
                          name={achieved ? milestone.icon : ("lock" as any)}
                          size={18}
                          color={achieved ? theme.primary : theme.textMuted}
                        />
                      </View>
                      <ThemedText
                        type="caption"
                        style={{
                          color: achieved ? theme.text : theme.textMuted,
                          fontFamily: "PlusJakartaSans_600SemiBold",
                          marginTop: Spacing.xs,
                        }}
                      >
                        {milestone.label}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{
                          color: achieved
                            ? theme.textSecondary
                            : theme.textMuted,
                          fontSize: 10,
                        }}
                      >
                        {achieved && formattedDate
                          ? formattedDate
                          : `${milestone.days} days`}
                      </ThemedText>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        <WeeklyReflectionCard
          weekCheckedCount={weekCheckedCount}
          weekProtectedCount={weekProtectedCount}
          habitData={habitData}
          totalStreak={streakData.currentStreak}
          protectedPauseActive={Boolean(protectedPause)}
          protectedPauseReason={protectedPause?.title}
        />

        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <View
            style={[
              styles.card,
              {
                borderColor: theme.borderSubtle,
                backgroundColor: isDark
                  ? theme.surfaceGlass
                  : theme.surfaceGlassStrong,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <AppIcon name="bar-chart-2" size={16} color={theme.primary} />
              <ThemedText
                type="h4"
                style={[
                  styles.sectionTitle,
                  { marginBottom: 0, marginLeft: Spacing.sm },
                ]}
              >
                Statistics
              </ThemedText>
            </View>
            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: theme.primaryMuted },
                ]}
              >
                <ThemedText type="h2" style={{ color: theme.primary }}>
                  {streakData.currentStreak}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
                >
                  Current
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: theme.surfaceGlass },
                ]}
              >
                <ThemedText type="h2" style={{ color: theme.warning }}>
                  {streakData.longestStreak}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
                >
                  Longest
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: theme.surfaceGlass },
                ]}
              >
                <ThemedText type="h2" style={{ color: theme.info }}>
                  {streakData.checkedDays.length}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
                >
                  Total
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GARDEN_COLORS.bgDeep,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingBottom: 10,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(207,174,105,0.5)",
    backgroundColor: "rgba(10, 32, 23, 0.82)",
    shadowColor: GARDEN_COLORS.goldBright,
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingTop: 2,
  },
  starsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(207,174,105,0.34)",
    backgroundColor: "rgba(10, 32, 23, 0.82)",
  },
  starsBadgeText: {
    color: GARDEN_COLORS.goldBright,
    fontWeight: "700",
  },
  starsToastWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
  },
  headerTitle: {
    textAlign: "center",
    color: GARDEN_COLORS.text,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 31,
    lineHeight: 38,
    letterSpacing: 0,
  },
  headerSubtitle: {
    color: GARDEN_COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12.5,
    marginTop: -2,
  },
  headerDividerSvg: {
    marginTop: -2,
    marginBottom: -2,
  },
  heroWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  heroGlow: {
    position: "absolute",
    top: 6,
    left: "8%",
    right: "8%",
    height: 95,
    borderRadius: 48,
    shadowColor: GARDEN_COLORS.emerald,
    shadowOpacity: 0.65,
    shadowRadius: 34,
  },
  heroCard: {
    borderRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 21,
    paddingBottom: 17,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(207,174,105,0.34)",
    shadowColor: GARDEN_COLORS.emerald,
    shadowOpacity: 0.18,
    shadowRadius: 22,
  },
  heroGoldDivider: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLeft: {
    flex: 1,
  },
  heroRight: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  progressRingCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  heroStageBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(99,245,179,0.38)",
    backgroundColor: "rgba(99,245,179,0.12)",
    alignSelf: "flex-start",
    marginBottom: 14,
    gap: 8,
  },
  heroStageText: {
    color: GARDEN_COLORS.emerald,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
  },
  heroStreakCount: {
    color: GARDEN_COLORS.text,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 70,
    lineHeight: 76,
    letterSpacing: 0,
  },
  heroLabel: {
    color: GARDEN_COLORS.emerald,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 22,
    lineHeight: 28,
    marginTop: -3,
  },
  heroDivider: {
    height: 1,
    marginTop: 8,
    marginBottom: 18,
    backgroundColor: "rgba(184,194,189,0.14)",
  },
  heroGrowthLine: {
    marginTop: 5,
  },
  heroMilestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroMilestoneInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroMilestoneText: {
    color: GARDEN_COLORS.text,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    marginLeft: 10,
  },
  heroNextStageChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(207,174,105,0.38)",
    backgroundColor: "rgba(207,174,105,0.08)",
    gap: 5,
  },
  heroNextStageText: {
    color: GARDEN_COLORS.emerald,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 14,
  },
  heroMotivation: {
    color: GARDEN_COLORS.muted,
    marginTop: 7,
    paddingLeft: 24,
    textAlign: "left",
    lineHeight: 19,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
  },
  stageOrbWrap: {
    width: 142,
    height: 142,
    alignItems: "center",
    justifyContent: "center",
  },
  nextMilestoneCard: {
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(207,174,105,0.26)",
    backgroundColor: "rgba(8, 38, 29, 0.82)",
    padding: 14,
    marginBottom: 18,
    overflow: "hidden",
  },
  nextMilestoneContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  nextMilestoneIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(99,245,179,0.24)",
    backgroundColor: "rgba(99,245,179,0.1)",
  },
  nextMilestoneTitle: {
    color: GARDEN_COLORS.text,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 17,
  },
  nextMilestoneCopy: {
    color: GARDEN_COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    marginTop: 3,
  },
  nextMilestoneProgress: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(99,245,179,0.12)",
    marginLeft: 72,
    marginTop: -12,
  },
  nextMilestoneProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: GARDEN_COLORS.emerald,
    shadowColor: GARDEN_COLORS.emerald,
    shadowOpacity: 0.8,
    shadowRadius: 9,
  },
  checkedInBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "92%",
    minHeight: 62,
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(207,174,105,0.68)",
    backgroundColor: "rgba(8, 50, 36, 0.92)",
    shadowColor: GARDEN_COLORS.goldBright,
    shadowOpacity: 0.46,
    shadowRadius: 18,
  },
  checkedInBadgeProtected: {
    borderColor: "rgba(99,245,179,0.62)",
  },
  checkedInBadgeText: {
    color: GARDEN_COLORS.goldBright,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 21,
    marginLeft: 10,
  },
  riskCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  riskIconWrap: {
    width: Spacing["4xl"],
    height: Spacing["4xl"],
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  pauseActionChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  card: {
    borderRadius: 25,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    overflow: "hidden",
    borderColor: "rgba(207,174,105,0.18)",
    backgroundColor: "rgba(8, 38, 29, 0.76)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  habitGardenBlock: {
    marginBottom: 18,
  },
  gardenSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  gardenSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  gardenSectionTitle: {
    color: GARDEN_COLORS.text,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  gardenSectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(207,174,105,0.22)",
  },
  gardenSectionSubtitle: {
    color: GARDEN_COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12.5,
    marginLeft: 46,
    marginBottom: 12,
  },
  reflectionLogCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(207,174,105,0.22)",
    backgroundColor: GARDEN_COLORS.glass,
    padding: 18,
    gap: 10,
    marginBottom: 22,
  },
  reflectionInput: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(232,246,239,0.18)",
    backgroundColor: "rgba(4, 20, 15, 0.55)",
    color: GARDEN_COLORS.text,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    padding: 12,
    textAlignVertical: "top",
  },
  reflectionSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "flex-start",
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: GARDEN_COLORS.goldBright,
  },
  reflectionSavedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 82,
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderRadius: 17,
    borderWidth: 1,
    marginBottom: 10,
    gap: 13,
    backgroundColor: "rgba(7, 36, 28, 0.88)",
    shadowColor: GARDEN_COLORS.emerald,
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  habitIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  habitInfo: {
    flex: 1,
  },
  habitLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  habitName: {
    color: GARDEN_COLORS.text,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 17,
  },
  habitStageBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
  },
  habitStageText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
  },
  habitProgressRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  habitProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  habitProgressFill: {
    height: "100%",
    borderRadius: 999,
    shadowColor: GARDEN_COLORS.emerald,
    shadowOpacity: 0.5,
    shadowRadius: 7,
  },
  habitDays: {
    color: GARDEN_COLORS.muted,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    marginLeft: 11,
    minWidth: 30,
    textAlign: "right",
  },
  habitCheckBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayColumn: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  dayCircle: {
    width: Spacing["4xl"],
    height: Spacing["4xl"],
    borderRadius: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  checkInButton: {
    minWidth: 320,
    minHeight: 62,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.5)",
    shadowColor: GARDEN_COLORS.emerald,
    shadowOpacity: 0.26,
    shadowRadius: 16,
  },
  checkInGlow: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 999,
  },
  checkInButtonText: {
    color: GARDEN_COLORS.emerald,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 21,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  rankBadge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rankTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  rankFill: {
    height: "100%",
    borderRadius: 3,
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  achievementTile: {
    width: "48.5%",
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 3,
  },
  achievementLabel: {
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
    fontSize: 11,
  },
  achievementDescription: {
    textAlign: "center",
    fontSize: 9,
    lineHeight: 13,
  },
  rewardsDisclosure: {
    minHeight: 44,
    marginTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nextRewardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  milestonesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "space-between",
  },
  milestoneOuter: {
    width: "31%",
    marginBottom: Spacing.xs,
  },
  milestoneItem: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  milestoneLockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  milestoneIcon: {
    width: Spacing["4xl"],
    height: Spacing["4xl"],
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  reflectionPromptBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  reflectionStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  reflectionStatItem: {
    alignItems: "center",
    flex: 1,
  },
  reflectionDivider: {
    width: 1,
    height: Spacing["2xl"],
  },
  deepReflectionSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    minHeight: 120,
  },
  deepReflectionContent: {
    minHeight: 100,
  },
  deepReflectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  deepReflectionResult: {
    gap: Spacing.md,
  },
  deepTrustCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: -Spacing.sm,
  },
  deepTrustText: {
    flex: 1,
    lineHeight: 18,
  },
  deepEvidenceSection: {
    gap: Spacing.sm,
  },
  deepEvidenceLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  deepEvidenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  deepActionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  deepActionNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  deepReflectionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
});
