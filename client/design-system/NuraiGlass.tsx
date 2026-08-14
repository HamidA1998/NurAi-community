import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import {
  GlassContainer,
  GlassView,
  isLiquidGlassAvailable,
  type GlassContainerProps,
} from "expo-glass-effect";

import { useTheme } from "@/hooks/useTheme";

// Apple Liquid Glass surface for NurAI. On iOS 26 this is the *real*
// UIGlassEffect (translucent, refracts the aurora behind it, light-catching
// edge). Everywhere else it degrades to a blurred, faintly-tinted panel with a
// hairline specular edge — visually close, and it renders in the current dev
// build (expo-blur is already linked).

const LIQUID_GLASS: boolean =
  Platform.OS === "ios" &&
  (() => {
    try {
      return isLiquidGlassAvailable();
    } catch {
      return false;
    }
  })();

export function nuraiGlassAvailable(): boolean {
  return LIQUID_GLASS;
}

export function NuraiGlassGroup({
  children,
  spacing = 20,
  style,
  ...props
}: GlassContainerProps) {
  if (LIQUID_GLASS) {
    return (
      <GlassContainer spacing={spacing} style={style} {...props}>
        {children}
      </GlassContainer>
    );
  }

  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
}

type PointerEvents = "auto" | "none" | "box-none" | "box-only";

export function NuraiGlass({
  children,
  style,
  tint,
  radius = 22,
  interactive = false,
  pointerEvents,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Subtle accent wash, e.g. the emerald or gold at low alpha. */
  tint?: string;
  radius?: number;
  interactive?: boolean;
  pointerEvents?: PointerEvents;
}) {
  const { isDark, theme } = useTheme();
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const shape: ViewStyle = { borderRadius: radius, overflow: "hidden" };
  const resolvedTint =
    tint ?? (isDark ? "rgba(14,22,30,0.34)" : "rgba(255,255,255,0.5)");

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((enabled) => {
        if (mounted) setReduceTransparency(enabled);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduceTransparency,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  if (reduceTransparency) {
    return (
      <View
        pointerEvents={pointerEvents}
        style={[
          shape,
          styles.reducedSurface,
          {
            backgroundColor: theme.surfaceElevated,
            borderColor: theme.borderStrong,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  if (LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor={resolvedTint}
        colorScheme={isDark ? "dark" : "light"}
        isInteractive={interactive}
        pointerEvents={pointerEvents}
        style={[shape, style]}
      >
        {children}
      </GlassView>
    );
  }

  // Fallback: blurred panel + faint tint + a light-catching top edge.
  return (
    <View
      pointerEvents={pointerEvents}
      style={[shape, styles.fallbackEdge, style]}
    >
      <BlurView
        intensity={34}
        tint={isDark ? "dark" : "light"}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            backgroundColor: resolvedTint,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.fallbackHighlight,
          {
            borderRadius: radius,
            borderColor: isDark
              ? "rgba(255,255,255,0.12)"
              : "rgba(255,255,255,0.7)",
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackEdge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  fallbackHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reducedSurface: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
