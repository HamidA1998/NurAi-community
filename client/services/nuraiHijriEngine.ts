import AsyncStorage from "@react-native-async-storage/async-storage";

export interface HijriDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  monthNameAr: string;
  isApproximate: boolean;
  adjustmentDays: number;
}

const HIJRI_ADJUSTMENT_KEY = "@nurai_hijri_adjustment";

const HIJRI_MONTHS = [
  { en: "Muharram", ar: "\u0645\u062D\u0631\u0645" },
  { en: "Safar", ar: "\u0635\u0641\u0631" },
  {
    en: "Rabi' al-Awwal",
    ar: "\u0631\u0628\u064A\u0639 \u0627\u0644\u0623\u0648\u0644",
  },
  {
    en: "Rabi' al-Thani",
    ar: "\u0631\u0628\u064A\u0639 \u0627\u0644\u0622\u062E\u0631",
  },
  {
    en: "Jumada al-Ula",
    ar: "\u062C\u0645\u0627\u062F\u0649 \u0627\u0644\u0623\u0648\u0644\u0649",
  },
  {
    en: "Jumada al-Thani",
    ar: "\u062C\u0645\u0627\u062F\u0649 \u0627\u0644\u0622\u062E\u0631\u0629",
  },
  { en: "Rajab", ar: "\u0631\u062C\u0628" },
  { en: "Sha'ban", ar: "\u0634\u0639\u0628\u0627\u0646" },
  { en: "Ramadan", ar: "\u0631\u0645\u0636\u0627\u0646" },
  { en: "Shawwal", ar: "\u0634\u0648\u0627\u0644" },
  {
    en: "Dhul Qi'dah",
    ar: "\u0630\u0648 \u0627\u0644\u0642\u0639\u062F\u0629",
  },
  { en: "Dhul Hijjah", ar: "\u0630\u0648 \u0627\u0644\u062D\u062C\u0629" },
];

function gregorianToJulian(date: Date): number {
  let y = date.getFullYear(),
    m = date.getMonth() + 1;
  const d = date.getDate();
  if (m <= 2) {
    y--;
    m += 12;
  }
  const a = Math.floor(y / 100),
    b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    d +
    b -
    1524.5
  );
}

function tabularHijri(greg: Date): {
  year: number;
  month: number;
  day: number;
} {
  // gregorianToJulian returns the JD at 0h UT (a .5 value, since JD integer
  // boundaries fall at noon). Snap to the civil-day Julian Day Number so the
  // Hijri day is a whole number — a fractional day both rendered as "28.5" in
  // the UI and broke exact `hijri.day === event.day` event-date matching.
  const jd = Math.floor(gregorianToJulian(greg) + 0.5);
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const lp = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - lp) / 5316) * Math.floor((50 * lp) / 17719) +
    Math.floor(lp / 5670) * Math.floor((43 * lp) / 15238);
  const lf =
    lp -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * lf) / 709);
  const day = lf - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}

let cachedAdjustment: number | null = null;

export async function loadHijriAdjustment(): Promise<number> {
  if (cachedAdjustment !== null) return cachedAdjustment;
  try {
    const v = await AsyncStorage.getItem(HIJRI_ADJUSTMENT_KEY);
    cachedAdjustment = v ? parseInt(v, 10) : 0;
    return cachedAdjustment;
  } catch {
    return 0;
  }
}

export async function setHijriAdjustment(days: number): Promise<void> {
  const clamped = Math.max(-2, Math.min(2, days));
  cachedAdjustment = clamped;
  try {
    await AsyncStorage.setItem(HIJRI_ADJUSTMENT_KEY, String(clamped));
  } catch {}
}

export function getHijriDate(date?: Date, adjustment?: number): HijriDate {
  try {
    const d = date || new Date();
    const adj = adjustment ?? cachedAdjustment ?? 0;
    const adjusted = adj !== 0 ? new Date(d.getTime() + adj * 86400000) : d;
    const h = tabularHijri(adjusted);
    const m = HIJRI_MONTHS[h.month - 1] || HIJRI_MONTHS[0];
    return {
      year: h.year,
      month: h.month,
      day: h.day,
      monthName: m.en,
      monthNameAr: m.ar,
      isApproximate: true,
      adjustmentDays: adj,
    };
  } catch {
    return {
      year: 1448,
      month: 1,
      day: 1,
      monthName: "Muharram",
      monthNameAr: "\u0645\u062D\u0631\u0645",
      isApproximate: true,
      adjustmentDays: 0,
    };
  }
}

export interface IslamicEvent {
  name: string;
  nameAr: string;
  hijriMonth: number;
  hijriDay: number;
  type: "major" | "recommended" | "awareness";
  fasting?: boolean;
  description: string;
}

const EVENTS: IslamicEvent[] = [
  {
    name: "Day of Ashura",
    nameAr: "\u064A\u0648\u0645 \u0639\u0627\u0634\u0648\u0631\u0627\u0621",
    hijriMonth: 1,
    hijriDay: 10,
    type: "recommended",
    fasting: true,
    description:
      "The Prophet \uFDFA fasted this day. Fast the 9th or 11th as well.",
  },
  {
    name: "Mawlid an-Nabi",
    nameAr:
      "\u0627\u0644\u0645\u0648\u0644\u062F \u0627\u0644\u0646\u0628\u0648\u064A",
    hijriMonth: 3,
    hijriDay: 12,
    type: "awareness",
    description:
      "Birthday of the Prophet \uFDFA. Scholars differ on celebrating it.",
  },
  {
    name: "Isra' and Mi'raj",
    nameAr:
      "\u0627\u0644\u0625\u0633\u0631\u0627\u0621 \u0648\u0627\u0644\u0645\u0639\u0631\u0627\u062C",
    hijriMonth: 7,
    hijriDay: 27,
    type: "awareness",
    description:
      "The Night Journey. The five daily prayers were prescribed this night.",
  },
  {
    name: "Laylat al-Bara'ah",
    nameAr:
      "\u0644\u064A\u0644\u0629 \u0627\u0644\u0628\u0631\u0627\u0621\u0629",
    hijriMonth: 8,
    hijriDay: 15,
    type: "awareness",
    description:
      "Some scholars recommend extra worship. The Prophet \uFDFA fasted much of Sha'ban.",
  },
  {
    name: "Ramadan Begins",
    nameAr: "\u0628\u062F\u0627\u064A\u0629 \u0631\u0645\u0636\u0627\u0646",
    hijriMonth: 9,
    hijriDay: 1,
    type: "major",
    fasting: true,
    description: "The blessed month of fasting begins.",
  },
  {
    name: "Laylat al-Qadr Window",
    nameAr: "\u0644\u064A\u0644\u0629 \u0627\u0644\u0642\u062F\u0631",
    hijriMonth: 9,
    hijriDay: 21,
    type: "major",
    description:
      "Seek it in the last 10 nights, especially odd nights. Better than 1000 months.",
  },
  {
    name: "Eid al-Fitr",
    nameAr: "\u0639\u064A\u062F \u0627\u0644\u0641\u0637\u0631",
    hijriMonth: 10,
    hijriDay: 1,
    type: "major",
    description: "End of Ramadan. Zakat al-Fitr before Eid prayer.",
  },
  {
    name: "Day of Arafah",
    nameAr: "\u064A\u0648\u0645 \u0639\u0631\u0641\u0629",
    hijriMonth: 12,
    hijriDay: 9,
    type: "major",
    fasting: true,
    description:
      "Fasting expiates sins of the previous and coming year. (Muslim)",
  },
  {
    name: "Eid al-Adha",
    nameAr: "\u0639\u064A\u062F \u0627\u0644\u0623\u0636\u062D\u0649",
    hijriMonth: 12,
    hijriDay: 10,
    type: "major",
    description: "Festival of Sacrifice. Fasting is prohibited.",
  },
];

export function isSunnahFastingDay(date?: Date): {
  isSunnah: boolean;
  reason: string;
} {
  const d = date || new Date();
  const dow = d.getDay();
  const h = getHijriDate(d);
  if (dow === 1)
    return {
      isSunnah: true,
      reason: "Monday \u2014 the Prophet \uFDFA fasted Mondays.",
    };
  if (dow === 4)
    return {
      isSunnah: true,
      reason:
        "Thursday \u2014 deeds are shown to Allah on Mondays and Thursdays.",
    };
  if ([13, 14, 15].includes(h.day))
    return {
      isSunnah: true,
      reason: `${h.day}th of ${h.monthName} \u2014 White Days (Ayyam al-Beedh).`,
    };
  if (h.month === 1 && [9, 10].includes(h.day))
    return {
      isSunnah: true,
      reason: "Ashura. Fasting expiates the previous year.",
    };
  if (h.month === 12 && h.day === 9)
    return {
      isSunnah: true,
      reason: "Day of Arafah. Expiates previous and coming year.",
    };
  if (h.month === 10 && h.day >= 2 && h.day <= 7)
    return {
      isSunnah: true,
      reason: "Six of Shawwal. Like fasting the entire year.",
    };
  return { isSunnah: false, reason: "" };
}

export function getUpcomingEvents(
  daysAhead = 60,
): (IslamicEvent & { daysUntil: number })[] {
  const today = getHijriDate();
  return EVENTS.map((e) => {
    let d = (e.hijriMonth - today.month) * 30 + (e.hijriDay - today.day);
    if (d < 0) d += 354;
    return { ...e, daysUntil: d };
  })
    .filter((e) => e.daysUntil >= 0 && e.daysUntil <= daysAhead)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function getDaysToRamadan(): number {
  const h = getHijriDate();
  if (h.month === 9) return 0;
  if (h.month < 9) return (9 - h.month - 1) * 30 + (30 - h.day) + 1;
  return (12 - h.month) * 30 + (30 - h.day) + 8 * 30 + 1;
}

export function isRamadan(): boolean {
  return getHijriDate().month === 9;
}
export function isLastTenNights(): boolean {
  const h = getHijriDate();
  return h.month === 9 && h.day >= 21;
}
export function isIslamicFriday(): boolean {
  const n = new Date();
  return (
    (n.getDay() === 4 && n.getHours() >= 17) ||
    (n.getDay() === 5 && n.getHours() < 17)
  );
}
export function isFirstTenDhulHijjah(): boolean {
  const h = getHijriDate();
  return h.month === 12 && h.day <= 10;
}
