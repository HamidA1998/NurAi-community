#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const positionalArgs = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith("--"));
const endpointId = positionalArgs[0] || process.env.RUNPOD_ENDPOINT_ID;
const allowPublicPool =
  process.argv.includes("--allow-public-pool") ||
  process.env.NURAI_ALLOW_RUNPOD_PUBLIC_POOL === "true";
const apiKey =
  process.env.RUNPOD_API_KEY ||
  process.env.RUNPOD_SECRET_nurai ||
  process.env.NURAI_LOCAL_AI_API_KEY;

const RUNPOD_PUBLIC_TEXT_MODELS = [
  {
    id: "runpod-qwen3-32b-awq",
    endpointId: "qwen3-32b-awq",
    model: "Qwen/Qwen3-32B-AWQ",
    roles: "general,fast,multilingual,code",
    defaultEnabled: false,
  },
  {
    id: "runpod-granite-4-0-h-small",
    endpointId: "granite-4-0-h-small",
    model: "ibm-granite/granite-4.0-h-small",
    roles: "general,long-context,safe-instruct",
    defaultEnabled: false,
  },
  {
    id: "runpod-gpt-oss-120b",
    endpointId: "gpt-oss-120b",
    model: "openai/gpt-oss-120b",
    roles: "deep,tool-calling,experimental",
    defaultEnabled: false,
  },
];

function defaultModelForEndpoint(id) {
  const publicModel = RUNPOD_PUBLIC_TEXT_MODELS.find(
    (candidate) => candidate.endpointId === id,
  );
  if (publicModel) return publicModel.model;
  return "Qwen/Qwen3-8B";
}

function hasKnownEndpointModel(id) {
  return RUNPOD_PUBLIC_TEXT_MODELS.some(
    (candidate) => candidate.endpointId === id,
  );
}

const explicitModel =
  positionalArgs[1] || process.env.RUNPOD_MODEL || process.env.RUNPOD_MODEL_ID;
const model =
  explicitModel ||
  (hasKnownEndpointModel(endpointId)
    ? defaultModelForEndpoint(endpointId)
    : process.env.NURAI_LOCAL_TEXT_MODEL ||
      defaultModelForEndpoint(endpointId));

if (!endpointId) {
  console.error(
    "Usage: RUNPOD_API_KEY=... node scripts/configure-runpod-local-ai.js ENDPOINT_ID",
  );
  console.error("Missing ENDPOINT_ID.");
  process.exit(1);
}

if (!apiKey) {
  console.error(
    "Missing RUNPOD_API_KEY, RUNPOD_SECRET_nurai, or NURAI_LOCAL_AI_API_KEY.",
  );
  process.exit(1);
}

if (hasKnownEndpointModel(endpointId) && !allowPublicPool) {
  console.error(
    [
      `Refusing to configure RunPod public pool '${endpointId}' as the active local AI endpoint.`,
      "Production requires an owned endpoint visible in your RunPod account.",
      "For temporary development-only testing, rerun with --allow-public-pool or NURAI_ALLOW_RUNPOD_PUBLIC_POOL=true.",
    ].join("\n"),
  );
  process.exit(1);
}

const envPath = path.resolve(process.cwd(), ".env.local");
const baseUrl = `https://api.runpod.ai/v2/${endpointId}/openai/v1`;
const publicPool = RUNPOD_PUBLIC_TEXT_MODELS.map((candidate) => {
  const enabled =
    candidate.defaultEnabled || candidate.endpointId === endpointId;
  return `${candidate.id}|https://api.runpod.ai/v2/${candidate.endpointId}/openai/v1|${candidate.model}|${candidate.roles}|${enabled ? "true" : "false"}`;
}).join(";");
const customPool = `runpod-dedicated-${endpointId}|${baseUrl}|${model}|general,fast,owned|true`;

const nextValues = {
  NURAI_AI_PROVIDER: "hybrid",
  NURAI_LOCAL_AI_BASE_URL: baseUrl,
  NURAI_LOCAL_AI_API_KEY: apiKey,
  NURAI_LOCAL_TEXT_MODEL: model,
  NURAI_LOCAL_AI_MODELS: hasKnownEndpointModel(endpointId)
    ? publicPool
    : customPool,
  NURAI_LOCAL_AI_TIMEOUT_MS: "60000",
  NURAI_ALLOW_LOCAL_RELIGIOUS_AI: "false",
  NURAI_ALLOW_LOCAL_SENSITIVE_AI: "false",
};

function formatEnvValue(value) {
  if (/^[A-Za-z0-9_./:@-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function looksLikeSecretReference(value) {
  return /^{{\s*[A-Za-z_][A-Za-z0-9_]*\s*}}$/.test(value.trim());
}

function parseEnv(content) {
  const lines = content.split(/\r?\n/);
  const seen = new Set();
  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!match) return line;
    const key = match[1];
    if (!(key in nextValues)) return line;
    seen.add(key);
    return `${key}=${formatEnvValue(nextValues[key])}`;
  });

  for (const [key, value] of Object.entries(nextValues)) {
    if (!seen.has(key)) nextLines.push(`${key}=${formatEnvValue(value)}`);
  }

  return (
    nextLines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}

const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
fs.writeFileSync(envPath, parseEnv(current));

console.log("Configured NurAI RunPod local AI in .env.local");
console.log(
  JSON.stringify(
    {
      baseUrl,
      model,
      provider: "hybrid",
      publicPool: hasKnownEndpointModel(endpointId),
      productionOwnedEndpoint: !hasKnownEndpointModel(endpointId),
    },
    null,
    2,
  ),
);
if (looksLikeSecretReference(apiKey)) {
  console.warn(
    "Warning: the RunPod API key is a secret reference, not a resolved key. Configure that secret in the runtime before verification.",
  );
}
