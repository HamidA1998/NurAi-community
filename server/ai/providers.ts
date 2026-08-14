import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  getAIConfig,
  isCloudAIConfigured,
  isLocalAIConfigured,
  type LocalAIModelConfig,
} from "./config";
import {
  getCloudOpenAIClient,
  getLocalOpenAICompatibleClient,
} from "./openaiClients";
import { sanitizeAIErrorMessage } from "./errorSanitizer";
import type {
  AIProvider,
  AIProviderHealth,
  AITextRequest,
  AITextResponse,
} from "./types";

function toOpenAIMessages(
  messages: AITextRequest["messages"],
): ChatCompletionMessageParam[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function buildCompletionParams(request: AITextRequest, model: string) {
  const params: Record<string, unknown> = {
    model,
    messages: toOpenAIMessages(request.messages),
  };

  if (request.maxOutputTokens) {
    if (model.startsWith("gpt-5")) {
      params.max_completion_tokens = request.maxOutputTokens;
    } else {
      params.max_tokens = request.maxOutputTokens;
    }
  }

  if (request.temperature !== undefined && !model.startsWith("gpt-5")) {
    params.temperature = request.temperature;
  }

  return params;
}

function extractText(response: any): string {
  const choice = response.choices?.[0];
  const content = choice?.message?.content;
  const stripReasoning = (text: string): string => {
    const withoutClosedThink = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
    if (/^\s*<think>/i.test(withoutClosedThink)) return "";
    return withoutClosedThink.trim();
  };

  if (Array.isArray(content)) {
    return stripReasoning(
      content
        .map((part) => ("text" in part ? part.text : ""))
        .join("")
        .trim(),
    );
  }
  return typeof content === "string" ? stripReasoning(content) : "";
}

function withLocalNoReasoningGuard(request: AITextRequest): AITextRequest {
  const guard =
    "Do not output hidden reasoning, chain-of-thought, or <think> tags. Answer directly and concisely.";
  const firstSystemIndex = request.messages.findIndex(
    (message) => message.role === "system",
  );

  if (firstSystemIndex >= 0) {
    const messages = [...request.messages];
    messages[firstSystemIndex] = {
      ...messages[firstSystemIndex],
      content: `${messages[firstSystemIndex].content}\n\n${guard}`,
    };
    return { ...request, messages };
  }

  return {
    ...request,
    messages: [{ role: "system", content: guard }, ...request.messages],
  };
}

function requireAssistantText(text: string, model: string): string {
  if (!text) {
    throw new Error(`${model} returned no assistant text.`);
  }
  return text;
}

function extractUsage(response: any): AITextResponse["usage"] {
  const usage = response?.usage;
  if (!usage || typeof usage !== "object") return undefined;
  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  };
}

function requestWordCount(request: AITextRequest): number {
  return request.messages
    .map((message) => message.content)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function scoreLocalModel(
  candidate: LocalAIModelConfig,
  request: AITextRequest,
): number {
  let score = 0;
  const roles = new Set(candidate.roles);
  const words = requestWordCount(request);

  if (request.localModel) {
    if (candidate.id === request.localModel) score += 100;
    if (candidate.model === request.localModel) score += 100;
  }

  if (words > 700 && roles.has("long-context")) score += 20;
  if (request.complexity === "complex" && roles.has("deep")) score += 18;
  if (request.useCase === "summary" && roles.has("long-context")) score += 10;
  if (request.useCase === "classification" && roles.has("fast")) score += 8;
  if (request.useCase === "nudge" && roles.has("fast")) score += 8;
  if (roles.has("general")) score += 4;
  if (roles.has("experimental") && !request.localModel) score -= 12;

  return score;
}

function localModelCandidates(request: AITextRequest): LocalAIModelConfig[] {
  const config = getAIConfig();
  const enabled = config.localModels.filter((candidate) => candidate.enabled);
  const candidates =
    request.localModel &&
    !enabled.some(
      (candidate) =>
        candidate.id === request.localModel ||
        candidate.model === request.localModel,
    )
      ? [
          {
            id: "request-local-model",
            label: "Requested Local Model",
            baseUrl: config.localBaseUrl,
            model: request.localModel,
            roles: ["general"],
            enabled: true,
          },
          ...enabled,
        ]
      : enabled;

  return [...candidates].sort(
    (first, second) =>
      scoreLocalModel(second, request) - scoreLocalModel(first, request),
  );
}

export class OpenAITextProvider implements AIProvider {
  id = "openai" as const;

  configured(): boolean {
    return isCloudAIConfigured(getAIConfig());
  }

  async generateText(request: AITextRequest): Promise<AITextResponse> {
    const started = Date.now();
    const config = getAIConfig();
    const model = request.preferredModel || config.cloudDefaultModel;
    const client = getCloudOpenAIClient();
    const response = await client.chat.completions.create(
      buildCompletionParams(request, model) as any,
    );
    const text = requireAssistantText(extractText(response as any), model);
    return {
      text,
      provider: this.id,
      model,
      mode: config.mode,
      modelTier: "balanced",
      complexity: request.complexity || "standard",
      routingReason: [],
      attemptedProviders: [this.id],
      cached: false,
      fallbackUsed: false,
      latencyMs: Date.now() - started,
      usage: extractUsage(response as any),
    };
  }

  async health(): Promise<AIProviderHealth> {
    const config = getAIConfig();
    return {
      provider: this.id,
      configured: this.configured(),
      healthy: this.configured(),
      model: config.cloudDefaultModel,
      baseUrl: config.cloudBaseUrl ? "custom" : "default",
      checkedAt: new Date().toISOString(),
    };
  }
}

export class LocalOpenAICompatibleTextProvider implements AIProvider {
  id = "local" as const;

  configured(): boolean {
    return isLocalAIConfigured(getAIConfig());
  }

  async generateText(request: AITextRequest): Promise<AITextResponse> {
    const started = Date.now();
    const config = getAIConfig();
    const candidates = localModelCandidates(request);
    const errors: string[] = [];

    for (const candidate of candidates) {
      try {
        const localRequest = withLocalNoReasoningGuard(request);
        const client = getLocalOpenAICompatibleClient({
          apiKey: config.localApiKey,
          baseUrl: candidate.baseUrl,
          timeoutMs: config.localTimeoutMs,
        });
        const response = await client.chat.completions.create(
          buildCompletionParams(localRequest, candidate.model) as any,
        );
        const text = requireAssistantText(
          extractText(response as any),
          candidate.model,
        );
        return {
          text,
          provider: this.id,
          model: candidate.model,
          mode: config.mode,
          modelTier: "local",
          complexity: request.complexity || "simple",
          routingReason: [],
          attemptedProviders: [this.id],
          cached: false,
          fallbackUsed: false,
          latencyMs: Date.now() - started,
          usage: extractUsage(response as any),
        };
      } catch (error) {
        const message = sanitizeAIErrorMessage(error);
        errors.push(`${candidate.id}: ${message}`);
        console.warn(
          `[NurAI AI Router] local model ${candidate.id} failed:`,
          message,
        );
      }
    }

    throw new Error(
      `No local AI model was able to generate a response. ${errors.join(" | ")}`,
    );
  }

  async health(): Promise<AIProviderHealth> {
    const config = getAIConfig();
    const checkedAt = new Date().toISOString();
    if (!this.configured()) {
      return {
        provider: this.id,
        configured: false,
        healthy: false,
        model: config.localDefaultModel,
        baseUrl: config.localBaseUrl,
        checkedAt,
      };
    }

    try {
      const checks = await Promise.all(
        config.localModels.map(async (candidate) => {
          if (!candidate.enabled) {
            return {
              id: candidate.id,
              model: candidate.model,
              baseUrl: candidate.baseUrl,
              healthy: false,
              enabled: false,
            };
          }

          try {
            const client = getLocalOpenAICompatibleClient({
              apiKey: config.localApiKey,
              baseUrl: candidate.baseUrl,
              timeoutMs: config.localTimeoutMs,
            });
            await client.models.list();
            return {
              id: candidate.id,
              model: candidate.model,
              baseUrl: candidate.baseUrl,
              healthy: true,
              enabled: true,
            };
          } catch (error) {
            return {
              id: candidate.id,
              model: candidate.model,
              baseUrl: candidate.baseUrl,
              healthy: false,
              enabled: true,
              error:
                error instanceof Error
                  ? sanitizeAIErrorMessage(error)
                  : "Local model endpoint unavailable",
            };
          }
        }),
      );
      const healthy = checks.some((check) => check.healthy);
      return {
        provider: this.id,
        configured: true,
        healthy,
        model: config.localDefaultModel,
        baseUrl: config.localBaseUrl,
        models: checks,
        checkedAt,
      };
    } catch (error) {
      return {
        provider: this.id,
        configured: true,
        healthy: false,
        model: config.localDefaultModel,
        baseUrl: config.localBaseUrl,
        error:
          error instanceof Error
            ? sanitizeAIErrorMessage(error)
            : "Local model endpoint unavailable",
        checkedAt,
      };
    }
  }
}
