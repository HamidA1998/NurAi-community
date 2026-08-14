import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Spacing, BorderRadius } from "@/constants/theme";
import { AppIcon } from "@/components/icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { FamilyLiveMap, FamilyLiveMapPoint } from "@/components/FamilyLiveMap";

interface FamilyLiveViewProps {
  points: FamilyLiveMapPoint[];
  lastRefreshedAt: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onShareLocation: () => void;
}

function formatRefreshTime(value: string | null): string {
  if (!value) return "Waiting for the first refresh";
  return `Updated ${new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function FamilyLiveView({
  points,
  lastRefreshedAt,
  isRefreshing,
  onRefresh,
  onShareLocation,
}: FamilyLiveViewProps) {
  const { theme } = useTheme();
  const currentUserIsSharing = points.some((point) => point.isCurrentUser);

  return (
    <View testID="family-live-view">
      <View
        style={[
          styles.privacyCard,
          {
            backgroundColor: theme.surfaceGlass,
            borderColor: theme.borderSubtle,
          },
        ]}
      >
        <View
          style={[styles.privacyIcon, { backgroundColor: theme.primaryMuted }]}
        >
          <AppIcon name="shield" size={17} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="small" style={{ fontWeight: "800" }}>
            Live when you choose
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, marginTop: 3, lineHeight: 18 }}
          >
            Only active one-hour shares appear here. NurAI does not follow your
            family in the background. There is no location timeline.
          </ThemedText>
        </View>
      </View>

      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.eyebrowRow}>
            <View
              style={[styles.liveDot, { backgroundColor: theme.primary }]}
            />
            <ThemedText
              type="caption"
              style={{
                color: theme.primary,
                fontWeight: "800",
                letterSpacing: 1,
              }}
            >
              LIVE VIEW
            </ThemedText>
          </View>
          <ThemedText type="h4" style={{ marginTop: 4 }}>
            Where your circle is now
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, marginTop: 3 }}
          >
            {points.length > 0
              ? `${points.length} member${points.length === 1 ? "" : "s"} sharing · refreshes while open`
              : "No one is sharing a live location right now."}
          </ThemedText>
        </View>
        <Pressable
          onPress={onRefresh}
          disabled={isRefreshing}
          style={({ pressed }) => [
            styles.refreshButton,
            {
              borderColor: theme.borderSubtle,
              backgroundColor: theme.surfaceGlass,
              opacity: pressed || isRefreshing ? 0.65 : 1,
            },
          ]}
          testID="button-family-live-refresh"
          accessibilityRole="button"
          accessibilityLabel="Refresh live family locations"
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <AppIcon name="refresh-cw" size={16} color={theme.primary} />
          )}
        </Pressable>
      </View>

      <FamilyLiveMap
        points={points}
        backgroundColor={theme.surfaceElevated}
        borderColor={theme.borderSubtle}
        textColor={theme.text}
        mutedTextColor={theme.textMuted}
        accentColor={theme.primary}
      />

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <AppIcon name="clock" size={14} color={theme.textMuted} />
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            {formatRefreshTime(lastRefreshedAt)}
          </ThemedText>
        </View>
        <View style={styles.metaItem}>
          <AppIcon name="lock" size={14} color={theme.textMuted} />
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Shared by choice
          </ThemedText>
        </View>
      </View>

      {points.length > 0 ? (
        <View style={styles.memberList}>
          <ThemedText
            type="caption"
            style={{
              color: theme.textMuted,
              fontWeight: "800",
              letterSpacing: 1,
            }}
          >
            SHARING NOW
          </ThemedText>
          {points.map((point) => (
            <View
              key={point.id}
              style={[styles.memberRow, { borderColor: theme.borderSubtle }]}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: point.isCurrentUser
                      ? theme.primaryMuted
                      : theme.scholarSoft,
                    borderColor: point.isCurrentUser
                      ? theme.primaryBorder
                      : `${theme.scholar}55`,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: point.isCurrentUser ? theme.primary : theme.scholar,
                    fontWeight: "800",
                  }}
                >
                  {point.displayName.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={{ fontWeight: "800" }}>
                  {point.isCurrentUser ? "You" : point.displayName}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, marginTop: 2 }}
                  numberOfLines={1}
                >
                  {point.locationLabel}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.sharePill,
                  { backgroundColor: theme.primaryMuted },
                ]}
              >
                <View
                  style={[styles.liveDot, { backgroundColor: theme.primary }]}
                />
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "800" }}
                >
                  1 hr
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={onShareLocation}
        style={({ pressed }) => [
          styles.shareButton,
          {
            backgroundColor: theme.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        testID="button-family-live-share"
        accessibilityRole="button"
        accessibilityLabel={
          currentUserIsSharing
            ? "Refresh my shared location for one hour"
            : "Share my location for one hour"
        }
      >
        <AppIcon name="navigation" size={17} color={theme.buttonText} />
        <ThemedText
          type="small"
          style={{ color: theme.buttonText, fontWeight: "800" }}
        >
          {currentUserIsSharing
            ? "Refresh my share for 1 hour"
            : "Share my location for 1 hour"}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  privacyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  privacyIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  memberList: {
    marginTop: Spacing.md,
  },
  memberRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sharePill: {
    minHeight: 28,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  shareButton: {
    minHeight: 48,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
