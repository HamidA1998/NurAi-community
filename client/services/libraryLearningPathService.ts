import { getBooks } from "@/services/libraryService";
import type {
  Book,
  LibraryCategory,
  UserBookProgress,
  VerifiedContentStatus,
} from "@/types/library";

export type GuidedLibraryPathTone = "primary" | "scholar";

export type GuidedLibraryPath = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  meta: string;
  weeklyCadenceLabel: string;
  nextActionLabel: string;
  certificateStatus: string;
  sourceStandardLabel: string;
  reviewReadinessScore: number;
  reviewHandoffLabel: string;
  reviewHandoffBody: string;
  reviewHandoffChecklist: string[];
  nextReviewActionLabel: string;
  icon: "book-open" | "award" | "users" | "sunrise";
  tone: GuidedLibraryPathTone;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  reflectionCount: number;
  reviewLabel: string;
  reviewBody: string;
  certificateLabel: string;
  stages: GuidedLibraryPathStage[];
  categories: LibraryCategory[];
  books: Book[];
  nextBook?: Book;
  nextStudySession?: GuidedLibraryPathStudySession;
  weeklyPlan: GuidedLibraryPathWeeklyPlan;
  studyContract: GuidedLibraryPathStudyContract;
  reviewContract: GuidedLibraryPathReviewContract;
  certificateGate: GuidedLibraryPathCertificateGate;
  claimBoundary: GuidedLibraryPathClaimBoundary;
  readinessCockpit: GuidedLibraryPathReadinessCockpit;
  evidenceLadder: GuidedLibraryPathEvidenceLadderStep[];
  proofReceipts: GuidedLibraryPathProofReceipt[];
};

export type GuidedLibraryPathStage = {
  id: string;
  label: string;
  detail: string;
  status: "complete" | "active" | "locked";
  bookCount: number;
};

export type GuidedLibraryPathSessionStep = {
  id: string;
  label: string;
  detail: string;
  status: "done" | "active" | "pending";
};

export type GuidedLibraryPathStudySession = {
  id: string;
  pathTitle: string;
  sessionLabel: string;
  title: string;
  subtitle: string;
  chapterTitle: string;
  estimatedMinutes: number;
  sourceCheckLabel: string;
  reflectionPrompt: string;
  actionLabel: string;
  steps: GuidedLibraryPathSessionStep[];
};

export type GuidedLibraryPathWeeklyPlanStep = {
  id: string;
  label: string;
  detail: string;
  status: "done" | "active" | "pending";
  icon: "book-open" | "shield" | "edit-3" | "repeat" | "award";
};

export type GuidedLibraryPathWeeklyPlan = {
  id: string;
  title: string;
  subtitle: string;
  readinessLabel: string;
  totalEstimatedMinutes: number;
  steps: GuidedLibraryPathWeeklyPlanStep[];
};

export type GuidedLibraryPathCertificateRequirement = {
  id: "lessons" | "reflections" | "source_review" | "publication_evidence";
  label: string;
  detail: string;
  complete: boolean;
  icon: "book-open" | "edit-3" | "shield" | "award";
};

export type GuidedLibraryPathCertificateGate = {
  title: string;
  statusLabel: string;
  summary: string;
  readyForDisplay: boolean;
  nextProofActionLabel: string;
  requirements: GuidedLibraryPathCertificateRequirement[];
};

export type GuidedLibraryPathClaimBoundary = {
  title: string;
  statusLabel: string;
  learnerClaimLabel: string;
  pendingClaimLabel: string;
  publicClaimGuardrail: string;
};

export type GuidedLibraryPathStudyContractCheckpoint = {
  id: "lesson" | "source" | "reflection" | "certificate";
  label: string;
  detail: string;
  complete: boolean;
  icon: "book-open" | "shield" | "edit-3" | "award";
};

export type GuidedLibraryPathStudyContract = {
  title: string;
  statusLabel: string;
  commitmentLabel: string;
  weeklyTimeLabel: string;
  learnerPromise: string;
  reviewPromise: string;
  publicBoundary: string;
  nextProofActionLabel: string;
  checkpoints: GuidedLibraryPathStudyContractCheckpoint[];
};

export type GuidedLibraryPathReviewContractItem = {
  id: string;
  label: string;
  detail: string;
  statusLabel: string;
  icon: "book-open" | "edit-3" | "shield" | "award" | "lock";
  tone: "primary" | "scholar" | "danger";
};

export type GuidedLibraryPathReviewContract = {
  title: string;
  statusLabel: string;
  summary: string;
  acceptedEvidenceTitle: string;
  rejectedClaimsTitle: string;
  nextVerificationTitle: string;
  publicBoundary: string;
  acceptedEvidence: GuidedLibraryPathReviewContractItem[];
  rejectedClaims: GuidedLibraryPathReviewContractItem[];
  nextVerification: GuidedLibraryPathReviewContractItem[];
};

export type GuidedLibraryPathEvidenceLadderStep = {
  id:
    | "study_progress"
    | "source_review"
    | "qualified_review"
    | "publication_gate";
  label: string;
  detail: string;
  statusLabel: string;
  complete: boolean;
  tone: "primary" | "scholar" | "danger";
  icon: "book-open" | "shield" | "award" | "lock";
};

export type GuidedLibraryPathProofReceipt = {
  id: "study" | "reflection" | "source-review" | "certificate-claim";
  title: string;
  evidenceLabel: string;
  saveLabel: string;
  boundaryLabel: string;
  actionLabel: string;
  icon: "book-open" | "edit-3" | "shield" | "award";
  tone: "primary" | "scholar" | "danger";
};

export type GuidedLibraryPathReadinessCockpitRow = {
  id: "next_lesson" | "source_review" | "certificate_gate" | "claim_boundary";
  label: string;
  detail: string;
  statusLabel: string;
  actionLabel: string;
  icon: "book-open" | "shield" | "award" | "lock";
  tone: "primary" | "scholar" | "danger";
};

export type GuidedLibraryPathReadinessCockpit = {
  title: string;
  statusLabel: string;
  headline: string;
  body: string;
  nextActionLabel: string;
  boundaryLabel: string;
  rows: GuidedLibraryPathReadinessCockpitRow[];
};

export type GuidedLibraryCommandCenterStat = {
  id: "active_paths" | "lessons_ready" | "review_gates";
  label: string;
  value: string;
  detail: string;
  icon: "map" | "book-open" | "shield";
  tone: "primary" | "scholar" | "danger";
};

export type GuidedLibraryCommandCenterPathChip = {
  id: string;
  title: string;
  statusLabel: string;
  actionLabel: string;
  progress: number;
  active: boolean;
  tone: GuidedLibraryPathTone;
};

export type GuidedLibraryCommandCenter = {
  title: string;
  statusLabel: string;
  headline: string;
  body: string;
  nextActionLabel: string;
  progressLabel: string;
  proofGapLabel: string;
  sourceBoundaryLabel: string;
  certificateBoundaryLabel: string;
  activePathId?: string;
  focusPathTitle?: string;
  focusBookId?: string;
  stats: GuidedLibraryCommandCenterStat[];
  pathChips: GuidedLibraryCommandCenterPathChip[];
};

export type GuidedLibraryPathReviewPacketShareContext = {
  reviewerUseLabel?: string;
  generatedAtLabel?: string;
};

type PathConfig = {
  id: string;
  title: string;
  subtitle: string;
  icon: GuidedLibraryPath["icon"];
  tone: GuidedLibraryPathTone;
  categories: LibraryCategory[];
  maxBooks: number;
  certificateName: string;
  weeklyCadenceLabel: string;
  stageLabels: [string, string, string];
};

const PATH_CONFIGS: PathConfig[] = [
  {
    id: "quran-foundations",
    title: "Quran Foundations",
    subtitle: "Meaning, Arabic awareness, reflection, and safe source limits",
    icon: "book-open",
    tone: "scholar",
    categories: ["Quran", "Arabic", "Hifz"],
    maxBooks: 7,
    certificateName: "Quran Foundations certificate",
    weeklyCadenceLabel: "4 lessons weekly",
    stageLabels: [
      "Read with calm",
      "Understand the words",
      "Reflect with sources",
    ],
  },
  {
    id: "daily-character",
    title: "Prophetic Character",
    subtitle: "Hadith, adab, habits, and practice prompts for daily conduct",
    icon: "award",
    tone: "primary",
    categories: ["Character", "Duas & Dhikr", "Self-Discipline"],
    maxBooks: 12,
    certificateName: "Character path certificate",
    weeklyCadenceLabel: "3 lessons weekly",
    stageLabels: ["Adab foundation", "Daily practice", "Reflection habit"],
  },
  {
    id: "family-deen",
    title: "Family Deen",
    subtitle: "Gentle study for home, children, relationships, and adab",
    icon: "users",
    tone: "scholar",
    categories: ["Family", "Youth & Modern Struggles"],
    maxBooks: 8,
    certificateName: "Family Deen certificate",
    weeklyCadenceLabel: "2 family sessions weekly",
    stageLabels: ["Home rhythm", "Kids and youth", "Family reflection"],
  },
  {
    id: "worship-rhythm",
    title: "Worship Rhythm",
    subtitle: "Prayer, purification, Ramadan, dua, and sustainable routines",
    icon: "sunrise",
    tone: "primary",
    categories: ["Worship", "Ramadan", "Duas & Dhikr"],
    maxBooks: 10,
    certificateName: "Worship rhythm certificate",
    weeklyCadenceLabel: "5 small worship steps weekly",
    stageLabels: ["Salah anchor", "Purification care", "Dua and Ramadan"],
  },
];

function pathBooks(config: PathConfig): Book[] {
  const seen = new Set<string>();
  return getBooks()
    .filter((book) => config.categories.includes(book.category))
    .filter((book) => {
      if (seen.has(book.id)) return false;
      seen.add(book.id);
      return true;
    })
    .sort((a, b) => {
      if (a.requiredPlan !== b.requiredPlan) {
        const planWeight = { free: 0, premium: 1, scholar: 2 };
        return planWeight[a.requiredPlan] - planWeight[b.requiredPlan];
      }
      return a.estimatedMinutes - b.estimatedMinutes;
    })
    .slice(0, config.maxBooks);
}

function statusWeight(status: VerifiedContentStatus) {
  if (status === "published") return 3;
  if (status === "scholar_review_ready") return 2;
  if (status === "user_original") return 1;
  return 0;
}

function reviewCopy(books: Book[]) {
  const lowestStatus = books.reduce<VerifiedContentStatus>(
    (lowest, book) =>
      statusWeight(book.verifiedContentStatus) < statusWeight(lowest)
        ? book.verifiedContentStatus
        : lowest,
    "published",
  );
  const sensitiveCount = books.filter((book) =>
    ["Worship", "Family", "Wealth & Work", "Reverts"].includes(book.category),
  ).length;

  if (lowestStatus === "published") {
    return {
      badge: "Published path",
      reviewLabel: "Published",
      reviewBody:
        "This path has completed publication review evidence in the library metadata.",
    };
  }

  if (lowestStatus === "scholar_review_ready") {
    return {
      badge:
        sensitiveCount > 0 ? "Scholar review ready" : "Source review ready",
      reviewLabel: "Review-ready",
      reviewBody:
        sensitiveCount > 0
          ? `${sensitiveCount} high-care book(s) still need qualified sign-off before final claims.`
          : "Source cards are attached; human review evidence is still required before publication claims.",
    };
  }

  return {
    badge: "Source-anchored",
    reviewLabel: "Learning draft",
    reviewBody:
      "Use this path for learning while final editorial and source review evidence is completed.",
  };
}

function sourceStandardLabel(books: Book[]) {
  const sourceCount = books.reduce(
    (sum, book) =>
      sum +
      book.chapters.reduce(
        (chapterSum, chapter) => chapterSum + chapter.sourceRefs.length,
        0,
      ),
    0,
  );
  const highCareCount = books.filter((book) =>
    ["Worship", "Family", "Wealth & Work", "Reverts"].includes(book.category),
  ).length;

  if (highCareCount > 0) {
    return `${highCareCount} high-care book(s) need qualified sign-off`;
  }
  return `${sourceCount} source card(s) to verify`;
}

function isHighCareBook(book: Book) {
  return ["Worship", "Family", "Wealth & Work", "Reverts"].includes(
    book.category,
  );
}

function hasReviewEvidenceText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length >= 3;
}

function hasReviewEvidenceDate(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function hasReviewSignoff(params: {
  reviewer?: unknown;
  reviewedAt?: unknown;
  notes?: unknown;
}): boolean {
  return (
    hasReviewEvidenceText(params.reviewer) &&
    hasReviewEvidenceDate(params.reviewedAt) &&
    hasReviewEvidenceText(params.notes)
  );
}

function hasCompleteQualityChecklist(
  evidence: Book["reviewEvidence"],
): boolean {
  const checklist = evidence?.qualityChecklist;

  return Boolean(
    checklist?.titleAndPromiseAccurate &&
      checklist.chapterContentComplete &&
      checklist.sourcesRelevantAndSpecific &&
      checklist.noUnsupportedClaims &&
      checklist.exercisesUsefulAndSafe &&
      checklist.audienceAndToneApproved,
  );
}

function pathPublicationEvidenceIssues(book: Book): string[] {
  const evidence = book.reviewEvidence;

  if (!evidence) {
    return [
      "editorial review evidence",
      "source relevance review evidence",
      "complete quality checklist",
      "approved publication flag",
      "content hash",
      "publication approver/date",
      ...(isHighCareBook(book)
        ? ["qualified scholar review scope and notes"]
        : []),
    ];
  }

  const issues = [
    !hasReviewSignoff({
      reviewer: evidence.editorialReviewer,
      reviewedAt: evidence.editorialReviewedAt,
      notes: evidence.editorialNotes,
    })
      ? "editorial review evidence"
      : null,
    !hasReviewSignoff({
      reviewer: evidence.sourceReviewer,
      reviewedAt: evidence.sourceReviewedAt,
      notes: evidence.sourceNotes,
    })
      ? "source relevance review evidence"
      : null,
    !hasCompleteQualityChecklist(evidence)
      ? "complete quality checklist"
      : null,
    evidence.approvedForPublication !== true
      ? "approved publication flag"
      : null,
    !hasReviewEvidenceText(evidence.contentHash) ? "content hash" : null,
    !hasReviewSignoff({
      reviewer: evidence.publishApprover,
      reviewedAt: evidence.publishApprovedAt,
      notes: evidence.publishNotes,
    })
      ? "publication approver/date"
      : null,
    isHighCareBook(book) &&
    (!hasReviewSignoff({
      reviewer: evidence.qualifiedScholarReviewer,
      reviewedAt: evidence.qualifiedScholarReviewedAt,
      notes: evidence.scholarNotes,
    }) ||
      !hasReviewEvidenceText(evidence.scholarReviewScope))
      ? "qualified scholar review scope and notes"
      : null,
  ];

  return issues.filter((issue): issue is string => Boolean(issue));
}

function hasPathPublicationEvidence(book: Book) {
  return pathPublicationEvidenceIssues(book).length === 0;
}

function buildReviewHandoff(books: Book[]) {
  const totalSourceRefs = books.reduce(
    (sum, book) =>
      sum +
      book.chapters.reduce(
        (chapterSum, chapter) => chapterSum + chapter.sourceRefs.length,
        0,
      ),
    0,
  );
  const verifiedSourceRefs = books.reduce(
    (sum, book) =>
      sum +
      book.chapters.reduce(
        (chapterSum, chapter) =>
          chapterSum +
          chapter.sourceRefs.filter((source) => source.verified).length,
        0,
      ),
    0,
  );
  const highCareBooks = books.filter(isHighCareBook);
  const reviewReadyBooks = books.filter(
    (book) => book.verifiedContentStatus === "scholar_review_ready",
  );
  const publishedBooks = books.filter(hasPathPublicationEvidence);
  const strictPublicationIssues = books.flatMap((book) =>
    pathPublicationEvidenceIssues(book).map(
      (issue) => `${book.title}: ${issue}`,
    ),
  );
  const sourceCoverage =
    totalSourceRefs === 0
      ? 0
      : Math.round((verifiedSourceRefs / totalSourceRefs) * 100);
  const publicationCoverage =
    books.length === 0
      ? 0
      : Math.round((publishedBooks.length / books.length) * 100);
  const reviewReadinessScore = Math.min(
    100,
    Math.round(sourceCoverage * 0.55 + publicationCoverage * 0.45),
  );
  const nextReviewActionLabel =
    highCareBooks.length > 0
      ? "Prepare scholar sign-off packet"
      : reviewReadyBooks.length > 0
        ? "Prepare source review packet"
        : "Finish editorial source checks";

  return {
    reviewReadinessScore,
    reviewHandoffLabel:
      reviewReadinessScore >= 100
        ? "Publication evidence complete"
        : "Review handoff needed",
    reviewHandoffBody:
      reviewReadinessScore >= 100
        ? "Every book in this path has strict publication evidence recorded."
        : `${publishedBooks.length}/${books.length} book(s) have strict publication evidence; ${strictPublicationIssues.length} review evidence issue(s) remain.`,
    reviewHandoffChecklist: [
      `${verifiedSourceRefs}/${totalSourceRefs} source refs verified`,
      `${reviewReadyBooks.length} book(s) queued as review-ready`,
      `${publishedBooks.length}/${books.length} strict publication evidence complete`,
      strictPublicationIssues[0]
        ? `First missing proof: ${strictPublicationIssues[0]}`
        : "Strict evidence gate clear",
    ],
    nextReviewActionLabel,
  };
}

function buildStages(
  config: PathConfig,
  books: Book[],
  progressByBook: Record<string, UserBookProgress>,
): GuidedLibraryPathStage[] {
  const chunkSize = Math.max(
    1,
    Math.ceil(books.length / config.stageLabels.length),
  );
  return config.stageLabels.map((label, index) => {
    const stageBooks = books.slice(index * chunkSize, (index + 1) * chunkSize);
    const completed =
      stageBooks.length > 0 &&
      stageBooks.every(
        (book) => (progressByBook[book.id]?.progressPercentage ?? 0) >= 100,
      );
    const previousComplete =
      index === 0 ||
      books
        .slice(0, index * chunkSize)
        .every(
          (book) => (progressByBook[book.id]?.progressPercentage ?? 0) >= 100,
        );
    const status: GuidedLibraryPathStage["status"] = completed
      ? "complete"
      : previousComplete
        ? "active"
        : "locked";
    const firstBook = stageBooks[0];

    return {
      id: `${config.id}-stage-${index + 1}`,
      label,
      detail: firstBook
        ? `${stageBooks.length} book(s), starts with ${firstBook.title}`
        : "Stage opens when more books are added",
      status,
      bookCount: stageBooks.length,
    };
  });
}

function nextChapterForSession(
  book: Book,
  progress?: UserBookProgress,
): Book["chapters"][number] | undefined {
  if (progress?.currentChapterId) {
    const currentChapter = book.chapters.find(
      (chapter) => chapter.id === progress.currentChapterId,
    );
    if (
      currentChapter &&
      !progress.completedChapters.includes(currentChapter.id)
    ) {
      return currentChapter;
    }
  }

  return (
    book.chapters.find(
      (chapter) => !progress?.completedChapters.includes(chapter.id),
    ) ?? book.chapters[0]
  );
}

function buildNextStudySession(
  config: PathConfig,
  book: Book,
  progress?: UserBookProgress,
): GuidedLibraryPathStudySession {
  const chapter = nextChapterForSession(book, progress);
  const sourceRefs = chapter?.sourceRefs ?? [];
  const verifiedSourceRefs = sourceRefs.filter((source) => source.verified);
  const chapterCompleted = chapter
    ? (progress?.completedChapters.includes(chapter.id) ?? false)
    : false;
  const reflectionSaved = chapter
    ? Boolean(progress?.reflections?.[chapter.id])
    : false;
  const sourceCheckComplete =
    sourceRefs.length > 0 && verifiedSourceRefs.length === sourceRefs.length;
  const sessionLabel =
    progress && progress.progressPercentage > 0
      ? "Continue guided session"
      : "Start guided session";
  const sourceCheckLabel =
    sourceRefs.length > 0
      ? `${verifiedSourceRefs.length}/${sourceRefs.length} source refs verified`
      : "Source refs still need attachment";

  return {
    id: `${config.id}-${book.id}-${chapter?.id ?? "intro"}`,
    pathTitle: config.title,
    sessionLabel,
    title: book.title,
    subtitle: book.subtitle,
    chapterTitle: chapter?.title ?? "Opening lesson",
    estimatedMinutes: chapter?.estimatedMinutes ?? book.estimatedMinutes,
    sourceCheckLabel,
    reflectionPrompt:
      chapter?.reflectionQuestions[0] ??
      "Write one reflection before moving to the next lesson.",
    actionLabel:
      progress && progress.progressPercentage > 0 ? "Continue" : "Begin",
    steps: [
      {
        id: "read",
        label: "Read",
        detail: chapter?.title ?? "Open the first lesson",
        status: chapterCompleted ? "done" : "active",
      },
      {
        id: "sources",
        label: "Source check",
        detail: sourceCheckLabel,
        status: sourceCheckComplete
          ? "done"
          : chapterCompleted
            ? "active"
            : "pending",
      },
      {
        id: "reflect",
        label: "Reflect",
        detail: reflectionSaved ? "Reflection saved" : "Save one note",
        status: reflectionSaved
          ? "done"
          : chapterCompleted
            ? "active"
            : "pending",
      },
    ],
  };
}

function buildWeeklyPlan(params: {
  config: PathConfig;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  reflectionCount: number;
  reviewReadinessScore: number;
  nextStudySession?: GuidedLibraryPathStudySession;
}): GuidedLibraryPathWeeklyPlan {
  const {
    completedLessons,
    config,
    nextStudySession,
    progress,
    reflectionCount,
    reviewReadinessScore,
    totalLessons,
  } = params;
  const readingComplete = progress >= 100;
  const sourceReady = reviewReadinessScore >= 100;
  const hasReflection = reflectionCount > 0;
  const certificateReady = readingComplete && sourceReady;
  const remainingLessons = Math.max(0, totalLessons - completedLessons);
  const sessionMinutes = nextStudySession?.estimatedMinutes ?? 10;
  const totalEstimatedMinutes = sessionMinutes + 18;
  const nextLessonLabel = nextStudySession
    ? `${nextStudySession.chapterTitle} in ${nextStudySession.title}`
    : "Open the next path lesson";

  return {
    id: `${config.id}-weekly-plan`,
    title:
      progress >= 100
        ? `${config.title}: review week`
        : `${config.title}: this week`,
    subtitle:
      progress >= 100
        ? "Review your evidence before certificate claims."
        : `${remainingLessons} lesson(s) left; keep reading, checking sources, and reflecting.`,
    readinessLabel: certificateReady
      ? "Ready after sign-off"
      : sourceReady
        ? "Study complete, review next"
        : progress >= 50
          ? "Momentum building"
          : "Start the path",
    totalEstimatedMinutes,
    steps: [
      {
        id: "read-next",
        label: "Read next",
        detail: nextLessonLabel,
        status: readingComplete ? "done" : "active",
        icon: "book-open",
      },
      {
        id: "source-check",
        label: "Check sources",
        detail:
          reviewReadinessScore >= 100
            ? "Source and publication evidence complete"
            : `${reviewReadinessScore}% review readiness; keep claims pending`,
        status: sourceReady ? "done" : readingComplete ? "active" : "pending",
        icon: "shield",
      },
      {
        id: "reflect",
        label: "Reflect",
        detail:
          reflectionCount > 0
            ? `${reflectionCount} reflection(s) saved on this path`
            : "Save one reflection before the next lesson",
        status: hasReflection ? "done" : readingComplete ? "active" : "pending",
        icon: "edit-3",
      },
      {
        id: "review-handoff",
        label: "Review handoff",
        detail:
          reviewReadinessScore >= 100
            ? "Evidence is ready to attach to handoff"
            : "Prepare source and scholar review notes",
        status: sourceReady ? "done" : progress > 0 ? "active" : "pending",
        icon: "repeat",
      },
      {
        id: "certificate-proof",
        label: "Certificate proof",
        detail: certificateReady
          ? "Certificate can be shown after sign-off"
          : "Certificate stays pending review sign-off",
        status: certificateReady ? "done" : "pending",
        icon: "award",
      },
    ],
  };
}

function buildCertificateGate(params: {
  books: Book[];
  certificateName: string;
  completedLessons: number;
  totalLessons: number;
  reflectionCount: number;
  reviewReadinessScore: number;
}): GuidedLibraryPathCertificateGate {
  const {
    books,
    certificateName,
    completedLessons,
    reflectionCount,
    reviewReadinessScore,
    totalLessons,
  } = params;
  const lessonsComplete = totalLessons > 0 && completedLessons >= totalLessons;
  const requiredReflections = Math.min(3, Math.max(1, books.length));
  const reflectionsComplete = reflectionCount >= requiredReflections;
  const sourceReviewComplete = reviewReadinessScore >= 100;
  const publicationEvidenceIssues = books.flatMap((book) =>
    pathPublicationEvidenceIssues(book),
  );
  const publicationEvidenceComplete =
    books.length > 0 && publicationEvidenceIssues.length === 0;
  const readyForDisplay =
    lessonsComplete &&
    reflectionsComplete &&
    sourceReviewComplete &&
    publicationEvidenceComplete;
  const requirements: GuidedLibraryPathCertificateRequirement[] = [
    {
      id: "lessons",
      label: "Lessons complete",
      detail: `${completedLessons}/${totalLessons} lessons completed`,
      complete: lessonsComplete,
      icon: "book-open",
    },
    {
      id: "reflections",
      label: "Reflection proof",
      detail: `${reflectionCount}/${requiredReflections} required reflection(s) saved`,
      complete: reflectionsComplete,
      icon: "edit-3",
    },
    {
      id: "source_review",
      label: "Source review",
      detail: `${reviewReadinessScore}% review readiness`,
      complete: sourceReviewComplete,
      icon: "shield",
    },
    {
      id: "publication_evidence",
      label: "Publication evidence",
      detail: publicationEvidenceComplete
        ? "Strict review evidence is attached"
        : `Human review evidence is still required; ${publicationEvidenceIssues.length} strict evidence issue(s) remain`,
      complete: publicationEvidenceComplete,
      icon: "award",
    },
  ];
  const nextIncomplete = requirements.find(
    (requirement) => !requirement.complete,
  );

  return {
    title: certificateName,
    statusLabel: readyForDisplay
      ? "Certificate proof ready"
      : "Certificate locked by proof gates",
    summary: readyForDisplay
      ? "This certificate can be displayed after final sign-off evidence is preserved."
      : "NurAI keeps certificates pending until study progress, reflections, source checks, and review evidence are complete.",
    readyForDisplay,
    nextProofActionLabel: nextIncomplete
      ? `Next proof: ${nextIncomplete.label}`
      : "Attach final sign-off evidence",
    requirements,
  };
}

function buildClaimBoundary(params: {
  config: PathConfig;
  certificateGate: GuidedLibraryPathCertificateGate;
  completedLessons: number;
  totalLessons: number;
  reviewReadinessScore: number;
}): GuidedLibraryPathClaimBoundary {
  const {
    certificateGate,
    completedLessons,
    config,
    reviewReadinessScore,
    totalLessons,
  } = params;
  const lessonsComplete = totalLessons > 0 && completedLessons >= totalLessons;

  if (certificateGate.readyForDisplay) {
    return {
      title: `${config.title} claim boundary`,
      statusLabel: "Proof-ready after final sign-off",
      learnerClaimLabel:
        "You may show completed study progress with the attached review evidence.",
      pendingClaimLabel:
        "Keep reviewer names, dates, content hashes, and quality checklist evidence current.",
      publicClaimGuardrail:
        "Do not imply wider scholarly endorsement beyond the recorded review scope.",
    };
  }

  return {
    title: `${config.title} claim boundary`,
    statusLabel: lessonsComplete
      ? "Study complete, claims pending"
      : "Learning progress only",
    learnerClaimLabel: lessonsComplete
      ? "You may say the lessons are complete in your personal study history."
      : `${completedLessons}/${totalLessons} lesson(s) complete in this path.`,
    pendingClaimLabel:
      reviewReadinessScore >= 100
        ? "Certificate display still waits for publication evidence and sign-off preservation."
        : "Certificate, publication, and scholar-reviewed claims stay pending.",
    publicClaimGuardrail:
      "Do not call this path certified, published, or qualified-review complete until the certificate proof gate is complete.",
  };
}

function buildStudyContract(params: {
  config: PathConfig;
  completedLessons: number;
  totalLessons: number;
  reflectionCount: number;
  reviewReadinessScore: number;
  weeklyPlan: GuidedLibraryPathWeeklyPlan;
  certificateGate: GuidedLibraryPathCertificateGate;
  claimBoundary: GuidedLibraryPathClaimBoundary;
}): GuidedLibraryPathStudyContract {
  const {
    certificateGate,
    claimBoundary,
    completedLessons,
    config,
    reflectionCount,
    reviewReadinessScore,
    totalLessons,
    weeklyPlan,
  } = params;
  const lessonsComplete = totalLessons > 0 && completedLessons >= totalLessons;
  const sourceReady = reviewReadinessScore >= 100;
  const hasReflection = reflectionCount > 0;

  return {
    title: `${config.title} study contract`,
    statusLabel: claimBoundary.statusLabel,
    commitmentLabel: config.weeklyCadenceLabel,
    weeklyTimeLabel: `${weeklyPlan.totalEstimatedMinutes} min this week`,
    learnerPromise:
      "Read the assigned lesson, check the attached sources, save one reflection, and keep public claims modest.",
    reviewPromise:
      "NurAI keeps certificate, publication, and scholar-reviewed labels locked until the evidence gates pass.",
    publicBoundary:
      "This path is a learning contract, not a certificate, publication, or scholar-review claim until proof gates pass.",
    nextProofActionLabel: certificateGate.nextProofActionLabel,
    checkpoints: [
      {
        id: "lesson",
        label: "Lesson progress",
        detail: `${completedLessons}/${totalLessons} lesson(s) complete`,
        complete: lessonsComplete,
        icon: "book-open",
      },
      {
        id: "source",
        label: "Source evidence",
        detail: `${reviewReadinessScore}% review readiness`,
        complete: sourceReady,
        icon: "shield",
      },
      {
        id: "reflection",
        label: "Reflection saved",
        detail:
          reflectionCount > 0
            ? `${reflectionCount} reflection(s) saved`
            : "Save one personal reflection",
        complete: hasReflection,
        icon: "edit-3",
      },
      {
        id: "certificate",
        label: "Certificate proof",
        detail: certificateGate.statusLabel,
        complete: certificateGate.readyForDisplay,
        icon: "award",
      },
    ],
  };
}

function buildReviewContract(params: {
  books: Book[];
  config: PathConfig;
  completedLessons: number;
  totalLessons: number;
  reflectionCount: number;
  reviewReadinessScore: number;
  certificateGate: GuidedLibraryPathCertificateGate;
  claimBoundary: GuidedLibraryPathClaimBoundary;
  nextStudySession?: GuidedLibraryPathStudySession;
}): GuidedLibraryPathReviewContract {
  const {
    books,
    certificateGate,
    claimBoundary,
    completedLessons,
    config,
    nextStudySession,
    reflectionCount,
    reviewReadinessScore,
    totalLessons,
  } = params;
  const totalSourceRefs = books.reduce(
    (sum, book) =>
      sum +
      book.chapters.reduce(
        (chapterSum, chapter) => chapterSum + chapter.sourceRefs.length,
        0,
      ),
    0,
  );
  const verifiedSourceRefs = books.reduce(
    (sum, book) =>
      sum +
      book.chapters.reduce(
        (chapterSum, chapter) =>
          chapterSum +
          chapter.sourceRefs.filter((source) => source.verified).length,
        0,
      ),
    0,
  );
  const highCareBooks = books.filter(isHighCareBook);
  const publicationEvidenceBooks = books.filter(hasPathPublicationEvidence);
  const strictPublicationIssues = books.flatMap((book) =>
    pathPublicationEvidenceIssues(book),
  );
  const lessonsComplete = totalLessons > 0 && completedLessons >= totalLessons;
  const reviewPacketStatus =
    reviewReadinessScore >= 100
      ? "Review packet can be assembled"
      : "Review packet incomplete";

  return {
    title: `${config.title} review contract`,
    statusLabel: certificateGate.readyForDisplay
      ? "Review evidence display-ready"
      : "Human review evidence still required",
    summary:
      "NurAI separates learning activity from source review, qualified sign-off, and public certificate claims.",
    acceptedEvidenceTitle: "Accepted learning evidence",
    rejectedClaimsTitle: "Claims NurAI will not make yet",
    nextVerificationTitle: "Next verification work",
    publicBoundary:
      "Library path progress may guide personal study; it is not proof of publication, certification, or scholar review until recorded human review evidence is attached.",
    acceptedEvidence: [
      {
        id: "lesson-progress",
        label: "Lesson progress",
        detail: `${completedLessons}/${totalLessons} lesson(s) completed in this path`,
        statusLabel: lessonsComplete ? "Study complete" : "Learning active",
        icon: "book-open",
        tone: "primary",
      },
      {
        id: "reflection-notes",
        label: "Reflection notes",
        detail:
          reflectionCount > 0
            ? `${reflectionCount} reflection(s) saved for personal review`
            : "No reflection notes saved yet",
        statusLabel: reflectionCount > 0 ? "Personal evidence" : "Needs notes",
        icon: "edit-3",
        tone: reflectionCount > 0 ? "primary" : "scholar",
      },
      {
        id: "source-coverage",
        label: "Source card coverage",
        detail: `${verifiedSourceRefs}/${totalSourceRefs} source refs verified`,
        statusLabel:
          totalSourceRefs > 0 && verifiedSourceRefs === totalSourceRefs
            ? "Source cards attached"
            : "Source cards pending",
        icon: "shield",
        tone:
          totalSourceRefs > 0 && verifiedSourceRefs === totalSourceRefs
            ? "primary"
            : "scholar",
      },
    ],
    rejectedClaims: [
      {
        id: "qualified-review",
        label: "Qualified review complete",
        detail:
          highCareBooks.length > 0
            ? `${highCareBooks.length} high-care book(s) still require qualified sign-off`
            : "Qualified review still requires recorded reviewer evidence",
        statusLabel: "Do not claim",
        icon: "award",
        tone: "danger",
      },
      {
        id: "published-library",
        label: "Published Library content",
        detail: `${publicationEvidenceBooks.length}/${books.length} book(s) passed strict publication evidence; ${strictPublicationIssues.length} issue(s) remain`,
        statusLabel: "Keep locked",
        icon: "lock",
        tone: "danger",
      },
      {
        id: "certificate-complete",
        label: "Certificate complete",
        detail: certificateGate.statusLabel,
        statusLabel: certificateGate.readyForDisplay
          ? "Proof-ready"
          : "Do not display",
        icon: "award",
        tone: certificateGate.readyForDisplay ? "primary" : "danger",
      },
    ],
    nextVerification: [
      {
        id: "finish-current-lesson",
        label: nextStudySession
          ? `Verify ${nextStudySession.chapterTitle}`
          : "Verify next lesson",
        detail: nextStudySession
          ? nextStudySession.sourceCheckLabel
          : "Open the next study session and confirm source status",
        statusLabel: "Next study proof",
        icon: "book-open",
        tone: "primary",
      },
      {
        id: "assemble-review-packet",
        label: "Assemble review packet",
        detail: `${reviewReadinessScore}% review readiness; preserve sources, hashes, reviewer scope, dates, and missing publication evidence`,
        statusLabel: reviewPacketStatus,
        icon: "shield",
        tone: reviewReadinessScore >= 100 ? "primary" : "scholar",
      },
      {
        id: "preserve-public-boundary",
        label: "Preserve public boundary",
        detail: claimBoundary.publicClaimGuardrail,
        statusLabel: "Required before public claim",
        icon: "lock",
        tone: "danger",
      },
    ],
  };
}

function buildEvidenceLadder(params: {
  books: Book[];
  completedLessons: number;
  totalLessons: number;
  reflectionCount: number;
  reviewReadinessScore: number;
  certificateGate: GuidedLibraryPathCertificateGate;
}): GuidedLibraryPathEvidenceLadderStep[] {
  const {
    books,
    certificateGate,
    completedLessons,
    reflectionCount,
    reviewReadinessScore,
    totalLessons,
  } = params;
  const lessonsComplete = totalLessons > 0 && completedLessons >= totalLessons;
  const sourceReviewComplete = reviewReadinessScore >= 100;
  const highCareBooks = books.filter(isHighCareBook);
  const qualifiedReviewIssues = highCareBooks.flatMap((book) =>
    pathPublicationEvidenceIssues(book).filter(
      (issue) => issue === "qualified scholar review scope and notes",
    ),
  );
  const qualifiedReviewComplete = qualifiedReviewIssues.length === 0;
  const publicationEvidenceIssues = books.flatMap((book) =>
    pathPublicationEvidenceIssues(book),
  );
  const publicationEvidenceComplete =
    books.length > 0 && publicationEvidenceIssues.length === 0;

  return [
    {
      id: "study_progress",
      label: "Study progress",
      detail: `${completedLessons}/${totalLessons} lesson(s), ${reflectionCount} reflection(s) saved`,
      statusLabel: lessonsComplete ? "Study complete" : "Learning active",
      complete: lessonsComplete,
      tone: lessonsComplete ? "primary" : "scholar",
      icon: "book-open",
    },
    {
      id: "source_review",
      label: "Source review",
      detail: `${reviewReadinessScore}% review readiness across this path`,
      statusLabel: sourceReviewComplete
        ? "Source proof complete"
        : "Source proof pending",
      complete: sourceReviewComplete,
      tone: sourceReviewComplete ? "primary" : "scholar",
      icon: "shield",
    },
    {
      id: "qualified_review",
      label: "Qualified review",
      detail:
        highCareBooks.length > 0
          ? `${highCareBooks.length} high-care book(s) require qualified sign-off`
          : "No high-care books require extra scholar sign-off in this path",
      statusLabel: qualifiedReviewComplete
        ? "Qualified review clear"
        : "Scholar sign-off pending",
      complete: qualifiedReviewComplete,
      tone: qualifiedReviewComplete ? "primary" : "danger",
      icon: "award",
    },
    {
      id: "publication_gate",
      label: "Publication gate",
      detail: publicationEvidenceComplete
        ? "Publication evidence is attached for every book"
        : `Certificate and scholar-reviewed labels stay locked until publication evidence is attached; ${publicationEvidenceIssues.length} strict evidence issue(s) remain`,
      statusLabel: certificateGate.readyForDisplay
        ? "Certificate display ready"
        : "Public claim locked",
      complete: certificateGate.readyForDisplay,
      tone: certificateGate.readyForDisplay ? "primary" : "danger",
      icon: "lock",
    },
  ];
}

function buildProofReceipts(params: {
  completedLessons: number;
  totalLessons: number;
  reflectionCount: number;
  reviewReadinessScore: number;
  nextStudySession?: GuidedLibraryPathStudySession;
  certificateGate: GuidedLibraryPathCertificateGate;
  claimBoundary: GuidedLibraryPathClaimBoundary;
}): GuidedLibraryPathProofReceipt[] {
  const {
    certificateGate,
    claimBoundary,
    completedLessons,
    nextStudySession,
    reflectionCount,
    reviewReadinessScore,
    totalLessons,
  } = params;

  return [
    {
      id: "study",
      title: "Study proof",
      evidenceLabel: `${completedLessons}/${totalLessons} lesson(s) complete`,
      saveLabel: nextStudySession
        ? `Read ${nextStudySession.chapterTitle} and save progress.`
        : "Open the next lesson and save reading progress.",
      boundaryLabel:
        "Study progress is personal learning evidence, not publication or scholar-review proof.",
      actionLabel: nextStudySession?.actionLabel ?? "Open lesson",
      icon: "book-open",
      tone: "primary",
    },
    {
      id: "reflection",
      title: "Reflection proof",
      evidenceLabel: `${reflectionCount} reflection(s) saved on this path`,
      saveLabel: nextStudySession
        ? nextStudySession.reflectionPrompt
        : "Save one reflection before certificate claims.",
      boundaryLabel:
        "Reflection notes support learning history; they do not approve source quality.",
      actionLabel: "Save reflection",
      icon: "edit-3",
      tone: "scholar",
    },
    {
      id: "source-review",
      title: "Source review proof",
      evidenceLabel: `${reviewReadinessScore}% source and publication review readiness`,
      saveLabel:
        reviewReadinessScore >= 100
          ? "Attach the current review evidence to the handoff."
          : "Prepare source and scholar review notes before stronger claims.",
      boundaryLabel:
        "Source cards and review handoffs must stay separate from final human approval evidence.",
      actionLabel: "Review sources",
      icon: "shield",
      tone: reviewReadinessScore >= 100 ? "primary" : "scholar",
    },
    {
      id: "certificate-claim",
      title: "Certificate claim",
      evidenceLabel: certificateGate.statusLabel,
      saveLabel: certificateGate.nextProofActionLabel,
      boundaryLabel: claimBoundary.publicClaimGuardrail,
      actionLabel: certificateGate.readyForDisplay
        ? "Show certificate"
        : "Keep locked",
      icon: "award",
      tone: certificateGate.readyForDisplay ? "primary" : "danger",
    },
  ];
}

function buildReadinessCockpit(params: {
  config: PathConfig;
  progress: number;
  reviewReadinessScore: number;
  nextStudySession?: GuidedLibraryPathStudySession;
  reviewHandoffLabel: string;
  nextReviewActionLabel: string;
  certificateGate: GuidedLibraryPathCertificateGate;
  claimBoundary: GuidedLibraryPathClaimBoundary;
}): GuidedLibraryPathReadinessCockpit {
  const {
    certificateGate,
    claimBoundary,
    config,
    nextReviewActionLabel,
    nextStudySession,
    progress,
    reviewHandoffLabel,
    reviewReadinessScore,
  } = params;
  const hasNextLesson = Boolean(nextStudySession);
  const sourceReady = reviewReadinessScore >= 100;
  const statusLabel = certificateGate.readyForDisplay
    ? "Proof gates ready for final sign-off"
    : progress === 0
      ? "Start path before proof claims"
      : "Study proof building";
  const nextActionLabel = hasNextLesson
    ? nextStudySession!.actionLabel
    : certificateGate.nextProofActionLabel;

  return {
    title: `${config.title} readiness cockpit`,
    statusLabel,
    headline: hasNextLesson
      ? `Continue with ${nextStudySession!.chapterTitle}`
      : certificateGate.readyForDisplay
        ? "Attach final review evidence before display"
        : "Prepare the next proof before certificate claims",
    body: "This cockpit turns path progress into one next action while keeping source review, human approval, and certificate claims separate.",
    nextActionLabel,
    boundaryLabel:
      "Path readiness is study guidance only; it is not publication, certificate display, qualified review, or scholar approval evidence.",
    rows: [
      {
        id: "next_lesson",
        label: "Next lesson",
        detail: hasNextLesson
          ? `${nextStudySession!.sessionLabel}: ${nextStudySession!.chapterTitle}`
          : "No next lesson is selected; review proof gates before claiming completion.",
        statusLabel: hasNextLesson
          ? nextStudySession!.actionLabel
          : "Review proof",
        actionLabel: nextActionLabel,
        icon: "book-open",
        tone: hasNextLesson ? "primary" : "scholar",
      },
      {
        id: "source_review",
        label: "Source review",
        detail: `${reviewReadinessScore}% review readiness. ${reviewHandoffLabel}`,
        statusLabel: sourceReady
          ? "Source proof ready"
          : "Source proof pending",
        actionLabel: nextReviewActionLabel,
        icon: "shield",
        tone: sourceReady ? "primary" : "scholar",
      },
      {
        id: "certificate_gate",
        label: "Certificate gate",
        detail: certificateGate.summary,
        statusLabel: certificateGate.statusLabel,
        actionLabel: certificateGate.nextProofActionLabel,
        icon: "award",
        tone: certificateGate.readyForDisplay ? "primary" : "danger",
      },
      {
        id: "claim_boundary",
        label: "Public claim boundary",
        detail: claimBoundary.publicClaimGuardrail,
        statusLabel: claimBoundary.statusLabel,
        actionLabel: "Keep claims modest",
        icon: "lock",
        tone: "danger",
      },
    ],
  };
}

export function buildGuidedLibraryPaths(
  progressByBook: Record<string, UserBookProgress>,
): GuidedLibraryPath[] {
  return PATH_CONFIGS.map((config) => {
    const books = pathBooks(config);
    const totalLessons = books.reduce(
      (sum, book) => sum + book.chapters.length,
      0,
    );
    const completedLessons = books.reduce((sum, book) => {
      const progress = progressByBook[book.id];
      return sum + (progress?.completedChapters.length ?? 0);
    }, 0);
    const reflectionCount = books.reduce((sum, book) => {
      const progress = progressByBook[book.id];
      return sum + Object.keys(progress?.reflections ?? {}).length;
    }, 0);
    const progress =
      totalLessons === 0
        ? 0
        : Math.min(100, Math.round((completedLessons / totalLessons) * 100));
    const nextBook =
      books.find(
        (book) => (progressByBook[book.id]?.progressPercentage ?? 0) < 100,
      ) ?? books[0];
    const review = reviewCopy(books);
    const reviewHandoff = buildReviewHandoff(books);
    const stages = buildStages(config, books, progressByBook);
    const certificateLabel =
      progress >= 100
        ? `${config.certificateName} ready after review sign-off`
        : `${Math.max(0, totalLessons - completedLessons)} lesson(s) left`;
    const certificateStatus =
      progress >= 100
        ? "Certificate pending review sign-off"
        : `${progress}% toward certificate readiness`;
    const nextActionLabel = nextBook
      ? progressByBook[nextBook.id]?.progressPercentage
        ? `Continue ${nextBook.title}`
        : `Start ${nextBook.title}`
      : `Open ${config.categories[0]}`;
    const nextStudySession = nextBook
      ? buildNextStudySession(config, nextBook, progressByBook[nextBook.id])
      : undefined;
    const weeklyPlan = buildWeeklyPlan({
      config,
      progress,
      completedLessons,
      totalLessons,
      reflectionCount,
      reviewReadinessScore: reviewHandoff.reviewReadinessScore,
      nextStudySession,
    });
    const certificateGate = buildCertificateGate({
      books,
      certificateName: config.certificateName,
      completedLessons,
      totalLessons,
      reflectionCount,
      reviewReadinessScore: reviewHandoff.reviewReadinessScore,
    });
    const claimBoundary = buildClaimBoundary({
      config,
      certificateGate,
      completedLessons,
      totalLessons,
      reviewReadinessScore: reviewHandoff.reviewReadinessScore,
    });
    const studyContract = buildStudyContract({
      config,
      completedLessons,
      totalLessons,
      reflectionCount,
      reviewReadinessScore: reviewHandoff.reviewReadinessScore,
      weeklyPlan,
      certificateGate,
      claimBoundary,
    });
    const reviewContract = buildReviewContract({
      books,
      config,
      completedLessons,
      totalLessons,
      reflectionCount,
      reviewReadinessScore: reviewHandoff.reviewReadinessScore,
      certificateGate,
      claimBoundary,
      nextStudySession,
    });
    const evidenceLadder = buildEvidenceLadder({
      books,
      completedLessons,
      totalLessons,
      reflectionCount,
      reviewReadinessScore: reviewHandoff.reviewReadinessScore,
      certificateGate,
    });
    const proofReceipts = buildProofReceipts({
      completedLessons,
      totalLessons,
      reflectionCount,
      reviewReadinessScore: reviewHandoff.reviewReadinessScore,
      nextStudySession,
      certificateGate,
      claimBoundary,
    });
    const readinessCockpit = buildReadinessCockpit({
      config,
      progress,
      reviewReadinessScore: reviewHandoff.reviewReadinessScore,
      nextStudySession,
      reviewHandoffLabel: reviewHandoff.reviewHandoffLabel,
      nextReviewActionLabel: reviewHandoff.nextReviewActionLabel,
      certificateGate,
      claimBoundary,
    });

    return {
      id: config.id,
      title: config.title,
      subtitle: config.subtitle,
      badge: review.badge,
      meta: `${books.length} books · ${totalLessons} lessons`,
      weeklyCadenceLabel: config.weeklyCadenceLabel,
      nextActionLabel,
      certificateStatus,
      sourceStandardLabel: sourceStandardLabel(books),
      reviewReadinessScore: reviewHandoff.reviewReadinessScore,
      reviewHandoffLabel: reviewHandoff.reviewHandoffLabel,
      reviewHandoffBody: reviewHandoff.reviewHandoffBody,
      reviewHandoffChecklist: reviewHandoff.reviewHandoffChecklist,
      nextReviewActionLabel: reviewHandoff.nextReviewActionLabel,
      icon: config.icon,
      tone: config.tone,
      progress,
      completedLessons,
      totalLessons,
      reflectionCount,
      reviewLabel: review.reviewLabel,
      reviewBody: review.reviewBody,
      certificateLabel,
      stages,
      categories: config.categories,
      books,
      nextBook,
      nextStudySession,
      weeklyPlan,
      studyContract,
      reviewContract,
      certificateGate,
      claimBoundary,
      readinessCockpit,
      evidenceLadder,
      proofReceipts,
    };
  });
}

export function buildGuidedLibraryCommandCenter(
  paths: GuidedLibraryPath[],
): GuidedLibraryCommandCenter {
  const focusPath =
    paths.find((path) => path.progress > 0 && path.progress < 100) ??
    paths.find((path) => path.progress < 100) ??
    paths[0];
  const totalLessons = paths.reduce((sum, path) => sum + path.totalLessons, 0);
  const completedLessons = paths.reduce(
    (sum, path) => sum + path.completedLessons,
    0,
  );
  const activePaths = paths.filter((path) => path.progress > 0).length;
  const reviewGatesPending = paths.filter(
    (path) => !path.certificateGate.readyForDisplay,
  ).length;
  const lessonsReady = paths.filter((path) => path.nextStudySession).length;
  const focusAction =
    focusPath?.readinessCockpit.nextActionLabel ??
    focusPath?.nextActionLabel ??
    "Choose a path";

  return {
    title: "Guided Path Command Center",
    statusLabel: focusPath
      ? `${focusPath.progress}% through ${focusPath.title}`
      : "No path selected",
    headline: focusPath
      ? focusPath.readinessCockpit.headline
      : "Choose a guided Library path",
    body: focusPath
      ? `${focusPath.weeklyCadenceLabel}. ${focusPath.weeklyPlan.readinessLabel}.`
      : "Pick a Quran, character, family, or worship path to turn books into a weekly learning rhythm.",
    nextActionLabel: focusAction,
    progressLabel: `${completedLessons}/${totalLessons} guided lesson(s) complete`,
    proofGapLabel:
      reviewGatesPending > 0
        ? `${reviewGatesPending} certificate gate(s) still need proof`
        : "All certificate gates are proof-ready after sign-off",
    sourceBoundaryLabel:
      "Guided paths organize personal study, source visibility, and review handoff work; they are not scholar approval evidence.",
    certificateBoundaryLabel:
      "Certificate and publication labels stay locked until recorded human review evidence is attached.",
    activePathId: focusPath?.id,
    focusPathTitle: focusPath?.title,
    focusBookId: focusPath?.nextBook?.id,
    stats: [
      {
        id: "active_paths",
        label: "Active",
        value: `${activePaths}/${paths.length}`,
        detail: "path(s) started",
        icon: "map",
        tone: activePaths > 0 ? "primary" : "scholar",
      },
      {
        id: "lessons_ready",
        label: "Ready",
        value: `${lessonsReady}`,
        detail: "next lesson(s)",
        icon: "book-open",
        tone: "primary",
      },
      {
        id: "review_gates",
        label: "Proof",
        value: `${reviewGatesPending}`,
        detail: "gate(s) pending",
        icon: "shield",
        tone: reviewGatesPending > 0 ? "scholar" : "primary",
      },
    ],
    pathChips: paths.map((path) => ({
      id: path.id,
      title: path.title,
      statusLabel: path.weeklyPlan.readinessLabel,
      actionLabel: path.nextActionLabel,
      progress: path.progress,
      active: path.id === focusPath?.id,
      tone: path.tone,
    })),
  };
}

export function buildGuidedLibraryPathReviewPacketShareText(
  path: GuidedLibraryPath,
  context: GuidedLibraryPathReviewPacketShareContext = {},
): string {
  const evidenceLadder = path.evidenceLadder
    .map(
      (step) =>
        `[${step.complete ? "x" : " "}] ${step.label}: ${step.statusLabel} - ${step.detail}`,
    )
    .join("\n");
  const certificateGate = path.certificateGate.requirements
    .map(
      (requirement) =>
        `[${requirement.complete ? "x" : " "}] ${requirement.label}: ${requirement.detail}`,
    )
    .join("\n");
  const reviewChecklist = path.reviewHandoffChecklist
    .map((item) => `- ${item}`)
    .join("\n");
  const nextVerification = path.reviewContract.nextVerification
    .map((item) => `- ${item.label}: ${item.statusLabel}. ${item.detail}`)
    .join("\n");
  const books = path.books
    .map(
      (book) =>
        `- ${book.title} (${book.category}, ${book.verifiedContentStatus})`,
    )
    .join("\n");

  return [
    "Guided Library Review Handoff Packet",
    `Path: ${path.title}`,
    `Generated: ${context.generatedAtLabel ?? "local device time"}`,
    `Reviewer use: ${context.reviewerUseLabel ?? "source, editorial, publication, or qualified scholar review"}`,
    `Progress: ${path.completedLessons}/${path.totalLessons} lesson(s), ${path.reflectionCount} reflection(s), ${path.progress}% complete`,
    `Review readiness: ${path.reviewReadinessScore}% - ${path.reviewHandoffLabel}`,
    `Next review action: ${path.nextReviewActionLabel}`,
    "",
    "Books in scope",
    books || "- No books in this path",
    "",
    "Review handoff checklist",
    reviewChecklist,
    "",
    "Evidence ladder",
    evidenceLadder,
    "",
    "Certificate gate",
    `${path.certificateGate.statusLabel}: ${path.certificateGate.summary}`,
    certificateGate,
    "",
    "Next verification work",
    nextVerification,
    "",
    "Claim boundary",
    path.claimBoundary.publicClaimGuardrail,
    "",
    "Review boundary",
    path.reviewContract.publicBoundary,
    "This packet is a local review handoff. It is not publication proof, certificate approval, or scholar-review evidence until qualified human review records are attached.",
  ].join("\n");
}
