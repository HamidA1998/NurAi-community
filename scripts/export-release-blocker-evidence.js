#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  BLOCKER_EVIDENCE_GATE_IDS,
  postClearWatchPlanForGate,
  rollbackMitigationPlanForGate,
  verificationCommandsForGate,
} = require("./lib/releaseExternalEvidenceRequirements");

const DEFAULT_OUT_PATH = "docs/audit/RELEASE_BLOCKER_EVIDENCE.md";
const HUMAN_REVIEW_GATE_IDS = [
  "source-pack-activation-readiness",
  "library-content-completion",
];

const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");
const wantsJson = process.argv.includes("--json");
const wantsSummaryJson = process.argv.includes("--summary-json");

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function runReleaseBlockers() {
  const result = spawnSync(
    process.execPath,
    ["scripts/check-release-blockers.js", "--json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
    },
  );
  const stdout = (result.stdout || "").trim();
  if (!stdout) {
    throw new Error(
      `check-release-blockers did not emit JSON. exitCode=${result.status}; stderr=${(
        result.stderr || ""
      ).trim()}`,
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

function runTsxJsonCommand(args) {
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsx", ...args],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
      timeout: 60_000,
    },
  );
  const stdout = (result.stdout || "").trim();
  const stderr = (result.stderr || "").trim();
  const report = parseFirstJsonObject(stdout) || parseFirstJsonObject(stderr);
  return {
    exitCode: result.status,
    ok: result.status === 0 && report?.ok === true,
    report: report || {},
    stderr,
  };
}

function runNodeJsonCommand(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    timeout: 60_000,
  });
  const stdout = (result.stdout || "").trim();
  const stderr = (result.stderr || "").trim();
  const report = parseFirstJsonObject(stdout) || parseFirstJsonObject(stderr);
  return {
    exitCode: result.status,
    ok: result.status === 0 && report?.ok === true,
    report: report || {},
    stderr,
  };
}

function containsSecretLikeText(value) {
  const text = JSON.stringify(value || "");
  return [
    /sk-[A-Za-z0-9_-]{12,}/,
    /rpa_[A-Za-z0-9_-]{12,}/,
    /AIza[0-9A-Za-z_-]{20,}/,
    /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /"private_key"\s*:/i,
    /RUNPOD_SECRET/i,
  ].some((pattern) => pattern.test(text));
}

function yesNo(value) {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "unknown";
}

function fieldState(value) {
  if (value === undefined || value === null || value === "") return "unknown";
  return String(value);
}

function summarizeDeployedRuntime(evidence) {
  const deployedAI = evidence?.deployedAI || {};
  const url = evidence?.url || {};
  const smokeStatus = deployedAI.serverSmokeStatus;
  const smokeRemediation = deployedAI.serverSmokeRemediation;
  const lines = [
    `Runtime URL shape: ${yesNo(url.ok)} (source ${fieldState(url.source)}, protocol ${fieldState(url.protocol)}, host ${fieldState(url.host)}).`,
    `Deployed AI verifier passed: ${yesNo(deployedAI.ok)} (exit ${fieldState(deployedAI.exitCode)}, stderr ${fieldState(deployedAI.stderr)}).`,
    `Deployment status passed: ${yesNo(deployedAI.deploymentStatus)}.`,
    `Admin diagnostics protected: ${yesNo(deployedAI.adminDiagnosticsProtected)}.`,
    `OpenAI models visible to verifier: ${yesNo(deployedAI.openAIModelsVisible)}.`,
    `Live OpenAI completion passed locally/in verifier path: ${yesNo(deployedAI.liveCompletion)}.`,
    `Server-side smoke passed: ${yesNo(deployedAI.serverSmokeCompletion)}${
      smokeStatus ? ` (HTTP ${smokeStatus})` : ""
    }.`,
  ];
  if (deployedAI.serverSmokeError) {
    lines.push(`Server-side smoke error: ${deployedAI.serverSmokeError}`);
  }
  if (smokeRemediation) {
    lines.push(`Server-side smoke remediation: ${smokeRemediation}`);
  }
  if (deployedAI.railwayAttempt?.failureReason) {
    lines.push(
      `Railway remote verifier issue: ${deployedAI.railwayAttempt.failureReason}`,
    );
  }
  for (const failure of deployedAI.requiredGateFailures || []) {
    lines.push(`Required gate failure: ${failure}`);
  }
  return {
    currentFailureType:
      smokeStatus === 401
        ? "deployed-smoke-secret-not-accepted"
        : "deployed-runtime-not-verified",
    lines,
  };
}

function summarizeProductionDatabase(evidence) {
  const url = evidence?.url || {};
  const migrations = evidence?.appliedMigrations || {};
  const remoteDb = evidence?.remoteDb || {};
  const proofPlan = runNodeJsonCommand([
    "scripts/check-production-db-proof-plan.js",
    "--check",
    "--json",
  ]);
  const proofReport = proofPlan.report || {};
  const remoteFailureReason = remoteDb.failureReason || "";
  const remoteNeedsRailwayAuth = /railway cli authentication/i.test(
    remoteFailureReason,
  );
  return {
    currentFailureType: remoteNeedsRailwayAuth
      ? "railway-authentication-required-for-db-proof"
      : "production-database-url-missing-or-unverified",
    lines: [
      `DATABASE_URL shape: ${yesNo(url.ok)} (source ${fieldState(url.source)}, state ${fieldState(url.state)}).`,
      `Migration verification passed: ${yesNo(migrations.ok)}.`,
      migrations.skipped
        ? `Migration verification skipped: ${migrations.reason}`
        : `Migration verification exit: ${fieldState(migrations.exitCode)}.`,
      `Non-secret DB proof plan artifact current: ${yesNo(proofPlan.ok)} (exit ${fieldState(proofPlan.exitCode)}, path ${fieldState(proofReport.outputPath || "docs/audit/PRODUCTION_DB_PROOF_PLAN.md")}).`,
      `DB proof plan migration hashes indexed: ${fieldState(proofReport.migrationPlan?.migrationCount)}; ready for credentialed verification: ${yesNo(proofReport.readyForCredential)}; production DB claim ready: ${yesNo(proofReport.readyForProductionDbClaim)}.`,
      "DB proof plan boundary: migration hashes and command plan only; credentialed production commands still need real DATABASE_URL and redacted pass evidence.",
      `Railway in-service DB check passed: ${yesNo(remoteDb.ok)} (mode ${fieldState(remoteDb.mode)}, exit ${fieldState(remoteDb.exitCode)}, stderr ${fieldState(remoteDb.stderr)}).`,
      remoteDb.failureReason
        ? `Railway in-service DB issue: ${remoteDb.failureReason}`
        : "Railway in-service DB issue: none recorded.",
    ],
  };
}

function summarizeRunPod(evidence) {
  const baseUrl = evidence?.baseUrl || {};
  const liveHealth = evidence?.liveHealth || {};
  const modelPool = evidence?.modelPool || {};
  const ownership = evidence?.ownership || {};
  const entries = Array.isArray(modelPool.enabledEntries)
    ? modelPool.enabledEntries
    : [];
  const accountCheck = runRunPodAccountCheck();
  const enabledHealth = runEnabledLocalAIHealth();
  const lines = [
    `Owned endpoint verified: ${yesNo(evidence?.ok)}.`,
    `Base URL shape: ${yesNo(baseUrl.ok)} (source ${fieldState(baseUrl.source)}, protocol ${fieldState(baseUrl.protocol)}, path ${fieldState(baseUrl.pathname)}).`,
    `Endpoint kind: ${fieldState(evidence?.currentEndpointKind)}.`,
    `OpenAI-compatible path: ${yesNo(evidence?.openAICompatiblePath)}.`,
    `RunPod account lookup: ${fieldState(ownership.state)}; visible endpoint count: ${fieldState(ownership.endpointCountVisible)}.`,
    `Standalone RunPod account verifier passed: ${yesNo(accountCheck.ok)} (exit ${fieldState(accountCheck.exitCode)}, blocker ${fieldState(accountCheck.blocker)}).`,
    `Enabled model pool verified: ${yesNo(modelPool.ok)} (${fieldState(modelPool.enabledCount)} enabled).`,
    `Live local-AI health passed: ${yesNo(liveHealth.ok)}${liveHealth.skipped ? `; skipped because ${liveHealth.reason}` : ""}.`,
    `Enabled local-AI smoke check passed: ${yesNo(enabledHealth.ok)} (exit ${fieldState(enabledHealth.exitCode)}, checked ${fieldState(enabledHealth.checkedCandidates)} enabled candidate(s), configured ${fieldState(enabledHealth.configuredCandidates)} total).`,
  ];
  for (const failure of enabledHealth.failures) {
    lines.push(
      `Enabled local-AI failure ${fieldState(failure.id)}: ${failure.safeError}.`,
    );
  }
  for (const entry of entries) {
    lines.push(
      `Enabled model ${fieldState(entry.id)} uses ${fieldState(entry.model)} and endpoint kind ${fieldState(entry.currentEndpointKind)}; entry ok: ${yesNo(entry.ok)}.`,
    );
  }
  return {
    currentFailureType: "runpod-owned-endpoint-not-proven",
    lines,
  };
}

function safeProviderError(error) {
  const text = sanitizeSensitiveText(String(error || "unknown error"));
  if (
    /402\s+payment required/i.test(text) ||
    /insufficient balance/i.test(text)
  ) {
    return "402 Payment Required / Insufficient Balance";
  }
  if (/timeout/i.test(text)) return "timeout";
  if (/unauthorized|401/i.test(text)) return "401 Unauthorized";
  if (/forbidden|403/i.test(text)) return "403 Forbidden";
  if (/not found|404/i.test(text)) return "404 Not Found";
  return text.slice(0, 180);
}

function sanitizeSensitiveText(value) {
  return String(value || "")
    .replace(/\brpa_[A-Za-z0-9]+/g, "rpa_[REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]+/g, "sk-[REDACTED]")
    .replace(/postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/gi, "postgres://[REDACTED]@")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "AIza[REDACTED]");
}

function runEnabledLocalAIHealth() {
  const result = spawnSync(
    process.execPath,
    ["scripts/check-local-ai.js", "--all-enabled", "--json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
      timeout: 30_000,
    },
  );
  const stdout = (result.stdout || "").trim();
  const stderr = (result.stderr || "").trim();
  let report = null;
  report = parseFirstJsonObject(stdout) || parseFirstJsonObject(stderr);
  const failures = Array.isArray(report?.failures)
    ? report.failures.map((failure) => ({
        id: failure.id || "unknown",
        model: failure.model || "unknown",
        safeError: safeProviderError(failure.error),
      }))
    : [];
  return {
    ok: result.status === 0 && report?.ok === true,
    exitCode: result.status,
    checkedCandidates: report?.checkedCandidates,
    configuredCandidates: report?.configuredCandidates,
    failures,
  };
}

function runRunPodAccountCheck() {
  const result = spawnSync(
    process.execPath,
    ["scripts/check-runpod-account.js"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
      timeout: 30_000,
    },
  );
  const stdout = (result.stdout || "").trim();
  const stderr = (result.stderr || "").trim();
  const report = parseFirstJsonObject(stdout) || parseFirstJsonObject(stderr);
  return {
    ok: result.status === 0 && report?.ok === true,
    exitCode: result.status,
    blocker: report?.blocker || "unknown",
  };
}

function parseFirstJsonObject(text) {
  const source = String(text || "").trim();
  if (!source) return null;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(source.slice(start, end + 1));
  } catch {
    return null;
  }
}

function summarizeGooglePlaces(evidence) {
  const key = evidence?.key || {};
  const liveProvider = evidence?.liveProvider || {};
  const checks = Array.isArray(liveProvider.checks) ? liveProvider.checks : [];
  const providerApis = Array.isArray(liveProvider.providerApis)
    ? liveProvider.providerApis.join(", ")
    : "unknown";
  const lines = [
    `GOOGLE_PLACES_API_KEY shape: ${yesNo(key.ok)} (source ${fieldState(key.source)}, state ${fieldState(key.state)}).`,
    `Live provider APIs checked: ${providerApis}.`,
    `Live provider smoke passed: ${yesNo(liveProvider.ok)} (exit ${fieldState(liveProvider.exitCode)}, stderr ${fieldState(liveProvider.stderr)}).`,
  ];
  for (const check of checks) {
    lines.push(
      `${fieldState(check.name)}: ok=${yesNo(check.ok)}, http=${fieldState(check.httpStatus)}, provider=${fieldState(check.providerStatus)}, results=${fieldState(check.resultCount)}.`,
    );
    if (check.failureReason) {
      lines.push(
        `${fieldState(check.name)} failure reason: ${check.failureReason}`,
      );
    }
  }
  return {
    currentFailureType: "google-places-billing-or-api-enablements-blocked",
    lines,
  };
}

function summarizeAndroid(evidence) {
  const serviceAccount = evidence?.serviceAccount || {};
  const playPublisherAccess = evidence?.playPublisherAccess || {};
  const revenueCatAndroidKey = evidence?.revenueCatAndroidKey || {};
  const androidOfferings = evidence?.androidOfferings || {};
  const lines = [
    `Android credential check passed: ${yesNo(evidence?.ok)} (exit ${fieldState(evidence?.exitCode)}, stderr ${fieldState(evidence?.stderr)}).`,
    `Missing fields: ${(evidence?.missing || []).join(", ") || "none"}.`,
    `Android package: ${fieldState(evidence?.androidPackage)}; package ok: ${yesNo(evidence?.androidPackageOk)}.`,
    `Google service account configured: ${yesNo(serviceAccount.configured)}; file present: ${yesNo(serviceAccount.filePresent)}; outside repo: ${yesNo(serviceAccount.fileOutsideRepo)}.`,
    `Google Play Publisher API package access: ${yesNo(playPublisherAccess.ok)}${playPublisherAccess.skipped ? `; skipped because ${playPublisherAccess.reason}` : `; stage ${fieldState(playPublisherAccess.stage)}, package access ${yesNo(playPublisherAccess.packageAccess)}, edit cleanup ${yesNo(playPublisherAccess.editDeleted)}`}.`,
    `RevenueCat Android key: ${yesNo(revenueCatAndroidKey.ok)} (source ${fieldState(revenueCatAndroidKey.source)}, state ${fieldState(revenueCatAndroidKey.state)}).`,
    `Android RevenueCat offerings passed: ${yesNo(androidOfferings.ok)}${androidOfferings.skipped ? `; skipped because ${androidOfferings.reason}` : ""}.`,
    `EAS submit track/status: ${fieldState(evidence?.track)} / ${fieldState(evidence?.releaseStatus)}.`,
  ];
  return {
    currentFailureType: "android-play-submit-and-revenuecat-config-missing",
    lines,
  };
}

function summarizeEvidence(gateId, evidence) {
  if (gateId === "deployed-runtime-url") {
    return summarizeDeployedRuntime(evidence);
  }
  if (gateId === "production-database-url") {
    return summarizeProductionDatabase(evidence);
  }
  if (gateId === "owned-runpod-endpoint") {
    return summarizeRunPod(evidence);
  }
  if (gateId === "google-places-key") {
    return summarizeGooglePlaces(evidence);
  }
  if (gateId === "eas-android-submit-config") {
    return summarizeAndroid(evidence);
  }
  return {
    currentFailureType: "unknown",
    lines: ["No gate-specific evidence summary is available."],
  };
}

function summarizeSourcePackFinalReadiness(evidence) {
  const domains = Array.isArray(evidence.domains) ? evidence.domains : [];
  const lines = [
    `Source-pack final readiness passed: ${yesNo(evidence.ok)}.`,
    `Activation claim ready: ${yesNo(evidence.readyForSourcePackActivationClaim)}.`,
    `Domains checked: ${fieldState(evidence.domainCount)}; draft cards: ${fieldState(evidence.draftCardCount)}; approved draft cards: ${fieldState(evidence.approvedDraftCardCount)}; verified cards: ${fieldState(evidence.verifiedCardCount)}.`,
    `Secret-like evidence findings: ${fieldState(evidence.secretLikeFindingCount)}; blocker count: ${fieldState(evidence.blockerCount)}.`,
  ];
  for (const domain of domains) {
    lines.push(
      `${fieldState(domain.domain)}: validated=${yesNo(domain.validated)}, activationReady=${yesNo(domain.activationReady)}, dryRunReady=${yesNo(domain.dryRunReady)}, approved=${fieldState(domain.approvedCount)}/${fieldState(domain.draftCount)}, blockers=${fieldState(domain.blockerCount)}, secret-like findings=${fieldState(domain.secretLikeFindingCount)}.`,
    );
  }
  return {
    currentFailureType: "source-pack-review-evidence-not-approved",
    lines,
  };
}

function summarizeLibraryCompletion(evidence) {
  return {
    currentFailureType: "library-human-review-evidence-not-imported",
    lines: [
      `Library completion passed: ${yesNo(evidence.ok)}.`,
      `Highest-standard claim ready: ${yesNo(evidence.readyForHighestStandardClaim)}; authored content complete: ${yesNo(evidence.authoredContentComplete)}.`,
      `Books: ${fieldState(evidence.bookCount)}; chapters: ${fieldState(evidence.chapterCount)}; source refs: ${fieldState(evidence.sourceRefCount)}; sensitive/high-care books: ${fieldState(evidence.sensitiveBookCount)}.`,
      `Books with review evidence: ${fieldState(evidence.booksWithReviewEvidenceCount)}; review/publication blockers: ${fieldState(evidence.reviewPublicationBlockerCount)}; total blockers: ${fieldState(evidence.blockerCount)}; warnings: ${fieldState(evidence.warningCount)}.`,
      `Automated content blockers: metadata=${fieldState(evidence.bookMetadataIssueCount)}, chapters=${fieldState(evidence.chapterStructureIssueCount)}, templates=${fieldState(evidence.templateChapterCount)}, source diversity warnings=${fieldState(evidence.sourceDiversityWarningCount)}, reused source-note warnings=${fieldState(evidence.reusedSourceNoteWarningCount)}.`,
      `Status counts: ${JSON.stringify(evidence.statusCounts || {})}; plan counts: ${JSON.stringify(evidence.planCounts || {})}.`,
    ],
  };
}

function humanReviewGateDefinition(gateId) {
  if (gateId === "source-pack-activation-readiness") {
    return {
      status: "blocked",
      message:
        "AI tafsir, hadith, fiqh, and seerah source packs still need real reviewer approval evidence before activation claims.",
      ownerActions: [
        "Complete tafsir, hadith, fiqh, and seerah source-card review evidence outside the repo using current hash-bound intake files.",
        "Require reviewer identity, qualification, dates, notes, licensing evidence, activation notes, and reviewed explanation text for every draft card.",
        "Run the final readiness command with completed evidence files and require every domain validator to pass with --require-approved.",
        "Inspect dry-run activation output before any --write or --confirm-source-pack-activation command.",
      ],
      verificationCommands: [
        "npm run check:source-pack-final-readiness -- --summary-json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
        "npm run check:human-review-final-readiness -- --summary-json --library-file /absolute/path/to/merged-library-review-evidence.json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
        "npm run check:ai-source-catalog",
        "npm run check:goal-completion -- --summary-json",
      ],
      postClearWatchPlan: [
        "Confirm activated source cards remain tied to current sourceCardHash values after any source-pack content edit.",
        "Watch AI grounding evals for source-card selection drift after activation.",
        "Keep source-pack activation evidence outside committed files unless it is explicitly redacted and non-secret.",
      ],
      rollbackMitigationPlan: [
        "If any source-pack evidence is stale or disputed, keep the affected domain inactive and remove activation claims.",
        "If a reviewer scope changes, regenerate the intake template and re-run final readiness before applying evidence.",
        "If secret-like data appears in an evidence file, reject the file, rotate exposed secrets if needed, and recollect redacted evidence.",
      ],
    };
  }

  return {
    status: "blocked",
    message:
      "Library books still need strict editorial, source relevance, quality checklist, publication, and qualified scholar evidence before highest-standard claims.",
    ownerActions: [
      "Collect real editorial review, source relevance review, publication quality checklist, and publish approval evidence for all 60 books.",
      "Collect qualified scholar reviewer scope and notes for the 12 high-care/sensitive books.",
      "Validate real external evidence before importing; reject placeholders, stale content hashes, thin notes, and future dates.",
      "Rebuild the signoff ledger, completion audit, title/content audit, and goal-completion proof after evidence is imported.",
    ],
    verificationCommands: [
      "npm run validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --strict --summary-json",
      "npm run check:library-review-final-readiness -- --file /absolute/path/to/merged-library-review-evidence.json --summary-json",
      "npm run check:human-review-final-readiness -- --summary-json --library-file /absolute/path/to/merged-library-review-evidence.json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
      "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --write",
      "npm run export:library-review-signoff-ledger -- --write",
      "npm run export:library-completion-audit -- --write",
      "npm run check:library-content-completion -- --summary-json",
      "npm run check:goal-completion -- --summary-json",
    ],
    postClearWatchPlan: [
      "Re-run Library completion and title/content audits after any book text, source card, or metadata edit.",
      "Keep claims scoped to reviewed books if any future partial import is explicitly allowed.",
      "Watch high-care books for missing qualified-scholar scope whenever category or topic labels change.",
    ],
    rollbackMitigationPlan: [
      "If review evidence is stale or incomplete, revert the affected book status to scholar_review_ready and remove published/highest-standard claims.",
      "If a content hash changes after approval, recollect review evidence for that book before restoring publication claims.",
      "If qualified-scholar scope is missing for a high-care book, block certificate/publication claims for that book until corrected.",
    ],
  };
}

function buildHumanReviewRecords() {
  const sourcePack = runTsxJsonCommand([
    "scripts/check-source-pack-final-readiness.ts",
    "--summary-json",
  ]);
  const library = runTsxJsonCommand([
    "scripts/check-library-content-completion.ts",
    "--summary-json",
  ]);

  return HUMAN_REVIEW_GATE_IDS.map((gateId) => {
    const commandResult =
      gateId === "source-pack-activation-readiness" ? sourcePack : library;
    const evidence = commandResult.report || {};
    const definition = humanReviewGateDefinition(gateId);
    const summary =
      gateId === "source-pack-activation-readiness"
        ? summarizeSourcePackFinalReadiness(evidence)
        : summarizeLibraryCompletion(evidence);
    return {
      gateId,
      gateType: "human-review",
      status: commandResult.ok ? "ok" : definition.status,
      message: commandResult.ok
        ? `${gateId} evidence gate passed.`
        : definition.message,
      currentFailureType: commandResult.ok
        ? "none"
        : summary.currentFailureType,
      nonSecretEvidence: [
        `Verifier exit code: ${fieldState(commandResult.exitCode)}.`,
        ...summary.lines,
      ],
      ownerActions: definition.ownerActions,
      verificationCommands: definition.verificationCommands,
      postClearWatchPlan: definition.postClearWatchPlan,
      rollbackMitigationPlan: definition.rollbackMitigationPlan,
    };
  });
}

function buildReport(rawReport) {
  const checks = Array.isArray(rawReport.checks) ? rawReport.checks : [];
  const externalRecords = BLOCKER_EVIDENCE_GATE_IDS.map((gateId) => {
    const check = checks.find((item) => item.id === gateId);
    const summary = summarizeEvidence(gateId, check?.evidence || {});
    return {
      gateId,
      gateType: "external-account",
      status: check?.status || "unknown",
      message: check?.message || "Gate status unavailable.",
      currentFailureType: summary.currentFailureType,
      nonSecretEvidence: summary.lines,
      ownerActions: check?.ownerAction || [],
      verificationCommands: verificationCommandsForGate(gateId),
      postClearWatchPlan: postClearWatchPlanForGate(gateId),
      rollbackMitigationPlan: rollbackMitigationPlanForGate(gateId),
    };
  });
  const humanReviewRecords = buildHumanReviewRecords();
  const records = [...externalRecords, ...humanReviewRecords];

  return {
    ok: rawReport.ok === true,
    blockerCount: rawReport.blockerCount,
    humanReviewBlockerCount: humanReviewRecords.filter(
      (record) => record.status !== "ok",
    ).length,
    okCount: rawReport.okCount,
    okChecks: rawReport.okChecks || [],
    packageScriptsChecked: rawReport.packageScriptsChecked,
    releaseControlScriptsChecked: rawReport.releaseControlScriptsChecked,
    migrationFilesChecked: rawReport.migrationFilesChecked,
    records,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# NurAI Release Blocker Evidence",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This generated report records the current non-secret evidence for release gates that are still blocked, including external account gates and human-review gates. It is failure evidence only; it is not approval, not pass evidence, and not a substitute for `validate:release-external-evidence`, `check:source-pack-final-readiness`, or `check:library-content-completion` after the gates pass.",
    "",
    "## Summary",
    "",
    `- Release blockers cleared: ${report.ok ? "yes" : "no"}`,
    `- External blockers: ${report.blockerCount ?? "unknown"}`,
    `- Human-review blockers: ${report.humanReviewBlockerCount ?? "unknown"}`,
    `- OK release checks: ${report.okCount ?? "unknown"}`,
    `- Package scripts checked: ${report.packageScriptsChecked ?? "unknown"}`,
    `- Release-control scripts checked: ${report.releaseControlScriptsChecked ?? "unknown"}`,
    `- Migration files checked: ${report.migrationFilesChecked ?? "unknown"}`,
    `- OK checks: ${(report.okChecks || []).join(", ") || "none"}`,
    "",
    "## Blocker Snapshots",
    "",
  ];

  for (const record of report.records) {
    lines.push(`### ${record.gateId}`);
    lines.push("");
    lines.push(`Gate type: ${record.gateType || "release"}`);
    lines.push(`Status: ${record.status}`);
    lines.push(`Gate message: ${record.message}`);
    lines.push(`Current failure type: ${record.currentFailureType}`);
    lines.push("");
    lines.push("Current non-secret evidence:");
    for (const line of record.nonSecretEvidence) lines.push(`- ${line}`);
    lines.push("");
    lines.push("Owner actions:");
    for (const [index, action] of record.ownerActions.entries()) {
      lines.push(`${index + 1}. ${action}`);
    }
    if (!record.ownerActions.length) lines.push("- None.");
    lines.push("");
    lines.push("Verification commands:");
    lines.push("");
    lines.push("```bash");
    for (const command of record.verificationCommands) lines.push(command);
    lines.push("```");
    lines.push("");
    lines.push("Post-clear watch plan:");
    for (const [index, item] of record.postClearWatchPlan.entries()) {
      lines.push(`${index + 1}. ${item}`);
    }
    lines.push("");
    lines.push("Rollback / mitigation plan:");
    for (const [index, item] of record.rollbackMitigationPlan.entries()) {
      lines.push(`${index + 1}. ${item}`);
    }
    lines.push("");
  }

  lines.push("## Completion Rule");
  lines.push("");
  lines.push(
    "Do not mark the release complete from this report. External account gates need validated pass evidence, and human-review gates need real reviewer evidence before source-pack, Library, or App Store claims are strengthened.",
  );
  lines.push("");
  lines.push("```bash");
  lines.push("npm run check:release-blockers");
  lines.push("npm run export:release-external-evidence-intake -- --write");
  lines.push(
    "npm run validate:release-external-evidence -- --file docs/audit/release-external-evidence.intake.json --summary-json",
  );
  lines.push(
    "npm run check:source-pack-final-readiness -- --summary-json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
  );
  lines.push("npm run check:library-content-completion -- --summary-json");
  lines.push("npm run check:goal-completion");
  lines.push("```");
  lines.push("");

  return lines.join("\n");
}

function normalizeGenerated(markdown) {
  return markdown.replace(/^Generated: .+$/m, "Generated: <timestamp>");
}

async function formatGeneratedMarkdown(markdown, filePath) {
  try {
    const prettier = await import("prettier");
    const config = (await prettier.resolveConfig(filePath)) || {};
    const formatted = await prettier.format(markdown, {
      ...config,
      filepath: filePath,
      parser: "markdown",
    });
    return formatted.trimEnd();
  } catch {
    return markdown.trimEnd();
  }
}

async function main() {
  const outPath = path.resolve(
    process.cwd(),
    argValue("--out", DEFAULT_OUT_PATH),
  );
  const rawReport = runReleaseBlockers();
  const report = buildReport(rawReport);
  const markdown = `${await formatGeneratedMarkdown(
    renderMarkdown(report),
    outPath,
  )}\n`;
  const secretFindings = [];
  if (containsSecretLikeText(report) || containsSecretLikeText(markdown)) {
    secretFindings.push(
      "Generated blocker evidence appears to contain secret material.",
    );
  }

  if (wantsCheck) {
    const findings = [...secretFindings];
    if (!fs.existsSync(outPath)) {
      findings.push(`${path.relative(process.cwd(), outPath)} is missing.`);
    } else {
      const current = fs.readFileSync(outPath, "utf8");
      if (normalizeGenerated(current) !== normalizeGenerated(markdown)) {
        findings.push(
          `${path.relative(process.cwd(), outPath)} is stale; regenerate with npm run export:release-blocker-evidence -- --write.`,
        );
      }
      if (containsSecretLikeText(current)) {
        findings.push(
          `${path.relative(process.cwd(), outPath)} appears to contain secret material.`,
        );
      }
    }
    const summary = {
      ok: findings.length === 0,
      outPath,
      blockerCount: report.blockerCount,
      recordCount: report.records.length,
      currentBlockedGateIds: report.records
        .filter((record) => record.status !== "ok")
        .map((record) => record.gateId),
      findings,
    };
    if (wantsSummaryJson || wantsJson) {
      console.log(JSON.stringify(summary, null, 2));
    } else if (summary.ok) {
      console.log(
        `Release blocker evidence check passed: ${summary.recordCount} gate record(s).`,
      );
    } else {
      console.error("Release blocker evidence check failed:");
      for (const finding of findings) console.error(`- ${finding}`);
    }
    if (!summary.ok) process.exit(1);
    return;
  }

  if (secretFindings.length) {
    for (const finding of secretFindings) console.error(finding);
    process.exit(1);
  }

  if (wantsWrite) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, markdown);
  }

  if (wantsSummaryJson) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          outPath,
          written: wantsWrite,
          blockerCount: report.blockerCount,
          recordCount: report.records.length,
          currentBlockedGateIds: report.records
            .filter((record) => record.status !== "ok")
            .map((record) => record.gateId),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (wantsJson) {
    console.log(
      JSON.stringify({ ...report, outPath, written: wantsWrite }, null, 2),
    );
    return;
  }

  if (wantsWrite) {
    console.log(
      `Release blocker evidence written to ${path.relative(process.cwd(), outPath)}.`,
    );
    return;
  }

  console.log(markdown);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
