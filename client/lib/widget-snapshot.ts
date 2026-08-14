import { NativeModules, Platform } from "react-native";

export type NurAIWidgetSnapshot = {
  updatedAt: number;
  displayName?: string | null;
  locationLabel?: string | null;
  hijriDateLabel?: string | null;
  gregorianDateLabel?: string | null;
  nextPrayerName?: string | null;
  nextPrayerTimeISO?: string | null;
  prayerTimeLabel?: string | null;
  prayerSchedule?: NurAIWidgetPrayerScheduleEntry[];
  qiblaLabel?: string | null;
  weatherTemperatureC?: number | null;
  weatherCondition?: string | null;
  weatherInsight?: string | null;
  streakDays?: number;
  checkedDays?: string[];
  quranContinueLabel?: string | null;
  quranProgressLabel?: string | null;
  quranContinueSurah?: number | null;
  quranContinueVerse?: number | null;
  dailyGoalLabel?: string | null;
  dailyGoalProgress?: number | null;
  familyGoalLabel?: string | null;
  tasbeehCount?: number;
  tasbeehTarget?: number;
  tasbeehDhikrLabel?: string | null;
  tasbeehTodayTotal?: number;
  travelModeEnabled?: boolean;
  travelDestinationLabel?: string | null;
  travelFlightLabel?: string | null;
  travelPrayerPlanLabel?: string | null;
  travelReadinessProgress?: number | null;
};

export type NurAIWidgetPrayerScheduleEntry = {
  name: string;
  displayName: string;
  timeISO: string;
  timeLabel: string;
};

type NurAIWidgetNativeModule = {
  saveSnapshot?: (snapshot: NurAIWidgetSnapshot) => Promise<boolean>;
  mergeSnapshot?: (snapshot: Partial<NurAIWidgetSnapshot>) => Promise<boolean>;
  clearSnapshot?: () => Promise<boolean>;
};

const nativeWidgetModule = NativeModules.NurAIWidgetModule as
  | NurAIWidgetNativeModule
  | undefined;

export async function saveNurAIWidgetSnapshot(
  snapshot: NurAIWidgetSnapshot,
): Promise<boolean> {
  if (Platform.OS !== "ios" || !nativeWidgetModule?.saveSnapshot) {
    return false;
  }

  try {
    return await nativeWidgetModule.saveSnapshot(snapshot);
  } catch {
    return false;
  }
}

export async function updateNurAIWidgetSnapshot(
  snapshot: Partial<NurAIWidgetSnapshot>,
): Promise<boolean> {
  if (Platform.OS !== "ios" || !nativeWidgetModule?.mergeSnapshot) {
    return false;
  }

  try {
    return await nativeWidgetModule.mergeSnapshot({
      updatedAt: Date.now(),
      ...snapshot,
    });
  } catch {
    return false;
  }
}

export async function clearNurAIWidgetSnapshot(): Promise<boolean> {
  if (Platform.OS !== "ios" || !nativeWidgetModule?.clearSnapshot) {
    return false;
  }

  try {
    return await nativeWidgetModule.clearSnapshot();
  } catch {
    return false;
  }
}
