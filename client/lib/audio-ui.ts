import type { TransportProgress, TransportState } from "@/lib/audio-transport";

export function isMediaSleepTimerContinuous(minutes: number): boolean {
  return minutes <= 0;
}

export function formatMediaSleepTimer(minutes: number): string {
  if (isMediaSleepTimerContinuous(minutes)) return "Until stopped";
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${minutes}m`;
}

export function formatMediaSleepTimerControlLabel(minutes: number): string {
  return isMediaSleepTimerContinuous(minutes)
    ? "Until stopped"
    : formatMediaSleepTimer(minutes);
}

export function formatMediaSleepTimerSummary(minutes: number): string {
  if (isMediaSleepTimerContinuous(minutes)) return "Plays until stopped";
  return `Stops in ${formatMediaSleepTimer(minutes)}`;
}

export function formatMediaBackgroundStatus(enabled: boolean): string {
  return enabled ? "Lock screen ready" : "Premium lock screen";
}

export function formatMediaBackgroundBadge(enabled: boolean): string {
  return enabled ? "Lock screen" : "Premium";
}

export function formatMediaSleepTimerRemaining(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "now";
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60000));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function formatMediaOfflineStatus(
  offlineReady: boolean,
  partialPercent = 0,
): string {
  if (offlineReady) return "Offline ready";
  if (partialPercent > 0) return `Saving ${partialPercent}%`;
  return "Streaming";
}

export function joinMediaModeSummary(parts: (string | false | null)[]) {
  return parts.filter(Boolean).join(" • ");
}

export function formatMediaTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

export function getMediaProgressPercent(
  progress: TransportProgress,
  state: TransportState,
  loadingFallback = 30,
  playingFallback = 12,
): number {
  if (progress.duration > 0) {
    return Math.min(
      100,
      Math.max(0, (progress.currentTime / progress.duration) * 100),
    );
  }
  if (state === "loading") return loadingFallback;
  if (state === "playing") return playingFallback;
  return 0;
}
