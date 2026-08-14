#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath}: missing file`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      findings.push(`${relativePath}: missing ${JSON.stringify(snippet)}`);
    }
  }
}

function rejectIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (text.includes(snippet)) {
      findings.push(
        `${relativePath}: must not include ${JSON.stringify(snippet)}`,
      );
    }
  }
}

function main() {
  const findings = [];
  let usageText = "";
  let sanitizerText = "";
  let providersText = "";
  let routerText = "";
  let chatRoutesText = "";
  let tafsirRoutesText = "";
  let contextualRoutesText = "";
  let audioRoutesText = "";
  let dailyQuotaText = "";
  let readmeText = "";
  let threatModelText = "";

  try {
    usageText = read("server/ai/usage.ts");
    sanitizerText = read("server/ai/errorSanitizer.ts");
    providersText = read("server/ai/providers.ts");
    routerText = read("server/ai/router.ts");
    chatRoutesText = read("server/replit_integrations/chat/routes.ts");
    tafsirRoutesText = read("server/replit_integrations/tafsir/routes.ts");
    contextualRoutesText = read(
      "server/replit_integrations/nurai-context/routes.ts",
    );
    audioRoutesText = read("server/replit_integrations/audio/routes.ts");
    dailyQuotaText = read("server/ai/dailyQuota.ts");
    readmeText = read("server/ai/README.md");
    threatModelText = read("NurAI-Muslim-threat-model.md");
  } catch (error) {
    findings.push(error instanceof Error ? error.message : String(error));
  }

  requireIncludes(
    usageText,
    "server/ai/usage.ts",
    [
      "AI_USAGE_LOG_RETENTION_DAYS = 30",
      "retainUntil: string",
      "usageLogRetainUntil(endedAt)",
      "hashIdentifier(String(requester.userId))",
      "hashIdentifier(requester.ip)",
      "SAFE_METADATA_KEYS",
      "sanitizeMetadata",
      "sanitizeAIErrorMessage(error)",
    ],
    findings,
  );
  rejectIncludes(
    usageText,
    "server/ai/usage.ts",
    [
      "prompt:",
      "messages: input.request.messages",
      "content: message.content",
      "errorMessage: error.message",
    ],
    findings,
  );

  requireIncludes(
    sanitizerText,
    "server/ai/errorSanitizer.ts",
    ["sanitizeAIErrorMessage", "redacted-secret", "redacted-url"],
    findings,
  );
  requireIncludes(
    providersText,
    "server/ai/providers.ts",
    ["sanitizeAIErrorMessage(error)"],
    findings,
  );
  requireIncludes(
    routerText,
    "server/ai/router.ts",
    ["sanitizeAIErrorMessage(error)", "sourceFailClosedRequired"],
    findings,
  );
  requireIncludes(
    chatRoutesText,
    "server/replit_integrations/chat/routes.ts",
    ["sanitizeAIErrorMessage(error)", "Error sending message:"],
    findings,
  );
  requireIncludes(
    tafsirRoutesText,
    "server/replit_integrations/tafsir/routes.ts",
    ["sanitizeAIErrorMessage(error)", "Error generating tafsir:"],
    findings,
  );
  requireIncludes(
    contextualRoutesText,
    "server/replit_integrations/nurai-context/routes.ts",
    ["sanitizeAIErrorMessage(error)", "[NurAI Context] Error:"],
    findings,
  );
  requireIncludes(
    audioRoutesText,
    "server/replit_integrations/audio/routes.ts",
    [
      "sanitizeAIErrorMessage(error)",
      "Error generating narration:",
      "Error processing voice message:",
    ],
    findings,
  );
  rejectIncludes(
    chatRoutesText,
    "server/replit_integrations/chat/routes.ts",
    ['console.error("Error sending message:", error)'],
    findings,
  );
  rejectIncludes(
    tafsirRoutesText,
    "server/replit_integrations/tafsir/routes.ts",
    ['console.error("Error generating tafsir:", error)'],
    findings,
  );
  rejectIncludes(
    contextualRoutesText,
    "server/replit_integrations/nurai-context/routes.ts",
    ['console.error("[NurAI Context] Error:", error)'],
    findings,
  );
  rejectIncludes(
    audioRoutesText,
    "server/replit_integrations/audio/routes.ts",
    [
      'console.error("Error generating narration:", error)',
      'console.error("Error processing voice message:", error)',
    ],
    findings,
  );

  requireIncludes(
    dailyQuotaText,
    "server/ai/dailyQuota.ts",
    [
      "AI_USAGE_COUNTER_RETENTION_DAYS = 45",
      "AI_USAGE_COUNTER_PRUNE_INTERVAL_MS",
      "export async function pruneAIUsageCounters",
      "DELETE FROM ai_usage",
      "WHERE date_key <",
      "await pruneAIUsageCountersIfDue(nowMs)",
      'console.warn("[ai-usage] daily counter prune failed"',
    ],
    findings,
  );

  requireIncludes(
    readmeText,
    "server/ai/README.md",
    [
      "AI usage log retention",
      "retainUntil",
      "AI_USAGE_LOG_RETENTION_DAYS",
      "AI_USAGE_COUNTER_RETENTION_DAYS",
      "does not log raw prompts",
    ],
    findings,
  );

  requireIncludes(
    threatModelText,
    "NurAI-Muslim-threat-model.md",
    ["30-day retention marker", "45 days", "AI usage logs"],
    findings,
  );
  const openAIDeploymentCheck = read("scripts/check-openai-deployment.js");
  requireIncludes(
    openAIDeploymentCheck,
    "scripts/check-openai-deployment.js",
    ['return "present";'],
    findings,
  );
  rejectIncludes(
    openAIDeploymentCheck,
    "scripts/check-openai-deployment.js",
    ["slice(-4)", "slice(0, 5)"],
    findings,
  );

  if (findings.length) {
    console.error("AI privacy-control check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "AI privacy-control check passed: usage logs are redacted, retention-tagged, and daily counters are pruned.",
  );
}

main();
