#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const outPath = argValue("--out", "docs/audit/RELEASE_COCKPIT.md");
const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");
const wantsJson =
  process.argv.includes("--json") || process.argv.includes("--summary-json");
const wantsMarkdown = process.argv.includes("--markdown") || !wantsJson;

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function parseJson(label, result) {
  const stdout = String(result.stdout || "").trim();
  if (!stdout) {
    throw new Error(
      `${label} did not emit JSON. exitCode=${result.status}; stderr=${String(
        result.stderr || "",
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

function loadGoalReport() {
  if (process.env.NURAI_GOAL_COMPLETION_REPORT_JSON) {
    return JSON.parse(process.env.NURAI_GOAL_COMPLETION_REPORT_JSON);
  }

  const result = spawnSync(
    process.execPath,
    ["scripts/check-goal-completion.js", "--json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        NURAI_SKIP_RELEASE_COCKPIT_CHECK: "1",
      },
    },
  );
  return parseJson("check-goal-completion", result);
}

function gateLane(id) {
  if (id === "deployed-runtime-url" || id === "production-database-url") {
    return "External account";
  }
  return "Human review";
}

function gateStartCommand(id, goal) {
  const libraryBatches = goal.libraryAuditArtifacts?.reviewBatches || {};
  switch (id) {
    case "deployed-runtime-url":
      return "npm run sync:railway-smoke-secret";
    case "production-database-url":
      return "npm run check:production-db-proof-plan";
    case "source-pack-activation-readiness":
      return "npm run export:source-pack-review-handoff -- --write";
    case "library-content-completion":
      return libraryBatches.nextBatchId
        ? `npm run export:library-review-batches -- --write`
        : "npm run export:library-review-evidence-intake -- --write";
    default:
      return "npm run check:goal-completion -- --summary-json";
  }
}

function gateProofCommand(action) {
  const commands = Array.isArray(action.verificationCommands)
    ? action.verificationCommands
    : [];
  return (
    [...commands]
      .reverse()
      .find((command) => command.includes("check:goal-completion")) ||
    [...commands]
      .reverse()
      .find((command) => command.includes("check:release-blockers")) ||
    commands[commands.length - 1] ||
    "npm run check:goal-completion -- --summary-json"
  );
}

function gateNoSecretBoundary(action) {
  return (
    action.noSecretBoundary ||
    "Keep proof notes non-secret; do not paste private reviewer data, credentials, cookies, tokens, copied source text, or private account payloads."
  );
}

function gateCurrentSignal(id, goal) {
  const external = goal.externalRelease || {};
  const sourcePack = goal.sourcePackFinalReadiness || {};
  const library = goal.libraryCompletion || {};
  const batches = goal.libraryAuditArtifacts?.reviewBatches || {};

  switch (id) {
    case "deployed-runtime-url":
      return external.blockedIds?.includes(id)
        ? "Deployed smoke is still blocked; current failure is the guarded smoke endpoint accepting no release proof yet."
        : "External runtime gate is no longer listed as blocked.";
    case "production-database-url":
      return external.blockedIds?.includes(id)
        ? "Production DATABASE_URL proof is missing; target, migration, ownership, and applied-migration checks are unproven."
        : "Production database gate is no longer listed as blocked.";
    case "source-pack-activation-readiness":
      return `${sourcePack.approvedDraftCardCount ?? 0}/${sourcePack.draftCardCount ?? 32} draft source cards approved; activation claim remains locked.`;
    case "library-content-completion":
      return `${library.booksWithReviewEvidenceCount ?? 0}/${library.bookCount ?? 60} books have imported review evidence; next batch ${
        batches.nextBatchTitle || "not selected"
      } has ${batches.missingEvidenceCount ?? "unknown"} missing evidence item(s).`;
    default:
      return "See check:goal-completion for the current evidence signal.";
  }
}

function renderMarkdown(goal) {
  const actions = Array.isArray(goal.nextActionDetails)
    ? goal.nextActionDetails
    : [];
  const external = goal.externalRelease || {};
  const library = goal.libraryCompletion || {};
  const sourcePack = goal.sourcePackFinalReadiness || {};
  const releaseEvidence = goal.releaseExternalEvidence || {};

  const lines = [
    "# NurAI Release Cockpit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This generated cockpit is the short operator view of `npm run check:goal-completion`. It is non-secret planning evidence only; it is not release approval.",
    "",
    "## Current Verdict",
    "",
    `- Goal complete: ${goal.ok ? "yes" : "no"}`,
    `- External blockers: ${external.blockerCount ?? "unknown"}`,
    `- Human-review blockers: ${
      goal.humanReviewFinalReadiness?.blockerCount ?? "unknown"
    }`,
    `- Source-pack approvals: ${sourcePack.approvedDraftCardCount ?? 0}/${sourcePack.draftCardCount ?? "unknown"}`,
    `- Library review evidence: ${library.booksWithReviewEvidenceCount ?? 0}/${library.bookCount ?? "unknown"} books`,
    `- External evidence intake valid: ${releaseEvidence.valid ? "yes" : "no"}`,
    "",
  ];

  if (!actions.length) {
    lines.push("No next actions are currently reported.");
  } else {
    lines.push("## Operator Queue", "");
    lines.push(
      "| Order | Gate | Lane | Start here | Proof that clears it | Current signal |",
    );
    lines.push("| --- | --- | --- | --- | --- | --- |");
    actions.forEach((action, index) => {
      lines.push(
        `| ${index + 1} | ${action.id} | ${gateLane(action.id)} | \`${gateStartCommand(action.id, goal)}\` | \`${gateProofCommand(action)}\` | ${gateCurrentSignal(action.id, goal)} |`,
      );
    });
    lines.push("");

    lines.push("## No-Secret Boundaries", "");
    for (const action of actions) {
      lines.push(`- ${action.id}: ${gateNoSecretBoundary(action)}`);
    }
    lines.push("");
  }

  lines.push("## Cleared External Gates", "");
  lines.push(
    "- deployed-runtime-url: external runtime gate is currently clear; keep `npm run check:ai-release:deployed` in the final proof commands so the deployed smoke cannot silently regress.",
  );
  lines.push(
    "- production-database-url: production database gate is currently clear; keep `npm run check:production-db-release` and `npm run check:db-migrations-applied` in the final proof commands so DB proof cannot silently regress.",
  );
  lines.push("");

  lines.push("## Evidence Capture Rules", "");
  lines.push(
    "- Passing external account commands must be captured with `npm run export:release-command-result -- --gate-id ...` and pasted into `docs/audit/release-external-evidence.intake.json` only after redaction.",
  );
  lines.push(
    "- Human review gates require real reviewer evidence files outside the repo before any apply command can turn that evidence into release proof.",
  );
  lines.push(
    "- Generated packets, review queues, smoke failures, and local checks are useful handoff material, not approval evidence.",
  );
  lines.push("");

  lines.push("## Final Proof Commands", "");
  lines.push(
    "The goal can be called complete only after these pass with current evidence:",
  );
  lines.push("");
  lines.push("```bash");
  lines.push("npm run check:ai-release:deployed");
  lines.push(
    "DATABASE_URL=postgresql://... npm run check:production-db-release",
  );
  lines.push(
    "DATABASE_URL=postgresql://... npm run check:db-migrations-applied",
  );
  lines.push(
    "npm run check:human-review-final-readiness -- --summary-json --library-file /absolute/path/to/merged-library-review-evidence.json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
  );
  lines.push("npm run check:library-content-completion");
  lines.push("npm run check:goal-completion -- --summary-json");
  lines.push("```");

  return `${lines.join("\n")}\n`;
}

function normalize(markdown) {
  return String(markdown).replace(
    /^Generated: .+$/m,
    "Generated: <normalized>",
  );
}

function checkCurrent(markdown) {
  const resolved = path.resolve(process.cwd(), outPath);
  if (!fs.existsSync(resolved)) {
    return { ok: false, findings: [`${outPath} is missing.`] };
  }
  const existing = fs.readFileSync(resolved, "utf8");
  if (normalize(existing) !== normalize(markdown)) {
    return {
      ok: false,
      findings: [
        `${outPath} is stale; run npm run export:release-cockpit -- --write.`,
      ],
    };
  }
  return { ok: true, findings: [] };
}

function main() {
  const goal = loadGoalReport();
  const markdown = renderMarkdown(goal);
  const resolved = path.resolve(process.cwd(), outPath);

  if (wantsWrite) {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, markdown);
  }

  const check = wantsCheck ? checkCurrent(markdown) : null;

  if (wantsJson) {
    console.log(
      JSON.stringify(
        {
          ok: check ? check.ok : Boolean(goal.ok),
          outPath,
          written: wantsWrite,
          checked: wantsCheck,
          goalComplete: Boolean(goal.ok),
          nextRequiredActions: goal.nextRequiredActions || [],
          externalBlockerCount: goal.externalRelease?.blockerCount ?? null,
          humanReviewBlockerCount:
            goal.humanReviewFinalReadiness?.blockerCount ?? null,
          findings: check ? check.findings : [],
        },
        null,
        2,
      ),
    );
    if (check && !check.ok) process.exit(1);
    return;
  }

  if (wantsCheck && !check?.ok) {
    console.error(check?.findings.join("\n") || "Release cockpit is stale.");
    process.exit(1);
  }

  if (wantsCheck) {
    console.log(`Release cockpit is current at ${outPath}.`);
    return;
  }

  if (wantsMarkdown) {
    if (wantsWrite) {
      console.log(`Release cockpit written to ${outPath}.`);
    } else {
      process.stdout.write(markdown);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
