#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  GATE_REQUIREMENTS,
  postClearWatchPlanForGate,
  rollbackMitigationPlanForGate,
} = require("./lib/releaseExternalEvidenceRequirements");

const wantsJson = process.argv.includes("--json");
const wantsSummaryJson = process.argv.includes("--summary-json");
const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const outPath = argValue("--out", "docs/audit/RELEASE_ACCOUNT_SESSION_PLAN.md");

function parseCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
  });
  const stdout = (result.stdout || "").trim();
  if (!stdout) {
    throw new Error(
      `${[command, ...args].join(" ")} did not emit JSON. exitCode=${result.status}; stderr=${(
        result.stderr || ""
      ).trim()}`,
    );
  }
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `${[command, ...args].join(" ")} emitted invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function goalReport() {
  if (process.env.NURAI_GOAL_COMPLETION_REPORT_JSON) {
    return JSON.parse(process.env.NURAI_GOAL_COMPLETION_REPORT_JSON);
  }

  return parseCommand(process.execPath, [
    "scripts/check-goal-completion.js",
    "--json",
  ]);
}

function actionById(report, id) {
  return (report.nextActionDetails || []).find((item) => item.id === id);
}

function libraryPriorityGuidance(report) {
  const library = report.libraryCompletion || {};
  const sensitiveCount = Number.isFinite(library.sensitiveBookCount)
    ? library.sensitiveBookCount
    : "unknown";
  const freeCount = Number.isFinite(library.planCounts?.free)
    ? library.planCounts.free
    : "unknown";
  const totalBooks = Number.isFinite(library.bookCount)
    ? library.bookCount
    : "unknown";

  return `Prioritize the ${sensitiveCount} high-care books needing qualified-scholar review and the ${freeCount} free-plan trust-surface books inside the current ${totalBooks}-book Library audit.`;
}

const accountSessions = [
  {
    id: "deployed-runtime-url",
    title: "Published Runtime",
    category: "external",
    browserTargets: [
      "Current production host dashboard for the NurAI server.",
      "Production host secret/env settings.",
      "Published HTTPS app URL.",
    ],
    accountUrls: [],
    ownerOnly: [
      "Set `NURAI_DEPLOYMENT_URL` to the real current production server URL, currently the Railway host used by the App Store build.",
      "If `/api/ai/status` returns 404, deploy the latest server build to the current host before treating runtime verification as complete.",
      "Set production secrets on the real runtime. Do not paste secrets into docs or committed files.",
      "Do not mark this complete until the live deployed `/api/ai/status`, admin diagnostics, and guarded AI smoke checks pass.",
    ],
    evidenceNeeded: [
      "A live HTTPS `NURAI_DEPLOYMENT_URL` returning the NurAI server, not a platform not-live page.",
      "`/api/ai/status` reports OpenAI cloud AI configured while staying redacted.",
      "`cloudApiKeySource` is `AI_INTEGRATIONS_OPENAI_API_KEY` on the deployed host.",
      "Unauthenticated `/api/admin/ai/diagnostics` returns `401`.",
    ],
    verifyCommands: [
      "NURAI_DEPLOYMENT_URL=https://your-production-domain.example NURAI_DEPLOYED_AI_SMOKE_SECRET=... npm run check:ai-release:deployed",
      "npm run check:release-blockers -- --json",
    ],
  },
  {
    id: "production-database-url",
    title: "Production Database",
    category: "external",
    browserTargets: [
      "Supabase project `NurAi` database settings.",
      "Production runtime secret/env settings.",
      "Release machine terminal with the real `DATABASE_URL` exported for checks only.",
    ],
    accountUrls: [
      "https://supabase.com/dashboard/project/ciujskeftflqdoxvgvwz/database/settings",
    ],
    ownerOnly: [
      "Provide the existing database password, or intentionally reset it only after every deployed runtime using the old password is ready to be updated.",
      "Never commit `DATABASE_URL`; use the release shell and production secret manager only.",
      "Review the dry-run migration output before applying with `--yes`.",
    ],
    evidenceNeeded: [
      "The non-secret production DB proof plan is current and records migration file hashes before credentials are used.",
      "A real non-placeholder Supabase/Postgres `DATABASE_URL` with a non-loopback host, password, `postgres` database name, and known NurAI project ref `ciujskeftflqdoxvgvwz`.",
      "Production DB target check passes before any migration SQL is applied.",
      "Production migration dry-run lists the expected migration files against the real DB.",
      "Production migration apply succeeds.",
      "Standalone conversation ownership check passes before and after production migration work.",
      "Conversation ownership, production DB, and migration-applied checks all pass.",
    ],
    verifyCommands: [
      "npm run check:production-db-proof-plan",
      "DATABASE_URL=postgresql://... npm run check:production-db-target -- --json",
      "DATABASE_URL=postgresql://... npm run check:conversation-ownership",
      "DATABASE_URL=postgresql://... npm run apply:production-migrations -- --json",
      "DATABASE_URL=postgresql://... npm run apply:production-migrations -- --yes --json",
      "DATABASE_URL=postgresql://... npm run check:production-db-release -- --json",
      "DATABASE_URL=postgresql://... npm run check:db-migrations-applied -- --json",
      "npm run check:release-blockers -- --json",
    ],
  },
  {
    id: "owned-runpod-endpoint",
    title: "Future Owned RunPod Endpoint",
    category: "external",
    browserTargets: [
      "RunPod billing page.",
      "RunPod API keys page.",
      "RunPod Serverless endpoint/template dashboard.",
    ],
    accountUrls: [
      "https://console.runpod.io/user/billing",
      "https://console.runpod.io/user/settings",
      "https://console.runpod.io/serverless",
    ],
    ownerOnly: [
      "Deferred for this release because `NURAI_AI_PROVIDER=openai` is the current production AI scope.",
      "Add enough RunPod credit for the balance to be positive.",
      "Rotate the RunPod token that was pasted during setup before production use.",
      "`npm run create:runpod-ai` now emits a redacted JSON failure with `blocker: runpod-balance` when the account balance prevents endpoint creation.",
      "Treat `402 Payment Required` or `Insufficient Balance` from `npm run check:local-ai -- --all-enabled` as an account-balance blocker, not a code pass.",
      "Do not create an endpoint with high minimum workers or unbounded max workers without owner approval.",
    ],
    evidenceNeeded: [
      "Not required for this release while OpenAI-only mode remains active.",
      "RunPod balance is positive.",
      "New production RunPod API token is stored only in secret managers.",
      "Any failed endpoint-create retry is recorded as non-secret JSON evidence and does not include the API token.",
      "Owned endpoint URL points at `/openai/v1` and is not a public-pool endpoint.",
      "Enabled `NURAI_LOCAL_AI_MODELS` entries all point at owned endpoint IDs.",
      "`npm run check:runpod-account` proves the configured endpoint is visible in the RunPod account as a private GPU endpoint whose template model matches the enabled model pool.",
      "`npm run check:local-ai -- --all-enabled` returns non-empty text from the owned endpoint instead of 402 insufficient-balance errors.",
    ],
    verifyCommands: [
      'npm run create:runpod-ai -- --yes --template-id axws2453nd --model Qwen/Qwen3-8B --gpu "NVIDIA L4" --workers-min 0 --workers-max 1',
      "npm run check:runpod-account",
      "npm run check:local-ai -- --all-enabled",
      "npm run check:release-blockers",
    ],
  },
  {
    id: "google-places-key",
    title: "Google Places",
    category: "external",
    browserTargets: [
      "Google Cloud billing page for the `eliteautomations` project.",
      "Google Maps Platform APIs page.",
      "Google API key restrictions page for the Places key.",
    ],
    accountUrls: [
      "https://console.cloud.google.com/billing/enable?project=eliteautomations",
      "https://console.cloud.google.com/google/maps-apis/home;onboard=true?project=eliteautomations",
      "https://console.cloud.google.com/apis/credentials?project=eliteautomations",
    ],
    ownerOnly: [
      "Deferred as a release blocker because the current app is already using Places successfully.",
      "Attach or restore an active billing account for the Google Cloud project.",
      "Enable the required Google Maps Platform APIs before relying on production nearby place data.",
      "Keep API-key restrictions tight, but be careful with server egress/IP restrictions if the runtime has no stable outbound IP.",
    ],
    evidenceNeeded: [
      "`GOOGLE_PLACES_API_KEY` is present in the current runtime.",
      "Provider-failure controls stay explicit if Google rejects a request.",
      "Billing is active on the Google Cloud project that owns `GOOGLE_PLACES_API_KEY`.",
      "Geocoding API and Places API (New) nearby mosque smoke checks no longer return `REQUEST_DENIED` or HTTP permission errors.",
      "Production app errors remain explicit if Google provider checks fail.",
    ],
    verifyCommands: [
      "npm run check:google-places-live",
      "npm run check:places-provider-controls",
      "npm run check:release-blockers",
    ],
  },
  {
    id: "eas-android-submit-config",
    title: "Future Android Play And RevenueCat",
    category: "external",
    browserTargets: [
      "Google Play Console developer account setup.",
      "Google Play app for package `uk.co.eliteautomations.nurai`.",
      "Google Cloud service account key flow used by Play Console.",
      "RevenueCat `NurAi (Play Store)` app settings.",
    ],
    accountUrls: [
      "https://play.google.com/console/signup",
      "https://play.google.com/console/developers",
      "https://app.revenuecat.com/projects/80967fcf/new-app/play_store",
      "https://expo.dev/accounts/hamidamjad98/projects/nurai",
    ],
    ownerOnly: [
      "This is deferred while the current release scope is the existing iOS App Store app.",
      "Set `NURAI_REQUIRE_ANDROID_RELEASE=true` only when Google Play submission is in scope.",
      "The Google Play account type choice is irreversible; the owner must choose personal vs organisation.",
      "Create the Google service-account JSON outside the repo and keep it out of source control.",
      "Upload the JSON to RevenueCat before retrieving the Android public SDK key.",
    ],
    evidenceNeeded: [
      "`GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH` points to a real Google `service_account` JSON file outside the repo.",
      "Google Play Publisher API access can create and clean up a temporary edit for package `uk.co.eliteautomations.nurai`.",
      "`EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` is the Google Play public SDK key from RevenueCat.",
      "Android RevenueCat offerings load with product-backed Premium monthly, Premium annual, Scholar monthly, and Scholar annual packages.",
      "EAS Android submit config validates for package `uk.co.eliteautomations.nurai`.",
    ],
    verifyCommands: [
      "npm run check:android-release-credentials",
      "npm run check:revenuecat-offerings:android -- --json",
      "npm run check:subscription-release-controls",
      "npm run check:release-blockers -- --require-android-release",
    ],
  },
  {
    id: "external-release-evidence-validation",
    title: "External Release Proof Intake",
    category: "local",
    browserTargets: [
      "Fresh terminal output from every external gate verification command.",
      "Redacted intake file `docs/audit/release-external-evidence.intake.json`.",
      "Current blocker report from `npm run check:release-blockers`.",
    ],
    accountUrls: [
      "docs/audit/release-external-evidence.intake.json",
      "docs/audit/RELEASE_BLOCKER_EVIDENCE.md",
    ],
    ownerOnly: [
      "Do not paste secret values, private keys, service-account JSON contents, API keys, or database passwords into the evidence file.",
      "Record only non-secret proof notes, dates, verifier identity, URLs that are safe to share, and pass/fail command summaries.",
      "Use the structured command-result helper so every required verification command has exit code, timestamp, summary JSON or hash, and non-secret notes.",
      "Every verification command listed for a gate needs a passing command result before the external release can be claimed complete.",
    ],
    evidenceNeeded: [
      "Each external gate has `verified: true`, a real `verifiedAt` date, `verifiedBy`, and non-secret proof notes.",
      "Each gate's `verificationCommandResults` covers every command generated in its `verificationCommands` list.",
      "`npm run validate:release-external-evidence -- --summary-json` passes after `npm run check:release-blockers` clears the remaining external gates.",
    ],
    verifyCommands: [
      "npm run export:release-external-evidence-intake -- --write",
      'npm run export:release-command-result -- --gate-id deployed-runtime-url --command "NURAI_DEPLOYMENT_URL=https://your-production-domain.example NURAI_DEPLOYED_AI_SMOKE_SECRET=... npm run check:ai-release:deployed" --exit-code 0 --ran-at 2026-06-01T00:00:00.000Z --notes "Non-secret deployed runtime smoke summary."',
      "npm run check:release-command-result -- --file docs/audit/release-external-evidence.intake.json",
      "npm run validate:release-external-evidence -- --summary-json",
      "npm run check:goal-completion",
    ],
  },
  {
    id: "source-pack-activation-readiness",
    title: "AI Source Pack Review Evidence",
    category: "local",
    browserTargets: [
      "AI source pack handoff `docs/audit/AI_SOURCE_PACK_REVIEW_HANDOFF.md`.",
      "Tafsir, hadith, fiqh, and seerah source-review packet folders under `docs/audit/`.",
      "Completed external evidence files copied from the current source-review intake templates.",
      "Source-pack catalog `server/ai/islamicSourcePacks.ts` after dry-run review.",
    ],
    accountUrls: [
      "docs/audit/AI_SOURCE_PACK_REVIEW_HANDOFF.md",
      "docs/audit/tafsir-source-review-evidence.intake.json",
      "docs/audit/hadith-source-review-evidence.intake.json",
      "docs/audit/fiqh-source-review-evidence.intake.json",
      "docs/audit/seerah-source-review-evidence.intake.json",
    ],
    ownerOnly: [
      "Do not treat the in-repo intake templates as approval evidence.",
      "Complete source-card review evidence outside the repo with real reviewer names, qualifications, licensing evidence, notes, activation approval, and reviewed explanation text.",
      "Keep every draft card inactive until its domain validator passes with --require-approved and the all-domain final readiness command passes.",
      "Inspect activation dry-run output before using any --write --confirm-source-pack-activation command.",
      "Never paste credentials, copied source text, authorization headers, cookies, database URLs, private keys, JWTs, or private reviewer contact data into evidence.",
    ],
    evidenceNeeded: [
      "All 32 current tafsir, hadith, fiqh, and seerah draft source cards have completed evidence with current sourceCardHash values.",
      "Every domain evidence file passes `validate:*review-evidence -- --require-approved`.",
      "The final readiness command reports zero secret-like evidence values.",
      "Every activation importer dry-runs successfully without writing files.",
    ],
    verifyCommands: [
      "npm run check:source-pack-final-readiness -- --summary-json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
      "npm run check:ai-source-catalog",
      "npm run check:goal-completion",
    ],
  },
  {
    id: "library-content-completion",
    title: "Library Review And Publish Evidence",
    category: "local",
    browserTargets: [
      "Review packet folder `docs/audit/library-review-packets/`.",
      "Sign-off ledger `docs/audit/LIBRARY_REVIEW_SIGNOFF_LEDGER.md`.",
      "Source-specificity audit `docs/audit/LIBRARY_SOURCE_SPECIFICITY_AUDIT.md`.",
      "Current hash-bound intake file from `npm run export:library-review-evidence-intake -- --write`.",
      "External real evidence JSON copied from `docs/audit/library-review-evidence.intake.json` and completed outside the repo.",
      "Source files where validated real `reviewEvidence` will be imported.",
    ],
    accountUrls: [
      "docs/audit/library-review-packets/",
      "docs/audit/LIBRARY_REVIEW_SIGNOFF_LEDGER.md",
      "docs/audit/LIBRARY_SOURCE_SPECIFICITY_AUDIT.md",
      "docs/audit/library-review-evidence.intake.json",
      "client/data/libraryBooks.ts",
    ],
    ownerOnly: [
      "Do not mark any book `published` until real editorial, source, publish, and qualified-scholar evidence where required has been recorded.",
      "Do not treat generated packets as scholar approval.",
      "Prioritize the 10 qualified-scholar books and the 13 free trust-surface books.",
    ],
    evidenceNeeded: [
      "Every published book has reviewer names and review dates.",
      "Reviewer evidence keeps the generated contentHash for the exact book version reviewed.",
      "Review notes include specific detail; validation rejects thin editorial, source, scholar, or publish notes under 40 characters.",
      "Publish approval dates are not earlier than editorial, source, or qualified-scholar review dates.",
      "Every published book has a completed qualityChecklist covering title accuracy, chapter completeness, source relevance, unsupported claims, exercise safety, audience, tone, and safety boundaries.",
      "Source reviewers clear or explicitly approve low-diversity and reused-note warnings from the source-specificity audit.",
      "Sensitive books include qualified-scholar reviewer details and review scope.",
      "Validated evidence has been imported with `npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --write`.",
      "`npm run check:library-content-completion` passes.",
    ],
    verifyCommands: [
      "npm run export:library-source-specificity-audit -- --write",
      "npm run export:library-source-specificity-audit -- --check --summary-json",
      "npm run export:library-review-packet -- --book-id hajj-and-umrah-preparation --write",
      "npm run export:library-review-packet -- --book-id hajj-and-umrah-preparation --check --summary-json",
      "npm run export:library-review-packets -- --check --summary-json --all",
      "npm run export:library-review-signoff-ledger -- --write",
      "npm run export:library-review-signoff-ledger -- --check --summary-json",
      "npm run export:library-review-evidence-intake -- --write",
      "npm run export:library-review-evidence-intake -- --check --summary-json",
      "npm run validate:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --summary-json",
      "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --summary-json",
      "npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --write",
      "npm run check:library-content-completion",
      "npm run check:goal-completion",
    ],
  },
];

function sessionRows(report) {
  return accountSessions.map((session, index) => {
    const action = actionById(report, session.id);
    const canonicalRequirement = GATE_REQUIREMENTS[session.id];
    let blocked = (report.nextRequiredActions || []).includes(session.id);
    let fallbackMessage = blocked ? "Action required." : "No longer blocked.";
    if (session.id === "external-release-evidence-validation") {
      const evidenceReady =
        report.releaseExternalEvidence?.readyForExternalReleaseClaim === true;
      blocked = blocked || !evidenceReady;
      fallbackMessage = evidenceReady
        ? "External proof evidence is valid."
        : "External proof evidence is not valid yet; collect passing non-secret command evidence after the external gates clear.";
    }
    return {
      order: index + 1,
      id: session.id,
      title: session.title,
      category: session.category,
      blocked,
      message: action?.message || fallbackMessage,
      browserTargets: session.browserTargets,
      accountUrls: session.accountUrls,
      ownerOnly:
        session.id === "library-content-completion"
          ? session.ownerOnly.map((item) =>
              item.includes("Prioritize the")
                ? libraryPriorityGuidance(report)
                : item,
            )
          : session.ownerOnly,
      evidenceNeeded:
        canonicalRequirement?.requiredEvidence || session.evidenceNeeded,
      acceptanceChecklist: canonicalRequirement?.acceptanceChecklist || [],
      noSecretBoundary: canonicalRequirement?.noSecretBoundary || "",
      postClearWatchPlan: canonicalRequirement
        ? postClearWatchPlanForGate(session.id)
        : [],
      rollbackMitigationPlan: canonicalRequirement
        ? rollbackMitigationPlanForGate(session.id)
        : [],
      verifyCommands:
        canonicalRequirement?.verificationCommands || session.verifyCommands,
      liveOwnerActions: action?.ownerAction || [],
    };
  });
}

function renderMarkdown(report, rows) {
  const mappedIds = new Set(rows.map((row) => row.id));
  const unmappedActions = (report.nextActionDetails || []).filter(
    (action) => !mappedIds.has(action.id),
  );
  const renderRows = (selectedRows) => {
    const lines = [];
    for (const row of selectedRows) {
      lines.push(`### ${row.order}. ${row.title}`);
      lines.push("");
      lines.push(`Blocker id: \`${row.id}\``);
      lines.push(
        `Status: ${row.blocked ? "blocked" : "not currently blocked"}`,
      );
      lines.push(`Gate message: ${row.message}`);
      lines.push("");
      lines.push("Browser targets:");
      for (const target of row.browserTargets) lines.push(`- ${target}`);
      lines.push("");
      lines.push("Direct URLs or files:");
      for (const url of row.accountUrls || []) lines.push(`- ${url}`);
      lines.push("");
      lines.push("Owner-only decisions:");
      for (const item of row.ownerOnly) lines.push(`- ${item}`);
      lines.push("");
      lines.push("Evidence needed:");
      for (const item of row.evidenceNeeded) lines.push(`- ${item}`);
      if (row.acceptanceChecklist.length) {
        lines.push("");
        lines.push("Acceptance checklist:");
        for (const item of row.acceptanceChecklist) lines.push(`- ${item}`);
      }
      if (row.noSecretBoundary) {
        lines.push("");
        lines.push(`No-secret boundary: ${row.noSecretBoundary}`);
      }
      if (row.postClearWatchPlan.length) {
        lines.push("");
        lines.push("Post-clear watch plan:");
        for (const item of row.postClearWatchPlan) lines.push(`- ${item}`);
      }
      if (row.rollbackMitigationPlan.length) {
        lines.push("");
        lines.push("Rollback / mitigation plan:");
        for (const item of row.rollbackMitigationPlan) lines.push(`- ${item}`);
      }
      if (row.liveOwnerActions.length) {
        lines.push("");
        lines.push("Live owner actions from the current gate:");
        for (const [index, action] of row.liveOwnerActions.entries()) {
          lines.push(`${index + 1}. ${action}`);
        }
      }
      lines.push("");
      lines.push("Verification commands:");
      lines.push("");
      lines.push("```bash");
      for (const command of row.verifyCommands) lines.push(command);
      lines.push("```");
      lines.push("");
    }
    return lines;
  };

  const lines = [
    "# NurAI External Release Account Session Plan",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This is the ordered Browser/account workflow for clearing the remaining production blockers. It is generated from the live goal-completion report and does not include secret values.",
    "",
    "## Current Gate",
    "",
    `- Goal complete: ${report.ok ? "yes" : "no"}`,
    `- External blockers: ${report.externalRelease?.blockerCount ?? "unknown"}`,
    `- Library blockers: ${report.libraryCompletion?.blockerCount ?? "unknown"}`,
    `- Books ready for highest-standard claim: ${report.libraryCompletion?.readyForHighestStandardClaim ? "yes" : "no"}`,
    "",
    "## External Account Sessions",
    "",
  ];

  lines.push(...renderRows(rows.filter((row) => row.category === "external")));

  const localRows = rows.filter((row) => row.category === "local");
  if (localRows.length) {
    lines.push("## Local Work Available Now");
    lines.push("");
    lines.push(
      "These items do not require account sign-in, but they still block the full goal until the evidence is real.",
    );
    lines.push("");
    lines.push(...renderRows(localRows));
  }

  if (unmappedActions.length) {
    lines.push("## Unmapped Required Actions");
    lines.push("");
    lines.push(
      "These blocker IDs came from the live goal report but do not yet have a generated session mapping.",
    );
    lines.push("");
    for (const action of unmappedActions) {
      lines.push(`- \`${action.id}\`: ${action.message}`);
    }
    lines.push("");
  }

  lines.push("## Final Proof");
  lines.push("");
  lines.push(
    "After all account sessions and book reviews are complete, this must pass:",
  );
  lines.push("");
  lines.push("```bash");
  lines.push("npm run check:release-local");
  lines.push("npm run check:release-blockers");
  lines.push("npm run export:release-blocker-evidence -- --write");
  lines.push("npm run export:release-external-evidence-intake -- --write");
  lines.push(
    'npm run export:release-command-result -- --gate-id deployed-runtime-url --command "NURAI_DEPLOYMENT_URL=https://your-production-domain.example NURAI_DEPLOYED_AI_SMOKE_SECRET=... npm run check:ai-release:deployed" --exit-code 0 --ran-at 2026-06-01T00:00:00.000Z --notes "Non-secret deployed runtime smoke summary."',
  );
  lines.push(
    "npm run check:release-command-result -- --file docs/audit/release-external-evidence.intake.json",
  );
  lines.push(
    "npm run validate:release-external-evidence -- --file docs/audit/release-external-evidence.intake.json --summary-json",
  );
  lines.push(
    "npm run check:human-review-final-readiness -- --summary-json --library-file /absolute/path/to/merged-library-review-evidence.json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json",
  );
  lines.push("npm run check:library-content-completion");
  lines.push("npm run check:goal-completion");
  lines.push(
    "EXPO_PUBLIC_DOMAIN=your-production-domain.example npm run expo:static:build",
  );
  lines.push("npm run check:static-build-output");
  lines.push("npm run check:release-local:full");
  lines.push("```");
  lines.push("");

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
      findings: [`Missing account-session plan artifact: ${outPath}`],
    };
  }

  const existing = fs.readFileSync(resolved, "utf8");
  if (normalizeGeneratedAt(existing) !== normalizeGeneratedAt(markdown)) {
    return {
      ok: false,
      findings: [
        `${outPath} is stale; run npm run export:release-account-session-plan -- --write.`,
      ],
    };
  }

  return { ok: true, findings: [] };
}

async function formatGeneratedMarkdown(markdown, filePath) {
  try {
    const prettier = await import("prettier");
    const config = (await prettier.resolveConfig(filePath)) || {};
    return (
      await prettier.format(markdown, {
        ...config,
        filepath: filePath,
        parser: "markdown",
      })
    ).trimEnd();
  } catch {
    return markdown.trimEnd();
  }
}

async function main() {
  const report = goalReport();
  const rows = sessionRows(report);
  const resolvedOutPath = path.resolve(process.cwd(), outPath);
  const markdown = await formatGeneratedMarkdown(
    renderMarkdown(report, rows),
    resolvedOutPath,
  );
  if (wantsWrite) {
    fs.mkdirSync(path.dirname(resolvedOutPath), { recursive: true });
    fs.writeFileSync(resolvedOutPath, `${markdown}\n`);
  }

  const check = wantsCheck ? checkCurrent(`${markdown}\n`) : null;
  const summary = {
    ok: check ? check.ok : Boolean(report.ok),
    outPath,
    written: wantsWrite,
    checked: wantsCheck,
    goalComplete: Boolean(report.ok),
    findings: check ? check.findings : [],
    blockedSessionCount: rows.filter((row) => row.blocked).length,
    sessions: rows.map((row) => ({
      order: row.order,
      id: row.id,
      title: row.title,
      blocked: row.blocked,
    })),
  };

  if (wantsSummaryJson) {
    console.log(JSON.stringify(summary, null, 2));
    if (check && !check.ok) process.exit(1);
    return;
  }

  if (wantsJson) {
    console.log(JSON.stringify({ ...summary, rows }, null, 2));
    if (check && !check.ok) process.exit(1);
    return;
  }

  if (wantsCheck) {
    if (!check?.ok) {
      console.error(
        check?.findings.join("\n") || "Account-session plan check failed.",
      );
      process.exit(1);
    }
    console.log(`Release account session plan is current at ${outPath}.`);
    return;
  }

  if (wantsWrite) {
    console.log(`Release account session plan written to ${outPath}.`);
    return;
  }
  console.log(markdown);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
