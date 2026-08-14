# NurAI Remote Local AI Server

This runs an open-weight model on a remote server instead of your Mac. NurAI still calls it as the `local` provider through an OpenAI-compatible API.

## Recommended Shape

```text
NurAI backend
  -> HTTPS/private network
  -> auth-proxy:8080
  -> Ollama:11434
  -> gemma3:4b or another open model
```

Do not expose Ollama port `11434` directly to the public internet. The included proxy requires `Authorization: Bearer <NURAI_LOCAL_AI_API_KEY>`.

## Where To Host

Good options:

- GPU VM or pod: easiest for always-on inference.
- Serverless GPU: cheaper when traffic is spiky, but cold starts can hurt UX.
- Your own dedicated server: most control, more ops work.

For production quality and higher traffic, vLLM on a GPU server is usually faster than Ollama. For first launch, Ollama is simpler and works with our router today.

## Deploy

1. Provision a remote Linux server.
2. Install Docker and Docker Compose.
3. Copy this folder to the server.
4. Create `.env`:

```bash
cp .env.example .env
openssl rand -base64 48
```

Put that secret into `NURAI_LOCAL_AI_API_KEY`.
Keep `OLLAMA_UPSTREAM_URL=http://ollama:11434` unless you are proxying to a
different private Ollama host from the same Docker network.

5. Start the services:

```bash
docker compose up -d
```

6. Pull the model:

```bash
docker compose exec ollama ollama pull gemma3:4b
```

7. Test the remote endpoint:

```bash
curl http://YOUR_SERVER_IP:8080/v1/models \
  -H "Authorization: Bearer YOUR_SECRET"
```

## NurAI Backend Env

Set these on the backend server that runs NurAI:

```bash
NURAI_AI_PROVIDER=hybrid
NURAI_LOCAL_AI_BASE_URL=http://YOUR_SERVER_IP:8080/v1
NURAI_LOCAL_AI_API_KEY=YOUR_SECRET
NURAI_LOCAL_TEXT_MODEL=gemma3:4b
NURAI_LOCAL_AI_MODELS=remote-gemma3|http://YOUR_SERVER_IP:8080/v1|gemma3:4b|general,summary,utility|true
```

For real production, put the proxy behind HTTPS or keep it on a private network/VPC.

## Smoke Test From NurAI Repo

```bash
NURAI_LOCAL_AI_BASE_URL=http://YOUR_SERVER_IP:8080/v1 \
NURAI_LOCAL_AI_API_KEY=YOUR_SECRET \
NURAI_LOCAL_TEXT_MODEL=gemma3:4b \
npm run check:local-ai
```
