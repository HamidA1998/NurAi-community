#!/usr/bin/env tsx

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  DRAFT_ISLAMIC_SOURCE_CARDS,
  SOURCE_PACK_DOMAINS,
  VERIFIED_ISLAMIC_SOURCE_CARDS,
} from "../server/ai/islamicSourcePacks";
import {
  getAllSourcePackReviewStatuses,
  getSourcePackDomainReviewStatus,
  sourcePackDraftCardHash,
} from "../server/ai/sourcePackReviewWorkflow";

function fail(message: string): never {
  console.error(`Source-pack review workflow check failed: ${message}`);
  process.exit(1);
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

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function expectFinalReadinessSecretRefused(): void {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "nurai-source-pack-final-readiness-"),
  );

  try {
    for (const domain of SOURCE_PACK_DOMAINS) {
      const sourcePath = `docs/audit/${domain}-source-review-evidence.intake.json`;
      const evidence = JSON.parse(
        fs.readFileSync(sourcePath, "utf8"),
      ) as Record<string, unknown> | null;
      if (!evidence || typeof evidence !== "object") {
        fail(`${sourcePath} must parse as a JSON object.`);
      }
      if (domain === "tafsir") {
        evidence.secretProbe = [
          "sk",
          "proj",
          "sourcepack",
          "secret",
          "refusal",
          "probe",
        ].join("-");
      }
      fs.writeFileSync(
        path.join(tempDir, `${domain}-source-review-evidence.json`),
        `${JSON.stringify(evidence, null, 2)}\n`,
      );
    }

    const result = spawnSync(
      "npx",
      [
        "tsx",
        "scripts/check-source-pack-final-readiness.ts",
        "--summary-json",
        "--evidence-dir",
        tempDir,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    const summary = parseJson(result.stdout) || parseJson(result.stderr);
    if (result.status === 0) {
      fail("Final source-pack readiness accepted secret-like evidence.");
    }
    if (!summary) {
      fail("Final source-pack readiness did not emit parseable JSON.");
    }
    if ((summary.secretLikeFindingCount as number) < 1) {
      fail(
        "Final source-pack readiness must report secretLikeFindingCount when evidence contains secret-like values.",
      );
    }
    const findings = Array.isArray(summary.findings)
      ? summary.findings.join(" ")
      : "";
    if (!/secret-like/i.test(findings)) {
      fail(
        "Final source-pack readiness must explain that secret-like evidence values are refused.",
      );
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const allStatuses = getAllSourcePackReviewStatuses();
const packageJson = fs.readFileSync("package.json", "utf8");
const finalReadinessScript = fs.readFileSync(
  "scripts/check-source-pack-final-readiness.ts",
  "utf8",
);

if (!packageJson.includes('"check:source-pack-final-readiness"')) {
  fail("package.json must expose check:source-pack-final-readiness.");
}

for (const requiredText of [
  "SECRET_LIKE_PATTERNS",
  "--require-approved",
  "readyForSourcePackActivationClaim",
  "confirmSourcePackActivation",
  "secretLikeFindingCount",
]) {
  if (!finalReadinessScript.includes(requiredText)) {
    fail(
      `scripts/check-source-pack-final-readiness.ts must include ${requiredText}.`,
    );
  }
}

expectFinalReadinessSecretRefused();

for (const domain of SOURCE_PACK_DOMAINS) {
  const scriptPath = `scripts/apply-${domain}-review-evidence.ts`;
  const script = fs.readFileSync(scriptPath, "utf8");
  if (!script.includes("--confirm-source-pack-activation")) {
    fail(
      `${scriptPath} must require explicit source-pack activation confirmation.`,
    );
  }
  if (
    !script.includes(
      `Refusing to write verified ${domain} source cards without --confirm-source-pack-activation.`,
    )
  ) {
    fail(`${scriptPath} must refuse unconfirmed write activation.`);
  }

  const intakePath = `docs/audit/${domain}-source-review-evidence.intake.json`;
  const intake = fs.readFileSync(intakePath, "utf8");
  for (const requiredText of [
    '"activationProofPlan"',
    `export:${domain}-review-packets`,
    `validate:${domain}-review-evidence`,
    `apply:${domain}-review-evidence`,
    "--confirm-source-pack-activation",
  ]) {
    if (!intake.includes(requiredText)) {
      fail(
        `${intakePath} must carry activation proof plan text ${requiredText}.`,
      );
    }
  }
}

if (allStatuses.domains.length !== SOURCE_PACK_DOMAINS.length) {
  fail(
    `Expected ${SOURCE_PACK_DOMAINS.length} source-pack domains, found ${allStatuses.domains.length}.`,
  );
}

if (allStatuses.draftCardCount !== DRAFT_ISLAMIC_SOURCE_CARDS.length) {
  fail(
    `Draft count mismatch: workflow reported ${allStatuses.draftCardCount}, catalog has ${DRAFT_ISLAMIC_SOURCE_CARDS.length}.`,
  );
}

if (allStatuses.verifiedCardCount !== VERIFIED_ISLAMIC_SOURCE_CARDS.length) {
  fail(
    `Verified count mismatch: workflow reported ${allStatuses.verifiedCardCount}, catalog has ${VERIFIED_ISLAMIC_SOURCE_CARDS.length}.`,
  );
}

const seenDraftIds = new Set<string>();

for (const domain of SOURCE_PACK_DOMAINS) {
  const domainStatus = getSourcePackDomainReviewStatus(domain);
  const expectedCards = DRAFT_ISLAMIC_SOURCE_CARDS.filter(
    (card) => card.domain === domain,
  );

  if (domainStatus.draftCount !== expectedCards.length) {
    fail(
      `${domain} draft count mismatch: workflow reported ${domainStatus.draftCount}, expected ${expectedCards.length}.`,
    );
  }

  if (domainStatus.activationReady) {
    if (domainStatus.approvedCount !== domainStatus.draftCount) {
      fail(`${domain} is activation-ready without every draft being approved.`);
    }
    if (domainStatus.blockerCount !== 0) {
      fail(`${domain} is activation-ready with unresolved blockers.`);
    }
  }

  if (!domainStatus.reviewHandoffLabel || !domainStatus.reviewHandoffBody) {
    fail(`${domain} must include a review handoff label and body.`);
  }

  if (
    !domainStatus.nextActionCommand ||
    !domainStatus.nextActionCommand.includes(`:${domain}-review-`)
  ) {
    fail(`${domain} must include a domain-specific next action command.`);
  }

  if (
    !Array.isArray(domainStatus.nextActionChecklist) ||
    domainStatus.nextActionChecklist.length < 3
  ) {
    fail(`${domain} must include a three-step next action checklist.`);
  }

  const rehearsal = domainStatus.activationRehearsalPlan;
  if (!rehearsal) {
    fail(`${domain} must include an activation rehearsal plan.`);
  }
  if (!rehearsal.validationCommand.includes("--require-approved")) {
    fail(
      `${domain} rehearsal validation command must require approved evidence.`,
    );
  }
  if (!rehearsal.dryRunCommand.includes(`apply:${domain}-review-evidence`)) {
    fail(`${domain} rehearsal must include a domain-specific dry-run command.`);
  }
  if (
    !rehearsal.writeCommand.includes("--write") ||
    !rehearsal.writeCommand.includes("--confirm-source-pack-activation")
  ) {
    fail(
      `${domain} rehearsal write command must require explicit activation confirmation.`,
    );
  }
  if (
    !rehearsal.finalReadinessCommand.includes(
      "check:source-pack-final-readiness",
    )
  ) {
    fail(
      `${domain} rehearsal must include the all-domain final readiness command.`,
    );
  }
  const rehearsalBoundary = [
    rehearsal.noSecretBoundary,
    rehearsal.noClaimBoundary,
    ...rehearsal.reviewerProofChecklist,
  ].join(" ");
  if (!/API keys|database URLs|private keys/i.test(rehearsalBoundary)) {
    fail(`${domain} rehearsal must preserve no-secret evidence boundaries.`);
  }
  if (
    !/Do not claim verified source packs|final readiness|qualified-scholar review/i.test(
      rehearsalBoundary,
    )
  ) {
    fail(
      `${domain} rehearsal must block source-pack overclaims until final readiness passes.`,
    );
  }
  if (
    !Array.isArray(rehearsal.reviewerProofChecklist) ||
    rehearsal.reviewerProofChecklist.length < 5
  ) {
    fail(
      `${domain} rehearsal must include a five-item reviewer proof checklist.`,
    );
  }

  if (!domainStatus.activationReady) {
    const boundaryText = [
      domainStatus.reviewHandoffBody,
      ...domainStatus.nextActionChecklist,
    ].join(" ");
    if (
      !/inactive|Do not claim|Keep draft cards inactive/i.test(boundaryText)
    ) {
      fail(
        `${domain} must explicitly keep unapproved source-pack cards inactive.`,
      );
    }
  }

  for (const card of domainStatus.draftCards) {
    const draft = expectedCards.find(
      (candidate) => candidate.id === card.draftId,
    );
    if (!draft) {
      fail(`${domain} status included unknown draft card ${card.draftId}.`);
    }
    if (seenDraftIds.has(card.draftId)) {
      fail(
        `${card.draftId} appeared in more than one source-pack review status.`,
      );
    }
    seenDraftIds.add(card.draftId);

    if (!card.sourceUrl || !/^https?:\/\//.test(card.sourceUrl)) {
      fail(`${card.draftId} must include a real source URL.`);
    }

    const expectedHash = sourcePackDraftCardHash(draft);
    if (card.sourceCardHash !== expectedHash) {
      fail(`${card.draftId} reported an incorrect sourceCardHash.`);
    }

    const packetPath = path.join(
      domainStatus.packetDir,
      `${slug(card.draftId)}.md`,
    );
    if (!fs.existsSync(packetPath)) {
      fail(`${packetPath} is missing.`);
    }
    const packet = fs.readFileSync(packetPath, "utf8");
    if (!packet.includes(`| Source card hash | ${expectedHash} |`)) {
      fail(`${packetPath} must expose the current source card hash.`);
    }
  }
}

if (seenDraftIds.size !== DRAFT_ISLAMIC_SOURCE_CARDS.length) {
  fail(
    `Workflow accounted for ${seenDraftIds.size} drafts, expected ${DRAFT_ISLAMIC_SOURCE_CARDS.length}.`,
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      domainCount: allStatuses.domains.length,
      draftCardCount: allStatuses.draftCardCount,
      verifiedCardCount: allStatuses.verifiedCardCount,
      activationReadyDomains: allStatuses.domains
        .filter((domain) => domain.activationReady)
        .map((domain) => domain.domain),
    },
    null,
    2,
  ),
);
