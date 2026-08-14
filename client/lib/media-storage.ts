import {
  deleteAllDownloads,
  deleteDownload,
  getDownloadedAudioEntries,
  getDownloadedIds,
  getStorageUsed,
  type DownloadedAudioEntry,
} from "@/lib/audio-downloads";
import {
  deleteAllQuranAudioDownloads,
  deleteQuranAudioPack,
  getQuranAudioPackSummaries,
  getQuranAudioStorageSummary,
  type QuranAudioPackSummary,
} from "@/lib/quran-audio-downloads";
import {
  deleteAllLibraryNarrationDownloads,
  deleteLibraryNarrationDownload,
  getLibraryNarrationDownloadEntries,
  getLibraryNarrationStorageSummary,
  type LibraryNarrationDownloadEntry,
} from "@/services/libraryNarrationService";
import * as FileSystem from "expo-file-system/legacy";

const STORAGE_RESERVE_BYTES = 1024 * 1024 * 1024;
const STORAGE_WATCH_BYTES = 2 * 1024 * 1024 * 1024;
const STORAGE_LOW_BYTES = 1024 * 1024 * 1024;
const STORAGE_CRITICAL_BYTES = 500 * 1024 * 1024;

export type MediaStoragePressureLevel =
  | "unknown"
  | "healthy"
  | "watch"
  | "low"
  | "critical";

export type MediaStoragePressure = {
  freeBytes: number | null;
  totalCapacityBytes: number | null;
  usedPercent: number | null;
  level: MediaStoragePressureLevel;
  recommendedReserveBytes: number;
  message: string;
};

export type MediaStorageSummary = {
  nasheedAudioBytes: number;
  nasheedTrackCount: number;
  quranAudioBytes: number;
  quranAyahCount: number;
  libraryNarrationBytes: number;
  libraryNarrationCount: number;
  totalBytes: number;
};

export type OfflineMediaItems = {
  quranPacks: QuranAudioPackSummary[];
  nasheeds: DownloadedAudioEntry[];
  libraryNarrations: LibraryNarrationDownloadEntry[];
};

export function formatMediaBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(0.1, mb).toFixed(1)} MB`;
  if (mb < 10) return `${mb.toFixed(1)} MB`;
  if (mb < 1024) return `${Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export async function getMediaStorageSummary(): Promise<MediaStorageSummary> {
  const [nasheedIds, nasheedAudioBytes, quranSummary, narrationSummary] =
    await Promise.all([
      getDownloadedIds(),
      getStorageUsed(),
      getQuranAudioStorageSummary(),
      getLibraryNarrationStorageSummary(),
    ]);

  return {
    nasheedAudioBytes,
    nasheedTrackCount: nasheedIds.length,
    quranAudioBytes: quranSummary.fileSize,
    quranAyahCount: quranSummary.downloadedAyahs,
    libraryNarrationBytes: narrationSummary.fileSize,
    libraryNarrationCount: narrationSummary.narrationCount,
    totalBytes:
      nasheedAudioBytes + quranSummary.fileSize + narrationSummary.fileSize,
  };
}

export async function getMediaStoragePressure(): Promise<MediaStoragePressure> {
  try {
    const [freeBytes, totalCapacityBytes] = await Promise.all([
      (FileSystem as any).getFreeDiskStorageAsync?.(),
      (FileSystem as any).getTotalDiskCapacityAsync?.(),
    ]);
    const safeFreeBytes =
      typeof freeBytes === "number" && Number.isFinite(freeBytes)
        ? freeBytes
        : null;
    const safeTotalCapacityBytes =
      typeof totalCapacityBytes === "number" &&
      Number.isFinite(totalCapacityBytes)
        ? totalCapacityBytes
        : null;

    if (safeFreeBytes === null) {
      return {
        freeBytes: null,
        totalCapacityBytes: safeTotalCapacityBytes,
        usedPercent: null,
        level: "unknown",
        recommendedReserveBytes: STORAGE_RESERVE_BYTES,
        message:
          "NurAI could not read free device storage. Downloads still work, but keep space available before saving large packs.",
      };
    }

    const usedPercent =
      safeTotalCapacityBytes && safeTotalCapacityBytes > 0
        ? Math.round(
            ((safeTotalCapacityBytes - safeFreeBytes) /
              safeTotalCapacityBytes) *
              100,
          )
        : null;
    const level: MediaStoragePressureLevel =
      safeFreeBytes < STORAGE_CRITICAL_BYTES
        ? "critical"
        : safeFreeBytes < STORAGE_LOW_BYTES
          ? "low"
          : safeFreeBytes < STORAGE_WATCH_BYTES
            ? "watch"
            : "healthy";
    const message =
      level === "critical"
        ? "Device storage is very tight. Remove old downloads before saving Quran packs."
        : level === "low"
          ? "Device storage is low. Smaller Quran packs are safer right now."
          : level === "watch"
            ? "You have enough space for small packs. Review storage before saving larger packs."
            : "You have healthy space for offline Quran, nasheeds, and narration.";

    return {
      freeBytes: safeFreeBytes,
      totalCapacityBytes: safeTotalCapacityBytes,
      usedPercent,
      level,
      recommendedReserveBytes: STORAGE_RESERVE_BYTES,
      message,
    };
  } catch {
    return {
      freeBytes: null,
      totalCapacityBytes: null,
      usedPercent: null,
      level: "unknown",
      recommendedReserveBytes: STORAGE_RESERVE_BYTES,
      message:
        "NurAI could not check device storage. Downloads still work, but keep space available before saving large packs.",
    };
  }
}

export async function getOfflineMediaItems(): Promise<OfflineMediaItems> {
  const [quranPacks, nasheeds, libraryNarrations] = await Promise.all([
    getQuranAudioPackSummaries(),
    getDownloadedAudioEntries(),
    getLibraryNarrationDownloadEntries(),
  ]);

  return { quranPacks, nasheeds, libraryNarrations };
}

export async function deleteOfflineMediaItem(
  params:
    | { type: "quran"; surahNumber: number; reciterId: number }
    | { type: "nasheed"; id: string }
    | { type: "library"; id: string },
): Promise<void> {
  if (params.type === "quran") {
    await deleteQuranAudioPack({
      surahNumber: params.surahNumber,
      reciterId: params.reciterId,
    });
    return;
  }
  if (params.type === "nasheed") {
    await deleteDownload(params.id);
    return;
  }
  await deleteLibraryNarrationDownload(params.id);
}

export async function deleteAllOfflineMedia(): Promise<void> {
  await Promise.all([
    deleteAllDownloads(),
    deleteAllQuranAudioDownloads(),
    deleteAllLibraryNarrationDownloads(),
  ]);
}
