import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HistoryScreen from "@/screens/HistoryScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import AboutScreen from "@/screens/AboutScreen";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { AppIcon } from "@/components/icons";
import { NurAILogoMark } from "@/components/NurAILogoMark";

export type DrawerParamList = {
  History: undefined;
  Settings: undefined;
  About: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, navigation } = props;

  const menuItems = [
    { name: "History", icon: "clock" as const, label: "History" },
    { name: "Settings", icon: "settings" as const, label: "Settings" },
    { name: "About", icon: "info" as const, label: "About" },
  ];

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        styles.drawerContent,
        { paddingTop: insets.top + Spacing.lg },
      ]}
    >
      <View style={styles.header}>
        <NurAILogoMark
          size={56}
          borderRadius={18}
          color={theme.primary}
          style={styles.logo}
        />
        <ThemedText type="h3" style={styles.appName}>
          NurAI
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.tagline, { color: theme.textSecondary }]}
        >
          Guidance, sources, and daily growth
        </ThemedText>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => {
          const isActive = state.index === index;
          return (
            <Pressable
              key={item.name}
              style={({ pressed }) => [
                styles.menuItem,
                {
                  backgroundColor: isActive
                    ? theme.backgroundSecondary
                    : pressed
                      ? theme.backgroundSecondary
                      : "transparent",
                },
              ]}
              onPress={() => {
                navigation.navigate(item.name);
              }}
            >
              <AppIcon
                name={item.icon}
                size={20}
                color={isActive ? theme.primary : theme.textSecondary}
              />
              <ThemedText
                style={[
                  styles.menuLabel,
                  { color: isActive ? theme.primary : theme.text },
                ]}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  const { theme } = useTheme();

  return (
    <Drawer.Navigator
      initialRouteName="Settings"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: theme.backgroundRoot,
          width: 280,
        },
        drawerType: "front",
        overlayColor: "rgba(0, 0, 0, 0.5)",
      }}
    >
      <Drawer.Screen name="History" component={HistoryScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="About" component={AboutScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    marginBottom: Spacing.lg,
  },
  logo: {
    marginBottom: Spacing.md,
  },
  appName: {
    marginBottom: Spacing.xs,
  },
  tagline: {
    textAlign: "center",
  },
  menuContainer: {
    gap: Spacing.xs,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
});
