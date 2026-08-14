import { requireOptionalNativeModule } from "expo-modules-core";

export type AthanAuthorizationStatus =
  | "authorized"
  | "denied"
  | "notDetermined"
  | "unsupported";

type AthanAlarmNativeModule = {
  isSupported(): Promise<boolean>;
  requestAuthorization(): Promise<AthanAuthorizationStatus>;
  authorizationStatus(): AthanAuthorizationStatus;
  schedule(
    id: string,
    timestampMs: number,
    title: string,
    stopText: string,
    soundName: string,
    tintHex: string,
  ): Promise<boolean>;
  cancel(id: string): Promise<void>;
  cancelAll(): Promise<void>;
  scheduledCount(): Promise<number>;
};

// Resolves to null in Expo Go, on Android, or before the native module is
// built into a dev/production client. Callers must null-check.
const native =
  requireOptionalNativeModule<AthanAlarmNativeModule>("AthanAlarm");

export function isAthanAlarmModuleAvailable(): boolean {
  return native != null;
}

export async function isSupported(): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.isSupported();
  } catch {
    return false;
  }
}

export async function requestAuthorization(): Promise<AthanAuthorizationStatus> {
  if (!native) return "unsupported";
  try {
    return await native.requestAuthorization();
  } catch {
    return "notDetermined";
  }
}

export function authorizationStatus(): AthanAuthorizationStatus {
  if (!native) return "unsupported";
  try {
    return native.authorizationStatus();
  } catch {
    return "unsupported";
  }
}

export async function scheduleAthanAlarm(params: {
  id: string;
  timestampMs: number;
  title: string;
  stopText?: string;
  soundName?: string;
  tintHex?: string;
}): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.schedule(
      params.id,
      params.timestampMs,
      params.title,
      params.stopText ?? "Stop",
      params.soundName ?? "",
      // Brand emerald, so the system alarm screen matches the app.
      params.tintHex ?? "#56B394",
    );
  } catch {
    return false;
  }
}

export async function cancelAthanAlarm(id: string): Promise<void> {
  if (!native) return;
  try {
    await native.cancel(id);
  } catch {}
}

export async function cancelAllAthanAlarms(): Promise<void> {
  if (!native) return;
  try {
    await native.cancelAll();
  } catch {}
}

export async function scheduledAthanAlarmCount(): Promise<number> {
  if (!native) return 0;
  try {
    return await native.scheduledCount();
  } catch {
    return 0;
  }
}
