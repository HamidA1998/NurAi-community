import {
  buildSourceGrounding,
  citationsAppearingInAnswer,
  sourceCoverageForAnswer,
} from "../server/ai/sourceGrounding";
import { selectAIModel } from "../server/ai/modelSelector";
import { buildStructuredAIResponseExtras } from "../server/replit_integrations/nurai-context/structuredResponse";
import type { AITextRequest } from "../server/ai/types";

type AISourceGrounding = ReturnType<typeof buildSourceGrounding>;

interface SourceGroundingEvalCase {
  id: string;
  prompt: string;
  request?: Partial<AITextRequest>;
  messages?: AITextRequest["messages"];
  requiredReferences?: string[];
  requiredCitationUrls?: Record<string, string>;
  forbiddenReferences?: string[];
  expectedSourceCoverage?: ReturnType<
    typeof buildSourceGrounding
  >["sourceCoverage"];
  expectedNeedsScholar?: boolean;
}

const cases: SourceGroundingEvalCase[] = [
  {
    id: "quran-valid-reference",
    prompt: "Explain Quran 2:255 and Quran 13:28 for dhikr and anxiety.",
    request: { useCase: "tafsir", risk: "religious" },
    requiredReferences: ["Quran 2:255", "Quran 13:28"],
    requiredCitationUrls: {
      "Quran 2:255": "https://quran.com/2/255",
      "Quran 13:28": "https://quran.com/13/28",
    },
    expectedSourceCoverage: "verified_context",
  },
  {
    id: "quran-keyword-anchor-not-verified-context",
    prompt: "Explain Quran 2:255 and connect it to dhikr for anxiety.",
    request: { useCase: "tafsir", risk: "religious" },
    requiredReferences: ["Quran 2:255", "Quran 13:28"],
    expectedSourceCoverage: "reference_detected",
  },
  {
    id: "untrusted-client-metadata-not-source-card",
    prompt: "Explain this ayah.",
    request: {
      useCase: "contextual",
      risk: "religious",
      metadata: {
        context: {
          surahNumber: 2,
          ayahNumber: 255,
        },
      },
    },
    forbiddenReferences: ["Quran 2:255"],
    expectedSourceCoverage: "needs_source_review",
  },
  {
    id: "trusted-server-metadata-source-card",
    prompt: "Explain this tafsir request.",
    request: {
      useCase: "tafsir",
      risk: "religious",
      metadata: {
        trustedSourceContext: true,
        surahNumber: 2,
        ayahNumber: 255,
      },
    },
    requiredReferences: ["Quran 2:255"],
    requiredCitationUrls: {
      "Quran 2:255": "https://quran.com/2/255",
    },
    expectedSourceCoverage: "reference_detected",
  },
  {
    id: "quran-invalid-reference",
    prompt: "Explain Quran 999:1.",
    request: { useCase: "tafsir", risk: "religious" },
    forbiddenReferences: ["Quran 999:1"],
    expectedSourceCoverage: "needs_source_review",
  },
  {
    id: "hadith-verified-reference",
    prompt: "Is Sahih al-Bukhari 1 in the verified source index?",
    request: { useCase: "chat", risk: "religious" },
    requiredReferences: ["Sahih al-Bukhari 1"],
    requiredCitationUrls: {
      "Sahih al-Bukhari 1": "https://sunnah.com/bukhari:1",
    },
    expectedSourceCoverage: "reference_detected",
  },
  {
    id: "hadith-abi-dawud-alias",
    prompt: "Can you find Sunan Abi Dawud 3658 in the verified source index?",
    request: { useCase: "chat", risk: "religious" },
    requiredReferences: ["Sunan Abi Dawud 3658"],
    requiredCitationUrls: {
      "Sunan Abi Dawud 3658": "https://sunnah.com/abudawud:3658",
    },
  },
  {
    id: "hadith-unverified-reference",
    prompt: "Is Sahih al-Bukhari 999999 authentic?",
    request: { useCase: "chat", risk: "religious" },
    forbiddenReferences: ["Sahih al-Bukhari 999999"],
    expectedSourceCoverage: "needs_source_review",
  },
  {
    id: "official-service-umrah-booking-health",
    prompt:
      "Where should I check official Umrah visa, Rawdah booking, and health guidance?",
    request: { useCase: "chat", risk: "low" },
    requiredReferences: [
      "Nusuk Umrah Platform",
      "Nusuk Umrah Health Guidelines",
    ],
    requiredCitationUrls: {
      "Nusuk Umrah Platform": "https://umrah.nusuk.sa/",
      "Nusuk Umrah Health Guidelines":
        "https://umrah.nusuk.sa/nusuk/health/guidelines",
    },
    expectedSourceCoverage: "verified_context",
  },
  {
    id: "official-service-nusuk-card-wallet",
    prompt:
      "What should I keep in NurAI versus the official Nusuk Card if I get lost or separated during Hajj?",
    request: { useCase: "chat", risk: "low" },
    requiredReferences: ["Nusuk Card Official Initiative"],
    requiredCitationUrls: {
      "Nusuk Card Official Initiative":
        "https://haj.gov.sa/en/About-the-ministry/Ministry-initiatives/Nusuk-Card?NuskCardType=Nusuk+Card+for+Pilgrims",
    },
    expectedSourceCoverage: "verified_context",
  },
  {
    id: "official-service-hajj-registration-2026",
    prompt:
      "For Hajj 2026, where should domestic pilgrims register and choose packages?",
    request: { useCase: "chat", risk: "low" },
    requiredReferences: ["Hajj 1447 AH Registration Through Nusuk"],
    requiredCitationUrls: {
      "Hajj 1447 AH Registration Through Nusuk":
        "https://pep.gov.sa/en/news/874",
    },
    expectedSourceCoverage: "reference_detected",
  },
  {
    id: "official-service-not-general-health",
    prompt: "I feel sick and need medical advice.",
    request: { useCase: "chat", risk: "sensitive" },
    forbiddenReferences: [
      "Nusuk Umrah Health Guidelines",
      "CDC Yellow Book Hajj and Umrah",
    ],
    expectedSourceCoverage: "needs_source_review",
    expectedNeedsScholar: true,
  },
  {
    id: "official-service-not-ritual-proof",
    prompt: "How do I perform tawaf in Umrah?",
    request: { useCase: "chat", risk: "religious" },
    forbiddenReferences: ["Nusuk Umrah Platform", "Ministry of Hajj and Umrah"],
    expectedSourceCoverage: "needs_source_review",
  },
  {
    id: "womens-fiqh-sensitive",
    prompt: "Does brown discharge after my period break salah?",
    request: { useCase: "chat", risk: "sensitive" },
    requiredReferences: ["Quran 2:222", "Sunan an-Nasa'i 2318"],
    requiredCitationUrls: {
      "Quran 2:222": "https://quran.com/2/222",
      "Sunan an-Nasa'i 2318": "https://sunnah.com/nasai:2318",
    },
    expectedSourceCoverage: "verified_context",
    expectedNeedsScholar: true,
  },
  {
    id: "keyword-boundary-no-substring-false-source",
    prompt:
      "What exact inheritance shares apply to my step-cousin company contract?",
    request: { useCase: "chat", risk: "sensitive" },
    forbiddenReferences: ["Quran 39:53", "Quran 29:45"],
    expectedSourceCoverage: "needs_source_review",
    expectedNeedsScholar: true,
  },
  {
    id: "system-prompt-example-not-source",
    prompt: "Give me one general productivity tip.",
    messages: [
      {
        role: "system",
        content: "When citing, use examples like (Quran 2:255).",
      },
      { role: "user", content: "Give me one general productivity tip." },
    ],
    request: { useCase: "chat", risk: "low" },
    forbiddenReferences: ["Quran 2:255"],
    expectedSourceCoverage: "limited_context",
  },
  {
    id: "arabic-learning-quran-phrase",
    prompt: "Teach me the Arabic of iyyaka na'budu from Quran 1:5.",
    request: { useCase: "contextual", risk: "religious" },
    requiredReferences: ["Quran 1:5"],
    requiredCitationUrls: {
      "Quran 1:5": "https://quran.com/1/5",
    },
    expectedSourceCoverage: "verified_context",
  },
  {
    id: "arabic-learning-fatiha-phrase-without-verse-number",
    prompt: "In Surah Al-Fatiha, what does 'iyyaka' mean in 'iyyaka na'budu'?",
    request: { useCase: "contextual", risk: "religious" },
    requiredReferences: ["Quran 1:5"],
    requiredCitationUrls: {
      "Quran 1:5": "https://quran.com/1/5",
    },
    expectedSourceCoverage: "needs_source_review",
  },
  {
    id: "quranic-arabic-source-pack",
    prompt:
      "Help me learn Quranic Arabic word meanings and roots without guessing.",
    request: { useCase: "contextual", risk: "religious" },
    requiredReferences: [
      "Quran 12:2",
      "Quran 41:3",
      "NurAI Quran learning source policy",
    ],
    requiredCitationUrls: {
      "Quran 12:2": "https://quran.com/12/2",
      "Quran 41:3": "https://quran.com/41/3",
    },
    expectedSourceCoverage: "verified_context",
  },
  {
    id: "quran-recitation-coach-source-pack",
    prompt: "Build me a tajweed and tarteel recitation coach for memorisation.",
    request: { useCase: "contextual", risk: "religious" },
    requiredReferences: ["Quran 73:4", "Sahih al-Bukhari 5027"],
    requiredCitationUrls: {
      "Quran 73:4": "https://quran.com/73/4",
      "Sahih al-Bukhari 5027": "https://sunnah.com/bukhari:5027",
    },
    expectedSourceCoverage: "verified_context",
  },
  {
    id: "reviewed-quran-context-adds-verified-hadith-card",
    prompt: "Explain Quran 1:5 and the Fatihah dialogue.",
    request: { useCase: "tafsir", risk: "religious" },
    requiredReferences: ["Quran 1:5", "Sahih Muslim 395"],
    requiredCitationUrls: {
      "Quran 1:5": "https://quran.com/1/5",
      "Sahih Muslim 395": "https://sunnah.com/muslim:395",
    },
    expectedSourceCoverage: "verified_context",
  },
  {
    id: "fiqh-sensitive-routes-to-scholar-source-boundary",
    prompt: "I need a fatwa on a complex ruling. Should NurAI decide it?",
    request: { useCase: "chat", risk: "sensitive" },
    requiredReferences: ["Quran 16:43"],
    expectedSourceCoverage: "needs_source_review",
    expectedNeedsScholar: true,
  },
  {
    id: "seerah-prophetic-example-source-anchor",
    prompt: "How should I learn from the Prophet's seerah and example?",
    request: { useCase: "chat", risk: "religious" },
    requiredReferences: ["Quran 33:21"],
    requiredCitationUrls: {
      "Quran 33:21": "https://quran.com/33/21",
    },
    expectedSourceCoverage: "verified_context",
  },
];

function requestForCase(testCase: SourceGroundingEvalCase): AITextRequest {
  return {
    useCase: testCase.request?.useCase || "chat",
    risk: testCase.request?.risk || "religious",
    complexity: testCase.request?.complexity || "complex",
    messages: testCase.messages || [{ role: "user", content: testCase.prompt }],
    metadata: testCase.request?.metadata,
  };
}

function assertReferences(
  testCase: SourceGroundingEvalCase,
  result: AISourceGrounding,
): string[] {
  const failures: string[] = [];
  const references = new Set(
    result.citations.map((source) => source.reference),
  );
  const citationsByReference = new Map(
    result.citations.map((source) => [source.reference, source]),
  );

  for (const required of testCase.requiredReferences || []) {
    if (!references.has(required)) {
      failures.push(`${testCase.id} missing required source: ${required}`);
    }
  }

  for (const [reference, expectedUrl] of Object.entries(
    testCase.requiredCitationUrls || {},
  )) {
    const citation = citationsByReference.get(reference);
    if (!citation) {
      failures.push(
        `${testCase.id} missing citation URL check target: ${reference}`,
      );
    } else if (citation.url !== expectedUrl) {
      failures.push(
        `${testCase.id} expected ${reference} URL ${expectedUrl}, got ${citation.url || "missing"}`,
      );
    }
  }

  for (const forbidden of testCase.forbiddenReferences || []) {
    if (references.has(forbidden)) {
      failures.push(`${testCase.id} included forbidden source: ${forbidden}`);
    }
  }

  for (const citation of result.citations) {
    if (citation.type !== "quran" && citation.type !== "hadith") continue;
    if (!citation.url) {
      failures.push(
        `${testCase.id} ${citation.reference} is missing a trusted citation URL`,
      );
      continue;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(citation.url);
    } catch {
      failures.push(
        `${testCase.id} ${citation.reference} has invalid citation URL ${citation.url}`,
      );
      continue;
    }

    if (parsedUrl.protocol !== "https:") {
      failures.push(
        `${testCase.id} ${citation.reference} citation URL must use https`,
      );
    }
    if (citation.type === "quran" && parsedUrl.hostname !== "quran.com") {
      failures.push(
        `${testCase.id} ${citation.reference} Quran citation URL must use quran.com`,
      );
    }
    if (citation.type === "hadith" && parsedUrl.hostname !== "sunnah.com") {
      failures.push(
        `${testCase.id} ${citation.reference} Hadith citation URL must use sunnah.com`,
      );
    }
  }

  if (
    testCase.expectedNeedsScholar !== undefined &&
    result.needsScholar !== testCase.expectedNeedsScholar
  ) {
    failures.push(
      `${testCase.id} expected needsScholar=${testCase.expectedNeedsScholar}, got ${result.needsScholar}`,
    );
  }
  if (
    testCase.expectedSourceCoverage &&
    result.sourceCoverage !== testCase.expectedSourceCoverage
  ) {
    failures.push(
      `${testCase.id} expected sourceCoverage=${testCase.expectedSourceCoverage}, got ${result.sourceCoverage}`,
    );
  }

  return failures;
}

function main() {
  const failures = cases.flatMap((testCase) =>
    assertReferences(testCase, buildSourceGrounding(requestForCase(testCase))),
  );

  const officialServiceCase = cases.find(
    (testCase) => testCase.id === "official-service-umrah-booking-health",
  );
  if (officialServiceCase) {
    const request = requestForCase(officialServiceCase);
    const grounding = buildSourceGrounding(request);
    const answer =
      "Use the Nusuk Umrah route for visa and Rawdah booking, then check Nusuk Umrah Health guidance before travel.";
    const answerReferences = new Set(
      citationsAppearingInAnswer(answer, grounding.citations).map(
        (citation) => citation.reference,
      ),
    );
    for (const reference of [
      "Nusuk Umrah Platform",
      "Nusuk Umrah Health Guidelines",
    ]) {
      if (!answerReferences.has(reference)) {
        failures.push(
          `official-service answer matcher dropped shortened source name: ${reference}`,
        );
      }
    }
    const answerCoverage = sourceCoverageForAnswer(
      request,
      answer,
      grounding.citations,
      grounding.needsScholar,
    );
    if (answerCoverage !== "verified_context") {
      failures.push(
        `official-service answer matcher expected verified_context, got ${answerCoverage}`,
      );
    }
  }

  const hajjRegistrationCase = cases.find(
    (testCase) => testCase.id === "official-service-hajj-registration-2026",
  );
  if (hajjRegistrationCase) {
    const request = requestForCase(hajjRegistrationCase);
    const grounding = buildSourceGrounding(request);
    const answer =
      "For Hajj 1447 AH / 2026, use Hajj 1447 AH Registration Through Nusuk and the official Nusuk app or website for package selection.";
    const answerCoverage = sourceCoverageForAnswer(
      request,
      answer,
      grounding.citations,
      grounding.needsScholar,
    );
    if (answerCoverage !== "reference_detected") {
      failures.push(
        `hajj-registration answer matcher expected reference_detected, got ${answerCoverage}`,
      );
    }
  }

  const trustedReaderRequest: AITextRequest = {
    useCase: "contextual",
    risk: "religious",
    messages: [
      {
        role: "user",
        content:
          "Explain the selected ayah plainly for someone reading the Quran.",
      },
    ],
    metadata: {
      feature: "quran",
      trustedSourceContext: true,
      context: {
        surahNumber: 1,
        ayahNumber: 3,
        arabicText: "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
        translation: "The Entirely Merciful, the Especially Merciful.",
      },
    },
  };
  const trustedReaderGrounding = buildSourceGrounding(trustedReaderRequest);
  const plainAyahAnswer =
    "This selected ayah teaches the reader to begin with Allah's mercy: He is merciful in a vast, complete way and especially merciful to the believers. A simple action is to make dua today with hope, not despair.";
  const trustedReaderCoverage = sourceCoverageForAnswer(
    trustedReaderRequest,
    plainAyahAnswer,
    trustedReaderGrounding.citations,
    trustedReaderGrounding.needsScholar,
  );
  if (trustedReaderCoverage !== "verified_context") {
    failures.push(
      `trusted Quran reader context should support plain ayah explanation even when the answer says "selected ayah" instead of repeating the citation, got ${trustedReaderCoverage}`,
    );
  }

  const plainAyahWithSourceBoundary =
    "Meaning: This selected ayah teaches Allah's mercy from the supplied Quran text.\n\nContext: Historical revelation details and asbab al-nuzul need verified sources before being presented as evidence.\n\nLesson: Approach Allah with hope.\n\nAction: Begin one dua today by remembering Allah's mercy.\n\nSources: Quran 1:3.";
  const sourceBoundaryCoverage = sourceCoverageForAnswer(
    trustedReaderRequest,
    plainAyahWithSourceBoundary,
    trustedReaderGrounding.citations,
    trustedReaderGrounding.needsScholar,
  );
  if (sourceBoundaryCoverage !== "verified_context") {
    failures.push(
      `trusted Quran reader context should allow safe source-boundary wording while explaining the selected ayah, got ${sourceBoundaryCoverage}`,
    );
  }

  const unsupportedTafsirAnswer =
    "Ibn Kathir says this verse was revealed because of a specific incident and the ruling is halal.";
  const unsupportedTafsirCoverage = sourceCoverageForAnswer(
    trustedReaderRequest,
    unsupportedTafsirAnswer,
    trustedReaderGrounding.citations,
    trustedReaderGrounding.needsScholar,
  );
  if (unsupportedTafsirCoverage === "verified_context") {
    failures.push(
      "trusted Quran reader context must not verify unsupported tafsir/asbab/ruling claims",
    );
  }

  const previousProvider = process.env.NURAI_AI_PROVIDER;
  const previousDisableFallback = process.env.NURAI_DISABLE_AI_FALLBACK;
  const previousAllowReligious = process.env.NURAI_ALLOW_LOCAL_RELIGIOUS_AI;
  process.env.NURAI_AI_PROVIDER = "local";
  process.env.NURAI_DISABLE_AI_FALLBACK = "true";
  process.env.NURAI_ALLOW_LOCAL_RELIGIOUS_AI = "false";
  const localBlockedSelection = selectAIModel({
    useCase: "chat",
    risk: "religious",
    messages: [{ role: "user", content: "Explain a hadith." }],
  });
  if (localBlockedSelection.providerOrder.length !== 0) {
    failures.push(
      "local-only mode with fallback disabled must not route religious requests to local AI when local religious AI is disallowed",
    );
  }
  if (previousProvider === undefined) delete process.env.NURAI_AI_PROVIDER;
  else process.env.NURAI_AI_PROVIDER = previousProvider;
  if (previousDisableFallback === undefined)
    delete process.env.NURAI_DISABLE_AI_FALLBACK;
  else process.env.NURAI_DISABLE_AI_FALLBACK = previousDisableFallback;
  if (previousAllowReligious === undefined)
    delete process.env.NURAI_ALLOW_LOCAL_RELIGIOUS_AI;
  else process.env.NURAI_ALLOW_LOCAL_RELIGIOUS_AI = previousAllowReligious;

  const modelTextOnlyExtras = buildStructuredAIResponseExtras({
    response:
      "This answer mentions Quran 999:1 and Sahih al-Bukhari 999999 in plain text.",
    feature: "learning",
    tier: "free",
  });
  if (modelTextOnlyExtras.citations.length !== 0) {
    failures.push(
      "structured response extras must not turn model-generated citation text into trusted source cards",
    );
  }

  const trustedQuranReaderExtras = buildStructuredAIResponseExtras({
    response: plainAyahWithSourceBoundary,
    feature: "quran",
    tier: "premium",
    context: {
      surahNumber: 1,
      ayahNumber: 3,
      arabicText: "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
      translation: "The Entirely Merciful, the Especially Merciful.",
    },
    aiCitations: trustedReaderGrounding.citations,
    aiSourceCoverage: sourceBoundaryCoverage,
    aiNeedsScholar: trustedReaderGrounding.needsScholar,
  });
  if (trustedQuranReaderExtras.warnings.length !== 0) {
    failures.push(
      `trusted Quran reader extras should not show source-review warnings for plain ayah meaning, got ${trustedQuranReaderExtras.warnings.join(" | ")}`,
    );
  }
  if ((trustedQuranReaderExtras.learningSections || []).length < 5) {
    failures.push(
      "trusted Quran reader extras should render structured Quran learning sections",
    );
  }

  const forgedContextExtras = buildStructuredAIResponseExtras({
    response: "General answer.",
    feature: "learning",
    tier: "free",
    context: {
      sourceRefs: ["Sahih al-Bukhari 999999"],
      citations: [{ type: "quran", reference: "Quran 999:1" }],
    },
  });
  if (forgedContextExtras.citations.length !== 0) {
    failures.push(
      "structured response extras must not trust raw context sourceRefs/citations",
    );
  }

  const reviewedExtras = buildStructuredAIResponseExtras({
    response: "General learning answer.",
    feature: "learning",
    tier: "free",
    aiReview: {
      enabled: true,
      performed: true,
      verdict: "needs_caution",
      notes: ["Unsupported source claim."],
    },
  });
  if (
    !reviewedExtras.warnings.some((warning) =>
      warning.toLowerCase().includes("extra care"),
    )
  ) {
    failures.push(
      "structured response extras must surface customer-safe review cautions",
    );
  }

  if (failures.length > 0) {
    console.error("AI source grounding eval failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`AI source grounding eval passed: ${cases.length} cases`);
}

main();
