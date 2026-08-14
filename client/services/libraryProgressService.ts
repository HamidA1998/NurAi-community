import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBooks, getBookById } from "@/services/libraryService";
import {
  BookSection,
  LibraryProgressSummary,
  UserBookProgress,
} from "@/types/library";
import { syncedSetItem } from "@/lib/progress-sync";

const STORAGE_KEY = "nurai_library_progress_v1";

function now(): string {
  return new Date().toISOString();
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dateKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseProgressDayKey(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return dateKeyFromDate(date);
}

function diffDays(fromKey: string, toKey: string): number {
  const [fromYear, fromMonth, fromDay] = fromKey.split("-").map(Number);
  const [toYear, toMonth, toDay] = toKey.split("-").map(Number);
  const fromTime = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toTime = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((toTime - fromTime) / MS_PER_DAY);
}

function previousDayKey(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function buildStudyDayKeys(progressValues: UserBookProgress[]): string[] {
  return Array.from(
    new Set(
      progressValues
        .flatMap((progress) => [
          parseProgressDayKey(progress.updatedAt),
          parseProgressDayKey(progress.completedAt),
        ])
        .filter(Boolean) as string[],
    ),
  ).sort((a, b) => b.localeCompare(a));
}

function calculateLongestStudyStreak(dayKeys: string[]): number {
  if (dayKeys.length === 0) return 0;
  const sortedAscending = [...dayKeys].sort((a, b) => a.localeCompare(b));
  let longest = 1;
  let active = 1;

  for (let index = 1; index < sortedAscending.length; index += 1) {
    const previous = sortedAscending[index - 1];
    const current = sortedAscending[index];
    if (diffDays(previous, current) === 1) {
      active += 1;
    } else {
      active = 1;
    }
    longest = Math.max(longest, active);
  }

  return longest;
}

function calculateCurrentStudyStreak(dayKeys: string[]): number {
  if (dayKeys.length === 0) return 0;
  const daySet = new Set(dayKeys);
  const todayKey = dateKeyFromDate(new Date());
  const latestKey = dayKeys[0];
  const latestAge = diffDays(latestKey, todayKey);
  if (latestAge > 1) return 0;

  let cursor = latestAge === 0 ? todayKey : latestKey;
  let streak = 0;
  while (daySet.has(cursor)) {
    streak += 1;
    cursor = previousDayKey(cursor);
  }
  return streak;
}

function formatStudyDateLabel(dayKey?: string): string {
  if (!dayKey) return "No study day tracked yet";
  const todayKey = dateKeyFromDate(new Date());
  const age = diffDays(dayKey, todayKey);
  if (age === 0) return "Studied today";
  if (age === 1) return "Last studied yesterday";
  return `Last studied ${age} days ago`;
}

function buildStreakRecoveryLabel(
  currentStreak: number,
  latestDayKey?: string,
) {
  if (!latestDayKey) {
    return "Start a Library streak with one chapter or reflection today.";
  }
  const todayKey = dateKeyFromDate(new Date());
  const age = diffDays(latestDayKey, todayKey);
  if (age === 0) {
    return `Library streak protected today: ${currentStreak} day${currentStreak === 1 ? "" : "s"}.`;
  }
  if (age === 1) {
    return "Read one chapter today to keep the Library streak alive.";
  }
  return "Recover the Library rhythm with one short study session today.";
}

function calculateProgress(
  bookId: string,
  completedChapters: string[],
): number {
  const book = getBookById(bookId);
  if (!book || book.chapters.length === 0) return 0;
  const validCompleted = sanitizeChapterIds(bookId, completedChapters);
  return Math.min(
    100,
    Math.round((validCompleted.length / book.chapters.length) * 100),
  );
}

function chapterIdsForBook(bookId: string): Set<string> {
  const book = getBookById(bookId);
  return new Set(book?.chapters.map((chapter) => chapter.id) ?? []);
}

function isValidChapterId(bookId: string, chapterId: string): boolean {
  return chapterIdsForBook(bookId).has(chapterId);
}

function sanitizeChapterIds(bookId: string, ids?: string[]): string[] {
  const validIds = chapterIdsForBook(bookId);
  if (!ids?.length || validIds.size === 0) return [];
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (!id || seen.has(id) || !validIds.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function sanitizeReflections(
  bookId: string,
  reflections?: Record<string, string>,
): Record<string, string> {
  const validIds = chapterIdsForBook(bookId);
  if (!reflections || validIds.size === 0) return {};
  return Object.fromEntries(
    Object.entries(reflections)
      .map(
        ([chapterId, reflection]) =>
          [
            chapterId,
            typeof reflection === "string" ? reflection.trim() : "",
          ] as const,
      )
      .filter(
        ([chapterId, reflection]) =>
          validIds.has(chapterId) && reflection.length > 0,
      ),
  );
}

function sanitizeReadingPositions(
  bookId: string,
  positions?: UserBookProgress["readingPositions"],
): UserBookProgress["readingPositions"] {
  const validIds = chapterIdsForBook(bookId);
  if (!positions || validIds.size === 0) return {};
  return Object.fromEntries(
    Object.entries(positions)
      .map(([chapterId, position]) => {
        const scrollY = Number(position?.scrollY);
        const contentHeight = Number(position?.contentHeight);
        const viewportHeight = Number(position?.viewportHeight);
        const progressPercentage = Number(position?.progressPercentage);
        return [
          chapterId,
          {
            scrollY: Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0,
            contentHeight: Number.isFinite(contentHeight)
              ? Math.max(0, contentHeight)
              : 0,
            viewportHeight: Number.isFinite(viewportHeight)
              ? Math.max(0, viewportHeight)
              : 0,
            progressPercentage: Number.isFinite(progressPercentage)
              ? Math.min(100, Math.max(0, Math.round(progressPercentage)))
              : 0,
            updatedAt:
              typeof position?.updatedAt === "string"
                ? position.updatedAt
                : now(),
          },
        ] as const;
      })
      .filter(([chapterId]) => validIds.has(chapterId)),
  );
}

function sanitizeHighlights(
  bookId: string,
  highlights?: UserBookProgress["highlights"],
): UserBookProgress["highlights"] {
  const validIds = chapterIdsForBook(bookId);
  if (!Array.isArray(highlights) || validIds.size === 0) return [];
  const seen = new Set<string>();
  return highlights
    .filter(
      (highlight) =>
        highlight &&
        typeof highlight.id === "string" &&
        !seen.has(highlight.id) &&
        validIds.has(highlight.chapterId) &&
        typeof highlight.sectionHeading === "string" &&
        typeof highlight.excerpt === "string",
    )
    .map((highlight) => {
      seen.add(highlight.id);
      return {
        id: highlight.id,
        chapterId: highlight.chapterId,
        sectionHeading: highlight.sectionHeading.trim().slice(0, 160),
        excerpt: highlight.excerpt.trim().slice(0, 360),
        createdAt:
          typeof highlight.createdAt === "string" ? highlight.createdAt : now(),
      };
    })
    .filter((highlight) => highlight.sectionHeading && highlight.excerpt);
}

function normalizeProgress(
  bookId: string,
  value?: Partial<UserBookProgress>,
): UserBookProgress {
  const completedChapters = sanitizeChapterIds(
    bookId,
    value?.completedChapters,
  );
  const bookmarks = sanitizeChapterIds(bookId, value?.bookmarks);
  const reflections = sanitizeReflections(
    bookId,
    value?.reflections && typeof value.reflections === "object"
      ? value.reflections
      : {},
  );
  const readingPositions = sanitizeReadingPositions(
    bookId,
    value?.readingPositions,
  );
  const highlights = sanitizeHighlights(bookId, value?.highlights);
  const progressPercentage = calculateProgress(bookId, completedChapters);
  const book = getBookById(bookId);
  const fallbackChapterId = book?.chapters[0]?.id;
  const currentChapterId =
    typeof value?.currentChapterId === "string" &&
    isValidChapterId(bookId, value.currentChapterId)
      ? value.currentChapterId
      : fallbackChapterId;
  return {
    bookId,
    currentChapterId,
    completedChapters,
    bookmarks,
    reflections,
    readingPositions,
    highlights,
    completedAt:
      typeof value?.completedAt === "string"
        ? value.completedAt
        : progressPercentage >= 100
          ? now()
          : undefined,
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : now(),
    progressPercentage,
  };
}

async function readStore(): Promise<Record<string, UserBookProgress>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([bookId]) => !!getBookById(bookId))
        .map(([bookId, progress]) => [
          bookId,
          normalizeProgress(bookId, progress as Partial<UserBookProgress>),
        ]),
    );
  } catch {
    return {};
  }
}

async function writeStore(
  store: Record<string, UserBookProgress>,
): Promise<void> {
  await syncedSetItem(STORAGE_KEY, JSON.stringify(store));
}

export async function getAllBookProgress(): Promise<
  Record<string, UserBookProgress>
> {
  return readStore();
}

export async function getBookProgress(
  bookId: string,
): Promise<UserBookProgress> {
  const store = await readStore();
  return store[bookId] ?? normalizeProgress(bookId);
}

export async function setCurrentChapter(
  bookId: string,
  chapterId: string,
): Promise<UserBookProgress> {
  const store = await readStore();
  const current = store[bookId] ?? normalizeProgress(bookId);
  if (!getBookById(bookId) || !isValidChapterId(bookId, chapterId))
    return current;
  const next = normalizeProgress(bookId, {
    ...current,
    currentChapterId: chapterId,
    updatedAt: now(),
  });
  store[bookId] = next;
  await writeStore(store);
  return next;
}

export async function markChapterComplete(
  bookId: string,
  chapterId: string,
): Promise<UserBookProgress> {
  const store = await readStore();
  const current = store[bookId] ?? normalizeProgress(bookId);
  if (!getBookById(bookId) || !isValidChapterId(bookId, chapterId))
    return current;
  const completedChapters = current.completedChapters.includes(chapterId)
    ? current.completedChapters
    : [...current.completedChapters, chapterId];
  const book = getBookById(bookId);
  const chapterIndex =
    book?.chapters.findIndex((chapter) => chapter.id === chapterId) ?? -1;
  const nextChapterId =
    chapterIndex >= 0
      ? book?.chapters[chapterIndex + 1]?.id
      : current.currentChapterId;
  const progressPercentage = calculateProgress(bookId, completedChapters);
  const next = normalizeProgress(bookId, {
    ...current,
    completedChapters,
    currentChapterId: nextChapterId ?? chapterId,
    completedAt: progressPercentage >= 100 ? now() : current.completedAt,
    updatedAt: now(),
  });
  store[bookId] = next;
  await writeStore(store);
  return next;
}

export async function toggleBookmark(
  bookId: string,
  chapterId: string,
): Promise<UserBookProgress> {
  const store = await readStore();
  const current = store[bookId] ?? normalizeProgress(bookId);
  if (!getBookById(bookId) || !isValidChapterId(bookId, chapterId))
    return current;
  const bookmarks = current.bookmarks.includes(chapterId)
    ? current.bookmarks.filter((id) => id !== chapterId)
    : [...current.bookmarks, chapterId];
  const next = normalizeProgress(bookId, {
    ...current,
    bookmarks,
    updatedAt: now(),
  });
  store[bookId] = next;
  await writeStore(store);
  return next;
}

export async function saveReflection(
  bookId: string,
  chapterId: string,
  reflection: string,
): Promise<UserBookProgress> {
  const store = await readStore();
  const current = store[bookId] ?? normalizeProgress(bookId);
  if (!getBookById(bookId) || !isValidChapterId(bookId, chapterId))
    return current;
  const reflections = { ...current.reflections };
  const trimmed = reflection.trim();
  if (trimmed) {
    reflections[chapterId] = trimmed;
  } else {
    delete reflections[chapterId];
  }
  const next = normalizeProgress(bookId, {
    ...current,
    reflections,
    updatedAt: now(),
  });
  store[bookId] = next;
  await writeStore(store);
  return next;
}

export async function saveReadingPosition(
  bookId: string,
  chapterId: string,
  position: {
    scrollY: number;
    contentHeight: number;
    viewportHeight: number;
  },
): Promise<UserBookProgress> {
  const store = await readStore();
  const current = store[bookId] ?? normalizeProgress(bookId);
  if (!getBookById(bookId) || !isValidChapterId(bookId, chapterId))
    return current;
  const scrollY = Math.max(0, Math.round(position.scrollY || 0));
  const contentHeight = Math.max(0, Math.round(position.contentHeight || 0));
  const viewportHeight = Math.max(0, Math.round(position.viewportHeight || 0));
  const maxScroll = Math.max(1, contentHeight - viewportHeight);
  const progressPercentage = Math.min(
    100,
    Math.max(0, Math.round((scrollY / maxScroll) * 100)),
  );
  const next = normalizeProgress(bookId, {
    ...current,
    currentChapterId: chapterId,
    readingPositions: {
      ...current.readingPositions,
      [chapterId]: {
        scrollY,
        contentHeight,
        viewportHeight,
        progressPercentage,
        updatedAt: now(),
      },
    },
    updatedAt: now(),
  });
  store[bookId] = next;
  await writeStore(store);
  return next;
}

export async function toggleSectionHighlight(
  bookId: string,
  chapterId: string,
  section: Pick<BookSection, "heading" | "body">,
): Promise<UserBookProgress> {
  const store = await readStore();
  const current = store[bookId] ?? normalizeProgress(bookId);
  if (!getBookById(bookId) || !isValidChapterId(bookId, chapterId))
    return current;
  const id = `${chapterId}:${section.heading}`;
  const existing = current.highlights.some((highlight) => highlight.id === id);
  const highlights = existing
    ? current.highlights.filter((highlight) => highlight.id !== id)
    : [
        ...current.highlights,
        {
          id,
          chapterId,
          sectionHeading: section.heading,
          excerpt: section.body.replace(/\s+/g, " ").trim().slice(0, 260),
          createdAt: now(),
        },
      ];
  const next = normalizeProgress(bookId, {
    ...current,
    highlights,
    updatedAt: now(),
  });
  store[bookId] = next;
  await writeStore(store);
  return next;
}

export async function calculateLibraryProgress(): Promise<LibraryProgressSummary> {
  const books = getBooks();
  const store = await readStore();
  const progressValues = Object.values(store);
  const booksStarted = progressValues.filter(
    (progress) =>
      !!progress.currentChapterId ||
      progress.completedChapters.length > 0 ||
      Object.keys(progress.reflections).length > 0 ||
      progress.bookmarks.length > 0,
  ).length;
  const booksCompleted = progressValues.filter(
    (progress) => progress.progressPercentage >= 100,
  ).length;
  const reflectionsCompleted = progressValues.reduce(
    (sum, progress) => sum + Object.keys(progress.reflections).length,
    0,
  );
  const totalProgressPercentage =
    books.length === 0
      ? 0
      : Math.round(
          progressValues.reduce(
            (sum, progress) => sum + progress.progressPercentage,
            0,
          ) / books.length,
        );
  const studyDayKeys = buildStudyDayKeys(progressValues);
  const currentStudyStreak = calculateCurrentStudyStreak(studyDayKeys);
  return {
    booksStarted,
    booksCompleted,
    reflectionsCompleted,
    badgesEarned: booksCompleted + Math.floor(reflectionsCompleted / 5),
    currentStudyStreak,
    longestStudyStreak: calculateLongestStudyStreak(studyDayKeys),
    studyDaysTracked: studyDayKeys.length,
    lastStudyDateLabel: formatStudyDateLabel(studyDayKeys[0]),
    streakRecoveryLabel: buildStreakRecoveryLabel(
      currentStudyStreak,
      studyDayKeys[0],
    ),
    streakSourceBoundaryLabel:
      "Library streaks are calculated from saved chapter progress and reflection timestamps on this device; they are personal learning signals, not certificate or review proof.",
    totalProgressPercentage,
  };
}
