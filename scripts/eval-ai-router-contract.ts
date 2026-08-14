import {
  __resetAIProvidersForTesting,
  __setAIProvidersForTesting,
  generateAIText,
} from "../server/ai/router";
import { selectAIModel } from "../server/ai/modelSelector";
import type {
  AIProvider,
  AIProviderHealth,
  AIProviderId,
  AITextRequest,
  AITextResponse,
} from "../server/ai/types";

type FakeResponder = (
  request: AITextRequest,
  callIndex: number,
) => string | Promise<string>;

class FakeProvider implements AIProvider {
  calls: AITextRequest[] = [];

  constructor(
    readonly id: AIProviderId,
    private isConfigured: boolean,
    private responder: FakeResponder,
  ) {}

  configured(): boolean {
    return this.isConfigured;
  }

  async generateText(request: AITextRequest): Promise<AITextResponse> {
    const callIndex = this.calls.length;
    this.calls.push(request);
    const text = await this.responder(request, callIndex);

    return {
      text,
      provider: this.id,
      model:
        request.preferredModel ||
        request.localModel ||
        `${this.id}-contract-model`,
      mode:
        process.env.NURAI_AI_PROVIDER === "local" ||
        process.env.NURAI_AI_PROVIDER === "hybrid"
          ? process.env.NURAI_AI_PROVIDER
          : "openai",
      modelTier: this.id === "local" ? "local" : "balanced",
      complexity: request.complexity || "standard",
      routingReason: [],
      attemptedProviders: [this.id],
      cached: false,
      fallbackUsed: false,
      latencyMs: 1,
      usage: {
        inputTokens: 12,
        outputTokens: Math.max(1, Math.ceil(text.length / 5)),
        totalTokens: 12 + Math.max(1, Math.ceil(text.length / 5)),
      },
    };
  }

  async health(): Promise<AIProviderHealth> {
    return {
      provider: this.id,
      configured: this.isConfigured,
      healthy: this.isConfigured,
      model: `${this.id}-contract-model`,
      checkedAt: new Date(0).toISOString(),
    };
  }
}

const ENV_KEYS = [
  "NURAI_AI_PROVIDER",
  "NURAI_AI_REVIEW_MODE",
  "NURAI_ALLOW_LOCAL_RELIGIOUS_AI",
  "NURAI_ALLOW_LOCAL_SENSITIVE_AI",
  "NURAI_DISABLE_AI_FALLBACK",
  "NURAI_LOCAL_AI_BASE_URL",
  "NURAI_LOCAL_AI_API_KEY",
  "NURAI_LOCAL_TEXT_MODEL",
  "NURAI_LOCAL_AI_MODELS",
] as const;

const CUSTOMER_FACING_BLOCKED_TEXT_PREFIX =
  "I can share the general principle, but I do not have enough verified source context";

function restoreEnv(snapshot: Map<string, string | undefined>) {
  for (const key of ENV_KEYS) {
    const value = snapshot.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function withRouterHarness<T>({
  env,
  openai,
  local,
  run,
}: {
  env: Partial<Record<(typeof ENV_KEYS)[number], string>>;
  openai: FakeProvider;
  local: FakeProvider;
  run: () => Promise<T>;
}): Promise<T> {
  const snapshot = new Map<string, string | undefined>(
    ENV_KEYS.map((key) => [key, process.env[key]]),
  );

  try {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    process.env.NURAI_LOCAL_AI_BASE_URL ||= "https://example.invalid/v1";
    process.env.NURAI_LOCAL_AI_API_KEY ||= "test-local-key";
    process.env.NURAI_LOCAL_TEXT_MODEL ||= "contract-local-model";
    __setAIProvidersForTesting({ openai, local });
    return await run();
  } finally {
    __resetAIProvidersForTesting();
    restoreEnv(snapshot);
  }
}

function expect(condition: unknown, message: string, failures: string[]) {
  if (!condition) failures.push(message);
}

function references(response: AITextResponse): Set<string> {
  return new Set((response.citations || []).map((source) => source.reference));
}

async function main() {
  const failures: string[] = [];

  const sensitiveDefaultLocal = new FakeProvider(
    "local",
    true,
    () => "local should not be used",
  );

  await withRouterHarness({
    env: {
      NURAI_AI_PROVIDER: "hybrid",
      NURAI_AI_REVIEW_MODE: "auto",
      NURAI_ALLOW_LOCAL_RELIGIOUS_AI: "false",
      NURAI_ALLOW_LOCAL_SENSITIVE_AI: "false",
    },
    openai: new FakeProvider(
      "openai",
      true,
      () =>
        "Quran 2:255 and Quran 13:28 are verified source anchors for this answer.",
    ),
    local: new FakeProvider("local", false, () => "unused"),
    run: async () => {
      const response = await generateAIText({
        useCase: "tafsir",
        risk: "religious",
        messages: [
          {
            role: "user",
            content:
              "Explain Quran 2:255 and Quran 13:28 without adding unsupported hadith claims.",
          },
        ],
      });
      const refs = references(response);
      expect(
        response.provider === "openai",
        "verified Quran request must route to OpenAI in hybrid mode",
        failures,
      );
      expect(
        response.sourceCoverage === "verified_context",
        "two exact Quran references must produce verified_context coverage",
        failures,
      );
      expect(
        refs.has("Quran 2:255"),
        "router response must include Quran 2:255 citation",
        failures,
      );
      expect(
        refs.has("Quran 13:28"),
        "router response must include Quran 13:28 citation",
        failures,
      );
      expect(
        response.review?.verdict === "skipped",
        "auto review should skip verified OpenAI answer with verified source context",
        failures,
      );
    },
  });

  const quranReaderOpenAI = new FakeProvider(
    "openai",
    true,
    () =>
      "For Quran 1:3, the selected ayah teaches that Allah is the Most Merciful. The source support here is the selected ayah and its supplied translation, so I will not claim a specific asbab al-nuzul report. A practical step is to begin dua with hope in Allah's mercy.",
  );
  await withRouterHarness({
    env: {
      NURAI_AI_PROVIDER: "openai",
      NURAI_AI_REVIEW_MODE: "auto",
    },
    openai: quranReaderOpenAI,
    local: new FakeProvider("local", false, () => "unused"),
    run: async () => {
      const response = await generateAIText({
        useCase: "contextual",
        risk: "religious",
        messages: [
          {
            role: "user",
            content:
              "The user is reading Surah Al-Fatihah, Ayah 3.\nTranslation: The Most Compassionate, Most Merciful.\nTheir question: Explain Quran 1:3 for a beginner.",
          },
        ],
        metadata: {
          feature: "quran",
          trustedSourceContext: true,
          context: {
            surahNumber: 1,
            surahName: "Al-Fatihah",
            ayahNumber: 3,
            arabicText: "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
            translation: "The Most Compassionate, Most Merciful.",
          },
        },
      });
      const refs = references(response);
      expect(
        response.text.startsWith("For Quran 1:3"),
        "Quran reader answer must keep the actual sourced answer instead of fail-closed fallback",
        failures,
      );
      expect(
        response.sourceCoverage === "verified_context",
        "trusted Quran reader ayah context must produce verified_context coverage",
        failures,
      );
      expect(
        refs.has("Quran 1:3"),
        "trusted Quran reader answer must return the selected ayah citation",
        failures,
      );
      expect(
        response.review?.verdict === "skipped",
        "trusted Quran reader context should not require reviewer fallback when the answer cites the selected ayah",
        failures,
      );
      expect(
        quranReaderOpenAI.calls[0]?.messages.some((message) =>
          message.content.includes("Verified quote/context"),
        ),
        "trusted Quran reader context must inject selected ayah text/translation into the source prompt",
        failures,
      );
    },
  });

  await withRouterHarness({
    env: {
      NURAI_AI_PROVIDER: "hybrid",
      NURAI_AI_REVIEW_MODE: "auto",
      NURAI_ALLOW_LOCAL_SENSITIVE_AI: "false",
    },
    openai: new FakeProvider(
      "openai",
      true,
      () => "Quran 2:286 is the verified source anchor for this answer.",
    ),
    local: sensitiveDefaultLocal,
    run: async () => {
      const request: AITextRequest = {
        useCase: "chat",
        risk: "sensitive",
        messages: [
          {
            role: "user",
            content:
              "Explain Quran 2:286 briefly for anxiety without giving medical or fiqh rulings.",
          },
        ],
      };
      const selection = selectAIModel(request);
      const response = await generateAIText(request);
      expect(
        selection.tier === "deep",
        "sensitive auto request must select the deep cloud tier",
        failures,
      );
      expect(
        response.provider === "openai",
        "sensitive auto request must route to OpenAI when local sensitive AI is disabled",
        failures,
      );
      expect(
        response.modelTier === "deep",
        "sensitive auto response must be marked as deep tier",
        failures,
      );
      expect(
        sensitiveDefaultLocal.calls.length === 0,
        "sensitive auto request must not call the local provider by default",
        failures,
      );
    },
  });

  await withRouterHarness({
    env: {
      NURAI_AI_PROVIDER: "hybrid",
      NURAI_AI_REVIEW_MODE: "auto",
      NURAI_ALLOW_LOCAL_RELIGIOUS_AI: "false",
    },
    openai: new FakeProvider("openai", true, (request) => {
      if (request.useCase === "classification") {
        return JSON.stringify({ verdict: "pass", concerns: [], safeNote: "" });
      }
      return "This is definitely the binding ruling for everyone.";
    }),
    local: new FakeProvider("local", false, () => "unused"),
    run: async () => {
      const response = await generateAIText({
        useCase: "chat",
        risk: "religious",
        messages: [
          {
            role: "user",
            content:
              "Give me a binding fatwa without Quran, hadith, or scholar references.",
          },
        ],
      });
      expect(
        response.sourceCoverage === "needs_source_review",
        "auto religious answer without verified sources must need source review",
        failures,
      );
      expect(
        response.text.startsWith(CUSTOMER_FACING_BLOCKED_TEXT_PREFIX),
        "auto religious answer without verified sources must fail closed",
        failures,
      );
    },
  });

  await withRouterHarness({
    env: {
      NURAI_AI_PROVIDER: "hybrid",
      NURAI_AI_REVIEW_MODE: "auto",
    },
    openai: new FakeProvider("openai", false, () => "unused"),
    local: new FakeProvider(
      "local",
      true,
      () => "Drink water, then do a two-minute reset.",
    ),
    run: async () => {
      const response = await generateAIText({
        useCase: "nudge",
        risk: "low",
        localEligible: true,
        cacheTtlMs: 0,
        messages: [{ role: "user", content: "Give me a tiny study nudge." }],
      });
      expect(
        response.provider === "local",
        "low-risk local eligible nudge must route to local provider first",
        failures,
      );
      expect(
        response.attemptedProviders.join(",") === "local",
        "successful local nudge must not call OpenAI fallback",
        failures,
      );
      expect(
        response.modelTier === "local",
        "local nudge response must be marked as local tier",
        failures,
      );
    },
  });

  await withRouterHarness({
    env: {
      NURAI_AI_PROVIDER: "hybrid",
      NURAI_AI_REVIEW_MODE: "auto",
      NURAI_ALLOW_LOCAL_SENSITIVE_AI: "true",
    },
    openai: new FakeProvider("openai", false, () => "unused"),
    local: new FakeProvider(
      "local",
      true,
      () => "Quran 2:286 is the citation card I am using.",
    ),
    run: async () => {
      const response = await generateAIText({
        useCase: "chat",
        risk: "sensitive",
        modelPreference: "local",
        localEligible: true,
        messages: [
          {
            role: "user",
            content:
              "Explain Quran 2:286 briefly for anxiety without giving medical or fiqh rulings.",
          },
        ],
      });
      expect(
        response.provider === "local",
        "protected local auto-review case should record the local generated provider",
        failures,
      );
      expect(
        response.review?.verdict === "failed",
        "protected local sensitive answer must fail closed when the reviewer is unavailable",
        failures,
      );
      expect(
        response.text.startsWith(CUSTOMER_FACING_BLOCKED_TEXT_PREFIX),
        "protected local sensitive answer must be replaced with blocked text without review",
        failures,
      );
    },
  });

  await withRouterHarness({
    env: {
      NURAI_AI_PROVIDER: "hybrid",
      NURAI_AI_REVIEW_MODE: "strict",
      NURAI_ALLOW_LOCAL_SENSITIVE_AI: "true",
    },
    openai: new FakeProvider("openai", false, () => "unused"),
    local: new FakeProvider("local", true, () => "You can continue as normal."),
    run: async () => {
      const response = await generateAIText({
        useCase: "chat",
        risk: "sensitive",
        modelPreference: "local",
        localEligible: true,
        messages: [
          {
            role: "user",
            content:
              "Does brown bleeding after my period break salah? I need a ruling.",
          },
        ],
      });
      expect(
        response.provider === "local",
        "strict unavailable-review case should still record the first generated provider",
        failures,
      );
      expect(
        response.needsScholar === true,
        "women's health fiqh question must require scholar escalation",
        failures,
      );
      expect(
        response.sourceCoverage === "needs_source_review",
        "keyword-only sensitive fiqh question must need source review",
        failures,
      );
      expect(
        response.review?.verdict === "failed",
        "strict mode must fail review when OpenAI reviewer is unavailable",
        failures,
      );
      expect(
        response.text.startsWith(CUSTOMER_FACING_BLOCKED_TEXT_PREFIX),
        "strict failed review must replace unsafe answer with blocked text",
        failures,
      );
    },
  });

  await withRouterHarness({
    env: {
      NURAI_AI_PROVIDER: "hybrid",
      NURAI_AI_REVIEW_MODE: "strict",
      NURAI_ALLOW_LOCAL_SENSITIVE_AI: "true",
    },
    openai: new FakeProvider("openai", true, (request) => {
      if (request.useCase === "classification") {
        return JSON.stringify({
          verdict: "needs_caution",
          concerns: ["Answer overstates source support."],
          safeNote: "Source support is limited.",
        });
      }
      return "unused cloud answer";
    }),
    local: new FakeProvider(
      "local",
      true,
      () => "This is definitely the ruling for everyone.",
    ),
    run: async () => {
      const response = await generateAIText({
        useCase: "chat",
        risk: "sensitive",
        modelPreference: "local",
        localEligible: true,
        messages: [
          {
            role: "user",
            content:
              "Give me a fiqh ruling for istihadha and salah without asking follow-up questions.",
          },
        ],
      });
      expect(
        response.review?.performed === true,
        "strict important answer must run second-model review when reviewer is configured",
        failures,
      );
      expect(
        response.review?.verdict === "needs_caution",
        "reviewer needs_caution verdict must be preserved",
        failures,
      );
      expect(
        response.text.startsWith(CUSTOMER_FACING_BLOCKED_TEXT_PREFIX) &&
          !response.text.includes("Source support is limited."),
        "strict needs_caution review must block with customer-facing guidance",
        failures,
      );
    },
  });

  await withRouterHarness({
    env: {
      NURAI_AI_PROVIDER: "hybrid",
      NURAI_AI_REVIEW_MODE: "strict",
      NURAI_ALLOW_LOCAL_SENSITIVE_AI: "true",
    },
    openai: new FakeProvider("openai", true, (request) => {
      if (request.useCase === "classification") {
        return JSON.stringify({ verdict: "pass", concerns: [], safeNote: "" });
      }
      return "unused cloud answer";
    }),
    local: new FakeProvider(
      "local",
      true,
      () => "Quran 2:286 is the citation card I am using.",
    ),
    run: async () => {
      const response = await generateAIText({
        useCase: "chat",
        risk: "sensitive",
        modelPreference: "local",
        localEligible: true,
        messages: [
          {
            role: "user",
            content:
              "Explain Quran 2:286 briefly for anxiety without giving medical or fiqh rulings.",
          },
        ],
      });
      expect(
        response.review?.performed === true,
        "strict sensitive local answer with source card must be reviewed",
        failures,
      );
      expect(
        response.review?.verdict === "pass",
        "pass reviewer verdict must be preserved",
        failures,
      );
      expect(
        response.text === "Quran 2:286 is the citation card I am using.",
        "strict pass review must keep original answer text",
        failures,
      );
      expect(
        response.citations?.some(
          (source) => source.reference === "Quran 2:286",
        ),
        "strict pass case must keep source citations",
        failures,
      );
    },
  });

  if (failures.length) {
    console.error("AI router contract eval failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("AI router contract eval passed.");
  console.log(
    "Covered: OpenAI routing for verified Quran context, deep cloud routing for sensitive auto requests, auto source fail-closed behavior, local routing for low-risk nudges, protected local review fail-closed behavior, strict review fail-closed behavior, needs_caution blocking, and strict review pass-through.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
