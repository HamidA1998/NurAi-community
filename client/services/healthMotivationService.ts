import type {
  NativeHealthDailySummary,
  NativeHealthPermissionStatus,
} from "@/services/nativeHealthDataService";

/**
 * Turns real Apple Health / Health Connect readings into one supportive line.
 *
 * Two rules hold everywhere in this file:
 *  1. Never speak to a number we do not have. Every motivation names the
 *     reading it came from, so nothing is invented to fill space.
 *  2. Never diagnose, never prescribe, never imply a clinical judgement.
 *     The framing is the body as an amanah worth caring for — encouragement,
 *     not assessment. Anything that sounds like medicine belongs to a
 *     clinician, not to this app.
 */

export type HealthMotivationTone = "encourage" | "steady" | "invite";

export type HealthMotivation = {
  id: string;
  /** Short, human, never clinical. */
  headline: string;
  /** One or two sentences of support. */
  body: string;
  /** The actual reading this was built from, shown so the claim is checkable. */
  evidence: string | null;
  tone: HealthMotivationTone;
};

export type HealthMotivationInput = {
  summary: NativeHealthDailySummary | null;
  readinessScore?: number | null;
  sleepScore?: number | null;
  status?: NativeHealthPermissionStatus | null;
  /** Minutes until the next prayer, when the app knows it. */
  hasData?: boolean;
};

const STEP_GOAL = 10000;

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Health data can be absent for three different reasons and each one deserves
 * a different sentence — lumping them into "no data" is what makes a health
 * screen feel broken rather than honest.
 */
function unavailableMotivation(
  status: NativeHealthPermissionStatus | null | undefined,
): HealthMotivation {
  if (status === "denied") {
    return {
      id: "health-denied",
      headline: "Health access is off",
      body: "NurAI cannot see your activity while access is turned off. You can allow it any time in the Health app, and nothing is shared beyond your device.",
      evidence: null,
      tone: "invite",
    };
  }
  if (status === "unavailable" || status === "unsupported") {
    return {
      id: "health-unsupported",
      headline: "No health source on this device",
      body: "This device does not provide health readings, so NurAI will keep the rest of your day working without them.",
      evidence: null,
      tone: "steady",
    };
  }
  return {
    id: "health-connect",
    headline: "Connect your health data",
    body: "Allow Health access and NurAI can encourage you with your own steps, sleep and movement — read privately on this device.",
    evidence: null,
    tone: "invite",
  };
}

/**
 * Ordered strongest-signal-first: the reading with the clearest story wins the
 * single slot, so the card says one true thing instead of four vague ones.
 */
export function buildHealthMotivation(
  input: HealthMotivationInput,
): HealthMotivation {
  const { summary } = input;
  const status = input.status ?? summary?.status ?? null;

  if (
    !summary ||
    status === "denied" ||
    status === "unavailable" ||
    status === "unsupported"
  ) {
    return unavailableMotivation(status);
  }

  const steps = summary.steps;
  const sleepMinutes = summary.sleepMinutes;
  const activeCalories = summary.activeCaloriesKcal;
  const mindfulMinutes = summary.mindfulMinutes;
  const workoutMinutes = summary.workoutMinutes;

  // Nothing has synced yet — say so plainly rather than showing zeros as fact.
  const hasAnyReading =
    (steps ?? 0) > 0 ||
    (sleepMinutes ?? 0) > 0 ||
    (activeCalories ?? 0) > 0 ||
    (mindfulMinutes ?? 0) > 0 ||
    (workoutMinutes ?? 0) > 0;
  if (!hasAnyReading) {
    return {
      id: "health-awaiting",
      headline: "Waiting on today's readings",
      body: "Nothing has synced for today yet. Move around, or open the Health app once, and this will fill in.",
      evidence: null,
      tone: "steady",
    };
  }

  if (typeof steps === "number" && steps >= STEP_GOAL) {
    return {
      id: "steps-goal",
      headline: "Your body carried you well today",
      body: "That is a real amount of movement. Thank Allah for a body that could do it, and let tonight's rest be part of the same care.",
      evidence: `${steps.toLocaleString()} steps today`,
      tone: "encourage",
    };
  }

  if (typeof sleepMinutes === "number" && sleepMinutes >= 7 * 60) {
    return {
      id: "sleep-strong",
      headline: "You gave yourself real rest",
      body: "Rest is what makes an early Fajr and a present day possible. Protecting it is part of looking after the trust you were given.",
      evidence: `${minutesToLabel(sleepMinutes)} of sleep`,
      tone: "encourage",
    };
  }

  if (typeof workoutMinutes === "number" && workoutMinutes > 0) {
    return {
      id: "workout-done",
      headline: "You trained today",
      body: "Strength is not vanity when it is used to worship, work and carry others. Keep it steady rather than extreme.",
      evidence: `${minutesToLabel(workoutMinutes)} of exercise`,
      tone: "encourage",
    };
  }

  if (typeof mindfulMinutes === "number" && mindfulMinutes > 0) {
    return {
      id: "mindful-done",
      headline: "You made room for stillness",
      body: "Quiet minutes settle the heart. Dhikr fits naturally into the same space you just made.",
      evidence: `${minutesToLabel(mindfulMinutes)} of mindful time`,
      tone: "encourage",
    };
  }

  if (
    typeof sleepMinutes === "number" &&
    sleepMinutes > 0 &&
    sleepMinutes < 6 * 60
  ) {
    return {
      id: "sleep-short",
      headline: "A shorter night than usual",
      body: "Be gentle with yourself today and keep your acts small and steady. An earlier wind-down tonight is enough of a plan.",
      evidence: `${minutesToLabel(sleepMinutes)} of sleep`,
      tone: "steady",
    };
  }

  if (typeof steps === "number" && steps > 0) {
    const remaining = Math.max(STEP_GOAL - steps, 0);
    return {
      id: "steps-progress",
      headline: "You are moving",
      body:
        remaining > 0
          ? `A short walk after a prayer would close most of the gap. No rush — consistency counts more than the number.`
          : "Steady movement through the day is exactly the point.",
      evidence: `${steps.toLocaleString()} steps today`,
      tone: "steady",
    };
  }

  if (typeof activeCalories === "number" && activeCalories > 0) {
    return {
      id: "energy-active",
      headline: "You have been active",
      body: "Energy spent caring for your body is not time taken away from your deen — it supports it.",
      evidence: `${Math.round(activeCalories)} kcal active energy`,
      tone: "steady",
    };
  }

  return {
    id: "health-steady",
    headline: "Today is still open",
    body: "Small, repeatable acts are what NurAI is built around. Pick one and let the rest follow.",
    evidence: null,
    tone: "steady",
  };
}
