import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { LibraryCoverArt } from "@/components/library/LibraryCoverArt";
import { ThemedText } from "@/components/ThemedText";
import {
  GeometricCardPattern,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { getBookById } from "@/services/libraryService";
import {
  calculateLibraryProgress,
  getAllBookProgress,
} from "@/services/libraryProgressService";
import {
  getLibrarySourceSummary,
  LibrarySourceSummary,
} from "@/services/librarySourceReviewService";
import { LibraryProgressSummary, UserBookProgress } from "@/types/library";
import { AppIcon, type AppIconName } from "@/components/icons";

export default function LibraryProgressScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [summary, setSummary] = useState<LibraryProgressSummary | null>(null);
  const [sourceSummary, setSourceSummary] =
    useState<LibrarySourceSummary | null>(null);
  const [progressByBook, setProgressByBook] = useState<
    Record<string, UserBookProgress>
  >({});

  const loadProgress = useCallback(async () => {
    const [nextSummary, progress, nextSourceSummary] = await Promise.all([
      calculateLibraryProgress(),
      getAllBookProgress(),
      getLibrarySourceSummary(),
    ]);
    setSummary(nextSummary);
    setProgressByBook(progress);
    setSourceSummary(nextSourceSummary);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress().catch(() => {});
    }, [loadProgress]),
  );

  const started = useMemo(() => {
    return Object.values(progressByBook)
      .filter(
        (progress) =>
          !!progress.currentChapterId ||
          progress.progressPercentage > 0 ||
          progress.bookmarks.length > 0 ||
          Object.keys(progress.reflections).length > 0,
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [progressByBook]);
  const latestStudy = started[0];
  const latestStudyBook = latestStudy ? getBookById(latestStudy.bookId) : null;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}
      edges={["top"]}
    >
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <ScrollView
        contentContainerStyle={styles.content}
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
          >
            <AppIcon name="arrow-left" size={22} color={theme.text} />
          </Pressable>
        </View>
        <ThemedText
          type="caption"
          style={[styles.eyebrow, { color: theme.scholar }]}
        >
          STUDY PROGRESS
        </ThemedText>
        <ThemedText type="hero" style={styles.title}>
          Your Library
        </ThemedText>

        <View
          style={[
            styles.momentumHero,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.scholar + "55",
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <View style={styles.momentumTopRow}>
            <View
              style={[styles.rowIcon, { backgroundColor: theme.scholarSoft }]}
            >
              <AppIcon name="trending-up" size={20} color={theme.scholar} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText
                type="caption"
                style={[styles.eyebrow, { color: theme.scholar }]}
              >
                READING MOMENTUM
              </ThemedText>
              <ThemedText type="h3">
                {latestStudyBook ? "Continue your study" : "Begin your study"}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {latestStudyBook && latestStudy
              ? `${latestStudyBook.title} is ${latestStudy.progressPercentage}% complete. Keep the thread warm with one chapter or reflection today.`
              : "Start one book and NurAI will track chapters, reflections, bookmarks, and source-backed learning here."}
          </ThemedText>
          <Pressable
            onPress={() =>
              latestStudyBook
                ? navigation.navigate("BookDetail", {
                    bookId: latestStudyBook.id,
                  })
                : navigation.goBack()
            }
            style={({ pressed }) => [
              styles.momentumButton,
              { backgroundColor: theme.primary },
              pressed ? { opacity: 0.84 } : null,
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: theme.primaryForeground,
                fontFamily: "PlusJakartaSans_800ExtraBold",
              }}
            >
              {latestStudyBook ? "Continue Reading" : "Choose A Book"}
            </ThemedText>
            <AppIcon
              name="arrow-right"
              size={16}
              color={theme.primaryForeground}
            />
          </Pressable>
        </View>

        <View style={styles.grid}>
          <Metric
            label="Books Started"
            value={summary?.booksStarted ?? 0}
            icon="book-open"
          />
          <Metric
            label="Completed"
            value={summary?.booksCompleted ?? 0}
            icon="award"
          />
          <Metric
            label="Reflections"
            value={summary?.reflectionsCompleted ?? 0}
            icon="edit-3"
          />
          <Metric
            label="Badges"
            value={summary?.badgesEarned ?? 0}
            icon="star"
          />
        </View>
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.primaryBorder,
            },
          ]}
        >
          <GeometricCardPattern color={theme.primary} opacity={0.012} />
          <ThemedText type="h3">
            {summary?.totalProgressPercentage ?? 0}% overall progress
          </ThemedText>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: theme.borderLight },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${summary?.totalProgressPercentage ?? 0}%`,
                  backgroundColor: theme.primary,
                },
              ]}
            />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Your study streak grows when you read, reflect, and complete
            chapters.
          </ThemedText>
        </View>

        <View
          style={[
            styles.sourceQaCard,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.scholar + "44",
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <View
            style={[styles.rowIcon, { backgroundColor: theme.scholarSoft }]}
          >
            <AppIcon name="shield" size={20} color={theme.scholar} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText
              type="body"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              Source-backed study
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              {sourceSummary
                ? `${sourceSummary.verifiedSources}/${sourceSummary.totalSources} source cards linked to your library.`
                : "Checking trusted source cards"}
            </ThemedText>
          </View>
        </View>

        <ThemedText
          type="h3"
          style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}
        >
          Recent Study
        </ThemedText>
        {started.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
          >
            <AppIcon name="book-open" size={26} color={theme.primary} />
            <ThemedText type="h4">No books started yet</ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, textAlign: "center" }}
            >
              Start one book and your reflections, bookmarks and completion
              badges will appear here.
            </ThemedText>
          </View>
        ) : (
          started.map((progress) => {
            const book = getBookById(progress.bookId);
            if (!book) return null;
            return (
              <Pressable
                key={progress.bookId}
                onPress={() =>
                  navigation.navigate("BookDetail", { bookId: book.id })
                }
                style={[
                  styles.studyRow,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                  },
                ]}
              >
                <LibraryCoverArt
                  book={book}
                  progressPercentage={progress.progressPercentage}
                  size="thumbnail"
                />
                <View style={{ flex: 1 }}>
                  <ThemedText
                    type="body"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    {book.title}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    {progress.progressPercentage}% •{" "}
                    {progress.completedChapters.length}/{book.chapters.length}{" "}
                    chapters
                  </ThemedText>
                </View>
                <AppIcon
                  name="chevron-right"
                  size={18}
                  color={theme.textMuted}
                />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );

  function Metric({
    label,
    value,
    icon,
  }: {
    label: string;
    value: number;
    icon: AppIconName;
  }) {
    return (
      <View
        style={[
          styles.metricCard,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
        ]}
      >
        <AppIcon name={icon} size={20} color={theme.primary} />
        <ThemedText type="h2">{value}</ThemedText>
        <ThemedText
          type="caption"
          style={{ color: theme.textMuted, textAlign: "center" }}
        >
          {label}
        </ThemedText>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 120 },
  header: { marginBottom: Spacing.lg },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 2,
  },
  title: {
    fontSize: 44,
    lineHeight: 50,
    marginBottom: Spacing.lg,
  },
  momentumHero: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  momentumTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  momentumButton: {
    alignSelf: "flex-start",
    minHeight: 46,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  metricCard: {
    width: "47%",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.xs,
  },
  summaryCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.lg,
    overflow: "hidden",
  },
  sourceQaCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  emptyCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  studyRow: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
