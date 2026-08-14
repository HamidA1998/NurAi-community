import type { AppIconName } from "@/components/icons";
import type { GardenSnapshot } from "./gardenService";

// The reward layer on top of the garden. Stars (earned per sincere daily
// act, 10 each) were previously just a counter — here they drive a rank
// progression, and a set of achievements recognise specific milestones of
// consistency, breadth, and depth. Everything is derived from the existing
// GardenSnapshot (no new storage), so it stays a pure, testable projection.

const STARS_PER_CHECKIN = 10;

export interface GardenRank {
  key: string;
  label: string;
  /** Cumulative stars needed to reach this rank. */
  minStars: number;
  icon: AppIconName;
}

// Six ranks, Islamic-garden themed, spaced so the first few come quickly
// (early momentum) and later ones reward long-term devotion.
export const GARDEN_RANKS: GardenRank[] = [
  { key: "seedling", label: "Seedling", minStars: 0, icon: "streak-garden" },
  { key: "gardener", label: "Gardener", minStars: 100, icon: "streak-garden" },
  {
    key: "cultivator",
    label: "Cultivator",
    minStars: 300,
    icon: "streak-garden",
  },
  { key: "keeper", label: "Garden Keeper", minStars: 700, icon: "shield" },
  { key: "guardian", label: "Guardian", minStars: 1500, icon: "shield" },
  { key: "luminary", label: "Luminary", minStars: 3000, icon: "achievement" },
];

export interface GardenRankProgress {
  rank: GardenRank;
  nextRank: GardenRank | null;
  /** Stars accumulated since the current rank's floor. */
  starsIntoRank: number;
  /** Stars between the current rank floor and the next rank (null at max). */
  starsForNext: number | null;
  /** 0..1 progress toward the next rank (1 at max rank). */
  progress: number;
  totalStars: number;
}

export function getGardenRank(totalStars: number): GardenRankProgress {
  let index = 0;
  for (let i = 0; i < GARDEN_RANKS.length; i++) {
    if (totalStars >= GARDEN_RANKS[i].minStars) index = i;
  }
  const rank = GARDEN_RANKS[index];
  const nextRank = GARDEN_RANKS[index + 1] ?? null;
  const starsIntoRank = totalStars - rank.minStars;
  const starsForNext = nextRank ? nextRank.minStars - rank.minStars : null;
  const progress =
    nextRank && starsForNext && starsForNext > 0
      ? Math.min(1, starsIntoRank / starsForNext)
      : 1;
  return { rank, nextRank, starsIntoRank, starsForNext, progress, totalStars };
}

export type AchievementTier = "bronze" | "silver" | "gold";

export interface GardenAchievement {
  id: string;
  label: string;
  description: string;
  icon: AppIconName;
  tier: AchievementTier;
}

interface RewardsContext {
  totalStars: number;
  overallStreak: number;
  overallLongestStreak: number;
  checkedTodayCount: number;
  /** How many distinct categories the garden tracks (6). */
  totalCategories: number;
  /** How many categories have ever been logged at least once. */
  categoriesEverLogged: number;
  /** Best all-time streak of any single category. */
  bestCategoryStreak: number;
  /** Total sincere acts logged over the garden's lifetime. */
  lifetimeCheckins: number;
}

interface AchievementDef extends GardenAchievement {
  earned: (ctx: RewardsContext) => boolean;
}

// Ordered easiest → hardest so the earned/next boundary reads naturally.
const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-bloom",
    label: "First Bloom",
    description: "Log your very first sincere act.",
    icon: "streak-garden",
    tier: "bronze",
    earned: (c) => c.lifetimeCheckins >= 1,
  },
  {
    id: "steadfast-week",
    label: "Steadfast Week",
    description: "Keep the garden alive 7 days in a row.",
    icon: "target",
    tier: "bronze",
    earned: (c) => c.overallLongestStreak >= 7,
  },
  {
    id: "full-garden",
    label: "Full Garden",
    description: "Tend all six kinds of good in a single day.",
    icon: "hexagon",
    tier: "silver",
    earned: (c) => c.checkedTodayCount >= c.totalCategories,
  },
  {
    id: "well-rounded",
    label: "Well-Rounded",
    description: "Log every category at least once.",
    icon: "compass",
    tier: "silver",
    earned: (c) => c.categoriesEverLogged >= c.totalCategories,
  },
  {
    id: "devoted-month",
    label: "Devoted Month",
    description: "A 30-day unbroken streak.",
    icon: "shield",
    tier: "silver",
    earned: (c) => c.overallLongestStreak >= 30,
  },
  {
    id: "deep-roots",
    label: "Deep Roots",
    description: "Sustain a single practice for 30 days.",
    icon: "feather",
    tier: "silver",
    earned: (c) => c.bestCategoryStreak >= 30,
  },
  {
    id: "century",
    label: "Hundredfold",
    description: "Log 100 sincere acts in all.",
    icon: "award",
    tier: "gold",
    earned: (c) => c.lifetimeCheckins >= 100,
  },
  {
    id: "unwavering",
    label: "Unwavering",
    description: "A 100-day unbroken streak.",
    icon: "achievement",
    tier: "gold",
    earned: (c) => c.overallLongestStreak >= 100,
  },
];

export interface GardenRewards {
  rank: GardenRankProgress;
  achievements: { achievement: GardenAchievement; earned: boolean }[];
  earnedCount: number;
  totalCount: number;
  /** The nearest not-yet-earned achievement, for a "next up" nudge. */
  nextAchievement: GardenAchievement | null;
}

export function evaluateGardenRewards(snapshot: GardenSnapshot): GardenRewards {
  const categoriesEverLogged = snapshot.categories.filter(
    (c) => c.longestStreak > 0 || c.currentStreak > 0,
  ).length;
  const bestCategoryStreak = snapshot.categories.reduce(
    (best, c) => Math.max(best, c.longestStreak, c.currentStreak),
    0,
  );
  const ctx: RewardsContext = {
    totalStars: snapshot.totalStars,
    overallStreak: snapshot.overallStreak,
    overallLongestStreak: Math.max(
      snapshot.overallLongestStreak,
      snapshot.overallStreak,
    ),
    checkedTodayCount: snapshot.checkedTodayCount,
    totalCategories: snapshot.categories.length,
    categoriesEverLogged,
    bestCategoryStreak,
    lifetimeCheckins: Math.round(snapshot.totalStars / STARS_PER_CHECKIN),
  };

  const achievements = ACHIEVEMENTS.map((a) => ({
    achievement: {
      id: a.id,
      label: a.label,
      description: a.description,
      icon: a.icon,
      tier: a.tier,
    },
    earned: a.earned(ctx),
  }));

  const earnedCount = achievements.filter((a) => a.earned).length;
  const nextAchievement =
    achievements.find((a) => !a.earned)?.achievement ?? null;

  return {
    rank: getGardenRank(snapshot.totalStars),
    achievements,
    earnedCount,
    totalCount: achievements.length,
    nextAchievement,
  };
}
