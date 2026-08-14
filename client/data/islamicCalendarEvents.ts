import type { AppIconName } from "@/components/icons";
import type { CategoryColors } from "@/constants/theme";

export const ISLAMIC_MONTHS = [
  "Muharram",
  "Safar",
  "Rabi al-Awwal",
  "Rabi al-Thani",
  "Jumada al-Ula",
  "Jumada al-Thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhul Qi'dah",
  "Dhul Hijjah",
] as const;

export type IslamicCalendarEventType =
  | "major"
  | "recommended"
  | "learning"
  | "awareness";

export type IslamicCalendarEvent = {
  id: string;
  name: string;
  shortName: string;
  month: number;
  day: number;
  icon: AppIconName;
  colorKey: keyof typeof CategoryColors;
  type: IslamicCalendarEventType;
  dateReliability: "moon-sighting" | "approximate" | "observed";
  summary: string;
  whyItMatters: string;
  suggestedActions: string[];
  sourceNotes: string[];
  caution?: string;
  primaryActionLabel?: string;
  primaryActionScreen?: string;
};

export const ISLAMIC_CALENDAR_EVENTS: IslamicCalendarEvent[] = [
  {
    id: "islamic-new-year",
    name: "Islamic New Year",
    shortName: "New Year",
    month: 1,
    day: 1,
    icon: "star",
    colorKey: "emerald",
    type: "learning",
    dateReliability: "moon-sighting",
    summary: "The first day of Muharram marks the start of a new Hijri year.",
    whyItMatters:
      "The Hijri calendar is connected to the migration to Madinah and helps Muslims organise worship around lunar months.",
    suggestedActions: [
      "Review one habit you want to improve this Hijri year.",
      "Set a Quran, salah, or sadaqah intention for the month.",
      "Learn why the Hijrah matters in Islamic history.",
    ],
    sourceNotes: [
      "The Hijri calendar is lunar, so local moon sighting can shift dates by a day.",
      "This is a calendar marker, not one of the two Eid festivals.",
    ],
    primaryActionLabel: "Open Timeline",
    primaryActionScreen: "Timeline",
  },
  {
    id: "ashura",
    name: "Day of Ashura",
    shortName: "Ashura",
    month: 1,
    day: 10,
    icon: "calendar",
    colorKey: "rose",
    type: "recommended",
    dateReliability: "moon-sighting",
    summary:
      "The 10th of Muharram is a recommended fasting day with a strong Sunnah basis.",
    whyItMatters:
      "Ashura is linked to gratitude to Allah and voluntary fasting. Many scholars recommend also fasting the 9th or 11th to distinguish the practice.",
    suggestedActions: [
      "Plan to fast if you are able.",
      "Add the 9th or 11th of Muharram if practical.",
      "Use the day for repentance, gratitude, and quieter worship.",
    ],
    sourceNotes: [
      "Authentic hadith mention the virtue of fasting Ashura.",
      "Local moon sighting may shift the displayed date by a day.",
    ],
    primaryActionLabel: "Open Fiqh Guide",
    primaryActionScreen: "Fiqh",
  },
  {
    id: "mawlid",
    name: "Mawlid an-Nabi",
    shortName: "Mawlid",
    month: 3,
    day: 12,
    icon: "heart",
    colorKey: "amber",
    type: "awareness",
    dateReliability: "observed",
    summary:
      "A widely observed date connected to remembering the birth and life of the Prophet Muhammad.",
    whyItMatters:
      "Love for the Prophet is central to Islam, but Muslims differ over Mawlid observance and how it should be approached.",
    suggestedActions: [
      "Send salawat upon the Prophet.",
      "Read a reliable seerah lesson.",
      "Avoid arguing online; learn with adab and humility.",
    ],
    sourceNotes: [
      "The exact birth date and celebration practices are areas of scholarly difference.",
      "The safest app framing is seerah learning and salawat, not claiming a required festival.",
    ],
    caution:
      "Practices around Mawlid differ by community and scholar. Follow trusted local scholarship.",
    primaryActionLabel: "Read Seerah",
    primaryActionScreen: "Prophets",
  },
  {
    id: "isra-miraj",
    name: "Isra and Mi'raj",
    shortName: "Isra and Mi'raj",
    month: 7,
    day: 27,
    icon: "moon",
    colorKey: "purple",
    type: "learning",
    dateReliability: "observed",
    summary:
      "A night connected by many calendars to the Night Journey and Ascension.",
    whyItMatters:
      "The Night Journey is affirmed in the Quran, and the five daily prayers are connected to the Mi'raj in authentic narrations.",
    suggestedActions: [
      "Reflect on the gift of the five daily prayers.",
      "Read Surah Al-Isra, especially the opening verse.",
      "Strengthen one salah habit this week.",
    ],
    sourceNotes: [
      "Quran 17:1 affirms the Night Journey.",
      "The exact annual date is not established with the same certainty as Ramadan or Eid.",
    ],
    caution:
      "Treat this as a learning reminder unless your trusted scholars advise specific worship.",
    primaryActionLabel: "Salah Guide",
    primaryActionScreen: "SalahGuide",
  },
  {
    id: "shab-e-barat",
    name: "Laylat al-Bara'ah",
    shortName: "15 Sha'ban",
    month: 8,
    day: 15,
    icon: "moon",
    colorKey: "indigo",
    type: "awareness",
    dateReliability: "observed",
    summary:
      "The middle night of Sha'ban is observed by many Muslims, with scholarly difference over reports and special practices.",
    whyItMatters:
      "Sha'ban itself is a month of preparation before Ramadan. Many users benefit from using this time to reset gently.",
    suggestedActions: [
      "Review missed fasts or Ramadan preparation.",
      "Make sincere du'a and tawbah without overclaiming certainty.",
      "Prepare your Ramadan plan early.",
    ],
    sourceNotes: [
      "Authentic reports show the Prophet fasted much of Sha'ban.",
      "Specific virtues and special rituals for the 15th are discussed differently by scholars.",
    ],
    caution:
      "Avoid presenting disputed practices as compulsory or universally agreed.",
    primaryActionLabel: "Open Ramadan",
    primaryActionScreen: "Ramadan",
  },
  {
    id: "ramadan-begins",
    name: "Start of Ramadan",
    shortName: "Ramadan",
    month: 9,
    day: 1,
    icon: "sunrise",
    colorKey: "teal",
    type: "major",
    dateReliability: "moon-sighting",
    summary:
      "Ramadan begins with the sighting of the new moon or the completion of Sha'ban.",
    whyItMatters:
      "Ramadan is the month of fasting, Quran, night prayer, charity, repentance, and mercy.",
    suggestedActions: [
      "Set a realistic Quran and fasting plan.",
      "Prepare suhoor, iftar, and prayer routines.",
      "Check your local mosque announcement for the confirmed start.",
    ],
    sourceNotes: [
      "Quran 2:183-185 establishes Ramadan fasting.",
      "Local authorities may differ by moon-sighting method.",
    ],
    primaryActionLabel: "Open Ramadan",
    primaryActionScreen: "Ramadan",
  },
  {
    id: "laylat-al-qadr-window",
    name: "Laylat al-Qadr Window",
    shortName: "Last 10 Nights",
    month: 9,
    day: 21,
    icon: "star",
    colorKey: "amber",
    type: "major",
    dateReliability: "moon-sighting",
    summary:
      "The last ten nights of Ramadan begin. Laylat al-Qadr should be sought in this window, especially the odd nights.",
    whyItMatters:
      "Surah Al-Qadr describes this night as better than a thousand months, so the last ten nights deserve extra care.",
    suggestedActions: [
      "Protect Isha, Fajr, du'a, Quran, and charity.",
      "Repeat the prophetic du'a for forgiveness.",
      "Avoid assuming only the 27th matters; keep the whole window alive.",
    ],
    sourceNotes: [
      "Surah Al-Qadr teaches the rank of Laylat al-Qadr.",
      "Authentic hadith direct Muslims to seek it in the last ten nights.",
    ],
    primaryActionLabel: "Open Duas",
    primaryActionScreen: "Duas",
  },
  {
    id: "eid-al-fitr",
    name: "Eid al-Fitr",
    shortName: "Eid al-Fitr",
    month: 10,
    day: 1,
    icon: "gift",
    colorKey: "emerald",
    type: "major",
    dateReliability: "moon-sighting",
    summary:
      "Eid al-Fitr marks the end of Ramadan and the beginning of Shawwal.",
    whyItMatters:
      "It is one of the two Eid festivals in Islam and includes Eid prayer, gratitude, family, and zakat al-fitr before the prayer.",
    suggestedActions: [
      "Confirm Eid prayer time with your local mosque.",
      "Pay zakat al-fitr before Eid prayer if it applies to you.",
      "Keep the day joyful, modest, and grateful.",
    ],
    sourceNotes: [
      "The two Eid festivals are established in the Sunnah.",
      "Eid date depends on local moon sighting or calendar authority.",
    ],
    primaryActionLabel: "Find Mosques",
    primaryActionScreen: "NearbyMosques",
  },
  {
    id: "day-of-arafah",
    name: "Day of Arafah",
    shortName: "Arafah",
    month: 12,
    day: 9,
    icon: "sun",
    colorKey: "blue",
    type: "major",
    dateReliability: "moon-sighting",
    summary:
      "The 9th of Dhul Hijjah is the Day of Arafah, central to Hajj and highly virtuous for non-pilgrims to fast.",
    whyItMatters:
      "For pilgrims, standing at Arafah is the heart of Hajj. For non-pilgrims, fasting this day has a major virtue in authentic hadith.",
    suggestedActions: [
      "Fast if you are not on Hajj and are able.",
      "Increase du'a, dhikr, and takbir.",
      "Use the day to prepare for Eid al-Adha.",
    ],
    sourceNotes: [
      "Authentic hadith mention the virtue of fasting Arafah for non-pilgrims.",
      "Pilgrims follow the Hajj calendar and should follow Hajj guidance.",
    ],
    primaryActionLabel: "Hajj & Umrah",
    primaryActionScreen: "HajjUmrah",
  },
  {
    id: "eid-al-adha",
    name: "Eid al-Adha",
    shortName: "Eid al-Adha",
    month: 12,
    day: 10,
    icon: "gift",
    colorKey: "emerald",
    type: "major",
    dateReliability: "moon-sighting",
    summary:
      "Eid al-Adha begins on the 10th of Dhul Hijjah during the days of sacrifice.",
    whyItMatters:
      "It remembers devotion to Allah, the legacy of Ibrahim and Ismail, and the worship of the Hajj season.",
    suggestedActions: [
      "Confirm Eid prayer and local sacrifice guidance.",
      "Share food, family time, and takbir.",
      "Do not fast on Eid day.",
    ],
    sourceNotes: [
      "Eid al-Adha is one of the two Eid festivals in Islam.",
      "The date follows the Dhul Hijjah moon-sighting authority used by the community.",
    ],
    primaryActionLabel: "Hajj & Umrah",
    primaryActionScreen: "HajjUmrah",
  },
];
