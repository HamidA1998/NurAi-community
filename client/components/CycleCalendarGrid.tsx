import React, { useReducer } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Fonts, Spacing } from "@/constants/theme";
import { AppIcon } from "@/components/icons";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}
function getFirstDayOfMonth(y: number, m: number): number {
  return new Date(y, m, 1).getDay();
}
function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

type CalState = Record<string, boolean> | null;
type CalAction =
  | { type: "TOGGLE"; dateStr: string; savedDates: string[] }
  | { type: "RESET" };

function reducer(state: CalState, action: CalAction): CalState {
  if (action.type === "RESET") return null;
  if (action.type === "TOGGLE") {
    const base: Record<string, boolean> = {};
    if (state === null) {
      for (const d of action.savedDates) base[d] = true;
    } else {
      for (const k of Object.keys(state)) {
        if (state[k]) base[k] = true;
      }
    }
    if (base[action.dateStr]) {
      delete base[action.dateStr];
    } else {
      base[action.dateStr] = true;
    }
    return base;
  }
  return state;
}

interface Props {
  month: number;
  year: number;
  savedDates: string[];
  activeCycleDates: string[];
  completedCycleDates: string[];
  predictedDates: string[];
  todayStr: string;
  roseColors: { bg: string; text: string };
  emeraldTextColor: string;
  textColor: string;
  mutedColor: string;
  isDark: boolean;
  onSave: (dates: string[]) => void;
  onDiscard: () => void;
}

interface DayCellData {
  key: string;
  type: "empty" | "day";
  day?: number;
  ds?: string;
}

export default function CycleCalendarGrid({
  month,
  year,
  savedDates,
  activeCycleDates,
  completedCycleDates,
  predictedDates,
  todayStr: todayDate,
  roseColors,
  emeraldTextColor,
  textColor,
  mutedColor,
  isDark,
  onSave,
  onDiscard,
}: Props) {
  const [selected, dispatch] = useReducer(reducer, null);
  const isEditing = selected !== null;

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthStr = pad2(month + 1);

  const activeLookup: Record<string, boolean> = {};
  for (const d of activeCycleDates) activeLookup[d] = true;
  const completedLookup: Record<string, boolean> = {};
  for (const d of completedCycleDates) completedLookup[d] = true;
  const savedLookup: Record<string, boolean> = {};
  for (const d of savedDates) savedLookup[d] = true;
  const predLookup: Record<string, boolean> = {};
  for (const d of predictedDates) predLookup[d] = true;

  function isSel(ds: string): boolean {
    if (selected !== null) return selected[ds] === true;
    return savedLookup[ds] === true;
  }

  let changeCount = 0;
  if (selected !== null) {
    for (const d in selected) {
      if (selected[d] && !savedLookup[d]) changeCount++;
    }
    for (const d in savedLookup) {
      if (savedLookup[d] && selected[d] !== true) changeCount++;
    }
  }

  function doToggle(ds: string) {
    if (ds > todayDate) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
      return;
    }
    if (activeLookup[ds]) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      return;
    }
    try {
      Haptics.selectionAsync();
    } catch {}
    dispatch({ type: "TOGGLE", dateStr: ds, savedDates });
  }

  function doSave() {
    if (!selected) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onSave(Object.keys(selected).filter((d) => selected[d]));
    dispatch({ type: "RESET" });
  }

  function doDiscard() {
    try {
      Haptics.selectionAsync();
    } catch {}
    dispatch({ type: "RESET" });
    onDiscard();
  }

  const allCells: DayCellData[] = [];

  for (let i = 0; i < firstDay; i++) {
    allCells.push({ key: `empty-start-${i}`, type: "empty" });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${year}-${monthStr}-${pad2(day)}`;
    allCells.push({ key: `day-${ds}`, type: "day", day, ds });
  }

  const trailingCount =
    allCells.length % 7 === 0 ? 0 : 7 - (allCells.length % 7);
  for (let i = 0; i < trailingCount; i++) {
    allCells.push({ key: `empty-end-${i}`, type: "empty" });
  }

  const rows: DayCellData[][] = [];
  for (let i = 0; i < allCells.length; i += 7) {
    rows.push(allCells.slice(i, i + 7));
  }

  return (
    <View>
      <View style={styles.row}>
        {DAY_LABELS.map((l) => (
          <View key={l} style={styles.cell}>
            <Text
              style={[
                styles.label,
                { color: mutedColor, fontFamily: Fonts?.sans },
              ]}
            >
              {l}
            </Text>
          </View>
        ))}
      </View>

      {rows.map((rowCells, rowIdx) => (
        <View key={`row-${rowIdx}`} style={styles.row}>
          {rowCells.map((cell) => {
            if (cell.type === "empty") {
              return <View key={cell.key} style={styles.cell} />;
            }

            const ds = cell.ds!;
            const sel = isSel(ds);
            const future = ds > todayDate;
            const today = ds === todayDate;
            const pred = predLookup[ds] === true;
            const isActive = activeLookup[ds] === true;
            const isCompleted = completedLookup[ds] === true;
            const wasSaved = savedLookup[ds] === true;
            const newAdd = isEditing && sel && !wasSaved;
            const newRemove = isEditing && !sel && wasSaved;

            let bg: string | undefined;
            let fg = textColor;
            let bold = false;
            let bdr: object | undefined;

            if (isActive && !isEditing) {
              bg = roseColors.bg;
              fg = roseColors.text;
              bold = true;
            } else if (isCompleted && !isEditing) {
              bg = roseColors.bg;
              fg = roseColors.text;
              bold = true;
            } else if (newAdd) {
              bg = roseColors.bg;
              fg = roseColors.text;
              bold = true;
              bdr = {
                borderWidth: 2,
                borderColor: roseColors.text,
                borderStyle: "dashed" as const,
              };
            } else if (newRemove) {
              bdr = {
                borderWidth: 2,
                borderColor: mutedColor,
                borderStyle: "dashed" as const,
              };
              fg = mutedColor;
            } else if (sel) {
              bg = roseColors.bg;
              fg = roseColors.text;
              bold = true;
            } else if (pred) {
              bg = isDark ? "#451A03" : "#FEF3C7";
              fg = isDark ? "#F59E0B" : "#D97706";
            } else if (future) {
              fg = mutedColor;
            }

            const todayRing = today
              ? { borderWidth: 2, borderColor: emeraldTextColor }
              : undefined;

            return (
              <Pressable
                key={cell.key}
                style={styles.cell}
                onPress={() => doToggle(ds)}
                testID={`calendar-day-${ds}`}
              >
                <View
                  style={[
                    styles.circle,
                    bg ? { backgroundColor: bg } : undefined,
                    bdr,
                    todayRing && !bdr ? todayRing : undefined,
                    future && !pred ? { opacity: 0.4 } : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: fg, fontFamily: Fonts?.sans },
                      bold ? { fontWeight: "700" } : undefined,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={styles.hintRow}>
        <AppIcon
          name={isEditing ? "edit-2" : "info"}
          size={12}
          color={isEditing ? roseColors.text : mutedColor}
        />
        <Text
          style={[
            styles.hintText,
            {
              color: isEditing ? roseColors.text : mutedColor,
              fontFamily: Fonts?.sans,
            },
          ]}
        >
          {isEditing
            ? `Editing: ${changeCount} ${changeCount === 1 ? "date" : "dates"} changed`
            : "Tap dates to mark period days"}
        </Text>
      </View>

      {isEditing ? (
        <View style={styles.btnRow}>
          {changeCount > 0 ? (
            <Pressable
              onPress={doSave}
              style={[
                styles.btn,
                {
                  backgroundColor: emeraldTextColor,
                  borderColor: emeraldTextColor,
                },
              ]}
              testID="button-save-cycle-dates"
            >
              <AppIcon name="check" size={16} color="#FFFFFF" />
              <Text style={styles.saveTxt}>{`Save (${changeCount})`}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={doDiscard}
            style={[
              styles.btn,
              {
                backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                borderColor: isDark ? "#334155" : "#E2E8F0",
              },
            ]}
            testID="button-discard-cycle-dates"
          >
            <AppIcon name="x" size={16} color={mutedColor} />
            <Text style={[styles.discTxt, { color: mutedColor }]}>
              {changeCount > 0 ? "Discard" : "Done"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontSize: 14, textAlign: "center" },
  label: {
    fontSize: 11,
    textAlign: "center",
    fontWeight: "600",
    paddingVertical: 4,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  hintText: { fontSize: 12 },
  btnRow: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
  },
  saveTxt: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  discTxt: { fontWeight: "600", fontSize: 14 },
});
