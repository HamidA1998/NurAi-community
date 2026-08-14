import {
  canUseAIMode,
  inferAIModeFromText,
  resolveRequestedAIMode,
} from "../server/ai/modes";
import type { AIModeId, NurAIPlanTier } from "../shared/nuraiAI";

interface RoutingCase {
  name: string;
  message: string;
  expectedMode: AIModeId;
  tier?: NurAIPlanTier;
  expectedResolvedMode?: AIModeId;
}

const cases: RoutingCase[] = [
  {
    name: "Quran explanation",
    message: "Explain this ayah from Surah Baqarah and give me the lesson.",
    expectedMode: "quran_guide",
  },
  {
    name: "Arabic tutor",
    message: "What does this Arabic root word mean and how do I pronounce it?",
    expectedMode: "arabic_tutor",
  },
  {
    name: "Hifz coach",
    message: "Make me a hifz revision plan because I keep forgetting ayahs.",
    expectedMode: "hifz_coach",
  },
  {
    name: "Salah coach",
    message: "Help me protect Fajr and improve khushu in salah.",
    expectedMode: "salah_coach",
  },
  {
    name: "Dua helper",
    message: "Suggest a dua for anxiety and explain the meaning.",
    expectedMode: "dua_helper",
  },
  {
    name: "Discipline coach",
    message: "Keep me on track with a daily deen routine and habit plan.",
    expectedMode: "discipline_coach",
  },
  {
    name: "New Muslim guide",
    message: "I am a new Muslim and my family does not accept it.",
    expectedMode: "new_muslim_guide",
  },
  {
    name: "Scholar mode",
    message: "Give me the fiqh evidence for this ruling across madhabs.",
    expectedMode: "scholar_mode",
    tier: "scholar",
    expectedResolvedMode: "scholar_mode",
  },
  {
    name: "Sensitive halal question stays general mode",
    message: "Is crypto staking halal?",
    expectedMode: "ask_nurai",
  },
  {
    name: "Sensitive menstruation prayer question stays topical",
    message: "Can I pray during my period?",
    expectedMode: "salah_coach",
  },
  {
    name: "Sensitive divorce ruling stays general mode",
    message: "I need a divorce ruling for my situation.",
    expectedMode: "ask_nurai",
  },
  {
    name: "Free user paid mode fallback",
    message: "Make me a hifz revision plan.",
    expectedMode: "hifz_coach",
    tier: "free",
    expectedResolvedMode: "ask_nurai",
  },
];

const failures: string[] = [];

for (const testCase of cases) {
  const inferred = inferAIModeFromText({ message: testCase.message });
  if (inferred.modeId !== testCase.expectedMode) {
    failures.push(
      `${testCase.name}: expected inferred ${testCase.expectedMode}, got ${inferred.modeId}`,
    );
    continue;
  }

  if (testCase.tier && testCase.expectedResolvedMode) {
    const resolved = resolveRequestedAIMode(
      undefined,
      testCase.tier,
      inferred.modeId,
    );
    if (resolved.mode.id !== testCase.expectedResolvedMode) {
      failures.push(
        `${testCase.name}: expected resolved ${testCase.expectedResolvedMode}, got ${resolved.mode.id}`,
      );
    }
  }
}

if (!canUseAIMode("scholar", "scholar_mode")) {
  failures.push("Scholar tier should be allowed to use Scholar Mode.");
}

if (canUseAIMode("premium", "scholar_mode")) {
  failures.push("Premium tier should not be allowed to use Scholar Mode.");
}

if (failures.length > 0) {
  console.error("AI mode routing eval failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `AI mode routing eval passed: ${cases.length} inference and tier cases checked.`,
);
