import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  G,
  Mask,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

// NurAI's living "face" — an aurora core with a crescent of noor, a slow
// counter-rotating dashed ring, orbiting points. Rendered with react-native-svg
// so it feels native, and animated on the UI thread.

export function NurAIPresence({ size = 168 }: { size?: number }) {
  const spin = useSharedValue(0);
  const spin2 = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(1, { duration: 48000, easing: Easing.linear }),
      -1,
      false,
    );
    spin2.value = withRepeat(
      withTiming(1, { duration: 34000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [spin, spin2]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));
  const midStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin2.value * -360}deg` }],
  }));

  const box = { position: "absolute" as const, width: size, height: size };

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* soft aura */}
      <Svg width={size} height={size} viewBox="0 0 184 184" style={box}>
        <Defs>
          <RadialGradient id="npAura" cx="50%" cy="46%" r="52%">
            <Stop offset="0" stopColor="#56B394" stopOpacity={0.4} />
            <Stop offset="0.44" stopColor="#EBCE93" stopOpacity={0.1} />
            <Stop offset="1" stopColor="#56B394" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="92" cy="92" r="92" fill="url(#npAura)" />
      </Svg>

      {/* outer dashed ring (slow) */}
      <Animated.View style={[box, outerStyle]}>
        <Svg width={size} height={size} viewBox="0 0 184 184">
          <Circle
            cx="92"
            cy="92"
            r="84"
            stroke="#EBCE93"
            strokeOpacity={0.32}
            strokeWidth={1}
            strokeDasharray="1.5 11"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* mid emerald arc (counter) */}
      <Animated.View style={[box, midStyle]}>
        <Svg width={size} height={size} viewBox="0 0 184 184">
          <Circle
            cx="92"
            cy="92"
            r="68"
            stroke="#56B394"
            strokeOpacity={0.55}
            strokeWidth={1.5}
            strokeDasharray="64 350"
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx="92" cy="24" r="3.6" fill="#54F0C6" />
        </Svg>
      </Animated.View>

      {/* core + crescent */}
      <Svg width={size} height={size} viewBox="0 0 184 184" style={box}>
        <Defs>
          <RadialGradient id="npCore" cx="50%" cy="42%" r="56%">
            <Stop offset="0" stopColor="#37E7B4" stopOpacity={0.5} />
            <Stop offset="0.52" stopColor="#12735A" stopOpacity={0.32} />
            <Stop offset="1" stopColor="#0A1620" stopOpacity={0.9} />
          </RadialGradient>
          <Mask id="npCres">
            <Circle cx="88" cy="94" r="22" fill="#fff" />
            <Circle cx="99" cy="90" r="19" fill="#000" />
          </Mask>
        </Defs>
        <Circle
          cx="92"
          cy="92"
          r="53"
          stroke="#EBCE93"
          strokeOpacity={0.2}
          strokeWidth={1}
          fill="none"
        />
        <Circle cx="150" cy="74" r="2.4" fill="#EBCE93" opacity={0.85} />
        <Circle cx="40" cy="104" r="1.8" fill="#54F0C6" opacity={0.8} />
        <Circle cx="92" cy="92" r="42" fill="url(#npCore)" />
        <G mask="url(#npCres)">
          <Circle cx="88" cy="94" r="22" fill="#F6E2B4" />
        </G>
        <Path
          d="M106 74l1.6 4.6 4.8.1-3.9 2.9 1.4 4.6L106 83.3l-3.9 2.9 1.4-4.6-3.9-2.9 4.8-.1z"
          fill="#F6E2B4"
        />
      </Svg>
    </View>
  );
}
