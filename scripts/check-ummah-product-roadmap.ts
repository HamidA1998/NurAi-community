#!/usr/bin/env tsx

import {
  UMMAH_PRODUCT_ROADMAP,
  UMMAH_PRODUCT_ROADMAP_LAST_REVIEWED,
  type UmmahRoadmapCategory,
} from "../client/data/ummahProductRoadmap";
import { LIBRARY_BOOKS } from "../client/data/libraryBooks";

const wantsJson = process.argv.includes("--json");

type Finding = {
  id: string;
  severity: "blocker" | "warning";
  message: string;
};

const findings: Finding[] = [];

const REQUIRED_CATEGORIES: UmmahRoadmapCategory[] = [
  "trust",
  "quran",
  "hifz",
  "privacy",
  "daily-os",
  "umrah",
  "local-community",
  "duas",
  "learning",
  "finance",
  "accessibility",
  "release-readiness",
];

const APPROVED_HOSTS = new Set([
  "www.muslimpro.com",
  "muslimpro.com",
  "support.muslimpro.com",
  "app.yaqeen.io",
  "yaqeeninstitute.org",
  "yaqeenconnect.com",
  "seekersguidance.org",
  "bayyinahtv.zendesk.com",
  "explore.bayyinahtv.com",
  "www.qalam.institute",
  "help.muslimcentral.com",
  "play.google.com",
  "www.quranly.app",
  "quranly.app",
  "support.tarteel.ai",
  "hifzai.org",
  "www.thepillarsapp.com",
  "thepillarsapp.com",
  "www.theusul.app",
  "theusul.app",
  "apps.apple.com",
  "hajj.nusuk.sa",
  "umrah.nusuk.sa",
  "pep.gov.sa",
  "mawaqit.net",
  "developers.google.com",
  "www.dhikranddua.com",
  "dhikranddua.com",
  "faq.sajda.app",
  "quran.com",
  "kahfkids.com",
  "www.kahfkids.com",
  "deenee.app",
  "www.deenee.app",
  "haj.gov.sa",
  "www.moh.gov.sa",
  "www.cdc.gov",
  "www.emro.who.int",
  "www.w3.org",
  "www.ftc.gov",
  "ftc.gov",
  "www.humanetech.com",
  "humanetech.com",
  "support.google.com",
  "developer.apple.com",
  "docs.runpod.io",
  "docs.vllm.ai",
  "deepmind.google",
  "huggingface.co",
  "www.launchgood.com",
  "launchgood.com",
  "islamic-relief.org",
  "www.islamic-relief.org",
]);

const BANNED_CLAIMS =
  /\b(guarantee|guaranteed|addict(?:ed|ive|ion)|hook(?:ed|ing)?|manipulat(?:e|ive)|replace scholars?|replace teachers?|replace clinicians?|officially verified by NurAI|NurAI issues|NurAI permits|live crowd prediction|medical diagnosis|fatwa engine)\b/i;
const currentLibraryBookCount = LIBRARY_BOOKS.length;

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

function validateText(itemId: string, field: string, text: string, min = 24) {
  if (!text || text.trim().length < min) {
    addFinding(
      `${itemId}:${field}`,
      "blocker",
      `${itemId} has weak or missing ${field}.`,
    );
  }
  if (BANNED_CLAIMS.test(text)) {
    addFinding(
      `${itemId}:${field}:banned-claim`,
      "blocker",
      `${itemId} ${field} contains an overclaim or manipulative product claim.`,
    );
  }
}

function validateLibraryBookCountReference(
  itemId: string,
  field: string,
  text: string,
) {
  const countMatch = text.match(/\ball\s+(\d+)\s+books\b/i);
  if (!countMatch) return;

  const statedBookCount = Number(countMatch[1]);
  if (statedBookCount !== currentLibraryBookCount) {
    addFinding(
      `${itemId}:${field}:library-book-count`,
      "blocker",
      `${itemId} ${field} references all ${statedBookCount} books, but the current library has ${currentLibraryBookCount} books.`,
    );
  }
}

const seenIds = new Set<string>();
const seenSourceUrls = new Set<string>();
const categories = new Set<UmmahRoadmapCategory>();

if (!validReviewDate(UMMAH_PRODUCT_ROADMAP_LAST_REVIEWED)) {
  addFinding(
    "roadmap:last-reviewed",
    "blocker",
    "UMMAH_PRODUCT_ROADMAP_LAST_REVIEWED must be a valid past or present YYYY-MM-DD date.",
  );
}

if (UMMAH_PRODUCT_ROADMAP.length < 10) {
  addFinding(
    "roadmap:minimum-size",
    "blocker",
    "The ummah product roadmap should keep at least 10 source-backed opportunities.",
  );
}

for (const item of UMMAH_PRODUCT_ROADMAP) {
  categories.add(item.category);

  if (seenIds.has(item.id)) {
    addFinding(item.id, "blocker", `${item.id} is duplicated.`);
  }
  seenIds.add(item.id);

  if (!validReviewDate(item.lastChecked)) {
    addFinding(
      `${item.id}:last-checked`,
      "blocker",
      `${item.id} lastChecked must be a valid past or present YYYY-MM-DD date.`,
    );
  }

  validateText(item.id, "title", item.title, 10);
  validateText(item.id, "nuraiOpportunity", item.nuraiOpportunity);
  validateText(item.id, "safetyBoundary", item.safetyBoundary);
  validateLibraryBookCountReference(
    item.id,
    "nuraiOpportunity",
    item.nuraiOpportunity,
  );
  validateLibraryBookCountReference(
    item.id,
    "safetyBoundary",
    item.safetyBoundary,
  );

  if (![1, 2, 3].includes(item.priority)) {
    addFinding(
      `${item.id}:priority`,
      "blocker",
      `${item.id} priority must be 1, 2, or 3.`,
    );
  }

  if (item.sourceSignals.length < 2) {
    addFinding(
      `${item.id}:source-signals`,
      "blocker",
      `${item.id} must include at least two source signals.`,
    );
  }

  for (const source of item.sourceSignals) {
    validateText(item.id, `source:${source.title}:insight`, source.insight);
    let parsed: URL;
    try {
      parsed = new URL(source.url);
    } catch {
      addFinding(
        `${item.id}:${source.title}:url`,
        "blocker",
        `${item.id} source ${source.title} has an invalid URL.`,
      );
      continue;
    }

    if (parsed.protocol !== "https:") {
      addFinding(
        `${item.id}:${source.title}:https`,
        "blocker",
        `${item.id} source ${source.title} must use HTTPS.`,
      );
    }
    if (!APPROVED_HOSTS.has(parsed.hostname)) {
      addFinding(
        `${item.id}:${source.title}:host`,
        "blocker",
        `${item.id} source host ${parsed.hostname} is not in the approved roadmap source list.`,
      );
    }

    const urlKey = source.url.replace(/\/$/, "");
    if (seenSourceUrls.has(urlKey)) {
      addFinding(
        `${item.id}:${source.title}:duplicate-url`,
        "warning",
        `${item.id} reuses source URL ${source.url}; keep duplicates intentional and source-specific.`,
      );
    }
    seenSourceUrls.add(urlKey);
  }

  if (item.nextBuild.length < 2) {
    addFinding(
      `${item.id}:next-build`,
      "blocker",
      `${item.id} needs at least two concrete nextBuild actions.`,
    );
  }
  for (const [index, action] of item.nextBuild.entries()) {
    validateLibraryBookCountReference(item.id, `nextBuild[${index}]`, action);
  }

  if (
    (item.status === "implemented" || item.status === "partially-built") &&
    (!item.implementedEvidence || item.implementedEvidence.length < 2)
  ) {
    addFinding(
      `${item.id}:implemented-evidence`,
      "blocker",
      `${item.id} is ${item.status} but does not list enough implementation evidence.`,
    );
  }
}

for (const category of REQUIRED_CATEGORIES) {
  if (!categories.has(category)) {
    addFinding(
      `category:${category}`,
      "blocker",
      `Ummah roadmap is missing required category ${category}.`,
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
  itemCount: UMMAH_PRODUCT_ROADMAP.length,
  categoryCount: categories.size,
  sourceCount: UMMAH_PRODUCT_ROADMAP.reduce(
    (sum, item) => sum + item.sourceSignals.length,
    0,
  ),
  lastReviewed: UMMAH_PRODUCT_ROADMAP_LAST_REVIEWED,
  blockerCount,
  warningCount,
  findings,
};

if (wantsJson) {
  console.log(JSON.stringify(report, null, 2));
} else if (report.ok) {
  console.log(
    `Ummah product roadmap check passed: ${report.itemCount} opportunities, ${report.sourceCount} source signals, ${report.categoryCount} categories.`,
  );
} else {
  console.error("Ummah product roadmap check failed:");
  for (const finding of findings) {
    console.error(`- ${finding.severity}: ${finding.message}`);
  }
}

if (!report.ok) process.exit(1);
