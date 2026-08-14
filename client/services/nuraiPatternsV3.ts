import {
  NurAIUserProfileV3,
  EmotionalState,
  PersonalityType,
} from "./nuraiProfileV3";

function daysAgo(dateStr: string): number {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export class NurAIPatternDetectorV3 {
  static detectEngagementTrend(
    openTimes: string[],
    window = 14,
  ): "growing" | "stable" | "declining" {
    if (!openTimes || openTimes.length < 5) return "stable";
    const now = Date.now(),
      ms = 86400000;
    const recent = openTimes.filter(
      (t) => (now - new Date(t).getTime()) / ms <= window,
    ).length;
    const prev = openTimes.filter((t) => {
      const d = (now - new Date(t).getTime()) / ms;
      return d > window && d <= window * 2;
    }).length;
    const rF = recent / window,
      pF = prev / Math.max(window, 1);
    if (pF === 0) return recent > 0 ? "growing" : "stable";
    if (rF < pF * 0.6) return "declining";
    if (rF > pF * 1.3) return "growing";
    return "stable";
  }

  static detectBestNotificationTime(openTimes: string[]): {
    hour: number;
    day: number;
  } {
    if (!openTimes || openTimes.length < 7) return { hour: 9, day: 5 };
    const hc = new Array(24).fill(0),
      dc = new Array(7).fill(0);
    openTimes.forEach((t) => {
      const d = new Date(t);
      hc[d.getHours()]++;
      dc[d.getDay()]++;
    });
    return {
      hour: hc.indexOf(Math.max(...hc)),
      day: dc.indexOf(Math.max(...dc)),
    };
  }

  static detectLearningSpeed(
    quizScores: { score: number }[],
  ): "slow" | "steady" | "fast" {
    if (!quizScores || quizScores.length < 3) return "steady";
    const r = quizScores.slice(-3).reduce((s, q) => s + q.score, 0) / 3;
    const e =
      quizScores.length > 5
        ? quizScores.slice(0, 3).reduce((s, q) => s + q.score, 0) / 3
        : r;
    if (r > 80 && r - e > 10) return "fast";
    if (r < 50 || r < e) return "slow";
    return "steady";
  }

  static predictCycle(cycles: { startDate: string; length: number }[]): {
    daysUntilPeriod: number;
    confidence: number;
    missedPeriods: number;
    irregular: boolean;
    averageLength: number;
  } {
    // Calendar planning only. A late logged cycle is never treated as a
    // pregnancy signal and this function must not be used to diagnose a cause.
    if (!cycles || cycles.length < 2)
      return {
        daysUntilPeriod: 0,
        confidence: 0,
        missedPeriods: 0,
        irregular: false,
        averageLength: 28,
      };
    const recent = cycles.slice(-6);
    const avg = recent.reduce((s, c) => s + c.length, 0) / recent.length;
    const std = Math.sqrt(
      recent.reduce((s, c) => s + Math.pow(c.length - avg, 2), 0) /
        recent.length,
    );
    const last = new Date(cycles[cycles.length - 1].startDate);
    const ds = Math.floor((Date.now() - last.getTime()) / 86400000);
    return {
      daysUntilPeriod: Math.max(0, Math.round(avg) - ds),
      confidence: std < 3 ? 0.9 : std < 5 ? 0.7 : 0.4,
      missedPeriods: ds > avg + std * 2 ? Math.floor((ds - avg) / avg) : 0,
      irregular: std > 5,
      averageLength: Math.round(avg),
    };
  }

  static findWeakestPrayer(
    logs: {
      fajr: boolean;
      dhuhr: boolean;
      asr: boolean;
      maghrib: boolean;
      isha: boolean;
    }[],
  ): { prayer: string; missRate: number } | null {
    if (!logs || logs.length < 7) return null;
    const last = logs.slice(-30);
    const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
    let worst = { prayer: "", missRate: 0 };
    prayers.forEach((p) => {
      const r = last.filter((d) => !(d as any)[p]).length / last.length;
      if (r > worst.missRate) worst = { prayer: p, missRate: r };
    });
    return worst.missRate > 0.2 ? worst : null;
  }

  static isPrayerImproving(
    logs: {
      fajr: boolean;
      dhuhr: boolean;
      asr: boolean;
      maghrib: boolean;
      isha: boolean;
    }[],
  ): boolean {
    if (!logs || logs.length < 14) return false;
    const c = (l: typeof logs) =>
      l.reduce(
        (s, d) =>
          s +
          (d.fajr ? 1 : 0) +
          (d.dhuhr ? 1 : 0) +
          (d.asr ? 1 : 0) +
          (d.maghrib ? 1 : 0) +
          (d.isha ? 1 : 0),
        0,
      );
    return c(logs.slice(-7)) > c(logs.slice(-14, -7)) + 2;
  }

  static detectComfortSeeking(quranToday: number[]): boolean {
    if (!quranToday || quranToday.length < 3) return false;
    const c: Record<number, number> = {};
    quranToday.forEach((s) => (c[s] = (c[s] || 0) + 1));
    return Object.values(c).some((v) => v >= 3);
  }

  static inferEmotionalState(profile: NurAIUserProfileV3): EmotionalState {
    try {
      const eng = this.detectEngagementTrend(profile.appOpenTimes);
      const hour = new Date().getHours();
      const sessions = profile.sessionData?.sessionsToday || 0;
      const avg = profile.sessionData?.averageSessionDuration || 0;
      const feats = (profile.featureDiscovery || []).length;

      // Behaviour can describe an app rhythm; it cannot reliably diagnose a
      // person's feelings. Only keep explicit/observable engagement modes here.
      // Distress-oriented response styles must come from a user check-in or the
      // words they deliberately share with NurAI, never from taps or session
      // length. A return is a one-session event written by recordAppOpenV3;
      // never treat the persisted currentState as a permanent personality.
      const latestReturn = [...(profile.emotionalContext?.stateHistory || [])]
        .reverse()
        .find((entry) => entry.state === "returning");
      if (
        profile.emotionalContext?.currentState === "returning" &&
        latestReturn?.date === profile.lastActive
      ) {
        return "returning";
      }
      if (eng === "growing" && feats > 5 && sessions >= 2) return "motivated";
      if (feats > 8 && avg < 5) return "exploring";
      if (avg > 15 && sessions <= 2) return "deepening";
      if ((hour >= 22 || hour <= 4) && avg > 10) return "contemplative";
      if (eng === "stable" && avg < 3 && sessions <= 1) return "neutral";
      return "neutral";
    } catch {
      return "neutral";
    }
  }

  static detectPersonalityType(profile: NurAIUserProfileV3): {
    type: PersonalityType;
    confidence: number;
  } {
    try {
      const s = profile.personalitySignals;
      if (!s) return { type: "encourager", confidence: 0 };
      const scores = {
        encourager: 1 - (s.celebrationDismissRate || 0),
        challenger: s.challengeDismissRate < 0.3 ? 0.8 : 0.2,
        scholar: 1 - (s.knowledgeDismissRate || 0),
        feeler: s.storyEngagementRate || 0,
      };
      const entries = Object.entries(scores) as [PersonalityType, number][];
      entries.sort((a, b) => b[1] - a[1]);
      return {
        type: entries[0][0],
        confidence: Math.min(1, entries[0][1] - entries[1][1] + 0.3),
      };
    } catch {
      return { type: "encourager", confidence: 0 };
    }
  }

  static inferSleepPattern(lastActiveHours: number[]): {
    bedtime: string;
    wakeTime: string;
    isNightOwl: boolean;
    isFajrRiser: boolean;
    confidence: number;
  } {
    if (!lastActiveHours || lastActiveHours.length < 7)
      return {
        bedtime: "23:00",
        wakeTime: "06:00",
        isNightOwl: false,
        isFajrRiser: false,
        confidence: 0,
      };
    const ha = new Array(24).fill(0);
    lastActiveHours.forEach((h) => ha[h]++);
    const threshold = Math.max(1, lastActiveHours.length * 0.05);
    let maxStart = 0,
      maxLen = 0,
      curStart = -1,
      curLen = 0;
    for (let i = 0; i < 48; i++) {
      const h = i % 24;
      if (ha[h] <= threshold) {
        if (curStart === -1) curStart = h;
        curLen++;
        if (curLen > maxLen) {
          maxLen = curLen;
          maxStart = curStart;
        }
      } else {
        curStart = -1;
        curLen = 0;
      }
    }
    const bed = maxStart > 0 ? (maxStart - 1 + 24) % 24 : 23;
    const wake = (maxStart + maxLen) % 24;
    return {
      bedtime: `${String(bed).padStart(2, "0")}:00`,
      wakeTime: `${String(wake).padStart(2, "0")}:00`,
      isNightOwl: bed >= 0 && bed <= 3,
      isFajrRiser: wake >= 4 && wake <= 6,
      confidence: Math.min(1, lastActiveHours.length / 30),
    };
  }

  static calculatePrayerConsistency(
    logs: {
      fajr: boolean;
      dhuhr: boolean;
      asr: boolean;
      maghrib: boolean;
      isha: boolean;
    }[],
  ): number {
    if (!logs || logs.length === 0) return 0;
    const l = logs.slice(-30);
    return Math.round(
      (l.reduce(
        (s, d) =>
          s +
          (d.fajr ? 1 : 0) +
          (d.dhuhr ? 1 : 0) +
          (d.asr ? 1 : 0) +
          (d.maghrib ? 1 : 0) +
          (d.isha ? 1 : 0),
        0,
      ) /
        (l.length * 5)) *
        100,
    );
  }

  static analyseQuranPattern(
    sessions: { date: string; duration: number; versesRead: number }[],
  ): {
    bestTime: string;
    consistency: number;
    trend: "improving" | "stable" | "declining";
  } {
    if (!sessions || sessions.length < 3)
      return { bestTime: "any", consistency: 0, trend: "stable" };
    const hc = new Array(24).fill(0);
    sessions.forEach((s) => hc[new Date(s.date).getHours()]++);
    const peak = hc.indexOf(Math.max(...hc));
    const timeMap: Record<number, string> = {};
    for (let i = 4; i <= 5; i++) timeMap[i] = "fajr";
    for (let i = 6; i <= 11; i++) timeMap[i] = "morning";
    for (let i = 12; i <= 13; i++) timeMap[i] = "dhuhr";
    for (let i = 21; i <= 23; i++) timeMap[i] = "night";
    timeMap[0] = "night";
    timeMap[1] = "tahajjud";
    timeMap[2] = "tahajjud";
    timeMap[3] = "tahajjud";
    const durations = sessions.map((s) => s.duration);
    const recentAvg = durations.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const prevAvg =
      durations.length > 5
        ? durations.slice(0, -5).reduce((a, b) => a + b, 0) /
          (durations.length - 5)
        : recentAvg;
    return {
      bestTime: timeMap[peak] || "any",
      consistency: Math.min(100, Math.round((sessions.length / 30) * 100)),
      trend:
        recentAvg > prevAvg * 1.15
          ? "improving"
          : recentAvg < prevAvg * 0.85
            ? "declining"
            : "stable",
    };
  }

  static assessStreakRisk(profile: NurAIUserProfileV3): {
    risk: "safe" | "warning" | "danger";
    hoursLeft: number;
  } {
    if (
      !profile.streakData?.lastCompletedDate ||
      profile.streakData.currentStreak === 0
    )
      return { risk: "safe", hoursLeft: 24 };
    const today = new Date().toISOString().split("T")[0];
    if (profile.streakData.lastCompletedDate.split("T")[0] === today)
      return { risk: "safe", hoursLeft: 24 };
    const midnight = new Date();
    midnight.setHours(23, 59, 59, 999);
    const hrs = Math.max(0, (midnight.getTime() - Date.now()) / 3600000);
    if (hrs < 2)
      return { risk: "danger", hoursLeft: Math.round(hrs * 10) / 10 };
    if (hrs < 6)
      return { risk: "warning", hoursLeft: Math.round(hrs * 10) / 10 };
    return { risk: "safe", hoursLeft: Math.round(hrs * 10) / 10 };
  }

  static analyseFeatureDiscovery(discovered: string[]): {
    percentage: number;
    recommendation: string;
  } {
    const all = [
      "prayer",
      "quran",
      "duas",
      "tasbeeh",
      "qibla",
      "calendar",
      "names",
      "zakat",
      "hadith",
      "explore",
      "community",
      "streaks",
      "hasanat",
      "settings",
      "fiqh",
      "stories",
    ];
    const found = (discovered || []).filter((f) => all.includes(f)).length;
    const undiscovered = all.filter((f) => !(discovered || []).includes(f));
    return {
      percentage: Math.round((found / all.length) * 100),
      recommendation:
        undiscovered[Math.floor(Math.random() * undiscovered.length)] || "",
    };
  }

  static analyseHasanatTrend(
    log: { date: string; points: number }[],
  ): "growing" | "stable" | "declining" {
    if (!log || log.length < 7) return "stable";
    const r = log
      .filter((h) => daysAgo(h.date) <= 7)
      .reduce((s, h) => s + h.points, 0);
    const p = log
      .filter((h) => daysAgo(h.date) > 7 && daysAgo(h.date) <= 14)
      .reduce((s, h) => s + h.points, 0);
    if (p > 0 && r > p * 1.2) return "growing";
    if (p > 0 && r < p * 0.8) return "declining";
    return "stable";
  }

  static analyseDhikrPattern(
    sessions: { date: string; type: string; count: number }[],
  ): { bestTime: string; averageDaily: number; preferredDhikr: string } {
    if (!sessions || sessions.length < 3)
      return { bestTime: "any", averageDaily: 0, preferredDhikr: "" };
    const hc = new Array(24).fill(0);
    const dc: Record<string, number> = {};
    sessions.forEach((s) => {
      hc[new Date(s.date).getHours()]++;
      dc[s.type] = (dc[s.type] || 0) + s.count;
    });
    const peak = hc.indexOf(Math.max(...hc));
    const top = Object.entries(dc).sort((a, b) => b[1] - a[1])[0];
    const days = new Set(sessions.map((s) => s.date.split("T")[0])).size;
    return {
      bestTime: `${String(peak).padStart(2, "0")}:00`,
      averageDaily: Math.round(
        sessions.reduce((s, x) => s + x.count, 0) / Math.max(days, 1),
      ),
      preferredDhikr: top ? top[0] : "",
    };
  }

  static detectNotificationFatigue(
    history: { responded: boolean }[],
  ): "fresh" | "normal" | "tired" {
    if (!history || history.length < 5) return "fresh";
    const r = history.slice(-10);
    const d = r.filter((h) => !h.responded).length / r.length;
    return d >= 0.8 ? "tired" : d >= 0.5 ? "normal" : "fresh";
  }

  static detectHabitStage(
    streak: number,
  ): "awareness" | "action" | "automation" {
    if (streak >= 66) return "automation";
    if (streak >= 21) return "action";
    return "awareness";
  }

  static fuseSignals(profile: NurAIUserProfileV3): {
    overallScore: number;
    strongestArea: string;
    weakestArea: string;
    momentum: "accelerating" | "steady" | "decelerating";
  } {
    try {
      const scores: Record<string, number> = {
        prayer: this.calculatePrayerConsistency(profile.prayerLogs),
        quran: Math.min(
          100,
          (profile.quranReadingHabit?.averageDailyMinutes || 0) * 10,
        ),
        streak: Math.min(100, (profile.streakData?.currentStreak || 0) * 2),
        hasanat: Math.min(100, (profile.totalHasanat || 0) / 10),
        learning: Math.min(100, (profile.completedLessons || []).length * 5),
      };
      const overall = Math.round(
        Object.values(scores).reduce((s, v) => s + v, 0) /
          Object.keys(scores).length,
      );
      const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      const eng = this.detectEngagementTrend(profile.appOpenTimes);
      return {
        overallScore: overall,
        strongestArea: sorted[0][0],
        weakestArea: sorted[sorted.length - 1][0],
        momentum:
          eng === "growing"
            ? "accelerating"
            : eng === "declining"
              ? "decelerating"
              : "steady",
      };
    } catch {
      return {
        overallScore: 0,
        strongestArea: "prayer",
        weakestArea: "prayer",
        momentum: "steady",
      };
    }
  }

  static assessRevertRisk(profile: NurAIUserProfileV3): {
    riskLevel: "low" | "medium" | "high" | "critical";
    reason: string;
  } {
    if (!profile.isRevert || !profile.revertData)
      return { riskLevel: "low", reason: "" };
    const days = profile.revertData.daysSinceShahada || 0;
    const eng = this.detectEngagementTrend(profile.appOpenTimes);
    let score = 0;
    if (days < 90) score += 2;
    else if (days < 365) score += 1;
    if (eng === "declining") score += 3;
    if (profile.revertData.familySituation === "hostile") score += 2;
    if (
      profile.revertData.supportNetwork === "none" ||
      profile.revertData.supportNetwork === "weak"
    )
      score += 2;
    if (score >= 6)
      return {
        riskLevel: "critical",
        reason: "Declining engagement with weak support",
      };
    if (score >= 4)
      return { riskLevel: "high", reason: "Multiple risk factors" };
    if (score >= 2)
      return { riskLevel: "medium", reason: "Some risk factors present" };
    return { riskLevel: "low", reason: "" };
  }

  static prayerTimeSeries(
    logs: {
      fajr: boolean;
      dhuhr: boolean;
      asr: boolean;
      maghrib: boolean;
      isha: boolean;
    }[],
    window: number = 30,
  ): {
    fajr: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
    overall: number;
  } {
    if (!logs || logs.length === 0)
      return { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, overall: 0 };
    const s = logs.slice(-window),
      c = s.length;
    if (c === 0)
      return { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, overall: 0 };
    const f = Math.round((s.filter((d) => d.fajr).length / c) * 100);
    const d = Math.round((s.filter((d) => d.dhuhr).length / c) * 100);
    const a = Math.round((s.filter((d) => d.asr).length / c) * 100);
    const m = Math.round((s.filter((d) => d.maghrib).length / c) * 100);
    const i = Math.round((s.filter((d) => d.isha).length / c) * 100);
    return {
      fajr: f,
      dhuhr: d,
      asr: a,
      maghrib: m,
      isha: i,
      overall: Math.round((f + d + a + m + i) / 5),
    };
  }

  static generateWeeklyInsight(profile: NurAIUserProfileV3): {
    headline: string;
    detail: string;
    direction: "up" | "down" | "same";
  } | null {
    try {
      const now = this.prayerTimeSeries(profile.prayerLogs, 7);
      const prev = this.prayerTimeSeries(profile.prayerLogs.slice(0, -7), 7);
      const changes: Record<string, number> = {
        fajr: now.fajr - prev.fajr,
        dhuhr: now.dhuhr - prev.dhuhr,
        asr: now.asr - prev.asr,
        maghrib: now.maghrib - prev.maghrib,
        isha: now.isha - prev.isha,
      };
      const big = Object.entries(changes).sort(
        (a, b) => Math.abs(b[1]) - Math.abs(a[1]),
      )[0];
      if (!big || Math.abs(big[1]) < 10) return null;
      const name = big[0].charAt(0).toUpperCase() + big[0].slice(1);
      const dir = big[1] > 0 ? "up" : "down";
      return dir === "up"
        ? {
            headline: `${name} is your star this week`,
            detail: `You prayed ${name} ${Math.abs(big[1])}% more than last week!`,
            direction: "up",
          }
        : {
            headline: `${name} needs a little love`,
            detail: `${name} dropped ${Math.abs(big[1])}% this week. One prayer at a time.`,
            direction: "down",
          };
    } catch {
      return null;
    }
  }
}
