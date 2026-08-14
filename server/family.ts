import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  users,
  familyGroups,
  familyMembers,
  familyInvitations,
  familyAuditEvents,
  familyMessages,
  familyProgressEvents,
} from "@shared/schema";
import { eq, or, ilike, and, ne, desc, gte, sql } from "drizzle-orm";
import crypto from "crypto";
import {
  durableRateLimiter,
  getAIRateLimitSubjectFromRequest,
} from "./ai/rateLimit";
import { requireAuthenticatedUser } from "./requestAuth";
import { resolvePlanTierForRequest } from "./subscriptions";
import { sendUserPushNotification } from "./notifications";

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function parsePositiveInt(value: unknown): number | null {
  const id = Number.parseInt(String(value), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function cleanFamilyGroupName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().replace(/\s+/g, " ").slice(0, 80);
  return clean || null;
}

function cleanFamilyMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().replace(/\s+/g, " ").slice(0, 1200);
  return clean || null;
}

function cleanFamilyMessageKind(value: unknown): string {
  if (
    value === "dua" ||
    value === "travel_update" ||
    value === "travel_arrival"
  ) {
    return value;
  }
  return "message";
}

function cleanFamilyMessageMetadata(value: unknown): Record<string, unknown> {
  const metadata =
    value && typeof value === "object" && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : {};
  const clientMessageId =
    typeof metadata.clientMessageId === "string"
      ? metadata.clientMessageId.trim().slice(0, 80)
      : "";

  if (clientMessageId) {
    metadata.clientMessageId = clientMessageId;
  } else {
    delete metadata.clientMessageId;
  }

  return metadata;
}

function familyMessageRowToResponse(
  message: {
    id: number;
    groupId: number;
    senderId: string;
    kind: string;
    content: string;
    metadata: unknown;
    createdAt: Date;
  },
  user: { displayName: string | null; username: string },
) {
  return {
    id: message.id,
    groupId: message.groupId,
    senderId: message.senderId,
    senderName: user.displayName,
    senderUsername: user.username,
    kind: message.kind,
    content: message.content,
    metadata: message.metadata,
    createdAt: message.createdAt,
  };
}

function familyMessageSqlRowToResponse(
  row: Record<string, unknown>,
  user: { displayName: string | null; username: string },
) {
  return familyMessageRowToResponse(
    {
      id: Number(row.id),
      groupId: Number(row.group_id),
      senderId: String(row.sender_id),
      kind: String(row.kind || "message"),
      content: String(row.content || ""),
      metadata:
        row.metadata && typeof row.metadata === "object" ? row.metadata : {},
      createdAt:
        row.created_at instanceof Date
          ? row.created_at
          : new Date(String(row.created_at || Date.now())),
    },
    user,
  );
}

async function findFamilyMessageByClientMessageId(
  groupId: number,
  senderId: string,
  clientMessageId: string,
) {
  const result = await db.execute(sql`
    SELECT id, group_id, sender_id, kind, content, metadata, created_at
    FROM family_messages
    WHERE group_id = ${groupId}
      AND sender_id = ${senderId}
      AND metadata->>'clientMessageId' = ${clientMessageId}
    ORDER BY created_at DESC
    LIMIT 1
  `);
  const rows =
    (result as unknown as { rows?: Record<string, unknown>[] }).rows || [];
  return rows[0] || null;
}

async function insertFamilyMessageResilient({
  groupId,
  senderId,
  kind,
  content,
  metadata,
}: {
  groupId: number;
  senderId: string;
  kind: string;
  content: string;
  metadata: Record<string, unknown>;
}) {
  try {
    const [message] = await db
      .insert(familyMessages)
      .values({
        groupId,
        senderId,
        kind,
        content,
        metadata,
      })
      .returning();
    return message;
  } catch (error) {
    console.warn(
      "[family] Drizzle family message insert failed; retrying with raw SQL:",
      error instanceof Error ? error.message : error,
    );
    await ensureFamilyCollaborationStorage();
    const result = await db.execute(sql`
      INSERT INTO family_messages (group_id, sender_id, kind, content, metadata)
      VALUES (${groupId}, ${senderId}, ${kind}, ${content}, ${JSON.stringify(metadata)}::jsonb)
      RETURNING id, group_id, sender_id, kind, content, metadata, created_at
    `);
    const rows =
      (result as unknown as { rows?: Record<string, unknown>[] }).rows || [];
    const row = rows[0];
    if (!row) {
      throw new Error("Family message insert returned no row");
    }
    return {
      id: Number(row.id),
      groupId: Number(row.group_id),
      senderId: String(row.sender_id),
      kind: String(row.kind || "message"),
      content: String(row.content || ""),
      metadata:
        row.metadata && typeof row.metadata === "object" ? row.metadata : {},
      createdAt:
        row.created_at instanceof Date
          ? row.created_at
          : new Date(String(row.created_at || Date.now())),
    };
  }
}

const FAMILY_PROGRESS_CATEGORIES = new Set([
  "salah",
  "quran",
  "dhikr",
  "charity",
  "dua",
  "learning",
  "reflection",
  "goal",
  "travel",
]);

function cleanFamilyProgressCategory(value: unknown): string {
  if (typeof value !== "string") return "goal";
  const clean = value.trim().toLowerCase();
  return FAMILY_PROGRESS_CATEGORIES.has(clean) ? clean : "goal";
}

function cleanFamilyProgressTitle(value: unknown): string {
  if (typeof value !== "string") return "Family progress";
  return value.trim().replace(/\s+/g, " ").slice(0, 120) || "Family progress";
}

function cleanFamilyProgressUnit(value: unknown): string {
  if (typeof value !== "string") return "action";
  return value.trim().replace(/\s+/g, " ").slice(0, 32) || "action";
}

function cleanFamilyProgressValue(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? 1), 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(10000, Math.max(1, parsed));
}

let familyCollaborationStoragePromise: Promise<void> | null = null;

async function ensureFamilyCollaborationStorage(): Promise<void> {
  if (!familyCollaborationStoragePromise) {
    familyCollaborationStoragePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS family_messages (
          id serial PRIMARY KEY,
          group_id integer NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
          sender_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          kind text NOT NULL DEFAULT 'message',
          content text NOT NULL,
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.execute(sql`
        ALTER TABLE family_messages
          ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'message'
      `);
      await db.execute(sql`
        ALTER TABLE family_messages
          ADD COLUMN IF NOT EXISTS content text
      `);
      await db.execute(sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'family_messages'
              AND column_name = 'type'
          ) THEN
            UPDATE family_messages
            SET kind = type
            WHERE type IS NOT NULL AND btrim(type) <> '';
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'family_messages'
              AND column_name = 'message'
          ) THEN
            UPDATE family_messages
            SET content = message
            WHERE content IS NULL AND message IS NOT NULL;
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'family_messages'
              AND column_name = 'type'
          ) THEN
            EXECUTE 'ALTER TABLE family_messages ALTER COLUMN type DROP NOT NULL';
            EXECUTE 'ALTER TABLE family_messages ALTER COLUMN type SET DEFAULT ''message''';
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'family_messages'
              AND column_name = 'message'
          ) THEN
            EXECUTE 'ALTER TABLE family_messages ALTER COLUMN message DROP NOT NULL';
          END IF;

          -- Legacy 'sender_name'/'sender_username' columns were NOT NULL with no
          -- default. The current insert never writes them (sender identity is
          -- derived from the users table at read time), so every insert failed
          -- the not-null constraint and family messages got stuck queued. Relax
          -- them to nullable with an empty default so inserts succeed.
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'family_messages'
              AND column_name = 'sender_name'
          ) THEN
            EXECUTE 'ALTER TABLE family_messages ALTER COLUMN sender_name DROP NOT NULL';
            EXECUTE 'ALTER TABLE family_messages ALTER COLUMN sender_name SET DEFAULT ''''';
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'family_messages'
              AND column_name = 'sender_username'
          ) THEN
            EXECUTE 'ALTER TABLE family_messages ALTER COLUMN sender_username DROP NOT NULL';
            EXECUTE 'ALTER TABLE family_messages ALTER COLUMN sender_username SET DEFAULT ''''';
          END IF;
        END $$
      `);
      await db.execute(sql`
        UPDATE family_messages SET content = '' WHERE content IS NULL
      `);
      await db.execute(sql`
        ALTER TABLE family_messages
          ALTER COLUMN content SET NOT NULL
      `);
      await db.execute(sql`
        ALTER TABLE family_messages
          ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb
      `);
      await db.execute(sql`
        ALTER TABLE family_messages
          ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS family_messages_group_created_idx
          ON family_messages (group_id, created_at)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS family_messages_sender_created_idx
          ON family_messages (sender_id, created_at)
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS family_progress_events (
          id serial PRIMARY KEY,
          group_id integer NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          category text NOT NULL,
          title text NOT NULL,
          value integer NOT NULL DEFAULT 1,
          unit text NOT NULL DEFAULT 'action',
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS family_progress_events_group_created_idx
          ON family_progress_events (group_id, created_at)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS family_progress_events_user_created_idx
          ON family_progress_events (user_id, created_at)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS family_progress_events_group_category_idx
          ON family_progress_events (group_id, category)
      `);
    })().catch((error) => {
      familyCollaborationStoragePromise = null;
      throw error;
    });
  }

  await familyCollaborationStoragePromise;
}

export async function logFamilyAuditEvent({
  action,
  actorId,
  groupId,
  invitationId,
  targetUserId,
  metadata = {},
}: {
  action: string;
  actorId: string;
  groupId?: number | null;
  invitationId?: number | null;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(familyAuditEvents).values({
      action,
      actorId,
      groupId: groupId ?? null,
      invitationId: invitationId ?? null,
      targetUserId: targetUserId ?? null,
      metadata,
    });
  } catch (error) {
    console.warn(
      "[family] Audit event could not be saved; continuing user action:",
      error instanceof Error ? error.message : error,
    );
  }
}

export async function findFamilyMembership(groupId: number, userId: string) {
  const [membership] = await db
    .select()
    .from(familyMembers)
    .where(
      and(eq(familyMembers.groupId, groupId), eq(familyMembers.userId, userId)),
    )
    .limit(1);
  return membership ?? null;
}

async function ensureFamilyCreatorMembership(groupId: number, userId: string) {
  const existing = await findFamilyMembership(groupId, userId);
  if (existing) return existing;

  const [group] = await db
    .select({ id: familyGroups.id, creatorId: familyGroups.creatorId })
    .from(familyGroups)
    .where(eq(familyGroups.id, groupId))
    .limit(1);

  if (!group || group.creatorId !== userId) return null;

  try {
    const [created] = await db
      .insert(familyMembers)
      .values({
        groupId,
        userId,
        role: "creator",
      })
      .onConflictDoNothing({
        target: [familyMembers.groupId, familyMembers.userId],
      })
      .returning();

    return created ?? (await findFamilyMembership(groupId, userId));
  } catch (error) {
    console.warn(
      "[family] Creator membership self-heal used raw SQL fallback:",
      error instanceof Error ? error.message : error,
    );
    const result = await db.execute(sql`
      INSERT INTO family_members (group_id, user_id, role)
      SELECT ${groupId}, ${userId}, 'creator'
      WHERE NOT EXISTS (
        SELECT 1
        FROM family_members
        WHERE group_id = ${groupId}
          AND user_id = ${userId}
      )
      RETURNING id, group_id, user_id, role, joined_at
    `);
    const rows =
      (result as unknown as { rows?: Record<string, unknown>[] }).rows || [];
    const row = rows[0];
    if (row) {
      return {
        id: Number(row.id),
        groupId: Number(row.group_id),
        userId: String(row.user_id),
        role: String(row.role || "creator"),
        joinedAt:
          row.joined_at instanceof Date
            ? row.joined_at
            : new Date(String(row.joined_at || Date.now())),
      };
    }
    return await findFamilyMembership(groupId, userId);
  }
}

async function ensureAllCreatorMemberships(userId: string): Promise<void> {
  const ownedGroups = await db
    .select({ id: familyGroups.id })
    .from(familyGroups)
    .where(eq(familyGroups.creatorId, userId));

  await Promise.all(
    ownedGroups.map((group) => ensureFamilyCreatorMembership(group.id, userId)),
  );
}

export async function requireFamilyMembership(
  req: Request,
  res: Response,
  user: Awaited<ReturnType<typeof requireAuthenticatedUser>>,
  groupId: number,
) {
  if (!user) return null;
  if (!(await requireFamilyPremiumAccess(req, res, user))) return null;
  const existingMembership = await findFamilyMembership(groupId, user.id);
  const membership =
    existingMembership ??
    (await ensureFamilyCreatorMembership(groupId, user.id));
  if (!membership) {
    res.status(403).json({ error: "Not a member of this family group" });
    return null;
  }
  return membership;
}

async function enforceFamilySearchRateLimit(
  req: Request,
  res: Response,
): Promise<boolean> {
  const decision = await durableRateLimiter.check(
    getAIRateLimitSubjectFromRequest(req),
    {
      namespace: "family:user-search",
      windowMs: 60_000,
      maxRequests: 20,
    },
  );
  res.setHeader("X-RateLimit-Limit", String(decision.limit));
  res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
  if (decision.allowed) return true;
  res.setHeader("Retry-After", String(Math.ceil(decision.retryAfterMs / 1000)));
  res.status(429).json({ error: "Too many family member searches." });
  return false;
}

export async function enforceFamilyWriteRateLimit(
  req: Request,
  res: Response,
  namespace: string,
): Promise<boolean> {
  let decision;
  try {
    decision = await durableRateLimiter.check(
      getAIRateLimitSubjectFromRequest(req),
      {
        namespace,
        windowMs: 60_000,
        maxRequests: 30,
      },
    );
  } catch (error) {
    console.warn(
      "[family] Family write rate limit unavailable; allowing family action:",
      error instanceof Error ? error.message : error,
    );
    res.setHeader("X-RateLimit-Limit", "30");
    res.setHeader("X-RateLimit-Remaining", "unknown");
    return true;
  }
  res.setHeader("X-RateLimit-Limit", String(decision.limit));
  res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
  if (decision.allowed) return true;
  res.setHeader("Retry-After", String(Math.ceil(decision.retryAfterMs / 1000)));
  res.status(429).json({ error: "Too many family updates. Please slow down." });
  return false;
}

export async function requireFamilyPremiumAccess(
  req: Request,
  res: Response,
  user: Awaited<ReturnType<typeof requireAuthenticatedUser>>,
): Promise<boolean> {
  if (!user) return false;
  const tier = await resolvePlanTierForRequest(req, user);
  if (tier === "premium" || tier === "scholar") return true;

  res.status(402).json({
    upgradeRequired: true,
    feature: "familySharing",
    requiredTier: "premium",
    message: "Family Circle tools require Premium or Scholar.",
  });
  return false;
}

export function registerFamilyRoutes(app: Express): void {
  app.get("/api/users/search", async (req: Request, res: Response) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await requireFamilyPremiumAccess(req, res, user))) return;
      if (!(await enforceFamilySearchRateLimit(req, res))) return;

      const { q } = req.query;
      if (!q || typeof q !== "string" || q.trim().length < 3) {
        return res.json([]);
      }

      const query = q.trim().slice(0, 80).toLowerCase();
      const isEmailLookup = query.includes("@");
      const safePrefix = query.replace(/[%_\\]/g, "");
      const lookupCondition = isEmailLookup
        ? sql`LOWER(${users.email}) = ${query}`
        : or(
            ilike(users.username, `${safePrefix}%`),
            ilike(users.displayName, `${safePrefix}%`),
          );
      const results = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
        })
        .from(users)
        .where(and(ne(users.id, user.id), lookupCondition))
        .limit(10);

      return res.json(
        results.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          email: u.email ? u.email.replace(/(.{2})(.*)(@.*)/, "$1***$3") : null,
          avatar: (u.displayName || u.username || "U")[0].toUpperCase(),
        })),
      );
    } catch (error) {
      console.error("User search error:", error);
      return res.status(500).json({ error: "Search failed" });
    }
  });

  app.post("/api/family/groups", async (req: Request, res: Response) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await requireFamilyPremiumAccess(req, res, user))) return;

      const name = cleanFamilyGroupName(req.body?.name);
      if (!name) {
        return res.status(400).json({ error: "Group name is required" });
      }

      const inviteCode = generateInviteCode();

      const [group] = await db
        .insert(familyGroups)
        .values({
          name,
          creatorId: user.id,
          inviteCode,
        })
        .returning();

      await db.insert(familyMembers).values({
        groupId: group.id,
        userId: user.id,
        role: "creator",
      });
      await logFamilyAuditEvent({
        action: "group_created",
        actorId: user.id,
        groupId: group.id,
        metadata: { name },
      });

      return res.json(group);
    } catch (error) {
      console.error("Create group error:", error);
      return res.status(500).json({ error: "Failed to create group" });
    }
  });

  app.get("/api/family/groups", async (req: Request, res: Response) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await requireFamilyPremiumAccess(req, res, user))) return;
      await ensureAllCreatorMemberships(user.id);

      const memberRecords = await db
        .select({ groupId: familyMembers.groupId })
        .from(familyMembers)
        .where(eq(familyMembers.userId, user.id));

      if (memberRecords.length === 0) {
        return res.json([]);
      }

      const groups = [];
      for (const record of memberRecords) {
        const [group] = await db
          .select()
          .from(familyGroups)
          .where(eq(familyGroups.id, record.groupId))
          .limit(1);

        if (group) {
          const members = await db
            .select({
              id: familyMembers.id,
              userId: familyMembers.userId,
              role: familyMembers.role,
              joinedAt: familyMembers.joinedAt,
              displayName: users.displayName,
              username: users.username,
            })
            .from(familyMembers)
            .innerJoin(users, eq(familyMembers.userId, users.id))
            .where(eq(familyMembers.groupId, group.id));

          groups.push({ ...group, members });
        }
      }

      return res.json(groups);
    } catch (error) {
      console.error("Get groups error:", error);
      return res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  app.put("/api/family/groups/:id", async (req: Request, res: Response) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await requireFamilyPremiumAccess(req, res, user))) return;

      const groupId = parsePositiveInt(req.params.id);
      if (!groupId) return res.status(400).json({ error: "Invalid group id" });
      const name = cleanFamilyGroupName(req.body?.name);
      if (!name) {
        return res.status(400).json({ error: "Group name is required" });
      }

      const [group] = await db
        .select()
        .from(familyGroups)
        .where(eq(familyGroups.id, groupId))
        .limit(1);

      if (!group || group.creatorId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const [updated] = await db
        .update(familyGroups)
        .set({ name })
        .where(eq(familyGroups.id, groupId))
        .returning();
      await logFamilyAuditEvent({
        action: "group_updated",
        actorId: user.id,
        groupId,
        metadata: { previousName: group.name, name },
      });

      return res.json(updated);
    } catch (error) {
      console.error("Update group error:", error);
      return res.status(500).json({ error: "Failed to update group" });
    }
  });

  app.post(
    "/api/family/groups/:id/invite",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        if (!(await requireFamilyPremiumAccess(req, res, user))) return;

        const groupId = parsePositiveInt(req.params.id);
        if (!groupId) {
          return res.status(400).json({ error: "Invalid group id" });
        }
        const inviteeId =
          typeof req.body?.inviteeId === "string"
            ? req.body.inviteeId.trim()
            : "";
        const inviteeEmail =
          typeof req.body?.inviteeEmail === "string"
            ? req.body.inviteeEmail.trim()
            : "";

        if (!inviteeId && inviteeEmail) {
          return res.status(400).json({
            error: "Invite an existing NurAI user from search results.",
          });
        }
        if (!inviteeId) {
          return res.status(400).json({ error: "inviteeId is required" });
        }
        if (inviteeId === user.id) {
          return res.status(400).json({ error: "Cannot invite yourself" });
        }

        const [membership] = await db
          .select()
          .from(familyMembers)
          .where(
            and(
              eq(familyMembers.groupId, groupId),
              eq(familyMembers.userId, user.id),
            ),
          )
          .limit(1);

        if (!membership) {
          return res.status(403).json({ error: "Not a member of this group" });
        }

        const [invitee] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, inviteeId))
          .limit(1);
        if (!invitee) {
          return res.status(404).json({ error: "User not found" });
        }

        const [existingMember] = await db
          .select()
          .from(familyMembers)
          .where(
            and(
              eq(familyMembers.groupId, groupId),
              eq(familyMembers.userId, inviteeId),
            ),
          )
          .limit(1);

        if (existingMember) {
          return res.status(409).json({ error: "User is already a member" });
        }

        const [existingInvite] = await db
          .select()
          .from(familyInvitations)
          .where(
            and(
              eq(familyInvitations.groupId, groupId),
              eq(familyInvitations.inviteeId, inviteeId),
              eq(familyInvitations.status, "pending"),
            ),
          )
          .limit(1);

        if (existingInvite) {
          return res.status(409).json({ error: "Invitation already sent" });
        }

        const [invitation] = await db
          .insert(familyInvitations)
          .values({
            groupId,
            inviterId: user.id,
            inviteeId,
            inviteeEmail: null,
            status: "pending",
          })
          .returning();
        await logFamilyAuditEvent({
          action: "invitation_created",
          actorId: user.id,
          groupId,
          invitationId: invitation.id,
          targetUserId: inviteeId,
        });

        return res.json(invitation);
      } catch (error) {
        console.error("Invite error:", error);
        return res.status(500).json({ error: "Failed to send invitation" });
      }
    },
  );

  app.delete(
    "/api/family/groups/:groupId/members/:userId",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        if (!(await requireFamilyPremiumAccess(req, res, user))) return;

        const groupId = parsePositiveInt(req.params.groupId);
        if (!groupId) {
          return res.status(400).json({ error: "Invalid group id" });
        }
        const targetUserId = String(req.params.userId || "").trim();
        if (!targetUserId) {
          return res.status(400).json({ error: "Invalid member id" });
        }

        const [group] = await db
          .select()
          .from(familyGroups)
          .where(eq(familyGroups.id, groupId))
          .limit(1);

        if (!group) {
          return res.status(404).json({ error: "Group not found" });
        }

        if (group.creatorId !== user.id && targetUserId !== user.id) {
          return res.status(403).json({ error: "Not authorized" });
        }

        if (targetUserId === group.creatorId) {
          return res
            .status(400)
            .json({ error: "Cannot remove the group creator" });
        }

        const [targetMembership] = await db
          .select()
          .from(familyMembers)
          .where(
            and(
              eq(familyMembers.groupId, groupId),
              eq(familyMembers.userId, targetUserId),
            ),
          )
          .limit(1);

        if (!targetMembership) {
          return res.status(404).json({ error: "Member not found" });
        }

        const [requesterMembership] = await db
          .select()
          .from(familyMembers)
          .where(
            and(
              eq(familyMembers.groupId, groupId),
              eq(familyMembers.userId, user.id),
            ),
          )
          .limit(1);

        if (group.creatorId !== user.id && !requesterMembership) {
          return res.status(403).json({ error: "Not authorized" });
        }

        await db
          .delete(familyMembers)
          .where(
            and(
              eq(familyMembers.groupId, groupId),
              eq(familyMembers.userId, targetUserId),
            ),
          );
        await logFamilyAuditEvent({
          action: "member_removed",
          actorId: user.id,
          groupId,
          targetUserId,
          metadata: { requesterRole: requesterMembership?.role ?? "creator" },
        });

        return res.json({ success: true });
      } catch (error) {
        console.error("Remove member error:", error);
        return res.status(500).json({ error: "Failed to remove member" });
      }
    },
  );

  app.get(
    "/api/family/groups/:groupId/messages",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        const groupId = parsePositiveInt(req.params.groupId);
        if (!groupId) {
          return res.status(400).json({ error: "Invalid group id" });
        }
        if (!(await requireFamilyMembership(req, res, user, groupId))) return;
        await ensureFamilyCollaborationStorage();

        const rawLimit = Number.parseInt(String(req.query.limit ?? 50), 10);
        const limit = Math.min(100, Math.max(1, rawLimit || 50));
        const rows = await db
          .select({
            id: familyMessages.id,
            groupId: familyMessages.groupId,
            senderId: familyMessages.senderId,
            senderName: users.displayName,
            senderUsername: users.username,
            kind: familyMessages.kind,
            content: familyMessages.content,
            metadata: familyMessages.metadata,
            createdAt: familyMessages.createdAt,
          })
          .from(familyMessages)
          .innerJoin(users, eq(familyMessages.senderId, users.id))
          .where(eq(familyMessages.groupId, groupId))
          .orderBy(desc(familyMessages.createdAt))
          .limit(limit);

        return res.json(rows.reverse());
      } catch (error) {
        console.error("Get family messages error:", error);
        return res.status(500).json({ error: "Failed to fetch messages" });
      }
    },
  );

  app.post(
    "/api/family/groups/:groupId/messages",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        const groupId = parsePositiveInt(req.params.groupId);
        if (!groupId) {
          return res.status(400).json({ error: "Invalid group id" });
        }
        if (!(await requireFamilyMembership(req, res, user, groupId))) return;
        if (!(await enforceFamilyWriteRateLimit(req, res, "family:messages"))) {
          return;
        }
        await ensureFamilyCollaborationStorage();

        const content = cleanFamilyMessage(req.body?.content);
        if (!content) {
          return res.status(400).json({ error: "Message is required" });
        }
        const metadata = cleanFamilyMessageMetadata(req.body?.metadata);
        const clientMessageId =
          typeof metadata.clientMessageId === "string"
            ? metadata.clientMessageId
            : "";

        if (clientMessageId) {
          const existingMessage = await findFamilyMessageByClientMessageId(
            groupId,
            user.id,
            clientMessageId,
          );

          if (existingMessage) {
            return res.json(
              familyMessageSqlRowToResponse(existingMessage, user),
            );
          }
        }

        const messageKind = cleanFamilyMessageKind(req.body?.kind);
        const message = await insertFamilyMessageResilient({
          groupId,
          senderId: user.id,
          kind: messageKind,
          content,
          metadata,
        });

        await logFamilyAuditEvent({
          action: "message_sent",
          actorId: user.id,
          groupId,
          metadata: { kind: messageKind },
        });

        void (async () => {
          const recipients = await db
            .select({ userId: familyMembers.userId })
            .from(familyMembers)
            .where(
              and(
                eq(familyMembers.groupId, groupId),
                ne(familyMembers.userId, user.id),
              ),
            )
            .limit(24);
          await Promise.allSettled(
            recipients.map((recipient) =>
              sendUserPushNotification({
                userId: recipient.userId,
                title: "Family Circle",
                body: `${user.displayName || user.username} sent a family message.`,
                data: {
                  type: "family_message",
                  route: "FamilyGroup",
                  initialTab: "messages",
                  groupId,
                },
              }),
            ),
          );
        })().catch((pushError) => {
          console.error("[family] message push delivery failed:", pushError);
        });

        return res.json(familyMessageRowToResponse(message, user));
      } catch (error) {
        console.error("Create family message error:", error);
        return res.status(500).json({
          error: "family_message_save_failed",
          message:
            "Message saved locally. Try sending again when your connection is back.",
        });
      }
    },
  );

  app.get(
    "/api/family/groups/:groupId/progress",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        const groupId = parsePositiveInt(req.params.groupId);
        if (!groupId) {
          return res.status(400).json({ error: "Invalid group id" });
        }
        if (!(await requireFamilyMembership(req, res, user, groupId))) return;
        await ensureFamilyCollaborationStorage();

        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const members = await db
          .select({
            userId: familyMembers.userId,
            role: familyMembers.role,
            joinedAt: familyMembers.joinedAt,
            displayName: users.displayName,
            username: users.username,
          })
          .from(familyMembers)
          .innerJoin(users, eq(familyMembers.userId, users.id))
          .where(eq(familyMembers.groupId, groupId));

        const events = await db
          .select({
            id: familyProgressEvents.id,
            groupId: familyProgressEvents.groupId,
            userId: familyProgressEvents.userId,
            displayName: users.displayName,
            username: users.username,
            category: familyProgressEvents.category,
            title: familyProgressEvents.title,
            value: familyProgressEvents.value,
            unit: familyProgressEvents.unit,
            metadata: familyProgressEvents.metadata,
            createdAt: familyProgressEvents.createdAt,
          })
          .from(familyProgressEvents)
          .innerJoin(users, eq(familyProgressEvents.userId, users.id))
          .where(
            and(
              eq(familyProgressEvents.groupId, groupId),
              gte(familyProgressEvents.createdAt, since),
            ),
          )
          .orderBy(desc(familyProgressEvents.createdAt))
          .limit(120);

        const memberProgress = members.map((member) => {
          const memberEvents = events.filter(
            (event) => event.userId === member.userId,
          );
          const actionCount = memberEvents.length;
          const totalValue = memberEvents.reduce(
            (sum, event) => sum + event.value,
            0,
          );
          const categories = Array.from(
            new Set(memberEvents.map((event) => event.category)),
          );
          return {
            ...member,
            actionCount,
            totalValue,
            categories,
            lastActivityAt: memberEvents[0]?.createdAt ?? null,
          };
        });

        return res.json({
          members: memberProgress,
          recentEvents: events.slice(0, 30),
          periodDays: 7,
        });
      } catch (error) {
        console.error("Get family progress error:", error);
        return res.status(500).json({ error: "Failed to fetch progress" });
      }
    },
  );

  app.post(
    "/api/family/groups/:groupId/progress",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        const groupId = parsePositiveInt(req.params.groupId);
        if (!groupId) {
          return res.status(400).json({ error: "Invalid group id" });
        }
        if (!(await requireFamilyMembership(req, res, user, groupId))) return;
        if (!(await enforceFamilyWriteRateLimit(req, res, "family:progress"))) {
          return;
        }
        await ensureFamilyCollaborationStorage();

        const [event] = await db
          .insert(familyProgressEvents)
          .values({
            groupId,
            userId: user.id,
            category: cleanFamilyProgressCategory(req.body?.category),
            title: cleanFamilyProgressTitle(req.body?.title),
            value: cleanFamilyProgressValue(req.body?.value),
            unit: cleanFamilyProgressUnit(req.body?.unit),
            metadata:
              req.body?.metadata && typeof req.body.metadata === "object"
                ? req.body.metadata
                : {},
          })
          .returning();

        await logFamilyAuditEvent({
          action: "progress_recorded",
          actorId: user.id,
          groupId,
          metadata: { category: event.category, value: event.value },
        });

        return res.json(event);
      } catch (error) {
        console.error("Create family progress error:", error);
        return res.status(500).json({ error: "Failed to record progress" });
      }
    },
  );

  app.get("/api/family/invitations", async (req: Request, res: Response) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      const invitations = await db
        .select({
          id: familyInvitations.id,
          groupId: familyInvitations.groupId,
          groupName: familyGroups.name,
          inviterName: users.displayName,
          status: familyInvitations.status,
          createdAt: familyInvitations.createdAt,
        })
        .from(familyInvitations)
        .innerJoin(familyGroups, eq(familyInvitations.groupId, familyGroups.id))
        .innerJoin(users, eq(familyInvitations.inviterId, users.id))
        .where(
          and(
            eq(familyInvitations.inviteeId, user.id),
            eq(familyInvitations.status, "pending"),
          ),
        );

      return res.json(invitations);
    } catch (error) {
      console.error("Get invitations error:", error);
      return res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  app.post(
    "/api/family/invitations/:id/respond",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;

        const invitationId = parsePositiveInt(req.params.id);
        if (!invitationId) {
          return res.status(400).json({ error: "Invalid invitation id" });
        }
        const { action } = req.body;

        if (!["accept", "decline"].includes(action)) {
          return res.status(400).json({ error: "Invalid action" });
        }

        const [invitation] = await db
          .select()
          .from(familyInvitations)
          .where(
            and(
              eq(familyInvitations.id, invitationId),
              eq(familyInvitations.inviteeId, user.id),
            ),
          )
          .limit(1);

        if (!invitation) {
          return res.status(404).json({ error: "Invitation not found" });
        }

        await db
          .update(familyInvitations)
          .set({ status: action === "accept" ? "accepted" : "declined" })
          .where(eq(familyInvitations.id, invitationId));

        if (action === "accept") {
          const [existing] = await db
            .select()
            .from(familyMembers)
            .where(
              and(
                eq(familyMembers.groupId, invitation.groupId),
                eq(familyMembers.userId, user.id),
              ),
            )
            .limit(1);

          if (!existing) {
            await db.insert(familyMembers).values({
              groupId: invitation.groupId,
              userId: user.id,
              role: "member",
            });
          }
        }
        await logFamilyAuditEvent({
          action:
            action === "accept" ? "invitation_accepted" : "invitation_declined",
          actorId: user.id,
          groupId: invitation.groupId,
          invitationId,
          targetUserId: user.id,
        });

        return res.json({ success: true });
      } catch (error) {
        console.error("Respond to invitation error:", error);
        return res
          .status(500)
          .json({ error: "Failed to respond to invitation" });
      }
    },
  );
}
