import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  Aurora,
  NuraiButton,
  NuraiGlass,
  NuraiIconButton,
  NuraiProgress,
  NuraiRadius,
  NuraiScreen,
  NuraiSegmentedControl,
  NuraiSpace,
  NuraiType,
} from "@/design-system";
import { useTheme } from "@/hooks/useTheme";
import {
  buildMuslimHealthPlan,
  createDefaultMuslimHealthProfile,
  loadMuslimHealthProfile,
  type MuslimHealthPlan,
  type MuslimHealthProfile,
} from "@/services/muslimHealthService";
import {
  buildNativeHealthScoreSnapshot,
  hasNativeHealthMetrics,
  type NativeHealthDailySummary,
  type NativeHealthScoreSnapshot,
} from "@/services/nativeHealthDataService";
import { AppIcon, type AppIconName } from "@/components/icons";

// Shared foundation for the NurAI Health section. Every detail screen loads the
// same real data (HealthKit summary + 7-day history + care profile) through
// useHealthData, and renders with the same glass primitives so the whole
// section reads as one product.

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const HEALTH_HISTORY_DAYS = 7;

export function useHealthData(historyDays: number = HEALTH_HISTORY_DAYS) {
  const [profile, setProfile] = useState<MuslimHealthProfile | null>(null);
  const [summary, setSummary] = useState<NativeHealthDailySummary | null>(null);
  const [history, setHistory] = useState<NativeHealthDailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadMuslimHealthProfile()
      .then((loaded) => mounted && setProfile(loaded))
      .catch(() => mounted && setProfile(createDefaultMuslimHealthProfile()));
    return () => {
      mounted = false;
    };
  }, []);

  const refresh = useCallback(
    async (requestPermission = false) => {
      setLoading(true);
      setError(null);
      try {
        const {
          readNativeDailyHealthSummary,
          readNativeHealthHistory,
          requestNativeHealthPermissions,
        } = await import("@/services/nativeHealthDataService");
        if (requestPermission) await requestNativeHealthPermissions();
        const next = await readNativeDailyHealthSummary();
        setSummary(next);
        if (hasNativeHealthMetrics(next) || requestPermission) {
          setHistory(await readNativeHealthHistory(historyDays));
        }
        if (next.status === "denied") {
          setError(
            "Health permission is not granted yet. Allow access, then refresh.",
          );
        } else if (next.status === "unavailable") {
          setError("Health data is unavailable on this device or build.");
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not read health data right now.",
        );
      } finally {
        setLoading(false);
      }
    },
    [historyDays],
  );

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  const plan = useMemo<MuslimHealthPlan | null>(
    () => (profile ? buildMuslimHealthPlan(profile) : null),
    [profile],
  );
  const planProgress = plan?.progress || 0;
  const scores = useMemo<NativeHealthScoreSnapshot>(
    () => buildNativeHealthScoreSnapshot(summary, planProgress),
    [summary, planProgress],
  );
  const historyScores = useMemo(
    () =>
      history.map((day) => buildNativeHealthScoreSnapshot(day, planProgress)),
    [history, planProgress],
  );

  return {
    profile,
    setProfile,
    plan,
    summary,
    history,
    scores,
    historyScores,
    hasData: hasNativeHealthMetrics(summary),
    loading,
    error,
    refresh,
  };
}

export function formatMinutesLabel(minutes?: number | null) {
  if (!minutes || minutes <= 0) return "--";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

// The signature circular score ring — emerald arc over a recessive track with
// an inner gold whisper ring, animated draw-in (reduced-motion aware).
export function HealthRing({
  value,
  size = 180,
  stroke = 11,
  color,
  trackColor,
  innerColor,
  children,
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  color: string;
  trackColor: string;
  innerColor?: string;
  children?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  const target = circumference - (clamped / 100) * circumference;
  const endAngle = (clamped / 100) * Math.PI * 2 - Math.PI / 2;
  const endX = center + radius * Math.cos(endAngle);
  const endY = center + radius * Math.sin(endAngle);
  const offset = useSharedValue(circumference);

  useEffect(() => {
    offset.value = reduceMotion
      ? target
      : withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [target, offset, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius + stroke / 2 + 5}
          stroke={color}
          strokeWidth={1}
          fill="none"
          opacity={0.12}
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
          opacity={0.6}
        />
        {innerColor ? (
          <Circle
            cx={center}
            cy={center}
            r={radius - stroke - 5}
            stroke={innerColor}
            strokeWidth={1.5}
            fill="none"
            opacity={0.28}
          />
        ) : null}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
        {value != null && clamped > 0 ? (
          <>
            <Circle
              cx={endX}
              cy={endY}
              r={stroke * 0.72}
              fill={color}
              opacity={0.16}
            />
            <Circle
              cx={endX}
              cy={endY}
              r={Math.max(3, stroke * 0.34)}
              fill={innerColor || color}
            />
          </>
        ) : null}
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.ringCenter}>{children}</View>
      </View>
    </View>
  );
}

// Standard section header: circular glass back button, gold eyebrow, serif title.
export function HealthHeader({
  eyebrow,
  title,
  subtitle,
  right,
  showBack = true,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  showBack?: boolean;
}) {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  return (
    <View style={styles.header}>
      {showBack ? (
        <NuraiIconButton
          icon="arrow-left"
          label="Go back"
          onPress={() => navigation.goBack()}
        />
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[NuraiType.overline, styles.eyebrow, { color: theme.scholar }]}
        >
          {eyebrow}
        </Text>
        <Text
          style={[
            NuraiType.sectionTitle,
            styles.headerTitle,
            { color: theme.text },
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              NuraiType.caption,
              { color: theme.textSecondary, marginTop: 2 },
            ]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function GlassCard({
  children,
  style,
  accent,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: string;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: "transparent",
          borderColor: accent ? `${accent}38` : "transparent",
          borderWidth: accent ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}
    >
      <NuraiGlass
        pointerEvents="none"
        tint={accent ? `${accent}0D` : undefined}
        radius={NuraiRadius.large}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </View>
  );
}

export function HealthScreenShell({
  eyebrow,
  title,
  subtitle,
  children,
  right,
  showBack = true,
  testID,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  showBack?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.fill}>
      <Aurora />
      <NuraiScreen
        scroll
        testID={testID}
        style={styles.transparent}
        contentContainerStyle={styles.screenContent}
      >
        <HealthHeader
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          right={right}
          showBack={showBack}
        />
        {children}
      </NuraiScreen>
    </View>
  );
}

export function HealthDataNotice({
  loading,
  error,
  hasData,
  onConnect,
}: {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  onConnect: () => void;
}) {
  const { theme } = useTheme();
  if (hasData && !error) return null;
  return (
    <GlassCard accent={error ? theme.warning : theme.primary}>
      <View style={styles.noticeRow}>
        <View
          style={[
            styles.noticeIcon,
            {
              backgroundColor: error
                ? `${theme.warning}16`
                : theme.primaryMuted,
            },
          ]}
        >
          <AppIcon
            name={error ? "alert-circle" : "heart"}
            size={19}
            color={error ? theme.warning : theme.primary}
          />
        </View>
        <View style={styles.noticeCopy}>
          <Text style={[NuraiType.body, { color: theme.text }]}>
            Real health data only
          </Text>
          <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
            {error ||
              "Connect your device to see personal scores. Until then, NurAI leaves those values blank."}
          </Text>
        </View>
      </View>
      <NuraiButton
        label={loading ? "Checking health access…" : "Connect health data"}
        icon="link"
        onPress={onConnect}
        loading={loading}
        disabled={loading}
      />
    </GlassCard>
  );
}

export function HealthSectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[NuraiType.sectionTitle, { color: theme.text, flex: 1 }]}>
        {title}
      </Text>
      {action}
    </View>
  );
}

/**
 * A small, reusable identity mark for every Health area. It deliberately uses
 * vector geometry and the shared icon set instead of people photography or
 * stock artwork, so the section remains private, lightweight and recognisable.
 */
export function HealthGlyph({
  icon,
  tone = "primary",
  size = 52,
  label,
}: {
  icon: AppIconName;
  tone?: "primary" | "gold" | "muted";
  size?: number;
  label?: string;
}) {
  const { theme } = useTheme();
  const color =
    tone === "gold"
      ? theme.scholar
      : tone === "muted"
        ? theme.textSecondary
        : theme.primary;
  return (
    <View
      accessible={Boolean(label)}
      accessibilityLabel={label}
      style={[
        styles.glyph,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: `${color}42`,
          backgroundColor: `${color}0D`,
        },
      ]}
    >
      <View
        style={[
          styles.glyphOrbit,
          {
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: size,
            borderColor: `${color}24`,
          },
        ]}
      />
      <AppIcon name={icon} size={Math.round(size * 0.38)} color={color} />
      <View
        style={[
          styles.glyphNode,
          {
            width: Math.max(5, size * 0.1),
            height: Math.max(5, size * 0.1),
            borderRadius: size,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

export function HealthMetricTile({
  icon,
  label,
  value,
  detail,
  tone = "primary",
  onPress,
}: {
  icon: AppIconName;
  label: string;
  value: string;
  detail?: string;
  tone?: "primary" | "gold";
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const color = tone === "gold" ? theme.scholar : theme.primary;
  const content = (
    <>
      <View style={[styles.metricTileIcon, { backgroundColor: `${color}14` }]}>
        <AppIcon name={icon} size={15} color={color} />
      </View>
      <Text
        style={[
          NuraiType.metric,
          styles.metricTileValue,
          { color: theme.text },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      <Text
        style={[
          NuraiType.overline,
          styles.metricTileLabel,
          { color: theme.textMuted },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {detail ? (
        <Text
          style={[NuraiType.overline, styles.metricTileDetail, { color }]}
          numberOfLines={1}
        >
          {detail}
        </Text>
      ) : null}
    </>
  );

  const sharedStyle = [
    styles.metricTile,
    { backgroundColor: theme.surfaceGlass, borderColor: theme.borderSubtle },
  ];
  if (!onPress) {
    return (
      <View
        style={sharedStyle}
        accessible
        accessibilityLabel={`${label}: ${value}${detail ? `. ${detail}` : ""}`}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${detail ? `. ${detail}` : ""}`}
      style={({ pressed }) => [sharedStyle, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

export function HealthMetricStrip({ children }: { children: React.ReactNode }) {
  return <View style={styles.metricStrip}>{children}</View>;
}

export function PerformanceRow({
  icon,
  label,
  value,
  context,
  progress,
  tone = "primary",
  last,
}: {
  icon: AppIconName;
  label: string;
  value: string;
  context: string;
  progress?: number;
  tone?: "primary" | "gold" | "warning";
  last?: boolean;
}) {
  const { theme } = useTheme();
  const color =
    tone === "gold"
      ? theme.scholar
      : tone === "warning"
        ? theme.warning
        : theme.primary;
  return (
    <View
      style={[
        styles.performanceRow,
        !last && {
          borderBottomColor: theme.borderSubtle,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
      accessible
      accessibilityLabel={`${label}: ${value}. ${context}`}
    >
      <View style={[styles.performanceIcon, { backgroundColor: `${color}12` }]}>
        <AppIcon name={icon} size={15} color={color} />
      </View>
      <View style={styles.performanceCopy}>
        <View style={styles.performanceHeading}>
          <Text style={[NuraiType.bodySmall, { color: theme.text, flex: 1 }]}>
            {label}
          </Text>
          <Text
            style={[
              NuraiType.bodySmall,
              styles.metricValue,
              { color: theme.text },
            ]}
          >
            {value}
          </Text>
        </View>
        {typeof progress === "number" ? (
          <View
            style={[
              styles.performanceTrack,
              { backgroundColor: theme.backgroundTertiary },
            ]}
          >
            <View
              style={[
                styles.performanceFill,
                {
                  backgroundColor: color,
                  width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
                },
              ]}
            />
          </View>
        ) : null}
        <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
          {context}
        </Text>
      </View>
    </View>
  );
}

export function HealthProgressRow({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: number;
  detail: string;
  color?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressCopy}>
        <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
          {label}
        </Text>
        <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
          {detail}
        </Text>
      </View>
      <View style={styles.progressTrackWrap}>
        {color ? (
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: theme.backgroundTertiary },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: color,
                  width: `${Math.max(0, Math.min(1, value)) * 100}%`,
                },
              ]}
            />
          </View>
        ) : (
          <NuraiProgress value={value} label={label} />
        )}
      </View>
    </View>
  );
}

export function WorkoutCard({
  title,
  subtitle,
  minutes,
  intensity,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  minutes: number;
  intensity: string;
  icon: AppIconName;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${minutes} minutes. ${intensity} intensity.`}
      style={({ pressed }) => [
        styles.workoutCard,
        {
          backgroundColor: theme.surfaceGlass,
          borderColor: theme.borderSubtle,
        },
        pressed && styles.pressed,
      ]}
    >
      <HealthGlyph icon={icon} size={54} label={`${title} workout`} />
      <View style={styles.workoutCopy}>
        <Text style={[NuraiType.body, { color: theme.text }]}>{title}</Text>
        <Text
          style={[NuraiType.caption, { color: theme.textSecondary }]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[NuraiType.caption, { color: theme.scholar }]}>
            {minutes} min
          </Text>
          <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
            {intensity}
          </Text>
        </View>
      </View>
      <AppIcon name="chevron-right" size={20} color={theme.iconMuted} />
    </Pressable>
  );
}

export function MetricListRow({
  icon,
  label,
  value,
  status,
  statusColor,
  last,
}: {
  icon: AppIconName;
  label: string;
  value: string;
  status?: string;
  statusColor?: string;
  last?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.metricRow,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.borderSubtle,
        },
      ]}
    >
      <View
        style={[styles.metricIcon, { backgroundColor: theme.primarySubtle }]}
      >
        <AppIcon name={icon} size={15} color={theme.primary} />
      </View>
      <Text
        style={[NuraiType.bodySmall, { color: theme.textSecondary, flex: 1 }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[NuraiType.bodySmall, styles.metricValue, { color: theme.text }]}
      >
        {value}
      </Text>
      {status ? (
        <View
          style={[
            styles.statusPill,
            { backgroundColor: `${statusColor || theme.primary}16` },
          ]}
        >
          <Text
            style={[
              NuraiType.overline,
              { color: statusColor || theme.primary, letterSpacing: 0.4 },
            ]}
          >
            {status}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function HealthSegmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <NuraiSegmentedControl
      testID="health-segmented-control"
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}

export function StatCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.statCell,
        {
          backgroundColor: theme.surfaceGlass,
          borderColor: theme.borderSubtle,
        },
      ]}
    >
      <Text
        style={[
          NuraiType.metric,
          { color: theme.text, fontSize: 22, lineHeight: 28 },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        style={[NuraiType.caption, { color: theme.textMuted }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {hint ? (
        <Text
          style={[
            NuraiType.overline,
            { color: theme.textMuted, letterSpacing: 0.4 },
          ]}
          numberOfLines={1}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  transparent: { backgroundColor: "transparent" },
  screenContent: { paddingHorizontal: NuraiSpace.lg, gap: NuraiSpace.md },
  ringCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    marginBottom: NuraiSpace.xs,
  },
  eyebrow: { letterSpacing: 1.25, textTransform: "uppercase" },
  headerTitle: { fontSize: 22, lineHeight: 28 },
  card: {
    borderRadius: NuraiRadius.large,
    padding: NuraiSpace.md,
    overflow: "hidden",
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    paddingVertical: 11,
    minHeight: 44,
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: { fontFamily: "PlusJakartaSans_600SemiBold" },
  statusPill: {
    borderRadius: NuraiRadius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statCell: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 0,
    borderRadius: NuraiRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: NuraiSpace.sm,
    gap: 2,
    alignItems: "center",
  },
  noticeRow: {
    flexDirection: "row",
    gap: NuraiSpace.sm,
    alignItems: "flex-start",
  },
  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: NuraiRadius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeCopy: { flex: 1, minWidth: 0, gap: NuraiSpace.xxs },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    minHeight: 46,
  },
  progressCopy: { width: 112, gap: 1 },
  progressTrackWrap: { flex: 1 },
  progressTrack: {
    height: 7,
    borderRadius: NuraiRadius.pill,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: NuraiRadius.pill },
  workoutCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    borderRadius: NuraiRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: NuraiSpace.sm,
    minHeight: 98,
  },
  workoutCopy: { flex: 1, minWidth: 0, gap: 2 },
  metaRow: {
    flexDirection: "row",
    gap: NuraiSpace.sm,
    marginTop: NuraiSpace.xxs,
  },
  pressed: { opacity: 0.75 },
  glyph: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  glyphOrbit: { position: "absolute", borderWidth: 1 },
  glyphNode: { position: "absolute", right: "8%", top: "18%" },
  metricStrip: { flexDirection: "row", gap: NuraiSpace.xs },
  metricTile: {
    flex: 1,
    minWidth: 0,
    minHeight: 104,
    borderRadius: NuraiRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: NuraiSpace.xs,
    paddingVertical: NuraiSpace.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  metricTileIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  metricTileValue: {
    fontSize: 18,
    lineHeight: 23,
    fontVariant: ["tabular-nums"],
  },
  metricTileLabel: { fontSize: 10, lineHeight: 14, textAlign: "center" },
  metricTileDetail: { fontSize: 10, lineHeight: 14, textAlign: "center" },
  performanceRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: NuraiSpace.sm,
    paddingVertical: NuraiSpace.xs,
  },
  performanceIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  performanceCopy: { flex: 1, minWidth: 0, gap: 4 },
  performanceHeading: {
    flexDirection: "row",
    gap: NuraiSpace.sm,
    alignItems: "center",
  },
  performanceTrack: {
    height: 5,
    borderRadius: NuraiRadius.pill,
    overflow: "hidden",
  },
  performanceFill: { height: "100%", borderRadius: NuraiRadius.pill },
});
