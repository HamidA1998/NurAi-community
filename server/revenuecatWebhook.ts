import type { Express, Request, Response } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  refreshRevenueCatEntitlement,
  revenueCatServerKeyConfigured,
} from "./subscriptions";

type RevenueCatWebhookBody = {
  api_version?: unknown;
  event?: RevenueCatWebhookEvent;
};

type RevenueCatWebhookEvent = {
  type?: unknown;
  id?: unknown;
  app_user_id?: unknown;
  original_app_user_id?: unknown;
  aliases?: unknown;
  transferred_from?: unknown;
  transferred_to?: unknown;
};

const MAX_APP_USER_ID_LENGTH = 256;
const MAX_APP_USER_IDS_PER_WEBHOOK = 12;

function configuredWebhookAuthorization(): string | null {
  return process.env.REVENUECAT_WEBHOOK_AUTHORIZATION?.trim() || null;
}

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = createHash("sha256").update(left).digest();
  const rightBuffer = createHash("sha256").update(right).digest();

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function addCandidateId(ids: string[], value: unknown): void {
  if (ids.length >= MAX_APP_USER_IDS_PER_WEBHOOK) return;
  if (typeof value !== "string") return;

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_APP_USER_ID_LENGTH) return;
  if (!ids.includes(trimmed)) ids.push(trimmed);
}

function addCandidateIdArray(ids: string[], value: unknown): void {
  if (!Array.isArray(value)) return;
  for (const entry of value) addCandidateId(ids, entry);
}

function candidateAppUserIds(event: RevenueCatWebhookEvent): string[] {
  const ids: string[] = [];

  addCandidateId(ids, event.app_user_id);
  addCandidateId(ids, event.original_app_user_id);
  addCandidateIdArray(ids, event.aliases);
  addCandidateIdArray(ids, event.transferred_to);
  addCandidateIdArray(ids, event.transferred_from);

  return ids;
}

function webhookEventFromRequest(req: Request): RevenueCatWebhookEvent | null {
  const body = req.body as RevenueCatWebhookBody | undefined;
  const event = body?.event;
  return event && typeof event === "object" ? event : null;
}

async function handleRevenueCatWebhook(req: Request, res: Response) {
  const expectedAuthorization = configuredWebhookAuthorization();
  if (!expectedAuthorization) {
    return res.status(503).json({ error: "RevenueCat webhook not configured" });
  }

  const authorization = req.get("authorization") || "";
  if (!safeEquals(authorization, expectedAuthorization)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!revenueCatServerKeyConfigured()) {
    return res
      .status(503)
      .json({ error: "RevenueCat server key not configured" });
  }

  const event = webhookEventFromRequest(req);
  if (!event) {
    return res
      .status(400)
      .json({ error: "Invalid RevenueCat webhook payload" });
  }

  const candidateIds = candidateAppUserIds(event);
  if (!candidateIds.length) {
    return res.status(200).json({
      ok: true,
      updatedUsers: 0,
      skippedUsers: 0,
      eventType: typeof event.type === "string" ? event.type : "UNKNOWN",
    });
  }

  const refreshResults = await Promise.all(
    candidateIds.map((appUserId) => refreshRevenueCatEntitlement(appUserId)),
  );

  const updatedUsers = refreshResults.filter(Boolean).length;
  const skippedUsers = candidateIds.length - updatedUsers;

  return res.status(200).json({
    ok: true,
    updatedUsers,
    skippedUsers,
    eventType: typeof event.type === "string" ? event.type : "UNKNOWN",
  });
}

export function registerRevenueCatWebhookRoutes(app: Express) {
  app.post("/api/webhooks/revenuecat", handleRevenueCatWebhook);
}
