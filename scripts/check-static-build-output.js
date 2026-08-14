#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const staticBuildDir = path.join(root, "static-build");
const platforms = ["ios", "android"];

function fail(findings, message) {
  findings.push(message);
}

function readText(relativePath, findings) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    fail(findings, `${relativePath}: missing file`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function readJson(relativePath, findings) {
  const text = readText(relativePath, findings);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(
      findings,
      `${relativePath}: invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

function fileSize(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return 0;
  return fs.statSync(filePath).size;
}

function findBuildIds(findings) {
  if (!fs.existsSync(staticBuildDir)) {
    fail(findings, "static-build: missing directory");
    return [];
  }

  return fs
    .readdirSync(staticBuildDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d+-\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function main() {
  const findings = [];
  const buildIds = findBuildIds(findings);

  if (buildIds.length !== 1) {
    fail(
      findings,
      `static-build must contain exactly one timestamped build directory; found ${buildIds.length}`,
    );
  }

  const buildId = buildIds[0];
  const origins = new Set();

  if (buildId) {
    const assetFiles = walkFiles(
      path.join(staticBuildDir, buildId, "_expo", "static", "js"),
    ).filter((filePath) => !filePath.endsWith("bundle.js"));
    if (assetFiles.length < 20) {
      fail(
        findings,
        `static-build/${buildId}: expected downloaded asset files; found ${assetFiles.length}`,
      );
    }
  }

  for (const platform of platforms) {
    const manifestPath = `static-build/${platform}/manifest.json`;
    const manifest = readJson(manifestPath, findings);
    if (!manifest) continue;

    if (manifest.runtimeVersion !== "exposdk:54.0.0") {
      fail(findings, `${manifestPath}: runtimeVersion must be exposdk:54.0.0`);
    }

    if (!Number.isFinite(Date.parse(String(manifest.createdAt || "")))) {
      fail(findings, `${manifestPath}: createdAt must be a valid ISO date`);
    }

    const launchUrl = String(manifest.launchAsset?.url || "");
    let parsedLaunchUrl;
    try {
      parsedLaunchUrl = new URL(launchUrl);
    } catch {
      fail(findings, `${manifestPath}: launchAsset.url must be a valid URL`);
    }

    if (parsedLaunchUrl) {
      origins.add(parsedLaunchUrl.origin);
      if (parsedLaunchUrl.protocol !== "https:") {
        fail(findings, `${manifestPath}: launchAsset.url must be HTTPS`);
      }
      if (!buildId || !parsedLaunchUrl.pathname.includes(`/${buildId}/`)) {
        fail(
          findings,
          `${manifestPath}: launchAsset.url must include the current build id`,
        );
      }
      const expectedSuffix = `/_expo/static/js/${platform}/bundle.js`;
      if (!parsedLaunchUrl.pathname.endsWith(expectedSuffix)) {
        fail(
          findings,
          `${manifestPath}: launchAsset.url must end with ${expectedSuffix}`,
        );
      }
    }

    const bundlePath = buildId
      ? `static-build/${buildId}/_expo/static/js/${platform}/bundle.js`
      : "";
    if (!bundlePath || fileSize(bundlePath) < 1_000_000) {
      fail(findings, `${bundlePath || platform}: bundle must be present`);
    } else {
      const bundle = readText(bundlePath, findings);
      if (/http:\/\/localhost:8081|localhost:8081/.test(bundle)) {
        fail(findings, `${bundlePath}: Metro localhost URLs must be rewritten`);
      }
      if (parsedLaunchUrl && !bundle.includes(parsedLaunchUrl.origin)) {
        fail(
          findings,
          `${bundlePath}: bundle asset URLs must use the manifest origin`,
        );
      }
    }

    const expoClient = manifest.extra?.expoClient;
    const expoGo = manifest.extra?.expoGo;
    if (
      !expoClient?.hostUri ||
      !String(expoClient.hostUri).endsWith(platform)
    ) {
      fail(findings, `${manifestPath}: extra.expoClient.hostUri is invalid`);
    }
    if (
      !expoGo?.debuggerHost ||
      !String(expoGo.debuggerHost).endsWith(platform)
    ) {
      fail(findings, `${manifestPath}: extra.expoGo.debuggerHost is invalid`);
    }
    if (expoGo?.packagerOpts?.dev !== false) {
      fail(findings, `${manifestPath}: expoGo.packagerOpts.dev must be false`);
    }
  }

  if (origins.size > 1) {
    fail(findings, "iOS and Android manifests must use the same origin");
  }

  const serverIndex = readText("server/index.ts", findings);
  const buildScript = readText("scripts/build.js", findings);
  const landingTemplate = readText(
    "server/templates/landing-page.html",
    findings,
  );
  for (const snippet of [
    "process.env.NURAI_DEPLOYMENT_URL",
    "EXPO_PUBLIC_DOMAIN, or NURAI_DEPLOYMENT_URL",
  ]) {
    if (!buildScript.includes(snippet)) {
      fail(findings, `scripts/build.js: missing ${JSON.stringify(snippet)}`);
    }
  }
  for (const snippet of [
    "serveLandingPage",
    "serveExpoManifest",
    "configureExpoAndLanding(app)",
    'app.use(express.static(path.resolve(process.cwd(), "static-build")))',
  ]) {
    if (!serverIndex.includes(snippet)) {
      fail(findings, `server/index.ts: missing ${JSON.stringify(snippet)}`);
    }
  }
  for (const snippet of ["EXPS_URL_PLACEHOLDER", "APP_NAME_PLACEHOLDER"]) {
    if (!landingTemplate.includes(snippet)) {
      fail(
        findings,
        `server/templates/landing-page.html: missing ${JSON.stringify(snippet)}`,
      );
    }
  }

  if (findings.length) {
    console.error("Static build output check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    `Static build output check passed: ${platforms.length} manifests, ${buildIds[0]}, bundles, assets, and dynamic landing route verified.`,
  );
}

main();
