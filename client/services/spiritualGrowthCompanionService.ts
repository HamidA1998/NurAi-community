import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PersonalHomePlanSummary } from "@/services/personalNurAIPlanService";

export type SpiritualGrowthCompanionSignalId =
  | "quran"
  | "prayer"
  | "learning"
  | "dhikr"
  | "reflection"
  | "family";

export type SpiritualGrowthCompanionMetric = {
  id: "active_days" | "today_actions" | "streak";
  label: string;
  value: string;
  helper: string;
};

export type SpiritualGrowthCompanionIntention = {
  title: string;
  body: string;
  routeHint: "Quran" | "PrayerTimes" | "LibraryHome" | "Tasbeeh";
};

export type SpiritualGrowthCompanion = {
  title: string;
  body: string;
  progressPercent: number;
  rhythmLabel: string;
  metrics: SpiritualGrowthCompanionMetric[];
  primaryIntention: SpiritualGrowthCompanionIntention;
  reflectionPrompt: string;
  evidenceSignals: string[];
  privacyBoundaryLabel: string;
  aiBoundaryLabel: string;
  sourceBoundaryLabel: string;
  exportDeleteBoundaryLabel: string;
};

export type SpiritualGrowthReflectionNote = {
  id: string;
  prompt: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  activeDaysThisWeek?: number;
  completedToday?: number;
  totalToday?: number;
  evidenceSignals?: string[];
};

export type SpiritualGrowthReflectionSummary = {
  count: number;
  lastUpdatedLabel: string;
  exportLabel: string;
};

export const SPIRITUAL_GROWTH_REFLECTIONS_KEY =
  "nurai_spiritual_growth_reflections_v1";

const SIGNAL_LABELS: Record<SpiritualGrowthCompanionSignalId, string> = {
  quran: "Quran",
  prayer: "Prayer",
  learning: "Learning",
  dhikr: "Dhikr",
  reflection: "Reflection",
  family: "Family",
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function uniqueSignals(
  signals: SpiritualGrowthCompanionSignalId[],
): SpiritualGrowthCompanionSignalId[] {
  return Array.from(new Set(signals)).slice(0, 4);
}

function parseReflectionNotes(
  raw: string | null,
): SpiritualGrowthReflectionNote[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): SpiritualGrowthReflectionNote | null => {
        if (!item || typeof item !== "object") return null;
        const note = item as Partial<SpiritualGrowthReflectionNote>;
        if (typeof note.note !== "string" || !note.note.trim()) return null;
        const updatedAt =
          typeof note.updatedAt === "string"
            ? note.updatedAt
            : new Date().toISOString();
        return {
          id:
            typeof note.id === "string" && note.id.trim()
              ? note.id
              : `weekly-reflection-${updatedAt}`,
          prompt:
            typeof note.prompt === "string" && note.prompt.trim()
              ? note.prompt.trim()
              : "Weekly reflection",
          note: note.note.trim(),
          createdAt:
            typeof note.createdAt === "string" ? note.createdAt : updatedAt,
          updatedAt,
          activeDaysThisWeek:
            typeof note.activeDaysThisWeek === "number"
              ? note.activeDaysThisWeek
              : undefined,
          completedToday:
            typeof note.completedToday === "number"
              ? note.completedToday
              : undefined,
          totalToday:
            typeof note.totalToday === "number" ? note.totalToday : undefined,
          evidenceSignals: Array.isArray(note.evidenceSignals)
            ? note.evidenceSignals.filter(
                (signal): signal is string =>
                  typeof signal === "string" && !!signal.trim(),
              )
            : undefined,
        };
      })
      .filter((note): note is SpiritualGrowthReflectionNote => Boolean(note))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function formatReflectionDate(value?: string) {
  if (!value) return "No notes saved";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently saved";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function listSpiritualGrowthReflectionNotes(): Promise<
  SpiritualGrowthReflectionNote[]
> {
  const raw = await AsyncStorage.getItem(SPIRITUAL_GROWTH_REFLECTIONS_KEY);
  return parseReflectionNotes(raw);
}

export async function saveSpiritualGrowthReflectionNote(input: {
  prompt: string;
  note: string;
  activeDaysThisWeek?: number;
  completedToday?: number;
  totalToday?: number;
  evidenceSignals?: string[];
}): Promise<SpiritualGrowthReflectionNote[]> {
  const trimmedNote = input.note.trim();
  if (!trimmedNote) return listSpiritualGrowthReflectionNotes();

  const now = new Date().toISOString();
  const current = await listSpiritualGrowthReflectionNotes();
  const nextNote: SpiritualGrowthReflectionNote = {
    id: `weekly-reflection-${Date.now()}`,
    prompt: input.prompt.trim() || "Weekly reflection",
    note: trimmedNote,
    createdAt: now,
    updatedAt: now,
    activeDaysThisWeek: input.activeDaysThisWeek,
    completedToday: input.completedToday,
    totalToday: input.totalToday,
    evidenceSignals: input.evidenceSignals?.filter(Boolean),
  };
  const next = [nextNote, ...current].slice(0, 52);
  await AsyncStorage.setItem(
    SPIRITUAL_GROWTH_REFLECTIONS_KEY,
    JSON.stringify(next),
  );
  return next;
}

export async function deleteSpiritualGrowthReflectionNotes(): Promise<void> {
  await AsyncStorage.removeItem(SPIRITUAL_GROWTH_REFLECTIONS_KEY);
}

export function summarizeSpiritualGrowthReflectionNotes(
  notes: SpiritualGrowthReflectionNote[],
): SpiritualGrowthReflectionSummary {
  const latest = notes[0];
  return {
    count: notes.length,
    lastUpdatedLabel: formatReflectionDate(latest?.updatedAt),
    exportLabel:
      notes.length > 0
        ? `${notes.length} weekly reflection${notes.length === 1 ? "" : "s"} ready`
        : "No weekly reflections saved",
  };
}

export function buildSpiritualGrowthReflectionExport(
  notes: SpiritualGrowthReflectionNote[],
) {
  const summary = summarizeSpiritualGrowthReflectionNotes(notes);
  if (notes.length === 0) {
    return [
      "NurAI Weekly Reflections",
      "",
      "No weekly reflection notes are saved on this device.",
    ].join("\n");
  }

  return [
    "NurAI Weekly Reflections",
    summary.exportLabel,
    `Last updated: ${summary.lastUpdatedLabel}`,
    "",
    ...notes.flatMap((note, index) => [
      `${index + 1}. ${formatReflectionDate(note.updatedAt)}`,
      `Prompt: ${note.prompt}`,
      note.evidenceSignals?.length
        ? `Visible signals: ${note.evidenceSignals.join(", ")}`
        : "Visible signals: not recorded",
      note.note,
      "",
    ]),
    "Private note export. NurAI does not score faith or infer worship outside visible app activity.",
  ].join("\n");
}

function titleForWeeklyRhythm(activeDaysThisWeek: number) {
  if (activeDaysThisWeek >= 5) return "A steady week is forming.";
  if (activeDaysThisWeek >= 2) return "Your rhythm has a real foothold.";
  return "Start the week with one sincere step.";
}

function bodyForWeeklyRhythm({
  activeDaysThisWeek,
  completedToday,
  totalToday,
}: {
  activeDaysThisWeek: number;
  completedToday: number;
  totalToday: number;
}) {
  const total = totalToday || 3;
  if (completedToday >= total) {
    return "Today is complete. Use the weekly check-in to choose tomorrow's intention without pressure.";
  }
  if (activeDaysThisWeek >= 4) {
    return "Keep the pattern gentle: protect one anchor, then let learning or reflection follow.";
  }
  return "NurAI is tracking only visible app activity here, so this stays a private aid, not a judgement.";
}

function choosePrimaryIntention(params: {
  completedSignals: SpiritualGrowthCompanionSignalId[];
  personalPlan?: PersonalHomePlanSummary | null;
}): SpiritualGrowthCompanionIntention {
  const { completedSignals, personalPlan } = params;
  if (!completedSignals.includes("quran")) {
    return {
      title: personalPlan?.quranLabel || "Return to one Quran moment",
      body:
        personalPlan?.dailyPath.find((step) =>
          step.toLowerCase().includes("quran"),
        ) || "Read, listen, or save one reflection from a single ayah.",
      routeHint: "Quran",
    };
  }
  if (!completedSignals.includes("prayer")) {
    return {
      title: "Protect the next prayer window",
      body:
        personalPlan?.prayerHabitLabel ||
        "Open prayer times and prepare before the next salah.",
      routeHint: "PrayerTimes",
    };
  }
  if (!completedSignals.includes("learning")) {
    return {
      title: "Study one reviewed lesson",
      body: "Continue a source-card Library path before asking for summaries.",
      routeHint: "LibraryHome",
    };
  }
  if (!completedSignals.includes("dhikr")) {
    return {
      title: "Close with a short dhikr",
      body: "Keep it light and intentional rather than chasing a number.",
      routeHint: "Tasbeeh",
    };
  }
  return {
    title: "Write one honest reflection",
    body: "Capture what helped today and one small intention for tomorrow.",
    routeHint: "LibraryHome",
  };
}

export function buildWeeklySpiritualGrowthCompanion(params: {
  activeDaysThisWeek: number;
  completedToday: number;
  totalToday: number;
  streakDays: number;
  completedSignals?: SpiritualGrowthCompanionSignalId[];
  personalPlan?: PersonalHomePlanSummary | null;
}): SpiritualGrowthCompanion {
  const activeDaysThisWeek = Math.max(
    0,
    Math.min(7, Math.round(params.activeDaysThisWeek || 0)),
  );
  const totalToday = Math.max(1, Math.round(params.totalToday || 3));
  const completedToday = Math.max(
    0,
    Math.min(totalToday, Math.round(params.completedToday || 0)),
  );
  const completedSignals = uniqueSignals(params.completedSignals || []);
  const progressPercent = clampPercent((completedToday / totalToday) * 100);
  const primaryIntention = choosePrimaryIntention({
    completedSignals,
    personalPlan: params.personalPlan,
  });
  const signalLabels =
    completedSignals.length > 0
      ? completedSignals.map((signal) => SIGNAL_LABELS[signal])
      : ["No private activity logged yet"];

  return {
    title: titleForWeeklyRhythm(activeDaysThisWeek),
    body: bodyForWeeklyRhythm({
      activeDaysThisWeek,
      completedToday,
      totalToday,
    }),
    progressPercent,
    rhythmLabel: `${activeDaysThisWeek}/7 active days`,
    metrics: [
      {
        id: "active_days",
        label: "active",
        value: `${activeDaysThisWeek} days`,
        helper: "Visible app rhythm this week",
      },
      {
        id: "today_actions",
        label: "today",
        value: `${completedToday}/${totalToday}`,
        helper: "Daily actions completed",
      },
      {
        id: "streak",
        label: "streak",
        value: `${Math.max(0, Math.round(params.streakDays || 0))}d`,
        helper: "Gentle continuity marker",
      },
    ],
    primaryIntention,
    reflectionPrompt: [
      "Summarize my NurAI weekly rhythm from visible app activity only.",
      `This week: ${activeDaysThisWeek}/7 active days.`,
      `Today: ${completedToday}/${totalToday} actions complete.`,
      `Evidence signals: ${signalLabels.join(", ")}.`,
      params.personalPlan?.aiContextLine ||
        "Use my saved personal plan if available.",
      "Give one low-pressure intention, one Quran or source-linked next step, and one privacy reminder. Do not score my faith, make reward claims, or infer worship I did outside the app.",
    ].join(" "),
    evidenceSignals: signalLabels,
    privacyBoundaryLabel:
      "Private worship data stays user-controlled; this panel uses visible app activity only.",
    aiBoundaryLabel:
      "AI may summarize user-owned progress and suggest next steps, but it must not score faith or infer hidden worship.",
    sourceBoundaryLabel:
      "Religious next steps should stay Quran, hadith, or reviewed Library source-linked.",
    exportDeleteBoundaryLabel:
      "Weekly reflections should remain exportable and removable through private controls.",
  };
}
