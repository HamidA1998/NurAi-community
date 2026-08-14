import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const QURAN_AUDIO_DIR = `${FileSystem.documentDirectory}quran-audio/`;
const MANIFEST_PATH = `${QURAN_AUDIO_DIR}manifest.json`;

export type QuranAudioDownloadProgress = {
  totalVerses: number;
  completedVerses: number;
  fraction: number;
};

type QuranAudioManifestEntry = {
  id: string;
  surahNumber: number;
  verseNumber: number;
  reciterId: number;
  title: string;
  downloadedAt: number;
  fileSize: number;
};

type QuranAudioManifest = Record<string, QuranAudioManifestEntry>;

export type QuranAudioPackSummary = {
  id: string;
  surahNumber: number;
  reciterId: number;
  title: string;
  downloadedAyahs: number;
  fileSize: number;
  downloadedAt: number;
};

let manifestCache: QuranAudioManifest | null = null;

function quranAudioId(params: {
  surahNumber: number;
  verseNumber: number;
  reciterId: number;
}): string {
  return `${params.reciterId}-${params.surahNumber}-${params.verseNumber}`;
}

function quranAudioPath(params: {
  surahNumber: number;
  verseNumber: number;
  reciterId: number;
}): string {
  return `${QURAN_AUDIO_DIR}${quranAudioId(params)}.mp3`;
}

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(QURAN_AUDIO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(QURAN_AUDIO_DIR, {
      intermediates: true,
    });
  }
}

async function loadManifest(): Promise<QuranAudioManifest> {
  if (manifestCache) return manifestCache;
  try {
    const raw = await FileSystem.readAsStringAsync(MANIFEST_PATH);
    manifestCache = JSON.parse(raw) as QuranAudioManifest;
  } catch {
    manifestCache = {};
  }
  return manifestCache;
}

async function saveManifest(manifest: QuranAudioManifest): Promise<void> {
  manifestCache = manifest;
  await ensureDir();
  await FileSystem.writeAsStringAsync(MANIFEST_PATH, JSON.stringify(manifest));
}

export async function getLocalQuranAudioPath(params: {
  surahNumber: number;
  verseNumber: number;
  reciterId: number;
}): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const id = quranAudioId(params);
  const manifest = await loadManifest();
  if (!manifest[id]) return null;
  const localPath = quranAudioPath(params);
  const info = await FileSystem.getInfoAsync(localPath);
  return info.exists ? localPath : null;
}

export async function getQuranSurahDownloadStatus(params: {
  surahNumber: number;
  reciterId: number;
  totalVerses: number;
}): Promise<{ downloaded: number; total: number; fileSize: number }> {
  if (Platform.OS === "web") {
    return { downloaded: 0, total: params.totalVerses, fileSize: 0 };
  }

  const manifest = await loadManifest();
  let downloaded = 0;
  let fileSize = 0;
  let pruned = false;

  for (let verseNumber = 1; verseNumber <= params.totalVerses; verseNumber++) {
    const id = quranAudioId({ ...params, verseNumber });
    if (!manifest[id]) continue;
    const info = await FileSystem.getInfoAsync(
      quranAudioPath({ ...params, verseNumber }),
    );
    if (info.exists) {
      downloaded += 1;
      fileSize += (info as any).size || manifest[id]?.fileSize || 0;
    } else {
      delete manifest[id];
      pruned = true;
    }
  }

  if (pruned) await saveManifest(manifest);
  return { downloaded, total: params.totalVerses, fileSize };
}

export async function getQuranAudioStorageSummary(): Promise<{
  downloadedAyahs: number;
  fileSize: number;
}> {
  if (Platform.OS === "web") {
    return { downloadedAyahs: 0, fileSize: 0 };
  }

  const manifest = await loadManifest();
  let downloadedAyahs = 0;
  let fileSize = 0;
  let pruned = false;

  for (const entry of Object.values(manifest)) {
    const info = await FileSystem.getInfoAsync(
      quranAudioPath({
        surahNumber: entry.surahNumber,
        verseNumber: entry.verseNumber,
        reciterId: entry.reciterId,
      }),
    );
    if (info.exists) {
      downloadedAyahs += 1;
      fileSize += (info as any).size || entry.fileSize || 0;
    } else {
      delete manifest[entry.id];
      pruned = true;
    }
  }

  if (pruned) await saveManifest(manifest);
  return { downloadedAyahs, fileSize };
}

function quranPackTitle(entry: QuranAudioManifestEntry): string {
  return entry.title.replace(/\s+\d+:\d+$/, "") || `Surah ${entry.surahNumber}`;
}

export async function getQuranAudioPackSummaries(): Promise<
  QuranAudioPackSummary[]
> {
  if (Platform.OS === "web") return [];
  const manifest = await loadManifest();
  const packs = new Map<string, QuranAudioPackSummary>();
  let pruned = false;

  for (const entry of Object.values(manifest)) {
    const info = await FileSystem.getInfoAsync(
      quranAudioPath({
        surahNumber: entry.surahNumber,
        verseNumber: entry.verseNumber,
        reciterId: entry.reciterId,
      }),
    );
    if (!info.exists) {
      delete manifest[entry.id];
      pruned = true;
      continue;
    }

    const packId = `${entry.reciterId}-${entry.surahNumber}`;
    const current = packs.get(packId);
    packs.set(packId, {
      id: packId,
      surahNumber: entry.surahNumber,
      reciterId: entry.reciterId,
      title: current?.title ?? quranPackTitle(entry),
      downloadedAyahs: (current?.downloadedAyahs ?? 0) + 1,
      fileSize:
        (current?.fileSize ?? 0) + ((info as any).size || entry.fileSize || 0),
      downloadedAt: Math.max(current?.downloadedAt ?? 0, entry.downloadedAt),
    });
  }

  if (pruned) await saveManifest(manifest);
  return Array.from(packs.values()).sort(
    (a, b) => b.downloadedAt - a.downloadedAt,
  );
}

export async function deleteQuranAudioPack(params: {
  surahNumber: number;
  reciterId: number;
}): Promise<void> {
  if (Platform.OS === "web") return;
  const manifest = await loadManifest();

  for (const entry of Object.values(manifest)) {
    if (
      entry.surahNumber !== params.surahNumber ||
      entry.reciterId !== params.reciterId
    ) {
      continue;
    }
    await FileSystem.deleteAsync(
      quranAudioPath({
        surahNumber: entry.surahNumber,
        verseNumber: entry.verseNumber,
        reciterId: entry.reciterId,
      }),
      { idempotent: true },
    );
    delete manifest[entry.id];
  }

  await saveManifest(manifest);
}

export async function downloadQuranSurahAudio(params: {
  surahNumber: number;
  surahName: string;
  reciterId: number;
  totalVerses: number;
  urlForVerse: (verseNumber: number) => string;
  fallbackUrlForVerse?: (verseNumber: number) => string;
  onProgress?: (progress: QuranAudioDownloadProgress) => void;
  shouldCancel?: () => boolean;
  retryAttempts?: number;
}): Promise<boolean> {
  return downloadQuranAyahRangeAudio({
    ...params,
    startVerse: 1,
    endVerse: params.totalVerses,
  });
}

export async function downloadQuranAyahRangeAudio(params: {
  surahNumber: number;
  surahName: string;
  reciterId: number;
  totalVerses: number;
  startVerse: number;
  endVerse: number;
  urlForVerse: (verseNumber: number) => string;
  fallbackUrlForVerse?: (verseNumber: number) => string;
  onProgress?: (progress: QuranAudioDownloadProgress) => void;
  shouldCancel?: () => boolean;
  retryAttempts?: number;
}): Promise<boolean> {
  if (Platform.OS === "web") return false;
  await ensureDir();
  const manifest = await loadManifest();
  let completed = 0;
  const startVerse = Math.max(
    1,
    Math.min(params.totalVerses, params.startVerse),
  );
  const endVerse = Math.max(
    startVerse,
    Math.min(params.totalVerses, params.endVerse),
  );
  const rangeTotal = endVerse - startVerse + 1;
  const retryAttempts = Math.max(0, params.retryAttempts ?? 1);

  for (let verseNumber = startVerse; verseNumber <= endVerse; verseNumber++) {
    if (params.shouldCancel?.()) return false;

    const id = quranAudioId({ ...params, verseNumber });
    const destination = quranAudioPath({ ...params, verseNumber });
    const existing = await FileSystem.getInfoAsync(destination);

    if (!existing.exists) {
      let downloaded = false;

      for (let attempt = 0; attempt <= retryAttempts; attempt++) {
        if (params.shouldCancel?.()) return false;

        await FileSystem.deleteAsync(destination, { idempotent: true });
        try {
          const primaryDownload = FileSystem.createDownloadResumable(
            params.urlForVerse(verseNumber),
            destination,
          );
          let result = await primaryDownload.downloadAsync();

          if (
            (!result || result.status < 200 || result.status >= 300) &&
            params.fallbackUrlForVerse
          ) {
            await FileSystem.deleteAsync(destination, { idempotent: true });
            const fallbackDownload = FileSystem.createDownloadResumable(
              params.fallbackUrlForVerse(verseNumber),
              destination,
            );
            result = await fallbackDownload.downloadAsync();
          }

          downloaded = Boolean(
            result && result.status >= 200 && result.status < 300,
          );
        } catch {
          downloaded = false;
        }

        if (downloaded) break;
      }

      if (!downloaded) {
        await FileSystem.deleteAsync(destination, { idempotent: true });
        return false;
      }
    }

    if (params.shouldCancel?.()) return false;

    const info = await FileSystem.getInfoAsync(destination);
    manifest[id] = {
      id,
      surahNumber: params.surahNumber,
      verseNumber,
      reciterId: params.reciterId,
      title: `${params.surahName} ${params.surahNumber}:${verseNumber}`,
      downloadedAt: Date.now(),
      fileSize: (info as any).size || 0,
    };
    completed += 1;
    params.onProgress?.({
      totalVerses: rangeTotal,
      completedVerses: completed,
      fraction: completed / rangeTotal,
    });
    await saveManifest(manifest);
  }

  await saveManifest(manifest);
  return true;
}

export async function deleteQuranSurahAudio(params: {
  surahNumber: number;
  reciterId: number;
  totalVerses: number;
}): Promise<{ removed: number; fileSize: number }> {
  if (Platform.OS === "web") return { removed: 0, fileSize: 0 };
  const manifest = await loadManifest();
  let removed = 0;
  let fileSize = 0;

  for (let verseNumber = 1; verseNumber <= params.totalVerses; verseNumber++) {
    const id = quranAudioId({ ...params, verseNumber });
    const destination = quranAudioPath({ ...params, verseNumber });
    const info = await FileSystem.getInfoAsync(destination);
    if (info.exists) {
      removed += 1;
      fileSize += (info as any).size || manifest[id]?.fileSize || 0;
    }
    await FileSystem.deleteAsync(destination, {
      idempotent: true,
    });
    delete manifest[id];
  }

  await saveManifest(manifest);
  return { removed, fileSize };
}

export async function deleteAllQuranAudioDownloads(): Promise<void> {
  if (Platform.OS === "web") return;
  await FileSystem.deleteAsync(QURAN_AUDIO_DIR, { idempotent: true });
  manifestCache = {};
  await ensureDir();
  await saveManifest({});
}
