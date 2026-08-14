import type {
  Cycle,
  QadaLog,
  WHSettings,
  DerivedWomenHealth,
  WHSourceData,
  Madhab,
  CycleMetadata,
} from "./types";
import { MADHAB_RULES } from "./types";
import {
  todayStr,
  diffDays,
  bleedDays,
  addDays,
  getDatesInRange,
  isDateInRange,
  generateId,
} from "./dateUtils";

function normalizeCycles(cycles: Cycle[]): Cycle[] {
  return cycles
    .map((c) => {
      if (c.endDate && c.startDate > c.endDate) {
        return { ...c, startDate: c.endDate, endDate: c.startDate };
      }
      return c;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function computeCycleState(
  cycles: Cycle[],
  ghuslAcknowledged: boolean,
): {
  state: DerivedWomenHealth["cycleState"];
  currentCycle?: Cycle;
  lastCompleted?: Cycle;
} {
  const sorted = normalizeCycles(cycles);
  const openCycle = sorted.find((c) => c.endDate === null);

  if (openCycle) {
    return { state: "ON_CYCLE", currentCycle: openCycle };
  }

  const completedCycles = sorted.filter((c) => c.endDate !== null);
  if (completedCycles.length > 0) {
    const lastCompleted = completedCycles[completedCycles.length - 1];
    if (!ghuslAcknowledged) {
      return { state: "CYCLE_COMPLETED", lastCompleted };
    }
  }

  return { state: "NOT_ON_CYCLE" };
}

function computeCurrentCycleDay(cycle: Cycle): number {
  const today = todayStr();
  const days = diffDays(cycle.startDate, today);
  return Math.max(1, days + 1);
}

function computeAverages(
  completedCycles: Cycle[],
): DerivedWomenHealth["averages"] {
  if (completedCycles.length < 1) {
    return { avgCycleLengthDays: null, avgBleedLengthDays: null };
  }

  const bleedLengths = completedCycles
    .filter((c) => c.endDate)
    .map((c) => bleedDays(c.startDate, c.endDate!));

  const avgBleed =
    bleedLengths.length > 0
      ? Math.round(
          bleedLengths.reduce((a, b) => a + b, 0) / bleedLengths.length,
        )
      : null;

  let avgCycle: number | null = null;
  if (completedCycles.length >= 2) {
    const cycleLengths: number[] = [];
    for (let i = 1; i < completedCycles.length; i++) {
      const gap = diffDays(
        completedCycles[i - 1].startDate,
        completedCycles[i].startDate,
      );
      if (gap > 0) cycleLengths.push(gap);
    }
    if (cycleLengths.length > 0) {
      avgCycle = Math.round(
        cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length,
      );
    }
  }

  return { avgCycleLengthDays: avgCycle, avgBleedLengthDays: avgBleed };
}

function computeCalendarMarks(
  cycles: Cycle[],
  averages: DerivedWomenHealth["averages"],
  currentCycle?: Cycle,
): DerivedWomenHealth["calendarMarks"] {
  const activeCycleDays: string[] = [];
  const completedCycleDays: string[] = [];
  const allCycleDays: string[] = [];

  const today = todayStr();

  for (const cycle of cycles) {
    const end = cycle.endDate || today;
    const days = getDatesInRange(cycle.startDate, end);

    if (
      cycle.endDate === null &&
      currentCycle &&
      cycle.id === currentCycle.id
    ) {
      activeCycleDays.push(...days);
    } else {
      completedCycleDays.push(...days);
    }
    allCycleDays.push(...days);
  }

  let predictedNextStart: string | undefined;
  let predictedNextEnd: string | undefined;

  const completedCycles = normalizeCycles(cycles).filter(
    (c) => c.endDate !== null,
  );
  if (completedCycles.length > 0 && averages.avgCycleLengthDays) {
    const last = completedCycles[completedCycles.length - 1];
    predictedNextStart = addDays(last.startDate, averages.avgCycleLengthDays);
    if (averages.avgBleedLengthDays) {
      predictedNextEnd = addDays(
        predictedNextStart,
        averages.avgBleedLengthDays - 1,
      );
    }
  }

  const predictedDays: string[] = [];
  if (predictedNextStart && predictedNextEnd) {
    predictedDays.push(
      ...getDatesInRange(predictedNextStart, predictedNextEnd),
    );
  }

  return {
    activeCycleDays,
    completedCycleDays,
    allCycleDays,
    predictedNextStart,
    predictedNextEnd,
    predictedDays,
  };
}

function computeQada(
  cycles: Cycle[],
  qadaLogs: QadaLog[],
  settings: WHSettings,
): DerivedWomenHealth["qada"] {
  let requiredFromRamadan = 0;

  for (const ramadan of settings.ramadanRanges) {
    const ramadanDays = getDatesInRange(ramadan.start, ramadan.end);
    for (const day of ramadanDays) {
      for (const cycle of cycles) {
        const cycleEnd = cycle.endDate || todayStr();
        if (isDateInRange(day, cycle.startDate, cycleEnd)) {
          requiredFromRamadan++;
          break;
        }
      }
    }
  }

  const completed = qadaLogs.reduce((sum, log) => sum + log.count, 0);
  const remaining = Math.max(0, requiredFromRamadan - completed);

  let statusText: string;
  if (requiredFromRamadan === 0 && completed === 0) {
    statusText = "No make-up fasts tracked yet";
  } else if (remaining === 0 && requiredFromRamadan > 0) {
    statusText = "All make-up fasts completed";
  } else if (remaining === 0 && completed > 0) {
    statusText = "All make-up fasts completed";
  } else {
    statusText = `${remaining} make-up fast${remaining !== 1 ? "s" : ""} remaining`;
  }

  return { requiredFromRamadan, completed, remaining, statusText };
}

function computeWorshipFlags(
  cycleState: DerivedWomenHealth["cycleState"],
  settings: WHSettings,
): DerivedWomenHealth["worship"] {
  if (
    settings.nifasMode ||
    cycleState === "ON_CYCLE" ||
    cycleState === "CYCLE_COMPLETED"
  ) {
    return { prayerAllowed: false, fastingAllowed: false };
  }
  return { prayerAllowed: true, fastingAllowed: true };
}

function computeStreakProtection(
  cycleState: DerivedWomenHealth["cycleState"],
  settings: WHSettings,
): DerivedWomenHealth["streakProtection"] {
  const baseActions = [
    "Make dhikr or dua",
    "Listen to Quran",
    "Read a lesson",
    "Give sadaqah",
  ];

  if (settings.nifasMode) {
    return {
      active: true,
      reason: "nifas",
      title: "Mercy pause active",
      body: "Nifas days should protect worship streaks from breaking. NurAI counts this as a valid pause and suggests gentle worship you can still do.",
      protectedHabits: ["Salah", "Fasting"],
      suggestedActions: baseActions,
      rewardLabel: "protected pause",
    };
  }

  if (cycleState === "ON_CYCLE") {
    return {
      active: true,
      reason: "haidh",
      title: "Cycle mercy pause",
      body: "Salah and fasting streaks should pause during haidh rather than feel broken. Keep your garden alive through dhikr, dua, learning, charity, and reflection.",
      protectedHabits: ["Salah", "Fasting"],
      suggestedActions: baseActions,
      rewardLabel: "protected pause",
    };
  }

  if (cycleState === "CYCLE_COMPLETED") {
    return {
      active: true,
      reason: "ghusl",
      title: "Return gently",
      body: "Your cycle is marked complete. NurAI protects the streak until ghusl is acknowledged, then prayer and fasting guidance resumes.",
      protectedHabits: ["Salah", "Fasting"],
      suggestedActions: ["Prepare ghusl", "Make dua", "Plan your next salah"],
      rewardLabel: "return protected",
    };
  }

  return {
    active: false,
    reason: "none",
    title: "Streaks active",
    body: "Your worship streaks are active today.",
    protectedHabits: [],
    suggestedActions: [],
    rewardLabel: "+ streak",
  };
}

function computeCareSignal(params: {
  metadata?: CycleMetadata | null;
  settings: WHSettings;
  cycleStdDev: number;
  istihadhaWarning: DerivedWomenHealth["istihadhaWarning"];
}): DerivedWomenHealth["careSignal"] {
  const reasons: string[] = [];
  const symptoms = params.metadata?.symptoms?.map((s) => s.key) || [];
  const hasSeverePain = symptoms.some((key) => /severe|dizziness/.test(key));
  const hasUnusualDischarge = symptoms.includes("odor_unusual");
  const hasHeavyFlow = params.metadata?.flowLevel === "heavy";

  if (params.istihadhaWarning) {
    reasons.push(
      "Cycle length or purity gap is outside the selected fiqh settings.",
    );
  }
  if (hasHeavyFlow) {
    reasons.push("Heavy flow is logged for the active cycle.");
  }
  if (hasSeverePain) {
    reasons.push("Severe pain or dizziness is logged.");
  }
  if (hasUnusualDischarge) {
    reasons.push("Unusual discharge or odor is logged.");
  }
  if (params.cycleStdDev >= 6) {
    reasons.push("Recent cycle lengths vary more than usual.");
  }

  if (params.istihadhaWarning || hasSeverePain || hasUnusualDischarge) {
    return {
      level: "medical",
      title: "Extra care recommended",
      body: "NurAI can track patterns, but unusual bleeding, severe symptoms, or unclear rulings should be checked with a healthcare professional and a qualified scholar.",
      reasons,
    };
  }

  if (hasHeavyFlow || params.cycleStdDev >= 6) {
    return {
      level: "watch",
      title: "Keep an eye on this pattern",
      body: "Track dates and symptoms carefully. If bleeding is unusually heavy, lasts longer than expected, or feels concerning, speak to a healthcare professional.",
      reasons,
    };
  }

  return {
    level: "normal",
    title: "No extra care signal",
    body: "Your current saved pattern does not raise an app-level care flag. This is not medical advice.",
    reasons: [],
  };
}

function computeStdDev(lengths: number[]): number {
  if (lengths.length < 2) return 0;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / lengths.length;
  return Math.sqrt(variance);
}

export function validateNoOverlap(
  cycles: Cycle[],
  newStart: string,
  newEnd: string | null,
  excludeId?: string,
): { valid: boolean; conflictingCycle?: Cycle } {
  const end = newEnd || newStart;
  for (const c of cycles) {
    if (excludeId && c.id === excludeId) continue;
    const cEnd = c.endDate || todayStr();
    if (newStart <= cEnd && end >= c.startDate) {
      return { valid: false, conflictingCycle: c };
    }
  }
  return { valid: true };
}

export function validateCycleDuration(
  startDate: string,
  endDate: string,
  madhab: Madhab,
): { valid: boolean; warning?: string } {
  const rules = MADHAB_RULES[madhab];
  const duration = bleedDays(startDate, endDate);

  if (duration < rules.minHaidh) {
    return {
      valid: false,
      warning: `According to the ${rules.name} school, the minimum duration of haidh is ${rules.minHaidh} day${rules.minHaidh > 1 ? "s" : ""}. This bleeding may be classified as istihadha (irregular bleeding).`,
    };
  }
  if (duration > rules.maxHaidh) {
    return {
      valid: false,
      warning: `According to the ${rules.name} school, the maximum duration of haidh is ${rules.maxHaidh} days. Bleeding beyond this may be classified as istihadha.`,
    };
  }
  return { valid: true };
}

export function computePrediction(
  completedCycles: Cycle[],
  settings: WHSettings,
): DerivedWomenHealth["prediction"] {
  if (completedCycles.length === 0) {
    return null;
  }

  const sorted = [...completedCycles].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  if (sorted.length < 2) {
    const last = sorted[sorted.length - 1];
    const nextStart = addDays(last.startDate, settings.typicalCycleLength);
    const avgBleed = last.endDate
      ? bleedDays(last.startDate, last.endDate)
      : settings.typicalPeriodLength;
    const nextEnd = addDays(nextStart, avgBleed - 1);
    return {
      nextStart,
      nextEnd,
      confidence: "low",
      rangeStart: addDays(nextStart, -3),
      rangeEnd: addDays(nextStart, 3),
    };
  }

  const cycleLengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = diffDays(sorted[i - 1].startDate, sorted[i].startDate);
    if (gap > 0 && gap < 90) cycleLengths.push(gap);
  }

  if (cycleLengths.length === 0) return null;

  let weightedSum = 0;
  let weightTotal = 0;
  const recent = cycleLengths.slice(-6);
  for (let i = 0; i < recent.length; i++) {
    const weight = i < recent.length / 2 ? 1 : 2;
    weightedSum += recent[i] * weight;
    weightTotal += weight;
  }
  const avgCycleLength = Math.round(weightedSum / weightTotal);

  const bleedLengths = sorted
    .filter((c) => c.endDate)
    .slice(-6)
    .map((c) => bleedDays(c.startDate, c.endDate!));
  const avgBleedLength =
    bleedLengths.length > 0
      ? Math.round(
          bleedLengths.reduce((a, b) => a + b, 0) / bleedLengths.length,
        )
      : settings.typicalPeriodLength;

  const lastCycle = sorted[sorted.length - 1];
  const nextStart = addDays(lastCycle.startDate, avgCycleLength);
  const nextEnd = addDays(nextStart, avgBleedLength - 1);

  const stdDev = computeStdDev(recent);
  let confidence: "low" | "medium" | "high" = "low";
  if (recent.length >= 3 && stdDev <= 3) confidence = "high";
  else if (recent.length >= 2 && stdDev <= 5) confidence = "medium";

  const rangeMargin = Math.max(2, Math.round(stdDev));

  return {
    nextStart,
    nextEnd,
    confidence,
    rangeStart: addDays(nextStart, -rangeMargin),
    rangeEnd: addDays(nextStart, rangeMargin),
  };
}

export function detectIstihadha(
  cycles: Cycle[],
  madhab: Madhab,
  madhabConfirmed = true,
): DerivedWomenHealth["istihadhaWarning"] {
  if (!madhabConfirmed) return null;
  const rules = MADHAB_RULES[madhab];
  const sorted = normalizeCycles(cycles);
  const openCycle = sorted.find((c) => c.endDate === null);

  if (openCycle) {
    const currentDays = diffDays(openCycle.startDate, todayStr()) + 1;
    if (currentDays > rules.maxHaidh) {
      return {
        message: `Your current bleeding is beyond the ${rules.maxHaidh}-day reference saved for the ${rules.name} school. NurAI cannot classify your bleeding or decide prayer and fasting duties from dates alone. Keep a clear record and ask a qualified scholar; seek clinical help as well if bleeding is heavy, painful, unusual, or concerning.`,
        type: "exceeds_max",
      };
    }
  }

  const completed = sorted.filter((c) => c.endDate !== null);
  if (completed.length >= 2) {
    const last = completed[completed.length - 1];
    const prev = completed[completed.length - 2];
    if (prev.endDate && last.startDate) {
      const tuhr = diffDays(prev.endDate, last.startDate);
      if (tuhr > 0 && tuhr < rules.minTuhr) {
        return {
          message: `The logged gap between these cycles is ${tuhr} ${tuhr === 1 ? "day" : "days"}, shorter than the ${rules.minTuhr}-day reference saved for the ${rules.name} school. This app cannot classify the later bleeding or issue a personal ruling; review the dates with a qualified scholar.`,
          type: "too_soon",
        };
      }
    }
  }

  return null;
}

export function recalculateAll(data: WHSourceData): DerivedWomenHealth {
  const sorted = normalizeCycles(data.cycles);
  const completedCycles = sorted.filter((c) => c.endDate !== null);

  const { state, currentCycle } = computeCycleState(
    sorted,
    data.ghuslAcknowledged,
  );
  const averages = computeAverages(completedCycles);
  const calendarMarks = computeCalendarMarks(sorted, averages, currentCycle);
  const qada = computeQada(sorted, data.qadaLogs, data.settings);
  const worship = computeWorshipFlags(state, data.settings);

  const bleedLengths = completedCycles
    .filter((c) => c.endDate)
    .slice(-6)
    .map((c) => bleedDays(c.startDate, c.endDate!));

  const prediction = computePrediction(completedCycles, data.settings);
  const istihadhaWarning = detectIstihadha(
    sorted,
    data.settings.madhab,
    data.settings.madhabConfirmed,
  );
  const activeMetadata = currentCycle
    ? data.cycleMetadata[currentCycle.id] || null
    : null;
  const cycleStdDev = computeStdDev(bleedLengths);

  return {
    cycleState: state,
    currentCycleId: currentCycle?.id,
    currentCycleDay: currentCycle
      ? computeCurrentCycleDay(currentCycle)
      : undefined,
    currentCycleStartDate: currentCycle?.startDate,
    ghuslRequired: state === "CYCLE_COMPLETED",
    ghuslAcknowledged: data.ghuslAcknowledged,
    worship,
    averages,
    calendarMarks,
    qada,
    streakProtection: computeStreakProtection(state, data.settings),
    careSignal: computeCareSignal({
      metadata: activeMetadata,
      settings: data.settings,
      cycleStdDev,
      istihadhaWarning,
    }),
    completedCycles,
    cycleStdDev,
    recentLengths: bleedLengths,
    prediction,
    istihadhaWarning,
  };
}

export function addCycleStart(
  data: WHSourceData,
  date: string,
): { data: WHSourceData; error?: string } {
  const openCycle = data.cycles.find((c) => c.endDate === null);
  if (openCycle) {
    return {
      data,
      error: "You already have an active cycle. Please end it first.",
    };
  }

  const { valid, conflictingCycle } = validateNoOverlap(
    data.cycles,
    date,
    null,
  );
  if (!valid && conflictingCycle) {
    const end = conflictingCycle.endDate || "ongoing";
    return {
      data,
      error: `This date overlaps with an existing cycle (${conflictingCycle.startDate} to ${end}). Please edit that entry instead.`,
    };
  }

  const now = new Date().toISOString();
  const newCycle: Cycle = {
    id: generateId(),
    startDate: date,
    endDate: null,
    createdAt: now,
    updatedAt: now,
  };

  return {
    data: {
      ...data,
      cycles: [...data.cycles, newCycle],
      ghuslAcknowledged: true,
    },
  };
}

export function addCycleEnd(
  data: WHSourceData,
  cycleId: string,
  date: string,
): { data: WHSourceData; warning?: string; error?: string } {
  const cycle = data.cycles.find((c) => c.id === cycleId);
  if (!cycle) return { data };

  let endDate = date;
  if (endDate < cycle.startDate) endDate = cycle.startDate;

  const { valid, conflictingCycle } = validateNoOverlap(
    data.cycles,
    cycle.startDate,
    endDate,
    cycleId,
  );
  if (!valid && conflictingCycle) {
    const conflictEnd = conflictingCycle.endDate || "ongoing";
    return {
      data,
      error: `This overlaps with an existing cycle entry (${conflictingCycle.startDate} to ${conflictEnd}). Please edit or delete the existing entry first.`,
    };
  }

  const now = new Date().toISOString();
  let warning: string | undefined;
  if (data.settings.madhabConfirmed) {
    const validation = validateCycleDuration(
      cycle.startDate,
      endDate,
      data.settings.madhab,
    );
    if (!validation.valid && validation.warning) {
      warning = validation.warning;
    }
  }

  const updatedCycles = data.cycles.map((c) => {
    if (c.id === cycleId && c.endDate === null) {
      return { ...c, endDate, updatedAt: now };
    }
    return c;
  });

  return {
    data: {
      ...data,
      cycles: updatedCycles,
      ghuslAcknowledged: false,
    },
    warning,
  };
}

export function addCompleteCycle(
  data: WHSourceData,
  startDate: string,
  endDate: string,
): { data: WHSourceData; warning?: string; error?: string } {
  const openCycle = data.cycles.find((c) => c.endDate === null);
  if (openCycle) {
    return {
      data,
      error: "You already have an active cycle. Please end it first.",
    };
  }

  let sDate = startDate;
  let eDate = endDate;
  if (sDate > eDate) {
    sDate = endDate;
    eDate = startDate;
  }

  const { valid, conflictingCycle } = validateNoOverlap(
    data.cycles,
    sDate,
    eDate,
  );
  if (!valid && conflictingCycle) {
    const conflictEnd = conflictingCycle.endDate || "ongoing";
    return {
      data,
      error: `This overlaps with an existing cycle (${conflictingCycle.startDate} to ${conflictEnd}). Please edit that entry instead.`,
    };
  }

  let warning: string | undefined;
  if (data.settings.madhabConfirmed) {
    const validation = validateCycleDuration(
      sDate,
      eDate,
      data.settings.madhab,
    );
    if (!validation.valid && validation.warning) {
      warning = validation.warning;
    }
  }

  const now = new Date().toISOString();
  const newCycle: Cycle = {
    id: generateId(),
    startDate: sDate,
    endDate: eDate,
    createdAt: now,
    updatedAt: now,
  };

  return {
    data: {
      ...data,
      cycles: [...data.cycles, newCycle],
      ghuslAcknowledged: false,
    },
    warning,
  };
}

export function toggleCycleDate(
  data: WHSourceData,
  date: string,
): { data: WHSourceData; error?: string } {
  const now = new Date().toISOString();
  const today = todayStr();

  const openCycle = data.cycles.find((c) => c.endDate === null);
  if (openCycle && date >= openCycle.startDate && date <= today) {
    return {
      data,
      error:
        "This date is part of your active cycle. End it from the Home tab first.",
    };
  }

  const allDates = new Set<string>();
  for (const c of data.cycles) {
    if (c.endDate === null) continue;
    const days = getDatesInRange(c.startDate, c.endDate);
    for (const d of days) allDates.add(d);
  }

  if (allDates.has(date)) {
    const newCycles: Cycle[] = [];
    for (const c of data.cycles) {
      if (c.endDate === null) {
        newCycles.push(c);
        continue;
      }
      const days = getDatesInRange(c.startDate, c.endDate).filter(
        (d) => d !== date,
      );
      if (days.length === 0) continue;
      let segStart = days[0];
      for (let i = 1; i < days.length; i++) {
        if (addDays(days[i - 1], 1) !== days[i]) {
          newCycles.push({
            ...c,
            id: segStart === c.startDate ? c.id : generateId(),
            startDate: segStart,
            endDate: days[i - 1],
            updatedAt: now,
          });
          segStart = days[i];
        }
      }
      newCycles.push({
        ...c,
        id: segStart === c.startDate ? c.id : generateId(),
        startDate: segStart,
        endDate: days[days.length - 1],
        updatedAt: now,
      });
    }
    return { data: { ...data, cycles: newCycles } };
  }

  const newCycle: Cycle = {
    id: generateId(),
    startDate: date,
    endDate: date,
    createdAt: now,
    updatedAt: now,
  };
  return {
    data: {
      ...data,
      cycles: [...data.cycles, newCycle],
      ghuslAcknowledged: false,
    },
  };
}

export function endCurrentCycle(
  data: WHSourceData,
  date?: string,
): { data: WHSourceData; warning?: string; error?: string } {
  const openCycle = data.cycles.find((c) => c.endDate === null);
  if (!openCycle) return { data };
  return addCycleEnd(data, openCycle.id, date || todayStr());
}

export function editCycle(
  data: WHSourceData,
  cycleId: string,
  updates: { startDate?: string; endDate?: string | null; notes?: string },
): WHSourceData {
  const now = new Date().toISOString();
  const updatedCycles = data.cycles.map((c) => {
    if (c.id === cycleId) {
      const updated = { ...c, ...updates, updatedAt: now };
      if (updated.endDate && updated.startDate > updated.endDate) {
        const tmp = updated.startDate;
        updated.startDate = updated.endDate;
        updated.endDate = tmp;
      }
      return updated;
    }
    return c;
  });

  return { ...data, cycles: updatedCycles };
}

export function deleteCycle(data: WHSourceData, cycleId: string): WHSourceData {
  return {
    ...data,
    cycles: data.cycles.filter((c) => c.id !== cycleId),
  };
}

export function markQadaFastCompleted(
  data: WHSourceData,
  date: string,
  count: number = 1,
): WHSourceData {
  const alreadyLogged = data.qadaLogs.some((l) => l.date === date);
  if (alreadyLogged) return data;

  const newLog: QadaLog = {
    id: generateId(),
    date,
    count,
    type: "qada_fast_completed",
  };

  return {
    ...data,
    qadaLogs: [...data.qadaLogs, newLog],
  };
}

export function undoQadaFast(data: WHSourceData, date: string): WHSourceData {
  const idx = data.qadaLogs.findIndex((l) => l.date === date);
  if (idx === -1) {
    if (data.qadaLogs.length === 0) return data;
    return {
      ...data,
      qadaLogs: data.qadaLogs.slice(0, -1),
    };
  }

  return {
    ...data,
    qadaLogs: data.qadaLogs.filter((_, i) => i !== idx),
  };
}

export function undoLastQadaFast(data: WHSourceData): WHSourceData {
  if (data.qadaLogs.length === 0) return data;
  return {
    ...data,
    qadaLogs: data.qadaLogs.slice(0, -1),
  };
}

export function toggleQadaOnDate(
  data: WHSourceData,
  date: string,
): WHSourceData {
  const existing = data.qadaLogs.find((l) => l.date === date);
  if (existing) {
    return undoQadaFast(data, date);
  }
  return markQadaFastCompleted(data, date);
}

export function acknowledgeGhusl(data: WHSourceData): WHSourceData {
  return { ...data, ghuslAcknowledged: true };
}

export function handleCalendarTap(
  data: WHSourceData,
  date: string,
  tab: "cycle" | "qada",
): { data: WHSourceData; error?: string } {
  if (tab === "qada") {
    return { data: toggleQadaOnDate(data, date) };
  }

  return toggleCycleDate(data, date);
}
