import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Coordinates, PrayerTimes } from "adhan";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, CategoryColors } from "@/constants/theme";
import { useNurAI } from "@/context/NurAIContext";
import { useLocation } from "@/context/LocationContext";
import { getCalculationMethod } from "@/lib/prayer-utils";
import { syncedSetItem } from "@/lib/progress-sync";
import { getHijriDate } from "@/services/nuraiHijriEngine";
import {
  CrescentMark,
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
  QuranIconSvg,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

const CURRENCIES: { code: string; symbol: string }[] = [
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
  { code: "EUR", symbol: "€" },
  { code: "SAR", symbol: "ر.س" },
  { code: "AED", symbol: "د.إ" },
  { code: "PKR", symbol: "Rs" },
  { code: "INR", symbol: "₹" },
  { code: "MYR", symbol: "RM" },
  { code: "IDR", symbol: "Rp" },
  { code: "TRY", symbol: "₺" },
  { code: "BDT", symbol: "৳" },
  { code: "EGP", symbol: "E£" },
];

function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "$";
}

function isRamadanHijri(): boolean {
  return getHijriDate().month === 9;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function RamadanScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { getRamadanInsightFn } = useNurAI();
  const { location } = useLocation();

  const [autoDetect, setAutoDetect] = useState(true);
  const [showInsight, setShowInsight] = useState(true);
  const [tarawih, setTarawih] = useState<boolean[]>(new Array(20).fill(false));
  const [charityInput, setCharityInput] = useState("");
  const [charityTotal, setCharityTotal] = useState(0);
  const [charityEntries, setCharityEntries] = useState<
    { amount: number; currency: string }[]
  >([]);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [countdown, setCountdown] = useState("");
  const [countdownLabel, setCountdownLabel] = useState("");

  const prayerData = useMemo(() => {
    const coordinates = new Coordinates(location.latitude, location.longitude);
    const params = getCalculationMethod(location.calculationMethod, {
      countryName: location.countryName,
      latitude: location.latitude,
    });
    const date = new Date();
    const prayerTimes = new PrayerTimes(coordinates, date, params);
    return {
      fajr: prayerTimes.fajr,
      maghrib: prayerTimes.maghrib,
    };
  }, [
    location.latitude,
    location.longitude,
    location.calculationMethod,
    location.countryName,
  ]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const suhoorTime = new Date(prayerData.fajr.getTime() - 10 * 60 * 1000);
      const iftarTime = prayerData.maghrib;

      let target: Date;
      let label: string;

      if (now < suhoorTime) {
        target = suhoorTime;
        label = "Time to Suhoor";
      } else if (now < iftarTime) {
        target = iftarTime;
        label = "Time to Iftar";
      } else {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowCoords = new Coordinates(
          location.latitude,
          location.longitude,
        );
        const tomorrowParams = getCalculationMethod(
          location.calculationMethod,
          {
            countryName: location.countryName,
            latitude: location.latitude,
          },
        );
        const tomorrowPrayers = new PrayerTimes(
          tomorrowCoords,
          tomorrow,
          tomorrowParams,
        );
        target = new Date(tomorrowPrayers.fajr.getTime() - 10 * 60 * 1000);
        label = "Time to Suhoor";
      }

      const diff = target.getTime() - now.getTime();
      setCountdown(formatCountdown(diff));
      setCountdownLabel(label);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [
    prayerData,
    location.latitude,
    location.longitude,
    location.calculationMethod,
    location.countryName,
  ]);

  useEffect(() => {
    AsyncStorage.getItem("ramadan_auto_detect").then((val) => {
      if (val !== null) setAutoDetect(val === "true");
    });
    AsyncStorage.getItem("charity_currency").then((val) => {
      if (val) setSelectedCurrency(val);
    });
  }, []);

  const handleAutoDetectToggle = () => {
    const newValue = !autoDetect;
    setAutoDetect(newValue);
    syncedSetItem("ramadan_auto_detect", String(newValue));
  };

  const handleCurrencySelect = (code: string) => {
    setSelectedCurrency(code);
    syncedSetItem("charity_currency", code);
  };

  const toggleTarawih = (index: number) => {
    setTarawih((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const completedRakah = tarawih.filter(Boolean).length;
  const isBeforeIftar = new Date() < prayerData.maghrib;
  const ramadanInsight = getRamadanInsightFn(
    completedRakah,
    charityTotal,
    isBeforeIftar,
  );

  const addCharity = () => {
    const amount = parseFloat(charityInput);
    if (!isNaN(amount) && amount > 0) {
      setCharityEntries((prev) => [
        ...prev,
        { amount, currency: selectedCurrency },
      ]);
      setCharityTotal((prev) => prev + amount);
      setCharityInput("");
    }
  };

  const todayJuz = (new Date().getDate() % 30) + 1;
  const quranProgress = todayJuz / 30;
  const ramadanDetected = isRamadanHijri();
  const ramadanActive = autoDetect ? ramadanDetected : false;
  const rhythmTitle = ramadanActive
    ? "Today’s Ramadan rhythm"
    : "Ramadan preparation";
  const rhythmSubtitle = ramadanActive
    ? "Fasting, tarawih, Quran, and charity in one calm view."
    : "Plan Quran, charity, and reminders without turning fasting mode on.";

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
        <ThemedText type="h4" accessibilityRole="header">
          Ramadan
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(300)}>
          <LinearGradient
            colors={[theme.gradientStart, theme.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
            <CrescentMark size={48} color="rgba(255,255,255,0.92)" />
            <ThemedText type="h2" style={styles.heroTitle}>
              {ramadanActive ? "Ramadan Mubarak" : "Prepare for Ramadan"}
            </ThemedText>
            <ThemedText type="body" style={styles.heroSubtitle}>
              {ramadanActive
                ? "May this blessed month bring you peace and blessings"
                : "Get ready for the most blessed month of the year"}
            </ThemedText>
            <GoldDivider
              color="rgba(255,255,255,0.42)"
              style={styles.heroDivider}
            />
          </LinearGradient>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(40).duration(300)}
          style={[
            styles.ramadanRhythmCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: `${theme.scholar}34`,
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <View style={styles.ramadanRhythmHeader}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: `${theme.primary}18` },
              ]}
            >
              <AppIcon name="moon" size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <ThemedText type="h4">{rhythmTitle}</ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, marginTop: 2 }}
              >
                {rhythmSubtitle}
              </ThemedText>
            </View>
          </View>
          <View style={styles.ramadanRhythmGrid}>
            <View style={styles.ramadanRhythmMetric}>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                {ramadanActive ? "Next" : "Mode"}
              </ThemedText>
              <ThemedText
                type="small"
                style={{ fontWeight: "800" }}
                numberOfLines={1}
              >
                {ramadanActive ? countdownLabel : "Prep"}
              </ThemedText>
            </View>
            <View style={styles.ramadanRhythmMetric}>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Tarawih
              </ThemedText>
              <ThemedText type="small" style={{ fontWeight: "800" }}>
                {completedRakah}/20
              </ThemedText>
            </View>
            <View style={styles.ramadanRhythmMetric}>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Charity
              </ThemedText>
              <ThemedText
                type="small"
                style={{ fontWeight: "800" }}
                numberOfLines={1}
              >
                {getCurrencySymbol(selectedCurrency)}
                {charityTotal.toFixed(0)}
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        {showInsight ? (
          <Animated.View
            entering={FadeInDown.delay(50).duration(300)}
            style={{ marginBottom: Spacing.sm }}
          >
            <LinearGradient
              colors={
                isDark
                  ? [theme.gradientStart, theme.gradientMid]
                  : [theme.gradientLightBg, theme.gradientLightBg2]
              }
              style={styles.nuraiCard}
            >
              <GeometricCardPattern color={theme.primaryText} opacity={0.012} />
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
                    NurAI
                  </ThemedText>
                </View>
                <Pressable onPress={() => setShowInsight(false)} hitSlop={8}>
                  <AppIcon name="x" size={14} color={theme.primaryText} />
                </Pressable>
              </View>
              <View style={styles.nuraiBody}>
                <AppIcon
                  name={ramadanInsight.icon as AppIconName}
                  size={18}
                  color={theme.primaryText}
                />
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[styles.nuraiTitle, { color: theme.primaryText }]}
                  >
                    {ramadanInsight.title}
                  </ThemedText>
                  <ThemedText
                    style={[styles.nuraiText, { color: theme.primaryText }]}
                  >
                    {ramadanInsight.body}
                  </ThemedText>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        ) : null}

        <Animated.View
          entering={FadeInDown.delay(80).duration(300)}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <View style={styles.autoDetectRow}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: `${theme.primary}20` },
              ]}
            >
              <AppIcon name="settings" size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">Auto-detect Ramadan</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                {ramadanDetected
                  ? "Ramadan is active for the current Hijri month"
                  : "Stays in preparation mode outside Ramadan"}
              </ThemedText>
            </View>
            <Pressable
              onPress={handleAutoDetectToggle}
              style={[
                styles.toggleTrack,
                {
                  backgroundColor: autoDetect
                    ? theme.primary
                    : theme.backgroundSecondary,
                },
              ]}
              testID="toggle-auto-detect"
            >
              <View
                style={[
                  styles.toggleThumb,
                  autoDetect ? styles.toggleThumbOn : styles.toggleThumbOff,
                ]}
              />
            </Pressable>
          </View>
        </Animated.View>

        {ramadanActive ? (
          <Animated.View
            entering={FadeInDown.delay(160).duration(300)}
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <GeometricCardPattern color={theme.primary} opacity={0.012} />
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: `${theme.primary}20` },
                ]}
              >
                <AppIcon name="clock" size={18} color={theme.primary} />
              </View>
              <ThemedText type="h4">{countdownLabel}</ThemedText>
            </View>
            <View style={styles.countdownContainer}>
              <ThemedText
                type="h1"
                style={[styles.countdownText, { color: theme.primary }]}
              >
                {countdown}
              </ThemedText>
            </View>
            <View style={styles.timesRow}>
              <View style={styles.timeItem}>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Suhoor ends
                </ThemedText>
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  {prayerData.fajr.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.timeDivider,
                  { backgroundColor: theme.borderSubtle },
                ]}
              />
              <View style={styles.timeItem}>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Iftar at
                </ThemedText>
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  {prayerData.maghrib.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </ThemedText>
              </View>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View
          entering={FadeInDown.delay(240).duration(300)}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardIcon,
                {
                  backgroundColor: isDark
                    ? CategoryColors.purple.dark.bg
                    : CategoryColors.purple.bg,
                },
              ]}
            >
              <AppIcon
                name="check-circle"
                size={18}
                color={
                  isDark
                    ? CategoryColors.purple.dark.text
                    : CategoryColors.purple.text
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">Tarawih Tracker</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                {completedRakah}/20 Rakah completed
              </ThemedText>
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarBg,
                { backgroundColor: `${theme.primary}20` },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${(completedRakah / 20) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.tarawihGrid}>
            {tarawih.map((checked, index) => (
              <Pressable
                key={index}
                onPress={() => toggleTarawih(index)}
                style={[
                  styles.tarawihCheckbox,
                  {
                    backgroundColor: checked
                      ? theme.primary
                      : `${theme.primary}10`,
                    borderColor: checked ? theme.primary : theme.borderSubtle,
                  },
                ]}
              >
                {checked ? (
                  <AppIcon name="check" size={14} color="#FFFFFF" />
                ) : (
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    {index + 1}
                  </ThemedText>
                )}
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(320).duration(300)}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardIcon,
                {
                  backgroundColor: isDark
                    ? CategoryColors.amber.dark.bg
                    : CategoryColors.amber.bg,
                },
              ]}
            >
              <AppIcon
                name="heart"
                size={18}
                color={
                  isDark
                    ? CategoryColors.amber.dark.text
                    : CategoryColors.amber.text
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">Charity Log</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Track your daily Sadaqah
              </ThemedText>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.currencyRow}
          >
            {CURRENCIES.map((cur) => {
              const isActive = selectedCurrency === cur.code;
              return (
                <Pressable
                  key={cur.code}
                  onPress={() => handleCurrencySelect(cur.code)}
                  style={[
                    styles.currencyChip,
                    {
                      backgroundColor: isActive
                        ? theme.primary
                        : theme.backgroundSecondary,
                      borderColor: isActive
                        ? theme.primary
                        : theme.borderSubtle,
                    },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color: isActive ? "#FFFFFF" : theme.textSecondary,
                      fontWeight: isActive ? "700" : "500",
                    }}
                  >
                    {cur.code} ({cur.symbol})
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
          <View
            style={[
              styles.charityTotal,
              { backgroundColor: `${theme.primary}10` },
            ]}
          >
            <ThemedText type="caption" style={{ color: theme.primary }}>
              Total Given
            </ThemedText>
            <ThemedText type="h3" style={{ color: theme.primary }}>
              {getCurrencySymbol(selectedCurrency)}
              {charityTotal.toFixed(2)}
            </ThemedText>
          </View>
          <View style={styles.charityInputRow}>
            <TextInput
              style={[
                styles.charityInput,
                {
                  backgroundColor: theme.input,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder="Enter amount"
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
              value={charityInput}
              onChangeText={setCharityInput}
              testID="input-charity-amount"
            />
            <Pressable
              onPress={addCharity}
              style={({ pressed }) => [
                styles.charityButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              testID="button-add-charity"
            >
              <AppIcon name="plus" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
          {charityEntries.length > 0 ? (
            <View style={styles.charityEntries}>
              {charityEntries.slice(-5).map((entry, index) => (
                <View
                  key={index}
                  style={[
                    styles.charityEntry,
                    { borderColor: theme.borderSubtle },
                  ]}
                >
                  <AppIcon
                    name="check-circle"
                    size={14}
                    color={theme.primary}
                  />
                  <ThemedText type="small">
                    {getCurrencySymbol(entry.currency)}
                    {entry.amount.toFixed(2)}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(400).duration(300)}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <GeometricCardPattern color={theme.primary} opacity={0.012} />
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardIcon,
                {
                  backgroundColor: isDark
                    ? CategoryColors.teal.dark.bg
                    : CategoryColors.teal.bg,
                },
              ]}
            >
              <QuranIconSvg
                size={22}
                color={
                  isDark
                    ? CategoryColors.teal.dark.text
                    : CategoryColors.teal.text
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">Daily Quran Goal</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Read 1 Juz per day
              </ThemedText>
            </View>
          </View>
          <View
            style={[
              styles.quranInfo,
              { backgroundColor: `${theme.primary}10` },
            ]}
          >
            <ThemedText type="h3" style={{ color: theme.primary }}>
              Juz {todayJuz}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.primary }}>
              Today's Reading
            </ThemedText>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: Spacing.xs,
              }}
            >
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Progress
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.primary, fontWeight: "600" }}
              >
                {todayJuz}/30 Juz
              </ThemedText>
            </View>
            <View
              style={[
                styles.progressBarBg,
                { backgroundColor: `${theme.primary}20` },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${quranProgress * 100}%`,
                  },
                ]}
              />
            </View>
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
  scrollContent: { paddingHorizontal: Spacing.lg },
  heroCard: {
    borderRadius: 24,
    padding: Spacing["2xl"],
    marginBottom: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
    overflow: "hidden",
  },
  heroDivider: { width: "64%", marginTop: Spacing.xs },
  heroTitle: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.lg,
    overflow: "hidden",
  },
  ramadanRhythmCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    overflow: "hidden",
  },
  ramadanRhythmHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  ramadanRhythmGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  ramadanRhythmMetric: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    padding: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.045)",
    gap: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownContainer: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  countdownText: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "700",
    letterSpacing: 2,
  },
  timesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  timeItem: {
    alignItems: "center",
    gap: 2,
  },
  timeDivider: {
    width: 1,
    height: 32,
  },
  progressBarContainer: {
    gap: Spacing.xs,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  tarawihGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  tarawihCheckbox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  currencyChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
  },
  charityTotal: {
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: "center",
    gap: 4,
  },
  charityInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  charityInput: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  charityButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  charityEntries: {
    gap: Spacing.xs,
  },
  charityEntry: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
  },
  quranInfo: {
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: "center",
    gap: 4,
  },
  autoDetectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  toggleThumbOff: {
    alignSelf: "flex-start",
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
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
    alignItems: "flex-start",
    gap: 8,
  },
  nuraiTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  nuraiText: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.9,
  },
});
