import React from "react";
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import { NuraiGlass } from "@/design-system/NuraiGlass";
import { AppIcon, type AppIconName } from "@/components/icons";

type FeatherIcon = AppIconName;

export function MediaStatusBadge({
  icon,
  label,
  color,
  backgroundColor,
  borderColor,
  style,
}: {
  icon: FeatherIcon;
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.statusBadge, { backgroundColor, borderColor }, style]}>
      <AppIcon name={icon} size={11} color={color} />
      <ThemedText
        type="caption"
        numberOfLines={1}
        style={[styles.statusBadgeText, { color }]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

export function MediaProgressBar({
  progress,
  color,
  trackColor,
  style,
  accessibilityLabel = "Playback progress",
}: {
  progress: number;
  color: string;
  trackColor: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const normalizedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: normalizedProgress }}
      style={[styles.progressTrack, { backgroundColor: trackColor }, style]}
    >
      <View
        style={[
          styles.progressFill,
          {
            backgroundColor: color,
            width: `${normalizedProgress}%`,
          },
        ]}
      />
    </View>
  );
}

export function PremiumMiniPlayerSurface({
  children,
  glowColor,
  style,
  entering,
  testID,
  onLayout,
  radius = 24,
}: {
  children: React.ReactNode;
  glowColor: string;
  style?: StyleProp<ViewStyle>;
  entering?: unknown;
  testID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
  radius?: number;
}) {
  return (
    <Animated.View
      testID={testID}
      entering={entering as never}
      style={style}
      onLayout={onLayout}
    >
      <NuraiGlass
        pointerEvents="none"
        radius={radius}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[glowColor, "transparent"]}
        style={styles.surfaceGlow}
      />
      {children}
    </Animated.View>
  );
}

export function MediaControlChip({
  icon,
  label,
  color,
  backgroundColor,
  borderColor,
  onPress,
  disabled,
  loading,
  loadingColor,
  accessibilityLabel,
  testID,
  style,
}: {
  icon?: FeatherIcon;
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingColor?: string;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlChip,
        {
          backgroundColor,
          borderColor,
          opacity: disabled ? 0.58 : pressed ? 0.72 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={loadingColor || color} />
      ) : icon ? (
        <AppIcon name={icon} size={12} color={color} />
      ) : null}
      <ThemedText
        type="caption"
        numberOfLines={1}
        style={[styles.controlChipText, { color }]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statusBadge: {
    minHeight: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusBadgeText: {
    fontWeight: "800",
    fontSize: 10,
  },
  progressTrack: {
    height: 5,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  surfaceGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  controlChip: {
    minWidth: 40,
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  controlChipText: {
    fontWeight: "800",
  },
});
