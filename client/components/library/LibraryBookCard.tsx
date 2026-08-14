import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { LibraryCoverArt } from "@/components/library/LibraryCoverArt";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { Book, PlanType, UserBookProgress } from "@/types/library";
import { canAccessBook, getPlanLabel } from "@/services/libraryAccessControl";
import { AppIcon } from "@/components/icons";

export function LibraryPlanBadge({ plan }: { plan: PlanType }) {
  const { theme } = useTheme();
  if (plan === "free") {
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: theme.primarySubtle,
            borderColor: theme.primaryBorder,
          },
        ]}
      >
        <ThemedText
          type="caption"
          style={[styles.badgeText, { color: theme.primary }]}
        >
          Free
        </ThemedText>
      </View>
    );
  }
  const isScholar = plan === "scholar";
  const color = isScholar ? theme.scholar : theme.primary;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isScholar ? theme.scholarSoft : theme.primarySubtle,
          borderColor: color + "55",
        },
      ]}
    >
      <AppIcon name={isScholar ? "award" : "lock"} size={11} color={color} />
      <ThemedText type="caption" style={[styles.badgeText, { color }]}>
        {getPlanLabel(plan)}
      </ThemedText>
    </View>
  );
}

export function LibraryBookCard({
  book,
  progress,
  userPlan,
  onPress,
  compact = false,
  savedOffline = false,
}: {
  book: Book;
  progress?: UserBookProgress;
  userPlan: PlanType;
  onPress: () => void;
  compact?: boolean;
  savedOffline?: boolean;
}) {
  const { theme } = useTheme();
  const accessible = canAccessBook(userPlan, book);
  const progressPercentage = progress?.progressPercentage ?? 0;
  const borderColor =
    book.requiredPlan === "scholar"
      ? theme.scholar + "88"
      : accessible
        ? theme.primaryBorder
        : theme.borderSubtle;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact ? styles.compactCard : null,
        { backgroundColor: theme.cardBackground, borderColor },
        pressed ? { opacity: 0.86, transform: [{ scale: 0.985 }] } : null,
      ]}
    >
      <LibraryCoverArt
        book={book}
        progressPercentage={progressPercentage}
        size="thumbnail"
      />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <ThemedText
            type="h4"
            style={styles.title}
            numberOfLines={compact ? 1 : 2}
          >
            {book.title}
          </ThemedText>
          <LibraryPlanBadge plan={book.requiredPlan} />
        </View>
        <ThemedText
          type="caption"
          style={{ color: theme.textMuted }}
          numberOfLines={compact ? 1 : 2}
        >
          {book.subtitle}
        </ThemedText>
        <View style={styles.metaRow}>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            {book.chapters.length} chapters
          </ThemedText>
          <View style={[styles.dot, { backgroundColor: theme.borderStrong }]} />
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            {book.estimatedMinutes} min
          </ThemedText>
          {progressPercentage > 0 ? (
            <>
              <View
                style={[styles.dot, { backgroundColor: theme.borderStrong }]}
              />
              <ThemedText type="caption" style={{ color: theme.primary }}>
                {progressPercentage}%
              </ThemedText>
            </>
          ) : null}
          {savedOffline ? (
            <>
              <View
                style={[styles.dot, { backgroundColor: theme.borderStrong }]}
              />
              <View
                style={[
                  styles.savedPill,
                  {
                    backgroundColor: theme.primarySubtle,
                    borderColor: theme.primaryBorder,
                  },
                ]}
              >
                <AppIcon
                  name="download-cloud"
                  size={10}
                  color={theme.primary}
                />
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: theme.primary, fontWeight: "900" }}
                >
                  Saved
                </ThemedText>
              </View>
            </>
          ) : null}
        </View>
        <View
          style={[styles.progressTrack, { backgroundColor: theme.borderLight }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercentage}%`,
                backgroundColor: accessible ? theme.primary : theme.scholar,
              },
            ]}
          />
        </View>
      </View>
      <AppIcon
        name={accessible ? "chevron-right" : "lock"}
        size={18}
        color={accessible ? theme.textMuted : theme.scholar}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 132,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  compactCard: {
    minHeight: 116,
  },
  body: {
    flex: 1,
    gap: Spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  savedPill: {
    minHeight: 22,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: Spacing.xs,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
});
