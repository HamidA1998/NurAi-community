type PlanTier = "free" | "premium" | "scholar";

export function hasPaidAPIAccess(tier: PlanTier): boolean {
  return tier === "premium" || tier === "scholar";
}

export function getTierLabel(tier: PlanTier): string {
  switch (tier) {
    case "scholar":
      return "Scholar";
    case "premium":
      return "Premium";
    default:
      return "Free";
  }
}

export function getRequiredTierForFeature(feature: string): PlanTier {
  const scholarFeatures = [
    "contextualAIExtended",
    "tafsirFiqh",
    "quranTeacher",
    "advancedAnalytics",
  ];

  if (scholarFeatures.includes(feature)) return "scholar";
  return "premium";
}
