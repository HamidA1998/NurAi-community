export type Madhab = "hanafi" | "maliki" | "shafii" | "hanbali" | "jafari";

export interface MadhabRules {
  name: string;
  minHaidh: number;
  maxHaidh: number;
  minTuhr: number;
  maxNifas: number;
}

export const MADHAB_RULES: Record<Madhab, MadhabRules> = {
  hanafi: {
    name: "Hanafi",
    minHaidh: 3,
    maxHaidh: 10,
    minTuhr: 15,
    maxNifas: 40,
  },
  maliki: {
    name: "Maliki",
    minHaidh: 1,
    maxHaidh: 15,
    minTuhr: 15,
    maxNifas: 60,
  },
  shafii: {
    name: "Shafi'i",
    minHaidh: 1,
    maxHaidh: 15,
    minTuhr: 15,
    maxNifas: 60,
  },
  hanbali: {
    name: "Hanbali",
    minHaidh: 1,
    maxHaidh: 15,
    minTuhr: 13,
    maxNifas: 40,
  },
  jafari: {
    name: "Jafari",
    minHaidh: 3,
    maxHaidh: 10,
    minTuhr: 10,
    maxNifas: 40,
  },
};

export interface Cycle {
  id: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  isIstihadha?: boolean;
}

export interface QadaLog {
  id: string;
  date: string;
  count: number;
  type: "qada_fast_completed";
}

export interface RamadanRange {
  start: string;
  end: string;
}

export interface WHSettings {
  enabled: boolean;
  lockEnabled: boolean;
  hideFromHome: boolean;
  nifasMode: boolean;
  nifasStartDate: string | null;
  typicalCycleLength: number;
  typicalPeriodLength: number;
  ramadanRanges: RamadanRange[];
  madhab: Madhab;
  madhabConfirmed: boolean;
  lifeStage: string;
  allowSearch: boolean;
  planningMode: boolean;
  syncEnabled: boolean;
  showDetailedNotifications: boolean;
  qadaManualTotalRequired: number;
  qadaPerWeekTarget: number;
  qadaPreferredDays: number[];
  qadaBreakdown: Record<string, number>;
}

export interface CycleSymptom {
  key: string;
  severity?: number;
}

export interface CycleMetadata {
  flowLevel: "light" | "medium" | "heavy" | null;
  symptoms: CycleSymptom[];
  energyLevel: number;
}

export interface MoodEntry {
  id: string;
  date: string;
  mood: string;
  tags: string[];
  energyLevel: number;
  notes: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  tags?: string[];
  phase?: string;
  createdAt: string;
}

export type CycleState = "NOT_ON_CYCLE" | "ON_CYCLE" | "CYCLE_COMPLETED";

export interface WomenHealthStreakProtection {
  active: boolean;
  reason: "none" | "haidh" | "ghusl" | "nifas";
  title: string;
  body: string;
  protectedHabits: string[];
  suggestedActions: string[];
  rewardLabel: string;
}

export interface WomenHealthCareSignal {
  level: "normal" | "watch" | "medical";
  title: string;
  body: string;
  reasons: string[];
}

export interface DerivedWomenHealth {
  cycleState: CycleState;
  currentCycleId?: string;
  currentCycleDay?: number;
  currentCycleStartDate?: string;
  ghuslRequired: boolean;
  ghuslAcknowledged: boolean;
  worship: {
    prayerAllowed: boolean;
    fastingAllowed: boolean;
  };
  averages: {
    avgCycleLengthDays: number | null;
    avgBleedLengthDays: number | null;
  };
  calendarMarks: {
    activeCycleDays: string[];
    completedCycleDays: string[];
    allCycleDays: string[];
    predictedNextStart?: string;
    predictedNextEnd?: string;
    predictedDays: string[];
  };
  istihadhaWarning?: {
    message: string;
    type: "exceeds_max" | "too_soon" | "too_short";
  } | null;
  prediction: {
    nextStart: string | null;
    nextEnd: string | null;
    confidence: "low" | "medium" | "high";
    rangeStart: string | null;
    rangeEnd: string | null;
  } | null;
  qada: {
    requiredFromRamadan: number;
    completed: number;
    remaining: number;
    statusText: string;
  };
  streakProtection: WomenHealthStreakProtection;
  careSignal: WomenHealthCareSignal;
  completedCycles: Cycle[];
  cycleStdDev: number;
  recentLengths: number[];
}

export interface WHSourceData {
  cycles: Cycle[];
  qadaLogs: QadaLog[];
  settings: WHSettings;
  cycleMetadata: Record<string, CycleMetadata>;
  moodEntries: MoodEntry[];
  journalEntries: JournalEntry[];
  ghuslAcknowledged: boolean;
}

export const DEFAULT_SETTINGS: WHSettings = {
  enabled: false,
  lockEnabled: false,
  hideFromHome: false,
  nifasMode: false,
  nifasStartDate: null,
  typicalCycleLength: 28,
  typicalPeriodLength: 6,
  ramadanRanges: [
    { start: "2024-03-11", end: "2024-04-09" },
    { start: "2025-02-28", end: "2025-03-30" },
    { start: "2026-02-17", end: "2026-03-19" },
    { start: "2027-02-07", end: "2027-03-08" },
  ],
  madhab: "hanafi",
  madhabConfirmed: false,
  lifeStage: "regular",
  allowSearch: false,
  planningMode: false,
  syncEnabled: false,
  showDetailedNotifications: false,
  qadaManualTotalRequired: 0,
  qadaPerWeekTarget: 1,
  qadaPreferredDays: [1, 4],
  qadaBreakdown: {},
};

export const DEFAULT_CYCLE_METADATA: CycleMetadata = {
  flowLevel: null,
  symptoms: [],
  energyLevel: 3,
};
