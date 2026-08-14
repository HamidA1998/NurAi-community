import type {
  NurAIPlanTier,
  PersonalAIActionCapability,
  PersonalAIActionKind,
  PersonalAISurface,
} from "@shared/nuraiAI";

export type PersonalAIActionRoute =
  | "GlobalSearch"
  | "Home"
  | "QuranReader"
  | "ArabicLearning"
  | "Hifz"
  | "PrayerTimes"
  | "SalahGuide"
  | "Duas"
  | "Tasbeeh"
  | "LibraryHome"
  | "Scholars"
  | "NewMuslim"
  | "StreakGarden"
  | "MuslimHealth"
  | "WomensHealth"
  | "NotificationSettings"
  | "Settings";

export type PersonalAIActionInput = Partial<PersonalAIActionCapability> & {
  label: string;
  surface?: PersonalAISurface;
  routeParams?: Record<string, unknown>;
  prompt?: string;
};

export type PersonalAIActionExecutionPlan = {
  id: string;
  label: string;
  kind: PersonalAIActionKind;
  route?: PersonalAIActionRoute;
  routeParams?: Record<string, unknown>;
  prompt?: string;
  canExecute: boolean;
  requiresConfirmation: boolean;
  confirmationTitle: string;
  confirmationBody: string;
  blockedReason?: string;
  safetyNote: string;
  auditLabel: string;
};

const TIER_RANK: Record<NurAIPlanTier, number> = {
  free: 0,
  premium: 1,
  scholar: 2,
};

const ROUTE_ALLOWLIST = new Set<PersonalAIActionRoute>([
  "GlobalSearch",
  "Home",
  "QuranReader",
  "ArabicLearning",
  "Hifz",
  "PrayerTimes",
  "SalahGuide",
  "Duas",
  "Tasbeeh",
  "LibraryHome",
  "Scholars",
  "NewMuslim",
  "StreakGarden",
  "MuslimHealth",
  "WomensHealth",
  "NotificationSettings",
  "Settings",
]);

const LEGACY_ROUTE_ALIASES: Record<string, PersonalAIActionRoute> = {
  Quran: "QuranReader",
};

const ACTION_ROUTE_HINTS: Record<
  string,
  {
    route?: PersonalAIActionRoute;
    kind: PersonalAIActionKind;
    requiresConfirmation?: boolean;
    minimumTier?: NurAIPlanTier;
    safetyNote?: string;
  }
> = {
  quran: { route: "QuranReader", kind: "open_feature" },
  arabic: {
    route: "ArabicLearning",
    kind: "review",
    minimumTier: "premium",
  },
  hifz: { route: "Hifz", kind: "review", minimumTier: "premium" },
  prayer: { route: "PrayerTimes", kind: "prepare" },
  salah: { route: "SalahGuide", kind: "review", minimumTier: "premium" },
  dua: { route: "Duas", kind: "open_feature" },
  dhikr: { route: "Tasbeeh", kind: "prepare" },
  library: { route: "LibraryHome", kind: "review" },
  source: { route: "LibraryHome", kind: "review" },
  scholar: {
    route: "Scholars",
    kind: "scholar_handoff",
    minimumTier: "scholar",
    safetyNote: "Scholar handoff prepares questions and evidence, not rulings.",
  },
  save: {
    route: "Settings",
    kind: "save",
    requiresConfirmation: true,
    safetyNote: "Saving should store user-approved answer content only.",
  },
  reminder: {
    route: "NotificationSettings",
    kind: "set_reminder",
    requiresConfirmation: true,
    safetyNote: "Reminders must be user-approved and editable.",
  },
  weather: { route: "PrayerTimes", kind: "prepare" },
  tasbeeh: { route: "Tasbeeh", kind: "open_feature" },
  women: { route: "WomensHealth", kind: "open_feature" },
  cycle: { route: "WomensHealth", kind: "review" },
  health: { route: "MuslimHealth", kind: "open_feature" },
  steps: { route: "MuslimHealth", kind: "open_feature" },
  sleep: { route: "MuslimHealth", kind: "review" },
  recovery: { route: "MuslimHealth", kind: "review" },
  hydrat: { route: "MuslimHealth", kind: "prepare" },
  water: { route: "MuslimHealth", kind: "prepare" },
  body: { route: "MuslimHealth", kind: "open_feature" },
};

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function tierAllows(current: NurAIPlanTier, minimum: NurAIPlanTier) {
  return TIER_RANK[current] >= TIER_RANK[minimum];
}

function inferActionHint(label: string) {
  const lower = label.toLowerCase();
  return (
    Object.entries(ACTION_ROUTE_HINTS).find(([keyword]) =>
      lower.includes(keyword),
    )?.[1] || { route: "GlobalSearch" as const, kind: "ask_followup" as const }
  );
}

function normalizeRoute(route: unknown): PersonalAIActionRoute | undefined {
  if (typeof route !== "string") return undefined;
  const normalized = LEGACY_ROUTE_ALIASES[route] || route;
  return ROUTE_ALLOWLIST.has(normalized as PersonalAIActionRoute)
    ? (normalized as PersonalAIActionRoute)
    : undefined;
}

export function resolvePersonalAIAction(
  action: PersonalAIActionInput,
  options: {
    tier: NurAIPlanTier;
    defaultPrompt?: string;
  },
): PersonalAIActionExecutionPlan {
  const hint = inferActionHint(action.label);
  const minimumTier = action.minimumTier || hint.minimumTier || "free";
  const route = normalizeRoute(action.route) || hint.route;
  const kind = action.kind || hint.kind;
  const requiresConfirmation =
    action.requiresConfirmation ?? hint.requiresConfirmation ?? false;
  const canUseTier = tierAllows(options.tier, minimumTier);
  const safetyNote =
    action.safetyNote ||
    hint.safetyNote ||
    "Personal AI can suggest this action, but the user stays in control.";
  const blockedReason = !canUseTier
    ? `${minimumTier} access is required for this Personal AI action.`
    : !route && kind !== "ask_followup"
      ? "This action has no safe route mapping yet."
      : undefined;

  return {
    id: action.id || slug(action.label),
    label: action.label,
    kind,
    route,
    routeParams: action.routeParams,
    prompt: action.prompt || options.defaultPrompt,
    canExecute: !blockedReason,
    requiresConfirmation,
    confirmationTitle: requiresConfirmation
      ? `Confirm ${action.label}`
      : action.label,
    confirmationBody: requiresConfirmation
      ? `${safetyNote} NurAI will only continue after you confirm.`
      : safetyNote,
    blockedReason,
    safetyNote,
    auditLabel: `${kind}:${route || "chat"}:${minimumTier}`,
  };
}

export function resolvePersonalAIActions(
  actions: PersonalAIActionInput[],
  options: {
    tier: NurAIPlanTier;
    defaultPrompt?: string;
  },
) {
  return actions.map((action) => resolvePersonalAIAction(action, options));
}

export function executePersonalAIAction(
  plan: PersonalAIActionExecutionPlan,
  navigation: {
    navigate: (route: string, params?: Record<string, unknown>) => void;
  },
) {
  if (!plan.canExecute) {
    return {
      executed: false,
      reason: plan.blockedReason || "Action is not executable.",
    };
  }

  if (plan.route) {
    navigation.navigate(plan.route, plan.routeParams);
    return { executed: true, route: plan.route };
  }

  if (plan.prompt) {
    navigation.navigate("GlobalSearch");
    return { executed: true, route: "GlobalSearch" };
  }

  return {
    executed: false,
    reason: "No route or prompt was available for this Personal AI action.",
  };
}
