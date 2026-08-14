import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";
import {
  Colors,
  THEME_SKIN_PRESETS,
  type ThemeColors,
  type ThemeSkinId,
  applyThemeSkin,
} from "@/constants/theme";

export type ThemePreference = "light" | "dark" | "system" | "prayer";

interface ThemeContextType {
  theme: ThemeColors;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  skinId: ThemeSkinId;
  setSkin: (id: ThemeSkinId) => void;
}

const STORAGE_KEY = "nurai_theme_preference";
const SKIN_STORAGE_KEY = "custom_theme_skin";

const ThemeContext = createContext<ThemeContextType>({
  theme: Colors.dark,
  isDark: true,
  preference: "dark",
  setPreference: () => {},
  skinId: "default",
  setSkin: () => {},
});

const VALID_SKINS = Object.keys(THEME_SKIN_PRESETS) as ThemeSkinId[];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");
  const [skinId, setSkinState] = useState<ThemeSkinId>("default");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(SKIN_STORAGE_KEY),
    ]).then(([storedPref, storedSkin]) => {
      // NurAI has one deliberate dark visual identity. Migrate every legacy
      // preference instead of allowing a stored light/system value to flash.
      if (storedPref !== "dark") {
        syncedSetItem(STORAGE_KEY, "dark");
      }
      setPreferenceState("dark");
      if (storedSkin && VALID_SKINS.includes(storedSkin as ThemeSkinId)) {
        setSkinState(storedSkin as ThemeSkinId);
      }
      setLoaded(true);
    });
  }, []);

  const setPreference = useCallback((_pref: ThemePreference) => {
    setPreferenceState("dark");
    syncedSetItem(STORAGE_KEY, "dark");
  }, []);

  const setSkin = useCallback((id: ThemeSkinId) => {
    setSkinState(id);
    syncedSetItem(SKIN_STORAGE_KEY, id);
  }, []);

  const isDark = true;
  const baseTheme = Colors.dark;
  const theme = useMemo(
    () => applyThemeSkin(baseTheme, skinId, isDark),
    [baseTheme, skinId, isDark],
  );

  const value = useMemo(
    () => ({ theme, isDark, preference, setPreference, skinId, setSkin }),
    [theme, isDark, preference, setPreference, skinId, setSkin],
  );

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
