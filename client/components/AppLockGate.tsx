import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, AppState, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { AppIcon } from "@/components/icons";

export function AppLockGate({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [isLocked, setIsLocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const appState = useRef(AppState.currentState);
  const lastBackground = useRef<number>(0);

  const authenticate = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock NurAI",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setIsLocked(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const checkLock = async () => {
      const enabled = await AsyncStorage.getItem("app_lock_enabled");
      if (enabled === "true") {
        setIsLocked(true);
        authenticate();
      }
      setChecking(false);
    };
    checkLock();
  }, [authenticate]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (nextState) => {
      if (appState.current.match(/active/) && nextState === "background") {
        lastBackground.current = Date.now();
      }
      if (appState.current.match(/background/) && nextState === "active") {
        const enabled = await AsyncStorage.getItem("app_lock_enabled");
        const elapsed = Date.now() - lastBackground.current;
        if (enabled === "true" && elapsed > 5000) {
          setIsLocked(true);
          authenticate();
        }
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [authenticate]);

  if (checking) {
    return (
      <View
        style={[styles.lockScreen, { backgroundColor: theme.backgroundRoot }]}
      />
    );
  }

  if (isLocked) {
    return (
      <View
        style={[styles.lockScreen, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.lockContent}>
          <View
            style={[styles.lockIcon, { backgroundColor: theme.primary + "20" }]}
          >
            <AppIcon name="lock" size={40} color={theme.primary} />
          </View>
          <ThemedText
            type="h3"
            style={{ textAlign: "center", marginBottom: 8 }}
          >
            NurAI is Locked
          </ThemedText>
          <ThemedText
            type="body"
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            Authenticate to continue
          </ThemedText>
          <Pressable
            style={[styles.unlockButton, { backgroundColor: theme.primary }]}
            onPress={authenticate}
          >
            <AppIcon name="unlock" size={18} color="#FFFFFF" />
            <ThemedText
              type="body"
              style={{ color: "#FFFFFF", fontWeight: "600" }}
            >
              Unlock
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  lockContent: {
    alignItems: "center",
    padding: 24,
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  unlockButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
});
