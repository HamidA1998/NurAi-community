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
  const service = read("client/services/quranReflectionCircleService.ts");
  const quranLearning = read("client/services/quranLearningService.ts");
  const dailyDeenJourney = read("client/services/dailyDeenJourneyService.ts");
  const generatedHome = read(
    "client/components/home/GeneratedHomeExperience.tsx",
  );
  const homeScreen = read("client/screens/HomeScreen.tsx");
  const roadmap = read("client/data/ummahProductRoadmap.ts");
  const packageJson = JSON.parse(read("package.json")) as {
    scripts?: Record<string, string>;
  };

  for (const [needle, label] of [
    ["QURAN_REFLECTION_CIRCLES_KEY", "Circle storage key"],
    ["QURAN_REFLECTION_CIRCLE_DRAFTS_KEY", "Draft storage key"],
    ["QuranReflectionCirclePrivacy", "Privacy model"],
    ['| "private"', "Private-by-default privacy"],
    ['| "family"', "Family circle privacy"],
    ['| "teacher"', "Teacher circle privacy"],
    ['| "moderated"', "Moderated circle privacy"],
    ["QuranCircleReflectionStatus", "Draft review status"],
    ['"pending_review"', "Pending review status"],
    ['"approved"', "Approved status"],
    ["buildQuranReflectionCircleSafetyChecklist", "Safety checklist builder"],
    ['id: "private_by_default"', "Private-by-default safety item"],
    ['id: "moderation_before_sharing"', "Moderation safety item"],
    ['id: "not_religious_authority"', "Authority safety item"],
    ['id: "source_boundary_visible"', "Source boundary safety item"],
    ["saveQuranReflectionCircle", "Circle save function"],
    ["saveQuranCircleReflectionDraft", "Draft save function"],
    ["updateQuranCircleReflectionStatus", "Draft moderation function"],
    ["summarizeQuranReflectionCircles", "Circle summary function"],
    ["getQuranReflectionCircleSummary", "Circle summary loader"],
    ["not scholarship, tafsir, or a final ruling", "Non-authority copy"],
    [
      "Circle-visible reflections stay pending",
      "Pending review moderation policy",
    ],
  ] as const) {
    requireIncludes(service, needle, label, findings);
  }

  for (const [needle, label] of [
    ["QuranReflectionNote", "Private reflection note model"],
    ["saveQuranReflectionNote", "Private reflection save function"],
    ["getQuranReflectionNotes", "Private reflection list function"],
    ["createFamilyQuranChallenge", "Family Quran challenge function"],
    ["familyMilestones", "Family listen-reflect-apply milestones"],
  ] as const) {
    requireIncludes(quranLearning, needle, label, findings);
  }

  for (const [needle, label] of [
    ["getQuranReflectionCircleSummary", "Daily Deen circle summary loader"],
    ['id: "quran-circle:review-pending"', "Daily Deen pending review action"],
    ['id: "quran-circle:add-reflection"', "Daily Deen add reflection action"],
    ['screen: "FamilyGroup"', "Daily Deen reflection circle route"],
    ["Quran reflection circle safety", "Daily Deen safety reason"],
    [
      "Keep it private or circle-only with Quran references and source boundaries.",
      "Daily Deen private/source boundary copy",
    ],
  ] as const) {
    requireIncludes(dailyDeenJourney, needle, label, findings);
  }

  for (const [needle, label] of [
    ["quranReflectionCircleSummary", "Generated Home circle summary prop"],
    ["Review Quran reflections", "Generated Home review title"],
    [
      "private by default with source boundaries",
      "Generated Home private/source boundary copy",
    ],
    ["hasPendingCircleReflection", "Generated Home pending review state"],
    ["hasOpenCircle", "Generated Home open circle state"],
  ] as const) {
    requireIncludes(generatedHome, needle, label, findings);
  }

  for (const [needle, label] of [
    ["getQuranReflectionCircleSummary", "Home circle summary loader"],
    ["setQuranReflectionSummary", "Home circle summary state"],
    [
      "quranReflectionCircleSummary={quranReflectionSummary}",
      "Home passes circle summary into generated experience",
    ],
  ] as const) {
    requireIncludes(homeScreen, needle, label, findings);
  }

  for (const [needle, label] of [
    ['id: "quran-reflection-circles"', "Roadmap item"],
    ['status: "partially-built"', "Roadmap partial status"],
    ["client/services/quranReflectionCircleService.ts", "Roadmap evidence"],
    [
      "scripts/check-quran-reflection-circles-release.ts",
      "Roadmap release check evidence",
    ],
  ] as const) {
    requireIncludes(roadmap, needle, label, findings);
  }

  const releaseLocal = packageJson.scripts?.["check:release-local"] || "";
  if (!packageJson.scripts?.["check:quran-reflection-circles-release"]) {
    findings.push(
      "package.json: missing check:quran-reflection-circles-release",
    );
  }
  if (!releaseLocal.includes("check:quran-reflection-circles-release")) {
    findings.push(
      "package.json: check:release-local must run quran reflection circles release check",
    );
  }

  if (findings.length > 0) {
    console.error(
      `Quran reflection circles release check failed with ${findings.length} finding(s):`,
    );
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Quran reflection circles release check passed: private notes, family challenges, circle storage, moderation states, source boundaries, Daily Deen/Home integration, and roadmap evidence verified.",
  );
}

main();
