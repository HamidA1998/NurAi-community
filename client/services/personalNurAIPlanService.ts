import AsyncStorage from "@react-native-async-storage/async-storage";
import { markDirtyByKey } from "@/lib/progress-sync";

export type OnboardingPreferences = {
  interests: string[];
  level: string;
  quranLevel: string;
  arabicLevel: string;
  guidancePreference: string;
  familyNeeds: string[];
  language: string;
  prayerHabit: string;
  prayerSetup: string;
  themeAccent: string;
};

export type PersonalNurAIPlan = {
  createdAt?: string;
  title?: string;
  primaryAnchor?: "quran" | "prayer" | string;
  trustMode?: "source_first" | "scholar_review_first" | string;
  firstWeekFocus?: string[];
  sensitiveQuestionPolicy?: string;
  recommendedStart?: {
    label: string;
    routeHint: "Home" | "QuranReader" | "PrayerTimes" | "ArabicLearning";
    reason: string;
  };
  weeklyReview?: {
    label: string;
    cadence: string;
    proofLabel: string;
  };
  planRationale?: string[];
  setupQuality?: {
    completedSignals: number;
    totalSignals: number;
    label: string;
  };
  dailyPath?: {
    id?: string;
    label?: string;
    cadence?: string;
  }[];
  preferences?: Partial<OnboardingPreferences>;
};

export type PersonalHomePlanSummary = {
  headline: string;
  anchorLabel: string;
  quranLabel: string;
  arabicLabel: string;
  guidanceLabel: string;
  familyLabel: string;
  prayerHabitLabel: string;
  trustMode: "source_first" | "scholar_review_first";
  dailyPath: string[];
  recommendedActionLabel: string;
  recommendedActionReason: string;
  reviewCadenceLabel: string;
  planFreshnessLabel: string;
  planReviewDueLabel: string;
  setupQualityLabel: string;
  personalizationBoundaryLabel: string;
  planRationale: string[];
  personalizationReceipts: PersonalizationSignalReceipt[];
  planSafetyReceipts: PersonalizationPlanSafetyReceipt[];
  planAdjustment: PersonalizationPlanAdjustmentContract;
  planReadiness: PersonalizationReadinessContract;
  signalLabels: string[];
  aiContextLine: string;
};

export type PersonalizationSignalReceipt = {
  id: "goal_anchor" | "quran_level" | "guidance_boundary" | "prayer_family";
  label: string;
  evidenceLabel: string;
  boundaryLabel: string;
};

export type PersonalizationPlanSafetyReceipt = {
  id: "first_action" | "weekly_review" | "ai_context" | "user_control";
  title: string;
  evidenceLabel: string;
  boundaryLabel: string;
  actionLabel: string;
};

export type PersonalizationPlanAdjustmentItem = {
  id: "visible_signals" | "freshness" | "trust_boundary" | "user_control";
  title: string;
  evidenceLabel: string;
  actionLabel: string;
  boundaryLabel: string;
};

export type PersonalizationPlanAdjustmentContract = {
  title: string;
  statusLabel: string;
  actionLabel: string;
  controlsLabel: string;
  prompt: string;
  boundaryLabel: string;
  items: PersonalizationPlanAdjustmentItem[];
};

export type PersonalizationReadinessItem = {
  id: "signals" | "first_week" | "trust" | "review" | "controls";
  title: string;
  evidenceLabel: string;
  boundaryLabel: string;
  tone: "primary" | "scholar" | "control";
};

export type PersonalizationReadinessContract = {
  title: string;
  statusLabel: string;
  actionLabel: string;
  boundaryLabel: string;
  items: PersonalizationReadinessItem[];
};

export type PersonalizationTransparencyHandoff = {
  headline: string;
  statusLabel: string;
  freshnessLabel: string;
  reviewDueLabel: string;
  allowedSignals: string[];
  protectedBoundaries: string[];
  dataRights: PersonalizationDataRightReceipt[];
  nextActionLabel: string;
  exportBoundaryLabel: string;
};

export type PersonalizationDataRightReceipt = {
  id: "inspect_personalization" | "adjust_plan" | "export_plan" | "delete_plan";
  title: string;
  evidenceLabel: string;
  userActionLabel: string;
  boundaryLabel: string;
  icon: string;
  tone: "primary" | "scholar" | "control";
};

export type PersonalNurAIPlanPrivacyBundle = {
  exportedAt: string;
  hasPreferences: boolean;
  hasPlan: boolean;
  storedKeys: string[];
  preferences: OnboardingPreferences;
  plan: PersonalNurAIPlan | null;
  summary: PersonalHomePlanSummary | null;
  transparency: PersonalizationTransparencyHandoff | null;
};

export const ONBOARDING_PREFERENCES_KEY = "onboarding_preferences";
export const PERSONAL_NURAI_PLAN_KEY = "nurai_personal_plan";
export const ONBOARDING_COMPLETED_KEY = "onboarding_completed";

const DEFAULT_PREFERENCES: OnboardingPreferences = {
  interests: [],
  level: "beginner",
  quranLevel: "quran_starting",
  arabicLevel: "arabic_letters",
  guidancePreference: "no_madhhab_preference",
  familyNeeds: ["just_me"],
  language: "english",
  prayerHabit: "building_salah",
  prayerSetup: "before_prayer",
  themeAccent: "emerald",
};

export function guidancePreferenceToGlobalMadhab(preference: string): string {
  switch (preference) {
    case "hanafi":
    case "maliki":
    case "shafii":
    case "hanbali":
      return preference;
    default:
      return "general";
  }
}

export function buildPersonalNurAIPlan(
  preferences: OnboardingPreferences,
): PersonalNurAIPlan {
  const hasQuran = preferences.interests.includes("quran");
  const hasArabic =
    preferences.interests.includes("arabic") ||
    preferences.arabicLevel !== "arabic_letters";
  const hasFamily =
    preferences.familyNeeds.includes("spouse_family") ||
    preferences.familyNeeds.includes("kids_learning") ||
    preferences.interests.includes("community") ||
    preferences.interests.includes("kids");
  const hasScholarReview =
    preferences.guidancePreference === "ask_scholar_sensitive";
  const completedSignals = [
    preferences.interests.length > 0,
    Boolean(preferences.level),
    Boolean(preferences.quranLevel),
    Boolean(preferences.arabicLevel),
    Boolean(preferences.guidancePreference),
    preferences.familyNeeds.length > 0,
    Boolean(preferences.language),
    Boolean(preferences.prayerHabit),
    Boolean(preferences.prayerSetup),
    Boolean(preferences.themeAccent),
  ].filter(Boolean).length;
  const prayerFocus =
    preferences.prayerHabit === "qada_catchup"
      ? "Plan a gentle qada catch-up rhythm"
      : preferences.prayerHabit === "family_jamaah"
        ? "Build a family or jamaah prayer rhythm"
        : preferences.prayerHabit === "consistent_salah"
          ? "Protect consistency without adding noise"
          : "Stabilise one prayer window at a time";
  const prayerDailyLabel =
    preferences.prayerHabit === "qada_catchup"
      ? "Protect the next prayer and log one catch-up step"
      : preferences.prayerHabit === "family_jamaah"
        ? "Protect the next prayer with family or jamaah"
        : preferences.prayerHabit === "consistent_salah"
          ? "Protect the next prayer window"
          : "Protect one prayer window today";
  const recommendedStart = hasQuran
    ? {
        label:
          preferences.quranLevel === "quran_hifz"
            ? "Open Quran and review a small hifz set"
            : "Open Quran and complete one calm ayah moment",
        routeHint: "QuranReader" as const,
        reason: "Quran is one of your selected anchors.",
      }
    : hasArabic
      ? {
          label: "Start one Quranic Arabic lesson",
          routeHint: "ArabicLearning" as const,
          reason: "Arabic growth is strongest with a tiny daily loop.",
        }
      : {
          label: prayerDailyLabel,
          routeHint: "PrayerTimes" as const,
          reason: "Prayer rhythm is the safest first anchor.",
        };
  const weeklyReview = {
    label: hasScholarReview
      ? "Review saved questions before scholar escalation"
      : hasFamily
        ? "Review family worship rhythm"
        : "Review Quran, prayer, and learning momentum",
    cadence:
      preferences.prayerHabit === "qada_catchup" ? "twice weekly" : "weekly",
    proofLabel: hasScholarReview
      ? "Sensitive packets checked"
      : hasFamily
        ? "Family action completed"
        : "Daily path adjusted",
  };
  const planRationale = [
    hasQuran
      ? "Quran was selected as a primary interest."
      : "Prayer is used as the default daily anchor.",
    `Quran level: ${quranLabel(preferences.quranLevel)}.`,
    `Arabic level: ${arabicLabel(preferences.arabicLevel)}.`,
    hasScholarReview
      ? "Sensitive questions should create review packets."
      : "Answers should stay source-first with visible limits.",
    hasFamily
      ? "Family support should appear in weekly actions."
      : "The plan should stay personal and low-noise.",
  ];

  return {
    createdAt: new Date().toISOString(),
    title: "Your first 7 days with NurAI",
    primaryAnchor: hasQuran ? "quran" : "prayer",
    trustMode: hasScholarReview ? "scholar_review_first" : "source_first",
    sensitiveQuestionPolicy: hasScholarReview
      ? "Sensitive questions should be packaged for scholar review before confident personal guidance."
      : "Sensitive questions should stay source-first and avoid confident personal rulings.",
    recommendedStart,
    weeklyReview,
    planRationale,
    setupQuality: {
      completedSignals,
      totalSignals: 10,
      label:
        completedSignals >= 9
          ? "Personal plan ready"
          : "Plan will keep adapting",
    },
    firstWeekFocus: [
      hasQuran ? "Make Quran the daily anchor" : prayerFocus,
      hasArabic ? "Add a short Arabic practice loop" : "Save one reflection",
      hasFamily
        ? "Include a family-friendly action"
        : "Choose one learning path",
      hasScholarReview
        ? "Escalate sensitive questions"
        : "Keep answers source-first",
    ],
    dailyPath: [
      {
        id: "protect_salah",
        label: prayerDailyLabel,
        cadence: preferences.prayerSetup,
      },
      {
        id: "quran_light",
        label:
          preferences.quranLevel === "quran_hifz"
            ? "Review a small hifz set"
            : "Read or listen to one Quran moment",
        cadence: "daily",
      },
      hasArabic
        ? {
            id: "arabic_step",
            label: "Complete one Quranic Arabic lesson",
            cadence: "daily",
          }
        : {
            id: "reflection_step",
            label: "Save one reflection or dua",
            cadence: "daily",
          },
      hasFamily
        ? {
            id: "family_circle",
            label: "Invite family into one gentle action",
            cadence: "weekly",
          }
        : {
            id: "library_step",
            label: "Read one short Library lesson",
            cadence: "weekly",
          },
    ],
    preferences,
  };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizePreferences(raw: unknown): OnboardingPreferences {
  const parsed =
    raw && typeof raw === "object"
      ? (raw as Partial<OnboardingPreferences>)
      : {};
  return {
    interests: stringArray(parsed.interests),
    level: String(parsed.level || DEFAULT_PREFERENCES.level),
    quranLevel: String(parsed.quranLevel || DEFAULT_PREFERENCES.quranLevel),
    arabicLevel: String(parsed.arabicLevel || DEFAULT_PREFERENCES.arabicLevel),
    guidancePreference: String(
      parsed.guidancePreference || DEFAULT_PREFERENCES.guidancePreference,
    ),
    familyNeeds: stringArray(parsed.familyNeeds).length
      ? stringArray(parsed.familyNeeds)
      : DEFAULT_PREFERENCES.familyNeeds,
    language: String(parsed.language || DEFAULT_PREFERENCES.language),
    prayerHabit: String(parsed.prayerHabit || DEFAULT_PREFERENCES.prayerHabit),
    prayerSetup: String(parsed.prayerSetup || DEFAULT_PREFERENCES.prayerSetup),
    themeAccent: String(parsed.themeAccent || DEFAULT_PREFERENCES.themeAccent),
  };
}

function parseStoredJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function quranLabel(level: string): string {
  switch (level) {
    case "quran_deep_study":
      return "Translation + tafsir";
    case "quran_daily_reader":
      return "Daily reader";
    case "quran_hifz":
      return "Hifz review";
    case "quran_starting":
      return "Gentle Quran start";
    default:
      return "Gentle Quran start";
  }
}

function arabicLabel(level: string): string {
  switch (level) {
    case "arabic_quran_words":
      return "Quran words";
    case "arabic_sentences":
      return "Sentence practice";
    case "arabic_reading":
      return "Reading fluency";
    default:
      return "Letter confidence";
  }
}

function guidanceLabel(preference: string): string {
  switch (preference) {
    case "hanafi":
      return "Hanafi-aware";
    case "maliki":
      return "Maliki-aware";
    case "shafii":
      return "Shafi'i-aware";
    case "hanbali":
      return "Hanbali-aware";
    case "ask_scholar_sensitive":
      return "Scholar review first";
    default:
      return "Source-first";
  }
}

function familyLabel(needs: string[]): string {
  if (needs.includes("kids_learning")) return "Kids learning";
  if (needs.includes("spouse_family")) return "Family rhythm";
  if (needs.includes("new_muslim_support")) return "New Muslim care";
  return "Personal path";
}

function prayerHabitLabel(habit: string): string {
  switch (habit) {
    case "consistent_salah":
      return "Consistent salah";
    case "qada_catchup":
      return "Catch-up support";
    case "family_jamaah":
      return "Family/jamaah";
    case "building_salah":
      return "Building consistency";
    default:
      return "Building consistency";
  }
}

function anchorLabel(
  plan: PersonalNurAIPlan | null,
  preferences: OnboardingPreferences,
) {
  if (
    plan?.primaryAnchor === "quran" ||
    preferences.interests.includes("quran")
  ) {
    return "Quran anchored";
  }
  if (preferences.interests.includes("arabic")) return "Arabic growth";
  if (preferences.interests.includes("community")) return "Community care";
  return "Prayer anchored";
}

function normalizeDailyPath(plan: PersonalNurAIPlan | null): string[] {
  const labels =
    plan?.dailyPath
      ?.map((item) => String(item?.label || "").trim())
      .filter(Boolean) || [];
  if (labels.length > 0) return labels.slice(0, 4);
  return [
    "Protect the next prayer",
    "Read or listen to one Quran moment",
    "Complete one learning step",
    "Save one reflection",
  ];
}

function normalizePlanRationale(
  plan: PersonalNurAIPlan | null,
  preferences: OnboardingPreferences,
): string[] {
  const rationale =
    plan?.planRationale
      ?.map((item) => String(item || "").trim())
      .filter(Boolean) || [];
  if (rationale.length > 0) return rationale.slice(0, 5);
  return [
    preferences.interests.includes("quran")
      ? "Quran was selected as a primary interest."
      : "Prayer is used as the default daily anchor.",
    `Quran level: ${quranLabel(preferences.quranLevel)}.`,
    `Arabic level: ${arabicLabel(preferences.arabicLevel)}.`,
  ];
}

function daysSince(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
}

function buildPlanFreshnessLabel(plan: PersonalNurAIPlan | null): string {
  const age = daysSince(plan?.createdAt);
  if (age === null) return "Freshness: preferences only";
  if (age <= 1) return "Freshness: updated today";
  if (age < 7) return `Freshness: updated ${age} days ago`;
  if (age < 30) {
    const weeks = Math.max(1, Math.floor(age / 7));
    return `Freshness: updated ${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  return "Freshness: review recommended";
}

function buildPlanReviewDueLabel(
  plan: PersonalNurAIPlan | null,
  reviewCadenceLabel: string,
): string {
  const age = daysSince(plan?.createdAt);
  const cadence = reviewCadenceLabel.split(":")[0]?.trim() || "weekly";
  if (age !== null && age >= 30) return "Review due: update your plan";
  return `Review due: ${cadence}`;
}

function humanizePreferenceToken(value: string): string {
  return value.replace(/[_-]/g, " ").trim();
}

function buildPersonalizationSignalReceipts(input: {
  preferences: OnboardingPreferences;
  anchor: string;
  quran: string;
  guidance: string;
  family: string;
  prayerHabit: string;
  trustMode: PersonalHomePlanSummary["trustMode"];
}): PersonalizationSignalReceipt[] {
  const interests = input.preferences.interests
    .map(humanizePreferenceToken)
    .filter(Boolean);
  const familyNeeds = input.preferences.familyNeeds
    .map(humanizePreferenceToken)
    .filter(Boolean);

  return [
    {
      id: "goal_anchor",
      label: input.anchor,
      evidenceLabel: interests.length
        ? `${interests.slice(0, 3).join(", ")} from onboarding`
        : "Default prayer-first setup",
      boundaryLabel: "Uses saved goals only; it does not infer hidden intent.",
    },
    {
      id: "quran_level",
      label: input.quran,
      evidenceLabel: `Quran level: ${humanizePreferenceToken(input.preferences.quranLevel)}`,
      boundaryLabel: "Adjusts reading size and prompts, not religious status.",
    },
    {
      id: "guidance_boundary",
      label: input.guidance,
      evidenceLabel:
        input.trustMode === "scholar_review_first"
          ? "Sensitive answers route to Scholar Review"
          : "Answers stay source-first with visible limits",
      boundaryLabel: "Personalization is not scholar approval or a fatwa.",
    },
    {
      id: "prayer_family",
      label: `${input.prayerHabit} • ${input.family}`,
      evidenceLabel: familyNeeds.length
        ? `Family need: ${familyNeeds.slice(0, 2).join(", ")}`
        : `Prayer rhythm: ${humanizePreferenceToken(input.preferences.prayerHabit)}`,
      boundaryLabel:
        "Family and prayer signals shape reminders without exposing private notes.",
    },
  ];
}

function buildPersonalizationPlanSafetyReceipts(input: {
  summaryInput: {
    recommendedActionLabel: string;
    recommendedActionReason: string;
    reviewCadenceLabel: string;
    planFreshnessLabel: string;
    planReviewDueLabel: string;
    personalizationBoundaryLabel: string;
    trustMode: PersonalHomePlanSummary["trustMode"];
    dailyPath: string[];
  };
}): PersonalizationPlanSafetyReceipt[] {
  const summary = input.summaryInput;
  return [
    {
      id: "first_action",
      title: "First action",
      evidenceLabel: summary.recommendedActionLabel,
      boundaryLabel:
        "The first action is a starting point from saved preferences, not a judgment of your iman or effort.",
      actionLabel: summary.recommendedActionReason,
    },
    {
      id: "weekly_review",
      title: "Review cadence",
      evidenceLabel: summary.planReviewDueLabel,
      boundaryLabel:
        "Weekly review adjusts the plan without ranking worship or exposing private reflections.",
      actionLabel: `${summary.reviewCadenceLabel}. ${summary.planFreshnessLabel}.`,
    },
    {
      id: "ai_context",
      title: "AI context",
      evidenceLabel:
        summary.trustMode === "scholar_review_first"
          ? "Scholar-review-first context"
          : "Source-first context",
      boundaryLabel:
        "AI receives a short plan summary only; it must not invent hidden progress, private notes, or religious rulings.",
      actionLabel: summary.personalizationBoundaryLabel,
    },
    {
      id: "user_control",
      title: "User control",
      evidenceLabel: summary.planFreshnessLabel,
      boundaryLabel:
        "You can change onboarding choices; personalization should remain editable and reversible.",
      actionLabel: `${summary.planReviewDueLabel}; edit preferences when your rhythm changes.`,
    },
  ];
}

function buildPersonalizationPlanAdjustmentContract(input: {
  headline: string;
  anchor: string;
  quran: string;
  arabic: string;
  guidance: string;
  family: string;
  prayerHabit: string;
  recommendedActionLabel: string;
  recommendedActionReason: string;
  reviewCadenceLabel: string;
  planFreshnessLabel: string;
  planReviewDueLabel: string;
  personalizationBoundaryLabel: string;
  trustMode: PersonalHomePlanSummary["trustMode"];
  dailyPath: string[];
  planRationale: string[];
  personalizationReceipts: PersonalizationSignalReceipt[];
}): PersonalizationPlanAdjustmentContract {
  const signalLine = [
    input.anchor,
    input.quran,
    input.arabic,
    input.guidance,
    input.family,
    input.prayerHabit,
  ].join(" / ");
  const stale = input.planFreshnessLabel.includes("review recommended");
  const statusLabel = stale
    ? "Plan review recommended"
    : `${input.planReviewDueLabel} • ${input.trustMode === "scholar_review_first" ? "Scholar-review-first" : "Source-first"}`;

  return {
    title: "Adjust personal plan",
    statusLabel,
    actionLabel: stale ? "Review my plan" : "Tune next step",
    controlsLabel: "Open Settings",
    boundaryLabel:
      "Plan adjustment uses visible saved preferences only; it does not edit private notes, create scholar approval, or make a religious ruling.",
    prompt: `Help me safely adjust my NurAI personal plan using only this visible plan summary.\n\nPlan: ${input.headline}\nSignals: ${signalLine}\nRecommended action: ${input.recommendedActionLabel}\nReason: ${input.recommendedActionReason}\nDaily path: ${input.dailyPath.join(" / ")}\nReview cadence: ${input.reviewCadenceLabel}\nFreshness: ${input.planFreshnessLabel}\nReview due: ${input.planReviewDueLabel}\nTrust boundary: ${input.personalizationBoundaryLabel}\nRationale: ${input.planRationale.join(" / ")}\nReceipts: ${input.personalizationReceipts.map((receipt) => `${receipt.label}: ${receipt.evidenceLabel}`).join(" / ")}\n\nReturn: 1) what to keep, 2) one small adjustment for today, 3) what I should change in onboarding or settings if this plan feels wrong. Do not infer hidden intent, private journal text, religious status, or scholar approval. Sensitive religious questions should be taken to qualified human help.`,
    items: [
      {
        id: "visible_signals",
        title: "Visible signals",
        evidenceLabel: `${input.personalizationReceipts.length} saved signal receipts`,
        actionLabel: "Use saved choices only",
        boundaryLabel:
          "No hidden intent, private notes, or unshown activity are inferred.",
      },
      {
        id: "freshness",
        title: "Freshness",
        evidenceLabel: input.planFreshnessLabel,
        actionLabel: input.planReviewDueLabel,
        boundaryLabel:
          "Freshness is a reminder to review choices, not a judgment of worship.",
      },
      {
        id: "trust_boundary",
        title: "Trust mode",
        evidenceLabel:
          input.trustMode === "scholar_review_first"
            ? "Sensitive questions route to Scholar Review"
            : "Answers stay source-first",
        actionLabel: input.personalizationBoundaryLabel,
        boundaryLabel:
          "Plan adjustment is not scholar review evidence or a fatwa.",
      },
      {
        id: "user_control",
        title: "User control",
        evidenceLabel: "Editable and reversible",
        actionLabel: "Open controls when your rhythm changes",
        boundaryLabel:
          "The user can inspect, export, or delete personalization data in trust surfaces.",
      },
    ],
  };
}

function buildPersonalizationReadinessContract(input: {
  preferences: OnboardingPreferences;
  plan: PersonalNurAIPlan | null;
  trustMode: PersonalHomePlanSummary["trustMode"];
  recommendedActionLabel: string;
  reviewCadenceLabel: string;
  planFreshnessLabel: string;
  personalizationBoundaryLabel: string;
  dailyPath: string[];
}): PersonalizationReadinessContract {
  const completedSignals = Math.max(
    0,
    input.plan?.setupQuality?.completedSignals ||
      [
        input.preferences.interests.length > 0,
        Boolean(input.preferences.level),
        Boolean(input.preferences.quranLevel),
        Boolean(input.preferences.arabicLevel),
        Boolean(input.preferences.guidancePreference),
        input.preferences.familyNeeds.length > 0,
        Boolean(input.preferences.language),
        Boolean(input.preferences.prayerHabit),
        Boolean(input.preferences.prayerSetup),
        Boolean(input.preferences.themeAccent),
      ].filter(Boolean).length,
  );
  const totalSignals = Math.max(
    1,
    input.plan?.setupQuality?.totalSignals || 10,
  );
  const readyEnough = completedSignals >= 8;
  const firstWeekFocus =
    input.plan?.firstWeekFocus?.filter(Boolean).slice(0, 3) || [];

  return {
    title: "Personal plan readiness",
    statusLabel: readyEnough
      ? `${completedSignals}/${totalSignals} setup signals ready`
      : `${completedSignals}/${totalSignals} setup signals; plan will adapt`,
    actionLabel: input.recommendedActionLabel,
    boundaryLabel:
      "Readiness uses onboarding choices and visible plan signals only; it does not inspect private notes, create scholar approval, or rank worship.",
    items: [
      {
        id: "signals",
        title: "Saved signals",
        evidenceLabel: `${completedSignals}/${totalSignals} onboarding signals`,
        boundaryLabel:
          "NurAI uses chosen goals, levels, language, prayer rhythm, and family needs only.",
        tone: "primary",
      },
      {
        id: "first_week",
        title: "First week",
        evidenceLabel:
          firstWeekFocus.length > 0
            ? firstWeekFocus.join(" / ")
            : input.dailyPath.slice(0, 3).join(" / "),
        boundaryLabel:
          "The first week stays small: one Quran, prayer, learning, or family action at a time.",
        tone: "primary",
      },
      {
        id: "trust",
        title: "Trust mode",
        evidenceLabel:
          input.trustMode === "scholar_review_first"
            ? "Scholar-review-first"
            : "Source-first",
        boundaryLabel: input.personalizationBoundaryLabel,
        tone: "scholar",
      },
      {
        id: "review",
        title: "Review loop",
        evidenceLabel: `${input.reviewCadenceLabel}. ${input.planFreshnessLabel}.`,
        boundaryLabel:
          "Review changes the plan gently; it is not a judgment of religious status.",
        tone: "control",
      },
      {
        id: "controls",
        title: "User control",
        evidenceLabel: "Editable, exportable, and reversible",
        boundaryLabel:
          "Use Settings to inspect, export, or delete personalization data.",
        tone: "control",
      },
    ],
  };
}

function buildPersonalizationDataRightReceipts(input: {
  allowedSignals: string[];
  hasPreferences: boolean;
  hasPlan: boolean;
}): PersonalizationDataRightReceipt[] {
  const savedState = input.hasPlan
    ? "Generated plan saved"
    : input.hasPreferences
      ? "Preferences saved"
      : "Default profile only";
  const signalCount = input.allowedSignals.length;

  return [
    {
      id: "inspect_personalization",
      title: "Inspect inputs",
      evidenceLabel: `${signalCount} visible personalization signal${signalCount === 1 ? "" : "s"}`,
      userActionLabel: "Review what NurAI uses before asking",
      boundaryLabel:
        "Only onboarding choices and plan summaries are shown here; private notes, saved answers, review packets, health data, and location are separate.",
      icon: "eye",
      tone: "primary",
    },
    {
      id: "adjust_plan",
      title: "Adjust plan",
      evidenceLabel: savedState,
      userActionLabel: "Update onboarding choices when your rhythm changes",
      boundaryLabel:
        "Changing the plan tunes daily nudges; it does not create scholar approval, a fatwa, or a measure of religious status.",
      icon: "sliders",
      tone: "control",
    },
    {
      id: "export_plan",
      title: "Export snapshot",
      evidenceLabel: "Manual share-sheet export",
      userActionLabel: "Share only after reviewing the text",
      boundaryLabel:
        "Exports contain the plan receipt only; they do not prove production release, database state, source-pack review, or scholar review.",
      icon: "download",
      tone: "primary",
    },
    {
      id: "delete_plan",
      title: "Delete plan data",
      evidenceLabel: "Removes saved plan keys on this device",
      userActionLabel: "Reset personalization without deleting Quran notes",
      boundaryLabel:
        "Delete removes onboarding preferences and generated plan data here; external screenshots, shared exports, backups, and reviewer copies are outside this device.",
      icon: "trash-2",
      tone: "scholar",
    },
  ];
}

export function buildPersonalHomePlanSummary(
  preferences: OnboardingPreferences,
  plan: PersonalNurAIPlan | null,
): PersonalHomePlanSummary {
  const trustMode =
    plan?.trustMode === "scholar_review_first" ||
    preferences.guidancePreference === "ask_scholar_sensitive"
      ? "scholar_review_first"
      : "source_first";
  const dailyPath = normalizeDailyPath(plan);
  const quran = quranLabel(preferences.quranLevel);
  const arabic = arabicLabel(preferences.arabicLevel);
  const guidance = guidanceLabel(preferences.guidancePreference);
  const family = familyLabel(preferences.familyNeeds);
  const prayerHabit = prayerHabitLabel(preferences.prayerHabit);
  const anchor = anchorLabel(plan, preferences);
  const recommendedActionLabel =
    plan?.recommendedStart?.label || dailyPath[0] || "Protect the next prayer";
  const recommendedActionReason =
    plan?.recommendedStart?.reason ||
    "NurAI starts with the smallest action that matches your setup.";
  const reviewCadenceLabel = plan?.weeklyReview
    ? `${plan.weeklyReview.cadence}: ${plan.weeklyReview.label}`
    : "weekly: Review Quran, prayer, and learning momentum";
  const planFreshnessLabel = buildPlanFreshnessLabel(plan);
  const planReviewDueLabel = buildPlanReviewDueLabel(plan, reviewCadenceLabel);
  const setupQualityLabel =
    plan?.setupQuality?.label ||
    (preferences.interests.length > 0
      ? "Personal plan ready"
      : "Plan will keep adapting");
  const personalizationBoundaryLabel =
    trustMode === "scholar_review_first"
      ? "Personalization uses your choices; sensitive questions still need a separate scholar-review packet."
      : "Personalization uses your choices; answers remain source-first with visible limits.";
  const planRationale = normalizePlanRationale(plan, preferences);
  const personalizationReceipts = buildPersonalizationSignalReceipts({
    preferences,
    anchor,
    quran,
    guidance,
    family,
    prayerHabit,
    trustMode,
  });
  const planSafetyReceipts = buildPersonalizationPlanSafetyReceipts({
    summaryInput: {
      recommendedActionLabel,
      recommendedActionReason,
      reviewCadenceLabel,
      planFreshnessLabel,
      planReviewDueLabel,
      personalizationBoundaryLabel,
      trustMode,
      dailyPath,
    },
  });
  const headline = `${anchor} daily plan`;
  const planAdjustment = buildPersonalizationPlanAdjustmentContract({
    headline,
    anchor,
    quran,
    arabic,
    guidance,
    family,
    prayerHabit,
    recommendedActionLabel,
    recommendedActionReason,
    reviewCadenceLabel,
    planFreshnessLabel,
    planReviewDueLabel,
    personalizationBoundaryLabel,
    trustMode,
    dailyPath,
    planRationale,
    personalizationReceipts,
  });
  const planReadiness = buildPersonalizationReadinessContract({
    preferences,
    plan,
    trustMode,
    recommendedActionLabel,
    reviewCadenceLabel,
    planFreshnessLabel,
    personalizationBoundaryLabel,
    dailyPath,
  });

  return {
    headline,
    anchorLabel: anchor,
    quranLabel: quran,
    arabicLabel: arabic,
    guidanceLabel: guidance,
    familyLabel: family,
    prayerHabitLabel: prayerHabit,
    trustMode,
    dailyPath,
    recommendedActionLabel,
    recommendedActionReason,
    reviewCadenceLabel,
    planFreshnessLabel,
    planReviewDueLabel,
    setupQualityLabel,
    personalizationBoundaryLabel,
    planRationale,
    personalizationReceipts,
    planSafetyReceipts,
    planAdjustment,
    planReadiness,
    signalLabels: [anchor, quran, arabic, guidance, family, prayerHabit],
    aiContextLine: `Personal NurAI plan: ${anchor}; Quran level ${quran}; Arabic level ${arabic}; guidance preference ${guidance}; family need ${family}; prayer habit ${prayerHabit}; plan freshness ${planFreshnessLabel}; review due ${planReviewDueLabel}; daily path ${dailyPath.join(
      " / ",
    )}; recommended start ${recommendedActionLabel}; review cadence ${reviewCadenceLabel}; rationale ${planRationale.join(
      " / ",
    )}; personalization receipts ${personalizationReceipts
      .map((receipt) => `${receipt.label} (${receipt.evidenceLabel})`)
      .join(" / ")}; plan safety receipts ${planSafetyReceipts
      .map((receipt) => `${receipt.title} (${receipt.evidenceLabel})`)
      .join(
        " / ",
      )}; plan readiness ${planReadiness.statusLabel} (${planReadiness.boundaryLabel}); plan adjustment ${planAdjustment.statusLabel} (${planAdjustment.boundaryLabel}); trust mode ${trustMode}; personalization boundary ${personalizationBoundaryLabel}.`,
  };
}

export function buildPersonalizationTransparencyHandoff(input: {
  preferences: OnboardingPreferences;
  summary: PersonalHomePlanSummary | null;
  hasPreferences: boolean;
  hasPlan: boolean;
}): PersonalizationTransparencyHandoff {
  const summary = input.summary;
  const trustMode =
    summary?.trustMode === "scholar_review_first"
      ? "Scholar review first"
      : summary
        ? "Source-first"
        : "Not personalized yet";
  const allowedSignals = summary
    ? [
        `Goal anchor: ${summary.anchorLabel}`,
        `Quran level: ${summary.quranLabel}`,
        `Arabic level: ${summary.arabicLabel}`,
        `Prayer rhythm: ${summary.prayerHabitLabel}`,
        `Family need: ${summary.familyLabel}`,
        `Guidance preference: ${summary.guidanceLabel}`,
      ]
    : [
        `Default Quran level: ${quranLabel(input.preferences.quranLevel)}`,
        `Default Arabic level: ${arabicLabel(input.preferences.arabicLevel)}`,
        `Default guidance: ${guidanceLabel(input.preferences.guidancePreference)}`,
      ];
  const protectedBoundaries = [
    "NurAI does not treat onboarding choices as scholarship, fatwa, or proof of religious status.",
    "Private notes, saved answers, Quran reflections, and review packets stay separate from this plan unless you open or export them.",
    summary?.trustMode === "scholar_review_first"
      ? "Sensitive questions should become scholar-review packets before confident personal guidance."
      : "Personal answers should remain source-first with visible limits and scholar-review routing for sensitive cases.",
  ];
  const dataRights = buildPersonalizationDataRightReceipts({
    allowedSignals,
    hasPreferences: input.hasPreferences,
    hasPlan: input.hasPlan,
  });

  return {
    headline: summary
      ? "How NurAI personalizes your day"
      : "Personalization is waiting for onboarding",
    statusLabel: `${trustMode} • ${input.hasPlan ? "Plan saved" : input.hasPreferences ? "Preferences saved" : "Default profile"}`,
    allowedSignals: allowedSignals.slice(0, 6),
    protectedBoundaries,
    dataRights,
    nextActionLabel: summary
      ? `Next personalized action: ${summary.recommendedActionLabel}`
      : "Finish onboarding to create a personal NurAI plan.",
    freshnessLabel: summary?.planFreshnessLabel || "Freshness: no saved plan",
    reviewDueLabel:
      summary?.planReviewDueLabel || "Review due: after onboarding",
    exportBoundaryLabel:
      "This transparency handoff describes personalization inputs only; it is not scholar review evidence, production release proof, or a public claim.",
  };
}

export async function loadPersonalHomePlanSummary(): Promise<PersonalHomePlanSummary | null> {
  try {
    const [preferencesRaw, planRaw] = await Promise.all([
      AsyncStorage.getItem("onboarding_preferences"),
      AsyncStorage.getItem("nurai_personal_plan"),
    ]);
    if (!preferencesRaw && !planRaw) return null;
    const parsedPreferences = preferencesRaw ? JSON.parse(preferencesRaw) : {};
    const parsedPlan = planRaw
      ? (JSON.parse(planRaw) as PersonalNurAIPlan)
      : null;
    const preferences = normalizePreferences({
      ...parsedPlan?.preferences,
      ...parsedPreferences,
    });
    return buildPersonalHomePlanSummary(preferences, parsedPlan);
  } catch {
    return null;
  }
}

export async function loadPersonalNurAIPlanPrivacyBundle(): Promise<PersonalNurAIPlanPrivacyBundle> {
  const [preferencesRaw, planRaw] = await Promise.all([
    AsyncStorage.getItem(ONBOARDING_PREFERENCES_KEY),
    AsyncStorage.getItem(PERSONAL_NURAI_PLAN_KEY),
  ]);
  const parsedPlan = parseStoredJson<PersonalNurAIPlan>(planRaw);
  const parsedPreferences =
    parseStoredJson<Partial<OnboardingPreferences>>(preferencesRaw) || {};
  const preferences = normalizePreferences({
    ...parsedPlan?.preferences,
    ...parsedPreferences,
  });
  const summary =
    preferencesRaw || parsedPlan
      ? buildPersonalHomePlanSummary(preferences, parsedPlan)
      : null;
  const transparency = buildPersonalizationTransparencyHandoff({
    preferences,
    summary,
    hasPreferences: Boolean(preferencesRaw),
    hasPlan: Boolean(planRaw),
  });

  return {
    exportedAt: new Date().toISOString(),
    hasPreferences: Boolean(preferencesRaw),
    hasPlan: Boolean(planRaw),
    storedKeys: [
      preferencesRaw ? ONBOARDING_PREFERENCES_KEY : null,
      planRaw ? PERSONAL_NURAI_PLAN_KEY : null,
    ].filter(Boolean) as string[],
    preferences,
    plan: parsedPlan,
    summary,
    transparency,
  };
}

export function buildPersonalNurAIPlanExportText(
  bundle: PersonalNurAIPlanPrivacyBundle,
): string {
  if (!bundle.summary) {
    return [
      "NurAI personal plan export",
      `Exported: ${bundle.exportedAt}`,
      "",
      "No personal NurAI plan is saved on this device.",
    ].join("\n");
  }

  return [
    "NurAI personal plan export",
    `Exported: ${bundle.exportedAt}`,
    `Stored keys: ${bundle.storedKeys.join(", ") || "none"}`,
    "",
    `Headline: ${bundle.summary.headline}`,
    `Trust mode: ${bundle.summary.trustMode}`,
    `Recommended start: ${bundle.summary.recommendedActionLabel}`,
    `Reason: ${bundle.summary.recommendedActionReason}`,
    `Review cadence: ${bundle.summary.reviewCadenceLabel}`,
    `Plan freshness: ${bundle.summary.planFreshnessLabel}`,
    `Plan review due: ${bundle.summary.planReviewDueLabel}`,
    `Personalization boundary: ${bundle.summary.personalizationBoundaryLabel}`,
    "",
    "Daily path:",
    ...bundle.summary.dailyPath.map((step, index) => `${index + 1}. ${step}`),
    "",
    "Personal signals:",
    ...bundle.summary.signalLabels.map((signal) => `- ${signal}`),
    "",
    "Why this plan:",
    ...bundle.summary.personalizationReceipts.map(
      (receipt) =>
        `- ${receipt.label}: ${receipt.evidenceLabel}. Boundary: ${receipt.boundaryLabel}`,
    ),
    "",
    "Personalization transparency:",
    `Status: ${bundle.transparency?.statusLabel || "Unavailable"}`,
    `Freshness: ${bundle.transparency?.freshnessLabel || "Unavailable"}`,
    `Review due: ${bundle.transparency?.reviewDueLabel || "Unavailable"}`,
    `Next action: ${bundle.transparency?.nextActionLabel || "Unavailable"}`,
    "Allowed signals:",
    ...(bundle.transparency?.allowedSignals || []).map(
      (signal) => `- ${signal}`,
    ),
    "Protected boundaries:",
    ...(bundle.transparency?.protectedBoundaries || []).map(
      (boundary) => `- ${boundary}`,
    ),
    "Personalization data rights:",
    ...(bundle.transparency?.dataRights || []).map(
      (right) =>
        `- ${right.title}: ${right.evidenceLabel}. Action: ${right.userActionLabel}. Boundary: ${right.boundaryLabel}`,
    ),
    `Export boundary: ${bundle.transparency?.exportBoundaryLabel || "This export is not scholar review evidence or a release approval."}`,
    "",
    "Plan rationale:",
    ...bundle.summary.planRationale.map((reason) => `- ${reason}`),
    "",
    "Privacy note: this export describes on-device personalization data. It is not scholar review evidence or a release approval.",
  ].join("\n");
}

export async function deletePersonalNurAIPlanData(): Promise<void> {
  const keys = [
    ONBOARDING_PREFERENCES_KEY,
    PERSONAL_NURAI_PLAN_KEY,
    ONBOARDING_COMPLETED_KEY,
  ];
  await AsyncStorage.multiRemove(keys);
  keys.forEach(markDirtyByKey);
}
