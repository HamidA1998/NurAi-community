import { createHash } from "crypto";
import { sanitizeAIErrorMessage } from "./errorSanitizer";
import type { AIRateLimitDecision } from "./rateLimit";
import type { AITextRequest, AITextResponse } from "./types";

export type AIUsageStatus = "success" | "error" | "rate_limited";
export type AIUsageTokenSource = "provider" | "estimated" | "unknown";

export interface AIUsageTokenCounts {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  source: AIUsageTokenSource;
}

export interface AIUsageRequester {
  userId?: string | number | null;
  ip?: string | null;
}

export interface AIUsageEvent {
  timestamp: string;
  retainUntil: string;
  requestId?: string;
  status: AIUsageStatus;
  useCase: AITextRequest["useCase"];
  risk: NonNullable<AITextRequest["risk"]>;
  provider?: AITextResponse["provider"];
  model?: string;
  mode?: AITextResponse["mode"];
  modelTier?: AITextResponse["modelTier"];
  complexity: NonNullable<AITextRequest["complexity"]>;
  cached?: boolean;
  fallbackUsed?: boolean;
  attemptedProviders?: AITextResponse["attemptedProviders"];
  routingReason?: string[];
  latencyMs: number;
  tokens: AIUsageTokenCounts;
  userIdHash?: string;
  ipHash?: string;
  rateLimit?: {
    allowed: boolean;
    keyHash: string;
    subjectType: AIRateLimitDecision["subjectType"];
    limit: number;
    remaining: number;
    resetAt: string;
    retryAfterMs: number;
  };
  errorName?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateAIUsageEventInput {
  request: AITextRequest;
  response?: AITextResponse;
  requester?: AIUsageRequester;
  rateLimit?: AIRateLimitDecision;
  startedAt: number;
  endedAt?: number;
  status?: AIUsageStatus;
  error?: unknown;
  providerTokens?: Partial<Omit<AIUsageTokenCounts, "source">>;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function estimateTokens(text: string): number {
  if (!text.trim()) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateAIRequestTokens(request: AITextRequest): number {
  return request.messages.reduce(
    (total, message) => total + estimateTokens(message.content),
    0,
  );
}

export function estimateAIResponseTokens(response: AITextResponse): number {
  return estimateTokens(response.text);
}

function buildTokenCounts(input: CreateAIUsageEventInput): AIUsageTokenCounts {
  if (
    input.providerTokens &&
    (input.providerTokens.inputTokens !== undefined ||
      input.providerTokens.outputTokens !== undefined ||
      input.providerTokens.totalTokens !== undefined)
  ) {
    return {
      inputTokens: input.providerTokens.inputTokens,
      outputTokens: input.providerTokens.outputTokens,
      totalTokens: input.providerTokens.totalTokens,
      source: "provider",
    };
  }

  if (input.response) {
    const inputTokens = estimateAIRequestTokens(input.request);
    const outputTokens = estimateAIResponseTokens(input.response);
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      source: "estimated",
    };
  }

  return {
    inputTokens: estimateAIRequestTokens(input.request),
    source: "estimated",
  };
}

function errorFields(
  error: unknown,
): Pick<AIUsageEvent, "errorName" | "errorMessage"> {
  if (!error) return {};
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: sanitizeAIErrorMessage(error),
    };
  }
  return { errorMessage: sanitizeAIErrorMessage(error) };
}

const SAFE_METADATA_KEYS = new Set([
  "route",
  "feature",
  "tier",
  "assertedUserTier",
  "conversationId",
  "surah",
  "verse",
  "surahNumber",
  "ayahNumber",
  "model",
  "provider",
  "aiModeId",
]);

export const AI_USAGE_LOG_RETENTION_DAYS = 30;

function usageLogRetainUntil(timestamp: number): string {
  return new Date(
    timestamp + AI_USAGE_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;

  const safeEntries = Object.entries(metadata).filter(([key, value]) => {
    if (!SAFE_METADATA_KEYS.has(key)) return false;
    return (
      value === null || ["string", "number", "boolean"].includes(typeof value)
    );
  });

  return safeEntries.length ? Object.fromEntries(safeEntries) : undefined;
}

export function createAIUsageEvent(
  input: CreateAIUsageEventInput,
): AIUsageEvent {
  const endedAt = input.endedAt ?? Date.now();
  const status =
    input.status ??
    (input.error ? "error" : input.response ? "success" : "error");
  const response = input.response;
  const requester = input.requester;
  const rateLimit = input.rateLimit;

  return {
    timestamp: new Date(endedAt).toISOString(),
    retainUntil: usageLogRetainUntil(endedAt),
    requestId: input.requestId,
    status,
    useCase: input.request.useCase,
    risk: input.request.risk || "low",
    provider: response?.provider,
    model: response?.model,
    mode: response?.mode,
    modelTier: response?.modelTier,
    complexity: input.request.complexity || response?.complexity || "standard",
    cached: response?.cached,
    fallbackUsed: response?.fallbackUsed,
    attemptedProviders: response?.attemptedProviders,
    routingReason: response?.routingReason,
    latencyMs: Math.max(endedAt - input.startedAt, response?.latencyMs ?? 0, 0),
    tokens: buildTokenCounts(input),
    userIdHash:
      requester?.userId !== undefined && requester.userId !== null
        ? hashIdentifier(String(requester.userId))
        : undefined,
    ipHash: requester?.ip ? hashIdentifier(requester.ip) : undefined,
    rateLimit: rateLimit
      ? {
          allowed: rateLimit.allowed,
          keyHash: hashIdentifier(rateLimit.key),
          subjectType: rateLimit.subjectType,
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt.toISOString(),
          retryAfterMs: rateLimit.retryAfterMs,
        }
      : undefined,
    ...errorFields(input.error),
    metadata: sanitizeMetadata(input.metadata),
  };
}

export function logAIUsageEvent(event: AIUsageEvent): void {
  if (process.env.AI_USAGE_LOGGING === "false") return;
  const level = event.status === "success" ? "info" : "warn";
  console[level]("[NurAI AI Usage]", JSON.stringify(event));
}
