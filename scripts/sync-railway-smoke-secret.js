#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const KEY = "NURAI_DEPLOYED_AI_SMOKE_SECRET";

const wantsJson = process.argv.includes("--json");
const wantsPlan =
  process.argv.includes("--plan") || process.argv.includes("--dry-run");

function parseEnvValue(raw) {
  const trimmed = String(raw || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readEnvLocalValue(name) {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return undefined;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = line.slice(0, equalsIndex).trim();
    if (key === name) return parseEnvValue(line.slice(equalsIndex + 1));
  }
  return undefined;
}

function localSecretState() {
  const processValue = process.env.NURAI_DEPLOYED_AI_SMOKE_SECRET;
  const envLocalValue = readEnvLocalValue(KEY);
  const value = processValue || envLocalValue || "";
  const source = processValue
    ? "process"
    : envLocalValue
      ? ".env.local"
      : "missing";
  return {
    ok: value.length >= 32,
    source,
    state: value ? "present" : "missing",
    minLength: 32,
    length: value.length,
  };
}

function buildPlan() {
  const service = process.env.NURAI_RAILWAY_SERVICE || "nurai-api";
  const secret = localSecretState();
  return {
    ok: secret.ok,
    key: KEY,
    service,
    willMutateRailway: false,
    localSecret: secret,
    syncCommand: `railway variables --service ${service} --set ${KEY}=[REDACTED]`,
    verificationCommand: "npm run check:ai-release:deployed",
    nextSteps: [
      "Run railway login if the Railway CLI session is expired.",
      "Run npm run sync:railway-smoke-secret to write the local smoke secret to the deployed Railway service.",
      "Restart or redeploy the service if Railway does not apply variables immediately.",
      "Run npm run check:ai-release:deployed and record non-secret pass evidence.",
    ],
  };
}

function emitJson(report) {
  console.log(JSON.stringify(report, null, 2));
}

function main() {
  if (wantsPlan) {
    const plan = buildPlan();
    if (wantsJson) {
      emitJson(plan);
    } else {
      console.log(
        `${KEY} sync plan for Railway service ${plan.service}; local secret ${plan.localSecret.state} from ${plan.localSecret.source}.`,
      );
      console.log(plan.syncCommand);
      console.log(plan.verificationCommand);
    }
    process.exit(plan.ok ? 0 : 1);
  }

  const secret =
    process.env.NURAI_DEPLOYED_AI_SMOKE_SECRET || readEnvLocalValue(KEY);
  if (!secret || secret.length < 32) {
    const message = `${KEY} must be present locally and at least 32 characters before syncing to Railway.`;
    if (wantsJson) {
      emitJson({ ...buildPlan(), ok: false, error: message });
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  const railway = spawnSync("railway", ["whoami"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (railway.status !== 0) {
    const message =
      "Railway CLI is not logged in. Run `railway login`, then rerun `npm run sync:railway-smoke-secret`.";
    if (wantsJson) {
      emitJson({ ...buildPlan(), ok: false, error: message });
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  const service = process.env.NURAI_RAILWAY_SERVICE || "nurai-api";
  const result = spawnSync(
    "railway",
    ["variables", "--service", service, "--set", `${KEY}=${secret}`],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.status !== 0) {
    const stderr = String(result.stderr || "")
      .replace(secret, "[REDACTED]")
      .trim();
    const message =
      stderr ||
      `Failed to sync ${KEY} to Railway service ${service}. Check Railway project/service selection.`;
    if (wantsJson) {
      emitJson({ ...buildPlan(), ok: false, error: message });
    } else {
      console.error(message);
    }
    process.exit(result.status || 1);
  }

  if (wantsJson) {
    emitJson({
      ...buildPlan(),
      ok: true,
      willMutateRailway: true,
      synced: true,
    });
  } else {
    console.log(`${KEY} synced to Railway service ${service}.`);
    console.log(
      "Redeploy/restart the service if Railway does not apply variables immediately, then run `npm run check:ai-release:deployed`.",
    );
  }
}

main();
