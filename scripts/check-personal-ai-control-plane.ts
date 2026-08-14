#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath: string) {
  return fs.existsSync(path.join(root, relativePath));
}

function requireIncludes(
  text: string,
  needle: string,
  label: string,
  findings: string[],
) {
  if (!text.includes(needle)) findings.push(`${label}: missing ${needle}`);
}

function requireNotIncludes(
  text: string,
  needle: string,
  label: string,
  findings: string[],
) {
  if (text.includes(needle)) findings.push(`${label}: remove ${needle}`);
}

function main() {
  const findings: string[] = [];
  const home = read("client/components/home/GeneratedHomeExperience.tsx");
  const homeScreen = read("client/screens/HomeScreen.tsx");
  const rootStack = read("client/navigation/RootStackNavigator.tsx");
  const actionRegistry = read("client/services/personalAIActionRegistry.ts");
  const featureAdapters = read("client/services/personalAIFeatureAdapters.ts");
  const contextBuilder = read("client/services/homeAIContextService.ts");
  const ranker = read("client/services/homeGuidanceRanker.ts");
  const glass = read("client/design-system/NuraiGlass.tsx");
  const contextCardStatePath =
    "client/services/homeAIContextCardStateService.ts";
  const contextCardState = exists(contextCardStatePath)
    ? read(contextCardStatePath)
    : "";
  const briefing = read(
    "client/services/personalIntelligenceBriefingService.ts",
  );
  const contextCardPath = "client/components/home/NurAIContextCard.tsx";
  const contextCard = exists(contextCardPath) ? read(contextCardPath) : "";

  if (!exists(contextCardPath)) {
    findings.push(
      "Home AI surface: missing reusable client/components/home/NurAIContextCard.tsx",
    );
  }
  requireIncludes(
    contextCard,
    "NuraiGlass",
    "Home context card Liquid Glass surface",
    findings,
  );
  requireIncludes(
    contextCard,
    "onLongPress",
    "Home context card save and dismiss menu",
    findings,
  );
  requireIncludes(
    contextCard,
    "useReducedMotion",
    "Home context card reduced-motion fallback",
    findings,
  );
  requireIncludes(
    glass,
    "isReduceTransparencyEnabled",
    "Liquid Glass reduce-transparency fallback",
    findings,
  );
  requireIncludes(
    contextCardState,
    "saveHomeAIContextMessage",
    "Persistent Home context message save action",
    findings,
  );

  for (const retired of [
    "client/screens/ChatScreen.tsx",
    "client/screens/PersonalAIMemoryControlsScreen.tsx",
    "client/screens/PrivacyTrustDashboardScreen.tsx",
    "client/screens/SavedAIAnswersScreen.tsx",
    "client/screens/ScholarReviewQueueScreen.tsx",
  ]) {
    if (exists(retired))
      findings.push(`Retired AI screen still exists: ${retired}`);
  }

  for (const route of [
    "Chat",
    "PersonalAIMemoryControls",
    "PrivacyTrustDashboard",
    "SavedAIAnswers",
    "ScholarReviewQueue",
  ]) {
    requireNotIncludes(
      rootStack,
      `name="${route}"`,
      "Root stack AI reset",
      findings,
    );
    requireNotIncludes(
      home,
      `navigation.navigate("${route}"`,
      "Home AI reset",
      findings,
    );
    requireNotIncludes(
      homeScreen,
      `navigation.navigate("${route}"`,
      "Home screen AI reset",
      findings,
    );
  }

  requireIncludes(
    home,
    "UnifiedPersonalAICard",
    "Single home Personal AI briefing component",
    findings,
  );
  requireIncludes(
    home,
    "NurAIContextCard",
    "Compact Home context card",
    findings,
  );
  requireIncludes(
    home,
    "isHomeAIContextMessageSaved",
    "Home context card saved-state hydration",
    findings,
  );
  requireNotIncludes(
    home,
    "PersonalGuideHomeCard",
    "Retired oversized Home intelligence panel",
    findings,
  );
  requireIncludes(
    homeScreen,
    "personalAIBriefing={homePersonalAIBriefing}",
    "Home personal briefing data flow",
    findings,
  );
  requireIncludes(
    homeScreen,
    "buildPersonalAIHomeSurfaceBundle",
    "Safe Home context reaches paid Personal AI",
    findings,
  );
  requireIncludes(
    homeScreen,
    "recordHomeAIFeedback",
    "Home AI feedback loop",
    findings,
  );
  requireIncludes(
    homeScreen,
    "personalAIUnavailableCopy(personalAITier).message",
    "Paid AI unavailable fallback state",
    findings,
  );
  requireIncludes(
    home,
    'resolvePersonalAIExperience(userTier, "home")',
    "Shared free and paid Personal AI experience contract",
    findings,
  );
  requireIncludes(
    contextBuilder,
    "Privacy: do not infer private journal text",
    "Home context privacy boundary",
    findings,
  );
  requireIncludes(
    ranker,
    "buildHomeGuidancePlan",
    "Deterministic Home recommendation ranker",
    findings,
  );
  requireIncludes(
    briefing,
    'modelMode: "on_device" | "personalized"',
    "Unified free and paid briefing contract",
    findings,
  );
  requireNotIncludes(
    briefing,
    "route: response",
    "Model responses cannot control navigation",
    findings,
  );
  requireIncludes(
    actionRegistry,
    "resolvePersonalAIAction",
    "Personal action registry remains available for the future briefing",
    findings,
  );
  requireIncludes(
    featureAdapters,
    "buildPersonalAIFeaturePrompt",
    "Feature adapters remain available without separate AI screens",
    findings,
  );

  if (findings.length) {
    console.error("Personal AI reset check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Personal AI control-plane check passed: one ranked Home briefing, safe context, feedback, and controlled actions.",
  );
}

main();
