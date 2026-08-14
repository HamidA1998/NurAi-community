import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Fonts, Spacing } from "@/constants/theme";
import { syncedSetItem } from "@/lib/progress-sync";
import { CrescentMark } from "@/components/premium/svg/PremiumSvgs";
import {
  buildPersonalHomePlanSummary,
  buildPersonalNurAIPlan,
  guidancePreferenceToGlobalMadhab,
  type OnboardingPreferences,
  type PersonalHomePlanSummary,
} from "@/services/personalNurAIPlanService";

import nuraiLogo from "../../assets/branding/nurai-logo.png";
import { AppIcon, type AppIconName } from "@/components/icons";
import { NuraiIconTile } from "@/design-system";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = Spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - CARD_GAP) / 2;

interface OnboardingProps {
  onComplete: () => void;
}

type FeatherName = AppIconName;

type OnboardingOption = {
  id: string;
  label: string;
  description?: string;
  icon: FeatherName;
  tone?: "emerald" | "gold" | "teal" | "blue" | "violet";
};

type OnboardingStep = {
  title: string;
  subtitle: string;
  eyebrow: string;
  multiSelect: boolean;
  insight: string;
  options: OnboardingOption[];
};

const STEPS: OnboardingStep[] = [
  {
    eyebrow: "Build your rhythm",
    title: "Choose what you want NurAI to help with first.",
    subtitle:
      "We will shape your home, reminders, and daily journey around this.",
    insight: "Your first screen should always know the next best step.",
    multiSelect: true,
    options: [
      {
        id: "quran",
        label: "Quran",
        description: "Read, reflect, memorise",
        icon: "book-open",
        tone: "gold",
      },
      {
        id: "prayer",
        label: "Prayer",
        description: "Times, focus, reminders",
        icon: "clock",
        tone: "emerald",
      },
      {
        id: "arabic",
        label: "Arabic",
        description: "Learn Quranic words",
        icon: "type",
        tone: "teal",
      },
      {
        id: "dhikr",
        label: "Dhikr",
        description: "Tasbeeh and adhkar",
        icon: "disc",
        tone: "emerald",
      },
      {
        id: "knowledge",
        label: "Knowledge",
        description: "Hadith, fiqh, books",
        icon: "award",
        tone: "gold",
      },
      {
        id: "community",
        label: "Community",
        description: "Family and safe spaces",
        icon: "users",
        tone: "blue",
      },
      {
        id: "kids",
        label: "Kids",
        description: "Family learning support",
        icon: "smile",
        tone: "violet",
      },
      {
        id: "spiritual",
        label: "Growth",
        description: "Streaks and reflection",
        icon: "trending-up",
        tone: "emerald",
      },
    ],
  },
  {
    eyebrow: "Personalise depth",
    title: "Set the level that feels honest today.",
    subtitle:
      "NurAI will keep the experience approachable and build from there.",
    insight: "No pressure. The app should meet you where you are.",
    multiSelect: false,
    options: [
      {
        id: "beginner",
        label: "Beginner",
        description: "I want clear basics and gentle steps.",
        icon: "sunrise",
        tone: "emerald",
      },
      {
        id: "intermediate",
        label: "Intermediate",
        description: "I know the basics and want structure.",
        icon: "sun",
        tone: "teal",
      },
      {
        id: "advanced",
        label: "Advanced",
        description: "I want deeper study and stronger tools.",
        icon: "star",
        tone: "gold",
      },
    ],
  },
  {
    eyebrow: "Quran rhythm",
    title: "How do you want to build with Quran?",
    subtitle:
      "This shapes your reader, audio, tafsir, reflection, and review path.",
    insight: "The Quran experience should become your safest daily anchor.",
    multiSelect: false,
    options: [
      {
        id: "quran_starting",
        label: "Starting gently",
        description: "Short ayahs, clear meaning, and simple reflection.",
        icon: "sunrise",
        tone: "emerald",
      },
      {
        id: "quran_daily_reader",
        label: "Daily reader",
        description: "Pages, streaks, audio, and tafsir source cards.",
        icon: "book-open",
        tone: "gold",
      },
      {
        id: "quran_hifz",
        label: "Hifz focus",
        description: "Revision, weak ayahs, listening, and teacher logs.",
        icon: "repeat",
        tone: "teal",
      },
      {
        id: "quran_deep_study",
        label: "Deep study",
        description: "Meaning, Arabic words, citations, and review limits.",
        icon: "layers",
        tone: "gold",
      },
    ],
  },
  {
    eyebrow: "Arabic level",
    title: "Where should Arabic learning begin?",
    subtitle:
      "NurAI will tune vocabulary, pronunciation practice, and Quranic word cards.",
    insight: "Language learning works best when the next lesson feels obvious.",
    multiSelect: false,
    options: [
      {
        id: "arabic_letters",
        label: "Letters",
        description: "I want to read Arabic more confidently.",
        icon: "type",
        tone: "emerald",
      },
      {
        id: "arabic_quran_words",
        label: "Quran words",
        description: "Help me understand repeated Quranic vocabulary.",
        icon: "book-open",
        tone: "gold",
      },
      {
        id: "arabic_sentences",
        label: "Sentences",
        description: "Build grammar, patterns, and useful phrases.",
        icon: "message-circle",
        tone: "teal",
      },
    ],
  },
  {
    eyebrow: "Guidance preference",
    title: "How should sensitive answers be handled?",
    subtitle:
      "NurAI can remember your preference while keeping personal rulings careful.",
    insight: "Trust grows when AI knows when to slow down and escalate.",
    multiSelect: false,
    options: [
      {
        id: "no_madhhab_preference",
        label: "No preference",
        description: "Keep answers general and source-first.",
        icon: "shield",
        tone: "emerald",
      },
      {
        id: "hanafi",
        label: "Hanafi",
        description: "Use as context, not as an automatic ruling.",
        icon: "award",
        tone: "gold",
      },
      {
        id: "maliki",
        label: "Maliki",
        description: "Use as context, not as an automatic ruling.",
        icon: "award",
        tone: "gold",
      },
      {
        id: "shafii",
        label: "Shafi'i",
        description: "Use as context, not as an automatic ruling.",
        icon: "award",
        tone: "gold",
      },
      {
        id: "hanbali",
        label: "Hanbali",
        description: "Use as context, not as an automatic ruling.",
        icon: "award",
        tone: "gold",
      },
      {
        id: "ask_scholar_sensitive",
        label: "Ask scholar",
        description: "Prepare sensitive questions for a qualified scholar.",
        icon: "user-check",
        tone: "teal",
      },
    ],
  },
  {
    eyebrow: "Family support",
    title: "Who else should NurAI support?",
    subtitle:
      "This helps Home balance personal worship, family rhythm, and kids learning.",
    insight:
      "A world-class Islamic app should support the household, not just the phone.",
    multiSelect: true,
    options: [
      {
        id: "just_me",
        label: "Just me",
        description: "Keep the path personal and focused.",
        icon: "user",
        tone: "emerald",
      },
      {
        id: "spouse_family",
        label: "Family",
        description: "Shared goals, reminders, and gentle circles.",
        icon: "users",
        tone: "teal",
      },
      {
        id: "kids_learning",
        label: "Kids",
        description: "Stories, Quran, Arabic, and safe progress.",
        icon: "smile",
        tone: "violet",
      },
      {
        id: "new_muslim_support",
        label: "New Muslim",
        description: "Simple steps, calm answers, and foundations.",
        icon: "compass",
        tone: "gold",
      },
    ],
  },
  {
    eyebrow: "Reading language",
    title: "Choose the language for your learning path.",
    subtitle: "This helps shape explanations, reminders, and study cards.",
    insight: "You can change this later in settings.",
    multiSelect: false,
    options: [
      { id: "english", label: "English", icon: "globe", tone: "emerald" },
      { id: "arabic", label: "Arabic", icon: "globe", tone: "gold" },
      { id: "urdu", label: "Urdu", icon: "globe", tone: "teal" },
      { id: "turkish", label: "Turkish", icon: "globe", tone: "blue" },
      { id: "malay", label: "Malay/Indonesian", icon: "globe", tone: "violet" },
      { id: "french", label: "French", icon: "globe", tone: "teal" },
    ],
  },
  {
    eyebrow: "Prayer rhythm",
    title: "What is your prayer habit right now?",
    subtitle:
      "This lets NurAI support salah with the right amount of structure and mercy.",
    insight:
      "The best plan is honest about today, then helps tomorrow feel lighter.",
    multiSelect: false,
    options: [
      {
        id: "consistent_salah",
        label: "Mostly on time",
        description: "Help me protect consistency without extra noise.",
        icon: "check-circle",
        tone: "emerald",
      },
      {
        id: "building_salah",
        label: "Building consistency",
        description: "Help me steady one prayer window at a time.",
        icon: "trending-up",
        tone: "teal",
      },
      {
        id: "qada_catchup",
        label: "Catching up",
        description: "Include gentle qada support without shame.",
        icon: "rotate-ccw",
        tone: "gold",
      },
      {
        id: "family_jamaah",
        label: "Family/jamaah",
        description: "Support shared salah rhythm at home or masjid.",
        icon: "users",
        tone: "blue",
      },
    ],
  },
  {
    eyebrow: "Prayer reminders",
    title: "How should NurAI support your salah?",
    subtitle:
      "Choose a reminder style now. You can fine-tune every prayer later.",
    insight: "Strong retention starts with a respectful prayer rhythm.",
    multiSelect: false,
    options: [
      {
        id: "before_prayer",
        label: "Before prayer",
        description: "Gentle reminders before each salah.",
        icon: "bell",
        tone: "emerald",
      },
      {
        id: "athan_alert",
        label: "Athan alerts",
        description: "Prayer-time sound for selected salah.",
        icon: "volume-2",
        tone: "gold",
      },
      {
        id: "quiet_start",
        label: "Quiet start",
        description: "No reminders until I choose them.",
        icon: "moon",
        tone: "teal",
      },
    ],
  },
  {
    eyebrow: "Personal look",
    title: "Choose the feel you want to return to.",
    subtitle:
      "NurAI keeps the same premium system, then adapts accent and mood.",
    insight: "Personal themes make the app feel owned, not generic.",
    multiSelect: false,
    options: [
      {
        id: "emerald",
        label: "Emerald",
        description: "Calm daily worship.",
        icon: "droplet",
        tone: "emerald",
      },
      {
        id: "scholar_gold",
        label: "Scholar Gold",
        description: "Knowledge and depth.",
        icon: "award",
        tone: "gold",
      },
      {
        id: "cosmic_teal",
        label: "Cosmic Teal",
        description: "NurAI living guide.",
        icon: "zap",
        tone: "teal",
      },
    ],
  },
];

const toneColors = {
  emerald: "#34D399",
  gold: "#D8B45C",
  teal: "#56B394",
  blue: "#6FCBA8",
  violet: "#E8C76F",
};

const STEP_ICON_OVERRIDES: Record<string, AppIconName> = {
  quran: "quran",
  prayer: "prayer",
  arabic: "arabic-learning",
  dhikr: "tasbeeh",
  knowledge: "nurai",
  community: "community",
  spiritual: "streak-garden",
};

function stepIconName(id: string, fallback?: FeatherName): AppIconName {
  return STEP_ICON_OVERRIDES[id] || fallback || "star";
}

function ProgressRail({ currentStep }: { currentStep: number }) {
  const { theme } = useTheme();
  return (
    <View style={styles.progressRail}>
      {STEPS.map((item, index) => {
        const active = index === currentStep;
        const complete = index < currentStep;
        return (
          <View key={item.eyebrow} style={styles.progressItem}>
            <View
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    active || complete
                      ? theme.scholar
                      : "rgba(255,255,255,0.07)",
                  borderColor: active
                    ? theme.scholar
                    : "rgba(255,255,255,0.12)",
                },
                active ? styles.progressDotActive : null,
              ]}
            >
              {complete ? (
                <AppIcon name="check" size={12} color="#08100C" />
              ) : null}
            </View>
            {index < STEPS.length - 1 ? (
              <View
                style={[
                  styles.progressLine,
                  {
                    backgroundColor: complete
                      ? `${theme.scholar}88`
                      : "rgba(255,255,255,0.08)",
                  },
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function HeroConstellation({ selectedCount }: { selectedCount: number }) {
  const { theme } = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={styles.heroConstellation}
    >
      {/* One quiet ring on the app's standard glass surface — the concentric
          gold/emerald rings and gradient centre made this the only ornamental
          hero in the app. */}
      <View
        style={[
          styles.heroOrbInner,
          {
            backgroundColor: theme.surfaceGlass,
            borderColor: theme.borderSubtle,
          },
        ]}
      >
        <CrescentMark
          size={38}
          color={theme.scholar}
          accentColor={theme.primary}
        />
        <ThemedText style={[styles.heroOrbLabel, { color: theme.primary }]}>
          DAILY DEEN
        </ThemedText>
        <ThemedText style={[styles.heroOrbTitle, { color: theme.text }]}>
          Built around you
        </ThemedText>
        <ThemedText style={[styles.heroOrbMeta, { color: theme.textMuted }]}>
          {selectedCount > 0
            ? `${selectedCount} focus area${selectedCount === 1 ? "" : "s"} selected`
            : "Choose your first rhythm"}
        </ThemedText>
      </View>
      <View
        style={[
          styles.previewPill,
          {
            borderColor: `${theme.primary}35`,
            backgroundColor: "rgba(7,18,31,0.82)",
          },
        ]}
      >
        <AppIcon name="zap" size={14} color={theme.primary} />
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          Home, AI, Quran, Arabic and streaks will adapt from this setup.
        </ThemedText>
      </View>
    </Animated.View>
  );
}

function JourneyPreview({
  summary,
  selectedCount,
}: {
  summary: PersonalHomePlanSummary;
  selectedCount: number;
}) {
  const { theme } = useTheme();
  const previewItems = [
    { label: summary.anchorLabel, icon: "compass" as const },
    { label: summary.prayerHabitLabel, icon: "prayer" as const },
    { label: summary.quranLabel, icon: "quran" as const },
    { label: summary.arabicLabel, icon: "arabic-learning" as const },
    { label: summary.guidanceLabel, icon: "shield" as const },
    { label: summary.familyLabel, icon: "family" as const },
  ];

  return (
    <View
      style={[styles.journeyPreview, { borderColor: `${theme.scholar}24` }]}
      testID="onboarding-personal-plan-preview"
    >
      <View style={styles.previewHeader}>
        <View>
          <ThemedText style={[styles.previewEyebrow, { color: theme.scholar }]}>
            Personal NurAI plan
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.text }}>
            {summary.headline}
          </ThemedText>
        </View>
        <View
          style={[
            styles.previewBadge,
            {
              backgroundColor: `${theme.primary}14`,
              borderColor: `${theme.primary}30`,
            },
          ]}
        >
          <AppIcon name="activity" size={14} color={theme.primary} />
          <ThemedText
            type="caption"
            style={{ color: theme.primary, fontWeight: "700" }}
          >
            {selectedCount > 0 ? "Live" : "Default"}
          </ThemedText>
        </View>
      </View>
      <View style={styles.previewRows}>
        {previewItems.map((item) => (
          <View
            key={item.label}
            style={[
              styles.previewRow,
              {
                backgroundColor: `${theme.primary}10`,
                borderColor: `${theme.primary}24`,
              },
            ]}
          >
            <AppIcon name={item.icon} size={15} color={theme.primary} />
            <ThemedText
              type="caption"
              style={{
                color: theme.text,
                fontWeight: "700",
              }}
            >
              {item.label}
            </ThemedText>
          </View>
        ))}
      </View>
      <View
        style={[
          styles.previewActionPanel,
          {
            backgroundColor: "rgba(216,180,92,0.08)",
            borderColor: "rgba(216,180,92,0.24)",
          },
        ]}
        testID="onboarding-personal-first-action"
      >
        <View style={styles.previewActionHeader}>
          <View
            style={[
              styles.previewActionIcon,
              { backgroundColor: `${theme.scholar}18` },
            ]}
          >
            <AppIcon name="play-circle" size={15} color={theme.scholar} />
          </View>
          <View style={styles.previewActionCopy}>
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              FIRST ACTION
            </ThemedText>
            <ThemedText
              type="small"
              numberOfLines={2}
              style={{ color: theme.text, lineHeight: 19 }}
            >
              {summary.recommendedActionLabel}
            </ThemedText>
          </View>
        </View>
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, lineHeight: 18 }}
        >
          {summary.recommendedActionReason}
        </ThemedText>
      </View>
      <View style={styles.previewCadenceRow}>
        <View
          style={[
            styles.previewCadencePill,
            {
              backgroundColor: `${theme.primary}0D`,
              borderColor: `${theme.primary}24`,
            },
          ]}
          testID="onboarding-personal-review-cadence"
        >
          <AppIcon name="calendar" size={13} color={theme.primary} />
          <ThemedText
            type="caption"
            numberOfLines={2}
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
          >
            {summary.reviewCadenceLabel}
          </ThemedText>
        </View>
        <View
          style={[
            styles.previewCadencePill,
            {
              backgroundColor: `${theme.scholar}0D`,
              borderColor: `${theme.scholar}24`,
            },
          ]}
        >
          <AppIcon name="activity" size={13} color={theme.scholar} />
          <ThemedText
            type="caption"
            numberOfLines={2}
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
          >
            {summary.setupQualityLabel}
          </ThemedText>
        </View>
        <View
          style={[
            styles.previewCadencePill,
            {
              backgroundColor: `${theme.primary}0D`,
              borderColor: `${theme.primary}24`,
            },
          ]}
          testID="onboarding-personal-plan-freshness"
        >
          <AppIcon name="refresh-cw" size={13} color={theme.primary} />
          <ThemedText
            type="caption"
            numberOfLines={2}
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
          >
            {summary.planFreshnessLabel}
          </ThemedText>
        </View>
      </View>
      <View style={styles.previewRationaleList}>
        {summary.planRationale.slice(0, 3).map((reason, index) => (
          <View
            key={`${reason}-${index}`}
            style={styles.previewRationaleRow}
            testID={`onboarding-plan-rationale-${index + 1}`}
          >
            <AppIcon name="check" size={12} color={theme.primary} />
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textMuted, flex: 1, lineHeight: 17 }}
            >
              {reason}
            </ThemedText>
          </View>
        ))}
      </View>
      <View style={styles.previewPathList}>
        {summary.dailyPath.slice(0, 3).map((item, index) => (
          <View key={`${item}-${index}`} style={styles.previewPathRow}>
            <View
              style={[
                styles.previewPathNumber,
                {
                  backgroundColor:
                    index === 0 ? `${theme.scholar}22` : `${theme.primary}14`,
                  borderColor:
                    index === 0 ? `${theme.scholar}35` : `${theme.primary}24`,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{
                  color: index === 0 ? theme.scholar : theme.primary,
                  fontWeight: "900",
                }}
              >
                {index + 1}
              </ThemedText>
            </View>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
            >
              {item}
            </ThemedText>
          </View>
        ))}
      </View>
      <View
        style={[
          styles.previewTrustStrip,
          {
            backgroundColor:
              summary.trustMode === "scholar_review_first"
                ? "rgba(216,180,92,0.10)"
                : `${theme.primary}0D`,
            borderColor:
              summary.trustMode === "scholar_review_first"
                ? "rgba(216,180,92,0.26)"
                : `${theme.primary}22`,
          },
        ]}
        testID="onboarding-personalization-boundary"
      >
        <AppIcon
          name={
            summary.trustMode === "scholar_review_first"
              ? "user-check"
              : "shield"
          }
          size={14}
          color={
            summary.trustMode === "scholar_review_first"
              ? theme.scholar
              : theme.primary
          }
        />
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
        >
          {summary.personalizationBoundaryLabel}
        </ThemedText>
      </View>
      <View
        style={[
          styles.previewReadinessPanel,
          {
            backgroundColor: "rgba(86,179,148,0.065)",
            borderColor: `${theme.primary}24`,
          },
        ]}
        testID="onboarding-plan-readiness-contract"
        accessible
        accessibilityLabel={`${summary.planReadiness.title}. ${summary.planReadiness.statusLabel}. ${summary.planReadiness.boundaryLabel}`}
      >
        <View style={styles.previewReadinessHeader}>
          <View style={styles.previewReadinessHeaderCopy}>
            <ThemedText
              type="caption"
              style={{ color: theme.primary, fontWeight: "900" }}
            >
              PLAN READINESS
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textSecondary, lineHeight: 17 }}
            >
              {summary.planReadiness.statusLabel}
            </ThemedText>
          </View>
          <View
            style={[
              styles.previewReadinessAction,
              {
                backgroundColor: `${theme.scholar}12`,
                borderColor: `${theme.scholar}24`,
              },
            ]}
          >
            <AppIcon name="arrow-right" size={12} color={theme.scholar} />
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              {summary.planReadiness.actionLabel}
            </ThemedText>
          </View>
        </View>
        <View style={styles.previewReadinessGrid}>
          {summary.planReadiness.items.map((item) => {
            const itemColor =
              item.tone === "scholar"
                ? theme.scholar
                : item.tone === "control"
                  ? theme.textMuted
                  : theme.primary;
            return (
              <View
                key={item.id}
                style={[
                  styles.previewReadinessItem,
                  {
                    backgroundColor: `${itemColor}0A`,
                    borderColor: `${itemColor}22`,
                  },
                ]}
                testID={`onboarding-plan-readiness-${item.id}`}
              >
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: itemColor, fontWeight: "900" }}
                >
                  {item.title}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.text, lineHeight: 16 }}
                >
                  {item.evidenceLabel}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted, lineHeight: 15 }}
                >
                  {item.boundaryLabel}
                </ThemedText>
              </View>
            );
          })}
        </View>
        <View style={styles.previewReadinessBoundary}>
          <AppIcon name="shield" size={12} color={theme.scholar} />
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, flex: 1, lineHeight: 16 }}
          >
            {summary.planReadiness.boundaryLabel}
          </ThemedText>
        </View>
      </View>
      <View
        style={[
          styles.previewSafetyPanel,
          {
            backgroundColor: "rgba(216,180,92,0.07)",
            borderColor: "rgba(216,180,92,0.22)",
          },
        ]}
        testID="onboarding-plan-safety-receipts"
      >
        <View style={styles.previewSafetyHeader}>
          <ThemedText
            type="caption"
            style={{ color: theme.scholar, fontWeight: "900" }}
          >
            PLAN SAFETY CHECKS
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            {summary.planSafetyReceipts.length} checks
          </ThemedText>
        </View>
        {summary.planSafetyReceipts.slice(0, 2).map((receipt) => (
          <View
            key={receipt.id}
            style={styles.previewSafetyRow}
            testID={`onboarding-plan-safety-${receipt.id}`}
          >
            <AppIcon name="shield" size={12} color={theme.scholar} />
            <View style={styles.previewSafetyCopy}>
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: theme.text, fontWeight: "800" }}
              >
                {receipt.title}: {receipt.evidenceLabel}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={2}
                style={{ color: theme.textMuted, lineHeight: 16 }}
              >
                {receipt.boundaryLabel}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function preferencesFromSelections(
  selections: Record<number, string[]>,
): OnboardingPreferences {
  return {
    interests: selections[0] || [],
    level: selections[1]?.[0] || "beginner",
    quranLevel: selections[2]?.[0] || "quran_starting",
    arabicLevel: selections[3]?.[0] || "arabic_letters",
    guidancePreference: selections[4]?.[0] || "no_madhhab_preference",
    familyNeeds: selections[5] || ["just_me"],
    language: selections[6]?.[0] || "english",
    prayerHabit: selections[7]?.[0] || "building_salah",
    prayerSetup: selections[8]?.[0] || "before_prayer",
    themeAccent: selections[9]?.[0] || "emerald",
  };
}

export default function OnboardingScreen({ onComplete }: OnboardingProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<number, string[]>>({
    0: [],
    1: [],
    2: [],
  });

  const step = STEPS[currentStep];
  const selectedCount = (selections[currentStep] || []).length;
  const totalSelected = Object.values(selections).reduce(
    (sum, value) => sum + value.length,
    0,
  );
  const hasSelection = selectedCount > 0;
  const previewPreferences = useMemo(
    () => preferencesFromSelections(selections),
    [selections],
  );
  const previewPlan = useMemo(
    () => buildPersonalNurAIPlan(previewPreferences),
    [previewPreferences],
  );
  const previewSummary = useMemo(
    () => buildPersonalHomePlanSummary(previewPreferences, previewPlan),
    [previewPreferences, previewPlan],
  );

  const toggleSelection = useCallback(
    (optionId: string) => {
      Haptics.selectionAsync().catch(() => {});
      setSelections((prev) => {
        const current = prev[currentStep] || [];
        if (step.multiSelect) {
          const exists = current.includes(optionId);
          return {
            ...prev,
            [currentStep]: exists
              ? current.filter((id) => id !== optionId)
              : [...current, optionId],
          };
        }
        return { ...prev, [currentStep]: [optionId] };
      });
    },
    [currentStep, step.multiSelect],
  );

  const persistPersonalSetup = useCallback(
    async (preferences: OnboardingPreferences) => {
      const personalPlan = buildPersonalNurAIPlan(preferences);
      await syncedSetItem(
        "onboarding_preferences",
        JSON.stringify(preferences),
      );
      await syncedSetItem("nurai_personal_plan", JSON.stringify(personalPlan));
      await syncedSetItem(
        "nurai_global_madhab",
        guidancePreferenceToGlobalMadhab(preferences.guidancePreference),
      );
      await syncedSetItem("onboarding_completed", "true");
    },
    [],
  );

  const handleBack = useCallback(() => {
    if (currentStep === 0) return;
    Haptics.selectionAsync().catch(() => {});
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, [currentStep]);

  const handleNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    const preferences = preferencesFromSelections(selections);
    await persistPersonalSetup(preferences);
    onComplete();
  }, [currentStep, selections, onComplete, persistPersonalSetup]);

  const handleSkip = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const defaultPreferences = preferencesFromSelections({});
    await persistPersonalSetup(defaultPreferences);
    onComplete();
  }, [onComplete, persistPersonalSetup]);

  const isSelected = useCallback(
    (optionId: string) => (selections[currentStep] || []).includes(optionId),
    [currentStep, selections],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <StatusBar style="light" />
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.brandRow}>
          <View
            style={[
              styles.logoFrame,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <Image
              source={nuraiLogo}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View>
            <ThemedText style={[styles.brandTitle, { color: theme.text }]}>
              NurAI
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Your daily Islamic companion
            </ThemedText>
          </View>
        </View>
        <Pressable
          onPress={handleSkip}
          testID="button-skip"
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          style={[
            styles.skipButton,
            {
              backgroundColor: "rgba(255,255,255,0.045)",
              borderColor: "rgba(255,255,255,0.10)",
            },
          ]}
        >
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, fontWeight: "700" }}
          >
            Skip
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 118 },
        ]}
      >
        <ProgressRail currentStep={currentStep} />
        {currentStep === 0 ? (
          <HeroConstellation selectedCount={totalSelected} />
        ) : null}

        <Animated.View
          key={`header-${currentStep}`}
          entering={FadeInRight.duration(360)}
          style={styles.stepHeader}
        >
          <ThemedText style={[styles.eyebrow, { color: theme.scholar }]}>
            {step.eyebrow}
          </ThemedText>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            {step.title}
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.headerSubtitle, { color: theme.textSecondary }]}
          >
            {step.subtitle}
          </ThemedText>
        </Animated.View>

        <Animated.View
          key={`insight-${currentStep}`}
          entering={FadeInDown.delay(80).duration(320)}
          style={[
            styles.insightCard,
            {
              backgroundColor: `${theme.primary}0E`,
              borderColor: `${theme.primary}24`,
            },
          ]}
        >
          <View
            style={[
              styles.insightIcon,
              { backgroundColor: `${theme.primary}16` },
            ]}
          >
            <AppIcon name="star" size={16} color={theme.primary} />
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1 }}
          >
            {step.insight}
          </ThemedText>
        </Animated.View>

        <View style={styles.optionsGrid}>
          {step.options.map((option, index) => {
            const selected = isSelected(option.id);
            const accent = toneColors[option.tone || "emerald"];
            const full = currentStep === 1;
            return (
              <Animated.View
                key={option.id}
                entering={FadeInDown.delay(index * 45).duration(280)}
                style={[
                  styles.optionCardWrapper,
                  full ? styles.optionCardFull : null,
                ]}
              >
                <Pressable
                  onPress={() => toggleSelection(option.id)}
                  testID={`option-${option.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.optionCard,
                    {
                      minHeight: full ? 104 : 142,
                      backgroundColor: selected
                        ? `${accent}14`
                        : "rgba(255,255,255,0.045)",
                      borderColor: selected
                        ? `${accent}88`
                        : "rgba(255,255,255,0.09)",
                    },
                    selected
                      ? {
                          shadowColor: accent,
                          shadowOpacity: 0.22,
                          shadowRadius: 18,
                          elevation: 4,
                        }
                      : null,
                  ]}
                >
                  <View style={styles.optionTopRow}>
                    <NuraiIconTile
                      icon={stepIconName(option.id, option.icon)}
                      size={52}
                      tone={option.tone === "gold" ? "scholar" : "primary"}
                      style={{ opacity: selected ? 1 : 0.62 }}
                    />
                    {selected ? (
                      <View
                        style={[styles.checkMark, { backgroundColor: accent }]}
                      >
                        <AppIcon name="check" size={14} color="#04120D" />
                      </View>
                    ) : null}
                  </View>
                  <ThemedText
                    style={[
                      styles.optionLabel,
                      { color: selected ? theme.text : theme.textSecondary },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                  {option.description ? (
                    <ThemedText
                      type="caption"
                      style={[
                        styles.optionDescription,
                        {
                          color: selected
                            ? theme.textSecondary
                            : theme.textMuted,
                        },
                      ]}
                    >
                      {option.description}
                    </ThemedText>
                  ) : null}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <JourneyPreview
          summary={previewSummary}
          selectedCount={totalSelected}
        />
      </ScrollView>

      <LinearGradient
        colors={["rgba(7,26,26,0)", theme.backgroundRoot]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.45 }}
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + Spacing.md },
        ]}
      >
        <View style={styles.bottomMetaRow}>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Step {currentStep + 1} of {STEPS.length}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{
              color: hasSelection ? theme.primary : theme.textMuted,
              fontWeight: "700",
            }}
          >
            {hasSelection
              ? `${selectedCount} selected`
              : "Choose one to continue"}
          </ThemedText>
        </View>
        <View style={styles.bottomActionRow}>
          {currentStep > 0 ? (
            <Pressable
              onPress={handleBack}
              testID="button-back"
              accessibilityRole="button"
              accessibilityLabel="Go back to previous onboarding step"
              style={({ pressed }) => [
                styles.backButton,
                {
                  backgroundColor: "rgba(255,255,255,0.045)",
                  borderColor: "rgba(255,255,255,0.12)",
                },
                pressed
                  ? { opacity: 0.82, transform: [{ scale: 0.99 }] }
                  : null,
              ]}
            >
              <AppIcon
                name="arrow-left"
                size={18}
                color={theme.textSecondary}
              />
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: theme.textSecondary, fontWeight: "900" }}
              >
                Back
              </ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleNext}
            testID="button-next"
            accessibilityRole="button"
            accessibilityLabel={
              currentStep === STEPS.length - 1
                ? "Start using NurAI"
                : "Continue onboarding"
            }
            style={styles.nextButtonPressable}
          >
            <LinearGradient
              colors={
                hasSelection
                  ? ["#34D399", "#56B394", "#3F8F75"]
                  : ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.045)"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.nextButton,
                {
                  borderColor: hasSelection
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(255,255,255,0.10)",
                  shadowColor: hasSelection ? theme.primary : "transparent",
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.nextButtonText,
                  { color: hasSelection ? "#03110D" : theme.textMuted },
                ]}
              >
                {currentStep === STEPS.length - 1 ? "Enter NurAI" : "Continue"}
              </ThemedText>
              <AppIcon
                name="arrow-right"
                size={20}
                color={hasSelection ? "#03110D" : theme.textMuted}
              />
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  brandRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  logoFrame: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    width: 48,
  },
  logo: {
    height: 38,
    width: 38,
  },
  brandTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 20,
    lineHeight: 24,
  },
  skipButton: {
    alignItems: "center",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  progressRail: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    width: "100%",
  },
  progressItem: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  progressDot: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  progressDotActive: {
    shadowColor: "#56B394",
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 5,
    minWidth: 8,
  },
  heroConstellation: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  heroOrbInner: {
    alignItems: "center",
    borderRadius: 104,
    borderWidth: 1,
    height: 188,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    width: 188,
  },
  heroOrbLabel: {
    fontFamily: Fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.3,
    marginTop: Spacing.sm,
  },
  heroOrbTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 24,
    lineHeight: 31,
    marginTop: 2,
    textAlign: "center",
  },
  heroOrbMeta: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    textAlign: "center",
  },
  previewPill: {
    alignItems: "center",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    bottom: -4,
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: -18,
    maxWidth: "94%",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  stepHeader: {
    marginBottom: Spacing.md,
  },
  eyebrow: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.7,
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 28,
    lineHeight: 36,
  },
  headerSubtitle: {
    lineHeight: 21,
    marginTop: Spacing.xs,
  },
  insightCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  insightIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  optionCardWrapper: {
    width: CARD_WIDTH,
  },
  optionCardFull: {
    width: "100%",
  },
  optionCard: {
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "space-between",
    overflow: "hidden",
    padding: Spacing.md,
  },
  optionTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  checkMark: {
    alignItems: "center",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  optionLabel: {
    fontFamily: Fonts.sansBold,
    fontSize: 17,
    lineHeight: 22,
  },
  optionDescription: {
    lineHeight: 18,
    marginTop: 4,
  },
  journeyPreview: {
    backgroundColor: "rgba(255,255,255,0.045)",
    borderRadius: 26,
    borderWidth: 1,
    marginTop: Spacing.xl,
    overflow: "hidden",
    padding: Spacing.lg,
  },
  previewHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "space-between",
  },
  previewEyebrow: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.4,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  previewBadge: {
    alignItems: "center",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  previewRows: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  previewRow: {
    alignItems: "center",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  previewActionPanel: {
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  previewActionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  previewActionIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  previewActionCopy: {
    flex: 1,
    minWidth: 0,
  },
  previewCadenceRow: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  previewCadencePill: {
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 46,
    padding: Spacing.sm,
  },
  previewRationaleList: {
    gap: 7,
    marginTop: Spacing.md,
  },
  previewRationaleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 7,
  },
  previewPathList: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  previewPathRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  previewPathNumber: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  previewTrustStrip: {
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  previewReadinessPanel: {
    borderRadius: 18,
    borderWidth: 1,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
  },
  previewReadinessHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
  },
  previewReadinessHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  previewReadinessAction: {
    alignItems: "center",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    maxWidth: 150,
    minHeight: 30,
    paddingHorizontal: Spacing.sm,
  },
  previewReadinessGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  previewReadinessItem: {
    borderRadius: 14,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: "47%",
    gap: 3,
    minHeight: 88,
    padding: Spacing.xs,
  },
  previewReadinessBoundary: {
    alignItems: "flex-start",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(216,180,92,0.18)",
    backgroundColor: "rgba(216,180,92,0.06)",
    flexDirection: "row",
    gap: Spacing.xs,
    padding: Spacing.xs,
  },
  previewSafetyPanel: {
    borderRadius: 18,
    borderWidth: 1,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
  },
  previewSafetyHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  previewSafetyRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  previewSafetyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  bottomBar: {
    bottom: 0,
    left: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing["2xl"],
    position: "absolute",
    right: 0,
  },
  bottomMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  bottomActionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.xs,
    height: 58,
    justifyContent: "center",
    minWidth: 96,
    paddingHorizontal: Spacing.md,
  },
  nextButtonPressable: {
    flex: 1,
  },
  nextButton: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    height: 58,
    justifyContent: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
  },
  nextButtonText: {
    fontFamily: Fonts.sansBold,
    fontSize: 16,
    lineHeight: 21,
  },
});
