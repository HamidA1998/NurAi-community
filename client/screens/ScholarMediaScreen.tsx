import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, CategoryColors, Spacing } from "@/constants/theme";
import { SCHOLAR_MEDIA_SOURCES } from "@/data/scholarMediaSources";
import { AppIcon } from "@/components/icons";

export default function ScholarMediaScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const getColor = (key: keyof typeof CategoryColors) => {
    const c = CategoryColors[key] || CategoryColors.emerald;
    return isDark ? c.dark : c;
  };

  const openSource = async (url: string) => {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitle}>
          <ThemedText type="h4">Scholar Media</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Curated external channels
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={[theme.gradientStart, theme.gradientMid, theme.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroIcon}>
              <AppIcon name="play-circle" size={28} color={theme.onGradient} />
            </View>
            <ThemedText type="h1" style={styles.heroTitle}>
              Learn through curated Islamic channels
            </ThemedText>
            <ThemedText type="body" style={styles.heroText}>
              Open official channel pages for reminders, Quran reflections, and
              lessons while keeping creators in control of their work.
            </ThemedText>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(350)}>
          <View
            style={[
              styles.policyCard,
              {
                backgroundColor: theme.scholarSoft,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <AppIcon name="shield" size={18} color={theme.scholar} />
            <View style={styles.policyCopy}>
              <ThemedText type="small" style={styles.policyTitle}>
                Learn with care
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                We guide you to official sources so you can follow new lessons,
                support the creators, and verify personal rulings with qualified
                scholars.
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Official Channels</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Selected for learning
          </ThemedText>
        </View>

        {SCHOLAR_MEDIA_SOURCES.map((source, index) => {
          const color = getColor(source.colorKey);
          return (
            <Animated.View
              key={source.id}
              entering={FadeInDown.delay(140 + index * 50).duration(320)}
            >
              <Pressable
                onPress={() => openSource(source.url)}
                style={({ pressed }) => [
                  styles.sourceCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                  pressed
                    ? { opacity: 0.88, transform: [{ scale: 0.99 }] }
                    : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open ${source.title} official channel`}
                testID={`scholar-media-${source.id}`}
              >
                <View
                  style={[styles.sourceIcon, { backgroundColor: color.bg }]}
                >
                  <AppIcon name={source.icon} size={21} color={color.text} />
                </View>
                <View style={styles.sourceCopy}>
                  <View style={styles.sourceTitleRow}>
                    <ThemedText type="small" style={styles.sourceTitle}>
                      {source.title}
                    </ThemedText>
                    <AppIcon
                      name="external-link"
                      size={15}
                      color={theme.textMuted}
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted }}
                    numberOfLines={2}
                  >
                    {source.subtitle}
                  </ThemedText>
                  <View
                    style={[
                      styles.focusPill,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <AppIcon name="target" size={12} color={theme.scholar} />
                    <ThemedText
                      type="caption"
                      style={[styles.focusText, { color: theme.textSecondary }]}
                      numberOfLines={1}
                    >
                      {source.focus}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    style={[styles.trustNote, { color: theme.textMuted }]}
                  >
                    {source.trustNote}
                  </ThemedText>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}

        <Animated.View entering={FadeInDown.delay(380).duration(350)}>
          <View
            style={[
              styles.ownedCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.primaryBorder,
              },
            ]}
          >
            <View style={styles.ownedHeader}>
              <View
                style={[
                  styles.ownedIcon,
                  { backgroundColor: theme.primarySubtle },
                ]}
              >
                <AppIcon name="upload-cloud" size={18} color={theme.primary} />
              </View>
              <View style={styles.ownedTitleWrap}>
                <ThemedText type="h4">Focused Study Path</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Turn trusted lessons into action
                </ThemedText>
              </View>
            </View>
            <ThemedText
              type="body"
              style={[styles.ownedText, { color: theme.textSecondary }]}
            >
              Choose one reliable channel, watch with intention, then save a
              reflection or question in NurAI so the reminder becomes part of
              your learning.
            </ThemedText>
          </View>
        </Animated.View>
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
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  hero: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    color: "#FFFFFF",
    lineHeight: 42,
  },
  heroText: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 22,
    marginTop: Spacing.sm,
  },
  policyCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  policyCopy: {
    flex: 1,
    minWidth: 0,
  },
  policyTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    marginBottom: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  sourceCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sourceIcon: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  sourceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  sourceTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  focusPill: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  focusText: {
    flexShrink: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  trustNote: {
    lineHeight: 17,
  },
  ownedCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  ownedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  ownedIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  ownedTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  ownedText: {
    lineHeight: 22,
  },
});
