import React, { useContext } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";

import { PremiumHeader, PremiumScreen } from "@/components/premium";
import { AuthContext } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { NuraiGlass, NuraiSpace, NuraiType } from "@/design-system";
import { useTheme } from "@/hooks/useTheme";
import { AppIcon, type AppIconName } from "@/components/icons";

type FeatherName = AppIconName;

type HubItem = {
  icon: FeatherName;
  title: string;
  subtitle: string;
  screen: string;
  value?: string;
  tone?: "primary" | "premium";
  testID?: string;
};

const GLASS_TINT = "rgba(7, 20, 22, 0.48)";

export default function MoreScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user } = useContext(AuthContext);
  const { currentPlan } = useSubscription();

  const displayName =
    user?.displayName?.trim() || user?.username?.trim() || "Your account";
  const accountDetail =
    user?.authProvider === "local_preview"
      ? "Private NurAI profile"
      : user?.email || `@${user?.username || "nurai"}`;
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "N";
  const planLabel =
    ({ free: "Free", premium: "Premium", scholar: "Scholar" } as const)[
      currentPlan
    ] || "Free";

  const membershipItems: HubItem[] = [
    {
      icon: "award",
      title: "NurAI plan",
      subtitle: "Manage Premium or Scholar access",
      screen: "Subscription",
      value: planLabel,
      tone: "premium",
    },
  ];

  const notificationItems: HubItem[] = [
    {
      icon: "volume-2",
      title: "Prayer alerts & audio",
      subtitle: "Athan, muezzin voice, full alarms, and reminder controls",
      screen: "NotificationSettings",
      testID: "button-more-prayer-alerts",
    },
    {
      icon: "bell",
      title: "Notification centre",
      subtitle: "Review prayer, progress, family, and app updates",
      screen: "NotificationsCenter",
    },
  ];

  const wellbeingItems: HubItem[] = [
    {
      icon: "heart",
      title: "Health Companion",
      subtitle: "Body amanah, recovery, hydration, sleep, and gentle movement",
      screen: "MuslimHealth",
      testID: "button-more-health",
    },
  ];

  const settingsItems: HubItem[] = [
    {
      icon: "sliders",
      title: "Settings & appearance",
      subtitle: "Theme, madhab, haptics, privacy, and app controls",
      screen: "Settings",
    },
    {
      icon: "database",
      title: "Data & backups",
      subtitle: "Export, restore, clear data, and manage local storage",
      screen: "Settings",
    },
    {
      icon: "shield",
      title: "Privacy policy",
      subtitle: "How NurAI protects and uses your information",
      screen: "PrivacyPolicy",
    },
  ];

  const helpItems: HubItem[] = [
    {
      icon: "help-circle",
      title: "Help & app information",
      subtitle: "Sources, safety notes, version details, and support",
      screen: "About",
    },
    {
      icon: "file-text",
      title: "Terms of service",
      subtitle: "Read the terms that apply when using NurAI",
      screen: "TermsOfService",
    },
  ];

  const navigate = (screen: string) => navigation.navigate(screen);

  const renderRow = (item: HubItem, index: number, total: number) => {
    const accent = theme.primary;
    return (
      <React.Fragment key={`${item.screen}-${item.title}`}>
        <Pressable
          testID={item.testID}
          onPress={() => navigate(item.screen)}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${item.subtitle}`}
          style={({ pressed }) => [
            styles.row,
            pressed ? styles.rowPressed : null,
          ]}
        >
          <View
            style={[
              styles.rowIcon,
              {
                backgroundColor: `${accent}16`,
                borderColor: `${accent}2E`,
              },
            ]}
          >
            <AppIcon name={item.icon} size={18} color={accent} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[NuraiType.body, { color: theme.text }]}>
              {item.title}
            </Text>
            <Text
              style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              {item.subtitle}
            </Text>
          </View>
          {item.value ? (
            <Text
              style={[
                NuraiType.caption,
                { color: accent, maxWidth: 86, textAlign: "right" },
              ]}
              numberOfLines={1}
            >
              {item.value}
            </Text>
          ) : null}
          <AppIcon name="chevron-right" size={18} color={theme.iconMuted} />
        </Pressable>
        {index < total - 1 ? (
          <View
            style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
          />
        ) : null}
      </React.Fragment>
    );
  };

  const renderSection = (title: string, subtitle: string, items: HubItem[]) => (
    <View key={title} style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text style={[NuraiType.overline, { color: theme.primary }]}>
          {title.toUpperCase()}
        </Text>
        <Text style={[NuraiType.bodySmall, { color: theme.textMuted }]}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.glassCard, { borderColor: theme.borderSubtle }]}>
        <NuraiGlass
          pointerEvents="none"
          radius={22}
          tint={GLASS_TINT}
          style={StyleSheet.absoluteFillObject}
        />
        {items.map((item, index) => renderRow(item, index, items.length))}
      </View>
    </View>
  );

  return (
    <PremiumScreen
      scroll
      padded={false}
      pattern={false}
      aurora
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerWrap}>
        <PremiumHeader
          title="More"
          subtitle="Your account, notifications, privacy, and app settings."
          icon={<AppIcon name="user" size={22} color={theme.primary} />}
        />
      </View>

      <Pressable
        onPress={() => navigate("Profile")}
        accessibilityRole="button"
        accessibilityLabel={`Open profile for ${displayName}`}
        style={({ pressed }) => [
          styles.accountHero,
          { borderColor: theme.borderSubtle },
          pressed ? styles.rowPressed : null,
        ]}
      >
        <NuraiGlass
          pointerEvents="none"
          radius={24}
          tint={GLASS_TINT}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: theme.primaryMuted,
              borderColor: theme.primaryBorder,
            },
          ]}
        >
          {user?.profilePhoto ? (
            <Image
              source={user.profilePhoto}
              style={styles.avatarImage}
              contentFit="cover"
              transition={160}
              accessibilityLabel={`${displayName} profile photo`}
            />
          ) : (
            <Text style={[NuraiType.sectionTitle, { color: theme.primary }]}>
              {initials}
            </Text>
          )}
        </View>
        <View style={styles.accountCopy}>
          <Text
            style={[NuraiType.sectionTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text
            style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {accountDetail}
          </Text>
        </View>
        <View
          style={[
            styles.planPill,
            {
              backgroundColor: theme.primaryMuted,
              borderColor: theme.primaryBorder,
            },
          ]}
        >
          <Text
            style={[
              NuraiType.caption,
              {
                color: theme.primary,
              },
            ]}
          >
            {planLabel}
          </Text>
        </View>
        <AppIcon name="chevron-right" size={19} color={theme.iconMuted} />
      </Pressable>

      {renderSection(
        "Membership",
        "Plan access and billing in one place.",
        membershipItems,
      )}
      {renderSection(
        "Notifications & audio",
        "Prayer alerts and the sounds that accompany them.",
        notificationItems,
      )}
      {renderSection(
        "Wellbeing",
        "Body amanah guidance that supports worship without replacing care.",
        wellbeingItems,
      )}
      {renderSection(
        "Settings & privacy",
        "Appearance, data, protection, and app-wide preferences.",
        settingsItems,
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={[NuraiType.overline, { color: theme.primary }]}>
            APPEARANCE
          </Text>
          <Text style={[NuraiType.bodySmall, { color: theme.textMuted }]}>
            NurAI keeps one calm, consistent night atmosphere everywhere.
          </Text>
        </View>
        <View
          accessible
          accessibilityLabel="NurAI night atmosphere, always on"
          style={[
            styles.glassCard,
            styles.switchRow,
            { borderColor: theme.borderSubtle },
          ]}
        >
          <NuraiGlass
            pointerEvents="none"
            radius={22}
            tint={GLASS_TINT}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={[
              styles.rowIcon,
              {
                backgroundColor: theme.primaryMuted,
                borderColor: theme.primaryBorder,
              },
            ]}
          >
            <AppIcon name="moon" size={18} color={theme.primary} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[NuraiType.body, { color: theme.text }]}>
              NurAI night atmosphere
            </Text>
            <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
              Always on
            </Text>
          </View>
          <View
            style={[styles.modeSwitch, { borderColor: theme.primaryBorder }]}
          >
            <AppIcon name="check" size={16} color={theme.primary} />
          </View>
        </View>
      </View>

      {renderSection(
        "Help & about",
        "Product information, policies, and support context.",
        helpItems,
      )}
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 132,
  },
  headerWrap: {
    paddingHorizontal: NuraiSpace.lg,
    paddingTop: NuraiSpace.sm,
    paddingBottom: NuraiSpace.md,
  },
  accountHero: {
    position: "relative",
    overflow: "hidden",
    minHeight: 104,
    marginHorizontal: NuraiSpace.lg,
    marginBottom: NuraiSpace["2xl"],
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: NuraiSpace.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  accountCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  planPill: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: NuraiSpace.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: NuraiSpace["2xl"],
  },
  sectionHeading: {
    marginHorizontal: NuraiSpace.lg,
    marginBottom: NuraiSpace.sm,
    gap: 3,
  },
  glassCard: {
    position: "relative",
    overflow: "hidden",
    marginHorizontal: NuraiSpace.lg,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: 76,
    paddingHorizontal: NuraiSpace.md,
    paddingVertical: NuraiSpace.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  rowPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.99 }],
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 70,
    marginRight: NuraiSpace.md,
  },
  switchRow: {
    minHeight: 76,
    paddingHorizontal: NuraiSpace.md,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  modeSwitch: {
    width: 52,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    justifyContent: "center",
  },
  modeKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
