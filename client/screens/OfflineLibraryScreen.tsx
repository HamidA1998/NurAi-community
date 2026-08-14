import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { PremiumBadge } from "@/components/PremiumGate";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/context/SubscriptionContext";
import { hasAccess } from "@/config/entitlements";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  deleteAllOfflineMedia,
  deleteOfflineMediaItem,
  formatMediaBytes,
  getOfflineMediaItems,
  getMediaStorageSummary,
  getMediaStoragePressure,
  type OfflineMediaItems,
  type MediaStorageSummary,
  type MediaStoragePressure,
} from "@/lib/media-storage";
import {
  buildDefaultQuranAudioUrl,
  buildDefaultQuranFallbackAudioUrl,
  DEFAULT_QURAN_AUDIO_RECITER,
  getQuranOfflinePackVerseTotal,
  QURAN_OFFLINE_PACK_PLANS,
  type QuranOfflinePackPlan,
} from "@/lib/quran-audio-catalog";
import { downloadQuranAyahRangeAudio } from "@/lib/quran-audio-downloads";
import {
  clearQuranOfflineDownloadQueue,
  getQuranOfflineDownloadQueue,
  saveQuranOfflineDownloadQueue,
  type QuranOfflineDownloadQueueState,
} from "@/lib/quran-offline-download-queue";
import {
  clearQuranTextCache,
  getQuranTextCacheIndex,
  removeQuranTextCacheEntry,
  type QuranTextCacheIndexEntry,
} from "@/lib/quran-offline-text-cache";
import {
  clearOfflineBooks,
  listOfflineBooks,
  removeOfflineBook,
  type OfflineBookEntry,
} from "@/services/libraryOfflineBookService";
import { MediaProgressBar } from "@/components/media/PremiumMediaControls";
import {
  GeometricCardPattern,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

type OfflineMediaCardProps = {
  icon: AppIconName;
  title: string;
  subtitle: string;
  countLabel: string;
  sizeLabel: string;
  progress: number;
  color: string;
  onPress: () => void;
  index: number;
};

type OfflineItemRowProps = {
  icon: AppIconName;
  title: string;
  subtitle: string;
  sizeLabel: string;
  color: string;
  deleting: boolean;
  onDelete: () => void;
};

type OfflineReadinessStepProps = {
  icon: AppIconName;
  title: string;
  body: string;
  complete: boolean;
  color: string;
  onPress: () => void;
};

type OfflinePackPriorityCardProps = {
  icon: AppIconName;
  title: string;
  body: string;
  ctaLabel: string;
  color: string;
  onPress: () => void;
};

type QuranPackPlannerCardProps = {
  plan: QuranOfflinePackPlan;
  index: number;
  downloading: boolean;
  failed: boolean;
  disabled: boolean;
  progress: number;
  estimatedSizeLabel: string;
  recommended: boolean;
  storageCautionLabel?: string;
  onPress: () => void;
  onCancel: () => void;
};

type StorageHealthCardProps = {
  pressure: MediaStoragePressure | null;
  clearing: boolean;
  hasOfflineMedia: boolean;
  onClear: () => void;
};

type QuranDownloadResumeCardProps = {
  queue: QuranOfflineDownloadQueueState;
  planAvailable: boolean;
  onResume: () => void;
  onClear: () => void;
};

type QuranTextCacheManagerProps = {
  entries: QuranTextCacheIndexEntry[];
  clearingKey: string | null;
  clearingAll: boolean;
  onOpen: (entry: QuranTextCacheIndexEntry) => void;
  onRemove: (entry: QuranTextCacheIndexEntry) => void;
  onClearAll: () => void;
};

function formatRecentOfflineDate(timestamp: number | null): string {
  if (!timestamp) return "No saved media yet";
  const diffMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Updated ${days}d ago`;
  return "Updated over a month ago";
}

function formatQuranTextCacheEntryDate(timestamp: number): string {
  const diffMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Saved just now";
  if (minutes < 60) return `Saved ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Saved ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `Saved ${days}d ago`;
  return "Saved earlier";
}

function OfflineMediaCard({
  icon,
  title,
  subtitle,
  countLabel,
  sizeLabel,
  progress,
  color,
  onPress,
  index,
}: OfflineMediaCardProps) {
  const { theme } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(260)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${countLabel}. ${sizeLabel}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.mediaCard,
          {
            backgroundColor: theme.surfaceGlass,
            borderColor: `${color}38`,
            opacity: pressed ? 0.78 : 1,
          },
        ]}
      >
        <GeometricCardPattern color={color} opacity={0.012} />
        <View style={styles.mediaCardTop}>
          <View style={[styles.mediaIcon, { backgroundColor: `${color}16` }]}>
            <AppIcon name={icon} size={20} color={color} />
          </View>
          <View style={styles.mediaCardTitle}>
            <ThemedText
              type="body"
              style={{ color: theme.text, fontWeight: "900" }}
            >
              {title}
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textMuted, marginTop: 3 }}
            >
              {subtitle}
            </ThemedText>
          </View>
          <AppIcon name="chevron-right" size={18} color={theme.textMuted} />
        </View>
        <View style={styles.mediaStatsRow}>
          <View>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Saved
            </ThemedText>
            <ThemedText type="caption" style={{ color, fontWeight: "900" }}>
              {countLabel}
            </ThemedText>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Storage
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.text, fontWeight: "900" }}
            >
              {sizeLabel}
            </ThemedText>
          </View>
        </View>
        <MediaProgressBar
          progress={progress}
          color={color}
          trackColor={`${color}14`}
          style={{ marginTop: Spacing.sm }}
        />
      </Pressable>
    </Animated.View>
  );
}

function OfflineItemRow({
  icon,
  title,
  subtitle,
  sizeLabel,
  color,
  deleting,
  onDelete,
}: OfflineItemRowProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.itemRow,
        {
          backgroundColor: `${theme.textMuted}08`,
          borderColor: theme.borderSubtle,
        },
      ]}
    >
      <View style={[styles.itemIcon, { backgroundColor: `${color}15` }]}>
        <AppIcon name={icon} size={15} color={color} />
      </View>
      <View style={styles.itemText}>
        <ThemedText
          type="caption"
          numberOfLines={1}
          style={{ color: theme.text, fontWeight: "900" }}
        >
          {title}
        </ThemedText>
        <ThemedText
          type="caption"
          numberOfLines={1}
          style={{ color: theme.textMuted, marginTop: 2 }}
        >
          {subtitle} · {sizeLabel}
        </ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${title}`}
        onPress={onDelete}
        disabled={deleting}
        hitSlop={8}
        style={({ pressed }) => [
          styles.itemDeleteButton,
          {
            backgroundColor: `${theme.error}12`,
            borderColor: `${theme.error}36`,
            opacity: deleting ? 0.55 : pressed ? 0.72 : 1,
          },
        ]}
      >
        {deleting ? (
          <ActivityIndicator size="small" color={theme.error} />
        ) : (
          <AppIcon name="trash-2" size={14} color={theme.error} />
        )}
      </Pressable>
    </View>
  );
}

function OfflinePackPriorityCard({
  icon,
  title,
  body,
  ctaLabel,
  color,
  onPress,
}: OfflinePackPriorityCardProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      testID="offline-next-best-pack-card"
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}. ${ctaLabel}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.priorityCard,
        {
          backgroundColor: `${color}10`,
          borderColor: `${color}38`,
          opacity: pressed ? 0.76 : 1,
        },
      ]}
    >
      <GeometricCardPattern color={color} opacity={0.012} />
      <View style={[styles.priorityIcon, { backgroundColor: `${color}18` }]}>
        <AppIcon name={icon} size={20} color={color} />
      </View>
      <View style={styles.priorityText}>
        <ThemedText
          type="caption"
          style={{ color, fontWeight: "900", letterSpacing: 0.7 }}
        >
          NEXT BEST DOWNLOAD
        </ThemedText>
        <ThemedText
          type="body"
          numberOfLines={1}
          style={{ color: theme.text, fontWeight: "900", marginTop: 2 }}
        >
          {title}
        </ThemedText>
        <ThemedText
          type="caption"
          numberOfLines={2}
          style={{ color: theme.textMuted, marginTop: 3, lineHeight: 18 }}
        >
          {body}
        </ThemedText>
      </View>
      <View style={[styles.priorityCta, { borderColor: `${color}42` }]}>
        <ThemedText type="caption" style={{ color, fontWeight: "900" }}>
          {ctaLabel}
        </ThemedText>
        <AppIcon name="arrow-right" size={13} color={color} />
      </View>
    </Pressable>
  );
}

function StorageHealthCard({
  pressure,
  clearing,
  hasOfflineMedia,
  onClear,
}: StorageHealthCardProps) {
  const { theme } = useTheme();
  const level = pressure?.level ?? "unknown";
  const statusColor =
    level === "critical" || level === "low"
      ? theme.error
      : level === "watch"
        ? theme.warning
        : level === "healthy"
          ? theme.success
          : theme.textMuted;
  const title =
    level === "critical"
      ? "Storage critical"
      : level === "low"
        ? "Storage low"
        : level === "watch"
          ? "Storage watch"
          : level === "healthy"
            ? "Storage healthy"
            : "Storage check";
  const freeLabel =
    pressure?.freeBytes !== null && pressure?.freeBytes !== undefined
      ? `${formatMediaBytes(pressure.freeBytes)} free`
      : "Free space unavailable";
  const usedLabel =
    pressure?.usedPercent !== null && pressure?.usedPercent !== undefined
      ? `${pressure.usedPercent}% used`
      : `Keep ${formatMediaBytes(pressure?.recommendedReserveBytes ?? 0)} free`;

  return (
    <Animated.View entering={FadeInDown.delay(62).duration(260)}>
      <View
        testID="offline-storage-health-card"
        style={[
          styles.storageHealthCard,
          {
            backgroundColor: `${statusColor}0E`,
            borderColor: `${statusColor}34`,
          },
        ]}
      >
        <GeometricCardPattern color={statusColor} opacity={0.012} />
        <View style={styles.storageHealthTop}>
          <View
            style={[
              styles.storageHealthIcon,
              { backgroundColor: `${statusColor}16` },
            ]}
          >
            <AppIcon name="hard-drive" size={17} color={statusColor} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{ color: statusColor, fontWeight: "900" }}
            >
              DEVICE STORAGE
            </ThemedText>
            <ThemedText
              type="body"
              numberOfLines={1}
              style={{ color: theme.text, fontWeight: "900", marginTop: 2 }}
            >
              {title}
            </ThemedText>
          </View>
          <View
            style={[
              styles.storageHealthPill,
              {
                backgroundColor: `${statusColor}12`,
                borderColor: `${statusColor}34`,
              },
            ]}
          >
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{ color: statusColor, fontWeight: "900" }}
            >
              {freeLabel}
            </ThemedText>
          </View>
        </View>
        <ThemedText
          type="caption"
          style={{ color: theme.textMuted, marginTop: Spacing.sm }}
        >
          {pressure?.message ??
            "NurAI checks storage before larger offline packs so downloads stay reliable."}
        </ThemedText>
        <View style={styles.storageHealthFooter}>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            {usedLabel}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove offline media to free storage"
            disabled={!hasOfflineMedia || clearing}
            onPress={onClear}
            style={({ pressed }) => [
              styles.storageHealthAction,
              {
                borderColor: hasOfflineMedia
                  ? `${statusColor}42`
                  : theme.borderSubtle,
                opacity: !hasOfflineMedia || clearing ? 0.5 : pressed ? 0.7 : 1,
              },
            ]}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={statusColor} />
            ) : (
              <AppIcon name="trash-2" size={14} color={statusColor} />
            )}
            <ThemedText
              type="caption"
              style={{ color: statusColor, fontWeight: "900" }}
            >
              Free space
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

function QuranDownloadResumeCard({
  queue,
  planAvailable,
  onResume,
  onClear,
}: QuranDownloadResumeCardProps) {
  const { theme } = useTheme();
  const progress =
    queue.totalVerses > 0
      ? (queue.completedVerses / queue.totalVerses) * 100
      : 0;
  const statusCopy =
    queue.status === "failed"
      ? "The last download did not finish. Resume it when your connection is stable."
      : queue.status === "paused"
        ? "This Quran pack is paused and ready to continue."
        : "NurAI remembered this Quran pack so you can continue saving it.";

  return (
    <Animated.View entering={FadeInDown.delay(66).duration(260)}>
      <View
        testID="offline-quran-download-resume-card"
        style={[
          styles.resumeDownloadCard,
          {
            backgroundColor: `${theme.scholar}10`,
            borderColor: `${theme.scholar}36`,
          },
        ]}
      >
        <GeometricCardPattern color={theme.scholar} opacity={0.012} />
        <View style={styles.resumeDownloadHeader}>
          <View
            style={[
              styles.resumeDownloadIcon,
              { backgroundColor: `${theme.scholar}16` },
            ]}
          >
            <AppIcon name="rotate-ccw" size={18} color={theme.scholar} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              RESUME QURAN PACK
            </ThemedText>
            <ThemedText
              type="body"
              numberOfLines={1}
              style={{ color: theme.text, fontWeight: "900", marginTop: 2 }}
            >
              {queue.planTitle}
            </ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.scholar, fontWeight: "900" }}
          >
            {Math.round(progress)}%
          </ThemedText>
        </View>
        <ThemedText
          type="caption"
          style={{ color: theme.textMuted, marginTop: Spacing.sm }}
        >
          {statusCopy}
        </ThemedText>
        <MediaProgressBar
          progress={progress}
          color={theme.scholar}
          trackColor={`${theme.scholar}15`}
          style={{ marginTop: Spacing.sm }}
        />
        <View style={styles.resumeDownloadActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Resume ${queue.planTitle} Quran pack download`}
            disabled={!planAvailable}
            onPress={onResume}
            style={({ pressed }) => [
              styles.resumeDownloadButton,
              {
                backgroundColor: planAvailable
                  ? theme.scholar
                  : `${theme.textMuted}16`,
                opacity: !planAvailable ? 0.55 : pressed ? 0.76 : 1,
              },
            ]}
          >
            <AppIcon
              name="download-cloud"
              size={15}
              color={planAvailable ? "#170F05" : theme.textMuted}
            />
            <ThemedText
              type="caption"
              style={{
                color: planAvailable ? "#170F05" : theme.textMuted,
                fontWeight: "900",
              }}
            >
              Resume
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear saved Quran download reminder"
            onPress={onClear}
            style={({ pressed }) => [
              styles.resumeDownloadClearButton,
              {
                borderColor: `${theme.scholar}36`,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              Clear
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

function QuranTextCacheManager({
  entries,
  clearingKey,
  clearingAll,
  onOpen,
  onRemove,
  onClearAll,
}: QuranTextCacheManagerProps) {
  const { theme } = useTheme();
  const totalVerses = entries.reduce((sum, entry) => sum + entry.verseCount, 0);
  const latestEntry = entries[0];

  return (
    <View
      testID="offline-quran-text-cache-manager"
      style={[
        styles.textCachePanel,
        {
          backgroundColor: `${theme.primary}0B`,
          borderColor: `${theme.primary}26`,
        },
      ]}
    >
      <GeometricCardPattern color={theme.primary} opacity={0.012} />
      <View style={styles.textCacheHeader}>
        <View
          style={[
            styles.textCacheIcon,
            { backgroundColor: `${theme.primary}16` },
          ]}
        >
          <AppIcon name="file-text" size={18} color={theme.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ThemedText
            type="caption"
            style={{ color: theme.primary, fontWeight: "900" }}
          >
            OFFLINE QURAN TEXT
          </ThemedText>
          <ThemedText
            type="body"
            numberOfLines={1}
            style={{ color: theme.text, fontWeight: "900", marginTop: 2 }}
          >
            {entries.length > 0
              ? `${entries.length} saved surah${entries.length === 1 ? "" : "s"}`
              : "No saved surahs yet"}
          </ThemedText>
          <ThemedText
            type="caption"
            numberOfLines={2}
            style={{ color: theme.textMuted, marginTop: 3, lineHeight: 18 }}
          >
            Quran text and translations can reopen from your saved copy when
            live data is unavailable.
          </ThemedText>
        </View>
        <View
          style={[
            styles.textCacheCountPill,
            {
              backgroundColor: `${theme.scholar}12`,
              borderColor: `${theme.scholar}32`,
            },
          ]}
        >
          <ThemedText
            type="caption"
            style={{ color: theme.scholar, fontWeight: "900" }}
          >
            {totalVerses} ayahs
          </ThemedText>
        </View>
      </View>

      <View
        style={[
          styles.textCacheSummary,
          {
            backgroundColor: `${theme.textMuted}07`,
            borderColor: theme.borderSubtle,
          },
        ]}
      >
        <View>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Latest saved
          </ThemedText>
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={{ color: theme.text, fontWeight: "900", marginTop: 2 }}
          >
            {latestEntry
              ? `${latestEntry.surahName} · ${formatQuranTextCacheEntryDate(
                  latestEntry.cachedAt,
                )}`
              : "Open a surah online once to save it here"}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear saved Quran text cache"
          disabled={entries.length === 0 || clearingAll}
          onPress={onClearAll}
          style={({ pressed }) => [
            styles.textCacheClearButton,
            {
              borderColor:
                entries.length > 0 ? `${theme.error}36` : theme.borderSubtle,
              opacity:
                entries.length === 0 || clearingAll ? 0.5 : pressed ? 0.72 : 1,
            },
          ]}
        >
          {clearingAll ? (
            <ActivityIndicator size="small" color={theme.error} />
          ) : (
            <AppIcon
              name="trash-2"
              size={14}
              color={entries.length > 0 ? theme.error : theme.textMuted}
            />
          )}
          <ThemedText
            type="caption"
            style={{
              color: entries.length > 0 ? theme.error : theme.textMuted,
              fontWeight: "900",
            }}
          >
            Clear text
          </ThemedText>
        </Pressable>
      </View>

      {entries.length === 0 ? (
        <View style={styles.textCacheEmpty}>
          <AppIcon name="book-open" size={20} color={theme.textMuted} />
          <ThemedText
            type="caption"
            style={{
              color: theme.textMuted,
              textAlign: "center",
              marginTop: Spacing.xs,
              lineHeight: 18,
            }}
          >
            Open Quran while online and NurAI will quietly keep the text ready
            for that surah.
          </ThemedText>
        </View>
      ) : (
        <View style={styles.textCacheList}>
          {entries.slice(0, 5).map((entry) => {
            const isClearing = clearingKey === entry.key;
            return (
              <Pressable
                key={entry.key}
                testID={`offline-quran-text-cache-entry-${entry.surahNumber}`}
                accessibilityRole="button"
                accessibilityLabel={`Open saved Quran text for ${entry.surahName}`}
                onPress={() => onOpen(entry)}
                style={({ pressed }) => [
                  styles.textCacheRow,
                  {
                    backgroundColor: `${theme.textMuted}07`,
                    borderColor: theme.borderSubtle,
                    opacity: pressed ? 0.76 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.textCacheRowIcon,
                    { backgroundColor: `${theme.primary}14` },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "900" }}
                  >
                    {entry.surahNumber}
                  </ThemedText>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: theme.text, fontWeight: "900" }}
                  >
                    {entry.surahName}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: theme.textMuted, marginTop: 2 }}
                  >
                    {entry.verseCount} ayahs · {entry.translationId}
                    {entry.tajweedEnabled ? " · tajweed" : ""}
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove saved Quran text for ${entry.surahName}`}
                  disabled={isClearing}
                  hitSlop={8}
                  onPress={(event) => {
                    event.stopPropagation();
                    onRemove(entry);
                  }}
                  style={({ pressed }) => [
                    styles.textCacheRemoveButton,
                    {
                      borderColor: `${theme.error}34`,
                      backgroundColor: `${theme.error}10`,
                      opacity: isClearing ? 0.55 : pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  {isClearing ? (
                    <ActivityIndicator size="small" color={theme.error} />
                  ) : (
                    <AppIcon name="x" size={14} color={theme.error} />
                  )}
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function OfflineReadinessStep({
  icon,
  title,
  body,
  complete,
  color,
  onPress,
}: OfflineReadinessStepProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${complete ? "Ready" : "Not ready"}. ${body}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.readinessStep,
        {
          backgroundColor: complete ? `${color}12` : `${theme.textMuted}08`,
          borderColor: complete ? `${color}34` : theme.borderSubtle,
          opacity: pressed ? 0.76 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.readinessStepIcon,
          { backgroundColor: complete ? `${color}18` : `${theme.textMuted}12` },
        ]}
      >
        <AppIcon
          name={complete ? "check-circle" : icon}
          size={15}
          color={complete ? color : theme.textMuted}
        />
      </View>
      <View style={styles.readinessStepText}>
        <ThemedText
          type="caption"
          numberOfLines={1}
          style={{ color: complete ? color : theme.text, fontWeight: "900" }}
        >
          {title}
        </ThemedText>
        <ThemedText
          type="caption"
          numberOfLines={2}
          style={{ color: theme.textMuted, marginTop: 2, lineHeight: 17 }}
        >
          {body}
        </ThemedText>
      </View>
      <AppIcon name="chevron-right" size={15} color={theme.textMuted} />
    </Pressable>
  );
}

function QuranPackPlannerCard({
  plan,
  index,
  downloading,
  failed,
  disabled,
  progress,
  estimatedSizeLabel,
  recommended,
  storageCautionLabel,
  onPress,
  onCancel,
}: QuranPackPlannerCardProps) {
  const { theme } = useTheme();
  const verseTotal = getQuranOfflinePackVerseTotal(plan);
  return (
    <Animated.View entering={FadeInDown.delay(120 + index * 55).duration(260)}>
      <Pressable
        testID={`offline-quran-pack-${plan.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${failed ? "Retry" : "Save"} ${plan.title}. ${verseTotal} ayahs. ${plan.body}`}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.quranPackPlanCard,
          {
            backgroundColor: `${theme.primary}0B`,
            borderColor: `${theme.primary}28`,
            opacity: disabled ? 0.62 : pressed ? 0.76 : 1,
          },
        ]}
      >
        <GeometricCardPattern color={theme.primary} opacity={0.012} />
        <View
          style={[
            styles.quranPackIcon,
            { backgroundColor: `${theme.primary}16` },
          ]}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <AppIcon name="download-cloud" size={18} color={theme.primary} />
          )}
        </View>
        <View style={styles.quranPackText}>
          <View style={styles.quranPackTopRow}>
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{
                color: failed ? theme.error : theme.primary,
                fontWeight: "900",
              }}
            >
              {failed ? "Retry available" : plan.badge}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              {estimatedSizeLabel}
            </ThemedText>
          </View>
          <ThemedText
            type="body"
            numberOfLines={1}
            style={{ color: theme.text, fontWeight: "900", marginTop: 2 }}
          >
            {plan.title}
          </ThemedText>
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={{ color: theme.textMuted, marginTop: 2 }}
          >
            {plan.subtitle}
          </ThemedText>
          <ThemedText
            type="caption"
            numberOfLines={2}
            style={{ color: theme.textMuted, marginTop: 5, lineHeight: 17 }}
          >
            {plan.body}
          </ThemedText>
          <View style={styles.quranPackMetaRow}>
            {recommended ? (
              <View
                testID="offline-smart-pack-recommendation"
                style={[
                  styles.quranPackMetaPill,
                  {
                    backgroundColor: `${theme.scholar}14`,
                    borderColor: `${theme.scholar}32`,
                  },
                ]}
              >
                <AppIcon name="zap" size={12} color={theme.scholar} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.scholar, fontWeight: "900" }}
                >
                  Recommended
                </ThemedText>
              </View>
            ) : null}
            <View
              style={[
                styles.quranPackMetaPill,
                {
                  backgroundColor: `${theme.primary}10`,
                  borderColor: `${theme.primary}24`,
                },
              ]}
            >
              <AppIcon name="book-open" size={12} color={theme.primary} />
              <ThemedText
                type="caption"
                style={{ color: theme.primary, fontWeight: "900" }}
              >
                {verseTotal} ayahs
              </ThemedText>
            </View>
            {storageCautionLabel ? (
              <View
                style={[
                  styles.quranPackMetaPill,
                  {
                    backgroundColor: `${theme.warning}12`,
                    borderColor: `${theme.warning}34`,
                  },
                ]}
              >
                <AppIcon
                  name="alert-triangle"
                  size={12}
                  color={theme.warning}
                />
                <ThemedText
                  type="caption"
                  style={{ color: theme.warning, fontWeight: "900" }}
                >
                  {storageCautionLabel}
                </ThemedText>
              </View>
            ) : null}
          </View>
          {downloading ? (
            <MediaProgressBar
              progress={progress}
              color={theme.primary}
              trackColor={`${theme.primary}15`}
              style={{ marginTop: Spacing.sm }}
            />
          ) : null}
        </View>
        {downloading ? (
          <Pressable
            testID={`offline-quran-pack-cancel-${plan.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Cancel ${plan.title} download`}
            onPress={onCancel}
            hitSlop={8}
            style={({ pressed }) => [
              styles.quranPackCancelButton,
              {
                borderColor: `${theme.error}42`,
                backgroundColor: `${theme.error}12`,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <AppIcon name="x" size={15} color={theme.error} />
          </Pressable>
        ) : (
          <AppIcon
            name={failed ? "refresh-cw" : "arrow-down-circle"}
            size={18}
            color={failed ? theme.error : theme.primary}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function OfflineLibraryScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { currentPlan } = useSubscription();
  const isPremium = hasAccess(currentPlan, "premium");
  const [summary, setSummary] = useState<MediaStorageSummary | null>(null);
  const [items, setItems] = useState<OfflineMediaItems>({
    quranPacks: [],
    nasheeds: [],
    libraryNarrations: [],
  });
  const [storagePressure, setStoragePressure] =
    useState<MediaStoragePressure | null>(null);
  const [queuedQuranDownload, setQueuedQuranDownload] =
    useState<QuranOfflineDownloadQueueState | null>(null);
  const [quranTextCacheEntries, setQuranTextCacheEntries] = useState<
    QuranTextCacheIndexEntry[]
  >([]);
  const [offlineBooks, setOfflineBooks] = useState<OfflineBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [clearingQuranTextCache, setClearingQuranTextCache] = useState(false);
  const [clearingQuranTextCacheKey, setClearingQuranTextCacheKey] = useState<
    string | null
  >(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [downloadingQuranPlanId, setDownloadingQuranPlanId] = useState<
    string | null
  >(null);
  const [quranPlanProgress, setQuranPlanProgress] = useState(0);
  const [failedQuranPlanId, setFailedQuranPlanId] = useState<string | null>(
    null,
  );
  const cancelQuranPlanDownloadRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [
        nextSummary,
        nextItems,
        nextStoragePressure,
        nextQueuedQuranDownload,
        nextQuranTextCacheEntries,
        nextOfflineBooks,
      ] = await Promise.all([
        getMediaStorageSummary(),
        getOfflineMediaItems(),
        getMediaStoragePressure(),
        getQuranOfflineDownloadQueue(),
        getQuranTextCacheIndex(),
        listOfflineBooks(),
      ]);
      setSummary(nextSummary);
      setItems(nextItems);
      setStoragePressure(nextStoragePressure);
      setQueuedQuranDownload(nextQueuedQuranDownload);
      setQuranTextCacheEntries(nextQuranTextCacheEntries);
      setOfflineBooks(nextOfflineBooks);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleClearAll = useCallback(() => {
    const hasSavedBooks = offlineBooks.length > 0;
    const hasSavedMedia = (summary?.totalBytes ?? 0) > 0;
    if ((!hasSavedMedia && !hasSavedBooks) || clearing) return;
    const run = async () => {
      setClearing(true);
      try {
        await deleteAllOfflineMedia();
        await clearOfflineBooks();
        await clearQuranOfflineDownloadQueue();
        setQueuedQuranDownload(null);
        await refresh();
      } finally {
        setClearing(false);
      }
    };

    if (Platform.OS === "web") {
      run();
      return;
    }

    Alert.alert(
      "Remove offline media?",
      "This removes downloaded Quran audio, nasheeds, saved books, and saved book narration from this device. Your reading progress and account stay safe.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: run },
      ],
    );
  }, [clearing, offlineBooks.length, refresh, summary]);

  const handleDeleteItem = useCallback(
    (
      label: string,
      action:
        | { type: "quran"; surahNumber: number; reciterId: number }
        | { type: "nasheed"; id: string }
        | { type: "library"; id: string },
    ) => {
      const key =
        action.type === "quran"
          ? `quran-${action.reciterId}-${action.surahNumber}`
          : `${action.type}-${action.id}`;
      const run = async () => {
        setDeletingItemId(key);
        try {
          await deleteOfflineMediaItem(action);
          await refresh();
        } finally {
          setDeletingItemId(null);
        }
      };

      if (Platform.OS === "web") {
        run();
        return;
      }

      Alert.alert(
        "Remove offline item?",
        `${label} will be removed from this device.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: run },
        ],
      );
    },
    [refresh],
  );

  const handleDeleteOfflineBook = useCallback(
    (entry: OfflineBookEntry) => {
      const run = async () => {
        setDeletingItemId(`book-${entry.bookId}`);
        try {
          await removeOfflineBook(entry.bookId);
          await refresh();
        } finally {
          setDeletingItemId(null);
        }
      };

      if (Platform.OS === "web") {
        run();
        return;
      }

      Alert.alert(
        "Remove offline book?",
        `${entry.title} will be removed from offline reading on this device.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: run },
        ],
      );
    },
    [refresh],
  );

  const handleDownloadQuranOfflinePlan = useCallback(
    async (plan: QuranOfflinePackPlan) => {
      if (!isPremium) {
        navigation.navigate("Subscription", { initialTab: "premium" });
        return;
      }
      if (downloadingQuranPlanId) return;

      const totalVerses = getQuranOfflinePackVerseTotal(plan);
      let completedBeforeRange = 0;
      cancelQuranPlanDownloadRef.current = false;
      setFailedQuranPlanId(null);
      setDownloadingQuranPlanId(plan.id);
      setQuranPlanProgress(0);
      await saveQuranOfflineDownloadQueue({
        planId: plan.id,
        planTitle: plan.title,
        completedVerses: 0,
        totalVerses,
        status: "downloading",
        updatedAt: Date.now(),
      });
      setQueuedQuranDownload({
        planId: plan.id,
        planTitle: plan.title,
        completedVerses: 0,
        totalVerses,
        status: "downloading",
        updatedAt: Date.now(),
      });

      let finished = false;
      let failed = false;
      let latestCompletedVerses = 0;
      try {
        for (const range of plan.ranges) {
          if (cancelQuranPlanDownloadRef.current) break;
          const rangeTotal = range.endVerse - range.startVerse + 1;
          const success = await downloadQuranAyahRangeAudio({
            surahNumber: range.surahNumber,
            surahName: range.surahName,
            reciterId: DEFAULT_QURAN_AUDIO_RECITER.id,
            totalVerses: range.endVerse,
            startVerse: range.startVerse,
            endVerse: range.endVerse,
            urlForVerse: (verseNumber) =>
              buildDefaultQuranAudioUrl(range.surahNumber, verseNumber),
            fallbackUrlForVerse: (verseNumber) =>
              buildDefaultQuranFallbackAudioUrl(range.surahNumber, verseNumber),
            shouldCancel: () => cancelQuranPlanDownloadRef.current,
            retryAttempts: 2,
            onProgress: (progress) => {
              const completed = completedBeforeRange + progress.completedVerses;
              latestCompletedVerses = completed;
              const nextQueueState = {
                planId: plan.id,
                planTitle: plan.title,
                completedVerses: completed,
                totalVerses,
                status: "downloading" as const,
                updatedAt: Date.now(),
              };
              setQueuedQuranDownload(nextQueueState);
              saveQuranOfflineDownloadQueue(nextQueueState).catch(() => {});
              setQuranPlanProgress(
                totalVerses > 0 ? (completed / totalVerses) * 100 : 0,
              );
            },
          });
          if (cancelQuranPlanDownloadRef.current) break;
          if (!success) {
            failed = true;
            setFailedQuranPlanId(plan.id);
            const failedQueueState = {
              planId: plan.id,
              planTitle: plan.title,
              completedVerses: latestCompletedVerses,
              totalVerses,
              status: "failed" as const,
              updatedAt: Date.now(),
            };
            await saveQuranOfflineDownloadQueue(failedQueueState);
            setQueuedQuranDownload(failedQueueState);
            Alert.alert(
              "Could not save this pack",
              "NurAI could not finish saving this Quran pack. Please check your connection and try again.",
            );
            break;
          }
          completedBeforeRange += rangeTotal;
          latestCompletedVerses = completedBeforeRange;
          setQuranPlanProgress(
            totalVerses > 0 ? (completedBeforeRange / totalVerses) * 100 : 0,
          );
        }
        finished =
          !cancelQuranPlanDownloadRef.current &&
          !failed &&
          completedBeforeRange >= totalVerses;
        if (finished) {
          await clearQuranOfflineDownloadQueue();
          setQueuedQuranDownload(null);
        } else if (cancelQuranPlanDownloadRef.current) {
          const pausedQueueState = {
            planId: plan.id,
            planTitle: plan.title,
            completedVerses: latestCompletedVerses,
            totalVerses,
            status: "paused" as const,
            updatedAt: Date.now(),
          };
          await saveQuranOfflineDownloadQueue(pausedQueueState);
          setQueuedQuranDownload(pausedQueueState);
        }
        await refresh();
      } finally {
        setDownloadingQuranPlanId(null);
        setQuranPlanProgress(0);
        cancelQuranPlanDownloadRef.current = false;
      }
    },
    [downloadingQuranPlanId, isPremium, navigation, refresh],
  );

  const handleCancelQuranOfflinePlan = useCallback(() => {
    cancelQuranPlanDownloadRef.current = true;
  }, []);

  const handleClearQueuedQuranDownload = useCallback(async () => {
    await clearQuranOfflineDownloadQueue();
    setQueuedQuranDownload(null);
  }, []);

  const handleOpenQuranTextCache = useCallback(
    (entry: QuranTextCacheIndexEntry) => {
      navigation.navigate("QuranReader", { surahNumber: entry.surahNumber });
    },
    [navigation],
  );

  const handleRemoveQuranTextCacheEntry = useCallback(
    (entry: QuranTextCacheIndexEntry) => {
      const run = async () => {
        setClearingQuranTextCacheKey(entry.key);
        try {
          await removeQuranTextCacheEntry(entry.key);
          await refresh();
        } finally {
          setClearingQuranTextCacheKey(null);
        }
      };

      if (Platform.OS === "web") {
        run();
        return;
      }

      Alert.alert(
        "Remove saved Quran text?",
        `${entry.surahName} will be removed from offline text on this device. Quran audio and reading progress stay safe.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: run },
        ],
      );
    },
    [refresh],
  );

  const handleClearQuranTextCache = useCallback(() => {
    if (quranTextCacheEntries.length === 0 || clearingQuranTextCache) return;
    const run = async () => {
      setClearingQuranTextCache(true);
      try {
        await clearQuranTextCache();
        await refresh();
      } finally {
        setClearingQuranTextCache(false);
      }
    };

    if (Platform.OS === "web") {
      run();
      return;
    }

    Alert.alert(
      "Clear saved Quran text?",
      "This removes saved Quran text and translations from this device. Quran audio, bookmarks, and reading progress stay safe.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: run },
      ],
    );
  }, [clearingQuranTextCache, quranTextCacheEntries.length, refresh]);

  const handleResumeQueuedQuranDownload = useCallback(() => {
    if (!queuedQuranDownload || downloadingQuranPlanId) return;
    const plan = QURAN_OFFLINE_PACK_PLANS.find(
      (candidate) => candidate.id === queuedQuranDownload.planId,
    );
    if (!plan) {
      handleClearQueuedQuranDownload();
      return;
    }
    handleDownloadQuranOfflinePlan(plan);
  }, [
    downloadingQuranPlanId,
    handleClearQueuedQuranDownload,
    handleDownloadQuranOfflinePlan,
    queuedQuranDownload,
  ]);

  const total = summary?.totalBytes ?? 0;
  const offlineBookTextBytes = offlineBooks.reduce(
    (sum, entry) => sum + entry.fileSize,
    0,
  );
  const totalWithBooks = total + offlineBookTextBytes;
  const quranProgress =
    totalWithBooks > 0
      ? ((summary?.quranAudioBytes ?? 0) / totalWithBooks) * 100
      : 0;
  const nasheedProgress =
    totalWithBooks > 0
      ? ((summary?.nasheedAudioBytes ?? 0) / totalWithBooks) * 100
      : 0;
  const libraryProgress =
    totalWithBooks > 0
      ? ((summary?.libraryNarrationBytes ?? 0) / totalWithBooks) * 100
      : 0;
  const bookProgress =
    totalWithBooks > 0 ? (offlineBookTextBytes / totalWithBooks) * 100 : 0;
  const savedCategories = [
    (summary?.quranAyahCount ?? 0) > 0,
    (summary?.nasheedTrackCount ?? 0) > 0,
    (summary?.libraryNarrationCount ?? 0) > 0,
    offlineBooks.length > 0,
  ].filter(Boolean).length;
  const hasQuranReady = (summary?.quranAyahCount ?? 0) > 0;
  const hasNasheedsReady = (summary?.nasheedTrackCount ?? 0) > 0;
  const hasNarrationReady = (summary?.libraryNarrationCount ?? 0) > 0;
  const hasOfflineBooksReady = offlineBooks.length > 0;
  const estimatedAverageQuranAyahBytes =
    summary && summary.quranAyahCount > 0
      ? Math.max(180_000, summary.quranAudioBytes / summary.quranAyahCount)
      : 420_000;
  const todayDay = new Date().getDay();
  const recommendedQuranPackId =
    todayDay === 5
      ? "friday-light"
      : !hasQuranReady
        ? "night-protection"
        : (summary?.quranAyahCount ?? 0) < 80
          ? "juz-amma"
          : "friday-light";
  const hasOfflineMedia = totalWithBooks > 0;
  const getEstimatedQuranPackSizeLabel = (plan: QuranOfflinePackPlan) =>
    `~${formatMediaBytes(
      getQuranOfflinePackVerseTotal(plan) * estimatedAverageQuranAyahBytes,
    )}`;
  const getQuranPackStorageCautionLabel = (plan: QuranOfflinePackPlan) => {
    if (
      !storagePressure?.freeBytes ||
      storagePressure.level === "healthy" ||
      storagePressure.level === "unknown"
    ) {
      return undefined;
    }
    const estimatedBytes =
      getQuranOfflinePackVerseTotal(plan) * estimatedAverageQuranAyahBytes;
    if (
      estimatedBytes + storagePressure.recommendedReserveBytes >
      storagePressure.freeBytes
    ) {
      return "Review space";
    }
    return storagePressure.level === "watch" ? undefined : "Storage low";
  };
  const travelReadinessPercent = Math.round((savedCategories / 4) * 100);
  const travelReadinessLabel =
    savedCategories >= 4
      ? "Travel ready"
      : savedCategories > 0
        ? "Partly ready"
        : "Start your pack";
  const travelReadinessBody =
    savedCategories >= 4
      ? "Quran audio, nasheeds, books, and narration are saved on this device."
      : savedCategories > 0
        ? "Add the missing packs so NurAI still feels useful when signal is weak."
        : "Save at least one Quran pack before travelling or commuting.";
  const latestOfflineTimestamp = Math.max(
    0,
    ...items.quranPacks.map((pack) => pack.downloadedAt || 0),
    ...items.nasheeds.map((track) => track.downloadedAt || 0),
    ...offlineBooks.map((book) => book.savedAt || 0),
  );
  const quranShare =
    totalWithBooks > 0
      ? Math.round(((summary?.quranAudioBytes ?? 0) / totalWithBooks) * 100)
      : 0;
  const nasheedShare =
    totalWithBooks > 0
      ? Math.round(((summary?.nasheedAudioBytes ?? 0) / totalWithBooks) * 100)
      : 0;
  const narrationShare =
    totalWithBooks > 0
      ? Math.round(
          ((summary?.libraryNarrationBytes ?? 0) / totalWithBooks) * 100,
        )
      : 0;
  const bookTextShare =
    totalWithBooks > 0
      ? Math.max(0, 100 - quranShare - nasheedShare - narrationShare)
      : 0;
  const nextBestPack = !hasQuranReady
    ? {
        icon: "book-open" as const,
        title: "Save your first Quran surah",
        body: "Start with Al-Fatihah or the surah you are currently reading so recitation works without signal.",
        ctaLabel: "Open Quran",
        color: theme.primary,
        onPress: () => navigation.navigate("QuranReader", { surahNumber: 1 }),
      }
    : !hasNasheedsReady
      ? {
          icon: "music" as const,
          title: "Add calm nasheeds",
          body: "Save a small listening set for commutes, walks, and low-signal travel moments.",
          ctaLabel: "Open Nasheeds",
          color: theme.success,
          onPress: () => navigation.navigate("Nasheeds"),
        }
      : !hasOfflineBooksReady
        ? {
            icon: "download-cloud" as const,
            title: "Save a full book",
            body: "Pin one NurAI book for offline reading so learning still works without signal.",
            ctaLabel: "Open Library",
            color: theme.scholar,
            onPress: () => navigation.navigate("LibraryHome"),
          }
        : !hasNarrationReady
          ? {
              icon: "headphones" as const,
              title: "Save one book narration",
              body: "Keep a chapter ready for learning when you cannot read from the screen.",
              ctaLabel: "Open Library",
              color: theme.scholar,
              onPress: () => navigation.navigate("LibraryHome"),
            }
          : {
              icon: "check-circle" as const,
              title: "Your offline pack is balanced",
              body: "You have Quran audio, nasheeds, saved books, and book narration ready on this device.",
              ctaLabel: "Review items",
              color: theme.primary,
              onPress: () => {},
            };
  const queuedQuranDownloadPlanAvailable = Boolean(
    queuedQuranDownload &&
      QURAN_OFFLINE_PACK_PLANS.some(
        (candidate) => candidate.id === queuedQuranDownload.planId,
      ),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.primary} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={[styles.headerButton, { backgroundColor: theme.surfaceGlass }]}
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitle}>
          <ThemedText type="h4" style={{ color: theme.text }}>
            Offline Library
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Premium downloads, storage, and travel-ready audio
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh offline library"
          onPress={refresh}
          hitSlop={8}
          style={[styles.headerButton, { backgroundColor: theme.surfaceGlass }]}
        >
          <AppIcon name="refresh-cw" size={20} color={theme.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(280)}
          style={[
            styles.hero,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.primaryBorder,
            },
          ]}
        >
          <GeometricCardPattern color={theme.primary} opacity={0.012} />
          <View style={styles.heroTop}>
            <View
              style={[
                styles.heroIcon,
                { backgroundColor: `${theme.primary}18` },
              ]}
            >
              <AppIcon name="hard-drive" size={24} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText
                type="caption"
                style={{ color: theme.primary, fontWeight: "900" }}
              >
                OFFLINE MEDIA
              </ThemedText>
              <ThemedText type="h2" style={{ color: theme.text, marginTop: 3 }}>
                {loading ? "Checking..." : formatMediaBytes(totalWithBooks)}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Saved on this device for Quran, nasheeds, books, and narration.
              </ThemedText>
            </View>
            {!isPremium ? <PremiumBadge tier="premium" /> : null}
          </View>
          <MediaProgressBar
            progress={totalWithBooks > 0 ? 100 : 0}
            color={theme.primary}
            trackColor={`${theme.primary}12`}
            style={{ marginTop: Spacing.lg }}
          />
          <View testID="offline-pack-manager-v2" style={styles.heroMetaGrid}>
            <View style={styles.heroMetaItem}>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Readiness
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.primary, fontWeight: "900" }}
              >
                {travelReadinessPercent}%
              </ThemedText>
            </View>
            <View style={styles.heroMetaItem}>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Packs
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.text, fontWeight: "900" }}
              >
                {savedCategories}/4 ready
              </ThemedText>
            </View>
            <View style={styles.heroMetaItem}>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Recency
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: theme.text, fontWeight: "900" }}
              >
                {formatRecentOfflineDate(latestOfflineTimestamp)}
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        {!loading ? (
          <StorageHealthCard
            pressure={storagePressure}
            clearing={clearing}
            hasOfflineMedia={hasOfflineMedia}
            onClear={handleClearAll}
          />
        ) : null}

        {!loading && queuedQuranDownload && !downloadingQuranPlanId ? (
          <QuranDownloadResumeCard
            queue={queuedQuranDownload}
            planAvailable={queuedQuranDownloadPlanAvailable}
            onResume={handleResumeQueuedQuranDownload}
            onClear={handleClearQueuedQuranDownload}
          />
        ) : null}

        {!loading ? (
          <Animated.View entering={FadeInDown.delay(55).duration(260)}>
            <OfflinePackPriorityCard {...nextBestPack} />
          </Animated.View>
        ) : null}

        <Animated.View
          entering={FadeInDown.delay(70).duration(260)}
          testID="offline-travel-readiness-card"
          style={[
            styles.readinessCard,
            {
              backgroundColor: `${theme.primary}0B`,
              borderColor: `${theme.primary}24`,
            },
          ]}
        >
          <GeometricCardPattern color={theme.primary} opacity={0.012} />
          <View style={styles.readinessHeader}>
            <View
              style={[
                styles.readinessCompass,
                { borderColor: `${theme.primary}34` },
              ]}
            >
              <AppIcon name="compass" size={22} color={theme.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <ThemedText
                type="caption"
                style={{ color: theme.primary, fontWeight: "900" }}
              >
                TRAVEL-READY PACK
              </ThemedText>
              <ThemedText
                type="h4"
                numberOfLines={1}
                style={{ color: theme.text, marginTop: 2 }}
              >
                {travelReadinessLabel}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={2}
                style={{ color: theme.textMuted, marginTop: 3, lineHeight: 18 }}
              >
                {travelReadinessBody}
              </ThemedText>
            </View>
            <View
              style={[
                styles.readinessScore,
                {
                  backgroundColor: `${theme.scholar}12`,
                  borderColor: `${theme.scholar}30`,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{ color: theme.scholar, fontWeight: "900" }}
              >
                {loading ? "--" : `${travelReadinessPercent}%`}
              </ThemedText>
            </View>
          </View>
          <MediaProgressBar
            progress={loading ? 0 : travelReadinessPercent}
            color={theme.primary}
            trackColor={`${theme.primary}14`}
          />
          {!loading && totalWithBooks > 0 ? (
            <View
              testID="offline-storage-mix"
              style={[
                styles.storageMixPanel,
                {
                  backgroundColor: `${theme.textMuted}07`,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <View style={styles.storageMixHeader}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.text, fontWeight: "900" }}
                >
                  Storage mix
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  {formatMediaBytes(totalWithBooks)}
                </ThemedText>
              </View>
              <View style={styles.storageMixTrack}>
                <View
                  style={[
                    styles.storageMixSegment,
                    { width: `${quranShare}%`, backgroundColor: theme.primary },
                  ]}
                />
                <View
                  style={[
                    styles.storageMixSegment,
                    {
                      width: `${nasheedShare}%`,
                      backgroundColor: theme.success,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.storageMixSegment,
                    {
                      width: `${narrationShare}%`,
                      backgroundColor: theme.scholar,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.storageMixSegment,
                    {
                      width: `${bookTextShare}%`,
                      backgroundColor: theme.info,
                    },
                  ]}
                />
              </View>
              <View style={styles.storageLegend}>
                <ThemedText type="caption" style={{ color: theme.primary }}>
                  Quran {quranShare}%
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.success }}>
                  Nasheeds {nasheedShare}%
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.scholar }}>
                  Narration {narrationShare}%
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.info }}>
                  Books {bookTextShare}%
                </ThemedText>
              </View>
            </View>
          ) : null}
          <View style={styles.readinessSteps}>
            <OfflineReadinessStep
              icon="book-open"
              title="Quran pack"
              body={
                hasQuranReady
                  ? `${summary?.quranAyahCount ?? 0} ayahs saved for offline recitation.`
                  : "Save a surah from the Quran reader for offline listening."
              }
              complete={hasQuranReady}
              color={theme.primary}
              onPress={() =>
                navigation.navigate("QuranReader", { surahNumber: 1 })
              }
            />
            <OfflineReadinessStep
              icon="music"
              title="Nasheed pack"
              body={
                hasNasheedsReady
                  ? `${summary?.nasheedTrackCount ?? 0} nasheed${summary?.nasheedTrackCount === 1 ? "" : "s"} ready without streaming.`
                  : "Download NurAI nasheeds for calm offline listening."
              }
              complete={hasNasheedsReady}
              color={theme.success}
              onPress={() => navigation.navigate("Nasheeds")}
            />
            <OfflineReadinessStep
              icon="download-cloud"
              title="Saved books"
              body={
                hasOfflineBooksReady
                  ? `${offlineBooks.length} book${offlineBooks.length === 1 ? "" : "s"} saved for offline reading.`
                  : "Save a full NurAI book from its title page for offline reading."
              }
              complete={hasOfflineBooksReady}
              color={theme.info}
              onPress={() => navigation.navigate("LibraryHome")}
            />
            <OfflineReadinessStep
              icon="headphones"
              title="Book narration"
              body={
                hasNarrationReady
                  ? `${summary?.libraryNarrationCount ?? 0} chapter narration${summary?.libraryNarrationCount === 1 ? "" : "s"} saved.`
                  : "Save narration from a book chapter for learning on the move."
              }
              complete={hasNarrationReady}
              color={theme.scholar}
              onPress={() => navigation.navigate("LibraryHome")}
            />
          </View>
        </Animated.View>

        {!isPremium ? (
          <Animated.View
            entering={FadeInDown.delay(80).duration(260)}
            style={[
              styles.upgradeCard,
              {
                backgroundColor: `${theme.scholar}12`,
                borderColor: `${theme.scholar}44`,
              },
            ]}
          >
            <AppIcon name="star" size={18} color={theme.scholar} />
            <View style={{ flex: 1 }}>
              <ThemedText
                type="body"
                style={{ color: theme.text, fontWeight: "900" }}
              >
                Premium unlocks offline mode
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, marginTop: 2 }}
              >
                Save Quran audio, books, narration, and listening packs for
                travel.
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Premium plans"
              onPress={() =>
                navigation.navigate("Subscription", { initialTab: "premium" })
              }
              style={[styles.upgradeButton, { backgroundColor: theme.scholar }]}
            >
              <ThemedText
                type="caption"
                style={{ color: "#170F05", fontWeight: "900" }}
              >
                View plans
              </ThemedText>
            </Pressable>
          </Animated.View>
        ) : null}

        <View
          testID="offline-quran-pack-planner"
          style={[
            styles.quranPackPlanner,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View style={styles.quranPackPlannerHeader}>
            <View
              style={[
                styles.quranPackPlannerIcon,
                { backgroundColor: `${theme.primary}16` },
              ]}
            >
              <AppIcon name="book-open" size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText
                type="body"
                style={{ color: theme.text, fontWeight: "900" }}
              >
                Quran pack planner
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, marginTop: 2 }}
              >
                Save real Quran audio packs for travel, memorisation, and weak
                signal moments.
              </ThemedText>
            </View>
            {!isPremium ? <PremiumBadge tier="premium" /> : null}
          </View>
          <View style={styles.quranPackPlanList}>
            {QURAN_OFFLINE_PACK_PLANS.map((plan, index) => (
              <QuranPackPlannerCard
                key={plan.id}
                plan={plan}
                index={index}
                downloading={downloadingQuranPlanId === plan.id}
                failed={failedQuranPlanId === plan.id}
                disabled={
                  Boolean(downloadingQuranPlanId) &&
                  downloadingQuranPlanId !== plan.id
                }
                estimatedSizeLabel={getEstimatedQuranPackSizeLabel(plan)}
                recommended={plan.id === recommendedQuranPackId}
                storageCautionLabel={getQuranPackStorageCautionLabel(plan)}
                progress={
                  downloadingQuranPlanId === plan.id ? quranPlanProgress : 0
                }
                onPress={() => handleDownloadQuranOfflinePlan(plan)}
                onCancel={handleCancelQuranOfflinePlan}
              />
            ))}
          </View>
        </View>

        {!loading ? (
          <Animated.View entering={FadeInDown.delay(130).duration(260)}>
            <QuranTextCacheManager
              entries={quranTextCacheEntries}
              clearingKey={clearingQuranTextCacheKey}
              clearingAll={clearingQuranTextCache}
              onOpen={handleOpenQuranTextCache}
              onRemove={handleRemoveQuranTextCacheEntry}
              onClearAll={handleClearQuranTextCache}
            />
          </Animated.View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginTop: Spacing.sm }}
            >
              Reading your offline library...
            </ThemedText>
          </View>
        ) : (
          <>
            <OfflineMediaCard
              index={0}
              icon="book-open"
              title="Quran Audio"
              subtitle="Surah packs saved from the Quran reader."
              countLabel={`${summary?.quranAyahCount ?? 0} ayahs`}
              sizeLabel={formatMediaBytes(summary?.quranAudioBytes ?? 0)}
              progress={quranProgress}
              color={theme.primary}
              onPress={() =>
                navigation.navigate("QuranReader", { surahNumber: 1 })
              }
            />
            <OfflineMediaCard
              index={1}
              icon="music"
              title="Nasheeds"
              subtitle="Downloaded NurAI nasheeds for offline listening."
              countLabel={`${summary?.nasheedTrackCount ?? 0} tracks`}
              sizeLabel={formatMediaBytes(summary?.nasheedAudioBytes ?? 0)}
              progress={nasheedProgress}
              color={theme.success}
              onPress={() => navigation.navigate("Nasheeds")}
            />
            <OfflineMediaCard
              index={2}
              icon="download-cloud"
              title="Saved Books"
              subtitle="Complete NurAI book text pinned for offline reading."
              countLabel={`${offlineBooks.length} books`}
              sizeLabel={formatMediaBytes(offlineBookTextBytes)}
              progress={bookProgress}
              color={theme.info}
              onPress={() => navigation.navigate("LibraryHome")}
            />
            <OfflineMediaCard
              index={3}
              icon="headphones"
              title="Book Narration"
              subtitle="Saved chapter narration from the NurAI library."
              countLabel={`${summary?.libraryNarrationCount ?? 0} chapters`}
              sizeLabel={formatMediaBytes(summary?.libraryNarrationBytes ?? 0)}
              progress={libraryProgress}
              color={theme.scholar}
              onPress={() => navigation.navigate("LibraryHome")}
            />
          </>
        )}

        {!loading ? (
          <View
            style={[
              styles.itemsPanel,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <View style={styles.itemsPanelHeader}>
              <View>
                <ThemedText
                  type="body"
                  style={{ color: theme.text, fontWeight: "900" }}
                >
                  Downloaded items
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, marginTop: 2 }}
                >
                  Remove individual packs without clearing everything.
                </ThemedText>
              </View>
              <AppIcon name="list" size={18} color={theme.primary} />
            </View>

            {items.quranPacks.length === 0 &&
            items.nasheeds.length === 0 &&
            items.libraryNarrations.length === 0 &&
            offlineBooks.length === 0 ? (
              <View style={styles.emptyItems}>
                <AppIcon
                  name="download-cloud"
                  size={22}
                  color={theme.textMuted}
                />
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textMuted,
                    marginTop: Spacing.xs,
                    textAlign: "center",
                  }}
                >
                  No offline media saved yet. Save Quran audio, nasheeds, books,
                  or narration to see them here.
                </ThemedText>
              </View>
            ) : null}

            {items.quranPacks.map((pack) => (
              <OfflineItemRow
                key={pack.id}
                icon="book-open"
                title={pack.title}
                subtitle={`${pack.downloadedAyahs} ayahs · Reciter ${pack.reciterId}`}
                sizeLabel={formatMediaBytes(pack.fileSize)}
                color={theme.primary}
                deleting={
                  deletingItemId ===
                  `quran-${pack.reciterId}-${pack.surahNumber}`
                }
                onDelete={() =>
                  handleDeleteItem(pack.title, {
                    type: "quran",
                    surahNumber: pack.surahNumber,
                    reciterId: pack.reciterId,
                  })
                }
              />
            ))}
            {items.nasheeds.map((track) => (
              <OfflineItemRow
                key={track.id}
                icon="music"
                title={track.title}
                subtitle={track.artist}
                sizeLabel={formatMediaBytes(track.fileSize)}
                color={theme.success}
                deleting={deletingItemId === `nasheed-${track.id}`}
                onDelete={() =>
                  handleDeleteItem(track.title, {
                    type: "nasheed",
                    id: track.id,
                  })
                }
              />
            ))}
            {items.libraryNarrations.map((narration) => (
              <OfflineItemRow
                key={narration.id}
                icon="headphones"
                title={narration.title}
                subtitle="Book narration"
                sizeLabel={formatMediaBytes(narration.fileSize)}
                color={theme.scholar}
                deleting={deletingItemId === `library-${narration.id}`}
                onDelete={() =>
                  handleDeleteItem(narration.title, {
                    type: "library",
                    id: narration.id,
                  })
                }
              />
            ))}
            {offlineBooks.map((book) => (
              <OfflineItemRow
                key={book.bookId}
                icon="download-cloud"
                title={book.title}
                subtitle={`${book.chapterCount} chapters · ${book.category}`}
                sizeLabel={formatMediaBytes(book.fileSize)}
                color={theme.info}
                deleting={deletingItemId === `book-${book.bookId}`}
                onDelete={() => handleDeleteOfflineBook(book)}
              />
            ))}
          </View>
        ) : null}

        <View
          style={[
            styles.actionsCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <ThemedText
            type="body"
            style={{ color: theme.text, fontWeight: "900" }}
          >
            Storage controls
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, marginTop: 3 }}
          >
            Remove offline media, saved books, and narration when you need
            space. Reading progress, bookmarks, and account data are not
            removed.
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove all offline media"
            disabled={clearing || loading || totalWithBooks <= 0}
            onPress={handleClearAll}
            style={({ pressed }) => [
              styles.clearButton,
              {
                backgroundColor:
                  totalWithBooks > 0
                    ? `${theme.error}12`
                    : `${theme.textMuted}10`,
                borderColor:
                  totalWithBooks > 0 ? `${theme.error}44` : theme.borderSubtle,
                opacity:
                  clearing || loading || totalWithBooks <= 0
                    ? 0.55
                    : pressed
                      ? 0.76
                      : 1,
              },
            ]}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={theme.error} />
            ) : (
              <AppIcon
                name="trash-2"
                size={16}
                color={totalWithBooks > 0 ? theme.error : theme.textMuted}
              />
            )}
            <ThemedText
              type="caption"
              style={{
                color: totalWithBooks > 0 ? theme.error : theme.textMuted,
                fontWeight: "900",
              }}
            >
              Remove all offline media
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  hero: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  heroMetaGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  heroMetaItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityCard: {
    minHeight: 124,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  priorityIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityText: {
    flex: 1,
    minWidth: 0,
  },
  priorityCta: {
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  storageHealthCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: "hidden",
  },
  storageHealthTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  storageHealthIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  storageHealthPill: {
    maxWidth: 132,
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  storageHealthFooter: {
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  storageHealthAction: {
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  resumeDownloadCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: "hidden",
  },
  resumeDownloadHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  resumeDownloadIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  resumeDownloadActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  resumeDownloadButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  resumeDownloadClearButton: {
    minHeight: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeCard: {
    minHeight: 86,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  upgradeButton: {
    minHeight: 36,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  readinessCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    overflow: "hidden",
  },
  readinessHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  readinessCompass: {
    width: 54,
    height: 54,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(86,179,148,0.08)",
  },
  readinessScore: {
    minWidth: 54,
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  readinessSteps: {
    gap: Spacing.sm,
  },
  storageMixPanel: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  storageMixHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  storageMixTrack: {
    height: 10,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
  },
  storageMixSegment: {
    height: "100%",
    minWidth: 2,
  },
  storageLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  readinessStep: {
    minHeight: 66,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  readinessStepIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  readinessStepText: {
    flex: 1,
    minWidth: 0,
  },
  quranPackPlanner: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  quranPackPlannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  quranPackPlannerIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  quranPackPlanList: {
    gap: Spacing.sm,
  },
  quranPackPlanCard: {
    minHeight: 138,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  quranPackIcon: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  quranPackCancelButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  quranPackText: {
    flex: 1,
    minWidth: 0,
  },
  quranPackTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  quranPackMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: Spacing.sm,
  },
  quranPackMetaPill: {
    minHeight: 25,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  textCachePanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    overflow: "hidden",
  },
  textCacheHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  textCacheIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  textCacheCountPill: {
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  textCacheSummary: {
    minHeight: 62,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  textCacheClearButton: {
    minHeight: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  textCacheEmpty: {
    minHeight: 104,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  textCacheList: {
    gap: Spacing.sm,
  },
  textCacheRow: {
    minHeight: 66,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  textCacheRowIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  textCacheRemoveButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBlock: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaCard: {
    minHeight: 156,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  mediaCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  mediaIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaCardTitle: {
    flex: 1,
    minWidth: 0,
  },
  mediaStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  itemsPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  itemsPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyItems: {
    minHeight: 116,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  itemRow: {
    minHeight: 66,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  itemDeleteButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  clearButton: {
    marginTop: Spacing.md,
    minHeight: 46,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
});
