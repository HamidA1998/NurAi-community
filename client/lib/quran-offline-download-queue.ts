import AsyncStorage from "@react-native-async-storage/async-storage";

const QURAN_OFFLINE_DOWNLOAD_QUEUE_KEY =
  "nurai_quran_offline_download_queue_v1";

export type QuranOfflineDownloadQueueStatus =
  | "queued"
  | "downloading"
  | "paused"
  | "failed";

export type QuranOfflineDownloadQueueState = {
  planId: string;
  planTitle: string;
  completedVerses: number;
  totalVerses: number;
  status: QuranOfflineDownloadQueueStatus;
  updatedAt: number;
};

function sanitizeQueueState(
  state: QuranOfflineDownloadQueueState,
): QuranOfflineDownloadQueueState {
  const totalVerses = Math.max(0, Math.round(state.totalVerses || 0));
  return {
    planId: state.planId,
    planTitle: state.planTitle,
    completedVerses: Math.max(
      0,
      Math.min(totalVerses, Math.round(state.completedVerses || 0)),
    ),
    totalVerses,
    status: state.status,
    updatedAt: Number.isFinite(state.updatedAt) ? state.updatedAt : Date.now(),
  };
}

export async function getQuranOfflineDownloadQueue(): Promise<QuranOfflineDownloadQueueState | null> {
  try {
    const raw = await AsyncStorage.getItem(QURAN_OFFLINE_DOWNLOAD_QUEUE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuranOfflineDownloadQueueState;
    if (!parsed?.planId || !parsed?.planTitle) return null;
    return sanitizeQueueState(parsed);
  } catch {
    return null;
  }
}

export async function saveQuranOfflineDownloadQueue(
  state: QuranOfflineDownloadQueueState,
): Promise<void> {
  await AsyncStorage.setItem(
    QURAN_OFFLINE_DOWNLOAD_QUEUE_KEY,
    JSON.stringify(sanitizeQueueState({ ...state, updatedAt: Date.now() })),
  );
}

export async function clearQuranOfflineDownloadQueue(): Promise<void> {
  await AsyncStorage.removeItem(QURAN_OFFLINE_DOWNLOAD_QUEUE_KEY);
}
