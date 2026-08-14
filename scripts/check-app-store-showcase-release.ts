#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

import {
  APP_STORE_SHOWCASE_SCENES,
  buildAppStoreClaimSafetyReceipts,
  buildAppStoreDemoDataSafetyRules,
  buildAppStoreListingMetadataPack,
  buildAppStoreLaunchBlockerHandoff,
  buildAppStoreMaintainabilityRunway,
  buildAppStorePlatformAssetRequirements,
  buildAppStorePostLaunchWatchPlan,
  buildAppStoreReleaseBlockerResolutionPlan,
  buildAppStoreReleaseBlockerResolutionShareText,
  buildAppStoreReleaseEvidenceIntakePacket,
  buildAppStoreReviewerNotePacket,
  buildAppStoreScreenshotSetProofPack,
  buildAppStoreScreenshotReadinessContracts,
  buildAppStoreSubmissionReadinessPassport,
  getAppStoreShowcaseReadiness,
} from "../client/services/appStoreShowcaseService";

const root = process.cwd();
const expectedSceneIds = [
  "home",
  "quran",
  "ai",
  "library",
  "arabic",
  "kids",
  "prayer",
  "hajj",
] as const;

const bannedOverclaimPattern =
  /\b(scholar-reviewed|fully reviewed|highest-standard complete|production-ready|release-ready)\b/i;

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function pushIf(condition: boolean, findings: string[], message: string) {
  if (condition) findings.push(message);
}

function routeNamesFromNavigator(navigatorText: string) {
  return new Set(
    Array.from(navigatorText.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g)).map(
      (match) => match[1],
    ),
  );
}

function main() {
  const findings: string[] = [];
  const readiness = getAppStoreShowcaseReadiness();
  const scenes = APP_STORE_SHOWCASE_SCENES;
  const navigatorText = read("client/navigation/RootStackNavigator.tsx");
  const screenText = read("client/screens/AppStoreShowcaseScreen.tsx");
  const serviceText = read("client/services/appStoreShowcaseService.ts");
  const routeNames = routeNamesFromNavigator(navigatorText);
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  const capturePriorities = scenes.map((scene) => scene.capturePriority);
  const demoDataSafetyRules = buildAppStoreDemoDataSafetyRules(scenes);
  const screenshotReadinessContracts =
    buildAppStoreScreenshotReadinessContracts(scenes);
  const screenshotSetProofPack = buildAppStoreScreenshotSetProofPack(scenes);
  const claimSafetyReceipts = buildAppStoreClaimSafetyReceipts(scenes);
  const listingMetadataPack = buildAppStoreListingMetadataPack(scenes);
  const platformAssetRequirements = buildAppStorePlatformAssetRequirements();
  const maintainabilityRunway = buildAppStoreMaintainabilityRunway(
    readiness.launchBlockerHandoff,
  );
  const postLaunchWatchPlan = buildAppStorePostLaunchWatchPlan(
    readiness.launchBlockerHandoff,
  );
  const reviewerNotePacket = buildAppStoreReviewerNotePacket({
    scenes,
    listingMetadataPack,
    launchBlockerHandoff: readiness.launchBlockerHandoff,
  });
  const submissionPassport = buildAppStoreSubmissionReadinessPassport({
    scenes,
    captureDecisionSummary: readiness.captureDecisionSummary,
    captureSessionPlan: readiness.captureSessionPlan,
    listingMetadataPack,
    demoDataSafetyRules,
    launchEvidenceSprint: readiness.launchEvidenceSprint,
    launchBlockerHandoff: readiness.launchBlockerHandoff,
  });

  pushIf(
    scenes.length !== expectedSceneIds.length,
    findings,
    `App Store showcase must expose ${expectedSceneIds.length} scenes, found ${scenes.length}.`,
  );
  pushIf(
    sceneIds.size !== scenes.length,
    findings,
    "App Store showcase scene ids must be unique.",
  );
  pushIf(
    new Set(capturePriorities).size !== scenes.length,
    findings,
    "App Store showcase capture priorities must be unique.",
  );

  for (const id of expectedSceneIds) {
    pushIf(
      !sceneIds.has(id),
      findings,
      `App Store showcase is missing required scene id "${id}".`,
    );
  }

  pushIf(
    readiness.sceneCount !== scenes.length,
    findings,
    "Showcase readiness sceneCount must match the scene list.",
  );
  pushIf(
    readiness.flowCount < 7,
    findings,
    "Showcase readiness must cover at least seven distinct app flows.",
  );
  pushIf(
    readiness.trustSceneCount < 4,
    findings,
    "Showcase must include at least four trust-oriented scenes.",
  );
  pushIf(
    readiness.storeCaptionCount !== scenes.length,
    findings,
    "Every App Store showcase scene must have a descriptive store caption.",
  );
  pushIf(
    readiness.qaGateCount < 4,
    findings,
    "Showcase readiness must include screenshot QA gates for viewport, truth, privacy, and blockers.",
  );
  pushIf(
    readiness.proofLedgerCount !== scenes.length,
    findings,
    "Showcase readiness must include a complete claim proof ledger for every scene.",
  );
  pushIf(
    readiness.routeProofCount !== scenes.length,
    findings,
    "Showcase readiness must include complete route proof for every scene.",
  );
  pushIf(
    readiness.demoDataSafetyRuleCount !== scenes.length ||
      readiness.demoDataSafetyRules.length !== scenes.length ||
      demoDataSafetyRules.length !== scenes.length ||
      !readiness.demoDataSafetyRules.every(
        (rule) =>
          rule.routeName.length >= 3 &&
          rule.approvedDemoStateLabel.length >= 32 &&
          rule.neverShowLabel.length >= 48 &&
          rule.preCaptureCheckLabel.includes("Before capture") &&
          rule.retakeIfLabel.length >= 24,
      ),
    findings,
    "Showcase readiness must expose one demo data safety rule per scene with approved state, never-show boundary, pre-capture check, and retake trigger.",
  );
  pushIf(
    readiness.screenshotReadinessContractCount !== scenes.length ||
      readiness.screenshotReadinessContracts.length !== scenes.length ||
      screenshotReadinessContracts.length !== scenes.length ||
      !readiness.screenshotReadinessContracts.every(
        (contract) =>
          contract.statusLabel === "5/5 capture checks ready" &&
          contract.nextActionLabel.startsWith("Open ") &&
          contract.routeName.length >= 3 &&
          contract.priorityLabel.includes("Priority") &&
          contract.boundaryLabel.includes("demo-safe capture only") &&
          contract.boundaryLabel.includes("deployed runtime") &&
          contract.items.length === 5 &&
          contract.items.every(
            (item) =>
              item.complete &&
              item.evidenceLabel.length >= 16 &&
              item.boundaryLabel.length >= 48,
          ) &&
          contract.items.some((item) => item.id === "viewport") &&
          contract.items.some((item) => item.id === "trust") &&
          contract.items.some((item) => item.id === "demo_state") &&
          contract.items.some((item) => item.id === "route") &&
          contract.items.some((item) => item.id === "retake"),
      ),
    findings,
    "Showcase readiness must expose one complete screenshot readiness contract per scene with viewport, trust, demo-state, route, retake, next action, and launch-boundary language.",
  );
  pushIf(
    readiness.screenshotSetProofSceneCount !== scenes.length ||
      readiness.screenshotSetProofPack.scenes.length !== scenes.length ||
      screenshotSetProofPack.scenes.length !== scenes.length ||
      !readiness.screenshotSetProofPack.statusLabel.includes(
        "screenshot candidates mapped",
      ) ||
      !readiness.screenshotSetProofPack.summaryLabel.includes(
        "daily worship first",
      ) ||
      !readiness.screenshotSetProofPack.firstFourBoundaryLabel.includes(
        "core product before secondary flows",
      ) ||
      !readiness.screenshotSetProofPack.submissionBoundaryLabel.includes(
        "not App Review submission approval",
      ) ||
      !readiness.screenshotSetProofPack.submissionBoundaryLabel.includes(
        "production database proof",
      ) ||
      !readiness.screenshotSetProofPack.noSecretBoundaryLabel.includes(
        "database URLs",
      ) ||
      !readiness.screenshotSetProofPack.retakeBoundaryLabel.includes(
        "route evidence",
      ) ||
      readiness.screenshotSetProofPack.scenes.filter(
        (scene) => scene.heroCandidate,
      ).length !== 4 ||
      !readiness.screenshotSetProofPack.scenes.every(
        (scene, index) =>
          scene.orderLabel === `Shot ${index + 1} of ${scenes.length}` &&
          scene.appStoreSlotLabel.length >= 32 &&
          scene.valueProofLabel.startsWith("Visible value:") &&
          scene.trustProofLabel.startsWith("Trust proof:") &&
          scene.routeLabel.startsWith("Route:") &&
          scene.retakeLabel.startsWith("Retake if:"),
      ),
    findings,
    "Showcase readiness must expose a screenshot proof pack that orders every candidate, marks the first four hero slots, maps value/trust/route/retake proof, and keeps submission plus no-secret boundaries visible.",
  );
  pushIf(
    readiness.claimSafetyReceiptCount !== scenes.length ||
      readiness.claimSafetyReceipts.length !== scenes.length ||
      claimSafetyReceipts.length !== scenes.length ||
      !readiness.claimSafetyReceipts.every(
        (receipt) =>
          receipt.publicClaimLabel.length >= 24 &&
          receipt.evidenceStateLabel.length >= 32 &&
          receipt.sourceBoundaryLabel.length >= 32 &&
          receipt.blockedClaimLabel.startsWith("Blocked claim:") &&
          receipt.approvalQuestion.length >= 48 &&
          receipt.releaseUseLabel.includes("screenshot planning only"),
      ),
    findings,
    "Showcase readiness must expose one claim safety receipt per scene with public claim, visible evidence, boundary, blocked wording, approval question, and release-use limit.",
  );
  pushIf(
    readiness.listingMetadataSectionCount !== 6 ||
      readiness.listingMetadataPack.sections.length !== 6 ||
      listingMetadataPack.sections.length !== 6 ||
      !readiness.listingMetadataPack.releaseBoundaryLabel.includes(
        "deployed runtime",
      ) ||
      !readiness.listingMetadataPack.reviewBoundaryLabel.includes(
        "scholar packet handoff",
      ) ||
      !readiness.listingMetadataPack.localizationBoundaryLabel.includes(
        "not intensify religious authority",
      ) ||
      !readiness.listingMetadataPack.sections.every(
        (section) =>
          section.valueLabel.length >= 18 &&
          section.detail.length >= 42 &&
          section.approvalQuestion.length >= 48 &&
          section.blockedLanguageLabel.length >= 48,
      ),
    findings,
    "Showcase readiness must expose a six-part store listing metadata pack with release, review, localization, approval, and blocked-language boundaries.",
  );
  pushIf(
    readiness.reviewerNoteSectionCount !== 6 ||
      readiness.reviewerNotePacket.sections.length !== 6 ||
      reviewerNotePacket.sections.length !== 6 ||
      !readiness.reviewerNotePacket.statusLabel.includes(
        "Reviewer notes drafted",
      ) ||
      !readiness.reviewerNotePacket.aiBoundaryLabel.includes(
        "scholar-review packets",
      ) ||
      !readiness.reviewerNotePacket.privacyBoundaryLabel.includes(
        "manual sharing",
      ) ||
      !readiness.reviewerNotePacket.noSecretBoundaryLabel.includes(
        "database URLs",
      ) ||
      !readiness.reviewerNotePacket.blockedSubmissionLabel.includes(
        "Deployed AI runtime proof",
      ) ||
      !readiness.reviewerNotePacket.sections.some(
        (section) => section.id === "ai-safety",
      ) ||
      !readiness.reviewerNotePacket.sections.some(
        (section) => section.id === "scholar-review",
      ) ||
      !readiness.reviewerNotePacket.sections.some(
        (section) => section.id === "privacy-data",
      ) ||
      !readiness.reviewerNotePacket.sections.some(
        (section) => section.id === "demo-access",
      ) ||
      !readiness.reviewerNotePacket.sections.some(
        (section) => section.id === "subscriptions",
      ) ||
      !readiness.reviewerNotePacket.sections.some(
        (section) => section.id === "launch-boundaries",
      ) ||
      !readiness.reviewerNotePacket.sections.every(
        (section) =>
          section.reviewerFacingNote.length >= 64 &&
          section.evidenceLabel.length >= 48 &&
          section.doNotIncludeLabel.length >= 42,
      ),
    findings,
    "Showcase readiness must expose a six-part App Review notes packet covering AI safety, scholar review, privacy/data, demo access, subscriptions, launch boundaries, no-secret copy, and blocked submission language.",
  );
  pushIf(
    readiness.platformRequirementCount !== 2 ||
      readiness.platformAssetRequirements.length !== 2 ||
      platformAssetRequirements.length !== 2 ||
      readiness.storeAssetComplianceQuestions.length !== 2 ||
      !readiness.platformAssetRequirements.some(
        (requirement) =>
          requirement.id === "apple-ios-screenshots" &&
          requirement.assetCountLabel.includes("one to ten") &&
          requirement.formatLabel.includes("6.9 inch portrait assets") &&
          requirement.noGoLabel.includes("completed release proof") &&
          requirement.sourceUrl.includes("developer.apple.com") &&
          requirement.sourceCheckedLabel.includes("2026-06-01") &&
          requirement.sourceRequirementLabel.includes("one to ten") &&
          requirement.complianceBoundaryLabel.includes("asset-format evidence"),
      ) ||
      !readiness.platformAssetRequirements.some(
        (requirement) =>
          requirement.id === "google-play-screenshots" &&
          requirement.assetCountLabel.includes("at least two screenshots") &&
          requirement.assetCountLabel.includes(
            "at least four high-resolution",
          ) &&
          requirement.formatLabel.includes("24-bit PNG without alpha") &&
          requirement.firstViewportRuleLabel.includes(
            "core app features and functionality",
          ) &&
          requirement.sourceUrl.includes("support.google.com") &&
          requirement.sourceCheckedLabel.includes("2026-06-01") &&
          requirement.sourceRequirementLabel.includes(
            "at least two screenshots",
          ) &&
          requirement.accessibilityAltTextLabel.includes("140 characters"),
      ) ||
      !readiness.platformAssetRequirements.every(
        (requirement) =>
          requirement.captureImplicationLabel.length > 64 &&
          requirement.noGoLabel.length > 64 &&
          requirement.sourceLabel.includes("current") &&
          requirement.sourceUrl.startsWith("https://") &&
          requirement.sourceCheckedLabel.length >= 48 &&
          requirement.sourceRequirementLabel.length >= 72 &&
          requirement.accessibilityAltTextLabel.length >= 72 &&
          requirement.complianceBoundaryLabel.length >= 72,
      ),
    findings,
    "Showcase readiness must expose current Apple and Google screenshot asset requirements with count, format, capture, first-viewport, no-go, official source URL, checked-date, accessibility, and compliance boundaries.",
  );
  pushIf(
    readiness.submissionReadinessPassport.rows.length !== 4 ||
      submissionPassport.rows.length !== 4 ||
      readiness.submissionReadinessPassport.statusLabel !==
        "Submission blocked by launch proof" ||
      !readiness.submissionReadinessPassport.summaryLabel.includes(
        "launch proof blocker",
      ) ||
      !readiness.submissionReadinessPassport.screenshotBoundaryLabel.includes(
        "demo-safe assets only",
      ) ||
      !readiness.submissionReadinessPassport.submissionBoundaryLabel.includes(
        "Do not submit",
      ) ||
      !readiness.submissionReadinessPassport.noSecretLabel.includes(
        "database URLs",
      ) ||
      !readiness.submissionReadinessPassport.rows.some(
        (row) => row.id === "launch-proof" && row.tone === "danger",
      ),
    findings,
    "Showcase readiness must expose a submission readiness passport that separates screenshot preparation from launch proof, metadata, demo safety, and no-secret boundaries.",
  );
  pushIf(
    readiness.claimValidationQuestions.length !== scenes.length,
    findings,
    "Showcase readiness must expose one claim validation question per scene.",
  );
  pushIf(
    readiness.claimSafetyQuestions.length !== scenes.length,
    findings,
    "Showcase readiness must expose one claim safety approval question per scene.",
  );
  pushIf(
    readiness.captureRouteProofs.length !== scenes.length,
    findings,
    "Showcase readiness must expose one route proof packet per scene.",
  );
  pushIf(
    readiness.captureRouteAuditQuestions.length !== scenes.length,
    findings,
    "Showcase readiness must expose one route audit question per scene.",
  );
  pushIf(
    readiness.captureMatrix.length !== scenes.length,
    findings,
    "Showcase readiness must expose one capture matrix row per scene.",
  );
  pushIf(
    !readiness.captureSessionPlan ||
      readiness.captureSessionPlan.batchCount < 3 ||
      readiness.captureSessionPlan.batches.length !==
        readiness.captureSessionPlan.batchCount ||
      readiness.captureSessionPlan.nextSceneRouteName !== "Main" ||
      !readiness.captureSessionPlan.estimatedMinutesLabel.includes("min") ||
      !readiness.captureSessionPlan.sessionBoundaryLabel.includes(
        "priority order",
      ) ||
      !readiness.captureSessionPlan.privacyBoundaryLabel.includes(
        "demo-safe states",
      ) ||
      !readiness.captureSessionPlan.retakeBoundaryLabel.includes(
        "Retake any screenshot",
      ),
    findings,
    "Showcase readiness must expose a capture session plan with next scene, device batches, privacy boundary, and retake boundary.",
  );
  for (const frame of readiness.requiredDeviceFrames) {
    pushIf(
      !readiness.captureSessionPlan.batches.some(
        (batch) => batch.deviceFrame === frame,
      ),
      findings,
      `Capture session plan must include a batch for ${frame}.`,
    );
  }
  pushIf(
    !readiness.captureDecisionSummary ||
      readiness.captureDecisionSummary.blockerLabels.length < 3 ||
      !readiness.captureDecisionSummary.captureStatusLabel.includes(
        "Capture-ready",
      ) ||
      !readiness.captureDecisionSummary.launchStatusLabel.includes(
        "Launch still blocked",
      ),
    findings,
    "Showcase readiness must expose a capture decision summary that separates screenshot capture from launch blockers.",
  );
  pushIf(
    !readiness.releaseNote.includes("does not mean production release-ready"),
    findings,
    "Showcase readiness must keep capture-readiness separate from production release readiness.",
  );
  pushIf(
    !serviceText.includes("export type AppStoreDemoDataSafetyRule") ||
      !serviceText.includes("buildAppStoreDemoDataSafetyRules") ||
      !serviceText.includes("Never show passport data") ||
      !serviceText.includes("Never show child names") ||
      !serviceText.includes("Demo data safety:"),
    findings,
    "App Store showcase service must define and export demo data safety rules for capture handoff.",
  );
  pushIf(
    !serviceText.includes("export type AppStoreReviewerNotePacket") ||
      !serviceText.includes("export type AppStoreReviewerNoteSection") ||
      !serviceText.includes("buildAppStoreReviewerNotePacket") ||
      !serviceText.includes("buildAppStoreReviewerNoteShareText") ||
      !serviceText.includes("App Review notes packet:") ||
      !serviceText.includes("NurAI App Review notes packet") ||
      !serviceText.includes("AI answers show source coverage") ||
      !serviceText.includes("the packet itself is not approval") ||
      !serviceText.includes(
        "Do not include API keys, smoke secrets, database URLs",
      ) ||
      !serviceText.includes(
        "Do not submit or strengthen launch claims until these proof gates pass",
      ),
    findings,
    "App Store showcase service must define and export an App Review notes packet with AI, scholar-review, privacy, demo, subscription, launch, and no-secret boundaries.",
  );
  pushIf(
    !screenText.includes('testID="app-store-capture-command-rail"') ||
      !screenText.includes("CAPTURE COMMAND RAIL") ||
      !screenText.includes("Run the screenshot session from here") ||
      !screenText.includes("blockers separate from screenshot readiness") ||
      !screenText.includes('testID="button-app-store-command-next-shot"') ||
      !screenText.includes(
        'testID="button-app-store-command-share-capture-handoff"',
      ) ||
      !screenText.includes(
        'testID="button-app-store-command-share-blocker-packet"',
      ) ||
      !screenText.includes(
        'testID="button-app-store-command-share-reviewer-notes"',
      ) ||
      !screenText.includes("function CaptureCommand") ||
      !screenText.includes("buildAppStoreReviewerNoteShareText") ||
      !screenText.includes("shareReviewerNotes"),
    findings,
    "App Store showcase screen must render a capture command rail with next-shot, capture-handoff, blocker-packet, and reviewer-note actions.",
  );
  pushIf(
    !screenText.includes('testID="app-store-demo-data-safety-ledger"') ||
      !screenText.includes("Demo data safety ledger") ||
      !screenText.includes("readiness.demoDataSafetyRules.map") ||
      !screenText.includes("rule.neverShowLabel") ||
      !screenText.includes("rule.preCaptureCheckLabel") ||
      !screenText.includes("testID={`app-store-demo-safety-${rule.id}`}"),
    findings,
    "App Store showcase screen must render the demo data safety ledger with stable automation IDs.",
  );
  pushIf(
    !screenText.includes('testID="app-store-reviewer-note-packet"') ||
      !screenText.includes("App Review notes packet") ||
      !screenText.includes("readiness.reviewerNotePacket.sections.map") ||
      !screenText.includes(
        "readiness.reviewerNotePacket.noSecretBoundaryLabel",
      ) ||
      !screenText.includes("section.reviewerFacingNote") ||
      !screenText.includes("section.evidenceLabel") ||
      !screenText.includes("section.doNotIncludeLabel") ||
      !screenText.includes(
        "testID={`app-store-reviewer-note-${section.id}`}",
      ) ||
      !screenText.includes(
        'testID="app-store-reviewer-note-blocked-submission"',
      ) ||
      !screenText.includes(
        "readiness.reviewerNotePacket.blockedSubmissionLabel",
      ),
    findings,
    "App Store showcase screen must render the reviewer notes packet with stable automation IDs, no-secret boundary, section evidence, and blocked submission language.",
  );
  pushIf(
    !screenText.includes('testID="app-store-maintainability-runway"') ||
      !screenText.includes("readiness.maintainabilityRunway.title") ||
      !screenText.includes("readiness.maintainabilityRunway.slices.map") ||
      !screenText.includes("slice.commandLabel") ||
      !screenText.includes("slice.reviewBoundaryLabel") ||
      !screenText.includes("slice.acceptanceLabel") ||
      !screenText.includes(
        "testID={`app-store-maintainability-slice-${slice.id}`}",
      ) ||
      !screenText.includes('testID="app-store-maintainability-merge-policy"'),
    findings,
    "App Store showcase screen must render the maintainability runway with stable automation IDs, slice checks, review boundaries, acceptance labels, and merge policy.",
  );
  pushIf(
    !screenText.includes('testID="app-store-post-launch-watch-plan"') ||
      !screenText.includes("readiness.postLaunchWatchPlan.title") ||
      !screenText.includes("readiness.postLaunchWatchPlan.tasks.map") ||
      !screenText.includes("task.signalLabel") ||
      !screenText.includes("task.commandLabel") ||
      !screenText.includes("task.escalationLabel") ||
      !screenText.includes(
        "testID={`app-store-post-launch-watch-${task.id}`}",
      ) ||
      !screenText.includes('testID="app-store-post-launch-hold-boundary"'),
    findings,
    "App Store showcase screen must render the post-release watch plan with stable automation IDs, signals, check commands, escalation labels, and hold boundary.",
  );
  pushIf(
    !screenText.includes(
      'testID="app-store-release-blocker-resolution-plan"',
    ) ||
      !screenText.includes("readiness.releaseBlockerResolutionPlan.title") ||
      !screenText.includes(
        "readiness.releaseBlockerResolutionPlan.summaryLabel",
      ) ||
      !screenText.includes(
        "readiness.releaseBlockerResolutionPlan.firstActionLabel",
      ) ||
      !screenText.includes(
        "readiness.releaseBlockerResolutionPlan.screenshotBoundaryLabel",
      ) ||
      !screenText.includes(
        "readiness.releaseBlockerResolutionPlan.noSecretBoundaryLabel",
      ) ||
      !screenText.includes("readiness.releaseBlockerResolutionPlan.rows.map") ||
      !screenText.includes(
        "testID={`app-store-release-blocker-resolution-${row.id}`}",
      ) ||
      !screenText.includes("row.dependencyLabel") ||
      !screenText.includes("row.ownerLabel") ||
      !screenText.includes("row.proofCommandLabel") ||
      !screenText.includes("row.acceptanceLabel") ||
      !screenText.includes("row.noSecretBoundaryLabel") ||
      !screenText.includes(
        'testID="app-store-release-blocker-resolution-boundary"',
      ) ||
      !screenText.includes(
        "readiness.releaseBlockerResolutionPlan.evidenceBoundaryLabel",
      ),
    findings,
    "App Store showcase screen must render the release blocker resolution plan with stable automation IDs, sequenced rows, proof commands, acceptance labels, and no-secret boundaries.",
  );
  pushIf(
    readiness.storyArc.length < 5,
    findings,
    "Showcase readiness must define a screenshot story arc.",
  );
  pushIf(
    readiness.truthRules.length < 3,
    findings,
    "Showcase readiness must define truthful capture rules.",
  );
  pushIf(
    readiness.requiredDeviceFrames.length < 3,
    findings,
    "Showcase readiness must include required device frame coverage.",
  );
  pushIf(
    !readiness.requiredDeviceFrames.includes("6.9 inch"),
    findings,
    "Showcase readiness must include the current 6.9 inch iPhone capture family.",
  );
  pushIf(
    readiness.captureRunbook.length < 3,
    findings,
    "Showcase readiness must include a capture runbook.",
  );
  pushIf(
    readiness.captureQualityGates.length !== readiness.qaGateCount,
    findings,
    "Showcase readiness qaGateCount must match the QA gate list.",
  );
  for (const requiredGateId of ["viewport", "truth", "privacy", "blockers"]) {
    pushIf(
      !readiness.captureQualityGates.some((gate) => gate.id === requiredGateId),
      findings,
      `Showcase readiness is missing QA gate "${requiredGateId}".`,
    );
  }
  pushIf(
    readiness.releaseBlockerLabels.length < 4 ||
      !readiness.releaseBlockerLabels.includes("deployed-runtime-url") ||
      !readiness.releaseBlockerLabels.includes("production-database-url") ||
      !readiness.releaseBlockerLabels.includes(
        "source-pack-activation-readiness",
      ) ||
      !readiness.releaseBlockerLabels.includes("library-human-review-evidence"),
    findings,
    "Showcase readiness must keep release blockers visible during capture planning.",
  );
  const launchBlockerHandoff = buildAppStoreLaunchBlockerHandoff(
    readiness.releaseBlockerLabels,
  );
  const releaseBlockerResolutionPlan =
    buildAppStoreReleaseBlockerResolutionPlan(launchBlockerHandoff);
  const releaseBlockerResolutionShareText =
    buildAppStoreReleaseBlockerResolutionShareText(
      releaseBlockerResolutionPlan,
    );
  const releaseEvidenceIntakePacket =
    buildAppStoreReleaseEvidenceIntakePacket(launchBlockerHandoff);
  pushIf(
    !readiness.launchEvidenceSprint ||
      readiness.launchEvidenceSprint.tasks.length !==
        readiness.releaseBlockerLabels.length ||
      !readiness.launchEvidenceSprint.statusLabel.includes(
        "launch evidence gate",
      ) ||
      !readiness.launchEvidenceSprint.captureBoundaryLabel.includes(
        "Screenshot capture can continue",
      ) ||
      !readiness.launchEvidenceSprint.librarySprintBridgeLabel.includes(
        "share the review sprint plan",
      ) ||
      !readiness.launchEvidenceSprint.tasks.every(
        (task) =>
          readiness.releaseBlockerLabels.includes(task.id) &&
          task.ownerLabel.length > 32 &&
          task.actionLabel.length > 48 &&
          task.proofLabel.includes("npm run") &&
          task.boundaryLabel.length > 48,
      ),
    findings,
    "Showcase readiness must expose a launch evidence sprint that separates screenshot capture from deployed runtime, production DB, AI source-pack activation, and Library human-review proof.",
  );
  pushIf(
    readiness.launchBlockerHandoff.length !==
      readiness.releaseBlockerLabels.length ||
      launchBlockerHandoff.length !== readiness.launchBlockerHandoff.length ||
      !readiness.launchBlockerHandoff.every(
        (blocker) =>
          blocker.ownerLabel.length > 32 &&
          blocker.nextActionLabel.length > 48 &&
          blocker.proofCommandLabel.includes("npm run") &&
          blocker.evidenceBoundaryLabel.length > 48 &&
          blocker.acceptanceChecklist.length >= 3 &&
          blocker.acceptanceChecklist.every((item) => item.length > 42) &&
          blocker.noSecretBoundaryLabel.length > 48,
      ),
    findings,
    "Showcase readiness must expose actionable launch blocker handoff rows with owner, proof command, acceptance criteria, evidence boundary, and no-secret boundary.",
  );
  pushIf(
    readiness.releaseEvidenceIntakePacket.rows.length !==
      readiness.releaseBlockerLabels.length ||
      releaseEvidenceIntakePacket.rows.length !==
        readiness.releaseEvidenceIntakePacket.rows.length ||
      !readiness.releaseEvidenceIntakePacket.statusLabel.includes(
        "proof record",
      ) ||
      !readiness.releaseEvidenceIntakePacket.summaryLabel.includes(
        "redacted command results",
      ) ||
      !readiness.releaseEvidenceIntakePacket.schemaBoundaryLabel.includes(
        "summary JSON or SHA-256",
      ) ||
      !readiness.releaseEvidenceIntakePacket.ownerBoundaryLabel.includes(
        "production host",
      ) ||
      !readiness.releaseEvidenceIntakePacket.noSecretBoundaryLabel.includes(
        "service role keys",
      ) ||
      !readiness.releaseEvidenceIntakePacket.rows.some(
        (row) =>
          row.id === "deployed-runtime-url" &&
          row.gateLabel.includes("evidence.verified"),
      ) ||
      !readiness.releaseEvidenceIntakePacket.rows.some(
        (row) =>
          row.id === "production-database-url" &&
          row.requiredCommandLabel.includes("DATABASE_URL=postgresql://..."),
      ) ||
      !readiness.releaseEvidenceIntakePacket.rows.some(
        (row) =>
          row.id === "source-pack-activation-readiness" &&
          row.gateLabel.includes("source-pack-activation-readiness") &&
          row.requiredCommandLabel.includes(
            "check:source-pack-final-readiness",
          ),
      ) ||
      !readiness.releaseEvidenceIntakePacket.rows.some(
        (row) =>
          row.id === "library-human-review-evidence" &&
          row.gateLabel.includes("library-content-completion"),
      ) ||
      !readiness.releaseEvidenceIntakePacket.rows.every(
        (row) =>
          row.ownerLabel.length > 32 &&
          row.evidenceRecordLabel.includes("exitCode 0") &&
          row.nonSecretNotesPrompt.length > 72 &&
          row.acceptanceSummaryLabel.length > 72 &&
          row.noSecretBoundaryLabel.length > 48,
      ),
    findings,
    "Showcase readiness must expose a release evidence intake packet with exact gate mapping, redacted command-record schema, owners, non-secret notes prompts, and no-secret boundaries.",
  );
  pushIf(
    readiness.releaseBlockerResolutionPlan.rows.length !==
      readiness.releaseBlockerLabels.length ||
      releaseBlockerResolutionPlan.rows.length !==
        readiness.releaseBlockerResolutionPlan.rows.length ||
      !readiness.releaseBlockerResolutionPlan.statusLabel.includes(
        "launch blocker",
      ) ||
      !readiness.releaseBlockerResolutionPlan.statusLabel.includes(
        "sequenced",
      ) ||
      !readiness.releaseBlockerResolutionPlan.summaryLabel.includes(
        "Resolve blockers in this order",
      ) ||
      !readiness.releaseBlockerResolutionPlan.summaryLabel.includes(
        "without mixing screenshots",
      ) ||
      !readiness.releaseBlockerResolutionPlan.firstActionLabel.includes(
        launchBlockerHandoff[0]?.nextActionLabel ?? "No launch blockers",
      ) ||
      !readiness.releaseBlockerResolutionPlan.screenshotBoundaryLabel.includes(
        "Screenshot capture can continue",
      ) ||
      !readiness.releaseBlockerResolutionPlan.evidenceBoundaryLabel.includes(
        "redacted command output",
      ) ||
      !readiness.releaseBlockerResolutionPlan.noSecretBoundaryLabel.includes(
        "DATABASE_URL",
      ) ||
      readiness.releaseBlockerResolutionPlan.rows[0]?.id !==
        "deployed-runtime-url" ||
      !readiness.releaseBlockerResolutionPlan.rows.every(
        (row, index) =>
          row.orderLabel ===
            `Step ${index + 1} of ${readiness.releaseBlockerResolutionPlan.rows.length}` &&
          row.dependencyLabel.length > 64 &&
          row.ownerLabel.length > 32 &&
          row.unblockActionLabel.length > 48 &&
          row.proofCommandLabel.includes("npm run") &&
          row.acceptanceLabel.length > 72 &&
          row.noSecretBoundaryLabel.length > 48,
      ),
    findings,
    "Showcase readiness must expose a sequenced release blocker resolution plan with dependencies, first action, proof commands, acceptance criteria, screenshot boundary, evidence boundary, and no-secret language.",
  );
  pushIf(
    !releaseBlockerResolutionShareText.includes(
      "NurAI release blocker resolution packet",
    ) ||
      !releaseBlockerResolutionShareText.includes("Sequenced blocker plan:") ||
      !releaseBlockerResolutionShareText.includes("Proof command:") ||
      !releaseBlockerResolutionShareText.includes("No-secret boundary:") ||
      !releaseBlockerResolutionShareText.includes("not App Review approval") ||
      !releaseBlockerResolutionShareText.includes(
        "not production runtime proof",
      ) ||
      !releaseBlockerResolutionShareText.includes("not database proof"),
    findings,
    "Release blocker resolution share text must include ordered owner actions, proof commands, no-secret boundaries, and non-proof wording.",
  );
  pushIf(
    readiness.maintainabilityRunway.slices.length !== 6 ||
      maintainabilityRunway.slices.length !==
        readiness.maintainabilityRunway.slices.length ||
      !readiness.maintainabilityRunway.statusLabel.includes(
        "logical review slices",
      ) ||
      !readiness.maintainabilityRunway.summaryLabel.includes(
        "risky mega-commit",
      ) ||
      !readiness.maintainabilityRunway.noSecretBoundaryLabel.includes(
        "DATABASE_URL",
      ) ||
      !readiness.maintainabilityRunway.blockerBoundaryLabel.includes(
        "Release claims remain blocked",
      ) ||
      !readiness.maintainabilityRunway.mergePolicyLabel.includes(
        "focused check command",
      ) ||
      !readiness.maintainabilityRunway.slices.some(
        (slice) => slice.id === "quran-home",
      ) ||
      !readiness.maintainabilityRunway.slices.some(
        (slice) => slice.id === "ai-trust",
      ) ||
      !readiness.maintainabilityRunway.slices.some(
        (slice) => slice.id === "backend-database-deployment",
      ) ||
      !readiness.maintainabilityRunway.slices.every(
        (slice) =>
          slice.commandLabel.includes("npm run check:logical-slice --") &&
          slice.ownerLabel.length >= 18 &&
          slice.reviewBoundaryLabel.length >= 64 &&
          slice.acceptanceLabel.length >= 64,
      ),
    findings,
    "Showcase readiness must expose a maintainability runway with six logical slices, owner labels, focused checks, review boundaries, no-secret boundary, and external blocker boundary.",
  );
  pushIf(
    readiness.postLaunchWatchPlan.tasks.length !== 6 ||
      postLaunchWatchPlan.tasks.length !==
        readiness.postLaunchWatchPlan.tasks.length ||
      !readiness.postLaunchWatchPlan.statusLabel.includes("pre-launch gate") ||
      !readiness.postLaunchWatchPlan.summaryLabel.includes("crash/vitals") ||
      !readiness.postLaunchWatchPlan.cadenceLabel.includes("launch day") ||
      !readiness.postLaunchWatchPlan.noSecretBoundaryLabel.includes(
        "database URLs",
      ) ||
      !readiness.postLaunchWatchPlan.holdLaunchBoundaryLabel.includes(
        "Do not start this as a success watch",
      ) ||
      !readiness.postLaunchWatchPlan.tasks.some(
        (task) => task.id === "deployed-ai-smoke",
      ) ||
      !readiness.postLaunchWatchPlan.tasks.some(
        (task) => task.id === "production-db-migrations",
      ) ||
      !readiness.postLaunchWatchPlan.tasks.some(
        (task) => task.id === "crash-vitals",
      ) ||
      !readiness.postLaunchWatchPlan.tasks.some(
        (task) => task.id === "library-review-drift",
      ) ||
      !readiness.postLaunchWatchPlan.tasks.every(
        (task) =>
          task.ownerLabel.length >= 14 &&
          task.signalLabel.length >= 72 &&
          task.commandLabel.includes("npm run") &&
          task.escalationLabel.length >= 72,
      ),
    findings,
    "Showcase readiness must expose a post-release watch plan with six owner tasks, cadence, no-secret boundary, hold-launch boundary, signals, commands, and escalation labels.",
  );
  const homeScene = scenes.find((scene) => scene.id === "home");
  pushIf(
    !homeScene ||
      !homeScene.captureChecklist.includes(
        "Search sits below Today’s Deen as a compact support action",
      ) ||
      !homeScene.trustSignal.includes("Search supports the worship home") ||
      !homeScene.firstViewportSignal.includes("visible before search") ||
      !homeScene.captureProof.retakeIf.includes("appears above Today’s Deen") ||
      !homeScene.captureProof.retakeIf.includes("duplicates in the header"),
    findings,
    "Home App Store capture plan must keep search below Today Deen as a compact support action.",
  );

  for (const scene of scenes) {
    const textBundle = [
      scene.title,
      scene.caption,
      scene.captureLine,
      scene.appStoreCaption,
      scene.screenshotHeadline,
      scene.screenshotSubhead,
      scene.audience,
      scene.trustSignal,
      scene.deviceFrame,
      scene.firstViewportSignal,
      scene.captureStateLabel,
      scene.blockerGuardrail,
      scene.primaryActionLabel,
      scene.captureProof.storePromise,
      scene.captureProof.requiredVisualProof,
      scene.captureProof.validationQuestion,
      scene.captureProof.safeDemoState,
      scene.captureProof.retakeIf,
      ...scene.proof,
      ...scene.captureChecklist,
    ].join("\n");

    pushIf(
      !routeNames.has(scene.route),
      findings,
      `${scene.title}: route "${scene.route}" is not registered in RootStackNavigator.`,
    );
    pushIf(
      scene.proof.length < 3,
      findings,
      `${scene.title}: each scene needs at least three proof chips for screenshot planning.`,
    );
    pushIf(
      scene.captureChecklist.length < 3,
      findings,
      `${scene.title}: each scene needs at least three capture checklist items.`,
    );
    pushIf(
      scene.caption.length < 24 || scene.captureLine.length < 24,
      findings,
      `${scene.title}: caption and capture line must be descriptive enough for screenshot planning.`,
    );
    pushIf(
      scene.appStoreCaption.length < 24 ||
        scene.screenshotHeadline.length < 18 ||
        scene.screenshotSubhead.length < 32,
      findings,
      `${scene.title}: store caption, screenshot headline, and subhead must be descriptive enough for App Store planning.`,
    );
    pushIf(
      scene.audience.length < 8 || scene.trustSignal.length < 18,
      findings,
      `${scene.title}: audience and trust signal must be explicit.`,
    );
    pushIf(
      !scene.primaryActionLabel.startsWith("Open "),
      findings,
      `${scene.title}: primary action label must be a concrete Open action.`,
    );
    pushIf(
      scene.capturePriority < 1 || scene.capturePriority > scenes.length,
      findings,
      `${scene.title}: capture priority must stay inside the scene count.`,
    );
    pushIf(
      !readiness.requiredDeviceFrames.includes(scene.deviceFrame),
      findings,
      `${scene.title}: device frame must be one of the required capture frames.`,
    );
    pushIf(
      scene.firstViewportSignal.length < 32 ||
        scene.captureStateLabel.length < 24 ||
        scene.blockerGuardrail.length < 32,
      findings,
      `${scene.title}: capture runbook fields must be specific enough for App Store capture.`,
    );
    pushIf(
      scene.captureProof.storePromise.length < 24 ||
        scene.captureProof.requiredVisualProof.length < 32 ||
        scene.captureProof.validationQuestion.length < 32 ||
        scene.captureProof.safeDemoState.length < 32 ||
        scene.captureProof.retakeIf.length < 24,
      findings,
      `${scene.title}: claim proof ledger must define promise, visual proof, validation question, demo state, and retake condition.`,
    );
    pushIf(
      !readiness.claimValidationQuestions.includes(
        scene.captureProof.validationQuestion,
      ),
      findings,
      `${scene.title}: claim validation question must be exposed in readiness.`,
    );
    const routeProof = readiness.captureRouteProofs.find(
      (proof) => proof.id === scene.id,
    );
    const captureMatrixRow = readiness.captureMatrix.find(
      (row) => row.id === scene.id,
    );
    const claimSafetyReceipt = readiness.claimSafetyReceipts.find(
      (receipt) => receipt.id === scene.id,
    );
    const screenshotReadinessContract =
      readiness.screenshotReadinessContracts.find(
        (contract) => contract.id === scene.id,
      );
    const screenshotProofScene = readiness.screenshotSetProofPack.scenes.find(
      (proofScene) => proofScene.id === scene.id,
    );
    pushIf(
      !routeProof,
      findings,
      `${scene.title}: route proof packet must be exposed in readiness.`,
    );
    if (routeProof) {
      pushIf(
        routeProof.routeName !== scene.route,
        findings,
        `${scene.title}: route proof route must match scene route.`,
      );
      pushIf(
        routeProof.routeParamsLabel.length < 16 ||
          routeProof.screenEvidence !== scene.firstViewportSignal ||
          routeProof.demoStateBoundary !== scene.captureStateLabel ||
          routeProof.navigationGuardrail !== scene.blockerGuardrail ||
          routeProof.auditQuestion.length < 42,
        findings,
        `${scene.title}: route proof must include params, screen evidence, demo state boundary, guardrail, and audit question.`,
      );
      pushIf(
        !readiness.captureRouteAuditQuestions.includes(
          routeProof.auditQuestion,
        ),
        findings,
        `${scene.title}: route audit question must be exposed in readiness.`,
      );
    }
    pushIf(
      !captureMatrixRow,
      findings,
      `${scene.title}: capture matrix row must be exposed in readiness.`,
    );
    if (captureMatrixRow) {
      pushIf(
        captureMatrixRow.priority !== scene.capturePriority ||
          captureMatrixRow.routeName !== scene.route ||
          captureMatrixRow.deviceFrame !== scene.deviceFrame ||
          captureMatrixRow.firstViewportSignal !== scene.firstViewportSignal ||
          captureMatrixRow.trustBoundary !== scene.blockerGuardrail ||
          captureMatrixRow.retakeRisk !== scene.captureProof.retakeIf,
        findings,
        `${scene.title}: capture matrix must include priority, route, frame, viewport proof, boundary, and retake risk.`,
      );
    }
    pushIf(
      !claimSafetyReceipt,
      findings,
      `${scene.title}: claim safety receipt must be exposed in readiness.`,
    );
    pushIf(
      !screenshotReadinessContract,
      findings,
      `${scene.title}: screenshot readiness contract must be exposed in readiness.`,
    );
    pushIf(
      !screenshotProofScene,
      findings,
      `${scene.title}: screenshot proof pack row must be exposed in readiness.`,
    );
    if (screenshotProofScene) {
      pushIf(
        screenshotProofScene.orderLabel !==
          `Shot ${scene.capturePriority} of ${scenes.length}` ||
          !screenshotProofScene.valueProofLabel.includes(
            scene.captureProof.requiredVisualProof,
          ) ||
          !screenshotProofScene.trustProofLabel.includes(scene.trustSignal) ||
          !screenshotProofScene.routeLabel.includes(scene.route) ||
          !screenshotProofScene.retakeLabel.includes(
            scene.captureProof.retakeIf,
          ) ||
          screenshotProofScene.heroCandidate !== scene.capturePriority <= 4,
        findings,
        `${scene.title}: screenshot proof pack row must map priority, value proof, trust proof, route, retake rule, and hero-slot status to the scene.`,
      );
    }
    if (screenshotReadinessContract) {
      pushIf(
        screenshotReadinessContract.routeName !== scene.route ||
          screenshotReadinessContract.nextActionLabel !==
            scene.primaryActionLabel ||
          !screenshotReadinessContract.priorityLabel.includes(
            String(scene.capturePriority),
          ) ||
          !screenshotReadinessContract.items.some(
            (item) =>
              item.id === "viewport" &&
              item.evidenceLabel === scene.firstViewportSignal,
          ) ||
          !screenshotReadinessContract.items.some(
            (item) =>
              item.id === "trust" && item.evidenceLabel === scene.trustSignal,
          ) ||
          !screenshotReadinessContract.items.some(
            (item) =>
              item.id === "demo_state" &&
              item.evidenceLabel === scene.captureProof.safeDemoState,
          ) ||
          !screenshotReadinessContract.items.some(
            (item) =>
              item.id === "route" && item.evidenceLabel.includes(scene.route),
          ) ||
          !screenshotReadinessContract.items.some(
            (item) =>
              item.id === "retake" &&
              item.evidenceLabel === scene.captureProof.retakeIf,
          ),
        findings,
        `${scene.title}: screenshot readiness contract must map route, action, priority, viewport, trust, demo state, route proof, and retake evidence to the scene.`,
      );
    }
    if (claimSafetyReceipt) {
      pushIf(
        claimSafetyReceipt.publicClaimLabel !==
          scene.captureProof.storePromise ||
          claimSafetyReceipt.evidenceStateLabel !==
            scene.captureProof.requiredVisualProof ||
          claimSafetyReceipt.sourceBoundaryLabel !== scene.blockerGuardrail ||
          !claimSafetyReceipt.blockedClaimLabel.startsWith("Blocked claim:") ||
          !readiness.claimSafetyQuestions.includes(
            claimSafetyReceipt.approvalQuestion,
          ) ||
          !claimSafetyReceipt.releaseUseLabel.includes("not production launch"),
        findings,
        `${scene.title}: claim safety receipt must map the public claim, visible evidence, boundary, blocked claim, approval question, and release-use limit.`,
      );
    }
    pushIf(
      bannedOverclaimPattern.test(textBundle),
      findings,
      `${scene.title}: remove unsupported release/scholar-review overclaim language.`,
    );
  }

  for (const requiredSnippet of [
    'testID="button-showcase-back"',
    "APP_STORE_SHOWCASE_SCENES.map",
    "testID={`button-showcase-shot-${shot.id}`}",
    "accessibilityLabel={`Open ${shot.title} screenshot scene`}",
    "accessibilityHint={shot.captureLine}",
    "Capture planner",
    "Screenshot story arc",
    "Screenshot QA gates",
    "app-store-screenshot-qa-gates",
    "readiness.captureQualityGates.map",
    "testID={`app-store-qa-gate-${gate.id}`}",
    "{gate.passLabel}",
    "{gate.failState}",
    "Capture status matrix",
    "app-store-capture-status-matrix",
    "readiness.captureMatrix.map",
    "testID={`app-store-capture-matrix-${row.id}`}",
    "app-store-capture-decision-summary",
    "readiness.captureDecisionSummary.captureStatusLabel",
    "readiness.captureDecisionSummary.launchStatusLabel",
    "readiness.captureDecisionSummary.blockedLaunchReason",
    "readiness.captureDecisionSummary.blockerLabels.map",
    "Submission readiness passport",
    'testID="app-store-submission-readiness-passport"',
    "readiness.submissionReadinessPassport.statusLabel",
    "readiness.submissionReadinessPassport.summaryLabel",
    "readiness.submissionReadinessPassport.rows.map",
    "testID={`app-store-submission-passport-${row.id}`}",
    "row.nextActionLabel",
    "readiness.submissionReadinessPassport.screenshotBoundaryLabel",
    "readiness.submissionReadinessPassport.submissionBoundaryLabel",
    "readiness.submissionReadinessPassport.noSecretLabel",
    "DecisionProofLine",
    "Platform asset requirements",
    'testID="app-store-platform-asset-requirements"',
    "readiness.platformAssetRequirements.map",
    "testID={`app-store-platform-asset-${requirement.id}`}",
    "requirement.assetCountLabel",
    "requirement.formatLabel",
    "requirement.captureImplicationLabel",
    "requirement.firstViewportRuleLabel",
    "requirement.noGoLabel",
    "requirement.sourceLabel",
    "requirement.sourceUrl",
    "requirement.sourceCheckedLabel",
    "requirement.sourceRequirementLabel",
    "requirement.accessibilityAltTextLabel",
    "requirement.complianceBoundaryLabel",
    "testID={`app-store-platform-source-ledger-${requirement.id}`}",
    "readiness.storeAssetComplianceQuestions.map",
    "Launch evidence sprint",
    'testID="app-store-launch-evidence-sprint"',
    "readiness.launchEvidenceSprint.statusLabel",
    "readiness.launchEvidenceSprint.captureBoundaryLabel",
    "readiness.launchEvidenceSprint.librarySprintBridgeLabel",
    "readiness.launchEvidenceSprint.tasks.map",
    "testID={`app-store-launch-evidence-task-${task.id}`}",
    "{task.actionLabel}",
    "{task.proofLabel}",
    "{task.boundaryLabel}",
    'testID="app-store-launch-evidence-sprint-boundary"',
    "Launch blocker handoff",
    'testID="app-store-launch-blocker-handoff"',
    "readiness.launchBlockerHandoff.map",
    "testID={`app-store-launch-blocker-${blocker.id}`}",
    "{blocker.ownerLabel}",
    "{blocker.nextActionLabel}",
    "{blocker.proofCommandLabel}",
    "testID={`app-store-launch-blocker-acceptance-${blocker.id}`}",
    "blocker.acceptanceChecklist.map",
    "{blocker.evidenceBoundaryLabel}",
    "{blocker.noSecretBoundaryLabel}",
    "Release evidence intake packet",
    'testID="app-store-release-evidence-intake"',
    "readiness.releaseEvidenceIntakePacket.title",
    "readiness.releaseEvidenceIntakePacket.summaryLabel",
    "readiness.releaseEvidenceIntakePacket.schemaBoundaryLabel",
    "readiness.releaseEvidenceIntakePacket.ownerBoundaryLabel",
    "readiness.releaseEvidenceIntakePacket.noSecretBoundaryLabel",
    "readiness.releaseEvidenceIntakePacket.rows.map",
    "testID={`app-store-release-evidence-intake-${row.id}`}",
    "row.gateLabel",
    "row.requiredCommandLabel",
    "row.evidenceRecordLabel",
    "row.nonSecretNotesPrompt",
    "testID={`app-store-release-evidence-no-secret-${row.id}`}",
    'testID="app-store-release-blocker-resolution-plan"',
    "readiness.releaseBlockerResolutionPlan.title",
    "readiness.releaseBlockerResolutionPlan.summaryLabel",
    "readiness.releaseBlockerResolutionPlan.firstActionLabel",
    "readiness.releaseBlockerResolutionPlan.screenshotBoundaryLabel",
    "readiness.releaseBlockerResolutionPlan.noSecretBoundaryLabel",
    "readiness.releaseBlockerResolutionPlan.rows.map",
    "testID={`app-store-release-blocker-resolution-${row.id}`}",
    "row.dependencyLabel",
    "row.ownerLabel",
    "row.proofCommandLabel",
    "row.acceptanceLabel",
    "row.noSecretBoundaryLabel",
    'testID="app-store-release-blocker-resolution-boundary"',
    "readiness.releaseBlockerResolutionPlan.evidenceBoundaryLabel",
    'testID="app-store-capture-command-rail"',
    "CAPTURE COMMAND RAIL",
    "Run the screenshot session from here",
    "blockers separate from screenshot readiness",
    'testID="button-app-store-command-next-shot"',
    'testID="button-app-store-command-share-capture-handoff"',
    'testID="button-app-store-command-share-blocker-packet"',
    'testID="button-app-store-command-share-reviewer-notes"',
    "function CaptureCommand",
    "buildAppStoreReviewerNoteShareText",
    "shareReviewerNotes",
    "app-store-capture-session-plan",
    "readiness.captureSessionPlan.title",
    "readiness.captureSessionPlan.nextSceneTitle",
    "readiness.captureSessionPlan.estimatedMinutesLabel",
    "readiness.captureSessionPlan.sessionBoundaryLabel",
    "readiness.captureSessionPlan.privacyBoundaryLabel",
    "readiness.captureSessionPlan.retakeBoundaryLabel",
    "readiness.captureSessionPlan.batches.map",
    "testID={`app-store-capture-session-batch-${batch.deviceFrame}`}",
    "readiness.captureSessionPlan.nextSceneRouteName",
    'testID="button-app-store-open-next-capture"',
    "Open next App Store capture scene",
    "{row.priority}",
    "{row.routeName}",
    "{row.deviceFrame}",
    "{row.firstViewportSignal}",
    "{row.trustBoundary}",
    "{row.retakeRisk}",
    "Demo data safety ledger",
    'testID="app-store-demo-data-safety-ledger"',
    "readiness.demoDataSafetyRules.map",
    "rule.neverShowLabel",
    "rule.preCaptureCheckLabel",
    "testID={`app-store-demo-safety-${rule.id}`}",
    "Screenshot proof pack",
    'testID="app-store-screenshot-proof-pack"',
    "readiness.screenshotSetProofSceneCount",
    "readiness.screenshotSetProofPack.summaryLabel",
    "readiness.screenshotSetProofPack.firstFourBoundaryLabel",
    "readiness.screenshotSetProofPack.submissionBoundaryLabel",
    "readiness.screenshotSetProofPack.noSecretBoundaryLabel",
    "readiness.screenshotSetProofPack.scenes.map",
    "testID={`app-store-screenshot-proof-${scene.id}`}",
    "{scene.appStoreSlotLabel}",
    "{scene.valueProofLabel}",
    "{scene.trustProofLabel}",
    "{scene.routeLabel}",
    "{scene.retakeLabel}",
    "readiness.screenshotSetProofPack.retakeBoundaryLabel",
    "Screenshot readiness contracts",
    'testID="app-store-screenshot-readiness-contracts"',
    "readiness.screenshotReadinessContractCount",
    "readiness.screenshotReadinessContracts.map",
    "testID={`app-store-screenshot-readiness-${contract.id}`}",
    "contract.statusLabel",
    "contract.priorityLabel",
    "contract.routeName",
    "contract.items.map",
    "testID={`app-store-screenshot-readiness-${contract.id}-${item.id}`}",
    "item.evidenceLabel",
    "item.boundaryLabel",
    "contract.boundaryLabel",
    "contract.nextActionLabel",
    "Claim safety receipts",
    'testID="app-store-claim-safety-receipts"',
    "readiness.claimSafetyReceipts.map",
    "testID={`app-store-claim-safety-${receipt.id}`}",
    "value={receipt.publicClaimLabel}",
    "value={receipt.evidenceStateLabel}",
    "value={receipt.sourceBoundaryLabel}",
    "value={receipt.blockedClaimLabel}",
    "value={receipt.approvalQuestion}",
    "value={receipt.releaseUseLabel}",
    "Listing pack",
    "listingMetadataSectionCount",
    "Store listing metadata pack",
    'testID="app-store-listing-metadata-pack"',
    "readiness.listingMetadataPack.releaseBoundaryLabel",
    "readiness.listingMetadataPack.reviewBoundaryLabel",
    "readiness.listingMetadataPack.localizationBoundaryLabel",
    "readiness.listingMetadataPack.sections.map",
    "testID={`app-store-listing-metadata-${section.id}`}",
    "section.valueLabel",
    "section.approvalQuestion",
    "section.blockedLanguageLabel",
    "Claim proof ledger",
    "app-store-claim-proof-ledger",
    "testID={`app-store-proof-ledger-${shot.id}`}",
    "Route proof ledger",
    "app-store-route-proof-ledger",
    "readiness.captureRouteProofs.map",
    "testID={`app-store-route-proof-${routeProof.id}`}",
    "{routeProof.routeName}",
    "{routeProof.routeParamsLabel}",
    "{routeProof.screenEvidence}",
    "{routeProof.auditQuestion}",
    "STORE CLAIM PROOF",
    "{shot.captureProof.storePromise}",
    "{shot.captureProof.validationQuestion}",
    "{shot.captureProof.requiredVisualProof}",
    "{shot.captureProof.safeDemoState}",
    "{shot.captureProof.retakeIf}",
    "CLAIM SAFETY RECEIPT",
    "testID={`app-store-shot-claim-receipt-${shot.id}`}",
    "readiness.claimSafetyReceiptCount",
    "APP STORE LINE",
    "{shot.screenshotHeadline}",
    "{shot.trustSignal}",
    "{shot.deviceFrame}",
    "{shot.firstViewportSignal}",
    "{shot.captureStateLabel}",
    "{shot.blockerGuardrail}",
    "{shot.primaryActionLabel}",
    "buildAppStoreShowcaseCaptureHandoffText",
    "buildAppStoreReleaseBlockerResolutionShareText",
    "shareReleaseBlockerResolution",
    "Share release blocker resolution packet",
    'testID="button-app-store-share-release-blocker-resolution"',
    "Shares sequenced release owner actions, proof commands, acceptance checks, and no-secret boundaries.",
    "Share capture handoff",
    'testID="button-app-store-share-capture-handoff"',
    "Share.share",
    "scenes, QA gates, retake rules, and release blocker boundaries",
  ]) {
    pushIf(
      !screenText.includes(requiredSnippet),
      findings,
      `AppStoreShowcaseScreen is missing ${requiredSnippet}.`,
    );
  }

  for (const requiredSnippet of [
    "Use real app data only",
    "Avoid empty states in the first viewport",
    "Keep source/review labels truthful",
    "Capture iPhone 6.9 and 6.5 inch frames",
    "Confirm first viewport contains the listed signal before taking the screenshot.",
    "Retake any shot where source, review, location, privacy, or official-service boundaries are hidden.",
    "The first screenshot area must show the scene headline",
    "Source, review, location, official-service, or educational boundaries must be visible",
    "Use clean demo content only",
    "Capture-ready screenshots can be prepared now",
    "proofLedgerCount",
    "routeProofCount",
    "claimValidationQuestions",
    "claimSafetyReceiptCount",
    "claimSafetyReceipts",
    "claimSafetyQuestions",
    "screenshotReadinessContractCount",
    "screenshotReadinessContracts",
    "screenshotSetProofSceneCount",
    "screenshotSetProofPack",
    "export type AppStoreSceneScreenshotReadinessContract",
    "export type AppStoreSceneScreenshotReadinessItem",
    "export type AppStoreScreenshotSetProofPack",
    "export type AppStoreScreenshotSetProofScene",
    "buildAppStoreScreenshotReadinessContracts",
    "buildAppStoreScreenshotSetProofPack",
    "Screenshot proof pack:",
    "screenshot candidates mapped with proof boundaries",
    "core product before secondary flows",
    "not App Review submission approval",
    "Screenshot readiness contracts:",
    "Screenshot readiness confirms demo-safe capture only",
    "it does not prove production launch",
    "completed human review",
    "deployed runtime",
    "First viewport",
    "Trust boundary",
    "Demo-safe state",
    "Route proof",
    "Retake rule",
    "Fix ${items.length - completeCount} capture check",
    "listingMetadataSectionCount",
    "listingMetadataPack",
    "platformRequirementCount",
    "platformAssetRequirements",
    "storeAssetComplianceQuestions",
    "export type AppStorePlatformAssetRequirement",
    "sourceUrl: string",
    "sourceCheckedLabel: string",
    "sourceRequirementLabel: string",
    "accessibilityAltTextLabel: string",
    "complianceBoundaryLabel: string",
    "buildAppStorePlatformAssetRequirements",
    "Apple App Store",
    "one to ten JPEG, JPG, or PNG screenshots",
    "6.9 inch portrait assets",
    "https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications",
    "Google Play",
    "at least two screenshots",
    "at least four high-resolution portrait screenshots",
    "24-bit PNG without alpha",
    "https://support.google.com/googleplay/android-developer/answer/9866151",
    "Checked against Google Play preview asset requirements on 2026-06-01.",
    "Google Play asks for screenshot alt text",
    "core app features and functionality",
    "Platform asset requirements:",
    "Store asset compliance questions:",
    "export type AppStoreListingMetadataPack",
    "export type AppStoreListingMetadataItem",
    "buildAppStoreListingMetadataPack",
    "Store listing metadata pack",
    "Draft metadata, honest claims",
    "Store metadata can be prepared now",
    "publishing still needs deployed runtime, production database, AI source-pack activation, and human review evidence",
    "Reviewer notes must explain AI boundaries, scholar packet handoff",
    "Localization should translate benefits and boundaries",
    "not intensify religious authority",
    "Name and subtitle",
    "NurAI: Quran Prayer AI",
    "Muslim habits, duas, Qibla",
    "Promotional copy",
    "Build a calmer daily deen rhythm",
    "Keyword clusters",
    "islam, adhkar, hadith, arabic, tafsir, ramadan",
    "Privacy nutrition",
    "On-device notes, manual exports, no secrets in assets",
    "Reviewer notes",
    "Localization boundary",
    "Store listing metadata pack:",
    "Blocked language:",
    "buildAppStoreReviewerNoteShareText",
    "NurAI App Review notes packet",
    "This packet is for App Review note drafting only.",
    "captureRouteProofs",
    "captureRouteAuditQuestions",
    "captureMatrix",
    "captureSessionPlan",
    "launchBlockerHandoff",
    "export type AppStoreSceneClaimSafetyReceipt",
    "buildAppStoreClaimSafetyReceipts",
    "Blocked claim:",
    "Allowed for screenshot planning only",
    "Claim safety receipts:",
    "export type AppStoreLaunchBlockerHandoff",
    "acceptanceChecklist: string[]",
    "buildAppStoreLaunchBlockerHandoff",
    "export type AppStoreReleaseEvidenceIntakePacket",
    "export type AppStoreReleaseEvidenceIntakeRow",
    "buildAppStoreReleaseEvidenceIntakePacket",
    "export type AppStoreReleaseBlockerResolutionPlan",
    "export type AppStoreReleaseBlockerResolutionRow",
    "buildAppStoreReleaseBlockerResolutionPlan",
    "buildAppStoreReleaseBlockerResolutionShareText",
    "Release blocker resolution plan",
    "Resolve blockers in this order",
    "without mixing screenshots",
    "Each row needs redacted command output",
    "Never include DATABASE_URL values",
    "Release blocker resolution plan:",
    "First action:",
    "Evidence boundary:",
    "No-secret boundary:",
    "NurAI release blocker resolution packet",
    "Release evidence intake packet",
    "proof record${",
    "redacted command results",
    "Every proof record needs current gate status",
    "summary JSON or SHA-256 summary hash",
    "Only the owner with access to the production host",
    "service role keys",
    "library-content-completion needs real review evidence",
    "Record exitCode 0, ranAt",
    "Release evidence intake packet:",
    "Release operator with production host access",
    "Release operator with production Supabase/Postgres access",
    "AI source reviewer, licensing reviewer, and qualified Islamic content reviewer",
    "qualified scholar reviewer for high-care books",
    "Never paste smoke secrets",
    "Do not log, screenshot, or commit the production DATABASE_URL",
    "Do not mark screenshots, generated packets, or draft handoffs as human review evidence.",
    "Production HTTPS host is named in proof notes without secrets.",
    "Dry-run, apply, ownership, release, and migration-applied checks pass.",
    "Sensitive books include qualified scholar scope, date, and notes.",
    "Acceptance:",
    "Launch blocker handoff:",
    "buildAppStoreCaptureSessionPlan",
    "Capture session plan",
    "Capture in priority order",
    "Use demo-safe states only",
    "Retake any screenshot where first-viewport proof",
    "captureDecisionSummary",
    "buildAppStoreCaptureDecisionSummary",
    "submissionReadinessPassport",
    "export type AppStoreSubmissionReadinessPassport",
    "export type AppStoreSubmissionReadinessPassportRow",
    "buildAppStoreSubmissionReadinessPassport",
    "Submission readiness passport",
    "Submission blocked by launch proof",
    "Screenshots and store metadata may be prepared as demo-safe assets only.",
    "Do not submit or make launch-ready claims until deployed runtime",
    "Do not put API keys, smoke secrets, database URLs",
    "Submission readiness passport:",
    "Screenshot boundary:",
    "Submission boundary:",
    "launchEvidenceSprint",
    "export type AppStoreLaunchEvidenceSprint",
    "export type AppStoreLaunchEvidenceSprintTask",
    "buildAppStoreLaunchEvidenceSprint",
    "maintainabilityRunway",
    "export type AppStoreMaintainabilityRunway",
    "export type AppStoreMaintainabilitySlice",
    "buildAppStoreMaintainabilityRunway",
    "6 logical review slices mapped before production release evidence",
    "Release claims remain blocked by",
    "Maintainability runway",
    "Maintainability runway:",
    "External blocker boundary:",
    "Merge policy:",
    "postLaunchWatchPlan",
    "export type AppStorePostLaunchWatchPlan",
    "export type AppStorePostLaunchWatchTask",
    "buildAppStorePostLaunchWatchPlan",
    "Post-release watch plan",
    "Post-release watch plan:",
    "Hold-launch boundary:",
    "crash/vitals",
    "Do not start this as a success watch",
    "Use this sprint to assign launch proof work",
    "Screenshot capture can continue only as demo-safe marketing preparation",
    "open Source Trust Review and share the review sprint plan",
    "Launch evidence sprint:",
    "Library sprint bridge:",
    "Capture-ready with QA gates",
    "Launch still blocked by external proof",
    "Do not use screenshots as launch proof",
    "buildAppStoreCaptureMatrix",
    "buildAppStoreCaptureRouteProofs",
    "buildAppStoreShowcaseCaptureHandoffText",
    "No params; open the default populated state.",
    "Does ${scene.route} open with",
    "storePromise",
    "requiredVisualProof",
    "validationQuestion",
    "safeDemoState",
    "retakeIf",
    "Retake if a screenshot could imply a final ruling or completed review evidence.",
    "Retake if any private note, location, child name, or account detail appears.",
    "deployed-runtime-url",
    "production-database-url",
    "library-human-review-evidence",
    "Do not imply every source is scholar-reviewed.",
    "Show official-service boundaries for pilgrimage content.",
    "NurAI App Store screenshot capture handoff",
    "Next capture:",
    "Capture pass:",
    "Capture session plan:",
    "Capture note: this handoff prepares screenshots only.",
    "not production launch evidence",
    "human review evidence",
    "deployed-runtime proof",
  ]) {
    pushIf(
      !serviceText.includes(requiredSnippet),
      findings,
      `App Store capture spec is missing "${requiredSnippet}".`,
    );
  }

  if (findings.length > 0) {
    console.error(
      `App Store showcase release check failed with ${findings.length} finding(s):`,
    );
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exit(1);
  }

  console.log(
    `App Store showcase release check passed: ${scenes.length} scenes, ${readiness.flowCount} flows, ${readiness.trustSceneCount} trust scenes, truthful capture planning verified.`,
  );
}

main();
