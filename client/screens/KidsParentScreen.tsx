import React, { useMemo, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  CategoryColors,
  Fonts,
} from "@/constants/theme";
import { useKidsMode, AgeGroup } from "@/context/KidsModeContext";
import {
  AchievementBadgeSvg,
  FamilyIconSvg,
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import {
  buildFamilySafeKidsLearningPlan,
  FamilySafeKidsLearningPlan,
} from "@/services/familySafeKidsLearningService";
import { AppIcon } from "@/components/icons";

const AGE_OPTIONS: { key: AgeGroup; label: string }[] = [
  { key: "3-5", label: "3-5" },
  { key: "6-9", label: "6-9" },
  { key: "10-13", label: "10-13" },
];

const GOAL_OPTIONS = [5, 10, 15, 20, 30];

export default function KidsParentScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {
    settings,
    updateSettings,
    streak,
    badges,
    progress,
    quizScores,
    memorization,
    resetAllKidsData,
  } = useKidsMode();

  const [childName, setChildName] = useState(settings.childName);
  const [parentPin, setParentPin] = useState(settings.parentPin);
  const [showExport, setShowExport] = useState(false);
  const [resetText, setResetText] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const getColor = (key: keyof typeof CategoryColors) =>
    isDark ? CategoryColors[key].dark : CategoryColors[key];

  const dailyGoalPercent =
    settings.dailyGoalMinutes > 0
      ? Math.min(
          Math.round((progress.todayMinutes / settings.dailyGoalMinutes) * 100),
          100,
        )
      : 0;

  const handleSaveName = async () => {
    const trimmed = childName.trim();
    if (trimmed.length > 0) {
      await updateSettings({ childName: trimmed });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSelectAge = async (age: AgeGroup) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSettings({ ageGroup: age });
  };

  const handleSelectGoal = async (minutes: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSettings({ dailyGoalMinutes: minutes });
  };

  const handleSavePin = async () => {
    if (parentPin.length === 4) {
      await updateSettings({ parentPin });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleReset = async () => {
    if (resetText === "RESET") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await resetAllKidsData();
      setResetText("");
      setShowResetConfirm(false);
      navigation.goBack();
    }
  };

  const recentQuizzes = quizScores.slice(0, 10);

  const surahsMemorized = memorization.filter(
    (m) => m.type === "surah" && m.status === "memorized",
  ).length;
  const duasMemorized = memorization.filter(
    (m) => m.type === "dua" && m.status === "memorized",
  ).length;

  const backupSummaryItems = [
    {
      label: "Daily goal",
      value: `${settings.dailyGoalMinutes} min`,
    },
    {
      label: "Today",
      value: `${progress.todayMinutes} min`,
    },
    {
      label: "Learning streak",
      value: `${streak.currentStreak} day${streak.currentStreak === 1 ? "" : "s"}`,
    },
    {
      label: "Stories read",
      value: String(progress.storiesRead),
    },
    {
      label: "Quizzes completed",
      value: String(progress.quizzesCompleted),
    },
    {
      label: "Badges earned",
      value: String(badges.length),
    },
    {
      label: "Memorised",
      value: `${surahsMemorized} surah${surahsMemorized === 1 ? "" : "s"} · ${duasMemorized} dua${duasMemorized === 1 ? "" : "s"}`,
    },
  ];
  const familySafeLearningPlan = useMemo(
    () => buildFamilySafeKidsLearningPlan({ settings, progress, badges }),
    [badges, progress, settings],
  );

  const emerald = getColor("emerald");
  const amber = getColor("amber");
  const purple = getColor("purple");

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <LinearGradient
        colors={
          isDark ? ["#7C3AED", "transparent"] : ["#EDE9FE", "transparent"]
        }
        style={styles.topGradient}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3">Parent Dashboard</ThemedText>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={isDark ? ["#7C3AED", "#6D28D9"] : ["#8B5CF6", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.heroTitle, { fontFamily: Fonts?.sansBold }]}
                >
                  {settings.childName || "Child"}
                </Text>
                <Text style={[styles.heroSub, { fontFamily: Fonts?.sans }]}>
                  Age Group: {settings.ageGroup || "Not set"}
                </Text>
              </View>
              <View style={styles.heroStreakBubble}>
                <AchievementBadgeSvg
                  size={26}
                  color="#FFFFFF"
                  accentColor="rgba(255,255,255,0.45)"
                />
                <Text
                  style={[
                    styles.heroStreakCount,
                    { fontFamily: Fonts?.sansBold },
                  ]}
                >
                  {streak.currentStreak}
                </Text>
                <Text
                  style={[styles.heroStreakLabel, { fontFamily: Fonts?.sans }]}
                >
                  streak
                </Text>
              </View>
            </View>
            <GoldDivider
              color="rgba(255,255,255,0.42)"
              style={styles.heroDivider}
            />
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text
                  style={[
                    styles.heroStatValue,
                    { fontFamily: Fonts?.sansBold },
                  ]}
                >
                  {streak.totalDaysActive}
                </Text>
                <Text
                  style={[styles.heroStatLabel, { fontFamily: Fonts?.sans }]}
                >
                  Days active
                </Text>
              </View>
              <View style={styles.heroStat}>
                <Text
                  style={[
                    styles.heroStatValue,
                    { fontFamily: Fonts?.sansBold },
                  ]}
                >
                  {progress.totalPoints}
                </Text>
                <Text
                  style={[styles.heroStatLabel, { fontFamily: Fonts?.sans }]}
                >
                  Points
                </Text>
              </View>
              <View style={styles.heroStat}>
                <Text
                  style={[
                    styles.heroStatValue,
                    { fontFamily: Fonts?.sansBold },
                  ]}
                >
                  {badges.length}
                </Text>
                <Text
                  style={[styles.heroStatLabel, { fontFamily: Fonts?.sans }]}
                >
                  Badges
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Overview
          </ThemedText>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <View style={styles.overviewGrid}>
              <View style={styles.overviewItem}>
                <View
                  style={[styles.overviewIcon, { backgroundColor: emerald.bg }]}
                >
                  <AppIcon name="book-open" size={18} color={emerald.text} />
                </View>
                <ThemedText type="h4" style={{ color: emerald.text }}>
                  {progress.storiesRead}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Stories Read
                </ThemedText>
              </View>
              <View style={styles.overviewItem}>
                <View
                  style={[styles.overviewIcon, { backgroundColor: purple.bg }]}
                >
                  <AppIcon name="help-circle" size={18} color={purple.text} />
                </View>
                <ThemedText type="h4" style={{ color: purple.text }}>
                  {progress.quizzesCompleted}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Quizzes Done
                </ThemedText>
              </View>
              <View style={styles.overviewItem}>
                <View
                  style={[styles.overviewIcon, { backgroundColor: amber.bg }]}
                >
                  <AppIcon name="headphones" size={18} color={amber.text} />
                </View>
                <ThemedText type="h4" style={{ color: amber.text }}>
                  {surahsMemorized}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Surahs
                </ThemedText>
              </View>
              <View style={styles.overviewItem}>
                <View
                  style={[styles.overviewIcon, { backgroundColor: emerald.bg }]}
                >
                  <AppIcon name="heart" size={18} color={emerald.text} />
                </View>
                <ThemedText type="h4" style={{ color: emerald.text }}>
                  {duasMemorized}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Duas
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <FamilySafetyReviewPanel
            plan={familySafeLearningPlan}
            colors={{
              background: theme.surfaceGlass,
              border: theme.borderSubtle,
              text: theme.text,
              muted: theme.textMuted,
              emeraldBg: emerald.bg,
              emeraldText: emerald.text,
              amberBg: amber.bg,
              amberText: amber.text,
              purpleBg: purple.bg,
              purpleText: purple.text,
              secondary: isDark
                ? theme.backgroundTertiary
                : theme.backgroundSecondary,
            }}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Daily Goal
          </ThemedText>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <View style={styles.goalHeader}>
              <ThemedText type="h4">Progress</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                {progress.todayMinutes}/{settings.dailyGoalMinutes} min
              </ThemedText>
            </View>
            <View
              style={[
                styles.goalProgressBg,
                {
                  backgroundColor: isDark
                    ? theme.backgroundTertiary
                    : theme.backgroundSecondary,
                },
              ]}
            >
              <View
                style={[
                  styles.goalProgressFill,
                  {
                    backgroundColor: purple.text,
                    width: `${dailyGoalPercent}%`,
                  },
                ]}
              />
            </View>
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginTop: Spacing.xs }}
            >
              {dailyGoalPercent}% complete today
            </ThemedText>
          </View>
        </Animated.View>

        {recentQuizzes.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Recent Quizzes
            </ThemedText>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              {recentQuizzes.map((quiz, i) => (
                <View
                  key={`${quiz.quizId}-${i}`}
                  style={[
                    styles.quizRow,
                    i < recentQuizzes.length - 1
                      ? {
                          borderBottomWidth: 1,
                          borderBottomColor: theme.borderSubtle,
                        }
                      : {},
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText
                      type="small"
                      style={{ fontFamily: Fonts?.sansSemiBold }}
                    >
                      {quiz.category}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {new Date(quiz.completedAt).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.scoreBadge,
                      {
                        backgroundColor:
                          quiz.score / quiz.totalQuestions >= 0.7
                            ? emerald.bg
                            : amber.bg,
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{
                        fontFamily: Fonts?.sansBold,
                        color:
                          quiz.score / quiz.totalQuestions >= 0.7
                            ? emerald.text
                            : amber.text,
                      }}
                    >
                      {quiz.score}/{quiz.totalQuestions}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {badges.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Badge Collection
            </ThemedText>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              {badges.map((badge, i) => (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeRow,
                    i < badges.length - 1
                      ? {
                          borderBottomWidth: 1,
                          borderBottomColor: theme.borderSubtle,
                        }
                      : {},
                  ]}
                >
                  <View
                    style={[styles.badgeIcon, { backgroundColor: purple.bg }]}
                  >
                    <Text style={{ fontSize: 20 }}>
                      {badge.icon === "star"
                        ? "\u{2B50}"
                        : badge.icon === "book"
                          ? "\u{1F4D6}"
                          : badge.icon === "brain"
                            ? "\u{1F9E0}"
                            : badge.icon === "medal"
                              ? "\u{1F3C5}"
                              : badge.icon === "trophy"
                                ? "\u{1F3C6}"
                                : badge.icon === "sparkle"
                                  ? "\u{2728}"
                                  : badge.icon === "heart"
                                    ? "\u{2764}"
                                    : badge.icon === "fire"
                                      ? "\u{1F525}"
                                      : "\u{2B50}"}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <ThemedText
                      type="small"
                      style={{ fontFamily: Fonts?.sansSemiBold }}
                    >
                      {badge.title}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {badge.description}
                    </ThemedText>
                  </View>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    {new Date(badge.earnedDate).toLocaleDateString()}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Streak History
          </ThemedText>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <View style={styles.streakGrid}>
              <View style={styles.streakItem}>
                <Text style={{ fontSize: 20 }}>{"\u{1F525}"}</Text>
                <ThemedText type="h4">{streak.currentStreak}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Current
                </ThemedText>
              </View>
              <View style={styles.streakItem}>
                <Text style={{ fontSize: 20 }}>{"\u{1F3C6}"}</Text>
                <ThemedText type="h4">{streak.longestStreak}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Best
                </ThemedText>
              </View>
              <View style={styles.streakItem}>
                <Text style={{ fontSize: 20 }}>{"\u{1F4C5}"}</Text>
                <ThemedText type="h4">{streak.totalDaysActive}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Total Days
                </ThemedText>
              </View>
            </View>
            {streak.lastActiveDate ? (
              <ThemedText
                type="caption"
                style={{
                  color: theme.textMuted,
                  textAlign: "center",
                  marginTop: Spacing.md,
                }}
              >
                Last active:{" "}
                {new Date(streak.lastActiveDate).toLocaleDateString()}
              </ThemedText>
            ) : null}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Settings
          </ThemedText>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                fontFamily: Fonts?.sansSemiBold,
                marginBottom: Spacing.sm,
              }}
            >
              Child's Name
            </ThemedText>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundTertiary
                      : theme.backgroundSecondary,
                    color: theme.text,
                    fontFamily: Fonts?.sans,
                    borderColor: theme.borderSubtle,
                  },
                ]}
                value={childName}
                onChangeText={setChildName}
                placeholder="Enter name"
                placeholderTextColor={theme.textMuted}
                testID="input-child-name"
              />
              <Pressable
                onPress={handleSaveName}
                style={[styles.saveBtn, { backgroundColor: purple.bg }]}
                testID="button-save-name"
              >
                <AppIcon name="check" size={18} color={purple.text} />
              </Pressable>
            </View>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
                marginTop: Spacing.sm,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                fontFamily: Fonts?.sansSemiBold,
                marginBottom: Spacing.md,
              }}
            >
              Age Group
            </ThemedText>
            <View style={styles.pillRow}>
              {AGE_OPTIONS.map((opt) => {
                const isActive = settings.ageGroup === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => handleSelectAge(opt.key)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isActive
                          ? purple.text
                          : isDark
                            ? theme.backgroundTertiary
                            : theme.backgroundSecondary,
                        borderColor: isActive
                          ? purple.text
                          : theme.borderSubtle,
                      },
                    ]}
                    testID={`button-age-${opt.key}`}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color: isActive ? "#FFFFFF" : theme.text,
                          fontFamily: Fonts?.sansSemiBold,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
                marginTop: Spacing.sm,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                fontFamily: Fonts?.sansSemiBold,
                marginBottom: Spacing.md,
              }}
            >
              Daily Goal (minutes)
            </ThemedText>
            <View style={styles.pillRow}>
              {GOAL_OPTIONS.map((min) => {
                const isActive = settings.dailyGoalMinutes === min;
                return (
                  <Pressable
                    key={min}
                    onPress={() => handleSelectGoal(min)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isActive
                          ? emerald.text
                          : isDark
                            ? theme.backgroundTertiary
                            : theme.backgroundSecondary,
                        borderColor: isActive
                          ? emerald.text
                          : theme.borderSubtle,
                      },
                    ]}
                    testID={`button-goal-${min}`}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color: isActive ? "#FFFFFF" : theme.text,
                          fontFamily: Fonts?.sansSemiBold,
                        },
                      ]}
                    >
                      {min}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
                marginTop: Spacing.sm,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                fontFamily: Fonts?.sansSemiBold,
                marginBottom: Spacing.sm,
              }}
            >
              Parent PIN (4 digits)
            </ThemedText>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundTertiary
                      : theme.backgroundSecondary,
                    color: theme.text,
                    fontFamily: Fonts?.sans,
                    borderColor: theme.borderSubtle,
                    letterSpacing: parentPin.length > 0 ? 8 : 0,
                    textAlign: "center",
                  },
                ]}
                value={parentPin}
                onChangeText={(t) =>
                  setParentPin(t.replace(/[^0-9]/g, "").slice(0, 4))
                }
                placeholder="PIN"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                testID="input-parent-pin"
              />
              <Pressable
                onPress={handleSavePin}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: purple.bg,
                    opacity: parentPin.length === 4 ? 1 : 0.5,
                  },
                ]}
                testID="button-save-pin"
              >
                <AppIcon name="check" size={18} color={purple.text} />
              </Pressable>
            </View>
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginTop: Spacing.xs }}
            >
              Parent PIN saved for this device
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(700).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Data Management
          </ThemedText>

          <Pressable
            onPress={() => {
              setShowExport(!showExport);
              Haptics.selectionAsync();
            }}
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
            testID="button-export"
          >
            <View style={styles.dataRow}>
              <View
                style={[styles.overviewIcon, { backgroundColor: emerald.bg }]}
              >
                <FamilyIconSvg size={20} color={emerald.text} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText
                  type="small"
                  style={{ fontFamily: Fonts?.sansSemiBold }}
                >
                  Private Progress Backup
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Review a parent-friendly summary of this child's progress
                </ThemedText>
              </View>
              <AppIcon
                name={showExport ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textMuted}
              />
            </View>
          </Pressable>

          {showExport ? (
            <Animated.View entering={FadeInDown.duration(300)}>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundTertiary
                      : "#F8FAFC",
                    borderColor: theme.borderSubtle,
                    marginTop: Spacing.sm,
                  },
                ]}
              >
                <View style={styles.backupSummaryList}>
                  {backupSummaryItems.map((item) => (
                    <View
                      key={item.label}
                      style={[
                        styles.backupSummaryRow,
                        { borderColor: theme.borderSubtle },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, flex: 1 }}
                      >
                        {item.label}
                      </ThemedText>
                      <ThemedText
                        type="small"
                        style={[
                          styles.backupSummaryValue,
                          { color: theme.text },
                        ]}
                      >
                        {item.value}
                      </ThemedText>
                    </View>
                  ))}
                </View>
                {recentQuizzes.length > 0 ? (
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, marginTop: Spacing.sm }}
                  >
                    Latest quiz: {recentQuizzes[0].score}/
                    {recentQuizzes[0].totalQuestions} on{" "}
                    {new Date(
                      recentQuizzes[0].completedAt,
                    ).toLocaleDateString()}
                  </ThemedText>
                ) : null}
              </View>
            </Animated.View>
          ) : null}

          <Pressable
            onPress={() => {
              setShowResetConfirm(!showResetConfirm);
              Haptics.selectionAsync();
            }}
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: showResetConfirm
                  ? theme.error
                  : theme.borderSubtle,
                marginTop: Spacing.sm,
              },
            ]}
            testID="button-reset-toggle"
          >
            <View style={styles.dataRow}>
              <View
                style={[
                  styles.overviewIcon,
                  { backgroundColor: isDark ? "#4C0519" : "#FFF1F2" },
                ]}
              >
                <AppIcon name="trash-2" size={18} color={theme.error} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText
                  type="small"
                  style={{
                    fontFamily: Fonts?.sansSemiBold,
                    color: theme.error,
                  }}
                >
                  Reset All Data
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Permanently delete all Kids Mode data
                </ThemedText>
              </View>
              <AppIcon
                name={showResetConfirm ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textMuted}
              />
            </View>
          </Pressable>

          {showResetConfirm ? (
            <Animated.View entering={FadeInDown.duration(300)}>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.error,
                    marginTop: Spacing.sm,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: theme.error,
                    fontFamily: Fonts?.sansSemiBold,
                    marginBottom: Spacing.sm,
                  }}
                >
                  This action cannot be undone!
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, marginBottom: Spacing.md }}
                >
                  Type "RESET" to confirm deletion of all Kids Mode data.
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark
                        ? theme.backgroundTertiary
                        : theme.backgroundSecondary,
                      color: theme.text,
                      fontFamily: Fonts?.sansBold,
                      borderColor: theme.error,
                      textAlign: "center",
                      letterSpacing: 4,
                    },
                  ]}
                  value={resetText}
                  onChangeText={setResetText}
                  placeholder='Type "RESET"'
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="characters"
                  testID="input-reset-confirm"
                />
                <Pressable
                  onPress={handleReset}
                  style={[
                    styles.resetBtn,
                    {
                      backgroundColor:
                        resetText === "RESET" ? theme.error : theme.disabled,
                      opacity: resetText === "RESET" ? 1 : 0.5,
                    },
                  ]}
                  disabled={resetText !== "RESET"}
                  testID="button-reset-confirm"
                >
                  <AppIcon name="trash-2" size={16} color="#FFFFFF" />
                  <Text
                    style={[
                      styles.resetBtnText,
                      { fontFamily: Fonts?.sansBold },
                    ]}
                  >
                    Delete All Data
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function FamilySafetyReviewPanel({
  plan,
  colors,
}: {
  plan: FamilySafeKidsLearningPlan;
  colors: {
    background: string;
    border: string;
    text: string;
    muted: string;
    emeraldBg: string;
    emeraldText: string;
    amberBg: string;
    amberText: string;
    purpleBg: string;
    purpleText: string;
    secondary: string;
  };
}) {
  return (
    <>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Child Safety Review
      </ThemedText>
      <View
        style={[
          styles.familyReviewCard,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
        testID="kids-parent-child-safety-review"
        accessible
        accessibilityLabel="Child safety review for Kids Mode lessons"
      >
        <View style={styles.familyReviewHeader}>
          <View
            style={[
              styles.familyReviewIcon,
              { backgroundColor: colors.emeraldBg },
            ]}
          >
            <AppIcon name="shield" size={18} color={colors.emeraldText} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="h4">{plan.title}</ThemedText>
            <ThemedText type="caption" style={{ color: colors.muted }}>
              {plan.reviewQueueLabel}
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: colors.emeraldText, marginTop: 2 }}
              testID="kids-parent-next-review"
            >
              {plan.nextParentReviewLabel}
            </ThemedText>
          </View>
        </View>

        <View
          style={styles.familyReviewWeeklyPlan}
          testID="kids-parent-weekly-family-plan"
        >
          <View style={styles.familyReviewWeeklyHeader}>
            <AppIcon name="calendar" size={15} color={colors.emeraldText} />
            <ThemedText
              type="caption"
              style={{ color: colors.emeraldText, fontFamily: Fonts?.sansBold }}
            >
              WEEKLY PLAN TO APPROVE
            </ThemedText>
          </View>
          {plan.weeklyMissions.map((mission) => (
            <View
              key={mission.id}
              style={[
                styles.familyReviewMission,
                { borderColor: colors.border },
              ]}
              testID={`kids-parent-weekly-mission-${mission.id}`}
            >
              <View style={{ flex: 1 }}>
                <ThemedText
                  type="small"
                  style={{ fontFamily: Fonts?.sansSemiBold }}
                >
                  {mission.title}
                </ThemedText>
                <ThemedText type="caption" style={{ color: colors.muted }}>
                  {mission.parentProofLabel}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.familyReviewStatus,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <ThemedText type="caption" style={{ color: colors.text }}>
                  {mission.cadenceLabel}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.familyReviewPolicy,
            { backgroundColor: colors.amberBg },
          ]}
        >
          <AppIcon name="alert-circle" size={15} color={colors.amberText} />
          <ThemedText
            type="caption"
            style={{
              color: colors.amberText,
              flex: 1,
              fontFamily: Fonts?.sansSemiBold,
            }}
          >
            {plan.childSafeExplanationPolicy}
          </ThemedText>
        </View>

        <View style={styles.familyReviewLaneList}>
          {plan.lanes.map((lane) => (
            <View
              key={lane.id}
              style={[styles.familyReviewLane, { borderColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <ThemedText
                  type="small"
                  style={{ fontFamily: Fonts?.sansSemiBold }}
                >
                  {lane.title}
                </ThemedText>
                <ThemedText type="caption" style={{ color: colors.muted }}>
                  {lane.parentActionLabel}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.familyReviewStatus,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <ThemedText type="caption" style={{ color: colors.text }}>
                  Approved lane
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.familyReviewBoundaryGrid}>
          {plan.safetyBoundaries.slice(0, 3).map((boundary) => (
            <View
              key={boundary.id}
              style={[
                styles.familyReviewBoundary,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppIcon
                name="check-circle"
                size={14}
                color={colors.emeraldText}
              />
              <ThemedText
                type="caption"
                style={{ color: colors.text, flex: 1 }}
              >
                {boundary.label}
              </ThemedText>
            </View>
          ))}
        </View>

        <View
          style={styles.familyReviewReceiptList}
          testID="kids-parent-review-receipts"
        >
          {plan.reviewReceipts.map((receipt) => (
            <View
              key={receipt.id}
              style={[
                styles.familyReviewReceipt,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                },
              ]}
              testID={`kids-parent-review-receipt-${receipt.id}`}
            >
              <AppIcon name="file-text" size={14} color={colors.emeraldText} />
              <View style={{ flex: 1 }}>
                <ThemedText
                  type="caption"
                  style={{ color: colors.text, fontFamily: Fonts?.sansBold }}
                >
                  {receipt.title}: {receipt.evidenceLabel}
                </ThemedText>
                <ThemedText type="caption" style={{ color: colors.muted }}>
                  {receipt.boundaryLabel}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { marginTop: Spacing.xl, marginBottom: Spacing.md },
  heroCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  heroRow: { flexDirection: "row", alignItems: "center" },
  heroTitle: { color: "#FFFFFF", fontSize: 20 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 2 },
  heroStreakBubble: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  heroStreakCount: { color: "#FFFFFF", fontSize: 20 },
  heroStreakLabel: { color: "rgba(255,255,255,0.8)", fontSize: 10 },
  heroDivider: { marginTop: Spacing.md, marginBottom: -Spacing.xs },
  heroStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  heroStat: { alignItems: "center" },
  heroStatValue: { color: "#FFFFFF", fontSize: 18 },
  heroStatLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  familyReviewCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  familyReviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  familyReviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  familyReviewPolicy: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  familyReviewWeeklyPlan: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  familyReviewWeeklyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  familyReviewMission: {
    minHeight: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  familyReviewLaneList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  familyReviewLane: {
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  familyReviewStatus: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  familyReviewBoundaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  familyReviewBoundary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flexGrow: 1,
    flexBasis: "48%",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  familyReviewReceiptList: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  familyReviewReceipt: {
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  overviewItem: {
    alignItems: "center",
    width: "45%",
    gap: 4,
  },
  overviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  goalProgressBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  goalProgressFill: { height: 8, borderRadius: 4 },
  quizRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  scoreBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  streakGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  streakItem: { alignItems: "center", gap: 2 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 15,
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backupSummaryList: {
    gap: Spacing.xs,
  },
  backupSummaryRow: {
    minHeight: 42,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  backupSummaryValue: {
    fontFamily: Fonts?.sansSemiBold,
    textAlign: "right",
    flexShrink: 0,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  resetBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
});
