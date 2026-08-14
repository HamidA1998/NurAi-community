import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { NurAINudge as NudgeType } from "@/services/nuraiEngine";
import { AppIcon } from "@/components/icons";

interface NurAINudgeCardProps {
  nudge: NudgeType;
  onDismiss: () => void;
  onAction?: (screen: string) => void;
}

const NUDGE_GRADIENTS: Record<
  string,
  { dark: [string, string, string]; light: [string, string, string] }
> = {
  celebration: {
    dark: ["#064E3B", "#065F46", "#047857"],
    light: ["#ECFDF5", "#D1FAE5", "#A7F3D0"],
  },
  reminder: {
    dark: ["#1E1B4B", "#312E81", "#3730A3"],
    light: ["#EEF2FF", "#E0E7FF", "#C7D2FE"],
  },
  insight: {
    dark: ["#162032", "#1A2744", "#1E3055"],
    light: ["#F8FAFC", "#F1F5F9", "#E2E8F0"],
  },
  protection: {
    dark: ["#3B0764", "#4C1D95", "#5B21B6"],
    light: ["#FAF5FF", "#F3E8FF", "#E9D5FF"],
  },
  teaching: {
    dark: ["#1C1917", "#292524", "#44403C"],
    light: ["#FAFAF9", "#F5F5F4", "#E7E5E4"],
  },
};

const NUDGE_ACCENT: Record<string, { dark: string; light: string }> = {
  celebration: { dark: "#34D399", light: "#059669" },
  reminder: { dark: "#E8C76F", light: "#8A641F" },
  insight: { dark: "#94A3B8", light: "#475569" },
  protection: { dark: "#6FCBA8", light: "#059669" },
  teaching: { dark: "#D6D3D1", light: "#57534E" },
};

export function NurAINudgeCard({
  nudge,
  onDismiss,
  onAction,
}: NurAINudgeCardProps) {
  const { isDark } = useTheme();

  const gradientColors = isDark
    ? NUDGE_GRADIENTS[nudge.type]?.dark || NUDGE_GRADIENTS.insight.dark
    : NUDGE_GRADIENTS[nudge.type]?.light || NUDGE_GRADIENTS.insight.light;

  const accentColor = isDark
    ? NUDGE_ACCENT[nudge.type]?.dark || "#94A3B8"
    : NUDGE_ACCENT[nudge.type]?.light || "#475569";

  const textColor = isDark ? "#F1F5F9" : "#1E293B";
  const subtextColor = isDark ? "#CBD5E1" : "#475569";

  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      exiting={FadeOutUp.duration(300)}
      style={styles.container}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: isDark ? accentColor + "20" : accentColor + "15",
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: accentColor + "20" },
              ]}
            >
              <AppIcon name={nudge.icon as any} size={16} color={accentColor} />
            </View>
            <View style={styles.labelWrap}>
              <View style={styles.aiLabelRow}>
                <View
                  style={[styles.aiDot, { backgroundColor: accentColor }]}
                />
                <Text style={[styles.aiLabel, { color: accentColor }]}>
                  NurAI
                </Text>
              </View>
              <Text
                style={[styles.title, { color: textColor }]}
                numberOfLines={1}
              >
                {nudge.title}
              </Text>
            </View>
          </View>
          {nudge.dismissable ? (
            <Pressable
              onPress={onDismiss}
              hitSlop={12}
              style={({ pressed }) => [
                styles.dismissBtn,
                pressed && { opacity: 0.5 },
              ]}
              testID="button-dismiss-nudge"
            >
              <AppIcon name="x" size={16} color={subtextColor} />
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.body, { color: subtextColor }]}>{nudge.body}</Text>

        {nudge.actions && nudge.actions.length > 0 ? (
          <View style={styles.actionsRow}>
            {nudge.actions.map((action, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  if (action.screen && onAction) {
                    onAction(action.screen);
                  }
                }}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { borderColor: accentColor + "30" },
                  pressed && { opacity: 0.7 },
                ]}
                testID={`button-nudge-action-${i}`}
              >
                <Text style={[styles.actionText, { color: accentColor }]}>
                  {action.label}
                </Text>
                <AppIcon name="chevron-right" size={14} color={accentColor} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </LinearGradient>
    </Animated.View>
  );
}

interface QuranContextCardProps {
  context: {
    verseKey: string;
    contextType: string;
    content: string;
    source: string;
  };
  onDismiss?: () => void;
}

export function QuranContextCard({
  context,
  onDismiss,
}: QuranContextCardProps) {
  const { isDark } = useTheme();

  const typeLabel =
    context.contextType === "hadith"
      ? "Related Hadith"
      : context.contextType === "revelation"
        ? "Revelation Context"
        : context.contextType === "tafsir"
          ? "Tafsir Insight"
          : context.contextType === "linguistic"
            ? "Arabic Insight"
            : "Practical Wisdom";

  const accentColor = isDark ? "#34D399" : "#059669";

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      exiting={FadeOutUp.duration(200)}
      style={styles.contextContainer}
    >
      <View
        style={[
          styles.contextCard,
          {
            backgroundColor: isDark ? "#0F1B2D" : "#F8FAF9",
            borderColor: isDark ? "#1E3A4A" : "#D1FAE5",
          },
        ]}
      >
        <View style={styles.contextHeader}>
          <View style={styles.contextLabelRow}>
            <View
              style={[styles.contextDot, { backgroundColor: accentColor }]}
            />
            <Text style={[styles.contextLabel, { color: accentColor }]}>
              {typeLabel}
            </Text>
          </View>
          {onDismiss ? (
            <Pressable
              onPress={onDismiss}
              hitSlop={12}
              style={({ pressed }) => pressed && { opacity: 0.5 }}
              testID="button-dismiss-context"
            >
              <AppIcon
                name="x"
                size={14}
                color={isDark ? "#64748B" : "#94A3B8"}
              />
            </Pressable>
          ) : null}
        </View>

        <Text
          style={[
            styles.contextBody,
            { color: isDark ? "#CBD5E1" : "#475569" },
          ]}
        >
          {context.content}
        </Text>

        <Text
          style={[
            styles.contextSource,
            { color: isDark ? "#64748B" : "#94A3B8" },
          ]}
        >
          {context.source}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: 20,
    padding: Spacing.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  labelWrap: {
    flex: 1,
  },
  aiLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  aiDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  aiLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
    lineHeight: 20,
  },
  dismissBtn: {
    padding: 4,
  },
  body: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  contextContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  contextCard: {
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
  },
  contextHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  contextLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contextDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  contextLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  contextBody: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  contextSource: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_400Regular",
    fontStyle: "italic",
  },
});
