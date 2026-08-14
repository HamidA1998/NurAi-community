import type {
  AIModeId,
  AIModeInferenceResult,
  MuslimGrowthProfile,
  NurAIPlanTier,
  PersonalAIActionCapability,
  PersonalAIActionKind,
  PersonalAIIntent,
  PersonalAIPersonaContract,
  PersonalAISurface,
  PersonalAITrustContract,
  SafeAIMemorySummary,
} from "@shared/nuraiAI";
import {
  buildNurAIPersonalContext,
  type BuildNurAIContextOptions,
  type BuiltNurAIContext,
} from "./contextBuilder";
import { inferAIModeFromText, isAIModeId } from "./modes";
import type { AIModelPreference, AIRiskLevel, AIUseCase } from "./types";

export interface PersonalAIOrchestratorOptions
  extends BuildNurAIContextOptions {
  surface?: PersonalAISurface;
  useCase?: AIUseCase;
}

export interface PersonalAIRequestSettings {
  useCase: AIUseCase;
  modeId: AIModeId;
  risk: AIRiskLevel;
  modelPreference: AIModelPreference;
  maxOutputTokens: number;
}

export interface PersonalAIActionPlan {
  primary: PersonalAIActionCapability;
  secondary: PersonalAIActionCapability[];
  blocked: PersonalAIActionCapability[];
}

export interface PersonalAIOrchestratorPlan {
  version: 1;
  surface: PersonalAISurface;
  intent: PersonalAIIntent;
  context: BuiltNurAIContext;
  persona: PersonalAIPersonaContract;
  trust: PersonalAITrustContract;
  actionPlan: PersonalAIActionPlan;
  requestSettings: PersonalAIRequestSettings;
  prompt: string;
  metadata: {
    serverBuiltPersonalAIOrchestrator: true;
    orchestrationVersion: 1;
    surface: PersonalAISurface;
    intent: PersonalAIIntent;
    persona: PersonalAIPersonaContract;
    trust: PersonalAITrustContract;
    actionPlan: PersonalAIActionPlan;
    requestSettings: PersonalAIRequestSettings;
    context: BuiltNurAIContext["metadata"];
  };
}

const ROUTE_BY_ACTION: Record<
  string,
  {
    route?: string;
    kind: PersonalAIActionKind;
    minimumTier?: NurAIPlanTier;
    requiresConfirmation?: boolean;
    safetyNote?: string;
  }
> = {
  "ask nurai": { kind: "ask_followup" },
  "open quran": { route: "QuranReader", kind: "open_feature" },
  "save this answer": {
    route: "Settings",
    kind: "save",
    requiresConfirmation: true,
    safetyNote:
      "Save only the final answer and source metadata, not hidden prompts.",
  },
  "save lesson": {
    route: "QuranReader",
    kind: "save",
    requiresConfirmation: true,
  },
  "make revision plan": {
    route: "Hifz",
    kind: "review",
    minimumTier: "premium",
  },
  "review arabic": {
    route: "ArabicLearning",
    kind: "review",
    minimumTier: "premium",
  },
  "practice words": {
    route: "ArabicLearning",
    kind: "review",
    minimumTier: "premium",
  },
  "try one sentence": {
    route: "ArabicLearning",
    kind: "review",
    minimumTier: "premium",
  },
  "open hifz": { route: "Hifz", kind: "open_feature", minimumTier: "premium" },
  "review due ayahs": {
    route: "Hifz",
    kind: "review",
    minimumTier: "premium",
  },
  "plan revision": { route: "Hifz", kind: "plan", minimumTier: "premium" },
  "prepare for prayer": { route: "PrayerTimes", kind: "prepare" },
  "set reminder": {
    route: "NotificationSettings",
    kind: "set_reminder",
    requiresConfirmation: true,
  },
  "review salah": {
    route: "SalahGuide",
    kind: "review",
    minimumTier: "premium",
  },
  "save this dua": { route: "Duas", kind: "save", requiresConfirmation: true },
  "open duas": { route: "Duas", kind: "open_feature" },
  "add dhikr habit": { route: "Tasbeeh", kind: "prepare" },
  "start daily plan": { route: "Home", kind: "plan" },
  "protect streak": { route: "StreakGarden", kind: "prepare" },
  "choose one habit": { route: "Home", kind: "plan" },
  "open new muslim guide": {
    route: "NewMuslim",
    kind: "open_feature",
    minimumTier: "premium",
  },
  "learn basics": {
    route: "NewMuslim",
    kind: "review",
    minimumTier: "premium",
  },
  "ask follow-up": { kind: "ask_followup" },
  "open family circle": {
    route: "FamilyGroup",
    kind: "open_feature",
    minimumTier: "premium",
  },
  "save family reminder": {
    route: "FamilyGroup",
    kind: "save",
    minimumTier: "premium",
    requiresConfirmation: true,
    safetyNote:
      "Save only a gentle household reminder, not private family conflict.",
  },
  "open ramadan": {
    route: "Ramadan",
    kind: "open_feature",
    minimumTier: "premium",
  },
  "plan quran goal": {
    route: "QuranReadingPlan",
    kind: "plan",
    minimumTier: "premium",
  },
  "review sources": {
    route: "LibraryHome",
    kind: "review",
    minimumTier: "scholar",
  },
  "prepare scholar question": {
    route: "Scholars",
    kind: "scholar_handoff",
    minimumTier: "scholar",
    safetyNote:
      "Prepare questions and source notes; do not issue binding rulings.",
  },
  "save study notes": {
    route: "LibraryHome",
    kind: "save",
    minimumTier: "scholar",
    requiresConfirmation: true,
  },
  "open travel mode": { route: "TravelCompanion", kind: "open_feature" },
  "check prayer times": { route: "PrayerTimes", kind: "prepare" },
  "open tasbeeh": { route: "Tasbeeh", kind: "open_feature" },
  "open women's health": {
    route: "WomensHealth",
    kind: "open_feature",
    minimumTier: "premium",
  },
  "ask qualified human help": {
    route: "Scholars",
    kind: "scholar_handoff",
    safetyNote: "Use for sensitive health, fiqh, family, or urgent matters.",
  },
};

function textFrom(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textFrom).join(" ");
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function customerActionLabel(value: string): string {
  const label = value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!label) return "Ask NurAI";
  if (
    /^(?:mode|location\/date|prayer settings|profile guidance|prayer|daily actions|quran(?: pace)?|arabic|saved ai answers|travel|body care|weather|dhikr|women's health|notifications)\s*:/i.test(
      label,
    ) ||
    /\bsubscription\s*:/i.test(label) ||
    /\b(?:visible app context|source rule|trust boundary|personal ai context)\b/i.test(
      label,
    )
  ) {
    return "Ask NurAI";
  }
  return label.slice(0, 80).trim() || "Ask NurAI";
}

function inferSurface({
  surface,
  feature,
  useCase,
}: {
  surface?: PersonalAISurface;
  feature?: string;
  useCase?: AIUseCase;
}): PersonalAISurface {
  if (surface) return surface;
  if (feature === "quran") return "quran";
  if (feature === "learning") return "arabic";
  if (feature === "hifz") return "hifz";
  if (feature === "library") return "library";
  if (feature === "prayer") return "prayer";
  if (feature === "duas") return "duas";
  if (feature === "family" || feature === "kids") return "family";
  if (feature === "womens_health") return "womens_health";
  if (feature === "ramadan" || feature === "fasting") return "ramadan";
  if (feature === "travel") return "travel";
  if (feature === "home") return "home";
  if (feature === "weather") return "weather";
  if (feature === "tasbeeh") return "tasbeeh";
  if (feature === "revert_support") return "contextual";
  if (useCase === "chat") return "chat";
  return "contextual";
}

function hasSensitiveEscalation(question: unknown): boolean {
  return /\b(fatwa|fiqh ruling|halal|haram|divorce|marriage|inheritance|abuse|self-harm|suicide|medical|health|legal|finance|emergency|urgent)\b/i.test(
    textFrom(question),
  );
}

function inferIntent({
  modeId,
  question,
  feature,
}: {
  modeId: AIModeId;
  question?: unknown;
  feature?: string;
}): PersonalAIIntent {
  const text = `${feature || ""} ${textFrom(question)}`.toLowerCase();
  if (hasSensitiveEscalation(question)) return "handoff";
  if (/\b(open|take me|go to|start)\b/.test(text)) return "navigate";
  if (/\b(plan|schedule|routine|roadmap)\b/.test(text)) return "plan";
  if (/\b(review|revise|murajaah|mistake)\b/.test(text)) return "review";
  if (/\b(reflect|journal|heart|meaning)\b/.test(text)) return "reflect";
  if (/\b(explain|meaning|why|what does)\b/.test(text)) return "explain";
  if (
    modeId === "arabic_tutor" ||
    modeId === "hifz_coach" ||
    modeId === "salah_coach" ||
    modeId === "discipline_coach"
  ) {
    return "coach";
  }
  return "answer";
}

function personaFor({
  modeId,
  memory,
}: {
  modeId: AIModeId;
  memory: SafeAIMemorySummary;
}): PersonalAIPersonaContract {
  const preferenceText = memory.preferences.join(" ").toLowerCase();
  const prefersGentle = preferenceText.includes("gentle");
  const prefersShort =
    preferenceText.includes("short") || preferenceText.includes("practical");

  const voice: PersonalAIPersonaContract["voice"] =
    modeId === "scholar_mode"
      ? "scholar"
      : prefersGentle ||
          modeId === "new_muslim_guide" ||
          modeId === "family_guide"
        ? "gentle"
        : modeId === "discipline_coach" || modeId === "ramadan_coach"
          ? "accountability"
          : "calm";
  const relationship: PersonalAIPersonaContract["relationship"] =
    modeId === "arabic_tutor"
      ? "tutor"
      : modeId === "scholar_mode"
        ? "study_partner"
        : modeId === "discipline_coach" ||
            modeId === "hifz_coach" ||
            modeId === "ramadan_coach" ||
            modeId === "family_guide"
          ? "coach"
          : "companion";

  return {
    name: "Personal AI",
    voice,
    relationship,
    styleRules: [
      "Make one next best step obvious before giving extras.",
      prefersShort
        ? "Prefer short, practical answers unless the user asks for depth."
        : "Use enough detail to be helpful without flooding the user.",
      modeId === "new_muslim_guide"
        ? "Define Islamic terms in plain language and avoid cultural assumptions."
        : "Use familiar Islamic terms with brief explanations when useful.",
      modeId === "scholar_mode"
        ? "Use advanced source-aware analysis while staying non-binding."
        : "Keep the tone warm, humble, and source-aware.",
    ],
    forbiddenClaims: [
      "Do not claim to have a soul, emotions, worship, intentions, or hidden knowledge.",
      "Do not claim to know off-app behavior, private messages, or hidden worship.",
      "Do not issue binding fatwa or replace qualified scholars.",
      "Do not guarantee spiritual reward or claim Allah is pleased with a specific hidden state.",
    ],
  };
}

function actionCapability(
  label: string,
  tier: NurAIPlanTier,
): PersonalAIActionCapability {
  const safeLabel = customerActionLabel(label);
  const key = safeLabel.toLowerCase();
  const mapped = ROUTE_BY_ACTION[key] || { kind: "ask_followup" as const };
  return {
    id: slug(safeLabel) || "ask-followup",
    label: safeLabel,
    route: mapped.route,
    reason: mapped.route
      ? `Personal AI can open ${mapped.route} when the user chooses this action.`
      : "Personal AI can continue the conversation with a focused follow-up.",
    kind: mapped.kind,
    minimumTier: mapped.minimumTier || tier,
    requiresConfirmation: mapped.requiresConfirmation ?? false,
    safetyNote: mapped.safetyNote,
  };
}

function buildActionPlan({
  context,
  intent,
}: {
  context: BuiltNurAIContext;
  intent: PersonalAIIntent;
}): PersonalAIActionPlan {
  const tier = context.growthProfile.subscriptionContext.plan;
  const modeActions = context.mode.suggestedActions.map((label) =>
    actionCapability(label, tier),
  );
  const retentionAction = context.growthProfile.retentionProfile
    .recommendedNextAction
    ? actionCapability(
        context.growthProfile.retentionProfile.recommendedNextAction,
        tier,
      )
    : null;
  const handoffAction: PersonalAIActionCapability = {
    id: "qualified-human-help",
    label: "Ask qualified human help",
    route:
      context.mode.id === "scholar_mode" || intent === "handoff"
        ? "Scholars"
        : undefined,
    reason:
      "Sensitive or personal rulings should be handled with qualified human guidance.",
    kind: "scholar_handoff",
    minimumTier: context.mode.id === "scholar_mode" ? "scholar" : "free",
    requiresConfirmation: false,
    safetyNote:
      "Use this for fiqh, health, finance, marriage, inheritance, abuse, legal, or urgent matters.",
  };

  const ordered = [
    intent === "handoff" ? handoffAction : null,
    retentionAction,
    ...modeActions,
  ].filter((action): action is PersonalAIActionCapability => Boolean(action));
  const unique = Array.from(
    new Map(ordered.map((action) => [action.id, action])).values(),
  );

  return {
    primary: unique[0] || actionCapability("Ask NurAI", tier),
    secondary: unique.slice(1, 4),
    blocked: unique
      .filter((action) => action.requiresConfirmation)
      .map((action) => ({
        ...action,
        reason: `${action.reason || action.label} Requires user confirmation before Personal AI acts.`,
      })),
  };
}

function buildTrustContract({
  profile,
  memory,
  sensitive,
}: {
  profile: MuslimGrowthProfile;
  memory: SafeAIMemorySummary;
  sensitive: boolean;
}): PersonalAITrustContract {
  return {
    privacyBoundaries: profile.privacyBoundaries,
    memoryBoundaries: [
      "Use safe memory summaries as relevance hints, not as hidden facts.",
      "Do not store or repeat raw chat prompts as memory.",
      "Do not infer private life, intentions, or worship outside visible app activity.",
      ...memory.cautions,
    ],
    sourceBoundaries: [
      "Separate verified Quran, hadith, tafsir, or reviewed app content from AI explanation.",
      "If sources are missing or weak, say that clearly and answer generally.",
      "Do not invent source references, exact hadith numbers, scholars, books, or chains.",
    ],
    sensitiveEscalations: [
      "For fiqh, health, finance, marriage, inheritance, abuse, legal, or urgent personal matters, guide carefully and recommend qualified human help.",
      sensitive
        ? "This request appears sensitive; avoid a ruling-style answer and help the user prepare safe next steps."
        : "If the conversation becomes sensitive, switch to caution and human/scholar handoff.",
    ],
  };
}

function riskFor({
  context,
  question,
}: {
  context: BuiltNurAIContext;
  question?: unknown;
}): AIRiskLevel {
  if (hasSensitiveEscalation(question)) return "sensitive";
  if (context.mode.sourceRule === "app_context_allowed") return "low";
  return context.mode.risk;
}

function promptFor(
  plan: Omit<PersonalAIOrchestratorPlan, "prompt" | "metadata">,
) {
  const actionLines = [
    `- Primary action: ${plan.actionPlan.primary.label}${plan.actionPlan.primary.route ? ` -> ${plan.actionPlan.primary.route}` : ""}`,
    ...plan.actionPlan.secondary.map(
      (action) =>
        `- Secondary action: ${action.label}${action.route ? ` -> ${action.route}` : ""}`,
    ),
  ];

  return [
    plan.context.prompt,
    "",
    "NURAI PERSONAL AI ORCHESTRATOR:",
    `- Surface: ${plan.surface}`,
    `- Intent: ${plan.intent}`,
    `- Persona: ${plan.persona.name}, ${plan.persona.voice} ${plan.persona.relationship}`,
    "Persona rules:",
    ...plan.persona.styleRules.map((rule) => `- ${rule}`),
    "Forbidden claims:",
    ...plan.persona.forbiddenClaims.map((claim) => `- ${claim}`),
    "Action plan:",
    ...actionLines,
    "Trust contract:",
    ...plan.trust.privacyBoundaries.map((boundary) => `- Privacy: ${boundary}`),
    ...plan.trust.memoryBoundaries.map((boundary) => `- Memory: ${boundary}`),
    ...plan.trust.sourceBoundaries.map((boundary) => `- Source: ${boundary}`),
    ...plan.trust.sensitiveEscalations.map(
      (boundary) => `- Escalation: ${boundary}`,
    ),
    "",
    "RESPONSE SHAPE:",
    "- Give a helpful answer first.",
    "- Include a verified source section only when verified source context is available.",
    "- Include a short caution for sensitive or ruling-like questions.",
    "- End with the primary action and no more than two secondary options.",
  ].join("\n");
}

export function buildPersonalAIOrchestratorPlan({
  context,
  surface,
  useCase = "chat",
  feature,
  question,
}: {
  context: BuiltNurAIContext;
  surface?: PersonalAISurface;
  useCase?: AIUseCase;
  feature?: string;
  question?: unknown;
}): PersonalAIOrchestratorPlan {
  const resolvedSurface = inferSurface({ surface, feature, useCase });
  const intent = inferIntent({
    modeId: context.mode.id,
    question,
    feature,
  });
  const sensitive = hasSensitiveEscalation(question);
  const persona = personaFor({
    modeId: context.mode.id,
    memory: context.memorySummary,
  });
  const trust = buildTrustContract({
    profile: context.growthProfile,
    memory: context.memorySummary,
    sensitive,
  });
  const actionPlan = buildActionPlan({ context, intent });
  const requestSettings: PersonalAIRequestSettings = {
    useCase,
    modeId: context.mode.id,
    risk: riskFor({ context, question }),
    modelPreference: context.mode.modelPreference,
    maxOutputTokens: context.maxOutputTokens,
  };
  const basePlan = {
    version: 1 as const,
    surface: resolvedSurface,
    intent,
    context,
    persona,
    trust,
    actionPlan,
    requestSettings,
  };
  const prompt = promptFor(basePlan);

  return {
    ...basePlan,
    prompt,
    metadata: {
      serverBuiltPersonalAIOrchestrator: true,
      orchestrationVersion: 1,
      surface: resolvedSurface,
      intent,
      persona,
      trust,
      actionPlan,
      requestSettings,
      context: context.metadata,
    },
  };
}

export async function buildPersonalAIOrchestrator(
  options: PersonalAIOrchestratorOptions,
): Promise<PersonalAIOrchestratorPlan> {
  const inferredMode: AIModeInferenceResult =
    options.inferredMode ||
    inferAIModeFromText({
      message: textFrom(options.question),
      appContext: options.appContext,
      userProfile: options.userProfile,
      spiritualContext: options.spiritualContext,
    });
  const requestedMode = options.requestedMode;
  const fallbackMode: AIModeId =
    options.fallbackMode ||
    (isAIModeId(requestedMode) ? "ask_nurai" : inferredMode.modeId);
  const context = await buildNurAIPersonalContext({
    ...options,
    inferredMode,
    fallbackMode,
  });

  return buildPersonalAIOrchestratorPlan({
    context,
    surface: options.surface,
    useCase: options.useCase,
    feature: options.feature,
    question: options.question,
  });
}
