import type { NurAIPlanTier, PersonalAISurface } from "@shared/nuraiAI";

export type PersonalAIExperienceMode =
  | "on_device"
  | "model_enhanced"
  | "source_aware";

export type PersonalAIExperience = {
  tier: NurAIPlanTier;
  surface: PersonalAISurface;
  mode: PersonalAIExperienceMode;
  customerLabel: string;
  customerDescription: string;
  canUseCloudModel: boolean;
  canUseCrossFeatureContext: boolean;
  canUseLongTermMemory: boolean;
  canUseScholarDepth: boolean;
};

const SOURCE_AWARE_SURFACES = new Set<PersonalAISurface>([
  "chat",
  "quran",
  "arabic",
  "hifz",
  "prayer",
  "duas",
  "library",
  "ramadan",
  "contextual",
]);

/**
 * The single customer-facing AI entitlement contract.
 *
 * Free guidance is useful and runs privately on device. Premium replaces it
 * with model-enhanced, cross-feature context wherever the surface supports
 * Personal AI. Scholar adds source-aware depth on knowledge-led surfaces.
 * A temporary model outage must never change a paid account back to "Free".
 */
export function resolvePersonalAIExperience(
  tier: NurAIPlanTier,
  surface: PersonalAISurface,
): PersonalAIExperience {
  if (tier === "scholar") {
    const sourceAware = SOURCE_AWARE_SURFACES.has(surface);
    return {
      tier,
      surface,
      mode: sourceAware ? "source_aware" : "model_enhanced",
      customerLabel: sourceAware
        ? "Source-aware guidance"
        : "Personalised guidance",
      customerDescription: sourceAware
        ? "Connects the context you allow with careful source-aware depth."
        : "Connects the context you allow across NurAI into one useful next step.",
      canUseCloudModel: true,
      canUseCrossFeatureContext: true,
      canUseLongTermMemory: true,
      canUseScholarDepth: sourceAware,
    };
  }

  if (tier === "premium") {
    return {
      tier,
      surface,
      mode: "model_enhanced",
      customerLabel: "Personalised guidance",
      customerDescription:
        "Connects the context you allow across NurAI into one useful next step.",
      canUseCloudModel: true,
      canUseCrossFeatureContext: true,
      canUseLongTermMemory: true,
      canUseScholarDepth: false,
    };
  }

  return {
    tier,
    surface,
    mode: "on_device",
    customerLabel: "Daily guidance",
    customerDescription:
      "Chooses a useful next step privately from activity visible on this device.",
    canUseCloudModel: false,
    canUseCrossFeatureContext: false,
    canUseLongTermMemory: false,
    canUseScholarDepth: false,
  };
}

export function personalAIUnavailableCopy(tier: NurAIPlanTier) {
  if (tier === "free") {
    return {
      label: "Daily guidance",
      message: "Your private on-device guidance is still available.",
    };
  }

  return {
    label: "Personalised guidance",
    message:
      "Live personalisation is temporarily unavailable. Your private guidance is still available.",
  };
}
