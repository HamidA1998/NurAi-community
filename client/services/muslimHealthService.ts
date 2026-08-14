import AsyncStorage from "@react-native-async-storage/async-storage";

import { syncedSetItem } from "@/lib/progress-sync";

export type MuslimHealthDomain =
  | "hydration"
  | "sleep"
  | "movement"
  | "nutrition"
  | "fasting"
  | "stress"
  | "medical";

export type MuslimHealthAction = {
  id: string;
  domain: MuslimHealthDomain;
  title: string;
  body: string;
  islamicFrame: string;
  actionLabel: string;
  route?: string;
  minutes?: number;
  safetyNote?: string;
};

export type MuslimHealthProfile = {
  hydrationTargetCups: number;
  sleepTargetHours: number;
  movementTargetMinutes: number;
  fastingSupportEnabled: boolean;
  stressSupportEnabled: boolean;
  medicationReminderEnabled: boolean;
  completedActionIds: Record<string, string>;
  updatedAt: string;
};

export type MuslimHealthPlan = {
  dateKey: string;
  title: string;
  subtitle: string;
  progress: number;
  completed: number;
  total: number;
  actions: MuslimHealthAction[];
  safetyBoundaries: string[];
  sourceAnchors: string[];
};

export type MuslimHealthCompletionEvent = {
  actionId: string;
  actionTitle: string;
  messageTitle: string;
  messageBody: string;
  islamicFrame: string;
  sourceAnchor?: string;
  completedAt: string;
  dateKey: string;
  planProgress: number;
};

export const MUSLIM_HEALTH_STORAGE_KEY = "nurai_muslim_health_v1";
export const MUSLIM_HEALTH_COMPLETION_KEY = "nurai_muslim_health_completion_v1";

export const MUSLIM_HEALTH_PILLARS: MuslimHealthAction[] = [
  {
    id: "water-before-prayer",
    domain: "hydration",
    title: "Water before the next prayer",
    body: "Drink a glass of water before the next salah window.",
    islamicFrame:
      "Caring for the body supports worship; keep the action small and consistent.",
    actionLabel: "Mark water",
    route: "PrayerTimes",
  },
  {
    id: "sleep-wind-down",
    domain: "sleep",
    title: "Protect tonight's rest",
    body: "Set a gentle wind-down: dim the screen, prepare for sleep, and keep night adhkar close.",
    islamicFrame:
      "Rest is part of being able to show up well for Fajr and the next day.",
    actionLabel: "Open adhkar",
    route: "Adhkar",
    minutes: 10,
  },
  {
    id: "walk-reset",
    domain: "movement",
    title: "Walk gently",
    body: "Take a short walk or stretch. If you are unwell, keep it light and listen to your body.",
    islamicFrame:
      "Strength and steadiness are built through small habits, not harshness.",
    actionLabel: "Start reset",
    minutes: 8,
  },
  {
    id: "balanced-meal",
    domain: "nutrition",
    title: "Eat with balance",
    body: "Choose one balanced meal today and avoid overeating. Keep it simple, halal, and nourishing.",
    islamicFrame:
      "The Quran reminds believers to eat and drink without excess.",
    actionLabel: "Plan meal",
  },
  {
    id: "fasting-prep",
    domain: "fasting",
    title: "Fasting support",
    body: "If you plan to fast, prepare suhoor, hydration, and rest. If you are ill, pregnant, travelling, or medically unsure, ask a clinician and scholar.",
    islamicFrame:
      "Fasting is worship, but Islam does not ask you to ignore real harm.",
    actionLabel: "Open Ramadan",
    route: "Ramadan",
    safetyNote:
      "This is not a personal ruling or medical instruction. Get qualified advice for health conditions.",
  },
  {
    id: "stress-breathing",
    domain: "stress",
    title: "Calm the nervous system",
    body: "Take one minute: slow breathing, dhikr, and name what you need to do next.",
    islamicFrame:
      "Dhikr can steady the heart, while urgent distress still deserves human support.",
    actionLabel: "Open duas",
    route: "Duas",
    minutes: 1,
  },
  {
    id: "medicine-check",
    domain: "medical",
    title: "Medication and appointments",
    body: "Check prescriptions, appointments, and any symptoms you should not ignore.",
    islamicFrame:
      "Seeking treatment is compatible with tawakkul; do not delay urgent care.",
    actionLabel: "Review privately",
    safetyNote:
      "NurAI does not change medication, diagnose symptoms, or replace clinicians.",
  },
];

export const MUSLIM_HEALTH_RED_FLAGS = [
  "Chest pain, severe breathing trouble, stroke symptoms, collapse, heavy bleeding, or suicidal thoughts need emergency help now.",
  "Medication changes, pregnancy concerns, diabetes, eating disorders, severe dehydration, or chronic illness need a qualified clinician.",
  "Fiqh questions about fasting while ill, menstruation, pregnancy, travel, or medication timing should be checked with a qualified scholar.",
];

export function createDefaultMuslimHealthProfile(): MuslimHealthProfile {
  return {
    hydrationTargetCups: 6,
    sleepTargetHours: 7,
    movementTargetMinutes: 20,
    fastingSupportEnabled: false,
    stressSupportEnabled: true,
    medicationReminderEnabled: false,
    completedActionIds: {},
    updatedAt: new Date().toISOString(),
  };
}

export function getMuslimHealthDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function loadMuslimHealthProfile(): Promise<MuslimHealthProfile> {
  try {
    const raw = await AsyncStorage.getItem(MUSLIM_HEALTH_STORAGE_KEY);
    if (!raw) return createDefaultMuslimHealthProfile();
    return {
      ...createDefaultMuslimHealthProfile(),
      ...JSON.parse(raw),
    };
  } catch {
    return createDefaultMuslimHealthProfile();
  }
}

export async function saveMuslimHealthProfile(
  profile: MuslimHealthProfile,
): Promise<void> {
  await syncedSetItem(
    MUSLIM_HEALTH_STORAGE_KEY,
    JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }),
  );
}

export function buildMuslimHealthPlan(
  profile: MuslimHealthProfile,
  date = new Date(),
): MuslimHealthPlan {
  const dateKey = getMuslimHealthDateKey(date);
  const actions = MUSLIM_HEALTH_PILLARS.filter((action) => {
    if (action.domain === "fasting") return profile.fastingSupportEnabled;
    if (action.domain === "stress") return profile.stressSupportEnabled;
    if (action.domain === "medical") return profile.medicationReminderEnabled;
    return true;
  }).slice(0, 5);
  const completed = actions.filter(
    (action) => profile.completedActionIds[action.id] === dateKey,
  ).length;
  const total = actions.length || 1;

  return {
    dateKey,
    title: "Protect your health today",
    subtitle:
      "One calm care plan for water, sleep, movement, nutrition, stress, and medical boundaries.",
    progress: Math.round((completed / total) * 100),
    completed,
    total,
    actions,
    safetyBoundaries: MUSLIM_HEALTH_RED_FLAGS,
    sourceAnchors: [
      "Quran 2:195 - do not throw yourselves into harm",
      "Quran 7:31 - eat and drink without excess",
      "Qualified clinicians for diagnosis, medication, emergency symptoms, and treatment",
    ],
  };
}

export async function toggleMuslimHealthAction(
  actionId: string,
  profile: MuslimHealthProfile,
  date = new Date(),
): Promise<MuslimHealthProfile> {
  const dateKey = getMuslimHealthDateKey(date);
  const completedActionIds = { ...profile.completedActionIds };
  const wasComplete = completedActionIds[actionId] === dateKey;
  if (wasComplete) {
    delete completedActionIds[actionId];
  } else {
    completedActionIds[actionId] = dateKey;
  }
  const next = { ...profile, completedActionIds };
  await saveMuslimHealthProfile(next);
  if (!wasComplete) {
    const action = MUSLIM_HEALTH_PILLARS.find((item) => item.id === actionId);
    if (action) {
      const nextPlan = buildMuslimHealthPlan(next, date);
      const sourceAnchor =
        action.id === "balanced-meal" ? "Quran 7:31" : undefined;
      await syncedSetItem(
        MUSLIM_HEALTH_COMPLETION_KEY,
        JSON.stringify({
          actionId: action.id,
          actionTitle: action.title,
          messageTitle: "Alhamdulillah — care step complete",
          messageBody: `${action.title} is done. ${action.islamicFrame}`,
          islamicFrame: action.islamicFrame,
          sourceAnchor,
          completedAt: date.toISOString(),
          dateKey,
          planProgress: nextPlan.progress,
        } satisfies MuslimHealthCompletionEvent),
      );
    }
  } else {
    const lastCompletion = await loadRecentMuslimHealthCompletion(date);
    if (lastCompletion?.actionId === actionId) {
      await AsyncStorage.removeItem(MUSLIM_HEALTH_COMPLETION_KEY);
    }
  }
  return next;
}

export async function loadRecentMuslimHealthCompletion(
  now = new Date(),
): Promise<MuslimHealthCompletionEvent | null> {
  try {
    const raw = await AsyncStorage.getItem(MUSLIM_HEALTH_COMPLETION_KEY);
    if (!raw) return null;
    const event = JSON.parse(raw) as MuslimHealthCompletionEvent;
    const completedAt = new Date(event.completedAt).getTime();
    if (
      !event.actionId ||
      !event.messageTitle ||
      !Number.isFinite(completedAt) ||
      event.dateKey !== getMuslimHealthDateKey(now) ||
      now.getTime() - completedAt > 12 * 60 * 60_000
    ) {
      return null;
    }
    return event;
  } catch {
    return null;
  }
}

export function buildMuslimHealthAIPrompt(plan: MuslimHealthPlan): string {
  return `Build a safe Muslim health care plan using these boundaries:
Plan: ${plan.title}
Progress: ${plan.completed}/${plan.total}
Actions: ${plan.actions.map((action) => `${action.title}: ${action.body}`).join("; ")}
Safety: ${plan.safetyBoundaries.join(" ")}
Sources: ${plan.sourceAnchors.join("; ")}

Keep the response practical and gentle. Do not diagnose, prescribe, change medication, or give personal medical rulings. Only mention fasting if the user has enabled fasting support or explicitly asks about it. For urgent symptoms, medication, chronic illness, pregnancy, eating disorders, mental health crisis, or fasting while ill, tell the user to seek qualified medical and scholarly help.`;
}
