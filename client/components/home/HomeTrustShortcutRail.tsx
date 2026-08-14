import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/icons";

const COLORS = {
  bg: "#050712",
  teal: "#56B394",
  goldBright: "#FFD46B",
  emerald: "#56B394",
  text: "#F8FBFF",
  muted: "rgba(231,242,246,0.7)",
};

type HomeTrustShortcutRailProps = {
  onOpenQuran: () => void;
  onSearch: () => void;
  onOpenScholarReview: () => void;
};

export function HomeTrustShortcutRail({
  onOpenQuran,
  onSearch,
  onOpenScholarReview,
}: HomeTrustShortcutRailProps) {
  return (
    <View
      style={styles.trustShortcutRail}
      testID="home-source-trust-shortcut-rail"
    >
      <View style={styles.trustShortcutHeader}>
        <View style={styles.trustShortcutHeaderCopy}>
          <Text style={styles.trustShortcutEyebrow}>SOURCE COMMAND</Text>
          <Text style={styles.trustShortcutHint} numberOfLines={1}>
            Search first, then continue with Quran or settings.
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onSearch}
        accessibilityRole="button"
        accessibilityLabel="Search sources, Quran, duas, books, tools, and saved answers"
        accessibilityHint="Opens global search from the Home command strip"
        testID="button-home-command-search-shortcut"
        style={({ pressed }) => [
          styles.searchHeroAction,
          pressed ? styles.searchCommandPressed : null,
        ]}
      >
        <View style={[styles.searchQuickActionIcon, styles.searchIconTeal]}>
          <AppIcon name="search" size={16} color={COLORS.bg} />
        </View>
        <View style={styles.searchHeroCopy}>
          <Text style={styles.searchHeroEyebrow}>SEARCH APP</Text>
          <Text style={styles.searchHeroTitle} numberOfLines={1}>
            Quran, duas, books, tools, saved answers
          </Text>
        </View>
        <View style={styles.searchHeroArrow}>
          <AppIcon name="arrow-up-right" size={15} color={COLORS.teal} />
        </View>
      </Pressable>
      <View style={styles.trustSecondaryActions}>
        <Pressable
          onPress={onOpenQuran}
          accessibilityRole="button"
          accessibilityLabel="Open Quran from Home command strip"
          testID="button-home-command-quran-shortcut"
          style={({ pressed }) => [
            styles.searchQuickAction,
            pressed ? styles.searchCommandPressed : null,
          ]}
        >
          <View style={styles.searchQuickActionIcon}>
            <AppIcon name="book-open" size={14} color={COLORS.goldBright} />
          </View>
          <Text style={styles.searchQuickActionText}>Quran</Text>
          <Text style={styles.searchQuickActionHint} numberOfLines={2}>
            Reader & audio
          </Text>
        </Pressable>
        <Pressable
          onPress={onOpenScholarReview}
          accessibilityRole="button"
          accessibilityLabel="Open plans and settings"
          testID="button-home-command-scholar-review"
          style={({ pressed }) => [
            styles.searchQuickAction,
            styles.searchQuickActionScholar,
            pressed ? styles.searchCommandPressed : null,
          ]}
        >
          <View
            style={[styles.searchQuickActionIcon, styles.searchIconEmerald]}
          >
            <AppIcon name="shield" size={14} color={COLORS.bg} />
          </View>
          <Text style={styles.searchQuickActionScholarText}>Plans</Text>
          <Text style={styles.searchQuickActionScholarHint} numberOfLines={2}>
            Access
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchCommandPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.992 }],
  },
  trustShortcutRail: {
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.22)",
    backgroundColor: "rgba(5, 15, 25, 0.86)",
    padding: 11,
    gap: 8,
  },
  trustShortcutHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  trustShortcutHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  trustShortcutEyebrow: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.1,
  },
  trustShortcutHint: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
  },
  trustSecondaryActions: {
    flexDirection: "row",
    gap: 8,
  },
  searchHeroAction: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.32)",
    backgroundColor: "rgba(86,179,148,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
  },
  searchHeroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  searchHeroEyebrow: {
    color: COLORS.teal,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9.5,
    letterSpacing: 0.9,
  },
  searchHeroTitle: {
    color: COLORS.text,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12.5,
  },
  searchHeroArrow: {
    width: 28,
    height: 28,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.22)",
    backgroundColor: "rgba(5,7,18,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchQuickAction: {
    minHeight: 50,
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.22)",
    backgroundColor: "rgba(255,212,107,0.07)",
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  searchQuickActionIcon: {
    width: 26,
    height: 26,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,212,107,0.12)",
  },
  searchIconTeal: {
    backgroundColor: COLORS.teal,
  },
  searchIconEmerald: {
    backgroundColor: "rgba(5,7,18,0.9)",
  },
  searchQuickActionText: {
    color: COLORS.goldBright,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11.5,
    textAlign: "center",
  },
  searchQuickActionHint: {
    color: COLORS.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 9.5,
    lineHeight: 12,
    textAlign: "center",
  },
  searchQuickActionScholar: {
    borderColor: "rgba(86,179,148,0.32)",
    backgroundColor: COLORS.emerald,
  },
  searchQuickActionScholarText: {
    color: COLORS.bg,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12,
    textAlign: "center",
  },
  searchQuickActionScholarHint: {
    color: "rgba(5,7,18,0.72)",
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9.5,
    lineHeight: 12,
    textAlign: "center",
  },
});
