import { NurAIUserProfileV3, PersonalityType } from "./nuraiProfileV3";
import { NurAIPatternDetectorV3 } from "./nuraiPatternsV3";
import {
  isRamadan,
  isLastTenNights,
  isIslamicFriday,
  isFirstTenDhulHijjah,
  getUpcomingEvents,
} from "./nuraiHijriEngine";
import { EMOTION_TONE } from "./nuraiEmotionEngine";
import { suggestHabit, getHabitMotivation } from "./nuraiHabitEngine";
import {
  ARABIC_LEARNING_PROGRESS_TOTALS,
  ArabicLearningProgress,
  getArabicLearningProgressScore,
  getArabicLocalDateKey,
  loadArabicLearningProgress,
  refreshArabicReviewForToday,
} from "./arabicLearningProgressService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type NudgePriority = "critical" | "high" | "medium" | "low";

export interface NurAINudge {
  id: string;
  category: string;
  title: string;
  body: string;
  priority: NudgePriority;
  reason: string;
  actionLabel?: string;
  actionRoute?: string;
  actionParams?: any;
  icon?: string;
  expiresAt?: string;
  dismissible: boolean;
  personalityVariant?: PersonalityType;
}

export interface PrayerWindowContext {
  currentPrayer: string | null;
  minutesToNextPrayer: number;
  nextPrayerName: string;
  isAfterFajr: boolean;
  isAfterSunrise: boolean;
  isMidMorning: boolean;
  isAfterDhuhr: boolean;
  isAfterAsr: boolean;
  isAfterMaghrib: boolean;
  isAfterIsha: boolean;
  isTahajjudTime: boolean;
}

const COOLDOWN_KEY = "@nurai_nudge_cooldowns";
const DAILY_CAP_KEY = "@nurai_nudge_daily";
const DISMISSED_KEY = "@nurai_nudge_dismissed";
const ENGAGEMENT_SCORES_KEY = "@nurai_engagement_scores";
const ARABIC_REVIEW_TASK_COUNT = 4;

interface CooldownRecord {
  [category: string]: string;
}

interface DailyCap {
  date: string;
  count: number;
}

interface DismissedNudges {
  [nudgeId: string]: { dismissedAt: string; category: string; count: number };
}

interface CategoryEngagementScores {
  [category: string]: {
    actionRate: number;
    dismissRate: number;
    totalActions: number;
    totalDismisses: number;
    lastAction?: string;
    lastDismiss?: string;
  };
}

async function loadCooldowns(): Promise<CooldownRecord> {
  try {
    const s = await AsyncStorage.getItem(COOLDOWN_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

async function saveCooldowns(c: CooldownRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(COOLDOWN_KEY, JSON.stringify(c));
  } catch {}
}

async function loadDailyCap(): Promise<DailyCap> {
  try {
    const s = await AsyncStorage.getItem(DAILY_CAP_KEY);
    if (s) {
      const d = JSON.parse(s);
      if (d.date === getArabicLocalDateKey()) return d;
    }
    return { date: getArabicLocalDateKey(), count: 0 };
  } catch {
    return { date: getArabicLocalDateKey(), count: 0 };
  }
}

async function incrementDailyCap(): Promise<void> {
  try {
    const cap = await loadDailyCap();
    cap.count++;
    await AsyncStorage.setItem(DAILY_CAP_KEY, JSON.stringify(cap));
  } catch {}
}

async function loadDismissed(): Promise<DismissedNudges> {
  try {
    const s = await AsyncStorage.getItem(DISMISSED_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

async function saveDismissed(d: DismissedNudges): Promise<void> {
  try {
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(d));
  } catch {}
}

export async function dismissNudgeV3(
  nudgeId: string,
  category: string,
): Promise<void> {
  try {
    const dismissed = await loadDismissed();
    const existing = dismissed[nudgeId];
    const count = existing ? existing.count + 1 : 1;
    dismissed[nudgeId] = {
      dismissedAt: new Date().toISOString(),
      category,
      count,
    };
    await saveDismissed(dismissed);
  } catch {}
}

function isDismissedToday(
  nudgeId: string,
  dismissed: DismissedNudges,
): boolean {
  const entry = dismissed[nudgeId];
  if (!entry) return false;
  const dismissedAt = new Date(entry.dismissedAt);
  const now = new Date();
  const diffMs = now.getTime() - dismissedAt.getTime();
  const diffHours = diffMs / 3600000;
  if (entry.count >= 3) {
    const extendedHours = Math.min(entry.count * 24, 168);
    return diffHours < extendedHours;
  }
  return getArabicLocalDateKey(dismissedAt) === getArabicLocalDateKey(now);
}

async function loadEngagementScores(): Promise<CategoryEngagementScores> {
  try {
    const s = await AsyncStorage.getItem(ENGAGEMENT_SCORES_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

async function saveEngagementScores(
  scores: CategoryEngagementScores,
): Promise<void> {
  try {
    await AsyncStorage.setItem(ENGAGEMENT_SCORES_KEY, JSON.stringify(scores));
  } catch {}
}

export async function recordNudgeEngagement(
  category: string,
  wasActedOn: boolean,
): Promise<void> {
  try {
    const scores = await loadEngagementScores();
    const alpha = 0.15;
    const existing = scores[category] || {
      actionRate: 0.5,
      dismissRate: 0.5,
      totalActions: 0,
      totalDismisses: 0,
    };
    if (wasActedOn) {
      existing.actionRate = alpha * 1 + (1 - alpha) * existing.actionRate;
      existing.dismissRate = alpha * 0 + (1 - alpha) * existing.dismissRate;
      existing.totalActions++;
      existing.lastAction = new Date().toISOString();
    } else {
      existing.actionRate = alpha * 0 + (1 - alpha) * existing.actionRate;
      existing.dismissRate = alpha * 1 + (1 - alpha) * existing.dismissRate;
      existing.totalDismisses++;
      existing.lastDismiss = new Date().toISOString();
    }
    scores[category] = existing;
    await saveEngagementScores(scores);
  } catch {}
}

export function computePrayerWindow(prayerTimesData?: {
  fajr?: string;
  sunrise?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
}): PrayerWindowContext {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const nowMin = h * 60 + m;

  if (!prayerTimesData || !prayerTimesData.fajr) {
    const fallback: Record<string, number> = {
      fajr: 300,
      sunrise: 390,
      dhuhr: 720,
      asr: 900,
      maghrib: 1080,
      isha: 1170,
    };
    const prayers = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
    let current: string | null = null;
    let next = "fajr";
    let minsToNext = 1440;
    for (let i = prayers.length - 1; i >= 0; i--) {
      if (nowMin >= fallback[prayers[i]]) {
        current = prayers[i];
        break;
      }
    }
    for (const p of prayers) {
      const diff = fallback[p] - nowMin;
      if (diff > 0 && diff < minsToNext) {
        minsToNext = diff;
        next = p;
      }
    }
    if (minsToNext === 1440) minsToNext = 1440 - nowMin + fallback.fajr;
    return {
      currentPrayer: current,
      minutesToNextPrayer: minsToNext,
      nextPrayerName: next,
      isAfterFajr: nowMin >= fallback.fajr && nowMin < fallback.sunrise,
      isAfterSunrise: nowMin >= fallback.sunrise && nowMin < fallback.dhuhr,
      isMidMorning:
        nowMin >= fallback.sunrise + 60 && nowMin < fallback.dhuhr - 30,
      isAfterDhuhr: nowMin >= fallback.dhuhr && nowMin < fallback.asr,
      isAfterAsr: nowMin >= fallback.asr && nowMin < fallback.maghrib,
      isAfterMaghrib: nowMin >= fallback.maghrib && nowMin < fallback.isha,
      isAfterIsha: nowMin >= fallback.isha,
      isTahajjudTime: h >= 2 && h < 4,
    };
  }

  function parseTime(t: string): number {
    const parts = t.split(":");
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }

  const times: Record<string, number> = {};
  for (const [k, v] of Object.entries(prayerTimesData)) {
    if (v) times[k] = parseTime(v);
  }

  const prayers = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
  let current: string | null = null;
  let next = "fajr";
  let minsToNext = 1440;

  for (let i = prayers.length - 1; i >= 0; i--) {
    if (times[prayers[i]] !== undefined && nowMin >= times[prayers[i]]) {
      current = prayers[i];
      break;
    }
  }
  for (const p of prayers) {
    if (times[p] !== undefined) {
      const diff = times[p] - nowMin;
      if (diff > 0 && diff < minsToNext) {
        minsToNext = diff;
        next = p;
      }
    }
  }
  if (minsToNext === 1440 && times.fajr !== undefined)
    minsToNext = 1440 - nowMin + times.fajr;

  const fajr = times.fajr ?? 300;
  const sunrise = times.sunrise ?? 390;
  const dhuhr = times.dhuhr ?? 720;
  const asr = times.asr ?? 900;
  const maghrib = times.maghrib ?? 1080;
  const isha = times.isha ?? 1170;

  return {
    currentPrayer: current,
    minutesToNextPrayer: minsToNext,
    nextPrayerName: next,
    isAfterFajr: nowMin >= fajr && nowMin < sunrise,
    isAfterSunrise: nowMin >= sunrise && nowMin < dhuhr,
    isMidMorning: nowMin >= sunrise + 60 && nowMin < dhuhr - 30,
    isAfterDhuhr: nowMin >= dhuhr && nowMin < asr,
    isAfterAsr: nowMin >= asr && nowMin < maghrib,
    isAfterMaghrib: nowMin >= maghrib && nowMin < isha,
    isAfterIsha: nowMin >= isha,
    isTahajjudTime: h >= 2 && h < 4,
  };
}

export class NurAIRuleEngineV3 {
  static detectMaturity(
    profile: NurAIUserProfileV3,
  ): "new" | "developing" | "established" | "veteran" {
    const days = profile.totalDaysActive || 0;
    const features = (profile.featureDiscovery || []).length;
    if (days <= 3 || features <= 2) return "new";
    if (days <= 14 || features <= 5) return "developing";
    if (days <= 60) return "established";
    return "veteran";
  }

  static async evaluate(
    profile: NurAIUserProfileV3,
    prayerWindow?: PrayerWindowContext,
  ): Promise<NurAINudge[]> {
    const nudges: NurAINudge[] = [];
    const pw = prayerWindow || computePrayerWindow();
    const arabicProgress = await this.loadArabicProgressSafe();
    try {
      this.prayerRules(profile, nudges, pw);
      this.quranRules(profile, nudges, pw);
      this.streakRules(profile, nudges);
      this.dhikrRules(profile, nudges, pw);
      this.fastingRules(profile, nudges);
      this.calendarRules(profile, nudges);
      this.learningRules(profile, nudges, arabicProgress);
      this.hasanatRules(profile, nudges);
      this.habitRules(profile, nudges);
      this.emotionalRules(profile, nudges);
      this.engagementRules(profile, nudges);
      this.revertRules(profile, nudges);
      this.familyRules(profile, nudges, pw);
      this.womensHealthRules(profile, nudges);
      this.discoveryRules(profile, nudges);
    } catch (e) {
      console.warn("NurAI V3: Rule evaluation error", e);
    }
    return this.smartPrioritise(nudges, profile);
  }

  private static async loadArabicProgressSafe(): Promise<ArabicLearningProgress | null> {
    try {
      return refreshArabicReviewForToday(await loadArabicLearningProgress());
    } catch {
      return null;
    }
  }

  static async evaluateWithCooldowns(
    profile: NurAIUserProfileV3,
    prayerWindow?: PrayerWindowContext,
  ): Promise<NurAINudge[]> {
    const all = await this.evaluate(profile, prayerWindow);
    const cooldowns = await loadCooldowns();
    const dailyCap = await loadDailyCap();
    const now = Date.now();
    const cooldownMs: Record<string, number> = {
      prayer: 4 * 3600000,
      quran: 6 * 3600000,
      streak: 2 * 3600000,
      dhikr: 6 * 3600000,
      fasting: 12 * 3600000,
      calendar: 24 * 3600000,
      learning: 12 * 3600000,
      hasanat: 12 * 3600000,
      habit: 12 * 3600000,
      emotional: 6 * 3600000,
      engagement: 24 * 3600000,
      revert: 12 * 3600000,
      family: 12 * 3600000,
      womensHealth: 24 * 3600000,
      discovery: 24 * 3600000,
    };

    const maxDaily = 10;
    if (dailyCap.count >= maxDaily) {
      return all.filter((n) => n.priority === "critical");
    }

    const filtered = all.filter((n) => {
      if (n.priority === "critical") return true;
      const lastShown = cooldowns[n.category];
      if (!lastShown) return true;
      const cd = cooldownMs[n.category] || 6 * 3600000;
      return now - new Date(lastShown).getTime() > cd;
    });

    const shown = filtered.slice(
      0,
      Math.min(filtered.length, maxDaily - dailyCap.count),
    );

    const newCooldowns = { ...cooldowns };
    shown.forEach((n) => {
      newCooldowns[n.category] = new Date().toISOString();
    });
    await saveCooldowns(newCooldowns);

    for (let i = 0; i < shown.length; i++) await incrementDailyCap();

    return shown;
  }

  private static prayerRules(
    p: NurAIUserProfileV3,
    n: NurAINudge[],
    pw: PrayerWindowContext,
  ) {
    const weak = NurAIPatternDetectorV3.findWeakestPrayer(p.prayerLogs);
    const improving = NurAIPatternDetectorV3.isPrayerImproving(p.prayerLogs);
    const consistency = NurAIPatternDetectorV3.calculatePrayerConsistency(
      p.prayerLogs,
    );

    if (weak && weak.missRate > 0.5) {
      n.push({
        id: "prayer_weak",
        category: "prayer",
        title: `${weak.prayer.charAt(0).toUpperCase() + weak.prayer.slice(1)} needs attention`,
        body: `You've missed ${weak.prayer} ${Math.round(weak.missRate * 100)}% recently. Start with just making the intention tonight.`,
        priority: "high",
        reason: `Based on your prayer log: ${weak.prayer} missed ${Math.round(weak.missRate * 100)}% in the last 30 days.`,
        actionLabel: "Prayer Times",
        actionRoute: "PrayerTimes",
        icon: "clock",
        dismissible: true,
      });
    }

    if (improving) {
      n.push({
        id: "prayer_improving",
        category: "prayer",
        title: "Your prayers are improving!",
        body: "SubhanAllah! You prayed more this week than last. Keep that momentum!",
        priority: "medium",
        reason: "Your prayer count this week is higher than last week.",
        icon: "trending-up",
        dismissible: true,
      });
    }

    if (consistency >= 90 && p.prayerLogs.length >= 14) {
      n.push({
        id: "prayer_champion",
        category: "prayer",
        title: "Prayer Champion",
        body: `${consistency}% consistency! Small, steady acts are easier to protect and grow. Keep guarding this rhythm.`,
        priority: "medium",
        reason: `${consistency}% prayer consistency over the last 30 days.`,
        icon: "award",
        dismissible: true,
      });
    }

    if (pw.isAfterFajr) {
      n.push({
        id: "prayer_fajr_now",
        category: "prayer",
        title: "Fajr Time",
        body: "The two rak'ah before Fajr are better than the world and what it contains.",
        priority: "high",
        reason:
          "It is currently between Fajr and sunrise based on your local prayer times.",
        icon: "sunrise",
        dismissible: true,
        actionLabel: "Prayer Times",
        actionRoute: "PrayerTimes",
      });
    }

    if (pw.isMidMorning) {
      n.push({
        id: "prayer_dhuha",
        category: "prayer",
        title: "Dhuha Time",
        body: "Charity for every joint in your body. Even 2 rak'ah suffice.",
        priority: "low",
        reason:
          "It is currently between sunrise and Dhuhr \u2014 the window for Dhuha prayer.",
        icon: "sun",
        dismissible: true,
      });
    }

    if (p.prayerStreaks.currentFajr >= 7) {
      n.push({
        id: "fajr_streak",
        category: "prayer",
        title: `${p.prayerStreaks.currentFajr}-Day Fajr Streak!`,
        body: "The hardest prayer, consistently. You're among the sincere.",
        priority: "medium",
        reason: `You have prayed Fajr for ${p.prayerStreaks.currentFajr} consecutive days.`,
        icon: "zap",
        dismissible: true,
      });
    }

    if (p.prayerStreaks.currentAllFive >= 3) {
      n.push({
        id: "all_five_streak",
        category: "prayer",
        title: `All 5 for ${p.prayerStreaks.currentAllFive} Days`,
        body: "Complete devotion. This is what success looks like.",
        priority: "medium",
        reason: `All five daily prayers completed for ${p.prayerStreaks.currentAllFive} consecutive days.`,
        icon: "star",
        dismissible: true,
      });
    }
  }

  private static quranRules(
    p: NurAIUserProfileV3,
    n: NurAINudge[],
    pw: PrayerWindowContext,
  ) {
    const q = p.quranReadingHabit;
    const pattern = NurAIPatternDetectorV3.analyseQuranPattern(
      p.quranSessionHistory,
    );
    const comfort = NurAIPatternDetectorV3.detectComfortSeeking(p.quranToday);

    if (q.currentSurah > 1 && q.completionPercentage < 100) {
      n.push({
        id: "quran_continue",
        category: "quran",
        title: "Continue Your Journey",
        body: `You're at ${q.completionPercentage}% of the Quran. Every ayah brings you closer.`,
        priority: "medium",
        reason: `Your Quran progress is at ${q.completionPercentage}% (currently on Surah ${q.currentSurah}).`,
        actionLabel: "Continue Reading",
        actionRoute: "QuranReader",
        actionParams: { surahNumber: q.currentSurah },
        icon: "book-open",
        dismissible: true,
      });
    }

    if (comfort) {
      n.push({
        id: "quran_explore",
        category: "quran",
        title: "Try Something New",
        body: "You tend to revisit familiar surahs. Venture into new territory \u2014 there's beauty you haven't discovered yet.",
        priority: "low",
        reason: "You have read the same surah 3+ times recently.",
        icon: "compass",
        dismissible: true,
      });
    }

    if (pattern.trend === "improving") {
      n.push({
        id: "quran_improving",
        category: "quran",
        title: "Quran habit growing!",
        body: "Your reading time is increasing. Keep it gentle, sincere, and steady.",
        priority: "medium",
        reason:
          "Your recent Quran reading sessions are longer than your earlier ones.",
        icon: "trending-up",
        dismissible: true,
      });
    }

    if (q.totalVersesRead >= 1000) {
      n.push({
        id: "quran_1k_verses",
        category: "quran",
        title: "1,000+ Verses Read!",
        body: "MashaAllah! A thousand conversations with your Lord.",
        priority: "medium",
        reason: `You have read ${q.totalVersesRead} verses total.`,
        icon: "award",
        dismissible: true,
      });
    }

    if (isIslamicFriday()) {
      n.push({
        id: "quran_kahf",
        category: "quran",
        title: "Surah Al-Kahf",
        body: "Friday is a meaningful day to revisit Surah Al-Kahf. Read what you can with calm focus.",
        priority: "high",
        reason:
          "It is Friday \u2014 the recommended day for reading Surah Al-Kahf.",
        actionLabel: "Read Al-Kahf",
        actionRoute: "QuranReader",
        actionParams: { surahNumber: 18 },
        icon: "book",
        dismissible: true,
      });
    }

    if (q.completionPercentage >= 100) {
      n.push({
        id: "quran_khatm",
        category: "quran",
        title: "Khatm Complete!",
        body: "You've completed the entire Quran! SubhanAllah. Make dua, reflect on what you learned, and plan your next gentle reading cycle.",
        priority: "critical",
        reason: "You have finished reading all 6,236 verses of the Quran.",
        icon: "award",
        dismissible: true,
      });
    }
  }

  private static streakRules(p: NurAIUserProfileV3, n: NurAINudge[]) {
    const risk = NurAIPatternDetectorV3.assessStreakRisk(p);
    const streak = p.streakData.currentStreak;

    if (risk.risk === "danger" && streak >= 3) {
      n.push({
        id: "streak_danger",
        category: "streak",
        title: `${streak}-day streak at risk!`,
        body: `Only ${risk.hoursLeft} hours left. Don't let this go. Even something tiny counts.`,
        priority: "critical",
        reason: `Your ${streak}-day streak expires in ${risk.hoursLeft} hours. No activity logged today.`,
        icon: "alert-triangle",
        dismissible: false,
      });
    } else if (risk.risk === "warning" && streak >= 3) {
      n.push({
        id: "streak_warning",
        category: "streak",
        title: `Keep it going (${streak} days)`,
        body: `${Math.round(risk.hoursLeft)} hours left. Quick \u2014 open any feature.`,
        priority: "high",
        reason: `${Math.round(risk.hoursLeft)} hours remain today to maintain your ${streak}-day streak.`,
        icon: "clock",
        dismissible: true,
      });
    }

    const milestones = [7, 14, 21, 30, 40, 50, 66, 100, 150, 200, 365];
    if (milestones.includes(streak)) {
      const msgs: Record<number, string> = {
        7: "One full week! Habits form through consistency.",
        14: "Two weeks! You're building neural pathways.",
        21: "21 days! The classic habit milestone.",
        30: "30 days! A full month of devotion.",
        40: "40 days! Many scholars say 40 is transformation.",
        50: "50 days! Half a century of consecutive days.",
        66: "66 days! Science says this is when habits become automatic.",
        100: "TRIPLE DIGITS! SubhanAllah!",
        150: "150 days! You are extraordinary.",
        200: "200 days! This is who you are now.",
        365: "ONE YEAR! An entire year of consistency. You inspire us.",
      };
      n.push({
        id: `streak_${streak}`,
        category: "streak",
        title: `${streak}-Day Streak!`,
        body: msgs[streak] || `${streak} consecutive days! MashaAllah!`,
        priority: "high",
        reason: `You reached a ${streak}-day streak milestone.`,
        icon: "award",
        dismissible: true,
      });
    }
  }

  private static dhikrRules(
    p: NurAIUserProfileV3,
    n: NurAINudge[],
    pw: PrayerWindowContext,
  ) {
    const dhikr = p.dhikrData;

    if (pw.isAfterFajr || (pw.isAfterSunrise && pw.minutesToNextPrayer > 120)) {
      n.push({
        id: "dhikr_morning",
        category: "dhikr",
        title: "Morning Adhkar",
        body: "Start your day with dhikr. SubhanAllah, Alhamdulillah, Allahu Akbar.",
        priority: "medium",
        reason:
          "It is currently morning \u2014 the time for morning adhkar based on your prayer times.",
        actionLabel: "Open Tasbeeh",
        actionRoute: "Tasbeeh",
        icon: "circle",
        dismissible: true,
      });
    }

    if (pw.isAfterAsr) {
      n.push({
        id: "dhikr_evening",
        category: "dhikr",
        title: "Evening Adhkar",
        body: "Close the day with evening adhkar, gratitude, and calm remembrance.",
        priority: "medium",
        reason: "It is currently after Asr \u2014 the time for evening adhkar.",
        actionLabel: "Open Tasbeeh",
        actionRoute: "Tasbeeh",
        icon: "moon",
        dismissible: true,
      });
    }

    if (dhikr.totalCount >= 10000) {
      n.push({
        id: "dhikr_10k",
        category: "dhikr",
        title: "10,000 Dhikr!",
        body: "Ten thousand remembrances of Allah. Your tongue has been busy with good.",
        priority: "medium",
        reason: `You have completed ${dhikr.totalCount} total dhikr.`,
        icon: "award",
        dismissible: true,
      });
    }

    const m =
      dhikr.sessions.length > 0
        ? dhikr.sessions.slice(-7).reduce((s, x) => s + x.count, 0) / 7
        : 0;
    if (m > 100) {
      n.push({
        id: "dhikr_consistent",
        category: "dhikr",
        title: "Dhikr Warrior",
        body: `Averaging ${Math.round(m)} dhikr per day this week. The hearts find rest in the remembrance of Allah.`,
        priority: "low",
        reason: `Your 7-day dhikr average is ${Math.round(m)} per day.`,
        icon: "heart",
        dismissible: true,
      });
    }
  }

  private static fastingRules(p: NurAIUserProfileV3, n: NurAINudge[]) {
    if (isRamadan()) {
      n.push({
        id: "fasting_ramadan",
        category: "fasting",
        title: "Ramadan",
        body: "May every moment of this blessed month count.",
        priority: "high",
        reason: "It is currently the month of Ramadan.",
        icon: "moon",
        dismissible: true,
      });
      if (isLastTenNights()) {
        n.push({
          id: "fasting_last10",
          category: "fasting",
          title: "Last 10 Nights",
          body: "Seek Laylat al-Qadr! Better than 1,000 months. Make every night count.",
          priority: "critical",
          reason:
            "It is the last 10 nights of Ramadan \u2014 the window for Laylat al-Qadr.",
          icon: "star",
          dismissible: false,
        });
      }
    }
  }

  private static calendarRules(p: NurAIUserProfileV3, n: NurAINudge[]) {
    const events = getUpcomingEvents(14);
    events.forEach((e) => {
      n.push({
        id: `cal_${e.name.replace(/\s/g, "_")}`,
        category: "calendar",
        title: e.daysUntil === 0 ? e.name : `${e.name} in ${e.daysUntil} days`,
        body: e.description,
        priority: e.type === "major" && e.daysUntil <= 3 ? "high" : "medium",
        reason: `${e.name} is ${e.daysUntil === 0 ? "today" : `in ${e.daysUntil} days`} on the Islamic calendar (calculated estimate).`,
        icon: "calendar",
        dismissible: true,
      });
    });

    if (isFirstTenDhulHijjah()) {
      n.push({
        id: "cal_dhulhijjah",
        category: "calendar",
        title: "Best 10 Days of the Year",
        body: "No deeds are more beloved to Allah than these 10 days. Increase all good deeds.",
        priority: "critical",
        reason: "It is the first 10 days of Dhul Hijjah (calculated estimate).",
        icon: "star",
        dismissible: false,
      });
    }
  }

  private static learningRules(
    p: NurAIUserProfileV3,
    n: NurAINudge[],
    arabicProgress?: ArabicLearningProgress | null,
  ) {
    const speed = NurAIPatternDetectorV3.detectLearningSpeed(p.quizScores);
    const lessons = p.completedLessons.length;

    if (lessons >= 10) {
      n.push({
        id: "learn_10",
        category: "learning",
        title: "10 Lessons Complete!",
        body: "Knowledge seeker! The angels lower their wings for one who seeks knowledge.",
        priority: "medium",
        reason: `You have completed ${lessons} lessons.`,
        icon: "book",
        dismissible: true,
      });
    }

    if (speed === "fast") {
      n.push({
        id: "learn_fast",
        category: "learning",
        title: "Quick Learner!",
        body: "You're picking things up fast. Ready for more advanced content?",
        priority: "low",
        reason: "Your recent quiz scores are high and improving quickly.",
        icon: "zap",
        dismissible: true,
        actionLabel: "Explore",
        actionRoute: "ArabicLearning",
      });
    }

    this.arabicLearningRules(arabicProgress, n);
  }

  private static arabicLearningRules(
    progress: ArabicLearningProgress | null | undefined,
    n: NurAINudge[],
  ) {
    if (!progress) return;

    const today = getArabicLocalDateKey();
    const practisedToday = progress.lastPracticeDate === today;
    const reviewDone = progress.completedReviewTaskIds.length;
    const trackProgress = getArabicLearningProgressScore(
      progress,
      ARABIC_LEARNING_PROGRESS_TOTALS,
    );
    const totalPracticeSignals =
      progress.xp +
      progress.masteredLetterIndexes.length +
      Object.values(progress.dialoguePracticeCounts).reduce(
        (sum, count) => sum + count,
        0,
      ) +
      Object.values(progress.patternPracticeCounts).reduce(
        (sum, count) => sum + count,
        0,
      ) +
      Object.values(progress.wordReviewCounts).reduce(
        (sum, count) => sum + count,
        0,
      ) +
      Object.values(progress.gamePracticeCounts).reduce(
        (sum, count) => sum + count,
        0,
      );

    if (totalPracticeSignals === 0) {
      n.push({
        id: "arabic_start_path",
        category: "learning",
        title: "Start Arabic with meaning",
        body: "Begin with sounds, short dialogue, and Quranic words you will recognise in salah.",
        priority: "low",
        reason: "Your Arabic learning path has not started yet.",
        icon: "type",
        dismissible: true,
        actionLabel: "Start Arabic",
        actionRoute: "ArabicLearning",
      });
      return;
    }

    if (!practisedToday && progress.streakDays > 0) {
      n.push({
        id: "arabic_continue_streak",
        category: "learning",
        title: "Keep your Arabic streak alive",
        body: "One dialogue line or four Quranic words is enough to keep momentum today.",
        priority: progress.streakDays >= 3 ? "medium" : "low",
        reason: `Your Arabic streak is ${progress.streakDays} day${progress.streakDays === 1 ? "" : "s"}, and no practice is saved for today yet.`,
        icon: "zap",
        dismissible: true,
        actionLabel: "Review now",
        actionRoute: "ArabicLearning",
      });
    }

    if (reviewDone > 0 && reviewDone < ARABIC_REVIEW_TASK_COUNT) {
      n.push({
        id: "arabic_finish_review_loop",
        category: "learning",
        title: "Finish today's Arabic loop",
        body: "You have already started. Finish the remaining review cards while it is fresh.",
        priority: "medium",
        reason: `${reviewDone}/${ARABIC_REVIEW_TASK_COUNT} Arabic review tasks are complete today.`,
        icon: "repeat",
        dismissible: true,
        actionLabel: "Finish loop",
        actionRoute: "ArabicLearning",
      });
    }

    const weakTrack = Object.entries(trackProgress)
      .sort(([, a], [, b]) => a - b)
      .find(([, value]) => value < 45);
    if (weakTrack) {
      const [track] = weakTrack;
      const labels: Record<string, string> = {
        letters: "letters",
        dialogues: "dialogue",
        patterns: "sentence patterns",
        words: "Quranic words",
      };
      n.push({
        id: `arabic_strengthen_${track}`,
        category: "learning",
        title: `Strengthen ${labels[track] || track}`,
        body: "A short focused drill now will make the next lesson feel easier.",
        priority: "low",
        reason: `${labels[track] || track} is your lowest Arabic track right now.`,
        icon:
          track === "dialogues"
            ? "message-circle"
            : track === "patterns"
              ? "layers"
              : track === "words"
                ? "book-open"
                : "type",
        dismissible: true,
        actionLabel: "Practise",
        actionRoute: "ArabicLearning",
        actionParams: { focus: track },
      });
    }

    const gameReps = Object.values(progress.gamePracticeCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    if (gameReps === 0 && progress.xp >= 20) {
      n.push({
        id: "arabic_try_games",
        category: "learning",
        title: "Lock it in with a game",
        body: "Turn today's Arabic into quick recall with letter match, word builder, or quiz.",
        priority: "low",
        reason: "You have Arabic XP, but no practice game completions yet.",
        icon: "target",
        dismissible: true,
        actionLabel: "Play games",
        actionRoute: "ArabicGames",
      });
    }
  }

  private static hasanatRules(p: NurAIUserProfileV3, n: NurAINudge[]) {
    const trend = NurAIPatternDetectorV3.analyseHasanatTrend(p.hasanatLog);
    const total = p.totalHasanat;

    if (total >= 1000) {
      n.push({
        id: "hasanat_1k",
        category: "hasanat",
        title: "1,000 Hasanat!",
        body: "A mountain of good deeds. And this is just what you've tracked.",
        priority: "medium",
        reason: `You have accumulated ${total} hasanat.`,
        icon: "award",
        dismissible: true,
      });
    }

    if (trend === "declining") {
      n.push({
        id: "hasanat_decline",
        category: "hasanat",
        title: "Good deeds dipping",
        body: "Your hasanat are lower this week. Even a smile is charity.",
        priority: "low",
        reason: "Your hasanat this week are lower than the previous week.",
        icon: "heart",
        dismissible: true,
      });
    }
  }

  private static habitRules(p: NurAIUserProfileV3, n: NurAINudge[]) {
    const habits = p.habitData.habits;
    const fuse = NurAIPatternDetectorV3.fuseSignals(p);

    if (habits.length === 0) {
      const suggestion = suggestHabit(fuse.weakestArea, []);
      if (suggestion) {
        n.push({
          id: "habit_first",
          category: "habit",
          title: "Start tiny",
          body: `Try: "${suggestion.name}" \u2014 ${suggestion.routineDescription}. Tiny habits stick.`,
          priority: "low",
          reason: `Your weakest area is ${fuse.weakestArea} and you have no habits set up yet.`,
          icon: "plus-circle",
          dismissible: true,
        });
      }
    }

    habits.forEach((h) => {
      const stage = NurAIPatternDetectorV3.detectHabitStage(h.streak);
      if (h.streak >= 7 && h.streak % 7 === 0) {
        n.push({
          id: `habit_week_${h.id}`,
          category: "habit",
          title: `${h.name}: ${h.streak} days!`,
          body: getHabitMotivation(h.streak, stage),
          priority: "medium",
          reason: `Your habit "${h.name}" has a ${h.streak}-day streak (${stage} stage).`,
          icon: "check-circle",
          dismissible: true,
        });
      }
    });
  }

  private static emotionalRules(p: NurAIUserProfileV3, n: NurAINudge[]) {
    const state = p.emotionalContext.currentState;
    const tone = EMOTION_TONE[state];
    if (!tone) return;

    if (state === "struggling" || state === "grieving") {
      n.push({
        id: "emo_comfort",
        category: "emotional",
        title: "A gentle reminder",
        body: "The Quran pairs hardship with ease (94:5\u20136). If it feels helpful, choose one small next step.",
        priority: "high",
        reason:
          "Your saved check-in asks NurAI to use a gentler response style.",
        icon: "heart",
        dismissible: true,
        actionLabel: "Comfort Duas",
        actionRoute: "Duas",
      });
    }

    if (state === "anxious") {
      n.push({
        id: "emo_calm",
        category: "emotional",
        title: "Breathe",
        body: "Unquestionably, by the remembrance of Allah hearts are assured. (13:28)",
        priority: "high",
        reason:
          "Your saved check-in asks NurAI to use a calmer response style.",
        actionLabel: "Open Tasbeeh",
        actionRoute: "Tasbeeh",
        icon: "wind",
        dismissible: true,
      });
    }

    if (state === "returning") {
      n.push({
        id: "emo_return",
        category: "emotional",
        title: "Welcome back!",
        body: "You have returned after time away. Choose one manageable action and rebuild your rhythm gently.",
        priority: "high",
        reason: "You have been away for a few days and just returned.",
        icon: "rotate-ccw",
        dismissible: true,
      });
    }
  }

  private static engagementRules(p: NurAIUserProfileV3, n: NurAINudge[]) {
    const trend = NurAIPatternDetectorV3.detectEngagementTrend(p.appOpenTimes);

    if (trend === "declining" && p.totalDaysActive >= 14) {
      n.push({
        id: "eng_decline",
        category: "engagement",
        title: "A lighter rhythm",
        body: "Your recent app activity is lighter. If you want to restart, choose one small action without trying to catch up all at once.",
        priority: "medium",
        reason:
          "Your app usage has decreased compared to the previous 2 weeks.",
        icon: "heart",
        dismissible: true,
      });
    }

    if (p.totalDaysActive === 1) {
      n.push({
        id: "eng_welcome",
        category: "engagement",
        title: "Welcome to NurAI",
        body: "Your journey begins today. Explore at your own pace \u2014 there's no rush.",
        priority: "high",
        reason: "This is your first day using NurAI.",
        icon: "smile",
        dismissible: true,
      });
    }

    if (p.totalDaysActive === 7) {
      n.push({
        id: "eng_7days",
        category: "engagement",
        title: "One Week!",
        body: "A full week with NurAI. JazakAllah khair for trusting us on your journey.",
        priority: "medium",
        reason: "You have been active for 7 days total.",
        icon: "gift",
        dismissible: true,
      });
    }

    if (p.totalDaysActive === 30) {
      n.push({
        id: "eng_30days",
        category: "engagement",
        title: "One Month Together",
        body: "30 days of spiritual companionship. Your consistency speaks volumes.",
        priority: "medium",
        reason: "You have been active for 30 days total.",
        icon: "award",
        dismissible: true,
      });
    }
  }

  private static revertRules(p: NurAIUserProfileV3, n: NurAINudge[]) {
    if (!p.isRevert || !p.revertData) return;
    const risk = NurAIPatternDetectorV3.assessRevertRisk(p);

    if (risk.riskLevel === "critical" || risk.riskLevel === "high") {
      n.push({
        id: "revert_support",
        category: "revert",
        title: "You're not alone",
        body: "Every Muslim's journey has ups and downs. Even the Companions had hard days. Your sincerity brought you here.",
        priority: "critical",
        reason:
          "Extra support mode is active based on your journey stage and engagement.",
        icon: "heart",
        dismissible: true,
      });
    }

    const days = p.revertData.daysSinceShahada || 0;
    const milestones = [7, 30, 90, 180, 365, 730, 1095];
    milestones.forEach((m) => {
      if (days >= m && days < m + 7) {
        const labels: Record<number, string> = {
          7: "First Week",
          30: "First Month",
          90: "Three Months",
          180: "Six Months",
          365: "One Year",
          730: "Two Years",
          1095: "Three Years",
        };
        n.push({
          id: `revert_${m}`,
          category: "revert",
          title: `${labels[m]} Since Shahada!`,
          body: `${days} days on the straight path. SubhanAllah \u2014 may every day bring you closer.`,
          priority: "high",
          reason: `You are ${days} days since shahada, reaching the "${labels[m]}" milestone.`,
          icon: "award",
          dismissible: true,
        });
      }
    });
  }

  private static familyRules(
    p: NurAIUserProfileV3,
    n: NurAINudge[],
    pw: PrayerWindowContext,
  ) {
    if (!p.familyData) return;

    if (
      p.familyData.role === "parent" &&
      p.familyData.kidsMode &&
      (pw.isAfterAsr || pw.isAfterMaghrib)
    ) {
      n.push({
        id: "family_kids_time",
        category: "family",
        title: "Family Quran Time",
        body: "Perfect time to sit with the kids and read a short surah together.",
        priority: "low",
        reason:
          "It is after Asr/Maghrib \u2014 a good time for family Quran reading.",
        icon: "users",
        dismissible: true,
      });
    }

    if (isIslamicFriday() && p.familyData.sharedStreakEnabled) {
      n.push({
        id: "family_friday",
        category: "family",
        title: "Family Friday",
        body: "Send salawat on the Prophet \uFDFA together as a family today.",
        priority: "low",
        reason: "It is Friday and your family shared streak is active.",
        icon: "users",
        dismissible: true,
      });
    }
  }

  private static womensHealthRules(p: NurAIUserProfileV3, n: NurAINudge[]) {
    if (!p.cycleData || !p.cycleData.cycles.length) return;
    const pred = NurAIPatternDetectorV3.predictCycle(p.cycleData.cycles);

    if (
      pred.daysUntilPeriod <= 3 &&
      pred.daysUntilPeriod > 0 &&
      pred.confidence >= 0.6
    ) {
      n.push({
        id: "wh_upcoming",
        category: "womensHealth",
        title: "Cycle estimate",
        body: `Your next cycle is estimated in about ${pred.daysUntilPeriod} days. This is a planning estimate, not a medical or fiqh classification.`,
        priority: "medium",
        reason: `Based only on your logged cycle dates (${Math.round(pred.confidence * 100)}% pattern confidence).`,
        icon: "heart",
        dismissible: true,
      });
    }

    if (p.cycleData.currentPhase === "haidh") {
      n.push({
        id: "wh_haidh",
        category: "womensHealth",
        title: "Cycle status saved",
        body: "NurAI can quiet prayer-completion prompts while your cycle status is active. Check your selected madhhab guidance or a qualified scholar for recitation and personal fiqh questions.",
        priority: "medium",
        reason: "Your cycle status is currently set to active.",
        icon: "heart",
        dismissible: true,
        actionLabel: "Duas",
        actionRoute: "Duas",
      });
    }

    if (pred.missedPeriods >= 2) {
      n.push({
        id: "wh_missed",
        category: "womensHealth",
        title: "Your logged pattern changed",
        body: "A late or changing cycle can have many causes and this app cannot determine why. If the change concerns you, take a pregnancy test when relevant and speak with a qualified clinician.",
        priority: "low",
        reason:
          "No new cycle start was logged within the recent pattern window.",
        icon: "info",
        dismissible: true,
      });
    }

    const qada =
      (p.cycleData.missedRamadanFasts || 0) -
      (p.cycleData.qadaFastsCompleted || 0);
    if (qada > 0 && !isRamadan()) {
      n.push({
        id: "wh_qada",
        category: "womensHealth",
        title: `${qada} Qada Fasts Remaining`,
        body: "Use this as a private planning count. Choose days that fit your health, and ask a qualified scholar if the number or ruling is uncertain.",
        priority: "low",
        reason: `${p.cycleData.missedRamadanFasts} fasts missed minus ${p.cycleData.qadaFastsCompleted} completed = ${qada} remaining.`,
        icon: "calendar",
        dismissible: true,
      });
    }
  }

  private static discoveryRules(p: NurAIUserProfileV3, n: NurAINudge[]) {
    const disc = NurAIPatternDetectorV3.analyseFeatureDiscovery(
      p.featureDiscovery,
    );
    if (disc.percentage < 50 && disc.recommendation && p.totalDaysActive >= 3) {
      const labels: Record<string, string> = {
        prayer: "Prayer Times",
        quran: "Quran",
        duas: "Duas Collection",
        tasbeeh: "Tasbeeh Counter",
        qibla: "Qibla Finder",
        calendar: "Islamic Calendar",
        names: "99 Names of Allah",
        zakat: "Zakat Calculator",
        hadith: "Verified Hadith Anchors",
        explore: "Explore",
        community: "Community",
        streaks: "Streaks",
        hasanat: "Hasanat Tracker",
        settings: "Settings",
        fiqh: "Islamic Finance",
        stories: "Kids Stories",
      };
      n.push({
        id: "disc_" + disc.recommendation,
        category: "discovery",
        title: `Have you tried ${labels[disc.recommendation] || disc.recommendation}?`,
        body: `You've explored ${disc.percentage}% of NurAI. Discover something new today.`,
        priority: "low",
        reason: `You have used ${disc.percentage}% of features. "${labels[disc.recommendation] || disc.recommendation}" hasn't been opened yet.`,
        icon: "compass",
        dismissible: true,
      });
    }
  }

  private static async smartPrioritise(
    nudges: NurAINudge[],
    profile: NurAIUserProfileV3,
  ): Promise<NurAINudge[]> {
    const dismissed = await loadDismissed();
    const scores = await loadEngagementScores();
    const maturity = this.detectMaturity(profile);
    const fatigue = profile.notificationData?.fatigueLevel || "fresh";

    const maturityCap: Record<string, number> = {
      new: 2,
      developing: 3,
      established: 4,
      veteran: 6,
    };
    const fatigueCap: Record<string, number> = {
      tired: 2,
      normal: 4,
      fresh: 6,
    };
    const maxNudges = Math.min(maturityCap[maturity], fatigueCap[fatigue]);

    const active = nudges.filter((n) => {
      if (n.priority === "critical") return true;
      return !isDismissedToday(n.id, dismissed);
    });

    const priorityScore: Record<NudgePriority, number> = {
      critical: 100,
      high: 70,
      medium: 40,
      low: 15,
    };

    const scored = active.map((n) => {
      let score = priorityScore[n.priority];

      const catScore = scores[n.category];
      if (catScore) {
        const engagementBonus =
          (catScore.actionRate - catScore.dismissRate) * 20;
        score += engagementBonus;
      }

      if (
        isRamadan() &&
        ["fasting", "prayer", "calendar", "quran"].includes(n.category)
      )
        score += 15;
      if (isIslamicFriday() && n.category === "quran") score += 10;
      if (
        isFirstTenDhulHijjah() &&
        ["calendar", "prayer", "fasting"].includes(n.category)
      )
        score += 15;

      if (
        (["prayer", "dhikr"].includes(n.category) && n.id.includes("now")) ||
        n.id.includes("morning") ||
        n.id.includes("evening")
      )
        score += 10;

      if (
        maturity === "new" &&
        ["engagement", "discovery"].includes(n.category)
      )
        score += 15;

      if (
        maturity === "veteran" &&
        ["habit", "learning", "emotional"].includes(n.category)
      )
        score += 10;

      return { nudge: n, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxNudges).map((s) => s.nudge);
  }
}
