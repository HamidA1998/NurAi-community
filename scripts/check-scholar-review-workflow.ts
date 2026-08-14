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
  const service = read("client/services/scholarReviewPacketService.ts");
  const rootStack = read("client/navigation/RootStackNavigator.tsx");
  const home = read("client/screens/HomeScreen.tsx");
  const modal = read("client/components/AIResponseModal.tsx");
  const quran = read("client/screens/QuranReaderScreen.tsx");

  for (const retired of [
    "client/screens/ScholarReviewQueueScreen.tsx",
    "client/screens/PrivacyTrustDashboardScreen.tsx",
    "client/screens/SavedAIAnswersScreen.tsx",
  ]) {
    if (exists(retired))
      findings.push(`Retired scholar/trust screen still exists: ${retired}`);
  }

  for (const needle of [
    'name="ScholarReviewQueue"',
    'name="PrivacyTrustDashboard"',
    'name="SavedAIAnswers"',
    'navigation.navigate("ScholarReviewQueue"',
    'navigation.navigate("PrivacyTrustDashboard"',
    'navigation.navigate("SavedAIAnswers"',
  ]) {
    requireNotIncludes(
      rootStack,
      needle,
      "Navigator scholar/trust reset",
      findings,
    );
    requireNotIncludes(home, needle, "Home scholar/trust reset", findings);
    requireNotIncludes(modal, needle, "AI modal scholar/trust reset", findings);
  }

  for (const [needle, label] of [
    ["SCHOLAR_REVIEW_PACKETS_KEY", "Local packet storage key"],
    ["saveScholarReviewPacket", "Packet save function"],
    ["scholarReviewPacketReadinessIssues", "Packet readiness gate"],
    [
      "Scholar review evidence is incomplete",
      "Packet service rejects incomplete review evidence",
    ],
    ["buildScholarReviewPacketShareText", "Packet share builder"],
  ] as const) {
    requireIncludes(service, needle, label, findings);
  }

  requireIncludes(
    quran,
    "This is not a final fatwa or personal ruling.",
    "Quran reader still keeps scholar-boundary copy inside sensitive study flows",
    findings,
  );

  if (findings.length) {
    console.error("Scholar review reset check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Scholar review reset check passed: customer queue screens are removed while safety packet services remain.",
  );
}

main();
