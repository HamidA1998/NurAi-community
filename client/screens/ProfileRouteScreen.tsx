import React from "react";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";

import ProfileScreen from "@/screens/ProfileScreen";

/**
 * Presents Profile outside the tab navigator without inheriting tab-bar
 * spacing from the surrounding application shell.
 */
export default function ProfileRouteScreen() {
  return (
    <BottomTabBarHeightContext.Provider value={0}>
      <ProfileScreen />
    </BottomTabBarHeightContext.Provider>
  );
}
