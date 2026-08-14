/* eslint-disable @typescript-eslint/no-require-imports -- Lazy screen factories keep the initial navigation bundle smaller. */
import React, { useContext, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import WelcomeSplashScreen from "@/screens/WelcomeSplashScreen";
import { AuthContext } from "@/context/AuthContext";
import { Colors } from "@/constants/theme";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";

const Stack = createNativeStackNavigator();

const getBottomTabNavigator = () =>
  require("@/navigation/BottomTabNavigator").default;
const getAuthScreen = () => require("@/screens/AuthScreen").default;
const getPrivacyPolicyScreen = () =>
  require("@/screens/PrivacyPolicyScreen").default;
const getTermsOfServiceScreen = () =>
  require("@/screens/TermsOfServiceScreen").default;
const getOnboardingScreen = () => require("@/screens/OnboardingScreen").default;
const getQuranReaderScreen = () =>
  require("@/screens/QuranReaderScreen").default;
const getPrayerTimesScreen = () =>
  require("@/screens/PrayerTimesScreen").default;
const getQiblaScreen = () => require("@/screens/QiblaScreen").default;
const getTasbeehScreen = () => require("@/screens/TasbeehScreen").default;
const getNamesOfAllahScreen = () =>
  require("@/screens/NamesOfAllahScreen").default;
const getDuasScreen = () => require("@/screens/DuasScreen").default;
const getHadithScreen = () => require("@/screens/HadithScreen").default;
const getIslamicCalendarScreen = () =>
  require("@/screens/IslamicCalendarScreen").default;
const getZakatScreen = () => require("@/screens/ZakatScreen").default;
const getRamadanScreen = () => require("@/screens/RamadanScreen").default;
const getArabicLearningScreen = () =>
  require("@/screens/ArabicLearningScreen").default;
const getArabicGamesScreen = () =>
  require("@/screens/ArabicGamesScreen").default;
const getProphetsScreen = () => require("@/screens/ProphetsScreen").default;
const getSalahGuideScreen = () => require("@/screens/SalahGuideScreen").default;
const getScholarsScreen = () => require("@/screens/ScholarsScreen").default;
const getScholarMediaScreen = () =>
  require("@/screens/ScholarMediaScreen").default;
const getHadithLibraryScreen = () =>
  require("@/screens/HadithLibraryScreen").default;
const getHasanatScreen = () => require("@/screens/HasanatScreen").default;
const getStreakGardenScreen = () =>
  require("@/screens/StreakGardenScreen").default;
const getFiqhScreen = () => require("@/screens/FiqhScreen").default;
const getTimelineScreen = () => require("@/screens/TimelineScreen").default;
const getInspirationScreen = () =>
  require("@/screens/InspirationScreen").default;
const getNasheedsScreen = () => require("@/screens/NasheedsScreen").default;
const getWomensHealthScreen = () =>
  require("@/screens/WomensHealthScreen").default;
const getMuslimHealthScreen = () =>
  require("@/screens/health/HealthHomeScreen").default;
const getHealthSignalsScreen = () =>
  require("@/screens/MuslimHealthScreen").default;
const getHealthReadinessScreen = () =>
  require("@/screens/health/HealthRecoveryScreens").HealthReadinessScreen;
const getHealthSleepScreen = () =>
  require("@/screens/health/HealthRecoveryScreens").HealthSleepScreen;
const getHealthProgressScreen = () =>
  require("@/screens/health/HealthRecoveryScreens").HealthProgressScreen;
const getWorkoutHubScreen = () =>
  require("@/screens/health/HealthWorkoutScreens").WorkoutHubScreen;
const getWorkoutDetailScreen = () =>
  require("@/screens/health/HealthWorkoutScreens").WorkoutDetailScreen;
const getLiveWorkoutScreen = () =>
  require("@/screens/health/HealthWorkoutScreens").LiveWorkoutScreen;
const getWorkoutSummaryScreen = () =>
  require("@/screens/health/HealthWorkoutScreens").WorkoutSummaryScreen;
const getHealthCoachScreen = () =>
  require("@/screens/health/HealthLifestyleScreens").HealthCoachScreen;
const getHydrationScreen = () =>
  require("@/screens/health/HealthLifestyleScreens").HydrationScreen;
const getNutritionScreen = () =>
  require("@/screens/health/HealthLifestyleScreens").NutritionScreen;
const getConnectedHealthScreen = () =>
  require("@/screens/health/HealthLifestyleScreens").ConnectedHealthScreen;
const getWomensHealthSettingsScreen = () =>
  require("@/screens/WomensHealthSettingsScreen").default;
const getWomensHealthConsentScreen = () =>
  require("@/screens/WomensHealthConsentScreen").default;
const getSettingsScreen = () => require("@/screens/SettingsScreen").default;
const getAppStoreShowcaseScreen = () =>
  require("@/screens/AppStoreShowcaseScreen").default;
const getAboutScreen = () => require("@/screens/AboutScreen").default;
const getKidsModeScreen = () => require("@/screens/KidsModeScreen").default;
const getKidsStoriesScreen = () =>
  require("@/screens/KidsStoriesScreen").default;
const getKidsQuizScreen = () => require("@/screens/KidsQuizScreen").default;
const getKidsMemorizationScreen = () =>
  require("@/screens/KidsMemorizationScreen").default;
const getKidsParentScreen = () => require("@/screens/KidsParentScreen").default;
const getGlobalSearchScreen = () =>
  require("@/screens/GlobalSearchScreen").default;
const getPersonalGuideScreen = () =>
  require("@/screens/PersonalGuideScreen").default;
const getProfileRouteScreen = () =>
  require("@/screens/ProfileRouteScreen").default;
const getCommunitySettingsScreen = () =>
  require("@/screens/CommunitySettingsScreen").default;
const getDailyCirclesScreen = () =>
  require("@/screens/DailyCirclesScreen").default;
const getCircleDetailScreen = () =>
  require("@/screens/CircleDetailScreen").default;
const getNotificationsCenterScreen = () =>
  require("@/screens/NotificationsCenterScreen").default;
const getNotificationSettingsScreen = () =>
  require("@/screens/NotificationSettingsScreen").default;
const getSubscriptionScreen = () =>
  require("@/screens/SubscriptionScreen").default;
const getHajjUmrahScreen = () => require("@/screens/HajjUmrahScreen").default;
const getNearbyMosquesScreen = () =>
  require("@/screens/NearbyMosquesScreen").default;
const getShareableCardsScreen = () =>
  require("@/screens/ShareableCardsScreen").default;
const getIslamicFinanceScreen = () =>
  require("@/screens/IslamicFinanceScreen").default;
const getTafsirScreen = () => require("@/screens/TafsirScreen").default;
const getAchievementsScreen = () =>
  require("@/screens/AchievementsScreen").default;
const getChallengesScreen = () => require("@/screens/ChallengesScreen").default;
const getFamilyGroupScreen = () =>
  require("@/screens/FamilyGroupScreen").default;
const getAdhkarScreen = () => require("@/screens/AdhkarScreen").default;
const getHifzScreen = () => require("@/screens/HifzScreen").default;
const getBookmarksScreen = () => require("@/screens/BookmarksScreen").default;
const getJanazahScreen = () => require("@/screens/JanazahScreen").default;
const getNewMuslimScreen = () => require("@/screens/NewMuslimScreen").default;
const getRevertJourneyScreen = () =>
  require("@/screens/RevertJourneyScreen").default;
const getQuranReadingPlanScreen = () =>
  require("@/screens/QuranReadingPlanScreen").default;
const getLibraryHomeScreen = () =>
  require("@/screens/LibraryHomeScreen").default;
const getBookDetailScreen = () => require("@/screens/BookDetailScreen").default;
const getBookReaderScreen = () => require("@/screens/BookReaderScreen").default;
const getLibraryCategoryScreen = () =>
  require("@/screens/LibraryCategoryScreen").default;
const getLibraryProgressScreen = () =>
  require("@/screens/LibraryProgressScreen").default;
const getLibraryAnnotationsScreen = () =>
  require("@/screens/LibraryAnnotationsScreen").default;
const getLibrarySourceReviewScreen = () =>
  require("@/screens/LibrarySourceReviewScreen").default;
const getOfflineLibraryScreen = () =>
  require("@/screens/OfflineLibraryScreen").default;
const ENABLE_INTERNAL_LIBRARY_REVIEW =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_ENABLE_INTERNAL_LIBRARY_REVIEW === "true";
const ENABLE_INTERNAL_APP_STORE_SHOWCASE =
  typeof __DEV__ !== "undefined" && __DEV__;

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      AsyncStorage.getItem("onboarding_completed")
        .then((val) => {
          setShowOnboarding(val !== "true");
          setOnboardingChecked(true);
        })
        .catch(() => {
          setOnboardingChecked(true);
        });
    } else {
      setShowOnboarding(false);
      setOnboardingChecked(true);
    }
  }, [isAuthenticated]);

  if (isLoading || showSplash) {
    return <WelcomeSplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!isAuthenticated) {
    return (
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: "fade" }}
      >
        <Stack.Screen name="Auth" getComponent={getAuthScreen} />
        <Stack.Screen
          name="PrivacyPolicy"
          getComponent={getPrivacyPolicyScreen}
        />
        <Stack.Screen
          name="TermsOfService"
          getComponent={getTermsOfServiceScreen}
        />
      </Stack.Navigator>
    );
  }

  if (!onboardingChecked) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.cardBackground,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (showOnboarding) {
    const OnboardingScreen = getOnboardingScreen();
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        getComponent={getBottomTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Profile"
        getComponent={getProfileRouteScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CommunitySettings"
        getComponent={getCommunitySettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DailyCircles"
        getComponent={getDailyCirclesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CircleDetail"
        getComponent={getCircleDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="QuranReader"
        getComponent={getQuranReaderScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrayerTimes"
        getComponent={getPrayerTimesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Qibla"
        getComponent={getQiblaScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Tasbeeh"
        getComponent={getTasbeehScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NamesOfAllah"
        getComponent={getNamesOfAllahScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Duas"
        getComponent={getDuasScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Hadith"
        getComponent={getHadithScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IslamicCalendar"
        getComponent={getIslamicCalendarScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Zakat"
        getComponent={getZakatScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Ramadan"
        getComponent={getRamadanScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ArabicLearning"
        getComponent={getArabicLearningScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ArabicGames"
        getComponent={getArabicGamesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Prophets"
        getComponent={getProphetsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SalahGuide"
        getComponent={getSalahGuideScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Scholars"
        getComponent={getScholarsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ScholarMedia"
        getComponent={getScholarMediaScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HadithLibrary"
        getComponent={getHadithLibraryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Hasanat"
        getComponent={getHasanatScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StreakGarden"
        getComponent={getStreakGardenScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Fiqh"
        getComponent={getFiqhScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Timeline"
        getComponent={getTimelineScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Inspiration"
        getComponent={getInspirationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Nasheeds"
        getComponent={getNasheedsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WomensHealth"
        getComponent={getWomensHealthScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MuslimHealth"
        getComponent={getMuslimHealthScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HealthSignals"
        getComponent={getHealthSignalsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HealthReadiness"
        getComponent={getHealthReadinessScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HealthSleep"
        getComponent={getHealthSleepScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HealthProgress"
        getComponent={getHealthProgressScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WorkoutHub"
        getComponent={getWorkoutHubScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WorkoutDetail"
        getComponent={getWorkoutDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LiveWorkout"
        getComponent={getLiveWorkoutScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="WorkoutSummary"
        getComponent={getWorkoutSummaryScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="HealthCoach"
        getComponent={getHealthCoachScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Hydration"
        getComponent={getHydrationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Nutrition"
        getComponent={getNutritionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ConnectedHealth"
        getComponent={getConnectedHealthScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WomensHealthSettings"
        getComponent={getWomensHealthSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WomensHealthConsent"
        getComponent={getWomensHealthConsentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        getComponent={getSettingsScreen}
        options={{ headerShown: false }}
      />
      {ENABLE_INTERNAL_APP_STORE_SHOWCASE ? (
        <Stack.Screen
          name="AppStoreShowcase"
          getComponent={getAppStoreShowcaseScreen}
          options={{ headerShown: false }}
        />
      ) : null}
      <Stack.Screen
        name="About"
        getComponent={getAboutScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="KidsMode"
        getComponent={getKidsModeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="KidsStories"
        getComponent={getKidsStoriesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="KidsQuiz"
        getComponent={getKidsQuizScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="KidsMemorization"
        getComponent={getKidsMemorizationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="KidsParent"
        getComponent={getKidsParentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GlobalSearch"
        getComponent={getGlobalSearchScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PersonalGuide"
        getComponent={getPersonalGuideScreen}
        options={{ headerShown: false, animation: "fade_from_bottom" }}
      />
      <Stack.Screen
        name="NotificationsCenter"
        getComponent={getNotificationsCenterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NotificationSettings"
        getComponent={getNotificationSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Subscription"
        getComponent={getSubscriptionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HajjUmrah"
        getComponent={getHajjUmrahScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NearbyMosques"
        getComponent={getNearbyMosquesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ShareableCards"
        getComponent={getShareableCardsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IslamicFinance"
        getComponent={getIslamicFinanceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Tafsir"
        getComponent={getTafsirScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Achievements"
        getComponent={getAchievementsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Challenges"
        getComponent={getChallengesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FamilyGroup"
        getComponent={getFamilyGroupScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Adhkar"
        getComponent={getAdhkarScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Hifz"
        getComponent={getHifzScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Bookmarks"
        getComponent={getBookmarksScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Janazah"
        getComponent={getJanazahScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NewMuslim"
        getComponent={getNewMuslimScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RevertJourney"
        getComponent={getRevertJourneyScreen}
        options={{ title: "Revert Journey" }}
      />
      <Stack.Screen
        name="QuranReadingPlan"
        getComponent={getQuranReadingPlanScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LibraryHome"
        getComponent={getLibraryHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookDetail"
        getComponent={getBookDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookReader"
        getComponent={getBookReaderScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LibraryCategory"
        getComponent={getLibraryCategoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LibraryProgress"
        getComponent={getLibraryProgressScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LibraryAnnotations"
        getComponent={getLibraryAnnotationsScreen}
        options={{ headerShown: false }}
      />
      {ENABLE_INTERNAL_LIBRARY_REVIEW ? (
        <Stack.Screen
          name="LibrarySourceReview"
          getComponent={getLibrarySourceReviewScreen}
          options={{ headerShown: false }}
        />
      ) : null}
      <Stack.Screen
        name="OfflineLibrary"
        getComponent={getOfflineLibraryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        getComponent={getPrivacyPolicyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TermsOfService"
        getComponent={getTermsOfServiceScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
