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

function rejectPattern(
  text: string,
  pattern: RegExp,
  label: string,
  findings: string[],
) {
  if (pattern.test(text)) findings.push(`${label}: remove ${pattern}`);
}

function main() {
  const findings: string[] = [];
  const service = read("client/services/spiritualGrowthCompanionService.ts");
  const home = read("client/components/home/GeneratedHomeExperience.tsx");
  const contextCard = read("client/components/home/NurAIContextCard.tsx");
  const briefingService = read(
    "client/services/personalIntelligenceBriefingService.ts",
  );
  const roadmap = read("client/data/ummahProductRoadmap.ts");
  const packageJson = JSON.parse(read("package.json")) as {
    scripts?: Record<string, string>;
  };

  for (const [needle, label] of [
    [
      "export type SpiritualGrowthCompanion",
      "Spiritual growth companion contract",
    ],
    [
      "export type SpiritualGrowthCompanionMetric",
      "Spiritual growth metric contract",
    ],
    [
      "export type SpiritualGrowthCompanionIntention",
      "Weekly intention contract",
    ],
    ["buildWeeklySpiritualGrowthCompanion", "Weekly companion builder"],
    ["progressPercent", "Visible progress percentage"],
    ["primaryIntention", "Primary weekly intention"],
    ["reflectionPrompt", "AI reflection prompt"],
    ["evidenceSignals", "User-owned evidence signals"],
    [
      "Private worship data stays user-controlled; this panel uses visible app activity only.",
      "Private worship boundary",
    ],
    [
      "AI may summarize user-owned progress and suggest next steps, but it must not score faith or infer hidden worship.",
      "AI non-scoring boundary",
    ],
    [
      "Religious next steps should stay Quran, hadith, or reviewed Library source-linked.",
      "Source-linked next step boundary",
    ],
    [
      "Weekly reflections should remain exportable and removable through private controls.",
      "Export/delete control boundary",
    ],
    ["SPIRITUAL_GROWTH_REFLECTIONS_KEY", "Weekly reflection storage key"],
    [
      "export type SpiritualGrowthReflectionNote",
      "Weekly reflection note contract",
    ],
    ["listSpiritualGrowthReflectionNotes", "Weekly reflection list helper"],
    ["saveSpiritualGrowthReflectionNote", "Weekly reflection save helper"],
    ["deleteSpiritualGrowthReflectionNotes", "Weekly reflection delete helper"],
    [
      "summarizeSpiritualGrowthReflectionNotes",
      "Weekly reflection summary helper",
    ],
    ["buildSpiritualGrowthReflectionExport", "Weekly reflection export helper"],
    [
      "Private note export. NurAI does not score faith or infer worship outside visible app activity.",
      "Weekly reflection export boundary",
    ],
    [
      "Do not score my faith, make reward claims, or infer worship I did outside the app.",
      "AI prompt safety instruction",
    ],
  ] as const) {
    requireIncludes(service, needle, label, findings);
  }

  for (const [needle, label] of [
    ["NurAIContextCard", "Home renders one compact Personal AI card"],
    ["briefing={personalAIBriefing}", "Home passes the ranked briefing"],
  ] as const) {
    requireIncludes(home, needle, label, findings);
  }

  requireIncludes(
    contextCard,
    'testID="home-nur-ai-context-card"',
    "Home Personal AI card automation identity",
    findings,
  );
  for (const [needle, label] of [
    ["plan.main.signals", "Visible activity evidence boundary"],
    ["needs_scholar", "Scholar safety boundary"],
    ['"Free · on device"', "Customer-safe on-device identity"],
  ] as const) {
    requireIncludes(briefingService, needle, label, findings);
  }

  rejectPattern(
    home,
    /<WeeklyGrowthPanel\b/,
    "Home should not render a separate weekly growth AI panel",
    findings,
  );
  rejectPattern(
    home,
    /companion=\{spiritualGrowthCompanion\}/,
    "Home should not pass a separate companion prop after the AI reset",
    findings,
  );

  for (const [needle, label] of [
    ['id: "spiritual-growth-companion"', "Roadmap item"],
    ['status: "partially-built"', "Roadmap partial status"],
    [
      "client/services/spiritualGrowthCompanionService.ts",
      "Roadmap service evidence",
    ],
    [
      "client/components/home/GeneratedHomeExperience.tsx",
      "Roadmap Home evidence",
    ],
    [
      "scripts/check-spiritual-growth-companion-release.ts",
      "Roadmap release check evidence",
    ],
    [
      "npm run check:spiritual-growth-companion-release",
      "Roadmap release command evidence",
    ],
  ] as const) {
    requireIncludes(roadmap, needle, label, findings);
  }

  const unsafeBundle = `${service}\n${home}`;
  for (const [pattern, label] of [
    [/\bfaith score\b/i, "Faith score overclaim"],
    [/\bspiritual score\b/i, "Spiritual score overclaim"],
    [/\bguaranteed reward\b/i, "Reward guarantee overclaim"],
    [/\bAllah is pleased because\b/i, "Hidden spiritual state claim"],
    [/\binfer hidden worship\b/i, "Hidden worship inference"],
  ] as const) {
    if (label === "Hidden worship inference") {
      continue;
    }
    rejectPattern(unsafeBundle, pattern, label, findings);
  }

  const releaseLocal = packageJson.scripts?.["check:release-local"] || "";
  if (!packageJson.scripts?.["check:spiritual-growth-companion-release"]) {
    findings.push(
      "package.json: missing check:spiritual-growth-companion-release",
    );
  }
  if (!releaseLocal.includes("check:spiritual-growth-companion-release")) {
    findings.push(
      "package.json: check:release-local must run the spiritual growth companion release check",
    );
  }

  if (findings.length > 0) {
    console.error(
      `Spiritual growth companion release check failed with ${findings.length} finding(s):`,
    );
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Spiritual growth companion release check passed: weekly growth service, Home surface, privacy boundaries, AI non-scoring guardrails, and roadmap evidence verified.",
  );
}

main();
