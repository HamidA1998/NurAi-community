import React from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { NurAINudge } from "@/services/nuraiRuleEngineV3";
import { AppIcon } from "@/components/icons";
import {
  NuraiGlass,
  NuraiRadius,
  NuraiSpace,
  NuraiTouch,
  NuraiType,
} from "@/design-system";

interface NurAINudgeV3CardProps {
  nudge: NurAINudge;
  onDismiss: (nudgeId: string) => void;
  onAction?: (route: string, params?: any) => void;
}

function getCategoryLabel(category: string) {
  switch (category) {
    case "prayer":
      return "Prayer rhythm";
    case "quran":
      return "Quran rhythm";
    case "streak":
    case "achievement":
      return "Your progress";
    case "calendar":
    case "ramadan":
      return "Seasonal guidance";
    default:
      return "For your day";
  }
}

export function NurAINudgeV3Card({
  nudge,
  onDismiss,
  onAction,
}: NurAINudgeV3CardProps) {
  const { theme } = useTheme();
  const accentColor =
    nudge.priority === "critical"
      ? theme.error
      : nudge.priority === "high"
        ? theme.warning
        : ["quran", "teaching", "calendar", "ramadan"].includes(nudge.category)
          ? theme.scholar
          : theme.primary;

  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      exiting={FadeOutUp.duration(300)}
      style={styles.container}
    >
      <View style={[styles.card, { borderColor: theme.borderSubtle }]}>
        <NuraiGlass
          pointerEvents="none"
          radius={NuraiRadius.card}
          tint="rgba(7, 26, 26, 0.58)"
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: `${accentColor}16`,
                    borderColor: `${accentColor}38`,
                  },
                ]}
              >
                <AppIcon
                  name={(nudge.icon as any) || "bell"}
                  size={17}
                  color={accentColor}
                />
              </View>
              <View style={styles.labelWrap}>
                <View style={styles.aiLabelRow}>
                  <Text style={[NuraiType.overline, { color: theme.primary }]}>
                    NUR AI
                  </Text>
                  <Text
                    style={[NuraiType.caption, { color: theme.textMuted }]}
                    numberOfLines={1}
                  >
                    · {getCategoryLabel(nudge.category)}
                  </Text>
                </View>
                <Text
                  style={[styles.title, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {nudge.title}
                </Text>
              </View>
            </View>
            {nudge.dismissible ? (
              <Pressable
                onPress={() => onDismiss(nudge.id)}
                style={({ pressed }) => [
                  styles.dismissBtn,
                  pressed ? { opacity: 0.5 } : undefined,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Dismiss guidance"
                testID="button-dismiss-nudge-v3"
              >
                <AppIcon name="x" size={16} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {nudge.body}
          </Text>

          {nudge.reason ? (
            <View
              style={[styles.reasonRow, { borderTopColor: theme.borderSubtle }]}
            >
              <AppIcon name="info" size={14} color={theme.textMuted} />
              <Text style={[styles.reason, { color: theme.textMuted }]}>
                {nudge.reason}
              </Text>
            </View>
          ) : null}

          {nudge.actionLabel && nudge.actionRoute ? (
            <Pressable
              onPress={() => {
                if (onAction) {
                  onAction(nudge.actionRoute!, nudge.actionParams);
                }
              }}
              style={({ pressed }) => [
                styles.actionBtn,
                { borderTopColor: theme.borderSubtle },
                pressed ? { opacity: 0.7 } : undefined,
              ]}
              accessibilityRole="button"
              accessibilityLabel={nudge.actionLabel}
              testID="button-nudge-v3-action"
            >
              <Text style={[styles.actionText, { color: accentColor }]}>
                {nudge.actionLabel}
              </Text>
              <AppIcon name="arrow-right" size={15} color={accentColor} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

interface V3DailyMotivationCardProps {
  motivation: {
    text: string;
    source: string;
    sourceUrl?: string;
    category: string;
  };
  onDismiss?: () => void;
}

export function V3DailyMotivationCard({
  motivation,
  onDismiss,
}: V3DailyMotivationCardProps) {
  const { isDark } = useTheme();

  const accentColor = isDark ? "#34D399" : "#059669";
  const textColor = isDark ? "#F1F5F9" : "#1E293B";
  const sourceColor = isDark ? "#64748B" : "#94A3B8";
  const openSource = () => {
    if (motivation.sourceUrl) Linking.openURL(motivation.sourceUrl);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      exiting={FadeOutUp.duration(200)}
      style={styles.motivationContainer}
    >
      <View
        style={[
          styles.motivationCard,
          {
            backgroundColor: isDark ? "#0F1B2D" : "#F8FAF9",
            borderColor: isDark ? "#1E3A4A" : "#D1FAE5",
            borderLeftColor: accentColor,
            borderLeftWidth: 3,
          },
        ]}
      >
        <View style={styles.motivationHeader}>
          <View style={styles.motivationLabelRow}>
            <View
              style={[styles.motivationDot, { backgroundColor: accentColor }]}
            />
            <Text style={[styles.motivationLabel, { color: accentColor }]}>
              Daily Motivation
            </Text>
          </View>
          {onDismiss ? (
            <Pressable
              onPress={onDismiss}
              hitSlop={12}
              style={({ pressed }) => (pressed ? { opacity: 0.5 } : undefined)}
              testID="button-dismiss-motivation"
            >
              <AppIcon
                name="x"
                size={14}
                color={isDark ? "#64748B" : "#94A3B8"}
              />
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.motivationText, { color: textColor }]}>
          {motivation.text}
        </Text>

        {motivation.sourceUrl ? (
          <Pressable
            onPress={openSource}
            accessibilityRole="link"
            accessibilityLabel={`Open source ${motivation.source}`}
            hitSlop={8}
            style={({ pressed }) => [
              styles.motivationSourceLink,
              pressed ? { opacity: 0.62 } : undefined,
            ]}
          >
            <Text style={[styles.motivationSource, { color: sourceColor }]}>
              {motivation.source}
            </Text>
            <AppIcon name="external-link" size={11} color={sourceColor} />
          </Pressable>
        ) : (
          <Text style={[styles.motivationSource, { color: sourceColor }]}>
            {motivation.source}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: NuraiSpace.lg,
    marginBottom: NuraiSpace.md,
  },
  card: {
    borderRadius: NuraiRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardContent: {
    padding: NuraiSpace.md,
    gap: NuraiSpace.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: NuraiSpace.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: NuraiSpace.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
  },
  labelWrap: {
    flex: 1,
  },
  aiLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.xs,
  },
  title: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    lineHeight: 22,
  },
  dismissBtn: {
    width: NuraiTouch.minimum,
    height: NuraiTouch.minimum,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    lineHeight: 21,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: NuraiSpace.xs,
    paddingTop: NuraiSpace.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reason: {
    flex: 1,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: NuraiSpace.sm,
    minHeight: NuraiTouch.minimum,
    paddingTop: NuraiSpace.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  motivationContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  motivationCard: {
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
  },
  motivationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  motivationLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  motivationDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  motivationLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  motivationText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  motivationSource: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_400Regular",
    fontStyle: "italic",
  },
  motivationSourceLink: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 24,
  },
});
