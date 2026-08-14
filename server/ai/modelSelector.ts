import { canUseLocalForRequest, getAIConfig } from "./config";
import type {
  AIComplexity,
  AIModelTier,
  AIProviderId,
  AITextRequest,
} from "./types";

export interface AIModelSelection {
  complexity: AIComplexity;
  tier: AIModelTier;
  cloudModel: string;
  localModel: string;
  localAllowed: boolean;
  providerOrder: AIProviderId[];
  reasons: string[];
}

const COMPLEXITY_MARKERS = [
  "fatwa",
  "ruling",
  "halal",
  "haram",
  "madhab",
  "fiqh",
  "tafsir",
  "hadith",
  "authentic",
  "scholars differ",
  "difference of opinion",
  "divorce",
  "inheritance",
  "zakat",
  "interest",
  "riba",
  "mortgage",
  "menstruation",
  "haidh",
  "istihadha",
  "nifas",
  "pregnancy",
  "medical",
  "depression",
  "anxiety",
  "self-harm",
  "trauma",
  "compare",
  "evidence",
  "sources",
  "classical",
];

function requestText(request: AITextRequest): string {
  return request.messages.map((message) => message.content).join("\n");
}

function countMarkerHits(text: string): number {
  const lower = text.toLowerCase();
  return COMPLEXITY_MARKERS.reduce(
    (count, marker) => count + (lower.includes(marker) ? 1 : 0),
    0,
  );
}

export function assessAIComplexity(request: AITextRequest): {
  complexity: AIComplexity;
  reasons: string[];
} {
  if (request.complexity) {
    return {
      complexity: request.complexity,
      reasons: [`request supplied ${request.complexity} complexity`],
    };
  }

  const text = requestText(request);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const markerHits = countMarkerHits(text);
  const risk = request.risk || "low";
  const reasons: string[] = [];
  let score = 0;

  if (words > 1200) {
    score += 3;
    reasons.push("long context");
  } else if (words > 500) {
    score += 2;
    reasons.push("medium-long context");
  } else if (words > 180) {
    score += 1;
    reasons.push("some context");
  }

  if (risk === "sensitive") {
    score += 3;
    reasons.push("sensitive religious/personal risk");
  } else if (risk === "religious") {
    score += 1;
    reasons.push("religious accuracy risk");
  }

  if (request.useCase === "tafsir") {
    score += 3;
    reasons.push("tafsir requires deeper source-aware reasoning");
  } else if (request.useCase === "chat" || request.useCase === "contextual") {
    score += 1;
    reasons.push(`${request.useCase} answer quality matters`);
  }

  if (markerHits >= 3) {
    score += 3;
    reasons.push("multiple complexity markers");
  } else if (markerHits > 0) {
    score += 1;
    reasons.push("complexity marker detected");
  }

  if (score >= 6) return { complexity: "complex", reasons };
  if (score >= 3) return { complexity: "standard", reasons };
  return {
    complexity: "simple",
    reasons: reasons.length ? reasons : ["short low-risk request"],
  };
}

function cloudModelForTier(tier: AIModelTier): string {
  const config = getAIConfig();
  if (tier === "fast") return config.cloudFastModel;
  if (tier === "deep") return config.cloudDeepModel;
  return config.cloudBalancedModel;
}

function tierForRequest(
  request: AITextRequest,
  complexity: AIComplexity,
  localAllowed: boolean,
): AIModelTier {
  const deepRequired =
    complexity === "complex" ||
    request.risk === "sensitive" ||
    request.useCase === "tafsir";

  switch (request.modelPreference || "auto") {
    case "local":
      return localAllowed ? "local" : deepRequired ? "deep" : "balanced";
    case "fast":
      return deepRequired ? "deep" : "fast";
    case "balanced":
      return deepRequired ? "deep" : "balanced";
    case "deep":
      return "deep";
    case "auto":
    default:
      if (deepRequired) return "deep";
      if (complexity === "standard") return "balanced";
      return localAllowed ? "local" : "fast";
  }
}

function providerOrderForTier(
  tier: AIModelTier,
  localAllowed: boolean,
): AIProviderId[] {
  const config = getAIConfig();

  if (config.mode === "openai") return ["openai"];

  if (config.mode === "local") {
    if (!localAllowed) {
      return config.disableFallback ? [] : ["openai"];
    }
    if (tier === "local" || localAllowed) {
      return config.disableFallback ? ["local"] : ["local", "openai"];
    }
    return config.disableFallback ? ["local"] : ["openai"];
  }

  if (tier === "local" && localAllowed) {
    return config.disableFallback ? ["local"] : ["local", "openai"];
  }

  return ["openai"];
}

export function selectAIModel(request: AITextRequest): AIModelSelection {
  const config = getAIConfig();
  const { complexity, reasons } = assessAIComplexity(request);
  const localAllowed = canUseLocalForRequest(request);
  const tier = tierForRequest(request, complexity, localAllowed);
  const providerOrder = providerOrderForTier(tier, localAllowed);

  const cloudTier = tier === "local" ? "fast" : tier;
  const cloudModel =
    request.preferredModel &&
    request.modelPreference &&
    request.modelPreference !== "auto"
      ? request.preferredModel
      : cloudModelForTier(cloudTier);

  return {
    complexity,
    tier,
    cloudModel,
    localModel: request.localModel || config.localDefaultModel,
    localAllowed,
    providerOrder,
    reasons,
  };
}

export function getAIModelPortfolio() {
  const config = getAIConfig();
  return {
    cloud: {
      fast: config.cloudFastModel,
      balanced: config.cloudBalancedModel,
      deep: config.cloudDeepModel,
    },
    local: {
      default: config.localDefaultModel,
      models: config.localModels.map((model) => ({
        id: model.id,
        label: model.label,
        model: model.model,
        roles: model.roles,
        enabled: model.enabled,
      })),
    },
  };
}
