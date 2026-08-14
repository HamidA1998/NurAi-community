#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireIncludes(
  findings: string[],
  text: string,
  needle: string,
  message: string,
) {
  if (!text.includes(needle)) findings.push(message);
}

function requireRegex(
  findings: string[],
  text: string,
  regex: RegExp,
  message: string,
) {
  if (!regex.test(text)) findings.push(message);
}

function main() {
  const findings: string[] = [];
  const service = read("client/services/libraryLearningPathService.ts");
  const collectionsService = read(
    "client/services/libraryCollectionsService.ts",
  );
  const screen = read("client/screens/LibraryHomeScreen.tsx");
  const progressService = read("client/services/libraryProgressService.ts");
  const libraryTypes = read("client/types/library.ts");
  const packageJson = read("package.json");

  for (const [needle, message] of [
    [
      "longestStudyStreak: number",
      "Library progress summary must expose longest study streak.",
    ],
    [
      "studyDaysTracked: number",
      "Library progress summary must expose tracked study-day count.",
    ],
    [
      "lastStudyDateLabel: string",
      "Library progress summary must expose last study date labels.",
    ],
    [
      "streakRecoveryLabel: string",
      "Library progress summary must expose streak recovery copy.",
    ],
    [
      "streakSourceBoundaryLabel: string",
      "Library progress summary must expose streak evidence boundaries.",
    ],
  ] as const) {
    requireIncludes(findings, libraryTypes, needle, message);
  }

  for (const [needle, message] of [
    [
      "buildStudyDayKeys(progressValues)",
      "Library progress service must derive streaks from saved progress timestamps.",
    ],
    [
      "calculateCurrentStudyStreak(studyDayKeys)",
      "Library progress service must calculate current streak from study days.",
    ],
    [
      "calculateLongestStudyStreak(studyDayKeys)",
      "Library progress service must calculate longest streak from study days.",
    ],
    [
      "formatStudyDateLabel(studyDayKeys[0])",
      "Library progress service must expose a readable last-study label.",
    ],
    [
      "buildStreakRecoveryLabel(",
      "Library progress service must expose streak recovery guidance.",
    ],
    [
      "Library streaks are calculated from saved chapter progress and reflection timestamps",
      "Library progress service must keep streak source boundaries explicit.",
    ],
    [
      "not certificate or review proof",
      "Library progress streaks must not be treated as certificate or review proof.",
    ],
  ] as const) {
    requireIncludes(findings, progressService, needle, message);
  }

  for (const [needle, message] of [
    [
      "export type PremiumLibraryCollection",
      "Library collection service must define premium collection rows.",
    ],
    [
      "export type PremiumLibraryCollectionShelfSummary",
      "Library collection service must define shelf summary data.",
    ],
    [
      "buildPremiumLibraryCollections",
      "Library collection service must build premium collection shelves.",
    ],
    [
      "buildPremiumLibraryCollectionShelfSummary",
      "Library collection service must build a collection shelf summary.",
    ],
    [
      "Quran Starter Shelf",
      "Library collections must include a Quran starter shelf.",
    ],
    [
      "Worship Rhythm Shelf",
      "Library collections must include a worship rhythm shelf.",
    ],
    [
      "Family Learning Shelf",
      "Library collections must include a family learning shelf.",
    ],
    [
      "Character Practice Shelf",
      "Library collections must include a character practice shelf.",
    ],
    [
      "sourceLabel",
      "Library collections must expose source visibility labels.",
    ],
    [
      "reviewBoundaryLabel",
      "Library collections must expose review boundary labels.",
    ],
    [
      "Collection shelves guide learning; they are not publication, certificate, or scholar-review proof.",
      "Library collections must prevent shelf/certificate/review overclaims.",
    ],
    [
      "Collections organize study and source visibility; final publication or scholar-reviewed claims still require recorded human review evidence.",
      "Library collection shelf summary must keep human-review evidence separate.",
    ],
  ] as const) {
    requireIncludes(findings, collectionsService, needle, message);
  }

  for (const [needle, message] of [
    [
      "export type GuidedLibraryPathStage",
      "Library learning path service must define staged curriculum data.",
    ],
    [
      "export type GuidedLibraryPathStudySession",
      "Library learning path service must define next guided study session data.",
    ],
    [
      "export type GuidedLibraryPathWeeklyPlan",
      "Library learning path service must define weekly guided path plans.",
    ],
    [
      "export type GuidedLibraryPathWeeklyPlanStep",
      "Library learning path service must define weekly guided path plan steps.",
    ],
    [
      "export type GuidedLibraryPathCertificateGate",
      "Library learning path service must define certificate readiness gates.",
    ],
    [
      "export type GuidedLibraryPathClaimBoundary",
      "Library learning path service must define learning claim boundaries.",
    ],
    [
      "export type GuidedLibraryPathStudyContract",
      "Library learning path service must define path study contracts.",
    ],
    [
      "export type GuidedLibraryPathReviewContract",
      "Library learning path service must define path review contracts.",
    ],
    [
      "export type GuidedLibraryPathReviewContractItem",
      "Library learning path service must define review contract items.",
    ],
    [
      "export type GuidedLibraryPathEvidenceLadderStep",
      "Library learning path service must define evidence ladder steps.",
    ],
    [
      "export type GuidedLibraryPathProofReceipt",
      "Library learning path service must define path proof receipts.",
    ],
    [
      "export type GuidedLibraryPathReadinessCockpit",
      "Library learning path service must define a path readiness cockpit.",
    ],
    [
      "export type GuidedLibraryCommandCenter",
      "Library learning path service must define a guided path command center.",
    ],
    [
      "export type GuidedLibraryCommandCenterStat",
      "Library learning path service must define guided command center stats.",
    ],
    [
      "export type GuidedLibraryCommandCenterPathChip",
      "Library learning path service must define guided command center path chips.",
    ],
    [
      "export type GuidedLibraryPathReviewPacketShareContext",
      "Library learning path service must define review packet share context.",
    ],
    [
      "buildGuidedLibraryPathReviewPacketShareText",
      "Library learning path service must build shareable review handoff packets.",
    ],
    [
      "Guided Library Review Handoff Packet",
      "Library review handoff packet must have a clear human-review title.",
    ],
    [
      "This packet is a local review handoff. It is not publication proof, certificate approval, or scholar-review evidence",
      "Library review handoff packet must prevent publication/certificate/scholar-review overclaims.",
    ],
    [
      "export type GuidedLibraryPathReadinessCockpitRow",
      "Library learning path service must define path readiness cockpit rows.",
    ],
    [
      "export type GuidedLibraryPathCertificateRequirement",
      "Library learning path service must define certificate gate requirements.",
    ],
    [
      "export type GuidedLibraryPathSessionStep",
      "Library learning path service must define guided study session steps.",
    ],
    [
      "weeklyCadenceLabel: string",
      "Guided paths must expose a weekly cadence label.",
    ],
    [
      "nextActionLabel: string",
      "Guided paths must expose a concrete next action label.",
    ],
    [
      "certificateStatus: string",
      "Guided paths must expose truthful certificate status.",
    ],
    [
      "sourceStandardLabel: string",
      "Guided paths must expose source/review standard copy.",
    ],
    [
      "reviewReadinessScore: number",
      "Guided paths must expose per-path review readiness score.",
    ],
    [
      "reviewHandoffLabel: string",
      "Guided paths must expose review handoff label.",
    ],
    [
      "reviewHandoffChecklist: string[]",
      "Guided paths must expose review handoff checklist.",
    ],
    [
      "nextReviewActionLabel: string",
      "Guided paths must expose a concrete next review action.",
    ],
    [
      "nextStudySession?: GuidedLibraryPathStudySession",
      "Guided paths must expose an optional next study session.",
    ],
    [
      "weeklyPlan: GuidedLibraryPathWeeklyPlan",
      "Guided paths must expose a weekly path momentum plan.",
    ],
    [
      "certificateGate: GuidedLibraryPathCertificateGate",
      "Guided paths must expose a truthful certificate readiness gate.",
    ],
    [
      "claimBoundary: GuidedLibraryPathClaimBoundary",
      "Guided paths must expose claim boundary state.",
    ],
    [
      "studyContract: GuidedLibraryPathStudyContract",
      "Guided paths must expose a path study contract.",
    ],
    [
      "reviewContract: GuidedLibraryPathReviewContract",
      "Guided paths must expose a path review contract.",
    ],
    [
      "evidenceLadder: GuidedLibraryPathEvidenceLadderStep[]",
      "Guided paths must expose an evidence ladder.",
    ],
    [
      "proofReceipts: GuidedLibraryPathProofReceipt[]",
      "Guided paths must expose proof receipt rows.",
    ],
    [
      "readinessCockpit: GuidedLibraryPathReadinessCockpit",
      "Guided paths must expose a readiness cockpit.",
    ],
    [
      "buildGuidedLibraryCommandCenter",
      "Guided paths must expose a command center builder.",
    ],
    [
      "Guided Path Command Center",
      "Guided command center must provide a user-facing title.",
    ],
    [
      "Certificate and publication labels stay locked until recorded human review evidence is attached.",
      "Guided command center must keep certificate/publication boundaries visible.",
    ],
    [
      "Guided paths organize personal study, source visibility, and review handoff work; they are not scholar approval evidence.",
      "Guided command center must separate study guidance from scholar approval evidence.",
    ],
    [
      "reviewGatesPending",
      "Guided command center must summarize pending review proof gates.",
    ],
    [
      "pathChips: paths.map",
      "Guided command center must expose path chips for all learning paths.",
    ],
    [
      "learnerPromise: string",
      "Guided study contracts must expose learner promise copy.",
    ],
    [
      "reviewPromise: string",
      "Guided study contracts must expose review promise copy.",
    ],
    [
      "checkpoints: GuidedLibraryPathStudyContractCheckpoint[]",
      "Guided study contracts must expose proof checkpoints.",
    ],
    ["study_progress", "Guided evidence ladders must track study progress."],
    ["source_review", "Guided evidence ladders must track source review."],
    [
      "qualified_review",
      "Guided evidence ladders must track qualified review.",
    ],
    [
      "publication_gate",
      "Guided evidence ladders must track publication gates.",
    ],
    [
      "readinessLabel: string",
      "Guided weekly plans must expose truthful readiness labels.",
    ],
    [
      "totalEstimatedMinutes: number",
      "Guided weekly plans must expose a total time estimate.",
    ],
    [
      "sourceCheckLabel: string",
      "Guided sessions must expose source-check status.",
    ],
    [
      "reflectionPrompt: string",
      "Guided sessions must expose a reflection prompt.",
    ],
    [
      "stageLabels: [string, string, string]",
      "Each configured path must provide three curriculum stage labels.",
    ],
    [
      "Certificate pending review sign-off",
      "Certificates must stay pending review sign-off instead of overclaiming.",
    ],
    [
      "high-care book(s) need qualified sign-off",
      "High-care Library paths must keep qualified sign-off visible.",
    ],
    [
      "pathPublicationEvidenceIssues",
      "Guided paths must enumerate missing publication evidence before public claims unlock.",
    ],
    [
      "hasPathPublicationEvidence",
      "Guided paths must use the strict publication evidence gate.",
    ],
    [
      "editorial review evidence",
      "Guided publication gates must require editorial review evidence.",
    ],
    [
      "source relevance review evidence",
      "Guided publication gates must require source relevance review evidence.",
    ],
    [
      "complete quality checklist",
      "Guided publication gates must require a complete quality checklist.",
    ],
    [
      "publication approver/date",
      "Guided publication gates must require publish approval evidence.",
    ],
    [
      "qualified scholar review scope and notes",
      "Guided publication gates must require qualified scholar scope for high-care books.",
    ],
    [
      "strictPublicationIssues",
      "Guided review handoff must surface strict publication evidence gaps.",
    ],
    [
      "buildReviewHandoff(books)",
      "Guided paths must build review handoff state from current book evidence.",
    ],
    [
      "Prepare scholar sign-off packet",
      "High-care paths must route toward scholar sign-off packets.",
    ],
    [
      "buildStages(config, books, progressByBook)",
      "Guided paths must build stages from current progress.",
    ],
    [
      "buildNextStudySession(config, nextBook, progressByBook[nextBook.id])",
      "Guided paths must build a next study session from book progress.",
    ],
    [
      "buildWeeklyPlan({",
      "Guided paths must build a weekly path momentum plan.",
    ],
    [
      "Certificate stays pending review sign-off",
      "Weekly plans must keep certificate claims pending until review evidence exists.",
    ],
    [
      "Certificate locked by proof gates",
      "Certificate gates must keep certificates locked until proof is complete.",
    ],
    [
      "buildCertificateGate({",
      "Guided paths must build certificate readiness from learning and review proof.",
    ],
    [
      "buildClaimBoundary({",
      "Guided paths must build learning claim boundaries from proof gates.",
    ],
    [
      "buildStudyContract({",
      "Guided paths must build study contracts from learning and review proof.",
    ],
    [
      "buildEvidenceLadder({",
      "Guided paths must build evidence ladders from learning and review proof.",
    ],
    [
      "buildProofReceipts({",
      "Guided paths must build proof receipts from learning, review, and certificate gates.",
    ],
    [
      "buildReadinessCockpit({",
      "Guided paths must build a readiness cockpit from study, review, certificate, and claim state.",
    ],
    [
      "Path readiness is study guidance only",
      "Guided readiness cockpit must avoid publication, certificate, and scholar approval overclaims.",
    ],
    [
      "This cockpit turns path progress into one next action",
      "Guided readiness cockpit must provide one prioritized next-action summary.",
    ],
    [
      "claim_boundary",
      "Guided readiness cockpit must include a public claim boundary row.",
    ],
    [
      "Study progress is personal learning evidence, not publication or scholar-review proof.",
      "Guided proof receipts must separate study progress from public review proof.",
    ],
    [
      "Source cards and review handoffs must stay separate from final human approval evidence.",
      "Guided proof receipts must separate source handoffs from human approvals.",
    ],
    [
      "certificate-claim",
      "Guided proof receipts must include certificate claim boundaries.",
    ],
    [
      "This path is a learning contract, not a certificate, publication, or scholar-review claim until proof gates pass.",
      "Guided study contracts must include explicit public claim boundaries.",
    ],
    [
      "Library path progress may guide personal study; it is not proof of publication, certification, or scholar review until recorded human review evidence is attached.",
      "Guided review contracts must separate learning progress from public review proof.",
    ],
    [
      "Claims NurAI will not make yet",
      "Guided review contracts must list rejected public claims.",
    ],
    [
      "Accepted learning evidence",
      "Guided review contracts must list accepted learning evidence.",
    ],
    [
      "Next verification work",
      "Guided review contracts must list next verification work.",
    ],
    [
      "buildReviewContract({",
      "Guided paths must build review contracts from learning and review proof.",
    ],
    [
      "Human review evidence still required",
      "Guided review contracts must keep human review evidence requirements visible.",
    ],
    [
      "Qualified review complete",
      "Guided review contracts must reject qualified-review overclaims.",
    ],
    [
      "Published Library content",
      "Guided review contracts must reject publication overclaims.",
    ],
    [
      "Learning progress only",
      "Learning claim boundary must avoid certificate overclaims.",
    ],
    [
      "Certificate, publication, and scholar-reviewed claims stay pending.",
      "Learning claim boundary must keep public claims pending.",
    ],
    [
      "Do not call this path certified, published, or qualified-review complete until the certificate proof gate is complete.",
      "Learning claim boundary must include explicit public guardrail.",
    ],
    [
      "Certificate and scholar-reviewed labels stay locked until publication evidence is attached",
      "Evidence ladders must keep publication and scholar-reviewed labels locked.",
    ],
    [
      "Human review evidence is still required",
      "Certificate gates must not overclaim missing human review evidence.",
    ],
    [
      "Strict review evidence is attached",
      "Certificate gates must only unlock after strict review evidence is attached.",
    ],
    [
      "strict evidence issue(s) remain",
      "Certificate gates must show unresolved strict evidence issue counts.",
    ],
    [
      "Source check",
      "Guided sessions must make source checking part of the study flow.",
    ],
  ] as const) {
    requireIncludes(findings, service, needle, message);
  }

  for (const pathId of [
    "quran-foundations",
    "daily-character",
    "family-deen",
    "worship-rhythm",
  ]) {
    requireIncludes(
      findings,
      service,
      `id: "${pathId}"`,
      `Missing guided Library path config ${pathId}.`,
    );
  }

  for (const [needle, message] of [
    [
      "buildGuidedLibraryCommandCenter",
      "Library Home must build the guided path command center.",
    ],
    [
      "focusLibrarySearch",
      "Library Home must provide a direct search-focus command.",
    ],
    [
      "libraryCommandActions",
      "Library Home must build top-level Library command actions.",
    ],
    [
      'testID="library-command-rail"',
      "Library Home must expose a stable automation ID for the Library command rail.",
    ],
    [
      "LIBRARY COMMAND RAIL",
      "Library Home must label the top-level Library command rail.",
    ],
    [
      "Start from the right learning move",
      "Library command rail must frame search, progress, and review as workflow actions.",
    ],
    [
      "source-first",
      "Library command rail must keep source-first trust visible near the top.",
    ],
    [
      "testID={`button-library-command-${action.id}`}",
      "Library Home must expose stable automation IDs for Library command actions.",
    ],
    ['id: "search"', "Library command actions must include a search action."],
    [
      'id: "next-session"',
      "Library command actions must include a continue-next-session action.",
    ],
    [
      'id: "progress"',
      "Library command actions must include a progress action.",
    ],
    [
      'id: "source-review"',
      "Library command actions must include a source-review action.",
    ],
    [
      'testID="library-elevated-search"',
      "Library search must be elevated near the command rail instead of buried below recommendations.",
    ],
    [
      "ref={searchInputRef}",
      "Library elevated search must be focusable from the command rail.",
    ],
    [
      'accessibilityLabel="Search Library books and topics"',
      "Library elevated search must expose an accessible label.",
    ],
    ["libraryCommandRail", "Library Home must style the command rail."],
    [
      "libraryCommandButton",
      "Library Home must style command rail actions as tappable controls.",
    ],
    [
      'testID="button-library-reading-streak"',
      "Library Home must expose a stable automation ID for the reading streak card.",
    ],
    ["READING STREAK", "Library Home must label the reading streak card."],
    [
      "summary?.currentStudyStreak",
      "Library Home must render the current reading streak.",
    ],
    [
      "summary?.longestStudyStreak",
      "Library Home must render the longest reading streak.",
    ],
    [
      "summary?.studyDaysTracked",
      "Library Home must render tracked study days.",
    ],
    [
      "summary?.lastStudyDateLabel",
      "Library Home must render the last-study label.",
    ],
    [
      "summary?.streakRecoveryLabel",
      "Library Home must render streak recovery guidance.",
    ],
    [
      "summary?.streakSourceBoundaryLabel",
      "Library Home must render streak source boundaries.",
    ],
    ["libraryStreakCard", "Library Home must style the reading streak card."],
    [
      "libraryStreakBoundary",
      "Library Home must style the streak source boundary.",
    ],
    [
      'testID="button-library-guided-path-command-center"',
      "Library Home must expose a stable automation ID for the guided path command center.",
    ],
    ["GUIDED READING PATH", "Library Home must label the guided path surface."],
    [
      "libraryCommandCenter.stats.map",
      "Library Home must render command center stats.",
    ],
    [
      "libraryCommandCenter.pathChips.map",
      "Library Home must render command center path chips.",
    ],
    [
      "testID={`library-guided-command-stat-${stat.id}`}",
      "Library Home must expose stable automation IDs for command center stats.",
    ],
    [
      "testID={`button-library-guided-command-chip-${chip.id}`}",
      "Library Home must expose stable automation IDs for command center chips.",
    ],
    [
      "libraryCommandCenter.sourceBoundaryLabel",
      "Library Home must render command center source boundaries.",
    ],
    [
      "libraryCommandCenter.certificateBoundaryLabel",
      "Library Home must render command center certificate boundaries.",
    ],
    ["path.stages.map", "Library Home must render path curriculum stages."],
    ["path.weeklyCadenceLabel", "Library Home must render path study cadence."],
    ["path.nextActionLabel", "Library Home must render the next path action."],
    [
      "path.sourceStandardLabel",
      "Library Home must render source/review standard copy.",
    ],
    [
      "path.certificateStatus",
      "Library Home must render certificate status truthfully.",
    ],
    [
      "path.reviewHandoffLabel",
      "Library Home must render review handoff labels.",
    ],
    [
      "path.reviewReadinessScore",
      "Library Home must render review readiness score.",
    ],
    [
      "path.reviewHandoffChecklist.map",
      "Library Home must render review handoff checklist.",
    ],
    [
      "path.nextReviewActionLabel",
      "Library Home must render next review action.",
    ],
    [
      "guidedSessionPath",
      "Library Home must select a guided study session path.",
    ],
    [
      "guidedSession.steps.map",
      "Library Home must render guided study session steps.",
    ],
    [
      "guidedSession.sourceCheckLabel",
      "Library Home must render guided session source-check status.",
    ],
    [
      "guidedSessionPath.weeklyPlan.steps.map",
      "Library Home must render weekly path plan steps.",
    ],
    [
      "PATH MOMENTUM PLAN",
      "Library Home must make the weekly path momentum plan visible.",
    ],
    [
      "button-library-weekly-path-plan",
      "Library Home must expose a stable automation ID for the weekly path plan.",
    ],
    [
      "guidedSessionPath.weeklyPlan.readinessLabel",
      "Library Home must render weekly path readiness labels.",
    ],
    [
      "guidedSessionPath.weeklyPlan.totalEstimatedMinutes",
      "Library Home must render weekly path time estimates.",
    ],
    [
      'testID="library-path-readiness-cockpit"',
      "Library Home must expose a stable automation ID for path readiness cockpits.",
    ],
    [
      "PATH READINESS COCKPIT",
      "Library Home must label path readiness cockpits.",
    ],
    [
      "guidedSessionPath.readinessCockpit.headline",
      "Library Home must render readiness cockpit headlines.",
    ],
    [
      "guidedSessionPath.readinessCockpit.rows.map",
      "Library Home must render readiness cockpit rows.",
    ],
    [
      "testID={`button-library-path-readiness-${row.id}`}",
      "Library Home must expose stable automation IDs for readiness cockpit rows.",
    ],
    [
      "guidedSessionPath.readinessCockpit.boundaryLabel",
      "Library Home must render readiness cockpit boundaries.",
    ],
    [
      'testID="library-path-study-contract"',
      "Library Home must expose a stable automation ID for study contracts.",
    ],
    [
      'testID="library-path-proof-receipts"',
      "Library Home must expose a stable automation ID for path proof receipts.",
    ],
    ["PATH PROOF RECEIPTS", "Library Home must label path proof receipts."],
    [
      "Save evidence before certificate claims",
      "Library Home must make the proof-before-claim loop visible.",
    ],
    [
      "guidedSessionPath.proofReceipts.map",
      "Library Home must render path proof receipt rows.",
    ],
    [
      "testID={`library-path-proof-receipt-${receipt.id}`}",
      "Library Home must expose stable automation IDs for path proof receipt rows.",
    ],
    [
      "receipt.boundaryLabel",
      "Library Home must render proof receipt claim boundaries.",
    ],
    [
      "receipt.saveLabel",
      "Library Home must render proof receipt save actions.",
    ],
    [
      "PATH STUDY CONTRACT",
      "Library Home must make the path study contract visible.",
    ],
    [
      "guidedSessionPath.studyContract.checkpoints.map",
      "Library Home must render study contract checkpoints.",
    ],
    [
      "guidedSessionPath.studyContract.publicBoundary",
      "Library Home must render study contract public boundaries.",
    ],
    [
      "guidedSessionPath.studyContract.nextProofActionLabel",
      "Library Home must render study contract next proof actions.",
    ],
    [
      'testID="library-path-review-contract"',
      "Library Home must expose a stable automation ID for review contracts.",
    ],
    [
      "LIBRARY REVIEW CONTRACT",
      "Library Home must make the Library review contract visible.",
    ],
    [
      "guidedSessionPath.reviewContract.statusLabel",
      "Library Home must render review contract status labels.",
    ],
    [
      "guidedSessionPath.reviewContract.summary",
      "Library Home must render review contract summaries.",
    ],
    [
      "guidedSessionPath.reviewContract.acceptedEvidence",
      "Library Home must render accepted learning evidence.",
    ],
    [
      "guidedSessionPath.reviewContract.rejectedClaims",
      "Library Home must render rejected claims.",
    ],
    [
      "guidedSessionPath.reviewContract.nextVerification",
      "Library Home must render next verification work.",
    ],
    [
      "guidedSessionPath.reviewContract.publicBoundary",
      "Library Home must render review contract public boundaries.",
    ],
    [
      "testID={`library-review-contract-section-${section.id}`}",
      "Library Home must expose stable automation IDs for review contract sections.",
    ],
    [
      "testID={`library-review-contract-item-${item.id}`}",
      "Library Home must expose stable automation IDs for review contract items.",
    ],
    ["reviewContractCard", "Library Home must style review contract cards."],
    [
      "reviewContractBoundary",
      "Library Home must style review contract public boundaries.",
    ],
    [
      "Share",
      "Library Home must import native share for review handoff packets.",
    ],
    [
      "buildGuidedLibraryPathReviewPacketShareText",
      "Library Home must use the guided path review packet share builder.",
    ],
    [
      "shareGuidedPathReviewPacket",
      "Library Home must expose a share action for guided path review handoffs.",
    ],
    [
      'testID="button-library-share-review-handoff-packet"',
      "Library Home must expose a stable automation ID for sharing review handoff packets.",
    ],
    [
      "Share review handoff",
      "Library Home must label the review handoff share action.",
    ],
    [
      "source, editorial, publication, or qualified scholar review",
      "Library Home share action must frame the packet for human review workflows.",
    ],
    [
      "local path progress, source gaps, certificate gates, and public claim boundaries",
      "Library Home share action must describe the packet boundaries accessibly.",
    ],
    [
      "testID={`library-path-study-contract-checkpoint-${checkpoint.id}`}",
      "Library Home must expose stable automation IDs for study contract checkpoints.",
    ],
    [
      "guidedSessionPath.certificateGate.requirements.map",
      "Library Home must render certificate gate requirements.",
    ],
    [
      "guidedSessionPath.claimBoundary.statusLabel",
      "Library Home must render learning claim boundary status.",
    ],
    [
      "guidedSessionPath.claimBoundary.learnerClaimLabel",
      "Library Home must render honest learner claim labels.",
    ],
    [
      "guidedSessionPath.claimBoundary.pendingClaimLabel",
      "Library Home must render pending claim labels.",
    ],
    [
      "guidedSessionPath.claimBoundary.publicClaimGuardrail",
      "Library Home must render public claim guardrails.",
    ],
    [
      'testID="library-learning-claim-boundary"',
      "Library Home must expose a stable automation ID for claim boundaries.",
    ],
    [
      "LEARNING CLAIM BOUNDARY",
      "Library Home must make learning claim boundaries visible.",
    ],
    [
      "guidedSessionPath.certificateGate.nextProofActionLabel",
      "Library Home must render next certificate proof action.",
    ],
    [
      "guidedSessionPath.certificateGate.statusLabel",
      "Library Home must render certificate gate status.",
    ],
    [
      'testID="library-certificate-readiness-gate"',
      "Library Home must expose a stable automation ID for certificate readiness.",
    ],
    [
      "testID={`library-certificate-requirement-${requirement.id}`}",
      "Library Home must expose stable automation IDs for certificate requirements.",
    ],
    [
      "CERTIFICATE READINESS",
      "Library Home must make certificate readiness visible.",
    ],
    [
      'testID="library-path-evidence-ladder"',
      "Library Home must expose a stable automation ID for evidence ladders.",
    ],
    [
      "LIBRARY EVIDENCE LADDER",
      "Library Home must make the evidence ladder visible.",
    ],
    [
      "guidedSessionPath.evidenceLadder.map",
      "Library Home must render evidence ladder steps.",
    ],
    [
      "testID={`library-path-evidence-ladder-${step.id}`}",
      "Library Home must expose stable automation IDs for evidence ladder steps.",
    ],
    [
      "guidedSessionPath.title} proof path",
      "Library Home must label the guided path proof ladder.",
    ],
    [
      "guidedSession.reflectionPrompt",
      "Library Home must render guided session reflection prompt.",
    ],
    [
      "button-library-guided-study-session",
      "Library Home must expose a stable automation ID for the guided session.",
    ],
    [
      'testID="button-library-guided-session-priority"',
      "Library Home must expose a stable automation ID for the priority guided session rail.",
    ],
    [
      "NEXT GUIDED SESSION",
      "Library Home must promote the next guided session before browsing shelves.",
    ],
    [
      "guidedPriorityRail",
      "Library Home must style the priority guided session rail.",
    ],
    [
      "guidedSession.chapterTitle} • {guidedSession.sourceCheckLabel}",
      "Library priority session rail must keep the next chapter and source-check status visible.",
    ],
    [
      "TODAY'S GUIDED SESSION",
      "Library Home must make the guided next study session visible.",
    ],
    [
      "guidedSessionCard",
      "Library Home must style the guided study session card.",
    ],
    [
      "weeklyPlanCard",
      "Library Home must style the weekly path momentum plan card.",
    ],
    ["weeklyPlanStepGrid", "Library Home must style weekly path plan steps."],
    ["learningPathStageList", "Library Home must style staged path rows."],
    [
      "learningPathHandoffPanel",
      "Library Home must style review handoff panels.",
    ],
    ["evidenceLadderCard", "Library Home must style evidence ladder cards."],
    ["evidenceLadderStep", "Library Home must style evidence ladder steps."],
    ["learningPathActionPanel", "Library Home must show a path action panel."],
    [
      "testID={`button-library-learning-path-${path.id}`}",
      "Library path cards must expose stable automation IDs.",
    ],
    [
      "buildPremiumLibraryCollections",
      "Library Home must build premium curated collections.",
    ],
    [
      "buildPremiumLibraryCollectionShelfSummary",
      "Library Home must build curated collection shelf summaries.",
    ],
    [
      "premiumCollections.map",
      "Library Home must render curated collection rows.",
    ],
    [
      "premiumCollectionSummary.boundaryLabel",
      "Library Home must render curated collection review boundaries.",
    ],
    [
      'testID="library-premium-collection-shelf"',
      "Library Home must expose a stable automation ID for the curated collection shelf.",
    ],
    [
      "testID={`library-premium-collection-${collection.id}`}",
      "Library Home must expose stable automation IDs for curated collections.",
    ],
    [
      "CURATED BOOK COLLECTIONS",
      "Library Home must label curated premium book collections.",
    ],
    [
      "collection.proofChips.map",
      "Library Home must render collection proof chips.",
    ],
    [
      "collection.sourceLabel",
      "Library Home must render collection source labels.",
    ],
    [
      "collection.reviewBoundaryLabel",
      "Library Home must render collection review boundaries.",
    ],
    [
      "collection.nextActionLabel",
      "Library Home must render collection next actions.",
    ],
    [
      "openBook(collection.featuredBook)",
      "Library collection cards must open their featured book.",
    ],
    [
      "collectionShelfCard",
      "Library Home must style the curated collection shelf.",
    ],
    [
      "collectionBoundaryRow",
      "Library Home must style collection review boundaries.",
    ],
  ] as const) {
    requireIncludes(findings, screen, needle, message);
  }

  requireRegex(
    findings,
    screen,
    /accessibilityLabel=\{`\$\{path\.title\}[\s\S]*\$\{path\.sourceStandardLabel\}`\}/,
    "Library path accessibility labels must include cadence, next action, and source standard.",
  );

  requireIncludes(
    findings,
    packageJson,
    "check:library-learning-paths-release",
    "package.json must expose check:library-learning-paths-release.",
  );
  requireIncludes(
    findings,
    packageJson,
    "npm run check:library-learning-paths-release",
    "Local release preflight must run the Library learning paths release check.",
  );

  if (findings.length > 0) {
    console.error(
      `Library learning paths release check failed with ${findings.length} finding(s):`,
    );
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Library learning paths release check passed: staged paths, cadence, next action, truthful certificate status, and source-review standards verified.",
  );
}

main();
