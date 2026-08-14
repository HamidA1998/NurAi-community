import { z } from "zod";

export const communityAudienceSchema = z.enum(["male", "female"]);

export type CommunityAudience = z.infer<typeof communityAudienceSchema>;

export const communityProfileIdSchema = z.coerce.number().int().positive();

export const communityDirectoryQuerySchema = z.object({
  q: z.string().trim().min(3).max(80),
});

export const communityProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(240).default(""),
  discoverableByUsername: z.boolean().default(true),
  discoverableByEmail: z.boolean().default(true),
  allowConnectionRequests: z.boolean().default(true),
});

export const communityConnectionActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export const communityDirectMessageInputSchema = z
  .object({
    clientMessageId: z
      .string()
      .trim()
      .min(8)
      .max(80)
      .regex(/^[A-Za-z0-9._:-]+$/),
    content: z.string().trim().max(1200).default(""),
    image: z
      .object({
        dataUrl: z.string().max(1_100_000),
        width: z.number().int().min(1).max(2048),
        height: z.number().int().min(1).max(2048),
        altText: z.string().trim().max(240).default("Shared image"),
      })
      .optional(),
  })
  .superRefine((value, context) => {
    if (!value.content && !value.image) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "A message or image is required.",
      });
    }
  });

export const communityCircleCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).default(""),
});

export const communityCircleJoinSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6,10}$/),
});

export const communityCircleCheckinSchema = z.object({
  content: z.string().trim().max(280).default(""),
});

export const communityReportInputSchema = z.object({
  targetType: z.enum(["profile", "post", "reply", "message"]),
  targetId: z.union([z.string(), z.number()]).transform(String),
  reason: z.enum([
    "harassment",
    "spam",
    "hate",
    "sexual_content",
    "dangerous_content",
    "impersonation",
    "other",
  ]),
  details: z.string().trim().max(500).optional(),
});

export const communityReportModerationSchema = z.object({
  status: z.enum(["reviewing", "resolved", "dismissed"]),
  removeTarget: z.boolean().default(false),
});

export function canonicalCommunityPair(
  firstProfileId: number,
  secondProfileId: number,
): readonly [number, number] | null {
  if (
    !Number.isInteger(firstProfileId) ||
    !Number.isInteger(secondProfileId) ||
    firstProfileId <= 0 ||
    secondProfileId <= 0 ||
    firstProfileId === secondProfileId
  ) {
    return null;
  }
  return firstProfileId < secondProfileId
    ? [firstProfileId, secondProfileId]
    : [secondProfileId, firstProfileId];
}

export function canCommunityMembersInteract(
  viewerAudience: CommunityAudience,
  otherAudience: CommunityAudience,
): boolean {
  return viewerAudience === otherAudience;
}

export function isCommunityAudienceChangeAllowed(
  currentAudience: CommunityAudience,
  requestedAudience: CommunityAudience,
): boolean {
  return currentAudience === requestedAudience;
}
