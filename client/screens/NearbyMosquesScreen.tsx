import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  TextInput,
  Modal,
  FlatList,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  CategoryColors,
  Fonts,
} from "@/constants/theme";
import { GeometricCardPattern } from "@/components/premium/svg/PremiumSvgs";
import {
  useLocation,
  POPULAR_CITIES,
  UserLocation,
} from "@/context/LocationContext";
import { getApiUrl } from "@/lib/query-client";
import { Aurora, NuraiGlass } from "@/design-system";
import { AppIcon } from "@/components/icons";

interface NearbyPlace {
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
  address?: string;
  rating?: number | null;
  totalRatings?: number;
  openNow?: boolean | null;
  placeId?: string;
  confidenceLabel?: string;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

function mapSourceLabel(label?: string): string | undefined {
  if (!label) return undefined;
  if (/provider place result/i.test(label)) return "Live map result";
  if (/provider/i.test(label)) return label.replace(/provider/gi, "map");
  return label;
}

function openDirections(latitude: number, longitude: number, name: string) {
  const encodedName = encodeURIComponent(name);
  const url = Platform.select({
    ios: `maps://app?daddr=${latitude},${longitude}&q=${encodedName}`,
    android: `google.navigation:q=${latitude},${longitude}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${encodedName}`,
  });
  if (url) {
    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      );
    });
  }
}

function buildManualSearchUrl(
  type: "mosque" | "halal",
  city: string,
  country: string,
  latitude: number,
  longitude: number,
): string {
  const intent = type === "mosque" ? "mosques" : "halal food";
  const locationLabel = [city, country].filter(Boolean).join(", ");
  const location = locationLabel || `${latitude},${longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${intent} near ${location}`)}`;
}

type TabType = "mosques" | "halal";
const SHOW_EXTENDED_NEARBY_GUIDANCE = false;
type PlacesServerResponse = {
  results: any[];
  fallback: boolean;
  error?: string;
  message?: string;
  providerStatus?: string | null;
};

class PlacesProviderError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "PlacesProviderError";
    this.code = code;
  }
}

function buildMosqueQuery(lat: number, lng: number): string {
  return `[out:json][timeout:10];(node["amenity"="place_of_worship"]["religion"="muslim"](around:10000,${lat},${lng});way["amenity"="place_of_worship"]["religion"="muslim"](around:10000,${lat},${lng}););out center body;`;
}

function buildHalalQuery(lat: number, lng: number): string {
  const halalNamePattern =
    "halal|kebab|shawarma|doner|donner|peri peri|piri piri|grill|chicken|burger|biryani|karahi|lahori|desi|pakistani|turkish|lebanese|arabic|afghan|middle eastern|indian|bangladeshi|bengali";
  return `[out:json][timeout:20];(node["diet:halal"="yes"](around:25000,${lat},${lng});way["diet:halal"="yes"](around:25000,${lat},${lng});node["cuisine"~"halal",i](around:25000,${lat},${lng});way["cuisine"~"halal",i](around:25000,${lat},${lng});node["diet:halal"="only"](around:25000,${lat},${lng});way["diet:halal"="only"](around:25000,${lat},${lng});node["amenity"~"restaurant|fast_food|cafe|food_court|ice_cream"]["cuisine"~"${halalNamePattern}",i](around:25000,${lat},${lng});way["amenity"~"restaurant|fast_food|cafe|food_court|ice_cream"]["cuisine"~"${halalNamePattern}",i](around:25000,${lat},${lng});node["amenity"~"restaurant|fast_food|cafe|food_court|ice_cream"]["name"~"${halalNamePattern}",i](around:25000,${lat},${lng});way["amenity"~"restaurant|fast_food|cafe|food_court|ice_cream"]["name"~"${halalNamePattern}",i](around:25000,${lat},${lng}););out center body;`;
}

function parseOverpassResults(
  data: any,
  userLat: number,
  userLng: number,
  fallbackName = "Place",
): NearbyPlace[] {
  if (!data || !data.elements) return [];
  const seen = new Set<string>();
  const places: NearbyPlace[] = [];
  for (const el of data.elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const name = el.tags?.name || fallbackName;
    const key = `${name}-${lat.toFixed(5)}-${lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const distance = haversineDistance(userLat, userLng, lat, lng);
    places.push({ name, latitude: lat, longitude: lng, distance });
  }
  places.sort((a, b) => a.distance - b.distance);
  return places.slice(0, 20);
}

async function fetchOverpassData(query: string): Promise<any> {
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function fetchFromServer(
  lat: number,
  lng: number,
  type: "mosque" | "halal",
): Promise<PlacesServerResponse> {
  const baseUrl = getApiUrl();
  const url = new URL(`/api/places/nearby`, baseUrl);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lng", String(lng));
  url.searchParams.set("type", type);
  url.searchParams.set("radius", type === "halal" ? "25000" : "10000");
  const response = await fetch(url.toString(), { credentials: "include" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PlacesProviderError(
      body?.message || `Server request failed: ${response.status}`,
      body?.error,
    );
  }
  return body;
}

function isProductionProviderError(
  error: unknown,
): error is PlacesProviderError {
  return (
    error instanceof PlacesProviderError &&
    !__DEV__ &&
    (error.code === "places_provider_unconfigured" ||
      error.code === "places_provider_error")
  );
}

function productionPlacesMessage(type: "mosque" | "halal") {
  return type === "mosque"
    ? "Live mosque search needs a moment. You can retry, or open Maps and search from your selected location."
    : "Live halal search needs a moment. You can retry, or open Maps and confirm details before travelling.";
}

function parseGoogleResults(
  results: any[],
  userLat: number,
  userLng: number,
): NearbyPlace[] {
  return results
    .filter((r: any) => r.latitude != null && r.longitude != null)
    .map((r: any) => ({
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      distance: haversineDistance(userLat, userLng, r.latitude, r.longitude),
      address: r.address,
      rating: r.rating,
      totalRatings: r.totalRatings,
      openNow: r.openNow,
      placeId: r.placeId,
      confidenceLabel: r.confidenceLabel,
    }))
    .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance)
    .slice(0, 25);
}

export default function NearbyMosquesScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { location, setLocation, detectGPSLocation, gpsLoading } =
    useLocation();

  const [searchLat, setSearchLat] = useState(location.latitude);
  const [searchLng, setSearchLng] = useState(location.longitude);
  const [searchCity, setSearchCity] = useState(location.cityName);
  const [searchCountry, setSearchCountry] = useState(location.countryName);
  const [usingGPS, setUsingGPS] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>(
    route.params?.initialTab === "halal" ? "halal" : "mosques",
  );
  const [mosques, setMosques] = useState<NearbyPlace[]>([]);
  const [halalPlaces, setHalalPlaces] = useState<NearbyPlace[]>([]);
  const [loadingMosques, setLoadingMosques] = useState(false);
  const [loadingHalal, setLoadingHalal] = useState(false);
  const [mosquesError, setMosquesError] = useState<string | null>(null);
  const [halalError, setHalalError] = useState<string | null>(null);
  const [mosquesFetched, setMosquesFetched] = useState(false);
  const [halalFetched, setHalalFetched] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [citySearch, setCitySearch] = useState("");

  const filteredCities =
    citySearch.trim().length > 0
      ? POPULAR_CITIES.filter(
          (c) =>
            c.cityName.toLowerCase().includes(citySearch.toLowerCase()) ||
            c.countryName.toLowerCase().includes(citySearch.toLowerCase()),
        )
      : POPULAR_CITIES;

  const handleUseGPS = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const detected = await detectGPSLocation();
    if (detected) {
      setSearchLat(detected.latitude);
      setSearchLng(detected.longitude);
      setSearchCity(detected.cityName);
      setSearchCountry(detected.countryName);
      setUsingGPS(true);
      setMosquesFetched(false);
      setHalalFetched(false);
      setShowLocationPicker(false);
    }
  }, [detectGPSLocation]);

  const handleSelectCity = useCallback(
    async (city: UserLocation) => {
      Haptics.selectionAsync();
      await setLocation(city);
      setSearchLat(city.latitude);
      setSearchLng(city.longitude);
      setSearchCity(city.cityName);
      setSearchCountry(city.countryName);
      setUsingGPS(false);
      setMosquesFetched(false);
      setHalalFetched(false);
      setShowLocationPicker(false);
    },
    [setLocation],
  );

  const openManualSearch = useCallback(
    (
      type: "mosque" | "halal" = activeTab === "mosques" ? "mosque" : "halal",
    ) => {
      const url = buildManualSearchUrl(
        type,
        searchCity,
        searchCountry,
        searchLat,
        searchLng,
      );
      Linking.openURL(url).catch(() => undefined);
    },
    [activeTab, searchCity, searchCountry, searchLat, searchLng],
  );

  const fetchFallbackPlaces = useCallback(
    async (type: "mosque" | "halal") => {
      const query =
        type === "mosque"
          ? buildMosqueQuery(searchLat, searchLng)
          : buildHalalQuery(searchLat, searchLng);
      const data = await fetchOverpassData(query);
      return parseOverpassResults(
        data,
        searchLat,
        searchLng,
        type === "mosque" ? "Masjid" : "Halal place",
      ).map((place) => ({
        ...place,
        confidenceLabel:
          type === "halal" ? "Open map lead" : "Open map place result",
      }));
    },
    [searchLat, searchLng],
  );

  const fetchMosques = useCallback(async () => {
    setLoadingMosques(true);
    setMosquesError(null);
    try {
      const serverData = await fetchFromServer(searchLat, searchLng, "mosque");
      if (serverData.results.length > 0) {
        setMosques(
          parseGoogleResults(serverData.results, searchLat, searchLng),
        );
        setMosquesFetched(true);
        return;
      }
      const results = await fetchFallbackPlaces("mosque");
      setMosques(results);
      setMosquesFetched(true);
    } catch (error) {
      try {
        const results = await fetchFallbackPlaces("mosque");
        setMosques(results);
        setMosquesFetched(true);
      } catch {
        setMosquesError(
          isProductionProviderError(error)
            ? productionPlacesMessage("mosque")
            : "We could not load nearby mosques right now. You can retry or open Maps.",
        );
        setMosquesFetched(true);
      }
    } finally {
      setLoadingMosques(false);
    }
  }, [fetchFallbackPlaces, searchLat, searchLng]);

  const fetchHalal = useCallback(async () => {
    setLoadingHalal(true);
    setHalalError(null);
    try {
      const serverData = await fetchFromServer(searchLat, searchLng, "halal");
      if (serverData.results.length > 0) {
        setHalalPlaces(
          parseGoogleResults(serverData.results, searchLat, searchLng),
        );
        setHalalFetched(true);
        return;
      }
      const results = await fetchFallbackPlaces("halal");
      setHalalPlaces(results);
      setHalalFetched(true);
    } catch (error) {
      try {
        const results = await fetchFallbackPlaces("halal");
        setHalalPlaces(results);
        setHalalFetched(true);
      } catch {
        setHalalError(
          isProductionProviderError(error)
            ? productionPlacesMessage("halal")
            : "We could not load nearby halal places right now. You can retry or open Maps.",
        );
        setHalalFetched(true);
      }
    } finally {
      setLoadingHalal(false);
    }
  }, [fetchFallbackPlaces, searchLat, searchLng]);

  useEffect(() => {
    if (!mosquesFetched) fetchMosques();
  }, [mosquesFetched, fetchMosques]);

  useEffect(() => {
    if (route.params?.initialTab === "halal") {
      setActiveTab("halal");
    } else if (route.params?.initialTab === "mosques") {
      setActiveTab("mosques");
    }
  }, [route.params?.initialTab]);

  useEffect(() => {
    if (activeTab === "halal" && !halalFetched && !loadingHalal) {
      fetchHalal();
    }
  }, [activeTab, halalFetched, loadingHalal, fetchHalal]);

  const handleRefresh = useCallback(() => {
    if (activeTab === "mosques") {
      setMosquesFetched(false);
    } else {
      setHalalFetched(false);
    }
  }, [activeTab]);

  const emerald = isDark ? CategoryColors.emerald.dark : CategoryColors.emerald;
  const activeResults = activeTab === "mosques" ? mosques : halalPlaces;
  const activeLoading = activeTab === "mosques" ? loadingMosques : loadingHalal;
  const activeFetched = activeTab === "mosques" ? mosquesFetched : halalFetched;
  const activeError = activeTab === "mosques" ? mosquesError : halalError;
  const activeLabel = activeTab === "mosques" ? "Masjids" : "Halal food";
  const activeSearchDepth =
    activeTab === "mosques" ? "Live map results" : "Broad map results";
  const activeHint =
    activeTab === "mosques"
      ? "Directions are live. Verify jama'ah and Jummah times with the masjid."
      : "Restaurants, takeaways, and food leads from provider/map data. Confirm halal status before relying on them.";
  const activeFinderState = activeLoading
    ? "Searching live sources"
    : activeError
      ? "Maps fallback ready"
      : activeFetched
        ? `${activeResults.length} ${activeResults.length === 1 ? "result" : "results"}`
        : "Ready to scan";
  const activeNextMove =
    activeError || (activeFetched && activeResults.length === 0)
      ? activeTab === "halal"
        ? {
            icon: "external-link" as const,
            title: "Open a wider halal search",
            body: "Provider data can be thin. Use Maps, then confirm halal status, prep, and opening times directly.",
            action: "Open Maps",
          }
        : {
            icon: "crosshair" as const,
            title: "Use exact location or Maps",
            body: "Masjid tags can be sparse. GPS gives the best nearby scan, and Maps is ready as a safe fallback.",
            action: "Use GPS",
          }
      : activeTab === "halal"
        ? {
            icon: "shield" as const,
            title: "Treat results as leads",
            body: "NurAI can surface likely options, but halal status should still be confirmed before relying on a place.",
            action: "Open Maps",
          }
        : {
            icon: "clock" as const,
            title: "Confirm prayer details",
            body: "Before travelling, check jama'ah, Jummah, access, and facilities with the masjid directly.",
            action: "Open Maps",
          };
  const reliabilitySignals =
    activeTab === "halal"
      ? [
          { icon: "layers" as const, label: "Wide scan", value: "25 km" },
          { icon: "shield" as const, label: "Halal check", value: "Confirm" },
          { icon: "external-link" as const, label: "Fallback", value: "Maps" },
        ]
      : [
          {
            icon: "crosshair" as const,
            label: "Best with GPS",
            value: "Local",
          },
          { icon: "clock" as const, label: "Jama'ah", value: "Confirm" },
          { icon: "navigation" as const, label: "Directions", value: "Ready" },
        ];

  const renderPlaceCard = (place: NearbyPlace, index: number) => {
    const sourceLabel = mapSourceLabel(place.confidenceLabel);
    return (
      <Animated.View
        key={`${place.name}-${place.latitude}-${index}`}
        entering={FadeInDown.delay(index * 60).duration(400)}
      >
        <View
          style={[
            styles.mosqueCard,
            { backgroundColor: theme.surfaceGlass, borderColor: theme.border },
          ]}
        >
          <GeometricCardPattern color={emerald.text} opacity={0.012} />
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: emerald.bg }]}>
              <AppIcon
                name={activeTab === "mosques" ? "map-pin" : "coffee"}
                size={20}
                color={emerald.text}
              />
            </View>
            <View style={styles.cardTitleArea}>
              <ThemedText type="h4" style={styles.mosqueName}>
                {place.name}
              </ThemedText>
            </View>
            <View
              style={[styles.distanceBadge, { backgroundColor: emerald.bg }]}
            >
              <AppIcon
                name="navigation"
                size={12}
                color={emerald.text}
                style={{ marginRight: 4 }}
              />
              <ThemedText
                style={[styles.distanceText, { color: emerald.text }]}
              >
                {formatDistance(place.distance)}
              </ThemedText>
            </View>
          </View>

          {place.address ||
          place.rating != null ||
          place.openNow != null ||
          sourceLabel ? (
            <View
              style={{
                paddingHorizontal: Spacing.sm,
                paddingBottom: Spacing.sm,
              }}
            >
              {sourceLabel ? (
                <View
                  style={[
                    styles.placeSourcePill,
                    {
                      backgroundColor: `${theme.primary}12`,
                      borderColor: `${theme.primary}24`,
                    },
                  ]}
                >
                  <AppIcon
                    name={activeTab === "halal" ? "check-circle" : "map"}
                    size={12}
                    color={theme.primary}
                  />
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{
                      color: theme.primary,
                      fontWeight: "900",
                    }}
                  >
                    {sourceLabel}
                  </ThemedText>
                </View>
              ) : null}
              {place.address ? (
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textMuted,
                    marginTop: sourceLabel ? Spacing.xs : 0,
                    marginBottom: 2,
                  }}
                >
                  {place.address}
                </ThemedText>
              ) : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: Spacing.sm,
                }}
              >
                {place.rating != null ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <AppIcon name="star" size={12} color="#F59E0B" />
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      {place.rating.toFixed(1)} ({place.totalRatings || 0})
                    </ThemedText>
                  </View>
                ) : null}
                {place.openNow != null ? (
                  <ThemedText
                    type="caption"
                    style={{
                      color: place.openNow ? theme.primary : "#EF4444",
                      fontWeight: "600",
                    }}
                  >
                    {place.openNow ? "Open Now" : "Closed"}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          ) : null}

          <View
            style={[
              styles.confidenceStrip,
              {
                backgroundColor:
                  activeTab === "halal"
                    ? `${theme.scholar}10`
                    : `${theme.primary}10`,
                borderColor:
                  activeTab === "halal"
                    ? `${theme.scholar}28`
                    : `${theme.primary}24`,
              },
            ]}
          >
            <AppIcon
              name={activeTab === "halal" ? "shield" : "clock"}
              size={14}
              color={activeTab === "halal" ? theme.scholar : theme.primary}
            />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, flex: 1 }}
            >
              {activeTab === "halal"
                ? "Halal lead. Confirm certification, ingredients, prep, and opening times before relying on it."
                : "Check prayer-space access, jama'ah, and Jummah times with the masjid directly."}
            </ThemedText>
          </View>

          <View style={styles.cardActions}>
            <Pressable
              onPress={() =>
                openDirections(place.latitude, place.longitude, place.name)
              }
              style={({ pressed }) => [pressed ? { opacity: 0.85 } : null]}
              testID={`directions-${index}`}
            >
              <LinearGradient
                colors={[theme.primary, theme.gradientStart]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.directionsButton}
              >
                <AppIcon name="navigation" size={16} color="#FFFFFF" />
                <ThemedText style={styles.directionsButtonText}>
                  Get Directions
                </ThemedText>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => openManualSearch()}
              style={({ pressed }) => [
                styles.cardSecondaryButton,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.borderSubtle,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Search ${place.name} in Maps`}
            >
              <AppIcon name="search" size={15} color={theme.primary} />
              <ThemedText
                style={[styles.cardSecondaryText, { color: theme.primary }]}
              >
                Check
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderLoading = () => (
    <View
      style={[
        styles.loadingPanel,
        {
          backgroundColor: theme.surfaceGlass,
          borderColor: theme.borderSubtle,
        },
      ]}
      testID="nearby-live-loading-panel"
    >
      <GeometricCardPattern color={theme.primary} opacity={0.012} />
      <View
        style={[
          styles.loadingOrb,
          {
            backgroundColor: `${theme.primary}12`,
            borderColor: `${theme.primary}30`,
          },
        ]}
      >
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
      <View style={styles.loadingCopy}>
        <Text style={[styles.eyebrow, { color: theme.primary }]}>
          LIVE LOCAL SCAN
        </Text>
        <ThemedText type="h3">
          {activeTab === "halal"
            ? "Finding halal leads nearby"
            : "Finding masjids nearby"}
        </ThemedText>
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, lineHeight: 19, marginTop: 4 }}
        >
          Checking live provider data and safe map fallbacks from your selected
          location.
        </ThemedText>
      </View>
      <View style={styles.loadingPulseRows}>
        {[0, 1, 2].map((item) => (
          <View
            key={item}
            style={[
              styles.loadingPulseRow,
              {
                backgroundColor: `${theme.primary}08`,
                borderColor: `${theme.primary}18`,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );

  const renderDiscoveryAssistPanel = (
    mode: "error" | "empty" | "sparse",
    onRetry?: () => void,
    errorMsg?: string,
  ) => {
    const isHalal = activeTab === "halal";
    const title =
      mode === "sparse"
        ? isHalal
          ? "Want more halal options?"
          : "Need another masjid?"
        : mode === "error"
          ? "Live search needs a moment"
          : isHalal
            ? "No halal places found yet"
            : "No masjids found yet";
    const body =
      mode === "sparse"
        ? isHalal
          ? "Some halal restaurants are not tagged correctly. Broaden the search, use GPS, or open Maps to verify more local options."
          : "Broaden the search with your exact location or open Maps to check prayer spaces nearby."
        : errorMsg ||
          (isHalal
            ? "Try your GPS location, choose a nearby city, or open Maps for a broader manual search."
            : "Try your GPS location, choose a nearby city, or open Maps for a broader manual search.");
    const checklist = isHalal
      ? [
          "Confirm halal status before relying on a result.",
          "Check opening times and delivery-only listings.",
          "Search nearby areas if the city has sparse map tags.",
        ]
      : [
          "Confirm jama'ah and Jummah times directly.",
          "Check access, parking, and women's facilities if needed.",
          "Use GPS if the selected city is too broad.",
        ];
    const planSteps = isHalal
      ? [
          {
            icon: "search" as const,
            title: "Broaden",
            body: "Use Maps for more local restaurants and takeaways.",
          },
          {
            icon: "phone-call" as const,
            title: "Confirm",
            body: "Ask about halal meat, prep, and current opening times.",
          },
          {
            icon: "map-pin" as const,
            title: "Nearby",
            body: "Try the next town if local map tags are thin.",
          },
        ]
      : [
          {
            icon: "crosshair" as const,
            title: "Exact area",
            body: "Use GPS for the closest prayer spaces around you.",
          },
          {
            icon: "clock" as const,
            title: "Times",
            body: "Check jama'ah and Jummah times before travelling.",
          },
          {
            icon: "navigation" as const,
            title: "Route",
            body: "Open Maps for directions, parking, and access.",
          },
        ];

    return (
      <View
        style={[
          styles.discoveryPanel,
          {
            backgroundColor: theme.surfaceGlass,
            borderColor:
              mode === "error" ? `${theme.scholar}36` : theme.borderSubtle,
          },
        ]}
        testID={`nearby-discovery-${mode}`}
      >
        <GeometricCardPattern
          color={mode === "error" ? theme.scholar : theme.primary}
          opacity={0.012}
        />
        <View style={styles.discoveryHeader}>
          <View
            style={[
              styles.emptyIconFrame,
              {
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor:
                  mode === "error"
                    ? `${theme.scholar}14`
                    : `${theme.primary}12`,
                borderColor:
                  mode === "error"
                    ? `${theme.scholar}40`
                    : `${theme.primary}28`,
              },
            ]}
          >
            <AppIcon
              name={
                mode === "error" ? "wifi-off" : isHalal ? "search" : "map-pin"
              }
              size={25}
              color={mode === "error" ? theme.scholar : theme.primary}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText type="h3">{title}</ThemedText>
            <ThemedText
              type="caption"
              style={{
                color: theme.textSecondary,
                marginTop: Spacing.xs,
                lineHeight: 19,
              }}
            >
              {body}
            </ThemedText>
          </View>
        </View>

        <View style={styles.discoveryChecklist}>
          {checklist.map((item) => (
            <View key={item} style={styles.discoveryChecklistRow}>
              <AppIcon
                name="check-circle"
                size={14}
                color={isHalal ? theme.scholar : theme.primary}
              />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
              >
                {item}
              </ThemedText>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.discoveryPlan,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View style={styles.discoveryPlanHeader}>
            <Text style={[styles.eyebrow, { color: theme.scholar }]}>
              SEARCH PLAN
            </Text>
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, flex: 1, textAlign: "right" }}
              numberOfLines={1}
            >
              {searchCity || "Selected area"}
            </ThemedText>
          </View>
          <View style={styles.discoveryPlanGrid}>
            {planSteps.map((step) => (
              <View
                key={step.title}
                style={[
                  styles.discoveryPlanStep,
                  {
                    backgroundColor: `${theme.primary}08`,
                    borderColor: `${theme.primary}18`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.discoveryPlanIcon,
                    {
                      backgroundColor: isHalal
                        ? `${theme.scholar}14`
                        : `${theme.primary}12`,
                    },
                  ]}
                >
                  <AppIcon
                    name={step.icon}
                    size={14}
                    color={isHalal ? theme.scholar : theme.primary}
                  />
                </View>
                <ThemedText
                  type="caption"
                  style={{ fontWeight: "900", color: theme.text }}
                  numberOfLines={1}
                >
                  {step.title}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textMuted,
                    lineHeight: 16,
                    textAlign: "center",
                  }}
                >
                  {step.body}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.discoveryActionGrid}>
          {onRetry ? (
            <Pressable
              onPress={onRetry}
              style={({ pressed }) => [
                styles.discoveryAction,
                {
                  backgroundColor: `${theme.primary}12`,
                  borderColor: `${theme.primary}30`,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Retry live nearby search"
              testID="nearby-retry"
            >
              <AppIcon name="refresh-cw" size={16} color={theme.primary} />
              <ThemedText
                type="caption"
                style={{ color: theme.primary, fontWeight: "900" }}
              >
                Retry
              </ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => {
              setShowLocationPicker(true);
              setCitySearch("");
            }}
            style={({ pressed }) => [
              styles.discoveryAction,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.borderSubtle,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Change nearby search city"
            testID="nearby-change-location"
          >
            <AppIcon name="map" size={16} color={theme.primary} />
            <ThemedText
              type="caption"
              style={{ color: theme.primary, fontWeight: "900" }}
            >
              Change city
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handleUseGPS}
            disabled={gpsLoading}
            style={({ pressed }) => [
              styles.discoveryAction,
              {
                backgroundColor: `${theme.primary}10`,
                borderColor: `${theme.primary}24`,
                opacity: gpsLoading ? 0.58 : pressed ? 0.82 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Use current GPS location for nearby search"
            testID="nearby-empty-use-gps"
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <AppIcon name="crosshair" size={16} color={theme.primary} />
            )}
            <ThemedText
              type="caption"
              style={{ color: theme.primary, fontWeight: "900" }}
            >
              Use GPS
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => openManualSearch()}
            style={({ pressed }) => [
              styles.discoveryAction,
              {
                backgroundColor: `${theme.scholar}12`,
                borderColor: `${theme.scholar}30`,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open broader nearby search in Maps"
            testID={
              mode === "sparse"
                ? "nearby-sparse-manual-maps"
                : "nearby-empty-manual-maps"
            }
          >
            <AppIcon name="external-link" size={16} color={theme.scholar} />
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              Open Maps
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderError = (errorMsg: string, onRetry: () => void) =>
    renderDiscoveryAssistPanel("error", onRetry, errorMsg);

  const renderEmpty = () => renderDiscoveryAssistPanel("empty");

  const renderMosquesTab = () => {
    if (loadingMosques) return renderLoading();
    if (mosquesError)
      return renderError(mosquesError, () => setMosquesFetched(false));
    if (mosques.length === 0) return renderEmpty();
    return (
      <>
        {mosques.map((place, index) => renderPlaceCard(place, index))}
        {mosques.length > 0 && mosques.length < 3
          ? renderDiscoveryAssistPanel("sparse")
          : null}
      </>
    );
  };

  const renderHalalTab = () => {
    if (loadingHalal) return renderLoading();
    if (halalError)
      return renderError(halalError, () => setHalalFetched(false));
    if (halalPlaces.length === 0) return renderEmpty();
    return (
      <>
        {halalPlaces.map((place, index) => renderPlaceCard(place, index))}
        {halalPlaces.length > 0 && halalPlaces.length < 8
          ? renderDiscoveryAssistPanel("sparse")
          : null}
      </>
    );
  };

  const renderCityItem = ({ item }: { item: UserLocation }) => (
    <Pressable
      onPress={() => handleSelectCity(item)}
      style={({ pressed }) => [
        styles.cityItem,
        {
          backgroundColor: pressed ? theme.backgroundSecondary : "transparent",
        },
      ]}
    >
      <View style={[styles.cityFlag, { backgroundColor: emerald.bg }]}>
        <AppIcon name="map-pin" size={16} color={emerald.text} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="small" style={{ fontWeight: "600" }}>
          {item.cityName}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textMuted }}>
          {item.countryName}
        </ThemedText>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Aurora />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? { opacity: 0.6 } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="nearby-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h2">Nearby</ThemedText>
        <Pressable
          onPress={handleRefresh}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? { opacity: 0.6 } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Refresh nearby results"
          testID="button-refresh"
        >
          <AppIcon name="refresh-cw" size={22} color={theme.text} />
        </Pressable>
      </View>

      <Animated.View
        entering={FadeInDown.duration(280)}
        style={[
          styles.nearbyHeroCard,
          {
            backgroundColor: "transparent",
            borderColor: `${theme.primary}34`,
          },
        ]}
      >
        <NuraiGlass
          pointerEvents="none"
          radius={BorderRadius["2xl"]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.heroTopRow}>
          <View
            style={[
              styles.nearbyHeroIcon,
              {
                backgroundColor: `${theme.primary}16`,
                borderColor: `${theme.primary}28`,
              },
            ]}
          >
            <AppIcon
              name={activeTab === "mosques" ? "map-pin" : "coffee"}
              size={22}
              color={theme.primary}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.eyebrow, { color: theme.primary }]}>
              LOCAL DISCOVERY
            </Text>
            <ThemedText type="h3" numberOfLines={1}>
              {activeTab === "mosques"
                ? "Find a place to pray"
                : "Find halal nearby"}
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              {activeTab === "mosques"
                ? "Nearby masjids and directions. Confirm jama'ah and Jummah times before travelling."
                : "Live map leads for nearby food. Confirm halal status and opening times directly."}
            </ThemedText>
          </View>
        </View>
        <View style={styles.nearbyStatsRow}>
          <View
            style={[
              styles.nearbyStatPill,
              {
                backgroundColor: `${theme.primary}12`,
                borderColor: `${theme.primary}30`,
              },
            ]}
          >
            <AppIcon name="search" size={13} color={theme.primary} />
            <Text style={[styles.statPillText, { color: theme.primary }]}>
              {activeLoading
                ? "Searching"
                : activeError
                  ? "Retry ready"
                  : activeFetched
                    ? `${activeResults.length} found`
                    : "Ready"}
            </Text>
          </View>
          <View
            style={[
              styles.nearbyStatPill,
              {
                backgroundColor: `${theme.warning}12`,
                borderColor: `${theme.warning}30`,
              },
            ]}
          >
            <AppIcon name="shield" size={13} color={theme.warning} />
            <Text style={[styles.statPillText, { color: theme.warning }]}>
              Confirm details
            </Text>
          </View>
        </View>
      </Animated.View>

      <Pressable
        onPress={() => {
          setShowLocationPicker(true);
          setCitySearch("");
        }}
        style={[
          styles.locationInfo,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: theme.border,
          },
        ]}
        testID="button-change-location"
      >
        <GeometricCardPattern color={theme.primary} opacity={0.012} />
        <AppIcon name="map-pin" size={16} color={theme.primary} />
        <ThemedText
          style={[styles.locationText, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {usingGPS ? "GPS: " : ""}
          {searchCity}
          {searchCountry ? `, ${searchCountry}` : ""}
        </ThemedText>
        <AppIcon name="chevron-down" size={16} color={theme.textMuted} />
      </Pressable>

      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setActiveTab("mosques")}
          style={({ pressed }) => [pressed ? { opacity: 0.85 } : null]}
          testID="tab-mosques"
        >
          <View
            style={[
              styles.tabButton,
              activeTab === "mosques"
                ? { backgroundColor: theme.primary }
                : {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                    borderWidth: 1,
                  },
            ]}
          >
            <AppIcon
              name="map-pin"
              size={16}
              color={activeTab === "mosques" ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "mosques" ? "#FFFFFF" : theme.textSecondary,
                },
              ]}
            >
              Mosques
            </ThemedText>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("halal")}
          style={({ pressed }) => [pressed ? { opacity: 0.85 } : null]}
          testID="tab-halal"
        >
          <View
            style={[
              styles.tabButton,
              activeTab === "halal"
                ? { backgroundColor: theme.primary }
                : {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                    borderWidth: 1,
                  },
            ]}
          >
            <AppIcon
              name="coffee"
              size={16}
              color={activeTab === "halal" ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "halal" ? "#FFFFFF" : theme.textSecondary,
                },
              ]}
            >
              Halal Food
            </ThemedText>
          </View>
        </Pressable>
      </View>

      <View
        style={[
          styles.resultSummary,
          {
            backgroundColor: "transparent",
            borderColor: theme.borderSubtle,
          },
        ]}
      >
        <NuraiGlass
          pointerEvents="none"
          radius={BorderRadius.xl}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.resultSummaryCopy}>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>
            {activeLabel.toUpperCase()}
          </Text>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginTop: 2 }}
          >
            {activeHint}
          </ThemedText>
          <View
            style={[
              styles.searchDepthPill,
              {
                backgroundColor:
                  activeTab === "halal"
                    ? `${theme.scholar}10`
                    : `${theme.primary}10`,
                borderColor:
                  activeTab === "halal"
                    ? `${theme.scholar}24`
                    : `${theme.primary}24`,
              },
            ]}
            testID="nearby-search-depth"
          >
            <AppIcon
              name={activeTab === "halal" ? "layers" : "crosshair"}
              size={12}
              color={activeTab === "halal" ? theme.scholar : theme.primary}
            />
            <Text
              style={[
                styles.searchDepthText,
                {
                  color: activeTab === "halal" ? theme.scholar : theme.primary,
                },
              ]}
              numberOfLines={1}
            >
              {activeSearchDepth}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => openManualSearch()}
          style={[
            styles.manualSearchButton,
            {
              backgroundColor: `${theme.primary}12`,
              borderColor: `${theme.primary}28`,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Open ${activeLabel} search in Maps`}
        >
          <AppIcon name="external-link" size={14} color={theme.primary} />
          <Text style={[styles.manualSearchText, { color: theme.primary }]}>
            Maps
          </Text>
        </Pressable>
      </View>

      {SHOW_EXTENDED_NEARBY_GUIDANCE ? (
        <>
          <View
            style={[
              styles.finderInsight,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor:
                  activeTab === "halal"
                    ? `${theme.scholar}32`
                    : `${theme.primary}28`,
              },
            ]}
            testID="nearby-finder-insight"
          >
            <LinearGradient
              colors={[
                activeTab === "halal"
                  ? `${theme.scholar}14`
                  : `${theme.primary}12`,
                "transparent",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.finderInsightGlow}
            />
            <View
              style={[
                styles.finderInsightIcon,
                {
                  backgroundColor:
                    activeTab === "halal"
                      ? `${theme.scholar}14`
                      : `${theme.primary}12`,
                  borderColor:
                    activeTab === "halal"
                      ? `${theme.scholar}34`
                      : `${theme.primary}30`,
                },
              ]}
            >
              <AppIcon
                name={activeNextMove.icon}
                size={17}
                color={activeTab === "halal" ? theme.scholar : theme.primary}
              />
            </View>
            <View style={styles.finderInsightCopy}>
              <View style={styles.finderInsightTop}>
                <Text
                  style={[
                    styles.eyebrow,
                    {
                      color:
                        activeTab === "halal" ? theme.scholar : theme.primary,
                    },
                  ]}
                >
                  {activeFinderState}
                </Text>
                <Text
                  style={[
                    styles.finderInsightBadge,
                    { color: theme.textMuted },
                  ]}
                >
                  {activeSearchDepth}
                </Text>
              </View>
              <ThemedText
                type="small"
                numberOfLines={1}
                style={{ color: theme.text, fontWeight: "900" }}
              >
                {activeNextMove.title}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={2}
                style={{
                  color: theme.textSecondary,
                  lineHeight: 18,
                  marginTop: 2,
                }}
              >
                {activeNextMove.body}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => {
                if (activeNextMove.action === "Use GPS") {
                  handleUseGPS();
                  return;
                }
                openManualSearch();
              }}
              disabled={gpsLoading && activeNextMove.action === "Use GPS"}
              accessibilityRole="button"
              accessibilityLabel={activeNextMove.action}
              style={({ pressed }) => [
                styles.finderInsightAction,
                {
                  backgroundColor:
                    activeTab === "halal"
                      ? `${theme.scholar}12`
                      : `${theme.primary}12`,
                  borderColor:
                    activeTab === "halal"
                      ? `${theme.scholar}30`
                      : `${theme.primary}28`,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              {gpsLoading && activeNextMove.action === "Use GPS" ? (
                <ActivityIndicator
                  size="small"
                  color={activeTab === "halal" ? theme.scholar : theme.primary}
                />
              ) : (
                <AppIcon
                  name={
                    activeNextMove.action === "Use GPS"
                      ? "crosshair"
                      : "external-link"
                  }
                  size={14}
                  color={activeTab === "halal" ? theme.scholar : theme.primary}
                />
              )}
            </Pressable>
          </View>

          <View
            style={[
              styles.reliabilityRail,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
            testID="nearby-reliability-rail"
          >
            {reliabilitySignals.map((signal) => {
              const accent =
                activeTab === "halal" ? theme.scholar : theme.primary;
              return (
                <View key={signal.label} style={styles.reliabilityItem}>
                  <View
                    style={[
                      styles.reliabilityIcon,
                      {
                        backgroundColor: `${accent}12`,
                        borderColor: `${accent}28`,
                      },
                    ]}
                  >
                    <AppIcon name={signal.icon} size={13} color={accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[styles.reliabilityValue, { color: accent }]}
                      numberOfLines={1}
                    >
                      {signal.value}
                    </Text>
                    <Text
                      style={[
                        styles.reliabilityLabel,
                        { color: theme.textMuted },
                      ]}
                      numberOfLines={1}
                    >
                      {signal.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "mosques" ? renderMosquesTab() : renderHalalTab()}
      </ScrollView>

      <Modal
        visible={showLocationPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundRoot },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Choose Location</ThemedText>
              <Pressable
                onPress={() => setShowLocationPicker(false)}
                testID="button-close-picker"
              >
                <AppIcon name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <Pressable
              onPress={handleUseGPS}
              style={({ pressed }) => [pressed ? { opacity: 0.85 } : null]}
              testID="button-use-gps"
            >
              <LinearGradient
                colors={
                  isDark
                    ? [theme.gradientStart, theme.primaryText]
                    : [theme.primary, theme.gradientStart]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gpsButton}
              >
                {gpsLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <AppIcon name="crosshair" size={20} color="#FFFFFF" />
                )}
                <ThemedText style={styles.gpsButtonText}>
                  {gpsLoading ? "Detecting..." : "Use My Current Location"}
                </ThemedText>
              </LinearGradient>
            </Pressable>

            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <AppIcon name="search" size={18} color={theme.textMuted} />
              <TextInput
                style={[
                  styles.searchInput,
                  { color: theme.text, fontFamily: Fonts?.sans },
                ]}
                placeholder="Search cities"
                placeholderTextColor={theme.textMuted}
                value={citySearch}
                onChangeText={setCitySearch}
                testID="input-city-search"
              />
              {citySearch.length > 0 ? (
                <Pressable onPress={() => setCitySearch("")}>
                  <AppIcon name="x-circle" size={18} color={theme.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={filteredCities}
              keyExtractor={(item) => `${item.cityName}-${item.countryName}`}
              renderItem={renderCityItem}
              style={styles.cityList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  nearbyHeroCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    overflow: "hidden",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  nearbyHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.45,
    textTransform: "uppercase",
  },
  nearbyStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  nearbyStatPill: {
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statPillText: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12,
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  locationText: {
    flex: 1,
    fontSize: 13,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs + 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  resultSummary: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  resultSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  searchDepthPill: {
    alignSelf: "flex-start",
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  searchDepthText: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11,
  },
  manualSearchButton: {
    minHeight: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  manualSearchText: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 12,
  },
  finderInsight: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    minHeight: 106,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  finderInsightGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  finderInsightIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  finderInsightCopy: {
    flex: 1,
    minWidth: 0,
  },
  finderInsightTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  finderInsightBadge: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
    maxWidth: 126,
  },
  finderInsightAction: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reliabilityRail: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  reliabilityItem: {
    flex: 1,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  reliabilityIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reliabilityValue: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11,
  },
  reliabilityLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  loadingPanel: {
    borderRadius: 28,
    borderWidth: 1,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    overflow: "hidden",
    gap: Spacing.md,
  },
  loadingOrb: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCopy: {
    gap: 2,
  },
  loadingPulseRows: {
    gap: Spacing.sm,
  },
  loadingPulseRow: {
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 15,
  },
  discoveryPanel: {
    borderRadius: 28,
    borderWidth: 1,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    gap: Spacing.md,
    overflow: "hidden",
  },
  discoveryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  discoveryChecklist: {
    gap: Spacing.sm,
  },
  discoveryChecklistRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  discoveryPlan: {
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  discoveryPlanHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  discoveryPlanGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  discoveryPlanStep: {
    flex: 1,
    minHeight: 118,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.sm,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
  },
  discoveryPlanIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  discoveryActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  discoveryAction: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: Spacing.md,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    borderWidth: 1,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["2xl"],
    gap: Spacing.md,
    overflow: "hidden",
  },
  emptyIconFrame: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  emptyTrustStrip: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  mosqueCard: {
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleArea: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  mosqueName: {
    marginBottom: 2,
  },
  placeSourcePill: {
    alignSelf: "flex-start",
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardActions: {
    flexDirection: "row",
    marginTop: Spacing.md,
    gap: Spacing.sm,
    alignItems: "center",
  },
  directionsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs + 2,
  },
  directionsButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  confidenceStrip: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  cardSecondaryButton: {
    minHeight: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardSecondaryText: {
    fontSize: 13,
    fontWeight: "800",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs + 2,
    marginTop: Spacing.sm,
  },
  mapsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs + 2,
    marginTop: Spacing.sm,
  },
  mapsButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  gpsButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === "ios" ? 4 : 2,
  },
  cityList: {
    flex: 1,
  },
  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  cityFlag: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
