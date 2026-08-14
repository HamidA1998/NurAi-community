import React, { useState } from "react";
import { reloadAppAsync } from "expo";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Text,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { NurAILogoMark } from "@/components/NurAILogoMark";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { AppIcon } from "@/components/icons";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const { theme } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error("Failed to restart app:", restartError);
      resetError();
    }
  };

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <View
        style={[
          styles.recoveryCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderSubtle,
          },
        ]}
      >
        <View
          style={[
            styles.logoShell,
            {
              backgroundColor: theme.primarySubtle,
              borderColor: theme.primaryBorder,
            },
          ]}
        >
          <NurAILogoMark size={54} borderRadius={18} color={theme.primary} />
        </View>

        <View style={styles.content}>
          <ThemedText type="h1" style={styles.title}>
            NurAI needs a quick refresh
          </ThemedText>

          <ThemedText
            type="body"
            style={[styles.message, { color: theme.textSecondary }]}
          >
            Reload the app to continue from a clean state. If it happens again,
            reopen NurAI and try the same action once more.
          </ThemedText>

          <View style={styles.actions}>
            <Pressable
              onPress={handleRestart}
              accessibilityRole="button"
              accessibilityLabel="Reload NurAI"
              style={({ pressed }) => [
                styles.button,
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <LinearGradient
                colors={[
                  theme.gradientStart,
                  theme.gradientMid,
                  theme.gradientEnd,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <AppIcon name="refresh-cw" size={17} color={theme.onGradient} />
                <ThemedText
                  type="body"
                  style={[styles.buttonText, { color: theme.onGradient }]}
                >
                  Reload NurAI
                </ThemedText>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={resetError}
              accessibilityRole="button"
              accessibilityLabel="Return to NurAI without reloading"
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor: theme.borderSubtle,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={[styles.secondaryButtonText, { color: theme.text }]}
              >
                Return to app
              </ThemedText>
            </Pressable>
          </View>

          {__DEV__ ? (
            <Pressable
              onPress={() => setIsModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Show developer error details"
              style={({ pressed }) => [
                styles.detailsButton,
                {
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <AppIcon name="alert-circle" size={15} color={theme.textMuted} />
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Show developer details
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>

      {__DEV__ ? (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText type="h2" style={styles.modalTitle}>
                  Error Details
                </ThemedText>
                <Pressable
                  onPress={() => setIsModalVisible(false)}
                  style={({ pressed }) => [
                    styles.closeButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <AppIcon name="x" size={24} color={theme.text} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator
              >
                <View
                  style={[
                    styles.errorContainer,
                    { backgroundColor: theme.backgroundDefault },
                  ]}
                >
                  <Text
                    style={[
                      styles.errorText,
                      {
                        color: theme.text,
                        fontFamily: "monospace",
                      },
                    ]}
                    selectable
                  >
                    {formatErrorDetails()}
                  </Text>
                </View>
              </ScrollView>
            </ThemedView>
          </View>
        </Modal>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  recoveryCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing["2xl"],
    alignItems: "center",
  },
  logoShell: {
    width: 82,
    height: 82,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    width: "100%",
  },
  title: {
    textAlign: "center",
    lineHeight: 40,
  },
  message: {
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 330,
  },
  actions: {
    width: "100%",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  button: {
    width: "100%",
    borderRadius: BorderRadius.full,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  buttonGradient: {
    minHeight: 54,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  buttonText: {
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  secondaryButtonText: {
    fontWeight: "700",
  },
  detailsButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    width: "100%",
    height: "90%",
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.2)",
  },
  modalTitle: {
    fontWeight: "600",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: Spacing.lg,
  },
  errorContainer: {
    width: "100%",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    padding: Spacing.lg,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    width: "100%",
  },
});
