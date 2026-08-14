#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath}: missing file`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(text, needle, label, findings) {
  if (!text.includes(needle)) {
    findings.push(`${label}: missing ${needle}`);
  }
}

function requireNotIncludes(text, needle, label, findings) {
  if (text.includes(needle)) {
    findings.push(`${label}: remove stale ${needle}`);
  }
}

function main() {
  const findings = [];
  const audioUi = read("client/lib/audio-ui.ts");
  const quran = read("client/screens/QuranReaderScreen.tsx");
  const nasheeds = read("client/screens/NasheedsScreen.tsx");
  const home = read("client/screens/HomeScreen.tsx");
  const homeExperience = read(
    "client/components/home/GeneratedHomeExperience.tsx",
  );
  const mediaResume = read("client/services/mediaResumeService.ts");
  const offlineLibrary = read("client/screens/OfflineLibraryScreen.tsx");
  const mediaStorage = read("client/lib/media-storage.ts");
  const quranDownloadQueue = read("client/lib/quran-offline-download-queue.ts");
  const quranTextCache = read("client/lib/quran-offline-text-cache.ts");
  const quranAudioCatalog = read("client/lib/quran-audio-catalog.ts");
  const premiumMediaControls = read(
    "client/components/media/PremiumMediaControls.tsx",
  );
  const appJson = JSON.parse(read("app.json"));

  requireIncludes(
    audioUi,
    "formatMediaSleepTimerSummary",
    "Shared sleep timer summary helper",
    findings,
  );
  requireIncludes(
    audioUi,
    "formatMediaSleepTimerRemaining",
    "Shared sleep timer remaining helper",
    findings,
  );
  requireIncludes(
    audioUi,
    "formatMediaOfflineStatus",
    "Shared offline status helper",
    findings,
  );
  requireIncludes(
    audioUi,
    "formatMediaBackgroundStatus",
    "Shared lock-screen readiness helper",
    findings,
  );
  requireIncludes(
    audioUi,
    "formatMediaBackgroundBadge",
    "Shared lock-screen badge helper",
    findings,
  );
  requireIncludes(
    audioUi,
    "joinMediaModeSummary",
    "Shared media mode summary helper",
    findings,
  );
  requireIncludes(
    read("client/lib/audio-metadata.ts"),
    "sessionLabel",
    "Lock-screen session metadata label",
    findings,
  );
  requireIncludes(
    read("client/lib/audio-metadata.ts"),
    "offlineLabel",
    "Lock-screen offline metadata label",
    findings,
  );
  requireIncludes(
    read("client/lib/audio-metadata.ts"),
    "compactParts",
    "Lock-screen metadata part cleaner",
    findings,
  );
  requireIncludes(
    quran,
    "QURAN_SLEEP_TIMER_OPTIONS",
    "Quran sleep timer options",
    findings,
  );
  requireIncludes(
    quran,
    "0, 10, 20, 30, 60, 120, 180, 240, 360, 480, 720",
    "Quran sleep timer long-session presets",
    findings,
  );
  requireIncludes(
    quran,
    'title: "Until stopped"',
    "Quran continuous playback mode",
    findings,
  );
  requireIncludes(
    quran,
    "sleep-timer-option-0",
    "Quran no-limit sleep timer option",
    findings,
  );
  requireIncludes(
    quran,
    "Set Quran audio to no limit so recitation keeps playing until you stop it",
    "Quran continuous playback accessibility copy",
    findings,
  );
  requireIncludes(
    quran,
    "Keep Quran audio playing until you stop it yourself.",
    "Quran continuous playback customer copy",
    findings,
  );
  requireIncludes(
    quran,
    "if (nextTimer > 0 && !isPremium)",
    "Quran no-limit playback is not blocked by the sleep timer paywall",
    findings,
  );
  requireIncludes(
    quran,
    "const showAudioBar = audioActive;",
    "Quran audio dock includes word and ayah playback",
    findings,
  );
  requireIncludes(
    quran,
    "Math.min(72, Math.max(64, measuredHeight))",
    "Quran audio dock compact height clamp",
    findings,
  );
  requireIncludes(
    quran,
    "paddingBottom: readerBottomPadding",
    "Quran reader reserves measured audio dock space",
    findings,
  );
  requireIncludes(
    quran,
    'testID="button-quran-audio-options"',
    "Quran compact dock options button",
    findings,
  );
  requireIncludes(
    quran,
    'testID="button-stop-audio"',
    "Quran compact dock stop button",
    findings,
  );
  requireIncludes(
    premiumMediaControls,
    'import { NuraiGlass } from "@/design-system/NuraiGlass";',
    "Shared media player uses native/fallback NurAI glass",
    findings,
  );
  requireNotIncludes(
    quran,
    'testID="quran-audio-queue-rail"',
    "Quran dock must not restore the full-screen queue rail",
    findings,
  );
  requireNotIncludes(
    quran,
    'testID="quran-audio-learning-rail"',
    "Quran dock must not restore the full-screen learning rail",
    findings,
  );
  requireIncludes(
    quran,
    "quran-repeat-range-presets",
    "Quran repeat range presets",
    findings,
  );
  requireIncludes(
    quran,
    "quran-repeat-range-loop-builder",
    "Quran repeat range loop builder",
    findings,
  );
  requireIncludes(
    quran,
    "repeatRangeTrackFill",
    "Quran repeat range visual track",
    findings,
  );
  requireIncludes(
    quran,
    "sessionLabel:",
    "Quran lock-screen session metadata",
    findings,
  );
  requireIncludes(
    quran,
    "Offline ready",
    "Quran lock-screen offline metadata",
    findings,
  );
  requireIncludes(
    quran,
    "playFinishedVerse",
    "Quran continuation playback helper",
    findings,
  );
  requireIncludes(
    quran,
    "const localUrl = premiumAudioRef.current",
    "Quran auto-advance prefers downloaded audio",
    findings,
  );
  requireIncludes(
    quran,
    "fallbackUrlForVerse",
    "Quran offline download fallback source",
    findings,
  );
  requireIncludes(
    read("client/lib/quran-audio-downloads.ts"),
    "fallbackUrlForVerse?:",
    "Quran audio downloader fallback contract",
    findings,
  );
  requireIncludes(
    read("client/lib/quran-audio-downloads.ts"),
    "downloadQuranAyahRangeAudio",
    "Quran study range offline downloader",
    findings,
  );
  requireIncludes(
    read("client/lib/quran-audio-downloads.ts"),
    "shouldCancel?:",
    "Quran audio download cancellation contract",
    findings,
  );
  requireIncludes(
    read("client/lib/quran-audio-downloads.ts"),
    "retryAttempts",
    "Quran audio per-ayah retry support",
    findings,
  );
  requireIncludes(
    quranAudioCatalog,
    "QURAN_OFFLINE_PACK_PLANS",
    "Quran offline pack planner catalogue",
    findings,
  );
  requireIncludes(
    quranAudioCatalog,
    "juz-amma",
    "Quran Juz Amma offline pack",
    findings,
  );
  requireIncludes(
    quranAudioCatalog,
    "buildDefaultQuranAudioUrl",
    "Quran offline pack primary audio URL builder",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "offline-quran-pack-planner",
    "Offline Quran pack planner panel",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "handleDownloadQuranOfflinePlan",
    "Offline Quran pack planner download handler",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "offline-quran-pack-cancel-${plan.id}",
    "Offline Quran pack cancel button",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "failedQuranPlanId",
    "Offline Quran pack retry state",
    findings,
  );
  requireIncludes(
    mediaStorage,
    "getMediaStoragePressure",
    "Offline media storage pressure helper",
    findings,
  );
  requireIncludes(
    mediaStorage,
    "MediaStoragePressure",
    "Offline media storage pressure type",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "offline-storage-health-card",
    "Offline storage health card",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "offline-smart-pack-recommendation",
    "Offline smart Quran pack recommendation",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "estimatedAverageQuranAyahBytes",
    "Offline Quran pack size estimate",
    findings,
  );
  requireIncludes(
    quranDownloadQueue,
    "nurai_quran_offline_download_queue_v1",
    "Persisted Quran offline download queue key",
    findings,
  );
  requireIncludes(
    quranDownloadQueue,
    "getQuranOfflineDownloadQueue",
    "Persisted Quran offline queue restore helper",
    findings,
  );
  requireIncludes(
    quranDownloadQueue,
    "saveQuranOfflineDownloadQueue",
    "Persisted Quran offline queue save helper",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "offline-quran-download-resume-card",
    "Offline Quran pack resume card",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "handleResumeQueuedQuranDownload",
    "Offline Quran pack resume handler",
    findings,
  );
  requireIncludes(
    quranTextCache,
    "nurai_quran_text_cache_index_v1",
    "Offline Quran text cache index key",
    findings,
  );
  requireIncludes(
    quranTextCache,
    "removeQuranTextCacheEntry",
    "Offline Quran text cache single remove helper",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "offline-quran-text-cache-manager",
    "Offline Quran text cache manager panel",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "getQuranTextCacheIndex",
    "Offline Quran text cache index loader",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "handleClearQuranTextCache",
    "Offline Quran text cache clear handler",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "handleRemoveQuranTextCacheEntry",
    "Offline Quran text cache per-surah remove handler",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "offline-quran-text-cache-entry-${entry.surahNumber}",
    "Offline Quran text cache entry test IDs",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "Open Quran while online and NurAI will quietly keep the text ready",
    "Offline Quran text cache empty state copy",
    findings,
  );
  requireIncludes(
    quran,
    "button-offline-pack-save-study-range",
    "Quran study range offline pack action",
    findings,
  );
  requireIncludes(
    quran,
    "Save this Quran repeat range for offline listening",
    "Quran repeat range offline accessibility copy",
    findings,
  );
  requireIncludes(
    quran,
    "Save next ayahs",
    "Quran next ayahs offline action copy",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "offline-travel-readiness-card",
    "Offline travel-readiness card",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "offline-pack-manager-v2",
    "Offline pack manager v2 hero metadata",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "offline-next-best-pack-card",
    "Offline next-best download card",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "offline-storage-mix",
    "Offline storage mix breakdown",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "formatRecentOfflineDate",
    "Offline recency copy helper",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "TRAVEL-READY PACK",
    "Offline pack hero copy",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "travelReadinessPercent",
    "Offline pack readiness score",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    "OfflineReadinessStep",
    "Offline pack readiness step component",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    'navigation.navigate("QuranReader", { surahNumber: 1 })',
    "Offline Quran pack action",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    'navigation.navigate("Nasheeds")',
    "Offline nasheed pack action",
    findings,
  );
  requireIncludes(
    offlineLibrary,
    'navigation.navigate("LibraryHome")',
    "Offline library narration action",
    findings,
  );
  requireIncludes(
    nasheeds,
    "nasheedModeSummary",
    "Nasheed mini-player summary",
    findings,
  );
  requireIncludes(
    nasheeds,
    "nasheedBackgroundStatus",
    "Nasheed lock-screen readiness copy",
    findings,
  );
  requireIncludes(
    nasheeds,
    "Lock screen",
    "Nasheed lock-screen label",
    findings,
  );
  requireIncludes(
    nasheeds,
    "miniStatusRow",
    "Nasheed mini-player status strip",
    findings,
  );
  requireIncludes(
    nasheeds,
    "currentNasheedDownloaded",
    "Nasheed offline playback status",
    findings,
  );
  requireIncludes(
    nasheeds,
    "sessionLabel:",
    "Nasheed lock-screen session metadata",
    findings,
  );
  requireIncludes(
    nasheeds,
    "Offline ready",
    "Nasheed lock-screen offline metadata",
    findings,
  );
  requireIncludes(
    audioUi,
    "Until stopped",
    "Shared continuous playback option",
    findings,
  );
  requireIncludes(
    quran,
    "QURAN_AUDIO_END_MODE_OPTIONS",
    "Quran audio ending options remain in the settings sheet",
    findings,
  );
  requireIncludes(
    quran,
    "sleep-timer-option-0",
    "Quran no-limit timer option",
    findings,
  );
  requireIncludes(
    quran,
    "type QuranAudioEndMode",
    "Quran session ending mode type",
    findings,
  );
  requireIncludes(
    quran,
    'AsyncStorage.getItem("quran_audio_end_mode")',
    "Quran session ending preference restore",
    findings,
  );
  requireIncludes(
    quran,
    '"quran_audio_end_mode"',
    "Quran session ending preference persistence key",
    findings,
  );
  requireIncludes(
    quran,
    "persistAudioEndMode",
    "Quran session ending preference persistence helper",
    findings,
  );
  requireIncludes(
    quran,
    "quran-audio-end-mode-panel",
    "Quran session ending mode panel",
    findings,
  );
  requireIncludes(quran, 'id: "ayah"', "Quran stop-after-ayah mode", findings);
  requireIncludes(
    quran,
    'id: "surah"',
    "Quran stop-after-surah mode",
    findings,
  );
  requireIncludes(
    quran,
    "quran-audio-end-mode-${option.id}",
    "Quran session ending mode test IDs",
    findings,
  );
  requireIncludes(
    quran,
    "const QURAN_SLEEP_TIMER_OPTIONS = [\n  0,",
    "Quran continuous playback option is first",
    findings,
  );
  requireIncludes(
    quran,
    "sleepTimerEndsAt",
    "Quran live sleep timer countdown state",
    findings,
  );
  requireIncludes(
    quran,
    "Fades in",
    "Quran gentle fade countdown copy",
    findings,
  );
  requireIncludes(
    quran,
    "Until stopped",
    "Quran until-stopped timer copy",
    findings,
  );
  requireIncludes(
    quran,
    'audioEndModeRef.current === "continuous"',
    "Quran continuous playback loops instead of stopping at surah end",
    findings,
  );
  requireIncludes(
    quran,
    "pendingContinuousAutoplayRef",
    "Quran continuous playback can carry into the next surah after loading",
    findings,
  );
  requireIncludes(
    quran,
    "nextSurahNumber",
    "Quran continuous playback calculates the next surah",
    findings,
  );
  requireIncludes(
    quran,
    "720",
    "Quran extended 12-hour timer option",
    findings,
  );
  requireIncludes(
    quran,
    "quran-custom-sleep-timer-stepper",
    "Quran custom sleep timer stepper",
    findings,
  );
  requireIncludes(
    quran,
    "QURAN_SLEEP_TIMER_STEP_MINUTES",
    "Quran custom sleep timer step size",
    findings,
  );
  requireIncludes(
    quran,
    "handleSleepTimerAdjust",
    "Quran custom sleep timer adjust handler",
    findings,
  );
  requireIncludes(
    quran,
    "button-quran-sleep-timer-plus",
    "Quran custom sleep timer plus button",
    findings,
  );
  requireIncludes(
    quran,
    "button-quran-sleep-timer-minus",
    "Quran custom sleep timer minus button",
    findings,
  );
  requireIncludes(
    nasheeds,
    "formatMediaSleepTimer(minutes)",
    "Nasheed continuous playback display",
    findings,
  );
  requireIncludes(
    nasheeds,
    "Until stopped",
    "Nasheed until-stopped continuous playback copy",
    findings,
  );
  requireIncludes(
    nasheeds,
    "const NASHEED_SLEEP_TIMER_OPTIONS = [\n  0,",
    "Nasheed continuous playback option is first",
    findings,
  );
  requireIncludes(
    nasheeds,
    "nasheed-sleep-timer-${minutes}",
    "Nasheed sleep timer option test IDs",
    findings,
  );
  requireIncludes(
    nasheeds,
    "sleepTimerEndsAt",
    "Nasheed live sleep timer countdown state",
    findings,
  );
  requireIncludes(
    nasheeds,
    "Fades in",
    "Nasheed gentle fade countdown copy",
    findings,
  );
  requireIncludes(
    nasheeds,
    "nasheed-custom-sleep-timer-stepper",
    "Nasheed custom sleep timer stepper",
    findings,
  );
  requireIncludes(
    nasheeds,
    "NASHEED_SLEEP_TIMER_STEP_MINUTES",
    "Nasheed custom sleep timer step size",
    findings,
  );
  requireIncludes(
    nasheeds,
    "button-nasheed-sleep-timer-plus",
    "Nasheed custom sleep timer plus button",
    findings,
  );
  requireIncludes(
    nasheeds,
    "button-nasheed-sleep-timer-minus",
    "Nasheed custom sleep timer minus button",
    findings,
  );
  requireIncludes(
    mediaResume,
    "nurai_recent_media_session_v1",
    "Shared media resume storage key",
    findings,
  );
  requireIncludes(
    quran,
    "saveMediaResumeSession",
    "Quran media resume persistence",
    findings,
  );
  requireIncludes(
    nasheeds,
    "saveMediaResumeSession",
    "Nasheed media resume persistence",
    findings,
  );
  requireIncludes(
    nasheeds,
    'testID="nasheeds-empty-state"',
    "Nasheed premium empty state",
    findings,
  );
  requireIncludes(
    nasheeds,
    "Refresh catalogue",
    "Nasheed customer-safe catalogue retry copy",
    findings,
  );
  requireIncludes(
    nasheeds,
    "Rights-safe catalogue",
    "Nasheed rights-safe empty state signal",
    findings,
  );
  requireIncludes(
    home,
    "loadMediaResumeSession",
    "Home media resume loader",
    findings,
  );
  requireIncludes(
    homeExperience,
    "button-home-continue-listening",
    "Home continue listening card",
    findings,
  );

  const iosBackgroundModes =
    appJson?.expo?.ios?.infoPlist?.UIBackgroundModes || [];
  if (
    !Array.isArray(iosBackgroundModes) ||
    !iosBackgroundModes.includes("audio")
  ) {
    findings.push("app.json: missing iOS audio background mode");
  }
  requireIncludes(
    read("client/lib/audio-transport.ts"),
    "setActiveForLockScreen",
    "Audio transport lock-screen controls",
    findings,
  );
  requireIncludes(
    read("client/lib/audio-transport.ts"),
    "shouldPlayInBackground",
    "Audio transport background mode",
    findings,
  );

  if (findings.length) {
    console.error("Media player release check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Media player release check passed: continuous playback, status strips, background readiness, and offline labels verified.",
  );
}

main();
