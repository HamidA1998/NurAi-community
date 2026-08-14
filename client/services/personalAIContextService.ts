import AsyncStorage from "@react-native-async-storage/async-storage";

import { syncedSetItem } from "@/lib/progress-sync";
import { getFeatureUsage } from "@/services/nuraiProfile";
import { loadProfileV3, recordFeatureUseV3 } from "@/services/nuraiProfileV3";
import {
  loadHomeAIContextExtras,
  type HomeAIContextExtras,
} from "@/services/homeAIContextService";
import {
  loadHomeAIFeedback,
  type HomeAIFeedbackState,
} from "@/services/homeAIFeedbackService";

export type PersonalAITopic =
  | "prayer"
  | "quran"
  | "arabic"
  | "dua"
  | "fiqh"
  | "travel"
  | "family"
  | "wellbeing"
  | "learning"
  | "accountability";

export type PersonalAIAnswerStyle =
  | "short_actions"
  | "source_anchored"
  | "step_by_step"
  | "gentle_reflection"
  | "balanced";

export type PersonalAIBehaviorState = {
  version: 1;
  updatedAt: string;
  totalPrompts: number;
  topicCounts: Partial<Record<PersonalAITopic, number>>;
  answerStyleCounts: Partial<Record<PersonalAIAnswerStyle, number>>;
  lastTopic?: PersonalAITopic;
  lastPromptAt?: string;
};

export type PersonalAIContext = {
  version: 1;
  label: "Personal AI";
  updatedAt: string;
  memorySummary: string[];
  behaviorSignals: string[];
  needsToKnow: string[];
  recentActions: string[];
  learnedPreferences: {
    preferredAnswerStyle: PersonalAIAnswerStyle;
    topicFocus: PersonalAITopic[];
    strongestAppAreas: string[];
    reminderTone: "gentle" | "accountability" | "balanced";
  };
  privacyBoundaries: string[];
};

export type PersonalAIMemorySettings = {
  version: 1;
  updatedAt: string;
  memoryEnabled: boolean;
  allowedTopics: PersonalAITopic[];
  preferredAnswerStyle?: PersonalAIAnswerStyle;
  reminderTone?: "gentle" | "accountability" | "balanced";
};

export type PersonalAIMemoryControlSummary = {
  settings: PersonalAIMemorySettings;
  behavior: PersonalAIBehaviorState;
  context: PersonalAIContext;
  memoryItemCount: number;
  needsToKnowCount: number;
  behaviorSignalCount: number;
  privacyBoundaryCount: number;
};

export const PERSONAL_AI_BEHAVIOR_KEY = "nurai_personal_ai_behavior_v1";
export const PERSONAL_AI_MEMORY_SETTINGS_KEY =
  "nurai_personal_ai_memory_settings_v1";

export const PERSONAL_AI_TOPIC_OPTIONS: {
  id: PersonalAITopic;
  label: string;
}[] = [
  { id: "prayer", label: "Prayer" },
  { id: "quran", label: "Quran" },
  { id: "arabic", label: "Arabic" },
  { id: "dua", label: "Dua and dhikr" },
  { id: "fiqh", label: "Fiqh sensitivity" },
  { id: "travel", label: "Travel" },
  { id: "family", label: "Family" },
  { id: "wellbeing", label: "Wellbeing" },
  { id: "learning", label: "Learning" },
  { id: "accountability", label: "Accountability" },
];

const DEFAULT_MEMORY_SETTINGS: PersonalAIMemorySettings = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  memoryEnabled: true,
  allowedTopics: PERSONAL_AI_TOPIC_OPTIONS.map((topic) => topic.id),
  preferredAnswerStyle: undefined,
  reminderTone: undefined,
};

const DEFAULT_BEHAVIOR: PersonalAIBehaviorState = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  totalPrompts: 0,
  topicCounts: {},
  answerStyleCounts: {},
};

function normalizeMemorySettings(value: unknown): PersonalAIMemorySettings {
  const raw = value && typeof value === "object" ? (value as any) : {};
  const allowed = Array.isArray(raw.allowedTopics)
    ? raw.allowedTopics.filter((topic: unknown): topic is PersonalAITopic =>
        PERSONAL_AI_TOPIC_OPTIONS.some((option) => option.id === topic),
      )
    : DEFAULT_MEMORY_SETTINGS.allowedTopics;
  const style = [
    "short_actions",
    "source_anchored",
    "step_by_step",
    "gentle_reflection",
    "balanced",
  ].includes(raw.preferredAnswerStyle)
    ? (raw.preferredAnswerStyle as PersonalAIAnswerStyle)
    : undefined;
  const reminderTone = ["gentle", "accountability", "balanced"].includes(
    raw.reminderTone,
  )
    ? (raw.reminderTone as PersonalAIMemorySettings["reminderTone"])
    : undefined;

  return {
    version: 1,
    updatedAt:
      typeof raw.updatedAt === "string"
        ? raw.updatedAt
        : DEFAULT_MEMORY_SETTINGS.updatedAt,
    memoryEnabled:
      typeof raw.memoryEnabled === "boolean" ? raw.memoryEnabled : true,
    allowedTopics: allowed.length
      ? allowed
      : DEFAULT_MEMORY_SETTINGS.allowedTopics,
    preferredAnswerStyle: style,
    reminderTone,
  };
}

function clampText(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}

function compactList(values: (string | null | undefined)[], limit: number) {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => clampText(value, 140)),
    ),
  ).slice(0, limit);
}

function topEntries<T extends string>(
  counts: Partial<Record<T, number>>,
  limit: number,
) {
  return Object.entries(counts)
    .map(([key, count]) => ({ key: key as T, count: Number(count) || 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function normalizeBehavior(value: unknown): PersonalAIBehaviorState {
  const raw = value && typeof value === "object" ? (value as any) : {};
  return {
    version: 1,
    updatedAt:
      typeof raw.updatedAt === "string"
        ? raw.updatedAt
        : DEFAULT_BEHAVIOR.updatedAt,
    totalPrompts: Math.max(0, Math.floor(Number(raw.totalPrompts) || 0)),
    topicCounts:
      raw.topicCounts && typeof raw.topicCounts === "object"
        ? raw.topicCounts
        : {},
    answerStyleCounts:
      raw.answerStyleCounts && typeof raw.answerStyleCounts === "object"
        ? raw.answerStyleCounts
        : {},
    lastTopic: raw.lastTopic,
    lastPromptAt:
      typeof raw.lastPromptAt === "string" ? raw.lastPromptAt : undefined,
  };
}

export async function loadPersonalAIBehavior(): Promise<PersonalAIBehaviorState> {
  try {
    const raw = await AsyncStorage.getItem(PERSONAL_AI_BEHAVIOR_KEY);
    return raw ? normalizeBehavior(JSON.parse(raw)) : DEFAULT_BEHAVIOR;
  } catch {
    return DEFAULT_BEHAVIOR;
  }
}

export async function loadPersonalAIMemorySettings(): Promise<PersonalAIMemorySettings> {
  try {
    const raw = await AsyncStorage.getItem(PERSONAL_AI_MEMORY_SETTINGS_KEY);
    return raw
      ? normalizeMemorySettings(JSON.parse(raw))
      : DEFAULT_MEMORY_SETTINGS;
  } catch {
    return DEFAULT_MEMORY_SETTINGS;
  }
}

export async function savePersonalAIMemorySettings(
  settings: Partial<PersonalAIMemorySettings>,
): Promise<PersonalAIMemorySettings> {
  const current = await loadPersonalAIMemorySettings();
  const next = normalizeMemorySettings({
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  });
  await syncedSetItem(PERSONAL_AI_MEMORY_SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export async function clearPersonalAIBehavior(): Promise<void> {
  await AsyncStorage.removeItem(PERSONAL_AI_BEHAVIOR_KEY);
}

export async function resetPersonalAIMemorySettings(): Promise<PersonalAIMemorySettings> {
  await AsyncStorage.removeItem(PERSONAL_AI_MEMORY_SETTINGS_KEY);
  return DEFAULT_MEMORY_SETTINGS;
}

export function classifyPersonalAITopic(text: string): PersonalAITopic {
  const lower = text.toLowerCase();
  if (/\b(fajr|dhuhr|zuhr|asr|maghrib|isha|salah|prayer|wudu)\b/.test(lower)) {
    return "prayer";
  }
  if (
    /\b(quran|ayah|surah|tafsir|recite|memorise|memorize|hifz)\b/.test(lower)
  ) {
    return "quran";
  }
  if (
    /\b(arabic|word|root|grammar|pronunciation|vocab|language)\b/.test(lower)
  ) {
    return "arabic";
  }
  if (/\b(dua|du'a|supplication|adhkar|dhikr)\b/.test(lower)) return "dua";
  if (/\b(fiqh|ruling|halal|haram|madhab|fatwa)\b/.test(lower)) return "fiqh";
  if (/\b(travel|journey|airport|hotel|umrah|hajj|qibla)\b/.test(lower)) {
    return "travel";
  }
  if (/\b(family|parent|child|spouse|marriage|kids)\b/.test(lower)) {
    return "family";
  }
  if (
    /\b(anxious|sad|stress|guilt|grief|overwhelmed|lonely|struggle)\b/.test(
      lower,
    )
  ) {
    return "wellbeing";
  }
  if (
    /\b(plan|habit|streak|goal|routine|accountable|consistent)\b/.test(lower)
  ) {
    return "accountability";
  }
  return "learning";
}

export function inferPersonalAIAnswerStyle(
  text: string,
): PersonalAIAnswerStyle {
  const lower = text.toLowerCase();
  if (/\b(short|quick|simple|brief|one thing|next step)\b/.test(lower)) {
    return "short_actions";
  }
  if (/\b(source|proof|evidence|reference|quran|hadith|cite)\b/.test(lower)) {
    return "source_anchored";
  }
  if (/\b(plan|steps|routine|schedule|checklist|roadmap)\b/.test(lower)) {
    return "step_by_step";
  }
  if (/\b(reflect|feel|heart|motivation|struggling|gentle)\b/.test(lower)) {
    return "gentle_reflection";
  }
  return "balanced";
}

export async function recordPersonalAIChatBehavior(
  promptText: string,
): Promise<PersonalAIBehaviorState> {
  const topic = classifyPersonalAITopic(promptText);
  const style = inferPersonalAIAnswerStyle(promptText);
  const current = await loadPersonalAIBehavior();
  const next: PersonalAIBehaviorState = {
    version: 1,
    updatedAt: new Date().toISOString(),
    totalPrompts: current.totalPrompts + 1,
    topicCounts: {
      ...current.topicCounts,
      [topic]: (current.topicCounts[topic] || 0) + 1,
    },
    answerStyleCounts: {
      ...current.answerStyleCounts,
      [style]: (current.answerStyleCounts[style] || 0) + 1,
    },
    lastTopic: topic,
    lastPromptAt: new Date().toISOString(),
  };

  await syncedSetItem(PERSONAL_AI_BEHAVIOR_KEY, JSON.stringify(next));
  await recordFeatureUseV3(`Personal AI: ${topic}`).catch(() => {});
  return next;
}

function feedbackSignals(feedback: HomeAIFeedbackState) {
  const ranked = Object.entries(feedback.categoryWeights || {})
    .map(([category, score]) => ({ category, score: Number(score) || 0 }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  const positive = ranked.find((entry) => entry.score > 0);
  const negative = ranked.find((entry) => entry.score < 0);

  return compactList(
    [
      positive
        ? `Responds well to ${positive.category.replace(/_/g, " ")} guidance`
        : null,
      negative
        ? `Show less ${negative.category.replace(/_/g, " ")} guidance unless urgent`
        : null,
    ],
    2,
  );
}

function buildNeedsToKnow(
  extras: HomeAIContextExtras,
  behavior: PersonalAIBehaviorState,
) {
  const topTopic = topEntries(behavior.topicCounts, 1)[0]?.key;
  return compactList(
    [
      extras.savedAnswers.scholarReviewRecommended > 0
        ? `${extras.savedAnswers.scholarReviewRecommended} saved answer${extras.savedAnswers.scholarReviewRecommended === 1 ? "" : "s"} should be reviewed before relying on them.`
        : null,
      extras.savedAnswers.needsSourceReview > 0
        ? `${extras.savedAnswers.needsSourceReview} saved answer${extras.savedAnswers.needsSourceReview === 1 ? "" : "s"} need stronger source support.`
        : null,
      extras.arabic.retentionRisk === "overdue" ||
      extras.arabic.retentionRisk === "due_today"
        ? extras.arabic.retentionBody
        : null,
      extras.travel.enabled
        ? `Travel Mode is active${extras.travel.destination ? ` for ${extras.travel.destination}` : ""}; keep prayer, Qibla, duas, and offline prep together.`
        : null,
      topTopic
        ? `Recent Personal AI questions lean toward ${topTopic.replace(/_/g, " ")}.`
        : null,
    ],
    5,
  );
}

export async function loadPersonalAIContext(): Promise<PersonalAIContext> {
  const [profile, featureUsage, extras, feedback, behavior, settings] =
    await Promise.all([
      loadProfileV3().catch(() => null),
      getFeatureUsage().catch(() => []),
      loadHomeAIContextExtras().catch(() => null),
      loadHomeAIFeedback().catch(() => null),
      loadPersonalAIBehavior(),
      loadPersonalAIMemorySettings(),
    ]);
  const safeExtras =
    extras || (await loadHomeAIContextExtras().catch(() => null));
  const privacyBoundaries = [
    "Use only visible app activity, saved preferences, and feedback signals.",
    "Do not claim to know the user's private life, intentions, hidden worship, messages, or off-app behavior.",
    "Do not reveal tracking details unless the user asks what Personal AI knows.",
    "For fiqh, health, marriage, finance, abuse, legal, or urgent questions, guide carefully and suggest qualified human help.",
  ];

  if (!settings.memoryEnabled) {
    return {
      version: 1,
      label: "Personal AI",
      updatedAt: new Date().toISOString(),
      memorySummary: [],
      behaviorSignals: [],
      needsToKnow: [],
      recentActions: [],
      learnedPreferences: {
        preferredAnswerStyle: settings.preferredAnswerStyle || "balanced",
        topicFocus: [],
        strongestAppAreas: [],
        reminderTone: settings.reminderTone || "balanced",
      },
      privacyBoundaries: [
        ...privacyBoundaries,
        "Personal AI memory is disabled by the user.",
      ],
    };
  }
  const topV3Features = (profile?.mostUsedFeatures || [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((item) => item.feature);
  const topLegacyFeatures = featureUsage
    .slice(0, 4)
    .map((item) => item.feature);
  const strongestAppAreas = compactList(
    [...topV3Features, ...topLegacyFeatures],
    5,
  );
  const allowedTopicSet = new Set(settings.allowedTopics);
  const topicFocus = topEntries(behavior.topicCounts, 6)
    .map((entry) => entry.key)
    .filter((topic) => allowedTopicSet.has(topic))
    .slice(0, 3);
  const preferredAnswerStyle =
    settings.preferredAnswerStyle ||
    topEntries(behavior.answerStyleCounts, 1)[0]?.key ||
    "balanced";
  const feedbackMemory = feedback ? feedbackSignals(feedback) : [];
  const quran = profile?.quranReadingHabit;
  const streak = profile?.streakData;
  const prayer = profile?.prayerStreaks;

  const memorySummary = compactList(
    [
      profile?.knowledgeLevel
        ? `Knowledge level: ${profile.knowledgeLevel}`
        : null,
      profile?.arabicLevel ? `Arabic level: ${profile.arabicLevel}` : null,
      quran
        ? `Quran: Surah ${quran.currentSurah}:${quran.currentAyah}, ${quran.totalVersesRead} ayahs read, ${quran.completionPercentage}% completion`
        : null,
      prayer
        ? `Prayer streaks: ${prayer.currentAllFive} all-five days, ${prayer.currentFajr} Fajr days`
        : null,
      streak
        ? `Habits: ${streak.currentStreak}-day streak; strongest ${streak.strongestHabit}; weakest ${streak.weakestHabit}`
        : null,
      profile?.learningPath?.preferredStyle
        ? `Learning style: ${profile.learningPath.preferredStyle}`
        : null,
      safeExtras?.savedAnswers.total
        ? `Saved AI answers: ${safeExtras.savedAnswers.total} saved, ${safeExtras.savedAnswers.sourceAware} source-aware`
        : null,
    ],
    7,
  );

  const behaviorSignals = compactList(
    [
      ...strongestAppAreas.map((feature) => `Uses ${feature} often`),
      ...topicFocus.map((topic) => `Asks Personal AI about ${topic}`),
      preferredAnswerStyle !== "balanced"
        ? `Often prefers ${preferredAnswerStyle.replace(/_/g, " ")} answers`
        : null,
      settings.reminderTone === "gentle" ||
      profile?.emotionalContext?.prefersGentle
        ? "Responds better to gentle reminders"
        : null,
      settings.reminderTone === "accountability" ||
      profile?.emotionalContext?.respondsToAccountability
        ? "Responds to accountability when it stays kind"
        : null,
      ...feedbackMemory,
    ],
    8,
  );

  const needsToKnow = safeExtras
    ? buildNeedsToKnow(safeExtras, behavior)
    : compactList(
        [
          topicFocus[0]
            ? `Recent Personal AI questions lean toward ${topicFocus[0]}.`
            : null,
        ],
        1,
      );

  return {
    version: 1,
    label: "Personal AI",
    updatedAt: new Date().toISOString(),
    memorySummary,
    behaviorSignals,
    needsToKnow,
    recentActions: strongestAppAreas,
    learnedPreferences: {
      preferredAnswerStyle,
      topicFocus,
      strongestAppAreas,
      reminderTone:
        settings.reminderTone ||
        (profile?.emotionalContext?.prefersGentle
          ? "gentle"
          : profile?.emotionalContext?.respondsToAccountability
            ? "accountability"
            : "balanced"),
    },
    privacyBoundaries,
  };
}

export async function loadPersonalAIMemoryControlSummary(): Promise<PersonalAIMemoryControlSummary> {
  const [settings, behavior, context] = await Promise.all([
    loadPersonalAIMemorySettings(),
    loadPersonalAIBehavior(),
    loadPersonalAIContext(),
  ]);

  return {
    settings,
    behavior,
    context,
    memoryItemCount: context.memorySummary.length,
    needsToKnowCount: context.needsToKnow.length,
    behaviorSignalCount: context.behaviorSignals.length,
    privacyBoundaryCount: context.privacyBoundaries.length,
  };
}

export function buildPersonalAIStarterPrompts(context: PersonalAIContext) {
  return compactList(
    [
      context.needsToKnow[0]
        ? `What do I need to know next? ${context.needsToKnow[0]}`
        : "What do I need to know next?",
      context.learnedPreferences.topicFocus[0]
        ? `Help me with ${context.learnedPreferences.topicFocus[0]} based on my recent pattern.`
        : "Build my next best step from what I have done in NurAI.",
      "Tell me what you know about my NurAI progress and what you are not allowed to assume.",
    ],
    3,
  );
}
