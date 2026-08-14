#!/usr/bin/env node

const fs = require("fs");
const https = require("https");
const path = require("path");

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const libraryPath = path.join(root, "client/data/libraryBooks.ts");
const qaPath = path.join(root, "LIBRARY_QA.md");
const quranContextsPath = path.join(root, "client/data/quranContexts.json");
const hadithFiles = [
  "bukhari.json",
  "muslim.json",
  "abu_dawud.json",
  "tirmidhi.json",
  "nasai.json",
  "ibn_majah.json",
];
const filesToScan = [
  libraryPath,
  path.join(root, "client/services/aiLibraryService.ts"),
  path.join(root, "client/screens/BookReaderScreen.tsx"),
  path.join(root, "client/screens/LibraryHomeScreen.tsx"),
  path.join(root, "client/screens/LibrarySourceReviewScreen.tsx"),
  qaPath,
  quranContextsPath,
  path.join(root, "HADITH_SOURCE_AUDIT.md"),
  path.join(root, "client/screens/HadithLibraryScreen.tsx"),
  path.join(root, "client/data/hadithData.ts"),
  ...hadithFiles.map((file) => path.join(root, "client/data", file)),
].filter((file) => fs.existsSync(file));

const bannedPatterns = [
  /source_placeholders/i,
  /hadith_placeholder/i,
  /source pending verification/i,
  /pending verification/i,
  /source placeholder/i,
  /source placeholders/i,
  /lorem ipsum/i,
  /dummy/i,
  /fake citation/i,
  /tbd citation/i,
];

const trustedHosts = new Set([
  "quran.com",
  "www.quran.com",
  "sunnah.com",
  "www.sunnah.com",
]);

const quranVerseCounts = [
  0, 7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
  111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54,
  45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62,
  55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28,
  20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15,
  21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

const validQuranContextTypes = new Set([
  "revelation",
  "tafsir",
  "hadith",
  "practical",
  "linguistic",
]);

const exactHadithSourcePattern =
  /^(?:Sahih al-Bukhari|Sahih Muslim|Sunan Abu Dawud|Sunan an-Nasa'i|Sunan Ibn Majah|Jami at-Tirmidhi)\s+\d+[a-z]?$/;

const vagueSourcePattern =
  /^(?:Abu Dawud|An-Nasai|Tirmidhi)\s+\d+|^(?:Tafsir Ibn Kathir|Tafsir al-Sa'di|Ibn Hibban|Sunan ad-Darimi)$/i;

function fail(message) {
  console.error(`Library integrity failed: ${message}`);
  process.exitCode = 1;
}

function scanBannedText() {
  for (const file of filesToScan) {
    const text = fs.readFileSync(file, "utf8");
    for (const pattern of bannedPatterns) {
      if (pattern.test(text)) {
        fail(
          `${path.relative(root, file)} contains banned wording: ${pattern}`,
        );
      }
    }
  }
}

function extractSourceUrls(text) {
  const urls = [];
  const regex = /url:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(text))) {
    urls.push(match[1]);
  }
  return urls;
}

function validateTrustedUrls() {
  const text = fs.readFileSync(libraryPath, "utf8");
  const urls = extractSourceUrls(text);
  if (urls.length === 0) {
    fail("No source URLs found in libraryBooks.ts");
    return [];
  }

  for (const urlText of urls) {
    let url;
    try {
      url = new URL(urlText);
    } catch {
      fail(`Invalid source URL: ${urlText}`);
      continue;
    }
    if (url.protocol !== "https:") {
      fail(`Source URL must use https: ${urlText}`);
    }
    if (!trustedHosts.has(url.hostname)) {
      fail(`Untrusted source URL host: ${urlText}`);
    }
  }

  return urls;
}

function validateStatusHonesty() {
  const text = fs.readFileSync(libraryPath, "utf8");
  const reviewStartMarker = "  // REVIEW_EVIDENCE_START";
  const reviewEndMarker = "  // REVIEW_EVIDENCE_END";
  const reviewStart = text.indexOf(reviewStartMarker);
  const reviewEnd = text.indexOf(reviewEndMarker);
  const textOutsideReviewEvidence =
    reviewStart === -1 || reviewEnd === -1 || reviewEnd < reviewStart
      ? text
      : `${text.slice(0, reviewStart)}${text.slice(reviewEnd + reviewEndMarker.length)}`;
  const publishedMatches =
    textOutsideReviewEvidence.match(/verifiedContentStatus:\s*"published"/g) ??
    [];
  if (publishedMatches.length > 0) {
    fail(
      "Library books must not be manually marked published outside the validated review-evidence import block.",
    );
  }
}

function validateHadithLibraryLock() {
  const screenPath = path.join(root, "client/screens/HadithLibraryScreen.tsx");
  if (!fs.existsSync(screenPath)) return;
  const screenText = fs.readFileSync(screenPath, "utf8");
  const locked = /HADITH_LIBRARY_SOURCE_REVIEW_LOCKED\s*=\s*true/.test(
    screenText,
  );
  if (locked) return;

  const dataDir = path.join(root, "client/data");
  let sourceRows = 0;
  const sourceUrls = [];
  for (const file of hadithFiles) {
    const fullPath = path.join(dataDir, file);
    if (!fs.existsSync(fullPath)) continue;
    const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    if (data.sourcePolicy !== "source_index_only_no_local_hadith_text") {
      fail(
        `${file} must declare source_index_only_no_local_hadith_text before Hadith Library is released.`,
      );
    }
    for (const chapter of data.chapters ?? []) {
      for (const hadith of chapter.hadiths ?? []) {
        sourceRows += 1;
        if (
          typeof hadith.text === "string" ||
          typeof hadith.narrator === "string" ||
          typeof hadith.grade === "string"
        ) {
          fail(
            `${file} must not bundle local hadith text, narrator, or grade fields in release source-index mode.`,
          );
        }
        if (!hadith.sourceUrl || typeof hadith.sourceUrl !== "string") {
          fail(
            `Hadith source index row is missing sourceUrl in ${file}: ${hadith.originalReference || hadith.id}`,
          );
          continue;
        }
        if (hadith.sourceReviewStatus !== "source_link_verified") {
          fail(
            `Hadith source index row is missing source_link_verified status in ${file}: ${hadith.originalReference || hadith.id}`,
          );
        }
        let url;
        try {
          url = new URL(hadith.sourceUrl);
        } catch {
          fail(`Invalid Hadith source URL in ${file}: ${hadith.sourceUrl}`);
          continue;
        }
        if (
          url.protocol !== "https:" ||
          !trustedHosts.has(url.hostname) ||
          !url.hostname.includes("sunnah.com")
        ) {
          fail(
            `Hadith source URL must be a trusted Sunnah.com https URL in ${file}: ${hadith.sourceUrl}`,
          );
        }
        sourceUrls.push(hadith.sourceUrl);
      }
    }
  }
  if (sourceRows < 1000) {
    fail(`Hadith source index has too few release rows: ${sourceRows}`);
  }
  return sourceUrls;
}

function validateRemovedHadithGenerators() {
  for (const file of [
    "generate-hadith.js",
    "gen-muslim.js",
    "gen-remaining.js",
  ]) {
    const fullPath = path.join(root, "client/data", file);
    if (fs.existsSync(fullPath)) {
      fail(
        `Remove old unverified hadith generator before release: client/data/${file}`,
      );
    }
  }
}

function validateSourceReviewGating() {
  const accessControlPath = path.join(
    root,
    "client/services/libraryAccessControl.ts",
  );
  const sourceReviewPath = path.join(
    root,
    "client/services/librarySourceReviewService.ts",
  );
  const aiLibraryPath = path.join(root, "client/services/aiLibraryService.ts");
  const screenPath = path.join(
    root,
    "client/screens/LibrarySourceReviewScreen.tsx",
  );

  const accessText = fs.readFileSync(accessControlPath, "utf8");
  const serviceText = fs.readFileSync(sourceReviewPath, "utf8");
  const aiLibraryText = fs.readFileSync(aiLibraryPath, "utf8");
  const screenText = fs.readFileSync(screenPath, "utf8");

  if (
    !/export function canReviewLibrarySources\(\s*userPlan:\s*PlanType\s*\)/.test(
      accessText,
    ) ||
    !/return userPlan === "scholar";/.test(accessText)
  ) {
    fail(
      "Library source-review permission must be centralized as a Scholar-only access-control helper.",
    );
  }

  if (!/reviewerPlan:\s*PlanType/.test(serviceText)) {
    fail("saveSourceReviewDecision must require reviewerPlan.");
  }

  if (!/canReviewLibrarySources\(params\.reviewerPlan\)/.test(serviceText)) {
    fail(
      "Library source-review writes must enforce Scholar access inside the service layer.",
    );
  }

  if (
    !/reviewerPlan:\s*currentPlan/.test(screenText) ||
    !/const canReview = canReviewLibrarySources\(currentPlan\);/.test(
      screenText,
    ) ||
    !/navigation\.navigate\("Subscription",\s*\{\s*initialTab:\s*"scholar"\s*\}\)/.test(
      screenText,
    )
  ) {
    fail(
      "Library Source QA screen must pass the current plan to review writes, use centralized Scholar-only access, and open Scholar plans when locked.",
    );
  }

  if (
    !/getChapterSourceAuditWithReviews/.test(aiLibraryText) ||
    !/audit\.status\s*===\s*"approved"/.test(aiLibraryText)
  ) {
    fail(
      "Library AI explanations must require a server-backed approved source-review audit before deeper generated explanations.",
    );
  }

  if (
    /chapter\.sourceRefs\.some\(\s*\(source\)\s*=>\s*source\.verified\s*\)/.test(
      aiLibraryText,
    )
  ) {
    fail(
      "Library AI explanations must not treat local verified sourceRef flags alone as approval.",
    );
  }
}

function parseQuranReference(reference) {
  const match = String(reference).match(
    /^Quran\s+(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?$/,
  );
  if (!match) return null;
  return {
    surah: Number.parseInt(match[1], 10),
    startAyah: Number.parseInt(match[2], 10),
    endAyah: match[3] ? Number.parseInt(match[3], 10) : undefined,
  };
}

function isValidQuranRange(reference) {
  const parsed = parseQuranReference(reference);
  if (!parsed) return false;
  const verseCount = quranVerseCounts[parsed.surah];
  if (!verseCount) return false;
  if (parsed.startAyah < 1 || parsed.startAyah > verseCount) return false;
  if (parsed.endAyah === undefined) return true;
  return parsed.endAyah >= parsed.startAyah && parsed.endAyah <= verseCount;
}

function quranReferenceContainsVerse(reference, verseKey) {
  const parsed = parseQuranReference(reference);
  if (!parsed) return false;
  const [surahText, ayahText] = verseKey.split(":");
  const surah = Number.parseInt(surahText, 10);
  const ayah = Number.parseInt(ayahText, 10);
  const endAyah = parsed.endAyah ?? parsed.startAyah;
  return parsed.surah === surah && ayah >= parsed.startAyah && ayah <= endAyah;
}

function validateQuranContexts() {
  if (!fs.existsSync(quranContextsPath)) {
    fail("client/data/quranContexts.json is missing.");
    return 0;
  }

  const data = JSON.parse(fs.readFileSync(quranContextsPath, "utf8"));
  let contextCount = 0;
  for (const [verseKey, contexts] of Object.entries(data)) {
    if (!Array.isArray(contexts) || contexts.length === 0) {
      fail(`Quran context ${verseKey} must contain at least one context.`);
      continue;
    }
    if (!isValidQuranRange(`Quran ${verseKey}`)) {
      fail(`Quran context key is not a valid verse reference: ${verseKey}`);
    }

    for (const context of contexts) {
      contextCount += 1;
      if (context.verseKey !== verseKey) {
        fail(`Quran context ${verseKey} has mismatched verseKey.`);
      }
      if (!validQuranContextTypes.has(context.contextType)) {
        fail(
          `Quran context ${verseKey} has invalid type: ${context.contextType}`,
        );
      }
      if (
        typeof context.content !== "string" ||
        context.content.trim().length < 24
      ) {
        fail(`Quran context ${verseKey} must have meaningful content.`);
      }

      const source = String(context.source || "").trim();
      const quranSource = parseQuranReference(source);
      const hadithSource = exactHadithSourcePattern.test(source);
      if (!source) {
        fail(`Quran context ${verseKey} is missing source.`);
      } else if (vagueSourcePattern.test(source)) {
        fail(
          `Quran context ${verseKey} uses a vague or non-canonical source label: ${source}`,
        );
      } else if (quranSource) {
        if (!isValidQuranRange(source)) {
          fail(`Quran context ${verseKey} has invalid Quran source: ${source}`);
        }
        if (!quranReferenceContainsVerse(source, verseKey)) {
          fail(
            `Quran context ${verseKey} Quran source must include its verse key: ${source}`,
          );
        }
      } else if (!hadithSource) {
        fail(
          `Quran context ${verseKey} source must be exact Quran or canonical exact hadith reference: ${source}`,
        );
      }

      if (context.contextType === "hadith" && !hadithSource) {
        fail(
          `Quran context ${verseKey} is typed hadith but does not use an exact hadith source.`,
        );
      }
      if (
        /\bThe Prophet\b[\s\S]{0,80}\bsaid\b/i.test(context.content) &&
        !hadithSource
      ) {
        fail(
          `Quran context ${verseKey} attributes speech to the Prophet without an exact hadith source.`,
        );
      }
    }
  }
  return contextCount;
}

function requestUrlStatus(urlText, method, redirectsRemaining = 5) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(urlText);
    } catch {
      resolve(0);
      return;
    }

    const req = https.request(
      url,
      {
        method,
        timeout: 12000,
        headers: {
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          redirectsRemaining > 0
        ) {
          res.resume();
          resolve(
            requestUrlStatus(
              new URL(res.headers.location, urlText).toString(),
              method,
              redirectsRemaining - 1,
            ),
          );
          return;
        }
        res.resume();
        resolve(res.statusCode || 0);
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve(0);
    });
    req.on("error", () => resolve(0));
    req.end();
  });
}

async function checkUrl(urlText) {
  const retries = Math.max(
    0,
    Math.min(
      5,
      Number.parseInt(process.env.NURAI_LIVE_SOURCE_CHECK_RETRIES || "2", 10),
    ),
  );

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const headStatus = await requestUrlStatus(urlText, "HEAD");
    if (headStatus >= 200 && headStatus < 400) return true;

    let getStatus = 0;
    if (
      headStatus === 403 ||
      headStatus === 405 ||
      headStatus === 429 ||
      headStatus === 0
    ) {
      getStatus = await requestUrlStatus(urlText, "GET");
      if (getStatus >= 200 && getStatus < 400) return true;
    }

    if (
      attempt < retries &&
      (headStatus === 429 ||
        getStatus === 429 ||
        headStatus === 0 ||
        getStatus === 0)
    ) {
      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
      continue;
    }

    return false;
  }

  return false;
}

function shouldLiveCheckLibraryUrls() {
  return args.has("--live") || args.has("--live-library");
}

function shouldLiveCheckHadithUrls() {
  return args.has("--live") || args.has("--live-hadith");
}

async function liveCheck(urls, label, enabled) {
  if (!enabled) return 0;
  const uniqueUrls = [...new Set(urls)];
  const requestedConcurrency = Number.parseInt(
    process.env.NURAI_LIVE_SOURCE_CHECK_CONCURRENCY || "4",
    10,
  );
  const concurrency = Math.max(
    1,
    Math.min(
      12,
      Number.isFinite(requestedConcurrency) ? requestedConcurrency : 4,
    ),
  );
  const failedUrls = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < uniqueUrls.length) {
      const url = uniqueUrls[nextIndex];
      nextIndex += 1;
      const ok = await checkUrl(url);
      if (!ok) failedUrls.push(url);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, uniqueUrls.length) }, () =>
      worker(),
    ),
  );

  if (failedUrls.length > 0) {
    const firstFailures = failedUrls
      .slice(0, 20)
      .map((url) => `\n- ${url}`)
      .join("");
    const suffix =
      failedUrls.length > 20 ? `\n...and ${failedUrls.length - 20} more.` : "";
    fail(
      `Live ${label} check failed for ${failedUrls.length}/${uniqueUrls.length} URLs:${firstFailures}${suffix}`,
    );
  }

  return uniqueUrls.length;
}

async function main() {
  scanBannedText();
  const libraryUrls = validateTrustedUrls();
  validateStatusHonesty();
  const hadithUrls = validateHadithLibraryLock() ?? [];
  const quranContextCount = validateQuranContexts();
  validateRemovedHadithGenerators();
  validateSourceReviewGating();
  const liveLibraryCount = await liveCheck(
    libraryUrls,
    "Library source URL",
    shouldLiveCheckLibraryUrls(),
  );
  const liveHadithCount = await liveCheck(
    hadithUrls,
    "Hadith source URL",
    shouldLiveCheckHadithUrls(),
  );
  if (!process.exitCode) {
    const librarySuffix =
      liveLibraryCount > 0 ? `, ${liveLibraryCount} live checked` : "";
    const hadithSuffix =
      liveHadithCount > 0
        ? `${liveHadithCount} Hadith source URLs live checked`
        : `${new Set(hadithUrls).size} Hadith source URLs structurally checked`;
    console.log(
      `Library integrity passed: ${new Set(libraryUrls).size} Library URLs checked${librarySuffix}; ${hadithSuffix}.`,
    );
    console.log(
      `Quran context integrity passed: ${quranContextCount} source-backed context rows checked.`,
    );
  }
}

main().catch((error) => {
  fail(error?.message || String(error));
});
