import React from "react";
import { registerRootComponent } from "expo";
import * as SplashScreen from "expo-splash-screen";
import { LogBox, StyleSheet, Text, View } from "react-native";

LogBox.ignoreLogs([
  "[expo-notifications] Error reading persisted server registration info",
  "Missing com.apple.developer.healthkit entitlement",
]);

// Automated simulator runs intentionally exercise optional native modules and
// seeded QA state. Keep the visual smoke surface clear without muting warnings
// in customer or ordinary developer builds.
if (process.env.EXPO_PUBLIC_QA_AUTH_BYPASS === "true") {
  LogBox.ignoreAllLogs(true);
}

let startupError = null;

function StartupFallback() {
  React.useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  const errorMessage =
    startupError instanceof Error
      ? startupError.message
      : typeof startupError === "string"
        ? startupError
        : null;

  return (
    <View style={styles.root}>
      <View style={styles.badge} />
      <Text style={styles.title}>NurAI is starting</Text>
      <Text style={styles.message}>
        We could not finish loading the app shell. Please close and reopen
        NurAI.
      </Text>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
}

let RootComponent = StartupFallback;

try {
  RootComponent = require("@/App").default;
} catch (error) {
  startupError = error;
  console.error("NurAI startup failed before root registration", error);
}

registerRootComponent(RootComponent);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#050712",
  },
  badge: {
    width: 54,
    height: 54,
    marginBottom: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4A63A",
    backgroundColor: "#07121F",
  },
  title: {
    color: "#F8FBFF",
    fontFamily: "System",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    maxWidth: 320,
    marginTop: 10,
    color: "#A9BBC7",
    fontFamily: "System",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  error: {
    maxWidth: 340,
    marginTop: 18,
    color: "#E4A63A",
    fontFamily: "System",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
});
