#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

import {
  buildPrivacyTrustDataLifecycleContract,
  buildPrivacyTrustReadinessSummary,
  type PrivacyTrustDataControlRow,
} from "../client/services/privacyTrustEvidenceService";

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

function runServiceBehaviorCheck(findings: string[]) {
  const settingsControl: PrivacyTrustDataControlRow = {
    id: "app-lock-backup",
    title: "App lock and backup",
    storageLabel: "Device security controls",
    evidenceLabel: "App Lock protected",
    controlLabel:
      "Enable lock, export backup, or delete account from Settings.",
    actionLabel: "Open settings",
    routeName: "Settings",
    icon: "lock",
    tone: "clear",
  };

  const summary = buildPrivacyTrustReadinessSummary([settingsControl], []);
  if (!summary.nextActionRouteName) {
    findings.push(
      "Privacy trust readiness summary should keep a safe next action.",
    );
  }

  const lifecycle = buildPrivacyTrustDataLifecycleContract({
    hasPersonalPlan: true,
    weeklyReflectionCount: 1,
    savedAnswerCount: 0,
    reviewPacketCount: 0,
    releaseGateBlockedCount: 0,
  });
  if (!lifecycle.items.length) {
    findings.push(
      "Privacy trust lifecycle contract should expose local control rows.",
    );
  }
}

function main() {
  const findings: string[] = [];
  const service = read("client/services/privacyTrustEvidenceService.ts");
  const rootStack = read("client/navigation/RootStackNavigator.tsx");
  const settings = read("client/screens/SettingsScreen.tsx");

  for (const retired of [
    "client/screens/PrivacyTrustDashboardScreen.tsx",
    "client/screens/SavedAIAnswersScreen.tsx",
    "client/screens/ScholarReviewQueueScreen.tsx",
  ]) {
    if (exists(retired))
      findings.push(`Retired trust screen still exists: ${retired}`);
  }

  for (const needle of [
    'name="PrivacyTrustDashboard"',
    'name="SavedAIAnswers"',
    'name="ScholarReviewQueue"',
    'navigation.navigate("PrivacyTrustDashboard"',
    'navigation.navigate("SavedAIAnswers"',
    'navigation.navigate("ScholarReviewQueue"',
  ]) {
    requireNotIncludes(rootStack, needle, "Navigator trust reset", findings);
    requireNotIncludes(settings, needle, "Settings trust reset", findings);
  }

  for (const [needle, label] of [
    ["buildPrivacyTrustReadinessSummary", "Trust readiness builder"],
    ["buildPrivacyTrustDataLifecycleContract", "Trust data lifecycle builder"],
    ["buildPrivacyTrustConsentLedger", "Consent ledger builder"],
    [
      "buildPrivacyTrustOperationBoundaryContract",
      "Operation boundary builder",
    ],
    ["export type PrivacyTrustDataControlRow", "Trust data control type"],
  ] as const) {
    requireIncludes(service, needle, label, findings);
  }

  runServiceBehaviorCheck(findings);

  if (findings.length) {
    console.error("Privacy trust reset check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Privacy trust reset check passed: trust services remain, but retired trust UI destinations are removed.",
  );
}

main();
