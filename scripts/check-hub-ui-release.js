#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

function includes(source, needle, label, findings) {
  if (!source.includes(needle)) findings.push(`${label}: missing ${needle}`);
}

function excludes(source, needle, label, findings) {
  if (source.includes(needle))
    findings.push(`${label}: should not include ${needle}`);
}

function ordered(source, needles, label, findings) {
  let cursor = -1;
  for (const needle of needles) {
    const next = source.indexOf(needle);
    if (next < 0) {
      findings.push(`${label}: missing ${needle}`);
      return;
    }
    if (next <= cursor) {
      findings.push(`${label}: ${needle} is in the wrong order`);
      return;
    }
    cursor = next;
  }
}

const findings = [];
const homeScreen = read("client/screens/HomeScreen.tsx");
const home = read("client/components/home/GeneratedHomeExperience.tsx");
const contextCard = read("client/components/home/NurAIContextCard.tsx");
const briefing = read("client/services/personalIntelligenceBriefingService.ts");
const drawer = read("client/navigation/DrawerNavigator.tsx");
const explore = read("client/screens/ExploreScreen.tsx");
const more = read("client/screens/MoreScreen.tsx");

includes(home, "<HomePrayerOrb", "Home signature prayer focus", findings);
includes(home, "<HomeWeatherPill", "Home contextual weather", findings);
includes(
  home,
  "<UnifiedPersonalAICard",
  "Home single guidance surface",
  findings,
);
includes(home, "<CompactStreakCard", "Home compact progress", findings);
includes(
  home,
  "<CompactHomeShortcutRow",
  "Home continuation shortcuts",
  findings,
);
ordered(
  home,
  [
    "<HomePrayerOrb",
    "<HomeWeatherPill",
    "<UnifiedPersonalAICard",
    "<CompactStreakCard",
    "<CompactHomeShortcutRow",
  ],
  "Home keeps prayer first, then one daily context and calm continuation",
  findings,
);
includes(
  contextCard,
  "tierLabel",
  "Home guidance uses the compact customer plan label",
  findings,
);
includes(
  briefing,
  "daySnapshot: plan.daySnapshot",
  "Ranked briefing preserves the visible day snapshot",
  findings,
);
includes(
  contextCard,
  "Ranked privately on this device.",
  "Home guidance explains private on-device ranking",
  findings,
);
includes(
  briefing,
  '"Free · on device"',
  "Free daily intelligence is labelled honestly",
  findings,
);
includes(
  briefing,
  "one personalised next step",
  "Paid model enhancement is explained",
  findings,
);
includes(
  homeScreen,
  "privateContextLines: homeAIContext.contextSummary",
  "Home private context boundary",
  findings,
);
excludes(home, "<NurAIHomeHub", "Home retired AI dashboard", findings);
excludes(
  home,
  "<TodayDeenCommandCenter",
  "Home retired command centre",
  findings,
);
excludes(
  home,
  "<WeeklyGrowthPanel",
  "Home duplicate growth dashboard",
  findings,
);

includes(explore, 'title="Explore"', "Explore title", findings);
includes(
  explore,
  'eyebrow="DISCOVER WITH INTENT"',
  "Explore editorial positioning",
  findings,
);
includes(
  explore,
  "styles.compactFeatureGrid",
  "Explore renders every feature without an expand tap",
  findings,
);
includes(
  explore,
  'testID="explore-clean-command-panel"',
  "Explore focused discovery surface",
  findings,
);
includes(explore, "Search NurAI", "Explore universal search", findings);
includes(explore, "explore-search", "Explore leads with search", findings);
includes(explore, "EXPLORE_GROUPS.map", "Explore organised sections", findings);
includes(
  explore,
  'accessibilityRole="button"',
  "Explore accessible actions",
  findings,
);

includes(more, 'title="More"', "More title", findings);
includes(more, 'testID: "button-more-health"', "More Health entry", findings);
includes(
  more,
  'onPress={() => navigate("Profile")}',
  "More Profile route",
  findings,
);
includes(more, "Data & backups", "More backup route", findings);
includes(more, "Privacy policy", "More privacy route", findings);
includes(
  more,
  "NurAI night atmosphere",
  "More dark-only appearance contract",
  findings,
);
excludes(
  more,
  "setPreference(",
  "More must not expose a light-mode toggle",
  findings,
);

excludes(
  drawer,
  "import ChatScreen",
  "Drawer standalone Chat screen",
  findings,
);
excludes(drawer, 'name="Chat"', "Drawer standalone Chat route", findings);

if (findings.length) {
  console.error("Hub UI release check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  "Hub UI release check passed: prayer-first Home, visible V3 day context, editorial Explore, Health/Profile routing, and dark-only appearance verified.",
);
