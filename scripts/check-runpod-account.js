#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const originalEnv = { ...process.env };
const knownPublicPoolIds = new Set([
  "qwen3-32b-awq",
  "granite-4-0-h-small",
  "gpt-oss-120b",
]);

function parseEnvValue(raw) {
  const trimmed = String(raw || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvLocal() {
  const loaded = new Set();
  if (!fs.existsSync(envPath)) return loaded;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    if (process.env[key]) continue;
    process.env[key] = parseEnvValue(trimmed.slice(equalsIndex + 1));
    loaded.add(key);
  }
  return loaded;
}

const envLocalKeys = loadEnvLocal();

function looksLikeSecretReference(value) {
  return /^{{\s*[A-Za-z_][A-Za-z0-9_]*\s*}}$/.test(String(value || "").trim());
}

function looksLikePlaceholder(value) {
  const pendingMarker = "to" + "do";
  return new RegExp(
    `^(replace-me|${pendingMarker}|changeme|your-|example|placeholder)`,
    "i",
  ).test(String(value || "").trim());
}

function envState(name) {
  const value = String(process.env[name] || "").trim();
  const source = originalEnv[name]
    ? "process"
    : envLocalKeys.has(name)
      ? ".env.local"
      : "missing";
  if (!value) return { ok: false, name, source, state: "missing" };
  if (looksLikeSecretReference(value)) {
    return { ok: false, name, source, state: "secret-reference" };
  }
  if (looksLikePlaceholder(value)) {
    return { ok: false, name, source, state: "placeholder" };
  }
  return { ok: true, name, source, state: "present" };
}

function runpodApiKeyState() {
  for (const name of [
    "RUNPOD_API_KEY",
    "RUNPOD_SECRET_nurai",
    "NURAI_LOCAL_AI_API_KEY",
  ]) {
    const state = envState(name);
    if (state.ok) return state;
  }
  return {
    ok: false,
    name: "missing",
    source: "missing",
    state: "missing",
  };
}

function runpodApiKeyValue() {
  const state = runpodApiKeyState();
  if (!state.ok) return "";
  return process.env[state.name] || "";
}

function sanitizeText(value) {
  return String(value || "")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [REDACTED]")
    .replace(/\brpa_[A-Za-z0-9_-]+/g, "rpa_[REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]+/g, "sk-[REDACTED]")
    .replace(
      /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/gi,
      "postgres://[REDACTED]@",
    );
}

function endpointInfoFor(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) {
    return {
      ok: false,
      state: "missing",
      protocol: "missing",
      host: "missing",
      pathname: "missing",
      endpointId: "missing",
      endpointIdRaw: "",
      endpointKind: "missing",
      openAICompatiblePath: false,
    };
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return {
      ok: false,
      state: "invalid-url",
      protocol: "invalid",
      host: "invalid",
      pathname: "invalid",
      endpointId: "missing",
      endpointIdRaw: "",
      endpointKind: "invalid",
      openAICompatiblePath: false,
    };
  }

  const endpointIdRaw =
    parsed.hostname === "api.runpod.ai"
      ? parsed.pathname.match(/^\/v2\/([^/]+)(?:\/|$)/)?.[1] || ""
      : "";
  const endpointKind = endpointIdRaw
    ? knownPublicPoolIds.has(endpointIdRaw)
      ? "public-pool"
      : "owned-or-custom"
    : parsed.hostname === "api.runpod.ai"
      ? "missing-runpod-endpoint-id"
      : "not-runpod";
  const openAICompatiblePath = /\/openai\/v1\/?$/.test(parsed.pathname);
  const ok =
    parsed.protocol === "https:" &&
    parsed.hostname === "api.runpod.ai" &&
    Boolean(endpointIdRaw) &&
    openAICompatiblePath &&
    !knownPublicPoolIds.has(endpointIdRaw);

  return {
    ok,
    state: ok ? "owned-runpod-shape" : "invalid-owned-runpod-shape",
    protocol: parsed.protocol,
    host: parsed.hostname,
    pathname: parsed.pathname,
    endpointId: endpointIdRaw ? "present" : "missing",
    endpointIdRaw,
    endpointKind,
    openAICompatiblePath,
  };
}

function safePathname(info) {
  if (
    info.host === "api.runpod.ai" &&
    info.endpointId === "present" &&
    info.openAICompatiblePath
  ) {
    return "/v2/[endpoint]/openai/v1";
  }
  return info.pathname;
}

function parseModelPool(raw) {
  return String(raw || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [id, baseUrl, model, roles = "", enabled = "true"] = entry
        .split("|")
        .map((part) => part.trim());
      const endpoint = endpointInfoFor(baseUrl);
      return {
        id: id || "missing",
        baseUrlState: endpoint,
        model: model || "missing",
        roles,
        enabled: !["0", "false", "off", "disabled"].includes(
          enabled.toLowerCase(),
        ),
      };
    });
}

function templateEnvFor(endpoint) {
  const env = endpoint?.template?.env;
  return env && typeof env === "object" ? env : {};
}

function templateIsPrivate(endpoint) {
  const template = endpoint?.template;
  if (!template) return false;
  if (typeof template.isPublic === "boolean")
    return template.isPublic === false;
  if (typeof template.is_public === "boolean")
    return template.is_public === false;
  return false;
}

function endpointIsGpu(endpoint) {
  return String(endpoint?.computeType || "").toUpperCase() === "GPU";
}

function endpointModelMatches(endpoint, expectedModels) {
  const templateEnv = templateEnvFor(endpoint);
  const endpointModelValues = [
    templateEnv.OPENAI_SERVED_MODEL_NAME_OVERRIDE,
    templateEnv.MODEL_NAME,
    endpoint?.modelName,
    endpoint?.template?.name,
    endpoint?.name,
  ].filter(Boolean);
  return expectedModels.some((model) => endpointModelValues.includes(model));
}

function sanitizeEndpoint(endpoint, expectedModels) {
  const template = endpoint?.template || {};
  const templateEnv = templateEnvFor(endpoint);
  return {
    id: endpoint?.id ? "present" : "missing",
    name: endpoint?.name || "missing",
    computeType: endpoint?.computeType || "missing",
    gpuCount: endpoint?.gpuCount ?? "missing",
    gpuTypeIds: Array.isArray(endpoint?.gpuTypeIds) ? endpoint.gpuTypeIds : [],
    workersMin: endpoint?.workersMin ?? "missing",
    workersMax: endpoint?.workersMax ?? "missing",
    template: {
      present: Boolean(endpoint?.template),
      id: template.id ? "present" : "missing",
      name: template.name || "missing",
      imageName: template.imageName || "missing",
      isPublic:
        typeof template.isPublic === "boolean"
          ? template.isPublic
          : typeof template.is_public === "boolean"
            ? template.is_public
            : "missing",
      envKeys: Object.keys(templateEnv).sort(),
      modelName: templateEnv.MODEL_NAME || "missing",
      servedModelName:
        templateEnv.OPENAI_SERVED_MODEL_NAME_OVERRIDE || "missing",
      modelMatches: endpointModelMatches(endpoint, expectedModels),
    },
  };
}

function extractEndpoints(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.endpoints)) return data.endpoints;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

async function fetchRunpodEndpoints(apiKey) {
  try {
    const response = await fetch(
      "https://rest.runpod.io/v1/endpoints?includeTemplate=true&includeWorkers=true",
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15_000),
      },
    );
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        httpStatus: response.status,
        endpointCountVisible: 0,
        endpoints: [],
        error: sanitizeText(text).slice(0, 300),
      };
    }

    const endpoints = extractEndpoints(data);
    return {
      ok: true,
      httpStatus: response.status,
      endpointCountVisible: endpoints.length,
      endpoints,
    };
  } catch (error) {
    return {
      ok: false,
      httpStatus: "request-failed",
      endpointCountVisible: 0,
      endpoints: [],
      error: sanitizeText(
        error instanceof Error ? error.message : String(error),
      ),
    };
  }
}

function chooseBlocker(report) {
  const checks = report.checks || {};
  if (!checks.apiKeyResolved) return "missing-api-key";
  if (!checks.configuredEndpointShape) {
    if (report.configuredBaseUrl.endpointKind === "public-pool") {
      return "public-pool-configured";
    }
    return "owned-endpoint-url-invalid";
  }
  if (!checks.modelPoolPresent) return "model-pool-missing";
  if (!checks.modelPoolUsesOwnedEndpoint) {
    const publicEntry = report.modelPool.enabledEntries.find(
      (entry) => entry.endpointKind === "public-pool",
    );
    return publicEntry ? "public-pool-configured" : "model-pool-mismatch";
  }
  if (!checks.endpointListOk) return "endpoint-list-failed";
  if (!checks.endpointVisible) return "endpoint-not-visible";
  if (!checks.gpuEndpoint) return "endpoint-not-gpu";
  if (!checks.templatePrivate) return "template-not-private";
  if (!checks.templateModelMatches) return "model-mismatch";
  return report.ok ? null : "runpod-account-not-proven";
}

async function main() {
  const baseUrlState = envState("NURAI_LOCAL_AI_BASE_URL");
  const modelPoolState = envState("NURAI_LOCAL_AI_MODELS");
  const configuredBaseUrl = endpointInfoFor(
    process.env.NURAI_LOCAL_AI_BASE_URL,
  );
  const pool = parseModelPool(process.env.NURAI_LOCAL_AI_MODELS);
  const enabledEntries = pool.filter((entry) => entry.enabled);
  const enabledEndpointIds = [
    ...new Set(
      enabledEntries
        .map((entry) => entry.baseUrlState.endpointIdRaw)
        .filter(Boolean),
    ),
  ];
  const allEnabledUseConfiguredEndpoint =
    Boolean(configuredBaseUrl.endpointIdRaw) &&
    enabledEntries.length > 0 &&
    enabledEndpointIds.length === 1 &&
    enabledEndpointIds[0] === configuredBaseUrl.endpointIdRaw;
  const allEnabledUseOwnedEndpoint =
    enabledEntries.length > 0 &&
    enabledEntries.every((entry) => entry.baseUrlState.ok) &&
    allEnabledUseConfiguredEndpoint;
  const expectedModels = [
    process.env.NURAI_LOCAL_TEXT_MODEL,
    ...enabledEntries.map((entry) => entry.model),
  ].filter(Boolean);

  const apiKey = runpodApiKeyValue();
  const apiKeyState = runpodApiKeyState();
  const endpointList = apiKeyState.ok
    ? await fetchRunpodEndpoints(apiKey)
    : {
        ok: false,
        httpStatus: "skipped",
        endpointCountVisible: 0,
        endpoints: [],
        error: "missing-api-key",
      };
  const endpoint = configuredBaseUrl.endpointIdRaw
    ? endpointList.endpoints.find(
        (candidate) => candidate.id === configuredBaseUrl.endpointIdRaw,
      )
    : null;
  const ownedEndpoint = endpoint
    ? sanitizeEndpoint(endpoint, expectedModels)
    : null;
  const checks = {
    apiKeyResolved: apiKeyState.ok,
    configuredEndpointShape: baseUrlState.ok && configuredBaseUrl.ok,
    modelPoolPresent: modelPoolState.ok && enabledEntries.length > 0,
    modelPoolUsesOwnedEndpoint: modelPoolState.ok && allEnabledUseOwnedEndpoint,
    endpointListOk: endpointList.ok,
    endpointVisible: Boolean(endpoint),
    gpuEndpoint: endpointIsGpu(endpoint),
    templatePrivate: templateIsPrivate(endpoint),
    templateModelMatches: Boolean(
      endpoint && endpointModelMatches(endpoint, expectedModels),
    ),
    allEnabledUseConfiguredEndpoint,
  };
  const ok = Object.values(checks).every(Boolean);
  const report = {
    ok,
    blocker: null,
    apiKey: apiKeyState,
    configuredBaseUrl: {
      source: baseUrlState.source,
      state: baseUrlState.state,
      protocol: configuredBaseUrl.protocol,
      host: configuredBaseUrl.host,
      pathname: safePathname(configuredBaseUrl),
      endpointId: configuredBaseUrl.endpointId,
      endpointKind: configuredBaseUrl.endpointKind,
      openAICompatiblePath: configuredBaseUrl.openAICompatiblePath,
    },
    modelPool: {
      source: modelPoolState.source,
      state: modelPoolState.state,
      configuredCount: pool.length,
      enabledCount: enabledEntries.length,
      enabledEntries: enabledEntries.map((entry) => ({
        id: entry.id,
        model: entry.model,
        roles: entry.roles,
        endpointId: entry.baseUrlState.endpointId,
        endpointKind: entry.baseUrlState.endpointKind,
        openAICompatiblePath: entry.baseUrlState.openAICompatiblePath,
        usesConfiguredEndpoint:
          Boolean(configuredBaseUrl.endpointIdRaw) &&
          entry.baseUrlState.endpointIdRaw === configuredBaseUrl.endpointIdRaw,
        ok: entry.baseUrlState.ok,
      })),
      allEnabledUseConfiguredEndpoint,
    },
    account: {
      endpointListOk: endpointList.ok,
      httpStatus: endpointList.httpStatus,
      visibleEndpointCount: endpointList.endpointCountVisible,
      error: endpointList.error,
    },
    ownedEndpoint: ownedEndpoint || {
      visible: false,
      id: "missing",
      template: { present: false },
    },
    checks,
  };
  report.blocker = chooseBlocker(report);

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  const report = {
    ok: false,
    blocker: "runpod-account-check-crashed",
    error: sanitizeText(error instanceof Error ? error.message : String(error)),
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
});
