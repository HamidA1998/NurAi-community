import type { AITextResponse } from "../../ai";
import type { buildStructuredAIResponseExtras } from "../nurai-context/structuredResponse";

type StructuredExtras = ReturnType<typeof buildStructuredAIResponseExtras>;

export function aiMessageMetadata(params: {
  completion: AITextResponse;
  structuredExtras: StructuredExtras;
}): Record<string, unknown> {
  return {
    question: params.structuredExtras.question,
    citations: params.structuredExtras.citations,
    sourceCoverage: params.structuredExtras.sourceCoverage,
    needsScholar: params.structuredExtras.needsScholar,
    warnings: params.structuredExtras.warnings,
    actionSteps: params.structuredExtras.actionSteps,
    actionPlan: params.structuredExtras.actionPlan,
    followUpPrompts: params.structuredExtras.followUpPrompts,
    confidence: params.structuredExtras.confidence,
    ai: {
      provider: params.completion.provider,
      model: params.completion.model,
      modelTier: params.completion.modelTier,
      complexity: params.completion.complexity,
      fallbackUsed: params.completion.fallbackUsed,
      sourceCoverage: params.completion.sourceCoverage,
      needsScholar: params.completion.needsScholar,
      review: params.completion.review
        ? {
            enabled: params.completion.review.enabled,
            performed: params.completion.review.performed,
            verdict: params.completion.review.verdict,
            notes: params.completion.review.notes,
          }
        : undefined,
    },
  };
}
