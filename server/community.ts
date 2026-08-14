import type { Express } from "express";
import { db } from "./db";
import { requireAuthenticatedUser } from "./requestAuth";
import {
  communityProfiles,
  communityRooms,
  communityPosts,
  communityReplies,
  communityLikes,
  communityPostFeedback,
  communityReposts,
  communityBlocks,
} from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import {
  communityAudienceSchema,
  isCommunityAudienceChangeAllowed,
} from "@shared/communitySafety";
import { enforceCommunityLimit } from "./communitySocial";

async function getCommunityProfile(userId: string, profileId?: number) {
  const conditions = [eq(communityProfiles.userId, userId)];
  if (profileId !== undefined) {
    conditions.push(eq(communityProfiles.id, profileId));
  }
  const [profile] = await db
    .select()
    .from(communityProfiles)
    .where(and(...conditions))
    .limit(1);
  return profile;
}

function cleanCommunityText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().replace(/\s+/g, " ").slice(0, maxLength);
  return clean || null;
}

function parseCommunityId(value: string): number | null {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getVisiblePostForProfile(
  postId: number,
  profile: NonNullable<Awaited<ReturnType<typeof getCommunityProfile>>>,
) {
  const [post] = await db
    .select({
      id: communityPosts.id,
      roomId: communityPosts.roomId,
      profileId: communityPosts.profileId,
      content: communityPosts.content,
      pinned: communityPosts.pinned,
      createdAt: communityPosts.createdAt,
      audience: communityPosts.audience,
      authorGender: communityProfiles.gender,
    })
    .from(communityPosts)
    .innerJoin(
      communityProfiles,
      eq(communityPosts.profileId, communityProfiles.id),
    )
    .where(
      and(
        eq(communityPosts.id, postId),
        eq(communityPosts.audience, profile.gender),
        sql`NOT EXISTS (
          SELECT 1 FROM ${communityBlocks} AS block
          WHERE (block.blocker_profile_id = ${profile.id} AND block.blocked_profile_id = ${communityPosts.profileId})
             OR (block.blocker_profile_id = ${communityPosts.profileId} AND block.blocked_profile_id = ${profile.id})
        )`,
      ),
    )
    .limit(1);
  return post;
}

export function registerCommunityRoutes(app: Express) {
  app.post("/api/community/profile", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await enforceCommunityLimit(req, res, "community:profile", 12))) {
        return;
      }

      const { displayName, gender } = req.body;
      const cleanName = cleanCommunityText(displayName, 60);
      const parsedAudience = communityAudienceSchema.safeParse(gender);
      if (!cleanName || !parsedAudience.success) {
        return res
          .status(400)
          .json({ error: "displayName and gender are required" });
      }
      const audience = parsedAudience.data;
      const existing = await db
        .select()
        .from(communityProfiles)
        .where(eq(communityProfiles.userId, user.id))
        .limit(1);
      if (existing.length > 0) {
        const currentAudience = communityAudienceSchema.safeParse(
          existing[0].gender,
        );
        if (
          !currentAudience.success ||
          !isCommunityAudienceChangeAllowed(currentAudience.data, audience)
        ) {
          return res.status(409).json({
            error: "community_audience_locked",
            message:
              "Your community space is locked to protect everyone’s privacy. Contact support if it was set incorrectly.",
          });
        }
        const updated = await db
          .update(communityProfiles)
          .set({ displayName: cleanName, updatedAt: new Date() })
          .where(eq(communityProfiles.userId, user.id))
          .returning();
        return res.json(updated[0]);
      }
      const [profile] = await db
        .insert(communityProfiles)
        .values({
          userId: user.id,
          deviceId: user.id,
          displayName: cleanName,
          gender: audience,
        })
        .returning();
      res.json(profile);
    } catch (error) {
      console.error("Create community profile error:", error);
      res.status(500).json({ error: "Community profile could not be saved" });
    }
  });

  app.get("/api/community/profile", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      const profile = await getCommunityProfile(user.id);
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json(profile);
    } catch (error) {
      console.error("Get community profile error:", error);
      res.status(500).json({ error: "Community profile could not be loaded" });
    }
  });

  app.get("/api/community/profile/:deviceId", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (req.params.deviceId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const [profile] = await db
        .select()
        .from(communityProfiles)
        .where(eq(communityProfiles.userId, user.id))
        .limit(1);
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json(profile);
    } catch (error) {
      console.error("Get community profile error:", error);
      res.status(500).json({ error: "Community profile could not be loaded" });
    }
  });

  app.get("/api/community/rooms", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      const profile = await getCommunityProfile(user.id);
      if (!profile) {
        return res.status(404).json({ error: "Community profile is required" });
      }
      const rooms = await db
        .select()
        .from(communityRooms)
        .orderBy(asc(communityRooms.sortOrder));
      const postCounts = await db
        .select({
          roomId: communityPosts.roomId,
          count: sql<number>`count(*)::int`,
          latestAt: sql<string>`max(${communityPosts.createdAt})`,
        })
        .from(communityPosts)
        .where(
          and(
            eq(communityPosts.audience, profile.gender),
            sql`NOT EXISTS (
              SELECT 1 FROM ${communityBlocks} AS block
              WHERE (block.blocker_profile_id = ${profile.id} AND block.blocked_profile_id = ${communityPosts.profileId})
                 OR (block.blocker_profile_id = ${communityPosts.profileId} AND block.blocked_profile_id = ${profile.id})
            )`,
            sql`NOT EXISTS (
              SELECT 1 FROM ${communityPostFeedback} feedback
              WHERE feedback.post_id = ${communityPosts.id}
                AND feedback.profile_id = ${profile.id}
                AND feedback.kind = 'not_for_me'
            )`,
          ),
        )
        .groupBy(communityPosts.roomId);
      const countMap = new Map(
        postCounts.map((pc) => [
          pc.roomId,
          { count: pc.count, latestAt: pc.latestAt },
        ]),
      );
      const enriched = rooms.map((r) => ({
        ...r,
        postCount: countMap.get(r.id)?.count || 0,
        latestPostAt: countMap.get(r.id)?.latestAt || null,
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Get community rooms error:", error);
      res.status(500).json({ error: "Community boards could not be loaded" });
    }
  });

  app.get("/api/community/stats", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      const profile = await getCommunityProfile(user.id);
      if (!profile) {
        return res.status(404).json({ error: "Community profile is required" });
      }
      const [{ totalPosts }] = await db
        .select({ totalPosts: sql<number>`count(*)::int` })
        .from(communityPosts)
        .where(eq(communityPosts.audience, profile.gender));
      const [{ totalMembers }] = await db
        .select({ totalMembers: sql<number>`count(*)::int` })
        .from(communityProfiles)
        .where(
          and(
            eq(communityProfiles.gender, profile.gender),
            sql`NOT EXISTS (
              SELECT 1 FROM ${communityBlocks} AS block
              WHERE (block.blocker_profile_id = ${profile.id} AND block.blocked_profile_id = ${communityProfiles.id})
                 OR (block.blocker_profile_id = ${communityProfiles.id} AND block.blocked_profile_id = ${profile.id})
            )`,
          ),
        );
      const [{ totalRooms }] = await db
        .select({ totalRooms: sql<number>`count(*)::int` })
        .from(communityRooms);
      res.json({ totalPosts, totalMembers, totalRooms });
    } catch (error) {
      console.error("Get community stats error:", error);
      res.status(500).json({ error: "Community activity could not be loaded" });
    }
  });

  app.get("/api/community/rooms/:roomId/posts", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      const roomId = parseInt(req.params.roomId);
      const profile = await getCommunityProfile(user.id);
      if (!profile) {
        return res.status(404).json({ error: "Community profile is required" });
      }
      const posts = await db
        .select({
          id: communityPosts.id,
          roomId: communityPosts.roomId,
          profileId: communityPosts.profileId,
          content: communityPosts.content,
          pinned: communityPosts.pinned,
          createdAt: communityPosts.createdAt,
          displayName: communityProfiles.displayName,
          gender: communityProfiles.gender,
          replyCount: sql<number>`(
            SELECT COUNT(*)
            FROM community_replies cr
            WHERE cr.post_id = ${communityPosts.id}
              AND NOT EXISTS (
                SELECT 1 FROM community_blocks block
                WHERE (block.blocker_profile_id = ${profile.id} AND block.blocked_profile_id = cr.profile_id)
                   OR (block.blocker_profile_id = cr.profile_id AND block.blocked_profile_id = ${profile.id})
              )
          )::int`,
          likeCount: sql<number>`(SELECT COUNT(*) FROM community_likes cl WHERE cl.post_id = ${communityPosts.id})::int`,
          repostCount: sql<number>`(SELECT COUNT(*) FROM community_reposts crp WHERE crp.post_id = ${communityPosts.id})::int`,
          liked: sql<boolean>`EXISTS(SELECT 1 FROM community_likes cl WHERE cl.post_id = ${communityPosts.id} AND cl.profile_id = ${profile.id})`,
          reposted: sql<boolean>`EXISTS(SELECT 1 FROM community_reposts crp WHERE crp.post_id = ${communityPosts.id} AND crp.profile_id = ${profile.id})`,
        })
        .from(communityPosts)
        .innerJoin(
          communityProfiles,
          eq(communityPosts.profileId, communityProfiles.id),
        )
        .where(
          and(
            eq(communityPosts.roomId, roomId),
            eq(communityPosts.audience, profile.gender),
            sql`NOT EXISTS (
              SELECT 1 FROM ${communityBlocks} AS block
              WHERE (block.blocker_profile_id = ${profile.id} AND block.blocked_profile_id = ${communityPosts.profileId})
                 OR (block.blocker_profile_id = ${communityPosts.profileId} AND block.blocked_profile_id = ${profile.id})
            )`,
            sql`NOT EXISTS (
              SELECT 1 FROM ${communityPostFeedback} feedback
              WHERE feedback.post_id = ${communityPosts.id}
                AND feedback.profile_id = ${profile.id}
                AND feedback.kind = 'not_for_me'
            )`,
          ),
        )
        .orderBy(desc(communityPosts.pinned), desc(communityPosts.createdAt))
        .limit(100);
      res.json(posts);
    } catch (error) {
      console.error("Get community posts error:", error);
      res.status(500).json({ error: "Community posts could not be loaded" });
    }
  });

  app.post("/api/community/posts", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await enforceCommunityLimit(req, res, "community:post", 12))) {
        return;
      }

      const { roomId, content } = req.body;
      const profile = await getCommunityProfile(user.id);
      const cleanContent = cleanCommunityText(content, 1200);
      if (!roomId || !profile || !cleanContent) {
        return res.status(400).json({
          error: "roomId, community profile, and content are required",
        });
      }
      const [post] = await db
        .insert(communityPosts)
        .values({
          roomId,
          profileId: profile.id,
          content: cleanContent,
          audience: profile.gender,
        })
        .returning();
      res.json({
        ...post,
        displayName: profile.displayName,
        gender: profile.gender,
        replyCount: 0,
        likeCount: 0,
        repostCount: 0,
        liked: false,
        reposted: false,
      });
    } catch (error) {
      console.error("Create community post error:", error);
      res.status(500).json({ error: "Community post could not be saved" });
    }
  });

  app.get("/api/community/posts/:postId/replies", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      const postId = parseCommunityId(req.params.postId);
      if (!postId) return res.status(400).json({ error: "Invalid post id" });
      const profile = await getCommunityProfile(user.id);
      if (!profile) {
        return res.status(404).json({ error: "Community profile is required" });
      }
      const visiblePost = await getVisiblePostForProfile(postId, profile);
      if (!visiblePost) {
        return res.status(404).json({ error: "Post not found" });
      }

      const replies = await db
        .select({
          id: communityReplies.id,
          postId: communityReplies.postId,
          profileId: communityReplies.profileId,
          content: communityReplies.content,
          createdAt: communityReplies.createdAt,
          displayName: communityProfiles.displayName,
        })
        .from(communityReplies)
        .innerJoin(
          communityProfiles,
          eq(communityReplies.profileId, communityProfiles.id),
        )
        .where(
          and(
            eq(communityReplies.postId, postId),
            eq(communityReplies.audience, profile.gender),
            sql`NOT EXISTS (
              SELECT 1 FROM ${communityBlocks} AS block
              WHERE (block.blocker_profile_id = ${profile.id} AND block.blocked_profile_id = ${communityReplies.profileId})
                 OR (block.blocker_profile_id = ${communityReplies.profileId} AND block.blocked_profile_id = ${profile.id})
            )`,
          ),
        )
        .orderBy(asc(communityReplies.createdAt));
      res.json(replies);
    } catch (error) {
      console.error("Get community replies error:", error);
      res.status(500).json({ error: "Community replies could not be loaded" });
    }
  });

  app.post("/api/community/replies", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await enforceCommunityLimit(req, res, "community:reply", 30))) {
        return;
      }

      const postId = Number(req.body?.postId);
      const { content } = req.body;
      const profile = await getCommunityProfile(user.id);
      const cleanContent = cleanCommunityText(content, 800);
      if (!Number.isInteger(postId) || !profile || !cleanContent) {
        return res.status(400).json({
          error: "postId, community profile, and content are required",
        });
      }
      const visiblePost = await getVisiblePostForProfile(postId, profile);
      if (!visiblePost) {
        return res.status(404).json({ error: "Post not found" });
      }
      const [reply] = await db
        .insert(communityReplies)
        .values({
          postId,
          profileId: profile.id,
          content: cleanContent,
          audience: visiblePost.audience,
        })
        .returning();
      res.json({ ...reply, displayName: profile.displayName });
    } catch (error) {
      console.error("Create community reply error:", error);
      res.status(500).json({ error: "Community reply could not be saved" });
    }
  });

  app.post("/api/community/posts/:postId/like", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await enforceCommunityLimit(req, res, "community:reaction", 90))) {
        return;
      }

      const postId = parseCommunityId(req.params.postId);
      if (!postId) return res.status(400).json({ error: "Invalid post id" });
      const profile = await getCommunityProfile(user.id);
      if (!profile)
        return res.status(400).json({ error: "community profile required" });
      const visiblePost = await getVisiblePostForProfile(postId, profile);
      if (!visiblePost) {
        return res.status(404).json({ error: "Post not found" });
      }

      const existing = await db
        .select()
        .from(communityLikes)
        .where(
          and(
            eq(communityLikes.postId, postId),
            eq(communityLikes.profileId, profile.id),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .delete(communityLikes)
          .where(
            and(
              eq(communityLikes.postId, postId),
              eq(communityLikes.profileId, profile.id),
            ),
          );
        const [count] = await db
          .select({ c: sql<number>`COUNT(*)::int` })
          .from(communityLikes)
          .where(eq(communityLikes.postId, postId));
        return res.json({ liked: false, likeCount: count.c });
      }

      await db
        .insert(communityLikes)
        .values({ postId, profileId: profile.id })
        .onConflictDoNothing({
          target: [communityLikes.postId, communityLikes.profileId],
        });
      const [count] = await db
        .select({ c: sql<number>`COUNT(*)::int` })
        .from(communityLikes)
        .where(eq(communityLikes.postId, postId));
      res.json({ liked: true, likeCount: count.c });
    } catch (error) {
      console.error("Update community like error:", error);
      res.status(500).json({ error: "Community like could not be updated" });
    }
  });

  app.post("/api/community/posts/:postId/not-for-me", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await enforceCommunityLimit(req, res, "community:feedback", 60))) {
        return;
      }
      const postId = parseCommunityId(req.params.postId);
      if (!postId) return res.status(400).json({ error: "Invalid post id" });
      const profile = await getCommunityProfile(user.id);
      if (!profile) {
        return res.status(400).json({ error: "community profile required" });
      }
      const visiblePost = await getVisiblePostForProfile(postId, profile);
      if (!visiblePost) {
        return res.status(404).json({ error: "Post not found" });
      }
      await db
        .insert(communityPostFeedback)
        .values({ postId, profileId: profile.id, kind: "not_for_me" })
        .onConflictDoNothing({
          target: [
            communityPostFeedback.postId,
            communityPostFeedback.profileId,
          ],
        });
      res.json({ hidden: true });
    } catch (error) {
      console.error("Update community private feedback error:", error);
      res.status(500).json({ error: "Community feedback could not be saved" });
    }
  });

  app.post("/api/community/posts/:postId/repost", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await enforceCommunityLimit(req, res, "community:reaction", 90))) {
        return;
      }

      const postId = parseCommunityId(req.params.postId);
      if (!postId) return res.status(400).json({ error: "Invalid post id" });
      const profile = await getCommunityProfile(user.id);
      if (!profile)
        return res.status(400).json({ error: "community profile required" });
      const visiblePost = await getVisiblePostForProfile(postId, profile);
      if (!visiblePost) {
        return res.status(404).json({ error: "Post not found" });
      }

      const existing = await db
        .select()
        .from(communityReposts)
        .where(
          and(
            eq(communityReposts.postId, postId),
            eq(communityReposts.profileId, profile.id),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .delete(communityReposts)
          .where(
            and(
              eq(communityReposts.postId, postId),
              eq(communityReposts.profileId, profile.id),
            ),
          );
        const [count] = await db
          .select({ c: sql<number>`COUNT(*)::int` })
          .from(communityReposts)
          .where(eq(communityReposts.postId, postId));
        return res.json({ reposted: false, repostCount: count.c });
      }

      await db
        .insert(communityReposts)
        .values({ postId, profileId: profile.id })
        .onConflictDoNothing({
          target: [communityReposts.postId, communityReposts.profileId],
        });
      const [count] = await db
        .select({ c: sql<number>`COUNT(*)::int` })
        .from(communityReposts)
        .where(eq(communityReposts.postId, postId));
      res.json({ reposted: true, repostCount: count.c });
    } catch (error) {
      console.error("Update community repost error:", error);
      res.status(500).json({ error: "Community repost could not be updated" });
    }
  });

  app.delete("/api/community/posts/:postId", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await enforceCommunityLimit(req, res, "community:delete", 20))) {
        return;
      }

      const postId = parseCommunityId(req.params.postId);
      if (!postId) return res.status(400).json({ error: "Invalid post id" });
      const profile = await getCommunityProfile(user.id);
      if (!profile)
        return res.status(400).json({ error: "community profile required" });
      const [post] = await db
        .select()
        .from(communityPosts)
        .where(eq(communityPosts.id, postId));
      if (!post || post.profileId !== profile.id) {
        return res.status(403).json({ error: "Not authorized" });
      }
      await db.delete(communityPosts).where(eq(communityPosts.id, postId));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete community post error:", error);
      res.status(500).json({ error: "Community post could not be deleted" });
    }
  });
}
