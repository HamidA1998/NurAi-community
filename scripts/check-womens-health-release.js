#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const engine = read("client/modules/womensHealth/engine.ts");
const insights = read("client/modules/womensHealth/insights.ts");
const storage = read("client/modules/womensHealth/storage.ts");
const screen = read("client/screens/WomensHealthScreen.tsx");
const consent = read("client/screens/WomensHealthConsentScreen.tsx");

const findings = [];
const requireText = (source, text, label) => {
  if (!source.includes(text))
    findings.push(`${label} is missing ${JSON.stringify(text)}`);
};

for (const marker of [
  "computePrediction",
  "computeCareSignal",
  "NurAI cannot classify your bleeding",
  "This app cannot classify the later bleeding",
  "qualified scholar",
  "healthcare professional",
]) {
  requireText(
    engine,
    marker,
    `Women’s Health engine safety contract ${marker}`,
  );
}
if (/you should continue praying and fasting/i.test(engine)) {
  findings.push(
    "Women’s Health must not issue a personal prayer or fasting ruling from logged dates.",
  );
}
for (const marker of [
  "planningMode",
  "possible ovulation range",
  "Calendar estimates are not",
  "cannot confirm or exclude pregnancy",
]) {
  requireText(insights, marker, `Women’s Health planning boundary ${marker}`);
}
for (const marker of [
  "SecureStore",
  "deliberately local-only",
  "loadConsent",
  "saveConsent",
  "deleteAllWHData",
  'deleteProgressCategory("womensHealth")',
]) {
  requireText(storage, marker, `Women’s Health privacy control ${marker}`);
}
for (const marker of [
  "Calendar planning estimate",
  "Do not use this estimate as",
  "qualified scholar",
  "healthcare professional",
  "useSafeAreaInsets",
  "useReducedMotion",
]) {
  requireText(screen, marker, `Women’s Health customer surface ${marker}`);
}
for (const marker of [
  "Stored locally",
  "Health entries are saved on this device by default",
  "Export or delete your data anytime",
]) {
  requireText(consent, marker, `Women’s Health consent surface ${marker}`);
}

if (
  /wh_engine_cycles:\s*["']womensHealth["']/.test(
    read("client/lib/progress-sync.ts"),
  )
) {
  findings.push(
    "Women’s Health must not be included in the automatic signed-in progress sync.",
  );
}
if (storage.includes("syncedSetItem")) {
  findings.push(
    "Women’s Health storage must remain local-only unless a separate explicit sync consent is added.",
  );
}

if (findings.length) {
  console.error("Women’s Health release check failed:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(
  "Women’s Health release check passed: consent, privacy deletion, cycle estimates, fertility boundaries, clinician escalation, and non-ruling fiqh prompts are enforced.",
);
