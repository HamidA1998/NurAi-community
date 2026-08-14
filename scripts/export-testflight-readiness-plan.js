#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const checkOnly = process.argv.includes("--check");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function fail(failures, message) {
  failures.push(message);
}

function main() {
  const app = readJson("app.json").expo;
  const eas = readJson("eas.json");
  const pkg = readJson("package.json");
  const ios = app.ios || {};
  const submit = eas.submit?.production?.ios || {};
  const production = eas.build?.production || {};
  const failures = [];

  if (app.owner !== "hamidamjad98")
    fail(failures, "Expo owner is not hamidamjad98.");
  if (!app.extra?.eas?.projectId)
    fail(failures, "Missing Expo EAS project id.");
  if (!ios.bundleIdentifier) fail(failures, "Missing iOS bundle identifier.");
  if (!ios.buildNumber) fail(failures, "Missing iOS build number.");
  if (!submit.ascAppId)
    fail(failures, "Missing EAS iOS ascAppId for App Store Connect.");
  if (production.autoIncrement !== true) {
    fail(failures, "Production EAS build should autoIncrement.");
  }
  if (production.ios?.buildConfiguration !== "Release") {
    fail(failures, "Production iOS build configuration should be Release.");
  }
  if (!pkg.scripts?.["check:testflight-build-fingerprint"]) {
    fail(failures, "Missing check:testflight-build-fingerprint script.");
  }

  const plan = {
    appName: app.name,
    version: app.version,
    buildNumber: ios.buildNumber,
    bundleIdentifier: ios.bundleIdentifier,
    easProjectId: app.extra?.eas?.projectId,
    ascAppId: submit.ascAppId,
    commands: [
      "npm run check:app-release-config",
      "npm run check:testflight-build-fingerprint -- --platform ios --profile production",
      "npx eas build --platform ios --profile production --non-interactive",
      "npx eas submit --platform ios --profile production --latest --non-interactive",
    ],
    uploadBoundary:
      "Actual TestFlight upload requires a valid EAS login, Apple session, and a finished iOS production build.",
  };

  if (failures.length > 0) {
    console.error("TestFlight readiness plan failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    console.error(JSON.stringify(plan, null, 2));
    process.exit(1);
  }

  if (checkOnly) {
    console.log(
      `TestFlight readiness check passed for ${plan.appName} ${plan.version} (${plan.buildNumber}).`,
    );
    return;
  }

  console.log(JSON.stringify(plan, null, 2));
}

main();
