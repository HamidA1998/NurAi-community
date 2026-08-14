import type { Express, Request, Response } from "express";
import type { AITextRequest } from "../../ai";
import { requirePaidAPI } from "../../middleware/requirePaidAPI";
import {
  enforceAITextRateLimit,
  generateAITextWithUsageLogging,
} from "../../ai/httpControls";
import { sanitizeAIErrorMessage } from "../../ai/errorSanitizer";
import { CONTEXTUAL_DAILY_AI_LIMITS } from "../../ai/dailyQuota";
import {
  TAFSIR_MONTHLY_AI_LIMITS,
  enforcePaidAIFeatureQuota,
} from "../../ai/featureQuota";
import { isValidQuranReference } from "../../ai/quranReference";
import { requireAuthenticatedUser } from "../../requestAuth";
import { buildStructuredAIResponseExtras } from "../nurai-context/structuredResponse";

export function registerTafsirRoutes(app: Express): void {
  app.post(
    "/api/tafsir",
    requirePaidAPI("tafsir", "scholar"),
    async (req: Request, res: Response) => {
      try {
        const { surah, verse } = req.body;

        const surahNum =
          typeof surah === "string" ? parseInt(surah, 10) : surah;
        const verseStr =
          typeof verse === "number" ? verse.toString() : verse || "";

        if (typeof surahNum !== "number" || isNaN(surahNum)) {
          return res.status(400).json({
            error: "Invalid input. surah must be a number.",
          });
        }

        if (!verseStr || typeof verseStr !== "string") {
          return res.status(400).json({
            error: "Invalid input. verse is required.",
          });
        }

        if (surahNum < 1 || surahNum > 114) {
          return res.status(400).json({
            error: "Invalid surah. Surah must be between 1 and 114.",
          });
        }

        const verseMatch = verseStr.match(/^(\d{1,3})(?:-(\d{1,3}))?$/);
        const startVerse = verseMatch
          ? Number.parseInt(verseMatch[1], 10)
          : NaN;
        const endVerse = verseMatch?.[2]
          ? Number.parseInt(verseMatch[2], 10)
          : undefined;
        if (
          !verseMatch ||
          !isValidQuranReference(surahNum, startVerse, endVerse)
        ) {
          return res.status(400).json({
            error:
              "Invalid verse. Verse must exist in the selected surah and ranges must be in ascending order.",
          });
        }

        const aiRateLimit = await enforceAITextRateLimit(req, res);
        if (!aiRateLimit) return;

        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        const featureQuota = await enforcePaidAIFeatureQuota(res, {
          user,
          assertedTier: req.body?.userTier,
          featureKey: "tafsir",
          featureLabel: "Tafsir AI",
          dailyLimits: CONTEXTUAL_DAILY_AI_LIMITS,
          monthlyLimits: TAFSIR_MONTHLY_AI_LIMITS,
          dailyLimitReachedBody: (tier, limit) => ({
            error: "daily_limit_reached",
            message:
              tier === "premium"
                ? "Daily Tafsir AI limit reached. Upgrade to Scholar for 200/day."
                : `Daily Tafsir AI limit reached (${limit}/day). Limit resets at midnight.`,
            remaining: 0,
          }),
          monthlyLimitReachedBody: (tier, limit) => ({
            error: "monthly_limit_reached",
            message:
              tier === "premium"
                ? "Monthly Tafsir AI limit reached. Scholar includes a higher monthly allowance."
                : `Monthly Tafsir AI limit reached (${limit}/month). Limit resets next month.`,
            remaining: 0,
          }),
        });
        if (!featureQuota) return;

        const prompt = `You are an Islamic scholar providing Quran tafsir (exegesis). Provide a comprehensive explanation of Surah ${surahNum}, Verse ${verseStr}.

Structure your response with these sections:
**Overview**: Brief explanation of the verse's meaning
**Historical Context**: Mention asbab al-nuzul only if verified source cards or supplied app context support it; otherwise say the available source support is limited
**Scholar Perspectives**: Include named classical scholars only if verified source cards or supplied app context support them; otherwise keep this section to cautious general explanation
**Practical Lessons**: How to apply the teachings of this verse in daily life

Keep the response informative but accessible. Use respectful Islamic terminology. Do not invent tafsir sources, scholar names, reports, hadith virtues, or reference numbers.`;

        const aiRequest: AITextRequest = {
          useCase: "tafsir",
          risk: "religious",
          complexity: "complex",
          modelPreference: "deep",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          maxOutputTokens: 1500,
          temperature: 0.4,
          metadata: {
            feature: "quran",
            surahNumber: surahNum,
            ayahNumber: verseStr,
            question: `Tafsir for Quran ${surahNum}:${verseStr}`,
            trustedSourceContext: true,
          },
        };

        const message = await generateAITextWithUsageLogging({
          req,
          request: aiRequest,
          rateLimit: aiRateLimit,
          metadata: {
            route: "/api/tafsir",
            surah: surahNum,
            verse: verseStr,
          },
        });

        const tafsir =
          message.text || "Unable to generate tafsir at this time.";

        res.json({
          tafsir,
          ...buildStructuredAIResponseExtras({
            response: tafsir,
            feature: "quran",
            context: {
              surahNumber: surahNum,
              ayahNumber: verseStr,
              citations: message.citations,
            },
            question: `Tafsir for Quran ${surahNum}:${verseStr}`,
            tier: "scholar",
            aiCitations: message.citations,
            aiSourceCoverage: message.sourceCoverage,
            aiNeedsScholar: message.needsScholar,
            aiReview: message.review,
          }),
          ai: {
            provider: message.provider,
            model: message.model,
            modelTier: message.modelTier,
            complexity: message.complexity,
            mode: message.mode,
            cached: message.cached,
            fallbackUsed: message.fallbackUsed,
            latencyMs: message.latencyMs,
            usage: message.usage,
            attemptedProviders: message.attemptedProviders,
            routingReason: message.routingReason,
            sourceCoverage: message.sourceCoverage,
            needsScholar: message.needsScholar,
            review: message.review,
          },
        });
      } catch (error) {
        console.error(
          "Error generating tafsir:",
          sanitizeAIErrorMessage(error),
        );
        res.status(500).json({ error: "Failed to generate tafsir" });
      }
    },
  );
}
