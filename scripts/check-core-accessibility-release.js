#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const findings = [];
const community = read("client/screens/CommunityScreen.tsx");
const listRow = read("client/components/ListRow.tsx");
const settings = read("client/screens/SettingsScreen.tsx");
const quran = read("client/screens/QuranReaderScreen.tsx");
const health = read("client/screens/MuslimHealthScreen.tsx");

for (const snippet of [
  'accessibilityLabel="Choose Brother community"',
  'accessibilityLabel="Choose Sister community"',
  'accessibilityLabel="Community display name"',
  'accessibilityLabel="Join community"',
]) {
  if (!community.includes(snippet)) {
    findings.push(`Community accessibility is missing ${snippet}`);
  }
}

if (!listRow.includes('hasSwitch ? "switch" : "button"')) {
  findings.push("Settings ListRow controls must expose switch/button roles");
}

if (!settings.includes('accessibilityRole="radio"')) {
  findings.push("Settings theme choices must expose radio semantics");
}
if (!settings.includes("accessibilityLabel={`${skin.name} theme`")) {
  findings.push("Settings custom themes need accessible names");
}
if (!quran.includes('accessibilityLabel="Back to Quran"')) {
  findings.push("Quran reader back control needs an accessible name");
}
if (
  !quran.includes('accessibilityLabel="Open Quran reading display settings"')
) {
  findings.push("Quran reading display control needs an accessible name");
}
if (!quran.includes('accessibilityLabel="Open Quran reader settings"')) {
  findings.push("Quran settings control needs an accessible name");
}
for (const label of [
  "Change Quran translation",
  "Change Quran reciter",
  "Open Quran audio settings",
  "Toggle memorisation mode",
]) {
  if (!quran.includes(`accessibilityLabel="${label}"`)) {
    findings.push(`Quran quick control is missing ${label}`);
  }
}
if (!health.includes('accessibilityLiveRegion="polite"')) {
  findings.push("Health sync and journal status must be announced");
}
if (!health.includes('accessibilityLabel="Health Dashboard summary"')) {
  findings.push("Health dashboard needs a concise accessible summary");
}

if (findings.length) {
  console.error("Core accessibility release check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Core accessibility release check passed.");
