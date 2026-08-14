import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import { AppIcon } from "@/components/icons";

type BadgeVariant = "premium" | "scholar" | "free" | "new" | "ai";

interface BadgeProps {
  variant: BadgeVariant;
  size?: "sm" | "md";
  style?: ViewStyle;
}

export function Badge({ variant, size = "sm", style }: BadgeProps) {
  const { theme, isDark } = useTheme();

  const config = getBadgeConfig(variant, theme, isDark);
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingHorizontal: isSmall ? 6 : 8,
          paddingVertical: isSmall ? 2 : Spacing.xs,
        },
        style,
      ]}
    >
      {config.icon ? (
        <AppIcon
          name={config.icon as any}
          size={isSmall ? 9 : 11}
          color={config.color}
        />
      ) : null}
      <ThemedText
        style={[
          styles.badgeText,
          {
            color: config.color,
            fontSize: isSmall ? 9 : 11,
          },
        ]}
      >
        {config.label}
      </ThemedText>
    </View>
  );
}

function getBadgeConfig(
  variant: BadgeVariant,
  theme: any,
  isDark: boolean,
): { label: string; color: string; bg: string; border: string; icon?: string } {
  switch (variant) {
    case "premium":
      return {
        label: "Premium",
        color: theme.primary,
        bg: theme.primarySubtle,
        border: theme.primaryBorder,
        icon: "star",
      };
    case "scholar":
      return {
        label: "Scholar",
        color: theme.scholar,
        bg: theme.scholarSoft,
        border: isDark ? "rgba(198, 167, 94, 0.25)" : "rgba(168, 137, 61, 0.2)",
        icon: "award",
      };
    case "free":
      return {
        label: "Free",
        color: theme.textMuted,
        bg: isDark ? theme.surfaceGlass : "rgba(0, 0, 0, 0.04)",
        border: theme.borderSubtle,
      };
    case "new":
      return {
        label: "New",
        color: theme.primary,
        bg: theme.primarySubtle,
        border: theme.primaryBorder,
      };
    case "ai":
      return {
        label: "AI",
        color: theme.primary,
        bg: theme.primarySubtle,
        border: theme.primaryBorder,
        icon: "zap",
      };
  }
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
});
