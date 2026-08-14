import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated as RNAnimated,
  PanResponder,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { ModalShell } from "@/components/ModalShell";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { syncedSetItem } from "@/lib/progress-sync";
import { Aurora, NuraiGlass, NuraiSegmentedControl } from "@/design-system";
import { AppIcon, type AppIconName } from "@/components/icons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = -80;

type NotificationType =
  | "prayer"
  | "fasting"
  | "reading"
  | "dhikr"
  | "family"
  | "update"
  | "system";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  timestamp: number;
  route?: string;
  params?: Record<string, unknown>;
}

type TabKey = "Reminders" | "Updates" | "System";

const TABS: TabKey[] = ["Reminders", "Updates", "System"];

const STORAGE_KEYS: Record<TabKey, string> = {
  Reminders: "app_notifications_reminders",
  Updates: "app_notifications_updates",
  System: "app_notifications_system",
};

const TYPE_ICONS: Record<string, AppIconName> = {
  prayer: "clock",
  fasting: "moon",
  reading: "book-open",
  dhikr: "disc",
  family: "users",
  update: "refresh-cw",
  system: "shield",
};

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function formatNotificationTitle(title: string): string {
  const cleaned = title
    .replace(/\{name\}/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const formatted = cleaned.replace(
    /\b(fajr|dhuhr|asr|maghrib|isha)\b/gi,
    (match) => {
      const lower = match.toLowerCase();
      if (lower === "asr") return "Asr";
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    },
  );
  return formatted || "NurAI Reminder";
}

function normalizeNotification(input: any): Notification | null {
  if (!input || typeof input !== "object") return null;
  const timestamp =
    typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
      ? input.timestamp
      : Date.now();
  return {
    id: String(
      input.id || `${timestamp}-${Math.random().toString(36).slice(2)}`,
    ),
    title: formatNotificationTitle(String(input.title || "NurAI")),
    body: String(input.body || "").replace(/\{name\}/gi, "you"),
    type: ([
      "prayer",
      "fasting",
      "reading",
      "dhikr",
      "family",
      "update",
      "system",
    ].includes(input.type)
      ? input.type
      : "system") as NotificationType,
    read: Boolean(input.read),
    timestamp,
    route: typeof input.route === "string" ? input.route : undefined,
    params:
      input.params &&
      typeof input.params === "object" &&
      !Array.isArray(input.params)
        ? input.params
        : undefined,
  };
}

function parseNotificationList(raw: string | null): Notification[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeNotification).filter(Boolean) as Notification[];
  } catch {
    return [];
  }
}

function SwipeableCard({
  notification,
  onDismiss,
  onPress,
  theme,
  isDark,
  index,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
  onPress: (id: string) => void;
  theme: any;
  isDark: boolean;
  index: number;
}) {
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const accent =
    notification.type === "prayer" ||
    notification.type === "family" ||
    notification.type === "update"
      ? theme.primary
      : notification.type === "system"
        ? theme.textMuted
        : theme.scholar;
  const icon = TYPE_ICONS[notification.type] || "bell";

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          RNAnimated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
          }).start(() => onDismiss(notification.id));
        } else {
          RNAnimated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <View style={styles.swipeContainer}>
        <View
          style={[styles.deleteBackground, { backgroundColor: theme.error }]}
        >
          <AppIcon name="trash-2" size={20} color="#FFFFFF" />
        </View>
        <RNAnimated.View
          style={[{ transform: [{ translateX }] }]}
          {...panResponder.panHandlers}
        >
          <Pressable
            onPress={() => onPress(notification.id)}
            accessibilityRole="button"
            accessibilityLabel={`${formatNotificationTitle(notification.title)}. ${notification.body}. ${getTimeAgo(notification.timestamp)}`}
            accessibilityHint={
              notification.route === "FamilyGroup"
                ? "Opens your Family Circle messages. Swipe left to remove it."
                : "Marks this notification as read. Swipe left to remove it."
            }
            accessibilityActions={[{ name: "activate" }, { name: "delete" }]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === "delete") {
                onDismiss(notification.id);
              } else {
                onPress(notification.id);
              }
            }}
            style={[
              styles.notificationCard,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderSubtle,
              },
            ]}
            testID={`notification-card-${notification.id}`}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={BorderRadius["2xl"]}
              tint={`${accent}0D`}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[styles.colorStrip, { backgroundColor: accent }]} />
            <View style={styles.cardContent}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: `${accent}${isDark ? "20" : "14"}`,
                  },
                ]}
              >
                <AppIcon name={icon} size={18} color={accent} />
              </View>
              <View style={styles.cardText}>
                <View style={styles.cardTitleRow}>
                  <ThemedText
                    type="h4"
                    style={styles.cardTitle}
                    numberOfLines={1}
                  >
                    {formatNotificationTitle(notification.title)}
                  </ThemedText>
                  {!notification.read ? (
                    <View
                      style={[
                        styles.unreadDot,
                        { backgroundColor: theme.primary },
                      ]}
                    />
                  ) : null}
                </View>
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary }}
                  numberOfLines={2}
                >
                  {notification.body.replace(/\{name\}/gi, "you")}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, marginTop: 2 }}
                >
                  {getTimeAgo(notification.timestamp)}
                </ThemedText>
              </View>
            </View>
          </Pressable>
        </RNAnimated.View>
      </View>
    </Animated.View>
  );
}

export default function NotificationsCenterScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabKey>("Reminders");
  const [reminders, setReminders] = useState<Notification[]>([]);
  const [updates, setUpdates] = useState<Notification[]>([]);
  const [systemNotifs, setSystemNotifs] = useState<Notification[]>([]);
  const [confirmClearVisible, setConfirmClearVisible] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const [r, u, s] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.Reminders),
        AsyncStorage.getItem(STORAGE_KEYS.Updates),
        AsyncStorage.getItem(STORAGE_KEYS.System),
      ]);
      setReminders(parseNotificationList(r));
      setUpdates(parseNotificationList(u));
      setSystemNotifs(parseNotificationList(s));
    } catch {}
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const getActiveList = useCallback((): Notification[] => {
    if (activeTab === "Reminders") return reminders;
    if (activeTab === "Updates") return updates;
    return systemNotifs;
  }, [activeTab, reminders, updates, systemNotifs]);

  const setActiveList = useCallback(
    (list: Notification[]) => {
      if (activeTab === "Reminders") setReminders(list);
      else if (activeTab === "Updates") setUpdates(list);
      else setSystemNotifs(list);
    },
    [activeTab],
  );

  const saveList = useCallback(async (tab: TabKey, list: Notification[]) => {
    try {
      await syncedSetItem(STORAGE_KEYS[tab], JSON.stringify(list));
    } catch {}
  }, []);

  const handleDismiss = useCallback(
    (id: string) => {
      const list = getActiveList().filter((n) => n.id !== id);
      setActiveList(list);
      saveList(activeTab, list);
    },
    [activeTab, getActiveList, saveList, setActiveList],
  );

  const handlePress = useCallback(
    (id: string) => {
      const notification = getActiveList().find((item) => item.id === id);
      const list = getActiveList().map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      setActiveList(list);
      saveList(activeTab, list);

      if (notification?.route === "FamilyGroup") {
        navigation.navigate("FamilyGroup", notification.params);
      }
    },
    [activeTab, getActiveList, navigation, saveList, setActiveList],
  );

  const handleMarkAllRead = useCallback(async () => {
    const markRead = (list: Notification[]) =>
      list.map((n) => ({ ...n, read: true }));
    const newReminders = markRead(reminders);
    const newUpdates = markRead(updates);
    const newSystem = markRead(systemNotifs);
    setReminders(newReminders);
    setUpdates(newUpdates);
    setSystemNotifs(newSystem);
    await Promise.all([
      saveList("Reminders", newReminders),
      saveList("Updates", newUpdates),
      saveList("System", newSystem),
    ]);
  }, [reminders, saveList, updates, systemNotifs]);

  const handleClearAll = useCallback(() => {
    setConfirmClearVisible(true);
  }, []);

  const confirmClear = useCallback(async () => {
    setActiveList([]);
    await saveList(activeTab, []);
    setConfirmClearVisible(false);
  }, [activeTab, saveList, setActiveList]);

  const cancelClear = useCallback(() => {
    setConfirmClearVisible(false);
  }, []);

  const totalUnread =
    reminders.filter((n) => !n.read).length +
    updates.filter((n) => !n.read).length +
    systemNotifs.filter((n) => !n.read).length;
  const totalItems = reminders.length + updates.length + systemNotifs.length;

  const activeList = getActiveList();
  const tabOptions = TABS.map((tab) => {
    const tabList =
      tab === "Reminders"
        ? reminders
        : tab === "Updates"
          ? updates
          : systemNotifs;
    const unread = tabList.filter((notification) => !notification.read).length;
    return {
      id: tab,
      label: unread > 0 ? `${tab} ${unread}` : tab,
    };
  });

  const renderEmptyState = () => {
    let icon: AppIconName = "bell-off";
    let message = "";
    let showButton = false;

    if (activeTab === "Reminders") {
      icon = "bell-off";
      message =
        "No reminders yet. Set up prayer and reading reminders in Notification Settings.";
      showButton = true;
    } else if (activeTab === "Updates") {
      icon = "refresh-cw";
      message =
        "You're all caught up! Check back for new content and features.";
    } else {
      icon = "shield";
      message = "No system notifications.";
    }

    return (
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={styles.emptyContainer}
      >
        <View
          style={[styles.emptyIconCircle, { backgroundColor: "transparent" }]}
        >
          <NuraiGlass
            pointerEvents="none"
            radius={44}
            tint={`${theme.primary}0B`}
            style={StyleSheet.absoluteFillObject}
          />
          <AppIcon name={icon} size={40} color={theme.textMuted} />
        </View>
        <ThemedText
          type="body"
          style={[styles.emptyText, { color: theme.textSecondary }]}
        >
          {message}
        </ThemedText>
        {showButton ? (
          <Pressable
            style={[styles.settingsButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate("NotificationSettings")}
            accessibilityRole="button"
            accessibilityLabel="Open notification settings"
            testID="button-notification-settings"
          >
            <AppIcon
              name="settings"
              size={16}
              color={theme.primaryForeground}
            />
            <ThemedText
              type="small"
              style={{ color: theme.buttonText, marginLeft: Spacing.sm }}
            >
              Notification Settings
            </ThemedText>
          </Pressable>
        ) : null}
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Aurora />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
            testID="button-back"
          >
            <NuraiGlass
              pointerEvents="none"
              interactive
              radius={22}
              style={StyleSheet.absoluteFillObject}
            />
            <AppIcon name="arrow-left" size={20} color={theme.icon} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <ThemedText type="h3">Notifications</ThemedText>
            {totalUnread > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                <ThemedText type="caption" style={styles.badgeText}>
                  {totalUnread > 99 ? "99+" : String(totalUnread)}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={handleMarkAllRead}
            disabled={totalUnread === 0}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            accessibilityState={{ disabled: totalUnread === 0 }}
            style={[
              styles.markReadButton,
              totalUnread === 0 ? { opacity: 0.45 } : null,
            ]}
            testID="button-mark-all-read"
          >
            <NuraiGlass
              pointerEvents="none"
              interactive
              radius={22}
              style={StyleSheet.absoluteFillObject}
            />
            <AppIcon name="check-circle" size={18} color={theme.primary} />
          </Pressable>
        </View>

        <NuraiSegmentedControl
          options={tabOptions}
          value={activeTab}
          onChange={(tab) => setActiveTab(tab as TabKey)}
          testID="notification-tabs"
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(350)}
          style={[
            styles.notificationPulseCard,
            {
              backgroundColor: "transparent",
              borderColor: `${theme.scholar}22`,
            },
          ]}
        >
          <NuraiGlass
            pointerEvents="none"
            radius={26}
            tint={`${theme.scholar}0B`}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.notificationPulseCopy}>
            <ThemedText
              type="caption"
              style={[styles.pulseEyebrow, { color: theme.scholar }]}
            >
              Reminder rhythm
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {totalUnread > 0
                ? `${totalUnread} unread item${totalUnread === 1 ? "" : "s"}`
                : totalItems > 0
                  ? "Everything is read"
                  : "Ready when you are"}
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, lineHeight: 18 }}
            >
              {totalItems > 0
                ? "Prayer, Quran, dhikr, and app updates stay grouped so reminders feel calm instead of noisy."
                : "Choose only the prayer, Quran, and dhikr reminders that genuinely support your day."}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => navigation.navigate("NotificationSettings")}
            accessibilityRole="button"
            accessibilityLabel="Open notification settings"
            testID="button-notification-rhythm-settings"
            style={[
              styles.pulseSettingsButton,
              { backgroundColor: `${theme.primary}16` },
            ]}
          >
            <AppIcon name="sliders" size={17} color={theme.primary} />
          </Pressable>
        </Animated.View>
        {activeList.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {activeList.map((notification, index) => (
              <SwipeableCard
                key={notification.id}
                notification={notification}
                onDismiss={handleDismiss}
                onPress={handlePress}
                theme={theme}
                isDark={isDark}
                index={index}
              />
            ))}
            <Animated.View
              entering={FadeInDown.delay(activeList.length * 50 + 100).duration(
                300,
              )}
            >
              <Pressable
                onPress={handleClearAll}
                accessibilityRole="button"
                accessibilityLabel={`Clear all ${activeTab.toLowerCase()} notifications`}
                style={[
                  styles.clearAllButton,
                  { borderColor: theme.error + "40" },
                ]}
                testID="button-clear-all"
              >
                <AppIcon name="trash-2" size={16} color={theme.error} />
                <ThemedText
                  type="small"
                  style={{
                    color: theme.error,
                    marginLeft: Spacing.sm,
                    fontWeight: "600",
                  }}
                >
                  Clear All {activeTab}
                </ThemedText>
              </Pressable>
            </Animated.View>
          </>
        )}
      </ScrollView>

      <ModalShell
        visible={confirmClearVisible}
        onClose={cancelClear}
        title={`Clear All ${activeTab}?`}
        size="sm"
      >
        <View style={styles.confirmBody}>
          <View
            style={[
              styles.modalIconCircle,
              { backgroundColor: theme.error + "15" },
            ]}
          >
            <AppIcon name="alert-triangle" size={28} color={theme.error} />
          </View>
          <ThemedText
            type="small"
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              marginBottom: Spacing.xl,
            }}
          >
            This will permanently remove all notifications in this tab. This
            action cannot be undone.
          </ThemedText>
          <View style={styles.modalActions}>
            <Pressable
              onPress={cancelClear}
              accessibilityRole="button"
              accessibilityLabel="Cancel clearing notifications"
              style={[
                styles.modalButton,
                {
                  backgroundColor: theme.backgroundSecondary,
                  flex: 1,
                  marginRight: Spacing.sm,
                },
              ]}
              testID="button-cancel-clear"
            >
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={confirmClear}
              accessibilityRole="button"
              accessibilityLabel={`Confirm clearing all ${activeTab.toLowerCase()} notifications`}
              style={[
                styles.modalButton,
                { backgroundColor: theme.error, flex: 1 },
              ]}
              testID="button-confirm-clear"
            >
              <ThemedText
                type="small"
                style={{ color: theme.buttonText, fontWeight: "600" }}
              >
                Clear All
              </ThemedText>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  markReadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsContainer: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  notificationPulseCard: {
    alignItems: "center",
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
    padding: Spacing.lg,
  },
  notificationPulseCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  pulseEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  pulseSettingsButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  swipeContainer: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
  },
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius["2xl"],
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: Spacing.xl,
  },
  notificationCard: {
    flexDirection: "row",
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    overflow: "hidden",
  },
  colorStrip: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 2,
  },
  cardTitle: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    paddingHorizontal: Spacing["2xl"],
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  confirmBody: {
    alignItems: "center",
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: "row",
    width: "100%",
  },
  modalButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
