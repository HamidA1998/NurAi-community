#!/usr/bin/env node

const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const manifestPath = "docs/audit/nurai-change-slice-manifest.md";
const generatedArtifactSummaryPath =
  "docs/audit/nurai-generated-artifact-summary.md";
const argv = process.argv.slice(2);
const args = new Set(argv);

const SLICE_DEFINITIONS = [
  {
    id: "quran-home",
    title: "Quran/Home Flagship",
    commit: "Commit 2: Home, Quran Flagship, And Personalization",
    reviewFocus:
      "Daily Quran action, Today Deen command center, Quran reader state, prayer-linked home nudges, and search placement.",
    checks: [
      "npm run check:hub-ui-release",
      "npm run check:quran-reader-release",
      "npm run check:quran-ai-learning-lens",
      "npm run check:quran-reflection-circles-release",
    ],
  },
  {
    id: "personalization-privacy",
    title: "Personalization/Privacy",
    commit: "Commit 3: Onboarding Personal Plan plus Commit 7 privacy controls",
    reviewFocus:
      "Onboarding preferences, personal NurAI plan storage/export/delete, spiritual reflection privacy, and trust dashboard data controls.",
    checks: [
      "npm run check:personalization-release",
      "npm run check:privacy-trust-release",
      "npm run check:spiritual-growth-companion-release",
      "npm run check:ai-privacy-controls",
    ],
  },
  {
    id: "ai-trust",
    title: "AI Trust And Scholar Review",
    commit: "Commit 4: AI Trust And Scholar Review Packets",
    reviewFocus:
      "Sensitive-question routing, source triage, scholar packet exports, saved answers, AI cost/privacy guardrails, and source-first copy.",
    checks: [
      "npm run check:ai-cta-release",
      "npm run check:scholar-review-workflow",
      "npm run check:ai-source-catalog",
      "npm run eval:scholar-agent",
      "Record final source-pack readiness command: npm run check:source-pack-final-readiness -- --summary-json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
    ],
  },
  {
    id: "library",
    title: "Library Learning And Source Review",
    commit: "Commit 5: Library Guided Paths And Review Honesty",
    reviewFocus:
      "Guided learning paths, audio readiness, source review queues, book readers, curated collections, and publication-honesty gates.",
    checks: [
      "npm run check:library-learning-paths-release",
      "npm run check:library-audio-paths-release",
      "npm run check:library-source-review-controls",
      "npm run validate:library-review-evidence -- --summary-json",
      "Record final reviewer evidence readiness command: npm run check:library-review-final-readiness -- --file /absolute/path/to/merged-library-review-evidence.json --summary-json",
    ],
  },
  {
    id: "arabic",
    title: "Arabic Learning",
    commit: "Commit 6: Arabic Learning Product Depth",
    reviewFocus:
      "Arabic daily coach, weekly mastery plan, weakest-skill focus lanes, progress storage, and lesson-product UX.",
    checks: [
      "npm run check:arabic-learning-release",
      "npm run check:arabic-spaced-review",
    ],
  },
  {
    id: "app-store-release",
    title: "App Store/Release",
    commit: "Commit 7 and Commit 8: App Store handoff and release gates",
    reviewFocus:
      "Screenshot showcase, owner action exports, release evidence intake, copy claims, launch blockers, and handoff documentation.",
    checks: [
      "npm run check:app-store-showcase-release",
      "npm run export:release-owner-actions -- --check --summary-json",
      "npm run validate:release-external-evidence -- --summary-json --allow-current-blockers",
      "npm run check:release-blockers -- --json",
    ],
  },
  {
    id: "backend-database-deployment",
    title: "Backend/Database/Deployment",
    commit: "Commit 9: Production DB And Deployment Proof",
    reviewFocus:
      "Server routes, auth, subscriptions, migrations, deployment config, production DB proof, and runtime smoke boundaries.",
    checks: [
      "npm run check:db-release-controls",
      "npm run check:production-db-target -- --json",
      "npm run check:deployment-config",
      "npm run check:server-routes",
    ],
  },
  {
    id: "navigation-shell-ui",
    title: "Navigation/Shell UI",
    commit: "Cross-slice shell review before merging product commits",
    reviewFocus:
      "Root navigation, tab/drawer ownership, shared UI primitives, theme tokens, and premium shell consistency.",
    checks: [
      "npm run check:navigation-routes",
      "npm run check:global-search-release",
      "npm run check:premium-themes-release",
    ],
  },
  {
    id: "documentation-audit",
    title: "Documentation/Audit",
    commit: "Documentation and audit updates paired with the relevant slice",
    reviewFocus:
      "DESIGN.md, audits, release handoffs, threat model, source review docs, and non-secret operator runbooks.",
    checks: [
      "npm run check:user-facing-claims",
      "npm run check:customer-facing-copy",
      "npm run check:threat-model",
      "npm run check:human-review-final-readiness -- --summary-json --allow-current-blockers",
      "npm run check:release-handoff",
    ],
  },
  {
    id: "generated-artifacts",
    title: "Generated Artifacts",
    commit: "Do not commit unless an owner explicitly accepts the artifact",
    stageable: false,
    reviewFocus:
      "Build products, dependency folders, generated bundles, and large release binaries that should stay out of logical feature commits.",
    checks: [
      "npm run export:generated-artifact-summary -- --write",
      "git diff --check",
      "Confirm .gitignore or release-storage handling for generated outputs",
    ],
  },
];

const SLICE_REVIEW_GUARDRAILS = {
  "quran-home": {
    riskTier: "high-user-impact",
    localMergeGate:
      "Home/Quran can be reviewed after focused UI, Quran reader, personalization, and type checks pass with no new source or scholar overclaims.",
    rollbackBoundary:
      "Hold or revert this slice separately if Quran reading, prayer/date context, compact search placement, or personal plan loading regresses.",
    mustNotMix: [
      "Production deployment credentials",
      "Library human-review evidence imports",
      "Generated App Store media or build artifacts",
    ],
  },
  "personalization-privacy": {
    riskTier: "privacy-sensitive",
    localMergeGate:
      "Personalization/privacy can be reviewed after export/delete controls, trust dashboard receipts, and privacy copy gates pass.",
    rollbackBoundary:
      "Hold this slice if local delete/export boundaries, plan freshness labels, or trust operation boundaries become ambiguous.",
    mustNotMix: [
      "External account deletion claims",
      "Production database credentials",
      "Unredacted personal notes or private user data",
    ],
  },
  "ai-trust": {
    riskTier: "religious-trust-sensitive",
    localMergeGate:
      "AI trust can be reviewed only when source-aware answer UX, saved answers, scholar packet routing, and eval/check scripts pass.",
    rollbackBoundary:
      "Hold this slice if sensitive questions bypass packet creation or AI copy implies final rulings.",
    mustNotMix: [
      "Final fatwa wording",
      "Claims of completed qualified scholar review",
      "Raw AI debug output or prompt secrets",
    ],
  },
  library: {
    riskTier: "content-review-sensitive",
    localMergeGate:
      "Library can be reviewed when guided paths, source controls, review contracts, final-readiness tooling, and audit artifacts are current while publication claims remain pending.",
    rollbackBoundary:
      "Hold this slice if any Library surface implies published or completed human review without imported evidence.",
    mustNotMix: [
      "Invented reviewer names or approval dates",
      "Generated packets treated as approval",
      "Production release claims",
    ],
  },
  arabic: {
    riskTier: "learning-product",
    localMergeGate:
      "Arabic can be reviewed when daily coach, weekly mastery, level governance, spaced review, and teacher-review boundaries pass.",
    rollbackBoundary:
      "Hold this slice if progress evidence, level changes, or teacher handoff language promises certified fluency or religious authority.",
    mustNotMix: [
      "Certified fluency claims",
      "Tajwid mastery claims",
      "Quran interpretation authority",
    ],
  },
  "app-store-release": {
    riskTier: "store-compliance",
    localMergeGate:
      "App Store/release owner surfaces can be reviewed when capture planning, platform asset requirements, copy claims, and release handoff checks pass.",
    rollbackBoundary:
      "Hold this slice if screenshots, metadata, or handoffs imply launch readiness while external gates remain blocked.",
    mustNotMix: [
      "Actual production secrets",
      "Unapproved store screenshots with private data",
      "Release evidence that has not passed external verification",
    ],
  },
  "backend-database-deployment": {
    riskTier: "production-critical",
    localMergeGate:
      "Backend/deployment can be reviewed locally for scripts and config, but merge as release proof only after live runtime and production database commands pass.",
    rollbackBoundary:
      "Hold this slice if migrations, auth, subscriptions, runtime smoke, or database target checks are unverified.",
    mustNotMix: [
      "UI polish changes",
      "Unredacted DATABASE_URL values",
      "Smoke secrets or service role keys",
    ],
  },
  "navigation-shell-ui": {
    riskTier: "cross-app-shell",
    localMergeGate:
      "Navigation/shell can be reviewed when route ownership, global search, premium themes, and shared UI consistency checks pass.",
    rollbackBoundary:
      "Hold this slice if any flagship route disappears, tab/drawer ownership breaks, or shared primitives regress touch/accessibility behavior.",
    mustNotMix: [
      "Feature-specific business logic rewrites",
      "Production deployment work",
      "Generated assets",
    ],
  },
  "documentation-audit": {
    riskTier: "release-documentation",
    localMergeGate:
      "Documentation/audit can be reviewed when generated manifests are current and copy, claims, threat model, release handoff, and secret checks pass.",
    rollbackBoundary:
      "Hold this slice if docs imply completed release, completed human review, or include secret-like material.",
    mustNotMix: [
      "Credentials or pasted environment values",
      "Generated binaries",
      "Evidence placeholders labeled as passing proof",
    ],
  },
  "generated-artifacts": {
    riskTier: "non-stageable",
    localMergeGate:
      "Generated artifacts are not locally stageable through this manifest unless an owner explicitly approves separate artifact handling.",
    rollbackBoundary:
      "Remove or move artifacts to release storage before source review continues.",
    mustNotMix: [
      "Feature source commits",
      "Review evidence commits",
      "Release docs without explicit artifact ownership",
    ],
  },
};

function printHelp() {
  console.log(`Usage: node scripts/export-logical-change-slices.js [--write|--check] [--summary-json]

Reads git status and builds docs/audit/nurai-change-slice-manifest.md.

Options:
  --write         Write the generated manifest.
  --check         Fail when the manifest is missing or out of date.
  --summary-json  Print a machine-readable summary.
  --paths <id>    Print changed paths for one logical slice.
  --batch <id>    With --paths, limit output to one suggested review batch.
  --review-plan <id>
                  Print the stage policy, changed-path count, and checks for one slice.
  --next-review-slice
                  Recommend the next stageable slice or sub-batch from current git status.
  --checks <id>   Print only the required check commands for one slice.
  --verify <id>   Run executable checks for one slice and report local review evidence.
  --verify-all    Run executable checks for every logical slice and summarize local review evidence.
  --compact       With --verify-all --summary-json, omit child stdout/stderr from the aggregate report.
  --artifact-summary
                  Summarize generated artifacts and their non-stageable handling.
                  Use --write or --check to persist/verify docs/audit/nurai-generated-artifact-summary.md.
  --continue-on-failure
                  With --verify or --verify-all, keep running remaining checks after a failure.
  --null          With --paths, separate paths with NUL for xargs -0.
  --allow-generated
                  Permit --paths generated-artifacts for explicit owner-approved artifact handling.
`);
}

function argValue(flag) {
  const index = argv.indexOf(flag);
  if (index === -1) return null;
  return argv[index + 1] || null;
}

function runGitStatus() {
  try {
    return execFileSync("git", ["status", "--short", "--untracked-files=all"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new Error(`Unable to read git status: ${error.message}`);
  }
}

function parseStatusLine(line) {
  const status = line.slice(0, 2).trim() || "??";
  const rawPath = line.slice(3).trim();
  const displayPath = rawPath;
  const classifyPath = rawPath.includes(" -> ")
    ? rawPath.split(" -> ").pop().trim()
    : rawPath;
  return { status, displayPath, classifyPath };
}

function matchesAny(filePath, patterns) {
  return patterns.some((pattern) => {
    if (typeof pattern === "string") return filePath.startsWith(pattern);
    return pattern.test(filePath);
  });
}

function classifyChange(filePath) {
  const generatedPatterns = [
    /^build-\d+\.ipa$/,
    /\.ipa$/,
    /^node_modules\//,
    /^server_dist\//,
    /^static-build\//,
    /^web-build\//,
    /^dist\//,
    /^coverage\//,
    /^\.expo\//,
    /^marketing\/app-store-screenshots\/(final-upload|kie-generated|real-simulator|store-assets)\//,
    /^marketing\/tiktok\/remotion\/nurai-tiktok\/public\/.*\.(png|jpe?g|mp3|aiff)$/i,
  ];

  if (matchesAny(filePath, generatedPatterns)) return "generated-artifacts";

  if (
    matchesAny(filePath, [
      /^client\/components\/home\//,
      /^client\/screens\/HomeScreen\.tsx$/,
      /^client\/screens\/Quran/,
      /^client\/screens\/Prayer/,
      /^client\/screens\/Ramadan/,
      /^client\/screens\/TafsirScreen\.tsx$/,
      /^client\/lib\/quran/,
      /^client\/data\/quran/,
      /^client\/services\/quran/,
      /^client\/services\/dailyDeenJourneyService\.ts$/,
      /^client\/lib\/prayer/,
      /^client\/hooks\/usePrayer/,
      /^scripts\/check-hub-ui-release\.js$/,
      /^scripts\/check-quran/,
    ])
  ) {
    return "quran-home";
  }

  if (
    matchesAny(filePath, [
      /^client\/screens\/OnboardingScreen\.tsx$/,
      /^client\/screens\/PrivacyTrustDashboardScreen\.tsx$/,
      /^client\/services\/personalNurAIPlanService\.ts$/,
      /^client\/services\/privacyTrustEvidenceService\.ts$/,
      /^client\/services\/spiritualGrowthCompanionService\.ts$/,
      /^client\/services\/nuraiProfile/,
      /^client\/context\/NurAIContext\.tsx$/,
      /^client\/context\/AuthContext\.tsx$/,
      /^scripts\/check-personalization-release\.ts$/,
      /^scripts\/check-privacy-trust-release\.ts$/,
      /^scripts\/check-spiritual-growth-companion-release\.ts$/,
    ])
  ) {
    return "personalization-privacy";
  }

  if (
    matchesAny(filePath, [
      /^client\/components\/AIResponseModal\.tsx$/,
      /^client\/components\/AIFloatingButton\.tsx$/,
      /^client\/screens\/ChatScreen\.tsx$/,
      /^client\/screens\/SavedAIAnswersScreen\.tsx$/,
      /^client\/screens\/Scholar/,
      /^client\/services\/ai/,
      /^client\/services\/scholar/,
      /^client\/services\/aiSavedAnswerService\.ts$/,
      /^server\/ai\//,
      /^server\/replit_integrations\/scholar-agent\//,
      /^server\/replit_integrations\/chat\//,
      /^shared\/scholar\.ts$/,
      /^shared\/models\/chat\.ts$/,
      /^scripts\/check-ai/,
      /^scripts\/eval-ai/,
      /^scripts\/eval-scholar-agent\.ts$/,
      /^scripts\/check-scholar-review-workflow\.ts$/,
      /^scripts\/check-source-pack-review-workflow\.ts$/,
      /^scripts\/check-source-pack-final-readiness\.ts$/,
      /^scripts\/export-(tafsir|hadith|fiqh|seerah)-review/,
      /^scripts\/validate-(tafsir|hadith|fiqh|seerah)-review/,
      /^scripts\/apply-(tafsir|hadith|fiqh|seerah)-review/,
    ])
  ) {
    return "ai-trust";
  }

  if (
    matchesAny(filePath, [
      /^client\/components\/library\//,
      /^client\/screens\/Library/,
      /^client\/screens\/Book/,
      /^client\/screens\/OfflineLibraryScreen\.tsx$/,
      /^client\/services\/library/,
      /^client\/services\/aiLibraryService\.ts$/,
      /^client\/data\/library/,
      /^client\/types\/library\.ts$/,
      /^assets\/book-covers\//,
      /^scripts\/check-library/,
      /^scripts\/export-library/,
      /^scripts\/validate-library/,
      /^scripts\/apply-library/,
      /^LIBRARY_QA\.md$/,
    ])
  ) {
    return "library";
  }

  if (
    matchesAny(filePath, [
      /^client\/screens\/Arabic/,
      /^client\/services\/arabic/,
      /^scripts\/check-arabic/,
    ])
  ) {
    return "arabic";
  }

  if (
    matchesAny(filePath, [
      /^client\/screens\/AppStoreShowcaseScreen\.tsx$/,
      /^client\/services\/appStoreShowcaseService\.ts$/,
      /^marketing\//,
      /^fastlane\//,
      /^deploy\//,
      /^\.easignore$/,
      /^eas\.json$/,
      /^app\.json$/,
      /^scripts\/check-app-/,
      /^scripts\/check-release/,
      /^scripts\/export-release/,
      /^scripts\/validate-release/,
      /^scripts\/export-production-secret-checklist\.js$/,
    ])
  ) {
    return "app-store-release";
  }

  if (
    matchesAny(filePath, [
      /^server\//,
      /^shared\/schema\.ts$/,
      /^shared\/subscriptionIdentifiers\.ts$/,
      /^migrations\//,
      /^railway\.json$/,
      /^render\.yaml$/,
      /^\.railwayignore$/,
      /^\.env\.production\.example$/,
      /^scripts\/check-(db|production|deployment|server|auth|rate-limit|http|revenuecat|subscription|route|places|env)/,
      /^scripts\/apply-production-migrations\.js$/,
      /^scripts\/sync-railway-smoke-secret\.js$/,
    ])
  ) {
    return "backend-database-deployment";
  }

  if (
    matchesAny(filePath, [
      /^client\/navigation\//,
      /^client\/components\//,
      /^client\/constants\//,
      /^client\/context\/ThemeContext\.tsx$/,
      /^client\/hooks\/useResponsiveLayout\.ts$/,
      /^client\/hooks\/useScreenOptions\.ts$/,
      /^client\/App\.tsx$/,
      /^client\/screens\/GlobalSearchScreen\.tsx$/,
      /^scripts\/check-navigation-routes\.js$/,
      /^scripts\/check-global-search-release\.js$/,
      /^scripts\/check-premium-themes-release\.js$/,
    ])
  ) {
    return "navigation-shell-ui";
  }

  if (
    matchesAny(filePath, [
      /^docs\//,
      /^DESIGN\.md$/,
      /^CONTENT_COMPLETION_AUDIT\.md$/,
      /^HADITH_SOURCE_AUDIT\.md$/,
      /^LOCAL_AI_SETUP\.md$/,
      /^NurAI-Muslim-threat-model\.md$/,
      /^replit\.md$/,
      /^README/,
      /^scripts\/check-logical-commit-plan\.js$/,
      /^scripts\/export-logical-change-slices\.js$/,
      /^scripts\/check-threat-model\.js$/,
      /^scripts\/check-user-facing-claims\.js$/,
      /^scripts\/check-customer-facing-copy\.js$/,
      /^scripts\/check-secret-leaks\.js$/,
      /^scripts\/check-incomplete-markers\.js$/,
      /^package\.json$/,
      /^package-lock\.json$/,
      /^eslint\.config\.js$/,
      /^tsconfig\.json$/,
      /^metro\.config\.js$/,
      /^\.gitignore$/,
      /^\.replit$/,
    ])
  ) {
    return "documentation-audit";
  }

  return "documentation-audit";
}

function collectChanges() {
  const status = runGitStatus();
  const changes = status
    .split("\n")
    .filter(Boolean)
    .map(parseStatusLine)
    .filter((change) => change.classifyPath !== manifestPath)
    .map((change) => ({
      ...change,
      sliceId: classifyChange(change.classifyPath),
    }));

  const bySlice = new Map(
    SLICE_DEFINITIONS.map((definition) => [definition.id, []]),
  );
  for (const change of changes) {
    bySlice.get(change.sliceId).push(change);
  }
  for (const list of bySlice.values()) {
    list.sort((a, b) => a.displayPath.localeCompare(b.displayPath));
  }
  return { changes, bySlice };
}

function formatChange(change) {
  return `- \`${change.status.padEnd(2, " ")} ${change.displayPath}\``;
}

function formatSlicePathsCommand(sliceId, sliceChanges) {
  const slice = SLICE_DEFINITIONS.find(
    (definition) => definition.id === sliceId,
  );
  if (slice && slice.stageable === false) {
    return "Do not stage generated artifacts from this manifest; move them to release storage or ignore them unless an owner explicitly accepts the artifact.";
  }
  if (sliceChanges.length === 0) {
    return "No changed paths in this slice.";
  }
  return `node scripts/export-logical-change-slices.js --paths ${sliceId} --null | xargs -0 git add --`;
}

function reviewBatchForPath(filePath) {
  if (
    matchesAny(filePath, [
      /^client\/screens\//,
      /^client\/components\//,
      /^client\/navigation\//,
    ])
  ) {
    return {
      id: "ui-surfaces",
      title: "UI Surfaces",
      focus:
        "Screens, components, navigation, touch targets, accessibility labels, and visual hierarchy.",
      holdBoundary:
        "Hold this batch if route ownership, primary actions, source labels, or touch/accessibility behavior regresses.",
    };
  }

  if (
    matchesAny(filePath, [
      /^client\/services\//,
      /^client\/lib\//,
      /^client\/hooks\//,
      /^client\/context\//,
      /^client\/data\//,
      /^client\/types\//,
      /^client\/constants\//,
      /^client\/App\.tsx$/,
      /^assets\//,
    ])
  ) {
    return {
      id: "client-domain-state",
      title: "Client Domain State",
      focus:
        "Client data contracts, local persistence, Quran/prayer/library/AI state, and static app assets.",
      holdBoundary:
        "Hold this batch if stored data changes shape without migration, review evidence is invented, or assets imply unverified release proof.",
    };
  }

  if (matchesAny(filePath, [/^server\//, /^shared\//, /^migrations\//])) {
    return {
      id: "server-shared-db",
      title: "Server, Shared Contracts, And DB",
      focus:
        "Server routes, shared types, AI/source-pack boundaries, auth, subscriptions, and migrations.",
      holdBoundary:
        "Hold this batch if auth, paid access, migration safety, source grounding, or production DB proof boundaries become unclear.",
    };
  }

  if (matchesAny(filePath, [/^scripts\//])) {
    return {
      id: "release-checks-tooling",
      title: "Release Checks And Tooling",
      focus:
        "Check scripts, exporters, validators, release evidence intake, and local proof commands.",
      holdBoundary:
        "Hold this batch if a check starts bypassing real external proof, human review evidence, or secret-safety boundaries.",
    };
  }

  if (
    matchesAny(filePath, [
      /^docs\//,
      /^DESIGN\.md$/,
      /^CONTENT_COMPLETION_AUDIT\.md$/,
      /^HADITH_SOURCE_AUDIT\.md$/,
      /^LOCAL_AI_SETUP\.md$/,
      /^NurAI-Muslim-threat-model\.md$/,
      /^LIBRARY_QA\.md$/,
      /^README/,
      /^replit\.md$/,
    ])
  ) {
    return {
      id: "docs-audit-handoff",
      title: "Docs, Audit, And Handoff",
      focus:
        "Design rationale, release handoffs, source-review audits, threat model, and owner-facing runbooks.",
      holdBoundary:
        "Hold this batch if docs imply launch readiness, completed scholar review, or include secret-like values.",
    };
  }

  if (
    matchesAny(filePath, [
      /^marketing\//,
      /^fastlane\//,
      /^deploy\//,
      /^\.easignore$/,
      /^\.env\.production\.example$/,
      /^\.railwayignore$/,
      /^\.replit$/,
      /^app\.json$/,
      /^eas\.json$/,
      /^railway\.json$/,
      /^render\.yaml$/,
      /^package\.json$/,
      /^package-lock\.json$/,
      /^eslint\.config\.js$/,
      /^tsconfig\.json$/,
      /^metro\.config\.js$/,
      /^\.gitignore$/,
    ])
  ) {
    return {
      id: "release-config-assets",
      title: "Release Config And Assets",
      focus:
        "Store metadata, deployment examples, platform config, package scripts, and release asset handling.",
      holdBoundary:
        "Hold this batch if generated media, private data, production secrets, or unverified platform proof enters source review.",
    };
  }

  return {
    id: "misc-review",
    title: "Miscellaneous Review",
    focus:
      "Paths that do not match a narrower review batch and need manual ownership confirmation.",
    holdBoundary:
      "Hold this batch until every path has a clear owner and belongs in the selected logical slice.",
  };
}

function collectReviewBatches(sliceChanges) {
  const byBatch = new Map();
  for (const change of sliceChanges) {
    const batch = reviewBatchForPath(change.classifyPath);
    if (!byBatch.has(batch.id)) {
      byBatch.set(batch.id, { ...batch, changes: [] });
    }
    byBatch.get(batch.id).changes.push(change);
  }
  return [...byBatch.values()]
    .map((batch) => ({
      ...batch,
      changes: batch.changes.sort((a, b) =>
        a.displayPath.localeCompare(b.displayPath),
      ),
    }))
    .sort((a, b) => {
      const countDelta = b.changes.length - a.changes.length;
      return countDelta || a.title.localeCompare(b.title);
    });
}

function formatBatchPathsCommand(slice, batch) {
  if (slice.stageable === false) {
    return "Do not stage generated artifacts from this manifest; move them to release storage or ignore them unless an owner explicitly accepts the artifact.";
  }
  return `node scripts/export-logical-change-slices.js --paths ${slice.id} --batch ${batch.id} --null | xargs -0 git add --`;
}

function renderReviewBatchLines(slice, sliceChanges) {
  const batches = collectReviewBatches(sliceChanges);
  const lines = ["Suggested review batches:"];
  if (batches.length === 0) {
    lines.push("- None in the current worktree.");
    return lines;
  }
  for (const batch of batches) {
    lines.push(
      `- ${batch.title} (${batch.id}): ${batch.changes.length} path(s)`,
    );
    lines.push(`  - Focus: ${batch.focus}`);
    lines.push(`  - Hold boundary: ${batch.holdBoundary}`);
    lines.push(
      `  - Stage command: \`${formatBatchPathsCommand(slice, batch)}\``,
    );
  }
  return lines;
}

function generatedArtifactGroupForPath(filePath) {
  if (/^build-\d+\.ipa$/.test(filePath) || /\.ipa$/.test(filePath)) {
    return {
      id: "ios-build-binary",
      title: "iOS Build Binary",
      handling:
        "Keep out of source commits; store in TestFlight/App Store Connect or explicit release artifact storage.",
    };
  }
  if (/^marketing\/app-store-screenshots\//.test(filePath)) {
    return {
      id: "app-store-screenshot-media",
      title: "App Store Screenshot Media",
      handling:
        "Keep separate from feature commits unless an owner approves a dedicated store-asset artifact commit.",
    };
  }
  if (/^marketing\/tiktok\/remotion\/nurai-tiktok\/public\//.test(filePath)) {
    return {
      id: "marketing-render-media",
      title: "Marketing Render Media",
      handling:
        "Keep generated render media separate from source, copy, and review-evidence commits.",
    };
  }
  return {
    id: "other-generated-output",
    title: "Other Generated Output",
    handling:
      "Confirm ownership and release storage before including in any review or artifact handoff.",
  };
}

function buildGeneratedArtifactSummary(bySlice) {
  const generatedChanges = bySlice.get("generated-artifacts") || [];
  const groups = new Map();
  for (const change of generatedChanges) {
    const group = generatedArtifactGroupForPath(change.classifyPath);
    if (!groups.has(group.id)) {
      groups.set(group.id, { ...group, paths: [] });
    }
    groups.get(group.id).paths.push(change.classifyPath);
  }

  const groupList = [...groups.values()]
    .map((group) => ({
      id: group.id,
      title: group.title,
      handling: group.handling,
      count: group.paths.length,
      paths: group.paths.sort(),
    }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));

  return {
    ok: true,
    stageable: false,
    releaseProof: false,
    outputPath: generatedArtifactSummaryPath,
    artifactCount: generatedChanges.length,
    groupCount: groupList.length,
    defaultStagePolicy:
      "Do not stage generated artifacts through normal feature review.",
    persistedReviewArtifact:
      "docs/audit/nurai-generated-artifact-summary.md keeps generated media and binaries separate from source, review evidence, release docs, and normal logical commits.",
    ownerApprovalRequired: generatedChanges.length > 0,
    allowGeneratedFlag: "--allow-generated",
    normalPathsCommandRefusesWithoutAllowGenerated: true,
    groups: groupList,
  };
}

function renderGeneratedArtifactSummary(summary) {
  const lines = [
    "# Generated Artifact Summary",
    "",
    "Generated from current git status.",
    "",
    "This report is a review-separation artifact for generated media, render outputs, and build binaries. It is not release proof, not App Store submission evidence, and not permission to mix generated files into normal source commits.",
    "",
    `Artifact count: ${summary.artifactCount}`,
    `Stageable by default: ${summary.stageable ? "yes" : "no"}`,
    `Owner approval required: ${summary.ownerApprovalRequired ? "yes" : "no"}`,
    "",
    `Default policy: ${summary.defaultStagePolicy}`,
    `Persisted review artifact: ${summary.persistedReviewArtifact}`,
    `Override flag: ${summary.allowGeneratedFlag}`,
    "",
  ];
  for (const group of summary.groups) {
    lines.push(`## ${group.title}`);
    lines.push("");
    lines.push(`Count: ${group.count}`);
    lines.push(`Handling: ${group.handling}`);
    lines.push("");
    for (const artifactPath of group.paths) {
      lines.push(`- \`${artifactPath}\``);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function formatStagePolicy(slice) {
  if (slice.stageable === false) {
    return "Do not stage from this slice by default. Generated outputs require explicit owner approval and separate release storage.";
  }
  return "Stage only this slice, then run the required checks before committing.";
}

function slicePressureFor(slice, changeCount) {
  if (slice.stageable === false) {
    return {
      status: changeCount > 0 ? "non-stageable-artifacts" : "clear",
      recommendation:
        changeCount > 0
          ? "Do not stage this slice through normal feature review; move artifacts to release storage or get explicit owner approval."
          : "No generated artifacts are present in this slice.",
      batchBoundary:
        "Generated artifacts must stay separate from source, review evidence, and release documentation commits.",
    };
  }

  if (changeCount === 0) {
    return {
      status: "empty",
      recommendation: "No changed paths are currently assigned to this slice.",
      batchBoundary:
        "Do not create an empty commit for this slice unless an owner is recording reviewed no-op evidence.",
    };
  }

  if (changeCount >= 60) {
    return {
      status: "split-required",
      recommendation:
        "Split this slice into smaller review batches before staging; run the slice checks for each batch boundary.",
      batchBoundary:
        "Keep source, generated review artifacts, docs, and release evidence intake changes in separate batches when possible.",
    };
  }

  if (changeCount >= 25) {
    return {
      status: "high-review-pressure",
      recommendation:
        "Review path groups inside this slice before staging, then run focused checks plus copy, claim, and secret gates.",
      batchBoundary:
        "Avoid adding unrelated files to this slice; large UI, service, script, and docs changes should be reviewed as named sub-batches.",
    };
  }

  return {
    status: "normal-review",
    recommendation:
      "This slice is small enough for one focused review if its required checks pass.",
    batchBoundary:
      "Keep staging limited to the manifest path list and do not mix in secrets, generated artifacts, or external proof.",
  };
}

function reviewGuardrailFor(sliceId) {
  const guardrail = SLICE_REVIEW_GUARDRAILS[sliceId];
  if (!guardrail) {
    return {
      riskTier: "standard",
      localMergeGate:
        "Run the required checks and review changed paths before staging this slice.",
      rollbackBoundary:
        "Hold the slice if the focused checks or review boundaries fail.",
      mustNotMix: ["Secrets", "Generated artifacts", "Unrelated changes"],
    };
  }
  return guardrail;
}

function findSliceOrExit(sliceId, purpose) {
  const slice = SLICE_DEFINITIONS.find(
    (definition) => definition.id === sliceId,
  );
  if (!slice) {
    console.error(
      `Unknown logical slice "${sliceId}" for ${purpose}. Expected one of: ${SLICE_DEFINITIONS.map((definition) => definition.id).join(", ")}`,
    );
    process.exit(1);
  }
  return slice;
}

function isManualCheck(command) {
  return /^(Confirm|Review|Attach|Record)\b/i.test(command.trim());
}

function isExternalBlockerCheck(command) {
  const normalized = command.trim();
  return [
    /npm run check:release-blockers\b/,
    /npm run check:production-db-target\b/,
  ].some((pattern) => pattern.test(normalized));
}

function runShellCommand(command, inheritOutput) {
  return spawnSync(command, {
    cwd: root,
    encoding: "utf8",
    shell: true,
    stdio: inheritOutput ? "inherit" : ["ignore", "pipe", "pipe"],
  });
}

function verifySliceChecks(slice, options = {}) {
  const continueOnFailure = Boolean(options.continueOnFailure);
  const summaryJson = Boolean(options.summaryJson);
  const results = [];
  let failed = false;

  for (const command of slice.checks) {
    if (isManualCheck(command)) {
      results.push({
        command,
        skipped: true,
        manual: true,
        exitCode: null,
        status: "manual-required",
        note: "Manual review item; not executed by slice verifier.",
      });
      if (!summaryJson) {
        console.log(`SKIP manual check: ${command}`);
      }
      continue;
    }

    if (!summaryJson) {
      console.log(`\n>>> ${command}`);
    }
    const startedAt = new Date().toISOString();
    const result = runShellCommand(command, !summaryJson);
    const exitCode =
      typeof result.status === "number" ? result.status : result.signal ? 1 : 0;
    const endedAt = new Date().toISOString();
    const passed = exitCode === 0;
    const externalBlocked = !passed && isExternalBlockerCheck(command);
    failed = failed || (!passed && !externalBlocked);
    results.push({
      command,
      skipped: false,
      manual: false,
      externalBlocked,
      exitCode,
      status: passed
        ? "passed"
        : externalBlocked
          ? "external-blocked"
          : "failed",
      startedAt,
      endedAt,
      stdout: summaryJson ? (result.stdout || "").trim().slice(0, 12000) : "",
      stderr: summaryJson ? (result.stderr || "").trim().slice(0, 12000) : "",
    });

    if (!passed && !externalBlocked && !continueOnFailure) {
      break;
    }
  }

  const passedCount = results.filter(
    (result) => result.status === "passed",
  ).length;
  const failedCount = results.filter(
    (result) => result.status === "failed",
  ).length;
  const externalBlockedCount = results.filter(
    (result) => result.status === "external-blocked",
  ).length;
  const manualCount = results.filter((result) => result.manual).length;

  return {
    id: slice.id,
    title: slice.title,
    stageable: slice.stageable !== false,
    ok: failedCount === 0,
    releaseProof: false,
    boundary:
      "Local slice verification is review evidence only; it is not deployed-runtime, production database, or human-review evidence.",
    passedCount,
    failedCount,
    externalBlockedCount,
    manualCount,
    results,
  };
}

function verifyAllSlices(options = {}) {
  const summaryJson = Boolean(options.summaryJson);
  const continueOnFailure = Boolean(options.continueOnFailure);
  const compact = Boolean(options.compact);
  const slices = [];
  let stoppedEarly = false;

  for (const slice of SLICE_DEFINITIONS) {
    if (!summaryJson) {
      console.log(`\n=== ${slice.title} (${slice.id}) ===`);
    }
    const summary = verifySliceChecks(slice, {
      summaryJson,
      continueOnFailure,
    });
    slices.push(compact ? compactSliceVerificationSummary(summary) : summary);

    if (!summary.ok && !continueOnFailure) {
      stoppedEarly = true;
      break;
    }
  }

  const totals = slices.reduce(
    (acc, slice) => {
      acc.passedCount += slice.passedCount;
      acc.failedCount += slice.failedCount;
      acc.externalBlockedCount += slice.externalBlockedCount;
      acc.manualCount += slice.manualCount;
      acc.checkedCommandCount += slice.results.filter(
        (result) => !result.manual,
      ).length;
      return acc;
    },
    {
      passedCount: 0,
      failedCount: 0,
      externalBlockedCount: 0,
      manualCount: 0,
      checkedCommandCount: 0,
    },
  );

  return {
    ok: totals.failedCount === 0,
    releaseProof: false,
    boundary:
      "Aggregate logical-slice verification is local review evidence only; external runtime, production database, and human-review gates remain separate.",
    verifiedAt: new Date().toISOString(),
    sliceCount: SLICE_DEFINITIONS.length,
    verifiedSliceCount: slices.length,
    stoppedEarly,
    totals,
    slices,
  };
}

function compactSliceVerificationSummary(slice) {
  return {
    id: slice.id,
    title: slice.title,
    stageable: slice.stageable,
    ok: slice.ok,
    releaseProof: slice.releaseProof,
    boundary: slice.boundary,
    passedCount: slice.passedCount,
    failedCount: slice.failedCount,
    externalBlockedCount: slice.externalBlockedCount,
    manualCount: slice.manualCount,
    results: slice.results.map((result) => ({
      command: result.command,
      status: result.status,
      exitCode: result.exitCode,
      manual: result.manual,
      externalBlocked: Boolean(result.externalBlocked),
      skipped: Boolean(result.skipped),
      note: result.note || "",
    })),
  };
}

function renderAllSliceVerification(summary) {
  const status = summary.ok ? "passed" : "failed";
  const lines = [
    `All logical-slice verification ${status}.`,
    summary.boundary,
    "",
    `Slices checked: ${summary.verifiedSliceCount}/${summary.sliceCount}`,
    `Executable commands passed: ${summary.totals.passedCount}`,
    `Executable commands failed: ${summary.totals.failedCount}`,
    `External-blocked commands: ${summary.totals.externalBlockedCount}`,
    `Manual review items: ${summary.totals.manualCount}`,
    "",
    "Slice results:",
  ];

  for (const slice of summary.slices) {
    lines.push(
      `- ${slice.title}: ${slice.ok ? "ok" : "failed"} (${slice.passedCount} passed, ${slice.failedCount} failed, ${slice.externalBlockedCount} external-blocked, ${slice.manualCount} manual)`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function renderSliceReviewPlan(slice, sliceChanges) {
  const guardrail = reviewGuardrailFor(slice.id);
  const pressure = slicePressureFor(slice, sliceChanges.length);
  const lines = [
    `# ${slice.title} Slice Review Plan`,
    "",
    `Slice id: ${slice.id}`,
    `Commit pairing: ${slice.commit}`,
    "",
    `Review focus: ${slice.reviewFocus}`,
    "",
    `Risk tier: ${guardrail.riskTier}`,
    "",
    "Local merge gate:",
    `- ${guardrail.localMergeGate}`,
    "",
    "Rollback/hold boundary:",
    `- ${guardrail.rollbackBoundary}`,
    "",
    "Must not mix:",
    ...guardrail.mustNotMix.map((item) => `- ${item}`),
    "",
    `Changed paths: ${sliceChanges.length}`,
    "",
    `Review pressure: ${pressure.status}`,
    "",
    "Batch recommendation:",
    `- ${pressure.recommendation}`,
    "",
    "Batch boundary:",
    `- ${pressure.batchBoundary}`,
    "",
    "Stage policy:",
    `- ${formatStagePolicy(slice)}`,
    "",
    "Suggested staging command:",
    `- \`${formatSlicePathsCommand(slice.id, sliceChanges)}\``,
    "",
    ...renderReviewBatchLines(slice, sliceChanges),
    "",
    "Required checks:",
    ...slice.checks.map((command) => `- \`${command}\``),
    "",
    "Changed path list:",
  ];

  if (sliceChanges.length === 0) {
    lines.push("- None in the current worktree.");
  } else {
    for (const change of sliceChanges) {
      lines.push(formatChange(change));
    }
  }

  lines.push(
    "",
    "Boundary:",
    "- This is a review plan, not release proof. Keep external production, database, and human-review evidence separate until the final gates pass.",
    "",
  );

  return lines.join("\n");
}

function renderManifest({ changes, bySlice }) {
  const nextReview = buildNextReviewSliceSummary(bySlice);
  const lines = [
    "# NurAI Change Slice Manifest",
    "",
    "Generated from current git status.",
    "",
    "This manifest makes the large NurAI worktree reviewable without pretending the app is fully launched. It is a shipping map, not a commit log, and it must stay aligned with `git status --short` before release handoff.",
    "",
    "Known boundaries:",
    "- Do not commit secrets, production credentials, or copied environment values.",
    "- Do not treat generated screenshots, `.ipa` files, `server_dist`, `static-build`, or `node_modules` as source changes.",
    "- Do not claim external production proof until `deployed-runtime-url`, `production-database-url`, and human/source-review evidence are real.",
    "- Keep release-secret work separate from UI/product commits.",
    "",
    "## Summary",
    "",
    `- Total changed paths: ${changes.length}`,
  ];

  for (const slice of SLICE_DEFINITIONS) {
    const sliceChanges = bySlice.get(slice.id) || [];
    lines.push(`- ${slice.title}: ${sliceChanges.length}`);
  }

  lines.push("", "## Slice Pressure Dashboard", "");

  for (const slice of SLICE_DEFINITIONS) {
    const sliceChanges = bySlice.get(slice.id) || [];
    const pressure = slicePressureFor(slice, sliceChanges.length);
    lines.push(`- ${slice.title}: ${pressure.status}`);
    lines.push(`  - Changed paths: ${sliceChanges.length}`);
    lines.push(`  - Batch recommendation: ${pressure.recommendation}`);
    lines.push(`  - Batch boundary: ${pressure.batchBoundary}`);
  }

  lines.push("", "## Next Review Recommendation", "");
  lines.push(`Status: ${nextReview.status}`);
  lines.push("");
  lines.push(`Boundary: ${nextReview.boundary}`);
  lines.push("");
  if (nextReview.artifactAction.required) {
    lines.push("Artifact action:");
    lines.push(`- ${nextReview.artifactAction.message}`);
    lines.push(`- Output: \`${nextReview.artifactAction.outputPath}\``);
    lines.push(`- Command: \`${nextReview.artifactAction.command}\``);
    lines.push(`- Check: \`${nextReview.artifactAction.checkCommand}\``);
    lines.push("");
  }
  if (nextReview.recommendedSlice) {
    lines.push("Recommended next slice:");
    lines.push(
      `- ${nextReview.recommendedSlice.title} (${nextReview.recommendedSlice.id})`,
    );
    lines.push(`- Reason: ${nextReview.recommendedSlice.reason}`);
    lines.push(
      `- Stage command: \`${nextReview.recommendedSlice.stageCommand}\``,
    );
    lines.push(
      `- Review packet: \`${nextReview.recommendedSlice.reviewCommand}\``,
    );
    lines.push(
      `- Verify command: \`${nextReview.recommendedSlice.verifyCommand}\``,
    );
    if (nextReview.recommendedBatch) {
      lines.push(
        `- Suggested batch: ${nextReview.recommendedBatch.title} (${nextReview.recommendedBatch.id})`,
      );
      lines.push(`- Batch focus: ${nextReview.recommendedBatch.focus}`);
      lines.push(
        `- Batch hold boundary: ${nextReview.recommendedBatch.holdBoundary}`,
      );
    }
  } else {
    lines.push("Recommended next slice:");
    lines.push("- No stageable changed slice is currently available.");
  }

  lines.push("", "## Logical Slices", "");

  for (const slice of SLICE_DEFINITIONS) {
    const sliceChanges = bySlice.get(slice.id) || [];
    const guardrail = reviewGuardrailFor(slice.id);
    const pressure = slicePressureFor(slice, sliceChanges.length);
    lines.push(`### ${slice.title}`, "");
    lines.push(`Commit pairing: ${slice.commit}`);
    lines.push("");
    lines.push(`Review focus: ${slice.reviewFocus}`);
    lines.push("");
    lines.push(`Risk tier: ${guardrail.riskTier}`);
    lines.push("");
    lines.push(`Review pressure: ${pressure.status}`);
    lines.push("");
    lines.push("Batch recommendation:");
    lines.push(`- ${pressure.recommendation}`);
    lines.push("");
    lines.push("Batch boundary:");
    lines.push(`- ${pressure.batchBoundary}`);
    lines.push("");
    lines.push("Local merge gate:");
    lines.push(`- ${guardrail.localMergeGate}`);
    lines.push("");
    lines.push("Rollback/hold boundary:");
    lines.push(`- ${guardrail.rollbackBoundary}`);
    lines.push("");
    lines.push("Must not mix:");
    for (const item of guardrail.mustNotMix) {
      lines.push(`- ${item}`);
    }
    lines.push("");
    lines.push("Required checks:");
    for (const command of slice.checks) {
      lines.push(`- \`${command}\``);
    }
    lines.push("");
    lines.push("Stage policy:");
    lines.push(`- ${formatStagePolicy(slice)}`);
    lines.push("");
    lines.push("Suggested staging command:");
    lines.push(`- \`${formatSlicePathsCommand(slice.id, sliceChanges)}\``);
    lines.push("");
    for (const line of renderReviewBatchLines(slice, sliceChanges)) {
      lines.push(line);
    }
    lines.push("");
    lines.push(`Changed paths (${sliceChanges.length}):`);
    if (sliceChanges.length === 0) {
      lines.push("- None in the current worktree.");
    } else {
      for (const change of sliceChanges) {
        lines.push(formatChange(change));
      }
    }
    lines.push("");
  }

  lines.push("## Final Review Order", "");
  lines.push("1. Remove or externally store Generated Artifacts.");
  lines.push(
    "2. Review Backend/Database/Deployment before user-facing launch claims.",
  );
  lines.push(
    "3. Review AI Trust And Scholar Review before sensitive-answer UX ships.",
  );
  lines.push(
    "4. Review Quran/Home, Personalization/Privacy, Library, and Arabic feature slices independently.",
  );
  lines.push(
    "5. Run `npm run check:release-local` after the manifest check passes.",
  );
  lines.push(
    "6. Run `npm run check:goal-completion -- --summary-json` only as the honest final gate.",
  );
  lines.push("");

  return `${lines.join("\n")}\n`;
}

const REVIEW_ORDER = [
  "generated-artifacts",
  "backend-database-deployment",
  "ai-trust",
  "quran-home",
  "personalization-privacy",
  "library",
  "arabic",
  "app-store-release",
  "navigation-shell-ui",
  "documentation-audit",
];

function reviewOrderIndex(sliceId) {
  const index = REVIEW_ORDER.indexOf(sliceId);
  return index === -1 ? REVIEW_ORDER.length : index;
}

function buildNextReviewSliceSummary(bySlice) {
  const generatedChanges = bySlice.get("generated-artifacts") || [];
  const candidates = SLICE_DEFINITIONS.map((slice) => {
    const changes = bySlice.get(slice.id) || [];
    const pressure = slicePressureFor(slice, changes.length);
    const guardrail = reviewGuardrailFor(slice.id);
    const reviewBatches = collectReviewBatches(changes);
    return {
      slice,
      changes,
      pressure,
      guardrail,
      reviewBatches,
    };
  })
    .filter(
      (candidate) =>
        candidate.slice.stageable !== false && candidate.changes.length > 0,
    )
    .sort(
      (a, b) => reviewOrderIndex(a.slice.id) - reviewOrderIndex(b.slice.id),
    );

  const recommended = candidates[0] || null;
  const recommendedBatch =
    recommended &&
    ["split-required", "high-review-pressure"].includes(
      recommended.pressure.status,
    )
      ? recommended.reviewBatches[0] || null
      : null;
  const stageCommand =
    recommended && recommendedBatch
      ? formatBatchPathsCommand(recommended.slice, recommendedBatch)
      : recommended
        ? formatSlicePathsCommand(recommended.slice.id, recommended.changes)
        : "";

  return {
    ok: true,
    releaseProof: false,
    status: recommended ? "stageable-slice-ready" : "no-stageable-changes",
    boundary:
      "Next-review guidance is local staging discipline only; it is not deployed-runtime, production database, source-pack, or human-review evidence.",
    artifactAction: {
      required: generatedChanges.length > 0,
      changedPathCount: generatedChanges.length,
      command: "npm run export:generated-artifact-summary -- --write",
      checkCommand:
        "npm run check:generated-artifact-summary -- --summary-json",
      outputPath: generatedArtifactSummaryPath,
      message:
        generatedChanges.length > 0
          ? "Handle generated artifacts outside normal feature staging before source review continues."
          : "No generated artifacts are currently blocking source review.",
    },
    recommendedSlice: recommended
      ? {
          id: recommended.slice.id,
          title: recommended.slice.title,
          riskTier: recommended.guardrail.riskTier,
          reviewPressure: recommended.pressure.status,
          changedPathCount: recommended.changes.length,
          reason: recommended.pressure.recommendation,
          stageCommand,
          reviewCommand: `npm run export:logical-slice-review -- ${recommended.slice.id}`,
          checksCommand: `npm run export:logical-slice-checks -- ${recommended.slice.id}`,
          verifyCommand: `npm run check:logical-slice -- ${recommended.slice.id}`,
          localMergeGate: recommended.guardrail.localMergeGate,
          rollbackBoundary: recommended.guardrail.rollbackBoundary,
          mustNotMix: recommended.guardrail.mustNotMix,
        }
      : null,
    recommendedBatch: recommendedBatch
      ? {
          id: recommendedBatch.id,
          title: recommendedBatch.title,
          focus: recommendedBatch.focus,
          holdBoundary: recommendedBatch.holdBoundary,
          changedPathCount: recommendedBatch.changes.length,
          stageCommand,
          paths: recommendedBatch.changes.map((change) => change.classifyPath),
        }
      : null,
    candidateCount: candidates.length,
    reviewOrder: REVIEW_ORDER,
  };
}

function renderNextReviewSliceSummary(summary) {
  const lines = [
    "# Next Logical Review Slice",
    "",
    `Status: ${summary.status}`,
    "",
    summary.boundary,
    "",
  ];

  if (summary.artifactAction.required) {
    lines.push("Artifact action:");
    lines.push(`- ${summary.artifactAction.message}`);
    lines.push(
      `- Changed artifact paths: ${summary.artifactAction.changedPathCount}`,
    );
    lines.push(`- Output: \`${summary.artifactAction.outputPath}\``);
    lines.push(`- Command: \`${summary.artifactAction.command}\``);
    lines.push(`- Check: \`${summary.artifactAction.checkCommand}\``);
    lines.push("");
  }

  if (!summary.recommendedSlice) {
    lines.push("No stageable changed slice is currently available.");
    return `${lines.join("\n")}\n`;
  }

  const slice = summary.recommendedSlice;
  lines.push(`Recommended slice: ${slice.title} (${slice.id})`);
  lines.push(`Risk tier: ${slice.riskTier}`);
  lines.push(`Review pressure: ${slice.reviewPressure}`);
  lines.push(`Changed paths: ${slice.changedPathCount}`);
  lines.push("");
  lines.push("Reason:");
  lines.push(`- ${slice.reason}`);
  lines.push("");
  lines.push("Stage:");
  lines.push(`- \`${slice.stageCommand}\``);
  lines.push("");
  lines.push("Review packet:");
  lines.push(`- \`${slice.reviewCommand}\``);
  lines.push(`- \`${slice.checksCommand}\``);
  lines.push("");
  lines.push("Verify:");
  lines.push(`- \`${slice.verifyCommand}\``);
  lines.push("");
  lines.push("Local merge gate:");
  lines.push(`- ${slice.localMergeGate}`);
  lines.push("");
  lines.push("Rollback/hold boundary:");
  lines.push(`- ${slice.rollbackBoundary}`);
  lines.push("");
  lines.push("Must not mix:");
  for (const item of slice.mustNotMix) {
    lines.push(`- ${item}`);
  }

  if (summary.recommendedBatch) {
    const batch = summary.recommendedBatch;
    lines.push("");
    lines.push(`Suggested batch: ${batch.title} (${batch.id})`);
    lines.push(`Changed paths: ${batch.changedPathCount}`);
    lines.push(`Focus: ${batch.focus}`);
    lines.push(`Hold boundary: ${batch.holdBoundary}`);
  }

  return `${lines.join("\n")}\n`;
}

function buildSummary({ changes, bySlice, findings }) {
  return {
    manifestPath,
    changedPathCount: changes.length,
    nextReviewSlice: buildNextReviewSliceSummary(bySlice),
    slices: SLICE_DEFINITIONS.map((slice) => ({
      reviewPressure: slicePressureFor(
        slice,
        (bySlice.get(slice.id) || []).length,
      ).status,
      riskTier: reviewGuardrailFor(slice.id).riskTier,
      id: slice.id,
      title: slice.title,
      stageable: slice.stageable !== false,
      changedPathCount: (bySlice.get(slice.id) || []).length,
      reviewBatchCount: collectReviewBatches(bySlice.get(slice.id) || [])
        .length,
    })),
    findings,
  };
}

function main() {
  if (args.has("--help") || args.has("-h")) {
    printHelp();
    return;
  }

  const shouldWrite = args.has("--write");
  const shouldCheck = args.has("--check");
  const summaryJson = args.has("--summary-json");
  const pathsSliceId = argValue("--paths");
  const batchId = argValue("--batch");
  const reviewPlanSliceId = argValue("--review-plan");
  const checksSliceId = argValue("--checks");
  const verifySliceId = argValue("--verify");
  const verifyAll = args.has("--verify-all");
  const useNullSeparator = args.has("--null");
  const { changes, bySlice } = collectChanges();

  if (args.has("--next-review-slice")) {
    const summary = buildNextReviewSliceSummary(bySlice);
    if (summaryJson) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(renderNextReviewSliceSummary(summary));
    }
    return;
  }

  if (args.has("--artifact-summary")) {
    const summary = buildGeneratedArtifactSummary(bySlice);
    const rendered = renderGeneratedArtifactSummary(summary);
    if (shouldWrite) {
      const absoluteOutputPath = path.join(root, generatedArtifactSummaryPath);
      fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
      fs.writeFileSync(absoluteOutputPath, rendered);
      if (!summaryJson) {
        console.log(`Wrote ${generatedArtifactSummaryPath}.`);
      }
    }
    if (shouldCheck) {
      const absoluteOutputPath = path.join(root, generatedArtifactSummaryPath);
      if (!fs.existsSync(absoluteOutputPath)) {
        if (summaryJson) {
          console.log(
            JSON.stringify(
              {
                ...summary,
                ok: false,
                finding: `${generatedArtifactSummaryPath} is missing.`,
              },
              null,
              2,
            ),
          );
        } else {
          console.error(`${generatedArtifactSummaryPath} is missing.`);
        }
        process.exit(1);
      }
      const current = fs.readFileSync(absoluteOutputPath, "utf8");
      if (current !== rendered) {
        if (summaryJson) {
          console.log(
            JSON.stringify(
              {
                ...summary,
                ok: false,
                finding: `${generatedArtifactSummaryPath} is out of date. Run npm run export:generated-artifact-summary -- --write.`,
              },
              null,
              2,
            ),
          );
        } else {
          console.error(
            `${generatedArtifactSummaryPath} is out of date. Run npm run export:generated-artifact-summary -- --write.`,
          );
        }
        process.exit(1);
      }
    }
    if (summaryJson) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(rendered);
    }
    return;
  }

  if (pathsSliceId) {
    const slice = findSliceOrExit(pathsSliceId, "--paths");
    if (slice.stageable === false && !args.has("--allow-generated")) {
      console.error(
        `Logical slice "${pathsSliceId}" is not stageable by default. Generated artifacts require explicit owner approval and --allow-generated.`,
      );
      process.exit(1);
    }
    const sliceChanges = bySlice.get(pathsSliceId) || [];
    const batchChanges = batchId
      ? collectReviewBatches(sliceChanges).find((batch) => batch.id === batchId)
      : null;
    if (batchId && !batchChanges) {
      console.error(
        `Unknown review batch "${batchId}" for logical slice "${pathsSliceId}". Expected one of: ${
          collectReviewBatches(sliceChanges)
            .map((batch) => batch.id)
            .join(", ") || "none"
        }`,
      );
      process.exit(1);
    }
    const paths = (batchChanges ? batchChanges.changes : sliceChanges).map(
      (change) => change.classifyPath,
    );
    process.stdout.write(paths.join(useNullSeparator ? "\0" : "\n"));
    if (paths.length > 0) {
      process.stdout.write(useNullSeparator ? "\0" : "\n");
    }
    return;
  }

  if (checksSliceId) {
    const slice = findSliceOrExit(checksSliceId, "--checks");
    if (summaryJson) {
      console.log(
        JSON.stringify(
          {
            id: slice.id,
            title: slice.title,
            stageable: slice.stageable !== false,
            checks: slice.checks,
          },
          null,
          2,
        ),
      );
    } else {
      process.stdout.write(slice.checks.join(useNullSeparator ? "\0" : "\n"));
      if (slice.checks.length > 0) {
        process.stdout.write(useNullSeparator ? "\0" : "\n");
      }
    }
    return;
  }

  if (reviewPlanSliceId) {
    const slice = findSliceOrExit(reviewPlanSliceId, "--review-plan");
    const sliceChanges = bySlice.get(slice.id) || [];
    if (summaryJson) {
      console.log(
        JSON.stringify(
          {
            id: slice.id,
            title: slice.title,
            commit: slice.commit,
            stageable: slice.stageable !== false,
            changedPathCount: sliceChanges.length,
            reviewFocus: slice.reviewFocus,
            stagePolicy: formatStagePolicy(slice),
            stagingCommand: formatSlicePathsCommand(slice.id, sliceChanges),
            reviewBatches: collectReviewBatches(sliceChanges).map((batch) => ({
              id: batch.id,
              title: batch.title,
              focus: batch.focus,
              holdBoundary: batch.holdBoundary,
              changedPathCount: batch.changes.length,
              stagingCommand: formatBatchPathsCommand(slice, batch),
              paths: batch.changes.map((change) => change.classifyPath),
            })),
            checks: slice.checks,
            paths: sliceChanges.map((change) => change.classifyPath),
          },
          null,
          2,
        ),
      );
    } else {
      console.log(renderSliceReviewPlan(slice, sliceChanges));
    }
    return;
  }

  if (verifySliceId) {
    const slice = findSliceOrExit(verifySliceId, "--verify");
    const summary = verifySliceChecks(slice, {
      continueOnFailure: args.has("--continue-on-failure"),
      summaryJson,
    });
    if (summaryJson) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      const status = summary.ok ? "passed" : "failed";
      console.log(
        `\nSlice verification ${status}: ${slice.title} (${summary.passedCount} passed, ${summary.failedCount} failed, ${summary.manualCount} manual).`,
      );
      console.log(summary.boundary);
    }
    if (!summary.ok) process.exit(1);
    return;
  }

  if (verifyAll) {
    const summary = verifyAllSlices({
      continueOnFailure: args.has("--continue-on-failure"),
      summaryJson,
      compact: args.has("--compact"),
    });
    if (summaryJson) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(renderAllSliceVerification(summary));
    }
    if (!summary.ok) process.exit(1);
    return;
  }

  const manifest = renderManifest({ changes, bySlice });
  const fullManifestPath = path.join(root, manifestPath);
  const findings = [];

  if (shouldWrite) {
    fs.mkdirSync(path.dirname(fullManifestPath), { recursive: true });
    fs.writeFileSync(fullManifestPath, manifest);
  }

  if (shouldCheck) {
    if (!fs.existsSync(fullManifestPath)) {
      findings.push(
        `${manifestPath} is missing. Run npm run export:logical-change-slices -- --write.`,
      );
    } else {
      const current = fs.readFileSync(fullManifestPath, "utf8");
      if (current !== manifest) {
        findings.push(
          `${manifestPath} is out of date. Run npm run export:logical-change-slices -- --write.`,
        );
      }
    }
  }

  const summary = buildSummary({ changes, bySlice, findings });
  if (summaryJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else if (findings.length > 0) {
    console.error(
      `Logical change slice manifest check failed with ${findings.length} finding(s):`,
    );
    for (const finding of findings) console.error(`- ${finding}`);
  } else if (shouldCheck) {
    console.log(
      `Logical change slice manifest check passed: ${changes.length} changed path(s) are mapped across ${SLICE_DEFINITIONS.length} slice(s).`,
    );
  } else if (shouldWrite) {
    console.log(
      `Wrote ${manifestPath} with ${changes.length} changed path(s).`,
    );
  } else {
    console.log(manifest);
  }

  if (findings.length > 0) {
    process.exit(1);
  }
}

main();
