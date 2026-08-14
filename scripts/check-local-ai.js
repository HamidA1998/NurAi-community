#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

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
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    if (process.env[key]) continue;
    process.env[key] = parseEnvValue(trimmed.slice(equalsIndex + 1));
  }
}

loadEnvLocal();

const baseUrl =
  process.env.NURAI_LOCAL_AI_BASE_URL || "http://127.0.0.1:11434/v1";
const model = process.env.NURAI_LOCAL_TEXT_MODEL || "gemma3:4b";
const apiKey = process.env.NURAI_LOCAL_AI_API_KEY;
const pool = process.env.NURAI_LOCAL_AI_MODELS;
const checkAllEnabled = process.argv.includes("--all-enabled");
const timeoutMs = Number(
  process.env.NURAI_LOCAL_AI_CHECK_TIMEOUT_MS ||
    process.env.NURAI_LOCAL_AI_TIMEOUT_MS ||
    20000,
);

function looksLikeSecretReference(value) {
  return /^{{\s*[A-Za-z_][A-Za-z0-9_]*\s*}}$/.test((value || "").trim());
}

function authHeaders(extra = {}) {
  return {
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    ...extra,
  };
}

function parseModelPool(raw) {
  if (!raw) return [];
  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [
        id,
        candidateBaseUrl,
        candidateModel,
        roles = "",
        enabled = "true",
      ] = entry.split("|").map((part) => part.trim());
      if (!id || !candidateBaseUrl || !candidateModel) return null;
      return {
        id,
        baseUrl: candidateBaseUrl,
        model: candidateModel,
        roles,
        enabled: !["0", "false", "off", "disabled"].includes(
          enabled.toLowerCase(),
        ),
      };
    })
    .filter(Boolean);
}

async function readJson(url, options) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }
  return response.json();
}

function stripVisibleReasoning(text) {
  const withoutClosedThink = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  if (/^\s*<think>/i.test(withoutClosedThink)) return "";
  return withoutClosedThink.trim();
}

async function checkCandidate(candidate) {
  const models = await readJson(`${candidate.baseUrl}/models`, {
    headers: authHeaders(),
  });
  const modelIds = (models.data || []).map((item) => item.id);
  if (!modelIds.includes(candidate.model)) {
    throw new Error(
      `Model "${candidate.model}" not found. Available models: ${modelIds.join(", ") || "none"}`,
    );
  }

  const completion = await readJson(`${candidate.baseUrl}/chat/completions`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      model: candidate.model,
      stream: false,
      temperature: 0,
      max_tokens: 96,
      messages: [
        {
          role: "system",
          content:
            "Do not output hidden reasoning or <think> tags. Answer directly.",
        },
        {
          role: "user",
          content:
            "/no_think Reply with a short plain text readiness confirmation.",
        },
      ],
    }),
  });
  const text = stripVisibleReasoning(
    completion.choices?.[0]?.message?.content || "",
  );
  if (!text) {
    throw new Error("Completion returned no assistant text.");
  }

  return {
    ok: true,
    id: candidate.id,
    baseUrl: candidate.baseUrl,
    model: candidate.model,
    text,
  };
}

async function main() {
  if (looksLikeSecretReference(apiKey)) {
    throw new Error(
      "NURAI_LOCAL_AI_API_KEY is still a secret reference. Add the real RunPod API key to the runtime environment before verification.",
    );
  }

  const candidates = parseModelPool(pool);
  const primary = candidates.find(
    (candidate) => candidate.model === model && candidate.enabled,
  ) ||
    candidates.find((candidate) => candidate.enabled) || {
      id: "local-default",
      baseUrl,
      model,
      roles: "general",
      enabled: true,
    };

  const candidatesToCheck = checkAllEnabled
    ? candidates.filter((candidate) => candidate.enabled)
    : [primary];
  const finalCandidates = candidatesToCheck.length
    ? candidatesToCheck
    : [primary];
  const results = await Promise.all(
    finalCandidates.map(async (candidate) => {
      try {
        return { check: await checkCandidate(candidate) };
      } catch (error) {
        return {
          failure: {
            id: candidate.id,
            baseUrl: candidate.baseUrl,
            model: candidate.model,
            error: error.message,
          },
        };
      }
    }),
  );
  const checked = results
    .map((result) => result.check)
    .filter((check) => Boolean(check));
  const failures = results
    .map((result) => result.failure)
    .filter((failure) => Boolean(failure));

  if (failures.length) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          checked,
          failures,
          checkedCandidates: finalCandidates.length,
          configuredCandidates: candidates.length || 1,
        },
        null,
        2,
      ),
    );
    throw new Error(
      `Local AI check failed for ${failures.length}/${finalCandidates.length} enabled candidate(s).`,
    );
  }

  const primaryResult =
    checked.find((candidate) => candidate.id === primary.id) || checked[0];
  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl: primaryResult.baseUrl,
        model: primaryResult.model,
        candidate: primaryResult.id,
        configuredCandidates: candidates.length || 1,
        checkedCandidates: finalCandidates.length,
        candidates: checked,
        text: primaryResult.text,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`Local AI check failed: ${error.message}`);
  process.exit(1);
});
