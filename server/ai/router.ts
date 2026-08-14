import { selectAIModel } from "./modelSelector";
import {
  LocalOpenAICompatibleTextProvider,
  OpenAITextProvider,
} from "./providers";
import { getAIConfig } from "./config";
import { sanitizeAIErrorMessage } from "./errorSanitizer";
import {
  buildSourceGrounding,
  citationsAppearingInAnswer,
  sourceCoverageForAnswer,
  withSourceGroundingPrompt,
} from "./sourceGrounding";
import type {
  AIModelTier,
  AIProvider,
  AIProviderId,
  AITextRequest,
  AITextResponse,
} from "./types";

function createDefaultProviderRegistry(): Record<AIProviderId, AIProvider> {
  return {
    openai: new OpenAITextProvider(),
    local: new LocalOpenAICompatibleTextProvider(),
  };
}

let providerRegistry = createDefaultProviderRegistry();

interface CacheEntry {
  expiresAt: number;
  response: AITextResponse;
}

const textCache = new Map<string, CacheEntry>();

interface SourceGroundingResult {
  citations: NonNullable<AITextResponse["citations"]>;
  sourceCoverage: NonNullable<AITextResponse["sourceCoverage"]>;
  needsScholar: boolean;
}

function cacheKey(request: AITextRequest, providerId: string): string {
  return JSON.stringify({
    providerId,
    useCase: request.useCase,
    risk: request.risk || "low",
    preferredModel: request.preferredModel,
    localModel: request.localModel,
    modelPreference: request.modelPreference,
    complexity: request.complexity,
    maxOutputTokens: request.maxOutputTokens,
    temperature: request.temperature,
    localEligible: request.localEligible,
    metadata: request.metadata,
    messages: request.messages,
  });
}

function withTrustGuard(request: AITextRequest): AITextRequest {
  const risk = request.risk || "low";
  if (risk === "low") return request;

  const guard = [
    "NURAI TRUST LAYER:",
    "- Do not fabricate Quran, hadith, tafsir, scholar, or book references.",
    "- If a precise source is not available in the prompt/context, state that clearly.",
    "- Do not issue binding personal fatwa.",
    "- For medical, legal, or highly personal rulings, advise consulting a qualified professional/scholar.",
    "- Prefer concise, source-aware wording over confident unsupported claims.",
  ].join("\n");

  const firstSystemIndex = request.messages.findIndex(
    (message) => message.role === "system",
  );
  if (firstSystemIndex >= 0) {
    const nextMessages = [...request.messages];
    nextMessages[firstSystemIndex] = {
      ...nextMessages[firstSystemIndex],
      content: `${nextMessages[firstSystemIndex].content}\n\n${guard}`,
    };
    return { ...request, messages: nextMessages };
  }

  return {
    ...request,
    messages: [{ role: "system", content: guard }, ...request.messages],
  };
}

function providerForId(providerId: AIProviderId): AIProvider {
  return providerRegistry[providerId];
}

function responseTierForProvider(
  providerId: AIProviderId,
  selectedTier: AIModelTier,
): AIModelTier {
  if (providerId === "local") return "local";
  return selectedTier === "local" ? "fast" : selectedTier;
}

function shouldUseSourceGrounding(request: AITextRequest): boolean {
  return (
    request.risk === "religious" ||
    request.risk === "sensitive" ||
    request.useCase === "chat" ||
    request.useCase === "contextual" ||
    request.useCase === "tafsir"
  );
}

function reviewIsImportant({
  request,
  selectionTier,
  sourceGrounding,
}: {
  request: AITextRequest;
  selectionTier: AIModelTier;
  sourceGrounding: SourceGroundingResult | null;
}): boolean {
  if (!sourceGrounding) return false;

  const risk = request.risk || "low";
  return (
    risk === "sensitive" ||
    sourceGrounding.needsScholar ||
    sourceGrounding.sourceCoverage === "needs_source_review" ||
    selectionTier === "deep"
  );
}

function localProtectedReviewRequired({
  request,
  response,
  selectionTier,
  sourceGrounding,
}: {
  request: AITextRequest;
  response: AITextResponse;
  selectionTier: AIModelTier;
  sourceGrounding: SourceGroundingResult | null;
}): boolean {
  const risk = request.risk || "low";
  return (
    response.provider === "local" &&
    (risk === "religious" ||
      risk === "sensitive" ||
      request.useCase === "tafsir") &&
    reviewIsImportant({ request, selectionTier, sourceGrounding })
  );
}

function reviewMode(): "off" | "auto" | "strict" {
  const raw = (process.env.NURAI_AI_REVIEW_MODE || "auto").toLowerCase();
  if (raw === "off" || raw === "false" || raw === "0") return "off";
  if (raw === "strict") return "strict";
  return "auto";
}

function shouldReviewResponse({
  request,
  response,
  selectionTier,
  sourceGrounding,
}: {
  request: AITextRequest;
  response: AITextResponse;
  selectionTier: AIModelTier;
  sourceGrounding: SourceGroundingResult | null;
}): boolean {
  const mode = reviewMode();
  if (mode === "off") return false;
  const important = reviewIsImportant({
    request,
    selectionTier,
    sourceGrounding,
  });
  const localProtected = localProtectedReviewRequired({
    request,
    response,
    selectionTier,
    sourceGrounding,
  });

  if (!important) return false;
  if (!sourceGrounding) return false;
  if (!providerForId("openai").configured()) return false;
  if (mode === "strict" || localProtected) return true;
  if (
    sourceGrounding.sourceCoverage === "verified_context" &&
    sourceCoverageForAnswer(
      request,
      response.text,
      sourceGrounding.citations,
      sourceGrounding.needsScholar,
    ) !== "verified_context"
  ) {
    return true;
  }
  return (
    response.provider === "local" ||
    sourceGrounding.sourceCoverage !== "verified_context"
  );
}

function parseReviewResult(text: string): {
  verdict: "pass" | "needs_caution";
  notes: string[];
} {
  try {
    const parsed = JSON.parse(text);
    const verdict = parsed.verdict === "pass" ? "pass" : "needs_caution";
    const notes = Array.isArray(parsed.concerns)
      ? parsed.concerns.map((item: unknown) => String(item)).filter(Boolean)
      : [];
    if (typeof parsed.safeNote === "string" && parsed.safeNote.trim()) {
      notes.unshift(parsed.safeNote.trim());
    }
    return { verdict, notes };
  } catch {
    return {
      verdict: "needs_caution",
      notes: [
        "Reviewer did not return parseable JSON. Treat this response with extra source caution.",
      ],
    };
  }
}

function combineUsage(
  first?: AITextResponse["usage"],
  second?: AITextResponse["usage"],
): AITextResponse["usage"] {
  if (!first && !second) return undefined;
  return {
    inputTokens: (first?.inputTokens || 0) + (second?.inputTokens || 0),
    outputTokens: (first?.outputTokens || 0) + (second?.outputTokens || 0),
    totalTokens: (first?.totalTokens || 0) + (second?.totalTokens || 0),
  };
}

function strictReviewBlockedText(
  _review: NonNullable<AITextResponse["review"]>,
): string {
  return "I can share the general principle, but I do not have enough verified source context to answer the personal details safely. Add a little more context and I will keep the guidance focused. For a ruling specific to your circumstances, please consult a qualified scholar.";
}

function sourceFailClosedRequired({
  request,
  sourceGrounding,
}: {
  request: AITextRequest;
  sourceGrounding: SourceGroundingResult | null;
}): boolean {
  if (!sourceGrounding) return false;
  return (
    request.risk === "sensitive" ||
    sourceGrounding.needsScholar ||
    sourceGrounding.sourceCoverage === "needs_source_review"
  );
}

async function reviewResponseIfNeeded({
  request,
  response,
  selectionTier,
  sourceGrounding,
}: {
  request: AITextRequest;
  response: AITextResponse;
  selectionTier: AIModelTier;
  sourceGrounding: SourceGroundingResult | null;
}): Promise<AITextResponse["review"]> {
  const enabled = reviewMode() !== "off";
  const important = reviewIsImportant({
    request,
    selectionTier,
    sourceGrounding,
  });
  const localProtected = localProtectedReviewRequired({
    request,
    response,
    selectionTier,
    sourceGrounding,
  });

  if (
    enabled &&
    (reviewMode() === "strict" || localProtected) &&
    important &&
    !providerForId("openai").configured()
  ) {
    return {
      enabled: true,
      performed: false,
      verdict: "failed",
      notes: [
        localProtected
          ? "Protected local AI review is required before returning this religious or sensitive answer, but the OpenAI reviewer is not configured."
          : "Strict AI review is required for this answer, but the OpenAI reviewer is not configured.",
      ],
    };
  }

  if (
    !shouldReviewResponse({
      request,
      response,
      selectionTier,
      sourceGrounding,
    })
  ) {
    return {
      enabled,
      performed: false,
      verdict: "skipped",
      notes: enabled
        ? ["Review not required for this request/provider/source coverage."]
        : ["Review mode is disabled."],
    };
  }

  const started = Date.now();
  const config = getAIConfig();
  const reviewerModel = config.cloudFastModel || config.cloudBalancedModel;
  const sourceCards = (sourceGrounding?.citations || [])
    .map(
      (source, index) =>
        `${index + 1}. ${source.reference} [${source.type}] ${
          source.explanation || ""
        }`,
    )
    .join("\n");

  try {
    const review = await providerForId("openai").generateText({
      useCase: "classification",
      risk: request.risk,
      complexity: "standard",
      preferredModel: reviewerModel,
      messages: [
        {
          role: "system",
          content:
            "You are NurAI's source-safety reviewer. Return JSON only. Do not answer the user.",
        },
        {
          role: "user",
          content: `Check whether the answer stays within the verified source cards and avoids unsupported Islamic claims.

Return exactly:
{"verdict":"pass"|"needs_caution","concerns":["short concern"],"safeNote":"short caution if needed"}

Verified source cards:
${sourceCards || "None"}

User/request context:
${request.messages
  .map((message) => `${message.role}: ${message.content}`)
  .join("\n")
  .slice(0, 4000)}

Answer:
${response.text.slice(0, 5000)}`,
        },
      ],
      maxOutputTokens: 220,
      temperature: 0,
    });

    const parsed = parseReviewResult(review.text);
    return {
      enabled: true,
      performed: true,
      verdict: parsed.verdict,
      reviewerModel,
      notes: parsed.notes,
      latencyMs: Date.now() - started,
      usage: review.usage,
    };
  } catch (error) {
    return {
      enabled: true,
      performed: false,
      verdict: "failed",
      reviewerModel,
      notes: [
        error instanceof Error
          ? sanitizeAIErrorMessage(error)
          : "AI review failed for an unknown reason.",
      ],
      latencyMs: Date.now() - started,
    };
  }
}

async function tryProvider(
  provider: AIProvider,
  request: AITextRequest,
): Promise<AITextResponse> {
  if (!provider.configured()) {
    throw new Error(`${provider.id} AI provider is not configured`);
  }

  const canCache = (request.risk || "low") === "low";
  const key =
    request.cacheTtlMs && canCache ? cacheKey(request, provider.id) : "";
  if (key) {
    const cached = textCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.response,
        cached: true,
        latencyMs: 0,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      };
    }
  }

  const response = await provider.generateText(request);
  if (key) {
    textCache.set(key, {
      expiresAt: Date.now() + Math.max(0, request.cacheTtlMs || 0),
      response,
    });
  }
  return response;
}

export async function generateAIText(
  request: AITextRequest,
): Promise<AITextResponse> {
  const sourceGrounding = shouldUseSourceGrounding(request)
    ? buildSourceGrounding(request)
    : null;
  const groundedRequest = sourceGrounding
    ? withSourceGroundingPrompt(request, sourceGrounding.sourcePrompt)
    : request;
  const guardedRequest = withTrustGuard(groundedRequest);
  const selection = selectAIModel(guardedRequest);
  const selectedRequest: AITextRequest = {
    ...guardedRequest,
    complexity: selection.complexity,
    preferredModel: selection.cloudModel,
    localModel: selection.localModel,
  };
  const providers = selection.providerOrder.map(providerForId);
  let lastError: unknown;

  if (providers.length === 0) {
    throw new Error(
      "No AI provider is allowed for this request under the current safety configuration.",
    );
  }

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const attemptedProviders = selection.providerOrder.slice(0, i + 1);
    try {
      const response = await tryProvider(provider, selectedRequest);
      const review = await reviewResponseIfNeeded({
        request: selectedRequest,
        response,
        selectionTier: selection.tier,
        sourceGrounding,
      });
      const strictBlocked =
        reviewMode() === "strict" &&
        reviewIsImportant({
          request: selectedRequest,
          selectionTier: selection.tier,
          sourceGrounding,
        }) &&
        review &&
        review.verdict !== "pass";
      const reviewBlocked =
        sourceFailClosedRequired({
          request: selectedRequest,
          sourceGrounding,
        }) &&
        review &&
        (review.verdict === "needs_caution" || review.verdict === "failed");
      const failClosedRequired = sourceFailClosedRequired({
        request: selectedRequest,
        sourceGrounding,
      });
      const preliminaryCoverage =
        sourceGrounding && !strictBlocked && !reviewBlocked
          ? failClosedRequired
            ? sourceCoverageForAnswer(
                selectedRequest,
                response.text,
                sourceGrounding.citations,
                sourceGrounding.needsScholar,
              )
            : selectedRequest.risk === "religious" ||
                selectedRequest.risk === "sensitive" ||
                selectedRequest.useCase === "tafsir" ||
                selectedRequest.useCase === "contextual"
              ? sourceCoverageForAnswer(
                  selectedRequest,
                  response.text,
                  sourceGrounding.citations,
                  sourceGrounding.needsScholar,
                )
              : sourceGrounding.sourceCoverage
          : sourceGrounding
            ? "needs_source_review"
            : undefined;
      const sourceCoverageBlocked =
        Boolean(sourceGrounding) &&
        (selectedRequest.risk === "religious" ||
          selectedRequest.risk === "sensitive" ||
          selectedRequest.useCase === "tafsir") &&
        preliminaryCoverage === "needs_source_review";
      const blocked = strictBlocked || reviewBlocked || sourceCoverageBlocked;
      const blockedReview: NonNullable<AITextResponse["review"]> = review ?? {
        enabled: reviewMode() !== "off",
        performed: false,
        verdict: "failed",
        notes: [
          "Verified source coverage was not strong enough for this religious or sensitive answer.",
        ],
      };
      const responseText = blocked
        ? strictReviewBlockedText(blockedReview)
        : response.text;
      const answerCitations =
        sourceGrounding && !blocked
          ? (() => {
              const appearing = citationsAppearingInAnswer(
                responseText,
                sourceGrounding.citations,
              );
              return appearing.length
                ? appearing
                : sourceGrounding.citations.slice(0, 4);
            })()
          : [];
      const answerSourceCoverage =
        sourceGrounding && !blocked
          ? preliminaryCoverage
          : sourceGrounding
            ? "needs_source_review"
            : undefined;
      return {
        ...response,
        text: responseText,
        modelTier: responseTierForProvider(provider.id, selection.tier),
        complexity: selection.complexity,
        routingReason: [
          ...selection.reasons,
          ...(sourceGrounding
            ? [`source grounding: ${sourceGrounding.sourceCoverage}`]
            : []),
        ],
        attemptedProviders,
        fallbackUsed: i > 0,
        usage: combineUsage(response.usage, review?.usage),
        citations: sourceGrounding ? answerCitations : undefined,
        sourceCoverage: answerSourceCoverage,
        needsScholar: sourceGrounding?.needsScholar,
        review: blocked ? blockedReview : review,
      };
    } catch (error) {
      lastError = error;
      console.warn(
        `[NurAI AI Router] ${provider.id} failed:`,
        sanitizeAIErrorMessage(error),
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No AI provider was able to generate a response");
}

export async function getAIHealth() {
  const [cloud, local] = await Promise.all([
    providerForId("openai").health(),
    providerForId("local").health(),
  ]);
  return { cloud, local };
}

export function __setAIProvidersForTesting(
  providers: Partial<Record<AIProviderId, AIProvider>>,
) {
  providerRegistry = {
    ...providerRegistry,
    ...providers,
  };
  textCache.clear();
}

export function __resetAIProvidersForTesting() {
  providerRegistry = createDefaultProviderRegistry();
  textCache.clear();
}
