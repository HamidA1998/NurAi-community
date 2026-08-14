import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  AccessibilityInfo,
  View,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  AppState,
  ScrollView,
  TextInput,
  Modal,
  Text,
  ActivityIndicator,
  Linking,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import ReAnimated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
} from "react-native-svg";
import {
  Aurora,
  NuraiGlass,
  NuraiGlassGroup,
  NuraiRadius,
  NuraiSpace,
  NuraiType,
} from "@/design-system";
import { Qibla, Coordinates } from "adhan";
import { Magnetometer } from "expo-sensors";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { QiblaIconSvg } from "@/components/premium/svg/PremiumSvgs";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useLocation } from "@/context/LocationContext";
import { getApiUrl } from "@/lib/query-client";
import { AppIcon } from "@/components/icons";

const MECCA_LAT = 21.4225;
const MECCA_LNG = 39.8262;
const isWeb = Platform.OS === "web";

const QUICK_PICK_CITIES = [
  { name: "London, UK", latitude: 51.5074, longitude: -0.1278 },
  { name: "Manchester, UK", latitude: 53.4808, longitude: -2.2426 },
  { name: "Birmingham, UK", latitude: 52.4862, longitude: -1.8904 },
  { name: "New York, USA", latitude: 40.7128, longitude: -74.006 },
  { name: "Los Angeles, USA", latitude: 34.0522, longitude: -118.2437 },
  { name: "Toronto, Canada", latitude: 43.6511, longitude: -79.347 },
  { name: "Istanbul, Turkey", latitude: 41.0082, longitude: 28.9784 },
  { name: "Dubai, UAE", latitude: 25.2048, longitude: 55.2708 },
  { name: "Kuala Lumpur, Malaysia", latitude: 3.139, longitude: 101.6869 },
  { name: "Jakarta, Indonesia", latitude: -6.2088, longitude: 106.8456 },
  { name: "Cairo, Egypt", latitude: 30.0444, longitude: 31.2357 },
  { name: "Islamabad, Pakistan", latitude: 33.6844, longitude: 73.0479 },
  { name: "Sydney, Australia", latitude: -33.8688, longitude: 151.2093 },
  { name: "Paris, France", latitude: 48.8566, longitude: 2.3522 },
  { name: "Berlin, Germany", latitude: 52.52, longitude: 13.405 },
];

function getMagnetometerHeading(data: { x: number; y: number; z: number }) {
  const { x, y } = data;
  let heading = Math.atan2(y, x) * (180 / Math.PI);
  heading = heading >= 0 ? heading : heading + 360;
  return heading;
}

function getCardinalDirection16(deg: number): string {
  const n = ((deg % 360) + 360) % 360;
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const idx = Math.round(n / 22.5) % 16;
  return dirs[idx];
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

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

type HeadingSource = "location" | "magnetometer" | "none";
type LocationPermissionState =
  | "checking"
  | "granted"
  | "undetermined"
  | "denied";

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
}

const COMPASS_TICKS = Array.from({ length: 36 }, (_, index) => ({
  angle: index * 10,
  major: index % 3 === 0,
  cardinal: index % 9 === 0,
}));

function formatDistanceToMakkah(distanceKm: number) {
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km`;
  return `${Math.round(distanceKm).toLocaleString()} km`;
}

function compassLabelPosition(size: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  const radius = size / 2 - 29;
  const center = size / 2;
  return {
    left: center + Math.sin(radians) * radius - 14,
    top: center - Math.cos(radians) * radius - 10,
  };
}

const CompassTicks = React.memo(function CompassTicks({
  size,
  color,
  cardinalColor,
  primaryColor,
}: {
  size: number;
  color: string;
  cardinalColor: string;
  primaryColor: string;
}) {
  const center = size / 2;
  const outer = size / 2 - 11;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="qiblaDialField" cx="50%" cy="43%" r="58%">
          <Stop offset="0%" stopColor={primaryColor} stopOpacity={0.12} />
          <Stop offset="55%" stopColor="#071B1D" stopOpacity={0.44} />
          <Stop offset="100%" stopColor="#020B0D" stopOpacity={0.92} />
        </RadialGradient>
        <SvgLinearGradient id="qiblaDialRim" x1="9%" y1="6%" x2="88%" y2="95%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.42} />
          <Stop offset="35%" stopColor={primaryColor} stopOpacity={0.46} />
          <Stop offset="68%" stopColor={cardinalColor} stopOpacity={0.34} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.08} />
        </SvgLinearGradient>
      </Defs>
      <Circle
        cx={center}
        cy={center}
        r={outer + 4}
        fill="url(#qiblaDialField)"
        stroke="url(#qiblaDialRim)"
        strokeWidth={1.6}
      />
      <Circle
        cx={center}
        cy={center}
        r={outer}
        fill="none"
        stroke={color}
        strokeOpacity={0.2}
        strokeWidth={1}
      />
      <Circle
        testID="qibla-dial-specular"
        cx={center}
        cy={center}
        r={outer + 1}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.34}
        strokeWidth={1.4}
        strokeDasharray={`${size * 0.23} ${size * 2}`}
        strokeDashoffset={size * 0.12}
        strokeLinecap="round"
        transform={`rotate(-48 ${center} ${center})`}
      />
      <Circle
        cx={center}
        cy={center}
        r={outer - 29}
        fill="none"
        stroke={primaryColor}
        strokeOpacity={0.12}
        strokeWidth={1}
      />
      {COMPASS_TICKS.map((tick) => {
        const length = tick.cardinal ? 12 : tick.major ? 8 : 4;
        return (
          <Line
            key={tick.angle}
            x1={center}
            y1={11}
            x2={center}
            y2={11 + length}
            stroke={tick.cardinal ? cardinalColor : color}
            strokeOpacity={tick.cardinal ? 0.9 : tick.major ? 0.55 : 0.25}
            strokeWidth={tick.cardinal ? 2 : tick.major ? 1.5 : 1}
            strokeLinecap="round"
            transform={`rotate(${tick.angle} ${center} ${center})`}
          />
        );
      })}
    </Svg>
  );
});

export default function QiblaScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const navigation = useNavigation<any>();
  const { location, detectGPSLocation, gpsLoading } = useLocation();

  const [overrideLat, setOverrideLat] = useState<number | null>(null);
  const [overrideLng, setOverrideLng] = useState<number | null>(null);
  const [overrideLabel, setOverrideLabel] = useState<string | null>(null);

  const activeLat = overrideLat ?? location.latitude;
  const activeLng = overrideLng ?? location.longitude;

  const adhanBearing = Qibla(new Coordinates(activeLat, activeLng));
  const finalBearing = adhanBearing;
  const qiblaCardinal = getCardinalDirection16(finalBearing);

  const distanceToMecca = haversineDistance(
    activeLat,
    activeLng,
    MECCA_LAT,
    MECCA_LNG,
  );

  const [deviceHeading, setDeviceHeading] = useState(0);
  const [headingSource, setHeadingSource] = useState<HeadingSource>("none");
  const [headingAccuracy, setHeadingAccuracy] = useState<number>(-1);
  const [needsCalibration, setNeedsCalibration] = useState(false);
  const [magnetometerAvailable, setMagnetometerAvailable] = useState(false);
  const [permissionState, setPermissionState] =
    useState<LocationPermissionState>("checking");
  const [permissionCanAskAgain, setPermissionCanAskAgain] = useState(true);
  const [permissionRevision, setPermissionRevision] = useState(0);
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const roseRotationAnim = useRef(new Animated.Value(0)).current;
  const prevRotation = useRef(0);
  const prevRoseRotation = useRef(0);
  const wasFacingQibla = useRef(false);

  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showAccuracyHelp, setShowAccuracyHelp] = useState(false);

  const arrowRotation = normalizeAngle(finalBearing - deviceHeading);
  const signedQiblaDelta = ((finalBearing - deviceHeading + 540) % 360) - 180;
  const qiblaTurnAmount = Math.round(Math.abs(signedQiblaDelta));
  const qiblaTurnDirection = signedQiblaDelta >= 0 ? "right" : "left";
  const facingQibla =
    !isWeb &&
    headingSource !== "none" &&
    (Math.abs(arrowRotation) <= 5 || Math.abs(arrowRotation - 360) <= 5);

  useEffect(() => {
    if (facingQibla && !wasFacingQibla.current && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility(
        "You are facing the Qibla. Hold the phone steady.",
      );
    }
    wasFacingQibla.current = facingQibla;
  }, [facingQibla]);

  useEffect(() => {
    if (isWeb) return;

    let locationSub: Location.LocationSubscription | null = null;
    let magnetSub: ReturnType<typeof Magnetometer.addListener> | null = null;
    let usingPlatformHeading = false;

    let mounted = true;

    const setup = async () => {
      let hasLocationPermission = false;
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!mounted) return;
        hasLocationPermission = permission.status === "granted";
        setPermissionCanAskAgain(permission.canAskAgain);
        if (!hasLocationPermission) {
          setPermissionState(
            permission.status === "denied" ? "denied" : "undetermined",
          );
        } else {
          setPermissionState("granted");
        }
      } catch {
        if (mounted) setPermissionState("denied");
      }

      try {
        locationSub = await Location.watchHeadingAsync((headingData) => {
          if (hasLocationPermission && headingData.trueHeading >= 0) {
            setDeviceHeading(headingData.trueHeading);
            setHeadingSource("location");
          } else if (headingData.magHeading >= 0) {
            setDeviceHeading(headingData.magHeading);
            setHeadingSource("magnetometer");
          } else {
            return;
          }
          setHeadingAccuracy(headingData.accuracy);
          setNeedsCalibration(headingData.accuracy < 2);
          usingPlatformHeading = true;
        });
      } catch {}

      try {
        const magAvailable = await Magnetometer.isAvailableAsync();
        if (!mounted) return;
        setMagnetometerAvailable(magAvailable);
        if (magAvailable) {
          Magnetometer.setUpdateInterval(100);
          magnetSub = Magnetometer.addListener((data) => {
            if (!usingPlatformHeading) {
              const rawHeading = getMagnetometerHeading(data);
              setDeviceHeading(rawHeading);
              setHeadingSource("magnetometer");
              setHeadingAccuracy(-1);
            }

            const magnitude = Math.sqrt(
              data.x * data.x + data.y * data.y + data.z * data.z,
            );
            if (!usingPlatformHeading) {
              setNeedsCalibration(magnitude < 25 || magnitude > 65);
            }
          });
        } else if (!usingPlatformHeading) {
          setHeadingSource("none");
        }
      } catch {
        if (mounted && !usingPlatformHeading) setHeadingSource("none");
      }
    };

    setup();

    return () => {
      mounted = false;
      if (locationSub) locationSub.remove();
      if (magnetSub) magnetSub.remove();
    };
  }, [permissionRevision]);

  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (previousState !== "active" && nextState === "active") {
        setPermissionRevision((current) => current + 1);
      }
      previousState = nextState;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const targetRotation = normalizeAngle(finalBearing - deviceHeading);
    let current = prevRotation.current;
    let diff = targetRotation - current;

    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    const newVal = current + diff;
    prevRotation.current = newVal;

    Animated.timing(rotationAnim, {
      toValue: newVal,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: true,
    }).start();
  }, [deviceHeading, finalBearing, reduceMotion, rotationAnim]);

  useEffect(() => {
    const targetRotation = normalizeAngle(-deviceHeading);
    let current = prevRoseRotation.current;
    let diff = targetRotation - current;

    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    const newVal = current + diff;
    prevRoseRotation.current = newVal;

    Animated.timing(roseRotationAnim, {
      toValue: newVal,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: true,
    }).start();
  }, [deviceHeading, reduceMotion, roseRotationAnim]);

  const spin = rotationAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ["-360deg", "360deg"],
  });
  const counterSpin = rotationAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ["360deg", "-360deg"],
  });
  const roseSpin = roseRotationAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ["-360deg", "360deg"],
  });

  const deviceCardinal = getCardinalDirection16(deviceHeading);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/places/geocode", baseUrl);
      url.searchParams.set("query", q);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("location-search-failed");
      const data = await res.json();
      const results = Array.isArray(data.results) ? data.results : [];
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError("No matching location found. Try a city and country.");
      }
    } catch {
      setSearchResults([]);
      setSearchError(
        "Location search is unavailable. Choose a city or enter coordinates instead.",
      );
    }
    setSearching(false);
  }, [searchQuery]);

  const handleSelectLocation = useCallback((item: GeoResult) => {
    setOverrideLat(item.latitude);
    setOverrideLng(item.longitude);
    setOverrideLabel(item.name);
    setLocationModalVisible(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const handleManualApply = useCallback(() => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setManualError(
        "Enter a latitude from -90 to 90 and longitude from -180 to 180.",
      );
      return;
    }
    setManualError(null);
    setOverrideLat(lat);
    setOverrideLng(lng);
    setOverrideLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    setLocationModalVisible(false);
    setManualLat("");
    setManualLng("");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [manualLat, manualLng]);

  const handleUseGPS = useCallback(async () => {
    const detected = await detectGPSLocation();
    if (detected) {
      setOverrideLat(null);
      setOverrideLng(null);
      setOverrideLabel(null);
      setLocationModalVisible(false);
      setPermissionState("granted");
      setPermissionRevision((current) => current + 1);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [detectGPSLocation]);

  const handleEnablePreciseLocation = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      setPermissionCanAskAgain(permission.canAskAgain);
      if (permission.status === "granted") {
        setPermissionState("granted");
        setPermissionRevision((current) => current + 1);
        await detectGPSLocation();
      } else {
        setPermissionState("denied");
      }
    } catch {
      setPermissionState("denied");
    }
  }, [detectGPSLocation]);

  const handleQuickPick = useCallback((city: (typeof QUICK_PICK_CITIES)[0]) => {
    setOverrideLat(city.latitude);
    setOverrideLng(city.longitude);
    setOverrideLabel(city.name);
    setLocationModalVisible(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const hasCompass = !isWeb && headingSource !== "none";
  const compassStarting =
    !isWeb && headingSource === "none" && magnetometerAvailable;
  const accuracyLabel =
    headingSource === "location"
      ? headingAccuracy >= 3
        ? "High"
        : headingAccuracy === 2
          ? "Medium"
          : headingAccuracy === 1
            ? "Low"
            : "Calibrate"
      : headingSource === "magnetometer"
        ? needsCalibration
          ? "Calibrate"
          : "Magnetic"
        : compassStarting
          ? "Starting"
          : "Bearing only";

  const accuracyColor =
    accuracyLabel === "High"
      ? theme.primary
      : accuracyLabel === "Medium" || accuracyLabel === "Magnetic"
        ? theme.scholar
        : accuracyLabel === "Starting" || accuracyLabel === "Bearing only"
          ? theme.textSecondary
          : theme.warning;

  const locationLabel = overrideLabel || location.cityName || "Your Location";
  const compassSize = Math.min(Math.max(windowWidth - 112, 232), 296);
  const displayHeading = hasCompass ? deviceHeading : 0;
  const statusTitle = facingQibla
    ? "You are facing the Qibla"
    : hasCompass
      ? `Turn ${qiblaTurnDirection} ${qiblaTurnAmount}°`
      : compassStarting
        ? "Starting the compass"
        : `Face ${qiblaCardinal} · ${finalBearing.toFixed(0)}°`;
  const statusBody = facingQibla
    ? "Hold the phone steady. You are aligned toward the Kaaba."
    : hasCompass
      ? "Keep your phone flat and turn until the gold pointer meets the marker."
      : "Use this true-north bearing with a physical compass.";
  const statusEyebrow = facingQibla
    ? "ALIGNED"
    : hasCompass
      ? "LIVE DIRECTION"
      : "QIBLA BEARING";
  const cardinalLabels = [
    { label: "N", angle: -displayHeading, primary: true },
    { label: "E", angle: 90 - displayHeading },
    { label: "S", angle: 180 - displayHeading },
    { label: "W", angle: 270 - displayHeading },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Aurora />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          testID="button-back"
          style={({ pressed }) => [
            styles.headerButton,
            {
              backgroundColor: "transparent",
              borderColor: theme.borderSubtle,
            },
            pressed ? { opacity: 0.6 } : undefined,
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <NuraiGlass
            pointerEvents="none"
            interactive
            radius={22}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <QiblaIconSvg
            size={24}
            color={theme.scholar}
            accentColor={theme.primary}
          />
          <ThemedText type="h4" accessibilityRole="header">
            Qibla Direction
          </ThemedText>
        </View>
        <Pressable
          testID="button-location-picker"
          style={({ pressed }) => [
            styles.headerButton,
            {
              backgroundColor: "transparent",
              borderColor: theme.borderSubtle,
            },
            pressed ? { opacity: 0.6 } : undefined,
          ]}
          onPress={() => setLocationModalVisible(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Change location"
        >
          <NuraiGlass
            pointerEvents="none"
            interactive
            radius={22}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="map-pin" size={20} color={theme.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ReAnimated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(320)}
          style={styles.instrumentShell}
        >
          <NuraiGlassGroup
            spacing={18}
            style={styles.instrumentCard}
            testID="qibla-glass-cluster"
          >
            <View style={styles.instrumentStatusPanel}>
              <NuraiGlass
                pointerEvents="none"
                radius={24}
                tint="rgba(8,30,31,0.52)"
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.instrumentHeader}>
                <View style={styles.instrumentCopy}>
                  <View style={styles.eyebrowRow}>
                    <View
                      style={[
                        styles.liveDot,
                        {
                          backgroundColor: facingQibla
                            ? theme.primary
                            : hasCompass
                              ? theme.scholar
                              : theme.textMuted,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        NuraiType.overline,
                        {
                          color: facingQibla ? theme.primary : theme.scholar,
                        },
                      ]}
                    >
                      {statusEyebrow}
                    </Text>
                  </View>
                  <Text
                    accessibilityRole="header"
                    accessibilityLiveRegion="polite"
                    style={[styles.statusTitle, { color: theme.text }]}
                  >
                    {statusTitle}
                  </Text>
                  <Text
                    style={[
                      NuraiType.bodySmall,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {statusBody}
                  </Text>
                </View>
                <View
                  accessible
                  accessibilityLabel={`Heading quality ${accuracyLabel}`}
                  style={[
                    styles.qualityBadge,
                    { backgroundColor: `${accuracyColor}14` },
                  ]}
                >
                  <View
                    style={[
                      styles.qualityDot,
                      { backgroundColor: accuracyColor },
                    ]}
                  />
                  <Text style={[styles.qualityText, { color: accuracyColor }]}>
                    {accuracyLabel}
                  </Text>
                </View>
              </View>
            </View>

            <View
              accessible
              accessibilityRole="summary"
              accessibilityLabel={`${statusTitle}. Qibla bearing ${finalBearing.toFixed(1)} degrees ${qiblaCardinal}. ${formatDistanceToMakkah(distanceToMecca)} to Makkah. Heading quality ${accuracyLabel}.`}
              style={[
                styles.compassStage,
                {
                  width: compassSize,
                  height: compassSize,
                  borderRadius: compassSize / 2,
                  backgroundColor: "rgba(2,12,14,0.74)",
                  borderColor: facingQibla
                    ? `${theme.primary}8F`
                    : `${theme.scholar}4D`,
                },
              ]}
              testID="qibla-compass-instrument"
            >
              <LinearGradient
                pointerEvents="none"
                testID="qibla-dial-specular-overlay"
                colors={[
                  "rgba(255,255,255,0.10)",
                  "rgba(255,255,255,0.015)",
                  facingQibla
                    ? "rgba(74,220,174,0.10)"
                    : "rgba(203,169,91,0.07)",
                  "rgba(0,0,0,0.12)",
                ]}
                locations={[0, 0.25, 0.64, 1]}
                start={{ x: 0.12, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={[
                  styles.compassLustre,
                  {
                    borderRadius: compassSize / 2,
                  },
                ]}
              />
              <View
                testID="qibla-alignment-target"
                pointerEvents="none"
                style={[
                  styles.alignmentGate,
                  {
                    borderColor: facingQibla ? theme.primary : theme.scholar,
                  },
                ]}
              >
                <NuraiGlass
                  pointerEvents="none"
                  radius={12}
                  tint="rgba(8,27,28,0.46)"
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    styles.alignmentMark,
                    {
                      backgroundColor: facingQibla
                        ? theme.primary
                        : theme.scholar,
                    },
                  ]}
                />
              </View>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.compassRose,
                  {
                    width: compassSize,
                    height: compassSize,
                    transform: [{ rotate: hasCompass ? roseSpin : "0deg" }],
                  },
                ]}
              >
                <CompassTicks
                  size={compassSize}
                  color={theme.textSecondary}
                  cardinalColor={theme.scholar}
                  primaryColor={theme.primary}
                />
              </Animated.View>

              {cardinalLabels.map((item) => {
                const position = compassLabelPosition(
                  compassSize,
                  normalizeAngle(item.angle),
                );
                return (
                  <Text
                    key={item.label}
                    pointerEvents="none"
                    style={[
                      styles.cardinalLabel,
                      position,
                      {
                        color: item.primary
                          ? theme.scholar
                          : theme.textSecondary,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                );
              })}

              <View
                pointerEvents="none"
                style={[
                  styles.innerCompassRing,
                  {
                    width: compassSize - 88,
                    height: compassSize - 88,
                    borderRadius: (compassSize - 88) / 2,
                    borderColor: `${theme.primary}28`,
                  },
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pointerLayer,
                  {
                    width: compassSize,
                    height: compassSize,
                    transform: [
                      {
                        rotate: hasCompass ? spin : `${finalBearing}deg`,
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  style={[
                    styles.pointerNeedle,
                    {
                      height: compassSize / 2 - 55,
                    },
                  ]}
                  colors={
                    facingQibla
                      ? ["#BFFFE8", theme.primary, "rgba(62,198,156,0.20)"]
                      : ["#F6E4B3", theme.scholar, "rgba(203,169,91,0.18)"]
                  }
                  locations={[0, 0.42, 1]}
                />
                <Animated.View
                  testID="qibla-destination-marker"
                  style={[
                    styles.pointerKaaba,
                    {
                      borderColor: facingQibla
                        ? `${theme.primary}80`
                        : `${theme.scholar}70`,
                      transform: [
                        {
                          rotate: hasCompass
                            ? counterSpin
                            : `${-finalBearing}deg`,
                        },
                      ],
                    },
                  ]}
                >
                  <View
                    pointerEvents="none"
                    style={[
                      styles.pointerKaabaHalo,
                      {
                        backgroundColor: facingQibla
                          ? `${theme.primary}24`
                          : `${theme.scholar}1F`,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.pointerKaabaBand,
                      {
                        backgroundColor: facingQibla
                          ? theme.primary
                          : theme.scholar,
                      },
                    ]}
                  />
                </Animated.View>
              </Animated.View>

              <View
                testID="qibla-origin-marker"
                pointerEvents="none"
                style={[
                  styles.originMedallion,
                  {
                    borderColor: facingQibla
                      ? `${theme.primary}70`
                      : `${theme.scholar}52`,
                  },
                ]}
              >
                <NuraiGlass
                  pointerEvents="none"
                  radius={28}
                  tint="rgba(9,34,34,0.60)"
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    styles.originRing,
                    { borderColor: `${theme.primary}70` },
                  ]}
                >
                  <View
                    style={[
                      styles.originDot,
                      { backgroundColor: theme.primary },
                    ]}
                  />
                </View>
              </View>
            </View>

            <View
              style={[
                styles.turnGuidance,
                {
                  borderColor: facingQibla
                    ? `${theme.primary}3D`
                    : `${theme.scholar}2E`,
                },
              ]}
            >
              <NuraiGlass
                pointerEvents="none"
                radius={18}
                tint={
                  facingQibla ? "rgba(26,84,70,0.42)" : "rgba(60,48,24,0.28)"
                }
                style={StyleSheet.absoluteFill}
              />
              <AppIcon
                name={
                  facingQibla
                    ? "check-circle"
                    : hasCompass
                      ? "rotate-cw"
                      : "navigation"
                }
                size={18}
                color={facingQibla ? theme.primary : theme.scholar}
              />
              <Text
                testID="text-facing-qibla"
                style={[
                  styles.turnGuidanceText,
                  { color: facingQibla ? theme.primary : theme.text },
                ]}
              >
                {facingQibla
                  ? "Aligned with the Qibla"
                  : hasCompass
                    ? statusTitle
                    : `Use ${finalBearing.toFixed(0)}° ${qiblaCardinal} on a physical compass`}
              </Text>
              {hasCompass ? (
                <Text style={[styles.phoneHeading, { color: theme.textMuted }]}>
                  {deviceCardinal} {deviceHeading.toFixed(0)}°
                </Text>
              ) : null}
            </View>

            <View
              testID="qibla-reading-summary"
              style={[styles.metricRail, { borderColor: theme.borderSubtle }]}
            >
              <NuraiGlass
                pointerEvents="none"
                radius={18}
                tint="rgba(8,27,29,0.44)"
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {finalBearing.toFixed(1)}°
                </Text>
                <Text style={[styles.metricLabel, { color: theme.textMuted }]}>
                  Qibla bearing · {qiblaCardinal}
                </Text>
              </View>
              <View
                style={[
                  styles.metricDivider,
                  { backgroundColor: theme.borderSubtle },
                ]}
              />
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {formatDistanceToMakkah(distanceToMecca)}
                </Text>
                <Text style={[styles.metricLabel, { color: theme.textMuted }]}>
                  distance to the Kaaba
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setLocationModalVisible(true)}
              style={({ pressed }) => [
                styles.instrumentLocation,
                pressed ? styles.pressed : null,
              ]}
              testID="button-change-location"
              accessibilityRole="button"
              accessibilityLabel={`Change location. Current location ${locationLabel}`}
            >
              <NuraiGlass
                pointerEvents="none"
                interactive
                radius={18}
                tint="rgba(7,35,34,0.46)"
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[
                  styles.locationIcon,
                  { backgroundColor: `${theme.primary}12` },
                ]}
              >
                <AppIcon name="map-pin" size={17} color={theme.primary} />
              </View>
              <View style={styles.instrumentLocationCopy}>
                <Text
                  style={[styles.locationEyebrow, { color: theme.textMuted }]}
                >
                  CALCULATED FROM
                </Text>
                <Text
                  style={[styles.instrumentLocationText, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {locationLabel}
                </Text>
              </View>
              <AppIcon name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>

            <View style={styles.privacyLine}>
              <AppIcon name="shield" size={14} color={theme.primary} />
              <Text style={[styles.privacyText, { color: theme.textMuted }]}>
                Bearing and heading are calculated on this device.
              </Text>
            </View>
          </NuraiGlassGroup>
        </ReAnimated.View>

        {permissionState !== "granted" &&
        permissionState !== "checking" &&
        !isWeb ? (
          <ReAnimated.View
            entering={reduceMotion ? undefined : FadeInDown.duration(300)}
            style={[
              styles.noteCard,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={NuraiRadius.card}
              tint="rgba(7,26,26,0.58)"
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                styles.noteIcon,
                { backgroundColor: `${theme.primary}12` },
              ]}
            >
              <AppIcon name="navigation" size={18} color={theme.primary} />
            </View>
            <View style={styles.noticeCopy}>
              <Text style={[styles.noticeTitle, { color: theme.text }]}>
                Use your precise location
              </Text>
              <Text style={[styles.noticeBody, { color: theme.textSecondary }]}>
                This improves the bearing and enables true-north heading. You
                can continue with your saved city or choose a location manually.
              </Text>
              <Pressable
                onPress={
                  permissionState === "denied" && !permissionCanAskAgain
                    ? () => void Linking.openSettings()
                    : () => void handleEnablePreciseLocation()
                }
                style={({ pressed }) => [
                  styles.noticeAction,
                  pressed ? styles.pressed : null,
                ]}
                testID={
                  permissionState === "denied" && !permissionCanAskAgain
                    ? "button-open-settings"
                    : "button-enable-qibla-location"
                }
                accessibilityRole="button"
                accessibilityLabel={
                  permissionState === "denied" && !permissionCanAskAgain
                    ? "Open device settings to allow location"
                    : "Allow precise location for Qibla"
                }
              >
                <Text
                  style={[styles.noticeActionText, { color: theme.primary }]}
                >
                  {permissionState === "denied" && !permissionCanAskAgain
                    ? "Open Settings"
                    : "Use Precise Location"}
                </Text>
                <AppIcon name="arrow-right" size={15} color={theme.primary} />
              </Pressable>
            </View>
          </ReAnimated.View>
        ) : null}

        {headingSource === "magnetometer" ? (
          <ReAnimated.View
            entering={
              reduceMotion ? undefined : FadeInDown.delay(120).duration(260)
            }
            style={[
              styles.noteCard,
              {
                backgroundColor: "transparent",
                borderColor: `${theme.scholar}38`,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={NuraiRadius.card}
              tint="rgba(7,26,26,0.58)"
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                styles.noteIcon,
                { backgroundColor: `${theme.scholar}12` },
              ]}
            >
              <AppIcon name="compass" size={18} color={theme.scholar} />
            </View>
            <View style={styles.noticeCopy}>
              <Text style={[styles.noticeTitle, { color: theme.text }]}>
                Magnetic heading
              </Text>
              <Text style={[styles.noticeBody, { color: theme.textSecondary }]}>
                The pointer may differ slightly from true north. Use precise
                location for declination-corrected heading.
              </Text>
            </View>
          </ReAnimated.View>
        ) : null}

        {needsCalibration && hasCompass ? (
          <ReAnimated.View
            entering={
              reduceMotion ? undefined : FadeInDown.delay(180).duration(260)
            }
            style={[
              styles.noteCard,
              {
                backgroundColor: "transparent",
                borderColor: `${theme.warning}42`,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={NuraiRadius.card}
              tint="rgba(7,26,26,0.58)"
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                styles.noteIcon,
                { backgroundColor: `${theme.warning}15` },
              ]}
            >
              <AppIcon name="alert-triangle" size={18} color={theme.warning} />
            </View>
            <View style={styles.noticeCopy}>
              <Text style={[styles.noticeTitle, { color: theme.warning }]}>
                Calibrate the compass
              </Text>
              <Text style={[styles.noticeBody, { color: theme.textSecondary }]}>
                Move the phone slowly in a figure-eight and step away from metal
                or magnetic accessories.
              </Text>
            </View>
          </ReAnimated.View>
        ) : null}

        <ReAnimated.View
          entering={
            reduceMotion ? undefined : FadeInDown.delay(220).duration(260)
          }
          style={[
            styles.accuracySection,
            { borderTopColor: theme.borderSubtle },
          ]}
        >
          <Pressable
            onPress={() => setShowAccuracyHelp((current) => !current)}
            style={({ pressed }) => [
              styles.accuracyDisclosure,
              pressed ? styles.pressed : null,
            ]}
            accessibilityRole="button"
            accessibilityState={{ expanded: showAccuracyHelp }}
            accessibilityLabel={`${showAccuracyHelp ? "Hide" : "Show"} accuracy and privacy guidance`}
            testID="button-qibla-accuracy-help"
          >
            <View
              style={[
                styles.accuracyDisclosureIcon,
                { backgroundColor: `${theme.primary}12` },
              ]}
            >
              <AppIcon name="shield" size={17} color={theme.primary} />
            </View>
            <View style={styles.accuracyDisclosureCopy}>
              <Text style={[NuraiType.bodySmall, { color: theme.text }]}>
                Accuracy and privacy
              </Text>
              <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
                Improve the reading and understand what stays private
              </Text>
            </View>
            <AppIcon
              name={showAccuracyHelp ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.textMuted}
            />
          </Pressable>

          {showAccuracyHelp ? (
            <ReAnimated.View
              entering={reduceMotion ? undefined : FadeInDown.duration(220)}
              style={styles.accuracyDetails}
            >
              {[
                {
                  icon: "maximize" as const,
                  title: "Hold the phone flat",
                  body: "Keep the screen level and the top of the phone pointing ahead.",
                },
                {
                  icon: "zap-off" as const,
                  title: "Step away from magnets",
                  body: "Metal furniture, speakers, cases and chargers can disturb the heading.",
                },
                {
                  icon: "lock" as const,
                  title: "Your heading stays private",
                  body: "The Kaaba bearing and compass direction are calculated on this device.",
                },
              ].map((item) => (
                <View key={item.title} style={styles.accuracyDetailRow}>
                  <AppIcon name={item.icon} size={16} color={theme.scholar} />
                  <View style={styles.accuracyDetailCopy}>
                    <Text
                      style={[
                        styles.accuracyDetailTitle,
                        { color: theme.text },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[NuraiType.caption, { color: theme.textMuted }]}
                    >
                      {item.body}
                    </Text>
                  </View>
                </View>
              ))}
            </ReAnimated.View>
          ) : null}
        </ReAnimated.View>
      </ScrollView>

      <Modal
        visible={locationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLocationModalVisible(false)}
        testID="modal-location-picker"
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setLocationModalVisible(false)}
          />
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: "transparent",
                paddingBottom: insets.bottom + Spacing.lg,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.xl}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleCopy}>
                <Text
                  accessibilityRole="header"
                  style={[NuraiType.sectionTitle, { color: theme.text }]}
                >
                  Your location
                </Text>
                <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
                  Choose where you are physically standing.
                </Text>
              </View>
              <Pressable
                onPress={() => setLocationModalVisible(false)}
                hitSlop={8}
                testID="button-close-location"
                style={({ pressed }) => [
                  styles.modalCloseButton,
                  pressed ? { opacity: 0.6 } : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close location picker"
              >
                <AppIcon name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              <View style={styles.modalBody}>
                <Pressable
                  onPress={handleUseGPS}
                  disabled={gpsLoading}
                  testID="button-use-gps"
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: gpsLoading,
                    busy: gpsLoading,
                  }}
                  accessibilityLabel={
                    gpsLoading
                      ? "Detecting your precise location"
                      : "Use your precise location"
                  }
                  style={({ pressed }) => [
                    styles.gpsButton,
                    {
                      backgroundColor: `${theme.primary}15`,
                      borderColor: `${theme.primary}30`,
                    },
                    pressed ? { opacity: 0.7 } : null,
                    gpsLoading ? { opacity: 0.6 } : null,
                  ]}
                >
                  {gpsLoading ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <AppIcon name="crosshair" size={18} color={theme.primary} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.gpsButtonText, { color: theme.primary }]}
                    >
                      {gpsLoading
                        ? "Detecting your location..."
                        : "Use My Precise Location"}
                    </Text>
                    {location.cityName && !gpsLoading ? (
                      <Text
                        style={{
                          color: theme.textSecondary,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        Current: {location.cityName}
                        {location.countryName
                          ? `, ${location.countryName}`
                          : ""}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>

                <View style={styles.searchSection}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Search city or address
                  </Text>
                  <View
                    style={[
                      styles.searchRow,
                      {
                        backgroundColor: theme.input,
                        borderColor: theme.inputBorder,
                      },
                    ]}
                  >
                    <AppIcon name="search" size={18} color={theme.textMuted} />
                    <TextInput
                      style={[styles.searchInput, { color: theme.text }]}
                      placeholder="City or address"
                      placeholderTextColor={theme.textMuted}
                      value={searchQuery}
                      onChangeText={(value) => {
                        setSearchQuery(value);
                        setSearchError(null);
                      }}
                      onSubmitEditing={handleSearch}
                      returnKeyType="search"
                      testID="input-location-search"
                      accessibilityLabel="Search city or address"
                    />
                    {searching ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Pressable
                        onPress={handleSearch}
                        testID="button-search-location"
                        style={styles.searchSubmit}
                        accessibilityRole="button"
                        accessibilityLabel="Search location"
                      >
                        <AppIcon
                          name="arrow-right"
                          size={18}
                          color={theme.primary}
                        />
                      </Pressable>
                    )}
                  </View>

                  {searchError ? (
                    <Text
                      accessibilityRole="alert"
                      style={[styles.fieldError, { color: theme.warning }]}
                    >
                      {searchError}
                    </Text>
                  ) : null}

                  {searchResults.length > 0 ? (
                    <View
                      style={[
                        styles.resultsList,
                        { borderColor: theme.borderSubtle },
                      ]}
                    >
                      {searchResults.map((item, idx) => (
                        <Pressable
                          key={`${item.latitude}-${item.longitude}-${idx}`}
                          onPress={() => handleSelectLocation(item)}
                          testID={`button-result-${idx}`}
                          accessibilityRole="button"
                          accessibilityLabel={`Use ${item.name} for Qibla direction`}
                          style={({ pressed }) => [
                            styles.resultItem,
                            {
                              borderBottomColor: theme.borderSubtle,
                              borderBottomWidth:
                                idx < searchResults.length - 1 ? 1 : 0,
                            },
                            pressed
                              ? { backgroundColor: `${theme.primary}10` }
                              : null,
                          ]}
                        >
                          <AppIcon
                            name="map-pin"
                            size={16}
                            color={theme.primary}
                          />
                          <Text
                            style={[styles.resultText, { color: theme.text }]}
                            numberOfLines={2}
                          >
                            {item.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={styles.quickPickSection}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Popular Cities
                  </Text>
                  <View style={styles.quickPickGrid}>
                    {QUICK_PICK_CITIES.map((city) => (
                      <Pressable
                        key={city.name}
                        onPress={() => handleQuickPick(city)}
                        testID={`button-city-${city.name.split(",")[0].toLowerCase().replace(/\s/g, "-")}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Use ${city.name} for Qibla direction`}
                        style={({ pressed }) => [
                          styles.quickPickChip,
                          {
                            backgroundColor: isDark
                              ? theme.backgroundTertiary
                              : "#F8FAFC",
                            borderColor: isDark
                              ? "#334155"
                              : theme.backgroundTertiary,
                          },
                          pressed
                            ? { backgroundColor: `${theme.primary}15` }
                            : null,
                        ]}
                      >
                        <Text
                          style={[styles.quickPickText, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {city.name.split(",")[0]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <Pressable
                  onPress={() => setShowManualEntry(!showManualEntry)}
                  style={styles.manualToggle}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showManualEntry }}
                  accessibilityLabel={`${showManualEntry ? "Hide" : "Show"} manual coordinate entry`}
                >
                  <Text
                    style={[styles.manualToggleText, { color: theme.primary }]}
                  >
                    {showManualEntry
                      ? "Hide manual entry"
                      : "Enter coordinates manually"}
                  </Text>
                  <AppIcon
                    name={showManualEntry ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={theme.primary}
                  />
                </Pressable>

                {showManualEntry ? (
                  <View style={styles.manualSection}>
                    <View style={styles.manualRow}>
                      <View style={styles.manualField}>
                        <Text
                          style={[
                            styles.sectionLabel,
                            { color: theme.textSecondary },
                          ]}
                        >
                          Latitude
                        </Text>
                        <TextInput
                          style={[
                            styles.manualInput,
                            {
                              backgroundColor: theme.input,
                              borderColor: theme.inputBorder,
                              color: theme.text,
                            },
                          ]}
                          placeholder="-90 to 90"
                          placeholderTextColor={theme.textMuted}
                          value={manualLat}
                          onChangeText={(value) => {
                            setManualLat(value);
                            setManualError(null);
                          }}
                          keyboardType="numeric"
                          testID="input-manual-lat"
                          accessibilityLabel="Latitude"
                        />
                      </View>
                      <View style={styles.manualField}>
                        <Text
                          style={[
                            styles.sectionLabel,
                            { color: theme.textSecondary },
                          ]}
                        >
                          Longitude
                        </Text>
                        <TextInput
                          style={[
                            styles.manualInput,
                            {
                              backgroundColor: theme.input,
                              borderColor: theme.inputBorder,
                              color: theme.text,
                            },
                          ]}
                          placeholder="-180 to 180"
                          placeholderTextColor={theme.textMuted}
                          value={manualLng}
                          onChangeText={(value) => {
                            setManualLng(value);
                            setManualError(null);
                          }}
                          keyboardType="numeric"
                          testID="input-manual-lng"
                          accessibilityLabel="Longitude"
                        />
                      </View>
                    </View>
                    {manualError ? (
                      <Text
                        accessibilityRole="alert"
                        style={[styles.fieldError, { color: theme.warning }]}
                      >
                        {manualError}
                      </Text>
                    ) : null}
                    <Pressable
                      onPress={handleManualApply}
                      testID="button-apply-manual"
                      accessibilityRole="button"
                      accessibilityLabel="Apply manual coordinates"
                      style={({ pressed }) => [
                        styles.applyBtn,
                        { backgroundColor: theme.primary },
                        pressed ? { opacity: 0.8 } : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.applyBtnText,
                          { color: theme.primaryForeground },
                        ]}
                      >
                        Apply Coordinates
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  instrumentShell: {
    width: "100%",
    alignSelf: "stretch",
    marginBottom: NuraiSpace.md,
  },
  instrumentCard: {
    width: "100%",
    gap: 16,
  },
  instrumentStatusPanel: {
    minHeight: 132,
    borderRadius: 24,
    padding: 18,
    overflow: "hidden",
    justifyContent: "center",
  },
  instrumentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: NuraiSpace.sm,
  },
  instrumentCopy: { flex: 1, minWidth: 0, gap: NuraiSpace.xs },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.xs,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  statusTitle: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 24,
    lineHeight: 32,
  },
  qualityBadge: {
    minHeight: 32,
    borderRadius: NuraiRadius.pill,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  qualityDot: { width: 6, height: 6, borderRadius: 3 },
  qualityText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
  },
  compassStage: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  compassLustre: {
    ...StyleSheet.absoluteFillObject,
  },
  alignmentGate: {
    position: "absolute",
    top: 9,
    left: "50%",
    marginLeft: -22,
    width: 44,
    height: 30,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(4,16,17,0.72)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 12,
  },
  alignmentMark: {
    position: "absolute",
    top: 5,
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  compassRose: { position: "absolute", top: 0, left: 0 },
  cardinalLabel: {
    position: "absolute",
    width: 28,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    zIndex: 3,
  },
  innerCompassRing: {
    position: "absolute",
    top: 44,
    left: 44,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pointerLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    zIndex: 6,
  },
  pointerNeedle: {
    position: "absolute",
    top: 37,
    left: "50%",
    marginLeft: -1.5,
    width: 3,
    borderRadius: 2,
  },
  pointerKaaba: {
    position: "absolute",
    top: 9,
    left: "50%",
    marginLeft: -13,
    width: 26,
    height: 23,
    borderRadius: 5,
    backgroundColor: "#080D0F",
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  pointerKaabaHalo: {
    ...StyleSheet.absoluteFillObject,
  },
  pointerKaabaBand: { width: "100%", height: 3 },
  originMedallion: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -28,
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: "rgba(6,24,24,0.96)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 10,
  },
  originRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  originDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  turnGuidance: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: NuraiSpace.md,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.xs,
    overflow: "hidden",
  },
  turnGuidanceText: {
    flex: 1,
    minWidth: 0,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
    lineHeight: 19,
  },
  phoneHeading: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    lineHeight: 17,
    fontVariant: ["tabular-nums"],
  },
  metricRail: {
    minHeight: 76,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  metricItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 3,
  },
  metricValue: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  metricLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: "center",
  },
  metricDivider: { width: StyleSheet.hairlineWidth, height: 30 },
  instrumentLocation: {
    minHeight: 64,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    paddingHorizontal: NuraiSpace.md,
    overflow: "hidden",
  },
  locationIcon: {
    width: 38,
    height: 38,
    borderRadius: NuraiRadius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  instrumentLocationCopy: { flex: 1, minWidth: 0, gap: 1 },
  locationEyebrow: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 9,
    lineHeight: 13,
  },
  instrumentLocationText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    lineHeight: 19,
  },
  privacyLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.xs,
    paddingHorizontal: 4,
  },
  privacyText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10.5,
    lineHeight: 16,
  },
  noticeCopy: { flex: 1, minWidth: 0, gap: 3 },
  noticeTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
    lineHeight: 19,
  },
  noticeBody: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  noticeAction: {
    alignSelf: "flex-start",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noticeActionText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
    lineHeight: 18,
  },
  accuracySection: {
    width: "100%",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: NuraiSpace.sm,
  },
  accuracyDisclosure: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  accuracyDisclosureIcon: {
    width: 40,
    height: 40,
    borderRadius: NuraiRadius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  accuracyDisclosureCopy: { flex: 1, minWidth: 0, gap: 1 },
  accuracyDetails: {
    paddingBottom: NuraiSpace.md,
    gap: NuraiSpace.md,
  },
  accuracyDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: NuraiSpace.sm,
    paddingLeft: 4,
  },
  accuracyDetailCopy: { flex: 1, minWidth: 0, gap: 2 },
  accuracyDetailTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  noteCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    alignItems: "flex-start",
    marginBottom: Spacing.md,
    width: "100%",
    overflow: "hidden",
  },
  noteIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  modalTitleCopy: { flex: 1, minWidth: 0, gap: 2, paddingRight: NuraiSpace.sm },
  modalScroll: {
    flexGrow: 0,
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    minHeight: 56,
  },
  gpsButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  searchSection: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  searchSubmit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -10,
  },
  fieldError: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  resultsList: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  resultText: {
    fontSize: 14,
    flex: 1,
  },
  quickPickSection: {
    gap: Spacing.sm,
  },
  quickPickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickPickChip: {
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  quickPickText: {
    fontSize: 13,
    fontWeight: "500",
  },
  manualToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  manualToggleText: {
    fontSize: 13,
    fontWeight: "500",
  },
  manualSection: {
    gap: Spacing.md,
  },
  manualRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  manualField: {
    flex: 1,
  },
  manualInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  applyBtn: {
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
