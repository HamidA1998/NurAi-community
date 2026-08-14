import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import type {
  WHSettings,
  WHSourceData,
  DerivedWomenHealth,
  Cycle,
  QadaLog,
  CycleMetadata,
  MoodEntry,
  JournalEntry,
} from "@/modules/womensHealth/types";
import {
  DEFAULT_SETTINGS,
  DEFAULT_CYCLE_METADATA,
} from "@/modules/womensHealth/types";
import {
  todayStr,
  generateId,
  formatDateDisplay,
  getDatesInRange,
  addDays,
} from "@/modules/womensHealth/dateUtils";
import * as Storage from "@/modules/womensHealth/storage";
import * as Engine from "@/modules/womensHealth/engine";
import { useSubscription } from "@/context/SubscriptionContext";

const EMPTY_DERIVED: DerivedWomenHealth = {
  cycleState: "NOT_ON_CYCLE",
  ghuslRequired: false,
  ghuslAcknowledged: true,
  worship: { prayerAllowed: true, fastingAllowed: true },
  averages: { avgCycleLengthDays: null, avgBleedLengthDays: null },
  calendarMarks: {
    activeCycleDays: [],
    completedCycleDays: [],
    allCycleDays: [],
    predictedDays: [],
  },
  prediction: null,
  istihadhaWarning: null,
  qada: {
    requiredFromRamadan: 0,
    completed: 0,
    remaining: 0,
    statusText: "No make-up fasts tracked yet",
  },
  streakProtection: {
    active: false,
    reason: "none",
    title: "Streaks active",
    body: "Your worship streaks are active today.",
    protectedHabits: [],
    suggestedActions: [],
    rewardLabel: "+ streak",
  },
  careSignal: {
    level: "normal",
    title: "No extra care signal",
    body: "Your current saved pattern does not raise an app-level care flag. This is not medical advice.",
    reasons: [],
  },
  completedCycles: [],
  cycleStdDev: 0,
  recentLengths: [],
};

interface WomensHealthContextType {
  settings: WHSettings;
  updateSettings: (updates: Partial<WHSettings>) => Promise<void>;
  consentGiven: boolean;
  giveConsent: () => Promise<void>;

  sourceData: WHSourceData;
  derived: DerivedWomenHealth;

  cycles: Cycle[];
  activeCycle: Cycle | null;
  startCycle: (date?: string) => Promise<string | undefined>;
  endCycle: (date?: string) => Promise<string | undefined>;
  updateCycle: (id: string, updates: Partial<Cycle>) => Promise<void>;
  deleteCycleById: (id: string) => Promise<void>;

  qadaLogs: QadaLog[];
  addQadaEntry: (date: string) => Promise<void>;
  removeQadaEntryByDate: (date: string) => Promise<void>;
  undoLastQada: () => Promise<void>;

  handleCalendarTap: (
    date: string,
    tab: "cycle" | "qada",
  ) => Promise<string | undefined>;
  addCompleteCycle: (
    startDate: string,
    endDate: string,
  ) => Promise<{ error?: string; warning?: string }>;
  toggleCycleDate: (date: string) => Promise<string | undefined>;
  replaceCyclesFromDates: (
    finalDates: Set<string>,
    isIstihadha?: boolean,
  ) => Promise<string | undefined>;
  acknowledgeGhusl: () => Promise<void>;

  isOnCycle: boolean;
  currentCycleDay: number;
  cycleState: DerivedWomenHealth["cycleState"];
  ghuslAcknowledged: boolean;
  remainingQada: number;
  completedCycles: Cycle[];
  avgCycleLength: number;
  cycleStdDev: number;
  recentLengths: number[];
  nextPrediction: { start: string; end: string } | null;

  qadaPlan: {
    totalRequired: number;
    completedCount: number;
    perWeekTarget: number;
    preferredDays: number[];
    breakdown: Record<string, number>;
  };
  updateQadaPlan: (
    updates: Partial<{
      totalRequired: number;
      completedCount: number;
      perWeekTarget: number;
      preferredDays: number[];
      breakdown: Record<string, number>;
    }>,
  ) => Promise<void>;
  qadaEntries: {
    id: string;
    date: string;
    count: number;
    notes: string;
    createdAt: string;
  }[];

  moodEntries: MoodEntry[];
  addMoodEntry: (entry: Omit<MoodEntry, "id" | "createdAt">) => Promise<void>;
  updateMoodEntry: (id: string, updates: Partial<MoodEntry>) => Promise<void>;
  deleteMoodEntry: (id: string) => Promise<void>;
  todayMood: MoodEntry | null;

  journalEntries: JournalEntry[];
  addJournalEntry: (
    entry: Omit<JournalEntry, "id" | "createdAt">,
  ) => Promise<void>;
  updateJournalEntry: (
    id: string,
    updates: Partial<JournalEntry>,
  ) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;

  getCycleMetadata: (cycleId: string) => CycleMetadata;
  updateCycleMetadata: (
    cycleId: string,
    updates: Partial<CycleMetadata>,
  ) => Promise<void>;

  exportData: () => Promise<{ json: string; csv: string }>;
  importData: (
    content: string,
    format: "json" | "csv",
  ) => Promise<{ cyclesImported: number; error?: string }>;
  deleteAllData: () => Promise<void>;
  isPremium: boolean;

  prediction: DerivedWomenHealth["prediction"];
  istihadhaWarning: DerivedWomenHealth["istihadhaWarning"];
  predictedDatesSet: Set<string>;

  cycleDatesSet: Set<string>;
  activeCycleDatesSet: Set<string>;
  completedCycleDatesSet: Set<string>;
  qadaDatesSet: Set<string>;
}

const WomensHealthContext = createContext<WomensHealthContextType | null>(null);

export function WomensHealthProvider({ children }: { children: ReactNode }) {
  const [sourceData, setSourceData] = useState<WHSourceData>({
    cycles: [],
    qadaLogs: [],
    settings: DEFAULT_SETTINGS,
    cycleMetadata: {},
    moodEntries: [],
    journalEntries: [],
    ghuslAcknowledged: true,
  });
  const [derived, setDerived] = useState<DerivedWomenHealth>(EMPTY_DERIVED);
  const [consentGiven, setConsentGiven] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { isPremium } = useSubscription();

  const sourceRef = useRef(sourceData);
  sourceRef.current = sourceData;

  const recalc = useCallback((data: WHSourceData) => {
    const d = Engine.recalculateAll(data);
    setDerived(d);
    return d;
  }, []);

  const buildEmptyData = useCallback(
    (): WHSourceData => ({
      cycles: [],
      qadaLogs: [],
      settings: DEFAULT_SETTINGS,
      cycleMetadata: {},
      moodEntries: [],
      journalEntries: [],
      ghuslAcknowledged: true,
    }),
    [],
  );

  const applyAndPersist = useCallback(
    async (newData: WHSourceData) => {
      setSourceData(newData);
      sourceRef.current = newData;
      recalc(newData);
      await Promise.all([
        Storage.saveCycles(newData.cycles),
        Storage.saveQadaLogs(newData.qadaLogs),
        Storage.saveSettings(newData.settings),
        Storage.saveCycleMetadata(newData.cycleMetadata),
        Storage.saveMoodEntries(newData.moodEntries),
        Storage.saveJournalEntries(newData.journalEntries),
        Storage.saveGhuslAcknowledged(newData.ghuslAcknowledged),
      ]);
    },
    [recalc],
  );

  useEffect(() => {
    (async () => {
      try {
        const consent = await Storage.loadConsent();
        let data: WHSourceData;
        if (consent) {
          const needsMig = await Storage.needsMigration();
          if (needsMig) {
            const migrated = await Storage.migrateFromLegacy();
            data = migrated || (await Storage.loadAllData());
          } else {
            data = await Storage.loadAllData();
          }
        } else {
          data = buildEmptyData();
        }
        setConsentGiven(consent);
        setSourceData(data);
        sourceRef.current = data;
        recalc(data);
      } catch {}
      setLoaded(true);
    })();
  }, [buildEmptyData, recalc]);

  const updateSettings = useCallback(
    async (updates: Partial<WHSettings>) => {
      const cur = sourceRef.current;
      const newSettings = { ...cur.settings, ...updates };
      const newData = { ...cur, settings: newSettings };
      await applyAndPersist(newData);
    },
    [applyAndPersist],
  );

  const giveConsent = useCallback(async () => {
    const data = await Storage.loadAllData();
    setSourceData(data);
    sourceRef.current = data;
    recalc(data);
    setConsentGiven(true);
    await Storage.saveConsent(true);
  }, [recalc]);

  const startCycle = useCallback(
    async (date?: string): Promise<string | undefined> => {
      const cur = sourceRef.current;
      const result = Engine.addCycleStart(cur, date || todayStr());
      if (result.error) return result.error;
      await applyAndPersist(result.data);
      return undefined;
    },
    [applyAndPersist],
  );

  const endCycle = useCallback(
    async (date?: string): Promise<string | undefined> => {
      const cur = sourceRef.current;
      const result = Engine.endCurrentCycle(cur, date || todayStr());
      if (result.error) return result.error;
      await applyAndPersist(result.data);
      return result.warning;
    },
    [applyAndPersist],
  );

  const updateCycle = useCallback(
    async (id: string, updates: Partial<Cycle>) => {
      const cur = sourceRef.current;
      const newData = Engine.editCycle(cur, id, updates);
      await applyAndPersist(newData);
    },
    [applyAndPersist],
  );

  const deleteCycleById = useCallback(
    async (id: string) => {
      const cur = sourceRef.current;
      const newData = Engine.deleteCycle(cur, id);
      await applyAndPersist(newData);
    },
    [applyAndPersist],
  );

  const addQadaEntry = useCallback(
    async (date: string) => {
      const cur = sourceRef.current;
      const newData = Engine.markQadaFastCompleted(cur, date);
      await applyAndPersist(newData);
    },
    [applyAndPersist],
  );

  const removeQadaEntryByDate = useCallback(
    async (date: string) => {
      const cur = sourceRef.current;
      const newData = Engine.undoQadaFast(cur, date);
      await applyAndPersist(newData);
    },
    [applyAndPersist],
  );

  const undoLastQada = useCallback(async () => {
    const cur = sourceRef.current;
    const newData = Engine.undoLastQadaFast(cur);
    await applyAndPersist(newData);
  }, [applyAndPersist]);

  const toggleCycleDateFn = useCallback(
    async (date: string): Promise<string | undefined> => {
      const cur = sourceRef.current;
      const now = new Date().toISOString();
      const today = todayStr();

      const allDatesMap = new Map<string, string>();
      for (const c of cur.cycles) {
        const end = c.endDate || today;
        const days = getDatesInRange(c.startDate, end);
        for (const d of days) allDatesMap.set(d, c.id);
      }

      if (allDatesMap.has(date)) {
        const newCycles: Cycle[] = [];
        for (const c of cur.cycles) {
          const end = c.endDate || today;
          const days = getDatesInRange(c.startDate, end);
          if (!days.includes(date)) {
            newCycles.push(c);
            continue;
          }
          const remaining = days.filter((d) => d !== date);
          if (remaining.length === 0) continue;
          let segStart = remaining[0];
          for (let i = 1; i < remaining.length; i++) {
            if (addDays(remaining[i - 1], 1) !== remaining[i]) {
              newCycles.push({
                ...c,
                id: segStart === c.startDate ? c.id : generateId(),
                startDate: segStart,
                endDate: remaining[i - 1],
                updatedAt: now,
              });
              segStart = remaining[i];
            }
          }
          newCycles.push({
            ...c,
            id: segStart === c.startDate ? c.id : generateId(),
            startDate: segStart,
            endDate: remaining[remaining.length - 1],
            updatedAt: now,
          });
        }
        const newData = { ...cur, cycles: newCycles };
        await applyAndPersist(newData);
        return undefined;
      }

      const newCycle: Cycle = {
        id: generateId(),
        startDate: date,
        endDate: date,
        createdAt: now,
        updatedAt: now,
      };
      const newData = {
        ...cur,
        cycles: [...cur.cycles, newCycle],
        ghuslAcknowledged: false,
      };
      await applyAndPersist(newData);
      return undefined;
    },
    [applyAndPersist],
  );

  const replaceCyclesFromDatesFn = useCallback(
    async (
      finalDates: Set<string>,
      isIstihadha?: boolean,
    ): Promise<string | undefined> => {
      const cur = sourceRef.current;
      const now = new Date().toISOString();

      const sorted = Array.from(finalDates).sort();
      const newCycles: Cycle[] = [];

      if (sorted.length > 0) {
        let segStart = sorted[0];
        let segEnd = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
          if (addDays(segEnd, 1) === sorted[i]) {
            segEnd = sorted[i];
          } else {
            newCycles.push({
              id: generateId(),
              startDate: segStart,
              endDate: segEnd,
              createdAt: now,
              updatedAt: now,
              ...(isIstihadha ? { isIstihadha: true } : {}),
            });
            segStart = sorted[i];
            segEnd = sorted[i];
          }
        }
        newCycles.push({
          id: generateId(),
          startDate: segStart,
          endDate: segEnd,
          createdAt: now,
          updatedAt: now,
          ...(isIstihadha ? { isIstihadha: true } : {}),
        });
      }

      const newData = {
        ...cur,
        cycles: newCycles,
        ghuslAcknowledged: newCycles.length === 0,
      };
      await applyAndPersist(newData);
      return undefined;
    },
    [applyAndPersist],
  );

  const handleCalendarTapFn = useCallback(
    async (
      date: string,
      tab: "cycle" | "qada",
    ): Promise<string | undefined> => {
      if (tab === "cycle") {
        return toggleCycleDateFn(date);
      }
      const cur = sourceRef.current;
      const result = Engine.handleCalendarTap(cur, date, tab);
      if (result.error) return result.error;
      await applyAndPersist(result.data);
      return undefined;
    },
    [applyAndPersist, toggleCycleDateFn],
  );

  const addCompleteCycleFn = useCallback(
    async (
      startDate: string,
      endDate: string,
    ): Promise<{ error?: string; warning?: string }> => {
      const cur = sourceRef.current;
      const result = Engine.addCompleteCycle(cur, startDate, endDate);
      if (result.error) return { error: result.error };
      await applyAndPersist(result.data);
      return { warning: result.warning };
    },
    [applyAndPersist],
  );

  const acknowledgeGhuslFn = useCallback(async () => {
    const cur = sourceRef.current;
    const newData = Engine.acknowledgeGhusl(cur);
    await applyAndPersist(newData);
  }, [applyAndPersist]);

  const addMoodEntry = useCallback(
    async (entry: Omit<MoodEntry, "id" | "createdAt">) => {
      const cur = sourceRef.current;
      const newEntry: MoodEntry = {
        ...entry,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      const newData = { ...cur, moodEntries: [newEntry, ...cur.moodEntries] };
      await applyAndPersist(newData);
    },
    [applyAndPersist],
  );

  const updateMoodEntry = useCallback(
    async (id: string, updates: Partial<MoodEntry>) => {
      const cur = sourceRef.current;
      const newData = {
        ...cur,
        moodEntries: cur.moodEntries.map((m) =>
          m.id === id ? { ...m, ...updates } : m,
        ),
      };
      await applyAndPersist(newData);
    },
    [applyAndPersist],
  );

  const deleteMoodEntry = useCallback(
    async (id: string) => {
      const cur = sourceRef.current;
      const newData = {
        ...cur,
        moodEntries: cur.moodEntries.filter((m) => m.id !== id),
      };
      await applyAndPersist(newData);
    },
    [applyAndPersist],
  );

  const addJournalEntry = useCallback(
    async (entry: Omit<JournalEntry, "id" | "createdAt">) => {
      const cur = sourceRef.current;
      const newEntry: JournalEntry = {
        ...entry,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      const newData = {
        ...cur,
        journalEntries: [newEntry, ...cur.journalEntries],
      };
      await applyAndPersist(newData);
    },
    [applyAndPersist],
  );

  const updateJournalEntry = useCallback(
    async (id: string, updates: Partial<JournalEntry>) => {
      const cur = sourceRef.current;
      const newData = {
        ...cur,
        journalEntries: cur.journalEntries.map((j) =>
          j.id === id ? { ...j, ...updates } : j,
        ),
      };
      await applyAndPersist(newData);
    },
    [applyAndPersist],
  );

  const deleteJournalEntry = useCallback(
    async (id: string) => {
      const cur = sourceRef.current;
      const newData = {
        ...cur,
        journalEntries: cur.journalEntries.filter((j) => j.id !== id),
      };
      await applyAndPersist(newData);
    },
    [applyAndPersist],
  );

  const getCycleMetadata = useCallback((cycleId: string): CycleMetadata => {
    return sourceRef.current.cycleMetadata[cycleId] || DEFAULT_CYCLE_METADATA;
  }, []);

  const updateCycleMetadata = useCallback(
    async (cycleId: string, updates: Partial<CycleMetadata>) => {
      const cur = sourceRef.current;
      const existing = cur.cycleMetadata[cycleId] || DEFAULT_CYCLE_METADATA;
      const newMeta = { ...existing, ...updates };
      const newData = {
        ...cur,
        cycleMetadata: { ...cur.cycleMetadata, [cycleId]: newMeta },
      };
      await applyAndPersist(newData);
    },
    [applyAndPersist],
  );

  const exportData = useCallback(async () => {
    const cur = sourceRef.current;
    const data = {
      settings: cur.settings,
      cycles: cur.cycles,
      qadaLogs: cur.qadaLogs,
      moodEntries: cur.moodEntries,
      journalEntries: cur.journalEntries,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    let csv = "type,id,date,details\n";
    cur.cycles.forEach((c) => {
      csv += `cycle,${c.id},${c.startDate},"start: ${c.startDate} end: ${c.endDate || "ongoing"}"\n`;
    });
    cur.qadaLogs.forEach((e) => {
      csv += `qada,${e.id},${e.date},"count: ${e.count}"\n`;
    });
    cur.moodEntries.forEach((m) => {
      csv += `mood,${m.id},${m.date},"mood: ${m.mood} energy: ${m.energyLevel}"\n`;
    });
    cur.journalEntries.forEach((j) => {
      csv += `journal,${j.id},${j.date},"title: ${j.title}"\n`;
    });
    return { json, csv };
  }, []);

  const importData = useCallback(
    async (
      content: string,
      format: "json" | "csv",
    ): Promise<{ cyclesImported: number; error?: string }> => {
      try {
        const cur = sourceRef.current;
        const now = new Date().toISOString();
        let importedCycles: Cycle[] = [];

        const normalizeDate = (
          raw: string | undefined | null,
        ): string | null => {
          if (!raw || typeof raw !== "string") return null;
          const trimmed = raw.trim().replace(/"/g, "");
          const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
          if (isoMatch) {
            const [, y, m, d] = isoMatch;
            return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          }
          const slashMatch = trimmed.match(
            /^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/,
          );
          if (slashMatch) {
            const [, a, b, y] = slashMatch;
            const month = parseInt(a, 10) > 12 ? b : a;
            const day = parseInt(a, 10) > 12 ? a : b;
            return `${y}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }
          return null;
        };

        const isValidDate = (d: string | null): boolean => {
          if (!d) return false;
          const dt = new Date(d + "T00:00:00");
          return (
            !isNaN(dt.getTime()) &&
            dt.getFullYear() > 2000 &&
            dt.getFullYear() < 2100
          );
        };

        const hasValidStartDate = <T extends { startDate: string | null }>(
          c: T,
        ): c is T & { startDate: string } => isValidDate(c.startDate);

        const parseCSVRow = (row: string): string[] => {
          const fields: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < row.length; i++) {
            const ch = row[i];
            if (ch === '"') {
              inQuotes = !inQuotes;
            } else if (ch === "," && !inQuotes) {
              fields.push(current.trim());
              current = "";
            } else {
              current += ch;
            }
          }
          fields.push(current.trim());
          return fields;
        };

        if (format === "json") {
          let parsed: any;
          try {
            parsed = JSON.parse(content);
          } catch (parseErr: any) {
            console.log("[Import] JSON parse error:", parseErr?.message);
            return {
              cyclesImported: 0,
              error: "File is not valid JSON. Please check the file format.",
            };
          }

          console.log(
            "[Import] JSON top-level keys:",
            Object.keys(parsed).join(", "),
          );
          if (parsed.operationalData?.cycles) {
            console.log(
              "[Import] Found Flo operationalData.cycles:",
              parsed.operationalData.cycles.length,
            );
          }

          const mapCycleEntry = (c: any) => ({
            id: c.id || generateId(),
            startDate: normalizeDate(
              c.period_start_date ||
                c.startDate ||
                c.start_date ||
                c.start ||
                c.period_start,
            ),
            endDate:
              normalizeDate(
                c.period_end_date ||
                  c.endDate ||
                  c.end_date ||
                  c.end ||
                  c.period_end,
              ) || null,
            createdAt: c.createdAt || c.created_at || now,
            updatedAt: now,
            notes: c.notes || "",
          });

          const floCycles = parsed.operationalData?.cycles;
          if (Array.isArray(floCycles) && floCycles.length > 0) {
            const mapped = floCycles
              .map(mapCycleEntry)
              .filter(hasValidStartDate);
            importedCycles.push(...mapped);
          }

          if (
            importedCycles.length === 0 &&
            parsed.cycles &&
            Array.isArray(parsed.cycles)
          ) {
            const mapped = parsed.cycles
              .map(mapCycleEntry)
              .filter(hasValidStartDate);
            importedCycles.push(...mapped);
          }

          if (parsed.periods && Array.isArray(parsed.periods)) {
            const mapped = parsed.periods
              .map((p: any) => ({
                id: generateId(),
                startDate: normalizeDate(
                  p.start || p.startDate || p.date || p.period_start_date,
                ),
                endDate:
                  normalizeDate(p.end || p.endDate || p.period_end_date) ||
                  null,
                createdAt: now,
                updatedAt: now,
              }))
              .filter(hasValidStartDate);
            importedCycles.push(...mapped);
          }

          if (parsed.data && Array.isArray(parsed.data)) {
            const mapped = parsed.data
              .filter(
                (d: any) =>
                  d.type === "period" ||
                  d.type === "cycle" ||
                  d.period_start ||
                  d.period_start_date,
              )
              .map((d: any) => ({
                id: generateId(),
                startDate: normalizeDate(
                  d.period_start_date ||
                    d.period_start ||
                    d.start ||
                    d.startDate ||
                    d.date,
                ),
                endDate:
                  normalizeDate(
                    d.period_end_date || d.period_end || d.end || d.endDate,
                  ) || null,
                createdAt: now,
                updatedAt: now,
              }))
              .filter(hasValidStartDate);
            importedCycles.push(...mapped);
          }

          console.log(
            "[Import] Total cycles found from JSON:",
            importedCycles.length,
          );
        } else {
          const lines = content
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
          if (lines.length < 2)
            return { cyclesImported: 0, error: "CSV file appears to be empty" };

          const headerCols = parseCSVRow(lines[0]);
          const header = lines[0].toLowerCase();
          const rows = lines.slice(1);

          const colNames = headerCols.map((h) =>
            h.toLowerCase().replace(/"/g, ""),
          );

          if (
            header.includes("cycle_start") ||
            header.includes("period_start") ||
            header.includes("start_date")
          ) {
            const startIdx = colNames.findIndex((c) => c.includes("start"));
            const endIdx = colNames.findIndex((c) => c.includes("end"));

            for (const row of rows) {
              const vals = parseCSVRow(row);
              const startDate = normalizeDate(vals[startIdx]);
              const endDate = endIdx >= 0 ? normalizeDate(vals[endIdx]) : null;
              if (isValidDate(startDate)) {
                importedCycles.push({
                  id: generateId(),
                  startDate: startDate!,
                  endDate: isValidDate(endDate) ? endDate : null,
                  createdAt: now,
                  updatedAt: now,
                });
              }
            }
          } else if (header.includes("type") && header.includes("date")) {
            const typeIdx = colNames.findIndex((c) => c === "type");
            const dateIdx = colNames.findIndex((c) => c === "date");
            const detailsIdx = colNames.findIndex((c) => c === "details");

            for (const row of rows) {
              const vals = parseCSVRow(row);
              if (vals[typeIdx] === "cycle") {
                const startDate = normalizeDate(vals[dateIdx]);
                if (isValidDate(startDate)) {
                  let endDate: string | null = null;
                  if (detailsIdx >= 0 && vals[detailsIdx]) {
                    const endMatch = vals[detailsIdx].match(
                      /end:\s*(\d{4}-\d{2}-\d{2})/,
                    );
                    if (endMatch) endDate = endMatch[1];
                  }
                  importedCycles.push({
                    id: generateId(),
                    startDate: startDate!,
                    endDate: isValidDate(endDate) ? endDate : null,
                    createdAt: now,
                    updatedAt: now,
                  });
                }
              }
            }
          } else if (header.includes("date")) {
            const dateIdx = colNames.findIndex(
              (c) => c === "date" || c === "period_date" || c.includes("date"),
            );
            const lengthIdx = colNames.findIndex(
              (c) =>
                c === "length" ||
                c === "period_length" ||
                c.includes("duration"),
            );

            const cycleDates: string[] = [];
            for (const row of rows) {
              const vals = parseCSVRow(row);
              const date = normalizeDate(vals[dateIdx]);
              if (isValidDate(date)) {
                if (lengthIdx >= 0 && vals[lengthIdx]) {
                  const length = parseInt(vals[lengthIdx], 10);
                  if (length > 0 && length <= 20) {
                    importedCycles.push({
                      id: generateId(),
                      startDate: date!,
                      endDate: addDays(date!, length - 1),
                      createdAt: now,
                      updatedAt: now,
                    });
                  }
                } else {
                  cycleDates.push(date!);
                }
              }
            }

            if (cycleDates.length > 0 && importedCycles.length === 0) {
              cycleDates.sort();
              let segStart = cycleDates[0];
              let segEnd = cycleDates[0];
              for (let i = 1; i < cycleDates.length; i++) {
                if (addDays(segEnd, 1) === cycleDates[i]) {
                  segEnd = cycleDates[i];
                } else {
                  importedCycles.push({
                    id: generateId(),
                    startDate: segStart,
                    endDate: segEnd,
                    createdAt: now,
                    updatedAt: now,
                  });
                  segStart = cycleDates[i];
                  segEnd = cycleDates[i];
                }
              }
              importedCycles.push({
                id: generateId(),
                startDate: segStart,
                endDate: segEnd,
                createdAt: now,
                updatedAt: now,
              });
            }
          }
        }

        if (importedCycles.length === 0) {
          return {
            cyclesImported: 0,
            error:
              "No cycle data found in the file. Make sure the file contains period/cycle dates.",
          };
        }

        importedCycles = importedCycles.filter((c) => {
          if (!isValidDate(c.startDate)) return false;
          if (c.endDate && !isValidDate(c.endDate)) {
            c.endDate = null;
          }
          if (c.endDate && c.endDate < c.startDate) {
            c.endDate = null;
          }
          return true;
        });

        importedCycles.sort((a, b) => a.startDate.localeCompare(b.startDate));

        const existingDates = new Set<string>();
        for (const c of cur.cycles) {
          const end = c.endDate || c.startDate;
          const days = getDatesInRange(c.startDate, end);
          for (const d of days) existingDates.add(d);
        }

        const newCycles: Cycle[] = [];
        for (const ic of importedCycles) {
          const end = ic.endDate || ic.startDate;
          const days = getDatesInRange(ic.startDate, end);
          const overlaps = days.some((d) => existingDates.has(d));
          if (!overlaps) {
            newCycles.push(ic);
            for (const d of days) existingDates.add(d);
          }
        }

        if (newCycles.length === 0) {
          return {
            cyclesImported: 0,
            error:
              "All imported cycles overlap with existing data. No new cycles added.",
          };
        }

        const mergedCycles = [...cur.cycles, ...newCycles].sort((a, b) =>
          a.startDate.localeCompare(b.startDate),
        );
        const newData = { ...cur, cycles: mergedCycles };
        await applyAndPersist(newData);

        return { cyclesImported: newCycles.length };
      } catch {
        return {
          cyclesImported: 0,
          error:
            "We could not read that file. Please check the format and try again.",
        };
      }
    },
    [applyAndPersist],
  );

  const deleteAllData = useCallback(async () => {
    await Storage.deleteAllWHData();
    const emptyData = buildEmptyData();
    setSourceData(emptyData);
    sourceRef.current = emptyData;
    setConsentGiven(false);
    recalc(emptyData);
  }, [buildEmptyData, recalc]);

  const settings = sourceData.settings;
  const cycles = sourceData.cycles;
  const activeCycle = cycles.find((c) => c.endDate === null) || null;
  const isOnCycle = derived.cycleState === "ON_CYCLE";
  const currentCycleDay = derived.currentCycleDay || 0;
  const td = todayStr();
  const todayMood = sourceData.moodEntries.find((m) => m.date === td) || null;

  const prediction = derived.prediction;
  const istihadhaWarning = derived.istihadhaWarning;
  const predictedDatesSet = new Set(derived.calendarMarks.predictedDays || []);

  const cycleDatesSet = new Set(derived.calendarMarks.allCycleDays);
  const activeCycleDatesSet = new Set(derived.calendarMarks.activeCycleDays);
  const completedCycleDatesSet = new Set(
    derived.calendarMarks.completedCycleDays,
  );
  const qadaDatesSet = new Set(sourceData.qadaLogs.map((l) => l.date));

  const qadaPlan = {
    totalRequired:
      settings.qadaManualTotalRequired > 0
        ? settings.qadaManualTotalRequired
        : derived.qada.requiredFromRamadan,
    completedCount: derived.qada.completed,
    perWeekTarget: settings.qadaPerWeekTarget || 1,
    preferredDays:
      settings.qadaPreferredDays.length > 0
        ? settings.qadaPreferredDays
        : [1, 4],
    breakdown: settings.qadaBreakdown || ({} as Record<string, number>),
  };

  const qadaEntries = sourceData.qadaLogs.map((l) => ({
    id: l.id,
    date: l.date,
    count: l.count,
    notes: "",
    createdAt: l.date,
  }));

  const nextPrediction = (() => {
    if (prediction?.nextStart) {
      return {
        start: formatDateDisplay(prediction.nextStart),
        end: prediction.nextEnd ? formatDateDisplay(prediction.nextEnd) : "",
      };
    }
    const { predictedNextStart, predictedNextEnd } = derived.calendarMarks;
    if (!predictedNextStart) return null;
    return {
      start: formatDateDisplay(predictedNextStart),
      end: predictedNextEnd ? formatDateDisplay(predictedNextEnd) : "",
    };
  })();

  const updateQadaPlan = useCallback(
    async (
      updates: Partial<{
        totalRequired: number;
        completedCount: number;
        perWeekTarget: number;
        preferredDays: number[];
        breakdown: Record<string, number>;
      }>,
    ) => {
      const nextSettings: Partial<WHSettings> = {};
      if (typeof updates.totalRequired === "number") {
        nextSettings.qadaManualTotalRequired = Math.max(
          0,
          Math.floor(updates.totalRequired),
        );
      }
      if (typeof updates.perWeekTarget === "number") {
        nextSettings.qadaPerWeekTarget = Math.min(
          7,
          Math.max(1, Math.floor(updates.perWeekTarget)),
        );
      }
      if (Array.isArray(updates.preferredDays)) {
        nextSettings.qadaPreferredDays = updates.preferredDays
          .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
          .slice(0, 7);
      }
      if (updates.breakdown) {
        nextSettings.qadaBreakdown = updates.breakdown;
      }
      if (Object.keys(nextSettings).length > 0) {
        await updateSettings(nextSettings);
      }
    },
    [updateSettings],
  );

  if (!loaded) return null;

  return (
    <WomensHealthContext.Provider
      value={{
        settings,
        updateSettings,
        consentGiven,
        giveConsent,
        sourceData,
        derived,
        cycles,
        activeCycle,
        startCycle,
        endCycle,
        updateCycle,
        deleteCycleById,
        qadaLogs: sourceData.qadaLogs,
        addQadaEntry,
        removeQadaEntryByDate,
        undoLastQada,
        handleCalendarTap: handleCalendarTapFn,
        addCompleteCycle: addCompleteCycleFn,
        toggleCycleDate: toggleCycleDateFn,
        replaceCyclesFromDates: replaceCyclesFromDatesFn,
        acknowledgeGhusl: acknowledgeGhuslFn,
        isOnCycle,
        currentCycleDay,
        cycleState: derived.cycleState,
        ghuslAcknowledged: derived.ghuslAcknowledged,
        remainingQada: derived.qada.remaining,
        completedCycles: derived.completedCycles,
        avgCycleLength:
          derived.averages.avgCycleLengthDays || settings.typicalCycleLength,
        cycleStdDev: derived.cycleStdDev,
        recentLengths: derived.recentLengths,
        nextPrediction,
        qadaPlan,
        updateQadaPlan,
        qadaEntries,
        moodEntries: sourceData.moodEntries,
        addMoodEntry,
        updateMoodEntry,
        deleteMoodEntry,
        todayMood,
        journalEntries: sourceData.journalEntries,
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        getCycleMetadata,
        updateCycleMetadata,
        exportData,
        importData,
        deleteAllData,
        prediction,
        istihadhaWarning,
        predictedDatesSet,
        isPremium,
        cycleDatesSet,
        activeCycleDatesSet,
        completedCycleDatesSet,
        qadaDatesSet,
      }}
    >
      {children}
    </WomensHealthContext.Provider>
  );
}

export function useWomensHealth() {
  const ctx = useContext(WomensHealthContext);
  if (!ctx)
    throw new Error("useWomensHealth must be used within WomensHealthProvider");
  return ctx;
}

export type {
  WHSettings,
  MoodEntry,
  JournalEntry,
} from "@/modules/womensHealth/types";
export type { CycleState } from "@/modules/womensHealth/types";
export type CycleEntry = Cycle;
export type { QadaLog };
