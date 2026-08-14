import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
  formatMinutesLabel,
  useHealthData,
} from "@/components/health/HealthPrimitives";
import {
  NuraiBottomSheet,
  NuraiButton,
  NuraiRadius,
  NuraiSpace,
  NuraiType,
} from "@/design-system";
import { useTheme } from "@/hooks/useTheme";
import {
  addMealEntry,
  addWaterEntry,
  loadTodayMeals,
  loadTodayWater,
  removeMealEntry,
  removeWaterEntry,
  type MealEntry,
  type WaterEntry,
} from "@/services/healthLocalLogs";
import { AppIcon, type AppIconName } from "@/components/icons";

function healthContextLines(health: ReturnType<typeof useHealthData>) {
  const lines = [
    `Readiness: ${health.scores.readinessScore ?? "not available"}`,
    `Sleep: ${formatMinutesLabel(health.summary?.sleepMinutes)}`,
    `Steps: ${health.summary?.steps ?? "not available"}`,
    `Resting heart rate: ${health.summary?.restingHeartRateBpm ?? "not available"}`,
    `HRV: ${health.summary?.heartRateVariabilityMs ?? "not available"}`,
  ];
  return lines;
}

export function HealthCoachScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const health = useHealthData();
  const prompts = [
    "How should I balance movement and recovery today?",
    "Help me build a calm wind-down before sleep.",
    "Suggest a gentle hydration and walking plan for today.",
  ];
  const ask = (prompt: string) =>
    navigation.navigate("PersonalGuide", {
      visiblePrompt: prompt,
      privateContextLines: healthContextLines(health),
    });
  const briefing =
    health.scores.readinessScore == null
      ? "Connect Health to build a private performance briefing from real signals."
      : health.scores.readinessScore >= 75
        ? "Recovery looks supportive today. A purposeful session can fit if your body feels well."
        : health.scores.readinessScore >= 50
          ? "Your signals suggest a balanced day: moderate movement with room for recovery."
          : "Your recorded signals favour recovery, gentle movement and a lower-pressure day.";

  return (
    <HealthScreenShell
      eyebrow="Private guidance"
      title="Health Coach"
      subtitle="Wellbeing support with clear medical and religious boundaries."
      testID="health-coach-screen"
    >
      <GlassCard accent={theme.scholar}>
        <View style={styles.coachIntro}>
          <HealthGlyph
            icon="message-circle"
            tone="gold"
            size={50}
            label="Health Coach"
          />
          <View style={styles.flex}>
            <Text style={[NuraiType.body, { color: theme.text }]}>
              Today’s private briefing
            </Text>
            <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
              {briefing}
            </Text>
          </View>
        </View>
      </GlassCard>

      <HealthDataNotice
        loading={health.loading}
        error={health.error}
        hasData={health.hasData}
        onConnect={() => health.refresh(true)}
      />

      <HealthSectionTitle title="Performance at a glance" />
      <HealthMetricStrip>
        <HealthMetricTile
          icon="activity"
          label="Readiness"
          value={health.scores.readinessScore?.toString() || "—"}
          detail={health.scores.readinessScore == null ? "Awaiting" : "/100"}
        />
        <HealthMetricTile
          icon="moon"
          label="Sleep"
          value={formatMinutesLabel(health.summary?.sleepMinutes)}
          detail={
            health.scores.sleepScore == null
              ? "Awaiting"
              : `${health.scores.sleepScore}/100`
          }
        />
        <HealthMetricTile
          icon="navigation"
          label="Steps"
          value={health.summary?.steps?.toLocaleString() || "—"}
          detail={health.summary?.steps ? "today" : "Awaiting"}
        />
        <HealthMetricTile
          icon="database"
          label="Coverage"
          value={`${health.scores.dataCoveragePercent}%`}
          detail={`${health.scores.collectedMetricCount}/${health.scores.totalMetricCount}`}
          tone="gold"
        />
      </HealthMetricStrip>

      <GlassCard>
        <PerformanceRow
          icon="heart"
          label="Recovery"
          value={
            health.scores.recoveryScore == null
              ? "Awaiting data"
              : `${health.scores.recoveryScore}/100`
          }
          context="Built from recorded sleep and heart recovery signals"
          progress={(health.scores.recoveryScore || 0) / 100}
        />
        <PerformanceRow
          icon="zap"
          label="Current strain"
          value={
            health.scores.strainScore == null
              ? "Awaiting data"
              : `${health.scores.strainScore}/100`
          }
          context="Movement and workout demand recorded today"
          progress={(health.scores.strainScore || 0) / 100}
          tone="gold"
          last
        />
      </GlassCard>

      <HealthSectionTitle title="Ask with one tap" />
      <View style={styles.section}>
        {prompts.map((prompt) => (
          <Pressable
            key={prompt}
            onPress={() => ask(prompt)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.promptCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
              pressed && styles.pressed,
            ]}
          >
            <AppIcon name="arrow-up-right" size={18} color={theme.primary} />
            <Text style={[NuraiType.bodySmall, { color: theme.text, flex: 1 }]}>
              {prompt}
            </Text>
          </Pressable>
        ))}
      </View>

      <GlassCard>
        <View style={styles.boundaryRow}>
          <AppIcon name="shield" size={20} color={theme.primary} />
          <Text
            style={[NuraiType.caption, { color: theme.textSecondary, flex: 1 }]}
          >
            Health signals are sent as private context only when you choose a
            question. The coach can explain patterns and suggest routines; it
            cannot diagnose, prescribe, change medication or replace emergency
            or clinical help.
          </Text>
        </View>
      </GlassCard>
      <NuraiButton
        label="Ask my own question"
        icon="edit-3"
        onPress={() => ask("")}
      />
    </HealthScreenShell>
  );
}

export function HydrationScreen() {
  const { theme } = useTheme();
  const health = useHealthData();
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => loadTodayWater().then(setEntries), []);
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  const total = entries.reduce((sum, entry) => sum + entry.ml, 0);
  const target = (health.profile?.hydrationTargetCups || 6) * 250;
  const progress = target ? Math.min(1, total / target) : 0;
  const averageServing = entries.length
    ? Math.round(total / entries.length)
    : 0;
  const remaining = Math.max(0, target - total);
  const latestEntry = entries.length
    ? entries.reduce((latest, entry) =>
        new Date(entry.at).getTime() > new Date(latest.at).getTime()
          ? entry
          : latest,
      )
    : null;

  const add = async (ml: number) => {
    if (busy) return;
    setBusy(true);
    try {
      setEntries(await addWaterEntry(ml));
    } finally {
      setBusy(false);
    }
  };

  return (
    <HealthScreenShell
      eyebrow="Daily care"
      title="Hydration"
      subtitle="A simple private log stored on this device."
      testID="hydration-screen"
    >
      <View style={styles.ringHero}>
        <HealthGlyph icon="droplet" size={42} label="Hydration performance" />
        <HealthRing
          value={Math.round(progress * 100)}
          size={188}
          color={theme.primary}
          trackColor={theme.backgroundTertiary}
          innerColor={theme.scholar}
        >
          <AppIcon name="droplet" size={23} color={theme.primary} />
          <Text style={[NuraiType.display, { color: theme.text }]}>
            {(total / 1000).toFixed(1)} L
          </Text>
          <Text style={[NuraiType.caption, { color: theme.textSecondary }]}>
            of {(target / 1000).toFixed(1)} L
          </Text>
          <Text style={[NuraiType.overline, { color: theme.primary }]}>
            {Math.round(progress * 100)}%
          </Text>
        </HealthRing>
      </View>

      <HealthMetricStrip>
        <HealthMetricTile
          icon="target"
          label="Remaining"
          value={
            remaining >= 1000
              ? `${(remaining / 1000).toFixed(1)} L`
              : `${remaining} ml`
          }
          detail="local goal"
        />
        <HealthMetricTile
          icon="coffee"
          label="Average"
          value={averageServing ? `${averageServing} ml` : "—"}
          detail="per entry"
        />
        <HealthMetricTile
          icon="clock"
          label="Last drink"
          value={
            latestEntry
              ? new Date(latestEntry.at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
          detail={latestEntry ? `${latestEntry.ml} ml` : "No entry"}
          tone="gold"
        />
        <HealthMetricTile
          icon="database"
          label="Provider"
          value={
            health.summary?.dietaryWaterMl
              ? `${Math.round(health.summary.dietaryWaterMl)} ml`
              : "—"
          }
          detail="Health data"
        />
      </HealthMetricStrip>

      <HealthSectionTitle title="Quick add" />
      <View style={styles.quickAddRow}>
        {[250, 500, 750, 1000].map((ml) => (
          <Pressable
            key={ml}
            disabled={busy}
            onPress={() => add(ml)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${ml} millilitres`}
            style={({ pressed }) => [
              styles.quickAdd,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[NuraiType.bodySmall, { color: theme.text }]}>
              {ml === 1000 ? "1 L" : `${ml} ml`}
            </Text>
          </Pressable>
        ))}
      </View>

      <HealthSectionTitle title="Today" />
      <GlassCard>
        {entries.length ? (
          [...entries].reverse().map((entry, index) => (
            <View
              key={entry.id}
              style={[
                styles.logRow,
                index < entries.length - 1 && {
                  borderBottomColor: theme.borderSubtle,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View
                style={[styles.timelineDot, { backgroundColor: theme.primary }]}
              />
              <Text
                style={[
                  NuraiType.bodySmall,
                  { color: theme.textSecondary, flex: 1 },
                ]}
              >
                {new Date(entry.at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Text style={[NuraiType.bodySmall, { color: theme.text }]}>
                {entry.ml} ml
              </Text>
              <Pressable
                onPress={() => removeWaterEntry(entry.id).then(setEntries)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${entry.ml} millilitre entry`}
                hitSlop={8}
                style={styles.removeButton}
              >
                <AppIcon name="x" size={17} color={theme.iconMuted} />
              </Pressable>
            </View>
          ))
        ) : (
          <View style={styles.emptyInline}>
            <AppIcon name="droplet" size={21} color={theme.iconMuted} />
            <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
              Nothing logged today. Add only what you actually drink.
            </Text>
          </View>
        )}
      </GlassCard>

      <GlassCard>
        <PerformanceRow
          icon="droplet"
          label="Goal progress"
          value={`${Math.round(progress * 100)}%`}
          context={`${(total / 1000).toFixed(1)} of ${(target / 1000).toFixed(1)} litres logged`}
          progress={progress}
        />
        <PerformanceRow
          icon="repeat"
          label="Logging rhythm"
          value={`${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
          context={
            latestEntry
              ? `Most recent entry was ${latestEntry.ml} ml`
              : "No drinking pattern is inferred without entries"
          }
          last
          tone="gold"
        />
      </GlassCard>

      <GlassCard accent={theme.scholar}>
        <View style={styles.boundaryRow}>
          <AppIcon name="info" size={20} color={theme.scholar} />
          <Text
            style={[
              NuraiType.bodySmall,
              { color: theme.textSecondary, flex: 1 },
            ]}
          >
            Needs vary with climate, health, exercise and fasting. Follow
            clinical advice if you have fluid restrictions.
          </Text>
        </View>
      </GlassCard>
    </HealthScreenShell>
  );
}

const MEAL_TYPES: MealEntry["mealType"][] = [
  "suhoor",
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

export function NutritionScreen() {
  const { theme } = useTheme();
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [mealType, setMealType] = useState<MealEntry["mealType"]>("lunch");
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => loadTodayMeals().then(setMeals), []);
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  const total = meals.reduce((sum, meal) => sum + meal.kcal, 0);
  const orderedMeals = [...meals].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
  const firstMeal = orderedMeals[0];
  const lastMeal = orderedMeals[orderedMeals.length - 1];
  const averageMeal = meals.length ? Math.round(total / meals.length) : 0;

  const saveMeal = async () => {
    const calories = Number(kcal);
    if (
      !name.trim() ||
      !Number.isFinite(calories) ||
      calories <= 0 ||
      calories > 5000
    ) {
      Alert.alert(
        "Check the meal",
        "Add a meal name and a calorie estimate between 1 and 5,000.",
      );
      return;
    }
    setSaving(true);
    try {
      setMeals(
        await addMealEntry({
          name: name.trim(),
          kcal: Math.round(calories),
          mealType,
        }),
      );
      setName("");
      setKcal("");
      setSheetOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <HealthScreenShell
      eyebrow="Daily care"
      title="Nutrition"
      subtitle="Mindful meal notes without calorie pressure or public tracking."
      testID="nutrition-screen"
    >
      <GlassCard accent={theme.scholar}>
        <View style={styles.nutritionHero}>
          <View>
            <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
              Energy logged today
            </Text>
            <Text style={[NuraiType.display, { color: theme.text }]}>
              {total.toLocaleString()}
            </Text>
            <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
              kcal from your entries
            </Text>
          </View>
          <HealthGlyph
            icon="coffee"
            tone="gold"
            size={62}
            label="Nutrition log"
          />
        </View>
        <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
          Macro totals are not shown because NurAI does not yet collect enough
          verified food detail to calculate them reliably.
        </Text>
      </GlassCard>

      <HealthMetricStrip>
        <HealthMetricTile
          icon="list"
          label="Meals"
          value={`${meals.length}`}
          detail="recorded"
        />
        <HealthMetricTile
          icon="pie-chart"
          label="Average"
          value={averageMeal ? `${averageMeal}` : "—"}
          detail="kcal/entry"
        />
        <HealthMetricTile
          icon="sunrise"
          label="First"
          value={
            firstMeal
              ? new Date(firstMeal.at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
          detail={firstMeal?.mealType || "No entry"}
          tone="gold"
        />
        <HealthMetricTile
          icon="sunset"
          label="Latest"
          value={
            lastMeal
              ? new Date(lastMeal.at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
          detail={lastMeal?.mealType || "No entry"}
        />
      </HealthMetricStrip>

      <NuraiButton
        label="Add a meal"
        icon="plus"
        onPress={() => setSheetOpen(true)}
      />

      <HealthSectionTitle title="Meals" />
      <GlassCard>
        {meals.length ? (
          meals.map((meal, index) => (
            <View
              key={meal.id}
              style={[
                styles.mealRow,
                index < meals.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.borderSubtle,
                },
              ]}
            >
              <View
                style={[
                  styles.mealIcon,
                  { backgroundColor: theme.primaryMuted },
                ]}
              >
                <AppIcon name="circle" size={15} color={theme.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={[NuraiType.bodySmall, { color: theme.text }]}>
                  {meal.name}
                </Text>
                <Text
                  style={[
                    NuraiType.caption,
                    { color: theme.textMuted, textTransform: "capitalize" },
                  ]}
                >
                  {meal.mealType} ·{" "}
                  {new Date(meal.at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <Text
                style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
              >
                {meal.kcal} kcal
              </Text>
              <Pressable
                onPress={() => removeMealEntry(meal.id).then(setMeals)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${meal.name}`}
                hitSlop={8}
                style={styles.removeButton}
              >
                <AppIcon name="x" size={17} color={theme.iconMuted} />
              </Pressable>
            </View>
          ))
        ) : (
          <View style={styles.emptyInline}>
            <AppIcon name="coffee" size={21} color={theme.iconMuted} />
            <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
              No meals logged today. Logging is optional.
            </Text>
          </View>
        )}
      </GlassCard>

      <GlassCard>
        <PerformanceRow
          icon="book-open"
          label="Entries recorded"
          value={`${meals.length} ${meals.length === 1 ? "meal" : "meals"}`}
          context="NurAI reports what you entered and does not assume unlogged meals were skipped"
        />
        <PerformanceRow
          icon="zap"
          label="Energy recorded"
          value={`${total.toLocaleString()} kcal`}
          context={
            averageMeal
              ? `${averageMeal.toLocaleString()} kcal average per recorded entry`
              : "No energy estimate has been entered"
          }
          tone="gold"
          last
        />
      </GlassCard>

      <GlassCard>
        <View style={styles.boundaryRow}>
          <AppIcon name="heart" size={20} color={theme.primary} />
          <Text
            style={[
              NuraiType.bodySmall,
              { color: theme.textSecondary, flex: 1 },
            ]}
          >
            If food logging feels distressing or you have an eating disorder,
            skip this tool and seek qualified support.
          </Text>
        </View>
      </GlassCard>

      <NuraiBottomSheet
        visible={sheetOpen}
        title="Add meal"
        onClose={() => setSheetOpen(false)}
      >
        <View style={styles.sheetContent}>
          <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
            Meal name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="For example, lentil soup"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              NuraiType.body,
              {
                color: theme.text,
                backgroundColor: theme.input,
                borderColor: theme.inputBorder,
              },
            ]}
            accessibilityLabel="Meal name"
          />
          <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
            Estimated calories
          </Text>
          <TextInput
            value={kcal}
            onChangeText={setKcal}
            placeholder="For example, 420"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            style={[
              styles.input,
              NuraiType.body,
              {
                color: theme.text,
                backgroundColor: theme.input,
                borderColor: theme.inputBorder,
              },
            ]}
            accessibilityLabel="Estimated calories"
          />
          <View style={styles.mealTypeWrap}>
            {MEAL_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => setMealType(type)}
                accessibilityRole="button"
                accessibilityState={{ selected: type === mealType }}
                style={[
                  styles.mealTypePill,
                  {
                    backgroundColor:
                      type === mealType ? theme.primaryMuted : theme.surface,
                    borderColor:
                      type === mealType ? theme.primary : theme.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    NuraiType.caption,
                    {
                      color:
                        type === mealType ? theme.primary : theme.textSecondary,
                      textTransform: "capitalize",
                    },
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
          <NuraiButton label="Save meal" onPress={saveMeal} loading={saving} />
        </View>
      </NuraiBottomSheet>
    </HealthScreenShell>
  );
}

type DeviceStatus = "connected" | "permission" | "via_provider" | "unavailable";

function DeviceRow({
  icon,
  label,
  detail,
  status,
  onPress,
}: {
  icon: AppIconName;
  label: string;
  detail: string;
  status: DeviceStatus;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const statusLabel =
    status === "connected"
      ? "Connected"
      : status === "permission"
        ? "Permission needed"
        : status === "via_provider"
          ? "Via Apple Health"
          : "Unavailable";
  const color =
    status === "connected"
      ? theme.primary
      : status === "permission"
        ? theme.scholar
        : theme.textMuted;
  const content = (
    <>
      <View style={[styles.deviceIcon, { backgroundColor: `${color}14` }]}>
        <AppIcon name={icon} size={20} color={color} />
      </View>
      <View style={styles.flex}>
        <Text style={[NuraiType.bodySmall, { color: theme.text }]}>
          {label}
        </Text>
        <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
          {detail}
        </Text>
      </View>
      <Text style={[NuraiType.caption, { color }]}>{statusLabel}</Text>
      {onPress ? (
        <AppIcon name="chevron-right" size={18} color={theme.iconMuted} />
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.deviceRow}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${statusLabel}`}
      style={({ pressed }) => [styles.deviceRow, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

export function ConnectedHealthScreen() {
  const { theme } = useTheme();
  const health = useHealthData();
  const appleConnected =
    health.summary?.provider === "healthkit" &&
    health.summary.status === "granted";
  const appleStatus: DeviceStatus = appleConnected
    ? "connected"
    : Platform.OS === "ios"
      ? "permission"
      : "unavailable";

  return (
    <HealthScreenShell
      eyebrow="Privacy & devices"
      title="Connected health"
      subtitle="Only providers available on this device appear here."
      testID="connected-health-screen"
    >
      <View style={styles.connectionHero}>
        <HealthGlyph
          icon="shield"
          tone="gold"
          size={42}
          label="Connected Health privacy"
        />
        <HealthRing
          value={health.scores.dataCoveragePercent}
          size={154}
          stroke={9}
          color={theme.primary}
          trackColor={theme.backgroundTertiary}
          innerColor={theme.scholar}
        >
          <Text style={[NuraiType.metric, { color: theme.text }]}>
            {health.scores.dataCoveragePercent}%
          </Text>
          <Text style={[NuraiType.caption, { color: theme.textSecondary }]}>
            Signal coverage
          </Text>
          <Text style={[NuraiType.overline, { color: theme.primary }]}>
            {health.scores.statusLabel}
          </Text>
        </HealthRing>
      </View>
      <HealthDataNotice
        loading={health.loading}
        error={health.error}
        hasData={health.hasData}
        onConnect={() => health.refresh(true)}
      />
      <GlassCard>
        {Platform.OS === "ios" ? (
          <>
            <DeviceRow
              icon="heart"
              label="Apple Health"
              detail={
                appleConnected
                  ? health.scores.syncSummary
                  : "Permission-based health data on iPhone"
              }
              status={appleStatus}
              onPress={() => health.refresh(true)}
            />
            <View
              style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
            />
            <DeviceRow
              icon="watch"
              label="Apple Watch"
              detail="Watch data is read through Apple Health"
              status={appleConnected ? "via_provider" : appleStatus}
            />
          </>
        ) : (
          <View style={styles.emptyInline}>
            <AppIcon name="activity" size={21} color={theme.iconMuted} />
            <Text
              style={[
                NuraiType.bodySmall,
                { color: theme.textSecondary, flex: 1 },
              ]}
            >
              A supported health provider is not available on this device.
            </Text>
          </View>
        )}
      </GlassCard>

      <HealthSectionTitle title="Data available today" />
      <GlassCard>
        <HealthProgressRow
          label="Coverage"
          value={health.scores.dataCoveragePercent / 100}
          detail={`${health.scores.collectedMetricCount} of ${health.scores.totalMetricCount} signals`}
        />
        <MetricListRow
          icon="activity"
          label="Provider"
          value={health.scores.providerLabel}
        />
        <MetricListRow
          icon="clock"
          label="Last checked"
          value={
            health.summary?.fetchedAt
              ? new Date(health.summary.fetchedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
          last
        />
      </GlassCard>

      <HealthSectionTitle title="Performance data map" />
      <GlassCard>
        <PerformanceRow
          icon="check-circle"
          label="Available signals"
          value={`${health.scores.availableMetricLabels.length}`}
          context={
            health.scores.availableMetricLabels.length
              ? health.scores.availableMetricLabels.slice(0, 4).join(" · ")
              : "No provider signals were returned today"
          }
          progress={health.scores.dataCoveragePercent / 100}
        />
        <PerformanceRow
          icon="minus-circle"
          label="Still missing"
          value={`${health.scores.missingMetricLabels.length}`}
          context={
            health.scores.missingMetricLabels.slice(0, 4).join(" · ") ||
            "All supported signals are available"
          }
          tone="gold"
          last
        />
      </GlassCard>

      <GlassCard accent={theme.scholar}>
        <View style={styles.boundaryRow}>
          <AppIcon name="shield" size={21} color={theme.scholar} />
          <View style={styles.flex}>
            <Text style={[NuraiType.body, { color: theme.text }]}>
              Data & privacy
            </Text>
            <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
              Access is permission based. NurAI uses signals for gentle
              wellbeing guidance, never diagnosis or medication decisions. You
              can revoke access in your device health settings.
            </Text>
          </View>
        </View>
      </GlassCard>

      <NuraiButton
        label="Refresh health data"
        icon="refresh-cw"
        onPress={() => health.refresh(false)}
        loading={health.loading}
      />
    </HealthScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: NuraiSpace.sm },
  coachIntro: {
    flexDirection: "row",
    gap: NuraiSpace.sm,
    alignItems: "flex-start",
  },
  promptCard: {
    minHeight: 60,
    borderRadius: NuraiRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: NuraiSpace.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  boundaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: NuraiSpace.sm,
  },
  ringHero: { alignItems: "center" },
  connectionHero: { alignItems: "center", gap: NuraiSpace.xs },
  quickAddRow: { flexDirection: "row", gap: NuraiSpace.xs },
  quickAdd: {
    flex: 1,
    minHeight: 46,
    borderRadius: NuraiRadius.control,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    minHeight: 52,
  },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: NuraiSpace.sm,
    paddingVertical: NuraiSpace.lg,
  },
  nutritionHero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    minHeight: 64,
  },
  mealIcon: {
    width: 36,
    height: 36,
    borderRadius: NuraiRadius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetContent: { gap: NuraiSpace.sm },
  input: {
    minHeight: 50,
    borderRadius: NuraiRadius.control,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: NuraiSpace.md,
  },
  mealTypeWrap: { flexDirection: "row", flexWrap: "wrap", gap: NuraiSpace.xs },
  mealTypePill: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: NuraiSpace.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    minHeight: 70,
    paddingVertical: NuraiSpace.xs,
  },
  deviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.72 },
});
