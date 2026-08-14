import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, CategoryColors, BorderRadius } from "@/constants/theme";
import {
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
  QuranIconSvg,
} from "@/components/premium/svg/PremiumSvgs";
import {
  Bookmark,
  BookmarkCollection,
  getBookmarks,
  removeBookmark,
  getCollections,
  addCollection,
  removeCollection,
} from "@/lib/bookmarks";
import { getAllBookProgress } from "@/services/libraryProgressService";
import type { UserBookProgress } from "@/types/library";
import { AppIcon, type AppIconName } from "@/components/icons";

const TYPE_COLORS: Record<string, keyof typeof CategoryColors> = {
  ayah: "emerald",
  dua: "purple",
  hadith: "blue",
  name_of_allah: "amber",
  adhkar: "teal",
  library_chapter: "amber",
};

const TYPE_LABELS: Record<string, string> = {
  ayah: "Ayah",
  dua: "Dua",
  hadith: "Hadith",
  name_of_allah: "Name of Allah",
  adhkar: "Adhkar",
  library_chapter: "Library",
};

interface DefaultCollection {
  id: string;
  name: string;
  icon: AppIconName;
  colorKey: keyof typeof CategoryColors;
  filter?: string;
}

const DEFAULT_COLLECTIONS: DefaultCollection[] = [
  { id: "_all", name: "All Bookmarks", icon: "bookmark", colorKey: "emerald" },
  {
    id: "_ayah",
    name: "Favorite Ayahs",
    icon: "book-open",
    colorKey: "emerald",
    filter: "ayah",
  },
  {
    id: "_dua",
    name: "Favorite Duas",
    icon: "heart",
    colorKey: "purple",
    filter: "dua",
  },
  {
    id: "_hadith",
    name: "Favorite Hadith",
    icon: "feather",
    colorKey: "blue",
    filter: "hadith",
  },
  {
    id: "_library",
    name: "Library Chapters",
    icon: "book-open",
    colorKey: "amber",
    filter: "library_chapter",
  },
];

const ICON_CHOICES: AppIconName[] = [
  "star",
  "heart",
  "bookmark",
  "folder",
  "tag",
  "flag",
  "award",
  "gift",
];

const COLOR_CHOICES: (keyof typeof CategoryColors)[] = [
  "emerald",
  "purple",
  "blue",
  "amber",
  "rose",
  "teal",
];

type AnnotationStats = {
  highlights: number;
  notes: number;
  books: number;
};

function buildAnnotationStats(
  progressByBook: Record<string, UserBookProgress>,
): AnnotationStats {
  const bookIds = new Set<string>();
  let highlights = 0;
  let notes = 0;

  Object.values(progressByBook).forEach((progress) => {
    const highlightCount = progress.highlights.length;
    const noteCount = Object.values(progress.reflections).filter(
      (note) => note.trim().length > 0,
    ).length;
    if (highlightCount > 0 || noteCount > 0) {
      bookIds.add(progress.bookId);
    }
    highlights += highlightCount;
    notes += noteCount;
  });

  return {
    highlights,
    notes,
    books: bookIds.size,
  };
}

function parseAyahReference(reference?: string): {
  surahNumber: number;
  verseNumber: number;
} | null {
  const match = String(reference || "").match(/^(\d{1,3})\s*:\s*(\d{1,3})/);
  if (!match) return null;
  const surahNumber = Number(match[1]);
  const verseNumber = Number(match[2]);
  if (!Number.isFinite(surahNumber) || !Number.isFinite(verseNumber)) {
    return null;
  }
  if (surahNumber < 1 || surahNumber > 114 || verseNumber < 1) return null;
  return { surahNumber, verseNumber };
}

export default function BookmarksScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [collections, setCollections] = useState<BookmarkCollection[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [activeCollectionName, setActiveCollectionName] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<AppIconName>("star");
  const [newColor, setNewColor] =
    useState<keyof typeof CategoryColors>("emerald");
  const [annotationStats, setAnnotationStats] = useState<AnnotationStats>({
    highlights: 0,
    notes: 0,
    books: 0,
  });

  const loadData = useCallback(async () => {
    const [b, c, progress] = await Promise.all([
      getBookmarks(),
      getCollections(),
      getAllBookProgress(),
    ]);
    setBookmarks(b);
    setCollections(c);
    setAnnotationStats(buildAnnotationStats(progress));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const getColor = (key: keyof typeof CategoryColors) => {
    const c = CategoryColors[key];
    return isDark ? c.dark : c;
  };

  const getFilteredBookmarks = (): Bookmark[] => {
    if (!activeCollection) return [];
    const defaultCol = DEFAULT_COLLECTIONS.find(
      (d) => d.id === activeCollection,
    );
    if (defaultCol) {
      if (!defaultCol.filter) return bookmarks;
      return bookmarks.filter((b) => b.type === defaultCol.filter);
    }
    return bookmarks.filter((b) => b.collectionId === activeCollection);
  };

  const getBookmarkCount = (collectionId: string): number => {
    const defaultCol = DEFAULT_COLLECTIONS.find((d) => d.id === collectionId);
    if (defaultCol) {
      if (!defaultCol.filter) return bookmarks.length;
      return bookmarks.filter((b) => b.type === defaultCol.filter).length;
    }
    return bookmarks.filter((b) => b.collectionId === collectionId).length;
  };

  const handleOpenCollection = (id: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCollection(id);
    setActiveCollectionName(name);
  };

  const handleBack = () => {
    if (activeCollection) {
      setActiveCollection(null);
      setActiveCollectionName("");
    } else {
      navigation.goBack();
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await removeBookmark(id);
    await loadData();
  };

  const handleOpenBookmark = (item: Bookmark) => {
    if (item.type === "ayah") {
      const ayahRef = parseAyahReference(item.reference);
      if (ayahRef) {
        navigation.navigate("QuranReader", {
          surahNumber: ayahRef.surahNumber,
          surahName:
            item.title.match(/Surah\s+(.+?)\s+-\s+Ayah/i)?.[1] || "Quran",
          initialVerse: ayahRef.verseNumber,
        });
        return;
      }
      navigation.navigate("Quran" as never);
      return;
    }

    if (
      item.type === "library_chapter" &&
      item.metadata?.bookId &&
      item.metadata?.chapterId
    ) {
      navigation.navigate("BookReader", {
        bookId: item.metadata.bookId,
        chapterId: item.metadata.chapterId,
      });
    }
  };

  const handleCreateCollection = async () => {
    if (!newName.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addCollection({
      name: newName.trim(),
      icon: newIcon,
      color: newColor,
    });
    setShowCreateModal(false);
    setNewName("");
    setNewIcon("star");
    setNewColor("emerald");
    await loadData();
  };

  const handleDeleteCollection = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await removeCollection(id);
    await loadData();
  };

  const formatDate = (iso: string): string => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const renderCollectionsGrid = () => {
    const allCards: {
      id: string;
      name: string;
      icon: string;
      colorKey: keyof typeof CategoryColors;
      isCustom: boolean;
    }[] = [];
    DEFAULT_COLLECTIONS.forEach((dc) => {
      allCards.push({
        id: dc.id,
        name: dc.name,
        icon: dc.icon,
        colorKey: dc.colorKey,
        isCustom: false,
      });
    });
    collections.forEach((c) => {
      allCards.push({
        id: c.id,
        name: c.name,
        icon: c.icon,
        colorKey: (c.color as keyof typeof CategoryColors) || "emerald",
        isCustom: true,
      });
    });

    const rows: (typeof allCards)[] = [];
    for (let i = 0; i < allCards.length; i += 2) {
      rows.push(allCards.slice(i, i + 2));
    }

    return (
      <View style={styles.gridContainer}>
        {rows.map((row, rowIdx) => (
          <Animated.View
            key={rowIdx}
            entering={FadeInDown.delay(rowIdx * 60).duration(300)}
            style={styles.gridRow}
          >
            {row.map((card) => {
              const color = getColor(card.colorKey);
              const count = getBookmarkCount(card.id);
              return (
                <Pressable
                  key={card.id}
                  style={({ pressed }) => [
                    styles.collectionCard,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                      borderLeftWidth: 4,
                      borderLeftColor: color.text,
                    },
                    pressed ? { opacity: 0.7 } : null,
                  ]}
                  onPress={() => handleOpenCollection(card.id, card.name)}
                  onLongPress={
                    card.isCustom
                      ? () => handleDeleteCollection(card.id)
                      : undefined
                  }
                  testID={`collection-${card.id}`}
                >
                  <GeometricCardPattern color={color.text} opacity={0.012} />
                  <View
                    style={[
                      styles.collectionIconWrap,
                      { backgroundColor: color.bg },
                    ]}
                  >
                    <AppIcon
                      name={card.icon as AppIconName}
                      size={20}
                      color={color.text}
                    />
                  </View>
                  <ThemedText style={styles.collectionName} numberOfLines={1}>
                    {card.name}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    {count} {count === 1 ? "item" : "items"}
                  </ThemedText>
                </Pressable>
              );
            })}
            {row.length === 1 ? (
              <View style={styles.collectionCardPlaceholder} />
            ) : null}
          </Animated.View>
        ))}
      </View>
    );
  };

  const renderBookmarkCard = (item: Bookmark, index: number) => {
    const typeColor = getColor(TYPE_COLORS[item.type] || "emerald");
    return (
      <Animated.View
        key={item.id}
        entering={FadeInDown.delay(index * 40).duration(300)}
      >
        <Pressable
          onPress={() => handleOpenBookmark(item)}
          style={[
            styles.bookmarkCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
          accessibilityRole={
            item.type === "library_chapter" ? "button" : undefined
          }
        >
          <GeometricCardPattern color={typeColor.text} opacity={0.012} />
          <View style={styles.bookmarkHeader}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
              <ThemedText
                type="caption"
                style={{
                  color: typeColor.text,
                  fontWeight: "600",
                  fontSize: 10,
                }}
              >
                {TYPE_LABELS[item.type] || item.type}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => handleDeleteBookmark(item.id)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.deleteBtn,
                pressed ? { opacity: 0.5 } : null,
              ]}
              testID={`delete-bookmark-${item.id}`}
            >
              <AppIcon name="trash-2" size={16} color={theme.textMuted} />
            </Pressable>
          </View>

          <ThemedText style={styles.bookmarkTitle}>{item.title}</ThemedText>

          {item.arabic ? (
            <ThemedText style={styles.bookmarkArabic}>{item.arabic}</ThemedText>
          ) : null}

          <ThemedText
            type="small"
            style={{ color: theme.textSecondary }}
            numberOfLines={2}
          >
            {item.translation}
          </ThemedText>

          <View style={styles.bookmarkFooter}>
            {item.reference ? (
              <View
                style={[
                  styles.refBadge,
                  { backgroundColor: `${theme.textMuted}15` },
                ]}
              >
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  {item.reference}
                </ThemedText>
              </View>
            ) : null}
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginLeft: "auto" }}
            >
              {formatDate(item.createdAt)}
            </ThemedText>
          </View>
          {item.type === "library_chapter" ? (
            <View style={styles.openHint}>
              <AppIcon name="book-open" size={13} color={theme.primary} />
              <ThemedText type="caption" style={{ color: theme.primary }}>
                Open chapter
              </ThemedText>
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    );
  };

  const renderDetailView = () => {
    const filtered = getFilteredBookmarks();
    return (
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length > 0 ? (
          filtered.map((item, idx) => renderBookmarkCard(item, idx))
        ) : (
          <View style={styles.emptyState}>
            <QuranIconSvg
              size={64}
              color={theme.primary}
              accentColor={theme.scholar}
              opacity={0.75}
            />
            <ThemedText
              type="h4"
              style={{ marginTop: Spacing.lg, textAlign: "center" }}
            >
              This collection is empty
            </ThemedText>
            <ThemedText
              type="caption"
              style={{
                color: theme.textMuted,
                textAlign: "center",
                marginTop: Spacing.sm,
                lineHeight: 18,
              }}
            >
              Save ayahs, duas, hadith, and book chapters here when something is
              worth returning to.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderEmptyAll = () => (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: theme.surfaceGlass,
          borderColor: theme.borderSubtle,
        },
      ]}
    >
      <GeometricCardPattern color={theme.scholar} opacity={0.012} />
      <View
        style={[
          styles.emptyIconShell,
          { backgroundColor: `${theme.primary}16` },
        ]}
      >
        <QuranIconSvg
          size={68}
          color={theme.primary}
          accentColor={theme.scholar}
          opacity={0.75}
        />
      </View>
      <ThemedText
        type="h4"
        style={{ marginTop: Spacing.lg, textAlign: "center" }}
      >
        No bookmarks yet
      </ThemedText>
      <ThemedText
        type="small"
        style={{
          color: theme.textSecondary,
          textAlign: "center",
          marginTop: Spacing.sm,
          paddingHorizontal: Spacing.xl,
        }}
      >
        Save your favorite ayahs, duas, hadith, and Library chapters from
        anywhere in the app
      </ThemedText>
    </View>
  );

  const renderBookmarksHero = () => (
    <View
      style={[
        styles.bookmarksHero,
        {
          backgroundColor: theme.surfaceGlass,
          borderColor: `${theme.scholar}35`,
        },
      ]}
    >
      <GeometricCardPattern color={theme.scholar} opacity={0.012} />
      <View style={styles.bookmarksHeroTop}>
        <View
          style={[
            styles.bookmarksHeroIcon,
            { backgroundColor: `${theme.primary}16` },
          ]}
        >
          <AppIcon name="bookmark" size={24} color={theme.primary} />
        </View>
        <View style={styles.bookmarksHeroCopy}>
          <ThemedText
            type="caption"
            style={[styles.heroEyebrow, { color: theme.scholar }]}
          >
            Saved knowledge
          </ThemedText>
          <ThemedText type="h3" style={{ color: theme.text }}>
            Your Islamic vault
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, lineHeight: 18 }}
          >
            Keep ayahs, duas, hadith, and book chapters ready for reflection.
          </ThemedText>
        </View>
      </View>
      <GoldDivider
        color={theme.scholar}
        opacity={0.5}
        style={styles.bookmarksHeroDivider}
      />
      <View style={styles.bookmarkStatsRow}>
        <View style={styles.bookmarkStat}>
          <ThemedText type="h3" style={{ color: theme.primary }}>
            {bookmarks.length}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Saved
          </ThemedText>
        </View>
        <View
          style={[
            styles.bookmarkStatDivider,
            { backgroundColor: theme.borderSubtle },
          ]}
        />
        <View style={styles.bookmarkStat}>
          <ThemedText type="h3" style={{ color: theme.scholar }}>
            {collections.length + DEFAULT_COLLECTIONS.length}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Collections
          </ThemedText>
        </View>
      </View>
      <View style={styles.bookmarksHeroActions}>
        <Pressable
          onPress={() => navigation.navigate("Quran" as never)}
          style={({ pressed }) => [
            styles.heroActionButton,
            { backgroundColor: theme.primary, opacity: pressed ? 0.78 : 1 },
          ]}
        >
          <AppIcon name="book-open" size={14} color={theme.primaryForeground} />
          <ThemedText
            type="caption"
            style={{ color: theme.primaryForeground, fontWeight: "900" }}
          >
            Open Quran
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("Tafsir" as never)}
          style={({ pressed }) => [
            styles.heroSecondaryButton,
            { borderColor: `${theme.scholar}45`, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <AppIcon name="search" size={14} color={theme.scholar} />
          <ThemedText
            type="caption"
            style={{ color: theme.scholar, fontWeight: "900" }}
          >
            Study Verse
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );

  const renderReaderAnnotationsCard = () => {
    const totalAnnotations = annotationStats.highlights + annotationStats.notes;
    return (
      <Pressable
        onPress={() => navigation.navigate("LibraryAnnotations")}
        style={({ pressed }) => [
          styles.annotationsCard,
          {
            backgroundColor: theme.surfaceGlass,
            borderColor: `${theme.primary}34`,
            opacity: pressed ? 0.78 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open Library notes and highlights. ${annotationStats.notes} notes and ${annotationStats.highlights} highlights saved.`}
        testID="button-bookmarks-library-annotations"
      >
        <GeometricCardPattern color={theme.primary} opacity={0.012} />
        <View
          style={[
            styles.annotationsIcon,
            { backgroundColor: `${theme.primary}18` },
          ]}
        >
          <AppIcon name="edit-3" size={20} color={theme.primary} />
        </View>
        <View style={styles.annotationsCopy}>
          <ThemedText
            type="caption"
            style={{ color: theme.primary, fontWeight: "900" }}
          >
            READER NOTES
          </ThemedText>
          <ThemedText style={styles.annotationsTitle} numberOfLines={1}>
            Notes & Highlights
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, lineHeight: 18 }}
            numberOfLines={2}
          >
            {totalAnnotations > 0
              ? `${totalAnnotations} private reader annotation${totalAnnotations === 1 ? "" : "s"} across ${annotationStats.books} book${annotationStats.books === 1 ? "" : "s"}.`
              : "Collect book reflections and highlighted passages inside the reader."}
          </ThemedText>
        </View>
        <View style={styles.annotationsStats}>
          <View
            style={[
              styles.annotationStatPill,
              {
                backgroundColor: `${theme.scholar}14`,
                borderColor: `${theme.scholar}30`,
              },
            ]}
          >
            <AppIcon name="star" size={12} color={theme.scholar} />
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              {annotationStats.highlights}
            </ThemedText>
          </View>
          <View
            style={[
              styles.annotationStatPill,
              {
                backgroundColor: `${theme.primary}14`,
                borderColor: `${theme.primary}30`,
              },
            ]}
          >
            <AppIcon name="edit-3" size={12} color={theme.primary} />
            <ThemedText
              type="caption"
              style={{ color: theme.primary, fontWeight: "900" }}
            >
              {annotationStats.notes}
            </ThemedText>
          </View>
          <AppIcon name="chevron-right" size={18} color={theme.textMuted} />
        </View>
      </Pressable>
    );
  };

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <Pressable
        style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
        onPress={() => setShowCreateModal(false)}
      >
        <Pressable
          style={[
            styles.modalContent,
            { backgroundColor: theme.backgroundDefault },
          ]}
          onPress={() => {}}
        >
          <ThemedText type="h4" style={{ marginBottom: Spacing.lg }}>
            New Collection
          </ThemedText>

          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: theme.input,
                borderColor: theme.inputBorder,
                color: theme.text,
              },
            ]}
            placeholder="Collection name"
            placeholderTextColor={theme.textMuted}
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />

          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}
          >
            Icon
          </ThemedText>
          <View style={styles.choiceGrid}>
            {ICON_CHOICES.map((ic) => {
              const selected = newIcon === ic;
              return (
                <Pressable
                  key={ic}
                  style={[
                    styles.choiceItem,
                    {
                      backgroundColor: selected
                        ? theme.primary
                        : theme.backgroundSecondary,
                      borderColor: selected
                        ? theme.primary
                        : theme.borderSubtle,
                    },
                  ]}
                  onPress={() => setNewIcon(ic)}
                >
                  <AppIcon
                    name={ic}
                    size={18}
                    color={selected ? "#FFFFFF" : theme.text}
                  />
                </Pressable>
              );
            })}
          </View>

          <ThemedText
            type="small"
            style={{
              color: theme.textSecondary,
              marginBottom: Spacing.sm,
              marginTop: Spacing.md,
            }}
          >
            Color
          </ThemedText>
          <View style={styles.choiceGrid}>
            {COLOR_CHOICES.map((ck) => {
              const cc = getColor(ck);
              const selected = newColor === ck;
              return (
                <Pressable
                  key={ck}
                  style={[
                    styles.colorItem,
                    { backgroundColor: cc.text },
                    selected
                      ? { borderWidth: 3, borderColor: theme.text }
                      : null,
                  ]}
                  onPress={() => setNewColor(ck)}
                />
              );
            })}
          </View>

          <View style={styles.modalActions}>
            <Pressable
              style={[
                styles.modalBtn,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() => setShowCreateModal(false)}
            >
              <ThemedText style={{ fontWeight: "600" }}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: theme.primary }]}
              onPress={handleCreateCollection}
            >
              <ThemedText
                style={{ fontWeight: "600", color: theme.buttonText }}
              >
                Create
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
            pressed ? { opacity: 0.6 } : null,
          ]}
          onPress={handleBack}
          hitSlop={8}
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitleBlock}>
          <ThemedText type="h4">
            {activeCollection ? activeCollectionName : "Bookmarks"}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            {activeCollection ? "Saved items" : "Knowledge vault"}
          </ThemedText>
        </View>
        {activeCollection ? (
          <View style={[styles.headerButton, { opacity: 0 }]} />
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
              pressed ? { opacity: 0.6 } : null,
            ]}
            onPress={() => setShowCreateModal(true)}
            hitSlop={8}
            testID="button-add-collection"
          >
            <AppIcon name="folder-plus" size={22} color={theme.text} />
          </Pressable>
        )}
      </View>

      {activeCollection ? (
        renderDetailView()
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {renderBookmarksHero()}
          {renderReaderAnnotationsCard()}
          {bookmarks.length === 0 && collections.length === 0
            ? renderEmptyAll()
            : renderCollectionsGrid()}
        </ScrollView>
      )}

      {renderCreateModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    alignItems: "center",
    gap: 2,
  },
  scrollContent: { paddingHorizontal: Spacing.lg },
  bookmarksHero: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  bookmarksHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  bookmarksHeroIcon: {
    width: 56,
    height: 56,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarksHeroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  bookmarksHeroDivider: {
    marginVertical: Spacing.md,
  },
  bookmarkStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookmarksHeroActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  heroActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  heroSecondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  bookmarkStat: {
    flex: 1,
    alignItems: "center",
  },
  bookmarkStatDivider: {
    width: 1,
    height: 32,
  },
  annotationsCard: {
    minHeight: 112,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  annotationsIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  annotationsCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  annotationsTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  annotationsStats: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: Spacing.xs,
    minWidth: 48,
  },
  annotationStatPill: {
    minHeight: 26,
    minWidth: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  gridContainer: { gap: Spacing.sm },
  gridRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  collectionCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  collectionCardPlaceholder: { flex: 1 },
  collectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  collectionName: {
    fontSize: 14,
    fontWeight: "600",
  },
  bookmarkCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  bookmarkHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  bookmarkTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  bookmarkArabic: {
    fontSize: 18,
    textAlign: "right",
    lineHeight: 32,
  },
  bookmarkFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  openHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  refBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing["2xl"],
    overflow: "hidden",
  },
  emptyIconShell: {
    width: 104,
    height: 104,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  choiceItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  colorItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing["2xl"],
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
