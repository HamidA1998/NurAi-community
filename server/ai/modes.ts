import type {
  AIModeId,
  AIModeAccessRule,
  AIModeDefinitionContract,
  AIModeInferenceResult,
  AIMemoryAccessLevel,
  AIModelRoutingTier,
  AIModeSafetyCategory,
  AIModeSourceRule,
  AIResponseLength,
  AIResponseFormat,
  NurAIPlanTier,
} from "@shared/nuraiAI";
import { NURAI_AI_MODE_IDS } from "@shared/nuraiAI";
import type { AIModelPreference, AIRiskLevel } from "./types";

export interface AIModeDefinition extends AIModeDefinitionContract {
  id: AIModeId;
  label: string;
  description: string;
  access: AIModeAccessRule;
  safetyCategory: AIModeSafetyCategory;
  sourceRule: AIModeSourceRule;
  modelTier: AIModelRoutingTier;
  memoryAccess: AIMemoryAccessLevel;
  responseFormat: AIResponseFormat;
  risk: AIRiskLevel;
  modelPreference: AIModelPreference;
  maxOutputTokens: Record<NurAIPlanTier, number>;
  responseLength: Record<NurAIPlanTier, AIResponseLength>;
  systemPrompt: string;
  safetyRules: string[];
  sourceRules: string[];
  suggestedActions: string[];
}

interface ModeScore {
  modeId: AIModeId;
  score: number;
  reasons: string[];
}

const TIER_RANK: Record<NurAIPlanTier, number> = {
  free: 0,
  premium: 1,
  scholar: 2,
};

const CORE_TRUST_RULES = [
  "Never pretend to be a mufti or issue binding personal fatwa.",
  "Separate verified Quran, hadith, tafsir, or app content from AI explanation.",
  "For fiqh, health, finance, marriage, inheritance, abuse, legal, or urgent personal matters, guide carefully and recommend qualified human help.",
  "Do not invent Quran, hadith, tafsir, scholar, book, or reference numbers.",
  "Use only safe, relevant personalization signals; do not claim hidden knowledge of the user's private life or intentions.",
];

const CORE_SOURCE_RULES = [
  "Use source cards or supplied app content when making specific Islamic claims.",
  "If source support is limited, say that clearly and keep the answer general.",
  "For Quran references, cite the surah and ayah when supported.",
  "For hadith references, cite the collection only unless exact numbering is verified by source cards.",
];

export const AI_MODE_DEFINITIONS: Record<AIModeId, AIModeDefinition> = {
  ask_nurai: {
    id: "ask_nurai",
    label: "Ask NurAI",
    description:
      "General Personal AI chat for Islamic learning and next steps.",
    access: { minimumTier: "free" },
    safetyCategory: "religious_learning",
    sourceRule: "verified_sources_required",
    modelTier: "basic",
    memoryAccess: "safe_profile",
    responseFormat: "answer_explanation_source_action",
    risk: "religious",
    modelPreference: "auto",
    maxOutputTokens: { free: 650, premium: 1300, scholar: 1800 },
    responseLength: { free: "short", premium: "standard", scholar: "deep" },
    systemPrompt:
      "Act as NurAI's main Personal AI. Give warm, practical, source-aware Islamic learning support with one clear next step.",
    safetyRules: CORE_TRUST_RULES,
    sourceRules: CORE_SOURCE_RULES,
    suggestedActions: ["Ask NurAI", "Open Quran", "Save this answer"],
  },
  quran_guide: {
    id: "quran_guide",
    label: "Quran Guide",
    description:
      "Source-aware Quran reading, ayah explanation, and reflection.",
    access: { minimumTier: "free" },
    safetyCategory: "religious_learning",
    sourceRule: "source_cards_required",
    modelTier: "standard",
    memoryAccess: "learning_memory",
    responseFormat: "source_card_response",
    risk: "religious",
    modelPreference: "auto",
    maxOutputTokens: { free: 450, premium: 900, scholar: 1400 },
    responseLength: { free: "short", premium: "standard", scholar: "deep" },
    systemPrompt:
      "Guide the user through Quran meaning, reflection, memorisation support, and practical action while avoiding unsupported tafsir claims.",
    safetyRules: CORE_TRUST_RULES,
    sourceRules: [
      ...CORE_SOURCE_RULES,
      "Plain ayah meaning may use supplied Quran reader text; tafsir, asbab al-nuzul, hadith virtues, and named scholar comparisons require verified source cards.",
    ],
    suggestedActions: ["Open Quran", "Save lesson", "Make revision plan"],
  },
  arabic_tutor: {
    id: "arabic_tutor",
    label: "Arabic Tutor",
    description:
      "Arabic learning coach for grammar, vocabulary, and Quranic Arabic.",
    access: { minimumTier: "free" },
    safetyCategory: "general_learning",
    sourceRule: "app_context_allowed",
    modelTier: "standard",
    memoryAccess: "learning_memory",
    responseFormat: "coach_plan",
    risk: "religious",
    modelPreference: "auto",
    maxOutputTokens: { free: 420, premium: 850, scholar: 1300 },
    responseLength: { free: "short", premium: "standard", scholar: "deep" },
    systemPrompt:
      "Teach Arabic in small practical steps using the user's level, mistakes, due review, and current lesson context.",
    safetyRules: CORE_TRUST_RULES,
    sourceRules: [
      "Use supplied app lesson context for language coaching.",
      "Do not add Quran or hadith claims unless the source is supplied or verified.",
    ],
    suggestedActions: ["Review Arabic", "Practice words", "Try one sentence"],
  },
  hifz_coach: {
    id: "hifz_coach",
    label: "Hifz Coach",
    description: "Memorisation and revision planning for Quran learners.",
    access: { minimumTier: "premium" },
    safetyCategory: "religious_learning",
    sourceRule: "app_context_allowed",
    modelTier: "standard",
    memoryAccess: "learning_memory",
    responseFormat: "study_plan",
    risk: "religious",
    modelPreference: "auto",
    maxOutputTokens: { free: 0, premium: 850, scholar: 1300 },
    responseLength: { free: "short", premium: "standard", scholar: "deep" },
    systemPrompt:
      "Coach Quran memorisation with realistic revision, mistake patterns, gentle accountability, and sustainable pacing.",
    safetyRules: CORE_TRUST_RULES,
    sourceRules: CORE_SOURCE_RULES,
    suggestedActions: ["Open Hifz", "Review due ayahs", "Plan revision"],
  },
  salah_coach: {
    id: "salah_coach",
    label: "Salah Coach",
    description: "Prayer consistency, khushu, and practical salah improvement.",
    access: { minimumTier: "premium" },
    safetyCategory: "religious_learning",
    sourceRule: "verified_sources_required",
    modelTier: "basic",
    memoryAccess: "safe_profile",
    responseFormat: "coach_plan",
    risk: "religious",
    modelPreference: "auto",
    maxOutputTokens: { free: 0, premium: 750, scholar: 1100 },
    responseLength: { free: "short", premium: "standard", scholar: "standard" },
    systemPrompt:
      "Help the user improve salah through mercy, consistency, khushu, and one realistic action at a time.",
    safetyRules: CORE_TRUST_RULES,
    sourceRules: CORE_SOURCE_RULES,
    suggestedActions: ["Prepare for prayer", "Set reminder", "Review salah"],
  },
  dua_helper: {
    id: "dua_helper",
    label: "Dua Helper",
    description: "Dua suggestions, meanings, and dhikr support.",
    access: { minimumTier: "premium" },
    safetyCategory: "religious_learning",
    sourceRule: "verified_sources_required",
    modelTier: "basic",
    memoryAccess: "recent_activity",
    responseFormat: "answer_explanation_source_action",
    risk: "religious",
    modelPreference: "auto",
    maxOutputTokens: { free: 0, premium: 700, scholar: 1000 },
    responseLength: { free: "short", premium: "standard", scholar: "standard" },
    systemPrompt:
      "Suggest and explain duas with care, meaning, and practical use while keeping source claims verified.",
    safetyRules: CORE_TRUST_RULES,
    sourceRules: CORE_SOURCE_RULES,
    suggestedActions: ["Save this dua", "Open Duas", "Add dhikr habit"],
  },
  discipline_coach: {
    id: "discipline_coach",
    label: "Discipline Coach",
    description: "Habit, streak, and daily deen accountability support.",
    access: { minimumTier: "premium" },
    safetyCategory: "general_learning",
    sourceRule: "app_context_allowed",
    modelTier: "basic",
    memoryAccess: "recommendation_memory",
    responseFormat: "daily_insight",
    risk: "religious",
    modelPreference: "auto",
    maxOutputTokens: { free: 0, premium: 700, scholar: 1000 },
    responseLength: { free: "short", premium: "standard", scholar: "standard" },
    systemPrompt:
      "Turn the user's app progress into kind accountability, tiny habits, and a clear next best step.",
    safetyRules: CORE_TRUST_RULES,
    sourceRules: CORE_SOURCE_RULES,
    suggestedActions: [
      "Start daily plan",
      "Protect streak",
      "Choose one habit",
    ],
  },
  new_muslim_guide: {
    id: "new_muslim_guide",
    label: "New Muslim Guide",
    description: "Gentle guidance for reverts and beginners.",
    access: { minimumTier: "premium" },
    safetyCategory: "sensitive_guidance",
    sourceRule: "verified_sources_required",
    modelTier: "standard",
    memoryAccess: "safe_profile",
    responseFormat: "coach_plan",
    risk: "sensitive",
    modelPreference: "auto",
    maxOutputTokens: { free: 0, premium: 850, scholar: 1200 },
    responseLength: { free: "short", premium: "standard", scholar: "deep" },
    systemPrompt:
      "Support new Muslims with patience, simple terms, cultural clarity, and one small next step.",
    safetyRules: CORE_TRUST_RULES,
    sourceRules: CORE_SOURCE_RULES,
    suggestedActions: [
      "Open New Muslim Guide",
      "Learn basics",
      "Ask follow-up",
    ],
  },
  family_guide: {
    id: "family_guide",
    label: "Family Guide",
    description:
      "Gentle family reminders, parenting prompts, and household deen support with careful boundaries.",
    access: { minimumTier: "premium" },
    safetyCategory: "family_guidance",
    sourceRule: "verified_sources_required",
    modelTier: "standard",
    memoryAccess: "safe_profile",
    responseFormat: "coach_plan",
    risk: "sensitive",
    modelPreference: "auto",
    maxOutputTokens: { free: 0, premium: 850, scholar: 1200 },
    responseLength: { free: "short", premium: "standard", scholar: "deep" },
    systemPrompt:
      "Support family and parenting moments with calm Islamic reminders, privacy limits, and human help for sensitive household issues.",
    safetyRules: [
      ...CORE_TRUST_RULES,
      "Do not infer private family conflict or relationship details from app activity.",
      "For abuse, coercion, child safety, legal, marriage, or urgent family harm, recommend qualified local human help.",
    ],
    sourceRules: CORE_SOURCE_RULES,
    suggestedActions: [
      "Open Family Circle",
      "Save family reminder",
      "Ask qualified human help",
    ],
  },
  ramadan_coach: {
    id: "ramadan_coach",
    label: "Ramadan Coach",
    description:
      "Ramadan preparation, Quran goals, fasting routines, dhikr, and post-Ramadan consistency.",
    access: { minimumTier: "premium" },
    safetyCategory: "religious_learning",
    sourceRule: "verified_sources_required",
    modelTier: "standard",
    memoryAccess: "recommendation_memory",
    responseFormat: "daily_insight",
    risk: "religious",
    modelPreference: "auto",
    maxOutputTokens: { free: 0, premium: 850, scholar: 1200 },
    responseLength: { free: "short", premium: "standard", scholar: "deep" },
    systemPrompt:
      "Create realistic Ramadan and fasting guidance using the user's Quran, prayer, dhikr, and habit context while avoiding medical or fiqh rulings.",
    safetyRules: CORE_TRUST_RULES,
    sourceRules: [
      ...CORE_SOURCE_RULES,
      "For fasting exemptions, illness, pregnancy, medicine, travel rulings, or personal qada/fidya details, recommend a qualified scholar or clinician as appropriate.",
    ],
    suggestedActions: ["Open Ramadan", "Plan Quran goal", "Add dhikr habit"],
  },
  scholar_mode: {
    id: "scholar_mode",
    label: "Scholar Mode",
    description:
      "Advanced source-aware study mode for deeper Quranic and Arabic analysis.",
    access: { minimumTier: "scholar" },
    safetyCategory: "scholar_guarded",
    sourceRule: "scholar_review_recommended",
    modelTier: "advanced",
    memoryAccess: "scholar_guarded",
    responseFormat: "source_card_response",
    risk: "sensitive",
    modelPreference: "deep",
    maxOutputTokens: { free: 0, premium: 0, scholar: 2200 },
    responseLength: { free: "short", premium: "standard", scholar: "deep" },
    systemPrompt:
      "Provide advanced, source-aware study support while staying non-binding and explicit about source limits and scholarly caution.",
    safetyRules: CORE_TRUST_RULES,
    sourceRules: [
      ...CORE_SOURCE_RULES,
      "Use advanced analysis only when the user has Scholar access and source support is strong enough.",
      "For personal rulings, prepare questions and principles for a qualified scholar instead of deciding for the user.",
    ],
    suggestedActions: [
      "Review sources",
      "Prepare scholar question",
      "Save study notes",
    ],
  },
};

export function isAIModeId(value: unknown): value is AIModeId {
  return (
    typeof value === "string" &&
    (NURAI_AI_MODE_IDS as readonly string[]).includes(value)
  );
}

export function getAIModeDefinition(modeId: AIModeId): AIModeDefinition {
  return AI_MODE_DEFINITIONS[modeId];
}

export function tierMeetsRequirement(
  tier: NurAIPlanTier,
  minimumTier: NurAIPlanTier,
): boolean {
  return TIER_RANK[tier] >= TIER_RANK[minimumTier];
}

export function canUseAIMode(tier: NurAIPlanTier, modeId: AIModeId): boolean {
  return tierMeetsRequirement(
    tier,
    AI_MODE_DEFINITIONS[modeId].access.minimumTier,
  );
}

export function enabledAIModesForTier(tier: NurAIPlanTier): AIModeId[] {
  return NURAI_AI_MODE_IDS.filter((modeId) => canUseAIMode(tier, modeId));
}

export function resolveRequestedAIMode(
  requestedMode: unknown,
  tier: NurAIPlanTier,
  fallback: AIModeId = "ask_nurai",
): {
  requestedModeId?: AIModeId;
  mode: AIModeDefinition;
  allowed: boolean;
  fallbackUsed: boolean;
} {
  const requestedModeId = isAIModeId(requestedMode) ? requestedMode : undefined;
  const selectedModeId = requestedModeId || fallback;
  const allowed = canUseAIMode(tier, selectedModeId);
  const safeModeId = allowed
    ? selectedModeId
    : canUseAIMode(tier, fallback)
      ? fallback
      : "ask_nurai";

  return {
    requestedModeId,
    mode: AI_MODE_DEFINITIONS[safeModeId],
    allowed,
    fallbackUsed: safeModeId !== selectedModeId,
  };
}

export function tokenLimitForAIMode(
  modeId: AIModeId,
  tier: NurAIPlanTier,
): number {
  return AI_MODE_DEFINITIONS[modeId].maxOutputTokens[tier];
}

export function responseLengthForAIMode(
  modeId: AIModeId,
  tier: NurAIPlanTier,
): AIResponseLength {
  return AI_MODE_DEFINITIONS[modeId].responseLength[tier];
}

function normalizedSearchText(...values: unknown[]): string {
  return values
    .map((value) => {
      if (typeof value === "string") return value;
      if (Array.isArray(value)) return value.join(" ");
      if (value && typeof value === "object") {
        try {
          return JSON.stringify(value);
        } catch {
          return "";
        }
      }
      return "";
    })
    .join(" ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}:.'\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scorePattern(
  score: ModeScore,
  text: string,
  pattern: RegExp,
  points: number,
  reason: string,
): void {
  if (!pattern.test(text)) return;
  score.score += points;
  score.reasons.push(reason);
}

function confidenceForScore(
  score: number,
): AIModeInferenceResult["confidence"] {
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}

function topModeScore(scores: ModeScore[]): ModeScore {
  const priority: AIModeId[] = [
    "scholar_mode",
    "new_muslim_guide",
    "family_guide",
    "ramadan_coach",
    "hifz_coach",
    "arabic_tutor",
    "quran_guide",
    "salah_coach",
    "dua_helper",
    "discipline_coach",
    "ask_nurai",
  ];

  return scores.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return priority.indexOf(a.modeId) - priority.indexOf(b.modeId);
  })[0];
}

export function inferAIModeFromText({
  message,
  appContext,
  userProfile,
  spiritualContext,
}: {
  message: unknown;
  appContext?: unknown;
  userProfile?: unknown;
  spiritualContext?: unknown;
}): AIModeInferenceResult {
  const directText = normalizedSearchText(message);
  const contextText = normalizedSearchText(
    appContext,
    userProfile,
    spiritualContext,
  );
  const scores: ModeScore[] = NURAI_AI_MODE_IDS.map((modeId) => ({
    modeId,
    score: modeId === "ask_nurai" ? 1 : 0,
    reasons: modeId === "ask_nurai" ? ["safe default"] : [],
  }));
  const scoreFor = (modeId: AIModeId) =>
    scores.find((score) => score.modeId === modeId)!;

  scorePattern(
    scoreFor("scholar_mode"),
    directText,
    /\b(scholar mode|advanced source|advanced sources|deep dive|classical sources?|compare madhh?abs|madhh?ab comparison|source comparison|evidence across|fiqh evidence|proofs? across|scholarly differences|root analysis|isnad|usul)\b/i,
    7,
    "advanced source-aware study request",
  );
  scorePattern(
    scoreFor("new_muslim_guide"),
    directText,
    /\b(new muslim|revert|convert|conversion|shahada|just became muslim|new to islam|family does not accept|my family is not muslim)\b/i,
    8,
    "new Muslim or revert support",
  );
  scorePattern(
    scoreFor("family_guide"),
    directText,
    /\b(family|parent|parents|child|children|kids|spouse|husband|wife|household|home routine|teach my child|family circle)\b/i,
    7,
    "family or household guidance",
  );
  scorePattern(
    scoreFor("ramadan_coach"),
    directText,
    /\b(ramadan|ramadhan|fasting|fast|iftar|suhoor|suhur|taraweeh|tarawih|qiyam|laylatul qadr|eid|qada fast|fidya)\b/i,
    7,
    "Ramadan or fasting planning",
  );
  scorePattern(
    scoreFor("hifz_coach"),
    directText,
    /\b(hifz|memorise|memorize|memorisation|memorization|murajaah|revision plan|review plan|forgot my ayahs?|juz amma|juz|page revision|recitation review)\b/i,
    8,
    "memorisation or revision request",
  );
  scorePattern(
    scoreFor("arabic_tutor"),
    directText,
    /\b(arabic|grammar|nahw|sarf|root word|roots?|vocabulary|vocab|pronunciation|letters?|harakat|tajweed rule|translate this word|what does .* mean)\b/i,
    7,
    "Arabic learning request",
  );
  scorePattern(
    scoreFor("quran_guide"),
    directText,
    /\b(quran|qur'an|ayah|ayat|verse|surah|sura|tafsir|translation|explain .*2:\d+|explain .*surah|meaning of this ayah|reflect on this ayah)\b/i,
    6,
    "Quran explanation or reflection",
  );
  scorePattern(
    scoreFor("salah_coach"),
    directText,
    /\b(salah|salat|prayer|pray|fajr|dhuhr|zuhr|asr|maghrib|isha|khushu|wudu|wudhu|missed prayer|pray on time|qada prayer)\b/i,
    7,
    "salah or prayer improvement",
  );
  scorePattern(
    scoreFor("dua_helper"),
    directText,
    /\b(dua|du'a|supplication|dhikr|zikr|adhkar|azkar|tasbeeh|istighfar|salawat|what dua|suggest a dua)\b/i,
    7,
    "dua or dhikr request",
  );
  scorePattern(
    scoreFor("discipline_coach"),
    directText,
    /\b(habit|streak|discipline|routine|accountability|daily plan|consistency|motivation|lazy|procrastinat|next step|what should i do today|keep me on track)\b/i,
    6,
    "habit or discipline coaching",
  );

  scorePattern(
    scoreFor("quran_guide"),
    contextText,
    /\b(quran|surah|ayah|reader|tafsir)\b/i,
    2,
    "visible app context leans Quran",
  );
  scorePattern(
    scoreFor("arabic_tutor"),
    contextText,
    /\b(arabic|grammar|vocab|dialogue|lesson)\b/i,
    2,
    "visible app context leans Arabic",
  );
  scorePattern(
    scoreFor("hifz_coach"),
    contextText,
    /\b(hifz|memor|revision|murajaah)\b/i,
    2,
    "visible app context leans Hifz",
  );
  scorePattern(
    scoreFor("salah_coach"),
    contextText,
    /\b(prayer|salah|fajr|dhuhr|asr|maghrib|isha|weather|rain|wind|masjid)\b/i,
    2,
    "visible app context leans Salah or weather",
  );
  scorePattern(
    scoreFor("dua_helper"),
    contextText,
    /\b(tasbeeh|dhikr|adhkar|zikr)\b/i,
    3,
    "visible app context leans dhikr",
  );
  scorePattern(
    scoreFor("family_guide"),
    contextText,
    /\b(family|kids|parent|child|household|family circle)\b/i,
    3,
    "visible app context leans family",
  );
  scorePattern(
    scoreFor("ramadan_coach"),
    contextText,
    /\b(ramadan|fasting|iftar|suhoor|taraweeh|eid)\b/i,
    3,
    "visible app context leans Ramadan",
  );
  scorePattern(
    scoreFor("salah_coach"),
    contextText,
    /\b(travel|journey|destination|qibla|airport)\b/i,
    3,
    "visible app context leans travel",
  );
  scorePattern(
    scoreFor("ask_nurai"),
    contextText,
    /\b(women|cycle|menstruat|period|istihadha|nifas|qada fast)\b/i,
    3,
    "visible app context leans women's health",
  );

  const top = topModeScore(scores);
  const confidentTop = top.score >= 4 ? top : scoreFor("ask_nurai");

  return {
    modeId: confidentTop.modeId,
    confidence: confidenceForScore(confidentTop.score),
    reasons: confidentTop.reasons.slice(0, 4),
    explicit: false,
  };
}

export function contextualFeatureToAIMode(
  feature: string,
  context?: unknown,
): AIModeId {
  const mode =
    context && typeof context === "object" ? (context as any).mode : undefined;
  if (isAIModeId(mode)) return mode;

  switch (feature) {
    case "quran":
      return "quran_guide";
    case "prayer":
      return "salah_coach";
    case "duas":
      return "dua_helper";
    case "hifz":
      return "hifz_coach";
    case "family":
    case "kids":
      return "family_guide";
    case "ramadan":
    case "fasting":
      return "ramadan_coach";
    case "library":
      return "ask_nurai";
    case "revert_support":
      return "new_muslim_guide";
    case "womens_health":
      return "ask_nurai";
    case "fiqh":
      return "scholar_mode";
    case "names_of_allah":
      return "ask_nurai";
    case "travel":
      return "salah_coach";
    case "learning":
      return mode === "arabic_tutor" ||
        Boolean((context as any)?.selectedDialogue) ||
        Boolean((context as any)?.progress)
        ? "arabic_tutor"
        : "ask_nurai";
    default:
      return "ask_nurai";
  }
}

export function buildAIModePrompt(
  mode: AIModeDefinition,
  tier: NurAIPlanTier,
): string {
  return [
    "NURAI AI MODE:",
    `- Mode: ${mode.label} (${mode.id})`,
    `- User tier: ${tier}`,
    `- Response depth: ${responseLengthForAIMode(mode.id, tier)}`,
    `- Model routing tier: ${mode.modelTier}`,
    `- Memory access: ${mode.memoryAccess}`,
    `- Response format: ${mode.responseFormat}`,
    `- Mode job: ${mode.systemPrompt}`,
    `- Source rule: ${mode.sourceRule}`,
    "Safety rules:",
    ...mode.safetyRules.map((rule) => `- ${rule}`),
    "Source rules:",
    ...mode.sourceRules.map((rule) => `- ${rule}`),
    `Suggested app actions: ${mode.suggestedActions.join(", ")}`,
  ].join("\n");
}
