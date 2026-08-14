import type { NurAIPlanTier } from "@shared/nuraiAI";

import type { HomeGuidancePlan } from "@/services/homeGuidanceRanker";
import type { PersonalAIRespondResult } from "@/services/personalAIService";

export type PersonalIntelligenceEvidence = {
  id: string;
  label: string;
};

export type PersonalIntelligenceBriefing = {
  id: string;
  category: HomeGuidancePlan["main"]["category"];
  eyebrow: string;
  title: string;
  body: string;
  fullBody: string;
  whyNow: string;
  evidence: PersonalIntelligenceEvidence[];
  daySnapshot: HomeGuidancePlan["daySnapshot"];
  primaryAction: {
    label: string;
    routeName?: string;
    routeParams?: Record<string, unknown>;
  };
  askPrompt: string;
  feedbackKey: string;
  confidence: number;
  priority: HomeGuidancePlan["main"]["priority"];
  sourceLabel: string;
  safetyNote?: string;
  generatedAt: string;
  modelMode: "on_device" | "personalized";
  modelLabel: string;
  capabilityLabel: string;
};

function compactText(value: string | null | undefined, fallback: string) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  if (normalized.length <= 150) return normalized;
  const firstSentence = normalized.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  if (
    firstSentence &&
    firstSentence.length >= 54 &&
    firstSentence.length <= 150
  ) {
    return firstSentence;
  }
  const shortened = normalized.slice(0, 147).replace(/\s+\S*$/, "");
  return `${shortened}…`;
}

function cleanReason(value: string) {
  return value.replace(/^(Urgent|High value|Useful now|Optional):\s*/i, "");
}

function isStaleReturnCopy(plan: HomeGuidancePlan, value: string) {
  if (
    !/\b(?:welcome back|returned after|time away|few days away)\b/i.test(value)
  ) {
    return false;
  }
  const planContext = [plan.main.title, plan.main.body, plan.main.reason].join(
    " ",
  );
  return !/\b(?:welcome back|returned after|time away|few days away|fresh start|restart)\b/i.test(
    planContext,
  );
}

function evidenceFromPlan(plan: HomeGuidancePlan) {
  const ignored = new Set([
    "context ready",
    "daily journey",
    "personal ai orchestrator",
  ]);
  return plan.main.signals
    .filter((signal) => !ignored.has(signal.toLowerCase()))
    .slice(0, 2)
    .map((label, index) => ({ id: `${plan.main.id}-${index}`, label }));
}

export function buildPersonalIntelligenceBriefing({
  plan,
  tier,
  response,
}: {
  plan: HomeGuidancePlan;
  tier: NurAIPlanTier;
  response?: PersonalAIRespondResult | null;
}): PersonalIntelligenceBriefing {
  const isPaid = tier !== "free";
  const hasLiveModel =
    isPaid &&
    !!response &&
    response.ai?.provider !== "local" &&
    response.ai?.fallbackUsed !== true;
  const canUseModelCopy =
    hasLiveModel && response?.response.trustState !== "needs_scholar";
  const modelBody =
    response?.answer ||
    response?.response.aiExplanation ||
    response?.response.explanation ||
    response?.response.practicalAction;
  const usableModelBody =
    canUseModelCopy && modelBody && !isStaleReturnCopy(plan, modelBody)
      ? modelBody
      : undefined;
  const usesModelCopy = Boolean(usableModelBody);
  const fullBody = usableModelBody || plan.main.body;
  const sourceCount = response?.response.sourceCards?.length || 0;
  const modeLabel = response?.personalAI.mode.label || "Personal guide";

  return {
    id: plan.main.id,
    category: plan.main.category,
    eyebrow: usesModelCopy ? "PERSONALISED CONTEXT" : "TODAY, IN CONTEXT",
    title: plan.main.title,
    body: compactText(fullBody, plan.main.body),
    fullBody: fullBody.trim(),
    whyNow: compactText(cleanReason(plan.main.reason), plan.main.body),
    evidence: evidenceFromPlan(plan),
    daySnapshot: plan.daySnapshot,
    primaryAction: {
      label: plan.main.ctaLabel,
      routeName: plan.main.routeName,
      routeParams: plan.main.routeParams,
    },
    askPrompt: plan.main.prompt,
    feedbackKey: plan.main.feedbackKey,
    confidence: plan.main.confidence,
    priority: plan.main.priority,
    sourceLabel: usesModelCopy
      ? sourceCount > 0
        ? `Personalised with ${sourceCount} source${sourceCount === 1 ? "" : "s"}`
        : "Personalised from visible app activity"
      : "Ranked privately from visible app activity",
    safetyNote: response?.response.caution || plan.main.safetyNote || undefined,
    generatedAt: plan.generatedAt,
    modelMode: usesModelCopy ? "personalized" : "on_device",
    modelLabel: usesModelCopy
      ? `${tier === "scholar" ? "Scholar" : "Premium"} · ${modeLabel}`
      : "Free · on device",
    capabilityLabel: usesModelCopy
      ? `${modeLabel} connects today's completed and remaining activity into one personalised next step.`
      : "Daily guidance is ranked privately on this device from the activity you choose to record.",
  };
}
