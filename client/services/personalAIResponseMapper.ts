import type { AIContextResponse } from "@/services/aiContextService";
import type { AIResponseData } from "@/components/AIResponseModal";

export function mapAIContextResponseToModalData(
  result: AIContextResponse,
  overrides?: Partial<AIResponseData>,
): AIResponseData {
  return {
    response: result.response,
    disclaimer: result.disclaimer,
    citations: result.citations,
    learningSections: result.learningSections,
    sourceCoverage: result.sourceCoverage,
    followUpPrompts: result.followUpPrompts,
    actionSteps: result.actionSteps,
    actionPlan: result.actionPlan || result.personalAI?.actionPlan,
    personalAI: result.personalAI,
    modelTier: result.modelTier,
    needsScholar: result.needsScholar,
    warnings: result.warnings,
    confidence: result.confidence,
    metadata: result.metadata,
    feature: result.feature,
    ...overrides,
  };
}
