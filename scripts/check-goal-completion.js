#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  GATE_REQUIREMENTS,
  SCHEMA_VERSION: RELEASE_EXTERNAL_EVIDENCE_SCHEMA_VERSION,
} = require("./lib/releaseExternalEvidenceRequirements");

const root = process.cwd();
const wantsJson =
  process.argv.includes("--json") || process.argv.includes("--summary-json");
const shouldCheckReleaseRemainingTime =
  process.env.NURAI_SKIP_RELEASE_REMAINING_TIME_CHECK !== "1";
const shouldCheckReleaseHandoffArtifacts =
  process.env.NURAI_SKIP_RELEASE_HANDOFF_ARTIFACT_CHECK !== "1";
const shouldCheckReleaseCockpit =
  process.env.NURAI_SKIP_RELEASE_COCKPIT_CHECK !== "1";

const requiredDocs = [
  "docs/release/PRODUCTION_RELEASE_RUNBOOK.md",
  "docs/audit/RELEASE_COMPLETION_AUDIT.md",
  "docs/audit/AI_RELEASE_STATUS.md",
  "docs/audit/UMMAH_APP_RELEASE_AND_RESEARCH_AUDIT.md",
  "docs/audit/RELEASE_ACCOUNT_BROWSER_OBSERVATIONS.md",
  "docs/audit/RELEASE_OWNER_ACTIONS.md",
  "docs/audit/RELEASE_ACCOUNT_SESSION_PLAN.md",
  "docs/audit/RELEASE_COCKPIT.md",
  "docs/audit/RELEASE_BLOCKER_EVIDENCE.md",
  "docs/audit/RELEASE_REMAINING_TIME.md",
  "docs/audit/release-external-evidence.intake.json",
  "docs/audit/PRODUCTION_SECRET_CHECKLIST.md",
  "docs/audit/AI_SOURCE_PACK_REVIEW_HANDOFF.md",
  "docs/audit/tafsir-source-review-evidence.intake.json",
  "docs/audit/hadith-source-review-evidence.intake.json",
  "docs/audit/fiqh-source-review-evidence.intake.json",
  "docs/audit/seerah-source-review-evidence.intake.json",
  "docs/audit/LIBRARY_COMPLETION_AUDIT.md",
  "docs/audit/LIBRARY_TITLE_CONTENT_AUDIT.md",
  "docs/audit/LIBRARY_SOURCE_SPECIFICITY_AUDIT.md",
  "docs/audit/LIBRARY_REVIEW_QUEUE.md",
  "docs/audit/LIBRARY_REVIEW_BATCHES.md",
  "docs/audit/LIBRARY_REVIEW_SIGNOFF_LEDGER.md",
  "docs/audit/HAJJ_UMRAH_REVIEW_PACKET.md",
  "docs/audit/nurai-generated-artifact-summary.md",
  ".env.production.example",
];

function parseJsonOutput(label, result) {
  const stdout = (result.stdout || "").trim();
  if (!stdout) {
    throw new Error(
      `${label} did not emit JSON. exitCode=${result.status}; stderr=${(
        result.stderr || ""
      ).trim()}`,
    );
  }

  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `${label} emitted invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function runJson(label, command, args, envOverrides = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...envOverrides },
  });
  return {
    exitCode: result.status ?? 1,
    signal: result.signal,
    json: parseJsonOutput(label, result),
  };
}

function runReleaseOwnerActionsCheck(goalReport) {
  return runJson(
    "export-release-owner-actions",
    process.execPath,
    ["scripts/export-release-owner-actions.js", "--check", "--summary-json"],
    {
      NURAI_SKIP_RELEASE_HANDOFF_ARTIFACT_CHECK: "1",
      NURAI_GOAL_COMPLETION_REPORT_JSON: JSON.stringify(goalReport),
    },
  );
}

function runReleaseAccountSessionPlanCheck(goalReport) {
  return runJson(
    "export-release-account-session-plan",
    process.execPath,
    [
      "scripts/export-release-account-session-plan.js",
      "--check",
      "--summary-json",
    ],
    {
      NURAI_SKIP_RELEASE_HANDOFF_ARTIFACT_CHECK: "1",
      NURAI_GOAL_COMPLETION_REPORT_JSON: JSON.stringify(goalReport),
    },
  );
}

function runReleaseCockpitCheck(goalReport) {
  return runJson(
    "export-release-cockpit",
    process.execPath,
    ["scripts/export-release-cockpit.js", "--check", "--summary-json"],
    {
      NURAI_SKIP_RELEASE_COCKPIT_CHECK: "1",
      NURAI_GOAL_COMPLETION_REPORT_JSON: JSON.stringify(goalReport),
    },
  );
}

function runReleaseBlockers() {
  return runJson("check-release-blockers", process.execPath, [
    "scripts/check-release-blockers.js",
    "--json",
  ]);
}

function runLibraryCompletion() {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return runJson("check-library-content-completion", npx, [
    "tsx",
    "scripts/check-library-content-completion.ts",
    "--summary-json",
  ]);
}

function runLibraryCompletionAuditCheck() {
  return runJson("export-library-completion-audit", process.execPath, [
    "scripts/export-library-completion-audit.js",
    "--check",
    "--summary-json",
  ]);
}

function runLibraryTitleContentAudit() {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return runJson("export-library-title-content-audit", npx, [
    "tsx",
    "scripts/export-library-title-content-audit.ts",
    "--check",
    "--summary-json",
  ]);
}

function runLibrarySourceSpecificityAuditCheck() {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return runJson("export-library-source-specificity-audit", npx, [
    "tsx",
    "scripts/export-library-source-specificity-audit.ts",
    "--check",
    "--summary-json",
  ]);
}

function runLibraryReviewSignoffLedgerCheck() {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return runJson("export-library-review-signoff-ledger", npx, [
    "tsx",
    "scripts/export-library-review-signoff-ledger.ts",
    "--check",
    "--summary-json",
  ]);
}

function runLibraryReviewBatchesCheck() {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return runJson("export-library-review-batches", npx, [
    "tsx",
    "scripts/export-library-review-batches.ts",
    "--check",
    "--summary-json",
  ]);
}

function runLibraryReviewPacketsCheck() {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return runJson("export-library-review-packets", npx, [
    "tsx",
    "scripts/export-library-review-packets.ts",
    "--check",
    "--summary-json",
    "--all",
  ]);
}

function runHajjUmrahReviewPacketCheck() {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return runJson("export-library-review-packet", npx, [
    "tsx",
    "scripts/export-library-review-packet.ts",
    "--book-id",
    "hajj-and-umrah-preparation",
    "--check",
    "--summary-json",
  ]);
}

function runReleaseExternalEvidenceValidation() {
  return runJson("validate-release-external-evidence", process.execPath, [
    "scripts/validate-release-external-evidence.js",
    "--summary-json",
  ]);
}

function runReleaseBlockerEvidenceCheck() {
  return runJson("export-release-blocker-evidence", process.execPath, [
    "scripts/export-release-blocker-evidence.js",
    "--check",
    "--summary-json",
  ]);
}

function runReleaseExternalEvidenceIntakeCheck() {
  return runJson("export-release-external-evidence-intake", process.execPath, [
    "scripts/export-release-external-evidence-intake.js",
    "--check",
    "--summary-json",
  ]);
}

function runProductionSecretChecklistCheck() {
  return runJson("export-production-secret-checklist", process.execPath, [
    "scripts/export-production-secret-checklist.js",
    "--check",
    "--summary-json",
  ]);
}

function runGeneratedArtifactSummaryCheck() {
  return runJson("check-generated-artifact-summary", process.execPath, [
    "scripts/export-logical-change-slices.js",
    "--artifact-summary",
    "--check",
    "--summary-json",
  ]);
}

function runReleaseRemainingTimeCheck() {
  return runJson(
    "export-release-remaining-time",
    process.execPath,
    ["scripts/export-release-remaining-time.js", "--check", "--summary-json"],
    { NURAI_SKIP_RELEASE_HANDOFF_ARTIFACT_CHECK: "1" },
  );
}

function runSourcePackFinalReadiness() {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return runJson("check-source-pack-final-readiness", npx, [
    "tsx",
    "scripts/check-source-pack-final-readiness.ts",
    "--summary-json",
  ]);
}

function runHumanReviewFinalReadiness() {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return runJson("check-human-review-final-readiness", npx, [
    "tsx",
    "scripts/check-human-review-final-readiness.ts",
    "--summary-json",
  ]);
}

function runSourcePackReviewWorkflowCheck() {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return runJson("check-source-pack-review-workflow", npx, [
    "tsx",
    "scripts/check-source-pack-review-workflow.ts",
  ]);
}

function runSourcePackReviewHandoffCheck() {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return runJson("export-source-pack-review-handoff", npx, [
    "tsx",
    "scripts/export-source-pack-review-handoff.ts",
    "--check",
    "--summary-json",
  ]);
}

function runSourcePackDomainArtifactCheck(domain) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const packets = runJson(`export-${domain}-review-packets`, npx, [
    "tsx",
    `scripts/export-${domain}-review-packets.ts`,
    "--check",
    "--summary-json",
  ]);
  const intake = runJson(`export-${domain}-review-evidence-intake`, npx, [
    "tsx",
    `scripts/export-${domain}-review-evidence-intake.ts`,
    "--check",
    "--summary-json",
  ]);
  const validation = runJson(`validate-${domain}-review-evidence`, npx, [
    "tsx",
    `scripts/validate-${domain}-review-evidence.ts`,
    "--summary-json",
  ]);
  return { packets, intake, validation };
}

function checkDocs() {
  return requiredDocs.map((relativePath) => {
    const fullPath = path.join(root, relativePath);
    return {
      path: relativePath,
      present: fs.existsSync(fullPath),
    };
  });
}

function checkActionDocCoverage(actionIds) {
  const fullPath = path.join(
    root,
    "docs/audit/RELEASE_ACCOUNT_SESSION_PLAN.md",
  );
  if (!fs.existsSync(fullPath)) return actionIds;
  const text = fs.readFileSync(fullPath, "utf8");
  return actionIds.filter(
    (id) => !text.includes(`\`${id}\``) && !text.includes(id),
  );
}

function canonicalExternalGateDetail(gateId) {
  const requirement = GATE_REQUIREMENTS[gateId];
  if (!requirement) {
    return {
      title: "",
      requiredEvidence: [],
      acceptanceChecklist: [],
      noSecretBoundary: "",
      verificationCommands: ["npm run check:release-blockers -- --json"],
      evidenceSchemaVersion: RELEASE_EXTERNAL_EVIDENCE_SCHEMA_VERSION,
    };
  }

  return {
    title: requirement.title,
    requiredEvidence: requirement.requiredEvidence.slice(),
    acceptanceChecklist: requirement.acceptanceChecklist.slice(),
    noSecretBoundary: requirement.noSecretBoundary,
    verificationCommands: requirement.verificationCommands.slice(),
    evidenceSchemaVersion: RELEASE_EXTERNAL_EVIDENCE_SCHEMA_VERSION,
  };
}

function main() {
  const failures = [];
  let release;
  let externalEvidence;
  let releaseBlockerEvidence;
  let releaseExternalEvidenceIntake;
  let productionSecretChecklist;
  let generatedArtifactSummary;
  let releaseOwnerActions;
  let releaseAccountSessionPlan;
  let releaseCockpit;
  let releaseRemainingTime;
  let sourcePackFinalReadiness;
  let humanReviewFinalReadiness;
  let sourcePackReviewWorkflow;
  let sourcePackReviewHandoff;
  const sourcePackDomainArtifacts = {};
  let library;
  let completionAudit;
  let titleContentAudit;
  let sourceSpecificityAudit;
  let reviewBatches;
  let signoffLedger;
  let reviewPackets;
  let hajjUmrahReviewPacket;

  try {
    release = runReleaseBlockers();
  } catch (error) {
    failures.push(
      error instanceof Error ? error.message : `Release check failed: ${error}`,
    );
  }

  try {
    externalEvidence = runReleaseExternalEvidenceValidation();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `External evidence validation failed: ${error}`,
    );
  }

  try {
    releaseBlockerEvidence = runReleaseBlockerEvidenceCheck();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Release blocker evidence check failed: ${error}`,
    );
  }

  try {
    releaseExternalEvidenceIntake = runReleaseExternalEvidenceIntakeCheck();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Release external evidence intake check failed: ${error}`,
    );
  }

  try {
    productionSecretChecklist = runProductionSecretChecklistCheck();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Production secret checklist check failed: ${error}`,
    );
  }

  try {
    generatedArtifactSummary = runGeneratedArtifactSummaryCheck();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Generated artifact summary check failed: ${error}`,
    );
  }

  if (shouldCheckReleaseRemainingTime) {
    try {
      releaseRemainingTime = runReleaseRemainingTimeCheck();
    } catch (error) {
      failures.push(
        error instanceof Error
          ? error.message
          : `Release remaining-time check failed: ${error}`,
      );
    }
  }

  try {
    sourcePackFinalReadiness = runSourcePackFinalReadiness();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Source-pack final readiness check failed: ${error}`,
    );
  }

  try {
    humanReviewFinalReadiness = runHumanReviewFinalReadiness();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Human-review final readiness check failed: ${error}`,
    );
  }

  try {
    sourcePackReviewWorkflow = runSourcePackReviewWorkflowCheck();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Source-pack review workflow check failed: ${error}`,
    );
  }

  try {
    sourcePackReviewHandoff = runSourcePackReviewHandoffCheck();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Source-pack review handoff check failed: ${error}`,
    );
  }

  for (const domain of ["tafsir", "hadith", "fiqh", "seerah"]) {
    try {
      sourcePackDomainArtifacts[domain] =
        runSourcePackDomainArtifactCheck(domain);
    } catch (error) {
      failures.push(
        error instanceof Error
          ? error.message
          : `${domain} source-pack artifact check failed: ${error}`,
      );
    }
  }

  try {
    library = runLibraryCompletion();
  } catch (error) {
    failures.push(
      error instanceof Error ? error.message : `Library check failed: ${error}`,
    );
  }

  try {
    completionAudit = runLibraryCompletionAuditCheck();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Library completion audit failed: ${error}`,
    );
  }

  try {
    titleContentAudit = runLibraryTitleContentAudit();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Library title/content audit failed: ${error}`,
    );
  }

  try {
    sourceSpecificityAudit = runLibrarySourceSpecificityAuditCheck();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Library source-specificity audit failed: ${error}`,
    );
  }

  try {
    reviewBatches = runLibraryReviewBatchesCheck();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Library review batches failed: ${error}`,
    );
  }

  try {
    signoffLedger = runLibraryReviewSignoffLedgerCheck();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Library review sign-off ledger failed: ${error}`,
    );
  }

  try {
    reviewPackets = runLibraryReviewPacketsCheck();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Library review packets failed: ${error}`,
    );
  }

  try {
    hajjUmrahReviewPacket = runHajjUmrahReviewPacketCheck();
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message
        : `Hajj/Umrah review packet failed: ${error}`,
    );
  }

  const docs = checkDocs();
  const missingDocs = docs.filter((doc) => !doc.present).map((doc) => doc.path);
  if (missingDocs.length) {
    failures.push(`Missing release evidence docs: ${missingDocs.join(", ")}`);
  }

  const blocked = release?.json?.blocked || [];
  const blockedIds = blocked.map((blocker) => blocker.id);
  const externalActionDetails = blocked.map((blocker) => ({
    id: blocker.id,
    message: blocker.message,
    ownerAction: Array.isArray(blocker.ownerAction) ? blocker.ownerAction : [],
    ...canonicalExternalGateDetail(blocker.id),
  }));
  const externalBlockerCount =
    typeof release?.json?.blockerCount === "number"
      ? release.json.blockerCount
      : blockedIds.length;
  const externalEvidenceSummary = externalEvidence?.json || null;
  const externalEvidenceReady =
    externalEvidence?.exitCode === 0 &&
    Boolean(externalEvidenceSummary?.valid) &&
    Boolean(externalEvidenceSummary?.readyForExternalReleaseClaim);
  const externalEvidenceActionNeeded =
    externalBlockerCount === 0 && !externalEvidenceReady;
  const releaseBlockerEvidenceSummary = releaseBlockerEvidence?.json || null;
  const releaseBlockerEvidenceCurrent =
    releaseBlockerEvidence?.exitCode === 0 &&
    Boolean(releaseBlockerEvidenceSummary?.ok);
  const releaseExternalEvidenceIntakeSummary =
    releaseExternalEvidenceIntake?.json || null;
  const releaseExternalEvidenceIntakeCurrent =
    releaseExternalEvidenceIntake?.exitCode === 0 &&
    Boolean(releaseExternalEvidenceIntakeSummary?.ok);
  const productionSecretChecklistSummary =
    productionSecretChecklist?.json || null;
  const productionSecretChecklistCurrent =
    productionSecretChecklist?.exitCode === 0 &&
    Boolean(productionSecretChecklistSummary?.ok);
  const generatedArtifactSummaryReport = generatedArtifactSummary?.json || null;
  const generatedArtifactSummaryCurrent =
    generatedArtifactSummary?.exitCode === 0 &&
    Boolean(generatedArtifactSummaryReport?.ok) &&
    generatedArtifactSummaryReport?.stageable === false &&
    generatedArtifactSummaryReport?.releaseProof === false &&
    generatedArtifactSummaryReport?.ownerApprovalRequired === true &&
    generatedArtifactSummaryReport?.normalPathsCommandRefusesWithoutAllowGenerated ===
      true;
  const releaseEvidenceArtifactsCurrent =
    releaseBlockerEvidenceCurrent &&
    releaseExternalEvidenceIntakeCurrent &&
    productionSecretChecklistCurrent;
  const releaseRemainingTimeSummary = releaseRemainingTime?.json || null;
  const releaseRemainingTimeCurrent =
    !shouldCheckReleaseRemainingTime ||
    (releaseRemainingTime?.exitCode === 0 &&
      Boolean(releaseRemainingTimeSummary?.ok));
  const sourcePackSummary = sourcePackFinalReadiness?.json || null;
  const sourcePackReady =
    sourcePackFinalReadiness?.exitCode === 0 &&
    Boolean(sourcePackSummary?.ok) &&
    Boolean(sourcePackSummary?.readyForSourcePackActivationClaim);
  const humanReviewSummary = humanReviewFinalReadiness?.json || null;
  const humanReviewReady =
    humanReviewFinalReadiness?.exitCode === 0 &&
    Boolean(humanReviewSummary?.ok) &&
    Boolean(humanReviewSummary?.readyForHumanReviewClaims);
  const sourcePackWorkflowSummary = sourcePackReviewWorkflow?.json || null;
  const sourcePackWorkflowCurrent =
    sourcePackReviewWorkflow?.exitCode === 0 &&
    Boolean(sourcePackWorkflowSummary?.ok);
  const sourcePackHandoffSummary = sourcePackReviewHandoff?.json || null;
  const sourcePackHandoffCurrent =
    sourcePackReviewHandoff?.exitCode === 0 &&
    Boolean(sourcePackHandoffSummary?.ok);
  const sourcePackDomainArtifactSummaries = Object.fromEntries(
    Object.entries(sourcePackDomainArtifacts).map(([domain, checks]) => {
      const packets = checks.packets?.json || null;
      const intake = checks.intake?.json || null;
      const validation = checks.validation?.json || null;
      return [
        domain,
        {
          current:
            checks.packets?.exitCode === 0 &&
            Boolean(packets?.ok) &&
            checks.intake?.exitCode === 0 &&
            Boolean(intake?.ok) &&
            checks.validation?.exitCode === 0 &&
            Boolean(validation?.valid),
          packets,
          intake,
          validation,
        },
      ];
    }),
  );
  const sourcePackArtifactsCurrent =
    sourcePackWorkflowCurrent &&
    sourcePackHandoffCurrent &&
    Object.keys(sourcePackDomainArtifactSummaries).length === 4 &&
    Object.values(sourcePackDomainArtifactSummaries).every((domain) =>
      Boolean(domain.current),
    );
  const librarySummary = library?.json || null;
  const libraryReady =
    Boolean(librarySummary?.ok) &&
    Boolean(librarySummary?.readyForHighestStandardClaim);
  const completionAuditSummary = completionAudit?.json || null;
  const completionAuditCurrent =
    completionAudit?.exitCode === 0 && Boolean(completionAuditSummary?.ok);
  const titleAuditSummary = titleContentAudit?.json?.summary || null;
  const titleAuditCurrent =
    titleContentAudit?.exitCode === 0 && Boolean(titleContentAudit?.json?.ok);
  const titleAuditReady =
    titleAuditCurrent &&
    Boolean(titleAuditSummary?.ok) &&
    Boolean(titleAuditSummary?.readyForHighestStandardClaim);
  const sourceSpecificityAuditSummary = sourceSpecificityAudit?.json || null;
  const sourceSpecificityAuditCurrent =
    sourceSpecificityAudit?.exitCode === 0 &&
    Boolean(sourceSpecificityAuditSummary?.ok);
  const reviewBatchesSummary = reviewBatches?.json || null;
  const reviewBatchesCurrent =
    reviewBatches?.exitCode === 0 && Boolean(reviewBatchesSummary?.ok);
  const signoffLedgerSummary = signoffLedger?.json || null;
  const signoffLedgerCurrent =
    signoffLedger?.exitCode === 0 && Boolean(signoffLedgerSummary?.ok);
  const reviewPacketsSummary = reviewPackets?.json || null;
  const reviewPacketsCurrent =
    reviewPackets?.exitCode === 0 && Boolean(reviewPacketsSummary?.ok);
  const hajjUmrahReviewPacketSummary = hajjUmrahReviewPacket?.json || null;
  const hajjUmrahReviewPacketCurrent =
    hajjUmrahReviewPacket?.exitCode === 0 &&
    Boolean(hajjUmrahReviewPacketSummary?.ok);
  const libraryAuditArtifactsCurrent =
    completionAuditCurrent &&
    titleAuditCurrent &&
    sourceSpecificityAuditCurrent &&
    reviewBatchesCurrent &&
    signoffLedgerCurrent &&
    reviewPacketsCurrent &&
    hajjUmrahReviewPacketCurrent;

  if (releaseRemainingTime && !releaseRemainingTimeCurrent) {
    failures.push(
      `Release remaining-time artifact is not current: ${(releaseRemainingTimeSummary?.findings || []).join("; ") || "run npm run export:release-remaining-time -- --write"}`,
    );
  }

  if (releaseBlockerEvidence && !releaseBlockerEvidenceCurrent) {
    failures.push(
      `Release blocker evidence artifact is not current: ${(releaseBlockerEvidenceSummary?.findings || []).join("; ") || "run npm run export:release-blocker-evidence -- --write"}`,
    );
  }
  if (releaseExternalEvidenceIntake && !releaseExternalEvidenceIntakeCurrent) {
    failures.push(
      `Release external evidence intake artifact is not current: ${(releaseExternalEvidenceIntakeSummary?.findings || []).join("; ") || "run npm run export:release-external-evidence-intake -- --write"}`,
    );
  }
  if (productionSecretChecklist && !productionSecretChecklistCurrent) {
    failures.push(
      `Production secret checklist artifact is not current: ${(productionSecretChecklistSummary?.findings || []).join("; ") || "run npm run export:production-secret-checklist -- --write"}`,
    );
  }
  if (generatedArtifactSummary && !generatedArtifactSummaryCurrent) {
    failures.push(
      `Generated artifact summary is not current or not enforcing non-stageable artifact boundaries: ${(generatedArtifactSummaryReport?.findings || []).join("; ") || "run npm run export:generated-artifact-summary -- --write"}`,
    );
  }
  if (sourcePackReviewWorkflow && !sourcePackWorkflowCurrent) {
    failures.push(
      `Source-pack review workflow is not current: ${(sourcePackWorkflowSummary?.findings || []).join("; ") || "run npm run check:source-pack-review-workflow"}`,
    );
  }
  if (sourcePackReviewHandoff && !sourcePackHandoffCurrent) {
    failures.push(
      `Source-pack review handoff is not current: ${(sourcePackHandoffSummary?.findings || []).join("; ") || "run npm run export:source-pack-review-handoff -- --write"}`,
    );
  }
  for (const [domain, summary] of Object.entries(
    sourcePackDomainArtifactSummaries,
  )) {
    if (!summary.current) {
      const packetFindings = summary.packets?.findings || [];
      const intakeFindings = summary.intake?.findings || [];
      const validationFindings = summary.validation?.findings || [];
      failures.push(
        `${domain} source-pack artifacts are not current: ${
          [...packetFindings, ...intakeFindings, ...validationFindings].join(
            "; ",
          ) ||
          `run npm run export:${domain}-review-packets -- --write and npm run export:${domain}-review-evidence-intake -- --write`
        }`,
      );
    }
  }

  if (completionAudit && !completionAuditCurrent) {
    failures.push(
      `Library completion audit artifact is not current: ${(completionAuditSummary?.findings || []).join("; ") || "run npm run export:library-completion-audit -- --write"}`,
    );
  }
  if (titleContentAudit && !titleAuditCurrent) {
    failures.push(
      `Library title/content audit artifact is not current: ${(titleContentAudit?.json?.findings || []).join("; ") || "run npm run export:library-title-content-audit -- --write"}`,
    );
  }
  if (sourceSpecificityAudit && !sourceSpecificityAuditCurrent) {
    failures.push(
      `Library source-specificity audit artifact is not current: ${(sourceSpecificityAuditSummary?.findings || []).join("; ") || "run npm run export:library-source-specificity-audit -- --write"}`,
    );
  }
  if (reviewBatches && !reviewBatchesCurrent) {
    failures.push(
      `Library review batches artifact is not current: ${(reviewBatchesSummary?.findings || []).join("; ") || "run npm run export:library-review-batches -- --write"}`,
    );
  }
  if (signoffLedger && !signoffLedgerCurrent) {
    failures.push(
      `Library review sign-off ledger artifact is not current: ${(signoffLedgerSummary?.findings || []).join("; ") || "run npm run export:library-review-signoff-ledger -- --write"}`,
    );
  }
  if (reviewPackets && !reviewPacketsCurrent) {
    failures.push(
      `Library review packet artifacts are not current: ${(reviewPacketsSummary?.findings || []).join("; ") || "run npm run export:library-review-packets -- --all"}`,
    );
  }
  if (hajjUmrahReviewPacket && !hajjUmrahReviewPacketCurrent) {
    failures.push(
      `Hajj/Umrah review packet artifact is not current: ${(hajjUmrahReviewPacketSummary?.findings || []).join("; ") || "run npm run export:library-review-packet -- --book-id hajj-and-umrah-preparation --write"}`,
    );
  }

  const nextRequiredActions = blockedIds.concat(
    externalEvidenceActionNeeded
      ? ["external-release-evidence-validation"]
      : [],
    sourcePackReady ? [] : ["source-pack-activation-readiness"],
    libraryReady && titleAuditReady ? [] : ["library-content-completion"],
  );
  const sourcePackOwnerActions = [
    "Complete real tafsir, hadith, fiqh, and seerah source-card review evidence outside the repo using the current hash-bound intake files.",
    "Keep all draft source cards inactive until every domain passes --require-approved validation with reviewer names, qualifications, licensing evidence, activation notes, and reviewed explanation text.",
    "Run the final readiness command with the completed evidence files and confirm every domain validates, dry-runs activation without writing, and reports zero secret-like evidence values.",
    "Only after final readiness passes, inspect the dry-run diff and use the relevant apply:*review-evidence -- --write --confirm-source-pack-activation command.",
    "Do not claim source packs are verified, reviewed by qualified scholars, or active in NurAI answers until check:source-pack-final-readiness passes on real evidence.",
  ];
  const libraryWarningCount = Number(librarySummary?.warningCount || 0);
  const libraryOwnerActions = [
    "Complete final editorial review, source relevance review, publication quality checklist, qualified scholar review for sensitive books, and publish-status decisions.",
    libraryWarningCount > 0
      ? "Clear source-specificity warnings so every chapter has source cards reviewed for chapter-specific relevance, not only valid URLs or broad shared anchors."
      : "Keep source-specificity warning counts at 0 while human reviewers confirm every chapter's source cards are relevant, not only valid URLs.",
    "Only mark books published after the relevant review evidence exists with approvedForPublication true, the current contentHash, completed qualityChecklist fields, real reviewer names, dates, and notes.",
    "Use npm run export:library-title-content-audit -- --write to review title/subtitle/description/chapter/source promise coverage before final sign-off.",
    "Run npm run check:library-content-completion, npm run export:library-title-content-audit -- --check --summary-json, and npm run check:goal-completion.",
  ];
  const nextActionDetails = externalActionDetails.concat(
    externalEvidenceActionNeeded
      ? [
          {
            id: "external-release-evidence-validation",
            message:
              "External release gates have to be backed by real non-secret proof before the update can be called finished.",
            evidenceSchemaVersion: RELEASE_EXTERNAL_EVIDENCE_SCHEMA_VERSION,
            ownerAction: [
              "Regenerate docs/audit/release-external-evidence.intake.json after the five external gates pass.",
              "Fill verified=true, verifiedAt, verifiedBy, nonSecretProofNotes, and passing command results for every listed verification command without pasting secrets.",
              "Run npm run validate:release-external-evidence -- --summary-json and npm run check:goal-completion.",
            ],
            acceptanceChecklist: [
              "Every external gate record keeps its canonical acceptanceChecklist and noSecretBoundary from scripts/lib/releaseExternalEvidenceRequirements.js.",
              "Every listed verification command has a passing redacted command-result block with a non-placeholder note.",
              "validate:release-external-evidence reports readyForExternalReleaseClaim true without allow-current-blockers.",
            ],
            noSecretBoundary:
              "Do not paste production credentials, API keys, service-role keys, smoke secrets, session cookies, private account payloads, or raw connection strings into the intake.",
            verificationCommands: [
              "npm run export:release-external-evidence-intake -- --check --summary-json",
              "npm run validate:release-external-evidence -- --summary-json",
              "npm run check:goal-completion -- --summary-json",
            ],
          },
        ]
      : [],
    sourcePackReady
      ? []
      : [
          {
            id: "source-pack-activation-readiness",
            message:
              "AI tafsir, hadith, fiqh, and seerah source packs cannot be claimed verified or activation-ready until real reviewer evidence passes the final source-pack readiness gate.",
            ownerAction: sourcePackOwnerActions,
            acceptanceChecklist: [
              "Every current draft card for tafsir, hadith, fiqh, and seerah is represented exactly once in completed evidence.",
              "Every completed evidence file passes the domain validator with --require-approved.",
              "Final readiness reports no secret-like API keys, auth headers, cookies, database URLs, JWTs, or private keys.",
              "Each domain activation importer dry-runs successfully without --write or --confirm-source-pack-activation.",
            ],
            noSecretBoundary:
              "Do not record API keys, reviewer private contact data, Authorization headers, cookies, database URLs, private keys, JWTs, or copied source text in source-pack evidence.",
            verificationCommands: [
              "npm run check:source-pack-final-readiness -- --summary-json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
              "npm run check:ai-source-catalog",
              "npm run check:goal-completion -- --summary-json",
            ],
          },
        ],
    libraryReady && titleAuditReady
      ? []
      : [
          {
            id: "library-content-completion",
            message:
              "The in-app books cannot be claimed as fully reviewed, published, or highest-standard complete until the strict content-completion gate passes.",
            ownerAction: libraryOwnerActions,
          },
        ],
  );

  const handoffGoalReport = {
    ok:
      failures.length === 0 &&
      externalBlockerCount === 0 &&
      externalEvidenceReady === true &&
      releaseEvidenceArtifactsCurrent === true &&
      generatedArtifactSummaryCurrent === true &&
      releaseRemainingTimeCurrent === true &&
      sourcePackArtifactsCurrent === true &&
      sourcePackReady === true &&
      humanReviewReady === true &&
      libraryReady === true &&
      libraryAuditArtifactsCurrent === true &&
      titleAuditReady === true,
    externalRelease: release
      ? {
          ok: Boolean(release.json.ok),
          blockerCount: externalBlockerCount,
          blockedIds,
          actionDetails: externalActionDetails,
          okChecks: release.json.okChecks || [],
          packageScriptsChecked: release.json.packageScriptsChecked,
          releaseControlScriptsChecked:
            release.json.releaseControlScriptsChecked,
          migrationFilesChecked: release.json.migrationFilesChecked,
        }
      : null,
    releaseExternalEvidence: externalEvidenceSummary
      ? {
          schemaVersion: RELEASE_EXTERNAL_EVIDENCE_SCHEMA_VERSION,
          valid: Boolean(externalEvidenceSummary.valid),
          readyForExternalReleaseClaim: Boolean(
            externalEvidenceSummary.readyForExternalReleaseClaim,
          ),
          recordCount: externalEvidenceSummary.recordCount,
          currentBlockedExternalGateCount:
            externalEvidenceSummary.currentBlockedExternalGateCount,
          blockerCount: externalEvidenceSummary.blockerCount,
          findings: externalEvidenceSummary.findings || [],
        }
      : null,
    sourcePackFinalReadiness: sourcePackSummary
      ? {
          ok: Boolean(sourcePackSummary.ok),
          readyForSourcePackActivationClaim: Boolean(
            sourcePackSummary.readyForSourcePackActivationClaim,
          ),
          domainCount: sourcePackSummary.domainCount,
          draftCardCount: sourcePackSummary.draftCardCount,
          verifiedCardCount: sourcePackSummary.verifiedCardCount,
          approvedDraftCardCount: sourcePackSummary.approvedDraftCardCount,
          secretLikeFindingCount: sourcePackSummary.secretLikeFindingCount,
          blockerCount: sourcePackSummary.blockerCount,
        }
      : null,
    humanReviewFinalReadiness: humanReviewSummary
      ? {
          ok: Boolean(humanReviewSummary.ok),
          readyForHumanReviewClaims: Boolean(
            humanReviewSummary.readyForHumanReviewClaims,
          ),
          releaseProof: Boolean(humanReviewSummary.releaseProof),
          blockerCount: humanReviewSummary.blockerCount,
          nextRequiredActions: humanReviewSummary.nextRequiredActions || [],
        }
      : null,
    libraryCompletion: librarySummary
      ? {
          ok: Boolean(librarySummary.ok),
          readyForHighestStandardClaim: Boolean(
            librarySummary.readyForHighestStandardClaim,
          ),
          bookCount: librarySummary.bookCount,
          chapterCount: librarySummary.chapterCount,
          sourceRefCount: librarySummary.sourceRefCount,
          booksWithReviewEvidenceCount:
            librarySummary.booksWithReviewEvidenceCount,
          blockerCount: librarySummary.blockerCount,
          warningCount: librarySummary.warningCount,
          sensitiveBookCount: librarySummary.sensitiveBookCount,
          planCounts: librarySummary.planCounts,
        }
      : null,
    libraryAuditArtifacts: {
      reviewBatches: reviewBatchesSummary
        ? {
            current: reviewBatchesCurrent,
            outPath: reviewBatchesSummary.outPath,
            batchCount: reviewBatchesSummary.summary?.batchCount,
            pendingBookCount: reviewBatchesSummary.summary?.pendingBookCount,
            sensitivePendingBookCount:
              reviewBatchesSummary.summary?.sensitivePendingBookCount,
            missingEvidenceCount:
              reviewBatchesSummary.summary?.missingEvidenceCount,
            nextBatchId: reviewBatchesSummary.summary?.nextBatchId,
            nextBatchTitle: reviewBatchesSummary.summary?.nextBatchTitle,
            nextBatchHash: reviewBatchesSummary.summary?.nextBatchHash,
            batchHashes: reviewBatchesSummary.summary?.batchHashes,
            findings: reviewBatchesSummary.findings || [],
          }
        : null,
    },
    nextRequiredActions,
    nextActionDetails,
  };

  if (shouldCheckReleaseHandoffArtifacts) {
    try {
      releaseOwnerActions = runReleaseOwnerActionsCheck(handoffGoalReport);
    } catch (error) {
      failures.push(
        error instanceof Error
          ? error.message
          : `Release owner-action handoff check failed: ${error}`,
      );
    }

    try {
      releaseAccountSessionPlan =
        runReleaseAccountSessionPlanCheck(handoffGoalReport);
    } catch (error) {
      failures.push(
        error instanceof Error
          ? error.message
          : `Release account-session plan check failed: ${error}`,
      );
    }

    if (shouldCheckReleaseCockpit) {
      try {
        releaseCockpit = runReleaseCockpitCheck(handoffGoalReport);
      } catch (error) {
        failures.push(
          error instanceof Error
            ? error.message
            : `Release cockpit check failed: ${error}`,
        );
      }
    }
  }

  const releaseOwnerActionsSummary = releaseOwnerActions?.json || null;
  const releaseOwnerActionsCurrent =
    !shouldCheckReleaseHandoffArtifacts ||
    (releaseOwnerActions?.exitCode === 0 &&
      Boolean(releaseOwnerActionsSummary?.ok));
  const releaseAccountSessionPlanSummary =
    releaseAccountSessionPlan?.json || null;
  const releaseAccountSessionPlanCurrent =
    !shouldCheckReleaseHandoffArtifacts ||
    (releaseAccountSessionPlan?.exitCode === 0 &&
      Boolean(releaseAccountSessionPlanSummary?.ok));
  const releaseCockpitSummary = releaseCockpit?.json || null;
  const releaseCockpitCurrent =
    !shouldCheckReleaseHandoffArtifacts ||
    !shouldCheckReleaseCockpit ||
    (releaseCockpit?.exitCode === 0 && Boolean(releaseCockpitSummary?.ok));
  const releaseHandoffArtifactsCurrent =
    releaseOwnerActionsCurrent &&
    releaseAccountSessionPlanCurrent &&
    releaseCockpitCurrent;

  if (releaseOwnerActions && !releaseOwnerActionsCurrent) {
    failures.push(
      `Release owner-action handoff artifact is not current: ${(releaseOwnerActionsSummary?.findings || []).join("; ") || "run npm run export:release-owner-actions -- --write"}`,
    );
  }
  if (releaseAccountSessionPlan && !releaseAccountSessionPlanCurrent) {
    failures.push(
      `Release account-session plan artifact is not current: ${(releaseAccountSessionPlanSummary?.findings || []).join("; ") || "run npm run export:release-account-session-plan -- --write"}`,
    );
  }
  if (releaseCockpit && !releaseCockpitCurrent) {
    failures.push(
      `Release cockpit artifact is not current: ${(releaseCockpitSummary?.findings || []).join("; ") || "run npm run export:release-cockpit -- --write"}`,
    );
  }

  const undocumentedActionIds = checkActionDocCoverage(nextRequiredActions);
  if (undocumentedActionIds.length) {
    failures.push(
      `Release account session plan missing required action id(s): ${undocumentedActionIds.join(", ")}`,
    );
  }

  const report = {
    ok:
      failures.length === 0 &&
      externalBlockerCount === 0 &&
      externalEvidenceReady === true &&
      releaseEvidenceArtifactsCurrent === true &&
      releaseHandoffArtifactsCurrent === true &&
      generatedArtifactSummaryCurrent === true &&
      releaseRemainingTimeCurrent === true &&
      sourcePackArtifactsCurrent === true &&
      sourcePackReady === true &&
      humanReviewReady === true &&
      libraryReady === true &&
      libraryAuditArtifactsCurrent === true &&
      titleAuditReady === true,
    externalRelease: release
      ? {
          ok: Boolean(release.json.ok),
          blockerCount: externalBlockerCount,
          blockedIds,
          actionDetails: externalActionDetails,
          okChecks: release.json.okChecks || [],
          packageScriptsChecked: release.json.packageScriptsChecked,
          releaseControlScriptsChecked:
            release.json.releaseControlScriptsChecked,
          migrationFilesChecked: release.json.migrationFilesChecked,
        }
      : null,
    releaseExternalEvidence: externalEvidenceSummary
      ? {
          schemaVersion: RELEASE_EXTERNAL_EVIDENCE_SCHEMA_VERSION,
          valid: Boolean(externalEvidenceSummary.valid),
          readyForExternalReleaseClaim: Boolean(
            externalEvidenceSummary.readyForExternalReleaseClaim,
          ),
          recordCount: externalEvidenceSummary.recordCount,
          currentBlockedExternalGateCount:
            externalEvidenceSummary.currentBlockedExternalGateCount,
          blockerCount: externalEvidenceSummary.blockerCount,
          findings: externalEvidenceSummary.findings || [],
        }
      : null,
    releaseEvidenceArtifacts: {
      ok: releaseEvidenceArtifactsCurrent,
      blockerEvidence: releaseBlockerEvidenceSummary
        ? {
            current: releaseBlockerEvidenceCurrent,
            outPath: releaseBlockerEvidenceSummary.outPath,
            blockerCount: releaseBlockerEvidenceSummary.blockerCount,
            recordCount: releaseBlockerEvidenceSummary.recordCount,
            currentBlockedGateIds:
              releaseBlockerEvidenceSummary.currentBlockedGateIds,
            findings: releaseBlockerEvidenceSummary.findings || [],
          }
        : null,
      externalEvidenceIntake: releaseExternalEvidenceIntakeSummary
        ? {
            current: releaseExternalEvidenceIntakeCurrent,
            outPath: releaseExternalEvidenceIntakeSummary.outPath,
            recordCount: releaseExternalEvidenceIntakeSummary.recordCount,
            currentReleaseBlockerCount:
              releaseExternalEvidenceIntakeSummary.currentReleaseBlockerCount,
            findings: releaseExternalEvidenceIntakeSummary.findings || [],
          }
        : null,
      productionSecretChecklist: productionSecretChecklistSummary
        ? {
            current: productionSecretChecklistCurrent,
            outPath: productionSecretChecklistSummary.outPath,
            groupCount: productionSecretChecklistSummary.groupCount,
            totalRequired: productionSecretChecklistSummary.totalRequired,
            configuredRequired:
              productionSecretChecklistSummary.configuredRequired,
            missingRequiredCount:
              productionSecretChecklistSummary.missingRequiredCount,
            missingRequired: productionSecretChecklistSummary.missingRequired,
            checklistComplete:
              productionSecretChecklistSummary.checklistComplete,
            findings: productionSecretChecklistSummary.findings || [],
          }
        : null,
    },
    releaseHandoffArtifacts: {
      ok: releaseHandoffArtifactsCurrent,
      skipped: !shouldCheckReleaseHandoffArtifacts,
      ownerActions: releaseOwnerActionsSummary
        ? {
            current: releaseOwnerActionsCurrent,
            outPath: releaseOwnerActionsSummary.outPath,
            goalComplete: Boolean(releaseOwnerActionsSummary.goalComplete),
            nextRequiredActions:
              releaseOwnerActionsSummary.nextRequiredActions || [],
            findings: releaseOwnerActionsSummary.findings || [],
          }
        : null,
      accountSessionPlan: releaseAccountSessionPlanSummary
        ? {
            current: releaseAccountSessionPlanCurrent,
            outPath: releaseAccountSessionPlanSummary.outPath,
            goalComplete: Boolean(
              releaseAccountSessionPlanSummary.goalComplete,
            ),
            blockedSessionCount:
              releaseAccountSessionPlanSummary.blockedSessionCount,
            sessions: releaseAccountSessionPlanSummary.sessions || [],
            findings: releaseAccountSessionPlanSummary.findings || [],
          }
        : null,
      cockpit: releaseCockpitSummary
        ? {
            current: releaseCockpitCurrent,
            outPath: releaseCockpitSummary.outPath,
            goalComplete: Boolean(releaseCockpitSummary.goalComplete),
            nextRequiredActions:
              releaseCockpitSummary.nextRequiredActions || [],
            externalBlockerCount: releaseCockpitSummary.externalBlockerCount,
            humanReviewBlockerCount:
              releaseCockpitSummary.humanReviewBlockerCount,
            findings: releaseCockpitSummary.findings || [],
          }
        : null,
    },
    releaseRemainingTime: releaseRemainingTimeSummary
      ? {
          ok: releaseRemainingTimeCurrent,
          outPath: releaseRemainingTimeSummary.outPath,
          goalComplete: Boolean(releaseRemainingTimeSummary.goalComplete),
          externalBlockerCount:
            releaseRemainingTimeSummary.externalBlockerCount,
          libraryBlockerCount: releaseRemainingTimeSummary.libraryBlockerCount,
          sourcePackVerifiedCardCount:
            releaseRemainingTimeSummary.sourcePackVerifiedCardCount,
          findings: releaseRemainingTimeSummary.findings || [],
        }
      : null,
    generatedArtifactSummary: generatedArtifactSummaryReport
      ? {
          current: generatedArtifactSummaryCurrent,
          outputPath: generatedArtifactSummaryReport.outputPath,
          artifactCount: generatedArtifactSummaryReport.artifactCount,
          groupCount: generatedArtifactSummaryReport.groupCount,
          stageable: generatedArtifactSummaryReport.stageable,
          releaseProof: generatedArtifactSummaryReport.releaseProof,
          ownerApprovalRequired:
            generatedArtifactSummaryReport.ownerApprovalRequired,
          normalPathsCommandRefusesWithoutAllowGenerated:
            generatedArtifactSummaryReport.normalPathsCommandRefusesWithoutAllowGenerated,
          defaultStagePolicy: generatedArtifactSummaryReport.defaultStagePolicy,
          persistedReviewArtifact:
            generatedArtifactSummaryReport.persistedReviewArtifact,
          groups: Array.isArray(generatedArtifactSummaryReport.groups)
            ? generatedArtifactSummaryReport.groups.map((group) => ({
                id: group.id,
                title: group.title,
                count: group.count,
                handling: group.handling,
              }))
            : [],
          findings: generatedArtifactSummaryReport.findings || [],
        }
      : null,
    sourcePackFinalReadiness: sourcePackSummary
      ? {
          ok: sourcePackReady,
          readyForSourcePackActivationClaim: Boolean(
            sourcePackSummary.readyForSourcePackActivationClaim,
          ),
          domainCount: sourcePackSummary.domainCount,
          draftCardCount: sourcePackSummary.draftCardCount,
          verifiedCardCount: sourcePackSummary.verifiedCardCount,
          approvedDraftCardCount: sourcePackSummary.approvedDraftCardCount,
          secretLikeFindingCount: sourcePackSummary.secretLikeFindingCount,
          blockerCount: sourcePackSummary.blockerCount,
          findings: sourcePackSummary.findings || [],
        }
      : null,
    humanReviewFinalReadiness: humanReviewSummary
      ? {
          ok: humanReviewReady,
          readyForHumanReviewClaims: Boolean(
            humanReviewSummary.readyForHumanReviewClaims,
          ),
          releaseProof: Boolean(humanReviewSummary.releaseProof),
          blockerCount: humanReviewSummary.blockerCount,
          nextRequiredActions: humanReviewSummary.nextRequiredActions || [],
          boundary: humanReviewSummary.boundary,
          checks: Array.isArray(humanReviewSummary.checks)
            ? humanReviewSummary.checks.map((check) => ({
                id: check.id,
                title: check.title,
                ok: Boolean(check.ok),
                status: check.status,
                findingCount: Array.isArray(check.findings)
                  ? check.findings.length
                  : 0,
              }))
            : [],
        }
      : null,
    sourcePackReviewArtifacts: {
      ok: sourcePackArtifactsCurrent,
      workflow: sourcePackWorkflowSummary
        ? {
            current: sourcePackWorkflowCurrent,
            domainCount: sourcePackWorkflowSummary.domainCount,
            draftCardCount: sourcePackWorkflowSummary.draftCardCount,
            verifiedCardCount: sourcePackWorkflowSummary.verifiedCardCount,
            activationReadyDomains:
              sourcePackWorkflowSummary.activationReadyDomains,
            findings: sourcePackWorkflowSummary.findings || [],
          }
        : null,
      handoff: sourcePackHandoffSummary
        ? {
            current: sourcePackHandoffCurrent,
            outputPath: sourcePackHandoffSummary.outputPath,
            findings: sourcePackHandoffSummary.findings || [],
          }
        : null,
      domains: Object.fromEntries(
        Object.entries(sourcePackDomainArtifactSummaries).map(
          ([domain, summary]) => [
            domain,
            {
              current: summary.current,
              packetDir: summary.packets?.outDir,
              packetArtifactCount: summary.packets?.artifactCount,
              evidencePath: summary.intake?.outputPath,
              draftCount: summary.intake?.draftCount,
              validationValid: Boolean(summary.validation?.valid),
              activationReady: Boolean(summary.validation?.activationReady),
              approvedCount: summary.validation?.approvedCount,
              blockerCount: summary.validation?.blockerCount,
              findings: [
                ...(summary.packets?.findings || []),
                ...(summary.intake?.findings || []),
                ...(summary.validation?.findings || []),
              ],
            },
          ],
        ),
      ),
    },
    libraryCompletion: librarySummary
      ? {
          ok: Boolean(librarySummary.ok),
          readyForHighestStandardClaim: Boolean(
            librarySummary.readyForHighestStandardClaim,
          ),
          bookCount: librarySummary.bookCount,
          chapterCount: librarySummary.chapterCount,
          sourceRefCount: librarySummary.sourceRefCount,
          templateChapterCount: librarySummary.templateChapterCount,
          sensitiveBookCount: librarySummary.sensitiveBookCount,
          booksWithReviewEvidenceCount:
            librarySummary.booksWithReviewEvidenceCount,
          publishedBooksMissingReviewEvidenceCount:
            librarySummary.publishedBooksMissingReviewEvidenceCount,
          bookMetadataIssueCount: librarySummary.bookMetadataIssueCount,
          chapterStructureIssueCount: librarySummary.chapterStructureIssueCount,
          sourceDiversityWarningCount:
            librarySummary.sourceDiversityWarningCount,
          repeatedSourceSetWarningCount:
            librarySummary.repeatedSourceSetWarningCount,
          reusedSourceNoteWarningCount:
            librarySummary.reusedSourceNoteWarningCount,
          blockerCount: librarySummary.blockerCount,
          warningCount: librarySummary.warningCount,
          statusCounts: librarySummary.statusCounts,
          planCounts: librarySummary.planCounts,
        }
      : null,
    libraryTitleContentAudit: titleAuditSummary
      ? {
          artifactCurrent: titleAuditCurrent,
          ok: Boolean(titleAuditSummary.ok),
          readyForHighestStandardClaim: Boolean(
            titleAuditSummary.readyForHighestStandardClaim,
          ),
          bookCount: titleAuditSummary.bookCount,
          highCareBookCount: titleAuditSummary.highCareBookCount,
          reviewedBookCount: titleAuditSummary.reviewedBookCount,
          titleCoverageConcernCount:
            titleAuditSummary.titleCoverageConcernCount,
          promiseCoverageConcernCount:
            titleAuditSummary.promiseCoverageConcernCount,
          overclaimConcernCount: titleAuditSummary.overclaimConcernCount,
          automatedConcernCount: titleAuditSummary.automatedConcernCount,
          statusCounts: titleAuditSummary.statusCounts,
          planCounts: titleAuditSummary.planCounts,
        }
      : null,
    libraryAuditArtifacts: {
      ok: libraryAuditArtifactsCurrent,
      completionAudit: completionAuditSummary
        ? {
            current: completionAuditCurrent,
            outPath: completionAuditSummary.outPath,
            completionOk: Boolean(completionAuditSummary.completionOk),
            readyForHighestStandardClaim: Boolean(
              completionAuditSummary.readyForHighestStandardClaim,
            ),
            findings: completionAuditSummary.findings || [],
          }
        : null,
      sourceSpecificityAudit: sourceSpecificityAuditSummary
        ? {
            current: sourceSpecificityAuditCurrent,
            outPath: sourceSpecificityAuditSummary.outPath,
            lowSourceDiversityBookCount:
              sourceSpecificityAuditSummary.lowSourceDiversityBookCount,
            repeatedSourceSetBookCount:
              sourceSpecificityAuditSummary.repeatedSourceSetBookCount,
            reusedSourceNoteCount:
              sourceSpecificityAuditSummary.reusedSourceNoteCount,
            findings: sourceSpecificityAuditSummary.findings || [],
          }
        : null,
      reviewBatches: reviewBatchesSummary
        ? {
            current: reviewBatchesCurrent,
            outPath: reviewBatchesSummary.outPath,
            batchCount: reviewBatchesSummary.summary?.batchCount,
            pendingBookCount: reviewBatchesSummary.summary?.pendingBookCount,
            sensitivePendingBookCount:
              reviewBatchesSummary.summary?.sensitivePendingBookCount,
            missingEvidenceCount:
              reviewBatchesSummary.summary?.missingEvidenceCount,
            nextBatchId: reviewBatchesSummary.summary?.nextBatchId,
            nextBatchTitle: reviewBatchesSummary.summary?.nextBatchTitle,
            nextBatchHash: reviewBatchesSummary.summary?.nextBatchHash,
            batchHashes: reviewBatchesSummary.summary?.batchHashes,
            findings: reviewBatchesSummary.findings || [],
          }
        : null,
      signoffLedger: signoffLedgerSummary
        ? {
            current: signoffLedgerCurrent,
            outPath: signoffLedgerSummary.outPath,
            evidenceOk: Boolean(signoffLedgerSummary.evidenceOk),
            completeEvidenceCount: signoffLedgerSummary.completeEvidenceCount,
            incompleteEvidenceCount:
              signoffLedgerSummary.incompleteEvidenceCount,
            missingQualifiedScholarCount:
              signoffLedgerSummary.missingQualifiedScholarCount,
            findings: signoffLedgerSummary.findings || [],
          }
        : null,
      reviewPackets: reviewPacketsSummary
        ? {
            current: reviewPacketsCurrent,
            outDir: reviewPacketsSummary.outDir,
            expectedPacketCount: reviewPacketsSummary.expectedPacketCount,
            expectedFileCount: reviewPacketsSummary.expectedFileCount,
            findings: reviewPacketsSummary.findings || [],
          }
        : null,
      hajjUmrahReviewPacket: hajjUmrahReviewPacketSummary
        ? {
            current: hajjUmrahReviewPacketCurrent,
            outPath: hajjUmrahReviewPacketSummary.outPath,
            contentHash: hajjUmrahReviewPacketSummary.book?.contentHash,
            generatedScaffoldChapterCount:
              hajjUmrahReviewPacketSummary.book?.generatedScaffoldChapterCount,
            findings: hajjUmrahReviewPacketSummary.findings || [],
          }
        : null,
    },
    docs: {
      ok: missingDocs.length === 0,
      checked: docs,
    },
    failures,
    nextRequiredActions,
    nextActionDetails,
  };

  if (wantsJson) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.ok) {
    console.log(
      "NurAI goal completion check passed: external release gates and library completion are ready.",
    );
  } else {
    console.error("NurAI goal completion check failed:");
    if (failures.length) {
      console.error(`- Checker failures: ${failures.length}`);
      for (const failure of failures) console.error(`  - ${failure}`);
    }
    if (release) {
      console.error(
        `- External release blockers: ${externalBlockerCount}${
          blockedIds.length ? ` (${blockedIds.join(", ")})` : ""
        }`,
      );
      for (const detail of externalActionDetails) {
        const command =
          detail.verificationCommands?.[0] || "npm run check:release-blockers";
        console.error(`  - ${detail.id}: ${detail.message}`);
        console.error(`    Proof command: ${command}`);
        if (detail.noSecretBoundary) {
          console.error(`    No-secret boundary: ${detail.noSecretBoundary}`);
        }
      }
    }
    if (externalEvidenceSummary) {
      console.error(
        `- External release evidence: ${externalEvidenceSummary.blockerCount} validation finding(s), ${externalEvidenceSummary.currentBlockedExternalGateCount} current external gate blocker(s).`,
      );
    }
    if (!releaseEvidenceArtifactsCurrent) {
      console.error(
        "- Release evidence artifacts: one or more blocker evidence, external evidence intake, or production secret checklist artifacts are stale or missing.",
      );
    }
    if (!releaseHandoffArtifactsCurrent) {
      console.error(
        "- Release handoff artifacts: owner-action, release cockpit, or account-session handoff docs are stale or missing.",
      );
    }
    if (!generatedArtifactSummaryCurrent) {
      console.error(
        "- Generated artifact summary: generated media and build binaries are not currently separated from normal feature review.",
      );
    }
    if (sourcePackSummary) {
      console.error(
        `- AI source-pack final readiness: ${sourcePackSummary.approvedDraftCardCount || 0}/${sourcePackSummary.draftCardCount || 0} draft card(s) approved, ${sourcePackSummary.verifiedCardCount || 0} verified card(s), ${sourcePackSummary.blockerCount || 0} blocker(s), ${sourcePackSummary.secretLikeFindingCount || 0} secret-like finding(s).`,
      );
    }
    if (!sourcePackArtifactsCurrent) {
      console.error(
        "- AI source-pack review artifacts: one or more saved handoff, packet, intake, or validation artifacts are stale or missing.",
      );
    }
    if (librarySummary) {
      console.error(
        `- Library completion: ${librarySummary.blockerCount} blocker(s), ${librarySummary.warningCount} warning(s), ${librarySummary.templateChapterCount}/${librarySummary.chapterCount} chapter(s) still show repeated scaffold signals, ${librarySummary.bookMetadataIssueCount} book metadata/title issue(s), ${librarySummary.chapterStructureIssueCount} chapter structure issue(s), ${librarySummary.sourceDiversityWarningCount || 0} source-diversity warning(s), ${librarySummary.reusedSourceNoteWarningCount || 0} reused source-note warning(s).`,
      );
    }
    if (titleAuditSummary) {
      console.error(
        `- Library title/content audit: current=${titleAuditCurrent ? "yes" : "no"}, ${titleAuditSummary.reviewedBookCount}/${titleAuditSummary.bookCount} book(s) have complete review evidence, ${titleAuditSummary.titleCoverageConcernCount} title-coverage concern(s), ${titleAuditSummary.promiseCoverageConcernCount} promise-coverage concern(s), ${titleAuditSummary.overclaimConcernCount} metadata overclaim concern(s).`,
      );
    }
    if (!libraryAuditArtifactsCurrent) {
      console.error(
        "- Library audit artifacts: one or more saved audit artifacts are stale or missing.",
      );
    }
    if (missingDocs.length) {
      console.error(`- Missing docs: ${missingDocs.join(", ")}`);
    }
    console.error(
      "- This app should not be marked fully finished or highest-standard complete until this check passes.",
    );
  }

  if (!report.ok) process.exit(1);
}

main();
