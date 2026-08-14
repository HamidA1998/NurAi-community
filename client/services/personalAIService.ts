import type {
  AIModeId,
  NurAIPlanTier,
  NurAIResponseContract,
  PersonalAIActionPlanContract,
  PersonalAIIntent,
  PersonalAISurface,
} from "@shared/nuraiAI";
import { apiRequest } from "@/lib/query-client";

export type PersonalAIRespondRequest = {
  message: string;
  modeId?: AIModeId;
  surface?: PersonalAISurface;
  feature?: string;
  userTier?: NurAIPlanTier;
  userProfile?: unknown;
  spiritualContext?: unknown;
  appContext?: unknown;
  featureContext?: unknown;
  context?: unknown;
  includeMemorySummary?: boolean;
};

export type PersonalAIRespondResult = {
  success: true;
  version: 1;
  response: NurAIResponseContract;
  answer: string;
  disclaimer: string;
  personalAI: {
    surface: PersonalAISurface;
    intent: PersonalAIIntent;
    mode: {
      id: AIModeId;
      label: string;
      description: string;
      sourceRule: string;
      responseFormat: string;
    };
    modeAccess: {
      allowed: boolean;
      fallbackUsed: boolean;
      requestedModeId?: AIModeId;
    };
    actionPlan: PersonalAIActionPlanContract;
    actionSteps: string[];
    memorySummary?: unknown;
  };
  ai: {
    provider?: string;
    modelTier?: string;
    complexity?: string;
    mode?: string;
    cached?: boolean;
    fallbackUsed?: boolean;
    latencyMs?: number;
    sourceCoverage?: string;
    needsScholar?: boolean;
    routingReason?: string;
  };
};

export async function requestPersonalAIResponse(
  request: PersonalAIRespondRequest,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<PersonalAIRespondResult> {
  if (options.signal?.aborted) {
    throw new DOMException("Personal AI request cancelled", "AbortError");
  }

  // Free V3 is intentionally deterministic and on-device. It ranks only the
  // visible context supplied by the current feature and never sends a question,
  // health signal, worship history, or profile to a model endpoint.
  if ((request.userTier || "free") === "free") {
    return buildLocalPersonalAIResult(request);
  }

  // Paid path: the server remains the source of truth for entitlement, quota,
  // model selection, memory, source grounding, and safety routing.
  try {
    const res = await apiRequest(
      "POST",
      "/api/personal-ai/respond",
      {
        message: request.message,
        question: request.message,
        modeId: request.modeId,
        surface: request.surface || "home",
        feature: request.feature,
        userTier: request.userTier || "free",
        userProfile: request.userProfile,
        spiritualContext: request.spiritualContext,
        appContext: request.appContext,
        featureContext: request.featureContext,
        context: request.context,
        includeMemorySummary: request.includeMemorySummary,
      },
      { signal: options.signal, timeoutMs: options.timeoutMs ?? 20000 },
    );
    const data = (await res.json()) as PersonalAIRespondResult;
    if (data?.success) {
      return data;
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw err;
    }
    // Network/backend/tier error — fall through to the local journey update.
  }

  return buildLocalPersonalAIResult(request);
}

function buildLocalPersonalAIResult(
  request: PersonalAIRespondRequest,
): PersonalAIRespondResult {
  const surface: PersonalAISurface = request.surface || "home";
  const modeId: AIModeId = request.modeId || "ask_nurai";
  const userTier: NurAIPlanTier = request.userTier || "free";
  const ranked = rankLocalV3Action(request);
  const answer = ranked.answer;
  const actionPlan: PersonalAIActionPlanContract = {
    primary: {
      id: ranked.id,
      label: ranked.label,
      route: ranked.route,
      reason: ranked.reason,
      kind: "open_feature",
      minimumTier: "free",
      requiresConfirmation: false,
      safetyNote: "Uses visible app activity only.",
    },
    secondary: [],
    blocked: [],
  };
  const response: NurAIResponseContract = {
    answer,
    explanation: ranked.explanation,
    verifiedSources: [],
    sourceCards: [
      {
        state: "educational_summary",
        label: "Local app status",
        sourceType: "app_content",
        note: "Ranked on this device from visible app activity. This is not a religious ruling, diagnosis, or model-generated answer.",
      },
    ],
    trustState: "educational_summary",
    caution:
      "For fiqh, health, family, or sensitive personal questions, ask a qualified human professional or scholar.",
    practicalAction: ranked.label,
    actionSuggestions: [{ label: ranked.label, route: ranked.route }],
    confidence: "high",
  };

  return {
    success: true,
    version: 1,
    response,
    answer,
    disclaimer:
      "Daily guidance ranks visible app activity on this device. It does not use cloud AI or issue rulings.",
    personalAI: {
      surface,
      intent: "handoff",
      mode: {
        id: modeId,
        label: "Personal guide",
        description: "Private on-device guidance from visible app progress.",
        sourceRule: "Local app status only",
        responseFormat: "Short journey update",
      },
      modeAccess: {
        allowed: true,
        fallbackUsed: true,
        requestedModeId: request.modeId,
      },
      actionPlan,
      actionSteps: [ranked.label],
      memorySummary: undefined,
    },
    ai: {
      provider: "local",
      modelTier: userTier,
      complexity: "paused",
      mode: "journey_update_fallback",
      cached: true,
      fallbackUsed: true,
      latencyMs: 0,
      sourceCoverage: "local_app_status",
      needsScholar: false,
      routingReason: ranked.reason,
    },
  };
}

type LocalV3Action = {
  id: string;
  label: string;
  route: string;
  reason: string;
  answer: string;
  explanation: string;
};

function visibleContextText(request: PersonalAIRespondRequest): string {
  const parts = [request.message];
  const append = (value: unknown, depth = 0) => {
    if (depth > 2 || parts.length > 24 || value == null) return;
    if (typeof value === "string") {
      const cleaned = value.replace(/\s+/g, " ").trim().slice(0, 240);
      if (cleaned) parts.push(cleaned);
      return;
    }
    if (Array.isArray(value)) {
      value.slice(0, 6).forEach((item) => append(item, depth + 1));
      return;
    }
    if (typeof value === "object") {
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) =>
          /summary|label|status|prayer|quran|dhikr|tasbeeh|sleep|health|travel|action/i.test(
            key,
          ),
        )
        .slice(0, 12)
        .forEach(([, item]) => append(item, depth + 1));
    }
  };
  append(request.appContext);
  append(request.featureContext);
  append(request.context);
  return parts.join(" ").toLowerCase();
}

function rankLocalV3Action(request: PersonalAIRespondRequest): LocalV3Action {
  const context = visibleContextText(request);
  const sensitiveQuestion =
    /\b(fatwa|ruling|halal|haram|divorce|talaq|inheritance|medical|diagnos|medication|pregnan|self[- ]?harm|suicide)\b/i.test(
      request.message,
    );

  if (sensitiveQuestion) {
    return {
      id: "open-qualified-guidance",
      label: "Find qualified guidance",
      route: "Scholars",
      reason:
        "The question needs qualified, source-aware human guidance rather than an on-device rule.",
      answer:
        "Daily guidance can organise your day, but it should not answer this as a personal ruling or medical decision. Use a qualified scholar or clinician for advice specific to you.",
      explanation:
        "NurAI keeps high-stakes religious and health decisions outside the local recommendation engine.",
    };
  }
  if (/\b(quran|ayah|surah|verse|reading target)\b/.test(context)) {
    return {
      id: "continue-quran",
      label: "Continue Quran",
      route: "QuranReader",
      reason: "Quran activity is the clearest unfinished action in view.",
      answer:
        "Continue from your saved Quran position with one short reading block. Stop at a natural pause rather than chasing a large target.",
      explanation:
        "Daily guidance gives the strongest weight to a visible, unfinished Quran action that can be completed now.",
    };
  }
  if (/\b(dhikr|tasbeeh|adhkar)\b/.test(context)) {
    return {
      id: "continue-dhikr",
      label: "Open Tasbeeh",
      route: "Tasbeeh",
      reason: "A short saved dhikr action is available in the current context.",
      answer:
        "Take one quiet minute for your saved dhikr. Keep the count simple and finish without pressure.",
      explanation:
        "Daily guidance favours a small action that fits the current moment and avoids streak pressure.",
    };
  }
  if (
    /\b(sleep|recovery|steps|hydration|water|workout|health)\b/.test(context)
  ) {
    return {
      id: "review-health",
      label: "Review Health",
      route: "HealthSignals",
      reason: "A visible wellbeing signal may affect what is realistic today.",
      answer:
        "Review today’s wellbeing signals before choosing intensity. Use trends as context, not as a diagnosis, and keep the next action realistic.",
      explanation:
        "Daily guidance uses visible wellbeing context only to adjust effort; it does not infer a condition.",
    };
  }

  return {
    id: "review-next-prayer",
    label: "Review next prayer",
    route: "PrayerTimes",
    reason:
      "Prayer is the safest time-aware default when no stronger signal is visible.",
    answer:
      "Begin with the next prayer window. Prepare early if you can, then choose one small Quran or dhikr action afterwards.",
    explanation:
      "Daily guidance uses a calm prayer-first default and does not invent missing progress or private context.",
  };
}
