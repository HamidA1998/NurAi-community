#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const knownPublicPoolIds = new Set([
  "qwen3-32b-awq",
  "granite-4-0-h-small",
  "gpt-oss-120b",
]);

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`${relativePath} is missing.`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function parseReplitEnv(text) {
  const env = {};
  const envSection = text.match(/\[env\]\n([\s\S]*?)(?:\n\[|$)/)?.[1] || "";
  for (const line of envSection.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"([\s\S]*)"\s*$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

function parseModelPool(raw) {
  return String(raw || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [id, baseUrl, model, roles = "", enabled = "true"] = entry
        .split("|")
        .map((part) => part.trim());
      const endpointId = baseUrl.match(/api\.runpod\.ai\/v2\/([^/]+)/)?.[1];
      return {
        id,
        baseUrl,
        model,
        roles,
        endpointId,
        enabled: !["0", "false", "off", "disabled"].includes(
          enabled.toLowerCase(),
        ),
      };
    });
}

function fail(findings, message) {
  findings.push(message);
}

function main() {
  const findings = [];
  const replit = read(".replit");
  const configureScript = read("scripts/configure-runpod-local-ai.js");
  const aiStatus = read("docs/audit/AI_RELEASE_STATUS.md");
  const localSetup = read("LOCAL_AI_SETUP.md");
  const packageJson = read("package.json");

  const env = parseReplitEnv(replit);
  const pool = parseModelPool(env.NURAI_LOCAL_AI_MODELS);
  const enabled = pool.filter((candidate) => candidate.enabled);
  if (env.NURAI_ALLOW_LOCAL_RELIGIOUS_AI !== "false") {
    fail(findings, ".replit must keep local religious AI disabled.");
  }
  if (env.NURAI_ALLOW_LOCAL_SENSITIVE_AI !== "false") {
    fail(findings, ".replit must keep local sensitive AI disabled.");
  }
  if (!pool.length) {
    fail(findings, ".replit must define NURAI_LOCAL_AI_MODELS.");
  }
  for (const candidate of enabled) {
    if (candidate.endpointId && knownPublicPoolIds.has(candidate.endpointId)) {
      fail(
        findings,
        `.replit enables provisional RunPod public pool ${candidate.endpointId}; release defaults must use an owned endpoint or keep public pools disabled.`,
      );
    }
  }

  if (
    !/id:\s*"runpod-qwen3-32b-awq"[\s\S]*?defaultEnabled:\s*false/.test(
      configureScript,
    )
  ) {
    fail(
      findings,
      "configure-runpod-local-ai.js must keep the provisional Qwen public pool disabled by default.",
    );
  }
  if (!/: customPool/.test(configureScript)) {
    fail(
      findings,
      "configure-runpod-local-ai.js must configure owned endpoints without public-pool fallback by default.",
    );
  }
  for (const required of [
    "--allow-public-pool",
    "NURAI_ALLOW_RUNPOD_PUBLIC_POOL",
    "Refusing to configure RunPod public pool",
  ]) {
    if (!configureScript.includes(required)) {
      fail(
        findings,
        `configure-runpod-local-ai.js must require explicit development override for public pools (${required}).`,
      );
    }
  }
  for (const endpointId of knownPublicPoolIds) {
    if (
      !aiStatus.includes(endpointId) &&
      !aiStatus.includes(endpointId.replace(/-/g, "."))
    ) {
      fail(
        findings,
        `AI release status must document disabled public pool ${endpointId}.`,
      );
    }
  }
  if (
    !/production\s+release\s+gate\s+rejects\s+public-pool\s+endpoints/i.test(
      localSetup,
    )
  ) {
    fail(
      findings,
      "LOCAL_AI_SETUP.md must document that public-pool endpoints are provisional and rejected for production release.",
    );
  }
  if (!packageJson.includes("check:local-ai-config")) {
    fail(findings, "package.json must expose check:local-ai-config.");
  }
  if (!packageJson.includes("npm run check:local-ai-config")) {
    fail(findings, "Local release preflight must run check:local-ai-config.");
  }

  if (findings.length) {
    console.error("Local AI config check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    `Local AI config check passed: ${enabled.length}/${pool.length} deployment candidate(s) enabled, public pools disabled for release defaults.`,
  );
}

main();
