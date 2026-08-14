import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import {
  GeometricCardPattern,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { hasAccess } from "@/config/entitlements";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useSubscription } from "@/context/SubscriptionContext";
import { useTheme } from "@/hooks/useTheme";
import { getBookById } from "@/services/libraryService";
import {
  getAllBookProgress,
  saveReflection,
} from "@/services/libraryProgressService";
import { Book, Chapter, PlanType, UserBookProgress } from "@/types/library";
import { AppIcon, type AppIconName } from "@/components/icons";

type AnnotationTab = "all" | "highlights" | "notes";

type HighlightAnnotation = {
  id: string;
  type: "highlight";
  book: Book;
  chapter: Chapter;
  title: string;
  body: string;
  createdAt: string;
};

type NoteAnnotation = {
  id: string;
  type: "note";
  book: Book;
  chapter: Chapter;
  title: string;
  body: string;
  createdAt: string;
};

type AnnotationRow = HighlightAnnotation | NoteAnnotation;

type NoteEditorTarget = {
  bookId: string;
  chapterId: string;
  bookTitle: string;
  chapterTitle: string;
};

function formatAnnotationDate(value?: string): string {
  if (!value) return "Saved";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function LibraryAnnotationsScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { currentPlan } = useSubscription();
  const userPlan = currentPlan as PlanType;
  const canExportAnnotations = hasAccess(userPlan, "premium");
  const [progressByBook, setProgressByBook] = useState<
    Record<string, UserBookProgress>
  >({});
  const [tab, setTab] = useState<AnnotationTab>("all");
  const [query, setQuery] = useState("");
  const [noteEditorTarget, setNoteEditorTarget] =
    useState<NoteEditorTarget | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const loadAnnotations = useCallback(async () => {
    setProgressByBook(await getAllBookProgress());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnnotations().catch(() => {});
    }, [loadAnnotations]),
  );

  const annotations = useMemo<AnnotationRow[]>(() => {
    const rows: AnnotationRow[] = [];
    Object.values(progressByBook).forEach((progress) => {
      const book = getBookById(progress.bookId);
      if (!book) return;

      progress.highlights.forEach((highlight) => {
        const chapter =
          book.chapters.find((item) => item.id === highlight.chapterId) ??
          book.chapters[0];
        if (!chapter) return;
        rows.push({
          id: highlight.id,
          type: "highlight",
          book,
          chapter,
          title: highlight.sectionHeading,
          body: highlight.excerpt,
          createdAt: highlight.createdAt,
        });
      });

      Object.entries(progress.reflections).forEach(([chapterId, note]) => {
        const trimmed = note.trim();
        const chapter =
          book.chapters.find((item) => item.id === chapterId) ??
          book.chapters[0];
        if (!chapter || !trimmed) return;
        rows.push({
          id: `${book.id}:${chapter.id}:note`,
          type: "note",
          book,
          chapter,
          title: chapter.title,
          body: trimmed,
          createdAt: progress.updatedAt,
        });
      });
    });
    return rows.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [progressByBook]);

  const highlights = useMemo(
    () => annotations.filter((item) => item.type === "highlight"),
    [annotations],
  );
  const notes = useMemo(
    () => annotations.filter((item) => item.type === "note"),
    [annotations],
  );

  const visibleAnnotations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return annotations.filter((item) => {
      const tabMatch =
        tab === "all" ||
        (tab === "highlights" && item.type === "highlight") ||
        (tab === "notes" && item.type === "note");
      if (!tabMatch) return false;
      if (!normalizedQuery) return true;
      return [
        item.title,
        item.body,
        item.book.title,
        item.chapter.title,
        item.book.category,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [annotations, query, tab]);

  const openAnnotation = (item: AnnotationRow) => {
    navigation.navigate("BookReader", {
      bookId: item.book.id,
      chapterId: item.chapter.id,
    });
  };

  const openNoteEditor = (item: NoteAnnotation) => {
    setNoteEditorTarget({
      bookId: item.book.id,
      chapterId: item.chapter.id,
      bookTitle: item.book.title,
      chapterTitle: item.chapter.title,
    });
    setNoteDraft(item.body);
  };

  const saveNote = async () => {
    if (!noteEditorTarget || savingNote) return;
    setSavingNote(true);
    try {
      const next = await saveReflection(
        noteEditorTarget.bookId,
        noteEditorTarget.chapterId,
        noteDraft,
      );
      setProgressByBook((current) => ({
        ...current,
        [noteEditorTarget.bookId]: next,
      }));
      setNoteEditorTarget(null);
      setNoteDraft("");
    } finally {
      setSavingNote(false);
    }
  };

  const exportAnnotations = async () => {
    if (!canExportAnnotations) {
      navigation.navigate("Subscription", {
        initialTab: "premium",
        sourceFeature: "library annotation export",
      });
      return;
    }

    const lines = [
      "NurAI Library Annotation Review",
      "Private reading notes and highlights. Not scholar-reviewed publication evidence.",
      "",
      `Highlights (${highlights.length})`,
      ...(highlights.length
        ? highlights.flatMap((item) => [
            `- ${item.book.title} / ${item.chapter.title} / ${item.title}`,
            `  ${item.body}`,
          ])
        : ["- None saved yet."]),
      "",
      `Notes (${notes.length})`,
      ...(notes.length
        ? notes.flatMap((item) => [
            `- ${item.book.title} / ${item.chapter.title}`,
            `  ${item.body}`,
          ])
        : ["- None saved yet."]),
    ];

    await Share.share({
      title: "NurAI Library Annotation Review",
      message: lines.join("\n"),
    });
  };

  const tabs = [
    { id: "all" as const, label: "All", count: annotations.length },
    {
      id: "highlights" as const,
      label: "Highlights",
      count: highlights.length,
    },
    { id: "notes" as const, label: "Notes", count: notes.length },
  ];

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}
      edges={["top"]}
    >
      <IslamicPatternBackground color={theme.primary} opacity={0.006} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          <Pressable
            onPress={exportAnnotations}
            style={[
              styles.exportButton,
              {
                backgroundColor: canExportAnnotations
                  ? theme.primarySubtle
                  : theme.scholarSoft,
                borderColor: canExportAnnotations
                  ? theme.primaryBorder
                  : `${theme.scholar}44`,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Export annotation review"
            testID="button-library-annotations-export"
          >
            <AppIcon
              name={canExportAnnotations ? "share-2" : "lock"}
              size={15}
              color={canExportAnnotations ? theme.primary : theme.scholar}
            />
            <ThemedText
              type="caption"
              style={{
                color: canExportAnnotations ? theme.primary : theme.scholar,
                fontWeight: "900",
              }}
            >
              Export
            </ThemedText>
          </Pressable>
        </View>

        <View
          style={[
            styles.hero,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.primaryBorder,
            },
          ]}
        >
          <GeometricCardPattern color={theme.primary} opacity={0.012} />
          <View style={styles.heroTop}>
            <View
              style={[
                styles.heroIcon,
                { backgroundColor: theme.primarySubtle },
              ]}
            >
              <AppIcon name="edit-3" size={24} color={theme.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <ThemedText
                type="caption"
                style={{ color: theme.primary, fontWeight: "900" }}
              >
                READER ANNOTATIONS
              </ThemedText>
              <ThemedText type="hero" style={styles.title}>
                Notes & Highlights
              </ThemedText>
            </View>
          </View>
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, lineHeight: 20 }}
          >
            Review your private reflections and saved passages across every
            NurAI book. Export is labelled as personal study, not publication
            proof.
          </ThemedText>
          <View style={styles.heroStats}>
            <HeroStat
              label="Highlights"
              value={highlights.length}
              icon="star"
              accent={theme.scholar}
            />
            <HeroStat
              label="Notes"
              value={notes.length}
              icon="edit-3"
              accent={theme.primary}
            />
            <HeroStat
              label="Total"
              value={annotations.length}
              icon="layers"
              accent={theme.primary}
            />
          </View>
        </View>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.input, borderColor: theme.inputBorder },
          ]}
        >
          <AppIcon name="search" size={18} color={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search notes, highlights, books"
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
            accessibilityLabel="Search Library annotations"
            returnKeyType="search"
          />
          {query.trim() ? (
            <Pressable
              onPress={() => setQuery("")}
              style={styles.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Clear annotation search"
            >
              <AppIcon name="x" size={16} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRail}
        >
          {tabs.map((item) => {
            const active = tab === item.id;
            const accent =
              item.id === "highlights" ? theme.scholar : theme.primary;
            return (
              <Pressable
                key={item.id}
                onPress={() => setTab(item.id)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: active
                      ? `${accent}18`
                      : theme.surfaceGlassStrong,
                    borderColor: active ? `${accent}66` : theme.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Show ${item.label}, ${item.count}`}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: active ? accent : theme.textSecondary,
                    fontWeight: "900",
                  }}
                >
                  {item.label}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: active ? accent : theme.textMuted }}
                >
                  {item.count}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.annotationList}>
          {visibleAnnotations.length > 0 ? (
            visibleAnnotations.map((item) => (
              <AnnotationCard
                key={item.id}
                item={item}
                onOpen={() => openAnnotation(item)}
                onEdit={
                  item.type === "note" ? () => openNoteEditor(item) : undefined
                }
              />
            ))
          ) : (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
              ]}
            >
              <AppIcon name="edit-3" size={26} color={theme.primary} />
              <ThemedText type="h4">No annotations found</ThemedText>
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary, textAlign: "center" }}
              >
                Highlights and reflections you save in the ebook reader will
                appear here.
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!noteEditorTarget}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!savingNote) {
            setNoteEditorTarget(null);
            setNoteDraft("");
          }
        }}
        testID="modal-library-annotations-note-editor"
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!savingNote) {
              setNoteEditorTarget(null);
              setNoteDraft("");
            }
          }}
        >
          <Pressable
            style={[
              styles.noteSheet,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
            onPress={() => {}}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText type="h3">Edit note</ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted, marginTop: 2 }}
                >
                  {noteEditorTarget?.bookTitle} ·{" "}
                  {noteEditorTarget?.chapterTitle}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => {
                  if (!savingNote) {
                    setNoteEditorTarget(null);
                    setNoteDraft("");
                  }
                }}
                style={[styles.iconButton, { borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel="Close note editor"
              >
                <AppIcon name="x" size={18} color={theme.text} />
              </Pressable>
            </View>
            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="Write your private reflection"
              placeholderTextColor={theme.textMuted}
              multiline
              textAlignVertical="top"
              style={[
                styles.noteInput,
                {
                  color: theme.text,
                  backgroundColor: theme.input,
                  borderColor: theme.inputBorder,
                },
              ]}
              accessibilityLabel="Edit Library note"
            />
            <View style={styles.noteActions}>
              <Pressable
                onPress={() => {
                  if (!savingNote) {
                    setNoteEditorTarget(null);
                    setNoteDraft("");
                  }
                }}
                style={[styles.cancelButton, { borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel="Cancel note editing"
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, fontWeight: "900" }}
                >
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={saveNote}
                disabled={savingNote}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: savingNote ? 0.66 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save Library note"
              >
                {savingNote ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.primaryForeground}
                  />
                ) : (
                  <AppIcon
                    name="save"
                    size={14}
                    color={theme.primaryForeground}
                  />
                )}
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.primaryForeground,
                    fontWeight: "900",
                  }}
                >
                  Save note
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );

  function HeroStat({
    label,
    value,
    icon,
    accent,
  }: {
    label: string;
    value: number;
    icon: AppIconName;
    accent: string;
  }) {
    return (
      <View style={[styles.heroStat, { borderColor: `${accent}30` }]}>
        <AppIcon name={icon} size={14} color={accent} />
        <ThemedText type="h4" style={{ color: accent }}>
          {value}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textMuted }}>
          {label}
        </ThemedText>
      </View>
    );
  }

  function AnnotationCard({
    item,
    onOpen,
    onEdit,
  }: {
    item: AnnotationRow;
    onOpen: () => void;
    onEdit?: () => void;
  }) {
    const accent = item.type === "highlight" ? theme.scholar : theme.primary;
    return (
      <View
        style={[
          styles.annotationCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: `${accent}38`,
          },
        ]}
      >
        <GeometricCardPattern color={accent} opacity={0.012} />
        <View style={styles.annotationTop}>
          <View
            style={[styles.annotationIcon, { backgroundColor: `${accent}18` }]}
          >
            <AppIcon
              name={item.type === "highlight" ? "star" : "edit-3"}
              size={16}
              color={accent}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.annotationTitleLine}>
              <ThemedText
                type="body"
                numberOfLines={1}
                style={{ fontWeight: "900" }}
              >
                {item.title}
              </ThemedText>
              <View style={[styles.typePill, { borderColor: `${accent}44` }]}>
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: accent, fontWeight: "900" }}
                >
                  {item.type === "highlight" ? "Highlight" : "Note"}
                </ThemedText>
              </View>
            </View>
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{ color: theme.textMuted, marginTop: 2 }}
            >
              {item.book.title} · {item.chapter.title}
            </ThemedText>
          </View>
        </View>
        <ThemedText
          type="small"
          numberOfLines={4}
          style={{ color: theme.textSecondary, lineHeight: 20 }}
        >
          {item.body}
        </ThemedText>
        <View style={styles.annotationFooter}>
          <View style={[styles.datePill, { borderColor: `${accent}30` }]}>
            <AppIcon name="clock" size={11} color={accent} />
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{ color: accent, fontWeight: "900" }}
            >
              {formatAnnotationDate(item.createdAt)}
            </ThemedText>
          </View>
          <View style={styles.annotationActions}>
            <Pressable
              onPress={onOpen}
              style={[styles.miniButton, { borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.book.title}`}
            >
              <AppIcon name="book-open" size={12} color={theme.primary} />
              <ThemedText
                type="caption"
                style={{ color: theme.primary, fontWeight: "900" }}
              >
                Open
              </ThemedText>
            </Pressable>
            {onEdit ? (
              <Pressable
                onPress={onEdit}
                style={[styles.miniButton, { borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel={`Edit note for ${item.book.title}`}
              >
                <AppIcon name="edit-3" size={12} color={theme.primary} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "900" }}
                >
                  Edit
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  exportButton: {
    minHeight: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  hero: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.lg,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
  },
  heroStats: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  heroStat: {
    flex: 1,
    minHeight: 74,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.045)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
    gap: 2,
  },
  searchBox: {
    minHeight: 56,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 15,
  },
  clearButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRail: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  tabChip: {
    minHeight: 42,
    minWidth: 104,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  annotationList: {
    gap: Spacing.md,
  },
  annotationCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    overflow: "hidden",
  },
  annotationTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  annotationIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  annotationTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  typePill: {
    minHeight: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    justifyContent: "center",
  },
  annotationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  annotationActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  datePill: {
    minHeight: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  miniButton: {
    minHeight: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  emptyCard: {
    minHeight: 220,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  noteSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.45)",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  noteInput: {
    minHeight: 166,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 16,
    lineHeight: 24,
  },
  noteActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
});
