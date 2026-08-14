#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  GATE_REQUIREMENTS,
} = require("./lib/releaseExternalEvidenceRequirements");

const wantsJson =
  process.argv.includes("--json") || process.argv.includes("--summary-json");
const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");
const wantsMarkdown =
  process.argv.includes("--markdown") || (!wantsJson && !wantsCheck);
const outPath = argValue("--out", "docs/audit/RELEASE_OWNER_ACTIONS.md");

const ACTION_PROFILES = {
  "deployed-runtime-url": {
    owner: "Release operator with production host/Railway access",
    lane: "External account gate",
    currentBlocker:
      "The deployed server exists, but the guarded deployed AI smoke proof is not accepted yet.",
    evidenceRequired: [
      "The production HTTPS host is the same runtime used by the App Store build.",
      "`/api/ai/status` is public, redacted, and reports OpenAI cloud configuration.",
      "`/api/admin/ai/diagnostics` returns 401 without admin credentials.",
      "`/api/admin/ai/smoke` accepts the release smoke secret and returns a tiny deployed OpenAI completion.",
    ],
    completionCriteria: [
      "`npm run check:ai-release:deployed` passes against the real production host.",
      "`npm run check:release-blockers -- --json` no longer lists `deployed-runtime-url`.",
      "The pass evidence is recorded in `docs/audit/release-external-evidence.intake.json` and validated.",
    ],
    guardrail:
      "Do not claim deployed AI is production-verified while the smoke endpoint returns 401, 404, or any non-passing release-gate result.",
  },
  "production-database-url": {
    owner: "Release operator with production Supabase/Postgres access",
    lane: "External account gate",
    currentBlocker:
      "The real production DATABASE_URL is not available to the release verifier, so production target, migration, and ownership checks cannot prove the DB state.",
    evidenceRequired: [
      "The non-secret production DB proof plan is current, with migration hashes recorded before credentials are used.",
      "The `DATABASE_URL` targets the known NurAI Supabase project and includes a real password without being committed.",
      "The production DB target check passes before any SQL is applied.",
      "The migration dry run is reviewed, the apply command succeeds, and applied-migration checks pass.",
      "Conversation ownership checks pass after migration work.",
    ],
    completionCriteria: [
      "`check:production-db-target`, `apply:production-migrations -- --yes`, `check:production-db-release`, and `check:db-migrations-applied` pass with the production URL.",
      "`npm run check:release-blockers -- --json` no longer lists `production-database-url`.",
      "The pass evidence is recorded in `docs/audit/release-external-evidence.intake.json` and validated.",
    ],
    guardrail:
      "Do not paste the database URL into docs, logs, screenshots, or committed files, and do not apply SQL until the target check proves the intended production project.",
  },
  "library-content-completion": {
    owner:
      "Editorial reviewer, source reviewer, and qualified scholar reviewer for high-care books",
    lane: "Human review gate",
    currentBlocker:
      "All books have review packets, but no real review/sign-off evidence has been imported for the current content hashes.",
    evidenceRequired: [
      "Every published book has real reviewer names, dates, review notes, current content hash, and publication approval.",
      "Every quality checklist item is complete for published books.",
      "High-care/sensitive books include qualified-scholar reviewer details and scope notes.",
      "Source relevance is confirmed by a human reviewer, not only URL/source-shape validation.",
    ],
    completionCriteria: [
      "`validate:library-review-evidence` passes on a real external evidence file.",
      "`apply:library-review-evidence -- --write` imports only validated evidence.",
      "`check:library-content-completion` and `check:goal-completion` pass without review/publication blockers.",
    ],
    evidenceCaptureChecklist: [
      "Export the Library review evidence intake template before collecting human sign-off.",
      "Validate the external evidence file in strict mode before importing anything.",
      "Keep reviewer contact details, private notes, and unpublished drafts outside committed files.",
      "Rebuild the Library signoff ledger and completion audit after approved evidence is imported.",
    ],
    proofCommands: [
      "npm run export:library-review-batches -- --write",
      "npm run export:library-review-packets -- --all",
      "npm run export:library-review-evidence-intake -- --write",
      "npm run validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --strict --summary-json",
      "npm run check:human-review-final-readiness -- --summary-json --library-file /absolute/path/to/merged-library-review-evidence.json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
      "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --summary-json",
      "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --write",
      "npm run export:library-review-signoff-ledger -- --write",
      "npm run export:library-completion-audit -- --write",
      "npm run check:library-content-completion -- --summary-json",
      "npm run check:goal-completion -- --summary-json",
    ],
    guardrail:
      "Do not describe books as fully reviewed, reviewed by qualified scholars, published, or highest-standard complete until this human evidence gate passes.",
  },
  "source-pack-activation-readiness": {
    owner:
      "AI source reviewer, licensing reviewer, and qualified Islamic content reviewer",
    lane: "Human review gate",
    currentBlocker:
      "The tafsir, hadith, fiqh, and seerah source-pack intakes are hash-bound and valid templates, but none of the 32 draft cards has real activation approval evidence yet.",
    evidenceRequired: [
      "Every draft source card has current sourceCardHash evidence and real reviewer identity, qualification, dates, notes, licensing evidence, and reviewed explanation text.",
      "Every domain evidence file passes its validator with --require-approved.",
      "Final readiness reports zero secret-like evidence values.",
      "Every activation importer dry-runs successfully before any write command is used.",
    ],
    completionCriteria: [
      "`check:source-pack-final-readiness` passes on the completed tafsir, hadith, fiqh, and seerah evidence files.",
      "`check:ai-source-catalog` still passes after activation evidence is reviewed.",
      "`check:goal-completion` no longer lists `source-pack-activation-readiness`.",
    ],
    evidenceCaptureChecklist: [
      "Complete evidence files outside the repo from the current source-review intake templates.",
      "Keep source-pack cards inactive until final readiness passes.",
      "Inspect dry-run activation output before any confirmed write.",
      "Never paste credentials, authorization headers, private reviewer contact data, or copied source text into evidence.",
    ],
    proofCommands: [
      "npm run check:source-pack-final-readiness -- --summary-json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
      "npm run check:human-review-final-readiness -- --summary-json --library-file /absolute/path/to/merged-library-review-evidence.json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
      "npm run check:ai-source-catalog",
      "npm run check:goal-completion -- --summary-json",
    ],
    guardrail:
      "Do not claim source packs are verified, reviewed by qualified scholars, or active in NurAI answers until real evidence passes final readiness.",
  },
};

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function parseGoalReport() {
  if (process.env.NURAI_GOAL_COMPLETION_REPORT_JSON) {
    return JSON.parse(process.env.NURAI_GOAL_COMPLETION_REPORT_JSON);
  }

  const result = spawnSync(
    process.execPath,
    ["scripts/check-goal-completion.js", "--json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
    },
  );

  const stdout = (result.stdout || "").trim();
  if (!stdout) {
    throw new Error(
      `check-goal-completion did not emit JSON. exitCode=${result.status}; stderr=${(
        result.stderr || ""
      ).trim()}`,
    );
  }

  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `check-goal-completion emitted invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function profileForAction(action) {
  return (
    ACTION_PROFILES[action.id] || {
      owner: "Project owner",
      lane: "Release gate",
      currentBlocker: action.message || "Action required.",
      evidenceRequired: [
        "Passing command output from the relevant release gate.",
      ],
      completionCriteria: [
        "The action no longer appears in `check:goal-completion -- --json`.",
      ],
      guardrail:
        "Do not mark the goal complete until the live gate passes with current evidence.",
    }
  );
}

function shellQuote(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildCommandResultTemplates(gateId, commands) {
  if (!GATE_REQUIREMENTS[gateId]) return [];
  return commands.map((command) => {
    const note =
      gateId === "deployed-runtime-url"
        ? "Passing deployed runtime proof captured from redacted status, diagnostics, smoke, and release blocker output."
        : command.includes("production-db-proof-plan")
          ? "Non-secret production database proof plan matched the current migration hash set before credentials were used."
          : command.includes("check:release-blockers")
            ? "Release blocker check passed after this gate cleared, with no secrets or private account payloads included."
            : "Production database command passed with redacted summary output and no connection string or private data included.";
    return `npm run export:release-command-result -- --gate-id ${gateId} --command ${shellQuote(command)} --exit-code 0 --summary-json-file /absolute/path/to/redacted-summary.json --notes ${shellQuote(note)}`;
  });
}

function buildResolutionPlan(report) {
  const actions = Array.isArray(report.nextActionDetails)
    ? report.nextActionDetails
    : [];
  return actions.map((action) => {
    const profile = profileForAction(action);
    const canonicalRequirement = GATE_REQUIREMENTS[action.id];
    return {
      id: action.id,
      lane: profile.lane,
      owner: profile.owner,
      message: action.message || "Action required.",
      currentBlocker: profile.currentBlocker,
      evidenceRequired: profile.evidenceRequired,
      completionCriteria: profile.completionCriteria,
      acceptanceChecklist:
        canonicalRequirement?.acceptanceChecklist?.slice() || [],
      evidenceCaptureChecklist:
        canonicalRequirement?.evidenceCaptureChecklist?.slice() ||
        profile.evidenceCaptureChecklist?.slice() ||
        [],
      noSecretBoundary: canonicalRequirement?.noSecretBoundary || "",
      canonicalProofCommands:
        canonicalRequirement?.verificationCommands?.slice() ||
        profile.proofCommands?.slice() ||
        [],
      commandResultTemplates: buildCommandResultTemplates(
        action.id,
        canonicalRequirement?.verificationCommands?.slice() || [],
      ),
      guardrail: profile.guardrail,
      ownerAction: Array.isArray(action.ownerAction) ? action.ownerAction : [],
    };
  });
}

function firstProofCommand(item) {
  return (
    item.canonicalProofCommands[0] ||
    item.completionCriteria[0] ||
    "Re-run the matching release gate."
  );
}

function completionProofCommand(item) {
  return (
    [...item.canonicalProofCommands]
      .reverse()
      .find((command) => command.includes("check:goal-completion")) ||
    [...item.canonicalProofCommands]
      .reverse()
      .find((command) => command.includes("check:release-blockers")) ||
    item.canonicalProofCommands[item.canonicalProofCommands.length - 1] ||
    "Confirm this gate no longer appears in `npm run check:goal-completion -- --json`."
  );
}

function renderMarkdown(report) {
  const actions = buildResolutionPlan(report);
  const external = report.externalRelease || {};
  const library = report.libraryCompletion || {};
  const lines = [
    "# NurAI Release Owner Actions",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This file is generated from the live `npm run check:goal-completion` evidence. It is a non-secret owner checklist, not proof that the gates are complete.",
    "",
    `Status: ${report.ok ? "complete" : "blocked"}`,
    `External blockers: ${external.blockerCount ?? "unknown"}`,
    `Library blockers: ${library.blockerCount ?? "unknown"}`,
    `Library warnings: ${library.warningCount ?? "unknown"}`,
    `Books: ${library.bookCount ?? "unknown"}`,
    `Chapters: ${library.chapterCount ?? "unknown"}`,
    `Source refs: ${library.sourceRefCount ?? "unknown"}`,
    `Books with review evidence: ${library.booksWithReviewEvidenceCount ?? "unknown"}`,
    `Books ready for highest-standard claim: ${library.readyForHighestStandardClaim ? "yes" : "no"}`,
    "",
  ];

  if (!actions.length) {
    lines.push("No owner actions are currently required.");
    return lines.join("\n");
  }

  lines.push("## Resolution Matrix", "");
  lines.push("| Gate | Lane | Owner | Completion rule |");
  lines.push("| --- | --- | --- | --- |");
  for (const item of actions) {
    lines.push(
      `| ${item.id} | ${item.lane} | ${item.owner} | ${item.completionCriteria[0]} |`,
    );
  }
  lines.push("");

  lines.push("## First Pass Execution Order", "");
  lines.push(
    "Use this as the release operator's first pass before editing evidence files. Each row starts with the lowest-risk command or collection step, then names the proof that must exist before the gate can be marked clear.",
    "",
  );
  lines.push(
    "| Order | Gate | Start here | Completion proof | No-secret checkpoint |",
  );
  lines.push("| --- | --- | --- | --- | --- |");
  actions.forEach((item, index) => {
    const noSecretCheckpoint =
      item.noSecretBoundary ||
      item.guardrail ||
      "Keep reviewer notes and proof summaries non-secret.";
    lines.push(
      `| ${index + 1} | ${item.id} | \`${firstProofCommand(item)}\` | \`${completionProofCommand(item)}\` | ${noSecretCheckpoint} |`,
    );
  });
  lines.push(
    "",
    "First pass rule: do not paste credentials, reviewer private contact data, full response payloads, SQL containing private user data, or copied source text into the repo. If a command fails, keep the gate blocked and update only non-secret notes.",
    "",
  );

  lines.push("## Required Actions", "");
  for (const item of actions) {
    lines.push(`### ${item.id}`, "");
    lines.push(item.message || "Action required.", "");
    lines.push(`Owner: ${item.owner}`);
    lines.push(`Lane: ${item.lane}`);
    lines.push(`Current blocker: ${item.currentBlocker}`);
    lines.push("");
    lines.push("Evidence required:");
    for (const evidence of item.evidenceRequired) {
      lines.push(`- ${evidence}`);
    }
    lines.push("");
    lines.push("Completion criteria:");
    for (const criterion of item.completionCriteria) {
      lines.push(`- ${criterion}`);
    }
    if (item.acceptanceChecklist.length) {
      lines.push("");
      lines.push("Acceptance checklist:");
      for (const criterion of item.acceptanceChecklist) {
        lines.push(`- ${criterion}`);
      }
    }
    if (item.noSecretBoundary) {
      lines.push("");
      lines.push(`No-secret boundary: ${item.noSecretBoundary}`);
    }
    if (item.evidenceCaptureChecklist.length) {
      lines.push("");
      lines.push("Evidence capture checklist:");
      for (const captureItem of item.evidenceCaptureChecklist) {
        lines.push(`- ${captureItem}`);
      }
    }
    if (item.canonicalProofCommands.length) {
      lines.push("");
      lines.push("Canonical proof commands:");
      for (const command of item.canonicalProofCommands) {
        lines.push(`- \`${command}\``);
      }
    }
    if (item.commandResultTemplates.length) {
      lines.push("");
      lines.push("Command-result capture templates:");
      for (const template of item.commandResultTemplates) {
        lines.push(`- \`${template}\``);
      }
      lines.push(
        "",
        "Use one template per passing command, then paste the resulting JSON object into `docs/audit/release-external-evidence.intake.json` under the matching gate. Keep `summary-json-file` redacted before export.",
      );
    }
    lines.push("");
    lines.push(`No-overclaim guardrail: ${item.guardrail}`);
    lines.push("");
    lines.push("Owner actions:");
    const ownerActions = Array.isArray(item.ownerAction)
      ? item.ownerAction
      : [];
    for (const [index, action] of ownerActions.entries()) {
      lines.push(`${index + 1}. ${action}`);
    }
    lines.push("");
  }

  lines.push("## Verification", "");
  lines.push("Run these after the account-side work is done:");
  lines.push("");
  lines.push("```bash");
  lines.push("npm run check:release-blockers");
  lines.push("npm run export:release-blocker-evidence -- --write");
  lines.push(
    "npm run validate:release-external-evidence -- --file docs/audit/release-external-evidence.intake.json --summary-json",
  );
  lines.push(
    "npm run validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --strict --summary-json",
  );
  lines.push(
    "npm run check:source-pack-final-readiness -- --summary-json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
  );
  lines.push(
    "npm run check:human-review-final-readiness -- --summary-json --library-file /absolute/path/to/merged-library-review-evidence.json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
  );
  lines.push("npm run check:library-content-completion");
  lines.push("npm run check:goal-completion");
  lines.push("```");

  return lines.join("\n");
}

function normalizeGeneratedAt(markdown) {
  return String(markdown).replace(
    /^Generated: .+$/m,
    "Generated: <normalized>",
  );
}

function checkCurrent(markdown) {
  const resolved = path.resolve(process.cwd(), outPath);
  if (!fs.existsSync(resolved)) {
    return {
      ok: false,
      findings: [`Missing owner-action artifact: ${outPath}`],
    };
  }

  const existing = fs.readFileSync(resolved, "utf8");
  const expected = `${markdown}\n`;
  if (normalizeGeneratedAt(existing) !== normalizeGeneratedAt(expected)) {
    return {
      ok: false,
      findings: [
        `${outPath} is stale; run npm run export:release-owner-actions -- --write.`,
      ],
    };
  }

  return { ok: true, findings: [] };
}

function main() {
  const report = parseGoalReport();
  const markdown = renderMarkdown(report);
  if (wantsWrite) {
    fs.mkdirSync(path.dirname(path.resolve(process.cwd(), outPath)), {
      recursive: true,
    });
    fs.writeFileSync(path.resolve(process.cwd(), outPath), `${markdown}\n`);
  }
  const check = wantsCheck ? checkCurrent(markdown) : null;

  if (wantsJson) {
    console.log(
      JSON.stringify(
        {
          ok: check ? check.ok : Boolean(report.ok),
          outPath,
          written: wantsWrite,
          checked: wantsCheck,
          goalComplete: Boolean(report.ok),
          findings: check ? check.findings : [],
          nextRequiredActions: report.nextRequiredActions || [],
          nextActionDetails: report.nextActionDetails || [],
          resolutionPlan: buildResolutionPlan(report),
          externalRelease: report.externalRelease || null,
          libraryCompletion: report.libraryCompletion || null,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (wantsCheck) {
    if (!check?.ok) {
      console.error(check?.findings.join("\n") || "Owner-action check failed.");
      process.exit(1);
    }
    console.log(`Release owner actions are current at ${outPath}.`);
    return;
  }

  if (wantsMarkdown) {
    if (wantsWrite) {
      console.log(`Release owner actions written to ${outPath}.`);
      return;
    }
    console.log(markdown);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
