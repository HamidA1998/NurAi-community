import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useContext,
} from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  FlatList,
  AppState,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { SectionHeader } from "@/components/SectionHeader";
import { PremiumBadge } from "@/components/PremiumGate";
import {
  AIResponseModal,
  AIResponseState,
  AIResponseData,
  customerSafeAIErrorMessage,
} from "@/components/AIResponseModal";
import { useTheme } from "@/hooks/useTheme";
import {
  Aurora,
  NuraiBottomSheet,
  NuraiButton,
  NuraiCard,
  NuraiGlass,
  NuraiSpace,
  NuraiType,
} from "@/design-system";
import { AuthContext } from "@/context/AuthContext";
import { PrayerCompletionCelebration } from "@/components/PrayerCompletionCelebration";
import { Spacing, BorderRadius, CategoryColors } from "@/constants/theme";
import {
  useLocation,
  POPULAR_CITIES,
  UserLocation,
} from "@/context/LocationContext";
import {
  searchGlobalLocations,
  type LocationSearchResult,
} from "@/services/locationSearchService";
import { useNurAI } from "@/context/NurAIContext";
import { useSubscription } from "@/context/SubscriptionContext";
import {
  getPrayerInsightsAI,
  AIContextError,
} from "@/services/aiContextService";
import { mapAIContextResponseToModalData } from "@/services/personalAIResponseMapper";
import { loadProfileV3 } from "@/services/nuraiProfileV3";
import {
  buildPrayerIntelligence,
  formatPrayerClock,
  localDateKey,
  PRAYER_KEYS,
  PRAYER_LABELS,
  type PrayerKey,
} from "@/lib/prayer-intelligence";
import {
  getPrayerTrackerSummary,
  loadPrayerTrackerState,
  togglePrayerPrayed,
  type PrayerTrackerState,
} from "@/lib/prayer-tracker";
import { AppIcon, type AppIconName } from "@/components/icons";
import { recordGardenAction } from "@/services/gardenService";

const PRAYER_INFO: {
  key: string;
  name: string;
  icon: AppIconName;
}[] = [
  { key: "fajr", name: "Fajr", icon: "sunrise" },
  { key: "sunrise", name: "Sunrise", icon: "sun" },
  { key: "dhuhr", name: "Dhuhr", icon: "sun" },
  { key: "asr", name: "Asr", icon: "sun" },
  { key: "maghrib", name: "Maghrib", icon: "sunset" },
  { key: "isha", name: "Isha", icon: "moon" },
];

const PRAYER_NOTES: Record<string, string> = {
  fajr: "The two rak'ah of Fajr are better than the world and all it contains. A calm, early start to the day.",
  sunrise:
    "Prayer is disliked at the moment of sunrise. Wait until the sun has fully risen for Duha.",
  dhuhr:
    "A pause in the middle of the day to turn back to Allah before work and errands pull you away.",
  asr: "Guard the middle prayer. Whoever prays Asr on time, their deeds are raised before Allah.",
  maghrib:
    "Pray Maghrib soon after sunset — its window is short. A gentle close to the daylight.",
  isha: "End your day in remembrance. Praying Isha in congregation is like praying half the night.",
};

const METHOD_OPTIONS: { id: string; label: string; detail: string }[] = [
  {
    id: "MuslimWorldLeague",
    label: "Muslim World League",
    detail: "Widely used worldwide",
  },
  {
    id: "MoonsightingCommittee",
    label: "Moonsighting Committee",
    detail: "UK, North America",
  },
  { id: "UmmAlQura", label: "Umm al-Qura", detail: "Makkah, Saudi Arabia" },
  { id: "Egyptian", label: "Egyptian Authority", detail: "Egypt, Africa" },
  { id: "Karachi", label: "University of Karachi", detail: "Pakistan, India" },
  { id: "NorthAmerica", label: "ISNA", detail: "North America" },
  { id: "Kuwait", label: "Kuwait", detail: "Kuwait" },
  { id: "Qatar", label: "Qatar", detail: "Qatar" },
  { id: "Singapore", label: "Singapore", detail: "Singapore, Malaysia" },
  { id: "Turkey", label: "Diyanet", detail: "Turkey" },
  { id: "Dubai", label: "Dubai", detail: "UAE" },
  { id: "Tehran", label: "Tehran", detail: "Iran, Shia" },
];

function formatTime(date: Date, is24h: boolean): string {
  if (is24h) {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatRemainingTime(target: Date, now: Date): string {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return "";
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

function PrayerHeroCard({
  intelligence,
  is24h,
  theme,
}: {
  intelligence: ReturnType<typeof buildPrayerIntelligence>;
  is24h: boolean;
  theme: any;
}) {
  const windowProgress = Math.max(
    0.02,
    Math.min(
      1,
      intelligence.currentWindow?.progress ?? intelligence.nextPrayerProgress,
    ),
  );
  return (
    <NuraiCard variant="elevated" style={styles.heroCard}>
      <Text style={[NuraiType.overline, { color: theme.primary }]}>
        LIVE PRAYER WINDOW
      </Text>
      <View style={styles.heroTopRow}>
        <Text style={[NuraiType.display, { color: theme.text }]}>
          {intelligence.nextPrayerLabel}
        </Text>
        <View style={styles.heroTimeCol}>
          <Text
            style={[
              NuraiType.largeTitle,
              { color: theme.text, fontVariant: ["tabular-nums"] },
            ]}
          >
            {formatPrayerClock(intelligence.nextPrayerTime, is24h)}
          </Text>
          <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
            {intelligence.nextPrayerDay === "tomorrow" ? "Tomorrow" : "Today"}
          </Text>
        </View>
      </View>

      <View style={styles.heroCountdownRow}>
        <AppIcon name="clock" size={15} color={theme.primary} />
        <Text style={[NuraiType.body, { color: theme.primary }]}>
          {intelligence.countdownLabel}
        </Text>
      </View>

      <View
        style={[
          styles.heroTrack,
          { backgroundColor: theme.backgroundTertiary },
        ]}
      >
        <View
          style={[
            styles.heroFill,
            {
              width: `${Math.round(windowProgress * 100)}%`,
              backgroundColor: theme.primary,
            },
          ]}
        />
      </View>

      <View style={styles.heroCopy}>
        <Text style={[NuraiType.body, { color: theme.text }]}>
          {intelligence.preparationTitle}
        </Text>
        <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
          {intelligence.preparationBody}
        </Text>
      </View>

      <View style={styles.heroMetaRow}>
        <View style={styles.heroMetaItem}>
          <AppIcon name="map-pin" size={12} color={theme.textMuted} />
          <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
            {intelligence.confidenceLabel}
          </Text>
        </View>
        <View style={styles.heroMetaItem}>
          <AppIcon name="compass" size={12} color={theme.textMuted} />
          <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
            {intelligence.methodLabel}
          </Text>
        </View>
      </View>

      {intelligence.isLocationStale ? (
        <View style={styles.heroMetaItem}>
          <AppIcon name="refresh-cw" size={12} color={theme.warning} />
          <Text style={[NuraiType.caption, { color: theme.warning }]}>
            Refresh location for best accuracy
          </Text>
        </View>
      ) : null}
    </NuraiCard>
  );
}

function PrayerTrackerPanel({
  summary,
  theme,
  onToggle,
}: {
  summary: ReturnType<typeof getPrayerTrackerSummary>;
  theme: any;
  onToggle: (prayer: PrayerKey) => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(160).duration(340)}>
      <View
        style={[
          styles.trackerPanel,
          {
            backgroundColor: "transparent",
            borderColor: theme.borderSubtle,
          },
        ]}
      >
        <NuraiGlass
          pointerEvents="none"
          radius={BorderRadius.xl}
          style={styles.glassFill}
        />
        <View style={styles.trackerHeader}>
          <View>
            <ThemedText style={[styles.heroEyebrow, { color: theme.primary }]}>
              TODAY'S SALAH
            </ThemedText>
            <ThemedText type="h4">
              {summary.todayCompleted}/5 protected
            </ThemedText>
          </View>
          <View
            style={[styles.trackerScore, { borderColor: `${theme.primary}30` }]}
          >
            <ThemedText
              type="caption"
              style={{ color: theme.primary, fontWeight: "800" }}
            >
              {summary.todayPercent}%
            </ThemedText>
          </View>
        </View>
        <View style={styles.prayerDotsRow}>
          {PRAYER_KEYS.map((key) => {
            const done =
              summary.today[key] === "prayed" ||
              summary.today[key] === "excused";
            return (
              <Pressable
                key={key}
                testID={`prayer-toggle-${key}`}
                onPress={() => onToggle(key)}
                accessibilityRole="button"
                accessibilityLabel={`${PRAYER_LABELS[key]} ${done ? "prayed" : "not yet prayed"}. Tap to ${done ? "undo" : "mark as prayed"}.`}
                accessibilityState={{ selected: done }}
                style={[
                  styles.prayerDotButton,
                  {
                    backgroundColor: done
                      ? `${theme.primary}22`
                      : theme.surfaceGlassStrong,
                    borderColor: done ? theme.primary : theme.borderSubtle,
                  },
                ]}
              >
                <AppIcon
                  name={done ? "check" : "circle"}
                  size={15}
                  color={done ? theme.primary : theme.textMuted}
                />
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{
                    color: done ? theme.text : theme.textMuted,
                    fontWeight: "700",
                  }}
                >
                  {PRAYER_LABELS[key]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.heatmapGrid}>
          {summary.heatmap.map((day) => (
            <View
              key={day.dateKey}
              style={[
                styles.heatmapCell,
                {
                  backgroundColor:
                    day.percent >= 100
                      ? theme.primary
                      : day.percent >= 60
                        ? `${theme.primary}90`
                        : day.percent > 0
                          ? `${theme.primary}58`
                          : theme.surfaceGlassStrong,
                  opacity: day.percent > 0 ? 1 : 0.55,
                },
              ]}
            />
          ))}
        </View>
        <ThemedText type="caption" style={{ color: theme.textMuted }}>
          30-day prayer map · {summary.monthPercent}% protected this month
        </ThemedText>
      </View>
    </Animated.View>
  );
}

export default function PrayerTimesScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { location, setLocation, detectGPSLocation, gpsLoading } =
    useLocation();
  const { getPrayerInsightsFn, trackFeature } = useNurAI();
  const { isPremium, isScholar } = useSubscription();
  const [is24h, setIs24h] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationResults, setLocationResults] = useState<
    LocationSearchResult[]
  >([]);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiModalState, setAiModalState] = useState<AIResponseState>("loading");
  const [aiModalData, setAiModalData] = useState<AIResponseData | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | undefined>();
  const [trackerState, setTrackerState] = useState<PrayerTrackerState>({});
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [detailPrayer, setDetailPrayer] = useState<{
    key: string;
    name: string;
    time: Date;
  } | null>(null);
  const [methodSheetOpen, setMethodSheetOpen] = useState(false);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    trackFeature("prayer_times");
  }, [trackFeature]);

  const handleGetPrayerInsights = useCallback(
    async (question?: string) => {
      if (!isPremium) {
        setAiModalState("upgrade");
        setAiModalData(null);
        setAiModalVisible(true);
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setAiModalState("loading");
      setAiModalData(null);
      setAiErrorMessage(undefined);
      setAiModalVisible(true);

      try {
        const profile = await loadProfileV3();
        const streak = profile.streakData?.currentStreak ?? 0;
        const strongestPrayer =
          profile.streakData?.strongestHabit !== "none"
            ? profile.streakData?.strongestHabit
            : undefined;
        const weakestPrayer =
          profile.streakData?.weakestHabit !== "none"
            ? profile.streakData?.weakestHabit
            : undefined;
        const consistency = profile.prayerConsistency ?? 0;

        const missedPrayers: string[] = [];
        if (profile.prayerPatterns) {
          for (const [prayer, data] of Object.entries(profile.prayerPatterns)) {
            if (data && typeof data === "object" && "missRate" in data) {
              const rate = (data as { missRate: number }).missRate;
              if (rate > 0.3) {
                missedPrayers.push(prayer);
              }
            }
          }
        }

        const result = await getPrayerInsightsAI({
          streak,
          missedPrayers: missedPrayers.length > 0 ? missedPrayers : undefined,
          strongestPrayer,
          weakestPrayer,
          consistency,
          question,
          userTier: isScholar ? "scholar" : "premium",
        });

        setAiModalData(mapAIContextResponseToModalData(result));
        setAiModalState("success");
      } catch (err) {
        if (err instanceof AIContextError) {
          if (err.code === "UPGRADE_REQUIRED") {
            setAiModalState("upgrade");
          } else if (err.code === "RATE_LIMIT") {
            setAiModalState("rateLimit");
          } else {
            setAiModalState("error");
            setAiErrorMessage(customerSafeAIErrorMessage(err.message));
          }
        } else {
          setAiModalState("error");
          setAiErrorMessage("Something went wrong. Please try again.");
        }
      }
    },
    [isPremium, isScholar],
  );

  useEffect(() => {
    let active = true;
    loadPrayerTrackerState().then((state) => {
      if (active) setTrackerState(state);
    });
    return () => {
      active = false;
    };
  }, []);

  const prayerInsights = getPrayerInsightsFn();
  const [now, setNow] = useState(() => new Date());

  const refreshNow = useCallback(() => setNow(new Date()), []);

  useEffect(() => {
    const interval = setInterval(refreshNow, 15_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshNow();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refreshNow]);

  useFocusEffect(
    useCallback(() => {
      refreshNow();
    }, [refreshNow]),
  );

  const prayerData = useMemo(() => {
    const intelligence = buildPrayerIntelligence(location, now);
    const times = intelligence.moments.map((moment) => {
      const info =
        PRAYER_INFO.find((entry) => entry.key === moment.key) || PRAYER_INFO[0];
      return {
        ...info,
        key: moment.key,
        name: moment.label,
        time: moment.time,
      };
    });

    return {
      intelligence,
      times,
      nextPrayerKey: intelligence.nextPrayer,
      nextPrayerTime: intelligence.nextPrayerTime,
      nextPrayerDay: intelligence.nextPrayerDay,
    };
  }, [location, now]);

  useEffect(() => {
    const nextPrayerTime = prayerData.nextPrayerTime;
    if (!nextPrayerTime) return undefined;
    const delay = Math.min(
      Math.max(750, nextPrayerTime.getTime() - Date.now() + 1250),
      2_147_483_647,
    );
    const timeout = setTimeout(refreshNow, delay);
    return () => clearTimeout(timeout);
  }, [prayerData.nextPrayerTime, refreshNow]);

  const trackerSummary = useMemo(
    () => getPrayerTrackerSummary(trackerState, now),
    [trackerState, now],
  );

  const handleTogglePrayer = useCallback(async (prayer: PrayerKey) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextState = await togglePrayerPrayed(prayer);
    setTrackerState({ ...nextState });

    const dayKey = localDateKey(new Date());
    if (nextState[dayKey]?.[prayer] === "prayed") {
      recordGardenAction("salah").catch(() => {});
    }

    // Celebrate completing all five obligatory prayers — once per day.
    const summary = getPrayerTrackerSummary(nextState, new Date());
    const allPrayed = PRAYER_KEYS.every(
      (key) => summary.today[key] === "prayed",
    );
    if (allPrayed) {
      const d = new Date();
      const dayKey = `prayer_celebration_${d.getFullYear()}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      const already = await AsyncStorage.getItem(dayKey);
      if (!already) {
        await AsyncStorage.setItem(dayKey, "1");
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        setCelebrationVisible(true);
      }
    }
  }, []);

  useEffect(() => {
    const cleanQuery = searchQuery.trim();
    if (!showLocationPicker || cleanQuery.length < 2) {
      setLocationResults([]);
      setLocationSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLocationSearchLoading(true);
      searchGlobalLocations(cleanQuery, {
        latitude: location.latitude,
        longitude: location.longitude,
        signal: controller.signal,
      })
        .then((results) => setLocationResults(results))
        .catch(() => {
          if (!controller.signal.aborted) setLocationResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLocationSearchLoading(false);
        });
    }, 260);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery, showLocationPicker, location.latitude, location.longitude]);

  const filteredCities = useMemo(() => {
    const apiResults = locationResults.map((result) => ({
      latitude: result.latitude,
      longitude: result.longitude,
      cityName: result.cityName,
      countryName: result.countryName,
      calculationMethod: result.calculationMethod,
      regionName: result.regionName,
      source: result.source,
    }));
    if (!searchQuery.trim()) return POPULAR_CITIES;
    if (apiResults.length > 0) return apiResults;
    const q = searchQuery.toLowerCase();
    return POPULAR_CITIES.filter(
      (c) =>
        c.cityName.toLowerCase().includes(q) ||
        c.countryName.toLowerCase().includes(q),
    );
  }, [locationResults, searchQuery]);

  const handleSelectCity = async (city: UserLocation) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setLocation({
      ...city,
      source: city.source || "local",
      updatedAt: new Date().toISOString(),
    });
    setShowLocationPicker(false);
    setSearchQuery("");
  };

  const handleUseCurrentLocation = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const detected = await detectGPSLocation();
    if (detected) {
      setShowLocationPicker(false);
      setSearchQuery("");
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const amberColor = isDark
    ? CategoryColors.amber.dark.text
    : CategoryColors.amber.text;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Aurora />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.sm,
            borderBottomColor: theme.borderSubtle,
          },
        ]}
      >
        <NuraiGlass pointerEvents="none" radius={0} style={styles.glassFill} />
        <Pressable
          testID="button-prayer-back"
          style={({ pressed }) => [
            styles.headerButton,
            {
              backgroundColor: "transparent",
              borderColor: theme.borderSubtle,
            },
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitleBlock}>
          <ThemedText type="h4" accessibilityRole="header">
            Prayer Times
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Accurate times, reminders, and calm guidance
          </ThemedText>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            {
              backgroundColor: "transparent",
              borderColor: theme.borderSubtle,
            },
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => setIs24h(!is24h)}
          accessibilityRole="button"
          accessibilityLabel={`Use ${is24h ? "12-hour" : "24-hour"} time`}
        >
          <AppIcon name="clock" size={20} color={theme.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PrayerHeroCard
          intelligence={prayerData.intelligence}
          is24h={is24h}
          theme={theme}
        />

        <PrayerTrackerPanel
          summary={trackerSummary}
          theme={theme}
          onToggle={handleTogglePrayer}
        />

        <NuraiCard
          variant="elevated"
          onPress={() => setShowLocationPicker(true)}
          style={styles.locationRow}
          accessibilityLabel={`Location ${location.cityName}, ${location.countryName}. Tap to change.`}
          testID="button-change-location"
        >
          <View
            style={[
              styles.locationIcon,
              { backgroundColor: theme.primaryMuted },
            ]}
          >
            <AppIcon name="map-pin" size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[NuraiType.body, { color: theme.text }]}
              numberOfLines={1}
            >
              {location.cityName}, {location.countryName}
            </Text>
            <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
              Tap to change location
            </Text>
          </View>
          <View
            style={[
              styles.formatBadge,
              { backgroundColor: theme.primaryMuted },
            ]}
          >
            <Text style={[NuraiType.caption, { color: theme.primary }]}>
              {is24h ? "24H" : "12H"}
            </Text>
          </View>
          <AppIcon name="chevron-right" size={18} color={theme.iconMuted} />
        </NuraiCard>

        <NuraiCard
          variant="elevated"
          onPress={() => setMethodSheetOpen(true)}
          style={styles.locationRow}
          accessibilityLabel={`Calculation method ${prayerData.intelligence.methodLabel}. Tap to change.`}
          testID="button-calc-method"
        >
          <View
            style={[
              styles.locationIcon,
              { backgroundColor: theme.primaryMuted },
            ]}
          >
            <AppIcon name="compass" size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[NuraiType.body, { color: theme.text }]}
              numberOfLines={1}
            >
              {prayerData.intelligence.methodLabel}
            </Text>
            <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
              Calculation method
            </Text>
          </View>
          <AppIcon name="chevron-right" size={18} color={theme.iconMuted} />
        </NuraiCard>

        <Animated.View entering={FadeInDown.delay(40).duration(300)}>
          <SectionHeader
            title="Today's Prayer Times"
            style={{ paddingHorizontal: 0 }}
          />
        </Animated.View>

        {prayerInsights.length > 0 && !insightDismissed ? (
          <Animated.View entering={FadeInDown.delay(80).duration(300)}>
            <View
              style={[
                styles.insightCard,
                {
                  backgroundColor: "transparent",
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <NuraiGlass
                pointerEvents="none"
                radius={BorderRadius.md}
                style={styles.glassFill}
              />
              <View style={styles.insightHeader}>
                <View style={styles.insightBadge}>
                  <View
                    style={[
                      styles.insightDot,
                      { backgroundColor: theme.primary },
                    ]}
                  />
                  <ThemedText
                    style={[styles.insightLabel, { color: theme.primary }]}
                  >
                    NurAI
                  </ThemedText>
                  <AppIcon
                    name={
                      prayerInsights[0].type === "sunnah"
                        ? "star"
                        : prayerInsights[0].type === "pre_prayer"
                          ? "clock"
                          : "check-circle"
                    }
                    size={12}
                    color={theme.primary}
                  />
                </View>
                <Pressable
                  onPress={() => setInsightDismissed(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss prayer insight"
                  style={({ pressed }) => [
                    styles.compactIconButton,
                    pressed ? { opacity: 0.5 } : null,
                  ]}
                >
                  <AppIcon name="x" size={18} color={theme.textMuted} />
                </Pressable>
              </View>
              <ThemedText style={styles.insightTitle}>
                {prayerInsights[0].title}
              </ThemedText>
              <ThemedText
                style={[styles.insightBody, { color: theme.textSecondary }]}
              >
                {prayerInsights[0].body}
              </ThemedText>
            </View>
          </Animated.View>
        ) : null}

        {prayerData.times.map((prayer, index) => {
          const isNext = prayer.key === prayerData.nextPrayerKey;
          const isPassed = prayer.time < now && !isNext;
          const isSunrise = prayer.key === "sunrise";
          const prayed =
            !isSunrise &&
            trackerSummary.today[prayer.key as PrayerKey] === "prayed";
          return (
            <Animated.View
              key={prayer.key}
              entering={FadeInDown.delay(index * 40 + 40).duration(260)}
            >
              <Pressable
                onPress={() =>
                  setDetailPrayer({
                    key: prayer.key,
                    name: prayer.name,
                    time: prayer.time,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`${prayer.name} at ${formatTime(
                  prayer.time,
                  is24h,
                )}. Open details.`}
                style={({ pressed }) => [
                  styles.prayerTimeCard,
                  {
                    backgroundColor: "transparent",
                    borderColor: isNext
                      ? `${theme.primary}44`
                      : theme.borderSubtle,
                  },
                  pressed && { opacity: 0.82 },
                ]}
              >
                <NuraiGlass
                  pointerEvents="none"
                  radius={16}
                  tint={isNext ? `${theme.primary}14` : undefined}
                  style={styles.glassFill}
                />
                <View
                  style={[
                    styles.prayerDot,
                    {
                      backgroundColor: isNext
                        ? theme.primary
                        : prayed
                          ? theme.primary
                          : isSunrise
                            ? amberColor
                            : theme.textMuted,
                      opacity: isPassed && !prayed ? 0.35 : 1,
                    },
                  ]}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[
                      NuraiType.body,
                      {
                        color:
                          isPassed && !isNext ? theme.textMuted : theme.text,
                        fontFamily: isNext
                          ? "PlusJakartaSans_600SemiBold"
                          : "PlusJakartaSans_500Medium",
                      },
                    ]}
                  >
                    {prayer.name}
                  </Text>
                  <Text
                    style={[
                      NuraiType.caption,
                      { color: isNext ? theme.primary : theme.textMuted },
                    ]}
                  >
                    {isNext
                      ? `Starts in ${formatRemainingTime(
                          prayerData.nextPrayerTime || prayer.time,
                          now,
                        )}`
                      : prayed
                        ? "Prayed"
                        : isSunrise
                          ? "Sunrise"
                          : isPassed
                            ? "Passed"
                            : "Upcoming"}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.prayerTimeValue,
                    {
                      color: isPassed && !isNext ? theme.textMuted : theme.text,
                    },
                  ]}
                >
                  {formatTime(prayer.time, is24h)}
                </Text>
                {!isSunrise ? (
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      handleTogglePrayer(prayer.key as PrayerKey);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Mark ${prayer.name} as prayed`}
                    style={[
                      styles.markDot,
                      {
                        borderColor: prayed
                          ? theme.primary
                          : theme.borderStrong,
                        backgroundColor: prayed ? theme.primary : "transparent",
                      },
                    ]}
                  >
                    <AppIcon
                      name="check"
                      size={13}
                      color={prayed ? theme.primaryForeground : theme.textMuted}
                    />
                  </Pressable>
                ) : (
                  <View style={styles.markSpacer} />
                )}
              </Pressable>
            </Animated.View>
          );
        })}

        <Animated.View entering={FadeInDown.delay(500).duration(300)}>
          <SectionHeader
            title="Prayer sound"
            style={{ paddingHorizontal: 0, marginTop: Spacing.xl }}
          />
          <Pressable
            onPress={() => navigation.navigate("NotificationSettings")}
            accessibilityRole="button"
            accessibilityLabel="Choose your Athan voice and prayer alerts"
            style={[
              styles.locationCardOuter,
              { borderColor: `${amberColor}2E` },
            ]}
            testID="button-prayer-sound-settings"
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.xl}
              tint={`${amberColor}0B`}
              style={styles.glassFill}
            />
            <LinearGradient
              colors={["transparent", `${amberColor}0D`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.locationCard, { backgroundColor: "transparent" }]}
            >
              <View
                style={[
                  styles.locationIcon,
                  { backgroundColor: `${amberColor}20` },
                ]}
              >
                <AppIcon name="volume-2" size={18} color={amberColor} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  Choose your Athan voice
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Preview voices and set each prayer’s sound
                </ThemedText>
              </View>
              <View style={styles.locationChevronRow}>
                <View
                  style={[
                    styles.formatBadge,
                    { backgroundColor: `${amberColor}15` },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: amberColor, fontWeight: "600" }}
                  >
                    Open
                  </ThemedText>
                </View>
                <AppIcon
                  name="chevron-right"
                  size={18}
                  color={theme.textMuted}
                />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(560).duration(300)}>
          <SectionHeader
            title="Prayer Readiness"
            style={{ paddingHorizontal: 0, marginTop: Spacing.xl }}
          />
          <Pressable
            onPress={() => handleGetPrayerInsights()}
            style={({ pressed }) => [
              styles.aiInsightCard,
              {
                backgroundColor: "transparent",
                borderColor: `${theme.primary}30`,
              },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open personalised prayer readiness guidance"
            testID="button-prayer-insights"
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.xl}
              tint={`${theme.primary}0B`}
              style={styles.glassFill}
            />
            <LinearGradient
              colors={[`${theme.primary}08`, `${theme.primary}15`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiInsightGradient}
            >
              <View
                style={[
                  styles.aiInsightIcon,
                  { backgroundColor: `${theme.primary}20` },
                ]}
              >
                <AppIcon name="zap" size={20} color={theme.primary} />
              </View>
              <View style={styles.aiInsightContent}>
                <View style={styles.aiInsightTitleRow}>
                  <ThemedText
                    type="small"
                    style={{ fontWeight: "600", flex: 1 }}
                  >
                    Prepare for the next salah
                  </ThemedText>
                  {!isPremium ? <PremiumBadge tier="premium" /> : null}
                </View>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, lineHeight: 18 }}
                >
                  Time left, qibla, and khushu focus stay visible so you can
                  prepare calmly for the next prayer.
                </ThemedText>
              </View>
              <AppIcon name="chevron-right" size={18} color={theme.textMuted} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <View
          style={[
            styles.disclaimerCard,
            {
              backgroundColor: "transparent",
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <NuraiGlass
            pointerEvents="none"
            radius={BorderRadius.md}
            style={styles.glassFill}
          />
          <ThemedText
            type="caption"
            style={{
              color: theme.textMuted,
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            Prayer times are calculated using astronomical algorithms and may
            vary slightly. Please verify with your local mosque for exact times.
          </ThemedText>
        </View>
      </ScrollView>

      <Modal
        visible={showLocationPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.backgroundRoot },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: theme.borderSubtle },
            ]}
          >
            <ThemedText type="h4">Choose Location</ThemedText>
            <Pressable
              onPress={() => {
                setShowLocationPicker(false);
                setSearchQuery("");
              }}
              accessibilityRole="button"
              accessibilityLabel="Close location picker"
              style={styles.modalCloseButton}
              testID="button-close-location"
            >
              <AppIcon name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View
            style={{
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.md,
            }}
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
                placeholder="Search city or country"
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                testID="input-location-search"
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  accessibilityRole="button"
                  accessibilityLabel="Clear location search"
                  style={styles.modalCloseButton}
                >
                  <AppIcon name="x-circle" size={18} color={theme.textMuted} />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              onPress={handleUseCurrentLocation}
              disabled={gpsLoading}
              style={({ pressed }) => [
                styles.useGpsButton,
                {
                  backgroundColor: `${theme.primary}15`,
                  borderColor: `${theme.primary}35`,
                },
                pressed && !gpsLoading ? { opacity: 0.75 } : null,
                gpsLoading ? { opacity: 0.65 } : null,
              ]}
              testID="button-use-current-location"
            >
              <AppIcon
                name={gpsLoading ? "loader" : "navigation"}
                size={16}
                color={theme.primary}
              />
              <ThemedText
                type="small"
                style={{ color: theme.primary, fontWeight: "700" }}
              >
                {gpsLoading
                  ? "Detecting your location..."
                  : "Use precise current location"}
              </ThemedText>
            </Pressable>
            {searchQuery.trim().length >= 2 ? (
              <ThemedText
                type="caption"
                style={{
                  color: theme.textMuted,
                  marginTop: Spacing.sm,
                  lineHeight: 18,
                }}
              >
                {locationSearchLoading
                  ? "Searching global places..."
                  : locationResults.length > 0
                    ? "Global city and country results"
                    : "Showing built-in locations. Add Mapbox or Google Places on the server for full global search."}
              </ThemedText>
            ) : null}
          </View>

          <FlatList
            data={filteredCities}
            keyExtractor={(item) => `${item.cityName}-${item.countryName}`}
            contentContainerStyle={{
              paddingHorizontal: Spacing.lg,
              paddingBottom: 40,
            }}
            renderItem={({ item }) => {
              const isSelected =
                item.cityName === location.cityName &&
                item.countryName === location.countryName;
              return (
                <Pressable
                  onPress={() => handleSelectCity(item)}
                  style={[
                    styles.cityItem,
                    {
                      backgroundColor: isSelected
                        ? `${theme.primary}15`
                        : theme.surfaceGlass,
                      borderColor: isSelected
                        ? theme.primary
                        : theme.borderSubtle,
                    },
                  ]}
                  testID={`button-city-${item.cityName.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <View
                    style={[
                      styles.cityIcon,
                      { backgroundColor: `${theme.primary}15` },
                    ]}
                  >
                    <AppIcon name="map-pin" size={16} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="small" style={{ fontWeight: "600" }}>
                      {item.cityName}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      {item.countryName}
                    </ThemedText>
                  </View>
                  {isSelected ? (
                    <AppIcon
                      name="check-circle"
                      size={20}
                      color={theme.primary}
                    />
                  ) : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: Spacing.xl, alignItems: "center" }}>
                <AppIcon name="map" size={40} color={theme.textMuted} />
                <ThemedText
                  type="body"
                  style={{
                    color: theme.textMuted,
                    marginTop: Spacing.md,
                    textAlign: "center",
                  }}
                >
                  No cities found matching your search
                </ThemedText>
              </View>
            }
          />
        </View>
      </Modal>

      <AIResponseModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        state={aiModalState}
        data={aiModalData}
        onRetry={() => handleGetPrayerInsights()}
        onFollowUp={handleGetPrayerInsights}
        errorMessage={aiErrorMessage}
        featureLabel="Prayer Insights"
        requiredTier="premium"
      />

      <NuraiBottomSheet
        visible={methodSheetOpen}
        title="Calculation method"
        onClose={() => setMethodSheetOpen(false)}
      >
        {METHOD_OPTIONS.map((option) => {
          const active = location.calculationMethod === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => {
                setLocation({ ...location, calculationMethod: option.id });
                setMethodSheetOpen(false);
                Haptics.selectionAsync().catch(() => {});
              }}
              accessibilityRole="button"
              accessibilityLabel={`${option.label}. ${option.detail}.`}
              style={({ pressed }) => [
                styles.methodRow,
                { borderBottomColor: theme.borderSubtle },
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[
                    NuraiType.body,
                    {
                      color: active ? theme.primary : theme.text,
                      fontFamily: active
                        ? "PlusJakartaSans_600SemiBold"
                        : "PlusJakartaSans_500Medium",
                    },
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
                  {option.detail}
                </Text>
              </View>
              {active ? (
                <AppIcon name="check" size={18} color={theme.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </NuraiBottomSheet>

      <NuraiBottomSheet
        visible={detailPrayer !== null}
        title={detailPrayer?.name ?? "Prayer"}
        onClose={() => setDetailPrayer(null)}
      >
        {detailPrayer ? (
          <View style={styles.detailSheet}>
            <View style={styles.detailTimeRow}>
              <Text
                style={[
                  NuraiType.largeTitle,
                  { color: theme.text, fontVariant: ["tabular-nums"] },
                ]}
              >
                {formatTime(detailPrayer.time, is24h)}
              </Text>
              <Text
                style={[
                  NuraiType.body,
                  {
                    color:
                      detailPrayer.time > now ? theme.primary : theme.textMuted,
                  },
                ]}
              >
                {detailPrayer.time > now
                  ? `In ${formatRemainingTime(detailPrayer.time, now)}`
                  : "Passed today"}
              </Text>
            </View>
            <Text
              style={[
                NuraiType.body,
                { color: theme.textSecondary, lineHeight: 23 },
              ]}
            >
              {PRAYER_NOTES[detailPrayer.key] ?? ""}
            </Text>
            {detailPrayer.key !== "sunrise" ? (
              <NuraiButton
                label={
                  trackerSummary.today[detailPrayer.key as PrayerKey] ===
                  "prayed"
                    ? "Prayed — tap to undo"
                    : "Mark as prayed"
                }
                icon={
                  trackerSummary.today[detailPrayer.key as PrayerKey] ===
                  "prayed"
                    ? "check-circle"
                    : "check"
                }
                onPress={() =>
                  handleTogglePrayer(detailPrayer.key as PrayerKey)
                }
              />
            ) : null}
            <Pressable
              onPress={() => {
                setDetailPrayer(null);
                navigation.navigate("NotificationSettings");
              }}
              accessibilityRole="button"
              accessibilityLabel="Open reminder and athan settings"
              style={({ pressed }) => [
                styles.detailLinkRow,
                {
                  borderColor: theme.borderSubtle,
                  backgroundColor: "transparent",
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <NuraiGlass
                pointerEvents="none"
                radius={14}
                tint={`${amberColor}08`}
                style={styles.glassFill}
              />
              <AppIcon name="bell" size={17} color={amberColor} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[NuraiType.body, { color: theme.text }]}>
                  Reminder & athan
                </Text>
                <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
                  Alerts and athan sound for each prayer
                </Text>
              </View>
              <AppIcon name="chevron-right" size={18} color={theme.iconMuted} />
            </Pressable>
          </View>
        ) : null}
      </NuraiBottomSheet>

      <PrayerCompletionCelebration
        visible={celebrationVisible}
        name={user?.displayName}
        onClose={() => setCelebrationVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  heroCard: {
    gap: NuraiSpace.md,
    marginBottom: NuraiSpace.md,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: NuraiSpace.md,
  },
  heroTimeCol: {
    alignItems: "flex-end",
  },
  heroCountdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.xs,
  },
  heroTrack: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  heroFill: {
    height: 5,
    borderRadius: 999,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 34,
    lineHeight: 42,
    marginTop: Spacing.xs,
  },
  heroStatusPill: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  heroMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginTop: Spacing.lg,
  },
  orb: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  orbRingOuter: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
  },
  orbProgressArc: {
    position: "absolute",
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 5,
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
  },
  orbTime: {
    marginTop: Spacing.xs,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 21,
    lineHeight: 28,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.sm,
  },
  windowProgressTrack: {
    height: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  windowProgressFill: {
    height: 7,
    borderRadius: BorderRadius.full,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  prayerTimeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.md,
    minHeight: 64,
    paddingHorizontal: NuraiSpace.md,
    paddingVertical: NuraiSpace.sm,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: NuraiSpace.xs,
    overflow: "hidden",
  },
  prayerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  prayerTimeValue: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 21,
    lineHeight: 27,
    fontVariant: ["tabular-nums"],
  },
  markDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  markSpacer: {
    width: 44,
  },
  detailSheet: {
    gap: NuraiSpace.md,
    paddingTop: NuraiSpace.xs,
    paddingBottom: NuraiSpace.sm,
  },
  detailTimeRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: NuraiSpace.sm,
  },
  detailLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.md,
    minHeight: 60,
    paddingHorizontal: NuraiSpace.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    overflow: "hidden",
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.md,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  trackerPanel: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    overflow: "hidden",
  },
  trackerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  trackerScore: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  prayerDotsRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  prayerDotButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 2,
  },
  heatmapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  heatmapCell: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  locationCardOuter: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    marginBottom: NuraiSpace.md,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    minHeight: 72,
    gap: Spacing.md,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  locationChevronRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  formatBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  nextPrayerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    overflow: "hidden",
    minHeight: 100,
  },
  nextPrayerGlow: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    bottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  nextPrayerIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  nextPrayerName: {
    fontSize: 22,
    fontFamily: "LibreBaskerville_700Bold",
  },
  nextPrayerDivider: {
    width: 128,
    marginVertical: -2,
  },
  prayerCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    overflow: "hidden",
    minHeight: 92,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: Spacing.sm,
    bottom: Spacing.sm,
    width: 3,
    borderRadius: BorderRadius.xs / 4,
  },
  prayerIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  prayerInfo: { flex: 1, gap: Spacing.xs / 2 },
  prayerName: { fontSize: 16, fontWeight: "500" },
  prayerRightStack: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  markPrayerButton: {
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  disclaimerCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
    overflow: "hidden",
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: 48,
  },
  useGpsButton: {
    marginTop: Spacing.md,
    minHeight: 48,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  cityIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  aiInsightCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.lg,
    minHeight: 72,
  },
  aiInsightGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  aiInsightIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  aiInsightContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  aiInsightTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  insightCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  compactIconButton: {
    width: 44,
    height: 44,
    marginVertical: -12,
    marginRight: -10,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  insightBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  insightDot: {
    width: Spacing.xs,
    height: Spacing.xs,
    borderRadius: Spacing.xs / 2,
  },
  insightLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  insightBody: {
    fontSize: 13,
    lineHeight: 18,
  },
});
