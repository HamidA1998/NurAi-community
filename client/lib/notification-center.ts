import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";
import { loadProfileV3 } from "@/services/nuraiProfileV3";

export type AppNotificationType =
  | "prayer"
  | "fasting"
  | "reading"
  | "dhikr"
  | "family"
  | "update"
  | "system";
export type AppNotificationTab = "Reminders" | "Updates" | "System";

export type AppNotificationCenterItem = {
  id: string;
  title: string;
  body: string;
  type: AppNotificationType;
  read: boolean;
  timestamp: number;
  route?: string;
  params?: Record<string, unknown>;
};

const STORAGE_KEYS: Record<AppNotificationTab, string> = {
  Reminders: "app_notifications_reminders",
  Updates: "app_notifications_updates",
  System: "app_notifications_system",
};

const MAX_ITEMS_PER_TAB = 60;

export async function personalizeNotificationText(
  text?: string | null,
): Promise<string> {
  if (!text) return "";
  if (!/\{name\}/i.test(text)) return text;

  try {
    const profile = await loadProfileV3();
    const name = profile.name?.trim() || "there";
    return text.replace(/\{name\}/gi, name);
  } catch {
    return text.replace(/\{name\}/gi, "there");
  }
}

export function getNotificationTab(
  type: AppNotificationType,
): AppNotificationTab {
  if (type === "update" || type === "family") return "Updates";
  if (type === "system") return "System";
  return "Reminders";
}

export function inferNotificationType(
  identifier?: string,
  dataType?: unknown,
): AppNotificationType {
  if (typeof dataType === "string") {
    if (
      [
        "prayer",
        "fasting",
        "reading",
        "dhikr",
        "family",
        "family_message",
        "update",
        "system",
      ].includes(dataType)
    ) {
      return dataType === "family_message"
        ? "family"
        : (dataType as AppNotificationType);
    }
  }

  const id = (identifier || "").toLowerCase();
  if (id.includes("prayer")) return "prayer";
  if (id.includes("fasting") || id.includes("suhoor") || id.includes("iftar"))
    return "fasting";
  if (id.includes("quran") || id.includes("reading")) return "reading";
  if (id.includes("dhikr") || id.includes("adhkar") || id.includes("tasbeeh"))
    return "dhikr";
  if (id.includes("update")) return "update";
  return "system";
}

export async function addNotificationToCenter(input: {
  id?: string;
  title?: string | null;
  body?: string | null;
  type?: AppNotificationType;
  tab?: AppNotificationTab;
  timestamp?: number;
  route?: string;
  params?: Record<string, unknown>;
}): Promise<void> {
  const title = await personalizeNotificationText(input.title || "NurAI");
  const body = await personalizeNotificationText(input.body || "");
  const type = input.type || "system";
  const tab = input.tab || getNotificationTab(type);
  const key = STORAGE_KEYS[tab];
  const id = input.id || `${type}-${input.timestamp || Date.now()}`;

  try {
    const raw = await AsyncStorage.getItem(key);
    const current: AppNotificationCenterItem[] = raw ? JSON.parse(raw) : [];
    const nextItem: AppNotificationCenterItem = {
      id,
      title,
      body,
      type,
      read: false,
      timestamp: input.timestamp || Date.now(),
      ...(input.route ? { route: input.route } : {}),
      ...(input.params ? { params: input.params } : {}),
    };
    const next = [nextItem, ...current.filter((item) => item.id !== id)].slice(
      0,
      MAX_ITEMS_PER_TAB,
    );
    await syncedSetItem(key, JSON.stringify(next));
  } catch {}
}
