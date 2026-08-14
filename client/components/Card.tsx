import React from "react";
import { StyleSheet, Pressable, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

export type CardVariant = "default" | "glass" | "elevated" | "outlined";

interface CardProps {
  elevation?: number;
  variant?: CardVariant;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  elevation = 1,
  variant = "default",
  title,
  description,
  children,
  onPress,
  style,
}: CardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  let cardBackgroundColor: string;
  let shadowStyle: ViewStyle = {};
  let borderStyle: ViewStyle = {};

  switch (variant) {
    case "glass":
      cardBackgroundColor = isDark ? theme.surfaceGlass : theme.surfaceGlass;
      shadowStyle = !isDark ? Shadows.softCard : {};
      borderStyle = {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.borderSubtle,
      };
      break;
    case "elevated":
      cardBackgroundColor = isDark ? theme.backgroundSecondary : theme.surface;
      shadowStyle = !isDark ? Shadows.cardElevated : {};
      borderStyle = {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.borderSubtle,
      };
      break;
    case "outlined":
      cardBackgroundColor = "transparent";
      borderStyle = {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.borderStrong,
      };
      break;
    default:
      cardBackgroundColor = isDark
        ? theme.cardBackground
        : theme.cardBackground;
      shadowStyle = !isDark ? Shadows.card : {};
      break;
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole={onPress ? "button" : undefined}
      style={[
        styles.card,
        {
          backgroundColor: cardBackgroundColor,
          ...borderStyle,
        },
        shadowStyle,
        animatedStyle,
        style,
      ]}
    >
      {title ? (
        <ThemedText type="h4" style={styles.cardTitle}>
          {title}
        </ThemedText>
      ) : null}
      {description ? (
        <ThemedText type="small" style={styles.cardDescription}>
          {description}
        </ThemedText>
      ) : null}
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  cardDescription: {
    opacity: 0.7,
  },
});
