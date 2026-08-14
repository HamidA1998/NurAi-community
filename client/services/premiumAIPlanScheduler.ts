import AsyncStorage from "@react-native-async-storage/async-storage";

import type { NurAIPlanTier } from "@shared/nuraiAI";
import { syncedSetItem } from "@/lib/progress-sync";
import {
  buildArabicPersonalAIAdapter,
  buildDuasPersonalAIAdapter,
  buildHifzPersonalAIAdapter,
  buildLibraryPersonalAIAdapter,
  buildPrayerPersonalAIAdapter,
  buildQuranPersonalAIAdapter,
  type PersonalAIFeatureAdapter,
} from "@/services/personalAIFeatureAdapters";
import { loadPersonalAIContext } from "@/services/personalAIContextService";

export type PremiumAIPlanCadence = "daily" | "weekly";

export type PremiumAIPlanItem = {
  id: string;
  title: string;
  body: string;
  route: string;
  sourceRule: PersonalAIFeatureAdapter["sourceRule"];
  aiPrompt: string;
};

export type PremiumAIPlanSnapshot = {
  version: 1;
  generatedAt: string;
  expiresAt: string;
  cadence: PremiumAIPlanCadence;
  tier: Exclude<NurAIPlanTier, "free">;
  headline: string;
  privacyBoundary: string;
  costBoundary: string;
  items: PremiumAIPlanItem[];
};

export const PREMIUM_AI_PLAN_SNAPSHOT_KEY = "nurai_premium_ai_plan_snapshot_v1";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function isPaidTier(
  tier: NurAIPlanTier,
): tier is Exclude<NurAIPlanTier, "free"> {
  return tier === "premium" || tier === "scholar";
}

function parseSnapshot(raw: string | null): PremiumAIPlanSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) {
      return null;
    }
    return parsed as PremiumAIPlanSnapshot;
  } catch {
    return null;
  }
}

function firstValue(values: string[], fallback: string) {
  return values.find((value) => value.trim()) || fallback;
}

function itemFromAdapter(
  adapter: PersonalAIFeatureAdapter,
  index: number,
): PremiumAIPlanItem {
  const primaryAction = adapter.actions[0];
  return {
    id: `${adapter.feature}-${index + 1}`,
    title: primaryAction?.label || adapter.title,
    body: adapter.contextSummary,
    route: primaryAction?.route || "Home",
    sourceRule: adapter.sourceRule,
    aiPrompt: [
      `Use ${adapter.title} context.`,
      adapter.contextSummary,
      "Give one practical next step, one source boundary, and one optional follow-up.",
    ].join(" "),
  };
}

export async function loadPremiumAIPlanSnapshot(): Promise<PremiumAIPlanSnapshot | null> {
  return parseSnapshot(
    await AsyncStorage.getItem(PREMIUM_AI_PLAN_SNAPSHOT_KEY),
  );
}

export async function clearPremiumAIPlanSnapshot(): Promise<void> {
  await AsyncStorage.removeItem(PREMIUM_AI_PLAN_SNAPSHOT_KEY);
}

export function premiumAIPlanNeedsRefresh(
  snapshot: PremiumAIPlanSnapshot | null,
  now: Date = new Date(),
) {
  if (!snapshot) return true;
  const expiresAt = new Date(snapshot.expiresAt);
  return Number.isNaN(expiresAt.getTime()) || expiresAt <= now;
}

export async function buildPremiumAIPlanSnapshot({
  tier,
  cadence,
  now = new Date(),
}: {
  tier: NurAIPlanTier;
  cadence: PremiumAIPlanCadence;
  now?: Date;
}): Promise<PremiumAIPlanSnapshot | null> {
  if (!isPaidTier(tier)) return null;

  const personalAI = await loadPersonalAIContext();
  const focus = firstValue(personalAI.learnedPreferences.topicFocus, "quran");
  const nextNeed = firstValue(
    personalAI.needsToKnow,
    "Keep the plan small, source-aware, and easy to complete.",
  );
  const adapters = [
    buildQuranPersonalAIAdapter({
      progressLabel: focus === "quran" ? nextNeed : personalAI.memorySummary[0],
    }),
    buildPrayerPersonalAIAdapter({
      userGoalLabel:
        focus === "prayer" ? nextNeed : "Protect the next prayer window.",
    }),
    buildArabicPersonalAIAdapter({
      dueLabel:
        focus === "arabic" ? nextNeed : "Review one short Arabic pattern.",
    }),
    buildHifzPersonalAIAdapter({
      dueLabel:
        focus === "quran" ? "Keep revision gentle and realistic." : nextNeed,
    }),
    buildDuasPersonalAIAdapter({
      situationLabel:
        focus === "dua" ? nextNeed : "Choose one dua or dhikr for today.",
    }),
    buildLibraryPersonalAIAdapter({
      sourceStatusLabel:
        "Use reviewed Library content and keep source limits clear.",
    }),
  ];
  const itemLimit = cadence === "daily" ? 4 : 6;
  const generatedAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + (cadence === "daily" ? DAY_MS : WEEK_MS),
  ).toISOString();

  return {
    version: 1,
    generatedAt,
    expiresAt,
    cadence,
    tier,
    headline:
      cadence === "daily"
        ? "Today's Personal AI plan"
        : "This week's Personal AI rhythm",
    privacyBoundary:
      "Generated from visible app activity, safe memory summaries, and user-controlled preferences only.",
    costBoundary:
      "Cached locally and refreshed at most once per cadence unless the user clears it.",
    items: adapters.slice(0, itemLimit).map(itemFromAdapter),
  };
}

export async function refreshPremiumAIPlanIfDue({
  tier,
  cadence = "daily",
  now = new Date(),
  force = false,
}: {
  tier: NurAIPlanTier;
  cadence?: PremiumAIPlanCadence;
  now?: Date;
  force?: boolean;
}): Promise<PremiumAIPlanSnapshot | null> {
  if (!isPaidTier(tier)) return null;

  const current = await loadPremiumAIPlanSnapshot();
  if (
    !force &&
    current?.cadence === cadence &&
    !premiumAIPlanNeedsRefresh(current, now)
  ) {
    return current;
  }

  const next = await buildPremiumAIPlanSnapshot({ tier, cadence, now });
  if (!next) return null;
  await syncedSetItem(PREMIUM_AI_PLAN_SNAPSHOT_KEY, JSON.stringify(next));
  return next;
}
