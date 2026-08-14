#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import {
  UMMAH_PRODUCT_ROADMAP,
  UMMAH_PRODUCT_ROADMAP_LAST_REVIEWED,
  type UmmahProductRoadmapItem,
} from "../client/data/ummahProductRoadmap";

const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");
const wantsJson =
  process.argv.includes("--json") || process.argv.includes("--summary-json");

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const root = process.cwd();
const outPath = path.resolve(
  root,
  argValue("--out") ?? "docs/audit/UMMAH_PRODUCT_ROADMAP.md",
);

const categoryLabels: Record<UmmahProductRoadmapItem["category"], string> = {
  trust: "Trust",
  quran: "Quran",
  hifz: "Hifz",
  privacy: "Privacy",
  "daily-os": "Today In Deen",
  umrah: "Umrah",
  "local-community": "Local Community",
  duas: "Duas And Dhikr",
  learning: "Learning",
  finance: "Finance",
  accessibility: "Accessibility",
  "release-readiness": "Release Readiness",
};

const statusLabels: Record<UmmahProductRoadmapItem["status"], string> = {
  implemented: "Implemented",
  "partially-built": "Partially built",
  planned: "Planned",
  "blocked-external": "Blocked by external setup",
};

function markdownList(values: string[]) {
  return values.map((value) => `- ${value}`).join("\n");
}

function renderSourceSignals(item: UmmahProductRoadmapItem) {
  return item.sourceSignals
    .map(
      (source) =>
        `- [${source.title}](${source.url}) (${source.authority}): ${source.insight}`,
    )
    .join("\n");
}

function renderRoadmapItem(item: UmmahProductRoadmapItem) {
  const evidence = item.implementedEvidence?.length
    ? markdownList(item.implementedEvidence.map((entry) => `\`${entry}\``))
    : "- No implementation evidence yet.";

  return `## ${item.title}

- Category: ${categoryLabels[item.category]}
- Priority: P${item.priority}
- Status: ${statusLabels[item.status]}
- Last checked: ${item.lastChecked}

### Source Signals

${renderSourceSignals(item)}

### NurAI Opportunity

${item.nuraiOpportunity}

### Safety Boundary

${item.safetyBoundary}

### Next Build

${markdownList(item.nextBuild)}

### Implementation Evidence

${evidence}
`;
}

function renderMarkdown() {
  const sourceCount = UMMAH_PRODUCT_ROADMAP.reduce(
    (sum, item) => sum + item.sourceSignals.length,
    0,
  );

  return `# NurAI Ummah Product Roadmap

Last reviewed: ${UMMAH_PRODUCT_ROADMAP_LAST_REVIEWED}

This roadmap turns the source-backed competitor and official-service research into concrete NurAI build priorities. It is intentionally conservative: every item needs source signals, safety boundaries, and implementation evidence when it is already marked implemented or partially built.

## Summary

- Roadmap items: ${UMMAH_PRODUCT_ROADMAP.length}
- Source signals: ${sourceCount}
- Categories: ${new Set(UMMAH_PRODUCT_ROADMAP.map((item) => item.category)).size}
- Validation command: \`npm run check:ummah-product-roadmap\`

${UMMAH_PRODUCT_ROADMAP.map(renderRoadmapItem).join("\n")}
`;
}

function checkCurrent(markdown: string) {
  if (!fs.existsSync(outPath)) {
    return {
      ok: false,
      findings: [
        `Missing ummah product roadmap artifact: ${path.relative(root, outPath)}`,
      ],
    };
  }

  const existing = fs.readFileSync(outPath, "utf8");
  if (existing !== markdown) {
    return {
      ok: false,
      findings: [
        `${path.relative(root, outPath)} is stale; run npm run export:ummah-product-roadmap -- --write.`,
      ],
    };
  }

  return { ok: true, findings: [] };
}

const statusCounts = UMMAH_PRODUCT_ROADMAP.reduce(
  (counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  },
  {} as Record<UmmahProductRoadmapItem["status"], number>,
);

const sourceCount = UMMAH_PRODUCT_ROADMAP.reduce(
  (sum, item) => sum + item.sourceSignals.length,
  0,
);
const markdown = renderMarkdown();
if (wantsWrite) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, markdown);
}
const check = wantsCheck ? checkCurrent(markdown) : null;
const report = {
  ok: check ? check.ok : true,
  outPath: path.relative(root, outPath),
  willWrite: wantsWrite,
  checked: wantsCheck,
  findings: check ? check.findings : [],
  itemCount: UMMAH_PRODUCT_ROADMAP.length,
  sourceCount,
  categoryCount: new Set(UMMAH_PRODUCT_ROADMAP.map((item) => item.category))
    .size,
  statusCounts,
  lastReviewed: UMMAH_PRODUCT_ROADMAP_LAST_REVIEWED,
};

if (wantsJson) {
  console.log(JSON.stringify(report, null, 2));
  if (check && !check.ok) process.exit(1);
} else if (wantsWrite) {
  console.log(`Wrote ${report.outPath}.`);
} else if (wantsCheck) {
  if (!check?.ok) {
    console.error(check?.findings.join("\n") || "Ummah roadmap check failed.");
    process.exit(1);
  }
  console.log(`Ummah product roadmap is current at ${report.outPath}.`);
} else {
  console.log(markdown);
}
