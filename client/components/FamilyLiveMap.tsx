import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import { ThemedText } from "@/components/ThemedText";
import type {
  AppleMaps as AppleMapsTypes,
  GoogleMaps as GoogleMapsTypes,
} from "expo-maps";

export interface FamilyLiveMapPoint {
  id: string;
  displayName: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  isCurrentUser: boolean;
}

type ExpoMapsModule = typeof import("expo-maps");

// expo-maps is a native-only module. Keeping the require behind the platform
// guard lets the web preview keep its honest fallback instead of pretending to
// have a native map surface.
const nativeMaps: ExpoMapsModule | null =
  Platform.OS === "web"
    ? null
    : (() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          return require("expo-maps") as ExpoMapsModule;
        } catch {
          return null;
        }
      })();

const androidMapsConfigured =
  Platform.OS !== "android" ||
  Boolean(Constants.expoConfig?.android?.config?.googleMaps?.apiKey);

interface FamilyLiveMapProps {
  points: FamilyLiveMapPoint[];
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
}

function getCameraPosition(points: FamilyLiveMapPoint[]) {
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudeSpan = maxLatitude - minLatitude;
  const longitudeSpan = maxLongitude - minLongitude;
  const largestSpan = Math.max(latitudeSpan, longitudeSpan);

  const zoom =
    largestSpan < 0.008
      ? 15
      : largestSpan < 0.03
        ? 13.5
        : largestSpan < 0.12
          ? 11.5
          : largestSpan < 0.5
            ? 9
            : 6.5;

  return {
    coordinates: {
      latitude: (minLatitude + maxLatitude) / 2,
      longitude: (minLongitude + maxLongitude) / 2,
    },
    zoom,
  };
}

export function FamilyLiveMap({
  points,
  backgroundColor,
  borderColor,
  textColor,
  mutedTextColor,
  accentColor,
}: FamilyLiveMapProps) {
  const appleMapRef = useRef<AppleMapsTypes.MapView>(null);
  const googleMapRef = useRef<GoogleMapsTypes.MapView>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const cameraPosition = useMemo(
    () => (points.length > 0 ? getCameraPosition(points) : undefined),
    [points],
  );
  const selectedPoint = points.find((point) => point.id === selectedPointId);

  useEffect(() => {
    if (!cameraPosition) return;
    if (Platform.OS === "ios") {
      appleMapRef.current?.setCameraPosition(cameraPosition);
    } else if (Platform.OS === "android") {
      googleMapRef.current?.setCameraPosition(cameraPosition);
    }
  }, [cameraPosition]);

  if (points.length === 0) {
    return (
      <View
        style={[styles.empty, { backgroundColor, borderColor }]}
        testID="family-live-map-empty"
      >
        <View
          style={[styles.emptyHalo, { backgroundColor: `${accentColor}1A` }]}
        >
          <ThemedText style={[styles.emptyPin, { color: accentColor }]}>
            ⌖
          </ThemedText>
        </View>
        <ThemedText style={[styles.emptyTitle, { color: textColor }]}>
          No live shares yet
        </ThemedText>
        <ThemedText style={[styles.emptyCopy, { color: mutedTextColor }]}>
          When someone chooses to share for one hour, their current location
          will appear here.
        </ThemedText>
      </View>
    );
  }

  if (!nativeMaps || Platform.OS === "web" || !androidMapsConfigured) {
    return (
      <View
        style={[styles.empty, { backgroundColor, borderColor }]}
        testID="family-live-map-unavailable"
      >
        <View
          style={[styles.emptyHalo, { backgroundColor: `${accentColor}1A` }]}
        >
          <ThemedText style={[styles.emptyPin, { color: accentColor }]}>
            ⌖
          </ThemedText>
        </View>
        <ThemedText style={[styles.emptyTitle, { color: textColor }]}>
          {Platform.OS === "android" && !androidMapsConfigured
            ? "Android map setup"
            : "Native live map"}
        </ThemedText>
        <ThemedText style={[styles.emptyCopy, { color: mutedTextColor }]}>
          {Platform.OS === "android" && !androidMapsConfigured
            ? "Add an Android-restricted Google Maps key to the release build to show shared locations here."
            : "The latest iOS or Android build is needed to show the shared locations on the native map."}
        </ThemedText>
      </View>
    );
  }

  const appleMarkers: AppleMapsTypes.Marker[] = points.map((point) => ({
    id: point.id,
    coordinates: {
      latitude: point.latitude,
      longitude: point.longitude,
    },
    systemImage: point.isCurrentUser ? "location.fill" : "person.fill",
    title: point.displayName,
    tintColor: point.isCurrentUser ? accentColor : "#CFAE69",
  }));
  const googleMarkers: GoogleMapsTypes.Marker[] = points.map((point) => ({
    id: point.id,
    coordinates: {
      latitude: point.latitude,
      longitude: point.longitude,
    },
    title: point.displayName,
    snippet: point.locationLabel,
    showCallout: true,
    zIndex: point.isCurrentUser ? 2 : 1,
  }));

  return (
    <View
      style={[styles.shell, { backgroundColor, borderColor }]}
      testID="family-live-map"
    >
      {Platform.OS === "ios" ? (
        <nativeMaps.AppleMaps.View
          ref={appleMapRef}
          style={StyleSheet.absoluteFill}
          cameraPosition={cameraPosition}
          markers={appleMarkers}
          properties={{
            mapType: nativeMaps.AppleMaps.MapType.STANDARD,
            emphasis: "MUTED" as AppleMapsTypes.MapProperties["emphasis"],
            isMyLocationEnabled: false,
            isTrafficEnabled: false,
            selectionEnabled: false,
          }}
          uiSettings={{
            compassEnabled: true,
            scaleBarEnabled: true,
            myLocationButtonEnabled: false,
          }}
          onMarkerClick={(marker) => setSelectedPointId(marker.id || null)}
        />
      ) : (
        <nativeMaps.GoogleMaps.View
          ref={googleMapRef}
          style={StyleSheet.absoluteFill}
          cameraPosition={cameraPosition}
          markers={googleMarkers}
          colorScheme={nativeMaps.GoogleMaps.MapColorScheme.DARK}
          properties={{
            mapType: nativeMaps.GoogleMaps.MapType.NORMAL,
            isMyLocationEnabled: false,
            isTrafficEnabled: false,
            isBuildingEnabled: true,
            selectionEnabled: false,
          }}
          uiSettings={{
            compassEnabled: true,
            scaleBarEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
          }}
          onMarkerClick={(marker) => setSelectedPointId(marker.id || null)}
        />
      )}
      {selectedPoint ? (
        <View
          pointerEvents="none"
          style={[
            styles.callout,
            { backgroundColor: `${backgroundColor}F2`, borderColor },
          ]}
        >
          <ThemedText style={[styles.calloutTitle, { color: textColor }]}>
            {selectedPoint.displayName}
          </ThemedText>
          <ThemedText style={[styles.calloutCopy, { color: mutedTextColor }]}>
            {selectedPoint.locationLabel}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: 318,
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
  },
  empty: {
    minHeight: 250,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  emptyHalo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyPin: {
    fontSize: 30,
    lineHeight: 34,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    textAlign: "center",
    maxWidth: 280,
  },
  callout: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  calloutCopy: {
    fontSize: 12,
    marginTop: 2,
  },
});
