#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");
const service = read("client/services/personalGuideConversationService.ts");
const chatRoutes = read("server/replit_integrations/chat/routes.ts");
const guideScreen = read("client/screens/PersonalGuideScreen.tsx");
const communityService = read("client/services/communitySocialService.ts");
const communityRoutes = read("server/communitySocial.ts");
const communityScreen = read("client/screens/CommunityScreen.tsx");
const communitySettings = read("client/screens/CommunitySettingsScreen.tsx");
const notifications = read("server/notifications.ts");
const app = read("client/App.tsx");
const schema = read("shared/schema.ts");
const safetySchema = read("shared/communitySafety.ts");
const mediaMigration = read(
  "migrations/0022_community_private_message_media.sql",
);
const feedbackMigration = read(
  "migrations/0023_community_private_post_feedback.sql",
);
const findings = [];

if (!service.includes("clientMessageId: params.clientMessageId")) {
  findings.push("Personal Guide requests need a stable client message id");
}
if (!chatRoutes.includes("replyToClientMessageId")) {
  findings.push("Chat replies need idempotent client-message linkage");
}
if (!chatRoutes.includes("client_message_conflict")) {
  findings.push(
    "Idempotent message ids must be bound to their original content",
  );
}
if (!chatRoutes.includes("if (previousUserMessage) {")) {
  findings.push("Message retries must not consume daily quota twice");
}
if (!guideScreen.includes('accessibilityLabel="Retry message"')) {
  findings.push("Failed Personal Guide messages need an accessible retry");
}
if (!service.includes("ENABLE_LOCAL_PREVIEW_CONVERSATIONS")) {
  findings.push("Local preview sessions need a real conversation adapter");
}
if (!guideScreen.includes("await refreshUser()")) {
  findings.push(
    "Expired Personal Guide sessions need an authentication refresh",
  );
}
if (!guideScreen.includes("failedMessageClearance")) {
  findings.push(
    "Failed-message retry controls need clear space above the composer",
  );
}
if (!communityService.includes("createCommunityClientMessageId")) {
  findings.push("Community messages need a stable client message id");
}
if (!communityRoutes.includes("client_message_conflict")) {
  findings.push(
    "Community message retries must be bound to their original content",
  );
}
if (!communityRoutes.includes("connection_required")) {
  findings.push(
    "Community direct messages must require an accepted connection",
  );
}
if (
  !communityRoutes.includes(
    "const connection = await getConnectionByPair(profile.id, otherProfileId)",
  ) ||
  !communityRoutes.includes('connection?.status !== "accepted"')
) {
  findings.push(
    "Reading an existing conversation must still require a current accepted connection",
  );
}
if (!communityRoutes.includes("hasBlockBetween")) {
  findings.push("Community messages must enforce blocks on the server");
}
if (!communityRoutes.includes('app.get("/api/community/blocks"')) {
  findings.push("Community safety settings need a server-backed blocked list");
}
if (!communitySettings.includes("discoverableByEmail")) {
  findings.push("Community settings need exact-email discovery controls");
}
if (!communitySettings.includes("allowConnectionRequests")) {
  findings.push("Community settings need message-request privacy controls");
}
if (!communitySettings.includes("unblockCommunityMember")) {
  findings.push("Community settings need a usable unblock action");
}
if (
  communityScreen.includes("button-repost-") ||
  communityScreen.includes("button-share-")
) {
  findings.push(
    "Private Community boards must not expose repost or external-share mechanics",
  );
}
if (!communityScreen.includes("Beneficial")) {
  findings.push(
    "Community appreciation needs NurAI's non-competitive beneficial framing",
  );
}
if (!communityRoutes.includes("canCommunityMembersInteract")) {
  findings.push("Community social routes must enforce same-space interaction");
}
if (!communityScreen.includes('testID="button-retry-community-message"')) {
  findings.push("Failed Community messages need an accessible retry");
}
if (!communityScreen.includes('accessibilityLabel="Retry message"')) {
  findings.push("Community message retry must have a screen-reader label");
}
if (!communityScreen.includes("conversationUnavailable")) {
  findings.push(
    "Revoked or blocked conversations need a clear locked client state",
  );
}
if (!communityScreen.includes("current.trim() ? current : pending.content")) {
  findings.push("Failed sends must restore the unsent message draft");
}
if (!communityScreen.includes('handleReport("message", item.id')) {
  findings.push("Individual direct messages need a moderation action");
}
if (!communityRoutes.includes("sendUserPushNotification")) {
  findings.push("Community messages need recipient push delivery");
}
if (
  !schema.includes("communityDirectMessageMedia") ||
  !mediaMigration.includes("byte_size <= 786432") ||
  !mediaMigration.includes("width BETWEEN 1 AND 2048")
) {
  findings.push(
    "Private message photos need bounded, migration-backed storage",
  );
}
if (
  !safetySchema.includes("dataUrl") ||
  !communityRoutes.includes("data:image\\/jpeg") ||
  !communityRoutes.includes("jpegDimensions") ||
  !communityRoutes.includes('createHash("sha256")') ||
  !communityRoutes.includes('Cache-Control", "private, no-store')
) {
  findings.push(
    "Private message photos need server-side content, dimension, hash and cache validation",
  );
}
if (
  !communityScreen.includes("chooseDirectMessageImage") ||
  !communityScreen.includes("Photo ready") ||
  !communityScreen.includes('accessibilityLabel="Choose a photo"')
) {
  findings.push(
    "Community conversations need an accessible, compressed photo composer",
  );
}
if (
  !feedbackMigration.includes("not_for_me") ||
  !communityScreen.includes("Show fewer posts like this") ||
  !communityScreen.includes("does not create a public dislike count")
) {
  findings.push(
    "Negative post feedback must stay private instead of creating public dislike pile-ons",
  );
}
if (!notifications.includes("export async function sendUserPushNotification")) {
  findings.push("Messaging push delivery must use registered user devices");
}
if (!app.includes('case "Community"')) {
  findings.push("Community message notifications must open the Community tab");
}
if (
  !communityScreen.includes("setInterval") ||
  !communityScreen.includes("20_000")
) {
  findings.push("Community inbox needs background refresh while it is visible");
}

if (findings.length) {
  console.error("Messaging services release check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Messaging services release check passed.");
