import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { useTheme } from "@/hooks/useTheme";
import { Fonts } from "@/constants/theme";

interface UseScreenOptionsParams {
  transparent?: boolean;
}

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  const { theme, isDark } = useTheme();

  const opaqueHeaderBg = isDark
    ? theme.backgroundDefault
    : theme.backgroundRoot;

  return {
    headerTitleAlign: "center",
    headerTransparent: transparent,
    headerBlurEffect: isDark
      ? "systemUltraThinMaterialDark"
      : "systemThinMaterial",
    headerTintColor: theme.text,
    headerTitleStyle: {
      fontFamily: Fonts?.sansSemiBold || undefined,
      fontWeight: "600",
      fontSize: 17,
      color: theme.text,
    },
    headerBackTitleStyle: {
      fontFamily: Fonts?.sans || undefined,
      fontSize: 15,
    },
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor: Platform.select({
        ios: transparent ? undefined : opaqueHeaderBg,
        android: opaqueHeaderBg,
        web: transparent ? "transparent" : opaqueHeaderBg,
      }),
    },
    gestureEnabled: true,
    gestureDirection: "horizontal",
    fullScreenGestureEnabled: isLiquidGlassAvailable() ? false : true,
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
  };
}
