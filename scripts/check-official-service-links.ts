#!/usr/bin/env tsx

import {
  OFFICIAL_SERVICE_LAST_REVIEWED,
  OFFICIAL_SERVICE_LINKS,
  OfficialServiceCategory,
} from "../client/data/officialServiceLinks";

const wantsJson = process.argv.includes("--json");

type Finding = {
  id: string;
  severity: "blocker" | "warning";
  message: string;
};

const allowedHosts = new Set([
  "www.nusuk.sa",
  "nusuk.sa",
  "umrah.nusuk.sa",
  "hajj.nusuk.sa",
  "haj.gov.sa",
  "www.moh.gov.sa",
  "moh.gov.sa",
  "travel.state.gov",
  "www.cdc.gov",
  "cdc.gov",
  "pep.gov.sa",
  "sar.hhr.sa",
]);

const requiredCategories: OfficialServiceCategory[] = [
  "official-platform",
  "visa-booking",
  "identity",
  "health",
  "safety",
  "transport",
  "guidance",
];

const bannedClaimPattern =
  /\b(guarantee|guaranteed|officially verified by NurAI|NurAI issues|NurAI books|NurAI permits|replace Nusuk|replaces Nusuk|medical diagnosis|NurAI legal authority)\b/i;

const findings: Finding[] = [];

function addFinding(
  id: string,
  severity: Finding["severity"],
  message: string,
) {
  findings.push({ id, severity, message });
}

function hasRealText(value: unknown) {
  return typeof value === "string" && value.trim().length >= 20;
}

function parseDate(id: string, value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    addFinding(id, "blocker", "lastChecked must use YYYY-MM-DD format.");
    return null;
  }
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed)) {
    addFinding(id, "blocker", "lastChecked must be a valid date.");
    return null;
  }
  if (parsed > Date.now() + 24 * 60 * 60 * 1000) {
    addFinding(id, "blocker", "lastChecked must not be in the future.");
  }
  return parsed;
}

function daysSince(timestamp: number) {
  return Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
}

const ids = new Set<string>();
const urls = new Set<string>();
const categories = new Set<OfficialServiceCategory>();

const lastReviewed = parseDate(
  "official-service-last-reviewed",
  OFFICIAL_SERVICE_LAST_REVIEWED,
);
if (lastReviewed && daysSince(lastReviewed) > 90) {
  addFinding(
    "official-service-last-reviewed",
    "blocker",
    "Official service catalog has not been reviewed in the last 90 days.",
  );
}

for (const link of OFFICIAL_SERVICE_LINKS) {
  if (ids.has(link.id)) {
    addFinding(link.id, "blocker", "Official service link IDs must be unique.");
  }
  ids.add(link.id);

  if (urls.has(link.url)) {
    addFinding(
      link.id,
      "blocker",
      "Official service link URLs must be unique.",
    );
  }
  urls.add(link.url);
  categories.add(link.category);

  let url: URL | null = null;
  try {
    url = new URL(link.url);
  } catch {
    addFinding(link.id, "blocker", `Invalid URL: ${link.url}`);
  }

  if (url) {
    if (url.protocol !== "https:") {
      addFinding(link.id, "blocker", "Official service URLs must use HTTPS.");
    }
    if (!allowedHosts.has(url.hostname)) {
      addFinding(
        link.id,
        "blocker",
        `Unapproved official-service host: ${url.hostname}`,
      );
    }
  }

  const checked = parseDate(link.id, link.lastChecked);
  if (checked) {
    const maxAge = Math.max(1, link.refreshCadenceDays);
    if (daysSince(checked) > maxAge) {
      addFinding(
        link.id,
        "blocker",
        `${link.title} is stale; lastChecked is older than ${maxAge} days.`,
      );
    }
  }

  for (const [field, value] of [
    ["summary", link.summary],
    ["useFor", link.useFor],
    ["doNotUseFor", link.doNotUseFor],
    ["externalAuthorityWarning", link.externalAuthorityWarning],
  ] as const) {
    if (!hasRealText(value)) {
      addFinding(
        link.id,
        "blocker",
        `${field} must be specific and non-empty.`,
      );
    }
  }

  const searchableText = [
    link.title,
    link.summary,
    link.useFor,
    link.doNotUseFor,
    link.externalAuthorityWarning,
  ].join(" ");
  if (bannedClaimPattern.test(searchableText)) {
    addFinding(
      link.id,
      "blocker",
      "Official service copy contains an over-claim or unsafe authority claim.",
    );
  }
}

for (const category of requiredCategories) {
  if (!categories.has(category)) {
    addFinding(
      `category:${category}`,
      "blocker",
      `Official service catalog must include at least one ${category} link.`,
    );
  }
}

if (OFFICIAL_SERVICE_LINKS.length < 10) {
  addFinding(
    "official-service-count",
    "blocker",
    "Official service catalog must include at least 10 source-backed links.",
  );
}

const blockerCount = findings.filter(
  (finding) => finding.severity === "blocker",
).length;
const warningCount = findings.filter(
  (finding) => finding.severity === "warning",
).length;

const report = {
  ok: blockerCount === 0,
  linkCount: OFFICIAL_SERVICE_LINKS.length,
  lastReviewed: OFFICIAL_SERVICE_LAST_REVIEWED,
  categoryCount: categories.size,
  blockerCount,
  warningCount,
  findings,
};

if (wantsJson) {
  console.log(JSON.stringify(report, null, 2));
} else if (report.ok) {
  console.log(
    `Official service-link check passed: ${report.linkCount} links, ${report.categoryCount} categories, last reviewed ${report.lastReviewed}.`,
  );
} else {
  console.error("Official service-link check failed:");
  for (const finding of findings) {
    console.error(`- ${finding.id}: ${finding.message}`);
  }
}

if (!report.ok) process.exit(1);
