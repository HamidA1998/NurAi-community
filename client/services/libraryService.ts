import { LIBRARY_BOOKS, LIBRARY_CATEGORIES } from "@/data/libraryBooks";
import type { Book, LibraryCategory, UserBookProgress } from "@/types/library";

export type DailyLibraryStudy = {
  book: Book;
  progress?: UserBookProgress;
  title: string;
  subtitle: string;
  reason: string;
  ctaLabel: string;
  nextChapterTitle?: string;
  progressPercentage: number;
};

export function getBooks(): Book[] {
  return LIBRARY_BOOKS;
}

export function getFeaturedBooks(): Book[] {
  return LIBRARY_BOOKS.filter((book) => book.featured);
}

export function getRecommendedBooks(): Book[] {
  return LIBRARY_BOOKS.filter(
    (book) => book.recommended || book.requiredPlan === "free",
  ).slice(0, 12);
}

function hasStartedBook(progress: UserBookProgress): boolean {
  return (
    !!progress.currentChapterId ||
    progress.completedChapters.length > 0 ||
    progress.bookmarks.length > 0 ||
    Object.keys(progress.reflections).length > 0
  );
}

function getDayIndex(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function getNextChapterTitle(
  book: Book,
  progress?: UserBookProgress,
): string | undefined {
  if (!progress?.currentChapterId) return book.chapters[0]?.title;
  return (
    book.chapters.find((chapter) => chapter.id === progress.currentChapterId)
      ?.title ?? book.chapters[0]?.title
  );
}

export function getDailyLibraryStudy(
  progressByBook: Record<string, UserBookProgress> = {},
  date = new Date(),
): DailyLibraryStudy {
  const activeProgress = Object.values(progressByBook)
    .filter(
      (progress) =>
        hasStartedBook(progress) && progress.progressPercentage < 100,
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];
  const activeBook = activeProgress
    ? getBookById(activeProgress.bookId)
    : undefined;

  if (activeBook) {
    const nextChapterTitle = getNextChapterTitle(activeBook, activeProgress);
    return {
      book: activeBook,
      progress: activeProgress,
      title: "Continue your study",
      subtitle: nextChapterTitle
        ? `Next: ${nextChapterTitle}`
        : activeBook.subtitle,
      reason: "Picked from your saved library progress",
      ctaLabel: "Continue",
      nextChapterTitle,
      progressPercentage: activeProgress.progressPercentage,
    };
  }

  const candidates = getRecommendedBooks();
  const book =
    candidates[getDayIndex(date) % Math.max(candidates.length, 1)] ??
    LIBRARY_BOOKS[0];
  return {
    book,
    title: "Today's study",
    subtitle: book.chapters[0]?.title ?? book.subtitle,
    reason: "Rotates through source-anchored library paths",
    ctaLabel: "Start reading",
    nextChapterTitle: book.chapters[0]?.title,
    progressPercentage: 0,
  };
}

export function getFreePreviewBooks(): Book[] {
  return LIBRARY_BOOKS.filter((book) => book.previewChapterIds.length > 0);
}

export function getBooksByCategory(category: LibraryCategory): Book[] {
  return LIBRARY_BOOKS.filter((book) => book.category === category);
}

export function getBookById(bookId: string): Book | undefined {
  return LIBRARY_BOOKS.find((book) => book.id === bookId);
}

export function getLibraryCategories(): LibraryCategory[] {
  return LIBRARY_CATEGORIES;
}

export function searchLibraryBooks(query: string): Book[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return LIBRARY_BOOKS;
  return LIBRARY_BOOKS.filter((book) => {
    const haystack = [
      book.title,
      book.subtitle,
      book.description,
      book.category,
      ...book.tags,
      ...book.chapters.map((chapter) => chapter.title),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}
