import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { NuraiButton, NuraiCard } from "./primitives";
import { NuraiRadius, NuraiSpace, NuraiType } from "./tokens";
import { AppIcon, type AppIconName } from "@/components/icons";

type StateTone =
  | "empty"
  | "loading"
  | "error"
  | "offline"
  | "permission"
  | "limit";

const STATE_ICON: Record<StateTone, AppIconName> = {
  empty: "message-circle",
  loading: "loader",
  error: "alert-circle",
  offline: "wifi-off",
  permission: "shield",
  limit: "clock",
};

export function NuraiState({
  tone,
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  tone: StateTone;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const { theme } = useTheme();
  const accent =
    tone === "error"
      ? theme.error
      : tone === "limit"
        ? theme.scholar
        : theme.primary;
  return (
    <View
      style={styles.state}
      accessibilityRole={tone === "error" ? "alert" : "summary"}
    >
      <View style={[styles.stateIcon, { backgroundColor: `${accent}14` }]}>
        <AppIcon name={STATE_ICON[tone]} size={22} color={accent} />
      </View>
      <View style={styles.stateCopy}>
        <Text
          style={[
            NuraiType.sectionTitle,
            { color: theme.text, textAlign: "center" },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            NuraiType.bodySmall,
            { color: theme.textSecondary, textAlign: "center" },
          ]}
        >
          {body}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <NuraiButton label={actionLabel} onPress={onAction} />
      ) : null}
      {secondaryLabel && onSecondary ? (
        <NuraiButton
          label={secondaryLabel}
          onPress={onSecondary}
          variant="ghost"
        />
      ) : null}
    </View>
  );
}

export const NuraiEmptyState = (
  props: Omit<React.ComponentProps<typeof NuraiState>, "tone">,
) => <NuraiState tone="empty" {...props} />;
export const NuraiLoadingState = (
  props: Omit<React.ComponentProps<typeof NuraiState>, "tone">,
) => <NuraiState tone="loading" {...props} />;
export const NuraiErrorState = (
  props: Omit<React.ComponentProps<typeof NuraiState>, "tone">,
) => <NuraiState tone="error" {...props} />;

export function NuraiSkeleton({ lines = 3 }: { lines?: number }) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);
  return (
    <NuraiCard>
      {Array.from({ length: lines }).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.skeleton,
            {
              width: index === lines - 1 ? "62%" : "100%",
              backgroundColor: theme.skeleton,
              opacity,
            },
          ]}
        />
      ))}
    </NuraiCard>
  );
}

export function NuraiInsightCard({
  eyebrow,
  title,
  body,
  actionLabel,
  onAction,
  sourceLabel,
}: {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  sourceLabel?: string;
}) {
  const { theme } = useTheme();
  return (
    <NuraiCard variant="elevated" style={styles.insight}>
      <Text style={[NuraiType.overline, { color: theme.primary }]}>
        {eyebrow}
      </Text>
      <Text style={[NuraiType.sectionTitle, { color: theme.text }]}>
        {title}
      </Text>
      <Text style={[NuraiType.body, { color: theme.textSecondary }]}>
        {body}
      </Text>
      {sourceLabel ? (
        <View style={styles.sourceRow}>
          <AppIcon name="bookmark" size={14} color={theme.scholar} />
          <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
            {sourceLabel}
          </Text>
        </View>
      ) : null}
      {actionLabel && onAction ? (
        <NuraiButton
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          icon="arrow-right"
        />
      ) : null}
    </NuraiCard>
  );
}

export function NuraiTimelineItem({
  title,
  body,
  active = false,
}: {
  title: string;
  body: string;
  active?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineRail}>
        <View
          style={[
            styles.timelineDot,
            { backgroundColor: active ? theme.primary : theme.textMuted },
          ]}
        />
        <View
          style={[styles.timelineLine, { backgroundColor: theme.borderSubtle }]}
        />
      </View>
      <View style={styles.timelineCopy}>
        <Text style={[NuraiType.body, { color: theme.text }]}>{title}</Text>
        <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
          {body}
        </Text>
      </View>
    </View>
  );
}

export function NuraiPrayerStatus({
  name,
  time,
  status,
}: {
  name: string;
  time: string;
  status: "passed" | "current" | "upcoming";
}) {
  const { theme } = useTheme();
  const color =
    status === "current"
      ? theme.primary
      : status === "upcoming"
        ? theme.scholar
        : theme.textMuted;
  return (
    <View
      style={styles.prayerStatus}
      accessibilityLabel={`${name}, ${time}, ${status}`}
    >
      <View style={[styles.prayerMarker, { backgroundColor: color }]} />
      <Text style={[NuraiType.body, { color: theme.text, flex: 1 }]}>
        {name}
      </Text>
      <Text
        style={[NuraiType.bodySmall, { color, fontVariant: ["tabular-nums"] }]}
      >
        {time}
      </Text>
    </View>
  );
}

export function NuraiInlineAction({
  label,
  onPress,
  icon = "arrow-right",
}: {
  label: string;
  onPress: () => void;
  icon?: AppIconName;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.inlineAction,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[NuraiType.bodySmall, { color: theme.primary }]}>
        {label}
      </Text>
      <AppIcon name={icon} size={16} color={theme.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  state: {
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    gap: NuraiSpace.lg,
    paddingHorizontal: NuraiSpace.xl,
  },
  stateIcon: {
    width: 52,
    height: 52,
    borderRadius: NuraiRadius.card,
    alignItems: "center",
    justifyContent: "center",
  },
  stateCopy: { maxWidth: 360, gap: NuraiSpace.xs },
  skeleton: { height: 16, borderRadius: NuraiRadius.small },
  insight: { gap: NuraiSpace.sm },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: NuraiSpace.xs },
  timelineItem: { flexDirection: "row", gap: NuraiSpace.sm, minHeight: 64 },
  timelineRail: { width: 16, alignItems: "center" },
  timelineDot: { width: 9, height: 9, borderRadius: 5, marginTop: 7 },
  timelineLine: { flex: 1, width: StyleSheet.hairlineWidth, marginTop: 5 },
  timelineCopy: { flex: 1, paddingBottom: NuraiSpace.md },
  prayerStatus: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  prayerMarker: { width: 8, height: 8, borderRadius: 4 },
  inlineAction: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.xs,
    alignSelf: "flex-start",
  },
});
