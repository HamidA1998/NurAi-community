import { DeviceEventEmitter, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  cancelAllAthanAlarms,
  authorizationStatus,
  isAthanAlarmModuleAvailable,
  isSupported,
  requestAuthorization,
  scheduleAthanAlarm,
  scheduledAthanAlarmCount,
  type AthanAuthorizationStatus,
} from "../../modules/athan-alarm";

export type { AthanAuthorizationStatus } from "../../modules/athan-alarm";

// AlarmKit is deliberately opt-in. When it is unavailable or not authorised,
// prayer alerts fall back to ordinary local notifications.
export const ATHAN_ALARM_ENABLED_KEY = "athan_alarm_enabled";
const ATHAN_ALARM_HEALTH_KEY = "nurai_athan_alarm_health_v2";
const ATHAN_SCHEDULE_CHANGE_EVENT = "nurai:athan-schedule-change";

export type AthanPrayer = {
  key: string;
  label: string;
  time: Date;
};

export type AthanAlarmHealthStatus =
  | "unsupported"
  | "disabled"
  | "permission_required"
  | "idle"
  | "scheduled"
  | "partial"
  | "failed";

export type AthanAlarmHealth = {
  status: AthanAlarmHealthStatus;
  checkedAt: string;
  requested: number;
  scheduled: number;
  systemScheduled: number;
  nextAlarmAt?: string;
  failures: string[];
};

export type AthanAlarmSyncResult = AthanAlarmHealth & {
  scheduledKeys: string[];
};

export function athanAlarmSupported(): boolean {
  return Platform.OS === "ios" && isAthanAlarmModuleAvailable();
}

export async function isAthanAlarmModuleUsable(): Promise<boolean> {
  if (!athanAlarmSupported()) return false;
  return isSupported();
}

export async function isAthanAlarmEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ATHAN_ALARM_ENABLED_KEY)) === "true";
  } catch {
    return false;
  }
}

export async function setAthanAlarmEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(
      ATHAN_ALARM_ENABLED_KEY,
      enabled ? "true" : "false",
    );
  } catch {}
  if (!enabled) {
    await cancelAllAthanAlarms();
  }
  requestAthanScheduleRefresh();
}

export async function ensureAthanAlarmAuthorization(): Promise<AthanAuthorizationStatus> {
  if (!athanAlarmSupported()) return "unsupported";
  return requestAuthorization();
}

export function getAthanAlarmAuthorizationStatus(): AthanAuthorizationStatus {
  if (!athanAlarmSupported()) return "unsupported";
  return authorizationStatus();
}

export function requestAthanScheduleRefresh(): void {
  DeviceEventEmitter.emit(ATHAN_SCHEDULE_CHANGE_EVENT);
}

export function addAthanScheduleChangeListener(listener: () => void): {
  remove: () => void;
} {
  return DeviceEventEmitter.addListener(ATHAN_SCHEDULE_CHANGE_EVENT, listener);
}

// Stable per-prayer/per-day alarm id so re-syncing replaces rather than
// duplicates. AlarmKit keys on UUID, so we derive a deterministic UUID string.
function stableHexHash(input: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ code, 0x85ebca6b) >>> 0;
  }
  return `${first.toString(16).padStart(8, "0")}${second
    .toString(16)
    .padStart(8, "0")}`;
}

export function alarmIdFor(prayerKey: string, time: Date): string {
  const day = `${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}`;
  const tail = stableHexHash(`${prayerKey}:${day}`).slice(0, 12);
  return `a7000000-0000-4000-8000-${tail}`;
}

export function athanPrayerScheduleKey(prayer: AthanPrayer): string {
  return `${prayer.key}:${prayer.time.toISOString()}`;
}

async function persistHealth(health: AthanAlarmHealth): Promise<void> {
  try {
    await AsyncStorage.setItem(ATHAN_ALARM_HEALTH_KEY, JSON.stringify(health));
  } catch {}
}

export async function getAthanAlarmHealth(): Promise<AthanAlarmHealth> {
  try {
    const stored = await AsyncStorage.getItem(ATHAN_ALARM_HEALTH_KEY);
    if (stored) return JSON.parse(stored) as AthanAlarmHealth;
  } catch {}
  return {
    status: athanAlarmSupported() ? "disabled" : "unsupported",
    checkedAt: new Date().toISOString(),
    requested: 0,
    scheduled: 0,
    systemScheduled: 0,
    failures: [],
  };
}

function resultFor(
  status: AthanAlarmHealthStatus,
  values: Partial<AthanAlarmSyncResult> = {},
): AthanAlarmSyncResult {
  return {
    status,
    checkedAt: new Date().toISOString(),
    requested: values.requested ?? 0,
    scheduled: values.scheduled ?? 0,
    systemScheduled: values.systemScheduled ?? 0,
    nextAlarmAt: values.nextAlarmAt,
    failures: values.failures ?? [],
    scheduledKeys: values.scheduledKeys ?? [],
  };
}

/**
 * Reconcile athan alarms with the upcoming prayer schedule. Cancels all
 * existing athan alarms, then (only when enabled + authorized) schedules a
 * full-athan alarm for each future prayer. Returns a delivery reconciliation
 * result so the notification layer can provide an audible fallback per prayer.
 * Safe no-op on unsupported Android and iOS runtime versions.
 */
export async function syncAthanAlarms(
  prayers: AthanPrayer[],
  options: { tintHex?: string; soundName?: string } = {},
): Promise<AthanAlarmSyncResult> {
  if (!athanAlarmSupported() || !(await isSupported())) {
    const result = resultFor("unsupported");
    await persistHealth(result);
    return result;
  }

  await cancelAllAthanAlarms();

  const enabled = await isAthanAlarmEnabled();
  if (!enabled) {
    const result = resultFor("disabled");
    await persistHealth(result);
    return result;
  }

  const status = await requestAuthorization();
  if (status !== "authorized") {
    const result = resultFor("permission_required", {
      failures: [
        status === "denied" ? "permission_denied" : "permission_not_determined",
      ],
    });
    await persistHealth(result);
    return result;
  }

  const now = Date.now();
  const eligible = prayers.filter(
    (prayer) => prayer.key !== "sunrise" && prayer.time.getTime() > now,
  );
  if (eligible.length === 0) {
    const result = resultFor("idle");
    await persistHealth(result);
    return result;
  }
  let scheduled = 0;
  const scheduledKeys: string[] = [];
  const failures: string[] = [];
  for (const prayer of eligible) {
    const t = prayer.time.getTime();
    const ok = await scheduleAthanAlarm({
      id: alarmIdFor(prayer.key, prayer.time),
      timestampMs: t,
      // The alarm screen is the one moment the app speaks at the time of
      // prayer itself: name the prayer, call to it, and dismiss with intent
      // rather than "stop" language borrowed from ordinary alarms.
      title: `${prayer.label} · Time to pray`,
      stopText: "I'm praying",
      soundName: options.soundName ?? "athan-classic-full.caf",
      tintHex: options.tintHex ?? "#56B394",
    });
    if (ok) {
      scheduled += 1;
      scheduledKeys.push(athanPrayerScheduleKey(prayer));
    } else {
      failures.push(`${prayer.key}:${prayer.time.toISOString()}`);
    }
  }
  const systemScheduled = await scheduledAthanAlarmCount();
  const result = resultFor(
    scheduled === eligible.length && scheduled > 0
      ? "scheduled"
      : scheduled > 0
        ? "partial"
        : "failed",
    {
      requested: eligible.length,
      scheduled,
      systemScheduled,
      nextAlarmAt: eligible[0]?.time.toISOString(),
      failures,
      scheduledKeys,
    },
  );
  await persistHealth(result);
  return result;
}

export async function refreshAthanAlarmHealth(): Promise<AthanAlarmHealth> {
  const current = await getAthanAlarmHealth();
  const next = {
    ...current,
    checkedAt: new Date().toISOString(),
    systemScheduled: athanAlarmSupported()
      ? await scheduledAthanAlarmCount()
      : 0,
  };
  await persistHealth(next);
  return next;
}

export async function scheduleAthanTestAlarm(
  soundName: string,
  secondsFromNow = 60,
): Promise<boolean> {
  if (!athanAlarmSupported() || !(await isSupported())) return false;
  const status = await requestAuthorization();
  if (status !== "authorized") return false;
  const fireDate = new Date(Date.now() + Math.max(15, secondsFromNow) * 1000);
  return scheduleAthanAlarm({
    id: alarmIdFor(`test-${Date.now()}`, fireDate),
    timestampMs: fireDate.getTime(),
    title: "Athan preview · NurAI",
    stopText: "Stop preview",
    soundName,
    tintHex: "#56B394",
  });
}
