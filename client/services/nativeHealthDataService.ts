import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type HealthConnectPermission = {
  accessType: "read" | "write";
  recordType: string;
};

type HealthConnectModule = {
  initialize: () => Promise<boolean>;
  requestPermission: (
    permissions: HealthConnectPermission[],
  ) => Promise<HealthConnectPermission[]>;
  readRecords: (
    recordType: string,
    options: Record<string, unknown>,
  ) => Promise<{ records: any[] }>;
};

type HealthKitModule = typeof import("@kingstinct/react-native-healthkit");

export type NativeHealthPermissionStatus =
  | "available"
  | "granted"
  | "denied"
  | "unavailable"
  | "unsupported";

export type NativeHealthWorkoutSummary = {
  id: string;
  activityType: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  activeCaloriesKcal?: number;
};

export type NativeHealthDailySummary = {
  provider: "healthkit" | "health_connect" | "unsupported";
  status: NativeHealthPermissionStatus;
  date: string;
  steps?: number;
  activeCaloriesKcal?: number;
  basalCaloriesKcal?: number;
  totalCaloriesKcal?: number;
  dietaryWaterMl?: number;
  sleepMinutes?: number;
  sleepStartTime?: string;
  sleepEndTime?: string;
  sleepEfficiencyPercent?: number;
  sleepInterruptions?: number;
  deepSleepMinutes?: number;
  lightSleepMinutes?: number;
  remSleepMinutes?: number;
  awakeSleepMinutes?: number;
  averageHeartRateBpm?: number;
  restingHeartRateBpm?: number;
  heartRateVariabilityMs?: number;
  respiratoryRate?: number;
  oxygenSaturationPercent?: number;
  bodyTemperatureC?: number;
  bloodGlucoseMgDl?: number;
  workoutMinutes?: number;
  workoutCount?: number;
  workouts?: NativeHealthWorkoutSummary[];
  mindfulMinutes?: number;
  fetchedAt: string;
  notes: string[];
};

export type NativeHealthScoreSnapshot = {
  readinessScore: number | null;
  recoveryScore: number | null;
  strainScore: number | null;
  sleepScore: number | null;
  stressBalanceScore: number | null;
  energyScore: number | null;
  dataCoveragePercent: number;
  collectedMetricCount: number;
  totalMetricCount: number;
  availableMetricLabels: string[];
  missingMetricLabels: string[];
  hasProviderData: boolean;
  providerLabel: string;
  statusLabel: string;
  syncSummary: string;
};

const TRACKED_HEALTH_METRICS: {
  key: keyof NativeHealthDailySummary;
  label: string;
}[] = [
  { key: "steps", label: "Steps" },
  { key: "activeCaloriesKcal", label: "Active calories" },
  { key: "totalCaloriesKcal", label: "Total calories" },
  { key: "dietaryWaterMl", label: "Water" },
  { key: "sleepMinutes", label: "Sleep" },
  { key: "deepSleepMinutes", label: "Deep sleep" },
  { key: "remSleepMinutes", label: "REM sleep" },
  { key: "averageHeartRateBpm", label: "Heart rate" },
  { key: "restingHeartRateBpm", label: "Resting HR" },
  { key: "heartRateVariabilityMs", label: "HRV" },
  { key: "respiratoryRate", label: "Respiratory rate" },
  { key: "oxygenSaturationPercent", label: "SpO2" },
  { key: "bodyTemperatureC", label: "Temperature" },
  { key: "bloodGlucoseMgDl", label: "Glucose" },
  { key: "workoutMinutes", label: "Workout minutes" },
  { key: "mindfulMinutes", label: "Mindful minutes" },
];

const IOS_READ_TYPES = [
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKQuantityTypeIdentifierBasalEnergyBurned",
  "HKQuantityTypeIdentifierDietaryWater",
  "HKQuantityTypeIdentifierHeartRate",
  "HKQuantityTypeIdentifierRestingHeartRate",
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  "HKQuantityTypeIdentifierRespiratoryRate",
  "HKQuantityTypeIdentifierOxygenSaturation",
  "HKQuantityTypeIdentifierBodyTemperature",
  "HKQuantityTypeIdentifierBloodGlucose",
  "HKCategoryTypeIdentifierSleepAnalysis",
  "HKCategoryTypeIdentifierMindfulSession",
  "HKWorkoutTypeIdentifier",
];

const ANDROID_READ_PERMISSIONS: HealthConnectPermission[] = [
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "ActiveCaloriesBurned" },
  { accessType: "read", recordType: "BasalMetabolicRate" },
  { accessType: "read", recordType: "Hydration" },
  { accessType: "read", recordType: "HeartRate" },
  { accessType: "read", recordType: "RestingHeartRate" },
  { accessType: "read", recordType: "HeartRateVariabilityRmssd" },
  { accessType: "read", recordType: "RespiratoryRate" },
  { accessType: "read", recordType: "OxygenSaturation" },
  { accessType: "read", recordType: "BodyTemperature" },
  { accessType: "read", recordType: "BloodGlucose" },
  { accessType: "read", recordType: "SleepSession" },
  { accessType: "read", recordType: "ExerciseSession" },
];

async function getHealthConnect(): Promise<HealthConnectModule | null> {
  if (Platform.OS !== "android") return null;

  try {
    const mod = await import("react-native-health-connect");
    if (
      typeof mod.initialize !== "function" ||
      typeof mod.requestPermission !== "function" ||
      typeof mod.readRecords !== "function"
    ) {
      return null;
    }
    // The library's record-type unions are structurally compatible with our
    // local HealthConnectModule shape; cast to bridge the stricter generics.
    return {
      initialize: mod.initialize,
      requestPermission: mod.requestPermission,
      readRecords: mod.readRecords,
    } as unknown as HealthConnectModule;
  } catch {
    return null;
  }
}

async function getHealthKit(): Promise<HealthKitModule | null> {
  if (Platform.OS !== "ios") return null;

  try {
    return await import("@kingstinct/react-native-healthkit");
  } catch {
    return null;
  }
}

function startOfDay(date = new Date()): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function minutesBetween(start?: string | Date, end?: string | Date): number {
  if (!start || !end) return 0;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs)
    return 0;
  return Math.round((endMs - startMs) / 60000);
}

function rounded(value: unknown): number | undefined {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? Math.round(numberValue) : undefined;
}

function roundedOne(value: unknown): number | undefined {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue)
    ? Math.round(numberValue * 10) / 10
    : undefined;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function nullableScore(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? clampScore(value)
    : null;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function endOfDay(date = new Date()): Date {
  if (isToday(date)) return new Date();
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function metricValue(summary: NativeHealthDailySummary, key: string): number {
  const value = summary[key as keyof NativeHealthDailySummary];
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function hasMetric(summary: NativeHealthDailySummary, key: string): boolean {
  return metricValue(summary, key) > 0;
}

const LAST_HEALTH_SUMMARY_KEY = "nurai_last_health_summary_v1";

// Cache the most recent HealthKit read so surfaces that cannot call HealthKit
// themselves (the Home, the personal AI context) can still reference today's
// real numbers — steps, sleep, recovery — instead of only care-habit reminders.
export async function saveLastHealthSummary(
  summary: NativeHealthDailySummary,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      LAST_HEALTH_SUMMARY_KEY,
      JSON.stringify({ ...summary, cachedAt: new Date().toISOString() }),
    );
  } catch {
    // best-effort cache only
  }
}

export async function loadLastHealthSummary(): Promise<
  (NativeHealthDailySummary & { cachedAt?: string }) | null
> {
  try {
    const raw = await AsyncStorage.getItem(LAST_HEALTH_SUMMARY_KEY);
    return raw
      ? (JSON.parse(raw) as NativeHealthDailySummary & { cachedAt?: string })
      : null;
  } catch {
    return null;
  }
}

export function hasNativeHealthMetrics(
  summary?: NativeHealthDailySummary | null,
): boolean {
  if (!summary) return false;
  return TRACKED_HEALTH_METRICS.some((metric) =>
    hasMetric(summary, metric.key),
  );
}

export function buildNativeHealthScoreSnapshot(
  summary?: NativeHealthDailySummary | null,
  carePlanProgress = 0,
): NativeHealthScoreSnapshot {
  const providerLabel =
    summary?.provider === "healthkit"
      ? "Apple Health"
      : summary?.provider === "health_connect"
        ? "Health Connect"
        : "Health provider";
  const statusLabel =
    summary?.status === "granted"
      ? "Connected"
      : summary?.status === "available"
        ? "Available"
        : summary?.status === "denied"
          ? "Permission needed"
          : summary?.status === "unavailable"
            ? "Unavailable"
            : summary?.status === "unsupported"
              ? "Unsupported"
              : "Connect";

  if (!summary) {
    return {
      readinessScore: null,
      recoveryScore: null,
      strainScore: null,
      sleepScore: null,
      stressBalanceScore: null,
      energyScore: null,
      dataCoveragePercent: 0,
      collectedMetricCount: 0,
      totalMetricCount: TRACKED_HEALTH_METRICS.length,
      availableMetricLabels: [],
      missingMetricLabels: TRACKED_HEALTH_METRICS.map((metric) => metric.label),
      hasProviderData: false,
      providerLabel,
      statusLabel,
      syncSummary:
        "Sync health data to read real steps, sleep, calories, heart, water, workouts, and recovery signals.",
    };
  }

  const availableMetricLabels = TRACKED_HEALTH_METRICS.filter((metric) =>
    hasMetric(summary, metric.key),
  ).map((metric) => metric.label);
  const missingMetricLabels = TRACKED_HEALTH_METRICS.filter(
    (metric) => !hasMetric(summary, metric.key),
  ).map((metric) => metric.label);
  const collectedMetricCount = availableMetricLabels.length;
  const hasProviderData = collectedMetricCount > 0;
  const dataCoveragePercent = clampScore(
    (collectedMetricCount / TRACKED_HEALTH_METRICS.length) * 100,
  );

  const sleepScore = nullableScore(
    summary.sleepMinutes ? (summary.sleepMinutes / (7.5 * 60)) * 100 : null,
  );
  const deepSleepScore = nullableScore(
    summary.sleepMinutes && summary.deepSleepMinutes
      ? (summary.deepSleepMinutes / Math.max(1, summary.sleepMinutes)) * 520
      : null,
  );
  const hrvScore = nullableScore(
    summary.heartRateVariabilityMs
      ? (summary.heartRateVariabilityMs / 65) * 100
      : null,
  );
  const restingHrScore = nullableScore(
    summary.restingHeartRateBpm
      ? 100 - Math.abs(summary.restingHeartRateBpm - 62) * 3
      : null,
  );
  const stressBalanceScore = nullableScore(
    averageNumbers([hrvScore ?? undefined, restingHrScore ?? undefined]),
  );
  const recoveryInputs = [
    sleepScore,
    deepSleepScore,
    stressBalanceScore,
    carePlanProgress > 0 ? carePlanProgress : null,
  ].filter((value): value is number => typeof value === "number");
  const recoveryScore =
    recoveryInputs.length > 0
      ? clampScore(
          recoveryInputs.reduce((total, value) => total + value, 0) /
            recoveryInputs.length,
        )
      : null;

  const strainInputs = [
    summary.steps ? (summary.steps / 10000) * 100 : null,
    summary.activeCaloriesKcal
      ? (summary.activeCaloriesKcal / 650) * 100
      : null,
    summary.workoutMinutes ? (summary.workoutMinutes / 60) * 100 : null,
  ].filter((value): value is number => typeof value === "number");
  const strainScore =
    strainInputs.length > 0
      ? clampScore(
          strainInputs.reduce((total, value) => total + value, 0) /
            strainInputs.length,
        )
      : null;
  const energyScore =
    recoveryScore != null && strainScore != null
      ? clampScore(recoveryScore * 0.72 + (100 - strainScore) * 0.18 + 8)
      : recoveryScore;
  const readinessScore =
    recoveryScore != null && energyScore != null
      ? clampScore(recoveryScore * 0.64 + energyScore * 0.36)
      : (recoveryScore ?? energyScore);

  return {
    readinessScore,
    recoveryScore,
    strainScore,
    sleepScore,
    stressBalanceScore,
    energyScore,
    dataCoveragePercent,
    collectedMetricCount,
    totalMetricCount: TRACKED_HEALTH_METRICS.length,
    availableMetricLabels,
    missingMetricLabels,
    hasProviderData,
    providerLabel,
    statusLabel,
    syncSummary: hasProviderData
      ? `${providerLabel} read ${collectedMetricCount}/${TRACKED_HEALTH_METRICS.length} tracked signals.`
      : "No health samples were found for today yet. Sync again after your watch or phone has new data.",
  };
}

function addNumbers(values: (number | undefined)[]): number | undefined {
  let sum = 0;
  for (const value of values) {
    if (typeof value === "number") sum += value;
  }
  return sum > 0 ? Math.round(sum) : undefined;
}

function averageNumbers(values: (number | undefined)[]): number | undefined {
  const valid = values.filter(
    (value): value is number => typeof value === "number" && value > 0,
  );
  if (!valid.length) return undefined;
  return roundedOne(
    valid.reduce((total, value) => total + value, 0) / valid.length,
  );
}

function readNumberAtPath(source: any, path: string[]): number | undefined {
  let next = source;
  for (const key of path) {
    next = next?.[key];
  }
  return roundedOne(next);
}

function sleepStageFromSample(sample: any): keyof SleepStageTotals | "asleep" {
  const raw = String(
    sample?.value ??
      sample?.categoryValue ??
      sample?.stage ??
      sample?.metadata?.stage ??
      "",
  ).toLowerCase();
  if (raw.includes("deep")) return "deep";
  if (raw.includes("rem")) return "rem";
  if (raw.includes("awake") || raw.includes("inbed")) return "awake";
  if (raw.includes("core") || raw.includes("light")) return "light";
  return "asleep";
}

type SleepStageTotals = {
  deep: number;
  light: number;
  rem: number;
  awake: number;
  asleep: number;
};

function summarizeSleepSamples(
  samples: any[],
  startKey: "startDate" | "startTime",
  endKey: "endDate" | "endTime",
) {
  const stageTotals: SleepStageTotals = {
    deep: 0,
    light: 0,
    rem: 0,
    awake: 0,
    asleep: 0,
  };
  let startMs: number | undefined;
  let endMs: number | undefined;
  // Collect actual asleep intervals so we can union-merge them. Apple Health
  // stores overlapping samples from multiple sources (Watch + iPhone + sleep
  // apps) for the same night; naively summing them triple-counts into absurd
  // totals like "26h". Merging overlaps makes every minute count once.
  const asleepIntervals: [number, number][] = [];

  for (const sample of samples) {
    const currentStart = new Date(sample?.[startKey]).getTime();
    const currentEnd = new Date(sample?.[endKey]).getTime();
    if (
      !Number.isFinite(currentStart) ||
      !Number.isFinite(currentEnd) ||
      currentEnd <= currentStart
    ) {
      continue;
    }
    startMs =
      typeof startMs === "number"
        ? Math.min(startMs, currentStart)
        : currentStart;
    endMs =
      typeof endMs === "number" ? Math.max(endMs, currentEnd) : currentEnd;
    const minutes = minutesBetween(sample?.[startKey], sample?.[endKey]);
    const stage = sleepStageFromSample(sample);
    stageTotals[stage] += minutes;
    if (stage !== "awake") {
      asleepIntervals.push([currentStart, currentEnd]);
    }
  }

  // Union-merge overlapping asleep intervals to deduplicate multi-source samples.
  asleepIntervals.sort((a, b) => a[0] - b[0]);
  let mergedAsleepMs = 0;
  let spanStart = -1;
  let spanEnd = -1;
  for (const [s, e] of asleepIntervals) {
    if (s > spanEnd) {
      if (spanEnd > spanStart) mergedAsleepMs += spanEnd - spanStart;
      spanStart = s;
      spanEnd = e;
    } else if (e > spanEnd) {
      spanEnd = e;
    }
  }
  if (spanEnd > spanStart) mergedAsleepMs += spanEnd - spanStart;

  const inBedMinutes =
    typeof startMs === "number" && typeof endMs === "number"
      ? Math.max(0, Math.round((endMs - startMs) / 60000))
      : 0;

  const mergedAsleepMinutes = Math.round(mergedAsleepMs / 60000);
  const stagedSumMinutes =
    stageTotals.deep + stageTotals.light + stageTotals.rem;
  // Prefer the merged union (overlap-safe); fall back to staged/asleep sums.
  let sleepMinutes =
    mergedAsleepMinutes > 0
      ? mergedAsleepMinutes
      : stagedSumMinutes || stageTotals.asleep;
  // Safety clamps: never exceed the in-bed window, and cap at a human maximum.
  if (inBedMinutes > 0) sleepMinutes = Math.min(sleepMinutes, inBedMinutes);
  sleepMinutes = Math.min(sleepMinutes, 16 * 60);

  return {
    sleepMinutes: sleepMinutes > 0 ? Math.round(sleepMinutes) : undefined,
    sleepStartTime:
      typeof startMs === "number" ? new Date(startMs).toISOString() : undefined,
    sleepEndTime:
      typeof endMs === "number" ? new Date(endMs).toISOString() : undefined,
    sleepEfficiencyPercent:
      inBedMinutes > 0 && sleepMinutes > 0
        ? Math.min(100, Math.round((sleepMinutes / inBedMinutes) * 100))
        : undefined,
    sleepInterruptions:
      samples.length > 1 ? Math.max(0, samples.length - 1) : undefined,
    deepSleepMinutes: stageTotals.deep || undefined,
    lightSleepMinutes: stageTotals.light || undefined,
    remSleepMinutes: stageTotals.rem || undefined,
    awakeSleepMinutes: stageTotals.awake || undefined,
  };
}

async function safeHealthKitQuantity(
  healthKit: HealthKitModule,
  identifier: string,
  statistics: string[],
  options: Record<string, unknown>,
) {
  try {
    if (typeof healthKit.queryStatisticsForQuantity !== "function") {
      return null;
    }
    return await healthKit.queryStatisticsForQuantity(
      identifier as any,
      statistics as any,
      options as any,
    );
  } catch {
    return null;
  }
}

async function safeHealthKitCategorySamples(
  healthKit: HealthKitModule,
  identifier: string,
  options: Record<string, unknown>,
) {
  try {
    if (typeof healthKit.queryCategorySamples !== "function") {
      return [];
    }
    return await healthKit.queryCategorySamples(
      identifier as any,
      options as any,
    );
  } catch {
    return [];
  }
}

async function safeHealthKitWorkoutSamples(
  healthKit: HealthKitModule,
  options: Record<string, unknown>,
) {
  try {
    if (typeof healthKit.queryWorkoutSamples !== "function") {
      return [];
    }
    return await healthKit.queryWorkoutSamples(options as any);
  } catch {
    return [];
  }
}

function workoutTypeLabel(value: unknown): string {
  const raw = String(value || "Workout").replace(/^HKWorkoutActivityType/, "");
  return raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
}

function healthKitWorkoutSummary(
  sample: any,
  index: number,
): NativeHealthWorkoutSummary {
  const startTime = sample?.startDate
    ? new Date(sample.startDate).toISOString()
    : undefined;
  const endTime = sample?.endDate
    ? new Date(sample.endDate).toISOString()
    : undefined;
  const durationMinutes =
    minutesBetween(sample?.startDate, sample?.endDate) ||
    rounded(sample?.duration);
  const activeCaloriesKcal =
    rounded(sample?.totalEnergyBurned?.quantity) ??
    rounded(sample?.totalEnergy?.quantity) ??
    rounded(sample?.energyBurned);

  return {
    id: String(
      sample?.uuid || sample?.id || `${startTime || "workout"}-${index}`,
    ),
    activityType: workoutTypeLabel(
      sample?.workoutActivityType || sample?.activityType || sample?.type,
    ),
    startTime,
    endTime,
    durationMinutes,
    activeCaloriesKcal,
  };
}

function healthConnectWorkoutSummary(
  record: any,
  index: number,
): NativeHealthWorkoutSummary {
  const durationMinutes = minutesBetween(record.startTime, record.endTime);
  return {
    id: String(
      record.metadata?.id || record.uid || `${record.startTime}-${index}`,
    ),
    activityType: workoutTypeLabel(
      record.exerciseType || record.activityType || record.title,
    ),
    startTime: record.startTime,
    endTime: record.endTime,
    durationMinutes,
    activeCaloriesKcal: rounded(record.totalEnergy?.inKilocalories),
  };
}

async function safeHealthConnectRecords(
  healthConnect: HealthConnectModule,
  recordType: string,
  options: Record<string, unknown>,
) {
  try {
    return await healthConnect.readRecords(recordType, options);
  } catch {
    return { records: [] };
  }
}

export async function requestNativeHealthPermissions(): Promise<NativeHealthPermissionStatus> {
  if (Platform.OS === "ios") {
    try {
      const healthKit = await getHealthKit();
      if (!healthKit) return "unavailable";

      if (typeof healthKit.isHealthDataAvailableAsync !== "function") {
        return "unavailable";
      }
      const available = await healthKit.isHealthDataAvailableAsync();
      if (!available) return "unavailable";
      if (typeof healthKit.requestAuthorization !== "function") {
        return "unavailable";
      }
      await healthKit.requestAuthorization({ toRead: IOS_READ_TYPES as any });
      return "granted";
    } catch {
      return "denied";
    }
  }

  if (Platform.OS === "android") {
    try {
      const healthConnect = await getHealthConnect();
      if (!healthConnect) return "unavailable";

      const initialized = await healthConnect.initialize();
      if (!initialized) return "unavailable";
      const granted = await healthConnect.requestPermission(
        ANDROID_READ_PERMISSIONS,
      );
      return granted.length ? "granted" : "denied";
    } catch {
      return "denied";
    }
  }

  return "unsupported";
}

export async function readNativeDailyHealthSummary(
  date = new Date(),
): Promise<NativeHealthDailySummary> {
  if (Platform.OS === "ios") return readHealthKitDailySummary(date);
  if (Platform.OS === "android") return readHealthConnectDailySummary(date);

  return {
    provider: "unsupported",
    status: "unsupported",
    date: date.toISOString().slice(0, 10),
    fetchedAt: new Date().toISOString(),
    notes: [
      "Health data is only available on supported iOS and Android builds.",
    ],
  };
}

export async function readNativeHealthHistory(
  days = 7,
  endDate = new Date(),
): Promise<NativeHealthDailySummary[]> {
  const safeDays = Math.max(1, Math.min(31, Math.round(days)));
  const summaries: NativeHealthDailySummary[] = [];

  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(endDate);
    day.setDate(endDate.getDate() - offset);
    const queryDate = offset === 0 ? new Date(endDate) : endOfDay(day);
    summaries.push(await readNativeDailyHealthSummary(queryDate));
  }

  return summaries;
}

async function readHealthKitDailySummary(
  date: Date,
): Promise<NativeHealthDailySummary> {
  const startDate = startOfDay(date);
  const endDate = endOfDay(date);
  const filter = { date: { startDate, endDate } };
  const base = {
    provider: "healthkit" as const,
    date: date.toISOString().slice(0, 10),
    fetchedAt: new Date().toISOString(),
  };

  try {
    const healthKit = await getHealthKit();
    if (!healthKit) {
      return {
        ...base,
        status: "unavailable",
        notes: ["Apple Health is not available in this build."],
      };
    }

    if (typeof healthKit.isHealthDataAvailableAsync !== "function") {
      return {
        ...base,
        status: "unavailable",
        notes: ["Apple Health is not available in this build."],
      };
    }
    const available = await healthKit.isHealthDataAvailableAsync();
    if (!available) {
      return {
        ...base,
        status: "unavailable",
        notes: ["Apple Health is not available on this device."],
      };
    }

    const [
      steps,
      activeCalories,
      basalCalories,
      dietaryWater,
      heartRate,
      restingHeartRate,
      heartRateVariability,
      respiratoryRate,
      oxygenSaturation,
      bodyTemperature,
      bloodGlucose,
      sleep,
      mindful,
      workouts,
    ] = await Promise.all([
      safeHealthKitQuantity(
        healthKit,
        "HKQuantityTypeIdentifierStepCount",
        ["cumulativeSum"],
        { filter, unit: "count" } as any,
      ),
      safeHealthKitQuantity(
        healthKit,
        "HKQuantityTypeIdentifierActiveEnergyBurned",
        ["cumulativeSum"],
        { filter, unit: "kcal" } as any,
      ),
      safeHealthKitQuantity(
        healthKit,
        "HKQuantityTypeIdentifierBasalEnergyBurned",
        ["cumulativeSum"],
        { filter, unit: "kcal" } as any,
      ),
      safeHealthKitQuantity(
        healthKit,
        "HKQuantityTypeIdentifierDietaryWater",
        ["cumulativeSum"],
        { filter, unit: "L" } as any,
      ),
      safeHealthKitQuantity(
        healthKit,
        "HKQuantityTypeIdentifierHeartRate",
        ["discreteAverage"],
        { filter, unit: "count/min" } as any,
      ),
      safeHealthKitQuantity(
        healthKit,
        "HKQuantityTypeIdentifierRestingHeartRate",
        ["discreteAverage"],
        { filter, unit: "count/min" } as any,
      ),
      safeHealthKitQuantity(
        healthKit,
        "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
        ["discreteAverage"],
        { filter, unit: "ms" } as any,
      ),
      safeHealthKitQuantity(
        healthKit,
        "HKQuantityTypeIdentifierRespiratoryRate",
        ["discreteAverage"],
        { filter, unit: "count/min" } as any,
      ),
      safeHealthKitQuantity(
        healthKit,
        "HKQuantityTypeIdentifierOxygenSaturation",
        ["discreteAverage"],
        { filter, unit: "%" } as any,
      ),
      safeHealthKitQuantity(
        healthKit,
        "HKQuantityTypeIdentifierBodyTemperature",
        ["discreteAverage"],
        { filter, unit: "degC" } as any,
      ),
      safeHealthKitQuantity(
        healthKit,
        "HKQuantityTypeIdentifierBloodGlucose",
        ["discreteAverage"],
        { filter, unit: "mg/dL" } as any,
      ),
      safeHealthKitCategorySamples(
        healthKit,
        "HKCategoryTypeIdentifierSleepAnalysis",
        {
          limit: 0,
          filter,
        } as any,
      ),
      safeHealthKitCategorySamples(
        healthKit,
        "HKCategoryTypeIdentifierMindfulSession",
        {
          limit: 0,
          filter,
        } as any,
      ),
      safeHealthKitWorkoutSamples(healthKit, { limit: 0, filter } as any),
    ]);

    const activeCaloriesKcal = rounded(activeCalories?.sumQuantity?.quantity);
    const basalCaloriesKcal = rounded(basalCalories?.sumQuantity?.quantity);
    const dietaryWaterLiters = roundedOne(dietaryWater?.sumQuantity?.quantity);
    const sleepSummary = summarizeSleepSamples(sleep, "startDate", "endDate");
    const workoutSummaries = workouts
      .map(healthKitWorkoutSummary)
      .filter(
        (workout) => workout.durationMinutes || workout.activeCaloriesKcal,
      )
      .slice(0, 6);

    return {
      ...base,
      status: "granted",
      steps: rounded(steps?.sumQuantity?.quantity),
      activeCaloriesKcal,
      basalCaloriesKcal,
      totalCaloriesKcal: addNumbers([activeCaloriesKcal, basalCaloriesKcal]),
      dietaryWaterMl: dietaryWaterLiters
        ? Math.round(dietaryWaterLiters * 1000)
        : undefined,
      averageHeartRateBpm: rounded(heartRate?.averageQuantity?.quantity),
      restingHeartRateBpm: rounded(restingHeartRate?.averageQuantity?.quantity),
      heartRateVariabilityMs: rounded(
        heartRateVariability?.averageQuantity?.quantity,
      ),
      respiratoryRate: roundedOne(respiratoryRate?.averageQuantity?.quantity),
      oxygenSaturationPercent: roundedOne(
        Number(oxygenSaturation?.averageQuantity?.quantity) <= 1
          ? Number(oxygenSaturation?.averageQuantity?.quantity) * 100
          : oxygenSaturation?.averageQuantity?.quantity,
      ),
      bodyTemperatureC: roundedOne(bodyTemperature?.averageQuantity?.quantity),
      bloodGlucoseMgDl: rounded(bloodGlucose?.averageQuantity?.quantity),
      ...sleepSummary,
      mindfulMinutes: addNumbers(
        mindful.map((sample: any) =>
          minutesBetween(sample.startDate, sample.endDate),
        ),
      ),
      workoutMinutes: addNumbers(
        workoutSummaries.map((sample) =>
          typeof sample.durationMinutes === "number"
            ? sample.durationMinutes
            : undefined,
        ),
      ),
      workoutCount: workoutSummaries.length,
      workouts: workoutSummaries,
      notes: [
        "Apple Health values depend on granted permissions and connected device data.",
        "NurAI treats wearable readings as wellbeing trends, not medical measurements.",
      ],
    };
  } catch {
    return {
      ...base,
      status: "denied",
      notes: [
        "Apple Health permission is missing or the native HealthKit bridge is not ready in this build.",
      ],
    };
  }
}

async function readHealthConnectDailySummary(
  date: Date,
): Promise<NativeHealthDailySummary> {
  const startTime = startOfDay(date).toISOString();
  const endTime = endOfDay(date).toISOString();
  const timeRangeFilter = { operator: "between" as const, startTime, endTime };
  const base = {
    provider: "health_connect" as const,
    date: date.toISOString().slice(0, 10),
    fetchedAt: new Date().toISOString(),
  };

  try {
    const healthConnect = await getHealthConnect();
    if (!healthConnect) {
      return {
        ...base,
        status: "unavailable",
        notes: ["Health Connect is not available in this build."],
      };
    }

    const initialized = await healthConnect.initialize();
    if (!initialized) {
      return {
        ...base,
        status: "unavailable",
        notes: ["Health Connect is not available on this Android device."],
      };
    }

    const [
      steps,
      activeCalories,
      hydration,
      heartRate,
      restingHeartRate,
      heartRateVariability,
      respiratoryRate,
      oxygenSaturation,
      bodyTemperature,
      bloodGlucose,
      sleep,
      workouts,
    ] = await Promise.all([
      safeHealthConnectRecords(healthConnect, "Steps", { timeRangeFilter }),
      safeHealthConnectRecords(healthConnect, "ActiveCaloriesBurned", {
        timeRangeFilter,
      }),
      safeHealthConnectRecords(healthConnect, "Hydration", {
        timeRangeFilter,
      }),
      safeHealthConnectRecords(healthConnect, "HeartRate", { timeRangeFilter }),
      safeHealthConnectRecords(healthConnect, "RestingHeartRate", {
        timeRangeFilter,
      }),
      safeHealthConnectRecords(healthConnect, "HeartRateVariabilityRmssd", {
        timeRangeFilter,
      }),
      safeHealthConnectRecords(healthConnect, "RespiratoryRate", {
        timeRangeFilter,
      }),
      safeHealthConnectRecords(healthConnect, "OxygenSaturation", {
        timeRangeFilter,
      }),
      safeHealthConnectRecords(healthConnect, "BodyTemperature", {
        timeRangeFilter,
      }),
      safeHealthConnectRecords(healthConnect, "BloodGlucose", {
        timeRangeFilter,
      }),
      safeHealthConnectRecords(healthConnect, "SleepSession", {
        timeRangeFilter,
      }),
      safeHealthConnectRecords(healthConnect, "ExerciseSession", {
        timeRangeFilter,
      }),
    ]);

    const heartSamples = heartRate.records.flatMap(
      (record: any) => record.samples || [],
    );
    const averageHeartRateBpm = heartSamples.length
      ? Math.round(
          heartSamples.reduce(
            (total: number, sample: any) =>
              total + Number(sample.beatsPerMinute || 0),
            0,
          ) / heartSamples.length,
        )
      : undefined;

    const sleepSummary = summarizeSleepSamples(
      sleep.records.flatMap((record: any) =>
        Array.isArray(record.stages) && record.stages.length
          ? record.stages
          : [record],
      ),
      "startTime",
      "endTime",
    );
    const workoutSummaries = workouts.records
      .map(healthConnectWorkoutSummary)
      .filter(
        (workout) => workout.durationMinutes || workout.activeCaloriesKcal,
      )
      .slice(0, 6);

    return {
      ...base,
      status: "granted",
      steps: addNumbers(steps.records.map((record: any) => record.count)),
      activeCaloriesKcal: addNumbers(
        activeCalories.records.map(
          (record: any) => record.energy?.inKilocalories,
        ),
      ),
      dietaryWaterMl: addNumbers(
        hydration.records.map(
          (record: any) =>
            record.volume?.inMilliliters ??
            (record.volume?.inLiters
              ? Number(record.volume.inLiters) * 1000
              : undefined),
        ),
      ),
      averageHeartRateBpm,
      restingHeartRateBpm: averageNumbers(
        restingHeartRate.records.map((record: any) =>
          readNumberAtPath(record, ["beatsPerMinute"]),
        ),
      ),
      heartRateVariabilityMs: averageNumbers(
        heartRateVariability.records.map((record: any) =>
          readNumberAtPath(record, ["heartRateVariabilityMillis"]),
        ),
      ),
      respiratoryRate: averageNumbers(
        respiratoryRate.records.map((record: any) =>
          readNumberAtPath(record, ["rate"]),
        ),
      ),
      oxygenSaturationPercent: averageNumbers(
        oxygenSaturation.records.map((record: any) =>
          readNumberAtPath(record, ["percentage"]),
        ),
      ),
      bodyTemperatureC: averageNumbers(
        bodyTemperature.records.map((record: any) =>
          readNumberAtPath(record, ["temperature", "inCelsius"]),
        ),
      ),
      bloodGlucoseMgDl: averageNumbers(
        bloodGlucose.records.map((record: any) =>
          readNumberAtPath(record, ["level", "inMilligramsPerDeciliter"]),
        ),
      ),
      ...sleepSummary,
      workoutMinutes: addNumbers(
        workoutSummaries.map((record) =>
          typeof record.durationMinutes === "number"
            ? record.durationMinutes
            : undefined,
        ),
      ),
      workoutCount: workoutSummaries.length,
      workouts: workoutSummaries,
      notes: [
        "Health Connect values depend on granted permissions and wearable sync.",
        "Samsung and Android wearable data should flow through Health Connect when available.",
      ],
    };
  } catch {
    return {
      ...base,
      status: "denied",
      notes: [
        "Health Connect permission is missing or the native Android bridge is not ready in this build.",
      ],
    };
  }
}
