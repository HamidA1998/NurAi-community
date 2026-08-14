export type PlanTier = "free" | "premium" | "scholar";

export interface FeatureEntitlement {
  requiredTier: PlanTier;
  label: string;
  upgradeMessage: string;
}

export const ENTITLEMENTS: Record<string, FeatureEntitlement> = {
  quranAllReciters: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage: "Unlock all available reciters with Premium",
  },
  hifzTracker: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage:
      "Unlock Hifz review analytics and mistake insights with Premium",
  },
  womensHealthExport: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage: "Export your health data with Premium",
  },
  kidsStories: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage: "Unlock all stories with Premium",
  },
  kidsMemorization: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage: "Unlock memorization tools with Premium",
  },
  higherAIChatLimits: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage: "Unlock higher AI chat limits with Premium",
  },
  tafsirFiqh: {
    requiredTier: "scholar",
    label: "Scholar",
    upgradeMessage: "Unlock deeper source-aware Tafsir study with Scholar",
  },
  offlineAudio: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage: "Download audio for offline listening with Premium",
  },
  libraryAdvancedReader: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage:
      "Unlock advanced ebook spacing, page width, and comfort controls with Premium",
  },
  libraryHighlights: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage:
      "Unlock ebook highlights and saved reading excerpts with Premium",
  },
  libraryOfflineBooks: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage: "Download NurAI books for offline reading with Premium",
  },
  dataExport: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage: "Export your data with Premium",
  },
  advancedAnalytics: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage: "View advanced analytics with Premium",
  },
  scholarCitations: {
    requiredTier: "scholar",
    label: "Scholar",
    upgradeMessage: "Source-verified citations with Scholar",
  },
  wordByWordTranslation: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage:
      "Unlock word-by-word translation for all surahs with Premium",
  },
  tajweedDisplay: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage: "Unlock colored Tajweed rules display with Premium",
  },
  audioSpeedControl: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage: "Unlock audio speed control with Premium",
  },
  customThemes: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage: "Unlock exclusive app themes with Premium",
  },
  muezzinVoices: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage: "Unlock additional Muezzin voices with Premium",
  },
  hifzAnalytics: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage:
      "Unlock Hifz review insights and mistake tracking with Premium",
  },
  familySharing: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage: "Unlock family group tools for shared worship goals",
  },
  contextualAI: {
    requiredTier: "premium",
    label: "Premium",
    upgradeMessage:
      "Unlock contextual AI study support, verse insights, and prayer reflections with Premium",
  },
  contextualAIExtended: {
    requiredTier: "scholar",
    label: "Scholar",
    upgradeMessage:
      "Unlock extended AI study support with source-aware notes and careful caveats with Scholar",
  },
};

export const FREE_RECITER_COUNT = 3;
export const FREE_AI_MESSAGES_PER_DAY = 5;
export const FREE_STORIES_COUNT = 3;
export const FREE_MUEZZIN_COUNT = 2;
export const FREE_WORD_BY_WORD_SURAHS = 3;

export function hasAccess(userTier: PlanTier, requiredTier: PlanTier): boolean {
  const tierRank: Record<PlanTier, number> = {
    free: 0,
    premium: 1,
    scholar: 2,
  };
  return tierRank[userTier] >= tierRank[requiredTier];
}

export function getTierBadge(
  requiredTier: PlanTier,
): { text: string; color: string } | null {
  if (requiredTier === "premium") return { text: "Premium", color: "primary" };
  if (requiredTier === "scholar") return { text: "Scholar", color: "scholar" };
  return null;
}
