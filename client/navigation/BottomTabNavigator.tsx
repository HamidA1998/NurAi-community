import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { PlatformPressable } from "@react-navigation/elements";
import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon, type AppIconName } from "@/components/icons";
import { Fonts } from "@/constants/theme";
import { AuthContext } from "@/context/AuthContext";
import { NuraiGlass } from "@/design-system";
import { useTheme } from "@/hooks/useTheme";
import CommunityScreen from "@/screens/CommunityScreen";
import ExploreScreen from "@/screens/ExploreScreen";
import HomeScreen from "@/screens/HomeScreen";
import MoreScreen from "@/screens/MoreScreen";
import QuranScreen from "@/screens/QuranScreen";
import { fetchCommunityConversations } from "@/services/communitySocialService";

const Tab = createBottomTabNavigator();

const TAB_BAR_HEIGHT = 54;
const TAB_BAR_GUTTER = 16;
const ICON_SIZE = 19;

// react-navigation's default tab icon anchor is a bare-icon-sized 31x28 box,
// but our tab content also carries a label and the active-tab pill. Without
// this override react-navigation centers our (wider) content inside its own
// (narrower) box, which is what caused the label/pill to render off-center.
const ICON_ANCHOR_WIDTH = 68;
const ICON_ANCHOR_HEIGHT = 44;

// Swipe-to-switch-tabs tuning: activeOffsetX/failOffsetY let a horizontal
// drag win over vertical scrolling in whatever the gesture starts on top of,
// while plain taps (near-zero movement) never activate the pan at all.
const SWIPE_ACTIVATION_DISTANCE = 20;
const SWIPE_FAIL_DISTANCE_Y = 15;
const SWIPE_DISTANCE_THRESHOLD = 40;
const SWIPE_VELOCITY_THRESHOLD = 800;

const TABS: {
  name: string;
  label: string;
  icon: AppIconName;
  testID: string;
  component: React.ComponentType<any>;
}[] = [
  {
    name: "Home",
    label: "Home",
    icon: "home-mark",
    testID: "tab-home",
    component: HomeScreen,
  },
  {
    name: "Explore",
    label: "Explore",
    icon: "explore-mark",
    testID: "tab-explore",
    component: ExploreScreen,
  },
  {
    name: "Quran",
    label: "Quran",
    icon: "quran",
    testID: "tab-quran",
    component: QuranScreen,
  },
  {
    name: "Community",
    label: "Community",
    icon: "community",
    testID: "tab-community",
    component: CommunityScreen,
  },
  {
    name: "More",
    label: "More",
    icon: "more-mark",
    testID: "tab-more",
    component: MoreScreen,
  },
];

/**
 * Softly refresh the direct-message signal while the tab navigator is active.
 * Guests never issue the request and network failures never interrupt navigation.
 */
function useCommunityUnreadBadge(): boolean {
  const { isAuthenticated } = useContext(AuthContext);
  const [hasUnread, setHasUnread] = useState(false);

  const refresh = useCallback(() => {
    if (!isAuthenticated) {
      setHasUnread(false);
      return;
    }

    fetchCommunityConversations()
      .then((conversations) => {
        setHasUnread(
          conversations.some((conversation) => conversation.unreadCount > 0),
        );
      })
      .catch(() => {
        // A missed badge refresh must never make the primary navigation noisy.
      });
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const interval = setInterval(refresh, 45_000);
      return () => clearInterval(interval);
    }, [refresh]),
  );

  return hasUnread;
}

function TabIcon({
  name,
  color,
  focused,
  label,
  badge = false,
}: {
  name: AppIconName;
  color: string;
  focused: boolean;
  label: string;
  badge?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.iconContainer}>
      {focused ? (
        <View pointerEvents="none" style={styles.activeLensClip}>
          <NuraiGlass
            pointerEvents="none"
            interactive
            radius={22}
            tint="rgba(86,179,148,0.045)"
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      ) : null}

      <View style={[styles.iconContent, focused && styles.iconContentFocused]}>
        <View style={styles.iconGlyphWrap} pointerEvents="none">
          <AppIcon
            name={name}
            size={ICON_SIZE}
            color={color}
            weight={focused ? "medium" : "regular"}
            decorative
          />
          {badge ? (
            <View style={[styles.badgeDot, { backgroundColor: theme.error }]} />
          ) : null}
        </View>

        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[styles.iconLabel, { color }]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function FullPillGlass() {
  return (
    <NuraiGlass
      pointerEvents="none"
      tint="rgba(10,17,20,0.1)"
      radius={TAB_BAR_HEIGHT / 2}
      style={StyleSheet.absoluteFillObject}
    />
  );
}

function FloatingPillBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <View
        pointerEvents="none"
        style={[styles.pillShadow, styles.pillNeutralShadow]}
      >
        <View pointerEvents="none" style={[styles.pillClip]}>
          <FullPillGlass />
        </View>
      </View>
    </View>
  );
}

/** Navigate to the sibling tab one step left/right of `index`, if one exists. */
function useAdjacentTabNavigation(index: number) {
  const navigation = useNavigation();

  return useCallback(
    (direction: 1 | -1) => {
      const target = TABS[index + direction];
      if (!target) return;
      navigation.navigate(target.name as never);
    },
    [index, navigation],
  );
}

/**
 * Wraps the default tab bar button so a horizontal swipe (in either
 * direction) moves to the neighboring tab, in addition to a normal tap.
 * Navigating this way still goes through `navigation.navigate`, so it fires
 * the same focus events (and therefore the same haptic below) as a tap.
 */
function createSwipeableTabButton(index: number) {
  return function SwipeableTabButton({
    style,
    onPress,
    onLongPress,
    ...rest
  }: BottomTabBarButtonProps) {
    const goToAdjacentTab = useAdjacentTabNavigation(index);

    const swipeGesture = useMemo(
      () =>
        Gesture.Pan()
          .activeOffsetX([
            -SWIPE_ACTIVATION_DISTANCE,
            SWIPE_ACTIVATION_DISTANCE,
          ])
          .failOffsetY([-SWIPE_FAIL_DISTANCE_Y, SWIPE_FAIL_DISTANCE_Y])
          .onEnd((event) => {
            "worklet";
            if (
              event.translationX < -SWIPE_DISTANCE_THRESHOLD ||
              event.velocityX < -SWIPE_VELOCITY_THRESHOLD
            ) {
              runOnJS(goToAdjacentTab)(1);
            } else if (
              event.translationX > SWIPE_DISTANCE_THRESHOLD ||
              event.velocityX > SWIPE_VELOCITY_THRESHOLD
            ) {
              runOnJS(goToAdjacentTab)(-1);
            }
          }),
      [goToAdjacentTab],
    );

    return (
      <GestureDetector gesture={swipeGesture}>
        <PlatformPressable
          {...rest}
          style={style}
          onPress={onPress}
          onLongPress={onLongPress}
        />
      </GestureDetector>
    );
  };
}

function AppTabNavigator({
  hasUnreadMessages,
}: {
  hasUnreadMessages: boolean;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const hasHandledInitialFocus = useRef(false);

  // Stable per-tab button components: created once so swiping doesn't remount
  // (and lose gesture/press state) on every re-render of the navigator.
  const tabButtons = useMemo(
    () => TABS.map((_, index) => createSwipeableTabButton(index)),
    [],
  );

  return (
    <Tab.Navigator
      screenListeners={{
        focus: () => {
          // Skip the very first focus (the initial route mounting on app
          // launch isn't a tab "change" a user made).
          if (!hasHandledInitialFocus.current) {
            hasHandledInitialFocus.current = true;
            return;
          }
          void Haptics.selectionAsync().catch(() => undefined);
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarShowLabel: false,
        tabBarBackground: () => <FloatingPillBackground />,
        tabBarIconStyle: {
          width: ICON_ANCHOR_WIDTH,
          height: ICON_ANCHOR_HEIGHT,
        },
        tabBarStyle: {
          position: Platform.OS === "web" ? ("fixed" as any) : "absolute",
          left: 0,
          right: Platform.OS === "web" ? 0 : undefined,
          marginLeft: Platform.OS === "web" ? 0 : TAB_BAR_GUTTER,
          width:
            Platform.OS === "web"
              ? undefined
              : windowWidth - TAB_BAR_GUTTER * 2,
          bottom: Platform.OS === "web" ? 0 : Math.max(insets.bottom - 10, 8),
          height: TAB_BAR_HEIGHT,
          paddingBottom: 0,
          paddingTop: 0,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: {
          height: TAB_BAR_HEIGHT,
          paddingHorizontal: 1,
        },
      }}
    >
      {TABS.map((tab, index) => {
        const badge = tab.name === "Community" && hasUnreadMessages;
        return (
          <Tab.Screen
            key={tab.name}
            name={tab.name}
            component={tab.component}
            options={{
              tabBarButtonTestID: tab.testID,
              tabBarButton: tabButtons[index],
              tabBarAccessibilityLabel: badge
                ? `${tab.label} tab, unread messages`
                : `${tab.label} tab`,
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  name={tab.icon}
                  color={color}
                  focused={focused}
                  label={tab.label}
                  badge={badge}
                />
              ),
            }}
          />
        );
      })}
    </Tab.Navigator>
  );
}

export default function BottomTabNavigator() {
  const hasUnreadMessages = useCommunityUnreadBadge();
  return <AppTabNavigator hasUnreadMessages={hasUnreadMessages} />;
}

const styles = StyleSheet.create({
  pillShadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 12,
  },
  pillNeutralShadow: {
    shadowColor: "#000000",
    shadowOpacity: 0.18,
  },
  pillClip: {
    flex: 1,
    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  iconContainer: {
    width: ICON_ANCHOR_WIDTH,
    height: ICON_ANCHOR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  activeLensClip: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 0,
    right: 0,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  iconContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  iconContentFocused: {
    transform: [{ scale: 1.04 }],
  },
  iconGlyphWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconLabel: {
    fontFamily: Fonts?.sansSemiBold || undefined,
    fontSize: 9,
    fontWeight: "600",
    lineHeight: 13,
  },
  badgeDot: {
    position: "absolute",
    right: -3,
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
