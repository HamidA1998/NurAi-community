#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const files = {
  providerService: read("client/services/wearableHealthService.ts"),
  healthScreen: read("client/screens/MuslimHealthScreen.tsx"),
  appJson: read("app.json"),
  docs: read("docs/health/HEALTH_PROVIDER_SETUP.md"),
  packageJson: read("package.json"),
};

const findings = [];

function requireIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    findings.push(`${label} is missing "${needle}"`);
  }
}

for (const provider of [
  "apple_health",
  "apple_watch",
  "android_health_connect",
  "samsung_health",
  "android_wearables",
]) {
  requireIncludes(
    files.providerService,
    provider,
    `Wearable provider contract for ${provider}`,
  );
}

requireIncludes(
  files.providerService,
  "WEARABLE_HEALTH_PRIVACY_BOUNDARIES",
  "Wearable health privacy boundaries",
);
requireIncludes(
  files.providerService,
  "Do not diagnose, prescribe, change medication",
  "Wearable AI safety prompt",
);
requireIncludes(
  files.healthScreen,
  "Amanah Readiness",
  "Health readiness hero",
);
requireIncludes(
  files.healthScreen,
  "muslim-health-data-quality",
  "Health data quality test hook",
);
requireIncludes(files.healthScreen, "ScoreRing", "Health premium score ring");
requireIncludes(
  files.healthScreen,
  "ContributorChip",
  "Health contributor chips",
);
requireIncludes(
  files.healthScreen,
  "healthScores.statusLabel",
  "Health sync status derives from native provider scoring",
);
requireIncludes(
  files.healthScreen,
  "formatFetchedAt(healthSummary?.fetchedAt)",
  "Health sync last-read time",
);
requireIncludes(
  files.appJson,
  "NSHealthShareUsageDescription",
  "iOS HealthKit read usage description",
);
requireIncludes(
  files.appJson,
  "NSHealthUpdateUsageDescription",
  "iOS HealthKit write usage description",
);
for (const requiredDocTerm of [
  "Apple HealthKit",
  "Apple Watch",
  "Android Health Connect",
  "Samsung Health Data SDK",
  "Android Wearables",
  "Do not show the user as connected until HealthKit permission is actually granted.",
]) {
  requireIncludes(files.docs, requiredDocTerm, "Health provider setup docs");
}
requireIncludes(
  files.packageJson,
  '"check:health-provider-integration-release"',
  "Package health provider release script",
);

if (findings.length) {
  console.error("Health provider integration release check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  "Health provider integration release check passed: Apple Health, Apple Watch, Health Connect, Samsung Health, Android wearables, privacy boundaries, and setup docs are wired.",
);
