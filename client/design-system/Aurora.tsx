import React, { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { useTheme } from "@/hooks/useTheme";

// A slow, living "night sky" that the liquid-glass surfaces float over and
// refract. Deep midnight base + soft emerald / deep-blue blobs that
// drift on the native thread (cheap transforms), plus a faint starfield.
//
// Deliberately restrained: one canonical emerald accent and quiet blue depth.

type BlobSpec = {
  color: string;
  opacity: number;
  size: number;
  left: number;
  top: number;
  driftX: number;
  driftY: number;
  duration: number;
};

function Blob({ spec, id }: { spec: BlobSpec; id: string }) {
  const t = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) {
      t.value = 0;
      return;
    }
    t.value = withRepeat(
      withTiming(1, {
        duration: spec.duration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [reduceMotion, spec.duration, t]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: spec.driftX * t.value },
      { translateY: spec.driftY * t.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: spec.left,
          top: spec.top,
          width: spec.size,
          height: spec.size,
        },
        style,
      ]}
    >
      <Svg width={spec.size} height={spec.size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop
              offset="0"
              stopColor={spec.color}
              stopOpacity={spec.opacity}
            />
            <Stop offset="1" stopColor={spec.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle
          cx={spec.size / 2}
          cy={spec.size / 2}
          r={spec.size / 2}
          fill={`url(#${id})`}
        />
      </Svg>
    </Animated.View>
  );
}

const BLOBS: BlobSpec[] = [
  {
    color: "#56B394",
    opacity: 0.34,
    size: 380,
    left: -110,
    top: -120,
    driftX: 26,
    driftY: 34,
    duration: 13000,
  },
  {
    color: "#274E68",
    opacity: 0.28,
    size: 320,
    left: 150,
    top: 220,
    driftX: -28,
    driftY: 26,
    duration: 15500,
  },
  {
    color: "#2B568C",
    opacity: 0.34,
    size: 400,
    left: -90,
    top: 560,
    driftX: 32,
    driftY: -28,
    duration: 17000,
  },
  {
    color: "#3E8C78",
    opacity: 0.2,
    size: 300,
    left: 170,
    top: 880,
    driftX: -24,
    driftY: 30,
    duration: 14500,
  },
];

export function Aurora({ style }: { style?: ViewStyle }) {
  const { theme, isDark } = useTheme();
  const palette = [theme.primary, theme.info, theme.scholar, theme.primary];
  return (
    <View
      style={[styles.root, { backgroundColor: theme.backgroundRoot }, style]}
      pointerEvents="none"
    >
      {isDark
        ? BLOBS.map((spec, i) => (
            <Blob
              key={i}
              spec={{ ...spec, color: palette[i] || theme.primary }}
              id={`aurora-blob-${i}`}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
});
