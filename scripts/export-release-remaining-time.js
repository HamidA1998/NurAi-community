#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const outPath = argValue("--out", "docs/audit/RELEASE_REMAINING_TIME.md");
const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");
const wantsJson =
  process.argv.includes("--json") || process.argv.includes("--summary-json");

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function runJson(label, args) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      NURAI_SKIP_RELEASE_REMAINING_TIME_CHECK: "1",
    },
  });
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

function runGoalReport() {
  return runJson("check-goal-completion", [
    "scripts/check-goal-completion.js",
    "--json",
  ]);
}

function runSourcePackReport() {
  return runJson("check-source-pack-review-workflow", [
    "node_modules/tsx/dist/cli.mjs",
    "scripts/check-source-pack-review-workflow.ts",
  ]);
}

function estimateForAction(id, goal, sourcePacks) {
  const library = goal.libraryCompletion || {};
  const batches = goal.libraryAuditArtifacts?.reviewBatches || {};
  const sourcePackSummary = sourcePacks
    ? `${sourcePacks.verifiedCardCount ?? 0}/${sourcePacks.draftCardCount ?? 0}`
    : "0/32";
  switch (id) {
    case "deployed-runtime-url":
      return {
        owner: "Release operator with Railway access",
        estimate:
          "5-10 minutes after Railway login is refreshed and the production service has the matching smoke secret.",
        blocker:
          "Railway CLI is currently logged out locally; the deployed smoke endpoint returns 401 until NURAI_DEPLOYED_AI_SMOKE_SECRET is synced to Railway.",
        proof:
          "`npm run sync:railway-smoke-secret`, then `npm run check:ai-release:deployed`.",
      };
    case "production-database-url":
      return {
        owner: "Release operator with production Postgres/Supabase access",
        estimate:
          "15-30 minutes after the real DATABASE_URL is available on the release machine.",
        blocker:
          "DATABASE_URL is not available locally, so production target, migration, ownership, and applied-migration checks cannot run.",
        proof:
          "`npm run check:production-db-target`, `npm run apply:production-migrations -- --json`, `npm run apply:production-migrations -- --yes`, `npm run check:production-db-release`, and `npm run check:db-migrations-applied` with DATABASE_URL set.",
      };
    case "library-content-completion":
      return {
        owner:
          "Editorial/source reviewer and qualified scholar reviewer for sensitive books",
        estimate: `Code pipeline is ready, but real review timing depends on human availability. Expect days, not minutes, for ${
          library.bookCount ?? 60
        } books, including ${
          library.sensitiveBookCount ?? batches.sensitivePendingBookCount ?? 12
        } sensitive/high-care books that need qualified review scope.`,
        blocker: `The app has book content and packets, but ${
          library.booksWithReviewEvidenceCount ?? 0
        } book(s) have imported review evidence. The next batch is ${
          batches.nextBatchTitle || "the high-care scholar batch"
        } with ${batches.pendingBookCount ?? library.bookCount ?? 60} pending book(s), ${
          batches.missingEvidenceCount ?? "unknown"
        } missing evidence item(s), and batch hash ${
          batches.nextBatchHash || "not generated"
        }; this must not be faked.`,
        proof:
          "`npm run validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --strict --summary-json`, then `npm run apply:library-review-evidence -- --file ... --write`, then `npm run check:library-content-completion`.",
      };
    case "source-pack-activation-readiness":
      return {
        owner:
          "AI source reviewer, licensing reviewer, and qualified Islamic content reviewer",
        estimate: `Code workflow is ready, but real review timing depends on qualified reviewer availability. Expect a human review batch across ${sourcePackSummary} verified tafsir, hadith, fiqh, and seerah draft cards before activation can be claimed.`,
        blocker:
          "The repo contains hash-bound intake templates and review packets, but 0 of 32 source-pack draft cards have completed approval evidence; this must not be faked from generated handoff files.",
        proof:
          "`npm run check:source-pack-final-readiness -- --summary-json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json`, then `npm run check:ai-source-catalog`.",
      };
    default:
      return {
        owner: "Project owner",
        estimate: "Unknown until the live check gives a narrower blocker.",
        blocker: "No detailed estimate rule is defined for this item yet.",
        proof: "`npm run check:goal-completion -- --json`.",
      };
  }
}

function renderMarkdown(goal, sourcePacks) {
  const actions = Array.isArray(goal.nextActionDetails)
    ? goal.nextActionDetails
    : [];
  const external = goal.externalRelease || {};
  const library = goal.libraryCompletion || {};
  const lines = [
    "# NurAI Remaining Release Time",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This is a non-secret estimate generated from the current release and goal checks. It is not a substitute for passing the verification commands.",
    "",
    "## Current Status",
    "",
    `- Goal complete: ${goal.ok ? "yes" : "no"}`,
    `- External release blockers: ${external.blockerCount ?? "unknown"}`,
    `- Library blockers: ${library.blockerCount ?? "unknown"}`,
    `- Books in library gate: ${library.bookCount ?? "unknown"}`,
    `- Books with review evidence: ${library.booksWithReviewEvidenceCount ?? "unknown"}`,
    `- Highest-standard book claim ready: ${
      library.readyForHighestStandardClaim ? "yes" : "no"
    }`,
    "",
    "## Remaining Work And Time",
    "",
    "## Cleared External Gate Watch",
    "",
    "- deployed-runtime-url: currently clear. If it regresses, expected fix time is 5-10 minutes after Railway login is refreshed and the production service has the matching smoke secret.",
    "- production-database-url: currently clear. If it regresses, expected fix time is 15-30 minutes after the real DATABASE_URL is available on the release machine or the Railway in-service proof path is reachable.",
    "",
  ];

  if (!actions.length) {
    lines.push("No remaining release actions are currently reported.");
  }

  for (const action of actions) {
    const estimate = estimateForAction(action.id, goal, sourcePacks);
    lines.push(`### ${action.id}`, "");
    lines.push(action.message || "Action required.", "");
    lines.push(`- Owner: ${estimate.owner}`);
    lines.push(`- Estimate: ${estimate.estimate}`);
    lines.push(`- Current blocker: ${estimate.blocker}`);
    lines.push(`- Proof command: ${estimate.proof}`);
    const ownerActions = Array.isArray(action.ownerAction)
      ? action.ownerAction
      : [];
    if (ownerActions.length) {
      lines.push("- Required steps:");
      for (const [index, item] of ownerActions.entries()) {
        lines.push(`  ${index + 1}. ${item}`);
      }
    }
    lines.push("");
  }

  if (sourcePacks) {
    lines.push("## AI Source Pack Readiness", "");
    lines.push(`- Domains: ${sourcePacks.domainCount}`);
    lines.push(`- Draft source cards: ${sourcePacks.draftCardCount}`);
    lines.push(`- Verified source cards: ${sourcePacks.verifiedCardCount}`);
    lines.push(
      `- Activation-ready domains: ${
        sourcePacks.activationReadyDomains?.length
          ? sourcePacks.activationReadyDomains.join(", ")
          : "none"
      }`,
    );
    lines.push(
      "- Estimate: the code workflow is ready now; real activation depends on qualified review evidence for tafsir, hadith, fiqh, and seerah draft cards.",
    );
    lines.push(
      "- Final readiness proof: `npm run check:source-pack-final-readiness -- --summary-json` with completed domain evidence files before claiming source packs are verified or activation-ready.",
    );
    lines.push("");
  }

  lines.push("## Final Release Proof", "");
  lines.push("The release can be called complete only after:");
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
  lines.push("npm run check:goal-completion");
  lines.push("```");

  return lines.join("\n");
}

function normalize(markdown) {
  return String(markdown).replace(
    /^Generated: .+$/m,
    "Generated: <normalized>",
  );
}

function main() {
  const goal = runGoalReport();
  let sourcePacks = null;
  try {
    sourcePacks = runSourcePackReport();
  } catch {
    sourcePacks = null;
  }
  const markdown = `${renderMarkdown(goal, sourcePacks)}\n`;
  const resolved = path.resolve(process.cwd(), outPath);

  if (wantsWrite) {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, markdown);
  }

  const findings = [];
  if (wantsCheck) {
    if (!fs.existsSync(resolved)) {
      findings.push(`${outPath} is missing.`);
    } else {
      const existing = fs.readFileSync(resolved, "utf8");
      if (normalize(existing) !== normalize(markdown)) {
        findings.push(
          `${outPath} is stale; run npm run export:release-remaining-time -- --write.`,
        );
      }
    }
  }

  if (wantsJson) {
    console.log(
      JSON.stringify(
        {
          ok: findings.length === 0,
          outPath,
          written: wantsWrite,
          checked: wantsCheck,
          findings,
          goalComplete: Boolean(goal.ok),
          nextRequiredActions: goal.nextRequiredActions || [],
          externalBlockerCount: goal.externalRelease?.blockerCount ?? null,
          libraryBlockerCount: goal.libraryCompletion?.blockerCount ?? null,
          sourcePacks,
        },
        null,
        2,
      ),
    );
  } else if (wantsCheck) {
    if (findings.length) {
      console.error(findings.join("\n"));
      process.exit(1);
    }
    console.log(`Release remaining-time estimate is current at ${outPath}.`);
  } else if (wantsWrite) {
    console.log(`Release remaining-time estimate written to ${outPath}.`);
  } else {
    console.log(markdown);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
