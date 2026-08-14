import type { Express, Request, Response } from "express";
import type { User } from "@shared/schema";
import type {
  PersonalAIGuidanceContract,
  PersonalAISurface,
} from "@shared/nuraiAI";
import type { AITextRequest } from "../../ai";
import { buildPersonalAIOrchestrator } from "../../ai/personalOrchestrator";
import {
  buildNurAICoreIdentity,
  serializeActionPlan,
} from "../../ai/personalAIResponse";
import { contextualFeatureToAIMode } from "../../ai/modes";
import { isValidQuranReference } from "../../ai/quranReference";
import {
  enforceAITextRateLimit,
  generateAITextWithUsageLogging,
} from "../../ai/httpControls";
import { sanitizeAIErrorMessage } from "../../ai/errorSanitizer";
import {
  CONTEXTUAL_DAILY_AI_LIMITS,
  enforceDailyAIQuota,
} from "../../ai/dailyQuota";
import { requireAuthenticatedUser } from "../../requestAuth";
import type { PlanTier } from "../../subscriptions";
import {
  buildStructuredAIResponseExtras,
  isSensitiveScholarReviewQuestion,
} from "./structuredResponse";

type Feature =
  | "quran"
  | "prayer"
  | "womens_health"
  | "learning"
  | "hifz"
  | "library"
  | "fiqh"
  | "revert_support"
  | "duas"
  | "names_of_allah";
type UserTier = PlanTier;
type UserLevel = "beginner" | "intermediate" | "advanced";

function personalAISurfaceForFeature(feature: Feature): PersonalAISurface {
  switch (feature) {
    case "quran":
      return "quran";
    case "prayer":
      return "prayer";
    case "learning":
      return "arabic";
    case "hifz":
      return "hifz";
    case "library":
      return "library";
    case "duas":
      return "duas";
    case "womens_health":
      return "womens_health";
    case "revert_support":
      return "contextual";
    default:
      return "contextual";
  }
}

interface UserProfile {
  madhab: string;
  isRevert: boolean;
  daysSinceShahada: number;
  userLevel: UserLevel;
}

interface SpiritualContext {
  emotionalState?: string;
  streakDays?: number;
  recentQuranSurah?: string;
  recentQuranAyah?: number;
  prayerConsistency?: number;
  recentTopics?: string[];
}

const VALID_MADHABS = new Set(["hanafi", "maliki", "shafii", "hanbali"]);
const VALID_USER_LEVELS = new Set<UserLevel>([
  "beginner",
  "intermediate",
  "advanced",
]);
const VALID_EMOTIONAL_STATES = new Set([
  "sad",
  "struggling",
  "anxious",
  "lonely",
  "overwhelmed",
  "guilty",
  "calm",
  "grateful",
  "hopeful",
]);

function clippedPromptText(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[<>`{}]/g, "")
    .trim();
  if (!text) return undefined;
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}

function clippedInt(
  value: unknown,
  min: number,
  max: number,
): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function normaliseUserProfile(value: unknown): UserProfile {
  const raw = value && typeof value === "object" ? (value as any) : {};
  const madhab = clippedPromptText(raw.madhab, 24)?.toLowerCase();
  const userLevel = clippedPromptText(raw.userLevel, 24)?.toLowerCase() as
    | UserLevel
    | undefined;
  return {
    madhab: madhab && VALID_MADHABS.has(madhab) ? madhab : "shafii",
    isRevert: raw.isRevert === true,
    daysSinceShahada: clippedInt(raw.daysSinceShahada, 0, 36500) || 0,
    userLevel:
      userLevel && VALID_USER_LEVELS.has(userLevel) ? userLevel : "beginner",
  };
}

function normaliseSpiritualContext(
  value: unknown,
): SpiritualContext | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as any;
  const emotionalState = clippedPromptText(
    raw.emotionalState,
    32,
  )?.toLowerCase();
  const recentQuranSurah = clippedPromptText(raw.recentQuranSurah, 80);
  const recentQuranAyah = clippedInt(raw.recentQuranAyah, 1, 286);
  const streakDays = clippedInt(raw.streakDays, 0, 10000);
  const prayerConsistency = clippedInt(raw.prayerConsistency, 0, 100);
  const recentTopics = Array.isArray(raw.recentTopics)
    ? raw.recentTopics
        .map((topic: unknown) => clippedPromptText(topic, 60))
        .filter((topic: string | undefined): topic is string => Boolean(topic))
        .slice(0, 5)
    : undefined;
  const normalized: SpiritualContext = {};
  if (emotionalState && VALID_EMOTIONAL_STATES.has(emotionalState)) {
    normalized.emotionalState = emotionalState;
  }
  if (streakDays !== undefined) normalized.streakDays = streakDays;
  if (recentQuranSurah) normalized.recentQuranSurah = recentQuranSurah;
  if (recentQuranAyah !== undefined) {
    normalized.recentQuranAyah = recentQuranAyah;
  }
  if (prayerConsistency !== undefined) {
    normalized.prayerConsistency = prayerConsistency;
  }
  if (recentTopics?.length) normalized.recentTopics = recentTopics;
  return Object.keys(normalized).length ? normalized : undefined;
}

function contextualWordLimit(feature: Feature, tier: UserTier): number {
  if (feature === "quran") {
    if (tier === "scholar") return 560;
    if (tier === "premium") return 360;
    return 260;
  }
  return tier === "scholar" ? 500 : 200;
}

function enforceWordLimit(
  text: string,
  tier: UserTier,
  feature: Feature,
): string {
  const limit = contextualWordLimit(feature, tier);
  const words = text.split(/\s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(" ") + "...";
}

function hasQuranLearningLabels(text: string): boolean {
  return (
    /\bMeaning\s*:/i.test(text) && /\b(Action|Lesson|Sources?)\s*:/i.test(text)
  );
}

function removeGenericSourceReviewParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !isGenericQuranSourceReviewText(paragraph))
    .join("\n\n")
    .trim();
}

function quranReferenceFromContext(context: any): string | null {
  const surah = context?.surahNumber || context?.surah;
  const ayah = context?.ayahNumber || context?.ayah;
  if (!surah || !ayah) return null;
  const parsedSurah = Number.parseInt(String(surah), 10);
  const parsedAyah = Number.parseInt(String(ayah), 10);
  if (!isValidQuranReference(parsedSurah, parsedAyah)) return null;
  return `Quran ${parsedSurah}:${parsedAyah}`;
}

function stripQuranLearningHeading(text: string): string {
  return text
    .replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "")
    .replace(
      /^\s*(?:meaning|context|journey|verse journey|verse timeline|ayah journey|ayah timeline|study flow|key words?|lesson|avoid|avoid misunderstanding|common misunderstanding|action|sources?)\s*[:\-–]\s*/i,
      "",
    )
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .trim();
}

function isGenericQuranSourceReviewText(text: string): boolean {
  const stripped = stripQuranLearningHeading(text);
  return (
    /^NurAI needs more verified source support before answering this safely/i.test(
      stripped,
    ) ||
    /^NurAI could not attach (?:a|the) (?:verified|strongest) source/i.test(
      stripped,
    ) ||
    /^This needs a careful answer with stronger verified support/i.test(
      stripped,
    ) ||
    /could not attach a verified source card for every claim/i.test(stripped)
  );
}

function hasGenericQuranSourceReviewContent(text: string): boolean {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .some(isGenericQuranSourceReviewText);
}

export function normaliseQuranLearningResponse(
  response: string,
  context: any,
): string {
  const cleaned =
    removeGenericSourceReviewParagraphs(response) || response.trim();
  const usefulCleaned = isGenericQuranSourceReviewText(cleaned) ? "" : cleaned;
  if (
    usefulCleaned &&
    hasQuranLearningLabels(usefulCleaned) &&
    !hasGenericQuranSourceReviewContent(usefulCleaned)
  ) {
    return usefulCleaned;
  }

  const paragraphs = usefulCleaned
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph
        .replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .trim(),
    )
    .filter(Boolean);
  const translation = String(context?.translation || "").trim();
  const verseInsight = String(context?.verseInsight || "").trim();
  const reference = quranReferenceFromContext(context);
  const wordFocus =
    Array.isArray(context?.words) && context.words.length > 0
      ? context.words
          .slice(0, 3)
          .map((word: any) =>
            [word?.arabic || word?.text, word?.translation || word?.meaning]
              .filter(Boolean)
              .join(" — "),
          )
          .filter(Boolean)
      : [];

  const meaning =
    paragraphs[0] ||
    (translation
      ? `${reference ? `${reference}: ` : ""}This ayah can be understood from the supplied translation: ${translation}`
      : "This answer is anchored to the selected ayah in the Quran reader.");
  const contextText =
    paragraphs[1] ||
    verseInsight ||
    "Historical revelation details, named tafsir positions, and hadith virtues are only shown when verified source cards support them.";
  const lesson =
    paragraphs[2] ||
    "Read the ayah as guidance first: notice what it teaches about belief, worship, character, or the heart.";

  const sections = [
    `Meaning: ${meaning}`,
    `Context: ${contextText}`,
    `Verse Journey: Study ${reference || "the selected ayah"} in this order: plain meaning, source-aware context, one important word, one lesson, then one action. Related ayahs, asbab al-nuzul, and named tafsir positions should only be added when verified source cards support them.`,
  ];

  if (wordFocus.length > 0) {
    sections.push(`Key Words: ${wordFocus.join("; ")}`);
  }

  sections.push(
    `Lesson: ${lesson}`,
    "Avoid: Do not treat this brief answer as a full tafsir, asbab al-nuzul report, hadith virtue, or personal ruling unless verified sources are provided for those details.",
    "Action: Re-read the ayah slowly, save one lesson, and choose one small action to practise today.",
    `Sources: This explanation is anchored to ${reference || "the selected Quran ayah"} and any source cards shown below. Extra asbab al-nuzul, hadith virtues, tafsir comparisons, or fiqh rulings need verified sources before being presented as evidence.`,
  );

  return sections.join("\n\n");
}

function buildWordLimitInstruction(tier: UserTier, feature: Feature): string {
  const limit = contextualWordLimit(feature, tier);
  return `\nWORD LIMIT: Maximum ${limit} words. Be concise and structured. Do not ramble. If more depth is required, suggest asking a follow-up question.`;
}

function buildToneLayer(
  profile: UserProfile,
  spiritual?: SpiritualContext,
): string {
  let tone = "\nTONE ADAPTATION:";

  if (profile.isRevert) {
    if (profile.daysSinceShahada < 90) {
      tone +=
        "\nThis user is a NEW MUSLIM (less than 90 days). Be extra gentle. NEVER assume knowledge of basic terms. Define words like 'madhab', 'fiqh', 'sunnah', 'wajib' when using them. Celebrate every small step. No guilt about the past — focus on present and future. Do not overwhelm with information.";
    } else if (profile.daysSinceShahada < 365) {
      tone +=
        "\nThis user is a growing Muslim (under 1 year). Encourage consistency over perfection. Build on foundations. They can handle more detail now but still appreciate gentleness.";
    } else {
      tone +=
        "\nThis user is an established revert Muslim (over 1 year). They can handle deeper topics. Focus on identity, growth, and deepening knowledge.";
    }
    tone +=
      "\nAlways separate cultural practices from Islamic obligations. Answer every question without judgment — no question is too basic.";
  }

  if (profile.userLevel === "beginner") {
    tone +=
      "\nUser is a beginner. Define Islamic terms inline when you first use them.";
  } else if (profile.userLevel === "advanced") {
    tone +=
      "\nUser has advanced knowledge. Provide deeper insights without overcomplicating.";
  }

  if (spiritual?.emotionalState) {
    const state = spiritual.emotionalState.toLowerCase();
    if (
      [
        "sad",
        "struggling",
        "anxious",
        "lonely",
        "overwhelmed",
        "guilty",
        "burnout",
      ].includes(state)
    ) {
      tone += `\nThe user appears to be feeling ${state}. Emphasize Allah's mercy and compassion. Avoid harsh language. Encourage small, achievable next steps. Remind them that Allah loves those who turn to Him.`;
    } else if (["motivated", "grateful", "peaceful"].includes(state)) {
      tone += `\nThe user is feeling ${state}. Channel this positive energy. Encourage them to build on this momentum.`;
    }
  }

  return tone;
}

function buildSpiritualContextPrompt(spiritual?: SpiritualContext): string {
  if (!spiritual) return "";
  let ctx = "\nUSER CONTEXT (incorporate naturally, not mechanically):";
  if (spiritual.streakDays !== undefined && spiritual.streakDays > 0) {
    ctx += `\n- They have a ${spiritual.streakDays}-day streak.`;
  }
  if (spiritual.recentQuranSurah) {
    ctx += `\n- Recently reading: Surah ${spiritual.recentQuranSurah}${spiritual.recentQuranAyah ? `, Ayah ${spiritual.recentQuranAyah}` : ""}.`;
  }
  if (spiritual.prayerConsistency !== undefined) {
    ctx += `\n- Prayer consistency: ${spiritual.prayerConsistency}%.`;
  }
  if (spiritual.recentTopics && spiritual.recentTopics.length > 0) {
    ctx += `\n- Recent learning topics: ${spiritual.recentTopics.join(", ")}.`;
  }
  return ctx;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clippedText(value: unknown, maxLength = 180): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function clippedNumber(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return String(Math.round(value));
}

function recordSummary(
  record: unknown,
  maxEntries = 6,
  valueMaxLength = 40,
): string | null {
  if (!isRecord(record)) return null;
  const entries = Object.entries(record)
    .map(([key, value]) => {
      const safeValue =
        clippedText(value, valueMaxLength) ?? clippedNumber(value) ?? null;
      return safeValue ? `${key}: ${safeValue}` : null;
    })
    .filter((item): item is string => Boolean(item))
    .slice(0, maxEntries);
  return entries.length ? entries.join("; ") : null;
}

function listSummary(
  value: unknown,
  formatter: (item: Record<string, unknown>) => string | null,
  maxItems = 4,
): string | null {
  if (!Array.isArray(value)) return null;
  const items = value
    .filter(isRecord)
    .map(formatter)
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems);
  return items.length ? items.join("; ") : null;
}

function buildArabicTutorContextPrompt(
  context: Record<string, unknown>,
): string {
  const isArabicTutor =
    context.mode === "arabic_tutor" ||
    isRecord(context.selectedDialogue) ||
    isRecord(context.progress);
  if (!isArabicTutor) return "";

  const lines: string[] = [];
  const category = clippedText(context.category);
  const instruction = clippedText(context.instruction, 300);
  if (category) lines.push(`Category: ${category}`);
  if (instruction) lines.push(`App instruction: ${instruction}`);

  if (isRecord(context.selectedDialogue)) {
    const dialogue = context.selectedDialogue;
    const title = clippedText(dialogue.title);
    const goal = clippedText(dialogue.goal, 220);
    const level = clippedText(dialogue.level);
    lines.push(
      `Current dialogue: ${[title, level ? `level ${level}` : null, goal]
        .filter(Boolean)
        .join(" — ")}`,
    );
    const dialogueLines = listSummary(
      dialogue.lines,
      (line) => {
        const speaker = clippedText(line.speaker, 24);
        const arabic = clippedText(line.arabic, 80);
        const meaning = clippedText(line.meaning, 100);
        if (!arabic && !meaning) return null;
        return `${speaker ? `${speaker}: ` : ""}${arabic || ""}${meaning ? ` (${meaning})` : ""}`;
      },
      5,
    );
    if (dialogueLines) lines.push(`Dialogue lines: ${dialogueLines}`);
  }

  if (isRecord(context.progress)) {
    const progress = context.progress;
    const progressLine = [
      `overall ${clippedNumber(progress.overall) ?? "unknown"}%`,
      `XP ${clippedNumber(progress.xp) ?? "0"}`,
      `streak ${clippedNumber(progress.streakDays) ?? "0"} days`,
      `level ${clippedText(progress.arabicLevelId) ?? "unknown"}`,
      `placement checks ${clippedNumber(progress.placementCheckCount) ?? "0"}`,
      `mastered letters ${clippedNumber(progress.masteredLetterCount) ?? "0"}`,
      `audio listens ${clippedNumber(progress.audioListenTotal) ?? "0"}`,
    ];
    lines.push(`Learner progress: ${progressLine.join(", ")}.`);

    const trackSummary = recordSummary(progress.tracks);
    if (trackSummary) lines.push(`Track progress: ${trackSummary}.`);
    const skillSummary = recordSummary(progress.skillSelfRatings);
    if (skillSummary) lines.push(`Self ratings: ${skillSummary}.`);
    const dueReviewSummary = listSummary(
      progress.dueArabicReviewItems,
      (item) => {
        const title = clippedText(item.title, 90);
        const kind = clippedText(item.kind, 32);
        const lapses = clippedNumber(item.lapseCount);
        return title
          ? `${title}${kind ? ` (${kind}` : ""}${lapses ? `, ${lapses} lapses` : ""}${kind ? ")" : ""}`
          : null;
      },
      4,
    );
    if (dueReviewSummary) lines.push(`Due review: ${dueReviewSummary}.`);

    const recentDrafts = [
      recordSummary(progress.latestSavedDialogueReplies, 3),
      recordSummary(progress.latestSavedDictations, 3),
      recordSummary(progress.latestSavedSentences, 3),
      recordSummary(progress.latestSavedWordMeanings, 3),
      clippedText(progress.latestDialogueReplyDraft, 120),
      clippedText(progress.latestDictationDraft, 120),
      clippedText(progress.latestSentenceBuilderDraft, 120),
      clippedText(progress.latestWordMeaningDraft, 120),
    ].filter(Boolean);
    if (recentDrafts.length) {
      lines.push(`Recent learner attempts: ${recentDrafts.join(" | ")}.`);
    }
  }

  return lines.join("\n");
}

function buildQuranLearningMemoryPrompt(
  context: Record<string, unknown>,
): string {
  if (!isRecord(context.quranMemory)) return "";

  const memory = context.quranMemory;
  const lines: string[] = [];

  if (isRecord(memory.reading)) {
    const reading = memory.reading;
    const readingLine = [
      `read ${clippedNumber(reading.totalVersesRead) ?? "0"} ayahs`,
      `${clippedNumber(reading.totalPercentage) ?? "0"}% Quran progress`,
      `${clippedNumber(reading.surahsStarted) ?? "0"} surahs started`,
      `${clippedNumber(reading.surahsCompleted) ?? "0"} completed`,
    ];
    const lastRead = clippedText(reading.lastReadSurah, 80);
    lines.push(
      `Reading memory: ${readingLine.join(", ")}${lastRead ? `. Last read: ${lastRead}` : ""}.`,
    );
  }

  if (isRecord(memory.learning)) {
    const learning = memory.learning;
    const learningLine = [
      `${clippedNumber(learning.learnedWords) ?? "0"} learned words`,
      `${clippedNumber(learning.savedLessons) ?? "0"} saved lessons`,
      `${clippedNumber(learning.recitationSessions) ?? "0"} recitation sessions`,
    ];
    const lastWord = clippedText(learning.lastLearnedWord, 80);
    lines.push(
      `Learning memory: ${learningLine.join(", ")}${lastWord ? `. Last word: ${lastWord}` : ""}.`,
    );
  }

  if (isRecord(memory.selectedAyah)) {
    const selected = memory.selectedAyah;
    const savedLesson =
      selected.savedLesson === true
        ? "lesson already saved"
        : "lesson not saved yet";
    const practiceCount =
      clippedNumber(selected.recitationPracticeCount) ?? "0";
    const quality = clippedText(selected.lastRecitationQuality, 32);
    lines.push(
      `Selected ayah memory: ${savedLesson}; ${practiceCount} recitation practices${quality ? `; last marked ${quality}` : ""}.`,
    );
  }

  if (isRecord(memory.studyPreference)) {
    const mode = clippedText(memory.studyPreference.mode, 32);
    const audience = clippedText(memory.studyPreference.audience, 32);
    if (mode || audience) {
      lines.push(
        `Study preference: ${[
          mode ? `mode ${mode}` : null,
          audience ? `audience ${audience}` : null,
        ]
          .filter(Boolean)
          .join(", ")}.`,
      );
    }
  }

  return lines.length
    ? `\nSAFE QURAN LEARNING MEMORY (use only to personalise next steps; do not expose this as private data or claim to know more than shown):\n${lines.join("\n")}`
    : "";
}

function buildFeaturePrompt(
  feature: Feature,
  context: any,
  profile: UserProfile,
  tier: UserTier,
): string {
  const madhab = profile.madhab || "Shafi'i";

  switch (feature) {
    case "quran": {
      const surah = context.surah || context.surahName || context.surahNumber;
      const ayah = context.ayah || context.ayahNumber;
      const arabic = context.arabic || context.arabicText;
      const translation = context.translation;
      const verseInsight = context.verseInsight;
      let prompt = `The user is reading Surah ${surah}, Ayah ${ayah}.`;
      if (arabic) prompt += `\nArabic from app context: ${arabic}`;
      if (translation)
        prompt += `\nTranslation from app context: ${translation}`;
      if (verseInsight) prompt += `\nExisting app insight: ${verseInsight}`;
      prompt += buildQuranLearningMemoryPrompt(context);
      if (context.question) prompt += `\nTheir question: ${context.question}`;
      prompt += `\n\nIf the Arabic or translation above is supplied, treat it as selected app context for this exact ayah, not as independent tafsir evidence. Do not refuse to explain the selected ayah and do not open with a generic "needs source review" paragraph when the verse text is enough for a plain explanation. Teach what can be safely taught from the supplied ayah first, then clearly separate what the verse itself says from any extra historical, hadith, tafsir, or fiqh claims that require additional verified sources.

Return the answer with these exact section labels so the app can render it as a Quran learning lens:
Meaning: explain the plain meaning and significance of this verse.
Context: explain who/what the ayah is addressing from supplied text/app context. Mention asbab al-nuzul only if supplied app context or verified source cards support it; otherwise say revelation reports are not included in the available source cards, then still explain the plain ayah context.
Key Words: explain 1-3 important Quran/Arabic words only if they are supplied or clear from the ayah text.
Verse Journey: show how to study this ayah in order: plain meaning, source-aware context, key word, lesson, action. Mention related ayahs, asbab al-nuzul, or named tafsir only if supplied source cards support them.
Lesson: give the heart/spiritual lesson without making unsupported tafsir, hadith, or fiqh claims.
Avoid: state one common misunderstanding or unsupported assumption to avoid; keep it short and only based on supplied text/source context.
Action: give one practical application for modern life.
Sources: name only the supplied Quran/source cards used, and clearly state which extra source layers would be needed for tafsir, hadith, fiqh, or revelation reports.`;
      if (tier === "scholar") {
        prompt += `\n5. Compare named classical scholars only when verified source cards or supplied app context support those names; otherwise give a cautious general note`;
      }
      prompt += `\nThe user follows the ${madhab} school. Present madhhab-specific rulings only when supported by supplied context or verified source cards; otherwise give general learning guidance and recommend a qualified scholar. Avoid theological debates unless explicitly asked.`;
      return prompt;
    }

    case "prayer": {
      const streak = context.streak;
      const missed = context.missed || context.missedPrayers;
      const strongest = context.strongest || context.strongestPrayer;
      const weakest = context.weakest || context.weakestPrayer;
      const consistency = context.consistency;
      let prompt = `The user wants prayer improvement insights.`;
      if (streak !== undefined) prompt += `\nCurrent streak: ${streak} days.`;
      if (missed !== undefined)
        prompt += `\nMissed prayers recently: ${Array.isArray(missed) ? missed.join(", ") : missed}.`;
      if (strongest) prompt += `\nStrongest prayer: ${strongest}.`;
      if (weakest) prompt += `\nWeakest prayer: ${weakest}.`;
      if (consistency !== undefined)
        prompt += `\nOverall consistency: ${consistency}%.`;
      if (context.question) prompt += `\nTheir question: ${context.question}`;
      prompt += `\n\nProvide:
1. Acknowledge and celebrate their strengths explicitly
2. Identify the root cause pattern for their weakest prayer before giving advice
3. Maximum 3 specific, actionable steps to improve
4. Include a hadith about consistency only if verified source cards support the exact reference; otherwise mention the principle without a hadith citation
The user follows the ${madhab} school.`;
      return prompt;
    }

    case "womens_health": {
      const situation = context.situation || context.question;
      const cycleInfo =
        context.cycleInfo ||
        (context.cycleDuration || context.regularity || context.currentPhase
          ? {
              cycleDuration: context.cycleDuration,
              regularity: context.regularity,
              currentPhase: context.currentPhase,
            }
          : null);
      let prompt = `The user has a women's health and fiqh question.`;
      if (situation) prompt += `\nSituation: ${situation}`;
      if (cycleInfo)
        prompt += `\nCycle info (anonymized): ${JSON.stringify(cycleInfo)}`;
      if (context.question) prompt += `\nTheir question: ${context.question}`;
      prompt += `\n\nIMPORTANT GUIDELINES:
- Begin with dignity-based framing: menstruation is a natural process created by Allah, not shameful (Quran 2:222)
- Focus on what she CAN do spiritually during this time (dhikr, dua, listening to Quran, charity, learning)
- Provide the ${madhab} ruling only when supplied context or verified source cards support it; otherwise give cautious general principles and make source limits clear
- Use the supplied source cards for Quran/hadith citations. If a hadith or ruling is not in the source cards, say source support is limited instead of guessing a reference
- Treat cycle duration, regularity, and phase as anonymized app context only. Do not infer pregnancy, sexual activity, diagnosis, or exact fiqh classification from app tracking alone
- Explain streak pauses as mercy-based worship protection when prayer or fasting is exempt, never as failure or laziness
- Never use medical-sounding authority — you are not a doctor
- Always include: "For rulings specific to your circumstances, consult a qualified scholar. For medical concerns, consult a healthcare professional."`;
      if (tier === "scholar") {
        prompt += `\n- Briefly note if other madhabs differ on key rulings`;
      }
      return prompt;
    }

    case "revert_support": {
      const { question, challenges } = context;
      let prompt = `The user is a new/revert Muslim seeking guidance.`;
      if (question) prompt += `\nTheir question: ${question}`;
      if (challenges) prompt += `\nCurrent challenges: ${challenges}`;
      prompt += `\n\nGUIDELINES FOR REVERT SUPPORT:
- Be infinitely patient. No question is too basic.
- Clearly separate cultural practices from Islamic obligations
- Define every Arabic/Islamic term inline when you use it
- Focus on one small, achievable next step — never overwhelm
- If they mention past sins: mention Allah's mercy and new beginnings without citing a hadith unless verified source cards support it
- If they mention loneliness: acknowledge it, remind them of the early Muslims who faced isolation, and suggest practical community-building steps
- If they mention family difficulties: emphasize maintaining family ties (Quran 17:23-24) while staying firm in faith
- Never use "You must" — use "You might consider" or "Many Muslims find it helpful to"`;
      return prompt;
    }

    case "fiqh": {
      const { question, topic } = context;
      let prompt = `The user has a fiqh (Islamic jurisprudence) question.`;
      if (topic) prompt += `\nTopic: ${topic}`;
      if (question) prompt += `\nQuestion: ${question}`;
      prompt += `\n\nGUIDELINES:
- Present the ${madhab} school's position only when supplied context or verified source cards support it; otherwise give cautious general principles
- Note significant differences from other schools only if relevant and supported
- Use language like "According to ${madhab} scholars..." or "The dominant opinion in the ${madhab} school is..."
- Cite evidence from Quran and Sunnah only from verified source cards or supplied app context
- End with: "For rulings specific to your circumstances, consult a qualified scholar."
- Never issue absolute binding statements
- Never use "You must" unless directly quoting the Quran`;
      return prompt;
    }

    case "learning": {
      const { topic } = context;
      const arabicTutorContext = isRecord(context)
        ? buildArabicTutorContextPrompt(context)
        : "";
      let prompt = `The user wants to learn about: ${topic}`;
      if (context.question)
        prompt += `\nSpecific question: ${context.question}`;
      if (arabicTutorContext) {
        prompt += `\n\nARABIC LEARNER CONTEXT:\n${arabicTutorContext}`;
      }
      prompt += `\n\nProvide a structured explanation:
1. Clear overview accessible to a ${profile.userLevel} learner
2. Relevant Quran verses and authentic hadith references only if verified source cards or supplied app context support them
3. Practical relevance to daily life
4. Address one common misconception if applicable
The user follows the ${madhab} school. Do not invent references or scholar/source names.`;
      if (arabicTutorContext) {
        prompt += `\n\nARABIC COACHING RULES:
- Treat this as Arabic language coaching, not a fiqh ruling.
- Use the learner's saved progress, current dialogue, due review items, and latest attempts above to choose the next drill.
- Give one short practice task with Arabic, transliteration, English meaning, and a clear correction.
- Keep the response useful for real speech: listening, reply, meaning, or sentence-building.
- Do not add Quran or hadith references unless the source is explicitly supplied.`;
      }
      return prompt;
    }

    case "hifz": {
      const memorizedRange =
        context.memorizedRange || context.memorizedRangeLabel;
      const dueReview = context.dueReview || context.dueLabel;
      const recentMistakes = context.recentMistakes || context.mistakePatterns;
      const reviewRisk = context.reviewRisk || context.reviewRiskLabel;
      let prompt = `The user wants Quran memorisation and revision coaching.`;
      if (memorizedRange)
        prompt += `\nMemorised range from app context: ${Array.isArray(memorizedRange) ? memorizedRange.join(", ") : memorizedRange}.`;
      if (dueReview)
        prompt += `\nDue review from app context: ${Array.isArray(dueReview) ? dueReview.join(", ") : dueReview}.`;
      if (recentMistakes)
        prompt += `\nRecent mistakes or weak spots from app context: ${Array.isArray(recentMistakes) ? recentMistakes.join(", ") : recentMistakes}.`;
      if (reviewRisk) prompt += `\nReview risk signal: ${reviewRisk}.`;
      if (context.question) prompt += `\nTheir question: ${context.question}`;
      prompt += `\n\nProvide:
1. One realistic Hifz next step for today
2. A short revision plan using only the visible progress above
3. A gentle mistake-recovery tip without shame or pressure
4. A recitation practice cue that does not claim to judge tajweed unless audio review data is supplied
5. A reminder that memorisation progress is personal learning support, not proof of worship quality
Do not infer intention, private worship, hidden memorisation, or off-app behaviour.`;
      return prompt;
    }

    case "library": {
      const bookTitle = context.bookTitle || context.book;
      const chapterTitle = context.chapterTitle || context.chapter;
      const status = context.verifiedContentStatus || context.sourceStatus;
      const sourceRefs = Array.isArray(context.sourceRefs)
        ? context.sourceRefs
            .map((source: any) =>
              [
                source?.reference,
                source?.verified ? "verified" : "needs review",
              ]
                .filter(Boolean)
                .join(" - "),
            )
            .filter(Boolean)
            .join("; ")
        : context.sourceSummary;
      let prompt = `The user wants guidance from the NurAI Library.`;
      if (bookTitle) prompt += `\nBook: ${bookTitle}.`;
      if (chapterTitle) prompt += `\nChapter: ${chapterTitle}.`;
      if (status) prompt += `\nLibrary content status: ${status}.`;
      if (sourceRefs) prompt += `\nSource cards supplied: ${sourceRefs}.`;
      if (context.question) prompt += `\nTheir question: ${context.question}`;
      prompt += `\n\nProvide:
1. A concise explanation of the supplied Library content
2. The source boundary: name only supplied source cards and avoid invented references
3. One practical action step from the chapter
4. One reflection question
5. A caution if the chapter touches fiqh, family, wealth, health, or sensitive personal rulings
Do not claim that Library material is scholar-approved, published, or fully reviewed unless the supplied content status/source cards explicitly say so.`;
      return prompt;
    }

    case "duas": {
      const duaText = context.duaText || context.duaName || context.arabicText;
      const duaSource = context.duaSource || context.translation;
      const category = context.category;
      let prompt = `The user wants to understand a dua (supplication).`;
      if (duaText) prompt += `\nDua: ${duaText}`;
      if (duaSource) prompt += `\nSource/Translation: ${duaSource}`;
      if (category) prompt += `\nCategory: ${category}`;
      if (context.question) prompt += `\nQuestion: ${context.question}`;
      prompt += `\n\nProvide:
1. The meaning and significance of this dua
2. When the Prophet (peace be upon him) used to recite it only if supplied context or verified source cards support it
3. Spiritual benefits or rewards mentioned in hadith only if verified source cards support them
4. How to incorporate it into daily life`;
      return prompt;
    }

    case "names_of_allah": {
      const { name, meaning } = context;
      let prompt = `The user is reflecting on one of Allah's Names.`;
      if (name) prompt += `\nName: ${name}`;
      if (meaning) prompt += `\nMeaning: ${meaning}`;
      if (context.question) prompt += `\nQuestion: ${context.question}`;
      prompt += `\n\nProvide:
1. The deeper meaning of this Name beyond the literal translation
2. How this attribute of Allah manifests in our lives and the world around us
3. How to call upon Allah using this Name in dua
4. A brief personal reflection prompt to help the user connect with this Name`;
      return prompt;
    }

    default:
      return context.question || "The user has a general Islamic question.";
  }
}

const GLOBAL_DISCLAIMER =
  "This AI provides general Islamic knowledge for educational purposes only. For personal rulings, consult a qualified scholar. For medical matters, consult a healthcare professional.";

function featureRisk(feature: Feature): "religious" | "sensitive" {
  if (
    feature === "womens_health" ||
    feature === "fiqh" ||
    feature === "revert_support"
  ) {
    return "sensitive";
  }
  return "religious";
}

async function checkContextualRateLimit(
  req: Request,
  res: Response,
): Promise<{ user: User; userTier: UserTier } | null> {
  const user = await requireAuthenticatedUser(req, res);
  if (!user) return null;

  const quota = await enforceDailyAIQuota(res, {
    user,
    assertedTier: req.body?.userTier,
    limits: CONTEXTUAL_DAILY_AI_LIMITS,
    upgradeRequiredBody: {
      success: false,
      error:
        "Contextual AI insights are a Premium feature. Upgrade to unlock AI-powered verse insights, prayer analysis, and more.",
      upgradeRequired: true,
    },
    limitReachedBody: (tier, limit) => ({
      success: false,
      error: `Daily AI limit reached (${limit}/day). ${tier === "premium" ? "Upgrade to Scholar for 200/day." : "Limit resets at midnight."}`,
      limitReached: true,
      remaining: 0,
    }),
  });
  if (!quota) return null;

  return { user, userTier: quota.userTier };
}

export function registerNuraiContextRoutes(app: Express): void {
  app.post("/api/nurai/ask", async (req: Request, res: Response) => {
    try {
      const {
        feature,
        context,
        question,
        userProfile,
        userTier: assertedUserTier = "free",
        spiritualContext,
      } = req.body as {
        feature: Feature;
        context: any;
        question?: string;
        userProfile: UserProfile;
        userTier: UserTier;
        spiritualContext?: SpiritualContext;
      };

      if (!feature || !context) {
        return res.status(400).json({
          success: false,
          error: "Feature and context are required.",
        });
      }

      const access = await checkContextualRateLimit(req, res);
      if (!access) return;
      const { user, userTier } = access;
      const aiRateLimit = await enforceAITextRateLimit(req, res);
      if (!aiRateLimit) return;

      const profile = normaliseUserProfile(userProfile);
      const safeSpiritualContext = normaliseSpiritualContext(spiritualContext);

      if (question && context) {
        context.question = question;
      }

      const validFeatures: Feature[] = [
        "quran",
        "prayer",
        "womens_health",
        "learning",
        "hifz",
        "library",
        "fiqh",
        "revert_support",
        "duas",
        "names_of_allah",
      ];
      const normalizedFeature = (feature as string).toLowerCase() as Feature;
      if (!validFeatures.includes(normalizedFeature)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported feature: ${feature}. Valid features: ${validFeatures.join(", ")}`,
        });
      }

      const contextualMode = contextualFeatureToAIMode(
        normalizedFeature,
        context,
      );
      const personalAI = await buildPersonalAIOrchestrator({
        user,
        tier: userTier,
        requestedMode: req.body?.modeId ?? req.body?.aiModeId ?? contextualMode,
        fallbackMode: contextualMode,
        feature: normalizedFeature,
        question,
        userProfile: profile,
        spiritualContext: safeSpiritualContext,
        appContext: req.body?.appContext ?? context,
        featureContext: context,
        surface: personalAISurfaceForFeature(normalizedFeature),
        useCase: "contextual",
      });
      const personalAIContext = personalAI.context;

      const systemPrompt = [
        buildNurAICoreIdentity(),
        buildWordLimitInstruction(userTier, normalizedFeature),
        buildToneLayer(profile, safeSpiritualContext),
        buildSpiritualContextPrompt(safeSpiritualContext),
        personalAI.prompt,
      ].join("\n");

      const featurePrompt = buildFeaturePrompt(
        normalizedFeature,
        context,
        profile,
        userTier,
      );

      const isQuranFeature = normalizedFeature === "quran";
      const routeMaxTokens = isQuranFeature
        ? userTier === "scholar"
          ? 1100
          : 700
        : userTier === "scholar"
          ? 1500
          : 800;
      const maxTokens = Math.min(
        routeMaxTokens,
        personalAIContext.maxOutputTokens || routeMaxTokens,
      );

      const aiRequest: AITextRequest = {
        useCase: "contextual",
        modeId: personalAIContext.mode.id,
        risk: featureRisk(normalizedFeature),
        modelPreference: personalAI.requestSettings.modelPreference,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: featurePrompt },
        ],
        maxOutputTokens: maxTokens,
        temperature: isQuranFeature ? 0.35 : 0.7,
        metadata: {
          feature: normalizedFeature,
          question,
          context,
          userTier,
          assertedUserTier,
          aiModeId: personalAIContext.mode.id,
          aiModeLabel: personalAIContext.mode.label,
          personalAI: personalAI.metadata,
          userLevel: profile.userLevel,
          madhab: profile.madhab,
          trustedSourceContext: false,
        },
      };
      if (personalAI.requestSettings.risk === "sensitive") {
        aiRequest.risk = "sensitive";
      }
      if (
        isSensitiveScholarReviewQuestion(
          `${question || ""} ${JSON.stringify(context || {})}`,
        )
      ) {
        aiRequest.risk = "sensitive";
      }

      const completion = await generateAITextWithUsageLogging({
        req,
        request: aiRequest,
        rateLimit: aiRateLimit,
        metadata: {
          route: "/api/nurai/ask",
          feature: normalizedFeature,
          tier: userTier,
        },
      });

      let response =
        completion.text || "Unable to generate a response at this time.";

      if (isQuranFeature) {
        response = normaliseQuranLearningResponse(response, context);
      }

      response = enforceWordLimit(response, userTier, normalizedFeature);

      const wordCount = response.split(/\s+/).length;

      const madhabDisplay =
        profile.madhab.charAt(0).toUpperCase() + profile.madhab.slice(1);

      res.json({
        success: true,
        feature,
        response,
        disclaimer: GLOBAL_DISCLAIMER,
        ...buildStructuredAIResponseExtras({
          response,
          feature: normalizedFeature,
          context,
          question,
          tier: userTier,
          aiCitations: completion.citations,
          aiSourceCoverage: completion.sourceCoverage,
          aiNeedsScholar: completion.needsScholar,
          aiReview: completion.review,
          actionPlan: personalAI.actionPlan,
        }),
        personalAI: {
          surface: personalAI.surface,
          intent: personalAI.intent,
          actionPlan: serializeActionPlan(personalAI.actionPlan),
        },
        metadata: {
          madhab: madhabDisplay,
          userLevel: profile.userLevel,
          isRevert: profile.isRevert,
          wordCount,
          ai: {
            provider: completion.provider,
            model: completion.model,
            modelTier: completion.modelTier,
            complexity: completion.complexity,
            mode: completion.mode,
            cached: completion.cached,
            fallbackUsed: completion.fallbackUsed,
            latencyMs: completion.latencyMs,
            usage: completion.usage,
            attemptedProviders: completion.attemptedProviders,
            routingReason: completion.routingReason,
            sourceCoverage: completion.sourceCoverage,
            needsScholar: completion.needsScholar,
            review: completion.review,
            modeId: personalAIContext.mode.id,
            modeLabel: personalAIContext.mode.label,
            modeAccess: {
              allowed: personalAIContext.modeAllowed,
              fallbackUsed: personalAIContext.modeFallbackUsed,
              requestedModeId: personalAIContext.requestedModeId,
            },
          },
        },
      });
    } catch (error) {
      console.error("[NurAI Context] Error:", sanitizeAIErrorMessage(error));
      res.status(500).json({
        success: false,
        error:
          "AI service is temporarily unavailable. Please try again in a moment.",
      });
    }
  });

  app.post("/api/nurai/guidance", async (req: Request, res: Response) => {
    try {
      const access = await checkContextualRateLimit(req, res);
      if (!access) return;

      const { user, userTier } = access;
      const profile = normaliseUserProfile(req.body?.userProfile);
      const safeSpiritualContext = normaliseSpiritualContext(
        req.body?.spiritualContext,
      );
      const appContext =
        req.body?.appContext && typeof req.body.appContext === "object"
          ? req.body.appContext
          : {};
      const contextSummary =
        typeof req.body?.contextSummary === "string"
          ? req.body.contextSummary.trim().slice(0, 1200)
          : "Visible home context only.";

      const personalAI = await buildPersonalAIOrchestrator({
        user,
        tier: userTier,
        requestedMode: req.body?.modeId ?? req.body?.aiModeId,
        fallbackMode: "ask_nurai",
        feature: "home",
        question:
          typeof req.body?.question === "string"
            ? req.body.question
            : "What is my next best step today?",
        userProfile: profile,
        spiritualContext: safeSpiritualContext,
        appContext: {
          ...appContext,
          homeContextSummary: contextSummary,
        },
        surface: "home",
        useCase: "contextual",
      });

      const guidance: PersonalAIGuidanceContract = {
        version: 1,
        surface: personalAI.surface,
        intent: personalAI.intent,
        modeId: personalAI.context.mode.id,
        actionPlan: serializeActionPlan(personalAI.actionPlan),
        contextSummary,
        generatedAt: new Date().toISOString(),
      };

      res.json({
        success: true,
        guidance,
        actionPlan: guidance.actionPlan,
        actionSteps: [
          guidance.actionPlan.primary.label,
          ...guidance.actionPlan.secondary.map((action) => action.label),
        ].slice(0, 3),
      });
    } catch (error) {
      console.error("[NurAI Guidance] Error:", sanitizeAIErrorMessage(error));
      res.status(500).json({
        success: false,
        error: "Personal AI guidance is temporarily unavailable.",
      });
    }
  });
}
