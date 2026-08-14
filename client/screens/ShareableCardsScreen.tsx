import React, { useState } from "react";
import { View, ScrollView, Pressable, StyleSheet, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useNurAI } from "@/context/NurAIContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

type TabKey = "verses" | "hadith" | "duas";

interface ContentItem {
  arabic?: string;
  text: string;
  source: string;
}

interface GradientTheme {
  name: string;
  colors: [string, string];
}

const TABS: {
  key: TabKey;
  label: string;
  icon: AppIconName;
}[] = [
  { key: "verses", label: "Verses", icon: "book-open" },
  { key: "hadith", label: "Hadith", icon: "book" },
  { key: "duas", label: "Duas", icon: "heart" },
];

const VERSES: ContentItem[] = [
  {
    text: "Allah does not burden a soul beyond that it can bear...",
    source: "Quran 2:286",
  },
  { text: "Do not lose hope, nor be sad...", source: "Quran 3:139" },
  {
    text: "Remember Me, and I will remember you...",
    source: "Quran 2:152",
  },
  {
    text: "Verily, in the remembrance of Allah do hearts find rest.",
    source: "Quran 13:28",
  },
  {
    text: "Perhaps you hate a thing and it is good for you...",
    source: "Quran 2:216",
  },
  {
    text: "And whoever relies upon Allah, then He is sufficient for him.",
    source: "Quran 65:3",
  },
  {
    text: "With hardship comes ease. Indeed, with hardship comes ease.",
    source: "Quran 94:5-6",
  },
  {
    text: "And those who strive for Us - We will surely guide them to Our ways.",
    source: "Quran 29:69",
  },
  {
    text: "And seek help through patience and prayer...",
    source: "Quran 2:45",
  },
  {
    text: "Whoever does righteousness, whether male or female, while being a believer...",
    source: "Quran 16:97",
  },
];

const HADITH: ContentItem[] = [
  {
    text: "The best of you are those who are best to their families.",
    source: "Jami at-Tirmidhi 3895",
  },
  {
    text: "Smiling in the face of your brother is charity.",
    source: "Jami at-Tirmidhi 1956",
  },
  {
    text: "The strong person is not the one who can wrestle, but the one who controls himself when angry.",
    source: "Sahih al-Bukhari 6114",
  },
  {
    text: "None of you truly believes until he wishes for his brother what he wishes for himself.",
    source: "Sahih al-Bukhari 13",
  },
  {
    text: "Every act of kindness is charity.",
    source: "Sahih al-Bukhari 6021",
  },
  {
    text: "The best wealth is a tongue that remembers Allah...",
    source: "Sunan Ibn Majah 1856",
  },
  {
    text: "Make things easy and do not make them difficult...",
    source: "Sahih al-Bukhari 69",
  },
  {
    text: "Whoever believes in Allah and the Last Day, let him speak good or remain silent.",
    source: "Sahih al-Bukhari 6018",
  },
  {
    text: "Be in this world as though you were a stranger or a traveler.",
    source: "Sahih al-Bukhari 6416",
  },
  {
    text: "The most beloved deeds to Allah are the most consistent, even if small.",
    source: "Sahih al-Bukhari 6464",
  },
];

const DUAS: ContentItem[] = [
  {
    arabic: "Rabbi zidni ilma",
    text: "My Lord, increase me in knowledge",
    source: "Quran 20:114",
  },
  {
    arabic: "Rabbana atina fid-dunya hasanatan...",
    text: "Our Lord, give us good in this world and good in the Hereafter",
    source: "Quran 2:201",
  },
  {
    arabic: "Hasbunallahu wa ni'mal wakeel",
    text: "Allah is sufficient for us, and He is the best Disposer of affairs",
    source: "Quran 3:173",
  },
  {
    arabic: "Allahumma inni a'udhu bika minal-hammi wal-hazan",
    text: "O Allah, I seek refuge in You from anxiety and sorrow",
    source: "Sunan Abu Dawud 1555",
  },
  {
    arabic: "Rabbi habli min ladunka dhurriyyatan tayyibatan",
    text: "My Lord, grant me righteous offspring",
    source: "Quran 3:38",
  },
];

const GRADIENT_THEMES: GradientTheme[] = [
  { name: "Emerald Dawn", colors: ["#10B981", "#047857"] },
  { name: "Ocean Deep", colors: ["#3B82F6", "#1E40AF"] },
  { name: "Sunset Gold", colors: ["#F59E0B", "#D97706"] },
  { name: "Rose Garden", colors: ["#F43F5E", "#BE123C"] },
  { name: "Purple Night", colors: ["#8B5CF6", "#6D28D9"] },
  { name: "Midnight Blue", colors: ["#1E3A5F", "#0A1120"] },
  { name: "Forest Green", colors: ["#22C55E", "#15803D"] },
  { name: "Desert Sand", colors: ["#D97706", "#92400E"] },
];

const CONTENT_MAP: Record<TabKey, ContentItem[]> = {
  verses: VERSES,
  hadith: HADITH,
  duas: DUAS,
};

function contentSourceLabel(tab: TabKey, item: ContentItem) {
  if (tab === "verses") {
    return /^quran\b/i.test(item.source)
      ? item.source
      : `Quran - ${item.source}`;
  }
  if (tab === "hadith") {
    return /^hadith\b/i.test(item.source)
      ? item.source
      : `Hadith - ${item.source}`;
  }
  return /^dua\b/i.test(item.source) ? item.source : `Dua - ${item.source}`;
}

export default function ShareableCardsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { getShareSuggestionFn } = useNurAI();

  const [activeTab, setActiveTab] = useState<TabKey>("verses");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [showSuggestion, setShowSuggestion] = useState(true);

  const shareSuggestion = getShareSuggestionFn();

  const items = CONTENT_MAP[activeTab];
  const currentItem = items[selectedIndex];
  const currentGradient = GRADIENT_THEMES[selectedTheme];
  const activeTabConfig = TABS.find((tab) => tab.key === activeTab) || TABS[0];
  const sourceLabel = contentSourceLabel(activeTab, currentItem);
  const sourceNote =
    activeTab === "hadith"
      ? "Reference is shown so people can check the source before resharing."
      : activeTab === "verses"
        ? "Quran reference is always included with the shared card text."
        : "Dua source is included so the reminder stays grounded.";

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSelectedIndex(0);
  };

  const handleSuggestionTap = () => {
    setActiveTab(shareSuggestion.tab);
    setSelectedIndex(shareSuggestion.index);
    setShowSuggestion(false);
  };

  const handleShare = async () => {
    const arabicLine = currentItem.arabic ? `${currentItem.arabic}\n\n` : "";
    const message = `${arabicLine}"${currentItem.text}"\n\n- ${sourceLabel}\n\nShared via NurAI app`;
    try {
      await Share.share({ message });
    } catch {}
  };

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? { opacity: 0.6 } : null,
          ]}
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3" style={styles.headerTitle}>
          Share Islamic Wisdom
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(280)}
          style={[
            styles.studioHeroCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: `${theme.scholar}34`,
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <View
            style={[
              styles.studioHeroIcon,
              { backgroundColor: `${theme.primary}16` },
            ]}
          >
            <AppIcon name="image" size={23} color={theme.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText type="h3">Dawah card studio</ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              Create calm, source-labelled reminders from Quran, hadith, and
              duas.
            </ThemedText>
          </View>
          <View
            style={[
              styles.studioHeroBadge,
              {
                backgroundColor: `${theme.scholar}12`,
                borderColor: `${theme.scholar}34`,
              },
            ]}
          >
            <AppIcon name="shield" size={12} color={theme.scholar} />
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              Source-led
            </ThemedText>
          </View>
        </Animated.View>

        {showSuggestion ? (
          <Pressable
            onPress={handleSuggestionTap}
            accessibilityRole="button"
            accessibilityLabel="Use NurAI suggested share card"
            testID="share-card-nurai-suggestion"
          >
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={{ marginBottom: Spacing.md }}
            >
              <LinearGradient
                colors={
                  isDark
                    ? [theme.gradientStart, theme.gradientMid]
                    : [theme.gradientLightBg, theme.gradientLightBg2]
                }
                style={styles.nuraiCard}
              >
                <GeometricCardPattern
                  color={theme.primaryText}
                  opacity={0.012}
                />
                <View style={styles.nuraiHeader}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      flex: 1,
                    }}
                  >
                    <View
                      style={[
                        styles.nuraiDot,
                        { backgroundColor: theme.primaryText },
                      ]}
                    />
                    <ThemedText
                      style={[styles.nuraiLabel, { color: theme.primaryText }]}
                    >
                      NurAI Suggests
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => setShowSuggestion(false)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss NurAI share suggestion"
                  >
                    <AppIcon name="x" size={14} color={theme.primaryText} />
                  </Pressable>
                </View>
                <View style={styles.nuraiBody}>
                  <AppIcon
                    name={shareSuggestion.icon as AppIconName}
                    size={18}
                    color={theme.primaryText}
                  />
                  <ThemedText
                    style={[styles.nuraiText, { color: theme.primaryText }]}
                    numberOfLines={3}
                  >
                    {shareSuggestion.reason}
                  </ThemedText>
                </View>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        ) : null}

        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.tabRow}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => handleTabChange(tab.key)}
                style={[
                  styles.tabButton,
                  {
                    backgroundColor: isActive
                      ? `${theme.primary}18`
                      : theme.backgroundSecondary,
                    borderColor: isActive
                      ? `${theme.primary}46`
                      : theme.borderSubtle,
                  },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Show ${tab.label} share cards`}
                testID={`tab-${tab.key}`}
              >
                <AppIcon
                  name={tab.icon}
                  size={16}
                  color={isActive ? theme.primary : theme.textSecondary}
                  style={{ marginRight: Spacing.xs }}
                />
                <ThemedText
                  style={[
                    styles.tabLabel,
                    { color: isActive ? theme.primary : theme.textSecondary },
                  ]}
                >
                  {tab.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.cardContainer}
        >
          <View
            style={[
              styles.cardMetaRail,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
            testID="share-card-source-rail"
          >
            <View
              style={[
                styles.cardMetaIcon,
                { backgroundColor: `${theme.primary}14` },
              ]}
            >
              <AppIcon
                name={activeTabConfig.icon}
                size={15}
                color={theme.primary}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: theme.primary, fontWeight: "900" }}
              >
                {activeTabConfig.label} card • {currentGradient.name}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={2}
                style={{ color: theme.textSecondary, marginTop: 2 }}
              >
                {sourceNote}
              </ThemedText>
            </View>
          </View>
          <LinearGradient
            colors={currentGradient.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
            <View style={styles.cardInner}>
              {currentItem.arabic ? (
                <ThemedText style={styles.arabicText}>
                  {currentItem.arabic}
                </ThemedText>
              ) : null}

              <ThemedText style={styles.translationText}>
                "{currentItem.text}"
              </ThemedText>

              <ThemedText style={styles.sourceText}>{sourceLabel}</ThemedText>
            </View>

            <View style={styles.cardFooter}>
              <ThemedText style={styles.watermark}>NurAI</ThemedText>
              <View style={styles.cardFooterPill}>
                <AppIcon name="shield" size={10} color="#FFFFFF" />
                <ThemedText style={styles.cardFooterPillText}>
                  Source labelled
                </ThemedText>
              </View>
            </View>
            <GoldDivider color="#FFFFFF" opacity={0.22} />
          </LinearGradient>
        </Animated.View>

        <View style={styles.navRow}>
          <Pressable
            onPress={handlePrev}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: theme.backgroundSecondary },
              pressed ? { opacity: 0.6 } : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Previous share card"
            testID="button-prev"
          >
            <AppIcon name="chevron-left" size={20} color={theme.text} />
          </Pressable>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {selectedIndex + 1} / {items.length}
          </ThemedText>
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: theme.backgroundSecondary },
              pressed ? { opacity: 0.6 } : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Next share card"
            testID="button-next"
          >
            <AppIcon name="chevron-right" size={20} color={theme.text} />
          </Pressable>
        </View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <ThemedText
            type="small"
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Background Theme
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, marginBottom: Spacing.sm }}
          >
            Selected: {currentGradient.name}
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themePicker}
          >
            {GRADIENT_THEMES.map((gt, index) => {
              const isSelected = selectedTheme === index;
              return (
                <Pressable
                  key={gt.name}
                  onPress={() => setSelectedTheme(index)}
                  style={[
                    styles.themeCircleOuter,
                    isSelected
                      ? { borderColor: theme.primary, borderWidth: 3 }
                      : { borderColor: "transparent", borderWidth: 3 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Use ${gt.name} card background`}
                  testID={`theme-${index}`}
                >
                  <LinearGradient
                    colors={gt.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.themeCircle}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          style={styles.shareSection}
        >
          <View
            style={[
              styles.shareTrustPanel,
              {
                backgroundColor: `${theme.primary}08`,
                borderColor: `${theme.primary}22`,
              },
            ]}
            testID="share-card-trust-panel"
          >
            {[
              {
                icon: "file-text" as const,
                label: "Source",
                value: currentItem.source,
                color: theme.primary,
              },
              {
                icon: "image" as const,
                label: "Format",
                value: "Story-ready",
                color: theme.scholar,
              },
              {
                icon: "send" as const,
                label: "Share",
                value: "Native sheet",
                color: theme.primary,
              },
            ].map((item) => (
              <View key={item.label} style={styles.shareTrustItem}>
                <AppIcon name={item.icon} size={13} color={item.color} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText
                    type="caption"
                    style={{ color: item.color, fontWeight: "900" }}
                  >
                    {item.label}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: theme.textSecondary, marginTop: 1 }}
                  >
                    {item.value}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [pressed ? { opacity: 0.85 } : null]}
            accessibilityRole="button"
            accessibilityLabel={`Share ${activeTabConfig.label.toLowerCase()} card from ${currentItem.source}`}
            testID="button-share"
          >
            <LinearGradient
              colors={[theme.gradientStart, theme.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shareButton}
            >
              <AppIcon
                name="share-2"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: Spacing.sm }}
              />
              <ThemedText style={styles.shareButtonText}>
                Share This Card
              </ThemedText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  studioHeroCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  studioHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  studioHeroBadge: {
    minHeight: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tabRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  cardContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  cardMetaRail: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardMetaIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 24,
    padding: Spacing["2xl"],
    justifyContent: "space-between",
  },
  cardInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  arabicText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 34,
    opacity: 0.95,
  },
  translationText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 28,
    marginBottom: Spacing.xl,
  },
  sourceText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  watermark: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  cardFooterPill: {
    minHeight: 26,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardFooterPillText: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 10,
    fontWeight: "800",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    marginBottom: Spacing.md,
    fontWeight: "600",
  },
  themePicker: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  themeCircleOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  themeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  shareSection: {
    marginTop: Spacing.md,
  },
  shareTrustPanel: {
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  shareTrustItem: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.xl,
  },
  shareButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  nuraiCard: {
    borderRadius: 20,
    padding: Spacing.md,
    overflow: "hidden",
  },
  nuraiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  nuraiDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  nuraiLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  nuraiBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nuraiText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
