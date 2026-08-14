import type { AppIconName } from "@/components/icons";

export type AppStoreShowcaseScene = {
  id:
    | "home"
    | "quran"
    | "ai"
    | "library"
    | "arabic"
    | "kids"
    | "prayer"
    | "hajj";
  title: string;
  caption: string;
  captureLine: string;
  route: string;
  params?: Record<string, unknown>;
  icon: AppIconName;
  accent: "primary" | "scholar";
  proof: string[];
  captureChecklist: string[];
  appStoreCaption: string;
  screenshotHeadline: string;
  screenshotSubhead: string;
  audience: string;
  trustSignal: string;
  deviceFrame: "6.9 inch" | "6.5 inch" | "5.5 inch";
  firstViewportSignal: string;
  captureStateLabel: string;
  blockerGuardrail: string;
  primaryActionLabel: string;
  capturePriority: number;
  captureProof: AppStoreSceneCaptureProof;
};

export type AppStoreShowcaseReadiness = {
  sceneCount: number;
  flowCount: number;
  trustSceneCount: number;
  storeCaptionCount: number;
  listingMetadataSectionCount: number;
  reviewerNoteSectionCount: number;
  qaGateCount: number;
  proofLedgerCount: number;
  routeProofCount: number;
  demoDataSafetyRuleCount: number;
  screenshotReadinessContractCount: number;
  screenshotSetProofSceneCount: number;
  releaseNote: string;
  captureSpecs: string[];
  storyArc: string[];
  truthRules: string[];
  requiredDeviceFrames: string[];
  captureRunbook: string[];
  captureQualityGates: AppStoreCaptureQualityGate[];
  claimValidationQuestions: string[];
  captureRouteProofs: AppStoreSceneRouteProof[];
  captureRouteAuditQuestions: string[];
  captureMatrix: AppStoreSceneCaptureMatrixRow[];
  demoDataSafetyRules: AppStoreDemoDataSafetyRule[];
  screenshotReadinessContracts: AppStoreSceneScreenshotReadinessContract[];
  screenshotSetProofPack: AppStoreScreenshotSetProofPack;
  captureSessionPlan: AppStoreCaptureSessionPlan;
  captureDecisionSummary: AppStoreCaptureDecisionSummary;
  launchEvidenceSprint: AppStoreLaunchEvidenceSprint;
  releaseBlockerResolutionPlan: AppStoreReleaseBlockerResolutionPlan;
  releaseEvidenceIntakePacket: AppStoreReleaseEvidenceIntakePacket;
  launchBlockerHandoff: AppStoreLaunchBlockerHandoff[];
  releaseBlockerLabels: AppStoreLaunchBlockerHandoff["id"][];
  claimSafetyReceiptCount: number;
  claimSafetyReceipts: AppStoreSceneClaimSafetyReceipt[];
  claimSafetyQuestions: string[];
  listingMetadataPack: AppStoreListingMetadataPack;
  platformRequirementCount: number;
  platformAssetRequirements: AppStorePlatformAssetRequirement[];
  storeAssetComplianceQuestions: string[];
  submissionReadinessPassport: AppStoreSubmissionReadinessPassport;
  reviewerNotePacket: AppStoreReviewerNotePacket;
  maintainabilityRunway: AppStoreMaintainabilityRunway;
  postLaunchWatchPlan: AppStorePostLaunchWatchPlan;
};

export type AppStoreSceneCaptureProof = {
  storePromise: string;
  requiredVisualProof: string;
  validationQuestion: string;
  safeDemoState: string;
  retakeIf: string;
};

export type AppStoreCaptureQualityGate = {
  id: "viewport" | "truth" | "privacy" | "blockers";
  title: string;
  detail: string;
  passLabel: string;
  failState: string;
  icon: AppIconName;
  tone: "primary" | "scholar" | "danger";
};

export type AppStoreSceneRouteProof = {
  id: AppStoreShowcaseScene["id"];
  title: string;
  routeName: string;
  routeParamsLabel: string;
  screenEvidence: string;
  demoStateBoundary: string;
  navigationGuardrail: string;
  auditQuestion: string;
};

export type AppStoreSceneCaptureMatrixRow = {
  id: AppStoreShowcaseScene["id"];
  priority: number;
  title: string;
  routeName: string;
  deviceFrame: AppStoreShowcaseScene["deviceFrame"];
  firstViewportSignal: string;
  trustBoundary: string;
  retakeRisk: string;
};

export type AppStoreDemoDataSafetyRule = {
  id: AppStoreShowcaseScene["id"];
  title: string;
  routeName: string;
  approvedDemoStateLabel: string;
  neverShowLabel: string;
  preCaptureCheckLabel: string;
  retakeIfLabel: string;
  icon: AppIconName;
};

export type AppStoreSceneScreenshotReadinessItem = {
  id: "viewport" | "trust" | "demo_state" | "route" | "retake";
  label: string;
  evidenceLabel: string;
  boundaryLabel: string;
  complete: boolean;
  tone: "primary" | "scholar" | "danger";
};

export type AppStoreSceneScreenshotReadinessContract = {
  id: AppStoreShowcaseScene["id"];
  title: string;
  statusLabel: string;
  nextActionLabel: string;
  routeName: string;
  priorityLabel: string;
  boundaryLabel: string;
  items: AppStoreSceneScreenshotReadinessItem[];
};

export type AppStoreScreenshotSetProofScene = {
  id: AppStoreShowcaseScene["id"];
  title: string;
  orderLabel: string;
  appStoreSlotLabel: string;
  valueProofLabel: string;
  trustProofLabel: string;
  routeLabel: string;
  retakeLabel: string;
  heroCandidate: boolean;
  icon: AppIconName;
  tone: "primary" | "scholar";
};

export type AppStoreScreenshotSetProofPack = {
  title: string;
  statusLabel: string;
  summaryLabel: string;
  firstFourBoundaryLabel: string;
  submissionBoundaryLabel: string;
  noSecretBoundaryLabel: string;
  retakeBoundaryLabel: string;
  scenes: AppStoreScreenshotSetProofScene[];
};

export type AppStoreCaptureDecisionSummary = {
  title: string;
  captureStatusLabel: string;
  launchStatusLabel: string;
  nextCaptureAction: string;
  blockedLaunchReason: string;
  qaGateLabel: string;
  captureProofLabel: string;
  blockerLabels: string[];
};

export type AppStoreCaptureSessionBatch = {
  deviceFrame: AppStoreShowcaseScene["deviceFrame"];
  sceneCount: number;
  sceneTitles: string[];
  firstSceneTitle: string;
  captureBoundaryLabel: string;
};

export type AppStoreCaptureSessionPlan = {
  title: string;
  nextSceneTitle: string;
  nextSceneRouteName: string;
  nextSceneActionLabel: string;
  estimatedMinutesLabel: string;
  batchCount: number;
  sessionBoundaryLabel: string;
  privacyBoundaryLabel: string;
  retakeBoundaryLabel: string;
  batches: AppStoreCaptureSessionBatch[];
};

export type AppStoreLaunchBlockerHandoff = {
  id:
    | "deployed-runtime-url"
    | "production-database-url"
    | "source-pack-activation-readiness"
    | "library-human-review-evidence";
  title: string;
  ownerLabel: string;
  nextActionLabel: string;
  proofCommandLabel: string;
  evidenceBoundaryLabel: string;
  acceptanceChecklist: string[];
  noSecretBoundaryLabel: string;
  icon: AppIconName;
};

export type AppStoreLaunchEvidenceSprintTask = {
  id: AppStoreLaunchBlockerHandoff["id"];
  title: string;
  ownerLabel: string;
  actionLabel: string;
  proofLabel: string;
  boundaryLabel: string;
  icon: AppIconName;
  tone: "primary" | "scholar" | "danger";
};

export type AppStoreLaunchEvidenceSprint = {
  title: string;
  statusLabel: string;
  summary: string;
  nextActionLabel: string;
  captureBoundaryLabel: string;
  librarySprintBridgeLabel: string;
  tasks: AppStoreLaunchEvidenceSprintTask[];
};

export type AppStoreReleaseEvidenceIntakeRow = {
  id: AppStoreLaunchBlockerHandoff["id"];
  title: string;
  gateLabel: string;
  ownerLabel: string;
  requiredCommandLabel: string;
  evidenceRecordLabel: string;
  nonSecretNotesPrompt: string;
  acceptanceSummaryLabel: string;
  noSecretBoundaryLabel: string;
  icon: AppIconName;
  tone: "primary" | "scholar" | "danger";
};

export type AppStoreReleaseEvidenceIntakePacket = {
  title: string;
  statusLabel: string;
  summaryLabel: string;
  schemaBoundaryLabel: string;
  ownerBoundaryLabel: string;
  noSecretBoundaryLabel: string;
  rows: AppStoreReleaseEvidenceIntakeRow[];
};

export type AppStoreReleaseBlockerResolutionRow = {
  id: AppStoreLaunchBlockerHandoff["id"];
  title: string;
  orderLabel: string;
  dependencyLabel: string;
  ownerLabel: string;
  unblockActionLabel: string;
  proofCommandLabel: string;
  acceptanceLabel: string;
  noSecretBoundaryLabel: string;
  icon: AppIconName;
  tone: "primary" | "scholar" | "danger";
};

export type AppStoreReleaseBlockerResolutionPlan = {
  title: string;
  statusLabel: string;
  summaryLabel: string;
  firstActionLabel: string;
  screenshotBoundaryLabel: string;
  evidenceBoundaryLabel: string;
  noSecretBoundaryLabel: string;
  rows: AppStoreReleaseBlockerResolutionRow[];
};

export type AppStoreSceneClaimSafetyReceipt = {
  id: AppStoreShowcaseScene["id"];
  title: string;
  publicClaimLabel: string;
  evidenceStateLabel: string;
  sourceBoundaryLabel: string;
  blockedClaimLabel: string;
  approvalQuestion: string;
  releaseUseLabel: string;
  icon: AppIconName;
  tone: "primary" | "scholar";
};

export type AppStoreListingMetadataItem = {
  id:
    | "name-subtitle"
    | "promo-copy"
    | "keywords"
    | "privacy-nutrition"
    | "review-notes"
    | "localization";
  title: string;
  valueLabel: string;
  detail: string;
  approvalQuestion: string;
  blockedLanguageLabel: string;
  icon: AppIconName;
  tone: "primary" | "scholar" | "danger";
};

export type AppStoreListingMetadataPack = {
  title: string;
  statusLabel: string;
  releaseBoundaryLabel: string;
  reviewBoundaryLabel: string;
  localizationBoundaryLabel: string;
  sections: AppStoreListingMetadataItem[];
};

export type AppStoreReviewerNoteSection = {
  id:
    | "ai-safety"
    | "scholar-review"
    | "privacy-data"
    | "demo-access"
    | "subscriptions"
    | "launch-boundaries";
  title: string;
  reviewerFacingNote: string;
  evidenceLabel: string;
  doNotIncludeLabel: string;
  icon: AppIconName;
  tone: "primary" | "scholar" | "danger";
};

export type AppStoreReviewerNotePacket = {
  title: string;
  statusLabel: string;
  introLabel: string;
  aiBoundaryLabel: string;
  privacyBoundaryLabel: string;
  noSecretBoundaryLabel: string;
  blockedSubmissionLabel: string;
  sections: AppStoreReviewerNoteSection[];
};

export type AppStorePlatformAssetRequirement = {
  id: "apple-ios-screenshots" | "google-play-screenshots";
  platformLabel: string;
  statusLabel: string;
  assetCountLabel: string;
  formatLabel: string;
  captureImplicationLabel: string;
  firstViewportRuleLabel: string;
  noGoLabel: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceCheckedLabel: string;
  sourceRequirementLabel: string;
  accessibilityAltTextLabel: string;
  complianceBoundaryLabel: string;
  icon: AppIconName;
  tone: "primary" | "scholar";
};

export type AppStoreSubmissionReadinessPassportRow = {
  id: "screenshots" | "metadata" | "demo-safety" | "launch-proof";
  title: string;
  valueLabel: string;
  detail: string;
  nextActionLabel: string;
  icon: AppIconName;
  tone: "primary" | "scholar" | "danger";
};

export type AppStoreSubmissionReadinessPassport = {
  title: string;
  statusLabel: string;
  summaryLabel: string;
  screenshotBoundaryLabel: string;
  submissionBoundaryLabel: string;
  noSecretLabel: string;
  nextActionLabel: string;
  nextActionRouteName: string;
  rows: AppStoreSubmissionReadinessPassportRow[];
};

export type AppStoreMaintainabilitySlice = {
  id:
    | "quran-home"
    | "personalization-privacy"
    | "ai-trust"
    | "library"
    | "app-store-release"
    | "backend-database-deployment";
  title: string;
  ownerLabel: string;
  commandLabel: string;
  reviewBoundaryLabel: string;
  acceptanceLabel: string;
  icon: AppIconName;
  tone: "primary" | "scholar" | "danger";
};

export type AppStoreMaintainabilityRunway = {
  title: string;
  statusLabel: string;
  summaryLabel: string;
  noSecretBoundaryLabel: string;
  blockerBoundaryLabel: string;
  mergePolicyLabel: string;
  slices: AppStoreMaintainabilitySlice[];
};

export type AppStorePostLaunchWatchTask = {
  id:
    | "deployed-ai-smoke"
    | "production-db-migrations"
    | "store-review-feedback"
    | "crash-vitals"
    | "accessibility-retakes"
    | "library-review-drift";
  title: string;
  ownerLabel: string;
  signalLabel: string;
  commandLabel: string;
  escalationLabel: string;
  icon: AppIconName;
  tone: "primary" | "scholar" | "danger";
};

export type AppStorePostLaunchWatchPlan = {
  title: string;
  statusLabel: string;
  summaryLabel: string;
  cadenceLabel: string;
  noSecretBoundaryLabel: string;
  holdLaunchBoundaryLabel: string;
  tasks: AppStorePostLaunchWatchTask[];
};

export const APP_STORE_SHOWCASE_SCENES: AppStoreShowcaseScene[] = [
  {
    id: "home",
    title: "Today’s Deen",
    caption: "Prayer, Quran, learning, and family in one calm daily home.",
    captureLine: "Start every day with prayer, Quran, and one clear next step.",
    route: "Main",
    icon: "sunrise",
    accent: "primary",
    proof: ["Prayer live", "Quran anchor", "Personal plan"],
    captureChecklist: [
      "Prayer card visible",
      "Quran flagship action visible",
      "Search sits below Today’s Deen as a compact support action",
    ],
    appStoreCaption: "Your daily Islamic rhythm, personalized.",
    screenshotHeadline: "Today’s Deen starts here",
    screenshotSubhead: "Prayer, Quran, learning, and family in one calm home.",
    audience: "Daily worship users",
    trustSignal:
      "Search supports the worship home and does not overpower Quran or daily actions.",
    deviceFrame: "6.9 inch",
    firstViewportSignal:
      "Prayer/date context, Quran action, Today’s Deen, and personal plan visible before search.",
    captureStateLabel: "Use populated prayer/location state",
    blockerGuardrail:
      "Do not imply final launch until deployed runtime and production database gates pass.",
    primaryActionLabel: "Open Today’s Deen",
    capturePriority: 1,
    captureProof: {
      storePromise: "A daily home for worship and learning.",
      requiredVisualProof:
        "Prayer/date context, Quran action, Today’s Deen, and personal plan are visible before the compact search support action.",
      validationQuestion:
        "Can a first-time viewer understand the daily worship loop in three seconds?",
      safeDemoState:
        "Use generic demo location, populated prayer times, and no account identifiers.",
      retakeIf:
        "The search dock appears above Today’s Deen, dominates the opening frame, duplicates in the header, or the Quran action is hidden.",
    },
  },
  {
    id: "quran",
    title: "Beautiful Quran Reader",
    caption:
      "Ayah reading, audio state, tafsir boundaries, notes, and source cards.",
    captureLine: "Read, listen, reflect, and keep source boundaries clear.",
    route: "QuranReader",
    params: { surahNumber: 1, initialVerse: 1 },
    icon: "book-open",
    accent: "scholar",
    proof: ["Arabic focus", "Audio", "Sources"],
    captureChecklist: [
      "Arabic ayah is large",
      "Audio or trust band visible",
      "Source/tafsir boundary visible",
    ],
    appStoreCaption: "A Quran reader built for calm understanding.",
    screenshotHeadline: "Read Quran with calm focus",
    screenshotSubhead:
      "Arabic, audio, tafsir boundaries, and reflection notes.",
    audience: "Quran readers",
    trustSignal: "Source and tafsir boundaries stay visible.",
    deviceFrame: "6.9 inch",
    firstViewportSignal:
      "Large Arabic ayah, audio state, and source boundary visible.",
    captureStateLabel: "Use Surah Al-Fatihah with reflection/action sheet",
    blockerGuardrail:
      "Do not imply tafsir or scholar review beyond visible source cards.",
    primaryActionLabel: "Open Quran Reader",
    capturePriority: 2,
    captureProof: {
      storePromise: "A flagship Quran reading surface with calm understanding.",
      requiredVisualProof:
        "Large Arabic ayah, translation hierarchy, audio state, and source boundary are visible.",
      validationQuestion:
        "Does the shot feel like Quran is the product's flagship, not a secondary tab?",
      safeDemoState:
        "Use Al-Fatihah with public translation/source labels and no private notes.",
      retakeIf:
        "Audio, tafsir/source, or reflection controls are clipped out of the first viewport.",
    },
  },
  {
    id: "ai",
    title: "Personal AI Briefing",
    caption:
      "One calm Home briefing built from visible Quran, prayer, dhikr, streak, and weather signals.",
    captureLine: "Show the single Personal AI card under the prayer orb.",
    route: "Main",
    params: {
      screen: "Home",
      captureState: "personal-ai-briefing-under-prayer-orb",
    },
    icon: "shield",
    accent: "scholar",
    proof: ["One system", "Visible signals", "Trust boundary"],
    captureChecklist: [
      "Prayer orb visible above Personal AI",
      "One Personal AI card visible",
      "Trust boundary and next action visible",
    ],
    appStoreCaption: "Personal guidance from visible app progress.",
    screenshotHeadline: "Know the next calm step",
    screenshotSubhead:
      "Quran pace, prayer prep, dhikr, and progress in one card.",
    audience: "Daily guidance users",
    trustSignal: "Visible signals only; sensitive rulings go to scholars.",
    deviceFrame: "6.5 inch",
    firstViewportSignal:
      "Prayer orb, weather pill, and one Personal AI card are visible.",
    captureStateLabel:
      "Use demo Home state with Quran, prayer, dhikr, and streak progress",
    blockerGuardrail:
      "Do not show chat, saved AI answers, or scholar-review queues.",
    primaryActionLabel: "Open Home Personal AI",
    capturePriority: 3,
    captureProof: {
      storePromise:
        "A single personal journey update guides the next calm action.",
      requiredVisualProof:
        "Prayer orb, weather, Personal AI card, visible-signal rows, and next action are visible.",
      validationQuestion:
        "Would a reviewer understand Personal AI is one Home briefing, not multiple chat screens?",
      safeDemoState:
        "Use a demo Home account with public Quran progress, prayer/weather, and dhikr data only.",
      retakeIf:
        "The shot shows Chat, saved AI answers, trust dashboards, or private user content.",
    },
  },
  {
    id: "library",
    title: "Guided Islamic Library",
    caption:
      "Curated learning paths, trusted source cards, progress, and reflections.",
    captureLine: "Follow guided paths with source-aware review status.",
    route: "LibraryHome",
    icon: "book",
    accent: "scholar",
    proof: ["Learning paths", "Review-ready", "Source cards"],
    captureChecklist: [
      "Guided paths visible",
      "Review-ready label visible",
      "Source trust card visible",
    ],
    appStoreCaption: "Structured Islamic learning, not scattered articles.",
    screenshotHeadline: "Follow guided learning paths",
    screenshotSubhead: "Books, source cards, progress, and review readiness.",
    audience: "Structured learners",
    trustSignal: "Source review status is explicit.",
    deviceFrame: "6.9 inch",
    firstViewportSignal:
      "Guided paths, source review status, and readiness handoff visible.",
    captureStateLabel: "Use populated paths with review-ready labels",
    blockerGuardrail:
      "Do not imply library books have completed human review evidence.",
    primaryActionLabel: "Open Library",
    capturePriority: 4,
    captureProof: {
      storePromise:
        "Structured Islamic learning with paths and source awareness.",
      requiredVisualProof:
        "Guided paths, source status, weekly plan, and review handoff are visible.",
      validationQuestion:
        "Can the viewer see this is a learning product, not a loose article list?",
      safeDemoState:
        "Use curated demo paths with pending/ready source language shown truthfully.",
      retakeIf: "A card implies complete human review or hides source status.",
    },
  },
  {
    id: "arabic",
    title: "Quranic Arabic Coach",
    caption:
      "Level map, daily coach, speaking drills, sentence practice, XP, and smart review.",
    captureLine:
      "Practice Arabic through listening, speaking, meaning, and review.",
    route: "ArabicLearning",
    icon: "type",
    accent: "primary",
    proof: ["Daily coach", "Speaking", "Review"],
    captureChecklist: [
      "Daily coach card visible",
      "XP or streak visible",
      "Quranic word or review loop visible",
    ],
    appStoreCaption: "Learn Arabic with daily practice that sticks.",
    screenshotHeadline: "Build Quranic Arabic daily",
    screenshotSubhead: "Listen, speak, understand, write, and review.",
    audience: "Arabic learners",
    trustSignal: "Daily loop is timeboxed and practical.",
    deviceFrame: "6.5 inch",
    firstViewportSignal:
      "Daily coach, skill portfolio, XP/streak, and Quran word visible.",
    captureStateLabel: "Use learner state with visible portfolio progress",
    blockerGuardrail:
      "Keep Arabic coaching educational and separate from fiqh answers.",
    primaryActionLabel: "Open Arabic Coach",
    capturePriority: 5,
    captureProof: {
      storePromise: "Daily Quranic Arabic practice with real skill momentum.",
      requiredVisualProof:
        "Daily coach, XP/streak, speaking confidence, and review loop are visible.",
      validationQuestion:
        "Does the shot look like a language-learning product with progress, not a static lesson list?",
      safeDemoState:
        "Use anonymized learner progress and sample Quranic vocabulary.",
      retakeIf:
        "Speaking, listening, or progress evidence is missing from the first viewport.",
    },
  },
  {
    id: "kids",
    title: "Family & Kids Mode",
    caption:
      "Gentle Islamic learning for children with parent-friendly structure.",
    captureLine: "Make Islamic learning warm, safe, and family-friendly.",
    route: "KidsMode",
    icon: "users",
    accent: "primary",
    proof: ["Stories", "Quiz", "Memorization"],
    captureChecklist: [
      "Kids Mode header visible",
      "Parent-safe structure visible",
      "Story/quiz/memorization action visible",
    ],
    appStoreCaption: "A calmer Islamic learning space for families.",
    screenshotHeadline: "Family learning feels gentle",
    screenshotSubhead:
      "Stories, quizzes, and memorization with parent structure.",
    audience: "Parents and kids",
    trustSignal: "Family-safe framing stays visible.",
    deviceFrame: "5.5 inch",
    firstViewportSignal:
      "Kids Mode header, parent-safe structure, and learning action visible.",
    captureStateLabel: "Use child-friendly story or memorization path",
    blockerGuardrail:
      "Do not show children’s data, names, or private family details.",
    primaryActionLabel: "Open Kids Mode",
    capturePriority: 6,
    captureProof: {
      storePromise: "A gentle Islamic learning space for families.",
      requiredVisualProof:
        "Parent-safe framing, story/quiz/memorization actions, and family tone are visible.",
      validationQuestion:
        "Would a parent immediately trust the screen as child-safe and structured?",
      safeDemoState:
        "Use generic child profiles or no names, with public story/demo content only.",
      retakeIf:
        "Any child name, private family note, or unclear safety framing appears.",
    },
  },
  {
    id: "prayer",
    title: "Prayer & Qibla",
    caption:
      "Prayer times, Qibla direction, reminders, and a worship-first daily rhythm.",
    captureLine: "Protect salah with times, direction, and gentle reminders.",
    route: "PrayerTimes",
    icon: "clock",
    accent: "primary",
    proof: ["Prayer times", "Qibla", "Reminders"],
    captureChecklist: [
      "Next prayer visible",
      "Qibla or reminder action visible",
      "Location/method state looks clean",
    ],
    appStoreCaption: "Prayer tools that feel part of your day.",
    screenshotHeadline: "Protect your salah rhythm",
    screenshotSubhead: "Prayer times, Qibla, reminders, and location clarity.",
    audience: "Prayer routine users",
    trustSignal: "Method and location state must be clear.",
    deviceFrame: "6.9 inch",
    firstViewportSignal:
      "Next prayer, location/method state, and Qibla/reminder action visible.",
    captureStateLabel: "Use valid location and calculation method",
    blockerGuardrail: "Do not hide location uncertainty or method state.",
    primaryActionLabel: "Open Prayer Tools",
    capturePriority: 7,
    captureProof: {
      storePromise: "Prayer tools that protect daily salah rhythm.",
      requiredVisualProof:
        "Next prayer, calculation method, location clarity, and Qibla/reminder action are visible.",
      validationQuestion:
        "Can the viewer tell the prayer data is grounded in a clear method and location state?",
      safeDemoState:
        "Use a broad demo city or neutral location label with clean calculation method.",
      retakeIf:
        "Location or method uncertainty is hidden, clipped, or visually ambiguous.",
    },
  },
  {
    id: "hajj",
    title: "Hajj & Umrah Companion",
    caption:
      "Travel preparation, worship planning, safety checks, and official-service care.",
    captureLine:
      "Prepare pilgrimage with worship, safety, and official-service awareness.",
    route: "HajjUmrah",
    icon: "map",
    accent: "scholar",
    proof: ["Checklist", "Safety", "Travel mode"],
    captureChecklist: [
      "Preparation checklist visible",
      "Health/safety state visible",
      "Official-service language visible where relevant",
    ],
    appStoreCaption: "A thoughtful companion for sacred travel.",
    screenshotHeadline: "Prepare for sacred travel",
    screenshotSubhead:
      "Worship, checklists, safety, and official-service care.",
    audience: "Pilgrims and families",
    trustSignal: "Official-service language remains careful.",
    deviceFrame: "6.5 inch",
    firstViewportSignal:
      "Checklist, safety card, and official-service boundary visible.",
    captureStateLabel: "Use preparation checklist with safety guidance",
    blockerGuardrail: "Do not imply government, visa, or medical authority.",
    primaryActionLabel: "Open Hajj & Umrah",
    capturePriority: 8,
    captureProof: {
      storePromise:
        "Pilgrimage preparation with worship, safety, and service awareness.",
      requiredVisualProof:
        "Checklist, safety guidance, travel mode, and official-service boundary are visible.",
      validationQuestion:
        "Does the shot help pilgrims prepare without implying authority the app does not have?",
      safeDemoState:
        "Use generic itinerary/checklist content and no passport, health, or booking details.",
      retakeIf:
        "The screenshot implies visa, medical, government, or booking authority.",
    },
  },
];

function formatRouteParams(params?: Record<string, unknown>) {
  if (!params || Object.keys(params).length === 0) {
    return "No params; open the default populated state.";
  }

  return Object.entries(params)
    .map(([key, value]) => {
      const raw = typeof value === "string" ? value : JSON.stringify(value);
      const safeValue =
        raw.length > 60 ? `${raw.slice(0, 57).trimEnd()}...` : raw;
      return `${key}: ${safeValue}`;
    })
    .join("; ");
}

export function buildAppStoreCaptureRouteProofs(
  scenes: AppStoreShowcaseScene[] = APP_STORE_SHOWCASE_SCENES,
): AppStoreSceneRouteProof[] {
  return scenes.map((scene) => ({
    id: scene.id,
    title: scene.title,
    routeName: scene.route,
    routeParamsLabel: formatRouteParams(scene.params),
    screenEvidence: scene.firstViewportSignal,
    demoStateBoundary: scene.captureStateLabel,
    navigationGuardrail: scene.blockerGuardrail,
    auditQuestion: `Does ${scene.route} open with ${scene.firstViewportSignal.toLowerCase()}?`,
  }));
}

export function buildAppStoreCaptureMatrix(
  scenes: AppStoreShowcaseScene[] = APP_STORE_SHOWCASE_SCENES,
): AppStoreSceneCaptureMatrixRow[] {
  return [...scenes]
    .sort((a, b) => a.capturePriority - b.capturePriority)
    .map((scene) => ({
      id: scene.id,
      priority: scene.capturePriority,
      title: scene.title,
      routeName: scene.route,
      deviceFrame: scene.deviceFrame,
      firstViewportSignal: scene.firstViewportSignal,
      trustBoundary: scene.blockerGuardrail,
      retakeRisk: scene.captureProof.retakeIf,
    }));
}

export function buildAppStoreDemoDataSafetyRules(
  scenes: AppStoreShowcaseScene[] = APP_STORE_SHOWCASE_SCENES,
): AppStoreDemoDataSafetyRule[] {
  const neverShowByScene: Record<AppStoreShowcaseScene["id"], string> = {
    home: "Never show private names, exact home location, personal plan notes, or account identifiers.",
    quran:
      "Never show private reflections, unreviewed tafsir claims, or saved notes tied to a real user.",
    ai: "Never show private life details, final fatwa language, medical/legal claims, or raw AI debug output.",
    library:
      "Never show copy implying books are published or completed qualified review without evidence.",
    arabic:
      "Never show real learner identity, voice recordings, child data, or claims of certified fluency.",
    kids: "Never show child names, family chat content, school details, or private memorization notes.",
    prayer:
      "Never show exact home address, precise location coordinates, or hidden calculation uncertainty.",
    hajj: "Never show passport data, permit numbers, medical records, booking references, or government-authority claims.",
  };

  return scenes.map((scene) => ({
    id: scene.id,
    title: `${scene.title} demo safety`,
    routeName: scene.route,
    approvedDemoStateLabel: scene.captureProof.safeDemoState,
    neverShowLabel: neverShowByScene[scene.id],
    preCaptureCheckLabel: `Before capture, confirm: ${scene.firstViewportSignal}`,
    retakeIfLabel: scene.captureProof.retakeIf,
    icon: scene.icon,
  }));
}

export function buildAppStoreScreenshotReadinessContracts(
  scenes: AppStoreShowcaseScene[] = APP_STORE_SHOWCASE_SCENES,
): AppStoreSceneScreenshotReadinessContract[] {
  return [...scenes]
    .sort((a, b) => a.capturePriority - b.capturePriority)
    .map((scene) => {
      const items: AppStoreSceneScreenshotReadinessItem[] = [
        {
          id: "viewport",
          label: "First viewport",
          evidenceLabel: scene.firstViewportSignal,
          boundaryLabel:
            "Keep the headline feature and proof visible before any scroll.",
          complete:
            scene.firstViewportSignal.length >= 32 &&
            scene.screenshotHeadline.length >= 18,
          tone: "primary",
        },
        {
          id: "trust",
          label: "Trust boundary",
          evidenceLabel: scene.trustSignal,
          boundaryLabel: `${scene.blockerGuardrail} Keep religious, privacy, and authority limits visible.`,
          complete:
            scene.trustSignal.length >= 18 &&
            /source|review|safety|official|trust|Quran|prayer|location|educational|family|service/i.test(
              `${scene.proof.join(" ")} ${scene.trustSignal} ${scene.blockerGuardrail}`,
            ),
          tone: "scholar",
        },
        {
          id: "demo_state",
          label: "Demo-safe state",
          evidenceLabel: scene.captureProof.safeDemoState,
          boundaryLabel:
            "Do not show private notes, exact locations, child details, account identifiers, or secrets.",
          complete:
            scene.captureProof.safeDemoState.length >= 32 &&
            scene.blockerGuardrail.length >= 24,
          tone: "primary",
        },
        {
          id: "route",
          label: "Route proof",
          evidenceLabel: `${scene.route}: ${formatRouteParams(scene.params)}`,
          boundaryLabel:
            "Open from the registered route and do not substitute a mock marketing composition.",
          complete:
            scene.route.length >= 3 &&
            scene.primaryActionLabel.startsWith("Open "),
          tone: "primary",
        },
        {
          id: "retake",
          label: "Retake rule",
          evidenceLabel: scene.captureProof.retakeIf,
          boundaryLabel:
            "Retake before export when this rule triggers; do not repair the claim in copy after capture.",
          complete: scene.captureProof.retakeIf.length >= 24,
          tone: "danger",
        },
      ];
      const completeCount = items.filter((item) => item.complete).length;

      return {
        id: scene.id,
        title: `${scene.title} screenshot readiness contract`,
        statusLabel: `${completeCount}/${items.length} capture checks ready`,
        nextActionLabel:
          completeCount === items.length
            ? scene.primaryActionLabel
            : `Fix ${items.length - completeCount} capture check${items.length - completeCount === 1 ? "" : "s"} before capture`,
        routeName: scene.route,
        priorityLabel: `Priority ${scene.capturePriority} of ${scenes.length}`,
        boundaryLabel:
          "Screenshot readiness confirms demo-safe capture only; it does not prove production launch, completed human review, or deployed runtime.",
        items,
      };
    });
}

export function buildAppStoreScreenshotSetProofPack(
  scenes: AppStoreShowcaseScene[] = APP_STORE_SHOWCASE_SCENES,
): AppStoreScreenshotSetProofPack {
  const orderedScenes = [...scenes].sort(
    (a, b) => a.capturePriority - b.capturePriority,
  );
  const leadScenes = orderedScenes.slice(0, 4).map((scene) => scene.title);

  return {
    title: "Screenshot proof pack",
    statusLabel: `${orderedScenes.length} screenshot candidates mapped with proof boundaries`,
    summaryLabel:
      "Use this pack to keep the store sequence coherent: daily worship first, Quran depth second, AI trust third, learning structure fourth, then supporting family, prayer, and travel flows.",
    firstFourBoundaryLabel: `The first four slots must lead with ${leadScenes.join(", ")} so the store story proves the core product before secondary flows.`,
    submissionBoundaryLabel:
      "This pack prepares screenshot candidates only; it is not App Review submission approval, deployed-runtime proof, production database proof, or human-review evidence.",
    noSecretBoundaryLabel:
      "Never include account identifiers, private notes, child data, exact locations, passport data, database URLs, API keys, or smoke-test secrets in screenshot assets.",
    retakeBoundaryLabel:
      "Retake the asset when the first viewport hides the promised value, the trust boundary, the demo-safe state, route evidence, or any release blocker language.",
    scenes: orderedScenes.map((scene, index) => ({
      id: scene.id,
      title: scene.title,
      orderLabel: `Shot ${index + 1} of ${orderedScenes.length}`,
      appStoreSlotLabel:
        index < 4
          ? `Primary store slot ${index + 1}: ${scene.screenshotHeadline}`
          : `Supporting store slot ${index + 1}: ${scene.screenshotHeadline}`,
      valueProofLabel: `Visible value: ${scene.captureProof.requiredVisualProof}`,
      trustProofLabel: `Trust proof: ${scene.trustSignal}`,
      routeLabel: `Route: ${scene.route} (${formatRouteParams(scene.params)})`,
      retakeLabel: `Retake if: ${scene.captureProof.retakeIf}`,
      heroCandidate: index < 4,
      icon: scene.icon,
      tone: scene.accent,
    })),
  };
}

export function buildAppStoreClaimSafetyReceipts(
  scenes: AppStoreShowcaseScene[] = APP_STORE_SHOWCASE_SCENES,
): AppStoreSceneClaimSafetyReceipt[] {
  const blockedClaimByScene: Record<AppStoreShowcaseScene["id"], string> = {
    home: "Blocked claim: do not say NurAI is live, production verified, or connected to a real user account until release checks pass.",
    quran:
      "Blocked claim: do not say tafsir guidance is personally reviewed or complete beyond the visible source cards.",
    ai: "Blocked claim: do not say the AI gives final fatwa decisions or replaces qualified people.",
    library:
      "Blocked claim: do not say the library is fully approved until real human review evidence is imported.",
    arabic:
      "Blocked claim: do not promise certified fluency, tajwid mastery, or religious interpretation authority.",
    kids: "Blocked claim: do not show or imply real child identity, school context, or private family progress.",
    prayer:
      "Blocked claim: do not hide calculation method, location uncertainty, or make prayer data look location-free.",
    hajj: "Blocked claim: do not imply visa, permit, medical, booking, or government authority.",
  };

  return scenes.map((scene) => ({
    id: scene.id,
    title: `${scene.title} claim safety receipt`,
    publicClaimLabel: scene.captureProof.storePromise,
    evidenceStateLabel: scene.captureProof.requiredVisualProof,
    sourceBoundaryLabel: scene.blockerGuardrail,
    blockedClaimLabel: blockedClaimByScene[scene.id],
    approvalQuestion: `Can this screenshot prove "${scene.appStoreCaption}" without hiding ${scene.trustSignal.toLowerCase()}?`,
    releaseUseLabel:
      "Allowed for screenshot planning only; not production launch, deployed-runtime, database, source-pack activation, or human-review evidence.",
    icon: scene.icon,
    tone: scene.accent,
  }));
}

export function buildAppStoreListingMetadataPack(
  scenes: AppStoreShowcaseScene[] = APP_STORE_SHOWCASE_SCENES,
): AppStoreListingMetadataPack {
  const screenshotTopics = scenes.map((scene) => scene.title).join(", ");

  return {
    title: "Store listing metadata pack",
    statusLabel: "Draft metadata, honest claims",
    releaseBoundaryLabel:
      "Store metadata can be prepared now, but publishing still needs deployed runtime, production database, AI source-pack activation, and human review evidence.",
    reviewBoundaryLabel:
      "Reviewer notes must explain AI boundaries, scholar packet handoff, source labels, and why screenshots are demo-safe.",
    localizationBoundaryLabel:
      "Localization should translate benefits and boundaries, not intensify religious authority or launch claims.",
    sections: [
      {
        id: "name-subtitle",
        title: "Name and subtitle",
        valueLabel:
          "Apple/Google name: NurAI: Quran Prayer AI; Apple subtitle: Muslim habits, duas, Qibla",
        detail:
          "Keep title and subtitle within platform limits, searchable, and grounded in visible Quran, prayer, dua, Qibla, and AI trust surfaces.",
        approvalQuestion:
          "Does the name/subtitle match the screenshots without promising approval or final rulings?",
        blockedLanguageLabel:
          "Avoid authority claims such as final fatwa, guaranteed guidance, or completed human review.",
        icon: "type",
        tone: "primary",
      },
      {
        id: "promo-copy",
        title: "Promotional copy",
        valueLabel:
          "Build a calmer daily deen rhythm with Quran reading, prayer tools, duas, Arabic learning, and source-aware NurAI guidance.",
        detail:
          "Lead with daily worship and source-aware learning instead of broad AI promises.",
        approvalQuestion:
          "Can a reviewer tie every sentence to a visible screenshot scene?",
        blockedLanguageLabel:
          "Avoid saying screenshots prove external launch gates or human approval.",
        icon: "message-square",
        tone: "scholar",
      },
      {
        id: "keywords",
        title: "Keyword clusters",
        valueLabel:
          "islam, adhkar, hadith, arabic, tafsir, ramadan, hifz, tasbeeh, salah, deen, dhikr, zakat, azkar",
        detail: `Keywords should map to screenshot topics: ${screenshotTopics}.`,
        approvalQuestion:
          "Are the keywords represented by real app flows and not competitor names or unsupported services?",
        blockedLanguageLabel:
          "Avoid government, medical, visa, bank, or school keywords unless a supported flow proves them.",
        icon: "search",
        tone: "primary",
      },
      {
        id: "privacy-nutrition",
        title: "Privacy nutrition",
        valueLabel: "On-device notes, manual exports, no secrets in assets",
        detail:
          "Use the Trust Center wording for local notes, saved AI answers, review packets, and manual shares.",
        approvalQuestion:
          "Do privacy labels match actual storage, sync, export, and deletion behavior?",
        blockedLanguageLabel:
          "Avoid claiming external deletion or production erasure from local device controls.",
        icon: "lock",
        tone: "scholar",
      },
      {
        id: "review-notes",
        title: "Reviewer notes",
        valueLabel: "Explain AI, scholar review, source labels, and demo data",
        detail:
          "Give App Review a plain note that sensitive questions become packets and source labels remain visible.",
        approvalQuestion:
          "Could a reviewer understand the AI safety model without private credentials or secrets?",
        blockedLanguageLabel:
          "Do not paste API keys, smoke secrets, database URLs, private accounts, or reviewer contacts.",
        icon: "clipboard",
        tone: "danger",
      },
      {
        id: "localization",
        title: "Localization boundary",
        valueLabel: "Translate benefits and trust boundaries together",
        detail:
          "Localized captions should keep Quran, prayer, AI, family, and pilgrimage claims scoped to visible features.",
        approvalQuestion:
          "Does every localized line preserve the same source, privacy, and authority boundaries as English?",
        blockedLanguageLabel:
          "Avoid stronger religious authority, launch, or official-service wording in translations.",
        icon: "globe",
        tone: "primary",
      },
    ],
  };
}

export function buildAppStoreReviewerNotePacket(
  params: {
    scenes?: AppStoreShowcaseScene[];
    listingMetadataPack?: AppStoreListingMetadataPack;
    launchBlockerHandoff?: AppStoreLaunchBlockerHandoff[];
  } = {},
): AppStoreReviewerNotePacket {
  const scenes = params.scenes ?? APP_STORE_SHOWCASE_SCENES;
  const listingMetadataPack =
    params.listingMetadataPack ?? buildAppStoreListingMetadataPack(scenes);
  const launchBlockerHandoff =
    params.launchBlockerHandoff ??
    buildAppStoreLaunchBlockerHandoff([
      "deployed-runtime-url",
      "production-database-url",
      "library-human-review-evidence",
    ]);
  const sceneTitles = scenes.map((scene) => scene.title).join(", ");
  const blockerTitles = launchBlockerHandoff
    .map((blocker) => blocker.title)
    .join("; ");

  return {
    title: "App Review notes packet",
    statusLabel: "Reviewer notes drafted, submission still gated",
    introLabel: `NurAI screenshots demonstrate these in-app flows: ${sceneTitles}. Notes should explain the visible demo state, AI boundaries, privacy controls, and source-review limits.`,
    aiBoundaryLabel:
      "NurAI AI features are educational and source-aware; sensitive religious questions route to scholar-review packets instead of final personal rulings.",
    privacyBoundaryLabel:
      "Reviewer notes should describe local notes, saved AI answers, manual sharing, child-safety controls, and deletion/export surfaces without exposing private user data.",
    noSecretBoundaryLabel:
      "Do not include API keys, smoke secrets, database URLs, cookies, private reviewer contacts, account passwords, or raw production logs in reviewer notes.",
    blockedSubmissionLabel: `Do not submit or strengthen launch claims until these proof gates pass: ${blockerTitles}.`,
    sections: [
      {
        id: "ai-safety",
        title: "AI safety model",
        reviewerFacingNote:
          "AI answers show source coverage, uncertainty, answer modes, save controls, and follow-up prompts. Sensitive requests should create review packets rather than final rulings.",
        evidenceLabel:
          "Visible evidence: AI answer mode rail, source cards, uncertainty copy, saved answer learning plan, and scholar packet action.",
        doNotIncludeLabel:
          "Do not paste prompts containing private life details or raw model/debug payloads.",
        icon: "shield",
        tone: "scholar",
      },
      {
        id: "scholar-review",
        title: "Scholar review workflow",
        reviewerFacingNote:
          "NurAI organizes sensitive questions, source gaps, and review context into packets for qualified human review; the packet itself is not approval.",
        evidenceLabel:
          "Visible evidence: Scholar Review queue, readiness gate, evidence checklist, privacy receipt, and non-fatwa boundary.",
        doNotIncludeLabel:
          "Do not claim generated packets are scholar approval or completed human review evidence.",
        icon: "award",
        tone: "scholar",
      },
      {
        id: "privacy-data",
        title: "Privacy and data controls",
        reviewerFacingNote:
          "Trust surfaces show what personalization, saved answers, Quran reflections, Kids Mode, and review packets store or export.",
        evidenceLabel:
          "Visible evidence: Privacy Trust dashboard, personalization receipts, saved AI answers, and manual share boundaries.",
        doNotIncludeLabel:
          "Do not include real user notes, child names, exact locations, account identifiers, or private family progress.",
        icon: "lock",
        tone: "primary",
      },
      {
        id: "demo-access",
        title: "Demo access and screenshots",
        reviewerFacingNote:
          "Screenshots use demo-safe states only and do not represent production database, deployed runtime, source-pack activation, or human-review proof.",
        evidenceLabel:
          "Visible evidence: App Store showcase demo safety ledger, capture matrix, route proof, and claim safety receipts.",
        doNotIncludeLabel:
          "Do not provide secrets or live production credentials inside review notes.",
        icon: "smartphone",
        tone: "primary",
      },
      {
        id: "subscriptions",
        title: "Subscription boundaries",
        reviewerFacingNote:
          "Premium and Scholar tiers unlock deeper AI capacity, guided study, source-aware depth, and review workflows while basic free value remains available.",
        evidenceLabel:
          "Visible evidence: upgrade prompts, plan labels, feature gates, RevenueCat configuration checks, and paid-access release controls.",
        doNotIncludeLabel:
          "Do not imply paid plans replace qualified scholars or guarantee religious outcomes.",
        icon: "credit-card",
        tone: "primary",
      },
      {
        id: "launch-boundaries",
        title: "Launch proof boundaries",
        reviewerFacingNote:
          "The store listing can be prepared, but final submission language must wait for deployed runtime, production database, source-review activation, and Library human-review proof.",
        evidenceLabel: listingMetadataPack.releaseBoundaryLabel,
        doNotIncludeLabel:
          "Do not say screenshots, metadata drafts, or generated review packets clear external release checks.",
        icon: "alert-triangle",
        tone: "danger",
      },
    ],
  };
}

export function buildAppStoreReviewerNoteShareText(
  packet: AppStoreReviewerNotePacket,
): string {
  return [
    "NurAI App Review notes packet",
    `Status: ${packet.statusLabel}`,
    `Intro: ${packet.introLabel}`,
    `AI boundary: ${packet.aiBoundaryLabel}`,
    `Privacy boundary: ${packet.privacyBoundaryLabel}`,
    `No-secret boundary: ${packet.noSecretBoundaryLabel}`,
    "",
    "Reviewer-facing sections:",
    ...packet.sections.flatMap((section) => [
      `- ${section.title}`,
      `  Note: ${section.reviewerFacingNote}`,
      `  Evidence: ${section.evidenceLabel}`,
      `  Do not include: ${section.doNotIncludeLabel}`,
    ]),
    "",
    `Submission hold: ${packet.blockedSubmissionLabel}`,
    "This packet is for App Review note drafting only. It is not App Review approval, not production proof, not scholar approval, and not a substitute for final release checks.",
  ].join("\n");
}

export function buildAppStorePlatformAssetRequirements(): AppStorePlatformAssetRequirement[] {
  return [
    {
      id: "apple-ios-screenshots",
      platformLabel: "Apple App Store",
      statusLabel: "iPhone screenshots planned",
      assetCountLabel:
        "Prepare one to ten JPEG, JPG, or PNG screenshots per localization.",
      formatLabel:
        "Primary iPhone capture set should include 6.9 inch portrait assets; keep 6.5 inch and 5.5 inch compatibility frames for review planning.",
      captureImplicationLabel:
        "Use the 6.9 inch batch for the first flagship story, then retake older frame families only when layout or text wrapping changes.",
      firstViewportRuleLabel:
        "Every retained Apple screenshot must show the real in-app interface with the headline feature visible before scrolling.",
      noGoLabel:
        "Do not submit screenshots that imply completed release proof, completed human review, or source authority beyond the visible UI.",
      sourceLabel:
        "Based on current App Store Connect screenshot specifications checked during this capture-planning pass.",
      sourceUrl:
        "https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications",
      sourceCheckedLabel:
        "Checked against Apple App Store Connect screenshot specifications on 2026-06-01.",
      sourceRequirementLabel:
        "Apple currently requires one to ten screenshots in JPEG, JPG, or PNG, with 6.9 inch iPhone portrait sizes planned as the primary capture family.",
      accessibilityAltTextLabel:
        "Keep App Store screenshot text readable in the asset itself and keep the UI capture understandable without relying on decorative device framing.",
      complianceBoundaryLabel:
        "Apple screenshot sizing compliance is asset-format evidence only; it does not prove deployed runtime, database, or human-review readiness.",
      icon: "smartphone",
      tone: "scholar",
    },
    {
      id: "google-play-screenshots",
      platformLabel: "Google Play",
      statusLabel: "Android screenshots planned",
      assetCountLabel:
        "Provide at least two screenshots, with at least four high-resolution portrait screenshots for stronger store placement eligibility.",
      formatLabel:
        "Use JPEG or 24-bit PNG without alpha, minimum 320 px, maximum 3840 px, and keep the long side no more than twice the short side.",
      captureImplicationLabel:
        "Reuse the same eight flagship scenes as actual in-app screenshots and prioritize UI clarity in the first three images.",
      firstViewportRuleLabel:
        "Google Play assets should demonstrate core app features and functionality from the app itself, not abstract marketing artwork.",
      noGoLabel:
        "Do not show people interacting with the device, private data, or claims that are not visible inside the current app experience.",
      sourceLabel:
        "Based on current Google Play preview asset requirements checked during this capture-planning pass.",
      sourceUrl:
        "https://support.google.com/googleplay/android-developer/answer/9866151",
      sourceCheckedLabel:
        "Checked against Google Play preview asset requirements on 2026-06-01.",
      sourceRequirementLabel:
        "Google Play currently requires at least two screenshots, JPEG or 24-bit PNG without alpha, with minimum 320 px and maximum 3840 px dimensions.",
      accessibilityAltTextLabel:
        "Google Play asks for screenshot alt text; keep each description under 140 characters and focused on the visible app state.",
      complianceBoundaryLabel:
        "Google Play asset compliance prepares store listing media only; it does not prove production launch, private-data safety, or religious review claims.",
      icon: "play-circle",
      tone: "primary",
    },
  ];
}

export function buildAppStoreCaptureSessionPlan(
  scenes: AppStoreShowcaseScene[] = APP_STORE_SHOWCASE_SCENES,
): AppStoreCaptureSessionPlan {
  const orderedScenes = [...scenes].sort(
    (a, b) => a.capturePriority - b.capturePriority,
  );
  const batches = orderedScenes.reduce<AppStoreCaptureSessionBatch[]>(
    (acc, scene) => {
      const existing = acc.find(
        (batch) => batch.deviceFrame === scene.deviceFrame,
      );
      if (existing) {
        existing.sceneCount += 1;
        existing.sceneTitles.push(scene.title);
        return acc;
      }
      acc.push({
        deviceFrame: scene.deviceFrame,
        sceneCount: 1,
        sceneTitles: [scene.title],
        firstSceneTitle: scene.title,
        captureBoundaryLabel:
          "Capture this frame only with populated demo data and visible trust boundaries.",
      });
      return acc;
    },
    [],
  );
  const firstScene = orderedScenes[0] ?? APP_STORE_SHOWCASE_SCENES[0];

  return {
    title: "Capture session plan",
    nextSceneTitle: firstScene?.title ?? "Today’s Deen",
    nextSceneRouteName: firstScene?.route ?? "Main",
    nextSceneActionLabel: firstScene?.primaryActionLabel ?? "Open Today’s Deen",
    estimatedMinutesLabel: `${Math.max(orderedScenes.length * 6, 12)} min capture pass`,
    batchCount: batches.length,
    sessionBoundaryLabel:
      "Capture in priority order, then batch retakes by device frame so the story arc stays consistent.",
    privacyBoundaryLabel:
      "Use demo-safe states only: no private notes, child names, exact locations, account details, or secrets.",
    retakeBoundaryLabel:
      "Retake any screenshot where first-viewport proof, trust labels, or release blocker boundaries are hidden.",
    batches,
  };
}

export function buildAppStoreShowcaseCaptureHandoffText(
  scenes: AppStoreShowcaseScene[] = APP_STORE_SHOWCASE_SCENES,
  readiness: AppStoreShowcaseReadiness = getAppStoreShowcaseReadiness(),
): string {
  const orderedScenes = [...scenes].sort(
    (a, b) => a.capturePriority - b.capturePriority,
  );

  return [
    "NurAI App Store screenshot capture handoff",
    `Scenes: ${readiness.sceneCount}`,
    `Flows: ${readiness.flowCount}`,
    `Trust scenes: ${readiness.trustSceneCount}`,
    `Capture decision: ${readiness.captureDecisionSummary.captureStatusLabel}`,
    `Launch boundary: ${readiness.captureDecisionSummary.launchStatusLabel}`,
    `Submission passport: ${readiness.submissionReadinessPassport.statusLabel}`,
    `Submission boundary: ${readiness.submissionReadinessPassport.submissionBoundaryLabel}`,
    `No-secret boundary: ${readiness.submissionReadinessPassport.noSecretLabel}`,
    `Next capture: ${readiness.captureSessionPlan.nextSceneTitle} (${readiness.captureSessionPlan.nextSceneRouteName})`,
    `Capture pass: ${readiness.captureSessionPlan.estimatedMinutesLabel}`,
    "",
    "Release boundaries:",
    ...readiness.releaseBlockerLabels.map((blocker) => `- ${blocker}`),
    readiness.releaseNote,
    "",
    "Launch evidence sprint:",
    `Status: ${readiness.launchEvidenceSprint.statusLabel}`,
    `Next action: ${readiness.launchEvidenceSprint.nextActionLabel}`,
    `Capture boundary: ${readiness.launchEvidenceSprint.captureBoundaryLabel}`,
    `Library sprint bridge: ${readiness.launchEvidenceSprint.librarySprintBridgeLabel}`,
    ...readiness.launchEvidenceSprint.tasks.flatMap((task) => [
      `- ${task.title}`,
      `  Owner: ${task.ownerLabel}`,
      `  Action: ${task.actionLabel}`,
      `  Proof: ${task.proofLabel}`,
      `  Boundary: ${task.boundaryLabel}`,
    ]),
    "",
    "Release blocker resolution plan:",
    `Status: ${readiness.releaseBlockerResolutionPlan.statusLabel}`,
    `First action: ${readiness.releaseBlockerResolutionPlan.firstActionLabel}`,
    `Evidence boundary: ${readiness.releaseBlockerResolutionPlan.evidenceBoundaryLabel}`,
    `No-secret boundary: ${readiness.releaseBlockerResolutionPlan.noSecretBoundaryLabel}`,
    ...readiness.releaseBlockerResolutionPlan.rows.flatMap((row) => [
      `- ${row.orderLabel}: ${row.title}`,
      `  Dependency: ${row.dependencyLabel}`,
      `  Owner: ${row.ownerLabel}`,
      `  Proof: ${row.proofCommandLabel}`,
      `  Acceptance: ${row.acceptanceLabel}`,
    ]),
    "",
    "Maintainability runway:",
    `Status: ${readiness.maintainabilityRunway.statusLabel}`,
    `No-secret boundary: ${readiness.maintainabilityRunway.noSecretBoundaryLabel}`,
    `External blocker boundary: ${readiness.maintainabilityRunway.blockerBoundaryLabel}`,
    `Merge policy: ${readiness.maintainabilityRunway.mergePolicyLabel}`,
    ...readiness.maintainabilityRunway.slices.flatMap((slice) => [
      `- ${slice.title}`,
      `  Owner: ${slice.ownerLabel}`,
      `  Check: ${slice.commandLabel}`,
      `  Review boundary: ${slice.reviewBoundaryLabel}`,
      `  Acceptance: ${slice.acceptanceLabel}`,
    ]),
    "",
    "Post-release watch plan:",
    `Status: ${readiness.postLaunchWatchPlan.statusLabel}`,
    `Cadence: ${readiness.postLaunchWatchPlan.cadenceLabel}`,
    `No-secret boundary: ${readiness.postLaunchWatchPlan.noSecretBoundaryLabel}`,
    `Hold-launch boundary: ${readiness.postLaunchWatchPlan.holdLaunchBoundaryLabel}`,
    ...readiness.postLaunchWatchPlan.tasks.flatMap((task) => [
      `- ${task.title}`,
      `  Owner: ${task.ownerLabel}`,
      `  Signal: ${task.signalLabel}`,
      `  Check: ${task.commandLabel}`,
      `  Escalate: ${task.escalationLabel}`,
    ]),
    "",
    "Launch blocker handoff:",
    ...readiness.launchBlockerHandoff.flatMap((blocker) => [
      `- ${blocker.title}`,
      `  Owner: ${blocker.ownerLabel}`,
      `  Next action: ${blocker.nextActionLabel}`,
      `  Proof command: ${blocker.proofCommandLabel}`,
      `  Evidence boundary: ${blocker.evidenceBoundaryLabel}`,
      "  Acceptance:",
      ...blocker.acceptanceChecklist.map((item) => `  - ${item}`),
      `  Secret boundary: ${blocker.noSecretBoundaryLabel}`,
    ]),
    "",
    "Release evidence intake packet:",
    `Status: ${readiness.releaseEvidenceIntakePacket.statusLabel}`,
    `Schema boundary: ${readiness.releaseEvidenceIntakePacket.schemaBoundaryLabel}`,
    `Owner boundary: ${readiness.releaseEvidenceIntakePacket.ownerBoundaryLabel}`,
    `No-secret boundary: ${readiness.releaseEvidenceIntakePacket.noSecretBoundaryLabel}`,
    ...readiness.releaseEvidenceIntakePacket.rows.flatMap((row) => [
      `- ${row.title}`,
      `  Gate: ${row.gateLabel}`,
      `  Command: ${row.requiredCommandLabel}`,
      `  Evidence record: ${row.evidenceRecordLabel}`,
      `  Notes prompt: ${row.nonSecretNotesPrompt}`,
    ]),
    "",
    "QA gates:",
    ...readiness.captureQualityGates.map(
      (gate) => `- ${gate.title}: ${gate.passLabel}. ${gate.failState}`,
    ),
    "",
    "Demo data safety:",
    ...readiness.demoDataSafetyRules.flatMap((rule) => [
      `- ${rule.title} (${rule.routeName})`,
      `  Approved demo state: ${rule.approvedDemoStateLabel}`,
      `  Never show: ${rule.neverShowLabel}`,
      `  Pre-capture check: ${rule.preCaptureCheckLabel}`,
      `  Retake if: ${rule.retakeIfLabel}`,
    ]),
    "",
    "Screenshot proof pack:",
    `Status: ${readiness.screenshotSetProofPack.statusLabel}`,
    `Summary: ${readiness.screenshotSetProofPack.summaryLabel}`,
    `First four boundary: ${readiness.screenshotSetProofPack.firstFourBoundaryLabel}`,
    `Submission boundary: ${readiness.screenshotSetProofPack.submissionBoundaryLabel}`,
    `No-secret boundary: ${readiness.screenshotSetProofPack.noSecretBoundaryLabel}`,
    `Retake boundary: ${readiness.screenshotSetProofPack.retakeBoundaryLabel}`,
    ...readiness.screenshotSetProofPack.scenes.flatMap((scene) => [
      `- ${scene.orderLabel}: ${scene.title}`,
      `  Store slot: ${scene.appStoreSlotLabel}`,
      `  Value proof: ${scene.valueProofLabel}`,
      `  Trust proof: ${scene.trustProofLabel}`,
      `  Route: ${scene.routeLabel}`,
      `  Retake: ${scene.retakeLabel}`,
    ]),
    "",
    "Screenshot readiness contracts:",
    ...readiness.screenshotReadinessContracts.flatMap((contract) => [
      `- ${contract.title} (${contract.routeName})`,
      `  Status: ${contract.statusLabel}`,
      `  Priority: ${contract.priorityLabel}`,
      `  Next action: ${contract.nextActionLabel}`,
      `  Boundary: ${contract.boundaryLabel}`,
      ...contract.items.map(
        (item) =>
          `  - ${item.label}: ${item.complete ? "ready" : "needs work"} - ${item.evidenceLabel}. ${item.boundaryLabel}`,
      ),
    ]),
    "",
    "Claim safety receipts:",
    ...readiness.claimSafetyReceipts.flatMap((receipt) => [
      `- ${receipt.title}`,
      `  Public claim: ${receipt.publicClaimLabel}`,
      `  Visible evidence: ${receipt.evidenceStateLabel}`,
      `  Boundary: ${receipt.sourceBoundaryLabel}`,
      `  Blocked claim: ${receipt.blockedClaimLabel}`,
      `  Approval question: ${receipt.approvalQuestion}`,
      `  Release use: ${receipt.releaseUseLabel}`,
    ]),
    "",
    "Store listing metadata pack:",
    `Status: ${readiness.listingMetadataPack.statusLabel}`,
    `Release boundary: ${readiness.listingMetadataPack.releaseBoundaryLabel}`,
    `Review boundary: ${readiness.listingMetadataPack.reviewBoundaryLabel}`,
    `Localization boundary: ${readiness.listingMetadataPack.localizationBoundaryLabel}`,
    ...readiness.listingMetadataPack.sections.flatMap((section) => [
      `- ${section.title}: ${section.valueLabel}`,
      `  Detail: ${section.detail}`,
      `  Approval question: ${section.approvalQuestion}`,
      `  Blocked language: ${section.blockedLanguageLabel}`,
    ]),
    "",
    "App Review notes packet:",
    `Status: ${readiness.reviewerNotePacket.statusLabel}`,
    `Intro: ${readiness.reviewerNotePacket.introLabel}`,
    `AI boundary: ${readiness.reviewerNotePacket.aiBoundaryLabel}`,
    `Privacy boundary: ${readiness.reviewerNotePacket.privacyBoundaryLabel}`,
    `No-secret boundary: ${readiness.reviewerNotePacket.noSecretBoundaryLabel}`,
    `Blocked submission: ${readiness.reviewerNotePacket.blockedSubmissionLabel}`,
    ...readiness.reviewerNotePacket.sections.flatMap((section) => [
      `- ${section.title}`,
      `  Reviewer note: ${section.reviewerFacingNote}`,
      `  Evidence: ${section.evidenceLabel}`,
      `  Do not include: ${section.doNotIncludeLabel}`,
    ]),
    "",
    "Platform asset requirements:",
    ...readiness.platformAssetRequirements.flatMap((requirement) => [
      `- ${requirement.platformLabel}: ${requirement.statusLabel}`,
      `  Count: ${requirement.assetCountLabel}`,
      `  Format: ${requirement.formatLabel}`,
      `  Capture implication: ${requirement.captureImplicationLabel}`,
      `  First viewport: ${requirement.firstViewportRuleLabel}`,
      `  Do not submit: ${requirement.noGoLabel}`,
      `  Source note: ${requirement.sourceLabel}`,
    ]),
    "",
    "Store asset compliance questions:",
    ...readiness.storeAssetComplianceQuestions.map(
      (question) => `- ${question}`,
    ),
    "",
    "Submission readiness passport:",
    `Status: ${readiness.submissionReadinessPassport.statusLabel}`,
    `Summary: ${readiness.submissionReadinessPassport.summaryLabel}`,
    `Screenshot boundary: ${readiness.submissionReadinessPassport.screenshotBoundaryLabel}`,
    `Submission boundary: ${readiness.submissionReadinessPassport.submissionBoundaryLabel}`,
    `No-secret boundary: ${readiness.submissionReadinessPassport.noSecretLabel}`,
    ...readiness.submissionReadinessPassport.rows.flatMap((row) => [
      `- ${row.title}: ${row.valueLabel}`,
      `  Detail: ${row.detail}`,
      `  Next action: ${row.nextActionLabel}`,
    ]),
    "",
    "Decision summary:",
    `- ${readiness.captureDecisionSummary.nextCaptureAction}`,
    `- ${readiness.captureDecisionSummary.blockedLaunchReason}`,
    `- ${readiness.captureDecisionSummary.qaGateLabel}`,
    `- ${readiness.captureDecisionSummary.captureProofLabel}`,
    "",
    "Capture session plan:",
    `- ${readiness.captureSessionPlan.sessionBoundaryLabel}`,
    `- ${readiness.captureSessionPlan.privacyBoundaryLabel}`,
    `- ${readiness.captureSessionPlan.retakeBoundaryLabel}`,
    ...readiness.captureSessionPlan.batches.map(
      (batch) =>
        `- ${batch.deviceFrame}: ${batch.sceneCount} scene(s), start with ${batch.firstSceneTitle}`,
    ),
    "",
    "Capture runbook:",
    ...readiness.captureRunbook.map((step, index) => `${index + 1}. ${step}`),
    "",
    "Shot list:",
    ...orderedScenes.flatMap((scene) => [
      `${scene.capturePriority}. ${scene.title} (${scene.route}, ${scene.deviceFrame})`,
      `   Headline: ${scene.screenshotHeadline}`,
      `   Store line: ${scene.appStoreCaption}`,
      `   First viewport: ${scene.firstViewportSignal}`,
      `   Safe demo state: ${scene.captureProof.safeDemoState}`,
      `   Retake if: ${scene.captureProof.retakeIf}`,
      `   Trust boundary: ${scene.blockerGuardrail}`,
    ]),
    "",
    "Capture note: this handoff prepares screenshots only. It is not production launch evidence, human review evidence, or deployed-runtime proof.",
  ].join("\n");
}

export function buildAppStoreLaunchBlockerHandoff(
  blockerLabels: AppStoreLaunchBlockerHandoff["id"][],
): AppStoreLaunchBlockerHandoff[] {
  const handoffById: Record<
    AppStoreLaunchBlockerHandoff["id"],
    AppStoreLaunchBlockerHandoff
  > = {
    "deployed-runtime-url": {
      id: "deployed-runtime-url",
      title: "Deployed AI runtime proof",
      ownerLabel: "Release operator with production host access",
      nextActionLabel:
        "Deploy the latest server, set release smoke secret, and run the live deployed AI smoke check.",
      proofCommandLabel:
        "NURAI_DEPLOYMENT_URL=https://... NURAI_DEPLOYED_AI_SMOKE_SECRET=... npm run check:ai-release:deployed",
      evidenceBoundaryLabel:
        "Attach redacted pass output to release external evidence; screenshots alone are not deployed-runtime proof.",
      acceptanceChecklist: [
        "Production HTTPS host is named in proof notes without secrets.",
        "Public status redaction, protected diagnostics, and live smoke all pass.",
        "Release blockers no longer list deployed-runtime-url.",
      ],
      noSecretBoundaryLabel:
        "Never paste smoke secrets, OpenAI keys, or session secrets into docs, screenshots, or committed files.",
      icon: "cloud",
    },
    "production-database-url": {
      id: "production-database-url",
      title: "Production database proof",
      ownerLabel: "Release operator with production Supabase/Postgres access",
      nextActionLabel:
        "Run the non-secret DB proof plan, verify the production target, apply migrations, then re-run DB release checks.",
      proofCommandLabel:
        "DATABASE_URL=postgresql://... npm run check:production-db-release -- --json",
      evidenceBoundaryLabel:
        "Record non-secret migration hashes and pass/fail summaries only; the URL itself must stay outside evidence files.",
      acceptanceChecklist: [
        "Target check confirms the intended production project before apply.",
        "Dry-run, apply, ownership, release, and migration-applied checks pass.",
        "Command results use redacted summaries, never raw connection strings.",
      ],
      noSecretBoundaryLabel:
        "Do not log, screenshot, or commit the production DATABASE_URL or database password.",
      icon: "database",
    },
    "source-pack-activation-readiness": {
      id: "source-pack-activation-readiness",
      title: "AI source-pack activation evidence",
      ownerLabel:
        "AI source reviewer, licensing reviewer, and qualified Islamic content reviewer",
      nextActionLabel:
        "Complete tafsir, hadith, fiqh, and seerah source-card evidence, run final readiness, then activate only approved cards.",
      proofCommandLabel:
        "npm run check:source-pack-final-readiness -- --summary-json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
      evidenceBoundaryLabel:
        "Only current source-card hashes, reviewer identity, qualification, licensing evidence, reviewed explanation text, and activation approval count.",
      acceptanceChecklist: [
        "Every draft tafsir, hadith, fiqh, and seerah card has current reviewed evidence.",
        "Final readiness reports activation-ready with zero secret-like values.",
        "AI source catalog checks still pass after approved evidence is applied.",
      ],
      noSecretBoundaryLabel:
        "Do not paste API keys, Authorization headers, reviewer private contacts, copied source text, or unapproved source-card content into store evidence.",
      icon: "shield",
    },
    "library-human-review-evidence": {
      id: "library-human-review-evidence",
      title: "Library human review evidence",
      ownerLabel:
        "Editorial reviewer, source reviewer, and qualified scholar reviewer for high-care books",
      nextActionLabel:
        "Import real review evidence for current content hashes, validate it strictly, then apply the approved evidence.",
      proofCommandLabel:
        "npm run validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --strict --summary-json",
      evidenceBoundaryLabel:
        "Only real reviewer names, dates, notes, checklist evidence, content hashes, and approval decisions count.",
      acceptanceChecklist: [
        "Every included book references the current content hash.",
        "Editorial/source review notes and quality checklist fields are complete.",
        "Sensitive books include qualified scholar scope, date, and notes.",
      ],
      noSecretBoundaryLabel:
        "Do not mark screenshots, generated packets, or draft handoffs as human review evidence.",
      icon: "users",
    },
  };

  return blockerLabels.map((blocker) => handoffById[blocker]);
}

export function buildAppStoreLaunchEvidenceSprint(
  blockers: AppStoreLaunchBlockerHandoff[],
): AppStoreLaunchEvidenceSprint {
  const libraryBlocker = blockers.find(
    (blocker) => blocker.id === "library-human-review-evidence",
  );

  return {
    title: "Launch evidence sprint",
    statusLabel: `${blockers.length} launch evidence gate${blockers.length === 1 ? "" : "s"} still open`,
    summary:
      "Use this sprint to assign launch proof work without turning screenshot capture into production, database, or human-review evidence.",
    nextActionLabel:
      libraryBlocker?.nextActionLabel ??
      "Clear deployed runtime, production database, source-pack activation, and human review evidence before stronger launch claims.",
    captureBoundaryLabel:
      "Screenshot capture can continue only as demo-safe marketing preparation; it does not clear launch evidence gates.",
    librarySprintBridgeLabel:
      "For the Library and AI source-pack gates, open Source Trust Review and share the review sprint plan before importing any evidence.",
    tasks: blockers.map((blocker) => ({
      id: blocker.id,
      title: blocker.title,
      ownerLabel: blocker.ownerLabel,
      actionLabel: blocker.nextActionLabel,
      proofLabel: blocker.proofCommandLabel,
      boundaryLabel: blocker.evidenceBoundaryLabel,
      icon: blocker.icon,
      tone:
        blocker.id === "library-human-review-evidence"
          ? "scholar"
          : blocker.id === "source-pack-activation-readiness"
            ? "scholar"
            : blocker.id === "production-database-url"
              ? "primary"
              : "danger",
    })),
  };
}

export function buildAppStoreReleaseEvidenceIntakePacket(
  blockers: AppStoreLaunchBlockerHandoff[],
): AppStoreReleaseEvidenceIntakePacket {
  const gateLabels: Record<AppStoreLaunchBlockerHandoff["id"], string> = {
    "deployed-runtime-url":
      "External gate: deployed-runtime-url evidence.verified must be true.",
    "production-database-url":
      "External gate: production-database-url evidence.verified must be true.",
    "source-pack-activation-readiness":
      "AI source gate: source-pack-activation-readiness needs real reviewer approval before activation claims.",
    "library-human-review-evidence":
      "Content gate: library-content-completion needs real review evidence for current hashes.",
  };

  return {
    title: "Release evidence intake packet",
    statusLabel: `${blockers.length} proof record${blockers.length === 1 ? "" : "s"} waiting`,
    summaryLabel:
      "Use this packet to capture redacted command results and owner notes for the exact gates that still block stronger launch claims.",
    schemaBoundaryLabel:
      "Every proof record needs current gate status, command exit code, timestamp, summary JSON or SHA-256 summary hash, verified owner, and non-secret result notes.",
    ownerBoundaryLabel:
      "Only the owner with access to the production host, production database, source-pack review evidence, or real library review evidence should mark a row verified.",
    noSecretBoundaryLabel:
      "Never paste smoke secrets, OpenAI keys, session cookies, database URLs, service role keys, private reviewer contacts, or raw user data.",
    rows: blockers.map((blocker) => ({
      id: blocker.id,
      title: blocker.title,
      gateLabel: gateLabels[blocker.id],
      ownerLabel: blocker.ownerLabel,
      requiredCommandLabel: blocker.proofCommandLabel,
      evidenceRecordLabel:
        "Record exitCode 0, ranAt, summaryJson or summarySha256, verifiedBy, verifiedAt, and nonSecretResultNotes after the command passes.",
      nonSecretNotesPrompt: `Write non-secret notes proving ${blocker.title.toLowerCase()} without copying credentials, private payloads, or raw logs.`,
      acceptanceSummaryLabel: blocker.acceptanceChecklist.join(" "),
      noSecretBoundaryLabel: blocker.noSecretBoundaryLabel,
      icon: blocker.icon,
      tone:
        blocker.id === "library-human-review-evidence"
          ? "scholar"
          : blocker.id === "source-pack-activation-readiness"
            ? "scholar"
            : blocker.id === "production-database-url"
              ? "primary"
              : "danger",
    })),
  };
}

export function buildAppStoreReleaseBlockerResolutionPlan(
  blockers: AppStoreLaunchBlockerHandoff[],
): AppStoreReleaseBlockerResolutionPlan {
  const dependencyLabels: Record<AppStoreLaunchBlockerHandoff["id"], string> = {
    "deployed-runtime-url":
      "Do first: production host and smoke proof unblock live AI claims and reviewer demo confidence.",
    "production-database-url":
      "Do after runtime target is known: production DB proof protects migrations, ownership, auth, and account data.",
    "source-pack-activation-readiness":
      "Do before stronger AI source claims: source-pack activation needs reviewed tafsir, hadith, fiqh, and seerah files.",
    "library-human-review-evidence":
      "Do before Library publication claims: human review evidence must match current content hashes.",
  };
  const tones: Record<
    AppStoreLaunchBlockerHandoff["id"],
    "primary" | "scholar" | "danger"
  > = {
    "deployed-runtime-url": "danger",
    "production-database-url": "primary",
    "source-pack-activation-readiness": "scholar",
    "library-human-review-evidence": "scholar",
  };

  return {
    title: "Release blocker resolution plan",
    statusLabel: `${blockers.length} launch blocker${blockers.length === 1 ? "" : "s"} sequenced`,
    summaryLabel:
      "Resolve blockers in this order so launch proof is gathered without mixing screenshots, private data, generated packets, or unreviewed source material into release evidence.",
    firstActionLabel:
      blockers[0]?.nextActionLabel ??
      "No launch blockers are currently listed; rerun release blockers before submission.",
    screenshotBoundaryLabel:
      "Screenshot capture can continue as demo-safe preparation, but it must not be used as proof that runtime, database, source-pack, or human-review gates passed.",
    evidenceBoundaryLabel:
      "Each row needs redacted command output, owner confirmation, timestamp, and acceptance notes tied to the exact build or content hash.",
    noSecretBoundaryLabel:
      "Never include DATABASE_URL values, smoke secrets, API keys, cookies, Authorization headers, service role keys, reviewer private contacts, or raw user data.",
    rows: blockers.map((blocker, index) => ({
      id: blocker.id,
      title: blocker.title,
      orderLabel: `Step ${index + 1} of ${blockers.length}`,
      dependencyLabel: dependencyLabels[blocker.id],
      ownerLabel: blocker.ownerLabel,
      unblockActionLabel: blocker.nextActionLabel,
      proofCommandLabel: blocker.proofCommandLabel,
      acceptanceLabel: blocker.acceptanceChecklist.join(" "),
      noSecretBoundaryLabel: blocker.noSecretBoundaryLabel,
      icon: blocker.icon,
      tone: tones[blocker.id],
    })),
  };
}

export function buildAppStoreReleaseBlockerResolutionShareText(
  plan: AppStoreReleaseBlockerResolutionPlan,
): string {
  return [
    "NurAI release blocker resolution packet",
    `Status: ${plan.statusLabel}`,
    `First action: ${plan.firstActionLabel}`,
    `Screenshot boundary: ${plan.screenshotBoundaryLabel}`,
    `Evidence boundary: ${plan.evidenceBoundaryLabel}`,
    `No-secret boundary: ${plan.noSecretBoundaryLabel}`,
    "",
    "Sequenced blocker plan:",
    ...plan.rows.flatMap((row) => [
      `- ${row.orderLabel}: ${row.title}`,
      `  Dependency: ${row.dependencyLabel}`,
      `  Owner: ${row.ownerLabel}`,
      `  Action: ${row.unblockActionLabel}`,
      `  Proof command: ${row.proofCommandLabel}`,
      `  Acceptance: ${row.acceptanceLabel}`,
      `  No-secret boundary: ${row.noSecretBoundaryLabel}`,
    ]),
    "",
    "This packet is a release-owner handoff only. It is not App Review approval, not production runtime proof, not database proof, not source-pack activation evidence, and not human-review evidence.",
  ].join("\n");
}

function buildAppStoreCaptureDecisionSummary(params: {
  scenes: AppStoreShowcaseScene[];
  qaGateCount: number;
  proofLedgerCount: number;
  routeProofCount: number;
  blockerLabels: string[];
}): AppStoreCaptureDecisionSummary {
  const captureReady =
    params.proofLedgerCount === params.scenes.length &&
    params.routeProofCount === params.scenes.length &&
    params.qaGateCount >= 4;
  return {
    title: "Capture decision",
    captureStatusLabel: captureReady
      ? "Capture-ready with QA gates"
      : "Capture plan needs QA attention",
    launchStatusLabel: "Launch still blocked by external proof",
    nextCaptureAction:
      "Capture scenes only after the first viewport, trust boundary, privacy, and blocker gates pass.",
    blockedLaunchReason:
      "Do not use screenshots as launch proof; deployed runtime, production database, AI source-pack activation, and human review evidence remain separate gates.",
    qaGateLabel: `${params.qaGateCount} QA gates must pass before keeping a screenshot.`,
    captureProofLabel: `${params.proofLedgerCount}/${params.scenes.length} claim proofs and ${params.routeProofCount}/${params.scenes.length} route proofs are mapped.`,
    blockerLabels: params.blockerLabels,
  };
}

export function buildAppStoreSubmissionReadinessPassport(params: {
  scenes: AppStoreShowcaseScene[];
  captureDecisionSummary: AppStoreCaptureDecisionSummary;
  captureSessionPlan: AppStoreCaptureSessionPlan;
  listingMetadataPack: AppStoreListingMetadataPack;
  demoDataSafetyRules: AppStoreDemoDataSafetyRule[];
  launchEvidenceSprint: AppStoreLaunchEvidenceSprint;
  launchBlockerHandoff: AppStoreLaunchBlockerHandoff[];
}): AppStoreSubmissionReadinessPassport {
  const {
    captureDecisionSummary,
    captureSessionPlan,
    demoDataSafetyRules,
    launchBlockerHandoff,
    launchEvidenceSprint,
    listingMetadataPack,
    scenes,
  } = params;
  const launchBlocked = launchBlockerHandoff.length > 0;
  const demoSafetyComplete = demoDataSafetyRules.length === scenes.length;
  const metadataReady = listingMetadataPack.sections.length >= 6;
  const statusLabel = launchBlocked
    ? "Submission blocked by launch proof"
    : "Submission package can move to final review";
  const summaryLabel = `${scenes.length} screenshot scenes, ${listingMetadataPack.sections.length} metadata sections, ${demoDataSafetyRules.length}/${scenes.length} demo-safety rows, ${launchBlockerHandoff.length} launch proof blocker(s).`;

  return {
    title: "Submission readiness passport",
    statusLabel,
    summaryLabel,
    screenshotBoundaryLabel:
      "Screenshots and store metadata may be prepared as demo-safe assets only.",
    submissionBoundaryLabel: launchBlocked
      ? "Do not submit or make launch-ready claims until deployed runtime, production database, AI source-pack activation, and Library human-review proof pass."
      : "Submission can proceed only with current screenshots, metadata, privacy labels, and release proof attached to this build.",
    noSecretLabel:
      "Do not put API keys, smoke secrets, database URLs, cookies, private reviewer contacts, or user data in screenshots, notes, or handoff text.",
    nextActionLabel: launchBlocked
      ? launchEvidenceSprint.nextActionLabel
      : captureSessionPlan.nextSceneActionLabel,
    nextActionRouteName: launchBlocked
      ? "AppStoreShowcase"
      : captureSessionPlan.nextSceneRouteName,
    rows: [
      {
        id: "screenshots",
        title: "Screenshot set",
        valueLabel: captureDecisionSummary.captureStatusLabel,
        detail: `${scenes.length} scenes are mapped with first-viewport proof, route proof, and claim receipts.`,
        nextActionLabel: captureSessionPlan.nextSceneActionLabel,
        icon: "image",
        tone: "primary",
      },
      {
        id: "metadata",
        title: "Store metadata",
        valueLabel: listingMetadataPack.statusLabel,
        detail: metadataReady
          ? "Name, promo copy, keywords, privacy nutrition, reviewer notes, and localization boundaries are drafted."
          : "Metadata pack needs all required store listing sections before submission review.",
        nextActionLabel: "Review metadata pack",
        icon: "file-text",
        tone: metadataReady ? "scholar" : "danger",
      },
      {
        id: "demo-safety",
        title: "Demo data safety",
        valueLabel: demoSafetyComplete
          ? "Demo-safe states mapped"
          : "Demo safety incomplete",
        detail:
          "Every screenshot scene has an approved demo state, never-show list, pre-capture check, and retake rule.",
        nextActionLabel: "Review safety ledger",
        icon: "lock",
        tone: demoSafetyComplete ? "primary" : "danger",
      },
      {
        id: "launch-proof",
        title: "Launch proof",
        valueLabel: launchEvidenceSprint.statusLabel,
        detail:
          "Submission readiness stays blocked until external runtime, production database, AI source-pack activation, and human-review evidence are attached.",
        nextActionLabel: launchEvidenceSprint.nextActionLabel,
        icon: "shield",
        tone: launchBlocked ? "danger" : "scholar",
      },
    ],
  };
}

export function buildAppStoreMaintainabilityRunway(
  launchBlockerHandoff: AppStoreLaunchBlockerHandoff[],
): AppStoreMaintainabilityRunway {
  const blockerTitles = launchBlockerHandoff
    .map((blocker) => blocker.title)
    .join(", ");

  return {
    title: "Maintainability runway",
    statusLabel:
      "6 logical review slices mapped before production release evidence",
    summaryLabel:
      "Use this runway to keep Quran, personalization, AI trust, Library, App Store, and backend proof changes reviewable instead of landing one risky mega-commit.",
    noSecretBoundaryLabel:
      "Stage only non-secret source, docs, and redacted evidence; never mix DATABASE_URL values, smoke secrets, API keys, generated binaries, or private reviewer details into these slices.",
    blockerBoundaryLabel: `Release claims remain blocked by ${blockerTitles}; passing a slice review does not clear external production proof.`,
    mergePolicyLabel:
      "Each slice needs its focused check command, copy/claim checks, and a clean logical-slice review before it is eligible for commit or handoff.",
    slices: [
      {
        id: "quran-home",
        title: "Quran and Home flagship",
        ownerLabel: "Product/UI reviewer",
        commandLabel: "npm run check:logical-slice -- quran-home",
        reviewBoundaryLabel:
          "Review daily Quran, Today Deen, prayer context, and compact search placement together.",
        acceptanceLabel:
          "Quran and Home checks pass without hiding source boundaries or moving search above the worship home.",
        icon: "book-open",
        tone: "scholar",
      },
      {
        id: "personalization-privacy",
        title: "Personal plan and privacy",
        ownerLabel: "Privacy and onboarding reviewer",
        commandLabel: "npm run check:logical-slice -- personalization-privacy",
        reviewBoundaryLabel:
          "Review onboarding preferences, plan controls, export/delete states, and privacy trust receipts together.",
        acceptanceLabel:
          "Personalization feels useful while export/delete and data-boundary labels stay visible.",
        icon: "lock",
        tone: "primary",
      },
      {
        id: "ai-trust",
        title: "AI trust and scholar review",
        ownerLabel: "AI safety and scholar workflow reviewer",
        commandLabel: "npm run check:logical-slice -- ai-trust",
        reviewBoundaryLabel:
          "Review answer modes, source cards, saved answers, sensitive routing, and scholar packets together.",
        acceptanceLabel:
          "Sensitive religious questions become packets or cautious source-backed flows, not casual final rulings.",
        icon: "shield",
        tone: "scholar",
      },
      {
        id: "library",
        title: "Library learning and source review",
        ownerLabel: "Editorial/source review owner",
        commandLabel: "npm run check:logical-slice -- library",
        reviewBoundaryLabel:
          "Review guided paths, audio readiness, review queues, and book publication honesty together.",
        acceptanceLabel:
          "Library can be demoed without implying completed human review evidence for pending books.",
        icon: "layers",
        tone: "scholar",
      },
      {
        id: "app-store-release",
        title: "App Store and release handoff",
        ownerLabel: "Store submission owner",
        commandLabel: "npm run check:logical-slice -- app-store-release",
        reviewBoundaryLabel:
          "Review screenshots, metadata, reviewer notes, launch blockers, and owner handoff together.",
        acceptanceLabel:
          "Capture assets remain demo-safe and cannot be mistaken for production launch proof.",
        icon: "image",
        tone: "primary",
      },
      {
        id: "backend-database-deployment",
        title: "Backend database and deployment",
        ownerLabel: "Production release operator",
        commandLabel:
          "npm run check:logical-slice -- backend-database-deployment",
        reviewBoundaryLabel:
          "Review server routes, migrations, auth, subscriptions, deployment config, and database proof as a production-critical slice.",
        acceptanceLabel:
          "Local checks can pass, but merge-as-release-proof waits for deployed runtime and production database evidence.",
        icon: "database",
        tone: "danger",
      },
    ],
  };
}

export function buildAppStorePostLaunchWatchPlan(
  launchBlockerHandoff: AppStoreLaunchBlockerHandoff[],
): AppStorePostLaunchWatchPlan {
  const openGateLabel =
    launchBlockerHandoff.length > 0
      ? `${launchBlockerHandoff.length} pre-launch gate${launchBlockerHandoff.length === 1 ? "" : "s"} still open`
      : "Pre-launch gates cleared; start first 48-hour watch";

  return {
    title: "Post-release watch plan",
    statusLabel: openGateLabel,
    summaryLabel:
      "After launch proof clears, keep a named owner on AI smoke, database migrations, store review feedback, crash/vitals, accessibility retakes, and Library review drift.",
    cadenceLabel:
      "Watch every 2 hours on launch day, daily for the first week, then after each store build or content evidence import.",
    noSecretBoundaryLabel:
      "Record only redacted summaries, counts, timestamps, and owner notes; never paste secrets, database URLs, user content, reviewer private details, or raw crash payloads into release docs.",
    holdLaunchBoundaryLabel:
      "Do not start this as a success watch until deployed runtime, production database, AI source-pack activation, and Library human-review gates have real passing evidence.",
    tasks: [
      {
        id: "deployed-ai-smoke",
        title: "Deployed AI smoke",
        ownerLabel: "Release operator",
        signalLabel:
          "Public status stays redacted, diagnostics stay protected, and guarded deployed smoke returns a tiny OpenAI completion.",
        commandLabel: "npm run check:ai-release:deployed",
        escalationLabel:
          "If smoke fails, hold launch copy, resync the smoke secret, restart/redeploy the runtime, and rerun release blockers.",
        icon: "cloud",
        tone: "danger",
      },
      {
        id: "production-db-migrations",
        title: "Database and ownership health",
        ownerLabel: "Database release owner",
        signalLabel:
          "Migration audit rows, production DB release checks, and conversation ownership checks stay green after apply.",
        commandLabel: "npm run check:production-db-release",
        escalationLabel:
          "If ownership or migration checks fail, hold submission, preserve redacted output, and run only reviewed fix-forward steps.",
        icon: "database",
        tone: "danger",
      },
      {
        id: "store-review-feedback",
        title: "Store review feedback",
        ownerLabel: "App Store submission owner",
        signalLabel:
          "Reviewer notes, demo access, privacy labels, screenshots, and subscription copy match the submitted build.",
        commandLabel: "npm run check:app-store-showcase-release",
        escalationLabel:
          "If review flags AI, privacy, subscriptions, or religious claims, update copy and screenshots before resubmission.",
        icon: "message-square",
        tone: "scholar",
      },
      {
        id: "crash-vitals",
        title: "Crash and vitals watch",
        ownerLabel: "Mobile quality owner",
        signalLabel:
          "Crash-free sessions, startup health, Android vitals, and first-run navigation remain within the accepted launch range.",
        commandLabel: "npm run check:release-local",
        escalationLabel:
          "If crashes or vitals spike, pause rollout, capture affected build/device scope, and prepare a rollback or hotfix.",
        icon: "activity",
        tone: "primary",
      },
      {
        id: "accessibility-retakes",
        title: "Accessibility and screenshot retakes",
        ownerLabel: "Accessibility reviewer",
        signalLabel:
          "First viewport text, contrast, touch targets, source labels, and screenshot claims remain readable after final build data loads.",
        commandLabel: "npm run check:app-store-showcase-release",
        escalationLabel:
          "Retake any screenshot that clips source boundaries, hides blocker language, or becomes unreadable on smaller frames.",
        icon: "eye",
        tone: "primary",
      },
      {
        id: "library-review-drift",
        title: "Library review drift",
        ownerLabel: "Editorial/source review owner",
        signalLabel:
          "Imported review evidence still matches current content hashes, high-care scope, and publication decisions after content edits.",
        commandLabel: "npm run validate:library-review-evidence",
        escalationLabel:
          "If content changes after approval, return affected books to review-ready and remove published or reviewed claims until re-signed.",
        icon: "book-open",
        tone: "scholar",
      },
    ],
  };
}

export function getAppStoreShowcaseReadiness(): AppStoreShowcaseReadiness {
  const captureRouteProofs = buildAppStoreCaptureRouteProofs();
  const captureMatrix = buildAppStoreCaptureMatrix();
  const demoDataSafetyRules = buildAppStoreDemoDataSafetyRules();
  const screenshotReadinessContracts =
    buildAppStoreScreenshotReadinessContracts();
  const screenshotSetProofPack = buildAppStoreScreenshotSetProofPack();
  const claimSafetyReceipts = buildAppStoreClaimSafetyReceipts();
  const listingMetadataPack = buildAppStoreListingMetadataPack();
  const platformAssetRequirements = buildAppStorePlatformAssetRequirements();
  const captureSessionPlan = buildAppStoreCaptureSessionPlan();
  const releaseBlockerLabels: AppStoreLaunchBlockerHandoff["id"][] = [
    "deployed-runtime-url",
    "production-database-url",
    "source-pack-activation-readiness",
    "library-human-review-evidence",
  ];
  const launchBlockerHandoff =
    buildAppStoreLaunchBlockerHandoff(releaseBlockerLabels);
  const launchEvidenceSprint =
    buildAppStoreLaunchEvidenceSprint(launchBlockerHandoff);
  const releaseBlockerResolutionPlan =
    buildAppStoreReleaseBlockerResolutionPlan(launchBlockerHandoff);
  const releaseEvidenceIntakePacket =
    buildAppStoreReleaseEvidenceIntakePacket(launchBlockerHandoff);
  const maintainabilityRunway =
    buildAppStoreMaintainabilityRunway(launchBlockerHandoff);
  const postLaunchWatchPlan =
    buildAppStorePostLaunchWatchPlan(launchBlockerHandoff);
  const reviewerNotePacket = buildAppStoreReviewerNotePacket({
    scenes: APP_STORE_SHOWCASE_SCENES,
    listingMetadataPack,
    launchBlockerHandoff,
  });
  const captureQualityGates: AppStoreCaptureQualityGate[] = [
    {
      id: "viewport",
      title: "First viewport proves value",
      detail:
        "The first screenshot area must show the scene headline, primary product surface, and one clear action without scrolling.",
      passLabel: "Hero, action, and proof visible",
      failState:
        "Retake if the screen opens on empty, clipped, or setup-only UI.",
      icon: "eye",
      tone: "primary",
    },
    {
      id: "truth",
      title: "Trust boundary is visible",
      detail:
        "Source, review, location, official-service, or educational boundaries must be visible wherever the scene depends on trust.",
      passLabel: "Trust signal visible",
      failState:
        "Retake if a screenshot could imply a final ruling or completed review evidence.",
      icon: "shield",
      tone: "scholar",
    },
    {
      id: "privacy",
      title: "No private user data",
      detail:
        "Use clean demo content only; hide names, private notes, exact locations, family details, and account identifiers.",
      passLabel: "Demo-safe content only",
      failState:
        "Retake if any private note, location, child name, or account detail appears.",
      icon: "lock",
      tone: "primary",
    },
    {
      id: "blockers",
      title: "Release blockers stay separate",
      detail:
        "Capture-ready screenshots can be prepared now, but production release claims stay blocked until external gates pass.",
      passLabel: "No release-ready claim",
      failState:
        "Retake copy or framing that implies launch, production readiness, or completed human review.",
      icon: "alert-triangle",
      tone: "danger",
    },
  ];

  const sceneCount = APP_STORE_SHOWCASE_SCENES.length;
  const proofLedgerCount = APP_STORE_SHOWCASE_SCENES.filter(
    (scene) =>
      scene.captureProof.storePromise.length >= 24 &&
      scene.captureProof.requiredVisualProof.length >= 32 &&
      scene.captureProof.validationQuestion.length >= 32 &&
      scene.captureProof.safeDemoState.length >= 32 &&
      scene.captureProof.retakeIf.length >= 24,
  ).length;
  const routeProofCount = captureRouteProofs.filter(
    (proof) =>
      proof.routeName.length >= 3 &&
      proof.routeParamsLabel.length >= 16 &&
      proof.screenEvidence.length >= 32 &&
      proof.demoStateBoundary.length >= 24 &&
      proof.navigationGuardrail.length >= 32 &&
      proof.auditQuestion.length >= 42,
  ).length;
  const qaGateCount = captureQualityGates.length;
  const captureDecisionSummary = buildAppStoreCaptureDecisionSummary({
    scenes: APP_STORE_SHOWCASE_SCENES,
    qaGateCount,
    proofLedgerCount,
    routeProofCount,
    blockerLabels: releaseBlockerLabels,
  });
  const submissionReadinessPassport = buildAppStoreSubmissionReadinessPassport({
    scenes: APP_STORE_SHOWCASE_SCENES,
    captureDecisionSummary,
    captureSessionPlan,
    listingMetadataPack,
    demoDataSafetyRules,
    launchEvidenceSprint,
    launchBlockerHandoff,
  });

  return {
    sceneCount,
    flowCount: new Set(APP_STORE_SHOWCASE_SCENES.map((scene) => scene.route))
      .size,
    trustSceneCount: APP_STORE_SHOWCASE_SCENES.filter(
      (scene) =>
        scene.proof.some((proof) =>
          /source|review|safety|official/i.test(proof),
        ) ||
        /source|review|safety|official|trust|clear/i.test(
          `${scene.caption} ${scene.trustSignal}`,
        ),
    ).length,
    storeCaptionCount: APP_STORE_SHOWCASE_SCENES.filter(
      (scene) => scene.appStoreCaption.length >= 24,
    ).length,
    listingMetadataSectionCount: listingMetadataPack.sections.length,
    reviewerNoteSectionCount: reviewerNotePacket.sections.length,
    qaGateCount,
    proofLedgerCount,
    routeProofCount,
    demoDataSafetyRuleCount: demoDataSafetyRules.length,
    screenshotReadinessContractCount: screenshotReadinessContracts.length,
    screenshotSetProofSceneCount: screenshotSetProofPack.scenes.length,
    claimSafetyReceiptCount: claimSafetyReceipts.length,
    releaseNote:
      "Capture-ready does not mean production release-ready; final production gates still need deployed AI smoke and production DB verification.",
    captureSpecs: [
      "Use real app data only",
      "Avoid empty states in the first viewport",
      "Keep source/review labels truthful",
      "Capture iPhone 6.9 and 6.5 inch frames",
    ],
    storyArc: [
      "Daily rhythm",
      "Quran depth",
      "AI trust",
      "Learning growth",
      "Family and travel",
    ],
    truthRules: [
      "Do not imply every source is scholar-reviewed.",
      "Do not hide release blockers behind screenshot language.",
      "Show official-service boundaries for pilgrimage content.",
    ],
    requiredDeviceFrames: ["6.9 inch", "6.5 inch", "5.5 inch"],
    captureRunbook: [
      "Open each scene from the showcase card, then capture only populated states.",
      "Confirm first viewport contains the listed signal before taking the screenshot.",
      "Retake any shot where source, review, location, privacy, or official-service boundaries are hidden.",
    ],
    captureQualityGates,
    claimValidationQuestions: APP_STORE_SHOWCASE_SCENES.map(
      (scene) => scene.captureProof.validationQuestion,
    ),
    claimSafetyQuestions: claimSafetyReceipts.map(
      (receipt) => receipt.approvalQuestion,
    ),
    captureRouteProofs,
    captureRouteAuditQuestions: captureRouteProofs.map(
      (proof) => proof.auditQuestion,
    ),
    captureMatrix,
    demoDataSafetyRules,
    screenshotReadinessContracts,
    screenshotSetProofPack,
    claimSafetyReceipts,
    listingMetadataPack,
    platformRequirementCount: platformAssetRequirements.length,
    platformAssetRequirements,
    storeAssetComplianceQuestions: platformAssetRequirements.map(
      (requirement) =>
        `${requirement.platformLabel}: does the capture set satisfy ${requirement.assetCountLabel.toLowerCase()} ${requirement.firstViewportRuleLabel}`,
    ),
    captureSessionPlan,
    captureDecisionSummary,
    submissionReadinessPassport,
    reviewerNotePacket,
    maintainabilityRunway,
    postLaunchWatchPlan,
    launchEvidenceSprint,
    releaseBlockerResolutionPlan,
    releaseEvidenceIntakePacket,
    launchBlockerHandoff,
    releaseBlockerLabels,
  };
}
