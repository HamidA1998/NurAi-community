import { getBooks } from "@/services/libraryService";
import type { Book, LibraryCategory, UserBookProgress } from "@/types/library";

export type PremiumLibraryCollectionTone = "primary" | "scholar";

export type PremiumLibraryCollection = {
  id: string;
  title: string;
  subtitle: string;
  curatorLabel: string;
  sourceLabel: string;
  reviewBoundaryLabel: string;
  progressLabel: string;
  totalMinutesLabel: string;
  nextActionLabel: string;
  categories: LibraryCategory[];
  proofChips: string[];
  tone: PremiumLibraryCollectionTone;
  books: Book[];
  featuredBook?: Book;
  completedBooks: number;
  totalBooks: number;
  progress: number;
  verifiedSourceCount: number;
  totalSourceCount: number;
};

export type PremiumLibraryCollectionShelfSummary = {
  title: string;
  statusLabel: string;
  body: string;
  boundaryLabel: string;
  totalCollections: number;
  totalBooks: number;
  totalVerifiedSources: number;
  totalSources: number;
  nextActionLabel: string;
};

type CollectionConfig = {
  id: string;
  title: string;
  subtitle: string;
  curatorLabel: string;
  categories: LibraryCategory[];
  maxBooks: number;
  proofChips: string[];
  tone: PremiumLibraryCollectionTone;
};

const COLLECTION_CONFIGS: CollectionConfig[] = [
  {
    id: "quran-starter-shelf",
    title: "Quran Starter Shelf",
    subtitle: "Meaning, reflection, Arabic awareness, and calm reading habits",
    curatorLabel: "Curated for Quran consistency",
    categories: ["Quran", "Arabic", "Hifz"],
    maxBooks: 6,
    proofChips: ["Quran focus", "Arabic bridge", "Reflection"],
    tone: "scholar",
  },
  {
    id: "worship-rhythm-shelf",
    title: "Worship Rhythm Shelf",
    subtitle: "Prayer, purification, dua, Ramadan, and sustainable routines",
    curatorLabel: "Curated for daily worship",
    categories: ["Worship", "Ramadan", "Duas & Dhikr"],
    maxBooks: 7,
    proofChips: ["Salah", "Dua", "Ramadan"],
    tone: "primary",
  },
  {
    id: "family-learning-shelf",
    title: "Family Learning Shelf",
    subtitle: "Home adab, children, youth questions, and gentle study",
    curatorLabel: "Curated for home learning",
    categories: ["Family", "Youth & Modern Struggles"],
    maxBooks: 6,
    proofChips: ["Family-safe", "Youth care", "Adab"],
    tone: "scholar",
  },
  {
    id: "character-practice-shelf",
    title: "Character Practice Shelf",
    subtitle: "Hadith, adab, self-discipline, and daily practice prompts",
    curatorLabel: "Curated for lived character",
    categories: ["Character", "Self-Discipline", "Duas & Dhikr"],
    maxBooks: 7,
    proofChips: ["Adab", "Habits", "Practice"],
    tone: "primary",
  },
];

function collectionBooks(config: CollectionConfig) {
  const seen = new Set<string>();
  return getBooks()
    .filter((book) => config.categories.includes(book.category))
    .filter((book) => {
      if (seen.has(book.id)) return false;
      seen.add(book.id);
      return true;
    })
    .sort((a, b) => a.estimatedMinutes - b.estimatedMinutes)
    .slice(0, config.maxBooks);
}

function sourceCounts(books: Book[]) {
  return books.reduce(
    (totals, book) => {
      for (const chapter of book.chapters) {
        totals.total += chapter.sourceRefs.length;
        totals.verified += chapter.sourceRefs.filter(
          (source) => source.verified,
        ).length;
      }
      return totals;
    },
    { verified: 0, total: 0 },
  );
}

function progressForBooks(
  books: Book[],
  progressByBook: Record<string, UserBookProgress>,
) {
  if (books.length === 0) return { completedBooks: 0, progress: 0 };
  const completedBooks = books.filter(
    (book) => (progressByBook[book.id]?.progressPercentage ?? 0) >= 100,
  ).length;
  const progress = Math.round(
    books.reduce(
      (sum, book) => sum + (progressByBook[book.id]?.progressPercentage ?? 0),
      0,
    ) / books.length,
  );
  return { completedBooks, progress };
}

export function buildPremiumLibraryCollections(
  progressByBook: Record<string, UserBookProgress> = {},
): PremiumLibraryCollection[] {
  return COLLECTION_CONFIGS.map((config) => {
    const books = collectionBooks(config);
    const { completedBooks, progress } = progressForBooks(
      books,
      progressByBook,
    );
    const { total, verified } = sourceCounts(books);
    const totalMinutes = books.reduce(
      (sum, book) => sum + book.estimatedMinutes,
      0,
    );
    const featuredBook =
      books.find(
        (book) => (progressByBook[book.id]?.progressPercentage ?? 0) < 100,
      ) ?? books[0];

    return {
      id: config.id,
      title: config.title,
      subtitle: config.subtitle,
      curatorLabel: config.curatorLabel,
      sourceLabel:
        total > 0
          ? `${verified}/${total} source cards verified`
          : "Source cards pending",
      reviewBoundaryLabel:
        "Collection shelves guide learning; they are not publication, certificate, or scholar-review proof.",
      progressLabel: `${completedBooks}/${books.length} books complete`,
      totalMinutesLabel: `${Math.max(totalMinutes, 0)} min path`,
      nextActionLabel: featuredBook
        ? `Open ${featuredBook.title}`
        : "Open Library",
      categories: config.categories,
      proofChips: config.proofChips,
      tone: config.tone,
      books,
      featuredBook,
      completedBooks,
      totalBooks: books.length,
      progress,
      verifiedSourceCount: verified,
      totalSourceCount: total,
    };
  }).filter((collection) => collection.totalBooks > 0);
}

export function buildPremiumLibraryCollectionShelfSummary(
  collections: PremiumLibraryCollection[],
): PremiumLibraryCollectionShelfSummary {
  const totalBooks = collections.reduce(
    (sum, collection) => sum + collection.totalBooks,
    0,
  );
  const totalSources = collections.reduce(
    (sum, collection) => sum + collection.totalSourceCount,
    0,
  );
  const totalVerifiedSources = collections.reduce(
    (sum, collection) => sum + collection.verifiedSourceCount,
    0,
  );
  const activeCollection =
    collections.find((collection) => collection.progress < 100) ??
    collections[0];

  return {
    title: "Curated book collections",
    statusLabel: `${collections.length} premium shelves`,
    body: `${totalBooks} books grouped into Quran, worship, family, and character learning shelves.`,
    boundaryLabel:
      "Collections organize study and source visibility; final publication or scholar-reviewed claims still require recorded human review evidence.",
    totalCollections: collections.length,
    totalBooks,
    totalVerifiedSources,
    totalSources,
    nextActionLabel: activeCollection
      ? activeCollection.nextActionLabel
      : "Open Library",
  };
}
