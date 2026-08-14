import * as fs from "node:fs";
import type { AddressInfo } from "node:net";
import * as path from "node:path";

function parseEnvValue(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvLocal(): void {
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

async function main() {
  loadEnvLocal();

  const express = (await import("express")).default;
  const { registerAIRoutes } = await import("../server/ai/routes");
  const routesText = fs.readFileSync(
    path.resolve(process.cwd(), "server/ai/routes.ts"),
    "utf8",
  );

  const app = express();
  registerAIRoutes(app);

  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/ai/status`,
    );
    const body = await response.json();

    if (!response.ok) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    if (!body || typeof body !== "object") {
      throw new Error("Status route did not return a JSON object.");
    }
    if (!body.cloud || !body.local || !body.health) {
      throw new Error("Status route response is missing AI status sections.");
    }
    if (!body.cloud.apiKeySource) {
      throw new Error("Status route response is missing cloud.apiKeySource.");
    }
    if (!body.cloud.configured) {
      throw new Error(
        "Cloud AI is not configured in this environment. Set OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY.",
      );
    }
    const publicStatusJson = JSON.stringify(body);
    const configuredLocalBaseUrl = process.env.NURAI_LOCAL_AI_BASE_URL;
    if (
      configuredLocalBaseUrl &&
      publicStatusJson.includes(configuredLocalBaseUrl)
    ) {
      throw new Error(
        "Public AI status route leaked the configured local base URL.",
      );
    }
    if (/api\.runpod\.ai\/v2\/[^/]+\/openai\/v1/.test(publicStatusJson)) {
      throw new Error("Public AI status route leaked a RunPod endpoint URL.");
    }
    if (/\brunpod-[a-z0-9-]+\b/i.test(publicStatusJson)) {
      throw new Error("Public AI status route leaked a RunPod model id.");
    }
    if (/\bQwen\/|Gemma|Granite|GPT-OSS|Llama\b/i.test(publicStatusJson)) {
      throw new Error(
        "Public AI status route leaked deployment-specific local model names.",
      );
    }

    const adminResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/admin/ai/diagnostics`,
    );
    if (adminResponse.status !== 401) {
      throw new Error(
        `Expected unauthenticated admin diagnostics to return 401, got ${adminResponse.status}`,
      );
    }

    const smokeResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/admin/ai/smoke`,
      { method: "POST" },
    );
    if (smokeResponse.status !== 401) {
      throw new Error(
        `Expected unauthenticated admin AI smoke check to return 401, got ${smokeResponse.status}`,
      );
    }

    for (const required of [
      '"/api/admin/ai/diagnostics"',
      '"/api/admin/ai/smoke"',
      "requireAdminUser",
      "requireAdminOrReleaseSmokeSecret",
      "NURAI_DEPLOYED_AI_SMOKE_SECRET",
      "isAdminEmail",
      "adminAIConfig()",
      'message: "Provider status unavailable."',
    ]) {
      if (!routesText.includes(required)) {
        throw new Error(`AI routes file is missing ${required}`);
      }
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: body.mode,
          cloudConfigured: body.cloud.configured,
          cloudApiKeySource: body.cloud.apiKeySource,
          localConfigured: body.local.configured,
          localRequired: body.mode === "hybrid" || body.mode === "local",
          localHealthy: body.health.local?.healthy,
          localModelCount: body.local.modelCount || 0,
          enabledLocalModelCount: body.local.enabledModelCount || 0,
          adminDiagnosticsAuth: "required",
          adminSmokeAuth: "required",
        },
        null,
        2,
      ),
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

main().catch((error) => {
  console.error(
    `AI status route check failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
