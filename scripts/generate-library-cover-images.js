#!/usr/bin/env node
/* eslint-env node */
/* global __dirname */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets", "book-covers");
const TMP_DIR = path.join(OUT_DIR, ".tmp");

const COVERS = [
  {
    id: "daily-quran-companion",
    title: "Daily Quran Companion",
    subtitle: "Read, reflect, and live one ayah at a time",
    category: "Quran",
    code: "QUR",
    palette: ["#042F2E", "#065F46", "#07111F"],
    accent: "#34D399",
  },
  {
    id: "names-of-allah-for-daily-life",
    title: "Names of Allah for Daily Life",
    subtitle: "Turn knowledge into dua, hope, and action",
    category: "Duas & Dhikr",
    code: "DHR",
    palette: ["#422006", "#5F3F13", "#07111F"],
    accent: "#F5C76B",
  },
  {
    id: "jumuah-reset",
    title: "Jumuah Reset",
    subtitle: "Let Friday renew your week",
    category: "Worship",
    code: "SLH",
    palette: ["#0B2447", "#064E3B", "#07111F"],
    accent: "#7DD3FC",
  },
  {
    id: "masjid-etiquette",
    title: "Masjid Etiquette",
    subtitle: "Enter Allah's houses with adab",
    category: "Character",
    code: "ADB",
    palette: ["#111827", "#1E293B", "#07111F"],
    accent: "#CBD5E1",
  },
  {
    id: "phone-detox-for-the-muslim-heart",
    title: "Phone Detox for the Muslim Heart",
    subtitle: "Win back attention, time, and purity",
    category: "Modern Life",
    code: "MOD",
    palette: ["#2E1065", "#3B1C72", "#07111F"],
    accent: "#C4B5FD",
  },
  {
    id: "the-muslim-teen-survival-guide",
    title: "The Muslim Teen Survival Guide",
    subtitle: "Faith, friends, school, pressure, and identity",
    category: "Youth",
    code: "MOD",
    palette: ["#0B2447", "#1D4E89", "#07111F"],
    accent: "#7DD3FC",
  },
  {
    id: "dawah-with-wisdom",
    title: "Dawah With Wisdom",
    subtitle: "Speak clearly without losing mercy",
    category: "Reverts",
    code: "NEW",
    palette: ["#064E3B", "#0F766E", "#07111F"],
    accent: "#34D399",
  },
  {
    id: "stories-of-the-prophets",
    title: "Stories of the Prophets",
    subtitle: "Lessons for courage, mercy, and patience today",
    category: "Character",
    code: "SIR",
    palette: ["#422006", "#4A3514", "#07111F"],
    accent: "#F5C76B",
  },
  {
    id: "jannah-and-the-real-life",
    title: "Jannah and the Real Life",
    subtitle: "Let the Hereafter shape today's decisions",
    category: "Akhirah",
    code: "AKH",
    palette: ["#111827", "#334155", "#07111F"],
    accent: "#CBD5E1",
  },
  {
    id: "quran-reflection-journal",
    title: "Quran Reflection Journal",
    subtitle: "A guided notebook for meaning and action",
    category: "Quran",
    code: "QUR",
    palette: ["#042F2E", "#064E3B", "#0A1120"],
    accent: "#34D399",
  },
  {
    id: "parent-dua-journal",
    title: "Parent Dua Journal",
    subtitle: "Pray, model, and guide with mercy",
    category: "Family",
    code: "FAM",
    palette: ["#4C0519", "#7F1D1D", "#07111F"],
    accent: "#FDA4AF",
  },
  {
    id: "halal-food-and-everyday-choices",
    title: "Halal Food and Everyday Choices",
    subtitle: "Eat, ask, and choose with calm responsibility",
    category: "Worship",
    code: "FIQ",
    palette: ["#422006", "#854D0E", "#07111F"],
    accent: "#F5C76B",
  },
  {
    id: "workplace-character-for-muslims",
    title: "Workplace Character for Muslims",
    subtitle: "Honesty, excellence, prayer, and trust at work",
    category: "Wealth & Work",
    code: "WRK",
    palette: ["#0B2447", "#164E63", "#07111F"],
    accent: "#7DD3FC",
  },
  {
    id: "loneliness-community-and-belonging",
    title: "Loneliness, Community, and Belonging",
    subtitle: "Find connection without losing yourself",
    category: "Character",
    code: "ADB",
    palette: ["#2E1065", "#4338CA", "#07111F"],
    accent: "#C4B5FD",
  },
  {
    id: "prophetic-character-practice-book",
    title: "Prophetic Character Practice Book",
    subtitle: "Practise mercy, truth, patience, and service",
    category: "Seerah",
    code: "SIR",
    palette: ["#422006", "#713F12", "#07111F"],
    accent: "#F5C76B",
  },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapWords(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function tspans(lines, x, y, size, gap) {
  return lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : gap;
      return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");
}

function svgForCover(cover) {
  const [top, mid, bottom] = cover.palette;
  const titleLines = wrapWords(cover.title, 18);
  const subtitleLines = wrapWords(cover.subtitle, 36);
  const titleY = titleLines.length > 2 ? 555 : 590;
  const subtitleY = titleY + titleLines.length * 86 + 34;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="900" height="1350" viewBox="0 0 900 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${top}"/>
      <stop offset="48%" stop-color="${mid}"/>
      <stop offset="100%" stop-color="${bottom}"/>
    </linearGradient>
    <radialGradient id="light" cx="50%" cy="26%" r="72%">
      <stop offset="0%" stop-color="${cover.accent}" stop-opacity="0.34"/>
      <stop offset="46%" stop-color="${cover.accent}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="54" height="54" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="1.7" fill="${cover.accent}" opacity="0.26"/>
    </pattern>
  </defs>
  <rect width="900" height="1350" fill="url(#bg)"/>
  <rect width="900" height="1350" fill="url(#light)"/>
  <rect width="900" height="1350" fill="url(#dots)" opacity="0.54"/>
  <path d="M450 168 C586 168 696 278 696 414 L696 1128 L204 1128 L204 414 C204 278 314 168 450 168Z" fill="none" stroke="${cover.accent}" stroke-opacity="0.24" stroke-width="3"/>
  <path d="M450 244 C546 244 624 322 624 418 L624 1058 L276 1058 L276 418 C276 322 354 244 450 244Z" fill="none" stroke="#FFFFFF" stroke-opacity="0.10" stroke-width="2"/>
  <path d="M116 116 L784 116 L784 1234 L116 1234 Z" fill="none" stroke="${cover.accent}" stroke-opacity="0.32" stroke-width="3"/>
  <path d="M154 154 L746 154 L746 1196 L154 1196 Z" fill="none" stroke="#FFFFFF" stroke-opacity="0.10" stroke-width="1.5"/>
  <circle cx="450" cy="375" r="72" fill="${cover.accent}" opacity="0.13"/>
  <path d="M450 292 L532 375 L450 458 L368 375 Z" fill="none" stroke="${cover.accent}" stroke-opacity="0.62" stroke-width="4"/>
  <path d="M412 375 H488 M450 337 V413" stroke="#FFFFFF" stroke-opacity="0.72" stroke-width="6" stroke-linecap="round"/>
  <text x="450" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="8" fill="${cover.accent}">
    NURAI EXCLUSIVE
  </text>
  <text x="450" y="${titleY}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="68" font-weight="700" fill="#FFF9EE">
    ${tspans(titleLines, 450, titleY, 68, 82)}
  </text>
  <text x="450" y="${subtitleY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="500" fill="#E5E7EB" opacity="0.88">
    ${tspans(subtitleLines, 450, subtitleY, 28, 42)}
  </text>
  <g transform="translate(450 1045)">
    <rect x="-76" y="-30" width="152" height="60" rx="30" fill="${cover.accent}" opacity="0.16" stroke="${cover.accent}" stroke-opacity="0.45" stroke-width="2"/>
    <text x="0" y="10" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="4" fill="${cover.accent}">${cover.code}</text>
  </g>
  <text x="450" y="1172" text-anchor="middle" font-family="Arial, sans-serif" font-size="21" font-weight="800" letter-spacing="6" fill="#FFFFFF" opacity="0.78">
    ${escapeXml(cover.category.toUpperCase())}
  </text>
  <text x="450" y="1230" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${cover.accent}" opacity="0.92">
    NURAI ORIGINAL EDITION
  </text>
</svg>`;
}

function main() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  for (const cover of COVERS) {
    const svgPath = path.join(TMP_DIR, `${cover.id}.svg`);
    const pngPath = path.join(OUT_DIR, `${cover.id}.png`);
    fs.writeFileSync(svgPath, svgForCover(cover));
    execFileSync(
      "/usr/bin/sips",
      ["-s", "format", "png", svgPath, "--out", pngPath],
      {
        stdio: "inherit",
      },
    );
  }
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  console.log(`Generated ${COVERS.length} library cover image(s).`);
}

main();
