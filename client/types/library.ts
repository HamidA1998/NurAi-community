export type PlanType = "free" | "premium" | "scholar";

export type LibraryCategory =
  | "Quran"
  | "Arabic"
  | "Worship"
  | "Duas & Dhikr"
  | "Self-Discipline"
  | "Family"
  | "Character"
  | "Wealth & Work"
  | "Reverts"
  | "Ramadan"
  | "Hifz"
  | "Akhirah"
  | "Youth & Modern Struggles";

export type BookDifficulty = "beginner" | "intermediate" | "advanced";

export type BookCoverAccent =
  | "emerald"
  | "gold"
  | "blue"
  | "rose"
  | "purple"
  | "slate";

export type BookCoverMotif =
  | "quran"
  | "fatihah"
  | "arabic"
  | "roots"
  | "salah"
  | "purification"
  | "morning"
  | "habits"
  | "dua"
  | "dhikr"
  | "marriage"
  | "parenting"
  | "adab"
  | "anger"
  | "wealth"
  | "business"
  | "revert"
  | "dawah"
  | "ramadan"
  | "laylatul-qadr"
  | "hifz"
  | "akhirah"
  | "purpose"
  | "attention"
  | "modesty"
  | "sabr"
  | "tawbah"
  | "identity"
  | "women"
  | "charity"
  | "zakat"
  | "hajj"
  | "seerah"
  | "hadith"
  | "fiqh"
  | "children"
  | "community"
  | "student"
  | "focus";

export interface BookCoverDesign {
  accent: BookCoverAccent;
  motif: BookCoverMotif;
  eyebrow: string;
  seal: string;
  edition: string;
}

export type VerifiedContentStatus =
  | "needs_review"
  | "user_original"
  | "scholar_review_ready"
  | "published";

export type BookContentOrigin = "nurai_exclusive_original";

export type BookSectionType =
  | "lesson"
  | "reflection"
  | "action"
  | "dua"
  | "quran"
  | "hadith"
  | "source";

export interface SourceRef {
  id: string;
  type: "quran" | "hadith" | "tafsir" | "fiqh" | "seerah" | "scholar_review";
  reference: string;
  note: string;
  verified: boolean;
  url?: string | null;
}

export interface BookSection {
  heading: string;
  body: string;
  type: BookSectionType;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface LibraryReviewEvidence {
  approvedForPublication?: boolean;
  contentHash?: string;
  qualityChecklist?: {
    titleAndPromiseAccurate?: boolean;
    chapterContentComplete?: boolean;
    sourcesRelevantAndSpecific?: boolean;
    noUnsupportedClaims?: boolean;
    exercisesUsefulAndSafe?: boolean;
    audienceAndToneApproved?: boolean;
  };
  editorialReviewer?: string;
  editorialReviewedAt?: string;
  editorialNotes?: string;
  sourceReviewer?: string;
  sourceReviewedAt?: string;
  sourceNotes?: string;
  qualifiedScholarReviewer?: string;
  qualifiedScholarReviewedAt?: string;
  scholarReviewScope?: string;
  scholarNotes?: string;
  publishApprover?: string;
  publishApprovedAt?: string;
  publishNotes?: string;
}

export interface Chapter {
  id: string;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  sections: BookSection[];
  reflectionQuestions: string[];
  actionSteps: string[];
  quiz: QuizQuestion[];
  sourceRefs: SourceRef[];
  audioScript?: string;
}

export interface Book {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  authorName: string;
  provenanceLabel: string;
  contentOrigin: BookContentOrigin;
  category: LibraryCategory;
  difficulty: BookDifficulty;
  estimatedMinutes: number;
  requiredPlan: PlanType;
  previewChapterIds: string[];
  coverVariant: BookCoverAccent;
  coverDesign: BookCoverDesign;
  chapters: Chapter[];
  tags: string[];
  featured?: boolean;
  recommended?: boolean;
  verifiedContentStatus: VerifiedContentStatus;
  reviewEvidence?: LibraryReviewEvidence;
  safetyNote: string;
}

export interface UserBookProgress {
  bookId: string;
  currentChapterId?: string;
  completedChapters: string[];
  bookmarks: string[];
  reflections: Record<string, string>;
  readingPositions: Record<
    string,
    {
      scrollY: number;
      contentHeight: number;
      viewportHeight: number;
      progressPercentage: number;
      updatedAt: string;
    }
  >;
  highlights: {
    id: string;
    chapterId: string;
    sectionHeading: string;
    excerpt: string;
    createdAt: string;
  }[];
  completedAt?: string;
  updatedAt: string;
  progressPercentage: number;
}

export interface LibraryProgressSummary {
  booksStarted: number;
  booksCompleted: number;
  reflectionsCompleted: number;
  badgesEarned: number;
  currentStudyStreak: number;
  longestStudyStreak: number;
  studyDaysTracked: number;
  lastStudyDateLabel: string;
  streakRecoveryLabel: string;
  streakSourceBoundaryLabel: string;
  totalProgressPercentage: number;
}
