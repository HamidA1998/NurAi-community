#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath))
    throw new Error(`${relativePath}: missing file`);
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(
  text: string,
  needle: string,
  label: string,
  findings: string[],
) {
  if (!text.includes(needle)) findings.push(`${label}: missing ${needle}`);
}

function main() {
  const findings: string[] = [];
  const service = read("client/services/familySafeKidsLearningService.ts");
  const kidsMode = read("client/screens/KidsModeScreen.tsx");
  const parent = read("client/screens/KidsParentScreen.tsx");
  const roadmap = read("client/data/ummahProductRoadmap.ts");
  const packageJson = JSON.parse(read("package.json")) as {
    scripts?: Record<string, string>;
  };

  for (const [needle, label] of [
    ["export type FamilySafeKidsLearningPlan", "Family plan contract"],
    ["export type FamilyKidsLearningLane", "Lesson lane contract"],
    ["export type FamilyKidsSafetyBoundary", "Safety boundary contract"],
    ["export type FamilyKidsWeeklyMission", "Weekly mission contract"],
    ["export type FamilyKidsReviewReceipt", "Review receipt contract"],
    ["buildFamilySafeKidsLearningPlan", "Family plan builder"],
    ["Parent-approved learning", "Parent-approved learning copy"],
    ["Reviewed story cards", "Reviewed stories lane"],
    ["Quran manners games", "Quran manners lane"],
    ["Dua and surah practice", "Dua memorization lane"],
    ["Family challenge", "Family challenge lane"],
    ["nextParentReviewLabel", "Next parent review contract"],
    ["weeklyMissions", "Weekly mission plan"],
    ["reviewReceipts", "Review receipt plan"],
    ["One reviewed story", "Weekly reviewed story mission"],
    ["Quran manners moment", "Weekly Quran manners mission"],
    ["Dua or surah practice", "Weekly dua practice mission"],
    ["Family good deed", "Weekly family service mission"],
    ["Worship is never gamed or shamed", "Healthy worship boundary"],
    ["No open AI chat for kids", "No open AI chat boundary"],
    ["Reviewed before child view", "Review before child view boundary"],
    ["No external video feeds", "No external video feed boundary"],
    ["Parent PIN for settings", "Parent PIN boundary"],
    ["Healthy rewards only", "Healthy rewards boundary"],
    [
      "Child-safe explanations must be reviewed before child view",
      "Child-safe explanation policy",
    ],
  ] as const) {
    requireIncludes(service, needle, label, findings);
  }

  for (const [needle, label] of [
    ["buildFamilySafeKidsLearningPlan", "Kids Mode imports plan builder"],
    ["familySafeLearningPlan", "Kids Mode plan memo"],
    ["FamilySafeKidsLearningPanel", "Kids Mode plan panel"],
    ['testID="kids-family-safe-learning-plan"', "Kids Mode test hook"],
    ['testID="kids-weekly-family-plan"', "Kids Mode weekly plan hook"],
    [
      "testID={`kids-weekly-family-mission-${mission.id}`}",
      "Kids Mode weekly mission hooks",
    ],
    ['testID="kids-family-safety-receipts"', "Kids Mode review receipt hook"],
    [
      "testID={`kids-family-safety-receipt-${receipt.id}`}",
      "Kids Mode review receipt item hooks",
    ],
    ["FAMILY-SAFE KIDS MODE", "Kids Mode hierarchy copy"],
    ["WEEKLY FAMILY PLAN", "Kids Mode weekly plan heading"],
    ["plan.nextParentReviewLabel", "Kids Mode next review render"],
    ["plan.weeklyMissions.slice(0, 3)", "Kids Mode weekly mission render"],
    ["mission.childViewLabel", "Kids Mode child-view boundary render"],
    ["plan.reviewReceipts.slice(0, 2)", "Kids Mode review receipt render"],
    [
      "No open AI chat for kids. Reviewed stories before child view.",
      "Kids safety copy",
    ],
    ['testID="button-kids-open-parent-controls"', "Parent controls CTA"],
    [
      'accessibilityLabel="Open parent controls for Kids Mode"',
      "Parent controls accessibility label",
    ],
    [
      'accessibilityHint="Review age band, daily limits, parent PIN, and child-safety settings"',
      "Parent controls accessibility hint",
    ],
  ] as const) {
    requireIncludes(kidsMode, needle, label, findings);
  }

  for (const [needle, label] of [
    [
      "buildFamilySafeKidsLearningPlan",
      "Parent dashboard imports plan builder",
    ],
    ["FamilySafetyReviewPanel", "Parent dashboard safety panel"],
    ['testID="kids-parent-child-safety-review"', "Parent review test hook"],
    ["Child Safety Review", "Parent safety section title"],
    ["plan.reviewQueueLabel", "Parent review queue render"],
    ["plan.nextParentReviewLabel", "Parent next review render"],
    ['testID="kids-parent-next-review"', "Parent next review test hook"],
    ['testID="kids-parent-weekly-family-plan"', "Parent weekly plan test hook"],
    [
      "testID={`kids-parent-weekly-mission-${mission.id}`}",
      "Parent weekly mission hooks",
    ],
    ["mission.parentProofLabel", "Parent proof label render"],
    ["plan.childSafeExplanationPolicy", "Parent child-safe policy render"],
    ["plan.safetyBoundaries.slice(0, 3)", "Parent safety boundaries render"],
    ['testID="kids-parent-review-receipts"', "Parent receipt test hook"],
    [
      "testID={`kids-parent-review-receipt-${receipt.id}`}",
      "Parent receipt item hooks",
    ],
    ["receipt.boundaryLabel", "Parent receipt boundary render"],
    ["Approved lane", "Parent approved lane state"],
  ] as const) {
    requireIncludes(parent, needle, label, findings);
  }

  const itemStart = roadmap.indexOf('id: "family-safe-kids-learning"');
  const itemEnd = roadmap.indexOf('id: "credible-learning-library"', itemStart);
  const item =
    itemStart >= 0 && itemEnd > itemStart
      ? roadmap.slice(itemStart, itemEnd)
      : "";

  for (const [needle, label] of [
    ['id: "family-safe-kids-learning"', "Roadmap item"],
    ['status: "partially-built"', "Roadmap partial status"],
    [
      "client/services/familySafeKidsLearningService.ts",
      "Roadmap service evidence",
    ],
    ["client/screens/KidsModeScreen.tsx", "Roadmap Kids Mode evidence"],
    ["client/screens/KidsParentScreen.tsx", "Roadmap parent evidence"],
    [
      "scripts/check-family-safe-kids-learning-release.ts",
      "Roadmap release check evidence",
    ],
    [
      "npm run check:family-safe-kids-learning-release",
      "Roadmap command evidence",
    ],
  ] as const) {
    requireIncludes(item, needle, label, findings);
  }

  const releaseLocal = packageJson.scripts?.["check:release-local"] || "";
  if (!packageJson.scripts?.["check:family-safe-kids-learning-release"]) {
    findings.push(
      "package.json: missing check:family-safe-kids-learning-release",
    );
  }
  if (!releaseLocal.includes("check:family-safe-kids-learning-release")) {
    findings.push(
      "package.json: check:release-local must run the family-safe kids learning release check",
    );
  }

  if (findings.length > 0) {
    console.error(
      `Family-safe kids learning release check failed with ${findings.length} finding(s):`,
    );
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Family-safe kids learning release check passed: parent-approved lanes, child-safety boundaries, Kids Mode panel, Parent Dashboard review, and roadmap evidence verified.",
  );
}

main();
