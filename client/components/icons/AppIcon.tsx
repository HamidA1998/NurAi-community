import React, { memo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { NuraiGlass } from "@/design-system/NuraiGlass";
import {
  customIconRegistry,
  isCustomIconName,
  standardIconRegistry,
  type AppIconName,
} from "./iconRegistry";
import {
  ICON_MIN_TOUCH_TARGET,
  PHOSPHOR_WEIGHT,
  iconContainerSizes,
  iconSizes,
  iconStrokeWidths,
  resolveContainerStyle,
  resolveIconColor,
  type IconContainer,
  type IconSizeToken,
  type IconState,
  type IconWeight,
} from "./iconTokens";

export type { AppIconName } from "./iconRegistry";

export interface AppIconProps {
  name: AppIconName;
  /** A token from `iconSizes`, or an exact pixel number for a one-off. */
  size?: IconSizeToken | number;
  /** Overrides the state-derived semantic color. Prefer `state` — this is
   * an escape hatch, not the default path. */
  color?: string;
  weight?: IconWeight;
  state?: IconState;
  container?: IconContainer;
  /** Give standalone semantic icons a label. Icons without a label default to
   * decorative so text-labelled rows and buttons do not create duplicate
   * VoiceOver stops. */
  accessibilityLabel?: string;
  /** Override the inferred decorative state when a rare call site needs it. */
  decorative?: boolean;
  /** Mirror directional icons (arrows, chevrons) for RTL layouts. Leave
   * unset for icons whose meaning doesn't depend on direction. */
  mirrored?: boolean;
  /** Show the gold accent on custom marks that support it — reserve for
   * premium/achievement/sacred-highlight moments (see iconTokens.ts). */
  accented?: boolean;
  style?: StyleProp<ViewStyle>;
}

function resolveSize(size: IconSizeToken | number | undefined): number {
  if (typeof size === "number") return size;
  if (size && size in iconSizes) return iconSizes[size];
  return iconSizes.standard;
}

/**
 * The single entry point for every icon in the app. Standard interface
 * icons render through Phosphor (weight-aware); NurAI product/Islamic
 * marks render through the custom hand-drawn set. Both paths share the
 * same size/color/state/container contract so a `<Shield/>` and a
 * `<QuranIcon/>` sitting side by side always read as one family.
 *
 * See docs/audit/ICON_SYSTEM_AUDIT.md for the migration this replaced.
 */
export const AppIcon = memo(function AppIcon({
  name,
  size,
  color,
  weight = "regular",
  state = "default",
  container = "none",
  accessibilityLabel,
  decorative,
  mirrored = false,
  accented,
  style,
}: AppIconProps) {
  const { theme } = useTheme();
  const numericSize = resolveSize(size);
  const resolvedColor = resolveIconColor(theme, state, color);
  const disabled = state === "disabled";
  const isDecorative = decorative ?? !accessibilityLabel;

  let glyph: React.ReactNode;
  if (isCustomIconName(name)) {
    const Custom = customIconRegistry[name];
    glyph = (
      <Custom
        size={numericSize}
        color={resolvedColor}
        accentColor={theme.scholar}
        strokeWidth={iconStrokeWidths[weight === "fill" ? "regular" : weight]}
        opacity={disabled ? 0.5 : 1}
        accented={accented ?? state === "premium"}
      />
    );
  } else {
    const Standard = standardIconRegistry[name];
    glyph = (
      <Standard
        size={numericSize}
        color={resolvedColor}
        weight={PHOSPHOR_WEIGHT[weight]}
        mirrored={mirrored}
      />
    );
  }

  const a11yProps = isDecorative
    ? {
        accessibilityElementsHidden: true,
        importantForAccessibility: "no-hide-descendants" as const,
      }
    : {
        accessible: true,
        accessibilityRole: "image" as const,
        accessibilityLabel,
      };

  if (container === "none") {
    return (
      <View style={style} {...a11yProps}>
        {glyph}
      </View>
    );
  }

  // The glass surface hugs the glyph, but never renders smaller than the
  // 44pt minimum touch target — this container doubles as the tap area
  // for icon-button call sites.
  const containerStyle = resolveContainerStyle(theme, container);
  const containerSize = Math.max(
    iconContainerSizes.xs,
    numericSize + 16,
    ICON_MIN_TOUCH_TARGET,
  );

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
        },
        style,
      ]}
      {...a11yProps}
    >
      <NuraiGlass
        style={StyleSheet.absoluteFill}
        radius={containerSize / 2}
        pointerEvents="none"
        tint={containerStyle.backgroundColor}
      />
      {containerStyle.borderWidth ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: containerSize / 2,
              borderWidth: containerStyle.borderWidth,
              borderColor: containerStyle.borderColor,
            },
          ]}
        />
      ) : null}
      {glyph}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
