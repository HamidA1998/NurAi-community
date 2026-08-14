#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  DRAFT_ISLAMIC_SOURCE_CARDS,
  SOURCE_PACK_DOMAINS,
  VERIFIED_ISLAMIC_SOURCE_CARDS,
  type IslamicSourcePackDomain,
} from "../server/ai/islamicSourcePacks";

type CommandResult = {
  ok: boolean;
  status: number | null;
  stdout: string;
  stderr: string;
  json: Record<string, unknown> | null;
};

type SecretLikeFinding = {
  path: string;
  pattern: string;
};

type DomainReadiness = {
  domain: IslamicSourcePackDomain;
  evidencePath: string;
  draftCount: number;
  validated: boolean;
  activationReady: boolean;
  dryRunReady: boolean;
  approvedCount: number;
  blockerCount: number;
  secretLikeFindingCount: number;
  findings: string[];
};

const wantsSummaryJson = process.argv.includes("--summary-json");

const SECRET_LIKE_PATTERNS = [
  {
    id: "openai-api-key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/,
  },
  {
    id: "runpod-api-key",
    pattern: /\brpa_[A-Za-z0-9]{32,}\b/,
  },
  {
    id: "google-api-key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    id: "postgres-url-with-password",
    pattern: /\bpostgres(?:ql)?:\/\/[^/\s:@]+:[^@\s]+@/i,
  },
  {
    id: "bearer-token",
    pattern: /\bbearer\s+[A-Za-z0-9._-]{16,}/i,
  },
  {
    id: "authorization-header-value",
    pattern: /\bauthorization\s*:\s*\S{12,}/i,
  },
  {
    id: "cookie-header-value",
    pattern: /\bcookie\s*:\s*\S{12,}/i,
  },
  {
    id: "private-key",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  },
  {
    id: "jwt",
    pattern:
      /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/,
  },
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function domainEvidencePath(domain: IslamicSourcePackDomain): string {
  const explicitPath = argValue(`--${domain}-file`);
  if (explicitPath) return path.resolve(process.cwd(), explicitPath);

  const evidenceDir = argValue("--evidence-dir");
  if (evidenceDir) {
    return path.resolve(
      process.cwd(),
      evidenceDir,
      `${domain}-source-review-evidence.json`,
    );
  }

  return path.resolve(
    process.cwd(),
    "docs",
    "audit",
    `${domain}-source-review-evidence.intake.json`,
  );
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text.trim());
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function commandSummary(command: string, args: string[]): CommandResult {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();
  return {
    ok: result.status === 0,
    status: result.status,
    stdout,
    stderr,
    json: parseJson(stdout) || parseJson(stderr),
  };
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function secretLikeFindings(
  value: unknown,
  location = "$",
): SecretLikeFinding[] {
  if (typeof value === "string") {
    return SECRET_LIKE_PATTERNS.filter(({ pattern }) =>
      pattern.test(value),
    ).map(({ id }) => ({
      path: location,
      pattern: id,
    }));
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      secretLikeFindings(item, `${location}[${index}]`),
    );
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, nested]) => secretLikeFindings(nested, `${location}.${key}`),
    );
  }
  return [];
}

function readEvidence(pathToEvidence: string): {
  parsed: unknown;
  findings: string[];
} {
  if (!fs.existsSync(pathToEvidence)) {
    return {
      parsed: null,
      findings: [`${pathToEvidence} does not exist.`],
    };
  }
  try {
    return {
      parsed: JSON.parse(fs.readFileSync(pathToEvidence, "utf8")),
      findings: [],
    };
  } catch (error) {
    return {
      parsed: null,
      findings: [
        error instanceof Error
          ? `${pathToEvidence} is not parseable JSON: ${error.message}.`
          : `${pathToEvidence} is not parseable JSON.`,
      ],
    };
  }
}

function checkDomain(domain: IslamicSourcePackDomain): DomainReadiness {
  const evidencePath = domainEvidencePath(domain);
  const draftCount = DRAFT_ISLAMIC_SOURCE_CARDS.filter(
    (card) => card.domain === domain,
  ).length;
  const findings: string[] = [];
  const evidence = readEvidence(evidencePath);
  findings.push(...evidence.findings);

  const secretFindings = evidence.parsed
    ? secretLikeFindings(evidence.parsed)
    : [];
  if (secretFindings.length > 0) {
    findings.push(
      `${domain} evidence contains ${secretFindings.length} secret-like value(s); remove credentials, auth headers, cookies, connection strings, and private keys before validation or activation.`,
    );
  }

  let validation: CommandResult | null = null;
  let dryRun: CommandResult | null = null;
  if (findings.length === 0) {
    validation = commandSummary("npx", [
      "tsx",
      `scripts/validate-${domain}-review-evidence.ts`,
      "--file",
      evidencePath,
      "--require-approved",
      "--summary-json",
    ]);
    const validationJson = validation.json;
    if (!validation.ok) {
      findings.push(
        `${domain} evidence is not activation-ready according to validate:${domain}-review-evidence.`,
      );
    }
    if (validationJson?.valid !== true) {
      findings.push(`${domain} validation did not report valid: true.`);
    }
    if (validationJson?.activationReady !== true) {
      findings.push(
        `${domain} validation did not report activationReady: true.`,
      );
    }
    if (numberValue(validationJson?.draftCount) !== draftCount) {
      findings.push(
        `${domain} validation draft count does not match the current source-pack catalog.`,
      );
    }
    if (numberValue(validationJson?.approvedCount) !== draftCount) {
      findings.push(
        `${domain} validation must approve every current draft card.`,
      );
    }
  }

  if (findings.length === 0) {
    dryRun = commandSummary("npx", [
      "tsx",
      `scripts/apply-${domain}-review-evidence.ts`,
      "--file",
      evidencePath,
      "--summary-json",
    ]);
    const dryRunJson = dryRun.json;
    if (!dryRun.ok) {
      findings.push(
        `${domain} dry-run activation failed; do not use --confirm-source-pack-activation.`,
      );
    }
    if (dryRunJson?.ok !== true || cleanText(dryRunJson?.mode) !== "dry-run") {
      findings.push(`${domain} apply dry run did not report ok dry-run mode.`);
    }
    if (dryRunJson?.wrote !== false) {
      findings.push(`${domain} final-readiness dry run must not write files.`);
    }
    if (dryRunJson?.confirmSourcePackActivation !== false) {
      findings.push(
        `${domain} final-readiness dry run must not use --confirm-source-pack-activation.`,
      );
    }
    if (numberValue(dryRunJson?.activatedCardCount) !== draftCount) {
      findings.push(
        `${domain} dry run must account for every current draft card.`,
      );
    }
  }

  const validationJson = validation?.json;
  return {
    domain,
    evidencePath: path.relative(process.cwd(), evidencePath),
    draftCount,
    validated: validationJson?.valid === true,
    activationReady: validationJson?.activationReady === true,
    dryRunReady: dryRun?.ok === true && dryRun.json?.ok === true,
    approvedCount: numberValue(validationJson?.approvedCount),
    blockerCount: findings.length,
    secretLikeFindingCount: secretFindings.length,
    findings,
  };
}

const domains = SOURCE_PACK_DOMAINS.map(checkDomain);
const findings = domains.flatMap((domain) =>
  domain.findings.map((finding) => `${domain.domain}: ${finding}`),
);

if (DRAFT_ISLAMIC_SOURCE_CARDS.length === 0) {
  findings.push(
    "No draft source-pack cards remain. This final-readiness check is for pre-activation reviewer evidence, not post-activation catalog validation.",
  );
}

const report = {
  ok: findings.length === 0,
  readyForSourcePackActivationClaim: findings.length === 0,
  domainCount: domains.length,
  draftCardCount: DRAFT_ISLAMIC_SOURCE_CARDS.length,
  verifiedCardCount: VERIFIED_ISLAMIC_SOURCE_CARDS.length,
  approvedDraftCardCount: domains.reduce(
    (sum, domain) => sum + domain.approvedCount,
    0,
  ),
  secretLikeFindingCount: domains.reduce(
    (sum, domain) => sum + domain.secretLikeFindingCount,
    0,
  ),
  blockerCount: findings.length,
  domains,
  findings,
};

if (wantsSummaryJson) {
  console.log(JSON.stringify(report, null, 2));
} else if (report.ok) {
  console.log("AI source-pack final readiness passed.");
} else {
  console.error("AI source-pack final readiness failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
}

if (!report.ok) process.exit(1);
