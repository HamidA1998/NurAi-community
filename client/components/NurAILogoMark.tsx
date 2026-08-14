import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

interface NurAILogoMarkProps {
  size?: number;
  borderRadius?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  /** Kept for existing call sites; both styles apply to the vector frame. */
  fallbackStyle?: StyleProp<ViewStyle>;
}

/**
 * The compact NurAI identity mark used inside the product.
 *
 * This is intentionally not the App Store icon shrunk into a control. The
 * crescent, guided path and N-shaped doorway remain legible at 16-54pt and
 * inherit the semantic accent supplied by the surrounding screen.
 */
export function NurAILogoMark({
  size = 32,
  borderRadius = 10,
  color = "#56B394",
  style,
  fallbackStyle,
}: NurAILogoMarkProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius,
        },
        fallbackStyle,
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 32 32" pointerEvents="none">
        <Rect
          x="0.75"
          y="0.75"
          width="30.5"
          height="30.5"
          rx="9.25"
          fill={color}
          fillOpacity={0.12}
          stroke={color}
          strokeOpacity={0.34}
          strokeWidth="1.5"
        />
        <Path
          d="M16 3.5C10 4.5 5.5 9.5 5.5 15.5C5.5 22 10 27 16.5 28C12 25.5 10 21 10.5 16.5C11 11 14.5 7 19.5 5.5C18.5 4.25 17.25 3.55 16 3.5Z"
          fill="#CFAE69"
        />
        <Path
          d="M12.5 23V9L22 23V9"
          fill="none"
          stroke="#F3F0E8"
          strokeWidth="2.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M7 19C13 25.5 23.5 26 28.5 16.5"
          fill="none"
          stroke={color}
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <Circle cx="27" cy="7" r="0.9" fill="#CFAE69" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
