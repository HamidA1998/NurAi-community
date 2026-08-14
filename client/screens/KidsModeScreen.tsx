import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import {
  buildFamilySafeKidsLearningPlan,
  FamilySafeKidsLearningPlan,
} from "@/services/familySafeKidsLearningService";
import { AppIcon } from "@/components/icons";

const AGE_GROUPS: {
  key: AgeGroup;
  label: string;
  icon: string;
  description: string;
}[] = [
  { key: "3-5", label: "Little Muslim", icon: "star", description: "Ages 4-6" },
  {
    key: "6-9",
    label: "Young Believer",
    icon: "award",
    description: "Ages 7-9",
  },
  {
    key: "10-13",
    label: "Growing Muslim",
    icon: "book-open",
    description: "Ages 10-12",
  },
];

const FEATURE_CARDS = [
  {
    id: "stories",
    icon: "book-open" as const,
    label: "Stories",
    description: "Prophet & Islamic stories",
    screen: "KidsStories",
    color: "purple" as const,
  },
  {
    id: "quizzes",
    icon: "help-circle" as const,
    label: "Quizzes",
    description: "Test your knowledge",
    screen: "KidsQuiz",
    color: "blue" as const,
  },
  {
    id: "memorize",
    icon: "headphones" as const,
    label: "Memorize",
    description: "Surahs & Duas",
    screen: "KidsMemorization",
    color: "emerald" as const,
  },
  {
    id: "games",
    icon: "play" as const,
    label: "Games",
    description: "Learn while playing",
    screen: "ArabicGames",
    color: "amber" as const,
  },
  {
    id: "akhlaq",
    icon: "heart" as const,
    label: "Akhlaq",
    description: "Good character",
    screen: "_akhlaq",
    color: "rose" as const,
  },
  {
    id: "parent",
    icon: "shield" as const,
    label: "For Parents",
    description: "Progress & settings",
    screen: "KidsParent",
    color: "blue" as const,
  },
];

const BADGE_ICONS: Record<string, string> = {
  star: "star",
  book: "book",
  brain: "cpu",
  medal: "award",
  trophy: "award",
  sparkle: "zap",
  heart: "heart",
  fire: "zap",
};

const LEARNING_MISSIONS = [
  {
    title: "Read a Prophet story",
    description: "Discover the life of a Prophet",
  },
  { title: "Learn 3 Arabic letters", description: "Practice Arabic writing" },
  { title: "Study a Surah tafsir", description: "Understand a verse meaning" },
  { title: "Read about a Sahabi", description: "Learn from the companions" },
  { title: "Explore Islamic history", description: "Discover Muslim heritage" },
  {
    title: "Learn about an animal in Quran",
    description: "Animals mentioned by Allah",
  },
  {
    title: "Read a story of patience",
    description: "Learn from the patient ones",
  },
];

const QUIZ_MISSIONS = [
  { title: "Complete a quiz", description: "Test what you know" },
  { title: "Practice memorization", description: "Review a Surah or Dua" },
  { title: "Play a matching game", description: "Match Arabic letters" },
  { title: "Answer 5 questions", description: "Quick knowledge check" },
  { title: "Try a new challenge", description: "Push your limits" },
  { title: "Review past lessons", description: "Strengthen your memory" },
  { title: "Beat your best score", description: "Aim for excellence" },
];

const AKHLAQ_MISSIONS = [
  {
    title: "Say Bismillah before eating",
    description: "Remember Allah at meals",
  },
  { title: "Help someone today", description: "Be kind and helpful" },
  { title: "Make extra dua", description: "Talk to Allah sincerely" },
  { title: "Say Salam to a neighbor", description: "Spread peace around you" },
  { title: "Share with a friend", description: "Practice generosity" },
  { title: "Be patient today", description: "Show sabr in all things" },
  { title: "Say Alhamdulillah often", description: "Be grateful always" },
];

const ALL_AKHLAQ_CHALLENGES = [
  { title: "Say Bismillah before every meal", icon: "coffee" },
  { title: "Help with a chore at home", icon: "home" },
  { title: "Say Salam to someone new", icon: "message-circle" },
  { title: "Share something with a sibling", icon: "gift" },
  { title: "Make dua for your parents", icon: "heart" },
  { title: "Be patient when things are hard", icon: "shield" },
  { title: "Say Alhamdulillah 10 times", icon: "star" },
  { title: "Read Quran for 5 minutes", icon: "book-open" },
  { title: "Forgive someone who upset you", icon: "smile" },
  { title: "Smile at everyone you meet", icon: "sun" },
];

function getDeterministicIndex(
  dateStr: string,
  pool: number,
  offset: number,
): number {
  let hash = offset;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % pool;
}

function getDailyMissions(dateStr: string, ageGroup: AgeGroup) {
  const seed = dateStr + (ageGroup || "");
  const li = getDeterministicIndex(seed, LEARNING_MISSIONS.length, 1);
  const qi = getDeterministicIndex(seed, QUIZ_MISSIONS.length, 2);
  const ai = getDeterministicIndex(seed, AKHLAQ_MISSIONS.length, 3);
  return [
    {
      id: "learning",
      type: "learning" as const,
      icon: "book" as const,
      color: "purple" as const,
      ...LEARNING_MISSIONS[li],
    },
    {
      id: "quiz",
      type: "quiz" as const,
      icon: "help-circle" as const,
      color: "blue" as const,
      ...QUIZ_MISSIONS[qi],
    },
    {
      id: "akhlaq",
      type: "akhlaq" as const,
      icon: "heart" as const,
      color: "emerald" as const,
      ...AKHLAQ_MISSIONS[ai],
    },
  ];
}

function getDailyAkhlaq(dateStr: string): { title: string; icon: string }[] {
  const indices: number[] = [];
  let offset = 100;
  while (indices.length < 5) {
    const idx = getDeterministicIndex(
      dateStr,
      ALL_AKHLAQ_CHALLENGES.length,
      offset,
    );
    if (!indices.includes(idx)) {
      indices.push(idx);
    }
    offset += 7;
  }
  return indices.map((i) => ALL_AKHLAQ_CHALLENGES[i]);
}

export default function KidsModeScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {
    settings,
    updateSettings,
    streak,
    badges,
    progress,
    isSetup,
    recordActivity,
    awardBadge,
  } = useKidsMode();

  const [childName, setChildName] = useState(settings.childName);
  const [showSetup, setShowSetup] = useState(!isSetup);

  const today = new Date().toISOString().split("T")[0];
  const missionsKey = `kids_daily_missions_${today}`;
  const akhlaqKey = `kids_akhlaq_${today}`;

  const [missionsDone, setMissionsDone] = useState<Record<string, boolean>>({});
  const [akhlaqDone, setAkhlaqDone] = useState<Record<string, boolean>>({});
  const allMissionsBonusRef = useRef(false);
  const allAkhlaqBonusRef = useRef(false);
  const kidsScrollRef = useRef<ScrollView>(null);
  const akhlaqSectionY = useRef(0);

  const missions = getDailyMissions(today, settings.ageGroup);
  const akhlaqChallenges = getDailyAkhlaq(today);
  const familySafeLearningPlan = useMemo(
    () => buildFamilySafeKidsLearningPlan({ settings, progress, badges }),
    [badges, progress, settings],
  );

  useEffect(() => {
    (async () => {
      try {
        const [mRaw, aRaw] = await Promise.all([
          AsyncStorage.getItem(missionsKey),
          AsyncStorage.getItem(akhlaqKey),
        ]);
        if (mRaw) {
          const parsed = JSON.parse(mRaw);
          setMissionsDone(parsed);
          if (parsed.learning && parsed.quiz && parsed.akhlaq) {
            allMissionsBonusRef.current = true;
          }
        }
        if (aRaw) {
          const parsed = JSON.parse(aRaw);
          setAkhlaqDone(parsed);
          const completedCount = Object.values(parsed).filter(Boolean).length;
          if (completedCount >= 5) {
            allAkhlaqBonusRef.current = true;
          }
        }
      } catch {}
    })();
  }, [missionsKey, akhlaqKey]);

  const getColor = (key: keyof typeof CategoryColors) =>
    isDark ? CategoryColors[key].dark : CategoryColors[key];

  const handleSelectAge = async (age: AgeGroup) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await updateSettings({
      ageGroup: age,
      enabled: true,
      childName: childName.trim() || "Little Muslim",
    });
    setShowSetup(false);
    await awardBadge(
      "first-login",
      "Welcome!",
      "Started your learning journey",
      "sparkle",
      "milestone",
    );
    await recordActivity(1, 10);
  };

  const toggleMission = useCallback(
    async (missionId: string) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMissionsDone((prev) => {
        const next = { ...prev, [missionId]: !prev[missionId] };
        AsyncStorage.setItem(missionsKey, JSON.stringify(next));
        const allDone = next.learning && next.quiz && next.akhlaq;
        if (allDone && !allMissionsBonusRef.current) {
          allMissionsBonusRef.current = true;
          recordActivity(5, 25);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        return next;
      });
    },
    [missionsKey, recordActivity],
  );

  const toggleAkhlaq = useCallback(
    async (index: number) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setAkhlaqDone((prev) => {
        const key = `item_${index}`;
        const next = { ...prev, [key]: !prev[key] };
        AsyncStorage.setItem(akhlaqKey, JSON.stringify(next));
        const completedCount = Object.values(next).filter(Boolean).length;
        if (completedCount >= 5 && !allAkhlaqBonusRef.current) {
          allAkhlaqBonusRef.current = true;
          recordActivity(3, 15);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        return next;
      });
    },
    [akhlaqKey, recordActivity],
  );

  const handleStartLearning = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!missionsDone.learning) {
      navigation.navigate("KidsStories");
    } else if (!missionsDone.quiz) {
      navigation.navigate("KidsQuiz");
    } else if (!missionsDone.akhlaq) {
      navigation.navigate("KidsMemorization");
    } else {
      navigation.navigate("KidsStories");
    }
  };

  const handleFeaturePress = (screen: string) => {
    Haptics.selectionAsync();
    // Akhlaq lives further down this same screen rather than on its own
    // route, so take the child to it instead of doing nothing.
    if (screen === "_akhlaq") {
      kidsScrollRef.current?.scrollTo({
        y: Math.max(akhlaqSectionY.current - 12, 0),
        animated: true,
      });
      return;
    }
    navigation.navigate(screen);
  };

  const dailyGoalPercent =
    settings.dailyGoalMinutes > 0
      ? Math.min(
          Math.round((progress.todayMinutes / settings.dailyGoalMinutes) * 100),
          100,
        )
      : 0;

  const missionsCompleted = [
    missionsDone.learning,
    missionsDone.quiz,
    missionsDone.akhlaq,
  ].filter(Boolean).length;

  if (showSetup || !isSetup) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
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
          <ThemedText type="h3">Kids Mode</ThemedText>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          ref={kidsScrollRef}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + 40,
          }}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.setupHero}>
              <AchievementBadgeSvg
                size={72}
                color={theme.primary}
                accentColor={theme.scholar}
              />
              <ThemedText
                type="h2"
                style={{ textAlign: "center", marginTop: Spacing.md }}
              >
                Welcome to Kids Mode!
              </ThemedText>
              <ThemedText
                type="body"
                style={{
                  color: theme.textSecondary,
                  textAlign: "center",
                  marginTop: Spacing.sm,
                }}
              >
                A safe and fun Islamic learning space
              </ThemedText>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              What's your name?
            </ThemedText>
            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                  color: theme.text,
                  fontFamily: Fonts?.sansSemiBold,
                },
              ]}
              placeholder="Enter child's name"
              placeholderTextColor={theme.textMuted}
              value={childName}
              onChangeText={setChildName}
              testID="input-child-name"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Select Age Group
            </ThemedText>
            {AGE_GROUPS.map((ag, i) => (
              <Animated.View
                key={ag.key}
                entering={FadeInDown.delay(400 + i * 100).duration(400)}
              >
                <Pressable
                  onPress={() => handleSelectAge(ag.key)}
                  style={[
                    styles.ageCard,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                  testID={`button-age-${ag.key}`}
                >
                  <AppIcon
                    name={ag.icon as any}
                    size={36}
                    color={theme.primary}
                  />
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <ThemedText type="h4">{ag.label}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {ag.description}
                    </ThemedText>
                  </View>
                  <AppIcon
                    name="chevron-right"
                    size={22}
                    color={theme.textMuted}
                  />
                </Pressable>
              </Animated.View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(700).duration(400)}>
            <View
              style={[
                styles.consentCard,
                {
                  backgroundColor: isDark
                    ? theme.backgroundTertiary
                    : "#F0FDF4",
                  borderColor: isDark ? "#334155" : "#BBF7D0",
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: Spacing.xs,
                  marginBottom: Spacing.sm,
                }}
              >
                <AppIcon name="shield" size={16} color={theme.primary} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "700" }}
                >
                  Parental Notice
                </ThemedText>
              </View>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, lineHeight: 18 }}
              >
                Kids Mode is designed for children. Activity data is saved
                locally and may sync to the signed-in account for progress
                continuity. We do not sell children's personal information or
                use third-party advertising tracking. A parent PIN is required
                for settings access. By selecting an age group, you confirm you
                are the parent or guardian.
              </ThemedText>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  const ageInfo = AGE_GROUPS.find((a) => a.key === settings.ageGroup);

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
        <ThemedText type="h3">Kids Mode</ThemedText>
        <Pressable
          onPress={() => navigation.navigate("KidsParent" as never)}
          style={styles.headerBtn}
          testID="button-parent"
        >
          <AppIcon name="shield" size={22} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* Welcome Card */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={isDark ? ["#7C3AED", "#6D28D9"] : ["#8B5CF6", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeCard}
          >
            <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
            <View style={styles.welcomeRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.welcomeGreeting,
                    { fontFamily: Fonts?.sansBold },
                  ]}
                >
                  Assalamu Alaikum, {settings.childName}!
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 2,
                  }}
                >
                  <ThemedText
                    type="body"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    {ageInfo ? ageInfo.label : ""}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.streakBubble}>
                <AppIcon name="zap" size={20} color="rgba(255,255,255,0.8)" />
                <Text
                  style={[styles.streakCount, { fontFamily: Fonts?.sansBold }]}
                >
                  {streak.currentStreak}
                </Text>
                <Text style={[styles.streakLabel, { fontFamily: Fonts?.sans }]}>
                  day streak
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Progress Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View
            style={[
              styles.dailyGoalCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <GeometricCardPattern color={theme.scholar} opacity={0.012} />
            <View style={styles.goalHeader}>
              <ThemedText type="h4">Today's Progress</ThemedText>
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
                    backgroundColor: getColor("purple").text,
                    width: `${dailyGoalPercent}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <AppIcon name="star" size={20} color={theme.text} />
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  {progress.totalPoints}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Points
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <AppIcon name="book" size={20} color={theme.text} />
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  {progress.storiesRead}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Stories
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <AppIcon name="cpu" size={20} color={theme.text} />
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  {progress.quizzesCompleted}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Quizzes
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <AppIcon name="award" size={20} color={theme.text} />
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  {badges.length}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Badges
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(125).duration(400)}>
          <FamilySafeKidsLearningPanel
            plan={familySafeLearningPlan}
            isDark={isDark}
            onOpenParentControls={() =>
              navigation.navigate("KidsParent" as never)
            }
            colors={{
              background: theme.surfaceGlass,
              border: theme.borderSubtle,
              text: theme.text,
              muted: theme.textMuted,
              emeraldBg: getColor("emerald").bg,
              emeraldText: getColor("emerald").text,
              amberBg: getColor("amber").bg,
              amberText: getColor("amber").text,
              purpleBg: getColor("purple").bg,
              purpleText: getColor("purple").text,
              secondary: isDark
                ? theme.backgroundTertiary
                : theme.backgroundSecondary,
            }}
          />
        </Animated.View>

        {/* Daily Missions */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <View style={styles.missionHeader}>
            <ThemedText
              type="h4"
              style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}
            >
              Today's Missions
            </ThemedText>
            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor:
                    missionsCompleted >= 3
                      ? getColor("emerald").bg
                      : getColor("purple").bg,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{
                  fontWeight: "600",
                  color:
                    missionsCompleted >= 3
                      ? getColor("emerald").text
                      : getColor("purple").text,
                }}
              >
                {missionsCompleted}/3
              </ThemedText>
            </View>
          </View>

          {missions.map((mission, i) => {
            const done = missionsDone[mission.id];
            const mColor = getColor(mission.color);
            return (
              <Animated.View
                key={mission.id}
                entering={FadeInDown.delay(200 + i * 60).duration(400)}
              >
                <Pressable
                  onPress={() => toggleMission(mission.id)}
                  style={[
                    styles.missionCard,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                      opacity: done ? 0.7 : 1,
                    },
                  ]}
                  testID={`button-mission-${mission.id}`}
                >
                  <View
                    style={[styles.missionIcon, { backgroundColor: mColor.bg }]}
                  >
                    <AppIcon
                      name={mission.icon}
                      size={20}
                      color={mColor.text}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <ThemedText
                      type="small"
                      style={{
                        fontWeight: "600",
                        textDecorationLine: done ? "line-through" : "none",
                      }}
                    >
                      {mission.title}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {mission.description}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.checkCircle,
                      {
                        borderColor: done
                          ? getColor("emerald").text
                          : theme.borderSubtle,
                        backgroundColor: done
                          ? getColor("emerald").bg
                          : "transparent",
                      },
                    ]}
                  >
                    {done ? (
                      <AppIcon
                        name="check"
                        size={14}
                        color={getColor("emerald").text}
                      />
                    ) : null}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}

          {missionsCompleted >= 3 ? (
            <View
              style={[
                styles.bonusBanner,
                { backgroundColor: getColor("emerald").bg },
              ]}
            >
              <AppIcon
                name="check-circle"
                size={16}
                color={getColor("emerald").text}
              />
              <ThemedText
                type="caption"
                style={{
                  color: getColor("emerald").text,
                  fontWeight: "600",
                  marginLeft: Spacing.sm,
                }}
              >
                All missions complete! +25 bonus points
              </ThemedText>
            </View>
          ) : null}
        </Animated.View>

        {/* Start Today's Learning CTA */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Pressable
            onPress={handleStartLearning}
            testID="button-start-learning"
            style={{ marginTop: Spacing.lg }}
          >
            <LinearGradient
              colors={isDark ? ["#7C3AED", "#6D28D9"] : ["#8B5CF6", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <Text style={[styles.ctaText, { fontFamily: Fonts?.sansBold }]}>
                Start Today's Learning
              </Text>
              <AppIcon name="arrow-right" size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Feature Grid */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Learn & Explore
          </ThemedText>
          <GoldDivider
            color={theme.scholar}
            opacity={0.28}
            style={styles.sectionDivider}
          />
          {[0, 2, 4].map((rowStart, rowIdx) => (
            <View key={rowStart} style={styles.featureRow}>
              {FEATURE_CARDS.slice(rowStart, rowStart + 2).map((card, i) => {
                const color = getColor(card.color);
                return (
                  <Animated.View
                    key={card.id}
                    entering={FadeInDown.delay(
                      400 + (rowIdx * 2 + i) * 60,
                    ).duration(400)}
                    style={styles.featureCardWrapper}
                  >
                    <Pressable
                      onPress={() => handleFeaturePress(card.screen)}
                      style={[
                        styles.featureCard,
                        {
                          backgroundColor: theme.surfaceGlass,
                          borderColor: theme.borderSubtle,
                        },
                      ]}
                      testID={`button-feature-${card.id}`}
                    >
                      <View
                        style={[
                          styles.featureIcon,
                          { backgroundColor: color.bg },
                        ]}
                      >
                        <AppIcon
                          name={card.icon}
                          size={24}
                          color={color.text}
                        />
                      </View>
                      <ThemedText
                        type="small"
                        style={{ fontWeight: "600", marginTop: Spacing.sm }}
                        numberOfLines={1}
                      >
                        {card.label}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, textAlign: "center" }}
                        numberOfLines={2}
                      >
                        {card.description}
                      </ThemedText>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          ))}
        </Animated.View>

        {/* Akhlaq Challenges */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(400)}
          onLayout={(event) => {
            akhlaqSectionY.current = event.nativeEvent.layout.y;
          }}
        >
          <ThemedText type="h4" style={styles.sectionTitle}>
            Good Deeds Today
          </ThemedText>
          <View
            style={[
              styles.akhlaqCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            {akhlaqChallenges.map((challenge, i) => {
              const done = akhlaqDone[`item_${i}`];
              return (
                <Pressable
                  key={`akhlaq-${i}`}
                  onPress={() => toggleAkhlaq(i)}
                  style={[
                    styles.akhlaqRow,
                    i < akhlaqChallenges.length - 1
                      ? {
                          borderBottomWidth: 1,
                          borderBottomColor: theme.borderSubtle,
                        }
                      : undefined,
                  ]}
                  testID={`button-akhlaq-${i}`}
                >
                  <View
                    style={[
                      styles.akhlaqIcon,
                      { backgroundColor: getColor("rose").bg },
                    ]}
                  >
                    <AppIcon
                      name={challenge.icon as any}
                      size={16}
                      color={getColor("rose").text}
                    />
                  </View>
                  <ThemedText
                    type="small"
                    style={{
                      flex: 1,
                      marginLeft: Spacing.md,
                      textDecorationLine: done ? "line-through" : "none",
                      opacity: done ? 0.6 : 1,
                    }}
                  >
                    {challenge.title}
                  </ThemedText>
                  <View
                    style={[
                      styles.checkCircleSmall,
                      {
                        borderColor: done
                          ? getColor("emerald").text
                          : theme.borderSubtle,
                        backgroundColor: done
                          ? getColor("emerald").bg
                          : "transparent",
                      },
                    ]}
                  >
                    {done ? (
                      <AppIcon
                        name="check"
                        size={12}
                        color={getColor("emerald").text}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          {Object.values(akhlaqDone).filter(Boolean).length >= 5 ? (
            <View
              style={[
                styles.bonusBanner,
                {
                  backgroundColor: getColor("emerald").bg,
                  marginTop: Spacing.sm,
                },
              ]}
            >
              <AppIcon
                name="check-circle"
                size={16}
                color={getColor("emerald").text}
              />
              <ThemedText
                type="caption"
                style={{
                  color: getColor("emerald").text,
                  fontWeight: "600",
                  marginLeft: Spacing.sm,
                }}
              >
                All good deeds done! +15 bonus points
              </ThemedText>
            </View>
          ) : null}
        </Animated.View>

        {/* Badges */}
        {badges.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(600).duration(400)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Badges Earned
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesRow}
            >
              {badges.map((badge) => (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeItem,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <AppIcon
                    name={(BADGE_ICONS[badge.icon] || "star") as any}
                    size={28}
                    color={theme.text}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      fontWeight: "600",
                      marginTop: 4,
                      textAlign: "center",
                    }}
                  >
                    {badge.title}
                  </ThemedText>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        {/* Streak Record */}
        <Animated.View entering={FadeInDown.delay(700).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Streak Record
          </ThemedText>
          <View
            style={[
              styles.streakDetailCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <AppIcon name="zap" size={20} color={theme.text} />
                <ThemedText type="h4">{streak.currentStreak}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Current
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <AppIcon name="award" size={20} color={theme.text} />
                <ThemedText type="h4">{streak.longestStreak}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Best
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <AppIcon name="calendar" size={20} color={theme.text} />
                <ThemedText type="h4">{streak.totalDaysActive}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Total Days
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function FamilySafeKidsLearningPanel({
  plan,
  colors,
  isDark,
  onOpenParentControls,
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
  isDark: boolean;
  onOpenParentControls: () => void;
}) {
  return (
    <View
      style={[
        styles.familySafeCard,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
      testID="kids-family-safe-learning-plan"
      accessible
      accessibilityLabel="Parent-approved learning plan with child safety boundaries"
    >
      <GeometricCardPattern color={colors.purpleText} opacity={0.012} />
      <View style={styles.familySafeHeader}>
        <View
          style={[styles.familySafeIcon, { backgroundColor: colors.emeraldBg }]}
        >
          <AppIcon name="shield" size={18} color={colors.emeraldText} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="caption" style={{ color: colors.emeraldText }}>
            FAMILY-SAFE KIDS MODE
          </ThemedText>
          <ThemedText type="h4">{plan.title}</ThemedText>
        </View>
      </View>
      <ThemedText
        type="caption"
        style={{ color: colors.muted, marginTop: Spacing.sm }}
      >
        {plan.subtitle}
      </ThemedText>

      <View style={styles.familySafeMetaRow}>
        {[
          plan.ageBandLabel,
          plan.dailyLimitLabel,
          plan.nextParentReviewLabel,
        ].map((label) => (
          <View
            key={label}
            style={[
              styles.familySafeMetaPill,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
              },
            ]}
          >
            <ThemedText type="caption" style={{ color: colors.text }}>
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.familyWeeklyPlan} testID="kids-weekly-family-plan">
        <View style={styles.familyWeeklyHeader}>
          <AppIcon name="calendar" size={15} color={colors.emeraldText} />
          <ThemedText
            type="caption"
            style={{ color: colors.emeraldText, fontFamily: Fonts?.sansBold }}
          >
            WEEKLY FAMILY PLAN
          </ThemedText>
        </View>
        {plan.weeklyMissions.slice(0, 3).map((mission) => (
          <View
            key={mission.id}
            style={styles.familyWeeklyMission}
            testID={`kids-weekly-family-mission-${mission.id}`}
          >
            <View
              style={[
                styles.familyWeeklyMissionIcon,
                { backgroundColor: colors.emeraldBg },
              ]}
            >
              <AppIcon name="check" size={13} color={colors.emeraldText} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText
                type="small"
                style={{ fontFamily: Fonts?.sansSemiBold }}
              >
                {mission.title}
              </ThemedText>
              <ThemedText type="caption" style={{ color: colors.muted }}>
                {mission.cadenceLabel} · {mission.childViewLabel}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.familySafeLaneGrid}>
        {plan.lanes.slice(0, 2).map((lane) => (
          <View
            key={lane.id}
            style={[
              styles.familySafeLane,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                borderColor: colors.border,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{ fontFamily: Fonts?.sansSemiBold }}
            >
              {lane.title}
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: colors.muted, marginTop: 2 }}
              numberOfLines={2}
            >
              {lane.stateLabel}
            </ThemedText>
          </View>
        ))}
      </View>

      <View
        style={styles.familyReceiptGrid}
        testID="kids-family-safety-receipts"
      >
        {plan.reviewReceipts.slice(0, 2).map((receipt) => (
          <View
            key={receipt.id}
            style={[
              styles.familyReceiptCard,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                borderColor: colors.border,
              },
            ]}
            testID={`kids-family-safety-receipt-${receipt.id}`}
          >
            <ThemedText
              type="caption"
              style={{ color: colors.emeraldText, fontFamily: Fonts?.sansBold }}
            >
              {receipt.title}
            </ThemedText>
            <ThemedText type="caption" style={{ color: colors.text }}>
              {receipt.evidenceLabel}
            </ThemedText>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.familySafePolicy,
          {
            backgroundColor: colors.amberBg,
          },
        ]}
      >
        <AppIcon name="lock" size={15} color={colors.amberText} />
        <ThemedText
          type="caption"
          style={{
            color: colors.amberText,
            flex: 1,
            fontFamily: Fonts?.sansSemiBold,
          }}
        >
          No open AI chat for kids. Reviewed stories before child view.
        </ThemedText>
      </View>

      <Pressable
        onPress={onOpenParentControls}
        style={[
          styles.familySafeCta,
          {
            backgroundColor: colors.purpleBg,
          },
        ]}
        testID="button-kids-open-parent-controls"
        accessibilityRole="button"
        accessibilityLabel="Open parent controls for Kids Mode"
        accessibilityHint="Review age band, daily limits, parent PIN, and child-safety settings"
      >
        <AppIcon name="settings" size={16} color={colors.purpleText} />
        <Text
          style={[
            styles.familySafeCtaText,
            { color: colors.purpleText, fontFamily: Fonts?.sansBold },
          ]}
        >
          Open Parent Controls
        </Text>
      </Pressable>
    </View>
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
  setupHero: { alignItems: "center", paddingVertical: Spacing["2xl"] },
  sectionTitle: { marginTop: Spacing.xl, marginBottom: Spacing.md },
  sectionDivider: {
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  nameInput: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  ageCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  welcomeCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  welcomeRow: { flexDirection: "row", alignItems: "center" },
  welcomeGreeting: { color: "#FFFFFF", fontSize: 18 },
  streakBubble: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  streakCount: { color: "#FFFFFF", fontSize: 20 },
  streakLabel: { color: "rgba(255,255,255,0.8)", fontSize: 10 },
  dailyGoalCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  familySafeCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  familySafeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  familySafeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  familySafeMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  familySafeMetaPill: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexGrow: 1,
    flexBasis: "48%",
  },
  familySafeLaneGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  familyWeeklyPlan: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  familyWeeklyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  familyWeeklyMission: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  familyWeeklyMissionIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  familySafeLane: {
    flex: 1,
    minHeight: 78,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  familyReceiptGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  familyReceiptCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    justifyContent: "center",
    gap: 2,
  },
  familySafePolicy: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  familySafeCta: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  familySafeCtaText: {
    fontSize: 14,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  goalProgressBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  goalProgressFill: { height: 8, borderRadius: 4 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: Spacing.lg,
  },
  statItem: { alignItems: "center", gap: 2 },
  missionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  missionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  missionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  bonusBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  ctaButton: {
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  featureRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  featureCardWrapper: {
    flex: 1,
  },
  featureCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: "center",
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  akhlaqCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  akhlaqRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  akhlaqIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgesRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  badgeItem: {
    width: 80,
    height: 90,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
  },
  streakDetailCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  consentCard: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
});
