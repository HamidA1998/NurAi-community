export type EngagementEthicsSurfaceId =
  | "reminders"
  | "streak_recovery"
  | "subscriptions"
  | "kids_mode"
  | "family_accountability"
  | "ai_nudges"
  | "privacy_controls";

export type EngagementEthicsControl = {
  id: EngagementEthicsSurfaceId;
  title: string;
  userPromise: string;
  requiredControls: string[];
  forbiddenPatterns: string[];
  evidenceFiles: string[];
  releaseCheck: string;
};

export type EngagementEthicsSummary = {
  controlCount: number;
  blockerCount: number;
  warningCount: number;
  readyForReleaseQa: boolean;
  nextAction: string;
};

export const ENGAGEMENT_ETHICS_SOURCES = [
  {
    title: "FTC Dark Patterns Report",
    url: "https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf?date=2025-01-20",
    principle:
      "Subscription, privacy, and family-facing flows must not hide terms, costs, cancellation, or data choices.",
  },
  {
    title: "Humane Product Design",
    url: "https://www.humanetech.com/humane-product-design",
    principle:
      "Attention, intention, and well-being are product constraints, not afterthoughts.",
  },
  {
    title: "Google Play Families Policies",
    url: "https://support.google.com/googleplay/android-developer/answer/9893335?hl=en",
    principle:
      "Child-facing surfaces need parent control, age-aware content, and no ad-like pressure.",
  },
  {
    title: "App Store Review Guidelines",
    url: "https://developer.apple.com/app-store/review/guidelines/",
    principle:
      "Purchase flows need clear value, renewal terms, and a real route to manage subscriptions.",
  },
] as const;

export const ENGAGEMENT_ETHICS_CONTROLS: EngagementEthicsControl[] = [
  {
    id: "reminders",
    title: "Reminder consent and quiet control",
    userPromise:
      "Reminders should support worship and learning without becoming noisy, hidden, or hard to pause.",
    requiredControls: [
      "Global notification sound and vibration controls",
      "Quiet hours",
      "Per-prayer advance reminder switches",
      "Smart reminder preview before relying on AI-generated nudges",
    ],
    forbiddenPatterns: [
      "Mandatory recurring reminders",
      "Hidden frequency changes",
      "Fear-based copy for missed worship",
    ],
    evidenceFiles: [
      "client/screens/NotificationSettingsScreen.tsx",
      "client/lib/notifications.ts",
      "client/services/dailyDeenJourneyService.ts",
    ],
    releaseCheck: "npm run check:engagement-ethics-release",
  },
  {
    id: "streak_recovery",
    title: "Gentle streak and habit recovery",
    userPromise:
      "Streaks should help users return gently, not make worship feel like a punishment or performance metric.",
    requiredControls: [
      "No-guilt recovery copy",
      "Small next action after a missed day",
      "Clear separation between habit planning and religious reward claims",
    ],
    forbiddenPatterns: [
      "Shame loops",
      "Unsupported reward guarantees",
      "Loss-aversion pressure around worship",
    ],
    evidenceFiles: [
      "client/services/quranLearningService.ts",
      "client/services/dailyDeenJourneyService.ts",
      "client/screens/StreakGardenScreen.tsx",
    ],
    releaseCheck: "npm run check:engagement-ethics-release",
  },
  {
    id: "subscriptions",
    title: "Transparent subscription value",
    userPromise:
      "Paid plans must show real benefits, current store prices when available, restore, renewal, and cancellation routes.",
    requiredControls: [
      "Store-loaded pricing or unavailable state",
      "Restore purchases",
      "Manage subscription route",
      "Auto-renewal and cancellation copy",
      "Privacy and terms links",
    ],
    forbiddenPatterns: [
      "Fake scarcity",
      "Hardcoded unsupported discounts",
      "Hidden renewal terms",
      "Hard-to-cancel wording",
    ],
    evidenceFiles: [
      "client/screens/SubscriptionScreen.tsx",
      "client/context/SubscriptionContext.tsx",
      "scripts/check-subscription-release-controls.js",
    ],
    releaseCheck: "npm run check:engagement-ethics-release",
  },
  {
    id: "kids_mode",
    title: "Parent-controlled kids learning",
    userPromise:
      "Kids Mode should stay ad-free, parent-controlled, age-aware, and separate from open-ended AI chat.",
    requiredControls: [
      "Parental notice",
      "Parent PIN for settings",
      "Age group selection",
      "Reset/export controls",
      "No third-party advertising tracking claim aligned to implementation",
    ],
    forbiddenPatterns: [
      "Child-directed purchase pressure",
      "Open-ended child AI chat",
      "External feeds without parent review",
    ],
    evidenceFiles: [
      "client/screens/KidsModeScreen.tsx",
      "client/screens/KidsParentScreen.tsx",
      "client/context/KidsModeContext.tsx",
    ],
    releaseCheck: "npm run check:engagement-ethics-release",
  },
  {
    id: "family_accountability",
    title: "Gentle family accountability",
    userPromise:
      "Family features should encourage, invite, and review without public shaming or coercive competition.",
    requiredControls: [
      "Private family group framing",
      "Gentle reminder or encouragement copy",
      "Cancel routes for settings and goals",
      "No public leaderboard authority claims",
    ],
    forbiddenPatterns: [
      "Public shame ranking",
      "Forced participation",
      "Religious authority through family score",
    ],
    evidenceFiles: [
      "client/screens/FamilyGroupScreen.tsx",
      "server/family.ts",
      "scripts/check-family-messaging-release.js",
    ],
    releaseCheck: "npm run check:engagement-ethics-release",
  },
  {
    id: "ai_nudges",
    title: "Source-aware AI nudges",
    userPromise:
      "AI should appear as contextual help with clear limits, not as an endless feed or casual ruling engine.",
    requiredControls: [
      "Retry and follow-up controls",
      "Scholar packet path for sensitive topics",
      "Source coverage and uncertainty labels",
      "Daily allowance copy without panic",
    ],
    forbiddenPatterns: [
      "Infinite-scroll AI feed",
      "Final fatwa presentation",
      "Manipulative urgency around AI limits",
    ],
    evidenceFiles: [
      "client/components/AIResponseModal.tsx",
      "client/components/NurAINudgeV3.tsx",
      "client/services/scholarReviewPacketService.ts",
    ],
    releaseCheck: "npm run check:engagement-ethics-release",
  },
  {
    id: "privacy_controls",
    title: "Visible data and privacy controls",
    userPromise:
      "Users should find privacy, export, delete, pause, and reset controls in normal settings without needing a separate AI trust screen.",
    requiredControls: [
      "Settings-based privacy controls",
      "No separate saved-answer AI destination",
      "Private backup controls",
      "Delete/reset flows for sensitive local data",
    ],
    forbiddenPatterns: [
      "Absolute privacy claims without proof",
      "Hidden sync behavior",
      "Data export claims beyond implementation",
    ],
    evidenceFiles: [
      "client/screens/SettingsScreen.tsx",
      "client/services/privacyTrustEvidenceService.ts",
      "scripts/check-privacy-trust-release.ts",
    ],
    releaseCheck: "npm run check:engagement-ethics-release",
  },
];

export function buildEngagementEthicsSummary(
  controls: EngagementEthicsControl[] = ENGAGEMENT_ETHICS_CONTROLS,
): EngagementEthicsSummary {
  const missingEvidenceCount = controls.filter(
    (control) => control.evidenceFiles.length < 2,
  ).length;
  const missingControlCount = controls.filter(
    (control) => control.requiredControls.length < 2,
  ).length;
  const blockerCount = missingEvidenceCount + missingControlCount;

  return {
    controlCount: controls.length,
    blockerCount,
    warningCount: 0,
    readyForReleaseQa: blockerCount === 0,
    nextAction:
      blockerCount === 0
        ? "Keep this matrix wired into release QA as reminders, paywalls, kids, family, and AI nudges evolve."
        : "Add missing evidence files and required controls before this matrix can be trusted.",
  };
}
