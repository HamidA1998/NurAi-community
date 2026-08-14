import React, { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { NuraiGlass } from "./NuraiGlass";
import { NuraiRadius, NuraiSpace, NuraiTouch, NuraiType } from "./tokens";
import { AppIcon, type AppIconName } from "@/components/icons";

type FeatherName = AppIconName;

async function gentleHaptic() {
  if (Platform.OS === "web") return;
  await Haptics.selectionAsync().catch(() => undefined);
}

export function NuraiScreen({
  children,
  background,
  scroll = false,
  keyboardAware = false,
  style,
  contentContainerStyle,
  testID,
}: {
  children: ReactNode;
  background?: ReactNode;
  scroll?: boolean;
  keyboardAware?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const content = scroll ? (
    <ScrollView
      style={styles.fill}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.screenContent,
        {
          paddingTop: insets.top + NuraiSpace.xs,
          paddingBottom: insets.bottom + NuraiSpace.xl,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.fill,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View
      testID={testID}
      style={[styles.fill, { backgroundColor: theme.backgroundRoot }, style]}
    >
      {background}
      {keyboardAware ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}

export function NuraiNavigationBar({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.navigationBar}>
      {onBack ? (
        <NuraiIconButton icon="arrow-left" label="Go back" onPress={onBack} />
      ) : (
        <View style={styles.navigationSpacer} />
      )}
      <View style={styles.navigationCopy}>
        <Text
          style={[NuraiType.sectionTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[NuraiType.caption, { color: theme.textMuted }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.navigationRight}>{right}</View>
    </View>
  );
}

export function NuraiSectionHeader({
  title,
  eyebrow,
  description,
  action,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        {eyebrow ? (
          <Text style={[NuraiType.overline, { color: theme.primary }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={[NuraiType.sectionTitle, { color: theme.text }]}>
          {title}
        </Text>
        {description ? (
          <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
            {description}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function NuraiCard({
  children,
  variant = "default",
  onPress,
  accessibilityLabel,
  style,
  testID,
}: {
  children: ReactNode;
  variant?: "default" | "elevated" | "inset" | "outlined";
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { theme } = useTheme();
  const usesGlass = variant === "default" || variant === "elevated";
  const surface = usesGlass
    ? "transparent"
    : variant === "inset"
      ? theme.backgroundTertiary
      : variant === "outlined"
        ? "transparent"
        : theme.surface;
  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: surface,
      borderColor:
        variant === "outlined" ? theme.borderStrong : theme.borderSubtle,
      borderWidth: variant === "outlined" ? StyleSheet.hairlineWidth : 0,
    },
    style,
  ];
  if (!onPress) {
    return (
      <View
        style={cardStyle}
        testID={testID}
        accessible={Boolean(accessibilityLabel)}
        accessibilityLabel={accessibilityLabel}
      >
        {usesGlass ? (
          <NuraiGlass
            pointerEvents="none"
            radius={NuraiRadius.card}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => {
        gentleHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
    >
      {usesGlass ? (
        <NuraiGlass
          pointerEvents="none"
          radius={NuraiRadius.card}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      {children}
    </Pressable>
  );
}

export const NuraiInsetCard = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) => (
  <NuraiCard variant="inset" style={style}>
    {children}
  </NuraiCard>
);

export function NuraiButton({
  label,
  onPress,
  icon,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  icon?: FeatherName;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const { theme } = useTheme();
  const isPrimary = variant === "primary";
  const usesGlass = variant === "secondary";
  const color =
    variant === "danger"
      ? theme.error
      : isPrimary
        ? theme.primaryForeground
        : theme.text;
  const backgroundColor =
    variant === "danger"
      ? `${theme.error}20`
      : isPrimary
        ? theme.primary
        : "transparent";
  return (
    <Pressable
      onPress={() => {
        gentleHaptic();
        onPress();
      }}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor: "transparent",
          borderWidth: 0,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      {usesGlass ? (
        <NuraiGlass
          pointerEvents="none"
          interactive
          tint={`${theme.primary}0F`}
          radius={NuraiRadius.control}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : icon ? (
        <AppIcon name={icon} size={17} color={color} />
      ) : null}
      <Text
        style={[NuraiType.bodySmall, styles.buttonLabel, { color }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function NuraiIconButton({
  icon,
  label,
  onPress,
  disabled = false,
  active = false,
}: {
  icon: FeatherName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => {
        gentleHaptic();
        onPress();
      }}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: "transparent",
          borderColor: "transparent",
          borderWidth: 0,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <NuraiGlass
        pointerEvents="none"
        interactive
        tint={active ? `${theme.primary}1F` : undefined}
        radius={NuraiRadius.pill}
        style={StyleSheet.absoluteFillObject}
      />
      <AppIcon
        name={icon}
        size={19}
        color={active ? theme.primary : theme.icon}
      />
    </Pressable>
  );
}

export function NuraiSegmentedControl({
  options,
  value,
  onChange,
  testID,
}: {
  options: {
    id: string;
    label: string;
    icon?: FeatherName;
    testID?: string;
  }[];
  value: string;
  onChange: (id: string) => void;
  testID?: string;
}) {
  const { isDark, theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [layoutWidth, setLayoutWidth] = useState(0);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  );
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const padding = 4;
  const gap = 2;

  useEffect(() => {
    if (!layoutWidth || options.length === 0) return;
    const width =
      (layoutWidth - padding * 2 - gap * (options.length - 1)) / options.length;
    const x = padding + selectedIndex * (width + gap);
    const shouldMoveImmediately = reduceMotion || indicatorWidth.value === 0;
    indicatorWidth.value = shouldMoveImmediately
      ? width
      : withTiming(width, { duration: 180 });
    indicatorX.value = shouldMoveImmediately
      ? x
      : withTiming(x, { duration: 180 });
  }, [
    indicatorWidth,
    indicatorX,
    layoutWidth,
    options.length,
    reduceMotion,
    selectedIndex,
  ]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorWidth.value,
    opacity: indicatorWidth.value > 0 ? 1 : 0,
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View
      testID={testID}
      onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
      style={[
        styles.segmentedControl,
        {
          backgroundColor: isDark
            ? "rgba(4, 15, 17, 0.34)"
            : "rgba(255, 255, 255, 0.32)",
          borderColor: theme.borderSubtle,
        },
      ]}
      accessible={false}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.segmentedIndicator,
          { borderColor: `${theme.primary}42` },
          indicatorStyle,
        ]}
      >
        <NuraiGlass
          interactive
          tint={`${theme.primary}38`}
          radius={NuraiRadius.control}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            testID={
              option.testID || (testID ? `${testID}-${option.id}` : undefined)
            }
            onPress={() => {
              if (!selected) void gentleHaptic();
              onChange(option.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${option.label}, tab`}
            accessibilityHint={`Shows the ${option.label.toLowerCase()} section`}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.segmentedItem,
              option.icon ? styles.segmentedItemWithIcon : null,
              pressed && styles.segmentedPressed,
            ]}
          >
            {option.icon ? (
              <AppIcon
                name={option.icon}
                size={16}
                color={selected ? theme.primary : theme.iconMuted}
              />
            ) : null}
            <Text
              style={[
                NuraiType.caption,
                styles.segmentedLabel,
                {
                  color: selected ? theme.text : theme.textMuted,
                  fontFamily: selected
                    ? "PlusJakartaSans_600SemiBold"
                    : "PlusJakartaSans_500Medium",
                },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function NuraiPill({
  label,
  icon,
  tone = "neutral",
}: {
  label: string;
  icon?: FeatherName;
  tone?: "neutral" | "primary" | "gold" | "danger";
}) {
  const { theme } = useTheme();
  const color =
    tone === "primary"
      ? theme.primary
      : tone === "gold"
        ? theme.scholar
        : tone === "danger"
          ? theme.error
          : theme.textSecondary;
  return (
    <View
      style={[styles.pill, { backgroundColor: `${color}14` }]}
      accessible
      accessibilityRole="text"
    >
      {icon ? <AppIcon name={icon} size={13} color={color} /> : null}
      <Text style={[NuraiType.caption, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export const NuraiTag = NuraiPill;

export function NuraiDivider() {
  const { theme } = useTheme();
  return (
    <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />
  );
}

export function NuraiMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={styles.metric}
      accessible
      accessibilityLabel={`${label}: ${value}${detail ? `. ${detail}` : ""}`}
    >
      <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
        {label}
      </Text>
      <Text
        style={[
          NuraiType.metric,
          { color: theme.text, fontVariant: ["tabular-nums"] },
        ]}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {value}
      </Text>
      {detail ? (
        <Text style={[NuraiType.caption, { color: theme.textSecondary }]}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

export function NuraiProgress({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const { theme } = useTheme();
  const progress = Math.max(0, Math.min(1, value));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: theme.backgroundTertiary },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: theme.primary },
          ]}
        />
      </View>
    </View>
  );
}

export function NuraiListRow({
  title,
  subtitle,
  icon,
  value,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon?: FeatherName;
  value?: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const content = (
    <>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: theme.primaryMuted }]}>
          <AppIcon name={icon} size={18} color={theme.primary} />
        </View>
      ) : null}
      <View style={styles.rowCopy}>
        <Text style={[NuraiType.body, { color: theme.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[NuraiType.bodySmall, { color: theme.textMuted }]}>
          {value}
        </Text>
      ) : null}
      {onPress ? (
        <AppIcon name="chevron-right" size={18} color={theme.iconMuted} />
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.listRow}>{content}</View>;
  return (
    <Pressable
      onPress={() => {
        gentleHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

export function NuraiSearchField(props: TextInputProps & { label?: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.searchField,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.borderSubtle,
        },
      ]}
    >
      <AppIcon name="search" size={18} color={theme.iconMuted} />
      <TextInput
        {...props}
        accessibilityLabel={props.label || props.accessibilityLabel || "Search"}
        placeholderTextColor={theme.textMuted}
        style={[
          NuraiType.body,
          styles.searchInput,
          { color: theme.text },
          props.style as StyleProp<TextStyle>,
        ]}
      />
    </View>
  );
}

export function NuraiAvatar({
  label,
  size = 40,
}: {
  label: string;
  size?: number;
}) {
  const { theme } = useTheme();
  const initials = label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.primaryMuted,
        },
      ]}
      accessible
      accessibilityLabel={label}
    >
      <Text style={[NuraiType.bodySmall, { color: theme.primary }]}>
        {initials || "N"}
      </Text>
    </View>
  );
}

export function NuraiBottomSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={[styles.sheetBackdrop, { backgroundColor: theme.modalBackdrop }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.backgroundSecondary,
            paddingBottom: insets.bottom + NuraiSpace.lg,
          },
        ]}
        accessibilityViewIsModal
      >
        <View
          style={[styles.sheetHandle, { backgroundColor: theme.handleBar }]}
        />
        <View style={styles.sheetHeader}>
          <Text style={[NuraiType.sectionTitle, { color: theme.text }]}>
            {title}
          </Text>
          <NuraiIconButton icon="x" label="Close" onPress={onClose} />
        </View>
        {children}
      </View>
    </Modal>
  );
}

export function NuraiToast({
  message,
  tone = "neutral",
}: {
  message: string;
  tone?: "neutral" | "success" | "error";
}) {
  const { theme } = useTheme();
  const color =
    tone === "success"
      ? theme.success
      : tone === "error"
        ? theme.error
        : theme.text;
  return (
    <View
      style={[styles.toast, { backgroundColor: theme.surfaceElevated }]}
      accessibilityRole="alert"
    >
      <AppIcon
        name={tone === "error" ? "alert-circle" : "check-circle"}
        size={16}
        color={color}
      />
      <Text style={[NuraiType.bodySmall, { color: theme.text, flex: 1 }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screenContent: {
    flexGrow: 1,
    paddingHorizontal: NuraiSpace.lg,
    gap: NuraiSpace.xl,
  },
  navigationBar: {
    minHeight: 58,
    paddingHorizontal: NuraiSpace.md,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  navigationSpacer: { width: NuraiTouch.minimum },
  navigationCopy: { flex: 1, minWidth: 0 },
  navigationRight: { minWidth: NuraiTouch.minimum, alignItems: "flex-end" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: NuraiSpace.md,
  },
  sectionHeaderCopy: { flex: 1, gap: NuraiSpace.xxs },
  card: {
    borderRadius: NuraiRadius.card,
    padding: NuraiSpace.lg,
    gap: NuraiSpace.md,
    overflow: "hidden",
  },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.45 },
  button: {
    minHeight: NuraiTouch.comfortable,
    paddingHorizontal: NuraiSpace.md,
    paddingVertical: NuraiSpace.sm,
    borderRadius: NuraiRadius.control,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: NuraiSpace.xs,
  },
  buttonLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    textAlign: "center",
    flexShrink: 1,
  },
  iconButton: {
    width: NuraiTouch.minimum,
    height: NuraiTouch.minimum,
    borderRadius: NuraiRadius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedControl: {
    minHeight: 56,
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: NuraiRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 2,
  },
  segmentedIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 0,
    overflow: "hidden",
    borderRadius: NuraiRadius.control,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentedItem: {
    flex: 1,
    minWidth: 0,
    minHeight: NuraiTouch.minimum,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: NuraiSpace.xxs,
  },
  segmentedItemWithIcon: { gap: 2 },
  segmentedPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  segmentedLabel: { textAlign: "center" },
  pill: {
    minHeight: 30,
    borderRadius: NuraiRadius.pill,
    paddingHorizontal: NuraiSpace.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  divider: { height: StyleSheet.hairlineWidth, width: "100%" },
  metric: { minWidth: 88, gap: 2 },
  progressTrack: {
    height: 5,
    borderRadius: NuraiRadius.pill,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: NuraiRadius.pill },
  listRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    paddingVertical: NuraiSpace.sm,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: NuraiRadius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  searchField: {
    minHeight: 50,
    borderRadius: NuraiRadius.control,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: NuraiSpace.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.xs,
  },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: NuraiSpace.sm },
  avatar: { alignItems: "center", justifyContent: "center" },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: NuraiRadius.large,
    borderTopRightRadius: NuraiRadius.large,
    paddingHorizontal: NuraiSpace.lg,
    paddingTop: NuraiSpace.xs,
    maxHeight: "88%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    opacity: 0.45,
  },
  sheetHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toast: {
    minHeight: 48,
    borderRadius: NuraiRadius.control,
    paddingHorizontal: NuraiSpace.md,
    paddingVertical: NuraiSpace.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.xs,
  },
});
