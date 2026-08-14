import type { AppIconName } from "@/components/icons";
import { addDays, diffDays, todayStr } from "./dateUtils";
import type { DerivedWomenHealth, WHSourceData } from "./types";

// The insights layer: everything the raw cycle/mood/symptom logs can tell a
// user that a bare calendar cannot — the Flo-style "here is what your body is
// doing and what's coming". Pure projections over the source + derived data,
// no storage of their own, so they stay private and recomputable.

export type InsightTone = "primary" | "scholar" | "watch";

export interface WomenHealthInsight {
  id: string;
  icon: AppIconName;
  tone: InsightTone;
  title: string;
  body: string;
}

export interface FertileWindow {
  ovulation: string;
  ovulationStart: string;
  ovulationEnd: string;
  fertileStart: string;
  fertileEnd: string;
  /** Confidence inherited from the underlying period prediction. */
  confidence: "low" | "medium" | "high";
}

/**
 * Broad calendar estimate for an opted-in planning surface. The luteal phase
 * varies, so we expose a possible ovulation range and a deliberately wider
 * fertile range instead of claiming a precise day. Calendar estimates are not
 * contraception and cannot confirm or exclude pregnancy.
 */
export function computeFertileWindow(
  derived: DerivedWomenHealth,
  planningMode: boolean,
): FertileWindow | null {
  if (!planningMode) return null;
  const prediction = derived.prediction;
  if (!prediction?.nextStart) return null;
  const ovulation = addDays(prediction.nextStart, -14);
  const ovulationStart = addDays(prediction.nextStart, -16);
  const ovulationEnd = addDays(prediction.nextStart, -12);
  // Guard against an ovulation date already in the past for this cycle.
  if (diffDays(todayStr(), ovulation) < -2) return null;
  return {
    ovulation,
    ovulationStart,
    ovulationEnd,
    fertileStart: addDays(prediction.nextStart, -21),
    fertileEnd: addDays(prediction.nextStart, -11),
    confidence: prediction.confidence,
  };
}

const SYMPTOM_LABELS: Record<string, string> = {
  cramps: "cramps",
  headache: "headaches",
  bloating: "bloating",
  fatigue: "fatigue",
  backache: "back pain",
  nausea: "nausea",
  tender: "tenderness",
  acne: "breakouts",
  cravings: "cravings",
  mood_swings: "mood swings",
};

function humanSymptom(key: string): string {
  return SYMPTOM_LABELS[key] ?? key.replace(/_/g, " ");
}

/**
 * Build the ordered list of insight cards. Ordered most-actionable first:
 * what's coming (prediction), regularity, then the patterns learned from
 * logged symptoms and mood/energy.
 */
export function buildWomenHealthInsights(
  data: WHSourceData,
  derived: DerivedWomenHealth,
): WomenHealthInsight[] {
  const insights: WomenHealthInsight[] = [];

  // 1. What's coming — days until the next predicted period.
  const prediction = derived.prediction;
  if (prediction?.nextStart) {
    const days = diffDays(todayStr(), prediction.nextStart);
    const confidenceWord =
      prediction.confidence === "high"
        ? "Your logs are consistent"
        : prediction.confidence === "medium"
          ? "Based on your recent cycles"
          : "Still learning your pattern";
    insights.push({
      id: "next-period",
      icon: "moon-calendar",
      tone: "primary",
      title:
        days <= 0
          ? "Your period is expected around now"
          : days === 1
            ? "Period expected tomorrow"
            : `Period expected in ${days} days`,
      body: `${confidenceWord}. Predicted ${prediction.rangeStart ? "window" : "date"} adapts every time you log a cycle.`,
    });
  }

  // 2. Regularity — from the variability the engine already computed.
  const lengths = derived.recentLengths;
  if (lengths.length >= 2) {
    const stdDev = derived.cycleStdDev;
    const avg = derived.averages.avgCycleLengthDays;
    if (stdDev <= 3) {
      insights.push({
        id: "regular",
        icon: "check-circle",
        tone: "primary",
        title: "Your cycles are regular",
        body: avg
          ? `They land close to ${avg} days each time — a steady rhythm to plan worship and rest around.`
          : "They land close to the same length each time.",
      });
    } else if (stdDev >= 7) {
      insights.push({
        id: "irregular",
        icon: "activity",
        tone: "watch",
        title: "Your cycles vary quite a bit",
        body: "Length has shifted noticeably lately. That is common, but if it continues, note it for a doctor — and remember predictions stay approximate.",
      });
    }
  }

  // 3. Trend — getting longer or shorter over the recent window.
  if (lengths.length >= 4) {
    const firstHalf = lengths.slice(0, Math.floor(lengths.length / 2));
    const secondHalf = lengths.slice(Math.floor(lengths.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const delta = Math.round(avgSecond - avgFirst);
    if (Math.abs(delta) >= 3) {
      insights.push({
        id: "trend",
        icon: delta > 0 ? "trending-up" : "trending-down",
        tone: "scholar",
        title: delta > 0 ? "Cycles trending longer" : "Cycles trending shorter",
        body: `Recent cycles are about ${Math.abs(delta)} days ${delta > 0 ? "longer" : "shorter"} than earlier ones.`,
      });
    }
  }

  // 4. Symptom pattern — the most-logged symptom across all cycles.
  const symptomCounts: Record<string, number> = {};
  for (const meta of Object.values(data.cycleMetadata)) {
    for (const s of meta.symptoms) {
      symptomCounts[s.key] = (symptomCounts[s.key] ?? 0) + 1;
    }
  }
  const topSymptom = Object.entries(symptomCounts).sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (topSymptom && topSymptom[1] >= 2) {
    insights.push({
      id: "symptom-pattern",
      icon: "heart",
      tone: "scholar",
      title: `${humanSymptom(topSymptom[0])} is your most common symptom`,
      body: `Logged across ${topSymptom[1]} cycles. Knowing this ahead of time lets you prepare rest and gentle worship.`,
    });
  }

  // 5. Energy pattern — average logged energy from mood entries.
  if (data.moodEntries.length >= 3) {
    const avgEnergy =
      data.moodEntries.reduce((a, m) => a + (m.energyLevel || 0), 0) /
      data.moodEntries.length;
    if (avgEnergy > 0 && avgEnergy <= 2.4) {
      insights.push({
        id: "low-energy",
        icon: "battery",
        tone: "watch",
        title: "Your energy has been running low",
        body: "Across recent check-ins. Consider a gentler plan and seek clinical support if fatigue is persistent, severe, or affecting daily life.",
      });
    }
  }

  return insights;
}
