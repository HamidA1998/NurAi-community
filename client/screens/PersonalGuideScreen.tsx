import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { NurAIPlanTier, SourceTrustCard } from "@shared/nuraiAI";
import {
  Aurora,
  NuraiBottomSheet,
  NuraiButton,
  NuraiDivider,
  NuraiGlass,
  NuraiIconButton,
  NuraiLoadingState,
  NuraiPill,
  NuraiSpace,
  NuraiState,
  NuraiToast,
  NuraiType,
} from "@/design-system";
import { NurAIPresence } from "@/components/NurAIPresence";
import { ApiRequestError } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/context/SubscriptionContext";
import { AuthContext } from "@/context/AuthContext";
import {
  createPersonalGuideConversation,
  deletePersonalGuideConversation,
  loadActivePersonalGuideConversationId,
  loadPersonalGuideConversation,
  loadSavedPersonalGuideMessageIds,
  rememberActivePersonalGuideConversation,
  sendPersonalGuideMessage,
  toggleSavedPersonalGuideMessageId,
  type PersonalGuideMessage,
  type PersonalGuideReply,
} from "@/services/personalGuideConversationService";
import type { PersonalGuideWeeklyReview } from "@/services/personalGuideReviewService";
import { AppIcon } from "@/components/icons";
import { resolvePersonalAIExperience } from "@/config/personalAIExperience";

type ScreenState =
  | "loading"
  | "ready"
  | "sending"
  | "offline"
  | "error"
  | "limit";

const STARTER_PROMPTS = [
  "Review my day and choose the next best step",
  "Explain a verse simply",
  "Give me a short reflection",
  "Help me build a better habit",
];

const CONTEXT_OPTIONS = [
  { id: "prayer", label: "Prayer schedule", icon: "prayer" as const },
  { id: "quran", label: "Quran progress", icon: "quran" as const },
  { id: "journey", label: "Recent app progress", icon: "activity" as const },
  { id: "saved", label: "Saved reflection", icon: "bookmark" as const },
];

type PersonalGuideInsightHandoff = {
  id: string;
  title: string;
  body: string;
  sourceLabel?: string;
  safetyNote?: string;
};

function routeInsight(value: unknown): PersonalGuideInsightHandoff | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const body = typeof raw.body === "string" ? raw.body.trim() : "";
  if (!title || !body) return null;
  return {
    id: typeof raw.id === "string" ? raw.id : "home-insight",
    title,
    body,
    sourceLabel:
      typeof raw.sourceLabel === "string" ? raw.sourceLabel.trim() : undefined,
    safetyNote:
      typeof raw.safetyNote === "string" ? raw.safetyNote.trim() : undefined,
  };
}

function routeWeeklyReview(value: unknown): PersonalGuideWeeklyReview | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<PersonalGuideWeeklyReview>;
  if (
    typeof raw.title !== "string" ||
    typeof raw.summary !== "string" ||
    !Array.isArray(raw.signals) ||
    !Array.isArray(raw.contextLines) ||
    typeof raw.prompt !== "string"
  ) {
    return null;
  }
  return raw as PersonalGuideWeeklyReview;
}

function reviewToneColor(
  tone: PersonalGuideWeeklyReview["signals"][number]["tone"],
  theme: ReturnType<typeof useTheme>["theme"],
) {
  if (tone === "progress") return theme.primary;
  if (tone === "attention") return theme.scholar;
  return theme.textSecondary;
}

function HomeInsightPanel({
  insight,
}: {
  insight: PersonalGuideInsightHandoff;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.homeInsight, { borderColor: theme.primaryBorder }]}>
      <NuraiGlass
        pointerEvents="none"
        radius={20}
        tint="rgba(7,26,25,0.62)"
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.homeInsightHeader}>
        <View style={styles.homeInsightIdentity}>
          <View
            style={[
              styles.homeInsightMark,
              {
                backgroundColor: theme.primaryMuted,
                borderColor: theme.primaryBorder,
              },
            ]}
          >
            <AppIcon name="nurai" size={16} color={theme.primary} accented />
          </View>
          <View>
            <Text style={[NuraiType.overline, { color: theme.primary }]}>
              FROM YOUR HOME CARD
            </Text>
            <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
              Full message
            </Text>
          </View>
        </View>
        <AppIcon name="arrow-down-right" size={17} color={theme.primary} />
      </View>
      <Text style={[styles.homeInsightTitle, { color: theme.text }]}>
        {insight.title}
      </Text>
      <Text selectable style={[styles.homeInsightBody, { color: theme.text }]}>
        {insight.body}
      </Text>
      {insight.sourceLabel || insight.safetyNote ? (
        <View style={styles.homeInsightFoot}>
          <AppIcon name="shield" size={13} color={theme.scholar} />
          <Text style={[NuraiType.caption, { color: theme.textSecondary }]}>
            {insight.safetyNote || insight.sourceLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function WeeklyReviewPanel({
  review,
  onAsk,
}: {
  review: PersonalGuideWeeklyReview;
  onAsk: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.weeklyReview, { borderColor: theme.borderSubtle }]}>
      <View style={styles.weeklyReviewHeader}>
        <View style={styles.weeklyReviewTitleWrap}>
          <Text style={[NuraiType.overline, { color: theme.scholar }]}>
            {review.windowLabel.toUpperCase()}
          </Text>
          <Text style={[styles.weeklyReviewTitle, { color: theme.text }]}>
            {review.title}
          </Text>
        </View>
        <View
          style={[
            styles.weeklyReviewBadge,
            { borderColor: `${theme.scholar}55` },
          ]}
        >
          <AppIcon name="calendar" size={13} color={theme.scholar} />
          <Text style={[NuraiType.caption, { color: theme.scholar }]}>
            {review.recordedDays}/7 recorded
          </Text>
        </View>
      </View>
      <Text
        style={[styles.weeklyReviewSummary, { color: theme.textSecondary }]}
      >
        {review.summary}
      </Text>
      <View style={styles.weeklySignals}>
        {review.signals.map((signal) => {
          const color = reviewToneColor(signal.tone, theme);
          return (
            <View key={signal.id} style={styles.weeklySignalRow}>
              <View
                style={[
                  styles.weeklySignalIcon,
                  { backgroundColor: `${color}18` },
                ]}
              >
                <AppIcon name={signal.icon} size={15} color={color} />
              </View>
              <View style={styles.weeklySignalCopy}>
                <View style={styles.weeklySignalTopline}>
                  <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
                    {signal.label}
                  </Text>
                  <Text style={[NuraiType.caption, { color }]}>
                    {signal.value}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.weeklySignalDetail,
                    { color: theme.textSecondary },
                  ]}
                >
                  {signal.detail}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={[styles.weeklyReviewNote, { color: theme.textMuted }]}>
        {review.sourceNote}
      </Text>
      <NuraiButton
        label="Ask NurAI to review my week"
        onPress={onAsk}
        variant="secondary"
        icon="arrow-right"
      />
    </View>
  );
}

function customerDayContextLine(line: string) {
  const normalized = line.replace(/\s+/g, " ").trim();
  if (/^Current moment:/i.test(normalized)) {
    return normalized.replace(/^Current moment:/i, "Next prayer ·");
  }
  if (/^Daily rhythm:/i.test(normalized)) {
    return normalized.replace(/^Daily rhythm:/i, "Daily rhythm ·");
  }
  if (/^Arabic and learning:/i.test(normalized)) {
    return normalized.replace(/^Arabic and learning:/i, "Arabic ·");
  }
  if (/^Journey and saved work:/i.test(normalized)) {
    return normalized.replace(/^Journey and saved work:/i, "Journey ·");
  }
  if (/^Wellbeing and weather:/i.test(normalized)) {
    return normalized.replace(/^Wellbeing and weather:/i, "Wellbeing ·");
  }
  if (/^Daily actions:/i.test(normalized)) {
    return normalized
      .replace(/^Daily actions:/i, "Daily essentials ·")
      .split(". Streaks:")[0];
  }
  if (/^Quran:/i.test(normalized)) {
    return normalized.replace(/^Quran:/i, "Quran ·").split("; completion")[0];
  }
  if (/^Arabic:/i.test(normalized)) {
    return normalized.replace(/^Arabic:/i, "Arabic ·");
  }
  if (/^Dhikr:/i.test(normalized)) {
    return normalized.replace(/^Dhikr:/i, "Dhikr ·");
  }
  if (/^Prayer:/i.test(normalized)) {
    return normalized.replace(/^Prayer:/i, "Next prayer ·");
  }
  if (/^Body care:/i.test(normalized) && !/none pending/i.test(normalized)) {
    return normalized.replace(/^Body care:/i, "Wellbeing ·");
  }
  if (/^Travel:/i.test(normalized) && !/inactive/i.test(normalized)) {
    return normalized.replace(/^Travel:/i, "Travel ·");
  }
  return null;
}

function isPreviewRecoveryFixture(content: string) {
  return /^\[smoke:[^\]]+\]$/i.test(content.trim());
}

function customerVisibleMessage(content: string) {
  if (isPreviewRecoveryFixture(content)) {
    return "Please try sending this message again.";
  }

  const normalized = content.replace(/\s+/g, " ").trim();
  if (
    /^This needs a careful answer with stronger verified support/i.test(
      normalized,
    )
  ) {
    return "I can share the general principle, but I do not have enough verified source context to answer the personal details safely. Add a little more context and I will keep the guidance focused. For a ruling specific to your circumstances, please consult a qualified scholar.";
  }
  if (
    /^(?:help me take this next step:\s*)?(?:mode|location\/date|prayer settings|profile guidance|prayer|daily actions|quran(?: pace)?|arabic|saved ai answers|travel|body care|weather|dhikr|women's health|notifications)\s*:/i.test(
      normalized,
    ) ||
    /\bsubscription\s*:/i.test(normalized)
  ) {
    return "Help me choose one clear next step today.";
  }
  return content;
}

function customerConversationMessages(messages: PersonalGuideMessage[]) {
  const fixtureReplyIds = new Set(
    messages
      .filter(
        (message) =>
          message.role === "user" && isPreviewRecoveryFixture(message.content),
      )
      .map((message) => message.metadata?.clientMessageId)
      .filter(Boolean),
  );

  return messages.filter(
    (message) =>
      !isPreviewRecoveryFixture(message.content) &&
      !fixtureReplyIds.has(message.metadata?.replyToClientMessageId),
  );
}

function messageSources(message: PersonalGuideMessage): SourceTrustCard[] {
  const citations = message.metadata?.citations;
  if (!Array.isArray(citations)) return [];
  return citations.slice(0, 4).map((item, index) => {
    const raw =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const label =
      typeof raw.reference === "string"
        ? raw.reference
        : typeof raw.title === "string"
          ? raw.title
          : typeof item === "string"
            ? item
            : `Source ${index + 1}`;
    return {
      state: "verified_source",
      label,
      reference: label,
      note:
        typeof raw.note === "string"
          ? raw.note
          : "Source used for this response.",
    };
  });
}

function messageWarning(message: PersonalGuideMessage): string | undefined {
  if (message.metadata?.needsScholar) {
    return "This may need a qualified scholar. NurAI can support learning, but it does not issue personal rulings.";
  }
  const warning = message.metadata?.warnings?.[0];
  if (!warning) return undefined;
  if (/available sources support|kept extra details separate/i.test(warning)) {
    return "General guidance only. Source support is limited for the exact personal details.";
  }
  if (/needs extra care|stronger source support/i.test(warning)) {
    return "Please verify the personal details with a qualified scholar.";
  }
  return warning;
}

function customerActionPrompt(action: string): string {
  const normalized = action.replace(/\s+/g, " ").trim();
  if (
    !normalized ||
    /^(?:mode|location\/date|prayer settings|profile guidance|prayer|daily actions|quran(?: pace)?|arabic|saved ai answers|travel|body care|weather|dhikr|women's health|notifications)\s*:/i.test(
      normalized,
    ) ||
    /\bsubscription\s*:/i.test(normalized)
  ) {
    return "Help me choose one clear next step today.";
  }
  if (/^(?:ask|help)\b/i.test(normalized)) return normalized;
  return `Help me ${normalized.charAt(0).toLowerCase()}${normalized.slice(1)}.`;
}

function friendlyError(error: unknown): {
  state: ScreenState;
  message: string;
} {
  if (error instanceof ApiRequestError) {
    if (error.status === 429 || error.code === "daily_limit_reached") {
      return { state: "limit", message: error.message };
    }
    if (error.status === 401)
      return { state: "error", message: "Please sign in again to continue." };
    return { state: "error", message: error.message };
  }
  const message = error instanceof Error ? error.message : "";
  if (/network|fetch|offline|timeout|abort/i.test(message)) {
    return {
      state: "offline",
      message: "NurAI could not reach the service. Your message is still here.",
    };
  }
  return {
    state: "error",
    message: "NurAI could not respond just now. Your message is still here.",
  };
}

export default function PersonalGuideScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { currentPlan } = useSubscription();
  const planTier = currentPlan as NurAIPlanTier;
  const aiExperience = useMemo(
    () => resolvePersonalAIExperience(planTier, "chat"),
    [planTier],
  );
  const { refreshUser } = useContext(AuthContext);
  const listRef = useRef<FlatList<PersonalGuideMessage>>(null);
  const requestRef = useRef<AbortController | null>(null);
  const retryEnvelopeRef = useRef<{
    content: string;
    clientMessageId: string;
  } | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<PersonalGuideMessage[]>([]);
  const [draft, setDraft] = useState(route.params?.visiblePrompt || "");
  const [state, setState] = useState<ScreenState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contextSheetOpen, setContextSheetOpen] = useState(false);
  const [sourceSheet, setSourceSheet] = useState<SourceTrustCard[] | null>(
    null,
  );
  const [attachedContexts, setAttachedContexts] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [lastReply, setLastReply] = useState<PersonalGuideReply | null>(null);
  const initialInsight = useMemo(
    () => routeInsight(route.params?.initialInsight),
    [route.params?.initialInsight],
  );
  const weeklyReview = useMemo(
    () => routeWeeklyReview(route.params?.weeklyReview),
    [route.params?.weeklyReview],
  );

  const recoverExpiredSession = useCallback(
    async (error: unknown) => {
      if (!(error instanceof ApiRequestError) || error.status !== 401) {
        return false;
      }
      await refreshUser();
      return true;
    },
    [refreshUser],
  );

  const contextLine =
    route.params?.contextLine ||
    (attachedContexts.length > 0
      ? `${attachedContexts.length} context item${attachedContexts.length === 1 ? "" : "s"} attached`
      : "Private by default. Attach only what helps.");
  const privateContextLines = useMemo(
    () =>
      Array.isArray(route.params?.privateContextLines)
        ? route.params.privateContextLines
            .map((line: unknown) =>
              typeof line === "string" ? line.trim().slice(0, 180) : "",
            )
            .filter(Boolean)
            .slice(0, 13)
        : [],
    [route.params?.privateContextLines],
  );
  const visibleDayContextLines = useMemo(
    () =>
      privateContextLines
        .map(customerDayContextLine)
        .filter(Boolean)
        .slice(0, 5) as string[],
    [privateContextLines],
  );
  const recommendationTitle =
    typeof route.params?.recommendationTitle === "string"
      ? route.params.recommendationTitle.trim()
      : "";
  const recommendationBody =
    typeof route.params?.recommendationBody === "string"
      ? route.params.recommendationBody.trim()
      : "";
  const failedMessageClearance = errorMessage
    ? NuraiSpace["5xl"] + NuraiSpace["2xl"]
    : NuraiSpace.lg;

  const initialise = useCallback(async () => {
    setState("loading");
    setErrorMessage(null);
    try {
      const [activeId, saved] = await Promise.all([
        loadActivePersonalGuideConversationId(planTier),
        loadSavedPersonalGuideMessageIds(),
      ]);
      setSavedIds(saved);
      if (!activeId) {
        setConversationId(null);
        setMessages([]);
        setState("ready");
        return;
      }
      try {
        const conversation = await loadPersonalGuideConversation(
          activeId,
          planTier,
        );
        setConversationId(activeId);
        setMessages(
          customerConversationMessages(conversation.messages || []).filter(
            (message) =>
              message.role === "user" || message.role === "assistant",
          ),
        );
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
          await rememberActivePersonalGuideConversation(null, planTier);
          setConversationId(null);
          setMessages([]);
        } else {
          throw error;
        }
      }
      setState("ready");
    } catch (error) {
      if (await recoverExpiredSession(error)) return;
      const next = friendlyError(error);
      setState(next.state);
      setErrorMessage(next.message);
    }
  }, [planTier, recoverExpiredSession]);

  useEffect(() => {
    initialise();
    return () => requestRef.current?.abort();
  }, [initialise]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!errorMessage || messages.length === 0) return;
    const frame = requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [errorMessage, messages.length]);

  const refreshConversation = useCallback(
    async (id: number) => {
      const conversation = await loadPersonalGuideConversation(id, planTier);
      setMessages(
        customerConversationMessages(conversation.messages || []).filter(
          (message) => message.role === "user" || message.role === "assistant",
        ),
      );
    },
    [planTier],
  );

  const submit = useCallback(
    async (value?: string) => {
      const content = (value ?? draft).trim();
      if (!content || state === "sending") return;
      const originalDraft = draft;
      const retryEnvelope = retryEnvelopeRef.current;
      const clientMessageId =
        retryEnvelope && retryEnvelope.content === content
          ? retryEnvelope.clientMessageId
          : `guide-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      setDraft("");
      setErrorMessage(null);
      setState("sending");
      const optimisticMessage: PersonalGuideMessage = {
        id: -Date.now(),
        conversationId: conversationId || -1,
        role: "user",
        content,
        metadata: {},
        createdAt: new Date().toISOString(),
        pending: true,
        clientMessageId,
      };
      setMessages((current) => [
        ...current.filter(
          (message) =>
            !message.failed || message.clientMessageId !== clientMessageId,
        ),
        optimisticMessage,
      ]);
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: true }),
      );
      const controller = new AbortController();
      requestRef.current = controller;
      try {
        let id = conversationId;
        if (!id) {
          const created = await createPersonalGuideConversation(
            content,
            planTier,
          );
          id = created.id;
          setConversationId(id);
        }
        const reply = await sendPersonalGuideMessage({
          conversationId: id,
          content,
          clientMessageId,
          tier: planTier,
          attachedContexts,
          privateContextLines,
          signal: controller.signal,
        });
        setLastReply(reply);
        retryEnvelopeRef.current = null;
        await refreshConversation(id);
        setState("ready");
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          setMessages((current) =>
            current.filter((message) => message.id !== optimisticMessage.id),
          );
          setDraft(content || originalDraft);
          setState("ready");
          return;
        }
        await recoverExpiredSession(error);
        const next = friendlyError(error);
        setState(next.state);
        setErrorMessage(next.message);
        setDraft(content || originalDraft);
        retryEnvelopeRef.current = { content, clientMessageId };
        setMessages((current) =>
          current.map((message) =>
            message.id === optimisticMessage.id
              ? { ...message, pending: false, failed: true }
              : message,
          ),
        );
        requestAnimationFrame(() =>
          listRef.current?.scrollToEnd({ animated: true }),
        );
      } finally {
        requestRef.current = null;
      }
    },
    [
      attachedContexts,
      conversationId,
      draft,
      privateContextLines,
      planTier,
      refreshConversation,
      recoverExpiredSession,
      state,
    ],
  );

  const clearConversation = useCallback(() => {
    const finish = async () => {
      requestRef.current?.abort();
      if (conversationId)
        await deletePersonalGuideConversation(conversationId, planTier).catch(
          () => undefined,
        );
      setConversationId(null);
      setMessages([]);
      setLastReply(null);
      setDraft("");
      setState("ready");
      setErrorMessage(null);
    };
    Alert.alert(
      "Start a new conversation?",
      "The current conversation will be deleted from your account.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete and start new", style: "destructive", onPress: finish },
      ],
    );
  }, [conversationId, planTier]);

  const renderMessage = useCallback(
    ({ item }: { item: PersonalGuideMessage }) => {
      const isUser = item.role === "user";
      const sources = messageSources(item);
      const warning = messageWarning(item);
      const saved = savedIds.includes(item.id);
      return (
        <View
          style={[
            styles.message,
            isUser ? styles.userMessageWrap : styles.guideMessageWrap,
          ]}
        >
          {isUser ? (
            <Text style={[NuraiType.overline, { color: theme.textMuted }]}>
              YOU
            </Text>
          ) : (
            <View style={styles.guideIdentity}>
              <View
                style={[
                  styles.guideMark,
                  {
                    backgroundColor: theme.primaryMuted,
                    borderColor: theme.primaryBorder,
                  },
                ]}
              >
                <AppIcon
                  name="nurai"
                  size={16}
                  color={theme.primary}
                  accented
                />
              </View>
              <Text style={[NuraiType.overline, { color: theme.primary }]}>
                NUR AI
              </Text>
              <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
                Personal guide
              </Text>
            </View>
          )}
          <View
            style={
              isUser
                ? [styles.userMessage, { backgroundColor: theme.userBubble }]
                : [
                    styles.guideMessage,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                      borderLeftColor: theme.primary,
                    },
                  ]
            }
          >
            <Text selectable style={[NuraiType.body, { color: theme.text }]}>
              {customerVisibleMessage(item.content)}
            </Text>
          </View>
          {isUser && (item.pending || item.failed) ? (
            <View style={styles.deliveryState}>
              <AppIcon
                name={item.failed ? "alert-circle" : "clock"}
                size={13}
                color={item.failed ? theme.error : theme.textMuted}
              />
              <Text
                style={[
                  NuraiType.caption,
                  { color: item.failed ? theme.error : theme.textMuted },
                ]}
                accessibilityLiveRegion="polite"
              >
                {item.failed ? "Not sent" : "Sending"}
              </Text>
              {item.failed ? (
                <Pressable
                  onPress={() => submit(item.content)}
                  accessibilityRole="button"
                  accessibilityLabel="Retry message"
                  style={styles.retryMessageButton}
                >
                  <Text style={[NuraiType.caption, { color: theme.primary }]}>
                    Try again
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {!isUser && sources.length > 0 ? (
            <Pressable
              onPress={() => setSourceSheet(sources)}
              accessibilityRole="button"
              accessibilityLabel={`View ${sources.length} sources`}
              style={styles.sourceButton}
            >
              <AppIcon name="book-open" size={14} color={theme.scholar} />
              <Text style={[NuraiType.caption, { color: theme.scholar }]}>
                {sources.length} source{sources.length === 1 ? "" : "s"}
              </Text>
            </Pressable>
          ) : null}
          {!isUser && warning ? (
            <View
              style={[styles.caution, { backgroundColor: theme.scholarSoft }]}
            >
              <AppIcon name="shield" size={14} color={theme.scholar} />
              <Text
                style={[
                  NuraiType.caption,
                  { color: theme.textSecondary, flex: 1 },
                ]}
              >
                {warning}
              </Text>
            </View>
          ) : null}
          {!isUser && item.id > 0 ? (
            <View
              style={[
                styles.messageActions,
                { borderTopColor: theme.borderSubtle },
              ]}
            >
              <Pressable
                onPress={async () => {
                  const next = await toggleSavedPersonalGuideMessageId(item.id);
                  setSavedIds(next);
                  setToast(
                    next.includes(item.id)
                      ? "Insight saved"
                      : "Removed from saved insights",
                  );
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  saved ? "Remove saved insight" : "Save insight"
                }
                accessibilityHint={
                  saved
                    ? "Removes this response from your saved insights"
                    : "Keeps this response in your saved insights"
                }
                style={({ pressed }) => [
                  styles.messageAction,
                  pressed ? styles.messageActionPressed : null,
                ]}
              >
                <AppIcon
                  name="bookmark"
                  size={16}
                  color={saved ? theme.scholar : theme.iconMuted}
                  weight={saved ? "fill" : "regular"}
                />
                <Text
                  style={[
                    styles.messageActionLabel,
                    { color: saved ? theme.scholar : theme.textSecondary },
                  ]}
                >
                  {saved ? "Saved" : "Save"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setDraft(
                    `Help me reflect on this without turning it into a ruling: ${customerVisibleMessage(item.content).slice(0, 180)}`,
                  );
                }}
                accessibilityRole="button"
                accessibilityLabel="Reflect on this"
                accessibilityHint="Copies this response into the composer so you can continue thoughtfully"
                style={({ pressed }) => [
                  styles.messageAction,
                  pressed ? styles.messageActionPressed : null,
                ]}
              >
                <AppIcon
                  name="edit-3"
                  size={16}
                  color={theme.primary}
                  weight="semibold"
                />
                <Text
                  style={[styles.messageActionLabel, { color: theme.primary }]}
                >
                  Reflect
                </Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Continue later"
                accessibilityHint="Leaves the guide and keeps this conversation available"
                style={({ pressed }) => [
                  styles.messageAction,
                  pressed ? styles.messageActionPressed : null,
                ]}
              >
                <AppIcon
                  name="clock"
                  size={16}
                  color={theme.iconMuted}
                  weight="semibold"
                />
                <Text
                  style={[
                    styles.messageActionLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Later
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      );
    },
    [navigation, savedIds, submit, theme],
  );

  const emptyHeader = useMemo(
    () => (
      <View style={styles.emptyContent}>
        {visibleDayContextLines.length ? (
          <View
            style={[styles.dayContext, { borderColor: theme.primaryBorder }]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={18}
              tint="rgba(7,26,25,0.58)"
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.dayContextHeader}>
              <View>
                <Text style={[NuraiType.overline, { color: theme.primary }]}>
                  TODAY IN VIEW
                </Text>
                <Text style={[styles.dayContextMode, { color: theme.text }]}>
                  {aiExperience.customerLabel}
                </Text>
              </View>
              <View
                style={[
                  styles.dayContextBadge,
                  { borderColor: theme.primaryBorder },
                ]}
              >
                <AppIcon
                  name={aiExperience.canUseCloudModel ? "zap" : "cpu"}
                  size={12}
                  color={theme.primary}
                />
                <Text
                  style={[styles.dayContextBadgeText, { color: theme.primary }]}
                >
                  {aiExperience.mode === "source_aware"
                    ? "Scholar"
                    : aiExperience.mode === "model_enhanced"
                      ? "Premium"
                      : "Free · on device"}
                </Text>
              </View>
            </View>
            {visibleDayContextLines.map((line) => (
              <View key={line} style={styles.dayContextRow}>
                <View
                  style={[
                    styles.dayContextDot,
                    { backgroundColor: theme.primary },
                  ]}
                />
                <Text
                  style={[
                    styles.dayContextLine,
                    { color: theme.textSecondary },
                  ]}
                >
                  {line}
                </Text>
              </View>
            ))}
            <Text
              style={[styles.dayContextFootnote, { color: theme.textMuted }]}
            >
              {aiExperience.customerDescription} NurAI never invents progress or
              private activity.
            </Text>
          </View>
        ) : null}
        {initialInsight ? <HomeInsightPanel insight={initialInsight} /> : null}
        {weeklyReview ? (
          <WeeklyReviewPanel
            review={weeklyReview}
            onAsk={() => submit(weeklyReview.prompt)}
          />
        ) : null}
        {!initialInsight && recommendationBody ? (
          <View
            style={[
              styles.recommendationCard,
              { borderColor: theme.primaryBorder },
            ]}
          >
            <NuraiGlass
              pointerEvents="none"
              radius={18}
              tint="rgba(7,26,25,0.55)"
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.recommendationHeader}>
              <AppIcon name="zap" size={14} color={theme.primary} />
              <Text
                style={[NuraiType.overline, { color: theme.primary }]}
                numberOfLines={1}
              >
                NUR AI · YOUR RECOMMENDATION
              </Text>
            </View>
            {recommendationTitle ? (
              <Text style={[styles.recommendationTitle, { color: theme.text }]}>
                {recommendationTitle}
              </Text>
            ) : null}
            <Text
              style={[
                styles.recommendationBody,
                { color: theme.textSecondary },
              ]}
            >
              {recommendationBody}
            </Text>
          </View>
        ) : null}
        <View style={styles.presenceWrap}>
          <NurAIPresence size={162} />
          <Text style={styles.presenceGreeting}>
            A calm place for your deen
          </Text>
          <Text style={styles.presenceSub}>
            Ask one clear question. NurAI keeps sources visible, uses only the
            context you add, and says when a scholar is the better guide.
          </Text>
          <View style={styles.privateLine}>
            <AppIcon name="lock" size={13} color={theme.primary} />
            <Text style={[NuraiType.caption, { color: theme.textMuted }]}>
              Private — your activity isn't attached unless you add it.
            </Text>
          </View>
        </View>
        <View style={styles.starters}>
          <Text style={[NuraiType.overline, { color: theme.textMuted }]}>
            START WITH ONE THING
          </Text>
          {STARTER_PROMPTS.map((prompt) => (
            <Pressable
              key={prompt}
              onPress={() => submit(prompt)}
              accessibilityRole="button"
              accessibilityLabel={prompt}
              style={({ pressed }) => [
                styles.starterRow,
                { borderBottomColor: theme.borderSubtle },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[NuraiType.body, { color: theme.text, flex: 1 }]}>
                {prompt}
              </Text>
              <AppIcon name="arrow-up-right" size={17} color={theme.primary} />
            </Pressable>
          ))}
        </View>
      </View>
    ),
    [
      aiExperience,
      recommendationBody,
      recommendationTitle,
      initialInsight,
      submit,
      theme,
      visibleDayContextLines,
      weeklyReview,
    ],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Aurora />
      <View style={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <NuraiIconButton
            icon="arrow-left"
            label="Go back"
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerCopy}>
            <Text style={[NuraiType.overline, { color: theme.primary }]}>
              NURAI
            </Text>
            <Text
              style={[NuraiType.sectionTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              Your private guide
            </Text>
            <Text
              style={[NuraiType.caption, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {contextLine}
            </Text>
          </View>
          <NuraiIconButton
            icon="trash-2"
            label="Start a new conversation"
            onPress={clearConversation}
            disabled={!conversationId && messages.length === 0}
          />
        </View>
        <NuraiDivider />
      </View>

      {state === "loading" ? (
        <NuraiLoadingState
          title="Preparing your guide"
          body="Restoring your conversation securely."
        />
      ) : messages.length === 0 && state !== "sending" && state !== "ready" ? (
        <NuraiState
          tone={
            state === "limit"
              ? "limit"
              : state === "offline"
                ? "offline"
                : "error"
          }
          title={
            state === "limit"
              ? "Daily guidance limit reached"
              : state === "offline"
                ? "You are offline"
                : "NurAI is unavailable"
          }
          body={errorMessage || "Please try again shortly."}
          actionLabel={state === "limit" ? "View plans" : "Try again"}
          onAction={
            state === "limit"
              ? () =>
                  navigation.navigate("Subscription", { initialTab: "premium" })
              : initialise
          }
        />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          ListHeaderComponent={
            messages.length === 0 ? (
              emptyHeader
            ) : (
              <View style={styles.conversationHeader}>
                <View style={styles.conversationIntro}>
                  <NuraiPill
                    label="Private conversation"
                    icon="lock"
                    tone="primary"
                  />
                  {privateContextLines.length ? (
                    <View style={styles.conversationContextLine}>
                      <AppIcon
                        name={aiExperience.canUseCloudModel ? "zap" : "cpu"}
                        size={13}
                        color={theme.primary}
                      />
                      <Text
                        style={[NuraiType.caption, { color: theme.textMuted }]}
                      >
                        {aiExperience.customerLabel}
                        {` · ${visibleDayContextLines.length || privateContextLines.length} visible signals attached`}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {initialInsight ? (
                  <HomeInsightPanel insight={initialInsight} />
                ) : null}
                {weeklyReview ? (
                  <WeeklyReviewPanel
                    review={weeklyReview}
                    onAsk={() => submit(weeklyReview.prompt)}
                  />
                ) : null}
              </View>
            )
          }
          ListFooterComponent={
            state === "sending" ? (
              <View style={styles.generating}>
                <View
                  style={[
                    styles.generatingDot,
                    { backgroundColor: theme.primary },
                  ]}
                />
                <Text
                  style={[NuraiType.bodySmall, { color: theme.textSecondary }]}
                >
                  NurAI is preparing a careful response…
                </Text>
                <Pressable
                  onPress={() => requestRef.current?.abort()}
                  accessibilityRole="button"
                  accessibilityLabel="Stop response"
                >
                  <Text style={[NuraiType.bodySmall, { color: theme.primary }]}>
                    Stop
                  </Text>
                </Pressable>
              </View>
            ) : lastReply?.practicalAction ? (
              <View style={styles.suggestedAction}>
                <Text style={[NuraiType.overline, { color: theme.textMuted }]}>
                  SUGGESTED ACTION
                </Text>
                <NuraiButton
                  label={lastReply.practicalAction}
                  onPress={() =>
                    setDraft(
                      customerActionPrompt(lastReply.practicalAction ?? ""),
                    )
                  }
                  variant="secondary"
                  icon="arrow-right"
                />
              </View>
            ) : null
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: failedMessageClearance },
          ]}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}
        />
      )}

      {errorMessage && messages.length > 0 ? (
        <View style={styles.inlineError}>
          <NuraiToast message={errorMessage} tone="error" />
        </View>
      ) : null}
      {toast ? (
        <View style={styles.inlineError}>
          <NuraiToast message={toast} tone="success" />
        </View>
      ) : null}

      <View
        style={[
          styles.composerWrap,
          {
            paddingBottom: Math.max(insets.bottom, NuraiSpace.xs),
            backgroundColor: "transparent",
            borderTopColor: "rgba(255,255,255,0.08)",
          },
        ]}
      >
        {attachedContexts.length > 0 ? (
          <View style={styles.attachedRow}>
            {attachedContexts.map((context) => (
              <NuraiPill key={context} label={context} tone="primary" />
            ))}
          </View>
        ) : null}
        <View
          style={[
            styles.composer,
            {
              backgroundColor: "transparent",
              borderColor: "rgba(255,255,255,0.12)",
            },
          ]}
        >
          <NuraiGlass
            style={StyleSheet.absoluteFill}
            radius={16}
            pointerEvents="none"
            tint="rgba(12,22,34,0.5)"
          />
          <NuraiIconButton
            icon="plus"
            label="Attach context"
            onPress={() => setContextSheetOpen(true)}
          />
          <TextInput
            testID="input-personal-guide-message"
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask one clear question"
            placeholderTextColor={theme.textMuted}
            multiline
            maxLength={4000}
            accessibilityLabel="Message NurAI"
            style={[NuraiType.body, styles.input, { color: theme.text }]}
          />
          <NuraiIconButton
            icon="arrow-up"
            label="Send message"
            onPress={() => submit()}
            disabled={!draft.trim() || state === "sending"}
            active={Boolean(draft.trim())}
          />
        </View>
      </View>

      <NuraiBottomSheet
        visible={contextSheetOpen}
        title="Attach context"
        onClose={() => setContextSheetOpen(false)}
      >
        <Text
          style={[
            NuraiType.bodySmall,
            { color: theme.textSecondary, marginBottom: NuraiSpace.sm },
          ]}
        >
          NurAI will use only the items you select for this conversation.
        </Text>
        {CONTEXT_OPTIONS.map((option) => {
          const selected = attachedContexts.includes(option.label);
          return (
            <Pressable
              key={option.id}
              onPress={() =>
                setAttachedContexts((current) =>
                  selected
                    ? current.filter((item) => item !== option.label)
                    : [...current, option.label],
                )
              }
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={option.label}
              style={styles.sheetRow}
            >
              <AppIcon
                name={option.icon}
                size={18}
                color={selected ? theme.primary : theme.iconMuted}
              />
              <Text style={[NuraiType.body, { color: theme.text, flex: 1 }]}>
                {option.label}
              </Text>
              <AppIcon
                name={selected ? "check-circle" : "circle"}
                size={19}
                color={selected ? theme.primary : theme.iconMuted}
              />
            </Pressable>
          );
        })}
        <NuraiButton
          label="Use selected context"
          onPress={() => setContextSheetOpen(false)}
          style={{ marginTop: NuraiSpace.md }}
        />
      </NuraiBottomSheet>

      <NuraiBottomSheet
        visible={Boolean(sourceSheet)}
        title="Sources"
        onClose={() => setSourceSheet(null)}
      >
        {(sourceSheet || []).map((source, index) => (
          <View key={`${source.label}-${index}`} style={styles.sourceSheetRow}>
            <View
              style={[
                styles.sourceIndex,
                { backgroundColor: theme.scholarSoft },
              ]}
            >
              <Text style={[NuraiType.caption, { color: theme.scholar }]}>
                {index + 1}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                selectable
                style={[NuraiType.bodySmall, { color: theme.text }]}
              >
                {source.reference || source.label}
              </Text>
              <Text
                selectable
                style={[NuraiType.caption, { color: theme.textSecondary }]}
              >
                {source.note}
              </Text>
            </View>
          </View>
        ))}
      </NuraiBottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: NuraiSpace.md,
    gap: NuraiSpace.sm,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: NuraiSpace.lg,
    paddingTop: NuraiSpace.md,
    gap: NuraiSpace.xl,
  },
  emptyContent: { gap: NuraiSpace.xl },
  conversationHeader: { gap: NuraiSpace.lg },
  homeInsight: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: NuraiSpace.lg,
    gap: NuraiSpace.sm,
    overflow: "hidden",
  },
  homeInsightHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: NuraiSpace.sm,
  },
  homeInsightIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  homeInsightMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  homeInsightTitle: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 20,
    lineHeight: 28,
  },
  homeInsightBody: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 16,
    lineHeight: 25,
  },
  homeInsightFoot: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: NuraiSpace.xs,
    paddingTop: NuraiSpace.xs,
  },
  weeklyReview: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: NuraiSpace.lg,
    gap: NuraiSpace.md,
  },
  weeklyReviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: NuraiSpace.sm,
  },
  weeklyReviewTitleWrap: { flex: 1, gap: 3 },
  weeklyReviewTitle: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 20,
    lineHeight: 28,
  },
  weeklyReviewBadge: {
    minHeight: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: NuraiSpace.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  weeklyReviewSummary: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  weeklySignals: { gap: NuraiSpace.sm },
  weeklySignalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: NuraiSpace.sm,
  },
  weeklySignalIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  weeklySignalCopy: { flex: 1, gap: 2 },
  weeklySignalTopline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: NuraiSpace.sm,
  },
  weeklySignalDetail: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11.5,
    lineHeight: 17,
  },
  weeklyReviewNote: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10.5,
    lineHeight: 16,
  },
  dayContext: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: NuraiSpace.md,
    gap: NuraiSpace.sm,
    overflow: "hidden",
  },
  dayContextHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: NuraiSpace.sm,
  },
  dayContextMode: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 16,
    lineHeight: 23,
  },
  dayContextBadge: {
    minHeight: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dayContextBadgeText: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 9.5 },
  dayContextRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  dayContextDot: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  dayContextLine: {
    flex: 1,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11.5,
    lineHeight: 18,
  },
  dayContextFootnote: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10,
    lineHeight: 16,
  },
  contextCard: { gap: NuraiSpace.sm },
  recommendationCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: NuraiSpace.lg,
    gap: NuraiSpace.sm,
    overflow: "hidden",
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recommendationTitle: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 18,
    lineHeight: 25,
  },
  recommendationBody: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    lineHeight: 23,
  },
  presenceWrap: {
    alignItems: "center",
    gap: NuraiSpace.xs,
    paddingTop: NuraiSpace.sm,
  },
  presenceGreeting: {
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 24,
    lineHeight: 32,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: NuraiSpace.xs,
  },
  presenceSub: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(230,240,251,0.72)",
    textAlign: "center",
    maxWidth: 320,
  },
  privateLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.xs,
    paddingTop: NuraiSpace.xs,
  },
  starters: { gap: NuraiSpace.xs },
  starterRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  conversationIntro: { paddingBottom: NuraiSpace.xs, gap: NuraiSpace.xs },
  conversationContextLine: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  message: { gap: NuraiSpace.sm },
  userMessageWrap: {
    alignSelf: "flex-end",
    maxWidth: "86%",
    alignItems: "flex-end",
  },
  guideMessageWrap: { alignSelf: "stretch", maxWidth: "96%" },
  guideIdentity: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.xs,
  },
  guideMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  guideMessage: {
    paddingHorizontal: NuraiSpace.md,
    paddingVertical: NuraiSpace.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    borderRadius: 18,
    borderTopLeftRadius: 7,
    overflow: "hidden",
  },
  userMessage: {
    paddingHorizontal: NuraiSpace.md,
    paddingVertical: NuraiSpace.sm,
    borderRadius: 14,
    borderBottomRightRadius: 4,
  },
  deliveryState: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
  retryMessageButton: {
    minHeight: 44,
    paddingHorizontal: NuraiSpace.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.xs,
    alignSelf: "flex-start",
  },
  caution: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: NuraiSpace.xs,
    padding: NuraiSpace.sm,
    borderRadius: 12,
  },
  messageActions: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: NuraiSpace.xs,
    marginTop: 2,
    gap: NuraiSpace.xs,
  },
  messageAction: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  messageActionPressed: {
    opacity: 0.68,
  },
  messageActionLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    lineHeight: 16,
  },
  generating: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.xs,
  },
  generatingDot: { width: 8, height: 8, borderRadius: 4 },
  suggestedAction: { gap: NuraiSpace.xs, paddingTop: NuraiSpace.sm },
  inlineError: {
    marginHorizontal: NuraiSpace.lg,
    paddingBottom: NuraiSpace.xs,
  },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: NuraiSpace.sm,
    paddingTop: NuraiSpace.xs,
    gap: NuraiSpace.xs,
  },
  attachedRow: { flexDirection: "row", flexWrap: "wrap", gap: NuraiSpace.xs },
  composer: {
    minHeight: 58,
    maxHeight: 150,
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 6,
    gap: 4,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 126,
    paddingHorizontal: NuraiSpace.xs,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sheetRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  sourceSheetRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: NuraiSpace.sm,
    paddingVertical: NuraiSpace.xs,
  },
  sourceIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
