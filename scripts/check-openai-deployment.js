#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

function parseEnvValue(raw) {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  const loadedKeys = new Set();
  if (!fs.existsSync(envPath)) return loadedKeys;

  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = line.slice(0, equalsIndex).trim();
    const value = parseEnvValue(line.slice(equalsIndex + 1));
    if (!process.env[key]) {
      process.env[key] = value;
      loadedKeys.add(key);
    }
  }

  return loadedKeys;
}

const envLocalLoadedKeys = loadEnvLocal();

function readArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  return undefined;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function isTruthyFlag(value) {
  return ["1", "true", "yes", "on"].includes(
    String(value || "")
      .trim()
      .toLowerCase(),
  );
}

function deploymentRequired() {
  return [
    "release-gate",
    "require-deployment",
    "require-cloud",
    "require-local",
    "require-redacted-status",
    "require-admin-diagnostics-protected",
    "require-ai-integrations-openai-key",
  ].some(hasFlag);
}

function normalizeStatusUrl(value) {
  if (!value) return undefined;
  const url = new URL(value);
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = "/api/ai/status";
  }
  return url.toString();
}

function redact(value) {
  if (!value) return undefined;
  if (looksLikeSecretReference(value)) return "secret-reference";
  return "present";
}

function looksLikeSecretReference(value) {
  return /^{{\s*[A-Za-z_][A-Za-z0-9_]*\s*}}$/.test((value || "").trim());
}

function scrubSensitiveText(value) {
  return String(value || "")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}/g, "sk-[REDACTED]")
    .replace(/\brpa_[A-Za-z0-9_-]{12,}/g, "rpa_[REDACTED]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "AIza[REDACTED]")
    .replace(
      /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/gi,
      "postgres://[REDACTED]@",
    );
}

function compactText(value, maxLength = 260) {
  const text = scrubSensitiveText(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[#A-Za-z0-9]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text || "empty response body";
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function responseBodySummary(data) {
  if (typeof data === "string") {
    if (/This app isn/i.test(data) && /Replit App/i.test(data)) {
      return "Legacy Replit platform response: this old build URL is not live and cannot count as current production runtime evidence.";
    }
    return compactText(data);
  }
  return compactText(JSON.stringify(data));
}

async function readJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}: ${responseBodySummary(data)}`,
    );
  }

  return {
    data,
    headers: Object.fromEntries(response.headers.entries()),
    status: response.status,
  };
}

async function readStatus(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return {
    data,
    headers: Object.fromEntries(response.headers.entries()),
    status: response.status,
    ok: response.ok,
  };
}

function adminDiagnosticsUrlFor(statusUrl) {
  if (!statusUrl) return undefined;
  const url = new URL(statusUrl);
  url.pathname = "/api/admin/ai/diagnostics";
  url.search = "";
  return url.toString();
}

function adminSmokeUrlFor(statusUrl) {
  if (!statusUrl) return undefined;
  const url = new URL(statusUrl);
  url.pathname = "/api/admin/ai/smoke";
  url.search = "";
  return url.toString();
}

function assertPublicStatusRedacted(data) {
  const text = JSON.stringify(data);
  const leakedPatterns = [
    /https?:\/\/[^"\\\s]+/i,
    /api\.runpod\.ai\/v2\/[^"\\\s]+/i,
    /\/openai\/v1/i,
    /127\.0\.0\.1:\d+/i,
    /localhost:\d+/i,
  ];
  for (const pattern of leakedPatterns) {
    if (pattern.test(text)) {
      throw new Error(
        `Public deployment AI status leaked a provider URL or local endpoint matching ${pattern}.`,
      );
    }
  }

  const localText = JSON.stringify(data?.local || {});
  if (/\bbaseUrl\b|\bdefaultBaseUrl\b/i.test(localText)) {
    throw new Error(
      "Public deployment AI status must not expose local baseUrl fields.",
    );
  }
}

function openAIHeaders(apiKey) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const organization = process.env.OPENAI_ORGANIZATION;
  const project = process.env.OPENAI_PROJECT;
  if (organization) headers["OpenAI-Organization"] = organization;
  if (project) headers["OpenAI-Project"] = project;

  return headers;
}

async function checkDeploymentStatus(statusUrl) {
  if (!statusUrl) {
    return {
      skipped: true,
      reason: "Set NURAI_DEPLOYMENT_URL or pass --deployment-url/--status-url.",
    };
  }

  const { data } = await readJson(statusUrl, {
    headers: { Accept: "application/json" },
  });
  assertPublicStatusRedacted(data);

  return {
    ok: true,
    statusUrl,
    mode: data.mode,
    cloudConfigured: Boolean(data.cloud?.configured),
    cloudApiKeySource: data.cloud?.apiKeySource,
    cloudModels: data.cloud
      ? {
          fast: data.cloud.fastModel,
          balanced: data.cloud.balancedModel,
          deep: data.cloud.deepModel,
          default: data.cloud.defaultModel,
        }
      : undefined,
    localConfigured: Boolean(data.local?.configured),
    localSecretResolved: data.local?.secretResolved,
    fallbackEnabled: data.rules?.fallbackEnabled,
    health: data.health,
    publicStatusRedacted: true,
  };
}

async function checkAdminDiagnosticsProtection(statusUrl) {
  if (!statusUrl) {
    return {
      skipped: true,
      reason: "Set NURAI_DEPLOYMENT_URL or pass --deployment-url/--status-url.",
    };
  }

  const diagnosticsUrl = adminDiagnosticsUrlFor(statusUrl);
  const { data, status } = await readStatus(diagnosticsUrl, {
    headers: { Accept: "application/json" },
  });

  if (status !== 401) {
    throw new Error(
      `Expected unauthenticated admin diagnostics to return 401, got ${status}: ${responseBodySummary(data)}`,
    );
  }

  return {
    ok: true,
    diagnosticsUrl,
    unauthenticatedStatus: status,
    protected: true,
  };
}

async function checkDeployedServerSmoke(statusUrl) {
  if (!statusUrl) {
    return {
      skipped: true,
      reason: "Set NURAI_DEPLOYMENT_URL or pass --deployment-url/--status-url.",
    };
  }
  if (!hasFlag("server-smoke") && !hasFlag("release-gate")) {
    return {
      skipped: true,
      reason:
        "Pass --server-smoke or --release-gate to call the deployed server-side AI smoke endpoint. This may incur OpenAI usage cost.",
    };
  }

  const smokeSecret =
    readArg("smoke-secret") || process.env.NURAI_DEPLOYED_AI_SMOKE_SECRET;
  if (!smokeSecret || looksLikeSecretReference(smokeSecret)) {
    return {
      ok: false,
      reason:
        "Set NURAI_DEPLOYED_AI_SMOKE_SECRET locally and in the deployed runtime before running the server-side smoke check.",
    };
  }

  const smokeUrl = adminSmokeUrlFor(statusUrl);
  const { data, status } = await readStatus(smokeUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "x-nurai-release-smoke-secret": smokeSecret,
    },
  });
  const errorSummary =
    status === 200 && data?.ok === true ? undefined : responseBodySummary(data);
  const remediation =
    status === 401
      ? "The deployed smoke endpoint is protected but did not accept the release smoke secret. Sync NURAI_DEPLOYED_AI_SMOKE_SECRET to the deployed runtime, restart/redeploy it, then rerun check:ai-release:deployed."
      : status === 403
        ? "The deployed smoke endpoint rejected the caller as non-admin. Use the release smoke secret path or an allowed admin session for manual diagnostics."
        : status >= 500
          ? "The deployed runtime accepted the smoke request but failed while generating server-side AI text. Check deployed AI secrets and server logs."
          : undefined;

  return {
    ok: status === 200 && data?.ok === true && data?.textMatched === true,
    smokeUrl,
    status,
    provider: data?.provider,
    modelTier: data?.modelTier,
    fallbackUsed: data?.fallbackUsed,
    attemptedProviders: data?.attemptedProviders,
    usage: data?.usage,
    textMatched: data?.textMatched === true,
    error: errorSummary,
    remediation,
  };
}

function deployedConfiguredModels(deploymentStatus) {
  const models = deploymentStatus?.cloudModels
    ? [
        deploymentStatus.cloudModels.fast,
        deploymentStatus.cloudModels.balanced,
        deploymentStatus.cloudModels.deep,
        deploymentStatus.cloudModels.default,
      ]
    : [];
  return models.filter(
    (model, index, all) => Boolean(model) && all.indexOf(model) === index,
  );
}

function fallbackConfiguredModels() {
  return [
    process.env.NURAI_CLOUD_FAST_MODEL || "gpt-4.1-mini",
    process.env.NURAI_CLOUD_BALANCED_MODEL ||
      process.env.NURAI_CLOUD_TEXT_MODEL ||
      "gpt-4.1",
    process.env.NURAI_CLOUD_DEEP_MODEL ||
      process.env.NURAI_CLOUD_TEXT_MODEL ||
      "gpt-4.1",
    process.env.NURAI_CLOUD_TEXT_MODEL || "gpt-4.1",
  ].filter(
    (model, index, all) => Boolean(model) && all.indexOf(model) === index,
  );
}

async function checkOpenAIModels({ apiKey, baseUrl, configuredModels }) {
  if (!apiKey) {
    return {
      skipped: true,
      reason:
        "Set AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY for direct OpenAI key validation.",
    };
  }

  if (looksLikeSecretReference(apiKey)) {
    return {
      ok: false,
      apiKey: redact(apiKey),
      reason: "OpenAI API key is still a platform secret reference.",
    };
  }

  const { data, headers } = await readJson(`${baseUrl}/models`, {
    headers: openAIHeaders(apiKey),
  });
  const models = Array.isArray(data?.data)
    ? data.data.map((item) => item.id)
    : [];
  const visibleModels = configuredModels.length
    ? configuredModels
    : fallbackConfiguredModels();

  return {
    ok: true,
    baseUrl,
    apiKey: redact(apiKey),
    requestId: headers["x-request-id"],
    modelCount: models.length,
    configuredModels: visibleModels,
    configuredModelsSource: configuredModels.length
      ? "deployment"
      : "local-env",
    configuredModelsVisible: visibleModels.length
      ? visibleModels.reduce((next, model) => {
          next[model] = models.includes(model);
          return next;
        }, {})
      : undefined,
  };
}

async function checkLiveCompletion({ apiKey, baseUrl, model }) {
  if (!hasFlag("live-completion")) {
    return {
      skipped: true,
      reason:
        "Pass --live-completion to make a real chat completion request. This may incur OpenAI usage cost.",
    };
  }

  if (!apiKey || looksLikeSecretReference(apiKey)) {
    return {
      ok: false,
      reason: "A resolved OpenAI API key is required for --live-completion.",
    };
  }

  const { data, headers } = await readJson(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: openAIHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: "Reply with exactly: openai deployment ready",
        },
      ],
      max_completion_tokens: 16,
      stream: false,
    }),
  });

  return {
    ok: true,
    model,
    requestId: headers["x-request-id"],
    text: data.choices?.[0]?.message?.content?.trim(),
    usage: data.usage,
  };
}

function configuredModelsVisible(check) {
  const visible = check?.configuredModelsVisible;
  return Boolean(
    check?.ok &&
      visible &&
      Object.values(visible).every((value) => value === true),
  );
}

function localAIHealthReady(deploymentStatus) {
  const local = deploymentStatus?.health?.local;
  if (!local || local.healthy !== true) return false;
  if (!Array.isArray(local.models)) return true;
  const enabledModels = local.models.filter((model) => model.enabled !== false);
  return (
    enabledModels.length > 0 &&
    enabledModels.every((model) => model.healthy === true)
  );
}

function applyRequiredReleaseGates(result) {
  const releaseGate = hasFlag("release-gate");
  const failures = [];
  const deploymentStatus = result.checks.deploymentStatus;
  const adminDiagnostics = result.checks.adminDiagnostics;
  const openAIModels = result.checks.openAIModels;
  const liveCompletion = result.checks.liveCompletion;
  const serverSmokeCompletion = result.checks.serverSmokeCompletion;

  if ((releaseGate || hasFlag("require-deployment")) && !deploymentStatus?.ok) {
    failures.push("Deployment status check is required but did not pass.");
  }
  if (
    (releaseGate || hasFlag("require-cloud")) &&
    deploymentStatus?.cloudConfigured !== true
  ) {
    failures.push("Deployed cloud AI configuration is required but not true.");
  }
  if (
    (releaseGate || hasFlag("require-ai-integrations-openai-key")) &&
    deploymentStatus?.cloudApiKeySource !== "AI_INTEGRATIONS_OPENAI_API_KEY"
  ) {
    failures.push(
      "Deployed OpenAI must use AI_INTEGRATIONS_OPENAI_API_KEY as the production secret source.",
    );
  }
  if (
    (hasFlag("require-local") ||
      (releaseGate &&
        (isTruthyFlag(process.env.NURAI_REQUIRE_LOCAL_AI) ||
          ["hybrid", "local"].includes(
            String(deploymentStatus?.mode || "").toLowerCase(),
          )))) &&
    (deploymentStatus?.localConfigured !== true ||
      deploymentStatus?.localSecretResolved === false ||
      !localAIHealthReady(deploymentStatus))
  ) {
    failures.push(
      "Deployed local AI configuration, resolved secret, and healthy enabled models are required for hybrid/local release mode but not true.",
    );
  }
  if (
    (releaseGate || hasFlag("require-redacted-status")) &&
    deploymentStatus?.publicStatusRedacted !== true
  ) {
    failures.push(
      "Deployed public AI status redaction is required but was not proven.",
    );
  }
  if (
    (releaseGate || hasFlag("require-admin-diagnostics-protected")) &&
    adminDiagnostics?.protected !== true
  ) {
    failures.push(
      "Deployed admin AI diagnostics must return 401 unauthenticated.",
    );
  }
  if (
    (releaseGate || hasFlag("require-openai-models")) &&
    !configuredModelsVisible(openAIModels)
  ) {
    failures.push("Configured OpenAI models are required but not all visible.");
  }
  if (
    (releaseGate || hasFlag("require-live-completion")) &&
    liveCompletion?.ok !== true
  ) {
    failures.push("Live OpenAI completion is required but did not pass.");
  }
  if (
    (releaseGate || hasFlag("require-server-smoke")) &&
    serverSmokeCompletion?.ok !== true
  ) {
    failures.push(
      "Deployed server-side AI smoke completion is required but did not pass.",
    );
  }

  if (failures.length) {
    result.ok = false;
    result.requiredGateFailures = failures;
  }
}

async function main() {
  const deploymentUrl =
    readArg("deployment-url") ||
    (deploymentRequired() || !envLocalLoadedKeys.has("NURAI_DEPLOYMENT_URL")
      ? process.env.NURAI_DEPLOYMENT_URL
      : undefined);
  const statusUrl = normalizeStatusUrl(readArg("status-url") || deploymentUrl);
  const openAIBaseUrl = (
    readArg("openai-base-url") ||
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ||
    DEFAULT_OPENAI_BASE_URL
  ).replace(/\/$/, "");
  const apiKey =
    readArg("openai-api-key") ||
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY;
  const result = {
    ok: true,
    checks: {
      deploymentStatus: null,
      adminDiagnostics: null,
      openAIModels: null,
      liveCompletion: null,
      serverSmokeCompletion: null,
    },
    notes: [
      "Default checks do not create resources and do not generate text.",
      "Direct OpenAI checks validate the release machine key; the server-side smoke check validates that the deployed runtime can generate through NurAI.",
    ],
  };

  try {
    result.checks.deploymentStatus = await checkDeploymentStatus(statusUrl);
  } catch (error) {
    result.ok = false;
    result.checks.deploymentStatus = { ok: false, error: error.message };
  }

  try {
    result.checks.adminDiagnostics =
      await checkAdminDiagnosticsProtection(statusUrl);
  } catch (error) {
    result.ok = false;
    result.checks.adminDiagnostics = { ok: false, error: error.message };
  }

  try {
    const configuredModels = deployedConfiguredModels(
      result.checks.deploymentStatus,
    );
    result.checks.openAIModels = await checkOpenAIModels({
      apiKey,
      baseUrl: openAIBaseUrl,
      configuredModels,
    });
  } catch (error) {
    result.ok = false;
    result.checks.openAIModels = { ok: false, error: error.message };
  }

  try {
    result.checks.serverSmokeCompletion =
      await checkDeployedServerSmoke(statusUrl);
  } catch (error) {
    result.ok = false;
    result.checks.serverSmokeCompletion = {
      ok: false,
      error: error.message,
    };
  }

  try {
    const deployedModels = deployedConfiguredModels(
      result.checks.deploymentStatus,
    );
    const liveModel =
      readArg("model") ||
      deployedModels[0] ||
      process.env.NURAI_CLOUD_FAST_MODEL ||
      process.env.NURAI_CLOUD_TEXT_MODEL ||
      "gpt-4.1-mini";
    result.checks.liveCompletion = await checkLiveCompletion({
      apiKey,
      baseUrl: openAIBaseUrl,
      model: liveModel,
    });
  } catch (error) {
    result.ok = false;
    result.checks.liveCompletion = { ok: false, error: error.message };
  }

  applyRequiredReleaseGates(result);

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(`OpenAI deployment check failed: ${error.message}`);
  process.exit(1);
});
