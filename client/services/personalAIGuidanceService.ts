import type { PersonalAIGuidanceContract } from "@shared/nuraiAI";
import { loadChatProfile } from "@/services/aiContextService";
import { loadPersonalAIContext } from "@/services/personalAIContextService";
import { buildPersonalAIHomeSurfaceBundle } from "@/services/personalAIHomeBundle";
import { requestPersonalAIResponse } from "@/services/personalAIService";
import type { HomeAIContext } from "@/services/homeAIContextService";
import type {
  HomeTasbeehSnapshot,
  HomeWomensHealthSnapshot,
} from "@/services/personalAIHomeBundle";

type GuidanceCacheEntry = {
  guidance: PersonalAIGuidanceContract;
  timestamp: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let guidanceCache: GuidanceCacheEntry | null = null;

export async function fetchPersonalAIGuidance(params: {
  contextSummary: string;
  userTier: "free" | "premium" | "scholar";
  question?: string;
  appContext?: Record<string, unknown>;
  homeContext?: HomeAIContext;
  tasbeeh?: HomeTasbeehSnapshot;
  womensHealth?: HomeWomensHealthSnapshot;
  isRevert?: boolean;
  daysSinceShahada?: number;
}): Promise<PersonalAIGuidanceContract | null> {
  if (
    guidanceCache &&
    Date.now() - guidanceCache.timestamp < CACHE_TTL_MS &&
    guidanceCache.guidance.contextSummary === params.contextSummary
  ) {
    return guidanceCache.guidance;
  }

  try {
    const [chatProfile, personalAIContext] = await Promise.all([
      loadChatProfile().catch(() => ({
        userProfile: {
          madhab: "shafii",
          isRevert: false,
          daysSinceShahada: 0,
          userLevel: "beginner",
        },
        spiritualContext: {},
      })),
      loadPersonalAIContext().catch(() => null),
    ]);

    const homeSurfaceBundle = params.homeContext
      ? buildPersonalAIHomeSurfaceBundle({
          context: params.homeContext,
          tasbeeh: params.tasbeeh,
          womensHealth: params.womensHealth,
          isRevert: params.isRevert,
          daysSinceShahada: params.daysSinceShahada,
        })
      : null;

    const data = await requestPersonalAIResponse({
      message:
        params.question ||
        `Choose the best Home next action from this context: ${params.contextSummary}`,
      surface: "home",
      feature: "home",
      userTier: params.userTier,
      userProfile: chatProfile.userProfile,
      spiritualContext: chatProfile.spiritualContext,
      appContext: {
        ...params.appContext,
        ...homeSurfaceBundle,
        personalAI: personalAIContext || undefined,
      },
      featureContext: {
        contextSummary: params.contextSummary,
        home: params.homeContext,
        tasbeeh: params.tasbeeh,
        womensHealth: params.womensHealth,
      },
    });

    const guidance: PersonalAIGuidanceContract | undefined = data.personalAI
      ?.actionPlan?.primary
      ? {
          version: 1,
          surface: data.personalAI.surface,
          intent: data.personalAI.intent,
          modeId: data.personalAI.mode.id,
          actionPlan: data.personalAI.actionPlan,
          contextSummary: params.contextSummary,
          generatedAt: new Date().toISOString(),
        }
      : undefined;
    if (!guidance?.actionPlan?.primary) return null;

    guidanceCache = { guidance, timestamp: Date.now() };
    return guidance;
  } catch {
    return null;
  }
}

export function clearPersonalAIGuidanceCache() {
  guidanceCache = null;
}
