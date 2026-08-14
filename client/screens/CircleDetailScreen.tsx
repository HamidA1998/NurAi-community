import React, { useCallback, useState } from "react";
import { Alert, Share, Text, TextInput, View } from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import {
  NuraiAvatar,
  NuraiButton,
  NuraiCard,
  NuraiDivider,
  NuraiNavigationBar,
  NuraiScreen,
  NuraiSpace,
  NuraiType,
} from "@/design-system";
import { NuraiEmptyState, NuraiLoadingState } from "@/design-system/states";
import { AppIcon } from "@/components/icons";
import { useTheme } from "@/hooks/useTheme";
import { ApiRequestError } from "@/lib/query-client";
import {
  fetchCircleDetail,
  leaveCircle,
  postCircleCheckin,
  type CommunityCircleDetail,
} from "@/services/communityCirclesService";
import { recordGardenAction } from "@/services/gardenService";

function circleActionError(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError && error.responseBody) {
    const body = error.responseBody as { message?: string };
    if (body.message) return body.message;
  }
  return fallback;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CircleDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const circleId = route.params?.circleId as number;

  const [detail, setDetail] = useState<CommunityCircleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkinText, setCheckinText] = useState("");
  const [posting, setPosting] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    if (!circleId) return;
    try {
      const data = await fetchCircleDetail(circleId);
      setDetail(data);
      setError("");
    } catch (err) {
      setError(circleActionError(err, "We could not load this circle."));
    } finally {
      setLoading(false);
    }
  }, [circleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const myCheckinToday = detail?.checkins.find(
    (c) => c.checkinDate === today && c.profileId === detail.myProfileId,
  );

  const handlePostCheckin = async () => {
    if (posting) return;
    setPosting(true);
    try {
      await postCircleCheckin(circleId, checkinText.trim());
      setCheckinText("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      recordGardenAction("reflection").catch(() => {});
      await load();
    } catch (err) {
      Alert.alert(
        "Not sent",
        circleActionError(err, "We could not post your check-in."),
      );
    } finally {
      setPosting(false);
    }
  };

  const handleShareInvite = () => {
    if (!detail) return;
    Share.share({
      message: `Join my Daily Circle "${detail.circle.name}" on NurAI. Invite code: ${detail.circle.inviteCode}`,
    }).catch(() => {});
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave this circle?",
      "You can rejoin later with the invite code.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveCircle(circleId);
              navigation.goBack();
            } catch (err) {
              Alert.alert(
                "Could not leave",
                circleActionError(err, "Try again."),
              );
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <NuraiScreen>
        <NuraiNavigationBar title="Circle" onBack={() => navigation.goBack()} />
        <NuraiLoadingState title="Loading circle" body="One moment." />
      </NuraiScreen>
    );
  }

  if (error || !detail) {
    return (
      <NuraiScreen>
        <NuraiNavigationBar title="Circle" onBack={() => navigation.goBack()} />
        <NuraiEmptyState
          title="Something went wrong"
          body={error || "This circle is not available."}
          actionLabel="Try again"
          onAction={load}
        />
      </NuraiScreen>
    );
  }

  return (
    <NuraiScreen scroll keyboardAware>
      <NuraiNavigationBar
        title={detail.circle.name}
        subtitle={`${detail.members.length} members`}
        onBack={() => navigation.goBack()}
        right={
          <AppIcon
            name="share-2"
            size={20}
            color={theme.primary}
            accessibilityLabel="Share invite code"
          />
        }
      />
      <View style={{ paddingHorizontal: NuraiSpace.lg, gap: NuraiSpace.md }}>
        {detail.circle.description ? (
          <Text style={[NuraiType.bodySmall, { color: theme.textSecondary }]}>
            {detail.circle.description}
          </Text>
        ) : null}

        <NuraiCard>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: NuraiSpace.sm,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
                INVITE CODE
              </Text>
              <Text
                style={[
                  NuraiType.sectionTitle,
                  { color: theme.text, letterSpacing: 2 },
                ]}
              >
                {detail.circle.inviteCode}
              </Text>
            </View>
            <NuraiButton
              label="Share"
              icon="share-2"
              variant="secondary"
              onPress={handleShareInvite}
            />
          </View>
        </NuraiCard>

        {!myCheckinToday ? (
          <NuraiCard>
            <Text
              style={[
                NuraiType.body,
                { color: theme.text, marginBottom: NuraiSpace.xs },
              ]}
            >
              Today's check-in
            </Text>
            <TextInput
              value={checkinText}
              onChangeText={setCheckinText}
              placeholder="One line — what today looked like"
              placeholderTextColor={theme.textMuted}
              maxLength={280}
              multiline
              style={{
                minHeight: 56,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.borderSubtle,
                backgroundColor: theme.surfaceElevated,
                color: theme.text,
                padding: NuraiSpace.sm,
                marginBottom: NuraiSpace.sm,
              }}
            />
            <NuraiButton
              label="Post check-in"
              onPress={handlePostCheckin}
              loading={posting}
            />
          </NuraiCard>
        ) : (
          <NuraiCard style={{ backgroundColor: theme.primaryMuted }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: NuraiSpace.sm,
              }}
            >
              <AppIcon
                name="check-circle"
                size={20}
                color={theme.primary}
                decorative
              />
              <Text style={[NuraiType.bodySmall, { color: theme.primaryText }]}>
                You checked in today — see you tomorrow.
              </Text>
            </View>
          </NuraiCard>
        )}

        <NuraiDivider />

        <Text style={[NuraiType.overline, { color: theme.textMuted }]}>
          RECENT CHECK-INS
        </Text>

        {detail.checkins.length === 0 ? (
          <NuraiEmptyState
            title="No check-ins yet"
            body="Be the first to share how today is going."
          />
        ) : (
          detail.checkins.map((checkin) => (
            <View
              key={checkin.id}
              style={{
                flexDirection: "row",
                gap: NuraiSpace.sm,
                paddingVertical: NuraiSpace.sm,
                borderBottomWidth: StyleSheetHairline,
                borderBottomColor: theme.borderSubtle,
              }}
            >
              <NuraiAvatar label={checkin.displayName} size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <View
                  style={{
                    flexDirection: "row",
                    gap: NuraiSpace.xs,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={[
                      NuraiType.bodySmall,
                      { color: theme.text, fontWeight: "700" as const },
                    ]}
                  >
                    {checkin.displayName}
                  </Text>
                  <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
                    {timeAgo(checkin.createdAt)}
                  </Text>
                </View>
                {checkin.content ? (
                  <Text
                    style={[
                      NuraiType.bodySmall,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {checkin.content}
                  </Text>
                ) : (
                  <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
                    Checked in
                  </Text>
                )}
              </View>
            </View>
          ))
        )}

        <NuraiButton
          label="Leave circle"
          variant="ghost"
          onPress={handleLeave}
          style={{ marginTop: NuraiSpace.lg }}
        />
      </View>
    </NuraiScreen>
  );
}

const StyleSheetHairline = 1;
