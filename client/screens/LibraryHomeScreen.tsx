import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

import { LibraryCoverArt } from "@/components/library/LibraryCoverArt";
import {
  LibraryBookCard,
  LibraryPlanBadge,
} from "@/components/library/LibraryBookCard";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useSubscription } from "@/context/SubscriptionContext";
import { useTheme } from "@/hooks/useTheme";
import {
  getBookById,
  getBooks,
  getDailyLibraryStudy,
  getFeaturedBooks,
  getLibraryCategories,
  searchLibraryBooks,
} from "@/services/libraryService";
import {
  calculateLibraryProgress,
  getAllBookProgress,
} from "@/services/libraryProgressService";
import {
  buildLibraryAudioPathPlans,
  summarizeLibraryAudioPathPlans,
} from "@/services/libraryAudioPathService";
import {
  buildPremiumLibraryCollections,
  buildPremiumLibraryCollectionShelfSummary,
} from "@/services/libraryCollectionsService";
import {
  buildGuidedLibraryPathReviewPacketShareText,
  buildGuidedLibraryCommandCenter,
  buildGuidedLibraryPaths,
} from "@/services/libraryLearningPathService";
import {
  getLibrarySourceSummary,
  LibrarySourceSummary,
} from "@/services/librarySourceReviewService";
import {
  Book,
  LibraryProgressSummary,
  PlanType,
  UserBookProgress,
} from "@/types/library";
import {
  listOfflineBooks,
  type OfflineBookEntry,
} from "@/services/libraryOfflineBookService";
import { canAccessBook } from "@/services/libraryAccessControl";
import {
  GeometricCardPattern,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

type BookSortMode =
  | "all"
  | "continue"
  | "downloaded"
  | "free"
  | "premium"
  | "scholar"
  | "finished";

const SHOW_INTERNAL_LIBRARY_REVIEW =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_ENABLE_INTERNAL_LIBRARY_REVIEW === "true";

function getActiveReadingChapter(book: Book, progress?: UserBookProgress) {
  return (
    book.chapters.find(
      (chapter) => chapter.id === progress?.currentChapterId,
    ) ??
    book.chapters.find(
      (chapter) => !progress?.completedChapters.includes(chapter.id),
    ) ??
    book.chapters[0]
  );
}

function getReadingPositionLabel(book: Book, progress?: UserBookProgress) {
  const activeChapter = getActiveReadingChapter(book, progress);
  const activePosition = activeChapter
    ? progress?.readingPositions[activeChapter.id]
    : undefined;
  if (activePosition && activePosition.progressPercentage > 4) {
    return `${activePosition.progressPercentage}% through chapter`;
  }
  if ((progress?.progressPercentage ?? 0) > 0) {
    return `${progress?.progressPercentage ?? 0}% read`;
  }
  return "Ready to start";
}

export default function LibraryHomeScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { currentPlan, checkEntitlements } = useSubscription();
  const userPlan = currentPlan as PlanType;
  const [progressByBook, setProgressByBook] = useState<
    Record<string, UserBookProgress>
  >({});
  const [summary, setSummary] = useState<LibraryProgressSummary | null>(null);
  const [sourceSummary, setSourceSummary] =
    useState<LibrarySourceSummary | null>(null);
  const [offlineBooks, setOfflineBooks] = useState<OfflineBookEntry[]>([]);
  const [query, setQuery] = useState("");
  const [bookSortMode, setBookSortMode] = useState<BookSortMode>("all");
  const searchInputRef = useRef<TextInput>(null);

  const loadProgress = useCallback(async () => {
    const [progress, progressSummary, sourceQa, savedOfflineBooks] =
      await Promise.all([
        getAllBookProgress(),
        calculateLibraryProgress(),
        getLibrarySourceSummary(),
        listOfflineBooks(),
      ]);
    setProgressByBook(progress);
    setSummary(progressSummary);
    setSourceSummary(sourceQa);
    setOfflineBooks(savedOfflineBooks);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress().catch(() => {});
    }, [loadProgress]),
  );

  useEffect(() => {
    if (currentPlan === "free") {
      checkEntitlements().catch(() => {});
    }
  }, [checkEntitlements, currentPlan]);

  const featuredBook = getFeaturedBooks()[0] ?? getBooks()[0];
  const dailyStudy = useMemo(
    () => getDailyLibraryStudy(progressByBook),
    [progressByBook],
  );
  const continueProgress = useMemo(() => {
    return Object.values(progressByBook)
      .filter(
        (progress) =>
          progress.progressPercentage < 100 &&
          (!!progress.currentChapterId ||
            progress.completedChapters.length > 0 ||
            progress.bookmarks.length > 0 ||
            Object.keys(progress.reflections).length > 0),
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0];
  }, [progressByBook]);
  const continueBook = continueProgress
    ? getBookById(continueProgress.bookId)
    : undefined;

  const openBook = useCallback(
    (book: Book) => {
      navigation.navigate("BookDetail", { bookId: book.id });
    },
    [navigation],
  );

  const openBookReaderFromProgress = useCallback(
    (book: Book, progress?: UserBookProgress) => {
      const activeChapter = getActiveReadingChapter(book, progress);
      if (!activeChapter || !canAccessBook(userPlan, book)) {
        openBook(book);
        return;
      }
      navigation.navigate("BookReader", {
        bookId: book.id,
        chapterId: activeChapter.id,
      });
    },
    [navigation, openBook, userPlan],
  );

  const focusLibrarySearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const allBooks = useMemo(() => getBooks(), []);
  const offlineBookIds = useMemo(
    () => new Set(offlineBooks.map((entry) => entry.bookId)),
    [offlineBooks],
  );
  const downloadedBooks = useMemo(
    () =>
      offlineBooks
        .map((entry) => {
          const book = getBookById(entry.bookId);
          return book ? { entry, book } : null;
        })
        .filter(
          (item): item is { entry: OfflineBookEntry; book: Book } =>
            item !== null,
        ),
    [offlineBooks],
  );
  const visibleBooks = useMemo(() => {
    const base = query.trim()
      ? searchLibraryBooks(query).slice(0, 24)
      : allBooks;
    const withProgress = (book: Book) => progressByBook[book.id];
    const filtered =
      bookSortMode === "continue"
        ? base.filter((book) => {
            const progress = withProgress(book);
            return (
              progress &&
              progress.progressPercentage > 0 &&
              progress.progressPercentage < 100
            );
          })
        : bookSortMode === "downloaded"
          ? base.filter((book) => offlineBookIds.has(book.id))
          : bookSortMode === "finished"
            ? base.filter(
                (book) => (withProgress(book)?.progressPercentage ?? 0) >= 100,
              )
            : bookSortMode === "free" ||
                bookSortMode === "premium" ||
                bookSortMode === "scholar"
              ? base.filter((book) => book.requiredPlan === bookSortMode)
              : base;

    return [...filtered]
      .sort((a, b) => {
        if (bookSortMode === "continue") {
          return (
            new Date(withProgress(b)?.updatedAt ?? 0).getTime() -
            new Date(withProgress(a)?.updatedAt ?? 0).getTime()
          );
        }
        if (bookSortMode === "finished") {
          return a.title.localeCompare(b.title);
        }
        return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      })
      .slice(0, query.trim() ? 24 : 60);
  }, [allBooks, bookSortMode, offlineBookIds, progressByBook, query]);
  const booksStartedCount = summary?.booksStarted ?? 0;
  const booksCompletedCount = summary?.booksCompleted ?? 0;
  // Only the three filters a reader actually reaches for. Access tier is
  // already shown per book (badge + gating), and "Finished" books still
  // appear under "All", so the old Free/Premium/Scholar/Finished chips were
  // filter noise that made the shelf feel like a dashboard.
  const bookSortOptions = useMemo(
    () =>
      [
        { id: "all" as const, label: "All", count: allBooks.length },
        {
          id: "continue" as const,
          label: "Continue",
          count: Object.values(progressByBook).filter(
            (progress) =>
              progress.progressPercentage > 0 &&
              progress.progressPercentage < 100,
          ).length,
        },
        {
          id: "downloaded" as const,
          label: "Saved",
          count: offlineBooks.length,
        },
      ] satisfies { id: BookSortMode; label: string; count: number }[],
    [allBooks, offlineBooks.length, progressByBook],
  );
  const readingNowBook = continueBook ?? dailyStudy?.book ?? featuredBook;
  const readingNowProgress = readingNowBook
    ? progressByBook[readingNowBook.id]
    : undefined;
  const readingNowChapter = readingNowBook
    ? getActiveReadingChapter(readingNowBook, readingNowProgress)
    : undefined;
  const readingNowPositionLabel = readingNowBook
    ? getReadingPositionLabel(readingNowBook, readingNowProgress)
    : "Ready to start";
  const readerLibraryBook = downloadedBooks[0]?.book;
  const readerLibraryProgress = readerLibraryBook
    ? progressByBook[readerLibraryBook.id]
    : undefined;
  const readerLibraryNextChapterId =
    readerLibraryProgress?.currentChapterId ??
    readerLibraryBook?.chapters[0]?.id;
  const openReaderLibraryBook = useCallback(
    (book: Book) => {
      openBookReaderFromProgress(book, progressByBook[book.id]);
    },
    [openBookReaderFromProgress, progressByBook],
  );
  const shelfCategories = useMemo(() => {
    const preferred = [
      "Quran",
      "Worship",
      "Duas & Dhikr",
      "Arabic",
      "Family",
      "Character",
      "Reverts",
      "Ramadan",
    ];
    const categories = getLibraryCategories();
    return [
      ...preferred.filter((category) =>
        categories.includes(
          category as ReturnType<typeof getLibraryCategories>[number],
        ),
      ),
      ...categories.filter((category) => !preferred.includes(category)),
    ].slice(0, 8);
  }, []);
  const currentlyReadingBooks = useMemo(
    () =>
      Object.values(progressByBook)
        .filter(
          (item) =>
            item.progressPercentage > 0 &&
            item.progressPercentage < 100 &&
            !!getBookById(item.bookId),
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .map((item) => ({
          progress: item,
          book: getBookById(item.bookId)!,
          chapter: getActiveReadingChapter(getBookById(item.bookId)!, item),
          positionLabel: getReadingPositionLabel(
            getBookById(item.bookId)!,
            item,
          ),
        }))
        .slice(0, 10),
    [progressByBook],
  );

  const learningPaths = useMemo(
    () => buildGuidedLibraryPaths(progressByBook),
    [progressByBook],
  );
  const premiumCollections = useMemo(
    () => buildPremiumLibraryCollections(progressByBook),
    [progressByBook],
  );
  const audioPathPlans = useMemo(
    () => buildLibraryAudioPathPlans(progressByBook),
    [progressByBook],
  );
  const activeAudioPath = useMemo(
    () =>
      audioPathPlans.find((plan) => plan.readyTracks < plan.totalTracks) ??
      audioPathPlans[0],
    [audioPathPlans],
  );
  const guidedSessionPath = useMemo(
    () =>
      learningPaths.find(
        (path) => path.progress < 100 && path.nextStudySession,
      ) ?? learningPaths.find((path) => path.nextStudySession),
    [learningPaths],
  );
  const guidedSession = guidedSessionPath?.nextStudySession;

  const booksFirstLibrary = true;

  if (booksFirstLibrary) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}
        edges={["top"]}
      >
        <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 120 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={[
                styles.iconButton,
                {
                  backgroundColor: theme.surfaceGlassStrong,
                  borderColor: theme.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <AppIcon name="arrow-left" size={22} color={theme.text} />
            </Pressable>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => navigation.navigate("LibraryProgress")}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: theme.surfaceGlassStrong,
                    borderColor: theme.primaryBorder,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open reading progress"
              >
                <AppIcon name="bar-chart-2" size={21} color={theme.primary} />
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate("LibraryAnnotations")}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: theme.surfaceGlassStrong,
                    borderColor: theme.primaryBorder,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open notes and highlights"
              >
                <AppIcon name="edit-3" size={20} color={theme.primary} />
              </Pressable>
              {SHOW_INTERNAL_LIBRARY_REVIEW ? (
                <Pressable
                  onPress={() => navigation.navigate("LibrarySourceReview")}
                  style={[
                    styles.iconButton,
                    {
                      backgroundColor: theme.surfaceGlassStrong,
                      borderColor: `${theme.scholar}44`,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Open source review"
                >
                  <AppIcon name="shield" size={20} color={theme.scholar} />
                </Pressable>
              ) : null}
            </View>
          </View>

          <LinearGradient
            colors={["#07121F", "#092319", "#07111B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.booksHero}
            testID="library-books-hero"
          >
            <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
            <View style={styles.booksHeroTop}>
              <View style={styles.booksHeroIcon}>
                <AppIcon name="book-open" size={28} color={theme.primary} />
              </View>
              <View style={styles.booksHeroCopy}>
                <ThemedText
                  type="caption"
                  style={[styles.eyebrow, { color: theme.scholar }]}
                >
                  NURAI BOOKS
                </ThemedText>
                <ThemedText type="hero" style={styles.booksHeroTitle}>
                  Books Library
                </ThemedText>
              </View>
            </View>
            <ThemedText type="body" style={styles.booksHeroBody}>
              Browse full books, open a chapter, save reflections, and keep
              source status visible without turning reading into a dashboard.
            </ThemedText>
            <View style={styles.booksHeroStats}>
              <BookHeroStat
                label="Books"
                value={allBooks.length}
                accent={theme.primary}
              />
              <BookHeroStat
                label="Started"
                value={booksStartedCount}
                accent={theme.primary}
              />
              <BookHeroStat
                label="Finished"
                value={booksCompletedCount}
                accent={theme.scholar}
              />
            </View>
          </LinearGradient>

          <View
            style={[
              styles.booksSearchBox,
              {
                backgroundColor: theme.input,
                borderColor: theme.inputBorder,
              },
            ]}
            testID="library-books-search"
          >
            <AppIcon name="search" size={18} color={theme.textMuted} />
            <TextInput
              ref={searchInputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search books by title, topic, or tag"
              placeholderTextColor={theme.textMuted}
              style={[styles.searchInput, { color: theme.text }]}
              accessibilityLabel="Search NurAI books"
              returnKeyType="search"
            />
            {query.trim() ? (
              <Pressable
                onPress={() => setQuery("")}
                style={styles.booksSearchClear}
                accessibilityRole="button"
                accessibilityLabel="Clear book search"
              >
                <AppIcon name="x" size={16} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bookSortRail}
            testID="library-book-sort-rail"
          >
            {bookSortOptions.map((option) => {
              const active = bookSortMode === option.id;
              const accent = theme.primary;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setBookSortMode(option.id)}
                  style={({ pressed }) => [
                    styles.bookSortChip,
                    {
                      backgroundColor: active
                        ? `${accent}18`
                        : theme.surfaceGlassStrong,
                      borderColor: active ? `${accent}66` : theme.border,
                    },
                    pressed ? { opacity: 0.84 } : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${option.label} books, ${option.count} available`}
                  testID={`button-library-sort-${option.id}`}
                >
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{
                      color: active ? accent : theme.textSecondary,
                      fontWeight: "900",
                    }}
                  >
                    {option.label}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: active ? accent : theme.textMuted }}
                  >
                    {option.count}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {!query.trim() ? (
            <View style={styles.section}>
              <SectionHeader
                title="Reader Library"
                action="Offline"
                onPress={() => navigation.navigate("OfflineLibrary")}
              />
              <Pressable
                onPress={() => {
                  if (readerLibraryBook) {
                    openReaderLibraryBook(readerLibraryBook);
                    return;
                  }
                  setBookSortMode("premium");
                }}
                style={({ pressed }) => [
                  styles.readerLibraryCard,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor:
                      downloadedBooks.length > 0
                        ? theme.primaryBorder
                        : `${theme.scholar}44`,
                  },
                  pressed
                    ? { opacity: 0.9, transform: [{ scale: 0.99 }] }
                    : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  readerLibraryBook
                    ? `Open offline reader for ${readerLibraryBook.title}`
                    : "Open Premium books to save for offline reading"
                }
                testID="button-library-reader-library"
              >
                <GeometricCardPattern
                  color={
                    downloadedBooks.length > 0 ? theme.primary : theme.scholar
                  }
                  opacity={0.012}
                />
                {readerLibraryBook ? (
                  <LibraryCoverArt
                    book={readerLibraryBook}
                    progressPercentage={
                      readerLibraryProgress?.progressPercentage ?? 0
                    }
                    size="feature"
                  />
                ) : (
                  <View
                    style={[
                      styles.readerLibraryEmptyCover,
                      { backgroundColor: theme.scholarSoft },
                    ]}
                  >
                    <AppIcon
                      name="download-cloud"
                      size={28}
                      color={theme.scholar}
                    />
                  </View>
                )}
                <View style={styles.readerLibraryBody}>
                  <View style={styles.readerLibraryTopLine}>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{
                        color:
                          downloadedBooks.length > 0
                            ? theme.primary
                            : theme.scholar,
                        fontWeight: "900",
                        letterSpacing: 0.8,
                      }}
                    >
                      PREMIUM OFFLINE READER
                    </ThemedText>
                    <View
                      style={[
                        styles.readerLibraryStatusPill,
                        {
                          backgroundColor:
                            downloadedBooks.length > 0
                              ? theme.primarySubtle
                              : theme.scholarSoft,
                          borderColor:
                            downloadedBooks.length > 0
                              ? theme.primaryBorder
                              : `${theme.scholar}44`,
                        },
                      ]}
                    >
                      <AppIcon
                        name={downloadedBooks.length > 0 ? "check" : "lock"}
                        size={11}
                        color={
                          downloadedBooks.length > 0
                            ? theme.primary
                            : theme.scholar
                        }
                      />
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{
                          color:
                            downloadedBooks.length > 0
                              ? theme.primary
                              : theme.scholar,
                          fontWeight: "900",
                        }}
                      >
                        {downloadedBooks.length > 0
                          ? `${downloadedBooks.length} saved`
                          : "Premium"}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText type="h3" numberOfLines={2}>
                    {readerLibraryBook
                      ? readerLibraryBook.title
                      : "Build your offline bookshelf"}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textSecondary, lineHeight: 17 }}
                  >
                    {readerLibraryBook
                      ? "Continue from your saved device library with reading progress, highlights, and source context ready."
                      : "Save full NurAI books from their title pages so your reader still works without signal."}
                  </ThemedText>
                  <View style={styles.readerLibraryStats}>
                    <ReaderLibraryStat
                      icon="download-cloud"
                      label="Saved"
                      value={`${downloadedBooks.length}`}
                      accent={theme.primary}
                    />
                    <ReaderLibraryStat
                      icon="book-open"
                      label="Next"
                      value={readerLibraryNextChapterId ? "Chapter" : "Choose"}
                      accent={theme.scholar}
                    />
                    <ReaderLibraryStat
                      icon="star"
                      label="Highlights"
                      value={`${readerLibraryProgress?.highlights.length ?? 0}`}
                      accent={theme.primary}
                    />
                  </View>
                </View>
                <AppIcon name="arrow-right" size={18} color={theme.primary} />
              </Pressable>

              {downloadedBooks.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.downloadedBookShelf}
                  testID="library-downloaded-book-shelf"
                >
                  {downloadedBooks.slice(0, 8).map(({ book, entry }) => (
                    <Pressable
                      key={book.id}
                      onPress={() => openReaderLibraryBook(book)}
                      style={({ pressed }) => [
                        styles.downloadedBookTile,
                        {
                          backgroundColor: theme.surfaceGlassStrong,
                          borderColor: theme.primaryBorder,
                        },
                        pressed
                          ? { opacity: 0.86, transform: [{ scale: 0.985 }] }
                          : null,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Open saved book ${book.title}`}
                      testID={`button-library-downloaded-book-${book.id}`}
                    >
                      <LibraryCoverArt
                        book={book}
                        progressPercentage={
                          progressByBook[book.id]?.progressPercentage ?? 0
                        }
                        size="thumbnail"
                      />
                      <View style={styles.downloadedBookTileBody}>
                        <ThemedText type="caption" numberOfLines={2}>
                          {book.title}
                        </ThemedText>
                        <View style={styles.downloadedBookMeta}>
                          <AppIcon
                            name="check-circle"
                            size={11}
                            color={theme.primary}
                          />
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.textMuted, flex: 1 }}
                          >
                            {entry.chapterCount} chapters saved
                          </ThemedText>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ) : null}

          {readingNowBook ? (
            <View style={styles.section}>
              <SectionHeader
                title={
                  readingNowProgress &&
                  (readingNowProgress.progressPercentage > 0 ||
                    readingNowProgress.currentChapterId)
                    ? "Continue Reading"
                    : "Start A Book"
                }
                action="Open"
                onPress={() =>
                  openBookReaderFromProgress(readingNowBook, readingNowProgress)
                }
              />
              <Pressable
                onPress={() =>
                  openBookReaderFromProgress(readingNowBook, readingNowProgress)
                }
                style={({ pressed }) => [
                  styles.readingNowCard,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.scholar + "55",
                  },
                  pressed
                    ? { opacity: 0.9, transform: [{ scale: 0.99 }] }
                    : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Continue ${readingNowBook.title}. ${readingNowChapter?.title ?? "First chapter"}. ${readingNowPositionLabel}.`}
                testID="button-library-reading-now"
              >
                <LibraryCoverArt
                  book={readingNowBook}
                  progressPercentage={
                    readingNowProgress?.progressPercentage ?? 0
                  }
                  size="feature"
                />
                <View style={styles.readingNowBody}>
                  <View style={styles.readingNowTitleRow}>
                    <ThemedText type="h3" numberOfLines={2}>
                      {readingNowBook.title}
                    </ThemedText>
                    <LibraryPlanBadge plan={readingNowBook.requiredPlan} />
                    {offlineBookIds.has(readingNowBook.id) ? (
                      <SavedOfflineBadge />
                    ) : null}
                  </View>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textSecondary, lineHeight: 17 }}
                  >
                    {readingNowChapter
                      ? `Next: ${readingNowChapter.title}`
                      : readingNowBook.subtitle}
                  </ThemedText>
                  <View style={styles.bookMetaLine}>
                    <BookMetaChip
                      icon="layers"
                      label={`${readingNowBook.chapters.length} chapters`}
                    />
                    <BookMetaChip
                      icon="clock"
                      label={`${readingNowBook.estimatedMinutes} min`}
                    />
                    <BookMetaChip
                      icon="shield"
                      label={readingNowBook.provenanceLabel}
                    />
                    <BookMetaChip
                      icon="map-pin"
                      label={readingNowPositionLabel}
                    />
                  </View>
                  <View
                    style={[
                      styles.booksProgressTrack,
                      { backgroundColor: theme.borderLight },
                    ]}
                  >
                    <View
                      style={[
                        styles.booksProgressFill,
                        {
                          width: `${readingNowProgress?.progressPercentage ?? 0}%`,
                          backgroundColor: theme.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
                <AppIcon name="arrow-right" size={18} color={theme.primary} />
              </Pressable>
            </View>
          ) : null}

          {currentlyReadingBooks.length > 0 && !query.trim() ? (
            <View style={styles.section}>
              <SectionHeader
                title="Currently Reading"
                action={`${currentlyReadingBooks.length}`}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.currentlyReadingShelf}
              >
                {currentlyReadingBooks.map(
                  ({ book, progress, chapter, positionLabel }) => (
                    <Pressable
                      key={book.id}
                      onPress={() => openBookReaderFromProgress(book, progress)}
                      style={({ pressed }) => [
                        styles.currentlyReadingBook,
                        {
                          backgroundColor: theme.surfaceGlassStrong,
                          borderColor:
                            book.requiredPlan === "scholar"
                              ? `${theme.scholar}42`
                              : theme.primaryBorder,
                        },
                        pressed
                          ? { opacity: 0.86, transform: [{ scale: 0.985 }] }
                          : null,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Continue ${book.title}. ${chapter?.title ?? "Current chapter"}. ${positionLabel}.`}
                      testID={`button-library-currently-reading-${book.id}`}
                    >
                      <LibraryCoverArt
                        book={book}
                        progressPercentage={progress.progressPercentage}
                        size="feature"
                      />
                      <View style={styles.currentlyReadingCopy}>
                        <ThemedText type="small" numberOfLines={2}>
                          {book.title}
                        </ThemedText>
                        <View style={styles.currentlyReadingMeta}>
                          <AppIcon
                            name={
                              offlineBookIds.has(book.id)
                                ? "download-cloud"
                                : "book-open"
                            }
                            size={12}
                            color={
                              offlineBookIds.has(book.id)
                                ? theme.scholar
                                : theme.primary
                            }
                          />
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{
                              color: offlineBookIds.has(book.id)
                                ? theme.scholar
                                : theme.textMuted,
                              flex: 1,
                            }}
                          >
                            {offlineBookIds.has(book.id)
                              ? "Saved offline"
                              : positionLabel}
                          </ThemedText>
                        </View>
                        <View style={styles.currentlyReadingChapterLine}>
                          <AppIcon
                            name="corner-down-right"
                            size={11}
                            color={theme.primary}
                          />
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.textSecondary, flex: 1 }}
                          >
                            {chapter?.title ?? "Current chapter"}
                          </ThemedText>
                        </View>
                        <View
                          style={[
                            styles.booksProgressTrack,
                            { backgroundColor: theme.borderLight },
                          ]}
                        >
                          <View
                            style={[
                              styles.booksProgressFill,
                              {
                                width: `${progress.progressPercentage}%`,
                                backgroundColor: theme.primary,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </Pressable>
                  ),
                )}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader title="Shelves" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bookShelfRow}
            >
              {shelfCategories.map((category) => {
                const count = allBooks.filter(
                  (book) => book.category === category,
                ).length;
                return (
                  <Pressable
                    key={category}
                    onPress={() =>
                      navigation.navigate("LibraryCategory", { category })
                    }
                    style={({ pressed }) => [
                      styles.bookShelfChip,
                      {
                        backgroundColor: theme.surfaceGlassStrong,
                        borderColor: theme.border,
                      },
                      pressed ? { opacity: 0.84 } : null,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${category} shelf, ${count} books`}
                    testID={`button-library-shelf-${category}`}
                  >
                    <ThemedText type="small" numberOfLines={1}>
                      {category}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {count} book{count === 1 ? "" : "s"}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <SectionHeader
              title={query.trim() ? "Search Results" : "All Books"}
              action={query.trim() ? `${visibleBooks.length}` : undefined}
            />
            <View style={styles.booksList}>
              {visibleBooks.map((book) => (
                <LibraryBookCard
                  key={book.id}
                  book={book}
                  progress={progressByBook[book.id]}
                  userPlan={userPlan}
                  savedOffline={offlineBookIds.has(book.id)}
                  onPress={() => openBook(book)}
                />
              ))}
            </View>
          </View>

          <View
            style={[
              styles.booksTrustFooter,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: `${theme.scholar}30`,
              },
            ]}
          >
            <AppIcon name="shield" size={17} color={theme.scholar} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
            >
              Each book shows its source and review status clearly. High-care
              topics point you toward qualified guidance.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  function BookHeroStat({
    label,
    value,
    accent,
  }: {
    label: string;
    value: number;
    accent: string;
  }) {
    return (
      <View style={[styles.bookHeroStat, { borderColor: `${accent}30` }]}>
        <ThemedText
          type="h3"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ color: accent }}
        >
          {value}
        </ThemedText>
        <ThemedText
          type="caption"
          numberOfLines={1}
          style={{ color: "rgba(255,255,255,0.68)" }}
        >
          {label}
        </ThemedText>
      </View>
    );
  }

  function ReaderLibraryStat({
    icon,
    label,
    value,
    accent,
  }: {
    icon: AppIconName;
    label: string;
    value: string;
    accent: string;
  }) {
    return (
      <View style={[styles.readerLibraryStat, { borderColor: `${accent}2E` }]}>
        <AppIcon name={icon} size={12} color={accent} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={{ color: theme.textMuted }}
          >
            {label}
          </ThemedText>
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={{ color: accent, fontWeight: "900" }}
          >
            {value}
          </ThemedText>
        </View>
      </View>
    );
  }

  function SavedOfflineBadge({ compact = false }: { compact?: boolean }) {
    return (
      <View
        style={[
          styles.savedOfflineBadge,
          compact ? styles.savedOfflineBadgeCompact : null,
          {
            backgroundColor: theme.primarySubtle,
            borderColor: theme.primaryBorder,
          },
        ]}
      >
        <AppIcon name="download-cloud" size={10} color={theme.primary} />
        <ThemedText
          type="caption"
          numberOfLines={1}
          style={{ color: theme.primary, fontWeight: "900" }}
        >
          Saved
        </ThemedText>
      </View>
    );
  }

  function BookMetaChip({ icon, label }: { icon: AppIconName; label: string }) {
    return (
      <View
        style={[
          styles.bookMetaChip,
          {
            backgroundColor: theme.surfaceGlassStrong,
            borderColor: theme.border,
          },
        ]}
      >
        <AppIcon name={icon} size={12} color={theme.textMuted} />
        <ThemedText
          type="caption"
          numberOfLines={1}
          style={{ color: theme.textMuted }}
        >
          {label}
        </ThemedText>
      </View>
    );
  }

  function SectionHeader({
    title,
    action,
    onPress,
  }: {
    title: string;
    action?: string;
    onPress?: () => void;
  }) {
    return (
      <View style={styles.sectionHeader}>
        <ThemedText type="h4">{title}</ThemedText>
        {action ? (
          <Pressable onPress={onPress}>
            <ThemedText type="small" style={{ color: theme.primary }}>
              {action}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  titleBlock: {
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 2,
  },
  title: {
    fontSize: 44,
    lineHeight: 50,
  },
  libraryHero: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.24)",
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  libraryHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  libraryHeroIcon: {
    width: 58,
    height: 58,
    borderRadius: BorderRadius.xl,
    backgroundColor: "rgba(16, 185, 129, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  libraryHeroCopy: {
    flex: 1,
  },
  libraryHeroTitle: {
    color: "#FFFFFF",
    fontSize: 42,
    lineHeight: 48,
  },
  libraryHeroDivider: {
    marginVertical: Spacing.lg,
  },
  libraryHeroBody: {
    color: "rgba(255,255,255,0.74)",
    lineHeight: 24,
  },
  booksHero: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: "rgba(228, 166, 58, 0.24)",
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    overflow: "hidden",
    gap: Spacing.lg,
  },
  booksHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  booksHeroIcon: {
    width: 58,
    height: 58,
    borderRadius: BorderRadius.xl,
    backgroundColor: "rgba(86,179,148, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(228, 166, 58, 0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  booksHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  booksHeroTitle: {
    color: "#FFFFFF",
    fontSize: 42,
    lineHeight: 48,
  },
  booksHeroBody: {
    color: "rgba(255,255,255,0.72)",
    lineHeight: 23,
  },
  booksHeroStats: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  bookHeroStat: {
    flex: 1,
    minHeight: 68,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.045)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  booksSearchBox: {
    minHeight: 56,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  booksSearchClear: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  bookSortRail: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  bookSortChip: {
    minHeight: 42,
    minWidth: 86,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  readerLibraryCard: {
    minHeight: 192,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  readerLibraryEmptyCover: {
    width: 108,
    height: 142,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(228, 166, 58, 0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  readerLibraryBody: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
  },
  readerLibraryTopLine: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  readerLibraryStatusPill: {
    minHeight: 26,
    maxWidth: 112,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  readerLibraryStats: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  readerLibraryStat: {
    flex: 1,
    minHeight: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  downloadedBookShelf: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
    paddingTop: Spacing.md,
  },
  downloadedBookTile: {
    width: 148,
    minHeight: 224,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  downloadedBookTileBody: {
    flex: 1,
    gap: Spacing.xs,
  },
  downloadedBookMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  readingNowCard: {
    minHeight: 176,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  readingNowBody: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
  },
  readingNowTitleRow: {
    gap: Spacing.xs,
  },
  currentlyReadingShelf: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  currentlyReadingBook: {
    width: 176,
    minHeight: 292,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  currentlyReadingCopy: {
    gap: Spacing.xs,
    flex: 1,
  },
  currentlyReadingMeta: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  currentlyReadingChapterLine: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  bookMetaLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  bookMetaChip: {
    minHeight: 28,
    maxWidth: "100%",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  booksProgressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  booksProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  bookShelfRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  bookShelfChip: {
    minWidth: 126,
    minHeight: 66,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: "center",
    gap: 3,
  },
  bookShelfPreview: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  bookShelfPreviewHeader: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  bookCoverShelf: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  bookCoverShelfItem: {
    width: 142,
    gap: Spacing.sm,
  },
  bookCoverShelfTitle: {
    minHeight: 34,
    lineHeight: 16,
  },
  savedOfflineBadge: {
    alignSelf: "flex-start",
    minHeight: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  savedOfflineBadgeCompact: {
    minHeight: 22,
    paddingHorizontal: Spacing.xs,
  },
  booksList: {
    gap: Spacing.xs,
  },
  booksTrustFooter: {
    minHeight: 62,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  libraryCommandRail: {
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  libraryCommandHeader: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  libraryCommandStatusPill: {
    minHeight: 30,
    maxWidth: 118,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  libraryCommandGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  libraryCommandButton: {
    flexGrow: 1,
    flexBasis: "48%",
    minHeight: 68,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  libraryCommandIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  libraryCommandCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  trustCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  trustIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  trustReviewButton: {
    width: 38,
    height: 38,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  libraryStreakCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  libraryStreakHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  libraryStreakIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  libraryStreakCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  libraryStreakBadge: {
    minWidth: 72,
    minHeight: 56,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  libraryStreakStats: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  libraryStreakStat: {
    flex: 1,
    minHeight: 68,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.16)",
    backgroundColor: "rgba(86,179,148,0.06)",
    padding: Spacing.sm,
    justifyContent: "space-between",
  },
  libraryStreakBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.24)",
    backgroundColor: "rgba(212,175,55,0.08)",
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  pathCommandCenterCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  pathCommandCenterHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  pathCommandCenterIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  pathCommandCenterCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  pathCommandCenterBadge: {
    maxWidth: 104,
    minHeight: 50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  pathCommandCenterStats: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  pathCommandCenterStat: {
    flex: 1,
    minHeight: 86,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 5,
  },
  pathCommandCenterStatIcon: {
    width: 26,
    height: 26,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  pathCommandCenterStatCopy: {
    gap: 1,
    minWidth: 0,
  },
  pathCommandCenterChipRow: {
    gap: Spacing.xs,
  },
  pathCommandCenterChip: {
    minHeight: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  pathCommandCenterChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pathCommandCenterBoundary: {
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.2)",
    backgroundColor: "rgba(255,212,107,0.055)",
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  pathCommandCenterBoundaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  pathCommandCenterFooter: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  guidedPriorityRail: {
    minHeight: 92,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  guidedPriorityIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  guidedPriorityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  guidedPriorityAction: {
    minHeight: 40,
    maxWidth: 86,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  collectionShelfCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  collectionShelfHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  collectionShelfIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  collectionShelfCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  collectionShelfStats: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  collectionShelfStat: {
    flex: 1,
    minHeight: 70,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: Spacing.sm,
    justifyContent: "space-between",
  },
  collectionRows: {
    gap: Spacing.sm,
  },
  collectionCard: {
    minHeight: 170,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  collectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  collectionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  collectionTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  collectionChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  collectionChip: {
    minHeight: 26,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  collectionMetaGrid: {
    gap: 3,
  },
  collectionBoundaryRow: {
    minHeight: 38,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.24)",
    backgroundColor: "rgba(212,175,55,0.08)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  collectionShelfBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.26)",
    backgroundColor: "rgba(212,175,55,0.08)",
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  guidedSessionCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  guidedSessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  guidedSessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  guidedSessionTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  guidedSessionTitle: {
    lineHeight: 28,
  },
  guidedSessionAction: {
    minHeight: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  guidedSessionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  guidedSessionLessonBox: {
    borderRadius: 18,
    padding: Spacing.md,
    gap: 4,
  },
  guidedSessionSteps: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  guidedSessionStep: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  guidedSessionStepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  guidedSessionStepCopy: {
    minWidth: 0,
  },
  weeklyPlanCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  weeklyPlanHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  weeklyPlanIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyPlanCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  weeklyPlanBadge: {
    minWidth: 68,
    minHeight: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  weeklyPlanStepGrid: {
    gap: Spacing.sm,
  },
  weeklyPlanStep: {
    minHeight: 70,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  weeklyPlanStepIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyPlanStepCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  weeklyPlanFooter: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  pathReadinessCockpitCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  pathReadinessCockpitHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  pathReadinessCockpitIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  pathReadinessCockpitCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  pathReadinessCockpitBadge: {
    maxWidth: 112,
    minHeight: 46,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  pathReadinessCockpitRows: {
    gap: Spacing.sm,
  },
  pathReadinessCockpitRow: {
    minHeight: 74,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  pathReadinessCockpitRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pathReadinessCockpitRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  pathReadinessCockpitRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  pathReadinessCockpitBoundary: {
    minHeight: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.18)",
    backgroundColor: "rgba(255,212,107,0.05)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  pathProofReceiptCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  pathProofReceiptHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  pathProofReceiptIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  pathProofReceiptCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  pathProofReceiptRows: {
    gap: Spacing.sm,
  },
  pathProofReceiptRow: {
    minHeight: 118,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  pathProofReceiptRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  pathProofReceiptRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  pathProofReceiptRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  pathProofReceiptSaveRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  pathProofReceiptBoundaryRow: {
    minHeight: 34,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.18)",
    backgroundColor: "rgba(255,212,107,0.05)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  reviewContractCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  reviewContractHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  reviewContractIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewContractCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  reviewContractSectionStack: {
    gap: Spacing.sm,
  },
  reviewContractSection: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.035)",
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  reviewContractRows: {
    gap: Spacing.xs,
  },
  reviewContractRow: {
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  reviewContractRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewContractRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  reviewContractRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  reviewContractBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.18)",
    backgroundColor: "rgba(255,212,107,0.05)",
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  reviewContractShareButton: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  studyContractCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  studyContractHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  studyContractIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  studyContractCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  studyContractBadge: {
    minWidth: 86,
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  studyContractCheckpointGrid: {
    gap: Spacing.sm,
  },
  studyContractCheckpoint: {
    minHeight: 62,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  studyContractCheckpointIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  studyContractCheckpointCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  studyContractBoundary: {
    gap: Spacing.sm,
  },
  studyContractBoundaryRow: {
    minHeight: 42,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  studyContractFooter: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  audioPathCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  audioPathHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  audioPathIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  audioPathCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  audioPathScore: {
    minWidth: 82,
    minHeight: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  audioPathMetaRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  audioCheckpointGrid: {
    gap: Spacing.sm,
  },
  audioCheckpoint: {
    minHeight: 54,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  audioCheckpointCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  audioNextTrack: {
    minHeight: 64,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  audioNextTrackCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  claimBoundaryCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  claimBoundaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  claimBoundaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  claimBoundaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  claimBoundaryRows: {
    gap: Spacing.sm,
  },
  claimBoundaryRow: {
    minHeight: 42,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  certificateGateCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  certificateGateHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  certificateGateIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  certificateGateCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  certificateRequirementGrid: {
    gap: Spacing.sm,
  },
  certificateRequirement: {
    minHeight: 62,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  certificateRequirementIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  certificateRequirementCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  certificateGateFooter: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  evidenceLadderCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  evidenceLadderHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  evidenceLadderIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  evidenceLadderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  evidenceLadderList: {
    gap: Spacing.sm,
  },
  evidenceLadderStep: {
    minHeight: 66,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  evidenceLadderStepRail: {
    width: 30,
    alignItems: "center",
  },
  evidenceLadderStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  evidenceLadderStepCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  evidenceLadderStepTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  learningPathRow: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  learningPathCard: {
    width: 286,
    minHeight: 378,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  learningPathTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  learningPathIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  learningPathBadge: {
    maxWidth: 142,
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  learningPathBadgeText: {
    flexShrink: 1,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  learningPathTitle: {
    lineHeight: 28,
  },
  learningPathProgressTrack: {
    height: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginTop: "auto",
  },
  learningPathProgressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  learningPathStageList: {
    gap: 7,
  },
  learningPathStageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  learningPathStageDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  learningPathStageCopy: {
    flex: 1,
    minWidth: 0,
  },
  learningPathReviewBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 2,
  },
  learningPathHandoffPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  learningPathHandoffHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  learningPathHandoffTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  learningPathHandoffScore: {
    minWidth: 48,
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
  },
  learningPathHandoffChecklist: {
    gap: 3,
  },
  learningPathHandoffChecklistRow: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  learningPathActionPanel: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  learningPathActionCopy: {
    flex: 1,
    minWidth: 0,
  },
  learningPathFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  studySystemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  studySystemCard: {
    flexGrow: 1,
    flexBasis: "48%",
    minHeight: 126,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  studySystemIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  studySystemLabel: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  studySystemValue: {
    fontSize: 22,
    lineHeight: 28,
  },
  heroCard: {
    minHeight: 166,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  heroText: {
    flex: 1,
    gap: Spacing.xs,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginVertical: Spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  section: {
    marginTop: Spacing.lg,
  },
  dailyStudyCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  dailyStudyBody: {
    flex: 1,
    gap: Spacing.sm,
  },
  dailyStudyTitle: {
    lineHeight: 28,
  },
  reasonPill: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  reasonText: {
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  searchBox: {
    height: 54,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  categoryRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  categoryChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
