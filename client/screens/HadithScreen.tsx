import React, { useState } from "react";
import {
  Linking,
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import * as Haptics from "expo-haptics";
import { toggleBookmark, isBookmarked } from "@/lib/bookmarks";
import { ThemedText } from "@/components/ThemedText";
import {
  GeometricCardPattern,
  GoldDivider,
  HadithIconSvg,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { HADITH_COLLECTIONS, Hadith } from "@/data/hadithData";
import { AppIcon } from "@/components/icons";

interface FlatHadith extends Hadith {
  collectionName: string;
}

const ALL_HADITHS: FlatHadith[] = HADITH_COLLECTIONS.flatMap((c) =>
  c.chapters.flatMap((ch) =>
    ch.hadiths.map((h) => ({ ...h, collectionName: c.name })),
  ),
);

export default function HadithScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [index, setIndex] = useState(0);
  const [isCurrentBookmarked, setIsCurrentBookmarked] = useState(false);

  const current = ALL_HADITHS[index];

  React.useEffect(() => {
    const check = async () => {
      const marked = await isBookmarked("hadith", current.sourceReference);
      setIsCurrentBookmarked(marked);
    };
    check();
  }, [current.sourceReference, index]);

  const handleBookmark = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nowBookmarked = await toggleBookmark({
      type: "hadith",
      title: current.sourceReference,
      arabic: "",
      translation: "Saved hadith reference with a trusted source link.",
      reference: current.sourceUrl,
    });
    setIsCurrentBookmarked(nowBookmarked);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${current.sourceReference}\n${current.sourceUrl}\n\nRead the full hadith text from the trusted source link in NurAI.`,
      });
    } catch {}
  };

  const goNext = () => setIndex((i) => (i + 1) % ALL_HADITHS.length);
  const goPrev = () =>
    setIndex((i) => (i - 1 + ALL_HADITHS.length) % ALL_HADITHS.length);

  const gradientColors = isDark
    ? ([theme.primary, theme.gradientEnd] as const)
    : ([theme.primary, theme.gradientEnd] as const);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <HadithIconSvg
            size={24}
            color={theme.primary}
            accentColor={theme.scholar}
          />
          <ThemedText type="h4">Hadith</ThemedText>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed && { opacity: 0.6 },
            ]}
            onPress={handleBookmark}
            hitSlop={8}
            testID="button-bookmark-hadith"
          >
            <AppIcon
              name="bookmark"
              size={20}
              color={isCurrentBookmarked ? theme.primary : theme.textMuted}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed && { opacity: 0.6 },
            ]}
            onPress={handleShare}
            hitSlop={8}
          >
            <AppIcon name="share-2" size={20} color={theme.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={index} entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
            <View
              style={[
                styles.hadithCard,
                { backgroundColor: theme.surfaceGlass },
              ]}
            >
              <GeometricCardPattern color={theme.scholar} opacity={0.012} />
              <ThemedText style={[styles.openQuote, { color: theme.primary }]}>
                Source
              </ThemedText>
              <ThemedText style={[styles.hadithText, { color: theme.text }]}>
                {current.sourceReference}
              </ThemedText>
              <GoldDivider
                color={theme.scholar}
                opacity={0.42}
                style={styles.hadithGoldDivider}
              />
              {current.originalReference !== current.sourceReference ? (
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, textAlign: "center" }}
                >
                  Indexed from {current.originalReference}
                </ThemedText>
              ) : null}

              <LinearGradient
                colors={["transparent", theme.primary, "transparent"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.decorativeLine}
              />

              <ThemedText
                type="body"
                style={[styles.narratorText, { color: theme.textSecondary }]}
              >
                Open the source page on Sunnah.com to read the full hadith text
                and translation.
              </ThemedText>

              <LinearGradient
                colors={["transparent", theme.primary, "transparent"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.thinDivider}
              />

              <View
                style={[
                  styles.sourceBadge,
                  { backgroundColor: `${theme.primary}20` },
                ]}
              >
                <AppIcon name="book-open" size={12} color={theme.primary} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "500" }}
                >
                  {current.collectionName}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => Linking.openURL(current.sourceUrl)}
                style={[
                  styles.sourceButton,
                  { borderColor: theme.primary + "55" },
                ]}
                accessibilityRole="link"
                accessibilityLabel={`Open ${current.sourceReference} on Sunnah.com`}
              >
                <AppIcon name="external-link" size={15} color={theme.primary} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "700" }}
                >
                  Open on Sunnah.com
                </ThemedText>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.navRow}>
          <Pressable
            style={({ pressed }) => [
              styles.navButtonPrev,
              {
                borderColor: theme.primary,
              },
              pressed && { opacity: 0.7 },
            ]}
            onPress={goPrev}
            testID="button-prev-hadith"
          >
            <AppIcon name="chevron-left" size={24} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary }}>
              Previous
            </ThemedText>
          </Pressable>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            {index + 1} / {ALL_HADITHS.length}
          </ThemedText>
          <Pressable
            onPress={goNext}
            testID="button-next-hadith"
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.navButtonNext}
            >
              <ThemedText type="small" style={{ color: theme.buttonText }}>
                Next
              </ThemedText>
              <AppIcon
                name="chevron-right"
                size={24}
                color={theme.buttonText}
              />
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
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
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  scrollContent: { paddingHorizontal: Spacing.lg },
  gradientBorder: {
    borderRadius: BorderRadius.xl,
    padding: 1,
    marginTop: Spacing["2xl"],
  },
  hadithCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
    alignItems: "center",
  },
  openQuote: {
    fontSize: 13,
    opacity: 0.8,
    lineHeight: 18,
    textAlign: "center",
    textTransform: "uppercase",
    fontWeight: "800",
    letterSpacing: 0,
  },
  hadithText: {
    textAlign: "center",
    fontSize: 20,
    lineHeight: 34,
    fontFamily: "LibreBaskerville_700Bold",
  },
  hadithGoldDivider: {
    width: 180,
    marginVertical: -Spacing.xs,
  },
  decorativeLine: {
    height: 1,
    width: "80%",
    marginVertical: Spacing.sm,
  },
  narratorText: {
    fontWeight: "600",
  },
  thinDivider: {
    height: 1,
    width: "60%",
    marginVertical: Spacing.xs,
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  sourceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.xl,
  },
  navButtonPrev: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  navButtonNext: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    gap: Spacing.xs,
  },
});
