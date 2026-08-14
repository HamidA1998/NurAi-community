import React, { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Aurora, NuraiGlass } from "@/design-system";
import Animated, {
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { PremiumTheme, type PremiumTone } from "@/constants/premiumTheme";
import {
  GeometricCardPattern,
  IslamicPatternBackground,
  PremiumLockSvg,
  ScholarCrownSvg,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

type FeatherName = AppIconName;

function toneColor(theme: any, tone: PremiumTone = "default") {
  if (tone === "emerald") return theme.primary;
  if (tone === "scholar") return theme.scholar;
  if (tone === "danger") return theme.error;
  if (tone === "muted") return theme.textMuted;
  return theme.text;
}

export function PremiumScreen({
  children,
  pattern = false,
  padded = true,
  scroll = false,
  aurora = false,
  style,
  contentContainerStyle,
}: {
  children: ReactNode;
  pattern?: boolean;
  padded?: boolean;
  scroll?: boolean;
  aurora?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const legacyContent = (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={[
          theme.atmosphereTop,
          theme.atmosphereMid,
          theme.atmosphereBottom,
        ]}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        pointerEvents="none"
        style={[
          styles.screenGlow,
          {
            backgroundColor: theme.glowPrimary,
            shadowColor: theme.primary,
          },
        ]}
      />
      {pattern ? (
        <IslamicPatternBackground color={theme.patternColor} opacity={0.008} />
      ) : null}
      {children}
    </>
  );
  const bg = aurora ? "#04060C" : theme.backgroundRoot;

  if (scroll) {
    return (
      <View style={[styles.screen, { backgroundColor: bg }, style]}>
        {aurora ? <Aurora /> : null}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            padded ? styles.screenPadding : null,
            { paddingTop: insets.top + PremiumTheme.spacing.screenTop },
            contentContainerStyle,
          ]}
        >
          {aurora ? children : legacyContent}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: bg, paddingTop: insets.top },
        padded ? styles.screenPadding : null,
        style,
      ]}
    >
      {aurora ? <Aurora /> : null}
      {aurora ? children : legacyContent}
    </View>
  );
}

export function PremiumHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  actionIcon,
  onAction,
  right,
  icon,
  style,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack?: () => void;
  actionIcon?: FeatherName;
  onAction?: () => void;
  right?: ReactNode;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.header, style]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[
            styles.headerCircle,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <AppIcon name="arrow-left" size={20} color={theme.text} />
        </Pressable>
      ) : icon ? (
        <View
          style={[
            styles.headerIconFrame,
            {
              backgroundColor: theme.primarySubtle,
              borderColor: theme.primaryBorder,
            },
          ]}
        >
          {icon}
        </View>
      ) : null}
      <View style={styles.headerText}>
        {eyebrow ? (
          <ThemedText
            style={[styles.eyebrow, { color: theme.primary }]}
            numberOfLines={1}
          >
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText type="h3" numberOfLines={1} style={{ color: theme.text }}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText
            type="caption"
            numberOfLines={2}
            style={{ color: theme.textMuted }}
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right}
      {actionIcon && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={10}
          accessibilityRole="button"
          style={[
            styles.headerCircle,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <AppIcon name={actionIcon} size={19} color={theme.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function PremiumCard({
  children,
  tone = "default",
  accent = false,
  pattern = false,
  onPress,
  style,
  testID,
}: {
  children: ReactNode;
  tone?: PremiumTone;
  accent?: boolean;
  pattern?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const color = toneColor(theme, tone);
  const Wrapper = onPress
    ? Animated.createAnimatedComponent(Pressable)
    : Animated.View;

  return (
    <Wrapper
      testID={testID}
      onPress={onPress}
      onPressIn={onPress ? () => (scale.value = withSpring(0.985)) : undefined}
      onPressOut={onPress ? () => (scale.value = withSpring(1)) : undefined}
      accessibilityRole={onPress ? "button" : undefined}
      style={[
        styles.card,
        {
          backgroundColor: "transparent",
          borderColor: accent ? `${color}55` : theme.surfaceStroke,
          borderLeftColor: accent ? color : theme.surfaceStroke,
          borderLeftWidth: accent ? 3 : 1,
          shadowColor: accent ? color : theme.premiumHighlight,
        },
        !isDark ? Shadows.softCard : null,
        animatedStyle,
        style,
      ]}
    >
      <NuraiGlass
        pointerEvents="none"
        radius={BorderRadius.xl}
        style={StyleSheet.absoluteFillObject}
      />
      {pattern ? <GeometricCardPattern color={color} /> : null}
      {isDark ? <View pointerEvents="none" style={styles.cardSheen} /> : null}
      {children}
    </Wrapper>
  );
}

export function PremiumButton({
  children,
  onPress,
  tone = "emerald",
  variant = "solid",
  icon,
  disabled,
  loading,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  tone?: PremiumTone;
  variant?: "solid" | "glass" | "ghost";
  icon?: FeatherName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const color = toneColor(theme, tone);
  const solidColor =
    tone === "scholar"
      ? theme.scholar
      : tone === "danger"
        ? theme.error
        : theme.primary;
  const isSolid = variant === "solid";
  const gradientColors: [string, string] =
    tone === "scholar"
      ? [theme.scholar, theme.accent ?? theme.scholar]
      : tone === "danger"
        ? [theme.error, theme.error]
        : [theme.gradientStart ?? solidColor, theme.gradientEnd ?? solidColor];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isSolid
            ? "transparent"
            : variant === "glass"
              ? theme.surfaceGlass
              : "transparent",
          borderColor: isSolid ? "transparent" : `${color}40`,
          shadowColor: solidColor,
          overflow: "hidden",
          opacity: disabled
            ? PremiumTheme.opacity.disabled
            : pressed
              ? PremiumTheme.opacity.pressed
              : 1,
        },
        style,
      ]}
    >
      {isSolid ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isSolid ? theme.primaryForeground : color}
        />
      ) : null}
      {!loading && icon ? (
        <AppIcon
          name={icon}
          size={16}
          color={isSolid ? theme.primaryForeground : color}
        />
      ) : null}
      <ThemedText
        style={[
          styles.buttonText,
          { color: isSolid ? theme.primaryForeground : color },
        ]}
      >
        {children}
      </ThemedText>
    </Pressable>
  );
}

export function PremiumSectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionHeaderText}>
        <View style={styles.sectionTitleRow}>
          <View
            style={[styles.sectionAccent, { backgroundColor: theme.primary }]}
          />
          <ThemedText style={[styles.eyebrow, { color: theme.primary }]}>
            {title}
          </ThemedText>
        </View>
        {subtitle ? (
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <ThemedText
            type="caption"
            style={{ color: theme.primary, fontWeight: "800" }}
          >
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PremiumFeatureTile({
  icon,
  title,
  description,
  badge,
  locked,
  progress,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  badge?: string;
  locked?: boolean;
  progress?: number;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <PremiumCard
      onPress={onPress}
      style={styles.featureTile}
      accent={Boolean(badge)}
      tone={locked ? "scholar" : "emerald"}
    >
      <View style={styles.featureTop}>
        <View
          style={[styles.featureIcon, { backgroundColor: theme.primarySubtle }]}
        >
          {icon}
        </View>
        {locked ? (
          <PlanBadge tier="Premium" />
        ) : badge ? (
          <PlanBadge tier={badge} tone="emerald" />
        ) : null}
      </View>
      <ThemedText type="h4" numberOfLines={2} style={{ color: theme.text }}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText
          type="caption"
          numberOfLines={2}
          style={{ color: theme.textMuted }}
        >
          {description}
        </ThemedText>
      ) : null}
      {typeof progress === "number" ? <XPBar progress={progress} /> : null}
    </PremiumCard>
  );
}

export function PremiumStatCard({
  icon,
  value,
  label,
  progress,
  tone = "emerald",
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  progress?: number;
  tone?: PremiumTone;
}) {
  const { theme } = useTheme();
  return (
    <PremiumCard style={styles.statCard} tone={tone}>
      <View style={styles.statTop}>
        {icon}
        <ThemedText type="h3" style={{ color: toneColor(theme, tone) }}>
          {value}
        </ThemedText>
      </View>
      <ThemedText
        type="caption"
        numberOfLines={2}
        style={{ color: theme.textMuted }}
      >
        {label}
      </ThemedText>
      {typeof progress === "number" ? (
        <XPBar progress={progress} tone={tone} />
      ) : null}
    </PremiumCard>
  );
}

export function PremiumProgressRing({
  progress,
  size = 54,
  tone = "emerald",
  label,
}: {
  progress: number;
  size?: number;
  tone?: PremiumTone;
  label?: string;
}) {
  const { theme } = useTheme();
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <View
      style={[
        styles.progressRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: `${toneColor(theme, tone)}35`,
        },
      ]}
    >
      <View
        style={[
          styles.progressRingInner,
          {
            width: size - 12,
            height: size - 12,
            borderRadius: (size - 12) / 2,
            backgroundColor: `${toneColor(theme, tone)}18`,
          },
        ]}
      >
        <ThemedText
          type="caption"
          style={{ color: toneColor(theme, tone), fontWeight: "800" }}
        >
          {label || `${pct}%`}
        </ThemedText>
      </View>
    </View>
  );
}

export function XPBar({
  progress,
  tone = "emerald",
}: {
  progress: number;
  tone?: PremiumTone;
}) {
  const { theme } = useTheme();
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <View
      style={[styles.xpTrack, { backgroundColor: theme.backgroundTertiary }]}
    >
      <View
        style={[
          styles.xpFill,
          { width: `${pct}%`, backgroundColor: toneColor(theme, tone) },
        ]}
      />
    </View>
  );
}

export function PremiumEmptyState({
  illustration,
  title,
  body,
  ctaLabel,
  onCta,
}: {
  illustration?: ReactNode;
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <PremiumCard style={styles.emptyState} pattern tone="scholar">
      {illustration ? (
        <View style={styles.emptyIllustration}>{illustration}</View>
      ) : null}
      <ThemedText type="h3" style={{ color: theme.text, textAlign: "center" }}>
        {title}
      </ThemedText>
      <ThemedText
        type="small"
        style={{ color: theme.textMuted, textAlign: "center" }}
      >
        {body}
      </ThemedText>
      {ctaLabel && onCta ? (
        <PremiumButton onPress={onCta} tone="emerald" icon="arrow-right">
          {ctaLabel}
        </PremiumButton>
      ) : null}
    </PremiumCard>
  );
}

export function PremiumListRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  tone = "emerald",
}: {
  icon?: FeatherName;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  tone?: PremiumTone;
}) {
  const { theme } = useTheme();
  const color = toneColor(theme, tone);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [
        styles.listRow,
        {
          backgroundColor: theme.surfaceGlass,
          borderColor: theme.borderSubtle,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      {icon ? (
        <View
          style={[
            styles.listIcon,
            { backgroundColor: `${color}17`, borderColor: `${color}2E` },
          ]}
        >
          <AppIcon name={icon} size={18} color={color} />
        </View>
      ) : null}
      <View style={styles.listContent}>
        <ThemedText
          type="small"
          numberOfLines={1}
          style={{ color: theme.text, fontWeight: "700" }}
        >
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText
            type="caption"
            numberOfLines={2}
            style={{ color: theme.textMuted }}
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right ||
        (onPress ? (
          <AppIcon name="chevron-right" size={18} color={theme.textMuted} />
        ) : null)}
    </Pressable>
  );
}

export function PremiumSearchBar(props: TextInputProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.searchBar,
        {
          backgroundColor: theme.surfaceGlass,
          borderColor: theme.borderSubtle,
        },
      ]}
    >
      <AppIcon name="search" size={18} color={theme.textMuted} />
      <TextInput
        {...props}
        placeholderTextColor={props.placeholderTextColor || theme.textMuted}
        style={[styles.searchInput, { color: theme.text }, props.style]}
      />
    </View>
  );
}

export function PremiumChip({
  label,
  selected,
  onPress,
  tone = "emerald",
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: PremiumTone;
}) {
  const { theme } = useTheme();
  const color = toneColor(theme, tone);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? color : theme.surfaceGlass,
          borderColor: selected ? color : theme.borderSubtle,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <ThemedText
        type="caption"
        style={{
          color: selected ? theme.primaryForeground : color,
          fontWeight: "800",
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function PremiumTabs({
  tabs,
  selected,
  onChange,
}: {
  tabs: string[];
  selected: string;
  onChange: (tab: string) => void;
}) {
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => (
        <PremiumChip
          key={tab}
          label={tab}
          selected={tab === selected}
          onPress={() => onChange(tab)}
        />
      ))}
    </View>
  );
}

export function PremiumInput(props: TextInputProps) {
  const { theme } = useTheme();
  return (
    <TextInput
      {...props}
      placeholderTextColor={props.placeholderTextColor || theme.textMuted}
      style={[
        styles.input,
        {
          color: theme.text,
          backgroundColor: theme.surfaceGlass,
          borderColor: theme.borderSubtle,
        },
        props.style,
      ]}
    />
  );
}

export function PremiumBottomSheet({
  visible,
  title,
  children,
  onClose,
}: {
  visible: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(180)}
        style={[styles.sheetBackdrop, { backgroundColor: theme.overlay }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          entering={SlideInDown.duration(260)}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.borderSubtle,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View
            style={[
              styles.sheetHandle,
              { backgroundColor: theme.borderStrong },
            ]}
          />
          {title ? (
            <ThemedText
              type="h3"
              style={{
                color: theme.text,
                textAlign: "center",
                marginBottom: Spacing.lg,
              }}
            >
              {title}
            </ThemedText>
          ) : null}
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export const PremiumModal = PremiumBottomSheet;

export function SourceCard({
  title,
  reference,
  body,
  verified = false,
}: {
  title: string;
  reference?: string;
  body?: string;
  verified?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.sourceCard,
        {
          backgroundColor: `${theme.primary}0D`,
          borderColor: `${theme.primary}28`,
        },
      ]}
    >
      <View style={styles.sourceTop}>
        <AppIcon
          name={verified ? "check-circle" : "book-open"}
          size={14}
          color={theme.primary}
        />
        <ThemedText
          type="caption"
          style={{ color: theme.primary, fontWeight: "800" }}
        >
          {title}
        </ThemedText>
      </View>
      {reference ? (
        <ThemedText
          type="caption"
          style={{ color: theme.text, fontWeight: "700" }}
        >
          {reference}
        </ThemedText>
      ) : null}
      {body ? (
        <ThemedText type="caption" style={{ color: theme.textMuted }}>
          {body}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function PlanBadge({
  tier,
  tone = tier.toLowerCase().includes("scholar") ? "scholar" : "emerald",
}: {
  tier: string;
  tone?: PremiumTone;
}) {
  const { theme } = useTheme();
  const color = toneColor(theme, tone);
  return (
    <View
      style={[
        styles.planBadge,
        { backgroundColor: `${color}18`, borderColor: `${color}40` },
      ]}
    >
      {tone === "scholar" ? <ScholarCrownSvg size={13} color={color} /> : null}
      <ThemedText
        type="caption"
        style={{ color, fontWeight: "800", fontSize: 10 }}
      >
        {tier}
      </ThemedText>
    </View>
  );
}

export function LockOverlay({
  title = "Premium feature",
  body = "Unlock this guided experience with your plan.",
  tier = "Premium",
  onPress,
}: {
  title?: string;
  body?: string;
  tier?: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.lockOverlay,
        { backgroundColor: `${theme.backgroundRoot}DD` },
      ]}
    >
      <PremiumLockSvg
        size={36}
        color={theme.scholar}
        accentColor={theme.primary}
      />
      <PlanBadge
        tier={tier}
        tone={tier.toLowerCase().includes("scholar") ? "scholar" : "emerald"}
      />
      <ThemedText type="h4" style={{ color: theme.text, textAlign: "center" }}>
        {title}
      </ThemedText>
      <ThemedText
        type="caption"
        style={{ color: theme.textMuted, textAlign: "center" }}
      >
        {body}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenGlow: {
    position: "absolute",
    top: -120,
    right: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.52,
    shadowOpacity: 0.28,
    shadowRadius: 40,
  },
  screenPadding: {
    paddingHorizontal: PremiumTheme.spacing.screenX,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerCircle: {
    width: PremiumTheme.touch.min,
    height: PremiumTheme.touch.min,
    borderRadius: PremiumTheme.touch.min / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconFrame: {
    width: PremiumTheme.touch.min,
    height: PremiumTheme.touch.min,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    ...PremiumTheme.typography.eyebrow,
  },
  card: {
    borderWidth: 1,
    borderRadius: PremiumTheme.radius.card,
    padding: PremiumTheme.spacing.cardPadding,
    overflow: "hidden",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardSheen: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  button: {
    minHeight: PremiumTheme.touch.min,
    borderRadius: PremiumTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  buttonText: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionAccent: {
    width: 3,
    height: 13,
    borderRadius: 2,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 2,
  },
  featureTile: {
    minHeight: 154,
    gap: Spacing.sm,
  },
  featureTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  statCard: {
    gap: Spacing.sm,
    minWidth: 120,
  },
  statTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  progressRing: {
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRingInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  xpTrack: {
    height: 6,
    borderRadius: 99,
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    borderRadius: 99,
  },
  emptyState: {
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyIllustration: {
    width: 98,
    height: 98,
    alignItems: "center",
    justifyContent: "center",
  },
  listRow: {
    minHeight: 64,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    flex: 1,
    gap: 2,
  },
  searchBar: {
    minHeight: 50,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 15,
  },
  chip: {
    minHeight: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  input: {
    minHeight: 50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 15,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: PremiumTheme.radius.sheet,
    borderTopRightRadius: PremiumTheme.radius.sheet,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    maxHeight: "86%",
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 99,
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  sourceCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 4,
  },
  sourceTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  planBadge: {
    minHeight: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
});
