#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  BLOCKER_EVIDENCE_GATE_IDS,
  GATE_REQUIREMENTS,
  postClearWatchPlanForGate,
  rollbackMitigationPlanForGate,
} = require("./lib/releaseExternalEvidenceRequirements");

const root = process.cwd();

const DOCS = {
  runbook: "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
  audit: "docs/audit/RELEASE_COMPLETION_AUDIT.md",
  aiStatus: "docs/audit/AI_RELEASE_STATUS.md",
  ummahAudit: "docs/audit/UMMAH_APP_RELEASE_AND_RESEARCH_AUDIT.md",
  productRoadmap: "docs/audit/UMMAH_PRODUCT_ROADMAP.md",
  accountBrowserObservations:
    "docs/audit/RELEASE_ACCOUNT_BROWSER_OBSERVATIONS.md",
  accountSessionPlan: "docs/audit/RELEASE_ACCOUNT_SESSION_PLAN.md",
  ownerActions: "docs/audit/RELEASE_OWNER_ACTIONS.md",
  blockerEvidence: "docs/audit/RELEASE_BLOCKER_EVIDENCE.md",
  releaseCockpit: "docs/audit/RELEASE_COCKPIT.md",
  remainingTime: "docs/audit/RELEASE_REMAINING_TIME.md",
  libraryCompletionAudit: "docs/audit/LIBRARY_COMPLETION_AUDIT.md",
  libraryTitleContentAudit: "docs/audit/LIBRARY_TITLE_CONTENT_AUDIT.md",
  librarySourceSpecificityAudit:
    "docs/audit/LIBRARY_SOURCE_SPECIFICITY_AUDIT.md",
  libraryReviewQueue: "docs/audit/LIBRARY_REVIEW_QUEUE.md",
  libraryReviewBatches: "docs/audit/LIBRARY_REVIEW_BATCHES.md",
  libraryFinalReviewHandoff: "docs/audit/LIBRARY_FINAL_REVIEW_HANDOFF.md",
  hajjUmrahReviewPacket: "docs/audit/HAJJ_UMRAH_REVIEW_PACKET.md",
  libraryReviewSignoffLedger: "docs/audit/LIBRARY_REVIEW_SIGNOFF_LEDGER.md",
  secretChecklist: "docs/audit/PRODUCTION_SECRET_CHECKLIST.md",
  productionDbProofPlan: "docs/audit/PRODUCTION_DB_PROOF_PLAN.md",
  envExample: ".env.production.example",
  projectDoc: "replit.md",
};

const BLOCKER_REQUIREMENTS = {
  "deployed-runtime-url": {
    docs: ["runbook", "audit"],
    terms: [
      "NURAI_DEPLOYMENT_URL",
      "check:ai-release:deployed",
      "AI_INTEGRATIONS_OPENAI_API_KEY",
      "NURAI_DEPLOYED_AI_SMOKE_SECRET",
    ],
    aiStatusTerms: [
      "NURAI_DEPLOYMENT_URL",
      "check:ai-release:deployed",
      "AI_INTEGRATIONS_OPENAI_API_KEY",
      "NURAI_DEPLOYED_AI_SMOKE_SECRET",
    ],
    envTerms: [
      "NURAI_DEPLOYMENT_URL",
      "AI_INTEGRATIONS_OPENAI_API_KEY",
      "NURAI_DEPLOYED_AI_SMOKE_SECRET",
    ],
  },
  "production-database-url": {
    docs: ["runbook", "audit"],
    terms: [
      "DATABASE_URL",
      "check:production-db-target",
      "apply:production-migrations",
      "check:production-db-release",
      "check:conversation-ownership",
      "fix:conversation-ownership",
      "check:db-migrations-applied",
      "migrations/0001_conversation_ownership.sql",
      "migrations/0007_library_source_review_events.sql",
      "migrations/0008_family_members_unique.sql",
      "migrations/0009_message_ai_metadata.sql",
    ],
    aiStatusTerms: [
      "DATABASE_URL",
      "check:production-db-target",
      "apply:production-migrations",
      "check:production-db-release",
      "check:conversation-ownership",
      "fix:conversation-ownership",
      "check:db-migrations-applied",
      "migrations/0001_conversation_ownership.sql",
      "migrations/0007_library_source_review_events.sql",
      "migrations/0008_family_members_unique.sql",
      "migrations/0009_message_ai_metadata.sql",
    ],
    envTerms: ["DATABASE_URL"],
  },
  "owned-runpod-endpoint": {
    docs: ["runbook", "audit"],
    terms: [
      "create:runpod-ai",
      "check:runpod-account",
      "axws2453nd",
      "RUNPOD_API_KEY",
      "NURAI_LOCAL_AI_BASE_URL",
      "NURAI_LOCAL_AI_MODELS",
    ],
    aiStatusTerms: [
      "create:runpod-ai",
      "check:runpod-account",
      "axws2453nd",
      "RUNPOD_API_KEY",
      "NURAI_LOCAL_AI_BASE_URL",
      "NURAI_LOCAL_AI_MODELS",
    ],
    envTerms: [
      "RUNPOD_API_KEY",
      "NURAI_LOCAL_AI_BASE_URL",
      "NURAI_LOCAL_AI_API_KEY",
      "NURAI_LOCAL_TEXT_MODEL",
      "NURAI_LOCAL_AI_MODELS",
    ],
  },
  "google-places-key": {
    docs: ["runbook", "audit"],
    terms: [
      "GOOGLE_PLACES_API_KEY",
      "GOOGLE_CLOUD_PROJECT_ID",
      "check:google-places-live",
    ],
    aiStatusTerms: [
      "GOOGLE_PLACES_API_KEY",
      "GOOGLE_CLOUD_PROJECT_ID",
      "check:google-places-live",
    ],
    envTerms: ["GOOGLE_PLACES_API_KEY", "GOOGLE_CLOUD_PROJECT_ID"],
  },
  "eas-android-submit-config": {
    docs: ["runbook", "audit"],
    terms: [
      "GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH",
      "serviceAccountKeyPath",
      "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
      "check:android-release-credentials",
      "check:revenuecat-offerings:android",
    ],
    aiStatusTerms: [
      "GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH",
      "serviceAccountKeyPath",
      "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
      "check:android-release-credentials",
      "check:revenuecat-offerings:android",
    ],
    envTerms: [
      "GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH",
      "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
    ],
  },
};

function read(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`${file} is missing.`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function runBlockerReport() {
  const result = spawnSync(
    process.execPath,
    ["scripts/check-release-blockers.js", "--json"],
    {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    },
  );

  const stdout = result.stdout.trim();
  if (!stdout) {
    throw new Error(
      `check-release-blockers did not emit JSON. stderr: ${result.stderr.trim()}`,
    );
  }

  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `check-release-blockers emitted invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function runLibraryCompletionSummary() {
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(
    npmExecutable,
    [
      "run",
      "check:library-content-completion",
      "--",
      "--summary-json",
      "--allow-review-pending",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    },
  );

  const stdout = result.stdout.trim();
  const jsonStart = stdout.indexOf("{");
  if (jsonStart === -1) {
    throw new Error(
      `check:library-content-completion did not emit JSON. stderr: ${result.stderr.trim()}`,
    );
  }

  try {
    return JSON.parse(stdout.slice(jsonStart));
  } catch (error) {
    throw new Error(
      `check:library-content-completion emitted invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function assertContains(text, label, term, failures) {
  if (!text.includes(term)) {
    failures.push(`${label} must mention ${term}.`);
  }
}

function assertNotContains(text, label, term, failures) {
  if (text.includes(term)) {
    failures.push(`${label} must not contain ${term}.`);
  }
}

function assertCurrentCount(text, label, count, noun, failures) {
  assertContains(text, label, `${count} ${noun}`, failures);
}

function main() {
  const report = runBlockerReport();
  const librarySummary = runLibraryCompletionSummary();
  const docs = Object.fromEntries(
    Object.entries(DOCS).map(([key, file]) => [
      key,
      { file, text: read(file) },
    ]),
  );
  const failures = [];

  if (!Array.isArray(report.blocked)) {
    failures.push("Release blocker report must include a blocked array.");
  }

  const blockedIds = (report.blocked || []).map((blocker) => blocker.id);
  if (blockedIds.length !== report.blockerCount) {
    failures.push(
      "Release blocker report blockerCount does not match blocked IDs.",
    );
  }
  const currentMigrationFiles = fs
    .readdirSync(path.join(root, "migrations"))
    .filter((file) => /^\d{4}_[a-z0-9_]+\.sql$/i.test(file))
    .sort();
  if (report.migrationFilesChecked !== currentMigrationFiles.length) {
    failures.push(
      `Release blocker report must check every migration file; expected ${currentMigrationFiles.length}, saw ${report.migrationFilesChecked}.`,
    );
  }

  for (const blockerId of blockedIds) {
    const requirement = BLOCKER_REQUIREMENTS[blockerId];
    if (!requirement) {
      failures.push(
        `No release handoff requirement is defined for ${blockerId}.`,
      );
      continue;
    }

    for (const docKey of requirement.docs) {
      const doc = docs[docKey];
      assertContains(doc.text, doc.file, blockerId, failures);
      for (const term of requirement.terms) {
        assertContains(doc.text, doc.file, term, failures);
      }
    }

    assertContains(
      docs.ownerActions.text,
      docs.ownerActions.file,
      blockerId,
      failures,
    );
    const gateRequirement = GATE_REQUIREMENTS[blockerId];
    if (gateRequirement) {
      assertContains(
        docs.ownerActions.text,
        docs.ownerActions.file,
        "Canonical proof commands",
        failures,
      );
      assertContains(
        docs.ownerActions.text,
        docs.ownerActions.file,
        "First Pass Execution Order",
        failures,
      );
      assertContains(
        docs.ownerActions.text,
        docs.ownerActions.file,
        "First pass rule: do not paste credentials",
        failures,
      );
      assertContains(
        docs.ownerActions.text,
        docs.ownerActions.file,
        "No-secret checkpoint",
        failures,
      );
      assertContains(
        docs.ownerActions.text,
        docs.ownerActions.file,
        "Evidence capture checklist",
        failures,
      );
      assertContains(
        docs.ownerActions.text,
        docs.ownerActions.file,
        "Command-result capture templates",
        failures,
      );
      assertContains(
        docs.ownerActions.text,
        docs.ownerActions.file,
        "export:release-command-result -- --gate-id",
        failures,
      );
      assertContains(
        docs.ownerActions.text,
        docs.ownerActions.file,
        "summary-json-file",
        failures,
      );
      for (const command of gateRequirement.verificationCommands || []) {
        assertContains(
          docs.ownerActions.text,
          docs.ownerActions.file,
          command,
          failures,
        );
      }
      for (const captureItem of gateRequirement.evidenceCaptureChecklist ||
        []) {
        assertContains(
          docs.ownerActions.text,
          docs.ownerActions.file,
          captureItem,
          failures,
        );
      }
      for (const criterion of gateRequirement.acceptanceChecklist || []) {
        assertContains(
          docs.ownerActions.text,
          docs.ownerActions.file,
          criterion,
          failures,
        );
        assertContains(
          docs.accountSessionPlan.text,
          docs.accountSessionPlan.file,
          criterion,
          failures,
        );
      }
      if (gateRequirement.noSecretBoundary) {
        assertContains(
          docs.ownerActions.text,
          docs.ownerActions.file,
          gateRequirement.noSecretBoundary,
          failures,
        );
        assertContains(
          docs.accountSessionPlan.text,
          docs.accountSessionPlan.file,
          gateRequirement.noSecretBoundary,
          failures,
        );
      }
      assertContains(
        docs.accountSessionPlan.text,
        docs.accountSessionPlan.file,
        "Post-clear watch plan",
        failures,
      );
      assertContains(
        docs.accountSessionPlan.text,
        docs.accountSessionPlan.file,
        "Rollback / mitigation plan",
        failures,
      );
      for (const watchItem of postClearWatchPlanForGate(blockerId)) {
        assertContains(
          docs.accountSessionPlan.text,
          docs.accountSessionPlan.file,
          watchItem,
          failures,
        );
      }
      for (const mitigationItem of rollbackMitigationPlanForGate(blockerId)) {
        assertContains(
          docs.accountSessionPlan.text,
          docs.accountSessionPlan.file,
          mitigationItem,
          failures,
        );
      }
    }

    assertContains(
      docs.blockerEvidence.text,
      docs.blockerEvidence.file,
      blockerId,
      failures,
    );
    assertContains(
      docs.blockerEvidence.text,
      docs.blockerEvidence.file,
      "Current non-secret evidence",
      failures,
    );

    assertContains(docs.aiStatus.text, docs.aiStatus.file, blockerId, failures);
    for (const term of requirement.aiStatusTerms || []) {
      assertContains(docs.aiStatus.text, docs.aiStatus.file, term, failures);
    }

    for (const term of requirement.envTerms) {
      assertContains(
        docs.envExample.text,
        docs.envExample.file,
        term,
        failures,
      );
      assertContains(
        docs.secretChecklist.text,
        docs.secretChecklist.file,
        term,
        failures,
      );
    }
  }

  assertCurrentCount(
    docs.audit.text,
    docs.audit.file,
    report.blockerCount,
    report.blockerCount === 1 ? "external blocker" : "external blockers",
    failures,
  );
  assertContains(
    docs.ownerActions.text,
    docs.ownerActions.file,
    `External blockers: ${report.blockerCount}`,
    failures,
  );
  assertCurrentCount(
    docs.audit.text,
    docs.audit.file,
    report.packageScriptsChecked,
    "package scripts",
    failures,
  );
  assertCurrentCount(
    docs.audit.text,
    docs.audit.file,
    report.releaseControlScriptsChecked,
    "release-control scripts",
    failures,
  );
  assertCurrentCount(
    docs.audit.text,
    docs.audit.file,
    report.migrationFilesChecked,
    "migration files",
    failures,
  );

  if (!docs.aiStatus.text.includes("@hamidamjad98/nurai")) {
    failures.push(`${docs.aiStatus.file} must include the linked EAS project.`);
  }
  if (
    blockedIds.includes("eas-android-submit-config") &&
    !docs.aiStatus.text.includes("GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH")
  ) {
    failures.push(
      `${docs.aiStatus.file} must mention the Android submit service-account path.`,
    );
  }
  for (const term of [
    "check:goal-completion",
    "check:library-content-completion",
    "export:library-completion-audit",
    "export:library-title-content-audit",
    "export:library-source-specificity-audit",
    "export:library-review-queue",
    "export:library-review-packet",
    "export:library-review-packets",
    "export:library-review-signoff-ledger",
    "export:library-review-evidence-intake",
    "validate:library-review-evidence",
    "check:library-review-final-readiness",
    "check:source-pack-final-readiness",
    "check:human-review-final-readiness",
    "apply:library-review-evidence",
    "--allow-partial-import",
    "check:official-service-links",
    "check:pilgrim-health-safety",
    "check:ummah-product-roadmap",
    "export:ummah-product-roadmap",
    "export:release-owner-actions",
    "export:release-cockpit",
    "check:release-cockpit",
    "export:release-account-session-plan",
    "export:release-blocker-evidence",
    "export:release-remaining-time",
    "check:release-remaining-time",
    "check:railway-smoke-secret-sync",
    "sync:railway-smoke-secret",
    "check:production-db-proof-plan",
    "export:release-external-evidence-intake",
    "export:release-command-result",
    "check:release-command-result",
    "validate:release-external-evidence",
    "export:production-secret-checklist",
  ]) {
    assertContains(docs.runbook.text, docs.runbook.file, term, failures);
    assertContains(docs.audit.text, docs.audit.file, term, failures);
  }
  assertContains(
    docs.accountSessionPlan.text,
    docs.accountSessionPlan.file,
    "export:release-command-result",
    failures,
  );
  assertContains(
    docs.accountSessionPlan.text,
    docs.accountSessionPlan.file,
    "check:release-command-result",
    failures,
  );
  for (const term of [
    "NurAI Release Cockpit",
    "Operator Queue",
    "No-Secret Boundaries",
    "Final Proof Commands",
    "deployed-runtime-url",
    "production-database-url",
    "source-pack-activation-readiness",
    "library-content-completion",
    "npm run check:goal-completion -- --summary-json",
  ]) {
    assertContains(
      docs.releaseCockpit.text,
      docs.releaseCockpit.file,
      term,
      failures,
    );
  }
  assertContains(
    docs.runbook.text,
    docs.runbook.file,
    "export:release-command-result -- --gate-id",
    failures,
  );
  assertContains(
    docs.audit.text,
    docs.audit.file,
    "export:release-command-result -- --gate-id",
    failures,
  );
  const packageJson = JSON.parse(read("package.json"));
  const commandResultScript = read("scripts/export-release-command-result.js");
  const goalCompletionScript = read("scripts/check-goal-completion.js");
  const productionDbProofPlanScript = read(
    "scripts/check-production-db-proof-plan.js",
  );
  const productionDbProofScriptTerms = [
    "buildDbEvidenceContract",
    "Production database evidence contract",
    "Use DATABASE_URL only in the release shell or production secret manager",
    "Stop before apply if check:production-db-target does not identify the active Railway project",
    "Non-secret migration file list with sha256 hashes",
    "Do not claim production database is verified from this plan alone",
    "docs/audit/PRODUCTION_DB_PROOF_PLAN.md",
    "shouldWrite",
    "shouldCheck",
    "renderMarkdown",
    "migration hash and command plan only",
    "requiredCommandCount",
    "migrationHashCount",
  ];
  const productionDbProofDocTerms = [
    "Production database evidence contract",
    "Use DATABASE_URL only in the release shell or production secret manager",
    "Stop before apply if check:production-db-target does not identify the active Railway project",
    "Non-secret migration file list with sha256 hashes",
    "Do not claim production database is verified from this plan alone",
  ];
  const productionDbProofArtifactTerms = [
    "Production DB Proof Plan",
    "Ready for production DB claim: no",
    "Expected Supabase project ref",
    "Migration Hashes",
    "Never commit, screenshot, log, paste, or attach the real `DATABASE_URL`",
    "migration hash and command plan only",
  ];
  const blockerEvidenceDbArtifactTerms = [
    "Non-secret DB proof plan artifact current: yes",
    "path docs/audit/PRODUCTION_DB_PROOF_PLAN.md",
    "DB proof plan migration hashes indexed",
    "production DB claim ready: no",
    "DB proof plan boundary: migration hashes and command plan only",
  ];
  for (const term of productionDbProofScriptTerms) {
    assertContains(
      productionDbProofPlanScript,
      "scripts/check-production-db-proof-plan.js",
      term,
      failures,
    );
  }
  for (const term of productionDbProofDocTerms) {
    assertContains(docs.runbook.text, docs.runbook.file, term, failures);
  }
  for (const term of productionDbProofArtifactTerms) {
    assertContains(
      docs.productionDbProofPlan.text,
      docs.productionDbProofPlan.file,
      term,
      failures,
    );
  }
  for (const term of blockerEvidenceDbArtifactTerms) {
    assertContains(
      docs.blockerEvidence.text,
      docs.blockerEvidence.file,
      term,
      failures,
    );
  }
  assertContains(
    commandResultScript,
    "scripts/export-release-command-result.js",
    "GATE_REQUIREMENTS",
    failures,
  );
  assertContains(
    commandResultScript,
    "scripts/export-release-command-result.js",
    "validateGateCommand",
    failures,
  );
  assertContains(
    commandResultScript,
    "scripts/export-release-command-result.js",
    "--gate-id",
    failures,
  );
  const ownerActionsScript = read("scripts/export-release-owner-actions.js");
  for (const term of [
    "buildCommandResultTemplates",
    "Command-result capture templates",
    "Evidence capture checklist",
    "summary-json-file",
    "release-external-evidence.intake.json",
  ]) {
    assertContains(
      ownerActionsScript,
      "scripts/export-release-owner-actions.js",
      term,
      failures,
    );
  }
  for (const term of [
    "GATE_REQUIREMENTS",
    "RELEASE_EXTERNAL_EVIDENCE_SCHEMA_VERSION",
    "canonicalExternalGateDetail",
    "acceptanceChecklist",
    "noSecretBoundary",
    "verificationCommands",
    "runHumanReviewFinalReadiness",
    "humanReviewFinalReadiness",
    "readyForHumanReviewClaims",
    "--summary-json",
  ]) {
    assertContains(
      goalCompletionScript,
      "scripts/check-goal-completion.js",
      term,
      failures,
    );
  }
  const blockerEvidenceScript = read(
    "scripts/export-release-blocker-evidence.js",
  );
  const releaseBlockerScript = read("scripts/check-release-blockers.js");
  const releaseEvidenceRequirements = read(
    "scripts/lib/releaseExternalEvidenceRequirements.js",
  );
  assertContains(
    releaseBlockerScript,
    "scripts/check-release-blockers.js",
    "listRequiredMigrationFiles",
    failures,
  );
  assertContains(
    releaseBlockerScript,
    "scripts/check-release-blockers.js",
    "^\\d{4}_[a-z0-9_]+\\.sql$",
    failures,
  );
  assertNotContains(
    releaseBlockerScript,
    "scripts/check-release-blockers.js",
    '"migrations/0010_nurai_migration_audit.sql"',
    failures,
  );
  for (const gateId of BLOCKER_EVIDENCE_GATE_IDS) {
    const postClearWatchPlan = postClearWatchPlanForGate(gateId);
    const rollbackMitigationPlan = rollbackMitigationPlanForGate(gateId);
    if (!Array.isArray(postClearWatchPlan) || postClearWatchPlan.length < 2) {
      failures.push(
        `${gateId} must define at least two post-clear watch plan items.`,
      );
    }
    if (
      !Array.isArray(rollbackMitigationPlan) ||
      rollbackMitigationPlan.length < 2
    ) {
      failures.push(
        `${gateId} must define at least two rollback / mitigation plan items.`,
      );
    }
  }
  assertContains(
    releaseEvidenceRequirements,
    "scripts/lib/releaseExternalEvidenceRequirements.js",
    "BLOCKER_EVIDENCE_GATE_IDS",
    failures,
  );
  assertContains(
    releaseEvidenceRequirements,
    "scripts/lib/releaseExternalEvidenceRequirements.js",
    "verificationCommandsForGate",
    failures,
  );
  assertContains(
    releaseEvidenceRequirements,
    "scripts/lib/releaseExternalEvidenceRequirements.js",
    "postClearWatchPlanForGate",
    failures,
  );
  assertContains(
    releaseEvidenceRequirements,
    "scripts/lib/releaseExternalEvidenceRequirements.js",
    "rollbackMitigationPlanForGate",
    failures,
  );
  assertContains(
    blockerEvidenceScript,
    "scripts/export-release-blocker-evidence.js",
    "BLOCKER_EVIDENCE_GATE_IDS",
    failures,
  );
  assertContains(
    blockerEvidenceScript,
    "scripts/export-release-blocker-evidence.js",
    "verificationCommandsForGate",
    failures,
  );
  assertContains(
    blockerEvidenceScript,
    "scripts/export-release-blocker-evidence.js",
    "postClearWatchPlanForGate",
    failures,
  );
  assertContains(
    blockerEvidenceScript,
    "scripts/export-release-blocker-evidence.js",
    "rollbackMitigationPlanForGate",
    failures,
  );
  assertContains(
    blockerEvidenceScript,
    "scripts/export-release-blocker-evidence.js",
    "Post-clear watch plan",
    failures,
  );
  assertContains(
    blockerEvidenceScript,
    "scripts/export-release-blocker-evidence.js",
    "Rollback / mitigation plan",
    failures,
  );
  assertNotContains(
    blockerEvidenceScript,
    "scripts/export-release-blocker-evidence.js",
    "const VERIFY_COMMANDS =",
    failures,
  );
  assertNotContains(
    blockerEvidenceScript,
    "scripts/export-release-blocker-evidence.js",
    "const EXTERNAL_GATE_IDS = [",
    failures,
  );
  if (
    packageJson.scripts?.["export:release-command-result"] !==
    "node scripts/export-release-command-result.js"
  ) {
    failures.push("package.json must expose export:release-command-result.");
  }
  if (
    packageJson.scripts?.["export:release-cockpit"] !==
    "node scripts/export-release-cockpit.js"
  ) {
    failures.push("package.json must expose export:release-cockpit.");
  }
  if (
    packageJson.scripts?.["check:release-cockpit"] !==
    "node scripts/export-release-cockpit.js --check --summary-json"
  ) {
    failures.push("package.json must expose check:release-cockpit.");
  }
  if (
    packageJson.scripts?.["check:release-command-result"] !==
    "node scripts/check-release-command-result.js"
  ) {
    failures.push("package.json must expose check:release-command-result.");
  }
  if (
    !fs.existsSync(path.join(root, "scripts/export-release-command-result.js"))
  ) {
    failures.push("scripts/export-release-command-result.js is missing.");
  }
  if (!fs.existsSync(path.join(root, "scripts/export-release-cockpit.js"))) {
    failures.push("scripts/export-release-cockpit.js is missing.");
  }
  if (
    !fs.existsSync(path.join(root, "scripts/check-release-command-result.js"))
  ) {
    failures.push("scripts/check-release-command-result.js is missing.");
  }
  assertContains(
    docs.runbook.text,
    docs.runbook.file,
    "PRODUCTION_SECRET_CHECKLIST.md",
    failures,
  );
  assertContains(
    docs.audit.text,
    docs.audit.file,
    "PRODUCTION_SECRET_CHECKLIST.md",
    failures,
  );
  assertContains(
    docs.runbook.text,
    docs.runbook.file,
    "RELEASE_REMAINING_TIME.md",
    failures,
  );
  assertContains(
    docs.audit.text,
    docs.audit.file,
    "RELEASE_REMAINING_TIME.md",
    failures,
  );
  assertContains(
    docs.remainingTime.text,
    docs.remainingTime.file,
    `External release blockers: ${report.blockerCount}`,
    failures,
  );
  assertContains(
    docs.remainingTime.text,
    docs.remainingTime.file,
    "5-10 minutes",
    failures,
  );
  assertContains(
    docs.remainingTime.text,
    docs.remainingTime.file,
    "15-30 minutes",
    failures,
  );
  for (const libraryAuditFile of [
    "LIBRARY_COMPLETION_AUDIT.md",
    "LIBRARY_TITLE_CONTENT_AUDIT.md",
    "LIBRARY_SOURCE_SPECIFICITY_AUDIT.md",
  ]) {
    assertContains(
      docs.runbook.text,
      docs.runbook.file,
      libraryAuditFile,
      failures,
    );
    assertContains(
      docs.audit.text,
      docs.audit.file,
      libraryAuditFile,
      failures,
    );
  }
  assertContains(
    docs.runbook.text,
    docs.runbook.file,
    "LIBRARY_REVIEW_QUEUE.md",
    failures,
  );
  assertContains(
    docs.audit.text,
    docs.audit.file,
    "LIBRARY_REVIEW_QUEUE.md",
    failures,
  );
  assertContains(
    docs.runbook.text,
    docs.runbook.file,
    "LIBRARY_REVIEW_SIGNOFF_LEDGER.md",
    failures,
  );
  assertContains(
    docs.audit.text,
    docs.audit.file,
    "LIBRARY_REVIEW_SIGNOFF_LEDGER.md",
    failures,
  );
  assertContains(
    docs.libraryReviewQueue.text,
    docs.libraryReviewQueue.file,
    "qualified-scholar",
    failures,
  );
  for (const term of [
    "Acceptance checklist:",
    "Evidence boundary:",
    "--stage qualified-scholar-review",
    "--stage source-relevance-review",
    "--stage editorial-review",
    "--stage quality-checklist",
    "--stage publish-approval",
    "qualifiedScholarReviewer, qualifiedScholarReviewedAt, scholarReviewScope, and scholarNotes",
    "source cards support the claims being made, not just that URLs are valid",
    "title, subtitle, description, and chapters match what the book actually teaches",
    "Every qualityChecklist field is true only after the reviewer explicitly clears that field",
    "approvedForPublication is true only after editorial review, source review, required scholar review",
    "does not create publication approval, whole-library approval, or final religious authority claims",
  ]) {
    assertContains(
      docs.libraryReviewBatches.text,
      docs.libraryReviewBatches.file,
      term,
      failures,
    );
  }
  const evidenceIntakeScript = read(
    "scripts/export-library-review-evidence-intake.ts",
  );
  const evidenceValidatorScript = read(
    "scripts/validate-library-review-evidence.ts",
  );
  for (const term of [
    "reviewScope",
    "selectedReviewStage",
    "REVIEW_STAGE_SCOPES",
    "completionBoundary",
    "Use reviewScope.stage to keep each reviewer focused",
  ]) {
    assertContains(
      evidenceIntakeScript,
      "scripts/export-library-review-evidence-intake.ts",
      term,
      failures,
    );
  }
  for (const term of [
    "validateReviewScope",
    "reviewScope.stage must be a known stage",
    "reviewScope.requiredFields must list the fields this reviewer is expected to complete",
    "reviewScope.acceptanceChecklist must carry at least three acceptance items",
  ]) {
    assertContains(
      evidenceValidatorScript,
      "scripts/validate-library-review-evidence.ts",
      term,
      failures,
    );
  }
  for (const term of [
    "First Pass Execution Order",
    "Canonical proof commands",
    "export:library-review-batches",
    "validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --strict --summary-json",
    "check:library-content-completion -- --summary-json",
  ]) {
    assertContains(
      docs.ownerActions.text,
      docs.ownerActions.file,
      term,
      failures,
    );
  }
  for (const [count, label] of [
    [librarySummary.bookCount, "Books"],
    [librarySummary.chapterCount, "Chapters"],
    [librarySummary.sourceRefCount, "Source references"],
    [
      librarySummary.sensitiveBookCount,
      "Books requiring qualified-scholar review",
    ],
    [
      librarySummary.booksWithReviewEvidenceCount,
      "Books with completed review evidence",
    ],
    [
      librarySummary.reviewPublicationBlockerCount,
      "Review/publication blockers remaining",
    ],
  ]) {
    assertContains(
      docs.libraryFinalReviewHandoff.text,
      docs.libraryFinalReviewHandoff.file,
      `${label}: ${count}`,
      failures,
    );
  }
  for (const [docKey, stalePatterns] of [
    ["runbook", [/all 45 book packets/i, /45 book packets/i, /45 books/i]],
    ["aiStatus", [/506 refs across 45 books/i, /45 books/i]],
    [
      "ummahAudit",
      [
        /all 45 books/i,
        /45 book review packets/i,
        /45 books/i,
        /196 chapters/i,
        /784 source refs/i,
        /10 also need qualified-scholar/i,
        /55 blockers/i,
      ],
    ],
    ["productRoadmap", [/all 45 books/i, /45 books/i]],
  ]) {
    const doc = docs[docKey];
    for (const pattern of stalePatterns) {
      if (pattern.test(doc.text)) {
        failures.push(
          `${doc.file} contains stale library count language matching ${pattern}.`,
        );
      }
    }
  }
  assertContains(
    docs.accountSessionPlan.text,
    docs.accountSessionPlan.file,
    `Prioritize the ${librarySummary.sensitiveBookCount} high-care books needing qualified-scholar review`,
    failures,
  );
  assertContains(
    docs.accountSessionPlan.text,
    docs.accountSessionPlan.file,
    `${librarySummary.planCounts?.free ?? "unknown"} free-plan trust-surface books`,
    failures,
  );
  assertContains(
    docs.accountSessionPlan.text,
    docs.accountSessionPlan.file,
    `current ${librarySummary.bookCount}-book Library audit`,
    failures,
  );
  for (const staleLibraryPriority of [
    "10 qualified-scholar books",
    "13 free trust-surface books",
  ]) {
    assertNotContains(
      docs.accountSessionPlan.text,
      docs.accountSessionPlan.file,
      staleLibraryPriority,
      failures,
    );
  }
  assertContains(
    docs.runbook.text,
    docs.runbook.file,
    `all ${librarySummary.bookCount} book packets`,
    failures,
  );
  assertContains(
    docs.aiStatus.text,
    docs.aiStatus.file,
    `checks ${librarySummary.sourceRefCount} refs across ${librarySummary.bookCount} books`,
    failures,
  );
  assertContains(
    docs.ummahAudit.text,
    docs.ummahAudit.file,
    `${librarySummary.sourceRefCount} source refs checked across ${librarySummary.bookCount} books`,
    failures,
  );
  assertContains(
    docs.ummahAudit.text,
    docs.ummahAudit.file,
    `${librarySummary.bookCount} books.`,
    failures,
  );
  assertContains(
    docs.ummahAudit.text,
    docs.ummahAudit.file,
    `${librarySummary.chapterCount} chapters.`,
    failures,
  );
  assertContains(
    docs.ummahAudit.text,
    docs.ummahAudit.file,
    `${librarySummary.blockerCount} blockers and 0 warnings`,
    failures,
  );
  assertContains(
    docs.productRoadmap.text,
    docs.productRoadmap.file,
    `all ${librarySummary.bookCount} books`,
    failures,
  );
  for (const term of [
    "Books ready for highest-standard claim: no",
    "LIBRARY_COMPLETION_AUDIT.md",
    "LIBRARY_TITLE_CONTENT_AUDIT.md",
    "LIBRARY_SOURCE_SPECIFICITY_AUDIT.md",
    "LIBRARY_REVIEW_SIGNOFF_LEDGER.md",
    "library-review-evidence.intake.json",
    "Halal Food and Everyday Choices",
    "Workplace Character for Muslims",
    "npm run check:release-handoff",
  ]) {
    assertContains(
      docs.libraryFinalReviewHandoff.text,
      docs.libraryFinalReviewHandoff.file,
      term,
      failures,
    );
  }
  assertContains(
    docs.runbook.text,
    docs.runbook.file,
    "HAJJ_UMRAH_REVIEW_PACKET.md",
    failures,
  );
  assertContains(
    docs.audit.text,
    docs.audit.file,
    "HAJJ_UMRAH_REVIEW_PACKET.md",
    failures,
  );
  assertContains(
    docs.hajjUmrahReviewPacket.text,
    docs.hajjUmrahReviewPacket.file,
    "hajj-and-umrah-preparation",
    failures,
  );
  assertContains(
    docs.hajjUmrahReviewPacket.text,
    docs.hajjUmrahReviewPacket.file,
    "Content hash",
    failures,
  );
  if (
    docs.ummahAudit.text.includes("LIBRARY_CONTENT_REVIEW_QUEUE.md") ||
    docs.runbook.text.includes("LIBRARY_CONTENT_REVIEW_QUEUE.md") ||
    docs.audit.text.includes("LIBRARY_CONTENT_REVIEW_QUEUE.md")
  ) {
    failures.push(
      "Release docs must point to current docs/audit/LIBRARY_REVIEW_QUEUE.md, not the obsolete LIBRARY_CONTENT_REVIEW_QUEUE.md artifact.",
    );
  }
  if (
    !docs.runbook.text.includes("Supabase") ||
    !docs.audit.text.includes("Supabase")
  ) {
    failures.push(
      "Release docs must retain Supabase production database evidence.",
    );
  }
  if (
    !docs.runbook.text.includes("OpenAI-only") ||
    !docs.audit.text.includes("OpenAI-only")
  ) {
    failures.push(
      "Release docs must describe the current OpenAI-only production AI scope.",
    );
  }
  for (const term of [
    "App Store Operator Handoff",
    "Share capture handoff",
    "maintainability runway",
    "logical slices",
    "focused check commands",
    "external blocker boundary",
    "merge policy",
    "post-release watch plan",
    "launch-day cadence",
    "deployed AI smoke watch",
    "production DB/migration watch",
    "crash/vitals watch",
    "accessibility retake watch",
    "Library review-drift watch",
    "Do not treat the exported handoff as production launch proof",
  ]) {
    assertContains(docs.runbook.text, docs.runbook.file, term, failures);
  }
  for (const term of [
    "NURAI_DEPLOYMENT_URL",
    "DATABASE_URL",
    "SESSION_SECRET",
    "NURAI_LOCAL_AI_BASE_URL",
    "NURAI_LOCAL_AI_API_KEY",
    "NURAI_LOCAL_TEXT_MODEL",
    "NURAI_LOCAL_AI_MODELS",
    "REVENUECAT_SECRET_API_KEY",
    "EXPO_PUBLIC_REVENUECAT_KEY",
    "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
    "GOOGLE_PLACES_API_KEY",
    "GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH",
  ]) {
    assertContains(docs.projectDoc.text, docs.projectDoc.file, term, failures);
  }
  if (failures.length) {
    console.error("Release handoff check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Release handoff check passed: ${blockedIds.length} external blocker(s) documented with production env/action coverage.`,
  );
}

main();
