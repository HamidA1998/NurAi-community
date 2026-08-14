export const NuraiSpace = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 64,
} as const;

export const NuraiRadius = {
  small: 8,
  control: 12,
  card: 16,
  large: 20,
  pill: 999,
} as const;

export const NuraiType = {
  display: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
    letterSpacing: 0,
  },
  largeTitle: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700" as const,
    letterSpacing: 0,
  },
  sectionTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
    letterSpacing: 0,
  },
  body: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },
  bodySmall: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },
  overline: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600" as const,
    letterSpacing: 0,
  },
  metric: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600" as const,
    letterSpacing: 0,
  },
  arabic: {
    fontFamily: "NotoNaskhArabic_500Medium",
    fontSize: 26,
    lineHeight: 42,
    letterSpacing: 0,
  },
  quran: {
    fontFamily: "AmiriQuran_400Regular",
    fontSize: 29,
    lineHeight: 48,
    letterSpacing: 0,
  },
} as const;

export const NuraiMotion = {
  micro: 150,
  standard: 220,
  entrance: 300,
  easing: {
    standard: [0.2, 0, 0, 1],
    emphasized: [0.2, 0, 0, 1],
  },
} as const;

/**
 * Shared Reanimated `withSpring` presets — pick one instead of calling
 * `.springify()` bare or hand-picking damping/stiffness per screen. Only
 * `celebration` is meant to visibly overshoot; the rest settle without a
 * bounce, matching the calm "Quiet Intelligence" motion language. Pass
 * directly: `withSpring(1, NuraiSpring.gentle)`.
 */
export const NuraiSpring = {
  /** Press feedback, small scale/opacity changes — no overshoot. */
  gentle: { damping: 22, stiffness: 210, mass: 0.9 },
  /** Tab/nav state changes, sheet-adjacent motion — a touch livelier,
   * still critically damped. */
  responsive: { damping: 18, stiffness: 260, mass: 0.7 },
  /** The one intentional exception — achievement/streak/prayer-completion
   * moments, where a small bounce reads as delight, not jank. */
  celebration: { damping: 9, stiffness: 160, mass: 0.6 },
} as const;

export const NuraiTouch = {
  minimum: 44,
  comfortable: 48,
} as const;
