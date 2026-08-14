import type { PlanTier } from "@/config/entitlements";
import type { AICitation } from "@/services/aiContextService";
import type { PersonalAIActionPlanContract } from "@shared/nuraiAI";

export type AIResponseState =
  | "loading"
  | "success"
  | "error"
  | "upgrade"
  | "rateLimit";

export interface AIResponseData {
  response: string;
  question?: string;
  disclaimer?: string;
  citations?: AICitation[];
  learningSections?: {
    kind?:
      | "meaning"
      | "context"
      | "journey"
      | "key_words"
      | "lesson"
      | "avoid"
      | "action"
      | "sources";
    title: string;
    body: string;
    sourceRefs?: string[];
  }[];
  sourceCoverage?:
    | "verified_context"
    | "reference_detected"
    | "limited_context"
    | "needs_source_review";
  followUpPrompts?: string[];
  actionSteps?: string[];
  actionPlan?: PersonalAIActionPlanContract;
  personalAI?: {
    actionPlan?: PersonalAIActionPlanContract;
  };
  modelTier?: "free" | "premium" | "scholar";
  needsScholar?: boolean;
  warnings?: string[];
  confidence?: number;
  metadata?: {
    madhab?: string;
    userLevel?: string;
    isRevert?: boolean;
    wordCount?: number;
  };
  feature?: string;
}

interface AIResponseModalProps {
  visible: boolean;
  onClose: () => void;
  state: AIResponseState;
  data?: AIResponseData | null;
  onRetry?: () => void;
  onFollowUp?: (question: string) => void;
  errorMessage?: string;
  featureLabel?: string;
  requiredTier?: Exclude<PlanTier, "free">;
  isPremium?: boolean;
}

export function AIResponseModal(_props: AIResponseModalProps) {
  return null;
}

export function customerSafeAIErrorMessage(_error: unknown) {
  return "We could not complete that request. Please try again.";
}

export default AIResponseModal;
