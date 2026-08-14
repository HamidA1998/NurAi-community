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

function requireIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      findings.push(`${relativePath}: missing ${JSON.stringify(snippet)}`);
    }
  }
}

function requireNotIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (text.includes(snippet)) {
      findings.push(`${relativePath}: remove ${JSON.stringify(snippet)}`);
    }
  }
}

function main() {
  const findings = [];
  const serverStructured = read(
    "server/replit_integrations/nurai-context/structuredResponse.ts",
  );
  const clientService = read("client/services/aiContextService.ts");
  const modal = read("client/components/AIResponseModal.tsx");
  const floating = read("client/components/AIFloatingButton.tsx");
  const packageJson = JSON.parse(read("package.json"));

  requireIncludes(
    serverStructured,
    "server/replit_integrations/nurai-context/structuredResponse.ts",
    [
      "learningSections?: AILearningSection[]",
      "type AILearningSectionKind",
      "parseQuranLearningSections",
      "buildFallbackQuranLearningSections",
      "buildLearningSections",
      "hasVerifiedQuranAppContext",
      "isGenericQuranSourceReviewText",
      "quranReferenceFromContext",
    ],
    findings,
  );

  requireIncludes(
    clientService,
    "client/services/aiContextService.ts",
    [
      "learningSections?:",
      '"key_words"',
      '"journey"',
      '"avoid"',
      "sourceRefs?: string[]",
      "quranMemory?: Record<string, unknown>",
      "quranMemory: params.quranMemory",
    ],
    findings,
  );

  requireIncludes(
    modal,
    "client/components/AIResponseModal.tsx",
    ["export function AIResponseModal", "return null;", "learningSections?:"],
    findings,
  );
  requireNotIncludes(
    modal,
    "client/components/AIResponseModal.tsx",
    [
      "Quran learning lens",
      "quran-ai-lens-map",
      "quran-ai-structured-answer-map",
      "One-minute ayah routine",
      "Unlock Scholar Quran lens",
    ],
    findings,
  );
  requireIncludes(
    floating,
    "client/components/AIFloatingButton.tsx",
    ["export default function AIFloatingButton", "return null;"],
    findings,
  );

  const scripts = packageJson.scripts || {};
  if (
    scripts["check:quran-ai-learning-lens"] !==
    "node scripts/check-quran-ai-learning-lens.js"
  ) {
    findings.push(
      "package.json: check:quran-ai-learning-lens must run scripts/check-quran-ai-learning-lens.js.",
    );
  }
  if (
    !String(scripts["check:release-local"] || "").includes(
      "check:quran-ai-learning-lens",
    )
  ) {
    findings.push(
      "package.json: check:release-local must include check:quran-ai-learning-lens.",
    );
  }

  if (findings.length) {
    console.error("Quran AI learning lens reset check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Quran AI learning lens reset check passed: structured context stays available, while the retired customer AI modal remains disabled.",
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
