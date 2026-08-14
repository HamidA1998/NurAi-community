#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath))
    throw new Error(`${relativePath}: missing file`);
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(text, file, snippets, findings) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) findings.push(`${file}: missing ${snippet}`);
  }
}

function main() {
  const findings = [];
  const client = read("client/screens/FamilyGroupScreen.tsx");
  const routes = read("server/familyPlaces.ts");
  const schema = read("shared/schema.ts");
  const migration = read("migrations/0024_family_places_check_ins.sql");
  const appliedChecks = read("scripts/check-db-migrations-applied.js");
  const packageJson = JSON.parse(read("package.json"));
  const appJson = JSON.parse(read("app.json"));

  requireIncludes(
    client,
    "client/screens/FamilyGroupScreen.tsx",
    [
      'import * as Location from "expo-location"',
      "openFamilyPlaces",
      'testID="button-family-people-places"',
      'testID="button-family-people-live"',
      'testID="button-family-home-live"',
      'testID="button-family-place-add"',
      'testID="button-family-check-in-safe"',
      'testID="button-family-share-location"',
      'testID="button-family-check-in-clear"',
      "Location.requestForegroundPermissionsAsync()",
      "Location.getCurrentPositionAsync",
      'status: "shared_location"',
      "shareMinutes: shareLocation ? 60 : undefined",
      "Places are shared labels—not a live map or tracking",
      "history.",
      "FamilyLiveView",
      "familyLiveMapPoints",
    ],
    findings,
  );

  requireIncludes(
    read("client/components/FamilyLiveView.tsx"),
    "client/components/FamilyLiveView.tsx",
    [
      "FamilyLiveMap",
      'testID="family-live-view"',
      'testID="button-family-live-refresh"',
      'testID="button-family-live-share"',
      "Only active one-hour shares appear here",
      "no location timeline",
    ],
    findings,
  );
  requireIncludes(
    read("client/components/FamilyLiveMap.tsx"),
    "client/components/FamilyLiveMap.tsx",
    [
      'require("expo-maps")',
      "AppleMaps.View",
      "GoogleMaps.View",
      "family-live-map",
      "No live shares yet",
    ],
    findings,
  );

  requireIncludes(
    routes,
    "server/familyPlaces.ts",
    [
      '"/api/family/groups/:groupId/places"',
      '"/api/family/groups/:groupId/check-ins"',
      '"/api/family/groups/:groupId/check-ins/me"',
      "requireFamilyMembership(req, res, user, groupId)",
      'enforceFamilyWriteRateLimit(req, res, "family:places")',
      'enforceFamilyWriteRateLimit(req, res, "family:check-ins")',
      "shareLocation === true",
      "CHECK_IN_STATUSES",
      "onConflictDoUpdate",
      'action: "family_check_in_updated"',
      'retention: "current_check_in_only"',
      "latitude: familyCheckIns.latitude",
      "longitude: familyCheckIns.longitude",
      '!expired && row.status === "shared_location" ? row.latitude',
      '!expired && row.status === "shared_location" ? row.longitude',
      "backgroundTracking: false",
      "120",
    ],
    findings,
  );

  requireIncludes(
    schema,
    "shared/schema.ts",
    [
      "familyPlaces = pgTable",
      '"family_places"',
      "familyCheckIns = pgTable",
      '"family_check_ins"',
      'uniqueIndex("family_check_ins_group_user_idx")',
      'expiresAt: timestamp("expires_at")',
    ],
    findings,
  );

  requireIncludes(
    migration,
    "migrations/0024_family_places_check_ins.sql",
    [
      "BEGIN;",
      "Release note:",
      "CREATE TABLE IF NOT EXISTS family_places",
      "CREATE TABLE IF NOT EXISTS family_check_ins",
      "CREATE UNIQUE INDEX IF NOT EXISTS family_check_ins_group_user_idx",
      "COMMIT;",
      "does not create a location history",
    ],
    findings,
  );

  requireIncludes(
    appliedChecks,
    "scripts/check-db-migrations-applied.js",
    [
      'id: "0024_family_places_check_ins"',
      'table: "family_places"',
      'table: "family_check_ins"',
      "family_check_ins_group_user_idx",
    ],
    findings,
  );

  if (
    packageJson.scripts?.["check:family-location-release"] !==
    "node scripts/check-family-location-release.js"
  ) {
    findings.push(
      "package.json: check:family-location-release must run its release guard.",
    );
  }
  if (
    !packageJson.scripts?.["check:release-local"]?.includes(
      "check:family-location-release",
    )
  ) {
    findings.push(
      "package.json: check:release-local must include check:family-location-release.",
    );
  }
  const plugins = appJson?.expo?.plugins || [];
  const hasExpoMapsPlugin = plugins.some((plugin) =>
    Array.isArray(plugin) ? plugin[0] === "expo-maps" : plugin === "expo-maps",
  );
  if (!hasExpoMapsPlugin) {
    findings.push(
      "app.json: expo-maps config plugin is required for native live maps.",
    );
  }

  if (findings.length) {
    console.error("Family location release check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Family location release check passed: consented places, current-only check-ins, foreground permission, premium membership, rate limits, audit events, and migration controls are present.",
  );
}

main();
