import { Coordinates, PrayerTimes } from "adhan";

import { getCalculationMethod } from "@/lib/prayer-utils";

export const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];

export const PRAYER_LABELS: Record<PrayerKey, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export type PrayerLocationInput = {
  latitude: number;
  longitude: number;
  calculationMethod: string;
  countryName?: string;
  cityName?: string;
  source?: string;
  accuracyMeters?: number | null;
  updatedAt?: string;
};

export type PrayerWindow = {
  key: PrayerKey;
  label: string;
  start: Date;
  end: Date;
  endLabel: string;
  progress: number;
};

export type PrayerMoment = {
  key: PrayerKey | "sunrise";
  label: string;
  time: Date;
};

export type PrayerIntelligence = {
  moments: PrayerMoment[];
  prayerTimes: Record<PrayerKey, Date>;
  sunrise: Date;
  nextPrayer: PrayerKey;
  nextPrayerLabel: string;
  nextPrayerTime: Date;
  nextPrayerDay: "today" | "tomorrow";
  previousMoment?: PrayerMoment;
  currentWindow?: PrayerWindow;
  nextPrayerProgress: number;
  countdownLabel: string;
  windowLabel: string;
  methodLabel: string;
  confidenceLabel: string;
  isLocationStale: boolean;
  preparationTitle: string;
  preparationBody: string;
};

const METHOD_LABELS: Record<string, string> = {
  UmmAlQura: "Umm al-Qura",
  Egyptian: "Egyptian Authority",
  Karachi: "Karachi",
  Tehran: "Tehran",
  NorthAmerica: "ISNA",
  Kuwait: "Kuwait",
  Qatar: "Qatar",
  Singapore: "MUIS Singapore",
  Turkey: "Diyanet",
  Dubai: "Dubai",
  MoonsightingCommittee: "Moonsighting",
  MuslimWorldLeague: "Muslim World League",
};

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function formatPrayerClock(date: Date, is24h = false): string {
  return date.toLocaleTimeString(is24h ? "en-GB" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !is24h,
  });
}

export function formatPrayerCountdown(target: Date, now = new Date()): string {
  const diff = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPrayerTimesForDate(location: PrayerLocationInput, date: Date) {
  const coordinates = new Coordinates(location.latitude, location.longitude);
  const params = getCalculationMethod(location.calculationMethod, {
    countryName: location.countryName,
    latitude: location.latitude,
  });
  return new PrayerTimes(coordinates, date, params);
}

function buildPreparation(
  nextPrayer: PrayerKey,
  time: Date,
): {
  title: string;
  body: string;
} {
  const timeLabel = formatPrayerClock(time);
  const copy: Record<PrayerKey, { title: string; body: string }> = {
    fajr: {
      title: "Prepare for Fajr gently",
      body: `${timeLabel} start. Sleep, wudu, and a quiet intention matter more than rushing.`,
    },
    dhuhr: {
      title: "Protect the middle of your day",
      body: `${timeLabel} start. Plan a clean pause before work or errands pull you away.`,
    },
    asr: {
      title: "Hold onto Asr",
      body: `${timeLabel} start. This is your afternoon anchor before the evening changes pace.`,
    },
    maghrib: {
      title: "Make Maghrib calm",
      body: `${timeLabel} start. Prepare now so sunset does not become rushed.`,
    },
    isha: {
      title: "Close the day well",
      body: `${timeLabel} start. Isha, dhikr, and one reflection can settle the night.`,
    },
  };
  return copy[nextPrayer];
}

function locationConfidence(location: PrayerLocationInput): {
  label: string;
  stale: boolean;
} {
  const updatedAt = location.updatedAt ? new Date(location.updatedAt) : null;
  const ageHours =
    updatedAt && Number.isFinite(updatedAt.getTime())
      ? (Date.now() - updatedAt.getTime()) / 36e5
      : null;
  const stale = ageHours === null || ageHours > 72;
  if (location.source === "gps") {
    const accuracy =
      typeof location.accuracyMeters === "number"
        ? ` · ±${Math.round(location.accuracyMeters)}m`
        : "";
    return { label: `Precise GPS${accuracy}`, stale };
  }
  if (location.source === "mapbox" || location.source === "google") {
    return { label: "Verified city location", stale };
  }
  return { label: "City-level location", stale };
}

export function buildPrayerIntelligence(
  location: PrayerLocationInput,
  now = new Date(),
): PrayerIntelligence {
  const today = getPrayerTimesForDate(location, now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = getPrayerTimesForDate(location, tomorrowDate);

  const prayerTimes: Record<PrayerKey, Date> = {
    fajr: today.fajr,
    dhuhr: today.dhuhr,
    asr: today.asr,
    maghrib: today.maghrib,
    isha: today.isha,
  };

  const moments: PrayerMoment[] = [
    { key: "fajr", label: "Fajr", time: today.fajr },
    { key: "sunrise", label: "Sunrise", time: today.sunrise },
    { key: "dhuhr", label: "Dhuhr", time: today.dhuhr },
    { key: "asr", label: "Asr", time: today.asr },
    { key: "maghrib", label: "Maghrib", time: today.maghrib },
    { key: "isha", label: "Isha", time: today.isha },
  ];

  let nextPrayer: PrayerKey = "fajr";
  let nextPrayerTime = tomorrow.fajr;
  let nextPrayerDay: "today" | "tomorrow" = "tomorrow";
  for (const key of PRAYER_KEYS) {
    if (prayerTimes[key].getTime() > now.getTime()) {
      nextPrayer = key;
      nextPrayerTime = prayerTimes[key];
      nextPrayerDay = "today";
      break;
    }
  }

  const previousMoment = [...moments]
    .reverse()
    .find((moment) => moment.time.getTime() <= now.getTime());
  const nextPrayerProgress = previousMoment
    ? clamp(
        (now.getTime() - previousMoment.time.getTime()) /
          Math.max(1, nextPrayerTime.getTime() - previousMoment.time.getTime()),
      )
    : 0;

  const windows: PrayerWindow[] = [
    {
      key: "fajr",
      label: "Fajr",
      start: today.fajr,
      end: today.sunrise,
      endLabel: "sunrise",
      progress: 0,
    },
    {
      key: "dhuhr",
      label: "Dhuhr",
      start: today.dhuhr,
      end: today.asr,
      endLabel: "Asr",
      progress: 0,
    },
    {
      key: "asr",
      label: "Asr",
      start: today.asr,
      end: today.maghrib,
      endLabel: "Maghrib",
      progress: 0,
    },
    {
      key: "maghrib",
      label: "Maghrib",
      start: today.maghrib,
      end: today.isha,
      endLabel: "Isha",
      progress: 0,
    },
    {
      key: "isha",
      label: "Isha",
      start: today.isha,
      end: tomorrow.fajr,
      endLabel: "Fajr",
      progress: 0,
    },
  ];

  const currentWindow = windows.find(
    (window) =>
      window.start.getTime() <= now.getTime() &&
      now.getTime() < window.end.getTime(),
  );
  if (currentWindow) {
    currentWindow.progress = clamp(
      (now.getTime() - currentWindow.start.getTime()) /
        Math.max(
          1,
          currentWindow.end.getTime() - currentWindow.start.getTime(),
        ),
    );
  }

  const confidence = locationConfidence(location);
  const preparation = buildPreparation(nextPrayer, nextPrayerTime);
  const windowLabel = currentWindow
    ? `${currentWindow.label} window closes at ${formatPrayerClock(
        currentWindow.end,
      )}`
    : `${PRAYER_LABELS[nextPrayer]} begins at ${formatPrayerClock(
        nextPrayerTime,
      )}`;

  return {
    moments,
    prayerTimes,
    sunrise: today.sunrise,
    nextPrayer,
    nextPrayerLabel: PRAYER_LABELS[nextPrayer],
    nextPrayerTime,
    nextPrayerDay,
    previousMoment,
    currentWindow,
    nextPrayerProgress,
    countdownLabel: formatPrayerCountdown(nextPrayerTime, now),
    windowLabel,
    methodLabel:
      METHOD_LABELS[location.calculationMethod] || location.calculationMethod,
    confidenceLabel: confidence.label,
    isLocationStale: confidence.stale,
    preparationTitle: preparation.title,
    preparationBody: preparation.body,
  };
}
