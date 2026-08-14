import crypto from "node:crypto";

import type { Book } from "../../client/types/library";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

function reviewableBookSnapshot(book: Book) {
  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    description: book.description,
    authorName: book.authorName,
    provenanceLabel: book.provenanceLabel,
    contentOrigin: book.contentOrigin,
    category: book.category,
    difficulty: book.difficulty,
    estimatedMinutes: book.estimatedMinutes,
    requiredPlan: book.requiredPlan,
    previewChapterIds: book.previewChapterIds,
    coverVariant: book.coverVariant,
    tags: book.tags,
    featured: Boolean(book.featured),
    recommended: Boolean(book.recommended),
    safetyNote: book.safetyNote,
    chapters: book.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      subtitle: chapter.subtitle,
      estimatedMinutes: chapter.estimatedMinutes,
      sections: chapter.sections,
      reflectionQuestions: chapter.reflectionQuestions,
      actionSteps: chapter.actionSteps,
      quiz: chapter.quiz,
      sourceRefs: chapter.sourceRefs,
      audioScript: chapter.audioScript || "",
    })),
  };
}

export function computeBookContentHash(book: Book) {
  const canonical = JSON.stringify(stableValue(reviewableBookSnapshot(book)));
  return `sha256:${crypto.createHash("sha256").update(canonical).digest("hex")}`;
}
