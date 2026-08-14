import type { Express, Request, Response } from "express";
import { createHash } from "node:crypto";
import { and, desc, eq, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";

import {
  communityBlocks,
  communityConnections,
  communityConversations,
  communityDirectMessageMedia,
  communityDirectMessages,
  communityPosts,
  communityProfiles,
  communityReplies,
  communityReports,
  users,
  type CommunityProfile,
} from "@shared/schema";
import {
  canCommunityMembersInteract,
  canonicalCommunityPair,
  communityAudienceSchema,
  communityConnectionActionSchema,
  communityDirectMessageInputSchema,
  communityDirectoryQuerySchema,
  communityProfileIdSchema,
  communityProfileUpdateSchema,
  communityReportInputSchema,
  communityReportModerationSchema,
  type CommunityAudience,
} from "@shared/communitySafety";
import { isAdminEmail } from "./admin";
import { db } from "./db";
import {
  durableRateLimiter,
  getAIRateLimitSubjectFromRequest,
} from "./ai/rateLimit";
import { sendUserPushNotification } from "./notifications";
import { requireAuthenticatedUser } from "./requestAuth";

type SqlRow = Record<string, unknown>;

const MAX_COMMUNITY_IMAGE_BYTES = 768 * 1024;

type NormalizedCommunityImage = {
  mimeType: "image/jpeg";
  byteSize: number;
  width: number;
  height: number;
  altText: string;
  sha256: string;
  base64Data: string;
};

function jpegDimensions(
  bytes: Buffer,
): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) return null;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return null;
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (length < 7) return null;
      return {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  return null;
}

function normalizeCommunityImage(
  value: { dataUrl: string; altText: string } | undefined,
): NormalizedCommunityImage | null {
  if (!value) return null;
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(
    value.dataUrl,
  );
  if (!match) return null;
  const bytes = Buffer.from(match[1], "base64");
  if (
    bytes.length === 0 ||
    bytes.length > MAX_COMMUNITY_IMAGE_BYTES ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[2] !== 0xff
  ) {
    return null;
  }
  const dimensions = jpegDimensions(bytes);
  if (
    !dimensions ||
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    dimensions.width > 2048 ||
    dimensions.height > 2048
  ) {
    return null;
  }
  return {
    mimeType: "image/jpeg",
    byteSize: bytes.length,
    width: dimensions.width,
    height: dimensions.height,
    altText: value.altText || "Shared image",
    sha256: createHash("sha256").update(bytes).digest("hex"),
    base64Data: bytes.toString("base64"),
  };
}

function messageMediaSummary(media: {
  id: number;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  altText: string;
}) {
  return {
    id: media.id,
    mimeType: media.mimeType,
    byteSize: media.byteSize,
    width: media.width,
    height: media.height,
    altText: media.altText,
  };
}

function rowsFrom(result: unknown): SqlRow[] {
  return (result as { rows?: SqlRow[] }).rows || [];
}

function parsePositiveId(value: unknown): number | null {
  const parsed = communityProfileIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function profileAudience(profile: CommunityProfile): CommunityAudience | null {
  const parsed = communityAudienceSchema.safeParse(profile.gender);
  return parsed.success ? parsed.data : null;
}

async function getOwnCommunityProfile(
  userId: string,
): Promise<CommunityProfile | null> {
  const [profile] = await db
    .select()
    .from(communityProfiles)
    .where(eq(communityProfiles.userId, userId))
    .limit(1);
  return profile ?? null;
}

async function requireOwnCommunityProfile(
  req: Request,
  res: Response,
): Promise<CommunityProfile | null> {
  const user = await requireAuthenticatedUser(req, res);
  if (!user) return null;
  const profile = await getOwnCommunityProfile(user.id);
  if (!profile || !profileAudience(profile)) {
    res.status(428).json({
      error: "community_profile_required",
      message: "Choose your community space before continuing.",
    });
    return null;
  }
  return profile;
}

async function requireCommunityAdmin(req: Request, res: Response) {
  const user = await requireAuthenticatedUser(req, res);
  if (!user) return null;
  if (!isAdminEmail(user.email)) {
    res.status(403).json({
      error: "admin_required",
      message: "You do not have permission to review Community reports.",
    });
    return null;
  }
  return user;
}

async function getSameAudienceProfile(
  requester: CommunityProfile,
  targetProfileId: number,
): Promise<CommunityProfile | null> {
  const [target] = await db
    .select()
    .from(communityProfiles)
    .where(eq(communityProfiles.id, targetProfileId))
    .limit(1);
  const requesterAudience = profileAudience(requester);
  const targetAudience = target ? profileAudience(target) : null;
  if (
    !target ||
    !requesterAudience ||
    !targetAudience ||
    !canCommunityMembersInteract(requesterAudience, targetAudience)
  ) {
    return null;
  }
  return target;
}

async function hasBlockBetween(
  firstProfileId: number,
  secondProfileId: number,
): Promise<boolean> {
  const [block] = await db
    .select({ id: communityBlocks.id })
    .from(communityBlocks)
    .where(
      or(
        and(
          eq(communityBlocks.blockerProfileId, firstProfileId),
          eq(communityBlocks.blockedProfileId, secondProfileId),
        ),
        and(
          eq(communityBlocks.blockerProfileId, secondProfileId),
          eq(communityBlocks.blockedProfileId, firstProfileId),
        ),
      ),
    )
    .limit(1);
  return Boolean(block);
}

async function getConnectionByPair(
  firstProfileId: number,
  secondProfileId: number,
) {
  const pair = canonicalCommunityPair(firstProfileId, secondProfileId);
  if (!pair) return null;
  const [connection] = await db
    .select()
    .from(communityConnections)
    .where(
      and(
        eq(communityConnections.profileOneId, pair[0]),
        eq(communityConnections.profileTwoId, pair[1]),
      ),
    )
    .limit(1);
  return connection ?? null;
}

export async function enforceCommunityLimit(
  req: Request,
  res: Response,
  namespace: string,
  maxRequests: number,
): Promise<boolean> {
  try {
    const decision = await durableRateLimiter.check(
      getAIRateLimitSubjectFromRequest(req),
      { namespace, windowMs: 60_000, maxRequests },
    );
    res.setHeader("X-RateLimit-Limit", String(decision.limit));
    res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
    if (decision.allowed) return true;
    res.setHeader(
      "Retry-After",
      String(Math.ceil(decision.retryAfterMs / 1000)),
    );
    res.status(429).json({
      error: "rate_limited",
      message: "Please slow down and try again shortly.",
    });
    return false;
  } catch (error) {
    console.error(`[community] ${namespace} limiter unavailable:`, error);
    res.status(503).json({
      error: "community_safety_unavailable",
      message: "This action is temporarily unavailable. Please try again.",
    });
    return false;
  }
}

function sendUnexpectedCommunityError(
  res: Response,
  label: string,
  error: unknown,
): void {
  console.error(`[community] ${label}:`, error);
  res.status(500).json({
    error: "community_action_failed",
    message: "We could not complete that community action. Please try again.",
  });
}

async function requireConversation(
  profile: CommunityProfile,
  conversationId: number,
) {
  const [conversation] = await db
    .select()
    .from(communityConversations)
    .where(
      and(
        eq(communityConversations.id, conversationId),
        or(
          eq(communityConversations.profileOneId, profile.id),
          eq(communityConversations.profileTwoId, profile.id),
        ),
        eq(communityConversations.audience, profile.gender),
      ),
    )
    .limit(1);
  if (!conversation) return null;
  const otherProfileId =
    conversation.profileOneId === profile.id
      ? conversation.profileTwoId
      : conversation.profileOneId;
  if (await hasBlockBetween(profile.id, otherProfileId)) return null;
  const connection = await getConnectionByPair(profile.id, otherProfileId);
  if (connection?.status !== "accepted") return null;
  return { conversation, otherProfileId };
}

export function registerCommunitySocialRoutes(app: Express): void {
  app.patch("/api/community/profile", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      const profile = await getOwnCommunityProfile(user.id);
      if (!profile) {
        return res.status(404).json({ error: "Community profile not found" });
      }
      const parsed = communityProfileUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "invalid_community_profile",
          message: "Check your profile details and try again.",
        });
      }
      const [updated] = await db
        .update(communityProfiles)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(communityProfiles.id, profile.id))
        .returning();
      res.json(updated);
    } catch (error) {
      sendUnexpectedCommunityError(res, "update profile", error);
    }
  });

  app.get("/api/community/people", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      if (!(await enforceCommunityLimit(req, res, "community:directory", 20))) {
        return;
      }
      const parsed = communityDirectoryQuerySchema.safeParse({
        q: req.query.q,
      });
      if (!parsed.success) {
        return res.status(400).json({
          error: "invalid_search",
          message: "Enter at least three characters.",
        });
      }
      const query = parsed.data.q.toLowerCase();
      const isEmail = query.includes("@");
      const safePrefix = query.replace(/[%_\\]/g, "");
      const result = await db.execute(sql`
        SELECT
          candidate.id,
          account.username,
          candidate.display_name,
          candidate.bio,
          connection.id AS connection_id,
          connection.status AS connection_status,
          connection.requested_by_profile_id
        FROM community_profiles candidate
        INNER JOIN users account ON account.id = candidate.user_id
        LEFT JOIN community_connections connection
          ON (
            connection.profile_one_id = LEAST(${profile.id}, candidate.id)
            AND connection.profile_two_id = GREATEST(${profile.id}, candidate.id)
          )
        WHERE candidate.id <> ${profile.id}
          AND candidate.gender = ${profile.gender}
          AND candidate.allow_connection_requests = true
          AND (
            (${isEmail} = true AND candidate.discoverable_by_email = true
              AND LOWER(account.email) = ${query})
            OR
            (${isEmail} = false AND candidate.discoverable_by_username = true
              AND (
                LOWER(account.username) LIKE ${`${safePrefix}%`}
                OR LOWER(candidate.display_name) LIKE ${`${safePrefix}%`}
              ))
          )
          AND NOT EXISTS (
            SELECT 1 FROM community_blocks block
            WHERE (block.blocker_profile_id = ${profile.id} AND block.blocked_profile_id = candidate.id)
               OR (block.blocker_profile_id = candidate.id AND block.blocked_profile_id = ${profile.id})
          )
        ORDER BY
          CASE WHEN LOWER(account.username) = ${query} THEN 0 ELSE 1 END,
          account.username ASC
        LIMIT 20
      `);
      const people = rowsFrom(result).map((row) => ({
        id: Number(row.id),
        username: String(row.username || ""),
        displayName: String(row.display_name || row.username || "Member"),
        bio: String(row.bio || ""),
        connectionId: row.connection_id ? Number(row.connection_id) : null,
        connectionStatus: row.connection_status
          ? String(row.connection_status)
          : "none",
        requestDirection:
          Number(row.requested_by_profile_id) === profile.id
            ? "outgoing"
            : row.requested_by_profile_id
              ? "incoming"
              : null,
      }));
      res.json({ people });
    } catch (error) {
      sendUnexpectedCommunityError(res, "search people", error);
    }
  });

  app.get("/api/community/people/:profileId", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      const targetProfileId = parsePositiveId(req.params.profileId);
      if (!targetProfileId) {
        return res.status(400).json({ error: "Invalid member" });
      }
      const target = await getSameAudienceProfile(profile, targetProfileId);
      if (!target || (await hasBlockBetween(profile.id, target.id))) {
        return res.status(404).json({ error: "Member not found" });
      }
      const [account] = await db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, target.userId))
        .limit(1);
      const connection = await getConnectionByPair(profile.id, target.id);
      res.json({
        id: target.id,
        username: account?.username || "member",
        displayName: target.displayName,
        bio: target.bio,
        connectionId: connection?.id ?? null,
        connectionStatus: connection?.status ?? "none",
        requestDirection:
          connection?.requestedByProfileId === profile.id
            ? "outgoing"
            : connection
              ? "incoming"
              : null,
      });
    } catch (error) {
      sendUnexpectedCommunityError(res, "get member", error);
    }
  });

  app.get("/api/community/connections", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      const result = await db.execute(sql`
        SELECT
          connection.id,
          connection.status,
          connection.requested_by_profile_id,
          connection.created_at,
          other.id AS profile_id,
          other.display_name,
          other.bio,
          account.username
        FROM community_connections connection
        INNER JOIN community_profiles other
          ON other.id = CASE
            WHEN connection.profile_one_id = ${profile.id} THEN connection.profile_two_id
            ELSE connection.profile_one_id
          END
        INNER JOIN users account ON account.id = other.user_id
        WHERE (${profile.id} IN (connection.profile_one_id, connection.profile_two_id))
          AND other.gender = ${profile.gender}
          AND NOT EXISTS (
            SELECT 1 FROM community_blocks block
            WHERE (block.blocker_profile_id = ${profile.id} AND block.blocked_profile_id = other.id)
               OR (block.blocker_profile_id = other.id AND block.blocked_profile_id = ${profile.id})
          )
        ORDER BY connection.updated_at DESC, connection.created_at DESC
      `);
      const connections = rowsFrom(result).map((row) => ({
        id: Number(row.id),
        status: String(row.status),
        requestDirection:
          Number(row.requested_by_profile_id) === profile.id
            ? "outgoing"
            : "incoming",
        createdAt: row.created_at,
        profile: {
          id: Number(row.profile_id),
          username: String(row.username || ""),
          displayName: String(row.display_name || row.username || "Member"),
          bio: String(row.bio || ""),
        },
      }));
      res.json({ connections });
    } catch (error) {
      sendUnexpectedCommunityError(res, "list connections", error);
    }
  });

  app.post("/api/community/connections/:profileId", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      if (!(await enforceCommunityLimit(req, res, "community:connect", 20))) {
        return;
      }
      const targetProfileId = parsePositiveId(req.params.profileId);
      const pair = targetProfileId
        ? canonicalCommunityPair(profile.id, targetProfileId)
        : null;
      if (!targetProfileId || !pair) {
        return res.status(400).json({ error: "Invalid member" });
      }
      const target = await getSameAudienceProfile(profile, targetProfileId);
      if (
        !target ||
        !target.allowConnectionRequests ||
        (await hasBlockBetween(profile.id, target.id))
      ) {
        return res.status(404).json({ error: "Member not found" });
      }
      const existing = await getConnectionByPair(profile.id, target.id);
      if (existing?.status === "accepted") return res.json(existing);
      if (existing?.status === "pending") {
        if (existing.requestedByProfileId === profile.id) {
          return res.json(existing);
        }
        const [accepted] = await db
          .update(communityConnections)
          .set({ status: "accepted", updatedAt: new Date() })
          .where(eq(communityConnections.id, existing.id))
          .returning();
        return res.json(accepted);
      }
      const [connection] = await db
        .insert(communityConnections)
        .values({
          profileOneId: pair[0],
          profileTwoId: pair[1],
          requestedByProfileId: profile.id,
          status: "pending",
        })
        .onConflictDoNothing({
          target: [
            communityConnections.profileOneId,
            communityConnections.profileTwoId,
          ],
        })
        .returning();
      res
        .status(connection ? 201 : 200)
        .json(connection ?? (await getConnectionByPair(profile.id, target.id)));
    } catch (error) {
      sendUnexpectedCommunityError(res, "request connection", error);
    }
  });

  app.patch("/api/community/connections/:connectionId", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      const connectionId = parsePositiveId(req.params.connectionId);
      const action = communityConnectionActionSchema.safeParse(req.body);
      if (!connectionId || !action.success) {
        return res.status(400).json({ error: "Invalid connection action" });
      }
      const [connection] = await db
        .select()
        .from(communityConnections)
        .where(
          and(
            eq(communityConnections.id, connectionId),
            or(
              eq(communityConnections.profileOneId, profile.id),
              eq(communityConnections.profileTwoId, profile.id),
            ),
          ),
        )
        .limit(1);
      if (!connection || connection.status !== "pending") {
        return res.status(404).json({ error: "Connection request not found" });
      }
      if (connection.requestedByProfileId === profile.id) {
        return res.status(403).json({
          error: "not_request_recipient",
          message: "Only the recipient can respond to this request.",
        });
      }
      const otherProfileId =
        connection.profileOneId === profile.id
          ? connection.profileTwoId
          : connection.profileOneId;
      const target = await getSameAudienceProfile(profile, otherProfileId);
      if (!target || (await hasBlockBetween(profile.id, target.id))) {
        return res.status(404).json({ error: "Connection request not found" });
      }
      if (action.data.action === "decline") {
        await db
          .delete(communityConnections)
          .where(eq(communityConnections.id, connection.id));
        return res.json({ success: true });
      }
      const [accepted] = await db
        .update(communityConnections)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(eq(communityConnections.id, connection.id))
        .returning();
      res.json(accepted);
    } catch (error) {
      sendUnexpectedCommunityError(res, "respond to connection", error);
    }
  });

  app.delete("/api/community/connections/:connectionId", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      const connectionId = parsePositiveId(req.params.connectionId);
      if (!connectionId) {
        return res.status(400).json({ error: "Invalid connection" });
      }
      await db
        .delete(communityConnections)
        .where(
          and(
            eq(communityConnections.id, connectionId),
            or(
              eq(communityConnections.profileOneId, profile.id),
              eq(communityConnections.profileTwoId, profile.id),
            ),
          ),
        );
      res.json({ success: true });
    } catch (error) {
      sendUnexpectedCommunityError(res, "remove connection", error);
    }
  });

  app.post("/api/community/blocks/:profileId", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      const targetProfileId = parsePositiveId(req.params.profileId);
      const target = targetProfileId
        ? await getSameAudienceProfile(profile, targetProfileId)
        : null;
      if (!target || target.id === profile.id) {
        return res.status(404).json({ error: "Member not found" });
      }
      await db
        .insert(communityBlocks)
        .values({ blockerProfileId: profile.id, blockedProfileId: target.id })
        .onConflictDoNothing({
          target: [
            communityBlocks.blockerProfileId,
            communityBlocks.blockedProfileId,
          ],
        });
      const pair = canonicalCommunityPair(profile.id, target.id);
      if (pair) {
        await db
          .delete(communityConnections)
          .where(
            and(
              eq(communityConnections.profileOneId, pair[0]),
              eq(communityConnections.profileTwoId, pair[1]),
            ),
          );
      }
      res.json({ success: true });
    } catch (error) {
      sendUnexpectedCommunityError(res, "block member", error);
    }
  });

  app.get("/api/community/blocks", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      const result = await db.execute(sql`
        SELECT
          blocked.id AS profile_id,
          blocked.display_name,
          account.username,
          block.created_at
        FROM community_blocks block
        INNER JOIN community_profiles blocked
          ON blocked.id = block.blocked_profile_id
        INNER JOIN users account
          ON account.id = blocked.user_id
        WHERE block.blocker_profile_id = ${profile.id}
          AND blocked.gender = ${profile.gender}
        ORDER BY block.created_at DESC
      `);
      const blocked = rowsFrom(result).map((row) => ({
        id: Number(row.profile_id),
        username: String(row.username || "member"),
        displayName: String(row.display_name || row.username || "Member"),
        blockedAt: String(row.created_at || ""),
      }));
      res.json({ blocked });
    } catch (error) {
      sendUnexpectedCommunityError(res, "list blocked members", error);
    }
  });

  app.delete("/api/community/blocks/:profileId", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      const targetProfileId = parsePositiveId(req.params.profileId);
      if (!targetProfileId) {
        return res.status(400).json({ error: "Invalid member" });
      }
      await db
        .delete(communityBlocks)
        .where(
          and(
            eq(communityBlocks.blockerProfileId, profile.id),
            eq(communityBlocks.blockedProfileId, targetProfileId),
          ),
        );
      res.json({ success: true });
    } catch (error) {
      sendUnexpectedCommunityError(res, "unblock member", error);
    }
  });

  app.get("/api/community/conversations", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      const result = await db.execute(sql`
        SELECT
          conversation.id,
          conversation.last_message_at,
          other.id AS profile_id,
          other.display_name,
          account.username,
          latest.content AS last_message,
          latest.has_media AS last_message_has_media,
          latest.created_at AS last_message_created_at,
          COALESCE(unread.unread_count, 0)::int AS unread_count
        FROM community_conversations conversation
        INNER JOIN community_profiles other
          ON other.id = CASE
            WHEN conversation.profile_one_id = ${profile.id} THEN conversation.profile_two_id
            ELSE conversation.profile_one_id
          END
        INNER JOIN users account ON account.id = other.user_id
        LEFT JOIN LATERAL (
          SELECT
            message.content,
            message.created_at,
            EXISTS (
              SELECT 1 FROM community_direct_message_media media
              WHERE media.message_id = message.id
            ) AS has_media
          FROM community_direct_messages message
          WHERE message.conversation_id = conversation.id
          ORDER BY message.id DESC
          LIMIT 1
        ) latest ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS unread_count
          FROM community_direct_messages message
          WHERE message.conversation_id = conversation.id
            AND message.sender_profile_id <> ${profile.id}
            AND message.read_at IS NULL
        ) unread ON true
        WHERE (${profile.id} IN (conversation.profile_one_id, conversation.profile_two_id))
          AND conversation.audience = ${profile.gender}
          AND other.gender = ${profile.gender}
          AND EXISTS (
            SELECT 1 FROM community_connections connection
            WHERE connection.profile_one_id = conversation.profile_one_id
              AND connection.profile_two_id = conversation.profile_two_id
              AND connection.status = 'accepted'
          )
          AND NOT EXISTS (
            SELECT 1 FROM community_blocks block
            WHERE (block.blocker_profile_id = ${profile.id} AND block.blocked_profile_id = other.id)
               OR (block.blocker_profile_id = other.id AND block.blocked_profile_id = ${profile.id})
          )
        ORDER BY conversation.last_message_at DESC
        LIMIT 100
      `);
      res.json({
        conversations: rowsFrom(result).map((row) => ({
          id: Number(row.id),
          lastMessageAt: row.last_message_at,
          lastMessage: row.last_message
            ? String(row.last_message)
            : row.last_message_has_media
              ? "Photo"
              : "",
          lastMessageCreatedAt: row.last_message_created_at,
          unreadCount: Number(row.unread_count || 0),
          profile: {
            id: Number(row.profile_id),
            username: String(row.username || ""),
            displayName: String(row.display_name || row.username || "Member"),
          },
        })),
      });
    } catch (error) {
      sendUnexpectedCommunityError(res, "list conversations", error);
    }
  });

  app.post("/api/community/conversations", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      const targetProfileId = parsePositiveId(req.body?.profileId);
      const pair = targetProfileId
        ? canonicalCommunityPair(profile.id, targetProfileId)
        : null;
      const target = targetProfileId
        ? await getSameAudienceProfile(profile, targetProfileId)
        : null;
      if (!pair || !target || (await hasBlockBetween(profile.id, target.id))) {
        return res.status(404).json({ error: "Member not found" });
      }
      const connection = await getConnectionByPair(profile.id, target.id);
      if (connection?.status !== "accepted") {
        return res.status(403).json({
          error: "connection_required",
          message: "Connect with this member before starting a conversation.",
        });
      }
      const [created] = await db
        .insert(communityConversations)
        .values({
          profileOneId: pair[0],
          profileTwoId: pair[1],
          audience: profile.gender,
        })
        .onConflictDoNothing({
          target: [
            communityConversations.profileOneId,
            communityConversations.profileTwoId,
          ],
        })
        .returning();
      if (created) return res.status(201).json(created);
      const [existing] = await db
        .select()
        .from(communityConversations)
        .where(
          and(
            eq(communityConversations.profileOneId, pair[0]),
            eq(communityConversations.profileTwoId, pair[1]),
            eq(communityConversations.audience, profile.gender),
          ),
        )
        .limit(1);
      res.json(existing);
    } catch (error) {
      sendUnexpectedCommunityError(res, "create conversation", error);
    }
  });

  app.get(
    "/api/community/conversations/:conversationId/messages",
    async (req, res) => {
      try {
        const profile = await requireOwnCommunityProfile(req, res);
        if (!profile) return;
        const conversationId = parsePositiveId(req.params.conversationId);
        if (!conversationId) {
          return res.status(400).json({ error: "Invalid conversation" });
        }
        const access = await requireConversation(profile, conversationId);
        if (!access) {
          return res.status(404).json({ error: "Conversation not found" });
        }
        const beforeId = parsePositiveId(req.query.before);
        const conditions = [
          eq(communityDirectMessages.conversationId, conversationId),
        ];
        if (beforeId) conditions.push(lt(communityDirectMessages.id, beforeId));
        const messages = await db
          .select()
          .from(communityDirectMessages)
          .where(and(...conditions))
          .orderBy(desc(communityDirectMessages.id))
          .limit(50);
        const mediaRows = messages.length
          ? await db
              .select({
                id: communityDirectMessageMedia.id,
                messageId: communityDirectMessageMedia.messageId,
                mimeType: communityDirectMessageMedia.mimeType,
                byteSize: communityDirectMessageMedia.byteSize,
                width: communityDirectMessageMedia.width,
                height: communityDirectMessageMedia.height,
                altText: communityDirectMessageMedia.altText,
              })
              .from(communityDirectMessageMedia)
              .where(
                inArray(
                  communityDirectMessageMedia.messageId,
                  messages.map((message) => message.id),
                ),
              )
          : [];
        const mediaByMessage = new Map(
          mediaRows.map((media) => [
            media.messageId,
            messageMediaSummary(media),
          ]),
        );
        res.json({
          messages: messages.reverse().map((message) => ({
            ...message,
            media: mediaByMessage.get(message.id) ?? null,
          })),
          nextCursor: messages[0]?.id ?? null,
        });
      } catch (error) {
        sendUnexpectedCommunityError(res, "load messages", error);
      }
    },
  );

  app.get("/api/community/messages/:messageId/media", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      if (!(await enforceCommunityLimit(req, res, "community:media", 120))) {
        return;
      }
      const messageId = parsePositiveId(req.params.messageId);
      if (!messageId) {
        return res.status(400).json({ error: "Invalid message media" });
      }
      const [message] = await db
        .select({ conversationId: communityDirectMessages.conversationId })
        .from(communityDirectMessages)
        .where(eq(communityDirectMessages.id, messageId))
        .limit(1);
      if (!message) {
        return res.status(404).json({ error: "Message media not found" });
      }
      const access = await requireConversation(profile, message.conversationId);
      if (!access) {
        return res.status(404).json({ error: "Message media not found" });
      }
      const [media] = await db
        .select()
        .from(communityDirectMessageMedia)
        .where(eq(communityDirectMessageMedia.messageId, messageId))
        .limit(1);
      if (!media) {
        return res.status(404).json({ error: "Message media not found" });
      }
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Content-Type", media.mimeType);
      res.setHeader("Content-Length", String(media.byteSize));
      res.send(Buffer.from(media.base64Data, "base64"));
    } catch (error) {
      sendUnexpectedCommunityError(res, "load message media", error);
    }
  });

  app.post(
    "/api/community/conversations/:conversationId/messages",
    async (req, res) => {
      try {
        const profile = await requireOwnCommunityProfile(req, res);
        if (!profile) return;
        if (!(await enforceCommunityLimit(req, res, "community:message", 60))) {
          return;
        }
        const conversationId = parsePositiveId(req.params.conversationId);
        const input = communityDirectMessageInputSchema.safeParse(req.body);
        if (!conversationId || !input.success) {
          return res.status(400).json({
            error: "invalid_message",
            message: "Write a message and try again.",
          });
        }
        const access = await requireConversation(profile, conversationId);
        if (!access) {
          return res.status(404).json({ error: "Conversation not found" });
        }
        const connection = await getConnectionByPair(
          profile.id,
          access.otherProfileId,
        );
        if (connection?.status !== "accepted") {
          return res.status(403).json({
            error: "connection_required",
            message: "This connection is no longer active.",
          });
        }
        const normalizedImage = normalizeCommunityImage(input.data.image);
        if (input.data.image && !normalizedImage) {
          return res.status(400).json({
            error: "invalid_message_image",
            message: "Choose a JPEG image smaller than 768 KB.",
          });
        }
        const [previous] = await db
          .select()
          .from(communityDirectMessages)
          .where(
            and(
              eq(communityDirectMessages.senderProfileId, profile.id),
              eq(
                communityDirectMessages.clientMessageId,
                input.data.clientMessageId,
              ),
            ),
          )
          .limit(1);
        if (previous) {
          const [previousMedia] = await db
            .select({
              id: communityDirectMessageMedia.id,
              mimeType: communityDirectMessageMedia.mimeType,
              byteSize: communityDirectMessageMedia.byteSize,
              width: communityDirectMessageMedia.width,
              height: communityDirectMessageMedia.height,
              altText: communityDirectMessageMedia.altText,
              sha256: communityDirectMessageMedia.sha256,
            })
            .from(communityDirectMessageMedia)
            .where(eq(communityDirectMessageMedia.messageId, previous.id))
            .limit(1);
          if (
            previous.conversationId !== conversationId ||
            previous.content !== input.data.content ||
            (previousMedia?.sha256 ?? null) !==
              (normalizedImage?.sha256 ?? null)
          ) {
            return res.status(409).json({
              error: "client_message_conflict",
              message: "This retry does not match the original message.",
            });
          }
          return res.json({
            ...previous,
            media: previousMedia ? messageMediaSummary(previousMedia) : null,
          });
        }
        const message = await db.transaction(async (tx) => {
          const [inserted] = await tx
            .insert(communityDirectMessages)
            .values({
              conversationId,
              senderProfileId: profile.id,
              clientMessageId: input.data.clientMessageId,
              content: input.data.content,
            })
            .onConflictDoNothing({
              target: [
                communityDirectMessages.senderProfileId,
                communityDirectMessages.clientMessageId,
              ],
            })
            .returning();
          if (!inserted) return null;
          if (normalizedImage) {
            await tx.insert(communityDirectMessageMedia).values({
              messageId: inserted.id,
              ownerProfileId: profile.id,
              mimeType: normalizedImage.mimeType,
              byteSize: normalizedImage.byteSize,
              width: normalizedImage.width,
              height: normalizedImage.height,
              altText: normalizedImage.altText,
              sha256: normalizedImage.sha256,
              base64Data: normalizedImage.base64Data,
            });
          }
          await tx
            .update(communityConversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(communityConversations.id, conversationId));
          return inserted;
        });
        if (!message) {
          const [concurrent] = await db
            .select()
            .from(communityDirectMessages)
            .where(
              and(
                eq(communityDirectMessages.senderProfileId, profile.id),
                eq(
                  communityDirectMessages.clientMessageId,
                  input.data.clientMessageId,
                ),
              ),
            )
            .limit(1);
          const [concurrentMedia] = concurrent
            ? await db
                .select({
                  id: communityDirectMessageMedia.id,
                  mimeType: communityDirectMessageMedia.mimeType,
                  byteSize: communityDirectMessageMedia.byteSize,
                  width: communityDirectMessageMedia.width,
                  height: communityDirectMessageMedia.height,
                  altText: communityDirectMessageMedia.altText,
                  sha256: communityDirectMessageMedia.sha256,
                })
                .from(communityDirectMessageMedia)
                .where(eq(communityDirectMessageMedia.messageId, concurrent.id))
                .limit(1)
            : [];
          if (
            !concurrent ||
            concurrent.conversationId !== conversationId ||
            concurrent.content !== input.data.content ||
            (concurrentMedia?.sha256 ?? null) !==
              (normalizedImage?.sha256 ?? null)
          ) {
            return res.status(409).json({
              error: "client_message_conflict",
              message: "This retry does not match the original message.",
            });
          }
          return res.json({
            ...concurrent,
            media: concurrentMedia
              ? messageMediaSummary(concurrentMedia)
              : null,
          });
        }
        const [recipient] = await db
          .select({ userId: communityProfiles.userId })
          .from(communityProfiles)
          .where(eq(communityProfiles.id, access.otherProfileId))
          .limit(1);
        if (recipient) {
          void sendUserPushNotification({
            userId: recipient.userId,
            title: "New Community message",
            body: `${profile.displayName} sent you a private message.`,
            data: {
              type: "community_message",
              route: "Community",
              conversationId,
            },
          }).catch((error) => {
            console.error("[community] message push delivery failed:", error);
          });
        }
        const [savedMedia] = normalizedImage
          ? await db
              .select({
                id: communityDirectMessageMedia.id,
                mimeType: communityDirectMessageMedia.mimeType,
                byteSize: communityDirectMessageMedia.byteSize,
                width: communityDirectMessageMedia.width,
                height: communityDirectMessageMedia.height,
                altText: communityDirectMessageMedia.altText,
              })
              .from(communityDirectMessageMedia)
              .where(eq(communityDirectMessageMedia.messageId, message.id))
              .limit(1)
          : [];
        res.status(201).json({
          ...message,
          media: savedMedia ? messageMediaSummary(savedMedia) : null,
        });
      } catch (error) {
        sendUnexpectedCommunityError(res, "send message", error);
      }
    },
  );

  app.patch(
    "/api/community/conversations/:conversationId/read",
    async (req, res) => {
      try {
        const profile = await requireOwnCommunityProfile(req, res);
        if (!profile) return;
        const conversationId = parsePositiveId(req.params.conversationId);
        if (!conversationId) {
          return res.status(400).json({ error: "Invalid conversation" });
        }
        const access = await requireConversation(profile, conversationId);
        if (!access) {
          return res.status(404).json({ error: "Conversation not found" });
        }
        await db
          .update(communityDirectMessages)
          .set({ readAt: new Date() })
          .where(
            and(
              eq(communityDirectMessages.conversationId, conversationId),
              ne(communityDirectMessages.senderProfileId, profile.id),
              isNull(communityDirectMessages.readAt),
            ),
          );
        res.json({ success: true });
      } catch (error) {
        sendUnexpectedCommunityError(res, "mark conversation read", error);
      }
    },
  );

  app.post("/api/community/reports", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      if (!(await enforceCommunityLimit(req, res, "community:report", 10))) {
        return;
      }
      const input = communityReportInputSchema.safeParse(req.body);
      if (!input.success) {
        return res.status(400).json({ error: "Invalid report" });
      }
      const targetNumericId = parsePositiveId(input.data.targetId);
      let visible = false;
      let subjectProfileId: number | null = null;
      let targetSnapshot: Record<string, unknown> = {};
      if (input.data.targetType === "profile" && targetNumericId) {
        const target = await getSameAudienceProfile(profile, targetNumericId);
        visible = Boolean(target && target.id !== profile.id);
        if (target) {
          subjectProfileId = target.id;
          targetSnapshot = {
            profileId: target.id,
            displayName: target.displayName,
            bio: target.bio,
          };
        }
      } else if (input.data.targetType === "post" && targetNumericId) {
        const [target] = await db
          .select({
            id: communityPosts.id,
            profileId: communityPosts.profileId,
            roomId: communityPosts.roomId,
            content: communityPosts.content,
            createdAt: communityPosts.createdAt,
          })
          .from(communityPosts)
          .where(
            and(
              eq(communityPosts.id, targetNumericId),
              eq(communityPosts.audience, profile.gender),
            ),
          )
          .limit(1);
        visible = Boolean(target && target.profileId !== profile.id);
        if (target) {
          subjectProfileId = target.profileId;
          targetSnapshot = target;
        }
      } else if (input.data.targetType === "reply" && targetNumericId) {
        const [target] = await db
          .select({
            id: communityReplies.id,
            profileId: communityReplies.profileId,
            postId: communityReplies.postId,
            content: communityReplies.content,
            createdAt: communityReplies.createdAt,
          })
          .from(communityReplies)
          .where(
            and(
              eq(communityReplies.id, targetNumericId),
              eq(communityReplies.audience, profile.gender),
            ),
          )
          .limit(1);
        visible = Boolean(target && target.profileId !== profile.id);
        if (target) {
          subjectProfileId = target.profileId;
          targetSnapshot = target;
        }
      } else if (input.data.targetType === "message" && targetNumericId) {
        const [target] = await db
          .select({
            id: communityDirectMessages.id,
            conversationId: communityDirectMessages.conversationId,
            senderProfileId: communityDirectMessages.senderProfileId,
            content: communityDirectMessages.content,
            createdAt: communityDirectMessages.createdAt,
          })
          .from(communityDirectMessages)
          .where(eq(communityDirectMessages.id, targetNumericId))
          .limit(1);
        visible = Boolean(
          target &&
            target.senderProfileId !== profile.id &&
            (await requireConversation(profile, target.conversationId)),
        );
        if (target) {
          subjectProfileId = target.senderProfileId;
          targetSnapshot = target;
        }
      }
      if (!visible) {
        return res.status(404).json({ error: "Report target not found" });
      }
      const [report] = await db
        .insert(communityReports)
        .values({
          reporterProfileId: profile.id,
          subjectProfileId,
          targetSnapshot,
          ...input.data,
        })
        .returning({
          id: communityReports.id,
          status: communityReports.status,
        });
      res.status(201).json(report);
    } catch (error) {
      sendUnexpectedCommunityError(res, "submit report", error);
    }
  });

  app.get("/api/admin/community/reports", async (req, res) => {
    try {
      const admin = await requireCommunityAdmin(req, res);
      if (!admin) return;
      const requestedStatus =
        typeof req.query.status === "string" ? req.query.status : "open";
      const allowedStatuses = new Set([
        "open",
        "reviewing",
        "resolved",
        "dismissed",
      ]);
      if (!allowedStatuses.has(requestedStatus)) {
        return res.status(400).json({ error: "Invalid report status" });
      }
      const reports = await db
        .select()
        .from(communityReports)
        .where(eq(communityReports.status, requestedStatus))
        .orderBy(desc(communityReports.createdAt))
        .limit(200);
      res.json({ reports });
    } catch (error) {
      sendUnexpectedCommunityError(res, "load moderation queue", error);
    }
  });

  app.patch("/api/admin/community/reports/:reportId", async (req, res) => {
    try {
      const admin = await requireCommunityAdmin(req, res);
      if (!admin) return;
      const reportId = parsePositiveId(req.params.reportId);
      const input = communityReportModerationSchema.safeParse(req.body);
      if (!reportId || !input.success) {
        return res.status(400).json({ error: "Invalid moderation action" });
      }
      const [report] = await db
        .select()
        .from(communityReports)
        .where(eq(communityReports.id, reportId))
        .limit(1);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      const targetId = parsePositiveId(report.targetId);
      if (input.data.removeTarget) {
        if (!targetId || report.targetType === "profile") {
          return res.status(400).json({
            error: "Target cannot be removed with this action",
          });
        }
        if (report.targetType === "post") {
          await db
            .delete(communityPosts)
            .where(eq(communityPosts.id, targetId));
        } else if (report.targetType === "reply") {
          await db
            .delete(communityReplies)
            .where(eq(communityReplies.id, targetId));
        } else if (report.targetType === "message") {
          await db
            .delete(communityDirectMessages)
            .where(eq(communityDirectMessages.id, targetId));
        }
      }
      const resolved = ["resolved", "dismissed"].includes(input.data.status);
      const [updated] = await db
        .update(communityReports)
        .set({
          status: input.data.status,
          moderatedByUserId: admin.id,
          resolvedAt: resolved ? new Date() : null,
        })
        .where(eq(communityReports.id, reportId))
        .returning();
      res.json(updated);
    } catch (error) {
      sendUnexpectedCommunityError(res, "moderate report", error);
    }
  });
}
