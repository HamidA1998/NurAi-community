import AsyncStorage from "@react-native-async-storage/async-storage";

// Local, on-device logs for the Health section: water intake, meals, and
// completed workout sessions. These are the user's own entries (never
// fabricated), persisted locally and merged with HealthKit reads in the UI.

const WATER_LOG_KEY = "nurai_health_water_log_v1";
const MEAL_LOG_KEY = "nurai_health_meal_log_v1";
const WORKOUT_HISTORY_KEY = "nurai_health_workout_history_v1";
const ACTIVE_WORKOUT_KEY = "nurai_health_active_workout_v1";

export type WaterEntry = { id: string; ml: number; at: string };
export type MealEntry = {
  id: string;
  name: string;
  kcal: number;
  mealType: "suhoor" | "breakfast" | "lunch" | "dinner" | "snack";
  at: string;
};
export type WorkoutHistoryEntry = {
  id: string;
  workoutId: string;
  title: string;
  completedAt: string;
  durationSeconds: number;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  effort?: "easy" | "moderate" | "good" | "great";
};
export type ActiveWorkoutSession = {
  workoutId: string;
  stepIndex: number;
  elapsedSeconds: number;
  paused: boolean;
  updatedAt: string;
};

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function loadList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveList<T>(key: string, list: T[]) {
  await AsyncStorage.setItem(key, JSON.stringify(list.slice(-400)));
}

// ---- Water ----

export async function loadTodayWater(): Promise<WaterEntry[]> {
  const list = await loadList<WaterEntry>(WATER_LOG_KEY);
  const key = todayKey();
  return list.filter((entry) => entry.at.slice(0, 10) === key);
}

export async function addWaterEntry(ml: number): Promise<WaterEntry[]> {
  const list = await loadList<WaterEntry>(WATER_LOG_KEY);
  list.push({ id: makeId(), ml, at: new Date().toISOString() });
  await saveList(WATER_LOG_KEY, list);
  const key = todayKey();
  return list.filter((entry) => entry.at.slice(0, 10) === key);
}

export async function removeWaterEntry(id: string): Promise<WaterEntry[]> {
  const list = await loadList<WaterEntry>(WATER_LOG_KEY);
  const next = list.filter((entry) => entry.id !== id);
  await saveList(WATER_LOG_KEY, next);
  const key = todayKey();
  return next.filter((entry) => entry.at.slice(0, 10) === key);
}

// ---- Meals ----

export async function loadTodayMeals(): Promise<MealEntry[]> {
  const list = await loadList<MealEntry>(MEAL_LOG_KEY);
  const key = todayKey();
  return list.filter((entry) => entry.at.slice(0, 10) === key);
}

export async function addMealEntry(
  input: Omit<MealEntry, "id" | "at">,
): Promise<MealEntry[]> {
  const list = await loadList<MealEntry>(MEAL_LOG_KEY);
  list.push({ ...input, id: makeId(), at: new Date().toISOString() });
  await saveList(MEAL_LOG_KEY, list);
  const key = todayKey();
  return list.filter((entry) => entry.at.slice(0, 10) === key);
}

export async function removeMealEntry(id: string): Promise<MealEntry[]> {
  const list = await loadList<MealEntry>(MEAL_LOG_KEY);
  const next = list.filter((entry) => entry.id !== id);
  await saveList(MEAL_LOG_KEY, next);
  const key = todayKey();
  return next.filter((entry) => entry.at.slice(0, 10) === key);
}

// ---- Workout history ----

export async function loadWorkoutHistory(
  limit = 10,
): Promise<WorkoutHistoryEntry[]> {
  const list = await loadList<WorkoutHistoryEntry>(WORKOUT_HISTORY_KEY);
  return list
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, limit);
}

export async function addWorkoutHistoryEntry(
  input: Omit<WorkoutHistoryEntry, "id" | "completedAt">,
): Promise<WorkoutHistoryEntry> {
  const list = await loadList<WorkoutHistoryEntry>(WORKOUT_HISTORY_KEY);
  const entry: WorkoutHistoryEntry = {
    ...input,
    id: makeId(),
    completedAt: new Date().toISOString(),
  };
  list.push(entry);
  await saveList(WORKOUT_HISTORY_KEY, list);
  return entry;
}

export async function updateWorkoutHistoryEffort(
  id: string,
  effort: WorkoutHistoryEntry["effort"],
): Promise<void> {
  const list = await loadList<WorkoutHistoryEntry>(WORKOUT_HISTORY_KEY);
  const index = list.findIndex((entry) => entry.id === id);
  if (index >= 0) {
    list[index] = { ...list[index], effort };
    await saveList(WORKOUT_HISTORY_KEY, list);
  }
}

// ---- Recoverable active workout ----

export async function loadActiveWorkoutSession(): Promise<ActiveWorkoutSession | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_WORKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveWorkoutSession>;
    if (
      typeof parsed.workoutId !== "string" ||
      typeof parsed.stepIndex !== "number" ||
      !Number.isInteger(parsed.stepIndex) ||
      typeof parsed.elapsedSeconds !== "number" ||
      typeof parsed.updatedAt !== "string"
    ) {
      await AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY);
      return null;
    }
    const ageMs = Date.now() - new Date(parsed.updatedAt).getTime();
    if (!Number.isFinite(ageMs) || ageMs > 12 * 60 * 60 * 1000) {
      await AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY);
      return null;
    }
    return {
      workoutId: parsed.workoutId,
      stepIndex: Math.max(0, parsed.stepIndex),
      elapsedSeconds: Math.max(0, Math.round(parsed.elapsedSeconds)),
      paused: Boolean(parsed.paused),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function saveActiveWorkoutSession(
  input: Omit<ActiveWorkoutSession, "updatedAt">,
): Promise<void> {
  await AsyncStorage.setItem(
    ACTIVE_WORKOUT_KEY,
    JSON.stringify({ ...input, updatedAt: new Date().toISOString() }),
  );
}

export async function clearActiveWorkoutSession(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY);
}
