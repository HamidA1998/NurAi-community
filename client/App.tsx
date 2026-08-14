import React, { useCallback, useEffect, useRef } from "react";
import { Linking, StyleSheet } from "react-native";
import {
  createNavigationContainerRef,
  NavigationContainer,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  LibreBaskerville_400Regular,
  LibreBaskerville_700Bold,
} from "@expo-google-fonts/libre-baskerville";
import { AmiriQuran_400Regular } from "@expo-google-fonts/amiri-quran";
import { Amiri_400Regular, Amiri_700Bold } from "@expo-google-fonts/amiri";
import {
  NotoNaskhArabic_400Regular,
  NotoNaskhArabic_700Bold,
} from "@expo-google-fonts/noto-naskh-arabic";
import {
  ScheherazadeNew_400Regular,
  ScheherazadeNew_700Bold,
} from "@expo-google-fonts/scheherazade-new";
import { Lateef_400Regular, Lateef_700Bold } from "@expo-google-fonts/lateef";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { WomensHealthProvider } from "@/context/WomensHealthContext";
import { KidsModeProvider } from "@/context/KidsModeContext";
import { LocationProvider } from "@/context/LocationContext";
import { useTheme } from "@/hooks/useTheme";
import { AppLockGate } from "@/components/AppLockGate";
import { usePrayerNotifications } from "@/hooks/usePrayerNotifications";
import { NurAIProvider } from "@/context/NurAIContext";
import * as Notifications from "expo-notifications";
import {
  addNotificationToCenter,
  inferNotificationType,
} from "@/lib/notification-center";
import { PRAYER_KEYS, type PrayerKey } from "@/lib/prayer-intelligence";
import { setPrayerTrackerStatus } from "@/lib/prayer-tracker";
import { schedulePrayerSnoozeReminder } from "@/lib/notifications";

SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 700, fade: true });

const navigationRef = createNavigationContainerRef<any>();

const DEEP_LINK_ROUTE_ALIASES: Record<string, string> = {
  home: "Home",
  prayer: "PrayerTimes",
  "prayer-times": "PrayerTimes",
  qibla: "Qibla",
  compass: "Qibla",
  quran: "Quran",
  explore: "Explore",
  more: "More",
  "streak-garden": "StreakGarden",
  streak: "StreakGarden",
  tasbeeh: "Tasbeeh",
  health: "MuslimHealth",
  wellness: "MuslimHealth",
  "health-companion": "MuslimHealth",
  "health-readiness": "HealthReadiness",
  "health-sleep": "HealthSleep",
  workouts: "WorkoutHub",
  workout: "WorkoutDetail",
  "live-workout": "LiveWorkout",
  "health-progress": "HealthProgress",
  "health-coach": "HealthCoach",
  hydration: "Hydration",
  nutrition: "Nutrition",
  "connected-health": "ConnectedHealth",
  "health-signals": "HealthSignals",
  community: "Community",
  "community-settings": "CommunitySettings",
  family: "FamilyGroup",
  "family-circle": "FamilyGroup",
  "daily-pulse": "Home",
  notifications: "NotificationsCenter",
  "personal-guide": "PersonalGuide",
  guide: "PersonalGuide",
};

type DeepLinkTarget = {
  route: string;
  params?: Record<string, unknown>;
};

function getNotificationRouteParams(
  data: unknown,
): Record<string, unknown> | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) return;

  const record = data as Record<string, unknown>;
  const nestedParams = record.params;
  const params: Record<string, unknown> =
    nestedParams &&
    typeof nestedParams === "object" &&
    !Array.isArray(nestedParams)
      ? { ...(nestedParams as Record<string, unknown>) }
      : {};

  // Push providers may place route parameters at the top level. Preserve
  // those values as well as the nested shape used by older notifications.
  for (const key of ["initialTab", "groupId", "messageId"]) {
    if (params[key] === undefined && record[key] !== undefined) {
      params[key] = record[key];
    }
  }

  return Object.keys(params).length > 0 ? params : undefined;
}

function getQueryParam(url: string, key: string): string | null {
  const query = url.split("?")[1]?.split("#")[0];
  if (!query) return null;

  for (const part of query.split("&")) {
    const [rawKey, rawValue = ""] = part.split("=");
    if (decodeURIComponent(rawKey) === key) {
      return decodeURIComponent(rawValue.replace(/\+/g, " "));
    }
  }

  return null;
}

function parsePositiveIntParam(
  value: string | null,
  min: number,
  max: number,
): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
}

function getRouteFromDeepLink(url?: string | null): DeepLinkTarget | null {
  if (!url || typeof url !== "string") return null;

  const cleanUrl = url.trim();
  const withoutScheme = cleanUrl
    .replace(/^nurai:\/\//i, "")
    .replace(/^nurai:/i, "");
  const routeKey = withoutScheme
    .split(/[?#]/)[0]
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();

  const route = DEEP_LINK_ROUTE_ALIASES[routeKey] ?? null;
  if (!route) return null;

  if (routeKey === "quran") {
    const surah = parsePositiveIntParam(
      getQueryParam(cleanUrl, "surah"),
      1,
      114,
    );
    if (surah) {
      return {
        route: "QuranReader",
        params: {
          surahNumber: surah,
          initialVerse: parsePositiveIntParam(
            getQueryParam(cleanUrl, "verse"),
            1,
            286,
          ),
        },
      };
    }
  }

  if (routeKey === "family" || routeKey === "family-circle") {
    const tab = (getQueryParam(cleanUrl, "tab") || "").toLowerCase();
    if (["members", "goals", "challenges", "duas", "messages"].includes(tab)) {
      return {
        route,
        params: { initialTab: tab },
      };
    }
  }

  if (routeKey === "workout" || routeKey === "live-workout") {
    const workoutId = (getQueryParam(cleanUrl, "id") || "").trim();
    if (/^[a-z0-9-]{3,80}$/.test(workoutId)) {
      return { route, params: { workoutId } };
    }
  }

  return { route };
}

function navigateFromNotificationRoute(
  route?: unknown,
  params?: Record<string, unknown>,
): boolean {
  if (!navigationRef.isReady() || typeof route !== "string") return false;

  switch (route) {
    case "Home":
      navigationRef.navigate("Main", { screen: "Home" });
      return true;
    case "Quran":
      navigationRef.navigate("Main", { screen: "Quran" });
      return true;
    case "Explore":
      navigationRef.navigate("Main", { screen: "Explore" });
      return true;
    case "More":
      navigationRef.navigate("Main", { screen: "More" });
      return true;
    case "Community":
      navigationRef.navigate("Main", { screen: "Community" });
      return true;
    case "QuranReader":
      navigationRef.navigate("QuranReader", params);
      return true;
    case "PrayerTimes":
    case "Qibla":
    case "ArabicLearning":
    case "StreakGarden":
    case "FamilyGroup":
    case "Tasbeeh":
    case "Duas":
    case "MuslimHealth":
    case "HealthReadiness":
    case "HealthSleep":
    case "WorkoutHub":
    case "WorkoutDetail":
    case "LiveWorkout":
    case "HealthProgress":
    case "HealthCoach":
    case "Hydration":
    case "Nutrition":
    case "ConnectedHealth":
    case "HealthSignals":
    case "CommunitySettings":
    case "IslamicFinance":
    case "Ramadan":
    case "NotificationsCenter":
    case "PersonalGuide":
      navigationRef.navigate(route, params);
      return true;
    default:
      return false;
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function AppContent() {
  const { isDark } = useTheme();
  const pendingDeepLinkRoute = useRef<DeepLinkTarget | null>(null);
  usePrayerNotifications();

  const navigateOrQueueRoute = useCallback(
    (target: DeepLinkTarget | null): boolean => {
      if (!target) return false;

      if (!navigationRef.isReady()) {
        pendingDeepLinkRoute.current = target;
        return true;
      }

      return navigateFromNotificationRoute(target.route, target.params);
    },
    [],
  );

  const handleDeepLink = useCallback(
    (url?: string | null) => navigateOrQueueRoute(getRouteFromDeepLink(url)),
    [navigateOrQueueRoute],
  );

  const flushPendingDeepLink = useCallback(() => {
    const target = pendingDeepLinkRoute.current;
    if (!target) return;
    pendingDeepLinkRoute.current = null;
    navigateFromNotificationRoute(target.route, target.params);
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const request = notification.request;
        const content = request.content;
        const data = content.data as Record<string, unknown> | undefined;
        const type = inferNotificationType(request.identifier, data?.type);
        void addNotificationToCenter({
          id: request.identifier || `${type}-${Date.now()}`,
          title: content.title,
          body: content.body,
          type,
          timestamp: Date.now(),
          route: typeof data?.route === "string" ? data.route : undefined,
          params: getNotificationRouteParams(data),
        });
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    Linking.getInitialURL()
      .then((url) => {
        handleDeepLink(url);
      })
      .catch(() => undefined);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const actionId = response.actionIdentifier;
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        const prayer =
          typeof data?.prayer === "string" &&
          PRAYER_KEYS.includes(data.prayer as PrayerKey)
            ? (data.prayer as PrayerKey)
            : null;

        if (actionId === "mark_prayed" && prayer) {
          setPrayerTrackerStatus(prayer, "prayed").catch(() => {});
          return;
        }

        if (actionId === "snooze_prayer_10" && prayer) {
          const prayerTime =
            typeof data?.prayerTime === "string"
              ? new Date(data.prayerTime)
              : null;
          if (prayerTime && Number.isFinite(prayerTime.getTime())) {
            schedulePrayerSnoozeReminder(prayer, prayerTime, 10).catch(
              () => {},
            );
          }
          return;
        }

        const params = getNotificationRouteParams(data);

        const notificationRoute =
          typeof data?.route === "string" ? data.route : null;
        if (
          navigateOrQueueRoute(
            notificationRoute ? { route: notificationRoute, params } : null,
          )
        ) {
          return;
        }

        if (actionId === "open_prayer" || data?.route === "PrayerTimes") {
          Linking.openURL("nurai://prayer").catch(() => {});
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [navigateOrQueueRoute]);

  return (
    <>
      <NavigationContainer ref={navigationRef} onReady={flushPendingDeepLink}>
        <RootStackNavigator />
      </NavigationContainer>
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    LibreBaskerville_400Regular,
    LibreBaskerville_700Bold,
    AmiriQuran_400Regular,
    Amiri_400Regular,
    Amiri_700Bold,
    NotoNaskhArabic_400Regular,
    NotoNaskhArabic_700Bold,
    ScheherazadeNew_400Regular,
    ScheherazadeNew_700Bold,
    Lateef_400Regular,
    Lateef_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <ThemeProvider>
              <AuthProvider>
                <LocationProvider>
                  <SubscriptionProvider>
                    <WomensHealthProvider>
                      <KidsModeProvider>
                        <NurAIProvider>
                          <AppLockGate>
                            <AppContent />
                          </AppLockGate>
                        </NurAIProvider>
                      </KidsModeProvider>
                    </WomensHealthProvider>
                  </SubscriptionProvider>
                </LocationProvider>
              </AuthProvider>
            </ThemeProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
