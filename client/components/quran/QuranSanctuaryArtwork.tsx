import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

export function QuranSanctuaryArtwork({
  emerald,
  gold,
  style,
}: {
  emerald: string;
  gold: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View pointerEvents="none" style={[styles.artwork, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 250">
        <Defs>
          <RadialGradient id="quran-sanctuary-glow" cx="50%" cy="42%" r="58%">
            <Stop offset="0" stopColor={emerald} stopOpacity={0.24} />
            <Stop offset="0.55" stopColor={emerald} stopOpacity={0.07} />
            <Stop offset="1" stopColor={emerald} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="180" cy="115" r="112" fill="url(#quran-sanctuary-glow)" />
        <Path
          d="M68 224V112C68 59 112 16 180 16s112 43 112 96v112"
          fill="none"
          stroke={gold}
          strokeOpacity={0.2}
          strokeWidth="1"
        />
        <Path
          d="M93 224V119c0-44 34-79 87-90 53 11 87 46 87 90v105"
          fill="none"
          stroke={emerald}
          strokeOpacity={0.3}
          strokeWidth="1.2"
        />
        <Path
          d="M119 224V127c0-34 24-62 61-75 37 13 61 41 61 75v97"
          fill="none"
          stroke={gold}
          strokeOpacity={0.24}
          strokeWidth="1"
        />
        <G transform="translate(180 76)">
          <Path
            d="M0-18 5-7 17-7 8 1 12 13 0 7-12 13-8 1-17-7-5-7Z"
            fill={gold}
            fillOpacity={0.2}
            stroke={gold}
            strokeOpacity={0.65}
            strokeWidth="0.8"
          />
          <Circle r="3" fill={gold} fillOpacity={0.85} />
        </G>
        <Path
          d="M124 193c23-14 42-18 56-8 14-10 33-6 56 8-20-3-38 1-56 15-18-14-36-18-56-15Z"
          fill={emerald}
          fillOpacity={0.11}
          stroke={emerald}
          strokeOpacity={0.48}
          strokeWidth="1.1"
        />
        <Path
          d="M180 185v23"
          stroke={gold}
          strokeOpacity={0.48}
          strokeWidth="1"
        />
        {[44, 86, 274, 316].map((cx, index) => (
          <Circle
            key={cx}
            cx={cx}
            cy={index % 2 === 0 ? 137 : 177}
            r="1.8"
            fill={gold}
            fillOpacity={0.45}
          />
        ))}
      </Svg>
    </View>
  );
}

export function QuranVerseRosette({
  color,
  size = 38,
}: {
  color: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <G transform="translate(20 20)">
        <Path
          d="M0-18 5-12 13-13 14-5 20 0 14 5 13 13 5 12 0 18-5 12-13 13-14 5-20 0-14-5-13-13-5-12Z"
          fill={color}
          fillOpacity={0.1}
          stroke={color}
          strokeOpacity={0.72}
          strokeWidth="1"
        />
        <Circle r="12" fill="none" stroke={color} strokeOpacity={0.3} />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  artwork: {
    position: "absolute",
    inset: 0,
  },
});
