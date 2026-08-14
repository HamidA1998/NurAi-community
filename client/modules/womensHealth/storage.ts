import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteProgressCategory } from "@/lib/progress-sync";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type {
  Cycle,
  QadaLog,
  WHSettings,
  CycleMetadata,
  MoodEntry,
  JournalEntry,
  WHSourceData,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";

const KEYS = {
  cycles: "wh_engine_cycles",
  qadaLogs: "wh_engine_qada_logs",
  settings: "wh_settings",
  cycleMetadata: "wh_cycle_metadata",
  moodEntries: "wh_mood_entries",
  journalEntries: "wh_journal_entries",
  ghuslAcknowledged: "wh_ghusl_ack",
  consent: "wh_consent_given",
} as const;

const SECURE_KEYS = [KEYS.settings, KEYS.consent];

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") return AsyncStorage.getItem(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === "web") return AsyncStorage.removeItem(key);
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    await AsyncStorage.removeItem(key);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (SECURE_KEYS.includes(key as any)) return secureGet(key);
  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (SECURE_KEYS.includes(key as any)) return secureSet(key, value);
  // Women's Health is deliberately local-only. It must never be swept into
  // the general signed-in progress sync without a separate, explicit consent
  // flow designed for this sensitive category.
  return AsyncStorage.setItem(key, value);
}

function parseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function loadAllData(): Promise<WHSourceData> {
  const [
    cyclesRaw,
    qadaRaw,
    settingsRaw,
    metaRaw,
    moodRaw,
    journalRaw,
    ghuslRaw,
  ] = await Promise.all([
    getItem(KEYS.cycles),
    getItem(KEYS.qadaLogs),
    getItem(KEYS.settings),
    getItem(KEYS.cycleMetadata),
    getItem(KEYS.moodEntries),
    getItem(KEYS.journalEntries),
    getItem(KEYS.ghuslAcknowledged),
  ]);

  return {
    cycles: parseJSON<Cycle[]>(cyclesRaw, []),
    qadaLogs: parseJSON<QadaLog[]>(qadaRaw, []),
    settings: (() => {
      const saved = parseJSON<Partial<WHSettings>>(settingsRaw, {});
      const merged = { ...DEFAULT_SETTINGS, ...saved };
      if (!saved.ramadanRanges || saved.ramadanRanges.length === 0) {
        merged.ramadanRanges = DEFAULT_SETTINGS.ramadanRanges;
      }
      return merged;
    })(),
    cycleMetadata: parseJSON<Record<string, CycleMetadata>>(metaRaw, {}),
    moodEntries: parseJSON<MoodEntry[]>(moodRaw, []),
    journalEntries: parseJSON<JournalEntry[]>(journalRaw, []),
    ghuslAcknowledged: ghuslRaw !== "false",
  };
}

export async function saveCycles(cycles: Cycle[]): Promise<void> {
  await setItem(KEYS.cycles, JSON.stringify(cycles));
}

export async function saveQadaLogs(logs: QadaLog[]): Promise<void> {
  await setItem(KEYS.qadaLogs, JSON.stringify(logs));
}

export async function saveSettings(settings: WHSettings): Promise<void> {
  await setItem(KEYS.settings, JSON.stringify(settings));
}

export async function saveCycleMetadata(
  meta: Record<string, CycleMetadata>,
): Promise<void> {
  await setItem(KEYS.cycleMetadata, JSON.stringify(meta));
}

export async function saveMoodEntries(entries: MoodEntry[]): Promise<void> {
  await setItem(KEYS.moodEntries, JSON.stringify(entries));
}

export async function saveJournalEntries(
  entries: JournalEntry[],
): Promise<void> {
  await setItem(KEYS.journalEntries, JSON.stringify(entries));
}

export async function saveGhuslAcknowledged(ack: boolean): Promise<void> {
  await setItem(KEYS.ghuslAcknowledged, ack ? "true" : "false");
}

export async function loadConsent(): Promise<boolean> {
  const raw = await secureGet(KEYS.consent);
  return raw === "true";
}

export async function saveConsent(given: boolean): Promise<void> {
  await secureSet(KEYS.consent, given ? "true" : "false");
}

export async function deleteAllWHData(): Promise<void> {
  await Promise.all(
    Object.values(KEYS).map((k) =>
      SECURE_KEYS.includes(k as any)
        ? secureDelete(k)
        : AsyncStorage.removeItem(k),
    ),
  );
  await deleteProgressCategory("womensHealth");
}

export async function migrateFromLegacy(): Promise<WHSourceData | null> {
  const legacyCycles = await AsyncStorage.getItem("wh_cycles");
  const legacyQadaPlan = await AsyncStorage.getItem("wh_qada_plan");
  const legacyQadaEntries = await AsyncStorage.getItem("wh_qada_entries");

  if (!legacyCycles) return null;

  try {
    const oldCycles = JSON.parse(legacyCycles) as {
      id: string;
      startDate: string;
      endDate: string | null;
      flowLevel?: string;
      symptoms?: { key: string }[];
      notes?: string;
      createdAt: string;
    }[];

    const now = new Date().toISOString();
    const newCycles: Cycle[] = oldCycles.map((c) => ({
      id: c.id,
      startDate: c.startDate,
      endDate: c.endDate,
      createdAt: c.createdAt || now,
      updatedAt: now,
      notes: c.notes,
    }));

    const metadata: Record<string, CycleMetadata> = {};
    oldCycles.forEach((c) => {
      if (c.flowLevel || (c.symptoms && c.symptoms.length > 0)) {
        metadata[c.id] = {
          flowLevel: (c.flowLevel as CycleMetadata["flowLevel"]) || null,
          symptoms: c.symptoms || [],
          energyLevel: 3,
        };
      }
    });

    let qadaLogs: QadaLog[] = [];
    if (legacyQadaEntries) {
      const oldEntries = JSON.parse(legacyQadaEntries) as {
        id: string;
        date: string;
        count: number;
      }[];
      qadaLogs = oldEntries.map((e) => ({
        id: e.id,
        date: e.date,
        count: e.count || 1,
        type: "qada_fast_completed" as const,
      }));
    }

    let settings: WHSettings = { ...DEFAULT_SETTINGS };
    const oldSettings = await secureGet("wh_settings");
    if (oldSettings) {
      const parsed = JSON.parse(oldSettings);
      settings = { ...DEFAULT_SETTINGS, ...parsed };
    }

    if (legacyQadaPlan) {
      const oldPlan = JSON.parse(legacyQadaPlan);
      if (oldPlan.totalRequired > 0 && settings.ramadanRanges.length === 0) {
        settings.ramadanRanges = [];
      }
    }

    const moodRaw = await AsyncStorage.getItem("wh_mood_entries");
    const journalRaw = await AsyncStorage.getItem("wh_journal_entries");
    const ghuslRaw = await AsyncStorage.getItem("wh_ghusl_ack");

    const data: WHSourceData = {
      cycles: newCycles,
      qadaLogs,
      settings,
      cycleMetadata: metadata,
      moodEntries: moodRaw ? JSON.parse(moodRaw) : [],
      journalEntries: journalRaw ? JSON.parse(journalRaw) : [],
      ghuslAcknowledged: ghuslRaw !== "false",
    };

    await Promise.all([
      saveCycles(data.cycles),
      saveQadaLogs(data.qadaLogs),
      saveSettings(data.settings),
      saveCycleMetadata(data.cycleMetadata),
      saveMoodEntries(data.moodEntries),
      saveJournalEntries(data.journalEntries),
      saveGhuslAcknowledged(data.ghuslAcknowledged),
    ]);

    await AsyncStorage.setItem("wh_migrated_v2", "true");

    return data;
  } catch {
    return null;
  }
}

export async function needsMigration(): Promise<boolean> {
  const migrated = await AsyncStorage.getItem("wh_migrated_v2");
  if (migrated === "true") return false;
  const legacyCycles = await AsyncStorage.getItem("wh_cycles");
  return legacyCycles !== null;
}
