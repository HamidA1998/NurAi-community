import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useSubscription } from "@/context/SubscriptionContext";
import {
  findRevenueCatPackage,
  resolvePurchasedPackageTier,
  type BillingPeriod,
  type PlanTier,
} from "@/services/subscriptionTier";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import {
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
  ScholarCrownSvg,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type HighlightFeature = {
  icon: AppIconName;
  title: string;
  desc: string;
};

const HIGHLIGHT_FEATURES: HighlightFeature[] = [
  {
    icon: "book-open" as const,
    title: "Full Quran Experience",
    desc: "More reciters, deeper reading tools & memorisation support",
  },
  {
    icon: "cpu" as const,
    title: "AI-Powered Insights",
    desc: "Smart verse analysis & personalised guidance",
  },
  {
    icon: "shield" as const,
    title: "Private Health Tracking",
    desc: "Women's health guidance with private backup and spreadsheet export",
  },
  {
    icon: "users" as const,
    title: "Family Tools",
    desc: "Create family groups, invite members & support kids learning",
  },
];

const PAYWALL_CONTEXTS: Record<
  string,
  {
    eyebrow: string;
    title: string;
    body: string;
    features: HighlightFeature[];
  }
> = {
  quran: {
    eyebrow: "QURAN STUDY UPGRADE",
    title: "Unlock Deeper Quran Study",
    body: "Premium adds ayah guidance, more reciters, word-by-word support, and study tools tied to the exact verse you are reading.",
    features: [
      {
        icon: "book-open",
        title: "Ayah Study Modes",
        desc: "Explain, reflect, words, action points, and source-aware follow-up",
      },
      {
        icon: "headphones",
        title: "More Reciters",
        desc: "Listen, repeat, and build a steadier Quran habit",
      },
      {
        icon: "shield",
        title: "Careful Sources",
        desc: "Guidance stays cautious around tafsir, hadith, and rulings",
      },
      {
        icon: "message-circle",
        title: "Ask Follow-up",
        desc: "Continue from the ayah context without starting again",
      },
    ],
  },
  arabic: {
    eyebrow: "QURANIC ARABIC UPGRADE",
    title: "Build Quranic Arabic Faster",
    body: "Scholar is designed for deeper Arabic learning, source-aware explanations, vocabulary review, and guided practice.",
    features: [
      {
        icon: "type",
        title: "Arabic Coaching",
        desc: "Understand words, patterns, and meanings with careful caveats",
      },
      {
        icon: "layers",
        title: "Mistake Review",
        desc: "Turn weak areas into focused daily practice",
      },
      {
        icon: "book-open",
        title: "Quran Vocabulary",
        desc: "Connect learning back to ayahs and real reading",
      },
      {
        icon: "award",
        title: "Mastery Path",
        desc: "Deeper guidance for serious learners",
      },
    ],
  },
  family: {
    eyebrow: "FAMILY CIRCLE UPGRADE",
    title: "Grow Together As A Family",
    body: "Premium unlocks private family groups, messages, shared progress, invitations, duas, and weekly family accountability.",
    features: [
      {
        icon: "users",
        title: "Private Family Group",
        desc: "Invite members and keep the space household-focused",
      },
      {
        icon: "message-circle",
        title: "Family Messages",
        desc: "Share reminders, encouragement, and progress together",
      },
      {
        icon: "bar-chart-2",
        title: "Progress Feed",
        desc: "See real weekly actions across Quran, salah, dua, and goals",
      },
      {
        icon: "target",
        title: "Family Goals",
        desc: "Build gentle competition around good deeds",
      },
    ],
  },
  library: {
    eyebrow: "NURAI LIBRARY UPGRADE",
    title: "Read NurAI Books Like A Real Study Library",
    body: "Premium unlocks full interactive books, chapter narration, reflections, bookmarks, quizzes, and guided AI study.",
    features: [
      {
        icon: "book",
        title: "Full Books",
        desc: "Read complete NurAI-exclusive titles inside the app",
      },
      {
        icon: "headphones",
        title: "Narration",
        desc: "Listen to chapters and save audio for offline study",
      },
      {
        icon: "edit-3",
        title: "Notes & Reflections",
        desc: "Keep private reflections tied to the chapter",
      },
      {
        icon: "message-circle",
        title: "Library Tutor",
        desc: "Ask for chapter explanations and action points",
      },
    ],
  },
  home: {
    eyebrow: "DAILY NURAI UPGRADE",
    title: "Upgrade Your Daily NurAI Home",
    body: "Premium keeps prayer, Quran, Arabic, streaks, goals, weather, and reading activity easier to manage in one calm daily flow.",
    features: HIGHLIGHT_FEATURES,
  },
};

const FREE_FEATURES = [
  "Quran with 3 reciters",
  "5 AI chat messages per day",
  "Basic Kids Mode",
  "Basic women's cycle tracking",
];

const TRUST_SIGNALS: {
  icon: AppIconName;
  title: string;
  body: string;
}[] = [
  {
    icon: "shield",
    title: "Plan checks stay live",
    body: "NurAI refreshes your access after purchase or restore so paid features unlock as soon as your store account confirms them.",
  },
  {
    icon: "book-open",
    title: "Careful Islamic answers",
    body: "AI features are designed to stay source-aware and cautious around tafsir, hadith, fiqh, and personal rulings.",
  },
  {
    icon: "lock",
    title: "Private by default",
    body: "Progress, reminders, family tools, and backups are presented with clear controls instead of hidden surprises.",
  },
];

const PREMIUM_FEATURES = [
  "All Quran reciters",
  "Enhanced Quran reciter access",
  "Hifz analytics and review insights",
  "AI verse insights and prayer analysis",
  "Women's health guidance with scholar and medical caveats",
  "Madhab-aware guidance",
  "Revert journey AI companion",
  "Private backup and spreadsheet export",
  "Kids Mode advanced packs",
  "Higher daily AI limits across premium features",
  "Family group and invite tools",
];

const SCHOLAR_FEATURES = [
  "Extended AI with source-aware scholarly perspectives",
  "Madhab-aware educational explanations",
  "Source-verified Quran & Hadith citations",
  "Source-context comparisons where available",
  "Higher daily AI allowance",
  "Long-form AI answers (up to 500 words)",
  "Advanced learning explanations",
  "Early access to new features",
];

const STORE_SETUP_TITLE = "Plans unavailable";
const PARTIAL_STORE_TITLE = "Some plans unavailable";
const STORE_SETUP_MESSAGE =
  "Plans are temporarily unavailable. Please try again shortly or restore an existing purchase.";

export default function SubscriptionScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    isPremium,
    isScholar,
    currentPlan,
    offerings,
    storeReady,
    storeError,
    loading,
    purchasePackage,
    restorePurchases,
    checkEntitlements,
    manageSubscription,
  } = useSubscription();

  const [purchasing, setPurchasing] = useState(false);
  const [refreshingPlans, setRefreshingPlans] = useState(false);
  const isPremiumOnly = isPremium && !isScholar;
  const [selectedTab, setSelectedTab] = useState<"premium" | "scholar">(() =>
    route.params?.initialTab === "scholar" || isPremiumOnly
      ? "scholar"
      : "premium",
  );
  const storeName = Platform.OS === "android" ? "Google Play" : "App Store";
  const storeAccountName =
    Platform.OS === "android" ? "Google Play account" : "App Store account";
  const paywallContext = useMemo(() => {
    const raw = String(
      route.params?.sourceFeature || route.params?.featureLabel || "",
    ).toLowerCase();
    if (/quran|ayah|verse|tafsir|reciter/.test(raw)) {
      return PAYWALL_CONTEXTS.quran;
    }
    if (/arabic|learning|lesson|vocab/.test(raw)) {
      return PAYWALL_CONTEXTS.arabic;
    }
    if (/family|circle|member|message/.test(raw)) {
      return PAYWALL_CONTEXTS.family;
    }
    if (/book|chapter|library|narration|reader/.test(raw)) {
      return PAYWALL_CONTEXTS.library;
    }
    if (/home|daily|guide|plan/.test(raw)) {
      return PAYWALL_CONTEXTS.home;
    }
    return PAYWALL_CONTEXTS.home;
  }, [route.params?.featureLabel, route.params?.sourceFeature]);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.initialTab === "scholar") {
        setSelectedTab("scholar");
      } else if (route.params?.initialTab === "premium") {
        setSelectedTab("premium");
      } else if (isPremiumOnly) {
        setSelectedTab("scholar");
      }
      checkEntitlements({ force: true }).catch(() => {});
    }, [checkEntitlements, isPremiumOnly, route.params?.initialTab]),
  );

  const currentOffering = offerings?.current;
  const availablePackages = Array.isArray(currentOffering?.availablePackages)
    ? currentOffering.availablePackages
    : [];
  const hasAnyPackages = availablePackages.length > 0;
  const packageForTier = (
    tier: Exclude<PlanTier, "free">,
    period: Exclude<BillingPeriod, "unknown">,
    fallbackPkg?: any,
  ) =>
    findRevenueCatPackage(availablePackages, tier, period) ||
    (fallbackPkg && resolvePurchasedPackageTier(fallbackPkg) === tier
      ? fallbackPkg
      : null);
  const premiumMonthlyPkg = packageForTier(
    "premium",
    "monthly",
    currentOffering?.monthly,
  );
  const premiumYearlyPkg = packageForTier(
    "premium",
    "annual",
    currentOffering?.annual,
  );
  const scholarMonthlyPkg = findRevenueCatPackage(
    availablePackages,
    "scholar",
    "monthly",
  );
  const scholarYearlyPkg = findRevenueCatPackage(
    availablePackages,
    "scholar",
    "annual",
  );

  const scholarAccent = theme.scholar;

  const getPrice = (pkg: any): string | null => {
    if (!pkg) return null;
    return pkg.product?.priceString || null;
  };

  const handlePurchase = async (pkg: any) => {
    if (!pkg) {
      if (Platform.OS !== "web") {
        Alert.alert(
          hasAnyPackages ? PARTIAL_STORE_TITLE : STORE_SETUP_TITLE,
          storeError || STORE_SETUP_MESSAGE,
        );
      }
      return;
    }
    setPurchasing(true);
    try {
      const purchased = await purchasePackage(pkg);
      if (purchased) {
        await checkEntitlements({ force: true }).catch(() => {});
        if (Platform.OS !== "web") {
          Alert.alert(
            "Purchase received",
            `Your purchase was received. NurAI is refreshing your account now, and paid features will unlock as soon as ${storeName} and NurAI confirm it.`,
          );
        }
      } else if (Platform.OS !== "web") {
        Alert.alert(
          "Purchase not completed",
          "No charge was completed. You can try again or restore an existing purchase.",
        );
      }
    } catch {
      if (Platform.OS !== "web") {
        Alert.alert(
          "Purchase Failed",
          "Something went wrong. Please try again.",
        );
      }
    } finally {
      setPurchasing(false);
    }
  };

  const renderPrice = (pkg: any, accentColor: string) => {
    const price = getPrice(pkg);
    return (
      <View style={styles.priceRow}>
        <ThemedText
          type={price ? "h2" : "h4"}
          style={{ color: price ? accentColor : theme.textSecondary }}
        >
          {price || (hasAnyPackages ? "Option unavailable" : STORE_SETUP_TITLE)}
        </ThemedText>
        {price ? (
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginLeft: 4 }}
          >
            /month
          </ThemedText>
        ) : null}
      </View>
    );
  };

  const renderYearlyBadge = (pkg: any, accentColor: string, label: string) => {
    const price = getPrice(pkg);
    return (
      <View
        style={[
          styles.saveBadge,
          {
            backgroundColor:
              accentColor === scholarAccent
                ? theme.scholarSoft
                : isDark
                  ? `${accentColor}20`
                  : theme.gradientLightBg,
          },
        ]}
      >
        <AppIcon
          name={price ? "tag" : "alert-circle"}
          size={13}
          color={accentColor}
        />
        <ThemedText
          type="caption"
          style={{ color: accentColor, fontWeight: "700", flex: 1 }}
        >
          {price ? `${label} - ${price}/year` : "Annual option unavailable"}
        </ThemedText>
      </View>
    );
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const restored = await restorePurchases();
      if (Platform.OS !== "web") {
        if (restored) {
          await checkEntitlements({ force: true }).catch(() => {});
          Alert.alert(
            "Restore received",
            "Your purchases were found. NurAI is refreshing your account now, and paid features will unlock as soon as your plan is confirmed.",
          );
        } else {
          Alert.alert(
            "No Purchases Found",
            "No previous purchases were found to restore.",
          );
        }
      }
    } catch {
      if (Platform.OS !== "web") {
        Alert.alert(
          "Restore unavailable",
          "We could not check your purchases right now. Please try again shortly.",
        );
      }
    }
    setPurchasing(false);
  };

  const handleRefreshPlans = async () => {
    setRefreshingPlans(true);
    try {
      await checkEntitlements({ force: true });
    } catch {
      if (Platform.OS !== "web") {
        Alert.alert(
          "Refresh Failed",
          "Plans could not be refreshed. Please try again shortly.",
        );
      }
    } finally {
      setRefreshingPlans(false);
    }
  };

  const planLabels: Record<string, string> = {
    free: "Free Plan",
    premium: "Premium Member",
    scholar: "Scholar Member",
  };

  const renderFeatureRow = (text: string, color: string, index: number) => (
    <Animated.View
      key={index}
      entering={FadeInDown.delay(50 * index).duration(300)}
      style={styles.featureRow}
    >
      <View
        style={[styles.featureCheckCircle, { backgroundColor: `${color}15` }]}
      >
        <AppIcon name="check" size={12} color={color} />
      </View>
      <ThemedText
        type="small"
        style={[styles.featureText, { color: theme.text }]}
      >
        {text}
      </ThemedText>
    </Animated.View>
  );

  const renderActivePlanBanner = () => {
    const gradientColors: [string, string, string] = isScholar
      ? ["#3E331A", theme.scholar, "#F6D57A"]
      : [theme.gradientStart, theme.gradientMid, theme.gradientEnd];

    return (
      <Animated.View entering={FadeInDown.duration(500)}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.activeBanner}
        >
          <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
          <View style={styles.activeBannerGlow} />
          <View style={styles.activeBannerIcon}>
            <ScholarCrownSvg size={34} color="#FFFFFF" accentColor="#D6A84F" />
          </View>
          <ThemedText type="h2" style={styles.activeBannerTitle}>
            {planLabels[currentPlan]}
          </ThemedText>
          <ThemedText style={styles.activeBannerSub}>
            You have access to your plan's included features
          </ThemedText>
        </LinearGradient>

        <Pressable
          style={[
            styles.manageBtn,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.borderLight,
            },
          ]}
          onPress={manageSubscription}
          testID="button-manage-subscription"
        >
          <AppIcon name="settings" size={18} color={theme.primary} />
          <ThemedText style={[styles.manageBtnText, { color: theme.primary }]}>
            Manage Subscription
          </ThemedText>
          <AppIcon name="external-link" size={14} color={theme.primary} />
        </Pressable>
      </Animated.View>
    );
  };

  const renderHero = () => (
    <Animated.View entering={FadeInDown.duration(500)}>
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientMid, theme.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
        <View style={styles.heroGlow} />
        <View style={styles.heroIcon}>
          <ScholarCrownSvg size={38} color="#FFFFFF" accentColor="#D6A84F" />
        </View>
        <ThemedText type="caption" style={styles.heroEyebrow}>
          {paywallContext.eyebrow}
        </ThemedText>
        <ThemedText type="h2" style={styles.heroTitle}>
          {paywallContext.title}
        </ThemedText>
        <ThemedText style={styles.heroSub}>{paywallContext.body}</ThemedText>
      </LinearGradient>
    </Animated.View>
  );

  const renderHighlightCards = () => (
    <Animated.View
      entering={FadeInDown.delay(150).duration(400)}
      style={styles.highlightSection}
    >
      <ThemedText
        type="h4"
        style={[styles.sectionTitle, { color: theme.text }]}
      >
        What You Get
      </ThemedText>
      <View style={styles.highlightGrid}>
        {paywallContext.features.map((feat, i) => (
          <View
            key={i}
            style={[
              styles.highlightCard,
              {
                backgroundColor: isDark ? theme.cardBackground : theme.surface,
                borderColor: isDark ? theme.border : theme.borderLight,
              },
            ]}
          >
            <View
              style={[
                styles.highlightIconWrap,
                { backgroundColor: theme.primaryMuted },
              ]}
            >
              <AppIcon name={feat.icon} size={20} color={theme.primary} />
            </View>
            <ThemedText
              type="small"
              style={[styles.highlightTitle, { color: theme.text }]}
            >
              {feat.title}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {feat.desc}
            </ThemedText>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  const renderPlanPositioning = () => (
    <Animated.View
      entering={FadeInDown.delay(175).duration(400)}
      style={[
        styles.planPositioningCard,
        {
          backgroundColor: theme.surfaceGlass,
          borderColor: theme.borderSubtle,
        },
      ]}
    >
      <GeometricCardPattern color={theme.primary} opacity={0.012} />
      <View style={styles.positioningRow}>
        <View
          style={[
            styles.positioningIcon,
            { backgroundColor: theme.primaryMuted },
          ]}
        >
          <AppIcon name="zap" size={16} color={theme.primary} />
        </View>
        <View style={styles.positioningCopy}>
          <ThemedText
            type="small"
            style={{ color: theme.text, fontWeight: "800" }}
          >
            Premium
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Best for daily habits, Quran tools, family, and smarter guidance.
          </ThemedText>
        </View>
      </View>
      <View
        style={[
          styles.positioningDivider,
          { backgroundColor: theme.borderSubtle },
        ]}
      />
      <View style={styles.positioningRow}>
        <View
          style={[
            styles.positioningIcon,
            { backgroundColor: theme.scholarSoft },
          ]}
        >
          <AppIcon name="book-open" size={16} color={scholarAccent} />
        </View>
        <View style={styles.positioningCopy}>
          <ThemedText
            type="small"
            style={{ color: theme.text, fontWeight: "800" }}
          >
            Scholar
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Best for deeper Arabic, sourced study, and advanced AI learning.
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );

  const renderTrustSignals = () => (
    <Animated.View
      entering={FadeInDown.delay(190).duration(400)}
      style={[
        styles.trustSignalCard,
        {
          backgroundColor: theme.surfaceGlass,
          borderColor: theme.borderSubtle,
        },
      ]}
      testID="subscription-trust-signals"
    >
      <GeometricCardPattern color={theme.scholar} opacity={0.012} />
      <View style={styles.trustSignalHeader}>
        <AppIcon name="shield" size={16} color={theme.scholar} />
        <ThemedText
          type="small"
          style={{ color: theme.text, fontWeight: "900" }}
        >
          Built for serious Islamic learning
        </ThemedText>
      </View>
      <View style={styles.trustSignalGrid}>
        {TRUST_SIGNALS.map((signal) => (
          <View key={signal.title} style={styles.trustSignalRow}>
            <View
              style={[
                styles.trustSignalIcon,
                { backgroundColor: `${theme.scholar}14` },
              ]}
            >
              <AppIcon name={signal.icon} size={14} color={theme.scholar} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <ThemedText
                type="caption"
                style={{ color: theme.text, fontWeight: "800" }}
              >
                {signal.title}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{
                  color: theme.textSecondary,
                  lineHeight: 18,
                  marginTop: 2,
                }}
              >
                {signal.body}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  const renderPlanToggle = () => (
    <Animated.View
      entering={FadeInDown.delay(200).duration(400)}
      style={styles.toggleSection}
    >
      <ThemedText
        type="h4"
        style={[styles.sectionTitle, { color: theme.text }]}
      >
        Choose Your Plan
      </ThemedText>
      <View
        style={[
          styles.toggleContainer,
          {
            backgroundColor: isDark
              ? theme.backgroundSecondary
              : theme.backgroundSecondary,
          },
        ]}
      >
        <Pressable
          style={[
            styles.toggleTab,
            selectedTab === "premium"
              ? [
                  styles.toggleTabActive,
                  { backgroundColor: theme.cardBackground },
                ]
              : null,
          ]}
          onPress={() => setSelectedTab("premium")}
          testID="button-tab-premium"
        >
          <AppIcon
            name="star"
            size={14}
            color={selectedTab === "premium" ? theme.primary : theme.textMuted}
          />
          <ThemedText
            type="small"
            style={{
              color:
                selectedTab === "premium" ? theme.primary : theme.textMuted,
              fontWeight: selectedTab === "premium" ? "700" : "400",
            }}
          >
            Premium
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.toggleTab,
            selectedTab === "scholar"
              ? [
                  styles.toggleTabActive,
                  { backgroundColor: theme.cardBackground },
                ]
              : null,
          ]}
          onPress={() => setSelectedTab("scholar")}
          testID="button-tab-scholar"
        >
          <AppIcon
            name="book-open"
            size={14}
            color={selectedTab === "scholar" ? scholarAccent : theme.textMuted}
          />
          <ThemedText
            type="small"
            style={{
              color:
                selectedTab === "scholar" ? scholarAccent : theme.textMuted,
              fontWeight: selectedTab === "scholar" ? "700" : "400",
            }}
          >
            Scholar
          </ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );

  const renderStoreReadinessNotice = () => {
    if (loading || storeReady) return null;

    return (
      <Animated.View entering={FadeInDown.delay(225).duration(350)}>
        <View
          style={[
            styles.storeNotice,
            {
              backgroundColor: isDark ? theme.backgroundSecondary : "#FFF8E7",
              borderColor: theme.scholarSoft,
            },
          ]}
          testID="notice-store-setup-required"
        >
          <View
            style={[
              styles.storeNoticeIcon,
              { backgroundColor: theme.scholarSoft },
            ]}
          >
            <AppIcon name="alert-circle" size={18} color={theme.scholar} />
          </View>
          <View style={styles.storeNoticeText}>
            <ThemedText
              type="small"
              style={{ color: theme.text, fontWeight: "700" }}
            >
              {hasAnyPackages ? PARTIAL_STORE_TITLE : STORE_SETUP_TITLE}
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.storeNoticeBody, { color: theme.textSecondary }]}
            >
              {storeError || STORE_SETUP_MESSAGE}
            </ThemedText>
            <Pressable
              onPress={handleRefreshPlans}
              disabled={refreshingPlans || purchasing || loading}
              accessibilityRole="button"
              accessibilityLabel="Refresh subscription plans"
              accessibilityState={{
                disabled: refreshingPlans || purchasing || loading,
                busy: refreshingPlans,
              }}
              testID="button-refresh-plans"
              style={({ pressed }) => [
                styles.storeNoticeAction,
                {
                  borderColor: theme.scholarSoft,
                  backgroundColor: theme.cardBackground,
                  opacity:
                    refreshingPlans || purchasing || loading
                      ? 0.55
                      : pressed
                        ? 0.82
                        : 1,
                },
              ]}
            >
              <AppIcon name="refresh-cw" size={13} color={theme.scholar} />
              <ThemedText
                type="caption"
                style={[styles.storeNoticeActionText, { color: theme.scholar }]}
              >
                {refreshingPlans ? "Refreshing..." : "Refresh plans"}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderPremiumPlan = () => {
    const accentColor = theme.primary;

    return (
      <Animated.View entering={FadeInDown.delay(250).duration(400)}>
        <View
          style={[
            styles.planCard,
            {
              backgroundColor: theme.cardBackground,
              borderColor: accentColor,
              borderWidth: 2,
            },
          ]}
          testID="plan-premium"
        >
          <GeometricCardPattern color={accentColor} opacity={0.012} />
          <LinearGradient
            colors={[`${accentColor}12`, `${accentColor}04`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.planCardGradientOverlay}
          />

          <View style={styles.popularBadge}>
            <Badge variant="premium" size="sm" />
          </View>

          <View style={styles.planHeader}>
            <View
              style={[
                styles.planIconWrap,
                { backgroundColor: theme.primaryMuted },
              ]}
            >
              <AppIcon name="star" size={22} color={accentColor} />
            </View>
            <View style={styles.planHeaderText}>
              <ThemedText type="h3" style={{ color: theme.text }}>
                Premium
              </ThemedText>
              {renderPrice(premiumMonthlyPkg, accentColor)}
            </View>
          </View>

          {renderYearlyBadge(premiumYearlyPkg, accentColor, "Annual option")}

          <View
            style={[styles.planDivider, { backgroundColor: theme.borderLight }]}
          />
          <GoldDivider color={accentColor} opacity={0.36} />

          <ThemedText
            type="caption"
            style={[styles.includesLabel, { color: theme.textSecondary }]}
          >
            Everything in Free, plus:
          </ThemedText>
          {PREMIUM_FEATURES.map((f, i) => renderFeatureRow(f, accentColor, i))}

          {!isPremium ? (
            <View style={styles.ctaSection}>
              <Button
                variant="primary"
                size="lg"
                icon="arrow-right"
                onPress={() => handlePurchase(premiumMonthlyPkg)}
                disabled={purchasing || loading || !premiumMonthlyPkg}
                haptic
              >
                {purchasing
                  ? "Processing..."
                  : premiumMonthlyPkg
                    ? "Subscribe Monthly"
                    : "Monthly unavailable"}
              </Button>

              <Button
                variant="secondary"
                size="md"
                onPress={() => handlePurchase(premiumYearlyPkg)}
                disabled={purchasing || loading || !premiumYearlyPkg}
              >
                {premiumYearlyPkg ? "Subscribe Yearly" : "Yearly unavailable"}
              </Button>
            </View>
          ) : null}
        </View>
      </Animated.View>
    );
  };

  const renderScholarPlan = () => (
    <Animated.View entering={FadeInDown.delay(250).duration(400)}>
      <View
        style={[
          styles.planCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: scholarAccent,
            borderWidth: 2,
          },
        ]}
        testID="plan-scholar"
      >
        <GeometricCardPattern color={scholarAccent} opacity={0.012} />
        <LinearGradient
          colors={[`${scholarAccent}12`, `${scholarAccent}04`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.planCardGradientOverlay}
        />

        <View style={styles.popularBadge}>
          <Badge variant="scholar" size="sm" />
        </View>

        <View style={styles.planHeader}>
          <View
            style={[
              styles.planIconWrap,
              { backgroundColor: theme.scholarSoft },
            ]}
          >
            <AppIcon name="book-open" size={22} color={scholarAccent} />
          </View>
          <View style={styles.planHeaderText}>
            <ThemedText type="h3" style={{ color: theme.text }}>
              Scholar
            </ThemedText>
            {renderPrice(scholarMonthlyPkg, scholarAccent)}
          </View>
        </View>

        {renderYearlyBadge(scholarYearlyPkg, scholarAccent, "Annual option")}

        <View
          style={[styles.planDivider, { backgroundColor: theme.borderLight }]}
        />
        <GoldDivider color={scholarAccent} opacity={0.42} />

        <ThemedText
          type="caption"
          style={[styles.includesLabel, { color: theme.textSecondary }]}
        >
          Everything in Premium, plus:
        </ThemedText>
        {SCHOLAR_FEATURES.map((f, i) => renderFeatureRow(f, scholarAccent, i))}

        {!isScholar ? (
          <View style={styles.ctaSection}>
            <Button
              variant="scholar"
              size="lg"
              icon="arrow-right"
              onPress={() => handlePurchase(scholarMonthlyPkg)}
              disabled={purchasing || loading || !scholarMonthlyPkg}
              haptic
            >
              {purchasing
                ? "Processing..."
                : scholarMonthlyPkg
                  ? "Subscribe Monthly"
                  : "Monthly unavailable"}
            </Button>

            <Button
              variant="secondary"
              size="md"
              onPress={() => handlePurchase(scholarYearlyPkg)}
              disabled={purchasing || loading || !scholarYearlyPkg}
            >
              {scholarYearlyPkg ? "Subscribe Yearly" : "Yearly unavailable"}
            </Button>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );

  const renderFreePlan = () => (
    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
      <View
        style={[
          styles.freePlanCard,
          {
            backgroundColor: isDark ? theme.backgroundSecondary : theme.surface,
            borderColor: isDark ? theme.border : theme.borderLight,
          },
        ]}
        testID="plan-free"
      >
        <GeometricCardPattern color={theme.textMuted} opacity={0.012} />
        <View style={styles.freePlanHeader}>
          <View
            style={[
              styles.freePlanIconWrap,
              { backgroundColor: `${theme.textMuted}15` },
            ]}
          >
            <AppIcon name="user" size={18} color={theme.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: Spacing.sm,
              }}
            >
              <ThemedText type="h4" style={{ color: theme.text }}>
                Free Plan
              </ThemedText>
              <Badge variant="free" size="sm" />
            </View>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Basic features included
            </ThemedText>
          </View>
        </View>
        <View style={styles.freeFeatureList}>
          {FREE_FEATURES.map((f, i) => (
            <View key={i} style={styles.freeFeatureRow}>
              <AppIcon name="check" size={12} color={theme.textMuted} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, flex: 1 }}
              >
                {f}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );

  const renderFamilyPlan = () => (
    <Animated.View entering={FadeInDown.delay(350).duration(400)}>
      <View
        style={[
          styles.familyCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: isDark ? `${theme.primary}30` : theme.primaryBorder,
          },
        ]}
      >
        <GeometricCardPattern color={theme.primary} opacity={0.012} />
        <LinearGradient
          colors={[`${theme.primary}08`, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.familyGradientOverlay}
        />
        <View style={styles.familyHeader}>
          <View
            style={[
              styles.familyIconWrap,
              { backgroundColor: theme.primarySubtle },
            ]}
          >
            <AppIcon name="users" size={22} color={theme.primary} />
          </View>
          <View style={styles.familyHeaderContent}>
            <ThemedText type="h4" style={{ color: theme.text }}>
              Family Tools
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              Create a family group, invite members and keep learning together
            </ThemedText>
          </View>
        </View>

        <View style={styles.familyFeatures}>
          {[
            "In-app member invites",
            "Family learning hub",
            "Local shared dua board",
            "Group progress view",
          ].map((f, i) => (
            <View key={i} style={styles.familyFeatureRow}>
              <AppIcon name="check" size={12} color={theme.primary} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, flex: 1 }}
              >
                {f}
              </ThemedText>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.includedBadge,
            { backgroundColor: theme.primarySubtle },
          ]}
        >
          <AppIcon name="check-circle" size={12} color={theme.primary} />
          <ThemedText
            type="caption"
            style={{ color: theme.primary, fontWeight: "700", marginLeft: 4 }}
          >
            Premium Included
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );

  const renderFooter = () => (
    <Animated.View entering={FadeInDown.delay(400).duration(400)}>
      <Pressable
        style={styles.restoreBtn}
        onPress={handleRestore}
        disabled={purchasing}
        testID="button-restore-purchases"
      >
        <AppIcon name="refresh-cw" size={14} color={theme.primary} />
        <ThemedText
          type="small"
          style={{ color: theme.primary, marginLeft: 6 }}
        >
          Restore Purchases
        </ThemedText>
      </Pressable>

      <View
        style={[
          styles.disclaimerCard,
          {
            backgroundColor: isDark
              ? theme.backgroundSecondary
              : theme.surfaceElevated,
            borderColor: theme.borderLight,
          },
        ]}
      >
        <GeometricCardPattern color={theme.scholar} opacity={0.012} />
        <View style={styles.disclaimerHeader}>
          <AppIcon name="info" size={13} color={theme.textMuted} />
          <ThemedText
            type="caption"
            style={[styles.disclaimerTitle, { color: theme.textSecondary }]}
          >
            Disclaimer
          </ThemedText>
        </View>
        <ThemedText
          type="caption"
          style={[styles.disclaimerText, { color: theme.textMuted }]}
        >
          Subscriptions auto-renew unless cancelled at least 24 hours before the
          end of the current period. Manage or cancel your subscription in your{" "}
          {storeAccountName} settings.
        </ThemedText>
        <View style={styles.legalLinks}>
          <Pressable
            testID="button-terms"
            onPress={() =>
              WebBrowser.openBrowserAsync(
                "https://eliteautomations.co.uk/nurai/terms",
              )
            }
          >
            <ThemedText type="caption" style={{ color: theme.primary }}>
              Terms of Service
            </ThemedText>
          </Pressable>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            {" | "}
          </ThemedText>
          <Pressable
            testID="button-privacy"
            onPress={() =>
              WebBrowser.openBrowserAsync(
                "https://eliteautomations.co.uk/nurai/privacy-policy",
              )
            }
          >
            <ThemedText type="caption" style={{ color: theme.primary }}>
              Privacy Policy
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.headerBtn,
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h4">Choose Your Plan</ThemedText>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing["5xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isPremium || isScholar ? renderActivePlanBanner() : renderHero()}

        {renderHighlightCards()}

        {renderPlanPositioning()}

        {renderTrustSignals()}

        {renderPlanToggle()}

        {renderStoreReadinessNotice()}

        {selectedTab === "premium" ? renderPremiumPlan() : renderScholarPlan()}

        {renderFreePlan()}

        {renderFamilyPlan()}

        {renderFooter()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },

  heroCard: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing["3xl"],
    alignItems: "center",
    marginBottom: Spacing["2xl"],
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.78)",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 1.4,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  heroSub: {
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: Spacing.sm,
  },

  activeBanner: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing["3xl"],
    alignItems: "center",
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  activeBannerGlow: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  activeBannerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  activeBannerTitle: {
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  activeBannerSub: {
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    fontSize: 14,
  },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing["2xl"],
  },
  manageBtnText: { fontWeight: "600", flex: 1, textAlign: "center" },

  highlightSection: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  highlightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  highlightCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  highlightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  highlightTitle: {
    fontWeight: "600",
    marginBottom: 2,
  },

  planPositioningCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
    overflow: "hidden",
    gap: Spacing.md,
  },
  positioningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  positioningIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  positioningCopy: {
    flex: 1,
    minWidth: 0,
  },
  positioningDivider: {
    height: 1,
    opacity: 0.9,
  },
  trustSignalCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
    overflow: "hidden",
  },
  trustSignalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  trustSignalGrid: {
    gap: Spacing.md,
  },
  trustSignalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  trustSignalIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  toggleSection: {
    marginBottom: Spacing.lg,
  },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
  },
  toggleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  toggleTabActive: {
    ...Shadows.softCard,
  },

  storeNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  storeNoticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  storeNoticeText: {
    flex: 1,
  },
  storeNoticeBody: {
    marginTop: 2,
    lineHeight: 18,
  },
  storeNoticeAction: {
    minHeight: 36,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  storeNoticeActionText: {
    fontWeight: "700",
  },

  planCard: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    overflow: "hidden",
    position: "relative",
  },
  planCardGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius["2xl"],
  },
  popularBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  planIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  planHeaderText: { flex: 1 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 2 },
  saveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  planDivider: { height: 1, marginVertical: Spacing.md },
  includesLabel: {
    marginBottom: Spacing.md,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  featureCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1, lineHeight: 20 },

  ctaSection: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  ctaButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },

  freePlanCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  freePlanHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  freePlanIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  freeFeatureList: {
    gap: Spacing.sm,
  },
  freeFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },

  familyCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    overflow: "hidden",
    position: "relative",
  },
  familyGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius["2xl"],
  },
  familyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  familyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  familyHeaderContent: { flex: 1 },
  familyFeatures: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  familyFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  includedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignSelf: "center",
  },

  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  disclaimerCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  disclaimerTitle: { fontWeight: "600" },
  disclaimerText: { lineHeight: 18, marginBottom: Spacing.sm },
  legalLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
});
