import React, { useCallback } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import {
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import {
  APP_STORE_SHOWCASE_SCENES,
  buildAppStoreReleaseBlockerResolutionShareText,
  buildAppStoreReviewerNoteShareText,
  buildAppStoreShowcaseCaptureHandoffText,
  getAppStoreShowcaseReadiness,
} from "@/services/appStoreShowcaseService";
import { AppIcon, type AppIconName } from "@/components/icons";

export default function AppStoreShowcaseScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const readiness = getAppStoreShowcaseReadiness();
  const shareCaptureHandoff = useCallback(async () => {
    try {
      await Share.share({
        title: "NurAI App Store screenshot capture handoff",
        message: buildAppStoreShowcaseCaptureHandoffText(
          APP_STORE_SHOWCASE_SCENES,
          readiness,
        ),
      });
    } catch {
      Alert.alert(
        "Share unavailable",
        "NurAI could not open the share sheet for the screenshot capture handoff.",
      );
    }
  }, [readiness]);
  const shareReleaseBlockerResolution = useCallback(async () => {
    try {
      await Share.share({
        title: "NurAI release blocker resolution packet",
        message: buildAppStoreReleaseBlockerResolutionShareText(
          readiness.releaseBlockerResolutionPlan,
        ),
      });
    } catch {
      Alert.alert(
        "Share unavailable",
        "NurAI could not open the share sheet for the release blocker resolution packet.",
      );
    }
  }, [readiness.releaseBlockerResolutionPlan]);
  const shareReviewerNotes = useCallback(async () => {
    try {
      await Share.share({
        title: "NurAI App Review notes packet",
        message: buildAppStoreReviewerNoteShareText(
          readiness.reviewerNotePacket,
        ),
      });
    } catch {
      Alert.alert(
        "Share unavailable",
        "NurAI could not open the share sheet for the App Review notes packet.",
      );
    }
  }, [readiness.reviewerNotePacket]);

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}
    >
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[
              styles.iconButton,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: theme.borderSubtle,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="button-showcase-back"
          >
            <AppIcon name="arrow-left" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.headerBadge}>
            <AppIcon name="camera" size={14} color={theme.scholar} />
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "800" }}
            >
              {readiness.sceneCount} scenes
            </ThemedText>
          </View>
        </View>

        <LinearGradient
          colors={["#061B1F", "#0A2B32", "#07121F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <AppIcon name="star" size={28} color={theme.scholar} />
            </View>
            <View style={styles.heroCopy}>
              <ThemedText
                type="caption"
                style={[styles.eyebrow, { color: theme.scholar }]}
              >
                APP STORE SHOWCASE
              </ThemedText>
              <ThemedText type="hero" style={styles.heroTitle}>
                NurAI in eight flagship moments
              </ThemedText>
            </View>
          </View>
          <GoldDivider
            color={theme.scholar}
            opacity={0.46}
            style={styles.heroDivider}
          />
          <ThemedText type="body" style={styles.heroBody}>
            A capture-ready narrative for Quran, prayer, AI trust, learning,
            family, and pilgrimage.
          </ThemedText>
        </LinearGradient>

        <View
          style={[
            styles.captureCommandRail,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.primaryBorder,
            },
          ]}
          testID="app-store-capture-command-rail"
        >
          <View style={styles.captureCommandHeader}>
            <View
              style={[
                styles.captureCommandHeaderIcon,
                { backgroundColor: theme.primarySubtle },
              ]}
            >
              <AppIcon name="zap" size={17} color={theme.primary} />
            </View>
            <View style={styles.captureCommandHeaderCopy}>
              <ThemedText
                type="caption"
                style={[styles.eyebrow, { color: theme.primary }]}
              >
                CAPTURE COMMAND RAIL
              </ThemedText>
              <ThemedText type="h4">
                Run the screenshot session from here
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={2}
                style={{ color: theme.textMuted, lineHeight: 18 }}
              >
                Open the next shot, export operator packets, and keep launch
                blockers separate from screenshot readiness.
              </ThemedText>
            </View>
          </View>
          <View style={styles.captureCommandGrid}>
            <CaptureCommand
              icon="camera"
              title="Next shot"
              subtitle={readiness.captureSessionPlan.nextSceneTitle}
              meta={readiness.captureSessionPlan.estimatedMinutesLabel}
              color={theme.primary}
              onPress={() =>
                navigation.navigate(
                  readiness.captureSessionPlan.nextSceneRouteName,
                )
              }
              testID="button-app-store-command-next-shot"
            />
            <CaptureCommand
              icon="share-2"
              title="Capture handoff"
              subtitle={`${readiness.sceneCount} scenes · ${readiness.qaGateCount} QA gates`}
              meta="Share shot list"
              color={theme.scholar}
              onPress={shareCaptureHandoff}
              testID="button-app-store-command-share-capture-handoff"
            />
            <CaptureCommand
              icon="alert-triangle"
              title="Blocker packet"
              subtitle={readiness.releaseBlockerResolutionPlan.statusLabel}
              meta="Share owner actions"
              color={theme.error}
              onPress={shareReleaseBlockerResolution}
              testID="button-app-store-command-share-blocker-packet"
            />
            <CaptureCommand
              icon="clipboard"
              title="Reviewer notes"
              subtitle={readiness.reviewerNotePacket.statusLabel}
              meta="Share no-secret notes"
              color={theme.primary}
              onPress={shareReviewerNotes}
              testID="button-app-store-command-share-reviewer-notes"
            />
          </View>
        </View>

        <View style={styles.readinessGrid}>
          <ReadinessTile
            icon="image"
            label="Scenes"
            value={String(readiness.sceneCount)}
            color={theme.primary}
          />
          <ReadinessTile
            icon="navigation"
            label="Flows"
            value={String(readiness.flowCount)}
            color={theme.scholar}
          />
          <ReadinessTile
            icon="shield"
            label="Trust scenes"
            value={String(readiness.trustSceneCount)}
            color={theme.scholar}
          />
          <ReadinessTile
            icon="message-square"
            label="Captions"
            value={String(readiness.storeCaptionCount)}
            color={theme.primary}
          />
          <ReadinessTile
            icon="clipboard"
            label="Proof ledger"
            value={`${readiness.proofLedgerCount}/${readiness.sceneCount}`}
            color={theme.scholar}
          />
          <ReadinessTile
            icon="map-pin"
            label="Route proof"
            value={`${readiness.routeProofCount}/${readiness.sceneCount}`}
            color={theme.primary}
          />
          <ReadinessTile
            icon="lock"
            label="Demo safety"
            value={`${readiness.demoDataSafetyRuleCount}/${readiness.sceneCount}`}
            color={theme.scholar}
          />
          <ReadinessTile
            icon="check-square"
            label="Claim safety"
            value={`${readiness.claimSafetyReceiptCount}/${readiness.sceneCount}`}
            color={theme.primary}
          />
          <ReadinessTile
            icon="file-text"
            label="Listing pack"
            value={String(readiness.listingMetadataSectionCount)}
            color={theme.scholar}
          />
          <ReadinessTile
            icon="layers"
            label="Proof pack"
            value={`${readiness.screenshotSetProofSceneCount}/${readiness.sceneCount}`}
            color={theme.primary}
          />
        </View>

        <View
          style={[
            styles.screenshotProofPackPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.primaryBorder,
            },
          ]}
          testID="app-store-screenshot-proof-pack"
          accessibilityLabel={`${readiness.screenshotSetProofPack.title}. ${readiness.screenshotSetProofPack.statusLabel}. ${readiness.screenshotSetProofPack.submissionBoundaryLabel}`}
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="layers" size={17} color={theme.primary} />
            <ThemedText type="h4">Screenshot proof pack</ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            {readiness.screenshotSetProofPack.summaryLabel}
          </ThemedText>
          <View style={styles.screenshotProofBoundaryGrid}>
            <DecisionProofLine
              icon="image"
              value={readiness.screenshotSetProofPack.firstFourBoundaryLabel}
              color={theme.primary}
            />
            <DecisionProofLine
              icon="alert-triangle"
              value={readiness.screenshotSetProofPack.submissionBoundaryLabel}
              color={theme.error}
            />
            <DecisionProofLine
              icon="lock"
              value={readiness.screenshotSetProofPack.noSecretBoundaryLabel}
              color={theme.scholar}
            />
          </View>
          <View style={styles.screenshotProofSceneList}>
            {readiness.screenshotSetProofPack.scenes.map((scene) => {
              const color =
                scene.tone === "scholar" ? theme.scholar : theme.primary;
              return (
                <View
                  key={scene.id}
                  style={[
                    styles.screenshotProofSceneRow,
                    {
                      backgroundColor: `${color}0A`,
                      borderColor: scene.heroCandidate
                        ? `${color}34`
                        : theme.borderSubtle,
                    },
                  ]}
                  testID={`app-store-screenshot-proof-${scene.id}`}
                >
                  <View
                    style={[
                      styles.screenshotProofSceneIcon,
                      { backgroundColor: `${color}16` },
                    ]}
                  >
                    <AppIcon name={scene.icon} size={15} color={color} />
                  </View>
                  <View style={styles.screenshotProofSceneCopy}>
                    <View style={styles.screenshotProofSceneTopLine}>
                      <ThemedText type="small" numberOfLines={1}>
                        {scene.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color, fontWeight: "900", flexShrink: 1 }}
                      >
                        {scene.orderLabel}
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color, lineHeight: 17, fontWeight: "800" }}
                    >
                      {scene.appStoreSlotLabel}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color: theme.textSecondary, lineHeight: 17 }}
                    >
                      {scene.valueProofLabel}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color: theme.textMuted, lineHeight: 17 }}
                    >
                      {scene.trustProofLabel}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color: theme.textMuted, lineHeight: 17 }}
                    >
                      {scene.routeLabel}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{
                        color: theme.error,
                        lineHeight: 17,
                        fontWeight: "800",
                      }}
                    >
                      {scene.retakeLabel}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
          <View
            style={[
              styles.screenshotProofRetakeBoundary,
              {
                backgroundColor: "rgba(248,113,113,0.07)",
                borderColor: "rgba(248,113,113,0.22)",
              },
            ]}
          >
            <AppIcon name="refresh-cw" size={13} color={theme.error} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, lineHeight: 18, flex: 1 }}
            >
              {readiness.screenshotSetProofPack.retakeBoundaryLabel}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.submissionPassportPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.error + "34",
            },
          ]}
          testID="app-store-submission-readiness-passport"
          accessibilityLabel={`${readiness.submissionReadinessPassport.title}. ${readiness.submissionReadinessPassport.statusLabel}. ${readiness.submissionReadinessPassport.submissionBoundaryLabel}`}
        >
          <View style={styles.submissionPassportHeader}>
            <View
              style={[
                styles.submissionPassportIcon,
                { backgroundColor: "rgba(248,113,113,0.12)" },
              ]}
            >
              <AppIcon name="shield" size={18} color={theme.error} />
            </View>
            <View style={styles.submissionPassportCopy}>
              <ThemedText
                type="caption"
                style={[styles.eyebrow, { color: theme.error }]}
              >
                Submission readiness passport
              </ThemedText>
              <ThemedText type="h4">
                {readiness.submissionReadinessPassport.statusLabel}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={2}
                style={{ color: theme.textMuted, lineHeight: 18 }}
              >
                {readiness.submissionReadinessPassport.summaryLabel}
              </ThemedText>
            </View>
          </View>
          <View style={styles.submissionPassportRows}>
            {readiness.submissionReadinessPassport.rows.map((row) => {
              const color =
                row.tone === "danger"
                  ? theme.error
                  : row.tone === "scholar"
                    ? theme.scholar
                    : theme.primary;
              return (
                <View
                  key={row.id}
                  style={[
                    styles.submissionPassportRow,
                    {
                      backgroundColor: `${color}0A`,
                      borderColor: `${color}24`,
                    },
                  ]}
                  testID={`app-store-submission-passport-${row.id}`}
                >
                  <View
                    style={[
                      styles.submissionPassportRowIcon,
                      { backgroundColor: `${color}14` },
                    ]}
                  >
                    <AppIcon name={row.icon} size={14} color={color} />
                  </View>
                  <View style={styles.submissionPassportRowCopy}>
                    <View style={styles.submissionPassportTopLine}>
                      <ThemedText type="small" numberOfLines={1}>
                        {row.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color, fontWeight: "900", flexShrink: 1 }}
                      >
                        {row.valueLabel}
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color: theme.textSecondary, lineHeight: 17 }}
                    >
                      {row.detail}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color, lineHeight: 17, fontWeight: "800" }}
                    >
                      {row.nextActionLabel}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={styles.submissionPassportBoundaryGrid}>
            <DecisionProofLine
              icon="camera"
              value={
                readiness.submissionReadinessPassport.screenshotBoundaryLabel
              }
              color={theme.primary}
            />
            <DecisionProofLine
              icon="alert-triangle"
              value={
                readiness.submissionReadinessPassport.submissionBoundaryLabel
              }
              color={theme.error}
            />
            <DecisionProofLine
              icon="lock"
              value={readiness.submissionReadinessPassport.noSecretLabel}
              color={theme.scholar}
            />
          </View>
        </View>

        <View
          style={[
            styles.captureDecisionPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.error + "34",
            },
          ]}
          testID="app-store-capture-decision-summary"
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="alert-triangle" size={17} color={theme.error} />
            <ThemedText type="h4">
              {readiness.captureDecisionSummary.title}
            </ThemedText>
          </View>
          <View style={styles.captureDecisionStatusRow}>
            <View
              style={[
                styles.captureDecisionStatus,
                {
                  backgroundColor: theme.primarySubtle,
                  borderColor: theme.primaryBorder,
                },
              ]}
            >
              <AppIcon name="camera" size={14} color={theme.primary} />
              <ThemedText
                type="caption"
                style={{ color: theme.primary, fontWeight: "900", flex: 1 }}
              >
                {readiness.captureDecisionSummary.captureStatusLabel}
              </ThemedText>
            </View>
            <View
              style={[
                styles.captureDecisionStatus,
                {
                  backgroundColor: "rgba(248,113,113,0.08)",
                  borderColor: "rgba(248,113,113,0.24)",
                },
              ]}
            >
              <AppIcon name="lock" size={14} color={theme.error} />
              <ThemedText
                type="caption"
                style={{ color: theme.error, fontWeight: "900", flex: 1 }}
              >
                {readiness.captureDecisionSummary.launchStatusLabel}
              </ThemedText>
            </View>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            {readiness.captureDecisionSummary.nextCaptureAction}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.error, lineHeight: 18, fontWeight: "800" }}
          >
            {readiness.captureDecisionSummary.blockedLaunchReason}
          </ThemedText>
          <View style={styles.captureDecisionProofGrid}>
            <DecisionProofLine
              icon="aperture"
              value={readiness.captureDecisionSummary.qaGateLabel}
              color={theme.scholar}
            />
            <DecisionProofLine
              icon="clipboard"
              value={readiness.captureDecisionSummary.captureProofLabel}
              color={theme.primary}
            />
          </View>
          <View style={styles.blockerRow}>
            {readiness.captureDecisionSummary.blockerLabels.map((blocker) => (
              <View
                key={blocker}
                style={[
                  styles.blockerChip,
                  {
                    backgroundColor: "rgba(248,113,113,0.08)",
                    borderColor: "rgba(248,113,113,0.24)",
                  },
                ]}
              >
                <AppIcon name="alert-triangle" size={11} color={theme.error} />
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: theme.error, fontWeight: "800" }}
                >
                  {blocker}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.platformAssetPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.primaryBorder,
            },
          ]}
          testID="app-store-platform-asset-requirements"
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="upload-cloud" size={17} color={theme.primary} />
            <ThemedText type="h4">Platform asset requirements</ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            Current store asset rules are tracked beside the shot list so
            screenshot capture matches Apple and Google requirements without
            turning assets into launch proof.
          </ThemedText>
          <View style={styles.platformAssetList}>
            {readiness.platformAssetRequirements.map((requirement) => {
              const accent =
                requirement.tone === "scholar" ? theme.scholar : theme.primary;
              return (
                <View
                  key={requirement.id}
                  style={[
                    styles.platformAssetRow,
                    {
                      backgroundColor: `${accent}0A`,
                      borderColor: `${accent}24`,
                    },
                  ]}
                  testID={`app-store-platform-asset-${requirement.id}`}
                >
                  <View
                    style={[
                      styles.platformAssetIcon,
                      { backgroundColor: `${accent}14` },
                    ]}
                  >
                    <AppIcon name={requirement.icon} size={14} color={accent} />
                  </View>
                  <View style={styles.platformAssetCopy}>
                    <View style={styles.platformAssetTopLine}>
                      <ThemedText type="small" numberOfLines={1}>
                        {requirement.platformLabel}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: accent, fontWeight: "900" }}
                      >
                        {requirement.statusLabel}
                      </ThemedText>
                    </View>
                    <MatrixLine
                      icon="image"
                      label="Count"
                      value={requirement.assetCountLabel}
                      color={accent}
                    />
                    <MatrixLine
                      icon="smartphone"
                      label="Format"
                      value={requirement.formatLabel}
                      color={theme.primary}
                    />
                    <MatrixLine
                      icon="camera"
                      label="Capture"
                      value={requirement.captureImplicationLabel}
                      color={theme.scholar}
                    />
                    <MatrixLine
                      icon="eye"
                      label="Viewport"
                      value={requirement.firstViewportRuleLabel}
                      color={accent}
                    />
                    <MatrixLine
                      icon="slash"
                      label="Do not submit"
                      value={requirement.noGoLabel}
                      color={theme.error}
                    />
                    <MatrixLine
                      icon="file-text"
                      label="Source"
                      value={requirement.sourceLabel}
                      color={theme.textMuted}
                    />
                    <View
                      style={[
                        styles.platformAssetSourceLedger,
                        {
                          backgroundColor: `${accent}0A`,
                          borderColor: `${accent}24`,
                        },
                      ]}
                      testID={`app-store-platform-source-ledger-${requirement.id}`}
                    >
                      <MatrixLine
                        icon="link"
                        label="Official source"
                        value={requirement.sourceUrl}
                        color={accent}
                      />
                      <MatrixLine
                        icon="check-circle"
                        label="Checked"
                        value={requirement.sourceCheckedLabel}
                        color={theme.primary}
                      />
                      <MatrixLine
                        icon="clipboard"
                        label="Requirement"
                        value={requirement.sourceRequirementLabel}
                        color={theme.scholar}
                      />
                      <MatrixLine
                        icon="type"
                        label="Alt text"
                        value={requirement.accessibilityAltTextLabel}
                        color={accent}
                      />
                      <MatrixLine
                        icon="shield"
                        label="Boundary"
                        value={requirement.complianceBoundaryLabel}
                        color={theme.error}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={styles.platformAssetQuestionList}>
            {readiness.storeAssetComplianceQuestions.map((question) => (
              <View
                key={question}
                style={[
                  styles.platformAssetQuestion,
                  {
                    backgroundColor: `${theme.primary}0A`,
                    borderColor: `${theme.primary}24`,
                  },
                ]}
              >
                <AppIcon name="help-circle" size={12} color={theme.primary} />
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    lineHeight: 17,
                    flex: 1,
                  }}
                >
                  {question}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.launchEvidenceSprintPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.scholar + "34",
            },
          ]}
          testID="app-store-launch-evidence-sprint"
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="target" size={17} color={theme.scholar} />
            <ThemedText type="h4">Launch evidence sprint</ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            {readiness.launchEvidenceSprint.summary}
          </ThemedText>
          <View style={styles.launchEvidenceSprintStatus}>
            <DecisionProofLine
              icon="alert-triangle"
              value={readiness.launchEvidenceSprint.statusLabel}
              color={theme.error}
            />
            <DecisionProofLine
              icon="camera"
              value={readiness.launchEvidenceSprint.captureBoundaryLabel}
              color={theme.primary}
            />
            <DecisionProofLine
              icon="book-open"
              value={readiness.launchEvidenceSprint.librarySprintBridgeLabel}
              color={theme.scholar}
            />
          </View>
          <View style={styles.launchEvidenceSprintTaskList}>
            {readiness.launchEvidenceSprint.tasks.map((task) => {
              const color =
                task.tone === "danger"
                  ? theme.error
                  : task.tone === "scholar"
                    ? theme.scholar
                    : theme.primary;
              return (
                <View
                  key={task.id}
                  style={[
                    styles.launchEvidenceSprintTask,
                    {
                      backgroundColor: `${color}0A`,
                      borderColor: `${color}24`,
                    },
                  ]}
                  testID={`app-store-launch-evidence-task-${task.id}`}
                >
                  <View
                    style={[
                      styles.launchEvidenceSprintIcon,
                      { backgroundColor: `${color}14` },
                    ]}
                  >
                    <AppIcon name={task.icon} size={14} color={color} />
                  </View>
                  <View style={styles.launchEvidenceSprintCopy}>
                    <View style={styles.launchEvidenceSprintTopLine}>
                      <ThemedText type="small" numberOfLines={1}>
                        {task.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color, fontWeight: "900", flexShrink: 1 }}
                      >
                        {task.ownerLabel}
                      </ThemedText>
                    </View>
                    <MatrixLine
                      icon="send"
                      label="Action"
                      value={task.actionLabel}
                      color={color}
                    />
                    <MatrixLine
                      icon="terminal"
                      label="Proof"
                      value={task.proofLabel}
                      color={theme.scholar}
                    />
                    <MatrixLine
                      icon="shield"
                      label="Boundary"
                      value={task.boundaryLabel}
                      color={theme.primary}
                    />
                  </View>
                </View>
              );
            })}
          </View>
          <View
            style={[
              styles.launchEvidenceSprintBoundary,
              {
                backgroundColor: "rgba(248,113,113,0.08)",
                borderColor: "rgba(248,113,113,0.22)",
              },
            ]}
            testID="app-store-launch-evidence-sprint-boundary"
          >
            <AppIcon name="lock" size={14} color={theme.error} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, lineHeight: 18, flex: 1 }}
            >
              {readiness.launchEvidenceSprint.nextActionLabel}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.maintainabilityRunwayPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.primary + "32",
            },
          ]}
          testID="app-store-maintainability-runway"
          accessibilityLabel={`${readiness.maintainabilityRunway.title}. ${readiness.maintainabilityRunway.statusLabel}. ${readiness.maintainabilityRunway.noSecretBoundaryLabel}`}
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="git-branch" size={17} color={theme.primary} />
            <ThemedText type="h4">
              {readiness.maintainabilityRunway.title}
            </ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            {readiness.maintainabilityRunway.summaryLabel}
          </ThemedText>
          <View style={styles.maintainabilityBoundaryGrid}>
            <DecisionProofLine
              icon="check-square"
              value={readiness.maintainabilityRunway.statusLabel}
              color={theme.primary}
            />
            <DecisionProofLine
              icon="shield"
              value={readiness.maintainabilityRunway.noSecretBoundaryLabel}
              color={theme.scholar}
            />
            <DecisionProofLine
              icon="alert-triangle"
              value={readiness.maintainabilityRunway.blockerBoundaryLabel}
              color={theme.error}
            />
          </View>
          <View style={styles.maintainabilitySliceList}>
            {readiness.maintainabilityRunway.slices.map((slice) => {
              const color =
                slice.tone === "danger"
                  ? theme.error
                  : slice.tone === "scholar"
                    ? theme.scholar
                    : theme.primary;
              return (
                <View
                  key={slice.id}
                  style={[
                    styles.maintainabilitySliceRow,
                    {
                      backgroundColor: `${color}0A`,
                      borderColor: `${color}24`,
                    },
                  ]}
                  testID={`app-store-maintainability-slice-${slice.id}`}
                >
                  <View
                    style={[
                      styles.maintainabilitySliceIcon,
                      { backgroundColor: `${color}14` },
                    ]}
                  >
                    <AppIcon name={slice.icon} size={15} color={color} />
                  </View>
                  <View style={styles.maintainabilitySliceCopy}>
                    <View style={styles.maintainabilitySliceTopLine}>
                      <ThemedText type="small" numberOfLines={1}>
                        {slice.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color, fontWeight: "900", flexShrink: 1 }}
                      >
                        {slice.ownerLabel}
                      </ThemedText>
                    </View>
                    <MatrixLine
                      icon="terminal"
                      label="Check"
                      value={slice.commandLabel}
                      color={color}
                    />
                    <MatrixLine
                      icon="eye"
                      label="Review"
                      value={slice.reviewBoundaryLabel}
                      color={theme.primary}
                    />
                    <MatrixLine
                      icon="check-circle"
                      label="Accept"
                      value={slice.acceptanceLabel}
                      color={theme.scholar}
                    />
                  </View>
                </View>
              );
            })}
          </View>
          <View
            style={[
              styles.maintainabilityPolicy,
              {
                backgroundColor: "rgba(20,184,166,0.08)",
                borderColor: "rgba(20,184,166,0.22)",
              },
            ]}
            testID="app-store-maintainability-merge-policy"
          >
            <AppIcon name="git-merge" size={14} color={theme.primary} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, lineHeight: 18, flex: 1 }}
            >
              {readiness.maintainabilityRunway.mergePolicyLabel}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.releaseBlockerResolutionPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.error + "34",
            },
          ]}
          testID="app-store-release-blocker-resolution-plan"
          accessibilityLabel={`${readiness.releaseBlockerResolutionPlan.title}. ${readiness.releaseBlockerResolutionPlan.statusLabel}. ${readiness.releaseBlockerResolutionPlan.noSecretBoundaryLabel}`}
        >
          <View style={styles.releaseBlockerResolutionHeader}>
            <View style={styles.releaseBlockerResolutionTitleRow}>
              <AppIcon name="list" size={17} color={theme.error} />
              <ThemedText type="h4" style={{ flex: 1 }}>
                {readiness.releaseBlockerResolutionPlan.title}
              </ThemedText>
            </View>
            <Pressable
              onPress={shareReleaseBlockerResolution}
              style={({ pressed }) => [
                styles.releaseBlockerResolutionShareButton,
                { borderColor: `${theme.error}38` },
                pressed ? { opacity: 0.82 } : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Share release blocker resolution packet"
              accessibilityHint="Shares sequenced release owner actions, proof commands, acceptance checks, and no-secret boundaries."
              testID="button-app-store-share-release-blocker-resolution"
            >
              <AppIcon name="share-2" size={15} color={theme.error} />
            </Pressable>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            {readiness.releaseBlockerResolutionPlan.summaryLabel}
          </ThemedText>
          <View style={styles.releaseBlockerResolutionBoundaryGrid}>
            <DecisionProofLine
              icon="play-circle"
              value={readiness.releaseBlockerResolutionPlan.firstActionLabel}
              color={theme.error}
            />
            <DecisionProofLine
              icon="camera"
              value={
                readiness.releaseBlockerResolutionPlan.screenshotBoundaryLabel
              }
              color={theme.primary}
            />
            <DecisionProofLine
              icon="lock"
              value={
                readiness.releaseBlockerResolutionPlan.noSecretBoundaryLabel
              }
              color={theme.scholar}
            />
          </View>
          <View style={styles.releaseBlockerResolutionList}>
            {readiness.releaseBlockerResolutionPlan.rows.map((row) => {
              const color =
                row.tone === "danger"
                  ? theme.error
                  : row.tone === "scholar"
                    ? theme.scholar
                    : theme.primary;
              return (
                <View
                  key={row.id}
                  style={[
                    styles.releaseBlockerResolutionRow,
                    {
                      backgroundColor: `${color}0A`,
                      borderColor: `${color}24`,
                    },
                  ]}
                  testID={`app-store-release-blocker-resolution-${row.id}`}
                >
                  <View
                    style={[
                      styles.releaseBlockerResolutionIcon,
                      { backgroundColor: `${color}14` },
                    ]}
                  >
                    <AppIcon name={row.icon} size={15} color={color} />
                  </View>
                  <View style={styles.releaseBlockerResolutionCopy}>
                    <View style={styles.releaseBlockerResolutionTopLine}>
                      <ThemedText type="small" numberOfLines={1}>
                        {row.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color, fontWeight: "900", flexShrink: 1 }}
                      >
                        {row.orderLabel}
                      </ThemedText>
                    </View>
                    <MatrixLine
                      icon="git-branch"
                      label="Dependency"
                      value={row.dependencyLabel}
                      color={color}
                    />
                    <MatrixLine
                      icon="user-check"
                      label="Owner"
                      value={row.ownerLabel}
                      color={theme.primary}
                    />
                    <MatrixLine
                      icon="terminal"
                      label="Proof"
                      value={row.proofCommandLabel}
                      color={theme.scholar}
                    />
                    <MatrixLine
                      icon="check-circle"
                      label="Accept"
                      value={row.acceptanceLabel}
                      color={color}
                    />
                    <View
                      style={[
                        styles.releaseBlockerResolutionSecretBoundary,
                        {
                          backgroundColor: "rgba(248,113,113,0.08)",
                          borderColor: "rgba(248,113,113,0.22)",
                        },
                      ]}
                    >
                      <AppIcon name="lock" size={12} color={theme.error} />
                      <ThemedText
                        type="caption"
                        style={{
                          color: theme.textSecondary,
                          lineHeight: 16,
                          flex: 1,
                        }}
                      >
                        {row.noSecretBoundaryLabel}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
          <View
            style={[
              styles.releaseBlockerResolutionBoundary,
              {
                backgroundColor: "rgba(248,113,113,0.08)",
                borderColor: "rgba(248,113,113,0.22)",
              },
            ]}
            testID="app-store-release-blocker-resolution-boundary"
          >
            <AppIcon name="check-square" size={14} color={theme.error} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, lineHeight: 18, flex: 1 }}
            >
              {readiness.releaseBlockerResolutionPlan.evidenceBoundaryLabel}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.postLaunchWatchPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.scholar + "30",
            },
          ]}
          testID="app-store-post-launch-watch-plan"
          accessibilityLabel={`${readiness.postLaunchWatchPlan.title}. ${readiness.postLaunchWatchPlan.statusLabel}. ${readiness.postLaunchWatchPlan.noSecretBoundaryLabel}`}
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="activity" size={17} color={theme.scholar} />
            <ThemedText type="h4">
              {readiness.postLaunchWatchPlan.title}
            </ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            {readiness.postLaunchWatchPlan.summaryLabel}
          </ThemedText>
          <View style={styles.postLaunchBoundaryGrid}>
            <DecisionProofLine
              icon="clock"
              value={readiness.postLaunchWatchPlan.cadenceLabel}
              color={theme.primary}
            />
            <DecisionProofLine
              icon="lock"
              value={readiness.postLaunchWatchPlan.noSecretBoundaryLabel}
              color={theme.scholar}
            />
            <DecisionProofLine
              icon="alert-triangle"
              value={readiness.postLaunchWatchPlan.holdLaunchBoundaryLabel}
              color={theme.error}
            />
          </View>
          <View style={styles.postLaunchTaskList}>
            {readiness.postLaunchWatchPlan.tasks.map((task) => {
              const color =
                task.tone === "danger"
                  ? theme.error
                  : task.tone === "scholar"
                    ? theme.scholar
                    : theme.primary;
              return (
                <View
                  key={task.id}
                  style={[
                    styles.postLaunchTaskRow,
                    {
                      backgroundColor: `${color}0A`,
                      borderColor: `${color}24`,
                    },
                  ]}
                  testID={`app-store-post-launch-watch-${task.id}`}
                >
                  <View
                    style={[
                      styles.postLaunchTaskIcon,
                      { backgroundColor: `${color}14` },
                    ]}
                  >
                    <AppIcon name={task.icon} size={15} color={color} />
                  </View>
                  <View style={styles.postLaunchTaskCopy}>
                    <View style={styles.postLaunchTaskTopLine}>
                      <ThemedText type="small" numberOfLines={1}>
                        {task.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color, fontWeight: "900", flexShrink: 1 }}
                      >
                        {task.ownerLabel}
                      </ThemedText>
                    </View>
                    <MatrixLine
                      icon="bar-chart-2"
                      label="Signal"
                      value={task.signalLabel}
                      color={color}
                    />
                    <MatrixLine
                      icon="terminal"
                      label="Check"
                      value={task.commandLabel}
                      color={theme.primary}
                    />
                    <MatrixLine
                      icon="send"
                      label="Escalate"
                      value={task.escalationLabel}
                      color={theme.scholar}
                    />
                  </View>
                </View>
              );
            })}
          </View>
          <View
            style={[
              styles.postLaunchHoldBoundary,
              {
                backgroundColor: "rgba(248,113,113,0.08)",
                borderColor: "rgba(248,113,113,0.22)",
              },
            ]}
            testID="app-store-post-launch-hold-boundary"
          >
            <AppIcon name="pause-circle" size={14} color={theme.error} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, lineHeight: 18, flex: 1 }}
            >
              {readiness.postLaunchWatchPlan.holdLaunchBoundaryLabel}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.launchBlockerPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.error + "34",
            },
          ]}
          testID="app-store-launch-blocker-handoff"
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="unlock" size={17} color={theme.error} />
            <ThemedText type="h4">Launch blocker handoff</ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            Screenshots can be captured now, but these owner actions must pass
            before stronger launch claims are used.
          </ThemedText>
          <View style={styles.launchBlockerList}>
            {readiness.launchBlockerHandoff.map((blocker) => (
              <View
                key={blocker.id}
                style={[
                  styles.launchBlockerRow,
                  {
                    backgroundColor: "rgba(248,113,113,0.07)",
                    borderColor: "rgba(248,113,113,0.22)",
                  },
                ]}
                testID={`app-store-launch-blocker-${blocker.id}`}
              >
                <View
                  style={[
                    styles.launchBlockerIcon,
                    { backgroundColor: "rgba(248,113,113,0.12)" },
                  ]}
                >
                  <AppIcon name={blocker.icon} size={15} color={theme.error} />
                </View>
                <View style={styles.launchBlockerCopy}>
                  <View style={styles.launchBlockerMetaRow}>
                    <ThemedText type="small" numberOfLines={1}>
                      {blocker.title}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{
                        color: theme.error,
                        fontWeight: "900",
                        flexShrink: 1,
                      }}
                    >
                      {blocker.ownerLabel}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, lineHeight: 18 }}
                  >
                    {blocker.nextActionLabel}
                  </ThemedText>
                  <View style={styles.launchBlockerCommand}>
                    <AppIcon name="terminal" size={12} color={theme.scholar} />
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.scholar,
                        lineHeight: 17,
                        flex: 1,
                        fontWeight: "800",
                      }}
                    >
                      {blocker.proofCommandLabel}
                    </ThemedText>
                  </View>
                  <View
                    style={styles.launchBlockerAcceptance}
                    testID={`app-store-launch-blocker-acceptance-${blocker.id}`}
                  >
                    <View style={styles.launchBlockerAcceptanceHeader}>
                      <AppIcon
                        name="check-circle"
                        size={12}
                        color={theme.success}
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color: theme.success,
                          fontWeight: "900",
                        }}
                      >
                        ACCEPTANCE
                      </ThemedText>
                    </View>
                    {blocker.acceptanceChecklist.map((item) => (
                      <View
                        key={item}
                        style={styles.launchBlockerAcceptanceItem}
                      >
                        <View
                          style={[
                            styles.launchBlockerAcceptanceDot,
                            { backgroundColor: theme.success },
                          ]}
                        />
                        <ThemedText
                          type="caption"
                          style={{
                            color: theme.textSecondary,
                            lineHeight: 17,
                            flex: 1,
                          }}
                        >
                          {item}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                  <View style={styles.launchBlockerBoundary}>
                    <AppIcon name="shield" size={12} color={theme.primary} />
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.textMuted,
                        lineHeight: 17,
                        flex: 1,
                      }}
                    >
                      {blocker.evidenceBoundaryLabel}{" "}
                      {blocker.noSecretBoundaryLabel}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.releaseEvidenceIntakePanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.scholar + "34",
            },
          ]}
          testID="app-store-release-evidence-intake"
          accessibilityLabel={`${readiness.releaseEvidenceIntakePacket.title}. ${readiness.releaseEvidenceIntakePacket.statusLabel}. ${readiness.releaseEvidenceIntakePacket.noSecretBoundaryLabel}`}
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="file-text" size={17} color={theme.scholar} />
            <View style={styles.releaseEvidenceHeaderCopy}>
              <ThemedText
                type="caption"
                style={[styles.eyebrow, { color: theme.scholar }]}
              >
                RELEASE EVIDENCE
              </ThemedText>
              <ThemedText type="h4">Release evidence intake packet</ThemedText>
            </View>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            {readiness.releaseEvidenceIntakePacket.summaryLabel}
          </ThemedText>
          <View style={styles.releaseEvidenceBoundaryGrid}>
            <DecisionProofLine
              icon="clipboard"
              value={readiness.releaseEvidenceIntakePacket.schemaBoundaryLabel}
              color={theme.primary}
            />
            <DecisionProofLine
              icon="user-check"
              value={readiness.releaseEvidenceIntakePacket.ownerBoundaryLabel}
              color={theme.scholar}
            />
            <DecisionProofLine
              icon="lock"
              value={
                readiness.releaseEvidenceIntakePacket.noSecretBoundaryLabel
              }
              color={theme.error}
            />
          </View>
          <View style={styles.releaseEvidenceIntakeList}>
            {readiness.releaseEvidenceIntakePacket.rows.map((row) => {
              const color =
                row.tone === "danger"
                  ? theme.error
                  : row.tone === "scholar"
                    ? theme.scholar
                    : theme.primary;
              return (
                <View
                  key={row.id}
                  style={[
                    styles.releaseEvidenceIntakeRow,
                    {
                      backgroundColor: `${color}0A`,
                      borderColor: `${color}24`,
                    },
                  ]}
                  testID={`app-store-release-evidence-intake-${row.id}`}
                >
                  <View
                    style={[
                      styles.releaseEvidenceIntakeIcon,
                      { backgroundColor: `${color}14` },
                    ]}
                  >
                    <AppIcon name={row.icon} size={15} color={color} />
                  </View>
                  <View style={styles.releaseEvidenceIntakeCopy}>
                    <View style={styles.releaseEvidenceIntakeTopLine}>
                      <ThemedText type="small" numberOfLines={1}>
                        {row.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color, fontWeight: "900", flexShrink: 1 }}
                      >
                        {row.ownerLabel}
                      </ThemedText>
                    </View>
                    <MatrixLine
                      icon="shield"
                      label="Gate"
                      value={row.gateLabel}
                      color={color}
                    />
                    <MatrixLine
                      icon="terminal"
                      label="Command"
                      value={row.requiredCommandLabel}
                      color={theme.scholar}
                    />
                    <MatrixLine
                      icon="clipboard"
                      label="Record"
                      value={row.evidenceRecordLabel}
                      color={theme.primary}
                    />
                    <MatrixLine
                      icon="edit-3"
                      label="Notes"
                      value={row.nonSecretNotesPrompt}
                      color={color}
                    />
                    <View
                      style={[
                        styles.releaseEvidenceSecretBoundary,
                        {
                          backgroundColor: "rgba(248,113,113,0.07)",
                          borderColor: "rgba(248,113,113,0.22)",
                        },
                      ]}
                      testID={`app-store-release-evidence-no-secret-${row.id}`}
                    >
                      <AppIcon name="lock" size={12} color={theme.error} />
                      <ThemedText
                        type="caption"
                        numberOfLines={2}
                        style={{
                          color: theme.textMuted,
                          lineHeight: 17,
                          flex: 1,
                        }}
                      >
                        {row.noSecretBoundaryLabel}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.captureSessionPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.scholar + "32",
            },
          ]}
          testID="app-store-capture-session-plan"
        >
          <View style={styles.captureSessionHeader}>
            <View
              style={[
                styles.captureSessionIcon,
                { backgroundColor: "rgba(255,212,107,0.13)" },
              ]}
            >
              <AppIcon name="target" size={18} color={theme.scholar} />
            </View>
            <View style={styles.captureSessionCopy}>
              <ThemedText type="h4">
                {readiness.captureSessionPlan.title}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={2}
                style={{ color: theme.textMuted, lineHeight: 17 }}
              >
                {readiness.captureSessionPlan.sessionBoundaryLabel}
              </ThemedText>
            </View>
            <View
              style={[
                styles.captureSessionBadge,
                { borderColor: theme.primaryBorder },
              ]}
            >
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: theme.primary, fontWeight: "900" }}
              >
                {readiness.captureSessionPlan.estimatedMinutesLabel}
              </ThemedText>
            </View>
          </View>
          <View style={styles.captureSessionNextRow}>
            <View style={styles.captureSessionNextCopy}>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Next capture
              </ThemedText>
              <ThemedText type="h4" numberOfLines={1}>
                {readiness.captureSessionPlan.nextSceneTitle}
              </ThemedText>
            </View>
            <Pressable
              onPress={() =>
                navigation.navigate(
                  readiness.captureSessionPlan.nextSceneRouteName,
                )
              }
              style={({ pressed }) => [
                styles.captureSessionAction,
                {
                  backgroundColor: theme.primarySubtle,
                  borderColor: theme.primaryBorder,
                },
                pressed
                  ? { opacity: 0.82, transform: [{ scale: 0.99 }] }
                  : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Open next App Store capture scene. ${readiness.captureSessionPlan.nextSceneActionLabel}`}
              testID="button-app-store-open-next-capture"
            >
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: theme.primary, fontWeight: "900" }}
              >
                {readiness.captureSessionPlan.nextSceneActionLabel}
              </ThemedText>
              <AppIcon name="arrow-right" size={14} color={theme.primary} />
            </Pressable>
          </View>
          <View style={styles.captureSessionBoundaryGrid}>
            <DecisionProofLine
              icon="lock"
              value={readiness.captureSessionPlan.privacyBoundaryLabel}
              color={theme.primary}
            />
            <DecisionProofLine
              icon="refresh-cw"
              value={readiness.captureSessionPlan.retakeBoundaryLabel}
              color={theme.error}
            />
          </View>
          <View style={styles.captureSessionBatchList}>
            {readiness.captureSessionPlan.batches.map((batch) => (
              <View
                key={batch.deviceFrame}
                style={[
                  styles.captureSessionBatch,
                  {
                    backgroundColor: "rgba(255,212,107,0.08)",
                    borderColor: "rgba(255,212,107,0.22)",
                  },
                ]}
                testID={`app-store-capture-session-batch-${batch.deviceFrame}`}
              >
                <AppIcon name="smartphone" size={14} color={theme.scholar} />
                <View style={styles.captureSessionBatchCopy}>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: theme.scholar, fontWeight: "900" }}
                  >
                    {batch.deviceFrame} · {batch.sceneCount} scene
                    {batch.sceneCount === 1 ? "" : "s"}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textSecondary, lineHeight: 17 }}
                  >
                    Start with {batch.firstSceneTitle}.{" "}
                    {batch.captureBoundaryLabel}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.storyArc,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="film" size={17} color={theme.scholar} />
            <ThemedText type="h4">Screenshot story arc</ThemedText>
          </View>
          <View style={styles.storyArcRow}>
            {readiness.storyArc.map((step, index) => (
              <View
                key={step}
                style={[
                  styles.storyArcStep,
                  {
                    backgroundColor:
                      index === 0 ? `${theme.primary}12` : "transparent",
                    borderColor:
                      index === 0 ? `${theme.primary}30` : theme.borderSubtle,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: index === 0 ? theme.primary : theme.textSecondary,
                    fontWeight: "900",
                  }}
                >
                  {index + 1}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.text, lineHeight: 17, flex: 1 }}
                >
                  {step}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.qaGatePanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.scholar + "32",
            },
          ]}
          testID="app-store-screenshot-qa-gates"
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="aperture" size={17} color={theme.scholar} />
            <ThemedText type="h4">Screenshot QA gates</ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            Pass these checks before keeping a capture. They protect the store
            story from empty states, private data, and trust overclaims.
          </ThemedText>
          <View style={styles.qaGateList}>
            {readiness.captureQualityGates.map((gate) => {
              const color =
                gate.tone === "danger"
                  ? theme.error
                  : gate.tone === "scholar"
                    ? theme.scholar
                    : theme.primary;
              return (
                <View
                  key={gate.id}
                  style={[
                    styles.qaGateRow,
                    {
                      backgroundColor: `${color}0D`,
                      borderColor: `${color}30`,
                    },
                  ]}
                  testID={`app-store-qa-gate-${gate.id}`}
                >
                  <View
                    style={[
                      styles.qaGateIcon,
                      { backgroundColor: `${color}18` },
                    ]}
                  >
                    <AppIcon name={gate.icon} size={15} color={color} />
                  </View>
                  <View style={styles.qaGateCopy}>
                    <View style={styles.qaGateTopLine}>
                      <ThemedText type="small" numberOfLines={1}>
                        {gate.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color, fontWeight: "900" }}
                      >
                        {gate.passLabel}
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color: theme.textMuted, lineHeight: 17 }}
                    >
                      {gate.detail}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color, lineHeight: 17, fontWeight: "800" }}
                    >
                      {gate.failState}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.screenshotReadinessPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.primaryBorder,
            },
          ]}
          testID="app-store-screenshot-readiness-contracts"
          accessibilityLabel={`Screenshot readiness contracts. ${readiness.screenshotReadinessContractCount} scene contracts mapped. ${readiness.releaseNote}`}
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="check-circle" size={17} color={theme.primary} />
            <ThemedText type="h4">Screenshot readiness contracts</ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            A per-scene capture contract that confirms viewport proof, trust
            boundaries, demo-safe state, route proof, and retake rules before a
            screenshot is exported.
          </ThemedText>
          <View style={styles.screenshotReadinessList}>
            {readiness.screenshotReadinessContracts.map((contract) => {
              const shot = APP_STORE_SHOWCASE_SCENES.find(
                (scene) => scene.id === contract.id,
              );
              const accent =
                shot?.accent === "scholar" ? theme.scholar : theme.primary;
              return (
                <View
                  key={contract.id}
                  style={[
                    styles.screenshotReadinessCard,
                    {
                      backgroundColor: `${accent}0A`,
                      borderColor: `${accent}24`,
                    },
                  ]}
                  testID={`app-store-screenshot-readiness-${contract.id}`}
                >
                  <View style={styles.screenshotReadinessTopLine}>
                    <View style={styles.screenshotReadinessTitleWrap}>
                      <ThemedText type="small" numberOfLines={1}>
                        {contract.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: theme.textMuted }}
                      >
                        {contract.priorityLabel} · {contract.routeName}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.screenshotReadinessStatusPill,
                        {
                          backgroundColor: `${accent}12`,
                          borderColor: `${accent}28`,
                        },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: accent, fontWeight: "900" }}
                      >
                        {contract.statusLabel}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.screenshotReadinessGrid}>
                    {contract.items.map((item) => {
                      const color =
                        item.tone === "danger"
                          ? theme.error
                          : item.tone === "scholar"
                            ? theme.scholar
                            : theme.primary;
                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.screenshotReadinessItem,
                            {
                              backgroundColor: `${color}0A`,
                              borderColor: item.complete
                                ? `${color}24`
                                : `${theme.error}30`,
                            },
                          ]}
                          testID={`app-store-screenshot-readiness-${contract.id}-${item.id}`}
                        >
                          <View style={styles.screenshotReadinessItemHeader}>
                            <AppIcon
                              name={
                                item.complete ? "check-circle" : "alert-circle"
                              }
                              size={12}
                              color={item.complete ? color : theme.error}
                            />
                            <ThemedText
                              type="caption"
                              numberOfLines={1}
                              style={{
                                color: item.complete ? color : theme.error,
                                fontWeight: "900",
                                flex: 1,
                              }}
                            >
                              {item.label}
                            </ThemedText>
                          </View>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{
                              color: theme.textSecondary,
                              lineHeight: 17,
                            }}
                          >
                            {item.evidenceLabel}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={2}
                            style={{ color: theme.textMuted, lineHeight: 17 }}
                          >
                            {item.boundaryLabel}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </View>
                  <View
                    style={[
                      styles.screenshotReadinessBoundary,
                      {
                        backgroundColor: "rgba(248,113,113,0.07)",
                        borderColor: "rgba(248,113,113,0.22)",
                      },
                    ]}
                  >
                    <AppIcon name="shield" size={13} color={theme.error} />
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.textSecondary,
                        lineHeight: 18,
                        flex: 1,
                      }}
                    >
                      {contract.boundaryLabel}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: accent, lineHeight: 18, fontWeight: "900" }}
                  >
                    {contract.nextActionLabel}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.captureMatrixPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.primaryBorder,
            },
          ]}
          testID="app-store-capture-status-matrix"
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="grid" size={17} color={theme.primary} />
            <ThemedText type="h4">Capture status matrix</ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            Use this as the shot list before opening scenes: priority, device
            frame, route, first-viewport proof, trust boundary, and retake risk
            must all be clear.
          </ThemedText>
          <View style={styles.captureMatrixList}>
            {readiness.captureMatrix.map((row) => {
              const shot = APP_STORE_SHOWCASE_SCENES.find(
                (scene) => scene.id === row.id,
              );
              const accent =
                shot?.accent === "scholar" ? theme.scholar : theme.primary;
              return (
                <View
                  key={row.id}
                  style={[
                    styles.captureMatrixRow,
                    {
                      backgroundColor: `${accent}0A`,
                      borderColor: `${accent}24`,
                    },
                  ]}
                  testID={`app-store-capture-matrix-${row.id}`}
                >
                  <View
                    style={[
                      styles.captureMatrixNumber,
                      {
                        backgroundColor: `${accent}14`,
                        borderColor: `${accent}30`,
                      },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{ color: accent, fontWeight: "900" }}
                    >
                      {row.priority}
                    </ThemedText>
                  </View>
                  <View style={styles.captureMatrixCopy}>
                    <View style={styles.captureMatrixTopLine}>
                      <ThemedText type="small" numberOfLines={1}>
                        {row.title}
                      </ThemedText>
                      <View
                        style={[
                          styles.captureMatrixRoutePill,
                          {
                            backgroundColor: `${accent}12`,
                            borderColor: `${accent}28`,
                          },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: accent, fontWeight: "900" }}
                        >
                          {row.routeName}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.captureMatrixMeta}>
                      <AppIcon name="smartphone" size={12} color={accent} />
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: theme.textMuted, flex: 1 }}
                      >
                        {row.deviceFrame}
                      </ThemedText>
                    </View>
                    <MatrixLine
                      icon="eye"
                      label="First viewport"
                      value={row.firstViewportSignal}
                      color={accent}
                    />
                    <MatrixLine
                      icon="shield"
                      label="Boundary"
                      value={row.trustBoundary}
                      color={theme.scholar}
                    />
                    <MatrixLine
                      icon="refresh-cw"
                      label="Retake"
                      value={row.retakeRisk}
                      color={theme.error}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.demoSafetyPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.scholar + "32",
            },
          ]}
          testID="app-store-demo-data-safety-ledger"
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="lock" size={17} color={theme.scholar} />
            <ThemedText type="h4">Demo data safety ledger</ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            Every screenshot needs an approved demo state and a never-show
            boundary before capture. This prevents private data, overclaims, and
            accidental authority signals from entering App Store assets.
          </ThemedText>
          <View style={styles.demoSafetyList}>
            {readiness.demoDataSafetyRules.map((rule) => {
              const shot = APP_STORE_SHOWCASE_SCENES.find(
                (scene) => scene.id === rule.id,
              );
              const accent =
                shot?.accent === "scholar" ? theme.scholar : theme.primary;
              return (
                <View
                  key={rule.id}
                  style={[
                    styles.demoSafetyRow,
                    {
                      backgroundColor: `${accent}0A`,
                      borderColor: `${accent}24`,
                    },
                  ]}
                  testID={`app-store-demo-safety-${rule.id}`}
                >
                  <View
                    style={[
                      styles.demoSafetyIcon,
                      { backgroundColor: `${accent}14` },
                    ]}
                  >
                    <AppIcon name={rule.icon} size={14} color={accent} />
                  </View>
                  <View style={styles.demoSafetyCopy}>
                    <View style={styles.demoSafetyTopLine}>
                      <ThemedText type="small" numberOfLines={1}>
                        {rule.title}
                      </ThemedText>
                      <View
                        style={[
                          styles.demoSafetyRoutePill,
                          {
                            backgroundColor: `${accent}12`,
                            borderColor: `${accent}28`,
                          },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: accent, fontWeight: "900" }}
                        >
                          {rule.routeName}
                        </ThemedText>
                      </View>
                    </View>
                    <MatrixLine
                      icon="check-circle"
                      label="Approved"
                      value={rule.approvedDemoStateLabel}
                      color={theme.primary}
                    />
                    <MatrixLine
                      icon="slash"
                      label="Never show"
                      value={rule.neverShowLabel}
                      color={theme.error}
                    />
                    <MatrixLine
                      icon="eye"
                      label="Pre-capture"
                      value={rule.preCaptureCheckLabel}
                      color={accent}
                    />
                    <MatrixLine
                      icon="refresh-cw"
                      label="Retake"
                      value={rule.retakeIfLabel}
                      color={theme.scholar}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.claimSafetyPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.primaryBorder,
            },
          ]}
          testID="app-store-claim-safety-receipts"
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="check-square" size={17} color={theme.primary} />
            <ThemedText type="h4">Claim safety receipts</ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            Each screenshot gets a public claim, visible proof requirement, and
            blocked wording before it leaves the app as App Store material.
          </ThemedText>
          <View style={styles.claimSafetyList}>
            {readiness.claimSafetyReceipts.map((receipt) => {
              const accent =
                receipt.tone === "scholar" ? theme.scholar : theme.primary;
              return (
                <View
                  key={receipt.id}
                  style={[
                    styles.claimSafetyRow,
                    {
                      backgroundColor: `${accent}0A`,
                      borderColor: `${accent}24`,
                    },
                  ]}
                  testID={`app-store-claim-safety-${receipt.id}`}
                >
                  <View
                    style={[
                      styles.claimSafetyIcon,
                      { backgroundColor: `${accent}14` },
                    ]}
                  >
                    <AppIcon name={receipt.icon} size={14} color={accent} />
                  </View>
                  <View style={styles.claimSafetyCopy}>
                    <View style={styles.claimSafetyTopLine}>
                      <ThemedText type="small" numberOfLines={1}>
                        {receipt.title}
                      </ThemedText>
                      <View
                        style={[
                          styles.demoSafetyRoutePill,
                          {
                            backgroundColor: `${accent}12`,
                            borderColor: `${accent}28`,
                          },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: accent, fontWeight: "900" }}
                        >
                          receipt
                        </ThemedText>
                      </View>
                    </View>
                    <MatrixLine
                      icon="message-square"
                      label="Public claim"
                      value={receipt.publicClaimLabel}
                      color={accent}
                    />
                    <MatrixLine
                      icon="eye"
                      label="Evidence"
                      value={receipt.evidenceStateLabel}
                      color={theme.primary}
                    />
                    <MatrixLine
                      icon="shield"
                      label="Boundary"
                      value={receipt.sourceBoundaryLabel}
                      color={theme.scholar}
                    />
                    <MatrixLine
                      icon="slash"
                      label="Blocked"
                      value={receipt.blockedClaimLabel}
                      color={theme.error}
                    />
                    <MatrixLine
                      icon="clipboard"
                      label="Approval"
                      value={receipt.approvalQuestion}
                      color={accent}
                    />
                    <MatrixLine
                      icon="lock"
                      label="Use"
                      value={receipt.releaseUseLabel}
                      color={theme.textMuted}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.listingMetadataPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.scholar + "32",
            },
          ]}
          testID="app-store-listing-metadata-pack"
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="file-text" size={17} color={theme.scholar} />
            <ThemedText type="h4">Store listing metadata pack</ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            App Store metadata, privacy labels, review notes, keywords, and
            localization stay tied to visible screenshots and release
            boundaries.
          </ThemedText>
          <View style={styles.listingMetadataBoundaryGrid}>
            <DecisionProofLine
              icon="lock"
              value={readiness.listingMetadataPack.releaseBoundaryLabel}
              color={theme.error}
            />
            <DecisionProofLine
              icon="shield"
              value={readiness.listingMetadataPack.reviewBoundaryLabel}
              color={theme.scholar}
            />
            <DecisionProofLine
              icon="globe"
              value={readiness.listingMetadataPack.localizationBoundaryLabel}
              color={theme.primary}
            />
          </View>
          <View style={styles.listingMetadataList}>
            {readiness.listingMetadataPack.sections.map((section) => {
              const accent =
                section.tone === "danger"
                  ? theme.error
                  : section.tone === "scholar"
                    ? theme.scholar
                    : theme.primary;
              return (
                <View
                  key={section.id}
                  style={[
                    styles.listingMetadataRow,
                    {
                      backgroundColor: `${accent}0A`,
                      borderColor: `${accent}24`,
                    },
                  ]}
                  testID={`app-store-listing-metadata-${section.id}`}
                >
                  <View
                    style={[
                      styles.listingMetadataIcon,
                      { backgroundColor: `${accent}14` },
                    ]}
                  >
                    <AppIcon name={section.icon} size={14} color={accent} />
                  </View>
                  <View style={styles.listingMetadataCopy}>
                    <View style={styles.listingMetadataTopLine}>
                      <ThemedText type="small" numberOfLines={1}>
                        {section.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: accent, fontWeight: "900" }}
                      >
                        {section.valueLabel}
                      </ThemedText>
                    </View>
                    <MatrixLine
                      icon="eye"
                      label="Detail"
                      value={section.detail}
                      color={accent}
                    />
                    <MatrixLine
                      icon="check-circle"
                      label="Approval"
                      value={section.approvalQuestion}
                      color={theme.primary}
                    />
                    <MatrixLine
                      icon="slash"
                      label="Blocked"
                      value={section.blockedLanguageLabel}
                      color={theme.error}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.reviewerNotePanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.primaryBorder,
            },
          ]}
          testID="app-store-reviewer-note-packet"
          accessibilityLabel={`${readiness.reviewerNotePacket.title}. ${readiness.reviewerNotePacket.statusLabel}. ${readiness.reviewerNotePacket.noSecretBoundaryLabel}`}
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="clipboard" size={17} color={theme.primary} />
            <ThemedText type="h4">App Review notes packet</ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            {readiness.reviewerNotePacket.introLabel}
          </ThemedText>
          <View style={styles.reviewerNoteBoundaryGrid}>
            <DecisionProofLine
              icon="shield"
              value={readiness.reviewerNotePacket.aiBoundaryLabel}
              color={theme.scholar}
            />
            <DecisionProofLine
              icon="lock"
              value={readiness.reviewerNotePacket.privacyBoundaryLabel}
              color={theme.primary}
            />
            <DecisionProofLine
              icon="slash"
              value={readiness.reviewerNotePacket.noSecretBoundaryLabel}
              color={theme.error}
            />
          </View>
          <View style={styles.reviewerNoteList}>
            {readiness.reviewerNotePacket.sections.map((section) => {
              const accent =
                section.tone === "danger"
                  ? theme.error
                  : section.tone === "scholar"
                    ? theme.scholar
                    : theme.primary;
              return (
                <View
                  key={section.id}
                  style={[
                    styles.reviewerNoteRow,
                    {
                      backgroundColor: `${accent}0A`,
                      borderColor: `${accent}24`,
                    },
                  ]}
                  testID={`app-store-reviewer-note-${section.id}`}
                >
                  <View
                    style={[
                      styles.reviewerNoteIcon,
                      { backgroundColor: `${accent}14` },
                    ]}
                  >
                    <AppIcon name={section.icon} size={14} color={accent} />
                  </View>
                  <View style={styles.reviewerNoteCopy}>
                    <View style={styles.reviewerNoteTopLine}>
                      <ThemedText type="small" numberOfLines={1}>
                        {section.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: accent, fontWeight: "900" }}
                      >
                        reviewer note
                      </ThemedText>
                    </View>
                    <MatrixLine
                      icon="message-square"
                      label="Note"
                      value={section.reviewerFacingNote}
                      color={accent}
                    />
                    <MatrixLine
                      icon="eye"
                      label="Evidence"
                      value={section.evidenceLabel}
                      color={theme.primary}
                    />
                    <MatrixLine
                      icon="slash"
                      label="Do not include"
                      value={section.doNotIncludeLabel}
                      color={theme.error}
                    />
                  </View>
                </View>
              );
            })}
          </View>
          <View
            style={[
              styles.reviewerNoteBlocked,
              {
                backgroundColor: "rgba(248,113,113,0.08)",
                borderColor: "rgba(248,113,113,0.22)",
              },
            ]}
            testID="app-store-reviewer-note-blocked-submission"
          >
            <AppIcon name="alert-triangle" size={14} color={theme.error} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, lineHeight: 18, flex: 1 }}
            >
              {readiness.reviewerNotePacket.blockedSubmissionLabel}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.capturePlanner,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.primaryBorder,
            },
          ]}
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="check-square" size={17} color={theme.primary} />
            <ThemedText type="h4">Capture planner</ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            {readiness.releaseNote}
          </ThemedText>
          <View style={styles.captureSpecGrid}>
            {readiness.captureSpecs.map((spec) => (
              <View
                key={spec}
                style={[
                  styles.captureSpecChip,
                  {
                    backgroundColor: `${theme.primary}0D`,
                    borderColor: `${theme.primary}24`,
                  },
                ]}
              >
                <AppIcon name="check" size={12} color={theme.primary} />
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.text }}
                >
                  {spec}
                </ThemedText>
              </View>
            ))}
          </View>
          <View style={styles.deviceFrameRow}>
            {readiness.requiredDeviceFrames.map((frame) => (
              <View
                key={frame}
                style={[
                  styles.deviceFrameChip,
                  {
                    backgroundColor: "rgba(255,212,107,0.08)",
                    borderColor: "rgba(255,212,107,0.22)",
                  },
                ]}
              >
                <AppIcon name="smartphone" size={12} color={theme.scholar} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.scholar, fontWeight: "800" }}
                >
                  {frame}
                </ThemedText>
              </View>
            ))}
          </View>
          <View style={styles.truthRules}>
            {readiness.truthRules.map((rule) => (
              <View key={rule} style={styles.truthRuleRow}>
                <AppIcon name="shield" size={13} color={theme.scholar} />
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    lineHeight: 18,
                    flex: 1,
                  }}
                >
                  {rule}
                </ThemedText>
              </View>
            ))}
          </View>
          <View style={styles.runbookList}>
            {readiness.captureRunbook.map((step, index) => (
              <View key={step} style={styles.runbookRow}>
                <View
                  style={[
                    styles.runbookNumber,
                    { borderColor: `${theme.primary}30` },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "900" }}
                  >
                    {index + 1}
                  </ThemedText>
                </View>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    lineHeight: 18,
                    flex: 1,
                  }}
                >
                  {step}
                </ThemedText>
              </View>
            ))}
          </View>
          <View style={styles.blockerRow}>
            {readiness.releaseBlockerLabels.map((blocker) => (
              <View
                key={blocker}
                style={[
                  styles.blockerChip,
                  {
                    backgroundColor: "rgba(248,113,113,0.08)",
                    borderColor: "rgba(248,113,113,0.24)",
                  },
                ]}
              >
                <AppIcon name="alert-triangle" size={11} color={theme.error} />
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: theme.error, fontWeight: "800" }}
                >
                  {blocker}
                </ThemedText>
              </View>
            ))}
          </View>
          <Pressable
            onPress={shareCaptureHandoff}
            style={({ pressed }) => [
              styles.captureHandoffAction,
              {
                backgroundColor: theme.primarySubtle,
                borderColor: theme.primaryBorder,
              },
              pressed ? { opacity: 0.82, transform: [{ scale: 0.99 }] } : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Share App Store screenshot capture handoff"
            accessibilityHint="Opens a share sheet with scenes, QA gates, retake rules, and release blocker boundaries"
            testID="button-app-store-share-capture-handoff"
          >
            <AppIcon name="share-2" size={15} color={theme.primary} />
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{ color: theme.primary, fontWeight: "900" }}
            >
              Share capture handoff
            </ThemedText>
          </Pressable>
        </View>

        <View
          style={[
            styles.proofLedgerPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.scholar + "30",
            },
          ]}
          testID="app-store-claim-proof-ledger"
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="clipboard" size={17} color={theme.scholar} />
            <ThemedText type="h4">Claim proof ledger</ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            Every screenshot must pair the public store promise with visible
            proof and a demo-safe state before it is kept.
          </ThemedText>
          <View style={styles.proofLedgerList}>
            {APP_STORE_SHOWCASE_SCENES.map((shot) => {
              const accent =
                shot.accent === "scholar" ? theme.scholar : theme.primary;
              return (
                <View
                  key={shot.id}
                  style={[
                    styles.proofLedgerRow,
                    {
                      backgroundColor: `${accent}0A`,
                      borderColor: `${accent}24`,
                    },
                  ]}
                  testID={`app-store-proof-ledger-${shot.id}`}
                >
                  <View
                    style={[
                      styles.proofLedgerIcon,
                      { backgroundColor: `${accent}14` },
                    ]}
                  >
                    <AppIcon name={shot.icon} size={14} color={accent} />
                  </View>
                  <View style={styles.proofLedgerCopy}>
                    <ThemedText type="small" numberOfLines={1}>
                      {shot.captureProof.storePromise}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color: theme.textSecondary, lineHeight: 17 }}
                    >
                      {shot.captureProof.validationQuestion}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.routeProofPanel,
            {
              backgroundColor: theme.surfaceGlassStrong,
              borderColor: theme.primaryBorder,
            },
          ]}
          testID="app-store-route-proof-ledger"
        >
          <View style={styles.capturePlannerHeader}>
            <AppIcon name="map-pin" size={17} color={theme.primary} />
            <ThemedText type="h4">Route proof ledger</ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            Each capture is tied to a registered screen, expected params, and a
            demo-safe state before it can become App Store material.
          </ThemedText>
          <View style={styles.routeProofList}>
            {readiness.captureRouteProofs.map((routeProof) => (
              <View
                key={routeProof.id}
                style={[
                  styles.routeProofRow,
                  {
                    backgroundColor: `${theme.primary}0A`,
                    borderColor: `${theme.primary}24`,
                  },
                ]}
                testID={`app-store-route-proof-${routeProof.id}`}
              >
                <View
                  style={[
                    styles.routeProofIcon,
                    { backgroundColor: `${theme.primary}14` },
                  ]}
                >
                  <AppIcon name="navigation" size={14} color={theme.primary} />
                </View>
                <View style={styles.routeProofCopy}>
                  <View style={styles.routeProofTopLine}>
                    <ThemedText type="small" numberOfLines={1}>
                      {routeProof.title}
                    </ThemedText>
                    <View
                      style={[
                        styles.routeProofPill,
                        {
                          backgroundColor: `${theme.primary}12`,
                          borderColor: `${theme.primary}28`,
                        },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: theme.primary, fontWeight: "900" }}
                      >
                        {routeProof.routeName}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textSecondary, lineHeight: 17 }}
                  >
                    Params: {routeProof.routeParamsLabel}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textMuted, lineHeight: 17 }}
                  >
                    Proof: {routeProof.screenEvidence}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.primary, lineHeight: 17 }}
                  >
                    Audit: {routeProof.auditQuestion}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.shotList}>
          {APP_STORE_SHOWCASE_SCENES.map((shot, index) => {
            const accent =
              shot.accent === "scholar" ? theme.scholar : theme.primary;
            const claimReceipt = readiness.claimSafetyReceipts.find(
              (receipt) => receipt.id === shot.id,
            );
            return (
              <Pressable
                key={shot.id}
                onPress={() => navigation.navigate(shot.route, shot.params)}
                style={({ pressed }) => [
                  styles.shotCard,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: `${accent}34`,
                  },
                  pressed
                    ? { opacity: 0.86, transform: [{ scale: 0.99 }] }
                    : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open ${shot.title} screenshot scene`}
                accessibilityHint={shot.captureLine}
                testID={`button-showcase-shot-${shot.id}`}
                hitSlop={6}
              >
                <View style={styles.phoneFrame}>
                  <LinearGradient
                    colors={[
                      `${accent}22`,
                      "rgba(255,255,255,0.035)",
                      "rgba(255,212,107,0.08)",
                    ]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.phoneStatus}>
                    <View
                      style={[styles.phoneDot, { backgroundColor: accent }]}
                    />
                    <View style={styles.phoneLine} />
                  </View>
                  <View
                    style={[styles.phoneHeroGlyph, { borderColor: accent }]}
                  >
                    <AppIcon name={shot.icon} size={28} color={accent} />
                  </View>
                  <View style={styles.phoneShotCopy}>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={[styles.phoneShotHeadline, { color: "#FFFFFF" }]}
                    >
                      {shot.screenshotHeadline}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={styles.phoneShotSubhead}
                    >
                      {shot.appStoreCaption}
                    </ThemedText>
                  </View>
                  <View style={styles.phoneTextStack}>
                    <View
                      style={[
                        styles.phoneTitleLine,
                        { backgroundColor: accent },
                      ]}
                    />
                    <View style={styles.phoneSubLine} />
                    <View style={styles.phoneSubLineShort} />
                  </View>
                  <View style={styles.phoneMiniGrid}>
                    {shot.proof.map((item) => (
                      <View key={item} style={styles.phoneMiniTile}>
                        <View
                          style={[
                            styles.phoneMiniTileGlow,
                            { backgroundColor: `${accent}44` },
                          ]}
                        />
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.shotCopy}>
                  <View style={styles.shotTopRow}>
                    <View
                      style={[
                        styles.shotNumber,
                        {
                          backgroundColor: `${accent}14`,
                          borderColor: `${accent}30`,
                        },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: accent, fontWeight: "900" }}
                      >
                        {index + 1}
                      </ThemedText>
                    </View>
                    <View style={styles.shotTitleWrap}>
                      <ThemedText type="h3" numberOfLines={2}>
                        {shot.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={2}
                        style={{ color: theme.textSecondary, lineHeight: 18 }}
                      >
                        {shot.caption}
                      </ThemedText>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.storeCaptionBox,
                      {
                        backgroundColor: "rgba(255,212,107,0.075)",
                        borderColor: "rgba(255,212,107,0.22)",
                      },
                    ]}
                  >
                    <View style={styles.storeCaptionHeader}>
                      <AppIcon
                        name="message-square"
                        size={12}
                        color={theme.scholar}
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color: theme.scholar,
                          fontWeight: "900",
                        }}
                      >
                        APP STORE LINE
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color: theme.text, lineHeight: 18 }}
                    >
                      {shot.appStoreCaption}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.claimProofBox,
                      {
                        backgroundColor: theme.surfaceGlassStrong,
                        borderColor: `${accent}24`,
                      },
                    ]}
                  >
                    <View style={styles.storeCaptionHeader}>
                      <AppIcon name="clipboard" size={12} color={accent} />
                      <ThemedText
                        type="caption"
                        style={{ color: accent, fontWeight: "900" }}
                      >
                        STORE CLAIM PROOF
                      </ThemedText>
                    </View>
                    <ProofLine
                      icon="eye"
                      label="Must show"
                      value={shot.captureProof.requiredVisualProof}
                      color={accent}
                    />
                    <ProofLine
                      icon="lock"
                      label="Demo-safe"
                      value={shot.captureProof.safeDemoState}
                      color={theme.primary}
                    />
                    <ProofLine
                      icon="refresh-cw"
                      label="Retake if"
                      value={shot.captureProof.retakeIf}
                      color={theme.error}
                    />
                  </View>
                  {claimReceipt ? (
                    <View
                      style={[
                        styles.claimReceiptBox,
                        {
                          backgroundColor: `${accent}0A`,
                          borderColor: `${accent}24`,
                        },
                      ]}
                      testID={`app-store-shot-claim-receipt-${shot.id}`}
                    >
                      <View style={styles.storeCaptionHeader}>
                        <AppIcon name="check-square" size={12} color={accent} />
                        <ThemedText
                          type="caption"
                          style={{ color: accent, fontWeight: "900" }}
                        >
                          CLAIM SAFETY RECEIPT
                        </ThemedText>
                      </View>
                      <ProofLine
                        icon="slash"
                        label="Blocked"
                        value={claimReceipt.blockedClaimLabel}
                        color={theme.error}
                      />
                      <ProofLine
                        icon="lock"
                        label="Release use"
                        value={claimReceipt.releaseUseLabel}
                        color={theme.textMuted}
                      />
                    </View>
                  ) : null}
                  <View style={styles.proofRow}>
                    {shot.proof.map((proof) => (
                      <View
                        key={proof}
                        style={[
                          styles.proofChip,
                          {
                            backgroundColor: `${accent}10`,
                            borderColor: `${accent}24`,
                          },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: accent, fontWeight: "800" }}
                        >
                          {proof}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                  <View
                    style={[
                      styles.captureLineBox,
                      {
                        backgroundColor: `${accent}0D`,
                        borderColor: `${accent}24`,
                      },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{
                        color: accent,
                        fontWeight: "900",
                        lineHeight: 17,
                      }}
                    >
                      {shot.screenshotHeadline}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color: theme.text, lineHeight: 18 }}
                    >
                      {shot.screenshotSubhead}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{ color: theme.textSecondary, lineHeight: 17 }}
                    >
                      {shot.captureLine}
                    </ThemedText>
                  </View>
                  <View style={styles.signalGrid}>
                    <View
                      style={[
                        styles.signalPill,
                        {
                          borderColor: theme.borderSubtle,
                          backgroundColor: theme.surfaceGlassStrong,
                        },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textMuted, fontWeight: "800" }}
                      >
                        Audience
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: theme.text }}
                      >
                        {shot.audience}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.signalPill,
                        {
                          borderColor: `${accent}26`,
                          backgroundColor: `${accent}0A`,
                        },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: accent, fontWeight: "800" }}
                      >
                        Trust signal
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        numberOfLines={2}
                        style={{ color: theme.text }}
                      >
                        {shot.trustSignal}
                      </ThemedText>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.captureRunbookBox,
                      {
                        backgroundColor: `${accent}0A`,
                        borderColor: `${accent}24`,
                      },
                    ]}
                  >
                    <View style={styles.captureRunbookRow}>
                      <AppIcon name="smartphone" size={12} color={accent} />
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: theme.text, flex: 1 }}
                      >
                        Capture frame: {shot.deviceFrame}
                      </ThemedText>
                    </View>
                    <View style={styles.captureRunbookRow}>
                      <AppIcon name="eye" size={12} color={accent} />
                      <ThemedText
                        type="caption"
                        numberOfLines={2}
                        style={{ color: theme.textSecondary, flex: 1 }}
                      >
                        {shot.firstViewportSignal}
                      </ThemedText>
                    </View>
                    <View style={styles.captureRunbookRow}>
                      <AppIcon name="sliders" size={12} color={accent} />
                      <ThemedText
                        type="caption"
                        numberOfLines={2}
                        style={{ color: theme.textSecondary, flex: 1 }}
                      >
                        {shot.captureStateLabel}
                      </ThemedText>
                    </View>
                    <View style={styles.captureRunbookRow}>
                      <AppIcon name="shield" size={12} color={theme.scholar} />
                      <ThemedText
                        type="caption"
                        numberOfLines={2}
                        style={{ color: theme.textSecondary, flex: 1 }}
                      >
                        {shot.blockerGuardrail}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.checklistColumn}>
                    {shot.captureChecklist.map((item) => (
                      <View key={item} style={styles.checklistRow}>
                        <AppIcon name="check-circle" size={12} color={accent} />
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{ color: theme.textMuted, flex: 1 }}
                        >
                          {item}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                  <View style={styles.openRow}>
                    <ThemedText
                      type="caption"
                      style={{ color: accent, fontWeight: "900" }}
                    >
                      {shot.primaryActionLabel}
                    </ThemedText>
                    <AppIcon name="arrow-right" size={16} color={accent} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  function ReadinessTile({
    icon,
    label,
    value,
    color,
  }: {
    icon: AppIconName;
    label: string;
    value: string;
    color: string;
  }) {
    return (
      <View
        style={[
          styles.readinessTile,
          {
            backgroundColor: theme.surfaceGlassStrong,
            borderColor: `${color}28`,
          },
        ]}
      >
        <AppIcon name={icon} size={15} color={color} />
        <ThemedText type="h3" style={{ color: theme.text }}>
          {value}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textMuted }}>
          {label}
        </ThemedText>
      </View>
    );
  }

  function CaptureCommand({
    icon,
    title,
    subtitle,
    meta,
    color,
    onPress,
    testID,
  }: {
    icon: AppIconName;
    title: string;
    subtitle: string;
    meta: string;
    color: string;
    onPress: () => void;
    testID: string;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.captureCommandTile,
          {
            backgroundColor: `${color}0D`,
            borderColor: `${color}30`,
          },
          pressed ? { opacity: 0.84, transform: [{ scale: 0.99 }] } : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}. ${meta}`}
        testID={testID}
      >
        <View
          style={[
            styles.captureCommandTileIcon,
            { backgroundColor: `${color}16` },
          ]}
        >
          <AppIcon name={icon} size={15} color={color} />
        </View>
        <View style={styles.captureCommandTileCopy}>
          <ThemedText type="small" numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText
            type="caption"
            numberOfLines={2}
            style={{ color: theme.textSecondary, lineHeight: 17 }}
          >
            {subtitle}
          </ThemedText>
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={{ color, fontWeight: "900" }}
          >
            {meta}
          </ThemedText>
        </View>
        <AppIcon name="arrow-right" size={14} color={color} />
      </Pressable>
    );
  }

  function ProofLine({
    icon,
    label,
    value,
    color,
  }: {
    icon: AppIconName;
    label: string;
    value: string;
    color: string;
  }) {
    return (
      <View style={styles.proofLine}>
        <AppIcon name={icon} size={12} color={color} />
        <ThemedText
          type="caption"
          numberOfLines={1}
          style={{ color, fontWeight: "800", minWidth: 66 }}
        >
          {label}
        </ThemedText>
        <ThemedText
          type="caption"
          numberOfLines={2}
          style={{ color: theme.textSecondary, lineHeight: 17, flex: 1 }}
        >
          {value}
        </ThemedText>
      </View>
    );
  }

  function MatrixLine({
    icon,
    label,
    value,
    color,
  }: {
    icon: AppIconName;
    label: string;
    value: string;
    color: string;
  }) {
    return (
      <View style={styles.matrixLine}>
        <AppIcon name={icon} size={12} color={color} />
        <ThemedText
          type="caption"
          numberOfLines={1}
          style={{ color, fontWeight: "800", minWidth: 88 }}
        >
          {label}
        </ThemedText>
        <ThemedText
          type="caption"
          numberOfLines={2}
          style={{ color: theme.textSecondary, lineHeight: 17, flex: 1 }}
        >
          {value}
        </ThemedText>
      </View>
    );
  }

  function DecisionProofLine({
    icon,
    value,
    color,
  }: {
    icon: AppIconName;
    value: string;
    color: string;
  }) {
    return (
      <View
        style={[
          styles.captureDecisionProofLine,
          {
            backgroundColor: `${color}0D`,
            borderColor: `${color}28`,
          },
        ]}
      >
        <AppIcon name={icon} size={13} color={color} />
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, lineHeight: 18, flex: 1 }}
        >
          {value}
        </ThemedText>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    minHeight: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.26)",
    backgroundColor: "rgba(255,212,107,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  hero: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.24)",
    padding: Spacing.xl,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.24)",
    backgroundColor: "rgba(255,212,107,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 1.6,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 38,
    lineHeight: 44,
  },
  heroDivider: {
    marginVertical: Spacing.lg,
  },
  heroBody: {
    color: "rgba(255,255,255,0.76)",
    lineHeight: 24,
  },
  captureCommandRail: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  captureCommandHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  captureCommandHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  captureCommandHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  captureCommandGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  captureCommandTile: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 112,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  captureCommandTileIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  captureCommandTileCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  readinessGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  readinessTile: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 94,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    justifyContent: "space-between",
  },
  screenshotProofPackPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  screenshotProofBoundaryGrid: {
    gap: Spacing.sm,
  },
  screenshotProofSceneList: {
    gap: Spacing.sm,
  },
  screenshotProofSceneRow: {
    minHeight: 176,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  screenshotProofSceneIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  screenshotProofSceneCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  screenshotProofSceneTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  screenshotProofRetakeBoundary: {
    minHeight: 46,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  submissionPassportPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  submissionPassportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  submissionPassportIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  submissionPassportCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  submissionPassportRows: {
    gap: Spacing.sm,
  },
  submissionPassportRow: {
    minHeight: 96,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  submissionPassportRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submissionPassportRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  submissionPassportTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  submissionPassportBoundaryGrid: {
    gap: Spacing.sm,
  },
  captureDecisionPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  captureDecisionStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  captureDecisionStatus: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  captureDecisionProofGrid: {
    gap: Spacing.sm,
  },
  captureDecisionProofLine: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  platformAssetPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  platformAssetList: {
    gap: Spacing.sm,
  },
  platformAssetRow: {
    minHeight: 172,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  platformAssetIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  platformAssetCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  platformAssetTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  platformAssetSourceLedger: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: 6,
  },
  platformAssetQuestionList: {
    gap: Spacing.sm,
  },
  platformAssetQuestion: {
    minHeight: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  launchBlockerPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  launchEvidenceSprintPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  launchEvidenceSprintStatus: {
    gap: Spacing.sm,
  },
  launchEvidenceSprintTaskList: {
    gap: Spacing.sm,
  },
  launchEvidenceSprintTask: {
    minHeight: 118,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  launchEvidenceSprintIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  launchEvidenceSprintCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  launchEvidenceSprintTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  launchEvidenceSprintBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  releaseBlockerResolutionPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  releaseBlockerResolutionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  releaseBlockerResolutionTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  releaseBlockerResolutionShareButton: {
    width: 38,
    height: 38,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  releaseBlockerResolutionBoundaryGrid: {
    gap: Spacing.sm,
  },
  releaseBlockerResolutionList: {
    gap: Spacing.sm,
  },
  releaseBlockerResolutionRow: {
    minHeight: 148,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  releaseBlockerResolutionIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  releaseBlockerResolutionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  releaseBlockerResolutionTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  releaseBlockerResolutionSecretBoundary: {
    minHeight: 38,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  releaseBlockerResolutionBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  maintainabilityRunwayPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  maintainabilityBoundaryGrid: {
    gap: Spacing.sm,
  },
  maintainabilitySliceList: {
    gap: Spacing.sm,
  },
  maintainabilitySliceRow: {
    minHeight: 132,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  maintainabilitySliceIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  maintainabilitySliceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  maintainabilitySliceTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  maintainabilityPolicy: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  postLaunchWatchPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  postLaunchBoundaryGrid: {
    gap: Spacing.sm,
  },
  postLaunchTaskList: {
    gap: Spacing.sm,
  },
  postLaunchTaskRow: {
    minHeight: 136,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  postLaunchTaskIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  postLaunchTaskCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  postLaunchTaskTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  postLaunchHoldBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  launchBlockerList: {
    gap: Spacing.sm,
  },
  launchBlockerRow: {
    minHeight: 158,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  launchBlockerIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  launchBlockerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  launchBlockerMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  launchBlockerCommand: {
    minHeight: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.22)",
    backgroundColor: "rgba(255,212,107,0.07)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  launchBlockerAcceptance: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
    backgroundColor: "rgba(86,179,148,0.055)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 9,
    gap: 7,
  },
  launchBlockerAcceptanceHeader: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  launchBlockerAcceptanceItem: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  launchBlockerAcceptanceDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
  },
  launchBlockerBoundary: {
    minHeight: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.18)",
    backgroundColor: "rgba(86,179,148,0.06)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  releaseEvidenceIntakePanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  releaseEvidenceBoundaryGrid: {
    gap: Spacing.sm,
  },
  releaseEvidenceHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  releaseEvidenceIntakeList: {
    gap: Spacing.sm,
  },
  releaseEvidenceIntakeRow: {
    minHeight: 178,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  releaseEvidenceIntakeIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  releaseEvidenceIntakeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  releaseEvidenceIntakeTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  releaseEvidenceSecretBoundary: {
    minHeight: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  captureSessionPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  captureSessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  captureSessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  captureSessionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  captureSessionBadge: {
    maxWidth: 132,
    minHeight: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  captureSessionNextRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  captureSessionNextCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  captureSessionAction: {
    minHeight: 44,
    maxWidth: 170,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  captureSessionBoundaryGrid: {
    gap: Spacing.sm,
  },
  captureSessionBatchList: {
    gap: Spacing.sm,
  },
  captureSessionBatch: {
    minHeight: 72,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  captureSessionBatchCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  storyArc: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  storyArcRow: {
    gap: Spacing.sm,
  },
  storyArcStep: {
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  qaGatePanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  qaGateList: {
    gap: Spacing.sm,
  },
  qaGateRow: {
    minHeight: 96,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  qaGateIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  qaGateCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  qaGateTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  screenshotReadinessPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  screenshotReadinessList: {
    gap: Spacing.sm,
  },
  screenshotReadinessCard: {
    minHeight: 236,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  screenshotReadinessTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  screenshotReadinessTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  screenshotReadinessStatusPill: {
    maxWidth: 150,
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  screenshotReadinessGrid: {
    gap: Spacing.sm,
  },
  screenshotReadinessItem: {
    minHeight: 94,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 5,
  },
  screenshotReadinessItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  screenshotReadinessBoundary: {
    minHeight: 46,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  captureMatrixPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  captureMatrixList: {
    gap: Spacing.sm,
  },
  captureMatrixRow: {
    minHeight: 168,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  captureMatrixNumber: {
    width: 34,
    height: 34,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  captureMatrixCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  captureMatrixTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  captureMatrixRoutePill: {
    maxWidth: 128,
    minHeight: 26,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  captureMatrixMeta: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  matrixLine: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  demoSafetyPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  demoSafetyList: {
    gap: Spacing.sm,
  },
  demoSafetyRow: {
    minHeight: 174,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  demoSafetyIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  demoSafetyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  demoSafetyTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  demoSafetyRoutePill: {
    maxWidth: 132,
    minHeight: 26,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  claimSafetyPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  claimSafetyList: {
    gap: Spacing.sm,
  },
  claimSafetyRow: {
    minHeight: 210,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  claimSafetyIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  claimSafetyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  claimSafetyTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  listingMetadataPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  listingMetadataBoundaryGrid: {
    gap: Spacing.sm,
  },
  listingMetadataList: {
    gap: Spacing.sm,
  },
  listingMetadataRow: {
    minHeight: 132,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  listingMetadataIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  listingMetadataCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  listingMetadataTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  reviewerNotePanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  reviewerNoteBoundaryGrid: {
    gap: Spacing.sm,
  },
  reviewerNoteList: {
    gap: Spacing.sm,
  },
  reviewerNoteRow: {
    minHeight: 136,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  reviewerNoteIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewerNoteCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  reviewerNoteTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  reviewerNoteBlocked: {
    minHeight: 54,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  capturePlanner: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  capturePlannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  captureSpecGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  captureSpecChip: {
    maxWidth: "100%",
    minHeight: 34,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deviceFrameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  deviceFrameChip: {
    minHeight: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  truthRules: {
    gap: 8,
  },
  truthRuleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  runbookList: {
    gap: 8,
  },
  runbookRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  runbookNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  blockerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  blockerChip: {
    minHeight: 30,
    maxWidth: "100%",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  captureHandoffAction: {
    minHeight: 46,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  proofLedgerPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  proofLedgerList: {
    gap: Spacing.sm,
  },
  proofLedgerRow: {
    minHeight: 72,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  proofLedgerIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  proofLedgerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  routeProofPanel: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  routeProofList: {
    gap: Spacing.sm,
  },
  routeProofRow: {
    minHeight: 112,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  routeProofIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  routeProofCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  routeProofTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  routeProofPill: {
    maxWidth: 132,
    minHeight: 26,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  shotList: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  shotCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    gap: Spacing.md,
    overflow: "hidden",
  },
  phoneFrame: {
    width: 104,
    aspectRatio: 0.52,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#050712",
    overflow: "hidden",
    padding: 10,
  },
  phoneStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  phoneDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  phoneLine: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  phoneHeroGlyph: {
    width: 56,
    height: 56,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  phoneShotCopy: {
    gap: 4,
    marginTop: 12,
  },
  phoneShotHeadline: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
  },
  phoneShotSubhead: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 8,
    lineHeight: 10,
  },
  phoneTextStack: {
    gap: 7,
    marginTop: 12,
  },
  phoneTitleLine: {
    height: 8,
    borderRadius: 4,
  },
  phoneSubLine: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.26)",
  },
  phoneSubLineShort: {
    width: "70%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  phoneMiniGrid: {
    flexDirection: "row",
    gap: 5,
    marginTop: "auto",
  },
  phoneMiniTile: {
    flex: 1,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  phoneMiniTileGlow: {
    width: "62%",
    height: "100%",
  },
  shotCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
  },
  shotTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  shotNumber: {
    width: 32,
    height: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  shotTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  proofRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  proofChip: {
    maxWidth: "100%",
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  storeCaptionBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 5,
  },
  storeCaptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  claimProofBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 7,
  },
  claimReceiptBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 7,
  },
  proofLine: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  captureLineBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 5,
  },
  signalGrid: {
    gap: Spacing.sm,
  },
  signalPill: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: 3,
  },
  captureRunbookBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 7,
  },
  captureRunbookRow: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  checklistColumn: {
    gap: 5,
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  openRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: "auto",
  },
});
