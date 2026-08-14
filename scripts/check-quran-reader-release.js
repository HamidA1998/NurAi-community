#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath}: missing file`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      findings.push(`${relativePath}: missing ${JSON.stringify(snippet)}`);
    }
  }
}

function requireNotIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (text.includes(snippet)) {
      findings.push(
        `${relativePath}: remove stale/raw ${JSON.stringify(snippet)}`,
      );
    }
  }
}

function main() {
  const findings = [];
  const packageJson = JSON.parse(read("package.json"));
  const quranReaderText = read("client/screens/QuranReaderScreen.tsx");
  const quranTextCacheText = read("client/lib/quran-offline-text-cache.ts");
  const quranLearningServiceText = read(
    "client/services/quranLearningService.ts",
  );
  const nuraiContextRoutesText = read(
    "server/replit_integrations/nurai-context/routes.ts",
  );
  const floatingButtonText = read("client/components/AIFloatingButton.tsx");
  const premiumGateText = read("client/components/PremiumGate.tsx");
  const premiumMediaControlsText = read(
    "client/components/media/PremiumMediaControls.tsx",
  );

  requireIncludes(
    quranReaderText,
    "client/screens/QuranReaderScreen.tsx",
    [
      "const showAudioBar = audioActive;",
      "const isWordAudioPlayback = audioActive && currentPlayingVerse === null;",
      "Math.min(72, Math.max(64, measuredHeight))",
      "paddingBottom: readerBottomPadding",
      "onLayout={handleAudioDockLayout}",
      'testID="quran-premium-mini-player"',
      'testID="button-prev-verse"',
      'testID="button-play-pause"',
      'testID="button-next-verse"',
      'testID="button-stop-audio"',
      'accessibilityHint="Opens Quran audio options"',
      'setSettingsTab("audio")',
      "minHeight: 64",
      "maxHeight: 72",
      "audioCompactDismiss",
      "resumeTargetVerseRef",
      "readerPositionReady",
      "readerInitialVerse",
      "style={{ opacity: readerPositionReady ? 1 : 0 }}",
      "scrollToVerse(initialVerse, false)",
      "scrollToVerse(savedVerse, false)",
      "SHOW_EXTENDED_QURAN_STUDY_BLOCKS = false",
      "windowHeight - insets.top - Spacing.md",
      'importantForAccessibility="no-hide-descendants"',
      "accessibilityViewIsModal",
      "accessibilityElementsHidden={ayahStudySheetVisible}",
      "quran-reader-session-rail",
      "quran-inline-ayah-lens",
      "quran-inline-ayah-lens-map",
      "quran-inline-ayah-live-state",
      "quran-inline-ayah-audience-chip",
      "quran-inline-ayah-source-state",
      "quran-inline-ayah-memory-state",
      "quran-inline-ayah-best-next-step",
      "button-quran-inline-close",
      "button-quran-inline-action-${action.id}",
      "quran-ayah-premium-study-cue",
      "button-quran-ayah-study-cue-${action.id}",
      "Quran anchored",
      "activeAyahLensVerse}",
      "quran-ayah-study-${mode.id}",
      'type QuranStudyAudienceId = "simple" | "new_reader" | "deeper"',
      "Do not open with a generic",
      "QURAN_STUDY_AUDIENCES",
      "Do not present sensitive fiqh, medical, marital, financial, or personal ruling content as a final fatwa or personal ruling",
      "help the reader prepare a clear question for a qualified scholar rather than giving a final fatwa or personal ruling",
      "This is not a final fatwa or personal ruling.",
      "Quiz Me",
      "renderWordIntelligenceSheet()",
      "openWordSheet",
      "buildQuranAyahJourney",
      "Ayah Journey",
      "Beginner guide",
      "beginnerTerms",
      "styles.beginnerGuideCard",
      "styles.ayahJourneyCompass",
      "styles.ayahStudySheetScrollContent",
      "getQuranAyahPracticeStatus",
      "styles.memorisationDeskCard",
      "styles.recitationMemoryPanel",
      "styles.recitationCoachScrollContent",
      "buildQuranProgressIdentity",
      "quranIdentity.nextAction",
      "quranIdentity.familyPrompt",
      "quranIdentityId",
      "getQuranWordMastery",
      "wordMastery",
      "buildQuranWordLearningPlan",
      "quran-word-learning-compass",
      "quran-word-practice-step-${step.id}",
      "wordLearningPlan.nextReviewLabel",
      "wordLearningPlan.masteryPercent",
      "Appears in Quran",
      "learnQuranWord",
      "normalizeArabicSearchTerm",
      "quranWordAudioUrl",
      "handlePlayWordAudio",
      "wordLocation",
      "saveAyahMemoryCard",
      "saveQuranReflectionNote",
      "getQuranReflectionNote",
      "quran-reflection-note-card",
      "input-quran-reflection-note",
      "button-save-quran-reflection-note",
      "Private reflection note",
      "saveQuranRecitationPractice",
      "createFamilyQuranChallenge",
      "memorisationMode",
      "renderRecitationCoachSheet()",
      "QURAN_JOURNEY_STEPS",
      "Quran identity",
      "Today's ayah path",
      "buildQuranDailySessionHandoff",
      "quran-daily-session-handoff-card",
      "TODAY'S QURAN HANDOFF",
      "quranDailySessionHandoff.proofLabel",
      "quranDailySessionHandoff.boundaryLabel",
      "button-quran-daily-session-handoff-${quranDailySessionHandoff.nextActionId}",
      "buildQuranReadingSessionContract",
      "QuranReadingSessionContract",
      "quran-reading-session-contract-card",
      "TODAY'S READING PATH",
      "quranReadingSessionContract.sourceLabel",
      "quranReadingSessionContract.trustBoundary",
      "quranReadingSessionContract.items.map",
      "quran-reading-contract-${item.id}",
      "button-quran-reading-contract-${quranReadingSessionContract.nextActionId}",
      "Continue",
      "buildQuranScholarReviewEscalationContract",
      "QuranScholarReviewEscalationContract",
      "quran-scholar-review-escalation-card",
      "WHEN TO ASK A SCHOLAR",
      "quranScholarReviewEscalation.statusLabel",
      "quranScholarReviewEscalation.boundaryLabel",
      "quranScholarReviewEscalation.items.map",
      "quran-scholar-review-escalation-${item.id}",
      "button-quran-create-scholar-review-packet",
      "handleCreateQuranScholarPacket",
      "Share.share",
      "styles.quranJourneyFocusCard",
      "buildQuranStreakRecoveryKhatmahPlan",
      "quran-streak-recovery-khatmah-card",
      "Streak recovery + Khatmah plan",
      "quranRecoveryPlan.khatmahPaceLabel",
      "quranRecoveryPlan.planningWindowLabel",
      "quranRecoveryPlan.accountabilityLabel",
      "quran-khatmah-proof-receipts",
      "QURAN PLAN PROGRESS",
      "quranRecoveryPlan.proofReceipts.map",
      "quran-proof-receipt-${receipt.id}",
      "receipt.saveLabel",
      "receipt.boundaryLabel",
      "quranProofReceiptPanel",
      "quranRecoveryPlan.milestones.map",
      "quran-recovery-milestone-${milestone.id}",
      "button-quran-recovery-step-${step.id}",
      "styles.verseBoundary",
      ': insets.bottom + Spacing["2xl"]',
      "customerSafeAIErrorMessage",
      "customerQuranAudioErrorMessage",
      "onError: (msg) => {",
      "setAudioError(customerQuranAudioErrorMessage(msg));",
      "setAudioActive(false);",
      "setCurrentPlayingVerse(null);",
      "setAudioProgress({ currentTime: 0, duration: 0, isBuffering: false });",
      "NurAILogoMark",
      "PremiumBadge",
      "selectedAyahCitation",
      "audioNowPlaying",
      "getLocalQuranAudioPath",
      "downloadQuranSurahAudio",
      "quran-repeat-range-presets",
      "quran-repeat-range-loop-builder",
      "repeatRangeTrackFill",
      "repeatRangeCurrentInside",
      "repeatRangeLength",
      "button-repeat-range-preset-${preset.length}",
      "setRepeatRangePreset",
      "getQuranTextCache",
      "saveQuranTextCache",
      "quranTextCacheStatus",
      "quran-offline-reading-cache-card",
      "formatQuranTextCacheAge",
      "Live Quran data could not refresh. Showing your saved offline copy for this surah.",
      'type QuranReadingComfortPreset = "balanced" | "ayah-focus" | "night-reading"',
      "quran_reading_comfort_preset",
      "applyReadingComfortPreset",
      "settings-tab-reading",
      'testID="quran-reading-comfort-presets"',
      "quran-reading-comfort-${preset.id}",
      'testID="quran-reading-comfort-boundary"',
      "Reading comfort only",
      "These presets change display layers only.",
      "source-aware study or Scholar Review",
      "readingComfortSelectedPill",
    ],
    findings,
  );

  requireIncludes(
    premiumMediaControlsText,
    "client/components/media/PremiumMediaControls.tsx",
    [
      'import { NuraiGlass } from "@/design-system/NuraiGlass";',
      "<NuraiGlass",
      'pointerEvents="none"',
      "style={StyleSheet.absoluteFill}",
      'accessibilityRole="progressbar"',
    ],
    findings,
  );

  requireIncludes(
    quranTextCacheText,
    "client/lib/quran-offline-text-cache.ts",
    [
      "nurai_quran_text_cache_v1",
      "QuranTextCachePayload",
      "saveQuranTextCache",
      "getQuranTextCache",
      "getQuranTextCacheIndex",
      "clearQuranTextCache",
      'schema: "nurai-quran-text-cache-v1"',
    ],
    findings,
  );

  requireIncludes(
    quranLearningServiceText,
    "client/services/quranLearningService.ts",
    [
      "export interface QuranWordLearningPlan",
      "export interface QuranReflectionNote",
      "quran_reflection_notes_v1",
      "saveQuranReflectionNote",
      "getQuranReflectionNote",
      "reflectionNotes",
      "buildQuranWordLearningPlan",
      "export interface QuranStreakRecoveryKhatmahPlan",
      "export interface QuranPlanProofReceipt",
      "export interface QuranDailySessionHandoff",
      "export function buildQuranDailySessionHandoff",
      "QuranDailySessionActionId",
      "export interface QuranReadingSessionContract",
      "export interface QuranReadingSessionContractItem",
      "export function buildQuranReadingSessionContract",
      "QuranReadingSessionActionId",
      "Today's Quran reading path",
      "Quran reading, listening, memorisation practice, and private reflection can continue here",
      "Ask a qualified scholar about sensitive tafsir, fiqh, tajwid assessment, or personal circumstances",
      "not tafsir, a fatwa, or a claim about reward",
      "export interface QuranScholarReviewEscalationContract",
      "export interface QuranScholarReviewEscalationItem",
      "buildQuranScholarReviewEscalationContract",
      "Quran reference and context ready",
      "Quran reference ready; deeper context should be checked",
      "Prepare a clear question for a qualified scholar when rulings, deeper tafsir, or personal circumstances are involved",
      "not for issuing a ruling",
      "tajwid certification",
      "proofReceipts: QuranPlanProofReceipt[]",
      "Reading progress",
      "Recitation practice",
      "Reflection notes",
      "Plan limits",
      "This records reading only; it does not mark memorisation or spiritual rank.",
      "Audio and recitation marks support practice; a qualified teacher should assess tajwid.",
      "Private reflections support learning; they are not tafsir, a fatwa, or a claim about reward.",
      "buildQuranStreakRecoveryKhatmahPlan",
      "Streak recovery",
      "Ramadan/Khatmah pace",
      "Ramadan/Khatmah planning window",
      "not a religious ruling or promise of reward",
      "accountabilityLabel",
      "milestones",
      'id: "ramadan"',
      'id: "review"',
      "nextReviewLabel",
      "masteryPercent",
      "Learning rhythm active",
      "practiceSteps",
      'id: "listen"',
      'id: "meaning"',
      'id: "find"',
      'id: "review"',
      "Review in ${days} days",
    ],
    findings,
  );

  requireIncludes(
    nuraiContextRoutesText,
    "server/replit_integrations/nurai-context/routes.ts",
    [
      "normaliseQuranLearningResponse",
      "Return the answer with these exact section labels",
      "Meaning:",
      "Context:",
      "Key Words:",
      "Lesson:",
      "Avoid:",
      "Action:",
      "Sources:",
      "removeGenericSourceReviewParagraphs",
      "hasGenericQuranSourceReviewContent",
      "contextualWordLimit",
      'feature === "quran"',
      "buildWordLimitInstruction(userTier, normalizedFeature)",
      "enforceWordLimit(response, userTier, normalizedFeature)",
    ],
    findings,
  );

  requireNotIncludes(
    quranReaderText,
    "client/screens/QuranReaderScreen.tsx",
    [
      '"PRO"',
      ">PRO<",
      "Quran Pro",
      "proBadge",
      'label={isPremium ? "Ask NurAI" : "Premium Quran Guide"}',
      "pulseRing",
      "withRepeat",
      "onError: (msg) => setAudioError(msg)",
      "paddingBottom: (showAudioBar ? 300 : 176)",
      'testID="quran-audio-session-panel"',
      'testID="quran-audio-learning-rail"',
      'testID="quran-audio-queue-rail"',
      "saveScholarReviewPacket",
      "QURAN READING CONTRACT",
      "SCHOLAR REVIEW ESCALATION",
      "QURAN PLAN PROOF RECEIPTS",
      "styles.floatingPlayContainer",
      'testID="button-start-playback"',
      "Play from ayah",
    ],
    findings,
  );

  requireIncludes(
    floatingButtonText,
    "client/components/AIFloatingButton.tsx",
    ["export default function AIFloatingButton", "return null;"],
    findings,
  );

  requireNotIncludes(
    floatingButtonText,
    "client/components/AIFloatingButton.tsx",
    [
      '"PRO"',
      ">PRO<",
      "Quran Pro",
      "proBadge",
      "pulseRing",
      "withRepeat",
      'testID="button-ai-ask"',
    ],
    findings,
  );

  requireIncludes(
    premiumGateText,
    "client/components/PremiumGate.tsx",
    [
      'const label = tier === "scholar" ? "Scholar" : "Premium"',
      "See ${tierLabel} plans",
      "Unlock deeper guidance",
    ],
    findings,
  );

  const scripts = packageJson.scripts || {};
  if (
    scripts["check:quran-reader-release"] !==
    "node scripts/check-quran-reader-release.js"
  ) {
    findings.push(
      "package.json: check:quran-reader-release must run scripts/check-quran-reader-release.js.",
    );
  }
  if (
    !String(scripts["check:release-local"] || "").includes(
      "check:quran-reader-release",
    )
  ) {
    findings.push(
      "package.json: check:release-local must include check:quran-reader-release.",
    );
  }

  if (findings.length) {
    console.error("Quran reader release check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Quran reader release check passed: Quran study, audio controls, comfort presets, and disabled floating AI launcher verified.",
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
