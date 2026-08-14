import type { PersonalAIActionPlanContract } from "@shared/nuraiAI";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadProfileV3, NurAIUserProfileV3 } from "./nuraiProfileV3";

export type AIFeature =
  | "QURAN"
  | "PRAYER"
  | "WOMENS_HEALTH"
  | "LEARNING"
  | "HIFZ"
  | "LIBRARY"
  | "FIQH"
  | "REVERT_SUPPORT"
  | "DUAS"
  | "NAMES_OF_ALLAH";

export type AIUserTier = "free" | "premium" | "scholar";

export interface AIContextRequest {
  feature: AIFeature;
  context: Record<string, unknown>;
  question?: string;
  userTier?: AIUserTier;
}

export interface AICitation {
  type:
    | "quran"
    | "hadith"
    | "tafsir"
    | "fiqh"
    | "seerah"
    | "scholar_review"
    | "app_context"
    | "official_service";
  reference: string;
  quote?: string;
  explanation?: string;
  url?: string | null;
}

export interface AIContextResponse {
  success: boolean;
  feature: AIFeature;
  response: string;
  disclaimer: string;
  citations?: AICitation[];
  learningSections?: {
    kind?:
      | "meaning"
      | "context"
      | "journey"
      | "key_words"
      | "lesson"
      | "avoid"
      | "action"
      | "sources";
    title: string;
    body: string;
    sourceRefs?: string[];
  }[];
  sourceCoverage?:
    | "verified_context"
    | "reference_detected"
    | "limited_context"
    | "needs_source_review";
  followUpPrompts?: string[];
  actionSteps?: string[];
  actionPlan?: PersonalAIActionPlanContract;
  personalAI?: {
    surface?: string;
    intent?: string;
    actionPlan?: PersonalAIActionPlanContract;
  };
  modelTier?: "free" | "premium" | "scholar";
  needsScholar?: boolean;
  warnings?: string[];
  confidence?: number;
  metadata: {
    madhab: string;
    userLevel: string;
    isRevert: boolean;
    wordCount: number;
  };
}

async function loadMadhab(): Promise<string> {
  try {
    const globalMadhab = await AsyncStorage.getItem("nurai_global_madhab");
    if (globalMadhab) return globalMadhab;
    const whMadhab = await AsyncStorage.getItem("womens_health_madhab");
    if (whMadhab) return whMadhab;
  } catch {}
  return "general";
}

async function loadRevertStatus(): Promise<{
  isRevert: boolean;
  shahadaDate: string | null;
  daysSinceShahada: number;
}> {
  try {
    const raw = await AsyncStorage.getItem("nurai_revert_status");
    if (raw) {
      const parsed = JSON.parse(raw);
      const daysSince = parsed.shahadaDate
        ? Math.floor(
            (Date.now() - new Date(parsed.shahadaDate).getTime()) / 86400000,
          )
        : 0;
      return {
        isRevert: parsed.isRevert || false,
        shahadaDate: parsed.shahadaDate || null,
        daysSinceShahada: daysSince,
      };
    }
  } catch {}
  return { isRevert: false, shahadaDate: null, daysSinceShahada: 0 };
}

function getUserLevel(profile: NurAIUserProfileV3): string {
  return profile.knowledgeLevel || "beginner";
}

async function buildSpiritualContext(
  profile: NurAIUserProfileV3,
): Promise<Record<string, unknown>> {
  const context: Record<string, unknown> = {};

  if (profile.emotionalContext?.currentState) {
    context.emotionalState = profile.emotionalContext.currentState;
  }

  if (profile.streakData) {
    context.streak = {
      current: profile.streakData.currentStreak,
      longest: profile.streakData.longestStreak,
      strongestHabit: profile.streakData.strongestHabit,
      weakestHabit: profile.streakData.weakestHabit,
    };
  }

  if (profile.quranReadingHabit) {
    context.quranProgress = {
      currentSurah: profile.quranReadingHabit.currentSurah,
      currentAyah: profile.quranReadingHabit.currentAyah,
      completionPercentage: profile.quranReadingHabit.completionPercentage,
      averageDailyMinutes: profile.quranReadingHabit.averageDailyMinutes,
    };
  }

  if (profile.prayerConsistency !== undefined) {
    context.prayerConsistency = profile.prayerConsistency;
  }

  if (profile.prayerStreaks) {
    context.prayerStreaks = {
      currentAllFive: profile.prayerStreaks.currentAllFive,
      currentFajr: profile.prayerStreaks.currentFajr,
    };
  }

  return context;
}

export function customerSafeAIContextError(message: string): {
  code: AIContextError["code"];
  userMessage: string;
} {
  if (message.includes("429")) {
    if (message.toLowerCase().includes("scholar")) {
      return {
        code: "RATE_LIMIT",
        userMessage: "Scholar gives you more daily AI guidance.",
      };
    }
    return {
      code: "RATE_LIMIT",
      userMessage:
        "You have reached today’s AI guidance limit. Please try again later.",
    };
  }

  if (message.includes("402") || message.includes("403")) {
    return {
      code: "UPGRADE_REQUIRED",
      userMessage:
        "This guidance needs a paid plan. Open Subscription to choose Premium or Scholar.",
    };
  }

  return {
    code: "SERVER_ERROR",
    userMessage:
      "We could not load NurAI guidance right now. Please try again shortly.",
  };
}

export class AIContextError extends Error {
  public code:
    | "TIMEOUT"
    | "NETWORK"
    | "RATE_LIMIT"
    | "UPGRADE_REQUIRED"
    | "SERVER_ERROR";
  constructor(message: string, code: AIContextError["code"]) {
    super(message);
    this.name = "AIContextError";
    this.code = code;
  }
}

export async function askContextualAI(
  _request: AIContextRequest,
): Promise<AIContextResponse> {
  throw new AIContextError(
    "NurAI intelligence is being rebuilt from the ground up. The current AI layer is disabled.",
    "SERVER_ERROR",
  );
}

export async function askAboutVerse(params: {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabicText?: string;
  translation?: string;
  verseInsight?: string;
  quranMemory?: Record<string, unknown>;
  question?: string;
  userTier?: AIUserTier;
}): Promise<AIContextResponse> {
  return askContextualAI({
    feature: "QURAN",
    context: {
      surahNumber: params.surahNumber,
      surahName: params.surahName,
      ayahNumber: params.ayahNumber,
      arabicText: params.arabicText,
      translation: params.translation,
      verseInsight: params.verseInsight,
      quranMemory: params.quranMemory,
    },
    question: params.question,
    userTier: params.userTier,
  });
}

export async function getPrayerInsightsAI(params: {
  streak: number;
  missedPrayers?: string[];
  strongestPrayer?: string;
  weakestPrayer?: string;
  consistency?: number;
  question?: string;
  userTier?: AIUserTier;
}): Promise<AIContextResponse> {
  return askContextualAI({
    feature: "PRAYER",
    context: {
      streak: params.streak,
      missedPrayers: params.missedPrayers,
      strongestPrayer: params.strongestPrayer,
      weakestPrayer: params.weakestPrayer,
      consistency: params.consistency,
    },
    question: params.question,
    userTier: params.userTier,
  });
}

export async function getHealthGuidance(params: {
  question: string;
  cycleDuration?: number;
  regularity?: string;
  currentPhase?: string;
  userTier?: AIUserTier;
}): Promise<AIContextResponse> {
  return askContextualAI({
    feature: "WOMENS_HEALTH",
    context: {
      cycleDuration: params.cycleDuration,
      regularity: params.regularity,
      currentPhase: params.currentPhase,
      privacyScope:
        "Only anonymized cycle duration, regularity, and current phase are included. Saved dates, notes, symptoms, and journal entries are not sent.",
      sourceAnchors: ["Quran 2:222", "Sunan an-Nasa'i 2318"],
    },
    question: params.question,
    userTier: params.userTier,
  });
}

export async function learnTopic(params: {
  topic: string;
  category?: string;
  context?: Record<string, unknown>;
  question?: string;
  userTier?: AIUserTier;
}): Promise<AIContextResponse> {
  return askContextualAI({
    feature: "LEARNING",
    context: {
      topic: params.topic,
      category: params.category,
      ...params.context,
    },
    question: params.question,
    userTier: params.userTier,
  });
}

export async function getHifzCoachingAI(params: {
  memorizedRange?: string;
  dueReview?: string[];
  recentMistakes?: string[];
  reviewRisk?: string;
  question?: string;
  userTier?: AIUserTier;
}): Promise<AIContextResponse> {
  return askContextualAI({
    feature: "HIFZ",
    context: {
      memorizedRange: params.memorizedRange,
      dueReview: params.dueReview,
      recentMistakes: params.recentMistakes,
      reviewRisk: params.reviewRisk,
      instruction:
        "Use only visible Hifz progress and learner-supplied notes. Build a gentle revision plan; do not infer intention, private worship quality, or memorisation not shown.",
    },
    question:
      params.question ??
      "Make me a realistic Quran memorisation and revision plan.",
    userTier: params.userTier,
  });
}

export async function getLibraryGuidanceAI(params: {
  bookTitle: string;
  chapterTitle?: string;
  verifiedContentStatus?: string;
  sourceSummary?: string;
  context?: Record<string, unknown>;
  question?: string;
  userTier?: AIUserTier;
}): Promise<AIContextResponse> {
  return askContextualAI({
    feature: "LIBRARY",
    context: {
      bookTitle: params.bookTitle,
      chapterTitle: params.chapterTitle,
      verifiedContentStatus: params.verifiedContentStatus,
      sourceSummary: params.sourceSummary,
      ...params.context,
      instruction:
        "Only explain using reviewed Library content and supplied source cards. Do not invent sources, rulings, scholar names, or publication/review claims.",
    },
    question:
      params.question ??
      `Explain "${params.chapterTitle || params.bookTitle}" in a practical, source-safe way.`,
    userTier: params.userTier,
  });
}

export async function askFiqhQuestion(params: {
  question: string;
  userTier?: AIUserTier;
}): Promise<AIContextResponse> {
  return askContextualAI({
    feature: "FIQH",
    context: {},
    question: params.question,
    userTier: params.userTier,
  });
}

export async function getRevertGuidance(params: {
  question: string;
  emotion?: string;
  concern?: string;
  userTier?: AIUserTier;
}): Promise<AIContextResponse> {
  return askContextualAI({
    feature: "REVERT_SUPPORT",
    context: {
      emotion: params.emotion,
      concern: params.concern,
    },
    question: params.question,
    userTier: params.userTier,
  });
}

export async function getDuaInsight(params: {
  duaName: string;
  arabicText?: string;
  translation?: string;
  category?: string;
  question?: string;
  userTier?: AIUserTier;
}): Promise<AIContextResponse> {
  return askContextualAI({
    feature: "DUAS",
    context: {
      duaName: params.duaName,
      arabicText: params.arabicText,
      translation: params.translation,
      category: params.category,
    },
    question: params.question,
    userTier: params.userTier,
  });
}

export async function getNameOfAllahInsight(params: {
  name: string;
  arabicName?: string;
  meaning?: string;
  index?: number;
  question?: string;
  userTier?: AIUserTier;
}): Promise<AIContextResponse> {
  return askContextualAI({
    feature: "NAMES_OF_ALLAH",
    context: {
      name: params.name,
      arabicName: params.arabicName,
      meaning: params.meaning,
      index: params.index,
    },
    question: params.question,
    userTier: params.userTier,
  });
}

export async function loadChatProfile(): Promise<{
  userProfile: {
    madhab: string;
    isRevert: boolean;
    daysSinceShahada: number;
    userLevel: string;
  };
  spiritualContext: Record<string, unknown>;
}> {
  const madhab = await loadMadhab();
  const revert = await loadRevertStatus();
  const v3Profile = await loadProfileV3();
  const userLevel = getUserLevel(v3Profile);
  const spiritual = await buildSpiritualContext(v3Profile);

  return {
    userProfile: {
      madhab,
      isRevert: revert.isRevert,
      daysSinceShahada: revert.daysSinceShahada,
      userLevel,
    },
    spiritualContext: spiritual,
  };
}

export function clearAICache(): void {
  // Compatibility no-op while contextual AI requests are disabled.
}
