import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getApiUrl } from "./query-client";

export type ProgressCategory =
  | "streak"
  | "quran"
  | "tasbeeh"
  | "hasanat"
  | "achievements"
  | "prayers"
  | "dailyPlan"
  | "womensHealth"
  | "kids"
  | "ramadan"
  | "zakat"
  | "finance"
  | "hajj"
  | "challenges"
  | "family"
  | "notifications"
  | "settings"
  | "community"
  | "nuraiProfile"
  | "bookmarks"
  | "library"
  | "travel";

const ASYNC_KEY_TO_CATEGORY: Record<string, ProgressCategory> = {
  streak_current: "streak",
  "streak-data": "streak",
  "habit-streak-data": "streak",
  daily_plan_streak: "streak",

  "quran-all-surah-progress": "quran",
  "quran-reading-progress": "quran",
  "quran-last-read-surah": "quran",
  quran_learned_words_v1: "quran",
  quran_memory_cards_v1: "quran",
  quran_reflection_notes_v1: "quran",
  quran_recitation_practice_v1: "quran",
  quran_auto_advance: "quran",
  quran_playback_speed: "quran",
  quran_reciter_id: "quran",
  quran_tajweed_enabled: "quran",
  quran_translation_id: "quran",
  quran_transliteration: "quran",
  quran_word_by_word: "quran",
  quran_repeat_verse: "quran",
  quran_repeat_range_enabled: "quran",
  quran_repeat_range_start: "quran",
  quran_repeat_range_end: "quran",
  quran_audio_end_mode: "quran",

  bookmarks_data: "bookmarks",
  bookmark_collections: "bookmarks",

  nurai_library_progress_v1: "library",
  nurai_library_reader_settings_v1: "library",

  tasbeeh_count: "tasbeeh",
  tasbeeh_daily_total: "tasbeeh",
  tasbeeh_target: "tasbeeh",
  tasbeeh_dhikr: "tasbeeh",
  tasbeeh_design: "tasbeeh",
  tasbeeh_custom_dhikr: "tasbeeh",

  hasanat_total: "hasanat",

  achievements_data: "achievements",
  achievements_streak_data: "achievements",

  daily_plan_tasks: "dailyPlan",
  daily_plan_completed: "dailyPlan",

  kids_settings: "kids",
  kids_progress: "kids",
  kids_streaks: "kids",
  kids_badges: "kids",
  kids_story_progress: "kids",
  kids_quiz_scores: "kids",
  kids_memorization: "kids",

  ramadan_auto_detect: "ramadan",
  charity_currency: "ramadan",

  zakat_currency: "zakat",

  sadaqah_log: "finance",
  islamic_debts: "finance",
  sadaqah_monthly_goal: "finance",

  "@hajj_umrah_checklist": "hajj",

  challenges_data: "challenges",

  family_shared_duas: "family",
  family_challenges: "family",

  notifications_reminders: "notifications",
  notifications_updates: "notifications",
  notifications_system: "notifications",
  app_notifications_reminders: "notifications",
  app_notifications_updates: "notifications",
  app_notifications_system: "notifications",
  notification_settings: "notifications",
  selected_muezzin_voice: "notifications",

  nurai_theme_preference: "settings",
  custom_theme_skin: "settings",
  app_lock_enabled: "settings",
  onboarding_completed: "settings",
  onboarding_preferences: "settings",
  quick_access_slots: "settings",
  name_prompt_dismissed_v2: "settings",
  nurai_custom_daily_goals_v1: "settings",

  community_profile: "community",
  community_device_id: "community",
  community_room_visits: "community",

  nurai_user_profile: "nuraiProfile",
  nurai_app_opens: "nuraiProfile",
  nurai_feature_usage: "nuraiProfile",
  nurai_session_nudges: "nuraiProfile",
  nurai_activity_pattern: "nuraiProfile",
  nurai_arabic_learning_progress: "nuraiProfile",
  nurai_saved_ai_answers_v1: "nuraiProfile",
  nurai_global_madhab: "settings",
  nurai_revert_status: "settings",

  nurai_prayer_tracker_v1: "prayers",
  nurai_travel_companion_v1: "travel",
};

const ALL_SYNCED_KEYS = Object.keys(ASYNC_KEY_TO_CATEGORY);

const SYNC_CACHE_KEY = "progress_sync_cache";

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingCategories = new Set<ProgressCategory>();
let isSyncing = false;
let syncEnabled = false;

export function enableSync() {
  syncEnabled = true;
}

export function disableSync() {
  syncEnabled = false;
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  pendingCategories.clear();
}

function tryParseJSON(val: string | null): any {
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

async function gatherCategoryData(
  category: ProgressCategory,
): Promise<Record<string, any>> {
  const keys = Object.entries(ASYNC_KEY_TO_CATEGORY)
    .filter(([, cat]) => cat === category)
    .map(([key]) => key);

  const result: Record<string, any> = {};
  for (const key of keys) {
    const val = await AsyncStorage.getItem(key);
    if (val !== null) {
      result[key] = tryParseJSON(val);
    }
  }
  return result;
}

async function applyCategoryData(
  category: ProgressCategory,
  data: Record<string, any>,
): Promise<void> {
  if (!data || typeof data !== "object") return;
  const categoryKeys = Object.entries(ASYNC_KEY_TO_CATEGORY)
    .filter(([, cat]) => cat === category)
    .map(([key]) => key);

  await Promise.all(
    categoryKeys
      .filter((key) => !(key in data))
      .map((key) => AsyncStorage.removeItem(key)),
  );

  for (const [key, value] of Object.entries(data)) {
    if (ASYNC_KEY_TO_CATEGORY[key] === category) {
      const strVal = typeof value === "string" ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, strVal);
    }
  }
}

export async function pullFromServer(): Promise<boolean> {
  try {
    const baseUrl = getApiUrl();
    const url = new URL("/api/progress", baseUrl);
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return false;

    const serverData = await res.json();
    if (!serverData || typeof serverData !== "object") return false;

    const categories = Object.keys(serverData) as ProgressCategory[];
    for (const cat of categories) {
      const catData = serverData[cat];
      if (
        catData &&
        typeof catData === "object" &&
        Object.keys(catData).length > 0
      ) {
        await applyCategoryData(cat, catData);
      }
    }

    await AsyncStorage.setItem(
      SYNC_CACHE_KEY,
      JSON.stringify({ ts: Date.now() }),
    );
    return true;
  } catch (err) {
    console.warn("Progress pull failed:", err);
    return false;
  }
}

export async function pushToServer(
  categories?: ProgressCategory[],
): Promise<boolean> {
  try {
    const cats =
      categories ||
      Object.keys(ASYNC_KEY_TO_CATEGORY).reduce((acc, key) => {
        acc.add(ASYNC_KEY_TO_CATEGORY[key]);
        return acc;
      }, new Set<ProgressCategory>());

    const body: Record<string, any> = {};
    for (const cat of cats) {
      body[cat] = await gatherCategoryData(cat);
    }

    await apiRequest("PUT", "/api/progress", body);
    await AsyncStorage.setItem(
      SYNC_CACHE_KEY,
      JSON.stringify({ ts: Date.now() }),
    );
    return true;
  } catch (err) {
    console.warn("Progress push failed:", err);
    return false;
  }
}

export async function pushCategory(
  category: ProgressCategory,
): Promise<boolean> {
  try {
    const data = await gatherCategoryData(category);
    await apiRequest("PUT", `/api/progress/${category}`, data);
    return true;
  } catch (err) {
    console.warn(`Progress push for ${category} failed:`, err);
    return false;
  }
}

export async function deleteProgressCategory(
  category: ProgressCategory,
): Promise<boolean> {
  try {
    await clearLocalProgressCategory(category);
    await apiRequest("DELETE", `/api/progress/${category}`);
    await AsyncStorage.setItem(
      SYNC_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), deletedCategory: category }),
    );
    return true;
  } catch (err) {
    console.warn(`Progress delete for ${category} failed:`, err);
    return false;
  }
}

function scheduleDebouncedSync() {
  if (!syncEnabled) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    if (!syncEnabled || isSyncing || pendingCategories.size === 0) return;
    isSyncing = true;
    const cats = Array.from(pendingCategories) as ProgressCategory[];
    pendingCategories.clear();
    try {
      await pushToServer(cats);
    } catch {}
    isSyncing = false;
  }, 2000);
}

export function markDirty(category: ProgressCategory) {
  pendingCategories.add(category);
  scheduleDebouncedSync();
}

export function markDirtyByKey(asyncStorageKey: string) {
  const category = ASYNC_KEY_TO_CATEGORY[asyncStorageKey];
  if (category) {
    markDirty(category);
  }
}

export async function syncedSetItem(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
  markDirtyByKey(key);
}

export async function syncedGetItem(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export async function clearLocalProgressCategory(
  category: ProgressCategory,
): Promise<void> {
  const keys = Object.entries(ASYNC_KEY_TO_CATEGORY)
    .filter(([, cat]) => cat === category)
    .map(([key]) => key);
  await Promise.all(keys.map((key) => AsyncStorage.removeItem(key)));
  pendingCategories.delete(category);
}

export async function clearSyncedLocalData(): Promise<void> {
  disableSync();
  await Promise.all(ALL_SYNCED_KEYS.map((key) => AsyncStorage.removeItem(key)));
  await clearSyncCache();
}

export async function fullSync(): Promise<void> {
  const cacheRaw = await AsyncStorage.getItem(SYNC_CACHE_KEY);
  const cache = cacheRaw ? tryParseJSON(cacheRaw) : null;

  const localHasData = await checkLocalHasData();

  if (localHasData && (!cache || !cache.ts)) {
    await pushToServer();
  } else {
    await pullFromServer();
  }
}

async function checkLocalHasData(): Promise<boolean> {
  for (const key of ALL_SYNCED_KEYS) {
    const val = await AsyncStorage.getItem(key);
    if (val !== null) return true;
  }
  return false;
}

export async function clearSyncCache(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_CACHE_KEY);
}

export async function exportProgressBackup(): Promise<Record<string, any>> {
  const body: Record<string, any> = {};
  const categories = Object.keys(ASYNC_KEY_TO_CATEGORY).reduce((acc, key) => {
    acc.add(ASYNC_KEY_TO_CATEGORY[key]);
    return acc;
  }, new Set<ProgressCategory>());

  for (const category of categories) {
    body[category] = await gatherCategoryData(category);
  }

  return {
    schema: "nurai-progress-backup-v1",
    exportedAt: new Date().toISOString(),
    categories: body,
  };
}

export async function restoreProgressBackup(
  payload: unknown,
): Promise<boolean> {
  if (!payload || typeof payload !== "object") return false;
  const backup = payload as {
    schema?: string;
    categories?: Record<string, Record<string, any>>;
  };

  if (backup.schema !== "nurai-progress-backup-v1" || !backup.categories) {
    return false;
  }

  for (const [category, data] of Object.entries(backup.categories)) {
    if (!data || typeof data !== "object") continue;
    await applyCategoryData(category as ProgressCategory, data);
    markDirty(category as ProgressCategory);
  }

  await AsyncStorage.setItem(
    SYNC_CACHE_KEY,
    JSON.stringify({ ts: Date.now(), restoredAt: Date.now() }),
  );
  return true;
}
