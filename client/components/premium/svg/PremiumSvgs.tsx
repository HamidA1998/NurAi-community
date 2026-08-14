import React, { memo } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

interface SvgProps {
  size?: number;
  color?: string;
  accentColor?: string;
  opacity?: number;
  style?: ViewStyle;
  visible?: boolean;
  /** Gold corner accent — reserved for premium/achievement/sacred-highlight
   * contexts. Off by default so gold never becomes the default treatment. */
  accented?: boolean;
}

export const IslamicPatternBackground = memo(function IslamicPatternBackground({
  color = "#D6A84F",
  opacity = 0.026,
  style,
  visible = false,
}: SvgProps) {
  if (!visible) return null;

  const softOpacity = Math.min(opacity * 1.4, 0.014);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, style]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
      >
        <G opacity={softOpacity}>
          <Circle cx="328" cy="92" r="132" fill={color} />
          <Circle cx="28" cy="520" r="168" fill={color} />
          <Circle cx="332" cy="760" r="116" fill={color} />
        </G>
      </Svg>
    </View>
  );
});

export const GeometricCardPattern = memo(function GeometricCardPattern({
  color = "#D6A84F",
  opacity = 0.045,
  style,
  visible = false,
}: SvgProps) {
  if (!visible) return null;

  const softOpacity = Math.min(opacity, 0.012);
  return (
    <View pointerEvents="none" style={[styles.cardPattern, style]}>
      <Svg width="180" height="180" viewBox="0 0 180 180">
        <G opacity={softOpacity}>
          <Circle cx="136" cy="44" r="64" fill={color} />
          <Circle cx="162" cy="118" r="26" fill={color} />
        </G>
      </Svg>
    </View>
  );
});

export const GoldDivider = memo(function GoldDivider({
  color = "#D6A84F",
  opacity = 0.75,
  style,
}: SvgProps) {
  return (
    <View pointerEvents="none" style={style}>
      <Svg
        width="100%"
        height="12"
        viewBox="0 0 320 12"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="goldDivider" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity="0" />
            <Stop
              offset="0.5"
              stopColor={color}
              stopOpacity={String(opacity)}
            />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path
          d="M0 6 H138 L160 2 L182 6 H320"
          stroke="url(#goldDivider)"
          strokeWidth="1.4"
          fill="none"
        />
      </Svg>
    </View>
  );
});

export const CrescentMark = memo(function CrescentMark({
  size = 32,
  color = "#D6A84F",
  accentColor = "#10B981",
  opacity = 1,
}: SvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <G opacity={opacity}>
        <Path
          d="M31.8 6.8C22.2 8.6 15 17 15 27c0 7.1 3.6 13.3 9.1 17C13.3 42.7 5 33.5 5 22.4 5 11.8 13 3.2 23.3 2.1c3.3-.3 6.2.3 8.5 1.4Z"
          fill={color}
        />
        <Path
          d="m35.7 12.2 1.8 5.4h5.7l-4.6 3.3 1.8 5.4-4.7-3.4-4.6 3.4 1.8-5.4-4.6-3.3h5.7Z"
          fill={accentColor}
        />
      </G>
    </Svg>
  );
});

/**
 * Bold, filled silhouette shell for the promoted product-identity marks.
 * Each icon is a solid shape (not a thin uniform outline) so it reads with
 * real visual weight at 16-24px inline sizes, with a slim gold accent
 * reserved for the sacred/premium detail on each mark — never the whole
 * glyph. Distinct from `Shell` in NurAiCustomIcons.tsx (geometric marks
 * that work better as line art); this shell is for figurative/object
 * marks (books, architecture, beads) where a filled silhouette reads
 * clearer than an outline at small sizes.
 */
function SolidIcon({
  size = 32,
  opacity = 1,
  children,
}: SvgProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" opacity={opacity}>
      {children}
    </Svg>
  );
}

export const QuranIconSvg = memo((props: SvgProps) => (
  <SolidIcon {...props}>
    <Path
      d="M5.8 11.7c6.5-1.55 12.55-.1 18.2 4.35v23.1c-5.35-3.7-11.4-5.05-18.2-3.5Z"
      fill="none"
      stroke={props.color || "#56B394"}
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M42.2 11.7c-6.5-1.55-12.55-.1-18.2 4.35v23.1c5.35-3.7 11.4-5.05 18.2-3.5Z"
      fill="none"
      stroke={props.color || "#56B394"}
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M24 16.05v23.1"
      stroke={props.color || "#56B394"}
      strokeWidth="2.4"
      strokeLinecap="round"
      opacity="0.78"
    />
    <Path
      d="M10.1 17.25c3.55-.35 6.65.35 9.35 2.1M10.1 22.85c3.55-.35 6.65.35 9.35 2.1M37.9 17.25c-3.55-.35-6.65.35-9.35 2.1M37.9 22.85c-3.55-.35-6.65.35-9.35 2.1"
      fill="none"
      stroke={props.color || "#56B394"}
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.48"
    />
    <Path
      d="M5.8 39.55c6.7-1.45 12.75-.15 18.2 3.25 5.45-3.4 11.5-4.7 18.2-3.25"
      fill="none"
      stroke={
        props.accented
          ? props.accentColor || "#CFAE69"
          : props.color || "#56B394"
      }
      strokeWidth="2.4"
      strokeLinecap="round"
      opacity={props.accented ? 0.95 : 0.68}
    />
  </SolidIcon>
));

export const PrayerIconSvg = memo((props: SvgProps) => (
  <SolidIcon {...props}>
    <Path
      d="M24 6c7.5 3.4 12.5 9.6 12.5 18.4V38h-25V24.4C11.5 15.6 16.5 9.4 24 6Z"
      fill={props.color || "#34D399"}
    />
    <Path
      d="M18.5 38v-9a5.5 5.5 0 0 1 11 0v9"
      fill="none"
      stroke="#0B120F"
      strokeOpacity="0.3"
      strokeWidth="1.6"
    />
    <Circle cx="24" cy="7.5" r="2.2" fill={props.accentColor || "#D6A84F"} />
    <Path
      d="M8 38h32"
      stroke={props.accentColor || "#D6A84F"}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </SolidIcon>
));

export const QiblaIconSvg = memo((props: SvgProps) => (
  <SolidIcon {...props}>
    <Circle
      cx="24"
      cy="24"
      r="16.5"
      fill="none"
      stroke={props.color || "#34D399"}
      strokeWidth="2.4"
      opacity="0.85"
    />
    <Path d="M24 11 29 27 24 23.5 19 27Z" fill={props.color || "#34D399"} />
    <Rect
      x="21.2"
      y="8.4"
      width="5.6"
      height="5.6"
      rx="1"
      fill={props.accentColor || "#D6A84F"}
      transform="rotate(45 24 11.2)"
    />
  </SolidIcon>
));

export const ArabicIconSvg = memo((props: SvgProps) => (
  <SolidIcon {...props}>
    <Path
      d="M11 30c3.5 5 8 7.5 12.5 7.5 5.5 0 10-3.4 12-8.4-2.6 2.6-6.6 4.2-11 4.2-5.6 0-10.3-2.6-13.5-3.3Z"
      fill={props.color || "#34D399"}
    />
    <Path
      d="M13 19c2.4 3.6 6.6 5.6 11 5.6s8.6-2 11-5.6c-2.2 1.2-6 2-11 2s-8.8-.8-11-2Z"
      fill={props.color || "#34D399"}
      opacity="0.8"
    />
    <Circle cx="24" cy="12" r="2.4" fill={props.accentColor || "#D6A84F"} />
  </SolidIcon>
));

export const AIIconSvg = memo((props: SvgProps) => (
  <SolidIcon {...props}>
    <Path
      d="M24 5.25C15 6.75 8.25 14.25 8.25 23.25C8.25 33 15 40.5 24.75 42C18 38.25 15 31.5 15.75 24.75C16.5 16.5 21.75 10.5 29.25 8.25C27.75 6.375 25.875 5.325 24 5.25Z"
      fill={props.accentColor || "#CFAE69"}
    />
    <Path
      d="M18.75 34.5V13.5L33 34.5V13.5"
      fill="none"
      stroke="#F3F0E8"
      strokeWidth="4.05"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10.5 28.5C19.5 38.25 35.25 39 42.75 24.75"
      fill="none"
      stroke={props.color || "#56B394"}
      strokeWidth="3.15"
      strokeLinecap="round"
    />
    <Circle
      cx="40.5"
      cy="10.5"
      r="1.35"
      fill={props.accentColor || "#CFAE69"}
    />
  </SolidIcon>
));

export const HifzIconSvg = memo((props: SvgProps) => (
  <SolidIcon {...props}>
    <Path d="M10 10h18v28l-9-5.5-9 5.5Z" fill={props.color || "#34D399"} />
    <Path
      d="M14.5 17h9M14.5 22.5h6"
      stroke="#0B120F"
      strokeOpacity="0.3"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <Path
      d="M33 21a7 7 0 1 1 4.8-12.1"
      fill="none"
      stroke={props.accentColor || "#D6A84F"}
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <Path d="m37.5 8.5.5 4-4-1Z" fill={props.accentColor || "#D6A84F"} />
  </SolidIcon>
));

export const TasbeehIconSvg = memo((props: SvgProps) => {
  const beadColor = props.color || "#34D399";
  const gold = props.accentColor || "#D6A84F";
  const beads = [
    [24, 8],
    [33, 11],
    [39, 19],
    [39, 29],
    [33, 37],
    [15, 37],
    [9, 29],
    [9, 19],
    [15, 11],
  ] as const;
  return (
    <SolidIcon {...props}>
      {beads.map(([cx, cy], i) => (
        <Circle
          key={i}
          cx={cx}
          cy={cy}
          r={i === 0 ? 4.4 : 3.4}
          fill={i === 0 ? gold : beadColor}
        />
      ))}
      <Path d="M24 37c0 4-1.6 6.5-1.6 6.5h3.2S24 41 24 37Z" fill={gold} />
    </SolidIcon>
  );
});

export const DuaIconSvg = memo((props: SvgProps) => (
  <SolidIcon {...props}>
    <Path
      d="M24 35 15 12c6 2 9 6 9 6s3-4 9-6Z"
      fill={props.color || "#34D399"}
    />
    <Circle cx="18" cy="9" r="1.8" fill={props.accentColor || "#D6A84F"} />
    <Circle cx="24" cy="6" r="2.2" fill={props.accentColor || "#D6A84F"} />
    <Circle cx="30" cy="9" r="1.8" fill={props.accentColor || "#D6A84F"} />
  </SolidIcon>
));

export const HadithIconSvg = memo((props: SvgProps) => (
  <SolidIcon {...props}>
    <Path
      d="M12 10h20a3 3 0 0 1 3 3v25H15a3 3 0 0 1-3-3Z"
      fill={props.color || "#34D399"}
    />
    <Rect
      x="12"
      y="10"
      width="4.5"
      height="28"
      rx="1.4"
      fill="#0B120F"
      opacity="0.22"
    />
    <Path
      d="M21 18h10M21 24h10M21 30h6"
      stroke={props.accentColor || "#D6A84F"}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </SolidIcon>
));

export const FamilyIconSvg = memo((props: SvgProps) => (
  <SolidIcon {...props}>
    <Path
      d="M24 7 8 19v2h4v17h10V28h4v10h10V21h4v-2Z"
      fill={props.color || "#34D399"}
    />
    <Path
      d="M20.5 38v-6a3.5 3.5 0 0 1 7 0v6Z"
      fill={props.accentColor || "#D6A84F"}
    />
  </SolidIcon>
));

export const CommunityIconSvg = memo((props: SvgProps) => (
  <SolidIcon {...props}>
    <Circle
      cx="16"
      cy="17"
      r="6"
      fill={props.color || "#34D399"}
      opacity="0.92"
    />
    <Circle
      cx="32"
      cy="17"
      r="6"
      fill={props.color || "#34D399"}
      opacity="0.92"
    />
    <Path
      d="M6 38c1.8-8.4 8-12 10-12s8.2 3.6 10 12Z"
      fill={props.color || "#34D399"}
    />
    <Path
      d="M22 38c1.8-8.4 8-12 10-12s8.2 3.6 10 12Z"
      fill={props.color || "#34D399"}
      opacity="0.82"
    />
    <Path
      d="M20 42c1.4-2.4 2.6-3.4 4-3.4s2.6 1 4 3.4c1.4-2.4 2.6-3.4 4-3.4"
      fill="none"
      stroke={props.accentColor || "#D6A84F"}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </SolidIcon>
));

export const FinanceIconSvg = memo((props: SvgProps) => (
  <SolidIcon {...props}>
    <Circle
      cx="20"
      cy="27"
      r="11"
      fill={props.color || "#34D399"}
      opacity="0.55"
    />
    <Circle cx="27" cy="21" r="11" fill={props.color || "#34D399"} />
    <Path
      d="M27 14.5v13M23.2 17.2c0-1.6 1.7-2.4 3.8-2.4s3.8.9 3.8 2.2c0 3.2-7.6 1.6-7.6 4.8 0 1.4 1.7 2.3 3.8 2.3s3.8-.8 3.8-2.4"
      fill="none"
      stroke={props.accentColor || "#D6A84F"}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </SolidIcon>
));

export const ScholarCrownSvg = memo((props: SvgProps) => (
  <Svg width={props.size || 34} height={props.size || 34} viewBox="0 0 48 48">
    <Path
      d="M8 18l9 8 7-14 7 14 9-8-4 20H12Z"
      fill={props.color || "#D6A84F"}
      opacity={props.opacity ?? 1}
    />
    <Path
      d="M13 38h22"
      stroke="#170F05"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
));

export const PremiumLockSvg = memo((props: SvgProps) => (
  <Svg width={props.size || 34} height={props.size || 34} viewBox="0 0 48 48">
    <Rect
      x="12"
      y="21"
      width="24"
      height="18"
      rx="6"
      fill={props.color || "#D6A84F"}
      opacity={props.opacity ?? 1}
    />
    <Path
      d="M17 21v-4a7 7 0 0 1 14 0v4"
      fill="none"
      stroke={props.accentColor || "#10B981"}
      strokeWidth="3"
      strokeLinecap="round"
    />
  </Svg>
));

export const AchievementBadgeSvg = memo((props: SvgProps) => (
  <Svg width={props.size || 42} height={props.size || 42} viewBox="0 0 48 48">
    <Path
      d="M24 4 38 12v13c0 9-6 15-14 19C16 40 10 34 10 25V12Z"
      fill={props.color || "#10B981"}
      opacity="0.95"
    />
    <Path
      d="m17 24 5 5 10-12"
      fill="none"
      stroke={props.accentColor || "#F5C76B"}
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
));

export const StreakGardenSvg = memo((props: SvgProps) => (
  <Svg width={props.size || 52} height={props.size || 52} viewBox="0 0 64 64">
    <Path
      d="M32 54V32"
      stroke={props.color || "#34D399"}
      strokeWidth="4"
      strokeLinecap="round"
    />
    <Path
      d="M32 34c-12-1-18-8-18-19 11 0 18 7 18 19ZM33 36c12-2 18-9 17-21-11 1-17 9-17 21Z"
      fill={props.color || "#34D399"}
      opacity="0.9"
    />
    <Circle cx="32" cy="18" r="6" fill={props.accentColor || "#D6A84F"} />
  </Svg>
));

export const EmptyMosqueSvg = memo((props: SvgProps) => (
  <Svg width={props.size || 96} height={props.size || 96} viewBox="0 0 96 96">
    <Path
      d="M18 78V43c0-15 14-25 30-32 16 7 30 17 30 32v35"
      fill="none"
      stroke={props.color || "#34D399"}
      strokeWidth="3"
    />
    <Path
      d="M34 78V55a14 14 0 0 1 28 0v23"
      fill="none"
      stroke={props.accentColor || "#D6A84F"}
      strokeWidth="3"
    />
    <Path
      d="M10 78h76"
      stroke={props.color || "#34D399"}
      strokeWidth="3"
      strokeLinecap="round"
    />
  </Svg>
));

QuranIconSvg.displayName = "QuranIconSvg";
PrayerIconSvg.displayName = "PrayerIconSvg";
QiblaIconSvg.displayName = "QiblaIconSvg";
ArabicIconSvg.displayName = "ArabicIconSvg";
AIIconSvg.displayName = "AIIconSvg";
HifzIconSvg.displayName = "HifzIconSvg";
TasbeehIconSvg.displayName = "TasbeehIconSvg";
DuaIconSvg.displayName = "DuaIconSvg";
HadithIconSvg.displayName = "HadithIconSvg";
FamilyIconSvg.displayName = "FamilyIconSvg";
CommunityIconSvg.displayName = "CommunityIconSvg";
FinanceIconSvg.displayName = "FinanceIconSvg";
ScholarCrownSvg.displayName = "ScholarCrownSvg";
PremiumLockSvg.displayName = "PremiumLockSvg";
AchievementBadgeSvg.displayName = "AchievementBadgeSvg";
StreakGardenSvg.displayName = "StreakGardenSvg";
EmptyMosqueSvg.displayName = "EmptyMosqueSvg";

const styles = StyleSheet.create({
  cardPattern: {
    position: "absolute",
    right: -46,
    top: -54,
  },
});
