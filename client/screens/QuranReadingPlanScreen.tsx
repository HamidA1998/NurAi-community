import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { syncedSetItem } from "@/lib/progress-sync";
import { VERSE_COUNTS } from "@/lib/quran-progress";
import {
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
  QuranIconSvg,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

const STORAGE_KEY = "quran-reading-plan";

type PlanType = "30" | "60" | "365";

interface ReadingPlanData {
  planType: PlanType;
  startDate: string;
  completedDays: number[];
  currentDay: number;
}

const JUZ_DATA = [
  { juz: 1, startSurah: 1, startVerse: 1, endSurah: 2, endVerse: 141 },
  { juz: 2, startSurah: 2, startVerse: 142, endSurah: 2, endVerse: 252 },
  { juz: 3, startSurah: 2, startVerse: 253, endSurah: 3, endVerse: 91 },
  { juz: 4, startSurah: 3, startVerse: 92, endSurah: 4, endVerse: 23 },
  { juz: 5, startSurah: 4, startVerse: 24, endSurah: 4, endVerse: 147 },
  { juz: 6, startSurah: 4, startVerse: 148, endSurah: 5, endVerse: 81 },
  { juz: 7, startSurah: 5, startVerse: 82, endSurah: 6, endVerse: 110 },
  { juz: 8, startSurah: 6, startVerse: 111, endSurah: 7, endVerse: 87 },
  { juz: 9, startSurah: 7, startVerse: 88, endSurah: 8, endVerse: 40 },
  { juz: 10, startSurah: 8, startVerse: 41, endSurah: 9, endVerse: 92 },
  { juz: 11, startSurah: 9, startVerse: 93, endSurah: 11, endVerse: 5 },
  { juz: 12, startSurah: 11, startVerse: 6, endSurah: 12, endVerse: 52 },
  { juz: 13, startSurah: 12, startVerse: 53, endSurah: 14, endVerse: 52 },
  { juz: 14, startSurah: 15, startVerse: 1, endSurah: 16, endVerse: 128 },
  { juz: 15, startSurah: 17, startVerse: 1, endSurah: 18, endVerse: 74 },
  { juz: 16, startSurah: 18, startVerse: 75, endSurah: 20, endVerse: 135 },
  { juz: 17, startSurah: 21, startVerse: 1, endSurah: 22, endVerse: 78 },
  { juz: 18, startSurah: 23, startVerse: 1, endSurah: 25, endVerse: 20 },
  { juz: 19, startSurah: 25, startVerse: 21, endSurah: 27, endVerse: 55 },
  { juz: 20, startSurah: 27, startVerse: 56, endSurah: 29, endVerse: 45 },
  { juz: 21, startSurah: 29, startVerse: 46, endSurah: 33, endVerse: 30 },
  { juz: 22, startSurah: 33, startVerse: 31, endSurah: 36, endVerse: 27 },
  { juz: 23, startSurah: 36, startVerse: 28, endSurah: 39, endVerse: 31 },
  { juz: 24, startSurah: 39, startVerse: 32, endSurah: 41, endVerse: 46 },
  { juz: 25, startSurah: 41, startVerse: 47, endSurah: 45, endVerse: 37 },
  { juz: 26, startSurah: 46, startVerse: 1, endSurah: 51, endVerse: 30 },
  { juz: 27, startSurah: 51, startVerse: 31, endSurah: 57, endVerse: 29 },
  { juz: 28, startSurah: 58, startVerse: 1, endSurah: 66, endVerse: 12 },
  { juz: 29, startSurah: 67, startVerse: 1, endSurah: 77, endVerse: 50 },
  { juz: 30, startSurah: 78, startVerse: 1, endSurah: 114, endVerse: 6 },
];

const SURAH_NAMES = [
  "Al-Fatihah",
  "Al-Baqarah",
  "Aal-E-Imran",
  "An-Nisa",
  "Al-Ma'idah",
  "Al-An'am",
  "Al-A'raf",
  "Al-Anfal",
  "At-Tawbah",
  "Yunus",
  "Hud",
  "Yusuf",
  "Ar-Ra'd",
  "Ibrahim",
  "Al-Hijr",
  "An-Nahl",
  "Al-Isra",
  "Al-Kahf",
  "Maryam",
  "Ta-Ha",
  "Al-Anbiya",
  "Al-Hajj",
  "Al-Mu'minun",
  "An-Nur",
  "Al-Furqan",
  "Ash-Shu'ara",
  "An-Naml",
  "Al-Qasas",
  "Al-Ankabut",
  "Ar-Rum",
  "Luqman",
  "As-Sajdah",
  "Al-Ahzab",
  "Saba",
  "Fatir",
  "Ya-Sin",
  "As-Saffat",
  "Sad",
  "Az-Zumar",
  "Ghafir",
  "Fussilat",
  "Ash-Shura",
  "Az-Zukhruf",
  "Ad-Dukhan",
  "Al-Jathiyah",
  "Al-Ahqaf",
  "Muhammad",
  "Al-Fath",
  "Al-Hujurat",
  "Qaf",
  "Adh-Dhariyat",
  "At-Tur",
  "An-Najm",
  "Al-Qamar",
  "Ar-Rahman",
  "Al-Waqi'ah",
  "Al-Hadid",
  "Al-Mujadilah",
  "Al-Hashr",
  "Al-Mumtahanah",
  "As-Saff",
  "Al-Jumu'ah",
  "Al-Munafiqun",
  "At-Taghabun",
  "At-Talaq",
  "At-Tahrim",
  "Al-Mulk",
  "Al-Qalam",
  "Al-Haqqah",
  "Al-Ma'arij",
  "Nuh",
  "Al-Jinn",
  "Al-Muzzammil",
  "Al-Muddaththir",
  "Al-Qiyamah",
  "Al-Insan",
  "Al-Mursalat",
  "An-Naba",
  "An-Nazi'at",
  "Abasa",
  "At-Takwir",
  "Al-Infitar",
  "Al-Mutaffifin",
  "Al-Inshiqaq",
  "Al-Buruj",
  "At-Tariq",
  "Al-A'la",
  "Al-Ghashiyah",
  "Al-Fajr",
  "Al-Balad",
  "Ash-Shams",
  "Al-Layl",
  "Ad-Dhuha",
  "Ash-Sharh",
  "At-Tin",
  "Al-Alaq",
  "Al-Qadr",
  "Al-Bayyinah",
  "Az-Zalzalah",
  "Al-Adiyat",
  "Al-Qari'ah",
  "At-Takathur",
  "Al-Asr",
  "Al-Humazah",
  "Al-Fil",
  "Quraysh",
  "Al-Ma'un",
  "Al-Kawthar",
  "Al-Kafirun",
  "An-Nasr",
  "Al-Masad",
  "Al-Ikhlas",
  "Al-Falaq",
  "An-Nas",
];

const PLAN_OPTIONS: {
  type: PlanType;
  label: string;
  days: number;
  daily: string;
  time: string;
  bestFor: string;
  rhythm: string;
}[] = [
  {
    type: "30",
    label: "30 Days",
    days: 30,
    daily: "1 Juz per day",
    time: "~40 min/day",
    bestFor: "Ramadan pace",
    rhythm: "A focused daily reading block",
  },
  {
    type: "60",
    label: "60 Days",
    days: 60,
    daily: "Half a Juz per day",
    time: "~20 min/day",
    bestFor: "Balanced routine",
    rhythm: "Morning and evening split",
  },
  {
    type: "365",
    label: "1 Year",
    days: 365,
    daily: "~2 pages per day",
    time: "~10 min/day",
    bestFor: "Long-term habit",
    rhythm: "Small daily consistency",
  },
];

const PLAN_PILLARS: {
  title: string;
  body: string;
  icon: AppIconName;
}[] = [
  {
    title: "Daily portion",
    body: "Know exactly what to read today.",
    icon: "bookmark",
  },
  {
    title: "Gentle streak",
    body: "Progress rewards consistency without pressure.",
    icon: "zap",
  },
  {
    title: "Visible journey",
    body: "Track where you are in the khatm.",
    icon: "bar-chart-2",
  },
];

function getCurrentDay(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, diff + 1);
}

function getDailyReading(
  planType: PlanType,
  dayNumber: number,
): { title: string; description: string } {
  const totalDays = planType === "30" ? 30 : planType === "60" ? 60 : 365;
  const clampedDay = Math.min(dayNumber, totalDays);

  if (planType === "30") {
    const juzIndex = Math.min(clampedDay - 1, 29);
    const juz = JUZ_DATA[juzIndex];
    const startName = SURAH_NAMES[juz.startSurah - 1];
    const endName = SURAH_NAMES[juz.endSurah - 1];
    return {
      title: `Juz ${juz.juz}`,
      description: `${startName} ${juz.startVerse} - ${endName} ${juz.endVerse}`,
    };
  }

  if (planType === "60") {
    const halfJuzIndex = clampedDay - 1;
    const juzIndex = Math.floor(halfJuzIndex / 2);
    const isSecondHalf = halfJuzIndex % 2 === 1;
    const juz = JUZ_DATA[Math.min(juzIndex, 29)];

    if (!isSecondHalf) {
      const startName = SURAH_NAMES[juz.startSurah - 1];
      return {
        title: `Juz ${juz.juz} (First Half)`,
        description: `Starting from ${startName} ${juz.startVerse}`,
      };
    } else {
      const endName = SURAH_NAMES[juz.endSurah - 1];
      return {
        title: `Juz ${juz.juz} (Second Half)`,
        description: `Ending at ${endName} ${juz.endVerse}`,
      };
    }
  }

  const totalVerses = 6236;
  const versesPerDay = Math.ceil(totalVerses / 365);
  const startVerse = (clampedDay - 1) * versesPerDay + 1;
  const endVerse = Math.min(clampedDay * versesPerDay, totalVerses);

  let currentVerse = 0;
  let startSurah = 1;
  let startV = 1;
  let endSurah = 1;
  let endV = 1;

  for (let i = 0; i < VERSE_COUNTS.length; i++) {
    if (currentVerse + VERSE_COUNTS[i] >= startVerse) {
      startSurah = i + 1;
      startV = startVerse - currentVerse;
      break;
    }
    currentVerse += VERSE_COUNTS[i];
  }

  currentVerse = 0;
  for (let i = 0; i < VERSE_COUNTS.length; i++) {
    if (currentVerse + VERSE_COUNTS[i] >= endVerse) {
      endSurah = i + 1;
      endV = endVerse - currentVerse;
      break;
    }
    currentVerse += VERSE_COUNTS[i];
  }

  const startName = SURAH_NAMES[startSurah - 1];
  const endName = SURAH_NAMES[endSurah - 1];

  return {
    title: `Day ${clampedDay} Reading`,
    description: `${startName} ${startV} - ${endName} ${endV} (~${versesPerDay} verses)`,
  };
}

function getStreak(completedDays: number[], currentDay: number): number {
  let streak = 0;
  for (let d = currentDay; d >= 1; d--) {
    if (completedDays.includes(d)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function QuranReadingPlanScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [planData, setPlanData] = useState<ReadingPlanData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadPlan();
    }, []),
  );

  const loadPlan = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: ReadingPlanData = JSON.parse(raw);
        data.currentDay = getCurrentDay(data.startDate);
        setPlanData(data);
      } else {
        setPlanData(null);
      }
    } catch {
      setPlanData(null);
    }
    setLoading(false);
  };

  const savePlan = async (data: ReadingPlanData) => {
    await syncedSetItem(STORAGE_KEY, JSON.stringify(data));
    setPlanData(data);
  };

  const startPlan = async () => {
    if (!selectedPlan) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newPlan: ReadingPlanData = {
      planType: selectedPlan,
      startDate: new Date().toISOString(),
      completedDays: [],
      currentDay: 1,
    };
    await savePlan(newPlan);
  };

  const markDayComplete = async () => {
    if (!planData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = { ...planData };
    if (!updated.completedDays.includes(updated.currentDay)) {
      updated.completedDays = [...updated.completedDays, updated.currentDay];
    }
    await savePlan(updated);
  };

  const resetPlan = () => {
    Alert.alert(
      "Reset Reading Plan",
      "Are you sure you want to reset your reading plan? All progress will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await AsyncStorage.removeItem(STORAGE_KEY);
            setPlanData(null);
            setSelectedPlan(null);
          },
        },
      ],
    );
  };

  const totalDays = planData
    ? planData.planType === "30"
      ? 30
      : planData.planType === "60"
        ? 60
        : 365
    : 0;
  const completedCount = planData ? planData.completedDays.length : 0;
  const progressPercent =
    totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;
  const streak = planData
    ? getStreak(planData.completedDays, planData.currentDay)
    : 0;
  const todayReading = planData
    ? getDailyReading(planData.planType, planData.currentDay)
    : null;
  const isTodayComplete = planData
    ? planData.completedDays.includes(planData.currentDay)
    : false;

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            testID="button-reading-plan-back"
          >
            <AppIcon name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h2">Reading Plan</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
          testID="button-reading-plan-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitleBlock}>
          <ThemedText type="h2" style={{ color: theme.text }}>
            Reading Plan
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Build Quran consistency
          </ThemedText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {planData ? (
          <ActivePlanView
            planData={planData}
            theme={theme}
            isDark={isDark}
            totalDays={totalDays}
            completedCount={completedCount}
            progressPercent={progressPercent}
            streak={streak}
            todayReading={todayReading}
            isTodayComplete={isTodayComplete}
            onMarkComplete={markDayComplete}
            onReset={resetPlan}
          />
        ) : (
          <PlanSelectionView
            theme={theme}
            isDark={isDark}
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
            onStartPlan={startPlan}
          />
        )}
      </ScrollView>
    </View>
  );
}

function PlanSelectionView({
  theme,
  isDark,
  selectedPlan,
  onSelectPlan,
  onStartPlan,
}: {
  theme: any;
  isDark: boolean;
  selectedPlan: PlanType | null;
  onSelectPlan: (p: PlanType) => void;
  onStartPlan: () => void;
}) {
  return (
    <View>
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[
          styles.motivationSection,
          {
            backgroundColor: theme.surfaceGlass,
            borderColor: `${theme.scholar}35`,
          },
        ]}
      >
        <GeometricCardPattern color={theme.scholar} opacity={0.012} />
        <View
          style={[
            styles.motivationIcon,
            {
              backgroundColor: `${theme.primary}18`,
            },
          ]}
        >
          <QuranIconSvg
            size={38}
            color={theme.primary}
            accentColor={theme.scholar}
          />
        </View>
        <ThemedText
          type="caption"
          style={[styles.heroEyebrow, { color: theme.scholar }]}
        >
          Guided khatm
        </ThemedText>
        <ThemedText
          type="h3"
          style={[styles.motivationTitle, { color: theme.text }]}
        >
          Complete the Quran
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.motivationSubtitle, { color: theme.textSecondary }]}
        >
          Choose a reading plan that fits your schedule and build a consistent
          habit of reciting the Quran.
        </ThemedText>
        <GoldDivider
          color={theme.scholar}
          opacity={0.55}
          style={styles.motivationDivider}
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(80).duration(400)}
        style={styles.planPillars}
      >
        {PLAN_PILLARS.map((pillar) => (
          <View
            key={pillar.title}
            style={[
              styles.planPillarCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <View
              style={[
                styles.planPillarIcon,
                { backgroundColor: `${theme.primary}16` },
              ]}
            >
              <AppIcon name={pillar.icon} size={15} color={theme.primary} />
            </View>
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{ color: theme.text, fontWeight: "900" }}
            >
              {pillar.title}
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, lineHeight: 16 }}
            >
              {pillar.body}
            </ThemedText>
          </View>
        ))}
      </Animated.View>

      {PLAN_OPTIONS.map((plan, index) => (
        <AnimatedPressable
          key={plan.type}
          entering={FadeInDown.delay(100 + index * 100).duration(400)}
          style={({ pressed }) => [
            styles.planCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor:
                selectedPlan === plan.type ? theme.primary : theme.border,
              borderWidth: selectedPlan === plan.type ? 2 : 1,
            },
            pressed ? { opacity: 0.8, transform: [{ scale: 0.98 }] } : null,
          ]}
          onPress={() => onSelectPlan(plan.type)}
          testID={`plan-card-${plan.type}`}
        >
          <View style={styles.planCardHeader}>
            <View
              style={[
                styles.planBadge,
                {
                  backgroundColor: isDark
                    ? theme.gradientStart
                    : theme.gradientLightBg,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{ color: theme.primary, fontWeight: "700" }}
              >
                {plan.label}
              </ThemedText>
            </View>
            {selectedPlan === plan.type ? (
              <View
                style={[styles.checkCircle, { backgroundColor: theme.primary }]}
              >
                <AppIcon name="check" size={14} color="#FFFFFF" />
              </View>
            ) : (
              <View
                style={[
                  styles.checkCircle,
                  {
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    borderColor: theme.border,
                  },
                ]}
              />
            )}
          </View>
          <ThemedText
            type="body"
            style={{ fontWeight: "600", marginTop: Spacing.sm }}
          >
            {plan.daily}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{
              color: theme.textSecondary,
              marginTop: 3,
              lineHeight: 18,
            }}
          >
            {plan.bestFor} - {plan.rhythm}
          </ThemedText>
          <View style={styles.planTimeRow}>
            <AppIcon name="clock" size={14} color={theme.textMuted} />
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginLeft: Spacing.xs }}
            >
              {plan.time}
            </ThemedText>
          </View>
        </AnimatedPressable>
      ))}

      <Animated.View entering={FadeInDown.delay(500).duration(400)}>
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            {
              backgroundColor: selectedPlan ? theme.primary : theme.disabled,
              opacity: pressed && selectedPlan ? 0.8 : 1,
            },
          ]}
          onPress={onStartPlan}
          disabled={!selectedPlan}
          testID="button-start-plan"
        >
          <ThemedText
            type="body"
            style={{
              color: selectedPlan ? "#FFFFFF" : theme.textMuted,
              fontWeight: "700",
            }}
          >
            Start Plan
          </ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function ActivePlanView({
  planData,
  theme,
  isDark,
  totalDays,
  completedCount,
  progressPercent,
  streak,
  todayReading,
  isTodayComplete,
  onMarkComplete,
  onReset,
}: {
  planData: ReadingPlanData;
  theme: any;
  isDark: boolean;
  totalDays: number;
  completedCount: number;
  progressPercent: number;
  streak: number;
  todayReading: { title: string; description: string } | null;
  isTodayComplete: boolean;
  onMarkComplete: () => void;
  onReset: () => void;
}) {
  const planLabel =
    planData.planType === "30"
      ? "30-Day Plan"
      : planData.planType === "60"
        ? "60-Day Plan"
        : "1-Year Plan";

  const daysToShow = Math.min(totalDays, 42);
  const weekStart = Math.max(
    1,
    Math.floor((planData.currentDay - 1) / 7) * 7 + 1,
  );
  const visibleDays = Array.from(
    { length: daysToShow },
    (_, i) => weekStart + i,
  ).filter((d) => d <= totalDays);

  return (
    <View>
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[
          styles.progressCard,
          {
            backgroundColor: theme.surfaceGlass,
            borderColor: `${theme.scholar}35`,
          },
        ]}
      >
        <GeometricCardPattern color={theme.scholar} opacity={0.012} />
        <View style={styles.progressHeader}>
          <View
            style={[
              styles.planTypeBadge,
              {
                backgroundColor: isDark
                  ? theme.gradientStart
                  : theme.gradientLightBg,
              },
            ]}
          >
            <ThemedText
              type="caption"
              style={{ color: theme.primary, fontWeight: "700" }}
            >
              {planLabel}
            </ThemedText>
          </View>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Day {Math.min(planData.currentDay, totalDays)} of {totalDays}
          </ThemedText>
        </View>

        <View style={styles.activePlanSummaryRow}>
          <View style={styles.activePlanSummaryItem}>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Completed
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.primary }}>
              {completedCount}
            </ThemedText>
          </View>
          <View
            style={[
              styles.activePlanSummaryDivider,
              { backgroundColor: theme.borderSubtle },
            ]}
          />
          <View style={styles.activePlanSummaryItem}>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Remaining
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.scholar }}>
              {Math.max(totalDays - completedCount, 0)}
            </ThemedText>
          </View>
          <View
            style={[
              styles.activePlanSummaryDivider,
              { backgroundColor: theme.borderSubtle },
            ]}
          />
          <View style={styles.activePlanSummaryItem}>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Streak
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.primary }}>
              {streak}d
            </ThemedText>
          </View>
        </View>

        <View style={styles.progressRingContainer}>
          <View
            style={[
              styles.progressRingOuter,
              { borderColor: isDark ? theme.border : theme.backgroundTertiary },
            ]}
          >
            <View
              style={[
                styles.progressRingFill,
                {
                  borderColor: theme.primary,
                  borderTopColor:
                    progressPercent >= 25 ? theme.primary : "transparent",
                  borderRightColor:
                    progressPercent >= 50 ? theme.primary : "transparent",
                  borderBottomColor:
                    progressPercent >= 75 ? theme.primary : "transparent",
                  borderLeftColor:
                    progressPercent >= 100 ? theme.primary : "transparent",
                  transform: [
                    { rotate: `${(progressPercent / 100) * 360}deg` },
                  ],
                },
              ]}
            />
            <View
              style={[
                styles.progressRingInner,
                { backgroundColor: theme.surfaceGlass },
              ]}
            >
              <ThemedText type="h2" style={{ color: theme.primary }}>
                {progressPercent}%
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {completedCount}/{totalDays} days
              </ThemedText>
            </View>
          </View>
        </View>
      </Animated.View>

      {todayReading ? (
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={[
            styles.todayCard,
            { backgroundColor: theme.surfaceGlass, borderColor: theme.border },
          ]}
        >
          <View style={styles.todayHeader}>
            <View
              style={[
                styles.todayIconContainer,
                {
                  backgroundColor: isDark
                    ? theme.gradientStart
                    : theme.gradientLightBg,
                },
              ]}
            >
              <AppIcon name="bookmark" size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Today's Reading
              </ThemedText>
              <ThemedText type="h4">{todayReading.title}</ThemedText>
            </View>
          </View>
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
          >
            {todayReading.description}
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.markCompleteBtn,
              {
                backgroundColor: isTodayComplete
                  ? isDark
                    ? theme.gradientStart
                    : theme.gradientLightBg
                  : theme.primary,
                opacity: pressed && !isTodayComplete ? 0.8 : 1,
              },
            ]}
            onPress={onMarkComplete}
            disabled={isTodayComplete}
            testID="button-mark-complete"
          >
            <AppIcon
              name={isTodayComplete ? "check-circle" : "check"}
              size={18}
              color={isTodayComplete ? theme.primary : "#FFFFFF"}
            />
            <Text
              style={[
                styles.markCompleteBtnText,
                { color: isTodayComplete ? theme.primary : "#FFFFFF" },
              ]}
            >
              {isTodayComplete ? "Completed" : "Mark Complete"}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      <Animated.View
        entering={FadeInDown.delay(200).duration(400)}
        style={[
          styles.streakCard,
          { backgroundColor: theme.surfaceGlass, borderColor: theme.border },
        ]}
      >
        <View style={styles.streakRow}>
          <View
            style={[
              styles.streakIconContainer,
              { backgroundColor: isDark ? "#422006" : "#FFFBEB" },
            ]}
          >
            <AppIcon
              name="zap"
              size={20}
              color={isDark ? "#FBBF24" : "#D97706"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Current Streak
            </ThemedText>
            <ThemedText type="h3">
              {streak} {streak === 1 ? "day" : "days"}
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).duration(400)}
        style={[
          styles.calendarCard,
          { backgroundColor: theme.surfaceGlass, borderColor: theme.border },
        ]}
      >
        <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
          Progress Calendar
        </ThemedText>
        <View style={styles.weekDayLabels}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <View key={i} style={styles.weekDayLabelCell}>
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, fontWeight: "600" }}
              >
                {d}
              </ThemedText>
            </View>
          ))}
        </View>
        <View style={styles.dayGrid}>
          {visibleDays.map((day) => {
            const isCompleted = planData.completedDays.includes(day);
            const isCurrent = day === planData.currentDay;
            return (
              <View key={day} style={styles.dayCell}>
                <View
                  style={[
                    styles.dayCircle,
                    {
                      backgroundColor: isCompleted
                        ? theme.primary
                        : isCurrent
                          ? isDark
                            ? theme.gradientStart
                            : theme.gradientLightBg
                          : "transparent",
                      borderWidth: isCurrent && !isCompleted ? 2 : 0,
                      borderColor: theme.primary,
                    },
                  ]}
                >
                  {isCompleted ? (
                    <AppIcon name="check" size={12} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.dayText,
                        {
                          color: isCurrent
                            ? theme.primary
                            : day < planData.currentDay
                              ? theme.textMuted
                              : theme.textSecondary,
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <Pressable
          style={({ pressed }) => [
            styles.resetButton,
            { borderColor: theme.error, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={onReset}
          testID="button-reset-plan"
        >
          <AppIcon name="refresh-cw" size={16} color={theme.error} />
          <Text style={[styles.resetButtonText, { color: theme.error }]}>
            Reset Plan
          </Text>
        </Pressable>
      </Animated.View>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  motivationSection: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing["2xl"],
    overflow: "hidden",
  },
  motivationIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  motivationTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
  },
  motivationSubtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  motivationDivider: {
    width: 150,
    marginTop: Spacing.lg,
  },
  planPillars: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  planPillarCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 5,
    minHeight: 122,
  },
  planPillarIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  planCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  planTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  startButton: {
    height: 52,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  progressCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  activePlanSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  activePlanSummaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  activePlanSummaryDivider: {
    width: 1,
    height: 34,
  },
  planTypeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  progressRingContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  progressRingOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  progressRingFill: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
  },
  progressRingInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  todayCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  todayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  todayIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  markCompleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  markCompleteBtnText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  streakCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  streakIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  weekDayLabels: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  weekDayLabelCell: {
    flex: 1,
    alignItems: "center",
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
});
