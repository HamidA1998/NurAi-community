#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath}: missing file`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      findings.push(`${relativePath}: missing ${JSON.stringify(snippet)}`);
    }
  }
}

function requireRegex(text, relativePath, checks, findings) {
  for (const [label, pattern] of checks) {
    if (!pattern.test(text)) {
      findings.push(`${relativePath}: missing ${label}`);
    }
  }
}

function main() {
  const findings = [];
  let schemaText = "";
  let communityText = "";
  let communitySocialText = "";
  let migrationText = "";
  let socialMigrationText = "";
  let routeCheckerText = "";

  try {
    schemaText = read("shared/schema.ts");
    communityText = read("server/community.ts");
    communitySocialText = read("server/communitySocial.ts");
    migrationText = read("migrations/0002_community_profile_ownership.sql");
    socialMigrationText = read("migrations/0017_community_social_safety.sql");
    routeCheckerText = read("scripts/check-route-ownership-controls.js");
  } catch (error) {
    findings.push(error instanceof Error ? error.message : String(error));
  }

  requireRegex(
    schemaText,
    "shared/schema.ts",
    [
      [
        "communityProfiles.userId is non-null",
        /userId:\s*varchar\("user_id"\)\s*\n\s*\.notNull\(\)/,
      ],
      [
        "communityProfiles.userId cascades to users",
        /userId:[\s\S]*?\.references\(\(\)\s*=>\s*users\.id,\s*\{\s*onDelete:\s*"cascade"\s*\}\)/,
      ],
      [
        "communityProfiles.userId has a unique index",
        /uniqueIndex\("community_profiles_user_id_idx"\)\.on\(table\.userId\)/,
      ],
    ],
    findings,
  );
  requireIncludes(
    schemaText,
    "shared/schema.ts",
    ['deviceId: text("device_id").notNull().unique()'],
    findings,
  );

  requireIncludes(
    migrationText,
    "migrations/0002_community_profile_ownership.sql",
    [
      "ADD COLUMN IF NOT EXISTS user_id varchar",
      "SET user_id = device_id",
      "DELETE FROM community_profiles",
      "WHERE users.id = community_profiles.user_id",
      "ALTER COLUMN user_id SET NOT NULL",
      "ADD CONSTRAINT community_profiles_user_id_users_id_fk",
      "REFERENCES users(id)",
      "ON DELETE CASCADE",
      "CREATE UNIQUE INDEX IF NOT EXISTS community_profiles_user_id_idx",
    ],
    findings,
  );

  requireIncludes(
    communityText,
    "server/community.ts",
    [
      "requireAuthenticatedUser",
      "eq(communityProfiles.userId, userId)",
      "eq(communityProfiles.userId, user.id)",
      "userId: user.id",
      "deviceId: user.id",
      "getVisiblePostForProfile",
    ],
    findings,
  );
  requireIncludes(
    communityText,
    "server/community.ts",
    [
      "isCommunityAudienceChangeAllowed",
      "community_audience_locked",
      "communityPosts.audience",
      "communityReplies.audience",
    ],
    findings,
  );
  requireIncludes(
    communitySocialText,
    "server/communitySocial.ts",
    [
      "canCommunityMembersInteract",
      "canonicalCommunityPair",
      "getSameAudienceProfile",
      "hasBlockBetween",
      '"/api/community/people"',
      '"/api/community/connections"',
      '"/api/community/blocks"',
      '"/api/community/conversations"',
      '"/api/community/reports"',
      '"/api/admin/community/reports"',
      "requireCommunityAdmin",
      "communityReportModerationSchema",
      "targetSnapshot",
      "connection_required",
      "client_message_conflict",
      "LOWER(account.email) =",
      "blocked.gender =",
    ],
    findings,
  );
  requireIncludes(
    socialMigrationText,
    "migrations/0017_community_social_safety.sql",
    [
      "community_profiles_gender_check",
      "community_posts_audience_check",
      "community_replies_audience_check",
      "CREATE TABLE IF NOT EXISTS community_connections",
      "CHECK (profile_one_id < profile_two_id)",
      "CREATE TABLE IF NOT EXISTS community_blocks",
      "CREATE TABLE IF NOT EXISTS community_conversations",
      "CREATE TABLE IF NOT EXISTS community_direct_messages",
      "UNIQUE (sender_profile_id, client_message_id)",
      "CREATE TABLE IF NOT EXISTS community_reports",
      "target_snapshot jsonb",
      "moderated_by_user_id",
      "community_profiles_audience_immutable",
      "community_posts_same_audience",
      "community_replies_same_audience",
      "community_likes_same_audience",
      "community_reposts_same_audience",
      "community_connections_same_audience",
      "community_blocks_same_audience",
      "community_conversations_same_audience",
      "community_direct_messages_sender_guard",
      "community message requires an active unblocked connection",
      "cross-audience community connection denied",
      "cross-audience community conversation denied",
    ],
    findings,
  );
  if (communityText.includes("eq(communityProfiles.deviceId")) {
    findings.push(
      "server/community.ts: community profile ownership must use userId, not deviceId.",
    );
  }

  requireIncludes(
    routeCheckerText,
    "scripts/check-route-ownership-controls.js",
    [
      "eq(communityProfiles.userId, userId)",
      "eq(communityProfiles.userId, user.id)",
    ],
    findings,
  );

  if (findings.length) {
    console.error("Community release-control check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Community release-control check passed: audience locking, same-space connections, messaging, blocking, reporting, migrations, and route guards verified.",
  );
}

main();
