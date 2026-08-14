import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import {
  GlassCard,
  HealthDataNotice,
  HealthGlyph,
  HealthMetricStrip,
  HealthMetricTile,
  HealthProgressRow,
  HealthRing,
  HealthScreenShell,
  HealthSectionTitle,
  MetricListRow,
  PerformanceRow,
  WorkoutCard,
  formatMinutesLabel,
  useHealthData,
} from "@/components/health/HealthPrimitives";
import { recommendWorkouts } from "@/constants/workoutLibrary";
import { buildHealthMotivation } from "@/services/healthMotivationService";
import {
  NuraiButton,
  NuraiSpace,
  NuraiTrendChart,
  NuraiType,
} from "@/design-system";
import { useTheme } from "@/hooks/useTheme";
import {
  loadTodayWater,
  loadWorkoutHistory,
  type WorkoutHistoryEntry,
} from "@/services/healthLocalLogs";
import { AppIcon } from "@/components/icons";

function scoreLabel(value: number | null) {
  if (value == null) return "Waiting for data";
  if (value >= 80) return "Strong balance";
  if (value >= 65) return "Good foundation";
  if (value >= 45) return "Keep today gentle";
  return "Prioritise recovery";
}

export default function HealthHomeScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const health = useHealthData();
  const [waterMl, setWaterMl] = useState(0);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutHistoryEntry[]>(
    [],
  );

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadTodayWater(), loadWorkoutHistory(3)]).then(
        ([water, workouts]) => {
          setWaterMl(water.reduce((total, entry) => total + entry.ml, 0));
          setRecentWorkouts(workouts);
        },
      );
    }, []),
  );

  const recommendation = recommendWorkouts(health.scores.readinessScore);
  // Built from the day's actual Apple Health / Health Connect reading, so the
  // encouragement always names a number the user can verify.
  const motivation = useMemo(
    () =>
      buildHealthMotivation({
        summary: health.summary ?? null,
        readinessScore: health.scores.readinessScore,
        sleepScore: health.scores.sleepScore,
        status: health.summary?.status ?? null,
        hasData: health.hasData,
      }),
    [
      health.summary,
      health.scores.readinessScore,
      health.scores.sleepScore,
      health.hasData,
    ],
  );
  const primaryWorkout = recommendation.workouts[0];
  const sleep = formatMinutesLabel(health.summary?.sleepMinutes);
  const steps = health.summary?.steps?.toLocaleString() || "--";
  const calories = health.summary?.activeCaloriesKcal
    ? `${Math.round(health.summary.activeCaloriesKcal)}`
    : "--";
  const hydrationTarget = (health.profile?.hydrationTargetCups || 6) * 250;
  const healthScore = health.scores.readinessScore;
  const readinessHistory = useMemo(
    () =>
      health.historyScores
        .map((snapshot) => snapshot.readinessScore)
        .filter((value): value is number => value != null),
    [health.historyScores],
  );
  const readinessLabels = useMemo(
    () =>
      health.history
        .filter(
          (_, index) => health.historyScores[index]?.readinessScore != null,
        )
        .map((day) =>
          new Date(day.date).toLocaleDateString([], { weekday: "short" }),
        ),
    [health.history, health.historyScores],
  );
  const movementProgress = Math.min(1, (health.summary?.steps || 0) / 10000);
  const recoveryProgress = (health.scores.recoveryScore || 0) / 100;
  const readinessDelta =
    readinessHistory.length >= 2
      ? readinessHistory[readinessHistory.length - 1] -
        readinessHistory[readinessHistory.length - 2]
      : null;
  const comparisonLabel =
    readinessDelta == null
      ? "Personal baseline is forming"
      : Math.abs(readinessDelta) < 2
        ? "In line with yesterday"
        : `${readinessDelta > 0 ? "+" : ""}${readinessDelta} from yesterday`;
  const strongestSignal = [
    { label: "Recovery", value: health.scores.recoveryScore },
    { label: "Sleep", value: health.scores.sleepScore },
    { label: "Energy", value: health.scores.energyScore },
    { label: "Stress balance", value: health.scores.stressBalanceScore },
  ]
    .filter(
      (signal): signal is { label: string; value: number } =>
        signal.value != null,
    )
    .sort((a, b) => b.value - a.value)[0];

  return (
    <HealthScreenShell
      eyebrow="Daily performance"
      title="NurAI Health"
      subtitle="Your private recovery, movement and daily-care signals."
      showBack={false}
      testID="health-home-screen"
      right={
        <Pressable
          onPress={() => navigation.navigate("ConnectedHealth")}
          accessibilityRole="button"
          accessibilityLabel="Connected health settings"
          style={({ pressed }) => [
            styles.headerAction,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon name="shield" size={20} color={theme.scholar} />
        </Pressable>
      }
    >
      <View style={styles.hero}>
        <HealthGlyph icon="heart" tone="gold" size={42} label="Wellbeing" />
        <HealthRing
          value={healthScore}
          size={190}
          color={theme.primary}
          trackColor={theme.backgroundTertiary}
          innerColor={theme.scholar}
        >
          <AppIcon name="heart" size={19} color={theme.scholar} />
          <Text
            style={[NuraiType.display, styles.heroScore, { color: theme.text }]}
            accessibilityLabel={
              healthScore == null
                ? "No wellbeing score yet"
                : `Wellbeing score ${healthScore}`
            }
          >
            {healthScore ?? "—"}
          </Text>
          <Text style={[NuraiType.caption, { color: theme.textSecondary }]}>
            Wellbeing score
          </Text>
          <Text style={[NuraiType.overline, { color: theme.primary }]}>
            {scoreLabel(healthScore)}
          </Text>
        </HealthRing>
        <View
          accessible
          accessibilityLabel={`${comparisonLabel}. ${health.scores.dataCoveragePercent} percent signal coverage.`}
          style={[
            styles.scoreContext,
            {
              backgroundColor: `${theme.primary}0D`,
              borderColor: `${theme.primary}24`,
            },
          ]}
        >
          <AppIcon name="activity" size={14} color={theme.primary} />
          <Text style={[NuraiType.caption, { color: theme.textSecondary }]}>
            {comparisonLabel}
          </Text>
          <View
            style={[
              styles.scoreContextDot,
              { backgroundColor: theme.textMuted },
            ]}
          />
          <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
            {health.scores.dataCoveragePercent}% coverage
          </Text>
        </View>
      </View>

      <HealthMetricStrip>
        <HealthMetricTile
          icon="moon"
          label="Sleep"
          value={sleep}
          detail={
            health.scores.sleepScore != null
              ? `${health.scores.sleepScore}/100`
              : "Awaiting"
          }
          onPress={() => navigation.navigate("HealthSleep")}
        />
        <HealthMetricTile
          icon="activity"
          label="Steps"
          value={steps}
          detail={
            health.summary?.steps
              ? `${Math.round(movementProgress * 100)}%`
              : "Awaiting"
          }
          onPress={() => navigation.navigate("HealthProgress")}
        />
        <HealthMetricTile
          icon="zap"
          label="Energy"
          value={calories}
          detail={health.summary?.activeCaloriesKcal ? "kcal" : "Awaiting"}
          onPress={() => navigation.navigate("HealthReadiness")}
        />
        <HealthMetricTile
          icon="droplet"
          label="Hydration"
          value={`${(waterMl / 1000).toFixed(1)} L`}
          detail={`${Math.round(Math.min(1, waterMl / hydrationTarget) * 100)}%`}
          onPress={() => navigation.navigate("Hydration")}
        />
      </HealthMetricStrip>

      <HealthDataNotice
        loading={health.loading}
        error={health.error}
        hasData={health.hasData}
        onConnect={() => health.refresh(true)}
      />

      <View style={styles.section}>
        <HealthSectionTitle title="Your body today" />
        <GlassCard>
          <View style={styles.insightHeader}>
            <HealthGlyph
              icon={motivation.tone === "encourage" ? "award" : "heart"}
              size={44}
            />
            <View style={styles.flex}>
              <Text style={[NuraiType.body, { color: theme.text }]}>
                {motivation.headline}
              </Text>
              <Text
                style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
              >
                {motivation.body}
              </Text>
              {motivation.evidence ? (
                <Text
                  style={[
                    NuraiType.caption,
                    styles.signalExplanation,
                    { color: theme.textMuted },
                  ]}
                >
                  {motivation.evidence}
                </Text>
              ) : null}
            </View>
          </View>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <HealthSectionTitle title="Today’s direction" />
        <GlassCard accent={theme.scholar}>
          <View style={styles.insightHeader}>
            <HealthGlyph icon="compass" tone="gold" size={44} />
            <View style={styles.flex}>
              <Text style={[NuraiType.body, { color: theme.text }]}>
                A gentle next step
              </Text>
              <Text
                style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
              >
                {healthScore == null
                  ? "Connect health data for a personal recovery suggestion. You can still choose a calm workout now."
                  : recommendation.headline}
              </Text>
              <Text
                style={[
                  NuraiType.caption,
                  styles.signalExplanation,
                  { color: theme.textMuted },
                ]}
              >
                {strongestSignal
                  ? `${strongestSignal.label} is today’s strongest available signal at ${strongestSignal.value}/100.`
                  : `No recovery driver is available yet. Missing: ${health.scores.missingMetricLabels.slice(0, 2).join(" and ") || "wearable data"}.`}
              </Text>
            </View>
          </View>
        </GlassCard>
        <WorkoutCard
          title={primaryWorkout.title}
          subtitle={primaryWorkout.subtitle}
          minutes={primaryWorkout.minutes}
          intensity={primaryWorkout.intensity}
          icon={primaryWorkout.icon}
          onPress={() =>
            navigation.navigate("WorkoutDetail", {
              workoutId: primaryWorkout.id,
            })
          }
        />
      </View>

      <View style={styles.section}>
        <HealthSectionTitle title="Performance snapshot" />
        <GlassCard>
          <PerformanceRow
            icon="heart"
            label="Recovery"
            value={
              health.scores.recoveryScore != null
                ? `${health.scores.recoveryScore}/100`
                : "Awaiting data"
            }
            context="Sleep, HRV and resting heart signals"
            progress={recoveryProgress}
          />
          <PerformanceRow
            icon="activity"
            label="Daily movement"
            value={
              health.summary?.steps
                ? `${health.summary.steps.toLocaleString()} steps`
                : "Awaiting data"
            }
            context="Progress against a 10,000-step reference"
            progress={movementProgress}
          />
          <PerformanceRow
            icon="droplet"
            label="Hydration log"
            value={`${(waterMl / 1000).toFixed(1)} of ${(hydrationTarget / 1000).toFixed(1)} L`}
            context="Private entries recorded on this device"
            progress={Math.min(1, waterMl / hydrationTarget)}
            tone="gold"
          />
          <PerformanceRow
            icon="database"
            label="Signal confidence"
            value={`${health.scores.dataCoveragePercent}% coverage`}
            context={`${health.scores.collectedMetricCount} of ${health.scores.totalMetricCount} supported signals available`}
            progress={health.scores.dataCoveragePercent / 100}
            last
          />
        </GlassCard>
      </View>

      <View style={styles.section}>
        <HealthSectionTitle title="Readiness trend" />
        <GlassCard>
          <View style={styles.trendHeading}>
            <View>
              <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
                Recent pattern
              </Text>
              <Text style={[NuraiType.metric, { color: theme.text }]}>
                {readinessHistory.length
                  ? `${readinessHistory[readinessHistory.length - 1]}`
                  : "—"}
              </Text>
            </View>
            <Text
              style={[
                NuraiType.caption,
                styles.trendCopy,
                { color: theme.textSecondary },
              ]}
            >
              {readinessHistory.length >= 2
                ? `${readinessHistory.length} recorded days`
                : "Connect Health and wear your device to build a personal baseline."}
            </Text>
          </View>
          <NuraiTrendChart
            data={readinessHistory}
            labels={readinessLabels}
            height={112}
            emptyLabel="No readiness history yet. Real records will appear here after syncing."
          />
        </GlassCard>
      </View>

      {health.plan ? (
        <View style={styles.section}>
          <HealthSectionTitle title="Care plan" />
          <GlassCard>
            <HealthProgressRow
              label="Today"
              value={health.plan.progress / 100}
              detail={`${health.plan.completed} of ${health.plan.total} complete`}
            />
            <NuraiButton
              label="Open health signals"
              icon="sliders"
              variant="secondary"
              onPress={() => navigation.navigate("HealthSignals")}
            />
          </GlassCard>
        </View>
      ) : null}

      <View style={styles.section}>
        <HealthSectionTitle
          title="Recent movement"
          action={
            <Pressable
              onPress={() => navigation.navigate("WorkoutHub")}
              accessibilityRole="button"
            >
              <Text style={[NuraiType.bodySmall, { color: theme.primary }]}>
                Browse workouts
              </Text>
            </Pressable>
          }
        />
        {recentWorkouts.length ? (
          <GlassCard>
            {recentWorkouts.map((entry, index) => (
              <MetricListRow
                key={entry.id}
                icon="check-circle"
                label={entry.title}
                value={`${Math.round(entry.durationSeconds / 60)} min`}
                status={entry.effort || "Complete"}
                last={index === recentWorkouts.length - 1}
              />
            ))}
          </GlassCard>
        ) : (
          <GlassCard>
            <View style={styles.emptyRow}>
              <AppIcon name="activity" size={22} color={theme.primary} />
              <View style={styles.flex}>
                <Text style={[NuraiType.body, { color: theme.text }]}>
                  No NurAI workouts yet
                </Text>
                <Text
                  style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
                >
                  Completed sessions will appear here.
                </Text>
              </View>
            </View>
          </GlassCard>
        )}
      </View>

      <NuraiButton
        label="Ask the Health Coach"
        icon="message-circle"
        onPress={() => navigation.navigate("HealthCoach")}
      />
    </HealthScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: "center", paddingVertical: NuraiSpace.xs },
  heroScore: { marginTop: 2, fontVariant: ["tabular-nums"] },
  scoreContext: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: NuraiSpace.sm,
    paddingHorizontal: NuraiSpace.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  scoreContextDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 6,
  },
  headerAction: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { gap: NuraiSpace.sm },
  insightHeader: {
    flexDirection: "row",
    gap: NuraiSpace.sm,
    alignItems: "flex-start",
  },
  signalExplanation: { marginTop: 6, lineHeight: 18 },
  trendHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: NuraiSpace.md,
  },
  trendCopy: { flex: 1, textAlign: "right" },
  emptyRow: { flexDirection: "row", gap: NuraiSpace.sm, alignItems: "center" },
  pressed: { opacity: 0.72 },
});
