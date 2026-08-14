import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  timestamp,
  date,
  boolean,
  real,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password"),
  email: text("email").unique(),
  displayName: text("display_name"),
  profilePhoto: text("profile_photo"),
  authProvider: text("auth_provider").notNull().default("email"),
  providerAccountId: text("provider_account_id"),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
  authProvider: true,
  providerAccountId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata")
    .default(sql`'{}'::jsonb`)
    .notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export const communityProfiles = pgTable(
  "community_profiles",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull().unique(),
    displayName: text("display_name").notNull(),
    gender: text("gender").notNull(),
    bio: text("bio").notNull().default(""),
    discoverableByUsername: boolean("discoverable_by_username")
      .notNull()
      .default(true),
    discoverableByEmail: boolean("discoverable_by_email")
      .notNull()
      .default(true),
    allowConnectionRequests: boolean("allow_connection_requests")
      .notNull()
      .default(true),
    audienceLockedAt: timestamp("audience_locked_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [uniqueIndex("community_profiles_user_id_idx").on(table.userId)],
);

export const communityRooms = pgTable("community_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("message-circle"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id")
    .notNull()
    .references(() => communityRooms.id, { onDelete: "cascade" }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => communityProfiles.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  audience: text("audience").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const communityReplies = pgTable("community_replies", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => communityPosts.id, { onDelete: "cascade" }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => communityProfiles.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  audience: text("audience").notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const communityLikes = pgTable(
  "community_likes",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    profileId: integer("profile_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("community_likes_post_profile_idx").on(
      table.postId,
      table.profileId,
    ),
  ],
);

export const communityReposts = pgTable(
  "community_reposts",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    profileId: integer("profile_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("community_reposts_post_profile_idx").on(
      table.postId,
      table.profileId,
    ),
  ],
);

export const communityPostFeedback = pgTable(
  "community_post_feedback",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    profileId: integer("profile_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("not_for_me"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("community_post_feedback_post_profile_idx").on(
      table.postId,
      table.profileId,
    ),
  ],
);

export const communityConnections = pgTable(
  "community_connections",
  {
    id: serial("id").primaryKey(),
    profileOneId: integer("profile_one_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    profileTwoId: integer("profile_two_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    requestedByProfileId: integer("requested_by_profile_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("community_connections_pair_idx").on(
      table.profileOneId,
      table.profileTwoId,
    ),
    index("community_connections_one_status_idx").on(
      table.profileOneId,
      table.status,
    ),
    index("community_connections_two_status_idx").on(
      table.profileTwoId,
      table.status,
    ),
  ],
);

export const communityBlocks = pgTable(
  "community_blocks",
  {
    id: serial("id").primaryKey(),
    blockerProfileId: integer("blocker_profile_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    blockedProfileId: integer("blocked_profile_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("community_blocks_direction_idx").on(
      table.blockerProfileId,
      table.blockedProfileId,
    ),
    index("community_blocks_blocked_idx").on(table.blockedProfileId),
  ],
);

export const communityConversations = pgTable(
  "community_conversations",
  {
    id: serial("id").primaryKey(),
    profileOneId: integer("profile_one_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    profileTwoId: integer("profile_two_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    audience: text("audience").notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    lastMessageAt: timestamp("last_message_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("community_conversations_pair_idx").on(
      table.profileOneId,
      table.profileTwoId,
    ),
    index("community_conversations_one_recent_idx").on(
      table.profileOneId,
      table.lastMessageAt,
    ),
    index("community_conversations_two_recent_idx").on(
      table.profileTwoId,
      table.lastMessageAt,
    ),
  ],
);

export const communityDirectMessages = pgTable(
  "community_direct_messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => communityConversations.id, { onDelete: "cascade" }),
    senderProfileId: integer("sender_profile_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    clientMessageId: text("client_message_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    readAt: timestamp("read_at"),
  },
  (table) => [
    uniqueIndex("community_direct_messages_sender_client_idx").on(
      table.senderProfileId,
      table.clientMessageId,
    ),
    index("community_direct_messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export const communityDirectMessageMedia = pgTable(
  "community_direct_message_media",
  {
    id: serial("id").primaryKey(),
    messageId: integer("message_id")
      .notNull()
      .references(() => communityDirectMessages.id, { onDelete: "cascade" }),
    ownerProfileId: integer("owner_profile_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    altText: text("alt_text").notNull().default("Shared image"),
    sha256: text("sha256").notNull(),
    base64Data: text("base64_data").notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("community_direct_message_media_message_idx").on(
      table.messageId,
    ),
    index("community_direct_message_media_owner_idx").on(table.ownerProfileId),
  ],
);

export const communityReports = pgTable(
  "community_reports",
  {
    id: serial("id").primaryKey(),
    reporterProfileId: integer("reporter_profile_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    subjectProfileId: integer("subject_profile_id").references(
      () => communityProfiles.id,
      { onDelete: "set null" },
    ),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    targetSnapshot: jsonb("target_snapshot")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    status: text("status").notNull().default("open"),
    moderatedByUserId: varchar("moderated_by_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [
    index("community_reports_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
    index("community_reports_reporter_created_idx").on(
      table.reporterProfileId,
      table.createdAt,
    ),
  ],
);

export const communityCircles = pgTable("community_circles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  audience: text("audience").notNull(),
  createdByProfileId: integer("created_by_profile_id")
    .notNull()
    .references(() => communityProfiles.id, { onDelete: "cascade" }),
  inviteCode: text("invite_code").notNull(),
  memberCap: integer("member_cap").notNull().default(8),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const communityCircleMembers = pgTable(
  "community_circle_members",
  {
    id: serial("id").primaryKey(),
    circleId: integer("circle_id")
      .notNull()
      .references(() => communityCircles.id, { onDelete: "cascade" }),
    profileId: integer("profile_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    joinedAt: timestamp("joined_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("community_circle_members_pair_idx").on(
      table.circleId,
      table.profileId,
    ),
    index("community_circle_members_profile_idx").on(table.profileId),
  ],
);

export const communityCircleCheckins = pgTable(
  "community_circle_checkins",
  {
    id: serial("id").primaryKey(),
    circleId: integer("circle_id")
      .notNull()
      .references(() => communityCircles.id, { onDelete: "cascade" }),
    profileId: integer("profile_id")
      .notNull()
      .references(() => communityProfiles.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    checkinDate: date("checkin_date")
      .default(sql`CURRENT_DATE`)
      .notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("community_circle_checkins_unique_idx").on(
      table.circleId,
      table.profileId,
      table.checkinDate,
    ),
    index("community_circle_checkins_circle_date_idx").on(
      table.circleId,
      table.checkinDate,
    ),
  ],
);

export type CommunityConnection = typeof communityConnections.$inferSelect;
export type CommunityConversation = typeof communityConversations.$inferSelect;
export type CommunityDirectMessage =
  typeof communityDirectMessages.$inferSelect;
export type CommunityDirectMessageMedia =
  typeof communityDirectMessageMedia.$inferSelect;
export type CommunityCircle = typeof communityCircles.$inferSelect;
export type CommunityCircleMember = typeof communityCircleMembers.$inferSelect;
export type CommunityCircleCheckin =
  typeof communityCircleCheckins.$inferSelect;

export const familyGroups = pgTable("family_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  creatorId: varchar("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const familyMembers = pgTable(
  "family_members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => familyGroups.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    joinedAt: timestamp("joined_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("family_members_group_user_idx").on(
      table.groupId,
      table.userId,
    ),
  ],
);

export const familyInvitations = pgTable("family_invitations", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .notNull()
    .references(() => familyGroups.id, { onDelete: "cascade" }),
  inviterId: varchar("inviter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  inviteeId: varchar("invitee_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  inviteeEmail: text("invitee_email"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const familyAuditEvents = pgTable(
  "family_audit_events",
  {
    id: serial("id").primaryKey(),
    action: text("action").notNull(),
    actorId: varchar("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: integer("group_id").references(() => familyGroups.id, {
      onDelete: "set null",
    }),
    invitationId: integer("invitation_id").references(
      () => familyInvitations.id,
      {
        onDelete: "set null",
      },
    ),
    targetUserId: varchar("target_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("family_audit_events_group_created_idx").on(
      table.groupId,
      table.createdAt,
    ),
    index("family_audit_events_actor_created_idx").on(
      table.actorId,
      table.createdAt,
    ),
    index("family_audit_events_invitation_idx").on(table.invitationId),
  ],
);

export const familyMessages = pgTable(
  "family_messages",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => familyGroups.id, { onDelete: "cascade" }),
    senderId: varchar("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("message"),
    content: text("content").notNull(),
    metadata: jsonb("metadata")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("family_messages_group_created_idx").on(
      table.groupId,
      table.createdAt,
    ),
    index("family_messages_sender_created_idx").on(
      table.senderId,
      table.createdAt,
    ),
  ],
);

export const familyProgressEvents = pgTable(
  "family_progress_events",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => familyGroups.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    title: text("title").notNull(),
    value: integer("value").notNull().default(1),
    unit: text("unit").notNull().default("action"),
    metadata: jsonb("metadata")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("family_progress_events_group_created_idx").on(
      table.groupId,
      table.createdAt,
    ),
    index("family_progress_events_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("family_progress_events_group_category_idx").on(
      table.groupId,
      table.category,
    ),
  ],
);

/**
 * Family Circle places are labels chosen by the family. Coordinates are
 * optional and are only written when a member explicitly shares a location;
 * the client does not need them for the saved-place experience.
 */
export const familyPlaces = pgTable(
  "family_places",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => familyGroups.id, { onDelete: "cascade" }),
    createdBy: varchar("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("custom"),
    address: text("address"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("family_places_group_created_idx").on(table.groupId, table.createdAt),
    index("family_places_creator_idx").on(table.createdBy),
  ],
);

/**
 * Deliberately stores only the current check-in for each member. A future
 * history feature must be separately consented and retained; this table is
 * not a location timeline.
 */
export const familyCheckIns = pgTable(
  "family_check_ins",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => familyGroups.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    placeId: integer("place_id").references(() => familyPlaces.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("safe"),
    locationLabel: text("location_label").notNull(),
    latitude: real("latitude"),
    longitude: real("longitude"),
    accuracyMeters: real("accuracy_meters"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("family_check_ins_group_user_idx").on(
      table.groupId,
      table.userId,
    ),
    index("family_check_ins_group_updated_idx").on(
      table.groupId,
      table.updatedAt,
    ),
    index("family_check_ins_expires_idx").on(table.expiresAt),
  ],
);

export type FamilyGroup = typeof familyGroups.$inferSelect;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type FamilyInvitation = typeof familyInvitations.$inferSelect;
export type FamilyAuditEvent = typeof familyAuditEvents.$inferSelect;
export type FamilyMessage = typeof familyMessages.$inferSelect;
export type FamilyProgressEvent = typeof familyProgressEvents.$inferSelect;
export type FamilyPlace = typeof familyPlaces.$inferSelect;
export type FamilyCheckIn = typeof familyCheckIns.$inferSelect;

export const librarySourceReviewEvents = pgTable(
  "library_source_review_events",
  {
    id: serial("id").primaryKey(),
    bookId: text("book_id").notNull(),
    chapterId: text("chapter_id").notNull(),
    decision: text("decision").notNull(),
    reviewerId: varchar("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewerPlan: text("reviewer_plan").notNull(),
    reviewerLabel: text("reviewer_label").notNull(),
    note: text("note"),
    sourceFingerprint: text("source_fingerprint").notNull(),
    sourceIssueCount: integer("source_issue_count").notNull().default(0),
    sourceCount: integer("source_count").notNull().default(0),
    verifiedSourceCount: integer("verified_source_count").notNull().default(0),
    metadata: jsonb("metadata")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("library_source_review_events_chapter_created_idx").on(
      table.bookId,
      table.chapterId,
      table.createdAt,
    ),
    index("library_source_review_events_reviewer_created_idx").on(
      table.reviewerId,
      table.createdAt,
    ),
    index("library_source_review_events_fingerprint_idx").on(
      table.sourceFingerprint,
    ),
  ],
);

export type LibrarySourceReviewEvent =
  typeof librarySourceReviewEvents.$inferSelect;

export const nasheedTracks = pgTable(
  "nasheed_tracks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    artist: text("artist").notNull().default("NurAI Originals"),
    duration: text("duration").notNull().default("--:--"),
    category: text("category").notNull(),
    audioUrl: text("audio_url").notNull(),
    fallbackUrl: text("fallback_url"),
    coverUrl: text("cover_url"),
    sourceType: text("source_type").notNull().default("owned"),
    licenseLabel: text("license_label")
      .notNull()
      .default("NurAI owned/licensed audio"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    metadata: jsonb("metadata")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("nasheed_tracks_slug_idx").on(table.slug),
    index("nasheed_tracks_active_sort_idx").on(
      table.isActive,
      table.sortOrder,
      table.title,
    ),
    index("nasheed_tracks_category_idx").on(table.category),
  ],
);

export type NasheedTrack = typeof nasheedTracks.$inferSelect;

export const insertCommunityProfileSchema = createInsertSchema(
  communityProfiles,
).omit({ id: true, createdAt: true });
export const insertCommunityPostSchema = createInsertSchema(
  communityPosts,
).omit({ id: true, createdAt: true, pinned: true });
export const insertCommunityReplySchema = createInsertSchema(
  communityReplies,
).omit({ id: true, createdAt: true });

export type CommunityProfile = typeof communityProfiles.$inferSelect;
export type InsertCommunityProfile = z.infer<
  typeof insertCommunityProfileSchema
>;
export type CommunityRoom = typeof communityRooms.$inferSelect;
export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type CommunityReply = typeof communityReplies.$inferSelect;
export type InsertCommunityReply = z.infer<typeof insertCommunityReplySchema>;
export type CommunityLike = typeof communityLikes.$inferSelect;
export type CommunityRepost = typeof communityReposts.$inferSelect;
export type CommunityPostFeedback = typeof communityPostFeedback.$inferSelect;

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  streak: jsonb("streak").default(sql`'{}'::jsonb`),
  quran: jsonb("quran").default(sql`'{}'::jsonb`),
  tasbeeh: jsonb("tasbeeh").default(sql`'{}'::jsonb`),
  hasanat: jsonb("hasanat").default(sql`'{}'::jsonb`),
  achievements: jsonb("achievements").default(sql`'{}'::jsonb`),
  prayers: jsonb("prayers").default(sql`'{}'::jsonb`),
  dailyPlan: jsonb("daily_plan").default(sql`'{}'::jsonb`),
  womensHealth: jsonb("womens_health").default(sql`'{}'::jsonb`),
  kids: jsonb("kids").default(sql`'{}'::jsonb`),
  ramadan: jsonb("ramadan").default(sql`'{}'::jsonb`),
  zakat: jsonb("zakat").default(sql`'{}'::jsonb`),
  finance: jsonb("finance").default(sql`'{}'::jsonb`),
  hajj: jsonb("hajj").default(sql`'{}'::jsonb`),
  challenges: jsonb("challenges").default(sql`'{}'::jsonb`),
  family: jsonb("family").default(sql`'{}'::jsonb`),
  notifications: jsonb("notifications").default(sql`'{}'::jsonb`),
  settings: jsonb("settings").default(sql`'{}'::jsonb`),
  community: jsonb("community").default(sql`'{}'::jsonb`),
  nuraiProfile: jsonb("nurai_profile").default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type UserProgress = typeof userProgress.$inferSelect;

export const PROGRESS_CATEGORIES = [
  "streak",
  "quran",
  "tasbeeh",
  "hasanat",
  "achievements",
  "prayers",
  "dailyPlan",
  "womensHealth",
  "kids",
  "ramadan",
  "zakat",
  "finance",
  "hajj",
  "challenges",
  "family",
  "notifications",
  "settings",
  "community",
  "nuraiProfile",
] as const;

export type ProgressCategory = (typeof PROGRESS_CATEGORIES)[number];

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    messageCount: integer("message_count").notNull().default(0),
    dateKey: text("date_key").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ai_usage_user_date_idx").on(table.userId, table.dateKey),
  ],
);

export const aiFeatureUsage = pgTable(
  "ai_feature_usage",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    featureKey: text("feature_key").notNull(),
    periodKey: text("period_key").notNull(),
    usageCount: integer("usage_count").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ai_feature_usage_user_feature_period_idx").on(
      table.userId,
      table.featureKey,
      table.periodKey,
    ),
    index("ai_feature_usage_period_idx").on(table.periodKey),
  ],
);

export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    id: serial("id").primaryKey(),
    namespace: text("namespace").notNull(),
    subjectKey: text("subject_key").notNull(),
    subjectType: text("subject_type").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    resetAt: timestamp("reset_at").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("rate_limit_buckets_namespace_subject_idx").on(
      table.namespace,
      table.subjectKey,
    ),
    index("rate_limit_buckets_reset_at_idx").on(table.resetAt),
  ],
);

export const subscriptionEntitlements = pgTable("subscription_entitlements", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  tier: text("tier").notNull().default("free"),
  source: text("source").notNull().default("revenuecat"),
  entitlementExpiresAt: timestamp("entitlement_expires_at"),
  cacheExpiresAt: timestamp("cache_expires_at").notNull(),
  staleUntilAt: timestamp("stale_until_at").notNull(),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationPushTokens = pgTable(
  "notification_push_tokens",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expoPushToken: text("expo_push_token").notNull(),
    deviceId: text("device_id"),
    platform: text("platform").notNull().default("unknown"),
    enabled: boolean("enabled").notNull().default(true),
    metadata: jsonb("metadata")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("notification_push_tokens_user_token_idx").on(
      table.userId,
      table.expoPushToken,
    ),
    index("notification_push_tokens_user_enabled_idx").on(
      table.userId,
      table.enabled,
    ),
    index("notification_push_tokens_seen_idx").on(table.lastSeenAt),
  ],
);

export const smartNotificationEvents = pgTable(
  "smart_notification_events",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenId: integer("token_id").references(() => notificationPushTokens.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    dateKey: text("date_key").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    route: text("route").notNull().default("Home"),
    status: text("status").notNull().default("pending"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    metadata: jsonb("metadata")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("smart_notification_events_user_kind_date_idx").on(
      table.userId,
      table.kind,
      table.dateKey,
    ),
    index("smart_notification_events_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("smart_notification_events_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);

export type NotificationPushToken = typeof notificationPushTokens.$inferSelect;
export type SmartNotificationEvent =
  typeof smartNotificationEvents.$inferSelect;
