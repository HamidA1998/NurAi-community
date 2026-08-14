#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import path from "node:path";

type ChildCheck = {
  id: "source-pack-activation-readiness" | "library-content-completion";
  title: string;
  ok: boolean;
  status: number | null;
  command: string[];
  summary: Record<string, unknown> | null;
  findings: string[];
};

const wantsSummaryJson = process.argv.includes("--summary-json");
const allowCurrentBlockers = process.argv.includes("--allow-current-blockers");

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function resolveOptionalFile(flag: string): string | null {
  const value = argValue(flag);
  return value ? path.resolve(process.cwd(), value) : null;
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

function cleanFindings(summary: Record<string, unknown> | null): string[] {
  return Array.isArray(summary?.findings)
    ? summary.findings.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
}

function runCheck(
  id: ChildCheck["id"],
  title: string,
  args: string[],
): ChildCheck {
  const result = spawnSync("npx", ["tsx", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  const stdout = String(result.stdout || "").trim();
  const stderr = String(result.stderr || "").trim();
  const summary = parseJson(stdout) || parseJson(stderr);
  return {
    id,
    title,
    ok: result.status === 0,
    status: typeof result.status === "number" ? result.status : null,
    command: ["npx", "tsx", ...args],
    summary,
    findings: cleanFindings(summary),
  };
}

function sourcePackArgs(): string[] {
  const args = [
    "scripts/check-source-pack-final-readiness.ts",
    "--summary-json",
  ];
  const evidenceDir = argValue("--source-evidence-dir");
  if (evidenceDir) {
    args.push("--evidence-dir", path.resolve(process.cwd(), evidenceDir));
  }
  for (const domain of ["tafsir", "hadith", "fiqh", "seerah"]) {
    const file = resolveOptionalFile(`--${domain}-file`);
    if (file) args.push(`--${domain}-file`, file);
  }
  return args;
}

function libraryArgs(): string[] {
  const file =
    resolveOptionalFile("--library-file") ||
    path.resolve(
      process.cwd(),
      "docs/audit/library-review-evidence.merged.json",
    );
  return [
    "scripts/check-library-review-final-readiness.ts",
    "--file",
    file,
    "--summary-json",
  ];
}

const checks = [
  runCheck(
    "source-pack-activation-readiness",
    "AI source-pack reviewer evidence",
    sourcePackArgs(),
  ),
  runCheck(
    "library-content-completion",
    "Library reviewer and publication evidence",
    libraryArgs(),
  ),
];

const blockerCount = checks.filter((check) => !check.ok).length;
const report = {
  ok: blockerCount === 0,
  allowedCurrentBlockers: allowCurrentBlockers,
  releaseProof: false,
  readyForHumanReviewClaims: blockerCount === 0,
  boundary:
    "This command only verifies final human-review evidence candidates; it does not create reviewer approval, source-pack activation, publication evidence, production deployment proof, or database proof.",
  checkedAt: new Date().toISOString(),
  blockerCount,
  checks,
  nextRequiredActions: checks
    .filter((check) => !check.ok)
    .map((check) => check.id),
};

if (wantsSummaryJson) {
  console.log(JSON.stringify(report, null, 2));
} else if (report.ok) {
  console.log("Human-review final readiness passed.");
} else {
  console.error("Human-review final readiness is not complete:");
  for (const check of checks) {
    if (check.ok) continue;
    console.error(`- ${check.title}: ${check.findings[0] || "not ready"}`);
  }
}

if (!report.ok && !allowCurrentBlockers) {
  process.exit(1);
}
