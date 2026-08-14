import React, { useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  Platform,
  Modal,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { useWomensHealth } from "@/context/WomensHealthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { syncedSetItem } from "@/lib/progress-sync";
import {
  GeometricCardPattern,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

interface SettingItemProps {
  icon: AppIconName;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  theme: any;
  index: number;
  testID?: string;
}

function SettingItem({
  icon,
  title,
  subtitle,
  rightElement,
  onPress,
  destructive,
  theme,
  index,
}: SettingItemProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
      <Pressable
        style={({ pressed }) => [
          styles.settingItem,
          {
            backgroundColor: theme.surfaceGlass,
            borderColor: theme.borderSubtle,
          },
          pressed && onPress && { opacity: 0.8 },
        ]}
        onPress={onPress}
        disabled={!onPress && !rightElement}
      >
        <GeometricCardPattern
          color={destructive ? theme.error : theme.primary}
          opacity={0.018}
        />
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: destructive
                ? `${theme.error}15`
                : `${theme.primary}15`,
            },
          ]}
        >
          <AppIcon
            name={icon}
            size={20}
            color={destructive ? theme.error : theme.primary}
          />
        </View>
        <View style={styles.settingContent}>
          <View style={styles.titleRow}>
            <ThemedText
              style={[
                styles.settingTitle,
                destructive ? { color: theme.error } : undefined,
              ]}
            >
              {title}
            </ThemedText>
          </View>
          {subtitle ? (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {rightElement}
        {onPress && !rightElement ? (
          <AppIcon name="chevron-right" size={20} color={theme.textSecondary} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function SectionHeader({ title, theme }: { title: string; theme: any }) {
  return (
    <ThemedText
      type="small"
      style={[styles.sectionHeader, { color: theme.textSecondary }]}
    >
      {title}
    </ThemedText>
  );
}

function StepperControl({
  value,
  unit,
  min,
  max,
  onChange,
  theme,
}: {
  value: number;
  unit: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
  theme: any;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        style={({ pressed }) => [
          styles.stepperButton,
          {
            backgroundColor: theme.backgroundSecondary,
            opacity: value <= min ? 0.35 : pressed ? 0.75 : 1,
          },
        ]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${unit}`}
      >
        <AppIcon name="minus" size={14} color={theme.text} />
      </Pressable>
      <ThemedText
        type="small"
        style={[styles.stepperValue, { color: theme.primary }]}
      >
        {value} {unit}
      </ThemedText>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        style={({ pressed }) => [
          styles.stepperButton,
          {
            backgroundColor: theme.backgroundSecondary,
            opacity: value >= max ? 0.35 : pressed ? 0.75 : 1,
          },
        ]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${unit}`}
      >
        <AppIcon name="plus" size={14} color={theme.text} />
      </Pressable>
    </View>
  );
}

export default function WomensHealthSettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isPremium } = useSubscription();
  const {
    settings,
    updateSettings,
    deleteAllData,
    exportData,
    qadaPlan,
    updateQadaPlan,
  } = useWomensHealth();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleDeleteAllData = async () => {
    try {
      await deleteAllData();
      setShowDeleteConfirm(false);
      setDeleteSuccess(true);
      setTimeout(() => {
        setDeleteSuccess(false);
        navigation.goBack();
      }, 1500);
    } catch {
      setShowDeleteConfirm(false);
    }
  };

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleEnableToggle = (value: boolean) => {
    triggerHaptic();
    if (value) {
      navigation.navigate("WomensHealthConsent");
    } else {
      updateSettings({ enabled: false });
    }
  };

  const handleToggle =
    (key: keyof typeof settings) => async (value: boolean) => {
      triggerHaptic();
      await updateSettings({ [key]: value });
      if (key === "lockEnabled") {
        await syncedSetItem("app_lock_enabled", value ? "true" : "false");
      }
    };

  const handleNumberSetting =
    (
      key: "typicalCycleLength" | "typicalPeriodLength",
      min: number,
      max: number,
    ) =>
    (value: number) => {
      triggerHaptic();
      updateSettings({ [key]: Math.min(max, Math.max(min, value)) });
    };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const preferredQadaDay = qadaPlan.preferredDays[0] ?? 1;
  const cyclePreferredQadaDay = () => {
    triggerHaptic();
    updateQadaPlan({ preferredDays: [(preferredQadaDay + 1) % 7] });
  };

  let itemIndex = 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h4">Women's Health Settings</ThemedText>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <SectionHeader title="GENERAL" theme={theme} />
          <SettingItem
            icon="heart"
            title="Enable Women's Health"
            theme={theme}
            index={itemIndex++}
            rightElement={
              <Switch
                value={settings.enabled}
                onValueChange={handleEnableToggle}
                trackColor={{ false: theme.switchTrack, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            }
          />
          {settings.enabled ? (
            <SettingItem
              icon="search"
              title="Allow in Search"
              subtitle="Allow Women's Health content to appear in search results"
              theme={theme}
              index={itemIndex++}
              rightElement={
                <Switch
                  value={settings.allowSearch}
                  onValueChange={handleToggle("allowSearch")}
                  trackColor={{ false: theme.switchTrack, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              }
            />
          ) : null}
        </View>

        {settings.enabled ? (
          <View style={styles.section}>
            <SectionHeader title="CYCLE SETTINGS" theme={theme} />
            <SettingItem
              icon="repeat"
              title="Typical Cycle Length"
              subtitle="Average days between cycles"
              theme={theme}
              index={itemIndex++}
              rightElement={
                <StepperControl
                  value={settings.typicalCycleLength}
                  unit="days"
                  min={15}
                  max={60}
                  onChange={handleNumberSetting("typicalCycleLength", 15, 60)}
                  theme={theme}
                />
              }
            />
            <SettingItem
              icon="droplet"
              title="Typical Period Length"
              subtitle="Average days per period"
              theme={theme}
              index={itemIndex++}
              rightElement={
                <StepperControl
                  value={settings.typicalPeriodLength}
                  unit="days"
                  min={1}
                  max={15}
                  onChange={handleNumberSetting("typicalPeriodLength", 1, 15)}
                  theme={theme}
                />
              }
            />
            <SettingItem
              icon="calendar"
              title="Planning Mode"
              subtitle="Show purification reminders and worship checklists"
              theme={theme}
              index={itemIndex++}
              rightElement={
                <Switch
                  value={settings.planningMode}
                  onValueChange={handleToggle("planningMode")}
                  trackColor={{ false: theme.switchTrack, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              }
            />
          </View>
        ) : null}

        {settings.enabled ? (
          <View style={styles.section}>
            <SectionHeader title="PRIVACY & SECURITY" theme={theme} />
            <SettingItem
              icon="lock"
              title="App Lock"
              subtitle="Use NurAI's app lock to protect the whole app"
              theme={theme}
              index={itemIndex++}
              rightElement={
                <Switch
                  value={settings.lockEnabled}
                  onValueChange={handleToggle("lockEnabled")}
                  trackColor={{
                    false: theme.switchTrack,
                    true: theme.primary,
                  }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <Animated.View
              entering={FadeInDown.delay(itemIndex * 40).duration(300)}
            >
              <View
                style={[
                  styles.storageIndicator,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                <AppIcon name="shield" size={16} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Cycle logs are saved locally; sensitive preferences use secure
                  device storage where available.
                </ThemedText>
              </View>
            </Animated.View>
          </View>
        ) : null}

        {settings.enabled ? (
          <View style={styles.section}>
            <SectionHeader title="REMINDERS" theme={theme} />
            <SettingItem
              icon="bell"
              title="Weekly Qada Reminder"
              subtitle="Target make-up fasts to plan each week"
              theme={theme}
              index={itemIndex++}
              rightElement={
                <StepperControl
                  value={qadaPlan.perWeekTarget}
                  unit="/ week"
                  min={1}
                  max={7}
                  onChange={(value) => {
                    triggerHaptic();
                    updateQadaPlan({ perWeekTarget: value });
                  }}
                  theme={theme}
                />
              }
            />
            <SettingItem
              icon="calendar"
              title="Next Planned Qada Day"
              subtitle="Tap to rotate the preferred reminder day"
              theme={theme}
              index={itemIndex++}
              onPress={cyclePreferredQadaDay}
              rightElement={
                <ThemedText
                  type="small"
                  style={{ color: theme.primary, fontWeight: "600" }}
                >
                  {weekDays[preferredQadaDay]}
                </ThemedText>
              }
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader title="DATA" theme={theme} />
          <SettingItem
            icon="download"
            title="Private Backup"
            subtitle={
              isPremium
                ? "Save a private backup or spreadsheet"
                : "Private backup and spreadsheet export (Premium)"
            }
            theme={theme}
            index={itemIndex++}
            onPress={async () => {
              if (!isPremium) {
                navigation.navigate("Subscription", { initialTab: "premium" });
                return;
              }
              await exportData();
            }}
          />
          <SettingItem
            icon="trash-2"
            title="Delete All Data"
            subtitle="Permanently remove all Women's Health data"
            theme={theme}
            index={itemIndex++}
            destructive
            onPress={() => setShowDeleteConfirm(true)}
            testID="button-delete-all-data"
          />
        </View>
      </ScrollView>

      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <View
              style={[
                styles.modalIconContainer,
                { backgroundColor: `${theme.error}15` },
              ]}
            >
              <AppIcon name="alert-triangle" size={28} color={theme.error} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {"Delete All Data?"}
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              {
                "Are you sure? This will permanently delete all cycle data, journal entries, mood records, qada logs, and settings. This action cannot be undone."
              }
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.borderSubtle,
                    borderWidth: 1,
                  },
                ]}
                testID="button-cancel-delete"
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>
                  {"Cancel"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteAllData}
                style={[styles.modalBtn, { backgroundColor: theme.error }]}
                testID="button-confirm-delete"
              >
                <Text
                  style={[styles.modalBtnText, { color: theme.buttonText }]}
                >
                  {"Delete All"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {deleteSuccess ? (
        <View style={styles.toastContainer}>
          <View style={[styles.toast, { backgroundColor: theme.primary }]}>
            <AppIcon name="check-circle" size={18} color="#FFFFFF" />
            <Text style={styles.toastText}>
              {"All data deleted successfully"}
            </Text>
          </View>
        </View>
      ) : null}
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
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    overflow: "hidden",
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  settingContent: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  lockBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  storageIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    minWidth: 56,
    textAlign: "center",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing["2xl"],
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  toastContainer: {
    position: "absolute",
    bottom: 100,
    left: Spacing.xl,
    right: Spacing.xl,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 16,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
