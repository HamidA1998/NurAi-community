import {
  getLibraryGuidanceAI,
  AIContextResponse,
} from "@/services/aiContextService";
import { getChapterSourceAuditWithReviews } from "@/services/librarySourceReviewService";
import { Book, Chapter, PlanType } from "@/types/library";

export interface LibraryAIParams {
  book: Book;
  chapter: Chapter;
  intent: "explain" | "reflect" | "quiz" | "apply" | "study_plan";
  question?: string;
  userPlan?: PlanType;
}

function buildSafeChapterContext(
  book: Book,
  chapter: Chapter,
  intent: LibraryAIParams["intent"],
) {
  return {
    source: "nurai_library",
    intent,
    bookId: book.id,
    bookTitle: book.title,
    bookCategory: book.category,
    requiredPlan: book.requiredPlan,
    verifiedContentStatus: book.verifiedContentStatus,
    safetyNote: book.safetyNote,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    chapterSections: chapter.sections.map((section) => ({
      type: section.type,
      heading: section.heading,
      body: section.body,
    })),
    sourceRefs: chapter.sourceRefs.map((source) => ({
      type: source.type,
      reference: source.reference,
      verified: source.verified,
      note: source.note,
      url: source.url ?? null,
    })),
    instruction:
      "Only explain using this chapter content and the verified source cards provided. Do not invent Quran, hadith, tafsir, fiqh, scholar names, or rulings. If source support is insufficient, say source support is insufficient.",
  };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function hasApprovedSourceSupport(
  book: Book,
  chapter: Chapter,
): Promise<boolean> {
  if (book.verifiedContentStatus === "published") return true;

  try {
    const audit = await getChapterSourceAuditWithReviews(book, chapter);
    return audit.status === "approved";
  } catch {
    return false;
  }
}

function buildSourceReviewResponse(
  book: Book,
  chapter: Chapter,
  userPlan?: PlanType,
): AIContextResponse {
  const actionSteps = chapter.actionSteps.length
    ? chapter.actionSteps
    : ["Choose one small action from this chapter and practise it today."];
  const response = [
    `This chapter, "${chapter.title}", is ready for careful reflection using the lesson text and the source cards shown in the reader.`,
    "For now, keep it as guided study rather than a fatwa or personal religious ruling.",
    `A useful next step is: ${actionSteps[0]}`,
  ].join("\n\n");

  return {
    success: true,
    feature: "LIBRARY",
    response,
    disclaimer:
      "This Library chapter contains educational material. If source support is insufficient for a religious ruling, ask a qualified scholar rather than treating this as a fatwa.",
    citations: chapter.sourceRefs.map((source) => ({
      type: source.type,
      reference: source.reference,
      explanation: source.note,
      url: source.url ?? null,
    })),
    sourceCoverage: "needs_source_review",
    followUpPrompts: [
      "Help me reflect on this chapter safely",
      "What is one action I can take today?",
      "Show me the source cards",
    ],
    actionSteps,
    modelTier:
      userPlan === "scholar"
        ? "scholar"
        : userPlan === "premium"
          ? "premium"
          : "free",
    needsScholar:
      book.category === "Family" ||
      book.category === "Worship" ||
      book.category === "Wealth & Work",
    warnings: [
      "Source support is limited for this chapter.",
      "Do not use this as a fatwa or independent ruling.",
    ],
    confidence: 0.48,
    metadata: {
      madhab: "not_applied",
      userLevel: "beginner",
      isRevert: false,
      wordCount: countWords(response),
    },
  };
}

export async function explainLibraryChapter(
  params: LibraryAIParams,
): Promise<AIContextResponse> {
  const hasSourceApproval = await hasApprovedSourceSupport(
    params.book,
    params.chapter,
  );

  if (!hasSourceApproval) {
    return buildSourceReviewResponse(
      params.book,
      params.chapter,
      params.userPlan,
    );
  }

  const context = buildSafeChapterContext(
    params.book,
    params.chapter,
    params.intent,
  );

  return getLibraryGuidanceAI({
    bookTitle: params.book.title,
    chapterTitle: params.chapter.title,
    verifiedContentStatus: params.book.verifiedContentStatus,
    sourceSummary: params.chapter.sourceRefs
      .map(
        (source) =>
          `${source.reference}${source.verified ? " verified" : " needs review"}`,
      )
      .join("; "),
    context,
    question:
      params.question ??
      `Explain "${params.chapter.title}" from "${params.book.title}" in a practical, source-safe way.`,
    userTier: params.userPlan,
  });
}

export function createLocalReflectionPrompt(
  book: Book,
  chapter: Chapter,
): string {
  return `What is one part of "${chapter.title}" from "${book.title}" that you can practise today?`;
}

export function createLocalStudyPlan(book: Book): string[] {
  return [
    `Read one chapter of ${book.title}.`,
    "Write one short reflection.",
    "Complete the action step before sleeping.",
    "Return tomorrow and continue from your saved progress.",
  ];
}
