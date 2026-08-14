import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";
export { homeAIFeedbackPenalty } from "@/services/homeAIFeedbackRanking";

export type HomeAIFeedbackValue = "helpful" | "not_now" | "show_less";

export type HomeAIFeedbackRecord = {
  key: string;
  category: string;
  helpfulCount: number;
  notNowCount: number;
  showLessCount: number;
  lastFeedback: HomeAIFeedbackValue;
  lastFeedbackAt: string;
};

export type HomeAIFeedbackState = {
  version: 1;
  updatedAt: string;
  records: Record<string, HomeAIFeedbackRecord>;
  categoryWeights: Record<string, number>;
  /** Recent Home cards that were actually presented, newest first. */
  impressions?: HomeAIGuidanceImpression[];
};

export type HomeAIGuidanceImpression = {
  recommendationId: string;
  category: string;
  contextFingerprint: string;
  shownAt: string;
};

export const HOME_AI_FEEDBACK_KEY = "nurai_home_ai_feedback_v1";

const DEFAULT_STATE: HomeAIFeedbackState = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  records: {},
  categoryWeights: {},
  impressions: [],
};

const MAX_GUIDANCE_IMPRESSIONS = 16;

function clampWeight(value: number) {
  return Math.max(-30, Math.min(30, Math.round(value)));
}

function normalizeState(value: unknown): HomeAIFeedbackState {
  const raw = value as Partial<HomeAIFeedbackState>;
  const records =
    raw && typeof raw.records === "object" && raw.records ? raw.records : {};
  const categoryWeights =
    raw && typeof raw.categoryWeights === "object" && raw.categoryWeights
      ? raw.categoryWeights
      : {};

  return {
    version: 1,
    updatedAt:
      typeof raw?.updatedAt === "string"
        ? raw.updatedAt
        : DEFAULT_STATE.updatedAt,
    records: records as Record<string, HomeAIFeedbackRecord>,
    categoryWeights: Object.fromEntries(
      Object.entries(categoryWeights).map(([key, value]) => [
        key,
        clampWeight(Number(value) || 0),
      ]),
    ),
    impressions: Array.isArray(raw?.impressions)
      ? raw.impressions
          .filter(
            (item): item is HomeAIGuidanceImpression =>
              !!item &&
              typeof item.recommendationId === "string" &&
              typeof item.category === "string" &&
              typeof item.contextFingerprint === "string" &&
              typeof item.shownAt === "string",
          )
          .slice(0, MAX_GUIDANCE_IMPRESSIONS)
      : [],
  };
}

export async function loadHomeAIFeedback(): Promise<HomeAIFeedbackState> {
  try {
    const raw = await AsyncStorage.getItem(HOME_AI_FEEDBACK_KEY);
    if (!raw) return DEFAULT_STATE;
    return normalizeState(JSON.parse(raw));
  } catch {
    return DEFAULT_STATE;
  }
}

export async function recordHomeAIFeedback({
  key,
  category,
  feedback,
}: {
  key: string;
  category: string;
  feedback: HomeAIFeedbackValue;
}): Promise<HomeAIFeedbackState> {
  const current = await loadHomeAIFeedback();
  const previous = current.records[key] || {
    key,
    category,
    helpfulCount: 0,
    notNowCount: 0,
    showLessCount: 0,
    lastFeedback: feedback,
    lastFeedbackAt: new Date(0).toISOString(),
  };
  const delta = feedback === "helpful" ? 8 : feedback === "not_now" ? -5 : -12;
  const next: HomeAIFeedbackState = {
    version: 1,
    updatedAt: new Date().toISOString(),
    impressions: current.impressions || [],
    records: {
      ...current.records,
      [key]: {
        ...previous,
        category,
        helpfulCount: previous.helpfulCount + (feedback === "helpful" ? 1 : 0),
        notNowCount: previous.notNowCount + (feedback === "not_now" ? 1 : 0),
        showLessCount:
          previous.showLessCount + (feedback === "show_less" ? 1 : 0),
        lastFeedback: feedback,
        lastFeedbackAt: new Date().toISOString(),
      },
    },
    categoryWeights: {
      ...current.categoryWeights,
      [category]: clampWeight((current.categoryWeights[category] || 0) + delta),
    },
  };

  await syncedSetItem(HOME_AI_FEEDBACK_KEY, JSON.stringify(next));
  return next;
}

/**
 * Records only the recommendation that reached the Home card. This is kept
 * separate from V3's candidate generation so unshown suggestions never count
 * against cooldowns.
 */
export async function recordHomeAIGuidanceImpression({
  recommendationId,
  category,
  contextFingerprint,
  shownAt = new Date().toISOString(),
}: HomeAIGuidanceImpression): Promise<HomeAIFeedbackState> {
  const current = await loadHomeAIFeedback();
  const impressions = current.impressions || [];
  const latest = impressions[0];
  const latestTime = latest ? Date.parse(latest.shownAt) : 0;
  const shownTime = Date.parse(shownAt);
  const isImmediateDuplicate =
    latest?.recommendationId === recommendationId &&
    latest.contextFingerprint === contextFingerprint &&
    Number.isFinite(latestTime) &&
    Number.isFinite(shownTime) &&
    Math.abs(shownTime - latestTime) < 90_000;

  if (isImmediateDuplicate) return current;

  const next: HomeAIFeedbackState = {
    ...current,
    updatedAt: shownAt,
    impressions: [
      { recommendationId, category, contextFingerprint, shownAt },
      ...impressions,
    ].slice(0, MAX_GUIDANCE_IMPRESSIONS),
  };
  await syncedSetItem(HOME_AI_FEEDBACK_KEY, JSON.stringify(next));
  return next;
}
