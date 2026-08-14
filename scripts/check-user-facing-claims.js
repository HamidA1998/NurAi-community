#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

const scanRoots = ["client", path.join("server", "templates"), "app.json"];
const ignoredDirs = new Set([
  ".expo",
  ".git",
  "build",
  "dist",
  "node_modules",
  "server_dist",
  "static-build",
  "web-build",
]);
const textExtensions = new Set([".js", ".jsx", ".json", ".md", ".ts", ".tsx"]);
const quranVerseCounts = [
  0, 7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
  111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54,
  45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62,
  55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28,
  20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15,
  21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

const bannedClaims = [
  {
    id: "unlimited-ai-claim",
    pattern: /\bunlimited\s+AI(?:\b|-powered\b)/i,
  },
  {
    id: "unlimited-ai-entitlement-id",
    pattern: /\bunlimitedAIChat\b/,
  },
  {
    id: "priority-ai-claim",
    pattern: /\bPriority\s+AI\b/i,
  },
  {
    id: "unsupported-pdf-export-claim",
    pattern: /Data export\s*\(CSV,\s*JSON,\s*PDF\)/i,
  },
  {
    id: "hardcoded-subscription-discount",
    pattern: /\bSAVE\s+\d{1,3}\b/i,
  },
  {
    id: "hardcoded-subscription-price",
    pattern: /£(?:4\.99|19\.99|29\.99|159\.99)\b/,
  },
  {
    id: "unfinished-feature-label",
    pattern: /\bComing Soon\b/i,
  },
  {
    id: "overbroad-library-claim",
    pattern: /\bfull\s+(?:Hadith|Quran|Islamic)\s+library\b/i,
  },
  {
    id: "overbroad-device-privacy-claim",
    pattern:
      /\b(?:on this device only|device-only|never leaves your device|never leaves this device)\b/i,
  },
  {
    id: "unsupported-scholar-credential-claim",
    pattern: /\b(?:certified scholar|scholar-approved)\b/i,
  },
  {
    id: "authoritative-fiqh-paywall-claim",
    pattern:
      /\b(?:Deep fiqh analysis across madhabs|Scholar opinion comparisons)\b/i,
  },
  {
    id: "overbroad-companion-claim",
    pattern:
      /\b(?:all-in-one Islamic companion|support every aspect of your Islamic life)\b/i,
  },
  {
    id: "guaranteed-prayer-time-copy",
    pattern: /\baccurate prayer times\b/i,
  },
  {
    id: "absolute-anonymization-claim",
    pattern: /\bYour data is anonymized\b/i,
  },
  {
    id: "unfinished-email-invite-ui",
    pattern:
      /\b(?:Invite by Email|Email invitation sent|input-invite-email|button-send-email-invite)\b/i,
  },
  {
    id: "religious-outcome-overpromise",
    pattern:
      /\b(?:A direct divine guarantee|Ease is guaranteed|Allah guarantees|letter-for-letter what was revealed|guaranteed spiritual benefit|guaranteed (?:outcome|result|answer|relief)|Protection until the next|This struggle is sized for your strength|Anxiety dissolves|Take one step, Allah takes ten|This dua works|equivalent of the entire Quran|Quran intercedes for its companion|light shines for them between two Fridays|accepted at the time of khatm)\b/i,
  },
  {
    id: "unsupported-womens-health-fiqh-claim",
    pattern:
      /\b(?:According to scholarly consensus|does NOT need to be made up|Based on hadith of Aisha|Sunnah remedies include honey|black seed oil, and hijama|must continue praying and fasting after performing wudu for each prayer)\b/i,
  },
  {
    id: "unsupported-habit-hadith-wording",
    pattern:
      /\b(?:The Prophet \\uFDFA loved consistent deeds|The Prophet \\uFDFA said: Take up good deeds|most beloved deeds to Allah are those done consistently|Small daily acts of worship are more beloved to Allah|one who reads Quran regularly will be with the noble, righteous scribes|Charity does not decrease wealth)\b/i,
  },
];

function relative(file) {
  return path.relative(root, file);
}

function shouldScanFile(file) {
  return textExtensions.has(path.extname(file));
}

function walk(entryPath, files = []) {
  if (!fs.existsSync(entryPath)) return files;

  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    if (shouldScanFile(entryPath)) files.push(entryPath);
    return files;
  }

  for (const entry of fs.readdirSync(entryPath, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(entryPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && shouldScanFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function scanTextClaims(files) {
  const findings = [];

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const claim of bannedClaims) {
      claim.pattern.lastIndex = 0;
      const match = claim.pattern.exec(text);
      if (match) {
        findings.push({
          file: relative(file),
          line: lineNumberForIndex(text, match.index),
          id: claim.id,
          text: match[0],
        });
      }
    }
  }

  return findings;
}

function scanStructuredQuranContexts(findings) {
  const file = path.join(root, "client", "data", "quranContexts.json");
  if (!fs.existsSync(file)) return;

  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  for (const [verseKey, contexts] of Object.entries(data)) {
    for (const context of contexts) {
      const source = String(context.source || "");
      if (context.contextType === "hadith" && source.startsWith("Quran")) {
        const needle = `"verseKey": "${verseKey}"`;
        findings.push({
          file: relative(file),
          line: lineNumberForIndex(raw, raw.indexOf(needle)),
          id: "quran-context-mislabeled-as-hadith",
          text: `${verseKey} source=${source}`,
        });
      }
    }
  }
}

function isValidQuranSourceReference(reference) {
  const match = reference.match(/^Quran\s+(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?$/);
  if (!match) return false;

  const surah = Number.parseInt(match[1], 10);
  const ayah = Number.parseInt(match[2], 10);
  const endAyah = match[3] ? Number.parseInt(match[3], 10) : undefined;
  const verseCount = quranVerseCounts[surah];
  if (!verseCount || ayah < 1 || ayah > verseCount) return false;
  return endAyah === undefined || (endAyah >= ayah && endAyah <= verseCount);
}

function isValidExactHadithSourceReference(reference) {
  return /^(?:Sahih al-Bukhari|Sahih Muslim|Jami at-Tirmidhi|Sunan Abu Dawud|Sunan an-Nasa'i|Sunan Ibn Majah)\s+\d+[a-z]?$/i.test(
    reference,
  );
}

function expectedSunnahUrlForHadithReference(reference) {
  const match = reference.match(
    /^(Sahih al-Bukhari|Sahih Muslim|Jami at-Tirmidhi|Sunan Abu Dawud|Sunan an-Nasa'i|Sunan Ibn Majah)\s+(\d+[a-z]?)$/i,
  );
  if (!match) return null;
  const collection = match[1].toLowerCase();
  const number = match[2].toLowerCase();
  const slug = collection.includes("bukhari")
    ? "bukhari"
    : collection.includes("muslim")
      ? "muslim"
      : collection.includes("tirmidhi")
        ? "tirmidhi"
        : collection.includes("dawud")
          ? "abudawud"
          : collection.includes("nasa")
            ? "nasai"
            : collection.includes("majah")
              ? "ibnmajah"
              : null;
  return slug ? `https://sunnah.com/${slug}:${number}` : null;
}

function verifiedHadithSourceUrls() {
  const dataDir = path.join(root, "client", "data");
  const files = [
    "bukhari.json",
    "muslim.json",
    "abu_dawud.json",
    "tirmidhi.json",
    "nasai.json",
    "ibn_majah.json",
  ];
  const urlsByReference = new Map();
  for (const fileName of files) {
    const fullPath = path.join(dataDir, fileName);
    if (!fs.existsSync(fullPath)) continue;
    const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    for (const chapter of data.chapters || []) {
      for (const hadith of chapter.hadiths || []) {
        if (
          hadith.sourceReviewStatus === "source_link_verified" &&
          typeof hadith.sourceReference === "string" &&
          typeof hadith.sourceUrl === "string"
        ) {
          urlsByReference.set(hadith.sourceReference, hadith.sourceUrl);
        }
      }
    }
  }
  return urlsByReference;
}

function scanStructuredV3DailyMotivations(findings) {
  const file = path.join(root, "client", "services", "nuraiContentDBV3.ts");
  if (!fs.existsSync(file)) return;

  const raw = fs.readFileSync(file, "utf8");
  const verifiedHadithUrls = verifiedHadithSourceUrls();
  const blockMatch = raw.match(
    /const DAILY_MOTIVATIONS:\s*DailyMotivation\[\]\s*=\s*\[([\s\S]*?)\];/,
  );
  if (!blockMatch) {
    findings.push({
      file: relative(file),
      line: 1,
      id: "daily-motivation-source-block-missing",
      text: "DAILY_MOTIVATIONS",
    });
    return;
  }

  const objectRegex = /\{\s*id:\s*\d+,[\s\S]*?\n\s*\}/g;
  const objectMatches = [...blockMatch[1].matchAll(objectRegex)];
  const sources = [];
  for (const objectMatch of objectMatches) {
    const objectText = objectMatch[0];
    const sourceMatch = objectText.match(/source:\s*"([^"]+)"/);
    if (!sourceMatch) continue;
    const sourceUrlMatch = objectText.match(/sourceUrl:\s*"([^"]+)"/);
    sources.push({
      value: sourceMatch[1],
      sourceUrl: sourceUrlMatch?.[1],
      index: (objectMatch.index ?? 0) + sourceMatch.index,
    });
  }

  if (sources.length === 0) {
    findings.push({
      file: relative(file),
      line: lineNumberForIndex(raw, raw.indexOf(blockMatch[0])),
      id: "daily-motivation-source-missing",
      text: "No source fields found",
    });
    return;
  }

  for (const source of sources) {
    if (isValidQuranSourceReference(source.value)) continue;
    if (isValidExactHadithSourceReference(source.value)) {
      const expectedUrl = expectedSunnahUrlForHadithReference(source.value);
      const indexedUrl = verifiedHadithUrls.get(source.value);
      if (!source.sourceUrl || source.sourceUrl !== expectedUrl) {
        findings.push({
          file: relative(file),
          line: lineNumberForIndex(
            raw,
            raw.indexOf(blockMatch[1]) + source.index,
          ),
          id: "daily-motivation-hadith-source-url-missing",
          text: `${source.value} sourceUrl=${source.sourceUrl || "missing"} expected=${expectedUrl || "unknown"}`,
        });
      } else if (indexedUrl !== source.sourceUrl) {
        findings.push({
          file: relative(file),
          line: lineNumberForIndex(
            raw,
            raw.indexOf(blockMatch[1]) + source.index,
          ),
          id: "daily-motivation-hadith-source-index-missing",
          text: `${source.value} sourceUrl=${source.sourceUrl}`,
        });
      }
      continue;
    }

    findings.push({
      file: relative(file),
      line: lineNumberForIndex(raw, raw.indexOf(blockMatch[1]) + source.index),
      id: "daily-motivation-unverified-source",
      text: source.value,
    });
  }
}

function scanKidsStoriesReleaseClaims(findings) {
  const file = path.join(root, "client", "screens", "KidsStoriesScreen.tsx");
  if (!fs.existsSync(file)) return;

  const raw = fs.readFileSync(file, "utf8");
  const riskyPatterns = [
    {
      id: "kids-story-direct-hadith-attribution",
      pattern:
        /\b(?:The Prophet|Prophet Muhammad)\s*\(SAW\)\s+(?:said|also said)\b/i,
    },
    {
      id: "kids-story-unsupported-hadith-label",
      pattern: /\b(?:hadith:|double the reward|best woman of her time)\b/i,
    },
    {
      id: "kids-story-weak-spider-cave-detail",
      pattern:
        /\b(?:famous spider|spider(?:'s)? web|nesting dove|dove that made a nest)\b/i,
    },
    {
      id: "kids-story-overclaimed-seerah-detail",
      pattern: /\b(?:palaces of Syria|most beloved creation)\b/i,
    },
  ];

  for (const check of riskyPatterns) {
    check.pattern.lastIndex = 0;
    const match = check.pattern.exec(raw);
    if (!match) continue;

    findings.push({
      file: relative(file),
      line: lineNumberForIndex(raw, match.index),
      id: check.id,
      text: match[0],
    });
  }
}

function scanInspirationSourceLabels(findings) {
  const file = path.join(root, "client", "screens", "InspirationScreen.tsx");
  if (!fs.existsSync(file)) return;

  const raw = fs.readFileSync(file, "utf8");
  const sourceRegex = /source:\s*"([^"]+)"/g;
  for (const match of raw.matchAll(sourceRegex)) {
    const source = match[1];
    if (
      source === "NurAI reflection" ||
      isValidQuranSourceReference(source) ||
      isValidExactHadithSourceReference(source)
    ) {
      continue;
    }

    findings.push({
      file: relative(file),
      line: lineNumberForIndex(raw, match.index ?? 0),
      id: "inspiration-unverified-source-label",
      text: source,
    });
  }
}

function scanAdhkarSourceLabels(findings) {
  const file = path.join(root, "client", "screens", "AdhkarScreen.tsx");
  if (!fs.existsSync(file)) return;

  const raw = fs.readFileSync(file, "utf8");
  const sourceRegex = /reference:\s*"([^"]+)"/g;
  for (const match of raw.matchAll(sourceRegex)) {
    const source = match[1];
    if (
      isValidQuranSourceReference(source) ||
      isValidExactHadithSourceReference(source)
    ) {
      continue;
    }

    findings.push({
      file: relative(file),
      line: lineNumberForIndex(raw, match.index ?? 0),
      id: "adhkar-unverified-source-label",
      text: source,
    });
  }
}

function scanJanazahSourceLabels(findings) {
  const file = path.join(root, "client", "screens", "JanazahGuideScreen.tsx");
  if (!fs.existsSync(file)) return;

  const raw = fs.readFileSync(file, "utf8");
  const sourceRegex = /reference:\s*"([^"]+)"/g;
  for (const match of raw.matchAll(sourceRegex)) {
    const source = match[1];
    if (
      isValidQuranSourceReference(source) ||
      isValidExactHadithSourceReference(source)
    ) {
      continue;
    }

    findings.push({
      file: relative(file),
      line: lineNumberForIndex(raw, match.index ?? 0),
      id: "janazah-unverified-source-label",
      text: source,
    });
  }
}

function scanExactReligiousSourceFields(findings, relativePath, fieldName, id) {
  const file = path.join(root, ...relativePath.split("/"));
  if (!fs.existsSync(file)) return;

  const raw = fs.readFileSync(file, "utf8");
  const sourceRegex = new RegExp(`\\b${fieldName}:\\s*"([^"]+)"`, "g");
  for (const match of raw.matchAll(sourceRegex)) {
    const source = match[1];
    if (
      isValidQuranSourceReference(source) ||
      isValidExactHadithSourceReference(source)
    ) {
      continue;
    }

    findings.push({
      file: relative(file),
      line: lineNumberForIndex(raw, match.index ?? 0),
      id,
      text: source,
    });
  }
}

function main() {
  const files = scanRoots.flatMap((entry) => walk(path.join(root, entry)));
  const findings = scanTextClaims(files);
  scanStructuredQuranContexts(findings);
  scanStructuredV3DailyMotivations(findings);
  scanKidsStoriesReleaseClaims(findings);
  scanInspirationSourceLabels(findings);
  scanAdhkarSourceLabels(findings);
  scanJanazahSourceLabels(findings);
  scanExactReligiousSourceFields(
    findings,
    "client/screens/DuasScreen.tsx",
    "reference",
    "duas-unverified-source-label",
  );
  scanExactReligiousSourceFields(
    findings,
    "client/screens/JanazahScreen.tsx",
    "reference",
    "janazah-legacy-unverified-source-label",
  );
  scanExactReligiousSourceFields(
    findings,
    "client/screens/ShareableCardsScreen.tsx",
    "source",
    "share-card-unverified-source-label",
  );

  if (findings.length > 0) {
    console.error("User-facing claim check failed:");
    for (const finding of findings) {
      console.error(
        `- ${finding.file}:${finding.line} matched ${finding.id} (${JSON.stringify(finding.text)})`,
      );
    }
    process.exit(1);
  }

  console.log(
    `User-facing claim check passed: ${files.length} files scanned for unsupported release claims.`,
  );
}

main();
