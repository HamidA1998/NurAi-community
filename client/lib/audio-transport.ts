import { setAudioModeAsync } from "expo-audio";
import AudioModule from "expo-audio/build/AudioModule";
import { PLAYBACK_STATUS_UPDATE } from "expo-audio/build/AudioEventKeys";

export type TransportState = "idle" | "loading" | "playing" | "paused";

export interface TransportProgress {
  currentTime: number;
  duration: number;
  isBuffering?: boolean;
}

export interface TransportCallbacks {
  onStateChange: (state: TransportState) => void;
  onFinish: () => void;
  onError: (msg: string) => void;
  onProgress?: (progress: TransportProgress) => void;
}

export interface TransportPlaybackOptions {
  allowBackground?: boolean;
  metadata?: {
    title: string;
    artist?: string;
    albumTitle?: string;
    artworkUrl?: string;
  };
}

let player: any = null;
let statusSub: { remove: () => void } | null = null;
let jobId = 0;
let busy = false;
let currentState: TransportState = "idle";
let callbacks: TransportCallbacks | null = null;
let playbackRate = 1.0;
let audioConfiguredForBackground: boolean | null = null;
let fadeInterval: ReturnType<typeof setInterval> | null = null;

function emit(state: TransportState) {
  currentState = state;
  callbacks?.onStateChange(state);
}

async function configureAudio(allowBackground = false) {
  if (audioConfiguredForBackground === allowBackground) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: allowBackground,
      shouldRouteThroughEarpiece: false,
      interruptionMode: "doNotMix",
    });
    audioConfiguredForBackground = allowBackground;
  } catch (e) {
    console.warn("Audio mode config failed:", e);
  }
}

function emitProgress(status: any) {
  if (!status?.isLoaded) return;
  callbacks?.onProgress?.({
    currentTime:
      typeof status.currentTime === "number"
        ? Math.max(0, status.currentTime)
        : 0,
    duration:
      typeof status.duration === "number" ? Math.max(0, status.duration) : 0,
    isBuffering: Boolean(status.isBuffering),
  });
}

function clearFadeOut() {
  if (fadeInterval) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }
}

function destroyPlayer() {
  clearFadeOut();
  if (statusSub) {
    try {
      statusSub.remove();
    } catch {}
    statusSub = null;
  }
  if (player) {
    try {
      player.setActiveForLockScreen?.(false);
    } catch {}
    try {
      player.pause();
    } catch {}
    try {
      player.remove();
    } catch {}
    player = null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForLoaded(p: any, myJob: number): Promise<boolean> {
  if (p.isLoaded) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, 10000);
    const sub = p.addListener(PLAYBACK_STATUS_UPDATE, (status: any) => {
      if (myJob !== jobId) {
        clearTimeout(timeout);
        sub.remove();
        resolve(false);
        return;
      }
      if (status.isLoaded) {
        clearTimeout(timeout);
        sub.remove();
        resolve(true);
      }
    });
  });
}

async function tryLoadAndPlayUri(
  uri: string,
  myJob: number,
  options: TransportPlaybackOptions,
): Promise<boolean> {
  destroyPlayer();
  if (myJob !== jobId) return false;

  const newPlayer = new AudioModule.AudioPlayer({ uri }, 500, false);
  player = newPlayer;

  statusSub = newPlayer.addListener(PLAYBACK_STATUS_UPDATE, (status: any) => {
    emitProgress(status);
    if (status.didJustFinish) {
      callbacks?.onFinish();
    }
  });

  const loaded = await waitForLoaded(newPlayer, myJob);
  if (myJob !== jobId) return false;

  if (!loaded) {
    console.warn("AUDIO load timeout:", uri);
    destroyPlayer();
    return false;
  }

  await delay(60);
  if (myJob !== jobId) return false;

  try {
    newPlayer.playbackRate = playbackRate;
  } catch {}
  try {
    newPlayer.volume = 1;
  } catch {}

  if (options.allowBackground && options.metadata) {
    try {
      newPlayer.setActiveForLockScreen?.(true, options.metadata, {
        showSeekBackward: true,
        showSeekForward: true,
      });
    } catch {}
  }

  try {
    newPlayer.play();
    emit("playing");
    return true;
  } catch (e1) {
    console.warn("AUDIO play attempt 1 failed:", e1);
  }

  if (myJob !== jobId) return false;
  await delay(800);
  if (myJob !== jobId) return false;

  try {
    newPlayer.play();
    emit("playing");
    return true;
  } catch (e2) {
    console.warn("AUDIO play attempt 2 failed:", uri, e2);
    destroyPlayer();
    return false;
  }
}

export async function loadAndPlay(
  uri: string,
  fallbackUri?: string,
  options: TransportPlaybackOptions = {},
): Promise<void> {
  const myJob = ++jobId;

  while (busy) {
    await delay(20);
    if (myJob !== jobId) return;
  }
  busy = true;

  try {
    if (myJob !== jobId) return;

    await configureAudio(Boolean(options.allowBackground));
    emit("loading");
    callbacks?.onProgress?.({ currentTime: 0, duration: 0, isBuffering: true });

    const ok = await tryLoadAndPlayUri(uri, myJob, options);
    if (ok || myJob !== jobId) return;

    if (fallbackUri) {
      console.log("AUDIO primary failed, trying fallback:", fallbackUri);
      const fallbackOk = await tryLoadAndPlayUri(fallbackUri, myJob, options);
      if (fallbackOk || myJob !== jobId) return;
    }

    emit("idle");
    callbacks?.onError("Unable to play audio. Please try again.");
  } catch (loadErr) {
    if (myJob !== jobId) return;
    console.error("AUDIO_FATAL", uri, loadErr);
    destroyPlayer();
    emit("idle");
    callbacks?.onError("Unable to play audio. Please try again.");
  } finally {
    busy = false;
  }
}

export function pausePlayback(): void {
  if (!player) return;
  try {
    player.pause();
    emit("paused");
  } catch {}
}

export function resumePlayback(): void {
  if (!player) return;
  try {
    player.play();
    emit("playing");
  } catch {}
}

export function stopPlayback(): void {
  ++jobId;
  destroyPlayer();
  callbacks?.onProgress?.({ currentTime: 0, duration: 0, isBuffering: false });
  emit("idle");
}

export async function seekToPlayback(seconds: number): Promise<void> {
  if (!player || !Number.isFinite(seconds)) return;

  const duration =
    typeof player.duration === "number" && Number.isFinite(player.duration)
      ? Math.max(0, player.duration)
      : 0;
  const clamped = duration > 0 ? Math.min(duration, Math.max(0, seconds)) : 0;

  try {
    await player.seekTo(clamped, 250, 250);
    callbacks?.onProgress?.({
      currentTime: clamped,
      duration,
      isBuffering: false,
    });
  } catch {}
}

export async function seekByPlayback(seconds: number): Promise<void> {
  if (!player || !Number.isFinite(seconds)) return;
  const currentTime =
    typeof player.currentTime === "number" &&
    Number.isFinite(player.currentTime)
      ? player.currentTime
      : 0;
  await seekToPlayback(currentTime + seconds);
}

export function fadeOutAndStop(durationMs = 7000): void {
  if (!player) {
    stopPlayback();
    return;
  }

  const myJob = ++jobId;
  const fadePlayer = player;
  const steps = 18;
  const intervalMs = Math.max(120, Math.floor(durationMs / steps));
  let step = 0;

  clearFadeOut();

  try {
    fadePlayer.volume = 1;
  } catch {}

  fadeInterval = setInterval(() => {
    if (myJob !== jobId || fadePlayer !== player) {
      clearFadeOut();
      return;
    }

    step += 1;
    const nextVolume = Math.max(0, 1 - step / steps);

    try {
      fadePlayer.volume = nextVolume;
    } catch {}

    if (step >= steps) {
      destroyPlayer();
      callbacks?.onProgress?.({
        currentTime: 0,
        duration: 0,
        isBuffering: false,
      });
      emit("idle");
    }
  }, intervalMs);
}

export function setRate(rate: number) {
  playbackRate = rate;
  if (player) {
    try {
      player.playbackRate = rate;
    } catch {}
  }
}

export function getState(): TransportState {
  return currentState;
}

export function setCallbacks(cb: TransportCallbacks) {
  callbacks = cb;
}

export function teardown() {
  ++jobId;
  destroyPlayer();
  callbacks = null;
  currentState = "idle";
}
