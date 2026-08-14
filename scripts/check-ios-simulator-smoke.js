#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const files = {
  tabs: read("client/navigation/BottomTabNavigator.tsx"),
  prayer: read("client/screens/PrayerTimesScreen.tsx"),
  quran: read("client/screens/QuranReaderScreen.tsx"),
  quranHome: read("client/screens/QuranScreen.tsx"),
  qibla: read("client/screens/QiblaScreen.tsx"),
  community: read("client/screens/CommunityScreen.tsx"),
  more: read("client/screens/MoreScreen.tsx"),
  guide: read("client/screens/PersonalGuideScreen.tsx"),
  service: read("client/services/personalGuideConversationService.ts"),
  personalGuideCard: read("client/components/home/NurAIContextCard.tsx"),
};

const findings = [];
const packageJson = JSON.parse(read("package.json"));
const releaseCheck = packageJson.scripts?.["check:release-local"] || "";
const requireText = (file, text, message) => {
  if (!files[file].includes(text)) findings.push(message);
};

for (const tab of ["home", "explore", "quran", "community", "more"]) {
  requireText("tabs", `tab-${tab}`, `Missing ${tab} tab automation id`);
}
requireText(
  "tabs",
  ': "absolute"',
  "Bottom tab bar must float above content without a solid rail",
);
requireText(
  "tabs",
  "Math.max(insets.bottom - 10, 8)",
  "Bottom tab dock must respect the home indicator while staying close to the safe area",
);
requireText(
  "tabs",
  "function FullPillGlass()",
  "Bottom tab rail must use a single full-pill glass surface",
);
requireText(
  "tabs",
  "<NuraiGlass",
  "Bottom navigation must use the native Liquid Glass bridge",
);
if (/\bBlurView\b|systemChromeMaterialDark/.test(files.tabs)) {
  findings.push(
    "Bottom navigation must not fall back to a hard-coded blur imitation on iOS 26",
  );
}
requireText(
  "quranHome",
  "surahTitleRow",
  "Quran index is missing its constrained bilingual title row",
);
for (const marker of [
  "qibla-compass-instrument",
  "text-facing-qibla",
  "button-change-location",
  "button-qibla-accuracy-help",
  "headingAccuracy >= 3",
  "qibla-origin-marker",
  "qibla-alignment-target",
  "qibla-destination-marker",
  "qibla-glass-cluster",
  "qibla-dial-specular",
  "Bearing only",
  "qibla-reading-summary",
]) {
  requireText("qibla", marker, `Qibla release contract is missing ${marker}`);
}
requireText(
  "quranHome",
  'overflow: "hidden"',
  "Quran rows must clip safely inside the screen width",
);
for (const marker of [
  "home-nur-ai-context-card",
  "onLongPress",
  "useReducedMotion",
  "NuraiBottomSheet",
]) {
  requireText(
    "personalGuideCard",
    marker,
    `Daily context card is missing ${marker}`,
  );
}
requireText("prayer", "prayer-toggle-${key}", "Missing prayer completion hook");
requireText(
  "quran",
  'testID="button-close-ayah-study"',
  "Missing Ayah Study close hook",
);
for (const command of [
  "check:core-accessibility-release",
  "check:messaging-services-release",
  "check:ios-simulator-smoke",
]) {
  if (!releaseCheck.includes(command)) {
    findings.push(`Local release gate omits ${command}`);
  }
}
requireText(
  "community",
  'testID="button-gender-male"',
  "Missing Community selection hook",
);
requireText("more", "button-more-health", "Missing Health routing hook");
requireText(
  "guide",
  "input-personal-guide-message",
  "Missing Personal Guide composer hook",
);
requireText(
  "service",
  "SMOKE_RECOVERY_PROMPT",
  "Missing preview-only message recovery fixture",
);

const flowPath = path.join(root, "e2e/maestro/ios-smoke.yaml");
if (!fs.existsSync(flowPath)) {
  findings.push("Missing Maestro iOS smoke flow");
} else {
  const flow = fs.readFileSync(flowPath, "utf8");
  const documents = YAML.parseAllDocuments(flow);
  const yamlErrors = documents.flatMap((document) => document.errors);
  if (documents.length !== 2 || yamlErrors.length > 0) {
    findings.push(
      "Maestro flow must contain valid config and command documents",
    );
  }
  for (const marker of [
    "tab-home",
    "tab-explore",
    "tab-quran",
    "tab-community",
    "tab-more",
    "prayer-toggle-fajr",
    "home-nur-ai-context-card",
    "button-close-ayah-study",
    "button-gender-male",
    "button-more-health",
    "Retry message",
  ]) {
    if (!flow.includes(marker)) findings.push(`Smoke flow omits ${marker}`);
  }
}

const qiblaFlowPath = path.join(root, "e2e/maestro/qibla-flagship.yaml");
if (!fs.existsSync(qiblaFlowPath)) {
  findings.push("Missing Qibla flagship Maestro flow");
} else {
  const qiblaFlow = fs.readFileSync(qiblaFlowPath, "utf8");
  const qiblaDocuments = YAML.parseAllDocuments(qiblaFlow);
  const qiblaYamlErrors = qiblaDocuments.flatMap((document) => document.errors);
  if (qiblaDocuments.length !== 2 || qiblaYamlErrors.length > 0) {
    findings.push("Qibla Maestro flow must contain valid config and commands");
  }
  for (const marker of [
    "nurai://qibla",
    "qibla-compass-instrument",
    "qibla-origin-marker",
    "qibla-alignment-target",
    "qibla-destination-marker",
    "qibla-reading-summary",
    "button-qibla-accuracy-help",
    "button-change-location",
    "button-close-location",
  ]) {
    if (!qiblaFlow.includes(marker)) {
      findings.push(`Qibla Maestro flow omits ${marker}`);
    }
  }
}

if (findings.length) {
  console.error("iOS simulator smoke contract failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  "iOS simulator smoke contract passed: tabs, prayer, Qibla, Quran, Community, Health, and message recovery are covered.",
);
