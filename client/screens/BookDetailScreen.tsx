import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";

import { LibraryCoverArt } from "@/components/library/LibraryCoverArt";
import { LibraryPlanBadge } from "@/components/library/LibraryBookCard";
import { ThemedText } from "@/components/ThemedText";
import {
  GeometricCardPattern,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useSubscription } from "@/context/SubscriptionContext";
import { useTheme } from "@/hooks/useTheme";
import {
  canAccessChapter,
  getBookLockedReason,
  getUpgradeTarget,
} from "@/services/libraryAccessControl";
import { hasAccess } from "@/config/entitlements";
import { getBookById } from "@/services/libraryService";
import {
  getBookProgress,
  setCurrentChapter,
} from "@/services/libraryProgressService";
import {
  isOfflineBookSaved,
  removeOfflineBook,
  saveOfflineBook,
} from "@/services/libraryOfflineBookService";
import {
  getBookSourceAuditSummary,
  getBookSourceAuditSummaryWithReviews,
  type LibrarySourceSummary,
} from "@/services/librarySourceReviewService";
import { PlanType, UserBookProgress } from "@/types/library";
import { AppIcon, type AppIconName } from "@/components/icons";

export default function BookDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const { currentPlan, checkEntitlements } = useSubscription();
  const userPlan = currentPlan as PlanType;
  const book = getBookById(route.params?.bookId);
  const [progress, setProgress] = useState<UserBookProgress | null>(null);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [offlineBusy, setOfflineBusy] = useState(false);
  const [reviewedSourceSummary, setReviewedSourceSummary] =
    useState<LibrarySourceSummary | null>(null);

  const loadProgress = useCallback(async () => {
    if (!book) return;
    const [nextProgress, nextSourceSummary, nextOfflineSaved] =
      await Promise.all([
        getBookProgress(book.id),
        getBookSourceAuditSummaryWithReviews(book),
        isOfflineBookSaved(book.id),
      ]);
    setProgress(nextProgress);
    setReviewedSourceSummary(nextSourceSummary);
    setOfflineSaved(nextOfflineSaved);
  }, [book]);

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

  const nextChapterId = useMemo(() => {
    if (!book) return undefined;
    return progress?.currentChapterId ?? book.chapters[0]?.id;
  }, [book, progress]);
  const fallbackSourceSummary = useMemo(
    () => (book ? getBookSourceAuditSummary(book) : null),
    [book],
  );
  const sourceSummary = reviewedSourceSummary || fallbackSourceSummary;
  const nextChapter = useMemo(
    () => book?.chapters.find((chapter) => chapter.id === nextChapterId),
    [book, nextChapterId],
  );
  const completedChapterCount = progress?.completedChapters.length ?? 0;
  const savedReflectionEntries = useMemo(
    () =>
      Object.entries(progress?.reflections ?? {})
        .map(([chapterId, note]) => ({
          chapter: book?.chapters.find((item) => item.id === chapterId),
          note,
        }))
        .filter((entry) => entry.chapter && entry.note.trim())
        .slice(0, 3),
    [book, progress?.reflections],
  );
  const savedHighlights = useMemo(
    () => (progress?.highlights ?? []).slice(0, 3),
    [progress?.highlights],
  );
  const canUsePremiumReader = hasAccess(currentPlan, "premium");
  const openPremiumReaderUpsell = () =>
    navigation.navigate("Subscription", {
      initialTab: "premium",
      sourceFeature: "library ebook reader",
    });

  const toggleOfflineBook = async () => {
    if (!canUsePremiumReader) {
      navigation.navigate("Subscription", {
        initialTab: "premium",
        sourceFeature: "library offline books",
      });
      return;
    }
    if (!book || offlineBusy) return;
    setOfflineBusy(true);
    try {
      if (offlineSaved) {
        await removeOfflineBook(book.id);
        setOfflineSaved(false);
      } else {
        await saveOfflineBook(book);
        setOfflineSaved(true);
      }
    } finally {
      setOfflineBusy(false);
    }
  };

  if (!book) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.empty}>
          <ThemedText type="h3">Book not found</ThemedText>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          >
            <ThemedText type="body" style={{ color: theme.primaryForeground }}>
              Go Back
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const openChapter = async (chapterId: string) => {
    if (!canAccessChapter(userPlan, book, chapterId)) {
      const target = getUpgradeTarget(book.requiredPlan);
      const upgradeTab =
        book.requiredPlan === "scholar" ? "scholar" : "premium";
      Alert.alert(
        `${target ?? "Upgrade"} required`,
        getBookLockedReason(book),
        [
          { text: "Continue Free", style: "cancel" },
          {
            text: `Open ${target ?? "Plans"}`,
            onPress: () =>
              navigation.navigate("Subscription", {
                initialTab: upgradeTab,
                sourceFeature: "library_books",
              }),
          },
        ],
      );
      return;
    }
    await setCurrentChapter(book.id, chapterId);
    navigation.navigate("BookReader", { bookId: book.id, chapterId });
  };

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
          <LibraryPlanBadge plan={book.requiredPlan} />
        </View>

        <View
          style={[
            styles.titlePage,
            {
              backgroundColor: theme.cardBackground,
              borderColor:
                book.requiredPlan === "scholar"
                  ? `${theme.scholar}55`
                  : theme.primaryBorder,
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <LibraryCoverArt
            book={book}
            progressPercentage={progress?.progressPercentage ?? 0}
            size="hero"
          />
          <View style={styles.titlePageBody}>
            <View style={styles.attributionRow}>
              <AppIcon name="edit-3" size={16} color={theme.primary} />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Created by {book.authorName}
              </ThemedText>
            </View>
            <ThemedText type="h1" style={styles.bookTitle}>
              {book.title}
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.bookSubtitle, { color: theme.textSecondary }]}
            >
              {book.subtitle}
            </ThemedText>
            <View style={styles.metaRow}>
              <Meta icon="clock" label={`${book.estimatedMinutes} min`} />
              <Meta icon="layers" label={`${book.chapters.length} chapters`} />
              <Meta icon="bar-chart-2" label={book.difficulty} />
              <Meta icon="shield" label={book.provenanceLabel} />
            </View>
            <ThemedText
              type="body"
              style={[styles.description, { color: theme.textSecondary }]}
            >
              {book.description}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.reviewCard,
            {
              backgroundColor: theme.scholarSoft,
              borderColor: theme.scholar + "66",
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <AppIcon name="shield" size={18} color={theme.scholar} />
          <View style={{ flex: 1 }}>
            <ThemedText
              type="small"
              style={{
                color: theme.text,
                fontFamily: "PlusJakartaSans_700Bold",
              }}
            >
              Source-anchored reading
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {sourceSummary
                ? `${sourceSummary.verifiedSources}/${sourceSummary.totalSources} Quran and Hadith source cards are linked for this book. ${book.safetyNote}`
                : book.safetyNote}
            </ThemedText>
          </View>
        </View>

        <View style={styles.featureGrid}>
          {[
            {
              title: "Read",
              value: `${book.chapters.length}`,
              detail: "chapters",
              icon: "book-open" as AppIconName,
              accent: theme.primary,
            },
            {
              title: "Reflect",
              value: `${Object.keys(progress?.reflections ?? {}).length}`,
              detail: "saved notes",
              icon: "edit-3" as AppIconName,
              accent: theme.scholar,
            },
            {
              title: "Listen",
              value: "Audio",
              detail:
                book.requiredPlan === "free"
                  ? "available in reader"
                  : `${book.requiredPlan} reader`,
              icon: "headphones" as AppIconName,
              accent: theme.primary,
            },
            {
              title: "Sources",
              value: sourceSummary
                ? `${sourceSummary.verifiedSources}/${sourceSummary.totalSources}`
                : "...",
              detail: "linked cards",
              icon: "shield" as AppIconName,
              accent: theme.scholar,
            },
          ].map((item) => (
            <View
              key={item.title}
              style={[
                styles.featureCard,
                {
                  backgroundColor: theme.surfaceGlassStrong,
                  borderColor: item.accent + "38",
                },
              ]}
            >
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: item.accent + "18" },
                ]}
              >
                <AppIcon name={item.icon} size={15} color={item.accent} />
              </View>
              <ThemedText
                type="caption"
                style={[styles.featureLabel, { color: theme.textMuted }]}
              >
                {item.title}
              </ThemedText>
              <ThemedText
                type="h4"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={styles.featureValue}
              >
                {item.value}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: item.accent }}
              >
                {item.detail}
              </ThemedText>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.progressCard,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <GeometricCardPattern color={theme.primary} opacity={0.012} />
          <View>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              YOUR PROGRESS
            </ThemedText>
            <ThemedText type="h3">
              {progress?.progressPercentage ?? 0}% complete
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: 4 }}
            >
              {nextChapter
                ? `Next: ${nextChapter.title}`
                : "All chapters complete"}
            </ThemedText>
          </View>
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
                  width: `${progress?.progressPercentage ?? 0}%`,
                  backgroundColor: theme.primary,
                },
              ]}
            />
          </View>
          <View style={styles.progressStatRow}>
            <ProgressStat
              label="Complete"
              value={`${completedChapterCount}/${book.chapters.length}`}
              icon="check-circle"
            />
            <ProgressStat
              label="Notes"
              value={`${Object.keys(progress?.reflections ?? {}).length}`}
              icon="edit-3"
            />
            <ProgressStat
              label="Highlights"
              value={`${progress?.highlights.length ?? 0}`}
              icon="star"
            />
          </View>
        </View>

        <View
          style={[
            styles.premiumReaderCard,
            {
              backgroundColor: canUsePremiumReader
                ? theme.primarySubtle
                : theme.scholarSoft,
              borderColor: canUsePremiumReader
                ? theme.primaryBorder
                : `${theme.scholar}44`,
            },
          ]}
        >
          <AppIcon
            name={canUsePremiumReader ? "check-circle" : "lock"}
            size={18}
            color={canUsePremiumReader ? theme.primary : theme.scholar}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="small"
              style={{
                color: theme.text,
                fontFamily: "PlusJakartaSans_700Bold",
              }}
            >
              Premium ebook reader
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textSecondary, lineHeight: 17 }}
            >
              Highlights, advanced spacing, wide page mode, offline narration,
              and comfort controls.
            </ThemedText>
          </View>
          {!canUsePremiumReader ? (
            <Pressable
              onPress={openPremiumReaderUpsell}
              style={[
                styles.smallUpgradeButton,
                {
                  backgroundColor: `${theme.scholar}16`,
                  borderColor: `${theme.scholar}44`,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open Premium ebook reader upgrade"
            >
              <ThemedText
                type="caption"
                style={{ color: theme.scholar, fontWeight: "900" }}
              >
                Upgrade
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={toggleOfflineBook}
          disabled={offlineBusy}
          style={({ pressed }) => [
            styles.offlineBookCard,
            {
              backgroundColor: offlineSaved
                ? theme.primarySubtle
                : theme.surfaceGlassStrong,
              borderColor: offlineSaved
                ? theme.primaryBorder
                : canUsePremiumReader
                  ? theme.border
                  : `${theme.scholar}44`,
            },
            pressed ? { opacity: 0.86, transform: [{ scale: 0.99 }] } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            offlineSaved
              ? "Remove this book from offline reading"
              : "Save this book for offline reading"
          }
          testID="button-book-detail-offline-book"
        >
          <View
            style={[
              styles.offlineBookIcon,
              {
                backgroundColor: offlineSaved
                  ? theme.primarySubtle
                  : theme.scholarSoft,
              },
            ]}
          >
            <AppIcon
              name={
                !canUsePremiumReader
                  ? "lock"
                  : offlineSaved
                    ? "check-circle"
                    : "download-cloud"
              }
              size={19}
              color={offlineSaved ? theme.primary : theme.scholar}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="small"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              {offlineSaved ? "Saved for offline reading" : "Save book offline"}
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textSecondary, lineHeight: 17 }}
            >
              {canUsePremiumReader
                ? "Keep the complete book text and reading metadata available on this device."
                : "Premium unlocks offline book text, narration, and travel-ready study."}
            </ThemedText>
          </View>
          {offlineBusy ? (
            <ActivityIndicator
              size="small"
              color={offlineSaved ? theme.error : theme.primary}
            />
          ) : (
            <AppIcon
              name={offlineSaved ? "trash-2" : "arrow-right"}
              size={17}
              color={offlineSaved ? theme.error : theme.textMuted}
            />
          )}
        </Pressable>

        <Pressable
          onPress={() => nextChapterId && openChapter(nextChapterId)}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.primary },
            pressed ? { opacity: 0.85 } : null,
          ]}
        >
          <AppIcon name="play" size={18} color={theme.primaryForeground} />
          <ThemedText
            type="body"
            style={{
              color: theme.primaryForeground,
              fontFamily: "PlusJakartaSans_800ExtraBold",
            }}
          >
            {progress?.currentChapterId || progress?.completedChapters.length
              ? "Continue Book"
              : "Start Book"}
          </ThemedText>
        </Pressable>

        {savedHighlights.length > 0 || savedReflectionEntries.length > 0 ? (
          <View
            style={[
              styles.notesShelf,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.notesShelfHeader}>
              <View>
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "900" }}
                >
                  YOUR MARGINALIA
                </ThemedText>
                <ThemedText type="h3">Highlights & notes</ThemedText>
              </View>
              <AppIcon name="book-open" size={18} color={theme.primary} />
            </View>
            {savedHighlights.map((highlight) => (
              <View
                key={highlight.id}
                style={[
                  styles.notePreviewRow,
                  { borderColor: `${theme.primary}24` },
                ]}
              >
                <AppIcon name="star" size={14} color={theme.primary} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText type="caption" numberOfLines={1}>
                    {highlight.sectionHeading}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textMuted, lineHeight: 16 }}
                  >
                    {highlight.excerpt}
                  </ThemedText>
                </View>
              </View>
            ))}
            {savedReflectionEntries.map((entry) => (
              <View
                key={entry.chapter!.id}
                style={[
                  styles.notePreviewRow,
                  { borderColor: `${theme.scholar}24` },
                ]}
              >
                <AppIcon name="edit-3" size={14} color={theme.scholar} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText type="caption" numberOfLines={1}>
                    {entry.chapter!.title}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textMuted, lineHeight: 16 }}
                  >
                    {entry.note}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <ThemedText type="h3">Table of contents</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Preview the whole book and jump to any available chapter.
            </ThemedText>
          </View>
        </View>
        {book.chapters.map((chapter, index) => {
          const completed = progress?.completedChapters.includes(chapter.id);
          const bookmarked = progress?.bookmarks.includes(chapter.id);
          const locked = !canAccessChapter(userPlan, book, chapter.id);
          return (
            <Pressable
              key={chapter.id}
              onPress={() => openChapter(chapter.id)}
              style={({ pressed }) => [
                styles.chapterRow,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: locked ? theme.scholar + "44" : theme.border,
                },
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <View
                style={[
                  styles.chapterNumber,
                  {
                    backgroundColor: completed
                      ? theme.primary
                      : theme.surfaceElevated,
                  },
                ]}
              >
                {completed ? (
                  <AppIcon
                    name="check"
                    size={14}
                    color={theme.primaryForeground}
                    decorative
                  />
                ) : (
                  <ThemedText type="small" style={{ color: theme.text }}>
                    {index + 1}
                  </ThemedText>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText
                  type="body"
                  numberOfLines={1}
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  {chapter.title}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted }}
                  numberOfLines={1}
                >
                  {chapter.estimatedMinutes} min • {chapter.subtitle}
                </ThemedText>
              </View>
              {bookmarked ? (
                <AppIcon name="bookmark" size={16} color={theme.scholar} />
              ) : null}
              <AppIcon
                name={locked ? "lock" : "chevron-right"}
                size={18}
                color={locked ? theme.scholar : theme.textMuted}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );

  function Meta({ icon, label }: { icon: AppIconName; label: string }) {
    return (
      <View
        style={[
          styles.metaPill,
          {
            backgroundColor: theme.surfaceGlassStrong,
            borderColor: theme.border,
          },
        ]}
      >
        <AppIcon name={icon} size={15} color={theme.primary} />
        <ThemedText type="caption">{label}</ThemedText>
      </View>
    );
  }

  function ProgressStat({
    icon,
    label,
    value,
  }: {
    icon: AppIconName;
    label: string;
    value: string;
  }) {
    return (
      <View
        style={[
          styles.progressStat,
          {
            backgroundColor: theme.surfaceGlassStrong,
            borderColor: theme.border,
          },
        ]}
      >
        <AppIcon name={icon} size={14} color={theme.primary} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            {label}
          </ThemedText>
          <ThemedText type="small" numberOfLines={1}>
            {value}
          </ThemedText>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 120 },
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
  titlePage: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
    overflow: "hidden",
  },
  titlePageBody: {
    gap: Spacing.sm,
  },
  bookTitle: {
    lineHeight: 42,
  },
  bookSubtitle: {
    lineHeight: 23,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  attributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  metaPill: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  description: {
    marginTop: Spacing.lg,
    lineHeight: 24,
  },
  progressCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.md,
    overflow: "hidden",
  },
  reviewCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    overflow: "hidden",
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  featureCard: {
    flexGrow: 1,
    flexBasis: "48%",
    minHeight: 120,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  featureValue: {
    fontSize: 22,
    lineHeight: 28,
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
  progressStatRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  progressStat: {
    flex: 1,
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  premiumReaderCard: {
    minHeight: 74,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  smallUpgradeButton: {
    minHeight: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineBookCard: {
    minHeight: 78,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  offlineBookIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  notesShelf: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  notesShelfHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  notePreviewRow: {
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  sectionHeader: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  chapterRow: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  chapterNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
  },
});
