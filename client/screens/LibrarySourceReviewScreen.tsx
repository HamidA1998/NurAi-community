import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ModalShell } from "@/components/ModalShell";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useSubscription } from "@/context/SubscriptionContext";
import { useTheme } from "@/hooks/useTheme";
import { canReviewLibrarySources } from "@/services/libraryAccessControl";
import {
  buildLibraryReviewEvidenceBatches,
  buildLibraryReviewEvidenceAcceptanceContract,
  buildLibraryReviewEvidenceImportReadinessContract,
  buildLibraryReviewEvidenceProofMatrix,
  buildLibraryReviewEvidenceProofMatrixShareText,
  buildLibraryReviewBookAcceptancePacketShareText,
  buildLibraryReviewBookAcceptancePackets,
  buildLibraryReviewEvidenceBatchShareText,
  buildLibraryReviewEvidenceIntakeRunbook,
  buildLibraryReviewEvidenceIntakeRunbookShareText,
  buildLibraryReviewCompletionPlan,
  buildLibraryReviewDailyWorkPlan,
  buildLibraryReviewDailyWorkPlanShareText,
  buildLibraryReviewNextAction,
  buildLibraryReviewOpsPassport,
  buildLibraryReviewOpsPassportShareText,
  buildLibraryReviewSprintPlan,
  buildLibraryReviewSprintPlanShareText,
  buildLibraryReviewStageContracts,
  buildLibraryReviewNextActionShareText,
  buildBookPublicationReviewShareText,
  buildLibraryPublicationReviewShareText,
  buildLibrarySourcePackActivationContract,
  buildLibrarySourcePackActivationShareText,
  ChapterSourceAudit,
  getLibraryPublicationReviewSummary,
  getLibraryPublicationReviewQueue,
  getLibrarySourceAudits,
  getLibrarySourceSummary,
  LibraryReviewEvidenceAcceptanceContract,
  LibraryReviewBookAcceptancePacket,
  LibraryReviewEvidenceImportReadinessContract,
  LibraryReviewEvidenceProofMatrix,
  LibraryPublicationReviewItem,
  LibraryPublicationReviewSummary,
  LibraryReviewCompletionPlan,
  LibraryReviewDailyWorkPlan,
  LibraryReviewEvidenceBatch,
  LibraryReviewEvidenceIntakeRunbook,
  LibraryReviewNextAction,
  LibraryReviewOpsPassport,
  LibraryReviewSprintPlan,
  LibraryReviewStageContract,
  LibrarySourcePackActivationContract,
  LibrarySourceSummary,
  saveSourceReviewDecision,
  sourceReviewDecisionEvidenceIssues,
  SourceReviewStatus,
  SourceReviewDecision,
} from "@/services/librarySourceReviewService";
import { AppIcon, type AppIconName } from "@/components/icons";

type FilterKey = "all" | SourceReviewStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs_fix", label: "Needs Review" },
  { key: "ready_for_review", label: "Ready" },
  { key: "approved", label: "Approved" },
];

export default function LibrarySourceReviewScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { currentPlan } = useSubscription();
  const canReview = canReviewLibrarySources(currentPlan);
  const [audits, setAudits] = useState<ChapterSourceAudit[]>([]);
  const [summary, setSummary] = useState<LibrarySourceSummary | null>(null);
  const [publicationSummary, setPublicationSummary] =
    useState<LibraryPublicationReviewSummary | null>(null);
  const [publicationQueue, setPublicationQueue] = useState<
    LibraryPublicationReviewItem[]
  >([]);
  const [filter, setFilter] = useState<FilterKey>("needs_fix");
  const [decisionDraft, setDecisionDraft] = useState<{
    audit: ChapterSourceAudit;
    decision: SourceReviewDecision;
  } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  const loadAudits = useCallback(async () => {
    const [nextAudits, nextSummary] = await Promise.all([
      getLibrarySourceAudits(),
      getLibrarySourceSummary(),
    ]);
    setAudits(nextAudits);
    setSummary(nextSummary);
    setPublicationSummary(getLibraryPublicationReviewSummary());
    setPublicationQueue(getLibraryPublicationReviewQueue());
    if (nextSummary.needsFix === 0 && filter === "needs_fix") {
      setFilter(nextSummary.readyForReview > 0 ? "ready_for_review" : "all");
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      loadAudits().catch(() => {});
    }, [loadAudits]),
  );

  const visibleAudits = useMemo(() => {
    const filtered =
      filter === "all"
        ? [...audits]
        : audits.filter((audit) => audit.status === filter);
    return filtered.sort(
      (a, b) =>
        statusWeight(a.status) - statusWeight(b.status) ||
        a.bookTitle.localeCompare(b.bookTitle),
    );
  }, [audits, filter]);

  const releaseReadinessPlan = useMemo(
    () =>
      buildLibraryReviewCompletionPlan(
        publicationSummary ?? getLibraryPublicationReviewSummary(),
        publicationQueue,
      ),
    [publicationQueue, publicationSummary],
  );
  const reviewEvidenceBatches = useMemo(
    () => buildLibraryReviewEvidenceBatches(publicationQueue),
    [publicationQueue],
  );
  const reviewBookAcceptancePackets = useMemo(
    () => buildLibraryReviewBookAcceptancePackets(publicationQueue),
    [publicationQueue],
  );
  const evidenceIntakeRunbook = useMemo(
    () =>
      buildLibraryReviewEvidenceIntakeRunbook({
        summary: publicationSummary ?? getLibraryPublicationReviewSummary(),
        queue: publicationQueue,
        batches: reviewEvidenceBatches,
      }),
    [publicationQueue, publicationSummary, reviewEvidenceBatches],
  );
  const reviewNextAction = useMemo(
    () =>
      buildLibraryReviewNextAction({
        plan: releaseReadinessPlan,
        queue: publicationQueue,
        batches: reviewEvidenceBatches,
        runbook: evidenceIntakeRunbook,
      }),
    [
      evidenceIntakeRunbook,
      publicationQueue,
      releaseReadinessPlan,
      reviewEvidenceBatches,
    ],
  );
  const reviewStageContracts = useMemo(
    () => buildLibraryReviewStageContracts(releaseReadinessPlan),
    [releaseReadinessPlan],
  );
  const reviewEvidenceAcceptanceContract = useMemo(
    () =>
      buildLibraryReviewEvidenceAcceptanceContract({
        plan: releaseReadinessPlan,
        runbook: evidenceIntakeRunbook,
        nextAction: reviewNextAction,
        batches: reviewEvidenceBatches,
      }),
    [
      evidenceIntakeRunbook,
      releaseReadinessPlan,
      reviewEvidenceBatches,
      reviewNextAction,
    ],
  );
  const reviewEvidenceImportReadiness = useMemo(
    () =>
      buildLibraryReviewEvidenceImportReadinessContract({
        summary: publicationSummary ?? getLibraryPublicationReviewSummary(),
        plan: releaseReadinessPlan,
        runbook: evidenceIntakeRunbook,
      }),
    [evidenceIntakeRunbook, publicationSummary, releaseReadinessPlan],
  );
  const reviewEvidenceProofMatrix = useMemo(
    () =>
      buildLibraryReviewEvidenceProofMatrix({
        summary: publicationSummary ?? getLibraryPublicationReviewSummary(),
        plan: releaseReadinessPlan,
        runbook: evidenceIntakeRunbook,
        nextAction: reviewNextAction,
      }),
    [
      evidenceIntakeRunbook,
      publicationSummary,
      releaseReadinessPlan,
      reviewNextAction,
    ],
  );
  const sourcePackActivationContract = useMemo(
    () => buildLibrarySourcePackActivationContract(),
    [],
  );
  const reviewOpsPassport = useMemo(
    () =>
      buildLibraryReviewOpsPassport({
        summary: publicationSummary ?? getLibraryPublicationReviewSummary(),
        plan: releaseReadinessPlan,
        nextAction: reviewNextAction,
        sourcePack: sourcePackActivationContract,
      }),
    [
      publicationSummary,
      releaseReadinessPlan,
      reviewNextAction,
      sourcePackActivationContract,
    ],
  );
  const reviewSprintPlan = useMemo(
    () =>
      buildLibraryReviewSprintPlan({
        plan: releaseReadinessPlan,
        queue: publicationQueue,
        batches: reviewEvidenceBatches,
        runbook: evidenceIntakeRunbook,
      }),
    [
      evidenceIntakeRunbook,
      publicationQueue,
      releaseReadinessPlan,
      reviewEvidenceBatches,
    ],
  );
  const reviewDailyWorkPlan = useMemo(
    () =>
      buildLibraryReviewDailyWorkPlan({
        plan: reviewSprintPlan,
        queue: publicationQueue,
        batches: reviewEvidenceBatches,
        runbook: evidenceIntakeRunbook,
      }),
    [
      evidenceIntakeRunbook,
      publicationQueue,
      reviewEvidenceBatches,
      reviewSprintPlan,
    ],
  );

  const openDecisionEvidence = (
    audit: ChapterSourceAudit,
    decision: SourceReviewDecision,
  ) => {
    if (!canReview) {
      navigation.navigate("Subscription", { initialTab: "scholar" });
      return;
    }
    if (decision === "approved" && audit.issueCount > 0) {
      Alert.alert(
        "Cannot approve yet",
        "Fix the listed source issues first, then run review again.",
      );
      return;
    }
    setDecisionDraft({ audit, decision });
    setDecisionNote(
      decision === "approved"
        ? "Verified source cards, trusted links, issue count, and publication boundary for this chapter."
        : "Needs revision before approval. Reviewer should re-check source cards, trusted links, and chapter fit.",
    );
  };

  const evidenceIssues = useMemo(
    () => sourceReviewDecisionEvidenceIssues(decisionNote),
    [decisionNote],
  );

  const sharePublicationHandoff = useCallback(async () => {
    const nextSummary =
      publicationSummary ?? getLibraryPublicationReviewSummary();
    try {
      await Share.share({
        message: buildLibraryPublicationReviewShareText(nextSummary),
      });
    } catch {
      Alert.alert(
        "Could not share handoff",
        "NurAI could not open the share sheet. Please try again shortly.",
      );
    }
  }, [publicationSummary]);

  const shareBookPublicationHandoff = useCallback(
    async (item: LibraryPublicationReviewItem) => {
      try {
        await Share.share({
          message: buildBookPublicationReviewShareText(item),
        });
      } catch {
        Alert.alert(
          "Could not share book handoff",
          "NurAI could not open the share sheet. Please try again shortly.",
        );
      }
    },
    [],
  );

  const shareBookAcceptancePacket = useCallback(
    async (packet: LibraryReviewBookAcceptancePacket) => {
      try {
        await Share.share({
          message: buildLibraryReviewBookAcceptancePacketShareText(packet),
        });
      } catch {
        Alert.alert(
          "Could not share acceptance packet",
          "NurAI could not open the share sheet. Please try again shortly.",
        );
      }
    },
    [],
  );

  const shareReviewEvidenceBatch = useCallback(
    async (batch: LibraryReviewEvidenceBatch) => {
      try {
        await Share.share({
          message: buildLibraryReviewEvidenceBatchShareText(batch),
        });
      } catch {
        Alert.alert(
          "Could not share review batch",
          "NurAI could not open the share sheet. Please try again shortly.",
        );
      }
    },
    [],
  );

  const shareEvidenceIntakeRunbook = useCallback(async () => {
    try {
      await Share.share({
        message: buildLibraryReviewEvidenceIntakeRunbookShareText(
          evidenceIntakeRunbook,
        ),
      });
    } catch {
      Alert.alert(
        "Could not share intake runbook",
        "NurAI could not open the share sheet. Please try again shortly.",
      );
    }
  }, [evidenceIntakeRunbook]);

  const shareReviewNextAction = useCallback(async () => {
    try {
      await Share.share({
        message: buildLibraryReviewNextActionShareText(reviewNextAction),
      });
    } catch {
      Alert.alert(
        "Could not share next action",
        "NurAI could not open the share sheet. Please try again shortly.",
      );
    }
  }, [reviewNextAction]);

  const shareReviewEvidenceProofMatrix = useCallback(async () => {
    try {
      await Share.share({
        message: buildLibraryReviewEvidenceProofMatrixShareText(
          reviewEvidenceProofMatrix,
        ),
      });
    } catch {
      Alert.alert(
        "Could not share proof matrix",
        "NurAI could not open the share sheet. Please try again shortly.",
      );
    }
  }, [reviewEvidenceProofMatrix]);

  const shareSourcePackActivationHandoff = useCallback(async () => {
    try {
      await Share.share({
        message: buildLibrarySourcePackActivationShareText(
          sourcePackActivationContract,
        ),
      });
    } catch {
      Alert.alert(
        "Could not share source-pack handoff",
        "NurAI could not open the share sheet. Please try again shortly.",
      );
    }
  }, [sourcePackActivationContract]);

  const shareReviewOpsPassport = useCallback(async () => {
    try {
      await Share.share({
        message: buildLibraryReviewOpsPassportShareText(reviewOpsPassport),
      });
    } catch {
      Alert.alert(
        "Could not share ops passport",
        "NurAI could not open the share sheet. Please try again shortly.",
      );
    }
  }, [reviewOpsPassport]);

  const shareReviewSprintPlan = useCallback(async () => {
    try {
      await Share.share({
        message: buildLibraryReviewSprintPlanShareText(reviewSprintPlan),
      });
    } catch {
      Alert.alert(
        "Could not share sprint plan",
        "NurAI could not open the share sheet. Please try again shortly.",
      );
    }
  }, [reviewSprintPlan]);

  const shareReviewDailyWorkPlan = useCallback(async () => {
    try {
      await Share.share({
        message: buildLibraryReviewDailyWorkPlanShareText(reviewDailyWorkPlan),
      });
    } catch {
      Alert.alert(
        "Could not share daily workplan",
        "NurAI could not open the share sheet. Please try again shortly.",
      );
    }
  }, [reviewDailyWorkPlan]);

  const saveDecisionEvidence = async () => {
    if (!decisionDraft) return;
    if (evidenceIssues.length > 0) {
      Alert.alert("Review evidence needed", evidenceIssues.join("\n"));
      return;
    }
    try {
      await saveSourceReviewDecision({
        bookId: decisionDraft.audit.bookId,
        chapterId: decisionDraft.audit.chapterId,
        decision: decisionDraft.decision,
        reviewerPlan: currentPlan,
        note: decisionNote,
      });
      setDecisionDraft(null);
      setDecisionNote("");
      await loadAudits();
    } catch {
      Alert.alert(
        "Review decision not saved",
        "NurAI could not save this source trust review. Please try again shortly.",
      );
    }
  };

  const openSource = async (url?: string | null) => {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}
      edges={["top"]}
    >
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
                borderColor: theme.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="button-library-source-review-back"
          >
            <AppIcon name="arrow-left" size={22} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={loadAudits}
            style={[
              styles.iconButton,
              {
                backgroundColor: theme.surfaceGlassStrong,
                borderColor: theme.primaryBorder,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Refresh source review audit"
            testID="button-library-source-review-refresh"
          >
            <AppIcon name="refresh-cw" size={20} color={theme.primary} />
          </Pressable>
        </View>

        <ThemedText
          type="caption"
          style={[styles.eyebrow, { color: theme.scholar }]}
        >
          Source Trust
        </ThemedText>
        <ThemedText type="hero" style={styles.title}>
          Source Trust Review
        </ThemedText>
        <ThemedText
          type="body"
          style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}
        >
          Every Library chapter is audited for verified Quran/Hadith anchors,
          trusted links, and scholar-review readiness.
        </ThemedText>

        <LibraryReviewReleaseCockpit plan={releaseReadinessPlan} />

        <LibraryReviewOpsPassportCard
          passport={reviewOpsPassport}
          onShare={shareReviewOpsPassport}
        />

        <LibrarySourcePackActivationCard
          contract={sourcePackActivationContract}
          onShare={shareSourcePackActivationHandoff}
        />

        <LibraryReviewNextActionCard
          action={reviewNextAction}
          onShare={shareReviewNextAction}
        />

        <LibraryReviewEvidenceProofMatrixCard
          matrix={reviewEvidenceProofMatrix}
          onShare={shareReviewEvidenceProofMatrix}
        />

        <LibraryReviewSprintPlanCard
          plan={reviewSprintPlan}
          onShare={shareReviewSprintPlan}
        />

        <LibraryReviewDailyWorkPlanCard
          plan={reviewDailyWorkPlan}
          onShare={shareReviewDailyWorkPlan}
        />

        <LibraryReviewEvidenceAcceptanceContractCard
          contract={reviewEvidenceAcceptanceContract}
        />

        <LibraryReviewEvidenceImportReadinessCard
          contract={reviewEvidenceImportReadiness}
        />

        <LibraryReviewBookAcceptancePacketPanel
          packets={reviewBookAcceptancePackets}
          onOpenBook={(bookId) => navigation.navigate("BookDetail", { bookId })}
          onSharePacket={shareBookAcceptancePacket}
        />

        <LibraryReviewBatchPanel
          batches={reviewEvidenceBatches}
          onShareBatch={shareReviewEvidenceBatch}
        />

        <LibraryReviewStageContractPanel contracts={reviewStageContracts} />

        <LibraryReviewEvidenceIntakeCard
          runbook={evidenceIntakeRunbook}
          onShare={shareEvidenceIntakeRunbook}
        />

        <View
          style={[
            styles.publicationHandoffCard,
            {
              backgroundColor: theme.cardBackground,
              borderColor: `${theme.scholar}42`,
            },
          ]}
          testID="library-publication-review-handoff"
        >
          <View style={styles.publicationHandoffTop}>
            <View
              style={[
                styles.publicationHandoffIcon,
                { backgroundColor: theme.scholarSoft },
              ]}
            >
              <AppIcon name="clipboard" size={18} color={theme.scholar} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText
                type="caption"
                style={{ color: theme.scholar, fontWeight: "900" }}
              >
                PUBLICATION SIGN-OFF HANDOFF
              </ThemedText>
              <ThemedText type="h4" style={{ color: theme.text }}>
                Review-ready, not published
              </ThemedText>
            </View>
            <View
              style={[
                styles.publicationStatusPill,
                { borderColor: `${theme.scholar}45` },
              ]}
            >
              <ThemedText type="caption" style={{ color: theme.scholar }}>
                {publicationSummary
                  ? `${publicationSummary.publishedBooks}/${publicationSummary.totalBooks}`
                  : "0/0"}{" "}
                approved
              </ThemedText>
            </View>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            Books need editorial review, source relevance review, complete
            quality checklist, qualified scholar review for high-care topics,
            and a publish decision before NurAI can call them fully reviewed.
          </ThemedText>
          <View style={styles.publicationChecklistGrid}>
            <PublicationGateMetric
              label="Editorial"
              value={publicationSummary?.editorialPending ?? 0}
              icon="edit-3"
            />
            <PublicationGateMetric
              label="Sources"
              value={publicationSummary?.sourceReviewPending ?? 0}
              icon="link"
            />
            <PublicationGateMetric
              label="Checklist"
              value={publicationSummary?.qualityChecklistPending ?? 0}
              icon="check-square"
            />
            <PublicationGateMetric
              label="Scholar"
              value={publicationSummary?.qualifiedScholarPending ?? 0}
              icon="users"
            />
            <PublicationGateMetric
              label="Publish"
              value={publicationSummary?.publishDecisionPending ?? 0}
              icon="send"
            />
          </View>
          <Pressable
            onPress={sharePublicationHandoff}
            style={({ pressed }) => [
              styles.handoffShareButton,
              {
                backgroundColor: `${theme.scholar}12`,
                borderColor: `${theme.scholar}35`,
              },
              pressed ? { opacity: 0.84, transform: [{ scale: 0.985 }] } : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Share Library publication sign-off handoff"
            testID="button-share-library-publication-handoff"
          >
            <AppIcon name="share-2" size={15} color={theme.scholar} />
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              Share handoff
            </ThemedText>
          </Pressable>
        </View>

        {publicationQueue.length > 0 ? (
          <View
            style={styles.publicationQueueSection}
            testID="library-publication-review-queue"
          >
            <View style={styles.publicationQueueHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText type="h4" style={{ color: theme.text }}>
                  Next books for sign-off
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, marginTop: 3 }}
                >
                  High-care books are listed first so real reviewers know where
                  to start.
                </ThemedText>
              </View>
              <View
                style={[
                  styles.publicationStatusPill,
                  { borderColor: `${theme.scholar}45` },
                ]}
              >
                <ThemedText type="caption" style={{ color: theme.scholar }}>
                  {publicationQueue.length} pending
                </ThemedText>
              </View>
            </View>
            {publicationQueue.slice(0, 6).map((item) => (
              <View
                key={item.bookId}
                style={[
                  styles.publicationQueueCard,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: item.sensitive
                      ? `${theme.scholar}44`
                      : theme.border,
                  },
                ]}
              >
                <View style={styles.publicationQueueCardTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText type="body" numberOfLines={2}>
                      {item.title}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted, marginTop: 3 }}
                      numberOfLines={1}
                    >
                      {item.category} - {item.chapterCount} chapters -{" "}
                      {item.sourceRefCount} source cards
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.publicationPriorityBadge,
                      {
                        backgroundColor: item.sensitive
                          ? `${theme.scholar}14`
                          : `${theme.primary}10`,
                        borderColor: item.sensitive
                          ? `${theme.scholar}36`
                          : `${theme.primary}30`,
                      },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{
                        color: item.sensitive ? theme.scholar : theme.primary,
                        fontSize: 11,
                      }}
                    >
                      {item.priorityLabel}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.publicationMissingList}>
                  {item.missingEvidence.slice(0, 3).map((evidence) => (
                    <View key={evidence} style={styles.publicationMissingRow}>
                      <AppIcon name="circle" size={8} color={theme.scholar} />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary, flex: 1 }}
                      >
                        {evidence}
                      </ThemedText>
                    </View>
                  ))}
                </View>
                <View style={styles.publicationQueueActions}>
                  <Pressable
                    onPress={() =>
                      navigation.navigate("BookDetail", { bookId: item.bookId })
                    }
                    style={[
                      styles.queueActionButton,
                      { borderColor: theme.border },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.title} for Library review`}
                    testID="button-open-library-publication-review-book"
                  >
                    <AppIcon name="book-open" size={14} color={theme.text} />
                    <ThemedText type="caption" style={{ color: theme.text }}>
                      Open book
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => shareBookPublicationHandoff(item)}
                    style={[
                      styles.queueActionButton,
                      { borderColor: `${theme.scholar}35` },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Share ${item.title} publication review handoff`}
                    testID="button-share-library-book-publication-handoff"
                  >
                    <AppIcon name="share-2" size={14} color={theme.scholar} />
                    <ThemedText type="caption" style={{ color: theme.scholar }}>
                      Share book
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.summaryGrid}>
          <Metric
            label="Needs Review"
            value={summary?.needsFix ?? 0}
            icon="alert-triangle"
            tone="warning"
          />
          <Metric
            label="Ready"
            value={summary?.readyForReview ?? 0}
            icon="shield"
            tone="primary"
          />
          <Metric
            label="Approved"
            value={summary?.approvedChapters ?? 0}
            icon="check-circle"
            tone="success"
          />
          <Metric
            label="Sources"
            value={
              summary
                ? `${summary.verifiedSources}/${summary.totalSources}`
                : "0/0"
            }
            icon="link"
            tone="scholar"
          />
        </View>

        <View
          style={[
            styles.noticeCard,
            {
              backgroundColor: canReview
                ? theme.scholarSoft
                : theme.cardBackground,
              borderColor: canReview ? theme.scholar + "55" : theme.border,
            },
          ]}
        >
          <AppIcon
            name={canReview ? "award" : "lock"}
            size={18}
            color={canReview ? theme.scholar : theme.textMuted}
          />
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, flex: 1 }}
          >
            {canReview
              ? "Scholar access can save reviewed chapters to the protected source record."
              : "Review actions are Scholar-gated. Everyone can inspect source status before reading."}
          </ThemedText>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((item) => {
            const selected = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selected
                      ? theme.primary
                      : theme.surfaceGlassStrong,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Show ${item.label} source reviews`}
                accessibilityState={{ selected }}
                testID={`filter-library-source-review-${item.key}`}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: selected ? theme.primaryForeground : theme.text,
                  }}
                >
                  {item.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {visibleAudits.map((audit) => (
          <View
            key={audit.id}
            style={[
              styles.auditCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: borderForStatus(audit.status, theme),
              },
            ]}
          >
            <View style={styles.auditHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  {audit.bookTitle}
                </ThemedText>
                <ThemedText type="h4">{audit.chapterTitle}</ThemedText>
              </View>
              <StatusBadge status={audit.status} />
            </View>

            {audit.needsScholarReview ? (
              <View
                style={[
                  styles.scholarStrip,
                  { backgroundColor: theme.scholarSoft },
                ]}
              >
                <AppIcon name="users" size={14} color={theme.scholar} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, flex: 1 }}
                >
                  Sensitive category: scholar review recommended before this
                  copy is treated as final.
                </ThemedText>
              </View>
            ) : null}

            {audit.review ? (
              <View
                style={[
                  styles.reviewEvidenceCard,
                  {
                    backgroundColor: `${theme.primary}0A`,
                    borderColor: `${theme.primary}28`,
                  },
                ]}
                testID="library-source-review-evidence-card"
              >
                <AppIcon name="user-check" size={14} color={theme.primary} />
                <View style={{ flex: 1, gap: 3 }}>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "900" }}
                  >
                    SERVER-BACKED REVIEW EVIDENCE
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, lineHeight: 17 }}
                  >
                    {audit.review.reviewerName} - {audit.review.decision}
                  </ThemedText>
                  {audit.review.note ? (
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted, lineHeight: 17 }}
                    >
                      {audit.review.note}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            ) : null}

            {audit.issues.length > 0 ? (
              <View style={styles.issueList}>
                {audit.issues.slice(0, 3).map((issue) => (
                  <View key={issue} style={styles.issueRow}>
                    <AppIcon
                      name="alert-circle"
                      size={14}
                      color={theme.warning}
                    />
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary, flex: 1 }}
                    >
                      {issue}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText type="caption" style={{ color: theme.primary }}>
                No source integrity issues found.
              </ThemedText>
            )}

            <View style={styles.sourceList}>
              {audit.sources.map((source) => (
                <Pressable
                  key={source.id}
                  onPress={() => openSource(source.url)}
                  style={[
                    styles.sourceRow,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.surfaceGlassStrong,
                    },
                  ]}
                >
                  <AppIcon
                    name={source.type === "quran" ? "book-open" : "feather"}
                    size={15}
                    color={theme.scholar}
                  />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="small" numberOfLines={1}>
                      {source.reference}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                      numberOfLines={2}
                    >
                      {source.note}
                    </ThemedText>
                  </View>
                  <AppIcon
                    name="external-link"
                    size={14}
                    color={theme.textMuted}
                  />
                </Pressable>
              ))}
            </View>

            <View style={styles.actionRow}>
              <Pressable
                onPress={() => openDecisionEvidence(audit, "needs_revision")}
                style={[
                  styles.secondaryButton,
                  { borderColor: theme.scholar + "55" },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Record revision evidence for ${audit.chapterTitle}`}
                testID="button-library-source-review-needs-revision"
              >
                <AppIcon name="edit-3" size={15} color={theme.scholar} />
                <ThemedText type="caption" style={{ color: theme.scholar }}>
                  Needs revision
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => openDecisionEvidence(audit, "approved")}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor:
                      audit.issueCount > 0
                        ? theme.disabledBackground
                        : theme.primary,
                  },
                ]}
              >
                <AppIcon
                  name="check"
                  size={15}
                  color={
                    audit.issueCount > 0
                      ? theme.textMuted
                      : theme.primaryForeground
                  }
                />
                <ThemedText
                  type="caption"
                  style={{
                    color:
                      audit.issueCount > 0
                        ? theme.textMuted
                        : theme.primaryForeground,
                  }}
                >
                  Approve
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      <ModalShell
        visible={Boolean(decisionDraft)}
        onClose={() => setDecisionDraft(null)}
        title={
          decisionDraft?.decision === "approved"
            ? "Record approval evidence"
            : "Record revision evidence"
        }
        size="lg"
        scrollable
      >
        <View style={styles.decisionModalBody}>
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: theme.scholarSoft,
                borderColor: `${theme.scholar}40`,
                marginTop: 0,
              },
            ]}
          >
            <AppIcon name="shield" size={16} color={theme.scholar} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
            >
              This saves a server-backed audit event tied to the signed-in
              reviewer. Notes should describe what was checked and any limits.
            </ThemedText>
          </View>
          <View style={styles.decisionTarget}>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              {decisionDraft?.audit.bookTitle}
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {decisionDraft?.audit.chapterTitle}
            </ThemedText>
          </View>
          <View style={styles.inputGroup}>
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, fontWeight: "900" }}
            >
              Review notes
            </ThemedText>
            <TextInput
              value={decisionNote}
              onChangeText={setDecisionNote}
              placeholder="What was checked, and what remains limited?"
              placeholderTextColor={theme.textMuted}
              multiline
              textAlignVertical="top"
              style={[
                styles.reviewInput,
                {
                  backgroundColor: theme.surfaceGlassStrong,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              accessibilityLabel="Library source review notes"
              testID="input-library-source-review-note"
            />
          </View>
          {evidenceIssues.length > 0 ? (
            <View
              style={[
                styles.evidenceGate,
                {
                  backgroundColor: `${theme.scholar}0D`,
                  borderColor: `${theme.scholar}2A`,
                },
              ]}
              testID="library-source-review-evidence-gate"
            >
              <AppIcon name="alert-circle" size={14} color={theme.scholar} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, flex: 1 }}
              >
                {evidenceIssues[0]}
              </ThemedText>
            </View>
          ) : null}
          <Pressable
            onPress={saveDecisionEvidence}
            disabled={evidenceIssues.length > 0}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.primary, flex: 0 },
              evidenceIssues.length > 0 ? styles.disabledAction : null,
              pressed ? { opacity: 0.84, transform: [{ scale: 0.985 }] } : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save Library source review evidence"
            accessibilityState={{ disabled: evidenceIssues.length > 0 }}
            testID="button-save-library-source-review-evidence"
          >
            <AppIcon
              name="save"
              size={15}
              color={
                evidenceIssues.length > 0
                  ? theme.textMuted
                  : theme.primaryForeground
              }
            />
            <ThemedText
              type="caption"
              style={{
                color:
                  evidenceIssues.length > 0
                    ? theme.textMuted
                    : theme.primaryForeground,
                fontWeight: "900",
              }}
            >
              Save evidence
            </ThemedText>
          </Pressable>
        </View>
      </ModalShell>
    </SafeAreaView>
  );

  function Metric({
    label,
    value,
    icon,
    tone,
  }: {
    label: string;
    value: number | string;
    icon: AppIconName;
    tone: "primary" | "success" | "warning" | "scholar";
  }) {
    const color =
      tone === "warning"
        ? theme.warning
        : tone === "scholar"
          ? theme.scholar
          : theme.primary;
    return (
      <View
        style={[
          styles.metricCard,
          { backgroundColor: theme.cardBackground, borderColor: `${color}33` },
        ]}
      >
        <AppIcon name={icon} size={18} color={color} />
        <ThemedText type="h3">{value}</ThemedText>
        <ThemedText
          type="caption"
          style={{ color: theme.textMuted, textAlign: "center" }}
        >
          {label}
        </ThemedText>
      </View>
    );
  }

  function StatusBadge({ status }: { status: SourceReviewStatus }) {
    const label =
      status === "approved"
        ? "Approved"
        : status === "needs_fix"
          ? "Needs review"
          : "Ready";
    const color =
      status === "needs_fix"
        ? theme.warning
        : status === "approved"
          ? theme.primary
          : theme.scholar;
    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: `${color}18`, borderColor: `${color}44` },
        ]}
      >
        <ThemedText type="caption" style={{ color }}>
          {label}
        </ThemedText>
      </View>
    );
  }

  function PublicationGateMetric({
    label,
    value,
    icon,
  }: {
    label: string;
    value: number;
    icon: AppIconName;
  }) {
    const clear = value === 0;
    const color = clear ? theme.primary : theme.scholar;
    return (
      <View
        style={[
          styles.publicationGateMetric,
          {
            backgroundColor: clear
              ? `${theme.primary}10`
              : `${theme.scholar}0D`,
            borderColor: clear ? `${theme.primary}32` : `${theme.scholar}2D`,
          },
        ]}
      >
        <AppIcon name={icon} size={14} color={color} />
        <View style={{ minWidth: 0 }}>
          <ThemedText
            type="caption"
            style={{ color, fontWeight: "900", lineHeight: 15 }}
          >
            {value}
          </ThemedText>
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={{ color: theme.textMuted, fontSize: 11, lineHeight: 14 }}
          >
            {label}
          </ThemedText>
        </View>
      </View>
    );
  }

  function LibraryReviewReleaseCockpit({
    plan,
  }: {
    plan: LibraryReviewCompletionPlan;
  }) {
    return (
      <View
        style={[
          styles.releaseCockpitCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor:
              plan.completionPercent === 100
                ? `${theme.primary}40`
                : `${theme.scholar}45`,
          },
        ]}
        testID="library-review-release-readiness-cockpit"
        accessible
        accessibilityLabel="Library review release readiness cockpit"
      >
        <View style={styles.releaseCockpitTop}>
          <View
            style={[
              styles.releaseCockpitIcon,
              {
                backgroundColor:
                  plan.completionPercent === 100
                    ? `${theme.primary}18`
                    : theme.scholarSoft,
              },
            ]}
          >
            <AppIcon
              name={plan.completionPercent === 100 ? "check-circle" : "flag"}
              size={18}
              color={
                plan.completionPercent === 100 ? theme.primary : theme.scholar
              }
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              RELEASE READINESS
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {plan.releaseStateLabel}
            </ThemedText>
          </View>
          <View
            style={[
              styles.releaseProgressBadge,
              {
                borderColor:
                  plan.completionPercent === 100
                    ? `${theme.primary}42`
                    : `${theme.scholar}42`,
              },
            ]}
          >
            <ThemedText
              type="caption"
              style={{
                color:
                  plan.completionPercent === 100
                    ? theme.primary
                    : theme.scholar,
                fontWeight: "900",
              }}
            >
              {plan.completionPercent}%
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.releaseProgressTrack,
            { backgroundColor: theme.surfaceGlassStrong },
          ]}
        >
          <View
            style={[
              styles.releaseProgressFill,
              {
                width: `${plan.completionPercent}%`,
                backgroundColor:
                  plan.completionPercent === 100
                    ? theme.primary
                    : theme.scholar,
              },
            ]}
          />
        </View>

        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, lineHeight: 18 }}
        >
          {plan.progressLabel}. {plan.blockerLabel}
        </ThemedText>
        <ThemedText
          type="caption"
          style={{ color: theme.textMuted, lineHeight: 18 }}
        >
          {plan.nextBookLabel}
        </ThemedText>

        <View style={styles.releaseLaneGrid}>
          {plan.lanes.map((lane) => {
            const clear = lane.pending === 0;
            return (
              <View
                key={lane.id}
                style={[
                  styles.releaseLaneCard,
                  {
                    backgroundColor: clear
                      ? `${theme.primary}0D`
                      : `${theme.scholar}0B`,
                    borderColor: clear
                      ? `${theme.primary}30`
                      : `${theme.scholar}2C`,
                  },
                ]}
              >
                <View style={styles.releaseLaneTop}>
                  <ThemedText
                    type="caption"
                    style={{
                      color: clear ? theme.primary : theme.scholar,
                      fontWeight: "900",
                    }}
                  >
                    {lane.pending}/{lane.total}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: theme.textMuted, flex: 1 }}
                  >
                    pending
                  </ThemedText>
                </View>
                <ThemedText type="small" style={{ color: theme.text }}>
                  {lane.label}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted, lineHeight: 16 }}
                >
                  {lane.ownerLabel}: {lane.nextAction}
                </ThemedText>
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.releaseGuardrail,
            {
              backgroundColor: `${theme.warning}10`,
              borderColor: `${theme.warning}28`,
            },
          ]}
        >
          <AppIcon name="alert-circle" size={14} color={theme.warning} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {plan.guardrail}
          </ThemedText>
        </View>
      </View>
    );
  }

  function LibraryReviewOpsPassportCard({
    passport,
    onShare,
  }: {
    passport: LibraryReviewOpsPassport;
    onShare: () => void;
  }) {
    return (
      <View
        style={[
          styles.reviewOpsPassportCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: `${theme.scholar}38`,
          },
        ]}
        testID="library-review-ops-passport"
        accessible
        accessibilityLabel={`${passport.title}. ${passport.statusLabel}. ${passport.noClaimBoundaryLabel}`}
      >
        <View style={styles.reviewOpsPassportHeader}>
          <View
            style={[
              styles.reviewOpsPassportIcon,
              { backgroundColor: `${theme.scholar}14` },
            ]}
          >
            <AppIcon name="compass" size={18} color={theme.scholar} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              REVIEW OPS PASSPORT
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {passport.statusLabel}
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textMuted, lineHeight: 17 }}
            >
              {passport.summary}
            </ThemedText>
          </View>
        </View>

        <View style={styles.reviewOpsPassportMetricRow}>
          {[
            { label: "Progress", value: passport.progressLabel },
            { label: "Next owner", value: passport.nextOwnerLabel },
          ].map((metric) => (
            <View
              key={metric.label}
              style={[
                styles.reviewOpsPassportMetric,
                {
                  backgroundColor: `${theme.scholar}0A`,
                  borderColor: `${theme.scholar}26`,
                },
              ]}
            >
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: theme.scholar, fontWeight: "900" }}
              >
                {metric.label}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={3}
                style={{ color: theme.textSecondary, lineHeight: 16 }}
              >
                {metric.value}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.reviewOpsPassportCommand}>
          <AppIcon name="terminal" size={13} color={theme.primary} />
          <ThemedText
            type="caption"
            numberOfLines={2}
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
          >
            {passport.nextProofCommandLabel}
          </ThemedText>
        </View>

        <View style={styles.reviewOpsPassportLaneList}>
          {passport.lanes.map((lane) => {
            const color =
              lane.tone === "scholar"
                ? theme.scholar
                : lane.tone === "warning"
                  ? theme.warning
                  : theme.primary;
            return (
              <View
                key={lane.id}
                style={[
                  styles.reviewOpsPassportLane,
                  {
                    backgroundColor: `${color}0B`,
                    borderColor: `${color}28`,
                  },
                ]}
                testID={`library-review-ops-passport-${lane.id}`}
              >
                <View
                  style={[
                    styles.reviewOpsPassportLaneIcon,
                    { backgroundColor: `${color}16` },
                  ]}
                >
                  <AppIcon
                    name={lane.icon as AppIconName}
                    size={13}
                    color={color}
                  />
                </View>
                <View style={styles.reviewOpsPassportLaneCopy}>
                  <View style={styles.reviewOpsPassportLaneTop}>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.text, fontWeight: "900" }}
                    >
                      {lane.label}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color, fontWeight: "900" }}
                    >
                      {lane.statusLabel}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: theme.textSecondary }}
                  >
                    {lane.ownerLabel} - {lane.actionLabel}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textMuted, lineHeight: 16 }}
                  >
                    {lane.boundaryLabel}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.reviewOpsPassportBoundary,
            {
              backgroundColor: `${theme.warning}0D`,
              borderColor: `${theme.warning}26`,
            },
          ]}
          testID="library-review-ops-passport-no-claim-boundary"
        >
          <AppIcon name="lock" size={14} color={theme.warning} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {passport.noClaimBoundaryLabel}
          </ThemedText>
        </View>
        <View
          style={[
            styles.reviewOpsPassportBoundary,
            {
              backgroundColor: `${theme.scholar}0B`,
              borderColor: `${theme.scholar}26`,
            },
          ]}
          testID="library-review-ops-passport-no-secret-boundary"
        >
          <AppIcon name="shield" size={14} color={theme.scholar} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {passport.noSecretBoundaryLabel}
          </ThemedText>
        </View>

        <Pressable
          onPress={onShare}
          style={({ pressed }) => [
            styles.reviewOpsPassportShareButton,
            {
              backgroundColor: `${theme.scholar}12`,
              borderColor: `${theme.scholar}35`,
            },
            pressed ? { opacity: 0.84, transform: [{ scale: 0.985 }] } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share Library review ops passport"
          testID="button-share-library-review-ops-passport"
        >
          <AppIcon name="share-2" size={15} color={theme.scholar} />
          <ThemedText
            type="caption"
            style={{ color: theme.scholar, fontWeight: "900" }}
          >
            {passport.shareLabel}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  function LibrarySourcePackActivationCard({
    contract,
    onShare,
  }: {
    contract: LibrarySourcePackActivationContract;
    onShare: () => void;
  }) {
    return (
      <View
        style={[
          styles.sourcePackActivationCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: `${theme.scholar}42`,
          },
        ]}
        testID="library-source-pack-activation-checkpoint"
        accessible
        accessibilityLabel={`${contract.title}. ${contract.statusLabel}. ${contract.activationBoundaryLabel}`}
      >
        <View style={styles.sourcePackActivationHeader}>
          <View
            style={[
              styles.sourcePackActivationIcon,
              { backgroundColor: theme.scholarSoft },
            ]}
          >
            <AppIcon name="box" size={18} color={theme.scholar} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              AI SOURCE PACK ACTIVATION
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {contract.statusLabel}
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={3}
              style={{ color: theme.textMuted, lineHeight: 17 }}
            >
              {contract.summary}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.sourcePackDraftSummary,
            {
              backgroundColor: `${theme.warning}0D`,
              borderColor: `${theme.warning}28`,
            },
          ]}
          testID="library-source-pack-activation-draft-summary"
        >
          <AppIcon name="alert-triangle" size={14} color={theme.warning} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {contract.draftSummaryLabel}. {contract.activationBoundaryLabel}
          </ThemedText>
        </View>

        <View style={styles.sourcePackDomainGrid}>
          {contract.domains.map((domain) => {
            const color =
              domain.tone === "scholar"
                ? theme.scholar
                : domain.tone === "warning"
                  ? theme.warning
                  : theme.primary;
            return (
              <View
                key={domain.id}
                style={[
                  styles.sourcePackDomainCard,
                  {
                    backgroundColor: `${color}0B`,
                    borderColor: `${color}28`,
                  },
                ]}
                testID={`library-source-pack-activation-${domain.id}`}
              >
                <View
                  style={[
                    styles.sourcePackDomainIcon,
                    { backgroundColor: `${color}16` },
                  ]}
                >
                  <AppIcon
                    name={domain.icon as AppIconName}
                    size={13}
                    color={color}
                  />
                </View>
                <View style={styles.sourcePackDomainCopy}>
                  <View style={styles.sourcePackDomainTop}>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.text, fontWeight: "900" }}
                    >
                      {domain.label}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color, fontWeight: "900" }}
                    >
                      {domain.verifiedCount}/{domain.draftCount}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textSecondary, lineHeight: 16 }}
                  >
                    {domain.reviewerLabel} - {domain.statusLabel}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textMuted, lineHeight: 16 }}
                  >
                    {domain.blockerLabel}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.sourcePackCommandStack}>
          <View style={styles.sourcePackCommandRow}>
            <AppIcon name="terminal" size={13} color={theme.primary} />
            <ThemedText
              type="caption"
              numberOfLines={3}
              style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
            >
              {contract.finalReadinessCommandLabel}
            </ThemedText>
          </View>
          <View style={styles.sourcePackCommandRow}>
            <AppIcon name="refresh-cw" size={13} color={theme.scholar} />
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
            >
              {contract.handoffCommandLabel}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.sourcePackBoundary,
            {
              backgroundColor: `${theme.warning}0D`,
              borderColor: `${theme.warning}26`,
            },
          ]}
          testID="library-source-pack-activation-no-secret-boundary"
        >
          <AppIcon name="lock" size={14} color={theme.warning} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {contract.noSecretBoundaryLabel}
          </ThemedText>
        </View>

        <Pressable
          onPress={onShare}
          style={({ pressed }) => [
            styles.sourcePackShareButton,
            {
              backgroundColor: `${theme.scholar}12`,
              borderColor: `${theme.scholar}35`,
            },
            pressed ? { opacity: 0.84, transform: [{ scale: 0.985 }] } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share AI source-pack activation handoff"
          testID="button-share-library-source-pack-activation-handoff"
        >
          <AppIcon name="share-2" size={15} color={theme.scholar} />
          <ThemedText
            type="caption"
            style={{ color: theme.scholar, fontWeight: "900" }}
          >
            {contract.shareLabel}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  function LibraryReviewNextActionCard({
    action,
    onShare,
  }: {
    action: LibraryReviewNextAction;
    onShare: () => void;
  }) {
    const complete = action.batchId === null;
    return (
      <View
        style={[
          styles.reviewNextActionCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: complete ? `${theme.primary}35` : `${theme.scholar}38`,
          },
        ]}
        testID="library-review-next-action-card"
        accessible
        accessibilityLabel={`Library review next action. ${action.ownerLabel}. ${action.packetLabel}. ${action.guardrail}`}
      >
        <View style={styles.reviewNextActionTop}>
          <View
            style={[
              styles.reviewNextActionIcon,
              {
                backgroundColor: complete
                  ? `${theme.primary}14`
                  : theme.scholarSoft,
              },
            ]}
          >
            <AppIcon
              name={complete ? "check-circle" : "send"}
              size={18}
              color={complete ? theme.primary : theme.scholar}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{
                color: complete ? theme.primary : theme.scholar,
                fontWeight: "900",
              }}
            >
              NEXT REVIEWER ACTION
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {action.ownerLabel}
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textMuted, lineHeight: 17 }}
            >
              {action.laneLabel}
            </ThemedText>
          </View>
        </View>

        <View style={styles.reviewNextActionRows}>
          <View style={styles.reviewNextActionRow}>
            <AppIcon name="book-open" size={13} color={theme.primary} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
            >
              {action.packetLabel}
            </ThemedText>
          </View>
          <View style={styles.reviewNextActionRow}>
            <AppIcon name="check-square" size={13} color={theme.scholar} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
            >
              Evidence needed: {action.evidenceLabel}
            </ThemedText>
          </View>
          <View style={styles.reviewNextActionCommandRow}>
            <AppIcon name="terminal" size={13} color={theme.primary} />
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
            >
              {action.commandLabel}
            </ThemedText>
          </View>
        </View>

        <ThemedText
          type="caption"
          style={{ color: theme.textMuted, lineHeight: 18 }}
        >
          {action.guardrail}
        </ThemedText>

        <View
          style={styles.reviewAcceptanceChecklist}
          testID="library-review-next-action-acceptance-checklist"
        >
          <ThemedText
            type="caption"
            style={{ color: theme.scholar, fontWeight: "900" }}
          >
            ACCEPTANCE CHECKLIST
          </ThemedText>
          {action.acceptanceChecklist.map((item) => (
            <View key={item} style={styles.reviewAcceptanceChecklistRow}>
              <AppIcon name="check-circle" size={12} color={theme.scholar} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
              >
                {item}
              </ThemedText>
            </View>
          ))}
        </View>

        <Pressable
          onPress={onShare}
          style={({ pressed }) => [
            styles.reviewNextActionButton,
            {
              backgroundColor: complete
                ? `${theme.primary}12`
                : `${theme.scholar}12`,
              borderColor: complete
                ? `${theme.primary}35`
                : `${theme.scholar}35`,
            },
            pressed ? { opacity: 0.84, transform: [{ scale: 0.985 }] } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share Library review next action"
          testID="button-share-library-review-next-action"
        >
          <AppIcon
            name="share-2"
            size={15}
            color={complete ? theme.primary : theme.scholar}
          />
          <ThemedText
            type="caption"
            style={{
              color: complete ? theme.primary : theme.scholar,
              fontWeight: "900",
            }}
          >
            {action.shareLabel}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  function LibraryReviewEvidenceAcceptanceContractCard({
    contract,
  }: {
    contract: LibraryReviewEvidenceAcceptanceContract;
  }) {
    const sections = [
      {
        id: "accepted",
        title: contract.acceptedEvidenceTitle,
        items: contract.acceptedEvidence,
      },
      {
        id: "rejected",
        title: contract.rejectedEvidenceTitle,
        items: contract.rejectedEvidence,
      },
      {
        id: "validation",
        title: contract.validationTitle,
        items: contract.validationSteps,
      },
    ];

    return (
      <View
        style={[
          styles.acceptanceContractCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: `${theme.scholar}34`,
          },
        ]}
        testID="library-review-evidence-acceptance-contract"
        accessible
        accessibilityLabel={`${contract.title}. ${contract.statusLabel}. ${contract.claimBoundaryLabel}`}
      >
        <View style={styles.acceptanceContractHeader}>
          <View
            style={[
              styles.acceptanceContractIcon,
              { backgroundColor: `${theme.scholar}14` },
            ]}
          >
            <AppIcon name="file-text" size={18} color={theme.scholar} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              EVIDENCE ACCEPTANCE CONTRACT
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {contract.statusLabel}
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textMuted, lineHeight: 17 }}
            >
              {contract.summary}
            </ThemedText>
          </View>
        </View>

        <View style={styles.acceptanceContractSectionStack}>
          {sections.map((section) => (
            <View
              key={section.id}
              style={styles.acceptanceContractSection}
              testID={`library-review-acceptance-section-${section.id}`}
            >
              <ThemedText
                type="caption"
                style={{ color: theme.text, fontWeight: "900" }}
              >
                {section.title}
              </ThemedText>
              <View style={styles.acceptanceContractRows}>
                {section.items.map((item) => {
                  const color =
                    item.tone === "scholar"
                      ? theme.scholar
                      : item.tone === "warning"
                        ? theme.warning
                        : theme.primary;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.acceptanceContractRow,
                        {
                          backgroundColor: `${color}0B`,
                          borderColor: `${color}28`,
                        },
                      ]}
                      testID={`library-review-acceptance-item-${item.id}`}
                    >
                      <View
                        style={[
                          styles.acceptanceContractRowIcon,
                          { backgroundColor: `${color}16` },
                        ]}
                      >
                        <AppIcon
                          name={item.icon as AppIconName}
                          size={12}
                          color={color}
                        />
                      </View>
                      <View style={styles.acceptanceContractRowCopy}>
                        <View style={styles.acceptanceContractRowTop}>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.text, fontWeight: "900" }}
                          >
                            {item.label}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color, fontWeight: "900" }}
                          >
                            {item.statusLabel}
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{ color: theme.textMuted, lineHeight: 16 }}
                        >
                          {item.detail}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.acceptanceContractBoundary,
            {
              backgroundColor: `${theme.warning}0D`,
              borderColor: `${theme.warning}26`,
            },
          ]}
          testID="library-review-acceptance-claim-boundary"
        >
          <AppIcon name="lock" size={14} color={theme.warning} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {contract.claimBoundaryLabel}
          </ThemedText>
        </View>
      </View>
    );
  }

  function LibraryReviewEvidenceProofMatrixCard({
    matrix,
    onShare,
  }: {
    matrix: LibraryReviewEvidenceProofMatrix;
    onShare: () => void;
  }) {
    return (
      <View
        style={[
          styles.evidenceProofMatrixCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: `${theme.scholar}34`,
          },
        ]}
        testID="library-review-evidence-proof-matrix"
        accessible
        accessibilityLabel={`${matrix.title}. ${matrix.statusLabel}. ${matrix.claimBoundaryLabel}`}
      >
        <View style={styles.evidenceProofMatrixHeader}>
          <View
            style={[
              styles.evidenceProofMatrixIcon,
              { backgroundColor: `${theme.scholar}14` },
            ]}
          >
            <AppIcon name="grid" size={18} color={theme.scholar} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              REVIEW EVIDENCE PROOF MATRIX
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {matrix.statusLabel}
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textMuted, lineHeight: 17 }}
            >
              {matrix.summary}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.evidenceProofMatrixActiveBlocker,
            {
              backgroundColor: `${theme.warning}0D`,
              borderColor: `${theme.warning}28`,
            },
          ]}
          testID="library-review-evidence-proof-matrix-active-blocker"
        >
          <AppIcon name="alert-triangle" size={14} color={theme.warning} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {matrix.activeBlockerLabel}
          </ThemedText>
        </View>

        <View style={styles.evidenceProofMatrixRows}>
          {matrix.rows.map((row) => {
            const color =
              row.tone === "scholar"
                ? theme.scholar
                : row.tone === "warning"
                  ? theme.warning
                  : theme.primary;
            return (
              <View
                key={row.id}
                style={[
                  styles.evidenceProofMatrixRow,
                  {
                    backgroundColor: `${color}0B`,
                    borderColor: `${color}26`,
                  },
                ]}
                testID={`library-review-evidence-proof-matrix-${row.id}`}
              >
                <View
                  style={[
                    styles.evidenceProofMatrixRowIcon,
                    { backgroundColor: `${color}16` },
                  ]}
                >
                  <AppIcon
                    name={row.icon as AppIconName}
                    size={13}
                    color={color}
                  />
                </View>
                <View style={styles.evidenceProofMatrixRowCopy}>
                  <View style={styles.evidenceProofMatrixRowTop}>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.text, fontWeight: "900" }}
                    >
                      {row.label}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color, fontWeight: "900" }}
                    >
                      {row.statusLabel}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textSecondary, lineHeight: 16 }}
                  >
                    {row.proofNeededLabel}
                  </ThemedText>
                  <View style={styles.evidenceProofMatrixCommandRow}>
                    <AppIcon name="terminal" size={12} color={color} />
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{
                        color: theme.textMuted,
                        flex: 1,
                        lineHeight: 16,
                      }}
                    >
                      {row.commandLabel}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textMuted, lineHeight: 16 }}
                  >
                    Boundary: {row.claimBoundaryLabel}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.evidenceProofMatrixBoundary,
            {
              backgroundColor: `${theme.warning}0D`,
              borderColor: `${theme.warning}26`,
            },
          ]}
          testID="library-review-evidence-proof-matrix-no-secret-boundary"
        >
          <AppIcon name="lock" size={14} color={theme.warning} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {matrix.noSecretBoundaryLabel}
          </ThemedText>
        </View>
        <View
          style={[
            styles.evidenceProofMatrixBoundary,
            {
              backgroundColor: `${theme.scholar}0B`,
              borderColor: `${theme.scholar}26`,
            },
          ]}
          testID="library-review-evidence-proof-matrix-claim-boundary"
        >
          <AppIcon name="shield" size={14} color={theme.scholar} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {matrix.claimBoundaryLabel}
          </ThemedText>
        </View>

        <Pressable
          onPress={onShare}
          style={({ pressed }) => [
            styles.evidenceProofMatrixShareButton,
            {
              backgroundColor: `${theme.scholar}12`,
              borderColor: `${theme.scholar}35`,
            },
            pressed ? { opacity: 0.84, transform: [{ scale: 0.985 }] } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share Library review evidence proof matrix"
          testID="button-share-library-review-evidence-proof-matrix"
        >
          <AppIcon name="share-2" size={15} color={theme.scholar} />
          <ThemedText
            type="caption"
            style={{ color: theme.scholar, fontWeight: "900" }}
          >
            {matrix.shareLabel}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  function LibraryReviewSprintPlanCard({
    onShare,
    plan,
  }: {
    onShare: () => void;
    plan: LibraryReviewSprintPlan;
  }) {
    return (
      <View
        style={[
          styles.reviewSprintCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: `${theme.primary}34`,
          },
        ]}
        testID="library-review-sprint-plan"
        accessible
        accessibilityLabel={`${plan.title}. ${plan.statusLabel}. ${plan.completionBoundaryLabel}`}
      >
        <View style={styles.reviewSprintHeader}>
          <View
            style={[
              styles.reviewSprintIcon,
              { backgroundColor: `${theme.primary}14` },
            ]}
          >
            <AppIcon name="target" size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{ color: theme.primary, fontWeight: "900" }}
            >
              REVIEW SPRINT PLAN
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {plan.statusLabel}
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textMuted, lineHeight: 17 }}
            >
              {plan.summary}
            </ThemedText>
          </View>
        </View>

        <View style={styles.reviewSprintMetricRow}>
          {[
            { label: "Window", value: plan.sprintWindowLabel },
            { label: "Daily target", value: plan.dailyTargetLabel },
            { label: "Priority", value: plan.priorityBookLabel },
          ].map((metric) => (
            <View
              key={metric.label}
              style={[
                styles.reviewSprintMetric,
                {
                  backgroundColor: theme.surfaceGlassStrong,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: theme.textMuted }}
              >
                {metric.label}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={2}
                style={{ color: theme.text, fontWeight: "900", lineHeight: 16 }}
              >
                {metric.value}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.reviewSprintTaskList}>
          {plan.tasks.map((task) => {
            const color =
              task.tone === "scholar"
                ? theme.scholar
                : task.tone === "warning"
                  ? theme.warning
                  : theme.primary;
            return (
              <View
                key={task.id}
                style={[
                  styles.reviewSprintTask,
                  {
                    backgroundColor: `${color}0B`,
                    borderColor: `${color}28`,
                  },
                ]}
                testID={`library-review-sprint-task-${task.id}`}
              >
                <View
                  style={[
                    styles.reviewSprintTaskIcon,
                    { backgroundColor: `${color}16` },
                  ]}
                >
                  <AppIcon
                    name={task.icon as AppIconName}
                    size={13}
                    color={color}
                  />
                </View>
                <View style={styles.reviewSprintTaskCopy}>
                  <View style={styles.reviewSprintTaskTop}>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.text, fontWeight: "900" }}
                    >
                      {task.title}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color, fontWeight: "900" }}
                    >
                      {task.bookCount} books
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={{ color: theme.textSecondary }}
                  >
                    {task.ownerLabel} - {task.actionLabel}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textMuted, lineHeight: 16 }}
                  >
                    {task.detail}
                  </ThemedText>
                  <View style={styles.reviewSprintCommandRow}>
                    <AppIcon name="terminal" size={12} color={color} />
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.textMuted, flex: 1 }}
                    >
                      {task.commandLabel}
                    </ThemedText>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.reviewSprintBoundary,
            {
              backgroundColor: `${theme.warning}0D`,
              borderColor: `${theme.warning}26`,
            },
          ]}
          testID="library-review-sprint-claim-boundary"
        >
          <AppIcon name="lock" size={14} color={theme.warning} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {plan.completionBoundaryLabel}
          </ThemedText>
        </View>

        <Pressable
          onPress={onShare}
          style={({ pressed }) => [
            styles.reviewSprintShareButton,
            {
              backgroundColor: `${theme.primary}12`,
              borderColor: `${theme.primary}35`,
            },
            pressed ? { opacity: 0.84, transform: [{ scale: 0.985 }] } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share Library review sprint plan"
          testID="button-share-library-review-sprint-plan"
        >
          <AppIcon name="share-2" size={15} color={theme.primary} />
          <ThemedText
            type="caption"
            style={{ color: theme.primary, fontWeight: "900" }}
          >
            Share sprint
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  function LibraryReviewEvidenceImportReadinessCard({
    contract,
  }: {
    contract: LibraryReviewEvidenceImportReadinessContract;
  }) {
    return (
      <View
        style={[
          styles.importReadinessCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: `${theme.primary}32`,
          },
        ]}
        testID="library-review-evidence-import-readiness"
        accessible
        accessibilityLabel={`${contract.title}. ${contract.statusLabel}. ${contract.claimBoundaryLabel}`}
      >
        <View style={styles.importReadinessHeader}>
          <View
            style={[
              styles.importReadinessIcon,
              { backgroundColor: `${theme.primary}14` },
            ]}
          >
            <AppIcon name="upload-cloud" size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{ color: theme.primary, fontWeight: "900" }}
            >
              EVIDENCE IMPORT READINESS
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {contract.statusLabel}
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textMuted, lineHeight: 17 }}
            >
              {contract.summary}
            </ThemedText>
          </View>
        </View>

        <View style={styles.importReadinessMetricRow}>
          {[
            {
              label: "Accepted in code",
              value: contract.currentEvidenceLabel,
              tone: "primary" as const,
            },
            {
              label: "Still blocking",
              value: contract.blockingEvidenceLabel,
              tone: "scholar" as const,
            },
          ].map((metric) => {
            const color =
              metric.tone === "scholar" ? theme.scholar : theme.primary;
            return (
              <View
                key={metric.label}
                style={[
                  styles.importReadinessMetric,
                  {
                    backgroundColor: `${color}0B`,
                    borderColor: `${color}26`,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color, fontWeight: "900" }}
                >
                  {metric.label}
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={3}
                  style={{ color: theme.textSecondary, lineHeight: 16 }}
                >
                  {metric.value}
                </ThemedText>
              </View>
            );
          })}
        </View>

        <View style={styles.importReadinessList}>
          {contract.items.map((item) => {
            const color =
              item.tone === "scholar"
                ? theme.scholar
                : item.tone === "warning"
                  ? theme.warning
                  : theme.primary;
            return (
              <View
                key={item.id}
                style={[
                  styles.importReadinessItem,
                  {
                    backgroundColor: `${color}0B`,
                    borderColor: `${color}28`,
                  },
                ]}
                testID={`library-review-evidence-import-readiness-${item.id}`}
              >
                <View
                  style={[
                    styles.importReadinessItemIcon,
                    { backgroundColor: `${color}16` },
                  ]}
                >
                  <AppIcon
                    name={item.icon as AppIconName}
                    size={13}
                    color={color}
                  />
                </View>
                <View style={styles.importReadinessItemCopy}>
                  <View style={styles.importReadinessItemTop}>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.text, fontWeight: "900" }}
                    >
                      {item.label}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color, fontWeight: "900" }}
                    >
                      {item.statusLabel}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textSecondary, lineHeight: 16 }}
                  >
                    {item.detail}
                  </ThemedText>
                  <View style={styles.importReadinessCommandRow}>
                    <AppIcon name="terminal" size={12} color={color} />
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{
                        color: theme.textMuted,
                        flex: 1,
                        lineHeight: 16,
                      }}
                    >
                      {item.commandLabel}
                    </ThemedText>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.importReadinessBoundary,
            {
              backgroundColor: `${theme.warning}0D`,
              borderColor: `${theme.warning}26`,
            },
          ]}
          testID="library-review-evidence-import-privacy-boundary"
        >
          <AppIcon name="lock" size={14} color={theme.warning} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {contract.privacyBoundaryLabel}
          </ThemedText>
        </View>
        <View
          style={[
            styles.importReadinessBoundary,
            {
              backgroundColor: `${theme.scholar}0B`,
              borderColor: `${theme.scholar}26`,
            },
          ]}
          testID="library-review-evidence-import-claim-boundary"
        >
          <AppIcon name="shield" size={14} color={theme.scholar} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {contract.claimBoundaryLabel}
          </ThemedText>
        </View>
      </View>
    );
  }

  function LibraryReviewDailyWorkPlanCard({
    onShare,
    plan,
  }: {
    onShare: () => void;
    plan: LibraryReviewDailyWorkPlan;
  }) {
    return (
      <View
        style={[
          styles.dailyWorkPlanCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: `${theme.scholar}32`,
          },
        ]}
        testID="library-review-daily-workplan"
        accessible
        accessibilityLabel={`${plan.title}. ${plan.statusLabel}. ${plan.noOverclaimBoundaryLabel}`}
      >
        <View style={styles.dailyWorkPlanHeader}>
          <View
            style={[
              styles.dailyWorkPlanIcon,
              { backgroundColor: `${theme.scholar}14` },
            ]}
          >
            <AppIcon name="calendar" size={18} color={theme.scholar} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              DAILY REVIEWER WORKPLAN
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {plan.statusLabel}
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textMuted, lineHeight: 17 }}
            >
              {plan.summary}
            </ThemedText>
          </View>
        </View>

        <View style={styles.dailyWorkPlanMetricRow}>
          {[
            { label: "Days", value: String(plan.dayCount) },
            { label: "Daily target", value: plan.dailyTargetLabel },
            { label: "First focus", value: plan.firstDayLabel },
          ].map((metric) => (
            <View
              key={metric.label}
              style={[
                styles.dailyWorkPlanMetric,
                {
                  backgroundColor: `${theme.scholar}0A`,
                  borderColor: `${theme.scholar}24`,
                },
              ]}
            >
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: theme.scholar, fontWeight: "900" }}
              >
                {metric.label}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={2}
                style={{ color: theme.textSecondary, lineHeight: 16 }}
              >
                {metric.value}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.dailyWorkPlanDayList}>
          {plan.days.slice(0, 4).map((day) => (
            <View
              key={day.id}
              style={[
                styles.dailyWorkPlanDay,
                {
                  backgroundColor: theme.surfaceGlassStrong,
                  borderColor: theme.border,
                },
              ]}
              testID={`library-review-daily-workplan-${day.id}`}
            >
              <View style={styles.dailyWorkPlanDayTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "900" }}
                  >
                    {day.dayLabel}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{
                      color: theme.text,
                      fontWeight: "900",
                      lineHeight: 17,
                    }}
                  >
                    {day.focusLabel}
                  </ThemedText>
                </View>
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: theme.primary, fontWeight: "900" }}
                >
                  {day.targetLabel}
                </ThemedText>
              </View>

              <View style={styles.dailyWorkPlanBookList}>
                {day.bookTitles.slice(0, 3).map((title) => (
                  <View key={title} style={styles.dailyWorkPlanBookRow}>
                    <AppIcon name="book-open" size={12} color={theme.primary} />
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.textSecondary, flex: 1 }}
                    >
                      {title}
                    </ThemedText>
                  </View>
                ))}
              </View>

              <View style={styles.dailyWorkPlanTaskList}>
                {day.tasks.map((task) => {
                  const color =
                    task.tone === "scholar"
                      ? theme.scholar
                      : task.tone === "warning"
                        ? theme.warning
                        : theme.primary;
                  return (
                    <View
                      key={task.id}
                      style={[
                        styles.dailyWorkPlanTask,
                        {
                          backgroundColor: `${color}0B`,
                          borderColor: `${color}24`,
                        },
                      ]}
                      testID={`library-review-daily-workplan-task-${task.id}`}
                    >
                      <View
                        style={[
                          styles.dailyWorkPlanTaskIcon,
                          { backgroundColor: `${color}16` },
                        ]}
                      >
                        <AppIcon
                          name={task.icon as AppIconName}
                          size={12}
                          color={color}
                        />
                      </View>
                      <View style={styles.dailyWorkPlanTaskCopy}>
                        <View style={styles.dailyWorkPlanTaskTop}>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.text, fontWeight: "900" }}
                          >
                            {task.ownerLabel}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color, fontWeight: "900" }}
                          >
                            {task.bookCount} books
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{ color: theme.textMuted, lineHeight: 16 }}
                        >
                          {task.acceptanceLabel}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.dailyWorkPlanBoundary}>
                <AppIcon name="lock" size={13} color={theme.warning} />
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{
                    color: theme.textSecondary,
                    flex: 1,
                    lineHeight: 17,
                  }}
                >
                  {day.evidenceBoundaryLabel}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.dailyWorkPlanClaimBoundary,
            {
              backgroundColor: `${theme.warning}0D`,
              borderColor: `${theme.warning}26`,
            },
          ]}
          testID="library-review-daily-workplan-claim-boundary"
        >
          <AppIcon name="shield" size={14} color={theme.warning} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {plan.noOverclaimBoundaryLabel}
          </ThemedText>
        </View>

        <Pressable
          onPress={onShare}
          style={({ pressed }) => [
            styles.dailyWorkPlanShareButton,
            {
              backgroundColor: `${theme.scholar}12`,
              borderColor: `${theme.scholar}35`,
            },
            pressed ? { opacity: 0.84, transform: [{ scale: 0.985 }] } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share Library daily reviewer workplan"
          testID="button-share-library-review-daily-workplan"
        >
          <AppIcon name="share-2" size={15} color={theme.scholar} />
          <ThemedText
            type="caption"
            style={{ color: theme.scholar, fontWeight: "900" }}
          >
            {plan.shareLabel}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  function LibraryReviewBookAcceptancePacketPanel({
    packets,
    onOpenBook,
    onSharePacket,
  }: {
    packets: LibraryReviewBookAcceptancePacket[];
    onOpenBook: (bookId: string) => void;
    onSharePacket: (packet: LibraryReviewBookAcceptancePacket) => void;
  }) {
    if (packets.length === 0) return null;

    return (
      <View
        style={[
          styles.bookAcceptancePanel,
          {
            backgroundColor: theme.cardBackground,
            borderColor: `${theme.scholar}34`,
          },
        ]}
        testID="library-review-book-acceptance-packet-panel"
        accessible
        accessibilityLabel="Library per-book reviewer acceptance packets"
      >
        <View style={styles.bookAcceptanceHeader}>
          <View
            style={[
              styles.bookAcceptanceIcon,
              { backgroundColor: `${theme.scholar}14` },
            ]}
          >
            <AppIcon name="book-open" size={18} color={theme.scholar} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              BOOK ACCEPTANCE PACKETS
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              Per-book evidence handoff
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              style={{ color: theme.textMuted, lineHeight: 17 }}
            >
              Each packet shows the exact missing stages and claim boundaries a
              reviewer must clear for one current book.
            </ThemedText>
          </View>
          <View
            style={[
              styles.publicationStatusPill,
              { borderColor: `${theme.scholar}42` },
            ]}
          >
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              {packets.length} ready
            </ThemedText>
          </View>
        </View>

        <View style={styles.bookAcceptanceList}>
          {packets.slice(0, 4).map((packet) => (
            <View
              key={packet.bookId}
              style={[
                styles.bookAcceptanceCard,
                {
                  backgroundColor: theme.surfaceGlassStrong,
                  borderColor: `${theme.scholar}2D`,
                },
              ]}
              testID={`library-review-book-acceptance-packet-${packet.bookId}`}
            >
              <View style={styles.bookAcceptanceCardTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText
                    type="small"
                    numberOfLines={2}
                    style={{ color: theme.text }}
                  >
                    {packet.title}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textMuted, lineHeight: 16 }}
                  >
                    {packet.category} - {packet.priorityLabel}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.bookAcceptanceStatus,
                    { borderColor: `${theme.scholar}38` },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{
                      color: theme.scholar,
                      fontWeight: "900",
                      textAlign: "center",
                    }}
                  >
                    {packet.statusLabel}
                  </ThemedText>
                </View>
              </View>

              <View
                style={[
                  styles.bookAcceptanceCommand,
                  {
                    backgroundColor: `${theme.primary}0A`,
                    borderColor: `${theme.primary}24`,
                  },
                ]}
              >
                <AppIcon name="terminal" size={12} color={theme.primary} />
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{
                    color: theme.textSecondary,
                    flex: 1,
                    lineHeight: 16,
                  }}
                >
                  {packet.exportCommandLabel}
                </ThemedText>
              </View>

              <View style={styles.bookAcceptanceStageList}>
                {packet.stages.slice(0, 3).map((stage) => {
                  const color =
                    stage.tone === "scholar"
                      ? theme.scholar
                      : stage.tone === "warning"
                        ? theme.warning
                        : theme.primary;
                  return (
                    <View
                      key={stage.id}
                      style={[
                        styles.bookAcceptanceStage,
                        {
                          backgroundColor: `${color}0B`,
                          borderColor: `${color}26`,
                        },
                      ]}
                      testID={`library-review-book-acceptance-stage-${stage.id}`}
                    >
                      <View
                        style={[
                          styles.bookAcceptanceStageIcon,
                          { backgroundColor: `${color}16` },
                        ]}
                      >
                        <AppIcon
                          name={stage.icon as AppIconName}
                          size={12}
                          color={color}
                        />
                      </View>
                      <View style={styles.bookAcceptanceStageCopy}>
                        <View style={styles.bookAcceptanceStageTop}>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color: theme.text, fontWeight: "900" }}
                          >
                            {stage.label}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            numberOfLines={1}
                            style={{ color, fontWeight: "900" }}
                          >
                            {stage.ownerLabel}
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{
                            color: theme.textSecondary,
                            lineHeight: 16,
                          }}
                        >
                          {stage.reviewerMustConfirmLabel}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          numberOfLines={2}
                          style={{ color: theme.textMuted, lineHeight: 16 }}
                        >
                          Boundary: {stage.claimBoundaryLabel}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View
                style={[
                  styles.bookAcceptanceBoundary,
                  {
                    backgroundColor: `${theme.warning}0D`,
                    borderColor: `${theme.warning}26`,
                  },
                ]}
                testID="library-review-book-acceptance-no-secret-boundary"
              >
                <AppIcon name="lock" size={13} color={theme.warning} />
                <ThemedText
                  type="caption"
                  numberOfLines={3}
                  style={{
                    color: theme.textSecondary,
                    flex: 1,
                    lineHeight: 17,
                  }}
                >
                  {packet.noSecretBoundaryLabel}
                </ThemedText>
              </View>

              <View style={styles.bookAcceptanceActions}>
                <Pressable
                  onPress={() => onOpenBook(packet.bookId)}
                  style={[
                    styles.bookAcceptanceActionButton,
                    { borderColor: theme.border },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${packet.title} review packet book`}
                  testID="button-open-library-book-acceptance-packet"
                >
                  <AppIcon name="book-open" size={14} color={theme.text} />
                  <ThemedText type="caption" style={{ color: theme.text }}>
                    Open book
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => onSharePacket(packet)}
                  style={[
                    styles.bookAcceptanceActionButton,
                    { borderColor: `${theme.scholar}35` },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Share ${packet.title} acceptance packet`}
                  testID="button-share-library-book-acceptance-packet"
                >
                  <AppIcon name="share-2" size={14} color={theme.scholar} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.scholar, fontWeight: "900" }}
                  >
                    {packet.shareLabel}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  function LibraryReviewBatchPanel({
    batches,
    onShareBatch,
  }: {
    batches: LibraryReviewEvidenceBatch[];
    onShareBatch: (batch: LibraryReviewEvidenceBatch) => void;
  }) {
    if (batches.length === 0) return null;

    return (
      <View
        style={[
          styles.reviewBatchPanel,
          {
            backgroundColor: theme.cardBackground,
            borderColor: `${theme.primary}30`,
          },
        ]}
        testID="library-review-evidence-batch-panel"
        accessible
        accessibilityLabel="Library review evidence batch planner"
      >
        <View style={styles.reviewBatchHeader}>
          <View
            style={[
              styles.reviewBatchIcon,
              { backgroundColor: `${theme.primary}14` },
            ]}
          >
            <AppIcon name="layers" size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{ color: theme.primary, fontWeight: "900" }}
            >
              REVIEWER BATCHES
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              Evidence handoffs by owner
            </ThemedText>
          </View>
          <View
            style={[
              styles.publicationStatusPill,
              { borderColor: `${theme.primary}42` },
            ]}
          >
            <ThemedText
              type="caption"
              style={{ color: theme.primary, fontWeight: "900" }}
            >
              {batches.length} lanes
            </ThemedText>
          </View>
        </View>
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, lineHeight: 18 }}
        >
          Share small, owner-specific batches so reviewers can clear evidence
          without mixing editorial, source, scholar, QA, and publish decisions.
        </ThemedText>

        <View style={styles.reviewBatchList}>
          {batches.map((batch) => (
            <View
              key={batch.id}
              style={[
                styles.reviewBatchCard,
                {
                  backgroundColor:
                    batch.id === "qualified_scholar"
                      ? `${theme.scholar}0C`
                      : theme.surfaceGlassStrong,
                  borderColor:
                    batch.id === "qualified_scholar"
                      ? `${theme.scholar}35`
                      : theme.border,
                },
              ]}
            >
              <View style={styles.reviewBatchCardTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText type="small" style={{ color: theme.text }}>
                    {batch.title}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{ color: theme.textMuted, lineHeight: 16 }}
                  >
                    {batch.ownerLabel} - {batch.description}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.reviewBatchCount,
                    {
                      borderColor:
                        batch.id === "qualified_scholar"
                          ? `${theme.scholar}40`
                          : `${theme.primary}35`,
                    },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color:
                        batch.id === "qualified_scholar"
                          ? theme.scholar
                          : theme.primary,
                      fontWeight: "900",
                    }}
                  >
                    {batch.bookCount}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, fontSize: 10 }}
                  >
                    books
                  </ThemedText>
                </View>
              </View>

              <View style={styles.reviewBatchBookList}>
                {batch.firstBookTitles.slice(0, 3).map((title) => (
                  <View key={title} style={styles.reviewBatchBookRow}>
                    <AppIcon
                      name="check-square"
                      size={12}
                      color={
                        batch.id === "qualified_scholar"
                          ? theme.scholar
                          : theme.primary
                      }
                    />
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.textSecondary, flex: 1 }}
                    >
                      {title}
                    </ThemedText>
                  </View>
                ))}
              </View>

              <View
                style={styles.reviewBatchAcceptance}
                testID={`library-review-batch-acceptance-${batch.id}`}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color:
                      batch.id === "qualified_scholar"
                        ? theme.scholar
                        : theme.primary,
                    fontWeight: "900",
                  }}
                >
                  Acceptance checklist
                </ThemedText>
                {batch.acceptanceChecklist.slice(0, 2).map((item) => (
                  <View key={item} style={styles.reviewBatchAcceptanceRow}>
                    <AppIcon
                      name="shield"
                      size={12}
                      color={
                        batch.id === "qualified_scholar"
                          ? theme.scholar
                          : theme.primary
                      }
                    />
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      style={{
                        color: theme.textSecondary,
                        flex: 1,
                        lineHeight: 16,
                      }}
                    >
                      {item}
                    </ThemedText>
                  </View>
                ))}
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, lineHeight: 16 }}
                >
                  {batch.proofBoundaryLabel}
                </ThemedText>
              </View>

              <Pressable
                onPress={() => onShareBatch(batch)}
                style={({ pressed }) => [
                  styles.reviewBatchShareButton,
                  {
                    borderColor:
                      batch.id === "qualified_scholar"
                        ? `${theme.scholar}35`
                        : `${theme.primary}35`,
                  },
                  pressed
                    ? { opacity: 0.84, transform: [{ scale: 0.985 }] }
                    : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${batch.shareLabel} for Library review`}
                testID="button-share-library-review-evidence-batch"
              >
                <AppIcon
                  name="share-2"
                  size={14}
                  color={
                    batch.id === "qualified_scholar"
                      ? theme.scholar
                      : theme.primary
                  }
                />
                <ThemedText
                  type="caption"
                  style={{
                    color:
                      batch.id === "qualified_scholar"
                        ? theme.scholar
                        : theme.primary,
                    fontWeight: "900",
                  }}
                >
                  {batch.shareLabel}
                </ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    );
  }

  function LibraryReviewEvidenceIntakeCard({
    runbook,
    onShare,
  }: {
    runbook: LibraryReviewEvidenceIntakeRunbook;
    onShare: () => void;
  }) {
    return (
      <View
        style={[
          styles.intakeRunbookCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: `${theme.scholar}34`,
          },
        ]}
        testID="library-review-evidence-intake-runbook"
        accessible
        accessibilityLabel="Library review evidence intake runbook"
      >
        <View style={styles.intakeRunbookTop}>
          <View
            style={[
              styles.intakeRunbookIcon,
              { backgroundColor: `${theme.scholar}14` },
            ]}
          >
            <AppIcon name="file-text" size={18} color={theme.scholar} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              EVIDENCE INTAKE RUNBOOK
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              Export, validate, import
            </ThemedText>
          </View>
          <View
            style={[
              styles.publicationStatusPill,
              { borderColor: `${theme.scholar}45` },
            ]}
          >
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              {runbook.reviewerPacketCount} books
            </ThemedText>
          </View>
        </View>

        <View style={styles.intakeRunbookStatus}>
          <ThemedText
            type="caption"
            style={{ color: theme.text, fontWeight: "900" }}
          >
            {runbook.statusLabel}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, lineHeight: 18 }}
          >
            {runbook.reviewerScopeLabel}
          </ThemedText>
        </View>

        <View
          style={[
            styles.intakeClaimBoundary,
            {
              backgroundColor: `${theme.warning}0D`,
              borderColor: `${theme.warning}26`,
            },
          ]}
          testID="library-review-evidence-claim-boundary"
        >
          <AppIcon name="lock" size={14} color={theme.warning} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {runbook.claimBoundaryLabel}
          </ThemedText>
        </View>

        <View style={styles.intakeCommandList}>
          {runbook.commandLines.slice(0, 4).map((command, index) => (
            <View
              key={`${command}-${index}`}
              style={[
                styles.intakeCommandRow,
                {
                  backgroundColor: theme.surfaceGlassStrong,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{ color: theme.scholar, fontWeight: "900" }}
              >
                {index + 1}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={2}
                style={{ color: theme.textSecondary, flex: 1, lineHeight: 17 }}
              >
                {command}
              </ThemedText>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.releaseGuardrail,
            {
              backgroundColor: `${theme.warning}10`,
              borderColor: `${theme.warning}28`,
            },
          ]}
        >
          <AppIcon name="shield" size={14} color={theme.warning} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, flex: 1, lineHeight: 18 }}
          >
            {runbook.guardrail}
          </ThemedText>
        </View>

        <Pressable
          onPress={onShare}
          style={({ pressed }) => [
            styles.handoffShareButton,
            {
              backgroundColor: `${theme.scholar}12`,
              borderColor: `${theme.scholar}35`,
            },
            pressed ? { opacity: 0.84, transform: [{ scale: 0.985 }] } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share Library review evidence intake runbook"
          testID="button-share-library-review-evidence-intake-runbook"
        >
          <AppIcon name="share-2" size={15} color={theme.scholar} />
          <ThemedText
            type="caption"
            style={{ color: theme.scholar, fontWeight: "900" }}
          >
            {runbook.shareLabel}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  function LibraryReviewStageContractPanel({
    contracts,
  }: {
    contracts: LibraryReviewStageContract[];
  }) {
    return (
      <View
        style={[
          styles.stageContractPanel,
          {
            backgroundColor: theme.cardBackground,
            borderColor: `${theme.scholar}34`,
          },
        ]}
        testID="library-review-stage-contract-panel"
        accessible
        accessibilityLabel="Library review stage contracts"
      >
        <View style={styles.stageContractHeader}>
          <View
            style={[
              styles.stageContractIcon,
              { backgroundColor: `${theme.scholar}14` },
            ]}
          >
            <AppIcon name="git-branch" size={18} color={theme.scholar} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              REVIEW STAGE CONTRACTS
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.text }}>
              What each reviewer clears
            </ThemedText>
          </View>
          <View
            style={[
              styles.publicationStatusPill,
              { borderColor: `${theme.scholar}45` },
            ]}
          >
            <ThemedText
              type="caption"
              style={{ color: theme.scholar, fontWeight: "900" }}
            >
              {contracts.length} stages
            </ThemedText>
          </View>
        </View>
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, lineHeight: 18 }}
        >
          Each stage has a different claim boundary. A book is not published,
          qualified-review complete, or highest-standard complete until the
          validated evidence file clears the required stages for its current
          content hash.
        </ThemedText>

        <View style={styles.stageContractList}>
          {contracts.map((contract) => {
            const color =
              contract.tone === "scholar"
                ? theme.scholar
                : contract.tone === "warning"
                  ? theme.warning
                  : theme.primary;
            return (
              <View
                key={contract.id}
                style={[
                  styles.stageContractCard,
                  {
                    backgroundColor: `${color}0B`,
                    borderColor: `${color}30`,
                  },
                ]}
                testID={`library-review-stage-contract-${contract.id}`}
              >
                <View style={styles.stageContractTop}>
                  <View
                    style={[
                      styles.stageContractRowIcon,
                      { backgroundColor: `${color}16` },
                    ]}
                  >
                    <AppIcon
                      name={contract.icon as AppIconName}
                      size={15}
                      color={color}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText type="small" style={{ color: theme.text }}>
                      {contract.label}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.textMuted }}
                    >
                      {contract.ownerLabel} - {contract.pending}/
                      {contract.total} pending
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.stageContractEvidenceList}>
                  {contract.requiredEvidenceFields.slice(0, 3).map((field) => (
                    <View key={field} style={styles.stageContractEvidenceRow}>
                      <AppIcon name="check" size={11} color={color} />
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={{ color: theme.textSecondary, flex: 1 }}
                      >
                        {field}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textSecondary, lineHeight: 17 }}
                >
                  {contract.reviewerMustConfirmLabel}
                </ThemedText>
                <View
                  style={[
                    styles.stageContractBoundary,
                    {
                      backgroundColor: `${color}0D`,
                      borderColor: `${color}26`,
                    },
                  ]}
                >
                  <AppIcon name="lock" size={12} color={color} />
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    style={{
                      color: theme.textMuted,
                      flex: 1,
                      lineHeight: 16,
                    }}
                  >
                    {contract.claimBoundaryLabel}
                  </ThemedText>
                </View>
                <ThemedText
                  type="caption"
                  numberOfLines={2}
                  style={{ color: theme.textMuted, lineHeight: 16 }}
                >
                  Reject if: {contract.rejectIfLabel}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>
    );
  }
}

function statusWeight(status: SourceReviewStatus): number {
  if (status === "needs_fix") return 0;
  if (status === "ready_for_review") return 1;
  return 2;
}

function borderForStatus(status: SourceReviewStatus, theme: any): string {
  if (status === "needs_fix") return `${theme.warning}44`;
  if (status === "approved") return `${theme.primary}44`;
  return `${theme.scholar}44`;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 120 },
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
  eyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 2,
  },
  title: {
    fontSize: 44,
    lineHeight: 50,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  publicationHandoffCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  releaseCockpitCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  releaseCockpitTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  releaseCockpitIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  releaseProgressBadge: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  releaseProgressTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  releaseProgressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  releaseLaneGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  releaseLaneCard: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 108,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 5,
  },
  releaseLaneTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  releaseGuardrail: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  sourcePackActivationCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sourcePackActivationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  sourcePackActivationIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sourcePackDraftSummary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  sourcePackDomainGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  sourcePackDomainCard: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 112,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  sourcePackDomainIcon: {
    width: 32,
    height: 32,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  sourcePackDomainCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  sourcePackDomainTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  sourcePackCommandStack: {
    gap: Spacing.sm,
  },
  sourcePackCommandRow: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.2)",
    backgroundColor: "rgba(86,179,148,0.055)",
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  sourcePackBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  sourcePackShareButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  reviewNextActionCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  reviewNextActionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  reviewNextActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewNextActionRows: {
    gap: Spacing.sm,
  },
  reviewNextActionRow: {
    minHeight: 42,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  reviewNextActionCommandRow: {
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(86,179,148,0.2)",
    backgroundColor: "rgba(86,179,148,0.06)",
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  reviewAcceptanceChecklist: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.22)",
    backgroundColor: "rgba(255,212,107,0.06)",
    padding: Spacing.sm,
    gap: 7,
  },
  reviewAcceptanceChecklistRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  reviewNextActionButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  acceptanceContractCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  acceptanceContractHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  acceptanceContractIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptanceContractSectionStack: {
    gap: Spacing.sm,
  },
  acceptanceContractSection: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.035)",
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  acceptanceContractRows: {
    gap: Spacing.xs,
  },
  acceptanceContractRow: {
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  acceptanceContractRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptanceContractRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  acceptanceContractRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  acceptanceContractBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  evidenceProofMatrixCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  evidenceProofMatrixHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  evidenceProofMatrixIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  evidenceProofMatrixActiveBlocker: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  evidenceProofMatrixRows: {
    gap: Spacing.sm,
  },
  evidenceProofMatrixRow: {
    minHeight: 132,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  evidenceProofMatrixRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  evidenceProofMatrixRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  evidenceProofMatrixRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  evidenceProofMatrixCommandRow: {
    minHeight: 34,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  evidenceProofMatrixBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  evidenceProofMatrixShareButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  reviewOpsPassportCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  reviewOpsPassportHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  reviewOpsPassportIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewOpsPassportMetricRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  reviewOpsPassportMetric: {
    flex: 1,
    minHeight: 74,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 4,
  },
  reviewOpsPassportCommand: {
    minHeight: 46,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.035)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  reviewOpsPassportLaneList: {
    gap: Spacing.sm,
  },
  reviewOpsPassportLane: {
    minHeight: 78,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  reviewOpsPassportLaneIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewOpsPassportLaneCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  reviewOpsPassportLaneTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  reviewOpsPassportBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  reviewOpsPassportShareButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  reviewSprintCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  reviewSprintHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  reviewSprintIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewSprintMetricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  reviewSprintMetric: {
    flexGrow: 1,
    flexBasis: "30%",
    minHeight: 66,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 4,
  },
  reviewSprintTaskList: {
    gap: Spacing.sm,
  },
  reviewSprintTask: {
    minHeight: 104,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  reviewSprintTaskIcon: {
    width: 32,
    height: 32,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewSprintTaskCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  reviewSprintTaskTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  reviewSprintCommandRow: {
    minHeight: 28,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  reviewSprintBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  reviewSprintShareButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  dailyWorkPlanCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  dailyWorkPlanHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  dailyWorkPlanIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyWorkPlanMetricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  dailyWorkPlanMetric: {
    flexGrow: 1,
    flexBasis: "30%",
    minHeight: 66,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 4,
  },
  dailyWorkPlanDayList: {
    gap: Spacing.sm,
  },
  dailyWorkPlanDay: {
    minHeight: 218,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  dailyWorkPlanDayTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  dailyWorkPlanBookList: {
    gap: 5,
  },
  dailyWorkPlanBookRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  dailyWorkPlanTaskList: {
    gap: Spacing.xs,
  },
  dailyWorkPlanTask: {
    minHeight: 72,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  dailyWorkPlanTaskIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyWorkPlanTaskCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  dailyWorkPlanTaskTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  dailyWorkPlanBoundary: {
    minHeight: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.22)",
    backgroundColor: "rgba(255,212,107,0.07)",
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  dailyWorkPlanClaimBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  dailyWorkPlanShareButton: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  importReadinessCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  importReadinessHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  importReadinessIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  importReadinessMetricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  importReadinessMetric: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 82,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 5,
  },
  importReadinessList: {
    gap: Spacing.sm,
  },
  importReadinessItem: {
    minHeight: 112,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  importReadinessItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  importReadinessItemCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  importReadinessItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  importReadinessCommandRow: {
    minHeight: 34,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  importReadinessBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  bookAcceptancePanel: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  bookAcceptanceHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  bookAcceptanceIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bookAcceptanceList: {
    gap: Spacing.sm,
  },
  bookAcceptanceCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  bookAcceptanceCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  bookAcceptanceStatus: {
    maxWidth: 116,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  bookAcceptanceCommand: {
    minHeight: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  bookAcceptanceStageList: {
    gap: Spacing.sm,
  },
  bookAcceptanceStage: {
    minHeight: 116,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  bookAcceptanceStageIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bookAcceptanceStageCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  bookAcceptanceStageTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  bookAcceptanceBoundary: {
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  bookAcceptanceActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  bookAcceptanceActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  reviewBatchPanel: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  reviewBatchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  reviewBatchIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewBatchList: {
    gap: Spacing.sm,
  },
  reviewBatchCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  reviewBatchCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  reviewBatchCount: {
    minWidth: 54,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    alignItems: "center",
  },
  reviewBatchBookList: {
    gap: 5,
  },
  reviewBatchBookRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  reviewBatchAcceptance: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,212,107,0.2)",
    backgroundColor: "rgba(255,212,107,0.05)",
    padding: Spacing.sm,
    gap: 6,
  },
  reviewBatchAcceptanceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  reviewBatchShareButton: {
    minHeight: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  stageContractPanel: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  stageContractHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  stageContractIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stageContractList: {
    gap: Spacing.sm,
  },
  stageContractCard: {
    minHeight: 190,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  stageContractTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  stageContractRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stageContractEvidenceList: {
    gap: 5,
  },
  stageContractEvidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  stageContractBoundary: {
    minHeight: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  intakeRunbookCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  intakeRunbookTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  intakeRunbookIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  intakeRunbookStatus: {
    gap: 4,
  },
  intakeClaimBoundary: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  intakeCommandList: {
    gap: Spacing.sm,
  },
  intakeCommandRow: {
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  publicationHandoffTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  publicationHandoffIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  publicationStatusPill: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  publicationChecklistGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  publicationGateMetric: {
    minWidth: "30%",
    flexGrow: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  handoffShareButton: {
    minHeight: 46,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  publicationQueueSection: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  publicationQueueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  publicationQueueCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  publicationQueueCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  publicationPriorityBadge: {
    maxWidth: 128,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  publicationMissingList: {
    gap: 6,
  },
  publicationMissingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  publicationQueueActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  queueActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  metricCard: {
    width: "47%",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  noticeCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  filterRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  filterChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  auditCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  auditHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  scholarStrip: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  issueList: {
    gap: Spacing.xs,
  },
  issueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  sourceList: {
    gap: Spacing.sm,
  },
  sourceRow: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  reviewEvidenceCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  decisionModalBody: {
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  decisionTarget: {
    gap: 4,
  },
  inputGroup: {
    gap: 8,
  },
  reviewInput: {
    minHeight: 120,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
  },
  evidenceGate: {
    minHeight: 38,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  disabledAction: {
    opacity: 0.48,
  },
});
