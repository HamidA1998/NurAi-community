#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const screensDir = path.join(root, "client", "screens");
const outputPath = path.join(root, "docs", "EXPERIENCE_RESET_AUDIT.md");

const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const summaryJson = args.has("--summary-json");
const check = args.has("--check");

const RETIRED_AI_SCREEN_NAMES = new Set([
  "ChatScreen.tsx",
  "PersonalAIMemoryControlsScreen.tsx",
  "PrivacyTrustDashboardScreen.tsx",
  "SavedAIAnswersScreen.tsx",
  "ScholarReviewQueueScreen.tsx",
]);

const INTERNAL_LANGUAGE = [
  /command centre/gi,
  /command center/gi,
  /control deck/gi,
  /knowledge os/gi,
  /operating system/gi,
  /trust command rail/gi,
  /readiness checkpoint/gi,
  /release gates?/gi,
  /gates blocked/gi,
];

const PLACEHOLDER_LANGUAGE = [
  new RegExp("coming" + " soon", "gi"),
  new RegExp("\\bTO" + "DO\\b", "g"),
  new RegExp("\\bFIX" + "ME\\b", "g"),
  new RegExp("lorem" + " ipsum", "gi"),
  new RegExp("mock" + " data", "gi"),
  new RegExp("sample" + " data", "gi"),
  new RegExp("placeholder" + " screen", "gi"),
];

const BROKEN_FLOW_LANGUAGE = [
  /could not find this item/gi,
  /we could not finish loading the app shell/gi,
  /please close and reopen/gi,
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function countMatches(text, patterns) {
  return patterns.reduce((sum, pattern) => {
    const matches = text.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);
}

function listScreens() {
  return fs
    .readdirSync(screensDir)
    .filter((file) => file.endsWith(".tsx"))
    .sort();
}

function classifyScreen(file) {
  if (/Quran|Tafsir|Hadith|Book|Library|Fiqh|Scholars/.test(file)) {
    return "Knowledge";
  }
  if (/Prayer|Qibla|Adhkar|Duas|Tasbeeh|Ramadan|Hajj|Umrah|Zakat/.test(file)) {
    return "Worship";
  }
  if (/Health|Travel|Family|Community|Kids|Women|Profile|Settings/.test(file)) {
    return "Life";
  }
  if (/Home|Explore|More|Search|Onboarding|Auth|Welcome/.test(file)) {
    return "Core";
  }
  return "Other";
}

function analyzeScreen(file) {
  const relativePath = `client/screens/${file}`;
  const text = read(relativePath);
  const geometryCount = (
    text.match(
      /<(?:GeometricCardPattern|IslamicPatternBackground)\b[^>]*\bvisible(?:=\{true\})?/g,
    ) || []
  ).length;
  const internalLanguageCount = countMatches(text, INTERNAL_LANGUAGE);
  const placeholderCount = countMatches(text, PLACEHOLDER_LANGUAGE);
  const brokenFlowCount = countMatches(text, BROKEN_FLOW_LANGUAGE);
  const textInputCount = (text.match(/TextInput/g) || []).length;
  const keyboardSupport =
    text.includes("KeyboardAvoidingView") ||
    text.includes("automaticallyAdjustKeyboardInsets") ||
    text.includes("KeyboardAware");
  const testIdCount = (text.match(/testID=/g) || []).length;
  const accessibilityCount =
    (text.match(/accessibilityRole=/g) || []).length +
    (text.match(/accessibilityLabel=/g) || []).length;
  const nestedCardRisk =
    (text.match(/<PremiumCard/g) || []).length > 3 &&
    (text.match(/<View/g) || []).length > 40;
  const retiredAI = RETIRED_AI_SCREEN_NAMES.has(file);

  let score = 100;
  score -= Math.min(24, geometryCount * 5);
  score -= Math.min(24, internalLanguageCount * 8);
  score -= Math.min(20, placeholderCount * 10);
  score -= Math.min(24, brokenFlowCount * 12);
  score -= textInputCount > 0 && !keyboardSupport ? 12 : 0;
  score -= testIdCount === 0 ? 6 : 0;
  score -= accessibilityCount === 0 ? 6 : 0;
  score -= nestedCardRisk ? 8 : 0;
  score -= retiredAI ? 30 : 0;
  score = Math.max(0, score);

  const issues = [];
  if (retiredAI) issues.push("retired AI surface still present in source");
  if (geometryCount > 0)
    issues.push(`${geometryCount} decorative pattern uses`);
  if (internalLanguageCount > 0)
    issues.push(`${internalLanguageCount} internal/product-system phrases`);
  if (placeholderCount > 0)
    issues.push(`${placeholderCount} placeholder/dev phrases`);
  if (brokenFlowCount > 0)
    issues.push(`${brokenFlowCount} broken-flow phrases`);
  if (textInputCount > 0 && !keyboardSupport)
    issues.push("text inputs without clear keyboard-safe wrapper");
  if (testIdCount === 0) issues.push("no visible test hooks");
  if (accessibilityCount === 0) issues.push("no visible accessibility labels");
  if (nestedCardRisk) issues.push("dense/nested card risk");

  return {
    file,
    relativePath,
    area: classifyScreen(file),
    score,
    issues,
    geometryCount,
    internalLanguageCount,
    placeholderCount,
    brokenFlowCount,
    retiredAI,
  };
}

function buildReport(results) {
  const byScore = [...results].sort((a, b) => a.score - b.score);
  const needsReset = byScore.filter((screen) => screen.score < 82);
  const retired = results.filter((screen) => screen.retiredAI);
  const geometryScreens = results.filter((screen) => screen.geometryCount > 0);
  const internalLanguageScreens = results.filter(
    (screen) => screen.internalLanguageCount > 0,
  );

  const lines = [];
  lines.push("# NurAI Experience Reset Audit");
  lines.push("");
  lines.push(
    "Generated by `npm run export:experience-reset-audit -- --write`.",
  );
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Screens scanned: ${results.length}`);
  lines.push(`- Screens needing reset score attention: ${needsReset.length}`);
  lines.push(
    `- Screens still using visible decorative patterns: ${geometryScreens.length}`,
  );
  lines.push(
    `- Screens with internal/product-system language: ${internalLanguageScreens.length}`,
  );
  lines.push(`- Retired AI source screens still present: ${retired.length}`);
  lines.push("");
  lines.push("## Top Reset Priorities");
  lines.push("");
  lines.push("| Score | Area | Screen | Main issues |");
  lines.push("| ---: | --- | --- | --- |");
  for (const screen of byScore.slice(0, 28)) {
    lines.push(
      `| ${screen.score} | ${screen.area} | \`${screen.relativePath}\` | ${
        screen.issues.slice(0, 4).join("; ") || "None"
      } |`,
    );
  }
  lines.push("");
  lines.push("## Retired AI Surfaces");
  lines.push("");
  if (retired.length === 0) {
    lines.push("- None detected.");
  } else {
    for (const screen of retired) {
      lines.push(`- \`${screen.relativePath}\``);
    }
  }
  lines.push("");
  lines.push("## Reset Rules For Every Screen");
  lines.push("");
  lines.push("- Give the first viewport one job and one primary action.");
  lines.push("- Remove internal AI/system/release language from customer UI.");
  lines.push(
    "- Use decorative geometry only as rare atmosphere, never behind dense text or forms.",
  );
  lines.push(
    "- Keep inputs keyboard-safe, reachable, and paired with visible submit/retry states.",
  );
  lines.push(
    "- Prefer real data, empty states, and clear permission states over placeholder cards.",
  );
  lines.push(
    "- Keep free V1/V3 intelligence as one personal briefing surface, not many AI destinations.",
  );
  lines.push("");
  lines.push("## Next Implementation Slices");
  lines.push("");
  lines.push(
    "1. Retire or hide AI-only screens from source/navigation contracts.",
  );
  lines.push(
    "2. Reset the lowest-scoring worship screens: prayer, qibla, duas, adhkar, tasbeeh.",
  );
  lines.push(
    "3. Reset knowledge screens: Quran hub, Quran reader, library, hadith, tafsir.",
  );
  lines.push(
    "4. Reset life screens: health, travel, family, community, profile/settings.",
  );
  lines.push(
    "5. Add simulator screenshot QA for Home, Explore, More, Quran, Health, Travel, Family, Auth.",
  );
  lines.push("");
  return lines.join("\n");
}

const results = listScreens().map(analyzeScreen);
const report = buildReport(results);

if (write) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${report}\n`);
}

if (check && fs.existsSync(outputPath)) {
  const existing = fs.readFileSync(outputPath, "utf8");
  if (existing !== `${report}\n`) {
    console.error("Experience reset audit is out of date. Run with --write.");
    process.exit(1);
  }
}

if (summaryJson) {
  const sorted = [...results].sort((a, b) => a.score - b.score);
  console.log(
    JSON.stringify(
      {
        screenCount: results.length,
        needsResetCount: results.filter((screen) => screen.score < 82).length,
        retiredAIScreenCount: results.filter((screen) => screen.retiredAI)
          .length,
        decorativePatternScreenCount: results.filter(
          (screen) => screen.geometryCount > 0,
        ).length,
        topPriorities: sorted.slice(0, 12).map((screen) => ({
          file: screen.relativePath,
          area: screen.area,
          score: screen.score,
          issues: screen.issues,
        })),
      },
      null,
      2,
    ),
  );
} else if (!write) {
  console.log(report);
}
