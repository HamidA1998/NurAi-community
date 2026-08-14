import type { Express, Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "./db";
import { requireAuthenticatedUser } from "./requestAuth";
import { resolvePlanTierForUser, type PlanTier } from "./subscriptions";
import { generateAIText } from "./ai";
import {
  notificationPushTokens,
  smartNotificationEvents,
  userProgress,
  users,
  type User,
  type UserProgress,
} from "@shared/schema";

type SmartNotificationKind =
  | "daily_deen"
  | "evening_reflection"
  | "weekly_growth";

interface SmartNotificationMessage {
  title: string;
  body: string;
  route: string;
  reason: string;
  generatedBy: "openai" | "local_engine";
}

type SmartNotificationRoute =
  | "Home"
  | "Quran"
  | "ArabicLearning"
  | "PrayerTimes"
  | "StreakGarden"
  | "FamilyGroup"
  | "Tasbeeh"
  | "Duas"
  | "TravelCompanion"
  | "IslamicFinance"
  | "Ramadan";

const SMART_NOTIFICATION_ROUTES: readonly SmartNotificationRoute[] = [
  "Home",
  "Quran",
  "ArabicLearning",
  "PrayerTimes",
  "StreakGarden",
  "FamilyGroup",
  "Tasbeeh",
  "Duas",
  "TravelCompanion",
  "IslamicFinance",
  "Ramadan",
] as const;

function sanitizeSmartRoute(
  value: unknown,
  fallback: SmartNotificationRoute = "Home",
): SmartNotificationRoute {
  return typeof value === "string" &&
    SMART_NOTIFICATION_ROUTES.includes(value as SmartNotificationRoute)
    ? (value as SmartNotificationRoute)
    : fallback;
}

interface SmartNotificationAction {
  id: string;
  label: string;
  route: SmartNotificationRoute;
  score: number;
  reason: string;
  signals: string[];
}

interface ProgressSummary {
  streakDays: number;
  quranLabel: string;
  arabicLabel: string;
  prayerLabel: string;
  familyLabel: string;
  dhikrLabel: string;
  charityLabel: string;
  travelLabel: string;
  seasonalLabel: string;
  appFocusLabel: string;
  nextBestAction: string;
  nextBestRoute: SmartNotificationRoute;
  actionStack: SmartNotificationAction[];
  momentumLabel: string;
  privacyMode: boolean;
}

const pushTokenSchema = z.object({
  expoPushToken: z
    .string()
    .trim()
    .min(18)
    .max(256)
    .refine(
      (value) =>
        /^ExponentPushToken\[[A-Za-z0-9_-]+\]$/.test(value) ||
        /^ExpoPushToken\[[A-Za-z0-9_-]+\]$/.test(value),
      "Invalid Expo push token",
    ),
  deviceId: z.string().trim().max(160).nullable().optional(),
  platform: z.enum(["ios", "android", "web", "unknown"]).default("unknown"),
  enabled: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({}),
});

const smartRunSchema = z.object({
  kind: z
    .enum(["daily_deen", "evening_reflection", "weekly_growth"])
    .default("daily_deen"),
  limit: z.number().int().min(1).max(250).default(50),
  dryRun: z.boolean().default(false),
  dateKey: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function smartNotificationSecretConfigured(): boolean {
  return Boolean(process.env.NURAI_SMART_NOTIFICATION_SECRET?.trim());
}

function requestHasSmartNotificationSecret(req: Request): boolean {
  const configured = process.env.NURAI_SMART_NOTIFICATION_SECRET?.trim();
  if (!configured) return false;
  const bearer = req
    .header("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  const header = req.header("x-nurai-smart-notification-secret")?.trim();
  return bearer === configured || header === configured;
}

function textFromRecord(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const current = record[key];
    if (typeof current === "string" && current.trim()) {
      return current.trim();
    }
    if (typeof current === "number" && Number.isFinite(current)) {
      return String(current);
    }
  }
  return null;
}

function numberFromRecord(value: unknown, keys: string[]): number | null {
  const raw = textFromRecord(value, keys);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanFromRecord(value: unknown, keys: string[]): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const current = record[key];
    if (typeof current === "boolean") return current;
    if (typeof current === "number") return current > 0;
    if (typeof current === "string") {
      const normalized = current.trim().toLowerCase();
      if (["true", "yes", "active", "enabled", "on"].includes(normalized)) {
        return true;
      }
      if (["false", "no", "inactive", "disabled", "off"].includes(normalized)) {
        return false;
      }
    }
  }
  return false;
}

function summarizeProgress(progress?: UserProgress | null): ProgressSummary {
  const streakDays =
    numberFromRecord(progress?.streak, [
      "currentStreak",
      "dayStreak",
      "days",
      "streakDays",
    ]) || 0;
  const lastSurah = textFromRecord(progress?.quran, [
    "lastSurahName",
    "surahName",
    "currentSurah",
    "lastReadSurah",
  ]);
  const lastLesson = textFromRecord(progress?.dailyPlan, [
    "arabicLesson",
    "lessonTitle",
    "nextLesson",
  ]);
  const prayerFocus = textFromRecord(progress?.prayers, [
    "nextPrayer",
    "focusPrayer",
    "lastCompletedPrayer",
  ]);
  const familyActivity = numberFromRecord(progress?.family, [
    "weeklyActions",
    "memberCount",
    "activeMembers",
  ]);
  const tasbeehToday = numberFromRecord(progress?.tasbeeh, [
    "todayCount",
    "currentCount",
    "count",
    "completedToday",
  ]);
  const charityActions = numberFromRecord(progress?.hasanat, [
    "charityActions",
    "sadaqahCount",
    "goodDeedsToday",
    "todayCount",
  ]);
  const zakatProgress = numberFromRecord(progress?.zakat, [
    "completionPercent",
    "progress",
    "savedCalculations",
  ]);
  const ramadanActive =
    booleanFromRecord(progress?.ramadan, [
      "active",
      "isActive",
      "autoDetected",
      "ramadanActive",
    ]) === true;
  const travelActive =
    booleanFromRecord(progress?.hajj, [
      "travelModeEnabled",
      "active",
      "isActive",
      "upcomingTrip",
    ]) ||
    booleanFromRecord(progress?.nuraiProfile, [
      "travelModeEnabled",
      "upcomingTrip",
    ]);
  const travelDestination =
    textFromRecord(progress?.hajj, [
      "destination",
      "activeTrip",
      "travelDestination",
      "pilgrimagePlan",
    ]) ||
    textFromRecord(progress?.nuraiProfile, [
      "travelDestination",
      "upcomingTrip",
    ]);
  const appFocus = textFromRecord(progress?.nuraiProfile, [
    "focus",
    "goalCategory",
    "learningFocus",
    "dailyFocus",
  ]);
  const completedToday = numberFromRecord(progress?.dailyPlan, [
    "completedToday",
    "todayCompleted",
    "completedActions",
  ]);
  const privacyMode =
    String(
      textFromRecord(progress?.settings, [
        "privateMode",
        "stealthNotifications",
        "privacyMode",
      ]) || "",
    ).toLowerCase() === "true";

  const quranLabel = lastSurah
    ? `Continue ${lastSurah}`
    : "Read one ayah with meaning";
  const arabicLabel = lastLesson
    ? `Review ${lastLesson}`
    : "Learn one Quranic Arabic word";
  const prayerLabel = prayerFocus
    ? `Protect ${prayerFocus}`
    : "Protect the next salah";
  const familyLabel =
    familyActivity && familyActivity > 0
      ? "Encourage your family circle"
      : "Invite one family check-in";
  const dhikrLabel =
    tasbeehToday && tasbeehToday > 0
      ? "Continue your dhikr rhythm"
      : "Do one short dhikr session";
  const charityLabel =
    charityActions && charityActions > 0
      ? "Reflect on today's good deed"
      : zakatProgress && zakatProgress > 0
        ? "Review your zakat or giving progress"
        : "Log one small act of sadaqah";
  const travelLabel = travelDestination
    ? `Review your ${travelDestination} travel prayer plan`
    : travelActive
      ? "Review your travel prayer plan"
      : "Prepare your travel prayer plan";
  const seasonalLabel = ramadanActive
    ? "Review your Ramadan focus"
    : "Choose one seasonal worship focus";
  const appFocusLabel = appFocus
    ? `Continue your ${appFocus} focus`
    : "Choose today's best NurAI step";

  const actionStackCandidates: SmartNotificationAction[] = [
    {
      id: "prayer_focus",
      label: prayerLabel,
      route: "PrayerTimes",
      score: prayerFocus ? 84 : 72,
      reason: prayerFocus ? "current_prayer_focus" : "daily_prayer_anchor",
      signals: [
        prayerFocus ? `Prayer focus: ${prayerFocus}` : "No prayer focus saved",
      ],
    },
    {
      id: "quran_continuation",
      label: quranLabel,
      route: "Quran",
      score: lastSurah ? 90 : streakDays > 0 ? 78 : 68,
      reason: lastSurah ? "saved_quran_position" : "quran_daily_anchor",
      signals: [
        lastSurah ? `Last Quran place: ${lastSurah}` : "No saved Quran place",
        `${streakDays}-day rhythm`,
      ],
    },
    {
      id: "arabic_review",
      label: arabicLabel,
      route: "ArabicLearning",
      score: lastLesson ? 88 : 58,
      reason: lastLesson ? "lesson_resume_available" : "arabic_growth_seed",
      signals: [
        lastLesson ? `Lesson: ${lastLesson}` : "No active lesson saved",
      ],
    },
    {
      id: "family_check_in",
      label: familyLabel,
      route: "FamilyGroup",
      score: familyActivity && familyActivity > 0 ? 82 : 48,
      reason:
        familyActivity && familyActivity > 0
          ? "family_activity_active"
          : "family_growth_seed",
      signals: [
        familyActivity && familyActivity > 0
          ? `${familyActivity} family signal${familyActivity === 1 ? "" : "s"}`
          : "No family activity today",
      ],
    },
    {
      id: "dhikr_rhythm",
      label: dhikrLabel,
      route: "Tasbeeh",
      score: tasbeehToday && tasbeehToday > 0 ? 80 : 56,
      reason:
        tasbeehToday && tasbeehToday > 0
          ? "dhikr_started_today"
          : "dhikr_reset",
      signals: [
        tasbeehToday && tasbeehToday > 0
          ? `${tasbeehToday} dhikr count today`
          : "No dhikr count saved today",
      ],
    },
    {
      id: "charity_reflection",
      label: charityLabel,
      route: "IslamicFinance",
      score:
        charityActions && charityActions > 0
          ? 76
          : zakatProgress && zakatProgress > 0
            ? 68
            : 44,
      reason:
        charityActions && charityActions > 0
          ? "charity_action_logged"
          : zakatProgress && zakatProgress > 0
            ? "zakat_progress_available"
            : "charity_seed",
      signals: [
        charityActions && charityActions > 0
          ? `${charityActions} giving action${charityActions === 1 ? "" : "s"}`
          : zakatProgress && zakatProgress > 0
            ? `${zakatProgress}% zakat progress`
            : "No charity action saved today",
      ],
    },
    {
      id: "travel_prayer_plan",
      label: travelLabel,
      route: "TravelCompanion",
      score: travelDestination || travelActive ? 94 : 42,
      reason:
        travelDestination || travelActive
          ? "travel_mode_active"
          : "travel_mode_available",
      signals: [
        travelDestination
          ? `Destination: ${travelDestination}`
          : travelActive
            ? "Travel mode active"
            : "No active trip",
      ],
    },
    {
      id: "seasonal_focus",
      label: seasonalLabel,
      route: "Ramadan",
      score: ramadanActive ? 92 : 40,
      reason: ramadanActive
        ? "seasonal_worship_active"
        : "seasonal_focus_available",
      signals: [
        ramadanActive
          ? "Ramadan/seasonal focus active"
          : "No seasonal focus active",
      ],
    },
    {
      id: "personal_focus",
      label: appFocusLabel,
      route: "Home",
      score: appFocus ? 74 : 50,
      reason: appFocus ? "profile_focus_saved" : "daily_home_check_in",
      signals: [appFocus ? `Focus: ${appFocus}` : "No personal focus saved"],
    },
  ];
  const actionStack = actionStackCandidates
    .filter((action) => action.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  let nextBestAction = prayerLabel;
  let nextBestRoute: SmartNotificationRoute = "PrayerTimes";
  if (travelDestination || travelActive) {
    nextBestAction = travelLabel;
    nextBestRoute = "TravelCompanion";
  }
  if (streakDays > 0) {
    nextBestAction = quranLabel;
    nextBestRoute = "Quran";
  }
  if (lastLesson) {
    nextBestAction = arabicLabel;
    nextBestRoute = "ArabicLearning";
  }
  if (tasbeehToday && tasbeehToday > 0 && !completedToday) {
    nextBestAction = dhikrLabel;
    nextBestRoute = "Tasbeeh";
  }
  if (charityActions && charityActions > 0 && completedToday) {
    nextBestAction = charityLabel;
    nextBestRoute = "IslamicFinance";
  }
  if (ramadanActive) {
    nextBestAction = seasonalLabel;
    nextBestRoute = "Ramadan";
  }
  if (familyActivity && familyActivity > 0 && streakDays >= 3) {
    nextBestAction = familyLabel;
    nextBestRoute = "FamilyGroup";
  }
  if (
    appFocus &&
    !lastLesson &&
    !travelDestination &&
    !travelActive &&
    !ramadanActive
  ) {
    nextBestAction = appFocusLabel;
    nextBestRoute = "Home";
  }
  if (actionStack[0]) {
    nextBestAction = actionStack[0].label;
    nextBestRoute = actionStack[0].route;
  }

  const momentumLabel =
    completedToday && completedToday > 0
      ? `${completedToday} action${completedToday === 1 ? "" : "s"} completed today`
      : streakDays > 0
        ? `${streakDays}-day rhythm`
        : "fresh start";

  return {
    streakDays,
    quranLabel,
    arabicLabel,
    prayerLabel,
    familyLabel,
    dhikrLabel,
    charityLabel,
    travelLabel,
    seasonalLabel,
    appFocusLabel,
    nextBestAction,
    nextBestRoute,
    actionStack,
    momentumLabel,
    privacyMode,
  };
}

function rotateByDate<T>(items: T[], seed: string): T {
  const dateSeed = todayKey();
  const total = `${dateSeed}:${seed}`
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return items[total % items.length];
}

function cleanSmartCopy(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
  return clean || null;
}

function parseGeneratedSmartCopy(
  text: string,
): { title: string; body: string } | null {
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const title = cleanSmartCopy(parsed.title, 64);
    const body = cleanSmartCopy(parsed.body, 180);
    return title && body ? { title, body } : null;
  } catch {
    return null;
  }
}

function fallbackSmartNotification(
  user: User,
  progress: ProgressSummary,
  kind: SmartNotificationKind,
): SmartNotificationMessage {
  const name =
    user.displayName?.split(/\s+/)[0] ||
    user.username?.split(/[\s@._-]+/)[0] ||
    "there";

  if (progress.privacyMode) {
    return {
      title: "Your NurAI check-in is ready",
      body: "Open your private daily space and choose one calm step for today.",
      route: "Home",
      reason: "privacy_safe_check_in",
      generatedBy: "local_engine",
    };
  }

  if (kind === "weekly_growth") {
    const template = rotateByDate(
      [
        {
          title: `${name}, your weekly growth review is ready`,
          body: `Look back at prayer, Quran, Arabic, family and streak progress, then choose one focus for the week ahead.`,
        },
        {
          title: "Your week needs one clear intention",
          body: `NurAI has gathered your ${progress.momentumLabel}. Pick the next habit to protect this week.`,
        },
        {
          title: "Turn this week into a plan",
          body: `Review what grew, what slipped, and the one Islamic habit that deserves your attention now.`,
        },
      ],
      `${user.id}:weekly_growth`,
    );
    return {
      ...template,
      route: "Home",
      reason: "weekly_growth_summary",
      generatedBy: "local_engine",
    };
  }

  if (kind === "evening_reflection") {
    const template = rotateByDate(
      [
        {
          title: "Close the day with one small light",
          body:
            progress.streakDays > 0
              ? `Your ${progress.streakDays}-day rhythm can keep growing. ${progress.nextBestAction} before you sleep.`
              : `Before the day ends, take one calm step: ${progress.quranLabel.toLowerCase()} or a short reflection.`,
        },
        {
          title: "A quiet ending is still progress",
          body: `Open NurAI for one gentle action: ${progress.nextBestAction.toLowerCase()}.`,
        },
        {
          title: "End tonight with intention",
          body: `Protect one thing before sleep: salah, Quran, dhikr, or a short reflection.`,
        },
      ],
      `${user.id}:evening_reflection`,
    );
    return {
      ...template,
      route: progress.nextBestRoute,
      reason: "evening_next_step",
      generatedBy: "local_engine",
    };
  }

  const template = rotateByDate(
    [
      {
        title: `${name}, your next best step is ready`,
        body:
          progress.streakDays > 0
            ? `${progress.nextBestAction}. Your ${progress.streakDays}-day streak is ready to grow today.`
            : `${progress.nextBestAction}. Start gently and let your Deen garden grow.`,
      },
      {
        title: "NurAI has shaped today around you",
        body: `Start with ${progress.nextBestAction.toLowerCase()}, then keep the rest of the day simple.`,
      },
      {
        title: "One action can set the day",
        body: `${progress.nextBestAction}. Open NurAI and turn it into today's first win.`,
      },
    ],
    `${user.id}:daily_deen`,
  );
  return {
    ...template,
    route: progress.nextBestRoute,
    reason: "daily_next_best_action",
    generatedBy: "local_engine",
  };
}

async function generateSmartNotificationMessage({
  user,
  progress,
  tier,
  kind,
}: {
  user: User;
  progress: ProgressSummary;
  tier: PlanTier;
  kind: SmartNotificationKind;
}): Promise<SmartNotificationMessage> {
  const fallback = fallbackSmartNotification(user, progress, kind);
  if (tier !== "premium" && tier !== "scholar") return fallback;
  if (progress.privacyMode) return fallback;

  try {
    const response = await generateAIText({
      useCase: "nudge",
      risk: "low",
      complexity: "simple",
      modelPreference: "fast",
      localEligible: false,
      maxOutputTokens: 180,
      temperature: 0.35,
      cacheTtlMs: 15 * 60_000,
      metadata: {
        feature: "smart_notifications",
        kind,
        tier,
      },
      messages: [
        {
          role: "system",
          content:
            'Write one calm, non-addictive NurAI mobile notification. Return strict JSON only: {"title":"...","body":"..."}. Keep the title under 64 characters and body under 180. Use only the supplied app signals. Do not invent completion, private activity, sources, Quran or Hadith quotations, religious rulings, urgency, guilt, shame, or streak pressure. Do not mention AI or a subscription.',
        },
        {
          role: "user",
          content: JSON.stringify({
            notificationKind: kind,
            momentum: progress.momentumLabel,
            deterministicNextAction: progress.nextBestAction,
            signals: progress.actionStack.slice(0, 3).map((action) => ({
              label: action.label,
              reason: action.reason,
              signals: action.signals,
            })),
            fallbackTitle: fallback.title,
            fallbackBody: fallback.body,
          }),
        },
      ],
    });
    const generated = parseGeneratedSmartCopy(response.text);
    if (!generated) return fallback;

    return {
      title: generated.title,
      body: generated.body,
      route: sanitizeSmartRoute(fallback.route, progress.nextBestRoute),
      reason: `${fallback.reason}_model_enhanced`,
      generatedBy: response.provider === "openai" ? "openai" : "local_engine",
    };
  } catch (error) {
    console.warn(
      "[notifications] model-enhanced copy unavailable; using local ranking:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return fallback;
  }
}

async function sendExpoPushNotification({
  token,
  message,
  eventId,
  kind,
}: {
  token: string;
  message: SmartNotificationMessage;
  eventId: number;
  kind: SmartNotificationKind;
}): Promise<
  { ok: true; providerMessageId?: string } | { ok: false; error: string }
> {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      title: message.title,
      body: message.body,
      sound: "default",
      data: {
        type: "smart_nurai",
        kind,
        route: message.route,
        eventId,
        reason: message.reason,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as any;
  if (!response.ok) {
    return {
      ok: false,
      error: `expo_push_http_${response.status}`,
    };
  }

  const ticket = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
  if (ticket?.status === "error") {
    return {
      ok: false,
      error: String(
        ticket?.message || ticket?.details?.error || "expo_push_error",
      ),
    };
  }

  return {
    ok: true,
    providerMessageId: typeof ticket?.id === "string" ? ticket.id : undefined,
  };
}

export async function sendUserPushNotification({
  userId,
  title,
  body,
  data,
}: {
  userId: string;
  title: string;
  body: string;
  data: Record<string, string | number | boolean>;
}): Promise<{ sent: number; failed: number }> {
  const tokens = await db
    .select({ token: notificationPushTokens.expoPushToken })
    .from(notificationPushTokens)
    .where(
      and(
        eq(notificationPushTokens.userId, userId),
        eq(notificationPushTokens.enabled, true),
      ),
    )
    .limit(8);

  const results = await Promise.allSettled(
    tokens.map(async ({ token }) => {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        signal: AbortSignal.timeout(4_000),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: token,
          title,
          body,
          sound: "default",
          data,
        }),
      });
      const payload = (await response.json().catch(() => null)) as any;
      const ticket = Array.isArray(payload?.data)
        ? payload.data[0]
        : payload?.data;
      if (!response.ok || ticket?.status === "error") {
        throw new Error("expo_push_delivery_failed");
      }
    }),
  );

  return results.reduce(
    (summary, result) => {
      if (result.status === "fulfilled") summary.sent += 1;
      else summary.failed += 1;
      return summary;
    },
    { sent: 0, failed: 0 },
  );
}

async function loadProgressForUser(
  userId: string,
): Promise<UserProgress | null> {
  const [progress] = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .limit(1);
  return progress || null;
}

export function registerNotificationRoutes(app: Express): void {
  app.post(
    "/api/notifications/push-token",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;

        const parsed = pushTokenSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "invalid_push_token",
            message: "This device could not be registered for notifications.",
          });
        }

        const now = new Date();
        const [token] = await db
          .insert(notificationPushTokens)
          .values({
            userId: user.id,
            expoPushToken: parsed.data.expoPushToken,
            deviceId: parsed.data.deviceId || null,
            platform: parsed.data.platform,
            enabled: parsed.data.enabled,
            metadata: parsed.data.metadata,
            lastSeenAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              notificationPushTokens.userId,
              notificationPushTokens.expoPushToken,
            ],
            set: {
              deviceId: parsed.data.deviceId || null,
              platform: parsed.data.platform,
              enabled: parsed.data.enabled,
              metadata: parsed.data.metadata,
              lastSeenAt: now,
              updatedAt: now,
            },
          })
          .returning();

        const tier = await resolvePlanTierForUser({ user });
        res.json({
          registered: true,
          tokenId: token.id,
          smartPushReady: tier === "premium" || tier === "scholar",
        });
      } catch (error) {
        console.error("[notifications] push token registration failed:", error);
        res.status(500).json({
          error: "push_token_registration_failed",
          message: "Notifications could not be registered right now.",
        });
      }
    },
  );

  app.delete(
    "/api/notifications/push-token",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        const token = String(req.body?.expoPushToken || "").trim();
        if (!token) {
          return res.status(400).json({
            error: "missing_push_token",
            message: "A notification token is required.",
          });
        }

        await db
          .update(notificationPushTokens)
          .set({ enabled: false, updatedAt: new Date() })
          .where(
            and(
              eq(notificationPushTokens.userId, user.id),
              eq(notificationPushTokens.expoPushToken, token),
            ),
          );
        res.json({ disabled: true });
      } catch (error) {
        console.error("[notifications] push token disable failed:", error);
        res.status(500).json({
          error: "push_token_disable_failed",
          message: "Notification settings could not be updated right now.",
        });
      }
    },
  );

  app.get(
    "/api/notifications/smart/preview",
    async (req: Request, res: Response) => {
      try {
        const user = await requireAuthenticatedUser(req, res);
        if (!user) return;
        const tier = await resolvePlanTierForUser({ user });
        if (tier !== "premium" && tier !== "scholar") {
          return res.status(402).json({
            upgradeRequired: true,
            feature: "smart_notifications",
            requiredTier: "premium",
            message:
              "Smart NurAI notifications are available with Premium or Scholar.",
          });
        }

        const kind =
          req.query.kind === "weekly_growth" ||
          req.query.kind === "evening_reflection"
            ? req.query.kind
            : "daily_deen";
        const progress = summarizeProgress(await loadProgressForUser(user.id));
        const message = await generateSmartNotificationMessage({
          user,
          progress,
          tier,
          kind,
        });
        res.json({ message });
      } catch (error) {
        console.error("[notifications] smart preview failed:", error);
        res.status(500).json({
          error: "smart_notification_preview_failed",
          message: "Smart notification preview is unavailable right now.",
        });
      }
    },
  );

  app.post(
    "/api/notifications/smart/run-daily",
    async (req: Request, res: Response) => {
      try {
        if (!smartNotificationSecretConfigured()) {
          return res.status(503).json({
            error: "smart_notifications_not_configured",
            message: "Smart notification sending is not configured yet.",
          });
        }
        if (!requestHasSmartNotificationSecret(req)) {
          return res.status(403).json({
            error: "forbidden",
            message: "You do not have permission to send notifications.",
          });
        }

        const parsed = smartRunSchema.safeParse(req.body || {});
        if (!parsed.success) {
          return res.status(400).json({
            error: "invalid_smart_notification_run",
            message: "Smart notification run settings are invalid.",
          });
        }

        const dateKey = parsed.data.dateKey || todayKey();
        const tokenRows = await db
          .select({
            tokenId: notificationPushTokens.id,
            token: notificationPushTokens.expoPushToken,
            user: users,
          })
          .from(notificationPushTokens)
          .innerJoin(users, eq(notificationPushTokens.userId, users.id))
          .where(eq(notificationPushTokens.enabled, true))
          .orderBy(desc(notificationPushTokens.lastSeenAt))
          .limit(parsed.data.limit * 4);

        const latestTokenByUser = new Map<
          string,
          { tokenId: number; token: string; user: User }
        >();
        for (const row of tokenRows) {
          if (!latestTokenByUser.has(row.user.id)) {
            latestTokenByUser.set(row.user.id, {
              tokenId: row.tokenId,
              token: row.token,
              user: row.user,
            });
          }
          if (latestTokenByUser.size >= parsed.data.limit) break;
        }

        const report = {
          considered: tokenRows.length,
          eligiblePaidUsers: 0,
          sent: 0,
          skipped: 0,
          failed: 0,
          dryRun: parsed.data.dryRun,
        };

        for (const item of latestTokenByUser.values()) {
          const tier = await resolvePlanTierForUser({ user: item.user });
          if (tier !== "premium" && tier !== "scholar") {
            report.skipped += 1;
            continue;
          }
          report.eligiblePaidUsers += 1;

          const progress = summarizeProgress(
            await loadProgressForUser(item.user.id),
          );
          const message = await generateSmartNotificationMessage({
            user: item.user,
            progress,
            tier,
            kind: parsed.data.kind,
          });

          if (parsed.data.dryRun) {
            report.sent += 1;
            continue;
          }

          const [event] = await db
            .insert(smartNotificationEvents)
            .values({
              userId: item.user.id,
              tokenId: item.tokenId,
              kind: parsed.data.kind,
              dateKey,
              title: message.title,
              body: message.body,
              route: message.route,
              status: "pending",
              metadata: {
                reason: message.reason,
                generatedBy: message.generatedBy,
                tier,
                rankedActions: progress.actionStack.slice(0, 3),
                momentumLabel: progress.momentumLabel,
              },
            })
            .onConflictDoNothing({
              target: [
                smartNotificationEvents.userId,
                smartNotificationEvents.kind,
                smartNotificationEvents.dateKey,
              ],
            })
            .returning();

          if (!event) {
            report.skipped += 1;
            continue;
          }

          const sent = await sendExpoPushNotification({
            token: item.token,
            message,
            eventId: event.id,
            kind: parsed.data.kind,
          });

          if (sent.ok) {
            await db
              .update(smartNotificationEvents)
              .set({
                status: "sent",
                providerMessageId: sent.providerMessageId || null,
                sentAt: new Date(),
              })
              .where(eq(smartNotificationEvents.id, event.id));
            report.sent += 1;
          } else {
            await db
              .update(smartNotificationEvents)
              .set({
                status: "failed",
                error: sent.error,
              })
              .where(eq(smartNotificationEvents.id, event.id));
            report.failed += 1;
          }
        }

        res.json(report);
      } catch (error) {
        console.error("[notifications] smart notification run failed:", error);
        res.status(500).json({
          error: "smart_notification_run_failed",
          message:
            "Smart notification sending failed. Please try again shortly.",
        });
      }
    },
  );
}
