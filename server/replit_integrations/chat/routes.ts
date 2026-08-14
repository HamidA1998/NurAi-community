import type { Express, Request, Response } from "express";
import type { AITextRequest } from "../../ai";
import { buildPersonalAIOrchestrator } from "../../ai/personalOrchestrator";
import { inferAIModeFromText, isAIModeId } from "../../ai/modes";
import { chatStorage } from "./storage";
import { aiMessageMetadata } from "./messageMetadata";
import {
  enforceAITextRateLimit,
  generateAITextWithUsageLogging,
} from "../../ai/httpControls";
import { CHAT_DAILY_AI_LIMITS, enforceDailyAIQuota } from "../../ai/dailyQuota";
import { sanitizeAIErrorMessage } from "../../ai/errorSanitizer";
import { requireAuthenticatedUser } from "../../requestAuth";
import { resolvePlanTierForUser } from "../../subscriptions";
import { buildChatSystemPrompt } from "../../ai/personalAIResponse";
import {
  buildChatFeatureFromText,
  buildStructuredAIResponseExtras,
  isSensitiveScholarReviewQuestion,
} from "../nurai-context/structuredResponse";

const VALID_CHAT_MADHABS = new Set(["hanafi", "maliki", "shafii", "hanbali"]);
const VALID_CHAT_LEVELS = new Set(["beginner", "intermediate", "advanced"]);
const VALID_CHAT_EMOTIONS = new Set([
  "sad",
  "struggling",
  "anxious",
  "lonely",
  "overwhelmed",
  "guilty",
  "calm",
  "grateful",
  "hopeful",
]);

function redactSensitiveChatText(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[redacted phone]")
    .replace(
      /\b(?:sk|pk|rk|xox[baprs]|ghp|gho|ghu|ghs)_[A-Za-z0-9_-]{12,}\b/g,
      "[redacted token]",
    )
    .replace(
      /\b(?:api[_-]?key|secret|token|password|passcode)\s*[:=]\s*\S+/gi,
      "[redacted secret]",
    );
}

function cleanChatText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = redactSensitiveChatText(value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[<>`{}]/g, "")
    .trim();
  if (!text) return undefined;
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}

function cleanChatTextList(
  value: unknown,
  maxItems: number,
  maxLength: number,
): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item: unknown) => cleanChatText(item, maxLength))
    .filter((item: string | undefined): item is string => Boolean(item))
    .slice(0, maxItems);
  return items.length > 0 ? items : undefined;
}

function cleanChatInt(
  value: unknown,
  min: number,
  max: number,
): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function chatMessageMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function normaliseChatUserProfile(value: unknown): Record<string, unknown> {
  const raw = value && typeof value === "object" ? (value as any) : {};
  const madhab = cleanChatText(raw.madhab, 24)?.toLowerCase();
  const userLevel = cleanChatText(raw.userLevel, 24)?.toLowerCase();
  return {
    displayName: cleanChatText(raw.displayName, 80),
    username: cleanChatText(raw.username, 80),
    madhab: madhab && VALID_CHAT_MADHABS.has(madhab) ? madhab : undefined,
    isRevert: raw.isRevert === true,
    daysSinceShahada: cleanChatInt(raw.daysSinceShahada, 0, 36500),
    userLevel:
      userLevel && VALID_CHAT_LEVELS.has(userLevel) ? userLevel : undefined,
  };
}

function normaliseChatSpiritualContext(
  value: unknown,
): Record<string, unknown> {
  const raw = value && typeof value === "object" ? (value as any) : {};
  const emotionalState = cleanChatText(raw.emotionalState, 32)?.toLowerCase();
  const streakCurrent = cleanChatInt(raw.streak?.current, 0, 10000);
  const quranProgress =
    raw.quranProgress && typeof raw.quranProgress === "object"
      ? {
          currentSurah: cleanChatInt(raw.quranProgress.currentSurah, 1, 114),
          currentAyah: cleanChatInt(raw.quranProgress.currentAyah, 1, 286),
        }
      : undefined;
  return {
    emotionalState:
      emotionalState && VALID_CHAT_EMOTIONS.has(emotionalState)
        ? emotionalState
        : undefined,
    streak: streakCurrent ? { current: streakCurrent } : undefined,
    quranProgress,
    prayerConsistency: cleanChatInt(raw.prayerConsistency, 0, 100),
  };
}

function normalisePersonalAIContext(
  value: unknown,
): Record<string, unknown> | undefined {
  const raw = value && typeof value === "object" ? (value as any) : null;
  if (!raw) return undefined;

  const learned =
    raw.learnedPreferences && typeof raw.learnedPreferences === "object"
      ? raw.learnedPreferences
      : {};
  const safeLearnedPreferences = {
    preferredAnswerStyle: cleanChatText(learned.preferredAnswerStyle, 40),
    topicFocus: cleanChatTextList(learned.topicFocus, 4, 40),
    strongestAppAreas: cleanChatTextList(learned.strongestAppAreas, 5, 80),
    reminderTone: cleanChatText(learned.reminderTone, 32),
  };

  return {
    memorySummary: cleanChatTextList(raw.memorySummary, 7, 160),
    behaviorSignals: cleanChatTextList(raw.behaviorSignals, 8, 160),
    needsToKnow: cleanChatTextList(raw.needsToKnow, 5, 180),
    recentActions: cleanChatTextList(raw.recentActions, 5, 80),
    learnedPreferences: safeLearnedPreferences,
  };
}

function normaliseChatAppContext(value: unknown): Record<string, unknown> {
  const raw = value && typeof value === "object" ? (value as any) : {};
  return {
    recentActions: Array.isArray(raw.recentActions)
      ? raw.recentActions
          .map((action: unknown) => cleanChatText(action, 80))
          .filter(Boolean)
          .slice(0, 5)
      : undefined,
    sourceRefs: Array.isArray(raw.sourceRefs)
      ? raw.sourceRefs
          .map((ref: unknown) => cleanChatText(ref, 120))
          .filter(Boolean)
          .slice(0, 8)
      : undefined,
    personalAI: normalisePersonalAIContext(raw.personalAI),
  };
}

export function registerChatRoutes(app: Express): void {
  // Get all conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      const conversations = await chatStorage.getAllConversations(user.id);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      const id = parseInt(req.params.id as string);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Invalid conversation id" });
      }

      const conversation = await chatStorage.getConversation(id, user.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id, user.id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      const { title } = req.body;
      const cleanTitle =
        typeof title === "string" && title.trim()
          ? title.trim().slice(0, 120)
          : "New Chat";
      const conversation = await chatStorage.createConversation(
        user.id,
        cleanTitle,
      );
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;

      const id = parseInt(req.params.id as string);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Invalid conversation id" });
      }

      const deleted = await chatStorage.deleteConversation(id, user.id);
      if (!deleted) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming)
  app.post(
    "/api/conversations/:id/messages",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;

        const conversationId = parseInt(req.params.id as string);
        const { content } = req.body;
        if (!Number.isInteger(conversationId)) {
          return res.status(400).json({ error: "Invalid conversation id" });
        }
        if (typeof content !== "string" || !content.trim()) {
          return res.status(400).json({ error: "Message content is required" });
        }
        const cleanContent = content.trim().slice(0, 8000);
        const clientMessageId = cleanChatText(req.body?.clientMessageId, 120);
        const conversation = await chatStorage.getConversation(
          conversationId,
          user.id,
        );
        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }

        const existingMessages = await chatStorage.getMessagesByConversation(
          conversationId,
          user.id,
        );
        const previousReply = clientMessageId
          ? existingMessages.find(
              (message) =>
                message.role === "assistant" &&
                chatMessageMetadata(message.metadata).replyToClientMessageId ===
                  clientMessageId,
            )
          : undefined;
        if (previousReply) {
          const metadata = chatMessageMetadata(previousReply.metadata);
          return res.json({
            content: previousReply.content,
            response: previousReply.content,
            citations: metadata.citations,
            sourceCoverage: metadata.sourceCoverage,
            needsScholar: metadata.needsScholar,
            warnings: metadata.warnings,
            actionSteps: metadata.actionSteps,
            actionPlan: metadata.actionPlan,
            followUpPrompts: metadata.followUpPrompts,
            confidence: metadata.confidence,
            personalAI: { actionPlan: metadata.actionPlan },
            replayed: true,
          });
        }

        const previousUserMessage = clientMessageId
          ? existingMessages.find(
              (message) =>
                message.role === "user" &&
                chatMessageMetadata(message.metadata).clientMessageId ===
                  clientMessageId,
            )
          : undefined;
        if (
          previousUserMessage &&
          previousUserMessage.content !== cleanContent
        ) {
          return res.status(409).json({
            error: "client_message_conflict",
            message:
              "This message could not be retried safely. Please send it again.",
          });
        }

        let responseTier;
        if (previousUserMessage) {
          responseTier = await resolvePlanTierForUser({
            user,
            assertedTier: req.body?.userTier,
          });
        } else {
          const dailyQuota = await enforceDailyAIQuota(res, {
            user,
            assertedTier: req.body?.userTier,
            limits: CHAT_DAILY_AI_LIMITS,
            limitReachedBody: (tier) => ({
              error: "daily_limit_reached",
              message:
                tier === "free"
                  ? "Free tier limit: 5 AI messages per day. Upgrade to Premium for higher limits."
                  : "Daily AI message limit reached. Limit resets at midnight.",
              remaining: 0,
            }),
          });
          if (!dailyQuota) return;
          responseTier = dailyQuota.userTier;
        }

        const aiRateLimit = await enforceAITextRateLimit(req, res);
        if (!aiRateLimit) return;

        if (!previousUserMessage) {
          await chatStorage.createMessage(
            conversationId,
            user.id,
            "user",
            cleanContent,
            clientMessageId ? { clientMessageId } : undefined,
          );
        }

        const messages = await chatStorage.getMessagesByConversation(
          conversationId,
          user.id,
        );

        const { userProfile, spiritualContext, appContext } = req.body;
        const safeUserProfile = normaliseChatUserProfile(userProfile);
        const safeSpiritualContext =
          normaliseChatSpiritualContext(spiritualContext);
        const safeAppContext = normaliseChatAppContext(appContext);
        const safeQuestionForMetadata = redactSensitiveChatText(
          cleanContent,
        ).slice(0, 600);
        const requestedMode = req.body?.modeId ?? req.body?.aiModeId;
        const inferredMode = inferAIModeFromText({
          message: cleanContent,
          appContext: safeAppContext,
          userProfile: safeUserProfile,
          spiritualContext: safeSpiritualContext,
        });
        const personalAI = await buildPersonalAIOrchestrator({
          user,
          tier: responseTier,
          requestedMode,
          fallbackMode: isAIModeId(requestedMode)
            ? "ask_nurai"
            : inferredMode.modeId,
          inferredMode,
          feature: "chat",
          question: cleanContent,
          userProfile: safeUserProfile,
          spiritualContext: safeSpiritualContext,
          appContext: safeAppContext,
          surface: "chat",
          useCase: "chat",
        });
        const personalAIContext = personalAI.context;

        const systemMessage = {
          role: "system" as const,
          content: buildChatSystemPrompt(personalAI.prompt),
        };

        const chatMessages = [
          systemMessage,
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ];

        const aiRequest: AITextRequest = {
          useCase: "chat",
          modeId: personalAIContext.mode.id,
          risk: isSensitiveScholarReviewQuestion(cleanContent)
            ? "sensitive"
            : personalAI.requestSettings.risk,
          modelPreference: personalAI.requestSettings.modelPreference,
          messages: chatMessages,
          maxOutputTokens: personalAI.requestSettings.maxOutputTokens || 650,
          metadata: {
            question: safeQuestionForMetadata,
            aiModeId: personalAIContext.mode.id,
            aiModeLabel: personalAIContext.mode.label,
            aiModeInferred: inferredMode,
            personalAI: personalAI.metadata,
            context: {
              ...safeAppContext,
              ...safeSpiritualContext,
              sourceRefs: safeAppContext.sourceRefs,
            },
          },
        };

        const completion = await generateAITextWithUsageLogging({
          req,
          request: aiRequest,
          rateLimit: aiRateLimit,
          metadata: {
            route: "/api/conversations/:id/messages",
            conversationId,
            tier: responseTier,
            aiModeId: personalAIContext.mode.id,
          },
        });

        const fullResponse =
          completion.text ||
          "I'm sorry, I couldn't generate a response. Please try again.";

        const feature = buildChatFeatureFromText(content);
        const structuredExtras = buildStructuredAIResponseExtras({
          response: fullResponse,
          feature,
          context: {
            ...safeAppContext,
            ...safeSpiritualContext,
            sourceRefs: safeAppContext.sourceRefs,
          },
          question: content,
          tier: responseTier,
          aiCitations: completion.citations,
          aiSourceCoverage: completion.sourceCoverage,
          aiNeedsScholar: completion.needsScholar,
          aiReview: completion.review,
          actionPlan: personalAI.actionPlan,
        });

        await chatStorage.createMessage(
          conversationId,
          user.id,
          "assistant",
          fullResponse,
          {
            ...aiMessageMetadata({ completion, structuredExtras }),
            replyToClientMessageId: clientMessageId,
          },
        );

        res.json({
          content: fullResponse,
          response: fullResponse,
          feature,
          ai: {
            provider: completion.provider,
            model: completion.model,
            modelTier: completion.modelTier,
            complexity: completion.complexity,
            mode: completion.mode,
            cached: completion.cached,
            fallbackUsed: completion.fallbackUsed,
            latencyMs: completion.latencyMs,
            usage: completion.usage,
            attemptedProviders: completion.attemptedProviders,
            routingReason: completion.routingReason,
            sourceCoverage: completion.sourceCoverage,
            needsScholar: completion.needsScholar,
            review: completion.review,
            modeId: personalAIContext.mode.id,
            modeLabel: personalAIContext.mode.label,
            modeAccess: {
              allowed: personalAIContext.modeAllowed,
              fallbackUsed: personalAIContext.modeFallbackUsed,
              requestedModeId: personalAIContext.requestedModeId,
            },
            inferredMode,
          },
          disclaimer:
            "NurAI provides general Islamic learning support, not personal fatwa. For sensitive rulings, consult a qualified scholar.",
          personalAI: {
            surface: personalAI.surface,
            intent: personalAI.intent,
            actionPlan: structuredExtras.actionPlan,
          },
          ...structuredExtras,
        });
      } catch (error) {
        console.error("Error sending message:", sanitizeAIErrorMessage(error));
        res.status(500).json({ error: "Failed to send message" });
      }
    },
  );
}
