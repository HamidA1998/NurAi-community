import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { useTheme } from "@/hooks/useTheme";
import { AppIcon, type AppIconName } from "@/components/icons";

/**
 * Large-format icon presentation for hero/showcase moments — onboarding
 * option cards, feature showcase tiles, empty states. A gradient rounded
 * square with the glyph rendered large (40%+ of the tile) in a warm gold
 * or emerald tone, distinct from the flat two-tone treatment inline icons
 * use everywhere else. Reserve for the handful of large-scale spots; at
 * 14-24px this gradient reads as noise, not premium — use AppIcon there.
 */
export function NuraiIconTile({
  icon,
  size = 64,
  tone = "primary",
  style,
}: {
  icon: AppIconName;
  size?: number;
  tone?: "primary" | "scholar";
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, isDark } = useTheme();
  const radius = size * 0.28;
  const glyphSize = Math.round(size * 0.46);
  const accent = tone === "scholar" ? theme.scholar : theme.primary;
  const gradientId = `nurai-tile-${tone}`;

  return (
    <View style={[{ width: size, height: size, borderRadius: radius }, style]}>
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop
              offset="0"
              stopColor={accent}
              stopOpacity={isDark ? 0.22 : 0.16}
            />
            <Stop offset="1" stopColor={accent} stopOpacity={0.06} />
          </LinearGradient>
        </Defs>
        <Rect
          x="0.5"
          y="0.5"
          width={size - 1}
          height={size - 1}
          rx={radius}
          fill={`url(#${gradientId})`}
          stroke={`${accent}40`}
          strokeWidth={1}
        />
      </Svg>
      <View style={styles.glyphWrap}>
        <AppIcon name={icon} size={glyphSize} color={accent} decorative />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glyphWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
