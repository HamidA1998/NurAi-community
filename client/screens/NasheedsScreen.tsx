import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import {
  MediaControlChip,
  MediaProgressBar,
  MediaStatusBadge,
  PremiumMiniPlayerSurface,
} from "@/components/media/PremiumMediaControls";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/context/SubscriptionContext";
import { hasAccess } from "@/config/entitlements";
import { Spacing, BorderRadius, CategoryColors } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import {
  GeometricCardPattern,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import {
  loadAndPlay,
  pausePlayback,
  resumePlayback,
  stopPlayback,
  fadeOutAndStop,
  seekByPlayback,
  setCallbacks,
  type TransportState,
  type TransportProgress,
} from "@/lib/audio-transport";
import { buildNasheedAudioMetadata } from "@/lib/audio-metadata";
import {
  formatMediaBackgroundStatus,
  formatMediaOfflineStatus,
  formatMediaSleepTimer,
  formatMediaSleepTimerControlLabel,
  formatMediaSleepTimerRemaining,
  formatMediaSleepTimerSummary,
  formatMediaTime,
  getMediaProgressPercent,
  joinMediaModeSummary,
} from "@/lib/audio-ui";
import {
  getLocalPath,
  downloadAudio,
  deleteDownload,
  getDownloadedIds,
} from "@/lib/audio-downloads";
import {
  formatMediaBytes,
  getMediaStorageSummary,
  type MediaStorageSummary,
} from "@/lib/media-storage";
import {
  fetchNasheedTracks,
  type ServerNasheedTrack,
} from "@/services/nasheedService";
import { saveMediaResumeSession } from "@/services/mediaResumeService";
import { AppIcon, type AppIconName } from "@/components/icons";

type NasheedCategory =
  | "All"
  | "Relaxing"
  | "Motivational"
  | "Ramadan"
  | "Kids"
  | "Dhikr"
  | "Wedding"
  | "Classical"
  | "Downloaded";

interface Nasheed {
  id: string;
  slug?: string;
  title: string;
  artist: string;
  duration: string;
  category: Exclude<NasheedCategory, "Downloaded">;
  isFeatured?: boolean;
  audioUrl: string;
  fallbackUrl?: string | null;
  coverUrl?: string | null;
  sourceType?: ServerNasheedTrack["sourceType"];
  licenseLabel?: string;
}

const CATEGORIES: NasheedCategory[] = [
  "All",
  "Downloaded",
  "Relaxing",
  "Motivational",
  "Ramadan",
  "Kids",
  "Dhikr",
  "Wedding",
  "Classical",
];

const CATEGORY_ICONS: Record<NasheedCategory, AppIconName> = {
  All: "music",
  Downloaded: "download",
  Relaxing: "wind",
  Motivational: "trending-up",
  Ramadan: "moon",
  Kids: "smile",
  Dhikr: "repeat",
  Wedding: "heart",
  Classical: "book-open",
};

const NASHEED_SLEEP_TIMER_OPTIONS = [
  0, 15, 30, 60, 120, 240, 480, 720,
] as const;
const NASHEED_SLEEP_TIMER_STEP_MINUTES = 5;
const NASHEED_SLEEP_TIMER_MIN_MINUTES = 5;
const NASHEED_SLEEP_TIMER_MAX_MINUTES = 720;

export default function NasheedsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { currentPlan } = useSubscription();
  const canPlay = hasAccess(currentPlan, "premium");
  const requestedCategory = String(route.params?.initialCategory || "All");
  const initialCategory = CATEGORIES.includes(
    requestedCategory as NasheedCategory,
  )
    ? (requestedCategory as NasheedCategory)
    : "All";
  const [selectedCategory, setSelectedCategory] =
    useState<NasheedCategory>(initialCategory);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [nasheeds, setNasheeds] = useState<Nasheed[]>([]);
  const [nasheedsLoading, setNasheedsLoading] = useState(true);
  const [nasheedsIssue, setNasheedsIssue] = useState<string | null>(null);
  const [currentNasheed, setCurrentNasheed] = useState<Nasheed | null>(null);
  const [audioState, setAudioState] = useState<TransportState>("idle");
  const [audioProgress, setAudioProgress] = useState<TransportProgress>({
    currentTime: 0,
    duration: 0,
  });
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
  const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState<number | null>(null);
  const [sleepTimerNow, setSleepTimerNow] = useState(() => Date.now());

  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [downloadingIds, setDownloadingIds] = useState<Map<string, number>>(
    new Map(),
  );
  const [storageUsed, setStorageUsed] = useState(0);
  const [mediaStorageSummary, setMediaStorageSummary] =
    useState<MediaStorageSummary | null>(null);
  const mountedRef = useRef(true);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNasheedSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
  }, []);

  const scheduleNasheedSleepTimer = useCallback(
    (minutes: number) => {
      clearNasheedSleepTimer();
      if (minutes <= 0) {
        setSleepTimerEndsAt(null);
        return;
      }
      setSleepTimerEndsAt(Date.now() + minutes * 60 * 1000);
      sleepTimerRef.current = setTimeout(
        () => {
          fadeOutAndStop(7000);
          if (mountedRef.current) {
            setSleepTimerMinutes(0);
            setSleepTimerEndsAt(null);
          }
        },
        minutes * 60 * 1000,
      );
    },
    [clearNasheedSleepTimer],
  );

  useEffect(() => {
    if (!sleepTimerEndsAt) return;
    setSleepTimerNow(Date.now());
    const interval = setInterval(() => setSleepTimerNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, [sleepTimerEndsAt]);

  useEffect(() => {
    mountedRef.current = true;
    setCallbacks({
      onStateChange: (state) => {
        if (mountedRef.current) setAudioState(state);
      },
      onFinish: () => {
        if (mountedRef.current) {
          clearNasheedSleepTimer();
          setSleepTimerMinutes(0);
          setSleepTimerEndsAt(null);
          setAudioState("idle");
          setAudioProgress({ currentTime: 0, duration: 0 });
          setCurrentNasheed(null);
        }
      },
      onError: (msg) => {
        console.warn("[Nasheeds]", msg);
        if (mountedRef.current) {
          clearNasheedSleepTimer();
          setSleepTimerMinutes(0);
          setSleepTimerEndsAt(null);
          setAudioState("idle");
          setAudioProgress({ currentTime: 0, duration: 0 });
          setCurrentNasheed(null);
        }
      },
      onProgress: (progress) => {
        if (mountedRef.current) setAudioProgress(progress);
      },
    });
    return () => {
      mountedRef.current = false;
      clearNasheedSleepTimer();
    };
  }, [clearNasheedSleepTimer]);

  const loadServerNasheeds = useCallback(async (signal?: AbortSignal) => {
    setNasheedsLoading(true);
    setNasheedsIssue(null);
    try {
      const tracks = await fetchNasheedTracks(signal);
      if (signal?.aborted || !mountedRef.current) return;
      setNasheeds(
        tracks.map((track) => ({
          id: track.id,
          slug: track.slug,
          title: track.title,
          artist: track.artist,
          duration: track.duration,
          category: track.category,
          isFeatured: track.isFeatured,
          audioUrl: track.audioUrl,
          fallbackUrl: track.fallbackUrl,
          coverUrl: track.coverUrl,
          sourceType: track.sourceType,
          licenseLabel: track.licenseLabel,
        })),
      );
    } catch {
      if (signal?.aborted || !mountedRef.current) return;
      setNasheedsIssue("We could not refresh the NurAI audio catalogue.");
      setNasheeds([]);
    } finally {
      if (!signal?.aborted && mountedRef.current) {
        setNasheedsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadServerNasheeds(controller.signal);
    return () => controller.abort();
  }, [loadServerNasheeds]);

  const refreshDownloads = useCallback(async () => {
    if (Platform.OS === "web") return;
    const [ids, summary] = await Promise.all([
      getDownloadedIds(),
      getMediaStorageSummary(),
    ]);
    if (mountedRef.current) {
      setDownloadedIds(new Set(ids));
      setStorageUsed(summary.nasheedAudioBytes);
      setMediaStorageSummary(summary);
    }
  }, []);

  useEffect(() => {
    refreshDownloads();
  }, [refreshDownloads]);

  const filteredNasheeds = useMemo(() => {
    let list = nasheeds;
    if (selectedCategory === "Downloaded") {
      list = list.filter((n) => downloadedIds.has(n.id));
    } else if (selectedCategory !== "All") {
      list = list.filter((n) => n.category === selectedCategory);
    }
    if (selectedArtist) {
      list = list.filter((n) => n.artist === selectedArtist);
    }
    return list;
  }, [nasheeds, selectedCategory, selectedArtist, downloadedIds]);

  const featuredNasheeds = useMemo(
    () => nasheeds.filter((n) => n.isFeatured),
    [nasheeds],
  );

  const artists = useMemo(() => {
    const artistCounts = new Map<string, number>();
    for (const nasheed of nasheeds) {
      artistCounts.set(
        nasheed.artist,
        (artistCounts.get(nasheed.artist) || 0) + 1,
      );
    }
    return Array.from(artistCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [nasheeds]);

  const handlePlay = useCallback(
    async (nasheed: Nasheed) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!canPlay) {
        navigation.navigate("Subscription", { initialTab: "premium" });
        return;
      }

      if (currentNasheed?.id === nasheed.id) {
        if (audioState === "playing") {
          pausePlayback();
        } else if (audioState === "paused") {
          resumePlayback();
        }
        return;
      }

      stopPlayback();
      setCurrentNasheed(nasheed);
      setAudioState("loading");
      setAudioProgress({ currentTime: 0, duration: 0, isBuffering: true });
      saveMediaResumeSession({
        kind: "nasheed",
        title: nasheed.title,
        subtitle: nasheed.artist || "NurAI nasheed",
        detailLabel:
          sleepTimerMinutes > 0
            ? `Sleep timer ${formatMediaSleepTimer(sleepTimerMinutes)}`
            : "No limit listening",
        route: "Nasheeds",
        params: {
          initialCategory: nasheed.category,
          initialTrackId: nasheed.id,
        },
      }).catch(() => {});

      const localPath = await getLocalPath(nasheed.id);
      const playbackOptions = {
        allowBackground: true,
        metadata: buildNasheedAudioMetadata({
          title: nasheed.title,
          artist: nasheed.artist,
          category: nasheed.category,
          coverUrl: nasheed.coverUrl,
          sessionLabel:
            sleepTimerMinutes > 0
              ? `Sleep timer ${formatMediaSleepTimer(sleepTimerMinutes)}`
              : "No limit",
          offlineLabel: localPath ? "Offline ready" : undefined,
        }),
      };
      if (localPath) {
        loadAndPlay(localPath, nasheed.audioUrl, playbackOptions);
      } else {
        loadAndPlay(
          nasheed.audioUrl,
          nasheed.fallbackUrl || undefined,
          playbackOptions,
        );
      }
      scheduleNasheedSleepTimer(sleepTimerMinutes);
    },
    [
      canPlay,
      currentNasheed,
      audioState,
      navigation,
      scheduleNasheedSleepTimer,
      sleepTimerMinutes,
    ],
  );

  const handleStop = useCallback(() => {
    clearNasheedSleepTimer();
    setSleepTimerMinutes(0);
    setSleepTimerEndsAt(null);
    stopPlayback();
    setCurrentNasheed(null);
    setAudioProgress({ currentTime: 0, duration: 0 });
    setAudioState("idle");
  }, [clearNasheedSleepTimer]);

  const handlePauseResume = useCallback(() => {
    if (audioState === "playing") {
      pausePlayback();
    } else if (audioState === "paused") {
      resumePlayback();
    }
  }, [audioState]);

  const handleSeekBy = useCallback(
    async (seconds: number) => {
      if (audioProgress.duration <= 0) return;
      Haptics.selectionAsync();
      await seekByPlayback(seconds);
    },
    [audioProgress.duration],
  );

  const handleSleepTimerSelect = useCallback(
    (minutes: number) => {
      Haptics.selectionAsync();
      setSleepTimerMinutes(minutes);
      const hasActivePlayback =
        currentNasheed &&
        (audioState === "playing" ||
          audioState === "paused" ||
          audioState === "loading");
      if (!hasActivePlayback) {
        setSleepTimerEndsAt(null);
        return;
      }
      scheduleNasheedSleepTimer(minutes);
    },
    [audioState, currentNasheed, scheduleNasheedSleepTimer],
  );

  const handleSleepTimerAdjust = useCallback(
    (direction: -1 | 1) => {
      Haptics.selectionAsync();
      const baseMinutes =
        sleepTimerMinutes > 0
          ? sleepTimerMinutes
          : NASHEED_SLEEP_TIMER_MIN_MINUTES;
      const nextTimer = Math.min(
        NASHEED_SLEEP_TIMER_MAX_MINUTES,
        Math.max(
          NASHEED_SLEEP_TIMER_MIN_MINUTES,
          baseMinutes + direction * NASHEED_SLEEP_TIMER_STEP_MINUTES,
        ),
      );
      setSleepTimerMinutes(nextTimer);
      const hasActivePlayback =
        currentNasheed &&
        (audioState === "playing" ||
          audioState === "paused" ||
          audioState === "loading");
      if (!hasActivePlayback) {
        setSleepTimerEndsAt(null);
        return;
      }
      scheduleNasheedSleepTimer(nextTimer);
    },
    [audioState, currentNasheed, scheduleNasheedSleepTimer, sleepTimerMinutes],
  );

  const handleDownload = useCallback(
    async (nasheed: Nasheed) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (downloadedIds.has(nasheed.id)) {
        await deleteDownload(nasheed.id);
        await refreshDownloads();
        return;
      }

      if (downloadingIds.has(nasheed.id)) return;

      setDownloadingIds((prev) => new Map(prev).set(nasheed.id, 0));

      const success = await downloadAudio(
        nasheed.audioUrl,
        nasheed.id,
        { title: nasheed.title, artist: nasheed.artist },
        (p) => {
          if (mountedRef.current) {
            setDownloadingIds((prev) =>
              new Map(prev).set(nasheed.id, p.fraction),
            );
          }
        },
      );

      if (mountedRef.current) {
        setDownloadingIds((prev) => {
          const next = new Map(prev);
          next.delete(nasheed.id);
          return next;
        });
        if (success) {
          await refreshDownloads();
        }
      }
    },
    [downloadedIds, downloadingIds, refreshDownloads],
  );

  const isPlayingTrack = (id: string) =>
    currentNasheed?.id === id && audioState === "playing";
  const isLoadingTrack = (id: string) =>
    currentNasheed?.id === id && audioState === "loading";
  const isActiveTrack = (id: string) =>
    currentNasheed?.id === id &&
    (audioState === "playing" ||
      audioState === "paused" ||
      audioState === "loading");

  const getCategoryColor = (cat: NasheedCategory) => {
    const colorMap: Record<NasheedCategory, keyof typeof CategoryColors> = {
      All: "purple",
      Downloaded: "emerald",
      Relaxing: "blue",
      Motivational: "amber",
      Ramadan: "orange",
      Kids: "teal",
      Dhikr: "emerald",
      Wedding: "pink",
      Classical: "indigo",
    };
    const key = colorMap[cat];
    const c = CategoryColors[key];
    return isDark ? c.dark : c;
  };

  const renderNasheedCard = ({
    item,
    index,
  }: {
    item: Nasheed;
    index: number;
  }) => {
    const catColor = getCategoryColor(item.category);
    const active = isActiveTrack(item.id);
    const playing = isPlayingTrack(item.id);
    const loading = isLoadingTrack(item.id);
    const downloaded = downloadedIds.has(item.id);
    const dlProgress = downloadingIds.get(item.id);
    const isDownloading = dlProgress !== undefined;
    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(250)}>
        <Pressable
          onPress={() => handlePlay(item)}
          style={({ pressed }) => [
            styles.nasheedCard,
            {
              backgroundColor: active
                ? theme.primaryMuted
                : theme.cardBackground,
              borderColor: active ? theme.primary + "40" : theme.borderLight,
            },
            pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
          ]}
          testID={`nasheed-card-${item.id}`}
        >
          <GeometricCardPattern color={catColor.text} opacity={0.012} />
          <View style={[styles.nasheedIcon, { backgroundColor: catColor.bg }]}>
            <AppIcon name="music" size={20} color={catColor.text} />
          </View>
          <View style={styles.nasheedInfo}>
            <View style={styles.nasheedTitleRow}>
              <ThemedText
                type="body"
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: active ? theme.primary : theme.text,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {item.title}
              </ThemedText>
              {downloaded ? (
                <AppIcon
                  name="check-circle"
                  size={12}
                  color={theme.primary}
                  style={{ marginLeft: 4 }}
                />
              ) : null}
            </View>
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginTop: 2 }}
              numberOfLines={1}
            >
              {item.artist}
            </ThemedText>
            {item.licenseLabel ? (
              <ThemedText
                type="caption"
                style={{ color: theme.scholar, marginTop: 2, fontSize: 10 }}
                numberOfLines={1}
              >
                {item.licenseLabel}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, marginRight: Spacing.xs }}
          >
            {item.duration}
          </ThemedText>
          {canPlay && Platform.OS !== "web" ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleDownload(item);
              }}
              hitSlop={6}
              style={[
                styles.dlBtn,
                {
                  backgroundColor: downloaded
                    ? theme.primary + "15"
                    : theme.surfaceGlass,
                },
              ]}
              testID={`download-btn-${item.id}`}
            >
              {isDownloading ? (
                <View style={styles.dlProgressWrap}>
                  <ActivityIndicator size={12} color={theme.primary} />
                  <ThemedText
                    style={{ fontSize: 8, color: theme.primary, marginTop: 1 }}
                  >
                    {Math.round((dlProgress || 0) * 100)}
                  </ThemedText>
                </View>
              ) : downloaded ? (
                <AppIcon name="check" size={13} color={theme.primary} />
              ) : (
                <AppIcon name="download" size={13} color={theme.textMuted} />
              )}
            </Pressable>
          ) : null}
          {canPlay ? (
            <View
              style={[
                styles.playBtn,
                {
                  backgroundColor: active
                    ? theme.primary + "30"
                    : theme.primaryMuted,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size={14} color={theme.primary} />
              ) : (
                <AppIcon
                  name={playing ? "pause" : "play"}
                  size={16}
                  color={theme.primary}
                />
              )}
            </View>
          ) : (
            <View
              style={[
                styles.playBtn,
                {
                  backgroundColor: isDark
                    ? "rgba(251,191,36,0.15)"
                    : "rgba(245,158,11,0.1)",
                },
              ]}
            >
              <AppIcon name="lock" size={14} color="#F59E0B" />
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  const showMiniPlayer =
    currentNasheed &&
    (audioState === "playing" ||
      audioState === "paused" ||
      audioState === "loading");
  const miniPlayerProgress = getMediaProgressPercent(
    audioProgress,
    audioState,
    28,
    0,
  );
  const currentNasheedDownloaded = currentNasheed
    ? downloadedIds.has(currentNasheed.id)
    : false;
  const sleepTimerRemainingMs =
    sleepTimerEndsAt && sleepTimerMinutes > 0
      ? Math.max(0, sleepTimerEndsAt - sleepTimerNow)
      : 0;
  const nasheedSleepTimerRemainingLabel =
    sleepTimerRemainingMs > 0
      ? formatMediaSleepTimerRemaining(sleepTimerRemainingMs)
      : "";
  const nasheedSleepTimerSummary =
    sleepTimerMinutes > 0 && nasheedSleepTimerRemainingLabel
      ? `Fades in ${nasheedSleepTimerRemainingLabel}`
      : formatMediaSleepTimerSummary(sleepTimerMinutes);
  const nasheedOfflineLabel = formatMediaOfflineStatus(
    currentNasheedDownloaded,
  );
  const nasheedBackgroundStatus = formatMediaBackgroundStatus(canPlay);
  const nasheedModeSummary = joinMediaModeSummary([
    nasheedBackgroundStatus,
    nasheedSleepTimerSummary,
    nasheedOfflineLabel,
  ]);
  const emptyState = useMemo(() => {
    if (nasheedsLoading) {
      return {
        eyebrow: "SYNCING CATALOGUE",
        title: "Refreshing NurAI audio",
        body: "Loading owned and licensed tracks for calm listening, offline moments, and background sessions.",
        icon: "loader" as const,
        tone: theme.primary,
        primaryLabel: null,
      };
    }
    if (nasheedsIssue) {
      return {
        eyebrow: "AUDIO CATALOGUE",
        title: "Catalogue needs a refresh",
        body: "Your app is ready, but the audio catalogue did not load this time. Try again, or use downloaded tracks if you already saved any.",
        icon: "wifi-off" as const,
        tone: theme.scholar,
        primaryLabel: "Refresh catalogue",
      };
    }
    if (selectedCategory === "Downloaded") {
      return {
        eyebrow: "OFFLINE AUDIO",
        title: "No downloads yet",
        body: "Save a track from the main catalogue and it will appear here for Premium offline listening.",
        icon: "download-cloud" as const,
        tone: theme.primary,
        primaryLabel: "Browse catalogue",
      };
    }
    return {
      eyebrow: "NURAI ORIGINALS",
      title: "No tracks in this section yet",
      body: selectedArtist
        ? "Clear the artist filter or choose another category to continue listening."
        : "This collection is ready for future NurAI-owned or licensed audio without needing a new app update.",
      icon: "music" as const,
      tone: theme.primary,
      primaryLabel: selectedArtist ? "Clear filter" : "View all",
    };
  }, [
    nasheedsIssue,
    nasheedsLoading,
    selectedArtist,
    selectedCategory,
    theme.primary,
    theme.scholar,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            testID="nasheeds-back"
          >
            <AppIcon name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h2" style={{ flex: 1, marginLeft: Spacing.md }}>
            Nasheeds
          </ThemedText>
        </View>
        <ThemedText
          type="caption"
          style={{ color: theme.textMuted, marginTop: 2, marginLeft: 40 }}
        >
          Owned and licensed audio catalogue
        </ThemedText>
      </View>

      <FlatList
        data={filteredNasheeds}
        keyExtractor={(item) => item.id}
        renderItem={renderNasheedCard}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              insets.bottom + (showMiniPlayer ? 230 : Spacing["3xl"]),
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Animated.View
              entering={FadeInDown.duration(280)}
              style={[
                styles.nasheedHeroCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: `${theme.scholar}34`,
                },
              ]}
            >
              <GeometricCardPattern color={theme.scholar} opacity={0.012} />
              <View
                style={[
                  styles.nasheedHeroIcon,
                  { backgroundColor: `${theme.primary}16` },
                ]}
              >
                <AppIcon name="headphones" size={23} color={theme.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText type="h3">Calm audio space</ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, marginTop: 2 }}
                  numberOfLines={2}
                >
                  Listen, download for offline moments, and receive new NurAI
                  audio without updating the app.
                </ThemedText>
              </View>
              <View
                style={[
                  styles.nasheedHeroBadge,
                  {
                    borderColor: canPlay
                      ? theme.primaryBorder
                      : `${theme.scholar}44`,
                  },
                ]}
              >
                <AppIcon
                  name={canPlay ? "check-circle" : "lock"}
                  size={13}
                  color={canPlay ? theme.primary : theme.scholar}
                />
                <ThemedText
                  type="caption"
                  style={{
                    color: canPlay ? theme.primary : theme.scholar,
                    fontWeight: "800",
                  }}
                >
                  {canPlay ? "Ready" : "Premium"}
                </ThemedText>
              </View>
            </Animated.View>

            {!canPlay ? (
              <Animated.View entering={FadeInDown.duration(300)}>
                <Pressable
                  onPress={() =>
                    navigation.navigate("Subscription", {
                      initialTab: "premium",
                    })
                  }
                  testID="nasheeds-premium-banner"
                >
                  <LinearGradient
                    colors={
                      isDark ? ["#422006", "#78350F"] : ["#FEF3C7", "#FDE68A"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.premiumBanner}
                  >
                    <GeometricCardPattern
                      color={isDark ? "#FBBF24" : "#D97706"}
                      opacity={0.012}
                    />
                    <View style={styles.premiumBannerContent}>
                      <View style={styles.premiumBannerLeft}>
                        <AppIcon
                          name="headphones"
                          size={22}
                          color={isDark ? "#FBBF24" : "#D97706"}
                        />
                        <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                          <ThemedText
                            style={{
                              fontSize: 15,
                              fontWeight: "700",
                              color: isDark ? "#FBBF24" : "#92400E",
                            }}
                          >
                            Unlock Playback
                          </ThemedText>
                          <ThemedText
                            style={{
                              fontSize: 12,
                              color: isDark ? "#FDE68A" : "#A16207",
                              marginTop: 2,
                            }}
                          >
                            Subscribe to listen and download nasheeds
                          </ThemedText>
                        </View>
                      </View>
                      <AppIcon
                        name="chevron-right"
                        size={18}
                        color={isDark ? "#FBBF24" : "#D97706"}
                      />
                    </View>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
              style={styles.categoriesScroll}
            >
              {CATEGORIES.map((cat) => {
                const isCatActive = selectedCategory === cat;
                const catColor = getCategoryColor(cat);
                const showCount =
                  cat === "Downloaded" && downloadedIds.size > 0;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setSelectedArtist(null);
                    }}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isCatActive
                          ? catColor.bg
                          : theme.cardBackground,
                        borderColor: isCatActive
                          ? catColor.text + "40"
                          : theme.borderLight,
                      },
                    ]}
                    testID={`category-${cat.toLowerCase()}`}
                  >
                    <AppIcon
                      name={CATEGORY_ICONS[cat]}
                      size={14}
                      color={isCatActive ? catColor.text : theme.textMuted}
                    />
                    <ThemedText
                      style={{
                        fontSize: 13,
                        fontWeight: isCatActive ? "700" : "500",
                        color: isCatActive
                          ? catColor.text
                          : theme.textSecondary,
                        marginLeft: 5,
                      }}
                    >
                      {cat}
                      {showCount ? ` (${downloadedIds.size})` : ""}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {selectedCategory === "Downloaded" && canPlay ? (
              <View
                style={[styles.storageRow, { borderColor: theme.borderLight }]}
              >
                <AppIcon name="hard-drive" size={14} color={theme.textMuted} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, marginLeft: Spacing.xs }}
                >
                  {formatMediaBytes(storageUsed)} nasheeds
                  {mediaStorageSummary
                    ? ` · ${formatMediaBytes(mediaStorageSummary.totalBytes)} total offline`
                    : ""}
                </ThemedText>
              </View>
            ) : null}

            {selectedCategory === "All" && !selectedArtist ? (
              <>
                {featuredNasheeds.length > 0 ? (
                  <>
                    <View style={styles.sectionHeader}>
                      <ThemedText type="h4">Featured</ThemedText>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.featuredContainer}
                      style={styles.featuredScroll}
                    >
                      {featuredNasheeds.map((nasheed, i) => {
                        const catColor = getCategoryColor(nasheed.category);
                        const active = isActiveTrack(nasheed.id);
                        const playing = isPlayingTrack(nasheed.id);
                        return (
                          <Animated.View
                            key={nasheed.id}
                            entering={FadeInDown.delay(i * 60).duration(300)}
                          >
                            <Pressable
                              onPress={() => handlePlay(nasheed)}
                              style={({ pressed }) => [
                                styles.featuredCard,
                                {
                                  backgroundColor: active
                                    ? theme.primaryMuted
                                    : theme.cardBackground,
                                  borderColor: active
                                    ? theme.primary + "40"
                                    : theme.borderLight,
                                },
                                pressed ? { opacity: 0.85 } : null,
                              ]}
                              testID={`featured-nasheed-${nasheed.id}`}
                            >
                              <GeometricCardPattern
                                color={catColor.text}
                                opacity={0.012}
                              />
                              <View
                                style={[
                                  styles.featuredIconWrap,
                                  { backgroundColor: catColor.bg },
                                ]}
                              >
                                <AppIcon
                                  name={
                                    active
                                      ? playing
                                        ? "pause"
                                        : "play"
                                      : "music"
                                  }
                                  size={28}
                                  color={catColor.text}
                                />
                                {canPlay ? null : (
                                  <View style={styles.featuredLock}>
                                    <AppIcon
                                      name="lock"
                                      size={10}
                                      color="#F59E0B"
                                    />
                                  </View>
                                )}
                              </View>
                              <ThemedText
                                type="body"
                                style={{
                                  fontSize: 14,
                                  fontWeight: "600",
                                  marginTop: Spacing.sm,
                                  color: active ? theme.primary : theme.text,
                                }}
                                numberOfLines={1}
                              >
                                {nasheed.title}
                              </ThemedText>
                              <ThemedText
                                type="caption"
                                style={{ color: theme.textMuted, marginTop: 2 }}
                                numberOfLines={1}
                              >
                                {nasheed.artist}
                              </ThemedText>
                            </Pressable>
                          </Animated.View>
                        );
                      })}
                    </ScrollView>
                  </>
                ) : null}

                {artists.length > 0 ? (
                  <>
                    <View style={styles.sectionHeader}>
                      <ThemedText type="h4">Artists</ThemedText>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.artistsContainer}
                      style={styles.artistsScroll}
                    >
                      {artists.map((artist) => {
                        const isArtActive = selectedArtist === artist.name;
                        return (
                          <Pressable
                            key={artist.name}
                            onPress={() =>
                              setSelectedArtist(
                                isArtActive ? null : artist.name,
                              )
                            }
                            style={[
                              styles.artistCard,
                              {
                                backgroundColor: isArtActive
                                  ? theme.primaryMuted
                                  : theme.cardBackground,
                                borderColor: isArtActive
                                  ? theme.primary + "40"
                                  : theme.borderLight,
                              },
                            ]}
                            testID={`artist-${artist.name.toLowerCase().replace(/\s/g, "-")}`}
                          >
                            <View
                              style={[
                                styles.artistAvatar,
                                {
                                  backgroundColor: isArtActive
                                    ? theme.primary + "20"
                                    : isDark
                                      ? theme.surfaceGlass
                                      : theme.backgroundSecondary,
                                },
                              ]}
                            >
                              <AppIcon
                                name="user"
                                size={18}
                                color={
                                  isArtActive ? theme.primary : theme.textMuted
                                }
                              />
                            </View>
                            <ThemedText
                              style={{
                                fontSize: 12,
                                fontWeight: isArtActive ? "700" : "500",
                                color: isArtActive
                                  ? theme.primary
                                  : theme.textSecondary,
                                marginTop: 6,
                                textAlign: "center",
                              }}
                              numberOfLines={1}
                            >
                              {artist.name}
                            </ThemedText>
                            <ThemedText
                              style={{
                                fontSize: 10,
                                color: theme.textMuted,
                                marginTop: 2,
                              }}
                            >
                              {artist.count} tracks
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </>
                ) : null}
              </>
            ) : null}

            <View style={styles.sectionHeader}>
              <ThemedText type="h4">
                {selectedArtist
                  ? selectedArtist
                  : selectedCategory === "All"
                    ? "All Nasheeds"
                    : selectedCategory === "Downloaded"
                      ? "Downloaded"
                      : selectedCategory}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, marginLeft: Spacing.sm }}
              >
                {filteredNasheeds.length} tracks
              </ThemedText>
            </View>
          </>
        }
        ListEmptyComponent={
          <Animated.View
            entering={FadeInUp.duration(260)}
            style={[
              styles.emptyStateCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: `${emptyState.tone}30`,
              },
            ]}
            testID="nasheeds-empty-state"
          >
            <GeometricCardPattern color={emptyState.tone} opacity={0.012} />
            <View
              style={[
                styles.emptyStateOrb,
                {
                  backgroundColor: `${emptyState.tone}14`,
                  borderColor: `${emptyState.tone}28`,
                },
              ]}
            >
              {nasheedsLoading ? (
                <ActivityIndicator size="small" color={emptyState.tone} />
              ) : (
                <AppIcon
                  name={emptyState.icon}
                  size={24}
                  color={emptyState.tone}
                />
              )}
            </View>
            <ThemedText
              type="caption"
              style={[styles.emptyStateEyebrow, { color: emptyState.tone }]}
            >
              {emptyState.eyebrow}
            </ThemedText>
            <ThemedText type="h3" style={styles.emptyStateTitle}>
              {emptyState.title}
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.emptyStateBody, { color: theme.textSecondary }]}
            >
              {emptyState.body}
            </ThemedText>
            <View style={styles.emptyStateSignalRow}>
              <View
                style={[
                  styles.emptyStateSignal,
                  {
                    backgroundColor: `${theme.primary}0D`,
                    borderColor: `${theme.primary}24`,
                  },
                ]}
              >
                <AppIcon name="smartphone" size={12} color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.primary }}>
                  Background ready
                </ThemedText>
              </View>
              <View
                style={[
                  styles.emptyStateSignal,
                  {
                    backgroundColor: `${theme.scholar}0F`,
                    borderColor: `${theme.scholar}28`,
                  },
                ]}
              >
                <AppIcon name="shield" size={12} color={theme.scholar} />
                <ThemedText type="caption" style={{ color: theme.scholar }}>
                  Rights-safe catalogue
                </ThemedText>
              </View>
            </View>
            {emptyState.primaryLabel ? (
              <Pressable
                onPress={() => {
                  if (nasheedsIssue) {
                    loadServerNasheeds();
                    return;
                  }
                  if (selectedArtist) setSelectedArtist(null);
                  setSelectedCategory("All");
                }}
                style={({ pressed }) => [
                  styles.emptyStateButton,
                  {
                    backgroundColor: `${emptyState.tone}18`,
                    borderColor: `${emptyState.tone}42`,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={emptyState.primaryLabel}
                testID={
                  nasheedsIssue
                    ? "nasheeds-empty-retry"
                    : "nasheeds-empty-primary-action"
                }
              >
                <AppIcon
                  name={nasheedsIssue ? "refresh-cw" : "arrow-right"}
                  size={15}
                  color={emptyState.tone}
                />
                <ThemedText
                  type="caption"
                  style={{ color: emptyState.tone, fontWeight: "900" }}
                >
                  {emptyState.primaryLabel}
                </ThemedText>
              </Pressable>
            ) : null}
          </Animated.View>
        }
      />

      {showMiniPlayer ? (
        <PremiumMiniPlayerSurface
          testID="nasheed-premium-mini-player"
          entering={FadeInUp.duration(250)}
          glowColor={`${theme.primary}16`}
          style={[
            styles.miniPlayer,
            {
              backgroundColor: isDark
                ? "rgba(6,20,31,0.96)"
                : theme.cardBackground,
              borderColor: theme.borderSubtle,
              paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.md,
            },
          ]}
        >
          <View style={styles.miniPlayerContent}>
            <View
              style={[
                styles.miniPlayerIcon,
                { backgroundColor: theme.primaryMuted },
              ]}
            >
              {audioState === "loading" ? (
                <ActivityIndicator size={16} color={theme.primary} />
              ) : (
                <AppIcon name="music" size={18} color={theme.primary} />
              )}
            </View>
            <View style={styles.miniPlayerInfo}>
              <ThemedText
                type="body"
                style={{ fontSize: 14, fontWeight: "600" }}
                numberOfLines={1}
              >
                {currentNasheed?.title}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, marginTop: 1 }}
                numberOfLines={1}
              >
                {nasheedModeSummary}
              </ThemedText>
            </View>
            <MediaStatusBadge
              icon="smartphone"
              label="Lock screen"
              color={theme.primary}
              backgroundColor={`${theme.primary}12`}
              borderColor={`${theme.primary}28`}
            />
            <Pressable
              onPress={handlePauseResume}
              style={[
                styles.miniPlayerBtn,
                { backgroundColor: theme.primaryMuted },
              ]}
              hitSlop={8}
              testID="mini-player-pause"
            >
              {audioState === "loading" ? (
                <ActivityIndicator size={16} color={theme.primary} />
              ) : (
                <AppIcon
                  name={audioState === "playing" ? "pause" : "play"}
                  size={18}
                  color={theme.primary}
                />
              )}
            </Pressable>
            <Pressable
              onPress={handleStop}
              style={[
                styles.miniPlayerBtn,
                { backgroundColor: theme.surfaceGlass, marginLeft: Spacing.sm },
              ]}
              hitSlop={8}
              testID="mini-player-stop"
            >
              <AppIcon name="square" size={16} color={theme.textMuted} />
            </Pressable>
          </View>
          <View style={styles.miniStatusRow}>
            <MediaStatusBadge
              icon="smartphone"
              label={nasheedBackgroundStatus}
              color={theme.primary}
              backgroundColor={`${theme.primary}12`}
              borderColor={`${theme.primary}28`}
            />
            <MediaStatusBadge
              icon="clock"
              label={nasheedSleepTimerSummary}
              color={sleepTimerMinutes > 0 ? theme.scholar : theme.primary}
              backgroundColor={
                sleepTimerMinutes > 0
                  ? `${theme.scholar}12`
                  : `${theme.primary}10`
              }
              borderColor={
                sleepTimerMinutes > 0
                  ? `${theme.scholar}30`
                  : `${theme.primary}24`
              }
            />
            <MediaStatusBadge
              icon={currentNasheedDownloaded ? "check-circle" : "wifi"}
              label={nasheedOfflineLabel}
              color={currentNasheedDownloaded ? theme.primary : theme.textMuted}
              backgroundColor={
                currentNasheedDownloaded
                  ? `${theme.primary}10`
                  : `${theme.textMuted}10`
              }
              borderColor={
                currentNasheedDownloaded
                  ? `${theme.primary}24`
                  : theme.borderSubtle
              }
            />
          </View>
          <View style={styles.sleepTimerHeader}>
            <View style={styles.sleepTimerTitle}>
              <AppIcon name="clock" size={12} color={theme.scholar} />
              <ThemedText
                type="caption"
                style={{ color: theme.scholar, fontWeight: "900" }}
              >
                Sleep timer
              </ThemedText>
            </View>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Until stopped keeps audio playing for as long as you want.
            </ThemedText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sleepTimerOptions}
          >
            {NASHEED_SLEEP_TIMER_OPTIONS.map((minutes) => {
              const active = sleepTimerMinutes === minutes;
              return (
                <MediaControlChip
                  key={minutes}
                  icon="clock"
                  label={formatMediaSleepTimerControlLabel(minutes)}
                  color={active ? theme.scholar : theme.textSecondary}
                  backgroundColor={
                    active ? `${theme.scholar}22` : `${theme.textMuted}10`
                  }
                  borderColor={
                    active ? `${theme.scholar}66` : theme.borderSubtle
                  }
                  onPress={() => handleSleepTimerSelect(minutes)}
                  accessibilityLabel={
                    minutes <= 0
                      ? "Set nasheed audio to no limit so it keeps playing until stopped"
                      : `Set nasheed sleep timer to ${formatMediaSleepTimer(minutes)}`
                  }
                  testID={`nasheed-sleep-timer-${minutes}`}
                />
              );
            })}
          </ScrollView>
          <View
            testID="nasheed-custom-sleep-timer-stepper"
            style={[
              styles.nasheedTimerStepper,
              {
                borderColor:
                  sleepTimerMinutes > 0
                    ? `${theme.scholar}55`
                    : theme.borderSubtle,
                backgroundColor: `${theme.textMuted}08`,
              },
            ]}
          >
            <View style={styles.nasheedTimerStepperCopy}>
              <ThemedText
                type="caption"
                style={{
                  color: theme.scholar,
                  fontWeight: "900",
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                Custom fade
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, marginTop: 2 }}
              >
                Tune the session in 5 minute steps, or keep Until stopped for
                continuous listening.
              </ThemedText>
            </View>
            <View style={styles.nasheedTimerStepperControls}>
              <Pressable
                testID="button-nasheed-sleep-timer-minus"
                accessibilityRole="button"
                accessibilityLabel="Reduce nasheed sleep timer by five minutes"
                onPress={() => handleSleepTimerAdjust(-1)}
                style={({ pressed }) => [
                  styles.nasheedTimerStepperButton,
                  {
                    borderColor: theme.borderSubtle,
                    backgroundColor: `${theme.surfaceElevated}CC`,
                    opacity: pressed ? 0.76 : 1,
                  },
                ]}
              >
                <AppIcon name="minus" size={15} color={theme.text} />
              </Pressable>
              <View style={styles.nasheedTimerStepperValue}>
                <ThemedText
                  type="body"
                  style={{ color: theme.text, fontWeight: "900" }}
                >
                  {sleepTimerMinutes > 0
                    ? formatMediaSleepTimer(sleepTimerMinutes)
                    : "Until stopped"}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, marginTop: 1 }}
                >
                  {sleepTimerMinutes > 0 ? "Timed fade" : "Continuous"}
                </ThemedText>
              </View>
              <Pressable
                testID="button-nasheed-sleep-timer-plus"
                accessibilityRole="button"
                accessibilityLabel="Increase nasheed sleep timer by five minutes"
                onPress={() => handleSleepTimerAdjust(1)}
                style={({ pressed }) => [
                  styles.nasheedTimerStepperButton,
                  {
                    borderColor: theme.borderSubtle,
                    backgroundColor: `${theme.surfaceElevated}CC`,
                    opacity: pressed ? 0.76 : 1,
                  },
                ]}
              >
                <AppIcon name="plus" size={15} color={theme.text} />
              </Pressable>
            </View>
          </View>
          <MediaProgressBar
            progress={miniPlayerProgress}
            color={theme.primary}
            trackColor={`${theme.primary}18`}
            style={{ marginTop: Spacing.sm }}
          />
          <View style={styles.miniTimeRow}>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              {formatMediaTime(audioProgress.currentTime)}
            </ThemedText>
            <View style={styles.miniSeekControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rewind nasheed 15 seconds"
                disabled={audioProgress.duration <= 0}
                onPress={() => handleSeekBy(-15)}
                style={({ pressed }) => [
                  styles.miniSeekButton,
                  {
                    borderColor: theme.borderSubtle,
                    backgroundColor: theme.surfaceGlass,
                    opacity:
                      audioProgress.duration <= 0 ? 0.45 : pressed ? 0.7 : 1,
                  },
                ]}
              >
                <AppIcon name="rotate-ccw" size={12} color={theme.textMuted} />
                <ThemedText
                  type="caption"
                  style={[styles.miniSeekText, { color: theme.textMuted }]}
                >
                  15
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Forward nasheed 15 seconds"
                disabled={audioProgress.duration <= 0}
                onPress={() => handleSeekBy(15)}
                style={({ pressed }) => [
                  styles.miniSeekButton,
                  {
                    borderColor: theme.borderSubtle,
                    backgroundColor: theme.surfaceGlass,
                    opacity:
                      audioProgress.duration <= 0 ? 0.45 : pressed ? 0.7 : 1,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={[styles.miniSeekText, { color: theme.textMuted }]}
                >
                  15
                </ThemedText>
                <AppIcon name="rotate-cw" size={12} color={theme.textMuted} />
              </Pressable>
            </View>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              {formatMediaTime(audioProgress.duration)}
            </ThemedText>
          </View>
        </PremiumMiniPlayerSurface>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  nasheedHeroCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  nasheedHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  nasheedHeroBadge: {
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  premiumBanner: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  premiumBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  premiumBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoriesScroll: {
    marginHorizontal: -Spacing.lg,
  },
  categoriesContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  storageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  featuredScroll: {
    marginHorizontal: -Spacing.lg,
  },
  featuredContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  featuredCard: {
    width: 140,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: "hidden",
  },
  featuredIconWrap: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  featuredLock: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(245,158,11,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  artistsScroll: {
    marginHorizontal: -Spacing.lg,
  },
  artistsContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  artistCard: {
    width: 90,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    alignItems: "center",
    overflow: "hidden",
  },
  artistAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  nasheedCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  nasheedIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  nasheedInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  nasheedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dlBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.xs,
  },
  dlProgressWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    alignItems: "center",
    overflow: "hidden",
  },
  emptyStateOrb: {
    width: 66,
    height: 66,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyStateEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    textAlign: "center",
    textTransform: "uppercase",
  },
  emptyStateTitle: {
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  emptyStateBody: {
    marginTop: Spacing.sm,
    lineHeight: 22,
    textAlign: "center",
  },
  emptyStateSignalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  emptyStateSignal: {
    minHeight: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  emptyStateButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  miniPlayer: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.md,
    right: Spacing.md,
    borderWidth: 1,
    borderRadius: 26,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  miniPlayerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  miniPlayerIcon: {
    width: 42,
    height: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  miniPlayerInfo: {
    flex: 1,
    minWidth: 0,
  },
  miniPlayerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  miniStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  sleepTimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  sleepTimerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sleepTimerOptions: {
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    paddingBottom: 2,
  },
  nasheedTimerStepper: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  nasheedTimerStepperCopy: {
    gap: 2,
  },
  nasheedTimerStepperControls: {
    minHeight: 46,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  nasheedTimerStepperButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  nasheedTimerStepperValue: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  miniTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  miniSeekControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  miniSeekButton: {
    minWidth: 54,
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  miniSeekText: {
    fontSize: 10,
    fontWeight: "900",
  },
});
