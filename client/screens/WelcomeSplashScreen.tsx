import React, { useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  Platform,
  Text,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";

import splashLogo from "../../assets/images/nurai-app-icon.png";

interface WelcomeSplashProps {
  onFinish: () => void;
}

const { width, height } = Dimensions.get("window");
const LOGO_SIZE = Math.min(width * 0.58, 260);

const DARK_BG = "#080F1D";
const LIGHT_BG = "#F8F9FC";

const QUOTES = [
  "Verily, with hardship comes ease. \u2014 Quran 94:6",
  "The best of you are those who learn the Quran and teach it. \u2014 Hadith",
  "Indeed, Allah is with the patient. \u2014 Quran 2:153",
  "And He found you lost and guided you. \u2014 Quran 93:7",
  "So remember Me; I will remember you. \u2014 Quran 2:152",
  "My mercy encompasses all things. \u2014 Quran 7:156",
  "And whoever puts their trust in Allah, He is sufficient for them. \u2014 Quran 65:3",
];

export default function WelcomeSplashScreen({ onFinish }: WelcomeSplashProps) {
  const { isDark } = useTheme();
  const finishedRef = useRef(false);

  const quote = useMemo(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
    [],
  );

  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const quoteOpacity = useSharedValue(0);
  const lineWidth = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const handleFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  }, [onFinish]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const quoteStyle = useAnimatedStyle(() => ({
    opacity: quoteOpacity.value,
  }));

  const lineStyle = useAnimatedStyle(() => ({
    width: lineWidth.value,
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  useEffect(() => {
    screenOpacity.value = 1;
    logoOpacity.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });

    titleOpacity.value = withDelay(
      400,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }),
    );

    quoteOpacity.value = withDelay(
      800,
      withTiming(0.6, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }),
    );

    lineWidth.value = withDelay(
      1000,
      withTiming(width * 0.22, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      }),
    );

    const exitTimer = setTimeout(() => {
      screenOpacity.value = withTiming(
        0,
        {
          duration: 400,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(handleFinish)();
          }
        },
      );
    }, 2800);
    const fallbackTimer = setTimeout(handleFinish, 3600);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(fallbackTimer);
    };
  }, [
    handleFinish,
    lineWidth,
    logoOpacity,
    quoteOpacity,
    screenOpacity,
    titleOpacity,
  ]);

  const backgroundColor = isDark ? DARK_BG : LIGHT_BG;

  return (
    <Animated.View style={[styles.container, { backgroundColor }, screenStyle]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={styles.centerArea}>
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <Image source={splashLogo} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        <Animated.View style={[styles.titleContainer, titleStyle]}>
          <Text
            style={[styles.title, { color: isDark ? "#FFFFFF" : "#0F172A" }]}
          >
            NurAI
          </Text>
        </Animated.View>
      </View>

      <View style={styles.bottomArea}>
        <Animated.View style={[styles.quoteContainer, quoteStyle]}>
          <Text
            style={[
              styles.quote,
              {
                color: isDark
                  ? "rgba(148, 163, 184, 0.7)"
                  : "rgba(100, 116, 139, 0.7)",
              },
            ]}
          >
            {quote}
          </Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.bottomLine,
            lineStyle,
            {
              backgroundColor: isDark
                ? "rgba(212, 175, 55, 0.3)"
                : "rgba(16, 185, 129, 0.3)",
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerArea: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -height * 0.06,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  titleContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 36,
    fontFamily: "LibreBaskerville_700Bold",
    letterSpacing: 4,
    textAlign: "center",
  },
  bottomArea: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 70 : 50,
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 40,
  },
  quoteContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  quote: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    lineHeight: 20,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  bottomLine: {
    height: 2.5,
    borderRadius: 1.5,
  },
});
