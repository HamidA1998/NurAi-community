#!/usr/bin/env tsx

import fs from "node:fs";

import {
  PILGRIM_EMERGENCY_CONTACTS,
  PILGRIM_HEALTH_READINESS_CHECKLIST,
  PILGRIM_HEALTH_SAFETY_LAST_REVIEWED,
  PILGRIM_HEALTH_SAFETY_SOURCE_IDS,
  PILGRIM_HEALTH_SAFETY_TOPICS,
  type PilgrimSafetyPhase,
} from "../client/data/pilgrimHealthSafety";

const wantsJson = process.argv.includes("--json");

type Finding = {
  id: string;
  severity: "blocker" | "warning";
  message: string;
};

const findings: Finding[] = [];
const hajjUmrahScreenPath = "client/screens/HajjUmrahScreen.tsx";
const pilgrimCardServicePath = "client/services/pilgrimCardService.ts";

const REQUIRED_PHASES: PilgrimSafetyPhase[] = [
  "before-travel",
  "in-journey",
  "urgent-help",
];

const BANNED_CLAIMS =
  /\b(guarantee|guaranteed|medical diagnosis|treats?|cures?|fit to travel|official permit|official credential|replaces? (?:doctors?|clinicians?|emergency services?|Nusuk|Saudi authorities)|emergency dispatcher|triage service)\b/i;

function addFinding(
  id: string,
  severity: Finding["severity"],
  message: string,
) {
  findings.push({ id, severity, message });
}

function validReviewDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed) && parsed <= Date.now() + 24 * 60 * 60 * 1000;
}

function validateText(id: string, label: string, value: string, min = 24) {
  if (!value.trim() || value.trim().length < min) {
    addFinding(id, "blocker", `${label} is too short or missing.`);
  }
  if (BANNED_CLAIMS.test(value)) {
    addFinding(id, "blocker", `${label} contains an unsafe overclaim.`);
  }
}

if (!validReviewDate(PILGRIM_HEALTH_SAFETY_LAST_REVIEWED)) {
  addFinding(
    "last-reviewed",
    "blocker",
    "PILGRIM_HEALTH_SAFETY_LAST_REVIEWED must be a valid past or present YYYY-MM-DD date.",
  );
}

let uiWired = false;
if (!fs.existsSync(hajjUmrahScreenPath)) {
  addFinding(
    "hajj-umrah-screen",
    "blocker",
    `${hajjUmrahScreenPath} is missing.`,
  );
} else {
  const screen = fs.readFileSync(hajjUmrahScreenPath, "utf8");
  const requiredScreenTerms = [
    "PILGRIM_HEALTH_SAFETY_TOPICS",
    "PILGRIM_EMERGENCY_CONTACTS",
    "loadPilgrimCard",
    "savePilgrimCard",
    "formatPilgrimCardForShare",
    "Share.share",
    "pilgrim-card-panel",
    "pilgrim-card-share",
    "pilgrim-card-large-open",
    "pilgrim-card-large-view",
    "pilgrim-card-large-row-",
    "PILGRIM_HEALTH_READINESS_CHECKLIST",
    "STORAGE_KEY_HEALTH_READINESS",
    "toggleHealthReadinessItem",
    "health-readiness-panel",
    "health-readiness-progress",
    "health-readiness-item-",
    "health-readiness-toggle-",
    "health-readiness-source-",
    "pilgrim-safety-topic-",
    "pilgrim-emergency-",
    "Pilgrim safety mode",
  ];
  const missingTerms = requiredScreenTerms.filter(
    (term) => !screen.includes(term),
  );
  uiWired = missingTerms.length === 0;
  if (missingTerms.length > 0) {
    addFinding(
      "hajj-umrah-screen:wiring",
      "blocker",
      `Hajj/Umrah screen is not wired to pilgrim health/safety data: missing ${missingTerms.join(", ")}.`,
    );
  }
}

if (!fs.existsSync(pilgrimCardServicePath)) {
  addFinding(
    "pilgrim-card-service",
    "blocker",
    `${pilgrimCardServicePath} is missing.`,
  );
} else {
  const service = fs.readFileSync(pilgrimCardServicePath, "utf8");
  const requiredServiceTerms = [
    "expo-secure-store",
    "EMPTY_PILGRIM_CARD",
    "loadPilgrimCard",
    "savePilgrimCard",
    "clearPilgrimCard",
    "formatPilgrimCardForShare",
    "hasPilgrimCardDetails",
  ];
  const missingTerms = requiredServiceTerms.filter(
    (term) => !service.includes(term),
  );
  if (missingTerms.length > 0) {
    addFinding(
      "pilgrim-card-service:wiring",
      "blocker",
      `Pilgrim card service is missing ${missingTerms.join(", ")}.`,
    );
  }
}

if (PILGRIM_HEALTH_SAFETY_TOPICS.length < 6) {
  addFinding(
    "topic-count",
    "blocker",
    "Pilgrim health/safety data must include at least six source-backed topics.",
  );
}

if (PILGRIM_EMERGENCY_CONTACTS.length < 3) {
  addFinding(
    "emergency-contact-count",
    "blocker",
    "Pilgrim health/safety data must include at least three emergency contact cards.",
  );
}

if (PILGRIM_HEALTH_READINESS_CHECKLIST.length < 6) {
  addFinding(
    "readiness-count",
    "blocker",
    "Pilgrim health readiness checklist must include at least six source-backed items.",
  );
}

const topicIds = new Set<string>();
const readinessIds = new Set<string>();
const sourceIds = new Set<string>();
const phases = new Set<PilgrimSafetyPhase>();
const readinessPhases = new Set<PilgrimSafetyPhase>();

for (const topic of PILGRIM_HEALTH_SAFETY_TOPICS) {
  if (topicIds.has(topic.id)) {
    addFinding(topic.id, "blocker", "Topic IDs must be unique.");
  }
  topicIds.add(topic.id);
  phases.add(topic.phase);

  validateText(topic.id, "title", topic.title, 8);
  validateText(topic.id, "summary", topic.summary);
  validateText(topic.id, "notFor", topic.notFor);
  validateText(topic.id, "escalation", topic.escalation);

  if (!["prepare", "watch", "urgent"].includes(topic.riskLevel)) {
    addFinding(topic.id, "blocker", "riskLevel is invalid.");
  }
  if (topic.userActions.length < 3) {
    addFinding(
      topic.id,
      "blocker",
      "Each topic needs at least three user actions.",
    );
  }
  for (const [index, action] of topic.userActions.entries()) {
    validateText(`${topic.id}:action-${index + 1}`, "user action", action, 16);
  }

  if (topic.officialSourceIds.length === 0) {
    addFinding(
      topic.id,
      "blocker",
      "Each topic needs at least one official source.",
    );
  }
  for (const sourceId of topic.officialSourceIds) {
    if (!PILGRIM_HEALTH_SAFETY_SOURCE_IDS.has(sourceId)) {
      addFinding(
        topic.id,
        "blocker",
        `Unknown official source ID ${sourceId}.`,
      );
    }
    sourceIds.add(sourceId);
  }

  if (topic.riskLevel === "urgent" && !topic.offlineReady) {
    addFinding(topic.id, "blocker", "Urgent topics must be offline-ready.");
  }
}

for (const item of PILGRIM_HEALTH_READINESS_CHECKLIST) {
  if (readinessIds.has(item.id)) {
    addFinding(item.id, "blocker", "Readiness item IDs must be unique.");
  }
  readinessIds.add(item.id);
  readinessPhases.add(item.phase);

  validateText(item.id, "title", item.title, 8);
  validateText(item.id, "summary", item.summary);
  validateText(item.id, "checkLabel", item.checkLabel, 16);
  validateText(item.id, "sourceReason", item.sourceReason);

  if (!REQUIRED_PHASES.includes(item.phase)) {
    addFinding(item.id, "blocker", "Readiness item phase is invalid.");
  }
  if (item.officialSourceIds.length === 0) {
    addFinding(
      item.id,
      "blocker",
      "Each readiness item needs at least one official source.",
    );
  }
  for (const sourceId of item.officialSourceIds) {
    if (!PILGRIM_HEALTH_SAFETY_SOURCE_IDS.has(sourceId)) {
      addFinding(
        item.id,
        "blocker",
        `Unknown readiness official source ID ${sourceId}.`,
      );
    }
    sourceIds.add(sourceId);
  }
  if (item.phase === "urgent-help" && !item.offlineReady) {
    addFinding(
      item.id,
      "blocker",
      "Urgent readiness items must be offline-ready.",
    );
  }
}

if (
  !PILGRIM_HEALTH_READINESS_CHECKLIST.some((item) =>
    item.officialSourceIds.includes("saudi-moh-pilgrim-health"),
  )
) {
  addFinding(
    "readiness:moh-source",
    "blocker",
    "Readiness checklist must include the Saudi MOH pilgrim health source.",
  );
}

for (const phase of REQUIRED_PHASES) {
  if (!phases.has(phase)) {
    addFinding(
      `phase:${phase}`,
      "blocker",
      `Pilgrim health/safety data is missing phase ${phase}.`,
    );
  }
  if (!readinessPhases.has(phase)) {
    addFinding(
      `readiness-phase:${phase}`,
      "blocker",
      `Pilgrim health readiness checklist is missing phase ${phase}.`,
    );
  }
}

const contactIds = new Set<string>();
for (const contact of PILGRIM_EMERGENCY_CONTACTS) {
  if (contactIds.has(contact.id)) {
    addFinding(contact.id, "blocker", "Emergency contact IDs must be unique.");
  }
  contactIds.add(contact.id);

  validateText(contact.id, "label", contact.label, 8);
  validateText(contact.id, "useFor", contact.useFor);
  validateText(contact.id, "caveat", contact.caveat);
  if (!/^[0-9+/\s]+$/.test(contact.value)) {
    addFinding(
      contact.id,
      "blocker",
      "Emergency contact value must be a phone-like value.",
    );
  }
  if (!PILGRIM_HEALTH_SAFETY_SOURCE_IDS.has(contact.sourceLinkId)) {
    addFinding(
      contact.id,
      "blocker",
      `Unknown emergency contact source ID ${contact.sourceLinkId}.`,
    );
  }
}

const blockerCount = findings.filter(
  (finding) => finding.severity === "blocker",
).length;
const warningCount = findings.filter(
  (finding) => finding.severity === "warning",
).length;

const report = {
  ok: blockerCount === 0,
  topicCount: PILGRIM_HEALTH_SAFETY_TOPICS.length,
  readinessCount: PILGRIM_HEALTH_READINESS_CHECKLIST.length,
  emergencyContactCount: PILGRIM_EMERGENCY_CONTACTS.length,
  sourceCount: sourceIds.size,
  phaseCount: phases.size,
  readinessPhaseCount: readinessPhases.size,
  uiWired,
  lastReviewed: PILGRIM_HEALTH_SAFETY_LAST_REVIEWED,
  blockerCount,
  warningCount,
  findings,
};

if (wantsJson) {
  console.log(JSON.stringify(report, null, 2));
} else if (report.ok) {
  console.log(
    `Pilgrim health/safety check passed: ${report.topicCount} topics, ${report.readinessCount} checklist items, ${report.emergencyContactCount} emergency contacts, ${report.sourceCount} official sources.`,
  );
} else {
  console.error("Pilgrim health/safety check failed:");
  for (const finding of findings) {
    console.error(`- ${finding.severity}: ${finding.message}`);
  }
}

if (!report.ok) process.exit(1);
