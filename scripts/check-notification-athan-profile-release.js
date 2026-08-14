#!/usr/bin/env node

const fs = require("node:fs");

const findings = [];

function read(file) {
  if (!fs.existsSync(file)) {
    findings.push(`${file}: missing`);
    return "";
  }
  return fs.readFileSync(file, "utf8");
}

function requires(file, patterns) {
  const text = read(file);
  for (const pattern of patterns) {
    if (!text.includes(pattern)) findings.push(`${file}: missing ${pattern}`);
  }
  return text;
}

const fullAthanSounds = [
  "athan-classic-full.caf",
  "athan-clear-full.caf",
  "athan-traditional-full.caf",
  "athan-heritage-full.caf",
  "athan-casablanca-full.caf",
  "athan-levantine-full.caf",
  "athan-shalqar-full.caf",
  "athan-mosque-archive-full.caf",
  "athan-open-call-full.caf",
  "athan-marylebone-call-full.caf",
];

for (const sound of fullAthanSounds) {
  const file = `assets/audio/notifications/${sound}`;
  if (!fs.existsSync(file)) {
    findings.push(`${file}: missing`);
    continue;
  }
  const bytes = fs.readFileSync(file);
  if (bytes.length < 200_000) findings.push(`${file}: unexpectedly small`);
  if (bytes.subarray(0, 4).toString("ascii") !== "caff") {
    findings.push(`${file}: not a Core Audio file`);
  }
}

requires("assets/audio/notifications/ATTRIBUTIONS.md", [
  "CC0 1.0 Universal",
  "CC BY-SA 4.0",
  "Aaqib Azeez",
  "Andrewler",
  "Mahfoudou",
  "Fraguando",
  "Sabah Fakhri",
  "Public domain",
  "Esetok",
  "ejaz215",
  "Isaacayodele32",
  "Emanuele_Correani",
  "CC BY 3.0",
]);

const athanCatalogueText = requires("client/lib/athan-reciter-catalog.ts", [
  "ATHAN_VOICES",
  'minimumPlan: "free"',
  'minimumPlan: "premium"',
  'minimumPlan: "scholar"',
  "canUseAthanVoice",
  "getUsableAthanVoice",
  "athanVoicePreviewUri",
]);
const freeAthanVoiceCount = (
  athanCatalogueText.match(/minimumPlan:\s*"free"/g) || []
).length;
if (freeAthanVoiceCount !== 2) {
  findings.push(
    `client/lib/athan-reciter-catalog.ts: expected exactly 2 free Athan voices, found ${freeAthanVoiceCount}`,
  );
}
const paidAthanVoiceCount = (
  athanCatalogueText.match(/minimumPlan:\s*"(?:premium|scholar)"/g) || []
).length;
if (paidAthanVoiceCount !== 8) {
  findings.push(
    `client/lib/athan-reciter-catalog.ts: expected exactly 8 paid Athan voices, found ${paidAthanVoiceCount}`,
  );
}

const alarmText = requires("client/lib/athan-alarm.ts", [
  "requestAthanScheduleRefresh",
  "addAthanScheduleChangeListener",
  "soundName: options.soundName",
  "requestAuthorization",
  "stableHexHash",
  "ATHAN_ALARM_HEALTH_KEY",
  "scheduledAthanAlarmCount",
  "scheduledKeys",
  "scheduleAthanTestAlarm",
]);

if (/const tail = `\$\{prayerKey\}/.test(alarmText)) {
  findings.push(
    "client/lib/athan-alarm.ts: alarm UUID still embeds non-hex prayer names",
  );
}

if (/loops this|full volume/i.test(alarmText)) {
  findings.push(
    "client/lib/athan-alarm.ts: contains an unsupported playback claim",
  );
}

const hookText = requires("client/hooks/usePrayerNotifications.ts", [
  "AppState.addEventListener",
  "addAthanScheduleChangeListener",
  "getUsableAthanVoice(currentPlan)",
  'prayerAlertMode === "athan"',
  "for (let dayOffset = 0; dayOffset < 7; dayOffset++)",
  "Intl.DateTimeFormat().resolvedOptions().timeZone",
  "MAX_LOCAL_PRAYER_REQUESTS",
  "Notifications.getPermissionsAsync()",
  "alarmScheduledKeys",
]);

if (hookText.includes("raw.length")) {
  findings.push(
    "client/hooks/usePrayerNotifications.ts: stale length-only schedule key remains",
  );
}

const settingsText = requires("client/screens/NotificationSettingsScreen.tsx", [
  "AthanSoundStudio",
  "Prayer alerts",
  "Linking.openSettings",
  "AT PRAYER TIME",
  "button-test-athan-alarm",
  "button-refresh-athan-delivery",
]);
requires("client/components/notifications/AthanSoundStudio.tsx", [
  "getUsableAthanVoice(currentPlan)",
  "canUseAthanVoice(voice, currentPlan)",
  "onUpgrade(voice.minimumPlan",
]);

if (/full volume|loops until/i.test(settingsText)) {
  findings.push(
    "client/screens/NotificationSettingsScreen.tsx: contains an unsupported alarm claim",
  );
}

const notificationsText = requires("client/lib/notifications.ts", [
  "loadHijriAdjustment",
  "getHijriDate",
  "reminder-seasonal-${message.event}-${dateKey}",
  "calculated Hijri date",
  "allowAlert: true",
  "allowBadge: true",
  "allowSound: true",
]);
const seasonalBlock = notificationsText.slice(
  notificationsText.indexOf("async function scheduleSeasonalReminders"),
  notificationsText.indexOf("async function scheduleSmartNuraiReminders"),
);
if (seasonalBlock.includes("scheduleDailyReminder(")) {
  findings.push(
    "client/lib/notifications.ts: seasonal Islamic events must not repeat daily all year",
  );
}

requires("modules/athan-alarm/index.ts", [
  "scheduledCount(): Promise<number>",
  "scheduledAthanAlarmCount",
]);
requires("modules/athan-alarm/ios/AthanAlarmModule.swift", [
  'Function("authorizationStatus")',
  'AsyncFunction("scheduledCount")',
  "AlarmManager.AlarmConfiguration.alarm(",
]);

requires("client/screens/NotificationsCenterScreen.tsx", [
  "NuraiSegmentedControl",
  "NuraiGlass",
  "accessibilityActions",
  'actionName === "delete"',
]);

requires("shared/schema.ts", ['profilePhoto: text("profile_photo")']);
requires("migrations/0018_user_profile_photo.sql", [
  'ADD COLUMN IF NOT EXISTS "profile_photo" text',
]);
requires("server/auth.ts", [
  "MAX_PROFILE_PHOTO_BYTES",
  "normalizeProfilePhoto",
  "PROFILE_UPDATE_RATE_LIMIT_POLICY",
  "data:image/${mimeSubtype};base64",
  "bytes.subarray(0, 8).equals",
]);
requires("client/screens/ProfileScreen.tsx", [
  "requestMediaLibraryPermissionsAsync",
  "manipulateAsync",
  "SaveFormat.JPEG",
  "button-profile-back",
  'accessibilityLabel="Back to More"',
  "button-profile-photo",
  "profilePhoto: null",
  "is not added to Community",
]);
requires("client/context/AuthContext.tsx", [
  "profilePhoto: string | null",
  "updateProfile",
  'apiRequest("PUT", "/api/auth/profile"',
]);

const appJson = requires("app.json", [...fullAthanSounds]);
requires("package.json", ['"expo-image-manipulator"']);
requires("ios/Podfile.lock", ["ExpoImageManipulator"]);
try {
  JSON.parse(appJson);
} catch {
  findings.push("app.json: invalid JSON");
}

requires("ios/NurAI/Info.plist", [
  "NSAlarmKitUsageDescription",
  "private profile photo",
]);
requires("ios/NurAI.xcodeproj/project.pbxproj", [
  ...fullAthanSounds.map((sound) => `${sound} in Resources`),
  "athan-alert.wav in Resources",
  "takbir-alert.wav in Resources",
]);

if (findings.length) {
  console.error("Notification, Athan, and profile release check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  "Notification, Athan, and profile release check passed: licensed voice catalogue, plan gates, previews, AlarmKit reconciliation, native bundle resources, permission recovery, private profile photos, and accessible inbox controls verified.",
);
