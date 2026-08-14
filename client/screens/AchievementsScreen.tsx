import React, { useState, useEffect } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, CategoryColors } from "@/constants/theme";
import { useNurAI } from "@/context/NurAIContext";
import { computeAllProgress } from "@/services/achievementsTracker";
import {
  AchievementBadgeSvg,
  GeometricCardPattern,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  target: number;
  points: number;
}

interface BadgeProgress {
  current: number;
  unlocked: boolean;
  unlockedDate?: string;
}

type AchievementsData = Record<string, BadgeProgress>;

const BADGES: Badge[] = [
  {
    id: "first_prayer",
    name: "First Prayer",
    description: "Complete your first prayer log",
    icon: "sun",
    category: "Prayer",
    target: 1,
    points: 10,
  },
  {
    id: "prayer_warrior",
    name: "Prayer Warrior",
    description: "Pray 5 times in one day",
    icon: "shield",
    category: "Prayer",
    target: 5,
    points: 25,
  },
  {
    id: "fajr_champion",
    name: "Fajr Champion",
    description: "Don't miss Fajr for 7 days",
    icon: "sunrise",
    category: "Prayer",
    target: 7,
    points: 40,
  },
  {
    id: "prayer_streak_7",
    name: "Prayer Streak 7",
    description: "7-day prayer streak",
    icon: "zap",
    category: "Prayer",
    target: 7,
    points: 30,
  },
  {
    id: "prayer_streak_30",
    name: "Prayer Streak 30",
    description: "30-day prayer streak",
    icon: "award",
    category: "Prayer",
    target: 30,
    points: 60,
  },
  {
    id: "prayer_master",
    name: "Prayer Master",
    description: "100-day prayer streak",
    icon: "star",
    category: "Prayer",
    target: 100,
    points: 100,
  },

  {
    id: "first_surah",
    name: "First Surah",
    description: "Read your first surah",
    icon: "book-open",
    category: "Quran",
    target: 1,
    points: 10,
  },
  {
    id: "quran_explorer",
    name: "Quran Explorer",
    description: "Read 10 different surahs",
    icon: "compass",
    category: "Quran",
    target: 10,
    points: 35,
  },
  {
    id: "juz_reader",
    name: "Juz Reader",
    description: "Complete a full Juz",
    icon: "book",
    category: "Quran",
    target: 1,
    points: 50,
  },
  {
    id: "hafiz_journey",
    name: "Hafiz Journey",
    description: "Memorize 5 surahs",
    icon: "bookmark",
    category: "Quran",
    target: 5,
    points: 60,
  },
  {
    id: "quran_lover",
    name: "Quran Lover",
    description: "Read Quran 30 days in a row",
    icon: "heart",
    category: "Quran",
    target: 30,
    points: 80,
  },

  {
    id: "first_dhikr",
    name: "First Dhikr",
    description: "Complete first tasbeeh session",
    icon: "disc",
    category: "Dhikr",
    target: 1,
    points: 10,
  },
  {
    id: "tasbeeh_master",
    name: "Tasbeeh Master",
    description: "Complete 1000 total dhikr",
    icon: "repeat",
    category: "Dhikr",
    target: 1000,
    points: 50,
  },
  {
    id: "dhikr_streak",
    name: "Dhikr Streak",
    description: "7-day dhikr streak",
    icon: "activity",
    category: "Dhikr",
    target: 7,
    points: 30,
  },

  {
    id: "curious_mind",
    name: "Curious Mind",
    description: "Read 10 hadiths",
    icon: "search",
    category: "Knowledge",
    target: 10,
    points: 25,
  },
  {
    id: "dua_collector",
    name: "Dua Collector",
    description: "Learn 10 duas",
    icon: "heart",
    category: "Knowledge",
    target: 10,
    points: 25,
  },
  {
    id: "names_learner",
    name: "Names Learner",
    description: "Learn all 99 Names of Allah",
    icon: "star",
    category: "Knowledge",
    target: 99,
    points: 100,
  },
  {
    id: "arabic_starter",
    name: "Arabic Starter",
    description: "Complete first Arabic lesson",
    icon: "type",
    category: "Knowledge",
    target: 1,
    points: 15,
  },
  {
    id: "scholar_path",
    name: "Scholar Path",
    description: "Complete all Fiqh categories",
    icon: "award",
    category: "Knowledge",
    target: 1,
    points: 80,
  },

  {
    id: "first_post",
    name: "First Post",
    description: "Make your first community post",
    icon: "message-circle",
    category: "Community",
    target: 1,
    points: 10,
  },
  {
    id: "helpful",
    name: "Helpful",
    description: "Get 10 likes on posts",
    icon: "thumbs-up",
    category: "Community",
    target: 10,
    points: 30,
  },
  {
    id: "community_leader",
    name: "Community Leader",
    description: "Make 50 posts",
    icon: "users",
    category: "Community",
    target: 50,
    points: 60,
  },

  {
    id: "ramadan_warrior",
    name: "Ramadan Warrior",
    description: "Complete Ramadan goals",
    icon: "moon",
    category: "Special",
    target: 1,
    points: 100,
  },
  {
    id: "hajj_prepared",
    name: "Hajj Prepared",
    description: "Complete Hajj checklist",
    icon: "map",
    category: "Special",
    target: 1,
    points: 80,
  },
  {
    id: "generous_soul",
    name: "Generous Soul",
    description: "Log 10 sadaqah entries",
    icon: "gift",
    category: "Special",
    target: 10,
    points: 40,
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Use the app before Fajr 5 times",
    icon: "sunrise",
    category: "Special",
    target: 5,
    points: 30,
  },
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Use app during Tahajjud time 5 times",
    icon: "moon",
    category: "Special",
    target: 5,
    points: 30,
  },
  {
    id: "streak_garden",
    name: "Streak Garden",
    description: "Grow 5 plants in streak garden",
    icon: "feather",
    category: "Special",
    target: 5,
    points: 35,
  },
  {
    id: "app_explorer",
    name: "App Explorer",
    description: "Visit all screens at least once",
    icon: "grid",
    category: "Special",
    target: 1,
    points: 20,
  },
  {
    id: "nurai_companion",
    name: "NurAI Companion",
    description: "Use AI chat 10 times",
    icon: "message-circle",
    category: "Special",
    target: 10,
    points: 25,
  },
];

const getDefaultProgress = (): AchievementsData => {
  const data: AchievementsData = {};
  BADGES.forEach((badge) => {
    data[badge.id] = { current: 0, unlocked: false };
  });
  return data;
};

const getCategoryColor = (category: string, isDark: boolean) => {
  switch (category) {
    case "Prayer":
      return isDark ? CategoryColors.emerald.dark : CategoryColors.emerald;
    case "Quran":
      return isDark ? CategoryColors.blue.dark : CategoryColors.blue;
    case "Dhikr":
      return isDark ? CategoryColors.teal.dark : CategoryColors.teal;
    case "Knowledge":
      return isDark ? CategoryColors.purple.dark : CategoryColors.purple;
    case "Community":
      return isDark ? CategoryColors.amber.dark : CategoryColors.amber;
    case "Special":
      return isDark ? CategoryColors.rose.dark : CategoryColors.rose;
    default:
      return isDark ? CategoryColors.emerald.dark : CategoryColors.emerald;
  }
};

export default function AchievementsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { getAchievementNudgeFn } = useNurAI();
  const isFocused = useIsFocused();
  const [progress, setProgress] =
    useState<AchievementsData>(getDefaultProgress());
  const [selectedFilter, setSelectedFilter] = useState<string>("All");
  const [showNudge, setShowNudge] = useState(true);

  const filters = [
    "All",
    "Prayer",
    "Quran",
    "Dhikr",
    "Knowledge",
    "Community",
    "Special",
  ];

  useEffect(() => {
    if (isFocused) {
      loadProgress();
    }
  }, [isFocused]);

  const loadProgress = async () => {
    try {
      const computed = await computeAllProgress();
      const merged = getDefaultProgress();
      Object.keys(computed).forEach((key) => {
        if (merged[key]) {
          merged[key] = computed[key];
        }
      });
      setProgress(merged);
    } catch {}
  };

  const filteredBadges =
    selectedFilter === "All"
      ? BADGES
      : BADGES.filter((b) => b.category === selectedFilter);

  const unlockedBadges = filteredBadges.filter((b) => progress[b.id]?.unlocked);
  const lockedBadges = filteredBadges.filter((b) => !progress[b.id]?.unlocked);

  const totalEarned = BADGES.filter((b) => progress[b.id]?.unlocked).length;
  const totalPoints = BADGES.reduce((sum, b) => {
    return progress[b.id]?.unlocked ? sum + b.points : sum;
  }, 0);

  const streakDays = (() => {
    const prayerStreak =
      progress["prayer_streak_30"]?.current ||
      progress["prayer_streak_7"]?.current ||
      0;
    return prayerStreak;
  })();

  const achievementNudge = getAchievementNudgeFn(
    BADGES.map((b) => ({
      id: b.id,
      name: b.name,
      target: b.target,
      icon: b.icon,
      category: b.category,
    })),
    progress,
  );

  const renderBadgeCard = (badge: Badge, index: number) => {
    const bp = progress[badge.id] || { current: 0, unlocked: false };
    const isUnlocked = bp.unlocked;
    const progressPercent = Math.min((bp.current / badge.target) * 100, 100);
    const catColor = getCategoryColor(badge.category, isDark);

    return (
      <Animated.View
        key={badge.id}
        entering={FadeInDown.delay(index * 50).duration(400)}
        style={styles.badgeCardWrapper}
      >
        {isUnlocked ? (
          <LinearGradient
            colors={
              isDark
                ? [theme.gradientStart, theme.gradientMid]
                : [theme.gradientLightBg, theme.gradientLightBg2]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.badgeCard, { borderColor: theme.primaryText }]}
          >
            <GeometricCardPattern color={theme.scholar} opacity={0.012} />
            {renderBadgeContent(
              badge,
              bp,
              isUnlocked,
              catColor,
              progressPercent,
            )}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.badgeCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <GeometricCardPattern color={theme.scholar} opacity={0.012} />
            {renderBadgeContent(
              badge,
              bp,
              isUnlocked,
              catColor,
              progressPercent,
            )}
            <View
              style={[
                styles.lockedOverlay,
                {
                  backgroundColor: isDark
                    ? "rgba(15,23,42,0.4)"
                    : "rgba(241,245,249,0.4)",
                },
              ]}
            />
          </View>
        )}
      </Animated.View>
    );
  };

  const renderBadgeContent = (
    badge: Badge,
    bp: BadgeProgress,
    isUnlocked: boolean,
    catColor: { bg: string; text: string },
    progressPercent: number,
  ) => (
    <View style={styles.badgeContent}>
      <View
        style={[
          styles.badgeIconCircle,
          {
            backgroundColor: isUnlocked
              ? theme.gradientLightBg
              : isDark
                ? theme.backgroundTertiary
                : theme.backgroundSecondary,
          },
        ]}
      >
        {isUnlocked ? (
          <AchievementBadgeSvg
            size={32}
            color={theme.primaryText}
            accentColor={theme.scholar}
          />
        ) : (
          <AppIcon name={badge.icon as any} size={22} color={theme.textMuted} />
        )}
      </View>

      <ThemedText
        type="small"
        style={[
          styles.badgeName,
          { color: isUnlocked ? theme.primaryText : theme.text },
        ]}
      >
        {badge.name}
      </ThemedText>

      <ThemedText
        type="caption"
        style={[
          styles.badgeDesc,
          { color: isUnlocked ? theme.primaryText : theme.textMuted },
        ]}
        numberOfLines={2}
      >
        {badge.description}
      </ThemedText>

      <View style={styles.badgeProgressContainer}>
        <View
          style={[
            styles.badgeProgressBg,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          <View
            style={[
              styles.badgeProgressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: isUnlocked
                  ? theme.primaryText
                  : theme.textMuted,
              },
            ]}
          />
        </View>
        <ThemedText
          type="caption"
          style={{
            color: isUnlocked ? theme.primaryText : theme.textMuted,
            marginTop: 2,
          }}
        >
          {bp.current}/{badge.target}
        </ThemedText>
      </View>

      <View style={styles.badgeFooter}>
        <View
          style={[
            styles.pointsBadge,
            {
              backgroundColor: isUnlocked
                ? theme.primaryMuted
                : isDark
                  ? theme.backgroundTertiary
                  : theme.backgroundSecondary,
            },
          ]}
        >
          <AppIcon
            name="star"
            size={10}
            color={isUnlocked ? theme.primaryText : theme.textMuted}
          />
          <ThemedText
            type="caption"
            style={{
              color: isUnlocked ? theme.primaryText : theme.textMuted,
              fontWeight: "600",
              marginLeft: 2,
            }}
          >
            {badge.points} pts
          </ThemedText>
        </View>
        {isUnlocked && bp.unlockedDate ? (
          <ThemedText
            type="caption"
            style={{ color: theme.primaryText, fontSize: 10 }}
          >
            {bp.unlockedDate}
          </ThemedText>
        ) : null}
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
          Achievements
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
          <LinearGradient
            colors={
              isDark
                ? [theme.gradientStart, theme.gradientMid]
                : [theme.primary, theme.gradientStart]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsCard}
          >
            <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statIconCircle}>
                  <AppIcon name="award" size={18} color={theme.buttonText} />
                </View>
                <ThemedText type="h3" style={styles.statValue}>
                  {totalEarned}
                </ThemedText>
                <ThemedText type="caption" style={styles.statLabel}>
                  Badges
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statDivider,
                  { backgroundColor: "rgba(255,255,255,0.2)" },
                ]}
              />
              <View style={styles.statItem}>
                <View style={styles.statIconCircle}>
                  <AppIcon name="zap" size={18} color={theme.buttonText} />
                </View>
                <ThemedText type="h3" style={styles.statValue}>
                  {streakDays}
                </ThemedText>
                <ThemedText type="caption" style={styles.statLabel}>
                  Streak Days
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statDivider,
                  { backgroundColor: "rgba(255,255,255,0.2)" },
                ]}
              />
              <View style={styles.statItem}>
                <View style={styles.statIconCircle}>
                  <AppIcon name="star" size={18} color={theme.buttonText} />
                </View>
                <ThemedText type="h3" style={styles.statValue}>
                  {totalPoints}
                </ThemedText>
                <ThemedText type="caption" style={styles.statLabel}>
                  Points
                </ThemedText>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {showNudge && achievementNudge ? (
          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            style={{ marginBottom: Spacing.md }}
          >
            <LinearGradient
              colors={
                isDark
                  ? [theme.gradientStart, theme.gradientMid]
                  : [theme.gradientLightBg, theme.gradientLightBg2]
              }
              style={styles.nuraiCard}
            >
              <View style={styles.nuraiHeader}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    flex: 1,
                  }}
                >
                  <View
                    style={[
                      styles.nuraiDot,
                      { backgroundColor: theme.primaryText },
                    ]}
                  />
                  <ThemedText
                    style={[styles.nuraiLabel, { color: theme.primaryText }]}
                  >
                    NurAI
                  </ThemedText>
                </View>
                <Pressable onPress={() => setShowNudge(false)} hitSlop={8}>
                  <AppIcon name="x" size={14} color={theme.primaryText} />
                </Pressable>
              </View>
              <View style={styles.nuraiBody}>
                <AppIcon
                  name={achievementNudge.icon as AppIconName}
                  size={18}
                  color={theme.primaryText}
                />
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[styles.nuraiTitle, { color: theme.primaryText }]}
                  >
                    Next Badge: {achievementNudge.badgeName}
                  </ThemedText>
                  <ThemedText
                    style={[styles.nuraiText, { color: theme.primaryText }]}
                  >
                    {achievementNudge.message}
                  </ThemedText>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {filters.map((f) => {
              const isActive = selectedFilter === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setSelectedFilter(f)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive
                        ? theme.gradientLightBg
                        : theme.surfaceGlass,
                      borderColor: isActive
                        ? theme.primaryText
                        : theme.borderSubtle,
                    },
                  ]}
                  testID={`filter-${f}`}
                >
                  <ThemedText
                    type="small"
                    style={{
                      color: isActive ? theme.primaryText : theme.textSecondary,
                      fontWeight: isActive ? "600" : "400",
                    }}
                  >
                    {f}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {unlockedBadges.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View style={styles.sectionHeader}>
              <AppIcon name="unlock" size={16} color={theme.primaryText} />
              <ThemedText
                type="h4"
                style={[styles.sectionTitle, { color: theme.primaryText }]}
              >
                Unlocked
              </ThemedText>
              <View
                style={[
                  styles.sectionCount,
                  { backgroundColor: theme.gradientLightBg },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.primaryText, fontWeight: "700" }}
                >
                  {unlockedBadges.length}
                </ThemedText>
              </View>
            </View>
            <View style={styles.badgesGrid}>
              {unlockedBadges.map((badge, index) =>
                renderBadgeCard(badge, index),
              )}
            </View>
          </Animated.View>
        ) : null}

        {lockedBadges.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <View style={styles.sectionHeader}>
              <AppIcon name="lock" size={16} color={theme.textMuted} />
              <ThemedText
                type="h4"
                style={[styles.sectionTitle, { color: theme.textSecondary }]}
              >
                Locked
              </ThemedText>
              <View
                style={[
                  styles.sectionCount,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundTertiary
                      : theme.backgroundSecondary,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, fontWeight: "700" }}
                >
                  {lockedBadges.length}
                </ThemedText>
              </View>
            </View>
            <View style={styles.badgesGrid}>
              {lockedBadges.map((badge, index) =>
                renderBadgeCard(badge, index),
              )}
            </View>
          </Animated.View>
        ) : null}
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
  statsCard: {
    borderRadius: 24,
    padding: Spacing["2xl"],
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  statValue: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  statLabel: {
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 48,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    flex: 1,
  },
  sectionCount: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 24,
    alignItems: "center",
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  badgeCardWrapper: {
    width: "48.5%",
  },
  badgeCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  badgeContent: {
    padding: Spacing.lg,
    alignItems: "center",
    zIndex: 1,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  badgeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  badgeName: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 2,
  },
  badgeDesc: {
    textAlign: "center",
    marginBottom: Spacing.sm,
    minHeight: 32,
  },
  badgeProgressContainer: {
    width: "100%",
    marginBottom: Spacing.sm,
  },
  badgeProgressBg: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  badgeProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  badgeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  nuraiCard: {
    borderRadius: 20,
    padding: Spacing.md,
  },
  nuraiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  nuraiDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  nuraiLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  nuraiBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  nuraiTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  nuraiText: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.9,
  },
});
