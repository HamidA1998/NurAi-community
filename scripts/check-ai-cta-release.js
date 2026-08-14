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

function requireIncludes(text, needle, label, findings) {
  if (!text.includes(needle)) findings.push(`${label}: missing ${needle}`);
}

function requireNotIncludes(text, needle, label, findings) {
  if (text.includes(needle))
    findings.push(`${label}: should not include ${needle}`);
}

function requireMissing(relativePath, label, findings) {
  if (fs.existsSync(path.join(root, relativePath))) {
    findings.push(`${label}: remove ${relativePath}`);
  }
}

function main() {
  const findings = [];
  const rootStack = read("client/navigation/RootStackNavigator.tsx");
  const drawer = read("client/navigation/DrawerNavigator.tsx");
  const bottomTabs = read("client/navigation/BottomTabNavigator.tsx");
  const home = read("client/components/home/GeneratedHomeExperience.tsx");
  const contextCard = read("client/components/home/NurAIContextCard.tsx");
  const homeScreen = read("client/screens/HomeScreen.tsx");
  const modal = read("client/components/AIResponseModal.tsx");
  const floating = read("client/components/AIFloatingButton.tsx");

  [
    "client/screens/ChatScreen.tsx",
    "client/screens/PersonalAIMemoryControlsScreen.tsx",
    "client/screens/PrivacyTrustDashboardScreen.tsx",
    "client/screens/SavedAIAnswersScreen.tsx",
    "client/screens/ScholarReviewQueueScreen.tsx",
  ].forEach((file) =>
    requireMissing(file, "Retired AI destination source", findings),
  );

  [
    'name="Chat"',
    'name="SavedAIAnswers"',
    'name="PrivacyTrustDashboard"',
    'name="ScholarReviewQueue"',
    'name="PersonalAIMemoryControls"',
    "getChatScreen",
    "getSavedAIAnswersScreen",
    "getPrivacyTrustDashboardScreen",
    "getScholarReviewQueueScreen",
    "getPersonalAIMemoryControlsScreen",
  ].forEach((needle) => {
    requireNotIncludes(
      rootStack,
      needle,
      "Root stack AI route reset",
      findings,
    );
    requireNotIncludes(drawer, needle, "Drawer AI route reset", findings);
    requireNotIncludes(
      bottomTabs,
      needle,
      "Bottom tabs AI route reset",
      findings,
    );
  });

  [
    'navigation.navigate("Chat"',
    'navigation.navigate("SavedAIAnswers"',
    'navigation.navigate("PrivacyTrustDashboard"',
    'navigation.navigate("ScholarReviewQueue"',
    'navigation.navigate("PersonalAIMemoryControls"',
  ].forEach((needle) => {
    requireNotIncludes(
      home,
      needle,
      "Home must not route to retired AI screens",
      findings,
    );
    requireNotIncludes(
      homeScreen,
      needle,
      "Home screen must not route to retired AI screens",
      findings,
    );
    requireNotIncludes(
      modal,
      needle,
      "AI modal must not route to retired AI screens",
      findings,
    );
    requireNotIncludes(
      floating,
      needle,
      "Floating AI button must not route to retired AI screens",
      findings,
    );
  });

  requireIncludes(
    home,
    "NurAIContextCard",
    "Home single Personal AI briefing card",
    findings,
  );
  requireIncludes(
    contextCard,
    'testID="home-nur-ai-context-card"',
    "Home single Personal AI entry",
    findings,
  );
  requireIncludes(
    homeScreen,
    "personalAIBriefing={homePersonalAIBriefing}",
    "Home passes personal briefing data",
    findings,
  );
  requireIncludes(
    modal,
    "return null;",
    "AI response modal is disabled during reset",
    findings,
  );

  if (findings.length) {
    console.error("AI CTA reset check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "AI CTA reset check passed: retired AI destinations are removed and Home keeps one Personal AI briefing surface.",
  );
}

main();
