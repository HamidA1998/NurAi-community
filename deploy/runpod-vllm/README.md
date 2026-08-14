# NurAI RunPod vLLM Setup

This is the recommended hosted "local model" path for NurAI when you do not want your Mac running inference.

RunPod vLLM endpoints expose an OpenAI-compatible API:

```text
https://api.runpod.ai/v2/ENDPOINT_ID/openai/v1
```

NurAI can use that directly as `NURAI_LOCAL_AI_BASE_URL`.

## Recommended First Model

Use a non-gated, vLLM-compatible model first:

```text
Qwen/Qwen3-8B
```

Why this instead of the Ollama tag `gemma3:4b`:

- RunPod vLLM pulls from Hugging Face model IDs, not Ollama tags.
- Qwen3 8B is easy to deploy and strong for local-tier summaries, routing, and utility tasks.
- We still keep OpenAI as balanced/deep fallback for complex Islamic answers.

If you specifically want Gemma, use a Hugging Face Gemma model ID supported by vLLM and provide any required Hugging Face token if the model is gated.

## Deploy In RunPod UI

1. Create/log into a RunPod account.
2. Create an API key.
3. Go to Serverless -> vLLM.
4. Deploy the vLLM worker.
5. Model: `Qwen/Qwen3-8B`.
6. GPU: start with `NVIDIA L4` or `NVIDIA RTX A5000` for lower cost; use `RTX 4090`/`L40S` for better latency.
7. Workers min: `0` for lowest cost, `1` for less cold start.
8. Max model length: start at `8192`.
9. Create endpoint and copy the endpoint ID.

RunPod's OpenAI-compatible base URL is:

```text
https://api.runpod.ai/v2/ENDPOINT_ID/openai/v1
```

This URL shape is from RunPod's official vLLM OpenAI compatibility docs. The docs also confirm that the API key for this OpenAI-compatible URL is the RunPod API key, not a separate model key.

## Prepare A Dedicated Endpoint Payload

To prepare an exact template + endpoint payload and cURL command without sending it:

```bash
node scripts/prepare-runpod-vllm-endpoint.js \
  --name nurai-vllm-qwen3-8b \
  --template-id RUNPOD_VLLM_TEMPLATE_ID \
  --model Qwen/Qwen3-8B \
  --gpu "NVIDIA L4" \
  --workers-min 0 \
  --workers-max 1 \
  --max-model-len 8192
```

The script prints:

- a RunPod `POST /v1/templates` JSON body,
- a RunPod `POST /v1/endpoints` JSON body,
- a ready-to-review cURL command,
- the NurAI configuration command to run after the endpoint exists,
- the verification command for the OpenAI-compatible RunPod URL.

To create the private template and endpoint from this repo after billing is ready:

```bash
npm run create:runpod-ai -- --yes \
  --model Qwen/Qwen3-8B \
  --gpu "NVIDIA L4" \
  --workers-min 0 \
  --workers-max 1
```

The create script uses `workersMin=0` by default. RunPod documents that nonzero minimum workers stay running and are charged. RunPod also requires at least `$0.01` account balance before endpoint creation is allowed.

Important manual confirmations before you paste the cURL:

- Confirm billing is enabled and you accept the GPU/worker cost.
- Confirm the vLLM template ID from the RunPod Hub/UI. The RunPod endpoint API requires `templateId`; the public docs show the field but do not publish a stable NurAI-specific template ID.
- Keep `workersMin=0` for lowest idle cost. RunPod documents that nonzero minimum workers stay running and are charged.
- For gated/private Hugging Face models, create/confirm the Hugging Face token secret in RunPod and pass the secret reference with `--hf-token-secret`.

Optional payload flags:

```bash
node scripts/prepare-runpod-vllm-endpoint.js \
  --template-id RUNPOD_VLLM_TEMPLATE_ID \
  --model google/gemma-3-1b-it \
  --served-model-name google/gemma-3-1b-it \
  --gpu "NVIDIA RTX A5000" \
  --data-center-ids US-KS-2,US-GA-1 \
  --network-volume-ids YOUR_VOLUME_ID \
  --hf-token-secret "{{ RUNPOD_SECRET_hf_token }}"
```

`--served-model-name` maps to `OPENAI_SERVED_MODEL_NAME_OVERRIDE`, which RunPod documents as the model ID exposed by `/v1/models` and accepted in OpenAI-compatible chat requests.

## Fastest No-Deploy Option

If you want it running immediately before creating your own endpoint, use RunPod's public Qwen3 32B AWQ endpoint:

```bash
RUNPOD_API_KEY=your-key npm run configure:runpod-ai -- qwen3-32b-awq
npm run check:local-ai -- --all-enabled
```

That sets:

```text
NURAI_LOCAL_AI_BASE_URL=https://api.runpod.ai/v2/qwen3-32b-awq/openai/v1
NURAI_LOCAL_TEXT_MODEL=Qwen/Qwen3-32B-AWQ
```

This is fastest, but less owned than a dedicated vLLM endpoint. Use it as an immediate bridge, then move to your own endpoint when ready.

## Configure NurAI

After you have the endpoint ID and API key:

```bash
node scripts/configure-runpod-local-ai.js ENDPOINT_ID
```

The script accepts the key from `RUNPOD_API_KEY`, `RUNPOD_SECRET_nurai`, or `NURAI_LOCAL_AI_API_KEY`. If you store a platform secret reference such as `{{ RUNPOD_SECRET_nurai }}` in `.env.local`, make sure the production runtime resolves it to the real RunPod API key before running verification.

Or set the environment variables directly:

```bash
NURAI_AI_PROVIDER=hybrid
NURAI_LOCAL_AI_BASE_URL=https://api.runpod.ai/v2/ENDPOINT_ID/openai/v1
NURAI_LOCAL_AI_API_KEY=YOUR_RUNPOD_API_KEY
NURAI_LOCAL_TEXT_MODEL=Qwen/Qwen3-8B
```

## Verify

```bash
NURAI_LOCAL_AI_BASE_URL=https://api.runpod.ai/v2/ENDPOINT_ID/openai/v1 \
NURAI_LOCAL_AI_API_KEY=YOUR_RUNPOD_API_KEY \
NURAI_LOCAL_TEXT_MODEL=Qwen/Qwen3-8B \
npm run check:local-ai -- --all-enabled
```

For a dedicated endpoint, avoid the public pool in production once your endpoint is verified:

```bash
RUNPOD_API_KEY=your-key node scripts/configure-runpod-local-ai.js ENDPOINT_ID Qwen/Qwen3-8B
node scripts/check-local-ai.js --all-enabled
```

## Production Safety

Keep these defaults:

```bash
NURAI_ALLOW_LOCAL_RELIGIOUS_AI=false
NURAI_ALLOW_LOCAL_SENSITIVE_AI=false
```

That means the hosted open model handles cheap/simple eligible tasks, while OpenAI remains available for complex religious, tafsir, fiqh, and sensitive answers until the source-backed retrieval layer is complete.

## What Is Safe To Automate

Safe in this repo:

- Build a RunPod endpoint payload.
- Check a created endpoint's OpenAI-compatible `/models` route with `scripts/check-local-ai.js`.
- Write `.env.local` values for an endpoint you already created.
- Create a private vLLM template. Templates do not start GPU workers.
- Create a serverless endpoint with `workersMin=0` after billing is ready.

Still not automated here:

- Creating network volumes, because they are paid/persistent resources.
- Selecting/accepting account billing, GPU availability, or gated Hugging Face model access.

## Official References Checked

- RunPod vLLM OpenAI compatibility: `https://docs.runpod.io/serverless/vllm/openai-compatibility`
- RunPod vLLM deployment guide: `https://docs.runpod.io/serverless/vllm/get-started`
- RunPod vLLM environment variables: `https://docs.runpod.io/serverless/vllm/environment-variables`
- RunPod endpoint creation API: `https://docs.runpod.io/api-reference/endpoints/POST/endpoints`
