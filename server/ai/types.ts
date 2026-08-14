import type { AIModeId } from "@shared/nuraiAI";

export type AIProviderId = "openai" | "local";

export type AIRouterMode = "openai" | "local" | "hybrid";

export type AIUseCase =
  | "chat"
  | "contextual"
  | "tafsir"
  | "summary"
  | "classification"
  | "nudge"
  | "utility";

export type AIRiskLevel = "low" | "religious" | "sensitive";

export type AIComplexity = "simple" | "standard" | "complex";

export type AIModelTier = "local" | "fast" | "balanced" | "deep";

export type AIModelPreference = "auto" | "local" | "fast" | "balanced" | "deep";

export type AISourceCitationType =
  | "quran"
  | "hadith"
  | "tafsir"
  | "fiqh"
  | "seerah"
  | "scholar_review"
  | "app_context"
  | "official_service";

export type AISourceCoverage =
  | "verified_context"
  | "reference_detected"
  | "limited_context"
  | "needs_source_review";

export interface AISourceCitation {
  type: AISourceCitationType;
  reference: string;
  quote?: string;
  explanation?: string;
  url?: string | null;
  provenance?:
    | "exact_reference"
    | "metadata_context"
    | "keyword_anchor"
    | "official_service"
    | "reviewed_app_content";
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AITextRequest {
  useCase: AIUseCase;
  modeId?: AIModeId;
  messages: AIMessage[];
  risk?: AIRiskLevel;
  complexity?: AIComplexity;
  modelPreference?: AIModelPreference;
  preferredModel?: string;
  localModel?: string;
  maxOutputTokens?: number;
  temperature?: number;
  localEligible?: boolean;
  cacheTtlMs?: number;
  metadata?: Record<string, unknown>;
}

export interface AITextResponse {
  text: string;
  provider: AIProviderId;
  model: string;
  mode: AIRouterMode;
  modelTier: AIModelTier;
  complexity: AIComplexity;
  routingReason: string[];
  attemptedProviders: AIProviderId[];
  cached: boolean;
  fallbackUsed: boolean;
  latencyMs: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  citations?: AISourceCitation[];
  sourceCoverage?: AISourceCoverage;
  needsScholar?: boolean;
  review?: {
    enabled: boolean;
    performed: boolean;
    verdict: "pass" | "needs_caution" | "skipped" | "failed";
    reviewerModel?: string;
    notes: string[];
    latencyMs?: number;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
  };
}

export interface AIProvider {
  id: AIProviderId;
  configured(): boolean;
  generateText(request: AITextRequest): Promise<AITextResponse>;
  health(): Promise<AIProviderHealth>;
}

export interface AIProviderHealth {
  provider: AIProviderId;
  configured: boolean;
  healthy: boolean;
  model?: string;
  baseUrl?: string;
  models?: {
    id: string;
    model: string;
    baseUrl: string;
    healthy: boolean;
    enabled: boolean;
    error?: string;
  }[];
  error?: string;
  checkedAt: string;
}
