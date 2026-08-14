import { useState, useEffect, useCallback, useRef } from "react";
import {
  initNurAIV3,
  refreshNurAIV3,
  trackFeature,
  trackNudgeResponse,
  NurAIV3State,
  invalidateV3Cache,
} from "../services/nuraiEngineV3";
import {
  setHijriAdjustment,
  loadHijriAdjustment,
} from "../services/nuraiHijriEngine";
import {
  computePrayerWindow,
  PrayerWindowContext,
  dismissNudgeV3,
  recordNudgeEngagement,
} from "../services/nuraiRuleEngineV3";

export function useNurAIV3() {
  const [state, setState] = useState<NurAIV3State | null>(null);
  const [loading, setLoading] = useState(true);
  const [hijriAdjustment, setHijriAdj] = useState(0);
  const mounted = useRef(true);
  const dismissedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout>;

    (async () => {
      try {
        const adj = await loadHijriAdjustment();
        if (mounted.current) setHijriAdj(adj);
        const s = await initNurAIV3();
        if (mounted.current) {
          setState(s);
          setLoading(false);
        }
      } catch {
        if (mounted.current) setLoading(false);
      }
    })();

    timer = setInterval(async () => {
      try {
        const s = await refreshNurAIV3();
        if (mounted.current) {
          const filtered =
            dismissedIdsRef.current.size > 0
              ? {
                  ...s,
                  nudges: s.nudges.filter(
                    (n) => !dismissedIdsRef.current.has(n.id),
                  ),
                }
              : s;
          setState(filtered);
        }
      } catch {}
    }, 300000);

    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const s = await refreshNurAIV3();
      if (mounted.current) {
        const filtered =
          dismissedIdsRef.current.size > 0
            ? {
                ...s,
                nudges: s.nudges.filter(
                  (n) => !dismissedIdsRef.current.has(n.id),
                ),
              }
            : s;
        setState(filtered);
      }
    } catch {}
  }, []);

  const logFeature = useCallback(async (feature: string) => {
    await trackFeature(feature);
  }, []);

  const respondToNudge = useCallback(
    async (nudgeId: string, responded: boolean) => {
      const category =
        state?.nudges.find((n) => n.id === nudgeId)?.category || "unknown";

      if (!responded) {
        dismissedIdsRef.current.add(nudgeId);
        if (mounted.current) {
          setState((prev) =>
            prev
              ? { ...prev, nudges: prev.nudges.filter((n) => n.id !== nudgeId) }
              : prev,
          );
        }
      }

      await recordNudgeEngagement(category, responded);
      if (!responded) {
        await dismissNudgeV3(nudgeId, category);
      }
      await trackNudgeResponse(nudgeId, responded);
      invalidateV3Cache();
    },
    [state],
  );

  const adjustHijri = useCallback(async (days: number) => {
    await setHijriAdjustment(days);
    setHijriAdj(Math.max(-2, Math.min(2, days)));
    const s = await refreshNurAIV3();
    if (mounted.current) setState(s);
  }, []);

  const getPrayerWindow = useCallback(
    (prayerTimes?: {
      fajr?: string;
      sunrise?: string;
      dhuhr?: string;
      asr?: string;
      maghrib?: string;
      isha?: string;
    }): PrayerWindowContext => {
      return computePrayerWindow(prayerTimes);
    },
    [],
  );

  return {
    state,
    loading,
    refresh,
    logFeature,
    respondToNudge,
    adjustHijri,
    hijriAdjustment,
    getPrayerWindow,
  };
}
