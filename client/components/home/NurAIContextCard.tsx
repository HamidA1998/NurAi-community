import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeOutUp,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import type { NurAIPlanTier } from "@shared/nuraiAI";
import {
  NuraiBottomSheet,
  NuraiGlass,
  NuraiMotion,
  NuraiSpace,
  NuraiType,
} from "@/design-system";
import { useTheme } from "@/hooks/useTheme";
import { AppIcon, type AppIconName } from "@/components/icons";

export type NurAIContextCardStatus =
  | "ready"
  | "new"
  | "saved"
  | "offline"
  | "ai_unavailable"
  | "permission_required";

export type NurAIContextPersonalisationSource =
  | "v3_on_device"
  | "v3_paid_ai"
  | "v3_offline_fallback"
  | "v3_permission_limited";

export type NurAIContextSignal = {
  id: string;
  label: string;
  value: string;
  icon: AppIconName;
  quickAccessId?: string;
  tone?: "gold" | "emerald" | "muted";
};

export type NurAIContextCardProps = {
  message: string;
  headline?: string;
  contextLabel?: string;
  userTier: NurAIPlanTier;
  aiStatus: NurAIContextCardStatus;
  loading?: boolean;
  error?: string | null;
  onPress: () => void;
  onDismiss?: () => void;
  onSave?: () => void;
  onShowFewer?: () => void;
  onRefresh?: () => void;
  personalisationSource: NurAIContextPersonalisationSource;
  contextSignals?: NurAIContextSignal[];
  accessibilityLabel?: string;
  messageId?: string;
};

const STATE_FALLBACK: Record<
  Exclude<NurAIContextCardStatus, "ready" | "new" | "saved">,
  { label: string; message: string }
> = {
  offline: {
    label: "Offline guidance",
    message: "Your latest useful guidance is still available while offline.",
  },
  ai_unavailable: {
    label: "Guidance available",
    message:
      "Live personalisation is resting. Your on-device guidance remains available.",
  },
  permission_required: {
    label: "Limited context",
    message:
      "Nur AI can still help with the activity you choose to share in the app.",
  },
};

async function lightHaptic() {
  if (Platform.OS === "web") return;
  await Haptics.selectionAsync().catch(() => undefined);
}

export function NurAIContextCard({
  headline,
  message,
  contextLabel,
  userTier,
  aiStatus,
  loading = false,
  error,
  onPress,
  onDismiss,
  onSave,
  onShowFewer,
  onRefresh,
  personalisationSource,
  contextSignals,
  accessibilityLabel,
  messageId,
}: NurAIContextCardProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [actionsOpen, setActionsOpen] = useState(false);
  const pressScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.92);
  const premium = userTier !== "free";
  // Name the plan the guidance came from in the user's own words. "Free"
  // guidance is ranked locally, so it reads "Free · on device"; paid tiers
  // name themselves. No internal engine names (V3) in customer copy.
  const tierLabel =
    userTier === "scholar"
      ? "Scholar"
      : userTier === "premium"
        ? "Premium"
        : "Free · on device";
  const isNew = aiStatus === "new";
  const isSaved = aiStatus === "saved";
  const stateFallback =
    aiStatus === "offline" ||
    aiStatus === "ai_unavailable" ||
    aiStatus === "permission_required"
      ? STATE_FALLBACK[aiStatus]
      : null;
  const resolvedMessage =
    message.trim() || error?.trim() || stateFallback?.message;
  const visibleSignals = premium
    ? (contextSignals || []).filter((signal) => signal.value.trim()).slice(0, 3)
    : [];
  const resolvedContextLabel = loading
    ? "Preparing guidance"
    : isSaved
      ? "Saved guidance"
      : aiStatus === "ai_unavailable"
        ? premium
          ? `${tierLabel} · paused`
          : tierLabel
        : stateFallback?.label || contextLabel || tierLabel;

  const accessibilityActions = useMemo(() => {
    const actions = [{ name: "activate", label: "Open in Nur AI" }];
    if (onSave) actions.push({ name: "save", label: "Save message" });
    if (onDismiss) {
      actions.push({ name: "dismiss", label: "Dismiss for now" });
    }
    if (onShowFewer) {
      actions.push({ name: "fewer", label: "Show fewer messages like this" });
    }
    if (premium && onRefresh) {
      actions.push({ name: "refresh", label: "Refresh guidance" });
    }
    return actions;
  }, [onDismiss, onRefresh, onSave, onShowFewer, premium]);

  useEffect(() => {
    cancelAnimation(glowOpacity);
    cancelAnimation(glowScale);
    if (!isNew || reduceMotion) {
      glowOpacity.value = isNew ? 0.28 : 0;
      glowScale.value = 1;
      return;
    }
    glowOpacity.value = 0;
    glowScale.value = 0.92;
    glowOpacity.value = withSequence(
      withTiming(0.56, { duration: 340 }),
      withRepeat(withTiming(0.16, { duration: 620 }), 2, true),
      withTiming(0, { duration: 360 }),
    );
    glowScale.value = withSequence(
      withSpring(1.08, { damping: 15, stiffness: 160 }),
      withTiming(1, { duration: 520 }),
    );
  }, [glowOpacity, glowScale, isNew, reduceMotion]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const runAction = (action?: () => void) => {
    setActionsOpen(false);
    void lightHaptic();
    action?.();
  };

  const openActions = () => {
    void lightHaptic();
    setActionsOpen(true);
  };

  const openGuide = () => {
    void lightHaptic();
    onPress();
  };

  const handleAccessibilityAction = (name: string) => {
    if (name === "activate") openGuide();
    if (name === "save") runAction(onSave);
    if (name === "dismiss") runAction(onDismiss);
    if (name === "fewer") runAction(onShowFewer);
    if (name === "refresh") runAction(onRefresh);
  };

  const spokenStatus = loading
    ? "Loading"
    : `${premium ? "Premium personalised" : "Daily"} guidance${isSaved ? ", saved" : ""}`;
  const spokenMessage = [headline, resolvedMessage].filter(Boolean).join(". ");
  const spokenSignals = visibleSignals
    .map((signal) => `${signal.label}: ${signal.value}`)
    .join(". ");
  const sourceDescription = personalisationSourceDescription(
    personalisationSource,
  );

  return (
    <>
      <Animated.View style={pressStyle}>
        <Pressable
          onPress={openGuide}
          onLongPress={openActions}
          onPressIn={() => {
            pressScale.value = reduceMotion
              ? 0.99
              : withSpring(0.985, { damping: 18, stiffness: 260 });
          }}
          onPressOut={() => {
            pressScale.value = reduceMotion
              ? 1
              : withSpring(1, { damping: 18, stiffness: 240 });
          }}
          accessibilityRole="button"
          accessibilityLabel={
            accessibilityLabel ||
            `Nur AI. ${spokenStatus}. ${spokenMessage}${spokenSignals ? `. Today's context. ${spokenSignals}` : ""}`
          }
          accessibilityHint={`Opens the full Nur AI experience with this context. Long press for message options.${visibleSignals.length ? " Today's private context signals are included." : ""}`}
          accessibilityState={{ busy: loading }}
          accessibilityActions={accessibilityActions}
          onAccessibilityAction={(event) =>
            handleAccessibilityAction(event.nativeEvent.actionName)
          }
          testID="home-nur-ai-context-card"
          style={[styles.card, { borderColor: `${theme.primary}28` }]}
        >
          <NuraiGlass
            pointerEvents="none"
            interactive
            radius={22}
            tint="rgba(7, 26, 26, 0.68)"
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.orbStage} pointerEvents="none">
            <Animated.View
              style={[
                styles.orbGlow,
                { backgroundColor: theme.primary },
                glowStyle,
              ]}
            />
            <View
              style={[
                styles.orb,
                {
                  backgroundColor: `${theme.primary}20`,
                  borderColor: `${theme.primary}52`,
                },
              ]}
            >
              <AppIcon
                name="nurai"
                size={23}
                color={theme.primary}
                accented={premium}
              />
            </View>
          </View>

          <View style={styles.copy}>
            <View style={styles.labelRow}>
              <Text
                style={[NuraiType.overline, { color: theme.primary }]}
                numberOfLines={1}
              >
                NUR AI
              </Text>
              {premium ? (
                <View accessible={false} style={styles.premiumSparkle}>
                  <AppIcon
                    name="nurai"
                    size={12}
                    color={theme.scholar}
                    accented
                  />
                </View>
              ) : null}
              <Text style={[styles.labelSeparator, { color: theme.textMuted }]}>
                ·
              </Text>
              <Text
                style={[
                  NuraiType.caption,
                  styles.contextLabel,
                  { color: theme.textMuted },
                ]}
                numberOfLines={1}
              >
                {resolvedContextLabel}
              </Text>
            </View>

            {loading ? (
              <LoadingCopy color={theme.skeleton} reduceMotion={reduceMotion} />
            ) : (
              <Animated.View
                key={messageId || `${headline || "message"}-${resolvedMessage}`}
                entering={
                  reduceMotion
                    ? undefined
                    : FadeInDown.duration(
                        NuraiMotion.standard,
                      ).withInitialValues({
                        opacity: 0,
                        transform: [{ translateY: 5 }],
                      })
                }
                exiting={reduceMotion ? undefined : FadeOutUp.duration(140)}
                style={styles.messageCopy}
              >
                {headline ? (
                  <Text
                    style={[styles.headline, { color: theme.text }]}
                    numberOfLines={2}
                  >
                    {headline}
                  </Text>
                ) : null}
                <Text
                  style={[styles.message, { color: theme.textSecondary }]}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  {resolvedMessage}
                </Text>
              </Animated.View>
            )}

            {visibleSignals.length ? (
              <View
                style={[
                  styles.signalRail,
                  { borderTopColor: `${theme.textMuted}20` },
                ]}
                accessible={false}
              >
                <View style={styles.signalRailHeader}>
                  <Text
                    style={[styles.signalRailLabel, { color: theme.scholar }]}
                  >
                    TODAY&apos;S CONTEXT
                  </Text>
                  <Text
                    style={[
                      styles.signalRailSource,
                      { color: theme.textMuted },
                    ]}
                  >
                    Private
                  </Text>
                </View>
                <View style={styles.signalItems}>
                  {visibleSignals.map((signal, index) => {
                    const signalColor =
                      signal.tone === "gold"
                        ? theme.scholar
                        : signal.tone === "muted"
                          ? theme.textMuted
                          : theme.primary;
                    return (
                      <React.Fragment key={signal.id}>
                        {index > 0 ? (
                          <View
                            style={[
                              styles.signalDivider,
                              { backgroundColor: `${theme.textMuted}18` },
                            ]}
                          />
                        ) : null}
                        <View style={styles.signalItem}>
                          <View
                            style={[
                              styles.signalIcon,
                              {
                                backgroundColor: `${signalColor}12`,
                                borderColor: `${signalColor}2A`,
                              },
                            ]}
                          >
                            <AppIcon
                              name={signal.icon}
                              size={15}
                              color={signalColor}
                              weight="semibold"
                            />
                          </View>
                          <View style={styles.signalCopy}>
                            <Text
                              style={[
                                styles.signalLabel,
                                { color: theme.textMuted },
                              ]}
                              numberOfLines={1}
                            >
                              {signal.label}
                            </Text>
                            <Text
                              style={[
                                styles.signalValue,
                                { color: signalColor },
                              ]}
                              numberOfLines={1}
                            >
                              {signal.value}
                            </Text>
                          </View>
                        </View>
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>

          <View
            pointerEvents="none"
            style={[
              styles.chevron,
              {
                backgroundColor: `${theme.primary}10`,
              },
            ]}
          >
            <AppIcon
              name="chevron-right"
              size={18}
              color={theme.primary}
              weight="semibold"
            />
          </View>
        </Pressable>
      </Animated.View>

      <NuraiBottomSheet
        visible={actionsOpen}
        title="Guidance options"
        onClose={() => setActionsOpen(false)}
      >
        {onSave ? (
          <ContextAction
            icon={isSaved ? "check" : "bookmark"}
            label={isSaved ? "Remove saved message" : "Save message"}
            color={theme.primary}
            onPress={() => runAction(onSave)}
          />
        ) : null}
        {onDismiss ? (
          <ContextAction
            icon="clock"
            label="Dismiss for now"
            color={theme.text}
            onPress={() => runAction(onDismiss)}
          />
        ) : null}
        {onShowFewer ? (
          <ContextAction
            icon="sliders"
            label="Show fewer messages like this"
            color={theme.text}
            onPress={() => runAction(onShowFewer)}
          />
        ) : null}
        {premium && onRefresh ? (
          <ContextAction
            icon="refresh-cw"
            label="Refresh guidance"
            color={theme.scholar}
            onPress={() => runAction(onRefresh)}
          />
        ) : null}
        <Text
          style={[styles.sourceNote, { color: theme.textMuted }]}
          accessibilityLabel={`Personalisation source: ${sourceDescription}`}
        >
          {sourceDescription}
        </Text>
      </NuraiBottomSheet>
    </>
  );
}

function personalisationSourceDescription(
  source: NurAIContextPersonalisationSource,
) {
  switch (source) {
    case "v3_paid_ai":
      return "Personalised from the context you allow.";
    case "v3_on_device":
      return "Ranked privately on this device.";
    case "v3_permission_limited":
      return "Using only the context currently available.";
    default:
      return "Using the latest safe on-device guidance.";
  }
}

function LoadingCopy({
  color,
  reduceMotion,
}: {
  color: string;
  reduceMotion: boolean;
}) {
  const opacity = useSharedValue(reduceMotion ? 0.46 : 0.34);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.46;
      return;
    }
    opacity.value = withRepeat(withTiming(0.74, { duration: 760 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[styles.loadingCopy, animatedStyle]}>
      <View style={[styles.skeletonLine, { backgroundColor: color }]} />
      <View
        style={[
          styles.skeletonLine,
          styles.skeletonLineShort,
          { backgroundColor: color },
        ]}
      />
    </Animated.View>
  );
}

function ContextAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: AppIconName;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.action,
        pressed ? styles.actionPressed : null,
      ]}
    >
      <AppIcon name={icon} size={18} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 132,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  orbStage: {
    width: 48,
    height: 48,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  orbGlow: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  orb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: 0,
    alignSelf: "stretch",
    justifyContent: "center",
    gap: 7,
  },
  labelRow: {
    minHeight: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  premiumSparkle: {
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  labelSeparator: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  contextLabel: { flex: 1, minWidth: 0 },
  messageCopy: { gap: 4 },
  headline: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    lineHeight: 22,
  },
  message: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    lineHeight: 21,
  },
  signalRail: {
    marginTop: 5,
    paddingTop: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  signalRailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  signalRailLabel: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9.5,
    letterSpacing: 1,
    lineHeight: 13,
  },
  signalRailSource: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10,
    lineHeight: 14,
  },
  signalItems: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 9,
  },
  signalItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  signalDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 1,
  },
  signalIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(86,179,148,0.08)",
    borderColor: "rgba(86,179,148,0.16)",
  },
  signalCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  signalLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 9,
    lineHeight: 12,
  },
  signalValue: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
    lineHeight: 15,
  },
  chevron: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(86,179,148,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  loadingCopy: { gap: NuraiSpace.xs },
  skeletonLine: { width: "94%", height: 12, borderRadius: 6 },
  skeletonLineShort: { width: "68%" },
  action: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
  },
  actionText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    lineHeight: 22,
  },
  actionPressed: { opacity: 0.68 },
  sourceNote: {
    marginTop: NuraiSpace.xs,
    paddingTop: NuraiSpace.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(184,194,189,0.12)",
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
});
