import React, { useCallback, useState } from "react";
import { TextInput, View, Text } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import {
  NuraiButton,
  NuraiBottomSheet,
  NuraiCard,
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
  createCircle,
  fetchMyCircles,
  joinCircle,
  type CommunityCircleSummary,
} from "@/services/communityCirclesService";

function circleActionError(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError && error.responseBody) {
    const body = error.responseBody as { message?: string };
    if (body.message) return body.message;
  }
  return fallback;
}

function CircleCard({
  circle,
  onPress,
}: {
  circle: CommunityCircleSummary;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <NuraiCard
      onPress={onPress}
      accessibilityLabel={`${circle.name}, ${circle.memberCount} members`}
      style={{ marginBottom: NuraiSpace.sm }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: NuraiSpace.sm,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: circle.checkedInToday
              ? theme.primaryMuted
              : theme.backgroundTertiary,
          }}
        >
          <AppIcon
            name="community"
            size={20}
            color={circle.checkedInToday ? theme.primary : theme.iconMuted}
            decorative
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[NuraiType.body, { color: theme.text }]}>
            {circle.name}
          </Text>
          <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
            {circle.memberCount}/{circle.memberCap} members ·{" "}
            {circle.todayCheckinCount} checked in today
          </Text>
        </View>
        {circle.checkedInToday ? (
          <AppIcon name="check-circle" size={18} color={theme.primary} />
        ) : null}
        <AppIcon name="chevron-right" size={18} color={theme.iconMuted} />
      </View>
    </NuraiCard>
  );
}

export default function DailyCirclesScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [circles, setCircles] = useState<CommunityCircleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheetMode, setSheetMode] = useState<"none" | "create" | "join">(
    "none",
  );
  const [nameInput, setNameInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try {
      const rows = await fetchMyCircles();
      setCircles(rows);
      setError("");
    } catch (err) {
      setError(circleActionError(err, "We could not load your circles."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const closeSheet = () => {
    setSheetMode("none");
    setNameInput("");
    setCodeInput("");
    setFormError("");
  };

  const handleCreate = async () => {
    if (!nameInput.trim() || submitting) return;
    setSubmitting(true);
    setFormError("");
    try {
      const circle = await createCircle({ name: nameInput.trim() });
      closeSheet();
      await load();
      navigation.navigate("CircleDetail", { circleId: circle.id });
    } catch (err) {
      setFormError(circleActionError(err, "We could not create that circle."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!codeInput.trim() || submitting) return;
    setSubmitting(true);
    setFormError("");
    try {
      const circle = await joinCircle(codeInput.trim());
      closeSheet();
      await load();
      navigation.navigate("CircleDetail", { circleId: circle.id });
    } catch (err) {
      setFormError(
        circleActionError(err, "We could not find a circle with that code."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <NuraiScreen scroll>
      <NuraiNavigationBar
        title="Daily Circles"
        subtitle="A small, private space for daily check-ins"
        onBack={() => navigation.goBack()}
      />
      <View style={{ paddingHorizontal: NuraiSpace.lg, gap: NuraiSpace.md }}>
        <View style={{ flexDirection: "row", gap: NuraiSpace.sm }}>
          <NuraiButton
            label="Start a circle"
            icon="plus"
            onPress={() => setSheetMode("create")}
            style={{ flex: 1 }}
          />
          <NuraiButton
            label="Join with code"
            icon="users"
            variant="secondary"
            onPress={() => setSheetMode("join")}
            style={{ flex: 1 }}
          />
        </View>

        {loading ? (
          <NuraiLoadingState title="Loading your circles" body="One moment." />
        ) : error ? (
          <NuraiEmptyState
            title="Something went wrong"
            body={error}
            actionLabel="Try again"
            onAction={load}
          />
        ) : circles.length === 0 ? (
          <NuraiEmptyState
            title="No circles yet"
            body="Start a circle with a few people you trust, or join one with an invite code. Each day, everyone shares one short check-in."
            actionLabel="Start a circle"
            onAction={() => setSheetMode("create")}
          />
        ) : (
          circles.map((circle) => (
            <CircleCard
              key={circle.id}
              circle={circle}
              onPress={() =>
                navigation.navigate("CircleDetail", { circleId: circle.id })
              }
            />
          ))
        )}
      </View>

      <NuraiBottomSheet
        visible={sheetMode !== "none"}
        title={sheetMode === "create" ? "Start a circle" : "Join a circle"}
        onClose={closeSheet}
      >
        <View style={{ gap: NuraiSpace.md, paddingHorizontal: NuraiSpace.lg }}>
          {sheetMode === "create" ? (
            <>
              <Text
                style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
              >
                Give it a name. You'll get an invite code to share with up to 7
                others.
              </Text>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="e.g. Fajr Circle"
                placeholderTextColor={theme.textMuted}
                maxLength={60}
                style={{
                  minHeight: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.borderSubtle,
                  backgroundColor: theme.surfaceElevated,
                  color: theme.text,
                  paddingHorizontal: NuraiSpace.md,
                }}
              />
              {formError ? (
                <Text style={[NuraiType.caption, { color: theme.error }]}>
                  {formError}
                </Text>
              ) : null}
              <NuraiButton
                label="Create circle"
                onPress={handleCreate}
                loading={submitting}
                disabled={!nameInput.trim()}
              />
            </>
          ) : (
            <>
              <Text
                style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
              >
                Enter the invite code someone shared with you.
              </Text>
              <TextInput
                value={codeInput}
                onChangeText={(text) => setCodeInput(text.toUpperCase())}
                placeholder="e.g. AB3D9F2"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="characters"
                maxLength={10}
                style={{
                  minHeight: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.borderSubtle,
                  backgroundColor: theme.surfaceElevated,
                  color: theme.text,
                  paddingHorizontal: NuraiSpace.md,
                  letterSpacing: 2,
                }}
              />
              {formError ? (
                <Text style={[NuraiType.caption, { color: theme.error }]}>
                  {formError}
                </Text>
              ) : null}
              <NuraiButton
                label="Join circle"
                onPress={handleJoin}
                loading={submitting}
                disabled={!codeInput.trim()}
              />
            </>
          )}
        </View>
      </NuraiBottomSheet>
    </NuraiScreen>
  );
}
