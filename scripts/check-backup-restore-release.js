#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath}: missing file`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      findings.push(`${relativePath}: missing ${JSON.stringify(snippet)}`);
    }
  }
}

function main() {
  const findings = [];
  const progressSync = read("client/lib/progress-sync.ts");
  const settings = read("client/screens/SettingsScreen.tsx");
  const libraryProgress = read("client/services/libraryProgressService.ts");
  const bookReader = read("client/screens/BookReaderScreen.tsx");
  const packageJson = JSON.parse(read("package.json"));

  requireIncludes(
    progressSync,
    "client/lib/progress-sync.ts",
    [
      'schema: "nurai-progress-backup-v1"',
      "exportProgressBackup",
      "restoreProgressBackup",
      "applyCategoryData",
      'bookmarks_data: "bookmarks"',
      'bookmark_collections: "bookmarks"',
      'nurai_library_progress_v1: "library"',
      'nurai_library_reader_settings_v1: "library"',
      'nurai_saved_ai_answers_v1: "nuraiProfile"',
      'quran_reflection_notes_v1: "quran"',
      'nurai_travel_companion_v1: "travel"',
      'nurai_prayer_tracker_v1: "prayers"',
      'nurai_custom_daily_goals_v1: "settings"',
      'quran_repeat_range_enabled: "quran"',
      'quran_audio_end_mode: "quran"',
      'selected_muezzin_voice: "notifications"',
    ],
    findings,
  );

  requireIncludes(
    settings,
    "client/screens/SettingsScreen.tsx",
    [
      "exportProgressBackup",
      "restoreProgressBackup",
      "Saved Quran reflection notes",
      "including private AI answer packets and Quran reflection notes when present",
      "Bring saved NurAI progress, Quran notes, and AI packets back",
      "Private Backup",
      "Restore backup",
      "Your detailed backup stays private unless you choose where to share it.",
      "That file does not look like a NurAI private backup.",
      'navigation.navigate("Subscription", { initialTab: "premium" })',
    ],
    findings,
  );

  requireIncludes(
    libraryProgress,
    "client/services/libraryProgressService.ts",
    ["syncedSetItem", "await syncedSetItem(STORAGE_KEY"],
    findings,
  );

  requireIncludes(
    bookReader,
    "client/screens/BookReaderScreen.tsx",
    ["READER_SETTINGS_KEY", "syncedSetItem("],
    findings,
  );

  const scripts = packageJson.scripts || {};
  if (
    scripts["check:backup-restore-release"] !==
    "node scripts/check-backup-restore-release.js"
  ) {
    findings.push(
      "package.json: check:backup-restore-release must run scripts/check-backup-restore-release.js.",
    );
  }
  if (
    !String(scripts["check:release-local"] || "").includes(
      "check:backup-restore-release",
    )
  ) {
    findings.push(
      "package.json: check:release-local must include check:backup-restore-release.",
    );
  }

  if (findings.length) {
    console.error("Backup/restore release check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Backup/restore release check passed: private backup UI, restore flow, and key progress categories are covered.",
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
