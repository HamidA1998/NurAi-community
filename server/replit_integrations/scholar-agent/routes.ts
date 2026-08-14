import type { Express, Request, Response } from "express";
import { z } from "zod";

import type { AITextRequest } from "../../ai";
import {
  enforceAITextRateLimit,
  generateAITextWithUsageLogging,
} from "../../ai/httpControls";
import { CHAT_DAILY_AI_LIMITS, enforceDailyAIQuota } from "../../ai/dailyQuota";
import { sanitizeAIErrorMessage } from "../../ai/errorSanitizer";
import { requireAuthenticatedUser } from "../../requestAuth";
import {
  buildScholarPrompt,
  buildScholarSourcePack,
  classifyScholarQuestion,
  supportedScholarFilters,
} from "../../ai/scholarAgent";
import type { ScholarAskResponse } from "@shared/scholar";

const scholarAskSchema = z.object({
  question: z.string().trim().min(4).max(1200),
  madhhab: z.string().trim().max(40).optional().nullable(),
  jurisdiction: z.string().trim().max(40).optional().nullable(),
  userLevel: z.string().trim().max(40).optional().nullable(),
  isRevert: z.boolean().optional().nullable(),
});

const SCHOLAR_DISCLAIMER =
  "NurAI Scholar provides source-backed Islamic learning only. It is not a fatwa. For rulings specific to your circumstances, consult a qualified scholar.";

function failClosedResponse(
  classification: ReturnType<typeof classifyScholarQuestion>,
  sourcePack: ReturnType<typeof buildScholarSourcePack>,
): ScholarAskResponse {
  return {
    success: false,
    answer:
      sourcePack.failClosedMessage ||
      "This exact question needs stronger verified support before NurAI Scholar can answer it safely.",
    classification,
    sourcePack,
    disclaimer: SCHOLAR_DISCLAIMER,
  };
}

export function registerScholarAgentRoutes(app: Express): void {
  app.get("/api/scholar/filters", (_req: Request, res: Response) => {
    res.json(supportedScholarFilters());
  });

  app.post("/api/scholar/ask", async (req: Request, res: Response) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      const parsed = scholarAskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "invalid_scholar_question",
          message:
            parsed.error.issues[0]?.message ||
            "Question, madhhab, or jurisdiction is invalid.",
        });
      }

      const classification = classifyScholarQuestion(parsed.data);
      const sourcePack = buildScholarSourcePack(classification);

      if (sourcePack.coverage === "needs_source_review") {
        return res.json(failClosedResponse(classification, sourcePack));
      }

      const dailyQuota = await enforceDailyAIQuota(res, {
        user,
        assertedTier: req.body?.userTier,
        limits: CHAT_DAILY_AI_LIMITS,
        limitReachedBody: (tier) => ({
          success: false,
          error: "daily_limit_reached",
          message:
            tier === "free"
              ? "Free Scholar AI allowance used. Upgrade for more source-backed answers."
              : "Daily Scholar AI allowance reached. Limit resets at midnight.",
          remaining: 0,
        }),
      });
      if (!dailyQuota) return;

      const aiRateLimit = await enforceAITextRateLimit(req, res);
      if (!aiRateLimit) return;

      const prompt = buildScholarPrompt({ classification, sourcePack });
      const aiRequest: AITextRequest = {
        useCase: "contextual",
        risk: "sensitive",
        modelPreference:
          dailyQuota.userTier === "scholar" ? "deep" : "balanced",
        messages: [
          {
            role: "system",
            content: [
              "You are NurAI Scholar, a source-grounded Islamic research assistant.",
              "Answer with humility and restraint.",
              "Use only the supplied source cards.",
              "Do not issue a binding personal ruling.",
              "If a specific ruling needs more context, say so clearly.",
            ].join("\n"),
          },
          { role: "user", content: prompt },
        ],
        maxOutputTokens: dailyQuota.userTier === "scholar" ? 1200 : 700,
        temperature: 0.2,
        metadata: {
          route: "/api/scholar/ask",
          feature: "scholar_agent",
          trustedSourceContext: true,
          question: classification.question,
          context: {
            topic: classification.primaryTopic,
            madhhab: classification.madhhabFilters,
            jurisdiction: classification.jurisdictionFilters,
            sourceRefs: sourcePack.sources.map((source) => ({
              type: source.type,
              reference: source.reference,
              url: source.url,
              verified: source.verified,
            })),
          },
        },
      };

      const completion = await generateAITextWithUsageLogging({
        req,
        request: aiRequest,
        rateLimit: aiRateLimit,
        metadata: {
          route: "/api/scholar/ask",
          topic: classification.primaryTopic,
          tier: dailyQuota.userTier,
        },
      });

      const response: ScholarAskResponse = {
        success: true,
        answer: completion.text,
        classification,
        sourcePack,
        disclaimer: SCHOLAR_DISCLAIMER,
        model: {
          provider: completion.provider,
          tier: completion.modelTier,
          latencyMs: completion.latencyMs,
        },
      };

      res.json(response);
    } catch (error) {
      console.error("[Scholar Agent] Error:", sanitizeAIErrorMessage(error));
      res.status(500).json({
        success: false,
        error: "scholar_agent_unavailable",
        message:
          "NurAI Scholar is temporarily unavailable. Please try again shortly.",
      });
    }
  });
}
