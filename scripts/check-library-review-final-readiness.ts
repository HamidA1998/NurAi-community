#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { LIBRARY_BOOKS } from "../client/data/libraryBooks";

type EvidenceFile = {
  schemaVersion?: unknown;
  reviewScope?: {
    stage?: unknown;
  };
  records?: {
    bookId?: unknown;
  }[];
  mergeMetadata?: {
    missingLibraryBookIds?: unknown;
    missingStagesByBookId?: unknown;
  };
};

type SecretLikeFinding = {
  path: string;
  pattern: string;
};

type ValidationSummary = {
  valid?: boolean;
  readyForHighestStandardClaim?: boolean;
  stageValidationOnly?: boolean;
  bookCount?: number;
  evidenceRecordCount?: number;
  completeEvidenceCount?: number;
  blockerCount?: number;
  warningCount?: number;
};

type ApplySummary = {
  ok?: boolean;
  allowPartialImport?: boolean;
  readyForHighestStandardClaim?: boolean;
  evidenceRecordCount?: number;
  wouldApplyCount?: number;
  expectedBookCount?: number;
  validationBlockerCount?: number;
  validationWarningCount?: number;
};

const wantsSummaryJson = process.argv.includes("--summary-json");

function argValue(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const evidencePath = path.resolve(
  process.cwd(),
  argValue("--file", "docs/audit/library-review-evidence.merged.json"),
);

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

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseJson(text: string) {
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

function commandSummary(command: string, args: string[]) {
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
    json: parseJson(stdout),
  };
}

function readEvidence(): EvidenceFile | null {
  if (!fs.existsSync(evidencePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(evidencePath, "utf8")) as EvidenceFile;
  } catch {
    return null;
  }
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

const findings: string[] = [];
const evidence = readEvidence();
const expectedBookIds = new Set(LIBRARY_BOOKS.map((book) => book.id));
const expectedBookCount = expectedBookIds.size;
const secretFindings = evidence ? secretLikeFindings(evidence) : [];

if (!evidence) {
  findings.push(
    `${evidencePath} must be a parseable Library review evidence JSON file.`,
  );
}

if (evidence && evidence.schemaVersion !== 2) {
  findings.push("Final Library review evidence must use schemaVersion 2.");
}

if (evidence && cleanText(evidence.reviewScope?.stage) !== "all") {
  findings.push(
    "Final Library review evidence must have reviewScope.stage set to all.",
  );
}

if (secretFindings.length > 0) {
  findings.push(
    `Final Library review evidence contains ${secretFindings.length} secret-like value(s); remove credentials, tokens, cookies, auth headers, connection strings, and private keys before validation or import.`,
  );
}

const recordBookIds = (evidence?.records || []).map((record) =>
  cleanText(record.bookId),
);
const uniqueRecordBookIds = new Set(recordBookIds);
const missingBookIds = [...expectedBookIds].filter(
  (bookId) => !uniqueRecordBookIds.has(bookId),
);
const unknownBookIds = recordBookIds.filter(
  (bookId) => bookId && !expectedBookIds.has(bookId),
);

if (recordBookIds.length !== expectedBookCount) {
  findings.push(
    `Final Library review evidence must include exactly ${expectedBookCount} records; found ${recordBookIds.length}.`,
  );
}
if (uniqueRecordBookIds.size !== recordBookIds.length) {
  findings.push(
    "Final Library review evidence must not include duplicate books.",
  );
}
if (missingBookIds.length > 0) {
  findings.push(
    `Final Library review evidence is missing ${missingBookIds.length} Library book(s).`,
  );
}
if (unknownBookIds.length > 0) {
  findings.push(
    `Final Library review evidence contains unknown book id(s): ${unknownBookIds.join(", ")}.`,
  );
}

const mergedMissingBookIds = Array.isArray(
  evidence?.mergeMetadata?.missingLibraryBookIds,
)
  ? evidence?.mergeMetadata?.missingLibraryBookIds
      .map(cleanText)
      .filter(Boolean)
  : [];
if (mergedMissingBookIds.length > 0) {
  findings.push(
    `Merged evidence metadata still lists ${mergedMissingBookIds.length} missing Library book(s).`,
  );
}

const missingStagesByBookId =
  evidence?.mergeMetadata?.missingStagesByBookId &&
  typeof evidence.mergeMetadata.missingStagesByBookId === "object" &&
  !Array.isArray(evidence.mergeMetadata.missingStagesByBookId)
    ? (evidence.mergeMetadata.missingStagesByBookId as Record<string, unknown>)
    : {};
const booksMissingStages = Object.entries(missingStagesByBookId)
  .filter(([, stages]) => Array.isArray(stages) && stages.length > 0)
  .map(([bookId]) => bookId);
if (booksMissingStages.length > 0) {
  findings.push(
    `Merged evidence metadata still lists missing reviewer stages for ${booksMissingStages.length} book(s).`,
  );
}

let validationSummary: ValidationSummary | null = null;
let applySummary: ApplySummary | null = null;

if (findings.length === 0) {
  const validation = commandSummary("npx", [
    "tsx",
    "scripts/validate-library-review-evidence.ts",
    "--file",
    evidencePath,
    "--strict",
    "--summary-json",
  ]);
  validationSummary = validation.json as ValidationSummary | null;
  if (!validation.ok || validationSummary?.valid !== true) {
    findings.push("Strict Library review evidence validation must pass.");
  }
  if (validationSummary?.readyForHighestStandardClaim !== true) {
    findings.push(
      "Strict Library review evidence validation must be ready for the highest-standard whole-library claim.",
    );
  }
  if (validationSummary?.stageValidationOnly === true) {
    findings.push(
      "Final Library review evidence cannot be stage-only evidence.",
    );
  }
  if (validationSummary?.completeEvidenceCount !== expectedBookCount) {
    findings.push(
      `Strict validation must report ${expectedBookCount} complete evidence record(s).`,
    );
  }
  if ((validationSummary?.warningCount ?? 0) > 0) {
    findings.push(
      "Strict final Library review evidence must have zero warnings.",
    );
  }
}

if (findings.length === 0) {
  const apply = commandSummary("npx", [
    "tsx",
    "scripts/apply-library-review-evidence.ts",
    "--file",
    evidencePath,
    "--summary-json",
  ]);
  applySummary = apply.json as ApplySummary | null;
  if (!apply.ok || applySummary?.ok !== true) {
    findings.push("Final Library review evidence must dry-run import cleanly.");
  }
  if (applySummary?.allowPartialImport === true) {
    findings.push(
      "Final Library review evidence must import without --allow-partial-import.",
    );
  }
  if (applySummary?.readyForHighestStandardClaim !== true) {
    findings.push(
      "Final Library review evidence dry-run import must remain a highest-standard whole-library candidate.",
    );
  }
  if (applySummary?.wouldApplyCount !== expectedBookCount) {
    findings.push(
      `Final Library review evidence dry-run must apply ${expectedBookCount} record(s).`,
    );
  }
}

const report = {
  ok: findings.length === 0,
  evidencePath,
  expectedBookCount,
  evidenceRecordCount: recordBookIds.length,
  missingBookCount: missingBookIds.length,
  unknownBookCount: unknownBookIds.length,
  booksMissingStageCount: booksMissingStages.length,
  secretLikeFindingCount: secretFindings.length,
  secretLikeFindings: secretFindings,
  validationSummary,
  applySummary,
  findings,
};

if (wantsSummaryJson) {
  console.log(JSON.stringify(report, null, 2));
} else if (report.ok) {
  console.log(
    `Final Library review evidence is ready for guarded import: ${evidencePath}`,
  );
} else {
  console.error("Final Library review evidence is not ready:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
}

if (!report.ok) process.exit(1);
