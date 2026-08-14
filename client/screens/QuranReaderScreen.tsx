import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  Switch,
  AppState,
  TextInput,
  Share,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";
import {
  loadAndPlay as transportPlay,
  pausePlayback,
  resumePlayback,
  fadeOutAndStop as transportFadeOutAndStop,
  stopPlayback as transportStop,
  setRate as transportSetRate,
  setCallbacks as transportSetCallbacks,
  teardown as transportTeardown,
  TransportState,
  TransportProgress,
} from "@/lib/audio-transport";
import { buildQuranAudioMetadata } from "@/lib/audio-metadata";
import {
  formatMediaSleepTimer,
  formatMediaSleepTimerRemaining,
  getMediaProgressPercent,
} from "@/lib/audio-ui";
import {
  formatMediaBytes,
  getMediaStorageSummary,
  type MediaStorageSummary,
} from "@/lib/media-storage";
import {
  deleteQuranSurahAudio,
  downloadQuranAyahRangeAudio,
  downloadQuranSurahAudio,
  getLocalQuranAudioPath,
  getQuranSurahDownloadStatus,
  type QuranAudioDownloadProgress,
} from "@/lib/quran-audio-downloads";
import {
  getQuranTextCache,
  saveQuranTextCache,
} from "@/lib/quran-offline-text-cache";

import * as Haptics from "expo-haptics";
import { toggleBookmark, isBookmarked } from "@/lib/bookmarks";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  updateSurahProgress,
  migrateFromLegacy,
  getQuranStats,
  TOTAL_QURAN_VERSES,
  type QuranStats,
} from "@/lib/quran-progress";
import { useNurAI } from "@/context/NurAIContext";
import { trackQuranReading } from "@/services/achievementsTracker";
import { recordGardenAction } from "@/services/gardenService";
import { useSubscription } from "@/context/SubscriptionContext";
import {
  FREE_RECITER_COUNT,
  FREE_WORD_BY_WORD_SURAHS,
} from "@/config/entitlements";
import { PremiumBadge } from "@/components/PremiumGate";
import {
  MediaProgressBar,
  PremiumMiniPlayerSurface,
} from "@/components/media/PremiumMediaControls";
import {
  AIResponseModal,
  AIResponseState,
  AIResponseData,
  customerSafeAIErrorMessage,
} from "@/components/AIResponseModal";
import { NurAILogoMark } from "@/components/NurAILogoMark";
import { NuraiGlass } from "@/design-system/NuraiGlass";
import { Aurora } from "@/design-system/Aurora";
import { QuranVerseRosette } from "@/components/quran/QuranSanctuaryArtwork";
import {
  GeometricCardPattern,
  GoldDivider,
  QuranIconSvg,
} from "@/components/premium/svg/PremiumSvgs";
import {
  askAboutVerse,
  AIContextError,
  type AICitation,
} from "@/services/aiContextService";
import { mapAIContextResponseToModalData } from "@/services/personalAIResponseMapper";
import {
  addVersesToSR,
  recordReview,
  qualityFromAction,
  type HifzSRStats,
  getStats as getHifzStats,
} from "@/services/hifzSpacedRepetition";
import {
  createFamilyQuranChallenge,
  buildQuranAyahJourney,
  buildQuranDailySessionHandoff,
  buildQuranProgressIdentity,
  buildQuranReadingSessionContract,
  buildQuranScholarReviewEscalationContract,
  buildQuranStreakRecoveryKhatmahPlan,
  buildQuranWordLearningPlan,
  getQuranAyahPracticeStatus,
  getQuranLearningStats,
  getQuranWordMastery,
  learnQuranWord,
  normalizeArabicSearchTerm,
  quranWordAudioUrl,
  getQuranReflectionNote,
  saveQuranRecitationPractice,
  saveAyahMemoryCard,
  saveQuranReflectionNote,
  searchQuranWordOccurrences,
  type QuranLearningStats,
  type QuranProgressIdentity,
  type QuranRecitationPracticeQuality,
  type QuranDailySessionHandoff,
  type QuranReadingSessionContract,
  type QuranStreakRecoveryKhatmahPlan,
  type QuranScholarReviewEscalationContract,
  type QuranAyahPracticeStatus,
  type QuranAyahJourney,
  type QuranReflectionNote,
  type QuranWordMastery,
  type QuranWordOccurrence,
} from "@/services/quranLearningService";
import { saveMediaResumeSession } from "@/services/mediaResumeService";
import { AppIcon, type AppIconName } from "@/components/icons";

const QURAN_AUDIO_UNAVAILABLE_COPY =
  "Audio is temporarily unavailable. Please try another reciter or try again shortly.";
const SHOW_EXTENDED_QURAN_STUDY_BLOCKS = false;
const QURAN_SLEEP_TIMER_OPTIONS = [
  0, 10, 20, 30, 60, 120, 180, 240, 360, 480, 720,
] as const;
const QURAN_SLEEP_TIMER_STEP_MINUTES = 5;
const QURAN_SLEEP_TIMER_MIN_MINUTES = 5;
const QURAN_SLEEP_TIMER_MAX_MINUTES = 720;
const QURAN_SLEEP_FADE_OUT_MS = 7000;
// The reciter chip is narrow, so a full name ("Mishary Rashid Alafasy") used to
// clip mid-word to "Mishary Rash…". Reciters are known by the last part of the
// name, which is both recognisable and short enough to always fit.
function reciterShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return fullName;
  const last = parts[parts.length - 1];
  return last.length >= 4 ? last : parts.slice(-2).join(" ");
}
// Hitting a paid capability is an upgrade moment, not a failure. The audio
// notice banner recognises this exact message and renders a way through
// instead of an error, so there is one source of truth for both.
const QURAN_BACKGROUND_PLAYBACK_UPGRADE_NOTICE =
  "Keep listening with the screen off. Premium plays the Quran in the background.";
type QuranAudioEndMode = "continuous" | "ayah" | "surah" | "timer";
type QuranReadingComfortPreset = "balanced" | "ayah-focus" | "night-reading";

const QURAN_AUDIO_END_MODE_OPTIONS: {
  id: QuranAudioEndMode;
  title: string;
  subtitle: string;
  icon: AppIconName;
}[] = [
  {
    id: "continuous",
    title: "Until stopped",
    subtitle: "Keep reciting until I stop",
    icon: "play-circle",
  },
  {
    id: "ayah",
    title: "After ayah",
    subtitle: "Stop when this ayah ends",
    icon: "bookmark",
  },
  {
    id: "surah",
    title: "After surah",
    subtitle: "Continue to the final ayah",
    icon: "book-open",
  },
  {
    id: "timer",
    title: "Timed fade",
    subtitle: "Use a sleep timer below",
    icon: "clock",
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function customerQuranAudioErrorMessage(error: unknown): string {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";
  if (/network|fetch|timeout|offline|connection/i.test(message)) {
    return "Audio could not load. Please check your connection or try another reciter.";
  }
  return QURAN_AUDIO_UNAVAILABLE_COPY;
}

const TRANSLATIONS = [
  {
    id: "none",
    language: "Arabic Only",
    name: "No Translation",
    rtl: false,
    wordLang: "en",
  },
  {
    id: "131",
    language: "English",
    name: "Saheeh International",
    rtl: false,
    wordLang: "en",
  },
  {
    id: "20",
    language: "English Alt",
    name: "Sahih International",
    rtl: false,
    wordLang: "en",
  },
  {
    id: "95",
    language: "Urdu",
    name: "Tafheem ul Quran",
    rtl: true,
    wordLang: "ur",
  },
  {
    id: "97",
    language: "Urdu Alt",
    name: "Fatah Muhammad Jalandhri",
    rtl: true,
    wordLang: "ur",
  },
  {
    id: "234",
    language: "Bengali",
    name: "Taisirul Quran",
    rtl: false,
    wordLang: "bn",
  },
  {
    id: "77",
    language: "Turkish",
    name: "Muhammed Hamdi Yazir",
    rtl: false,
    wordLang: "tr",
  },
  {
    id: "33",
    language: "Indonesian",
    name: "Muhammad Quraish Shihab",
    rtl: false,
    wordLang: "id",
  },
  {
    id: "39",
    language: "Malay",
    name: "Abdul Hameed Malay",
    rtl: false,
    wordLang: "ms",
  },
  {
    id: "83",
    language: "Spanish",
    name: "Julio Cortes",
    rtl: false,
    wordLang: "es",
  },
  {
    id: "79",
    language: "Japanese",
    name: "Ryoichi Mita",
    rtl: false,
    wordLang: "ja",
  },
  {
    id: "103",
    language: "Italian",
    name: "Hamza Roberto Piccardo",
    rtl: false,
    wordLang: "it",
  },
  {
    id: "135",
    language: "German",
    name: "Abu Rida Muhammad",
    rtl: false,
    wordLang: "de",
  },
  {
    id: "31",
    language: "Chinese",
    name: "Ma Jian",
    rtl: false,
    wordLang: "zh",
  },
  {
    id: "136",
    language: "Korean",
    name: "Hamed Choi",
    rtl: false,
    wordLang: "ko",
  },
  {
    id: "45",
    language: "Somali",
    name: "Mahmud Muhammad Abduh",
    rtl: false,
    wordLang: "so",
  },
  {
    id: "48",
    language: "Swahili",
    name: "Ali Muhsin Al-Barwani",
    rtl: false,
    wordLang: "sw",
  },
  {
    id: "25",
    language: "Persian",
    name: "Hussain Ansarian",
    rtl: true,
    wordLang: "fa",
  },
  {
    id: "128",
    language: "Dutch",
    name: "Sofian S. Siregar",
    rtl: false,
    wordLang: "nl",
  },
  {
    id: "76",
    language: "Russian",
    name: "Magomed Osmanov",
    rtl: false,
    wordLang: "ru",
  },
];

const MUQATTAAT_SURAHS = new Set([
  2, 3, 7, 10, 11, 12, 13, 14, 15, 19, 20, 26, 27, 28, 29, 30, 31, 32, 36, 38,
  40, 41, 42, 43, 44, 45, 46, 50, 68,
]);

const ALL_RECITERS = [
  {
    id: "7",
    name: "Mishary Rashid Alafasy",
    recitationId: 7,
    cdnPath: "ar.alafasy",
    bitrate: 128,
    everyayahFolder: "Alafasy_128kbps",
  },
  {
    id: "1",
    name: "Abdul Basit (Mujawwad)",
    recitationId: 1,
    cdnPath: "ar.abdulbasitmujawwad",
    bitrate: 128,
    everyayahFolder: "Abdul_Basit_Mujawwad_128kbps",
  },
  {
    id: "2",
    name: "Abdul Basit (Murattal)",
    recitationId: 2,
    cdnPath: "ar.abdulbasitmurattal",
    bitrate: 64,
    everyayahFolder: "Abdul_Basit_Murattal_192kbps",
  },
  {
    id: "3",
    name: "Abdurrahman As-Sudais",
    recitationId: 3,
    cdnPath: "ar.abdurrahmaansudais",
    bitrate: 64,
    everyayahFolder: "Abdurrahmaan_As-Sudais_192kbps",
  },
  {
    id: "10",
    name: "Saud Ash-Shuraim",
    recitationId: 10,
    cdnPath: "ar.saoodshuraym",
    bitrate: 64,
    everyayahFolder: "Saood_ash-Shuraym_128kbps",
  },
  {
    id: "4",
    name: "Abu Bakr Ash-Shatiri",
    recitationId: 4,
    cdnPath: "ar.shaatree",
    bitrate: 128,
    everyayahFolder: "Abu_Bakr_Ash-Shaatree_128kbps",
  },
  {
    id: "5",
    name: "Hani Ar-Rifai",
    recitationId: 5,
    cdnPath: "ar.hanirifai",
    bitrate: 64,
    everyayahFolder: "Hani_Rifai_192kbps",
  },
  {
    id: "8",
    name: "Al-Minshawi (Mujawwad)",
    recitationId: 8,
    cdnPath: "ar.minshawimujawwad",
    bitrate: 64,
    everyayahFolder: "Minshawy_Mujawwad_192kbps",
  },
  {
    id: "9",
    name: "Al-Minshawi (Murattal)",
    recitationId: 9,
    cdnPath: "ar.minshawi",
    bitrate: 128,
    everyayahFolder: "Minshawy_Murattal_128kbps",
  },
];

const SPEED_OPTIONS = [
  { label: "0.5x", value: 0.5 },
  { label: "0.75x", value: 0.75 },
  { label: "1x", value: 1.0 },
  { label: "1.25x", value: 1.25 },
  { label: "1.5x", value: 1.5 },
  { label: "2x", value: 2.0 },
];

const TAJWEED_COLORS: Record<string, string> = {
  ham_wasl: "#AAAAAA",
  laam_shamsiyah: "#FF7F00",
  madda_normal: "#537FFF",
  madda_permissible: "#4A90D9",
  madda_necessary: "#000EAD",
  qalaqala: "#DD0000",
  ikhafa_shafawi: "#D500B7",
  ikhafa: "#9400A8",
  idgham_shafawi: "#58B800",
  idgham_ghunnah: "#169200",
  idgham_wo_ghunnah: "#169200",
  idgham_mutajanisayn: "#A1A1A1",
  idgham_mutaqaribayn: "#A1A1A1",
  ghunnah: "#FF7A45",
  iqlab: "#26BFFD",
  silent: "#AAAAAA",
};

const VERSE_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20,
  56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21,
  11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

function getAbsoluteVerseNumber(
  surahNumber: number,
  verseNumber: number,
): number {
  let total = 0;
  for (let i = 0; i < surahNumber - 1; i++) {
    total += VERSE_COUNTS[i];
  }
  return total + verseNumber;
}

function getCdnAudioUrl(
  surahNumber: number,
  verseNumber: number,
  recitationId: number,
): string {
  const reciter =
    ALL_RECITERS.find((r) => r.recitationId === recitationId) ||
    ALL_RECITERS[0];
  const absoluteVerse = getAbsoluteVerseNumber(surahNumber, verseNumber);
  return `https://cdn.islamic.network/quran/audio/${reciter.bitrate}/${reciter.cdnPath}/${absoluteVerse}.mp3`;
}

function getEveryayahAudioUrl(
  surahNumber: number,
  verseNumber: number,
  recitationId: number,
): string {
  const reciter =
    ALL_RECITERS.find((r) => r.recitationId === recitationId) ||
    ALL_RECITERS[0];
  const surahPad = String(surahNumber).padStart(3, "0");
  const versePad = String(verseNumber).padStart(3, "0");
  return `https://everyayah.com/data/${reciter.everyayahFolder}/${surahPad}${versePad}.mp3`;
}

interface TajweedSegment {
  text: string;
  color?: string;
  className?: string;
}

function parseTajweedText(tajweedHtml: string): TajweedSegment[] {
  const segments: TajweedSegment[] = [];
  const regex =
    /<tajweed class=(\w+)>(.*?)<\/tajweed>|<span class=end>.*?<\/span>|([^<]+)/g;
  let match;
  while ((match = regex.exec(tajweedHtml)) !== null) {
    if (match[1] && match[2]) {
      segments.push({
        text: match[2],
        className: match[1],
        color: TAJWEED_COLORS[match[1]] || undefined,
      });
    } else if (match[3]) {
      segments.push({ text: match[3] });
    }
  }
  return segments;
}

interface WordData {
  position: number;
  arabicWord: string;
  normalizedArabicWord?: string;
  translationWord: string;
  transliterationWord: string;
  charType: string;
  audioUrl?: string;
  location?: string;
  quranComWordId?: number;
}

interface Verse {
  verseNumber: number;
  arabic: string;
  tajweed: string;
  translation: string;
  transliteration: string;
  words: WordData[];
  isMuqattaat: boolean;
  wordLangAvailable: boolean;
}

/** The reader's top-level focus — not an exclusive gate, just sets sensible
 * defaults for the panels/audio that already exist below. */
type QuranReaderViewMode = "read" | "listen" | "study";

type QuranStudyModeId =
  | "meaning"
  | "context"
  | "revelation"
  | "words"
  | "action"
  | "sources"
  | "quiz";

type QuranStudyAudienceId = "simple" | "new_reader" | "deeper";

interface SelectedWordContext {
  verse: Verse;
  word: WordData;
}

function parseQuranVerseKey(verseKey?: string | null) {
  const match = String(verseKey || "")
    .trim()
    .match(/^(\d{1,3})\s*:\s*(\d{1,3})$/);
  if (!match) return null;
  return {
    surahNumber: Number(match[1]),
    verseNumber: Number(match[2]),
  };
}

function formatQuranTextCacheAge(cachedAt: number | null): string {
  if (!cachedAt) return "Saved for offline reading";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - cachedAt) / 60000));
  if (diffMinutes < 1) return "Saved just now";
  if (diffMinutes < 60) return `Saved ${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Saved ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Saved ${diffDays}d ago`;
}

type QuranJourneyStepId = "listen" | "words" | "meaning" | "recite" | "live";

const QURAN_STUDY_MODES: {
  id: QuranStudyModeId;
  label: string;
  icon: AppIconName;
}[] = [
  { id: "meaning", label: "Meaning", icon: "book-open" },
  { id: "context", label: "Context", icon: "compass" },
  { id: "revelation", label: "When/Why", icon: "clock" },
  { id: "words", label: "Words", icon: "type" },
  { id: "action", label: "Live It", icon: "target" },
  { id: "sources", label: "Sources", icon: "shield" },
  { id: "quiz", label: "Quiz Me", icon: "help-circle" },
];

const QURAN_STUDY_MODE_COPY: Record<QuranStudyModeId, string> = {
  meaning: "Plain meaning for beginners, Muslims, and new readers.",
  context: "Who is addressed, what is happening, and common misunderstandings.",
  revelation: "When or why it was revealed only where source support exists.",
  words: "Key Arabic words and meanings, with uncertainty made clear.",
  action: "One practical step to live with this ayah today.",
  sources: "What is anchored, limited, or needs tafsir/scholar review.",
  quiz: "Three recall questions so the ayah stays with you.",
};

const QURAN_STUDY_AUDIENCES: {
  id: QuranStudyAudienceId;
  label: string;
  icon: AppIconName;
  instruction: string;
}[] = [
  {
    id: "simple",
    label: "Muslim",
    icon: "sunrise",
    instruction:
      "Use plain English and explain any Islamic terms briefly without sounding childish.",
  },
  {
    id: "new_reader",
    label: "Beginner",
    icon: "compass",
    instruction:
      "Assume the reader may be Muslim, returning to Islam, or non-Muslim. Explain Quran vocabulary, who is being addressed, and what not to misunderstand without unsupported claims.",
  },
  {
    id: "deeper",
    label: "Scholar",
    icon: "layers",
    instruction:
      "Go deeper on themes, Arabic nuance, and implications while clearly separating verified sources from careful inference.",
  },
];

const QURAN_JOURNEY_STEPS: {
  id: QuranJourneyStepId;
  label: string;
  icon: AppIconName;
  body: string;
}[] = [
  {
    id: "listen",
    label: "Listen",
    icon: "headphones",
    body: "Hear the ayah once before studying it.",
  },
  {
    id: "words",
    label: "Words",
    icon: "type",
    body: "Tap a word and save one meaning.",
  },
  {
    id: "meaning",
    label: "Meaning",
    icon: "book-open",
    body: "Open the explanation lens.",
  },
  {
    id: "recite",
    label: "Recite",
    icon: "mic",
    body: "Repeat slowly and mark your confidence.",
  },
  {
    id: "live",
    label: "Live",
    icon: "target",
    body: "Save one action or family challenge.",
  },
];

function buildQuranStudyQuestion(
  mode: QuranStudyModeId,
  verse: Verse,
  reference: string,
  audience: QuranStudyAudienceId,
): string {
  const wordSample = verse.words
    .slice(0, 8)
    .map((word) => `${word.arabicWord} = ${word.translationWord}`)
    .join("; ");
  const audienceInstruction =
    QURAN_STUDY_AUDIENCES.find((item) => item.id === audience)?.instruction ||
    QURAN_STUDY_AUDIENCES[0].instruction;

  const sharedGuardrail = `Answer carefully for a Muslim, beginner, or non-Muslim reader. Start by naming the exact Quran reference ${reference} so the source card can attach cleanly. Use the selected ayah, translation, and verified source cards as your grounding. Do not open with a generic "needs source review" or refusal when the selected ayah and translation are enough for a plain explanation. Teach what can be safely taught first, then clearly mark only unsupported tafsir, asbab al-nuzul, rulings, hadith, Arabic roots, dates, places, or scholarly claims as unavailable. If revelation background or historical context is not verified in the supplied sources, say that briefly, then still explain the plain meaning, safe context, lesson, and action point from the selected ayah. Do not present sensitive fiqh, medical, marital, financial, or personal ruling content as a final fatwa or personal ruling; route it toward scholar review where needed. Format the answer with these exact section headings where relevant: Meaning, Context, Key Words, Lesson, Action, Sources. Keep each section concise and useful. Audience lens: ${audienceInstruction}`;

  switch (mode) {
    case "context":
      return `${sharedGuardrail} For ${reference}, explain the ayah's context for someone who may not know Quranic background: who is being addressed, what problem/theme the ayah is speaking to, what not to misunderstand, and one short reflection. Clearly separate verified context from careful inference.`;
    case "revelation":
      return `${sharedGuardrail} For ${reference}, explain when/why this ayah or surah was revealed only if there is verified source support. If there is no reliable asbab al-nuzul or period evidence available, say that plainly, then give the surah-level theme, likely Meccan/Madinan context only when known, and what a new reader should understand.`;
    case "words":
      return `${sharedGuardrail} For ${reference}, explain the key Arabic words in simple language. Use these app word hints only as hints, not as proof: ${wordSample || "No word-by-word data available."}`;
    case "action":
      return `${sharedGuardrail} For ${reference}, give one practical action point for today, one small habit suggestion, one reflective question, and what to avoid misunderstanding.`;
    case "sources":
      return `${sharedGuardrail} For ${reference}, prioritize source cards and explain what is directly supported by the selected Quran ayah/app context versus what needs tafsir, asbab al-nuzul evidence, or scholar review. If the question asks for a personal ruling, help the reader prepare a clear question for a qualified scholar rather than giving a final fatwa or personal ruling.`;
    case "quiz":
      return `${sharedGuardrail} For ${reference}, create a short learning check: three recall questions, the correct answers, one misconception to avoid, and one tiny action for today. Keep it concise and anchored to this ayah.`;
    case "meaning":
    default:
      return `${sharedGuardrail} Explain ${reference} in a structured way: 1) plain meaning in simple English, 2) what the verse is teaching, 3) context a beginner or non-Muslim needs, 4) what not to misunderstand, and 5) one short action point.`;
  }
}

export default function QuranReaderScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    height: windowHeight,
    width: windowWidth,
    fontScale,
  } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { getVerseInsight, trackFeature } = useNurAI();
  const { isPremium, isScholar } = useSubscription();
  const surahNumber = route.params?.surahNumber ?? 1;
  const initialVerse = route.params?.initialVerse ?? null;
  const initialStudyMode = route.params?.initialStudyMode as
    | QuranStudyModeId
    | undefined;
  const initialAudience = route.params?.initialAudience as
    | QuranStudyAudienceId
    | undefined;
  const shouldStartMemorisationMode = route.params?.memorisationMode === true;
  const flatListRef = useRef<FlatList>(null);
  const hasScrolledToInitial = useRef(false);
  const hasOpenedInitialStudy = useRef(false);
  const resumeTargetVerseRef = useRef<number | null>(null);
  const [readerPositionReady, setReaderPositionReady] = useState(false);
  const [readerInitialVerse, setReaderInitialVerse] = useState<number | null>(
    typeof initialVerse === "number" ? initialVerse : null,
  );

  // Immersive reading: chrome (header + audio dock) hides while the user
  // scrolls down into the mushaf and returns as soon as scrolling settles.
  // Reduced-motion users keep the chrome fixed — no hide.
  const reduceMotionForChrome = useReducedMotion();
  const chromeVisible = useSharedValue(1);
  const lastScrollY = useRef(0);
  const chromeIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealChrome = useCallback(() => {
    chromeVisible.value = withTiming(1, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [chromeVisible]);
  // Reading model: any meaningful scroll clears the screen down to the
  // mushaf alone; a short debounce lets the controls return as soon as the
  // native scroll settles, without making the reader wait five seconds.
  const CHROME_IDLE_REVEAL_MS = 180;
  const handleReaderScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (reduceMotionForChrome) return;
      const y = event.nativeEvent.contentOffset.y;
      const movement = Math.abs(y - lastScrollY.current);
      lastScrollY.current = y;
      if (chromeIdleTimer.current) clearTimeout(chromeIdleTimer.current);

      // At the very top there is nothing above to read into, so the chrome
      // simply stays put rather than flickering on every rubber-band.
      if (y <= 12) {
        revealChrome();
        return;
      }

      if (movement > 2) {
        chromeVisible.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        });
      }

      chromeIdleTimer.current = setTimeout(revealChrome, CHROME_IDLE_REVEAL_MS);
    },
    [reduceMotionForChrome, chromeVisible, revealChrome],
  );
  useEffect(
    () => () => {
      if (chromeIdleTimer.current) clearTimeout(chromeIdleTimer.current);
    },
    [],
  );
  // The header chrome is an absolute overlay, not an in-flow sibling — an
  // in-flow header that hides via opacity keeps its layout box reserved, and
  // the reader is left with a permanent dead zone above the mushaf. As an
  // overlay it slides fully out of the way and the verse list owns the whole
  // viewport, Apple Books-style. Its height is measured so the session rail
  // and list padding can position themselves beneath it while it is visible.
  const [headerChromeHeight, setHeaderChromeHeight] = useState(0);
  const [sessionRailHeight, setSessionRailHeight] = useState(0);
  const measuredHeaderHeight = headerChromeHeight || insets.top + 178;
  const measuredRailHeight = sessionRailHeight || 62;
  const headerChromeStyle = useAnimatedStyle(() => ({
    opacity: chromeVisible.value,
    transform: [
      {
        translateY: (1 - chromeVisible.value) * -(measuredHeaderHeight + 12),
      },
    ],
  }));
  // The rail belongs to the chrome: it sits under the header while controls
  // are up, and clears the screen with everything else once reading starts,
  // so a scrolling reader sees the mushaf and nothing but the mushaf.
  const sessionRailChromeStyle = useAnimatedStyle(() => ({
    opacity: chromeVisible.value,
    transform: [
      {
        translateY:
          insets.top +
          4 +
          chromeVisible.value * (measuredHeaderHeight - insets.top - 4),
      },
    ],
  }));
  const scrollRetryCount = useRef(0);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [verses, setVerses] = useState<Verse[]>([]);
  const [quranTextCacheStatus, setQuranTextCacheStatus] = useState<
    "online" | "offline" | "unavailable"
  >("online");
  const [quranTextCachedAt, setQuranTextCachedAt] = useState<number | null>(
    null,
  );
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [fontSize, setFontSize] = useState(30);
  const [readingComfortPreset, setReadingComfortPreset] =
    useState<QuranReadingComfortPreset>("balanced");
  const [surahName, setSurahName] = useState("");
  const [translationId, setTranslationId] = useState("131");
  const [reciterId, setReciterId] = useState(7);
  const [currentPlayingVerse, setCurrentPlayingVerse] = useState<number | null>(
    null,
  );
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [repeatVerse, setRepeatVerse] = useState(false);
  const [repeatRangeEnabled, setRepeatRangeEnabled] = useState(false);
  const [repeatRangeStart, setRepeatRangeStart] = useState(1);
  const [repeatRangeEnd, setRepeatRangeEnd] = useState(
    Math.min(5, VERSE_COUNTS[surahNumber - 1] || 1),
  );
  const [audioActive, setAudioActive] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [audioEndMode, setAudioEndMode] =
    useState<QuranAudioEndMode>("continuous");
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
  const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState<number | null>(null);
  const [sleepTimerNow, setSleepTimerNow] = useState(() => Date.now());
  const [tajweedEnabled, setTajweedEnabled] = useState(false);
  const [showWordByWord, setShowWordByWord] = useState(false);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [readerViewMode, setReaderViewMode] =
    useState<QuranReaderViewMode>("read");
  useEffect(() => {
    AsyncStorage.getItem("quran_reader_view_mode")
      .then((saved) => {
        if (saved === "read" || saved === "listen" || saved === "study") {
          setReaderViewMode(saved);
        }
      })
      .catch(() => {});
    // Runs once on mount only — this restores the last-used reading focus,
    // it does not react to further changes.
  }, []);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [settingsTab, setSettingsTab] = useState<
    "language" | "reading" | "reciter" | "audio"
  >("language");
  const [arabicFont, setArabicFont] = useState<string>("system");
  const [audioError, setAudioError] = useState<string | null>(null);
  const [transportState, setTransportState] = useState<TransportState>("idle");
  const [audioProgress, setAudioProgress] = useState<TransportProgress>({
    currentTime: 0,
    duration: 0,
  });
  const [audioDockHeight, setAudioDockHeight] = useState(0);
  const [quranAudioDownload, setQuranAudioDownload] = useState({
    downloaded: 0,
    total: VERSE_COUNTS[surahNumber - 1] || 0,
    downloading: false,
    deleting: false,
    fileSize: 0,
    progress: 0,
  });
  const [mediaStorageSummary, setMediaStorageSummary] =
    useState<MediaStorageSummary | null>(null);
  const [bookmarkedVerses, setBookmarkedVerses] = useState<Set<number>>(
    new Set(),
  );
  const [currentVisibleVerse, setCurrentVisibleVerse] = useState<number | null>(
    null,
  );
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiModalState, setAiModalState] = useState<AIResponseState>("loading");
  const [aiModalData, setAiModalData] = useState<AIResponseData | null>(null);
  const [aiModalError, setAiModalError] = useState<string | undefined>();
  const [aiStudyMode, setAiStudyMode] = useState<QuranStudyModeId>("meaning");
  const [quranStudyAudience, setQuranStudyAudience] =
    useState<QuranStudyAudienceId>("simple");
  const [ayahStudySheetVisible, setAyahStudySheetVisible] = useState(false);
  const [selectedStudyVerseNumber, setSelectedStudyVerseNumber] = useState<
    number | null
  >(null);
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [savedReflectionNote, setSavedReflectionNote] =
    useState<QuranReflectionNote | null>(null);
  const [reflectionSaving, setReflectionSaving] = useState(false);
  const [scholarPacketSaving, setScholarPacketSaving] = useState(false);
  const [scholarPacketNotice, setScholarPacketNotice] = useState<string | null>(
    null,
  );
  const [activeAyahLensVerse, setActiveAyahLensVerse] = useState<number | null>(
    null,
  );
  const [recitationCoachVerseNumber, setRecitationCoachVerseNumber] = useState<
    number | null
  >(null);
  const [recitationCoachVisible, setRecitationCoachVisible] = useState(false);
  const [recitationPracticeStatus, setRecitationPracticeStatus] =
    useState<QuranAyahPracticeStatus | null>(null);
  const [memorisationMode, setMemorisationMode] = useState(false);
  const [memorisationReveal, setMemorisationReveal] = useState(false);
  const [revealedMemoryVerses, setRevealedMemoryVerses] = useState<
    Record<number, boolean>
  >({});
  const [wordSheetVisible, setWordSheetVisible] = useState(false);
  const [selectedWordContext, setSelectedWordContext] =
    useState<SelectedWordContext | null>(null);
  const [wordOccurrences, setWordOccurrences] = useState<QuranWordOccurrence[]>(
    [],
  );
  const [wordMastery, setWordMastery] = useState<QuranWordMastery | null>(null);
  const [wordSearchLoading, setWordSearchLoading] = useState(false);
  const [quranLearningStats, setQuranLearningStats] =
    useState<QuranLearningStats | null>(null);
  const [quranStats, setQuranStats] = useState<QuranStats | null>(null);
  const [hifzStats, setHifzStats] = useState<HifzSRStats | null>(null);
  const autoAdvanceRef = useRef(true);
  const repeatVerseRef = useRef(false);
  const repeatRangeEnabledRef = useRef(false);
  const repeatRangeStartRef = useRef(1);
  const repeatRangeEndRef = useRef(
    Math.min(5, VERSE_COUNTS[surahNumber - 1] || 1),
  );
  const premiumAudioRef = useRef(isPremium);
  const audioEndModeRef = useRef<QuranAudioEndMode>("continuous");
  const currentVerseRef = useRef<number | null>(null);
  const reciterIdRef = useRef(7);
  const surahRef = useRef(surahNumber);
  const surahNameRef = useRef("");
  const gardenRecordedTodayRef = useRef<string | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContinuousAutoplayRef = useRef<{
    surahNumber: number;
    verseNumber: number;
  } | null>(null);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0) {
        const lastVisible = viewableItems[viewableItems.length - 1];
        const vNum = lastVisible.item?.verseNumber;
        if (vNum) {
          const sn = surahRef.current;
          updateSurahProgress(sn, surahNameRef.current || `Surah ${sn}`, vNum);
          setCurrentVisibleVerse(vNum);
          if (
            resumeTargetVerseRef.current !== null &&
            viewableItems.some(
              (visibleItem) =>
                visibleItem.item?.verseNumber === resumeTargetVerseRef.current,
            )
          ) {
            resumeTargetVerseRef.current = null;
            setReaderPositionReady(true);
          }
          const today = new Date().toISOString().split("T")[0];
          if (gardenRecordedTodayRef.current !== today) {
            gardenRecordedTodayRef.current = today;
            recordGardenAction("quran").catch(() => {});
          }
        }
      }
    },
  ).current;

  const refreshQuranLearningStats = useCallback(async () => {
    const [learning, reading, hifz] = await Promise.all([
      getQuranLearningStats(),
      getQuranStats(),
      getHifzStats(),
    ]);
    setQuranLearningStats(learning);
    setQuranStats(reading);
    setHifzStats(hifz);
  }, []);

  useEffect(() => {
    refreshQuranLearningStats();
  }, [refreshQuranLearningStats, surahNumber]);

  useEffect(() => {
    return () => {
      import("@/lib/quran-progress").then(({ getQuranStats }) => {
        getQuranStats().then((stats) => {
          trackQuranReading(
            stats.surahsStarted,
            stats.surahsCompleted,
            stats.totalVersesRead,
          );
        });
      });
    };
  }, []);

  const currentTranslationConfig =
    TRANSLATIONS.find((t) => t.id === translationId) || TRANSLATIONS[0];
  const isTranslationRtl = currentTranslationConfig.rtl;

  useEffect(() => {
    surahRef.current = surahNumber;
    const maxVerse = VERSE_COUNTS[surahNumber - 1] || 1;
    const nextStart = Math.min(
      maxVerse,
      Math.max(1, repeatRangeStartRef.current),
    );
    const nextEnd = Math.min(
      maxVerse,
      Math.max(nextStart, repeatRangeEndRef.current),
    );
    setRepeatRangeStart(nextStart);
    setRepeatRangeEnd(nextEnd);
    repeatRangeStartRef.current = nextStart;
    repeatRangeEndRef.current = nextEnd;
  }, [surahNumber]);
  useEffect(() => {
    surahNameRef.current = surahName;
  }, [surahName]);
  useEffect(() => {
    currentVerseRef.current = currentPlayingVerse;
  }, [currentPlayingVerse]);
  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);
  useEffect(() => {
    repeatVerseRef.current = repeatVerse;
  }, [repeatVerse]);
  useEffect(() => {
    repeatRangeEnabledRef.current = repeatRangeEnabled;
  }, [repeatRangeEnabled]);
  useEffect(() => {
    repeatRangeStartRef.current = repeatRangeStart;
  }, [repeatRangeStart]);
  useEffect(() => {
    repeatRangeEndRef.current = repeatRangeEnd;
  }, [repeatRangeEnd]);
  useEffect(() => {
    premiumAudioRef.current = isPremium;
  }, [isPremium]);
  useEffect(() => {
    audioEndModeRef.current = audioEndMode;
  }, [audioEndMode]);
  useEffect(
    () => () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    },
    [],
  );
  useEffect(() => {
    if (!sleepTimerEndsAt) return;
    setSleepTimerNow(Date.now());
    const interval = setInterval(() => setSleepTimerNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, [sleepTimerEndsAt]);
  useEffect(() => {
    reciterIdRef.current = reciterId;
  }, [reciterId]);

  const scrollToVerse = useCallback((verseNumber: number, animated = true) => {
    const idx = verseNumber - 1;
    if (idx < 0 || !flatListRef.current) return;
    // Verse cells vary substantially with Arabic wrapping, translation and
    // study settings. Jumping by a fixed height created large blank regions.
    // Let FlatList measure the target and use its measured average only in the
    // onScrollToIndexFailed recovery path below.
    try {
      flatListRef.current.scrollToIndex({
        index: idx,
        animated,
        viewPosition: 0.08,
      });
    } catch {}
  }, []);

  const handleAudioDockLayout = useCallback((event: LayoutChangeEvent) => {
    const measuredHeight = Math.ceil(event.nativeEvent.layout.height);
    if (!Number.isFinite(measuredHeight) || measuredHeight <= 0) return;
    const nextHeight = Math.min(72, Math.max(64, measuredHeight));
    setAudioDockHeight((currentHeight) =>
      Math.abs(currentHeight - nextHeight) > 1 ? nextHeight : currentHeight,
    );
  }, []);

  useEffect(() => {
    transportSetCallbacks({
      onStateChange: (s) => setTransportState(s),
      onFinish: () => {
        const cv = currentVerseRef.current;
        const sn = surahRef.current;
        const playFinishedVerse = async (
          verseNumber: number,
          mode: Parameters<typeof buildQuranAudioMetadata>[0]["mode"],
          range?: { start: number; end: number },
        ) => {
          const reciterId = reciterIdRef.current;
          const localUrl = premiumAudioRef.current
            ? await getLocalQuranAudioPath({
                surahNumber: sn,
                verseNumber,
                reciterId,
              })
            : null;
          const url = localUrl || getCdnAudioUrl(sn, verseNumber, reciterId);
          const fallback = localUrl
            ? getCdnAudioUrl(sn, verseNumber, reciterId)
            : getEveryayahAudioUrl(sn, verseNumber, reciterId);
          const reciter =
            ALL_RECITERS.find((item) => item.recitationId === reciterId) ||
            ALL_RECITERS[0];
          const sessionLabel =
            audioEndModeRef.current === "continuous"
              ? "Until stopped"
              : audioEndModeRef.current === "timer"
                ? "Sleep timer"
                : audioEndModeRef.current === "surah"
                  ? "Surah session"
                  : undefined;

          transportPlay(url, fallback, {
            allowBackground: premiumAudioRef.current,
            metadata: buildQuranAudioMetadata({
              surahName: surahNameRef.current,
              surahNumber: sn,
              verseNumber,
              reciterName: reciter.name,
              mode,
              rangeStart: range?.start,
              rangeEnd: range?.end,
              sessionLabel,
              offlineLabel: localUrl ? "Offline ready" : undefined,
            }),
          });
        };

        if (cv !== null && repeatVerseRef.current) {
          setAudioError(null);
          setAudioProgress({
            currentTime: 0,
            duration: 0,
            isBuffering: true,
          });
          void playFinishedVerse(cv, "ayah");
        } else if (
          cv !== null &&
          repeatRangeEnabledRef.current &&
          premiumAudioRef.current
        ) {
          const maxVerse = VERSE_COUNTS[sn - 1] || 1;
          const start = Math.min(
            maxVerse,
            Math.max(1, repeatRangeStartRef.current),
          );
          const end = Math.min(
            maxVerse,
            Math.max(start, repeatRangeEndRef.current),
          );
          const nextVerse =
            cv < start ? start : cv >= end ? start : Math.min(cv + 1, end);
          setCurrentPlayingVerse(nextVerse);
          scrollToVerse(nextVerse);
          setAudioError(null);
          setAudioProgress({
            currentTime: 0,
            duration: 0,
            isBuffering: true,
          });
          void playFinishedVerse(nextVerse, "range", { start, end });
        } else if (cv !== null && audioEndModeRef.current === "ayah") {
          setAudioActive(false);
          setAudioProgress({ currentTime: 0, duration: 0 });
        } else if (
          cv !== null &&
          (autoAdvanceRef.current || audioEndModeRef.current === "surah")
        ) {
          const maxVerse = VERSE_COUNTS[sn - 1];
          if (cv < maxVerse) {
            const nextVerse = cv + 1;
            setCurrentPlayingVerse(nextVerse);
            scrollToVerse(nextVerse);
            setAudioError(null);
            setAudioProgress({
              currentTime: 0,
              duration: 0,
              isBuffering: true,
            });
            void playFinishedVerse(nextVerse, "auto");
          } else if (audioEndModeRef.current === "continuous") {
            const nextSurahNumber = sn >= 114 ? 1 : sn + 1;
            pendingContinuousAutoplayRef.current = {
              surahNumber: nextSurahNumber,
              verseNumber: 1,
            };
            setCurrentPlayingVerse(1);
            setAudioActive(true);
            setAudioError(null);
            setAudioProgress({
              currentTime: 0,
              duration: 0,
              isBuffering: true,
            });
            navigation.setParams({
              surahNumber: nextSurahNumber,
              initialVerse: 1,
            });
          } else {
            setAudioActive(false);
            setCurrentPlayingVerse(null);
            setAudioProgress({ currentTime: 0, duration: 0 });
          }
        } else {
          setAudioActive(false);
          setAudioProgress({ currentTime: 0, duration: 0 });
        }
      },
      onProgress: (progress) => setAudioProgress(progress),
      onError: (msg) => {
        transportStop();
        setAudioError(customerQuranAudioErrorMessage(msg));
        setAudioActive(false);
        setCurrentPlayingVerse(null);
        setAudioProgress({ currentTime: 0, duration: 0, isBuffering: false });
      },
    });
    return () => {
      transportTeardown();
    };
  }, [navigation, scrollToVerse]);

  const loadAndPlay = useCallback(
    (url: string, fallback?: string, verseNumber?: number) => {
      setAudioError(null);
      setAudioProgress({ currentTime: 0, duration: 0, isBuffering: true });
      transportSetRate(playbackSpeed);
      const reciter =
        ALL_RECITERS.find(
          (item) => item.recitationId === reciterIdRef.current,
        ) || ALL_RECITERS[0];
      const activeVerse = verseNumber || currentVerseRef.current || 1;
      transportPlay(url, fallback, {
        allowBackground: isPremium,
        metadata: buildQuranAudioMetadata({
          surahName,
          surahNumber,
          verseNumber: activeVerse,
          reciterName: reciter.name,
          mode: repeatRangeEnabled ? "range" : autoAdvance ? "auto" : "ayah",
          rangeStart: repeatRangeStart,
          rangeEnd: repeatRangeEnd,
          sessionLabel:
            audioEndMode === "continuous"
              ? "Until stopped"
              : audioEndMode === "timer"
                ? "Sleep timer"
                : audioEndMode === "surah"
                  ? "Surah session"
                  : undefined,
          offlineLabel: url.startsWith("file://") ? "Offline ready" : undefined,
        }),
      });
    },
    [
      audioEndMode,
      autoAdvance,
      isPremium,
      playbackSpeed,
      repeatRangeEnabled,
      repeatRangeEnd,
      repeatRangeStart,
      surahName,
      surahNumber,
    ],
  );

  useEffect(() => {
    hasScrolledToInitial.current = false;
    hasOpenedInitialStudy.current = false;
    scrollRetryCount.current = 0;
    const target = typeof initialVerse === "number" ? initialVerse : null;
    resumeTargetVerseRef.current = target;
    setReaderInitialVerse(target);
    // With no route-provided ayah, keep the reader covered until the saved
    // per-surah position has been resolved. This prevents a one-frame flash
    // at ayah 1 before restoration.
    setReaderPositionReady(target !== null && target <= 1);
    if (!shouldStartMemorisationMode) {
      setMemorisationMode(false);
      setMemorisationReveal(false);
    }
  }, [
    initialAudience,
    initialStudyMode,
    initialVerse,
    shouldStartMemorisationMode,
    surahNumber,
  ]);

  useEffect(() => {
    transportSetRate(playbackSpeed);
  }, [playbackSpeed]);

  const loadPreferences = useCallback(async () => {
    try {
      const [
        savedTranslation,
        savedReciter,
        savedAutoAdvance,
        savedRepeatVerse,
        savedRepeatRange,
        savedRepeatRangeStart,
        savedRepeatRangeEnd,
        savedSpeed,
        savedTajweed,
        savedWbw,
        savedTranslit,
        savedFont,
        savedAudioEndMode,
        savedReadingComfortPreset,
      ] = await Promise.all([
        AsyncStorage.getItem("quran_translation_id"),
        AsyncStorage.getItem("quran_reciter_id"),
        AsyncStorage.getItem("quran_auto_advance"),
        AsyncStorage.getItem("quran_repeat_verse"),
        AsyncStorage.getItem("quran_repeat_range_enabled"),
        AsyncStorage.getItem("quran_repeat_range_start"),
        AsyncStorage.getItem("quran_repeat_range_end"),
        AsyncStorage.getItem("quran_playback_speed"),
        AsyncStorage.getItem("quran_tajweed_enabled"),
        AsyncStorage.getItem("quran_word_by_word"),
        AsyncStorage.getItem("quran_transliteration"),
        AsyncStorage.getItem("quran_arabic_font"),
        AsyncStorage.getItem("quran_audio_end_mode"),
        AsyncStorage.getItem("quran_reading_comfort_preset"),
      ]);
      if (savedTranslation) setTranslationId(savedTranslation);
      if (savedReciter) {
        const id = parseInt(savedReciter, 10);
        if (!isNaN(id)) {
          setReciterId(id);
          reciterIdRef.current = id;
        }
      }
      if (savedAutoAdvance !== null) {
        const val = savedAutoAdvance === "true";
        setAutoAdvance(val);
        autoAdvanceRef.current = val;
      }
      if (savedRepeatVerse !== null) {
        const val = savedRepeatVerse === "true";
        setRepeatVerse(val);
        repeatVerseRef.current = val;
      }
      const maxVerse = VERSE_COUNTS[surahNumber - 1] || 1;
      if (savedRepeatRangeStart || savedRepeatRangeEnd) {
        const parsedStart = Math.min(
          maxVerse,
          Math.max(1, parseInt(savedRepeatRangeStart || "1", 10) || 1),
        );
        const parsedEnd = Math.min(
          maxVerse,
          Math.max(
            parsedStart,
            parseInt(
              savedRepeatRangeEnd ||
                String(Math.min(maxVerse, parsedStart + 4)),
              10,
            ) || Math.min(maxVerse, parsedStart + 4),
          ),
        );
        setRepeatRangeStart(parsedStart);
        setRepeatRangeEnd(parsedEnd);
        repeatRangeStartRef.current = parsedStart;
        repeatRangeEndRef.current = parsedEnd;
      }
      if (savedRepeatRange !== null) {
        const val = savedRepeatRange === "true";
        setRepeatRangeEnabled(val);
        repeatRangeEnabledRef.current = val;
      }
      if (savedSpeed) setPlaybackSpeed(parseFloat(savedSpeed));
      if (savedTajweed !== null) setTajweedEnabled(savedTajweed === "true");
      if (savedWbw !== null) setShowWordByWord(savedWbw === "true");
      if (savedTranslit !== null)
        setShowTransliteration(savedTranslit === "true");
      if (savedFont) setArabicFont(savedFont);
      if (
        savedReadingComfortPreset === "balanced" ||
        savedReadingComfortPreset === "ayah-focus" ||
        savedReadingComfortPreset === "night-reading"
      ) {
        setReadingComfortPreset(savedReadingComfortPreset);
      }
      if (
        savedAudioEndMode === "continuous" ||
        savedAudioEndMode === "ayah" ||
        savedAudioEndMode === "surah"
      ) {
        setAudioEndMode(savedAudioEndMode);
        audioEndModeRef.current = savedAudioEndMode;
      }
    } catch {}
  }, [surahNumber]);

  useEffect(() => {
    loadPreferences();
    migrateFromLegacy();
  }, [loadPreferences]);

  const ARABIC_FONTS = useMemo(
    () => [
      {
        id: "system",
        label: "System Default",
        fontFamily: undefined,
        preview:
          "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0646\u0650",
      },
      {
        id: "scheherazade",
        label: "Uthmani Mushaf",
        fontFamily: "ScheherazadeNew_400Regular",
        preview:
          "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0646\u0650",
      },
      {
        id: "lateef",
        label: "Lateef",
        fontFamily: "Lateef_400Regular",
        preview:
          "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0646\u0650",
      },
      {
        id: "amiri_quran",
        label: "Amiri Quran",
        fontFamily: "AmiriQuran_400Regular",
        preview:
          "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0646\u0650",
      },
      {
        id: "amiri",
        label: "Amiri",
        fontFamily: "Amiri_400Regular",
        preview:
          "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0646\u0650",
      },
      {
        id: "noto_naskh",
        label: "Noto Naskh Arabic",
        fontFamily: "NotoNaskhArabic_400Regular",
        preview:
          "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0646\u0650",
      },
    ],
    [],
  );

  const getArabicFontFamily = useCallback(() => {
    const found = ARABIC_FONTS.find((f) => f.id === arabicFont);
    return found?.fontFamily;
  }, [ARABIC_FONTS, arabicFont]);

  const handleArabicFontChange = async (fontId: string) => {
    setArabicFont(fontId);
    try {
      await syncedSetItem("quran_arabic_font", fontId);
    } catch {}
  };

  const handleTranslationChange = async (id: string) => {
    setTranslationId(id);
    try {
      await syncedSetItem("quran_translation_id", id);
    } catch {}
  };

  const handleReciterChange = async (id: number) => {
    setReciterId(id);
    reciterIdRef.current = id;
    try {
      await syncedSetItem("quran_reciter_id", String(id));
    } catch {}
    if (currentPlayingVerse !== null && audioActive) {
      const url = getCdnAudioUrl(surahNumber, currentPlayingVerse, id);
      const fallback = getEveryayahAudioUrl(
        surahNumber,
        currentPlayingVerse,
        id,
      );
      loadAndPlay(url, fallback);
    }
  };

  const handleAutoAdvanceToggle = async (value: boolean) => {
    setAutoAdvance(value);
    autoAdvanceRef.current = value;
    if (value && repeatVerse) {
      setRepeatVerse(false);
      repeatVerseRef.current = false;
      try {
        await syncedSetItem("quran_repeat_verse", "false");
      } catch {}
    }
    try {
      await syncedSetItem("quran_auto_advance", value.toString());
    } catch {}
    Haptics.selectionAsync();
  };

  const handleRepeatVerseToggle = async (value: boolean) => {
    setRepeatVerse(value);
    repeatVerseRef.current = value;
    if (value && autoAdvance) {
      setAutoAdvance(false);
      autoAdvanceRef.current = false;
      try {
        await syncedSetItem("quran_auto_advance", "false");
      } catch {}
    }
    try {
      await syncedSetItem("quran_repeat_verse", value.toString());
    } catch {}
    Haptics.selectionAsync();
  };

  const handleRepeatRangeToggle = async (value: boolean) => {
    if (value && !isPremium) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }

    setRepeatRangeEnabled(value);
    repeatRangeEnabledRef.current = value;

    if (value) {
      if (repeatVerse) {
        setRepeatVerse(false);
        repeatVerseRef.current = false;
        try {
          await syncedSetItem("quran_repeat_verse", "false");
        } catch {}
      }
      if (autoAdvance) {
        setAutoAdvance(false);
        autoAdvanceRef.current = false;
        try {
          await syncedSetItem("quran_auto_advance", "false");
        } catch {}
      }
    }

    try {
      await syncedSetItem("quran_repeat_range_enabled", value.toString());
    } catch {}
    Haptics.selectionAsync();
  };

  const saveRepeatRange = async (start: number, end: number) => {
    const maxVerse = VERSE_COUNTS[surahNumber - 1] || 1;
    const nextStart = Math.min(maxVerse, Math.max(1, start));
    const nextEnd = Math.min(maxVerse, Math.max(nextStart, end));
    setRepeatRangeStart(nextStart);
    setRepeatRangeEnd(nextEnd);
    repeatRangeStartRef.current = nextStart;
    repeatRangeEndRef.current = nextEnd;
    try {
      await Promise.all([
        syncedSetItem("quran_repeat_range_start", String(nextStart)),
        syncedSetItem("quran_repeat_range_end", String(nextEnd)),
      ]);
    } catch {}
  };

  const setRepeatRangePoint = async (point: "start" | "end") => {
    if (!isPremium) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }

    const activeVerse = currentPlayingVerse || currentVisibleVerse || 1;
    if (point === "start") {
      await saveRepeatRange(activeVerse, Math.max(activeVerse, repeatRangeEnd));
    } else {
      await saveRepeatRange(
        Math.min(repeatRangeStart, activeVerse),
        activeVerse,
      );
    }
    if (!repeatRangeEnabled) {
      await handleRepeatRangeToggle(true);
    }
    Haptics.selectionAsync();
  };

  const setRepeatRangeToSurah = async () => {
    if (!isPremium) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }

    await saveRepeatRange(1, VERSE_COUNTS[surahNumber - 1] || 1);
    if (!repeatRangeEnabled) {
      await handleRepeatRangeToggle(true);
    }
    Haptics.selectionAsync();
  };

  const setRepeatRangePreset = async (length: 3 | 5 | 10) => {
    if (!isPremium) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }

    const maxVerse = VERSE_COUNTS[surahNumber - 1] || 1;
    const activeVerse = Math.min(
      maxVerse,
      Math.max(1, currentPlayingVerse || currentVisibleVerse || 1),
    );
    const end = Math.min(maxVerse, activeVerse + length - 1);
    await saveRepeatRange(activeVerse, end);
    if (!repeatRangeEnabled) {
      await handleRepeatRangeToggle(true);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSpeedChange = async (speed: number) => {
    setPlaybackSpeed(speed);
    try {
      await syncedSetItem("quran_playback_speed", speed.toString());
    } catch {}
    transportSetRate(speed);
  };

  const clearQuranSleepTimer = () => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = null;
    setSleepTimerMinutes(0);
    setSleepTimerEndsAt(null);
  };

  const persistAudioEndMode = async (mode: QuranAudioEndMode) => {
    try {
      await syncedSetItem(
        "quran_audio_end_mode",
        mode === "timer" ? "continuous" : mode,
      );
    } catch {}
  };

  const applySleepTimerMinutes = (nextTimer: number) => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    setSleepTimerMinutes(nextTimer);
    setAudioEndMode(nextTimer > 0 ? "timer" : "continuous");
    audioEndModeRef.current = nextTimer > 0 ? "timer" : "continuous";
    persistAudioEndMode(nextTimer > 0 ? "timer" : "continuous");
    if (nextTimer > 0) {
      setSleepTimerEndsAt(Date.now() + nextTimer * 60 * 1000);
      sleepTimerRef.current = setTimeout(
        () => {
          transportFadeOutAndStop(QURAN_SLEEP_FADE_OUT_MS);
          setAudioError(null);
          setSleepTimerMinutes(0);
          setSleepTimerEndsAt(null);
          setAudioEndMode("continuous");
          audioEndModeRef.current = "continuous";
          sleepTimerRef.current = setTimeout(() => {
            setAudioActive(false);
            setCurrentPlayingVerse(null);
            setAudioProgress({ currentTime: 0, duration: 0 });
            sleepTimerRef.current = null;
          }, QURAN_SLEEP_FADE_OUT_MS + 200);
        },
        nextTimer * 60 * 1000,
      );
    } else {
      setSleepTimerEndsAt(null);
      sleepTimerRef.current = null;
    }
  };

  const handleAudioEndModeSelect = async (mode: QuranAudioEndMode) => {
    if (mode === "timer") {
      if (!isPremium) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate("Subscription", { initialTab: "premium" });
        return;
      }
      applySleepTimerMinutes(sleepTimerMinutes > 0 ? sleepTimerMinutes : 30);
      Haptics.selectionAsync();
      return;
    }

    clearQuranSleepTimer();
    setAudioEndMode(mode);
    audioEndModeRef.current = mode;
    await persistAudioEndMode(mode);

    if (mode === "ayah") {
      if (autoAdvance) await handleAutoAdvanceToggle(false);
      if (repeatVerse) await handleRepeatVerseToggle(false);
      if (repeatRangeEnabled) await handleRepeatRangeToggle(false);
    }

    if (mode === "surah" || mode === "continuous") {
      if (repeatVerse) await handleRepeatVerseToggle(false);
      if (repeatRangeEnabled) await handleRepeatRangeToggle(false);
      if (!autoAdvance) await handleAutoAdvanceToggle(true);
    }

    Haptics.selectionAsync();
  };

  const handleSleepTimerSelect = (nextTimer: number) => {
    if (nextTimer > 0 && !isPremium) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }
    applySleepTimerMinutes(nextTimer);
    Haptics.selectionAsync();
  };

  const handleSleepTimerAdjust = (direction: -1 | 1) => {
    if (!isPremium) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }
    const baseMinutes =
      sleepTimerMinutes > 0 ? sleepTimerMinutes : QURAN_SLEEP_TIMER_MIN_MINUTES;
    const nextTimer = Math.min(
      QURAN_SLEEP_TIMER_MAX_MINUTES,
      Math.max(
        QURAN_SLEEP_TIMER_MIN_MINUTES,
        baseMinutes + direction * QURAN_SLEEP_TIMER_STEP_MINUTES,
      ),
    );
    applySleepTimerMinutes(nextTimer);
    Haptics.selectionAsync();
  };

  const applyAudioSessionPreset = async (
    preset: "night" | "memorise" | "surah",
  ) => {
    const maxVerse = VERSE_COUNTS[surahNumber - 1] || 1;
    const activeVerse = Math.min(
      maxVerse,
      Math.max(1, currentPlayingVerse || currentVisibleVerse || 1),
    );

    if (preset === "night") {
      if (!isPremium) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate("Subscription", { initialTab: "premium" });
        return;
      }
      if (!autoAdvance) await handleAutoAdvanceToggle(true);
      if (repeatVerse) await handleRepeatVerseToggle(false);
      if (repeatRangeEnabled) await handleRepeatRangeToggle(false);
      applySleepTimerMinutes(120);
      if (!audioActive) playVerse(activeVerse);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    if (preset === "memorise") {
      if (!isPremium) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate("Subscription", { initialTab: "premium" });
        return;
      }
      const end = Math.min(maxVerse, activeVerse + 4);
      await saveRepeatRange(activeVerse, end);
      if (!repeatRangeEnabled) await handleRepeatRangeToggle(true);
      clearQuranSleepTimer();
      setAudioEndMode("continuous");
      audioEndModeRef.current = "continuous";
      await persistAudioEndMode("continuous");
      if (!audioActive) playVerse(activeVerse);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    if (repeatVerse) await handleRepeatVerseToggle(false);
    if (repeatRangeEnabled) await handleRepeatRangeToggle(false);
    if (!autoAdvance) await handleAutoAdvanceToggle(true);
    clearQuranSleepTimer();
    setAudioEndMode("surah");
    audioEndModeRef.current = "surah";
    await persistAudioEndMode("surah");
    playVerse(activeVerse);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleTajweedToggle = async (value: boolean) => {
    if (value && !isPremium) {
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }
    setTajweedEnabled(value);
    try {
      await syncedSetItem("quran_tajweed_enabled", value.toString());
    } catch {}
  };

  const handleWordByWordToggle = async (value: boolean) => {
    if (value && !isPremium && surahNumber > FREE_WORD_BY_WORD_SURAHS) {
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }
    setShowWordByWord(value);
    try {
      await syncedSetItem("quran_word_by_word", value.toString());
    } catch {}
  };

  const handleTransliterationToggle = async (value: boolean) => {
    setShowTransliteration(value);
    try {
      await syncedSetItem("quran_transliteration", value.toString());
    } catch {}
  };

  const applyReadingComfortPreset = async (
    preset: QuranReadingComfortPreset,
  ) => {
    setReadingComfortPreset(preset);
    try {
      await syncedSetItem("quran_reading_comfort_preset", preset);
    } catch {}

    if (preset === "ayah-focus") {
      setFontSize((current) => Math.max(current, 28));
      if (showWordByWord) await handleWordByWordToggle(false);
      if (showTransliteration) await handleTransliterationToggle(false);
    } else if (preset === "night-reading") {
      setFontSize((current) => Math.max(current, 30));
      if (showWordByWord) await handleWordByWordToggle(false);
      if (showTransliteration) await handleTransliterationToggle(false);
    } else {
      setFontSize(24);
      if (
        !showWordByWord &&
        (isPremium || surahNumber <= FREE_WORD_BY_WORD_SURAHS)
      ) {
        await handleWordByWordToggle(true);
      }
      if (showTransliteration) await handleTransliterationToggle(false);
    }

    Haptics.selectionAsync();
  };

  const applyQuranTextCache = useCallback(
    async (reason: "fallback" | "restore" = "fallback") => {
      const cached = await getQuranTextCache({
        surahNumber,
        translationId,
        tajweedEnabled,
      });
      if (!cached?.verses?.length) return false;
      setSurahName(cached.surahName || `Surah ${surahNumber}`);
      setVerses(cached.verses as Verse[]);
      setQuranTextCacheStatus("offline");
      setQuranTextCachedAt(cached.cachedAt);
      setFetchError(false);
      if (reason === "fallback") {
        setAudioError(
          "Live Quran data could not refresh. Showing your saved offline copy for this surah.",
        );
      }
      return true;
    },
    [surahNumber, tajweedEnabled, translationId],
  );

  const fetchVerses = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const arabicEndpoint = tajweedEnabled
        ? `https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=${surahNumber}`
        : `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahNumber}`;

      const wordLangCode = currentTranslationConfig.wordLang || "en";

      const isArabicOnly = translationId === "none";

      const [arabicRes, translationRes, chapterRes] = await Promise.all([
        fetch(arabicEndpoint),
        isArabicOnly
          ? Promise.resolve(new Response(JSON.stringify({})))
          : fetch(
              `https://api.quran.com/api/v4/quran/translations/${translationId}?chapter_number=${surahNumber}`,
            ),
        fetch(`https://api.quran.com/api/v4/chapters/${surahNumber}`),
      ]);

      const arabicData = await arabicRes.json();
      const translationData = isArabicOnly ? {} : await translationRes.json();
      const chapterData = await chapterRes.json();

      if (!arabicData?.verses?.length) {
        throw new Error("Failed to load verses from API");
      }

      let wordsData: any = {};
      let translitData: any = {};
      try {
        const [wordsRes, translitRes] = await Promise.all([
          fetch(
            `https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?words=true&word_fields=translation,transliteration,text_uthmani,text_imlaei,audio_url,location&per_page=300&language=${wordLangCode}`,
          ),
          fetch(
            `https://api.alquran.cloud/v1/surah/${surahNumber}/en.transliteration`,
          ),
        ]);
        wordsData = await wordsRes.json();
        translitData = await translitRes.json();
      } catch (e) {
        console.warn(
          "[QuranReader] Non-critical fetch failed (words/translit):",
          e,
        );
      }

      const resolvedName =
        chapterData.chapter?.name_simple || `Surah ${surahNumber}`;
      setSurahName(resolvedName);

      const isMuqattaatSurah = MUQATTAAT_SURAHS.has(surahNumber);

      const wordsByVerse: Record<
        number,
        { words: WordData[]; langMatched: boolean }
      > = {};
      if (wordsData.verses) {
        for (const wv of wordsData.verses) {
          const vNum = parseInt(wv.verse_key?.split(":")?.[1] || "0", 10);
          if (vNum > 0 && wv.words) {
            const filtered = wv.words.filter(
              (w: any) => w.char_type_name === "word",
            );
            const returnedLang = filtered[0]?.translation?.language_name || "";
            const requestedLangName = currentTranslationConfig.language
              .toLowerCase()
              .replace(/ alt$/, "");
            const langMatched =
              returnedLang.toLowerCase() === requestedLangName ||
              returnedLang.toLowerCase() === wordLangCode ||
              wordLangCode === "en";

            wordsByVerse[vNum] = {
              words: filtered.map((w: any) => ({
                position: w.position,
                arabicWord: w.text_uthmani || "",
                normalizedArabicWord: normalizeArabicSearchTerm(
                  w.text_imlaei || w.text_uthmani || "",
                ),
                translationWord: w.translation?.text || "",
                transliterationWord: w.transliteration?.text || "",
                charType: w.char_type_name || "word",
                audioUrl: w.audio_url || undefined,
                location: w.location || undefined,
                quranComWordId: typeof w.id === "number" ? w.id : undefined,
              })),
              langMatched,
            };
          }
        }
      }

      const translitByVerse: Record<number, string> = {};
      if (translitData.data?.ayahs) {
        for (const ayah of translitData.data.ayahs) {
          translitByVerse[ayah.numberInSurah] = ayah.text || "";
        }
      }

      const combined: Verse[] = arabicData.verses.map((v: any, i: number) => {
        const rawText = tajweedEnabled
          ? v.text_uthmani_tajweed || v.text_uthmani || ""
          : v.text_uthmani || "";
        const plainText = rawText.replace(/<[^>]*>/g, "");
        const verseNum = i + 1;

        const translationText =
          translationData.translations?.[i]?.text
            ?.replace(/<sup[^>]*>.*?<\/sup>/gi, "")
            .replace(/<[^>]*>/g, "")
            .replace(/\s{2,}/g, " ")
            .trim() || "";

        const verseWords = wordsByVerse[verseNum];
        const isMuqattaat =
          isMuqattaatSurah &&
          verseNum === 1 &&
          (verseWords?.words?.length ?? 0) <= 2;

        return {
          verseNumber: verseNum,
          arabic: plainText,
          tajweed: tajweedEnabled ? rawText : "",
          translation: translationText,
          transliteration: translitByVerse[verseNum] || "",
          words: verseWords?.words || [],
          isMuqattaat,
          wordLangAvailable: verseWords?.langMatched ?? true,
        };
      });

      setVerses(combined);
      setQuranTextCacheStatus("online");
      setQuranTextCachedAt(Date.now());
      saveQuranTextCache({
        surahNumber,
        surahName: resolvedName,
        translationId,
        tajweedEnabled,
        verses: combined,
      }).catch(() => {});
      if (initialVerse && !hasScrolledToInitial.current) {
        hasScrolledToInitial.current = true;
        resumeTargetVerseRef.current = initialVerse;
        setReaderInitialVerse(initialVerse);
        setReaderPositionReady(initialVerse <= 1);
        requestAnimationFrame(() => {
          scrollToVerse(initialVerse, false);
          if (highlightTimerRef.current)
            clearTimeout(highlightTimerRef.current);
          setHighlightedVerse(initialVerse);
          highlightTimerRef.current = setTimeout(
            () => setHighlightedVerse(null),
            3000,
          );
        });
      } else if (!initialVerse && !hasScrolledToInitial.current) {
        hasScrolledToInitial.current = true;
        AsyncStorage.getItem(`quran-surah-position-${surahNumber}`)
          .then((saved) => {
            const savedVerse = saved ? parseInt(saved, 10) : 0;
            if (savedVerse > 1) {
              resumeTargetVerseRef.current = savedVerse;
              setReaderInitialVerse(savedVerse);
              setReaderPositionReady(false);
              requestAnimationFrame(() => scrollToVerse(savedVerse, false));
            } else {
              resumeTargetVerseRef.current = null;
              setReaderPositionReady(true);
            }
          })
          .catch(() => {
            resumeTargetVerseRef.current = null;
            setReaderPositionReady(true);
          });
      }
    } catch (error) {
      console.error("Failed to fetch verses:", error);
      const restored = await applyQuranTextCache("fallback");
      if (!restored) {
        setQuranTextCacheStatus("unavailable");
        setQuranTextCachedAt(null);
        setFetchError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [
    applyQuranTextCache,
    currentTranslationConfig.language,
    currentTranslationConfig.wordLang,
    initialVerse,
    scrollToVerse,
    surahNumber,
    tajweedEnabled,
    translationId,
  ]);

  useEffect(() => {
    fetchVerses();
  }, [fetchVerses]);

  useEffect(() => {
    if (
      hasOpenedInitialStudy.current ||
      loading ||
      fetchError ||
      verses.length === 0
    ) {
      return;
    }

    if (initialAudience) {
      setQuranStudyAudience(initialAudience);
    }

    if (shouldStartMemorisationMode) {
      setMemorisationMode(true);
      hasOpenedInitialStudy.current = true;
      return;
    }

    if (initialStudyMode) {
      // Deep links into Study use the calm reader surface and word-by-word
      // mode. The former oversized Ayah Study dashboard is intentionally not
      // opened over the Quran.
      setAiStudyMode(initialStudyMode);
      setReaderViewMode("study");
      setShowWordByWord(true);
      hasOpenedInitialStudy.current = true;
    }
  }, [
    currentVisibleVerse,
    fetchError,
    initialAudience,
    initialStudyMode,
    initialVerse,
    loading,
    shouldStartMemorisationMode,
    verses,
  ]);

  useEffect(() => {
    if (verses.length > 0 && surahName) {
      const checkBookmarks = async () => {
        const bookmarked = new Set<number>();
        for (const v of verses) {
          const title = `Surah ${surahName} - Ayah ${v.verseNumber}`;
          const marked = await isBookmarked("ayah", title);
          if (marked) bookmarked.add(v.verseNumber);
        }
        setBookmarkedVerses(bookmarked);
      };
      checkBookmarks();
    }
  }, [verses, surahName]);

  const handleBookmarkVerse = async (verse: Verse) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const title = `Surah ${surahName} - Ayah ${verse.verseNumber}`;
    const nowBookmarked = await toggleBookmark({
      type: "ayah",
      title,
      arabic: verse.arabic,
      translation: verse.translation,
      reference: `${surahNumber}:${verse.verseNumber}`,
    });
    setBookmarkedVerses((prev) => {
      const next = new Set(prev);
      if (nowBookmarked) next.add(verse.verseNumber);
      else next.delete(verse.verseNumber);
      return next;
    });
  };

  const playVerse = useCallback(
    async (verseNumber: number) => {
      const reciter =
        ALL_RECITERS.find(
          (item) => item.recitationId === reciterIdRef.current,
        ) || ALL_RECITERS[0];
      const localUrl = isPremium
        ? await getLocalQuranAudioPath({
            surahNumber,
            verseNumber,
            reciterId: reciterIdRef.current,
          })
        : null;
      const url =
        localUrl ||
        getCdnAudioUrl(surahNumber, verseNumber, reciterIdRef.current);
      const fallback = getEveryayahAudioUrl(
        surahNumber,
        verseNumber,
        reciterIdRef.current,
      );
      setCurrentPlayingVerse(verseNumber);
      setAudioActive(true);
      saveMediaResumeSession({
        kind: "quran",
        title: `${surahName} ${surahNumber}:${verseNumber}`,
        subtitle: `${reciter.name} recitation`,
        detailLabel:
          audioEndModeRef.current === "continuous"
            ? "Until stopped listening"
            : audioEndModeRef.current === "surah"
              ? "Continue this surah"
              : "Continue Quran audio",
        route: "QuranReader",
        params: { surahNumber, initialVerse: verseNumber },
      }).catch(() => {});
      loadAndPlay(url, fallback, verseNumber);
      scrollToVerse(verseNumber);
    },
    [isPremium, loadAndPlay, scrollToVerse, surahName, surahNumber],
  );

  useEffect(() => {
    const pending = pendingContinuousAutoplayRef.current;
    if (
      !pending ||
      pending.surahNumber !== surahNumber ||
      loading ||
      fetchError ||
      verses.length === 0
    ) {
      return;
    }

    pendingContinuousAutoplayRef.current = null;
    const timer = setTimeout(() => {
      void playVerse(pending.verseNumber);
    }, 160);
    return () => clearTimeout(timer);
  }, [fetchError, loading, playVerse, surahNumber, verses.length]);

  const handlePlayPause = () => {
    if (transportState === "loading") return;
    if (transportState === "playing") {
      pausePlayback();
    } else if (transportState === "paused") {
      resumePlayback();
    } else if (currentPlayingVerse !== null) {
      playVerse(currentPlayingVerse);
    } else {
      playVerse(1);
    }
  };

  const handleReaderViewModeChange = useCallback(
    (mode: QuranReaderViewMode) => {
      Haptics.selectionAsync().catch(() => {});
      setReaderViewMode(mode);
      syncedSetItem("quran_reader_view_mode", mode).catch(() => {});
      if (mode === "listen") {
        if (transportState !== "playing" && transportState !== "loading") {
          playVerse(currentVisibleVerse || currentPlayingVerse || 1);
        }
      } else if (mode === "read") {
        if (transportState === "playing") pausePlayback();
        setShowWordByWord(false);
      } else if (mode === "study") {
        if (transportState === "playing") pausePlayback();
        setShowWordByWord(true);
      }
    },
    [transportState, currentVisibleVerse, currentPlayingVerse, playVerse],
  );

  const handlePrevVerse = () => {
    const target =
      currentPlayingVerse !== null ? Math.max(1, currentPlayingVerse - 1) : 1;
    playVerse(target);
  };

  const handleNextVerse = () => {
    const maxVerse = VERSE_COUNTS[surahNumber - 1];
    const target =
      currentPlayingVerse !== null
        ? Math.min(maxVerse, currentPlayingVerse + 1)
        : 1;
    playVerse(target);
  };

  const stopPlayback = () => {
    clearQuranSleepTimer();
    setAudioEndMode("continuous");
    audioEndModeRef.current = "continuous";
    persistAudioEndMode("continuous");
    transportStop();
    setAudioActive(false);
    setCurrentPlayingVerse(null);
    setAudioProgress({ currentTime: 0, duration: 0 });
    setAudioError(null);
  };

  const refreshQuranAudioDownload = useCallback(async () => {
    const total = VERSE_COUNTS[surahNumber - 1] || 0;
    const [status, mediaSummary] = await Promise.all([
      getQuranSurahDownloadStatus({
        surahNumber,
        reciterId,
        totalVerses: total,
      }),
      getMediaStorageSummary(),
    ]);
    setMediaStorageSummary(mediaSummary);
    setQuranAudioDownload((current) => ({
      ...current,
      downloaded: status.downloaded,
      total: status.total,
      fileSize: status.fileSize,
      progress: status.total > 0 ? status.downloaded / status.total : 0,
    }));
  }, [reciterId, surahNumber]);

  useEffect(() => {
    refreshQuranAudioDownload();
  }, [refreshQuranAudioDownload]);

  const handleDownloadQuranAudio = useCallback(async () => {
    if (!isPremium) {
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }
    if (quranAudioDownload.downloading || quranAudioDownload.deleting) return;

    const total = VERSE_COUNTS[surahNumber - 1] || 0;
    setQuranAudioDownload((current) => ({
      ...current,
      total,
      downloading: true,
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const onProgress = (progress: QuranAudioDownloadProgress) => {
      setQuranAudioDownload((current) => ({
        ...current,
        total: progress.totalVerses,
        downloaded: Math.max(current.downloaded, progress.completedVerses),
        progress: progress.fraction,
      }));
    };

    const success = await downloadQuranSurahAudio({
      surahNumber,
      surahName: surahName || `Surah ${surahNumber}`,
      reciterId,
      totalVerses: total,
      urlForVerse: (verseNumber) =>
        getCdnAudioUrl(surahNumber, verseNumber, reciterId),
      fallbackUrlForVerse: (verseNumber) =>
        getEveryayahAudioUrl(surahNumber, verseNumber, reciterId),
      onProgress,
    });

    setQuranAudioDownload((current) => ({
      ...current,
      downloading: false,
    }));
    await refreshQuranAudioDownload();
    Haptics.notificationAsync(
      success
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
    if (!success) {
      setAudioError(
        "This surah could not be saved for offline listening. Please check your connection and try again.",
      );
    }
  }, [
    isPremium,
    navigation,
    quranAudioDownload.downloading,
    quranAudioDownload.deleting,
    reciterId,
    refreshQuranAudioDownload,
    surahName,
    surahNumber,
  ]);

  const handleDownloadQuranStudyRangeAudio = useCallback(async () => {
    if (!isPremium) {
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }
    if (quranAudioDownload.downloading || quranAudioDownload.deleting) return;

    const total = VERSE_COUNTS[surahNumber - 1] || 0;
    const activeVerse = Math.min(
      total,
      Math.max(1, currentPlayingVerse || currentVisibleVerse || 1),
    );
    const safeRepeatStart = Math.min(total, Math.max(1, repeatRangeStart));
    const safeRepeatEnd = Math.min(
      total,
      Math.max(safeRepeatStart, repeatRangeEnd),
    );
    const startVerse =
      repeatRangeEnabled && isPremium ? safeRepeatStart : activeVerse;
    const endVerse =
      repeatRangeEnabled && isPremium
        ? safeRepeatEnd
        : Math.min(total, activeVerse + 4);
    const rangeTotal = Math.max(1, endVerse - startVerse + 1);

    setQuranAudioDownload((current) => ({
      ...current,
      total: rangeTotal,
      downloaded: 0,
      progress: 0,
      downloading: true,
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const onProgress = (progress: QuranAudioDownloadProgress) => {
      setQuranAudioDownload((current) => ({
        ...current,
        total: progress.totalVerses,
        downloaded: Math.max(current.downloaded, progress.completedVerses),
        progress: progress.fraction,
      }));
    };

    const success = await downloadQuranAyahRangeAudio({
      surahNumber,
      surahName: surahName || `Surah ${surahNumber}`,
      reciterId,
      totalVerses: total,
      startVerse,
      endVerse,
      urlForVerse: (verseNumber) =>
        getCdnAudioUrl(surahNumber, verseNumber, reciterId),
      fallbackUrlForVerse: (verseNumber) =>
        getEveryayahAudioUrl(surahNumber, verseNumber, reciterId),
      onProgress,
    });

    setQuranAudioDownload((current) => ({
      ...current,
      downloading: false,
    }));
    await refreshQuranAudioDownload();
    Haptics.notificationAsync(
      success
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
    if (!success) {
      setAudioError(
        "This study range could not be saved for offline listening. Please check your connection and try again.",
      );
    }
  }, [
    currentPlayingVerse,
    currentVisibleVerse,
    isPremium,
    navigation,
    quranAudioDownload.deleting,
    quranAudioDownload.downloading,
    reciterId,
    refreshQuranAudioDownload,
    repeatRangeEnabled,
    repeatRangeEnd,
    repeatRangeStart,
    surahName,
    surahNumber,
  ]);

  const handleDeleteQuranAudio = useCallback(async () => {
    if (!isPremium) {
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }
    if (quranAudioDownload.downloading || quranAudioDownload.deleting) return;
    if (quranAudioDownload.downloaded <= 0) return;

    const total = VERSE_COUNTS[surahNumber - 1] || 0;
    setQuranAudioDownload((current) => ({
      ...current,
      deleting: true,
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await deleteQuranSurahAudio({
      surahNumber,
      reciterId,
      totalVerses: total,
    });

    setQuranAudioDownload((current) => ({
      ...current,
      downloaded: 0,
      fileSize: 0,
      progress: 0,
      deleting: false,
    }));
    await refreshQuranAudioDownload();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [
    isPremium,
    navigation,
    quranAudioDownload.deleting,
    quranAudioDownload.downloaded,
    quranAudioDownload.downloading,
    reciterId,
    refreshQuranAudioDownload,
    surahNumber,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" && audioActive && !isPremium) {
        transportStop();
        setAudioActive(false);
        setCurrentPlayingVerse(null);
        setAudioError(QURAN_BACKGROUND_PLAYBACK_UPGRADE_NOTICE);
      }
    });

    return () => subscription.remove();
  }, [audioActive, isPremium]);

  const aiVerseNumber =
    selectedStudyVerseNumber ??
    currentVisibleVerse ??
    (typeof initialVerse === "number" ? initialVerse : null) ??
    verses[0]?.verseNumber ??
    null;

  const openAyahStudySheet = useCallback((verseNumber: number) => {
    setSelectedStudyVerseNumber(verseNumber);
    setActiveAyahLensVerse(null);
    setCurrentVisibleVerse(verseNumber);
    setAyahStudySheetVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  useEffect(() => {
    if (!ayahStudySheetVisible || !selectedStudyVerseNumber) return;
    let cancelled = false;
    setSavedReflectionNote(null);
    setReflectionDraft("");

    getQuranReflectionNote({
      surahNumber,
      ayahNumber: selectedStudyVerseNumber,
    }).then((note) => {
      if (cancelled) return;
      setSavedReflectionNote(note);
      setReflectionDraft(note?.note || "");
    });

    return () => {
      cancelled = true;
    };
  }, [ayahStudySheetVisible, selectedStudyVerseNumber, surahNumber]);

  const runAIForVerse = useCallback(
    async (
      targetVerseNumber?: number | null,
      mode: QuranStudyModeId = "meaning",
    ) => {
      const selectedVerseNumber = targetVerseNumber ?? aiVerseNumber;
      if (!selectedVerseNumber) return;
      setAiStudyMode(mode);
      setSelectedStudyVerseNumber(selectedVerseNumber);

      if (!isPremium) {
        setCurrentVisibleVerse(selectedVerseNumber);
        setAyahStudySheetVisible(false);
        setAiModalVisible(true);
        setAiModalState("upgrade");
        setAiModalData(null);
        return;
      }

      const verse = verses.find((v) => v.verseNumber === selectedVerseNumber);
      if (!verse) return;

      setCurrentVisibleVerse(selectedVerseNumber);
      setAyahStudySheetVisible(false);
      setAiModalVisible(true);
      setAiModalState("loading");
      setAiModalData(null);
      setAiModalError(undefined);

      trackFeature("quran_ai_verse");

      const verseInsight = getVerseInsight(surahNumber, selectedVerseNumber);
      const reference = `Quran ${surahNumber}:${selectedVerseNumber} (${surahName || `Surah ${surahNumber}`})`;
      const question = buildQuranStudyQuestion(
        mode,
        verse,
        reference,
        quranStudyAudience,
      );
      const selectedAyahPractice = await getQuranAyahPracticeStatus({
        surahNumber,
        ayahNumber: selectedVerseNumber,
      }).catch(() => null);
      const quranMemory = {
        reading: {
          totalVersesRead: quranStats?.totalVersesRead || 0,
          totalPercentage: quranStats?.totalPercentage || 0,
          surahsStarted: quranStats?.surahsStarted || 0,
          surahsCompleted: quranStats?.surahsCompleted || 0,
          lastReadSurah: quranStats?.lastReadSurah
            ? `${quranStats.lastReadSurah.surahName} ${quranStats.lastReadSurah.maxVerseRead}`
            : null,
        },
        learning: {
          learnedWords: quranLearningStats?.learnedWords || 0,
          savedLessons: quranLearningStats?.savedLessons || 0,
          recitationSessions: quranLearningStats?.recitationSessions || 0,
          lastLearnedWord: quranLearningStats?.lastWord
            ? [
                quranLearningStats.lastWord.arabicWord,
                quranLearningStats.lastWord.translationWord,
              ]
                .filter(Boolean)
                .join(" - ")
            : null,
        },
        selectedAyah: {
          savedLesson: selectedAyahPractice?.memorySaved || false,
          recitationPracticeCount:
            selectedAyahPractice?.recitationPracticeCount || 0,
          lastRecitationQuality: selectedAyahPractice?.lastRecitationQuality,
        },
        studyPreference: {
          mode,
          audience: quranStudyAudience,
        },
      };

      try {
        const result = await askAboutVerse({
          surahNumber,
          surahName: surahName || `Surah ${surahNumber}`,
          ayahNumber: selectedVerseNumber,
          arabicText: verse.arabic,
          translation: verse.translation,
          verseInsight: verseInsight?.content,
          quranMemory,
          question,
          userTier: isScholar ? "scholar" : "premium",
        });

        const selectedAyahCitation: AICitation = {
          type: "quran",
          reference: `Quran ${surahNumber}:${selectedVerseNumber}`,
          explanation:
            "The selected ayah being explained in the Quran reader. This anchors the answer to the exact verse you opened.",
          url: `https://quran.com/${surahNumber}/${selectedVerseNumber}`,
        };
        const localContextCitation: AICitation | null = verseInsight
          ? {
              type: "app_context",
              reference: "NurAI verse context",
              explanation:
                "A local app context note was supplied to NurAI as background. It is not a tafsir source on its own.",
              url: null,
            }
          : null;
        const mergedCitations = [
          selectedAyahCitation,
          ...(localContextCitation ? [localContextCitation] : []),
          ...(result.citations || []),
        ].filter(
          (citation, index, list) =>
            list.findIndex(
              (item) =>
                item.type === citation.type &&
                item.reference.toLowerCase() ===
                  citation.reference.toLowerCase(),
            ) === index,
        );

        setAiModalData(
          mapAIContextResponseToModalData(result, {
            citations: mergedCitations,
            sourceCoverage:
              result.sourceCoverage === "verified_context"
                ? "verified_context"
                : "reference_detected",
          }),
        );
        setAiModalState("success");
      } catch (err) {
        if (err instanceof AIContextError) {
          if (err.code === "UPGRADE_REQUIRED") {
            setAiModalState("upgrade");
          } else if (err.code === "RATE_LIMIT") {
            setAiModalState("rateLimit");
          } else {
            setAiModalState("error");
            setAiModalError(customerSafeAIErrorMessage(err.message));
          }
        } else {
          console.log(
            "[QuranReader] Insight error:",
            (err as any)?.message || err,
          );
          setAiModalState("error");
          setAiModalError(
            customerSafeAIErrorMessage(
              (err as any)?.message ||
                "Something went wrong. Please try again.",
            ),
          );
        }
      }
    },
    [
      aiVerseNumber,
      getVerseInsight,
      isPremium,
      isScholar,
      quranLearningStats,
      quranStats,
      quranStudyAudience,
      surahName,
      surahNumber,
      trackFeature,
      verses,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    if (!selectedWordContext || !wordSheetVisible) {
      setWordOccurrences([]);
      setWordMastery(null);
      return;
    }
    const context = selectedWordContext;
    const word = context.word.arabicWord.trim();
    if (!word) {
      setWordOccurrences([]);
      setWordMastery(null);
      return;
    }

    setWordSearchLoading(true);
    setWordMastery(null);
    Promise.all([
      searchQuranWordOccurrences(word),
      getQuranWordMastery({
        arabicWord: context.word.arabicWord,
        normalizedArabicWord: context.word.normalizedArabicWord,
        surahNumber,
        ayahNumber: context.verse.verseNumber,
        position: context.word.position,
      }),
    ])
      .then(([results, mastery]) => {
        if (!cancelled) {
          setWordOccurrences(results);
          setWordMastery(mastery);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWordOccurrences([]);
          setWordMastery(null);
        }
      })
      .finally(() => {
        if (!cancelled) setWordSearchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedWordContext, wordSheetVisible, surahNumber]);

  const openWordSheet = useCallback((verse: Verse, word: WordData) => {
    setSelectedWordContext({ verse, word });
    setWordOccurrences([]);
    setWordMastery(null);
    setWordSheetVisible(true);
    Haptics.selectionAsync();
  }, []);

  const handleLearnWord = useCallback(async () => {
    if (!selectedWordContext) return;
    const { verse, word } = selectedWordContext;
    await learnQuranWord({
      arabicWord: word.arabicWord,
      normalizedArabicWord: word.normalizedArabicWord,
      translationWord: word.translationWord,
      transliterationWord: word.transliterationWord,
      wordLocation: word.location,
      surahNumber,
      ayahNumber: verse.verseNumber,
      position: word.position,
    });
    await refreshQuranLearningStats();
    setWordMastery((current) => ({
      saved: true,
      reviewCount: (current?.reviewCount || 0) + 1,
      firstLearnedAt: current?.firstLearnedAt || new Date().toISOString(),
      lastLearnedAt: new Date().toISOString(),
      sameNormalizedWordCount: Math.max(
        1,
        current?.sameNormalizedWordCount || 0,
      ),
    }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [refreshQuranLearningStats, selectedWordContext, surahNumber]);

  const handlePlayWordAudio = useCallback(async () => {
    if (!selectedWordContext?.word) return;
    const url = quranWordAudioUrl(selectedWordContext.word.audioUrl);
    if (!url) {
      setAudioError(
        "Word audio is not available for this word yet. Try playing the full ayah.",
      );
      return;
    }

    const verseNumber = selectedWordContext.verse.verseNumber;
    setCurrentPlayingVerse(null);
    setAudioActive(true);
    setAudioError(null);
    setAudioProgress({ currentTime: 0, duration: 0, isBuffering: true });
    try {
      await transportPlay(url, undefined, {
        allowBackground: false,
        metadata: {
          title: `${selectedWordContext.word.arabicWord} - Quran ${surahNumber}:${verseNumber}`,
          artist: "NurAI Quran Words",
          albumTitle: "NurAI Quran",
        },
      });
    } catch (error) {
      transportStop();
      setAudioError(customerQuranAudioErrorMessage(error));
      setAudioActive(false);
      setCurrentPlayingVerse(null);
      setAudioProgress({ currentTime: 0, duration: 0, isBuffering: false });
    }
  }, [selectedWordContext, surahNumber]);

  const handleOpenWordOccurrence = useCallback(
    (occurrence: QuranWordOccurrence) => {
      const parsed = parseQuranVerseKey(occurrence.verseKey);
      if (!parsed) return;

      setWordSheetVisible(false);
      setHighlightedVerse(parsed.verseNumber);
      setCurrentVisibleVerse(parsed.verseNumber);
      setActiveAyahLensVerse(parsed.verseNumber);
      Haptics.selectionAsync();

      if (parsed.surahNumber === surahNumber) {
        scrollToVerse(parsed.verseNumber);
        return;
      }

      navigation.navigate("QuranReader", {
        surahNumber: parsed.surahNumber,
        initialVerse: parsed.verseNumber,
      });
    },
    [navigation, scrollToVerse, surahNumber],
  );

  const handleSaveAyahLesson = useCallback(
    async (verse?: Verse | null) => {
      if (!verse) return;
      await saveAyahMemoryCard({
        surahNumber,
        ayahNumber: verse.verseNumber,
        surahName: surahName || `Surah ${surahNumber}`,
        translation: verse.translation,
      });
      await refreshQuranLearningStats();
      if (recitationCoachVerseNumber === verse.verseNumber) {
        setRecitationPracticeStatus((current) => ({
          memorySaved: true,
          savedLessonAt: new Date().toISOString(),
          recitationPracticeCount: current?.recitationPracticeCount || 0,
          lastRecitationQuality: current?.lastRecitationQuality,
          lastPracticedAt: current?.lastPracticedAt,
        }));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [
      recitationCoachVerseNumber,
      refreshQuranLearningStats,
      surahName,
      surahNumber,
    ],
  );

  const handleSaveReflectionNote = useCallback(async () => {
    const verseNumber = selectedStudyVerseNumber;
    const noteText = reflectionDraft.trim();
    if (!verseNumber || !noteText || reflectionSaving) return;

    setReflectionSaving(true);
    try {
      const saved = await saveQuranReflectionNote({
        surahNumber,
        ayahNumber: verseNumber,
        surahName: surahName || `Surah ${surahNumber}`,
        note: noteText,
        prompt:
          buildQuranAyahJourney({
            surahNumber,
            ayahNumber: verseNumber,
            surahName: surahName || `Surah ${surahNumber}`,
            translation: verses.find((item) => item.verseNumber === verseNumber)
              ?.translation,
            words: verses.find((item) => item.verseNumber === verseNumber)
              ?.words,
          })?.reflectionPrompt ||
          "What belief, habit, or choice should change after this ayah?",
      });
      setSavedReflectionNote(saved);
      setReflectionDraft(saved.note);
      await refreshQuranLearningStats();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setReflectionSaving(false);
    }
  }, [
    reflectionDraft,
    reflectionSaving,
    refreshQuranLearningStats,
    selectedStudyVerseNumber,
    surahName,
    surahNumber,
    verses,
  ]);

  const handleCreateQuranScholarPacket = useCallback(
    async (
      contract: QuranScholarReviewEscalationContract,
      verse?: Verse | null,
    ) => {
      if (scholarPacketSaving) return;
      setScholarPacketSaving(true);
      setScholarPacketNotice(null);
      try {
        const reference = verse
          ? `Quran ${surahNumber}:${verse.verseNumber}`
          : `Quran ${surahNumber}`;
        const shareResult = await Share.share({
          title: contract.packetTitle,
          message: [
            contract.packetTitle,
            reference,
            "",
            contract.packetQuestion,
            "",
            `Why I am asking: ${contract.reasons.join("; ")}`,
            `Helpful context: ${contract.contextNeeded.join("; ")}`,
            `Source status: ${contract.sourceStatus}`,
            contract.sourceRefs.length
              ? `Sources: ${contract.sourceRefs.join("; ")}`
              : null,
            "",
            contract.warning,
          ]
            .filter(Boolean)
            .join("\n"),
        });
        if (shareResult.action === Share.dismissedAction) return;
        trackFeature("QuranScholarReviewPacket");
        setScholarPacketNotice(
          `${reference} question shared for qualified guidance.`,
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAyahStudySheetVisible(false);
      } catch {
        setScholarPacketNotice(
          "Your scholar question could not be shared. Please try again.",
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setScholarPacketSaving(false);
      }
    },
    [scholarPacketSaving, surahNumber, trackFeature],
  );

  const handleAddAyahToHifz = useCallback(
    async (verseNumber?: number | null) => {
      if (!verseNumber) return;
      await addVersesToSR(surahNumber, [verseNumber]);
      await refreshQuranLearningStats();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [refreshQuranLearningStats, surahNumber],
  );

  const quranIdentity: QuranProgressIdentity = useMemo(
    () =>
      buildQuranProgressIdentity({
        learnedWords: quranLearningStats?.learnedWords || 0,
        savedLessons: quranLearningStats?.savedLessons || 0,
        recitationSessions: quranLearningStats?.recitationSessions || 0,
        masteredVerses: hifzStats?.totalMastered || 0,
        dueReviews: hifzStats?.dueReviews || 0,
        versesRead: quranStats?.totalVersesRead || 0,
      }),
    [hifzStats, quranLearningStats, quranStats],
  );

  const quranRecoveryVerseNumber = aiVerseNumber || currentVisibleVerse || 1;
  const quranRecoveryPlan: QuranStreakRecoveryKhatmahPlan = useMemo(() => {
    const totalVersesInSurah = VERSE_COUNTS[surahNumber - 1] || 1;
    return buildQuranStreakRecoveryKhatmahPlan({
      totalVersesRead: quranStats?.totalVersesRead || 0,
      totalVerses: TOTAL_QURAN_VERSES,
      lastReadAt: quranStats?.lastReadSurah?.lastReadAt || null,
      lastReadLabel: quranStats?.lastReadSurah
        ? `${quranStats.lastReadSurah.surahName} ${quranStats.lastReadSurah.maxVerseRead}`
        : null,
      currentSurahName: surahName || `Surah ${surahNumber}`,
      currentVerseNumber: quranRecoveryVerseNumber,
      currentSurahRemaining: Math.max(
        0,
        totalVersesInSurah - quranRecoveryVerseNumber,
      ),
      savedLessons: quranLearningStats?.savedLessons || 0,
      reflectionNotes: quranLearningStats?.reflectionNotes || 0,
      recitationSessions: quranLearningStats?.recitationSessions || 0,
    });
  }, [
    quranLearningStats,
    quranRecoveryVerseNumber,
    quranStats,
    surahName,
    surahNumber,
  ]);
  const handleCreateFamilyChallenge = useCallback(
    async (verse?: Verse | null) => {
      if (!verse) return;
      await createFamilyQuranChallenge({
        surahNumber,
        ayahNumber: verse.verseNumber,
        surahName: surahName || `Surah ${surahNumber}`,
        translation: verse.translation,
        quranIdentityTitle: quranIdentity.title,
        quranIdentityId: quranIdentity.id,
        familyPrompt: quranIdentity.familyPrompt,
        nextAction: quranIdentity.nextAction,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [quranIdentity, surahName, surahNumber],
  );

  const handleMemorisationReview = useCallback(
    async (verseNumber: number, action: "memorized" | "needsPractice") => {
      await recordReview(surahNumber, verseNumber, qualityFromAction(action));
      await refreshQuranLearningStats();
      Haptics.notificationAsync(
        action === "memorized"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    },
    [refreshQuranLearningStats, surahNumber],
  );

  const openRecitationCoach = useCallback(
    (verseNumber?: number | null) => {
      const target = verseNumber || aiVerseNumber || currentVisibleVerse || 1;
      setRecitationCoachVerseNumber(target);
      setRecitationPracticeStatus(null);
      setRecitationCoachVisible(true);
      Haptics.selectionAsync();
    },
    [aiVerseNumber, currentVisibleVerse],
  );

  useEffect(() => {
    let cancelled = false;
    if (!recitationCoachVisible || !recitationCoachVerseNumber) {
      setRecitationPracticeStatus(null);
      return;
    }

    getQuranAyahPracticeStatus({
      surahNumber,
      ayahNumber: recitationCoachVerseNumber,
    }).then((status) => {
      if (!cancelled) {
        setRecitationPracticeStatus(status);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [recitationCoachVerseNumber, recitationCoachVisible, surahNumber]);

  const handleRecitationPractice = useCallback(
    async (
      quality: QuranRecitationPracticeQuality,
      verseNumber?: number | null,
    ) => {
      const target = verseNumber || recitationCoachVerseNumber;
      if (!target) return;
      await saveQuranRecitationPractice({
        surahNumber,
        ayahNumber: target,
        surahName: surahName || `Surah ${surahNumber}`,
        quality,
      });
      await recordReview(
        surahNumber,
        target,
        qualityFromAction(
          quality === "confident" ? "memorized" : "needsPractice",
        ),
      );
      if (quality === "teacher") {
        await addVersesToSR(surahNumber, [target]);
      }
      await refreshQuranLearningStats();
      setRecitationPracticeStatus((current) => ({
        memorySaved: Boolean(current?.memorySaved),
        savedLessonAt: current?.savedLessonAt,
        recitationPracticeCount: (current?.recitationPracticeCount || 0) + 1,
        lastRecitationQuality: quality,
        lastPracticedAt: new Date().toISOString(),
      }));
      Haptics.notificationAsync(
        quality === "confident"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    },
    [
      recitationCoachVerseNumber,
      refreshQuranLearningStats,
      surahName,
      surahNumber,
    ],
  );

  const handleAIButtonPress = useCallback(() => {
    runAIForVerse(aiVerseNumber, aiStudyMode);
  }, [aiStudyMode, aiVerseNumber, runAIForVerse]);

  const handleAIFollowUp = useCallback(
    (response: string) => {
      void response;
      navigation.navigate("GlobalSearch");
    },
    [navigation],
  );

  const currentReciter =
    ALL_RECITERS.find((r) => r.recitationId === reciterId) || ALL_RECITERS[0];
  const currentTranslation =
    TRANSLATIONS.find((t) => t.id === translationId) || TRANSLATIONS[0];
  const offlinePackComplete =
    quranAudioDownload.total > 0 &&
    quranAudioDownload.downloaded >= quranAudioDownload.total;
  const offlinePackPartial =
    quranAudioDownload.downloaded > 0 && !offlinePackComplete;
  const offlinePackPercent = Math.round(quranAudioDownload.progress * 100);
  const offlinePackStatusLabel = quranAudioDownload.downloading
    ? `Saving ${offlinePackPercent}%`
    : quranAudioDownload.deleting
      ? "Removing"
      : offlinePackComplete
        ? "Ready offline"
        : offlinePackPartial
          ? "Partly saved"
          : "Not saved";

  const renderReaderStudyHint = () => {
    if (loading || fetchError || verses.length === 0) return null;
    const currentVerseNumber = aiVerseNumber || currentVisibleVerse || 1;
    const totalVerses = VERSE_COUNTS[surahNumber - 1] || verses.length || 1;
    const progressPercent = Math.round(
      (Math.min(currentVerseNumber, totalVerses) / totalVerses) * 100,
    );
    const sessionModeLabel = memorisationMode
      ? "Hifz focus"
      : audioActive
        ? "Listening"
        : showWordByWord
          ? "Word study"
          : "Reading";
    return (
      <Animated.View
        testID="quran-reader-session-rail"
        onLayout={(event) => {
          const height = Math.round(event.nativeEvent.layout.height);
          if (height > 0 && height !== sessionRailHeight) {
            setSessionRailHeight(height);
          }
        }}
        style={[
          styles.readerSessionRail,
          styles.sessionRailOverlay,
          sessionRailChromeStyle,
          {
            // The rail floats over the mushaf while reading, so it needs a
            // near-opaque app-surface backing — Arabic text must stay
            // readable behind every overlay.
            backgroundColor: "rgba(7, 20, 22, 0.985)",
            borderColor: theme.borderSubtle,
          },
        ]}
      >
        {/* The header already names the surah, ayah and translation, so the
            rail carries only what it alone knows: the mode and how far in
            this session has gone. */}
        <View style={styles.readerSessionCompactRow}>
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={[styles.readerSessionModeLabel, { color: theme.primary }]}
          >
            {sessionModeLabel.toUpperCase()}
          </ThemedText>
          <View style={styles.readerSessionProgressTrack}>
            <View
              style={[
                styles.readerSessionProgressFill,
                {
                  backgroundColor: theme.primary,
                  width: `${Math.min(100, Math.max(3, progressPercent))}%`,
                },
              ]}
            />
          </View>
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={[styles.readerSessionPercent, { color: theme.scholar }]}
          >
            {progressPercent}%
          </ThemedText>
        </View>
      </Animated.View>
    );
  };

  const renderAyahStudySheet = () => {
    const selectedVerseNumber = selectedStudyVerseNumber ?? aiVerseNumber;
    const selectedVerse = selectedVerseNumber
      ? verses.find((verse) => verse.verseNumber === selectedVerseNumber)
      : null;
    const selectedVerseInsight = selectedVerseNumber
      ? getVerseInsight(surahNumber, selectedVerseNumber)
      : null;
    const ayahJourney: QuranAyahJourney | null = selectedVerse
      ? buildQuranAyahJourney({
          surahNumber,
          ayahNumber: selectedVerse.verseNumber,
          surahName,
          translation: selectedVerse.translation,
          words: selectedVerse.words,
          verifiedContext: selectedVerseInsight?.content,
        })
      : null;
    const sourceStatusLabel = selectedVerseInsight
      ? "NurAI context available"
      : "Quran ayah anchored";
    const quranDailySessionHandoff: QuranDailySessionHandoff =
      buildQuranDailySessionHandoff({
        reference: selectedVerseNumber
          ? `Quran ${surahNumber}:${selectedVerseNumber}`
          : `Quran ${surahNumber}:${quranRecoveryVerseNumber}`,
        identityTitle: quranIdentity.title,
        ayahThemeLabel: ayahJourney?.themeLabel,
        audioActive:
          Boolean(selectedVerseNumber) &&
          audioActive &&
          currentPlayingVerse === selectedVerseNumber,
        wordSaved: (quranLearningStats?.learnedWords || 0) > 0,
        lessonSaved: (quranLearningStats?.savedLessons || 0) > 0,
        recitationPracticed:
          (recitationPracticeStatus?.recitationPracticeCount || 0) > 0,
        reflectionSaved: Boolean(savedReflectionNote),
        sourceBoundary: ayahJourney?.sourceNote,
      });
    const quranReadingSessionContract: QuranReadingSessionContract =
      buildQuranReadingSessionContract({
        reference: selectedVerseNumber
          ? `Quran ${surahNumber}:${selectedVerseNumber}`
          : `Quran ${surahNumber}:${quranRecoveryVerseNumber}`,
        sourceStatusLabel,
        audioActive:
          Boolean(selectedVerseNumber) &&
          audioActive &&
          currentPlayingVerse === selectedVerseNumber,
        lessonSaved: (quranLearningStats?.savedLessons || 0) > 0,
        recitationPracticed:
          (recitationPracticeStatus?.recitationPracticeCount || 0) > 0,
        reflectionSaved: Boolean(savedReflectionNote),
        hasVerifiedContext: Boolean(selectedVerseInsight),
        recoveryLabel: quranRecoveryPlan.recoveryLabel,
        khatmahPaceLabel: quranRecoveryPlan.khatmahPaceLabel,
      });
    const quranScholarReviewEscalation: QuranScholarReviewEscalationContract =
      buildQuranScholarReviewEscalationContract({
        reference: selectedVerseNumber
          ? `Quran ${surahNumber}:${selectedVerseNumber}`
          : `Quran ${surahNumber}:${quranRecoveryVerseNumber}`,
        surahName: surahName || `Surah ${surahNumber}`,
        translation: selectedVerse?.translation,
        ayahThemeLabel: ayahJourney?.themeLabel,
        audienceLabel:
          QURAN_STUDY_AUDIENCES.find((item) => item.id === quranStudyAudience)
            ?.label || "Muslim",
        hasVerifiedContext: Boolean(selectedVerseInsight),
      });

    return (
      <Modal
        visible={ayahStudySheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAyahStudySheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.sheetBackdropTouchable}
            onPress={() => setAyahStudySheetVisible(false)}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.ayahStudySheet,
              {
                backgroundColor: theme.backgroundDefault,
                paddingBottom: insets.bottom + Spacing.lg,
                borderColor: `${theme.scholar}24`,
                maxHeight: Math.max(
                  320,
                  windowHeight - insets.top - Spacing.md,
                ),
              },
            ]}
          >
            <View style={styles.modalHandle}>
              <View
                style={[styles.handleBar, { backgroundColor: theme.textMuted }]}
              />
            </View>
            <LinearGradient
              colors={[`${theme.scholar}1F`, "transparent"]}
              style={styles.ayahStudySheetGlow}
            />
            <GeometricCardPattern color={theme.scholar} opacity={0.012} />
            <View style={styles.ayahStudySheetHeader}>
              <View
                style={[
                  styles.ayahStudySheetIcon,
                  { backgroundColor: `${theme.scholar}18` },
                ]}
              >
                <NurAILogoMark
                  size={32}
                  borderRadius={10}
                  color={theme.scholar}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText
                  type="caption"
                  style={[styles.nurAiGuideEyebrow, { color: theme.scholar }]}
                >
                  Study ayah {surahNumber}:{selectedVerseNumber || "-"}
                </ThemedText>
                <ThemedText
                  type="h4"
                  numberOfLines={1}
                  style={{ color: theme.text }}
                >
                  Ayah study tools
                </ThemedText>
              </View>
              <Pressable
                testID="button-close-ayah-study"
                onPress={() => setAyahStudySheetVisible(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close ayah study tools"
                accessibilityHint="Returns to Quran reading"
                style={({ pressed }) => [
                  styles.sheetCloseButton,
                  { backgroundColor: `${theme.textMuted}12` },
                  pressed ? { opacity: 0.7 } : null,
                ]}
              >
                <AppIcon name="x" size={18} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.ayahStudySheetScrollContent}
            >
              <View
                testID="quran-ai-living-lens-core"
                style={[
                  styles.ayahLivingCore,
                  {
                    backgroundColor: `${theme.primary}09`,
                    borderColor: `${theme.primary}26`,
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    `${theme.primary}18`,
                    `${theme.scholar}10`,
                    "transparent",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ayahLivingCoreGlow}
                />
                <GeometricCardPattern color={theme.primary} opacity={0.012} />
                <View style={styles.ayahLivingCoreTop}>
                  <View
                    style={[
                      styles.ayahLivingOrb,
                      { borderColor: `${theme.primary}42` },
                    ]}
                  >
                    <View
                      style={[
                        styles.ayahLivingOrbRing,
                        { borderColor: `${theme.scholar}35` },
                      ]}
                    />
                    <NurAILogoMark
                      size={34}
                      borderRadius={12}
                      color={isPremium ? theme.primary : theme.scholar}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText
                      type="caption"
                      style={[
                        styles.nurAiGuideEyebrow,
                        { color: isPremium ? theme.primary : theme.scholar },
                      ]}
                    >
                      {isPremium
                        ? "Premium study ready"
                        : "Premium study unlock"}
                    </ThemedText>
                    <ThemedText
                      type="h4"
                      numberOfLines={1}
                      style={{ color: theme.text }}
                    >
                      Ayah Companion
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{
                        color: theme.textSecondary,
                        lineHeight: 18,
                        marginTop: 3,
                      }}
                    >
                      Meaning first, then context, words, action, and source
                      boundaries for this exact ayah.
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.ayahLivingSignalRow}>
                  {[
                    { label: "Meaning", icon: "book-open" as const },
                    { label: "Context", icon: "compass" as const },
                    { label: "Words", icon: "type" as const },
                    { label: "Action", icon: "target" as const },
                  ].map((item) => (
                    <View
                      key={item.label}
                      style={[
                        styles.ayahLivingSignal,
                        {
                          backgroundColor: `${theme.primary}10`,
                          borderColor: `${theme.primary}24`,
                        },
                      ]}
                    >
                      <AppIcon
                        name={item.icon}
                        size={11}
                        color={theme.primary}
                      />
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{
                          color: theme.primary,
                          fontSize: 10,
                          fontWeight: "900",
                        }}
                      >
                        {item.label}
                      </ThemedText>
                    </View>
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Explain Quran ${surahNumber}:${selectedVerseNumber || ""}`}
                  onPress={() => runAIForVerse(selectedVerseNumber, "meaning")}
                  style={({ pressed }) => [
                    styles.ayahLivingPrimaryAction,
                    {
                      backgroundColor: isPremium
                        ? theme.primary
                        : `${theme.scholar}18`,
                      borderColor: isPremium
                        ? theme.primary
                        : `${theme.scholar}38`,
                    },
                    pressed ? { opacity: 0.78 } : null,
                  ]}
                >
                  <AppIcon
                    name={isPremium ? "zap" : "lock"}
                    size={15}
                    color={isPremium ? theme.primaryForeground : theme.scholar}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: isPremium
                        ? theme.primaryForeground
                        : theme.scholar,
                      fontWeight: "900",
                    }}
                  >
                    {isPremium ? "Explain this ayah" : "Unlock ayah study"}
                  </ThemedText>
                </Pressable>
              </View>

              {selectedVerse?.translation ? (
                <View
                  style={[
                    styles.ayahStudyPreview,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.ayahStudyPreviewTop}>
                    <View
                      style={[
                        styles.ayahStudySourcePill,
                        {
                          backgroundColor: `${theme.primary}10`,
                          borderColor: `${theme.primary}25`,
                        },
                      ]}
                    >
                      <AppIcon name="shield" size={11} color={theme.primary} />
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: theme.primary, fontWeight: "800" }}
                      >
                        {sourceStatusLabel}
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted, fontWeight: "700" }}
                    >
                      Anchored to this ayah
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    numberOfLines={3}
                    style={{ color: theme.textSecondary, lineHeight: 19 }}
                  >
                    {selectedVerse.translation}
                  </ThemedText>
                </View>
              ) : null}

              <View style={styles.ayahStudyPrimaryLensRow}>
                {[
                  {
                    id: "meaning" as QuranStudyModeId,
                    label: "Explain",
                    body: "Plain meaning",
                    icon: "book-open" as const,
                  },
                  {
                    id: "context" as QuranStudyModeId,
                    label: "Context",
                    body: "What to understand",
                    icon: "compass" as const,
                  },
                  {
                    id: "words" as QuranStudyModeId,
                    label: "Words",
                    body: "Arabic learning",
                    icon: "type" as const,
                  },
                ].map((lens) => (
                  <Pressable
                    key={lens.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${lens.label} Quran ${surahNumber}:${selectedVerseNumber || ""}`}
                    onPress={() => runAIForVerse(selectedVerseNumber, lens.id)}
                    style={({ pressed }) => [
                      styles.ayahStudyPrimaryLens,
                      {
                        backgroundColor: `${theme.primary}10`,
                        borderColor: `${theme.primary}28`,
                      },
                      pressed ? { opacity: 0.75 } : null,
                    ]}
                  >
                    <AppIcon name={lens.icon} size={15} color={theme.primary} />
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.text, fontWeight: "900" }}
                    >
                      {lens.label}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.textMuted, fontSize: 10 }}
                    >
                      {lens.body}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              {SHOW_EXTENDED_QURAN_STUDY_BLOCKS ? (
                <>
                  {ayahJourney ? (
                    <View
                      style={[
                        styles.ayahJourneyCompass,
                        {
                          backgroundColor: `${theme.scholar}0D`,
                          borderColor: `${theme.scholar}28`,
                        },
                      ]}
                    >
                      <View style={styles.ayahJourneyCompassHeader}>
                        <View
                          style={[
                            styles.ayahJourneyCompassIcon,
                            { backgroundColor: `${theme.scholar}18` },
                          ]}
                        >
                          <AppIcon
                            name="compass"
                            size={16}
                            color={theme.scholar}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText
                            type="caption"
                            style={[
                              styles.nurAiGuideEyebrow,
                              { color: theme.scholar },
                            ]}
                          >
                            Ayah Journey
                          </ThemedText>
                          <ThemedText
                            type="small"
                            numberOfLines={1}
                            style={{ color: theme.text, fontWeight: "900" }}
                          >
                            {ayahJourney.themeLabel} path
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textMuted, fontWeight: "800" }}
                        >
                          {ayahJourney.reference}
                        </ThemedText>
                      </View>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary, lineHeight: 18 }}
                      >
                        {ayahJourney.themeBody}
                      </ThemedText>

                      {quranStudyAudience === "new_reader" ? (
                        <View
                          style={[
                            styles.beginnerGuideCard,
                            {
                              backgroundColor: `${theme.primary}0B`,
                              borderColor: `${theme.primary}22`,
                            },
                          ]}
                        >
                          <View style={styles.beginnerGuideHeader}>
                            <View
                              style={[
                                styles.beginnerGuideIcon,
                                { backgroundColor: `${theme.primary}16` },
                              ]}
                            >
                              <AppIcon
                                name="compass"
                                size={14}
                                color={theme.primary}
                              />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <ThemedText
                                type="caption"
                                style={{
                                  color: theme.primary,
                                  fontWeight: "900",
                                }}
                              >
                                Beginner guide
                              </ThemedText>
                              <ThemedText
                                type="caption"
                                numberOfLines={2}
                                style={{
                                  color: theme.textSecondary,
                                  lineHeight: 17,
                                }}
                              >
                                Plain Quran vocabulary and context before deeper
                                tafsir or rulings.
                              </ThemedText>
                            </View>
                          </View>
                          <View style={styles.beginnerTermGrid}>
                            {ayahJourney.beginnerTerms.map((item) => (
                              <View
                                key={item.term}
                                style={[
                                  styles.beginnerTermPill,
                                  {
                                    backgroundColor: theme.surfaceGlass,
                                    borderColor: theme.borderSubtle,
                                  },
                                ]}
                              >
                                <ThemedText
                                  type="caption"
                                  style={{
                                    color: theme.primary,
                                    fontWeight: "900",
                                  }}
                                >
                                  {item.term}
                                </ThemedText>
                                <ThemedText
                                  type="caption"
                                  numberOfLines={2}
                                  style={{
                                    color: theme.textSecondary,
                                    lineHeight: 16,
                                    fontSize: 10,
                                  }}
                                >
                                  {item.meaning}
                                </ThemedText>
                              </View>
                            ))}
                          </View>
                        </View>
                      ) : null}

                      <View style={styles.ayahJourneyPathGrid}>
                        {ayahJourney.wordFocus ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Open word focus ${ayahJourney.wordFocus.translationWord || ayahJourney.wordFocus.arabicWord}`}
                            onPress={() => {
                              if (selectedVerse && ayahJourney.wordFocus) {
                                openWordSheet(selectedVerse, {
                                  position: ayahJourney.wordFocus.position,
                                  arabicWord: ayahJourney.wordFocus.arabicWord,
                                  normalizedArabicWord:
                                    ayahJourney.wordFocus.normalizedArabicWord,
                                  translationWord:
                                    ayahJourney.wordFocus.translationWord || "",
                                  transliterationWord:
                                    ayahJourney.wordFocus.transliterationWord ||
                                    "",
                                  charType: "word",
                                });
                              }
                            }}
                            style={({ pressed }) => [
                              styles.ayahJourneyMiniCard,
                              {
                                backgroundColor: `${theme.primary}10`,
                                borderColor: `${theme.primary}26`,
                              },
                              pressed ? { opacity: 0.76 } : null,
                            ]}
                          >
                            <AppIcon
                              name="type"
                              size={14}
                              color={theme.primary}
                            />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <ThemedText
                                type="caption"
                                numberOfLines={1}
                                style={{
                                  color: theme.primary,
                                  fontWeight: "900",
                                }}
                              >
                                Word focus
                              </ThemedText>
                              <ThemedText
                                type="caption"
                                numberOfLines={2}
                                style={{
                                  color: theme.textSecondary,
                                  lineHeight: 17,
                                }}
                              >
                                {ayahJourney.wordFocus.arabicWord} -{" "}
                                {ayahJourney.wordFocus.translationWord ||
                                  "study in context"}
                              </ThemedText>
                            </View>
                          </Pressable>
                        ) : null}
                        <View
                          style={[
                            styles.ayahJourneyMiniCard,
                            {
                              backgroundColor: `${theme.scholar}10`,
                              borderColor: `${theme.scholar}26`,
                            },
                          ]}
                        >
                          <AppIcon
                            name="target"
                            size={14}
                            color={theme.scholar}
                          />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{
                                color: theme.scholar,
                                fontWeight: "900",
                              }}
                            >
                              Live it
                            </ThemedText>
                            <ThemedText
                              type="caption"
                              numberOfLines={2}
                              style={{
                                color: theme.textSecondary,
                                lineHeight: 17,
                              }}
                            >
                              {ayahJourney.actionPoint}
                            </ThemedText>
                          </View>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.ayahJourneyContextCard,
                          {
                            backgroundColor: theme.surfaceGlass,
                            borderColor: theme.borderSubtle,
                          },
                        ]}
                      >
                        <AppIcon
                          name="shield"
                          size={13}
                          color={theme.primary}
                        />
                        <ThemedText
                          type="caption"
                          style={{
                            color: theme.textSecondary,
                            flex: 1,
                            lineHeight: 18,
                          }}
                        >
                          {ayahJourney.beginnerContext}
                        </ThemedText>
                      </View>
                      <View style={styles.ayahJourneyPromptRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText
                            type="caption"
                            style={{
                              color: theme.textMuted,
                              fontWeight: "900",
                            }}
                          >
                            Reflect
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{
                              color: theme.textSecondary,
                              lineHeight: 17,
                            }}
                          >
                            {ayahJourney.reflectionPrompt}
                          </ThemedText>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText
                            type="caption"
                            style={{
                              color: theme.textMuted,
                              fontWeight: "900",
                            }}
                          >
                            Memorise
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{
                              color: theme.textSecondary,
                              lineHeight: 17,
                            }}
                          >
                            {ayahJourney.memorisationPrompt}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {selectedVerse ? (
                    <View
                      style={[
                        styles.ayahTimelineCard,
                        {
                          backgroundColor: `${theme.primary}08`,
                          borderColor: `${theme.primary}22`,
                        },
                      ]}
                    >
                      <View style={styles.ayahTimelineHeader}>
                        <View
                          style={[
                            styles.ayahTimelineIcon,
                            { backgroundColor: `${theme.primary}14` },
                          ]}
                        >
                          <AppIcon name="map" size={15} color={theme.primary} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText
                            type="caption"
                            style={{ color: theme.primary, fontWeight: "900" }}
                          >
                            Verse timeline
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.textMuted }}
                          >
                            Ayah {selectedVerse.verseNumber} of{" "}
                            {VERSE_COUNTS[surahNumber - 1] || "-"} in this surah
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.scholar, fontWeight: "900" }}
                        >
                          {Math.round(
                            (selectedVerse.verseNumber /
                              (VERSE_COUNTS[surahNumber - 1] || 1)) *
                              100,
                          )}
                          %
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.ayahTimelineTrack,
                          { backgroundColor: `${theme.primary}12` },
                        ]}
                      >
                        <View
                          style={[
                            styles.ayahTimelineFill,
                            {
                              backgroundColor: theme.primary,
                              width: `${Math.min(
                                100,
                                Math.max(
                                  3,
                                  (selectedVerse.verseNumber /
                                    (VERSE_COUNTS[surahNumber - 1] || 1)) *
                                    100,
                                ),
                              )}%`,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.ayahTimelineGrid}>
                        {[
                          {
                            label: "Theme",
                            value: ayahJourney?.themeLabel || "Reflection",
                          },
                          {
                            label: "Avoid",
                            value:
                              "Do not treat missing context as permission to guess.",
                          },
                          {
                            label: "Takeaway",
                            value:
                              ayahJourney?.actionPoint ||
                              "Read slowly, then save one lesson.",
                          },
                        ].map((item) => (
                          <View
                            key={item.label}
                            style={styles.ayahTimelineItem}
                          >
                            <ThemedText
                              type="caption"
                              style={{
                                color: theme.scholar,
                                fontWeight: "900",
                              }}
                            >
                              {item.label}
                            </ThemedText>
                            <ThemedText
                              type="caption"
                              numberOfLines={2}
                              style={{
                                color: theme.textSecondary,
                                lineHeight: 16,
                              }}
                            >
                              {item.value}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.quranMemoryCard,
                      {
                        backgroundColor: `${theme.scholar}08`,
                        borderColor: `${theme.scholar}22`,
                      },
                    ]}
                  >
                    <View style={styles.quranMemoryHeader}>
                      <AppIcon
                        name="database"
                        size={14}
                        color={theme.scholar}
                      />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.scholar, fontWeight: "900" }}
                      >
                        Personal Quran memory
                      </ThemedText>
                    </View>
                    <View style={styles.quranMemoryStats}>
                      {[
                        {
                          label: "Words",
                          value: quranLearningStats?.learnedWords || 0,
                        },
                        {
                          label: "Lessons",
                          value: quranLearningStats?.savedLessons || 0,
                        },
                        {
                          label: "Notes",
                          value: quranLearningStats?.reflectionNotes || 0,
                        },
                        {
                          label: "Recite",
                          value: quranLearningStats?.recitationSessions || 0,
                        },
                      ].map((item) => (
                        <View
                          key={item.label}
                          style={[
                            styles.quranMemoryStat,
                            { borderColor: `${theme.scholar}1F` },
                          ]}
                        >
                          <ThemedText
                            type="small"
                            style={{ color: theme.text, fontWeight: "900" }}
                          >
                            {item.value}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.textMuted, fontSize: 10 }}
                          >
                            {item.label}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  </View>

                  {selectedVerseNumber ? (
                    <View
                      testID="quran-reflection-note-card"
                      style={[
                        styles.quranReflectionNoteCard,
                        {
                          backgroundColor: `${theme.primary}08`,
                          borderColor: `${theme.primary}24`,
                        },
                      ]}
                    >
                      <View style={styles.quranReflectionNoteHeader}>
                        <View
                          style={[
                            styles.quranReflectionNoteIcon,
                            { backgroundColor: `${theme.primary}14` },
                          ]}
                        >
                          <AppIcon
                            name="edit-3"
                            size={15}
                            color={theme.primary}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText
                            type="caption"
                            style={{ color: theme.primary, fontWeight: "900" }}
                          >
                            Private reflection note
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{ color: theme.textMuted, lineHeight: 17 }}
                          >
                            Anchored to Quran {surahNumber}:
                            {selectedVerseNumber}. Notes stay private in your
                            NurAI memory.
                          </ThemedText>
                        </View>
                        {savedReflectionNote ? (
                          <View
                            style={[
                              styles.quranReflectionSavedPill,
                              {
                                backgroundColor: `${theme.scholar}14`,
                                borderColor: `${theme.scholar}30`,
                              },
                            ]}
                          >
                            <AppIcon
                              name="check"
                              size={11}
                              color={theme.scholar}
                            />
                            <ThemedText
                              type="caption"
                              style={{
                                color: theme.scholar,
                                fontWeight: "900",
                                fontSize: 10,
                              }}
                            >
                              Saved
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>

                      {ayahJourney?.reflectionPrompt ? (
                        <View
                          style={[
                            styles.quranReflectionPrompt,
                            {
                              backgroundColor: `${theme.scholar}0D`,
                              borderColor: `${theme.scholar}24`,
                            },
                          ]}
                        >
                          <AppIcon
                            name="compass"
                            size={13}
                            color={theme.scholar}
                          />
                          <ThemedText
                            type="caption"
                            style={{
                              color: theme.textSecondary,
                              flex: 1,
                              lineHeight: 18,
                            }}
                          >
                            {ayahJourney.reflectionPrompt}
                          </ThemedText>
                        </View>
                      ) : null}

                      <TextInput
                        testID="input-quran-reflection-note"
                        accessibilityLabel={`Private reflection note for Quran ${surahNumber}:${selectedVerseNumber}`}
                        accessibilityHint="Write one private reflection or action from this ayah."
                        multiline
                        value={reflectionDraft}
                        onChangeText={setReflectionDraft}
                        placeholder="Write one sentence: what should I remember or practise from this ayah?"
                        placeholderTextColor={theme.textMuted}
                        textAlignVertical="top"
                        style={[
                          styles.quranReflectionInput,
                          {
                            color: theme.text,
                            backgroundColor: theme.surfaceGlass,
                            borderColor: theme.borderSubtle,
                          },
                        ]}
                      />

                      <View style={styles.quranReflectionFooter}>
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: theme.textMuted, flex: 1 }}
                        >
                          {savedReflectionNote
                            ? `Updated ${new Date(savedReflectionNote.updatedAt).toLocaleDateString("en-GB")}`
                            : "One honest note is enough."}
                        </ThemedText>
                        <Pressable
                          testID="button-save-quran-reflection-note"
                          accessibilityRole="button"
                          accessibilityLabel="Save private Quran reflection note"
                          disabled={!reflectionDraft.trim() || reflectionSaving}
                          onPress={handleSaveReflectionNote}
                          style={({ pressed }) => [
                            styles.quranReflectionSaveButton,
                            {
                              backgroundColor: reflectionDraft.trim()
                                ? theme.primary
                                : `${theme.textMuted}18`,
                              opacity:
                                pressed ||
                                reflectionSaving ||
                                !reflectionDraft.trim()
                                  ? 0.72
                                  : 1,
                            },
                          ]}
                        >
                          {reflectionSaving ? (
                            <ActivityIndicator
                              size="small"
                              color={theme.primaryForeground}
                            />
                          ) : (
                            <AppIcon
                              name={savedReflectionNote ? "check" : "save"}
                              size={14}
                              color={
                                reflectionDraft.trim()
                                  ? theme.primaryForeground
                                  : theme.textMuted
                              }
                            />
                          )}
                          <ThemedText
                            type="caption"
                            style={{
                              color: reflectionDraft.trim()
                                ? theme.primaryForeground
                                : theme.textMuted,
                              fontWeight: "900",
                            }}
                          >
                            {savedReflectionNote ? "Update" : "Save"}
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}

                  {selectedVerseNumber ? (
                    <View
                      style={[
                        styles.quranJourneyFocusCard,
                        styles.ayahJourneyModeCard,
                        {
                          backgroundColor: `${theme.primary}08`,
                          borderColor: `${theme.primary}22`,
                        },
                      ]}
                    >
                      <View style={styles.ayahJourneyModeHeader}>
                        <View
                          style={[
                            styles.ayahTimelineIcon,
                            { backgroundColor: `${theme.primary}14` },
                          ]}
                        >
                          <AppIcon
                            name="navigation"
                            size={15}
                            color={theme.primary}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText
                            type="caption"
                            style={{ color: theme.primary, fontWeight: "900" }}
                          >
                            Quran identity
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{ color: theme.textMuted, lineHeight: 16 }}
                          >
                            Today's ayah path: listen, learn one word,
                            understand, recite, then save a lesson.
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.ayahJourneyStrip}>
                        {QURAN_JOURNEY_STEPS.map((step, index) => {
                          const complete =
                            step.id === "listen"
                              ? currentPlayingVerse === selectedVerseNumber &&
                                audioActive
                              : step.id === "words"
                                ? (quranLearningStats?.learnedWords || 0) > 0
                                : step.id === "meaning"
                                  ? (quranLearningStats?.savedLessons || 0) > 0
                                  : step.id === "recite"
                                    ? (quranLearningStats?.recitationSessions ||
                                        0) > 0
                                    : (quranLearningStats?.savedLessons || 0) >
                                        1 || (hifzStats?.totalVerses || 0) > 0;
                          return (
                            <Pressable
                              key={step.id}
                              accessibilityRole="button"
                              accessibilityLabel={`${step.label}: ${step.body}`}
                              onPress={() => {
                                if (step.id === "listen")
                                  playVerse(selectedVerseNumber);
                                if (step.id === "words") {
                                  const firstWord = selectedVerse?.words?.[0];
                                  if (selectedVerse && firstWord) {
                                    openWordSheet(selectedVerse, firstWord);
                                  } else {
                                    runAIForVerse(selectedVerseNumber, "words");
                                  }
                                }
                                if (step.id === "meaning")
                                  runAIForVerse(selectedVerseNumber, "meaning");
                                if (step.id === "recite")
                                  openRecitationCoach(selectedVerseNumber);
                                if (step.id === "live")
                                  handleSaveAyahLesson(
                                    selectedVerse ?? undefined,
                                  );
                              }}
                              style={({ pressed }) => [
                                styles.ayahJourneyStep,
                                {
                                  backgroundColor: complete
                                    ? `${theme.primary}16`
                                    : `${theme.textMuted}0A`,
                                  borderColor: complete
                                    ? `${theme.primary}35`
                                    : theme.borderSubtle,
                                },
                                pressed ? { opacity: 0.72 } : null,
                              ]}
                            >
                              <AppIcon
                                name={complete ? "check" : step.icon}
                                size={12}
                                color={
                                  complete ? theme.primary : theme.textMuted
                                }
                              />
                              <ThemedText
                                type="caption"
                                numberOfLines={1}
                                style={{
                                  color: complete
                                    ? theme.primary
                                    : theme.textSecondary,
                                  fontWeight: "800",
                                  fontSize: 10,
                                }}
                              >
                                {index + 1}. {step.label}
                              </ThemedText>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}

                  {selectedVerseNumber ? (
                    <View
                      testID="quran-daily-session-handoff-card"
                      style={[
                        styles.quranDailySessionHandoffCard,
                        {
                          backgroundColor: `${theme.primary}08`,
                          borderColor: `${theme.primary}24`,
                        },
                      ]}
                      accessible
                      accessibilityLabel={`${quranDailySessionHandoff.title}. ${quranDailySessionHandoff.statusLabel}. ${quranDailySessionHandoff.nextActionLabel}. ${quranDailySessionHandoff.boundaryLabel}`}
                    >
                      <View style={styles.quranDailySessionHeader}>
                        <View
                          style={[
                            styles.quranDailySessionIcon,
                            { backgroundColor: `${theme.primary}14` },
                          ]}
                        >
                          <AppIcon
                            name="sunrise"
                            size={15}
                            color={theme.primary}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText
                            type="caption"
                            style={{ color: theme.primary, fontWeight: "900" }}
                          >
                            TODAY'S QURAN HANDOFF
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{
                              color: theme.textSecondary,
                              lineHeight: 17,
                            }}
                          >
                            {quranDailySessionHandoff.statusLabel}
                          </ThemedText>
                        </View>
                      </View>

                      <View style={styles.quranDailySessionProof}>
                        <AppIcon
                          name="bookmark"
                          size={13}
                          color={theme.scholar}
                        />
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textSecondary, flex: 1 }}
                          numberOfLines={2}
                        >
                          {quranDailySessionHandoff.proofLabel}
                        </ThemedText>
                      </View>

                      <View style={styles.quranDailySessionChecklist}>
                        {quranDailySessionHandoff.checklist.map(
                          (item, index) => (
                            <View
                              key={`${item}-${index}`}
                              style={[
                                styles.quranDailySessionCheck,
                                {
                                  backgroundColor: `${theme.primary}0B`,
                                  borderColor: `${theme.primary}20`,
                                },
                              ]}
                            >
                              <AppIcon
                                name={
                                  index === 0 ? "headphones" : "check-circle"
                                }
                                size={12}
                                color={theme.primary}
                              />
                              <ThemedText
                                type="caption"
                                numberOfLines={1}
                                style={{
                                  color: theme.textSecondary,
                                  fontWeight: "800",
                                  fontSize: 10,
                                }}
                              >
                                {item}
                              </ThemedText>
                            </View>
                          ),
                        )}
                      </View>

                      <View style={styles.quranDailySessionFooter}>
                        <ThemedText
                          type="caption"
                          style={{
                            color: theme.textMuted,
                            flex: 1,
                            lineHeight: 16,
                          }}
                        >
                          {quranDailySessionHandoff.boundaryLabel}
                        </ThemedText>
                        <Pressable
                          testID={`button-quran-daily-session-handoff-${quranDailySessionHandoff.nextActionId}`}
                          accessibilityRole="button"
                          accessibilityLabel={`Continue Quran handoff. ${quranDailySessionHandoff.nextActionLabel}`}
                          onPress={() => {
                            if (!selectedVerseNumber) return;
                            if (
                              quranDailySessionHandoff.nextActionId === "listen"
                            ) {
                              playVerse(selectedVerseNumber);
                            }
                            if (
                              quranDailySessionHandoff.nextActionId ===
                              "learn_word"
                            ) {
                              const firstWord = selectedVerse?.words?.[0];
                              if (selectedVerse && firstWord) {
                                openWordSheet(selectedVerse, firstWord);
                              } else {
                                runAIForVerse(selectedVerseNumber, "words");
                              }
                            }
                            if (
                              quranDailySessionHandoff.nextActionId ===
                              "understand"
                            ) {
                              runAIForVerse(selectedVerseNumber, "meaning");
                            }
                            if (
                              quranDailySessionHandoff.nextActionId === "recite"
                            ) {
                              openRecitationCoach(selectedVerseNumber);
                            }
                            if (
                              quranDailySessionHandoff.nextActionId ===
                              "reflect"
                            ) {
                              setReflectionDraft((current) =>
                                current.trim()
                                  ? current
                                  : ayahJourney?.reflectionPrompt ||
                                    quranRecoveryPlan.nextAction,
                              );
                            }
                          }}
                          style={({ pressed }) => [
                            styles.quranDailySessionButton,
                            { backgroundColor: theme.primary },
                            pressed ? { opacity: 0.82 } : null,
                          ]}
                        >
                          <AppIcon
                            name="arrow-right"
                            size={13}
                            color={theme.primaryForeground}
                          />
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{
                              color: theme.primaryForeground,
                              fontWeight: "900",
                            }}
                          >
                            Next
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}

                  {selectedVerseNumber ? (
                    <View
                      testID="quran-reading-session-contract-card"
                      style={[
                        styles.quranReadingContractCard,
                        {
                          backgroundColor: `${theme.scholar}07`,
                          borderColor: `${theme.scholar}24`,
                        },
                      ]}
                      accessible
                      accessibilityLabel={`${quranReadingSessionContract.title}. ${quranReadingSessionContract.statusLabel}. ${quranReadingSessionContract.nextActionLabel}. ${quranReadingSessionContract.trustBoundary}`}
                    >
                      <View style={styles.quranReadingContractHeader}>
                        <View
                          style={[
                            styles.quranReadingContractIcon,
                            { backgroundColor: `${theme.scholar}16` },
                          ]}
                        >
                          <AppIcon
                            name="shield"
                            size={15}
                            color={theme.scholar}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText
                            type="caption"
                            style={{ color: theme.scholar, fontWeight: "900" }}
                          >
                            TODAY'S READING PATH
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{
                              color: theme.textSecondary,
                              lineHeight: 17,
                            }}
                          >
                            {quranReadingSessionContract.statusLabel}
                          </ThemedText>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.quranReadingContractSource,
                          {
                            backgroundColor: `${theme.primary}08`,
                            borderColor: `${theme.primary}22`,
                          },
                        ]}
                      >
                        <AppIcon
                          name="bookmark"
                          size={13}
                          color={theme.primary}
                        />
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{
                            color: theme.textSecondary,
                            flex: 1,
                            lineHeight: 16,
                          }}
                        >
                          {quranReadingSessionContract.sourceLabel}
                        </ThemedText>
                      </View>

                      <View style={styles.quranReadingContractItems}>
                        {quranReadingSessionContract.items.map((item) => {
                          const itemColor =
                            item.tone === "danger"
                              ? theme.error
                              : item.tone === "scholar"
                                ? theme.scholar
                                : theme.primary;
                          return (
                            <View
                              key={item.id}
                              testID={`quran-reading-contract-${item.id}`}
                              style={[
                                styles.quranReadingContractItem,
                                {
                                  backgroundColor: `${itemColor}0A`,
                                  borderColor: `${itemColor}22`,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.quranReadingContractItemIcon,
                                  { backgroundColor: `${itemColor}14` },
                                ]}
                              >
                                <AppIcon
                                  name={item.icon}
                                  size={12}
                                  color={itemColor}
                                />
                              </View>
                              <View style={styles.quranReadingContractItemCopy}>
                                <ThemedText
                                  type="caption"
                                  numberOfLines={1}
                                  style={{
                                    color: theme.text,
                                    fontWeight: "900",
                                  }}
                                >
                                  {item.title}
                                </ThemedText>
                                <ThemedText
                                  type="caption"
                                  numberOfLines={1}
                                  style={{
                                    color: itemColor,
                                    fontWeight: "900",
                                    fontSize: 10,
                                  }}
                                >
                                  {item.statusLabel}
                                </ThemedText>
                                <ThemedText
                                  type="caption"
                                  numberOfLines={2}
                                  style={{
                                    color: theme.textMuted,
                                    lineHeight: 15,
                                    fontSize: 10,
                                  }}
                                >
                                  {item.body}
                                </ThemedText>
                              </View>
                            </View>
                          );
                        })}
                      </View>

                      <View
                        style={[
                          styles.quranReadingContractBoundary,
                          {
                            backgroundColor: `${theme.error}09`,
                            borderColor: `${theme.error}22`,
                          },
                        ]}
                      >
                        <AppIcon
                          name="alert-triangle"
                          size={13}
                          color={theme.error}
                        />
                        <ThemedText
                          type="caption"
                          style={{
                            color: theme.textSecondary,
                            flex: 1,
                            lineHeight: 16,
                          }}
                        >
                          {quranReadingSessionContract.trustBoundary}
                        </ThemedText>
                      </View>

                      <Pressable
                        testID={`button-quran-reading-contract-${quranReadingSessionContract.nextActionId}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Continue Quran reading path. ${quranReadingSessionContract.nextActionLabel}`}
                        onPress={() => {
                          if (!selectedVerseNumber) return;
                          if (
                            quranReadingSessionContract.nextActionId ===
                            "play_audio"
                          ) {
                            playVerse(selectedVerseNumber);
                          }
                          if (
                            quranReadingSessionContract.nextActionId ===
                            "ask_source"
                          ) {
                            runAIForVerse(selectedVerseNumber, "meaning");
                          }
                          if (
                            quranReadingSessionContract.nextActionId ===
                            "practice_recitation"
                          ) {
                            openRecitationCoach(selectedVerseNumber);
                          }
                          if (
                            quranReadingSessionContract.nextActionId ===
                            "save_reflection"
                          ) {
                            setReflectionDraft((current) =>
                              current.trim()
                                ? current
                                : ayahJourney?.reflectionPrompt ||
                                  quranRecoveryPlan.nextAction,
                            );
                          }
                          if (
                            quranReadingSessionContract.nextActionId ===
                            "create_review_packet"
                          ) {
                            handleCreateQuranScholarPacket(
                              quranScholarReviewEscalation,
                              selectedVerse,
                            );
                          }
                        }}
                        style={({ pressed }) => [
                          styles.quranReadingContractButton,
                          { backgroundColor: theme.scholar },
                          pressed ? { opacity: 0.78 } : null,
                        ]}
                      >
                        <AppIcon name="arrow-right" size={14} color="#170F05" />
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: "#170F05", fontWeight: "900" }}
                        >
                          Continue
                        </ThemedText>
                      </Pressable>
                    </View>
                  ) : null}

                  {selectedVerseNumber ? (
                    <View
                      testID="quran-scholar-review-escalation-card"
                      style={[
                        styles.quranScholarEscalationCard,
                        {
                          backgroundColor: `${theme.scholar}08`,
                          borderColor: `${theme.scholar}24`,
                        },
                      ]}
                      accessible
                      accessibilityLabel={`${quranScholarReviewEscalation.title}. ${quranScholarReviewEscalation.statusLabel}. ${quranScholarReviewEscalation.boundaryLabel}`}
                    >
                      <View style={styles.quranScholarEscalationHeader}>
                        <View
                          style={[
                            styles.quranScholarEscalationIcon,
                            { backgroundColor: `${theme.scholar}16` },
                          ]}
                        >
                          <AppIcon
                            name="shield"
                            size={15}
                            color={theme.scholar}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText
                            type="caption"
                            style={{ color: theme.scholar, fontWeight: "900" }}
                          >
                            WHEN TO ASK A SCHOLAR
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{ color: theme.textMuted, lineHeight: 16 }}
                          >
                            {quranScholarReviewEscalation.statusLabel}
                          </ThemedText>
                        </View>
                      </View>

                      <View style={styles.quranScholarEscalationItems}>
                        {quranScholarReviewEscalation.items.map((item) => {
                          const itemColor =
                            item.tone === "danger"
                              ? theme.error
                              : item.tone === "scholar"
                                ? theme.scholar
                                : theme.primary;
                          return (
                            <View
                              key={item.id}
                              testID={`quran-scholar-review-escalation-${item.id}`}
                              style={[
                                styles.quranScholarEscalationItem,
                                {
                                  backgroundColor: `${itemColor}0A`,
                                  borderColor: `${itemColor}22`,
                                },
                              ]}
                            >
                              <ThemedText
                                type="caption"
                                numberOfLines={1}
                                style={{
                                  color: itemColor,
                                  fontWeight: "900",
                                  fontSize: 10,
                                }}
                              >
                                {item.actionLabel}
                              </ThemedText>
                              <ThemedText
                                type="caption"
                                numberOfLines={1}
                                style={{ color: theme.text, fontWeight: "900" }}
                              >
                                {item.title}
                              </ThemedText>
                              <ThemedText
                                type="caption"
                                numberOfLines={2}
                                style={{
                                  color: theme.textMuted,
                                  lineHeight: 15,
                                  fontSize: 10,
                                }}
                              >
                                {item.body}
                              </ThemedText>
                            </View>
                          );
                        })}
                      </View>

                      <View
                        style={[
                          styles.quranScholarEscalationBoundary,
                          {
                            backgroundColor: `${theme.error}0A`,
                            borderColor: `${theme.error}24`,
                          },
                        ]}
                      >
                        <AppIcon
                          name="alert-triangle"
                          size={13}
                          color={theme.error}
                        />
                        <ThemedText
                          type="caption"
                          style={{
                            color: theme.textSecondary,
                            flex: 1,
                            lineHeight: 16,
                          }}
                        >
                          {quranScholarReviewEscalation.boundaryLabel}
                        </ThemedText>
                      </View>

                      {scholarPacketNotice ? (
                        <ThemedText
                          type="caption"
                          testID="quran-scholar-review-packet-notice"
                          style={{ color: theme.textMuted, lineHeight: 16 }}
                        >
                          {scholarPacketNotice}
                        </ThemedText>
                      ) : null}

                      <Pressable
                        testID="button-quran-create-scholar-review-packet"
                        accessibilityRole="button"
                        accessibilityLabel={`Prepare a scholar question for Quran ${surahNumber}:${selectedVerseNumber}`}
                        accessibilityHint="Keeps the Quran reference, source status, and missing context together for a qualified scholar."
                        disabled={scholarPacketSaving}
                        onPress={() =>
                          handleCreateQuranScholarPacket(
                            quranScholarReviewEscalation,
                            selectedVerse,
                          )
                        }
                        style={({ pressed }) => [
                          styles.quranScholarEscalationButton,
                          {
                            backgroundColor: theme.scholar,
                            opacity: pressed || scholarPacketSaving ? 0.78 : 1,
                          },
                        ]}
                      >
                        {scholarPacketSaving ? (
                          <ActivityIndicator size="small" color="#170F05" />
                        ) : (
                          <AppIcon name="send" size={14} color="#170F05" />
                        )}
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{
                            color: "#170F05",
                            fontWeight: "900",
                          }}
                        >
                          Prepare scholar question
                        </ThemedText>
                      </Pressable>
                    </View>
                  ) : null}

                  {selectedVerseNumber ? (
                    <View
                      testID="quran-streak-recovery-khatmah-card"
                      style={[
                        styles.quranRecoveryCard,
                        {
                          backgroundColor: `${theme.scholar}08`,
                          borderColor: `${theme.scholar}24`,
                        },
                      ]}
                    >
                      <View style={styles.quranRecoveryHeader}>
                        <View
                          style={[
                            styles.quranRecoveryIcon,
                            { backgroundColor: `${theme.scholar}14` },
                          ]}
                        >
                          <AppIcon
                            name="refresh-cw"
                            size={14}
                            color={theme.scholar}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText
                            type="caption"
                            style={{ color: theme.scholar, fontWeight: "900" }}
                          >
                            Streak recovery + Khatmah plan
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{ color: theme.textMuted, lineHeight: 16 }}
                          >
                            {quranRecoveryPlan.statusBody}
                          </ThemedText>
                        </View>
                      </View>

                      <View style={styles.quranRecoveryMetaRow}>
                        {[
                          quranRecoveryPlan.recoveryLabel,
                          quranRecoveryPlan.khatmahPaceLabel,
                          quranRecoveryPlan.planningWindowLabel,
                        ].map((label) => (
                          <View
                            key={label}
                            style={[
                              styles.quranRecoveryPill,
                              {
                                backgroundColor: `${theme.scholar}0D`,
                                borderColor: `${theme.scholar}26`,
                              },
                            ]}
                          >
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{
                                color: theme.scholar,
                                fontWeight: "800",
                              }}
                            >
                              {label}
                            </ThemedText>
                          </View>
                        ))}
                      </View>

                      <View
                        style={[
                          styles.quranRecoveryAccountability,
                          {
                            backgroundColor: `${theme.primary}08`,
                            borderColor: `${theme.primary}22`,
                          },
                        ]}
                      >
                        <AppIcon
                          name="calendar"
                          size={13}
                          color={theme.primary}
                        />
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{
                            color: theme.textSecondary,
                            flex: 1,
                            lineHeight: 16,
                          }}
                        >
                          {quranRecoveryPlan.accountabilityLabel}
                        </ThemedText>
                      </View>

                      <View
                        testID="quran-khatmah-proof-receipts"
                        accessibilityLabel={`Quran plan progress. ${quranRecoveryPlan.sourceNote}`}
                        style={[
                          styles.quranProofReceiptPanel,
                          {
                            backgroundColor: `${theme.scholar}07`,
                            borderColor: `${theme.scholar}20`,
                          },
                        ]}
                      >
                        <View style={styles.quranProofReceiptHeader}>
                          <View
                            style={[
                              styles.quranProofReceiptHeaderIcon,
                              { backgroundColor: `${theme.scholar}14` },
                            ]}
                          >
                            <AppIcon
                              name="clipboard"
                              size={13}
                              color={theme.scholar}
                            />
                          </View>
                          <View style={styles.quranProofReceiptHeaderCopy}>
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{
                                color: theme.scholar,
                                fontWeight: "900",
                              }}
                            >
                              QURAN PLAN PROGRESS
                            </ThemedText>
                            <ThemedText
                              type="caption"
                              numberOfLines={2}
                              style={{ color: theme.textMuted, lineHeight: 16 }}
                            >
                              Reading, recitation practice, and reflection are
                              tracked separately.
                            </ThemedText>
                          </View>
                        </View>
                        <View style={styles.quranProofReceiptList}>
                          {quranRecoveryPlan.proofReceipts.map((receipt) => {
                            const receiptColor =
                              receipt.tone === "danger"
                                ? theme.error
                                : receipt.tone === "scholar"
                                  ? theme.scholar
                                  : theme.primary;
                            return (
                              <View
                                key={receipt.id}
                                testID={`quran-proof-receipt-${receipt.id}`}
                                style={[
                                  styles.quranProofReceiptRow,
                                  {
                                    backgroundColor: `${receiptColor}0A`,
                                    borderColor: `${receiptColor}22`,
                                  },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.quranProofReceiptIcon,
                                    { backgroundColor: `${receiptColor}14` },
                                  ]}
                                >
                                  <AppIcon
                                    name={receipt.icon}
                                    size={12}
                                    color={receiptColor}
                                  />
                                </View>
                                <View style={styles.quranProofReceiptCopy}>
                                  <View style={styles.quranProofReceiptTop}>
                                    <ThemedText
                                      type="caption"
                                      numberOfLines={1}
                                      style={{
                                        color: theme.text,
                                        fontWeight: "900",
                                        flex: 1,
                                      }}
                                    >
                                      {receipt.title}
                                    </ThemedText>
                                    <ThemedText
                                      type="caption"
                                      numberOfLines={1}
                                      style={{
                                        color: receiptColor,
                                        fontWeight: "900",
                                        fontSize: 10,
                                      }}
                                    >
                                      {receipt.evidenceLabel}
                                    </ThemedText>
                                  </View>
                                  <ThemedText
                                    type="caption"
                                    numberOfLines={2}
                                    style={{
                                      color: theme.textSecondary,
                                      lineHeight: 16,
                                    }}
                                  >
                                    {receipt.saveLabel}
                                  </ThemedText>
                                  <View
                                    style={styles.quranProofReceiptBoundary}
                                  >
                                    <AppIcon
                                      name="shield"
                                      size={11}
                                      color={theme.scholar}
                                    />
                                    <ThemedText
                                      type="caption"
                                      numberOfLines={2}
                                      style={{
                                        color: theme.textMuted,
                                        flex: 1,
                                        lineHeight: 15,
                                        fontSize: 10,
                                      }}
                                    >
                                      {receipt.boundaryLabel}
                                    </ThemedText>
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      <View style={styles.quranRecoveryMilestoneList}>
                        {quranRecoveryPlan.milestones.map((milestone) => (
                          <View
                            key={milestone.id}
                            testID={`quran-recovery-milestone-${milestone.id}`}
                            style={[
                              styles.quranRecoveryMilestone,
                              {
                                backgroundColor: `${theme.primary}07`,
                                borderColor: `${theme.primary}18`,
                              },
                            ]}
                          >
                            <View style={styles.quranRecoveryMilestoneTop}>
                              <ThemedText
                                type="caption"
                                numberOfLines={1}
                                style={{
                                  color: theme.primary,
                                  fontWeight: "900",
                                  flex: 1,
                                }}
                              >
                                {milestone.title}
                              </ThemedText>
                              <ThemedText
                                type="caption"
                                numberOfLines={1}
                                style={{ color: theme.textMuted, fontSize: 10 }}
                              >
                                {milestone.evidenceLabel}
                              </ThemedText>
                            </View>
                            <ThemedText
                              type="caption"
                              numberOfLines={2}
                              style={{
                                color: theme.textSecondary,
                                lineHeight: 16,
                              }}
                            >
                              {milestone.body}
                            </ThemedText>
                          </View>
                        ))}
                      </View>

                      <View style={styles.quranRecoverySteps}>
                        {quranRecoveryPlan.steps.map((step) => (
                          <Pressable
                            key={step.id}
                            accessibilityRole="button"
                            accessibilityLabel={`${step.title}: ${step.body}`}
                            testID={`button-quran-recovery-step-${step.id}`}
                            onPress={() => {
                              if (!selectedVerseNumber) return;
                              if (step.id === "recover") {
                                playVerse(selectedVerseNumber);
                              }
                              if (step.id === "pace") {
                                runAIForVerse(selectedVerseNumber, "action");
                              }
                              if (step.id === "reflect") {
                                setReflectionDraft((current) =>
                                  current.trim()
                                    ? current
                                    : quranRecoveryPlan.nextAction,
                                );
                              }
                            }}
                            style={({ pressed }) => [
                              styles.quranRecoveryStep,
                              {
                                backgroundColor: `${theme.scholar}0A`,
                                borderColor: `${theme.scholar}20`,
                              },
                              pressed ? { opacity: 0.76 } : null,
                            ]}
                          >
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{ color: theme.text, fontWeight: "900" }}
                            >
                              {step.title}
                            </ThemedText>
                            <ThemedText
                              type="caption"
                              numberOfLines={2}
                              style={{ color: theme.textMuted, fontSize: 10 }}
                            >
                              {step.body}
                            </ThemedText>
                          </Pressable>
                        ))}
                      </View>

                      <ThemedText
                        type="caption"
                        style={[
                          styles.quranRecoverySourceNote,
                          { color: theme.textMuted },
                        ]}
                      >
                        {quranRecoveryPlan.sourceNote}
                      </ThemedText>
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.ayahStudyLearningMap,
                      {
                        backgroundColor: `${theme.primary}08`,
                        borderColor: `${theme.primary}20`,
                      },
                    ]}
                  >
                    {[
                      {
                        icon: "book-open" as const,
                        label: "Meaning",
                        value: "Plain lesson first",
                      },
                      {
                        icon: "type" as const,
                        label: "Words",
                        value: selectedVerse?.words?.length
                          ? `${selectedVerse.words.length} words ready`
                          : "Word mode ready",
                      },
                      {
                        icon: "shield" as const,
                        label: "Sources",
                        value: sourceStatusLabel,
                      },
                    ].map((item) => (
                      <View
                        key={item.label}
                        style={styles.ayahStudyLearningItem}
                      >
                        <View
                          style={[
                            styles.ayahStudyLearningIcon,
                            { backgroundColor: `${theme.primary}12` },
                          ]}
                        >
                          <AppIcon
                            name={item.icon}
                            size={13}
                            color={theme.primary}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.text, fontWeight: "900" }}
                          >
                            {item.label}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.textMuted, fontSize: 10 }}
                          >
                            {item.value}
                          </ThemedText>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              <View style={styles.ayahStudyAudienceBlock}>
                <ThemedText
                  type="caption"
                  style={[
                    styles.ayahStudyAudienceLabel,
                    { color: theme.textMuted },
                  ]}
                >
                  Explain for
                </ThemedText>
                <View style={styles.ayahStudyAudienceRow}>
                  {QURAN_STUDY_AUDIENCES.map((audience) => {
                    const selected = quranStudyAudience === audience.id;
                    return (
                      <Pressable
                        key={audience.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Explain for ${audience.label}`}
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setQuranStudyAudience(audience.id);
                          Haptics.selectionAsync();
                        }}
                        style={({ pressed }) => [
                          styles.ayahStudyAudienceChip,
                          {
                            backgroundColor: selected
                              ? `${theme.primary}18`
                              : `${theme.textMuted}0D`,
                            borderColor: selected
                              ? `${theme.primary}50`
                              : theme.borderSubtle,
                          },
                          pressed ? { opacity: 0.72 } : null,
                        ]}
                      >
                        <AppIcon
                          name={audience.icon}
                          size={13}
                          color={selected ? theme.primary : theme.textMuted}
                        />
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{
                            color: selected
                              ? theme.primary
                              : theme.textSecondary,
                            fontWeight: "800",
                          }}
                        >
                          {audience.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.ayahStudyGrid}>
                {QURAN_STUDY_MODES.map((mode) => (
                  <Pressable
                    key={mode.id}
                    testID={`quran-ayah-study-${mode.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${mode.label} for ayah ${surahNumber}:${selectedVerseNumber || ""}`}
                    onPress={() => runAIForVerse(selectedVerseNumber, mode.id)}
                    style={({ pressed }) => [
                      styles.ayahStudyAction,
                      {
                        backgroundColor: `${theme.scholar}10`,
                        borderColor: `${theme.scholar}28`,
                      },
                      pressed ? { opacity: 0.76 } : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.ayahStudyActionIcon,
                        { backgroundColor: `${theme.scholar}18` },
                      ]}
                    >
                      <AppIcon
                        name={mode.icon}
                        size={18}
                        color={theme.scholar}
                      />
                    </View>
                    <ThemedText
                      type="small"
                      style={{ color: theme.text, fontWeight: "800" }}
                    >
                      {mode.label}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color: theme.textMuted, lineHeight: 16 }}
                    >
                      {QURAN_STUDY_MODE_COPY[mode.id]}
                    </ThemedText>
                    {!isPremium ? (
                      <View
                        style={[
                          styles.ayahStudyLock,
                          { backgroundColor: `${theme.scholar}16` },
                        ]}
                      >
                        <AppIcon name="lock" size={10} color={theme.scholar} />
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>

              <View style={styles.ayahStudyUtilityRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.ayahStudyUtility,
                    {
                      backgroundColor: `${theme.primary}12`,
                      borderColor: `${theme.primary}28`,
                    },
                    pressed ? { opacity: 0.76 } : null,
                  ]}
                  onPress={() => {
                    if (selectedVerseNumber) {
                      setAyahStudySheetVisible(false);
                      playVerse(selectedVerseNumber);
                    }
                  }}
                >
                  <AppIcon name="play" size={14} color={theme.primary} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    Play ayah
                  </ThemedText>
                </Pressable>
                {selectedVerse ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.ayahStudyUtility,
                      {
                        backgroundColor: `${theme.primary}12`,
                        borderColor: `${theme.primary}28`,
                      },
                      pressed ? { opacity: 0.76 } : null,
                    ]}
                    onPress={() => handleBookmarkVerse(selectedVerse)}
                  >
                    <AppIcon
                      name={
                        bookmarkedVerses.has(selectedVerse.verseNumber)
                          ? "bookmark"
                          : "bookmark"
                      }
                      size={14}
                      color={theme.primary}
                    />
                    <ThemedText
                      type="caption"
                      style={{ color: theme.primary, fontWeight: "800" }}
                    >
                      {bookmarkedVerses.has(selectedVerse.verseNumber)
                        ? "Saved"
                        : "Save"}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>

              {selectedVerse ? (
                <>
                  <View style={styles.ayahStudyUtilityRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.ayahStudyUtility,
                        {
                          backgroundColor: `${theme.scholar}10`,
                          borderColor: `${theme.scholar}28`,
                        },
                        pressed ? { opacity: 0.76 } : null,
                      ]}
                      onPress={() => handleSaveAyahLesson(selectedVerse)}
                    >
                      <AppIcon name="edit-3" size={14} color={theme.scholar} />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.scholar, fontWeight: "800" }}
                      >
                        Save lesson
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.ayahStudyUtility,
                        {
                          backgroundColor: `${theme.primary}12`,
                          borderColor: `${theme.primary}28`,
                        },
                        pressed ? { opacity: 0.76 } : null,
                      ]}
                      onPress={() => handleAddAyahToHifz(selectedVerseNumber)}
                    >
                      <AppIcon name="repeat" size={14} color={theme.primary} />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.primary, fontWeight: "800" }}
                      >
                        Hifz review
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.ayahStudyUtility,
                        {
                          backgroundColor: `${theme.scholar}12`,
                          borderColor: `${theme.scholar}28`,
                        },
                        pressed ? { opacity: 0.76 } : null,
                      ]}
                      onPress={() => openRecitationCoach(selectedVerseNumber)}
                    >
                      <AppIcon name="mic" size={14} color={theme.scholar} />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.scholar, fontWeight: "800" }}
                      >
                        Recite
                      </ThemedText>
                    </Pressable>
                  </View>
                  <View style={styles.ayahStudyUtilityRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.ayahStudyUtility,
                        {
                          backgroundColor: `${theme.primary}10`,
                          borderColor: `${theme.primary}24`,
                        },
                        pressed ? { opacity: 0.76 } : null,
                      ]}
                      onPress={() => handleCreateFamilyChallenge(selectedVerse)}
                    >
                      <AppIcon name="users" size={14} color={theme.primary} />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.primary, fontWeight: "800" }}
                      >
                        Family
                      </ThemedText>
                    </Pressable>
                  </View>
                </>
              ) : null}

              <View
                style={[
                  styles.studyTrustRow,
                  { borderColor: `${theme.scholar}26` },
                ]}
              >
                <AppIcon name="shield" size={13} color={theme.scholar} />
                <ThemedText
                  type="caption"
                  numberOfLines={3}
                  style={{
                    color: theme.textSecondary,
                    flex: 1,
                    lineHeight: 18,
                  }}
                >
                  Answers are anchored to this Quran ayah first. Tafsir, fiqh,
                  or sensitive topics are shown with caution when source support
                  is limited. This is not a final fatwa or personal ruling.
                </ThemedText>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderTajweedText = useCallback(
    (tajweedHtml: string, fs: number) => {
      const segments = parseTajweedText(tajweedHtml);
      return (
        <Text
          style={[
            styles.arabicText,
            {
              fontSize: fs,
              lineHeight: fs * 1.8,
              fontFamily: getArabicFontFamily(),
            },
          ]}
        >
          {segments.map((seg, i) => (
            <Text
              key={i}
              style={seg.color ? { color: seg.color } : { color: theme.text }}
            >
              {seg.text}
            </Text>
          ))}
        </Text>
      );
    },
    [theme.text, getArabicFontFamily],
  );

  const renderWordByWord = useCallback(
    (verse: Verse) => {
      const { words, isMuqattaat, wordLangAvailable } = verse;

      if (words.length === 0) {
        return (
          <View
            style={[
              styles.wbwUnavailable,
              {
                backgroundColor: `${theme.primary}08`,
                borderColor: `${theme.primary}18`,
              },
            ]}
          >
            <AppIcon name="info" size={12} color={theme.textMuted} />
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginLeft: 6 }}
            >
              Word-by-word not available for this verse
            </ThemedText>
          </View>
        );
      }

      if (isMuqattaat) {
        return (
          <View style={styles.wbwContainer}>
            {words.map((word, idx) => (
              <Pressable
                key={idx}
                accessibilityRole="button"
                accessibilityLabel={`Open word card for ${word.arabicWord}`}
                onPress={() => openWordSheet(verse, word)}
                style={[
                  styles.wbwChip,
                  styles.muqattaatChip,
                  {
                    backgroundColor: `${theme.primary}08`,
                    borderColor: `${theme.primary}25`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.wbwArabic,
                    {
                      color: theme.text,
                      fontSize: Math.max(18, fontSize - 2),
                      fontFamily: getArabicFontFamily(),
                    },
                  ]}
                >
                  {word.arabicWord}
                </Text>
                <View
                  style={[
                    styles.wbwDivider,
                    { backgroundColor: `${theme.primary}25` },
                  ]}
                />
                <ThemedText
                  type="caption"
                  style={[
                    styles.wbwMeaning,
                    { color: theme.textSecondary, fontStyle: "italic" },
                  ]}
                >
                  Disconnected letters
                </ThemedText>
              </Pressable>
            ))}
          </View>
        );
      }

      const meaningDirection = isTranslationRtl ? "rtl" : "ltr";
      const meaningAlign = isTranslationRtl
        ? ("right" as const)
        : ("center" as const);

      return (
        <>
          {!wordLangAvailable ? (
            <View
              style={[
                styles.wbwUnavailable,
                {
                  backgroundColor: `${theme.primary}08`,
                  borderColor: `${theme.primary}18`,
                  marginBottom: Spacing.sm,
                },
              ]}
            >
              <AppIcon name="info" size={12} color={theme.textMuted} />
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, marginLeft: 6 }}
              >
                {currentTranslationConfig.language.replace(/ Alt$/, "")} word
                meanings are not available yet. Showing English.
              </ThemedText>
            </View>
          ) : null}
          <View style={styles.wbwContainer}>
            {words.map((word, idx) => (
              <Pressable
                key={idx}
                accessibilityRole="button"
                accessibilityLabel={`Open word card for ${word.arabicWord}`}
                onPress={() => openWordSheet(verse, word)}
                style={[
                  styles.wbwChip,
                  {
                    backgroundColor: `${theme.primary}06`,
                    borderColor: `${theme.primary}15`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.wbwArabic,
                    {
                      color: theme.text,
                      fontSize: Math.max(16, fontSize - 4),
                      fontFamily: getArabicFontFamily(),
                    },
                  ]}
                >
                  {word.arabicWord}
                </Text>
                {word.transliterationWord ? (
                  <ThemedText
                    type="caption"
                    style={[
                      styles.wbwTransliteration,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {word.transliterationWord}
                  </ThemedText>
                ) : null}
                <View
                  style={[
                    styles.wbwDivider,
                    { backgroundColor: `${theme.primary}20` },
                  ]}
                />
                <ThemedText
                  type="caption"
                  style={[
                    styles.wbwMeaning,
                    {
                      color: theme.primary,
                      writingDirection: meaningDirection,
                      textAlign: meaningAlign,
                    },
                  ]}
                >
                  {word.translationWord}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </>
      );
    },
    [
      theme,
      fontSize,
      getArabicFontFamily,
      openWordSheet,
      isTranslationRtl,
      currentTranslationConfig.language,
    ],
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Retained until the Quran reader study UI is safely reduced in a focused pass.
  const renderInlineAyahLens = (verse: Verse) => {
    if (activeAyahLensVerse !== verse.verseNumber) return null;
    const firstWord = verse.words?.find((word) => word.arabicWord?.trim());
    const verseInsight = getVerseInsight(surahNumber, verse.verseNumber);
    const selectedAudience =
      QURAN_STUDY_AUDIENCES.find(
        (audience) => audience.id === quranStudyAudience,
      ) || QURAN_STUDY_AUDIENCES[0];
    const inlineLensInsight =
      verseInsight?.content ||
      "Start with the plain meaning, then choose words, reflection, or recitation practice.";
    const inlineSourceLabel = verseInsight
      ? "App context ready"
      : "Ayah anchored";
    const inlineMemoryLabel =
      (quranLearningStats?.savedLessons || 0) > 0 ||
      (quranLearningStats?.learnedWords || 0) > 0
        ? "Memory active"
        : "Start memory";
    const actions: {
      id: string;
      label: string;
      icon: AppIconName;
      tone: "primary" | "scholar";
      onPress: () => void;
    }[] = [
      {
        id: "explain",
        label: "Explain",
        icon: "book-open",
        tone: "primary",
        onPress: () => runAIForVerse(verse.verseNumber, "meaning"),
      },
      {
        id: "words",
        label: "Words",
        icon: "type",
        tone: "primary",
        onPress: () =>
          firstWord
            ? openWordSheet(verse, firstWord)
            : runAIForVerse(verse.verseNumber, "words"),
      },
      {
        id: "reflect",
        label: "Reflect",
        icon: "target",
        tone: "scholar",
        onPress: () => runAIForVerse(verse.verseNumber, "action"),
      },
      {
        id: "recite",
        label: "Recite",
        icon: "mic",
        tone: "scholar",
        onPress: () => openRecitationCoach(verse.verseNumber),
      },
    ];

    return (
      <Animated.View
        testID="quran-inline-ayah-lens"
        entering={FadeInDown.duration(180)}
        style={[
          styles.inlineAyahLens,
          {
            backgroundColor: `${theme.backgroundSecondary}F2`,
            borderColor: `${theme.primary}24`,
          },
        ]}
      >
        <LinearGradient
          colors={[`${theme.primary}18`, `${theme.scholar}0E`, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.inlineAyahLensGlow}
        />
        <GeometricCardPattern
          color={theme.primary}
          opacity={0.012}
          style={styles.inlineAyahLensPattern}
        />
        <View style={styles.inlineAyahLensHeader}>
          <View
            style={[
              styles.inlineAyahLensMark,
              { backgroundColor: `${theme.primary}12` },
            ]}
          >
            <NurAILogoMark size={18} borderRadius={7} color={theme.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{ color: theme.primary, fontWeight: "900" }}
            >
              Study tools for {surahNumber}:{verse.verseNumber}
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{ color: theme.textMuted, fontSize: 10 }}
            >
              Choose one focused action, then return to reading.
            </ThemedText>
          </View>
          <Pressable
            testID="button-quran-inline-close"
            accessibilityRole="button"
            accessibilityLabel={`Close quick Quran lens for ${surahNumber}:${verse.verseNumber}`}
            onPress={() => {
              setActiveAyahLensVerse(null);
              Haptics.selectionAsync();
            }}
            hitSlop={8}
            style={({ pressed }) => [
              styles.inlineAyahLensClose,
              {
                backgroundColor: `${theme.textMuted}10`,
                opacity: pressed ? 0.68 : 1,
              },
            ]}
          >
            <AppIcon name="x" size={13} color={theme.textMuted} />
          </Pressable>
        </View>
        <View
          testID="quran-inline-ayah-live-state"
          style={styles.inlineAyahLiveStateRow}
        >
          {[
            {
              id: "audience",
              label: selectedAudience.label,
              body: "Study depth",
              icon: selectedAudience.icon,
              color: theme.primary,
              testID: "quran-inline-ayah-audience-chip",
            },
            {
              id: "source",
              label: inlineSourceLabel,
              body: "Source state",
              icon: "shield" as const,
              color: theme.scholar,
              testID: "quran-inline-ayah-source-state",
            },
            {
              id: "memory",
              label: inlineMemoryLabel,
              body: isPremium ? "Personal study" : "Premium study",
              icon: isPremium ? ("zap" as const) : ("lock" as const),
              color: isPremium ? theme.primary : theme.scholar,
              testID: "quran-inline-ayah-memory-state",
            },
          ].map((item) => (
            <View
              key={item.id}
              testID={item.testID}
              style={[
                styles.inlineAyahLiveState,
                {
                  backgroundColor: `${item.color}0E`,
                  borderColor: `${item.color}24`,
                },
              ]}
            >
              <AppIcon name={item.icon} size={11} color={item.color} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{
                    color: item.color,
                    fontSize: 10,
                    fontWeight: "900",
                  }}
                >
                  {item.label}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: theme.textMuted, fontSize: 9 }}
                >
                  {item.body}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
        <View
          style={styles.inlineAyahLensMap}
          testID="quran-inline-ayah-lens-map"
        >
          {[
            {
              icon: "book-open" as const,
              label: "Meaning",
              color: theme.primary,
            },
            { icon: "type" as const, label: "Words", color: theme.primary },
            { icon: "target" as const, label: "Action", color: theme.scholar },
            { icon: "shield" as const, label: "Sources", color: theme.scholar },
          ].map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.inlineAyahLensMapStep,
                {
                  backgroundColor: `${item.color}0F`,
                  borderColor: `${item.color}24`,
                },
              ]}
            >
              <AppIcon name={item.icon} size={11} color={item.color} />
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{
                  color: item.color,
                  fontWeight: "800",
                  fontSize: 9,
                }}
              >
                {item.label}
              </ThemedText>
              {index < 3 ? (
                <View
                  style={[
                    styles.inlineAyahLensMapConnector,
                    { backgroundColor: `${theme.primary}28` },
                  ]}
                />
              ) : null}
            </View>
          ))}
        </View>
        <View
          testID="quran-inline-ayah-best-next-step"
          style={[
            styles.inlineAyahLensInsight,
            {
              backgroundColor: `${theme.scholar}0D`,
              borderColor: `${theme.scholar}24`,
            },
          ]}
        >
          <AppIcon name="zap" size={12} color={theme.scholar} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{
                color: theme.scholar,
                fontWeight: "900",
                fontSize: 10,
              }}
            >
              Best next step
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textSecondary, lineHeight: 16 }}
            >
              {inlineLensInsight}
            </ThemedText>
          </View>
        </View>
        <View style={styles.inlineAyahLensActions}>
          {actions.map((action) => {
            const color =
              action.tone === "scholar" ? theme.scholar : theme.primary;
            return (
              <Pressable
                key={action.id}
                testID={`button-quran-inline-action-${action.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${action.label} Quran ${surahNumber}:${verse.verseNumber}`}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.inlineAyahLensAction,
                  {
                    backgroundColor: `${color}12`,
                    borderColor: `${color}2E`,
                  },
                  pressed ? { opacity: 0.72 } : null,
                ]}
              >
                <AppIcon name={action.icon} size={13} color={color} />
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color, fontWeight: "900", fontSize: 10 }}
                >
                  {action.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    );
  };

  const renderVerse = ({ item, index }: { item: Verse; index: number }) => {
    const isCurrentlyPlaying =
      currentPlayingVerse === item.verseNumber && audioActive;
    const isPlayingNow = isCurrentlyPlaying && transportState === "playing";
    const isHighlighted = highlightedVerse === item.verseNumber;
    const isLensActive = activeAyahLensVerse === item.verseNumber;
    const isMemoryRevealed =
      memorisationReveal || Boolean(revealedMemoryVerses[item.verseNumber]);

    return (
      <AnimatedPressable
        key={`${item.verseNumber}-${translationId}-${showWordByWord}-${showTransliteration}`}
        onPress={() => {
          setCurrentVisibleVerse(item.verseNumber);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Ayah ${surahNumber}:${item.verseNumber}`}
        style={[
          styles.verseCard,
          {
            backgroundColor: isHighlighted
              ? `${theme.primary}0D`
              : isLensActive
                ? `${theme.primary}08`
                : "transparent",
            borderColor: isHighlighted
              ? `${theme.primary}70`
              : isLensActive || isCurrentlyPlaying
                ? `${theme.primary}58`
                : "transparent",
            borderWidth:
              isHighlighted || isLensActive || isCurrentlyPlaying ? 1 : 0,
            shadowColor: isLensActive ? theme.primary : "#000",
            shadowOpacity: isLensActive ? 0.12 : 0,
            shadowRadius: isLensActive ? 20 : 0,
          },
        ]}
      >
        <View style={styles.verseHeader}>
          <View style={styles.verseBadge}>
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
              <QuranVerseRosette color={theme.scholar} size={44} />
            </View>
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "800", fontSize: 10 }}
            >
              {item.verseNumber}
            </ThemedText>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              testID={`bookmark-verse-${item.verseNumber}`}
              style={({ pressed }) => [
                styles.versePlayBtn,
                {
                  backgroundColor: bookmarkedVerses.has(item.verseNumber)
                    ? `${theme.primary}20`
                    : `${theme.primary}10`,
                },
                pressed ? { opacity: 0.6 } : null,
              ]}
              onPress={() => handleBookmarkVerse(item)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`${bookmarkedVerses.has(item.verseNumber) ? "Remove bookmark from" : "Bookmark"} ayah ${surahNumber}:${item.verseNumber}`}
            >
              <AppIcon
                name="bookmark"
                size={14}
                color={
                  bookmarkedVerses.has(item.verseNumber)
                    ? theme.primary
                    : theme.textMuted
                }
              />
            </Pressable>
            <Pressable
              testID={`play-verse-${item.verseNumber}`}
              style={({ pressed }) => [
                styles.versePlayBtn,
                {
                  backgroundColor: isCurrentlyPlaying
                    ? theme.primary
                    : `${theme.primary}15`,
                },
                pressed ? { opacity: 0.6 } : null,
              ]}
              onPress={() => {
                if (isPlayingNow) {
                  pausePlayback();
                } else if (isCurrentlyPlaying) {
                  resumePlayback();
                } else {
                  playVerse(item.verseNumber);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`${isPlayingNow ? "Pause" : "Play"} ayah ${surahNumber}:${item.verseNumber}`}
            >
              <AppIcon
                name={isPlayingNow ? "pause" : "play"}
                size={14}
                color={
                  isCurrentlyPlaying ? theme.primaryForeground : theme.primary
                }
              />
            </Pressable>
          </View>
        </View>
        {isHighlighted || isCurrentlyPlaying ? (
          <GoldDivider
            color={isHighlighted ? theme.primary : theme.scholar}
            opacity={0.55}
            style={styles.activeVerseDivider}
          />
        ) : null}

        {memorisationMode ? (
          <View
            style={[
              styles.memorisationDeskCard,
              {
                backgroundColor: `${theme.scholar}0B`,
                borderColor: `${theme.scholar}24`,
              },
            ]}
          >
            <View style={styles.memorisationDeskTop}>
              <View
                style={[
                  styles.memorisationDeskIcon,
                  { backgroundColor: `${theme.scholar}18` },
                ]}
              >
                <AppIcon name="repeat" size={14} color={theme.scholar} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.scholar, fontWeight: "900" }}
                >
                  Hifz desk
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: theme.textMuted }}
                >
                  Listen, reveal, then mark your recall.
                </ThemedText>
              </View>
            </View>
            <View style={styles.memorisationDeskActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Listen and repeat ayah ${surahNumber}:${item.verseNumber}`}
                style={({ pressed }) => [
                  styles.memorisationDeskAction,
                  {
                    backgroundColor: `${theme.primary}12`,
                    borderColor: `${theme.primary}28`,
                  },
                  pressed ? { opacity: 0.76 } : null,
                ]}
                onPress={() => {
                  setRepeatVerse(true);
                  repeatVerseRef.current = true;
                  setAutoAdvance(false);
                  autoAdvanceRef.current = false;
                  playVerse(item.verseNumber);
                }}
              >
                <AppIcon name="headphones" size={12} color={theme.primary} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "900" }}
                >
                  Repeat
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${isMemoryRevealed ? "Hide" : "Reveal"} ayah ${surahNumber}:${item.verseNumber}`}
                style={({ pressed }) => [
                  styles.memorisationDeskAction,
                  {
                    backgroundColor: `${theme.scholar}12`,
                    borderColor: `${theme.scholar}28`,
                  },
                  pressed ? { opacity: 0.76 } : null,
                ]}
                onPress={() =>
                  setRevealedMemoryVerses((current) => ({
                    ...current,
                    [item.verseNumber]: !isMemoryRevealed,
                  }))
                }
              >
                <AppIcon
                  name={isMemoryRevealed ? "eye-off" : "eye"}
                  size={12}
                  color={theme.scholar}
                />
                <ThemedText
                  type="caption"
                  style={{ color: theme.scholar, fontWeight: "900" }}
                >
                  {isMemoryRevealed ? "Hide" : "Reveal"}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open recitation coach for ayah ${surahNumber}:${item.verseNumber}`}
                style={({ pressed }) => [
                  styles.memorisationDeskAction,
                  {
                    backgroundColor: `${theme.primary}10`,
                    borderColor: `${theme.primary}24`,
                  },
                  pressed ? { opacity: 0.76 } : null,
                ]}
                onPress={() => openRecitationCoach(item.verseNumber)}
              >
                <AppIcon name="mic" size={12} color={theme.primary} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "900" }}
                >
                  Coach
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {memorisationMode && !isMemoryRevealed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Reveal Arabic text for ayah ${surahNumber}:${item.verseNumber}`}
            onPress={() =>
              setRevealedMemoryVerses((current) => ({
                ...current,
                [item.verseNumber]: true,
              }))
            }
            style={[
              styles.memorisationHiddenArabicCard,
              {
                backgroundColor: `${theme.primary}08`,
                borderColor: `${theme.primary}20`,
              },
            ]}
          >
            <AppIcon name="eye-off" size={16} color={theme.primary} />
            <ThemedText
              type="caption"
              style={{ color: theme.primary, fontWeight: "900" }}
            >
              Arabic hidden for recall. Tap to reveal.
            </ThemedText>
          </Pressable>
        ) : tajweedEnabled && item.tajweed ? (
          renderTajweedText(item.tajweed, fontSize)
        ) : (
          <ThemedText
            style={[
              styles.arabicText,
              {
                fontSize,
                lineHeight: fontSize * 1.78,
                color: theme.text,
                fontFamily: getArabicFontFamily(),
              },
            ]}
          >
            {item.arabic}
          </ThemedText>
        )}

        {showTransliteration && item.transliteration ? (
          <View style={styles.transliterationBlock}>
            <ThemedText
              type="body"
              style={[
                styles.transliterationText,
                {
                  color: theme.primary,
                  fontSize: Math.max(13, fontSize - 10),
                  lineHeight: Math.max(20, (fontSize - 10) * 1.6),
                },
              ]}
            >
              {item.transliteration}
            </ThemedText>
          </View>
        ) : null}

        {showWordByWord ? (
          <>
            <View
              style={[
                styles.sectionLabel,
                { borderColor: `${theme.primary}15` },
              ]}
            >
              <AppIcon name="grid" size={10} color={theme.textMuted} />
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, marginLeft: 4, fontSize: 10 }}
              >
                Word by Word
              </ThemedText>
            </View>
            {renderWordByWord(item)}
          </>
        ) : null}

        {translationId !== "none" ? (
          <>
            <View
              style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
            />
            {memorisationMode && !isMemoryRevealed ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Reveal meaning for ayah ${surahNumber}:${item.verseNumber}`}
                onPress={() =>
                  setRevealedMemoryVerses((current) => ({
                    ...current,
                    [item.verseNumber]: true,
                  }))
                }
                style={[
                  styles.memorisationHiddenCard,
                  {
                    backgroundColor: `${theme.scholar}0D`,
                    borderColor: `${theme.scholar}25`,
                  },
                ]}
              >
                <AppIcon name="eye-off" size={15} color={theme.scholar} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.scholar, fontWeight: "800" }}
                >
                  Meaning hidden for recall. Tap to reveal.
                </ThemedText>
              </Pressable>
            ) : (
              <View style={styles.translationBlock}>
                <ThemedText
                  type="body"
                  style={[
                    styles.translationText,
                    {
                      color: theme.textSecondary,
                      fontSize: Math.max(15, Math.min(18, fontSize - 10)),
                      lineHeight: Math.max(
                        25,
                        Math.min(28, (fontSize - 10) * 1.55),
                      ),
                      textAlign: isTranslationRtl ? "right" : "left",
                      writingDirection: isTranslationRtl ? "rtl" : "ltr",
                    },
                  ]}
                >
                  {item.translation}
                </ThemedText>
              </View>
            )}
          </>
        ) : null}

        {false ? (
          <View
            testID="quran-ayah-premium-study-cue"
            style={[
              styles.ayahStudyCue,
              {
                backgroundColor: "rgba(255,255,255,0.03)",
                borderColor:
                  activeAyahLensVerse === item.verseNumber
                    ? `${theme.primary}34`
                    : theme.borderSubtle,
              },
            ]}
          >
            <View style={styles.ayahStudyCueTop}>
              <View style={styles.ayahStudyCueTitleRow}>
                <View
                  style={[
                    styles.ayahStudyCueMark,
                    { backgroundColor: `${theme.primary}12` },
                  ]}
                >
                  <NurAILogoMark
                    size={16}
                    borderRadius={6}
                    color={theme.primary}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: theme.primary, fontWeight: "900" }}
                  >
                    Ayah study
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: theme.textMuted, fontSize: 10 }}
                  >
                    Tap for ayah actions. Hold for meaning and sources.
                  </ThemedText>
                </View>
              </View>
              <View
                style={[
                  styles.ayahSourcePill,
                  {
                    backgroundColor: `${theme.scholar}10`,
                    borderColor: `${theme.scholar}2A`,
                  },
                ]}
              >
                <AppIcon name="shield" size={10} color={theme.scholar} />
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{
                    color: theme.scholar,
                    fontWeight: "900",
                    fontSize: 9,
                  }}
                >
                  Quran anchored
                </ThemedText>
              </View>
            </View>
            <View style={styles.ayahStudyCueActions}>
              {[
                {
                  id: "meaning",
                  label: "Meaning",
                  icon: "book-open" as const,
                  color: theme.primary,
                  onPress: () => runAIForVerse(item.verseNumber, "meaning"),
                },
                {
                  id: "words",
                  label: "Words",
                  icon: "type" as const,
                  color: theme.primary,
                  onPress: () => runAIForVerse(item.verseNumber, "words"),
                },
                {
                  id: "reflect",
                  label: "Reflect",
                  icon: "target" as const,
                  color: theme.scholar,
                  onPress: () => runAIForVerse(item.verseNumber, "action"),
                },
              ].map((action) => (
                <Pressable
                  key={action.id}
                  testID={`button-quran-ayah-study-cue-${action.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${action.label} Quran ${surahNumber}:${item.verseNumber}`}
                  onPress={action.onPress}
                  style={({ pressed }) => [
                    styles.ayahStudyCueAction,
                    {
                      backgroundColor: `${action.color}0D`,
                      borderColor: `${action.color}24`,
                    },
                    pressed ? { opacity: 0.72 } : null,
                  ]}
                >
                  <AppIcon name={action.icon} size={11} color={action.color} />
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{
                      color: action.color,
                      fontWeight: "900",
                      fontSize: 10,
                    }}
                  >
                    {action.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {memorisationMode ? (
          <View style={styles.memorisationReviewRow}>
            <Pressable
              style={({ pressed }) => [
                styles.memorisationReviewBtn,
                {
                  backgroundColor: `${theme.primary}12`,
                  borderColor: `${theme.primary}28`,
                },
                pressed ? { opacity: 0.75 } : null,
              ]}
              onPress={() =>
                handleMemorisationReview(item.verseNumber, "memorized")
              }
            >
              <AppIcon name="check" size={13} color={theme.primary} />
              <ThemedText
                type="caption"
                style={{ color: theme.primary, fontWeight: "800" }}
              >
                Recalled
              </ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.memorisationReviewBtn,
                {
                  backgroundColor: `${theme.scholar}10`,
                  borderColor: `${theme.scholar}26`,
                },
                pressed ? { opacity: 0.75 } : null,
              ]}
              onPress={() =>
                handleMemorisationReview(item.verseNumber, "needsPractice")
              }
            >
              <AppIcon name="repeat" size={13} color={theme.scholar} />
              <ThemedText
                type="caption"
                style={{ color: theme.scholar, fontWeight: "800" }}
              >
                Review again
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {isLensActive || isHighlighted || isCurrentlyPlaying
          ? (() => {
              const ctx = getVerseInsight(surahNumber, item.verseNumber);
              if (!ctx) return null;
              const accentColor = theme.primary;
              const typeLabel =
                ctx.contextType === "hadith"
                  ? "Related Hadith"
                  : ctx.contextType === "revelation"
                    ? "Revelation Context"
                    : ctx.contextType === "tafsir"
                      ? "Tafsir Insight"
                      : ctx.contextType === "linguistic"
                        ? "Arabic Insight"
                        : "Practical Wisdom";
              return (
                <View
                  style={[
                    styles.verseContextCard,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.verseContextHeader}>
                    <View
                      style={[
                        styles.verseContextDot,
                        { backgroundColor: accentColor },
                      ]}
                    />
                    <ThemedText
                      type="caption"
                      style={[styles.verseContextLabel, { color: accentColor }]}
                    >
                      {typeLabel}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="body"
                    style={[
                      styles.verseContextBody,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {ctx.content}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={[
                      styles.verseContextSource,
                      { color: theme.textMuted },
                    ]}
                  >
                    {ctx.source}
                  </ThemedText>
                </View>
              );
            })()
          : null}
        <View
          pointerEvents="none"
          style={[
            styles.verseBoundary,
            { backgroundColor: `${theme.scholar}24` },
          ]}
        />
      </AnimatedPressable>
    );
  };

  const showAudioBar = audioActive;
  const isWordAudioPlayback = audioActive && currentPlayingVerse === null;
  const audioStatusLabel =
    transportState === "loading"
      ? "Loading recitation"
      : transportState === "playing"
        ? "Now reciting"
        : transportState === "paused"
          ? "Paused"
          : "Ready";
  const audioDockBottom = Math.max(insets.bottom, Spacing.sm);
  const audioDockReservedHeight = Math.max(audioDockHeight, 64);
  const readerBottomPadding = showAudioBar
    ? audioDockBottom + audioDockReservedHeight + Spacing.xl
    : insets.bottom + Spacing["2xl"];
  const audioErrorBottom = showAudioBar
    ? audioDockBottom + audioDockReservedHeight + Spacing.sm
    : insets.bottom + Spacing.md;
  const sleepTimerRemainingMs =
    sleepTimerEndsAt && sleepTimerMinutes > 0
      ? Math.max(0, sleepTimerEndsAt - sleepTimerNow)
      : 0;
  const audioDockTimerLabel =
    sleepTimerRemainingMs > 0
      ? ` · Fades in ${formatMediaSleepTimerRemaining(sleepTimerRemainingMs)}`
      : "";
  const wordPlaybackVerse = selectedWordContext?.verse.verseNumber;
  const audioDockTitle = isWordAudioPlayback
    ? selectedWordContext?.word.arabicWord || "Quran word"
    : `${surahName || `Surah ${surahNumber}`} ${surahNumber}:${currentPlayingVerse || 1}`;
  const audioDockSubtitle = isWordAudioPlayback
    ? `Word audio · Quran ${surahNumber}:${wordPlaybackVerse || currentVisibleVerse || 1}`
    : `${currentReciter.name} · ${audioStatusLabel}${audioDockTimerLabel}`;
  const audioProgressPercent = getMediaProgressPercent(
    audioProgress,
    transportState,
    34,
    18,
  );
  const quranCurrentSessionVerse =
    currentPlayingVerse || currentVisibleVerse || 1;
  const quranTotalVerses = VERSE_COUNTS[surahNumber - 1] || 1;
  const repeatRangeSafeStart = Math.min(
    quranTotalVerses,
    Math.max(1, repeatRangeStart),
  );
  const repeatRangeSafeEnd = Math.min(
    quranTotalVerses,
    Math.max(repeatRangeSafeStart, repeatRangeEnd),
  );
  const repeatRangeLength = Math.max(
    1,
    repeatRangeSafeEnd - repeatRangeSafeStart + 1,
  );
  const repeatRangeStartPercent =
    quranTotalVerses > 1
      ? ((repeatRangeSafeStart - 1) / (quranTotalVerses - 1)) * 100
      : 0;
  const repeatRangeWidthPercent =
    quranTotalVerses > 1
      ? ((repeatRangeSafeEnd - repeatRangeSafeStart) / (quranTotalVerses - 1)) *
        100
      : 100;
  const repeatRangeCurrentInside =
    quranCurrentSessionVerse >= repeatRangeSafeStart &&
    quranCurrentSessionVerse <= repeatRangeSafeEnd;
  const quranTextCacheLabel =
    quranTextCacheStatus === "offline"
      ? "Offline text"
      : quranTextCacheStatus === "online"
        ? "Text cached"
        : "Text not saved";
  const quranTextCacheBody =
    quranTextCacheStatus === "offline"
      ? `Using saved Quran text and translation. ${formatQuranTextCacheAge(quranTextCachedAt)}.`
      : quranTextCacheStatus === "online"
        ? `This surah text and translation are saved for offline reading. ${formatQuranTextCacheAge(quranTextCachedAt)}.`
        : "Open this surah online once to save the reading text for offline use.";
  const quranTextCacheColor =
    quranTextCacheStatus === "unavailable" ? theme.textMuted : theme.primary;

  const renderSettingsModal = () => (
    <Modal
      visible={settingsModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setSettingsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.settingsModalContent,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={styles.modalHandle}>
            <View
              style={[styles.handleBar, { backgroundColor: theme.textMuted }]}
            />
          </View>
          <View style={styles.modalHeader}>
            <ThemedText type="h4">Settings</ThemedText>
            <Pressable
              testID="button-close-settings"
              onPress={() => setSettingsModalVisible(false)}
            >
              <AppIcon name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.settingsTabs}>
            {(["language", "reading", "reciter", "audio"] as const).map(
              (tab) => {
                const isActive = settingsTab === tab;
                const icon =
                  tab === "language"
                    ? "globe"
                    : tab === "reading"
                      ? "moon"
                      : tab === "reciter"
                        ? "mic"
                        : "sliders";
                const label =
                  tab === "language"
                    ? "Language"
                    : tab === "reading"
                      ? "Read"
                      : tab === "reciter"
                        ? "Reciter"
                        : "Audio";
                return (
                  <Pressable
                    key={tab}
                    testID={
                      tab === "reading"
                        ? "settings-tab-reading"
                        : `settings-tab-${tab}`
                    }
                    style={[
                      styles.settingsTabBtn,
                      {
                        backgroundColor: isActive
                          ? `${theme.primary}15`
                          : "transparent",
                        borderColor: isActive
                          ? theme.primary
                          : theme.borderSubtle,
                      },
                    ]}
                    onPress={() => setSettingsTab(tab)}
                  >
                    <AppIcon
                      name={icon as any}
                      size={16}
                      color={isActive ? theme.primary : theme.textSecondary}
                    />
                    <ThemedText
                      type="caption"
                      style={{
                        color: isActive ? theme.primary : theme.textSecondary,
                        fontWeight: isActive ? "700" : "500",
                        marginLeft: 6,
                      }}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              },
            )}
          </View>

          <ScrollView
            style={styles.settingsScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {settingsTab === "language" ? (
              <View>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    marginBottom: Spacing.sm,
                  }}
                >
                  Select Translation Language
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textMuted,
                    marginBottom: Spacing.md,
                    fontSize: 11,
                  }}
                >
                  Arabic text always stays visible. This changes the verse
                  translation and word-by-word meanings.
                </ThemedText>
                {TRANSLATIONS.map((t) => {
                  const isSelected = t.id === translationId;
                  return (
                    <Pressable
                      key={t.id}
                      testID={`translation-option-${t.id}`}
                      style={[
                        styles.settingsRow,
                        {
                          backgroundColor: isSelected
                            ? `${theme.primary}10`
                            : "transparent",
                          borderColor: isSelected
                            ? theme.primary
                            : theme.borderSubtle,
                        },
                      ]}
                      onPress={() => handleTranslationChange(t.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <ThemedText
                            type="body"
                            style={{
                              color: isSelected ? theme.primary : theme.text,
                              fontWeight: isSelected ? "600" : "400",
                            }}
                          >
                            {t.language}
                          </ThemedText>
                          {t.rtl ? (
                            <View
                              style={[
                                styles.rtlBadge,
                                { backgroundColor: `${theme.textMuted}15` },
                              ]}
                            >
                              <ThemedText
                                type="caption"
                                style={{ color: theme.textMuted, fontSize: 9 }}
                              >
                                RTL
                              </ThemedText>
                            </View>
                          ) : null}
                        </View>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textSecondary, marginTop: 2 }}
                        >
                          {t.name}
                        </ThemedText>
                      </View>
                      {isSelected ? (
                        <AppIcon
                          name="check-circle"
                          size={20}
                          color={theme.primary}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : settingsTab === "reading" ? (
              <View>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    marginBottom: Spacing.sm,
                  }}
                >
                  Reading Comfort
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textMuted,
                    marginBottom: Spacing.md,
                    fontSize: 11,
                  }}
                >
                  Switch the reader surface for deep study, one-ayah focus, or
                  calm night reading without changing the Quran text.
                </ThemedText>
                <View
                  testID="quran-reading-comfort-presets"
                  style={styles.audioPresetGrid}
                >
                  {[
                    {
                      id: "balanced" as const,
                      title: "Balanced",
                      subtitle: "Arabic, translation, and word help",
                      icon: "columns" as const,
                    },
                    {
                      id: "ayah-focus" as const,
                      title: "Ayah focus",
                      subtitle: "Larger Arabic, fewer study layers",
                      icon: "maximize" as const,
                    },
                    {
                      id: "night-reading" as const,
                      title: "Night read",
                      subtitle: "Large type with a quieter surface",
                      icon: "moon" as const,
                    },
                  ].map((preset) => {
                    const isSelected = readingComfortPreset === preset.id;
                    const accent =
                      preset.id === "night-reading"
                        ? theme.scholar
                        : theme.primary;
                    return (
                      <Pressable
                        key={preset.id}
                        testID={`quran-reading-comfort-${preset.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={`${preset.title}. ${preset.subtitle}`}
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => applyReadingComfortPreset(preset.id)}
                        style={({ pressed }) => [
                          styles.audioPresetCard,
                          {
                            backgroundColor: isSelected
                              ? `${accent}16`
                              : `${accent}0B`,
                            borderColor: isSelected
                              ? `${accent}66`
                              : `${accent}24`,
                            opacity: pressed ? 0.72 : 1,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.audioPresetIcon,
                            { backgroundColor: `${accent}18` },
                          ]}
                        >
                          <AppIcon
                            name={preset.icon}
                            size={14}
                            color={accent}
                          />
                        </View>
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: theme.text, fontWeight: "900" }}
                        >
                          {preset.title}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{
                            color: theme.textMuted,
                            lineHeight: 15,
                            fontSize: 10,
                          }}
                        >
                          {preset.subtitle}
                        </ThemedText>
                        {isSelected ? (
                          <View
                            style={[
                              styles.readingComfortSelectedPill,
                              {
                                backgroundColor: `${accent}14`,
                                borderColor: `${accent}33`,
                              },
                            ]}
                          >
                            <AppIcon name="check" size={10} color={accent} />
                            <ThemedText
                              type="caption"
                              style={{
                                color: accent,
                                fontWeight: "900",
                                fontSize: 9,
                              }}
                            >
                              Active
                            </ThemedText>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                <View
                  testID="quran-reading-comfort-boundary"
                  style={[
                    styles.audioEndModePanel,
                    {
                      backgroundColor: `${theme.scholar}08`,
                      borderColor: `${theme.scholar}1F`,
                      marginTop: Spacing.md,
                    },
                  ]}
                >
                  <View style={styles.audioEndModeHeader}>
                    <View
                      style={[
                        styles.audioEndModeIcon,
                        { backgroundColor: `${theme.scholar}16` },
                      ]}
                    >
                      <AppIcon name="shield" size={14} color={theme.scholar} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        type="caption"
                        style={{
                          color: theme.scholar,
                          fontWeight: "900",
                          fontSize: 10,
                        }}
                      >
                        Reading comfort only
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary, marginTop: 2 }}
                      >
                        These presets change display layers only. Tafsir,
                        rulings, and personal circumstances still belong in
                        source-aware study or Scholar Review.
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            ) : settingsTab === "reciter" ? (
              <View>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    marginBottom: Spacing.sm,
                  }}
                >
                  Select Reciter
                </ThemedText>
                {ALL_RECITERS.map((r, index) => {
                  const isSelected = r.recitationId === reciterId;
                  const isLocked = !isPremium && index >= FREE_RECITER_COUNT;
                  return (
                    <Pressable
                      key={r.id}
                      testID={`reciter-option-${r.id}`}
                      style={[
                        styles.settingsRow,
                        {
                          backgroundColor: isSelected
                            ? `${theme.primary}10`
                            : "transparent",
                          borderColor: isSelected
                            ? theme.primary
                            : theme.borderSubtle,
                          opacity: isLocked ? 0.85 : 1,
                        },
                      ]}
                      onPress={() => {
                        if (isLocked) {
                          navigation.navigate("Subscription", {
                            initialTab: "premium",
                          });
                        } else {
                          handleReciterChange(r.recitationId);
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.reciterIcon,
                          {
                            backgroundColor: isSelected
                              ? `${theme.primary}20`
                              : `${theme.textMuted}15`,
                          },
                        ]}
                      >
                        <AppIcon
                          name={isLocked ? "lock" : "mic"}
                          size={16}
                          color={isSelected ? theme.primary : theme.textMuted}
                        />
                      </View>
                      <ThemedText
                        type="body"
                        style={{
                          color: isSelected ? theme.primary : theme.text,
                          fontWeight: isSelected ? "600" : "400",
                          flex: 1,
                        }}
                      >
                        {r.name}
                      </ThemedText>
                      {!isPremium && index >= FREE_RECITER_COUNT ? (
                        <PremiumBadge tier="premium" />
                      ) : null}
                      {isSelected ? (
                        <AppIcon
                          name="check-circle"
                          size={20}
                          color={theme.primary}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View>
                <View
                  style={[
                    styles.settingsSection,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <View style={styles.settingsSectionHeader}>
                    <AppIcon name="book" size={18} color={theme.primary} />
                    <ThemedText
                      type="body"
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                        marginLeft: Spacing.sm,
                        flex: 1,
                      }}
                    >
                      Word by Word
                    </ThemedText>
                    {!isPremium && surahNumber > FREE_WORD_BY_WORD_SURAHS ? (
                      <PremiumBadge tier="premium" />
                    ) : null}
                    <Switch
                      testID="switch-word-by-word"
                      value={showWordByWord}
                      onValueChange={handleWordByWordToggle}
                      trackColor={{
                        false: theme.switchTrack,
                        true: `${theme.primary}80`,
                      }}
                      thumbColor={
                        showWordByWord ? theme.primary : theme.surface
                      }
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginTop: 4 }}
                  >
                    {!isPremium && surahNumber > FREE_WORD_BY_WORD_SURAHS
                      ? `Free for first ${FREE_WORD_BY_WORD_SURAHS} surahs. Upgrade for all.`
                      : "Show each Arabic word with its individual meaning"}
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.settingsSection,
                    {
                      borderColor:
                        quranAudioDownload.downloaded >=
                          quranAudioDownload.total &&
                        quranAudioDownload.total > 0
                          ? `${theme.primary}45`
                          : theme.borderSubtle,
                      backgroundColor:
                        quranAudioDownload.downloaded > 0
                          ? `${theme.primary}07`
                          : "transparent",
                    },
                  ]}
                >
                  <View style={styles.settingsSectionHeader}>
                    <AppIcon
                      name="download-cloud"
                      size={18}
                      color={theme.primary}
                    />
                    <ThemedText
                      type="body"
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                        marginLeft: Spacing.sm,
                        flex: 1,
                      }}
                    >
                      Offline Audio Pack
                    </ThemedText>
                    {!isPremium ? <PremiumBadge tier="premium" /> : null}
                    {isPremium ? (
                      <View
                        style={[
                          styles.offlineStatusBadge,
                          {
                            backgroundColor: offlinePackComplete
                              ? `${theme.primary}18`
                              : offlinePackPartial ||
                                  quranAudioDownload.downloading
                                ? `${theme.scholar}14`
                                : `${theme.textMuted}10`,
                            borderColor: offlinePackComplete
                              ? `${theme.primary}42`
                              : offlinePackPartial ||
                                  quranAudioDownload.downloading
                                ? `${theme.scholar}42`
                                : theme.borderSubtle,
                          },
                        ]}
                      >
                        <AppIcon
                          name={
                            offlinePackComplete
                              ? "check-circle"
                              : quranAudioDownload.downloading
                                ? "loader"
                                : offlinePackPartial
                                  ? "download"
                                  : "cloud"
                          }
                          size={11}
                          color={
                            offlinePackComplete
                              ? theme.primary
                              : offlinePackPartial ||
                                  quranAudioDownload.downloading
                                ? theme.scholar
                                : theme.textMuted
                          }
                        />
                        <ThemedText
                          type="caption"
                          style={{
                            color: offlinePackComplete
                              ? theme.primary
                              : offlinePackPartial ||
                                  quranAudioDownload.downloading
                                ? theme.scholar
                                : theme.textMuted,
                            fontWeight: "900",
                            fontSize: 10,
                          }}
                        >
                          {offlinePackStatusLabel}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginTop: 4 }}
                  >
                    {isPremium
                      ? `${quranAudioDownload.downloaded}/${quranAudioDownload.total} ayahs saved · ${formatMediaBytes(quranAudioDownload.fileSize)} this surah${mediaStorageSummary ? ` · ${formatMediaBytes(mediaStorageSummary.totalBytes)} total offline` : ""}.`
                      : "Premium unlocks offline Quran audio, background playback, and travel-ready listening."}
                  </ThemedText>
                  <View style={styles.offlinePackMetaGrid}>
                    <View
                      style={[
                        styles.offlinePackMetaCard,
                        { borderColor: theme.borderSubtle },
                      ]}
                    >
                      <AppIcon
                        name="wifi-off"
                        size={14}
                        color={
                          offlinePackComplete ? theme.primary : theme.textMuted
                        }
                      />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, marginTop: 4 }}
                      >
                        Status
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{
                          color: offlinePackComplete
                            ? theme.primary
                            : theme.text,
                          fontWeight: "900",
                          marginTop: 2,
                        }}
                      >
                        {offlinePackStatusLabel}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.offlinePackMetaCard,
                        { borderColor: theme.borderSubtle },
                      ]}
                    >
                      <AppIcon name="mic" size={14} color={theme.scholar} />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, marginTop: 4 }}
                      >
                        Reciter
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{
                          color: theme.text,
                          fontWeight: "900",
                          marginTop: 2,
                        }}
                      >
                        {currentReciter.name}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.offlinePackMetaCard,
                        { borderColor: theme.borderSubtle },
                      ]}
                    >
                      <AppIcon
                        name="hard-drive"
                        size={14}
                        color={theme.primary}
                      />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, marginTop: 4 }}
                      >
                        Storage
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{
                          color: theme.text,
                          fontWeight: "900",
                          marginTop: 2,
                        }}
                      >
                        {formatMediaBytes(quranAudioDownload.fileSize)}
                      </ThemedText>
                    </View>
                  </View>
                  <MediaProgressBar
                    progress={offlinePackPercent}
                    color={theme.primary}
                    trackColor={`${theme.primary}14`}
                    style={{ marginTop: Spacing.md }}
                  />
                  <View
                    testID="quran-offline-reading-cache-card"
                    style={[
                      styles.offlineReadingCacheCard,
                      {
                        backgroundColor: `${quranTextCacheColor}0E`,
                        borderColor: `${quranTextCacheColor}34`,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.offlineReadingCacheIcon,
                        { backgroundColor: `${quranTextCacheColor}16` },
                      ]}
                    >
                      <AppIcon
                        name={
                          quranTextCacheStatus === "unavailable"
                            ? "wifi-off"
                            : "book-open"
                        }
                        size={15}
                        color={quranTextCacheColor}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <ThemedText
                        type="caption"
                        style={{
                          color: quranTextCacheColor,
                          fontWeight: "900",
                        }}
                      >
                        {quranTextCacheLabel}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={2}
                        style={{
                          color: theme.textMuted,
                          lineHeight: 17,
                          marginTop: 2,
                        }}
                      >
                        {quranTextCacheBody}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.speedGrid}>
                    <Pressable
                      testID="button-offline-pack-save"
                      style={[
                        styles.speedBtn,
                        {
                          borderColor: theme.primary,
                          backgroundColor: `${theme.primary}12`,
                          opacity:
                            quranAudioDownload.downloading ||
                            quranAudioDownload.deleting
                              ? 0.7
                              : 1,
                        },
                      ]}
                      onPress={handleDownloadQuranAudio}
                      disabled={
                        quranAudioDownload.downloading ||
                        quranAudioDownload.deleting
                      }
                    >
                      {quranAudioDownload.downloading ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <ThemedText
                          type="caption"
                          style={{ color: theme.primary, fontWeight: "800" }}
                        >
                          {quranAudioDownload.downloaded >=
                            quranAudioDownload.total &&
                          quranAudioDownload.total > 0
                            ? "Refresh pack"
                            : "Save surah"}
                        </ThemedText>
                      )}
                    </Pressable>
                    <Pressable
                      testID="button-offline-pack-save-study-range"
                      accessibilityRole="button"
                      accessibilityLabel={
                        repeatRangeEnabled
                          ? "Save this Quran repeat range for offline listening"
                          : "Save the next five Quran ayahs for offline listening"
                      }
                      style={[
                        styles.speedBtn,
                        {
                          borderColor: `${theme.scholar}55`,
                          backgroundColor: `${theme.scholar}12`,
                          opacity:
                            quranAudioDownload.downloading ||
                            quranAudioDownload.deleting
                              ? 0.7
                              : 1,
                        },
                      ]}
                      onPress={handleDownloadQuranStudyRangeAudio}
                      disabled={
                        quranAudioDownload.downloading ||
                        quranAudioDownload.deleting
                      }
                    >
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: theme.scholar, fontWeight: "800" }}
                      >
                        {repeatRangeEnabled ? "Save loop" : "Save next ayahs"}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      testID="button-offline-pack-remove"
                      style={[
                        styles.speedBtn,
                        {
                          borderColor:
                            quranAudioDownload.downloaded > 0
                              ? `${theme.error}55`
                              : theme.borderSubtle,
                          backgroundColor:
                            quranAudioDownload.downloaded > 0
                              ? `${theme.error}12`
                              : `${theme.textMuted}08`,
                          opacity:
                            quranAudioDownload.downloaded > 0 &&
                            !quranAudioDownload.downloading &&
                            !quranAudioDownload.deleting
                              ? 1
                              : 0.55,
                        },
                      ]}
                      onPress={handleDeleteQuranAudio}
                      disabled={
                        quranAudioDownload.downloaded <= 0 ||
                        quranAudioDownload.downloading ||
                        quranAudioDownload.deleting
                      }
                    >
                      {quranAudioDownload.deleting ? (
                        <ActivityIndicator size="small" color={theme.error} />
                      ) : (
                        <ThemedText
                          type="caption"
                          style={{
                            color:
                              quranAudioDownload.downloaded > 0
                                ? theme.error
                                : theme.textMuted,
                            fontWeight: "800",
                          }}
                        >
                          Remove pack
                        </ThemedText>
                      )}
                    </Pressable>
                  </View>
                </View>

                <View
                  style={[
                    styles.settingsSection,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <View style={styles.settingsSectionHeader}>
                    <AppIcon name="zap" size={18} color={theme.scholar} />
                    <ThemedText
                      type="body"
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                        marginLeft: Spacing.sm,
                        flex: 1,
                      }}
                    >
                      Listening Sessions
                    </ThemedText>
                    {!isPremium ? <PremiumBadge tier="premium" /> : null}
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginTop: 4 }}
                  >
                    Start a focused Quran session without adjusting every audio
                    control yourself.
                  </ThemedText>
                  <View style={styles.audioPresetGrid}>
                    {[
                      {
                        id: "surah" as const,
                        title: "Whole surah",
                        subtitle: "Play from here to the end",
                        icon: "book-open" as const,
                        locked: false,
                      },
                      {
                        id: "night" as const,
                        title: "Night listening",
                        subtitle: "2h fade-out, background ready",
                        icon: "moon" as const,
                        locked: !isPremium,
                      },
                      {
                        id: "memorise" as const,
                        title: "Memorise 5",
                        subtitle: `Loop ${currentPlayingVerse || currentVisibleVerse || 1}-${Math.min(VERSE_COUNTS[surahNumber - 1] || 1, (currentPlayingVerse || currentVisibleVerse || 1) + 4)}`,
                        icon: "repeat" as const,
                        locked: !isPremium,
                      },
                    ].map((preset) => (
                      <Pressable
                        key={preset.id}
                        testID={`quran-audio-preset-${preset.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={`${preset.title}. ${preset.subtitle}${
                          preset.locked ? ". Premium required." : ""
                        }`}
                        onPress={() => applyAudioSessionPreset(preset.id)}
                        style={({ pressed }) => [
                          styles.audioPresetCard,
                          {
                            backgroundColor:
                              preset.id === "surah"
                                ? `${theme.primary}0D`
                                : `${theme.scholar}0D`,
                            borderColor:
                              preset.id === "surah"
                                ? `${theme.primary}24`
                                : `${theme.scholar}26`,
                            opacity: pressed ? 0.72 : preset.locked ? 0.78 : 1,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.audioPresetIcon,
                            {
                              backgroundColor:
                                preset.id === "surah"
                                  ? `${theme.primary}15`
                                  : `${theme.scholar}16`,
                            },
                          ]}
                        >
                          <AppIcon
                            name={preset.locked ? "lock" : preset.icon}
                            size={14}
                            color={
                              preset.id === "surah"
                                ? theme.primary
                                : theme.scholar
                            }
                          />
                        </View>
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: theme.text, fontWeight: "900" }}
                        >
                          {preset.title}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{
                            color: theme.textMuted,
                            lineHeight: 15,
                            fontSize: 10,
                          }}
                        >
                          {preset.subtitle}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  <View
                    testID="quran-audio-end-mode-panel"
                    style={[
                      styles.audioEndModePanel,
                      {
                        backgroundColor: `${theme.primary}08`,
                        borderColor: `${theme.primary}1F`,
                      },
                    ]}
                  >
                    <View style={styles.audioEndModeHeader}>
                      <View
                        style={[
                          styles.audioEndModeIcon,
                          { backgroundColor: `${theme.primary}16` },
                        ]}
                      >
                        <AppIcon name="flag" size={14} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText
                          type="caption"
                          style={{
                            color: theme.primary,
                            fontWeight: "900",
                            letterSpacing: 0.5,
                            textTransform: "uppercase",
                          }}
                        >
                          Session ending
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textSecondary, marginTop: 2 }}
                        >
                          Choose how this recitation should finish.
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.audioEndModeGrid}>
                      {QURAN_AUDIO_END_MODE_OPTIONS.map((option) => {
                        const active = audioEndMode === option.id;
                        const locked = option.id === "timer" && !isPremium;
                        return (
                          <Pressable
                            key={option.id}
                            testID={`quran-audio-end-mode-${option.id}`}
                            accessibilityRole="button"
                            accessibilityLabel={`${option.title}. ${option.subtitle}${
                              locked ? ". Premium required." : ""
                            }`}
                            onPress={() => handleAudioEndModeSelect(option.id)}
                            style={({ pressed }) => [
                              styles.audioEndModeOption,
                              {
                                backgroundColor: active
                                  ? `${theme.primary}16`
                                  : `${theme.textMuted}08`,
                                borderColor: active
                                  ? `${theme.primary}44`
                                  : theme.borderSubtle,
                                opacity: pressed ? 0.72 : locked ? 0.72 : 1,
                              },
                            ]}
                          >
                            <AppIcon
                              name={locked ? "lock" : option.icon}
                              size={13}
                              color={active ? theme.primary : theme.textMuted}
                            />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <ThemedText
                                type="caption"
                                numberOfLines={1}
                                style={{
                                  color: active ? theme.primary : theme.text,
                                  fontWeight: "900",
                                }}
                              >
                                {option.title}
                              </ThemedText>
                              <ThemedText
                                type="caption"
                                numberOfLines={1}
                                style={{
                                  color: theme.textMuted,
                                  fontSize: 10,
                                  marginTop: 1,
                                }}
                              >
                                {option.subtitle}
                              </ThemedText>
                            </View>
                            {active ? (
                              <AppIcon
                                name="check-circle"
                                size={13}
                                color={theme.primary}
                              />
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>

                <View
                  style={[
                    styles.settingsSection,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <View style={styles.settingsSectionHeader}>
                    <AppIcon name="clock" size={18} color={theme.scholar} />
                    <ThemedText
                      type="body"
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                        marginLeft: Spacing.sm,
                        flex: 1,
                      }}
                    >
                      Sleep Timer
                    </ThemedText>
                    {!isPremium ? <PremiumBadge tier="premium" /> : null}
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginTop: 4 }}
                  >
                    {isPremium
                      ? "Choose a fade-out timer, or use No limit to keep recitation playing until you stop it."
                      : "No limit is available to everyone. Premium unlocks timed fades, background playback, and offline listening."}
                  </ThemedText>
                  <Pressable
                    testID="sleep-timer-option-0"
                    accessibilityRole="button"
                    accessibilityLabel="Set Quran audio to no limit so recitation keeps playing until you stop it"
                    onPress={() => handleSleepTimerSelect(0)}
                    style={({ pressed }) => [
                      styles.sleepTimerContinuousCard,
                      {
                        backgroundColor:
                          sleepTimerMinutes === 0
                            ? `${theme.primary}16`
                            : `${theme.textMuted}08`,
                        borderColor:
                          sleepTimerMinutes === 0
                            ? `${theme.primary}42`
                            : theme.borderSubtle,
                        opacity: pressed ? 0.78 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.sleepTimerContinuousIcon,
                        {
                          backgroundColor:
                            sleepTimerMinutes === 0
                              ? `${theme.primary}18`
                              : `${theme.textMuted}12`,
                        },
                      ]}
                    >
                      <AppIcon
                        name="play-circle"
                        size={18}
                        color={
                          sleepTimerMinutes === 0
                            ? theme.primary
                            : theme.textMuted
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        type="body"
                        style={{
                          color:
                            sleepTimerMinutes === 0
                              ? theme.primary
                              : theme.text,
                          fontWeight: "800",
                        }}
                      >
                        No limit
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary, marginTop: 2 }}
                      >
                        Keep Quran audio playing until you stop it yourself.
                      </ThemedText>
                    </View>
                    {sleepTimerMinutes === 0 ? (
                      <AppIcon
                        name="check-circle"
                        size={18}
                        color={theme.primary}
                      />
                    ) : null}
                  </Pressable>
                  <View style={styles.speedGrid}>
                    {QURAN_SLEEP_TIMER_OPTIONS.filter(
                      (minutes) => minutes > 0,
                    ).map((minutes) => {
                      const isActive = sleepTimerMinutes === minutes;
                      return (
                        <Pressable
                          key={minutes}
                          testID={`sleep-timer-option-${minutes}`}
                          style={[
                            styles.speedBtn,
                            {
                              backgroundColor: isActive
                                ? theme.scholar
                                : `${theme.textMuted}10`,
                              borderColor: isActive
                                ? theme.scholar
                                : theme.borderSubtle,
                              opacity: !isPremium ? 0.75 : 1,
                            },
                          ]}
                          accessibilityLabel={
                            minutes <= 0
                              ? "Keep Quran recitation playing until you stop it"
                              : `Set Quran audio sleep timer to ${formatMediaSleepTimer(minutes)}`
                          }
                          onPress={() => handleSleepTimerSelect(minutes)}
                        >
                          {!isPremium && minutes > 0 ? (
                            <AppIcon
                              name="lock"
                              size={10}
                              color={theme.textMuted}
                            />
                          ) : null}
                          <ThemedText
                            type="caption"
                            style={{
                              color: isActive
                                ? theme.primaryForeground
                                : minutes === 0
                                  ? theme.scholar
                                  : theme.text,
                              fontWeight: isActive ? "800" : "600",
                            }}
                          >
                            {formatMediaSleepTimer(minutes)}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View
                    testID="quran-custom-sleep-timer-stepper"
                    style={[
                      styles.sleepTimerStepperCard,
                      {
                        backgroundColor: `${theme.textMuted}08`,
                        borderColor:
                          sleepTimerMinutes > 0 && isPremium
                            ? `${theme.scholar}55`
                            : theme.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.sleepTimerStepperCopy}>
                      <ThemedText
                        type="caption"
                        style={{
                          color: theme.scholar,
                          fontWeight: "900",
                          letterSpacing: 0.4,
                          textTransform: "uppercase",
                        }}
                      >
                        Custom fade
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary, marginTop: 2 }}
                      >
                        Fine-tune in 5 minute steps up to 12 hours, or keep No
                        limit for all-night recitation.
                      </ThemedText>
                    </View>
                    <View style={styles.sleepTimerStepperControls}>
                      <Pressable
                        testID="button-quran-sleep-timer-minus"
                        accessibilityRole="button"
                        accessibilityLabel="Reduce Quran sleep timer by five minutes"
                        onPress={() => handleSleepTimerAdjust(-1)}
                        style={({ pressed }) => [
                          styles.sleepTimerStepperButton,
                          {
                            borderColor: theme.borderSubtle,
                            backgroundColor: `${theme.surfaceElevated}CC`,
                            opacity: pressed ? 0.76 : !isPremium ? 0.7 : 1,
                          },
                        ]}
                      >
                        <AppIcon
                          name={isPremium ? "minus" : "lock"}
                          size={16}
                          color={theme.text}
                        />
                      </Pressable>
                      <View style={styles.sleepTimerStepperValue}>
                        <ThemedText
                          type="body"
                          style={{ color: theme.text, fontWeight: "900" }}
                        >
                          {sleepTimerMinutes > 0
                            ? formatMediaSleepTimer(sleepTimerMinutes)
                            : "Until stopped"}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textMuted, marginTop: 1 }}
                        >
                          {sleepTimerMinutes > 0 ? "Timed fade" : "Continuous"}
                        </ThemedText>
                      </View>
                      <Pressable
                        testID="button-quran-sleep-timer-plus"
                        accessibilityRole="button"
                        accessibilityLabel="Increase Quran sleep timer by five minutes"
                        onPress={() => handleSleepTimerAdjust(1)}
                        style={({ pressed }) => [
                          styles.sleepTimerStepperButton,
                          {
                            borderColor: theme.borderSubtle,
                            backgroundColor: `${theme.surfaceElevated}CC`,
                            opacity: pressed ? 0.76 : !isPremium ? 0.7 : 1,
                          },
                        ]}
                      >
                        <AppIcon
                          name={isPremium ? "plus" : "lock"}
                          size={16}
                          color={theme.text}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View
                  style={[
                    styles.settingsSection,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <View style={styles.settingsSectionHeader}>
                    <AppIcon name="type" size={18} color={theme.primary} />
                    <ThemedText
                      type="body"
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                        marginLeft: Spacing.sm,
                        flex: 1,
                      }}
                    >
                      Transliteration
                    </ThemedText>
                    <Switch
                      testID="switch-transliteration"
                      value={showTransliteration}
                      onValueChange={handleTransliterationToggle}
                      trackColor={{
                        false: theme.switchTrack,
                        true: `${theme.primary}80`,
                      }}
                      thumbColor={
                        showTransliteration ? theme.primary : theme.surface
                      }
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginTop: 4 }}
                  >
                    Show phonetic pronunciation in English letters
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.settingsSection,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <View style={styles.settingsSectionHeader}>
                    <AppIcon
                      name="fast-forward"
                      size={18}
                      color={theme.primary}
                    />
                    <ThemedText
                      type="body"
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                        marginLeft: Spacing.sm,
                        flex: 1,
                      }}
                    >
                      Playback Speed
                    </ThemedText>
                    {!isPremium ? <PremiumBadge tier="premium" /> : null}
                  </View>
                  <View style={styles.speedGrid}>
                    {SPEED_OPTIONS.map((opt) => {
                      const isActive = playbackSpeed === opt.value;
                      const isLocked = !isPremium && opt.value !== 1.0;
                      return (
                        <Pressable
                          key={opt.value}
                          testID={`speed-option-${opt.value}`}
                          style={[
                            styles.speedBtn,
                            {
                              backgroundColor: isActive
                                ? theme.primary
                                : `${theme.textMuted}10`,
                              borderColor: isActive
                                ? theme.primary
                                : theme.borderSubtle,
                              opacity: isLocked ? 0.75 : 1,
                            },
                          ]}
                          onPress={() => {
                            if (isLocked) {
                              navigation.navigate("Subscription", {
                                initialTab: "premium",
                              });
                            } else {
                              handleSpeedChange(opt.value);
                            }
                          }}
                        >
                          {isLocked ? (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <AppIcon
                                name="lock"
                                size={10}
                                color={theme.textMuted}
                              />
                              <ThemedText
                                type="caption"
                                style={{
                                  color: theme.textMuted,
                                  fontWeight: "500",
                                }}
                              >
                                {opt.label}
                              </ThemedText>
                            </View>
                          ) : (
                            <ThemedText
                              type="caption"
                              style={{
                                color: isActive
                                  ? theme.primaryForeground
                                  : theme.text,
                                fontWeight: isActive ? "700" : "500",
                              }}
                            >
                              {opt.label}
                            </ThemedText>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View
                  style={[
                    styles.settingsSection,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <View style={styles.settingsSectionHeader}>
                    <AppIcon name="repeat" size={18} color={theme.primary} />
                    <ThemedText
                      type="body"
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                        marginLeft: Spacing.sm,
                        flex: 1,
                      }}
                    >
                      Auto-Advance
                    </ThemedText>
                    <Switch
                      testID="switch-auto-advance"
                      value={autoAdvance}
                      onValueChange={handleAutoAdvanceToggle}
                      trackColor={{
                        false: theme.switchTrack,
                        true: `${theme.primary}80`,
                      }}
                      thumbColor={autoAdvance ? theme.primary : theme.surface}
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginTop: 4 }}
                  >
                    Automatically play the next verse when current verse
                    finishes
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.settingsSection,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <View style={styles.settingsSectionHeader}>
                    <AppIcon name="rotate-cw" size={18} color={theme.primary} />
                    <ThemedText
                      type="body"
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                        marginLeft: Spacing.sm,
                        flex: 1,
                      }}
                    >
                      Repeat Current Ayah
                    </ThemedText>
                    <Switch
                      testID="switch-repeat-ayah"
                      value={repeatVerse}
                      onValueChange={handleRepeatVerseToggle}
                      trackColor={{
                        false: theme.switchTrack,
                        true: `${theme.primary}80`,
                      }}
                      thumbColor={repeatVerse ? theme.primary : theme.surface}
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginTop: 4 }}
                  >
                    Loop one ayah for memorisation, shadowing, or careful
                    recitation practice.
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.settingsSection,
                    {
                      borderColor: repeatRangeEnabled
                        ? `${theme.scholar}50`
                        : theme.borderSubtle,
                      backgroundColor: repeatRangeEnabled
                        ? `${theme.scholar}08`
                        : "transparent",
                    },
                  ]}
                >
                  <View style={styles.settingsSectionHeader}>
                    <AppIcon name="shuffle" size={18} color={theme.scholar} />
                    <ThemedText
                      type="body"
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                        marginLeft: Spacing.sm,
                        flex: 1,
                      }}
                    >
                      Loop Range
                    </ThemedText>
                    {!isPremium ? <PremiumBadge tier="premium" /> : null}
                    <Switch
                      testID="switch-repeat-range"
                      value={repeatRangeEnabled && isPremium}
                      onValueChange={handleRepeatRangeToggle}
                      trackColor={{
                        false: theme.switchTrack,
                        true: `${theme.scholar}80`,
                      }}
                      thumbColor={
                        repeatRangeEnabled ? theme.scholar : theme.surface
                      }
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginTop: 4 }}
                  >
                    {isPremium
                      ? `Loop ayahs ${repeatRangeStart}-${repeatRangeEnd} for memorisation, night listening, or revision.`
                      : "Premium unlocks repeat ranges for memorisation and focused listening."}
                  </ThemedText>
                  <View
                    testID="quran-repeat-range-loop-builder"
                    style={[
                      styles.repeatRangeCoachPanel,
                      {
                        borderColor: `${theme.scholar}24`,
                        backgroundColor: `${theme.scholar}0A`,
                      },
                    ]}
                  >
                    <View style={styles.repeatRangeCoachHeader}>
                      <View style={styles.repeatRangeCoachIcon}>
                        <AppIcon
                          name="repeat"
                          size={16}
                          color={theme.scholar}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <ThemedText
                          type="caption"
                          style={{
                            color: theme.scholar,
                            fontWeight: "900",
                            letterSpacing: 0.6,
                            textTransform: "uppercase",
                          }}
                        >
                          Loop builder
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{ color: theme.textSecondary, marginTop: 2 }}
                        >
                          {repeatRangeCurrentInside
                            ? `Current ayah is inside this ${repeatRangeLength}-ayah loop.`
                            : `Current ayah ${quranCurrentSessionVerse} is outside the saved loop.`}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.repeatRangeLengthBadge,
                          {
                            borderColor: `${theme.scholar}35`,
                            backgroundColor: `${theme.scholar}14`,
                          },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          style={{ color: theme.scholar, fontWeight: "900" }}
                        >
                          {repeatRangeLength} ayah
                          {repeatRangeLength === 1 ? "" : "s"}
                        </ThemedText>
                      </View>
                    </View>
                    <View
                      accessibilityLabel={`Repeat range from ayah ${repeatRangeSafeStart} to ${repeatRangeSafeEnd} of ${quranTotalVerses}`}
                      style={[
                        styles.repeatRangeTrack,
                        { backgroundColor: `${theme.textMuted}18` },
                      ]}
                    >
                      <View
                        style={[
                          styles.repeatRangeTrackFill,
                          {
                            left: `${repeatRangeStartPercent}%`,
                            width: `${Math.max(4, repeatRangeWidthPercent)}%`,
                            backgroundColor: theme.scholar,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.repeatRangeCoachMeta}>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, fontWeight: "700" }}
                      >
                        Start {repeatRangeSafeStart}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, fontWeight: "700" }}
                      >
                        Current {quranCurrentSessionVerse}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, fontWeight: "700" }}
                      >
                        End {repeatRangeSafeEnd}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.speedGrid}>
                    <Pressable
                      testID="button-repeat-range-start"
                      style={[
                        styles.speedBtn,
                        {
                          borderColor: theme.borderSubtle,
                          backgroundColor: `${theme.textMuted}10`,
                          opacity: isPremium ? 1 : 0.75,
                        },
                      ]}
                      onPress={() => setRepeatRangePoint("start")}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: theme.text, fontWeight: "700" }}
                      >
                        Start here · {quranCurrentSessionVerse}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      testID="button-repeat-range-end"
                      style={[
                        styles.speedBtn,
                        {
                          borderColor: theme.borderSubtle,
                          backgroundColor: `${theme.textMuted}10`,
                          opacity: isPremium ? 1 : 0.75,
                        },
                      ]}
                      onPress={() => setRepeatRangePoint("end")}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: theme.text, fontWeight: "700" }}
                      >
                        End here · {quranCurrentSessionVerse}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      testID="button-repeat-range-surah"
                      style={[
                        styles.speedBtn,
                        {
                          borderColor: theme.scholar,
                          backgroundColor: `${theme.scholar}12`,
                          opacity: isPremium ? 1 : 0.75,
                        },
                      ]}
                      onPress={setRepeatRangeToSurah}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: theme.scholar, fontWeight: "800" }}
                      >
                        Whole surah
                      </ThemedText>
                    </Pressable>
                  </View>
                  <View
                    testID="quran-repeat-range-presets"
                    style={styles.repeatPresetGrid}
                  >
                    {[
                      {
                        length: 3 as const,
                        title: "3 ayahs",
                        subtitle: "Warm-up loop",
                        icon: "target" as const,
                      },
                      {
                        length: 5 as const,
                        title: "5 ayahs",
                        subtitle: "Hifz set",
                        icon: "repeat" as const,
                      },
                      {
                        length: 10 as const,
                        title: "10 ayahs",
                        subtitle: "Page flow",
                        icon: "layers" as const,
                      },
                    ].map((preset) => (
                      <Pressable
                        key={preset.length}
                        testID={`button-repeat-range-preset-${preset.length}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Loop ${preset.title} from the current ayah. ${preset.subtitle}.`}
                        onPress={() => setRepeatRangePreset(preset.length)}
                        style={({ pressed }) => [
                          styles.repeatPresetCard,
                          {
                            backgroundColor: `${theme.scholar}0D`,
                            borderColor: `${theme.scholar}24`,
                            opacity: pressed ? 0.72 : isPremium ? 1 : 0.75,
                          },
                        ]}
                      >
                        <AppIcon
                          name={isPremium ? preset.icon : "lock"}
                          size={14}
                          color={theme.scholar}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.text, fontWeight: "900" }}
                          >
                            {preset.title}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.textMuted, fontSize: 10 }}
                          >
                            {preset.subtitle}
                          </ThemedText>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View
                  style={[
                    styles.settingsSection,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <View style={styles.settingsSectionHeader}>
                    <AppIcon name="book-open" size={18} color={theme.primary} />
                    <ThemedText
                      type="body"
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                        marginLeft: Spacing.sm,
                        flex: 1,
                      }}
                    >
                      Tajweed Colors
                    </ThemedText>
                    {!isPremium ? <PremiumBadge tier="premium" /> : null}
                    <Switch
                      testID="switch-tajweed"
                      value={tajweedEnabled}
                      onValueChange={handleTajweedToggle}
                      trackColor={{
                        false: theme.switchTrack,
                        true: `${theme.primary}80`,
                      }}
                      thumbColor={
                        tajweedEnabled ? theme.primary : theme.surface
                      }
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginTop: 4 }}
                  >
                    {!isPremium
                      ? "Upgrade to Premium for color-coded tajweed rules"
                      : "Show color-coded tajweed rules on Arabic text"}
                  </ThemedText>
                  {tajweedEnabled ? (
                    <View style={styles.tajweedLegend}>
                      {Object.entries(TAJWEED_COLORS)
                        .slice(0, 8)
                        .map(([key, color]) => (
                          <View key={key} style={styles.tajweedLegendItem}>
                            <View
                              style={[
                                styles.tajweedColorDot,
                                { backgroundColor: color },
                              ]}
                            />
                            <ThemedText
                              type="caption"
                              style={{
                                color: theme.textSecondary,
                                fontSize: 10,
                              }}
                            >
                              {key.replace(/_/g, " ")}
                            </ThemedText>
                          </View>
                        ))}
                    </View>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.settingsSection,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <View style={styles.settingsSectionHeader}>
                    <AppIcon name="type" size={18} color={theme.primary} />
                    <ThemedText
                      type="body"
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                        marginLeft: Spacing.sm,
                        flex: 1,
                      }}
                    >
                      Font Size
                    </ThemedText>
                  </View>
                  <View style={styles.fontSizeRow}>
                    <Pressable
                      testID="button-font-decrease-modal"
                      style={[
                        styles.fontBtnLarge,
                        {
                          backgroundColor: `${theme.textMuted}10`,
                          borderColor: theme.borderSubtle,
                        },
                      ]}
                      onPress={() => setFontSize((s) => Math.max(16, s - 2))}
                    >
                      <AppIcon name="minus" size={18} color={theme.text} />
                    </Pressable>
                    <ThemedText
                      type="body"
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                        minWidth: 40,
                        textAlign: "center",
                      }}
                    >
                      {fontSize}
                    </ThemedText>
                    <Pressable
                      testID="button-font-increase-modal"
                      style={[
                        styles.fontBtnLarge,
                        {
                          backgroundColor: `${theme.textMuted}10`,
                          borderColor: theme.borderSubtle,
                        },
                      ]}
                      onPress={() => setFontSize((s) => Math.min(40, s + 2))}
                    >
                      <AppIcon name="plus" size={18} color={theme.text} />
                    </Pressable>
                  </View>
                </View>

                <View
                  style={[
                    styles.settingsSection,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <View style={styles.settingsSectionHeader}>
                    <AppIcon name="feather" size={18} color={theme.primary} />
                    <ThemedText
                      type="body"
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                        marginLeft: Spacing.sm,
                        flex: 1,
                      }}
                    >
                      Arabic Font
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.textSecondary,
                      marginTop: 4,
                      marginBottom: Spacing.sm,
                    }}
                  >
                    Choose the font style for Quranic Arabic text
                  </ThemedText>
                  {ARABIC_FONTS.map((font) => {
                    const isSelected = arabicFont === font.id;
                    return (
                      <Pressable
                        key={font.id}
                        testID={`font-option-${font.id}`}
                        style={[
                          styles.settingsRow,
                          {
                            backgroundColor: isSelected
                              ? `${theme.primary}10`
                              : "transparent",
                            borderColor: isSelected
                              ? theme.primary
                              : theme.borderSubtle,
                          },
                        ]}
                        onPress={() => handleArabicFontChange(font.id)}
                      >
                        <View style={{ flex: 1 }}>
                          <ThemedText
                            type="body"
                            style={{
                              color: isSelected ? theme.primary : theme.text,
                              fontWeight: isSelected ? "600" : "400",
                            }}
                          >
                            {font.label}
                          </ThemedText>
                          <Text
                            style={{
                              fontFamily: font.fontFamily,
                              fontSize: 22,
                              lineHeight: 36,
                              color: isSelected
                                ? theme.primary
                                : theme.textSecondary,
                              marginTop: 4,
                              textAlign: "right",
                              writingDirection: "rtl",
                            }}
                          >
                            {font.preview}
                          </Text>
                        </View>
                        {isSelected ? (
                          <AppIcon
                            name="check-circle"
                            size={20}
                            color={theme.primary}
                            style={{ marginLeft: Spacing.sm }}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderWordIntelligenceSheet = () => {
    const ctx = selectedWordContext;
    const word = ctx?.word;
    const verse = ctx?.verse;
    const normalizedWord =
      word?.normalizedArabicWord ||
      normalizeArabicSearchTerm(word?.arabicWord || "");
    const wordLocation =
      word?.location ||
      (verse && word
        ? `${surahNumber}:${verse.verseNumber}:${word.position}`
        : null);
    const hasWordAudio = Boolean(quranWordAudioUrl(word?.audioUrl));
    const wordLearningPlan = buildQuranWordLearningPlan({
      mastery: wordMastery,
      arabicWord: word?.arabicWord,
      translationWord: word?.translationWord,
      transliterationWord: word?.transliterationWord,
      occurrenceCount: wordOccurrences.length,
      hasAudio: hasWordAudio,
    });
    const wordPracticeIcons: Record<
      (typeof wordLearningPlan.practiceSteps)[number]["id"],
      AppIconName
    > = {
      listen: hasWordAudio ? "volume-2" : "play-circle",
      meaning: "book-open",
      find: "search",
      review: wordMastery?.saved ? "repeat" : "plus-circle",
    };

    return (
      <Modal
        visible={wordSheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setWordSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.sheetBackdropTouchable}
            onPress={() => setWordSheetVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close word intelligence"
          />
          <View
            style={[
              styles.wordSheet,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: `${theme.primary}24`,
                paddingBottom: insets.bottom + Spacing.lg,
              },
            ]}
          >
            <View style={styles.modalHandle}>
              <View
                style={[styles.handleBar, { backgroundColor: theme.textMuted }]}
              />
            </View>
            <LinearGradient
              colors={[`${theme.primary}18`, "transparent"]}
              style={styles.ayahStudySheetGlow}
            />
            <View style={styles.wordSheetHeader}>
              <View
                style={[
                  styles.wordSheetArabicBadge,
                  { backgroundColor: `${theme.primary}14` },
                ]}
              >
                <Text
                  style={[
                    styles.wordSheetArabic,
                    {
                      color: theme.text,
                      fontFamily: getArabicFontFamily(),
                    },
                  ]}
                >
                  {word?.arabicWord || "-"}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText
                  type="caption"
                  style={[styles.nurAiGuideEyebrow, { color: theme.primary }]}
                >
                  Word intelligence
                </ThemedText>
                <ThemedText
                  type="h4"
                  numberOfLines={1}
                  style={{ color: theme.text }}
                >
                  {word?.translationWord || "Quran word"}
                </ThemedText>
                {word?.transliterationWord ? (
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    {word.transliterationWord}
                  </ThemedText>
                ) : null}
              </View>
              <Pressable
                onPress={() => setWordSheetVisible(false)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.sheetCloseButton,
                  { backgroundColor: `${theme.textMuted}12` },
                  pressed ? { opacity: 0.7 } : null,
                ]}
              >
                <AppIcon name="x" size={18} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.wordSheetScrollContent}
            >
              <View style={styles.wordMetaRow}>
                {wordLocation ? (
                  <View
                    style={[
                      styles.wordMetaPill,
                      {
                        backgroundColor: `${theme.primary}10`,
                        borderColor: `${theme.primary}25`,
                      },
                    ]}
                  >
                    <AppIcon name="map-pin" size={11} color={theme.primary} />
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.primary, fontWeight: "800" }}
                    >
                      {wordLocation}
                    </ThemedText>
                  </View>
                ) : null}
                {normalizedWord && normalizedWord !== word?.arabicWord ? (
                  <View
                    style={[
                      styles.wordMetaPill,
                      {
                        backgroundColor: `${theme.scholar}10`,
                        borderColor: `${theme.scholar}25`,
                      },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.scholar,
                        fontWeight: "900",
                        writingDirection: "rtl",
                      }}
                    >
                      {normalizedWord}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              <View
                testID="quran-word-learning-compass"
                style={[
                  styles.wordLearningCompass,
                  {
                    backgroundColor: `${theme.primary}0C`,
                    borderColor: `${theme.primary}24`,
                  },
                ]}
              >
                <View style={styles.wordLearningCompassTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.primary, fontWeight: "900" }}
                    >
                      {wordLearningPlan.statusLabel}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={3}
                      style={{
                        color: theme.textSecondary,
                        lineHeight: 18,
                        marginTop: 3,
                      }}
                    >
                      {wordLearningPlan.statusBody}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.wordReviewBadge,
                      {
                        backgroundColor: wordLearningPlan.dueNow
                          ? `${theme.scholar}18`
                          : `${theme.primary}16`,
                        borderColor: wordLearningPlan.dueNow
                          ? `${theme.scholar}42`
                          : `${theme.primary}34`,
                      },
                    ]}
                  >
                    <AppIcon
                      name={wordLearningPlan.dueNow ? "zap" : "clock"}
                      size={13}
                      color={
                        wordLearningPlan.dueNow ? theme.scholar : theme.primary
                      }
                    />
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{
                        color: wordLearningPlan.dueNow
                          ? theme.scholar
                          : theme.primary,
                        fontWeight: "900",
                        fontSize: 10,
                      }}
                    >
                      {wordLearningPlan.nextReviewLabel}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.wordLearningProgressTrack}>
                  <View
                    style={[
                      styles.wordLearningProgressFill,
                      {
                        width: `${wordLearningPlan.masteryPercent}%`,
                        backgroundColor: wordMastery?.saved
                          ? theme.primary
                          : theme.scholar,
                      },
                    ]}
                  />
                </View>
                <View style={styles.wordPracticeRail}>
                  {wordLearningPlan.practiceSteps.map((step) => (
                    <View
                      key={step.id}
                      testID={`quran-word-practice-step-${step.id}`}
                      style={[
                        styles.wordPracticeStep,
                        {
                          backgroundColor: `${theme.surfaceGlass}`,
                          borderColor: theme.borderSubtle,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.wordPracticeStepIcon,
                          {
                            backgroundColor:
                              step.id === "review"
                                ? `${theme.scholar}16`
                                : `${theme.primary}12`,
                          },
                        ]}
                      >
                        <AppIcon
                          name={wordPracticeIcons[step.id]}
                          size={12}
                          color={
                            step.id === "review" ? theme.scholar : theme.primary
                          }
                        />
                      </View>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: theme.text, fontWeight: "900" }}
                      >
                        {step.title}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>

              <View
                style={[
                  styles.wordMasteryPanel,
                  {
                    backgroundColor: wordMastery?.saved
                      ? `${theme.primary}10`
                      : `${theme.scholar}0D`,
                    borderColor: wordMastery?.saved
                      ? `${theme.primary}28`
                      : `${theme.scholar}24`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.wordMasteryIcon,
                    {
                      backgroundColor: wordMastery?.saved
                        ? `${theme.primary}18`
                        : `${theme.scholar}16`,
                    },
                  ]}
                >
                  <AppIcon
                    name={wordMastery?.saved ? "check-circle" : "target"}
                    size={16}
                    color={wordMastery?.saved ? theme.primary : theme.scholar}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText
                    type="caption"
                    style={{
                      color: wordMastery?.saved ? theme.primary : theme.scholar,
                      fontWeight: "900",
                    }}
                  >
                    {wordMastery?.saved
                      ? "Saved to your Quran words"
                      : "Ready to learn"}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textSecondary, lineHeight: 18 }}
                  >
                    {wordMastery?.saved
                      ? `${wordMastery.reviewCount} review${wordMastery.reviewCount === 1 ? "" : "s"} logged. ${wordMastery.sameNormalizedWordCount} saved match${wordMastery.sameNormalizedWordCount === 1 ? "" : "es"} with this normalized form.`
                      : "Save this word, hear it in context, then look for where it appears elsewhere in Quran."}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.wordInsightGrid}>
                <View
                  style={[
                    styles.wordInsightCard,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <AppIcon
                    name={hasWordAudio ? "volume-2" : "headphones"}
                    size={15}
                    color={theme.primary}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, lineHeight: 18 }}
                  >
                    {hasWordAudio
                      ? "Play this word, then listen to the ayah so the meaning stays in context."
                      : "Word audio is not available here. Listen to the full ayah and repeat the word in context."}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.wordInsightCard,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <AppIcon name="shield" size={15} color={theme.scholar} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, lineHeight: 18 }}
                  >
                    Root and morphology are not guessed. NurAI shows them only
                    when a verified morphology source is bundled.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.wordActionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.wordActionButton,
                    {
                      backgroundColor: `${theme.primary}14`,
                      borderColor: `${theme.primary}30`,
                    },
                    pressed ? { opacity: 0.76 } : null,
                  ]}
                  onPress={handleLearnWord}
                >
                  <AppIcon name="plus-circle" size={15} color={theme.primary} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "900" }}
                  >
                    {wordMastery?.saved ? "Review word" : "Learn word"}
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.wordActionButton,
                    {
                      backgroundColor: `${theme.scholar}12`,
                      borderColor: `${theme.scholar}28`,
                    },
                    pressed ? { opacity: 0.76 } : null,
                  ]}
                  onPress={() => {
                    setWordSheetVisible(false);
                    runAIForVerse(verse?.verseNumber, "words");
                  }}
                >
                  <NurAILogoMark
                    size={16}
                    borderRadius={5}
                    color={theme.scholar}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "900" }}
                  >
                    Explain word
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.wordActionButton,
                    {
                      backgroundColor: `${theme.primary}10`,
                      borderColor: `${theme.primary}25`,
                    },
                    pressed ? { opacity: 0.76 } : null,
                  ]}
                  onPress={
                    hasWordAudio
                      ? handlePlayWordAudio
                      : () => {
                          setWordSheetVisible(false);
                          if (verse) playVerse(verse.verseNumber);
                        }
                  }
                >
                  <AppIcon
                    name={hasWordAudio ? "volume-2" : "play"}
                    size={15}
                    color={theme.primary}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "900" }}
                  >
                    {hasWordAudio ? "Hear word" : "Play ayah"}
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.wordOccurrencesBlock}>
                <View style={styles.wordOccurrencesHeader}>
                  <View>
                    <ThemedText
                      type="caption"
                      style={[
                        styles.nurAiGuideEyebrow,
                        { color: theme.textMuted },
                      ]}
                    >
                      Appears in Quran
                    </ThemedText>
                    {wordOccurrences.length > 0 ? (
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, fontSize: 10 }}
                      >
                        {wordOccurrences.length} live match
                        {wordOccurrences.length === 1 ? "" : "es"} loaded
                      </ThemedText>
                    ) : null}
                  </View>
                  {wordSearchLoading ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : null}
                </View>
                {wordOccurrences.length > 0 ? (
                  wordOccurrences.map((item) => (
                    <Pressable
                      key={item.verseKey}
                      testID={`quran-word-occurrence-${item.verseKey}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Open Quran ${item.verseKey} for this word`}
                      accessibilityHint="Jumps to the exact ayah where this Quran word appears."
                      onPress={() => handleOpenWordOccurrence(item)}
                      style={[
                        styles.wordOccurrenceRow,
                        {
                          backgroundColor: theme.surfaceGlass,
                          borderColor: theme.borderSubtle,
                        },
                      ]}
                    >
                      <View style={styles.wordOccurrenceTopRow}>
                        <ThemedText
                          type="small"
                          style={{ color: theme.primary, fontWeight: "900" }}
                        >
                          Quran {item.verseKey}
                        </ThemedText>
                        <View
                          style={[
                            styles.wordOccurrenceOpenPill,
                            {
                              backgroundColor: `${theme.primary}10`,
                              borderColor: `${theme.primary}24`,
                            },
                          ]}
                        >
                          <ThemedText
                            type="caption"
                            style={{
                              color: theme.primary,
                              fontWeight: "900",
                              fontSize: 10,
                            }}
                          >
                            Open ayah
                          </ThemedText>
                          <AppIcon
                            name="arrow-up-right"
                            size={11}
                            color={theme.primary}
                          />
                        </View>
                      </View>
                      <ThemedText
                        type="caption"
                        numberOfLines={2}
                        style={{ color: theme.textSecondary, lineHeight: 18 }}
                      >
                        {item.translation || item.text}
                      </ThemedText>
                    </Pressable>
                  ))
                ) : (
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, lineHeight: 18 }}
                  >
                    {wordSearchLoading
                      ? "Finding where this word appears..."
                      : "No live Quran search matches loaded yet. Use Explain word for this word in context."}
                  </ThemedText>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderRecitationCoachSheet = () => {
    const verseNumber =
      recitationCoachVerseNumber ?? selectedStudyVerseNumber ?? aiVerseNumber;
    const verse = verseNumber
      ? verses.find((item) => item.verseNumber === verseNumber)
      : null;
    const lastPractice = quranLearningStats?.lastRecitationPractice;

    return (
      <Modal
        visible={recitationCoachVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRecitationCoachVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.sheetBackdropTouchable}
            onPress={() => setRecitationCoachVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close recitation coach"
          />
          <View
            style={[
              styles.recitationCoachSheet,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: `${theme.scholar}28`,
                paddingBottom: insets.bottom + Spacing.lg,
              },
            ]}
          >
            <View style={styles.modalHandle}>
              <View
                style={[styles.handleBar, { backgroundColor: theme.textMuted }]}
              />
            </View>
            <LinearGradient
              colors={[`${theme.scholar}1C`, "transparent"]}
              style={styles.ayahStudySheetGlow}
            />
            <GeometricCardPattern color={theme.scholar} opacity={0.012} />
            <View style={styles.recitationCoachHeader}>
              <View
                style={[
                  styles.ayahStudySheetIcon,
                  { backgroundColor: `${theme.scholar}18` },
                ]}
              >
                <AppIcon name="mic" size={22} color={theme.scholar} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText
                  type="caption"
                  style={[styles.nurAiGuideEyebrow, { color: theme.scholar }]}
                >
                  Recitation practice
                </ThemedText>
                <ThemedText type="h4" style={{ color: theme.text }}>
                  Ayah {surahNumber}:{verseNumber || "-"}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => setRecitationCoachVisible(false)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.sheetCloseButton,
                  { backgroundColor: `${theme.textMuted}12` },
                  pressed ? { opacity: 0.7 } : null,
                ]}
              >
                <AppIcon name="x" size={18} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.recitationCoachScrollContent}
            >
              {verse ? (
                <View
                  style={[
                    styles.recitationVersePreview,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.recitationArabicPreview,
                      {
                        color: theme.text,
                        fontFamily: getArabicFontFamily(),
                      },
                    ]}
                  >
                    {verse.arabic}
                  </Text>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textSecondary, lineHeight: 18 }}
                  >
                    Listen once, recite slowly, then mark how it felt. NurAI
                    does not certify tajweed; use this to build honest practice
                    before teacher review.
                  </ThemedText>
                </View>
              ) : null}

              <View
                style={[
                  styles.recitationMemoryPanel,
                  {
                    backgroundColor: `${theme.primary}0B`,
                    borderColor: `${theme.primary}22`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.recitationMemoryRing,
                    {
                      backgroundColor:
                        (recitationPracticeStatus?.recitationPracticeCount ||
                          0) > 0
                          ? `${theme.primary}18`
                          : `${theme.scholar}14`,
                      borderColor:
                        (recitationPracticeStatus?.recitationPracticeCount ||
                          0) > 0
                          ? `${theme.primary}45`
                          : `${theme.scholar}35`,
                    },
                  ]}
                >
                  <ThemedText
                    type="h4"
                    style={{
                      color:
                        (recitationPracticeStatus?.recitationPracticeCount ||
                          0) > 0
                          ? theme.primary
                          : theme.scholar,
                      fontWeight: "900",
                    }}
                  >
                    {recitationPracticeStatus?.recitationPracticeCount || 0}
                  </ThemedText>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "900" }}
                  >
                    Private practice trail
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textSecondary, lineHeight: 18 }}
                  >
                    {recitationPracticeStatus?.lastRecitationQuality
                      ? `Last marked ${recitationPracticeStatus.lastRecitationQuality}. ${recitationPracticeStatus.memorySaved ? "A reflection card is saved for this ayah." : "Save a lesson when the meaning becomes clear."}`
                      : "Start with one listen-repeat cycle, then mark your recall honestly."}
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save this ayah as a memorisation lesson"
                  style={({ pressed }) => [
                    styles.recitationMemorySaveBtn,
                    {
                      backgroundColor: `${theme.scholar}12`,
                      borderColor: `${theme.scholar}28`,
                    },
                    pressed ? { opacity: 0.76 } : null,
                  ]}
                  onPress={() => handleSaveAyahLesson(verse)}
                >
                  <AppIcon
                    name={
                      recitationPracticeStatus?.memorySaved ? "check" : "plus"
                    }
                    size={13}
                    color={theme.scholar}
                  />
                </Pressable>
              </View>

              <View style={styles.recitationCoachSteps}>
                {[
                  {
                    icon: "headphones" as const,
                    title: "Listen",
                    body: "Hear the reciter with the mushaf open.",
                  },
                  {
                    icon: "repeat" as const,
                    title: "Repeat",
                    body: "Recite once slowly, then once from memory.",
                  },
                  {
                    icon: "shield" as const,
                    title: "Check",
                    body: "Mark it honestly. Teacher correction still matters.",
                  },
                ].map((step) => (
                  <View
                    key={step.title}
                    style={[
                      styles.recitationStepCard,
                      {
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                  >
                    <AppIcon name={step.icon} size={15} color={theme.scholar} />
                    <ThemedText
                      type="caption"
                      style={{ color: theme.text, fontWeight: "900" }}
                    >
                      {step.title}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={3}
                      style={{ color: theme.textMuted, lineHeight: 16 }}
                    >
                      {step.body}
                    </ThemedText>
                  </View>
                ))}
              </View>

              <View style={styles.recitationActionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.recitationAction,
                    {
                      backgroundColor: `${theme.primary}14`,
                      borderColor: `${theme.primary}30`,
                    },
                    pressed ? { opacity: 0.76 } : null,
                  ]}
                  onPress={() => {
                    if (verseNumber) playVerse(verseNumber);
                  }}
                >
                  <AppIcon name="play" size={15} color={theme.primary} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "900" }}
                  >
                    Listen
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.recitationAction,
                    {
                      backgroundColor: `${theme.primary}14`,
                      borderColor: `${theme.primary}30`,
                    },
                    pressed ? { opacity: 0.76 } : null,
                  ]}
                  onPress={() =>
                    handleRecitationPractice("confident", verseNumber)
                  }
                >
                  <AppIcon name="check" size={15} color={theme.primary} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "900" }}
                  >
                    Confident
                  </ThemedText>
                </Pressable>
              </View>
              <View style={styles.recitationActionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.recitationAction,
                    {
                      backgroundColor: `${theme.scholar}12`,
                      borderColor: `${theme.scholar}30`,
                    },
                    pressed ? { opacity: 0.76 } : null,
                  ]}
                  onPress={() =>
                    handleRecitationPractice("repeat", verseNumber)
                  }
                >
                  <AppIcon name="rotate-ccw" size={15} color={theme.scholar} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "900" }}
                  >
                    Repeat
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.recitationAction,
                    {
                      backgroundColor: `${theme.scholar}12`,
                      borderColor: `${theme.scholar}30`,
                    },
                    pressed ? { opacity: 0.76 } : null,
                  ]}
                  onPress={() =>
                    handleRecitationPractice("teacher", verseNumber)
                  }
                >
                  <AppIcon name="user-check" size={15} color={theme.scholar} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "900" }}
                  >
                    Teacher
                  </ThemedText>
                </Pressable>
              </View>

              <View
                style={[
                  styles.recitationStatusRow,
                  { borderColor: `${theme.scholar}26` },
                ]}
              >
                <AppIcon name="activity" size={13} color={theme.scholar} />
                <ThemedText
                  type="caption"
                  numberOfLines={3}
                  style={{
                    color: theme.textSecondary,
                    flex: 1,
                    lineHeight: 18,
                  }}
                >
                  {lastPractice
                    ? `Last practice: ${lastPractice.surahName} ${lastPractice.surahNumber}:${lastPractice.ayahNumber}, ${lastPractice.practiceCount} session${lastPractice.practiceCount === 1 ? "" : "s"}.`
                    : "Your recitation practice will build a private review trail on this device."}
                </ThemedText>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={styles.container}
        accessibilityElementsHidden={ayahStudySheetVisible}
        importantForAccessibility={
          ayahStudySheetVisible ? "no-hide-descendants" : "auto"
        }
      >
        <Aurora />
        <Animated.View
          style={[styles.headerOverlay, headerChromeStyle]}
          onLayout={(event) => {
            const height = Math.round(event.nativeEvent.layout.height);
            if (height > 0 && height !== headerChromeHeight) {
              setHeaderChromeHeight(height);
            }
          }}
        >
          {/* Legibility scrim. The chrome floats over live Arabic text, so
              without a backdrop the controls read as unreadable clutter.
              Solid at the status bar, fading to clear at the lower edge so
              the mushaf still appears to run underneath. */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(11,17,20,0.97)",
              "rgba(11,17,20,0.92)",
              "rgba(11,17,20,0.72)",
              "rgba(11,17,20,0)",
            ]}
            locations={[0, 0.55, 0.82, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
          >
            <Pressable
              testID="button-back"
              style={({ pressed }) => [
                styles.headerButton,
                pressed ? { opacity: 0.6 } : null,
              ]}
              onPress={() => navigation.goBack()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back to Quran"
            >
              <NuraiGlass
                interactive
                pointerEvents="none"
                radius={22}
                tint="rgba(7,20,22,0.58)"
                style={StyleSheet.absoluteFillObject}
              />
              <AppIcon name="arrow-left" size={24} color={theme.text} />
            </Pressable>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerQuranMark}>
                <QuranIconSvg
                  size={18}
                  color={theme.primary}
                  accentColor={theme.scholar}
                />
              </View>
              <View style={styles.headerTitleCopy}>
                <ThemedText
                  type="h4"
                  numberOfLines={1}
                  style={styles.headerTitle}
                >
                  {surahName || `Surah ${surahNumber}`}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{
                    color: theme.textMuted,
                    fontSize: 9,
                    textAlign: "center",
                  }}
                >
                  Ayah {currentVisibleVerse || initialVerse || 1} ·{" "}
                  {currentTranslation.language}
                </ThemedText>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Pressable
                testID="button-reading-display"
                style={({ pressed }) => [
                  styles.fontBtn,
                  pressed ? { opacity: 0.6 } : null,
                ]}
                onPress={() => {
                  setSettingsTab("reading");
                  setSettingsModalVisible(true);
                }}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Open Quran reading display settings"
              >
                <NuraiGlass
                  interactive
                  pointerEvents="none"
                  radius={18}
                  tint="rgba(207,174,105,0.1)"
                  style={StyleSheet.absoluteFillObject}
                />
                <Text
                  style={[styles.displayButtonText, { color: theme.scholar }]}
                >
                  Aa
                </Text>
              </Pressable>
              <Pressable
                testID="button-open-settings"
                style={({ pressed }) => [
                  styles.settingsBtn,
                  pressed ? { opacity: 0.6 } : null,
                ]}
                onPress={() => setSettingsModalVisible(true)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Open Quran reader settings"
              >
                <NuraiGlass
                  interactive
                  pointerEvents="none"
                  radius={18}
                  tint="rgba(86,179,148,0.1)"
                  style={StyleSheet.absoluteFillObject}
                />
                <AppIcon name="sliders" size={16} color={theme.primary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.readerModeRow} accessibilityRole="tablist">
            {(
              [
                { id: "read", label: "Read", icon: "quran" },
                { id: "listen", label: "Listen", icon: "headphones" },
                { id: "study", label: "Study", icon: "reflection" },
              ] as {
                id: QuranReaderViewMode;
                label: string;
                icon: AppIconName;
              }[]
            ).map((option) => {
              const active = readerViewMode === option.id;
              return (
                <Pressable
                  key={option.id}
                  testID={`button-quran-mode-${option.id}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${option.label} mode`}
                  onPress={() => handleReaderViewModeChange(option.id)}
                  style={styles.readerModeItem}
                >
                  {active ? (
                    <NuraiGlass
                      pointerEvents="none"
                      radius={16}
                      tint={`${theme.primary}22`}
                      style={StyleSheet.absoluteFillObject}
                    />
                  ) : null}
                  <AppIcon
                    name={option.icon}
                    size={15}
                    color={active ? theme.primary : theme.textMuted}
                    decorative
                  />
                  <Text
                    style={[
                      styles.readerModeLabel,
                      { color: active ? theme.primary : theme.textMuted },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.quickInfoBar,
              {
                backgroundColor: "transparent",
                borderColor: "transparent",
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={22}
              tint="rgba(7,20,22,0.55)"
              style={StyleSheet.absoluteFillObject}
            />
            <Pressable
              style={({ pressed }) => [
                styles.quickInfoItem,
                pressed ? { opacity: 0.7 } : null,
              ]}
              onPress={() => {
                setSettingsTab("language");
                setSettingsModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Change Quran translation"
              accessibilityValue={{ text: currentTranslation.language }}
            >
              <AppIcon name="globe" size={12} color={theme.primary} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, marginLeft: 4 }}
                numberOfLines={1}
              >
                {currentTranslation.language}
              </ThemedText>
            </Pressable>
            <View
              style={[
                styles.quickInfoDivider,
                { backgroundColor: theme.borderSubtle },
              ]}
            />
            <Pressable
              style={({ pressed }) => [
                styles.quickInfoItem,
                pressed ? { opacity: 0.7 } : null,
              ]}
              onPress={() => {
                setSettingsTab("reciter");
                setSettingsModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Change Quran reciter"
              accessibilityValue={{ text: currentReciter.name }}
            >
              <AppIcon name="mic" size={12} color={theme.primary} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, marginLeft: 4 }}
                numberOfLines={1}
              >
                {reciterShortName(currentReciter.name)}
              </ThemedText>
            </Pressable>
            <View
              style={[
                styles.quickInfoDivider,
                { backgroundColor: theme.borderSubtle },
              ]}
            />
            <Pressable
              style={({ pressed }) => [
                styles.quickInfoItem,
                pressed ? { opacity: 0.7 } : null,
              ]}
              onPress={() => {
                setSettingsTab("audio");
                setSettingsModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Open Quran audio settings"
              accessibilityValue={{ text: `${playbackSpeed} times speed` }}
            >
              <AppIcon name="sliders" size={12} color={theme.primary} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, marginLeft: 4 }}
              >
                {playbackSpeed}x
              </ThemedText>
              {showWordByWord ? (
                <View
                  style={[
                    styles.featureIndicator,
                    { backgroundColor: `${theme.primary}20` },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.primary,
                      fontSize: 8,
                      fontWeight: "700",
                    }}
                  >
                    W
                  </ThemedText>
                </View>
              ) : null}
              {showTransliteration ? (
                <View
                  style={[
                    styles.featureIndicator,
                    { backgroundColor: `${theme.primary}20` },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.primary,
                      fontSize: 8,
                      fontWeight: "700",
                    }}
                  >
                    T
                  </ThemedText>
                </View>
              ) : null}
              {tajweedEnabled ? (
                <View
                  style={[
                    styles.featureIndicator,
                    { backgroundColor: `${theme.primary}20` },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.primary,
                      fontSize: 8,
                      fontWeight: "700",
                    }}
                  >
                    J
                  </ThemedText>
                </View>
              ) : null}
              {repeatVerse ? (
                <View
                  style={[
                    styles.featureIndicator,
                    { backgroundColor: `${theme.scholar}22` },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.scholar,
                      fontSize: 8,
                      fontWeight: "700",
                    }}
                  >
                    R
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
            <View
              style={[
                styles.quickInfoDivider,
                { backgroundColor: theme.borderSubtle },
              ]}
            />
            <Pressable
              style={({ pressed }) => [
                styles.quickInfoItem,
                pressed ? { opacity: 0.7 } : null,
              ]}
              onPress={() => {
                setMemorisationMode((current) => !current);
                setMemorisationReveal(false);
                Haptics.selectionAsync();
              }}
              accessibilityRole="switch"
              accessibilityLabel="Toggle memorisation mode"
              accessibilityState={{ checked: memorisationMode }}
            >
              <AppIcon
                name={memorisationMode ? "eye-off" : "repeat"}
                size={12}
                color={memorisationMode ? theme.scholar : theme.primary}
              />
              <ThemedText
                type="caption"
                style={{
                  color: memorisationMode ? theme.scholar : theme.textSecondary,
                  marginLeft: 4,
                  fontWeight: memorisationMode ? "800" : "600",
                }}
              >
                Hifz
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        {renderReaderStudyHint()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, marginTop: Spacing.md }}
            >
              Loading verses...
            </ThemedText>
          </View>
        ) : fetchError || verses.length === 0 ? (
          <View style={styles.loadingContainer}>
            <AppIcon name="wifi-off" size={40} color={theme.textMuted} />
            <ThemedText
              type="h4"
              style={{
                color: theme.text,
                marginTop: Spacing.lg,
                textAlign: "center",
              }}
            >
              Unable to load verses
            </ThemedText>
            <ThemedText
              type="small"
              style={{
                color: theme.textSecondary,
                marginTop: Spacing.sm,
                textAlign: "center",
              }}
            >
              Please check your connection and try again
            </ThemedText>
            <Pressable
              onPress={fetchVerses}
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
              testID="button-retry-fetch"
            >
              <AppIcon
                name="refresh-cw"
                size={16}
                color={theme.buttonText}
                style={{ marginRight: Spacing.sm }}
              />
              <ThemedText
                type="body"
                style={{
                  color: theme.buttonText,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                }}
              >
                Try Again
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={verses}
            style={{ opacity: readerPositionReady ? 1 : 0 }}
            extraData={`${translationId}-${showWordByWord}-${showTransliteration}-${fontSize}-${tajweedEnabled}-${arabicFont}-${highlightedVerse}-${memorisationMode}-${memorisationReveal}-${activeAyahLensVerse}`}
            keyExtractor={(item) => item.verseNumber.toString()}
            renderItem={renderVerse}
            ListHeaderComponent={
              <View style={styles.readerOpening}>
                <View style={styles.readerOpeningMark}>
                  <QuranIconSvg
                    size={28}
                    color={theme.primary}
                    accentColor={theme.scholar}
                  />
                </View>
                <ThemedText
                  type="caption"
                  style={[
                    styles.readerOpeningEyebrow,
                    { color: theme.scholar },
                  ]}
                >
                  READING NOW
                </ThemedText>
                <ThemedText
                  type="h2"
                  accessibilityRole="header"
                  style={[styles.readerOpeningTitle, { color: theme.text }]}
                >
                  {surahName || `Surah ${surahNumber}`}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={[styles.readerOpeningBody, { color: theme.textMuted }]}
                >
                  Your place is remembered automatically. Tap play on any ayah
                  to begin recitation.
                </ThemedText>
                <GoldDivider
                  color={theme.scholar}
                  opacity={0.42}
                  style={styles.readerOpeningDivider}
                />
              </View>
            }
            contentContainerStyle={[
              styles.listContent,
              {
                // The chrome is an overlay, so the list owns the full screen;
                // this padding keeps the opening content below the visible
                // header + session rail, and scrolling reclaims every pixel.
                paddingTop:
                  measuredHeaderHeight + measuredRailHeight + Spacing.sm,
                paddingBottom: readerBottomPadding,
              },
            ]}
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleReaderScroll}
            decelerationRate="normal"
            removeClippedSubviews
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialNumToRender={
              readerInitialVerse
                ? Math.min(Math.max(30, readerInitialVerse + 4), 286)
                : 30
            }
            maxToRenderPerBatch={20}
            windowSize={11}
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: Math.max(0, info.index * info.averageItemLength),
                animated: false,
              });
              scrollRetryCount.current += 1;
              if (scrollRetryCount.current <= 5) {
                requestAnimationFrame(() => {
                  try {
                    flatListRef.current?.scrollToIndex({
                      index: info.index,
                      animated: resumeTargetVerseRef.current === null,
                      viewPosition: 0.08,
                    });
                  } catch {}
                });
              } else {
                resumeTargetVerseRef.current = null;
                setReaderPositionReady(true);
              }
            }}
          />
        )}

        {audioError
          ? (() => {
              const isUpgradeNotice =
                audioError === QURAN_BACKGROUND_PLAYBACK_UPGRADE_NOTICE;
              const noticeAccent = isUpgradeNotice
                ? theme.scholar
                : theme.warning;
              return (
                <View
                  style={[
                    styles.audioErrorBanner,
                    {
                      backgroundColor: "transparent",
                      borderColor: noticeAccent,
                      bottom: audioErrorBottom,
                    },
                  ]}
                  accessibilityRole={isUpgradeNotice ? "none" : "alert"}
                >
                  <NuraiGlass
                    pointerEvents="none"
                    radius={BorderRadius.md}
                    style={StyleSheet.absoluteFill}
                  />
                  {isUpgradeNotice ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="See Premium plans"
                      accessibilityHint="Opens NurAI Premium, which plays the Quran in the background"
                      onPress={() => {
                        setAudioError(null);
                        navigation.navigate("Subscription", {
                          initialTab: "premium",
                        });
                      }}
                      style={styles.audioNoticeAction}
                    >
                      <AppIcon name="lock" size={16} color={noticeAccent} />
                      <Text
                        style={[styles.audioErrorText, { color: theme.text }]}
                      >
                        {audioError}
                      </Text>
                      <Text
                        style={[
                          styles.audioUpgradeCta,
                          { color: noticeAccent },
                        ]}
                      >
                        Upgrade
                      </Text>
                    </Pressable>
                  ) : (
                    <>
                      <AppIcon
                        name="alert-circle"
                        size={16}
                        color={noticeAccent}
                      />
                      <Text
                        style={[styles.audioErrorText, { color: theme.text }]}
                      >
                        {audioError}
                      </Text>
                    </>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      isUpgradeNotice ? "Dismiss" : "Dismiss audio error"
                    }
                    onPress={() => setAudioError(null)}
                    hitSlop={8}
                    style={styles.audioErrorDismiss}
                  >
                    <AppIcon name="x" size={16} color={noticeAccent} />
                  </Pressable>
                </View>
              );
            })()
          : null}

        {showAudioBar ? (
          <Animated.View>
            <PremiumMiniPlayerSurface
              testID="quran-premium-mini-player"
              glowColor={`${theme.primary}08`}
              radius={20}
              onLayout={handleAudioDockLayout}
              style={[
                styles.audioBar,
                {
                  backgroundColor: "transparent",
                  borderTopColor: theme.borderSubtle,
                  borderColor: theme.borderSubtle,
                  bottom: audioDockBottom,
                  paddingBottom: Spacing.sm,
                },
              ]}
            >
              <View style={styles.audioCompactRow}>
                <Pressable
                  testID="button-quran-audio-options"
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`${audioDockTitle}. ${audioDockSubtitle}. ${audioStatusLabel}.`}
                  accessibilityHint="Opens Quran audio options"
                  onPress={() => {
                    setSettingsTab("audio");
                    setSettingsModalVisible(true);
                  }}
                  style={styles.audioCompactInfo}
                >
                  {windowWidth >= 370 && fontScale <= 1.15 ? (
                    <View
                      style={[
                        styles.audioArtwork,
                        { backgroundColor: `${theme.scholar}12` },
                      ]}
                    >
                      <QuranIconSvg
                        size={17}
                        color={theme.primary}
                        accentColor={theme.scholar}
                      />
                    </View>
                  ) : null}
                  <View style={styles.audioCompactCopy}>
                    <ThemedText
                      type="small"
                      numberOfLines={1}
                      style={{
                        color: theme.text,
                        fontWeight: "900",
                        fontSize: 13,
                        lineHeight: 17,
                      }}
                    >
                      {audioDockTitle}
                    </ThemedText>
                    {windowWidth >= 350 && fontScale <= 1.25 ? (
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{
                          color: theme.textMuted,
                          fontSize: 11,
                          lineHeight: 14,
                        }}
                      >
                        {audioDockSubtitle}
                      </ThemedText>
                    ) : null}
                  </View>
                </Pressable>

                <View style={styles.audioCompactActions}>
                  {!isWordAudioPlayback ? (
                    <Pressable
                      testID="button-prev-verse"
                      accessibilityRole="button"
                      accessibilityLabel="Play previous ayah"
                      style={({ pressed }) => [
                        styles.audioCompactButton,
                        pressed ? { opacity: 0.6 } : null,
                      ]}
                      onPress={handlePrevVerse}
                    >
                      <AppIcon name="skip-back" size={18} color={theme.text} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    testID="button-play-pause"
                    accessibilityRole="button"
                    accessibilityLabel={
                      transportState === "playing"
                        ? isWordAudioPlayback
                          ? "Pause Quran word audio"
                          : "Pause Quran recitation"
                        : isWordAudioPlayback
                          ? "Resume Quran word audio"
                          : "Resume Quran recitation"
                    }
                    accessibilityState={{
                      disabled: transportState === "loading",
                      busy: transportState === "loading",
                    }}
                    disabled={transportState === "loading"}
                    style={({ pressed }) => [
                      styles.audioCompactButton,
                      { backgroundColor: theme.primary },
                      pressed ? { opacity: 0.8 } : null,
                    ]}
                    onPress={handlePlayPause}
                  >
                    {transportState === "loading" ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.primaryForeground}
                      />
                    ) : (
                      <AppIcon
                        name={transportState === "playing" ? "pause" : "play"}
                        size={20}
                        color={theme.primaryForeground}
                      />
                    )}
                  </Pressable>
                  {!isWordAudioPlayback ? (
                    <Pressable
                      testID="button-next-verse"
                      accessibilityRole="button"
                      accessibilityLabel="Play next ayah"
                      style={({ pressed }) => [
                        styles.audioCompactButton,
                        pressed ? { opacity: 0.6 } : null,
                      ]}
                      onPress={handleNextVerse}
                    >
                      <AppIcon
                        name="skip-forward"
                        size={18}
                        color={theme.text}
                      />
                    </Pressable>
                  ) : null}
                  <Pressable
                    testID="button-stop-audio"
                    accessibilityRole="button"
                    accessibilityLabel={
                      isWordAudioPlayback
                        ? "Stop Quran word audio"
                        : "Stop Quran recitation"
                    }
                    style={({ pressed }) => [
                      styles.audioCompactDismiss,
                      { backgroundColor: `${theme.textMuted}12` },
                      pressed ? { opacity: 0.6 } : null,
                    ]}
                    onPress={stopPlayback}
                  >
                    <AppIcon name="x" size={15} color={theme.textSecondary} />
                  </Pressable>
                </View>
              </View>
              <MediaProgressBar
                style={styles.audioCompactProgress}
                progress={audioProgressPercent}
                accessibilityLabel={
                  isWordAudioPlayback
                    ? "Quran word audio progress"
                    : `Quran ${surahNumber}:${currentPlayingVerse || 1} playback progress`
                }
                trackColor={`${theme.primary}18`}
                color={
                  transportState === "playing"
                    ? theme.primary
                    : `${theme.primary}55`
                }
              />
            </PremiumMiniPlayerSurface>
          </Animated.View>
        ) : null}

        <AIResponseModal
          visible={aiModalVisible}
          onClose={() => setAiModalVisible(false)}
          state={aiModalState}
          data={aiModalData}
          onRetry={handleAIButtonPress}
          onFollowUp={handleAIFollowUp}
          errorMessage={aiModalError}
          isPremium={isPremium}
          featureLabel={`Verse ${aiVerseNumber ? `${surahNumber}:${aiVerseNumber}` : ""} ${
            QURAN_STUDY_MODES.find((mode) => mode.id === aiStudyMode)?.label ||
            "Study"
          }`}
          requiredTier="premium"
        />
      </View>

      {renderSettingsModal()}
      {renderWordIntelligenceSheet()}
      {renderRecitationCoachSheet()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  sessionRailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 25,
    marginTop: 0,
    marginBottom: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  readerModeRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 6,
  },
  readerModeItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
  },
  readerModeLabel: {
    fontSize: 12.5,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  headerQuranMark: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleCopy: { flexShrink: 1, minWidth: 0, alignItems: "center" },
  headerTitle: { flexShrink: 1, textAlign: "center", lineHeight: 21 },
  headerRight: {
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "center",
  },
  fontBtn: {
    width: 40,
    height: 40,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  displayButtonText: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 13,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  quickInfoBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    paddingVertical: 7,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 0,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  quickInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  quickInfoDivider: {
    width: 1,
    height: 16,
    marginHorizontal: Spacing.sm,
  },
  featureIndicator: {
    width: 16,
    height: 16,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.xs,
  },
  readerStudyHint: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  readerStudyHintIcon: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  readerStudyHintCopy: {
    flex: 1,
    minWidth: 0,
  },
  readerStudyHintPill: {
    minHeight: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  readerSessionRail: {
    marginHorizontal: Spacing.lg,
    marginTop: 2,
    marginBottom: Spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    overflow: "hidden",
  },
  readerSessionGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  readerSessionPattern: {
    right: -90,
    top: -84,
  },
  readerSessionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  readerSessionProgressPill: {
    minHeight: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  readerSessionProgressTrack: {
    flex: 1,
    height: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  readerSessionCompactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  readerSessionModeLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: "900",
  },
  readerSessionPercent: {
    fontSize: 10,
    fontWeight: "900",
  },
  readerSessionProgressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  readerFlagshipBand: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  readerFlagshipBandTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  readerFlagshipBandIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  readerFlagshipBandCopy: {
    flex: 1,
    minWidth: 0,
  },
  readerFlagshipTrustPill: {
    maxWidth: 128,
    minHeight: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  readerFlagshipActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  readerFlagshipAction: {
    flexGrow: 1,
    flexBasis: "23%",
    minHeight: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  readerSessionActions: {
    flexDirection: "row",
    gap: 6,
  },
  readerSessionAction: {
    minHeight: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  readerSessionPrompt: {
    flex: 1,
    minHeight: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  readerSessionPath: {
    flexDirection: "row",
    gap: 6,
  },
  readerSessionStep: {
    flex: 1,
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  quranJourneyPanel: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: "hidden",
    gap: Spacing.sm,
  },
  quranJourneyGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  quranJourneyTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quranJourneyIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  quranJourneyProgressPill: {
    minHeight: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  quranJourneyFocusCard: {
    minHeight: 64,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quranJourneyFocusIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  quranIdentityActionCard: {
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  quranDailySessionHandoffCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  quranDailySessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quranDailySessionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  quranDailySessionProof: {
    minHeight: 36,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(228,166,58,0.22)",
    backgroundColor: "rgba(228,166,58,0.07)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  quranDailySessionChecklist: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  quranDailySessionCheck: {
    minHeight: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  quranDailySessionFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quranDailySessionButton: {
    minHeight: 38,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  quranReadingContractCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  quranReadingContractHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quranReadingContractIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  quranReadingContractSource: {
    minHeight: 38,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  quranReadingContractItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  quranReadingContractItem: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 98,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xs,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  quranReadingContractItemIcon: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quranReadingContractItemCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  quranReadingContractBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  quranReadingContractButton: {
    minHeight: 42,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quranScholarEscalationCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  quranScholarEscalationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quranScholarEscalationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  quranScholarEscalationItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  quranScholarEscalationItem: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 82,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xs,
    justifyContent: "center",
    gap: 3,
  },
  quranScholarEscalationBoundary: {
    minHeight: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  quranScholarEscalationButton: {
    minHeight: 42,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quranRecoveryCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  quranRecoveryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quranRecoveryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  quranRecoveryMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  quranRecoveryPill: {
    minHeight: 30,
    maxWidth: "100%",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    justifyContent: "center",
  },
  quranRecoveryAccountability: {
    minHeight: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  quranProofReceiptPanel: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  quranProofReceiptHeader: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  quranProofReceiptHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quranProofReceiptHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  quranProofReceiptList: {
    gap: Spacing.xs,
  },
  quranProofReceiptRow: {
    minHeight: 86,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xs,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  quranProofReceiptIcon: {
    width: 28,
    height: 28,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  quranProofReceiptCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  quranProofReceiptTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  quranProofReceiptBoundary: {
    minHeight: 30,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.16)",
    backgroundColor: "rgba(255,212,107,0.05)",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },
  quranRecoveryMilestoneList: {
    gap: Spacing.xs,
  },
  quranRecoveryMilestone: {
    minHeight: 66,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: 4,
  },
  quranRecoveryMilestoneTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  quranRecoverySteps: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  quranRecoveryStep: {
    minHeight: 62,
    minWidth: 118,
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    justifyContent: "center",
    gap: 3,
  },
  quranRecoverySourceNote: {
    lineHeight: 16,
  },
  quranJourneyActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  ayahJourneyStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  ayahJourneyStep: {
    minHeight: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quranJourneyMetric: {
    flex: 1,
    minHeight: 50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    justifyContent: "center",
  },
  nurAiGuideCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  nurAiGuideGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  nurAiGuideIcon: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  nurAiGuideLockBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  nurAiGuideText: {
    flex: 1,
  },
  nurAiGuideEyebrow: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  nurAiGuidePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 0,
  },
  studyConsole: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  studyConsoleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  studyConsoleIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  studyConsoleCopy: {
    flex: 1,
    minWidth: 0,
  },
  studyConsoleAsk: {
    minHeight: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  studyModeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  studyModeChip: {
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  studyTrustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
  },
  listContent: { paddingHorizontal: 0 },
  readerOpening: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 24,
  },
  readerOpeningMark: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  readerOpeningEyebrow: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 1.4,
  },
  readerOpeningTitle: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 26,
    lineHeight: 36,
    textAlign: "center",
  },
  readerOpeningBody: {
    maxWidth: 320,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 5,
  },
  readerOpeningDivider: { width: 146, marginTop: 22 },
  verseCard: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 17,
    borderRadius: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  verseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  activeVerseDivider: {
    marginBottom: Spacing.sm,
  },
  inlineAyahLens: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  inlineAyahLensGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  inlineAyahLensPattern: {
    right: -72,
    top: -72,
  },
  inlineAyahLensHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  inlineAyahLensMark: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineAyahLensFullStudy: {
    minHeight: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  inlineAyahLensClose: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineAyahLiveStateRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  inlineAyahLiveState: {
    flex: 1,
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 0,
  },
  inlineAyahLensMap: {
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.14)",
    backgroundColor: "rgba(255,255,255,0.025)",
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inlineAyahLensInsight: {
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  inlineAyahLensMapStep: {
    minHeight: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    flex: 1,
    minWidth: 0,
  },
  inlineAyahLensMapConnector: {
    position: "absolute",
    right: -7,
    width: 8,
    height: 1,
  },
  inlineAyahLensActions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  inlineAyahLensAction: {
    flex: 1,
    minHeight: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 6,
  },
  verseBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  versePlayBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  verseStudyBtn: {
    minWidth: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  verseStudyLockBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  verseBoundary: {
    alignSelf: "center",
    width: 88,
    height: StyleSheet.hairlineWidth,
    marginTop: 16,
  },
  arabicText: {
    textAlign: "right",
    fontWeight: "400",
    writingDirection: "rtl",
    marginBottom: 15,
    letterSpacing: 0,
  },
  transliterationBlock: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  transliterationText: {
    fontStyle: "italic",
    textAlign: "left",
    writingDirection: "ltr",
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
  },
  wbwContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  wbwChip: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    minWidth: 82,
    minHeight: 104,
    justifyContent: "space-between",
  },
  wbwArabic: {
    textAlign: "center",
    fontWeight: "500",
    writingDirection: "rtl",
    marginBottom: 4,
  },
  wbwDivider: {
    height: 1,
    width: "100%",
    marginVertical: Spacing.xs,
  },
  wbwTransliteration: {
    textAlign: "center",
    fontSize: 10,
    fontStyle: "italic",
    marginBottom: 2,
  },
  wbwMeaning: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "500",
    marginBottom: Spacing.xs / 2,
    maxWidth: 96,
  },
  wbwUnavailable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  muqattaatChip: {
    minWidth: 90,
    paddingVertical: Spacing.md,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.md,
  },
  translationBlock: {},
  translationText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 15,
    lineHeight: 26,
  },
  ayahStudyCue: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  ayahStudyCueTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  ayahStudyCueTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  ayahStudyCueMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ayahSourcePill: {
    minHeight: 26,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    flexShrink: 0,
  },
  ayahStudyCueActions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  ayahStudyCueAction: {
    flex: 1,
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  memorisationHiddenCard: {
    minHeight: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  memorisationHiddenArabicCard: {
    minHeight: 128,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  memorisationDeskCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  memorisationDeskTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  memorisationDeskIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  memorisationDeskActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  memorisationDeskAction: {
    flex: 1,
    minHeight: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  memorisationReviewRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  memorisationReviewBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  rtlBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderRadius: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  audioBar: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing.sm,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 20,
    minHeight: 64,
    maxHeight: 72,
    paddingVertical: 6,
    paddingHorizontal: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  audioCompactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  audioCompactInfo: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  audioArtwork: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  audioCompactCopy: {
    flex: 1,
    minWidth: 0,
  },
  audioCompactActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  audioCompactButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  audioCompactDismiss: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  audioCompactProgress: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 3,
  },
  audioErrorDismiss: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  audioNowPlaying: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  audioTitleArea: {
    flex: 1,
    minWidth: 0,
  },
  audioEyebrow: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  audioCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  audioTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  audioQueueRail: {
    minHeight: 58,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xs,
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  audioQueueItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  audioQueueIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  audioSessionPanel: {
    minHeight: 76,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  audioSessionIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  audioSessionText: {
    flex: 1,
    minWidth: 0,
  },
  audioSessionActions: {
    alignItems: "flex-end",
    gap: 6,
  },
  audioSessionPill: {
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  audioLearningRail: {
    minHeight: 70,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "stretch",
  },
  audioLearningStep: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  audioLearningIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  audioLearningDivider: {
    width: 1,
    marginVertical: 8,
    opacity: 0.9,
  },
  audioModeStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  audioBarTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  reciterSelector: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.md,
  },
  audioBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  speedBadgeBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  audioModeBadgeBtn: {
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  audioControls: {
    gap: Spacing.sm,
  },
  audioPrimaryControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  audioOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  audioBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  playPauseBtn: {
    width: Spacing.inputHeight,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  verseIndicator: {
    marginLeft: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  ayahStudySheet: {
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.lg,
    overflow: "hidden",
  },
  ayahStudySheetGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  ayahStudySheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  ayahStudySheetScrollContent: {
    paddingBottom: Spacing.md,
  },
  ayahStudySheetIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  ayahLivingCore: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
    gap: Spacing.md,
  },
  ayahLivingCoreGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  ayahLivingCoreTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  ayahLivingOrb: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ayahLivingOrbRing: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
  },
  ayahLivingSignalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  ayahLivingSignal: {
    minHeight: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  ayahLivingPrimaryAction: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  sheetCloseButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  ayahStudyPreview: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  ayahStudyPreviewTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  ayahStudySourcePill: {
    minHeight: 26,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 1,
  },
  ayahStudyLearningMap: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  ayahStudyLearningItem: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  ayahTimelineCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  ayahTimelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  ayahTimelineIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  ayahTimelineTrack: {
    height: 5,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  ayahTimelineFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  ayahTimelineGrid: {
    gap: Spacing.xs,
  },
  ayahTimelineItem: {
    gap: 2,
  },
  quranMemoryCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  quranMemoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  quranMemoryStats: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  quranMemoryStat: {
    flex: 1,
    minHeight: 54,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  quranReflectionNoteCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  quranReflectionNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quranReflectionNoteIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  quranReflectionSavedPill: {
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quranReflectionPrompt: {
    minHeight: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  quranReflectionInput: {
    minHeight: 104,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  quranReflectionFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quranReflectionSaveButton: {
    minHeight: 42,
    minWidth: 104,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  ayahJourneyModeCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  ayahJourneyModeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  ayahStudyPrimaryLensRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  ayahStudyPrimaryLens: {
    flex: 1,
    minHeight: 78,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    justifyContent: "center",
    gap: 4,
  },
  ayahStudyLearningIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  ayahJourneyCompass: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  ayahJourneyCompassHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  ayahJourneyCompassIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  ayahJourneyPathGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  ayahJourneyMiniCard: {
    flex: 1,
    minHeight: 76,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  ayahJourneyContextCard: {
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  beginnerGuideCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  beginnerGuideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  beginnerGuideIcon: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  beginnerTermGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  beginnerTermPill: {
    width: "48%",
    minHeight: 58,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    justifyContent: "center",
  },
  ayahJourneyPromptRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  ayahStudyAudienceBlock: {
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  ayahStudyAudienceLabel: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  ayahStudyAudienceRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  ayahStudyAudienceChip: {
    flex: 1,
    minHeight: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  ayahStudyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  ayahStudyAction: {
    width: "48%",
    minHeight: 132,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  ayahStudyActionIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  ayahStudyLock: {
    position: "absolute",
    right: Spacing.sm,
    top: Spacing.sm,
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  ayahStudyUtilityRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  ayahStudyUtility: {
    flex: 1,
    minHeight: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  wordSheet: {
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.lg,
    overflow: "hidden",
    maxHeight: "86%",
  },
  recitationCoachSheet: {
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.lg,
    overflow: "hidden",
    maxHeight: "88%",
  },
  recitationCoachHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  recitationCoachScrollContent: {
    paddingBottom: Spacing.md,
  },
  recitationVersePreview: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  recitationArabicPreview: {
    fontSize: 24,
    lineHeight: 46,
    textAlign: "right",
    writingDirection: "rtl",
  },
  recitationMemoryPanel: {
    minHeight: 74,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  recitationMemoryRing: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  recitationMemorySaveBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  recitationCoachSteps: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  recitationStepCard: {
    flex: 1,
    minHeight: 104,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 4,
  },
  recitationActionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  recitationAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  recitationStatusRow: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  wordSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  wordSheetScrollContent: {
    paddingBottom: Spacing.lg,
  },
  wordMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  wordMetaPill: {
    minHeight: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  wordLearningCompass: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  wordLearningCompassTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  wordReviewBadge: {
    minHeight: 32,
    maxWidth: 118,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  wordLearningProgressTrack: {
    height: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  wordLearningProgressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  wordPracticeRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  wordPracticeStep: {
    flexGrow: 1,
    minWidth: "22%",
    minHeight: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  wordPracticeStepIcon: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  wordMasteryPanel: {
    minHeight: 72,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  wordMasteryIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  wordSheetArabicBadge: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.24)",
  },
  wordSheetArabic: {
    fontSize: 26,
    writingDirection: "rtl",
    textAlign: "center",
  },
  wordInsightGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  wordInsightCard: {
    flex: 1,
    minHeight: 92,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  wordActionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  wordActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  wordOccurrencesBlock: {
    gap: Spacing.sm,
  },
  wordOccurrencesHeader: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wordOccurrenceRow: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 4,
  },
  wordOccurrenceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  wordOccurrenceOpenPill: {
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  settingsModalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "80%",
    paddingHorizontal: Spacing.lg,
  },
  modalHandle: {
    alignItems: "center",
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  handleBar: {
    width: 40,
    height: Spacing.xs,
    borderRadius: Spacing.xs / 2,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  settingsTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  settingsTabBtn: {
    flex: 1,
    minWidth: "22%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  settingsScrollContent: {
    maxHeight: 400,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  reciterIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumDivider: {
    borderTopWidth: 1,
    marginVertical: Spacing.md,
    alignItems: "center",
    paddingTop: Spacing.sm,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  upgradePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  settingsSection: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  settingsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  offlineStatusBadge: {
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  offlinePackMetaGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  offlinePackMetaCard: {
    flex: 1,
    minHeight: 74,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    justifyContent: "center",
  },
  offlineReadingCacheCard: {
    minHeight: 72,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  offlineReadingCacheIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  audioPresetGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  audioPresetCard: {
    flex: 1,
    minHeight: 118,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    justifyContent: "center",
    gap: 6,
  },
  audioPresetIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  readingComfortSelectedPill: {
    minHeight: 22,
    alignSelf: "flex-start",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  audioEndModePanel: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  audioEndModeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  audioEndModeIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  audioEndModeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  audioEndModeOption: {
    width: "48%",
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  repeatPresetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  repeatRangeCoachPanel: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  repeatRangeCoachHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  repeatRangeCoachIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(228,166,58,0.12)",
  },
  repeatRangeLengthBadge: {
    minHeight: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatRangeTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  repeatRangeTrackFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: BorderRadius.full,
  },
  repeatRangeCoachMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  repeatPresetCard: {
    flex: 1,
    minWidth: 104,
    minHeight: 58,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  speedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  sleepTimerContinuousCard: {
    minHeight: 76,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sleepTimerContinuousIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sleepTimerStepperCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sleepTimerStepperCopy: {
    gap: 2,
  },
  sleepTimerStepperControls: {
    minHeight: 50,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  sleepTimerStepperButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sleepTimerStepperValue: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  speedBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 70,
    alignItems: "center",
  },
  fontSizeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  fontBtnLarge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tajweedLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
  },
  tajweedLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tajweedColorDot: {
    width: Spacing.sm + 2,
    height: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  audioErrorBanner: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: 190,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    zIndex: 10,
    overflow: "hidden",
  },
  audioErrorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  audioNoticeAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  audioUpgradeCta: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  verseContextCard: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  verseContextHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  verseContextDot: {
    width: Spacing.xs,
    height: Spacing.xs,
    borderRadius: Spacing.xs / 2,
  },
  verseContextLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  verseContextBody: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  verseContextSource: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_400Regular",
    fontStyle: "italic",
  },
});
