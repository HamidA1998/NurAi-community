import type { AIUseCase, AIRiskLevel, AIRouterMode } from "./types";

export interface LocalAIModelConfig {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  roles: string[];
  enabled: boolean;
}

type CloudAPIKeySource =
  | "AI_INTEGRATIONS_OPENAI_API_KEY"
  | "OPENAI_API_KEY"
  | "missing";

function readMode(): AIRouterMode {
  const raw = (
    process.env.NURAI_AI_PROVIDER ||
    process.env.NURAI_AI_MODE ||
    "openai"
  ).toLowerCase();
  if (raw === "local" || raw === "hybrid" || raw === "openai") return raw;
  return "openai";
}

function readBool(raw: string | undefined, fallback = false): boolean {
  if (raw === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

export function looksLikeSecretReference(value?: string): boolean {
  return /^{{\s*[A-Za-z_][A-Za-z0-9_]*\s*}}$/.test((value || "").trim());
}

function isLoopbackUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return (
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
    );
  } catch {
    return false;
  }
}

function modelLabel(id: string): string {
  return id
    .replace(/^runpod-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseLocalModelPool(raw?: string): LocalAIModelConfig[] {
  if (!raw) return [];

  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [id, baseUrl, model, roles = "general", enabled = "true"] = entry
        .split("|")
        .map((part) => part.trim());
      if (!id || !baseUrl || !model) return null;
      return {
        id,
        label: modelLabel(id),
        baseUrl,
        model,
        roles: roles
          .split(",")
          .map((role) => role.trim())
          .filter(Boolean),
        enabled: !["0", "false", "off", "disabled"].includes(
          enabled.toLowerCase(),
        ),
      };
    })
    .filter((model): model is LocalAIModelConfig => Boolean(model));
}

function buildLocalModelPool({
  baseUrl,
  defaultModel,
}: {
  baseUrl: string;
  defaultModel: string;
}): LocalAIModelConfig[] {
  const configuredPool = parseLocalModelPool(process.env.NURAI_LOCAL_AI_MODELS);
  if (configuredPool.length) return configuredPool;

  return [
    {
      id: "local-default",
      label: "Local Default",
      baseUrl,
      model: defaultModel,
      roles: ["general"],
      enabled: true,
    },
  ];
}

function readCloudAPIKeySource(): CloudAPIKeySource {
  if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    return "AI_INTEGRATIONS_OPENAI_API_KEY";
  }
  if (process.env.OPENAI_API_KEY) return "OPENAI_API_KEY";
  return "missing";
}

export interface AIConfig {
  mode: AIRouterMode;
  cloudBaseUrl?: string;
  cloudApiKey?: string;
  cloudApiKeySource: CloudAPIKeySource;
  cloudDefaultModel: string;
  cloudFastModel: string;
  cloudBalancedModel: string;
  cloudDeepModel: string;
  localBaseUrl: string;
  localApiKey: string;
  localDefaultModel: string;
  localModels: LocalAIModelConfig[];
  localTimeoutMs: number;
  disableFallback: boolean;
  allowLocalReligious: boolean;
  allowLocalSensitive: boolean;
}

export function isLocalAIConfigured(config: AIConfig): boolean {
  if (looksLikeSecretReference(config.localApiKey)) return false;
  return config.localModels.some((model) => {
    if (!model.enabled || !model.baseUrl || !model.model) return false;
    if (!isLoopbackUrl(model.baseUrl) && config.localApiKey === "ollama") {
      return false;
    }
    return true;
  });
}

export function isCloudAIConfigured(config: AIConfig): boolean {
  return Boolean(
    config.cloudApiKey && !looksLikeSecretReference(config.cloudApiKey),
  );
}

export function getAIConfig(): AIConfig {
  const localBaseUrl =
    process.env.NURAI_LOCAL_AI_BASE_URL || "http://127.0.0.1:11434/v1";
  const localDefaultModel = process.env.NURAI_LOCAL_TEXT_MODEL || "gemma3:4b";

  return {
    mode: readMode(),
    cloudBaseUrl:
      process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ||
      process.env.OPENAI_BASE_URL,
    cloudApiKey:
      process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    cloudApiKeySource: readCloudAPIKeySource(),
    cloudDefaultModel: process.env.NURAI_CLOUD_TEXT_MODEL || "gpt-4.1",
    cloudFastModel: process.env.NURAI_CLOUD_FAST_MODEL || "gpt-4.1-mini",
    cloudBalancedModel:
      process.env.NURAI_CLOUD_BALANCED_MODEL ||
      process.env.NURAI_CLOUD_TEXT_MODEL ||
      "gpt-4.1",
    cloudDeepModel:
      process.env.NURAI_CLOUD_DEEP_MODEL ||
      process.env.NURAI_CLOUD_TEXT_MODEL ||
      "gpt-4.1",
    localBaseUrl,
    localApiKey: process.env.NURAI_LOCAL_AI_API_KEY || "ollama",
    localDefaultModel,
    localModels: buildLocalModelPool({
      baseUrl: localBaseUrl,
      defaultModel: localDefaultModel,
    }),
    localTimeoutMs: Number(process.env.NURAI_LOCAL_AI_TIMEOUT_MS || 2500),
    disableFallback: readBool(process.env.NURAI_DISABLE_AI_FALLBACK, false),
    allowLocalReligious: readBool(
      process.env.NURAI_ALLOW_LOCAL_RELIGIOUS_AI,
      false,
    ),
    allowLocalSensitive: readBool(
      process.env.NURAI_ALLOW_LOCAL_SENSITIVE_AI,
      false,
    ),
  };
}

export function canUseLocalForRequest({
  useCase,
  risk = "low",
  localEligible,
}: {
  useCase: AIUseCase;
  risk?: AIRiskLevel;
  localEligible?: boolean;
}): boolean {
  const config = getAIConfig();

  if (localEligible === false) return false;
  if (risk === "sensitive" && !config.allowLocalSensitive) return false;
  if (risk === "religious" && !config.allowLocalReligious) return false;

  if (localEligible === true) return true;

  return ["summary", "classification", "nudge", "utility"].includes(useCase);
}

export function publicAIConfig() {
  const config = getAIConfig();
  const localRoles = [
    ...new Set(config.localModels.flatMap((model) => model.roles)),
  ].sort();
  const enabledModelCount = config.localModels.filter(
    (model) => model.enabled,
  ).length;
  return {
    mode: config.mode,
    cloud: {
      configured: isCloudAIConfigured(config),
      apiKeySource: config.cloudApiKeySource,
      customBaseUrl: Boolean(config.cloudBaseUrl),
      defaultModel: config.cloudDefaultModel,
      fastModel: config.cloudFastModel,
      balancedModel: config.cloudBalancedModel,
      deepModel: config.cloudDeepModel,
    },
    local: {
      modelCount: config.localModels.length,
      enabledModelCount,
      roles: localRoles,
      configured: isLocalAIConfigured(config),
      timeoutMs: config.localTimeoutMs,
      secretResolved: !looksLikeSecretReference(config.localApiKey),
    },
    rules: {
      fallbackEnabled: !config.disableFallback,
      allowLocalReligious: config.allowLocalReligious,
      allowLocalSensitive: config.allowLocalSensitive,
      simpleTasks: "local or fast cloud",
      standardTasks: "balanced cloud",
      complexTasks: "deep cloud",
    },
  };
}

function secretState(
  value: string | undefined,
): "missing" | "present" | "secret-reference" {
  if (!value) return "missing";
  if (looksLikeSecretReference(value)) return "secret-reference";
  return "present";
}

export function adminAIConfig() {
  const config = getAIConfig();
  return {
    mode: config.mode,
    cloud: {
      configured: isCloudAIConfigured(config),
      baseUrl: config.cloudBaseUrl || "https://api.openai.com/v1",
      customBaseUrl: Boolean(config.cloudBaseUrl),
      apiKeySource: config.cloudApiKeySource,
      apiKeyState: secretState(config.cloudApiKey),
      defaultModel: config.cloudDefaultModel,
      fastModel: config.cloudFastModel,
      balancedModel: config.cloudBalancedModel,
      deepModel: config.cloudDeepModel,
    },
    local: {
      configured: isLocalAIConfigured(config),
      defaultBaseUrl: config.localBaseUrl,
      defaultModel: config.localDefaultModel,
      apiKeyState: secretState(config.localApiKey),
      timeoutMs: config.localTimeoutMs,
      models: config.localModels.map((model) => ({
        id: model.id,
        label: model.label,
        baseUrl: model.baseUrl,
        model: model.model,
        roles: model.roles,
        enabled: model.enabled,
      })),
    },
    rules: {
      fallbackEnabled: !config.disableFallback,
      allowLocalReligious: config.allowLocalReligious,
      allowLocalSensitive: config.allowLocalSensitive,
    },
    observability: {
      usageLogging: process.env.AI_USAGE_LOGGING !== "false",
      reviewMode: process.env.NURAI_AI_REVIEW_MODE || "auto",
    },
  };
}
