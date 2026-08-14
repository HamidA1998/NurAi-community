import React, { ReactNode } from "react";
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { AppIcon } from "@/components/icons";

interface ModalShellProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  keyboardAvoiding?: boolean;
  scrollable?: boolean;
}

export function ModalShell({
  visible,
  onClose,
  title,
  children,
  size = "md",
  keyboardAvoiding = true,
  scrollable = false,
}: ModalShellProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const maxHeight =
    size === "full"
      ? "95%"
      : size === "lg"
        ? "80%"
        : size === "sm"
          ? "50%"
          : "70%";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        style={[styles.backdrop, { backgroundColor: theme.overlay }]}
      >
        <Pressable style={styles.backdropPress} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={
            keyboardAvoiding && Platform.OS === "ios" ? "padding" : undefined
          }
          enabled={keyboardAvoiding}
          keyboardVerticalOffset={0}
          style={styles.keyboardAvoiding}
          pointerEvents="box-none"
        >
          <Animated.View
            entering={SlideInDown.duration(300).springify().damping(18)}
            style={[
              styles.content,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.surface,
                borderColor: theme.borderSubtle,
                maxHeight,
                paddingBottom: Math.max(insets.bottom, Spacing.xl),
              },
              !isDark ? Shadows.cardElevated : {},
            ]}
          >
            <View style={styles.header}>
              <View
                style={[styles.handle, { backgroundColor: theme.borderStrong }]}
              />
              {title ? (
                <ThemedText type="h4" style={styles.title}>
                  {title}
                </ThemedText>
              ) : null}
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: isDark
                      ? theme.surfaceGlassStrong
                      : theme.backgroundSecondary,
                  },
                ]}
                hitSlop={8}
              >
                <AppIcon name="x" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
            {scrollable ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollBody}
              >
                {children}
              </ScrollView>
            ) : (
              children
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropPress: {
    flex: 1,
  },
  keyboardAvoiding: {
    width: "100%",
  },
  content: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.xl,
  },
  scrollBody: {
    paddingBottom: Spacing.lg,
  },
  header: {
    alignItems: "center",
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    top: Spacing.sm,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
