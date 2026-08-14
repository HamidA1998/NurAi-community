import AsyncStorage from "@react-native-async-storage/async-storage";

import type { NurAIPlanTier, SourceTrustCard } from "@shared/nuraiAI";
import { apiRequest } from "@/lib/query-client";
import { requestPersonalAIResponse } from "@/services/personalAIService";
import { recordPersonalAIChatBehavior } from "@/services/personalAIContextService";

const ACTIVE_CONVERSATION_KEY = "nurai_personal_guide_active_conversation_v1";
const SAVED_MESSAGE_IDS_KEY = "nurai_personal_guide_saved_message_ids_v1";
const LOCAL_CONVERSATIONS_KEY = "nurai_personal_guide_local_conversations_v2";
const ENABLE_LOCAL_PREVIEW_CONVERSATIONS =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_QA_AUTH_BYPASS === "true";
const SMOKE_RECOVERY_PROMPT = "[smoke:retry-once]";
const previewRecoveryFailures = new Set<string>();

export type PersonalGuideConversation = {
  id: number;
  title: string;
  createdAt: string;
  messages?: PersonalGuideMessage[];
};

export type PersonalGuideMessageMetadata = {
  citations?: unknown[];
  sourceCoverage?: string;
  needsScholar?: boolean;
  warnings?: string[];
  actionSteps?: string[];
  followUpPrompts?: string[];
  confidence?: string;
  actionPlan?: {
    primary?: { label?: string; route?: string; reason?: string };
  };
  clientMessageId?: string;
  replyToClientMessageId?: string;
};

export type PersonalGuideMessage = {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  metadata?: PersonalGuideMessageMetadata;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
  clientMessageId?: string;
};

export type PersonalGuideReply = {
  content: string;
  citations: SourceTrustCard[];
  warnings: string[];
  followUpPrompts: string[];
  practicalAction?: string;
  needsScholar: boolean;
};

type LocalPreviewConversationStore = {
  nextConversationId: number;
  nextMessageId: number;
  conversations: PersonalGuideConversation[];
};

const EMPTY_LOCAL_PREVIEW_STORE: LocalPreviewConversationStore = {
  nextConversationId: 1_000_000,
  nextMessageId: 2_000_000,
  conversations: [],
};

async function loadLocalPreviewStore(): Promise<LocalPreviewConversationStore> {
  const raw = await AsyncStorage.getItem(LOCAL_CONVERSATIONS_KEY);
  if (!raw) return { ...EMPTY_LOCAL_PREVIEW_STORE, conversations: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<LocalPreviewConversationStore>;
    return {
      nextConversationId: Number.isInteger(parsed.nextConversationId)
        ? Number(parsed.nextConversationId)
        : EMPTY_LOCAL_PREVIEW_STORE.nextConversationId,
      nextMessageId: Number.isInteger(parsed.nextMessageId)
        ? Number(parsed.nextMessageId)
        : EMPTY_LOCAL_PREVIEW_STORE.nextMessageId,
      conversations: Array.isArray(parsed.conversations)
        ? parsed.conversations
        : [],
    };
  } catch {
    return { ...EMPTY_LOCAL_PREVIEW_STORE, conversations: [] };
  }
}

async function saveLocalPreviewStore(
  store: LocalPreviewConversationStore,
): Promise<void> {
  await AsyncStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(store));
}

function buildLocalPreviewReply(content: string): PersonalGuideReply {
  const healthQuestion = /body|health|sleep|energy|water|recovery|strain/i.test(
    content,
  );
  if (healthQuestion) {
    return {
      content:
        "Your body signals are still syncing, so keep the next step gentle and observable: drink one glass of water, take a short calm walk if you feel able, and protect your next prayer without pushing through pain or unusual symptoms.",
      citations: [],
      warnings: [
        "This is general wellbeing support, not a diagnosis or medical treatment.",
      ],
      followUpPrompts: [
        "Help me plan a calm evening",
        "How can I protect sleep around prayer?",
      ],
      practicalAction: "Log one glass of water",
      needsScholar: false,
    };
  }

  return {
    content:
      "Choose one small action you can complete with sincerity today. Protect the next prayer, keep the action realistic, and return for a deeper source-aware explanation when your connected session is available.",
    citations: [],
    warnings: [],
    followUpPrompts: [
      "Help me plan my next prayer",
      "Give me one short reflection",
    ],
    practicalAction: "Protect the next prayer",
    needsScholar: false,
  };
}

function customerVisibleAction(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const label = value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!label) return undefined;
  if (
    /^(?:mode|location\/date|prayer settings|profile guidance|prayer|daily actions|quran(?: pace)?|arabic|saved ai answers|travel|body care|weather|dhikr|women's health|notifications)\s*:/i.test(
      label,
    ) ||
    /\bsubscription\s*:/i.test(label) ||
    /\b(?:visible app context|source rule|trust boundary|personal ai context)\b/i.test(
      label,
    )
  ) {
    return undefined;
  }
  return label.slice(0, 80).trim() || undefined;
}

async function buildFreeV3Reply(
  content: string,
  privateContextLines: string[] = [],
): Promise<PersonalGuideReply> {
  const data = await requestPersonalAIResponse({
    message: content,
    surface: "chat",
    feature: "personal-guide",
    userTier: "free",
    appContext: {
      summary: privateContextLines.slice(0, 12),
    },
  });
  const needsQualifiedGuidance =
    data.personalAI.actionPlan.primary.route === "Scholars";
  return {
    content: data.answer,
    citations: data.response.sourceCards || [],
    warnings: needsQualifiedGuidance
      ? [
          "This on-device guidance does not replace a qualified scholar or clinician.",
        ]
      : [],
    followUpPrompts: [],
    practicalAction: customerVisibleAction(
      data.personalAI.actionPlan.primary.label,
    ),
    needsScholar: needsQualifiedGuidance,
  };
}

function replyFromStoredPreviewMessage(
  message: PersonalGuideMessage,
): PersonalGuideReply {
  return {
    content: message.content,
    citations: normaliseCitations(message.metadata?.citations),
    warnings: cleanStringList(message.metadata?.warnings, 3),
    followUpPrompts: cleanStringList(message.metadata?.followUpPrompts, 3),
    practicalAction: customerVisibleAction(
      message.metadata?.actionPlan?.primary?.label,
    ),
    needsScholar: Boolean(message.metadata?.needsScholar),
  };
}

function cleanStringList(value: unknown, limit = 4): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

function normaliseCitations(value: unknown): SourceTrustCard[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).map((item, index) => {
    const raw =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const reference =
      typeof raw.reference === "string"
        ? raw.reference
        : typeof raw.title === "string"
          ? raw.title
          : typeof item === "string"
            ? item
            : undefined;
    const note =
      typeof raw.note === "string"
        ? raw.note
        : typeof raw.snippet === "string"
          ? raw.snippet
          : "Source used for this response.";
    return {
      state: "verified_source",
      label: reference || `Source ${index + 1}`,
      reference,
      note,
    };
  });
}

function activeConversationKey(tier: NurAIPlanTier): string {
  return `${ACTIVE_CONVERSATION_KEY}:${tier === "free" ? "local" : "cloud"}`;
}

function usesLocalV3(tier: NurAIPlanTier): boolean {
  return tier === "free" || ENABLE_LOCAL_PREVIEW_CONVERSATIONS;
}

export async function loadActivePersonalGuideConversationId(
  tier: NurAIPlanTier,
): Promise<number | null> {
  const value = await AsyncStorage.getItem(activeConversationKey(tier));
  const id = value ? Number(value) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function rememberActivePersonalGuideConversation(
  id: number | null,
  tier: NurAIPlanTier,
): Promise<void> {
  const key = activeConversationKey(tier);
  if (id == null) {
    await AsyncStorage.removeItem(key);
    return;
  }
  await AsyncStorage.setItem(key, String(id));
}

export async function createPersonalGuideConversation(
  title: string,
  tier: NurAIPlanTier,
): Promise<PersonalGuideConversation> {
  if (usesLocalV3(tier)) {
    const store = await loadLocalPreviewStore();
    const conversation: PersonalGuideConversation = {
      id: store.nextConversationId++,
      title: title.trim().slice(0, 72) || "Personal Guide",
      createdAt: new Date().toISOString(),
      messages: [],
    };
    store.conversations.unshift(conversation);
    await saveLocalPreviewStore(store);
    await rememberActivePersonalGuideConversation(conversation.id, tier);
    return conversation;
  }
  const response = await apiRequest("POST", "/api/conversations", {
    title: title.trim().slice(0, 72) || "Personal Guide",
  });
  const conversation = (await response.json()) as PersonalGuideConversation;
  await rememberActivePersonalGuideConversation(conversation.id, tier);
  return conversation;
}

export async function loadPersonalGuideConversation(
  id: number,
  tier: NurAIPlanTier,
): Promise<PersonalGuideConversation> {
  if (usesLocalV3(tier)) {
    const store = await loadLocalPreviewStore();
    const conversation = store.conversations.find((item) => item.id === id);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    return conversation;
  }
  const response = await apiRequest("GET", `/api/conversations/${id}`);
  return (await response.json()) as PersonalGuideConversation;
}

export async function sendPersonalGuideMessage(params: {
  conversationId: number;
  content: string;
  clientMessageId: string;
  tier: NurAIPlanTier;
  attachedContexts?: string[];
  privateContextLines?: string[];
  signal?: AbortSignal;
}): Promise<PersonalGuideReply> {
  // Store only a topic/style aggregate, never the raw prompt. This lets the
  // paid Home guide adapt to the user's conversations without creating a raw
  // chat transcript in the local personalisation context.
  await recordPersonalAIChatBehavior(params.content.trim()).catch(() => {});
  if (usesLocalV3(params.tier)) {
    const store = await loadLocalPreviewStore();
    const conversation = store.conversations.find(
      (item) => item.id === params.conversationId,
    );
    if (!conversation) throw new Error("Conversation not found");
    if (
      ENABLE_LOCAL_PREVIEW_CONVERSATIONS &&
      params.content.trim() === SMOKE_RECOVERY_PROMPT &&
      !previewRecoveryFailures.has(params.clientMessageId)
    ) {
      previewRecoveryFailures.add(params.clientMessageId);
      throw new Error(
        "Connection interrupted. Your message is ready to retry.",
      );
    }
    const messages = conversation.messages || [];
    const previousReply = messages.find(
      (message) =>
        message.role === "assistant" &&
        message.metadata?.replyToClientMessageId === params.clientMessageId,
    );
    if (previousReply) return replyFromStoredPreviewMessage(previousReply);

    if (
      !messages.some(
        (message) =>
          message.role === "user" &&
          message.metadata?.clientMessageId === params.clientMessageId,
      )
    ) {
      messages.push({
        id: store.nextMessageId++,
        conversationId: conversation.id,
        role: "user",
        content: params.content.trim(),
        metadata: { clientMessageId: params.clientMessageId },
        createdAt: new Date().toISOString(),
      });
    }
    const reply = ENABLE_LOCAL_PREVIEW_CONVERSATIONS
      ? buildLocalPreviewReply(params.content)
      : await buildFreeV3Reply(
          params.content,
          params.privateContextLines || params.attachedContexts,
        );
    messages.push({
      id: store.nextMessageId++,
      conversationId: conversation.id,
      role: "assistant",
      content: reply.content,
      metadata: {
        citations: reply.citations,
        warnings: reply.warnings,
        followUpPrompts: reply.followUpPrompts,
        needsScholar: reply.needsScholar,
        actionPlan: reply.practicalAction
          ? { primary: { label: reply.practicalAction } }
          : undefined,
        replyToClientMessageId: params.clientMessageId,
      },
      createdAt: new Date().toISOString(),
    });
    conversation.messages = messages;
    await saveLocalPreviewStore(store);
    return reply;
  }
  const response = await apiRequest(
    "POST",
    `/api/conversations/${params.conversationId}/messages`,
    {
      content: params.content.trim(),
      clientMessageId: params.clientMessageId,
      userTier: params.tier,
      modeId: "ask_nurai",
      appContext: {
        sourceRefs: params.attachedContexts?.slice(0, 4),
        recentActions: params.attachedContexts?.slice(0, 4),
        personalAI: params.privateContextLines?.length
          ? {
              needsToKnow: params.privateContextLines.slice(0, 5),
              behaviorSignals: params.privateContextLines.slice(5, 13),
            }
          : undefined,
      },
    },
    { signal: params.signal, timeoutMs: 45000 },
  );
  const raw = (await response.json()) as Record<string, unknown>;
  const personalAI =
    raw.personalAI && typeof raw.personalAI === "object"
      ? (raw.personalAI as Record<string, unknown>)
      : {};
  const actionPlan =
    personalAI.actionPlan && typeof personalAI.actionPlan === "object"
      ? (personalAI.actionPlan as Record<string, unknown>)
      : {};
  const primary =
    actionPlan.primary && typeof actionPlan.primary === "object"
      ? (actionPlan.primary as Record<string, unknown>)
      : {};
  return {
    content:
      typeof raw.content === "string"
        ? raw.content
        : typeof raw.response === "string"
          ? raw.response
          : "NurAI could not prepare a response yet.",
    citations: normaliseCitations(raw.citations ?? raw.sourceCards),
    warnings: cleanStringList(
      raw.warnings ?? (raw.caution ? [raw.caution] : []),
      3,
    ),
    followUpPrompts: cleanStringList(raw.followUpPrompts, 3),
    practicalAction: customerVisibleAction(
      typeof raw.practicalAction === "string"
        ? raw.practicalAction
        : primary.label,
    ),
    needsScholar: Boolean(
      raw.needsScholar ||
        (raw.ai as Record<string, unknown> | undefined)?.needsScholar,
    ),
  };
}

export async function deletePersonalGuideConversation(
  id: number,
  tier: NurAIPlanTier,
): Promise<void> {
  if (usesLocalV3(tier)) {
    const store = await loadLocalPreviewStore();
    store.conversations = store.conversations.filter((item) => item.id !== id);
    await saveLocalPreviewStore(store);
    await rememberActivePersonalGuideConversation(null, tier);
    return;
  }
  await apiRequest("DELETE", `/api/conversations/${id}`);
  await rememberActivePersonalGuideConversation(null, tier);
}

export async function loadSavedPersonalGuideMessageIds(): Promise<number[]> {
  const raw = await AsyncStorage.getItem(SAVED_MESSAGE_IDS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .filter((id): id is number => Number.isInteger(id) && id > 0)
          .slice(-100)
      : [];
  } catch {
    return [];
  }
}

export async function toggleSavedPersonalGuideMessageId(
  id: number,
): Promise<number[]> {
  const current = await loadSavedPersonalGuideMessageIds();
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id].slice(-100);
  await AsyncStorage.setItem(SAVED_MESSAGE_IDS_KEY, JSON.stringify(next));
  return next;
}
