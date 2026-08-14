import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Coordinates, PrayerTimes } from "adhan";
import { getCalculationMethod } from "@/lib/prayer-utils";
import { apiRequest } from "@/lib/query-client";
import { personalizeNotificationText } from "@/lib/notification-center";
import {
  loadProfileV3,
  type NurAIUserProfileV3,
} from "@/services/nuraiProfileV3";
import {
  notificationSoundForMode,
  type PrayerAlertSoundMode,
} from "@/lib/prayer-alert-sounds";
import { getHijriDate, loadHijriAdjustment } from "@/services/nuraiHijriEngine";

const PRAYER_NAMES = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerName = (typeof PRAYER_NAMES)[number];
const SMART_PUSH_TOKEN_STORAGE_KEY = "nurai_smart_push_token_v1";
const SMART_PUSH_DEVICE_ID_STORAGE_KEY = "nurai_smart_push_device_id_v1";

const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export type ReminderCategory =
  | "quran_goal"
  | "daily_goal"
  | "dhikr"
  | "friday_kahf"
  | "tahajjud"
  | "wake"
  | "travel"
  | "health"
  | "adhkar"
  | "fasting"
  | "seasonal"
  | "smart_nurai";

interface NotificationSettings {
  permissionGranted: boolean;
  prayerReminders: Record<string, { enabled: boolean; minutesBefore: number }>;
  athanReminders?: Record<string, { enabled: boolean }>;
  prayerTimeAlerts?: Record<string, { mode: PrayerAlertSoundMode }>;
  fastingReminder: boolean;
  readingReminder: boolean;
  dailyGoalReminder?: boolean;
  dhikrReminder: boolean;
  healthReminder: boolean;
  fridayKahf: boolean;
  tahajjudReminder: boolean;
  wakeReminder?: boolean;
  travelReminder?: boolean;
  adhkarReminder: boolean;
  seasonalReminders: boolean;
  smartNuraiReminders?: boolean;
  sound: boolean;
  vibration: boolean;
  quietHours: { enabled: boolean; start: number; end: number };
}

const REMINDER_IDENTIFIERS: Record<ReminderCategory, string[]> = {
  quran_goal: ["reminder-quran_goal"],
  daily_goal: ["reminder-daily-goal"],
  dhikr: ["reminder-dhikr-morning", "reminder-dhikr-evening"],
  friday_kahf: ["reminder-friday_kahf"],
  tahajjud: ["reminder-tahajjud"],
  wake: [
    "reminder-wake-fajr-0",
    "reminder-wake-fajr-1",
    "reminder-wake-fajr-2",
    "reminder-wake-fajr-3",
    "reminder-wake-fajr-4",
    "reminder-wake-fajr-5",
    "reminder-wake-fajr-6",
  ],
  travel: ["reminder-travel-dua"],
  health: ["reminder-health"],
  adhkar: ["reminder-adhkar-morning", "reminder-adhkar-evening"],
  fasting: [
    "reminder-fasting-suhoor-0",
    "reminder-fasting-suhoor-1",
    "reminder-fasting-suhoor-2",
    "reminder-fasting-suhoor-3",
    "reminder-fasting-suhoor-4",
    "reminder-fasting-suhoor-5",
    "reminder-fasting-suhoor-6",
    "reminder-fasting-iftar-0",
    "reminder-fasting-iftar-1",
    "reminder-fasting-iftar-2",
    "reminder-fasting-iftar-3",
    "reminder-fasting-iftar-4",
    "reminder-fasting-iftar-5",
    "reminder-fasting-iftar-6",
  ],
  seasonal: [
    "reminder-seasonal-ramadan",
    "reminder-seasonal-eid-fitr",
    "reminder-seasonal-eid-adha",
    "reminder-seasonal-dhul-hijjah",
  ],
  smart_nurai: [
    "reminder-smart-nurai-morning",
    "reminder-smart-nurai-evening",
    "reminder-smart-nurai-weekly",
  ],
};

function isWeb(): boolean {
  return Platform.OS === "web";
}

function inferReminderNotificationType(
  id: string,
): "prayer" | "fasting" | "reading" | "dhikr" | "update" | "system" {
  const normalized = id.toLowerCase();
  if (normalized.includes("quran") || normalized.includes("reading"))
    return "reading";
  if (
    normalized.includes("dhikr") ||
    normalized.includes("adhkar") ||
    normalized.includes("tasbeeh")
  )
    return "dhikr";
  if (
    normalized.includes("fasting") ||
    normalized.includes("suhoor") ||
    normalized.includes("iftar")
  )
    return "fasting";
  if (normalized.includes("prayer") || normalized.includes("tahajjud"))
    return "prayer";
  if (normalized.includes("update")) return "update";
  return "system";
}

function formatPrayerClockTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildPrayerReminderCopy(
  prayerName: PrayerName,
  prayerTime: Date,
  minutesBefore: number,
): { title: string; body: string } {
  const label = PRAYER_LABELS[prayerName];
  const time = formatPrayerClockTime(prayerTime);
  const lead =
    minutesBefore <= 1
      ? `${label} is close`
      : `${minutesBefore} min to ${label}`;

  const copy: Record<PrayerName, { title: string; body: string }> = {
    fajr: {
      title: "{name}, Fajr is close",
      body: `${lead} at ${time}. Wake gently, make wudu, and start the day with light.`,
    },
    dhuhr: {
      title: "Your Dhuhr reset is coming",
      body: `${lead} at ${time}. Step away for a calm pause and protect the middle of your day.`,
    },
    asr: {
      title: "Protect Asr today",
      body: `${lead} at ${time}. A steady prayer now can carry your evening with barakah.`,
    },
    maghrib: {
      title: "Maghrib is almost here",
      body: `${lead} at ${time}. Prepare now so you can pray without rushing.`,
    },
    isha: {
      title: "Close the day with Isha",
      body: `${lead} at ${time}. End the night with prayer and one quiet reflection in NurAI.`,
    },
  };

  return (
    copy[prayerName] || {
      title: `${label} is close`,
      body: `${lead} at ${time}. Open NurAI to prepare calmly.`,
    }
  );
}

function safeLowerFirst(text: string): string {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function strongestPersonalAction(profile: NurAIUserProfileV3): {
  title: string;
  body: string;
  route: string;
  reason: string;
} {
  if (profile.privateMode?.stealthNotifications) {
    return {
      title: "Your private NurAI check-in is ready",
      body: "Open your daily space and choose one calm step for today.",
      route: "Home",
      reason: "privacy_safe_check_in",
    };
  }

  const currentStreak = profile.streakData?.currentStreak || 0;
  const quranMinutes = profile.quranReadingHabit?.averageDailyMinutes || 0;
  const quranProgress = profile.quranReadingHabit?.completionPercentage || 0;
  const arabicWords = profile.vocabulary?.wordsInProgress?.length || 0;
  const quranLabel =
    profile.quranReadingHabit?.currentSurah &&
    profile.quranReadingHabit.currentAyah
      ? `continue Surah ${profile.quranReadingHabit.currentSurah}:${profile.quranReadingHabit.currentAyah}`
      : "read one ayah with meaning";

  if (profile.prayerConsistency < 0.6) {
    return {
      title: "Protect one salah today",
      body: "Choose the next prayer and make it unmissable. One protected salah can reset the whole day.",
      route: "PrayerTimes",
      reason: "prayer_consistency_focus",
    };
  }

  if (quranMinutes < 5 || quranProgress < 5) {
    return {
      title: "Your Quran window is open",
      body: `Open NurAI to ${quranLabel}. Keep it small, sincere, and steady.`,
      route: "Quran",
      reason: "quran_continuation",
    };
  }

  if (profile.arabicLevel !== "fluent" && arabicWords > 0) {
    return {
      title: "Your Arabic review is due",
      body: `Review ${arabicWords} Quranic word${arabicWords === 1 ? "" : "s"} while they are still fresh.`,
      route: "ArabicLearning",
      reason: "arabic_review_due",
    };
  }

  if (currentStreak > 0) {
    return {
      title: "Your Deen garden can grow today",
      body: `${currentStreak} day${currentStreak === 1 ? "" : "s"} of rhythm. One action keeps the growth alive.`,
      route: "StreakGarden",
      reason: "streak_growth",
    };
  }

  return {
    title: "NurAI has your next best step",
    body: "Start with prayer, Quran, Arabic, or reflection. One small action is enough today.",
    route: "Home",
    reason: "daily_next_best_action",
  };
}

function eveningPersonalAction(profile: NurAIUserProfileV3): {
  title: string;
  body: string;
  route: string;
  reason: string;
} {
  if (profile.privateMode?.stealthNotifications) {
    return {
      title: "A quiet check-in is ready",
      body: "Open NurAI when you are ready to close the day calmly.",
      route: "Home",
      reason: "privacy_safe_evening",
    };
  }

  const streak = profile.streakData?.currentStreak || 0;
  const strongest = profile.streakData?.strongestHabit;
  if (streak > 0) {
    return {
      title: "Close the day with one small light",
      body: `Your ${streak}-day rhythm can keep growing. Finish with ${safeLowerFirst(
        strongest && strongest !== "none" ? strongest : "dhikr or Quran",
      )}.`,
      route: "Home",
      reason: "evening_streak_protection",
    };
  }

  return {
    title: "End tonight with intention",
    body: "Take one quiet step before sleep: Isha, dhikr, Quran, or a short reflection.",
    route: "Home",
    reason: "evening_reflection",
  };
}

function weeklyPersonalAction(profile: NurAIUserProfileV3): {
  title: string;
  body: string;
  route: string;
  reason: string;
} {
  const quranPages = profile.quranReadingHabit?.totalPagesRead || 0;
  const sessions = profile.sessionData?.sessionsToday || 0;
  const focus =
    profile.prayerConsistency < 0.7
      ? "salah consistency"
      : quranPages > 0
        ? "Quran growth"
        : sessions > 0
          ? "daily rhythm"
          : "one steady habit";

  return {
    title: "Your weekly NurAI reflection is ready",
    body: `Review your week and choose a focus: ${focus}. Small consistency is how the journey becomes real.`,
    route: "Home",
    reason: "weekly_growth_summary",
  };
}

function buildAthanReminderCopy(prayerName: PrayerName): {
  title: string;
  body: string;
} {
  const label = PRAYER_LABELS[prayerName];
  const copy: Record<PrayerName, { title: string; body: string }> = {
    fajr: {
      title: "Fajr has begun",
      body: "The day is opening. May Allah place light in your morning.",
    },
    dhuhr: {
      title: "Dhuhr time",
      body: "Pause the day and return to Allah. May your prayer be accepted.",
    },
    asr: {
      title: "Asr time",
      body: "Protect this prayer and keep your day grounded.",
    },
    maghrib: {
      title: "Maghrib time",
      body: "The evening has arrived. Pray calmly and reset your heart.",
    },
    isha: {
      title: "Isha time",
      body: "Complete the day with salah. May Allah accept what you did today.",
    },
  };

  return (
    copy[prayerName] || {
      title: `${label} time`,
      body: `It is time for ${label}. May Allah accept your prayer.`,
    }
  );
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isWeb()) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowDisplayInCarPlay: false,
        allowCriticalAlerts: false,
        provideAppNotificationSettings: true,
        allowProvisional: false,
      },
    });
    finalStatus = status;
  }

  return finalStatus === "granted";
}

function expoProjectId(): string | undefined {
  const constants = Constants as any;
  return (
    constants?.expoConfig?.extra?.eas?.projectId ||
    constants?.easConfig?.projectId ||
    constants?.manifest2?.extra?.expoClient?.extra?.eas?.projectId
  );
}

async function getOrCreateSmartPushDeviceId(): Promise<string> {
  const stored = await AsyncStorage.getItem(SMART_PUSH_DEVICE_ID_STORAGE_KEY);
  if (stored) return stored;
  const id = `nurai-${Platform.OS}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  await AsyncStorage.setItem(SMART_PUSH_DEVICE_ID_STORAGE_KEY, id);
  return id;
}

export async function registerDeviceForSmartNotifications(): Promise<boolean> {
  if (isWeb()) return false;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return false;

    const projectId = expoProjectId();
    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    const expoPushToken = tokenResult.data;
    if (!expoPushToken) return false;

    const deviceId = await getOrCreateSmartPushDeviceId();
    await apiRequest("POST", "/api/notifications/push-token", {
      expoPushToken,
      deviceId,
      platform:
        Platform.OS === "ios" || Platform.OS === "android"
          ? Platform.OS
          : "unknown",
      enabled: true,
      metadata: {
        appOwnership: "nurai",
        registeredFrom: "notification_settings",
        projectIdPresent: Boolean(projectId),
      },
    });

    await AsyncStorage.setItem(SMART_PUSH_TOKEN_STORAGE_KEY, expoPushToken);
    return true;
  } catch (error) {
    console.warn(
      "[Notifications] Failed to register device for Smart NurAI push:",
      error,
    );
    return false;
  }
}

export async function disableDeviceSmartNotifications(): Promise<void> {
  if (isWeb()) return;

  try {
    const expoPushToken = await AsyncStorage.getItem(
      SMART_PUSH_TOKEN_STORAGE_KEY,
    );
    if (!expoPushToken) return;
    await apiRequest("DELETE", "/api/notifications/push-token", {
      expoPushToken,
    });
  } catch (error) {
    console.warn(
      "[Notifications] Failed to disable Smart NurAI push token:",
      error,
    );
  }
}

export async function schedulePrayerReminder(
  prayerName: PrayerName,
  prayerTime: Date,
  minutesBefore: number,
  options: { sound?: boolean | string | null; identifierSuffix?: string } = {},
): Promise<string | null> {
  if (isWeb()) return null;

  const identifier = `prayer-${prayerName}${options.identifierSuffix || ""}`;

  await cancelNotification(identifier);

  const triggerDate = new Date(prayerTime.getTime() - minutesBefore * 60000);

  if (triggerDate.getTime() <= Date.now()) return null;

  const copy = buildPrayerReminderCopy(prayerName, prayerTime, minutesBefore);
  const title = await personalizeNotificationText(copy.title);
  const body = await personalizeNotificationText(copy.body);

  const id = await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      sound: options.sound ?? true,
      data: {
        type: "prayer",
        kind: "pre_prayer",
        prayer: prayerName,
        prayerTime: prayerTime.toISOString(),
        route: "PrayerTimes",
      },
      categoryIdentifier: "prayer",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return id;
}

export async function scheduleAthanReminder(
  prayerName: PrayerName,
  prayerTime: Date,
  options: {
    sound?: boolean | string | null;
    mode?: PrayerAlertSoundMode;
    identifierSuffix?: string;
  } = {},
): Promise<string | null> {
  if (isWeb()) return null;

  const identifier = `athan-${prayerName}${options.identifierSuffix || ""}`;
  await cancelNotification(identifier);

  if (prayerTime.getTime() <= Date.now()) return null;

  const copy = buildAthanReminderCopy(prayerName);
  const id = await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: await personalizeNotificationText(copy.title),
      body: await personalizeNotificationText(copy.body),
      sound:
        options.sound ??
        notificationSoundForMode(options.mode || "default", true) ??
        true,
      data: {
        type: "prayer",
        kind: "athan",
        prayer: prayerName,
        soundMode: options.mode || "default",
        route: "PrayerTimes",
      },
      categoryIdentifier: "prayer",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: prayerTime,
    },
  });

  return id;
}

export async function schedulePrayerSnoozeReminder(
  prayerName: PrayerName,
  prayerTime: Date,
  minutesFromNow = 10,
): Promise<string | null> {
  if (isWeb()) return null;

  const label = PRAYER_LABELS[prayerName];
  const identifier = `prayer-snooze-${prayerName}`;
  const triggerDate = new Date(Date.now() + minutesFromNow * 60000);
  if (triggerDate.getTime() >= prayerTime.getTime()) return null;

  await cancelNotification(identifier);

  return Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: await personalizeNotificationText(`${label} reminder`),
      body: await personalizeNotificationText(
        `${label} is still approaching. Take a moment to prepare calmly before ${formatPrayerClockTime(
          prayerTime,
        )}.`,
      ),
      sound: true,
      data: {
        type: "prayer",
        kind: "pre_prayer_snooze",
        prayer: prayerName,
        prayerTime: prayerTime.toISOString(),
        route: "PrayerTimes",
      },
      categoryIdentifier: "prayer",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function cancelAllPrayerReminders(): Promise<void> {
  if (isWeb()) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const prayerNotifications = scheduled.filter((n: any) =>
    PRAYER_NAMES.some((name) => {
      const id = String(n.identifier || "");
      return (
        id === `prayer-${name}` ||
        id === `athan-${name}` ||
        id === `prayer-snooze-${name}` ||
        id.startsWith(`prayer-${name}-`) ||
        id.startsWith(`athan-${name}-`)
      );
    }),
  );

  for (const notification of prayerNotifications) {
    await Notifications.cancelScheduledNotificationAsync(
      notification.identifier,
    );
  }
}

export async function scheduleDailyReminder(
  id: string,
  title: string,
  body: string,
  hour: number,
  minute: number,
  options: {
    data?: Record<string, unknown>;
    sound?: boolean | string | null;
  } = {},
): Promise<string | null> {
  if (isWeb()) return null;

  await cancelNotification(id);

  const personalizedTitle = await personalizeNotificationText(title);
  const personalizedBody = await personalizeNotificationText(body);

  const notificationId = await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: personalizedTitle,
      body: personalizedBody,
      sound: options.sound ?? true,
      data: { type: inferReminderNotificationType(id), ...options.data },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return notificationId;
}

export async function scheduleWeeklyReminder(
  id: string,
  title: string,
  body: string,
  weekday: number,
  hour: number,
  minute: number,
  options: {
    data?: Record<string, unknown>;
    sound?: boolean | string | null;
  } = {},
): Promise<string | null> {
  if (isWeb()) return null;

  await cancelNotification(id);

  const personalizedTitle = await personalizeNotificationText(title);
  const personalizedBody = await personalizeNotificationText(body);

  const notificationId = await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: personalizedTitle,
      body: personalizedBody,
      sound: options.sound ?? true,
      data: { type: inferReminderNotificationType(id), ...options.data },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute,
    },
  });

  return notificationId;
}

export async function cancelNotification(id: string): Promise<void> {
  if (isWeb()) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}

export async function cancelCategoryNotifications(
  category: ReminderCategory,
): Promise<void> {
  if (isWeb()) return;

  const identifiers = REMINDER_IDENTIFIERS[category];
  if (!identifiers) return;

  for (const id of identifiers) {
    await cancelNotification(id);
  }

  if (category === "seasonal") {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const seasonal = scheduled.filter((notification) =>
      String(notification.identifier || "").startsWith("reminder-seasonal-"),
    );
    for (const notification of seasonal) {
      await cancelNotification(notification.identifier);
    }
  }
}

async function scheduleCategoryNotifications(
  category: ReminderCategory,
): Promise<void> {
  if (isWeb()) return;

  await cancelCategoryNotifications(category);

  switch (category) {
    case "quran_goal":
      await scheduleDailyReminder(
        "reminder-quran_goal",
        "{name}, your Quran window is open",
        "Read even one ayah today. NurAI will keep your place and help you understand what you read.",
        20,
        0,
      );
      break;

    case "daily_goal":
      await scheduleDailyReminder(
        "reminder-daily-goal",
        "Choose today's light",
        "Pick one small step: prayer, Quran, Arabic, charity, or reflection. Your Daily Deen path is ready.",
        9,
        0,
      );
      break;

    case "dhikr":
      await scheduleDailyReminder(
        "reminder-dhikr-morning",
        "Begin with remembrance",
        "Your morning dhikr is ready. A few quiet minutes can change the tone of the whole day.",
        7,
        0,
      );
      await scheduleDailyReminder(
        "reminder-dhikr-evening",
        "Evening protection",
        "Read your evening dhikr and close the day with a calmer heart.",
        18,
        0,
      );
      break;

    case "friday_kahf":
      await scheduleWeeklyReminder(
        "reminder-friday_kahf",
        "Friday light: Surah Al-Kahf",
        "Open NurAI and continue Al-Kahf. Read slowly, even if you only complete part of it today.",
        6,
        9,
        0,
      );
      break;

    case "tahajjud":
      await scheduleDailyReminder(
        "reminder-tahajjud",
        "A quiet door is open",
        "If you are awake, take a few moments for dua, wudu, or two rak'ahs before Fajr.",
        4,
        30,
      );
      break;

    case "wake":
      await scheduleWakeReminders();
      break;

    case "travel":
      await scheduleDailyReminder(
        "reminder-travel-dua",
        "Before Travel",
        "If you are heading out, read the travel dua, check prayer times, and plan wudu calmly.",
        7,
        15,
      );
      break;

    case "health":
      await scheduleWeeklyReminder(
        "reminder-health",
        "Your private wellbeing check-in is ready",
        "Open NurAI when you have a quiet moment.",
        1,
        19,
        0,
      );
      break;

    case "adhkar":
      await scheduleDailyReminder(
        "reminder-adhkar-morning",
        "Morning adhkar is ready",
        "Protect your morning with remembrance after Fajr. Open NurAI when you have a quiet moment.",
        6,
        30,
      );
      await scheduleDailyReminder(
        "reminder-adhkar-evening",
        "Evening adhkar is ready",
        "Before the evening gets busy, take a few minutes for remembrance and protection.",
        17,
        30,
      );
      break;

    case "fasting":
      await scheduleFastingReminders();
      break;

    case "seasonal":
      await scheduleSeasonalReminders();
      break;

    case "smart_nurai":
      await scheduleSmartNuraiReminders();
      break;
  }
}

export async function resyncAllScheduledNotifications(
  settings: NotificationSettings,
  options: { isPaidUser?: boolean } = {},
): Promise<void> {
  if (isWeb()) return;
  if (!settings.permissionGranted) return;

  const categoryMap: {
    key: keyof NotificationSettings;
    category: ReminderCategory;
  }[] = [
    { key: "readingReminder", category: "quran_goal" },
    { key: "dailyGoalReminder", category: "daily_goal" },
    { key: "dhikrReminder", category: "dhikr" },
    { key: "fridayKahf", category: "friday_kahf" },
    { key: "tahajjudReminder", category: "tahajjud" },
    { key: "wakeReminder", category: "wake" },
    { key: "travelReminder", category: "travel" },
    { key: "healthReminder", category: "health" },
    { key: "adhkarReminder", category: "adhkar" },
    { key: "fastingReminder", category: "fasting" },
    { key: "seasonalReminders", category: "seasonal" },
  ];

  for (const { key, category } of categoryMap) {
    if (settings[key]) {
      await scheduleCategoryNotifications(category);
    } else {
      await cancelCategoryNotifications(category);
    }
  }

  if (settings.smartNuraiReminders && options.isPaidUser) {
    await scheduleCategoryNotifications("smart_nurai");
    await registerDeviceForSmartNotifications();
  } else {
    await cancelCategoryNotifications("smart_nurai");
    await disableDeviceSmartNotifications();
  }
}

async function scheduleWakeReminders(): Promise<void> {
  if (isWeb()) return;

  await cancelCategoryNotifications("wake");

  try {
    const loc = await getUserLocationForNotifications();
    if (!loc) return;

    const coordinates = new Coordinates(loc.latitude, loc.longitude);
    const params = getCalculationMethod(loc.calculationMethod, {
      countryName: loc.countryName,
      latitude: loc.latitude,
    });
    const now = new Date();

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const day = new Date(now);
      day.setDate(day.getDate() + dayOffset);
      const prayerTimes = new PrayerTimes(coordinates, day, params);
      const wakeTime = new Date(prayerTimes.fajr.getTime() - 35 * 60000);

      if (wakeTime.getTime() <= Date.now()) continue;

      await Notifications.scheduleNotificationAsync({
        identifier: `reminder-wake-fajr-${dayOffset}`,
        content: {
          title: await personalizeNotificationText("Wake for Fajr"),
          body: await personalizeNotificationText(
            "A calm wake-up window is starting. Prepare for wudu and Fajr without rushing.",
          ),
          sound: true,
          data: { type: "prayer" },
          categoryIdentifier: "reminders",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: wakeTime,
        },
      });
    }
  } catch (e) {
    console.warn("[Notifications] Failed to schedule wake reminders:", e);
  }
}

async function getUserLocationForNotifications(): Promise<{
  latitude: number;
  longitude: number;
  calculationMethod: string;
  countryName?: string;
} | null> {
  try {
    const raw = await AsyncStorage.getItem("user_location");
    if (raw) {
      const loc = JSON.parse(raw);
      return {
        latitude: loc.latitude || 51.5074,
        longitude: loc.longitude || -0.1278,
        calculationMethod: loc.calculationMethod || "MuslimWorldLeague",
        countryName: loc.countryName,
      };
    }
  } catch {}
  return {
    latitude: 51.5074,
    longitude: -0.1278,
    calculationMethod: "MuslimWorldLeague",
    countryName: "United Kingdom",
  };
}

async function scheduleFastingReminders(): Promise<void> {
  if (isWeb()) return;

  await cancelCategoryNotifications("fasting");

  try {
    const loc = await getUserLocationForNotifications();
    if (!loc) return;

    const coordinates = new Coordinates(loc.latitude, loc.longitude);
    const params = getCalculationMethod(loc.calculationMethod, {
      countryName: loc.countryName,
      latitude: loc.latitude,
    });
    const now = new Date();

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const day = new Date(now);
      day.setDate(day.getDate() + dayOffset);
      const prayerTimes = new PrayerTimes(coordinates, day, params);

      const suhoorTime = new Date(prayerTimes.fajr.getTime() - 30 * 60000);
      if (suhoorTime.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          identifier: `reminder-fasting-suhoor-${dayOffset}`,
          content: {
            title: await personalizeNotificationText("Suhoor window"),
            body: await personalizeNotificationText(
              "Fajr is approaching. Eat, hydrate, and make intention calmly before the fast begins.",
            ),
            sound: true,
            data: { type: "fasting" },
            categoryIdentifier: "reminders",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: suhoorTime,
          },
        });
      }

      const iftarTime = new Date(prayerTimes.maghrib.getTime() - 15 * 60000);
      if (iftarTime.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          identifier: `reminder-fasting-iftar-${dayOffset}`,
          content: {
            title: await personalizeNotificationText("Iftar is close"),
            body: await personalizeNotificationText(
              "Maghrib is approaching. Prepare your dua and break your fast without rushing.",
            ),
            sound: true,
            data: { type: "fasting" },
            categoryIdentifier: "reminders",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: iftarTime,
          },
        });
      }
    }
  } catch (e) {
    console.warn("[Notifications] Failed to schedule fasting reminders:", e);
  }
}

async function scheduleSeasonalReminders(): Promise<void> {
  if (isWeb()) return;

  await cancelCategoryNotifications("seasonal");

  try {
    const adjustment = await loadHijriAdjustment();
    const now = new Date();
    let ramadanDailyCount = 0;

    for (let dayOffset = 0; dayOffset <= 45; dayOffset += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() + dayOffset);
      date.setHours(8, 0, 0, 0);
      if (date.getTime() <= now.getTime()) continue;

      const hijri = getHijriDate(date, adjustment);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      let message: { title: string; body: string; event: string } | null = null;

      if (hijri.month === 9 && ramadanDailyCount < 7) {
        ramadanDailyCount += 1;
        message = {
          title: hijri.day === 1 ? "Ramadan may begin today" : "Ramadan focus",
          body: "Choose one steady act today: Quran, charity, dua or patient speech. This is a calculated Hijri date and may vary by local sighting.",
          event: "ramadan",
        };
      } else if (hijri.month === 10 && hijri.day === 1) {
        message = {
          title: "Eid al-Fitr may be today",
          body: "Prepare for Eid prayer, family and gratitude. Confirm the date with your local community because moon sighting may vary.",
          event: "eid-fitr",
        };
      } else if (hijri.month === 12 && hijri.day === 1) {
        message = {
          title: "The blessed days may begin today",
          body: "Begin Dhul Hijjah with one clear intention. This calculated date may vary by local moon sighting.",
          event: "dhul-hijjah",
        };
      } else if (hijri.month === 12 && hijri.day === 9) {
        message = {
          title: "The Day of Arafah may be today",
          body: "Make space for dua and remembrance, and confirm the date locally before acting on time-sensitive guidance.",
          event: "arafah",
        };
      } else if (hijri.month === 12 && hijri.day === 10) {
        message = {
          title: "Eid al-Adha may be today",
          body: "Prepare for Eid prayer, family and sharing. Confirm the date with your local community because moon sighting may vary.",
          event: "eid-adha",
        };
      }

      if (!message) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `reminder-seasonal-${message.event}-${dateKey}`,
        content: {
          title: await personalizeNotificationText(message.title),
          body: await personalizeNotificationText(message.body),
          sound: true,
          data: {
            type: "system",
            kind: "seasonal",
            route: "IslamicCalendar",
            calculatedHijriDate: true,
          },
          categoryIdentifier: "reminders",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
    }
  } catch (e) {
    console.warn("[Notifications] Failed to schedule seasonal reminders:", e);
  }
}

async function scheduleSmartNuraiReminders(): Promise<void> {
  if (isWeb()) return;

  await cancelCategoryNotifications("smart_nurai");

  try {
    const profile = await loadProfileV3();
    const morning = strongestPersonalAction(profile);
    const evening = eveningPersonalAction(profile);
    const weekly = weeklyPersonalAction(profile);
    const optimalHour =
      profile.notificationData?.fatigueLevel === "tired"
        ? 10
        : Math.min(21, Math.max(7, profile.notificationData?.optimalHour || 9));

    await scheduleDailyReminder(
      "reminder-smart-nurai-morning",
      morning.title,
      morning.body,
      optimalHour,
      20,
      {
        data: {
          type: "update",
          kind: "smart_nurai",
          route: morning.route,
          reason: morning.reason,
          localEngine: true,
        },
      },
    );

    await scheduleDailyReminder(
      "reminder-smart-nurai-evening",
      evening.title,
      evening.body,
      20,
      45,
      {
        data: {
          type: "update",
          kind: "smart_nurai",
          route: evening.route,
          reason: evening.reason,
          localEngine: true,
        },
      },
    );

    await scheduleWeeklyReminder(
      "reminder-smart-nurai-weekly",
      weekly.title,
      weekly.body,
      1,
      18,
      30,
      {
        data: {
          type: "update",
          kind: "smart_nurai",
          route: weekly.route,
          reason: weekly.reason,
          localEngine: true,
        },
      },
    );
  } catch (e) {
    console.warn(
      "[Notifications] Failed to schedule smart NurAI reminders:",
      e,
    );
  }
}

export async function getScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  if (isWeb()) return [];

  return Notifications.getAllScheduledNotificationsAsync();
}

export async function setupNotificationCategories(): Promise<void> {
  if (isWeb()) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("prayer", {
      name: "Prayer Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("prayer-athan", {
      name: "Prayer Time Athan",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 350, 180, 350],
      sound: "athan-alert.wav",
    });

    await Notifications.setNotificationChannelAsync("prayer-takbir", {
      name: "Prayer Time Takbir",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 120, 250],
      sound: "takbir-alert.wav",
    });

    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Daily Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  }

  await Notifications.setNotificationCategoryAsync("prayer", [
    {
      identifier: "mark_prayed",
      buttonTitle: "Mark prayed",
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: "snooze_prayer_10",
      buttonTitle: "Remind in 10",
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: "open_prayer",
      buttonTitle: "Open NurAI",
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: "dismiss",
      buttonTitle: "Dismiss",
    },
  ]);
}
