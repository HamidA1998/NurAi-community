import type { Express, Request, Response } from "express";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db } from "./db";
import { familyCheckIns, familyPlaces, users } from "@shared/schema";
import { requireAuthenticatedUser } from "./requestAuth";
import {
  enforceFamilyWriteRateLimit,
  logFamilyAuditEvent,
  requireFamilyMembership,
} from "./family";

const PLACE_KINDS = new Set(["home", "school", "work", "mosque", "custom"]);
const CHECK_IN_STATUSES = new Set(["safe", "at_place", "shared_location"]);

function parsePositiveInt(value: unknown): number | null {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maxLength)
    : "";
}

function cleanPlaceKind(value: unknown): string {
  const kind = cleanText(value, 24).toLowerCase();
  return PLACE_KINDS.has(kind) ? kind : "custom";
}

function finiteCoordinate(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return Math.round(parsed * 100000) / 100000;
}

function cleanAccuracy(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100000) return null;
  return Math.round(parsed * 10) / 10;
}

function cleanShareMinutes(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? 60), 10);
  if (!Number.isFinite(parsed)) return 60;
  return Math.min(120, Math.max(15, parsed));
}

let familyPlacesStoragePromise: Promise<void> | null = null;

/**
 * Keeps local/dev databases usable while the release migration is being
 * applied. Production still requires 0024 to be applied and verified before
 * release; this fallback is only repeat-safe table creation, never data
 * backfilling or permission bypass.
 */
async function ensureFamilyPlacesStorage(): Promise<void> {
  if (!familyPlacesStoragePromise) {
    familyPlacesStoragePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS family_places (
          id serial PRIMARY KEY,
          group_id integer NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
          created_by varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name text NOT NULL,
          kind text NOT NULL DEFAULT 'custom',
          address text,
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS family_places_group_created_idx
        ON family_places (group_id, created_at)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS family_places_creator_idx
        ON family_places (created_by)
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS family_check_ins (
          id serial PRIMARY KEY,
          group_id integer NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          place_id integer REFERENCES family_places(id) ON DELETE SET NULL,
          status text NOT NULL DEFAULT 'safe',
          location_label text NOT NULL,
          latitude real,
          longitude real,
          accuracy_meters real,
          expires_at timestamp,
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS family_check_ins_group_user_idx
        ON family_check_ins (group_id, user_id)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS family_check_ins_group_updated_idx
        ON family_check_ins (group_id, updated_at)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS family_check_ins_expires_idx
        ON family_check_ins (expires_at)
      `);
    })().catch((error) => {
      familyPlacesStoragePromise = null;
      throw error;
    });
  }

  await familyPlacesStoragePromise;
}

function publicPlaceRow(place: typeof familyPlaces.$inferSelect) {
  return {
    id: place.id,
    groupId: place.groupId,
    name: place.name,
    kind: place.kind,
    address: place.address,
    createdBy: place.createdBy,
    createdAt: place.createdAt,
    updatedAt: place.updatedAt,
  };
}

function publicCheckInRow(row: {
  id: number;
  groupId: number;
  userId: string;
  placeId: number | null;
  status: string;
  locationLabel: string;
  expiresAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  createdAt: Date;
  updatedAt: Date;
  displayName: string | null;
  username: string;
  placeName: string | null;
}) {
  const expired = row.expiresAt ? row.expiresAt.getTime() <= Date.now() : false;
  return {
    id: row.id,
    groupId: row.groupId,
    userId: row.userId,
    displayName: row.displayName,
    username: row.username,
    placeId: row.placeId,
    placeName: row.placeName,
    status: expired ? "expired" : row.status,
    locationLabel: expired ? "Location share ended" : row.locationLabel,
    hasSharedLocation: !expired && row.status === "shared_location",
    latitude:
      !expired && row.status === "shared_location" ? row.latitude : null,
    longitude:
      !expired && row.status === "shared_location" ? row.longitude : null,
    accuracyMeters:
      !expired && row.status === "shared_location" ? row.accuracyMeters : null,
    expiresAt: expired ? null : row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function familyPlacesPayload(groupId: number) {
  await ensureFamilyPlacesStorage();
  // Timed location shares are deleted when they expire. This keeps the
  // current-only contract honest: an expired coordinate is not a history row.
  await db
    .delete(familyCheckIns)
    .where(
      and(
        eq(familyCheckIns.groupId, groupId),
        lte(familyCheckIns.expiresAt, new Date()),
      ),
    );
  const [places, checkIns] = await Promise.all([
    db
      .select()
      .from(familyPlaces)
      .where(eq(familyPlaces.groupId, groupId))
      .orderBy(asc(familyPlaces.createdAt)),
    db
      .select({
        id: familyCheckIns.id,
        groupId: familyCheckIns.groupId,
        userId: familyCheckIns.userId,
        placeId: familyCheckIns.placeId,
        status: familyCheckIns.status,
        locationLabel: familyCheckIns.locationLabel,
        expiresAt: familyCheckIns.expiresAt,
        latitude: familyCheckIns.latitude,
        longitude: familyCheckIns.longitude,
        accuracyMeters: familyCheckIns.accuracyMeters,
        createdAt: familyCheckIns.createdAt,
        updatedAt: familyCheckIns.updatedAt,
        displayName: users.displayName,
        username: users.username,
        placeName: familyPlaces.name,
      })
      .from(familyCheckIns)
      .innerJoin(users, eq(familyCheckIns.userId, users.id))
      .leftJoin(familyPlaces, eq(familyCheckIns.placeId, familyPlaces.id))
      .where(eq(familyCheckIns.groupId, groupId))
      .orderBy(asc(familyCheckIns.updatedAt)),
  ]);

  return {
    places: places.map(publicPlaceRow),
    checkIns: checkIns.map(publicCheckInRow),
    privacy: {
      retention: "current_check_in_only",
      backgroundTracking: false,
      locationShareWindowMinutes: 120,
    },
  };
}

export function registerFamilyPlacesRoutes(app: Express): void {
  app.get(
    "/api/family/groups/:groupId/places",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        const groupId = parsePositiveInt(req.params.groupId);
        if (!groupId)
          return res.status(400).json({ error: "Invalid group id" });
        if (!(await requireFamilyMembership(req, res, user, groupId))) return;
        return res.json(await familyPlacesPayload(groupId));
      } catch (error) {
        console.error("Get family places error:", error);
        return res.status(500).json({ error: "Failed to fetch family places" });
      }
    },
  );

  app.post(
    "/api/family/groups/:groupId/places",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        const groupId = parsePositiveInt(req.params.groupId);
        if (!groupId)
          return res.status(400).json({ error: "Invalid group id" });
        if (!(await requireFamilyMembership(req, res, user, groupId))) return;
        if (!(await enforceFamilyWriteRateLimit(req, res, "family:places")))
          return;

        const name = cleanText(req.body?.name, 80);
        const address = cleanText(req.body?.address, 160) || null;
        if (!name)
          return res.status(400).json({ error: "Place name is required" });

        await ensureFamilyPlacesStorage();
        const [place] = await db
          .insert(familyPlaces)
          .values({
            groupId,
            createdBy: user.id,
            name,
            kind: cleanPlaceKind(req.body?.kind),
            address,
          })
          .returning();

        await logFamilyAuditEvent({
          action: "family_place_created",
          actorId: user.id,
          groupId,
          metadata: { placeId: place.id, kind: place.kind },
        });
        return res.status(201).json(publicPlaceRow(place));
      } catch (error) {
        console.error("Create family place error:", error);
        return res.status(500).json({ error: "Failed to save family place" });
      }
    },
  );

  app.delete(
    "/api/family/groups/:groupId/places/:placeId",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        const groupId = parsePositiveInt(req.params.groupId);
        const placeId = parsePositiveInt(req.params.placeId);
        if (!groupId || !placeId) {
          return res.status(400).json({ error: "Invalid place" });
        }
        const membership = await requireFamilyMembership(
          req,
          res,
          user,
          groupId,
        );
        if (!membership) return;
        if (!(await enforceFamilyWriteRateLimit(req, res, "family:places")))
          return;

        await ensureFamilyPlacesStorage();
        const [place] = await db
          .select({ id: familyPlaces.id, createdBy: familyPlaces.createdBy })
          .from(familyPlaces)
          .where(
            and(
              eq(familyPlaces.id, placeId),
              eq(familyPlaces.groupId, groupId),
            ),
          )
          .limit(1);
        if (!place) return res.status(404).json({ error: "Place not found" });
        if (place.createdBy !== user.id && membership.role !== "creator") {
          return res
            .status(403)
            .json({ error: "Only the place owner can remove it" });
        }

        await db.delete(familyPlaces).where(eq(familyPlaces.id, placeId));
        await logFamilyAuditEvent({
          action: "family_place_removed",
          actorId: user.id,
          groupId,
          metadata: { placeId },
        });
        return res.status(204).send();
      } catch (error) {
        console.error("Delete family place error:", error);
        return res.status(500).json({ error: "Failed to remove family place" });
      }
    },
  );

  app.post(
    "/api/family/groups/:groupId/check-ins",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        const groupId = parsePositiveInt(req.params.groupId);
        if (!groupId)
          return res.status(400).json({ error: "Invalid group id" });
        if (!(await requireFamilyMembership(req, res, user, groupId))) return;
        if (!(await enforceFamilyWriteRateLimit(req, res, "family:check-ins")))
          return;

        const status = cleanText(req.body?.status, 24).toLowerCase();
        if (!CHECK_IN_STATUSES.has(status)) {
          return res.status(400).json({ error: "Invalid check-in status" });
        }

        const placeId =
          req.body?.placeId == null ? null : parsePositiveInt(req.body.placeId);
        let placeName: string | null = null;
        if (placeId !== null) {
          await ensureFamilyPlacesStorage();
          const [place] = await db
            .select({ name: familyPlaces.name })
            .from(familyPlaces)
            .where(
              and(
                eq(familyPlaces.id, placeId),
                eq(familyPlaces.groupId, groupId),
              ),
            )
            .limit(1);
          if (!place)
            return res
              .status(400)
              .json({ error: "Place not found in this family" });
          placeName = place.name;
        }

        const shareLocation = req.body?.shareLocation === true;
        const latitude = shareLocation
          ? finiteCoordinate(req.body?.latitude, -90, 90)
          : null;
        const longitude = shareLocation
          ? finiteCoordinate(req.body?.longitude, -180, 180)
          : null;
        if (
          status === "shared_location" &&
          (!shareLocation || latitude === null || longitude === null)
        ) {
          return res
            .status(400)
            .json({ error: "Location sharing requires explicit permission" });
        }
        if (status !== "shared_location" && shareLocation) {
          return res.status(400).json({
            error: "Location can only be shared with a location check-in",
          });
        }

        const locationLabel =
          status === "safe"
            ? "Safe"
            : cleanText(req.body?.locationLabel, 120) ||
              placeName ||
              "Checked in";
        const expiresAt =
          status === "shared_location"
            ? new Date(
                Date.now() +
                  cleanShareMinutes(req.body?.shareMinutes) * 60 * 1000,
              )
            : null;

        await ensureFamilyPlacesStorage();
        const [checkIn] = await db
          .insert(familyCheckIns)
          .values({
            groupId,
            userId: user.id,
            placeId,
            status,
            locationLabel,
            latitude,
            longitude,
            accuracyMeters: shareLocation
              ? cleanAccuracy(req.body?.accuracyMeters)
              : null,
            expiresAt,
          })
          .onConflictDoUpdate({
            target: [familyCheckIns.groupId, familyCheckIns.userId],
            set: {
              placeId,
              status,
              locationLabel,
              latitude,
              longitude,
              accuracyMeters: shareLocation
                ? cleanAccuracy(req.body?.accuracyMeters)
                : null,
              expiresAt,
              updatedAt: new Date(),
            },
          })
          .returning();

        await logFamilyAuditEvent({
          action: "family_check_in_updated",
          actorId: user.id,
          groupId,
          metadata: {
            status,
            placeId,
            locationShared: status === "shared_location",
            shareMinutes:
              status === "shared_location"
                ? cleanShareMinutes(req.body?.shareMinutes)
                : null,
          },
        });
        return res.status(201).json({
          id: checkIn.id,
          status: checkIn.status,
          locationLabel: checkIn.locationLabel,
          placeId: checkIn.placeId,
          expiresAt: checkIn.expiresAt,
          updatedAt: checkIn.updatedAt,
        });
      } catch (error) {
        console.error("Create family check-in error:", error);
        return res
          .status(500)
          .json({ error: "Failed to save family check-in" });
      }
    },
  );

  app.delete(
    "/api/family/groups/:groupId/check-ins/me",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        const groupId = parsePositiveInt(req.params.groupId);
        if (!groupId)
          return res.status(400).json({ error: "Invalid group id" });
        if (!(await requireFamilyMembership(req, res, user, groupId))) return;
        if (!(await enforceFamilyWriteRateLimit(req, res, "family:check-ins")))
          return;
        await ensureFamilyPlacesStorage();
        await db
          .delete(familyCheckIns)
          .where(
            and(
              eq(familyCheckIns.groupId, groupId),
              eq(familyCheckIns.userId, user.id),
            ),
          );
        await logFamilyAuditEvent({
          action: "family_check_in_cleared",
          actorId: user.id,
          groupId,
        });
        return res.status(204).send();
      } catch (error) {
        console.error("Clear family check-in error:", error);
        return res
          .status(500)
          .json({ error: "Failed to clear family check-in" });
      }
    },
  );
}
