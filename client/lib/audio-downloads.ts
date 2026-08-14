import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const NASHEEDS_DIR = `${FileSystem.documentDirectory}nasheeds/`;
const MANIFEST_PATH = `${NASHEEDS_DIR}manifest.json`;

interface ManifestEntry {
  id: string;
  url: string;
  title: string;
  artist: string;
  downloadedAt: number;
  fileSize: number;
}

type Manifest = Record<string, ManifestEntry>;

export type DownloadedAudioEntry = {
  id: string;
  title: string;
  artist: string;
  downloadedAt: number;
  fileSize: number;
};

let manifestCache: Manifest | null = null;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(NASHEEDS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(NASHEEDS_DIR, { intermediates: true });
  }
}

async function loadManifest(): Promise<Manifest> {
  if (manifestCache) return manifestCache;
  try {
    const raw = await FileSystem.readAsStringAsync(MANIFEST_PATH);
    manifestCache = JSON.parse(raw) as Manifest;
  } catch {
    manifestCache = {};
  }
  return manifestCache;
}

async function saveManifest(m: Manifest): Promise<void> {
  manifestCache = m;
  await ensureDir();
  await FileSystem.writeAsStringAsync(MANIFEST_PATH, JSON.stringify(m));
}

function filePath(id: string): string {
  return `${NASHEEDS_DIR}${id}.mp3`;
}

export async function isDownloaded(id: string): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const manifest = await loadManifest();
  if (!manifest[id]) return false;
  const info = await FileSystem.getInfoAsync(filePath(id));
  return info.exists;
}

export async function getLocalPath(id: string): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const exists = await isDownloaded(id);
  return exists ? filePath(id) : null;
}

export async function getDownloadedIds(): Promise<string[]> {
  if (Platform.OS === "web") return [];
  const manifest = await loadManifest();
  const ids = Object.keys(manifest);
  const valid: string[] = [];
  let pruned = false;
  for (const id of ids) {
    const info = await FileSystem.getInfoAsync(filePath(id));
    if (info.exists) {
      valid.push(id);
    } else {
      delete manifest[id];
      pruned = true;
    }
  }
  if (pruned) {
    await saveManifest(manifest);
  }
  return valid;
}

export async function getDownloadedAudioEntries(): Promise<
  DownloadedAudioEntry[]
> {
  if (Platform.OS === "web") return [];
  const manifest = await loadManifest();
  const entries: DownloadedAudioEntry[] = [];
  let pruned = false;

  for (const entry of Object.values(manifest)) {
    const info = await FileSystem.getInfoAsync(filePath(entry.id));
    if (info.exists) {
      entries.push({
        id: entry.id,
        title: entry.title,
        artist: entry.artist,
        downloadedAt: entry.downloadedAt,
        fileSize: (info as any).size || entry.fileSize || 0,
      });
    } else {
      delete manifest[entry.id];
      pruned = true;
    }
  }

  if (pruned) await saveManifest(manifest);
  return entries.sort((a, b) => b.downloadedAt - a.downloadedAt);
}

export type DownloadProgress = {
  totalBytes: number;
  writtenBytes: number;
  fraction: number;
};

export async function downloadAudio(
  url: string,
  id: string,
  meta: { title: string; artist: string },
  onProgress?: (p: DownloadProgress) => void,
): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    await ensureDir();

    const dest = filePath(id);
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      dest,
      {},
      (dp) => {
        if (onProgress) {
          onProgress({
            totalBytes: dp.totalBytesExpectedToWrite,
            writtenBytes: dp.totalBytesWritten,
            fraction:
              dp.totalBytesExpectedToWrite > 0
                ? dp.totalBytesWritten / dp.totalBytesExpectedToWrite
                : 0,
          });
        }
      },
    );

    const result = await downloadResumable.downloadAsync();
    if (!result || result.status !== 200) {
      try {
        await FileSystem.deleteAsync(dest, { idempotent: true });
      } catch {}
      return false;
    }

    const info = await FileSystem.getInfoAsync(dest);
    const manifest = await loadManifest();
    manifest[id] = {
      id,
      url,
      title: meta.title,
      artist: meta.artist,
      downloadedAt: Date.now(),
      fileSize: (info as any).size || 0,
    };
    await saveManifest(manifest);
    return true;
  } catch (e) {
    console.warn("[AudioDownload] Failed:", e);
    try {
      await FileSystem.deleteAsync(filePath(id), { idempotent: true });
    } catch {}
    return false;
  }
}

export async function deleteDownload(id: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await FileSystem.deleteAsync(filePath(id), { idempotent: true });
  } catch {}
  const manifest = await loadManifest();
  delete manifest[id];
  await saveManifest(manifest);
}

export async function getStorageUsed(): Promise<number> {
  if (Platform.OS === "web") return 0;
  const manifest = await loadManifest();
  let total = 0;
  for (const entry of Object.values(manifest)) {
    total += entry.fileSize || 0;
  }
  return total;
}

export async function deleteAllDownloads(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await FileSystem.deleteAsync(NASHEEDS_DIR, { idempotent: true });
  } catch {}
  manifestCache = {};
  await ensureDir();
  await saveManifest({});
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
