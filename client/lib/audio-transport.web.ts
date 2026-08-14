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

let audio: HTMLAudioElement | null = null;
let jobId = 0;
let busy = false;
let currentState: TransportState = "idle";
let callbacks: TransportCallbacks | null = null;
let playbackRate = 1.0;

function emit(state: TransportState) {
  currentState = state;
  callbacks?.onStateChange(state);
}

function destroyAudio() {
  if (!audio) return;
  try {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  } catch {}
  audio.onended = null;
  audio.onerror = null;
  audio.onplay = null;
  audio.onpause = null;
  audio.ontimeupdate = null;
  audio.onloadedmetadata = null;
  audio = null;
}

function emitProgress(el: HTMLAudioElement, isBuffering = false) {
  callbacks?.onProgress?.({
    currentTime: Number.isFinite(el.currentTime)
      ? Math.max(0, el.currentTime)
      : 0,
    duration: Number.isFinite(el.duration) ? Math.max(0, el.duration) : 0,
    isBuffering,
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForCanPlay(el: HTMLAudioElement, myJob: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (el.readyState >= 3) {
      resolve(true);
      return;
    }
    const timeout = setTimeout(() => resolve(false), 10000);
    const onReady = () => {
      clearTimeout(timeout);
      el.removeEventListener("canplay", onReady);
      el.removeEventListener("error", onErr);
      resolve(true);
    };
    const onErr = () => {
      clearTimeout(timeout);
      el.removeEventListener("canplay", onReady);
      el.removeEventListener("error", onErr);
      resolve(false);
    };
    el.addEventListener("canplay", onReady);
    el.addEventListener("error", onErr);
  });
}

async function tryLoadAndPlayUri(uri: string, myJob: number): Promise<boolean> {
  destroyAudio();
  if (myJob !== jobId) return false;

  const el = new Audio(uri);
  el.preload = "auto";
  audio = el;

  el.onended = () => {
    callbacks?.onFinish();
  };
  el.ontimeupdate = () => emitProgress(el);
  el.onloadedmetadata = () => emitProgress(el);

  const loaded = await waitForCanPlay(el, myJob);
  if (myJob !== jobId) return false;

  if (!loaded) {
    console.warn("AUDIO load timeout:", uri);
    destroyAudio();
    return false;
  }

  await delay(60);
  if (myJob !== jobId) return false;

  el.playbackRate = playbackRate;

  try {
    await el.play();
    emit("playing");
    return true;
  } catch (e1) {
    console.warn("AUDIO play attempt 1 failed:", e1);
  }

  if (myJob !== jobId) return false;
  await delay(800);
  if (myJob !== jobId) return false;

  try {
    await el.play();
    emit("playing");
    return true;
  } catch (e2) {
    console.warn("AUDIO play attempt 2 failed:", uri, e2);
    destroyAudio();
    return false;
  }
}

export async function loadAndPlay(
  uri: string,
  fallbackUri?: string,
  _options: TransportPlaybackOptions = {},
): Promise<void> {
  const myJob = ++jobId;

  while (busy) {
    await delay(20);
    if (myJob !== jobId) return;
  }
  busy = true;

  try {
    if (myJob !== jobId) return;
    emit("loading");
    callbacks?.onProgress?.({ currentTime: 0, duration: 0, isBuffering: true });

    const ok = await tryLoadAndPlayUri(uri, myJob);
    if (ok || myJob !== jobId) return;

    if (fallbackUri) {
      console.log("AUDIO primary failed, trying fallback:", fallbackUri);
      const fallbackOk = await tryLoadAndPlayUri(fallbackUri, myJob);
      if (fallbackOk || myJob !== jobId) return;
    }

    emit("idle");
    callbacks?.onError("Unable to play audio. Please try again.");
  } catch (loadErr) {
    if (myJob !== jobId) return;
    console.error("AUDIO_FATAL", uri, loadErr);
    destroyAudio();
    emit("idle");
    callbacks?.onError("Unable to play audio. Please try again.");
  } finally {
    busy = false;
  }
}

export function pausePlayback(): void {
  if (!audio) return;
  try {
    audio.pause();
    emit("paused");
  } catch {}
}

export function resumePlayback(): void {
  if (!audio) return;
  try {
    audio.play();
    emit("playing");
  } catch {}
}

export function stopPlayback(): void {
  ++jobId;
  destroyAudio();
  callbacks?.onProgress?.({ currentTime: 0, duration: 0, isBuffering: false });
  emit("idle");
}

export async function seekToPlayback(seconds: number): Promise<void> {
  if (!audio || !Number.isFinite(seconds)) return;
  const duration = Number.isFinite(audio.duration)
    ? Math.max(0, audio.duration)
    : 0;
  const clamped = duration > 0 ? Math.min(duration, Math.max(0, seconds)) : 0;
  try {
    audio.currentTime = clamped;
    callbacks?.onProgress?.({
      currentTime: clamped,
      duration,
      isBuffering: false,
    });
  } catch {}
}

export async function seekByPlayback(seconds: number): Promise<void> {
  if (!audio || !Number.isFinite(seconds)) return;
  const currentTime = Number.isFinite(audio.currentTime)
    ? Math.max(0, audio.currentTime)
    : 0;
  await seekToPlayback(currentTime + seconds);
}

export function setRate(rate: number) {
  playbackRate = rate;
  if (audio) {
    try {
      audio.playbackRate = rate;
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
  destroyAudio();
  callbacks = null;
  currentState = "idle";
}
