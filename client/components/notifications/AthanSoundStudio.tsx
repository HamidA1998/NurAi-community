import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";

import {
  ATHAN_VOICES,
  athanVoiceById,
  canUseAthanVoice,
  formatAthanDuration,
  getUsableAthanVoice,
  saveAthanVoice,
  type AthanVoice,
  type AthanVoicePlan,
} from "@/lib/athan-reciter-catalog";
import { requestAthanScheduleRefresh } from "@/lib/athan-alarm";
import {
  NuraiGlass,
  NuraiRadius,
  NuraiSpace,
  NuraiType,
} from "@/design-system";
import { useTheme } from "@/hooks/useTheme";
import { AppIcon } from "@/components/icons";

const WAVEFORM = [
  0.35, 0.58, 0.82, 0.48, 0.92, 0.66, 0.38, 0.74, 1, 0.56, 0.8, 0.42,
];

export function AthanSoundStudio({
  currentPlan,
  onUpgrade,
}: {
  currentPlan: AthanVoicePlan;
  onUpgrade: (minimumPlan: Exclude<AthanVoicePlan, "free">) => void;
}) {
  const { theme } = useTheme();
  const [selectedId, setSelectedId] = useState(ATHAN_VOICES[0].id);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const player = useAudioPlayer(null, {
    updateInterval: 180,
    downloadFirst: true,
  });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    void getUsableAthanVoice(currentPlan).then((voice) =>
      setSelectedId(voice.id),
    );
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: "doNotMix",
    }).catch(() => {});
  }, [currentPlan]);

  useEffect(() => {
    if (status.didJustFinish) setPreviewId(null);
  }, [status.didJustFinish]);

  const selectedVoice = useMemo(() => athanVoiceById(selectedId), [selectedId]);
  const otherVoices = useMemo(
    () => ATHAN_VOICES.filter((voice) => voice.id !== selectedId),
    [selectedId],
  );

  const previewVoice = useMemo(
    () => (previewId ? athanVoiceById(previewId) : null),
    [previewId],
  );

  const togglePreview = useCallback(
    async (voice: AthanVoice) => {
      if (previewId === voice.id && status.playing) {
        player.pause();
        return;
      }

      if (previewId !== voice.id) {
        player.replace(voice.assetModule);
        setPreviewId(voice.id);
        await new Promise((resolve) => setTimeout(resolve, 90));
      } else if (
        status.duration > 0 &&
        status.currentTime >= status.duration - 0.5
      ) {
        await player.seekTo(0);
      }
      player.play();
    },
    [player, previewId, status.currentTime, status.duration, status.playing],
  );

  const chooseVoice = useCallback(
    async (voice: AthanVoice) => {
      if (!canUseAthanVoice(voice, currentPlan)) {
        onUpgrade(voice.minimumPlan as Exclude<AthanVoicePlan, "free">);
        return;
      }
      const saved = await saveAthanVoice(voice.id);
      setSelectedId(saved.id);
      requestAthanScheduleRefresh();
    },
    [currentPlan, onUpgrade],
  );

  const progress =
    previewVoice && status.duration > 0
      ? Math.min(1, Math.max(0, status.currentTime / status.duration))
      : 0;

  return (
    <View style={styles.section} testID="athan-sound-studio">
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={[NuraiType.overline, { color: theme.primary }]}>
            YOUR ATHAN
          </Text>
          <Text style={[NuraiType.sectionTitle, { color: theme.text }]}>
            Choose the voice you want at prayer time
          </Text>
        </View>
        <View
          style={[
            styles.selectedBadge,
            { backgroundColor: theme.primaryMuted },
          ]}
        >
          <AppIcon name="check" size={13} color={theme.primary} />
          <Text style={[NuraiType.caption, { color: theme.primary }]}>
            In use
          </Text>
        </View>
      </View>

      <View style={styles.hero}>
        <NuraiGlass
          pointerEvents="none"
          radius={NuraiRadius.large}
          tint={`${theme.primary}16`}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.heroTop}>
          <Pressable
            onPress={() => void togglePreview(selectedVoice)}
            accessibilityRole="button"
            accessibilityLabel={`${status.playing && previewId === selectedVoice.id ? "Pause" : "Preview"} ${selectedVoice.name} Athan`}
            accessibilityHint="Plays a sample without changing your selected prayer alarm"
            style={({ pressed }) => [
              styles.heroPlay,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
            testID="athan-preview-selected"
          >
            <AppIcon
              name={
                status.playing && previewId === selectedVoice.id
                  ? "pause"
                  : "play"
              }
              size={21}
              color={theme.primaryForeground}
            />
          </Pressable>
          <View style={styles.heroCopy}>
            <Text style={[NuraiType.overline, { color: theme.primary }]}>
              YOUR CHOICE
            </Text>
            <View style={styles.heroNameRow}>
              <Text
                style={[NuraiType.body, { color: theme.text }]}
                numberOfLines={1}
              >
                {selectedVoice.name}
              </Text>
              {selectedVoice.minimumPlan !== "free" ? (
                <View
                  style={[
                    styles.planBadge,
                    {
                      backgroundColor:
                        selectedVoice.minimumPlan === "scholar"
                          ? `${theme.scholar}18`
                          : theme.primaryMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      NuraiType.overline,
                      {
                        color:
                          selectedVoice.minimumPlan === "scholar"
                            ? theme.scholar
                            : theme.primary,
                      },
                    ]}
                  >
                    {selectedVoice.minimumPlan === "scholar"
                      ? "SCHOLAR"
                      : "PREMIUM"}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[NuraiType.caption, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              {selectedVoice.description}
            </Text>
          </View>
          <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
            {formatAthanDuration(selectedVoice.durationSeconds)}
          </Text>
        </View>

        <View style={styles.waveform} accessible={false}>
          {WAVEFORM.map((height, index) => {
            const active = index / WAVEFORM.length <= progress;
            return (
              <View
                key={`${height}-${index}`}
                style={[
                  styles.waveBar,
                  {
                    height: 9 + height * 25,
                    backgroundColor: active
                      ? theme.primary
                      : theme.borderStrong,
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.creditRow}>
          <AppIcon name="shield" size={13} color={theme.textMuted} />
          <Text
            style={[
              NuraiType.caption,
              styles.creditCopy,
              { color: theme.textMuted },
            ]}
            numberOfLines={1}
          >
            Recorded by {selectedVoice.creator} · {selectedVoice.licenceLabel}
          </Text>
          <Pressable
            onPress={() => void Linking.openURL(selectedVoice.sourceUrl)}
            accessibilityRole="link"
            accessibilityLabel={`Open audio credit for ${selectedVoice.name}`}
            hitSlop={8}
          >
            <Text style={[NuraiType.caption, { color: theme.primary }]}>
              Credit
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.catalogueHeading}>
        <Text style={[NuraiType.overline, { color: theme.textMuted }]}>
          MORE VOICES
        </Text>
        <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
          {otherVoices.length} to explore
        </Text>
      </View>
      <View style={[styles.catalogue, { borderColor: theme.borderSubtle }]}>
        {otherVoices.map((voice, index) => {
          const accessible = canUseAthanVoice(voice, currentPlan);
          const previewing = previewId === voice.id && status.playing;
          return (
            <View key={voice.id}>
              <View style={styles.voiceRow}>
                <Pressable
                  onPress={() => void togglePreview(voice)}
                  accessibilityRole="button"
                  accessibilityLabel={`${previewing ? "Pause" : "Preview"} ${voice.name} Athan`}
                  style={({ pressed }) => [
                    styles.previewButton,
                    {
                      backgroundColor: previewing
                        ? theme.primary
                        : theme.primaryMuted,
                    },
                    pressed && styles.pressed,
                  ]}
                  testID={`athan-preview-${voice.id}`}
                >
                  <AppIcon
                    name={previewing ? "pause" : "play"}
                    size={16}
                    color={previewing ? theme.primaryForeground : theme.primary}
                  />
                </Pressable>
                <View style={styles.voiceCopy}>
                  <View style={styles.voiceTitleRow}>
                    <Text
                      style={[NuraiType.bodySmall, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {voice.name}
                    </Text>
                    {voice.minimumPlan !== "free" ? (
                      <View
                        style={[
                          styles.planBadge,
                          {
                            backgroundColor:
                              voice.minimumPlan === "scholar"
                                ? `${theme.scholar}18`
                                : theme.primaryMuted,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            NuraiType.overline,
                            {
                              color:
                                voice.minimumPlan === "scholar"
                                  ? theme.scholar
                                  : theme.primary,
                            },
                          ]}
                        >
                          {voice.minimumPlan === "scholar"
                            ? "SCHOLAR"
                            : "PREMIUM"}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[NuraiType.caption, { color: theme.textMuted }]}
                    numberOfLines={1}
                  >
                    {formatAthanDuration(voice.durationSeconds)} ·{" "}
                    {voice.creator}
                  </Text>
                </View>
                <Pressable
                  onPress={() => void chooseVoice(voice)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    accessible
                      ? `Use ${voice.name} for prayer alarms`
                      : `Unlock ${voice.name} with ${voice.minimumPlan}`
                  }
                  style={({ pressed }) => [
                    styles.chooseButton,
                    {
                      backgroundColor: accessible
                        ? "transparent"
                        : `${theme.scholar}12`,
                      borderColor: accessible
                        ? theme.borderSubtle
                        : `${theme.scholar}30`,
                    },
                    pressed && styles.pressed,
                  ]}
                  testID={`athan-select-${voice.id}`}
                >
                  <AppIcon
                    name={accessible ? "circle" : "lock"}
                    size={15}
                    color={accessible ? theme.textSecondary : theme.scholar}
                  />
                </Pressable>
              </View>
              {index < otherVoices.length - 1 ? (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.borderSubtle },
                  ]}
                />
              ) : null}
            </View>
          );
        })}
      </View>
      <Text
        style={[
          NuraiType.caption,
          styles.licenceNote,
          { color: theme.textMuted },
        ]}
      >
        Every voice can be previewed. Credits and licence details are always
        available.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: NuraiSpace.md },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: NuraiSpace.md,
  },
  selectedBadge: {
    minHeight: 32,
    paddingHorizontal: NuraiSpace.sm,
    borderRadius: NuraiRadius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  hero: {
    minHeight: 172,
    padding: NuraiSpace.lg,
    borderRadius: NuraiRadius.large,
    overflow: "hidden",
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: NuraiSpace.md },
  heroPlay: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1, minWidth: 0, gap: 3 },
  heroNameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  catalogueHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  waveform: {
    height: 42,
    marginTop: NuraiSpace.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  waveBar: { flex: 1, minWidth: 3, maxWidth: 10, borderRadius: 999 },
  creditRow: {
    marginTop: NuraiSpace.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  creditCopy: { flex: 1, minWidth: 0 },
  catalogue: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: NuraiRadius.card,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  voiceRow: {
    minHeight: 72,
    paddingHorizontal: NuraiSpace.md,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  previewButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceCopy: { flex: 1, minWidth: 0, gap: 2 },
  voiceTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  planBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: NuraiRadius.pill,
  },
  chooseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 72 },
  licenceNote: { lineHeight: 18, paddingHorizontal: NuraiSpace.xs },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
