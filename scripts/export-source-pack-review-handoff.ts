#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

import { getAllSourcePackReviewStatuses } from "../server/ai/sourcePackReviewWorkflow";

const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");
const wantsJson =
  process.argv.includes("--json") || process.argv.includes("--summary-json");

function argValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const outPath = path.resolve(
  process.cwd(),
  argValue("--out", "docs/audit/AI_SOURCE_PACK_REVIEW_HANDOFF.md"),
);

function md(value: unknown): string {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function normalizeGeneratedAt(value: string): string {
  return value.replace(/^Generated: .+$/gm, "Generated: <normalized>");
}

function renderMarkdown(): string {
  const status = getAllSourcePackReviewStatuses();
  const rows = status.domains
    .map(
      (domain) =>
        `| ${md(domain.domain)} | ${domain.draftCount} | ${domain.approvedCount} | ${domain.blockerCount} | ${domain.activationReady ? "yes" : "no"} | ${md(domain.reviewHandoffLabel)} |`,
    )
    .join("\n");

  const lines = [
    "# AI Source Pack Review Handoff",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This handoff is for release owners and human reviewers. It does not activate tafsir, hadith, fiqh, or seerah source cards, and it is not review evidence.",
    "",
    "## Current State",
    "",
    `Draft cards: ${status.draftCardCount}`,
    `Verified cards: ${status.verifiedCardCount}`,
    `Activation-ready domains: ${status.domains.filter((domain) => domain.activationReady).length}`,
    "",
    "| Domain | Drafts | Approved | Blockers | Activation ready | Handoff |",
    "| --- | ---: | ---: | ---: | --- | --- |",
    rows,
    "",
    "## Domain Handoffs",
    "",
  ];

  for (const domain of status.domains) {
    lines.push(`### ${domain.domain}`, "");
    lines.push(domain.reviewHandoffBody, "");
    lines.push(`Evidence intake: \`${domain.evidencePath}\``);
    lines.push(`Packet directory: \`${domain.packetDir}\``);
    lines.push(`Next command: \`${domain.nextActionCommand}\``);
    lines.push("");
    lines.push("Reviewer checklist:");
    for (const item of domain.nextActionChecklist) {
      lines.push(`- ${item}`);
    }
    lines.push("");
    lines.push("Activation rehearsal plan:");
    lines.push(`- Summary: ${domain.activationRehearsalPlan.summary}`);
    lines.push(
      `- Validation command: \`${domain.activationRehearsalPlan.validationCommand}\``,
    );
    lines.push(
      `- Dry-run command: \`${domain.activationRehearsalPlan.dryRunCommand}\``,
    );
    lines.push(
      `- Confirmed write command: \`${domain.activationRehearsalPlan.writeCommand}\``,
    );
    lines.push(
      `- Final readiness command: \`${domain.activationRehearsalPlan.finalReadinessCommand}\``,
    );
    lines.push(
      `- No-secret boundary: ${domain.activationRehearsalPlan.noSecretBoundary}`,
    );
    lines.push(
      `- No-claim boundary: ${domain.activationRehearsalPlan.noClaimBoundary}`,
    );
    lines.push("");
    lines.push("Reviewer proof checklist:");
    for (const item of domain.activationRehearsalPlan.reviewerProofChecklist) {
      lines.push(`- ${item}`);
    }
    lines.push("");
    lines.push("Draft cards:");
    for (const card of domain.draftCards) {
      lines.push(
        `- \`${card.draftId}\` - ${md(card.title)} (${card.blockerCount} blocker${card.blockerCount === 1 ? "" : "s"})`,
      );
    }
    lines.push("");
  }

  lines.push("## Activation Boundary", "");
  lines.push(
    "- Do not move cards into `VERIFIED_ISLAMIC_SOURCE_CARDS` from this handoff alone.",
  );
  lines.push(
    "- Do not claim source packs are verified, reviewed by qualified scholars, or available to NurAI answers while `verifiedCardCount` is 0.",
  );
  lines.push(
    "- Real reviewer names, dates, licensing evidence, notes, activation approval, and current source-card hashes must pass the domain validator first.",
  );
  lines.push(
    "- Each domain evidence intake carries an `activationProofPlan`; reviewers must preserve it in completed evidence files so validation can prove the boundary and activation flow were followed.",
  );
  lines.push(
    "- After evidence passes, run the relevant `apply:*review-evidence -- --summary-json` command and inspect the source-pack diff before release.",
  );
  lines.push(
    "- Before any all-domain source-pack activation claim, run `npm run check:source-pack-final-readiness -- --summary-json` against the completed evidence files so every domain proves validation, dry-run import, and no secret-like evidence values.",
  );
  lines.push(
    "- Write activation requires the explicit `--confirm-source-pack-activation` flag after dry-run review; never use this flag from the handoff alone.",
  );

  return lines.join("\n");
}

function checkCurrent(expected: string): string[] {
  if (!fs.existsSync(outPath)) {
    return [`${path.relative(process.cwd(), outPath)} is missing.`];
  }
  const actual = fs.readFileSync(outPath, "utf8");
  if (normalizeGeneratedAt(actual) !== normalizeGeneratedAt(`${expected}\n`)) {
    return [`${path.relative(process.cwd(), outPath)} is stale.`];
  }
  return [];
}

const markdown = renderMarkdown();

if (wantsWrite) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${markdown}\n`);
}

const findings = wantsCheck ? checkCurrent(markdown) : [];
const summary = {
  ok: findings.length === 0,
  outputPath: path.relative(process.cwd(), outPath),
  findings,
  written: wantsWrite ? 1 : 0,
};

if (wantsJson) {
  console.log(JSON.stringify(summary, null, 2));
} else if (wantsCheck) {
  if (findings.length) {
    console.error("AI source pack review handoff is not current:");
    for (const finding of findings) console.error(`- ${finding}`);
  } else {
    console.log("AI source pack review handoff is current.");
  }
} else if (wantsWrite) {
  console.log(`Wrote ${summary.outputPath}.`);
} else {
  console.log(markdown);
}

if (findings.length) process.exit(1);
