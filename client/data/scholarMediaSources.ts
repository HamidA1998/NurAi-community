import type { AppIconName } from "@/components/icons";
import type { CategoryColors } from "@/constants/theme";

export type ScholarMediaSource = {
  id: string;
  title: string;
  subtitle: string;
  focus: string;
  url: string;
  icon: AppIconName;
  colorKey: keyof typeof CategoryColors;
  trustNote: string;
};

export const SCHOLAR_MEDIA_SOURCES: ScholarMediaSource[] = [
  {
    id: "yaqeen-institute",
    title: "Yaqeen Institute",
    subtitle: "Research, spirituality, seerah, and modern questions",
    focus: "Faith, seerah, doubts, Ramadan series",
    url: "https://www.youtube.com/@yaqeeninstituteofficial",
    icon: "book-open",
    colorKey: "emerald",
    trustNote:
      "Opens the official channel so you can explore the newest lessons directly from the source.",
  },
  {
    id: "bayyinah",
    title: "Bayyinah",
    subtitle: "Quran reflections and Arabic learning",
    focus: "Quran language, tafsir reflections, Arabic",
    url: "https://www.youtube.com/@bayyinah",
    icon: "type",
    colorKey: "blue",
    trustNote:
      "A strong place for Quran reflection, Arabic foundations, and deeper language study.",
  },
  {
    id: "mufti-menk",
    title: "Mufti Menk",
    subtitle: "Short reminders, lectures, and practical advice",
    focus: "Daily reminders, character, family, motivation",
    url: "https://www.youtube.com/@muftimenkofficial",
    icon: "mic",
    colorKey: "amber",
    trustNote:
      "Helpful for everyday reminders; personal rulings should still be checked with a qualified scholar.",
  },
  {
    id: "onepath-network",
    title: "OnePath Network",
    subtitle: "Documentaries, reminders, and Muslim stories",
    focus: "Stories, documentaries, family-friendly reminders",
    url: "https://www.youtube.com/@OnePathNetwork",
    icon: "play-circle",
    colorKey: "purple",
    trustNote:
      "Family-friendly stories, documentaries, and reminders from the official channel.",
  },
];
