import React, { memo } from "react";
import Svg, { Circle, Path } from "react-native-svg";

export interface CustomIconProps {
  size?: number;
  color?: string;
  accentColor?: string;
  strokeWidth?: number;
  opacity?: number;
  accented?: boolean;
}

/**
 * Shared 24x24 shell for the NurAI-authored custom mark set. Bold, filled
 * silhouettes (not thin uniform outlines) so each mark carries real visual
 * weight at 16-24px inline sizes — matches the SolidIcon treatment in
 * PremiumSvgs.tsx. Gold accent is reserved for one small sacred/premium
 * detail per icon, never the whole glyph. Every icon here is deliberately
 * non-figurative: geometric or botanical motifs only, nothing that depicts
 * a person, prophet, or angel.
 */
function Shell({
  size = 24,
  opacity = 1,
  children,
}: CustomIconProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      {children}
    </Svg>
  );
}

/** 99 Names of Allah — a filled eight-point geometric rosette, the
 * traditional non-figurative Islamic motif for divine-attribute content. */
export const NamesOfAllahIcon = memo(function NamesOfAllahIcon(
  props: CustomIconProps,
) {
  const color = props.color || "#56B394";
  const gold = props.accentColor || "#D6A84F";
  return (
    <Shell {...props}>
      <Path
        d="M12 2.2 13.6 8l5.8-2.2L15.9 11l5.9 1.2-5.9 1.2 3.5 5.2L13.6 16 12 21.8 10.4 16l-5.8 2.6L8.1 13.4 2.2 12.2 8.1 11 4.6 5.8 10.4 8Z"
        fill={color}
      />
      <Circle cx="12" cy="12" r="3" fill={gold} />
      <Circle cx="12" cy="12" r="1.15" fill="#0B120F" opacity="0.28" />
    </Shell>
  );
});

/** Mosque — a filled dome + twin-minaret silhouette for nav-weight contexts
 * (the existing EmptyMosqueSvg stays as the larger empty-state artwork). */
export const MosqueIcon = memo(function MosqueIcon(props: CustomIconProps) {
  const color = props.color || "#56B394";
  const gold = props.accentColor || "#D6A84F";
  return (
    <Shell {...props}>
      <Path
        d="M2.6 20v-5.6c0-2.6 1.7-3.8 2.9-5C6.6 8 7.7 6.6 8.4 5c.7 1.6 1.8 3 2.9 4.4 1.2 1.2 2.9 2.4 2.9 5V20Z"
        fill={color}
        opacity="0.4"
      />
      <Path d="M6.3 20v-9.2a2.2 2.2 0 0 1 4.4 0V20Z" fill={color} />
      <Path d="M13.3 20v-9.2a2.2 2.2 0 0 1 4.4 0V20Z" fill={color} />
      <Path
        d="M9.5 20v-4.6a2.5 2.5 0 0 1 5 0V20Z"
        fill="#0B120F"
        opacity="0.24"
      />
      <Circle cx="8.5" cy="8.6" r="1.35" fill={gold} />
      <Circle cx="15.5" cy="8.6" r="1.35" fill={gold} />
      <Path
        d="M2 20.4h20"
        stroke={gold}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Shell>
  );
});

/** Kaaba — a filled draped cube with a gold kiswah band, the universal
 * restrained representation used for Qibla/Hajj contexts. */
export const KaabaIcon = memo(function KaabaIcon(props: CustomIconProps) {
  const color = props.color || "#56B394";
  const gold = props.accentColor || "#D6A84F";
  return (
    <Shell {...props}>
      <Path d="M4.4 8 12 5.2 19.6 8v9L12 19.8 4.4 17Z" fill={color} />
      <Path
        d="M4.4 8 12 10.8 19.6 8"
        fill="none"
        stroke="#0B120F"
        strokeOpacity="0.24"
        strokeWidth="1.3"
      />
      <Path
        d="M12 10.8v9"
        stroke="#0B120F"
        strokeOpacity="0.24"
        strokeWidth="1.3"
      />
      <Path
        d="M4.4 12.2h6.4M13.2 12.2h6.4"
        stroke={gold}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </Shell>
  );
});

/** Moon — a filled crescent with a small star, for Islamic calendar /
 * Hijri date contexts. The one deliberate crescent in the set. */
export const MoonIcon = memo(function MoonIcon(props: CustomIconProps) {
  const color = props.color || "#56B394";
  const gold = props.accentColor || "#D6A84F";
  return (
    <Shell {...props}>
      <Path
        d="M15.5 3.5A8.7 8.7 0 1 0 19.8 18.2 10.3 10.3 0 0 1 15.5 3.5Z"
        fill={color}
      />
      <Path
        d="M18.6 6.4 19.3 8.5 21.3 8.9 19.7 10.2 20.1 12.2 18.6 11 17.1 12.2 17.5 10.2 15.9 8.9 17.9 8.5Z"
        fill={gold}
      />
    </Shell>
  );
});

/** Women's space — a filled soft five-petal blossom, a traditional textile
 * motif, used instead of any figurative depiction. */
export const WomenSpaceIcon = memo(function WomenSpaceIcon(
  props: CustomIconProps,
) {
  const color = props.color || "#56B394";
  const gold = props.accentColor || "#D6A84F";
  return (
    <Shell {...props}>
      <Path
        d="M12 4.4c1.7 0 2.9 1.3 2.9 2.9 0 .9-.4 1.7-1 2.3 1-.2 2.1 0 2.9.8 1.2 1.2 1.2 3 0 4.2-1.2 1.2-3 1.2-4.2 0-.4-.4-.7-1-.8-1.5-.2.6-.5 1.1-1 1.5-1.2 1.2-3 1.2-4.2 0-1.2-1.2-1.2-3 0-4.2.8-.8 1.9-1 2.9-.8-.6-.6-1-1.4-1-2.3 0-1.6 1.2-2.9 2.5-2.9Z"
        fill={color}
      />
      <Circle cx="12" cy="10" r="1.7" fill={gold} />
      <Path
        d="M12 15.4v4.2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Shell>
  );
});

/** Men's space — a filled eight-point compass star, echoing the geometric
 * language rather than a figure. */
export const MenSpaceIcon = memo(function MenSpaceIcon(props: CustomIconProps) {
  const color = props.color || "#56B394";
  const gold = props.accentColor || "#D6A84F";
  return (
    <Shell {...props}>
      <Path
        d="M12 2.6 13.9 9l6.5 1.8L13.9 12.6 12 19 10.1 12.6 3.6 10.8 10.1 9Z"
        fill={color}
      />
      <Circle cx="12" cy="10.4" r="2" fill={gold} />
    </Shell>
  );
});

/** Health — a filled heart with a bold pulse notch cut through it. */
export const HealthIcon = memo(function HealthIcon(props: CustomIconProps) {
  const color = props.color || "#56B394";
  const gold = props.accentColor || "#D6A84F";
  return (
    <Shell {...props}>
      <Path
        d="M12 19.8s-7.4-4.6-9.4-9.2C1.3 7.3 3.3 4.4 6.6 4.4c2 0 3.4 1 3.9 1.9.5-.9 1.9-1.9 3.9-1.9 3.3 0 5.3 2.9 4 6.2-2 4.6-9.4 9.2-9.4 9.2Z"
        fill={color}
      />
      <Path
        d="M5.4 12h2.5l1.4-2.6 1.8 5 1.3-2.4h4.2"
        stroke={gold}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Shell>
  );
});

/** Charity / Zakat — a filled open giving box with a floating gold heart. */
export const CharityIcon = memo(function CharityIcon(props: CustomIconProps) {
  const color = props.color || "#56B394";
  const gold = props.accentColor || "#D6A84F";
  return (
    <Shell {...props}>
      <Path
        d="M4 10.8h16v7.7a1.2 1.2 0 0 1-1.2 1.2H5.2A1.2 1.2 0 0 1 4 18.5Z"
        fill={color}
      />
      <Path
        d="M3 8.3a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.5H3Z"
        fill={color}
        opacity="0.7"
      />
      <Path
        d="M12 7.2V6"
        stroke={gold}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path
        d="M12 4.7c-.5-.7-1.2-1.1-1.9-.8-.8.3-1 1.2-.4 1.8.4.4 1.3.6 2.3.9 1-.3 1.9-.5 2.3-.9.6-.6.4-1.5-.4-1.8-.7-.3-1.4.1-1.9.8Z"
        fill={gold}
      />
    </Shell>
  );
});

/** Reflection / journal — a filled open notebook, distinct from the
 * closed-block Hadith mark. */
export const ReflectionIcon = memo(function ReflectionIcon(
  props: CustomIconProps,
) {
  const color = props.color || "#56B394";
  const gold = props.accentColor || "#D6A84F";
  return (
    <Shell {...props}>
      <Path
        d="M12 6.8c-1.7-1-4.1-1.3-6.1-.8v11.3c2-.5 4.4-.2 6.1.8 1.7-1 4.1-1.3 6.1-.8V6c-2-.5-4.4-.2-6.1.8Z"
        fill={color}
      />
      <Path
        d="M12 6.8v11.3"
        stroke="#0B120F"
        strokeOpacity="0.24"
        strokeWidth="1.4"
      />
      <Path
        d="M6.9 9.7c1.2-.2 2.5 0 3.6.5M6.9 12.7c1.2-.2 2.5 0 3.6.5"
        stroke={gold}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </Shell>
  );
});

/** Progress — three filled ascending bars tracing a gentle rise. */
export const ProgressIcon = memo(function ProgressIcon(props: CustomIconProps) {
  const color = props.color || "#56B394";
  const gold = props.accentColor || "#D6A84F";
  return (
    <Shell {...props}>
      <Path d="M4.6 20v-5a1.4 1.4 0 0 1 2.8 0v5Z" fill={color} opacity="0.65" />
      <Path
        d="M10.6 20V9.4a1.4 1.4 0 0 1 2.8 0V20Z"
        fill={color}
        opacity="0.85"
      />
      <Path d="M16.6 20V6a1.4 1.4 0 0 1 2.8 0v14Z" fill={color} />
      <Path
        d="M4 21h16"
        stroke={gold}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </Shell>
  );
});

/** Home — a calm mihrab-like doorway and rising point of light. This keeps
 * the primary tab recognisably "home" without falling back to a generic
 * suburban house silhouette. */
export const HomeMarkIcon = memo(function HomeMarkIcon(props: CustomIconProps) {
  const color = props.color || "#56B394";
  const accent = props.accented ? props.accentColor || "#D6A84F" : color;
  return (
    <Shell {...props}>
      <Path
        d="M4.2 20V10.6L12 4.1l7.8 6.5V20h-5.2v-5.1a2.6 2.6 0 0 0-5.2 0V20Z"
        fill={color}
      />
      <Path
        d="M12 7.1c1.2 0 2.1.9 2.1 2.1H9.9c0-1.2.9-2.1 2.1-2.1Z"
        fill="#071916"
        opacity="0.28"
      />
      <Circle cx="17.8" cy="6.1" r="1.15" fill={accent} />
    </Shell>
  );
});

/** Explore — an eight-point wayfinding rose with a focused inner needle,
 * combining discovery with NurAI's restrained geometric language. */
export const ExploreMarkIcon = memo(function ExploreMarkIcon(
  props: CustomIconProps,
) {
  const color = props.color || "#56B394";
  const accent = props.accented ? props.accentColor || "#D6A84F" : color;
  return (
    <Shell {...props}>
      <Circle cx="12" cy="12" r="8.2" fill={color} opacity="0.3" />
      <Path d="m15.9 7.2-2.1 6.6-6.6 2.1 2.1-6.6Z" fill={color} />
      <Circle cx="12" cy="12" r="1.55" fill={accent} />
      <Path
        d="M12 2.8v1.7M12 19.5v1.7M2.8 12h1.7M19.5 12h1.7"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Shell>
  );
});

/** More — a compact four-lobed geometric menu mark. It remains legible as
 * "more" at tab size while looking authored rather than like an ellipsis. */
export const MoreMarkIcon = memo(function MoreMarkIcon(props: CustomIconProps) {
  const color = props.color || "#56B394";
  const accent = props.accented ? props.accentColor || "#D6A84F" : color;
  return (
    <Shell {...props}>
      <Path
        d="M5.2 4h4.2v6H4V5.2C4 4.5 4.5 4 5.2 4Zm9.4 0h4.2c.7 0 1.2.5 1.2 1.2v4.2h-5.4ZM4 14.6h5.4V20H5.2C4.5 20 4 19.5 4 18.8Zm10.6 0H20v4.2c0 .7-.5 1.2-1.2 1.2h-4.2Z"
        fill={color}
      />
      <Circle cx="12" cy="12" r="1.45" fill={accent} />
    </Shell>
  );
});
