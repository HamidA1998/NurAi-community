#!/usr/bin/env node

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

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  return fallback;
}

function readIntArg(name, fallback) {
  const value = readArg(name);
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`--${name} must be an integer.`);
  }
  return parsed;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function buildPayload() {
  const templateId = readArg("template-id", "RUNPOD_VLLM_TEMPLATE_ID");
  const model = readArg("model", DEFAULTS.model);
  const servedModelName = readArg("served-model-name", model);
  const dataCenterIds = readArg("data-center-ids");
  const networkVolumeIds = readArg("network-volume-ids");
  const hfTokenSecret = readArg("hf-token-secret");

  const env = {
    MODEL_NAME: model,
    MAX_MODEL_LEN: String(readIntArg("max-model-len", DEFAULTS.maxModelLen)),
    RAW_OPENAI_OUTPUT: "1",
    OPENAI_SERVED_MODEL_NAME_OVERRIDE: servedModelName,
  };

  if (hfTokenSecret) env.HF_TOKEN = hfTokenSecret;

  const templatePayload = {
    name: readArg("template-name", DEFAULTS.templateName),
    imageName: readArg("image", DEFAULTS.imageName),
    category: "NVIDIA",
    isPublic: false,
    isServerless: true,
    containerDiskInGb: readIntArg("container-disk-gb", 80),
    env,
  };

  const payload = {
    templateId,
    name: readArg("name", DEFAULTS.name),
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
  };

  if (dataCenterIds) {
    payload.dataCenterIds = dataCenterIds
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (networkVolumeIds) {
    payload.networkVolumeIds = networkVolumeIds
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return {
    templatePayload,
    payload,
    servedModelName,
  };
}

function main() {
  const { templatePayload, payload, servedModelName } = buildPayload();
  const templateBody = JSON.stringify(templatePayload, null, 2);
  const compactTemplateBody = JSON.stringify(templatePayload);
  const body = JSON.stringify(payload, null, 2);
  const compactBody = JSON.stringify(payload);
  const templateCurl = [
    "curl --request POST",
    "--url https://rest.runpod.io/v1/templates",
    '--header "Authorization: Bearer $RUNPOD_API_KEY"',
    '--header "Content-Type: application/json"',
    `--data ${shellQuote(compactTemplateBody)}`,
  ].join(" \\\n  ");
  const endpointCurl = [
    "curl --request POST",
    "--url https://rest.runpod.io/v1/endpoints",
    '--header "Authorization: Bearer $RUNPOD_API_KEY"',
    '--header "Content-Type: application/json"',
    `--data ${shellQuote(compactBody)}`,
  ].join(" \\\n  ");

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: true,
        willCreatePaidResource: false,
        warning:
          "This script does not call RunPod. Review billing, template/image/model/GPU/worker counts before using the cURL. Env vars belong on the template; the endpoint points at the template.",
        templatePayload,
        endpointPayload: payload,
        templateCurl,
        endpointCurl,
        createScript:
          "npm run create:runpod-ai -- --yes --model " + servedModelName,
        afterCreation: {
          baseUrl:
            "https://api.runpod.ai/v2/ENDPOINT_ID_FROM_RESPONSE/openai/v1",
          configureNurAI: `RUNPOD_API_KEY=... node scripts/configure-runpod-local-ai.js ENDPOINT_ID_FROM_RESPONSE ${servedModelName}`,
          verifyRunPod:
            "NURAI_LOCAL_AI_BASE_URL=https://api.runpod.ai/v2/ENDPOINT_ID_FROM_RESPONSE/openai/v1 NURAI_LOCAL_AI_API_KEY=... NURAI_LOCAL_TEXT_MODEL=" +
            servedModelName +
            " node scripts/check-local-ai.js",
        },
        templatePayloadJson: templateBody,
        payloadJson: body,
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  console.error(`RunPod endpoint plan failed: ${error.message}`);
  process.exit(1);
}
