#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const DEFAULTS = {
  name: "nurai-vllm-qwen3-8b",
  templateName: "nurai-vllm-worker-qwen3-8b",
  imageName: "runpod/worker-v1-vllm:0.19.1",
  model: "Qwen/Qwen3-8B",
  gpu: "NVIDIA L4",
  workersMin: 0,
  workersMax: 1,
  maxModelLen: 8192,
  idleTimeout: 5,
  scalerType: "QUEUE_DELAY",
  scalerValue: 4,
  executionTimeoutMs: 600000,
};
const setupState = {
  endpointCreated: false,
  endpointId: undefined,
};

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function readIntArg(name, fallback) {
  const value = readArg(name);
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed))
    throw new Error(`--${name} must be an integer.`);
  return parsed;
}

function readLocalEnv(name) {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return undefined;
  const content = fs.readFileSync(envPath, "utf8");
  const match = content.match(new RegExp(`^${name}=([\\s\\S]*?)$`, "m"));
  if (!match) return undefined;
  return match[1].replace(/^['"]|['"]$/g, "").trim();
}

function apiKey() {
  return (
    process.env.RUNPOD_API_KEY ||
    process.env.RUNPOD_SECRET_nurai ||
    process.env.NURAI_LOCAL_AI_API_KEY ||
    readLocalEnv("NURAI_LOCAL_AI_API_KEY")
  );
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function runpodFetch(route, options = {}) {
  const key = apiKey();
  if (!key) {
    throw new Error(
      "Missing RUNPOD_API_KEY, RUNPOD_SECRET_nurai, or NURAI_LOCAL_AI_API_KEY.",
    );
  }

  const response = await fetch(`https://rest.runpod.io/v1${route}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const message = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }
  return data;
}

function templatePayload() {
  const model = readArg("model", DEFAULTS.model);
  const servedModelName = readArg("served-model-name", model);
  const hfTokenSecret = readArg("hf-token-secret");
  const env = {
    MODEL_NAME: model,
    MAX_MODEL_LEN: String(readIntArg("max-model-len", DEFAULTS.maxModelLen)),
    RAW_OPENAI_OUTPUT: "1",
    OPENAI_SERVED_MODEL_NAME_OVERRIDE: servedModelName,
  };
  if (hfTokenSecret) env.HF_TOKEN = hfTokenSecret;

  return {
    name: readArg("template-name", `${DEFAULTS.templateName}-${slug(model)}`),
    imageName: readArg("image", DEFAULTS.imageName),
    category: "NVIDIA",
    isPublic: false,
    isServerless: true,
    containerDiskInGb: readIntArg("container-disk-gb", 80),
    env,
    readme:
      "NurAI dedicated RunPod vLLM worker template. Created by scripts/create-runpod-vllm-endpoint.js.",
  };
}

function endpointPayload(templateId) {
  return {
    templateId,
    name: readArg("name", `${DEFAULTS.name}-${Date.now()}`),
    computeType: "GPU",
    gpuTypeIds: [readArg("gpu", DEFAULTS.gpu)],
    gpuCount: readIntArg("gpu-count", 1),
    workersMin: readIntArg("workers-min", DEFAULTS.workersMin),
    workersMax: readIntArg("workers-max", DEFAULTS.workersMax),
    idleTimeout: readIntArg("idle-timeout", DEFAULTS.idleTimeout),
    scalerType: readArg("scaler-type", DEFAULTS.scalerType),
    scalerValue: readIntArg("scaler-value", DEFAULTS.scalerValue),
    executionTimeoutMs: readIntArg(
      "execution-timeout-ms",
      DEFAULTS.executionTimeoutMs,
    ),
    flashboot: true,
  };
}

async function findTemplateByName(name) {
  const templates = await runpodFetch(
    "/templates?includeEndpointBoundTemplates=true",
  );
  const list = Array.isArray(templates)
    ? templates
    : templates.templates || templates.data || [];
  return list.find((template) => template.name === name);
}

function configureNurAI(endpointId, model) {
  const result = spawnSync(
    process.execPath,
    ["scripts/configure-runpod-local-ai.js", endpointId, model],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        RUNPOD_API_KEY: apiKey(),
      },
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "NurAI config failed.");
  }
}

function sanitizeErrorMessage(message) {
  return String(message || "Unknown error.")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [REDACTED]")
    .replace(/\brpa_[A-Za-z0-9]+/g, "rpa_[REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]+/g, "sk-[REDACTED]");
}

function isRunPodBalanceError(message) {
  return (
    /\$0\.01/i.test(message) ||
    /account balance/i.test(message) ||
    /insufficient balance/i.test(message) ||
    /402\s+payment required/i.test(message)
  );
}

function statusHint(message) {
  const match = String(message).match(/\b(\d{3})\s+([A-Za-z][^:]+):/);
  if (!match) return undefined;
  return `${match[1]} ${match[2].trim()}`;
}

function runpodCreateFailure(error, state = setupState) {
  const sanitizedMessage = sanitizeErrorMessage(error?.message);
  if (isRunPodBalanceError(sanitizedMessage)) {
    return {
      ok: false,
      created: false,
      blocked: true,
      blocker: "runpod-balance",
      safeMessage:
        "RunPod account balance is too low to create a dedicated endpoint.",
      ownerAction: [
        "Add RunPod credit until the account balance is at least $0.01.",
        'Re-run: npm run create:runpod-ai -- --yes --model Qwen/Qwen3-8B --gpu "NVIDIA L4" --workers-min 0 --workers-max 1',
        "Then run: npm run check:local-ai -- --all-enabled",
        "Then run: npm run check:release-blockers",
      ],
      statusHint: statusHint(sanitizedMessage),
    };
  }

  if (state.endpointCreated) {
    return {
      ok: false,
      created: true,
      blocked: true,
      blocker: "nurai-runpod-config-failed",
      safeMessage:
        "RunPod endpoint was created, but NurAI local AI configuration failed.",
      ownerAction: [
        "Check the endpoint in the RunPod Serverless dashboard before retrying so duplicate paid endpoints are not created.",
        "Configure the returned owned /openai/v1 endpoint in NURAI_LOCAL_AI_BASE_URL and NURAI_LOCAL_AI_MODELS.",
        "Run npm run check:local-ai -- --all-enabled and npm run check:release-blockers.",
      ],
      endpoint: state.endpointId ? { id: state.endpointId } : undefined,
      errorMessage: sanitizedMessage,
    };
  }

  return {
    ok: false,
    created: false,
    blocked: true,
    blocker: "runpod-create-failed",
    safeMessage: "RunPod endpoint creation failed.",
    ownerAction: [
      "Review the sanitized error message below.",
      "Fix the RunPod account, template, GPU, or API-key issue.",
      "Re-run npm run create:runpod-ai with --yes after the issue is fixed.",
    ],
    statusHint: statusHint(sanitizedMessage),
    errorMessage: sanitizedMessage,
  };
}

async function main() {
  const model = readArg("model", DEFAULTS.model);
  const servedModelName = readArg("served-model-name", model);
  const providedTemplateId = readArg("template-id");
  const template = templatePayload();
  const dryRun = !hasFlag("yes");

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          willCreatePaidResource: false,
          warning:
            "Pass --yes to create the private template and serverless endpoint. workersMin defaults to 0.",
          template: providedTemplateId ? { id: providedTemplateId } : template,
          endpoint: endpointPayload(providedTemplateId || "TEMPLATE_ID"),
        },
        null,
        2,
      ),
    );
    return;
  }

  let templateId = providedTemplateId;
  let createdTemplate = null;
  if (!templateId) {
    const existingTemplate = await findTemplateByName(template.name);
    if (existingTemplate) {
      templateId = existingTemplate.id;
    } else {
      createdTemplate = await runpodFetch("/templates", {
        method: "POST",
        body: JSON.stringify(template),
      });
      templateId = createdTemplate.id;
    }
  }

  const endpoint = await runpodFetch("/endpoints", {
    method: "POST",
    body: JSON.stringify(endpointPayload(templateId)),
  });
  const endpointId = endpoint.id || endpoint.endpointId;
  if (!endpointId) {
    throw new Error(
      `RunPod did not return an endpoint ID: ${JSON.stringify(endpoint)}`,
    );
  }
  setupState.endpointCreated = true;
  setupState.endpointId = endpointId;

  configureNurAI(endpointId, servedModelName);

  console.log(
    JSON.stringify(
      {
        ok: true,
        template: {
          id: templateId,
          created: Boolean(createdTemplate),
          name: createdTemplate?.name || template.name,
          imageName: createdTemplate?.imageName || template.imageName,
        },
        endpoint: {
          id: endpointId,
          name: endpoint.name,
          workersMin:
            endpoint.workersMin ?? endpointPayload(templateId).workersMin,
          workersMax:
            endpoint.workersMax ?? endpointPayload(templateId).workersMax,
        },
        nurai: {
          baseUrl: `https://api.runpod.ai/v2/${endpointId}/openai/v1`,
          model: servedModelName,
          configured: true,
        },
        note: "Endpoint created with workersMin=0 by default. First verification request may cold-start a GPU and can take several minutes.",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  process.stdout.write(
    `${JSON.stringify(runpodCreateFailure(error), null, 2)}\n`,
  );
  process.exit(1);
});
