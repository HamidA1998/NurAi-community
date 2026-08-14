#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

const routeModules = [
  {
    file: "server/auth.ts",
    exportName: "registerAuthRoutes",
    endpoints: [
      ["post", "/api/auth/register"],
      ["post", "/api/auth/login"],
      ["post", "/api/auth/apple"],
      ["get", "/api/auth/me"],
      ["get", "/api/auth/username/check"],
      ["put", "/api/auth/username"],
      ["put", "/api/auth/profile"],
      ["post", "/api/auth/logout"],
      ["delete", "/api/auth/account"],
    ],
  },
  {
    file: "server/ai/routes.ts",
    exportName: "registerAIRoutes",
    endpoints: [
      ["get", "/api/ai/status"],
      ["get", "/api/admin/ai/diagnostics"],
      ["post", "/api/admin/ai/smoke"],
      ["get", "/api/admin/ai/source-pack-reviews"],
      ["get", "/api/admin/ai/source-pack-reviews/:domain"],
      ["post", "/api/admin/ai/source-pack-reviews/:domain/dry-run"],
    ],
  },
  {
    file: "server/ai/personalAIRoute.ts",
    exportName: "registerPersonalAIRoutes",
    endpoints: [["post", "/api/personal-ai/respond"]],
  },
  {
    file: "server/revenuecatWebhook.ts",
    exportName: "registerRevenueCatWebhookRoutes",
    endpoints: [["post", "/api/webhooks/revenuecat"]],
  },
  {
    file: "server/subscriptionSync.ts",
    exportName: "registerSubscriptionSyncRoutes",
    endpoints: [["post", "/api/subscriptions/refresh"]],
  },
  {
    file: "server/notifications.ts",
    exportName: "registerNotificationRoutes",
    endpoints: [
      ["post", "/api/notifications/push-token"],
      ["delete", "/api/notifications/push-token"],
      ["get", "/api/notifications/smart/preview"],
      ["post", "/api/notifications/smart/run-daily"],
    ],
  },
  {
    file: "server/librarySourceReview.ts",
    exportName: "registerLibrarySourceReviewRoutes",
    endpoints: [
      ["get", "/api/library/source-reviews"],
      ["post", "/api/library/source-reviews"],
    ],
  },
  {
    file: "server/replit_integrations/chat/routes.ts",
    exportName: "registerChatRoutes",
    endpoints: [
      ["get", "/api/conversations"],
      ["get", "/api/conversations/:id"],
      ["post", "/api/conversations"],
      ["delete", "/api/conversations/:id"],
      ["post", "/api/conversations/:id/messages"],
    ],
  },
  {
    file: "server/replit_integrations/audio/routes.ts",
    exportName: "registerAudioRoutes",
    endpoints: [
      ["post", "/api/audio/tts"],
      ["post", "/api/conversations/:id/audio-messages"],
    ],
  },
  {
    file: "server/replit_integrations/scholar-agent/routes.ts",
    exportName: "registerScholarAgentRoutes",
    endpoints: [
      ["get", "/api/scholar/filters"],
      ["post", "/api/scholar/ask"],
    ],
  },
  {
    file: "server/community.ts",
    exportName: "registerCommunityRoutes",
    endpoints: [
      ["post", "/api/community/profile"],
      ["get", "/api/community/profile"],
      ["get", "/api/community/profile/:deviceId"],
      ["get", "/api/community/rooms"],
      ["get", "/api/community/stats"],
      ["get", "/api/community/rooms/:roomId/posts"],
      ["post", "/api/community/posts"],
      ["get", "/api/community/posts/:postId/replies"],
      ["post", "/api/community/replies"],
      ["post", "/api/community/posts/:postId/like"],
      ["post", "/api/community/posts/:postId/not-for-me"],
      ["post", "/api/community/posts/:postId/repost"],
      ["delete", "/api/community/posts/:postId"],
    ],
  },
  {
    file: "server/family.ts",
    exportName: "registerFamilyRoutes",
    endpoints: [
      ["get", "/api/users/search"],
      ["post", "/api/family/groups"],
      ["get", "/api/family/groups"],
      ["put", "/api/family/groups/:id"],
      ["post", "/api/family/groups/:id/invite"],
      ["delete", "/api/family/groups/:groupId/members/:userId"],
      ["get", "/api/family/groups/:groupId/messages"],
      ["post", "/api/family/groups/:groupId/messages"],
      ["get", "/api/family/groups/:groupId/progress"],
      ["post", "/api/family/groups/:groupId/progress"],
      ["get", "/api/family/invitations"],
      ["post", "/api/family/invitations/:id/respond"],
    ],
  },
  {
    file: "server/places.ts",
    exportName: "registerPlacesRoutes",
    endpoints: [
      ["get", "/api/places/location-search"],
      ["get", "/api/places/geocode"],
      ["get", "/api/places/airport-search"],
      ["get", "/api/places/nearby"],
      ["get", "/api/places/nearest-airport"],
    ],
  },
  {
    file: "server/wallet/walletPassRoutes.ts",
    exportName: "registerWalletPassRoutes",
    endpoints: [
      ["get", "/api/wallet/status"],
      ["post", "/api/wallet/next-prayer-pass"],
    ],
  },
  {
    file: "server/nasheeds.ts",
    exportName: "registerNasheedRoutes",
    endpoints: [
      ["get", "/api/nasheeds"],
      ["post", "/api/admin/nasheeds"],
      ["put", "/api/admin/nasheeds/:id"],
      ["delete", "/api/admin/nasheeds/:id"],
    ],
  },
  {
    file: "server/progress.ts",
    exportName: "registerProgressRoutes",
    endpoints: [
      ["get", "/api/progress"],
      ["put", "/api/progress"],
      ["put", "/api/progress/:category"],
      ["delete", "/api/progress/:category"],
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasEndpoint(text, method, routePath) {
  const pattern = new RegExp(
    `app\\s*\\.\\s*${method}\\s*\\([\\s\\S]{0,180}["']${escapeRegExp(
      routePath,
    )}["']`,
  );
  return pattern.test(text);
}

function extractAppEndpoints(text) {
  const endpoints = [];
  const pattern =
    /app\s*\.\s*(get|post|put|patch|delete)\s*\([\s\S]{0,180}?["']([^"']+)["']/g;
  let match = pattern.exec(text);
  while (match) {
    endpoints.push([match[1], match[2]]);
    match = pattern.exec(text);
  }
  return endpoints;
}

function hasCall(text, functionName, argument = "app") {
  return new RegExp(
    `${escapeRegExp(functionName)}\\s*\\(\\s*${escapeRegExp(argument)}\\s*\\)`,
  ).test(text);
}

function assertInOrder(text, labels, findings) {
  let cursor = -1;
  for (const label of labels) {
    const nextIndex = text.indexOf(label, cursor + 1);
    if (nextIndex === -1) {
      findings.push(`server/index.ts must include ${label}.`);
      return;
    }
    if (nextIndex < cursor) {
      findings.push(`server/index.ts startup order is invalid near ${label}.`);
      return;
    }
    cursor = nextIndex;
  }
}

function main() {
  const findings = [];
  const routesText = (() => {
    try {
      return read("server/routes.ts");
    } catch (error) {
      findings.push(error.message);
      return "";
    }
  })();
  const indexText = (() => {
    try {
      return read("server/index.ts");
    } catch (error) {
      findings.push(error.message);
      return "";
    }
  })();

  if (!hasCall(indexText, "registerRoutes", "app")) {
    findings.push("server/index.ts must call registerRoutes(app).");
  }
  if (!hasCall(indexText, "configureExpoAndLanding", "app")) {
    findings.push("server/index.ts must configure Expo/landing routes.");
  }
  if (!hasCall(indexText, "setupCors", "app")) {
    findings.push("server/index.ts must configure CORS before routes.");
  }
  if (!hasCall(indexText, "setupBodyParsing", "app")) {
    findings.push("server/index.ts must configure body parsing.");
  }
  if (!hasCall(indexText, "setupRequestLogging", "app")) {
    findings.push("server/index.ts must configure request logging.");
  }
  if (!hasCall(indexText, "getSessionSecret", "")) {
    findings.push("server/index.ts must use the session secret guard.");
  }
  if (!indexText.includes("session({")) {
    findings.push("server/index.ts must install express-session middleware.");
  }
  assertInOrder(
    indexText,
    [
      "setupCors(app)",
      "setupBodyParsing(app)",
      "session({",
      "setupRequestLogging(app)",
      "configureExpoAndLanding(app)",
      "registerRoutes(app)",
      "setupErrorHandler(app)",
    ],
    findings,
  );

  let endpointCount = 0;
  for (const module of routeModules) {
    let text = "";
    try {
      text = read(module.file);
    } catch (error) {
      findings.push(error.message);
      continue;
    }

    if (!hasCall(routesText, module.exportName, "app")) {
      findings.push(`server/routes.ts must call ${module.exportName}(app).`);
    }
    if (!text.includes(`export function ${module.exportName}`)) {
      findings.push(`${module.file} must export ${module.exportName}.`);
    }

    for (const [method, routePath] of module.endpoints) {
      endpointCount += 1;
      if (!hasEndpoint(text, method, routePath)) {
        findings.push(
          `${module.file}: missing ${method.toUpperCase()} ${routePath}`,
        );
      }
    }

    const expected = new Set(
      module.endpoints.map(([method, routePath]) => `${method}:${routePath}`),
    );
    for (const [method, routePath] of extractAppEndpoints(text)) {
      const key = `${method}:${routePath}`;
      if (!expected.has(key)) {
        findings.push(
          `${module.file}: unlisted ${method.toUpperCase()} ${routePath}; add it to the release route manifest and threat-model coverage.`,
        );
      }
    }
  }

  if (findings.length) {
    console.error("Server route manifest check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    `Server route manifest check passed: ${routeModules.length} route modules and ${endpointCount} endpoints verified.`,
  );
}

main();
