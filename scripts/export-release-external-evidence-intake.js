#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  EXTERNAL_GATE_IDS,
  GATE_REQUIREMENTS,
  SCHEMA_VERSION,
  postClearWatchPlanForGate,
  rollbackMitigationPlanForGate,
} = require("./lib/releaseExternalEvidenceRequirements");

const DEFAULT_OUT_PATH = "docs/audit/release-external-evidence.intake.json";

const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");
const wantsSummaryJson = process.argv.includes("--summary-json");
const wantsJson = process.argv.includes("--json");

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function runReleaseBlockers() {
  const result = spawnSync(
    process.execPath,
    ["scripts/check-release-blockers.js", "--json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
    },
  );
  const stdout = (result.stdout || "").trim();
  if (!stdout) {
    throw new Error(
      `check-release-blockers did not emit JSON. exitCode=${result.status}; stderr=${(
        result.stderr || ""
      ).trim()}`,
    );
  }
  return JSON.parse(stdout);
}

function containsSecretLikeText(value) {
  const text = JSON.stringify(value || "");
  return [
    /sk-[A-Za-z0-9_-]{12,}/,
    /rpa_[A-Za-z0-9_-]{12,}/,
    /AIza[0-9A-Za-z_-]{20,}/,
    /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /"private_key"\s*:/i,
    /RUNPOD_SECRET/i,
  ].some((pattern) => pattern.test(text));
}

function checkById(report, gateId) {
  return (report.checks || []).find((check) => check.id === gateId) || null;
}

function buildIntake(report) {
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    purpose:
      "Redacted, non-secret evidence intake for external NurAI release gates. Do not paste secret values into this file. Proof notes and command result notes must be specific, non-placeholder text of at least 40 characters.",
    currentReleaseBlockerCount: report.blockerCount,
    records: EXTERNAL_GATE_IDS.map((gateId) => {
      const check = checkById(report, gateId);
      const requirements = GATE_REQUIREMENTS[gateId];
      return {
        gateId,
        title: requirements.title,
        currentGateStatus: check?.status || "unknown",
        currentGateMessage: check?.message || "Gate status unavailable.",
        ownerActions: check?.ownerAction || [],
        requiredEvidence: requirements.requiredEvidence,
        acceptanceChecklist: requirements.acceptanceChecklist,
        noSecretBoundary: requirements.noSecretBoundary,
        evidenceCaptureChecklist: requirements.evidenceCaptureChecklist,
        postClearWatchPlan: postClearWatchPlanForGate(gateId),
        rollbackMitigationPlan: rollbackMitigationPlanForGate(gateId),
        verificationCommands: requirements.verificationCommands,
        evidence: {
          verified: false,
          verifiedAt: "",
          verifiedBy: "",
          nonSecretProofNotes:
            "Replace with at least 40 characters of specific non-secret proof notes after the gate passes.",
          nonSecretUrls: [],
          verificationCommandResults: requirements.verificationCommands.map(
            (command) => ({
              command,
              exitCode: null,
              ranAt: "",
              summarySha256: "",
              summaryJson: null,
              nonSecretResultNotes:
                "Replace with at least 40 characters summarizing the non-secret result after this command passes.",
            }),
          ),
        },
      };
    }),
  };
}

function compareCurrentFile(current, expected) {
  const findings = [];
  if (current.schemaVersion !== SCHEMA_VERSION) {
    findings.push(`schemaVersion must be ${SCHEMA_VERSION}.`);
  }
  if (!Array.isArray(current.records)) {
    findings.push("records must be an array.");
    return findings;
  }
  const expectedIds = expected.records.map((record) => record.gateId);
  const currentIds = current.records.map((record) => record.gateId);
  if (currentIds.join(",") !== expectedIds.join(",")) {
    findings.push(
      `records must match current external gate order: ${expectedIds.join(", ")}.`,
    );
  }
  for (const expectedRecord of expected.records) {
    const currentRecord = current.records.find(
      (record) => record.gateId === expectedRecord.gateId,
    );
    if (!currentRecord) continue;
    for (const field of ["currentGateStatus", "currentGateMessage"]) {
      if (currentRecord[field] !== expectedRecord[field]) {
        findings.push(
          `${expectedRecord.gateId}.${field} is stale; regenerate the intake file.`,
        );
      }
    }
    for (const field of [
      "requiredEvidence",
      "acceptanceChecklist",
      "noSecretBoundary",
      "evidenceCaptureChecklist",
      "postClearWatchPlan",
      "rollbackMitigationPlan",
      "verificationCommands",
    ]) {
      if (
        JSON.stringify(currentRecord[field] || null) !==
        JSON.stringify(expectedRecord[field] || null)
      ) {
        findings.push(
          `${expectedRecord.gateId}.${field} is stale; regenerate the intake file.`,
        );
      }
    }
    if (
      JSON.stringify(currentRecord.ownerActions || []) !==
      JSON.stringify(expectedRecord.ownerActions || [])
    ) {
      findings.push(
        `${expectedRecord.gateId}.ownerActions is stale; regenerate the intake file.`,
      );
    }
  }
  if (containsSecretLikeText(current)) {
    findings.push(
      "release evidence intake appears to contain secret material.",
    );
  }
  return findings;
}

function main() {
  const outPath = path.resolve(
    process.cwd(),
    argValue("--out", DEFAULT_OUT_PATH),
  );
  const report = runReleaseBlockers();
  const intake = buildIntake(report);

  if (wantsCheck) {
    const current = fs.existsSync(outPath)
      ? JSON.parse(fs.readFileSync(outPath, "utf8"))
      : null;
    const findings = current
      ? compareCurrentFile(current, intake)
      : [`${path.relative(process.cwd(), outPath)} is missing.`];
    const summary = {
      ok: findings.length === 0,
      outPath,
      recordCount: current?.records?.length || 0,
      currentReleaseBlockerCount: report.blockerCount,
      findings,
    };
    if (wantsSummaryJson || wantsJson) {
      console.log(JSON.stringify(summary, null, 2));
    } else if (summary.ok) {
      console.log(
        `Release external evidence intake check passed: ${summary.recordCount} gate record(s).`,
      );
    } else {
      console.error("Release external evidence intake check failed:");
      for (const finding of findings) console.error(`- ${finding}`);
    }
    if (!summary.ok) process.exit(1);
    return;
  }

  if (wantsWrite) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(intake, null, 2)}\n`);
  }

  if (wantsSummaryJson) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          outPath,
          willWrite: wantsWrite,
          recordCount: intake.records.length,
          currentReleaseBlockerCount: report.blockerCount,
          currentBlockedGateIds: intake.records
            .filter((record) => record.currentGateStatus !== "ok")
            .map((record) => record.gateId),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(JSON.stringify(intake, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
