import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import { LibraryBookCard } from "@/components/library/LibraryBookCard";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useSubscription } from "@/context/SubscriptionContext";
import { useTheme } from "@/hooks/useTheme";
import { getBooksByCategory } from "@/services/libraryService";
import { getAllBookProgress } from "@/services/libraryProgressService";
import {
  listOfflineBooks,
  type OfflineBookEntry,
} from "@/services/libraryOfflineBookService";
import { LibraryCategory, PlanType, UserBookProgress } from "@/types/library";
import {
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon } from "@/components/icons";

export default function LibraryCategoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const { currentPlan, checkEntitlements } = useSubscription();
  const category = route.params?.category as LibraryCategory;
  const [progressByBook, setProgressByBook] = useState<
    Record<string, UserBookProgress>
  >({});
  const [offlineBooks, setOfflineBooks] = useState<OfflineBookEntry[]>([]);
  const books = getBooksByCategory(category);

  const loadProgress = useCallback(async () => {
    const [progress, savedBooks] = await Promise.all([
      getAllBookProgress(),
      listOfflineBooks(),
    ]);
    setProgressByBook(progress);
    setOfflineBooks(savedBooks);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress().catch(() => {});
    }, [loadProgress]),
  );

  useEffect(() => {
    loadProgress().catch(() => {});
  }, [loadProgress]);

  useEffect(() => {
    if (currentPlan === "free") {
      checkEntitlements().catch(() => {});
    }
  }, [checkEntitlements, currentPlan]);

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
        <View
          style={[
            styles.categoryHero,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.scholar + "33",
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <ThemedText
            type="caption"
            style={[styles.eyebrow, { color: theme.scholar }]}
          >
            LIBRARY CATEGORY
          </ThemedText>
          <ThemedText type="hero" style={styles.title}>
            {category}
          </ThemedText>
          <GoldDivider
            color={theme.scholar}
            opacity={0.44}
            style={styles.categoryDivider}
          />
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Study guides and interactive books for this path.
          </ThemedText>
        </View>
        {books.map((book) => (
          <LibraryBookCard
            key={book.id}
            book={book}
            progress={progressByBook[book.id]}
            userPlan={currentPlan as PlanType}
            savedOffline={offlineBooks.some(
              (entry) => entry.bookId === book.id,
            )}
            onPress={() =>
              navigation.navigate("BookDetail", { bookId: book.id })
            }
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 120 },
  header: { marginBottom: Spacing.lg },
  categoryHero: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
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
    marginBottom: Spacing.xs,
  },
  categoryDivider: {
    marginVertical: Spacing.md,
  },
});
