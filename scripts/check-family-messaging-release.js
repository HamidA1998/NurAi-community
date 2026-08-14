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

function main() {
  const findings = [];
  const familyScreen = read("client/screens/FamilyGroupScreen.tsx");
  const familyServer = read("server/family.ts");
  const app = read("client/App.tsx");
  const notificationCenter = read("client/lib/notification-center.ts");
  const notificationsScreen = read(
    "client/screens/NotificationsCenterScreen.tsx",
  );
  const migrationRepair = read(
    "migrations/0014_family_messages_table_repair.sql",
  );
  const creatorMembershipBackfill = read(
    "migrations/0016_family_creator_membership_backfill.sql",
  );
  const schema = read("shared/schema.ts");
  const migrationChecks = read("scripts/check-db-migrations-applied.js");
  const packageJson = JSON.parse(read("package.json"));

  requireIncludes(
    familyScreen,
    "client/screens/FamilyGroupScreen.tsx",
    [
      "Keyboard.addListener",
      "useRoute",
      "route.params?.initialTab",
      "keyboardDidShow",
      "messageComposerFocused",
      "scrollMessagesIntoViewAfterKeyboard",
      "scrollBottomPadding",
      "keyboardVerticalOffset={familyKeyboardOffset}",
      'automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}',
      'activeTab === "messages"',
      "? scrollBottomPadding",
      ": insets.bottom + scrollBottomPadding",
      "setTimeout(scrollMessagesIntoViewAfterKeyboard, 420)",
      "maxLength={600}",
      'textAlignVertical="top"',
      'testID="input-family-message"',
      'testID="button-send-family-message"',
      'testID="button-retry-family-message"',
      "getFamilySendErrorCopy",
      "isQueueableFamilySendError",
      "responseBody.message",
      "prepareFamilyMessageRetry",
      "PendingFamilyRetry",
      "createFamilyClientMessageId",
      "FAMILY_MESSAGE_OUTBOX_KEY",
      "loadFamilyMessageOutbox",
      "upsertFamilyMessageOutbox",
      "removeFamilyMessageOutboxItem",
      "mergeFamilyMessages",
      "pendingFamilyRetry",
      "metadata: { clientMessageId }",
      "familySyncIssue",
      "messagesLoaded",
      "progressLoaded",
      "Latest family messages could not refresh. Your saved messages stay visible.",
      "Family progress could not refresh. Messages are still available.",
      "Latest family updates could not refresh. Your saved messages stay visible.",
      "family-message-sync-soft-warning",
      "button-retry-family-sync-refresh",
      "void fetchFamilyCollaboration(currentGroup.id)",
      "FAMILY_MESSAGE_SEND_ERROR",
      "Message saved locally. Try sending again when your connection is back.",
      "FAMILY_MESSAGE_QUEUED_COPY",
      "Waiting to send. NurAI will retry automatically when the connection returns.",
      "setFamilySyncIssue(FAMILY_MESSAGE_QUEUED_COPY)",
      "Saved message ready. Edit it if needed, then send again.",
      "Waiting to send",
      "button-send-family-outbox",
      "Send now",
      "reconcileFamilyMessageDelivery",
      "setInterval(tryDelivery, 20_000)",
      "retryQueuedFamilyMessages",
      "flushQueuedFamilyMessages",
      "We could not confirm this family circle membership.",
      "Retry this message",
      "parseQuranChallengeReference",
      "handleOpenQuranChallenge",
      "family-quran-challenge-action-row",
      "button-family-open-quran-${challenge.id}",
      "button-family-quran-checkin-${challenge.id}",
      "Open ayah",
      "route.params?.groupId",
      "const requestedGroupId = useMemo",
      "groups.find((group) => group.id === requestedGroupId)",
      'type FamilySection = "home" | "people" | "together" | "chat"',
      'const [familySection, setFamilySection] = useState<FamilySection>("home")',
      "navigateFamilySection",
      'testID="family-circle-home"',
      'testID="family-circle-together"',
      'testID="family-circle-tabs"',
      'testID="button-family-home-message"',
      'familySection === "chat"',
    ],
    findings,
  );

  requireIncludes(
    familyServer,
    "server/family.ts",
    [
      '"/api/family/groups/:groupId/messages"',
      "requireFamilyMembership(req, res, user, groupId)",
      'enforceFamilyWriteRateLimit(req, res, "family:messages")',
      "Family write rate limit unavailable; allowing family action",
      "await ensureFamilyCollaborationStorage()",
      "findFamilyMembership(groupId, user.id)",
      "existingMembership ??",
      "cleanFamilyMessage(req.body?.content)",
      "cleanFamilyMessageMetadata",
      "clientMessageId",
      "familyMessageRowToResponse",
      "->>'clientMessageId'",
      "ALTER COLUMN type DROP NOT NULL",
      "ALTER COLUMN message DROP NOT NULL",
      ".insert(familyMessages)",
      'action: "message_sent"',
      "ensureFamilyCreatorMembership",
      "ensureAllCreatorMemberships",
      "family_message_save_failed",
      "Message saved locally. Try sending again when your connection is back.",
      "sendUserPushNotification",
      'route: "FamilyGroup"',
      'initialTab: "messages"',
      "Creator membership self-heal used raw SQL fallback",
      "INSERT INTO family_members (group_id, user_id, role)",
      "WHERE NOT EXISTS",
    ],
    findings,
  );

  requireIncludes(
    app,
    "client/App.tsx",
    [
      "getNotificationRouteParams",
      'for (const key of [\"initialTab\", \"groupId\", \"messageId\"])',
      'route: typeof data?.route === "string" ? data.route : undefined',
      "params: getNotificationRouteParams(data)",
      "navigateOrQueueRoute(",
    ],
    findings,
  );

  requireIncludes(
    notificationCenter,
    "client/lib/notification-center.ts",
    [
      '"family_message"',
      'type === "update" || type === "family"',
      "route?: string",
      "params?: Record<string, unknown>",
      "input.route",
    ],
    findings,
  );

  requireIncludes(
    notificationsScreen,
    "client/screens/NotificationsCenterScreen.tsx",
    [
      'notification?.route === "FamilyGroup"',
      'navigation.navigate("FamilyGroup", notification.params)',
    ],
    findings,
  );

  requireIncludes(
    migrationRepair,
    "migrations/0014_family_messages_table_repair.sql",
    [
      "ALTER COLUMN type DROP NOT NULL",
      "ALTER COLUMN type SET DEFAULT",
      "ALTER COLUMN message DROP NOT NULL",
      "ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "ON family_messages (group_id, created_at)",
      "ON family_messages (sender_id, created_at)",
    ],
    findings,
  );

  requireIncludes(
    creatorMembershipBackfill,
    "migrations/0016_family_creator_membership_backfill.sql",
    [
      "INSERT INTO family_members",
      "family_groups.creator_id",
      "NOT EXISTS",
      "'creator'",
    ],
    findings,
  );

  requireIncludes(
    schema,
    "shared/schema.ts",
    [
      "familyMessages = pgTable",
      '"family_messages"',
      'senderId: varchar("sender_id")',
      'content: text("content").notNull()',
      'metadata: jsonb("metadata")',
      'createdAt: timestamp("created_at")',
      'index("family_messages_group_created_idx")',
      'index("family_messages_sender_created_idx")',
    ],
    findings,
  );

  requireIncludes(
    migrationChecks,
    "0016_family_creator_membership_backfill",
    ["0016_family_creator_membership_backfill"],
    findings,
  );

  const scripts = packageJson.scripts || {};
  if (
    scripts["check:family-messaging-release"] !==
    "node scripts/check-family-messaging-release.js"
  ) {
    findings.push(
      "package.json: check:family-messaging-release must run scripts/check-family-messaging-release.js.",
    );
  }
  if (
    !String(scripts["check:release-local"] || "").includes(
      "check:family-messaging-release",
    )
  ) {
    findings.push(
      "package.json: check:release-local must include check:family-messaging-release.",
    );
  }

  if (findings.length) {
    console.error("Family messaging release check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Family messaging release check passed: private message route, retry UI, and keyboard-safe composer are wired.",
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
