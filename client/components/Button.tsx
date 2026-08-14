import React, { ReactNode } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { AppIcon } from "@/components/icons";

type ButtonVariant = "primary" | "secondary" | "ghost" | "premium" | "scholar";

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  variant?: ButtonVariant;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  haptic?: boolean;
  size?: "sm" | "md" | "lg";
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  children,
  variant = "primary",
  icon,
  style,
  disabled = false,
  haptic = false,
  size = "md",
}: ButtonProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.97, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const variantStyles = getVariantStyles(variant, theme, isDark);
  const sizeStyles = getSizeStyles(size);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[
        styles.button,
        sizeStyles,
        variantStyles.container,
        { opacity: disabled ? 0.5 : 1 },
        style,
        animatedStyle,
      ]}
    >
      {icon ? (
        <AppIcon
          name={icon as any}
          size={size === "sm" ? 14 : 16}
          color={variantStyles.textColor}
        />
      ) : null}
      <ThemedText
        type={size === "sm" ? "caption" : "body"}
        style={[
          styles.buttonText,
          { color: variantStyles.textColor },
          size === "sm" ? { fontSize: 13 } : {},
        ]}
      >
        {children}
      </ThemedText>
    </AnimatedPressable>
  );
}

function getVariantStyles(
  variant: ButtonVariant,
  theme: any,
  isDark: boolean,
): { container: ViewStyle; textColor: string } {
  switch (variant) {
    case "primary":
      return {
        container: { backgroundColor: theme.primary },
        textColor: theme.primaryForeground,
      };
    case "secondary":
      return {
        container: {
          backgroundColor: isDark ? theme.surfaceGlass : "transparent",
          borderWidth: 1,
          borderColor: theme.borderStrong,
        },
        textColor: theme.text,
      };
    case "ghost":
      return {
        container: { backgroundColor: "transparent" },
        textColor: theme.primary,
      };
    case "premium":
      return {
        container: { backgroundColor: theme.primary },
        textColor: theme.primaryForeground,
      };
    case "scholar":
      return {
        container: { backgroundColor: theme.scholar },
        textColor: theme.primaryForeground,
      };
  }
}

function getSizeStyles(size: "sm" | "md" | "lg"): ViewStyle {
  switch (size) {
    case "sm":
      return { height: 36, paddingHorizontal: Spacing.lg };
    case "md":
      return { height: Spacing.inputHeight, paddingHorizontal: Spacing.xl };
    case "lg":
      return {
        height: Spacing.buttonHeight,
        paddingHorizontal: Spacing["2xl"],
      };
  }
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  buttonText: {
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
});
