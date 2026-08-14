import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { NurAILogoMark } from "@/components/NurAILogoMark";
import {
  BorderRadius,
  Shadows,
  Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { PremiumTheme } from "@/constants/premiumTheme";
import type { PersonalAIActionPlanContract } from "@shared/nuraiAI";
import { AppIcon } from "@/components/icons";

type PersonalAIActionLaneProps = {
  actionSteps: string[];
  actionPlan?: PersonalAIActionPlanContract | null;
  onActionPress?: (label: string) => void;
  theme: ThemeColors;
  compact?: boolean;
};

function actionKindIcon(label: string, isPrimary: boolean) {
  const lower = label.toLowerCase();
  if (/\b(scholar|qualified|human)\b/.test(lower)) return "shield";
  if (/\b(quran|ayah|surah)\b/.test(lower)) return "book-open";
  if (/\b(prayer|salah|fajr|masjid)\b/.test(lower)) return "sun";
  if (/\b(arabic|lesson)\b/.test(lower)) return "type";
  if (/\b(hifz|memor|revision)\b/.test(lower)) return "layers";
  if (/\b(dua|dhikr|tasbeeh)\b/.test(lower)) return "heart";
  if (/\b(travel|journey)\b/.test(lower)) return "navigation";
  if (/\b(save|note)\b/.test(lower)) return "bookmark";
  if (/\b(reminder|notify)\b/.test(lower)) return "bell";
  return isPrimary ? "compass" : "arrow-right-circle";
}

export function PersonalAIActionLane({
  actionSteps,
  actionPlan,
  onActionPress,
  theme,
  compact = false,
}: PersonalAIActionLaneProps) {
  const steps = actionSteps.slice(0, 3);
  if (!steps.length) return null;

  const primaryLabel = actionPlan?.primary?.label || steps[0];
  const secondaryLabels = actionPlan?.secondary?.length
    ? actionPlan.secondary.map((action) => action.label).slice(0, 2)
    : steps.slice(1);

  return (
    <View
      style={[
        styles.shell,
        {
          borderColor: `${theme.primary}28`,
          backgroundColor:
            theme.surfaceGlass || `${theme.backgroundSecondary}CC`,
        },
        Shadows.softCard,
      ]}
    >
      <LinearGradient
        colors={[`${theme.primary}14`, `${theme.scholar}08`, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glowWash}
      />

      <View style={styles.headerRow}>
        <View
          style={[
            styles.markShell,
            {
              borderColor: `${theme.scholar}30`,
              backgroundColor: `${theme.scholar}12`,
            },
          ]}
        >
          <NurAILogoMark size={22} borderRadius={8} color={theme.scholar} />
        </View>
        <View style={styles.headerCopy}>
          <ThemedText
            type="caption"
            style={[styles.eyebrow, { color: theme.scholar }]}
          >
            Next best step
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textMuted }}>
            Personal AI chose one primary action and optional follow-ons.
          </ThemedText>
        </View>
      </View>

      <Pressable
        onPress={() => onActionPress?.(primaryLabel)}
        style={({ pressed }) => [
          styles.primaryLane,
          {
            borderColor: `${theme.primary}42`,
            backgroundColor: `${theme.primary}10`,
          },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Primary Personal AI action: ${primaryLabel}`}
      >
        <View
          style={[
            styles.primaryIcon,
            { backgroundColor: `${theme.primary}18` },
          ]}
        >
          <AppIcon
            name={actionKindIcon(primaryLabel, true)}
            size={16}
            color={theme.primary}
          />
        </View>
        <View style={styles.primaryCopy}>
          <ThemedText
            type="caption"
            style={[styles.primaryBadge, { color: theme.primary }]}
          >
            Primary
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.primaryLabel, { color: theme.text }]}
          >
            {primaryLabel}
          </ThemedText>
        </View>
        <AppIcon name="chevron-right" size={18} color={theme.primary} />
      </Pressable>

      {secondaryLabels.length > 0 && !compact ? (
        <View style={styles.secondaryRow}>
          {secondaryLabels.map((label) => (
            <Pressable
              key={label}
              onPress={() => onActionPress?.(label)}
              style={({ pressed }) => [
                styles.secondaryChip,
                {
                  borderColor: `${theme.scholar}24`,
                  backgroundColor: `${theme.scholar}08`,
                },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Secondary Personal AI action: ${label}`}
            >
              <AppIcon
                name={actionKindIcon(label, false)}
                size={12}
                color={theme.scholar}
              />
              <ThemedText
                type="caption"
                style={[styles.secondaryText, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: PremiumTheme.border.hairline,
    borderRadius: PremiumTheme.radius.card,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  glowWash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  markShell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontSize: 10,
  },
  primaryLane: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: PremiumTheme.touch.compact,
  },
  primaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCopy: {
    flex: 1,
    gap: 2,
  },
  primaryBadge: {
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontSize: 9,
  },
  primaryLabel: {
    fontWeight: "700",
    lineHeight: 20,
  },
  secondaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  secondaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  secondaryText: {
    fontWeight: "600",
    flexShrink: 1,
  },
  pressed: {
    opacity: PremiumTheme.opacity.pressed,
  },
});
