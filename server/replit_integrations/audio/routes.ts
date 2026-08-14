import express, { type Express, type Request, type Response } from "express";
import type { AITextRequest } from "../../ai";
import {
  enforceAITextRateLimit,
  generateAITextWithUsageLogging,
} from "../../ai/httpControls";
import { sanitizeAIErrorMessage } from "../../ai/errorSanitizer";
import {
  CHAT_DAILY_AI_LIMITS,
  CONTEXTUAL_DAILY_AI_LIMITS,
  enforceDailyAIQuota,
} from "../../ai/dailyQuota";
import { requireAuthenticatedUser } from "../../requestAuth";
import { aiMessageMetadata } from "../chat/messageMetadata";
import { chatStorage } from "../chat/storage";
import {
  buildChatFeatureFromText,
  buildStructuredAIResponseExtras,
} from "../nurai-context/structuredResponse";
import { speechToText, ensureCompatibleFormat, textToSpeech } from "./client";

// Body parser with 50MB limit for audio payloads
const audioBodyParser = express.json({ limit: "50mb" });
const TTS_VOICES = [
  "alloy",
  "ash",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
] as const;
type TTSVoice = (typeof TTS_VOICES)[number];
const ALLOWED_TTS_VOICES = new Set<string>(TTS_VOICES);
const VOICE_CHAT_VOICES = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
] as const;
type VoiceChatVoice = (typeof VOICE_CHAT_VOICES)[number];
const ALLOWED_VOICE_CHAT_VOICES = new Set<string>(VOICE_CHAT_VOICES);

function isTTSVoice(value: unknown): value is TTSVoice {
  return typeof value === "string" && ALLOWED_TTS_VOICES.has(value);
}

function isVoiceChatVoice(value: unknown): value is VoiceChatVoice {
  return typeof value === "string" && ALLOWED_VOICE_CHAT_VOICES.has(value);
}

export function registerAudioRoutes(app: Express): void {
  app.post(
    "/api/audio/tts",
    audioBodyParser,
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;

        const aiRateLimit = await enforceAITextRateLimit(req, res, {
          namespace: "ai:tts",
          windowMs: 60_000,
          maxRequests: 8,
        });
        if (!aiRateLimit) return;

        const { text, voice = "onyx" } = req.body as {
          text?: string;
          voice?:
            | "alloy"
            | "ash"
            | "coral"
            | "echo"
            | "fable"
            | "onyx"
            | "nova"
            | "sage"
            | "shimmer"
            | "verse"
            | "marin"
            | "cedar";
        };
        const cleanText = typeof text === "string" ? text.trim() : "";
        if (!cleanText) {
          return res.status(400).json({ error: "Text is required" });
        }
        if (cleanText.length > 4000) {
          return res
            .status(400)
            .json({ error: "Text is too long for narration" });
        }
        if (!isTTSVoice(voice)) {
          return res.status(400).json({ error: "Unsupported narration voice" });
        }

        const dailyQuota = await enforceDailyAIQuota(res, {
          user,
          assertedTier: req.body?.userTier,
          limits: CONTEXTUAL_DAILY_AI_LIMITS,
          upgradeRequiredBody: {
            error: "upgrade_required",
            message: "Premium unlocks AI narration and offline audio.",
            upgradeRequired: true,
          },
          limitReachedBody: (tier) => ({
            error: "daily_limit_reached",
            message:
              tier === "free"
                ? "Premium unlocks AI narration and offline audio."
                : "Daily AI limit reached. Limit resets at midnight.",
            remaining: 0,
          }),
        });
        if (!dailyQuota) return;

        const audio = await textToSpeech(cleanText, voice, "mp3");
        res.json({
          audio: audio.toString("base64"),
          format: "mp3",
          mimeType: "audio/mpeg",
        });
      } catch (error) {
        console.error(
          "Error generating narration:",
          sanitizeAIErrorMessage(error),
        );
        res.status(503).json({
          error: "narration_unavailable",
          message:
            "Narration is temporarily unavailable. You can still read the chapter and try audio again later.",
        });
      }
    },
  );

  // Send voice message through the grounded text router, then narrate the answer.
  // Auto-detects audio format and converts WebM/MP4/OGG to WAV
  app.post(
    "/api/conversations/:id/audio-messages",
    audioBodyParser,
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;

        const conversationId = parseInt(String(req.params.id));
        const { audio, voice = "alloy" } = req.body;

        if (!Number.isInteger(conversationId)) {
          return res.status(400).json({ error: "Invalid conversation id" });
        }
        const conversation = await chatStorage.getConversation(
          conversationId,
          user.id,
        );
        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }

        if (!audio) {
          return res
            .status(400)
            .json({ error: "Audio data (base64) is required" });
        }
        if (typeof audio !== "string" || audio.length > 48_000_000) {
          return res.status(400).json({ error: "Audio payload is too large" });
        }
        if (!isVoiceChatVoice(voice)) {
          return res.status(400).json({ error: "Unsupported voice" });
        }

        const aiRateLimit = await enforceAITextRateLimit(req, res);
        if (!aiRateLimit) return;

        const dailyQuota = await enforceDailyAIQuota(res, {
          user,
          assertedTier: req.body?.userTier,
          limits: CHAT_DAILY_AI_LIMITS,
          limitReachedBody: (tier) => ({
            error: "daily_limit_reached",
            message:
              tier === "free"
                ? "Free tier limit: 5 AI voice messages per day. Upgrade to Premium for higher limits."
                : "Daily AI limit reached. Limit resets at midnight.",
            remaining: 0,
          }),
        });
        if (!dailyQuota) return;

        // 1. Auto-detect format and convert to OpenAI-compatible format
        const rawBuffer = Buffer.from(audio, "base64");
        const { buffer: audioBuffer, format: inputFormat } =
          await ensureCompatibleFormat(rawBuffer);

        // 2. Transcribe user audio
        const userTranscript = await speechToText(audioBuffer, inputFormat);

        // 3. Save user message
        await chatStorage.createMessage(
          conversationId,
          user.id,
          "user",
          userTranscript,
        );

        // 4. Get conversation history
        const existingMessages = await chatStorage.getMessagesByConversation(
          conversationId,
          user.id,
        );
        const chatHistory = existingMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        // 5. Set up SSE
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        res.write(
          `data: ${JSON.stringify({ type: "user_transcript", data: userTranscript })}\n\n`,
        );

        const aiRequest: AITextRequest = {
          useCase: "chat",
          risk: "religious",
          modelPreference: "auto",
          messages: [
            {
              role: "system",
              content:
                "You are NurAI, a warm Islamic learning companion. Give concise, source-aware answers. Do not invent Quran, hadith, tafsir, scholar, book, madhhab, grade, or reference numbers. For personal rulings, give general principles and recommend a qualified scholar.",
            },
            ...chatHistory,
          ],
          maxOutputTokens: 900,
          temperature: 0.5,
          metadata: {
            question: userTranscript,
            feature: "voice_chat",
          },
        };

        const completion = await generateAITextWithUsageLogging({
          req,
          request: aiRequest,
          rateLimit: aiRateLimit,
          metadata: {
            route: "/api/conversations/:id/audio-messages",
            conversationId,
          },
        });

        const assistantTranscript = completion.text;
        const responseTier = dailyQuota.userTier;
        const feature = buildChatFeatureFromText(userTranscript);
        const structuredExtras = buildStructuredAIResponseExtras({
          response: assistantTranscript,
          feature,
          question: userTranscript,
          tier: responseTier,
          aiCitations: completion.citations,
          aiSourceCoverage: completion.sourceCoverage,
          aiNeedsScholar: completion.needsScholar,
          aiReview: completion.review,
        });

        res.write(
          `data: ${JSON.stringify({ type: "transcript", data: assistantTranscript })}\n\n`,
        );

        const audioResponse = await textToSpeech(
          assistantTranscript,
          voice,
          "pcm16",
        );
        res.write(
          `data: ${JSON.stringify({ type: "audio", data: audioResponse.toString("base64") })}\n\n`,
        );

        // 6. Save assistant message
        await chatStorage.createMessage(
          conversationId,
          user.id,
          "assistant",
          assistantTranscript,
          aiMessageMetadata({ completion, structuredExtras }),
        );

        res.write(
          `data: ${JSON.stringify({
            type: "done",
            transcript: assistantTranscript,
            citations: structuredExtras.citations,
            sourceCoverage: structuredExtras.sourceCoverage,
            needsScholar: structuredExtras.needsScholar,
            warnings: structuredExtras.warnings,
            ai: {
              provider: completion.provider,
              model: completion.model,
              sourceCoverage: completion.sourceCoverage,
              needsScholar: completion.needsScholar,
              review: completion.review,
            },
          })}\n\n`,
        );
        res.end();
      } catch (error) {
        console.error(
          "Error processing voice message:",
          sanitizeAIErrorMessage(error),
        );
        if (res.headersSent) {
          res.write(
            `data: ${JSON.stringify({ type: "error", error: "Failed to process voice message" })}\n\n`,
          );
          res.end();
        } else {
          res.status(500).json({ error: "Failed to process voice message" });
        }
      }
    },
  );
}
