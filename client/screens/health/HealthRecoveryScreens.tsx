import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import {
  GlassCard,
  HealthDataNotice,
  HealthGlyph,
  HealthProgressRow,
  HealthRing,
  HealthScreenShell,
  HealthSectionTitle,
  HealthSegmented,
  MetricListRow,
  PerformanceRow,
  StatCell,
  formatMinutesLabel,
  useHealthData,
} from "@/components/health/HealthPrimitives";
import {
  NuraiButton,
  NuraiSpace,
  NuraiTrendChart,
  NuraiType,
} from "@/design-system";
import { useTheme } from "@/hooks/useTheme";
import { AppIcon } from "@/components/icons";

function readinessCopy(value: number | null) {
  if (value == null)
    return "Connect your health provider to calculate readiness from real recovery signals.";
  if (value >= 75)
    return "Your recovery signals support a stronger session today. Keep good form and listen to your body.";
  if (value >= 50)
    return "A moderate session fits today. Leave enough energy for the rest of your day and worship.";
  return "Recovery is the priority today. Gentle walking, mobility, hydration and rest are enough.";
}

function scoreStatus(value: number | null) {
  if (value == null) return "Waiting for data";
  if (value >= 75) return "Strong";
  if (value >= 50) return "Balanced";
  return "Recover";
}

function average(values: (number | undefined | null)[]) {
  const available = values.filter(
    (value): value is number => typeof value === "number" && value > 0,
  );
  if (!available.length) return null;
  return (
    available.reduce((total, value) => total + value, 0) / available.length
  );
}

function baselineCopy(
  current: number | undefined,
  baseline: number | null,
  unit: string,
) {
  if (!current) return "Waiting for today’s reading";
  if (!baseline) return "Recorded today · personal baseline is still building";
  const delta = current - baseline;
  const direction = delta > 0 ? "above" : delta < 0 ? "below" : "in line with";
  return `${Math.abs(Math.round(delta))} ${unit} ${direction} your recent average`;
}

export function HealthReadinessScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const health = useHealthData();
  const readiness = health.scores.readinessScore;
  const restingBaseline = average(
    health.history.map((day) => day.restingHeartRateBpm),
  );
  const hrvBaseline = average(
    health.history.map((day) => day.heartRateVariabilityMs),
  );
  const sleepTargetMinutes = (health.profile?.sleepTargetHours || 7) * 60;

  return (
    <HealthScreenShell
      eyebrow="Recovery"
      title="Readiness"
      subtitle="A transparent estimate from sleep, heart and movement signals."
      testID="health-readiness-screen"
    >
      <View style={styles.hero}>
        <HealthGlyph icon="activity" tone="gold" size={42} label="Readiness" />
        <HealthRing
          value={readiness}
          size={194}
          color={theme.primary}
          trackColor={theme.backgroundTertiary}
          innerColor={theme.scholar}
        >
          <AppIcon name="activity" size={19} color={theme.scholar} />
          <Text
            style={[NuraiType.display, styles.score, { color: theme.text }]}
          >
            {readiness ?? "—"}
          </Text>
          <Text style={[NuraiType.caption, { color: theme.textSecondary }]}>
            Readiness score
          </Text>
          <Text style={[NuraiType.overline, { color: theme.primary }]}>
            {scoreStatus(readiness)}
          </Text>
        </HealthRing>
        <Text
          style={[
            NuraiType.bodySmall,
            styles.centerCopy,
            { color: theme.textSecondary },
          ]}
        >
          {readinessCopy(readiness)}
        </Text>
      </View>

      <HealthDataNotice
        loading={health.loading}
        error={health.error}
        hasData={health.hasData}
        onConnect={() => health.refresh(true)}
      />

      <HealthSectionTitle title="Signals used" />
      <GlassCard>
        <PerformanceRow
          icon="heart"
          label="Resting heart rate"
          value={
            health.summary?.restingHeartRateBpm
              ? `${health.summary.restingHeartRateBpm} bpm`
              : "—"
          }
          context={baselineCopy(
            health.summary?.restingHeartRateBpm,
            restingBaseline,
            "bpm",
          )}
          progress={
            health.summary?.restingHeartRateBpm
              ? Math.max(
                  0,
                  Math.min(
                    1,
                    1 - Math.abs(health.summary.restingHeartRateBpm - 62) / 40,
                  ),
                )
              : 0
          }
        />
        <PerformanceRow
          icon="activity"
          label="Heart rate variability"
          value={
            health.summary?.heartRateVariabilityMs
              ? `${health.summary.heartRateVariabilityMs} ms`
              : "—"
          }
          context={baselineCopy(
            health.summary?.heartRateVariabilityMs,
            hrvBaseline,
            "ms",
          )}
          progress={Math.min(
            1,
            (health.summary?.heartRateVariabilityMs || 0) / 65,
          )}
        />
        <PerformanceRow
          icon="moon"
          label="Sleep"
          value={formatMinutesLabel(health.summary?.sleepMinutes)}
          context={`Compared with your ${(sleepTargetMinutes / 60).toFixed(0)}-hour target`}
          progress={Math.min(
            1,
            (health.summary?.sleepMinutes || 0) / sleepTargetMinutes,
          )}
          tone="gold"
        />
        <PerformanceRow
          icon="zap"
          label="Recent strain"
          value={
            health.scores.strainScore == null
              ? "—"
              : `${health.scores.strainScore}/100`
          }
          context="Steps, active energy and workout minutes recorded today"
          progress={(health.scores.strainScore || 0) / 100}
          last
        />
      </GlassCard>

      <GlassCard>
        <View style={styles.calloutRow}>
          <HealthGlyph icon="layers" size={42} />
          <View style={styles.flex}>
            <Text style={[NuraiType.body, { color: theme.text }]}>
              Score confidence
            </Text>
            <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
              {health.scores.dataCoveragePercent}% of supported signals are
              available. Missing data lowers confidence; it is not treated as
              poor performance.
            </Text>
          </View>
        </View>
        <HealthProgressRow
          label="Coverage"
          detail={`${health.scores.collectedMetricCount}/${health.scores.totalMetricCount} signals`}
          value={health.scores.dataCoveragePercent / 100}
        />
      </GlassCard>

      <GlassCard accent={theme.scholar}>
        <View style={styles.calloutRow}>
          <AppIcon name="compass" size={21} color={theme.scholar} />
          <View style={styles.flex}>
            <Text style={[NuraiType.body, { color: theme.text }]}>
              Recommendation
            </Text>
            <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
              This is a wellbeing estimate, not a diagnosis. Pain, illness or
              unusual symptoms should always override a score.
            </Text>
          </View>
        </View>
        <NuraiButton
          label="Choose today’s workout"
          icon="arrow-right"
          onPress={() => navigation.navigate("WorkoutHub")}
        />
      </GlassCard>
    </HealthScreenShell>
  );
}

export function HealthSleepScreen() {
  const { theme } = useTheme();
  const health = useHealthData();
  const [mode, setMode] = useState("night");
  const total = health.summary?.sleepMinutes || 0;
  const sleepTarget = (health.profile?.sleepTargetHours || 7) * 60;
  const sleepHistory = health.history
    .map((day) => day.sleepMinutes)
    .filter((value): value is number => Boolean(value));
  const sleepLabels = health.history
    .filter((day) => Boolean(day.sleepMinutes))
    .map((day) =>
      new Date(day.date).toLocaleDateString([], { weekday: "short" }),
    );
  const stages = [
    {
      label: "Awake",
      minutes: health.summary?.awakeSleepMinutes || 0,
      color: theme.scholar,
    },
    {
      label: "REM",
      minutes: health.summary?.remSleepMinutes || 0,
      color: theme.primary,
    },
    {
      label: "Light",
      minutes: health.summary?.lightSleepMinutes || 0,
      color: theme.info,
    },
    {
      label: "Deep",
      minutes: health.summary?.deepSleepMinutes || 0,
      color: "#5670B3",
    },
  ];

  return (
    <HealthScreenShell
      eyebrow="Recovery"
      title="Sleep"
      subtitle="Last recorded night from your connected provider."
      testID="health-sleep-screen"
    >
      <HealthSegmented
        options={[
          { id: "night", label: "Last night" },
          { id: "stages", label: "Stages" },
          { id: "signals", label: "Signals" },
        ]}
        value={mode}
        onChange={setMode}
      />

      <View style={styles.hero}>
        <HealthGlyph icon="moon" size={42} label="Sleep performance" />
        <HealthRing
          value={health.scores.sleepScore}
          size={176}
          color={theme.primary}
          trackColor={theme.backgroundTertiary}
        >
          <AppIcon name="moon" size={19} color={theme.primary} />
          <Text
            style={[NuraiType.display, styles.score, { color: theme.text }]}
          >
            {health.scores.sleepScore ?? "—"}
          </Text>
          <Text style={[NuraiType.caption, { color: theme.textSecondary }]}>
            Sleep score
          </Text>
        </HealthRing>
      </View>

      <HealthDataNotice
        loading={health.loading}
        error={health.error}
        hasData={health.hasData}
        onConnect={() => health.refresh(true)}
      />

      <View style={styles.statGrid}>
        <StatCell
          label="Asleep"
          value={formatMinutesLabel(health.summary?.sleepMinutes)}
        />
        <StatCell
          label="Efficiency"
          value={
            health.summary?.sleepEfficiencyPercent
              ? `${health.summary.sleepEfficiencyPercent}%`
              : "—"
          }
        />
        <StatCell
          label="Interruptions"
          value={health.summary?.sleepInterruptions?.toString() || "—"}
        />
      </View>

      <GlassCard>
        <View style={styles.trendHeader}>
          <View>
            <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
              Sleep duration trend
            </Text>
            <Text style={[NuraiType.metric, { color: theme.text }]}>
              {sleepHistory.length
                ? formatMinutesLabel(sleepHistory[sleepHistory.length - 1])
                : "—"}
            </Text>
          </View>
          <Text
            style={[
              NuraiType.caption,
              styles.trendContext,
              { color: theme.textSecondary },
            ]}
          >
            {total
              ? `${Math.round((total / sleepTarget) * 100)}% of your target last night`
              : "A personal pattern appears after recorded nights."}
          </Text>
        </View>
        <NuraiTrendChart
          data={sleepHistory.map((minutes) => minutes / 60)}
          labels={sleepLabels}
          height={104}
          unit="h"
          goal={sleepTarget / 60}
          emptyLabel="No recorded sleep history yet."
        />
      </GlassCard>

      {mode !== "signals" ? (
        <>
          <HealthSectionTitle title="Sleep stages" />
          <GlassCard>
            {stages.map((stage) => (
              <HealthProgressRow
                key={stage.label}
                label={stage.label}
                value={total ? stage.minutes / total : 0}
                detail={formatMinutesLabel(stage.minutes)}
                color={stage.color}
              />
            ))}
            {!stages.some((stage) => stage.minutes > 0) ? (
              <Text
                style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
              >
                Your provider has not supplied sleep stages for this night.
              </Text>
            ) : null}
          </GlassCard>
        </>
      ) : (
        <GlassCard>
          <MetricListRow
            icon="clock"
            label="Sleep start"
            value={
              health.summary?.sleepStartTime
                ? new Date(health.summary.sleepStartTime).toLocaleTimeString(
                    [],
                    { hour: "2-digit", minute: "2-digit" },
                  )
                : "—"
            }
          />
          <MetricListRow
            icon="sunrise"
            label="Sleep end"
            value={
              health.summary?.sleepEndTime
                ? new Date(health.summary.sleepEndTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"
            }
          />
          <MetricListRow
            icon="wind"
            label="Respiratory rate"
            value={
              health.summary?.respiratoryRate
                ? `${health.summary.respiratoryRate}/min`
                : "—"
            }
            last
          />
        </GlassCard>
      )}

      <HealthSectionTitle title="What the night shows" />
      <GlassCard>
        <PerformanceRow
          icon="clock"
          label="Duration"
          value={formatMinutesLabel(total)}
          context={`Your current target is ${formatMinutesLabel(sleepTarget)}`}
          progress={Math.min(1, total / sleepTarget)}
        />
        <PerformanceRow
          icon="check-circle"
          label="Efficiency"
          value={
            health.summary?.sleepEfficiencyPercent
              ? `${health.summary.sleepEfficiencyPercent}%`
              : "Awaiting data"
          }
          context="Time asleep compared with the recorded sleep window"
          progress={(health.summary?.sleepEfficiencyPercent || 0) / 100}
          tone="gold"
        />
        <PerformanceRow
          icon="bell"
          label="Interruptions"
          value={
            health.summary?.sleepInterruptions?.toString() || "Awaiting data"
          }
          context="Provider-recorded changes during the sleep window"
          last
        />
      </GlassCard>

      <GlassCard accent={theme.scholar}>
        <View style={styles.calloutRow}>
          <AppIcon name="star" size={20} color={theme.scholar} />
          <Text
            style={[
              NuraiType.bodySmall,
              { color: theme.textSecondary, flex: 1 },
            ]}
          >
            Protect a calm wind-down where you can. Night adhkar can be part of
            your routine, while persistent sleep problems deserve clinical
            support.
          </Text>
        </View>
      </GlassCard>
    </HealthScreenShell>
  );
}

export function HealthProgressScreen() {
  const { theme } = useTheme();
  const health = useHealthData(14);
  const [metric, setMetric] = useState("readiness");

  const points = useMemo(() => {
    return health.history.flatMap((day, index) => {
      const scores = health.historyScores[index];
      const value =
        metric === "sleep"
          ? scores?.sleepScore
          : metric === "steps"
            ? Math.min(100, ((day.steps || 0) / 10000) * 100)
            : scores?.readinessScore;
      if (value == null || value <= 0) return [];
      return [
        {
          label: new Date(day.date).toLocaleDateString([], {
            weekday: "short",
          }),
          value,
          raw:
            metric === "steps"
              ? (day.steps || 0).toLocaleString()
              : value == null
                ? "—"
                : `${value}`,
        },
      ];
    });
  }, [health.history, health.historyScores, metric]);
  const average = points.length
    ? Math.round(
        points.reduce((total, point) => total + point.value, 0) / points.length,
      )
    : null;
  const delta =
    points.length >= 2
      ? Math.round(points[points.length - 1].value - points[0].value)
      : null;

  return (
    <HealthScreenShell
      eyebrow="Trends"
      title="Progress"
      subtitle="A quieter view of the recent signals your device actually shared."
      testID="health-progress-screen"
    >
      <HealthSegmented
        options={[
          { id: "readiness", label: "Readiness" },
          { id: "sleep", label: "Sleep" },
          { id: "steps", label: "Steps" },
        ]}
        value={metric}
        onChange={setMetric}
      />

      <HealthDataNotice
        loading={health.loading}
        error={health.error}
        hasData={health.hasData}
        onConnect={() => health.refresh(true)}
      />

      <GlassCard>
        <View style={styles.trendHeader}>
          <View>
            <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
              Recent average
            </Text>
            <Text style={[NuraiType.display, { color: theme.text }]}>
              {average ?? "—"}
            </Text>
          </View>
          <Text style={[NuraiType.caption, { color: theme.textSecondary }]}>
            {points.length
              ? `${points.length} recorded days${delta == null ? "" : ` · ${delta >= 0 ? "+" : ""}${delta} since first`}`
              : "Your trend will appear after a few days of data"}
          </Text>
        </View>
        <NuraiTrendChart
          data={points.map((point) => point.value)}
          labels={points.map((point) => point.label)}
          height={156}
          accent={metric === "steps" ? theme.scholar : theme.primary}
          emptyLabel="History will build after health data is connected."
        />
      </GlassCard>

      <GlassCard
        accent={delta != null && delta < 0 ? theme.warning : theme.primary}
      >
        <View style={styles.calloutRow}>
          <HealthGlyph
            icon={delta != null && delta < 0 ? "trending-down" : "trending-up"}
            size={42}
            tone={delta != null && delta < 0 ? "gold" : "primary"}
          />
          <View style={styles.flex}>
            <Text style={[NuraiType.body, { color: theme.text }]}>
              Performance direction
            </Text>
            <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
              {delta == null
                ? "At least two recorded days are needed before NurAI describes a direction."
                : delta === 0
                  ? "Your first and latest recorded values are level."
                  : `Your latest recorded ${metric} value is ${Math.abs(delta)} points ${delta > 0 ? "above" : "below"} the first value in this view.`}
            </Text>
          </View>
        </View>
      </GlassCard>

      <HealthSectionTitle title="Today’s metrics" />
      <GlassCard>
        <MetricListRow
          icon="moon"
          label="Sleep"
          value={formatMinutesLabel(health.summary?.sleepMinutes)}
        />
        <MetricListRow
          icon="activity"
          label="Steps"
          value={health.summary?.steps?.toLocaleString() || "—"}
        />
        <MetricListRow
          icon="heart"
          label="Resting heart rate"
          value={
            health.summary?.restingHeartRateBpm
              ? `${health.summary.restingHeartRateBpm} bpm`
              : "—"
          }
        />
        <MetricListRow
          icon="zap"
          label="Workouts"
          value={health.summary?.workoutCount?.toString() || "—"}
          last
        />
      </GlassCard>
    </HealthScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: "center", gap: NuraiSpace.md },
  score: { fontVariant: ["tabular-nums"] },
  centerCopy: { textAlign: "center", maxWidth: 340 },
  calloutRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: NuraiSpace.sm,
  },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: NuraiSpace.sm },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  trendContext: { flex: 1, textAlign: "right" },
});
