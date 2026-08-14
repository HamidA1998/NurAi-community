import { createHash } from "node:crypto";
import type { Express, Request, Response } from "express";
import { desc } from "drizzle-orm";

import { LIBRARY_BOOKS } from "../client/data/libraryBooks";
import type {
  Book,
  Chapter,
  LibraryCategory,
  SourceRef,
} from "../client/types/library";
import { db } from "./db";
import { isAdminEmail } from "./admin";
import { requireAuthenticatedUser } from "./requestAuth";
import { librarySourceReviewEvents } from "@shared/schema";

const TRUSTED_SOURCE_HOSTS = new Set([
  "quran.com",
  "www.quran.com",
  "sunnah.com",
  "www.sunnah.com",
]);
const SENSITIVE_CATEGORIES = new Set<LibraryCategory>([
  "Worship",
  "Family",
  "Wealth & Work",
  "Reverts",
]);
const VALID_DECISIONS = new Set(["approved", "needs_revision"]);

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().replace(/\s+/g, " ").slice(0, maxLength);
  return clean || null;
}

function isTrustedSourceUrl(source: SourceRef): boolean {
  if (!source.url) return false;
  try {
    const url = new URL(source.url);
    return url.protocol === "https:" && TRUSTED_SOURCE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function validateSource(source: SourceRef): string[] {
  const issues: string[] = [];
  if (!source.reference.trim()) issues.push("Missing reference label.");
  if (!source.note.trim()) {
    issues.push(`${source.reference || "Source"} is missing a review note.`);
  }
  if (!source.verified) {
    issues.push(`${source.reference || "Source"} is not marked verified.`);
  }
  if (!source.url) {
    issues.push(`${source.reference || "Source"} is missing a source URL.`);
  } else if (!isTrustedSourceUrl(source)) {
    issues.push(
      `${source.reference} URL is outside the trusted Quran.com/Sunnah.com source set.`,
    );
  }
  if (
    source.type === "quran" &&
    source.url &&
    !source.url.includes("quran.com")
  ) {
    issues.push(
      `${source.reference} is marked Quran but does not link to Quran.com.`,
    );
  }
  if (
    source.type === "hadith" &&
    source.url &&
    !source.url.includes("sunnah.com")
  ) {
    issues.push(
      `${source.reference} is marked Hadith but does not link to Sunnah.com.`,
    );
  }
  return issues;
}

function sourceFingerprint(chapter: Chapter): string {
  const snapshot = chapter.sourceRefs.map((source) => ({
    id: source.id,
    type: source.type,
    reference: source.reference,
    note: source.note,
    verified: source.verified,
    url: source.url || null,
  }));
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function findChapter(
  bookId: string,
  chapterId: string,
): { book: Book; chapter: Chapter } | null {
  for (const book of LIBRARY_BOOKS) {
    if (book.id !== bookId) continue;
    const chapter = book.chapters.find(
      (candidate) => candidate.id === chapterId,
    );
    if (chapter) return { book, chapter };
  }
  return null;
}

function auditChapter(book: Book, chapter: Chapter) {
  const issues = chapter.sourceRefs.flatMap(validateSource);
  if (chapter.sourceRefs.length === 0) {
    issues.unshift("Chapter has no source cards.");
  }
  if (
    !chapter.sourceRefs.some(
      (source) =>
        source.verified &&
        (source.type === "quran" || source.type === "hadith"),
    )
  ) {
    issues.unshift(
      "Chapter needs at least one verified Quran or Hadith anchor.",
    );
  }

  return {
    bookTitle: book.title,
    chapterTitle: chapter.title,
    category: book.category,
    sourceFingerprint: sourceFingerprint(chapter),
    sourceCount: chapter.sourceRefs.length,
    verifiedSourceCount: chapter.sourceRefs.filter((source) => source.verified)
      .length,
    trustedUrlCount: chapter.sourceRefs.filter(isTrustedSourceUrl).length,
    missingUrlCount: chapter.sourceRefs.filter((source) => !source.url).length,
    needsScholarReview: SENSITIVE_CATEGORIES.has(book.category),
    issues,
  };
}

function eventToRecord(event: typeof librarySourceReviewEvents.$inferSelect) {
  return {
    id: `${event.bookId}:${event.chapterId}`,
    bookId: event.bookId,
    chapterId: event.chapterId,
    decision: event.decision,
    reviewerName: event.reviewerLabel,
    note: event.note || undefined,
    reviewedAt: event.createdAt.toISOString(),
    sourceFingerprint: event.sourceFingerprint,
    serverBacked: true,
  };
}

async function requireScholarReviewer(req: Request, res: Response) {
  const user = await requireAuthenticatedUser(req, res);
  if (!user) return null;

  if (!isAdminEmail(user.email)) {
    res.status(403).json({
      error: "Admin reviewer access is required to approve sources.",
    });
    return null;
  }

  return { user, plan: "admin" };
}

export function registerLibrarySourceReviewRoutes(app: Express): void {
  app.get("/api/library/source-reviews", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      const events = await db
        .select()
        .from(librarySourceReviewEvents)
        .orderBy(desc(librarySourceReviewEvents.createdAt))
        .limit(2000);
      const latestByChapter = new Map<string, (typeof events)[number]>();
      for (const event of events) {
        const key = `${event.bookId}:${event.chapterId}`;
        if (!latestByChapter.has(key)) latestByChapter.set(key, event);
      }

      res.json({
        reviews: Array.from(latestByChapter.values()).map(eventToRecord),
      });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to load source reviews",
      });
    }
  });

  app.post("/api/library/source-reviews", async (req, res) => {
    try {
      const reviewer = await requireScholarReviewer(req, res);
      if (!reviewer) return;

      const bookId = cleanText(req.body?.bookId, 120);
      const chapterId = cleanText(req.body?.chapterId, 120);
      const decision = cleanText(req.body?.decision, 32);
      const note = cleanText(req.body?.note, 1000);
      if (
        !bookId ||
        !chapterId ||
        !decision ||
        !VALID_DECISIONS.has(decision)
      ) {
        return res.status(400).json({
          error: "bookId, chapterId, and a valid decision are required.",
        });
      }
      if (!note || note.length < 24) {
        return res.status(400).json({
          error:
            "Review notes are required before saving a Library source review decision.",
        });
      }

      const target = findChapter(bookId, chapterId);
      if (!target) {
        return res.status(404).json({ error: "Library chapter not found." });
      }

      const audit = auditChapter(target.book, target.chapter);
      if (decision === "approved" && audit.issues.length > 0) {
        return res.status(409).json({
          error: "Source issues must be fixed before approval.",
          issues: audit.issues,
        });
      }

      const [event] = await db
        .insert(librarySourceReviewEvents)
        .values({
          bookId,
          chapterId,
          decision,
          reviewerId: reviewer.user.id,
          reviewerPlan: reviewer.plan,
          reviewerLabel:
            reviewer.user.displayName ||
            reviewer.user.username ||
            "NurAI Scholar Review",
          note,
          sourceFingerprint: audit.sourceFingerprint,
          sourceIssueCount: audit.issues.length,
          sourceCount: audit.sourceCount,
          verifiedSourceCount: audit.verifiedSourceCount,
          metadata: {
            bookTitle: audit.bookTitle,
            chapterTitle: audit.chapterTitle,
            category: audit.category,
            trustedUrlCount: audit.trustedUrlCount,
            missingUrlCount: audit.missingUrlCount,
            needsScholarReview: audit.needsScholarReview,
            issues: audit.issues,
          },
        })
        .returning();

      res.status(201).json({
        review: eventToRecord(event),
        audit: {
          sourceIssueCount: audit.issues.length,
          sourceCount: audit.sourceCount,
          verifiedSourceCount: audit.verifiedSourceCount,
          needsScholarReview: audit.needsScholarReview,
        },
      });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to save source review",
      });
    }
  });
}
