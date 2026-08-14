# NurAI AI Cost and Rate Controls

This folder owns shared AI request controls without changing provider routing.
The same durable rate-limit bucket helper is also used by auth, Places, and
family user search routes.

## Durable AI Short-Window Limiter

Use `enforceAITextRateLimit` for a per-user/IP guard before calling
`generateAIText`. The high-cost AI routes use a Postgres-backed bucket table so
multiple server instances share the same short-window cost-control state. Auth,
username availability, family user search, and Places routes use the same
`durableRateLimiter` helper directly.

```ts
import { enforceAITextRateLimit } from "../../ai/httpControls";

const rateLimit = await enforceAITextRateLimit(req, res);
if (!rateLimit) return;
```

The bucket schema is `rate_limit_buckets`, created by
`migrations/0003_ai_rate_limit_buckets.sql`. This short-window limiter is still
paired with the durable daily quota checks; it is not a replacement for
subscription entitlements or per-plan daily limits.

## Paid AI Feature Quotas

Tafsir and image generation have separate monthly paid-feature quotas because
they are higher-cost routes. `server/ai/featureQuota.ts` enforces the daily and
monthly counters in a single database transaction, so a request must reserve
both counters before provider work starts.

The monthly schema is `ai_feature_usage`, created by
`migrations/0005_ai_feature_usage_monthly_quotas.sql`. The current monthly
limits are:

- Tafsir AI: Scholar-only, 2500/month
- Image generation: 100/month for Premium, 300/month for Scholar

Monthly quota responses expose `X-AI-MonthlyLimit-*` headers alongside the
existing daily limit headers.

## Usage logging

Use `createAIUsageEvent` and `logAIUsageEvent` around AI calls to emit a stable
token/latency event shape.

```ts
const startedAt = Date.now();

try {
  const response = await generateAIText(request);
  logAIUsageEvent(
    createAIUsageEvent({ request, response, requester, rateLimit, startedAt }),
  );
} catch (error) {
  logAIUsageEvent(
    createAIUsageEvent({ request, requester, rateLimit, startedAt, error }),
  );
  throw error;
}
```

Provider token usage is passed through when OpenAI-compatible providers return
usage fields. If a provider omits usage, successful responses fall back to a
rough text-length estimate so cost dashboards still have a consistent shape.

Local OpenAI-compatible models are given a no-reasoning guard, and visible
`<think>` blocks are stripped before the response is returned. Empty assistant
text is treated as a provider failure so another configured model can be tried.

Set `AI_USAGE_LOGGING=false` only when a runtime explicitly needs to silence AI
usage events. The release default is to keep logging enabled so provider,
latency, fallback, and estimated token usage are visible.

## AI usage log retention

AI usage events are operational logs, not chat transcripts. `server/ai/usage.ts`
does not log raw prompts, raw responses, raw user ids, or raw IP addresses. Each
event includes a `retainUntil` timestamp based on `AI_USAGE_LOG_RETENTION_DAYS`
so the deployment log sink can delete or expire these structured events after
30 days.

Daily quota counters in the `ai_usage` table are separate from provider logs.
`server/ai/dailyQuota.ts` keeps `AI_USAGE_COUNTER_RETENTION_DAYS` at 45 days and
prunes older rows on a low-frequency, fail-open path before metering daily AI
usage. This preserves enough recent quota history for operations while avoiding
unbounded per-user counter retention.

## Legacy Wired Routes

The shared durable limiter and usage logger were built for these legacy AI
routes:

- `POST /api/conversations/:id/messages`
- `POST /api/conversations/:id/audio-messages`
- `POST /api/nurai/ask`
- `POST /api/tafsir`
- `POST /api/audio/tts`
- `POST /api/generate-image`

After the Personal AI reset, the generation routes are not registered from
`server/routes.ts`. Keep them quarantined until the new single Personal AI
pipeline reuses the controls deliberately.

## Active Personal AI Route

`POST /api/personal-ai/respond` is the new Phase 2 Personal AI pipeline. It is
registered from `server/routes.ts` through `registerPersonalAIRoutes(app)`.

The route:

- requires an authenticated user
- resolves the subscription tier server-side
- checks requested AI mode access before consuming quota
- applies daily quota and short-window AI rate limits
- builds the safe `MuslimGrowthProfile` context
- routes through source/trust guarded model generation
- returns structured trust/source/action fields for the future card UI

It does not store raw chat transcripts or register the legacy chat/contextual
AI screens.

## Status and Diagnostics

`GET /api/ai/status` is safe for release checks and public app health views. It
redacts local provider URLs and detailed provider errors while still reporting
whether cloud/local AI is configured and healthy. It also reports the non-secret
OpenAI key source name so the deployed release gate can prove production is using
`AI_INTEGRATIONS_OPENAI_API_KEY` instead of relying on a local/tooling alias.

`GET /api/admin/ai/diagnostics` is the richer operator view. It requires an
authenticated user whose email is present in the server-only `NURAI_ADMIN_EMAILS`
allowlist, then returns raw provider health, local model base URLs, and detailed
health errors. It never returns API key values.

## Source Grounding and Review

Religious, sensitive, chat, contextual, and tafsir requests are source-grounded
before routing. The grounding layer attaches verified Quran.com and Sunnah.com
source cards where NurAI has a safe match, and tells the model to avoid quoting
or inventing unsupported references.

High-importance answers can run a lightweight review pass when
`NURAI_AI_REVIEW_MODE` is `auto` or `strict`. The review is skipped for ordinary
low-risk answers and, in `auto` mode, for cloud answers that already have
verified source coverage. Sensitive auto-routed requests use the deep cloud tier
by default. If a protected local religious/sensitive lane is explicitly enabled,
it must pass OpenAI review before returning; without that reviewer, it fails
closed. In `strict` mode, all important religious/sensitive answers fail closed
if review is required but cannot pass.
