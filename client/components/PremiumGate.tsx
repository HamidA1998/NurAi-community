import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/context/SubscriptionContext";
import { hasAccess, type PlanTier } from "@/config/entitlements";
import { Spacing, BorderRadius } from "@/constants/theme";
import { AppIcon } from "@/components/icons";

interface PremiumGateProps {
  requiredTier: PlanTier;
  featureLabel?: string;
  upgradeMessage?: string;
  children: React.ReactNode;
  mode?: "overlay" | "replace" | "inline";
}

export function PremiumGate({
  requiredTier,
  featureLabel,
  upgradeMessage,
  children,
  mode = "overlay",
}: PremiumGateProps) {
  const { currentPlan } = useSubscription();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  if (hasAccess(currentPlan, requiredTier)) {
    return <>{children}</>;
  }

  const tierLabel = requiredTier === "scholar" ? "Scholar" : "Premium";
  const tierColor = requiredTier === "scholar" ? theme.scholar : theme.primary;
  const tierSoft =
    requiredTier === "scholar" ? theme.scholarSoft : theme.primarySubtle;
  const tierBorder =
    requiredTier === "scholar" ? `${theme.scholar}40` : theme.primaryBorder;
  const tierGradient: [string, string] =
    requiredTier === "scholar"
      ? [theme.scholar, theme.secondary]
      : [theme.primary, theme.gradientEnd];
  const defaultFeatureLabel =
    requiredTier === "scholar"
      ? "Scholar study tools"
      : "Premium learning tools";
  const defaultUpgradeMessage =
    requiredTier === "scholar"
      ? "Unlock deeper source-aware study, longer explanations, and advanced learning support."
      : "Unlock deeper guidance, more practice tools, and saved learning support across NurAI.";
  const upgradeCta = `See ${tierLabel} plans`;
  const tierIcon = requiredTier === "scholar" ? "award" : "star";

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Subscription", {
      initialTab: requiredTier === "scholar" ? "scholar" : "premium",
      featureLabel: featureLabel || defaultFeatureLabel,
    });
  };

  if (mode === "inline") {
    return (
      <Animated.View entering={FadeIn.duration(200)}>
        <Pressable
          onPress={handleUpgrade}
          style={[
            styles.inlineBadge,
            {
              backgroundColor: tierSoft,
              borderColor: tierBorder,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${upgradeCta} for ${featureLabel || defaultFeatureLabel}`}
        >
          <AppIcon name={tierIcon} size={12} color={tierColor} />
          <ThemedText style={[styles.inlineText, { color: tierColor }]}>
            {tierLabel}
          </ThemedText>
        </Pressable>
      </Animated.View>
    );
  }

  if (mode === "overlay") {
    return (
      <View style={styles.overlayContainer}>
        {children}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.overlayGradientWrap}
        >
          <Pressable
            style={styles.overlayBlocker}
            onPress={handleUpgrade}
            accessibilityRole="button"
            accessibilityLabel={`${upgradeCta} for ${featureLabel || defaultFeatureLabel}`}
          >
            <LinearGradient
              colors={[
                "transparent",
                "rgba(0,0,0,0.08)",
                "rgba(0,0,0,0.35)",
                "rgba(0,0,0,0.6)",
              ]}
              locations={[0, 0.3, 0.6, 1]}
              style={styles.overlayGradient}
              pointerEvents="none"
            />
          </Pressable>
          <View style={styles.overlayCtaContainer} pointerEvents="box-none">
            <Pressable
              onPress={handleUpgrade}
              style={({ pressed }) => [pressed ? { opacity: 0.9 } : null]}
              accessibilityRole="button"
              accessibilityLabel={`${upgradeCta} for ${featureLabel || defaultFeatureLabel}`}
            >
              <View
                style={[
                  styles.overlayCard,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: tierBorder,
                  },
                ]}
              >
                <View style={styles.overlayCardRow}>
                  <View
                    style={[
                      styles.overlayIconCircle,
                      { backgroundColor: tierSoft },
                    ]}
                  >
                    <AppIcon name={tierIcon} size={18} color={tierColor} />
                  </View>
                  <View style={styles.overlayCardText}>
                    <ThemedText style={styles.overlayTitle}>
                      {featureLabel || defaultFeatureLabel}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.overlaySubtitle,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {upgradeMessage || defaultUpgradeMessage}
                    </ThemedText>
                  </View>
                </View>
                <LinearGradient
                  colors={tierGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.overlayUpgradeBtn}
                >
                  <AppIcon name="zap" size={14} color="#FFFFFF" />
                  <ThemedText
                    style={[
                      styles.overlayUpgradeText,
                      {
                        color: "#FFFFFF",
                      },
                    ]}
                  >
                    {upgradeCta}
                  </ThemedText>
                </LinearGradient>
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={[
        styles.replaceContainer,
        { backgroundColor: theme.surfaceGlass, borderColor: tierBorder },
      ]}
    >
      <View
        style={[
          styles.replaceLockCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: tierBorder,
          },
        ]}
      >
        <View style={[styles.lockIconCircle, { backgroundColor: tierSoft }]}>
          <AppIcon name={tierIcon} size={28} color={tierColor} />
        </View>
        <ThemedText type="h3" style={styles.lockTitle}>
          {featureLabel || defaultFeatureLabel}
        </ThemedText>
        <ThemedText
          style={[styles.lockMessage, { color: theme.textSecondary }]}
        >
          {upgradeMessage || defaultUpgradeMessage}
        </ThemedText>
        <Pressable
          onPress={handleUpgrade}
          style={styles.buttonWrapper}
          accessibilityRole="button"
          accessibilityLabel={`${upgradeCta} for ${featureLabel || defaultFeatureLabel}`}
        >
          <LinearGradient
            colors={tierGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeButton}
          >
            <AppIcon name="zap" size={16} color="#FFFFFF" />
            <ThemedText
              style={[
                styles.upgradeText,
                {
                  color: "#FFFFFF",
                },
              ]}
            >
              {upgradeCta}
            </ThemedText>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export function PremiumBadge({ tier }: { tier: PlanTier }) {
  const { theme } = useTheme();
  if (tier === "free") return null;
  const color = tier === "scholar" ? theme.scholar : theme.primary;
  const backgroundColor =
    tier === "scholar" ? theme.scholarSoft : theme.primarySubtle;
  const borderColor =
    tier === "scholar" ? `${theme.scholar}40` : theme.primaryBorder;
  const label = tier === "scholar" ? "Scholar" : "Premium";
  const icon = tier === "scholar" ? "award" : "star";
  return (
    <View style={[styles.badge, { backgroundColor, borderColor }]}>
      <AppIcon name={icon} size={9} color={color} />
      <ThemedText style={[styles.badgeText, { color }]}>{label}</ThemedText>
    </View>
  );
}

export function useFeatureAccess(requiredTier: PlanTier) {
  const { currentPlan } = useSubscription();
  return {
    hasAccess: hasAccess(currentPlan, requiredTier),
    currentPlan,
    requiredTier,
  };
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    position: "relative",
  },
  overlayGradientWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: "flex-end",
  },
  overlayBlocker: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayCtaContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  overlayCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  overlayCardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  overlayIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  overlayCardText: {
    flex: 1,
  },
  overlayTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
    letterSpacing: 0,
  },
  overlaySubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  overlayUpgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    gap: 6,
  },
  overlayUpgradeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0,
  },
  replaceContainer: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    minHeight: 260,
  },
  replaceLockCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: "center",
    width: "85%",
    maxWidth: 340,
  },
  lockIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  lockTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
    letterSpacing: 0,
  },
  lockMessage: {
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 20,
    fontSize: 14,
  },
  buttonWrapper: {
    width: "100%",
    maxWidth: 280,
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  upgradeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0,
  },
  inlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  inlineText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0,
  },
});
