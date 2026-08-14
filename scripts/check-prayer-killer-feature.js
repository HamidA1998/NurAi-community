#!/usr/bin/env node

const fs = require("node:fs");

const checks = [
  {
    file: "client/lib/prayer-intelligence.ts",
    patterns: [
      "buildPrayerIntelligence",
      "currentWindow",
      "nextPrayerProgress",
      "confidenceLabel",
      "Moonsighting",
    ],
  },
  {
    file: "client/lib/prayer-tracker.ts",
    patterns: [
      "nurai_prayer_tracker_v1",
      "getPrayerTrackerSummary",
      "togglePrayerPrayed",
      "heatmap",
      "currentStreak",
    ],
  },
  {
    file: "client/hooks/usePrayerNotifications.ts",
    patterns: [
      "for (let dayOffset = 0; dayOffset < 7; dayOffset++)",
      "scheduleAthanReminder",
      "notificationSoundForMode",
      "identifierSuffix",
    ],
  },
  {
    file: "client/lib/notifications.ts",
    patterns: [
      "buildPrayerReminderCopy",
      "buildAthanReminderCopy",
      "schedulePrayerSnoozeReminder",
      'route: "PrayerTimes"',
      "mark_prayed",
      "snooze_prayer_10",
      "prayer-snooze-",
      "startsWith(`prayer-${name}-`)",
      "startsWith(`athan-${name}-`)",
    ],
  },
  {
    file: "client/App.tsx",
    patterns: [
      "addNotificationResponseReceivedListener",
      "setPrayerTrackerStatus",
      "mark_prayed",
      "schedulePrayerSnoozeReminder",
      "snooze_prayer_10",
      "nurai://prayer",
    ],
  },
  {
    file: "client/screens/PrayerTimesScreen.tsx",
    patterns: [
      "PrayerHeroCard",
      "PrayerTrackerPanel",
      "LIVE PRAYER WINDOW",
      "30-day prayer map",
      "Refresh location for best accuracy",
      "Per-prayer athan controls",
    ],
  },
  {
    file: "client/screens/NotificationSettingsScreen.tsx",
    patterns: [
      "PRAYER_ALERT_PRESETS",
      "updateAllPrayerTimeAlerts",
      "alert-preset-${preset.mode}",
      "prayer-sound-global-off-notice",
      "Sound is off",
      "All Athan",
      "All Takbir",
    ],
  },
  {
    file: "ios/NurAIWidgets/NurAIWidgets.swift",
    patterns: [
      "Text(nextPrayerDate, style: .timer)",
      ".accessoryCircular",
      ".accessoryRectangular",
      "nurai://prayer",
    ],
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
  console.error("Prayer flagship check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Prayer flagship check passed.");
