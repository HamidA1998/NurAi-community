import type { Book } from "../../client/types/library";

export const QUALITY_CHECKLIST_FIELDS = [
  "titleAndPromiseAccurate",
  "chapterContentComplete",
  "sourcesRelevantAndSpecific",
  "noUnsupportedClaims",
  "exercisesUsefulAndSafe",
  "audienceAndToneApproved",
] as const;
export type QualityChecklistKey = (typeof QUALITY_CHECKLIST_FIELDS)[number];

export const QUALITY_CHECKLIST_FIELD_LABELS: Record<
  QualityChecklistKey,
  string
> = {
  titleAndPromiseAccurate: "Title, subtitle, and product promise are accurate",
  chapterContentComplete: "All chapters are complete and coherent",
  sourcesRelevantAndSpecific:
    "Source cards are relevant, specific, and attached to supported claims",
  noUnsupportedClaims:
    "No unsupported religious, medical, legal, or outcome claims remain",
  exercisesUsefulAndSafe:
    "Reflection, action, and quiz items are useful and safe",
  audienceAndToneApproved:
    "Audience level, tone, and safety boundaries are approved",
};

const SENSITIVE_BOOK_TERMS = [
  "fiqh",
  "zakat",
  "marriage",
  "women",
  "hajj",
  "umrah",
  "hadith",
  "purification",
  "wudu",
  "business",
  "wealth",
] as const;

export function normalized(text: string) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function hasRealText(value: unknown) {
  if (!hasText(value)) return false;
  const lower = value.trim().toLowerCase();
  return ![
    "to" + "do",
    "tbd",
    "n/a",
    "na",
    "replace-me",
    "placeholder",
    "example",
    "unknown",
  ].some((marker) => lower === marker || lower.includes(`[${marker}]`));
}

export function validPastOrPresentDate(value: unknown) {
  if (!hasText(value)) return false;
  const text = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return false;
  const parsed = Date.parse(text);
  return !Number.isNaN(parsed) && parsed <= Date.now() + 24 * 60 * 60 * 1000;
}

export function hasReviewStage(
  reviewer: unknown,
  reviewedAt: unknown,
  notes: unknown,
) {
  return (
    hasRealText(reviewer) &&
    validPastOrPresentDate(reviewedAt) &&
    hasRealText(notes)
  );
}

export function qualityChecklistComplete(evidence: unknown) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return false;
  }
  const checklist = (evidence as { qualityChecklist?: unknown })
    .qualityChecklist;
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    return false;
  }
  const values = checklist as Record<string, unknown>;
  return QUALITY_CHECKLIST_FIELDS.every((field) => values[field] === true);
}

export function isSensitiveBook(book: Book) {
  const text = normalized(
    [
      book.title,
      book.subtitle,
      book.description,
      book.category,
      ...book.tags,
    ].join(" "),
  );
  return SENSITIVE_BOOK_TERMS.some((term) => text.includes(term));
}

export function hasQualifiedScholarReview(evidence: unknown) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return false;
  }
  const record = evidence as {
    qualifiedScholarReviewer?: unknown;
    qualifiedScholarReviewedAt?: unknown;
    scholarNotes?: unknown;
    scholarReviewScope?: unknown;
  };
  return (
    hasReviewStage(
      record.qualifiedScholarReviewer,
      record.qualifiedScholarReviewedAt,
      record.scholarNotes,
    ) &&
    hasRealText(record.scholarReviewScope) &&
    String(record.scholarReviewScope).trim().length >= 40
  );
}
