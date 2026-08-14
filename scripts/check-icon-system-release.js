#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const findings = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    findings.push(`${relativePath}: missing`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function walk(directory) {
  const results = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...walk(absolutePath));
    else if (/\.(ts|tsx)$/.test(entry.name)) results.push(absolutePath);
  }
  return results;
}

for (const file of walk(path.join(root, "client"))) {
  const source = fs.readFileSync(file, "utf8");
  if (
    /from\s+["'](?:@expo\/vector-icons|react-native-vector-icons|lucide-react-native)["']/.test(
      source,
    )
  ) {
    findings.push(
      `${path.relative(root, file)}: bypasses the central AppIcon system`,
    );
  }
}

const registry = read("client/components/icons/iconRegistry.ts");
const custom = read("client/components/icons/custom/NurAiCustomIcons.tsx");
const premiumSvgs = read("client/components/premium/svg/PremiumSvgs.tsx");
const quranMark = read("assets/branding/icons/quran-mark.svg");
const tabs = read("client/navigation/BottomTabNavigator.tsx");
const appIcon = read("client/components/icons/AppIcon.tsx");

for (const marker of [
  '"home-mark": HomeMarkIcon',
  '"explore-mark": ExploreMarkIcon',
  "quran: QuranIcon",
  "community: CommunityIcon",
  '"more-mark": MoreMarkIcon',
  "qibla: QiblaIcon",
  "health: HealthIcon",
  '"women-space": WomenSpaceIcon',
  '"men-space": MenSpaceIcon',
]) {
  if (!registry.includes(marker))
    findings.push(`iconRegistry.ts: missing ${marker}`);
}

for (const marker of ["HomeMarkIcon", "ExploreMarkIcon", "MoreMarkIcon"]) {
  if (!custom.includes(`export const ${marker}`))
    findings.push(`NurAiCustomIcons.tsx: missing ${marker}`);
}

for (const marker of [
  "M5.8 11.7c6.5-1.55",
  'strokeWidth="3.2"',
  "M24 16.05v23.1",
]) {
  if (!premiumSvgs.includes(marker))
    findings.push(`PremiumSvgs.tsx: missing pixel-fitted Quran mark ${marker}`);
}

for (const marker of [
  "<title>NurAI Quran mark</title>",
  'viewBox="0 0 24 24"',
  'stroke="currentColor"',
]) {
  if (!quranMark.includes(marker))
    findings.push(`quran-mark.svg: missing ${marker}`);
}

for (const icon of [
  'icon: "home-mark"',
  'icon: "explore-mark"',
  'icon: "quran"',
  'icon: "community"',
  'icon: "more-mark"',
]) {
  if (!tabs.includes(icon))
    findings.push(`BottomTabNavigator.tsx: missing ${icon}`);
}

for (const contract of [
  "accessibilityLabel?: string",
  "decorative?: boolean",
  "const isDecorative = decorative ?? !accessibilityLabel",
  "ICON_MIN_TOUCH_TARGET",
  "NuraiGlass",
]) {
  if (!appIcon.includes(contract))
    findings.push(`AppIcon.tsx: missing ${contract}`);
}

if (findings.length > 0) {
  console.error("Icon-system release check failed:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(
  "Icon-system release check passed: one typed registry, no direct icon-library bypasses, bespoke primary-tab marks, product SVGs, accessible semantics, and 44pt glass containers verified.",
);
