import React from "react";
import { View, StyleSheet } from "react-native";

import { NurAILogoMark } from "@/components/NurAILogoMark";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface HeaderTitleProps {
  title: string;
}

export function HeaderTitle({ title }: HeaderTitleProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <NurAILogoMark size={28} borderRadius={9} color={theme.primary} />
      <ThemedText style={styles.title}>{title}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  title: {
    marginLeft: Spacing.sm,
    fontSize: 17,
    fontWeight: "600",
  },
});
