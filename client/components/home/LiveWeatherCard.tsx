import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import type { LiveWeatherSnapshot } from "@/services/weatherService";
import { AppIcon, type AppIconName } from "@/components/icons";

type Props = {
  weather: LiveWeatherSnapshot | null;
  loading: boolean;
  gpsLoading: boolean;
  error: string | null;
  locationLabel: string;
  nextPrayerName?: string;
  minutesToNextPrayer?: number | null;
  onRefresh: () => void;
  onUseGps: () => void;
  style?: StyleProp<ViewStyle>;
};

function weatherIconName(weather: LiveWeatherSnapshot | null): AppIconName {
  if (!weather) return "cloud";
  const code = weather.weatherCode;
  if (code === 0) return weather.isDay ? "sun" : "moon";
  if ([1, 2, 3].includes(code)) return "cloud";
  if ([45, 48].includes(code)) return "cloud";
  if ([51, 53, 55, 56, 57].includes(code)) return "cloud-drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "cloud-rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "cloud-snow";
  if ([95, 96, 99].includes(code)) return "cloud-lightning";
  return "cloud";
}

function formatUpdatedAt(value?: string) {
  if (!value) return "Ready when refreshed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Updated just now";
  return `Updated ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatPrayerName(name?: string) {
  if (!name) return "salah";
  if (name === "dhuhr") return "Dhuhr";
  if (name === "asr") return "Asr";
  if (name === "maghrib") return "Maghrib";
  if (name === "isha") return "Isha";
  if (name === "fajr") return "Fajr";
  if (name === "sunrise") return "Sunrise";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatPrayerEta(minutes?: number | null) {
  if (minutes === null || minutes === undefined) return null;
  if (minutes <= 0) return "now";
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
}

function weatherGuidance(
  weather: LiveWeatherSnapshot | null,
  nextPrayerName?: string,
) {
  if (!weather) return "Live local conditions will appear here.";
  const rainChance = weather.nextThreeHourPrecipitationProbability ?? 0;
  const prayer = formatPrayerName(nextPrayerName);
  if (rainChance >= 60 || weather.precipitationMm > 0.2) {
    return `Rain is likely before ${prayer}. Take rain gear for the masjid trip.`;
  }
  if (weather.temperatureC >= 30) {
    return `Hot conditions today. Keep water nearby before ${prayer} and avoid rushing.`;
  }
  if (weather.temperatureC <= 2) {
    return `Cold conditions before ${prayer}. Dress warmly and leave a little earlier.`;
  }
  if (weather.windKmh >= 40 || weather.windGustKmh >= 55) {
    return `Windy conditions. Give yourself extra travel time before ${prayer}.`;
  }
  if (weather.isDay) {
    return `Good conditions for ${prayer}, the masjid, or a short reflective walk.`;
  }
  return `A calm night check before ${prayer}, rest, and tomorrow's plan.`;
}

export function LiveWeatherCard({
  weather,
  loading,
  gpsLoading,
  error,
  locationLabel,
  nextPrayerName,
  minutesToNextPrayer,
  onRefresh,
  onUseGps,
  style,
}: Props) {
  const { theme, isDark } = useTheme();
  const iconName = weatherIconName(weather);
  const rainChance = weather?.nextThreeHourPrecipitationProbability ?? null;
  const updatedText = useMemo(
    () => formatUpdatedAt(weather?.fetchedAt),
    [weather?.fetchedAt],
  );
  const prayerEta = formatPrayerEta(minutesToNextPrayer);
  const prayerName = formatPrayerName(nextPrayerName);

  const metricItems = [
    {
      icon: "umbrella" as const,
      label: "Rain",
      value: rainChance === null ? "-" : `${rainChance}%`,
    },
    {
      icon: "droplet" as const,
      label: "Humidity",
      value: weather ? `${weather.humidityPercent}%` : "-",
    },
    {
      icon: "wind" as const,
      label: "Wind",
      value: weather ? `${weather.windKmh} km/h` : "-",
    },
  ];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark
            ? theme.surfaceGlass
            : theme.surfaceGlassStrong,
          borderColor: theme.borderSubtle,
        },
        !isDark ? Shadows.softCard : undefined,
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconBubble,
              {
                backgroundColor: theme.primarySubtle,
                borderColor: theme.primaryBorder,
              },
            ]}
          >
            {loading && !weather ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <AppIcon name={iconName} size={21} color={theme.primary} />
            )}
          </View>
          <View style={styles.titleCopy}>
            <ThemedText type="h4">Live Weather</ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{ color: theme.textMuted }}
            >
              {locationLabel}
            </ThemedText>
          </View>
        </View>
        <View style={styles.actionRow}>
          <Pressable
            onPress={onRefresh}
            disabled={loading}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Refresh live weather"
            style={[
              styles.iconButton,
              { borderColor: theme.border, backgroundColor: theme.surface },
              loading ? { opacity: 0.55 } : null,
            ]}
            testID="button-refresh-weather"
          >
            {loading && weather ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <AppIcon name="refresh-cw" size={15} color={theme.icon} />
            )}
          </Pressable>
          <Pressable
            onPress={onUseGps}
            disabled={gpsLoading}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Use current location for weather"
            style={[
              styles.gpsButton,
              {
                borderColor: theme.primaryBorder,
                backgroundColor: theme.primarySubtle,
              },
              gpsLoading ? { opacity: 0.65 } : null,
            ]}
            testID="button-weather-gps"
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <AppIcon name="navigation" size={14} color={theme.primary} />
            )}
            <ThemedText
              type="caption"
              style={[styles.gpsText, { color: theme.primary }]}
            >
              GPS
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.tempBlock}>
          <ThemedText type="hero" style={styles.temperature}>
            {weather ? `${weather.temperatureC}°` : "-"}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            {weather ? `Feels ${weather.feelsLikeC}°C` : updatedText}
          </ThemedText>
        </View>
        <View style={styles.conditionBlock}>
          <ThemedText type="h4" style={styles.conditionText}>
            {weather?.conditionLabel || "Waiting for conditions"}
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.guidanceText, { color: theme.textSecondary }]}
          >
            {error && !weather
              ? error
              : weatherGuidance(weather, nextPrayerName)}
          </ThemedText>
        </View>
      </View>

      <View
        style={[
          styles.prayerWeatherRow,
          {
            backgroundColor: theme.primarySubtle,
            borderColor: theme.primaryBorder,
          },
        ]}
      >
        <AppIcon name="clock" size={14} color={theme.primary} />
        <ThemedText
          type="caption"
          style={[styles.prayerWeatherText, { color: theme.primaryText }]}
          numberOfLines={2}
        >
          {prayerEta
            ? `Next: ${prayerName} ${prayerEta}. Weather guidance updates with your location.`
            : "Weather guidance updates with your local prayer context."}
        </ThemedText>
      </View>

      <View style={styles.metricsRow}>
        {metricItems.map((item) => (
          <View
            key={item.label}
            style={[
              styles.metricPill,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <AppIcon name={item.icon} size={13} color={theme.scholar} />
            <View style={styles.metricCopy}>
              <ThemedText
                type="caption"
                style={[styles.metricLabel, { color: theme.textMuted }]}
              >
                {item.label}
              </ThemedText>
              <ThemedText
                type="small"
                style={styles.metricValue}
                numberOfLines={1}
              >
                {item.value}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footerRow}>
        <ThemedText type="caption" style={{ color: theme.textMuted }}>
          {updatedText}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textMuted }}>
          Weather by Open-Meteo
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.md,
  },
  titleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gpsButton: {
    minHeight: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  gpsText: {
    fontFamily: "PlusJakartaSans_700Bold",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginTop: Spacing.lg,
  },
  tempBlock: {
    minWidth: 96,
  },
  temperature: {
    fontSize: 44,
    lineHeight: 50,
  },
  conditionBlock: {
    flex: 1,
    minWidth: 0,
  },
  conditionText: {
    lineHeight: 22,
  },
  guidanceText: {
    marginTop: 4,
    lineHeight: 18,
  },
  prayerWeatherRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.lg,
  },
  prayerWeatherText: {
    flex: 1,
    minWidth: 0,
    fontFamily: "PlusJakartaSans_600SemiBold",
    lineHeight: 17,
  },
  metricsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  metricPill: {
    flex: 1,
    minWidth: 0,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metricLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  metricValue: {
    fontFamily: "PlusJakartaSans_700Bold",
    lineHeight: 17,
    flexShrink: 1,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  metricCopy: {
    flex: 1,
    minWidth: 0,
  },
});
