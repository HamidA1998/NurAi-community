import type { ThemeColors } from "@/constants/theme";

export const iconSizes = {
  xs: 16,
  sm: 18,
  md: 20,
  standard: 24,
  lg: 28,
  xl: 32,
  feature: 40,
  hero: 48,
} as const;

export type IconSizeToken = keyof typeof iconSizes;

export const iconStrokeWidths = {
  thin: 1.5,
  regular: 1.75,
  medium: 2,
  semibold: 2.25,
} as const;

export type IconWeight = "thin" | "regular" | "medium" | "semibold" | "fill";

/** Phosphor only ships thin/light/regular/bold/fill/duotone — collapse our
 * 5-step weight scale onto the nearest Phosphor weight. Custom NurAI SVGs
 * use `iconStrokeWidths` directly instead, since they draw their own paths. */
export const PHOSPHOR_WEIGHT: Record<
  IconWeight,
  "thin" | "regular" | "bold" | "fill"
> = {
  thin: "thin",
  regular: "regular",
  medium: "regular",
  semibold: "bold",
  fill: "fill",
};

export type IconState =
  | "default"
  | "active"
  | "disabled"
  | "premium"
  | "destructive";

export type IconContainer =
  | "none"
  | "glass"
  | "soft"
  | "solid"
  | "premiumGlass"
  | "featureGlass"
  | "destructiveSoft";

/** Resolve the semantic foreground color for an icon from the live theme —
 * never a hardcoded hex at the call site. Emerald is the default/active
 * language; gold is reserved for `premium` state only. */
export function resolveIconColor(
  theme: ThemeColors,
  state: IconState = "default",
  explicit?: string,
): string {
  if (explicit) return explicit;
  switch (state) {
    case "active":
      return theme.primary;
    case "disabled":
      return theme.disabled;
    case "premium":
      return theme.scholar;
    case "destructive":
      return theme.error;
    default:
      return theme.icon;
  }
}

export const iconContainerSizes = {
  xs: 32,
  sm: 36,
  md: 40,
  lg: 44,
  xl: 48,
  "2xl": 56,
} as const;

export const ICON_MIN_TOUCH_TARGET = 44;

/** Container background/border per `IconContainer` variant. Radius stays
 * consistent (pill-leaning, matches NuraiGlass), padding stays balanced,
 * no heavy glow/neon — see DESIGN.md "Quiet Intelligence". */
export function resolveContainerStyle(
  theme: ThemeColors,
  container: IconContainer,
): { backgroundColor?: string; borderColor?: string; borderWidth?: number } {
  switch (container) {
    case "glass":
      return {
        backgroundColor: theme.surfaceGlass,
        borderColor: theme.borderSubtle,
        borderWidth: StyleSheetHairline,
      };
    case "soft":
      return { backgroundColor: theme.primarySoft };
    case "solid":
      return { backgroundColor: theme.surfaceElevated };
    case "premiumGlass":
      return {
        backgroundColor: theme.scholarSoft,
        borderColor: "rgba(207,174,105,0.24)",
        borderWidth: StyleSheetHairline,
      };
    case "featureGlass":
      return {
        backgroundColor: theme.primaryMuted,
        borderColor: theme.primaryBorder,
        borderWidth: StyleSheetHairline,
      };
    case "destructiveSoft":
      return { backgroundColor: "rgba(217,130,124,0.14)" };
    case "none":
    default:
      return {};
  }
}

const StyleSheetHairline = 1;
