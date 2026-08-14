#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));

const files = {
  packageJson: readJson("package.json"),
  appJson: read("app.json"),
  nativeHealth: read("client/services/nativeHealthDataService.ts"),
  foodScanClient: read("client/services/foodScanService.ts"),
  healthScreen: read("client/screens/MuslimHealthScreen.tsx"),
  serverHealth: read("server/health.ts"),
  serverRoutes: read("server/routes.ts"),
  serverIndex: read("server/index.ts"),
  dailyQuota: read("server/ai/dailyQuota.ts"),
  iosInfo: read("ios/NurAI/Info.plist"),
  iosEntitlements: read("ios/NurAI/NurAI.entitlements"),
  docs: read("docs/health/HEALTH_PROVIDER_SETUP.md"),
};

const findings = [];

function requireIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    findings.push(`${label} is missing "${needle}"`);
  }
}

function requireDependency(name, label) {
  const hasDependency =
    files.packageJson.dependencies?.[name] ||
    files.packageJson.devDependencies?.[name];
  if (!hasDependency) findings.push(`${label} dependency "${name}" is missing`);
}

for (const dependency of [
  "@kingstinct/react-native-healthkit",
  "react-native-nitro-modules",
  "expo-image-picker",
  "expo-build-properties",
]) {
  requireDependency(dependency, "Native health and food scan");
}

for (const marker of [
  "requestNativeHealthPermissions",
  "readNativeDailyHealthSummary",
  "readNativeHealthHistory",
  "buildNativeHealthScoreSnapshot",
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKQuantityTypeIdentifierBasalEnergyBurned",
  "HKQuantityTypeIdentifierDietaryWater",
  "HKQuantityTypeIdentifierHeartRate",
  "HKCategoryTypeIdentifierSleepAnalysis",
  "Steps",
  "ActiveCaloriesBurned",
  "Hydration",
  "HeartRate",
  "SleepSession",
  "ExerciseSession",
  "workouts?: NativeHealthWorkoutSummary[]",
]) {
  requireIncludes(files.nativeHealth, marker, "Native health service");
}

for (const marker of [
  "scanMealWithCamera",
  "scanMealFromLibrary",
  "expo-image-picker",
  "Meal photo intelligence is disabled while NurAI intelligence is rebuilt.",
]) {
  requireIncludes(files.foodScanClient, marker, "Food scan client");
}

for (const marker of [
  "muslim-health-native-summary",
  "muslim-health-data-quality",
  "muslim-health-workout-summary",
  "Amanah Readiness",
  "ScoreRing",
  "ContributorChip",
  "TinyTrendBars",
  "Seven-day health trends",
  "RefreshControl",
  "button-connect-native-health",
  "muslim-health-food-scan",
  "button-scan-meal-camera",
  "Scan food for calories and ingredients",
]) {
  requireIncludes(files.healthScreen, marker, "Health Companion UI");
}

for (const marker of [
  "/api/health/food-scan",
  'requirePaidAPI("health_food_scan", "premium")',
  'express.json({ limit: "6mb" })',
  "ai_food_scan_removed",
  "intelligence system is rebuilt from the ground up",
  "available: false",
]) {
  requireIncludes(files.serverHealth, marker, "Server food scan route");
}

requireIncludes(files.serverRoutes, "registerHealthRoutes", "Route registry");
requireIncludes(
  files.serverIndex,
  'req.path === "/api/health/food-scan"',
  "Scoped large body parser skip",
);
requireIncludes(
  files.dailyQuota,
  "HEALTH_FOOD_SCAN_DAILY_AI_LIMITS",
  "Food scan daily quota",
);
requireIncludes(
  files.appJson,
  "@kingstinct/react-native-healthkit",
  "HealthKit config plugin",
);
requireIncludes(files.appJson, "expo-image-picker", "Food image picker plugin");
requireIncludes(
  files.nativeHealth,
  "getHealthConnect(): Promise<HealthConnectModule | null> {\n  return null;",
  "Deferred Android Health Connect bridge",
);
requireIncludes(
  files.iosInfo,
  "NSHealthShareUsageDescription",
  "iOS Health share usage description",
);
requireIncludes(
  files.iosInfo,
  "estimated ingredients and calories",
  "iOS camera/photo meal scan usage copy",
);
requireIncludes(
  files.iosEntitlements,
  "com.apple.developer.healthkit",
  "iOS HealthKit entitlement",
);
for (const marker of [
  "Food Scan",
  "Premium/Scholar entitlement gate",
  "HealthKit config plugin",
  "Android Health Connect is deferred",
  "must not certify halal status from an image",
]) {
  requireIncludes(files.docs, marker, "Health provider docs");
}
requireIncludes(
  JSON.stringify(files.packageJson.scripts || {}),
  "check:healthkit-food-release",
  "Package healthkit food release script",
);

if (findings.length) {
  console.error("HealthKit/Food release check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  "HealthKit/Food release check passed: iOS HealthKit entitlement, deferred Android Health Connect bridge, disabled food scan boundary, quotas, safety docs, and Health Companion UI are wired.",
);
