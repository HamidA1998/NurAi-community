import type {
  ScholarJurisdiction,
  ScholarMadhhab,
  ScholarQuestionClassification,
  ScholarQuestionInput,
  ScholarSourceCard,
  ScholarSourcePack,
  ScholarTopic,
} from "@shared/scholar";

const SCHOLAR_BOUNDARY =
  "NurAI Scholar provides source-backed Islamic learning. It is not a fatwa, not a scholar replacement, and must fail closed when verified support is insufficient.";

const SUPPORTED_MADHHABS: ScholarMadhhab[] = [
  "hanafi",
  "maliki",
  "shafii",
  "hanbali",
  "general",
];

const SUPPORTED_JURISDICTIONS: ScholarJurisdiction[] = [
  "GB",
  "US",
  "CA",
  "EU",
  "SA",
  "GLOBAL",
];

export const SCHOLAR_SOURCE_CATALOG: ScholarSourceCard[] = [
  {
    id: "quran-riba-trade-2-275",
    type: "quran",
    reliability: "primary_text",
    title: "Quranic boundary: trade and riba",
    reference: "Quran 2:275",
    url: "https://quran.com/2/275",
    summary:
      "Primary anchor that distinguishes lawful trade from riba. Use as a boundary, not as a standalone crypto ruling.",
    useFor:
      "Grounding Islamic-finance answers around trade, riba, and the need to examine contract substance.",
    doNotUseFor:
      "Declaring a specific cryptoasset halal or haram without further qualified review.",
    topics: ["islamic_finance"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "quran-mutual-consent-4-29",
    type: "quran",
    reliability: "primary_text",
    title: "Quranic boundary: wealth by mutual consent",
    reference: "Quran 4:29",
    url: "https://quran.com/4/29",
    summary:
      "Primary anchor for lawful exchange, consent, and avoiding wrongful consumption of wealth.",
    useFor:
      "Grounding discussion of market conduct, fraud risk, and meaningful consent in transactions.",
    doNotUseFor:
      "Replacing due diligence on a token, exchange, staking product, or personal financial situation.",
    topics: ["islamic_finance"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "hanafi-finance-currency-screen",
    type: "fiqh",
    reliability: "classical_fiqh",
    title: "Hanafi finance screen: mal, currency, riba, and gharar",
    reference: "NurAI Hanafi finance review card",
    url: null,
    summary:
      "Hanafi-aware screening asks whether the asset is treated as valuable property, whether exchange creates riba concerns, and whether uncertainty/speculation dominates.",
    useFor:
      "Explaining which questions a Hanafi user should take to a qualified Islamic-finance scholar.",
    doNotUseFor:
      "Claiming a settled Hanafi ruling on all cryptocurrency or a specific token.",
    topics: ["islamic_finance"],
    madhhabTags: ["hanafi"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "fca-crypto-promotions-uk",
    type: "official_regulator",
    reliability: "official_context",
    title: "FCA cryptoasset promotions for UK consumers",
    reference: "Financial Conduct Authority cryptoasset promotions guidance",
    url: "https://www.fca.org.uk/firms/cryptoassets/marketing-uk-consumers",
    summary:
      "UK regulatory context for cryptoasset promotions. This is legal/consumer-risk context, not Islamic legal authority.",
    useFor:
      "UK-specific caution around consumer risk, promotions, and the need to check current local rules.",
    doNotUseFor:
      "Issuing Islamic rulings or treating UK regulatory status as Shariah compliance.",
    topics: ["islamic_finance"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GB"],
    verified: true,
  },
  {
    id: "crypto-scholar-difference-boundary",
    type: "scholar_research",
    reliability: "contemporary_scholar_review",
    title: "Contemporary crypto fiqh difference boundary",
    reference: "NurAI contemporary Islamic finance review card",
    url: null,
    summary:
      "Contemporary scholars differ because crypto can be analysed as property, currency, speculative asset, utility token, or a product containing separate contract features.",
    useFor:
      "Explaining why a careful answer must distinguish spot holding, trading, staking, lending, leverage, NFTs, and token utility.",
    doNotUseFor:
      "Flattening all crypto activity into one ruling or naming unsupported scholar positions.",
    topics: ["islamic_finance"],
    madhhabTags: ["general", "hanafi", "maliki", "shafii", "hanbali"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "scholar-escalation-personal-rulings",
    type: "app_policy",
    reliability: "internal_boundary",
    title: "Scholar escalation for personal rulings",
    reference: "NurAI source-safety policy",
    url: null,
    summary:
      "Personal, high-impact, or fact-specific rulings must be escalated to a qualified scholar with the user's full context.",
    useFor:
      "Failing closed when the source pack cannot safely support a nuanced answer.",
    doNotUseFor:
      "Avoiding source-backed educational answers when support exists.",
    topics: ["general"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "quran-ask-people-of-knowledge-16-43",
    type: "quran",
    reliability: "primary_text",
    title: "Quranic boundary: ask people of knowledge",
    reference: "Quran 16:43",
    url: "https://quran.com/16/43",
    summary:
      "Primary anchor for returning unclear religious matters to people of knowledge.",
    useFor:
      "Explaining why NurAI can teach general principles while personal rulings require qualified scholarship.",
    doNotUseFor:
      "Avoiding an answer when verified educational source cards support the general explanation.",
    topics: ["general", "quran", "hadith", "worship", "purification"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "quran-establish-prayer-20-14",
    type: "quran",
    reliability: "primary_text",
    title: "Quranic anchor: establish prayer for remembrance",
    reference: "Quran 20:14",
    url: "https://quran.com/20/14",
    summary:
      "Primary anchor for prayer as remembrance and daily worship discipline.",
    useFor:
      "Grounding prayer reminders, prayer habit coaching, and salah reflection.",
    doNotUseFor:
      "Issuing detailed prayer-law rulings or deciding unusual cases.",
    topics: ["worship"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "quran-prayer-conduct-29-45",
    type: "quran",
    reliability: "primary_text",
    title: "Quranic anchor: prayer shapes conduct",
    reference: "Quran 29:45",
    url: "https://quran.com/29/45",
    summary:
      "Primary anchor for connecting prayer with character, restraint, and daily conduct.",
    useFor:
      "Explaining how protecting salah can support moral and spiritual growth.",
    doNotUseFor:
      "Promising automatic outcomes or judging a user's spiritual state.",
    topics: ["worship"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "hadith-intention-bukhari-1",
    type: "hadith",
    reliability: "primary_text",
    title: "Hadith anchor: intention behind actions",
    reference: "Sahih al-Bukhari 1",
    url: "https://sunnah.com/bukhari:1",
    summary:
      "Verified hadith reference for intention as an inner anchor for worship and habits.",
    useFor:
      "Connecting daily actions, worship tracking, and learning goals to sincere intention.",
    doNotUseFor:
      "Quoting wording beyond the verified source page or judging a user's sincerity.",
    topics: ["general", "worship"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "hadith-consistency-bukhari-6464",
    type: "hadith",
    reliability: "primary_text",
    title: "Hadith anchor: small regular deeds",
    reference: "Sahih al-Bukhari 6464",
    url: "https://sunnah.com/bukhari:6464",
    summary:
      "Verified hadith reference for valuing sustainable, regular deeds.",
    useFor:
      "Grounding habit loops, streak coaching, and gentle daily progress suggestions.",
    doNotUseFor:
      "Creating guilt-heavy messaging or claiming a user has failed spiritually.",
    topics: ["general", "worship"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "quran-menstruation-dignity-2-222",
    type: "quran",
    reliability: "primary_text",
    title: "Quranic anchor: menstruation with dignity and care",
    reference: "Quran 2:222",
    url: "https://quran.com/2/222",
    summary:
      "Primary anchor for treating menstruation as a real purity topic with dignity and care.",
    useFor:
      "Grounding respectful women's health explanations and privacy-first cycle guidance.",
    doNotUseFor:
      "Deciding individual bleeding classifications, medical issues, or personal rulings.",
    topics: ["purification"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "quran-purification-5-6",
    type: "quran",
    reliability: "primary_text",
    title: "Quranic anchor: purification before prayer",
    reference: "Quran 5:6",
    url: "https://quran.com/5/6",
    summary: "Primary anchor for purification, wudu, and prayer preparation.",
    useFor:
      "Grounding general explanations of purification and prayer preparation.",
    doNotUseFor:
      "Resolving unusual medical/purity cases or madhhab-specific edge cases.",
    topics: ["purification", "worship"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "hadith-menses-qada-nasai-2318",
    type: "hadith",
    reliability: "primary_text",
    title: "Hadith anchor: missed fasts and prayers during menstruation",
    reference: "Sunan an-Nasa'i 2318",
    url: "https://sunnah.com/nasai:2318",
    summary:
      "Verified hadith reference used as a general source anchor for qada fasting versus prayer during menstruation.",
    useFor:
      "Explaining the broad source-backed distinction around missed fasts and prayers.",
    doNotUseFor:
      "Classifying a user's exact bleeding, cycle irregularity, nifas, or medical situation.",
    topics: ["purification"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "quran-prophetic-model-33-21",
    type: "quran",
    reliability: "primary_text",
    title: "Quranic anchor: prophetic example",
    reference: "Quran 33:21",
    url: "https://quran.com/33/21",
    summary:
      "Primary anchor for learning from the Prophet's example with reverence and care.",
    useFor:
      "Grounding seerah learning, character reflection, and prophetic-example prompts.",
    doNotUseFor:
      "Inventing historical reports, dates, chains, virtues, or story details.",
    topics: ["quran", "general"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "quran-arabic-understanding-12-2",
    type: "quran",
    reliability: "primary_text",
    title: "Quranic anchor: Arabic Quran for understanding",
    reference: "Quran 12:2",
    url: "https://quran.com/12/2",
    summary:
      "Primary anchor for connecting Quranic Arabic learning with understanding the Quran.",
    useFor:
      "Grounding Quranic Arabic, vocabulary, word-awareness, and beginner learning encouragement.",
    doNotUseFor:
      "Inventing Arabic roots, morphology, grammar rules, or tafsir details not present in verified source cards.",
    topics: ["quran"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "quran-clear-arabic-verses-41-3",
    type: "quran",
    reliability: "primary_text",
    title: "Quranic anchor: Arabic recitation with clear verses",
    reference: "Quran 41:3",
    url: "https://quran.com/41/3",
    summary:
      "Primary anchor for presenting Quran study as careful learning from clear, source-backed verses.",
    useFor:
      "Grounding Quran word meanings, beginner explanations, and source-aware Quran learning prompts.",
    doNotUseFor:
      "Claiming a complete linguistic analysis, revelation context, or tafsir without dedicated verified sources.",
    topics: ["quran"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "quran-tarteel-recitation-73-4",
    type: "quran",
    reliability: "primary_text",
    title: "Quranic anchor: measured recitation",
    reference: "Quran 73:4",
    url: "https://quran.com/73/4",
    summary:
      "Primary anchor for measured, deliberate Quran recitation and recitation-coaching experiences.",
    useFor:
      "Grounding recitation practice, listen-repeat flows, memorisation pacing, and gentle tajweed encouragement.",
    doNotUseFor:
      "Diagnosing a user's tajweed mistakes or issuing detailed recitation rulings without verified recitation review.",
    topics: ["quran"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "hadith-learn-teach-quran-bukhari-5027",
    type: "hadith",
    reliability: "primary_text",
    title: "Hadith anchor: learning and teaching Quran",
    reference: "Sahih al-Bukhari 5027",
    url: "https://sunnah.com/bukhari:5027",
    summary:
      "Verified hadith reference for the virtue of learning the Quran and teaching it.",
    useFor:
      "Grounding Quran-learning motivation, family Quran challenges, and study-path encouragement.",
    doNotUseFor:
      "Quoting hadith wording beyond the source card or ranking users spiritually.",
    topics: ["quran", "hadith"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "quran-word-intelligence-boundary",
    type: "app_policy",
    reliability: "internal_boundary",
    title: "NurAI Quran word-intelligence boundary",
    reference: "NurAI Quran learning source policy",
    url: null,
    summary:
      "NurAI may explain the selected ayah, known translation context, and verified source-card scope. Exact roots, morphology, sabab al-nuzul, named tafsir, and hadith links require verified source packs.",
    useFor:
      "Making Quran word-learning, beginner context, and recitation features useful while clearly naming unsupported areas.",
    doNotUseFor:
      "Presenting generated linguistic analysis, revelation circumstances, tafsir, or rulings as verified.",
    topics: ["quran"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
  {
    id: "hadith-knowledge-muslim-2699a",
    type: "hadith",
    reliability: "primary_text",
    title: "Hadith anchor: seeking knowledge",
    reference: "Sahih Muslim 2699a",
    url: "https://sunnah.com/muslim:2699a",
    summary:
      "Verified hadith reference for seeking knowledge as a path of goodness.",
    useFor:
      "Grounding Arabic learning, Quran study, and knowledge-search encouragement.",
    doNotUseFor: "Claiming a specific study method is religiously required.",
    topics: ["general", "quran", "hadith"],
    madhhabTags: ["general"],
    jurisdictionTags: ["GLOBAL"],
    verified: true,
  },
];

function normalizeQuestion(question: string): string {
  return question.replace(/\s+/g, " ").trim().slice(0, 1200);
}

function normalizeMadhhab(
  raw: ScholarQuestionInput["madhhab"],
): ScholarMadhhab {
  const value = String(raw || "general")
    .toLowerCase()
    .replace(/['\s-]+/g, "");
  if (value.includes("hana")) return "hanafi";
  if (value.includes("mali")) return "maliki";
  if (value.includes("shaf")) return "shafii";
  if (value.includes("hanb")) return "hanbali";
  return "general";
}

function normalizeJurisdiction(
  raw: ScholarQuestionInput["jurisdiction"],
  question: string,
): ScholarJurisdiction {
  const value = `${String(raw || "")} ${question}`.toLowerCase();
  if (
    /\b(uk|u\.k\.|gb|great britain|britain|england|scotland|wales)\b/.test(
      value,
    )
  ) {
    return "GB";
  }
  if (/\b(us|usa|united states|america)\b/.test(value)) return "US";
  if (/\b(canada|ca)\b/.test(value)) return "CA";
  if (/\b(eu|european union|europe)\b/.test(value)) return "EU";
  if (/\b(saudi|saudi arabia|ksa)\b/.test(value)) return "SA";
  return "GLOBAL";
}

function normalizeUserLevel(
  raw: ScholarQuestionInput["userLevel"],
): "beginner" | "intermediate" | "advanced" {
  if (raw === "advanced") return "advanced";
  if (raw === "intermediate") return "intermediate";
  return "beginner";
}

function primaryTopicFor(question: string): ScholarTopic {
  if (
    /\b(crypto|cryptocurrency|bitcoin|ethereum|token|staking|defi|nft|trading|investment|investing|riba|mortgage|zakat|finance)\b/i.test(
      question,
    )
  ) {
    return "islamic_finance";
  }
  if (
    /\b(wudu|ghusl|purification|menstruation|period|haidh|nifas|istihadha|bleeding|discharge)\b/i.test(
      question,
    )
  ) {
    return "purification";
  }
  if (/\b(salah|prayer|fast|ramadan|travel)\b/i.test(question)) {
    return "worship";
  }
  if (/\b(divorce|talaq|khula|marriage|nikah|inheritance)\b/i.test(question)) {
    return "family";
  }
  if (
    /\b(quran|ayah|surah|tafsir|quranic arabic|arabic quran|word meaning|word meanings|root|roots|morphology|recitation|tajweed|tarteel|hifz|memorisation|memorization)\b/i.test(
      question,
    )
  ) {
    return "quran";
  }
  if (/\b(hadith|sunnah)\b/i.test(question)) return "hadith";
  return "general";
}

function sensitivityReasonsFor(question: string): string[] {
  const checks: [RegExp, string][] = [
    [
      /\b(fatwa|ruling|halal|haram|permissible|impermissible)\b/i,
      "personal_ruling",
    ],
    [
      /\b(crypto|cryptocurrency|bitcoin|ethereum|staking|defi|leverage)\b/i,
      "volatile_financial_product",
    ],
    [/\b(divorce|talaq|khula|inheritance|abuse)\b/i, "high_impact_family_case"],
    [
      /\b(suicide|self[-\s]?harm|medical|diagnosis)\b/i,
      "non_religious_professional_support",
    ],
  ];
  return checks
    .filter(([pattern]) => pattern.test(question))
    .map(([, reason]) => reason);
}

export function classifyScholarQuestion(
  input: ScholarQuestionInput,
): ScholarQuestionClassification {
  const question = normalizeQuestion(input.question);
  const primaryTopic = primaryTopicFor(question);
  const madhhab = normalizeMadhhab(input.madhhab);
  const jurisdiction = normalizeJurisdiction(input.jurisdiction, question);
  const sensitivityReasons = sensitivityReasonsFor(question);

  return {
    question,
    primaryTopic,
    secondaryTopics: [],
    madhhabFilters: madhhab === "general" ? ["general"] : [madhhab],
    jurisdictionFilters:
      jurisdiction === "GLOBAL" ? ["GLOBAL"] : [jurisdiction],
    requiresScholarCare: sensitivityReasons.length > 0,
    sensitivityReasons,
    userLevel: normalizeUserLevel(input.userLevel),
    isRevert: Boolean(input.isRevert),
  };
}

function sourceScore(
  classification: ScholarQuestionClassification,
  source: ScholarSourceCard,
): number {
  let score = 0;
  const question = classification.question.toLowerCase();
  if (source.topics.includes(classification.primaryTopic)) score += 6;
  if (source.topics.includes("general")) score += 1;
  if (source.madhhabTags.includes("general")) score += 1;
  if (
    classification.madhhabFilters.some((madhhab) =>
      source.madhhabTags.includes(madhhab),
    )
  ) {
    score += 3;
  }
  if (source.jurisdictionTags.includes("GLOBAL")) score += 1;
  if (
    classification.jurisdictionFilters.some((jurisdiction) =>
      source.jurisdictionTags.includes(jurisdiction),
    )
  ) {
    score += 3;
  }
  if (source.reliability === "primary_text") score += 2;
  if (
    /\b(quranic arabic|arabic quran|word meaning|word meanings|root|roots|morphology)\b/.test(
      question,
    ) &&
    /\b(arabic|word-intelligence)\b/.test(source.id)
  ) {
    score += 5;
  }
  if (
    /\b(recitation|tajweed|tarteel|hifz|memorisation|memorization|memorise|memorize)\b/.test(
      question,
    ) &&
    /\b(tarteel|learn-teach-quran|word-intelligence)\b/.test(source.id)
  ) {
    score += 5;
  }
  if (/\b(learn quran|teach quran|quran study)\b/.test(question)) {
    if (source.id.includes("learn-teach-quran")) score += 5;
    if (source.id.includes("knowledge")) score += 2;
  }
  return score;
}

function sourceApplies(
  classification: ScholarQuestionClassification,
  source: ScholarSourceCard,
): boolean {
  if (!source.verified) return false;
  if (source.topics.includes(classification.primaryTopic)) return true;
  if (source.topics.includes("general") && classification.requiresScholarCare) {
    return true;
  }
  return false;
}

function coverageFor(
  classification: ScholarQuestionClassification,
  sources: ScholarSourceCard[],
): ScholarSourcePack["coverage"] {
  if (sources.length === 0) return "needs_source_review";
  const hasPrimary = sources.some(
    (source) => source.reliability === "primary_text",
  );
  const hasApplied = sources.some(
    (source) =>
      source.reliability === "classical_fiqh" ||
      source.reliability === "contemporary_scholar_review",
  );
  const hasJurisdiction = sources.some((source) =>
    classification.jurisdictionFilters.some((jurisdiction) =>
      source.jurisdictionTags.includes(jurisdiction),
    ),
  );

  if (classification.primaryTopic === "islamic_finance") {
    return hasPrimary && hasApplied && hasJurisdiction
      ? "verified_context"
      : "limited_context";
  }
  return hasPrimary || hasApplied ? "limited_context" : "needs_source_review";
}

export function buildScholarSourcePack(
  classification: ScholarQuestionClassification,
): ScholarSourcePack {
  if (
    classification.requiresScholarCare &&
    classification.primaryTopic === "family"
  ) {
    return {
      coverage: "needs_source_review",
      sources: [],
      systemBoundary: SCHOLAR_BOUNDARY,
      answerInstructions: [
        "Do not decide a personal family ruling.",
        "Ask the user to take exact details to a qualified scholar.",
        "Offer only general preparation guidance.",
      ],
      failClosedMessage:
        "This exact family question needs qualified scholar review with the user's full context. NurAI can help you prepare the details, but it should not decide the ruling.",
    };
  }

  const sources = SCHOLAR_SOURCE_CATALOG.filter((source) =>
    sourceApplies(classification, source),
  )
    .map((source) => ({ source, score: sourceScore(classification, source) }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 6)
    .map(({ source }) => source);

  const coverage = coverageFor(classification, sources);
  const failClosedMessage =
    coverage === "needs_source_review"
      ? "This exact question needs stronger verified support before NurAI Scholar can answer it safely. Please ask with clearer context, or take the case to a qualified scholar."
      : undefined;

  return {
    coverage,
    sources: coverage === "needs_source_review" ? [] : sources,
    systemBoundary: SCHOLAR_BOUNDARY,
    answerInstructions: [
      "Answer only from the supplied source cards.",
      "Cite the relevant source cards by reference in the answer.",
      "Separate general principles from personal rulings.",
      "Name madhhab-specific limits when the source cards support them.",
      "For specific circumstances, direct the user to a qualified scholar.",
    ],
    failClosedMessage,
  };
}

export function buildScholarPrompt(params: {
  classification: ScholarQuestionClassification;
  sourcePack: ScholarSourcePack;
}): string {
  const { classification, sourcePack } = params;
  const sources = sourcePack.sources
    .map(
      (source, index) =>
        `${index + 1}. ${source.reference} (${source.title})\nType: ${source.type}\nUse for: ${source.useFor}\nDo not use for: ${source.doNotUseFor}\nSummary: ${source.summary}`,
    )
    .join("\n\n");

  return [
    sourcePack.systemBoundary,
    "",
    `Question: ${classification.question}`,
    `Topic: ${classification.primaryTopic}`,
    `Madhhab filter: ${classification.madhhabFilters.join(", ")}`,
    `Jurisdiction filter: ${classification.jurisdictionFilters.join(", ")}`,
    `User level: ${classification.userLevel}`,
    classification.isRevert
      ? "Revert support: define terms gently and avoid overwhelming detail."
      : "",
    "",
    "Verified source cards:",
    sources || "None",
    "",
    "Instructions:",
    sourcePack.answerInstructions.map((item) => `- ${item}`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n");
}

export function supportedScholarFilters(): {
  madhhabs: ScholarMadhhab[];
  jurisdictions: ScholarJurisdiction[];
} {
  return {
    madhhabs: SUPPORTED_MADHHABS,
    jurisdictions: SUPPORTED_JURISDICTIONS,
  };
}
