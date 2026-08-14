#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const threatModelPath = path.join(root, "NurAI-Muslim-threat-model.md");

const requiredSections = [
  "## Executive summary",
  "## Scope and assumptions",
  "## System model",
  "### Primary components",
  "### Data flows and trust boundaries",
  "#### Diagram",
  "## Assets and security objectives",
  "## Attacker model",
  "### Capabilities",
  "### Non-capabilities",
  "## Entry points and attack surfaces",
  "## Top abuse paths",
  "## Threat model table",
  "## Criticality calibration",
  "## Focus paths for security review",
  "## Quality check",
];

const requiredEvidenceAnchors = [
  "server/index.ts",
  "server/auth.ts",
  "server/routes.ts",
  "server/requestAuth.ts",
  "server/replit_integrations/chat/routes.ts",
  "server/replit_integrations/nurai-context/routes.ts",
  "server/replit_integrations/audio/routes.ts",
  "server/replit_integrations/tafsir/routes.ts",
  "server/replit_integrations/image/routes.ts",
  "server/community.ts",
  "server/family.ts",
  "server/places.ts",
  "server/nasheeds.ts",
  "server/revenuecatWebhook.ts",
  "server/subscriptionSync.ts",
  "server/librarySourceReview.ts",
  "server/ai/router.ts",
  "server/ai/sourceGrounding.ts",
  "server/ai/usage.ts",
  "server/ai/rateLimit.ts",
  "server/subscriptions.ts",
  "shared/schema.ts",
  "migrations/0001_conversation_ownership.sql",
  "migrations/0007_library_source_review_events.sql",
  "migrations/0008_family_members_unique.sql",
  "migrations/0012_nasheed_tracks.sql",
  "scripts/check-db-migrations-applied.js",
  "scripts/check-navigation-routes.js",
  "scripts/check-release-blockers.js",
  "scripts/export-library-source-specificity-audit.ts",
  "scripts/check-release-handoff.js",
  "package.json",
];

const requiredThreatIds = Array.from(
  { length: 10 },
  (_, index) => `TM-${String(index + 1).padStart(3, "0")}`,
);

function lineNumber(text, needle) {
  const index = text.indexOf(needle);
  if (index === -1) return 0;
  return text.slice(0, index).split(/\r?\n/).length;
}

function main() {
  const findings = [];

  if (!fs.existsSync(threatModelPath)) {
    findings.push("NurAI-Muslim-threat-model.md is missing.");
  }

  const text = fs.existsSync(threatModelPath)
    ? fs.readFileSync(threatModelPath, "utf8")
    : "";

  for (const section of requiredSections) {
    if (!text.includes(section)) {
      findings.push(`missing required section ${section}`);
    }
  }

  for (let index = 1; index < requiredSections.length; index += 1) {
    const previous = requiredSections[index - 1];
    const current = requiredSections[index];
    const previousLine = lineNumber(text, previous);
    const currentLine = lineNumber(text, current);
    if (previousLine && currentLine && currentLine <= previousLine) {
      findings.push(`${current} appears before ${previous}`);
    }
  }

  if (!/```mermaid[\s\S]*flowchart\s+(TD|LR)[\s\S]*```/.test(text)) {
    findings.push("missing compact Mermaid flowchart");
  }

  for (const threatId of requiredThreatIds) {
    if (!text.includes(threatId)) {
      findings.push(`missing stable threat id ${threatId}`);
    }
  }

  const tableThreatIds = [...text.matchAll(/\|\s*(TM-\d{3})\s*\|/g)].map(
    (match) => match[1],
  );
  const uniqueTableThreatIds = [...new Set(tableThreatIds)];
  if (uniqueTableThreatIds.length < requiredThreatIds.length) {
    findings.push(
      `threat model table covers ${uniqueTableThreatIds.length}/${requiredThreatIds.length} required threat ids`,
    );
  }

  for (const anchor of requiredEvidenceAnchors) {
    if (!text.includes(anchor)) {
      findings.push(`missing evidence anchor ${anchor}`);
    }
  }

  if (!text.includes("npm run check:release-blockers")) {
    findings.push("release blocker command is not referenced");
  }

  if (!text.includes("npm run check:release-local")) {
    findings.push("local release gate command is not referenced");
  }

  if (!text.includes("npm run check:release-handoff")) {
    findings.push("release handoff command is not referenced");
  }

  const stalePatterns = [
    /Eight external blockers/i,
    /eight external blockers/i,
    /release completion still depends on the eight/i,
    /RevenueCat client key is missing/i,
    /RevenueCat client key, Google Places key, and store-submit credentials, so those remain release blockers/i,
  ];
  for (const pattern of stalePatterns) {
    if (pattern.test(text)) {
      findings.push(`stale release-blocker wording matched ${pattern}`);
    }
  }

  if (findings.length) {
    console.error("Threat-model check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    `Threat-model check passed: ${requiredThreatIds.length} threats, ${requiredEvidenceAnchors.length} evidence anchors, and ${requiredSections.length} sections verified.`,
  );
}

main();
