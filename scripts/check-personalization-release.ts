#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath}: missing file`);
  }
  return fs.readFileSync(filePath, "utf8");
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
  const onboarding = read("client/screens/OnboardingScreen.tsx");
  const planService = read("client/services/personalNurAIPlanService.ts");
  const homeScreen = read("client/screens/HomeScreen.tsx");
  const generatedHome = read(
    "client/components/home/GeneratedHomeExperience.tsx",
  );
  const contextCard = read("client/components/home/NurAIContextCard.tsx");
  const briefingService = read(
    "client/services/personalIntelligenceBriefingService.ts",
  );
  const rootStack = read("client/navigation/RootStackNavigator.tsx");
  const modal = read("client/components/AIResponseModal.tsx");
  const aiContext = read("client/services/aiContextService.ts");

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

  for (const needle of [
    'name="Chat"',
    'name="PrivacyTrustDashboard"',
    'name="SavedAIAnswers"',
    'name="ScholarReviewQueue"',
    'name="PersonalAIMemoryControls"',
    'navigation.navigate("Chat"',
    'navigation.navigate("PrivacyTrustDashboard"',
    'navigation.navigate("SavedAIAnswers"',
    'navigation.navigate("ScholarReviewQueue"',
    'navigation.navigate("PersonalAIMemoryControls"',
  ]) {
    requireNotIncludes(
      rootStack,
      needle,
      "Retired personalization route",
      findings,
    );
    requireNotIncludes(
      homeScreen,
      needle,
      "Home retired personalization route",
      findings,
    );
    requireNotIncludes(
      generatedHome,
      needle,
      "Home card retired personalization route",
      findings,
    );
    requireNotIncludes(
      modal,
      needle,
      "AI modal retired personalization route",
      findings,
    );
  }

  for (const [needle, label] of [
    ["Build your rhythm", "Onboarding goal step"],
    ["Personalise depth", "Onboarding depth step"],
    ["Quran rhythm", "Onboarding Quran step"],
    ["Arabic level", "Onboarding Arabic step"],
    ["Guidance preference", "Onboarding guidance step"],
    ["Family support", "Onboarding family step"],
    ["Reading language", "Onboarding language step"],
    ["Prayer rhythm", "Onboarding prayer habit step"],
    ["Prayer reminders", "Onboarding prayer reminder step"],
    ["Personal look", "Onboarding theme step"],
    ['"onboarding_preferences"', "Preferences persistence"],
    ['syncedSetItem("nurai_personal_plan"', "Personal plan persistence"],
    ['syncedSetItem("onboarding_completed"', "Completion persistence"],
    ["buildPersonalNurAIPlan(preferences)", "Personal plan build call"],
    ["buildPersonalHomePlanSummary", "Personal plan summary preview"],
  ] as const) {
    requireIncludes(onboarding, needle, label, findings);
  }

  for (const [needle, label] of [
    ["export type OnboardingPreferences", "Preferences type"],
    [
      "export function buildPersonalNurAIPlan",
      "Canonical personal plan builder",
    ],
    [
      "export function buildPersonalHomePlanSummary",
      "Home plan summary builder",
    ],
    ["quranLevel: string", "Quran level field"],
    ["arabicLevel: string", "Arabic level field"],
    ["guidancePreference: string", "Guidance preference field"],
    ["familyNeeds: string[]", "Family needs field"],
    ["prayerHabit: string", "Prayer habit field"],
    ["prayerSetup: string", "Prayer setup field"],
    ["recommendedActionLabel", "Recommended action summary label"],
    ["reviewCadenceLabel", "Review cadence summary label"],
    ["planFreshnessLabel", "Plan freshness summary label"],
    ["personalizationBoundaryLabel", "Personalization boundary summary label"],
    ["visible plan signals only", "Visible-signal personalization boundary"],
  ] as const) {
    requireIncludes(planService, needle, label, findings);
  }

  for (const [needle, label] of [
    ["personalHomePlan", "Home loads personal plan"],
    ["homePersonalAIBriefing", "Home builds single V3 briefing"],
    ["personalAIBriefing={homePersonalAIBriefing}", "Home passes V3 briefing"],
    [
      "personalPlan={personalHomePlan}",
      "Home passes personal plan to Home experience",
    ],
  ] as const) {
    requireIncludes(homeScreen, needle, label, findings);
  }

  for (const [needle, label] of [
    ["UnifiedPersonalAICard", "Single Home Personal AI card"],
    [
      "briefing={personalAIBriefing}",
      "Personal AI card receives the ranked briefing",
    ],
    ["visible app activity", "Visible activity boundary"],
  ] as const) {
    requireIncludes(generatedHome, needle, label, findings);
  }
  requireIncludes(
    contextCard,
    'testID="home-nur-ai-context-card"',
    "Single Personal AI entry test id",
    findings,
  );

  for (const [needle, label] of [
    ["buildPersonalIntelligenceBriefing", "Canonical briefing builder"],
    ['modelMode: "on_device" | "personalized"', "Free and paid AI boundary"],
    ['"Free · on device"', "Honest free on-device label"],
    ["plan.main.signals", "Ranked visible-signal evidence"],
  ] as const) {
    requireIncludes(briefingService, needle, label, findings);
  }

  for (const [needle, label] of [
    ["askContextualAI", "Contextual AI request helper remains available"],
    ["context: Record<string, unknown>", "Structured context boundary"],
    [
      "do not infer intention, private worship quality",
      "Private inference boundary",
    ],
  ] as const) {
    requireIncludes(aiContext, needle, label, findings);
  }

  if (findings.length) {
    console.error(
      `Personalization release check failed with ${findings.length} finding(s):`,
    );
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Personalization release check passed: onboarding, safe plan storage, visible-signal context, and the single Home Personal AI briefing are aligned with the reset.",
  );
}

main();
