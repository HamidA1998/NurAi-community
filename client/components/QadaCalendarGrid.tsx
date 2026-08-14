import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Fonts, Spacing, BorderRadius } from "@/constants/theme";
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

interface Props {
  month: number;
  year: number;
  qadaDates: string[];
  todayStr: string;
  emeraldColors: { bg: string; text: string };
  textColor: string;
  mutedColor: string;
  isDark: boolean;
  onLogFasts: (dates: string[]) => void;
  onUnlogFast: (date: string) => void;
}

interface DayCellData {
  key: string;
  type: "empty" | "day";
  day?: number;
  ds?: string;
  isLogged?: boolean;
  isSelected?: boolean;
  future?: boolean;
  today?: boolean;
}

export default function QadaCalendarGrid({
  month,
  year,
  qadaDates,
  todayStr,
  emeraldColors,
  textColor,
  mutedColor,
  isDark,
  onLogFasts,
  onUnlogFast,
}: Props) {
  const [pendingDates, setPendingDates] = useState<Set<string>>(new Set());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthStr = pad2(month + 1);

  const qadaLookup: Record<string, boolean> = {};
  for (const d of qadaDates) qadaLookup[d] = true;

  const allCells: DayCellData[] = [];

  for (let i = 0; i < firstDay; i++) {
    allCells.push({ key: `empty-start-${i}`, type: "empty" });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${year}-${monthStr}-${pad2(day)}`;
    allCells.push({
      key: `day-${ds}`,
      type: "day",
      day,
      ds,
      isLogged: qadaLookup[ds] === true,
      isSelected: pendingDates.has(ds),
      future: ds > todayStr,
      today: ds === todayStr,
    });
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

  const handleDayPress = useCallback(
    (ds: string, future: boolean, isLogged: boolean) => {
      if (future) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        return;
      }
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }

      if (isLogged) {
        onUnlogFast(ds);
        return;
      }

      setPendingDates((prev) => {
        const next = new Set(prev);
        if (next.has(ds)) {
          next.delete(ds);
        } else {
          next.add(ds);
        }
        return next;
      });
    },
    [onUnlogFast],
  );

  const handleLogFasts = useCallback(() => {
    if (pendingDates.size === 0) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onLogFasts(Array.from(pendingDates).sort());
    setPendingDates(new Set());
  }, [pendingDates, onLogFasts]);

  const handleClearSelection = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setPendingDates(new Set());
  }, []);

  const amberBg = isDark ? "#78350F" : "#FEF3C7";
  const amberText = isDark ? "#FCD34D" : "#92400E";
  const pendingCount = pendingDates.size;

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

            let bg: string | undefined;
            let fg = textColor;
            let bold = false;
            let checkmark = false;

            if (cell.isLogged) {
              bg = emeraldColors.bg;
              fg = emeraldColors.text;
              bold = true;
              checkmark = true;
            } else if (cell.isSelected) {
              bg = amberBg;
              fg = amberText;
              bold = true;
            } else if (cell.future) {
              fg = mutedColor;
            }

            const todayRing = cell.today
              ? { borderWidth: 2, borderColor: emeraldColors.text }
              : undefined;

            return (
              <Pressable
                key={cell.key}
                style={styles.cell}
                onPress={() =>
                  handleDayPress(cell.ds!, cell.future!, cell.isLogged!)
                }
                testID={`qada-day-${cell.ds}`}
              >
                <View
                  style={[
                    styles.circle,
                    bg ? { backgroundColor: bg } : undefined,
                    todayRing,
                    cell.future ? { opacity: 0.4 } : undefined,
                  ]}
                >
                  {checkmark ? (
                    <AppIcon name="check" size={16} color={fg} />
                  ) : (
                    <Text
                      style={[
                        styles.dayText,
                        { color: fg, fontFamily: Fonts?.sans },
                        bold ? { fontWeight: "700" } : undefined,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      {pendingCount > 0 ? (
        <View
          style={[
            styles.actionBar,
            {
              backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
              borderColor: isDark ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          <View style={styles.actionInfo}>
            <View style={[styles.badge, { backgroundColor: amberBg }]}>
              <Text
                style={[
                  styles.badgeText,
                  { color: amberText, fontFamily: Fonts?.sansBold },
                ]}
              >
                {pendingCount}
              </Text>
            </View>
            <Text
              style={[
                styles.actionLabel,
                { color: textColor, fontFamily: Fonts?.sans },
              ]}
            >
              {pendingCount === 1 ? "day selected" : "days selected"}
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <Pressable
              onPress={handleClearSelection}
              style={[
                styles.clearBtn,
                { borderColor: isDark ? "#475569" : "#CBD5E1" },
              ]}
              testID="button-qada-clear"
            >
              <AppIcon name="x" size={16} color={mutedColor} />
            </Pressable>
            <Pressable
              onPress={handleLogFasts}
              style={[styles.logBtn, { backgroundColor: emeraldColors.text }]}
              testID="button-qada-log"
            >
              <AppIcon name="check" size={16} color="#FFFFFF" />
              <Text
                style={[styles.logBtnText, { fontFamily: Fonts?.sansBold }]}
              >
                {"Log Fasts"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.hintRow}>
          <AppIcon name="info" size={12} color={mutedColor} />
          <Text
            style={[
              styles.hintText,
              { color: mutedColor, fontFamily: Fonts?.sans },
            ]}
          >
            {"Tap dates to select, then log your make-up fasts"}
          </Text>
        </View>
      )}

      <View style={[styles.legendRow, { marginTop: Spacing.sm }]}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: emeraldColors.bg }]}
          >
            <AppIcon name="check" size={8} color={emeraldColors.text} />
          </View>
          <Text
            style={[
              styles.legendText,
              { color: mutedColor, fontFamily: Fonts?.sans },
            ]}
          >
            {"Logged"}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: amberBg }]} />
          <Text
            style={[
              styles.legendText,
              { color: mutedColor, fontFamily: Fonts?.sans },
            ]}
          >
            {"Selected"}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { borderWidth: 2, borderColor: emeraldColors.text },
            ]}
          />
          <Text
            style={[
              styles.legendText,
              { color: mutedColor, fontFamily: Fonts?.sans },
            ]}
          >
            {"Today"}
          </Text>
        </View>
      </View>
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
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  actionInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 13 },
  actionLabel: { fontSize: 13 },
  actionButtons: { flexDirection: "row", alignItems: "center", gap: 8 },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
  },
  logBtnText: { color: "#FFFFFF", fontSize: 13 },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: Spacing.sm,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  legendText: { fontSize: 11 },
});
