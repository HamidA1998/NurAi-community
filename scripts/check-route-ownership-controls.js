#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

const noDirectSessionUserIdFiles = [
  path.join("server", "community.ts"),
  path.join("server", "communitySocial.ts"),
  path.join("server", "family.ts"),
  path.join("server", "nasheeds.ts"),
  path.join("server", "places.ts"),
  path.join("server", "progress.ts"),
  path.join("server", "replit_integrations", "audio", "routes.ts"),
  path.join("server", "replit_integrations", "chat", "routes.ts"),
  path.join("server", "replit_integrations", "image", "routes.ts"),
  path.join("server", "replit_integrations", "nurai-context", "routes.ts"),
  path.join("server", "replit_integrations", "tafsir", "routes.ts"),
];

const requiredControls = [
  {
    file: path.join("server", "family.ts"),
    checks: [
      "requireAuthenticatedUser",
      "enforceFamilySearchRateLimit",
      "Cannot invite yourself",
      "Invite an existing NurAI user from search results.",
      "Member not found",
      "requesterMembership",
      "logFamilyAuditEvent",
      "familyAuditEvents",
    ],
  },
  {
    file: path.join("server", "progress.ts"),
    checks: ["requireAuthenticatedUser", "eq(userProgress.userId, user.id)"],
  },
  {
    file: path.join("server", "community.ts"),
    checks: [
      "requireAuthenticatedUser",
      "eq(communityProfiles.userId, userId)",
      "eq(communityProfiles.userId, user.id)",
      "getVisiblePostForProfile",
    ],
  },
  {
    file: path.join("server", "communitySocial.ts"),
    checks: [
      "requireAuthenticatedUser",
      "requireOwnCommunityProfile",
      "getSameAudienceProfile",
      "canCommunityMembersInteract",
      "hasBlockBetween",
      "connection_required",
      "client_message_conflict",
      "community:directory",
      "community:message",
    ],
  },
  {
    file: path.join("server", "replit_integrations", "chat", "routes.ts"),
    checks: [
      "requireAuthenticatedUser",
      "chatStorage.getAllConversations(user.id)",
      "chatStorage.getConversation(id, user.id)",
      "chatStorage.getMessagesByConversation(id, user.id)",
      "chatStorage.deleteConversation(id, user.id)",
      "chatStorage.getConversation(\n          conversationId,\n          user.id",
      "chatStorage.createMessage(\n          conversationId,\n          user.id",
      "enforceDailyAIQuota",
      "enforceAITextRateLimit",
    ],
  },
  {
    file: path.join("server", "places.ts"),
    checks: [
      "requireAuthenticatedUser",
      "enforcePlacesRateLimit",
      "parseCoordinate",
      "GOOGLE_PLACES_API_KEY",
      "sendProviderError",
    ],
  },
  {
    file: path.join("server", "nasheeds.ts"),
    checks: [
      "requireNasheedAdmin",
      "enforceNasheedRateLimit",
      "ensureHttpsUrl",
      "isActive: false",
      "NURAI_ADMIN_SECRET",
    ],
  },
  {
    file: path.join(
      "server",
      "replit_integrations",
      "nurai-context",
      "routes.ts",
    ),
    checks: [
      "requireAuthenticatedUser",
      "enforceDailyAIQuota",
      "enforceAITextRateLimit",
      "generateAITextWithUsageLogging",
      "risk: featureRisk(normalizedFeature)",
    ],
  },
  {
    file: path.join("server", "replit_integrations", "tafsir", "routes.ts"),
    checks: [
      'requirePaidAPI("tafsir", "scholar")',
      "requireAuthenticatedUser",
      "enforcePaidAIFeatureQuota",
      "enforceAITextRateLimit",
      'risk: "religious"',
    ],
  },
];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath}: missing file`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function main() {
  const findings = [];

  for (const file of noDirectSessionUserIdFiles) {
    try {
      const text = read(file);
      if (text.includes("req.session.userId")) {
        findings.push(
          `${file}: direct req.session.userId access is not allowed`,
        );
      }
    } catch (error) {
      findings.push(error.message);
    }
  }

  for (const control of requiredControls) {
    let text = "";
    try {
      text = read(control.file);
    } catch (error) {
      findings.push(error.message);
      continue;
    }

    for (const requiredText of control.checks) {
      if (!text.includes(requiredText)) {
        findings.push(
          `${control.file}: missing ${JSON.stringify(requiredText)}`,
        );
      }
    }
  }

  if (findings.length > 0) {
    console.error("Route ownership-control check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    `Route ownership-control check passed: ${noDirectSessionUserIdFiles.length} route files verified.`,
  );
}

main();
