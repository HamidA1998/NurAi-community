import { Platform } from "react-native";

export type WearableHealthProviderId =
  | "apple_health"
  | "apple_watch"
  | "android_health_connect"
  | "samsung_health"
  | "android_wearables";

export type WearableHealthConnectionStatus =
  | "ready_for_native_bridge"
  | "permission_required"
  | "planned_android_release"
  | "unsupported_on_device";

export type WearableHealthMetric =
  | "steps"
  | "sleep"
  | "heart_rate"
  | "workouts"
  | "active_energy"
  | "mindful_minutes";

export type WearableHealthProviderCard = {
  id: WearableHealthProviderId;
  label: string;
  status: WearableHealthConnectionStatus;
  statusLabel: string;
  summary: string;
  platformNote: string;
  privacyNote: string;
  metrics: WearableHealthMetric[];
};

export const WEARABLE_HEALTH_PRIVACY_BOUNDARIES = [
  "Health data stays permission based and should only be read after the user understands why.",
  "NurAI should use trends for gentle wellbeing guidance, not diagnosis, treatment, or medication decisions.",
  "Apple Watch, Android wearables, and Samsung devices must never be treated as perfect medical measurement sources.",
];

const IOS_PROVIDERS: WearableHealthProviderCard[] = [
  {
    id: "apple_health",
    label: "Apple Health",
    status: "permission_required",
    statusLabel: "Ask permission",
    summary:
      "Reads selected HealthKit data once the user grants permission in a native iOS build.",
    platformNote:
      "Best iOS route: HealthKit permission flow for steps, sleep, heart rate, workouts, active energy, and mindful minutes.",
    privacyNote:
      "NurAI should request only the metrics used in the card and let users revoke access from Apple Health settings.",
    metrics: [
      "steps",
      "sleep",
      "heart_rate",
      "workouts",
      "active_energy",
      "mindful_minutes",
    ],
  },
  {
    id: "apple_watch",
    label: "Apple Watch",
    status: "permission_required",
    statusLabel: "Through HealthKit",
    summary:
      "Apple Watch data becomes useful to NurAI through Apple Health after permission is granted.",
    platformNote:
      "No separate Apple Watch screen is needed first; the HealthKit card can explain which watch signals are available.",
    privacyNote:
      "Show watch-derived insights as estimates and never as medical certainty.",
    metrics: ["steps", "heart_rate", "workouts", "active_energy"],
  },
];

const ANDROID_PROVIDERS: WearableHealthProviderCard[] = [
  {
    id: "android_health_connect",
    label: "Health Connect",
    status: "permission_required",
    statusLabel: "Ask permission",
    summary:
      "The Android health layer should use Health Connect as the main permission and data hub.",
    platformNote:
      "Best Android route: Health Connect for steps, sleep, heart rate, workouts, active energy, and wearable synced data.",
    privacyNote:
      "Use Android permission prompts only after explaining the wellbeing value and data types clearly.",
    metrics: ["steps", "sleep", "heart_rate", "workouts", "active_energy"],
  },
  {
    id: "samsung_health",
    label: "Samsung Health",
    status: "permission_required",
    statusLabel: "Partner path",
    summary:
      "Samsung Health can be supported through Health Connect where synced, with Samsung Health Data SDK kept for deeper approved partner access.",
    platformNote:
      "Use Health Connect first; add Samsung Health Data SDK only if Samsung-specific data is required and approved.",
    privacyNote:
      "Do not duplicate Samsung data if the same signal already arrives through Health Connect.",
    metrics: ["steps", "sleep", "heart_rate", "workouts"],
  },
  {
    id: "android_wearables",
    label: "Android Wearables",
    status: "permission_required",
    statusLabel: "Wearable sync",
    summary:
      "Android watches and fitness devices should feed the same Muslim Health card through Health Connect when available.",
    platformNote:
      "Use wearable direct sync only for low-latency needs; the normal card can rely on Health Connect summaries.",
    privacyNote:
      "Treat wearable signals as helpful trends, not clinical facts.",
    metrics: ["steps", "heart_rate", "workouts", "active_energy"],
  },
];

export function getWearableHealthProviderCards(): WearableHealthProviderCard[] {
  if (Platform.OS === "ios") {
    return [...IOS_PROVIDERS, ...ANDROID_PROVIDERS];
  }

  if (Platform.OS === "android") {
    return [...ANDROID_PROVIDERS, ...IOS_PROVIDERS];
  }

  return [...IOS_PROVIDERS, ...ANDROID_PROVIDERS].map((provider) => ({
    ...provider,
    status: "unsupported_on_device",
    statusLabel: "Mobile only",
  }));
}

export function buildWearableHealthInsight(
  providers = getWearableHealthProviderCards(),
): string {
  const primaryProvider = providers[0];
  return `${primaryProvider.label} is prepared as the first health-data route. Once the native bridge and permissions are enabled, NurAI can turn steps, sleep, heart rate, workouts, and mindful minutes into gentle Muslim wellbeing guidance without diagnosing or replacing clinicians.`;
}

export function buildWearableHealthAIPrompt(
  providers = getWearableHealthProviderCards(),
): string {
  return `Use wearable health data only as gentle wellbeing context.
Available provider plan: ${providers.map((provider) => `${provider.label}: ${provider.statusLabel}`).join("; ")}
Allowed metrics: steps, sleep, heart rate, workouts, active energy, mindful minutes.
Boundaries: ${WEARABLE_HEALTH_PRIVACY_BOUNDARIES.join(" ")}

Give practical Muslim self-care suggestions. Do not diagnose, prescribe, change medication, or present wearable readings as medical facts. If symptoms, medication, chronic illness, pregnancy, eating disorders, mental health crisis, fasting while ill, or emergency concerns appear, direct the user to qualified medical and scholarly help.`;
}
