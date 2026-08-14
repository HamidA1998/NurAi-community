import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import { getApiUrl } from "@/lib/query-client";

const CACHE_ROOT = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}library-narrations/`;
const DOWNLOAD_ROOT = `${FileSystem.documentDirectory}library-narrations/`;

interface NarrationResponse {
  audio: string;
  format: "mp3";
  mimeType: "audio/mpeg";
}

export interface LibraryNarrationParams {
  id: string;
  title: string;
  text: string;
  userTier?: string;
}

export type LibraryNarrationDownloadEntry = {
  id: string;
  title: string;
  fileSize: number;
};

function safeFileName(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function cachePath(id: string): string {
  return `${CACHE_ROOT}${safeFileName(id)}.mp3`;
}

function downloadPath(id: string): string {
  return `${DOWNLOAD_ROOT}${safeFileName(id)}.mp3`;
}

const NARRATION_UNAVAILABLE_MESSAGE =
  "Narration is temporarily unavailable. You can still read this chapter and try audio again later.";
const NARRATION_UPGRADE_REQUIRED_MESSAGE =
  "Premium unlocks chapter narration and offline playback.";

export class LibraryNarrationAuthorizationError extends Error {
  constructor(message = NARRATION_UPGRADE_REQUIRED_MESSAGE) {
    super(message);
    this.name = "LibraryNarrationAuthorizationError";
  }
}

export function isLibraryNarrationAuthorizationError(
  error: unknown,
): error is LibraryNarrationAuthorizationError {
  return (
    error instanceof LibraryNarrationAuthorizationError ||
    (error instanceof Error &&
      (error.name === "LibraryNarrationAuthorizationError" ||
        /upgrade|premium|unauthori[sz]ed|payment required/i.test(
          error.message,
        )))
  );
}

async function ensureDirectory(path: string): Promise<void> {
  if (Platform.OS === "web") return;
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

async function exists(uri: string): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists;
}

async function requestNarration(
  text: string,
  userTier?: string,
): Promise<NarrationResponse> {
  let res: Response;
  try {
    res = await fetch(new URL("/api/audio/tts", getApiUrl()), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        text,
        voice: "onyx",
        userTier,
      }),
    });
  } catch {
    throw new Error(NARRATION_UNAVAILABLE_MESSAGE);
  }
  const bodyText = await res.text();
  let body: any = null;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {}

  if (!res.ok) {
    if (
      res.status === 401 ||
      res.status === 402 ||
      body?.error === "upgrade_required" ||
      body?.upgradeRequired === true
    ) {
      throw new LibraryNarrationAuthorizationError(body?.message);
    }
    if (body?.error === "daily_limit_reached" && body?.message) {
      throw new Error(body.message);
    }
    throw new Error(NARRATION_UNAVAILABLE_MESSAGE);
  }

  if (!body?.audio || !body?.mimeType) {
    throw new Error(NARRATION_UNAVAILABLE_MESSAGE);
  }

  return body;
}

async function writeAudioFile(uri: string, audioBase64: string): Promise<void> {
  await FileSystem.writeAsStringAsync(uri, audioBase64, {
    encoding: (FileSystem.EncodingType?.Base64 ?? "base64") as any,
  });
}

export async function isLibraryNarrationDownloaded(
  id: string,
): Promise<boolean> {
  return exists(downloadPath(id));
}

export async function getLibraryNarrationUri(
  params: LibraryNarrationParams,
): Promise<string> {
  const downloaded = downloadPath(params.id);
  if (await exists(downloaded)) return downloaded;

  if (Platform.OS === "web") {
    const narration = await requestNarration(params.text, params.userTier);
    return `data:${narration.mimeType};base64,${narration.audio}`;
  }

  await ensureDirectory(CACHE_ROOT);
  const cached = cachePath(params.id);
  if (await exists(cached)) return cached;

  const narration = await requestNarration(params.text, params.userTier);
  await writeAudioFile(cached, narration.audio);
  return cached;
}

export async function downloadLibraryNarration(
  params: LibraryNarrationParams,
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  await ensureDirectory(DOWNLOAD_ROOT);
  const target = downloadPath(params.id);
  if (await exists(target)) return target;
  const narration = await requestNarration(params.text, params.userTier);
  await writeAudioFile(target, narration.audio);
  return target;
}

export async function deleteLibraryNarrationDownload(
  id: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  await FileSystem.deleteAsync(downloadPath(id), { idempotent: true });
}

export async function getLibraryNarrationStorageSummary(): Promise<{
  narrationCount: number;
  fileSize: number;
}> {
  if (Platform.OS === "web") return { narrationCount: 0, fileSize: 0 };
  const info = await FileSystem.getInfoAsync(DOWNLOAD_ROOT);
  if (!info.exists) return { narrationCount: 0, fileSize: 0 };

  const files = await FileSystem.readDirectoryAsync(DOWNLOAD_ROOT);
  let narrationCount = 0;
  let fileSize = 0;

  for (const file of files) {
    if (!file.endsWith(".mp3")) continue;
    const fileInfo = await FileSystem.getInfoAsync(`${DOWNLOAD_ROOT}${file}`);
    if (fileInfo.exists) {
      narrationCount += 1;
      fileSize += (fileInfo as any).size || 0;
    }
  }

  return { narrationCount, fileSize };
}

export async function getLibraryNarrationDownloadEntries(): Promise<
  LibraryNarrationDownloadEntry[]
> {
  if (Platform.OS === "web") return [];
  const info = await FileSystem.getInfoAsync(DOWNLOAD_ROOT);
  if (!info.exists) return [];

  const files = await FileSystem.readDirectoryAsync(DOWNLOAD_ROOT);
  const entries: LibraryNarrationDownloadEntry[] = [];

  for (const file of files) {
    if (!file.endsWith(".mp3")) continue;
    const fileInfo = await FileSystem.getInfoAsync(`${DOWNLOAD_ROOT}${file}`);
    if (!fileInfo.exists) continue;
    const id = file.replace(/\.mp3$/, "");
    entries.push({
      id,
      title: id.replace(/-/g, " "),
      fileSize: (fileInfo as any).size || 0,
    });
  }

  return entries.sort((a, b) => a.title.localeCompare(b.title));
}

export async function deleteAllLibraryNarrationDownloads(): Promise<void> {
  if (Platform.OS === "web") return;
  await FileSystem.deleteAsync(DOWNLOAD_ROOT, { idempotent: true });
}
