import React, { useState, useMemo, useCallback } from "react";
import { View, ScrollView, Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { PremiumGate } from "@/components/PremiumGate";
import { hasAccess } from "@/config/entitlements";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  CategoryColors,
  Fonts,
} from "@/constants/theme";
import { useKidsMode, MemorizationProgress } from "@/context/KidsModeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import {
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
  QuranIconSvg,
  DuaIconSvg,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";
import { KIDS_SURAHS as SURAHS, KidsSurah as Surah } from "@/data/kidsSurahs";
import { KIDS_DUAS as DUAS, KidsDua as Dua } from "@/data/kidsDuas";

type Tab = "surahs" | "duas";
type Status = MemorizationProgress["status"];

const STATUS_CONFIG: Record<
  Status,
  {
    label: string;
    icon: AppIconName;
    colorKey: keyof typeof CategoryColors;
  }
> = {
  not_started: { label: "Not Started", icon: "circle", colorKey: "purple" },
  learning: { label: "Learning", icon: "book-open", colorKey: "amber" },
  practicing: { label: "Practicing", icon: "repeat", colorKey: "blue" },
  memorized: { label: "Memorized", icon: "check-circle", colorKey: "emerald" },
};

const STATUS_ORDER: Status[] = [
  "not_started",
  "learning",
  "practicing",
  "memorized",
];

const POINTS_MAP: Record<Status, number> = {
  not_started: 0,
  learning: 5,
  practicing: 10,
  memorized: 25,
};

export default function KidsMemorizationScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { currentPlan } = useSubscription();
  const { memorization, updateMemorization, recordActivity, awardBadge } =
    useKidsMode();
  const canUseMemorization = hasAccess(currentPlan, "premium");

  const [activeTab, setActiveTab] = useState<Tab>("surahs");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getColor = (key: keyof typeof CategoryColors) =>
    isDark ? CategoryColors[key].dark : CategoryColors[key];

  const getStatus = useCallback(
    (itemId: string): Status => {
      const item = memorization.find((m) => m.itemId === itemId);
      return item ? item.status : "not_started";
    },
    [memorization],
  );

  const surahStats = useMemo(() => {
    let memorized = 0;
    let learning = 0;
    let practicing = 0;
    SURAHS.forEach((s) => {
      const st = getStatus(s.id);
      if (st === "memorized") memorized++;
      else if (st === "learning") learning++;
      else if (st === "practicing") practicing++;
    });
    return { memorized, learning, practicing, total: SURAHS.length };
  }, [getStatus]);

  const duaStats = useMemo(() => {
    let memorized = 0;
    let learning = 0;
    let practicing = 0;
    DUAS.forEach((d) => {
      const st = getStatus(d.id);
      if (st === "memorized") memorized++;
      else if (st === "learning") learning++;
      else if (st === "practicing") practicing++;
    });
    return { memorized, learning, practicing, total: DUAS.length };
  }, [getStatus]);

  const stats = activeTab === "surahs" ? surahStats : duaStats;
  const progressPercent =
    stats.total > 0 ? Math.round((stats.memorized / stats.total) * 100) : 0;

  const handleStatusChange = async (
    itemId: string,
    type: "surah" | "dua",
    newStatus: Status,
  ) => {
    if (!canUseMemorization) {
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const oldStatus = getStatus(itemId);
    if (oldStatus === newStatus) return;

    await updateMemorization(itemId, type, newStatus);

    const pointsDiff = POINTS_MAP[newStatus] - POINTS_MAP[oldStatus];
    if (pointsDiff > 0) {
      await recordActivity(1, pointsDiff);
    }

    if (newStatus === "memorized") {
      const totalMemorized =
        (type === "surah" ? surahStats.memorized : duaStats.memorized) + 1;
      const typeLabel = type === "surah" ? "Surah" : "Dua";

      if (totalMemorized === 1) {
        await awardBadge(
          `first-${type}-memorized`,
          `First ${typeLabel}!`,
          `Memorized your first ${typeLabel.toLowerCase()}`,
          "star",
          "memorization",
        );
      }
      if (totalMemorized === 5) {
        await awardBadge(
          `five-${type}s-memorized`,
          `${typeLabel} Scholar`,
          `Memorized 5 ${typeLabel.toLowerCase()}s`,
          "medal",
          "memorization",
        );
      }
      if (totalMemorized === 10) {
        await awardBadge(
          `all-${type}s-memorized`,
          `${typeLabel} Master`,
          `Memorized all 10 ${typeLabel.toLowerCase()}s`,
          "trophy",
          "memorization",
        );
      }
    }
  };

  const selectedSurah = selectedId
    ? SURAHS.find((s) => s.id === selectedId)
    : null;
  const selectedDua = selectedId ? DUAS.find((d) => d.id === selectedId) : null;
  const selectedItem = selectedSurah || selectedDua;
  const selectedType: "surah" | "dua" = selectedSurah ? "surah" : "dua";

  if (!canUseMemorization) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
        <LinearGradient
          colors={
            isDark
              ? [theme.gradientStart, "transparent"]
              : [theme.gradientLightBg, "transparent"]
          }
          style={styles.topGradient}
        />

        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.headerBtn}
            testID="button-back"
          >
            <AppIcon name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h3">Memorize</ThemedText>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + 100,
          }}
        >
          <PremiumGate
            requiredTier="premium"
            mode="replace"
            featureLabel="Kids memorization"
            upgradeMessage="Premium unlocks guided surah and dua memorization, progress states, and family learning rewards."
          >
            <View
              style={[
                styles.lockedPreviewCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <GeometricCardPattern color={theme.scholar} opacity={0.012} />
              <View
                style={[
                  styles.itemIconBadge,
                  { backgroundColor: getColor("emerald").bg },
                ]}
              >
                <QuranIconSvg size={26} color={getColor("emerald").text} />
              </View>
              <ThemedText type="h3" style={{ textAlign: "center" }}>
                Memorize with a clear path
              </ThemedText>
              <ThemedText
                type="body"
                style={{ color: theme.textMuted, textAlign: "center" }}
              >
                Track short surahs and essential duas from learning to
                memorized, with rewards that keep children motivated.
              </ThemedText>
            </View>
          </PremiumGate>
        </ScrollView>
      </View>
    );
  }

  if (selectedItem) {
    const currentStatus = getStatus(selectedId!);
    const isSurah = !!selectedSurah;

    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
        <LinearGradient
          colors={
            isDark
              ? [theme.gradientStart, "transparent"]
              : [theme.gradientLightBg, "transparent"]
          }
          style={styles.topGradient}
        />
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={() => {
              setSelectedId(null);
              Haptics.selectionAsync();
            }}
            style={styles.headerBtn}
            testID="button-detail-back"
          >
            <AppIcon name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h3" style={{ flex: 1, textAlign: "center" }}>
            {isSurah
              ? (selectedSurah as Surah).name
              : (selectedDua as Dua).title}
          </ThemedText>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + 40,
          }}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <LinearGradient
              colors={
                isDark
                  ? [theme.gradientStart, theme.primaryText]
                  : [theme.primary, theme.gradientStart]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.detailHero}
            >
              <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
              {isSurah ? (
                <>
                  <Text
                    style={[
                      styles.detailArabic,
                      { fontFamily: Fonts?.sansBold },
                    ]}
                  >
                    {(selectedSurah as Surah).arabicName}
                  </Text>
                  <Text
                    style={[
                      styles.detailSubtitle,
                      { fontFamily: Fonts?.sansSemiBold },
                    ]}
                  >
                    Surah {(selectedSurah as Surah).name} (
                    {(selectedSurah as Surah).number})
                  </Text>
                  <Text
                    style={[styles.detailMeaning, { fontFamily: Fonts?.sans }]}
                  >
                    "{(selectedSurah as Surah).meaning}" -{" "}
                    {(selectedSurah as Surah).verseCount} verses
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={[
                      styles.detailArabic,
                      { fontFamily: Fonts?.sansBold },
                    ]}
                  >
                    {(selectedDua as Dua).arabic}
                  </Text>
                  <Text
                    style={[
                      styles.detailSubtitle,
                      { fontFamily: Fonts?.sansSemiBold },
                    ]}
                  >
                    {(selectedDua as Dua).title}
                  </Text>
                  <Text
                    style={[styles.detailMeaning, { fontFamily: Fonts?.sans }]}
                  >
                    {(selectedDua as Dua).occasion}
                  </Text>
                </>
              )}
              <View style={styles.difficultyPill}>
                <Text
                  style={[
                    styles.difficultyText,
                    { fontFamily: Fonts?.sansSemiBold },
                  ]}
                >
                  {isSurah
                    ? (selectedSurah as Surah).difficulty
                    : (selectedDua as Dua).difficulty}
                </Text>
              </View>
              <GoldDivider
                color="rgba(255,255,255,0.4)"
                style={styles.detailDivider}
              />
            </LinearGradient>
          </Animated.View>

          {!isSurah ? (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <View
                style={[
                  styles.transliterationCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                <GeometricCardPattern color={theme.scholar} opacity={0.012} />
                <ThemedText type="h4" style={{ marginBottom: Spacing.sm }}>
                  Transliteration
                </ThemedText>
                <ThemedText
                  type="body"
                  style={{ color: theme.textSecondary, fontStyle: "italic" }}
                >
                  {(selectedDua as Dua).transliteration}
                </ThemedText>
                <View style={styles.translationDivider}>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: theme.borderSubtle },
                    ]}
                  />
                </View>
                <ThemedText type="h4" style={{ marginBottom: Spacing.sm }}>
                  Translation
                </ThemedText>
                <ThemedText type="body" style={{ color: theme.textSecondary }}>
                  {(selectedDua as Dua).translation}
                </ThemedText>
              </View>
            </Animated.View>
          ) : null}

          <Animated.View
            entering={FadeInDown.delay(isSurah ? 100 : 200).duration(400)}
          >
            <ThemedText type="h4" style={styles.sectionTitle}>
              Your Progress
            </ThemedText>
            <View
              style={[
                styles.statusCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <GeometricCardPattern color={theme.scholar} opacity={0.012} />
              {STATUS_ORDER.map((status, i) => {
                const config = STATUS_CONFIG[status];
                const color = getColor(config.colorKey);
                const isActive = currentStatus === status;
                return (
                  <Pressable
                    key={status}
                    onPress={() =>
                      handleStatusChange(selectedId!, selectedType, status)
                    }
                    style={[
                      styles.statusButton,
                      {
                        backgroundColor: isActive ? color.bg : "transparent",
                        borderColor: isActive ? color.text : theme.borderSubtle,
                      },
                    ]}
                    testID={`button-status-${status}`}
                  >
                    <AppIcon
                      name={config.icon as any}
                      size={20}
                      color={isActive ? color.text : theme.textMuted}
                    />
                    <Text
                      style={[
                        styles.statusButtonText,
                        {
                          color: isActive ? color.text : theme.textMuted,
                          fontFamily: isActive
                            ? Fonts?.sansSemiBold
                            : Fonts?.sans,
                        },
                      ]}
                    >
                      {config.label}
                    </Text>
                    {isActive ? (
                      <View
                        style={[
                          styles.activeIndicator,
                          { backgroundColor: color.text },
                        ]}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(isSurah ? 200 : 300).duration(400)}
          >
            <View
              style={[
                styles.pointsInfoCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <GeometricCardPattern
                color={getColor("amber").text}
                opacity={0.012}
              />
              <DuaIconSvg size={22} color={getColor("amber").text} />
              <ThemedText
                type="small"
                style={{
                  flex: 1,
                  marginLeft: Spacing.sm,
                  color: theme.textSecondary,
                }}
              >
                Points: Not Started (0) {">"} Learning (+5) {">"} Practicing
                (+10) {">"} Memorized (+25)
              </ThemedText>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <LinearGradient
        colors={
          isDark
            ? [theme.gradientStart, "transparent"]
            : [theme.gradientLightBg, "transparent"]
        }
        style={styles.topGradient}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3">Memorize</ThemedText>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.tabRow}>
            {(["surahs", "duas"] as Tab[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => {
                    setActiveTab(tab);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.tabPill,
                    {
                      backgroundColor: isActive
                        ? getColor("emerald").text
                        : theme.surfaceGlass,
                      borderColor: isActive
                        ? getColor("emerald").text
                        : theme.borderSubtle,
                    },
                  ]}
                  testID={`button-tab-${tab}`}
                >
                  <ThemedText
                    type="small"
                    style={{
                      color: isActive ? "#FFFFFF" : theme.textSecondary,
                      fontFamily: isActive ? Fonts?.sansSemiBold : Fonts?.sans,
                    }}
                  >
                    {tab === "surahs" ? "Surahs" : "Duas"}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <LinearGradient
            colors={
              isDark
                ? [theme.gradientStart, theme.primaryText]
                : [theme.primary, theme.gradientStart]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.progressCard}
          >
            <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
            <View style={styles.progressRow}>
              <View style={styles.progressCircleContainer}>
                <View style={styles.progressCircleBg}>
                  <View style={styles.progressCircleInner}>
                    <Text
                      style={[
                        styles.progressNumber,
                        { fontFamily: Fonts?.sansBold },
                      ]}
                    >
                      {stats.memorized}
                    </Text>
                    <Text
                      style={[
                        styles.progressTotal,
                        { fontFamily: Fonts?.sans },
                      ]}
                    >
                      /{stats.total}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.lg }}>
                <Text
                  style={[
                    styles.progressTitle,
                    { fontFamily: Fonts?.sansBold },
                  ]}
                >
                  {activeTab === "surahs" ? "Surahs" : "Duas"} Memorized
                </Text>
                <Text
                  style={[styles.progressSubtitle, { fontFamily: Fonts?.sans }]}
                >
                  {progressPercent}% complete
                </Text>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPercent}%` },
                    ]}
                  />
                </View>
                <View style={styles.miniStatsRow}>
                  <View style={styles.miniStat}>
                    <View
                      style={[styles.miniDot, { backgroundColor: "#FBBF24" }]}
                    />
                    <Text
                      style={[styles.miniStatText, { fontFamily: Fonts?.sans }]}
                    >
                      {stats.learning} learning
                    </Text>
                  </View>
                  <View style={styles.miniStat}>
                    <View
                      style={[styles.miniDot, { backgroundColor: "#60A5FA" }]}
                    />
                    <Text
                      style={[styles.miniStatText, { fontFamily: Fonts?.sans }]}
                    >
                      {stats.practicing} practicing
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            {activeTab === "surahs" ? "Short Surahs" : "Essential Duas"}
          </ThemedText>
        </Animated.View>

        {activeTab === "surahs"
          ? SURAHS.map((surah, i) => {
              const status = getStatus(surah.id);
              const config = STATUS_CONFIG[status];
              const color = getColor(config.colorKey);
              return (
                <Animated.View
                  key={surah.id}
                  entering={FadeInDown.delay(300 + i * 60).duration(400)}
                >
                  <Pressable
                    onPress={() => {
                      setSelectedId(surah.id);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.itemCard,
                      {
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                    testID={`button-surah-${surah.id}`}
                  >
                    <GeometricCardPattern
                      color={getColor("emerald").text}
                      opacity={0.012}
                    />
                    <View
                      style={[
                        styles.itemNumberBadge,
                        { backgroundColor: getColor("emerald").bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.itemNumber,
                          {
                            color: getColor("emerald").text,
                            fontFamily: Fonts?.sansBold,
                          },
                        ]}
                      >
                        {surah.number}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <View style={styles.itemTitleRow}>
                        <ThemedText
                          type="small"
                          style={{ fontFamily: Fonts?.sansSemiBold, flex: 1 }}
                        >
                          {surah.name}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          style={{
                            color: theme.textMuted,
                            fontFamily: Fonts?.sans,
                          }}
                        >
                          {surah.arabicName}
                        </ThemedText>
                      </View>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, marginTop: 2 }}
                      >
                        {surah.meaning} - {surah.verseCount} verses
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: color.bg },
                      ]}
                    >
                      <AppIcon
                        name={config.icon as any}
                        size={12}
                        color={color.text}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: color.text,
                            fontFamily: Fonts?.sansSemiBold,
                          },
                        ]}
                      >
                        {config.label}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })
          : DUAS.map((dua, i) => {
              const status = getStatus(dua.id);
              const config = STATUS_CONFIG[status];
              const color = getColor(config.colorKey);
              return (
                <Animated.View
                  key={dua.id}
                  entering={FadeInDown.delay(300 + i * 60).duration(400)}
                >
                  <Pressable
                    onPress={() => {
                      setSelectedId(dua.id);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.itemCard,
                      {
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                    testID={`button-dua-${dua.id}`}
                  >
                    <GeometricCardPattern
                      color={getColor("teal").text}
                      opacity={0.012}
                    />
                    <View
                      style={[
                        styles.itemIconBadge,
                        { backgroundColor: getColor("teal").bg },
                      ]}
                    >
                      <AppIcon
                        name="bookmark"
                        size={18}
                        color={getColor("teal").text}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <ThemedText
                        type="small"
                        style={{ fontFamily: Fonts?.sansSemiBold }}
                      >
                        {dua.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, marginTop: 2 }}
                      >
                        {dua.occasion}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: color.bg },
                      ]}
                    >
                      <AppIcon
                        name={config.icon as any}
                        size={12}
                        color={color.text}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: color.text,
                            fontFamily: Fonts?.sansSemiBold,
                          },
                        ]}
                      >
                        {config.label}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tabPill: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: "center",
  },
  progressCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  lockedPreviewCard: {
    minHeight: 340,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  progressRow: { flexDirection: "row", alignItems: "center" },
  progressCircleContainer: { alignItems: "center", justifyContent: "center" },
  progressCircleBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressCircleInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressNumber: { color: "#FFFFFF", fontSize: 22, lineHeight: 26 },
  progressTotal: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  progressTitle: { color: "#FFFFFF", fontSize: 16 },
  progressSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginTop: Spacing.sm,
    overflow: "hidden",
  },
  progressBarFill: { height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  miniStatsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  miniStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  miniDot: { width: 8, height: 8, borderRadius: 4 },
  miniStatText: { color: "rgba(255,255,255,0.85)", fontSize: 11 },
  sectionTitle: { marginTop: Spacing.xl, marginBottom: Spacing.md },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  itemNumberBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  itemNumber: { fontSize: 14 },
  itemIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  statusBadgeText: { fontSize: 10 },
  detailHero: {
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    alignItems: "center",
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  detailDivider: { marginTop: Spacing.md, width: "68%" },
  detailArabic: {
    color: "#FFFFFF",
    fontSize: 32,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  detailSubtitle: { color: "#FFFFFF", fontSize: 18, textAlign: "center" },
  detailMeaning: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
  difficultyPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginTop: Spacing.md,
  },
  difficultyText: {
    color: "#FFFFFF",
    fontSize: 12,
    textTransform: "capitalize",
  },
  transliterationCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  translationDivider: { paddingVertical: Spacing.md },
  dividerLine: { height: 1 },
  statusCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statusButtonText: { fontSize: 14, flex: 1 },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pointsInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    overflow: "hidden",
  },
});
