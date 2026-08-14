#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`${relativePath} is missing.`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function fail(findings, message) {
  findings.push(message);
}

function requireIncludes(findings, text, needle, label) {
  if (!text.includes(needle)) fail(findings, label);
}

function main() {
  const findings = [];
  const schema = read("shared/schema.ts");
  const migration = read("migrations/0007_library_source_review_events.sql");
  const server = read("server/librarySourceReview.ts");
  const routes = read("server/routes.ts");
  const clientService = read("client/services/librarySourceReviewService.ts");
  const clientScreen = read("client/screens/LibrarySourceReviewScreen.tsx");
  const applyReviewEvidence = read("scripts/apply-library-review-evidence.ts");
  const exportReviewEvidenceIntake = read(
    "scripts/export-library-review-evidence-intake.ts",
  );
  const validateReviewEvidence = read(
    "scripts/validate-library-review-evidence.ts",
  );
  const stageValidationCheck = read(
    "scripts/check-library-review-stage-validation.ts",
  );
  const mergeReviewEvidence = read("scripts/merge-library-review-evidence.ts");
  const finalReadinessCheck = read(
    "scripts/check-library-review-final-readiness.ts",
  );
  const evidenceTemplate = read(
    "docs/audit/library-review-evidence.template.json",
  );
  const evidenceIntake = read("docs/audit/library-review-evidence.intake.json");
  const finalReviewHandoff = read("docs/audit/LIBRARY_FINAL_REVIEW_HANDOFF.md");
  const releaseBlockers = read("scripts/check-release-blockers.js");
  const routeManifest = read("scripts/check-server-route-manifest.js");
  const packageJson = read("package.json");
  const libraryQa = read("LIBRARY_QA.md");
  const contentAudit = read("CONTENT_COMPLETION_AUDIT.md");
  const releaseAudit = read("docs/audit/RELEASE_COMPLETION_AUDIT.md");

  requireIncludes(
    findings,
    schema,
    "librarySourceReviewEvents",
    "shared/schema.ts must define librarySourceReviewEvents.",
  );
  requireIncludes(
    findings,
    schema,
    "library_source_review_events_chapter_created_idx",
    "library_source_review_events must include a chapter/created index.",
  );
  requireIncludes(
    findings,
    migration,
    'CREATE TABLE IF NOT EXISTS "library_source_review_events"',
    "0007 migration must create library_source_review_events.",
  );
  requireIncludes(
    findings,
    migration,
    '"reviewer_id" varchar NOT NULL REFERENCES "users"',
    "0007 migration must tie source reviews to authenticated users.",
  );

  requireIncludes(
    findings,
    server,
    "requireAuthenticatedUser(req, res)",
    "Library Source QA routes must require an authenticated user.",
  );
  requireIncludes(
    findings,
    server,
    "isAdminEmail(user.email)",
    "Library Source QA writes must require a server-side admin reviewer allowlist.",
  );
  requireIncludes(
    findings,
    server,
    "Admin reviewer access is required to approve sources.",
    "Library Source QA writes must reject non-admin source approvals.",
  );
  requireIncludes(
    findings,
    server,
    'decision === "approved" && audit.issues.length > 0',
    "Server must reject approvals while source issues remain.",
  );
  requireIncludes(
    findings,
    server,
    "Review notes are required before saving a Library source review decision.",
    "Server must require source review notes before recording a decision.",
  );
  requireIncludes(
    findings,
    server,
    'createHash("sha256")',
    "Server must fingerprint the reviewed source snapshot.",
  );
  requireIncludes(
    findings,
    server,
    "librarySourceReviewEvents",
    "Server route must write librarySourceReviewEvents.",
  );

  requireIncludes(
    findings,
    routes,
    "registerLibrarySourceReviewRoutes(app)",
    "server/routes.ts must register Library Source QA routes.",
  );
  requireIncludes(
    findings,
    routeManifest,
    "server/librarySourceReview.ts",
    "Server route manifest must include Library Source QA route module.",
  );

  requireIncludes(
    findings,
    clientService,
    'apiRequest("POST", "/api/library/source-reviews"',
    "Client source review writes must sync to the server route.",
  );
  requireIncludes(
    findings,
    clientService,
    "candidate.serverBacked !== true",
    "Client must ignore old local-only approval records.",
  );
  requireIncludes(
    findings,
    clientService,
    "sourceReviewDecisionEvidenceIssues",
    "Client source review service must validate review evidence before saving.",
  );
  requireIncludes(
    findings,
    clientService,
    "getLibraryPublicationReviewSummary",
    "Client source review service must expose book-level publication review summary.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryPublicationReviewShareText",
    "Client source review service must build a non-secret publication handoff share summary.",
  );
  requireIncludes(
    findings,
    clientService,
    "getLibraryPublicationReviewQueue",
    "Client source review service must expose a prioritized per-book publication queue.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildBookPublicationReviewShareText",
    "Client source review service must build per-book publication handoff text.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewCompletionPlan",
    "Client source review service must build a release-readiness completion plan.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewEvidenceBatches",
    "Client source review service must build owner-specific review evidence batches.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewEvidenceBatchShareText",
    "Client source review service must build shareable review batch handoff text.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewEvidenceIntakeRunbook",
    "Client source review service must build a reviewer evidence intake runbook.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewEvidenceIntakeRunbookShareText",
    "Client source review service must build shareable evidence intake runbook text.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewNextAction",
    "Client source review service must build a single next reviewer action.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewNextActionShareText",
    "Client source review service must build shareable next reviewer action text.",
  );
  requireIncludes(
    findings,
    clientService,
    "LibrarySourcePackActivationContract",
    "Client source review service must type the AI source-pack activation contract.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibrarySourcePackActivationContract",
    "Client source review service must build the AI source-pack activation checkpoint.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibrarySourcePackActivationShareText",
    "Client source review service must build shareable source-pack activation handoff text.",
  );
  requireIncludes(
    findings,
    clientService,
    "32 draft cards, 0 verified cards, 0 activation-ready domains",
    "Client source review service must expose current source-pack activation counts.",
  );
  requireIncludes(
    findings,
    clientService,
    "check:source-pack-final-readiness",
    "Client source review service must point owners to the final source-pack readiness command.",
  );
  requireIncludes(
    findings,
    clientService,
    "Do not claim source packs are verified, reviewed by qualified scholars, or active",
    "Client source review service must keep source-pack activation claims blocked.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewStageContracts",
    "Client source review service must expose review-stage contracts.",
  );
  requireIncludes(
    findings,
    clientService,
    "LibraryReviewStageContract",
    "Client source review service must type review-stage contracts.",
  );
  requireIncludes(
    findings,
    clientService,
    "LibraryReviewEvidenceAcceptanceContract",
    "Client source review service must type evidence acceptance contracts.",
  );
  requireIncludes(
    findings,
    clientService,
    "LibraryReviewEvidenceImportReadinessContract",
    "Client source review service must type reviewer evidence import readiness contracts.",
  );
  requireIncludes(
    findings,
    clientService,
    "LibraryReviewEvidenceProofMatrix",
    "Client source review service must type reviewer evidence proof matrices.",
  );
  requireIncludes(
    findings,
    clientService,
    "LibraryReviewSprintPlan",
    "Client source review service must type review sprint plans.",
  );
  requireIncludes(
    findings,
    clientService,
    "LibraryReviewDailyWorkPlan",
    "Client source review service must type daily reviewer workplans.",
  );
  requireIncludes(
    findings,
    clientService,
    "LibraryReviewOpsPassport",
    "Client source review service must type a review ops passport.",
  );
  requireIncludes(
    findings,
    clientService,
    "LibraryReviewBookAcceptancePacket",
    "Client source review service must type per-book reviewer acceptance packets.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewEvidenceAcceptanceContract",
    "Client source review service must build evidence acceptance contracts.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewEvidenceImportReadinessContract",
    "Client source review service must build reviewer evidence import readiness contracts.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewEvidenceProofMatrix",
    "Client source review service must build reviewer evidence proof matrices.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewEvidenceProofMatrixShareText",
    "Client source review service must build shareable reviewer evidence proof matrices.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewSprintPlan",
    "Client source review service must build review sprint plans.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewSprintPlanShareText",
    "Client source review service must build shareable review sprint plans.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewDailyWorkPlan",
    "Client source review service must build day-by-day reviewer workplans.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewDailyWorkPlanShareText",
    "Client source review service must build shareable daily reviewer workplans.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewOpsPassport",
    "Client source review service must build a review ops passport.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewOpsPassportShareText",
    "Client source review service must build shareable review ops passports.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewBookAcceptancePackets",
    "Client source review service must build per-book reviewer acceptance packets.",
  );
  requireIncludes(
    findings,
    clientService,
    "buildLibraryReviewBookAcceptancePacketShareText",
    "Client source review service must build shareable per-book reviewer acceptance packets.",
  );
  requireIncludes(
    findings,
    clientService,
    "This packet is coordination only",
    "Per-book acceptance packet share text must preserve the evidence boundary.",
  );
  requireIncludes(
    findings,
    clientService,
    "Do not include private contact details, credentials, screenshots, chat transcripts, cookies, auth headers, or database URLs",
    "Per-book acceptance packets must include a no-secret evidence boundary.",
  );
  requireIncludes(
    findings,
    exportReviewEvidenceIntake,
    "reviewerAcceptancePacket",
    "Review evidence intake export must include per-book acceptance packets.",
  );
  requireIncludes(
    findings,
    exportReviewEvidenceIntake,
    "perBookAcceptancePacketRule",
    "Review evidence intake export must include the per-book acceptance packet rule.",
  );
  requireIncludes(
    findings,
    exportReviewEvidenceIntake,
    "acceptanceStagesForBook",
    "Review evidence intake export must derive per-book acceptance stages.",
  );
  requireIncludes(
    findings,
    exportReviewEvidenceIntake,
    '"quality-checklist"',
    "Review evidence intake export must include quality checklist in required review evidence.",
  );
  requireIncludes(
    findings,
    validateReviewEvidence,
    "validateReviewerAcceptancePacket",
    "Review evidence validator must preserve per-book acceptance packets.",
  );
  requireIncludes(
    findings,
    validateReviewEvidence,
    "packet.claimBoundary",
    "Review evidence validator must enforce the per-book claim boundary.",
  );
  requireIncludes(
    findings,
    validateReviewEvidence,
    "packet.noSecretBoundary",
    "Review evidence validator must enforce the per-book no-secret boundary.",
  );
  requireIncludes(
    findings,
    validateReviewEvidence,
    "stageValidationOnly",
    "Review evidence validator must support stage-scoped reviewer evidence without weakening final Library claims.",
  );
  requireIncludes(
    findings,
    validateReviewEvidence,
    "STAGE_QUALITY_CHECKLIST_FIELDS",
    "Review evidence validator must enforce stage-specific quality checklist fields.",
  );
  requireIncludes(
    findings,
    stageValidationCheck,
    "Blank full-library intake should still fail complete validation.",
    "Stage validation check must prove stage-scoped evidence does not weaken the full Library gate.",
  );
  requireIncludes(
    findings,
    evidenceTemplate,
    '"perBookAcceptancePacketRule"',
    "Review evidence template must describe the per-book acceptance packet rule.",
  );
  requireIncludes(
    findings,
    evidenceTemplate,
    '"reviewerAcceptancePacket"',
    "Review evidence template must include reviewerAcceptancePacket shape.",
  );
  requireIncludes(
    findings,
    evidenceIntake,
    '"reviewerAcceptancePacket"',
    "Generated review evidence intake must include reviewerAcceptancePacket records.",
  );
  requireIncludes(
    findings,
    clientService,
    "This workplan turns the Library review blocker into day-by-day reviewer packets",
    "Daily reviewer workplan must turn the Library blocker into executable daily packets.",
  );
  requireIncludes(
    findings,
    clientService,
    "Daily review work coordinates people only; it is not approval evidence",
    "Daily reviewer workplan must preserve approval evidence boundaries.",
  );
  requireIncludes(
    findings,
    clientService,
    "Do not call a day complete, a book approved, or the Library finished",
    "Daily reviewer workplan must block overclaims until validation/import gates pass.",
  );
  requireIncludes(
    findings,
    clientService,
    "a daily workplan is scheduling help only, not review evidence",
    "Daily reviewer workplan share text must state it is scheduling help only.",
  );
  requireIncludes(
    findings,
    clientService,
    "Use this sprint plan to assign real reviewers without mixing editorial, source, qualified review, QA, and publish decisions.",
    "Review sprint plan must separate owner lanes.",
  );
  requireIncludes(
    findings,
    clientService,
    "Sprint tasks coordinate reviewer work only; completion claims still require validated current-content evidence imports.",
    "Review sprint tasks must preserve completion claim boundaries.",
  );
  requireIncludes(
    findings,
    clientService,
    "shared sprint plans coordinate reviewer work only; they are not approval evidence",
    "Review sprint share text must not overclaim approval evidence.",
  );
  requireIncludes(
    findings,
    clientService,
    "Owner lanes:",
    "Review sprint share text must list owner lanes.",
  );
  requireIncludes(
    findings,
    clientService,
    "high-care book",
    "Review sprint plan must highlight high-care book review evidence.",
  );
  requireIncludes(
    findings,
    clientService,
    "Reviewer handoffs, screenshots, and notes do not unlock Library completion claims",
    "Evidence acceptance contract must reject handoff-only completion claims.",
  );
  requireIncludes(
    findings,
    clientService,
    "Evidence must name the content hash and the exact editorial, source, qualified review, QA, or publish scope.",
    "Evidence acceptance contract must require current content hash and scoped evidence.",
  );
  requireIncludes(
    findings,
    clientService,
    "Partial imports only clear their exported reviewer scope",
    "Evidence acceptance contract must preserve staged import claim boundaries.",
  );
  requireIncludes(
    findings,
    clientService,
    "This contract keeps reviewer evidence outside source code until a completed JSON file validates, dry-runs, imports, and refreshes the release audit.",
    "Evidence import readiness contract must describe the controlled import boundary.",
  );
  requireIncludes(
    findings,
    clientService,
    "Do not place private contact details, credentials, screenshots, or informal chat approvals in the repo.",
    "Evidence import readiness contract must protect reviewer privacy and reject informal approvals.",
  );
  requireIncludes(
    findings,
    clientService,
    "Only validated imports for the current content hash can clear their recorded scope.",
    "Evidence import readiness contract must preserve content-hash claim boundaries.",
  );
  requireIncludes(
    findings,
    clientService,
    "This matrix tells reviewers exactly which artifact proves each Library review step",
    "Evidence proof matrix must map review proof to exact artifacts.",
  );
  requireIncludes(
    findings,
    clientService,
    "Never include private reviewer contact details, credentials, screenshots, chat transcripts, DATABASE_URL values, API keys, cookies, or auth headers in review evidence.",
    "Evidence proof matrix must enforce no-secret proof boundaries.",
  );
  requireIncludes(
    findings,
    clientService,
    "A proof row is complete only when its command succeeds for current content hashes",
    "Evidence proof matrix must prevent handoff-only completion claims.",
  );
  requireIncludes(
    findings,
    clientService,
    "Even after Library passes, deployed runtime and production DB gates still need their own proof.",
    "Evidence proof matrix must preserve non-Library external gate boundaries.",
  );
  requireIncludes(
    findings,
    clientService,
    "A single owner-facing passport for Library publication evidence, high-care scholar scope, AI source-pack activation, and final release gates.",
    "Review ops passport must summarize all human-review lanes.",
  );
  requireIncludes(
    findings,
    clientService,
    "Do not claim Library completion, scholar-reviewed books, source-pack activation, or App Store release readiness from this passport alone.",
    "Review ops passport must block completion and launch overclaims.",
  );
  requireIncludes(
    findings,
    clientService,
    "Share this passport without reviewer private contact details, credentials, chat transcripts, cookies, auth headers, database URLs, API keys, or private source text.",
    "Review ops passport must protect no-secret evidence boundaries.",
  );
  requireIncludes(
    findings,
    clientService,
    "this ops passport coordinates review work only; it is not approval evidence, source-pack activation evidence, production deployment proof, or database proof.",
    "Review ops passport share text must preserve evidence boundaries.",
  );
  requireIncludes(
    findings,
    clientService,
    "npm run export:library-review-signoff-ledger -- --write && npm run export:library-completion-audit -- --write",
    "Evidence import readiness contract must require ledger and completion audit regeneration.",
  );
  requireIncludes(
    findings,
    clientService,
    "--write only after validation and dry run pass",
    "Evidence import readiness contract must make writes depend on validation and dry run.",
  );
  requireIncludes(
    findings,
    clientService,
    "editorial_review",
    "Review-stage contracts must include editorial review.",
  );
  requireIncludes(
    findings,
    clientService,
    "source_relevance_review",
    "Review-stage contracts must include source relevance review.",
  );
  requireIncludes(
    findings,
    clientService,
    "qualified_scholar_review",
    "Review-stage contracts must include qualified scholar review.",
  );
  requireIncludes(
    findings,
    clientService,
    "publish_approval",
    "Review-stage contracts must include publish approval.",
  );
  requireIncludes(
    findings,
    clientService,
    "Editorial review supports content quality only; it is not source, scholar, or publish approval.",
    "Editorial stage contract must separate editorial review from stronger claims.",
  );
  requireIncludes(
    findings,
    clientService,
    "Scholar review applies only to the recorded scope and current content hash.",
    "Scholar stage contract must keep scope and content hash boundaries visible.",
  );
  requireIncludes(
    findings,
    clientService,
    "Publish approval is the only stage that can move a book toward public completion claims.",
    "Publish stage contract must identify the only publication-claim stage.",
  );
  requireIncludes(
    findings,
    clientService,
    "This is a reviewer handoff, not approval evidence",
    "Next reviewer action must not overclaim review approval.",
  );
  requireIncludes(
    findings,
    clientService,
    "npm run export:library-review-evidence-intake -- --write",
    "Evidence intake runbook must include the intake export command.",
  );
  requireIncludes(
    findings,
    clientService,
    "npm run validate:library-review-evidence -- --file ${scopedEvidenceFile} --summary-json",
    "Evidence intake runbook must include the validation command.",
  );
  requireIncludes(
    findings,
    clientService,
    "npm run apply:library-review-evidence -- --file ${scopedEvidenceFile} --write${scopedWriteFlag}",
    "Evidence intake runbook must include the guarded import command.",
  );
  requireIncludes(
    findings,
    clientService,
    "--out ${scopedEvidenceFile}",
    "Evidence intake runbook must export scoped evidence outside the repo intake path.",
  );
  requireIncludes(
    findings,
    clientService,
    "--allow-partial-import",
    "Evidence intake runbook must include the staged partial-import guard.",
  );
  requireIncludes(
    findings,
    clientService,
    "Do not paste reviewer notes into source code manually",
    "Evidence intake runbook must guard against manual/faked review evidence.",
  );
  requireIncludes(
    findings,
    clientService,
    "High-care scholar batch",
    "Review batches must include a high-care scholar batch.",
  );
  requireIncludes(
    findings,
    clientService,
    "Evidence needed:",
    "Review batch share text must list required evidence.",
  );
  requireIncludes(
    findings,
    clientService,
    "acceptanceChecklist",
    "Review batches must expose acceptance checklist evidence requirements.",
  );
  requireIncludes(
    findings,
    clientService,
    "Reviewer identity, role, and review date are present.",
    "Review acceptance checklist must require reviewer identity and date.",
  );
  requireIncludes(
    findings,
    clientService,
    "Evidence references the current content hash for every included book.",
    "Review acceptance checklist must require current content hashes.",
  );
  requireIncludes(
    findings,
    clientService,
    "Approval decisions are separated from staged reviewer handoff text.",
    "Review acceptance checklist must separate handoffs from approval evidence.",
  );
  requireIncludes(
    findings,
    clientService,
    "Proof boundary:",
    "Review batch share text must include a proof boundary.",
  );
  requireIncludes(
    findings,
    clientService,
    "Human review evidence still blocks highest-standard release",
    "Completion plan must name the human review evidence blocker without overclaiming.",
  );
  requireIncludes(
    findings,
    clientService,
    "totalBooks * 4 + summary.sensitiveBooks",
    "Completion plan must calculate all editorial/source/checklist/scholar/publish evidence lanes.",
  );
  requireIncludes(
    findings,
    clientService,
    "Do not mark a book published, qualified-review complete, or highest-standard complete",
    "Completion plan must include publication guardrails.",
  );
  requireIncludes(
    findings,
    clientService,
    "Qualified scholar first",
    "Publication queue must prioritize high-care books for qualified scholar review.",
  );
  requireIncludes(
    findings,
    clientService,
    "Required before approval: current content hash",
    "Publication handoff share text must list required approval evidence.",
  );
  requireIncludes(
    findings,
    clientService,
    "qualifiedScholarPending",
    "Publication review summary must track qualified scholar review gaps.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "protected source record",
    "Library Source QA UI must describe protected server-backed review storage with customer-safe wording.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "PUBLICATION SIGN-OFF HANDOFF",
    "Library Source QA UI must distinguish book publication sign-off from chapter source QA.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "LibraryReviewReleaseCockpit",
    "Library Source QA UI must render a release-readiness cockpit.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "LibraryReviewBatchPanel",
    "Library Source QA UI must render reviewer evidence batches.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "LibraryReviewStageContractPanel",
    "Library Source QA UI must render review-stage contracts.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "REVIEW STAGE CONTRACTS",
    "Library Source QA UI must label review-stage contracts.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-stage-contract-panel"',
    "Library Source QA UI must expose review-stage contracts for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "testID={`library-review-stage-contract-${contract.id}`}",
    "Library Source QA UI must expose every review-stage contract row.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "contract.requiredEvidenceFields.slice(0, 3).map",
    "Library Source QA UI must render required stage evidence fields.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "contract.claimBoundaryLabel",
    "Library Source QA UI must render stage claim boundaries.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "Reject if:",
    "Library Source QA UI must render stage rejection guidance.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "LibraryReviewNextActionCard",
    "Library Source QA UI must render a single next reviewer action.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "LibraryReviewEvidenceAcceptanceContractCard",
    "Library Source QA UI must render the evidence acceptance contract.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "LibraryReviewEvidenceImportReadinessCard",
    "Library Source QA UI must render the evidence import readiness contract.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "LibraryReviewEvidenceProofMatrixCard",
    "Library Source QA UI must render the evidence proof matrix.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "LibraryReviewOpsPassportCard",
    "Library Source QA UI must render the review ops passport.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "LibraryReviewBookAcceptancePacketPanel",
    "Library Source QA UI must render per-book acceptance packets.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "reviewEvidenceImportReadiness",
    "Library Source QA UI must derive evidence import readiness state.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "buildLibraryReviewEvidenceImportReadinessContract",
    "Library Source QA UI must build evidence import readiness from service state.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "buildLibraryReviewEvidenceProofMatrix",
    "Library Source QA UI must build the evidence proof matrix from service state.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "buildLibraryReviewEvidenceProofMatrixShareText",
    "Library Source QA UI must share proof matrix text from the service builder.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "shareReviewEvidenceProofMatrix",
    "Library Source QA UI must provide shareable proof matrix handoff.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "reviewOpsPassport",
    "Library Source QA UI must derive review ops passport state.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "buildLibraryReviewOpsPassport",
    "Library Source QA UI must build review ops passport from service state.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "buildLibraryReviewOpsPassportShareText(reviewOpsPassport)",
    "Library Source QA UI must share ops passport text from the service builder.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-ops-passport"',
    "Library Source QA UI must expose review ops passport for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "REVIEW OPS PASSPORT",
    "Library Source QA UI must label the review ops passport.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "testID={`library-review-ops-passport-${lane.id}`}",
    "Library Source QA UI must expose every review ops lane.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-ops-passport-no-claim-boundary"',
    "Library Source QA UI must expose review ops no-claim boundary.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-ops-passport-no-secret-boundary"',
    "Library Source QA UI must expose review ops no-secret boundary.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="button-share-library-review-ops-passport"',
    "Library Source QA UI must expose review ops passport sharing.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "reviewOpsPassportCard",
    "Library Source QA UI must style the review ops passport card.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-evidence-proof-matrix"',
    "Library Source QA UI must expose evidence proof matrix for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "REVIEW EVIDENCE PROOF MATRIX",
    "Library Source QA UI must label evidence proof matrix.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-evidence-proof-matrix-active-blocker"',
    "Library Source QA UI must expose proof matrix active blocker.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "testID={`library-review-evidence-proof-matrix-${row.id}`}",
    "Library Source QA UI must expose every proof matrix row.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-evidence-proof-matrix-no-secret-boundary"',
    "Library Source QA UI must expose proof matrix no-secret boundary.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-evidence-proof-matrix-claim-boundary"',
    "Library Source QA UI must expose proof matrix claim boundary.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="button-share-library-review-evidence-proof-matrix"',
    "Library Source QA UI must expose proof matrix sharing for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "evidenceProofMatrixCard",
    "Library Source QA UI must style the proof matrix card.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "LibraryReviewSprintPlanCard",
    "Library Source QA UI must render the review sprint plan.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "LibraryReviewDailyWorkPlanCard",
    "Library Source QA UI must render the daily reviewer workplan.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "reviewDailyWorkPlan",
    "Library Source QA UI must derive daily reviewer workplan state.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "shareReviewDailyWorkPlan",
    "Library Source QA UI must provide a shareable daily reviewer workplan.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "buildLibraryReviewDailyWorkPlanShareText(reviewDailyWorkPlan)",
    "Library Source QA UI must share daily workplan text from the service builder.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-daily-workplan"',
    "Library Source QA UI must expose the daily reviewer workplan for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "DAILY REVIEWER WORKPLAN",
    "Library Source QA UI must label the daily reviewer workplan.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "plan.days.slice(0, 4).map",
    "Library Source QA UI must render daily workplan days.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "testID={`library-review-daily-workplan-${day.id}`}",
    "Library Source QA UI must expose daily workplan day rows for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "testID={`library-review-daily-workplan-task-${task.id}`}",
    "Library Source QA UI must expose daily workplan task rows for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-daily-workplan-claim-boundary"',
    "Library Source QA UI must expose daily workplan claim boundaries for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="button-share-library-review-daily-workplan"',
    "Library Source QA UI must expose daily workplan sharing for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "dailyWorkPlanCard",
    "Library Source QA UI must style daily reviewer workplan cards.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-sprint-plan"',
    "Library Source QA UI must expose the review sprint plan for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "REVIEW SPRINT PLAN",
    "Library Source QA UI must label the review sprint plan.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "reviewSprintPlan",
    "Library Source QA UI must derive review sprint plan state.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "shareReviewSprintPlan",
    "Library Source QA UI must provide a shareable review sprint plan.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "buildLibraryReviewSprintPlanShareText(reviewSprintPlan)",
    "Library Source QA UI must share sprint plan text from the service builder.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="button-share-library-review-sprint-plan"',
    "Library Source QA UI must expose sprint plan sharing for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "Share sprint",
    "Library Source QA UI must label the sprint share action.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "plan.tasks.map",
    "Library Source QA UI must render sprint tasks.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "testID={`library-review-sprint-task-${task.id}`}",
    "Library Source QA UI must expose sprint task rows for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-sprint-claim-boundary"',
    "Library Source QA UI must expose sprint claim boundaries for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "reviewSprintCard",
    "Library Source QA UI must style review sprint cards.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-evidence-acceptance-contract"',
    "Library Source QA UI must expose the evidence acceptance contract for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "EVIDENCE ACCEPTANCE CONTRACT",
    "Library Source QA UI must label the evidence acceptance contract.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "reviewEvidenceAcceptanceContract",
    "Library Source QA UI must derive evidence acceptance contract state.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "contract.acceptedEvidence",
    "Library Source QA UI must render accepted evidence rows.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "contract.rejectedEvidence",
    "Library Source QA UI must render rejected evidence rows.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "contract.validationSteps",
    "Library Source QA UI must render validation steps.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-acceptance-claim-boundary"',
    "Library Source QA UI must expose acceptance claim boundaries for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "testID={`library-review-acceptance-item-${item.id}`}",
    "Library Source QA UI must expose every acceptance contract item.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "acceptanceContractCard",
    "Library Source QA UI must style evidence acceptance contract cards.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-evidence-import-readiness"',
    "Library Source QA UI must expose evidence import readiness for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "EVIDENCE IMPORT READINESS",
    "Library Source QA UI must label evidence import readiness.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "contract.items.map",
    "Library Source QA UI must render evidence import readiness steps.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "testID={`library-review-evidence-import-readiness-${item.id}`}",
    "Library Source QA UI must expose every import readiness step.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-evidence-import-privacy-boundary"',
    "Library Source QA UI must expose evidence import privacy boundary.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-evidence-import-claim-boundary"',
    "Library Source QA UI must expose evidence import claim boundary.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "importReadinessCard",
    "Library Source QA UI must style evidence import readiness cards.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-next-action-card"',
    "Library Source QA UI must expose next reviewer action for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "NEXT REVIEWER ACTION",
    "Library Source QA UI must label the next reviewer action.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "shareReviewNextAction",
    "Library Source QA UI must provide a shareable next reviewer action.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="button-share-library-review-next-action"',
    "Library Source QA UI must expose next reviewer action sharing for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-next-action-acceptance-checklist"',
    "Library Source QA UI must expose next-action acceptance checklist for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "action.acceptanceChecklist.map",
    "Library Source QA UI must render next-action acceptance checklist.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-evidence-batch-panel"',
    "Library Source QA UI must expose review evidence batch panel for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "REVIEWER BATCHES",
    "Library Source QA UI must label reviewer batch handoffs.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "shareReviewEvidenceBatch",
    "Library Source QA UI must provide shareable reviewer batch handoffs.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="button-share-library-review-evidence-batch"',
    "Library Source QA UI must expose review batch sharing for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "testID={`library-review-batch-acceptance-${batch.id}`}",
    "Library Source QA UI must expose batch acceptance checklist for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "batch.acceptanceChecklist.slice(0, 2).map",
    "Library Source QA UI must render batch acceptance checklist.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "batch.proofBoundaryLabel",
    "Library Source QA UI must render batch proof boundary.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "LibraryReviewEvidenceIntakeCard",
    "Library Source QA UI must render an evidence intake runbook card.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-evidence-intake-runbook"',
    "Library Source QA UI must expose the evidence intake runbook for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-evidence-claim-boundary"',
    "Library Source QA UI must expose the evidence claim boundary for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "runbook.claimBoundaryLabel",
    "Library Source QA UI must render the staged evidence claim boundary.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="button-share-library-review-evidence-intake-runbook"',
    "Library Source QA UI must expose evidence intake runbook sharing for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "EVIDENCE INTAKE RUNBOOK",
    "Library Source QA UI must label the evidence intake command path.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-review-release-readiness-cockpit"',
    "Library Source QA UI must expose release-readiness cockpit for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "RELEASE READINESS",
    "Library Source QA UI must label the release-readiness evidence state.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "plan.guardrail",
    "Library Source QA UI must render the publication guardrail.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-source-pack-activation-checkpoint"',
    "Library Source QA UI must expose source-pack activation checkpoint for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "AI SOURCE PACK ACTIVATION",
    "Library Source QA UI must label the source-pack activation checkpoint.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "contract.finalReadinessCommandLabel",
    "Library Source QA UI must render the source-pack final readiness command.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "contract.activationBoundaryLabel",
    "Library Source QA UI must render the source-pack activation boundary.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="button-share-library-source-pack-activation-handoff"',
    "Library Source QA UI must expose source-pack activation handoff sharing for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-publication-review-handoff"',
    "Library Source QA UI must expose publication review handoff for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "Review-ready, not published",
    "Library Source QA UI must avoid overclaiming reviewed publication status.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "sharePublicationHandoff",
    "Library Source QA UI must expose a shareable publication handoff action.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="button-share-library-publication-handoff"',
    "Library Source QA UI must expose handoff sharing for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="library-publication-review-queue"',
    "Library Source QA UI must render the per-book publication review queue.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "Next books for sign-off",
    "Library Source QA UI must label the actionable book-level signoff queue.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="button-share-library-book-publication-handoff"',
    "Library Source QA UI must expose per-book handoff sharing for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "Record approval evidence",
    "Library Source QA UI must require evidence before approval.",
  );
  requireIncludes(
    findings,
    applyReviewEvidence,
    "allowPartialImport",
    "Library review evidence importer must expose an explicit partial-import guard.",
  );
  requireIncludes(
    findings,
    applyReviewEvidence,
    "--allow-partial-import",
    "Library review evidence importer must require --allow-partial-import for staged write imports.",
  );
  requireIncludes(
    findings,
    applyReviewEvidence,
    "Refusing to write a partial Library evidence import without --allow-partial-import.",
    "Library review evidence importer must refuse accidental partial write imports.",
  );
  requireIncludes(
    findings,
    applyReviewEvidence,
    "Stage-scoped reviewer evidence cannot be imported into published Library metadata.",
    "Library review evidence importer must reject stage-scoped reviewer evidence before writing published metadata.",
  );
  requireIncludes(
    findings,
    stageValidationCheck,
    "expectStageImportRefused",
    "Stage validation check must prove stage-only evidence cannot be imported as publication evidence.",
  );
  requireIncludes(
    findings,
    mergeReviewEvidence,
    "Merged candidate publication evidence",
    "Library review evidence merge tool must produce candidate publication evidence rather than app metadata.",
  );
  requireIncludes(
    findings,
    mergeReviewEvidence,
    "claimBoundary",
    "Library review evidence merge tool must preserve the claim boundary.",
  );
  requireIncludes(
    findings,
    mergeReviewEvidence,
    "runValidator(inputPath, true)",
    "Library review evidence merge tool must validate each stage input before merging.",
  );
  requireIncludes(
    findings,
    mergeReviewEvidence,
    "Duplicate reviewer stage evidence cannot be merged.",
    "Library review evidence merge tool must refuse duplicate stage evidence for the same book.",
  );
  requireIncludes(
    findings,
    mergeReviewEvidence,
    "All-stage review evidence cannot be used as a merge input.",
    "Library review evidence merge tool must reject all-stage evidence inputs.",
  );
  requireIncludes(
    findings,
    mergeReviewEvidence,
    "missingStagesByBookId",
    "Library review evidence merge tool must report missing reviewer stages per book.",
  );
  requireIncludes(
    findings,
    mergeReviewEvidence,
    "completeStageBookCount",
    "Library review evidence merge tool must summarize complete-stage book coverage.",
  );
  requireIncludes(
    findings,
    mergeReviewEvidence,
    "renderCoverageMarkdown",
    "Library review evidence merge tool must render a reviewer-facing coverage artifact.",
  );
  requireIncludes(
    findings,
    mergeReviewEvidence,
    "--coverage-out",
    "Library review evidence merge tool must expose --coverage-out for reviewer-facing coverage.",
  );
  requireIncludes(
    findings,
    mergeReviewEvidence,
    "--require-complete-stage-coverage",
    "Library review evidence merge tool must expose a strict complete-stage coverage gate.",
  );
  requireIncludes(
    findings,
    mergeReviewEvidence,
    "--require-all-library-books",
    "Library review evidence merge tool must expose a strict whole-Library coverage gate.",
  );
  requireIncludes(
    findings,
    mergeReviewEvidence,
    "Merged reviewer evidence is missing required stages.",
    "Library review evidence merge tool must refuse incomplete stage coverage when strict mode is requested.",
  );
  requireIncludes(
    findings,
    mergeReviewEvidence,
    "Merged reviewer evidence does not include every Library book.",
    "Library review evidence merge tool must refuse partial book coverage when whole-Library strict mode is requested.",
  );
  requireIncludes(
    findings,
    stageValidationCheck,
    "Library Review Merge Coverage",
    "Stage validation check must prove merge coverage markdown is written.",
  );
  requireIncludes(
    findings,
    stageValidationCheck,
    "expectIncompleteCoverageMergeRefused",
    "Stage validation check must prove the strict merge coverage gate refuses incomplete reviewer stages.",
  );
  requireIncludes(
    findings,
    stageValidationCheck,
    "expectWholeLibraryMergeRefused",
    "Stage validation check must prove the whole-Library merge gate refuses partial book coverage.",
  );
  requireIncludes(
    findings,
    packageJson,
    "check:library-review-final-readiness",
    "package.json must expose the final Library review evidence readiness check.",
  );
  requireIncludes(
    findings,
    finalReadinessCheck,
    "readyForHighestStandardClaim",
    "Final Library review readiness check must require highest-standard whole-library validation.",
  );
  requireIncludes(
    findings,
    finalReadinessCheck,
    "allowPartialImport === true",
    "Final Library review readiness check must reject partial-import mode.",
  );
  requireIncludes(
    findings,
    finalReadinessCheck,
    "missingLibraryBookIds",
    "Final Library review readiness check must reject merged evidence that still omits Library books.",
  );
  requireIncludes(
    findings,
    finalReadinessCheck,
    "SECRET_LIKE_PATTERNS",
    "Final Library review readiness check must scan reviewer evidence for secret-like values.",
  );
  requireIncludes(
    findings,
    finalReadinessCheck,
    "secretLikeFindingCount",
    "Final Library review readiness check must report secret-like reviewer evidence findings.",
  );
  requireIncludes(
    findings,
    stageValidationCheck,
    "expectFinalReadinessRefused",
    "Stage validation check must prove final readiness refuses partial merged evidence.",
  );
  requireIncludes(
    findings,
    stageValidationCheck,
    "expectFinalReadinessSecretRefused",
    "Stage validation check must prove final readiness refuses secret-like reviewer evidence.",
  );
  requireIncludes(
    findings,
    stageValidationCheck,
    "expectMergeRefused",
    "Stage validation check must prove duplicate stage evidence cannot silently overwrite earlier review evidence.",
  );
  requireIncludes(
    findings,
    stageValidationCheck,
    "expectAllStageMergeInputRefused",
    "Stage validation check must prove all-stage evidence is not accepted as a stage merge input.",
  );
  requireIncludes(
    findings,
    evidenceTemplate,
    "Partial imports use --allow-partial-import and do not support whole-library published or scholar-reviewed claims.",
    "Library review evidence template must document the staged-import claim boundary.",
  );
  requireIncludes(
    findings,
    finalReviewHandoff,
    "refuses partial-library imports by",
    "Library final review handoff must document the partial-import write guard.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="input-library-source-review-note"',
    "Library Source QA UI must expose a review-note input for automation.",
  );
  requireIncludes(
    findings,
    clientScreen,
    'testID="button-save-library-source-review-evidence"',
    "Library Source QA UI must save source review evidence through an explicit action.",
  );
  requireIncludes(
    findings,
    clientScreen,
    "SERVER-BACKED REVIEW EVIDENCE",
    "Library Source QA UI must show recorded server-backed evidence.",
  );
  if (/approve reviewed chapters locally/i.test(clientScreen)) {
    fail(findings, "Library Source QA UI still claims approvals are local.");
  }

  requireIncludes(
    findings,
    releaseBlockers,
    "listRequiredMigrationFiles()",
    "Release blocker script must dynamically require migration files.",
  );
  requireIncludes(
    findings,
    migration,
    "library_source_review_events",
    "The 0007 source review migration must remain present for release blockers.",
  );
  requireIncludes(
    findings,
    releaseBlockers,
    "scripts/check-library-source-review-controls.js",
    "Release blocker script must require this source review control check.",
  );
  requireIncludes(
    findings,
    packageJson,
    "check:library-source-review-controls",
    "package.json must expose check:library-source-review-controls.",
  );
  requireIncludes(
    findings,
    packageJson,
    "check:library-review-stage-validation",
    "package.json must expose check:library-review-stage-validation.",
  );
  requireIncludes(
    findings,
    packageJson,
    "merge:library-review-evidence",
    "package.json must expose merge:library-review-evidence.",
  );
  requireIncludes(
    findings,
    packageJson,
    "npm run check:library-source-review-controls",
    "Local release preflight must run the Library Source QA control check.",
  );
  requireIncludes(
    findings,
    packageJson,
    "npm run check:library-review-stage-validation",
    "Local release preflight must run the staged Library evidence validation check.",
  );

  for (const [relativePath, text] of [
    ["LIBRARY_QA.md", libraryQa],
    ["CONTENT_COMPLETION_AUDIT.md", contentAudit],
    ["docs/audit/RELEASE_COMPLETION_AUDIT.md", releaseAudit],
  ]) {
    if (!/server[- ]backed|server audit trail/i.test(text)) {
      fail(
        findings,
        `${relativePath} must document server-backed Library Source QA reviews.`,
      );
    }
    if (/local release-checklist records until/i.test(text)) {
      fail(
        findings,
        `${relativePath} still documents source reviews as local-only.`,
      );
    }
  }

  if (findings.length) {
    console.error("Library Source QA controls failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Library Source QA controls passed: server-backed review audit trail verified.",
  );
}

main();
