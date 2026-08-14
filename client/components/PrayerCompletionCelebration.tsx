import React, { useEffect, useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Mask,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { NuraiButton, NuraiType } from "@/design-system";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STAGE = 268;
const CENTER = STAGE / 2;
const RING_R = 104;
const RING_C = 2 * Math.PI * RING_R;
const EMBER_COUNT = 12;

/* One of the five prayers — a gold star that lights up in sequence around the ring. */
function PrayerNode({
  index,
  active,
  gold,
}: {
  index: number;
  active: boolean;
  gold: string;
}) {
  const v = useSharedValue(0);
  const { left, top } = useMemo(() => {
    const angle = ((-90 + index * 72) * Math.PI) / 180;
    const size = 20;
    return {
      left: CENTER + RING_R * Math.cos(angle) - size / 2,
      top: CENTER + RING_R * Math.sin(angle) - size / 2,
    };
  }, [index]);

  useEffect(() => {
    if (active) {
      v.value = withDelay(
        520 + index * 150,
        withSpring(1, { damping: 8, stiffness: 130, mass: 0.6 }),
      );
    } else {
      v.value = 0;
    }
  }, [active, index, v]);

  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ scale: v.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.node, { left, top }, style]}
    >
      <Svg width={20} height={20} viewBox="0 0 20 20">
        <Circle cx="10" cy="10" r="10" fill={gold} fillOpacity={0.18} />
        <Path
          d="M10 2.5l1.5 4.4 4.6.1-3.7 2.7 1.4 4.4L10 15.4l-3.8 2.7 1.4-4.4L3.9 7l4.6-.1z"
          fill={gold}
        />
      </Svg>
    </Animated.View>
  );
}

/* A slow, refined gold ember drifting upward — sparse and twinkling, not confetti. */
function Ember({
  index,
  gold,
  emerald,
}: {
  index: number;
  gold: string;
  emerald: string;
}) {
  const t = useSharedValue(0);
  const seed = useMemo(() => {
    const spread = (((index * 137.5) % 100) / 100 - 0.5) * 190;
    return {
      x: spread,
      drift: ((index % 3) - 1) * 22,
      size: 2.5 + (index % 4) * 1.4,
      rise: 150 + (index % 5) * 40,
      delay: 300 + index * 190,
      duration: 3200 + (index % 4) * 500,
      isGold: index % 3 !== 0,
    };
  }, [index]);

  useEffect(() => {
    t.value = withDelay(
      seed.delay,
      withRepeat(
        withTiming(1, {
          duration: seed.duration,
          easing: Easing.out(Easing.quad),
        }),
        -1,
        false,
      ),
    );
  }, [t, seed.delay, seed.duration]);

  const style = useAnimatedStyle(() => {
    const twinkle = 0.55 + 0.45 * Math.sin(t.value * Math.PI * 3);
    const fade =
      t.value < 0.15
        ? t.value / 0.15
        : t.value > 0.75
          ? (1 - t.value) / 0.25
          : 1;
    return {
      opacity: fade * twinkle,
      transform: [
        { translateX: seed.x + seed.drift * t.value },
        { translateY: -seed.rise * t.value },
        { scale: 0.7 + t.value * 0.5 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ember,
        {
          width: seed.size,
          height: seed.size,
          borderRadius: seed.size / 2,
          backgroundColor: seed.isGold ? gold : emerald,
        },
        style,
      ]}
    />
  );
}

export function PrayerCompletionCelebration({
  visible,
  name,
  streakDays,
  onClose,
}: {
  visible: boolean;
  name?: string | null;
  streakDays?: number;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const gold = theme.scholar;
  const emerald = theme.primary;

  const bloom = useSharedValue(0);
  const ring = useSharedValue(0);
  const crescent = useSharedValue(0);
  const copy = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      bloom.value = 0;
      ring.value = 0;
      crescent.value = 0;
      copy.value = 0;
      return;
    }
    bloom.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.55, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    crescent.value = withDelay(
      120,
      withSpring(1, { damping: 10, stiffness: 120, mass: 0.7 }),
    );
    ring.value = withDelay(
      260,
      withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) }),
    );
    copy.value = withDelay(
      760,
      withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }),
    );
  }, [visible, bloom, ring, crescent, copy]);

  const bloomStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + bloom.value * 0.4,
    transform: [{ scale: 0.9 + bloom.value * 0.22 }],
  }));
  const crescentStyle = useAnimatedStyle(() => ({
    opacity: crescent.value,
    transform: [
      { scale: 0.55 + crescent.value * 0.45 },
      { rotate: `${(1 - crescent.value) * -12}deg` },
    ],
  }));
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_C * (1 - ring.value),
  }));
  const copyStyle = useAnimatedStyle(() => ({
    opacity: copy.value,
    transform: [{ translateY: (1 - copy.value) * 16 }],
  }));

  const firstName = name?.trim().split(/\s+/)[0];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={[styles.backdrop, { paddingBottom: insets.bottom + 28 }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss celebration"
      >
        <View style={styles.stage} pointerEvents="none">
          <Animated.View style={[styles.fill, bloomStyle]}>
            <Svg width={STAGE} height={STAGE} viewBox={`0 0 ${STAGE} ${STAGE}`}>
              <Defs>
                <RadialGradient id="celBloom" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={gold} stopOpacity="0.34" />
                  <Stop offset="0.45" stopColor={emerald} stopOpacity="0.12" />
                  <Stop offset="1" stopColor={gold} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={CENTER}
                fill="url(#celBloom)"
              />
            </Svg>
          </Animated.View>

          {Array.from({ length: EMBER_COUNT }, (_, i) => (
            <Ember key={i} index={i} gold={gold} emerald={emerald} />
          ))}

          <Svg
            width={STAGE}
            height={STAGE}
            viewBox={`0 0 ${STAGE} ${STAGE}`}
            style={styles.fill}
          >
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RING_R + 14}
              stroke={gold}
              strokeOpacity={0.16}
              strokeWidth={1}
              strokeDasharray="2 8"
              fill="none"
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RING_R}
              stroke={gold}
              strokeOpacity={0.12}
              strokeWidth={2.5}
              fill="none"
            />
            <AnimatedCircle
              cx={CENTER}
              cy={CENTER}
              r={RING_R}
              stroke={gold}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={`${RING_C} ${RING_C}`}
              animatedProps={ringProps}
              fill="none"
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
            />
          </Svg>

          {Array.from({ length: 5 }, (_, i) => (
            <PrayerNode key={i} index={i} active={visible} gold={gold} />
          ))}

          <Animated.View style={crescentStyle}>
            <Svg width={104} height={104} viewBox="0 0 104 104">
              <Defs>
                <RadialGradient id="celCrescentGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={gold} stopOpacity="0.28" />
                  <Stop offset="1" stopColor={gold} stopOpacity="0" />
                </RadialGradient>
                <Mask id="celCrescent">
                  <Circle cx="46" cy="52" r="30" fill="#fff" />
                  <Circle cx="59" cy="49" r="27" fill="#000" />
                </Mask>
              </Defs>
              <Circle cx="52" cy="52" r="52" fill="url(#celCrescentGlow)" />
              <Circle
                cx="46"
                cy="52"
                r="30"
                fill={gold}
                mask="url(#celCrescent)"
              />
              <Path
                d="M74 30l1.9 5.5 5.8.1-4.6 3.4 1.7 5.5L74 46.6l-4.8 3.4 1.7-5.5-4.6-3.4 5.8-.1z"
                fill={gold}
              />
            </Svg>
          </Animated.View>
        </View>

        <Animated.View style={[styles.copy, copyStyle]}>
          <Text style={[styles.mashaAllah, { color: gold }]}>MashaAllah</Text>
          <Text style={[styles.title, { color: theme.onGradient }]}>
            {firstName
              ? `${firstName}, you've prayed all five today`
              : "You've prayed all five today"}
          </Text>
          <Text
            style={[
              NuraiType.body,
              styles.sub,
              { color: theme.onGradientMuted },
            ]}
          >
            May Allah accept your salah and keep your heart steadfast.
            {streakDays && streakDays > 1 ? ` ${streakDays} days strong.` : ""}
          </Text>
        </Animated.View>

        <View style={styles.actions}>
          <NuraiButton label="Alhamdulillah" icon="check" onPress={onClose} />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(3,7,12,0.94)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 30,
  },
  stage: {
    width: STAGE,
    height: STAGE,
    alignItems: "center",
    justifyContent: "center",
  },
  fill: { position: "absolute" },
  node: { position: "absolute" },
  ember: { position: "absolute" },
  copy: {
    alignItems: "center",
    gap: 10,
  },
  mashaAllah: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0.3,
  },
  title: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 18,
    lineHeight: 25,
    textAlign: "center",
  },
  sub: {
    textAlign: "center",
    lineHeight: 22,
  },
  actions: {
    alignSelf: "stretch",
    paddingHorizontal: 8,
  },
});
