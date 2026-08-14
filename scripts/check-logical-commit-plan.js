#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const planPath = "docs/audit/NURAI_LOGICAL_COMMIT_PLAN.md";
const changeSliceManifestPath = "docs/audit/nurai-change-slice-manifest.md";

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath} is missing.`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(text, needle, label, findings) {
  if (!text.includes(needle)) {
    findings.push(`${label}: missing ${needle}`);
  }
}

function collectNpmRunScripts(text) {
  return [...text.matchAll(/\bnpm run ([A-Za-z0-9:_-]+)/g)].map(
    (match) => match[1],
  );
}

function requireOrder(text, needles, label, findings) {
  let previous = -1;
  for (const needle of needles) {
    const index = text.indexOf(needle);
    if (index === -1) {
      findings.push(`${label}: missing ${needle}`);
      return;
    }
    if (index <= previous) {
      findings.push(`${label}: ${needle} is out of order.`);
      return;
    }
    previous = index;
  }
}

function requireCurrentChangeSliceManifest(findings) {
  try {
    execFileSync(
      "node",
      ["scripts/export-logical-change-slices.js", "--check", "--summary-json"],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (error) {
    const output = [error.stdout, error.stderr]
      .filter(Boolean)
      .join("\n")
      .trim();
    findings.push(
      output
        ? `Change slice manifest is not current: ${output}`
        : "Change slice manifest is not current.",
    );
  }
}

function main() {
  const findings = [];
  const plan = read(planPath);
  const changeSliceManifest = read(changeSliceManifestPath);
  const packageJson = JSON.parse(read("package.json"));
  const scripts = packageJson.scripts || {};

  requireCurrentChangeSliceManifest(findings);

  for (const [needle, label] of [
    ["# NurAI Logical Commit And Review Plan", "Plan title"],
    ["deployed-runtime-url", "External deployment blocker"],
    ["production-database-url", "Production database blocker"],
    [
      "Library publication/highest-standard claims still need real editorial/source/scholar review evidence.",
      "Library human-review blocker",
    ],
    ["Do not mix release-secret work with UI/product work.", "Secret/UI split"],
    [".ipa", "Generated iOS build artifact exclusion"],
    ["source-first", "Source-first review principle"],
    ["review-ready", "Review-ready copy guardrail"],
    ["qualified-scholar", "Qualified scholar review guardrail"],
    [
      "Keep `npm run check:incomplete-markers` green so release code, scripts, and app surfaces do not carry unfinished markers, mock claims, or placeholder implementation notes.",
      "Incomplete marker review principle",
    ],
    ["Do not paste secrets into docs.", "Secret leakage guardrail"],
    ["Final Completion Gate", "Final gate section"],
    ["npm run check:goal-completion", "Goal completion command"],
    ["npm run check:incomplete-markers", "Incomplete marker command"],
    [
      "Use the manifest `--paths <slice-id> --null` mode to stage one logical slice at a time.",
      "Machine-safe staging instruction",
    ],
    [
      "Use the optional `--batch <batch-id>` mode when a slice is marked `split-required` or has high review pressure.",
      "Machine-safe sub-batch staging instruction",
    ],
    [
      "Generated artifacts are intentionally non-stageable through the slice manifest unless an owner explicitly approves artifact handling with `--allow-generated`.",
      "Generated artifact non-stageable plan note",
    ],
    [
      "Do not include generated store screenshots or marketing media in feature commits unless an owner explicitly approves the artifact slice.",
      "Generated store screenshot exclusion",
    ],
    [
      "node scripts/export-logical-change-slices.js --paths quran-home --null | xargs -0 git add --",
      "Per-slice staging command",
    ],
    [
      "node scripts/export-logical-change-slices.js --paths ai-trust --batch server-shared-db --null | xargs -0 git add --",
      "Per-batch staging command",
    ],
    ["npm run export:next-logical-slice", "Next logical slice command"],
    [
      "`export:next-logical-slice` recommends the next stageable slice or sub-batch from the current worktree",
      "Next logical slice explanation",
    ],
    [
      "npm run export:logical-slice-review -- quran-home",
      "Per-slice review packet command",
    ],
    [
      "npm run export:logical-slice-checks -- quran-home",
      "Per-slice check command export",
    ],
    [
      "npm run check:logical-slice -- quran-home",
      "Per-slice executable check command",
    ],
    ["npm run check:logical-slices-all", "All-slice executable check command"],
    [
      "Its output is local review evidence, not deployed-runtime, production database, or human-review evidence.",
      "Per-slice verification boundary",
    ],
    [
      "`check:logical-slices-all` runs the same local verifier across every logical slice and keeps external/manual gates separate in the aggregate report.",
      "All-slice verification boundary",
    ],
    [
      "When a slice intentionally runs `check:release-blockers` or `check:production-db-target`, an open external gate is reported as `external-blocked` instead of a local script failure.",
      "Per-slice external blocker classification",
    ],
    ["Slice Merge Discipline", "Slice merge discipline section"],
    [
      "Risk tier: the kind of review pressure for that slice",
      "Slice risk tier explanation",
    ],
    [
      "Review pressure marks whether a slice is normal-review, high-review-pressure, split-required, empty, or non-stageable-artifacts.",
      "Slice review pressure explanation",
    ],
    [
      "Batch recommendation gives the reviewer a concrete staging strategy before `git add`.",
      "Slice batch recommendation explanation",
    ],
    [
      "Batch boundary states what must stay out of that staging batch.",
      "Slice batch boundary explanation",
    ],
    [
      "Suggested review batches list exact sub-batch IDs, focus areas, hold boundaries, and machine-safe staging commands.",
      "Slice suggested review batch explanation",
    ],
    [
      "Local merge gate: the local checks and review evidence needed before staging the slice.",
      "Slice local merge gate explanation",
    ],
    [
      "Rollback/hold boundary: the condition that should stop the slice from being merged",
      "Slice rollback boundary explanation",
    ],
    [
      "Must not mix: the kinds of unrelated or unsafe changes that must stay out of the slice.",
      "Slice must-not-mix explanation",
    ],
    [
      "sub-batches such as `ui-surfaces`, `client-domain-state`, `server-shared-db`, `release-checks-tooling`, `docs-audit-handoff`, and `release-config-assets`",
      "Slice sub-batch taxonomy explanation",
    ],
  ]) {
    requireIncludes(plan, needle, label, findings);
  }

  for (const [needle, label] of [
    ["# NurAI Change Slice Manifest", "Change slice manifest title"],
    [
      "Generated from current git status",
      "Change slice manifest generation source",
    ],
    ["Quran/Home", "Quran/Home change slice"],
    ["Personalization/Privacy", "Personalization/privacy change slice"],
    ["AI Trust", "AI trust change slice"],
    ["Library", "Library change slice"],
    ["Arabic", "Arabic change slice"],
    ["App Store/Release", "App Store/release change slice"],
    ["Backend/Database/Deployment", "Backend/database/deployment change slice"],
    ["Documentation/Audit", "Documentation/audit change slice"],
    ["Generated Artifacts", "Generated artifacts change slice"],
    [
      "deployed-runtime-url",
      "Change slice manifest external deployment blocker",
    ],
    [
      "production-database-url",
      "Change slice manifest production database blocker",
    ],
    ["Suggested staging command", "Change slice manifest staging command"],
    ["Stage policy", "Change slice manifest stage policy"],
    [
      "--paths quran-home --null | xargs -0 git add --",
      "Change slice manifest quran-home path export command",
    ],
    [
      "Do not stage from this slice by default. Generated outputs require explicit owner approval and separate release storage.",
      "Generated artifact non-stageable policy",
    ],
    [
      "Do not stage generated artifacts from this manifest",
      "Generated artifact staging refusal",
    ],
    [
      "npm run export:generated-artifact-summary -- --write",
      "Generated artifact summary command",
    ],
    ["Risk tier", "Change slice manifest risk tier"],
    ["Slice Pressure Dashboard", "Change slice pressure dashboard"],
    ["Review pressure", "Change slice review pressure"],
    ["Batch recommendation", "Change slice batch recommendation"],
    ["Batch boundary", "Change slice batch boundary"],
    ["Suggested review batches", "Change slice suggested review batches"],
    [
      "--paths ai-trust --batch server-shared-db --null | xargs -0 git add --",
      "Change slice per-batch staging command",
    ],
    ["UI Surfaces", "UI surface review batch"],
    ["Client Domain State", "Client domain state review batch"],
    ["Server, Shared Contracts, And DB", "Server/shared review batch"],
    ["Release Checks And Tooling", "Release tooling review batch"],
    ["Hold boundary", "Review batch hold boundary"],
    ["split-required", "Large slice split-required status"],
    [
      "Split this slice into smaller review batches before staging",
      "Large slice split recommendation",
    ],
    [
      "Generated artifacts must stay separate from source, review evidence, and release documentation commits.",
      "Generated artifact batch boundary",
    ],
    ["Local merge gate", "Change slice manifest local merge gate"],
    ["Rollback/hold boundary", "Change slice manifest hold boundary"],
    ["Must not mix", "Change slice manifest must-not-mix list"],
    ["privacy-sensitive", "Change slice manifest privacy risk tier"],
    ["religious-trust-sensitive", "Change slice manifest AI risk tier"],
    ["production-critical", "Change slice manifest production risk tier"],
    [
      "platform asset requirements",
      "App Store platform asset requirement slice coverage",
    ],
  ]) {
    requireIncludes(changeSliceManifest, needle, label, findings);
  }

  const expectedCommitTitles = [
    "## Commit 1: Research And Design Grounding",
    "## Commit 2: Home, Quran Flagship, And Personalization",
    "## Commit 3: Onboarding Personal Plan",
    "## Commit 4: AI Trust And Scholar Review Packets",
    "## Commit 5: Library Guided Paths And Review Honesty",
    "## Commit 6: Arabic Learning Product Depth",
    "## Commit 7: Privacy, Trust, And Owner-Facing App Store Flows",
    "## Commit 8: Release Gates And Non-Secret Owner Handoff",
    "## Commit 9: Production DB And Deployment Proof",
  ];
  requireOrder(plan, expectedCommitTitles, "Commit slice order", findings);

  for (const [needle, label] of [
    ["npm run check:quran-reader-release", "Quran release check"],
    ["npm run check:personalization-release", "Personalization release check"],
    ["npm run check:ai-cta-release", "AI CTA release check"],
    ["npm run check:scholar-review-workflow", "Scholar workflow check"],
    [
      "npm run check:library-learning-paths-release",
      "Library paths release check",
    ],
    ["npm run check:arabic-learning-release", "Arabic release check"],
    ["npm run check:privacy-trust-release", "Privacy trust release check"],
    [
      "npm run check:app-store-showcase-release",
      "App Store showcase release check",
    ],
    ["App Store capture status matrix", "App Store capture matrix review note"],
    ["first-viewport proof", "App Store viewport proof review note"],
    ["retake risk for every scene", "App Store retake risk review note"],
    ["npm run check:release-blockers -- --json", "Release blockers check"],
    [
      "DATABASE_URL=postgresql://... npm run check:production-db-target -- --json",
      "Production database target proof",
    ],
    [
      "path study contracts make learner promises, review promises, proof checkpoints, and public claim boundaries visible",
      "Library study contract review note",
    ],
    [
      "teacher-review packets route practice evidence to a human teacher without claiming certified fluency, tajwid, or Quran interpretation",
      "Arabic teacher review packet review note",
    ],
    [
      "demo data safety ledger lists approved demo state, never-show private data, pre-capture checks, and retake triggers for every scene",
      "App Store demo safety review note",
    ],
  ]) {
    requireIncludes(plan, needle, label, findings);
  }

  for (const artifact of [
    "build-73.ipa",
    "static-build",
    "server_dist",
    "node_modules",
  ]) {
    if (plan.includes(`- ${artifact}`) || plan.includes(`\`${artifact}\``)) {
      continue;
    }
    if (artifact === "build-73.ipa" && plan.includes(".ipa")) continue;
    findings.push(
      `Generated artifact exclusion: ${artifact} must be mentioned or covered.`,
    );
  }

  if (
    scripts["check:logical-commit-plan"] !==
    "node scripts/check-logical-commit-plan.js"
  ) {
    findings.push("package.json must expose check:logical-commit-plan.");
  }

  if (
    scripts["export:logical-change-slices"] !==
    "node scripts/export-logical-change-slices.js"
  ) {
    findings.push("package.json must expose export:logical-change-slices.");
  }

  if (
    scripts["export:next-logical-slice"] !==
    "node scripts/export-logical-change-slices.js --next-review-slice"
  ) {
    findings.push("package.json must expose export:next-logical-slice.");
  }

  if (
    scripts["export:generated-artifact-summary"] !==
    "node scripts/export-logical-change-slices.js --artifact-summary"
  ) {
    findings.push(
      "package.json must expose export:generated-artifact-summary.",
    );
  }

  if (
    scripts["check:generated-artifact-summary"] !==
    "node scripts/export-logical-change-slices.js --artifact-summary --check"
  ) {
    findings.push("package.json must expose check:generated-artifact-summary.");
  }

  if (
    scripts["export:logical-slice-review"] !==
    "node scripts/export-logical-change-slices.js --review-plan"
  ) {
    findings.push("package.json must expose export:logical-slice-review.");
  }

  if (
    scripts["export:logical-slice-checks"] !==
    "node scripts/export-logical-change-slices.js --checks"
  ) {
    findings.push("package.json must expose export:logical-slice-checks.");
  }

  if (
    scripts["check:logical-slice"] !==
    "node scripts/export-logical-change-slices.js --verify"
  ) {
    findings.push("package.json must expose check:logical-slice.");
  }

  if (
    scripts["check:logical-slices-all"] !==
    "node scripts/export-logical-change-slices.js --verify-all --summary-json --compact --continue-on-failure"
  ) {
    findings.push("package.json must expose check:logical-slices-all.");
  }

  if (
    !read("scripts/export-logical-change-slices.js").includes("--paths <id>")
  ) {
    findings.push(
      "export-logical-change-slices must document --paths <id> for per-slice staging.",
    );
  }
  for (const [needle, label] of [
    ["--batch <id>", "Slice batch option must be documented."],
    [
      "--artifact-summary",
      "Generated artifact summary option must be documented.",
    ],
    [
      "nurai-generated-artifact-summary.md",
      "Generated artifact persisted summary path must be documented.",
    ],
    ["--next-review-slice", "Next review slice option must be documented."],
    ["--review-plan <id>", "Slice review-plan option must be documented."],
    ["--checks <id>", "Slice checks option must be documented."],
    ["--verify <id>", "Slice verify option must be documented."],
    ["--verify-all", "All-slice verify option must be documented."],
    ["--compact", "All-slice compact option must be documented."],
    [
      "--continue-on-failure",
      "Slice verify continue-on-failure option must be documented.",
    ],
    ["renderSliceReviewPlan", "Slice review plan renderer must be present."],
    [
      "SLICE_REVIEW_GUARDRAILS",
      "Slice review guardrail contract must be present.",
    ],
    ["reviewGuardrailFor", "Slice guardrail helper must be present."],
    ["reviewBatchForPath", "Slice review batch classifier must be present."],
    ["collectReviewBatches", "Slice review batch collector must be present."],
    [
      "formatBatchPathsCommand",
      "Slice review batch staging command must be present.",
    ],
    ["renderReviewBatchLines", "Slice review batch renderer must be present."],
    [
      "buildGeneratedArtifactSummary",
      "Generated artifact summary builder must be present.",
    ],
    [
      "buildNextReviewSliceSummary",
      "Next review slice summary builder must be present.",
    ],
    [
      "renderNextReviewSliceSummary",
      "Next review slice renderer must be present.",
    ],
    ["nextReviewSlice", "Summary output must expose the next review slice."],
    [
      "Next-review guidance is local staging discipline only",
      "Next review slice must retain local-evidence boundary.",
    ],
    [
      "generatedArtifactGroupForPath",
      "Generated artifact grouping helper must be present.",
    ],
    [
      "normalPathsCommandRefusesWithoutAllowGenerated",
      "Generated artifact summary must report staging refusal.",
    ],
    ["client-domain-state", "Client domain state batch id must be defined."],
    ["server-shared-db", "Server/shared batch id must be defined."],
    [
      "release-checks-tooling",
      "Release checks tooling batch id must be defined.",
    ],
    ["docs-audit-handoff", "Docs/audit handoff batch id must be defined."],
    [
      "release-config-assets",
      "Release config/assets batch id must be defined.",
    ],
    ["riskTier", "Slice risk tier must be emitted."],
    ["localMergeGate", "Slice local merge gate must be emitted."],
    ["rollbackBoundary", "Slice rollback boundary must be emitted."],
    ["mustNotMix", "Slice must-not-mix list must be emitted."],
    ["privacy-sensitive", "Privacy-sensitive risk tier must be defined."],
    ["religious-trust-sensitive", "Religious-trust risk tier must be defined."],
    ["store-compliance", "Store compliance risk tier must be defined."],
    ["production-critical", "Production-critical risk tier must be defined."],
    ["non-stageable", "Generated artifact risk tier must be defined."],
    ["verifySliceChecks", "Slice verification runner must be present."],
    ["verifyAllSlices", "All-slice verification runner must be present."],
    [
      "compactSliceVerificationSummary",
      "All-slice verification must support compact summary output.",
    ],
    [
      "Aggregate logical-slice verification is local review evidence only",
      "All-slice verification must retain local-evidence boundary.",
    ],
    [
      "isExternalBlockerCheck",
      "Slice verification must classify external blocker checks.",
    ],
    [
      "check:production-db-target",
      "Slice verification must classify production DB target proof as external-blocked.",
    ],
    [
      "external-blocked",
      "Slice verification must report external blockers separately.",
    ],
    [
      "Local slice verification is review evidence only",
      "Slice verification must retain local-evidence boundary.",
    ],
    [
      "This is a review plan, not release proof.",
      "Slice review plan must keep release-proof boundary.",
    ],
    ["stageable: false", "Generated artifacts must be marked non-stageable."],
    ["--allow-generated", "Generated artifact override flag must be explicit."],
    [
      "marketing\\/app-store-screenshots",
      "Generated screenshot classifier must be explicit.",
    ],
    [
      "marketing\\/tiktok\\/remotion\\/nurai-tiktok\\/public",
      "Generated marketing media classifier must be explicit.",
    ],
    [
      "Generated artifacts require explicit owner approval and --allow-generated.",
      "Generated artifact --paths guardrail must be explicit.",
    ],
  ]) {
    requireIncludes(
      read("scripts/export-logical-change-slices.js"),
      needle,
      label,
      findings,
    );
  }

  if (
    scripts["check:logical-change-slices"] !==
    "node scripts/export-logical-change-slices.js --check --summary-json"
  ) {
    findings.push("package.json must expose check:logical-change-slices.");
  }

  if (
    scripts["check:incomplete-markers"] !==
    "node scripts/check-incomplete-markers.js"
  ) {
    findings.push("package.json must expose check:incomplete-markers.");
  }

  if (
    scripts["check:arabic-spaced-review"] !==
    "tsx scripts/check-arabic-spaced-review.ts"
  ) {
    findings.push("package.json must expose check:arabic-spaced-review.");
  }

  if (
    scripts["check:human-review-final-readiness"] !==
    "tsx scripts/check-human-review-final-readiness.ts"
  ) {
    findings.push(
      "package.json must expose check:human-review-final-readiness.",
    );
  }

  for (const scriptName of new Set(
    collectNpmRunScripts(read("scripts/export-logical-change-slices.js")),
  )) {
    if (!scripts[scriptName]) {
      findings.push(
        `Logical slice command references missing package script: ${scriptName}.`,
      );
    }
  }

  if (
    typeof scripts["check:release-local"] === "string" &&
    !scripts["check:release-local"].includes(
      "npm run check:logical-commit-plan",
    )
  ) {
    findings.push(
      "check:release-local must include npm run check:logical-commit-plan.",
    );
  }

  if (
    typeof scripts["check:release-local"] === "string" &&
    !scripts["check:release-local"].includes("npm run check:incomplete-markers")
  ) {
    findings.push(
      "check:release-local must include npm run check:incomplete-markers.",
    );
  }

  if (findings.length > 0) {
    console.error(
      `Logical commit plan check failed with ${findings.length} finding(s):`,
    );
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Logical commit plan check passed: review slices, no-overclaim guardrails, verification commands, and artifact exclusions are covered.",
  );
}

main();
