import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { syncedSetItem } from "@/lib/progress-sync";
import { useNurAI } from "@/context/NurAIContext";
import { trackDhikr } from "@/services/achievementsTracker";
import { updateNurAIWidgetSnapshot } from "@/lib/widget-snapshot";
import { recordGardenAction } from "@/services/gardenService";
import {
  NuraiBottomSheet,
  NuraiButton,
  NuraiListRow,
  NuraiSpace,
  NuraiTouch,
  NuraiType,
} from "@/design-system";
import { AppIcon, type AppIconName } from "@/components/icons";

const STORAGE = {
  count: "tasbeeh_count",
  target: "tasbeeh_target",
  dhikr: "tasbeeh_dhikr",
  custom: "tasbeeh_custom_dhikr",
  theme: "tasbeeh_theme",
  design: "tasbeeh_design",
  lifetime: "tasbeeh_lifetime",
  streak: "tasbeeh_streak",
  daily: "tasbeeh_daily_total",
};

const TARGETS = [33, 99, 100, 1000] as const;

interface DhikrItem {
  id: string;
  name: string;
  arabic: string;
  translation: string;
  isCustom?: boolean;
}

const DHIKR_LIST: DhikrItem[] = [
  {
    id: "subhanallah",
    name: "SubhanAllah",
    arabic: "سُبْحَانَ اللَّهِ",
    translation: "Glory be to Allah",
  },
  {
    id: "alhamdulillah",
    name: "Alhamdulillah",
    arabic: "الْحَمْدُ لِلَّهِ",
    translation: "All praise is due to Allah",
  },
  {
    id: "allahuakbar",
    name: "Allahu Akbar",
    arabic: "اللَّهُ أَكْبَرُ",
    translation: "Allah is the Greatest",
  },
  {
    id: "lailaha",
    name: "La ilaha illa Allah",
    arabic: "لَا إِلَٰهَ إِلَّا اللَّهُ",
    translation: "There is no god but Allah",
  },
  {
    id: "astaghfirullah",
    name: "Astaghfirullah",
    arabic: "أَسْتَغْفِرُ اللَّهَ",
    translation: "I seek forgiveness from Allah",
  },
  {
    id: "salawat",
    name: "Salawat",
    arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّد",
    translation: "O Allah, send blessings upon Muhammad",
  },
];

interface TasbeehTheme {
  id: string;
  name: string;
  bg: string;
  bgSoft: string;
  surface: string;
  border: string;
  accent: string;
  gold: string;
  text: string;
  muted: string;
  faint: string;
  empty: string;
}

const THEMES: TasbeehTheme[] = [
  {
    id: "midnight",
    name: "Midnight Emerald",
    bg: "#05130F",
    bgSoft: "#081C16",
    surface: "rgba(255,255,255,0.045)",
    border: "rgba(255,255,255,0.08)",
    accent: "#2EE6A6",
    gold: "#CFAE69",
    text: "#F3F0E8",
    muted: "rgba(243,240,232,0.62)",
    faint: "rgba(243,240,232,0.4)",
    empty: "rgba(255,255,255,0.08)",
  },
  {
    id: "makkah",
    name: "Makkah Gold",
    bg: "#130E08",
    bgSoft: "#1C150C",
    surface: "rgba(255,244,222,0.05)",
    border: "rgba(255,236,200,0.1)",
    accent: "#D9B368",
    gold: "#F3E4C6",
    text: "#F7EFDD",
    muted: "rgba(247,239,221,0.62)",
    faint: "rgba(247,239,221,0.4)",
    empty: "rgba(255,236,200,0.09)",
  },
  {
    id: "madinah",
    name: "Madinah Calm",
    bg: "#07160F",
    bgSoft: "#0B2016",
    surface: "rgba(232,242,236,0.05)",
    border: "rgba(232,242,236,0.1)",
    accent: "#7FD8B4",
    gold: "#CFAE69",
    text: "#EAF2EC",
    muted: "rgba(234,242,236,0.62)",
    faint: "rgba(234,242,236,0.4)",
    empty: "rgba(232,242,236,0.09)",
  },
  {
    id: "minimal",
    name: "Pure Minimal",
    bg: "#0D1012",
    bgSoft: "#131719",
    surface: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.08)",
    accent: "#E7C87E",
    gold: "#4FA98C",
    text: "#F4F5F6",
    muted: "rgba(244,245,246,0.58)",
    faint: "rgba(244,245,246,0.38)",
    empty: "rgba(255,255,255,0.07)",
  },
];

const DESIGNS = [
  { id: "ring", name: "Ring", icon: "circle" as const },
  { id: "beads", name: "Beads", icon: "more-horizontal" as const },
  { id: "minimal", name: "Minimal", icon: "type" as const },
];

const COUNTER_SIZE = 280;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

// ── Hero number ──────────────────────────────────────────────
function TasbeehNumber({
  value,
  theme,
  tapScale,
}: {
  value: number;
  theme: TasbeehTheme;
  tapScale: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }],
  }));
  const label = value.toLocaleString();
  const size = label.length >= 5 ? 56 : label.length === 4 ? 66 : 78;
  return (
    <Animated.View style={style} pointerEvents="none">
      <Text
        style={[
          styles.heroNumber,
          {
            color: theme.text,
            fontSize: size,
            lineHeight: size + 6,
            textShadowColor: `${theme.accent}66`,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </Animated.View>
  );
}

// ── Ring design ──────────────────────────────────────────────
function RingCounter({
  progress,
  theme,
  children,
}: {
  progress: number;
  theme: TasbeehTheme;
  children: React.ReactNode;
}) {
  const stroke = 8;
  const r = (COUNTER_SIZE - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.counterWrap}>
      <Svg width={COUNTER_SIZE} height={COUNTER_SIZE}>
        <Circle
          cx={COUNTER_SIZE / 2}
          cy={COUNTER_SIZE / 2}
          r={r}
          stroke={theme.empty}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={COUNTER_SIZE / 2}
          cy={COUNTER_SIZE / 2}
          r={r}
          stroke={theme.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          transform={`rotate(-90 ${COUNTER_SIZE / 2} ${COUNTER_SIZE / 2})`}
        />
      </Svg>
      <View style={styles.counterCenter}>{children}</View>
    </View>
  );
}

// ── Bead design (misbaha) ────────────────────────────────────
function BeadCounter({
  filled,
  total,
  theme,
  children,
}: {
  filled: number;
  total: number;
  theme: TasbeehTheme;
  children: React.ReactNode;
}) {
  const center = COUNTER_SIZE / 2;
  const orbit = center - 18;
  const beads = Array.from({ length: total }, (_, i) => {
    const angle = (-90 + (i * 360) / total) * (Math.PI / 180);
    return {
      i,
      cx: center + orbit * Math.cos(angle),
      cy: center + orbit * Math.sin(angle),
    };
  });
  return (
    <View style={styles.counterWrap}>
      <Svg width={COUNTER_SIZE} height={COUNTER_SIZE}>
        {beads.map((b) => {
          const isLeader = b.i === 0;
          const isFilled = b.i < filled;
          const isActive = b.i === filled - 1;
          return (
            <Circle
              key={b.i}
              cx={b.cx}
              cy={b.cy}
              r={isLeader ? 11 : isActive ? 9.5 : 7}
              fill={
                isLeader ? theme.gold : isFilled ? theme.accent : theme.empty
              }
              opacity={isLeader || isFilled ? 1 : 0.55}
            />
          );
        })}
      </Svg>
      <View style={styles.counterCenter}>{children}</View>
    </View>
  );
}

// ── Minimal design ───────────────────────────────────────────
function MinimalCounter({
  theme,
  progress,
  children,
}: {
  theme: TasbeehTheme;
  progress: number;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.counterWrap, styles.minimalWrap]}>
      <View style={styles.counterCenter}>{children}</View>
      <View style={[styles.minimalTrack, { backgroundColor: theme.empty }]}>
        <View
          style={[
            styles.minimalFill,
            {
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: theme.accent,
            },
          ]}
        />
      </View>
    </View>
  );
}

export default function TasbeehScreen() {
  const { trackFeature } = useNurAI();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const isInitialLoad = useRef(true);

  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(33);
  const [selectedDhikr, setSelectedDhikr] = useState(DHIKR_LIST[0].id);
  const [customDhikrList, setCustomDhikrList] = useState<DhikrItem[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [lifetime, setLifetime] = useState(0);
  const [streak, setStreak] = useState({ current: 0, best: 0, lastDate: "" });
  const [themeId, setThemeId] = useState("midnight");
  const [designId, setDesignId] = useState("beads");
  const [lastDelta, setLastDelta] = useState(0);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [dhikrSheetOpen, setDhikrSheetOpen] = useState(false);
  const [targetSheetOpen, setTargetSheetOpen] = useState(false);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [customTargetInput, setCustomTargetInput] = useState("");
  const [addName, setAddName] = useState("");
  const [addArabic, setAddArabic] = useState("");
  const [addTranslation, setAddTranslation] = useState("");
  const [addingDhikr, setAddingDhikr] = useState(false);

  const tapScale = useSharedValue(1);
  const pulse = useSharedValue(0);

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const design = DESIGNS.find((d) => d.id === designId) ?? DESIGNS[1];

  const allDhikrList = useMemo(
    () => [...DHIKR_LIST, ...customDhikrList],
    [customDhikrList],
  );
  const currentDhikr =
    allDhikrList.find((d) => d.id === selectedDhikr) || DHIKR_LIST[0];

  const beadsInRound = target > 0 && target <= 33 ? target : 33;
  const inRoundBeads = count % beadsInRound;
  const filledBeads =
    inRoundBeads === 0 && count > 0 ? beadsInRound : inRoundBeads;
  const roundProgress =
    target > 0
      ? count % target === 0 && count > 0
        ? 1
        : (count % target) / target
      : 0;
  const remaining = Math.max(
    0,
    target - (count % target || (count > 0 ? target : 0)),
  );

  useEffect(() => {
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          STORAGE.count,
          STORAGE.target,
          STORAGE.dhikr,
          STORAGE.custom,
          STORAGE.theme,
          STORAGE.design,
          STORAGE.lifetime,
          STORAGE.streak,
          STORAGE.daily,
        ]);
        const map = new Map(entries);
        const get = (k: string): string | undefined => map.get(k) ?? undefined;
        const sCount = get(STORAGE.count);
        if (sCount) setCount(parseInt(sCount, 10) || 0);
        const sTarget = get(STORAGE.target);
        if (sTarget) setTarget(parseInt(sTarget, 10) || 33);
        const sDhikr = get(STORAGE.dhikr);
        if (sDhikr) setSelectedDhikr(sDhikr);
        const sTheme = get(STORAGE.theme);
        if (sTheme) setThemeId(sTheme);
        const sDesign = get(STORAGE.design);
        if (sDesign) setDesignId(sDesign);
        const sLifetime = get(STORAGE.lifetime);
        if (sLifetime) setLifetime(parseInt(sLifetime, 10) || 0);
        const sCustom = get(STORAGE.custom);
        if (sCustom) {
          try {
            setCustomDhikrList(JSON.parse(sCustom));
          } catch {}
        }
        const sStreak = get(STORAGE.streak);
        if (sStreak) {
          try {
            setStreak(JSON.parse(sStreak));
          } catch {}
        }
        const sDaily = get(STORAGE.daily);
        if (sDaily) {
          try {
            const parsed = JSON.parse(sDaily);
            if (parsed.date === todayKey()) setTodayTotal(parsed.total);
          } catch {}
        }
      } catch {}
      trackFeature("tasbeeh");
      isInitialLoad.current = false;
    })();
  }, [trackFeature]);

  useEffect(() => {
    syncedSetItem(STORAGE.count, count.toString());
    if (count > 0 && !isInitialLoad.current) trackDhikr(count);
  }, [count]);

  useEffect(() => {
    syncedSetItem(STORAGE.target, target.toString());
  }, [target]);
  useEffect(() => {
    syncedSetItem(STORAGE.dhikr, selectedDhikr);
  }, [selectedDhikr]);
  useEffect(() => {
    syncedSetItem(STORAGE.theme, themeId);
  }, [themeId]);
  useEffect(() => {
    syncedSetItem(STORAGE.design, designId);
  }, [designId]);
  useEffect(() => {
    updateNurAIWidgetSnapshot({
      tasbeehCount: count,
      tasbeehTarget: target,
      tasbeehDhikrLabel: currentDhikr.name,
      tasbeehTodayTotal: todayTotal,
    }).catch(() => {});
  }, [count, currentDhikr.name, target, todayTotal]);

  const persistCustom = useCallback((list: DhikrItem[]) => {
    syncedSetItem(STORAGE.custom, JSON.stringify(list)).catch(() => {});
  }, []);

  const bumpStreak = useCallback(() => {
    setStreak((prev) => {
      const today = todayKey();
      if (prev.lastDate === today) return prev;
      const current = prev.lastDate === yesterdayKey() ? prev.current + 1 : 1;
      const next = {
        current,
        best: Math.max(prev.best, current),
        lastDate: today,
      };
      syncedSetItem(STORAGE.streak, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const runCompletion = useCallback(() => {
    pulse.value = 0;
    pulse.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
    if (Platform.OS !== "web") {
      Vibration.vibrate([0, 90, 45, 150]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [pulse]);

  const handleTap = useCallback(() => {
    tapScale.value = withSequence(
      withTiming(1.14, { duration: 70 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    setLastDelta(1);
    setCount((c) => {
      const next = c + 1;
      const completedRound =
        target > 0 && Math.floor(c / target) < Math.floor(next / target);
      if (completedRound) {
        runCompletion();
        recordGardenAction("dhikr").catch(() => {});
      } else if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return next;
    });
    setTodayTotal((prev) => {
      const next = prev + 1;
      syncedSetItem(
        STORAGE.daily,
        JSON.stringify({ date: todayKey(), total: next }),
      );
      return next;
    });
    setLifetime((prev) => {
      const next = prev + 1;
      syncedSetItem(STORAGE.lifetime, next.toString());
      return next;
    });
    bumpStreak();
  }, [target, tapScale, runCompletion, bumpStreak]);

  const handleUndo = useCallback(() => {
    if (lastDelta <= 0 || count <= 0) return;
    setCount((c) => Math.max(0, c - 1));
    setTodayTotal((p) => Math.max(0, p - 1));
    setLifetime((p) => Math.max(0, p - 1));
    setLastDelta(0);
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    }
  }, [count, lastDelta]);

  const handleReset = useCallback(() => {
    setCount(0);
    setLastDelta(0);
    setActionsOpen(false);
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, []);

  const confirmCustomTarget = useCallback(() => {
    const parsed = parseInt(customTargetInput, 10);
    if (parsed >= 1 && parsed <= 99999) {
      setTarget(parsed);
      setCount(0);
    }
    setCustomTargetInput("");
    setTargetSheetOpen(false);
  }, [customTargetInput]);

  const handleAddDhikr = useCallback(() => {
    const name = addName.trim();
    if (!name) return;
    const item: DhikrItem = {
      id: `custom_${Date.now()}`,
      name,
      arabic: addArabic.trim() || name,
      translation: addTranslation.trim() || name,
      isCustom: true,
    };
    const updated = [...customDhikrList, item];
    setCustomDhikrList(updated);
    persistCustom(updated);
    setSelectedDhikr(item.id);
    setAddName("");
    setAddArabic("");
    setAddTranslation("");
    setAddingDhikr(false);
    setDhikrSheetOpen(false);
  }, [addName, addArabic, addTranslation, customDhikrList, persistCustom]);

  const cycleDhikr = useCallback(
    (dir: 1 | -1) => {
      const idx = allDhikrList.findIndex((d) => d.id === selectedDhikr);
      const nextIdx = (idx + dir + allDhikrList.length) % allDhikrList.length;
      setSelectedDhikr(allDhikrList[nextIdx].id);
      setCount(0);
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      }
    },
    [allDhikrList, selectedDhikr],
  );

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value === 0 ? 0 : (1 - pulse.value) * 0.5,
    transform: [{ scale: 0.9 + pulse.value * 0.35 }],
  }));

  const centerContent = (
    <>
      <TasbeehNumber value={count} theme={theme} tapScale={tapScale} />
      <Text style={[styles.ofTarget, { color: theme.muted }]}>
        {count % target || (count > 0 && count % target === 0 ? target : 0)}
        {" / "}
        {target.toLocaleString()}
      </Text>
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + NuraiSpace.xs }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.headerBtn}
        >
          <AppIcon name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Tasbeeh
          </Text>
          <Text style={[NuraiType.caption, { color: theme.faint }]}>
            {todayTotal.toLocaleString()} today ·{" "}
            {streak.current > 0
              ? `${streak.current} day streak`
              : "begin today"}
          </Text>
        </View>
        <Pressable
          onPress={() => setThemeSheetOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Change theme and design"
          style={styles.headerBtn}
        >
          <AppIcon name="layers" size={20} color={theme.gold} />
        </Pressable>
      </View>

      <Pressable
        onPress={handleTap}
        onLongPress={() => setActionsOpen(true)}
        delayLongPress={320}
        accessibilityRole="button"
        accessibilityLabel={`Count ${currentDhikr.name}. ${count} of ${target}. Long press for options.`}
        style={styles.tapArea}
      >
        <View style={styles.dhikrCopy}>
          <Pressable
            onPress={() => cycleDhikr(-1)}
            hitSlop={12}
            style={styles.dhikrArrow}
            accessibilityLabel="Previous dhikr"
          >
            <AppIcon name="chevron-left" size={20} color={theme.faint} />
          </Pressable>
          <View style={styles.dhikrText}>
            <Text style={[styles.arabic, { color: theme.text }]}>
              {currentDhikr.arabic}
            </Text>
            <Text style={[NuraiType.body, { color: theme.accent }]}>
              {currentDhikr.name}
            </Text>
            <Text style={[NuraiType.caption, { color: theme.faint }]}>
              {currentDhikr.translation}
            </Text>
          </View>
          <Pressable
            onPress={() => cycleDhikr(1)}
            hitSlop={12}
            style={styles.dhikrArrow}
            accessibilityLabel="Next dhikr"
          >
            <AppIcon name="chevron-right" size={20} color={theme.faint} />
          </Pressable>
        </View>

        <View style={styles.counterStage}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.completionRing,
              { borderColor: theme.accent },
              pulseStyle,
            ]}
          />
          {design.id === "ring" ? (
            <RingCounter progress={roundProgress} theme={theme}>
              {centerContent}
            </RingCounter>
          ) : design.id === "minimal" ? (
            <MinimalCounter theme={theme} progress={roundProgress}>
              {centerContent}
            </MinimalCounter>
          ) : (
            <BeadCounter
              filled={filledBeads}
              total={beadsInRound}
              theme={theme}
            >
              {centerContent}
            </BeadCounter>
          )}
        </View>

        <Text style={[NuraiType.bodySmall, { color: theme.muted }]}>
          {count === 0
            ? "Tap anywhere to begin"
            : remaining === 0
              ? "Round complete — continue gently"
              : `${remaining} left in this round`}
        </Text>
      </Pressable>

      <View
        style={[
          styles.statsRow,
          { borderColor: theme.border, backgroundColor: theme.surface },
        ]}
      >
        <Stat label="Today" value={todayTotal} theme={theme} />
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <Stat label="Lifetime" value={lifetime} theme={theme} />
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <Stat label="Streak" value={streak.current} theme={theme} suffix="d" />
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <Stat label="Best" value={streak.best} theme={theme} suffix="d" />
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 12 }]}>
        <ControlButton
          icon="rotate-ccw"
          label="Reset"
          onPress={handleReset}
          theme={theme}
        />
        <ControlButton
          icon="corner-up-left"
          label="Undo"
          onPress={handleUndo}
          disabled={count <= 0 || lastDelta <= 0}
          theme={theme}
        />
        <ControlButton
          icon="repeat"
          label="Dhikr"
          onPress={() => setDhikrSheetOpen(true)}
          theme={theme}
        />
        <ControlButton
          icon="target"
          label={`${target}`}
          onPress={() => setTargetSheetOpen(true)}
          theme={theme}
        />
      </View>

      {/* Quick actions (long press) */}
      <NuraiBottomSheet
        visible={actionsOpen}
        title="Quick actions"
        onClose={() => setActionsOpen(false)}
      >
        <NuraiListRow
          title="Reset session"
          icon="rotate-ccw"
          onPress={handleReset}
        />
        <NuraiListRow
          title="Change dhikr"
          icon="repeat"
          onPress={() => {
            setActionsOpen(false);
            setDhikrSheetOpen(true);
          }}
        />
        <NuraiListRow
          title="Change target"
          icon="target"
          onPress={() => {
            setActionsOpen(false);
            setTargetSheetOpen(true);
          }}
        />
        <NuraiListRow
          title="Change theme & design"
          icon="layers"
          onPress={() => {
            setActionsOpen(false);
            setThemeSheetOpen(true);
          }}
        />
      </NuraiBottomSheet>

      {/* Theme + design */}
      <NuraiBottomSheet
        visible={themeSheetOpen}
        title="Theme & design"
        onClose={() => setThemeSheetOpen(false)}
      >
        <Text
          style={[
            NuraiType.overline,
            styles.sheetLabel,
            { color: theme.faint },
          ]}
        >
          COUNTER DESIGN
        </Text>
        <View style={styles.chipRow}>
          {DESIGNS.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => setDesignId(d.id)}
              style={[
                styles.chip,
                {
                  borderColor: d.id === designId ? theme.accent : theme.border,
                  backgroundColor:
                    d.id === designId ? `${theme.accent}1A` : "transparent",
                },
              ]}
            >
              <AppIcon
                name={d.icon}
                size={15}
                color={d.id === designId ? theme.accent : theme.muted}
              />
              <Text
                style={[
                  NuraiType.bodySmall,
                  { color: d.id === designId ? theme.accent : theme.muted },
                ]}
              >
                {d.name}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text
          style={[
            NuraiType.overline,
            styles.sheetLabel,
            { color: theme.faint },
          ]}
        >
          THEME
        </Text>
        {THEMES.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setThemeId(t.id)}
            style={styles.themeRow}
          >
            <View style={[styles.swatch, { backgroundColor: t.bgSoft }]}>
              <View style={[styles.swatchDot, { backgroundColor: t.accent }]} />
              <View style={[styles.swatchDot, { backgroundColor: t.gold }]} />
            </View>
            <Text style={[NuraiType.body, { color: theme.text, flex: 1 }]}>
              {t.name}
            </Text>
            {t.id === themeId ? (
              <AppIcon name="check" size={18} color={theme.accent} />
            ) : null}
          </Pressable>
        ))}
      </NuraiBottomSheet>

      {/* Dhikr picker */}
      <NuraiBottomSheet
        visible={dhikrSheetOpen}
        title="Choose dhikr"
        onClose={() => {
          setDhikrSheetOpen(false);
          setAddingDhikr(false);
        }}
      >
        {addingDhikr ? (
          <View style={styles.form}>
            <SheetInput
              placeholder="Name (e.g. SubhanAllah)"
              value={addName}
              onChangeText={setAddName}
              theme={theme}
            />
            <SheetInput
              placeholder="Arabic (optional)"
              value={addArabic}
              onChangeText={setAddArabic}
              theme={theme}
            />
            <SheetInput
              placeholder="Translation (optional)"
              value={addTranslation}
              onChangeText={setAddTranslation}
              theme={theme}
            />
            <NuraiButton
              label="Add dhikr"
              icon="check"
              onPress={handleAddDhikr}
            />
          </View>
        ) : (
          <View>
            {allDhikrList.map((d) => (
              <NuraiListRow
                key={d.id}
                title={d.name}
                subtitle={d.translation}
                icon={d.id === selectedDhikr ? "check-circle" : "circle"}
                value={d.isCustom ? "Custom" : undefined}
                onPress={() => {
                  setSelectedDhikr(d.id);
                  setCount(0);
                  setDhikrSheetOpen(false);
                }}
              />
            ))}
            <NuraiButton
              label="Add your own"
              icon="plus"
              variant="ghost"
              onPress={() => setAddingDhikr(true)}
            />
          </View>
        )}
      </NuraiBottomSheet>

      {/* Target picker */}
      <NuraiBottomSheet
        visible={targetSheetOpen}
        title="Set target"
        onClose={() => setTargetSheetOpen(false)}
      >
        {TARGETS.map((t) => (
          <NuraiListRow
            key={t}
            title={t.toLocaleString()}
            subtitle={t === 33 ? "After each salah" : undefined}
            icon={t === target ? "check-circle" : "circle"}
            onPress={() => {
              setTarget(t);
              setCount(0);
              setTargetSheetOpen(false);
            }}
          />
        ))}
        <View style={styles.form}>
          <SheetInput
            placeholder="Custom target"
            value={customTargetInput}
            onChangeText={setCustomTargetInput}
            keyboardType="number-pad"
            theme={theme}
          />
          <NuraiButton
            label="Set custom target"
            icon="check"
            onPress={confirmCustomTarget}
          />
        </View>
      </NuraiBottomSheet>
    </View>
  );
}

function Stat({
  label,
  value,
  theme,
  suffix,
}: {
  label: string;
  value: number;
  theme: TasbeehTheme;
  suffix?: string;
}) {
  return (
    <View
      style={styles.stat}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text
        style={[
          styles.statValue,
          { color: theme.text, fontVariant: ["tabular-nums"] },
        ]}
      >
        {value.toLocaleString()}
        {suffix ? (
          <Text style={[styles.statSuffix, { color: theme.faint }]}>
            {suffix}
          </Text>
        ) : null}
      </Text>
      <Text style={[styles.statLabel, { color: theme.faint }]}>{label}</Text>
    </View>
  );
}

function ControlButton({
  icon,
  label,
  onPress,
  theme,
  disabled,
}: {
  icon: AppIconName;
  label: string;
  onPress: () => void;
  theme: TasbeehTheme;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.control,
        {
          borderColor: theme.border,
          backgroundColor: theme.surface,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <AppIcon name={icon} size={18} color={theme.text} />
      <Text style={[styles.controlLabel, { color: theme.muted }]}>{label}</Text>
    </Pressable>
  );
}

function SheetInput({
  theme,
  ...props
}: React.ComponentProps<typeof TextInput> & { theme: TasbeehTheme }) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={theme.faint}
      style={[
        NuraiType.body,
        styles.input,
        { color: "#0B1114", backgroundColor: "#EAEAEA", borderColor: "#DDD" },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: 56,
    paddingHorizontal: NuraiSpace.md,
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  headerBtn: {
    width: NuraiTouch.minimum,
    height: NuraiTouch.minimum,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 18,
    lineHeight: 24,
  },
  tapArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: NuraiSpace.xl,
    paddingHorizontal: NuraiSpace.lg,
  },
  dhikrCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.sm,
  },
  dhikrArrow: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dhikrText: { alignItems: "center", gap: NuraiSpace.xxs, minWidth: 180 },
  arabic: {
    fontFamily: "NotoNaskhArabic_700Bold",
    fontSize: 30,
    lineHeight: 50,
    textAlign: "center",
  },
  counterStage: {
    width: COUNTER_SIZE,
    height: COUNTER_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  completionRing: {
    position: "absolute",
    width: COUNTER_SIZE,
    height: COUNTER_SIZE,
    borderRadius: COUNTER_SIZE / 2,
    borderWidth: 2,
  },
  counterWrap: {
    width: COUNTER_SIZE,
    height: COUNTER_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  minimalWrap: { gap: NuraiSpace.xl },
  counterCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: NuraiSpace.xs,
  },
  minimalTrack: {
    position: "absolute",
    bottom: 40,
    width: 150,
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  minimalFill: { height: 4, borderRadius: 999 },
  heroNumber: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  ofTarget: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  statsRow: {
    marginHorizontal: NuraiSpace.lg,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: NuraiSpace.md,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 28 },
  statValue: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 20,
    lineHeight: 26,
  },
  statSuffix: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium" },
  statLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  controls: {
    flexDirection: "row",
    gap: NuraiSpace.sm,
    paddingHorizontal: NuraiSpace.lg,
    paddingTop: NuraiSpace.md,
  },
  control: {
    flex: 1,
    minHeight: 60,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  controlLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
  },
  sheetLabel: { marginTop: NuraiSpace.sm, marginBottom: NuraiSpace.xs },
  chipRow: { flexDirection: "row", gap: NuraiSpace.sm, flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: NuraiSpace.md,
    borderRadius: 999,
    borderWidth: 1,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: NuraiSpace.md,
    minHeight: 56,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  swatchDot: { width: 8, height: 8, borderRadius: 4 },
  form: { gap: NuraiSpace.sm, paddingTop: NuraiSpace.sm },
  input: {
    minHeight: NuraiTouch.comfortable,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: NuraiSpace.md,
  },
});
