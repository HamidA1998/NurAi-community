import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import {
  Aurora,
  NuraiAvatar,
  NuraiButton,
  NuraiCard,
  NuraiErrorState,
  NuraiNavigationBar,
  NuraiRadius,
  NuraiScreen,
  NuraiSpace,
  NuraiType,
} from "@/design-system";
import { useTheme } from "@/hooks/useTheme";
import {
  fetchCommunityBlockedMembers,
  fetchCommunityProfileSettings,
  unblockCommunityMember,
  updateCommunityProfileSettings,
  type CommunityBlockedMember,
  type CommunityProfileSettings,
} from "@/services/communitySocialService";
import { AppIcon, type AppIconName } from "@/components/icons";

function SettingSwitch({
  icon,
  title,
  description,
  value,
  onChange,
}: {
  icon: AppIconName;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.settingRow}>
      <View
        style={[styles.settingIcon, { backgroundColor: theme.primaryMuted }]}
      >
        <AppIcon name={icon} size={18} color={theme.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={[NuraiType.bodySmall, { color: theme.text }]}>
          {title}
        </Text>
        <Text style={[NuraiType.caption, { color: theme.textSecondary }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.switchTrack, true: theme.primary }}
        thumbColor={value ? theme.primaryForeground : theme.textMuted}
        accessibilityLabel={title}
        accessibilityHint={description}
      />
    </View>
  );
}

export default function CommunitySettingsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<CommunityProfileSettings | null>(null);
  const [blocked, setBlocked] = useState<CommunityBlockedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextProfile, nextBlocked] = await Promise.all([
        fetchCommunityProfileSettings(),
        fetchCommunityBlockedMembers(),
      ]);
      setProfile(nextProfile);
      setBlocked(nextBlocked);
    } catch {
      setError("We could not load your Community privacy settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const update = <K extends keyof CommunityProfileSettings>(
    key: K,
    value: CommunityProfileSettings[K],
  ) =>
    setProfile((current) => (current ? { ...current, [key]: value } : current));

  const save = async () => {
    if (!profile || profile.displayName.trim().length < 2) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateCommunityProfileSettings({
        displayName: profile.displayName.trim(),
        bio: profile.bio.trim(),
        discoverableByUsername: profile.discoverableByUsername,
        discoverableByEmail: profile.discoverableByEmail,
        allowConnectionRequests: profile.allowConnectionRequests,
      });
      setProfile(updated);
      setSaved(true);
    } catch {
      setError("Your privacy settings were not saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const unblock = async (member: CommunityBlockedMember) => {
    try {
      await unblockCommunityMember(member.id);
      setBlocked((current) => current.filter((item) => item.id !== member.id));
    } catch {
      setError(`We could not unblock ${member.displayName}.`);
    }
  };

  return (
    <View style={styles.fill}>
      <Aurora />
      <NuraiScreen
        scroll
        keyboardAware
        style={styles.transparent}
        contentContainerStyle={styles.screenContent}
        testID="community-settings-screen"
      >
        <NuraiNavigationBar
          title="Community settings"
          subtitle="Privacy, discovery and safety"
          onBack={() => navigation.goBack()}
        />

        {loading ? (
          <View
            style={styles.loading}
            accessible
            accessibilityLabel="Loading Community settings"
          >
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : error && !profile ? (
          <NuraiErrorState
            title="Settings unavailable"
            body={error}
            actionLabel="Try again"
            onAction={() => void load()}
          />
        ) : profile ? (
          <>
            <NuraiCard style={styles.profileCard}>
              <NuraiAvatar label={profile.displayName} size={58} />
              <View style={styles.flex}>
                <Text style={[NuraiType.sectionTitle, { color: theme.text }]}>
                  {profile.displayName}
                </Text>
                <View style={styles.audienceRow}>
                  <AppIcon name="lock" size={14} color={theme.scholar} />
                  <Text style={[NuraiType.caption, { color: theme.scholar }]}>
                    {profile.gender === "male"
                      ? "Brothers-only"
                      : "Sisters-only"}{" "}
                    audience
                  </Text>
                </View>
              </View>
            </NuraiCard>

            <View style={styles.section}>
              <View>
                <Text style={[NuraiType.sectionTitle, { color: theme.text }]}>
                  Public identity
                </Text>
                <Text
                  style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
                >
                  Only this name and optional short bio appear to members in
                  your same audience.
                </Text>
              </View>
              <NuraiCard>
                <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
                  Display name
                </Text>
                <TextInput
                  value={profile.displayName}
                  onChangeText={(value) => update("displayName", value)}
                  maxLength={60}
                  accessibilityLabel="Community display name"
                  placeholder="Display name"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.input,
                    NuraiType.body,
                    {
                      color: theme.text,
                      backgroundColor: theme.input,
                      borderColor: theme.inputBorder,
                    },
                  ]}
                />
                <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
                  Bio (optional)
                </Text>
                <TextInput
                  value={profile.bio}
                  onChangeText={(value) => update("bio", value)}
                  maxLength={240}
                  multiline
                  accessibilityLabel="Community bio"
                  placeholder="A short line about your interests. Do not add contact details."
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.input,
                    styles.bioInput,
                    NuraiType.bodySmall,
                    {
                      color: theme.text,
                      backgroundColor: theme.input,
                      borderColor: theme.inputBorder,
                    },
                  ]}
                />
                <Text
                  style={[
                    NuraiType.overline,
                    { color: theme.textMuted, textAlign: "right" },
                  ]}
                >
                  {profile.bio.length}/240
                </Text>
              </NuraiCard>
            </View>

            <View style={styles.section}>
              <View>
                <Text style={[NuraiType.sectionTitle, { color: theme.text }]}>
                  Discovery & messages
                </Text>
                <Text
                  style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
                >
                  Turning discovery off removes you from that search path.
                  Existing connections are unchanged.
                </Text>
              </View>
              <NuraiCard>
                <SettingSwitch
                  icon="at-sign"
                  title="Find me by username"
                  description="Same-audience members can search your username or display name."
                  value={profile.discoverableByUsername}
                  onChange={(value) => update("discoverableByUsername", value)}
                />
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.borderSubtle },
                  ]}
                />
                <SettingSwitch
                  icon="mail"
                  title="Find me by exact email"
                  description="Your email is never displayed; an exact match can find this profile."
                  value={profile.discoverableByEmail}
                  onChange={(value) => update("discoverableByEmail", value)}
                />
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.borderSubtle },
                  ]}
                />
                <SettingSwitch
                  icon="user-plus"
                  title="Allow connection requests"
                  description="Only accepted same-audience connections can start direct messages."
                  value={profile.allowConnectionRequests}
                  onChange={(value) => update("allowConnectionRequests", value)}
                />
              </NuraiCard>
            </View>

            <NuraiCard style={styles.lockCard}>
              <AppIcon name="shield" size={21} color={theme.primary} />
              <Text
                style={[
                  NuraiType.bodySmall,
                  { color: theme.textSecondary, flex: 1 },
                ]}
              >
                Your audience cannot be changed on this profile. Community
                direct messages, people search, boards and conversations all
                enforce the same audience on the server.
              </Text>
            </NuraiCard>

            <View style={styles.section}>
              <View>
                <Text style={[NuraiType.sectionTitle, { color: theme.text }]}>
                  Blocked members
                </Text>
                <Text
                  style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
                >
                  Blocked members cannot find, connect, message or interact with
                  you.
                </Text>
              </View>
              <NuraiCard>
                {blocked.length ? (
                  blocked.map((member, index) => (
                    <View
                      key={member.id}
                      style={[
                        styles.blockedRow,
                        index < blocked.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.borderSubtle,
                        },
                      ]}
                    >
                      <NuraiAvatar label={member.displayName} size={40} />
                      <View style={styles.flex}>
                        <Text
                          style={[NuraiType.bodySmall, { color: theme.text }]}
                        >
                          {member.displayName}
                        </Text>
                        <Text
                          style={[
                            NuraiType.caption,
                            { color: theme.textMuted },
                          ]}
                        >
                          @{member.username}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => void unblock(member)}
                        accessibilityRole="button"
                        accessibilityLabel={`Unblock ${member.displayName}`}
                        style={[
                          styles.unblockButton,
                          { borderColor: theme.borderStrong },
                        ]}
                      >
                        <Text
                          style={[NuraiType.caption, { color: theme.text }]}
                        >
                          Unblock
                        </Text>
                      </Pressable>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyBlocked}>
                    <AppIcon
                      name="check-circle"
                      size={20}
                      color={theme.primary}
                    />
                    <Text
                      style={[
                        NuraiType.bodySmall,
                        { color: theme.textSecondary },
                      ]}
                    >
                      No blocked members.
                    </Text>
                  </View>
                )}
              </NuraiCard>
            </View>

            <View style={styles.section}>
              <Text style={[NuraiType.sectionTitle, { color: theme.text }]}>
                More controls
              </Text>
              <NuraiCard>
                <Pressable
                  onPress={() => navigation.navigate("NotificationSettings")}
                  accessibilityRole="button"
                  accessibilityLabel="Community notification settings"
                  style={styles.linkRow}
                >
                  <AppIcon name="bell" size={19} color={theme.primary} />
                  <View style={styles.flex}>
                    <Text style={[NuraiType.bodySmall, { color: theme.text }]}>
                      Notifications
                    </Text>
                    <Text
                      style={[
                        NuraiType.caption,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Manage app alerts. Message previews remain private.
                    </Text>
                  </View>
                  <AppIcon
                    name="chevron-right"
                    size={18}
                    color={theme.iconMuted}
                  />
                </Pressable>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.borderSubtle },
                  ]}
                />
                <Pressable
                  onPress={() => navigation.navigate("Settings")}
                  accessibilityRole="button"
                  accessibilityLabel="Account and data settings"
                  style={styles.linkRow}
                >
                  <AppIcon name="database" size={19} color={theme.scholar} />
                  <View style={styles.flex}>
                    <Text style={[NuraiType.bodySmall, { color: theme.text }]}>
                      Account & data
                    </Text>
                    <Text
                      style={[
                        NuraiType.caption,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Export or delete your NurAI account from the main Settings
                      screen.
                    </Text>
                  </View>
                  <AppIcon
                    name="chevron-right"
                    size={18}
                    color={theme.iconMuted}
                  />
                </Pressable>
              </NuraiCard>
            </View>

            {error ? (
              <Text
                accessibilityRole="alert"
                style={[NuraiType.bodySmall, { color: theme.error }]}
              >
                {error}
              </Text>
            ) : null}
            {saved ? (
              <Text
                accessibilityRole="alert"
                style={[
                  NuraiType.bodySmall,
                  { color: theme.primary, textAlign: "center" },
                ]}
              >
                Community privacy settings saved.
              </Text>
            ) : null}
            <NuraiButton
              label="Save privacy settings"
              icon="check"
              onPress={() => void save()}
              loading={saving}
              disabled={profile.displayName.trim().length < 2}
            />
          </>
        ) : null}
      </NuraiScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  transparent: { backgroundColor: "transparent" },
  screenContent: { paddingHorizontal: NuraiSpace.lg, gap: NuraiSpace.xl },
  loading: { minHeight: 320, alignItems: "center", justifyContent: "center" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.md,
  },
  audienceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.xxs,
    marginTop: NuraiSpace.xxs,
  },
  section: { gap: NuraiSpace.sm },
  input: {
    minHeight: 50,
    borderRadius: NuraiRadius.control,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: NuraiSpace.md,
    marginTop: NuraiSpace.xs,
    marginBottom: NuraiSpace.md,
  },
  bioInput: {
    minHeight: 100,
    paddingTop: NuraiSpace.sm,
    textAlignVertical: "top",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    minHeight: 78,
    paddingVertical: NuraiSpace.xs,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: NuraiRadius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: StyleSheet.hairlineWidth },
  lockCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: NuraiSpace.sm,
  },
  blockedRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    paddingVertical: NuraiSpace.xs,
  },
  unblockButton: {
    minHeight: 40,
    borderRadius: NuraiRadius.control,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: NuraiSpace.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBlocked: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: NuraiSpace.sm,
    minHeight: 76,
  },
  linkRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
});
