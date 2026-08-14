import {
  BorderRadius,
  Fonts,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";

export const PremiumTheme = {
  spacing: {
    screenX: Spacing.xl,
    screenTop: Spacing.md,
    sectionGap: Spacing["3xl"],
    cardGap: Spacing.md,
    cardPadding: Spacing.xl,
    compactCardPadding: Spacing.lg,
    bottomNavClearance: 112,
  },
  radius: {
    card: BorderRadius.xl,
    hero: BorderRadius["2xl"],
    control: BorderRadius.lg,
    sheet: BorderRadius["2xl"],
    pill: BorderRadius.full,
  },
  border: {
    hairline: 1,
    active: 1.5,
    strong: 2,
  },
  icon: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 26,
    xl: 34,
  },
  touch: {
    min: 44,
    compact: 38,
    hero: 56,
  },
  opacity: {
    pattern: 0.055,
    patternStrong: 0.09,
    disabled: 0.48,
    pressed: 0.78,
  },
  typography: {
    hero: Typography.hero,
    title: Typography.h1,
    section: Typography.h3,
    cardTitle: Typography.h4,
    body: Typography.body,
    small: Typography.small,
    caption: Typography.caption,
    eyebrow: {
      fontSize: 10,
      lineHeight: 14,
      fontFamily: Fonts.sansBold,
      fontWeight: "700" as const,
      letterSpacing: 1.6,
      textTransform: "uppercase" as const,
    },
    arabicLarge: {
      fontSize: 30,
      lineHeight: 56,
      fontFamily: "AmiriQuran_400Regular",
      fontWeight: "400" as const,
      writingDirection: "rtl" as const,
      textAlign: "right" as const,
    },
  },
  elevation: {
    glass: Shadows.softCard,
    raised: Shadows.cardElevated,
    action: Shadows.glowPrimary,
  },
  gradients: {
    emerald: ["#064E3B", "#065F46", "#0D9488"] as const,
    scholar: ["#3B2B12", "#7C5B20", "#D6A84F"] as const,
    night: ["#050A12", "#0B1323", "#111C2F"] as const,
  },
} as const;

export type PremiumTone =
  | "default"
  | "emerald"
  | "scholar"
  | "danger"
  | "muted";
