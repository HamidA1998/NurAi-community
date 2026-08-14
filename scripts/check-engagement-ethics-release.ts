#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

import {
  ENGAGEMENT_ETHICS_CONTROLS,
  ENGAGEMENT_ETHICS_SOURCES,
  buildEngagementEthicsSummary,
  type EngagementEthicsSurfaceId,
} from "../client/data/engagementEthics";

const root = process.cwd();

const wantsJson = process.argv.includes("--json");
const REQUIRED_SURFACES: EngagementEthicsSurfaceId[] = [
  "reminders",
  "streak_recovery",
  "subscriptions",
  "kids_mode",
  "family_accountability",
  "ai_nudges",
  "privacy_controls",
];

const bannedEngagementPatterns = [
  /\baddict(?:ed|ive|ion)\b/i,
  /\bhooked\b/i,
  /\blimited time only\b/i,
  /\bact now\b/i,
  /\bguaranteed spiritual\b/i,
  /\bguaranteed reward\b/i,
  /\bfinal fatwa\b/i,
  /\bchild-directed purchase\b/i,
  /\bpublic shame\b/i,
];

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireIncludes(
  text: string,
  needle: string,
  label: string,
  findings: string[],
) {
  if (!text.includes(needle)) findings.push(`${label}: missing ${needle}`);
}

function requireFile(relativePath: string, findings: string[]) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    findings.push(`${relativePath}: missing evidence file`);
  }
}

function rejectFile(relativePath: string, findings: string[]) {
  if (fs.existsSync(path.join(root, relativePath))) {
    findings.push(
      `${relativePath}: retired AI/trust customer screen should be removed.`,
    );
  }
}

function rejectPattern(
  text: string,
  pattern: RegExp,
  label: string,
  findings: string[],
) {
  if (pattern.test(text)) findings.push(`${label}: remove ${pattern}`);
}

function validatePolicyData(findings: string[]) {
  const summary = buildEngagementEthicsSummary();
  if (!summary.readyForReleaseQa) {
    findings.push(
      `engagement ethics summary has ${summary.blockerCount} blocker(s).`,
    );
  }

  if (ENGAGEMENT_ETHICS_SOURCES.length < 4) {
    findings.push("engagement ethics policy must keep at least four sources.");
  }

  const seen = new Set<string>();
  for (const control of ENGAGEMENT_ETHICS_CONTROLS) {
    seen.add(control.id);
    if (control.requiredControls.length < 2) {
      findings.push(`${control.id}: missing required user controls.`);
    }
    if (control.forbiddenPatterns.length < 2) {
      findings.push(`${control.id}: missing forbidden-pattern guardrails.`);
    }
    if (control.evidenceFiles.length < 2) {
      findings.push(`${control.id}: missing evidence files.`);
    }
    for (const evidenceFile of control.evidenceFiles) {
      requireFile(evidenceFile, findings);
    }
    for (const pattern of bannedEngagementPatterns) {
      rejectPattern(
        `${control.title}\n${control.userPromise}\n${control.requiredControls.join("\n")}`,
        pattern,
        `client/data/engagementEthics.ts:${control.id}`,
        findings,
      );
    }
  }

  for (const required of REQUIRED_SURFACES) {
    if (!seen.has(required)) {
      findings.push(`engagement ethics policy missing ${required}.`);
    }
  }
}

function validateImplementationEvidence(findings: string[]) {
  const notificationSettings = read(
    "client/screens/NotificationSettingsScreen.tsx",
  );
  const quranLearning = read("client/services/quranLearningService.ts");
  const subscription = read("client/screens/SubscriptionScreen.tsx");
  const subscriptionContext = read("client/context/SubscriptionContext.tsx");
  const kidsMode = read("client/screens/KidsModeScreen.tsx");
  const kidsParent = read("client/screens/KidsParentScreen.tsx");
  const familyGroup = read("client/screens/FamilyGroupScreen.tsx");
  const aiModal = read("client/components/AIResponseModal.tsx");
  const rootStack = read("client/navigation/RootStackNavigator.tsx");
  const packageJson = JSON.parse(read("package.json")) as {
    scripts?: Record<string, string>;
  };

  for (const [needle, label] of [
    ["quietHours", "Reminder quiet hours"],
    ["smartNuraiReminders", "Smart reminder switch"],
    ["Prayer alerts are ready", "Truthful prayer-alert status copy"],
    ["turn all notification sound off", "Global sound control copy"],
    ["Preview reminder", "Smart reminder preview action"],
    ['testID="smart-nurai-reminder-engine"', "Smart reminder test id"],
  ] as const) {
    requireIncludes(notificationSettings, needle, label, findings);
  }

  for (const [needle, label] of [
    ["No guilt, just a restart.", "No-guilt Quran recovery copy"],
    ["gentle Ramadan/Khatmah pace", "Gentle Khatmah pace copy"],
    [
      "not a religious ruling or promise of reward",
      "Reward overclaim boundary",
    ],
    ["QuranStreakRecoveryKhatmahPlan", "Streak recovery plan type"],
  ] as const) {
    requireIncludes(quranLearning, needle, label, findings);
  }

  for (const [needle, label] of [
    ["getPrice(pkg)", "Store-loaded price"],
    ["Option unavailable", "Unavailable price state"],
    ["button-restore-purchases", "Restore purchases route"],
    ["button-manage-subscription", "Manage subscription route"],
    ["Subscriptions auto-renew unless cancelled", "Renewal copy"],
    ["Manage or cancel your subscription", "Cancellation copy"],
    ["button-terms", "Terms link"],
    ["button-privacy", "Privacy link"],
    ["manageSubscription", "Store account management"],
  ] as const) {
    requireIncludes(subscription, needle, label, findings);
  }
  requireIncludes(
    subscriptionContext,
    "manageSubscription",
    "Subscription context management API",
    findings,
  );

  for (const [needle, label] of [
    ["Parental Notice", "Kids parental notice"],
    ["We do not sell children's personal information", "Kids privacy copy"],
    ["parent PIN is required", "Kids parent PIN copy"],
    ["Age Group", "Kids age group surface"],
    ["resetAllKidsData", "Kids data reset control"],
    ["showExport", "Kids export state"],
  ] as const) {
    const text =
      needle === "showExport" || needle === "resetAllKidsData"
        ? kidsParent
        : kidsMode;
    requireIncludes(text, needle, label, findings);
  }

  for (const [needle, label] of [
    ["Private household growth", "Private family framing"],
    ["gentle reminder or", "Gentle family reminder copy"],
    ["button-cancel-settings", "Family settings cancel"],
    ["button-cancel-goal", "Family goal cancel"],
    ["No family messages yet", "Family empty state"],
  ] as const) {
    requireIncludes(familyGroup, needle, label, findings);
  }

  requireIncludes(
    aiModal,
    "return null;",
    "AI modal disabled during reset",
    findings,
  );

  for (const retired of [
    "client/screens/ChatScreen.tsx",
    "client/screens/PrivacyTrustDashboardScreen.tsx",
    "client/screens/SavedAIAnswersScreen.tsx",
    "client/screens/ScholarReviewQueueScreen.tsx",
    "client/screens/PersonalAIMemoryControlsScreen.tsx",
  ]) {
    rejectFile(retired, findings);
  }

  for (const route of [
    "Chat",
    "PrivacyTrustDashboard",
    "SavedAIAnswers",
    "ScholarReviewQueue",
    "PersonalAIMemoryControls",
  ]) {
    if (rootStack.includes(`name="${route}"`)) {
      findings.push(
        `client/navigation/RootStackNavigator.tsx: remove retired route ${route}.`,
      );
    }
  }

  const releaseLocal = packageJson.scripts?.["check:release-local"] || "";
  if (!releaseLocal.includes("check:engagement-ethics-release")) {
    findings.push(
      "package.json: check:release-local must include check:engagement-ethics-release.",
    );
  }
}

function main() {
  const findings: string[] = [];
  validatePolicyData(findings);
  validateImplementationEvidence(findings);

  const report = {
    ok: findings.length === 0,
    controlCount: ENGAGEMENT_ETHICS_CONTROLS.length,
    sourceCount: ENGAGEMENT_ETHICS_SOURCES.length,
    blockerCount: findings.length,
    findings,
  };

  if (wantsJson) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.ok) {
    console.log(
      `Engagement ethics release check passed: ${report.controlCount} control surfaces and ${report.sourceCount} source principles verified.`,
    );
  } else {
    console.error("Engagement ethics release check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
  }

  if (!report.ok) process.exit(1);
}

main();
