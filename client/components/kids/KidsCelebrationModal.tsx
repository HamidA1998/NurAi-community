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
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { NuraiButton, NuraiType } from "@/design-system";
import { AchievementBadgeSvg } from "@/components/premium/svg/PremiumSvgs";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STAGE = 220;
const CENTER = STAGE / 2;
const RING_R = 84;
const RING_C = 2 * Math.PI * RING_R;
const SPARK_COUNT = 10;

/* A small spark bursting outward from the badge on completion. */
function Spark({
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
    const angle = (index / SPARK_COUNT) * Math.PI * 2;
    return {
      angle,
      size: 3 + (index % 3) * 1.6,
      travel: 70 + (index % 4) * 14,
      delay: 260 + index * 55,
      duration: 900 + (index % 3) * 220,
      isGold: index % 2 === 0,
    };
  }, [index]);

  useEffect(() => {
    t.value = withDelay(
      seed.delay,
      withTiming(1, {
        duration: seed.duration,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [t, seed.delay, seed.duration]);

  const style = useAnimatedStyle(() => {
    const fade =
      t.value < 0.2 ? t.value / 0.2 : t.value > 0.6 ? (1 - t.value) / 0.4 : 1;
    return {
      opacity: fade,
      transform: [
        { translateX: Math.cos(seed.angle) * seed.travel * t.value },
        { translateY: Math.sin(seed.angle) * seed.travel * t.value },
        { scale: 0.5 + t.value * 0.7 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.spark,
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

/**
 * A reusable "you did it!" moment for Kids Mode — shown on finishing any
 * quiz, game, or match round. Replaces plain emoji-in-a-card completion
 * text with a short badge/spark animation, matching the same
 * Reanimated+SVG house style as PrayerCompletionCelebration.
 */
export function KidsCelebrationModal({
  visible,
  title,
  subtitle,
  points,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  points?: number;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const gold = theme.scholar;
  const emerald = theme.primary;

  const bloom = useSharedValue(0);
  const ring = useSharedValue(0);
  const badge = useSharedValue(0);
  const copy = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      bloom.value = 0;
      ring.value = 0;
      badge.value = 0;
      copy.value = 0;
      return;
    }
    bloom.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    badge.value = withDelay(
      100,
      withSpring(1, { damping: 9, stiffness: 140, mass: 0.6 }),
    );
    ring.value = withDelay(
      200,
      withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }),
    );
    copy.value = withDelay(
      500,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
  }, [visible, bloom, ring, badge, copy]);

  const bloomStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + bloom.value * 0.35,
    transform: [{ scale: 0.9 + bloom.value * 0.2 }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badge.value,
    transform: [
      { scale: 0.4 + badge.value * 0.6 },
      { rotate: `${(1 - badge.value) * 16}deg` },
    ],
  }));
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_C * (1 - ring.value),
  }));
  const copyStyle = useAnimatedStyle(() => ({
    opacity: copy.value,
    transform: [{ translateY: (1 - copy.value) * 14 }],
  }));

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
        testID="button-kids-celebration-dismiss"
      >
        <View style={styles.stage} pointerEvents="none">
          <Animated.View style={[styles.fill, bloomStyle]}>
            <Svg width={STAGE} height={STAGE} viewBox={`0 0 ${STAGE} ${STAGE}`}>
              <Defs>
                <RadialGradient id="kidsCelBloom" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={gold} stopOpacity="0.32" />
                  <Stop offset="0.45" stopColor={emerald} stopOpacity="0.14" />
                  <Stop offset="1" stopColor={gold} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={CENTER}
                fill="url(#kidsCelBloom)"
              />
            </Svg>
          </Animated.View>

          {Array.from({ length: SPARK_COUNT }, (_, i) => (
            <Spark key={i} index={i} gold={gold} emerald={emerald} />
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
              r={RING_R}
              stroke={gold}
              strokeOpacity={0.14}
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

          <Animated.View style={badgeStyle}>
            <AchievementBadgeSvg size={84} color={emerald} accentColor={gold} />
          </Animated.View>
        </View>

        <Animated.View style={[styles.copy, copyStyle]}>
          <Text style={[styles.title, { color: theme.onGradient }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                NuraiType.body,
                styles.sub,
                { color: theme.onGradientMuted },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
          {typeof points === "number" && points > 0 ? (
            <View style={[styles.pointsPill, { borderColor: gold }]}>
              <Text style={[styles.pointsText, { color: gold }]}>
                +{points} points
              </Text>
            </View>
          ) : null}
        </Animated.View>

        <View style={styles.actions}>
          <NuraiButton label="Continue" icon="check" onPress={onClose} />
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
    gap: 26,
  },
  stage: {
    width: STAGE,
    height: STAGE,
    alignItems: "center",
    justifyContent: "center",
  },
  fill: { position: "absolute" },
  spark: { position: "absolute" },
  copy: {
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
  },
  sub: {
    textAlign: "center",
    lineHeight: 22,
  },
  pointsPill: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  pointsText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
  },
  actions: {
    alignSelf: "stretch",
    paddingHorizontal: 8,
  },
});
