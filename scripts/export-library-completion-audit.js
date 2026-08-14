#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const wantsJson = process.argv.includes("--json");
const wantsSummaryJson = process.argv.includes("--summary-json");
const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");
const outPath = argValue("--out", "docs/audit/LIBRARY_COMPLETION_AUDIT.md");

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function runJson(label, args) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(npx, ["tsx", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
  });

  const stdout = (result.stdout || "").trim();
  if (!stdout) {
    throw new Error(
      `${label} did not emit JSON. exitCode=${result.status}; stderr=${(
        result.stderr || ""
      ).trim()}`,
    );
  }

  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `${label} emitted invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function bookIdForFinding(finding) {
  return String(finding.id || "")
    .split(":")[0]
    .split("/")[0];
}

function buildReport() {
  const completion = runJson("check-library-content-completion", [
    "scripts/check-library-content-completion.ts",
    "--json",
  ]);
  const queue = runJson("export-library-review-queue", [
    "scripts/export-library-review-queue.ts",
    "--json",
  ]);
  const findings = Array.isArray(completion.findings)
    ? completion.findings
    : [];
  const findingsByBook = findings.reduce((groups, finding) => {
    const bookId = bookIdForFinding(finding);
    if (!bookId) return groups;
    if (!groups[bookId]) groups[bookId] = [];
    groups[bookId].push(finding);
    return groups;
  }, {});

  const rows = (queue.rows || []).map((book) => {
    const bookFindings = findingsByBook[book.id] || [];
    const blockers = bookFindings.filter(
      (finding) => finding.severity === "blocker",
    );
    const warnings = bookFindings.filter(
      (finding) => finding.severity === "warning",
    );
    return {
      ...book,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      blockers,
      warnings,
      publishDecision:
        blockers.length === 0
          ? "Eligible for publish decision after final human review evidence is attached."
          : "Do not mark published yet.",
    };
  });

  return {
    ok: Boolean(completion.ok),
    readyForHighestStandardClaim: Boolean(
      completion.readyForHighestStandardClaim,
    ),
    summary: {
      bookCount: completion.bookCount,
      chapterCount: completion.chapterCount,
      sourceRefCount: completion.sourceRefCount,
      templateChapterCount: completion.templateChapterCount,
      sensitiveBookCount: completion.sensitiveBookCount,
      booksWithReviewEvidenceCount: completion.booksWithReviewEvidenceCount,
      publishedBooksMissingReviewEvidenceCount:
        completion.publishedBooksMissingReviewEvidenceCount,
      bookMetadataIssueCount: completion.bookMetadataIssueCount,
      chapterStructureIssueCount: completion.chapterStructureIssueCount,
      sourceDiversityWarningCount: completion.sourceDiversityWarningCount,
      repeatedSourceSetWarningCount: completion.repeatedSourceSetWarningCount,
      reusedSourceNoteWarningCount: completion.reusedSourceNoteWarningCount,
      authoredContentComplete: completion.authoredContentComplete,
      authoredContentBlockerCount: completion.authoredContentBlockerCount,
      reviewPublicationBlockerCount: completion.reviewPublicationBlockerCount,
      blockerCount: completion.blockerCount,
      warningCount: completion.warningCount,
      statusCounts: completion.statusCounts,
      planCounts: completion.planCounts,
      priorityCounts: queue.summary?.priorityCounts || {},
    },
    rows,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# NurAI Library Completion Audit",
    "",
    `Status: ${report.ok ? "ready" : "blocked"}`,
    `Ready for highest-standard claim: ${
      report.readyForHighestStandardClaim ? "yes" : "no"
    }`,
    `Authored content complete: ${report.summary.authoredContentComplete ? "yes" : "no"}`,
    `Books: ${report.summary.bookCount}`,
    `Chapters: ${report.summary.chapterCount}`,
    `Source refs: ${report.summary.sourceRefCount}`,
    `Template chapters: ${report.summary.templateChapterCount}`,
    `Sensitive/high-care books: ${report.summary.sensitiveBookCount}`,
    `Books with review evidence: ${report.summary.booksWithReviewEvidenceCount}`,
    `Published books missing review evidence: ${report.summary.publishedBooksMissingReviewEvidenceCount}`,
    `Book metadata/title issues: ${report.summary.bookMetadataIssueCount}`,
    `Chapter structure issues: ${report.summary.chapterStructureIssueCount}`,
    `Low source-diversity warnings: ${report.summary.sourceDiversityWarningCount}`,
    `Repeated source-set warnings: ${report.summary.repeatedSourceSetWarningCount}`,
    `Reused source-note warnings: ${report.summary.reusedSourceNoteWarningCount}`,
    `Authored-content blockers: ${report.summary.authoredContentBlockerCount}`,
    `Review/publication blockers: ${report.summary.reviewPublicationBlockerCount}`,
    `Blockers: ${report.summary.blockerCount}`,
    `Warnings: ${report.summary.warningCount}`,
    "",
    "## Verdict",
    "",
  ];

  if (report.readyForHighestStandardClaim) {
    lines.push(
      "The library completion gate is passing. Books may still need normal release review, but there are no strict completion blockers.",
    );
  } else {
    lines.push(
      "The library must not be marketed as fully reviewed, fully published, scholar-reviewed, or highest-standard complete yet.",
    );
  }

  lines.push("", "## Per-Book Review Queue", "");
  for (const row of report.rows) {
    lines.push(`### ${row.title}`, "");
    lines.push(`- ID: ${row.id}`);
    lines.push(`- Plan: ${row.plan}`);
    lines.push(`- Category: ${row.category}`);
    lines.push(`- Status: ${row.status}`);
    lines.push(`- Priority: ${row.priority}`);
    lines.push(`- Sensitive/high-care: ${row.sensitive ? "yes" : "no"}`);
    lines.push(`- Chapters: ${row.chapters}`);
    lines.push(`- Source refs: ${row.sourceRefs}`);
    lines.push(`- Blockers: ${row.blockerCount}`);
    lines.push(`- Warnings: ${row.warningCount}`);
    if (row.reviewEvidence) {
      const scholarEvidence = row.reviewEvidence.qualifiedScholarRequired
        ? row.reviewEvidence.qualifiedScholarComplete
          ? "yes"
          : "no"
        : "not required";
      lines.push(
        `- Review evidence: editorial=${row.reviewEvidence.editorial ? "yes" : "no"}, source=${row.reviewEvidence.source ? "yes" : "no"}, qualified scholar=${scholarEvidence}, publish=${row.reviewEvidence.publish ? "yes" : "no"}`,
      );
    }
    lines.push(`- Publish decision: ${row.publishDecision}`);
    lines.push(`- Required review tasks: ${row.reviewTasks.join(", ")}`);
    if (row.blockers.length) {
      lines.push("", "Blockers:");
      for (const blocker of row.blockers) {
        lines.push(`- ${blocker.message}`);
      }
    }
    if (row.warnings.length) {
      lines.push("", "Warnings:");
      for (const warning of row.warnings) {
        lines.push(`- ${warning.message}`);
      }
    }
    lines.push("");
  }

  lines.push("## Verification", "");
  lines.push("```bash");
  lines.push("npm run check:library");
  lines.push("npm run check:library-content-completion");
  lines.push("npm run export:library-completion-audit -- --check");
  lines.push("npm run check:goal-completion");
  lines.push("```");

  return lines.join("\n");
}

function checkCurrent(markdown) {
  const resolved = path.resolve(process.cwd(), outPath);
  if (!fs.existsSync(resolved)) {
    return {
      ok: false,
      findings: [`Missing library completion audit artifact: ${outPath}`],
    };
  }
  const existing = fs.readFileSync(resolved, "utf8");
  if (existing !== markdown) {
    return {
      ok: false,
      findings: [
        `${outPath} is stale; run npm run export:library-completion-audit -- --write.`,
      ],
    };
  }
  return { ok: true, findings: [] };
}

function main() {
  const report = buildReport();
  const markdown = renderMarkdown(report);
  if (wantsWrite) {
    fs.mkdirSync(path.dirname(path.resolve(process.cwd(), outPath)), {
      recursive: true,
    });
    fs.writeFileSync(path.resolve(process.cwd(), outPath), markdown);
  }
  const artifactCheck = wantsCheck ? checkCurrent(markdown) : null;
  if (wantsSummaryJson) {
    console.log(
      JSON.stringify(
        {
          ok: artifactCheck ? artifactCheck.ok : report.ok,
          outPath,
          written: wantsWrite,
          checked: wantsCheck,
          findings: artifactCheck ? artifactCheck.findings : [],
          completionOk: report.ok,
          readyForHighestStandardClaim: report.readyForHighestStandardClaim,
          summary: report.summary,
        },
        null,
        2,
      ),
    );
    if (artifactCheck && !artifactCheck.ok) process.exit(1);
    return;
  }
  if (wantsJson) {
    console.log(
      JSON.stringify(
        {
          ...report,
          artifact: {
            ok: artifactCheck ? artifactCheck.ok : report.ok,
            outPath,
            written: wantsWrite,
            checked: wantsCheck,
            findings: artifactCheck ? artifactCheck.findings : [],
          },
        },
        null,
        2,
      ),
    );
    if (artifactCheck && !artifactCheck.ok) process.exit(1);
    return;
  }
  if (wantsCheck) {
    if (!artifactCheck?.ok) {
      console.error(
        artifactCheck?.findings.join("\n") ||
          "Library completion audit check failed.",
      );
      process.exit(1);
    }
    console.log(`Library completion audit is current at ${outPath}.`);
    return;
  }
  if (wantsWrite) {
    console.log(`Wrote ${outPath}.`);
    return;
  }
  console.log(markdown);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
