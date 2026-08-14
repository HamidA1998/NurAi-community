#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const failures = [];

function read(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${file}: missing`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireIncludes(file, text, patterns) {
  for (const pattern of patterns) {
    if (!text.includes(pattern)) {
      failures.push(`${file}: missing ${pattern}`);
    }
  }
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${expected}, got ${actual || "empty"}`);
  }
}

const appJson = JSON.parse(read("app.json") || "{}");
const appVersion = appJson.expo?.version;
const iosBuildNumber = appJson.expo?.ios?.buildNumber;

requireEqual(appVersion, "1.1.8", "app.json expo.version");
if (!iosBuildNumber) {
  failures.push("app.json ios.buildNumber: missing");
}

const widgetSwift = read("ios/NurAIWidgets/NurAIWidgets.swift");
requireIncludes("ios/NurAIWidgets/NurAIWidgets.swift", widgetSwift, [
  "NurAIPrayerWidget",
  "NurAIStreakGardenWidget",
  "NurAIQuranWidget",
  "NurAIDailyPulseWidget",
  "NurAITasbeehWidget",
  "NurAIWeatherPrayerWidget",
  "NurAITravelWidget",
  "NurAIPrayerLiveActivity",
  "Text(nextPrayerDate, style: .timer)",
  "prayerSchedule",
  "buildTimelineEntries",
  "prayerTransitionDates(after:",
  "maximumPrayerTimelineEntries",
  "snapshot.nextPrayerDate?.addingTimeInterval(5)",
  ".accessoryCircular",
  ".accessoryRectangular",
  'URL(string: "nurai://prayer")',
  'URL(string: "nurai://streak-garden")',
  'URL(string: "nurai://quran")',
  "quranDeepLink",
  "quranContinueSurah",
  "quranContinueVerse",
  "surah=",
  "verse=",
  'URL(string: "nurai://tasbeeh")',
  'URL(string: "nurai://travel")',
  'URL(string: "nurai://home")',
  "group.uk.co.eliteautomations.nurai",
  "nurai_widget_snapshot_v1",
]);

const snapshotTs = read("client/lib/widget-snapshot.ts");
requireIncludes("client/lib/widget-snapshot.ts", snapshotTs, [
  "NurAIWidgetSnapshot",
  "saveNurAIWidgetSnapshot",
  "clearNurAIWidgetSnapshot",
  "nextPrayerTimeISO",
  "prayerSchedule",
  "weatherInsight",
  "checkedDays",
  "quranContinueLabel",
  "quranContinueSurah",
  "quranContinueVerse",
  "dailyGoalProgress",
  "familyGoalLabel",
  "tasbeehCount",
  "tasbeehTarget",
  "tasbeehDhikrLabel",
  "tasbeehTodayTotal",
  "travelModeEnabled",
  "travelDestinationLabel",
  "travelFlightLabel",
  "travelPrayerPlanLabel",
  "travelReadinessProgress",
  "updateNurAIWidgetSnapshot",
]);

const quranProgress = read("client/lib/quran-progress.ts");
requireIncludes("client/lib/quran-progress.ts", quranProgress, [
  "updateNurAIWidgetSnapshot",
  "quranContinueLabel",
  "quranProgressLabel",
  "quranContinueSurah",
  "quranContinueVerse",
]);

const homeScreen = read("client/screens/HomeScreen.tsx");
requireIncludes("client/screens/HomeScreen.tsx", homeScreen, [
  "saveNurAIWidgetSnapshot",
  "nextPrayerTimeISO",
  "prayerSchedule",
  "weatherInsight",
  "dailyGoalProgress",
  "quranContinueSurah",
  "quranContinueVerse",
  "familyGoalLabel",
  "tasbeehCount",
  "tasbeehTarget",
  "tasbeehDhikrLabel",
  "tasbeehTodayTotal",
]);

const appTsx = read("client/App.tsx");
requireIncludes("client/App.tsx", appTsx, [
  "getRouteFromDeepLink",
  "Linking.getInitialURL",
  'Linking.addEventListener("url"',
  'home: "Home"',
  'prayer: "PrayerTimes"',
  'quran: "Quran"',
  "QuranReader",
  "surahNumber",
  "initialVerse",
  '"streak-garden": "StreakGarden"',
  'tasbeeh: "Tasbeeh"',
  "pendingDeepLinkRoute",
]);

const nativeModule = read("ios/NurAI/NurAIWidgetModule.swift");
requireIncludes("ios/NurAI/NurAIWidgetModule.swift", nativeModule, [
  "@objc(NurAIWidgetModule)",
  "saveSnapshot",
  "clearSnapshot",
  "WidgetCenter.shared.reloadAllTimelines",
  "syncPrayerLiveActivity",
  "endPrayerLiveActivities",
  "mergeSnapshot",
  "group.uk.co.eliteautomations.nurai",
]);

const bridge = read("ios/NurAI/NurAIWidgetModuleBridge.m");
requireIncludes("ios/NurAI/NurAIWidgetModuleBridge.m", bridge, [
  "RCT_EXTERN_MODULE(NurAIWidgetModule",
  "saveSnapshot",
  "clearSnapshot",
  "mergeSnapshot",
  "endPrayerActivity",
]);

const mainEntitlements = read("ios/NurAI/NurAI.entitlements");
const widgetEntitlements = read("ios/NurAIWidgets/NurAIWidgets.entitlements");
requireIncludes("ios/NurAI/NurAI.entitlements", mainEntitlements, [
  "com.apple.security.application-groups",
  "group.uk.co.eliteautomations.nurai",
]);
requireIncludes(
  "ios/NurAIWidgets/NurAIWidgets.entitlements",
  widgetEntitlements,
  [
    "com.apple.security.application-groups",
    "group.uk.co.eliteautomations.nurai",
  ],
);

const widgetInfo = read("ios/NurAIWidgets/Info.plist");
requireIncludes("ios/NurAIWidgets/Info.plist", widgetInfo, [
  "<string>NurAI Widgets</string>",
  "<string>1.1.8</string>",
  `<string>${iosBuildNumber}</string>`,
  "<string>com.apple.widgetkit-extension</string>",
]);

const pbxproj = read("ios/NurAI.xcodeproj/project.pbxproj");
requireIncludes("ios/NurAI.xcodeproj/project.pbxproj", pbxproj, [
  "NurAIWidgets.appex in Embed App Extensions",
  'productType = "com.apple.product-type.app-extension"',
  "PRODUCT_BUNDLE_IDENTIFIER = uk.co.eliteautomations.nurai.widgets",
  "CODE_SIGN_ENTITLEMENTS = NurAIWidgets/NurAIWidgets.entitlements",
  `CURRENT_PROJECT_VERSION = ${iosBuildNumber}`,
  "MARKETING_VERSION = 1.1.8",
]);

if (failures.length) {
  console.error("iOS widget release check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("iOS widget release check passed.");
