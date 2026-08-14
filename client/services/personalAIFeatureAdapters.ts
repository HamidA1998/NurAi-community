import type {
  AIModeId,
  PersonalAIActionCapability,
  PersonalAISurface,
} from "@shared/nuraiAI";

export type PersonalAIFeatureId =
  | "quran"
  | "arabic"
  | "hifz"
  | "prayer"
  | "duas"
  | "library"
  | "travel"
  | "weather"
  | "tasbeeh"
  | "health"
  | "womens_health"
  | "fiqh"
  | "revert_support"
  | "names_of_allah";

export type PersonalAIFeatureAdapter = {
  feature: PersonalAIFeatureId;
  surface: PersonalAISurface;
  modeId: AIModeId;
  title: string;
  contextSummary: string;
  sourceRule:
    | "verified_sources_required"
    | "app_context_allowed"
    | "source_cards_required"
    | "scholar_review_recommended";
  safeContext: Record<string, unknown>;
  actions: PersonalAIActionCapability[];
  trustBoundaries: string[];
};

type BaseInput = {
  currentItemLabel?: string;
  progressLabel?: string;
  dueLabel?: string;
  savedContextLabel?: string;
  userGoalLabel?: string;
};

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function action({
  id,
  label,
  route,
  reason,
}: {
  id: string;
  label: string;
  route?: string;
  reason: string;
}): PersonalAIActionCapability {
  return {
    id,
    label,
    route,
    reason,
    kind: route ? "open_feature" : "ask_followup",
    minimumTier: "premium",
    requiresConfirmation: false,
  };
}

function baseTrustBoundaries(
  sourceRule: PersonalAIFeatureAdapter["sourceRule"],
) {
  return [
    "Use only visible app context and user-approved Personal AI memory.",
    "Do not claim hidden knowledge of worship, intention, family life, or off-app behavior.",
    sourceRule === "source_cards_required" ||
    sourceRule === "verified_sources_required"
      ? "Specific Islamic claims need verified Quran, hadith, tafsir, or reviewed app source context."
      : "Use app context for coaching and route guidance, not unsupported religious claims.",
    "For fiqh, health, finance, marriage, inheritance, abuse, legal, or urgent matters, recommend qualified human help.",
  ];
}

export function buildQuranPersonalAIAdapter(
  input: BaseInput & {
    surahName?: string;
    ayahNumber?: number;
    readingPlanLabel?: string;
  } = {},
): PersonalAIFeatureAdapter {
  const sourceRule = "source_cards_required" as const;
  const current = input.surahName
    ? `${input.surahName}${input.ayahNumber ? `:${input.ayahNumber}` : ""}`
    : text(input.currentItemLabel, "Current Quran session");
  return {
    feature: "quran",
    surface: "quran",
    modeId: "quran_guide",
    title: "Quran Guide adapter",
    contextSummary: `${current}. ${text(input.readingPlanLabel, input.progressLabel || "Continue with one ayah, source-aware explanation, and reflection.")}`,
    sourceRule,
    safeContext: {
      current,
      readingPlanLabel: input.readingPlanLabel,
      progressLabel: input.progressLabel,
      userGoalLabel: input.userGoalLabel,
    },
    actions: [
      action({
        id: "open-quran",
        label: "Open Quran",
        route: "QuranReader",
        reason: "Continue reading or reflection at the current Quran point.",
      }),
      action({
        id: "save-reflection",
        label: "Save reflection",
        route: "QuranReader",
        reason: "Save a user-approved reflection after source-aware reading.",
      }),
    ],
    trustBoundaries: baseTrustBoundaries(sourceRule),
  };
}

export function buildArabicPersonalAIAdapter(
  input: BaseInput & {
    lessonLabel?: string;
    weakSkillLabel?: string;
  } = {},
): PersonalAIFeatureAdapter {
  const sourceRule = "app_context_allowed" as const;
  return {
    feature: "arabic",
    surface: "arabic",
    modeId: "arabic_tutor",
    title: "Arabic Tutor adapter",
    contextSummary: `${text(input.lessonLabel, "Current Arabic lesson")}. ${text(input.weakSkillLabel, input.dueLabel || "Review due words and explain one pattern.")}`,
    sourceRule,
    safeContext: {
      lessonLabel: input.lessonLabel,
      weakSkillLabel: input.weakSkillLabel,
      dueLabel: input.dueLabel,
      progressLabel: input.progressLabel,
    },
    actions: [
      action({
        id: "review-arabic",
        label: "Review Arabic",
        route: "ArabicLearning",
        reason: "Open the current Arabic lesson or due review.",
      }),
      action({
        id: "practice-sentence",
        label: "Try one sentence",
        route: "ArabicLearning",
        reason: "Practice one small sentence before moving on.",
      }),
    ],
    trustBoundaries: baseTrustBoundaries(sourceRule),
  };
}

export function buildHifzPersonalAIAdapter(
  input: BaseInput & {
    memorizedRangeLabel?: string;
    reviewRiskLabel?: string;
  } = {},
): PersonalAIFeatureAdapter {
  const sourceRule = "app_context_allowed" as const;
  return {
    feature: "hifz",
    surface: "hifz",
    modeId: "hifz_coach",
    title: "Hifz Coach adapter",
    contextSummary: `${text(input.memorizedRangeLabel, "Current memorisation range")}. ${text(input.reviewRiskLabel, input.dueLabel || "Make a sustainable review plan.")}`,
    sourceRule,
    safeContext: {
      memorizedRangeLabel: input.memorizedRangeLabel,
      reviewRiskLabel: input.reviewRiskLabel,
      dueLabel: input.dueLabel,
      progressLabel: input.progressLabel,
    },
    actions: [
      action({
        id: "open-hifz",
        label: "Open Hifz",
        route: "Hifz",
        reason: "Open memorisation and revision tools.",
      }),
      action({
        id: "plan-revision",
        label: "Plan revision",
        route: "Hifz",
        reason: "Build a revision plan from visible Hifz progress.",
      }),
    ],
    trustBoundaries: baseTrustBoundaries(sourceRule),
  };
}

export function buildPrayerPersonalAIAdapter(
  input: BaseInput & {
    nextPrayerLabel?: string;
    prayerWindowLabel?: string;
  } = {},
): PersonalAIFeatureAdapter {
  const sourceRule = "verified_sources_required" as const;
  return {
    feature: "prayer",
    surface: "prayer",
    modeId: "salah_coach",
    title: "Salah Coach adapter",
    contextSummary: `${text(input.nextPrayerLabel, "Next prayer")}. ${text(input.prayerWindowLabel, input.userGoalLabel || "Prepare calmly and improve khushu with one action.")}`,
    sourceRule,
    safeContext: {
      nextPrayerLabel: input.nextPrayerLabel,
      prayerWindowLabel: input.prayerWindowLabel,
      userGoalLabel: input.userGoalLabel,
    },
    actions: [
      action({
        id: "prepare-prayer",
        label: "Prepare for prayer",
        route: "PrayerTimes",
        reason: "Open prayer times and preparation details.",
      }),
      action({
        id: "review-salah",
        label: "Review salah",
        route: "SalahGuide",
        reason: "Open source-aware prayer learning.",
      }),
    ],
    trustBoundaries: baseTrustBoundaries(sourceRule),
  };
}

export function buildDuasPersonalAIAdapter(
  input: BaseInput & {
    situationLabel?: string;
    savedDuaLabel?: string;
  } = {},
): PersonalAIFeatureAdapter {
  const sourceRule = "verified_sources_required" as const;
  return {
    feature: "duas",
    surface: "duas",
    modeId: "dua_helper",
    title: "Dua Helper adapter",
    contextSummary: `${text(input.situationLabel, "User dua need")}. ${text(input.savedDuaLabel, "Suggest a suitable dua or dhikr with meaning and source boundaries.")}`,
    sourceRule,
    safeContext: {
      situationLabel: input.situationLabel,
      savedDuaLabel: input.savedDuaLabel,
      userGoalLabel: input.userGoalLabel,
    },
    actions: [
      action({
        id: "open-duas",
        label: "Open Duas",
        route: "Duas",
        reason: "Open the dua library for source-aware selection.",
      }),
      action({
        id: "add-dhikr",
        label: "Add dhikr habit",
        route: "Tasbeeh",
        reason: "Continue with a small dhikr action.",
      }),
    ],
    trustBoundaries: baseTrustBoundaries(sourceRule),
  };
}

export function buildLibraryPersonalAIAdapter(
  input: BaseInput & {
    bookTitle?: string;
    chapterLabel?: string;
    sourceStatusLabel?: string;
  } = {},
): PersonalAIFeatureAdapter {
  const sourceRule = "source_cards_required" as const;
  return {
    feature: "library",
    surface: "library",
    modeId: "ask_nurai",
    title: "Library Guide adapter",
    contextSummary: `${text(input.bookTitle, "Current Library item")}. ${text(input.chapterLabel, input.sourceStatusLabel || "Explain reviewed content and keep source limits clear.")}`,
    sourceRule,
    safeContext: {
      bookTitle: input.bookTitle,
      chapterLabel: input.chapterLabel,
      sourceStatusLabel: input.sourceStatusLabel,
      savedContextLabel: input.savedContextLabel,
    },
    actions: [
      action({
        id: "open-library",
        label: "Open Library",
        route: "LibraryHome",
        reason: "Open reviewed Library content.",
      }),
      action({
        id: "review-sources",
        label: "Review sources",
        route: "LibraryHome",
        reason: "Check source notes before relying on a claim.",
      }),
    ],
    trustBoundaries: baseTrustBoundaries(sourceRule),
  };
}

export function buildTravelPersonalAIAdapter(
  input: BaseInput & {
    destinationLabel?: string;
    readinessPercent?: number;
    detectionTitle?: string;
  } = {},
): PersonalAIFeatureAdapter {
  const sourceRule = "app_context_allowed" as const;
  return {
    feature: "travel",
    surface: "travel",
    modeId: "salah_coach",
    title: "Travel Companion adapter",
    contextSummary: `${text(input.destinationLabel, "Active journey")}. ${text(input.detectionTitle, `Travel readiness ${input.readinessPercent ?? 0}%. Keep prayer, Qibla, duas, and offline packs practical.`)}`,
    sourceRule,
    safeContext: {
      destinationLabel: input.destinationLabel,
      readinessPercent: input.readinessPercent,
      detectionTitle: input.detectionTitle,
    },
    actions: [
      action({
        id: "prepare-prayer",
        label: "Prepare for prayer",
        route: "PrayerTimes",
        reason: "Check prayer times for the journey window.",
      }),
    ],
    trustBoundaries: [
      ...baseTrustBoundaries(sourceRule),
      "Travel rulings stay general; recommend qualified help for complex fiqh on the road.",
    ],
  };
}

export function buildWeatherPersonalAIAdapter(
  input: BaseInput & {
    conditionLabel?: string;
    windKmh?: number;
    rainProbability?: number;
    nextPrayerLabel?: string;
  } = {},
): PersonalAIFeatureAdapter {
  const sourceRule = "app_context_allowed" as const;
  const weatherLine = [
    input.conditionLabel,
    input.windKmh != null ? `wind ${input.windKmh} km/h` : null,
    input.rainProbability != null ? `rain ${input.rainProbability}%` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return {
    feature: "weather",
    surface: "weather",
    modeId: "salah_coach",
    title: "Weather + Salah adapter",
    contextSummary: `${weatherLine || "Local weather"}. Plan ${text(input.nextPrayerLabel, "the next prayer")} with realistic outdoor and masjid timing.`,
    sourceRule,
    safeContext: {
      conditionLabel: input.conditionLabel,
      windKmh: input.windKmh,
      rainProbability: input.rainProbability,
      nextPrayerLabel: input.nextPrayerLabel,
    },
    actions: [
      action({
        id: "check-prayer",
        label: "Check prayer times",
        route: "PrayerTimes",
        reason: "Open prayer times with weather-aware planning.",
      }),
      action({
        id: "prepare-prayer",
        label: "Prepare for prayer",
        route: "PrayerTimes",
        reason: "Leave early if rain, wind, or cold affects the masjid walk.",
      }),
    ],
    trustBoundaries: baseTrustBoundaries(sourceRule),
  };
}

export function buildTasbeehPersonalAIAdapter(
  input: BaseInput & {
    dhikrLabel?: string;
    countToday?: number;
    targetCount?: number;
    nextPrayerLabel?: string;
  } = {},
): PersonalAIFeatureAdapter {
  const sourceRule = "verified_sources_required" as const;
  return {
    feature: "tasbeeh",
    surface: "tasbeeh",
    modeId: "dua_helper",
    title: "Dhikr Coach adapter",
    contextSummary: `${text(input.dhikrLabel, "Dhikr")}: ${input.countToday ?? 0}/${input.targetCount ?? 33} today. ${text(input.progressLabel, `Tie the next round to ${input.nextPrayerLabel || "a daily moment"}.`)}`,
    sourceRule,
    safeContext: {
      dhikrLabel: input.dhikrLabel,
      countToday: input.countToday,
      targetCount: input.targetCount,
      nextPrayerLabel: input.nextPrayerLabel,
    },
    actions: [
      action({
        id: "open-tasbeeh",
        label: "Open Tasbeeh",
        route: "Tasbeeh",
        reason: "Continue dhikr with a visible count target.",
      }),
      action({
        id: "add-dhikr",
        label: "Add dhikr habit",
        route: "Tasbeeh",
        reason: "Attach dhikr to prayer or a daily anchor.",
      }),
    ],
    trustBoundaries: baseTrustBoundaries(sourceRule),
  };
}

export function buildHealthPersonalAIAdapter(
  input: BaseInput & {
    stepsLabel?: string;
    sleepLabel?: string;
    recoveryLabel?: string;
    hydrationLabel?: string;
    readinessLabel?: string;
  } = {},
): PersonalAIFeatureAdapter {
  const sourceRule = "app_context_allowed" as const;
  const signals = [
    input.readinessLabel,
    input.stepsLabel,
    input.sleepLabel,
    input.recoveryLabel,
    input.hydrationLabel,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    feature: "health",
    surface: "contextual",
    modeId: "ask_nurai",
    title: "Body Amanah Coach adapter",
    contextSummary: `${signals || "Today's body signals"}. ${text(
      input.userGoalLabel,
      "Care for the body as an amanah: suggest one small, sustainable step that supports worship and energy.",
    )}`,
    sourceRule,
    safeContext: {
      stepsLabel: input.stepsLabel,
      sleepLabel: input.sleepLabel,
      recoveryLabel: input.recoveryLabel,
      hydrationLabel: input.hydrationLabel,
      readinessLabel: input.readinessLabel,
      privacyScope:
        "Only summarized, on-device health readings (steps, sleep, recovery, hydration) are included. Raw samples and location are not sent.",
    },
    actions: [
      action({
        id: "open-health",
        label: "Open Health Companion",
        route: "MuslimHealth",
        reason: "Review today's steps, sleep, recovery, and hydration.",
      }),
      action({
        id: "log-water",
        label: "Log water",
        route: "MuslimHealth",
        reason: "Take one small hydration step toward the daily target.",
      }),
    ],
    trustBoundaries: [
      ...baseTrustBoundaries(sourceRule),
      "This is wellbeing coaching, not medical advice. Recommend a qualified healthcare professional for symptoms, diagnoses, or concerns.",
      "Frame the body as an amanah; never shame the user about weight, food, or performance.",
    ],
  };
}

export function buildWomensHealthPersonalAIAdapter(
  input: BaseInput & {
    cyclePhaseLabel?: string;
    regularityLabel?: string;
    careSignalLabel?: string;
  } = {},
): PersonalAIFeatureAdapter {
  const sourceRule = "verified_sources_required" as const;
  return {
    feature: "womens_health",
    surface: "womens_health",
    modeId: "ask_nurai",
    title: "Women's Health adapter",
    contextSummary: `${text(input.cyclePhaseLabel, "Cycle phase")}. ${text(input.regularityLabel, input.careSignalLabel || "Use only saved phase and regularity signals, not private journal text.")}`,
    sourceRule,
    safeContext: {
      cyclePhaseLabel: input.cyclePhaseLabel,
      regularityLabel: input.regularityLabel,
      careSignalLabel: input.careSignalLabel,
      privacyScope:
        "Only anonymized cycle phase, duration, and regularity are included. Dates, notes, symptoms, and journal entries are not sent.",
    },
    actions: [
      action({
        id: "open-womens-health",
        label: "Open Women's Health",
        route: "WomensHealth",
        reason: "Review cycle tracking and worship guidance boundaries.",
      }),
      action({
        id: "ask-qualified-help",
        label: "Ask qualified human help",
        route: "Scholars",
        reason: "Sensitive health or fiqh cases need qualified human support.",
      }),
    ],
    trustBoundaries: [
      ...baseTrustBoundaries(sourceRule),
      "This is not medical advice. Recommend qualified scholars for worship rulings and healthcare professionals for medical concerns.",
      "Never infer or repeat private journal content, symptoms, or dates beyond supplied safe summaries.",
    ],
  };
}

export function buildFiqhPersonalAIAdapter(
  input: BaseInput & { topicLabel?: string } = {},
): PersonalAIFeatureAdapter {
  const sourceRule = "scholar_review_recommended" as const;
  return {
    feature: "fiqh",
    surface: "contextual",
    modeId: "scholar_mode",
    title: "Fiqh Learning adapter",
    contextSummary: text(
      input.topicLabel,
      "General fiqh learning question with source boundaries.",
    ),
    sourceRule,
    safeContext: { topicLabel: input.topicLabel },
    actions: [
      action({
        id: "prepare-scholar",
        label: "Prepare scholar question",
        route: "Scholars",
        reason: "Prepare evidence and questions for qualified review.",
      }),
      action({
        id: "review-sources",
        label: "Review sources",
        route: "LibraryHome",
        reason: "Check source cards before relying on a claim.",
      }),
    ],
    trustBoundaries: [
      ...baseTrustBoundaries(sourceRule),
      "Do not issue binding personal fatwa. Keep answers educational and madhhab-aware when sources support it.",
    ],
  };
}

export function buildRevertPersonalAIAdapter(
  input: BaseInput & {
    emotionLabel?: string;
    daysSinceShahada?: number;
  } = {},
): PersonalAIFeatureAdapter {
  const sourceRule = "app_context_allowed" as const;
  return {
    feature: "revert_support",
    surface: "contextual",
    modeId: "new_muslim_guide",
    title: "New Muslim Guide adapter",
    contextSummary: `${text(input.emotionLabel, "Growing Muslim journey")}. ${input.daysSinceShahada != null ? `${input.daysSinceShahada} days since shahada.` : "Be gentle, define terms, and keep steps small."}`,
    sourceRule,
    safeContext: {
      emotionLabel: input.emotionLabel,
      daysSinceShahada: input.daysSinceShahada,
    },
    actions: [
      action({
        id: "open-new-muslim",
        label: "Open New Muslim Guide",
        route: "NewMuslim",
        reason: "Open structured revert support and basics.",
      }),
      action({
        id: "learn-basics",
        label: "Learn basics",
        route: "NewMuslim",
        reason: "Take one small learning step without overwhelm.",
      }),
    ],
    trustBoundaries: baseTrustBoundaries(sourceRule),
  };
}

export function buildNamesPersonalAIAdapter(
  input: BaseInput & {
    nameLabel?: string;
    meaningLabel?: string;
  } = {},
): PersonalAIFeatureAdapter {
  const sourceRule = "verified_sources_required" as const;
  return {
    feature: "names_of_allah",
    surface: "contextual",
    modeId: "ask_nurai",
    title: "Names of Allah adapter",
    contextSummary: `${text(input.nameLabel, "Allah's Name")}: ${text(input.meaningLabel, "Reflect with meaning and one personal dua.")}`,
    sourceRule,
    safeContext: {
      nameLabel: input.nameLabel,
      meaningLabel: input.meaningLabel,
    },
    actions: [
      action({
        id: "open-duas",
        label: "Open Duas",
        route: "Duas",
        reason: "Turn the Name reflection into a personal dua moment.",
      }),
      action({
        id: "add-dhikr",
        label: "Add dhikr habit",
        route: "Tasbeeh",
        reason: "Continue with a small dhikr anchored to this Name.",
      }),
    ],
    trustBoundaries: baseTrustBoundaries(sourceRule),
  };
}

export function buildPersonalAIFeatureAdapter(
  feature: PersonalAIFeatureId,
  input: BaseInput & Record<string, unknown> = {},
): PersonalAIFeatureAdapter {
  switch (feature) {
    case "quran":
      return buildQuranPersonalAIAdapter(input);
    case "arabic":
      return buildArabicPersonalAIAdapter(input);
    case "hifz":
      return buildHifzPersonalAIAdapter(input);
    case "prayer":
      return buildPrayerPersonalAIAdapter(input);
    case "duas":
      return buildDuasPersonalAIAdapter(input);
    case "travel":
      return buildTravelPersonalAIAdapter(input);
    case "weather":
      return buildWeatherPersonalAIAdapter(input);
    case "tasbeeh":
      return buildTasbeehPersonalAIAdapter(input);
    case "health":
      return buildHealthPersonalAIAdapter(input);
    case "womens_health":
      return buildWomensHealthPersonalAIAdapter(input);
    case "fiqh":
      return buildFiqhPersonalAIAdapter(input);
    case "revert_support":
      return buildRevertPersonalAIAdapter(input);
    case "names_of_allah":
      return buildNamesPersonalAIAdapter(input);
    default:
      return buildLibraryPersonalAIAdapter(input);
  }
}

export function buildPersonalAIFeaturePrompt(
  adapter: PersonalAIFeatureAdapter,
  userPrompt: string,
) {
  return [
    `Feature: ${adapter.title}`,
    `Surface: ${adapter.surface}`,
    `Mode: ${adapter.modeId}`,
    `Context: ${adapter.contextSummary}`,
    `Source rule: ${adapter.sourceRule}`,
    "Trust boundaries:",
    ...adapter.trustBoundaries.map((boundary) => `- ${boundary}`),
    `User request: ${userPrompt}`,
  ].join("\n");
}
