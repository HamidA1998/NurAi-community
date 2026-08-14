import type { Express, Request, Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import crypto from "node:crypto";

import {
  communityCircleCheckins,
  communityCircleMembers,
  communityCircles,
  communityProfiles,
  type CommunityProfile,
} from "@shared/schema";
import {
  communityAudienceSchema,
  communityCircleCheckinSchema,
  communityCircleCreateSchema,
  communityCircleJoinSchema,
  communityProfileIdSchema,
  type CommunityAudience,
} from "@shared/communitySafety";
import { db } from "./db";
import { enforceCommunityLimit } from "./communitySocial";
import { requireAuthenticatedUser } from "./requestAuth";

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

function sendUnexpectedCircleError(
  res: Response,
  label: string,
  error: unknown,
): void {
  console.error(`[community-circles] ${label}:`, error);
  res.status(500).json({
    error: "community_circle_action_failed",
    message: "We could not complete that action. Please try again.",
  });
}

function generateInviteCode(): string {
  // Base32-ish alphabet with ambiguous characters (0/O, 1/I) removed.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 7; i++) {
    code += alphabet[crypto.randomInt(alphabet.length)];
  }
  return code;
}

async function requireCircleMembership(
  profile: CommunityProfile,
  circleId: number,
) {
  const [row] = await db
    .select({
      circle: communityCircles,
      membership: communityCircleMembers,
    })
    .from(communityCircleMembers)
    .innerJoin(
      communityCircles,
      eq(communityCircleMembers.circleId, communityCircles.id),
    )
    .where(
      and(
        eq(communityCircleMembers.circleId, circleId),
        eq(communityCircleMembers.profileId, profile.id),
      ),
    )
    .limit(1);
  return row ?? null;
}

export function registerCommunityCircleRoutes(app: Express): void {
  app.post("/api/community/circles", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      if (
        !(await enforceCommunityLimit(req, res, "community:circle-create", 6))
      ) {
        return;
      }
      const input = communityCircleCreateSchema.safeParse(req.body);
      if (!input.success) {
        return res.status(400).json({
          error: "invalid_circle",
          message: "Give the circle a short name and try again.",
        });
      }
      const audience = profileAudience(profile);
      if (!audience) {
        return res.status(428).json({
          error: "community_profile_required",
          message: "Choose your community space before continuing.",
        });
      }

      let inviteCode = generateInviteCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        const [existing] = await db
          .select({ id: communityCircles.id })
          .from(communityCircles)
          .where(eq(communityCircles.inviteCode, inviteCode))
          .limit(1);
        if (!existing) break;
        inviteCode = generateInviteCode();
      }

      const circle = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(communityCircles)
          .values({
            name: input.data.name,
            description: input.data.description,
            audience,
            createdByProfileId: profile.id,
            inviteCode,
          })
          .returning();
        await tx.insert(communityCircleMembers).values({
          circleId: created.id,
          profileId: profile.id,
          role: "owner",
        });
        return created;
      });

      res.status(201).json(circle);
    } catch (error) {
      sendUnexpectedCircleError(res, "create circle", error);
    }
  });

  app.post("/api/community/circles/join", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      if (
        !(await enforceCommunityLimit(req, res, "community:circle-join", 10))
      ) {
        return;
      }
      const input = communityCircleJoinSchema.safeParse(req.body);
      if (!input.success) {
        return res.status(400).json({
          error: "invalid_invite_code",
          message: "That invite code doesn't look right.",
        });
      }
      const audience = profileAudience(profile);
      const [circle] = await db
        .select()
        .from(communityCircles)
        .where(eq(communityCircles.inviteCode, input.data.inviteCode))
        .limit(1);
      if (!circle || !audience || circle.audience !== audience) {
        return res.status(404).json({
          error: "circle_not_found",
          message: "We couldn't find a circle with that code.",
        });
      }

      const existingMembership = await requireCircleMembership(
        profile,
        circle.id,
      );
      if (existingMembership) return res.json(circle);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(communityCircleMembers)
        .where(eq(communityCircleMembers.circleId, circle.id));
      if (count >= circle.memberCap) {
        return res.status(409).json({
          error: "circle_full",
          message: "This circle is full.",
        });
      }

      await db.insert(communityCircleMembers).values({
        circleId: circle.id,
        profileId: profile.id,
        role: "member",
      });
      res.status(201).json(circle);
    } catch (error) {
      sendUnexpectedCircleError(res, "join circle", error);
    }
  });

  app.get("/api/community/circles", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;

      const today = new Date().toISOString().slice(0, 10);
      const rows = await db
        .select({
          circle: communityCircles,
          memberCount: sql<number>`(
            SELECT count(*)::int FROM community_circle_members m
            WHERE m.circle_id = ${communityCircles.id}
          )`,
          checkedInToday: sql<boolean>`EXISTS (
            SELECT 1 FROM community_circle_checkins c
            WHERE c.circle_id = ${communityCircles.id}
              AND c.profile_id = ${profile.id}
              AND c.checkin_date = ${today}
          )`,
          todayCheckinCount: sql<number>`(
            SELECT count(*)::int FROM community_circle_checkins c
            WHERE c.circle_id = ${communityCircles.id}
              AND c.checkin_date = ${today}
          )`,
        })
        .from(communityCircleMembers)
        .innerJoin(
          communityCircles,
          eq(communityCircleMembers.circleId, communityCircles.id),
        )
        .where(eq(communityCircleMembers.profileId, profile.id))
        .orderBy(desc(communityCircles.createdAt));

      res.json({
        circles: rows.map((row) => ({
          id: row.circle.id,
          name: row.circle.name,
          description: row.circle.description,
          inviteCode: row.circle.inviteCode,
          memberCap: row.circle.memberCap,
          isOwner: row.circle.createdByProfileId === profile.id,
          memberCount: row.memberCount,
          checkedInToday: row.checkedInToday,
          todayCheckinCount: row.todayCheckinCount,
        })),
      });
    } catch (error) {
      sendUnexpectedCircleError(res, "list circles", error);
    }
  });

  app.get("/api/community/circles/:circleId", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      const circleId = parsePositiveId(req.params.circleId);
      if (!circleId) {
        return res.status(400).json({ error: "Invalid circle" });
      }
      const membership = await requireCircleMembership(profile, circleId);
      if (!membership) {
        return res.status(404).json({ error: "Circle not found" });
      }

      const members = await db
        .select({
          profileId: communityCircleMembers.profileId,
          role: communityCircleMembers.role,
          joinedAt: communityCircleMembers.joinedAt,
          displayName: communityProfiles.displayName,
        })
        .from(communityCircleMembers)
        .innerJoin(
          communityProfiles,
          eq(communityCircleMembers.profileId, communityProfiles.id),
        )
        .where(eq(communityCircleMembers.circleId, circleId));

      const checkins = await db
        .select({
          id: communityCircleCheckins.id,
          profileId: communityCircleCheckins.profileId,
          content: communityCircleCheckins.content,
          checkinDate: communityCircleCheckins.checkinDate,
          createdAt: communityCircleCheckins.createdAt,
          displayName: communityProfiles.displayName,
        })
        .from(communityCircleCheckins)
        .innerJoin(
          communityProfiles,
          eq(communityCircleCheckins.profileId, communityProfiles.id),
        )
        .where(eq(communityCircleCheckins.circleId, circleId))
        .orderBy(desc(communityCircleCheckins.checkinDate))
        .limit(60);

      res.json({
        circle: membership.circle,
        myRole: membership.membership.role,
        myProfileId: profile.id,
        members,
        checkins,
      });
    } catch (error) {
      sendUnexpectedCircleError(res, "load circle", error);
    }
  });

  app.post("/api/community/circles/:circleId/checkins", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      if (
        !(await enforceCommunityLimit(req, res, "community:circle-checkin", 20))
      ) {
        return;
      }
      const circleId = parsePositiveId(req.params.circleId);
      const input = communityCircleCheckinSchema.safeParse(req.body);
      if (!circleId || !input.success) {
        return res.status(400).json({ error: "Invalid check-in" });
      }
      const membership = await requireCircleMembership(profile, circleId);
      if (!membership) {
        return res.status(404).json({ error: "Circle not found" });
      }

      const [checkin] = await db
        .insert(communityCircleCheckins)
        .values({
          circleId,
          profileId: profile.id,
          content: input.data.content,
        })
        .onConflictDoUpdate({
          target: [
            communityCircleCheckins.circleId,
            communityCircleCheckins.profileId,
            communityCircleCheckins.checkinDate,
          ],
          set: { content: input.data.content },
        })
        .returning();

      res.status(201).json(checkin);
    } catch (error) {
      sendUnexpectedCircleError(res, "post check-in", error);
    }
  });

  app.delete("/api/community/circles/:circleId/leave", async (req, res) => {
    try {
      const profile = await requireOwnCommunityProfile(req, res);
      if (!profile) return;
      const circleId = parsePositiveId(req.params.circleId);
      if (!circleId) {
        return res.status(400).json({ error: "Invalid circle" });
      }
      await db
        .delete(communityCircleMembers)
        .where(
          and(
            eq(communityCircleMembers.circleId, circleId),
            eq(communityCircleMembers.profileId, profile.id),
          ),
        );
      res.json({ success: true });
    } catch (error) {
      sendUnexpectedCircleError(res, "leave circle", error);
    }
  });
}
