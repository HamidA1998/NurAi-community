import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import {
  GlassCard,
  HealthGlyph,
  HealthMetricStrip,
  HealthMetricTile,
  HealthScreenShell,
  HealthSectionTitle,
  PerformanceRow,
  StatCell,
  WorkoutCard,
  useHealthData,
} from "@/components/health/HealthPrimitives";
import {
  WORKOUT_CATEGORIES,
  WORKOUT_LIBRARY,
  getWorkoutById,
  recommendWorkouts,
  type WorkoutCategoryId,
  type WorkoutDefinition,
} from "@/constants/workoutLibrary";
import {
  NuraiButton,
  NuraiPill,
  NuraiSearchField,
  NuraiSpace,
  NuraiTrendChart,
  NuraiType,
} from "@/design-system";
import { useTheme } from "@/hooks/useTheme";
import {
  addWorkoutHistoryEntry,
  clearActiveWorkoutSession,
  loadActiveWorkoutSession,
  loadWorkoutHistory,
  saveActiveWorkoutSession,
  updateWorkoutHistoryEffort,
  type WorkoutHistoryEntry,
} from "@/services/healthLocalLogs";
import { AppIcon } from "@/components/icons";

function durationLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function estimateReps(label: string) {
  const match = label.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function MissingWorkout() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  return (
    <HealthScreenShell
      eyebrow="Movement"
      title="Workout unavailable"
      subtitle="This workout could not be found."
    >
      <GlassCard>
        <View style={styles.emptyState}>
          <AppIcon name="alert-circle" size={28} color={theme.warning} />
          <Text style={[NuraiType.body, { color: theme.text }]}>
            Choose another workout from the library.
          </Text>
          <NuraiButton
            label="Open workout hub"
            onPress={() => navigation.navigate("WorkoutHub")}
          />
        </View>
      </GlassCard>
    </HealthScreenShell>
  );
}

export function WorkoutHubScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const health = useHealthData();
  const [category, setCategory] = useState<WorkoutCategoryId>("for_you");
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState<WorkoutHistoryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadWorkoutHistory(30).then(setRecent);
    }, []),
  );

  const recommended = recommendWorkouts(health.scores.readinessScore);
  const workouts = useMemo(() => {
    const source =
      category === "for_you"
        ? recommended.workouts
        : WORKOUT_LIBRARY.filter((item) => item.category === category);
    const query = search.trim().toLowerCase();
    if (!query) return source;
    return source.filter((item) =>
      `${item.title} ${item.subtitle} ${item.focus} ${item.equipment}`
        .toLowerCase()
        .includes(query),
    );
  }, [category, recommended.workouts, search]);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = recent.filter(
    (entry) => new Date(entry.completedAt).getTime() >= sevenDaysAgo,
  );
  const weeklyMinutes = Math.round(
    thisWeek.reduce((total, entry) => total + entry.durationSeconds, 0) / 60,
  );
  const recentDurations = [...recent]
    .reverse()
    .slice(-7)
    .map((entry) => Math.max(1, Math.round(entry.durationSeconds / 60)));

  return (
    <HealthScreenShell
      eyebrow="Movement"
      title="Workout hub"
      subtitle="Purposeful sessions without streak pressure or leaderboards."
      testID="workout-hub-screen"
    >
      <HealthMetricStrip>
        <HealthMetricTile
          icon="activity"
          label="Readiness"
          value={health.scores.readinessScore?.toString() || "—"}
          detail={health.scores.readinessScore == null ? "Awaiting" : "/100"}
        />
        <HealthMetricTile
          icon="check-circle"
          label="Sessions"
          value={`${thisWeek.length}`}
          detail="last 7 days"
        />
        <HealthMetricTile
          icon="clock"
          label="Minutes"
          value={`${weeklyMinutes}`}
          detail="last 7 days"
        />
        <HealthMetricTile
          icon="compass"
          label="Suggested"
          value={`${recommended.workouts[0]?.minutes || "—"}`}
          detail="minutes"
        />
      </HealthMetricStrip>
      <NuraiSearchField
        label="Search workouts"
        placeholder="Search focus or equipment"
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
      />
      <View style={styles.categoryWrap}>
        {WORKOUT_CATEGORIES.map((item) => {
          const active = item.id === category;
          return (
            <Pressable
              key={item.id}
              onPress={() => setCategory(item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: active
                    ? theme.primaryMuted
                    : theme.surfaceGlass,
                  borderColor: active
                    ? theme.primaryBorder
                    : theme.borderSubtle,
                },
              ]}
            >
              <Text
                style={[
                  NuraiType.caption,
                  { color: active ? theme.primary : theme.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {category === "for_you" ? (
        <GlassCard accent={theme.primary}>
          <View style={styles.calloutRow}>
            <AppIcon name="compass" size={21} color={theme.primary} />
            <View style={styles.flex}>
              <Text style={[NuraiType.body, { color: theme.text }]}>
                {recommended.headline}
              </Text>
              <Text
                style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
              >
                {health.scores.readinessScore == null
                  ? "This is a general starting point until recovery data is connected."
                  : `Based on today’s readiness score of ${health.scores.readinessScore}.`}
              </Text>
            </View>
          </View>
        </GlassCard>
      ) : null}

      <View style={styles.section}>
        <HealthSectionTitle
          title={
            search
              ? "Results"
              : category === "for_you"
                ? "For today"
                : WORKOUT_CATEGORIES.find((item) => item.id === category)
                    ?.label || "Workouts"
          }
        />
        {workouts.length ? (
          workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              {...workout}
              onPress={() =>
                navigation.navigate("WorkoutDetail", { workoutId: workout.id })
              }
            />
          ))
        ) : (
          <GlassCard>
            <View style={styles.emptyState}>
              <AppIcon name="search" size={24} color={theme.iconMuted} />
              <Text
                style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
              >
                No workouts match that search.
              </Text>
            </View>
          </GlassCard>
        )}
      </View>

      <View style={styles.section}>
        <HealthSectionTitle title="Recent sessions" />
        <GlassCard>
          {recent.length ? (
            recent.slice(0, 4).map((entry, index) => (
              <View
                key={entry.id}
                style={[
                  styles.recentRow,
                  index < Math.min(recent.length, 4) - 1 && {
                    borderBottomColor: theme.borderSubtle,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <AppIcon name="check-circle" size={18} color={theme.primary} />
                <View style={styles.flex}>
                  <Text style={[NuraiType.bodySmall, { color: theme.text }]}>
                    {entry.title}
                  </Text>
                  <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
                    {new Date(entry.completedAt).toLocaleDateString()} ·{" "}
                    {Math.round(entry.durationSeconds / 60)} min
                  </Text>
                </View>
                <Text
                  style={[NuraiType.caption, { color: theme.textSecondary }]}
                >
                  {entry.effort || "Complete"}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
              Your completed NurAI sessions will appear here.
            </Text>
          )}
        </GlassCard>
      </View>

      <View style={styles.section}>
        <HealthSectionTitle title="Training pattern" />
        <GlassCard>
          <View style={styles.trendHeader}>
            <View>
              <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
                Recent duration
              </Text>
              <Text style={[NuraiType.metric, { color: theme.text }]}>
                {recentDurations.length
                  ? `${recentDurations[recentDurations.length - 1]} min`
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
              Private NurAI workout history
            </Text>
          </View>
          <NuraiTrendChart
            data={recentDurations}
            height={100}
            unit="min"
            emptyLabel="Complete a workout to start your training pattern."
          />
        </GlassCard>
      </View>
    </HealthScreenShell>
  );
}

export function WorkoutDetailScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const workout = getWorkoutById(route.params?.workoutId);
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([]);
  useFocusEffect(
    useCallback(() => {
      loadWorkoutHistory(30).then((entries) =>
        setHistory(entries.filter((entry) => entry.workoutId === workout?.id)),
      );
    }, [workout?.id]),
  );
  if (!workout) return <MissingWorkout />;
  const totalSets = workout.exercises.reduce(
    (total, exercise) => total + exercise.sets,
    0,
  );
  const latest = history[0];

  return (
    <HealthScreenShell
      eyebrow="Workout"
      title={workout.title}
      subtitle={workout.subtitle}
      testID="workout-detail-screen"
    >
      <GlassCard accent={theme.primary}>
        <View style={styles.workoutHero}>
          <HealthGlyph
            icon={workout.icon}
            size={72}
            label={`${workout.title} identity`}
          />
          <View style={styles.flex}>
            <Text style={[NuraiType.sectionTitle, { color: theme.text }]}>
              {workout.focus}
            </Text>
            <View style={styles.pillRow}>
              <NuraiPill label={`${workout.minutes} min`} icon="clock" />
              <NuraiPill label={workout.intensity} icon="bar-chart" />
              <NuraiPill label={workout.equipment} icon="tool" />
            </View>
          </View>
        </View>
      </GlassCard>

      <HealthMetricStrip>
        <HealthMetricTile
          icon="clock"
          label="Duration"
          value={`${workout.minutes}`}
          detail="minutes"
        />
        <HealthMetricTile
          icon="bar-chart"
          label="Intensity"
          value={workout.intensity}
          detail="planned"
        />
        <HealthMetricTile
          icon="list"
          label="Exercises"
          value={`${workout.exercises.length}`}
          detail="movements"
        />
        <HealthMetricTile
          icon="repeat"
          label="Sets"
          value={`${totalSets}`}
          detail="planned"
        />
      </HealthMetricStrip>

      {latest ? (
        <>
          <HealthSectionTitle title="Your performance" />
          <GlassCard>
            <PerformanceRow
              icon="check-circle"
              label="Completed sessions"
              value={`${history.length}`}
              context={`Last completed ${new Date(latest.completedAt).toLocaleDateString()}`}
              progress={Math.min(1, history.length / 6)}
            />
            <PerformanceRow
              icon="clock"
              label="Latest duration"
              value={durationLabel(latest.durationSeconds)}
              context={`Planned session length is ${workout.minutes} minutes`}
              last
            />
          </GlassCard>
        </>
      ) : null}

      <HealthSectionTitle title="Planned muscle emphasis" />
      <GlassCard>
        {workout.muscleGroups.map((group) => (
          <View key={group.name} style={styles.focusRow}>
            <Text
              style={[
                NuraiType.bodySmall,
                { color: theme.textSecondary, width: 90 },
              ]}
            >
              {group.name}
            </Text>
            <View
              style={[
                styles.focusTrack,
                { backgroundColor: theme.backgroundTertiary },
              ]}
            >
              <View
                style={[
                  styles.focusFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${group.share * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
              {Math.round(group.share * 100)}%
            </Text>
          </View>
        ))}
      </GlassCard>

      <HealthSectionTitle title="Exercises" />
      <GlassCard>
        {workout.exercises.map((exercise, index) => (
          <View
            key={exercise.id}
            style={[
              styles.exerciseRow,
              index < workout.exercises.length - 1 && {
                borderBottomColor: theme.borderSubtle,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View
              style={[
                styles.stepNumber,
                { backgroundColor: theme.primaryMuted },
              ]}
            >
              <Text style={[NuraiType.bodySmall, { color: theme.primary }]}>
                {index + 1}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text style={[NuraiType.bodySmall, { color: theme.text }]}>
                {exercise.name}
              </Text>
              <Text style={[NuraiType.caption, { color: theme.textSecondary }]}>
                {exercise.sets} sets · {exercise.repsLabel}
              </Text>
            </View>
            <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
              {exercise.restSeconds
                ? `${exercise.restSeconds}s rest`
                : "Continuous"}
            </Text>
          </View>
        ))}
      </GlassCard>

      {!latest ? (
        <GlassCard>
          <View style={styles.calloutRow}>
            <AppIcon name="activity" size={20} color={theme.primary} />
            <View style={styles.flex}>
              <Text style={[NuraiType.bodySmall, { color: theme.text }]}>
                Your first session starts your progress history
              </Text>
              <Text style={[NuraiType.caption, { color: theme.textSecondary }]}>
                Begin when you are ready. About {workout.minutes} minutes is
                planned, and you can pause at any time.
              </Text>
            </View>
          </View>
        </GlassCard>
      ) : null}

      <NuraiButton
        label="Start workout"
        icon="play"
        onPress={() =>
          navigation.navigate("LiveWorkout", { workoutId: workout.id })
        }
      />
      <Text
        style={[
          NuraiType.caption,
          styles.disclaimer,
          { color: theme.textMuted },
        ]}
      >
        Stop if you feel pain, dizziness, chest symptoms or unusual
        breathlessness. Adapt movements to your ability.
      </Text>
    </HealthScreenShell>
  );
}

type SessionStep = { exerciseIndex: number; set: number };

function buildSessionSteps(workout: WorkoutDefinition): SessionStep[] {
  return workout.exercises.flatMap((exercise, exerciseIndex) =>
    Array.from({ length: exercise.sets }, (_, index) => ({
      exerciseIndex,
      set: index + 1,
    })),
  );
}

export function LiveWorkoutScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const workout = getWorkoutById(route.params?.workoutId);
  const sessionSteps = useMemo(
    () => (workout ? buildSessionSteps(workout) : []),
    [workout],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const startedAt = useRef(Date.now());
  const stepIndexRef = useRef(0);
  const elapsedRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    loadActiveWorkoutSession()
      .then((saved) => {
        if (!mounted || !workout || saved?.workoutId !== workout.id) return;
        const restoredStep = Math.min(
          Math.max(0, saved.stepIndex),
          Math.max(0, sessionSteps.length - 1),
        );
        setStepIndex(restoredStep);
        setElapsed(saved.elapsedSeconds);
        setPaused(true);
        startedAt.current = Date.now() - saved.elapsedSeconds * 1000;
        setRecovered(true);
      })
      .finally(() => mounted && setHydrated(true));
    return () => {
      mounted = false;
    };
  }, [sessionSteps.length, workout]);

  useEffect(() => {
    stepIndexRef.current = stepIndex;
    elapsedRef.current = elapsed;
    pausedRef.current = paused;
  }, [elapsed, paused, stepIndex]);

  useEffect(() => {
    if (!hydrated || paused) return;
    const timer = setInterval(
      () => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [hydrated, paused]);

  useEffect(() => {
    if (!hydrated || !workout || elapsed === 0 || elapsed % 10 !== 0) return;
    void saveActiveWorkoutSession({
      workoutId: workout.id,
      stepIndex,
      elapsedSeconds: elapsed,
      paused,
    });
  }, [elapsed, hydrated, paused, stepIndex, workout]);

  useEffect(() => {
    if (!hydrated || !workout) return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") return;
      void saveActiveWorkoutSession({
        workoutId: workout.id,
        stepIndex: stepIndexRef.current,
        elapsedSeconds: elapsedRef.current,
        paused: pausedRef.current,
      });
    });
    return () => subscription.remove();
  }, [hydrated, workout]);

  if (!workout || !sessionSteps.length) return <MissingWorkout />;
  const step = sessionSteps[Math.min(stepIndex, sessionSteps.length - 1)];
  const exercise = workout.exercises[step.exerciseIndex];
  const isLast = stepIndex === sessionSteps.length - 1;
  const progress = (stepIndex + 1) / sessionSteps.length;

  const completeWorkout = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const totalReps = workout.exercises.reduce(
        (total, item) => total + item.sets * estimateReps(item.repsLabel),
        0,
      );
      const entry = await addWorkoutHistoryEntry({
        workoutId: workout.id,
        title: workout.title,
        durationSeconds: Math.max(1, elapsed),
        totalSets: sessionSteps.length,
        totalReps,
        totalVolumeKg: 0,
      });
      await clearActiveWorkoutSession();
      navigation.replace("WorkoutSummary", {
        workoutId: workout.id,
        historyId: entry.id,
        durationSeconds: entry.durationSeconds,
        totalSets: entry.totalSets,
        totalReps: entry.totalReps,
      });
    } catch {
      Alert.alert(
        "Could not save workout",
        "Your session is still open. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const advance = () => {
    if (isLast) completeWorkout();
    else {
      const nextStep = stepIndex + 1;
      setStepIndex(nextStep);
      void saveActiveWorkoutSession({
        workoutId: workout.id,
        stepIndex: nextStep,
        elapsedSeconds: elapsed,
        paused,
      });
    }
  };

  return (
    <HealthScreenShell
      eyebrow={workout.title}
      title={exercise.name}
      subtitle={`Set ${step.set} of ${exercise.sets}`}
      testID="live-workout-screen"
    >
      <View
        style={[
          styles.sessionProgress,
          { backgroundColor: theme.backgroundTertiary },
        ]}
      >
        <View
          style={[
            styles.sessionProgressFill,
            { backgroundColor: theme.primary, width: `${progress * 100}%` },
          ]}
        />
      </View>
      {recovered ? (
        <GlassCard accent={theme.primary}>
          <View style={styles.calloutRow}>
            <AppIcon name="rotate-ccw" size={20} color={theme.primary} />
            <View style={styles.flex}>
              <Text style={[NuraiType.body, { color: theme.text }]}>
                Session recovered
              </Text>
              <Text
                style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
              >
                Your last completed set and elapsed time were restored. The
                timer is paused until you choose Resume.
              </Text>
            </View>
          </View>
        </GlassCard>
      ) : null}
      <View style={styles.sessionHero}>
        <HealthGlyph
          icon={workout.icon}
          size={54}
          label={`${exercise.name} exercise`}
        />
        <Text style={[NuraiType.overline, { color: theme.primary }]}>
          CURRENT SET
        </Text>
        <Text
          style={[
            NuraiType.display,
            styles.exerciseName,
            { color: theme.text },
          ]}
        >
          {exercise.name}
        </Text>
        <Text style={[styles.reps, { color: theme.primary }]}>
          {exercise.repsLabel}
        </Text>
        <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
          {exercise.muscles.join(" · ")}
        </Text>
      </View>

      <GlassCard>
        <PerformanceRow
          icon="layers"
          label="Session progress"
          value={`${Math.round(progress * 100)}%`}
          context={`${stepIndex + 1} of ${sessionSteps.length} planned sets`}
          progress={progress}
        />
        <PerformanceRow
          icon="arrow-right"
          label="Next"
          value={
            isLast
              ? "Finish workout"
              : workout.exercises[sessionSteps[stepIndex + 1].exerciseIndex]
                  .name
          }
          context={
            isLast
              ? "Save this session and review performance"
              : `Set ${sessionSteps[stepIndex + 1].set} follows`
          }
          last
        />
      </GlassCard>

      <GlassCard>
        <View style={styles.sessionStats}>
          <StatCell label="Elapsed" value={durationLabel(elapsed)} />
          <StatCell
            label="Set"
            value={`${stepIndex + 1}/${sessionSteps.length}`}
          />
          <StatCell
            label="Rest after"
            value={exercise.restSeconds ? `${exercise.restSeconds}s` : "—"}
          />
        </View>
      </GlassCard>

      <View style={styles.sessionControls}>
        <NuraiButton
          label={paused ? "Resume" : "Pause"}
          icon={paused ? "play" : "pause"}
          variant="secondary"
          style={styles.controlButton}
          onPress={() => {
            const nextPaused = !paused;
            if (!nextPaused) startedAt.current = Date.now() - elapsed * 1000;
            setPaused(nextPaused);
            setRecovered(false);
            void saveActiveWorkoutSession({
              workoutId: workout.id,
              stepIndex,
              elapsedSeconds: elapsed,
              paused: nextPaused,
            });
          }}
        />
        <NuraiButton
          label={isLast ? "Finish workout" : "Complete set"}
          icon="check"
          style={styles.completeButton}
          onPress={advance}
          loading={saving}
        />
      </View>
      <NuraiButton
        label="End without saving"
        variant="ghost"
        onPress={() =>
          Alert.alert("End workout?", "This session will not be saved.", [
            { text: "Keep going", style: "cancel" },
            {
              text: "End",
              style: "destructive",
              onPress: () => {
                void clearActiveWorkoutSession();
                navigation.goBack();
              },
            },
          ])
        }
      />
    </HealthScreenShell>
  );
}

export function WorkoutSummaryScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const workout = getWorkoutById(route.params?.workoutId);
  const [effort, setEffort] = useState<WorkoutHistoryEntry["effort"]>();
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([]);
  useFocusEffect(
    useCallback(() => {
      loadWorkoutHistory(20).then((entries) =>
        setHistory(entries.filter((entry) => entry.workoutId === workout?.id)),
      );
    }, [workout?.id]),
  );
  if (!workout) return <MissingWorkout />;
  const durationSeconds = route.params?.durationSeconds || 0;
  const plannedSeconds = workout.minutes * 60;
  const durationDifference = Math.round(
    (durationSeconds - plannedSeconds) / 60,
  );
  const durationHistory = [...history]
    .reverse()
    .slice(-7)
    .map((entry) => Math.max(1, Math.round(entry.durationSeconds / 60)));

  const chooseEffort = (value: NonNullable<WorkoutHistoryEntry["effort"]>) => {
    setEffort(value);
    if (route.params?.historyId)
      updateWorkoutHistoryEffort(route.params.historyId, value);
  };

  return (
    <HealthScreenShell
      eyebrow="Completed"
      title="Workout summary"
      subtitle="A private record of the session you just finished."
      testID="workout-summary-screen"
    >
      <View style={styles.summaryHero}>
        <HealthGlyph
          icon="check"
          tone="gold"
          size={88}
          label="Workout completed"
        />
        <Text style={[NuraiType.largeTitle, { color: theme.text }]}>
          {workout.title}
        </Text>
        <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
          Session completed. Recover well.
        </Text>
      </View>

      <View style={styles.statGrid}>
        <StatCell label="Duration" value={durationLabel(durationSeconds)} />
        <StatCell label="Sets" value={`${route.params?.totalSets || 0}`} />
        <StatCell
          label="Reps logged"
          value={`${route.params?.totalReps || 0}`}
        />
      </View>

      <HealthSectionTitle title="Session performance" />
      <GlassCard>
        <PerformanceRow
          icon="clock"
          label="Time against plan"
          value={`${durationDifference >= 0 ? "+" : ""}${durationDifference} min`}
          context={`${durationLabel(durationSeconds)} completed against a ${workout.minutes}-minute plan`}
          progress={Math.min(1, durationSeconds / Math.max(1, plannedSeconds))}
        />
        <PerformanceRow
          icon="check-circle"
          label="Set completion"
          value={`${route.params?.totalSets || 0}/${workout.exercises.reduce((total, exercise) => total + exercise.sets, 0)}`}
          context={`${route.params?.totalReps || 0} estimated repetitions from the written plan`}
          progress={1}
          last
        />
      </GlassCard>

      <GlassCard>
        <View style={styles.trendHeader}>
          <View>
            <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
              Workout history
            </Text>
            <Text style={[NuraiType.metric, { color: theme.text }]}>
              {history.length} sessions
            </Text>
          </View>
          <Text
            style={[
              NuraiType.caption,
              styles.trendCopy,
              { color: theme.textSecondary },
            ]}
          >
            Duration by completion
          </Text>
        </View>
        <NuraiTrendChart
          data={durationHistory}
          height={96}
          unit="min"
          emptyLabel="This completed session will begin your trend."
        />
      </GlassCard>

      <HealthSectionTitle title="Muscle focus" />
      <GlassCard>
        {workout.muscleGroups.map((group) => (
          <View key={group.name} style={styles.focusRow}>
            <Text
              style={[
                NuraiType.bodySmall,
                { color: theme.textSecondary, width: 90 },
              ]}
            >
              {group.name}
            </Text>
            <View
              style={[
                styles.focusTrack,
                { backgroundColor: theme.backgroundTertiary },
              ]}
            >
              <View
                style={[
                  styles.focusFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${group.share * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
              {Math.round(group.share * 100)}%
            </Text>
          </View>
        ))}
      </GlassCard>

      <HealthSectionTitle title="How did it feel?" />
      <View style={styles.effortRow}>
        {(["easy", "moderate", "good", "great"] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => chooseEffort(item)}
            accessibilityRole="button"
            accessibilityState={{ selected: effort === item }}
            style={[
              styles.effortButton,
              {
                backgroundColor:
                  effort === item ? theme.primaryMuted : theme.surfaceGlass,
                borderColor:
                  effort === item ? theme.primary : theme.borderSubtle,
              },
            ]}
          >
            <AppIcon
              name={
                item === "great"
                  ? "smile"
                  : item === "easy"
                    ? "feather"
                    : "circle"
              }
              size={18}
              color={effort === item ? theme.primary : theme.iconMuted}
            />
            <Text
              style={[
                NuraiType.caption,
                {
                  color: effort === item ? theme.primary : theme.textSecondary,
                  textTransform: "capitalize",
                },
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <NuraiButton
        label="Done"
        onPress={() => navigation.navigate("MuslimHealth")}
      />
    </HealthScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: NuraiSpace.sm },
  categoryWrap: { flexDirection: "row", flexWrap: "wrap", gap: NuraiSpace.xs },
  categoryPill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 40,
    paddingHorizontal: NuraiSpace.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  calloutRow: {
    flexDirection: "row",
    gap: NuraiSpace.sm,
    alignItems: "flex-start",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: NuraiSpace.sm,
    paddingVertical: NuraiSpace.lg,
  },
  recentRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    paddingVertical: NuraiSpace.xs,
  },
  workoutHero: {
    flexDirection: "row",
    gap: NuraiSpace.md,
    alignItems: "center",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: NuraiSpace.xs,
    marginTop: NuraiSpace.sm,
  },
  focusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    minHeight: 42,
  },
  focusTrack: { flex: 1, height: 7, borderRadius: 999, overflow: "hidden" },
  focusFill: { height: "100%", borderRadius: 999 },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    minHeight: 66,
    paddingVertical: NuraiSpace.xs,
  },
  stepNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  disclaimer: { textAlign: "center", paddingHorizontal: NuraiSpace.md },
  sessionProgress: { height: 6, borderRadius: 999, overflow: "hidden" },
  sessionProgressFill: { height: "100%", borderRadius: 999 },
  sessionHero: {
    alignItems: "center",
    gap: NuraiSpace.sm,
    paddingVertical: NuraiSpace.xl,
  },
  exerciseName: { textAlign: "center" },
  reps: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 40,
    lineHeight: 50,
    textAlign: "center",
  },
  sessionStats: { flexDirection: "row", gap: NuraiSpace.sm },
  sessionControls: { flexDirection: "row", gap: NuraiSpace.sm },
  controlButton: { flex: 0.8 },
  completeButton: { flex: 1.4 },
  summaryHero: {
    alignItems: "center",
    gap: NuraiSpace.sm,
    paddingVertical: NuraiSpace.md,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: NuraiSpace.md,
  },
  trendCopy: { flex: 1, textAlign: "right" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: NuraiSpace.sm },
  effortRow: { flexDirection: "row", gap: NuraiSpace.xs },
  effortButton: {
    flex: 1,
    minHeight: 72,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    gap: NuraiSpace.xxs,
  },
});
