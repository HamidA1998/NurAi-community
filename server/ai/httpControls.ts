import type { Request, Response } from "express";
import { generateAIText } from "./router";
import {
  DEFAULT_AI_TEXT_RATE_LIMIT,
  durableAITextRateLimiter,
  getAIRateLimitSubjectFromRequest,
  type AIRateLimitDecision,
  type AIRateLimitPolicy,
} from "./rateLimit";
import { createAIUsageEvent, logAIUsageEvent } from "./usage";
import type { AITextRequest, AITextResponse } from "./types";

export async function enforceAITextRateLimit(
  req: Request,
  res: Response,
  policy: AIRateLimitPolicy = DEFAULT_AI_TEXT_RATE_LIMIT,
): Promise<AIRateLimitDecision | null> {
  const decision = await durableAITextRateLimiter.check(
    getAIRateLimitSubjectFromRequest(req),
    policy,
  );

  res.setHeader("X-AI-RateLimit-Limit", String(decision.limit));
  res.setHeader("X-AI-RateLimit-Remaining", String(decision.remaining));
  res.setHeader("X-AI-RateLimit-Reset", decision.resetAt.toISOString());

  if (!decision.allowed) {
    res.setHeader(
      "Retry-After",
      String(Math.ceil(decision.retryAfterMs / 1000)),
    );
    res.status(429).json({
      error: "ai_rate_limited",
      message:
        "Too many AI requests in a short period. Please wait a moment and try again.",
      remaining: 0,
      resetAt: decision.resetAt.toISOString(),
    });
    return null;
  }

  return decision;
}

export async function generateAITextWithUsageLogging({
  req,
  request,
  rateLimit,
  metadata,
}: {
  req: Request;
  request: AITextRequest;
  rateLimit?: AIRateLimitDecision;
  metadata?: Record<string, unknown>;
}): Promise<AITextResponse> {
  const startedAt = Date.now();
  const requester = getAIRateLimitSubjectFromRequest(req);
  const requestId =
    typeof req.headers["x-request-id"] === "string"
      ? req.headers["x-request-id"]
      : undefined;

  try {
    const response = await generateAIText(request);
    logAIUsageEvent(
      createAIUsageEvent({
        request,
        response,
        requester,
        rateLimit,
        startedAt,
        requestId,
        metadata,
        providerTokens: response.usage,
      }),
    );
    return response;
  } catch (error) {
    logAIUsageEvent(
      createAIUsageEvent({
        request,
        requester,
        rateLimit,
        startedAt,
        requestId,
        status: "error",
        error,
        metadata,
      }),
    );
    throw error;
  }
}
