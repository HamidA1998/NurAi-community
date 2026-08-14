import type {
  MuslimGrowthProfile,
  NurAIPlanTier,
  SafeAIMemorySummary,
} from "../shared/nuraiAI";
import { NURAI_AI_MODE_IDS } from "../shared/nuraiAI";
import { AI_MODE_DEFINITIONS } from "../server/ai/modes";
import type {
  buildPersonalAIOrchestratorPlan,
  PersonalAIOrchestratorPlan,
} from "../server/ai/personalOrchestrator";
import type { BuiltNurAIContext } from "../server/ai/contextBuilder";

type PlanBuilder = typeof buildPersonalAIOrchestratorPlan;

function profile(tier: NurAIPlanTier): MuslimGrowthProfile {
  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    identity: {
      userId: "eval-user",
      selectedGoals: ["understand_quran"],
      primaryGoal: "understand_quran",
      currentFocus: "Protect Fajr and continue Quran",
      preferredJourney: "Quran first",
      joinedAt: new Date(0).toISOString(),
      lastActiveAt: new Date(0).toISOString(),
    },
    goals: ["understand_quran"],
    learningProfile: {
      arabicLevel: "beginner",
      quranLevel: "intermediate",
      quranReadingLevel: "intermediate",
      quranUnderstandingLevel: "beginner",
      weakAreas: ["Arabic grammar"],
      strongAreas: ["Quran reading"],
      completedLessons: ["Fatiha review"],
      missedLessons: [],
      reviewDueItems: ["Fatiha review"],
    },
    worshipProfile: {
      prayerConsistency: 72,
      currentWorshipGoal: "Protect Fajr",
      missedHabitPatterns: [],
    },
    appBehavior: {
      mostUsedFeatures: ["Quran", "PrayerTimes"],
      leastUsedFeatures: ["ArabicLearning"],
      lastOpenedScreen: "Home",
    },
    aiPreference: {
      prefersShortAnswers: true,
      prefersPracticalSteps: true,
      prefersSources: true,
      tonePreference: "gentle",
    },
    subscriptionContext: {
      plan: tier,
      aiDailyLimit: tier === "free" ? 5 : null,
      contextualDailyLimit: tier === "free" ? 3 : null,
      enabledAIModes:
        tier === "scholar"
          ? [...NURAI_AI_MODE_IDS]
          : ["ask_nurai", "quran_guide", "arabic_tutor"],
      premiumUnlocked: tier !== "free",
      scholarUnlocked: tier === "scholar",
      premiumFeaturesUnlocked: tier !== "free",
      scholarFeaturesUnlocked: tier === "scholar",
    },
    retentionProfile: {
      streaks: ["3-day streak"],
      weeklyProgress: ["Quran read twice"],
      milestonesNear: ["Arabic review due"],
      abandonedJourneys: [],
      recommendedNextAction: "Open Quran",
    },
    privacyBoundaries: [
      "Use only visible app activity and explicit safe app context.",
      "Do not infer hidden worship, intentions, private messages, or off-app behavior.",
    ],
  };
}

function memory(): SafeAIMemorySummary {
  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    session: [],
    recentActivity: ["Last opened: Home"],
    learning: ["Arabic level: beginner"],
    worship: ["Current worship goal: Protect Fajr"],
    goals: ["understand quran"],
    preferences: [
      "Prefers short practical answers",
      "Responds better to gentle reminders",
    ],
    currentFocus: ["Quran and prayer"],
    weakAreas: ["Arabic grammar"],
    strongAreas: ["Quran reading"],
    featurePatterns: ["Uses Quran often"],
    recommendations: ["Next action: Open Quran"],
    safety: ["No raw chat transcript memory."],
    cautions: ["Do not over-personalize from missing app activity."],
    layers: [],
  };
}

function contextFor(
  modeId: keyof typeof AI_MODE_DEFINITIONS,
  tier: NurAIPlanTier,
): BuiltNurAIContext {
  const mode = AI_MODE_DEFINITIONS[modeId];
  const safeMemory = memory();
  const growthProfile = profile(tier);
  return {
    mode,
    modeAllowed: true,
    modeFallbackUsed: false,
    growthProfile,
    memorySummary: safeMemory,
    prompt: "BASE PERSONAL AI CONTEXT PROMPT",
    maxOutputTokens: mode.maxOutputTokens[tier],
    metadata: {
      serverBuiltPersonalization: true,
      aiModeId: mode.id,
      modeAllowed: true,
      modeFallbackUsed: false,
      enabledAIModes: growthProfile.subscriptionContext.enabledAIModes,
      personalizationVersion: 1,
      safeMemorySummary: safeMemory,
    },
  };
}

function expect(condition: unknown, label: string, failures: string[]): void {
  if (!condition) failures.push(label);
}

function quranPlan(buildPlan: PlanBuilder): PersonalAIOrchestratorPlan {
  return buildPlan({
    context: contextFor("quran_guide", "premium"),
    surface: "quran",
    useCase: "contextual",
    feature: "quran",
    question: "Explain this ayah and give me one action.",
  });
}

async function main() {
  process.env.DATABASE_URL ||=
    "postgres://nurai:nurai@127.0.0.1:5432/nurai_eval";
  const { buildPersonalAIOrchestratorPlan: buildPlan } = await import(
    "../server/ai/personalOrchestrator"
  );
  const failures: string[] = [];

  const quran = quranPlan(buildPlan);
  expect(
    quran.surface === "quran",
    "Quran surface should be preserved.",
    failures,
  );
  expect(
    quran.intent === "explain",
    "Quran explanation should infer explain intent.",
    failures,
  );
  expect(
    quran.actionPlan.primary.route === "QuranReader",
    "Recommended app action should be routable to QuranReader.",
    failures,
  );
  expect(
    quran.prompt.includes("Do not infer hidden worship"),
    "Prompt should include hidden-worship privacy boundary.",
    failures,
  );
  expect(
    quran.prompt.includes("Do not invent source references"),
    "Prompt should include source anti-fabrication boundary.",
    failures,
  );

  const coaching = buildPlan({
    context: contextFor("discipline_coach", "premium"),
    surface: "chat",
    useCase: "chat",
    question: "Help me choose one clear next step today.",
  });
  expect(
    coaching.requestSettings.risk === "low",
    "App-context coaching should not be blocked as a source-critical religious ruling.",
    failures,
  );

  const sensitive = buildPlan({
    context: contextFor("ask_nurai", "free"),
    surface: "chat",
    useCase: "chat",
    question: "I need a divorce ruling for my situation.",
  });
  expect(
    sensitive.requestSettings.risk === "sensitive",
    "Sensitive personal ruling should raise sensitive risk.",
    failures,
  );
  expect(
    sensitive.intent === "handoff",
    "Sensitive personal ruling should become a handoff intent.",
    failures,
  );
  expect(
    sensitive.actionPlan.primary.kind === "scholar_handoff",
    "Sensitive handoff should make human help the primary action.",
    failures,
  );

  const newMuslim = buildPlan({
    context: contextFor("new_muslim_guide", "premium"),
    surface: "chat",
    question: "I am new to Islam and confused about prayer.",
  });
  expect(
    newMuslim.persona.voice === "gentle",
    "New Muslim guide should use gentle voice.",
    failures,
  );
  expect(
    newMuslim.persona.styleRules.some((rule) =>
      rule.includes("Define Islamic terms"),
    ),
    "New Muslim guide should define Islamic terms.",
    failures,
  );

  const scholar = buildPlan({
    context: contextFor("scholar_mode", "scholar"),
    surface: "chat",
    question: "Compare the evidence across madhabs.",
  });
  expect(
    scholar.persona.voice === "scholar",
    "Scholar mode should use scholar voice.",
    failures,
  );
  expect(
    scholar.actionPlan.secondary.some(
      (action) => action.kind === "scholar_handoff",
    ),
    "Scholar mode should keep scholar handoff available.",
    failures,
  );

  if (failures.length > 0) {
    console.error("Personal AI orchestrator eval failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    "Personal AI orchestrator eval passed: persona, actions, sensitivity, and trust boundaries verified.",
  );
}

main().catch((error) => {
  console.error("Personal AI orchestrator eval failed to run:", error);
  process.exit(1);
});
