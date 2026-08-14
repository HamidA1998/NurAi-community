import React, { ReactNode } from "react";
import { View, StyleSheet, Switch, ViewStyle, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import { AppIcon } from "@/components/icons";
import { NuraiSpring } from "@/design-system";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const pressSpring = { ...NuraiSpring.gentle, overshootClamping: true };

interface ListRowProps {
  icon?: string;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: ReactNode;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  showChevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function ListRow({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  onPress,
  rightElement,
  switchValue,
  onSwitchChange,
  showChevron = true,
  destructive = false,
  disabled = false,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: ListRowProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress && !disabled) {
      scale.value = withSpring(0.98, pressSpring);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, pressSpring);
  };

  const titleColor = destructive ? theme.error : theme.text;
  const resolvedIconColor = destructive
    ? theme.error
    : iconColor || theme.primary;
  const resolvedIconBg = destructive
    ? isDark
      ? "rgba(248, 113, 113, 0.12)"
      : "rgba(239, 68, 68, 0.08)"
    : iconBg || theme.primarySubtle;

  const hasSwitch =
    switchValue !== undefined && typeof onSwitchChange === "function";
  const isInteractive = !!onPress || hasSwitch;
  const handlePress = () => {
    if (disabled) return;
    if (onPress) {
      onPress();
      return;
    }
    if (hasSwitch) {
      onSwitchChange?.(!switchValue);
    }
  };

  return (
    <AnimatedPressable
      onPress={isInteractive ? handlePress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || !isInteractive}
      accessible={isInteractive || undefined}
      accessibilityRole={
        isInteractive ? (hasSwitch ? "switch" : "button") : undefined
      }
      accessibilityLabel={
        isInteractive
          ? accessibilityLabel || [title, subtitle].filter(Boolean).join(". ")
          : undefined
      }
      accessibilityHint={isInteractive ? accessibilityHint : undefined}
      accessibilityState={{
        disabled,
        ...(hasSwitch ? { checked: Boolean(switchValue) } : {}),
      }}
      style={[
        styles.row,
        { opacity: disabled ? 0.5 : 1 },
        animatedStyle,
        style,
      ]}
      testID={testID}
    >
      {icon ? (
        <View
          style={[styles.iconContainer, { backgroundColor: resolvedIconBg }]}
        >
          <AppIcon name={icon as any} size={20} color={resolvedIconColor} />
        </View>
      ) : null}

      <View style={styles.content}>
        <ThemedText
          style={[styles.title, { color: titleColor }]}
          numberOfLines={1}
        >
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted }}
            numberOfLines={1}
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      {rightElement ? rightElement : null}

      {hasSwitch ? (
        <Switch
          accessible={false}
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{
            false: theme.switchTrack,
            true: theme.primary,
          }}
          thumbColor="#FFFFFF"
        />
      ) : null}

      {showChevron && isInteractive && !hasSwitch && !rightElement ? (
        <AppIcon name="chevron-right" size={18} color={theme.textMuted} />
      ) : null}
    </AnimatedPressable>
  );
}

export function ListDivider() {
  const { theme } = useTheme();
  return (
    <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    minHeight: 56,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "PlusJakartaSans_500Medium",
  },
  divider: {
    height: 1,
    marginLeft: 64,
  },
});
