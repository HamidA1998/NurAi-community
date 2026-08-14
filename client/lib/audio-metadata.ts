import { Image } from "react-native";

const NURAI_AUDIO_ARTWORK_URL = Image.resolveAssetSource(
  require("../../assets/images/nurai-logo-refined.png"),
).uri;

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number): string {
  const text = compact(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function compactParts(parts: (string | null | undefined)[]): string {
  return parts
    .map((part) => (part ? compact(part) : ""))
    .filter(Boolean)
    .join(" · ");
}

export function buildQuranAudioMetadata({
  surahName,
  surahNumber,
  verseNumber,
  reciterName,
  mode = "ayah",
  rangeStart,
  rangeEnd,
  sessionLabel,
  offlineLabel,
}: {
  surahName?: string;
  surahNumber: number;
  verseNumber: number;
  reciterName: string;
  mode?: "ayah" | "range" | "auto";
  rangeStart?: number;
  rangeEnd?: number;
  sessionLabel?: string;
  offlineLabel?: string;
}) {
  const readableSurah = compact(surahName || `Surah ${surahNumber}`);
  const title =
    mode === "range" && rangeStart && rangeEnd
      ? `${readableSurah} ${surahNumber}:${rangeStart}-${rangeEnd}`
      : `${readableSurah} ${surahNumber}:${verseNumber}`;
  const modeLabel =
    mode === "range"
      ? "Repeat range"
      : mode === "auto"
        ? "Continuous recitation"
        : "Ayah recitation";
  const albumTitle = compactParts([
    "NurAI Quran",
    modeLabel,
    sessionLabel,
    offlineLabel,
  ]);

  return {
    title: truncate(title, 64),
    artist: truncate(`${reciterName} · Quran recitation`, 64),
    albumTitle: truncate(albumTitle, 96),
    artworkUrl: NURAI_AUDIO_ARTWORK_URL,
  };
}

export function buildNasheedAudioMetadata({
  title,
  artist,
  category,
  coverUrl,
  sessionLabel,
  offlineLabel,
}: {
  title: string;
  artist: string;
  category?: string;
  coverUrl?: string | null;
  sessionLabel?: string;
  offlineLabel?: string;
}) {
  const albumTitle = compactParts([
    "NurAI Nasheeds",
    category,
    sessionLabel,
    offlineLabel,
  ]);

  return {
    title: truncate(title, 64),
    artist: truncate(artist || "NurAI", 64),
    albumTitle: truncate(albumTitle || "NurAI Nasheeds", 96),
    artworkUrl: coverUrl || NURAI_AUDIO_ARTWORK_URL,
  };
}
