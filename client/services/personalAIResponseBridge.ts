import type {
  NurAIPlanTier,
  PersonalAIActionCapability,
  PersonalAIActionPlanContract,
} from "@shared/nuraiAI";
import {
  executePersonalAIAction,
  resolvePersonalAIAction,
  type PersonalAIActionExecutionPlan,
  type PersonalAIActionInput,
} from "@/services/personalAIActionRegistry";

export type PersonalAIActionPressResult =
  | { executed: true; route?: string }
  | { executed: false; reason: string };

export function personalAIActionsFromPlan(
  plan?: PersonalAIActionPlanContract | null,
): PersonalAIActionCapability[] {
  if (!plan) return [];
  return [plan.primary, ...plan.secondary].slice(0, 3);
}

export function personalAIActionStepsFromPlan(
  plan?: PersonalAIActionPlanContract | null,
): string[] {
  return personalAIActionsFromPlan(plan).map((action) => action.label);
}

export function resolvePersonalAIActionFromLabel(
  label: string,
  options: {
    tier: NurAIPlanTier;
    plan?: PersonalAIActionPlanContract | null;
    defaultPrompt?: string;
  },
): PersonalAIActionExecutionPlan {
  const matched = personalAIActionsFromPlan(options.plan).find(
    (action) => action.label.toLowerCase() === label.toLowerCase(),
  );
  const input: PersonalAIActionInput = matched || { label };
  return resolvePersonalAIAction(input, {
    tier: options.tier,
    defaultPrompt: options.defaultPrompt,
  });
}

export function handlePersonalAIActionPress(
  label: string,
  navigation: {
    navigate: (route: string, params?: Record<string, unknown>) => void;
  },
  options: {
    tier: NurAIPlanTier;
    plan?: PersonalAIActionPlanContract | null;
    defaultPrompt?: string;
    onConfirmRequired?: (plan: PersonalAIActionExecutionPlan) => void;
  },
): PersonalAIActionPressResult {
  const executionPlan = resolvePersonalAIActionFromLabel(label, options);
  if (!executionPlan.canExecute) {
    return {
      executed: false,
      reason:
        executionPlan.blockedReason || "This action is not available yet.",
    };
  }
  if (executionPlan.requiresConfirmation) {
    options.onConfirmRequired?.(executionPlan);
    return {
      executed: false,
      reason: "Confirmation required before Personal AI continues.",
    };
  }
  const result = executePersonalAIAction(executionPlan, navigation);
  if (result.executed) {
    return { executed: true, route: result.route };
  }
  return {
    executed: false,
    reason: result.reason || "Action could not be executed.",
  };
}
