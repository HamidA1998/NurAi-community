#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const appJsonPath = path.join(root, "app.json");
const packageJsonPath = path.join(root, "package.json");
const easJsonPath = path.join(root, "eas.json");
const gitignorePath = path.join(root, ".gitignore");

const REQUIRED_PLUGINS = [
  "expo-splash-screen",
  "expo-web-browser",
  "expo-secure-store",
  "expo-local-authentication",
  "expo-notifications",
  "expo-location",
  "expo-maps",
  "expo-apple-authentication",
  "expo-asset",
];

const EXPECTED_EXPO_OWNER = "hamidamjad98";
const EXPECTED_EAS_PROJECT_ID = "1225401e-22ee-4bb4-bde2-bdc1131469bd";

const REQUIRED_SECRET_IGNORE_PATTERNS = [
  ".env*.local",
  "*.p8",
  "*.p12",
  "*.jks",
  "*.mobileprovision",
  "*service-account*.json",
  "google-service-account*.json",
];

function fail(failures, message) {
  failures.push(message);
}

function readJson(filePath, failures) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(
      failures,
      `${path.relative(root, filePath)} must be valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

function assertString(value, label, failures) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(failures, `${label} must be a non-empty string.`);
  }
}

function assertEqual(value, expected, label, failures) {
  if (value !== expected) {
    fail(failures, `${label} must be ${JSON.stringify(expected)}.`);
  }
}

function assetPath(value) {
  return path.resolve(root, String(value || ""));
}

function validatePngAsset(value, label, failures) {
  assertString(value, label, failures);
  if (typeof value !== "string" || !value.trim()) return;

  const fullPath = assetPath(value);
  if (!fs.existsSync(fullPath)) {
    fail(failures, `${label} does not exist: ${value}`);
    return;
  }

  const stat = fs.statSync(fullPath);
  if (!stat.isFile() || stat.size === 0) {
    fail(failures, `${label} must be a non-empty file: ${value}`);
    return;
  }

  const header = fs.readFileSync(fullPath).subarray(0, 8);
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  if (!header.equals(pngHeader)) {
    fail(failures, `${label} must be a PNG asset: ${value}`);
  }
}

function pluginName(plugin) {
  return Array.isArray(plugin) ? plugin[0] : plugin;
}

function pluginConfig(plugins, name) {
  const plugin = plugins.find((item) => pluginName(item) === name);
  return Array.isArray(plugin) ? plugin[1] || {} : {};
}

function validateAppJson(app, failures) {
  const expo = app?.expo;
  if (!expo || typeof expo !== "object") {
    fail(failures, "app.json must contain an expo object.");
    return;
  }

  assertEqual(expo.name, "NurAI", "expo.name", failures);
  assertEqual(expo.owner, EXPECTED_EXPO_OWNER, "expo.owner", failures);
  assertEqual(expo.slug, "nurai", "expo.slug", failures);
  assertEqual(expo.scheme, "nurai", "expo.scheme", failures);
  assertEqual(expo.orientation, "portrait", "expo.orientation", failures);
  assertEqual(
    expo.userInterfaceStyle,
    "dark",
    "expo.userInterfaceStyle",
    failures,
  );
  assertEqual(expo.newArchEnabled, true, "expo.newArchEnabled", failures);
  assertEqual(
    expo.extra?.eas?.projectId,
    EXPECTED_EAS_PROJECT_ID,
    "expo.extra.eas.projectId",
    failures,
  );

  if (!/^\d+\.\d+\.\d+$/.test(String(expo.version || ""))) {
    fail(failures, "expo.version must be a semantic version like 1.0.0.");
  }

  validatePngAsset(expo.icon, "expo.icon", failures);
  validatePngAsset(expo.web?.favicon, "expo.web.favicon", failures);
  assertEqual(expo.web?.output, "single", "expo.web.output", failures);

  const ios = expo.ios || {};
  const android = expo.android || {};
  const expectedId = "uk.co.eliteautomations.nurai";
  assertEqual(
    ios.bundleIdentifier,
    expectedId,
    "ios.bundleIdentifier",
    failures,
  );
  assertEqual(android.package, expectedId, "android.package", failures);
  assertEqual(ios.usesAppleSignIn, true, "ios.usesAppleSignIn", failures);
  assertEqual(
    android.edgeToEdgeEnabled,
    true,
    "android.edgeToEdgeEnabled",
    failures,
  );

  if (!/^\d+$/.test(String(ios.buildNumber || ""))) {
    fail(failures, "ios.buildNumber must be a positive integer string.");
  }
  if (!Number.isInteger(android.versionCode) || android.versionCode <= 0) {
    fail(failures, "android.versionCode must be a positive integer.");
  }

  const plist = ios.infoPlist || {};
  for (const [key, requiredTerms] of Object.entries({
    NSLocationWhenInUseUsageDescription: ["location", "mosques", "prayer"],
    NSCameraUsageDescription: ["camera"],
    NSPhotoLibraryUsageDescription: ["photo"],
    NSFaceIDUsageDescription: ["Face ID", "privacy"],
  })) {
    const text = String(plist[key] || "");
    assertString(text, `ios.infoPlist.${key}`, failures);
    const lower = text.toLowerCase();
    for (const term of requiredTerms) {
      if (!lower.includes(term.toLowerCase())) {
        fail(
          failures,
          `ios.infoPlist.${key} should explain ${term} usage clearly.`,
        );
      }
    }
  }

  const backgroundModes = plist.UIBackgroundModes || [];
  for (const mode of ["remote-notification", "audio"]) {
    if (!backgroundModes.includes(mode)) {
      fail(failures, `ios.infoPlist.UIBackgroundModes must include ${mode}.`);
    }
  }

  validatePngAsset(
    android.adaptiveIcon?.foregroundImage,
    "android.adaptiveIcon.foregroundImage",
    failures,
  );
  if (!/^#[0-9a-f]{6}$/i.test(String(android.adaptiveIcon?.backgroundColor))) {
    fail(failures, "android.adaptiveIcon.backgroundColor must be a hex color.");
  }

  const plugins = Array.isArray(expo.plugins) ? expo.plugins : [];
  const pluginNames = new Set(plugins.map(pluginName));
  for (const plugin of REQUIRED_PLUGINS) {
    if (!pluginNames.has(plugin)) {
      fail(failures, `expo.plugins must include ${plugin}.`);
    }
  }

  const splash = pluginConfig(plugins, "expo-splash-screen");
  validatePngAsset(splash.image, "expo-splash-screen.image", failures);
  validatePngAsset(
    splash.dark?.image,
    "expo-splash-screen.dark.image",
    failures,
  );
  if (!splash.imageWidth || Number(splash.imageWidth) < 100) {
    fail(failures, "expo-splash-screen.imageWidth must be at least 100.");
  }

  const notifications = pluginConfig(plugins, "expo-notifications");
  validatePngAsset(notifications.icon, "expo-notifications.icon", failures);
  if (!/^#[0-9a-f]{6}$/i.test(String(notifications.color || ""))) {
    fail(failures, "expo-notifications.color must be a hex color.");
  }

  const location = pluginConfig(plugins, "expo-location");
  assertEqual(
    location.locationAlwaysAndWhenInUsePermission,
    false,
    "expo-location.locationAlwaysAndWhenInUsePermission",
    failures,
  );
}

function validatePackageJson(packageJson, app, failures) {
  const expoVersion = app?.expo?.version;
  if (!packageJson || typeof packageJson !== "object") {
    fail(failures, "package.json must contain an object.");
    return;
  }
  assertString(packageJson.version, "package.json version", failures);
  if (
    typeof expoVersion === "string" &&
    typeof packageJson.version === "string" &&
    packageJson.version !== expoVersion
  ) {
    fail(
      failures,
      `package.json version must match app.json expo.version (${expoVersion}).`,
    );
  }
}

function validateEasJson(eas, failures) {
  if (!eas || typeof eas !== "object") {
    fail(failures, "eas.json must contain an object.");
    return;
  }

  assertEqual(
    eas.cli?.appVersionSource,
    "local",
    "eas.cli.appVersionSource",
    failures,
  );
  if (!String(eas.cli?.version || "").includes("12.0.0")) {
    fail(failures, "eas.cli.version must require EAS CLI 12 or newer.");
  }

  const build = eas.build || {};
  assertEqual(
    build.development?.developmentClient,
    true,
    "eas.build.development.developmentClient",
    failures,
  );
  assertEqual(
    build.development?.distribution,
    "internal",
    "eas.build.development.distribution",
    failures,
  );
  assertEqual(
    build.development?.ios?.simulator,
    true,
    "eas.build.development.ios.simulator",
    failures,
  );
  assertEqual(
    build.preview?.distribution,
    "internal",
    "eas.build.preview.distribution",
    failures,
  );
  assertEqual(
    build.preview?.android?.buildType,
    "apk",
    "eas.build.preview.android.buildType",
    failures,
  );
  assertEqual(
    build.production?.ios?.buildConfiguration,
    "Release",
    "eas.build.production.ios.buildConfiguration",
    failures,
  );
  assertEqual(
    build.production?.android?.buildType,
    "app-bundle",
    "eas.build.production.android.buildType",
    failures,
  );
  assertEqual(
    build.production?.autoIncrement,
    true,
    "eas.build.production.autoIncrement",
    failures,
  );

  if (!eas.submit?.production?.ios || !eas.submit?.production?.android) {
    fail(
      failures,
      "eas.submit.production must contain ios and android profiles.",
    );
  }
  assertEqual(
    eas.submit?.production?.android?.track,
    "production",
    "eas.submit.production.android.track",
    failures,
  );
  assertEqual(
    eas.submit?.production?.android?.releaseStatus,
    "draft",
    "eas.submit.production.android.releaseStatus",
    failures,
  );
}

function validateGitignore(failures) {
  const text = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf8")
    : "";
  for (const pattern of REQUIRED_SECRET_IGNORE_PATTERNS) {
    if (!text.split(/\r?\n/).some((line) => line.trim() === pattern)) {
      fail(failures, `.gitignore must include ${pattern}.`);
    }
  }
}

function main() {
  const failures = [];
  const app = readJson(appJsonPath, failures);
  const packageJson = readJson(packageJsonPath, failures);
  const eas = readJson(easJsonPath, failures);
  validateAppJson(app, failures);
  validatePackageJson(packageJson, app, failures);
  validateEasJson(eas, failures);
  validateGitignore(failures);

  if (failures.length) {
    console.error("App release config check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    "App release config check passed: app identity, version alignment, EAS project link, assets, permissions, plugins, EAS build profiles, and secret ignore rules verified.",
  );
}

main();
