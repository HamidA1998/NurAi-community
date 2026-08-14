import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  userProgress,
  PROGRESS_CATEGORIES,
  type ProgressCategory,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUser } from "./requestAuth";

export function registerProgressRoutes(app: Express): void {
  app.get("/api/progress", async (req: Request, res: Response) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      const rows = await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, user.id))
        .limit(1);

      if (rows.length === 0) {
        const empty: Record<string, any> = {};
        for (const cat of PROGRESS_CATEGORIES) {
          empty[cat] = {};
        }
        return res.json(empty);
      }

      const row = rows[0];
      const result: Record<string, any> = {};
      for (const cat of PROGRESS_CATEGORIES) {
        result[cat] = row[cat as keyof typeof row] ?? {};
      }
      return res.json(result);
    } catch (err) {
      console.error("GET /api/progress error:", err);
      return res.status(500).json({ error: "Failed to load progress" });
    }
  });

  app.put("/api/progress", async (req: Request, res: Response) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      const body = req.body;
      if (!body || typeof body !== "object") {
        return res.status(400).json({ error: "Invalid body" });
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };
      let hasValidCategory = false;

      for (const cat of PROGRESS_CATEGORIES) {
        if (body[cat] !== undefined) {
          updateData[cat] = body[cat];
          hasValidCategory = true;
        }
      }

      if (!hasValidCategory) {
        return res
          .status(400)
          .json({ error: "No valid progress categories provided" });
      }

      const existing = await db
        .select({ id: userProgress.id })
        .from(userProgress)
        .where(eq(userProgress.userId, user.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(userProgress).values({
          userId: user.id,
          ...updateData,
        });
      } else {
        await db
          .update(userProgress)
          .set(updateData)
          .where(eq(userProgress.userId, user.id));
      }

      return res.json({ success: true });
    } catch (err) {
      console.error("PUT /api/progress error:", err);
      return res.status(500).json({ error: "Failed to save progress" });
    }
  });

  app.put("/api/progress/:category", async (req: Request, res: Response) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      const category = req.params.category as ProgressCategory;
      if (!PROGRESS_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `Invalid category: ${category}` });
      }

      const data = req.body;
      if (data === undefined) {
        return res.status(400).json({ error: "No data provided" });
      }

      const existing = await db
        .select({ id: userProgress.id })
        .from(userProgress)
        .where(eq(userProgress.userId, user.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(userProgress).values({
          userId: user.id,
          [category]: data,
          updatedAt: new Date(),
        });
      } else {
        await db
          .update(userProgress)
          .set({
            [category]: data,
            updatedAt: new Date(),
          })
          .where(eq(userProgress.userId, user.id));
      }

      return res.json({ success: true });
    } catch (err) {
      console.error(`PUT /api/progress/${req.params.category} error:`, err);
      return res.status(500).json({ error: "Failed to save progress" });
    }
  });

  app.delete("/api/progress/:category", async (req: Request, res: Response) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      const category = req.params.category as ProgressCategory;
      if (!PROGRESS_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `Invalid category: ${category}` });
      }

      const existing = await db
        .select({ id: userProgress.id })
        .from(userProgress)
        .where(eq(userProgress.userId, user.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(userProgress).values({
          userId: user.id,
          [category]: {},
          updatedAt: new Date(),
        });
      } else {
        await db
          .update(userProgress)
          .set({
            [category]: {},
            updatedAt: new Date(),
          })
          .where(eq(userProgress.userId, user.id));
      }

      return res.json({ success: true });
    } catch (err) {
      console.error(`DELETE /api/progress/${req.params.category} error:`, err);
      return res.status(500).json({ error: "Failed to delete progress" });
    }
  });
}
