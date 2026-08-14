#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { LIBRARY_BOOKS } from "../client/data/libraryBooks";
import { isSensitiveBook } from "./lib/libraryReviewEvidence";

type IntakeFile = {
  records: {
    bookId: string;
    approvedForPublication: boolean;
    qualityChecklist: Record<string, boolean>;
    editorialReviewer: string;
    editorialReviewedAt: string;
    editorialNotes: string;
    sourceReviewer: string;
    sourceReviewedAt: string;
    sourceNotes: string;
    qualifiedScholarReviewer?: string;
    qualifiedScholarReviewedAt?: string;
    scholarReviewScope?: string;
    scholarNotes?: string;
    publishApprover: string;
    publishApprovedAt: string;
    publishNotes: string;
  }[];
};

type Summary = {
  ok?: boolean;
  valid?: boolean;
  readyForHighestStandardClaim?: boolean;
  stageValidationOnly?: boolean;
  stageCompleteEvidenceCount?: number;
  requireCompleteStageCoverage?: boolean;
  requireAllLibraryBooks?: boolean;
  completeStageBookCount?: number;
  booksMissingStageCount?: number;
  coverageWritten?: boolean;
  missingStageCount?: number;
  missingLibraryBookCount?: number;
  missingBookCount?: number;
  completeEvidenceCount?: number;
  validationBlockerCount?: number;
  validationWarningCount?: number;
  blockerCount?: number;
  warningCount?: number;
  secretLikeFindingCount?: number;
};

const wantsSummaryJson = process.argv.includes("--summary-json");
const findings: string[] = [];
const reviewDate = new Date().toISOString().slice(0, 10);

function runTsx(args: string[]) {
  return spawnSync("npx", ["tsx", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function parseSummary(stdout: string): Summary {
  try {
    return JSON.parse(stdout.trim()) as Summary;
  } catch {
    return {};
  }
}

function fail(message: string) {
  findings.push(message);
}

function exportStageIntake(stage: string, bookId: string, outPath: string) {
  const result = runTsx([
    "scripts/export-library-review-evidence-intake.ts",
    "--stage",
    stage,
    "--book-id",
    bookId,
    "--write",
    "--out",
    outPath,
    "--summary-json",
  ]);
  if (result.status !== 0) {
    fail(
      `Failed to export ${stage} intake for ${bookId}: ${result.stderr.trim()}`,
    );
  }
}

function readIntake(filePath: string): IntakeFile {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as IntakeFile;
}

function writeIntake(filePath: string, intake: IntakeFile) {
  fs.writeFileSync(filePath, `${JSON.stringify(intake, null, 2)}\n`);
}

function validate(filePath: string, extraArgs: string[] = []) {
  const result = runTsx([
    "scripts/validate-library-review-evidence.ts",
    "--file",
    filePath,
    "--summary-json",
    ...extraArgs,
  ]);
  return {
    status: result.status,
    summary: parseSummary(result.stdout),
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function dryRunApply(filePath: string) {
  const result = runTsx([
    "scripts/apply-library-review-evidence.ts",
    "--file",
    filePath,
    "--allow-partial-import",
    "--summary-json",
  ]);
  return {
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function mergeEvidence(
  files: string[],
  outPath: string,
  extraArgs: string[] = [],
) {
  const coveragePath = outPath.replace(/\.json$/, ".md");
  const result = runTsx([
    "scripts/merge-library-review-evidence.ts",
    ...files.flatMap((filePath) => ["--file", filePath]),
    "--out",
    outPath,
    "--coverage-out",
    coveragePath,
    "--write",
    "--summary-json",
    ...extraArgs,
  ]);
  return {
    status: result.status,
    summary: parseSummary(result.stdout),
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    coveragePath,
  };
}

function checkFinalReadiness(filePath: string) {
  const result = runTsx([
    "scripts/check-library-review-final-readiness.ts",
    "--file",
    filePath,
    "--summary-json",
  ]);
  return {
    status: result.status,
    summary: parseSummary(result.stdout),
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function expectPassingStage(label: string, filePath: string) {
  const result = validate(filePath, ["--strict"]);
  if (result.status !== 0) {
    fail(`${label} should pass stage validation: ${result.stderr}`);
  }
  if (
    result.summary.valid !== true ||
    result.summary.stageValidationOnly !== true ||
    result.summary.readyForHighestStandardClaim !== false ||
    result.summary.stageCompleteEvidenceCount !== 1
  ) {
    fail(
      `${label} returned an unexpected summary: ${JSON.stringify(
        result.summary,
      )}`,
    );
  }
}

function expectStageImportRefused(label: string, filePath: string) {
  const result = dryRunApply(filePath);
  if (result.status === 0) {
    fail(`${label} should be refused by the Library evidence importer.`);
  }
  if (
    !result.stderr.includes("Stage-scoped reviewer evidence cannot be imported")
  ) {
    fail(`${label} importer failure did not explain the stage-only boundary.`);
  }
}

function expectMergedEvidenceCandidate(
  label: string,
  files: string[],
  outPath: string,
) {
  const result = mergeEvidence(files, outPath, [
    "--require-complete-stage-coverage",
  ]);
  if (result.status !== 0) {
    fail(`${label} should merge successfully: ${result.stderr}`);
  }
  if (
    result.summary.readyForHighestStandardClaim !== false ||
    result.summary.coverageWritten !== true ||
    result.summary.requireCompleteStageCoverage !== true ||
    result.summary.completeStageBookCount !== 1 ||
    result.summary.booksMissingStageCount !== 0 ||
    result.summary.missingStageCount !== 0 ||
    result.summary.stageValidationOnly === true ||
    result.summary.stageCompleteEvidenceCount !== undefined
  ) {
    fail(`${label} returned an unexpected merge summary.`);
  }
  const merged = JSON.parse(fs.readFileSync(outPath, "utf8")) as {
    mergeMetadata?: {
      missingStagesByBookId?: Record<string, string[]>;
    };
  };
  const missingStages = merged.mergeMetadata?.missingStagesByBookId || {};
  if (!Object.values(missingStages).every((stages) => stages.length === 0)) {
    fail(`${label} should have no missing reviewer stages in merge metadata.`);
  }
  const coverage = fs.readFileSync(result.coveragePath, "utf8");
  if (
    !coverage.includes("Library Review Merge Coverage") ||
    !coverage.includes("Books with every required reviewer stage present: 1") ||
    !coverage.includes("Missing reviewer stages: 0")
  ) {
    fail(`${label} should write a reviewer-facing merge coverage artifact.`);
  }
  const validation = validate(outPath);
  if (
    validation.status !== 0 ||
    validation.summary.valid !== true ||
    validation.summary.completeEvidenceCount !== 1 ||
    validation.summary.readyForHighestStandardClaim !== false
  ) {
    fail(
      `${label} should validate as one complete partial-publication evidence record: ${validation.stdout}`,
    );
  }
  const apply = dryRunApply(outPath);
  if (apply.status !== 0) {
    fail(`${label} should dry-run import with --allow-partial-import.`);
  }
}

function expectIncompleteCoverageMergeRefused(
  label: string,
  files: string[],
  outPath: string,
) {
  const result = mergeEvidence(files, outPath, [
    "--require-complete-stage-coverage",
  ]);
  if (result.status === 0) {
    fail(`${label} should be refused by the complete-stage coverage gate.`);
  }
  if (!result.stderr.includes("missing required stages")) {
    fail(
      `${label} merge refusal did not explain the missing stage coverage boundary.`,
    );
  }
}

function expectWholeLibraryMergeRefused(
  label: string,
  files: string[],
  outPath: string,
) {
  const result = mergeEvidence(files, outPath, [
    "--require-complete-stage-coverage",
    "--require-all-library-books",
  ]);
  if (result.status === 0) {
    fail(`${label} should be refused by the whole-Library coverage gate.`);
  }
  if (!result.stderr.includes("does not include every Library book")) {
    fail(
      `${label} merge refusal did not explain the whole-Library coverage boundary.`,
    );
  }
}

function expectFinalReadinessRefused(label: string, filePath: string) {
  const result = checkFinalReadiness(filePath);
  if (result.status === 0) {
    fail(`${label} should be refused by the final readiness gate.`);
  }
  if ((result.summary.missingBookCount || 0) < 1) {
    fail(`${label} should report missing Library book coverage.`);
  }
}

function expectFinalReadinessSecretRefused(
  label: string,
  sourcePath: string,
  outPath: string,
) {
  const evidence = JSON.parse(
    fs.readFileSync(sourcePath, "utf8"),
  ) as IntakeFile;
  const secretLikeValue = "sk-proj-" + "abcdefghijklmnopqrstuvwxyz1234567890";
  evidence.records[0].sourceNotes = `This reviewer note accidentally contains a secret-like value ${secretLikeValue}.`;
  writeIntake(outPath, evidence);

  const result = checkFinalReadiness(outPath);
  if (result.status === 0) {
    fail(`${label} should be refused by the final readiness no-secret gate.`);
  }
  if ((result.summary.secretLikeFindingCount || 0) < 1) {
    fail(`${label} should report secret-like reviewer evidence.`);
  }
}

function expectMergeRefused(label: string, files: string[], outPath: string) {
  const result = mergeEvidence(files, outPath);
  if (result.status === 0) {
    fail(`${label} should be refused by the Library evidence merger.`);
  }
  if (!result.stderr.includes("Duplicate reviewer stage evidence")) {
    fail(
      `${label} merge refusal did not explain the duplicate stage boundary.`,
    );
  }
}

function expectReviewBatchArtifactHasStableHashes() {
  const result = runTsx(["scripts/export-library-review-batches.ts", "--json"]);
  if (result.status !== 0) {
    fail(`Library review batch exporter should run: ${result.stderr.trim()}`);
    return;
  }
  let parsed: {
    summary?: { nextBatchHash?: unknown; batchHashes?: unknown };
    batches?: {
      id?: unknown;
      batchHash?: unknown;
      books?: { reviewPacketPath?: unknown; contentHash?: unknown }[];
    }[];
  };
  try {
    parsed = JSON.parse(result.stdout.trim());
  } catch {
    fail("Library review batch exporter must emit parseable JSON.");
    return;
  }
  const batches = Array.isArray(parsed.batches) ? parsed.batches : [];
  if (batches.length < 1) {
    fail("Library review batch exporter should expose pending batches.");
    return;
  }
  if (typeof parsed.summary?.nextBatchHash !== "string") {
    fail("Library review batch summary must expose nextBatchHash.");
  }
  if (
    !parsed.summary?.batchHashes ||
    typeof parsed.summary.batchHashes !== "object" ||
    Array.isArray(parsed.summary.batchHashes)
  ) {
    fail("Library review batch summary must expose batchHashes.");
  }
  for (const batch of batches) {
    if (
      typeof batch.batchHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(batch.batchHash)
    ) {
      fail(`${String(batch.id)} must expose a stable sha256 batchHash.`);
    }
    const books = Array.isArray(batch.books) ? batch.books : [];
    if (books.length < 1) {
      fail(`${String(batch.id)} must include book rows.`);
    }
    for (const book of books) {
      if (
        typeof book.contentHash !== "string" ||
        !book.contentHash.startsWith("sha256:")
      ) {
        fail(`${String(batch.id)} book rows must expose contentHash.`);
      }
      if (
        typeof book.reviewPacketPath !== "string" ||
        !book.reviewPacketPath.startsWith("docs/audit/library-review-packets/")
      ) {
        fail(`${String(batch.id)} book rows must expose reviewPacketPath.`);
      }
    }
  }
}

function expectAllStageMergeInputRefused(
  label: string,
  files: string[],
  outPath: string,
) {
  const result = mergeEvidence(files, outPath);
  if (result.status === 0) {
    fail(`${label} should be refused by the Library evidence merger.`);
  }
  if (!result.stderr.includes("All-stage review evidence cannot be used")) {
    fail(`${label} merge refusal did not explain the all-stage boundary.`);
  }
}

function expectFailingStage(label: string, filePath: string) {
  const result = validate(filePath);
  if (result.status === 0 || result.summary.valid !== false) {
    fail(`${label} should fail stage validation.`);
  }
  if ((result.summary.blockerCount || 0) < 1) {
    fail(`${label} should report at least one blocker.`);
  }
}

function main() {
  const standardBook = LIBRARY_BOOKS.find((book) => !isSensitiveBook(book));
  const sensitiveBook = LIBRARY_BOOKS.find(isSensitiveBook);
  if (!standardBook || !sensitiveBook) {
    fail("Could not find both standard and sensitive Library books.");
    return;
  }

  expectReviewBatchArtifactHasStableHashes();

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "nurai-library-stage-review-"),
  );
  try {
    const editorialPath = path.join(tempDir, "editorial.json");
    exportStageIntake("editorial-review", standardBook.id, editorialPath);
    const editorial = readIntake(editorialPath);
    editorial.records[0].editorialReviewer = "NurAI Editorial QA";
    editorial.records[0].editorialReviewedAt = reviewDate;
    editorial.records[0].editorialNotes =
      "Editorial review confirms the title, chapter sequence, audience fit, and tone are ready for this stage.";
    editorial.records[0].qualityChecklist.titleAndPromiseAccurate = true;
    editorial.records[0].qualityChecklist.chapterContentComplete = true;
    editorial.records[0].qualityChecklist.audienceAndToneApproved = true;
    writeIntake(editorialPath, editorial);
    expectPassingStage("editorial-review", editorialPath);
    expectStageImportRefused("editorial-review", editorialPath);

    const sourcePath = path.join(tempDir, "source-missing-check.json");
    exportStageIntake("source-relevance-review", standardBook.id, sourcePath);
    const source = readIntake(sourcePath);
    source.records[0].sourceReviewer = "NurAI Source QA";
    source.records[0].sourceReviewedAt = reviewDate;
    source.records[0].sourceNotes =
      "Source review confirms the cards are attached to nearby claims, while intentionally leaving one checklist field open.";
    source.records[0].qualityChecklist.sourcesRelevantAndSpecific = true;
    writeIntake(sourcePath, source);
    expectFailingStage("source-relevance-review missing checklist", sourcePath);
    source.records[0].qualityChecklist.noUnsupportedClaims = true;
    writeIntake(sourcePath, source);
    expectPassingStage("source-relevance-review", sourcePath);
    expectIncompleteCoverageMergeRefused(
      "incomplete stage evidence merge",
      [editorialPath, sourcePath],
      path.join(tempDir, "incomplete-merged.json"),
    );

    const qualityPath = path.join(tempDir, "quality.json");
    exportStageIntake("quality-checklist", standardBook.id, qualityPath);
    const quality = readIntake(qualityPath);
    for (const field of Object.keys(quality.records[0].qualityChecklist)) {
      quality.records[0].qualityChecklist[field] = true;
    }
    writeIntake(qualityPath, quality);
    expectPassingStage("quality-checklist", qualityPath);

    const publishPath = path.join(tempDir, "publish.json");
    exportStageIntake("publish-approval", standardBook.id, publishPath);
    const publish = readIntake(publishPath);
    publish.records[0].approvedForPublication = true;
    publish.records[0].publishApprover = "NurAI Publish QA";
    publish.records[0].publishApprovedAt = reviewDate;
    publish.records[0].publishNotes =
      "Publish approval confirms the current content hash may be imported only after prior stage evidence is merged.";
    writeIntake(publishPath, publish);
    expectPassingStage("publish-approval", publishPath);

    expectMergedEvidenceCandidate(
      "standard book stage evidence merge",
      [editorialPath, sourcePath, qualityPath, publishPath],
      path.join(tempDir, "merged.json"),
    );
    expectFinalReadinessRefused(
      "one-book merged evidence",
      path.join(tempDir, "merged.json"),
    );
    expectFinalReadinessSecretRefused(
      "one-book merged evidence with a secret-like note",
      path.join(tempDir, "merged.json"),
      path.join(tempDir, "merged-secret.json"),
    );
    expectWholeLibraryMergeRefused(
      "one-book final release merge",
      [editorialPath, sourcePath, qualityPath, publishPath],
      path.join(tempDir, "whole-library-merged.json"),
    );
    expectAllStageMergeInputRefused(
      "merged all-stage evidence",
      [path.join(tempDir, "merged.json")],
      path.join(tempDir, "remerged.json"),
    );
    expectMergeRefused(
      "duplicate editorial stage evidence",
      [editorialPath, editorialPath],
      path.join(tempDir, "duplicate-merged.json"),
    );

    const scholarPath = path.join(tempDir, "qualified-scholar.json");
    exportStageIntake(
      "qualified-scholar-review",
      sensitiveBook.id,
      scholarPath,
    );
    const scholar = readIntake(scholarPath);
    scholar.records[0].qualifiedScholarReviewer = "NurAI Scholar QA";
    scholar.records[0].qualifiedScholarReviewedAt = reviewDate;
    scholar.records[0].scholarReviewScope =
      "Reviewed the high-care religious scope, sensitivity boundaries, and limits of what the book may claim.";
    scholar.records[0].scholarNotes =
      "Scholar stage review confirms the sensitive sections stay within scoped educational guidance and avoid personal rulings.";
    writeIntake(scholarPath, scholar);
    expectPassingStage("qualified-scholar-review", scholarPath);

    const blankIntake = validate(
      "docs/audit/library-review-evidence.intake.json",
    );
    if (blankIntake.status === 0 || blankIntake.summary.valid !== false) {
      fail("Blank full-library intake should still fail complete validation.");
    }
    if (blankIntake.summary.stageValidationOnly !== false) {
      fail("Full-library intake must not be treated as stage-only evidence.");
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main();

const report = {
  ok: findings.length === 0,
  findings,
};

if (wantsSummaryJson) {
  console.log(JSON.stringify(report, null, 2));
} else if (report.ok) {
  console.log("Library staged review evidence validation check passed.");
} else {
  console.error("Library staged review evidence validation check failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
}

if (!report.ok) process.exit(1);
