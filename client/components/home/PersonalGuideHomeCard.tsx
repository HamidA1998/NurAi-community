import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";

import {
  NuraiGlass,
  NuraiRadius,
  NuraiSpace,
  NuraiType,
} from "@/design-system";
import { NurAIPresence } from "@/components/NurAIPresence";
import { useTheme } from "@/hooks/useTheme";
import type { HomeAIFeedbackValue } from "@/services/homeAIFeedbackService";
import type {
  PersonalIntelligenceBriefing,
  PersonalIntelligenceEvidence,
} from "@/services/personalIntelligenceBriefingService";
import { AppIcon } from "@/components/icons";

export function PersonalGuideHomeCard({
  eyebrow,
  title,
  body,
  status,
  capabilityLabel,
  whyNow,
  evidence,
  daySnapshot,
  sourceLabel,
  safetyNote,
  primaryActionLabel,
  loading = false,
  error,
  onPrimaryAction,
  onAsk,
  onFeedback,
}: {
  eyebrow: string;
  title: string;
  body: string;
  status: string;
  capabilityLabel: string;
  whyNow: string;
  evidence: PersonalIntelligenceEvidence[];
  daySnapshot: PersonalIntelligenceBriefing["daySnapshot"];
  sourceLabel: string;
  safetyNote?: string | null;
  primaryActionLabel: string;
  loading?: boolean;
  error?: string | null;
  onPrimaryAction: () => void;
  onAsk: () => void;
  onFeedback?: (feedback: HomeAIFeedbackValue) => void;
}) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const progress = daySnapshot.total
    ? Math.min(1, daySnapshot.completed / daySnapshot.total)
    : 0;
  const doneLabel =
    daySnapshot.completedLabels.slice(0, 2).join(" · ") || "Nothing logged yet";
  const nextLabel =
    daySnapshot.remainingLabels.slice(0, 2).join(" · ") ||
    "Daily essentials complete";
  const visibleEvidence = evidence.slice(0, 2);
  const evidenceSummary = visibleEvidence.length
    ? visibleEvidence.map((item) => item.label).join(" · ")
    : "Prayer, Quran and visible daily progress";

  return (
    <View
      testID="home-personal-ai"
      style={[styles.card, { borderColor: theme.primaryBorder }]}
    >
      <NuraiGlass
        style={StyleSheet.absoluteFillObject}
        radius={NuraiRadius.card}
        tint="rgba(7, 26, 25, 0.62)"
        pointerEvents="none"
      />

      <View style={styles.header}>
        <View
          style={[
            styles.mark,
            {
              backgroundColor: theme.primaryMuted,
              borderColor: theme.primaryBorder,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <NurAIPresence size={36} />
          )}
        </View>
        <View style={styles.headerCopy}>
          <Text style={[NuraiType.overline, { color: theme.primary }]}>
            {eyebrow}
          </Text>
          <View style={styles.statusRow}>
            <AppIcon name="lock" size={11} color={theme.textMuted} />
            <Text
              style={[styles.status, { color: theme.textMuted }]}
              numberOfLines={1}
              accessibilityLabel={`${status}. Private on this device.`}
            >
              {status}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setDetailsOpen((current) => !current)}
          accessibilityRole="button"
          accessibilityState={{ expanded: detailsOpen }}
          accessibilityLabel={`${detailsOpen ? "Hide" : "Show"} why this guidance was chosen`}
          hitSlop={6}
          style={({ pressed }) => [
            styles.detailsButton,
            { backgroundColor: theme.primaryMuted },
            pressed ? styles.pressed : null,
          ]}
          testID="button-home-personal-ai-details"
        >
          <Text style={[styles.detailsButtonText, { color: theme.primary }]}>
            {detailsOpen ? "Hide" : "Why this"}
          </Text>
          <AppIcon
            name={detailsOpen ? "chevron-up" : "chevron-down"}
            size={14}
            color={theme.primary}
          />
        </Pressable>
      </View>

      <View
        accessible
        accessibilityRole="summary"
        accessibilityLabel={`${title}. ${body}`}
        style={styles.recommendation}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          {loading ? "Reviewing today’s context…" : title}
        </Text>
        <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
          {body}
        </Text>
      </View>

      <View
        style={[
          styles.quickContext,
          {
            borderTopColor: theme.borderSubtle,
            borderBottomColor: theme.borderSubtle,
          },
        ]}
        accessibilityLabel={`${daySnapshot.completed} of ${daySnapshot.total} daily essentials complete. Done: ${doneLabel}. Next: ${nextLabel}.`}
      >
        <View
          style={[
            styles.quickProgressTrack,
            { backgroundColor: `${theme.text}12` },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.primary,
                height: `${progress * 100}%`,
              },
            ]}
          />
        </View>
        <View style={styles.quickContextCopy}>
          <View style={styles.quickContextHeader}>
            <Text style={[NuraiType.overline, { color: theme.textMuted }]}>
              TODAY
            </Text>
            <Text
              style={[styles.dayCount, { color: theme.primary }]}
              numberOfLines={1}
            >
              {daySnapshot.completed}/{daySnapshot.total} complete
            </Text>
          </View>
          <View style={styles.quickNextRow}>
            <AppIcon name="arrow-up-right" size={14} color={theme.scholar} />
            <Text
              style={[styles.quickNextText, { color: theme.text }]}
              numberOfLines={1}
            >
              Next · {nextLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.signalLine}>
        <AppIcon name="layers" size={14} color={theme.primary} />
        <Text
          style={[styles.signalText, { color: theme.textSecondary }]}
          numberOfLines={2}
        >
          Context considered: {evidenceSummary}
        </Text>
      </View>

      {error ? (
        <View
          accessibilityRole="alert"
          style={[styles.errorRow, { backgroundColor: `${theme.error}12` }]}
        >
          <AppIcon name="alert-circle" size={15} color={theme.error} />
          <Text
            style={[
              NuraiType.caption,
              styles.errorText,
              { color: theme.error },
            ]}
          >
            {error}
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={onPrimaryAction}
        accessibilityRole="button"
        accessibilityLabel={primaryActionLabel}
        style={({ pressed }) => [
          styles.primaryAction,
          { backgroundColor: theme.primary },
          pressed ? styles.pressed : null,
        ]}
      >
        <Text
          style={[styles.primaryActionText, { color: theme.primaryForeground }]}
        >
          {primaryActionLabel}
        </Text>
        <AppIcon name="arrow-right" size={17} color={theme.primaryForeground} />
      </Pressable>

      <Pressable
        onPress={onAsk}
        accessibilityRole="button"
        accessibilityLabel="Ask Personal Guide about today's context"
        testID="button-home-personal-ai"
        style={({ pressed }) => [
          styles.askAction,
          pressed ? styles.pressed : null,
        ]}
      >
        <AppIcon name="message-circle" size={16} color={theme.primary} />
        <Text style={[styles.askActionText, { color: theme.primary }]}>
          Ask about today
        </Text>
        <AppIcon name="chevron-right" size={15} color={theme.primary} />
      </Pressable>

      {detailsOpen ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(220)}
          style={[styles.details, { borderTopColor: theme.borderSubtle }]}
        >
          <Text style={[NuraiType.overline, { color: theme.scholar }]}>
            WHY THIS NOW
          </Text>
          <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
            {whyNow}
          </Text>

          <View
            style={[styles.detailLedger, { borderColor: theme.borderSubtle }]}
          >
            <View style={styles.contextRow}>
              <AppIcon name="check-circle" size={15} color={theme.primary} />
              <Text style={[styles.contextLabel, { color: theme.primary }]}>
                Done
              </Text>
              <Text
                style={[styles.contextValue, { color: theme.text }]}
                numberOfLines={2}
              >
                {doneLabel}
              </Text>
            </View>
            <View style={styles.contextRow}>
              <AppIcon name="arrow-up-right" size={15} color={theme.scholar} />
              <Text style={[styles.contextLabel, { color: theme.scholar }]}>
                Next
              </Text>
              <Text
                style={[styles.contextValue, { color: theme.text }]}
                numberOfLines={2}
              >
                {nextLabel}
              </Text>
            </View>
          </View>

          {visibleEvidence.length ? (
            <View style={styles.evidenceList}>
              {visibleEvidence.map((item) => (
                <View key={item.id} style={styles.evidenceRow}>
                  <View
                    style={[
                      styles.evidenceDot,
                      { backgroundColor: theme.primary },
                    ]}
                  />
                  <Text style={[styles.evidenceText, { color: theme.text }]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.sourceRow}>
            <AppIcon name="shield" size={15} color={theme.primary} />
            <View style={styles.sourceCopy}>
              <Text style={[styles.sourceTitle, { color: theme.text }]}>
                How this was prepared
              </Text>
              <Text style={[styles.sourceText, { color: theme.textMuted }]}>
                {sourceLabel}
              </Text>
            </View>
          </View>
          <Text style={[styles.capabilityText, { color: theme.textMuted }]}>
            {capabilityLabel}
          </Text>

          {safetyNote ? (
            <View style={styles.safetyRow}>
              <AppIcon name="info" size={14} color={theme.scholar} />
              <Text style={[styles.safetyText, { color: theme.textSecondary }]}>
                {safetyNote}
              </Text>
            </View>
          ) : null}

          {onFeedback ? (
            <View style={styles.feedbackRow}>
              <Text style={[styles.feedbackPrompt, { color: theme.textMuted }]}>
                Was this useful?
              </Text>
              <Pressable
                onPress={() => onFeedback("helpful")}
                accessibilityRole="button"
                accessibilityLabel="This guidance was helpful"
                style={styles.feedbackButton}
              >
                <AppIcon name="thumbs-up" size={14} color={theme.primary} />
                <Text style={[styles.feedbackText, { color: theme.primary }]}>
                  Helpful
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onFeedback("not_now")}
                accessibilityRole="button"
                accessibilityLabel="Hide this guidance for now"
                style={styles.feedbackButton}
              >
                <Text style={[styles.feedbackText, { color: theme.textMuted }]}>
                  Not now
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: NuraiRadius.card,
    padding: NuraiSpace.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
    gap: NuraiSpace.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  mark: {
    width: 42,
    height: 42,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  status: {
    flex: 1,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  detailsButton: {
    minWidth: 76,
    minHeight: 44,
    borderRadius: NuraiRadius.pill,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  detailsButtonText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
  },
  recommendation: { gap: 7 },
  title: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 21,
    lineHeight: 29,
  },
  quickContext: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  quickProgressTrack: {
    width: 4,
    height: 38,
    borderRadius: 2,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  quickContextCopy: { flex: 1, minWidth: 0, gap: 5 },
  quickContextHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickNextRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  quickNextText: {
    flex: 1,
    minWidth: 0,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  dayCount: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
    lineHeight: 18,
  },
  progressFill: { width: "100%", borderRadius: 2 },
  detailLedger: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: NuraiRadius.control,
    padding: NuraiSpace.sm,
    gap: 8,
  },
  contextRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  contextLabel: {
    width: 36,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
    lineHeight: 16,
  },
  contextValue: {
    flex: 1,
    minWidth: 0,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  signalLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  signalText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    lineHeight: 17,
  },
  errorRow: {
    minHeight: 44,
    borderRadius: NuraiRadius.control,
    paddingHorizontal: NuraiSpace.sm,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: { flex: 1 },
  primaryAction: {
    minHeight: 50,
    borderRadius: NuraiRadius.control,
    paddingHorizontal: NuraiSpace.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryActionText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
  },
  askAction: {
    minHeight: 44,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 2,
  },
  askActionText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
  },
  details: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: NuraiSpace.md,
    gap: NuraiSpace.sm,
  },
  evidenceList: { gap: 7 },
  evidenceRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  evidenceDot: { width: 6, height: 6, borderRadius: 3 },
  evidenceText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  sourceCopy: { flex: 1, minWidth: 0, gap: 2 },
  sourceTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
    lineHeight: 18,
  },
  sourceText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    lineHeight: 17,
  },
  capabilityText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    lineHeight: 17,
  },
  safetyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  safetyText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    lineHeight: 17,
  },
  feedbackRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  feedbackPrompt: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
  },
  feedbackButton: {
    minHeight: 44,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  feedbackText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
  },
  pressed: { opacity: 0.74, transform: [{ scale: 0.99 }] },
});
