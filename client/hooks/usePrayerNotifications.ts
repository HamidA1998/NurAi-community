import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Coordinates, PrayerTimes } from "adhan";
import { useLocation } from "@/context/LocationContext";
import { getCalculationMethod } from "@/lib/prayer-utils";
import {
  schedulePrayerReminder,
  scheduleAthanReminder,
  cancelAllPrayerReminders,
  setupNotificationCategories,
} from "@/lib/notifications";
import {
  notificationSoundForMode,
  type PrayerAlertSoundMode,
} from "@/lib/prayer-alert-sounds";
import {
  addAthanScheduleChangeListener,
  athanAlarmSupported,
  isAthanAlarmEnabled,
  syncAthanAlarms,
  athanPrayerScheduleKey,
  type AthanPrayer,
} from "@/lib/athan-alarm";
import { getUsableAthanVoice } from "@/lib/athan-reciter-catalog";
import { useSubscription } from "@/context/SubscriptionContext";

const SETTINGS_KEY = "notification_settings";
const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
// Keep room below iOS's pending-request ceiling for Quran, adhkar, fasting,
// travel and seasonal reminders. This rolling window is renewed hourly.
const MAX_LOCAL_PRAYER_REQUESTS = 36;

type PrayerNotificationJob =
  | {
      kind: "before";
      prayer: (typeof PRAYER_KEYS)[number];
      prayerTime: Date;
      triggerTime: Date;
      minutesBefore: number;
      identifierSuffix: string;
    }
  | {
      kind: "at_time";
      prayer: (typeof PRAYER_KEYS)[number];
      prayerTime: Date;
      triggerTime: Date;
      mode: PrayerAlertSoundMode;
      identifierSuffix: string;
    };

interface PrayerReminderSettings {
  enabled: boolean;
  minutesBefore: number;
}

interface NotificationSettings {
  permissionGranted: boolean;
  prayerReminders: Record<string, PrayerReminderSettings>;
  athanReminders?: Record<string, { enabled: boolean }>;
  prayerTimeAlerts?: Record<string, { mode: PrayerAlertSoundMode }>;
  sound?: boolean;
  quietHours?: { enabled: boolean; start: number; end: number };
}

function isInQuietHours(
  date: Date,
  quietHours: { enabled: boolean; start: number; end: number },
): boolean {
  if (!quietHours.enabled) return false;
  const hour = date.getHours();
  if (quietHours.start < quietHours.end) {
    return hour >= quietHours.start && hour < quietHours.end;
  }
  return hour >= quietHours.start || hour < quietHours.end;
}

export function usePrayerNotifications() {
  const { location } = useLocation();
  const { currentPlan } = useSubscription();
  const scheduledDateRef = useRef<string>("");

  useEffect(() => {
    if (Platform.OS === "web") return;

    const scheduleNotifications = async (force = false) => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (!raw) return;

        const settings: NotificationSettings = JSON.parse(raw);
        const athanAlarmActive =
          athanAlarmSupported() && (await isAthanAlarmEnabled());
        const permission = await Notifications.getPermissionsAsync();
        const localNotificationsAllowed = permission.status === "granted";
        if (!localNotificationsAllowed && !athanAlarmActive) return;

        const today = new Date().toISOString().split("T")[0];
        const locationKey = `${location.latitude.toFixed(4)}_${location.longitude.toFixed(4)}`;
        const methodKey = `${location.calculationMethod}_${location.countryName || ""}`;
        const timezoneKey = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const scheduleKey = `${today}_${locationKey}_${methodKey}_${timezoneKey}_${currentPlan}_${permission.status}_${raw}`;

        if (!force && scheduledDateRef.current === scheduleKey) return;

        if (localNotificationsAllowed) {
          await setupNotificationCategories();
          await cancelAllPrayerReminders();
        }

        const coordinates = new Coordinates(
          location.latitude,
          location.longitude,
        );
        const params = getCalculationMethod(location.calculationMethod, {
          countryName: location.countryName,
          latitude: location.latitude,
        });

        const athanAlarmPrayers: AthanPrayer[] = [];
        const localJobs: PrayerNotificationJob[] = [];

        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const day = new Date();
          day.setDate(day.getDate() + dayOffset);
          const prayerTimes = new PrayerTimes(coordinates, day, params);

          const timeMap: Record<string, Date> = {
            fajr: prayerTimes.fajr,
            dhuhr: prayerTimes.dhuhr,
            asr: prayerTimes.asr,
            maghrib: prayerTimes.maghrib,
            isha: prayerTimes.isha,
          };

          for (const prayer of PRAYER_KEYS) {
            const reminderSettings = settings.prayerReminders?.[prayer];
            const athanSettings = settings.athanReminders?.[prayer];
            const prayerAlertMode =
              settings.prayerTimeAlerts?.[prayer]?.mode ||
              (athanSettings?.enabled ? "default" : "none");
            if (!reminderSettings?.enabled && prayerAlertMode === "none")
              continue;

            const prayerTime = timeMap[prayer];
            if (!prayerTime) continue;

            const identifierSuffix = `-${dayOffset}`;

            if (localNotificationsAllowed && reminderSettings?.enabled) {
              const triggerDate = new Date(
                prayerTime.getTime() - reminderSettings.minutesBefore * 60000,
              );

              if (
                !settings.quietHours?.enabled ||
                !isInQuietHours(triggerDate, settings.quietHours)
              ) {
                localJobs.push({
                  kind: "before",
                  prayer,
                  prayerTime,
                  triggerTime: triggerDate,
                  minutesBefore: reminderSettings.minutesBefore,
                  identifierSuffix,
                });
              }
            }

            if (prayerAlertMode !== "none") {
              const alarmCarriesThisPrayer =
                athanAlarmActive && prayerAlertMode === "athan";
              if (alarmCarriesThisPrayer) {
                athanAlarmPrayers.push({
                  key: prayer,
                  label: prayer.charAt(0).toUpperCase() + prayer.slice(1),
                  time: prayerTime,
                });
              }
              if (localNotificationsAllowed) {
                localJobs.push({
                  kind: "at_time",
                  prayer,
                  prayerTime,
                  triggerTime: prayerTime,
                  mode: prayerAlertMode,
                  identifierSuffix,
                });
              }
            }
          }
        }

        const voice = await getUsableAthanVoice(currentPlan);
        const alarmResult = await syncAthanAlarms(athanAlarmPrayers, {
          soundName: voice.soundName,
        });

        const alarmScheduledKeys = new Set(alarmResult.scheduledKeys);
        const nearestJobs = localJobs
          .filter((job) => {
            if (job.triggerTime.getTime() <= Date.now()) return false;
            if (job.kind !== "at_time" || job.mode !== "athan") return true;
            return !alarmScheduledKeys.has(
              athanPrayerScheduleKey({
                key: job.prayer,
                label: job.prayer,
                time: job.prayerTime,
              }),
            );
          })
          .sort(
            (left, right) =>
              left.triggerTime.getTime() - right.triggerTime.getTime(),
          )
          .slice(0, MAX_LOCAL_PRAYER_REQUESTS);

        for (const job of nearestJobs) {
          if (job.kind === "before") {
            await schedulePrayerReminder(
              job.prayer,
              job.prayerTime,
              job.minutesBefore,
              {
                sound: settings.sound === false ? null : true,
                identifierSuffix: job.identifierSuffix,
              },
            );
            continue;
          }

          await scheduleAthanReminder(job.prayer, job.prayerTime, {
            sound: notificationSoundForMode(job.mode, settings.sound !== false),
            mode: job.mode,
            identifierSuffix: job.identifierSuffix,
          });
        }
        scheduledDateRef.current = scheduleKey;
      } catch (e) {
        console.warn("Failed to schedule prayer notifications:", e);
      }
    };

    void scheduleNotifications();

    const interval = setInterval(
      () => {
        void scheduleNotifications();
      },
      60 * 60 * 1000,
    );
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          void scheduleNotifications(true);
        }
      },
    );
    const scheduleChangeSubscription = addAthanScheduleChangeListener(() => {
      void scheduleNotifications(true);
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
      scheduleChangeSubscription.remove();
    };
  }, [currentPlan, location]);
}
