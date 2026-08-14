import React, { useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import {
  GeometricCardPattern,
  GoldDivider,
  HadithIconSvg,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { BorderRadius, CategoryColors, Spacing } from "@/constants/theme";
import { HADITH_COLLECTIONS, getTotalIncludedHadiths } from "@/data/hadithData";
import { useTheme } from "@/hooks/useTheme";
import { AppIcon } from "@/components/icons";

export default function HadithLibraryScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const requestedCollectionId = String(
    route.params?.initialCollectionId || "bukhari",
  );
  const initialCollectionId = HADITH_COLLECTIONS.some(
    (collection) => collection.id === requestedCollectionId,
  )
    ? requestedCollectionId
    : "bukhari";
  const [selectedCollection, setSelectedCollection] =
    useState(initialCollectionId);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(
    String(route.params?.initialSearchQuery || ""),
  );

  const collection = HADITH_COLLECTIONS.find(
    (c) => c.id === selectedCollection,
  )!;
  const emerald = isDark ? CategoryColors.emerald.dark : CategoryColors.emerald;
  const totalSourceLinks = getTotalIncludedHadiths();

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return collection.chapters;
    const query = searchQuery.toLowerCase();
    return collection.chapters
      .map((chapter) => ({
        ...chapter,
        hadiths: chapter.hadiths.filter(
          (h) =>
            h.sourceReference.toLowerCase().includes(query) ||
            h.originalReference.toLowerCase().includes(query) ||
            h.sourceCollectionName.toLowerCase().includes(query),
        ),
      }))
      .filter(
        (chapter) =>
          chapter.hadiths.length > 0 ||
          chapter.name.toLowerCase().includes(query),
      );
  }, [collection, searchQuery]);

  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <HadithIconSvg
            size={26}
            color={theme.primary}
            accentColor={theme.scholar}
          />
          <ThemedText type="h3" style={styles.headerTitle}>
            Hadith Library
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            {formatNumber(totalSourceLinks)} verified source links
          </ThemedText>
        </View>
        <View style={styles.backButton} />
      </View>

      <Animated.View
        entering={FadeInDown.duration(400)}
        style={styles.searchContainer}
      >
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <AppIcon name="search" size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search references"
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search"
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => setSearchQuery("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <AppIcon name="x" size={18} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.collectionsRow}
        >
          {HADITH_COLLECTIONS.map((col) => {
            const isSelected = col.id === selectedCollection;
            return (
              <Pressable
                key={col.id}
                onPress={() => {
                  setSelectedCollection(col.id);
                  setExpandedChapter(null);
                }}
                style={[
                  styles.collectionChip,
                  {
                    backgroundColor: isSelected
                      ? emerald.bg
                      : theme.surfaceGlass,
                    borderColor: isSelected ? emerald.text : theme.borderSubtle,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open ${col.name}`}
                testID={`collection-${col.id}`}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: isSelected ? emerald.text : theme.textSecondary,
                    fontWeight: isSelected ? "700" : "400",
                  }}
                >
                  {col.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(150).duration(400)}
        style={[
          styles.collectionInfo,
          {
            backgroundColor: theme.surfaceGlass,
            borderColor: theme.borderSubtle,
          },
        ]}
      >
        <GeometricCardPattern color={theme.scholar} opacity={0.012} />
        <View style={{ flex: 1 }}>
          <ThemedText
            type="small"
            style={{ color: theme.primary, fontWeight: "600" }}
          >
            {collection.arabicName}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Compiled by {collection.compiler}
          </ThemedText>
          <GoldDivider
            color={theme.scholar}
            opacity={0.34}
            style={styles.collectionGoldDivider}
          />
        </View>
        <ThemedText type="caption" style={{ color: theme.textMuted }}>
          {formatNumber(collection.includedCount)} links
        </ThemedText>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
      >
        <View
          style={[
            styles.sourceNotice,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View
            style={[styles.reviewIcon, { backgroundColor: theme.scholarSoft }]}
          >
            <AppIcon name="shield" size={20} color={theme.scholar} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText
              type="small"
              style={{ color: theme.text, fontWeight: "700" }}
            >
              Trusted Hadith Source Links
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, lineHeight: 19 }}
            >
              NurAI opens the hadith text from trusted collection pages, so you
              can read the source directly and save the references you want to
              revisit.
            </ThemedText>
          </View>
        </View>

        {filteredChapters.map((chapter, chapterIndex) => {
          const isChapterExpanded = expandedChapter === chapter.name;
          return (
            <Animated.View
              key={chapter.name}
              entering={FadeInDown.delay(chapterIndex * 50).duration(400)}
            >
              <Pressable
                onPress={() =>
                  setExpandedChapter(isChapterExpanded ? null : chapter.name)
                }
                style={[
                  styles.chapterCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${chapter.name}, ${chapter.hadiths.length} source links`}
                testID={`chapter-${chapterIndex}`}
              >
                <View style={styles.chapterHeader}>
                  <AppIcon
                    name="book-open"
                    size={18}
                    color={theme.primary}
                    style={{ marginRight: Spacing.sm }}
                  />
                  <ThemedText type="h4" style={{ flex: 1 }}>
                    {chapter.name}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, marginRight: Spacing.sm }}
                  >
                    {chapter.hadiths.length} links
                  </ThemedText>
                  <AppIcon
                    name={isChapterExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={theme.textSecondary}
                  />
                </View>
              </Pressable>

              {isChapterExpanded
                ? chapter.hadiths.map((hadith, hIndex) => (
                    <Animated.View
                      key={`${hadith.sourceReference}-${hadith.id}`}
                      entering={FadeInDown.delay(hIndex * 25).duration(250)}
                    >
                      <View
                        style={[
                          styles.hadithCard,
                          {
                            backgroundColor: theme.surfaceGlass,
                            borderColor: theme.borderSubtle,
                          },
                        ]}
                      >
                        <View style={styles.hadithHeader}>
                          <View style={{ flex: 1 }}>
                            <ThemedText
                              type="small"
                              style={{ color: theme.text, fontWeight: "700" }}
                            >
                              {hadith.sourceReference}
                            </ThemedText>
                            {hadith.originalReference !==
                            hadith.sourceReference ? (
                              <ThemedText
                                type="caption"
                                style={{ color: theme.textMuted }}
                              >
                                Indexed from {hadith.originalReference}
                              </ThemedText>
                            ) : null}
                          </View>
                          <View
                            style={[
                              styles.verifiedBadge,
                              { backgroundColor: theme.scholarSoft },
                            ]}
                          >
                            <AppIcon
                              name="check-circle"
                              size={13}
                              color={theme.scholar}
                            />
                            <ThemedText
                              type="caption"
                              style={{
                                color: theme.scholar,
                                fontWeight: "700",
                              }}
                            >
                              Source
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textMuted, lineHeight: 19 }}
                        >
                          Open the primary source page to read the full hadith
                          text and translation.
                        </ThemedText>
                        <Pressable
                          onPress={() => Linking.openURL(hadith.sourceUrl)}
                          style={[
                            styles.sourceButton,
                            { borderColor: theme.primary + "55" },
                          ]}
                          accessibilityRole="link"
                          accessibilityLabel={`Open ${hadith.sourceReference} on Sunnah.com`}
                        >
                          <AppIcon
                            name="external-link"
                            size={15}
                            color={theme.primary}
                          />
                          <ThemedText
                            type="caption"
                            style={{ color: theme.primary, fontWeight: "700" }}
                          >
                            Open on Sunnah.com
                          </ThemedText>
                        </Pressable>
                      </View>
                    </Animated.View>
                  ))
                : null}
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sourceNotice: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  reviewIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    textAlign: "center",
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  collectionsRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  collectionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  collectionInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  collectionGoldDivider: {
    marginTop: Spacing.xs,
  },
  chapterCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  chapterHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  hadithCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.lg,
    gap: Spacing.md,
  },
  hadithHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xl,
  },
  sourceButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
