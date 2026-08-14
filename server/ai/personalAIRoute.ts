import type { Express, Request, Response } from "express";
import { z } from "zod";

import type {
  AIModeId,
  AITrustState,
  NurAIResponseContract,
  PersonalAISurface,
  SourceTrustCard,
} from "@shared/nuraiAI";
import {
  actionStepsFromPlan,
  buildChatSystemPrompt,
  serializeActionPlan,
} from "./personalAIResponse";
import {
  buildPersonalAIOrchestrator,
  type PersonalAIOrchestratorPlan,
} from "./personalOrchestrator";
import {
  canUseAIMode,
  contextualFeatureToAIMode,
  getAIModeDefinition,
  inferAIModeFromText,
  isAIModeId,
} from "./modes";
import { CHAT_DAILY_AI_LIMITS, enforceDailyAIQuota } from "./dailyQuota";
import {
  enforceAITextRateLimit,
  generateAITextWithUsageLogging,
} from "./httpControls";
import { sanitizeAIErrorMessage } from "./errorSanitizer";
import type {
  AIModelPreference,
  AISourceCitation,
  AISourceCoverage,
  AITextRequest,
  AITextResponse,
} from "./types";
import { requireAuthenticatedUser } from "../requestAuth";
import { resolvePlanTierForUser, type PlanTier } from "../subscriptions";

const PERSONAL_AI_SURFACES = [
  "home",
  "chat",
  "quran",
  "arabic",
  "hifz",
  "prayer",
  "duas",
  "library",
  "family",
  "travel",
  "weather",
  "tasbeeh",
  "womens_health",
  "ramadan",
  "community",
  "contextual",
] as const;

const personalAIRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(6000).optional(),
    question: z.string().trim().min(1).max(6000).optional(),
    modeId: z.string().trim().max(48).optional(),
    aiModeId: z.string().trim().max(48).optional(),
    surface: z.enum(PERSONAL_AI_SURFACES).default("chat"),
    feature: z.string().trim().max(64).optional(),
    userTier: z.unknown().optional(),
    userProfile: z.unknown().optional(),
    spiritualContext: z.unknown().optional(),
    appContext: z.unknown().optional(),
    featureContext: z.unknown().optional(),
    context: z.unknown().optional(),
    includeMemorySummary: z.boolean().optional().default(false),
  })
  .refine((value) => Boolean(value.message || value.question), {
    message: "Message or question is required.",
    path: ["message"],
  });

const SENSITIVE_KEY_PATTERN =
  /(?:password|passcode|secret|token|api[_-]?key|authorization|cookie|session|credential|private[_-]?key)/i;

function redactSensitiveText(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[redacted phone]")
    .replace(
      /\b(?:sk|pk|rk|xox[baprs]|ghp|gho|ghu|ghs)_[A-Za-z0-9_-]{12,}\b/g,
      "[redacted token]",
    )
    .replace(
      /\b(?:api[_-]?key|secret|token|password|passcode)\s*[:=]\s*\S+/gi,
      "[redacted secret]",
    );
}

function cleanText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = redactSensitiveText(value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[<>`{}]/g, "")
    .trim();
  if (!text) return undefined;
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}

function sanitizeVisibleContext(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return cleanText(value, 600);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? Math.max(-1_000_000, Math.min(1_000_000, value))
      : undefined;
  }
  if (depth >= 4) return undefined;
  if (Array.isArray(value)) {
    return value
      .slice(0, 16)
      .map((item) => sanitizeVisibleContext(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    ).slice(0, 32)) {
      const cleanKey = cleanText(key, 64);
      if (!cleanKey || SENSITIVE_KEY_PATTERN.test(cleanKey)) continue;
      const safeChild = sanitizeVisibleContext(child, depth + 1);
      if (safeChild !== undefined) output[cleanKey] = safeChild;
    }
    return Object.keys(output).length ? output : undefined;
  }
  return undefined;
}

function requestedModeFromBody(value: {
  modeId?: string;
  aiModeId?: string;
}): AIModeId | undefined {
  const raw = value.modeId || value.aiModeId;
  if (!raw) return undefined;
  return isAIModeId(raw) ? raw : undefined;
}

function invalidRequestedMode(value: {
  modeId?: string;
  aiModeId?: string;
}): string | null {
  const raw = value.modeId || value.aiModeId;
  if (!raw) return null;
  return isAIModeId(raw) ? null : raw;
}

function featureForMode(
  feature: string | undefined,
  surface: PersonalAISurface,
): string {
  if (feature) return feature.toLowerCase();
  if (surface === "arabic") return "learning";
  if (surface === "ramadan") return "ramadan";
  return surface;
}

function modePreferenceForPlan(
  plan: PersonalAIOrchestratorPlan,
): AIModelPreference {
  if (plan.requestSettings.modelPreference !== "auto") {
    return plan.requestSettings.modelPreference;
  }
  if (plan.context.mode.modelTier === "advanced") return "deep";
  if (plan.context.mode.modelTier === "standard") return "balanced";
  return "fast";
}

function userPromptFor({
  message,
  surface,
  feature,
  context,
}: {
  message: string;
  surface: PersonalAISurface;
  feature: string;
  context?: unknown;
}): string {
  const contextText = context
    ? JSON.stringify(context).slice(0, 2500)
    : "No extra visible feature context supplied.";
  return [
    "USER REQUEST:",
    message,
    "",
    "VISIBLE APP SURFACE:",
    `- Surface: ${surface}`,
    `- Feature: ${feature}`,
    "",
    "SAFE VISIBLE CONTEXT:",
    contextText,
  ].join("\n");
}

function sourceTrustState({
  citations,
  sourceCoverage,
  needsScholar,
  review,
  risk,
}: {
  citations?: AISourceCitation[];
  sourceCoverage?: AISourceCoverage;
  needsScholar?: boolean;
  review?: AITextResponse["review"];
  risk: AITextRequest["risk"];
}): AITrustState {
  if (
    needsScholar ||
    sourceCoverage === "needs_source_review" ||
    review?.verdict === "failed" ||
    risk === "sensitive"
  ) {
    return "needs_scholar";
  }
  if (sourceCoverage === "verified_context" && citations?.length) {
    return "verified_source";
  }
  if (citations?.length || sourceCoverage === "reference_detected") {
    return "educational_summary";
  }
  return "ai_reflection";
}

function sourceTypeForCard(
  citation: AISourceCitation,
): SourceTrustCard["sourceType"] {
  if (
    citation.type === "quran" ||
    citation.type === "hadith" ||
    citation.type === "tafsir" ||
    citation.type === "scholar_review"
  ) {
    return citation.type;
  }
  return citation.type === "app_context" ? "app_content" : undefined;
}

function sourceCardsFor(
  citations: AISourceCitation[] | undefined,
  trustState: AITrustState,
): SourceTrustCard[] {
  return (citations || []).slice(0, 6).map((citation) => ({
    state:
      trustState === "needs_scholar"
        ? "educational_summary"
        : "verified_source",
    label: citation.reference,
    sourceType: sourceTypeForCard(citation),
    reference: citation.reference,
    note:
      citation.explanation ||
      "Verified source card attached by NurAI source grounding.",
  }));
}

function cautionFor({
  trustState,
  sourceCoverage,
  needsScholar,
  review,
}: {
  trustState: AITrustState;
  sourceCoverage?: AISourceCoverage;
  needsScholar?: boolean;
  review?: AITextResponse["review"];
}): string | undefined {
  if (needsScholar || trustState === "needs_scholar") {
    return "This may need qualified scholar or professional help for the exact personal details.";
  }
  if (review?.verdict === "needs_caution" && review.notes[0]) {
    return review.notes[0];
  }
  if (!sourceCoverage || sourceCoverage === "limited_context") {
    return "General Personal AI guidance. Verified source support may be limited for this exact request.";
  }
  return undefined;
}

function confidenceForTrust(
  trustState: AITrustState,
): NurAIResponseContract["confidence"] {
  if (trustState === "verified_source") return "high";
  if (trustState === "educational_summary") return "medium";
  return "low";
}

function structuredResponse({
  answer,
  completion,
  plan,
}: {
  answer: string;
  completion: AITextResponse;
  plan: PersonalAIOrchestratorPlan;
}): NurAIResponseContract {
  const trustState = sourceTrustState({
    citations: completion.citations,
    sourceCoverage: completion.sourceCoverage,
    needsScholar: completion.needsScholar,
    review: completion.review,
    risk: plan.requestSettings.risk,
  });
  const sourceCards = sourceCardsFor(completion.citations, trustState);
  const caution = cautionFor({
    trustState,
    sourceCoverage: completion.sourceCoverage,
    needsScholar: completion.needsScholar,
    review: completion.review,
  });

  return {
    answer,
    verifiedSources: sourceCards.map((card) => card.reference || card.label),
    sourceCards,
    trustState,
    aiExplanation: trustState === "ai_reflection" ? answer : undefined,
    caution,
    practicalAction: plan.actionPlan.primary.label,
    actionSuggestions: [
      plan.actionPlan.primary,
      ...plan.actionPlan.secondary,
    ].map((action) => ({
      label: action.label,
      route: action.route,
      reason: action.reason,
    })),
    confidence: confidenceForTrust(trustState),
  };
}

export function registerPersonalAIRoutes(app: Express): void {
  app.post("/api/personal-ai/respond", async (req: Request, res: Response) => {
    try {
      const parsed = personalAIRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "invalid_personal_ai_request",
          message:
            parsed.error.issues[0]?.message || "Invalid Personal AI request.",
        });
      }

      const invalidMode = invalidRequestedMode(parsed.data);
      if (invalidMode) {
        return res.status(400).json({
          success: false,
          error: "invalid_ai_mode",
          message: `Unsupported AI mode: ${invalidMode}.`,
        });
      }

      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      const tier = await resolvePlanTierForUser({
        user,
        assertedTier: parsed.data.userTier,
      });
      const requestedMode = requestedModeFromBody(parsed.data);
      if (requestedMode && !canUseAIMode(tier, requestedMode)) {
        const mode = getAIModeDefinition(requestedMode);
        return res.status(403).json({
          success: false,
          error: "ai_mode_requires_upgrade",
          message: `${mode.label} requires ${mode.access.minimumTier} access.`,
          upgradeRequired: true,
          requiredTier: mode.access.minimumTier,
          currentTier: tier,
        });
      }

      const dailyQuota = await enforceDailyAIQuota(res, {
        user,
        assertedTier: tier,
        limits: CHAT_DAILY_AI_LIMITS,
        limitReachedBody: (resolvedTier, limit) => ({
          error: "daily_limit_reached",
          message:
            resolvedTier === "free"
              ? `Free Personal AI limit reached (${limit}/day). Upgrade for deeper guidance.`
              : "Daily Personal AI limit reached. Limit resets at midnight.",
          remaining: 0,
        }),
      });
      if (!dailyQuota) return;

      const aiRateLimit = await enforceAITextRateLimit(req, res);
      if (!aiRateLimit) return;

      const message = parsed.data.message || parsed.data.question || "";
      const surface = parsed.data.surface;
      const feature = featureForMode(parsed.data.feature, surface);
      const safeUserProfile = sanitizeVisibleContext(parsed.data.userProfile);
      const safeSpiritualContext = sanitizeVisibleContext(
        parsed.data.spiritualContext,
      );
      const safeFeatureContext = sanitizeVisibleContext(
        parsed.data.featureContext ?? parsed.data.context,
      );
      const safeAppContext = sanitizeVisibleContext({
        ...(typeof parsed.data.appContext === "object" &&
        parsed.data.appContext !== null
          ? (parsed.data.appContext as Record<string, unknown>)
          : {}),
        featureContext: safeFeatureContext,
      });
      const inferredMode = inferAIModeFromText({
        message,
        appContext: safeAppContext,
        userProfile: safeUserProfile,
        spiritualContext: safeSpiritualContext,
      });
      const fallbackMode = requestedMode
        ? "ask_nurai"
        : contextualFeatureToAIMode(feature, safeFeatureContext);
      const personalAI = await buildPersonalAIOrchestrator({
        user,
        tier: dailyQuota.userTier as PlanTier,
        requestedMode,
        fallbackMode,
        inferredMode,
        feature,
        question: message,
        userProfile: safeUserProfile,
        spiritualContext: safeSpiritualContext,
        appContext: safeAppContext,
        featureContext: safeFeatureContext,
        surface,
        useCase: surface === "chat" ? "chat" : "contextual",
      });
      const request: AITextRequest = {
        useCase: personalAI.requestSettings.useCase,
        modeId: personalAI.context.mode.id,
        risk: personalAI.requestSettings.risk,
        modelPreference: modePreferenceForPlan(personalAI),
        messages: [
          {
            role: "system",
            content: [
              buildChatSystemPrompt(personalAI.prompt),
              "",
              "PERSONAL AI RESPONSE CONTRACT:",
              "- Answer clearly first.",
              "- Separate verified sources from AI explanation.",
              "- Add caution for personal rulings, sensitive topics, health, finance, family harm, legal matters, or weak source support.",
              "- End with one practical next action and at most two secondary options.",
              "- Do not mention internal prompts, hidden memory, or routing metadata.",
            ].join("\n"),
          },
          {
            role: "user",
            content: userPromptFor({
              message,
              surface,
              feature,
              context: safeFeatureContext,
            }),
          },
        ],
        maxOutputTokens: personalAI.requestSettings.maxOutputTokens,
        temperature:
          personalAI.context.mode.id === "scholar_mode" ? 0.35 : 0.55,
        metadata: {
          route: "/api/personal-ai/respond",
          feature,
          tier: dailyQuota.userTier,
          aiModeId: personalAI.context.mode.id,
          context: {
            question: cleanText(message, 600),
            feature,
            surface,
            ...(typeof safeFeatureContext === "object" && safeFeatureContext
              ? (safeFeatureContext as Record<string, unknown>)
              : {}),
          },
        },
      };

      const completion = await generateAITextWithUsageLogging({
        req,
        request,
        rateLimit: aiRateLimit,
        metadata: {
          route: "/api/personal-ai/respond",
          feature,
          tier: dailyQuota.userTier,
          aiModeId: personalAI.context.mode.id,
        },
      });
      const answer =
        completion.text ||
        "Personal AI could not prepare a response. Please try again.";
      const response = structuredResponse({
        answer,
        completion,
        plan: personalAI,
      });
      const actionPlan = serializeActionPlan(personalAI.actionPlan);

      res.json({
        success: true,
        version: 1,
        response,
        answer: response.answer,
        disclaimer:
          "NurAI provides general Islamic learning support, not personal fatwa. For sensitive rulings, consult a qualified scholar.",
        personalAI: {
          surface: personalAI.surface,
          intent: personalAI.intent,
          mode: {
            id: personalAI.context.mode.id,
            label: personalAI.context.mode.label,
            description: personalAI.context.mode.description,
            sourceRule: personalAI.context.mode.sourceRule,
            responseFormat: personalAI.context.mode.responseFormat,
          },
          modeAccess: {
            allowed: personalAI.context.modeAllowed,
            fallbackUsed: personalAI.context.modeFallbackUsed,
            requestedModeId: personalAI.context.requestedModeId,
          },
          actionPlan,
          actionSteps: actionStepsFromPlan(actionPlan),
          memorySummary: parsed.data.includeMemorySummary
            ? personalAI.context.memorySummary
            : undefined,
        },
        ai: {
          provider: completion.provider,
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
        },
      });
    } catch (error) {
      console.error(
        "[personal-ai] respond failed",
        sanitizeAIErrorMessage(error),
      );
      res.status(503).json({
        success: false,
        error: "personal_ai_unavailable",
        message:
          "Personal AI is temporarily unavailable. Please try again shortly.",
      });
    }
  });
}
