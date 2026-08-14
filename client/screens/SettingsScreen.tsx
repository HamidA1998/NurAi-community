import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TextInput,
  Share,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import * as LocalAuthentication from "expo-local-authentication";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import {
  exportProgressBackup,
  restoreProgressBackup,
  syncedSetItem,
} from "@/lib/progress-sync";
import { getBookmarks } from "@/lib/bookmarks";

import { ThemedText } from "@/components/ThemedText";
import { PremiumBadge } from "@/components/PremiumGate";
import { ListRow, ListDivider } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";
import { ModalShell } from "@/components/ModalShell";
import { useTheme } from "@/hooks/useTheme";
import { Aurora, NuraiGlass } from "@/design-system";
import {
  Spacing,
  BorderRadius,
  Shadows,
  THEME_SKIN_PRESETS,
} from "@/constants/theme";
import type { ThemeSkinId } from "@/constants/theme";
import { useWomensHealth } from "@/context/WomensHealthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { hasAccess } from "@/config/entitlements";
import { AuthContext } from "@/context/AuthContext";
import { GeometricCardPattern } from "@/components/premium/svg/PremiumSvgs";
import { AppIcon } from "@/components/icons";

const APP_VERSION = Constants.expoConfig?.version ?? "1.1.6";
const QURAN_REFLECTION_NOTES_KEY = "quran_reflection_notes_v1";

function countJsonArray(raw: string | null): number {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export default function SettingsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {
    settings: whSettings,
    updateSettings: updateWHSettings,
    consentGiven,
    deleteAllData: deleteWHData,
  } = useWomensHealth();
  const { currentPlan } = useSubscription();
  const { user, logout, deleteAccount, refreshUser } =
    React.useContext(AuthContext);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [editNameError, setEditNameError] = useState("");

  const planLabels: Record<string, string> = {
    free: "Free Plan",
    premium: "Premium Plan",
    scholar: "Scholar Plan",
    lifetime: "Lifetime Access",
  };

  const isPremium = hasAccess(currentPlan, "premium");

  const THEME_SKINS = Object.values(THEME_SKIN_PRESETS);

  const { skinId: selectedSkin, setSkin: setSelectedSkinContext } =
    useTheme() as any;
  const [prayerNotifications, setPrayerNotifications] = useState(false);
  const [dailyHadith, setDailyHadith] = useState(true);
  const [use24Hour, setUse24Hour] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [globalMadhab, setGlobalMadhab] = useState("general");
  const [isRevert, setIsRevert] = useState(false);
  const [shahadaDate, setShahadaDate] = useState("");
  const [showMadhabPicker, setShowMadhabPicker] = useState(false);
  const [showShahadaDatePicker, setShowShahadaDatePicker] = useState(false);

  const MADHAB_OPTIONS = [
    { id: "general", label: "General / no preference" },
    { id: "hanafi", label: "Hanafi" },
    { id: "maliki", label: "Maliki" },
    { id: "shafii", label: "Shafi'i" },
    { id: "hanbali", label: "Hanbali" },
  ];

  useEffect(() => {
    AsyncStorage.getItem("app_lock_enabled").then((v) => {
      if (v === "true") setAppLockEnabled(true);
    });
    AsyncStorage.getItem("nurai_global_madhab").then((v) => {
      if (v) {
        setGlobalMadhab(v);
      } else {
        AsyncStorage.getItem("womens_health_madhab").then((whv) => {
          if (whv) setGlobalMadhab(whv);
        });
      }
    });
    AsyncStorage.getItem("nurai_revert_status").then((v) => {
      if (v) {
        try {
          const parsed = JSON.parse(v);
          if (parsed.isRevert) setIsRevert(true);
          if (parsed.shahadaDate) setShahadaDate(parsed.shahadaDate);
        } catch {}
      }
    });
  }, []);

  const handleAppLockToggle = async (value: boolean) => {
    if (value) {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return;
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to enable App Lock",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setAppLockEnabled(true);
        await syncedSetItem("app_lock_enabled", "true");
      }
    } else {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to disable App Lock",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setAppLockEnabled(false);
        await syncedSetItem("app_lock_enabled", "false");
      }
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSaveDisplayName = async () => {
    const trimmed = editNameValue.trim();
    if (!trimmed) {
      setEditNameError("Please enter a name");
      return;
    }
    if (trimmed.length < 2) {
      setEditNameError("Name must be at least 2 characters");
      return;
    }
    setSavingName(true);
    setEditNameError("");
    try {
      const { apiRequest } = await import("@/lib/query-client");
      const res = await apiRequest("PUT", "/api/auth/profile", {
        displayName: trimmed,
      });
      await res.json();
      await refreshUser();
      setShowEditNameModal(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      console.error(
        "[Settings] Save name failed:",
        err?.message || err,
        err?.status,
      );
      const msg =
        err?.status === 401
          ? "Please sign in again to update your name."
          : "Failed to update name. Please try again.";
      setEditNameError(msg);
    } finally {
      setSavingName(false);
    }
  };

  const handleExportData = async () => {
    if (!isPremium) {
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }

    try {
      const bookmarks = await getBookmarks();
      const quranReflectionNotesCount = countJsonArray(
        await AsyncStorage.getItem(QURAN_REFLECTION_NOTES_KEY),
      );

      const payload = {
        ...(await exportProgressBackup()),
        exportedAt: new Date().toISOString(),
        account: user
          ? {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
            }
          : null,
        bookmarks,
      };

      const accountLabel =
        payload.account?.displayName || payload.account?.username || "Guest";
      const exportDate = new Date(payload.exportedAt);
      const summary = [
        "NurAI private backup",
        `Prepared: ${exportDate.toLocaleString()}`,
        `Account: ${accountLabel}`,
        `Saved bookmarks: ${bookmarks.length}`,
        `Saved Quran reflection notes: ${quranReflectionNotesCount}`,
        "Your detailed backup stays private unless you choose where to share it.",
      ].join("\n");
      const backupJson = JSON.stringify(payload, null, 2);
      const fileName = `nurai-private-backup-${payload.exportedAt.slice(0, 10)}.json`;
      const directory =
        FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const canShareFile =
        Platform.OS !== "web" &&
        directory &&
        (await Sharing.isAvailableAsync());

      if (canShareFile) {
        const fileUri = directory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, backupJson, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Share NurAI Private Backup",
          UTI: "public.json",
        });
      } else {
        await Share.share({
          title: "NurAI Private Backup",
          message: summary,
        });
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert(
        "Export failed",
        "We could not prepare your data export. Please try again.",
      );
    }
  };

  const handleRestoreData = async () => {
    if (!isPremium) {
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const parsed = JSON.parse(raw);
      const restored = await restoreProgressBackup(parsed);
      if (!restored) {
        Alert.alert(
          "Restore failed",
          "That file does not look like a NurAI private backup.",
        );
        return;
      }

      Alert.alert(
        "Backup restored",
        "Your saved NurAI progress, including private AI answer packets and Quran reflection notes when present, has been restored on this device.",
      );
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert(
        "Restore failed",
        "We could not restore this backup. Please check the file and try again.",
      );
    }
  };

  const handleToggle = (setter: (v: boolean) => void) => (value: boolean) => {
    setter(value);
    if (Platform.OS !== "web" && hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSkinSelect = async (skinId: ThemeSkinId, isFree: boolean) => {
    if (!isFree && !isPremium) {
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }
    setSelectedSkinContext(skinId);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleMadhabSelect = async (madhabId: string) => {
    setGlobalMadhab(madhabId);
    setShowMadhabPicker(false);
    await syncedSetItem("nurai_global_madhab", madhabId);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRevertToggle = async (value: boolean) => {
    setIsRevert(value);
    const status = JSON.stringify({
      isRevert: value,
      shahadaDate: value ? shahadaDate : "",
    });
    await syncedSetItem("nurai_revert_status", status);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleShahadaDateSave = async (dateStr: string) => {
    const trimmedDate = dateStr.trim();
    const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(trimmedDate);
    const parsedDate = new Date(`${trimmedDate}T00:00:00`);
    if (!isValidFormat || Number.isNaN(parsedDate.getTime())) {
      setShahadaDate("");
      return;
    }
    setShahadaDate(trimmedDate);
    setShowShahadaDatePicker(false);
    const status = JSON.stringify({ isRevert: true, shahadaDate: trimmedDate });
    await syncedSetItem("nurai_revert_status", status);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const madhabLabel =
    MADHAB_OPTIONS.find((m) => m.id === globalMadhab)?.label ||
    "General / no preference";
  const madhabSubtitle =
    globalMadhab === "general"
      ? "General source-first guidance"
      : `Following ${madhabLabel} school`;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Aurora />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          testID="button-back"
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <NuraiGlass
            pointerEvents="none"
            interactive
            radius={22}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h4" accessibilityRole="header">
          Settings
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(350)}
          style={[
            styles.settingsHero,
            {
              backgroundColor: "transparent",
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <NuraiGlass
            pointerEvents="none"
            radius={BorderRadius.xl}
            tint={isPremium ? `${theme.primary}12` : undefined}
            style={StyleSheet.absoluteFill}
          />
          <GeometricCardPattern color={theme.primary} opacity={0.012} />
          <View style={styles.settingsHeroTop}>
            <View>
              <ThemedText
                type="caption"
                style={[styles.settingsHeroEyebrow, { color: theme.primary }]}
              >
                YOUR SETTINGS
              </ThemedText>
              <ThemedText type="h3" style={{ color: theme.text }}>
                Your NurAI setup
              </ThemedText>
            </View>
            <View
              style={[
                styles.planPill,
                {
                  backgroundColor: isPremium
                    ? theme.primarySubtle
                    : theme.backgroundSecondary,
                  borderColor: isPremium ? theme.primaryBorder : theme.border,
                },
              ]}
            >
              <AppIcon
                name={isPremium ? "star" : "user"}
                size={13}
                color={isPremium ? theme.primary : theme.textMuted}
              />
              <ThemedText
                type="caption"
                style={{
                  color: isPremium ? theme.primary : theme.textMuted,
                  fontWeight: "800",
                }}
              >
                {planLabels[currentPlan] || "Free Plan"}
              </ThemedText>
            </View>
          </View>
          <View
            style={[
              styles.settingsHeroDivider,
              { backgroundColor: `${theme.primary}38` },
            ]}
          />
          <View style={styles.settingsHeroStats}>
            <View style={styles.settingsHeroStat}>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Theme
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.text }}>
                Night atmosphere
              </ThemedText>
            </View>
            <View style={styles.settingsHeroStat}>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Madhab
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.text }}>
                {madhabLabel}
              </ThemedText>
            </View>
            <View style={styles.settingsHeroStat}>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Privacy
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.text }}>
                {appLockEnabled ? "App Lock On" : "App Lock Off"}
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        <View style={styles.section}>
          <SectionHeader title="APPEARANCE" />
          <View
            style={[
              styles.groupContainer,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderLight,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.md}
              style={StyleSheet.absoluteFill}
            />
            <ListRow
              icon="moon"
              title="NurAI night atmosphere"
              subtitle="Dark by design across every screen"
              showChevron={false}
              rightElement={
                <AppIcon name="shield" size={18} color={theme.primary} />
              }
            />
          </View>
          <View
            style={[
              styles.groupContainer,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderLight,
                marginTop: Spacing.md,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.md}
              style={StyleSheet.absoluteFill}
            />
            <ListRow
              icon="droplet"
              title="Custom Themes"
              subtitle="Personalise your app colours"
              showChevron={false}
              rightElement={
                !isPremium ? <PremiumBadge tier="premium" /> : undefined
              }
            />
            <ListDivider />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.skinRow}
            >
              {THEME_SKINS.map((skin) => {
                const isSelected = selectedSkin === skin.id;
                const isLocked = skin.premium && !isPremium;
                return (
                  <Pressable
                    key={skin.id}
                    testID={`theme-skin-${skin.id}`}
                    style={({ pressed }) => [
                      styles.skinOption,
                      {
                        backgroundColor: isSelected
                          ? `${skin.color}14`
                          : theme.surfaceGlass,
                        borderColor: isSelected
                          ? skin.color
                          : theme.borderSubtle,
                      },
                      isSelected && [
                        styles.skinOptionActive,
                        { borderColor: skin.color },
                      ],
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleSkinSelect(skin.id, !skin.premium)}
                    accessibilityRole="radio"
                    accessibilityLabel={`${skin.name} theme`}
                    accessibilityHint={
                      isLocked ? "Requires Premium" : skin.subtitle
                    }
                    accessibilityState={{
                      selected: isSelected,
                      disabled: isLocked,
                    }}
                  >
                    <View style={styles.skinPreviewRow}>
                      <View
                        style={[
                          styles.skinColorCircle,
                          {
                            backgroundColor: skin.surface,
                            borderColor: skin.accent,
                          },
                          isSelected && styles.skinColorCircleActive,
                        ]}
                      >
                        <LinearGradient
                          pointerEvents="none"
                          colors={[
                            skin.surface,
                            `${skin.color}88`,
                            skin.accent,
                          ]}
                          start={{ x: 0.08, y: 0.1 }}
                          end={{ x: 0.9, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <View
                          style={[
                            styles.skinPreviewHorizon,
                            { borderColor: `${skin.accent}AA` },
                          ]}
                        />
                        <View
                          style={[
                            styles.skinPrimaryGlow,
                            { backgroundColor: skin.color },
                          ]}
                        />
                        <View
                          style={[
                            styles.skinAccentDot,
                            { backgroundColor: skin.accent },
                          ]}
                        />
                        <View
                          style={[
                            styles.skinMiniSurface,
                            { backgroundColor: `${skin.surface}D8` },
                          ]}
                        />
                        {isSelected ? (
                          <AppIcon name="check" size={14} color="#FFFFFF" />
                        ) : null}
                        {isLocked ? (
                          <AppIcon name="lock" size={12} color="#FFFFFF" />
                        ) : null}
                      </View>
                    </View>
                    <ThemedText
                      type="small"
                      style={{
                        color: isSelected ? skin.color : theme.textSecondary,
                        fontWeight: isSelected ? "600" : "400",
                        textAlign: "center",
                      }}
                    >
                      {skin.name}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{
                        color: theme.textMuted,
                        fontSize: 10,
                        lineHeight: 13,
                        textAlign: "center",
                      }}
                    >
                      {skin.subtitle}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="ISLAMIC PREFERENCES" />
          <View
            style={[
              styles.groupContainer,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderLight,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.md}
              style={StyleSheet.absoluteFill}
            />
            <ListRow
              icon="book-open"
              title="Madhab"
              subtitle={madhabSubtitle}
              onPress={() => setShowMadhabPicker(true)}
            />
            <ListDivider />
            <ListRow
              icon="heart"
              title="New / Revert Muslim"
              subtitle={
                isRevert
                  ? shahadaDate
                    ? `Since ${new Date(shahadaDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`
                    : "Enabled"
                  : "AI adapts with gentler guidance"
              }
              showChevron={false}
              switchValue={isRevert}
              onSwitchChange={handleRevertToggle}
              testID="switch-revert"
            />
            {isRevert ? (
              <>
                <ListDivider />
                <ListRow
                  icon="calendar"
                  title="Shahada Date"
                  subtitle={
                    shahadaDate
                      ? new Date(shahadaDate).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Tap to set your shahada date"
                  }
                  onPress={() => setShowShahadaDatePicker(true)}
                />
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="PRAYER" />
          <View
            style={[
              styles.groupContainer,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderLight,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.md}
              tint={`${theme.scholar}09`}
              style={StyleSheet.absoluteFill}
            />
            <ListRow
              icon="bell"
              title="Prayer Notifications"
              subtitle="Get reminded before each prayer"
              showChevron={false}
              switchValue={prayerNotifications}
              onSwitchChange={handleToggle(setPrayerNotifications)}
            />
            <ListDivider />
            <ListRow
              icon="clock"
              title="24-Hour Time Format"
              subtitle={
                use24Hour ? "Using 24-hour format" : "Using 12-hour format"
              }
              showChevron={false}
              switchValue={use24Hour}
              onSwitchChange={handleToggle(setUse24Hour)}
            />
            <ListDivider />
            <ListRow
              icon="map-pin"
              title="Calculation Method"
              subtitle="Muslim World League"
              onPress={() => navigation.navigate("PrayerTimes")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="NOTIFICATIONS" />
          <View
            style={[
              styles.groupContainer,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderLight,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.md}
              style={StyleSheet.absoluteFill}
            />
            <ListRow
              icon="bell"
              title="Notification Settings"
              subtitle="Prayer reminders, quiet hours, and more"
              onPress={() => navigation.navigate("NotificationSettings")}
            />
            <ListDivider />
            <ListRow
              icon="book"
              title="Daily Hadith"
              subtitle="Receive a daily hadith reminder"
              showChevron={false}
              switchValue={dailyHadith}
              onSwitchChange={handleToggle(setDailyHadith)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="SUBSCRIPTION" />
          <View
            style={[
              styles.groupContainer,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderLight,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.md}
              tint={`${theme.primary}0D`}
              style={StyleSheet.absoluteFill}
            />
            <ListRow
              icon="star"
              title="NurAI Plans"
              subtitle={
                currentPlan === "free"
                  ? "Upgrade for advanced features"
                  : planLabels[currentPlan]
              }
              onPress={() =>
                navigation.navigate("Subscription", { initialTab: "premium" })
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="TOOLS" />
          <View
            style={[
              styles.groupContainer,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderLight,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.md}
              style={StyleSheet.absoluteFill}
            />
            <ListRow
              icon="heart"
              title="Women's Health"
              subtitle={whSettings.enabled ? "Enabled" : "Disabled"}
              showChevron={false}
              switchValue={whSettings.enabled}
              onSwitchChange={(value) => {
                if (value && !consentGiven) {
                  navigation.navigate("WomensHealthConsent");
                } else {
                  updateWHSettings({ enabled: value });
                }
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
            />
            {whSettings.enabled ? (
              <>
                <ListDivider />
                <ListRow
                  icon="search"
                  title="Allow in Search"
                  subtitle="Show Women's Health in search results"
                  showChevron={false}
                  switchValue={whSettings.allowSearch}
                  onSwitchChange={(value) => {
                    updateWHSettings({ allowSearch: value });
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                />
              </>
            ) : null}
            {whSettings.enabled ? (
              <>
                <ListDivider />
                <ListRow
                  icon="settings"
                  title="Women's Health Settings"
                  subtitle="Privacy, cycle settings, and more"
                  onPress={() => navigation.navigate("WomensHealthSettings")}
                />
              </>
            ) : null}
            {__DEV__ ? (
              <>
                <ListDivider />
                <ListRow
                  icon="camera"
                  title="App Store Showcase"
                  subtitle="Open the eight flagship screenshot scenes"
                  onPress={() => navigation.navigate("AppStoreShowcase")}
                />
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="GENERAL" />
          <View
            style={[
              styles.groupContainer,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderLight,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.md}
              style={StyleSheet.absoluteFill}
            />
            <ListRow
              icon="smartphone"
              title="Haptic Feedback"
              subtitle="Vibration on interactions"
              showChevron={false}
              switchValue={hapticFeedback}
              onSwitchChange={handleToggle(setHapticFeedback)}
            />
            <ListDivider />
            <ListRow
              icon="lock"
              title="App Lock"
              subtitle={
                appLockEnabled
                  ? "Face ID / Passcode enabled"
                  : "Protect app with biometrics"
              }
              showChevron={false}
              switchValue={appLockEnabled}
              onSwitchChange={handleAppLockToggle}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="DATA" />
          <View
            style={[
              styles.groupContainer,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderLight,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.md}
              style={StyleSheet.absoluteFill}
            />
            <ListRow
              icon="shield"
              title="Privacy and data"
              subtitle="App lock, permissions, backups, exports, and account controls"
            />
            <ListDivider />
            <ListRow
              icon="hard-drive"
              title="Offline Library"
              subtitle="Manage Quran audio, nasheeds, and book narration"
              onPress={() => navigation.navigate("OfflineLibrary")}
              rightElement={
                !isPremium ? <PremiumBadge tier="premium" /> : undefined
              }
            />
            <ListDivider />
            <ListRow
              icon="download"
              title="Private backup"
              subtitle="Save progress, Quran notes, bookmarks, and chats"
              onPress={handleExportData}
              rightElement={
                !isPremium ? <PremiumBadge tier="premium" /> : undefined
              }
            />
            <ListDivider />
            <ListRow
              icon="upload-cloud"
              title="Restore backup"
              subtitle="Bring saved NurAI progress, Quran notes, and AI packets back"
              onPress={handleRestoreData}
              rightElement={
                !isPremium ? <PremiumBadge tier="premium" /> : undefined
              }
            />
            <ListDivider />
            <ListRow
              icon="trash-2"
              title="Clear All Data"
              subtitle="Reset app data and preferences"
              onPress={() => setShowDeleteModal(true)}
              destructive
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="ACCOUNT" />
          <View
            style={[
              styles.groupContainer,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderLight,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.md}
              style={StyleSheet.absoluteFill}
            />
            {user ? (
              <>
                {user.displayName === "Apple User" ||
                user.displayName === "Google User" ||
                !user.displayName ? (
                  <Pressable
                    style={[
                      styles.accountInfo,
                      {
                        backgroundColor: theme.primarySubtle,
                        borderBottomWidth: 0,
                      },
                    ]}
                    onPress={() => {
                      setEditNameValue("");
                      setEditNameError("");
                      setShowEditNameModal(true);
                    }}
                    testID="edit-display-name-banner"
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: Spacing.md,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: theme.primaryMuted,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <AppIcon
                          name="user-plus"
                          size={20}
                          color={theme.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText
                          type="body"
                          style={{ fontWeight: "700", marginBottom: 2 }}
                        >
                          Set Your Name
                        </ThemedText>
                        <ThemedText
                          type="small"
                          style={{ color: theme.textSecondary }}
                        >
                          Tap here to personalise your experience
                        </ThemedText>
                      </View>
                      <View
                        style={{
                          backgroundColor: theme.primary,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 12,
                        }}
                      >
                        <ThemedText
                          type="small"
                          style={{ color: "#FFFFFF", fontWeight: "600" }}
                        >
                          Set
                        </ThemedText>
                      </View>
                    </View>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.accountInfo}
                    onPress={() => {
                      setEditNameValue(user.displayName || "");
                      setEditNameError("");
                      setShowEditNameModal(true);
                    }}
                    testID="edit-display-name"
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: Spacing.md,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: theme.primaryMuted,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ThemedText
                          type="body"
                          style={{ fontWeight: "700", fontSize: 18 }}
                        >
                          {user.displayName.charAt(0).toUpperCase()}
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText
                          type="body"
                          style={{ fontWeight: "600", marginBottom: 2 }}
                        >
                          {user.displayName}
                        </ThemedText>
                        <ThemedText
                          type="small"
                          style={{ color: theme.textSecondary }}
                        >
                          {user.email || "No email"}
                        </ThemedText>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <ThemedText
                          type="small"
                          style={{ color: theme.primary }}
                        >
                          Edit
                        </ThemedText>
                        <AppIcon
                          name="edit-2"
                          size={14}
                          color={theme.primary}
                        />
                      </View>
                    </View>
                  </Pressable>
                )}
                <ListDivider />
              </>
            ) : null}
            <ListRow
              icon="log-out"
              title="Sign Out"
              subtitle="Sign out of your account"
              onPress={() => setShowSignOutModal(true)}
            />
            <ListDivider />
            <ListRow
              icon="trash-2"
              title="Delete Account"
              subtitle="Permanently delete your account and all data"
              onPress={() => setShowDeleteAccountModal(true)}
              destructive
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="LEGAL" />
          <View
            style={[
              styles.groupContainer,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderLight,
              },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius.md}
              style={StyleSheet.absoluteFill}
            />
            <ListRow
              icon="shield"
              title="Privacy Policy"
              subtitle="How we handle your data"
              onPress={() =>
                WebBrowser.openBrowserAsync(
                  "https://eliteautomations.co.uk/nurai/privacy-policy",
                )
              }
            />
            <ListDivider />
            <ListRow
              icon="file-text"
              title="Terms of Service"
              subtitle="Usage terms and conditions"
              onPress={() =>
                WebBrowser.openBrowserAsync(
                  "https://eliteautomations.co.uk/nurai/terms",
                )
              }
            />
          </View>
        </View>

        <View style={[styles.versionContainer, { marginTop: Spacing.xl }]}>
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, textAlign: "center" }}
          >
            NurAI v{APP_VERSION}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, textAlign: "center" }}
          >
            Your Islamic Companion
          </ThemedText>
        </View>
      </ScrollView>

      <ModalShell
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete All Data"
      >
        <View style={styles.modalBody}>
          <View
            style={[
              styles.modalIconContainer,
              {
                backgroundColor: isDark
                  ? "rgba(248, 113, 113, 0.12)"
                  : "#FEE2E2",
              },
            ]}
          >
            <AppIcon name="alert-triangle" size={28} color={theme.error} />
          </View>
          <ThemedText
            type="body"
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              marginBottom: Spacing.lg,
            }}
          >
            This will permanently remove all your app data including prayer
            settings, Tasbeeh count, bookmarks, search history, notifications,
            and Women's Health data. This action cannot be undone.
          </ThemedText>
          <View style={styles.modalButtons}>
            <Pressable
              testID="button-cancel-delete"
              style={[
                styles.modalButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() => setShowDeleteModal(false)}
            >
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              testID="button-confirm-delete"
              style={[styles.modalButton, { backgroundColor: theme.error }]}
              onPress={async () => {
                setDeleting(true);
                try {
                  await deleteWHData();
                } catch {}
                try {
                  await AsyncStorage.clear();
                } catch {}
                setDeleting(false);
                setShowDeleteModal(false);
                setPrayerNotifications(false);
                setDailyHadith(true);
                setUse24Hour(false);
                setHapticFeedback(true);
              }}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText
                  type="body"
                  style={{ color: "#FFFFFF", fontWeight: "600" }}
                >
                  Delete Everything
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </ModalShell>

      <ModalShell
        visible={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        title="Sign Out"
      >
        <View style={styles.modalBody}>
          <View
            style={[
              styles.modalIconContainer,
              { backgroundColor: theme.primaryMuted },
            ]}
          >
            <AppIcon name="log-out" size={28} color={theme.primary} />
          </View>
          <ThemedText
            type="body"
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              marginBottom: Spacing.lg,
            }}
          >
            Are you sure you want to sign out of your account?
          </ThemedText>
          <View style={styles.modalButtons}>
            <Pressable
              style={[
                styles.modalButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() => setShowSignOutModal(false)}
            >
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={async () => {
                await logout();
                setShowSignOutModal(false);
              }}
              testID="button-confirm-signout"
            >
              <ThemedText
                type="body"
                style={{ color: "#FFFFFF", fontWeight: "600" }}
              >
                Sign Out
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ModalShell>

      <ModalShell
        visible={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        title="Delete Account"
      >
        <View style={styles.modalBody}>
          <View
            style={[
              styles.modalIconContainer,
              {
                backgroundColor: isDark
                  ? "rgba(248, 113, 113, 0.12)"
                  : "#FEE2E2",
              },
            ]}
          >
            <AppIcon name="user-x" size={28} color={theme.error} />
          </View>
          <ThemedText
            type="body"
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              marginBottom: Spacing.lg,
            }}
          >
            This will permanently delete your account and all associated data.
            This action cannot be undone.
          </ThemedText>
          <View style={styles.modalButtons}>
            <Pressable
              style={[
                styles.modalButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() => setShowDeleteAccountModal(false)}
            >
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.modalButton, { backgroundColor: theme.error }]}
              onPress={async () => {
                setDeletingAccount(true);
                try {
                  await deleteWHData();
                } catch {}
                try {
                  await AsyncStorage.clear();
                } catch {}
                try {
                  await deleteAccount();
                } catch {}
                setDeletingAccount(false);
                setShowDeleteAccountModal(false);
              }}
              testID="button-confirm-delete-account"
            >
              {deletingAccount ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText
                  type="body"
                  style={{ color: "#FFFFFF", fontWeight: "600" }}
                >
                  Delete Account
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </ModalShell>

      <ModalShell
        visible={showMadhabPicker}
        onClose={() => setShowMadhabPicker(false)}
        title="Select Madhab"
      >
        <View style={styles.modalBody}>
          <View
            style={[
              styles.modalIconContainer,
              { backgroundColor: theme.primaryMuted },
            ]}
          >
            <AppIcon name="book-open" size={28} color={theme.primary} />
          </View>
          <ThemedText
            type="body"
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              marginBottom: Spacing.lg,
            }}
          >
            Your preferred school of Islamic jurisprudence, or general
            source-first guidance when you have no preference.
          </ThemedText>
          <View style={{ width: "100%", gap: Spacing.sm }}>
            {MADHAB_OPTIONS.map((option) => {
              const isSelected = globalMadhab === option.id;
              return (
                <Pressable
                  key={option.id}
                  testID={`madhab-option-${option.id}`}
                  style={[
                    styles.madhabOption,
                    {
                      backgroundColor: isSelected
                        ? theme.primarySubtle
                        : theme.backgroundSecondary,
                      borderColor: isSelected
                        ? theme.primary
                        : theme.borderLight,
                    },
                  ]}
                  onPress={() => handleMadhabSelect(option.id)}
                >
                  <ThemedText
                    type="body"
                    style={{ fontWeight: isSelected ? "700" : "500" }}
                  >
                    {option.label}
                  </ThemedText>
                  {isSelected ? (
                    <AppIcon
                      name="check-circle"
                      size={20}
                      color={theme.primary}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <Pressable
            style={[
              styles.modalButton,
              {
                backgroundColor: theme.backgroundSecondary,
                marginTop: Spacing.md,
                width: "100%",
              },
            ]}
            onPress={() => setShowMadhabPicker(false)}
          >
            <ThemedText
              type="body"
              style={{ fontWeight: "600", textAlign: "center" }}
            >
              Cancel
            </ThemedText>
          </Pressable>
        </View>
      </ModalShell>

      <ModalShell
        visible={showShahadaDatePicker}
        onClose={() => setShowShahadaDatePicker(false)}
        title="Shahada Date"
        scrollable
      >
        <View style={styles.modalBody}>
          <View
            style={[
              styles.modalIconContainer,
              { backgroundColor: theme.primaryMuted },
            ]}
          >
            <AppIcon name="calendar" size={28} color={theme.primary} />
          </View>
          <ThemedText
            type="body"
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              marginBottom: Spacing.lg,
            }}
          >
            When did you take your shahada? This helps NurAI personalise your
            journey.
          </ThemedText>
          <TextInput
            style={[
              styles.editNameInput,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.borderLight,
                textAlign: "center",
              },
            ]}
            value={shahadaDate}
            onChangeText={setShahadaDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textMuted}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            onSubmitEditing={() => handleShahadaDateSave(shahadaDate)}
            maxLength={10}
            testID="input-shahada-date"
          />
          <View style={[styles.modalButtons, { marginTop: Spacing.md }]}>
            <Pressable
              style={[
                styles.modalButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() => setShowShahadaDatePicker(false)}
            >
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={() => handleShahadaDateSave(shahadaDate)}
              testID="button-save-shahada-date"
            >
              <ThemedText
                type="body"
                style={{ color: "#FFFFFF", fontWeight: "600" }}
              >
                Save
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ModalShell>

      <ModalShell
        visible={showEditNameModal}
        onClose={() => setShowEditNameModal(false)}
        title="Edit Display Name"
        scrollable
      >
        <View style={styles.modalBody}>
          <View
            style={[
              styles.modalIconContainer,
              { backgroundColor: theme.primaryMuted },
            ]}
          >
            <AppIcon name="edit-2" size={28} color={theme.primary} />
          </View>
          <ThemedText
            type="body"
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              marginBottom: Spacing.md,
            }}
          >
            This is the name shown on your home screen greeting
          </ThemedText>
          <TextInput
            style={[
              styles.editNameInput,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: editNameError ? theme.error : theme.borderLight,
              },
            ]}
            value={editNameValue}
            onChangeText={(t) => {
              setEditNameValue(t);
              setEditNameError("");
            }}
            placeholder="Enter your name"
            placeholderTextColor={theme.textMuted}
            returnKeyType="done"
            onSubmitEditing={handleSaveDisplayName}
            blurOnSubmit
            maxLength={50}
            testID="input-display-name"
          />
          {editNameError ? (
            <ThemedText
              type="small"
              style={{
                color: theme.error,
                marginTop: Spacing.xs,
                marginBottom: Spacing.sm,
              }}
            >
              {editNameError}
            </ThemedText>
          ) : null}
          <View style={[styles.modalButtons, { marginTop: Spacing.md }]}>
            <Pressable
              style={[
                styles.modalButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() => setShowEditNameModal(false)}
            >
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={handleSaveDisplayName}
              testID="button-save-display-name"
            >
              {savingName ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText
                  type="body"
                  style={{ color: "#FFFFFF", fontWeight: "600" }}
                >
                  Save
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </ModalShell>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    overflow: "hidden",
  },
  scrollContent: {
    paddingTop: Spacing.sm,
  },
  settingsHero: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
    padding: Spacing.xl,
    overflow: "hidden",
  },
  settingsHeroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  settingsHeroEyebrow: {
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  settingsHeroDivider: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
  },
  planPill: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  settingsHeroStats: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  settingsHeroStat: {
    flex: 1,
    gap: 2,
  },
  section: {
    marginBottom: Spacing["3xl"],
  },
  groupContainer: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden" as const,
    marginHorizontal: Spacing.lg,
  },
  accountInfo: {
    padding: Spacing.lg,
  },
  themeSelectorContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
  },
  themeOptionActive: {
    ...Shadows.subtle,
  },
  skinRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  skinOption: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    width: 92,
    gap: Spacing.xs,
  },
  skinOptionActive: {
    borderWidth: 1.5,
  },
  skinPreviewRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  skinColorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  skinPrimaryGlow: {
    position: "absolute",
    left: 4,
    top: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    opacity: 0.42,
  },
  skinPreviewHorizon: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 12,
    height: 12,
    borderTopWidth: 1,
    borderRadius: 999,
    opacity: 0.72,
  },
  skinMiniSurface: {
    position: "absolute",
    left: 12,
    bottom: 8,
    width: 20,
    height: 10,
    borderRadius: 999,
    opacity: 0.78,
  },
  skinColorCircleActive: {
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  skinAccentDot: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.72)",
  },
  versionContainer: {
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing["2xl"],
  },
  modalBody: {
    alignItems: "center",
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  editNameInput: {
    width: "100%",
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  madhabOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
});
