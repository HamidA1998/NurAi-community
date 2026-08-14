import AsyncStorage from "@react-native-async-storage/async-storage";

export type MediaResumeKind = "quran" | "nasheed";

export interface MediaResumeSession {
  kind: MediaResumeKind;
  title: string;
  subtitle: string;
  detailLabel: string;
  route: "QuranReader" | "Nasheeds";
  params?: Record<string, unknown>;
  updatedAt: number;
}

export const MEDIA_RESUME_STORAGE_KEY = "nurai_recent_media_session_v1";

const MAX_MEDIA_RESUME_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function cleanText(value: unknown, fallback: string, maxLength = 96): string {
  const text =
    typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!text) return fallback;
  return text.length <= maxLength
    ? text
    : `${text.slice(0, maxLength - 1).trim()}…`;
}

function cleanSession(value: unknown): MediaResumeSession | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<MediaResumeSession>;
  const kind =
    item.kind === "quran" || item.kind === "nasheed" ? item.kind : null;
  const route =
    item.route === "QuranReader" || item.route === "Nasheeds"
      ? item.route
      : null;
  const updatedAt =
    typeof item.updatedAt === "number" && Number.isFinite(item.updatedAt)
      ? item.updatedAt
      : 0;

  if (!kind || !route || !updatedAt) return null;
  if (Date.now() - updatedAt > MAX_MEDIA_RESUME_AGE_MS) return null;

  return {
    kind,
    route,
    updatedAt,
    title: cleanText(
      item.title,
      kind === "quran" ? "Quran recitation" : "Nasheed",
    ),
    subtitle: cleanText(
      item.subtitle,
      kind === "quran" ? "Continue your last ayah" : "Continue your last track",
    ),
    detailLabel: cleanText(item.detailLabel, "Ready to resume", 72),
    params:
      item.params &&
      typeof item.params === "object" &&
      !Array.isArray(item.params)
        ? (item.params as Record<string, unknown>)
        : undefined,
  };
}

export async function saveMediaResumeSession(
  session: Omit<MediaResumeSession, "updatedAt">,
): Promise<void> {
  const clean = cleanSession({ ...session, updatedAt: Date.now() });
  if (!clean) return;
  await AsyncStorage.setItem(MEDIA_RESUME_STORAGE_KEY, JSON.stringify(clean));
}

export async function loadMediaResumeSession(): Promise<MediaResumeSession | null> {
  const raw = await AsyncStorage.getItem(MEDIA_RESUME_STORAGE_KEY);
  if (!raw) return null;
  try {
    return cleanSession(JSON.parse(raw));
  } catch {
    return null;
  }
}
