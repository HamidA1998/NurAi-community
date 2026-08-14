import React from "react";
import { Circle, G, Path, Rect, Svg } from "react-native-svg";

import { AppIcon, type AppIconName } from "@/components/icons";

const TEAL = "#56B394";
const GOLD = "#CFAE69";
const INK = "#0B1114";

/**
 * The single source of truth for authored Quick Access glyph coverage. The
 * explicit list keeps new Home destinations from silently falling back to a
 * mismatched icon family.
 */
export const QUICK_ACCESS_ICON_IDS = [
  "quran",
  "prayer",
  "qibla",
  "duas",
  "tasbeeh",
  "calendar",
  "adhkar",
  "hifz",
  "reading_plan",
  "99names",
  "zakat",
  "arabic_learning",
  "arabic_games",
  "fiqh",
  "salah_wudu",
  "hajj",
  "timeline",
  "tafsir",
  "library",
  "bookmarks",
  "offline_library",
  "scholar_talks",
  "hadith",
  "prophets",
  "scholars",
  "nasheeds",
  "inspiration",
  "share_cards",
  "streak",
  "hasanat",
  "womens_health",
  "muslim_health",
  "achievements",
  "challenges",
  "community",
  "family",
  "mosques",
  "kids",
  "finance",
  "ramadan",
  "new_muslim",
  "revert_journey",
  "janazah",
  "travel",
] as const;

export type QuickAccessIconId = (typeof QUICK_ACCESS_ICON_IDS)[number];

export function hasQuickAccessIcon(id: string): id is QuickAccessIconId {
  return (QUICK_ACCESS_ICON_IDS as readonly string[]).includes(id);
}

type QuickAccessIconProps = {
  id: string;
  icon: AppIconName;
  size?: number;
  active?: boolean;
};

const line = {
  fill: "none" as const,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * The Quick Access icon family is deliberately authored as one 32pt SVG
 * system: a calm teal structure with one restrained gold signal. Keeping the
 * family here means the Home rail, launchpad and future widgets do not drift
 * into a mixture of unrelated icon libraries.
 */
export function QuickAccessIcon({
  id,
  icon,
  size = 30,
  active = false,
}: QuickAccessIconProps) {
  const primary = active ? "#6FC9A8" : TEAL;
  const accent = active ? "#E8D09A" : GOLD;
  const strokeWidth = active ? 1.85 : 1.7;

  const glyphs: Record<QuickAccessIconId, React.ReactNode> = {
    quran: (
      <>
        <Path
          d="M5.5 7.7c3.8-1.7 7-.9 10.3 2v16c-3.3-2.8-6.5-3.6-10.3-2Z"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M26.5 7.7c-3.8-1.7-7-.9-10.3 2v16c3.3-2.8 6.5-3.6 10.3-2Z"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path d="M16 9.7v16" stroke={accent} strokeWidth="1.4" {...line} />
        <Path
          d="M8.5 11.4h4.1M19.4 11.4h4.1"
          stroke={accent}
          strokeWidth="1"
          {...line}
          opacity="0.7"
        />
      </>
    ),
    prayer: (
      <>
        <Path
          d="M6 25h20M8.2 25v-8.6L16 10l7.8 6.4V25"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M13.3 25v-6h5.4v6"
          stroke={accent}
          strokeWidth="1.55"
          {...line}
        />
        <Path
          d="M21.8 6.8a5.3 5.3 0 0 1-5.7 7.7 6.2 6.2 0 0 0 6.5-8.8Z"
          fill={accent}
          opacity="0.9"
        />
      </>
    ),
    qibla: (
      <>
        <Circle
          cx="16"
          cy="16"
          r="10.7"
          stroke={primary}
          strokeWidth="1.4"
          opacity="0.7"
          {...line}
        />
        <Path d="m16 5.1 4.4 13.3-4.4-2.3-4.4 2.3Z" fill={accent} />
        <Path
          d="M16 2.8v3M16 26.2v3M2.8 16h3M26.2 16h3"
          stroke={primary}
          strokeWidth="1.25"
          {...line}
        />
        <Circle
          cx="16"
          cy="16"
          r="2.1"
          fill={INK}
          stroke={accent}
          strokeWidth="1"
        />
      </>
    ),
    duas: (
      <>
        <Path
          d="M9.1 13.2c0-2.4 1.7-4.1 4-4.1 1.2 0 2.3.5 2.9 1.5.7-1 1.7-1.5 2.9-1.5 2.3 0 4 1.7 4 4.1 0 4.5-6.9 8.8-6.9 8.8s-6.9-4.3-6.9-8.8Z"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M16 10.8v11"
          stroke={accent}
          strokeWidth="1.2"
          {...line}
          opacity="0.82"
        />
        <Path
          d="M7 7.5h2.4M8.2 6.3v2.4M23.5 21.8h2.2"
          stroke={accent}
          strokeWidth="1.2"
          {...line}
        />
      </>
    ),
    tasbeeh: (
      <>
        <Path
          d="M9.2 21a8.6 8.6 0 1 0 9.9-13.8"
          stroke={primary}
          strokeWidth="1.8"
          {...line}
        />
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const angle = (-24 + index * 32) * (Math.PI / 180);
          return (
            <Circle
              key={index}
              cx={16 + Math.cos(angle) * 9.2}
              cy={16 + Math.sin(angle) * 9.2}
              r="1.9"
              fill={index === 2 ? accent : primary}
            />
          );
        })}
        <Path
          d="m23.7 8.4 2.3-2.3"
          stroke={accent}
          strokeWidth="1.7"
          {...line}
        />
      </>
    ),
    calendar: (
      <>
        <Rect
          x="5.2"
          y="7.2"
          width="21.6"
          height="19"
          rx="3.3"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M5.5 12.8h21M10 4.8v5M22 4.8v5"
          stroke={accent}
          strokeWidth="1.5"
          {...line}
        />
        <Circle cx="11" cy="17.5" r="1.2" fill={accent} />
        <Circle cx="16" cy="17.5" r="1.2" fill={primary} />
        <Circle cx="21" cy="17.5" r="1.2" fill={primary} />
        <Circle cx="11" cy="22.5" r="1.2" fill={primary} />
        <Circle cx="16" cy="22.5" r="1.2" fill={accent} />
      </>
    ),
    adhkar: (
      <>
        <Path
          d="M16 5.2a6.9 6.9 0 0 0-6.9 6.9c0 4.1 2.7 5.7 6.9 8.7 4.2-3 6.9-4.6 6.9-8.7A6.9 6.9 0 0 0 16 5.2Z"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
          fill={primary}
          fillOpacity="0.2"
        />
        <Path
          d="M16 8.2v8.4M12.6 11.1h6.8M13.3 14.3h5.4"
          stroke={accent}
          strokeWidth="1.35"
          {...line}
        />
        <Circle cx="16" cy="23.9" r="2" fill={accent} />
      </>
    ),
    hifz: (
      <>
        <Path
          d="M8 5.8h16v21.5l-8-4.4-8 4.4Z"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
          fill={primary}
          fillOpacity="0.18"
        />
        <Path
          d="M12 11.2h8M12 15.2h5.4"
          stroke={accent}
          strokeWidth="1.3"
          {...line}
        />
        <Path
          d="m19.8 18.8 1.9 1.9 3.2-3.5"
          stroke={accent}
          strokeWidth="1.6"
          {...line}
        />
      </>
    ),
    reading_plan: (
      <>
        <Rect
          x="6.2"
          y="7.5"
          width="19.6"
          height="18.5"
          rx="3"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M6.7 12.7h18.6M11 5v4.2M21 5v4.2"
          stroke={accent}
          strokeWidth="1.4"
          {...line}
        />
        <Path
          d="m10.7 18.7 2.1 2.1 4.3-4.8"
          stroke={accent}
          strokeWidth="1.6"
          {...line}
        />
        <Path d="M19.2 19.4h3" stroke={primary} strokeWidth="1.3" {...line} />
      </>
    ),
    "99names": (
      <>
        <Circle
          cx="16"
          cy="16"
          r="10.7"
          stroke={primary}
          strokeWidth="1.45"
          {...line}
        />
        <Path
          d="m16 7.8 2 5.5 5.7 2-5.7 2-2 5.6-2-5.6-5.7-2 5.7-2Z"
          stroke={accent}
          strokeWidth="1.35"
          {...line}
        />
        <Circle cx="16" cy="16" r="2.1" fill={accent} />
      </>
    ),
    zakat: (
      <>
        <Circle
          cx="16"
          cy="12.6"
          r="6.2"
          stroke={accent}
          strokeWidth="1.6"
          {...line}
        />
        <Path
          d="M8 24.8c1.9-4.6 5.1-6.7 8-6.7s6.1 2.1 8 6.7"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M16 9.6v6M13.7 11.7c.6-.8 3.8-.8 4.4.1.7 1-1.1 1.6-2.2 1.8-1.3.2-2.4.8-1.8 1.5.7.8 3.8.8 4.5-.1"
          stroke={primary}
          strokeWidth="1.1"
          {...line}
        />
      </>
    ),
    arabic_learning: (
      <>
        <Path
          d="M8 25c4.3-6.4 5.8-14 5.8-14S17.1 18.5 22.8 25"
          stroke={primary}
          strokeWidth="1.8"
          {...line}
        />
        <Path
          d="M10.7 19.2h9.2M21.7 9.2c1.3 1.1 1.3 3.1-.2 4.3"
          stroke={accent}
          strokeWidth="1.4"
          {...line}
        />
        <Circle cx="22.5" cy="7.1" r="1.7" fill={accent} />
      </>
    ),
    arabic_games: (
      <>
        <Circle
          cx="16"
          cy="16"
          r="10.5"
          stroke={primary}
          strokeWidth="1.5"
          {...line}
        />
        <Path d="m13 10.8 7.8 5.2-7.8 5.2Z" fill={accent} />
        <Path
          d="M7.5 8.4 9 6.8M24.5 8.4 23 6.8"
          stroke={accent}
          strokeWidth="1.4"
          {...line}
        />
      </>
    ),
    fiqh: (
      <>
        <Path
          d="M7.2 7.2h14.2a2.6 2.6 0 0 1 2.6 2.6v15H9.8a2.6 2.6 0 0 1-2.6-2.6Z"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M10.5 12h9.1M10.5 16.3h7.3M10.5 20.5h5.2"
          stroke={accent}
          strokeWidth="1.2"
          {...line}
        />
        <Path
          d="M7.2 7.2v15"
          stroke={accent}
          strokeWidth="1.2"
          {...line}
          opacity="0.65"
        />
      </>
    ),
    salah_wudu: (
      <>
        <Path
          d="M7 24.8h18M9 24.8v-8l7-6 7 6v8"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M16 3.8c0 3.2-3.1 4.4-3.1 6.3a3.1 3.1 0 0 0 6.2 0C19.1 8.2 16 7 16 3.8Z"
          fill={accent}
          opacity="0.88"
        />
        <Path d="M13 24.8v-5h6v5" stroke={accent} strokeWidth="1.3" {...line} />
      </>
    ),
    hajj: (
      <>
        <Path
          d="m6.2 10.2 9.8-4.4 9.8 4.4-9.8 4.4Z"
          fill="#243338"
          stroke={accent}
          strokeWidth="1"
        />
        <Path
          d="M6.2 10.2v11.2l9.8 4.5V14.6ZM16 14.6v11.3l9.8-4.5V10.2Z"
          {...line}
          fill={INK}
          stroke={primary}
          strokeWidth="1.1"
        />
        <Path
          d="M9.5 12.1 16 15l6.5-2.9M10.4 16.4v5.3"
          stroke={accent}
          strokeWidth="1.2"
          {...line}
        />
      </>
    ),
    timeline: (
      <>
        <Path
          d="M9 5.5v21M23 5.5v21M9 9h14M9 16h14M9 23h14"
          stroke={primary}
          strokeWidth="1.35"
          {...line}
        />
        <Circle cx="9" cy="9" r="2.1" fill={accent} />
        <Circle cx="23" cy="16" r="2.1" fill={accent} />
        <Circle cx="9" cy="23" r="2.1" fill={accent} />
      </>
    ),
    tafsir: (
      <>
        <Path
          d="M6.5 8.2h12.9a4 4 0 0 1 4 4v12.3H10.5a4 4 0 0 1-4-4Z"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M10.3 13h8M10.3 17h5.5"
          stroke={accent}
          strokeWidth="1.2"
          {...line}
        />
        <Circle
          cx="23.2"
          cy="22.5"
          r="4.3"
          fill={INK}
          stroke={accent}
          strokeWidth="1.4"
        />
        <Path
          d="m26.3 25.7 2.2 2.2"
          stroke={accent}
          strokeWidth="1.5"
          {...line}
        />
      </>
    ),
    library: (
      <>
        <Path
          d="M7 7.4h12.8a3 3 0 0 1 3 3v15.4H10a3 3 0 0 1-3-3Z"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M10.7 12h8.2M10.7 16.2h7.1M10.7 20.3h5.4"
          stroke={accent}
          strokeWidth="1.2"
          {...line}
        />
        <Path
          d="M7 7.4v15.4"
          stroke={accent}
          strokeWidth="1.1"
          {...line}
          opacity="0.6"
        />
      </>
    ),
    bookmarks: (
      <>
        <Path
          d="M8.3 6.2h15.4v21.2L16 23.1l-7.7 4.3Z"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
          fill={primary}
          fillOpacity="0.16"
        />
        <Path
          d="M12.2 11.5h7.6M12.2 15.3h5.1"
          stroke={accent}
          strokeWidth="1.3"
          {...line}
        />
        <Circle cx="20.7" cy="20.7" r="2.1" fill={accent} />
      </>
    ),
    offline_library: (
      <>
        <Path
          d="M7 7.3h13.6a3 3 0 0 1 3 3v14.8H10a3 3 0 0 1-3-3Z"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M10.7 12.1h7.6M10.7 16h6.2"
          stroke={accent}
          strokeWidth="1.25"
          {...line}
        />
        <Path
          d="M24 19v7M21.5 23.5 24 26l2.5-2.5"
          stroke={accent}
          strokeWidth="1.45"
          {...line}
        />
      </>
    ),
    scholar_talks: (
      <>
        <Circle
          cx="12.2"
          cy="15.3"
          r="8.5"
          fill={primary}
          fillOpacity="0.14"
          stroke={primary}
          strokeWidth={strokeWidth}
        />
        <Path d="m10 11.4 5.8 3.9-5.8 3.9Z" fill={accent} />
        <Path
          d="M20.5 7.1h3.8M20.5 11.1h2.3M20.5 23.7h4"
          stroke={accent}
          strokeWidth="1.3"
          {...line}
        />
      </>
    ),
    hadith: (
      <>
        <Path
          d="M7 8.1h12.4a3 3 0 0 1 3 3v14.7H10a3 3 0 0 1-3-3Z"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M11 13.2c-2.1-1.5-2.8 1.7-.8 2.2 1.7.4 2.1 2.9.2 3.1-1.1.1-1.8-.5-2.2-1.1M17 13.2c-2.1-1.5-2.8 1.7-.8 2.2 1.7.4 2.1 2.9.2 3.1-1.1.1-1.8-.5-2.2-1.1"
          stroke={accent}
          strokeWidth="1.25"
          {...line}
        />
      </>
    ),
    prophets: (
      <>
        <Path
          d="M7 8.1h12.4a3 3 0 0 1 3 3v14.7H10a3 3 0 0 1-3-3Z"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Circle
          cx="16"
          cy="14.3"
          r="2.8"
          stroke={accent}
          strokeWidth="1.2"
          {...line}
        />
        <Path
          d="M11.7 21.4c1-3.2 7.6-3.2 8.6 0M16 6V3.7M12.8 5.2 16 2.8l3.2 2.4"
          stroke={accent}
          strokeWidth="1.2"
          {...line}
        />
      </>
    ),
    scholars: (
      <>
        <Circle
          cx="16"
          cy="12"
          r="4.1"
          stroke={primary}
          strokeWidth="1.5"
          {...line}
        />
        <Path
          d="M8.2 26c1.4-6 4.1-8.4 7.8-8.4s6.4 2.4 7.8 8.4"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M10.7 8.3 16 5.2l5.3 3.1-5.3 2.4Z"
          fill={accent}
          opacity="0.9"
        />
        <Path d="M21.3 8.2v4.1" stroke={accent} strokeWidth="1.2" {...line} />
      </>
    ),
    nasheeds: (
      <>
        <Path
          d="M8.2 21.8V9.7l13-3.2v12.2"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M8.2 21.8a3.2 3.2 0 1 0 3.2-3.2M21.2 18.7a3.2 3.2 0 1 0 3.2-3.2"
          stroke={accent}
          strokeWidth="1.5"
          {...line}
        />
        <Path
          d="M8.2 13.1 21.2 9.9"
          stroke={accent}
          strokeWidth="1.2"
          {...line}
        />
      </>
    ),
    inspiration: (
      <>
        <Circle
          cx="16"
          cy="16"
          r="5.3"
          stroke={accent}
          strokeWidth="1.5"
          {...line}
        />
        <Path
          d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M25.2 6.8l-2.8 2.8M9.6 22.4l-2.8 2.8"
          stroke={primary}
          strokeWidth="1.35"
          {...line}
        />
      </>
    ),
    share_cards: (
      <>
        <Circle cx="9" cy="16" r="3" fill={accent} />
        <Circle cx="23" cy="8" r="3" fill={primary} />
        <Circle cx="23" cy="24" r="3" fill={primary} />
        <Path
          d="m11.7 14.5 8.5-5M11.7 17.5l8.5 5"
          stroke={accent}
          strokeWidth="1.5"
          {...line}
        />
      </>
    ),
    streak: (
      <>
        <Path
          d="M17.5 4.8c.5 4-2.6 5.4-2.5 8.4.1 2.2 1.8 3.6 3.7 3.4 1.8-.2 2.8-1.7 2.4-3.5 3.2 2.2 4.2 5.7 2.7 8.5-1.5 2.8-4.7 4.5-8.4 4.1-4.5-.5-7.6-3.9-7.1-8.1.5-4.2 3.9-6.5 5.3-9.3.8-1.6.7-3.1.7-4.7 1.3.4 2.4.8 3.2 1.2Z"
          {...line}
          stroke={primary}
          strokeWidth="1.45"
          fill={accent}
          fillOpacity="0.18"
        />
        <Path
          d="M15.9 17.2c-1.7 1.6-2.8 3-2.2 4.6.4 1.2 1.5 1.9 2.8 1.7 1.5-.2 2.3-1.4 1.8-2.8-.5-1.4-1.4-2.4-2.4-3.5Z"
          fill={accent}
        />
      </>
    ),
    hasanat: (
      <>
        <Circle
          cx="16"
          cy="12.8"
          r="7.2"
          stroke={accent}
          strokeWidth="1.5"
          {...line}
        />
        <Path
          d="m12.5 19.2-2 8 5.5-3 5.5 3-2-8"
          stroke={primary}
          strokeWidth="1.45"
          {...line}
        />
        <Path
          d="m16 8.4 1.2 2.7 2.9.2-2.2 1.9.7 2.8-2.6-1.5-2.6 1.5.7-2.8-2.2-1.9 2.9-.2Z"
          fill={accent}
        />
      </>
    ),
    womens_health: (
      <>
        <Path
          d="M16 26.2s-8.2-5.1-8.2-11.2c0-3.3 2.3-5.5 5.2-5.5 1.6 0 2.6.7 3 1.8.4-1.1 1.4-1.8 3-1.8 2.9 0 5.2 2.2 5.2 5.5 0 6.1-8.2 11.2-8.2 11.2Z"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M21.7 4.4a5.5 5.5 0 0 0-6 8 6.2 6.2 0 0 1 7.1-7.3Z"
          fill={accent}
          opacity="0.9"
        />
      </>
    ),
    muslim_health: (
      <>
        <Path
          d="M6.7 17.2h4l2.1-5.6 3.1 9.1 2.1-5.4h7.3"
          stroke={accent}
          strokeWidth="1.65"
          {...line}
        />
        <Path
          d="M16 5.3c-4.5-4.1-10.1-.8-9.3 3.6.8 4.8 9.3 10.5 9.3 10.5s8.5-5.7 9.3-10.5c.8-4.4-4.8-7.7-9.3-3.6Z"
          stroke={primary}
          strokeWidth="1.25"
          {...line}
          opacity="0.75"
        />
      </>
    ),
    achievements: (
      <>
        <Circle
          cx="16"
          cy="12.5"
          r="7.1"
          stroke={accent}
          strokeWidth="1.45"
          {...line}
        />
        <Path
          d="M11.8 18.5 10 27l6-3.1 6 3.1-1.8-8.5"
          stroke={primary}
          strokeWidth="1.4"
          {...line}
        />
        <Path
          d="m16 8.5 1.1 2.5 2.7.2-2 1.7.6 2.6-2.4-1.4-2.4 1.4.6-2.6-2-1.7 2.7-.2Z"
          fill={accent}
        />
      </>
    ),
    challenges: (
      <>
        <Circle
          cx="16"
          cy="16"
          r="10.7"
          stroke={primary}
          strokeWidth="1.4"
          {...line}
        />
        <Circle
          cx="16"
          cy="16"
          r="5.8"
          stroke={accent}
          strokeWidth="1.45"
          {...line}
        />
        <Circle cx="16" cy="16" r="2" fill={accent} />
        <Path
          d="M16 2.8v3M16 26.2v3M2.8 16h3M26.2 16h3"
          stroke={primary}
          strokeWidth="1.2"
          {...line}
        />
      </>
    ),
    community: (
      <>
        <Circle
          cx="11"
          cy="12"
          r="3.5"
          stroke={primary}
          strokeWidth="1.4"
          {...line}
        />
        <Circle
          cx="21.5"
          cy="13.2"
          r="2.8"
          stroke={accent}
          strokeWidth="1.35"
          {...line}
        />
        <Path
          d="M5.7 25c.8-4.5 2.8-6.4 5.3-6.4s4.5 1.9 5.3 6.4M18.1 20c2.6-.7 5.2.9 6.1 4.7"
          stroke={primary}
          strokeWidth="1.45"
          {...line}
        />
      </>
    ),
    family: (
      <>
        <Circle
          cx="16"
          cy="10"
          r="3.5"
          stroke={accent}
          strokeWidth="1.35"
          {...line}
        />
        <Circle
          cx="8.2"
          cy="13.2"
          r="2.6"
          stroke={primary}
          strokeWidth="1.25"
          {...line}
        />
        <Circle
          cx="23.8"
          cy="13.2"
          r="2.6"
          stroke={primary}
          strokeWidth="1.25"
          {...line}
        />
        <Path
          d="M10.5 26c.9-5 2.7-7.2 5.5-7.2s4.6 2.2 5.5 7.2M3.8 25c.6-3.7 2-5.3 4.4-5.3M23.8 19.7c2.4 0 3.8 1.6 4.4 5.3"
          stroke={primary}
          strokeWidth="1.35"
          {...line}
        />
      </>
    ),
    mosques: (
      <>
        <Path
          d="M6 25h20M8.2 25v-8.1h15.6V25M7 16.9h18"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M11.2 16.8c.3-4.2 2.1-6.7 4.8-8.1 2.7 1.4 4.5 3.9 4.8 8.1M16 5.5v-2.7M16 2.8l-2 1.4M16 2.8l2 1.4"
          stroke={accent}
          strokeWidth="1.3"
          {...line}
        />
        <Path
          d="M14.2 25v-4.8h3.6V25"
          stroke={accent}
          strokeWidth="1.25"
          {...line}
        />
      </>
    ),
    kids: (
      <>
        <Circle
          cx="16"
          cy="16"
          r="10.5"
          stroke={primary}
          strokeWidth="1.45"
          {...line}
        />
        <Circle cx="12.2" cy="14" r="1.3" fill={accent} />
        <Circle cx="19.8" cy="14" r="1.3" fill={accent} />
        <Path
          d="M11.3 19.1c2.7 2.2 6.7 2.2 9.4 0"
          stroke={accent}
          strokeWidth="1.35"
          {...line}
        />
      </>
    ),
    finance: (
      <>
        <Circle
          cx="11.3"
          cy="12.2"
          r="6.1"
          stroke={accent}
          strokeWidth="1.45"
          {...line}
        />
        <Path
          d="M8.8 12.2h5M11.3 9.8v4.8M18.1 9.3v14.4M23.1 14v9.7M28 18.2v5.5"
          stroke={primary}
          strokeWidth="1.5"
          {...line}
        />
        <Path d="M16.2 23.7h12" stroke={accent} strokeWidth="1.1" {...line} />
      </>
    ),
    ramadan: (
      <>
        <Path
          d="M19.7 5.1a8.7 8.7 0 1 0 2.7 15.8 9.7 9.7 0 0 1-2.7-15.8Z"
          fill={accent}
          opacity="0.9"
        />
        <Path
          d="M7.5 25h17M10 21h12M12.2 21v4M19.8 21v4"
          stroke={primary}
          strokeWidth="1.3"
          {...line}
        />
        <Path
          d="M16 24.8v-5.1M13.5 17.2h5M14.3 17.2c.3-1.7.9-2.7 1.7-3.6.8.9 1.4 1.9 1.7 3.6"
          stroke={accent}
          strokeWidth="1.2"
          {...line}
        />
      </>
    ),
    new_muslim: (
      <>
        <Path
          d="M8 26V13.2a8 8 0 0 1 16 0V26"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
          fill={primary}
          fillOpacity="0.14"
        />
        <Path
          d="M12.7 26v-7.6h6.6V26"
          stroke={accent}
          strokeWidth="1.4"
          {...line}
        />
        <Path
          d="M16 5.2v3.2M14.4 6.8h3.2"
          stroke={accent}
          strokeWidth="1.3"
          {...line}
        />
      </>
    ),
    revert_journey: (
      <>
        <Path
          d="M7 23.7c4.2-7.3 9.2-10.9 18-12.8"
          stroke={primary}
          strokeWidth="2"
          {...line}
        />
        <Path
          d="m19.8 7.2 5.4 3.7-4.3 5"
          stroke={accent}
          strokeWidth="1.65"
          {...line}
        />
        <Circle cx="8.3" cy="24.2" r="2.5" fill={accent} />
        <Circle cx="25.3" cy="10.4" r="2.1" fill={primary} />
      </>
    ),
    janazah: (
      <>
        <Path
          d="M7 25h18M9.2 25v-8.2L16 11l6.8 5.8V25"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path
          d="M13.2 25v-5.3h5.6V25"
          stroke={accent}
          strokeWidth="1.35"
          {...line}
        />
        <Path
          d="M12.4 7.8h7.2M16 5.2v5.2"
          stroke={accent}
          strokeWidth="1.3"
          {...line}
        />
      </>
    ),
    travel: (
      <>
        <Circle
          cx="16"
          cy="16"
          r="9.7"
          stroke={primary}
          strokeWidth={strokeWidth}
          {...line}
        />
        <Path d="m16 7.1 3.2 8.2-3.2-1.7-3.2 1.7Z" fill={accent} />
        <Path
          d="M16 2.9v3M16 26.1v3M2.9 16h3M26.1 16h3"
          stroke={accent}
          strokeWidth="1.2"
          {...line}
        />
        <Path d="M22.7 25.2h4.1" stroke={primary} strokeWidth="1.6" {...line} />
      </>
    ),
  };

  const glyph = hasQuickAccessIcon(id) ? glyphs[id] : undefined;
  if (!glyph) {
    return (
      <AppIcon name={icon} size={Math.max(16, size * 0.68)} color={TEAL} />
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G>{glyph}</G>
    </Svg>
  );
}
