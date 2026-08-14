import React, { useState, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, CategoryColors } from "@/constants/theme";
import { useSubscription } from "@/context/SubscriptionContext";
import quranContexts from "@/data/quranContexts.json";
import type { QuranVerseContext } from "@/services/nuraiEngine";
import {
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
  QuranIconSvg,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

interface QuickPickVerse {
  label: string;
  surah: number;
  verse: string;
  surahName: string;
}

const QUICK_PICKS: QuickPickVerse[] = [
  { label: "Al-Fatiha 1:1", surah: 1, verse: "1", surahName: "Al-Fatiha" },
  {
    label: "Ayatul Kursi 2:255",
    surah: 2,
    verse: "255",
    surahName: "Al-Baqarah",
  },
  {
    label: "Al-Baqarah 2:286",
    surah: 2,
    verse: "286",
    surahName: "Al-Baqarah",
  },
  { label: "Al-Imran 3:139", surah: 3, verse: "139", surahName: "Al-Imran" },
  { label: "Ar-Ra'd 13:28", surah: 13, verse: "28", surahName: "Ar-Ra'd" },
  { label: "An-Nur 24:35", surah: 24, verse: "35", surahName: "An-Nur" },
  { label: "Ya-Sin 36:1-3", surah: 36, verse: "1-3", surahName: "Ya-Sin" },
  { label: "Al-Mulk 67:1-2", surah: 67, verse: "1-2", surahName: "Al-Mulk" },
  {
    label: "Al-Ikhlas 112:1-4",
    surah: 112,
    verse: "1-4",
    surahName: "Al-Ikhlas",
  },
];

const TAFSIR_TRUST_POINTS: {
  title: string;
  body: string;
  icon: AppIconName;
}[] = [
  {
    title: "Sources cited",
    body: "Every note names its Quran or hadith source.",
    icon: "shield",
  },
  {
    title: "Study, not fatwa",
    body: "Sensitive rulings stay cautious.",
    icon: "alert-circle",
  },
  {
    title: "Instant, curated",
    body: "Reviewed notes, not AI-generated.",
    icon: "zap",
  },
];

const CONTEXT_TYPE_COPY: Record<
  QuranVerseContext["contextType"],
  { title: string; icon: AppIconName }
> = {
  tafsir: { title: "Tafsir", icon: "book-open" },
  practical: { title: "Practical Reflection", icon: "star" },
  hadith: { title: "Hadith Context", icon: "feather" },
  revelation: { title: "Revelation Context", icon: "clock" },
  linguistic: { title: "Linguistic Note", icon: "type" },
};

const QURAN_CONTEXTS = quranContexts as Record<string, QuranVerseContext[]>;

export default function TafsirScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isScholar } = useSubscription();
  const scrollRef = useRef<ScrollView>(null);

  const [surahInput, setSurahInput] = useState(
    route.params?.surah?.toString() || "",
  );
  const [verseInput, setVerseInput] = useState(
    route.params?.verse?.toString() || "",
  );
  const [error, setError] = useState("");
  const [contextNotes, setContextNotes] = useState<QuranVerseContext[] | null>(
    null,
  );
  const [notFound, setNotFound] = useState(false);
  const [activeReference, setActiveReference] = useState("");
  const [selectedQuickPick, setSelectedQuickPick] = useState<number | null>(
    null,
  );

  const validateInputs = useCallback(
    (surah: string, verse: string): boolean => {
      const surahNum = parseInt(surah, 10);
      if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
        setError("Please enter a valid surah number (1-114).");
        return false;
      }
      if (!verse || verse.trim().length === 0) {
        setError("Please enter a verse number.");
        return false;
      }
      const parts = verse.split("-");
      for (const p of parts) {
        const num = parseInt(p.trim(), 10);
        if (isNaN(num) || num < 1) {
          setError("Please enter a valid verse number.");
          return false;
        }
      }
      return true;
    },
    [],
  );

  const fetchTafsir = useCallback(
    async (surah: string, verse: string) => {
      if (!validateInputs(surah, verse)) return;
      if (!isScholar) {
        setError("Scholar unlocks source-aware tafsir study.");
        navigation.navigate("Subscription", {
          initialTab: "scholar",
          sourceFeature: "tafsir",
        });
        return;
      }

      setError("");
      setContextNotes(null);
      setNotFound(false);

      const quickPick = QUICK_PICKS.find(
        (q) => q.surah === parseInt(surah, 10) && q.verse === verse,
      );
      setActiveReference(
        quickPick
          ? `Surah ${quickPick.surahName}, Verse ${verse}`
          : `Surah ${surah}, Verse ${verse}`,
      );

      const firstVerse = parseInt(verse.split("-")[0], 10);
      const notes = QURAN_CONTEXTS[`${parseInt(surah, 10)}:${firstVerse}`];
      if (notes && notes.length > 0) {
        setContextNotes(notes);
      } else {
        setNotFound(true);
      }
    },
    [isScholar, navigation, validateInputs],
  );

  const handleGetTafsir = useCallback(() => {
    fetchTafsir(surahInput, verseInput);
  }, [surahInput, verseInput, fetchTafsir]);

  const handleQuickPick = useCallback(
    (pick: QuickPickVerse, index: number) => {
      setSurahInput(pick.surah.toString());
      setVerseInput(pick.verse);
      setSelectedQuickPick(index);
      fetchTafsir(pick.surah.toString(), pick.verse);
    },
    [fetchTafsir],
  );

  const chipColor = isDark
    ? CategoryColors.emerald.dark
    : CategoryColors.emerald;
  const purpleColor = isDark
    ? CategoryColors.purple.dark
    : CategoryColors.purple;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.sm,
          },
        ]}
      >
        <Pressable
          testID="button-back"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitleBlock}>
          <ThemedText
            type="h4"
            style={styles.headerTitle}
            accessibilityRole="header"
          >
            Quran Tafsir
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Source-aware study
          </ThemedText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(360)}>
          <LinearGradient
            colors={["#062D20", "#0A3D2A", "#061A14"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.tafsirHero, { borderColor: `${theme.scholar}40` }]}
          >
            <GeometricCardPattern color={theme.scholar} opacity={0.012} />
            <View style={styles.tafsirHeroTop}>
              <View
                style={[
                  styles.tafsirHeroIcon,
                  { backgroundColor: `${theme.primary}18` },
                ]}
              >
                <QuranIconSvg
                  size={34}
                  color={theme.primary}
                  accentColor={theme.scholar}
                />
              </View>
              <View style={styles.tafsirHeroCopy}>
                <ThemedText
                  type="caption"
                  style={[styles.heroEyebrow, { color: theme.scholar }]}
                >
                  Scholar mode
                </ThemedText>
                <ThemedText type="h3" style={{ color: theme.text }}>
                  Study with care
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, lineHeight: 18 }}
                >
                  Curated context, lessons, and cited sources for select verses,
                  with more added over time.
                </ThemedText>
              </View>
            </View>
            <GoldDivider
              color={theme.scholar}
              opacity={0.55}
              style={styles.tafsirHeroDivider}
            />
            <View style={styles.trustPointRow}>
              {TAFSIR_TRUST_POINTS.map((point) => (
                <View
                  key={point.title}
                  style={[
                    styles.trustPointCard,
                    {
                      backgroundColor: `${theme.backgroundRoot}55`,
                      borderColor: `${theme.scholar}24`,
                    },
                  ]}
                >
                  <AppIcon name={point.icon} size={14} color={theme.scholar} />
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: theme.text, fontWeight: "900" }}
                  >
                    {point.title}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, lineHeight: 16 }}
                  >
                    {point.body}
                  </ThemedText>
                </View>
              ))}
            </View>
            <ThemedText
              type="caption"
              style={{
                color: theme.textMuted,
                lineHeight: 18,
                marginTop: Spacing.md,
              }}
            >
              For personal rulings or sensitive matters, use this as a study aid
              and verify with qualified scholarship.
            </ThemedText>
          </LinearGradient>
        </Animated.View>

        {!isScholar ? (
          <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <Pressable
              onPress={() =>
                navigation.navigate("Subscription", {
                  initialTab: "scholar",
                  sourceFeature: "tafsir",
                })
              }
              style={({ pressed }) => [
                styles.scholarUnlockCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: `${theme.scholar}40`,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.scholarUnlockIcon,
                  { backgroundColor: theme.scholarSoft },
                ]}
              >
                <AppIcon name="award" size={18} color={theme.scholar} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText
                  type="small"
                  style={{ color: theme.text, fontWeight: "900" }}
                >
                  Scholar unlocks deeper tafsir support
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, lineHeight: 18 }}
                >
                  Free users can browse Quran. Scholar adds longer, source-aware
                  study notes and careful citations.
                </ThemedText>
              </View>
              <AppIcon name="chevron-right" size={18} color={theme.scholar} />
            </Pressable>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(400)}>
          <View
            style={[
              styles.selectorCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <View style={styles.selectorHeader}>
              <AppIcon name="search" size={18} color={theme.primary} />
              <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
                Select Verse
              </ThemedText>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputWrapper}>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    marginBottom: Spacing.xs,
                  }}
                >
                  Surah (1-114)
                </ThemedText>
                <TextInput
                  testID="input-surah"
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.input,
                      borderColor: theme.inputBorder,
                      color: theme.text,
                    },
                  ]}
                  value={surahInput}
                  onChangeText={(text) => {
                    setSurahInput(text.replace(/[^0-9]/g, ""));
                    setSelectedQuickPick(null);
                  }}
                  placeholder="Surah"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>

              <View style={styles.inputWrapper}>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    marginBottom: Spacing.xs,
                  }}
                >
                  Verse
                </ThemedText>
                <TextInput
                  testID="input-verse"
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.input,
                      borderColor: theme.inputBorder,
                      color: theme.text,
                    },
                  ]}
                  value={verseInput}
                  onChangeText={(text) => {
                    setVerseInput(text.replace(/[^0-9\-]/g, ""));
                    setSelectedQuickPick(null);
                  }}
                  placeholder="Ayah"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="default"
                  maxLength={7}
                />
              </View>
            </View>

            <Pressable
              testID="button-get-tafsir"
              onPress={handleGetTafsir}
              style={({ pressed }) => [
                styles.getTafsirButton,
                {
                  backgroundColor: theme.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppIcon
                name="book-open"
                size={18}
                color={theme.primaryForeground}
              />
              <ThemedText
                type="body"
                style={{
                  color: theme.primaryForeground,
                  fontWeight: "600",
                  marginLeft: Spacing.sm,
                }}
              >
                Get Tafsir
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <ThemedText
            type="caption"
            style={{
              color: theme.textSecondary,
              marginTop: Spacing.lg,
              marginBottom: Spacing.sm,
              marginLeft: Spacing.xs,
            }}
          >
            Popular Verses
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPickRow}
          >
            {QUICK_PICKS.map((pick, index) => {
              const isSelected = selectedQuickPick === index;
              return (
                <Pressable
                  key={index}
                  testID={`quick-pick-${index}`}
                  onPress={() => handleQuickPick(pick, index)}
                  style={({ pressed }) => [
                    styles.quickPickChip,
                    {
                      backgroundColor: isSelected
                        ? theme.primary
                        : isDark
                          ? chipColor.bg
                          : chipColor.bg,
                      borderColor: isSelected ? theme.primary : "transparent",
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color: isSelected
                        ? theme.primaryForeground
                        : isDark
                          ? chipColor.text
                          : chipColor.text,
                      fontWeight: isSelected ? "700" : "500",
                    }}
                  >
                    {pick.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {error.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View
              style={[
                styles.errorCard,
                {
                  backgroundColor: isDark
                    ? CategoryColors.rose.dark.bg
                    : CategoryColors.rose.bg,
                  borderColor: isDark
                    ? CategoryColors.rose.dark.text
                    : CategoryColors.rose.text,
                },
              ]}
            >
              <AppIcon
                name="alert-circle"
                size={18}
                color={
                  isDark
                    ? CategoryColors.rose.dark.text
                    : CategoryColors.rose.text
                }
              />
              <ThemedText
                type="small"
                style={{
                  color: isDark
                    ? CategoryColors.rose.dark.text
                    : CategoryColors.rose.text,
                  marginLeft: Spacing.sm,
                  flex: 1,
                }}
              >
                {error}
              </ThemedText>
            </View>
          </Animated.View>
        ) : null}

        {notFound ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View
              style={[
                styles.notFoundCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <AppIcon name="book-open" size={18} color={theme.textMuted} />
              <ThemedText
                type="small"
                style={{
                  color: theme.textSecondary,
                  marginLeft: Spacing.sm,
                  flex: 1,
                  lineHeight: 20,
                }}
              >
                No curated study note for {activeReference} yet. Try one of the
                popular verses below.
              </ThemedText>
            </View>
          </Animated.View>
        ) : null}

        {contextNotes ? (
          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <View
              style={[
                styles.resultCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <LinearGradient
                colors={
                  isDark
                    ? [CategoryColors.emerald.dark.bg, theme.surfaceGlass]
                    : [CategoryColors.emerald.bg, theme.surfaceGlass]
                }
                style={styles.resultHeader}
              >
                <AppIcon name="book" size={20} color={theme.primary} />
                <ThemedText
                  type="h4"
                  style={{ marginLeft: Spacing.sm, flex: 1 }}
                >
                  {activeReference}
                </ThemedText>
              </LinearGradient>

              {contextNotes.map((note, idx) => {
                const copy = CONTEXT_TYPE_COPY[note.contextType];
                return (
                  <View key={`${note.verseKey}-${note.contextType}-${idx}`}>
                    {idx > 0 ? (
                      <View
                        style={[
                          styles.sectionDivider,
                          { backgroundColor: theme.borderSubtle },
                        ]}
                      />
                    ) : null}
                    <View style={styles.sectionContainer}>
                      <View style={styles.sectionTitleRow}>
                        <View
                          style={[
                            styles.sectionIconBg,
                            { backgroundColor: purpleColor.bg },
                          ]}
                        >
                          <AppIcon
                            name={copy.icon}
                            size={14}
                            color={purpleColor.text}
                          />
                        </View>
                        <ThemedText
                          type="h4"
                          style={{ marginLeft: Spacing.sm }}
                        >
                          {copy.title}
                        </ThemedText>
                      </View>
                      <ThemedText
                        type="body"
                        style={{
                          color: theme.textSecondary,
                          marginTop: Spacing.sm,
                          lineHeight: 24,
                        }}
                      >
                        {note.content}
                      </ThemedText>
                      <View
                        style={[
                          styles.sourceCard,
                          {
                            backgroundColor: theme.backgroundSecondary,
                            borderColor: theme.borderSubtle,
                            marginTop: Spacing.md,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.sourceCardIcon,
                            { backgroundColor: theme.primarySubtle },
                          ]}
                        >
                          <AppIcon
                            name="bookmark"
                            size={14}
                            color={theme.primary}
                          />
                        </View>
                        <View style={styles.sourceCardText}>
                          <ThemedText
                            type="small"
                            style={{ color: theme.text, fontWeight: "800" }}
                          >
                            {note.source}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}

              <View
                style={[
                  styles.aiDisclaimerCard,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundTertiary
                      : "#FFF7ED",
                    borderColor: isDark ? "#334155" : "#FDBA7440",
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: Spacing.xs,
                    marginBottom: Spacing.xs,
                  }}
                >
                  <AppIcon
                    name="alert-circle"
                    size={14}
                    color={isDark ? "#FDBA74" : "#D97706"}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: isDark ? "#FDBA74" : "#D97706",
                      fontWeight: "700",
                    }}
                  >
                    Curated study note
                  </ThemedText>
                </View>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, lineHeight: 18 }}
                >
                  These notes are for learning and reflection. For personal
                  rulings or sensitive questions, verify with trusted tafsir
                  works and a qualified scholar.
                </ThemedText>
              </View>
            </View>
          </Animated.View>
        ) : null}

        {!contextNotes && !notFound && error.length === 0 ? (
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={styles.emptyState}
          >
            <View
              style={[
                styles.emptyIconBg,
                {
                  backgroundColor: isDark
                    ? CategoryColors.emerald.dark.bg
                    : CategoryColors.emerald.bg,
                },
              ]}
            >
              <AppIcon
                name="book-open"
                size={32}
                color={
                  isDark
                    ? CategoryColors.emerald.dark.text
                    : CategoryColors.emerald.text
                }
              />
            </View>
            <ThemedText
              type="body"
              style={{
                color: theme.textSecondary,
                textAlign: "center",
                marginTop: Spacing.md,
              }}
            >
              Select a surah and verse above, or pick a popular verse to explore
              its tafsir.
            </ThemedText>
          </Animated.View>
        ) : null}
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  tafsirHero: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  tafsirHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  tafsirHeroIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tafsirHeroCopy: {
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
  tafsirHeroDivider: {
    marginVertical: Spacing.md,
  },
  trustPointRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  trustPointCard: {
    flex: 1,
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 5,
  },
  scholarUnlockCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  scholarUnlockIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  selectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  inputRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  getTafsirButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  quickPickRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  quickPickChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
  },
  notFoundCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
  },
  resultCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginTop: Spacing.lg,
    overflow: "hidden",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  sectionContainer: {
    padding: Spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIconBg: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionDivider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    paddingHorizontal: Spacing["2xl"],
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  aiDisclaimerCard: {
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  sourceCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  sourceCardIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceCardText: {
    flex: 1,
  },
});
