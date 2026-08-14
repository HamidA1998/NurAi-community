import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSubscription } from "@/context/SubscriptionContext";
import {
  AIResponseModal,
  type AIResponseData,
  type AIResponseState,
} from "@/components/AIResponseModal";
import { AIContextError, getRevertGuidance } from "@/services/aiContextService";
import { mapAIContextResponseToModalData } from "@/services/personalAIResponseMapper";
import {
  AIIconSvg,
  GeometricCardPattern,
  IslamicPatternBackground,
  QuranIconSvg,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

interface RevertStatus {
  isRevert: boolean;
  shahadaDate?: string;
}

const REVERT_MILESTONES: Record<number, string> = {
  0: "Beginning your journey",
  7: "First week complete",
  30: "First month complete",
  40: "Building the prayer habit",
  90: "Growing stronger every day",
  180: "Six months of growth",
  365: "First full year as Muslim",
  730: "Two years of deepening faith",
  1000: "Thousand days — flourishing",
};

interface EmotionCard {
  id: string;
  label: string;
  icon: AppIconName;
  color: string;
}

const EMOTIONS: EmotionCard[] = [
  { id: "grateful", label: "Grateful", icon: "heart", color: "#10B981" },
  { id: "struggling", label: "Struggling", icon: "cloud", color: "#6366F1" },
  { id: "lonely", label: "Lonely", icon: "user", color: "#8B5CF6" },
  { id: "confused", label: "Confused", icon: "help-circle", color: "#F59E0B" },
  {
    id: "motivated",
    label: "Motivated",
    icon: "trending-up",
    color: "#3B82F6",
  },
  { id: "overwhelmed", label: "Overwhelmed", icon: "loader", color: "#EF4444" },
  { id: "peaceful", label: "Peaceful", icon: "sun", color: "#14B8A6" },
];

interface ConcernCard {
  id: string;
  title: string;
  icon: AppIconName;
  question: string;
}

interface RevertAIRequest {
  question: string;
  emotion?: string;
  concern?: string;
}

const COMMON_CONCERNS: ConcernCard[] = [
  {
    id: "family",
    title: "My non-Muslim family",
    icon: "users",
    question:
      "My family doesn't understand or accept that I became Muslim. How can I maintain family ties while staying firm in my faith?",
  },
  {
    id: "social",
    title: "Social life changes",
    icon: "message-circle",
    question:
      "My social life has changed since becoming Muslim. I'm navigating friendships and social events. How do I handle this?",
  },
  {
    id: "past",
    title: "My past lifestyle",
    icon: "refresh-cw",
    question:
      "I sometimes feel guilt about my past before Islam. Are all my past sins really forgiven? How do I move forward?",
  },
  {
    id: "marriage",
    title: "Marriage as a revert",
    icon: "heart",
    question:
      "As a revert Muslim, how does marriage work? What are my rights? How do I find a suitable spouse?",
  },
  {
    id: "cultural",
    title: "Cultural vs Islamic",
    icon: "globe",
    question:
      "Sometimes I can't tell what is actually from Islam and what is just cultural practice. How do I tell the difference?",
  },
  {
    id: "judgment",
    title: "Dealing with judgment",
    icon: "shield",
    question:
      "I sometimes face judgment or misunderstanding from both non-Muslims and born Muslims. How do I handle this?",
  },
  {
    id: "holidays",
    title: "Holidays and celebrations",
    icon: "calendar",
    question:
      "How do I navigate holidays like Christmas or birthdays with my non-Muslim family and friends?",
  },
];

interface NextStep {
  title: string;
  screen?: string;
  icon: AppIconName;
}

function getNextSteps(daysSinceShahada: number): NextStep[] {
  if (daysSinceShahada < 30) {
    return [
      {
        title: "Learn to read Al-Fatihah",
        screen: "NewMuslim",
        icon: "book-open",
      },
      {
        title: "Try praying one prayer today",
        screen: "SalahGuide",
        icon: "clock",
      },
      {
        title: "Listen to Quran recitation",
        screen: "Quran",
        icon: "headphones",
      },
    ];
  } else if (daysSinceShahada < 90) {
    return [
      { title: "Try fasting a Monday", screen: "Ramadan", icon: "moon" },
      { title: "Learn 3 short duas", screen: "Duas", icon: "book" },
      {
        title: "Visit a mosque for Jummah",
        screen: "NearbyMosques",
        icon: "map-pin",
      },
    ];
  } else if (daysSinceShahada < 365) {
    return [
      {
        title: "Start a Quran reading plan",
        screen: "QuranReadingPlan",
        icon: "bookmark",
      },
      {
        title: "Explore the 99 Names of Allah",
        screen: "NamesOfAllah",
        icon: "star",
      },
      {
        title: "Connect with a study circle",
        screen: "NearbyMosques",
        icon: "users",
      },
    ];
  }
  return [
    {
      title: "Deepen your Quran understanding",
      screen: "Quran",
      icon: "book-open",
    },
    {
      title: "Study hadith collections",
      screen: "HadithLibrary",
      icon: "archive",
    },
    { title: "Learn about Umrah", screen: "HajjUmrah", icon: "navigation" },
  ];
}

export default function RevertJourneyScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<any>();
  const { isPremium, isScholar } = useSubscription();

  const [, setRevertStatus] = useState<RevertStatus>({
    isRevert: false,
  });
  const [daysSinceShahada, setDaysSinceShahada] = useState(0);
  const [currentMilestone, setCurrentMilestone] = useState(
    "Beginning your journey",
  );
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponseData | null>(null);
  const [aiState, setAiState] = useState<AIResponseState>("loading");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | undefined>();
  const [customQuestion, setCustomQuestion] = useState("");
  const [lastAIRequest, setLastAIRequest] = useState<RevertAIRequest | null>(
    null,
  );

  useEffect(() => {
    loadRevertStatus();
  }, []);

  const loadRevertStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem("nurai_revert_status");
      if (stored) {
        const status: RevertStatus = JSON.parse(stored);
        setRevertStatus(status);
        if (status.shahadaDate) {
          const shahada = new Date(`${status.shahadaDate}T00:00:00`);
          if (Number.isNaN(shahada.getTime())) return;
          const now = new Date();
          const days = Math.floor(
            (now.getTime() - shahada.getTime()) / (1000 * 60 * 60 * 24),
          );
          setDaysSinceShahada(Math.max(0, days));

          const milestoneDay = Object.keys(REVERT_MILESTONES)
            .map(Number)
            .sort((a, b) => b - a)
            .find((d) => days >= d);
          if (milestoneDay !== undefined) {
            setCurrentMilestone(REVERT_MILESTONES[milestoneDay]);
          }
        }
      }
    } catch {}
  };

  const askRevertJourneyAI = useCallback(
    async ({ question, emotion, concern }: RevertAIRequest) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLastAIRequest({ question, emotion, concern });
      setShowAIModal(true);
      setAiResponse(null);
      setAiErrorMessage(undefined);

      if (!isPremium) {
        setAiLoading(false);
        setAiState("upgrade");
        return;
      }

      setAiLoading(true);
      setAiState("loading");

      try {
        const result = await getRevertGuidance({
          question,
          emotion,
          concern,
          userTier: isScholar ? "scholar" : "premium",
        });

        if (result.success) {
          setAiResponse({
            ...mapAIContextResponseToModalData(result),
            feature: "revert_support",
            response: result.response || "",
          });
          setAiState("success");
        } else {
          setAiErrorMessage(
            "NurAI could not prepare this guidance. Please try again.",
          );
          setAiState("error");
        }
      } catch (error: any) {
        if (error instanceof AIContextError) {
          if (error.code === "UPGRADE_REQUIRED") {
            setAiState("upgrade");
          } else if (error.code === "RATE_LIMIT") {
            setAiState("rateLimit");
          } else {
            setAiErrorMessage(
              "NurAI could not prepare this guidance. Please try again.",
            );
            setAiState("error");
          }
        } else {
          setAiErrorMessage(
            "NurAI could not prepare this guidance. Please try again.",
          );
          setAiState("error");
        }
      } finally {
        setAiLoading(false);
      }
    },
    [isPremium, isScholar],
  );

  const handleEmotionTap = useCallback(
    (_emotion: EmotionCard) => {
      Haptics.selectionAsync().catch(() => {});
      navigation.navigate("GlobalSearch");
    },
    [navigation],
  );

  const handleConcernTap = useCallback(
    (_concern: ConcernCard) => {
      Haptics.selectionAsync().catch(() => {});
      navigation.navigate("GlobalSearch");
    },
    [navigation],
  );

  const handleCustomQuestion = useCallback(async () => {
    const question = customQuestion.trim();
    if (!question) return;
    setCustomQuestion("");
    navigation.navigate("GlobalSearch");
  }, [customQuestion, navigation]);

  const handleNextStep = (step: NextStep) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step.screen) {
      navigation.navigate(step.screen);
    }
  };

  const nextSteps = getNextSteps(daysSinceShahada);
  const progressPercent = Number.isFinite(daysSinceShahada)
    ? Math.min(Math.max((daysSinceShahada / 1000) * 100, 0), 100)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={[
              theme.gradientStart || theme.primary,
              theme.gradientEnd || theme.primaryMuted || theme.primary,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
            <View style={styles.heroContent}>
              <QuranIconSvg size={38} color="#FFFFFF" />
              <ThemedText style={styles.heroTitle} accessibilityRole="header">
                Your Journey
              </ThemedText>
              <ThemedText style={styles.heroDays}>
                {daysSinceShahada > 0 ? `Day ${daysSinceShahada}` : "Welcome"}
              </ThemedText>
              <ThemedText style={styles.heroMilestone}>
                {currentMilestone}
              </ThemedText>

              {daysSinceShahada > 0 ? (
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progressPercent}%` },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.progressLabel}>
                    {progressPercent < 100
                      ? `${Math.round(progressPercent)}% to 1000 days`
                      : "Milestone reached!"}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.heroSubtext}>
                  Set your shahada date in Settings to track your journey
                </ThemedText>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            How are you feeling?
          </ThemedText>
          <ThemedText
            style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
          >
            Tap to get personalized guidance
          </ThemedText>
          <View style={styles.emotionGrid}>
            {EMOTIONS.map((emotion, idx) => (
              <Pressable
                key={emotion.id}
                style={[
                  styles.emotionCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => handleEmotionTap(emotion)}
                testID={`emotion-${emotion.id}`}
              >
                <View
                  style={[
                    styles.emotionIconBg,
                    { backgroundColor: emotion.color + "20" },
                  ]}
                >
                  <AppIcon
                    name={emotion.icon}
                    size={20}
                    color={emotion.color}
                  />
                </View>
                <ThemedText
                  style={[styles.emotionLabel, { color: theme.text }]}
                >
                  {emotion.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Your Next Steps
          </ThemedText>
          <ThemedText
            style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
          >
            Small, achievable goals for where you are
          </ThemedText>
          {nextSteps.map((step, idx) => (
            <Pressable
              key={idx}
              style={[
                styles.stepCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => handleNextStep(step)}
              testID={`next-step-${idx}`}
            >
              <GeometricCardPattern color={theme.primary} opacity={0.012} />
              <View
                style={[
                  styles.stepIconBg,
                  {
                    backgroundColor: theme.primaryMuted || theme.primary + "20",
                  },
                ]}
              >
                <AppIcon name={step.icon} size={18} color={theme.primary} />
              </View>
              <ThemedText style={[styles.stepTitle, { color: theme.text }]}>
                {step.title}
              </ThemedText>
              <AppIcon
                name="chevron-right"
                size={18}
                color={theme.textSecondary}
              />
            </Pressable>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Common Concerns
          </ThemedText>
          <ThemedText
            style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
          >
            Questions many reverts have — answered with care
          </ThemedText>
          {COMMON_CONCERNS.map((concern) => (
            <Pressable
              key={concern.id}
              style={[
                styles.concernCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => handleConcernTap(concern)}
              testID={`concern-${concern.id}`}
            >
              <GeometricCardPattern color={theme.scholar} opacity={0.012} />
              <View
                style={[
                  styles.concernIconBg,
                  {
                    backgroundColor: theme.primaryMuted || theme.primary + "20",
                  },
                ]}
              >
                <AppIcon name={concern.icon} size={18} color={theme.primary} />
              </View>
              <ThemedText style={[styles.concernTitle, { color: theme.text }]}>
                {concern.title}
              </ThemedText>
              <AppIcon name="zap" size={16} color={theme.primary} />
            </Pressable>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Ask Anything
          </ThemedText>
          <ThemedText
            style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
          >
            No question is too basic — ask with confidence
          </ThemedText>
          <View
            style={[
              styles.askCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.border,
              },
            ]}
          >
            <GeometricCardPattern color={theme.primary} opacity={0.012} />
            <TextInput
              style={[
                styles.askInput,
                { color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Type your question"
              placeholderTextColor={theme.textSecondary}
              value={customQuestion}
              onChangeText={setCustomQuestion}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleCustomQuestion}
              maxLength={500}
              testID="input-revert-question"
            />
            <Pressable
              style={[
                styles.askButton,
                {
                  backgroundColor: customQuestion.trim()
                    ? theme.primary
                    : theme.border,
                },
              ]}
              onPress={handleCustomQuestion}
              disabled={!customQuestion.trim()}
              testID="button-ask-revert"
            >
              <AppIcon
                name="send"
                size={18}
                color={customQuestion.trim() ? "#FFFFFF" : theme.textSecondary}
              />
              <ThemedText
                style={[
                  styles.askButtonText,
                  {
                    color: customQuestion.trim()
                      ? "#FFFFFF"
                      : theme.textSecondary,
                  },
                ]}
              >
                Search app
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(500)}>
          <Pressable
            style={[styles.guideLink, { borderColor: theme.border }]}
            onPress={() => navigation.navigate("NewMuslim")}
            testID="button-new-muslim-guide"
          >
            <AIIconSvg size={20} color={theme.primary} />
            <ThemedText
              style={[styles.guideLinkText, { color: theme.primary }]}
            >
              New Muslim Guide — Learn the basics step by step
            </ThemedText>
            <AppIcon name="chevron-right" size={16} color={theme.primary} />
          </Pressable>
        </Animated.View>
      </ScrollView>

      <AIResponseModal
        visible={showAIModal}
        state={aiLoading ? "loading" : aiState}
        data={aiResponse}
        errorMessage={aiErrorMessage}
        featureLabel="Revert support"
        requiredTier="premium"
        onClose={() => setShowAIModal(false)}
        onRetry={
          lastAIRequest ? () => askRevertJourneyAI(lastAIRequest) : undefined
        }
        onFollowUp={(question) => askRevertJourneyAI({ question })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  heroCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  heroContent: {
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    opacity: 0.9,
    marginTop: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroDays: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: Spacing.xs,
  },
  heroMilestone: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    opacity: 0.85,
    marginTop: Spacing.xs,
  },
  heroSubtext: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.7,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  progressBarContainer: {
    width: "100%",
    marginTop: Spacing.md,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  progressLabel: {
    fontSize: 11,
    color: "#FFFFFF",
    opacity: 0.7,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: Spacing.md,
  },
  emotionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  emotionCard: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  emotionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  emotionLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  stepIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  stepTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  concernCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  concernIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  concernTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  askCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  askInput: {
    fontSize: 15,
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: "top",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  askButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  askButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  guideLink: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  guideLinkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
});
