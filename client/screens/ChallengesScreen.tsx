import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  AchievementBadgeSvg,
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon } from "@/components/icons";

const STORAGE_KEY = "challenges_data";

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  unit: string;
  points: number;
  daysTotal: number;
  color: { bg: string; text: string };
}

interface ChallengeProgress {
  joined: boolean;
  current: number;
  joinedAt: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: "quran_marathon",
    title: "Quran Reading Marathon",
    description: "Read 1 Juz this week",
    icon: "book-open",
    target: 20,
    unit: "pages",
    points: 500,
    daysTotal: 7,
    color: { bg: "#ECFDF5", text: "#059669" },
  },
  {
    id: "dhikr_master",
    title: "Dhikr Master",
    description: "Complete 1000 dhikr counts this week",
    icon: "repeat",
    target: 1000,
    unit: "counts",
    points: 300,
    daysTotal: 7,
    color: { bg: "#EFF6FF", text: "#2563EB" },
  },
  {
    id: "prayer_perfect",
    title: "Prayer Perfect",
    description: "Don't miss any prayer for 7 days",
    icon: "clock",
    target: 35,
    unit: "prayers",
    points: 700,
    daysTotal: 7,
    color: { bg: "#FAF5FF", text: "#7C3AED" },
  },
  {
    id: "knowledge_seeker",
    title: "Knowledge Seeker",
    description: "Read 7 different hadiths this week",
    icon: "award",
    target: 7,
    unit: "hadiths",
    points: 350,
    daysTotal: 7,
    color: { bg: "#FFFBEB", text: "#D97706" },
  },
  {
    id: "dua_daily",
    title: "Dua of the Day",
    description: "Learn a new dua every day for 7 days",
    icon: "heart",
    target: 7,
    unit: "duas",
    points: 400,
    daysTotal: 7,
    color: { bg: "#FFF1F2", text: "#E11D48" },
  },
  {
    id: "charity_challenge",
    title: "Charity Challenge",
    description: "Log 3 sadaqah entries this week",
    icon: "gift",
    target: 3,
    unit: "entries",
    points: 250,
    daysTotal: 7,
    color: { bg: "#F0FDFA", text: "#0D9488" },
  },
];

function getDaysRemaining(joinedAt: string, daysTotal: number): number {
  const joined = new Date(joinedAt).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - joined) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysTotal - elapsed);
}

export default function ChallengesScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<"challenges" | "leaderboard">(
    "challenges",
  );
  const [progress, setProgress] = useState<Record<string, ChallengeProgress>>(
    {},
  );

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProgress(JSON.parse(stored));
      }
    } catch {}
  };

  const saveProgress = async (data: Record<string, ChallengeProgress>) => {
    try {
      await syncedSetItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  };

  const joinChallenge = useCallback(
    (challengeId: string) => {
      const updated = {
        ...progress,
        [challengeId]: {
          joined: true,
          current: 0,
          joinedAt: new Date().toISOString(),
        },
      };
      setProgress(updated);
      saveProgress(updated);
    },
    [progress],
  );

  const incrementProgress = useCallback(
    (challengeId: string) => {
      const challenge = CHALLENGES.find((c) => c.id === challengeId);
      if (!challenge) return;
      const current = progress[challengeId]?.current || 0;
      if (current >= challenge.target) return;
      const updated = {
        ...progress,
        [challengeId]: {
          ...progress[challengeId],
          current: current + 1,
        },
      };
      setProgress(updated);
      saveProgress(updated);
    },
    [progress],
  );

  const renderChallengeCard = (challenge: Challenge, index: number) => {
    const p = progress[challenge.id];
    const joined = p?.joined || false;
    const current = p?.current || 0;
    const pct = Math.min((current / challenge.target) * 100, 100);
    const daysLeft = joined
      ? getDaysRemaining(p.joinedAt, challenge.daysTotal)
      : challenge.daysTotal;
    return (
      <Animated.View
        key={challenge.id}
        entering={FadeInDown.delay(index * 80).duration(400)}
      >
        <View
          style={[
            styles.challengeCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <View
            style={[
              styles.challengeAccent,
              { backgroundColor: challenge.color.text },
            ]}
          />
          <View style={styles.challengeContent}>
            <View style={styles.challengeHeader}>
              <View style={styles.challengeTitleRow}>
                <View
                  style={[
                    styles.challengeIcon,
                    {
                      backgroundColor: isDark
                        ? `${challenge.color.text}20`
                        : challenge.color.bg,
                    },
                  ]}
                >
                  <AppIcon
                    name={challenge.icon as any}
                    size={18}
                    color={challenge.color.text}
                  />
                </View>
                <View style={styles.challengeTitleWrap}>
                  <ThemedText type="h4">{challenge.title}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    {challenge.description}
                  </ThemedText>
                </View>
              </View>
              <View
                style={[
                  styles.timerBadge,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundSecondary
                      : theme.backgroundSecondary,
                  },
                ]}
              >
                <AppIcon name="clock" size={12} color={theme.textMuted} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, marginLeft: 4 }}
                >
                  {daysLeft}d left
                </ThemedText>
              </View>
            </View>

            {joined ? (
              <View style={styles.progressSection}>
                <View style={styles.progressLabels}>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    {current} / {challenge.target} {challenge.unit}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primaryText, fontWeight: "600" }}
                  >
                    {Math.round(pct)}%
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.progressBar,
                    {
                      backgroundColor: isDark
                        ? theme.backgroundSecondary
                        : theme.backgroundTertiary,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: theme.primary,
                      },
                    ]}
                  />
                </View>
                <View style={styles.challengeFooter}>
                  <View style={styles.pointsBadge}>
                    <AppIcon name="zap" size={12} color={theme.primaryText} />
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.primaryText,
                        fontWeight: "600",
                        marginLeft: 4,
                      }}
                    >
                      {challenge.points} pts
                    </ThemedText>
                  </View>
                  {current < challenge.target ? (
                    <Pressable
                      onPress={() => incrementProgress(challenge.id)}
                      style={[
                        styles.trackButton,
                        { backgroundColor: theme.primaryMuted },
                      ]}
                      testID={`button-track-${challenge.id}`}
                    >
                      <AppIcon
                        name="plus"
                        size={14}
                        color={theme.primaryText}
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color: theme.primaryText,
                          fontWeight: "600",
                          marginLeft: 4,
                        }}
                      >
                        Log
                      </ThemedText>
                    </Pressable>
                  ) : (
                    <View
                      style={[
                        styles.trackButton,
                        { backgroundColor: theme.primaryMuted },
                      ]}
                    >
                      <AppIcon
                        name="check"
                        size={14}
                        color={theme.primaryText}
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color: theme.primaryText,
                          fontWeight: "600",
                          marginLeft: 4,
                        }}
                      >
                        Done
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.challengeFooter}>
                <View style={styles.pointsBadge}>
                  <AppIcon name="zap" size={12} color={theme.primaryText} />
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.primaryText,
                      fontWeight: "600",
                      marginLeft: 4,
                    }}
                  >
                    {challenge.points} pts
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => joinChallenge(challenge.id)}
                  testID={`button-join-${challenge.id}`}
                >
                  <LinearGradient
                    colors={
                      isDark
                        ? [theme.gradientStart, theme.gradientMid]
                        : [theme.primary, theme.gradientStart]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.joinButton}
                  >
                    <ThemedText
                      type="caption"
                      style={{ color: theme.buttonText, fontWeight: "600" }}
                    >
                      Join
                    </ThemedText>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const challengeSummary = CHALLENGES.reduce(
    (summary, challenge) => {
      const challengeProgress = progress[challenge.id];
      if (!challengeProgress?.joined) return summary;
      const completed = Math.min(challengeProgress.current, challenge.target);
      return {
        joined: summary.joined + 1,
        completed:
          completed >= challenge.target
            ? summary.completed + 1
            : summary.completed,
        points:
          summary.points +
          Math.round((completed / challenge.target) * challenge.points),
      };
    },
    { joined: 0, completed: 0, points: 0 },
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
          Challenges
        </ThemedText>
        <View style={styles.backButton} />
      </View>

      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab("challenges")}
          style={[
            styles.tab,
            {
              backgroundColor:
                activeTab === "challenges" ? theme.primaryMuted : "transparent",
              borderColor:
                activeTab === "challenges" ? theme.primaryText : "transparent",
            },
          ]}
          testID="tab-challenges"
        >
          <AppIcon
            name="target"
            size={16}
            color={
              activeTab === "challenges" ? theme.primaryText : theme.textMuted
            }
          />
          <ThemedText
            type="small"
            style={{
              color:
                activeTab === "challenges"
                  ? theme.primaryText
                  : theme.textMuted,
              fontWeight: activeTab === "challenges" ? "600" : "400",
              marginLeft: Spacing.xs,
            }}
          >
            Active Challenges
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("leaderboard")}
          style={[
            styles.tab,
            {
              backgroundColor:
                activeTab === "leaderboard"
                  ? theme.primaryMuted
                  : "transparent",
              borderColor:
                activeTab === "leaderboard" ? theme.primaryText : "transparent",
            },
          ]}
          testID="tab-leaderboard"
        >
          <AppIcon
            name="bar-chart-2"
            size={16}
            color={
              activeTab === "leaderboard" ? theme.primaryText : theme.textMuted
            }
          />
          <ThemedText
            type="small"
            style={{
              color:
                activeTab === "leaderboard"
                  ? theme.primaryText
                  : theme.textMuted,
              fontWeight: activeTab === "leaderboard" ? "600" : "400",
              marginLeft: Spacing.xs,
            }}
          >
            Leaderboard
          </ThemedText>
        </Pressable>
      </View>
      <GoldDivider
        color={theme.scholar}
        opacity={0.26}
        style={styles.headerDivider}
      />

      {activeTab === "challenges" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + Spacing["2xl"],
            gap: Spacing.md,
          }}
        >
          {CHALLENGES.map((challenge, index) =>
            renderChallengeCard(challenge, index),
          )}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + Spacing["2xl"],
          }}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <View
              style={[
                styles.localProgressCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <GeometricCardPattern color={theme.scholar} opacity={0.012} />
              <View
                style={[
                  styles.localProgressIcon,
                  { backgroundColor: theme.primaryMuted },
                ]}
              >
                <AchievementBadgeSvg
                  size={34}
                  color={theme.primaryText}
                  accentColor={theme.scholar}
                />
              </View>
              <ThemedText type="h4" style={{ color: theme.text }}>
                Your challenge progress
              </ThemedText>
              <ThemedText
                type="small"
                style={{
                  color: theme.textMuted,
                  marginTop: Spacing.xs,
                  textAlign: "center",
                }}
              >
                Your personal challenge progress is shown here. Community
                rankings can be added once shared leaderboards are ready.
              </ThemedText>
              <View style={styles.localStatsRow}>
                {[
                  ["Joined", challengeSummary.joined],
                  ["Completed", challengeSummary.completed],
                  ["Points", challengeSummary.points],
                ].map(([label, value]) => (
                  <View key={label} style={styles.localStat}>
                    <ThemedText type="h4" style={{ color: theme.primaryText }}>
                      {value}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {label}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      )}
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
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  headerDivider: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  challengeCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  challengeAccent: {
    width: 4,
  },
  challengeContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  challengeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  challengeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.sm,
  },
  challengeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  challengeTitleWrap: {
    flex: 1,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  progressSection: {
    gap: Spacing.xs,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  challengeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  joinButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  localProgressCard: {
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    overflow: "hidden",
  },
  localProgressIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  localStatsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    width: "100%",
  },
  localStat: {
    flex: 1,
    alignItems: "center",
  },
  leaderboardContainer: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rankSection: {
    marginRight: Spacing.md,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  pointsSection: {
    alignItems: "flex-end",
  },
});
