#!/usr/bin/env node

const fs = require("node:fs");

const checks = [
  {
    file: "shared/schema.ts",
    patterns: [
      "notificationPushTokens",
      "smartNotificationEvents",
      "notification_push_tokens_user_token_idx",
      "smart_notification_events_user_kind_date_idx",
    ],
  },
  {
    file: "migrations/0013_smart_notifications.sql",
    patterns: [
      "CREATE TABLE IF NOT EXISTS notification_push_tokens",
      "CREATE TABLE IF NOT EXISTS smart_notification_events",
      "ON notification_push_tokens (user_id, expo_push_token)",
    ],
  },
  {
    file: "server/notifications.ts",
    patterns: [
      "/api/notifications/push-token",
      "/api/notifications/smart/preview",
      "/api/notifications/smart/run-daily",
      "SMART_NOTIFICATION_ROUTES",
      "sanitizeSmartRoute",
      "nextBestRoute",
      "actionStack",
      "rankedActions",
      "travel_prayer_plan",
      "family_check_in",
      "privacy_safe_check_in",
      "resolvePlanTierForUser",
      "generateAIText",
      "https://exp.host/--/api/v2/push/send",
      "NURAI_SMART_NOTIFICATION_SECRET",
      "onConflictDoNothing",
    ],
  },
  {
    file: "client/lib/notifications.ts",
    patterns: [
      "registerDeviceForSmartNotifications",
      "disableDeviceSmartNotifications",
      "getExpoPushTokenAsync",
      "strongestPersonalAction",
      "eveningPersonalAction",
      "weeklyPersonalAction",
      "localEngine: true",
      "/api/notifications/push-token",
    ],
  },
  {
    file: "client/App.tsx",
    patterns: [
      "createNavigationContainerRef",
      "navigateFromNotificationRoute",
      "data?.route",
    ],
  },
  {
    file: "client/screens/NotificationSettingsScreen.tsx",
    patterns: [
      "smart-nurai-reminder-engine",
      "/api/notifications/smart/preview?kind=",
      "button-smart-preview-primary",
      "SMART_PREVIEW_OPTIONS",
      "Premium turns simple reminders into calmer, more personal daily guidance.",
    ],
  },
  {
    file: "scripts/check-env-contract.js",
    patterns: ["NURAI_SMART_NOTIFICATION_SECRET"],
  },
  {
    file: "scripts/run-smart-notifications.js",
    patterns: [
      "NURAI_SMART_NOTIFICATION_SECRET",
      "/api/notifications/smart/run-daily",
      "--dry-run",
    ],
  },
  {
    file: ".env.production.example",
    patterns: ["NURAI_SMART_NOTIFICATION_SECRET"],
  },
];

const findings = [];

for (const check of checks) {
  if (!fs.existsSync(check.file)) {
    findings.push(`${check.file}: missing`);
    continue;
  }
  const text = fs.readFileSync(check.file, "utf8");
  for (const pattern of check.patterns) {
    if (!text.includes(pattern)) {
      findings.push(`${check.file}: missing ${pattern}`);
    }
  }
}

if (findings.length) {
  console.error("Smart notification system check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Smart notification system check passed.");
