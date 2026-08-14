#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const metadataPath = path.join(root, "marketing/app-store-metadata/en-US.json");
const landingPackPath = path.join(root, "marketing/seo/landing-page-seo.md");
const landingTemplatePath = path.join(
  root,
  "server/templates/landing-page.html",
);
const serverPath = path.join(root, "server/index.ts");

const EXPECTED_TITLE = "NurAI - Quran, Prayer Times & Islamic AI";
const EXPECTED_META =
  "Build a calmer daily deen routine with Quran reading, prayer times, Qibla, duas, Arabic learning, and careful Islamic AI support.";
const REQUIRED_KEYWORDS = [
  "quran",
  "prayer",
  "islamic ai",
  "qibla",
  "duas",
  "arabic",
];

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${path.relative(root, filePath)} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assert(condition, message, findings) {
  if (!condition) findings.push(message);
}

function charCount(input) {
  return Array.from(String(input || "")).length;
}

function main() {
  const findings = [];
  const metadata = JSON.parse(read(metadataPath));
  const landingPack = read(landingPackPath);
  const html = read(landingTemplatePath);
  const server = read(serverPath);

  const apple = metadata.appleAppStore || {};
  const google = metadata.googlePlay || {};

  assert(
    charCount(apple.name) <= 30,
    "Apple app name must be 30 characters or fewer.",
    findings,
  );
  assert(
    charCount(apple.subtitle) <= 30,
    "Apple subtitle must be 30 characters or fewer.",
    findings,
  );
  assert(
    charCount(apple.promotionalText) <= 170,
    "Apple promotional text must be 170 characters or fewer.",
    findings,
  );
  assert(
    charCount(apple.keywords) <= 100,
    "Apple keywords must be 100 characters or fewer.",
    findings,
  );
  assert(
    charCount(apple.description) <= 4000,
    "Apple description must be 4000 characters or fewer.",
    findings,
  );
  assert(
    charCount(google.appName) <= 30,
    "Google Play app name must be 30 characters or fewer.",
    findings,
  );
  assert(
    charCount(google.shortDescription) <= 80,
    "Google Play short description must be 80 characters or fewer.",
    findings,
  );
  assert(
    charCount(google.fullDescription) <= 4000,
    "Google Play full description must be 4000 characters or fewer.",
    findings,
  );
  assert(
    !/\b(fatwa app|scholar-approved|guaranteed guidance)\b/i.test(
      `${apple.description}\n${google.fullDescription}`,
    ),
    "Store descriptions must avoid unsafe or unsupported religious claims.",
    findings,
  );

  const keywordSurface = [
    apple.name,
    apple.subtitle,
    apple.promotionalText,
    apple.keywords,
    apple.description,
    google.appName,
    google.shortDescription,
    google.fullDescription,
    landingPack,
    html,
  ]
    .join("\n")
    .toLowerCase();

  for (const keyword of REQUIRED_KEYWORDS) {
    assert(
      keywordSurface.includes(keyword),
      `SEO keyword surface is missing ${JSON.stringify(keyword)}.`,
      findings,
    );
  }

  assert(
    html.includes(`<title>${EXPECTED_TITLE}</title>`),
    "Landing page title is not optimized.",
    findings,
  );
  assert(
    html.includes(`content="${EXPECTED_META}"`),
    "Landing page meta description is missing.",
    findings,
  );
  assert(
    html.includes('<link rel="canonical" href="BASE_URL_PLACEHOLDER/"'),
    "Landing page canonical URL is missing.",
    findings,
  );
  assert(
    html.includes('property="og:title"'),
    "Open Graph title is missing.",
    findings,
  );
  assert(
    html.includes('name="twitter:card"'),
    "Twitter card metadata is missing.",
    findings,
  );
  assert(
    html.includes("application/ld+json"),
    "MobileApplication JSON-LD is missing.",
    findings,
  );
  assert(
    html.includes('"@type": "MobileApplication"'),
    "JSON-LD must describe NurAI as a mobile application.",
    findings,
  );
  assert(
    html.includes("APP_NAME_PLACEHOLDER"),
    "Landing template must keep the runtime app-name placeholder.",
    findings,
  );
  assert(
    html.includes("EXPS_URL_PLACEHOLDER"),
    "Landing template must keep the runtime Expo deep-link placeholder.",
    findings,
  );
  assert(
    server.includes("serveRobotsTxt"),
    "Server must expose a robots.txt handler.",
    findings,
  );
  assert(
    server.includes("serveSitemapXml"),
    "Server must expose a sitemap.xml handler.",
    findings,
  );
  assert(
    server.includes('req.path === "/robots.txt"'),
    "robots.txt route is not wired.",
    findings,
  );
  assert(
    server.includes('req.path === "/sitemap.xml"'),
    "sitemap.xml route is not wired.",
    findings,
  );

  if (findings.length) {
    console.error("SEO metadata check failed:");
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exit(1);
  }

  console.log(
    [
      "SEO metadata check passed:",
      `Apple name ${charCount(apple.name)}/30`,
      `Apple subtitle ${charCount(apple.subtitle)}/30`,
      `Apple keywords ${charCount(apple.keywords)}/100`,
      `Google short description ${charCount(google.shortDescription)}/80`,
      "landing page SEO tags verified",
    ].join(" "),
  );
}

main();
