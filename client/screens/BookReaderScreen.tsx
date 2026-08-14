import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as Speech from "expo-speech";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  AIResponseData,
  AIResponseModal,
  AIResponseState,
  customerSafeAIErrorMessage,
} from "@/components/AIResponseModal";
import { ThemedText } from "@/components/ThemedText";
import {
  GeometricCardPattern,
  GoldDivider,
} from "@/components/premium/svg/PremiumSvgs";
import { hasAccess } from "@/config/entitlements";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useSubscription } from "@/context/SubscriptionContext";
import { removeBookmarkByMetadata, upsertBookmark } from "@/lib/bookmarks";
import { syncedSetItem } from "@/lib/progress-sync";
import {
  loadAndPlay,
  pausePlayback,
  resumePlayback,
  stopPlayback,
  teardown,
  setCallbacks,
  type TransportState,
} from "@/lib/audio-transport";
import { useTheme } from "@/hooks/useTheme";
import {
  createLocalReflectionPrompt,
  explainLibraryChapter,
} from "@/services/aiLibraryService";
import {
  deleteLibraryNarrationDownload,
  downloadLibraryNarration,
  getLibraryNarrationUri,
  isLibraryNarrationAuthorizationError,
  isLibraryNarrationDownloaded,
} from "@/services/libraryNarrationService";
import {
  canAccessChapter,
  getBookLockedReason,
  getUpgradeTarget,
} from "@/services/libraryAccessControl";
import { getBookById } from "@/services/libraryService";
import {
  getAllBookProgress,
  getBookProgress,
  markChapterComplete,
  saveReflection,
  saveReadingPosition,
  setCurrentChapter,
  toggleSectionHighlight,
  toggleBookmark,
} from "@/services/libraryProgressService";
import {
  listOfflineBooks,
  type OfflineBookEntry,
} from "@/services/libraryOfflineBookService";
import { Book, Chapter, PlanType, UserBookProgress } from "@/types/library";
import { AppIcon, type AppIconName } from "@/components/icons";
import { recordGardenAction } from "@/services/gardenService";

type ReaderMode = "night" | "sepia" | "focus";
type ReaderWidthMode = "classic" | "wide";
type ReaderLibraryTab =
  | "chapters"
  | "saved"
  | "continue"
  | "highlights"
  | "notes";
type ReaderNoteEditorTarget = {
  bookId: string;
  chapterId: string;
  bookTitle: string;
  chapterTitle: string;
};

const READER_SETTINGS_KEY = "nurai_library_reader_settings_v1";

const NARRATION_UNAVAILABLE_COPY =
  "Narration is temporarily unavailable. You can still read this chapter here.";
const OFFLINE_NARRATION_UNAVAILABLE_COPY =
  "Offline narration is not available right now. Press play to listen with your phone's built-in voice.";
const NARRATION_DAILY_LIMIT_COPY =
  "Premium narration has reached today's limit. You can keep reading this chapter here.";
const DEVICE_NARRATION_CHUNK_COPY =
  "This chapter is playing in sections with your phone's built-in voice.";

function customerNarrationErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /daily|limit|quota/i.test(message)
    ? NARRATION_DAILY_LIMIT_COPY
    : isLibraryNarrationAuthorizationError(error)
      ? "Premium unlocks chapter narration and offline playback."
      : OFFLINE_NARRATION_UNAVAILABLE_COPY;
}

function splitDeviceNarrationText(script: string): string[] {
  const maxLength =
    Number.isFinite(Speech.maxSpeechInputLength) &&
    Speech.maxSpeechInputLength > 0
      ? Math.max(500, Speech.maxSpeechInputLength - 80)
      : 0;
  if (!maxLength || script.length <= maxLength) return [script];

  const chunks: string[] = [];
  let remaining = script.trim();
  while (remaining.length > maxLength) {
    const windowText = remaining.slice(0, maxLength);
    const splitAt = Math.max(
      windowText.lastIndexOf(". "),
      windowText.lastIndexOf("? "),
      windowText.lastIndexOf("! "),
      windowText.lastIndexOf("\n"),
      windowText.lastIndexOf(" "),
    );
    const endIndex = splitAt > 240 ? splitAt + 1 : maxLength;
    chunks.push(remaining.slice(0, endIndex).trim());
    remaining = remaining.slice(endIndex).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks.filter(Boolean);
}

function formatAnnotationDate(value?: string): string {
  if (!value) return "Saved";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatReadingPositionDate(value?: string): string {
  if (!value) return "Saved place";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved place";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 2) return "Just saved";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function BookReaderScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { currentPlan, checkEntitlements } = useSubscription();
  const userPlan = currentPlan as PlanType;
  const book = getBookById(route.params?.bookId);
  const [progress, setProgress] = useState<UserBookProgress | null>(null);
  const [progressByBook, setProgressByBook] = useState<
    Record<string, UserBookProgress>
  >({});
  const [offlineBooks, setOfflineBooks] = useState<OfflineBookEntry[]>([]);
  const [reflection, setReflection] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [aiVisible, setAIVisible] = useState(false);
  const [aiState, setAIState] = useState<AIResponseState>("loading");
  const [aiData, setAIData] = useState<AIResponseData | null>(null);
  const [aiError, setAIError] = useState<string | undefined>();
  const [audioState, setAudioState] = useState<TransportState>("idle");
  const [audioChapterId, setAudioChapterId] = useState<string | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const [deviceNarrationActive, setDeviceNarrationActive] = useState(false);
  const [narrationDownloaded, setNarrationDownloaded] = useState(false);
  const [narrationMessage, setNarrationMessage] = useState<string | null>(null);
  const [readerMode, setReaderMode] = useState<ReaderMode>("night");
  const [readerFontSize, setReaderFontSize] = useState(19);
  const [readerLineHeightScale, setReaderLineHeightScale] = useState(1.72);
  const [readerWidthMode, setReaderWidthMode] =
    useState<ReaderWidthMode>("classic");
  const [immersiveReading, setImmersiveReading] = useState(false);
  const [readerSettingsVisible, setReaderSettingsVisible] = useState(false);
  const [chapterDrawerVisible, setChapterDrawerVisible] = useState(false);
  const [readerLibraryTab, setReaderLibraryTab] =
    useState<ReaderLibraryTab>("chapters");
  const [noteEditorTarget, setNoteEditorTarget] =
    useState<ReaderNoteEditorTarget | null>(null);
  const [noteEditorDraft, setNoteEditorDraft] = useState("");
  const [noteEditorSaving, setNoteEditorSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const restoredPositionKeyRef = useRef<string | null>(null);
  const positionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Immersive reading: the floating bottom dock hides while scrolling down
  // into a chapter and returns on pause or scroll-up — same behaviour as
  // the Quran reader. Reduced-motion users keep the dock fixed.
  const reduceMotionForChrome = useReducedMotion();
  const dockVisible = useSharedValue(1);
  const lastScrollYRef = useRef(0);
  const dockIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealDock = useCallback(() => {
    dockVisible.value = withTiming(1, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [dockVisible]);
  const dockChromeStyle = useAnimatedStyle(() => ({
    opacity: dockVisible.value,
    transform: [{ translateY: (1 - dockVisible.value) * 90 }],
  }));
  const gardenRecordedTodayRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (dockIdleTimerRef.current) clearTimeout(dockIdleTimerRef.current);
    },
    [],
  );

  const chapter = useMemo<Chapter | undefined>(() => {
    if (!book) return undefined;
    const preferred = route.params?.chapterId ?? progress?.currentChapterId;
    return (
      book.chapters.find((item) => item.id === preferred) ?? book.chapters[0]
    );
  }, [book, progress, route.params?.chapterId]);

  useEffect(() => {
    if (currentPlan === "free") {
      checkEntitlements().catch(() => {});
    }
  }, [checkEntitlements, currentPlan]);

  useEffect(() => {
    AsyncStorage.getItem(READER_SETTINGS_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (["night", "sepia", "focus"].includes(parsed?.mode)) {
          setReaderMode(parsed.mode);
        }
        if (typeof parsed?.fontSize === "number") {
          setReaderFontSize(Math.min(24, Math.max(16, parsed.fontSize)));
        }
        if (typeof parsed?.lineHeightScale === "number") {
          setReaderLineHeightScale(
            Math.min(1.95, Math.max(1.45, parsed.lineHeightScale)),
          );
        }
        if (["classic", "wide"].includes(parsed?.widthMode)) {
          setReaderWidthMode(parsed.widthMode);
        }
        if (typeof parsed?.immersiveReading === "boolean") {
          setImmersiveReading(parsed.immersiveReading);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    syncedSetItem(
      READER_SETTINGS_KEY,
      JSON.stringify({
        mode: readerMode,
        fontSize: readerFontSize,
        lineHeightScale: readerLineHeightScale,
        widthMode: readerWidthMode,
        immersiveReading,
      }),
    ).catch(() => {});
  }, [
    immersiveReading,
    readerFontSize,
    readerLineHeightScale,
    readerMode,
    readerWidthMode,
  ]);

  const chapterIndex = useMemo(() => {
    if (!book || !chapter) return -1;
    return book.chapters.findIndex((item) => item.id === chapter.id);
  }, [book, chapter]);

  const nextChapter =
    book && chapterIndex >= 0 ? book.chapters[chapterIndex + 1] : undefined;
  const isBookmarked = !!(chapter && progress?.bookmarks.includes(chapter.id));
  const narrationId = book && chapter ? `${book.id}-${chapter.id}` : "";
  const isActiveNarration =
    audioChapterId === narrationId && audioState !== "idle";
  const chapterProgress =
    book && chapterIndex >= 0
      ? Math.round(((chapterIndex + 1) / book.chapters.length) * 100)
      : 0;
  const canUsePremiumNarration = hasAccess(currentPlan, "premium");
  const canUsePremiumReader = hasAccess(currentPlan, "premium");
  const bookUpgradeTab =
    book?.requiredPlan === "scholar" ? "scholar" : "premium";
  const bookUpgradeLabel = book ? getUpgradeTarget(book.requiredPlan) : null;
  const bookUpgradeMessage = book ? getBookLockedReason(book) : "";

  const readerPalette = useMemo(() => {
    if (readerMode === "sepia") {
      return {
        background: "#F3E8D2",
        surface: "#FFF6E5",
        ink: "#241A11",
        muted: "#6F604B",
        rule: "rgba(91, 68, 36, 0.18)",
        accent: "#9B7138",
        panel: "rgba(255, 246, 229, 0.82)",
      };
    }
    if (readerMode === "focus") {
      return {
        background: "#F7F8F5",
        surface: "#FFFFFF",
        ink: "#111827",
        muted: "#5B6472",
        rule: "rgba(17, 24, 39, 0.12)",
        accent: "#047857",
        panel: "rgba(255, 255, 255, 0.9)",
      };
    }
    return {
      background: theme.backgroundRoot,
      surface: "#090F1A",
      ink: theme.text,
      muted: theme.textSecondary,
      rule: theme.border,
      accent: theme.scholar,
      panel: theme.cardBackground,
    };
  }, [readerMode, theme]);

  const loadProgress = useCallback(async () => {
    if (!book) return;
    const [nextProgress, nextProgressByBook, nextOfflineBooks] =
      await Promise.all([
        getBookProgress(book.id),
        getAllBookProgress(),
        listOfflineBooks(),
      ]);
    setProgress(nextProgress);
    setProgressByBook(nextProgressByBook);
    setOfflineBooks(nextOfflineBooks);
    const activeChapter =
      book.chapters.find(
        (item) =>
          item.id ===
          (route.params?.chapterId ?? nextProgress.currentChapterId),
      ) ?? book.chapters[0];
    if (activeChapter) {
      setReflection(nextProgress.reflections[activeChapter.id] ?? "");
      if (canAccessChapter(userPlan, book, activeChapter.id)) {
        await setCurrentChapter(book.id, activeChapter.id);
      }
    }
  }, [book, route.params?.chapterId, userPlan]);

  useEffect(() => {
    loadProgress().catch(() => {});
  }, [loadProgress]);

  useEffect(() => {
    let mounted = true;
    setCallbacks({
      onStateChange: (state) => {
        if (mounted) setAudioState(state);
      },
      onFinish: () => {
        if (mounted) {
          setAudioState("idle");
          setAudioChapterId(null);
        }
      },
      onError: (message) => {
        if (mounted) {
          setAudioState("idle");
          setAudioChapterId(null);
          setNarrationMessage(customerNarrationErrorMessage(message));
        }
      },
    });
    return () => {
      mounted = false;
      teardown();
      Speech.stop().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!narrationId) return;
    isLibraryNarrationDownloaded(narrationId)
      .then(setNarrationDownloaded)
      .catch(() => setNarrationDownloaded(false));
  }, [narrationId]);

  const activeReadingPosition = chapter
    ? progress?.readingPositions[chapter.id]
    : undefined;
  const hasSavedReadingPosition =
    !!activeReadingPosition &&
    activeReadingPosition.scrollY > 120 &&
    activeReadingPosition.progressPercentage > 4;
  const savedReadingPositionLabel = activeReadingPosition
    ? `${activeReadingPosition.progressPercentage}% through chapter`
    : "Start chapter";
  const savedReadingPositionDateLabel = formatReadingPositionDate(
    activeReadingPosition?.updatedAt,
  );
  const highlightedSectionIds = useMemo(
    () => new Set(progress?.highlights.map((highlight) => highlight.id) ?? []),
    [progress?.highlights],
  );
  const savedBookRows = useMemo(
    () =>
      offlineBooks
        .map((entry) => {
          const savedBook = getBookById(entry.bookId);
          return savedBook ? { entry, book: savedBook } : null;
        })
        .filter(
          (item): item is { entry: OfflineBookEntry; book: Book } =>
            item !== null,
        ),
    [offlineBooks],
  );
  const continueBookRows = useMemo(
    () =>
      Object.values(progressByBook)
        .filter(
          (item) =>
            item.progressPercentage > 0 &&
            item.progressPercentage < 100 &&
            !!getBookById(item.bookId),
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .map((item) => ({
          progress: item,
          book: getBookById(item.bookId)!,
        })),
    [progressByBook],
  );
  const highlightRows = useMemo(
    () =>
      Object.values(progressByBook).flatMap((item) => {
        const sourceBook = getBookById(item.bookId);
        if (!sourceBook) return [];
        return item.highlights.map((highlight) => ({
          book: sourceBook,
          progress: item,
          highlight,
          chapter:
            sourceBook.chapters.find(
              (candidate) => candidate.id === highlight.chapterId,
            ) ?? sourceBook.chapters[0],
        }));
      }),
    [progressByBook],
  );
  const noteRows = useMemo(
    () =>
      Object.values(progressByBook).flatMap((item) => {
        const sourceBook = getBookById(item.bookId);
        if (!sourceBook) return [];
        return Object.entries(item.reflections)
          .filter(([, note]) => note.trim().length > 0)
          .map(([chapterId, note]) => ({
            book: sourceBook,
            progress: item,
            chapter:
              sourceBook.chapters.find(
                (candidate) => candidate.id === chapterId,
              ) ?? sourceBook.chapters[0],
            note,
          }));
      }),
    [progressByBook],
  );
  const readerLibraryTabs = useMemo(
    () =>
      [
        {
          id: "chapters" as const,
          label: "Chapters",
          count: book?.chapters.length ?? 0,
          icon: "list" as AppIconName,
        },
        {
          id: "saved" as const,
          label: "Saved",
          count: savedBookRows.length,
          icon: "download-cloud" as AppIconName,
        },
        {
          id: "continue" as const,
          label: "Continue",
          count: continueBookRows.length,
          icon: "play-circle" as AppIconName,
        },
        {
          id: "highlights" as const,
          label: "Highlights",
          count: highlightRows.length,
          icon: "star" as AppIconName,
        },
        {
          id: "notes" as const,
          label: "Notes",
          count: noteRows.length,
          icon: "edit-3" as AppIconName,
        },
      ] satisfies {
        id: ReaderLibraryTab;
        label: string;
        count: number;
        icon: AppIconName;
      }[],
    [
      book?.chapters.length,
      continueBookRows.length,
      highlightRows.length,
      noteRows.length,
      savedBookRows.length,
    ],
  );

  useEffect(() => {
    if (!book || !chapter || !activeReadingPosition) return;
    const restoreKey = `${book.id}:${chapter.id}:${activeReadingPosition.updatedAt}`;
    if (restoredPositionKeyRef.current === restoreKey) return;
    restoredPositionKeyRef.current = restoreKey;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: activeReadingPosition.scrollY,
        animated: false,
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [activeReadingPosition, book, chapter]);

  useEffect(
    () => () => {
      if (positionSaveTimerRef.current) {
        clearTimeout(positionSaveTimerRef.current);
      }
    },
    [],
  );

  if (!book || !chapter) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.empty}>
          <ThemedText type="h3">Chapter not found</ThemedText>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          >
            <ThemedText type="body" style={{ color: theme.primaryForeground }}>
              Go Back
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!canAccessChapter(userPlan, book, chapter.id)) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.empty}>
          <AppIcon name="lock" size={34} color={theme.scholar} />
          <ThemedText type="h3">
            {bookUpgradeLabel ? `${bookUpgradeLabel} book` : "Upgrade required"}
          </ThemedText>
          <ThemedText
            type="body"
            style={{ color: theme.textSecondary, textAlign: "center" }}
          >
            {bookUpgradeMessage}
          </ThemedText>
          <Pressable
            onPress={() =>
              navigation.navigate("Subscription", {
                initialTab: bookUpgradeTab,
                sourceFeature: "library",
              })
            }
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          >
            <ThemedText type="body" style={{ color: theme.primaryForeground }}>
              {`See ${bookUpgradeLabel ?? "Plan"} plans`}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const saveCurrentReflection = async () => {
    const next = await saveReflection(book.id, chapter.id, reflection);
    setProgress(next);
    Alert.alert(
      "Reflection saved",
      "Your note has been saved to this chapter.",
    );
  };

  const completeChapter = async () => {
    const next = await markChapterComplete(book.id, chapter.id);
    setProgress(next);
    if (nextChapter && canAccessChapter(userPlan, book, nextChapter.id)) {
      Alert.alert("Chapter complete", "Your progress has been saved.", [
        { text: "Stay here", style: "cancel" },
        {
          text: "Next chapter",
          onPress: () =>
            navigation.replace("BookReader", {
              bookId: book.id,
              chapterId: nextChapter.id,
            }),
        },
      ]);
    } else if (nextChapter) {
      Alert.alert(
        "Preview complete",
        `Your progress has been saved. ${bookUpgradeMessage}`,
        [
          { text: "Stay here", style: "cancel" },
          {
            text: `See ${bookUpgradeLabel ?? "Plan"} plans`,
            onPress: () =>
              navigation.navigate("Subscription", {
                initialTab: bookUpgradeTab,
                sourceFeature: "library",
              }),
          },
        ],
      );
    } else {
      Alert.alert(
        "Book complete",
        "You completed this book. May Allah make it beneficial.",
      );
    }
  };

  const toggleCurrentBookmark = async () => {
    const next = await toggleBookmark(book.id, chapter.id);
    const match = { bookId: book.id, chapterId: chapter.id };
    if (next.bookmarks.includes(chapter.id)) {
      await upsertBookmark(
        {
          type: "library_chapter",
          title: `${book.title}: ${chapter.title}`,
          arabic: "",
          translation: chapter.subtitle,
          reference: chapter.sourceRefs
            .map((source) => source.reference)
            .join(" • "),
          metadata: {
            ...match,
            screen: "BookReader",
            category: book.category,
          },
        },
        match,
      );
    } else {
      await removeBookmarkByMetadata(match);
    }
    setProgress(next);
  };

  const playNarration = async () => {
    setNarrationMessage(null);
    if (!canUsePremiumNarration) {
      setNarrationMessage(
        "Premium unlocks chapter narration and offline playback.",
      );
      navigation.navigate("Subscription", {
        initialTab: "premium",
        sourceFeature: "library narration",
      });
      return;
    }
    if (!chapter.audioScript) {
      setNarrationMessage(
        "This chapter does not have a narration script yet. You can keep reading it here.",
      );
      return;
    }
    if (isActiveNarration && audioState === "playing") {
      if (deviceNarrationActive) {
        try {
          if (Platform.OS === "ios" || Platform.OS === "web") {
            await Speech.pause();
            setAudioState("paused");
          } else {
            await Speech.stop();
            setDeviceNarrationActive(false);
            setAudioState("idle");
            setAudioChapterId(null);
          }
        } catch {
          await Speech.stop().catch(() => {});
          setDeviceNarrationActive(false);
          setAudioState("idle");
          setAudioChapterId(null);
        }
      } else {
        pausePlayback();
      }
      return;
    }
    if (isActiveNarration && audioState === "paused") {
      if (deviceNarrationActive) {
        try {
          await Speech.resume();
          setAudioState("playing");
        } catch {
          await startDeviceNarration(
            "Your phone's built-in narration restarted from the beginning.",
          );
        }
      } else {
        resumePlayback();
      }
      return;
    }

    setAudioBusy(true);
    setAudioChapterId(narrationId);
    setDeviceNarrationActive(false);
    try {
      await Speech.stop().catch(() => {});
      stopPlayback();
      const uri = await getLibraryNarrationUri({
        id: narrationId,
        title: `${book.title} - ${chapter.title}`,
        text: chapter.audioScript,
        userTier: userPlan,
      });
      await loadAndPlay(uri);
    } catch (error: any) {
      if (isLibraryNarrationAuthorizationError(error)) {
        setNarrationMessage(
          "Premium unlocks chapter narration and offline playback.",
        );
        setAudioState("idle");
        setAudioChapterId(null);
        setDeviceNarrationActive(false);
        navigation.navigate("Subscription", {
          initialTab: "premium",
          sourceFeature: "library narration",
        });
        return;
      }
      const serverMessage = String(error?.message || "");
      await startDeviceNarration(
        serverMessage.toLowerCase().includes("limit")
          ? "Premium narration has reached today's limit, so this chapter is playing with your phone's built-in voice."
          : "Premium narration is unavailable right now, so this chapter is playing with your phone's built-in voice.",
      );
    } finally {
      setAudioBusy(false);
    }
  };

  const startDeviceNarration = async (message?: string) => {
    const script = chapter.audioScript;
    if (!script) {
      setNarrationMessage(
        "This chapter does not have a narration script yet. You can keep reading it here.",
      );
      return;
    }
    const speechChunks = splitDeviceNarrationText(script);

    await Speech.stop().catch(() => {});
    stopPlayback();
    setAudioChapterId(narrationId);
    setAudioState("playing");
    setDeviceNarrationActive(true);
    if (message || speechChunks.length > 1) {
      setNarrationMessage(
        [message, speechChunks.length > 1 ? DEVICE_NARRATION_CHUNK_COPY : null]
          .filter(Boolean)
          .join(" "),
      );
    }

    let chunkIndex = 0;
    const speakNextChunk = () => {
      const speechText = speechChunks[chunkIndex];
      if (!speechText) {
        setAudioState("idle");
        setAudioChapterId(null);
        setDeviceNarrationActive(false);
        return;
      }

      Speech.speak(speechText, {
        language: "en-GB",
        rate: 0.88,
        pitch: 0.96,
        useApplicationAudioSession: false,
        onStart: () => {
          setAudioChapterId(narrationId);
          setAudioState("playing");
          setDeviceNarrationActive(true);
        },
        onDone: () => {
          chunkIndex += 1;
          if (chunkIndex < speechChunks.length) {
            speakNextChunk();
            return;
          }
          setAudioState("idle");
          setAudioChapterId(null);
          setDeviceNarrationActive(false);
        },
        onStopped: () => {
          setAudioState("idle");
          setAudioChapterId(null);
          setDeviceNarrationActive(false);
        },
        onError: () => {
          setAudioState("idle");
          setAudioChapterId(null);
          setDeviceNarrationActive(false);
          setNarrationMessage(NARRATION_UNAVAILABLE_COPY);
        },
      });
    };

    speakNextChunk();
  };

  const downloadNarration = async () => {
    if (!chapter.audioScript) return;
    setNarrationMessage(null);
    if (!canUsePremiumNarration) {
      setNarrationMessage(
        "Premium unlocks offline chapter narration for study on the go.",
      );
      navigation.navigate("Subscription", {
        initialTab: "premium",
        sourceFeature: "library narration",
      });
      return;
    }
    setAudioBusy(true);
    try {
      if (narrationDownloaded) {
        await deleteLibraryNarrationDownload(narrationId);
        setNarrationDownloaded(false);
        setNarrationMessage("Offline narration was removed from this device.");
      } else {
        const uri = await downloadLibraryNarration({
          id: narrationId,
          title: `${book.title} - ${chapter.title}`,
          text: chapter.audioScript,
          userTier: userPlan,
        });
        setNarrationDownloaded(!!uri);
        setNarrationMessage(
          "This chapter narration is ready for offline playback.",
        );
      }
    } catch (error: any) {
      setNarrationMessage(customerNarrationErrorMessage(error));
    } finally {
      setAudioBusy(false);
    }
  };

  const goToChapter = (target?: Chapter) => {
    if (!target) return;
    setChapterDrawerVisible(false);
    navigation.replace("BookReader", {
      bookId: book.id,
      chapterId: target.id,
    });
  };

  const goToBookChapter = (targetBook: Book, targetChapterId?: string) => {
    const targetChapter =
      targetBook.chapters.find((item) => item.id === targetChapterId) ??
      targetBook.chapters[0];
    if (!targetChapter) return;
    if (!canAccessChapter(userPlan, targetBook, targetChapter.id)) {
      setChapterDrawerVisible(false);
      navigation.navigate("Subscription", {
        initialTab:
          targetBook.requiredPlan === "scholar" ? "scholar" : "premium",
        sourceFeature: "library reader",
      });
      return;
    }
    setChapterDrawerVisible(false);
    navigation.replace("BookReader", {
      bookId: targetBook.id,
      chapterId: targetChapter.id,
    });
  };

  const openNoteEditor = ({
    targetBook,
    targetChapter,
    note,
  }: {
    targetBook: Book;
    targetChapter?: Chapter;
    note: string;
  }) => {
    if (!targetChapter) return;
    setNoteEditorTarget({
      bookId: targetBook.id,
      chapterId: targetChapter.id,
      bookTitle: targetBook.title,
      chapterTitle: targetChapter.title,
    });
    setNoteEditorDraft(note);
  };

  const saveDrawerNote = async () => {
    if (!noteEditorTarget || noteEditorSaving) return;
    setNoteEditorSaving(true);
    try {
      const nextProgress = await saveReflection(
        noteEditorTarget.bookId,
        noteEditorTarget.chapterId,
        noteEditorDraft,
      );
      setProgressByBook((current) => ({
        ...current,
        [noteEditorTarget.bookId]: nextProgress,
      }));
      if (book.id === noteEditorTarget.bookId) {
        setProgress(nextProgress);
        if (chapter.id === noteEditorTarget.chapterId) {
          setReflection(noteEditorDraft);
        }
      }
      setNoteEditorTarget(null);
      setNoteEditorDraft("");
    } finally {
      setNoteEditorSaving(false);
    }
  };

  const shareReaderAnnotations = async (
    scope: "all" | "highlights" | "notes" = readerLibraryTab === "highlights"
      ? "highlights"
      : readerLibraryTab === "notes"
        ? "notes"
        : "all",
  ) => {
    if (!canUsePremiumReader) {
      setNarrationMessage("Premium unlocks reader annotation export.");
      navigation.navigate("Subscription", {
        initialTab: "premium",
        sourceFeature: "library annotation export",
      });
      return;
    }
    const includeHighlights = scope === "all" || scope === "highlights";
    const includeNotes = scope === "all" || scope === "notes";
    const lines = [
      "NurAI Reader Review",
      "Private reading notes and highlights. Not scholar-reviewed publication evidence.",
      "",
    ];
    if (includeHighlights) {
      lines.push(`Highlights (${highlightRows.length})`);
      if (highlightRows.length === 0) {
        lines.push("- None saved yet.");
      } else {
        highlightRows.forEach(({ book: sourceBook, highlight, chapter }) => {
          lines.push(
            `- ${sourceBook.title} / ${chapter?.title ?? "Chapter"} / ${highlight.sectionHeading}`,
          );
          lines.push(`  ${highlight.excerpt}`);
        });
      }
      lines.push("");
    }
    if (includeNotes) {
      lines.push(`Notes (${noteRows.length})`);
      if (noteRows.length === 0) {
        lines.push("- None saved yet.");
      } else {
        noteRows.forEach(({ book: sourceBook, chapter, note }) => {
          lines.push(`- ${sourceBook.title} / ${chapter?.title ?? "Chapter"}`);
          lines.push(`  ${note}`);
        });
      }
    }
    await Share.share({
      title: "NurAI Reader Review",
      message: lines.join("\n"),
    });
  };

  const previousChapter =
    book && chapterIndex > 0 ? book.chapters[chapterIndex - 1] : undefined;
  const readingStatusLabel = `${chapterIndex + 1} of ${book.chapters.length} chapters`;
  const completedChapterCount = progress?.completedChapters.length ?? 0;
  const totalEstimatedMinutes = book.chapters.reduce(
    (total, item) => total + item.estimatedMinutes,
    0,
  );
  const totalSourceCards = book.chapters.reduce(
    (total, item) => total + item.sourceRefs.length,
    0,
  );

  const updateReaderFontSize = (delta: number) => {
    setReaderFontSize((current) => Math.min(24, Math.max(16, current + delta)));
  };

  const requirePremiumReader = (feature: string): boolean => {
    if (canUsePremiumReader) return true;
    setNarrationMessage(`Premium unlocks ${feature} in the ebook reader.`);
    navigation.navigate("Subscription", {
      initialTab: "premium",
      sourceFeature: `library ${feature}`,
    });
    return false;
  };

  const updateReaderLineHeight = (delta: number) => {
    if (!requirePremiumReader("advanced reader spacing")) return;
    setReaderLineHeightScale((current) =>
      Math.min(1.95, Math.max(1.45, Number((current + delta).toFixed(2)))),
    );
  };

  const setPremiumReaderWidthMode = (mode: ReaderWidthMode) => {
    if (!requirePremiumReader("page width controls")) return;
    setReaderWidthMode(mode);
  };

  const toggleHighlight = async (section: Chapter["sections"][number]) => {
    if (!requirePremiumReader("highlights and margin notes")) return;
    const next = await toggleSectionHighlight(book.id, chapter.id, section);
    setProgress(next);
  };

  const handleReaderScroll = (event: {
    nativeEvent: {
      contentOffset: { y: number };
      contentSize: { height: number };
      layoutMeasurement: { height: number };
    };
  }) => {
    if (!book || !chapter) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    if (!reduceMotionForChrome) {
      const y = contentOffset.y;
      const delta = y - lastScrollYRef.current;
      lastScrollYRef.current = y;
      if (dockIdleTimerRef.current) clearTimeout(dockIdleTimerRef.current);
      if (y <= 12) {
        revealDock();
      } else if (delta > 4) {
        dockVisible.value = withTiming(0, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        });
      } else if (delta < -4) {
        revealDock();
      }
      dockIdleTimerRef.current = setTimeout(revealDock, 900);
    }

    const today = new Date().toISOString().slice(0, 10);
    if (gardenRecordedTodayRef.current !== today) {
      gardenRecordedTodayRef.current = today;
      recordGardenAction("learning").catch(() => {});
    }

    if (positionSaveTimerRef.current) {
      clearTimeout(positionSaveTimerRef.current);
    }
    positionSaveTimerRef.current = setTimeout(() => {
      saveReadingPosition(book.id, chapter.id, {
        scrollY: contentOffset.y,
        contentHeight: contentSize.height,
        viewportHeight: layoutMeasurement.height,
      })
        .then(setProgress)
        .catch(() => {});
    }, 650);
  };

  const jumpToSavedReadingPosition = () => {
    if (!activeReadingPosition) return;
    scrollRef.current?.scrollTo({
      y: activeReadingPosition.scrollY,
      animated: true,
    });
  };

  const jumpToChapterStart = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const openSource = async (url?: string | null) => {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const askAI = async (question?: string) => {
    setAIVisible(true);
    setAIState("loading");
    setAIData(null);
    setAIError(undefined);
    try {
      const response = await explainLibraryChapter({
        book,
        chapter,
        intent: "explain",
        question,
        userPlan,
      });
      setAIData(response);
      setAIState("success");
    } catch (error: any) {
      if (error?.code === "UPGRADE_REQUIRED") {
        setAIState("upgrade");
      } else if (error?.code === "RATE_LIMIT") {
        setAIState("rateLimit");
      } else {
        setAIError(
          customerSafeAIErrorMessage(
            error?.message || "Unable to explain this chapter right now.",
          ),
        );
        setAIState("error");
      }
    }
  };

  const askAIFollowUp = (prompt: string) => {
    askAI(prompt);
  };

  function SettingRow({
    title,
    value,
    locked,
    onDecrease,
    onIncrease,
  }: {
    title: string;
    value: string;
    locked: boolean;
    onDecrease: () => void;
    onIncrease: () => void;
  }) {
    return (
      <View style={styles.settingRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.settingTitleLine}>
            <ThemedText
              type="body"
              numberOfLines={1}
              style={{
                color: readerPalette.ink,
                fontFamily: "PlusJakartaSans_700Bold",
              }}
            >
              {title}
            </ThemedText>
            {locked ? (
              <View
                style={[
                  styles.settingLockPill,
                  { borderColor: `${theme.scholar}44` },
                ]}
              >
                <AppIcon name="lock" size={11} color={theme.scholar} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.scholar, fontWeight: "900" }}
                >
                  Premium
                </ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText type="caption" style={{ color: readerPalette.muted }}>
            {value}
          </ThemedText>
        </View>
        <View style={styles.settingStepper}>
          <Pressable
            onPress={onDecrease}
            style={[
              styles.settingStepButton,
              { borderColor: readerPalette.rule },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${title}`}
          >
            <AppIcon name="minus" size={15} color={readerPalette.ink} />
          </Pressable>
          <Pressable
            onPress={onIncrease}
            style={[
              styles.settingStepButton,
              { borderColor: readerPalette.rule },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${title}`}
          >
            <AppIcon name="plus" size={15} color={readerPalette.ink} />
          </Pressable>
        </View>
      </View>
    );
  }

  function ReaderDrawerEmptyState({
    icon,
    title,
    body,
  }: {
    icon: AppIconName;
    title: string;
    body: string;
  }) {
    return (
      <View
        style={[styles.readerDrawerEmpty, { borderColor: readerPalette.rule }]}
      >
        <View
          style={[
            styles.readerDrawerEmptyIcon,
            { backgroundColor: `${readerPalette.accent}16` },
          ]}
        >
          <AppIcon name={icon} size={20} color={readerPalette.accent} />
        </View>
        <ThemedText
          type="h4"
          numberOfLines={2}
          style={{ color: readerPalette.ink, textAlign: "center" }}
        >
          {title}
        </ThemedText>
        <ThemedText
          type="caption"
          style={{
            color: readerPalette.muted,
            textAlign: "center",
            lineHeight: 17,
          }}
        >
          {body}
        </ThemedText>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: readerPalette.background }]}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 190 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          onScroll={handleReaderScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.readerTopBar}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={[
                styles.iconButton,
                {
                  backgroundColor: readerPalette.panel,
                  borderColor: readerPalette.rule,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <AppIcon name="arrow-left" size={22} color={readerPalette.ink} />
            </Pressable>
            <View style={styles.readerTopCenter}>
              <ThemedText
                type="caption"
                style={[
                  styles.readerChapterCount,
                  { color: readerPalette.muted },
                ]}
              >
                CHAPTER {chapterIndex + 1} OF {book.chapters.length}
              </ThemedText>
              <View
                style={[
                  styles.readerProgressTrack,
                  { backgroundColor: readerPalette.rule },
                ]}
              >
                <View
                  style={[
                    styles.readerProgressFill,
                    {
                      backgroundColor: readerPalette.accent,
                      width: `${chapterProgress}%`,
                    },
                  ]}
                />
              </View>
            </View>
            <Pressable
              onPress={toggleCurrentBookmark}
              style={[
                styles.iconButton,
                {
                  backgroundColor: readerPalette.panel,
                  borderColor: isBookmarked
                    ? theme.scholar + "88"
                    : readerPalette.rule,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isBookmarked ? "Remove bookmark" : "Bookmark this chapter"
              }
            >
              <AppIcon
                name="bookmark"
                size={21}
                color={isBookmarked ? theme.scholar : readerPalette.ink}
              />
            </Pressable>
          </View>

          <View
            style={[
              styles.readerTools,
              {
                backgroundColor: readerPalette.panel,
                borderColor: readerPalette.rule,
              },
            ]}
          >
            <View style={styles.readerModeGroup}>
              <Pressable
                onPress={() => {
                  setReaderLibraryTab("chapters");
                  setChapterDrawerVisible(true);
                }}
                style={[
                  styles.readerModeChip,
                  {
                    backgroundColor: `${readerPalette.accent}14`,
                    borderColor: readerPalette.accent,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open chapter drawer"
                testID="button-open-chapter-drawer"
              >
                <AppIcon name="list" size={13} color={readerPalette.accent} />
                <ThemedText
                  type="caption"
                  style={{
                    color: readerPalette.accent,
                    fontFamily: "PlusJakartaSans_700Bold",
                  }}
                >
                  Chapters
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setImmersiveReading((current) => !current)}
                style={[
                  styles.readerModeChip,
                  {
                    backgroundColor: immersiveReading
                      ? `${readerPalette.accent}22`
                      : "transparent",
                    borderColor: immersiveReading
                      ? readerPalette.accent
                      : readerPalette.rule,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  immersiveReading
                    ? "Turn off focus reading"
                    : "Turn on focus reading"
                }
                testID="button-library-reader-focus-mode"
              >
                <AppIcon
                  name={immersiveReading ? "eye" : "eye-off"}
                  size={13}
                  color={
                    immersiveReading
                      ? readerPalette.accent
                      : readerPalette.muted
                  }
                />
                <ThemedText
                  type="caption"
                  style={{
                    color: immersiveReading
                      ? readerPalette.accent
                      : readerPalette.muted,
                    fontFamily: "PlusJakartaSans_700Bold",
                  }}
                >
                  Focus
                </ThemedText>
              </Pressable>
              {(["night", "sepia", "focus"] as ReaderMode[]).map((mode) => {
                const active = readerMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => setReaderMode(mode)}
                    style={[
                      styles.readerModeChip,
                      {
                        backgroundColor: active
                          ? `${readerPalette.accent}22`
                          : "transparent",
                        borderColor: active
                          ? readerPalette.accent
                          : readerPalette.rule,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${mode} reading mode`}
                  >
                    <ThemedText
                      type="caption"
                      style={{
                        color: active
                          ? readerPalette.accent
                          : readerPalette.muted,
                        textTransform: "capitalize",
                        fontFamily: "PlusJakartaSans_700Bold",
                      }}
                    >
                      {mode}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.fontControls}>
              <Pressable
                onPress={() => setReaderSettingsVisible(true)}
                style={[
                  styles.fontButton,
                  {
                    borderColor: canUsePremiumReader
                      ? readerPalette.accent
                      : readerPalette.rule,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open reader settings"
                testID="button-library-reader-settings"
              >
                <AppIcon
                  name="sliders"
                  size={16}
                  color={
                    canUsePremiumReader
                      ? readerPalette.accent
                      : readerPalette.ink
                  }
                />
              </Pressable>
              <Pressable
                onPress={() => updateReaderFontSize(-1)}
                style={[styles.fontButton, { borderColor: readerPalette.rule }]}
                accessibilityRole="button"
                accessibilityLabel="Decrease text size"
              >
                <ThemedText style={{ color: readerPalette.ink, fontSize: 14 }}>
                  A
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => updateReaderFontSize(1)}
                style={[styles.fontButton, { borderColor: readerPalette.rule }]}
                accessibilityRole="button"
                accessibilityLabel="Increase text size"
              >
                <ThemedText style={{ color: readerPalette.ink, fontSize: 19 }}>
                  A
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {!immersiveReading ? (
            <View
              style={[
                styles.readerExperienceCard,
                {
                  backgroundColor: readerPalette.panel,
                  borderColor: readerPalette.rule,
                },
              ]}
            >
              <GeometricCardPattern
                color={readerPalette.accent}
                opacity={readerMode === "night" ? 0.035 : 0.024}
              />
              {[
                {
                  icon: "book-open" as AppIconName,
                  label: "Book mode",
                  value: readerMode,
                },
                {
                  icon: "map" as AppIconName,
                  label: "Chapter",
                  value: `${chapterIndex + 1}/${book.chapters.length}`,
                },
                {
                  icon: "edit-3" as AppIconName,
                  label: "Private notes",
                  value: reflection.trim() ? "Saved draft" : "Ready",
                },
              ].map((item) => (
                <View key={item.label} style={styles.readerExperienceItem}>
                  <AppIcon
                    name={item.icon}
                    size={14}
                    color={readerPalette.accent}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: readerPalette.muted }}
                    numberOfLines={1}
                  >
                    {item.label}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={[
                      styles.readerExperienceValue,
                      { color: readerPalette.ink },
                    ]}
                    numberOfLines={1}
                  >
                    {item.value}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {!immersiveReading ? (
            <View
              style={[
                styles.audioCard,
                {
                  backgroundColor: readerPalette.panel,
                  borderColor: readerPalette.rule,
                },
              ]}
            >
              <View
                style={[
                  styles.audioIcon,
                  { backgroundColor: theme.scholarSoft },
                ]}
              >
                {audioBusy && isActiveNarration ? (
                  <ActivityIndicator size="small" color={theme.scholar} />
                ) : (
                  <AppIcon name="headphones" size={21} color={theme.scholar} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText
                  type="body"
                  style={{
                    color: readerPalette.ink,
                    fontFamily: "PlusJakartaSans_700Bold",
                  }}
                >
                  Chapter narration
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: readerPalette.muted }}
                  numberOfLines={2}
                >
                  {!canUsePremiumNarration
                    ? "Premium unlocks narrated study and offline playback."
                    : narrationDownloaded
                      ? "Downloaded for offline playback."
                      : "Listen while you read, or save audio for offline study."}
                </ThemedText>
              </View>
              <Pressable
                onPress={playNarration}
                style={[
                  styles.audioButton,
                  { borderColor: theme.scholar + "44" },
                ]}
                disabled={audioBusy}
              >
                <AppIcon
                  name={
                    !canUsePremiumNarration
                      ? "lock"
                      : isActiveNarration && audioState === "playing"
                        ? "pause"
                        : "play"
                  }
                  size={16}
                  color={theme.scholar}
                />
              </Pressable>
              <Pressable
                onPress={downloadNarration}
                style={[
                  styles.audioButton,
                  { borderColor: theme.primaryBorder },
                ]}
                disabled={audioBusy}
              >
                <AppIcon
                  name={
                    !canUsePremiumNarration
                      ? "lock"
                      : narrationDownloaded
                        ? "check"
                        : "download"
                  }
                  size={16}
                  color={
                    !canUsePremiumNarration || narrationDownloaded
                      ? theme.primary
                      : readerPalette.ink
                  }
                />
              </Pressable>
            </View>
          ) : null}

          {narrationMessage ? (
            <View
              style={[
                styles.readerNotice,
                {
                  backgroundColor: `${readerPalette.accent}14`,
                  borderColor: `${readerPalette.accent}44`,
                },
              ]}
            >
              <AppIcon name="info" size={16} color={readerPalette.accent} />
              <ThemedText
                type="caption"
                style={[
                  styles.readerNoticeText,
                  { color: readerPalette.muted },
                ]}
              >
                {narrationMessage}
              </ThemedText>
              <Pressable
                onPress={() => setNarrationMessage(null)}
                accessibilityRole="button"
                accessibilityLabel="Dismiss narration message"
              >
                <AppIcon name="x" size={16} color={readerPalette.muted} />
              </Pressable>
            </View>
          ) : null}

          <View
            style={[
              styles.readingPage,
              {
                backgroundColor: readerPalette.surface,
                borderColor: readerPalette.rule,
                paddingHorizontal:
                  readerWidthMode === "wide" ? Spacing.lg : Spacing.xl,
              },
            ]}
          >
            <GeometricCardPattern
              color={readerPalette.accent}
              opacity={readerMode === "night" ? 0.045 : 0.03}
              style={styles.readerPagePattern}
            />
            <View style={styles.bookMetaRow}>
              <ThemedText
                type="caption"
                style={[styles.eyebrow, { color: readerPalette.accent }]}
              >
                {book.title.toUpperCase()}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{
                  color: readerPalette.muted,
                  fontFamily: "PlusJakartaSans_700Bold",
                }}
              >
                {chapter.estimatedMinutes} MIN
              </ThemedText>
            </View>
            <View style={styles.readerBookStatusRow}>
              <View
                style={[
                  styles.readerBookStatusPill,
                  { borderColor: readerPalette.rule },
                ]}
              >
                <AppIcon name="book" size={12} color={readerPalette.accent} />
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: readerPalette.muted }}
                >
                  {readingStatusLabel}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.readerBookStatusPill,
                  { borderColor: readerPalette.rule },
                ]}
              >
                <AppIcon
                  name="check-circle"
                  size={12}
                  color={readerPalette.accent}
                />
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: readerPalette.muted }}
                >
                  {completedChapterCount} complete
                </ThemedText>
              </View>
              <View
                style={[
                  styles.readerBookStatusPill,
                  { borderColor: readerPalette.rule },
                ]}
              >
                <AppIcon
                  name="map-pin"
                  size={12}
                  color={readerPalette.accent}
                />
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: readerPalette.muted }}
                >
                  {activeReadingPosition
                    ? `${activeReadingPosition.progressPercentage}% through chapter`
                    : "Position ready"}
                </ThemedText>
              </View>
            </View>
            {hasSavedReadingPosition ? (
              <View
                style={[
                  styles.readerResumeCard,
                  {
                    backgroundColor: `${readerPalette.accent}10`,
                    borderColor: `${readerPalette.accent}36`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.readerResumeIcon,
                    { backgroundColor: `${readerPalette.accent}18` },
                  ]}
                >
                  <AppIcon
                    name="map-pin"
                    size={18}
                    color={readerPalette.accent}
                  />
                </View>
                <View style={styles.readerResumeCopy}>
                  <ThemedText
                    type="caption"
                    style={{
                      color: readerPalette.accent,
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                    }}
                  >
                    SAVED PLACE
                  </ThemedText>
                  <ThemedText
                    type="body"
                    numberOfLines={1}
                    style={{
                      color: readerPalette.ink,
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                    }}
                  >
                    {savedReadingPositionLabel}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: readerPalette.muted }}
                  >
                    {savedReadingPositionDateLabel}
                  </ThemedText>
                </View>
                <View style={styles.readerResumeActions}>
                  <Pressable
                    onPress={jumpToSavedReadingPosition}
                    style={[
                      styles.readerResumeButton,
                      {
                        backgroundColor: readerPalette.accent,
                        borderColor: readerPalette.accent,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Resume at ${savedReadingPositionLabel}`}
                    testID="button-library-reader-resume-position"
                  >
                    <AppIcon
                      name="corner-down-right"
                      size={14}
                      color="#06141F"
                    />
                    <ThemedText
                      type="caption"
                      style={{ color: "#06141F", fontWeight: "900" }}
                    >
                      Resume
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={jumpToChapterStart}
                    style={[
                      styles.readerResumeButton,
                      styles.readerResumeSecondaryButton,
                      { borderColor: readerPalette.rule },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Go to the beginning of this chapter"
                    testID="button-library-reader-chapter-start"
                  >
                    <AppIcon
                      name="arrow-up"
                      size={14}
                      color={readerPalette.ink}
                    />
                  </Pressable>
                </View>
              </View>
            ) : null}
            <ThemedText
              style={[
                styles.readerTitle,
                {
                  color: readerPalette.ink,
                  fontSize: Math.max(34, readerFontSize + 17),
                },
              ]}
            >
              {chapter.title}
            </ThemedText>
            <ThemedText
              style={[
                styles.readerSubtitle,
                { color: readerPalette.muted, fontSize: readerFontSize },
              ]}
            >
              {chapter.subtitle}
            </ThemedText>
            <ThemedText
              style={[
                styles.readerByline,
                { color: readerPalette.muted, fontSize: readerFontSize - 2 },
              ]}
            >
              Created by {book.authorName}
            </ThemedText>
            <View style={styles.readerOpeningMark}>
              <View
                style={[
                  styles.readerOpeningLine,
                  { backgroundColor: readerPalette.rule },
                ]}
              />
              <GoldDivider
                color={readerPalette.accent}
                opacity={0.5}
                style={styles.readerOpeningDivider}
              />
              <View
                style={[
                  styles.readerOpeningLine,
                  { backgroundColor: readerPalette.rule },
                ]}
              />
            </View>
            <View
              style={[
                styles.readerDivider,
                { backgroundColor: readerPalette.rule },
              ]}
            />

            {chapter.sections.map((section, index) => {
              const highlightId = `${chapter.id}:${section.heading}`;
              const highlighted = highlightedSectionIds.has(highlightId);
              return (
                <View
                  key={`${section.heading}-${index}`}
                  style={[
                    styles.readerSection,
                    highlighted
                      ? {
                          backgroundColor: `${readerPalette.accent}0F`,
                          borderColor: `${readerPalette.accent}24`,
                        }
                      : null,
                    index === 0 ? styles.readerFirstSection : null,
                  ]}
                >
                  <View style={styles.readerSectionToolbar}>
                    <ThemedText
                      type="caption"
                      style={[
                        styles.sectionType,
                        {
                          color:
                            section.type === "action"
                              ? theme.primary
                              : readerPalette.accent,
                        },
                      ]}
                    >
                      {section.type.toUpperCase()}
                    </ThemedText>
                    <Pressable
                      onPress={() => toggleHighlight(section)}
                      style={[
                        styles.highlightButton,
                        {
                          borderColor: highlighted
                            ? readerPalette.accent
                            : readerPalette.rule,
                          backgroundColor: highlighted
                            ? `${readerPalette.accent}18`
                            : "transparent",
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        highlighted
                          ? `Remove highlight for ${section.heading}`
                          : `Highlight ${section.heading}`
                      }
                    >
                      <AppIcon
                        name={
                          !canUsePremiumReader
                            ? "lock"
                            : highlighted
                              ? "star"
                              : "star"
                        }
                        size={13}
                        color={
                          highlighted || canUsePremiumReader
                            ? readerPalette.accent
                            : readerPalette.muted
                        }
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color:
                            highlighted || canUsePremiumReader
                              ? readerPalette.accent
                              : readerPalette.muted,
                          fontWeight: "900",
                        }}
                      >
                        {highlighted ? "Saved" : "Highlight"}
                      </ThemedText>
                    </Pressable>
                  </View>
                  <ThemedText
                    style={[
                      styles.readerSectionHeading,
                      { color: readerPalette.ink },
                    ]}
                  >
                    {section.heading}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.readerParagraph,
                      {
                        color: readerPalette.ink,
                        fontSize: readerFontSize,
                        lineHeight: Math.round(
                          readerFontSize * readerLineHeightScale,
                        ),
                      },
                    ]}
                  >
                    {section.body}
                  </ThemedText>
                </View>
              );
            })}

            <View
              style={[
                styles.readerDivider,
                { backgroundColor: readerPalette.rule },
              ]}
            />
            <View style={styles.readerPageFooter}>
              <ThemedText type="caption" style={{ color: readerPalette.muted }}>
                NurAI Library
              </ThemedText>
              <View
                style={[
                  styles.readerFooterDot,
                  { backgroundColor: readerPalette.accent },
                ]}
              />
              <ThemedText type="caption" style={{ color: readerPalette.muted }}>
                Page {chapterIndex + 1}
              </ThemedText>
            </View>
            <View style={styles.chapterNav}>
              <Pressable
                onPress={() => goToChapter(previousChapter)}
                disabled={!previousChapter}
                style={[
                  styles.chapterNavButton,
                  {
                    opacity: previousChapter ? 1 : 0.4,
                    borderColor: readerPalette.rule,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Previous chapter"
              >
                <AppIcon
                  name="chevron-left"
                  size={16}
                  color={readerPalette.ink}
                />
                <ThemedText type="caption" style={{ color: readerPalette.ink }}>
                  Previous
                </ThemedText>
              </Pressable>
              <ThemedText
                type="caption"
                style={{ color: readerPalette.muted, textAlign: "center" }}
              >
                {chapterProgress}% read
              </ThemedText>
              <Pressable
                onPress={() => goToChapter(nextChapter)}
                disabled={
                  !nextChapter ||
                  !canAccessChapter(userPlan, book, nextChapter.id)
                }
                style={[
                  styles.chapterNavButton,
                  {
                    opacity:
                      nextChapter &&
                      canAccessChapter(userPlan, book, nextChapter.id)
                        ? 1
                        : 0.4,
                    borderColor: readerPalette.rule,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Next chapter"
              >
                <ThemedText type="caption" style={{ color: readerPalette.ink }}>
                  Next
                </ThemedText>
                <AppIcon
                  name="chevron-right"
                  size={16}
                  color={readerPalette.ink}
                />
              </Pressable>
            </View>
          </View>

          {!immersiveReading ? (
            <>
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: readerPalette.panel,
                    borderColor: theme.primaryBorder,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={[styles.sectionType, { color: theme.primary }]}
                >
                  REFLECT
                </ThemedText>
                <ThemedText type="h3">
                  {chapter.reflectionQuestions[0] ??
                    createLocalReflectionPrompt(book, chapter)}
                </ThemedText>
                <TextInput
                  value={reflection}
                  onChangeText={setReflection}
                  placeholder="Write a private reflection"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  textAlignVertical="top"
                  style={[
                    styles.reflectionInput,
                    {
                      color: theme.text,
                      borderColor: theme.inputBorder,
                      backgroundColor: theme.input,
                    },
                  ]}
                />
                <Pressable
                  onPress={saveCurrentReflection}
                  style={[
                    styles.secondaryButton,
                    { borderColor: theme.primaryBorder },
                  ]}
                >
                  <AppIcon name="save" size={16} color={theme.primary} />
                  <ThemedText type="body" style={{ color: theme.primary }}>
                    Save reflection
                  </ThemedText>
                </Pressable>
              </View>

              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={[styles.sectionType, { color: theme.scholar }]}
                >
                  REVIEW
                </ThemedText>
                {chapter.quiz.map((question, index) => {
                  const key = `${chapter.id}-${index}`;
                  const selected = selectedAnswers[key];
                  return (
                    <View key={key} style={styles.quizBlock}>
                      <ThemedText
                        type="body"
                        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                      >
                        {question.question}
                      </ThemedText>
                      {question.options.map((option) => {
                        const isSelected = selected === option;
                        const isCorrect =
                          isSelected && option === question.correctAnswer;
                        return (
                          <Pressable
                            key={option}
                            onPress={() =>
                              setSelectedAnswers((prev) => ({
                                ...prev,
                                [key]: option,
                              }))
                            }
                            style={[
                              styles.option,
                              {
                                backgroundColor: isSelected
                                  ? isCorrect
                                    ? theme.primarySubtle
                                    : `${theme.error}18`
                                  : theme.surfaceElevated,
                                borderColor: isSelected
                                  ? isCorrect
                                    ? theme.primary
                                    : theme.error
                                  : theme.border,
                              },
                            ]}
                          >
                            <ThemedText type="small">{option}</ThemedText>
                          </Pressable>
                        );
                      })}
                      {selected ? (
                        <ThemedText
                          type="caption"
                          style={{
                            color:
                              selected === question.correctAnswer
                                ? theme.primary
                                : theme.textSecondary,
                          }}
                        >
                          {question.explanation}
                        </ThemedText>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.scholar + "44",
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={[styles.sectionType, { color: theme.scholar }]}
                >
                  VERIFIED SOURCE CARDS
                </ThemedText>
                {chapter.sourceRefs.map((source) => (
                  <Pressable
                    key={source.id}
                    style={styles.sourceRow}
                    onPress={() => openSource(source.url)}
                  >
                    <AppIcon
                      name={source.verified ? "check-circle" : "alert-circle"}
                      size={16}
                      color={source.verified ? theme.primary : theme.scholar}
                    />
                    <ThemedText
                      type="caption"
                      style={{ flex: 1, color: theme.textSecondary }}
                    >
                      {source.reference}: {source.note}
                    </ThemedText>
                    {source.url ? (
                      <AppIcon
                        name="external-link"
                        size={14}
                        color={theme.textMuted}
                      />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <View style={styles.buttonRow}>
            <Pressable
              onPress={() => askAI()}
              style={[
                styles.secondaryButton,
                styles.flexButton,
                { borderColor: theme.primaryBorder },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Ask the Library Tutor about this chapter"
            >
              <AppIcon name="message-circle" size={16} color={theme.primary} />
              <ThemedText type="body" style={{ color: theme.primary }}>
                Ask Library Tutor
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={completeChapter}
              style={[
                styles.primaryButton,
                styles.flexButton,
                { backgroundColor: theme.primary },
              ]}
            >
              <AppIcon
                name="check-circle"
                size={16}
                color={theme.primaryForeground}
              />
              <ThemedText
                type="body"
                style={{ color: theme.primaryForeground }}
              >
                Complete
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Animated.View
        style={[
          styles.readerDock,
          {
            backgroundColor: readerPalette.panel,
            borderColor: readerPalette.rule,
            bottom: Spacing.lg + insets.bottom,
          },
          dockChromeStyle,
        ]}
        testID="library-reader-bottom-dock"
      >
        <Pressable
          onPress={() => {
            setReaderLibraryTab("chapters");
            setChapterDrawerVisible(true);
          }}
          style={styles.readerDockButton}
          accessibilityRole="button"
          accessibilityLabel="Open table of contents"
        >
          <AppIcon name="list" size={18} color={readerPalette.ink} />
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={{ color: readerPalette.muted }}
          >
            Contents
          </ThemedText>
        </Pressable>
        {hasSavedReadingPosition ? (
          <Pressable
            onPress={jumpToSavedReadingPosition}
            style={styles.readerDockButton}
            accessibilityRole="button"
            accessibilityLabel={`Resume at ${savedReadingPositionLabel}`}
            testID="button-library-reader-dock-resume"
          >
            <AppIcon name="map-pin" size={18} color={readerPalette.accent} />
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{ color: readerPalette.muted }}
            >
              Place
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={playNarration}
          style={[
            styles.readerDockPrimary,
            { backgroundColor: `${readerPalette.accent}1F` },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Play or pause chapter narration"
          disabled={audioBusy}
        >
          {audioBusy && isActiveNarration ? (
            <ActivityIndicator size="small" color={readerPalette.accent} />
          ) : (
            <AppIcon
              name={
                !canUsePremiumNarration
                  ? "lock"
                  : isActiveNarration && audioState === "playing"
                    ? "pause"
                    : "play"
              }
              size={18}
              color={readerPalette.accent}
            />
          )}
        </Pressable>
        <Pressable
          onPress={toggleCurrentBookmark}
          style={styles.readerDockButton}
          accessibilityRole="button"
          accessibilityLabel={
            isBookmarked ? "Remove bookmark" : "Bookmark this chapter"
          }
        >
          <AppIcon
            name="bookmark"
            size={18}
            color={isBookmarked ? theme.scholar : readerPalette.ink}
          />
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={{
              color: isBookmarked ? theme.scholar : readerPalette.muted,
            }}
          >
            Save
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={completeChapter}
          style={styles.readerDockButton}
          accessibilityRole="button"
          accessibilityLabel="Mark chapter complete"
        >
          <AppIcon name="check" size={18} color={readerPalette.accent} />
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={{ color: readerPalette.muted }}
          >
            Done
          </ThemedText>
        </Pressable>
      </Animated.View>
      <Modal
        visible={chapterDrawerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setChapterDrawerVisible(false)}
        testID="modal-library-chapter-drawer"
      >
        <Pressable
          style={styles.drawerOverlay}
          onPress={() => setChapterDrawerVisible(false)}
        >
          <Pressable
            style={[
              styles.chapterDrawer,
              {
                backgroundColor: readerPalette.panel,
                borderColor: readerPalette.rule,
              },
            ]}
            onPress={() => {}}
          >
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText type="h3" style={{ color: readerPalette.ink }}>
                  Reader Library
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: readerPalette.muted, marginTop: 2 }}
                >
                  {book.title} · {savedBookRows.length} saved ·{" "}
                  {highlightRows.length} highlights
                </ThemedText>
              </View>
              {readerLibraryTab === "highlights" ||
              readerLibraryTab === "notes" ? (
                <Pressable
                  onPress={() => shareReaderAnnotations("all")}
                  disabled={highlightRows.length === 0 && noteRows.length === 0}
                  style={[
                    styles.drawerExportButton,
                    {
                      borderColor: readerPalette.rule,
                      opacity:
                        highlightRows.length === 0 && noteRows.length === 0
                          ? 0.45
                          : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Export ${readerLibraryTab}`}
                >
                  <AppIcon
                    name="share-2"
                    size={15}
                    color={readerPalette.accent}
                  />
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: readerPalette.accent, fontWeight: "900" }}
                  >
                    Export
                  </ThemedText>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setChapterDrawerVisible(false)}
                style={[
                  styles.drawerCloseButton,
                  { borderColor: readerPalette.rule },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close chapter drawer"
              >
                <AppIcon name="x" size={18} color={readerPalette.ink} />
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.readerLibraryTabRail}
            >
              {readerLibraryTabs.map((tab) => {
                const active = readerLibraryTab === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setReaderLibraryTab(tab.id)}
                    style={[
                      styles.readerLibraryTab,
                      {
                        backgroundColor: active
                          ? `${readerPalette.accent}18`
                          : "transparent",
                        borderColor: active
                          ? readerPalette.accent
                          : readerPalette.rule,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Show ${tab.label}, ${tab.count}`}
                    testID={`button-reader-library-tab-${tab.id}`}
                  >
                    <AppIcon
                      name={tab.icon}
                      size={13}
                      color={
                        active ? readerPalette.accent : readerPalette.muted
                      }
                    />
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{
                        color: active
                          ? readerPalette.accent
                          : readerPalette.muted,
                        fontWeight: "900",
                      }}
                    >
                      {tab.label}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{
                        color: active
                          ? readerPalette.accent
                          : readerPalette.muted,
                      }}
                    >
                      {tab.count}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
            {readerLibraryTab === "chapters" ? (
              <>
                <View style={styles.tocSummaryGrid}>
                  <View
                    style={[
                      styles.tocSummaryTile,
                      { borderColor: readerPalette.rule },
                    ]}
                  >
                    <ThemedText
                      type="h4"
                      numberOfLines={1}
                      style={{ color: readerPalette.accent }}
                    >
                      {book.chapters.length}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: readerPalette.muted }}
                    >
                      chapters
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.tocSummaryTile,
                      { borderColor: readerPalette.rule },
                    ]}
                  >
                    <ThemedText
                      type="h4"
                      numberOfLines={1}
                      style={{ color: readerPalette.accent }}
                    >
                      {completedChapterCount}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: readerPalette.muted }}
                    >
                      complete
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.tocSummaryTile,
                      { borderColor: readerPalette.rule },
                    ]}
                  >
                    <ThemedText
                      type="h4"
                      numberOfLines={1}
                      style={{ color: readerPalette.accent }}
                    >
                      {totalEstimatedMinutes}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: readerPalette.muted }}
                    >
                      minutes
                    </ThemedText>
                  </View>
                </View>
                <View
                  style={[
                    styles.tocBookProgressCard,
                    { borderColor: readerPalette.rule },
                  ]}
                >
                  <View style={styles.tocBookProgressTop}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{
                          color: readerPalette.accent,
                          fontWeight: "900",
                        }}
                      >
                        READING PROGRESS
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: readerPalette.muted }}
                      >
                        {progress?.progressPercentage ?? 0}% of book ·{" "}
                        {totalSourceCards} source cards
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="h4"
                      numberOfLines={1}
                      style={{ color: readerPalette.ink }}
                    >
                      {progress?.progressPercentage ?? 0}%
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.tocProgressTrack,
                      { backgroundColor: readerPalette.rule },
                    ]}
                  >
                    <View
                      style={[
                        styles.tocProgressFill,
                        {
                          width: `${progress?.progressPercentage ?? 0}%`,
                          backgroundColor: readerPalette.accent,
                        },
                      ]}
                    />
                  </View>
                </View>
                <ScrollView
                  style={styles.chapterDrawerList}
                  showsVerticalScrollIndicator={false}
                >
                  {book.chapters.map((item, index) => {
                    const active = item.id === chapter.id;
                    const complete = !!progress?.completedChapters.includes(
                      item.id,
                    );
                    const marked = !!progress?.bookmarks.includes(item.id);
                    const hasNote = !!progress?.reflections[item.id];
                    const locked = !canAccessChapter(userPlan, book, item.id);
                    const chapterStatusLabel = locked
                      ? "Locked"
                      : complete
                        ? "100%"
                        : active
                          ? "Reading now"
                          : "0%";
                    const chapterStatusColor = locked
                      ? theme.scholar
                      : complete
                        ? theme.primary
                        : active
                          ? readerPalette.accent
                          : readerPalette.muted;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          if (locked) {
                            setChapterDrawerVisible(false);
                            navigation.navigate("Subscription", {
                              initialTab: bookUpgradeTab,
                              sourceFeature: "library",
                            });
                            return;
                          }
                          goToChapter(item);
                        }}
                        style={[
                          styles.chapterDrawerRow,
                          {
                            backgroundColor: active
                              ? `${readerPalette.accent}18`
                              : "transparent",
                            borderColor: active
                              ? `${readerPalette.accent}55`
                              : readerPalette.rule,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Open chapter ${index + 1}, ${item.title}. ${chapterStatusLabel}. ${item.estimatedMinutes} minutes. ${item.sections.length} sections. ${item.sourceRefs.length} source cards.`}
                      >
                        <View
                          style={[
                            styles.chapterDrawerNumber,
                            {
                              backgroundColor: active
                                ? readerPalette.accent
                                : `${readerPalette.accent}16`,
                            },
                          ]}
                        >
                          <ThemedText
                            type="caption"
                            style={{
                              color: active
                                ? readerPalette.background
                                : readerPalette.accent,
                              fontWeight: "800",
                            }}
                          >
                            {index + 1}
                          </ThemedText>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={styles.chapterDrawerTitleLine}>
                            <ThemedText
                              type="body"
                              numberOfLines={1}
                              style={{
                                color: readerPalette.ink,
                                fontFamily: "PlusJakartaSans_700Bold",
                                flex: 1,
                              }}
                            >
                              {item.title}
                            </ThemedText>
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{
                                color: chapterStatusColor,
                                fontWeight: "900",
                              }}
                            >
                              {chapterStatusLabel}
                            </ThemedText>
                          </View>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{
                              color: readerPalette.muted,
                              marginTop: 2,
                            }}
                          >
                            {item.subtitle}
                          </ThemedText>
                          <View style={styles.chapterDrawerMetaRow}>
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{ color: readerPalette.muted, flex: 1 }}
                            >
                              {item.estimatedMinutes} min ·{" "}
                              {item.sections.length} sections ·{" "}
                              {item.sourceRefs.length} sources
                            </ThemedText>
                            {complete ? (
                              <AppIcon
                                name="check-circle"
                                size={13}
                                color={theme.primary}
                              />
                            ) : null}
                            {marked ? (
                              <AppIcon
                                name="bookmark"
                                size={13}
                                color={theme.scholar}
                              />
                            ) : null}
                            {hasNote ? (
                              <AppIcon
                                name="edit-3"
                                size={13}
                                color={readerPalette.accent}
                              />
                            ) : null}
                            {locked ? (
                              <AppIcon
                                name="lock"
                                size={13}
                                color={theme.scholar}
                              />
                            ) : null}
                          </View>
                          <View
                            style={[
                              styles.chapterDrawerProgressTrack,
                              { backgroundColor: readerPalette.rule },
                            ]}
                          >
                            <View
                              style={[
                                styles.chapterDrawerProgressFill,
                                {
                                  width: complete
                                    ? "100%"
                                    : active
                                      ? "42%"
                                      : "0%",
                                  backgroundColor: chapterStatusColor,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : readerLibraryTab === "saved" ? (
              <ScrollView
                style={styles.chapterDrawerList}
                showsVerticalScrollIndicator={false}
              >
                {savedBookRows.length > 0 ? (
                  savedBookRows.map(({ book: savedBook, entry }) => {
                    const savedProgress = progressByBook[savedBook.id];
                    return (
                      <Pressable
                        key={savedBook.id}
                        onPress={() =>
                          goToBookChapter(
                            savedBook,
                            savedProgress?.currentChapterId,
                          )
                        }
                        style={[
                          styles.readerLibraryRow,
                          { borderColor: readerPalette.rule },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Open saved book ${savedBook.title}`}
                      >
                        <View
                          style={[
                            styles.readerLibraryRowIcon,
                            { backgroundColor: `${readerPalette.accent}16` },
                          ]}
                        >
                          <AppIcon
                            name="download-cloud"
                            size={16}
                            color={readerPalette.accent}
                          />
                        </View>
                        <View style={styles.readerLibraryRowCopy}>
                          <View style={styles.chapterDrawerTitleLine}>
                            <ThemedText
                              type="body"
                              numberOfLines={1}
                              style={{
                                color: readerPalette.ink,
                                fontFamily: "PlusJakartaSans_700Bold",
                                flex: 1,
                              }}
                            >
                              {savedBook.title}
                            </ThemedText>
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{
                                color: readerPalette.accent,
                                fontWeight: "900",
                              }}
                            >
                              Saved
                            </ThemedText>
                          </View>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{
                              color: readerPalette.muted,
                              lineHeight: 17,
                            }}
                          >
                            {entry.chapterCount} chapters ·{" "}
                            {savedProgress?.progressPercentage ?? 0}% read ·{" "}
                            {savedBook.category}
                          </ThemedText>
                        </View>
                        <AppIcon
                          name="chevron-right"
                          size={17}
                          color={readerPalette.muted}
                        />
                      </Pressable>
                    );
                  })
                ) : (
                  <ReaderDrawerEmptyState
                    icon="download-cloud"
                    title="No saved books yet"
                    body="Save a book from its title page to build your offline reader shelf."
                  />
                )}
              </ScrollView>
            ) : readerLibraryTab === "continue" ? (
              <ScrollView
                style={styles.chapterDrawerList}
                showsVerticalScrollIndicator={false}
              >
                {continueBookRows.length > 0 ? (
                  continueBookRows.map(({ book: activeBook, progress }) => (
                    <Pressable
                      key={activeBook.id}
                      onPress={() =>
                        goToBookChapter(activeBook, progress.currentChapterId)
                      }
                      style={[
                        styles.readerLibraryRow,
                        { borderColor: readerPalette.rule },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Continue ${activeBook.title}, ${progress.progressPercentage}% read`}
                    >
                      <View
                        style={[
                          styles.readerLibraryRowIcon,
                          { backgroundColor: `${readerPalette.accent}16` },
                        ]}
                      >
                        <AppIcon
                          name="play-circle"
                          size={16}
                          color={readerPalette.accent}
                        />
                      </View>
                      <View style={styles.readerLibraryRowCopy}>
                        <View style={styles.chapterDrawerTitleLine}>
                          <ThemedText
                            type="body"
                            numberOfLines={1}
                            style={{
                              color: readerPalette.ink,
                              fontFamily: "PlusJakartaSans_700Bold",
                              flex: 1,
                            }}
                          >
                            {activeBook.title}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{
                              color: readerPalette.accent,
                              fontWeight: "900",
                            }}
                          >
                            {progress.progressPercentage}%
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{ color: readerPalette.muted, lineHeight: 17 }}
                        >
                          {progress.currentChapterId
                            ? (activeBook.chapters.find(
                                (item) => item.id === progress.currentChapterId,
                              )?.title ?? "Continue reading")
                            : "Continue reading"}
                        </ThemedText>
                      </View>
                      <AppIcon
                        name="chevron-right"
                        size={17}
                        color={readerPalette.muted}
                      />
                    </Pressable>
                  ))
                ) : (
                  <ReaderDrawerEmptyState
                    icon="play-circle"
                    title="No active books yet"
                    body="Start any book and it will appear here for quick reader switching."
                  />
                )}
              </ScrollView>
            ) : readerLibraryTab === "highlights" ? (
              <ScrollView
                style={styles.chapterDrawerList}
                showsVerticalScrollIndicator={false}
              >
                {highlightRows.length > 0 ? (
                  highlightRows.map(
                    ({ book: sourceBook, highlight, chapter }) => (
                      <Pressable
                        key={highlight.id}
                        onPress={() =>
                          goToBookChapter(sourceBook, highlight.chapterId)
                        }
                        style={[
                          styles.readerLibraryRow,
                          { borderColor: readerPalette.rule },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Open highlight from ${sourceBook.title}`}
                      >
                        <View
                          style={[
                            styles.readerLibraryRowIcon,
                            { backgroundColor: `${theme.scholar}18` },
                          ]}
                        >
                          <AppIcon
                            name="star"
                            size={16}
                            color={theme.scholar}
                          />
                        </View>
                        <View style={styles.readerLibraryRowCopy}>
                          <View style={styles.chapterDrawerTitleLine}>
                            <ThemedText
                              type="body"
                              numberOfLines={1}
                              style={{
                                color: readerPalette.ink,
                                fontFamily: "PlusJakartaSans_700Bold",
                                flex: 1,
                              }}
                            >
                              {highlight.sectionHeading}
                            </ThemedText>
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{
                                color: theme.scholar,
                                fontWeight: "900",
                              }}
                            >
                              Highlight
                            </ThemedText>
                          </View>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{
                              color: readerPalette.muted,
                              lineHeight: 17,
                            }}
                          >
                            {sourceBook.title} · {chapter?.title}
                          </ThemedText>
                          <View style={styles.annotationMetaLine}>
                            <View
                              style={[
                                styles.annotationMetaPill,
                                { borderColor: `${theme.scholar}34` },
                              ]}
                            >
                              <AppIcon
                                name="clock"
                                size={10}
                                color={theme.scholar}
                              />
                              <ThemedText
                                type="caption"
                                numberOfLines={1}
                                style={{
                                  color: theme.scholar,
                                  fontWeight: "900",
                                }}
                              >
                                {formatAnnotationDate(highlight.createdAt)}
                              </ThemedText>
                            </View>
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{ color: readerPalette.muted, flex: 1 }}
                            >
                              Tap to open this passage
                            </ThemedText>
                          </View>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{
                              color: readerPalette.muted,
                              lineHeight: 17,
                            }}
                          >
                            {highlight.excerpt}
                          </ThemedText>
                        </View>
                      </Pressable>
                    ),
                  )
                ) : (
                  <ReaderDrawerEmptyState
                    icon="star"
                    title="No highlights yet"
                    body="Premium highlights you save in the reader will collect here."
                  />
                )}
              </ScrollView>
            ) : (
              <ScrollView
                style={styles.chapterDrawerList}
                showsVerticalScrollIndicator={false}
              >
                {noteRows.length > 0 ? (
                  noteRows.map(({ book: sourceBook, chapter, note }) => (
                    <View
                      key={`${sourceBook.id}-${chapter?.id}`}
                      style={[
                        styles.readerLibraryRow,
                        { borderColor: readerPalette.rule },
                      ]}
                    >
                      <View
                        style={[
                          styles.readerLibraryRowIcon,
                          { backgroundColor: `${readerPalette.accent}16` },
                        ]}
                      >
                        <AppIcon
                          name="edit-3"
                          size={16}
                          color={readerPalette.accent}
                        />
                      </View>
                      <View style={styles.readerLibraryRowCopy}>
                        <View style={styles.chapterDrawerTitleLine}>
                          <ThemedText
                            type="body"
                            numberOfLines={1}
                            style={{
                              color: readerPalette.ink,
                              fontFamily: "PlusJakartaSans_700Bold",
                              flex: 1,
                            }}
                          >
                            {chapter?.title ?? sourceBook.title}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{
                              color: readerPalette.accent,
                              fontWeight: "900",
                            }}
                          >
                            Note
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: readerPalette.muted }}
                        >
                          {sourceBook.title}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{ color: readerPalette.muted, lineHeight: 17 }}
                        >
                          {note}
                        </ThemedText>
                        <View style={styles.annotationActionRow}>
                          <Pressable
                            onPress={() =>
                              goToBookChapter(sourceBook, chapter?.id)
                            }
                            style={[
                              styles.annotationMiniButton,
                              { borderColor: readerPalette.rule },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Open note from ${sourceBook.title}`}
                          >
                            <AppIcon
                              name="book-open"
                              size={12}
                              color={readerPalette.accent}
                            />
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{
                                color: readerPalette.accent,
                                fontWeight: "900",
                              }}
                            >
                              Open
                            </ThemedText>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              openNoteEditor({
                                targetBook: sourceBook,
                                targetChapter: chapter,
                                note,
                              })
                            }
                            style={[
                              styles.annotationMiniButton,
                              { borderColor: readerPalette.rule },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit note from ${sourceBook.title}`}
                          >
                            <AppIcon
                              name="edit-3"
                              size={12}
                              color={readerPalette.accent}
                            />
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{
                                color: readerPalette.accent,
                                fontWeight: "900",
                              }}
                            >
                              Edit
                            </ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <ReaderDrawerEmptyState
                    icon="edit-3"
                    title="No notes yet"
                    body="Private reflections you save while reading will appear here."
                  />
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={!!noteEditorTarget}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!noteEditorSaving) {
            setNoteEditorTarget(null);
            setNoteEditorDraft("");
          }
        }}
        testID="modal-library-note-editor"
      >
        <Pressable
          style={styles.drawerOverlay}
          onPress={() => {
            if (!noteEditorSaving) {
              setNoteEditorTarget(null);
              setNoteEditorDraft("");
            }
          }}
        >
          <Pressable
            style={[
              styles.noteEditorSheet,
              {
                backgroundColor: readerPalette.panel,
                borderColor: readerPalette.rule,
              },
            ]}
            onPress={() => {}}
          >
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText type="h3" style={{ color: readerPalette.ink }}>
                  Edit note
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: readerPalette.muted, marginTop: 2 }}
                >
                  {noteEditorTarget?.bookTitle} ·{" "}
                  {noteEditorTarget?.chapterTitle}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => {
                  if (!noteEditorSaving) {
                    setNoteEditorTarget(null);
                    setNoteEditorDraft("");
                  }
                }}
                style={[
                  styles.drawerCloseButton,
                  { borderColor: readerPalette.rule },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close note editor"
              >
                <AppIcon name="x" size={18} color={readerPalette.ink} />
              </Pressable>
            </View>
            <TextInput
              value={noteEditorDraft}
              onChangeText={setNoteEditorDraft}
              placeholder="Write your private reflection"
              placeholderTextColor={readerPalette.muted}
              multiline
              textAlignVertical="top"
              style={[
                styles.noteEditorInput,
                {
                  color: readerPalette.ink,
                  borderColor: readerPalette.rule,
                  backgroundColor:
                    readerMode === "night"
                      ? "rgba(255,255,255,0.045)"
                      : "rgba(0,0,0,0.035)",
                },
              ]}
              accessibilityLabel="Edit reader note"
            />
            <View style={styles.noteEditorActions}>
              <Pressable
                onPress={() => {
                  if (!noteEditorSaving) {
                    setNoteEditorTarget(null);
                    setNoteEditorDraft("");
                  }
                }}
                style={[
                  styles.noteEditorSecondaryButton,
                  { borderColor: readerPalette.rule },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cancel note editing"
              >
                <ThemedText
                  type="caption"
                  style={{ color: readerPalette.muted, fontWeight: "900" }}
                >
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={saveDrawerNote}
                disabled={noteEditorSaving}
                style={[
                  styles.noteEditorPrimaryButton,
                  {
                    backgroundColor: readerPalette.accent,
                    opacity: noteEditorSaving ? 0.66 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save edited note"
              >
                {noteEditorSaving ? (
                  <ActivityIndicator
                    size="small"
                    color={readerPalette.background}
                  />
                ) : (
                  <AppIcon
                    name="save"
                    size={14}
                    color={readerPalette.background}
                  />
                )}
                <ThemedText
                  type="caption"
                  style={{
                    color: readerPalette.background,
                    fontWeight: "900",
                  }}
                >
                  Save note
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={readerSettingsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReaderSettingsVisible(false)}
        testID="modal-library-reader-settings"
      >
        <Pressable
          style={styles.drawerOverlay}
          onPress={() => setReaderSettingsVisible(false)}
        >
          <Pressable
            style={[
              styles.readerSettingsSheet,
              {
                backgroundColor: readerPalette.panel,
                borderColor: readerPalette.rule,
              },
            ]}
            onPress={() => {}}
          >
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText type="h3" style={{ color: readerPalette.ink }}>
                  Reader settings
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: readerPalette.muted, marginTop: 2 }}
                >
                  Tune the page for long ebook sessions.
                </ThemedText>
              </View>
              <Pressable
                onPress={() => setReaderSettingsVisible(false)}
                style={[
                  styles.drawerCloseButton,
                  { borderColor: readerPalette.rule },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close reader settings"
              >
                <AppIcon name="x" size={18} color={readerPalette.ink} />
              </Pressable>
            </View>

            <View style={styles.readerSettingsSection}>
              <SettingRow
                title="Text size"
                value={`${readerFontSize}px`}
                locked={false}
                onDecrease={() => updateReaderFontSize(-1)}
                onIncrease={() => updateReaderFontSize(1)}
              />
              <SettingRow
                title="Line spacing"
                value={`${Math.round(readerLineHeightScale * 100)}%`}
                locked={!canUsePremiumReader}
                onDecrease={() => updateReaderLineHeight(-0.08)}
                onIncrease={() => updateReaderLineHeight(0.08)}
              />
            </View>

            <View style={styles.readerSettingsSection}>
              <ThemedText
                type="caption"
                style={{ color: readerPalette.accent, fontWeight: "900" }}
              >
                PAGE WIDTH
              </ThemedText>
              <View style={styles.readerWidthOptions}>
                {(["classic", "wide"] as ReaderWidthMode[]).map((mode) => {
                  const active = readerWidthMode === mode;
                  const locked = mode === "wide" && !canUsePremiumReader;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => setPremiumReaderWidthMode(mode)}
                      style={[
                        styles.readerWidthOption,
                        {
                          backgroundColor: active
                            ? `${readerPalette.accent}18`
                            : "transparent",
                          borderColor: active
                            ? readerPalette.accent
                            : readerPalette.rule,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${mode} page width${locked ? ", Premium" : ""}`}
                    >
                      <AppIcon
                        name={locked ? "lock" : "columns"}
                        size={15}
                        color={
                          active ? readerPalette.accent : readerPalette.muted
                        }
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color: active
                            ? readerPalette.accent
                            : readerPalette.muted,
                          textTransform: "capitalize",
                          fontWeight: "900",
                        }}
                      >
                        {mode}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View
              style={[
                styles.readerPremiumPanel,
                {
                  borderColor: canUsePremiumReader
                    ? `${readerPalette.accent}42`
                    : `${theme.scholar}42`,
                },
              ]}
            >
              <AppIcon
                name={canUsePremiumReader ? "check-circle" : "lock"}
                size={17}
                color={
                  canUsePremiumReader ? readerPalette.accent : theme.scholar
                }
              />
              <ThemedText
                type="caption"
                style={{ color: readerPalette.muted, flex: 1, lineHeight: 17 }}
              >
                Premium reader features include highlights, advanced spacing,
                wide page mode, offline narration, and comfort controls.
              </ThemedText>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <AIResponseModal
        visible={aiVisible}
        onClose={() => setAIVisible(false)}
        state={aiState}
        data={aiData}
        errorMessage={aiError}
        onRetry={askAI}
        onFollowUp={askAIFollowUp}
        featureLabel="Library Tutor"
        requiredTier="premium"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: Spacing.lg },
  readerTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  readerTopCenter: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.sm,
  },
  readerChapterCount: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 1.8,
  },
  readerProgressTrack: {
    width: "100%",
    height: 4,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  readerProgressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  readerTools: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  readerExperienceCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  readerExperienceItem: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  readerExperienceValue: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    textTransform: "capitalize",
  },
  readerModeGroup: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  readerModeChip: {
    minHeight: 36,
    minWidth: 66,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: Spacing.md,
  },
  fontControls: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  fontButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 2,
  },
  audioCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  audioIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  audioButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  readerNotice: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  readerNoticeText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    lineHeight: 19,
  },
  readingPage: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["2xl"],
    paddingBottom: Spacing.xl,
    marginBottom: Spacing.lg,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 4,
    overflow: "hidden",
  },
  readerPagePattern: {
    right: -42,
    top: -42,
  },
  bookMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  readerBookStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  readerBookStatusPill: {
    minHeight: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  readerResumeCard: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 24,
    padding: Spacing.md,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  readerResumeIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  readerResumeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  readerResumeActions: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  readerResumeButton: {
    minHeight: 38,
    minWidth: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  readerResumeSecondaryButton: {
    paddingHorizontal: 0,
  },
  readerTitle: {
    fontFamily: "LibreBaskerville_700Bold",
    lineHeight: 48,
    marginBottom: Spacing.sm,
  },
  readerSubtitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    lineHeight: 28,
    marginBottom: Spacing.xs,
  },
  readerByline: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  readerOpeningMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  readerOpeningLine: {
    flex: 1,
    height: 1,
  },
  readerOpeningDivider: {
    width: 96,
  },
  readerDivider: {
    height: 1,
    width: "100%",
    marginVertical: Spacing.lg,
  },
  readerPageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  readerFooterDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  readerSection: {
    marginBottom: Spacing["2xl"],
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  readerFirstSection: {
    paddingTop: Spacing.sm,
  },
  readerSectionToolbar: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  highlightButton: {
    minHeight: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sectionCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionType: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 2,
  },
  readerSectionHeading: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 23,
    lineHeight: 31,
  },
  readerParagraph: {
    fontFamily: "PlusJakartaSans_500Medium",
    letterSpacing: 0,
  },
  chapterNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  chapterNavButton: {
    minHeight: 44,
    minWidth: 104,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  reflectionInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  drawerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  chapterDrawer: {
    maxHeight: "82%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  drawerHandle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.45)",
    marginBottom: Spacing.lg,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  readerLibraryTabRail: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  readerLibraryTab: {
    minHeight: 38,
    minWidth: 104,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  tocSummaryGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tocSummaryTile: {
    flex: 1,
    minHeight: 66,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  tocBookProgressCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tocBookProgressTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  tocProgressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  tocProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  drawerCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerExportButton: {
    minHeight: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  chapterDrawerList: {
    marginHorizontal: -Spacing.xs,
  },
  chapterDrawerRow: {
    minHeight: 74,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.md,
    marginHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  readerLibraryRow: {
    minHeight: 82,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.md,
    marginHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  readerLibraryRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  readerLibraryRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  annotationMetaLine: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  annotationMetaPill: {
    minHeight: 22,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  annotationActionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  annotationMiniButton: {
    minHeight: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  readerDrawerEmpty: {
    minHeight: 188,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginHorizontal: Spacing.xs,
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  readerDrawerEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chapterDrawerNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  chapterDrawerTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  chapterDrawerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 4,
  },
  chapterDrawerProgressTrack: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: Spacing.sm,
  },
  chapterDrawerProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  noteEditorSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  noteEditorInput: {
    minHeight: 156,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 16,
    lineHeight: 24,
  },
  noteEditorActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  noteEditorSecondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  noteEditorPrimaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  readerSettingsSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  readerSettingsSection: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  settingRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  settingLockPill: {
    minHeight: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  settingStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  settingStepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  readerWidthOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  readerWidthOption: {
    flex: 1,
    minHeight: 46,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  readerPremiumPanel: {
    minHeight: 60,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
  quizBlock: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  option: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  readerDock: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    minHeight: 72,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  },
  readerDockButton: {
    minWidth: 58,
    minHeight: 50,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  readerDockPrimary: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
  },
});
