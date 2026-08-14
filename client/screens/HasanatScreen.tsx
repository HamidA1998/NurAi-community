import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import {
  Spacing,
  BorderRadius,
  CategoryColors,
  Fonts,
} from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";
import { useNurAI } from "@/context/NurAIContext";
import { trackPrayerCompletion } from "@/services/achievementsTracker";
import {
  AchievementBadgeSvg,
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon } from "@/components/icons";

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

interface DayData {
  prayers: Record<string, boolean>;
  quranPages: number;
  dhikrSessions: number;
  charityActs: number;
  fasting: boolean;
  kindnessActs: number;
  learningSessions: number;
}

const getDefaultData = (): DayData => ({
  prayers: {
    Fajr: false,
    Dhuhr: false,
    Asr: false,
    Maghrib: false,
    Isha: false,
  },
  quranPages: 0,
  dhikrSessions: 0,
  charityActs: 0,
  fasting: false,
  kindnessActs: 0,
  learningSessions: 0,
});

const getDateString = (date: Date = new Date()) => {
  return date.toISOString().split("T")[0];
};

const calculatePoints = (data: DayData): number => {
  const safeData = normalizeDayData(data);
  let total = 0;
  total += Object.values(safeData.prayers).filter(Boolean).length * 10;
  total += safeData.quranPages * 10;
  total += safeData.dhikrSessions * 5;
  total += safeData.charityActs * 20;
  total += safeData.fasting ? 50 : 0;
  total += safeData.kindnessActs * 10;
  total += safeData.learningSessions * 15;
  return total;
};

const safeNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

const normalizeDayData = (value: any): DayData => {
  const fallback = getDefaultData();
  if (!value || typeof value !== "object") return fallback;
  return {
    prayers: PRAYERS.reduce<Record<string, boolean>>((acc, prayer) => {
      acc[prayer] = Boolean(value.prayers?.[prayer]);
      return acc;
    }, {}),
    quranPages: safeNumber(value.quranPages),
    dhikrSessions: safeNumber(value.dhikrSessions),
    charityActs: safeNumber(value.charityActs),
    fasting: Boolean(value.fasting),
    kindnessActs: safeNumber(value.kindnessActs),
    learningSessions: safeNumber(value.learningSessions),
  };
};

export default function HasanatScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { getHasanatInsightFn, getWeeklyReflectionFn, trackFeature } =
    useNurAI();
  const [todayData, setTodayData] = useState<DayData>(getDefaultData());
  const [weeklyTotals, setWeeklyTotals] = useState<number[]>([
    0, 0, 0, 0, 0, 0, 0,
  ]);
  const [weekDays, setWeekDays] = useState<string[]>([]);
  const [prayerHeatmap, setPrayerHeatmap] = useState<
    { date: string; count: number; label: string }[]
  >([]);
  const [insightDismissed, setInsightDismissed] = useState(false);

  const dateString = getDateString();
  const storageKey = `hasanat-${dateString}`;

  const loadData = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        setTodayData(normalizeDayData(JSON.parse(stored)));
      }
    } catch {}
  }, [storageKey]);

  const saveData = useCallback(
    async (data: DayData) => {
      try {
        await syncedSetItem(storageKey, JSON.stringify(data));
      } catch {}
    },
    [storageKey],
  );

  const loadWeeklyData = useCallback(async () => {
    try {
      const days: string[] = [];
      const totals: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = getDateString(d);
        days.push(
          ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()],
        );
        const stored = await AsyncStorage.getItem(`hasanat-${ds}`);
        if (stored) {
          totals.push(calculatePoints(normalizeDayData(JSON.parse(stored))));
        } else {
          totals.push(0);
        }
      }
      setWeekDays(days);
      setWeeklyTotals(totals);
    } catch {}
  }, []);

  const loadPrayerHeatmap = useCallback(async () => {
    try {
      const days: { date: string; count: number; label: string }[] = [];
      for (let i = 27; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = getDateString(d);
        const stored = await AsyncStorage.getItem(`hasanat-${ds}`);
        const parsed = stored ? normalizeDayData(JSON.parse(stored)) : null;
        days.push({
          date: ds,
          count: parsed
            ? Object.values(parsed.prayers).filter(Boolean).length
            : 0,
          label: d.toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
          }),
        });
      }
      setPrayerHeatmap(days);
    } catch {}
  }, []);

  useEffect(() => {
    loadData();
    loadWeeklyData();
    loadPrayerHeatmap();
    trackFeature("hasanat");
  }, [loadData, loadPrayerHeatmap, loadWeeklyData, trackFeature]);

  const updateData = useCallback(
    (updater: (prev: DayData) => DayData) => {
      setTodayData((prev) => {
        const next = updater(prev);
        saveData(next);
        setWeeklyTotals((current) => {
          if (current.length === 0) return current;
          const updated = [...current];
          updated[updated.length - 1] = calculatePoints(next);
          return updated;
        });
        return next;
      });
    },
    [saveData],
  );

  const togglePrayer = (name: string) => {
    updateData((prev) => {
      const next = {
        ...prev,
        prayers: { ...prev.prayers, [name]: !prev.prayers[name] },
      };
      const done = Object.values(next.prayers).filter(Boolean).length;
      const fajr = !!next.prayers.Fajr;
      trackPrayerCompletion(done, fajr);
      setTimeout(loadPrayerHeatmap, 0);
      return next;
    });
  };

  const increment = (field: keyof DayData) => {
    updateData((prev) => ({
      ...prev,
      [field]: (prev[field] as number) + 1,
    }));
  };

  const decrement = (field: keyof DayData) => {
    updateData((prev) => ({
      ...prev,
      [field]: Math.max(0, (prev[field] as number) - 1),
    }));
  };

  const totalPoints = calculatePoints(todayData);
  const prayersDone = Object.values(todayData.prayers).filter(Boolean).length;
  const hasanatInsight = getHasanatInsightFn(
    totalPoints,
    prayersDone,
    todayData.fasting,
  );
  const weeklyReflection = getWeeklyReflectionFn(weeklyTotals);
  const weekTotal = weeklyTotals.reduce((a, b) => a + b, 0);
  const maxWeekly = Math.max(...weeklyTotals, 1);
  const emerald = isDark ? CategoryColors.emerald.dark : CategoryColors.emerald;

  const CounterRow = ({
    label,
    icon,
    value,
    points,
    field,
    color,
  }: {
    label: string;
    icon: string;
    value: number;
    points: number;
    field: keyof DayData;
    color: { bg: string; text: string };
  }) => (
    <View
      style={[
        styles.counterCard,
        {
          backgroundColor: theme.surfaceGlass,
          borderColor: theme.borderSubtle,
        },
      ]}
    >
      <View style={styles.counterLeft}>
        <View style={[styles.counterIcon, { backgroundColor: color.bg }]}>
          <AppIcon name={icon as any} size={18} color={color.text} />
        </View>
        <View>
          <ThemedText type="small" style={{ fontWeight: "600" }}>
            {label}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            {points} pts each
          </ThemedText>
        </View>
      </View>
      <View style={styles.counterControls}>
        <Pressable
          onPress={() => decrement(field)}
          style={[
            styles.counterBtn,
            { backgroundColor: theme.backgroundSecondary },
          ]}
          testID={`button-decrement-${field}`}
        >
          <AppIcon name="minus" size={16} color={theme.textSecondary} />
        </Pressable>
        <ThemedText type="h4" style={styles.counterValue}>
          {value}
        </ThemedText>
        <Pressable
          onPress={() => increment(field)}
          style={[styles.counterBtn, { backgroundColor: emerald.bg }]}
          testID={`button-increment-${field}`}
        >
          <AppIcon name="plus" size={16} color={emerald.text} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3" style={styles.headerTitle}>
          Hasanat Tracker
        </ThemedText>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <View
            style={[
              styles.motivationCard,
              {
                backgroundColor: isDark
                  ? theme.backgroundSecondary
                  : theme.surfaceElevated,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <AppIcon name="star" size={16} color={theme.primary} />
            <ThemedText
              type="small"
              style={[styles.motivationText, { color: theme.textSecondary }]}
            >
              "Whoever does a good deed shall have ten times the like thereof to
              his credit." - Quran 6:160
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <LinearGradient
            colors={
              isDark
                ? ["#064E3B", "#065F46"]
                : [theme.primary, theme.gradientStart]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
            <AchievementBadgeSvg
              size={42}
              color="#FFFFFF"
              accentColor={theme.scholar}
            />
            <Text style={styles.heroLabel}>{"Today's Hasanat"}</Text>
            <Text style={styles.heroPoints}>{totalPoints}</Text>
            <Text style={styles.heroSubtext}>
              {totalPoints > 0
                ? "points earned"
                : "Start earning by checking off prayers and deeds below"}
            </Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min((totalPoints / 200) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.heroGoal}>{"Goal: 200 points"}</Text>
          </LinearGradient>
        </Animated.View>

        {hasanatInsight && !insightDismissed ? (
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <View
              style={[
                styles.nuraiInsightCard,
                {
                  backgroundColor: isDark ? "#0F1B2D" : "#F8FAF9",
                  borderColor: isDark ? "#1E3A4A" : "#D1FAE5",
                },
              ]}
            >
              <View style={styles.nuraiInsightHeader}>
                <View style={styles.nuraiInsightHeaderLeft}>
                  <View
                    style={[styles.nuraiDot, { backgroundColor: emerald.text }]}
                  />
                  <Text style={[styles.nuraiLabel, { color: emerald.text }]}>
                    NurAI
                  </Text>
                  <AppIcon
                    name={hasanatInsight.icon as any}
                    size={14}
                    color={emerald.text}
                  />
                </View>
                <Pressable
                  onPress={() => setInsightDismissed(true)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  testID="button-dismiss-insight"
                >
                  <AppIcon name="x" size={16} color={theme.textMuted} />
                </Pressable>
              </View>
              <ThemedText style={styles.nuraiInsightTitle}>
                {hasanatInsight.title}
              </ThemedText>
              <ThemedText
                style={[
                  styles.nuraiInsightBody,
                  { color: theme.textSecondary },
                ]}
              >
                {hasanatInsight.body}
              </ThemedText>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Salah Consistency
          </ThemedText>
          <View
            style={[
              styles.heatmapCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <View style={styles.heatmapHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.heatmapTitle}>
                  28-day prayer rhythm
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, marginTop: 2 }}
                >
                  Darker glow means more prayers protected that day.
                </ThemedText>
              </View>
              <View
                style={[
                  styles.heatmapScore,
                  { backgroundColor: emerald.bg, borderColor: emerald.text },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ color: emerald.text, fontWeight: "800" }}
                >
                  {prayersDone}/5 today
                </ThemedText>
              </View>
            </View>
            <View style={styles.heatmapGrid}>
              {prayerHeatmap.map((day) => {
                const opacity = day.count === 0 ? 0.1 : 0.22 + day.count * 0.14;
                const full = day.count >= 5;
                return (
                  <View
                    key={day.date}
                    accessibilityLabel={`${day.label}: ${day.count} prayers completed`}
                    style={[
                      styles.heatmapDot,
                      {
                        backgroundColor: full
                          ? emerald.text
                          : `rgba(52, 211, 153, ${opacity})`,
                        borderColor: full ? theme.scholar : theme.borderSubtle,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Daily Prayers
          </ThemedText>
          <View
            style={[
              styles.prayersCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginBottom: Spacing.sm }}
            >
              10 points each
            </ThemedText>
            <View style={styles.prayersGrid}>
              {PRAYERS.map((prayer) => {
                const checked = todayData.prayers[prayer];
                return (
                  <Pressable
                    key={prayer}
                    onPress={() => togglePrayer(prayer)}
                    style={[
                      styles.prayerChip,
                      {
                        backgroundColor: checked
                          ? emerald.bg
                          : theme.backgroundSecondary,
                        borderColor: checked
                          ? emerald.text
                          : theme.borderSubtle,
                      },
                    ]}
                    testID={`prayer-${prayer}`}
                  >
                    <AppIcon
                      name={checked ? "check-circle" : "circle"}
                      size={16}
                      color={checked ? emerald.text : theme.textMuted}
                    />
                    <ThemedText
                      type="small"
                      style={{
                        color: checked ? emerald.text : theme.textSecondary,
                        fontWeight: checked ? "600" : "400",
                        marginLeft: Spacing.xs,
                      }}
                    >
                      {prayer}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Good Deeds
          </ThemedText>

          <CounterRow
            label="Quran Reading"
            icon="book-open"
            value={todayData.quranPages}
            points={10}
            field="quranPages"
            color={isDark ? CategoryColors.blue.dark : CategoryColors.blue}
          />
          <CounterRow
            label="Dhikr Sessions"
            icon="repeat"
            value={todayData.dhikrSessions}
            points={5}
            field="dhikrSessions"
            color={isDark ? CategoryColors.teal.dark : CategoryColors.teal}
          />
          <CounterRow
            label="Charity (Sadaqah)"
            icon="heart"
            value={todayData.charityActs}
            points={20}
            field="charityActs"
            color={isDark ? CategoryColors.rose.dark : CategoryColors.rose}
          />
          <CounterRow
            label="Kindness"
            icon="smile"
            value={todayData.kindnessActs}
            points={10}
            field="kindnessActs"
            color={isDark ? CategoryColors.amber.dark : CategoryColors.amber}
          />
          <CounterRow
            label="Learning"
            icon="award"
            value={todayData.learningSessions}
            points={15}
            field="learningSessions"
            color={isDark ? CategoryColors.purple.dark : CategoryColors.purple}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).duration(400)}>
          <Pressable
            onPress={() =>
              updateData((prev) => ({ ...prev, fasting: !prev.fasting }))
            }
            style={[
              styles.fastingCard,
              {
                backgroundColor: todayData.fasting
                  ? emerald.bg
                  : theme.surfaceGlass,
                borderColor: todayData.fasting
                  ? emerald.text
                  : theme.borderSubtle,
              },
            ]}
            testID="button-fasting"
          >
            <View style={styles.counterLeft}>
              <View
                style={[
                  styles.counterIcon,
                  {
                    backgroundColor: todayData.fasting
                      ? "rgba(255,255,255,0.2)"
                      : isDark
                        ? CategoryColors.orange.dark.bg
                        : CategoryColors.orange.bg,
                  },
                ]}
              >
                <AppIcon
                  name="moon"
                  size={18}
                  color={
                    todayData.fasting
                      ? emerald.text
                      : isDark
                        ? CategoryColors.orange.dark.text
                        : CategoryColors.orange.text
                  }
                />
              </View>
              <View>
                <ThemedText
                  type="small"
                  style={{
                    fontWeight: "600",
                    color: todayData.fasting ? emerald.text : theme.text,
                  }}
                >
                  Fasting Today
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{
                    color: todayData.fasting ? emerald.text : theme.textMuted,
                  }}
                >
                  50 points
                </ThemedText>
              </View>
            </View>
            <AppIcon
              name={todayData.fasting ? "check-circle" : "circle"}
              size={22}
              color={todayData.fasting ? emerald.text : theme.textMuted}
            />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Weekly Summary
          </ThemedText>
          <View
            style={[
              styles.weeklyCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <GeometricCardPattern color={theme.scholar} opacity={0.012} />
            <View style={styles.weeklyHeader}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                Last 7 Days
              </ThemedText>
              <ThemedText
                type="small"
                style={{ color: theme.primary, fontWeight: "700" }}
              >
                {weekTotal} pts
              </ThemedText>
            </View>
            <View style={styles.weeklyChart}>
              {weeklyTotals.map((val, i) => (
                <View key={i} style={styles.weeklyBarContainer}>
                  <View style={styles.weeklyBarWrapper}>
                    <View
                      style={[
                        styles.weeklyBar,
                        {
                          height: `${Math.max((val / maxWeekly) * 100, 4)}%`,
                          backgroundColor:
                            i === 6
                              ? theme.primary
                              : isDark
                                ? theme.backgroundTertiary
                                : theme.backgroundSecondary,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, marginTop: 4 }}
                  >
                    {weekDays[i] || ""}
                  </ThemedText>
                </View>
              ))}
            </View>
            <GoldDivider
              color={theme.scholar}
              opacity={0.24}
              style={styles.weeklyDivider}
            />
            {weeklyReflection.encouragement ? (
              <View
                style={[
                  styles.weeklyReflectionCard,
                  {
                    backgroundColor: isDark ? "#0F1B2D" : "#F0FDF4",
                    borderColor: isDark ? "#1E3A4A" : "#D1FAE5",
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.weeklyReflectionText,
                    { color: theme.textSecondary },
                  ]}
                >
                  {weeklyReflection.encouragement}
                </ThemedText>
                {weeklyReflection.stats.length > 0 ? (
                  <View style={styles.weeklyStatRow}>
                    {weeklyReflection.stats.map((stat, idx) => (
                      <View key={idx} style={styles.weeklyStatBadge}>
                        <AppIcon
                          name={stat.icon as any}
                          size={14}
                          color={emerald.text}
                        />
                        <Text
                          style={[
                            styles.weeklyStatValue,
                            { color: emerald.text },
                          ]}
                        >
                          {stat.value}
                        </Text>
                        <Text
                          style={[
                            styles.weeklyStatLabel,
                            { color: theme.textMuted },
                          ]}
                        >
                          {stat.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    textAlign: "center",
    flex: 1,
  },
  motivationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  motivationText: {
    flex: 1,
    fontStyle: "italic",
    lineHeight: 20,
  },
  heroCard: {
    borderRadius: 24,
    padding: Spacing["2xl"],
    alignItems: "center",
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontFamily: Fonts?.sans || "PlusJakartaSans_400Regular",
    marginBottom: Spacing.xs,
  },
  heroPoints: {
    color: "#FFFFFF",
    fontSize: 56,
    fontFamily: Fonts?.sansBold || "PlusJakartaSans_700Bold",
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 2,
    marginVertical: Spacing.xs,
  },
  heroSubtext: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontFamily: Fonts?.sans || "PlusJakartaSans_400Regular",
    marginBottom: Spacing.lg,
  },
  progressBarBg: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  heroGoal: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontFamily: Fonts?.sans || "PlusJakartaSans_400Regular",
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  prayersCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heatmapCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heatmapHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  heatmapTitle: {
    fontFamily: Fonts?.sansSemiBold || "PlusJakartaSans_600SemiBold",
    fontSize: 16,
  },
  heatmapScore: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  heatmapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  heatmapDot: {
    width: 16,
    height: 16,
    borderRadius: 6,
    borderWidth: 1,
  },
  prayersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  prayerChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  counterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  counterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  counterIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  counterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: {
    minWidth: 24,
    textAlign: "center",
  },
  fastingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  weeklyCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  weeklyDivider: {
    marginTop: Spacing.md,
  },
  weeklyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  weeklyChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 100,
  },
  weeklyBarContainer: {
    flex: 1,
    alignItems: "center",
  },
  weeklyBarWrapper: {
    width: 20,
    height: 80,
    justifyContent: "flex-end",
  },
  weeklyBar: {
    width: "100%",
    borderRadius: 4,
    minHeight: 4,
  },
  nuraiInsightCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  nuraiInsightHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  nuraiInsightHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nuraiDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  nuraiLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  nuraiInsightTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  nuraiInsightBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  weeklyReflectionCard: {
    marginTop: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.md,
  },
  weeklyReflectionText: {
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 19,
    marginBottom: Spacing.sm,
  },
  weeklyStatRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  weeklyStatBadge: {
    alignItems: "center",
    gap: 2,
  },
  weeklyStatValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  weeklyStatLabel: {
    fontSize: 10,
  },
});
