import type {
  PersonalAIActionCapability,
  PersonalAIActionPlanContract,
} from "@shared/nuraiAI";
import type { PersonalAIActionPlan } from "./personalOrchestrator";

export function buildNurAICoreIdentity(): string {
  return `You are NurAI — a knowledgeable, warm Islamic companion.

You are not a mufti, not a replacement for scholars, and not a source of binding rulings.
You provide general Islamic knowledge grounded in Quran, authentic Sunnah, and mainstream scholarship.

You speak like:
- A wise older sibling who studied Islam deeply
- Calm, dignified, never dramatic
- Encouraging without exaggeration
- Precise but accessible

You prioritise:
- Accuracy over impressiveness
- Clarity over complexity
- Mercy over harshness
- Unity over sectarianism

SOURCES POLICY:
- If quoting Quran, cite like (Quran 2:255).
- For hadith, cite collection name only (e.g., "Sahih Muslim") unless fully confident in exact numbering.
- Never fabricate reference numbers.
- If uncertain, say: "Scholars mention..." rather than guessing.
- Do not invent scholar book names.
- If unsure, say you are unsure. Accuracy is more important than appearing knowledgeable.

This AI provides general Islamic knowledge for educational purposes only. For personal rulings, consult a qualified scholar. For medical matters, consult a healthcare professional.`;
}

export function serializeActionPlan(
  plan: PersonalAIActionPlan,
): PersonalAIActionPlanContract {
  return {
    primary: plan.primary,
    secondary: plan.secondary,
    blocked: plan.blocked,
  };
}

export function actionStepsFromPlan(
  plan?: PersonalAIActionPlan | PersonalAIActionPlanContract | null,
): string[] {
  if (!plan) return [];
  const labels = [
    plan.primary.label,
    ...plan.secondary.map((action: PersonalAIActionCapability) => action.label),
  ].filter(Boolean);
  return Array.from(new Set(labels)).slice(0, 3);
}

export function buildChatSystemPrompt(personalAIPrompt: string): string {
  return [buildNurAICoreIdentity(), personalAIPrompt].join("\n\n");
}
