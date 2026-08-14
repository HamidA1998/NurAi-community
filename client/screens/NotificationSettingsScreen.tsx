import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  Platform,
  Linking,
  AppState,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import {
  requestNotificationPermission,
  resyncAllScheduledNotifications,
} from "@/lib/notifications";
import {
  PRAYER_ALERT_SOUND_LABELS,
  type PrayerAlertSoundMode,
} from "@/lib/prayer-alert-sounds";
import { syncedSetItem } from "@/lib/progress-sync";
import { apiRequest } from "@/lib/query-client";
import {
  athanAlarmSupported,
  ensureAthanAlarmAuthorization,
  getAthanAlarmHealth,
  getAthanAlarmAuthorizationStatus,
  isAthanAlarmModuleUsable,
  isAthanAlarmEnabled,
  refreshAthanAlarmHealth,
  requestAthanScheduleRefresh,
  scheduleAthanTestAlarm,
  setAthanAlarmEnabled,
  type AthanAlarmHealth,
  type AthanAuthorizationStatus,
} from "@/lib/athan-alarm";
import { getUsableAthanVoice } from "@/lib/athan-reciter-catalog";
import { useSubscription } from "@/context/SubscriptionContext";
import {
  Aurora,
  NuraiBottomSheet,
  NuraiGlass,
  NuraiSegmentedControl,
} from "@/design-system";
import { AthanSoundStudio } from "@/components/notifications/AthanSoundStudio";
import { AppIcon, type AppIconName } from "@/components/icons";

interface NotificationSettings {
  permissionGranted: boolean;
  prayerReminders: {
    fajr: { enabled: boolean; minutesBefore: number };
    dhuhr: { enabled: boolean; minutesBefore: number };
    asr: { enabled: boolean; minutesBefore: number };
    maghrib: { enabled: boolean; minutesBefore: number };
    isha: { enabled: boolean; minutesBefore: number };
  };
  athanReminders?: {
    fajr: { enabled: boolean };
    dhuhr: { enabled: boolean };
    asr: { enabled: boolean };
    maghrib: { enabled: boolean };
    isha: { enabled: boolean };
  };
  prayerTimeAlerts: Record<
    "fajr" | "dhuhr" | "asr" | "maghrib" | "isha",
    { mode: PrayerAlertSoundMode }
  >;
  fastingReminder: boolean;
  readingReminder: boolean;
  dailyGoalReminder: boolean;
  dhikrReminder: boolean;
  healthReminder: boolean;
  fridayKahf: boolean;
  tahajjudReminder: boolean;
  wakeReminder: boolean;
  travelReminder: boolean;
  adhkarReminder: boolean;
  seasonalReminders: boolean;
  smartNuraiReminders: boolean;
  sound: boolean;
  vibration: boolean;
  quietHours: { enabled: boolean; start: number; end: number };
}

type PrayerReminderKey = keyof NotificationSettings["prayerReminders"];

const STORAGE_KEY = "notification_settings";

const MINUTES_OPTIONS = [5, 10, 15, 30];
const PRAYER_ALERT_MODE_OPTIONS: PrayerAlertSoundMode[] = [
  "none",
  "default",
  "athan",
  "takbir",
];
const PRAYER_ALERT_PRESETS: {
  mode: PrayerAlertSoundMode;
  label: string;
  icon: AppIconName;
}[] = [
  { mode: "none", label: "Silent all", icon: "volume-x" },
  { mode: "default", label: "Standard all", icon: "bell" },
  { mode: "athan", label: "Athan all", icon: "volume-2" },
  { mode: "takbir", label: "Takbir all", icon: "radio" },
];

const SMART_PREVIEW_OPTIONS = [
  { id: "daily_deen", label: "Morning" },
  { id: "evening_reflection", label: "Evening" },
  { id: "weekly_growth", label: "Weekly" },
] as const;

type SmartPreviewKind = (typeof SMART_PREVIEW_OPTIONS)[number]["id"];
type SmartPreviewMessage = {
  title: string;
  body: string;
  generatedBy?: "openai" | "local_engine";
};

const DEFAULT_SETTINGS: NotificationSettings = {
  permissionGranted: false,
  prayerReminders: {
    fajr: { enabled: true, minutesBefore: 15 },
    dhuhr: { enabled: true, minutesBefore: 15 },
    asr: { enabled: true, minutesBefore: 15 },
    maghrib: { enabled: true, minutesBefore: 15 },
    isha: { enabled: true, minutesBefore: 15 },
  },
  prayerTimeAlerts: {
    fajr: { mode: "none" },
    dhuhr: { mode: "none" },
    asr: { mode: "none" },
    maghrib: { mode: "none" },
    isha: { mode: "none" },
  },
  fastingReminder: false,
  readingReminder: false,
  dailyGoalReminder: true,
  dhikrReminder: false,
  healthReminder: false,
  fridayKahf: true,
  tahajjudReminder: false,
  wakeReminder: false,
  travelReminder: false,
  adhkarReminder: true,
  seasonalReminders: true,
  smartNuraiReminders: true,
  sound: true,
  vibration: true,
  quietHours: { enabled: false, start: 22, end: 6 },
};

function normalizeSettings(
  stored?: Partial<NotificationSettings> | null,
): NotificationSettings {
  const migratedPrayerTimeAlerts = {
    ...DEFAULT_SETTINGS.prayerTimeAlerts,
    ...(stored?.prayerTimeAlerts || {}),
  };
  if (!stored?.prayerTimeAlerts && stored?.athanReminders) {
    for (const prayer of Object.keys(
      stored.athanReminders,
    ) as (keyof typeof migratedPrayerTimeAlerts)[]) {
      migratedPrayerTimeAlerts[prayer] = {
        mode: stored.athanReminders?.[prayer]?.enabled ? "default" : "none",
      };
    }
  }

  return {
    ...DEFAULT_SETTINGS,
    ...(stored || {}),
    prayerReminders: {
      ...DEFAULT_SETTINGS.prayerReminders,
      ...(stored?.prayerReminders || {}),
    },
    prayerTimeAlerts: migratedPrayerTimeAlerts,
    quietHours: {
      ...DEFAULT_SETTINGS.quietHours,
      ...(stored?.quietHours || {}),
    },
  };
}

const PRAYER_KEYS: PrayerReminderKey[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

const PRAYER_LABELS: Record<
  PrayerReminderKey,
  { label: string; icon: AppIconName }
> = {
  fajr: { label: "Fajr", icon: "sunrise" },
  dhuhr: { label: "Dhuhr", icon: "sun" },
  asr: { label: "Asr", icon: "cloud" },
  maghrib: { label: "Maghrib", icon: "sunset" },
  isha: { label: "Isha", icon: "moon" },
};

interface SettingItemProps {
  icon: AppIconName;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  theme: any;
  index: number;
  testID?: string;
}

function SettingItem({
  icon,
  title,
  subtitle,
  rightElement,
  onPress,
  theme,
  index,
  testID,
}: SettingItemProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
      <Pressable
        style={({ pressed }) => [
          styles.settingItem,
          {
            backgroundColor: theme.surfaceGlass,
            borderColor: theme.borderSubtle,
          },
          pressed && onPress && { opacity: 0.8 },
        ]}
        onPress={onPress}
        disabled={!onPress && !rightElement}
        testID={testID}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${theme.primary}15` },
          ]}
        >
          <AppIcon name={icon} size={20} color={theme.primary} />
        </View>
        <View style={styles.settingContent}>
          <ThemedText style={styles.settingTitle}>{title}</ThemedText>
          {subtitle ? (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {rightElement}
        {onPress && !rightElement ? (
          <AppIcon name="chevron-right" size={20} color={theme.textSecondary} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function SectionHeader({ title, theme }: { title: string; theme: any }) {
  return (
    <ThemedText
      type="small"
      style={[styles.sectionHeader, { color: theme.textSecondary }]}
    >
      {title}
    </ThemedText>
  );
}

function PrayerAlertModeItem({
  prayer,
  mode,
  theme,
  index,
  onOpen,
}: {
  prayer: PrayerReminderKey;
  mode: PrayerAlertSoundMode;
  theme: any;
  index: number;
  onOpen: () => void;
}) {
  const label = PRAYER_LABELS[prayer];
  const summary =
    mode === "none"
      ? "No sound at prayer time"
      : `${PRAYER_ALERT_SOUND_LABELS[mode]} at prayer time`;

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${label.label} prayer-time sound. ${summary}`}
        accessibilityHint="Opens sound choices"
        style={[
          styles.prayerAlertModeCard,
          {
            backgroundColor: theme.surfaceGlass,
            borderColor: theme.borderSubtle,
          },
        ]}
        testID={`toggle-athan-${prayer}`}
      >
        <View style={styles.prayerAlertModeHeader}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${theme.primary}15` },
            ]}
          >
            <AppIcon name={label.icon} size={20} color={theme.primary} />
          </View>
          <View style={styles.settingContent}>
            <ThemedText style={styles.settingTitle} numberOfLines={1}>
              {label.label}
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary }}
              numberOfLines={2}
            >
              {summary}
            </ThemedText>
          </View>
          <View
            style={[
              styles.prayerAlertSelection,
              {
                backgroundColor: `${theme.scholar}12`,
                borderColor: `${theme.scholar}32`,
              },
            ]}
          >
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{ color: theme.scholar, fontWeight: "800" }}
            >
              {PRAYER_ALERT_SOUND_LABELS[mode]}
            </ThemedText>
            <AppIcon name="chevron-right" size={14} color={theme.scholar} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function MinutesSelector({
  value,
  onChange,
  theme,
  testID,
}: {
  value: number;
  onChange: (v: number) => void;
  theme: any;
  testID?: string;
}) {
  return (
    <View style={styles.minutesRow}>
      {MINUTES_OPTIONS.map((min) => {
        const isActive = value === min;
        return (
          <Pressable
            key={min}
            testID={`${testID}-${min}`}
            style={[
              styles.minuteChip,
              {
                backgroundColor: isActive
                  ? theme.primary
                  : theme.backgroundSecondary,
              },
            ]}
            onPress={() => onChange(min)}
          >
            <ThemedText
              type="caption"
              style={{
                color: isActive ? "#FFFFFF" : theme.textSecondary,
                fontWeight: isActive ? "600" : "400",
              }}
            >
              {min}m
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
}

export default function NotificationSettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { currentPlan, isPremium, isScholar } = useSubscription();
  const canUseSmartNurai = isPremium || isScholar;
  const [settings, setSettings] =
    useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permissionStatus, setPermissionStatus] =
    useState<string>("undetermined");
  const [athanAlarmOn, setAthanAlarmOn] = useState(false);
  const [athanAlarmAvailable, setAthanAlarmAvailable] = useState(
    athanAlarmSupported(),
  );
  const [athanAuthorization, setAthanAuthorization] =
    useState<AthanAuthorizationStatus>("notDetermined");
  const [deliveryHealth, setDeliveryHealth] = useState<AthanAlarmHealth | null>(
    null,
  );
  const [deliveryAction, setDeliveryAction] = useState("");
  const [deliveryActionLoading, setDeliveryActionLoading] = useState(false);
  const [soundPickerPrayer, setSoundPickerPrayer] =
    useState<PrayerReminderKey | null>(null);
  const [smartPreviewKind, setSmartPreviewKind] =
    useState<SmartPreviewKind>("daily_deen");
  const [smartPreview, setSmartPreview] = useState<SmartPreviewMessage | null>(
    null,
  );
  const [smartPreviewLoading, setSmartPreviewLoading] = useState(false);
  const [smartPreviewError, setSmartPreviewError] = useState("");

  const refreshDeliveryHealth = useCallback(async () => {
    const health = await refreshAthanAlarmHealth();
    setDeliveryHealth(health);
    return health;
  }, []);

  useEffect(() => {
    void isAthanAlarmModuleUsable().then(setAthanAlarmAvailable);
    void isAthanAlarmEnabled().then(setAthanAlarmOn);
    setAthanAuthorization(getAthanAlarmAuthorizationStatus());
    void getAthanAlarmHealth().then(setDeliveryHealth);
  }, []);

  const toggleAthanAlarm = useCallback(async (value: boolean) => {
    if (value) {
      const status = await ensureAthanAlarmAuthorization();
      setAthanAuthorization(status);
      const authorized = status === "authorized";
      setAthanAlarmOn(authorized);
      await setAthanAlarmEnabled(authorized);
      setDeliveryAction(
        authorized
          ? "Your prayer schedule is being refreshed."
          : "Full Athan permission was not granted. Standard reminders remain available.",
      );
      return;
    }
    setAthanAlarmOn(false);
    await setAthanAlarmEnabled(false);
    setDeliveryHealth(await getAthanAlarmHealth());
    setDeliveryAction(
      "Full Athan is off. Standard reminders can still be used.",
    );
  }, []);

  const enableFullAthan = useCallback(async () => {
    if (athanAuthorization === "denied") {
      await Linking.openSettings();
      return;
    }
    await toggleAthanAlarm(true);
  }, [athanAuthorization, toggleAthanAlarm]);

  const loadSettings = useCallback(async (): Promise<NotificationSettings> => {
    let loadedSettings = DEFAULT_SETTINGS;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        loadedSettings = normalizeSettings(parsed);
        setSettings(loadedSettings);
        if (loadedSettings.permissionGranted) {
          await resyncAllScheduledNotifications(loadedSettings, {
            isPaidUser: canUseSmartNurai,
          });
        }
      }
    } catch {}
    return loadedSettings;
  }, [canUseSmartNurai]);

  const saveSettings = useCallback(
    async (newSettings: NotificationSettings) => {
      setSettings(newSettings);
      try {
        await syncedSetItem(STORAGE_KEY, JSON.stringify(newSettings));
        if (newSettings.permissionGranted) {
          await resyncAllScheduledNotifications(newSettings, {
            isPaidUser: canUseSmartNurai,
          });
        }
      } catch {
      } finally {
        requestAthanScheduleRefresh();
      }
    },
    [canUseSmartNurai],
  );

  const checkPermission = useCallback(
    async (baseSettings: NotificationSettings) => {
      if (Platform.OS === "web") {
        setPermissionStatus("unavailable");
        return;
      }
      try {
        const { status } = await Notifications.getPermissionsAsync();
        setPermissionStatus(status);
        if (status === "granted") {
          saveSettings({ ...baseSettings, permissionGranted: true });
        }
      } catch {
        setPermissionStatus("unavailable");
      }
    },
    [saveSettings],
  );

  useEffect(() => {
    const init = async () => {
      const loadedSettings = await loadSettings();
      await checkPermission(loadedSettings);
    };
    init();
  }, [checkPermission, loadSettings]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || Platform.OS === "web") return;
      void Notifications.getPermissionsAsync()
        .then(({ status }) => {
          setPermissionStatus(status);
          const granted = status === "granted";
          if (granted !== settings.permissionGranted) {
            void saveSettings({ ...settings, permissionGranted: granted });
          }
        })
        .catch(() => setPermissionStatus("unavailable"));
      setAthanAuthorization(getAthanAlarmAuthorizationStatus());
      void refreshDeliveryHealth();
    });
    return () => subscription.remove();
  }, [refreshDeliveryHealth, saveSettings, settings]);

  const handleRefreshDelivery = useCallback(async () => {
    setDeliveryActionLoading(true);
    setDeliveryAction("Refreshing your prayer schedule…");
    requestAthanScheduleRefresh();
    // The native alarm bridge reconciles asynchronously. Give it one short
    // beat before reading the refreshed state back to the user.
    await new Promise((resolve) => setTimeout(resolve, 850));
    const health = await refreshDeliveryHealth();
    setDeliveryAction(
      health.systemScheduled > 0
        ? "Your prayer alerts are ready."
        : "Your prayer alerts are still being prepared.",
    );
    setDeliveryActionLoading(false);
  }, [refreshDeliveryHealth]);

  const handleTestAthanAlarm = useCallback(async () => {
    setDeliveryActionLoading(true);
    setDeliveryAction("Preparing a one-minute Athan preview…");
    const voice = await getUsableAthanVoice(currentPlan);
    const scheduled = await scheduleAthanTestAlarm(voice.soundName, 60);
    await refreshDeliveryHealth();
    setDeliveryAction(
      scheduled
        ? `A preview alert will arrive in one minute using ${voice.name}.`
        : "The preview could not be scheduled. Check your prayer alert permission in Settings.",
    );
    setDeliveryActionLoading(false);
  }, [currentPlan, refreshDeliveryHealth]);

  const handleRequestPermission = async () => {
    if (permissionStatus === "denied") {
      await Linking.openSettings();
      return;
    }
    const granted = await requestNotificationPermission();
    setPermissionStatus(granted ? "granted" : "denied");
    saveSettings({ ...settings, permissionGranted: granted });
  };

  const handleSmartPreview = useCallback(async () => {
    if (!canUseSmartNurai) {
      navigation.navigate("Subscription", {
        featureLabel: "Smart NurAI Guidance",
      });
      return;
    }
    setSmartPreviewLoading(true);
    setSmartPreviewError("");
    try {
      const response = await apiRequest(
        "GET",
        `/api/notifications/smart/preview?kind=${smartPreviewKind}`,
      );
      const payload = (await response.json()) as {
        message?: SmartPreviewMessage;
      };
      if (!payload.message?.title || !payload.message?.body) {
        throw new Error("invalid_smart_preview");
      }
      setSmartPreview(payload.message);
    } catch {
      setSmartPreview(null);
      setSmartPreviewError(
        "Your preview could not be prepared. Your saved reminder settings are unchanged.",
      );
    } finally {
      setSmartPreviewLoading(false);
    }
  }, [canUseSmartNurai, navigation, smartPreviewKind]);

  const updatePrayerReminder = (
    prayer: keyof NotificationSettings["prayerReminders"],
    field: "enabled" | "minutesBefore",
    value: boolean | number,
  ) => {
    const updated = {
      ...settings,
      prayerReminders: {
        ...settings.prayerReminders,
        [prayer]: {
          ...settings.prayerReminders[prayer],
          [field]: value,
        },
      },
    };
    saveSettings(updated);
  };

  const updatePrayerTimeAlert = (
    prayer: keyof NotificationSettings["prayerTimeAlerts"],
    mode: PrayerAlertSoundMode,
  ) => {
    saveSettings({
      ...settings,
      prayerTimeAlerts: {
        ...settings.prayerTimeAlerts,
        [prayer]: { mode },
      },
    });
  };

  const updateAllPrayerTimeAlerts = (mode: PrayerAlertSoundMode) => {
    const nextAlerts = Object.keys(settings.prayerTimeAlerts).reduce(
      (acc, prayer) => ({
        ...acc,
        [prayer]: { mode },
      }),
      {} as NotificationSettings["prayerTimeAlerts"],
    );
    saveSettings({
      ...settings,
      prayerTimeAlerts: nextAlerts,
    });
  };

  const updateField = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => {
    saveSettings({ ...settings, [key]: value });
  };

  const cycleQuietHour = (field: "start" | "end") => {
    const current = settings.quietHours[field];
    const next = (current + 1) % 24;
    saveSettings({
      ...settings,
      quietHours: { ...settings.quietHours, [field]: next },
    });
  };

  const enabledSoundCount = Object.values(settings.prayerTimeAlerts).filter(
    (reminder) => reminder.mode !== "none",
  ).length;
  const deliveryStatusLabel = !athanAlarmAvailable
    ? "Standard alerts available"
    : deliveryHealth?.status === "scheduled"
      ? "Full Athan ready"
      : deliveryHealth?.status === "partial"
        ? "Some Athan alerts need attention"
        : deliveryHealth?.status === "idle"
          ? "Choose Athan for a prayer"
          : deliveryHealth?.status === "permission_required"
            ? "Permission needed"
            : deliveryHealth?.status === "failed"
              ? "Standard alerts are available"
              : athanAlarmOn
                ? "Preparing your Athan"
                : "Full Athan is off";
  const deliveryStatusColor =
    deliveryHealth?.status === "scheduled"
      ? theme.success
      : deliveryHealth?.status === "permission_required" ||
          deliveryHealth?.status === "failed"
        ? theme.warning
        : theme.primary;
  const deliveryStatusDetail = !athanAlarmAvailable
    ? "This device uses a standard notification sound for prayer-time alerts."
    : deliveryHealth?.status === "scheduled"
      ? "Your selected prayers will use your chosen Athan at prayer time."
      : deliveryHealth?.status === "partial"
        ? "Full Athan is ready for some prayer times; standard alerts cover the rest."
        : deliveryHealth?.status === "idle"
          ? "Choose Athan for at least one prayer below to use your selected voice."
          : deliveryHealth?.status === "permission_required"
            ? "Allow Full Athan so NurAI can play your selected voice at prayer time, even when Silent Mode or Focus is on."
            : deliveryHealth?.status === "failed"
              ? "Standard alerts remain available while NurAI reconnects Full Athan."
              : athanAlarmOn
                ? "NurAI is preparing your Full Athan schedule…"
                : "Turn on Full Athan to hear your chosen voice at prayer time.";

  let itemIndex = 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Aurora />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h4">Reminders & alerts</ThemedText>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.cleanIntro,
            {
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View
            style={[
              styles.cleanIntroIcon,
              { backgroundColor: theme.primaryMuted },
            ]}
          >
            <AppIcon name="bell" size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText type="small" style={{ fontWeight: "700" }}>
              {permissionStatus === "granted"
                ? "Prayer alerts are ready"
                : "Prayer alerts need permission"}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Your schedule, sound, and quiet hours in one place
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="NOTIFICATIONS" theme={theme} />
          <SettingItem
            icon="shield"
            title="Phone notifications"
            subtitle={
              permissionStatus === "granted"
                ? "Notifications are enabled"
                : permissionStatus === "unavailable"
                  ? "Not available on this device"
                  : "Allow reminders for prayer and daily practice"
            }
            theme={theme}
            index={itemIndex++}
            testID="setting-permission"
            rightElement={
              permissionStatus === "granted" ? (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${theme.success}20` },
                  ]}
                >
                  <AppIcon name="check" size={14} color={theme.success} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.success, fontWeight: "600" }}
                  >
                    Enabled
                  </ThemedText>
                </View>
              ) : permissionStatus !== "unavailable" ? (
                <Pressable
                  style={[
                    styles.enableButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleRequestPermission}
                  testID="button-request-permission"
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.buttonText, fontWeight: "600" }}
                  >
                    {permissionStatus === "denied" ? "Open Settings" : "Enable"}
                  </ThemedText>
                </Pressable>
              ) : null
            }
          />
        </View>

        <View style={styles.section}>
          <AthanSoundStudio
            currentPlan={currentPlan}
            onUpgrade={(minimumPlan) =>
              navigation.navigate("Subscription", {
                initialTab: minimumPlan,
                featureLabel: `${minimumPlan === "scholar" ? "Scholar" : "Premium"} Athan voices`,
              })
            }
          />
          <View testID="athan-delivery-health">
            <NuraiGlass
              tint="rgba(22,65,57,0.28)"
              radius={22}
              style={[
                styles.deliveryHealthCard,
                { borderColor: `${deliveryStatusColor}32` },
              ]}
            >
              <View style={styles.deliveryHealthHeader}>
                <View
                  style={[
                    styles.deliveryHealthIcon,
                    { backgroundColor: `${deliveryStatusColor}18` },
                  ]}
                >
                  <AppIcon
                    name="bell"
                    size={17}
                    color={deliveryStatusColor}
                    decorative
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText type="small" style={{ fontWeight: "800" }}>
                    Full Athan
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: deliveryStatusColor, fontWeight: "800" }}
                  >
                    {deliveryStatusLabel}
                  </ThemedText>
                </View>
                {deliveryActionLoading ? (
                  <ActivityIndicator size="small" color={deliveryStatusColor} />
                ) : null}
                {athanAlarmOn ? (
                  <Switch
                    value
                    onValueChange={toggleAthanAlarm}
                    trackColor={{
                      false: theme.switchTrack,
                      true: theme.primary,
                    }}
                    thumbColor="#FFFFFF"
                    testID="switch-full-athan-alarm"
                    accessibilityLabel="Full Athan alerts"
                    accessibilityHint="Uses your chosen Athan at prayer time"
                  />
                ) : athanAlarmAvailable ? (
                  <Pressable
                    onPress={() => void enableFullAthan()}
                    accessibilityRole="button"
                    accessibilityLabel={
                      athanAuthorization === "denied"
                        ? "Open Settings to allow Full Athan"
                        : "Enable Full Athan alerts"
                    }
                    style={({ pressed }) => [
                      styles.enableAthanButton,
                      {
                        backgroundColor: theme.primary,
                        opacity: pressed ? 0.78 : 1,
                      },
                    ]}
                    testID="button-enable-full-athan"
                  >
                    <AppIcon
                      name={
                        athanAuthorization === "denied" ? "settings" : "bell"
                      }
                      size={14}
                      color={theme.primaryForeground}
                      decorative
                    />
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.primaryForeground,
                        fontWeight: "800",
                      }}
                    >
                      {athanAuthorization === "denied"
                        ? "Open Settings"
                        : "Enable"}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>

              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, lineHeight: 19 }}
              >
                {deliveryStatusDetail}
              </ThemedText>

              {athanAuthorization === "denied" ? (
                <Pressable
                  onPress={() => void Linking.openSettings()}
                  accessibilityRole="button"
                  accessibilityLabel="Open Settings for prayer alert permission"
                  style={styles.inlineRecovery}
                  testID="button-open-athan-settings"
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "700" }}
                  >
                    Allow Full Athan in Settings
                  </ThemedText>
                </Pressable>
              ) : null}

              {deliveryAction ? (
                <ThemedText
                  type="caption"
                  testID="notification-delivery-feedback"
                  accessibilityLiveRegion="polite"
                  style={{ color: theme.textSecondary, lineHeight: 18 }}
                >
                  {deliveryAction}
                </ThemedText>
              ) : null}

              <View style={styles.deliveryActionRow}>
                <Pressable
                  onPress={handleRefreshDelivery}
                  disabled={deliveryActionLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh prayer alerts"
                  style={({ pressed }) => [
                    styles.deliveryActionButton,
                    {
                      borderColor: theme.borderSubtle,
                      backgroundColor: "rgba(255,255,255,0.04)",
                      opacity: pressed || deliveryActionLoading ? 0.68 : 1,
                    },
                  ]}
                  testID="button-refresh-athan-delivery"
                >
                  <AppIcon
                    name="refresh-cw"
                    size={14}
                    color={theme.primary}
                    decorative
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "800" }}
                  >
                    Refresh schedule
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleTestAthanAlarm}
                  disabled={deliveryActionLoading || !athanAlarmAvailable}
                  accessibilityRole="button"
                  accessibilityLabel="Try a prayer alert in one minute"
                  style={({ pressed }) => [
                    styles.deliveryActionButton,
                    {
                      borderColor: `${theme.scholar}38`,
                      backgroundColor: `${theme.scholar}12`,
                      opacity:
                        pressed || deliveryActionLoading || !athanAlarmAvailable
                          ? 0.58
                          : 1,
                    },
                  ]}
                  testID="button-test-athan-alarm"
                >
                  <AppIcon
                    name="clock"
                    size={14}
                    color={theme.scholar}
                    decorative
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "800" }}
                  >
                    Try in one minute
                  </ThemedText>
                </Pressable>
              </View>
            </NuraiGlass>
          </View>
          <SectionHeader title="AT PRAYER TIME" theme={theme} />
          <View
            style={[
              styles.soundSummary,
              {
                backgroundColor: `${theme.scholar}0D`,
                borderColor: `${theme.scholar}26`,
              },
            ]}
          >
            <AppIcon name="volume-2" size={15} color={theme.scholar} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
            >
              Choose what you hear at each prayer. You can keep any salah
              silent, use a short alert, or hear your chosen Athan.
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.scholar }}>
              {enabledSoundCount}/5 set
            </ThemedText>
          </View>
          {!settings.sound ? (
            <View
              style={[
                styles.soundOverrideNotice,
                {
                  backgroundColor: `${theme.warning}10`,
                  borderColor: `${theme.warning}28`,
                },
              ]}
              testID="prayer-sound-global-off-notice"
            >
              <AppIcon name="volume-x" size={15} color={theme.warning} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
              >
                Sound is off. Prayer-time alert choices are saved, but they stay
                silent until sound is enabled again.
              </ThemedText>
            </View>
          ) : null}
          <View style={styles.alertPresetRow}>
            {PRAYER_ALERT_PRESETS.map((preset) => {
              const active =
                enabledSoundCount ===
                  (preset.mode === "none" ? 0 : PRAYER_KEYS.length) &&
                Object.values(settings.prayerTimeAlerts).every(
                  (item) => item.mode === preset.mode,
                );
              return (
                <Pressable
                  key={preset.mode}
                  onPress={() => updateAllPrayerTimeAlerts(preset.mode)}
                  style={({ pressed }) => [
                    styles.alertPresetChip,
                    {
                      backgroundColor: active
                        ? `${theme.scholar}22`
                        : "rgba(255,255,255,0.04)",
                      borderColor: active
                        ? `${theme.scholar}66`
                        : theme.borderSubtle,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Set prayer-time alerts to ${preset.label}`}
                  testID={`alert-preset-${preset.mode}`}
                >
                  <AppIcon
                    name={preset.icon}
                    size={14}
                    color={active ? theme.scholar : theme.textMuted}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: active ? theme.scholar : theme.textMuted,
                      fontWeight: "800",
                    }}
                  >
                    {preset.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          {PRAYER_KEYS.map((prayer) => {
            const prayerKey = prayer;
            const mode = settings.prayerTimeAlerts[prayerKey]?.mode || "none";
            return (
              <PrayerAlertModeItem
                key={`athan-${prayer}`}
                prayer={prayer}
                mode={mode}
                theme={theme}
                index={itemIndex++}
                onOpen={() => setSoundPickerPrayer(prayerKey)}
              />
            );
          })}
        </View>

        <View style={styles.section}>
          <SectionHeader title="BEFORE PRAYER" theme={theme} />
          <ThemedText
            type="caption"
            style={{
              color: theme.textSecondary,
              lineHeight: 18,
              marginBottom: Spacing.sm,
            }}
          >
            Optional nudges before each prayer. These are separate from the
            sound you choose for prayer time.
          </ThemedText>
          {PRAYER_KEYS.map((prayer) => {
            const prayerKey = prayer;
            const config = settings.prayerReminders[prayerKey];
            const label = PRAYER_LABELS[prayer];
            const currentIndex = itemIndex++;
            return (
              <View key={prayer}>
                <SettingItem
                  icon={label.icon}
                  title={label.label}
                  subtitle={
                    config.enabled
                      ? `${config.minutesBefore} minutes before`
                      : "Disabled"
                  }
                  theme={theme}
                  index={currentIndex}
                  testID={`toggle-prayer-${prayer}`}
                  rightElement={
                    <Switch
                      value={config.enabled}
                      onValueChange={(v) =>
                        updatePrayerReminder(prayerKey, "enabled", v)
                      }
                      trackColor={{
                        false: theme.switchTrack,
                        true: theme.primary,
                      }}
                      thumbColor="#FFFFFF"
                      testID={`switch-prayer-${prayer}`}
                    />
                  }
                />
                {config.enabled ? (
                  <Animated.View
                    entering={FadeInDown.duration(200)}
                    style={[
                      styles.minutesContainer,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      Remind me before
                    </ThemedText>
                    <MinutesSelector
                      value={config.minutesBefore}
                      onChange={(v) =>
                        updatePrayerReminder(prayerKey, "minutesBefore", v)
                      }
                      theme={theme}
                      testID={`minutes-${prayer}`}
                    />
                  </Animated.View>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <SectionHeader title="OTHER REMINDERS" theme={theme} />
          <SettingItem
            icon="calendar"
            title="Fasting Reminders"
            subtitle="Suhoor and Iftar reminders based on your location"
            theme={theme}
            index={itemIndex++}
            testID="toggle-fasting"
            rightElement={
              <Switch
                value={settings.fastingReminder}
                onValueChange={(v) => updateField("fastingReminder", v)}
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
                testID="switch-fasting"
              />
            }
          />
          <View
            style={[
              styles.smartEngineCard,
              { borderColor: `${theme.primary}28` },
            ]}
            testID="smart-nurai-reminder-engine"
          >
            <NuraiGlass
              pointerEvents="none"
              radius={24}
              tint={`${theme.primary}0E`}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.smartEngineTop}>
              <View
                style={[
                  styles.smartEngineOrb,
                  {
                    backgroundColor: `${theme.primary}14`,
                    borderColor: `${theme.primary}30`,
                  },
                ]}
              >
                <AppIcon name="zap" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText type="small" style={{ fontWeight: "800" }}>
                  Preview your reminder
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, lineHeight: 18 }}
                >
                  {canUseSmartNurai
                    ? "NurAI uses your saved rhythm and progress to offer a timely next step without changing your records."
                    : "Premium turns simple reminders into calmer, more personal daily guidance."}
                </ThemedText>
              </View>
            </View>

            <NuraiSegmentedControl
              options={[...SMART_PREVIEW_OPTIONS]}
              value={smartPreviewKind}
              onChange={(kind) => {
                setSmartPreviewKind(kind as SmartPreviewKind);
                setSmartPreview(null);
                setSmartPreviewError("");
              }}
              testID="smart-preview-kind"
            />

            {smartPreview ? (
              <View
                style={[
                  styles.smartPreviewResult,
                  { borderColor: theme.borderSubtle },
                ]}
                accessibilityLiveRegion="polite"
                testID="smart-preview-result"
              >
                <View style={styles.smartPreviewResultTop}>
                  <View
                    style={[
                      styles.smartPreviewMiniIcon,
                      { backgroundColor: theme.primaryMuted },
                    ]}
                  >
                    <AppIcon name="bell" size={14} color={theme.primary} />
                  </View>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    {smartPreview.generatedBy === "openai"
                      ? "Personalised for your rhythm"
                      : "Prepared from your saved preferences"}
                  </ThemedText>
                </View>
                <ThemedText type="small" style={{ fontWeight: "800" }}>
                  {smartPreview.title}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, lineHeight: 19 }}
                >
                  {smartPreview.body}
                </ThemedText>
              </View>
            ) : null}

            {smartPreviewError ? (
              <View
                style={[
                  styles.smartPreviewError,
                  { backgroundColor: `${theme.error}10` },
                ]}
                accessibilityRole="alert"
              >
                <AppIcon name="info" size={14} color={theme.error} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, flex: 1 }}
                >
                  {smartPreviewError}
                </ThemedText>
              </View>
            ) : null}

            <Pressable
              onPress={() => void handleSmartPreview()}
              disabled={smartPreviewLoading}
              accessibilityRole="button"
              accessibilityLabel={
                canUseSmartNurai
                  ? "Generate smart notification preview"
                  : "Unlock smart notification guidance"
              }
              accessibilityState={{ busy: smartPreviewLoading }}
              style={({ pressed }) => [
                styles.smartPreviewButton,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.78 },
              ]}
              testID="button-smart-preview-primary"
            >
              {smartPreviewLoading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.primaryForeground}
                />
              ) : (
                <AppIcon
                  name={canUseSmartNurai ? "play" : "lock"}
                  size={15}
                  color={theme.primaryForeground}
                />
              )}
              <ThemedText
                type="small"
                style={{
                  color: theme.primaryForeground,
                  fontWeight: "800",
                }}
              >
                {smartPreviewLoading
                  ? "Preparing…"
                  : canUseSmartNurai
                    ? "Preview reminder"
                    : "Explore Premium"}
              </ThemedText>
            </Pressable>
            <View style={styles.smartPreviewTrustRow}>
              <AppIcon name="shield" size={13} color={theme.textMuted} />
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, flex: 1, lineHeight: 18 }}
              >
                Your saved progress remains the source of truth. NurAI can shape
                the wording, but it does not invent completions, sources,
                routes, or religious rulings.
              </ThemedText>
            </View>
          </View>
          <SettingItem
            icon="book-open"
            title="Quran Reading Goal"
            subtitle="Daily reading goal reminder"
            theme={theme}
            index={itemIndex++}
            testID="toggle-reading"
            rightElement={
              <Switch
                value={settings.readingReminder}
                onValueChange={(v) => updateField("readingReminder", v)}
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
                testID="switch-reading"
              />
            }
          />
          <SettingItem
            icon="target"
            title="Daily Deen Journey"
            subtitle="Morning nudge for one Quran, prayer, dhikr, charity, or learning step"
            theme={theme}
            index={itemIndex++}
            testID="toggle-daily-goal"
            rightElement={
              <Switch
                value={settings.dailyGoalReminder}
                onValueChange={(v) => updateField("dailyGoalReminder", v)}
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
                testID="switch-daily-goal"
              />
            }
          />
          <SettingItem
            icon="repeat"
            title="Dhikr/Tasbeeh Reminder"
            subtitle="Daily dhikr and tasbeeh reminder"
            theme={theme}
            index={itemIndex++}
            testID="toggle-dhikr"
            rightElement={
              <Switch
                value={settings.dhikrReminder}
                onValueChange={(v) => updateField("dhikrReminder", v)}
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
                testID="switch-dhikr"
              />
            }
          />
          <SettingItem
            icon="heart"
            title="Private wellbeing check-ins"
            subtitle="A discreet reminder with no sensitive detail on your Lock Screen"
            theme={theme}
            index={itemIndex++}
            testID="toggle-health"
            rightElement={
              <Switch
                value={settings.healthReminder}
                onValueChange={(v) => updateField("healthReminder", v)}
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
                testID="switch-health"
              />
            }
          />
        </View>

        <View style={styles.section}>
          <SectionHeader title="PERSONAL GUIDANCE" theme={theme} />
          <SettingItem
            icon="zap"
            title="Smart NurAI Guidance"
            subtitle={
              canUseSmartNurai
                ? "Premium reminders based on your daily rhythm and progress"
                : "Premium unlocks context-aware reminders for prayer, Quran, learning, and progress"
            }
            theme={theme}
            index={itemIndex++}
            testID="toggle-smart-nurai"
            onPress={
              canUseSmartNurai
                ? undefined
                : () =>
                    navigation.navigate("Subscription", {
                      featureLabel: "Smart NurAI Guidance",
                    })
            }
            rightElement={
              canUseSmartNurai ? (
                <Switch
                  value={settings.smartNuraiReminders}
                  onValueChange={(v) => updateField("smartNuraiReminders", v)}
                  trackColor={{
                    false: theme.switchTrack,
                    true: theme.primary,
                  }}
                  thumbColor="#FFFFFF"
                  testID="switch-smart-nurai"
                />
              ) : (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${theme.scholar}20` },
                  ]}
                >
                  <AppIcon name="lock" size={13} color={theme.scholar} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "700" }}
                  >
                    Premium
                  </ThemedText>
                </View>
              )
            }
          />
          <SettingItem
            icon="book-open"
            title="Friday Al-Kahf"
            subtitle="Remind to read Surah Al-Kahf every Friday"
            theme={theme}
            index={itemIndex++}
            testID="toggle-friday-kahf"
            rightElement={
              <Switch
                value={settings.fridayKahf}
                onValueChange={(v) => updateField("fridayKahf", v)}
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
                testID="switch-friday-kahf"
              />
            }
          />
          <SettingItem
            icon="moon"
            title="Tahajjud Reminder"
            subtitle="Wake up for the last third of the night prayer"
            theme={theme}
            index={itemIndex++}
            testID="toggle-tahajjud"
            rightElement={
              <Switch
                value={settings.tahajjudReminder}
                onValueChange={(v) => updateField("tahajjudReminder", v)}
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
                testID="switch-tahajjud"
              />
            }
          />
          <SettingItem
            icon="sunrise"
            title="Fajr Wake Window"
            subtitle="Gentle wake-up before Fajr using local prayer time"
            theme={theme}
            index={itemIndex++}
            testID="toggle-wake"
            rightElement={
              <Switch
                value={settings.wakeReminder}
                onValueChange={(v) => updateField("wakeReminder", v)}
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
                testID="switch-wake"
              />
            }
          />
          <SettingItem
            icon="map"
            title="Travel Prep"
            subtitle="Daily optional prompt for travel dua, wudu, and prayer planning"
            theme={theme}
            index={itemIndex++}
            testID="toggle-travel"
            rightElement={
              <Switch
                value={settings.travelReminder}
                onValueChange={(v) => updateField("travelReminder", v)}
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
                testID="switch-travel"
              />
            }
          />
          <SettingItem
            icon="sunrise"
            title="Morning & Evening Adhkar"
            subtitle="Remind after Fajr and before Maghrib"
            theme={theme}
            index={itemIndex++}
            testID="toggle-adhkar"
            rightElement={
              <Switch
                value={settings.adhkarReminder}
                onValueChange={(v) => updateField("adhkarReminder", v)}
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
                testID="switch-adhkar"
              />
            }
          />
          <SettingItem
            icon="calendar"
            title="Seasonal Reminders"
            subtitle="Ramadan, Eid, and Dhul Hijjah reminders"
            theme={theme}
            index={itemIndex++}
            testID="toggle-seasonal"
            rightElement={
              <Switch
                value={settings.seasonalReminders}
                onValueChange={(v) => updateField("seasonalReminders", v)}
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
                testID="switch-seasonal"
              />
            }
          />
        </View>

        <View style={styles.section}>
          <SectionHeader title="PREFERENCES" theme={theme} />
          <SettingItem
            icon="volume-2"
            title="Sound"
            subtitle={
              settings.sound
                ? "Notification sounds enabled"
                : "Silent notifications"
            }
            theme={theme}
            index={itemIndex++}
            testID="toggle-sound"
            rightElement={
              <Switch
                value={settings.sound}
                onValueChange={(v) => updateField("sound", v)}
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
                testID="switch-sound"
              />
            }
          />
          <SettingItem
            icon="smartphone"
            title="Vibration"
            subtitle={
              settings.vibration ? "Vibration enabled" : "Vibration disabled"
            }
            theme={theme}
            index={itemIndex++}
            testID="toggle-vibration"
            rightElement={
              <Switch
                value={settings.vibration}
                onValueChange={(v) => updateField("vibration", v)}
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
                testID="switch-vibration"
              />
            }
          />
          <SettingItem
            icon="moon"
            title="Quiet Hours"
            subtitle={
              settings.quietHours.enabled
                ? `${formatHour(settings.quietHours.start)} - ${formatHour(settings.quietHours.end)}`
                : "No quiet hours set"
            }
            theme={theme}
            index={itemIndex++}
            testID="toggle-quiet-hours"
            rightElement={
              <Switch
                value={settings.quietHours.enabled}
                onValueChange={(v) =>
                  saveSettings({
                    ...settings,
                    quietHours: { ...settings.quietHours, enabled: v },
                  })
                }
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
                testID="switch-quiet-hours"
              />
            }
          />
          {settings.quietHours.enabled ? (
            <Animated.View
              entering={FadeInDown.duration(200)}
              style={[
                styles.quietHoursContainer,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <View style={styles.quietHoursRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Start
                </ThemedText>
                <Pressable
                  style={[
                    styles.timeButton,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                  onPress={() => cycleQuietHour("start")}
                  testID="button-quiet-start"
                >
                  <ThemedText type="small" style={{ fontWeight: "600" }}>
                    {formatHour(settings.quietHours.start)}
                  </ThemedText>
                </Pressable>
              </View>
              <View style={styles.quietHoursRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  End
                </ThemedText>
                <Pressable
                  style={[
                    styles.timeButton,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                  onPress={() => cycleQuietHour("end")}
                  testID="button-quiet-end"
                >
                  <ThemedText type="small" style={{ fontWeight: "600" }}>
                    {formatHour(settings.quietHours.end)}
                  </ThemedText>
                </Pressable>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      <NuraiBottomSheet
        visible={soundPickerPrayer !== null}
        title={
          soundPickerPrayer
            ? `${PRAYER_LABELS[soundPickerPrayer].label} prayer alert`
            : "Prayer alert"
        }
        onClose={() => setSoundPickerPrayer(null)}
      >
        <ThemedText
          type="small"
          style={[styles.soundPickerIntro, { color: theme.textSecondary }]}
        >
          Choose what you hear at this prayer. Advance reminders are managed
          separately below.
        </ThemedText>
        {soundPickerPrayer
          ? PRAYER_ALERT_MODE_OPTIONS.map((option) => {
              const selected =
                settings.prayerTimeAlerts[soundPickerPrayer]?.mode === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    updatePrayerTimeAlert(soundPickerPrayer, option);
                    setSoundPickerPrayer(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${PRAYER_ALERT_SOUND_LABELS[option]} for ${PRAYER_LABELS[soundPickerPrayer].label}`}
                  testID={`alert-mode-${soundPickerPrayer}-${option}`}
                  style={({ pressed }) => [
                    styles.soundPickerOption,
                    {
                      borderColor: selected
                        ? `${theme.scholar}66`
                        : theme.borderSubtle,
                      backgroundColor: selected
                        ? `${theme.scholar}12`
                        : "rgba(255,255,255,0.035)",
                    },
                    pressed ? { opacity: 0.72 } : null,
                  ]}
                >
                  <View
                    style={[
                      styles.soundPickerIcon,
                      {
                        backgroundColor: selected
                          ? `${theme.scholar}20`
                          : `${theme.primary}10`,
                      },
                    ]}
                  >
                    <AppIcon
                      name={
                        option === "none"
                          ? "volume-x"
                          : option === "default"
                            ? "bell"
                            : option === "athan"
                              ? "volume-2"
                              : "radio"
                      }
                      size={18}
                      color={selected ? theme.scholar : theme.primary}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText
                      type="small"
                      style={{ color: theme.text, fontWeight: "800" }}
                    >
                      {PRAYER_ALERT_SOUND_LABELS[option]}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {option === "none"
                        ? "No sound at prayer time"
                        : option === "default"
                          ? "A short standard notification sound"
                          : option === "athan"
                            ? "Your selected full Athan voice"
                            : "A short Takbir alert"}
                    </ThemedText>
                  </View>
                  <AppIcon
                    name={selected ? "check" : "chevron-right"}
                    size={18}
                    color={selected ? theme.scholar : theme.textMuted}
                  />
                </Pressable>
              );
            })
          : null}
      </NuraiBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  cleanIntro: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  cleanIntroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationHero: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  notificationHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  notificationHeroIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationHeroGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  notificationHeroMetric: {
    flex: 1,
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.035)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
  },
  notificationInsightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  smartEngineCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  smartEngineTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  smartEngineOrb: {
    width: 48,
    height: 48,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  smartPreviewResult: {
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.md,
  },
  smartPreviewResultTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  smartPreviewMiniIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  smartPreviewError: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  smartPreviewButton: {
    minHeight: 48,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  smartPreviewTrustRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  soundSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  inlineRecovery: {
    minHeight: 44,
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  deliveryHealthCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  deliveryHealthHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  enableAthanButton: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  deliveryHealthIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryActionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  deliveryActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm,
  },
  soundOverrideNotice: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  alertPresetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  alertPresetChip: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  prayerAlertModeCard: {
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    overflow: "hidden",
  },
  prayerAlertModeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  prayerAlertSelection: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 2,
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 4,
  },
  alertModeRow: {
    flexDirection: "row",
    gap: 6,
  },
  alertModeChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  soundPickerIntro: {
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  soundPickerOption: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  soundPickerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    overflow: "hidden",
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  settingContent: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  minutesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
    marginBottom: Spacing.sm,
    marginLeft: Spacing["3xl"],
  },
  minutesRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  minuteChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  enableButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
  },
  quietHoursContainer: {
    padding: Spacing.lg,
    borderRadius: 16,
    marginBottom: Spacing.sm,
    marginLeft: Spacing["3xl"],
    gap: Spacing.md,
  },
  quietHoursRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  comingSoonBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
});
