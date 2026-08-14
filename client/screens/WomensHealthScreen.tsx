import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  Switch,
  TextInput,
  BackHandler,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/context/SubscriptionContext";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useWomensHealth } from "@/context/WomensHealthContext";
import { MADHAB_RULES } from "@/modules/womensHealth/types";
import type { Madhab } from "@/modules/womensHealth/types";
import {
  buildWomenHealthInsights,
  computeFertileWindow,
} from "@/modules/womensHealth/insights";
import { formatDateDisplay } from "@/modules/womensHealth/dateUtils";
import CycleCalendarGrid from "@/components/CycleCalendarGrid";
import {
  Aurora,
  NuraiGlass,
  NuraiGlassGroup,
  NuraiTrendChart,
} from "@/design-system";
import QadaCalendarGrid from "@/components/QadaCalendarGrid";
import {
  AIResponseModal,
  customerSafeAIErrorMessage,
  type AIResponseState,
  type AIResponseData,
} from "@/components/AIResponseModal";
import { getHealthGuidance, AIContextError } from "@/services/aiContextService";
import { mapAIContextResponseToModalData } from "@/services/personalAIResponseMapper";
import { syncedSetItem } from "@/lib/progress-sync";
import { AppIcon, type AppIconName } from "@/components/icons";

type TabName = "Overview" | "Track" | "Calendar" | "Learn" | "Settings";

const WOMENS_HEALTH_TAB_BAR_HEIGHT = 64;

const TAB_CONFIG: {
  key: TabName;
  icon: AppIconName;
  label: string;
}[] = [
  { key: "Overview", icon: "activity", label: "Overview" },
  { key: "Track", icon: "edit-3", label: "Track" },
  { key: "Calendar", icon: "calendar", label: "Calendar" },
  { key: "Learn", icon: "book-open", label: "Learn" },
  { key: "Settings", icon: "settings", label: "Settings" },
];

const FLOW_LEVELS = ["spotting", "light", "medium", "heavy"] as const;
const FLOW_COLORS = [
  { key: "red", label: "Red", color: "#EF4444" },
  { key: "dark_red", label: "Dark Red", color: "#991B1B" },
  { key: "brown", label: "Brown", color: "#92400E" },
  { key: "pink", label: "Pink", color: "#EC4899" },
  { key: "clear", label: "Clear", color: "#CBD5E1" },
] as const;

const PHYSICAL_SYMPTOMS = [
  { key: "cramps_mild", label: "Cramps (mild)", icon: "zap" },
  { key: "cramps_moderate", label: "Cramps (moderate)", icon: "zap" },
  { key: "cramps_severe", label: "Cramps (severe)", icon: "zap" },
  { key: "headache", label: "Headache", icon: "alert-circle" },
  { key: "back_pain", label: "Back pain", icon: "arrow-down" },
  { key: "breast_tenderness", label: "Breast tenderness", icon: "heart" },
  { key: "bloating", label: "Bloating", icon: "circle" },
  { key: "fatigue", label: "Fatigue", icon: "battery" },
  { key: "nausea", label: "Nausea", icon: "frown" },
  { key: "acne", label: "Acne", icon: "star" },
  { key: "joint_pain", label: "Joint pain", icon: "minus" },
  { key: "leg_pain", label: "Leg pain", icon: "arrow-down" },
  { key: "dizziness", label: "Dizziness", icon: "rotate-cw" },
  { key: "hot_flashes", label: "Hot flashes", icon: "thermometer" },
  { key: "appetite_increased", label: "Appetite increased", icon: "arrow-up" },
  {
    key: "appetite_decreased",
    label: "Appetite decreased",
    icon: "arrow-down",
  },
  { key: "food_cravings", label: "Food cravings", icon: "coffee" },
  { key: "insomnia", label: "Insomnia", icon: "moon" },
  { key: "oversleeping", label: "Oversleeping", icon: "moon" },
  { key: "digestive_issues", label: "Digestive issues", icon: "activity" },
  { key: "muscle_aches", label: "Muscle aches", icon: "activity" },
] as const;

const EMOTIONAL_SYMPTOMS = [
  { key: "emo_happy", label: "Happy", icon: "smile" },
  { key: "emo_calm", label: "Calm", icon: "sunset" },
  { key: "emo_grateful", label: "Grateful", icon: "heart" },
  { key: "emo_hopeful", label: "Hopeful", icon: "sunrise" },
  { key: "emo_energetic", label: "Energetic", icon: "sun" },
  { key: "emo_confident", label: "Confident", icon: "shield" },
  { key: "emo_spiritual", label: "Spiritual", icon: "star" },
  { key: "emo_tired", label: "Tired", icon: "moon" },
  { key: "emo_anxious", label: "Anxious", icon: "alert-circle" },
  { key: "emo_sad", label: "Sad", icon: "cloud-rain" },
  { key: "emo_irritable", label: "Irritable", icon: "zap" },
  { key: "emo_overwhelmed", label: "Overwhelmed", icon: "loader" },
  { key: "emo_moody", label: "Moody", icon: "cloud" },
  { key: "emo_sensitive", label: "Sensitive", icon: "feather" },
  { key: "emo_tearful", label: "Tearful", icon: "droplet" },
  { key: "emo_low_motivation", label: "Low motivation", icon: "minus-circle" },
  { key: "emo_brain_fog", label: "Brain fog", icon: "cloud" },
  {
    key: "emo_difficulty_concentrating",
    label: "Difficulty concentrating",
    icon: "target",
  },
  { key: "emo_restless", label: "Restless", icon: "wind" },
] as const;

const DISCHARGE_SYMPTOMS = [
  { key: "texture_watery", label: "Watery", icon: "droplet" },
  { key: "texture_clotty", label: "Clotty", icon: "circle" },
  { key: "texture_thick", label: "Thick", icon: "circle" },
  { key: "texture_normal", label: "Normal", icon: "check" },
  { key: "odor_normal", label: "Normal odor", icon: "check" },
  { key: "odor_unusual", label: "Unusual odor", icon: "alert-triangle" },
] as const;

const SPIRITUAL_SYMPTOMS = [
  {
    key: "spiritually_connected",
    label: "Felt spiritually connected",
    icon: "star",
  },
  { key: "extra_dhikr", label: "Completed extra dhikr", icon: "repeat" },
  { key: "quran_listened", label: "Read/listened to Quran", icon: "book" },
  {
    key: "felt_disconnected",
    label: "Felt disconnected from worship",
    icon: "x-circle",
  },
  {
    key: "cycle_time_study",
    label: "Used cycle time for study",
    icon: "book-open",
  },
  {
    key: "peace_exemption",
    label: "Felt at peace during exemption",
    icon: "heart",
  },
  {
    key: "struggled_missing",
    label: "Struggled with missing salah",
    icon: "frown",
  },
] as const;

const MOOD_OPTIONS = [
  { key: "happy", icon: "smile" as const, label: "Happy" },
  { key: "calm", icon: "sunset" as const, label: "Calm" },
  { key: "grateful", icon: "heart" as const, label: "Grateful" },
  { key: "hopeful", icon: "sunrise" as const, label: "Hopeful" },
  { key: "tired", icon: "moon" as const, label: "Tired" },
  { key: "anxious", icon: "alert-circle" as const, label: "Anxious" },
  { key: "sad", icon: "cloud-rain" as const, label: "Sad" },
  { key: "irritable", icon: "zap" as const, label: "Irritable" },
  { key: "overwhelmed", icon: "loader" as const, label: "Overwhelmed" },
];

const MOOD_TAGS = [
  "peaceful",
  "energetic",
  "focused",
  "distracted",
  "lonely",
  "thankful",
  "patient",
  "restless",
  "motivated",
  "spiritual",
] as const;

const ENERGY_LEVELS = [
  { value: 1, label: "Very Low" },
  { value: 2, label: "Low" },
  { value: 3, label: "Medium" },
  { value: 4, label: "High" },
  { value: 5, label: "Very High" },
] as const;

const JOURNAL_TAGS = [
  "Gratitude",
  "Dua",
  "Reflection",
  "Self-care",
  "Worship",
  "Learning",
  "Family",
  "Health",
  "Goals",
  "Struggles",
  "Growth",
  "Patience",
] as const;

const PHASE_PROMPTS: Record<string, string[]> = {
  ON_CYCLE: [
    "What helped you feel close to Allah today without salah or fasting?",
    "Which mercy-based worship felt possible today: dhikr, dua, listening, learning, charity, or rest?",
    "What does your body need, and what does your heart need, without judging either one?",
    "Write one dua for patience, dignity, and ease during this phase.",
    "What should NurAI gently protect your streak from while you are exempt?",
  ],
  CYCLE_COMPLETED: [
    "What would make your return to salah calm, dignified, and realistic?",
    "What did you learn about your body, energy, or worship needs this cycle?",
    "Which first prayer or Quran moment do you want to protect after ghusl?",
    "Write a dua for a clean restart without guilt or pressure.",
  ],
  NOT_ON_CYCLE: [
    "Which worship action felt most sincere today, even if it was small?",
    "What Quran meaning or lesson should shape tomorrow?",
    "What are you preparing for spiritually this week: prayer, Quran, fasting, charity, or learning?",
    "Where did dunya pressure meet deen today, and what boundary helped?",
    "What private win deserves gratitude before you sleep?",
  ],
};

const EDUCATION_MODULES = [
  {
    id: "edu-1",
    title: "Understanding Your Cycle",
    subtitle: "Biology basics, cycle phases",
    icon: "book" as const,
    category: "biology",
    content:
      "A typical menstrual cycle lasts between 21-35 days and consists of four phases: menstruation, follicular, ovulation, and luteal. Understanding your body's natural rhythm helps you plan worship, fasting, and daily activities. Track your cycle to identify patterns.",
  },
  {
    id: "edu-2",
    title: "Haidh (Menstruation) Fiqh",
    subtitle: "Madhhab-aware basics",
    icon: "book-open" as const,
    category: "worship",
    content:
      "Menstrual rulings differ between schools of law, especially when bleeding is irregular or close to the limits of a normal pattern. During haidh, women are exempt from salah and fasting. For exact duration questions, follow your madhhab or ask a qualified scholar.",
  },
  {
    id: "edu-3",
    title: "Istihadha (Irregular Bleeding)",
    subtitle: "How to identify, when to ask",
    icon: "alert-circle" as const,
    category: "worship",
    content:
      "Istihadha is bleeding outside of haidh. Many rulings distinguish it from menstruation, but the details depend on your pattern and madhhab. If bleeding is unusual, track dates and symptoms, seek medical advice when needed, and ask a qualified scholar for worship guidance.",
  },
  {
    id: "edu-4",
    title: "Ghusl (Ritual Bath)",
    subtitle: "Step-by-step guide",
    icon: "droplet" as const,
    category: "worship",
    content:
      "After your cycle ends, perform ghusl before resuming prayer. Steps: 1) Make intention, 2) Wash hands three times, 3) Wash private area, 4) Perform wudu, 5) Pour water over head three times, 6) Wash entire body, right side first then left.",
  },
  {
    id: "edu-5",
    title: "Worship During Your Cycle",
    subtitle: "What you CAN do",
    icon: "heart" as const,
    category: "worship",
    content:
      "During your cycle you can still: make dhikr, dua, listen to Quran, give charity, attend gatherings, seek knowledge. Use this time to deepen your connection with Allah through remembrance and supplication.",
  },
  {
    id: "edu-6",
    title: "Nifas (Postpartum Bleeding)",
    subtitle: "Postpartum worship guidance",
    icon: "info" as const,
    category: "biology",
    content:
      "Nifas rulings and maximum durations are discussed differently across madhhabs. The same worship exemptions as menstruation generally apply while nifas continues. If bleeding stops, becomes unusual, or extends beyond your expected pattern, ask a qualified scholar for your case.",
  },
  {
    id: "edu-7",
    title: "Ramadan & Your Cycle",
    subtitle: "Fasting rules guide",
    icon: "calendar" as const,
    category: "fasting",
    content:
      "During Ramadan, you do not fast while on your cycle. These missed fasts must be made up before the next Ramadan. You can still engage in other forms of worship like dhikr, dua, and charity during your cycle in Ramadan.",
  },
  {
    id: "edu-8",
    title: "Planning Make-up Fasts",
    subtitle: "Realistic make-up plan",
    icon: "target" as const,
    category: "fasting",
    content:
      "Missed Ramadan fasts should be made up before the next Ramadan when you are able. Choose a realistic pace, consider days that fit your health and family routine, and pause if fasting would harm you. Even one steady make-up fast at a time adds up.",
  },
  {
    id: "edu-9",
    title: "Fertility Awareness",
    subtitle: "Ovulation, family planning",
    icon: "activity" as const,
    category: "biology",
    content:
      "Calendar patterns can offer a broad planning estimate, but ovulation timing varies between people and from cycle to cycle. Symptoms and dates cannot confirm ovulation or pregnancy. Do not use NurAI as contraception; use a clinically appropriate method and speak with a healthcare professional for personal advice.",
  },
  {
    id: "edu-10",
    title: "Perimenopause & Menopause",
    subtitle: "Changes to expect",
    icon: "trending-up" as const,
    category: "biology",
    content:
      "Perimenopause can begin in your 40s with irregular cycles, hot flashes, and mood changes. Menopause is confirmed after 12 months without a period. Fiqh rulings for bleeding during this transition should be discussed with a scholar.",
  },
  {
    id: "edu-11",
    title: "Emotional Wellbeing",
    subtitle: "PMS/PMDD, self-care",
    icon: "smile" as const,
    category: "wellbeing",
    content:
      "Hormonal changes can significantly affect mood and energy. PMS is common; PMDD is more severe and may need medical attention. Practice self-compassion, maintain your dhikr routine, and seek support when needed.",
  },
  {
    id: "edu-12",
    title: "Self-Care During Cycle",
    subtitle: "Nutrition, rest, support",
    icon: "sun" as const,
    category: "wellbeing",
    content:
      "Stay hydrated, eat iron-rich foods such as dates, leafy greens, and other foods suitable for your diet, and choose gentle movement if it helps. Rest matters too. If pain, heavy bleeding, or fatigue feels severe, speak to a healthcare professional.",
  },
  {
    id: "edu-13",
    title: "Newly Wed Guide",
    subtitle: "First period after marriage",
    icon: "users" as const,
    category: "life-stage",
    content:
      "Intimacy is not permitted during menstruation per Islamic guidance. Communication with your spouse about your cycle is important. This is a natural part of married life and should be approached with understanding and openness.",
  },
  {
    id: "edu-14",
    title: "New Muslim Guide",
    subtitle: "Basics for converts",
    icon: "compass" as const,
    category: "life-stage",
    content:
      "Welcome to Islam. Menstrual guidance affects worship, but personal circumstances and scholarly schools can differ. Learn gently, choose a trusted local scholar or teacher, and ask for help with prayer, fasting and ghusl questions instead of relying on an app-generated ruling.",
  },
  {
    id: "edu-15",
    title: "Teen Guide",
    subtitle: "Age-appropriate first period info",
    icon: "star" as const,
    category: "life-stage",
    content:
      "A first period is a natural part of growing up. You can privately record dates to understand your pattern, but the app does not decide personal religious responsibility. Ask a trusted adult and a qualified scholar for age-appropriate worship guidance, and speak with a healthcare professional if anything worries you.",
  },
];

const FIQH_QUESTIONS = [
  {
    key: "spiritual-during-period",
    label: "What can I still do spiritually during my period?",
    icon: "heart" as const,
  },
  {
    key: "resume-praying",
    label: "When should I resume praying after my cycle?",
    icon: "sunrise" as const,
  },
  {
    key: "irregular-cycle",
    label: "What if my cycle is irregular?",
    icon: "help-circle" as const,
  },
  {
    key: "postpartum-rulings",
    label: "Post-partum bleeding and prayer rulings",
    icon: "info" as const,
  },
] as const;

const LIFE_STAGES = [
  { key: "regular", label: "Regular Cycles" },
  { key: "teen", label: "Teen / Just Started" },
  { key: "pregnant", label: "Pregnant" },
  { key: "postpartum", label: "Postpartum" },
  { key: "breastfeeding", label: "Breastfeeding" },
  { key: "perimenopause", label: "Perimenopause" },
  { key: "menopause", label: "Menopause" },
];

const BREAKDOWN_KEYS = [
  "menstruation",
  "pregnancy",
  "breastfeeding",
  "illness",
  "travel",
  "other",
] as const;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getMonthName(month: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month];
}

export default function WomensHealthScreen() {
  const { theme, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isPremium, isScholar } = useSubscription();

  const {
    settings,
    updateSettings,
    derived,
    sourceData,
    currentCycleDay,
    activeCycle,
    startCycle,
    endCycle,
    qadaPlan,
    updateQadaPlan,
    remainingQada,
    exportData,
    importData,
    deleteAllData,
    addMoodEntry,
    todayMood,
    journalEntries,
    addJournalEntry,
    deleteJournalEntry,
    cycleState,
    acknowledgeGhusl,
    completedCycles,
    avgCycleLength,
    cycleStdDev,
    nextPrediction,
    cycleDatesSet,
    activeCycleDatesSet,
    completedCycleDatesSet,
    qadaDatesSet,
    handleCalendarTap,
    replaceCyclesFromDates,
    getCycleMetadata,
    updateCycleMetadata,
    prediction,
    istihadhaWarning,
    predictedDatesSet,
    deleteCycleById,
    consentGiven,
  } = useWomensHealth();

  const insights = useMemo(
    () => buildWomenHealthInsights(sourceData, derived),
    [sourceData, derived],
  );
  const fertileWindow = useMemo(
    () => computeFertileWindow(derived, settings.planningMode),
    [derived, settings.planningMode],
  );

  // Start-to-start length of each completed cycle, for the history trend.
  const cycleLengthHistory = useMemo(() => {
    const sorted = [...completedCycles]
      .filter((c) => c.startDate)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const lengths: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const days = Math.round(
        (new Date(sorted[i].startDate).getTime() -
          new Date(sorted[i - 1].startDate).getTime()) /
          86400000,
      );
      if (days > 0 && days < 90) lengths.push(days);
    }
    return lengths;
  }, [completedCycles]);

  const [activeTab, setActiveTab] = useState<TabName>("Overview");
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMode, setCalendarMode] = useState<"cycle" | "qada">("cycle");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertActions, setAlertActions] = useState<
    {
      label: string;
      onPress: () => void;
      variant: "primary" | "secondary" | "destructive";
    }[]
  >([]);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [learnSearch, setLearnSearch] = useState("");
  const [expandedSymptomCat, setExpandedSymptomCat] = useState<string | null>(
    "physical",
  );
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [selectedMoodTags, setSelectedMoodTags] = useState<string[]>([]);
  const [moodEnergyLevel, setMoodEnergyLevel] = useState(3);
  const [moodNotes, setMoodNotes] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    toastTimer.current = setTimeout(() => setToastMessage(null), 2000);
  }, []);

  const handleBack = useCallback(() => {
    if (activeTab !== "Overview") {
      setActiveTab("Overview");
      return true;
    }
    navigation.goBack();
    return true;
  }, [activeTab, navigation]);

  useEffect(() => {
    if (!consentGiven) {
      navigation.replace("WomensHealthConsent" as never);
    }
  }, [consentGiven, navigation]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", handleBack);
    return () => sub.remove();
  }, [handleBack]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const [wizardTotal, setWizardTotal] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdownValues, setBreakdownValues] = useState({
    menstruation: "",
    pregnancy: "",
    breastfeeding: "",
    illness: "",
    travel: "",
    other: "",
  });
  const [fidyaMealCost, setFidyaMealCost] = useState("");
  const [showFidyaCalc, setShowFidyaCalc] = useState(false);
  const [journalTitle, setJournalTitle] = useState("");
  const [journalContent, setJournalContent] = useState("");
  const [journalTags, setJournalTags] = useState<string[]>([]);
  const [journalSearch, setJournalSearch] = useState("");
  const [showJournalHistory, setShowJournalHistory] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiModalState, setAiModalState] = useState<AIResponseState>("loading");
  const [aiModalData, setAiModalData] = useState<AIResponseData | null>(null);
  const [aiModalError, setAiModalError] = useState<string | undefined>();
  const [aiRetryFn, setAiRetryFn] = useState<(() => void) | undefined>();
  const [customFiqhQuestion, setCustomFiqhQuestion] = useState("");

  const primaryAccent = { bg: theme.primaryMuted, text: theme.primary };
  const sacredAccent = { bg: theme.scholarSoft, text: theme.scholar };
  const rose = primaryAccent;
  const emerald = primaryAccent;
  const teal = primaryAccent;
  const amber = sacredAccent;
  const purple = primaryAccent;

  const entrance = (delay = 0) =>
    reduceMotion ? undefined : FadeInDown.delay(delay).duration(360);

  const todayDateStr = new Date().toISOString().split("T")[0];
  const activeMetadata = activeCycle ? getCycleMetadata(activeCycle.id) : null;

  const handleStartCycle = async (date?: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const error = await startCycle(date);
    if (error) {
      showAlert(error);
    } else {
      showToast("Cycle started");
    }
  };

  const handleEndCycle = async (date?: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const warning = await endCycle(date);
    if (warning) {
      showAlert(warning);
    } else {
      showToast("Period ended successfully");
    }
  };

  const handleToggleSymptom = async (key: string) => {
    if (!activeCycle) return;
    await Haptics.selectionAsync();
    const meta = getCycleMetadata(activeCycle.id);
    const existing = meta.symptoms.map((s) => s.key);
    const newSymptoms = existing.includes(key)
      ? meta.symptoms.filter((s) => s.key !== key)
      : [...meta.symptoms, { key }];
    await updateCycleMetadata(activeCycle.id, { symptoms: newSymptoms });
  };

  const handleFlowSelect = async (
    level: "spotting" | "light" | "medium" | "heavy",
  ) => {
    if (!activeCycle) return;
    await Haptics.selectionAsync();
    const mapped = level === "spotting" ? "light" : level;
    await updateCycleMetadata(activeCycle.id, {
      flowLevel: mapped as "light" | "medium" | "heavy",
    });
  };

  const handleAcknowledgeGhusl = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await acknowledgeGhusl();
    showToast("Ghusl completed. You may resume prayer and fasting.");
  };

  const handleAskFiqh = useCallback(
    async (question: string) => {
      if (!isPremium) {
        setAiModalVisible(true);
        setAiModalState("upgrade");
        setAiModalData(null);
        setAiModalError(undefined);
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setAiModalVisible(true);
      setAiModalState("loading");
      setAiModalData(null);
      setAiModalError(undefined);

      const doRequest = async () => {
        try {
          setAiModalState("loading");
          const regularity =
            cycleStdDev !== undefined && cycleStdDev < 3
              ? "regular"
              : cycleStdDev !== undefined && cycleStdDev < 6
                ? "somewhat irregular"
                : "irregular";
          const currentPhase =
            cycleState === "ON_CYCLE"
              ? "menstruating"
              : cycleState === "CYCLE_COMPLETED"
                ? "post-cycle"
                : "not on cycle";

          const result = await getHealthGuidance({
            question,
            cycleDuration: avgCycleLength > 0 ? avgCycleLength : undefined,
            regularity: completedCycles.length >= 2 ? regularity : undefined,
            currentPhase,
            userTier: isScholar ? "scholar" : "premium",
          });

          setAiModalState("success");
          setAiModalData(mapAIContextResponseToModalData(result));
        } catch (err: any) {
          if (err instanceof AIContextError) {
            if (err.code === "UPGRADE_REQUIRED") {
              setAiModalState("upgrade");
            } else if (err.code === "RATE_LIMIT") {
              setAiModalState("rateLimit");
            } else {
              setAiModalState("error");
              setAiModalError(customerSafeAIErrorMessage(err.message));
            }
          } else {
            setAiModalState("error");
            setAiModalError("Something went wrong. Please try again.");
          }
        }
      };

      setAiRetryFn(() => doRequest);
      doRequest();
    },
    [
      isPremium,
      isScholar,
      cycleStdDev,
      cycleState,
      avgCycleLength,
      completedCycles.length,
    ],
  );

  const savedDatesArray = React.useMemo(
    () => Array.from(cycleDatesSet),
    [cycleDatesSet],
  );
  const activeCycleDatesArray = React.useMemo(
    () => Array.from(activeCycleDatesSet),
    [activeCycleDatesSet],
  );
  const completedCycleDatesArray = React.useMemo(
    () => Array.from(completedCycleDatesSet),
    [completedCycleDatesSet],
  );
  const predictedDatesArray = React.useMemo(
    () => Array.from(predictedDatesSet),
    [predictedDatesSet],
  );
  const qadaDatesArray = React.useMemo(
    () => Array.from(qadaDatesSet),
    [qadaDatesSet],
  );

  const showAlert = useCallback(
    (
      msg: string,
      actions?: {
        label: string;
        onPress: () => void;
        variant: "primary" | "secondary" | "destructive";
      }[],
    ) => {
      setAlertMessage(msg);
      setAlertActions(actions || []);
    },
    [],
  );

  const dismissAlert = useCallback(() => {
    setAlertMessage(null);
    setAlertActions([]);
  }, []);

  const groupConsecutiveDates = useCallback((dates: string[]): string[][] => {
    const sorted = [...dates].sort();
    const groups: string[][] = [];
    let curGroup: string[] = [];
    for (const d of sorted) {
      if (curGroup.length === 0) {
        curGroup.push(d);
      } else {
        const prev = new Date(curGroup[curGroup.length - 1] + "T00:00:00");
        const curr = new Date(d + "T00:00:00");
        const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
        if (diff === 1) {
          curGroup.push(d);
        } else {
          groups.push(curGroup);
          curGroup = [d];
        }
      }
    }
    if (curGroup.length > 0) groups.push(curGroup);
    return groups;
  }, []);

  const daysBetween = useCallback((dateA: string, dateB: string): number => {
    const a = new Date(dateA + "T00:00:00");
    const b = new Date(dateB + "T00:00:00");
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }, []);

  const doSaveCycleDates = useCallback(
    async (dates: string[], asIstihadha?: boolean) => {
      const err = await replaceCyclesFromDates(new Set(dates), asIstihadha);
      if (err) showAlert(err);
      else showToast(asIstihadha ? "Saved as istihadha" : "Cycle dates saved");
    },
    [replaceCyclesFromDates, showAlert, showToast],
  );

  const handleCalendarSave = useCallback(
    async (dates: string[]) => {
      if (activeCycle) {
        const activeDates = new Set<string>();
        const today = todayDateStr;
        const endD = activeCycle.endDate || today;
        let cur = activeCycle.startDate;
        while (cur <= endD) {
          activeDates.add(cur);
          const d = new Date(cur + "T00:00:00");
          d.setDate(d.getDate() + 1);
          cur = d.toISOString().split("T")[0];
        }
        const overlapping = dates.filter((d) => activeDates.has(d));
        if (overlapping.length > 0) {
          showAlert(
            `${overlapping.length} selected ${overlapping.length === 1 ? "date overlaps" : "dates overlap"} with your active cycle (started ${activeCycle.startDate}). Please end your active cycle from the Overview tab first, or remove the overlapping dates.`,
          );
          return;
        }
      }

      const existingCompletedDates = Array.from(completedCycleDatesSet);
      const overlapDates = dates.filter((d) => completedCycleDatesSet.has(d));

      if (overlapDates.length > 0) {
        showAlert(
          `${overlapDates.length} of your selected ${overlapDates.length === 1 ? "date" : "dates"} already ${overlapDates.length === 1 ? "belongs" : "belong"} to a saved cycle. Would you like to merge with existing data or replace all cycles?`,
          [
            {
              label: "Merge",
              variant: "primary",
              onPress: async () => {
                dismissAlert();
                const merged = new Set([...existingCompletedDates, ...dates]);
                const err = await replaceCyclesFromDates(merged);
                if (err) showAlert(err);
                else showToast("Cycles merged and saved");
              },
            },
            {
              label: "Replace All",
              variant: "destructive",
              onPress: async () => {
                dismissAlert();
                const err = await replaceCyclesFromDates(new Set(dates));
                if (err) showAlert(err);
                else showToast("All cycles replaced");
              },
            },
            { label: "Cancel", variant: "secondary", onPress: dismissAlert },
          ],
        );
        return;
      }

      const groups = groupConsecutiveDates(dates);
      if (settings.madhabConfirmed) {
        const rules = MADHAB_RULES[settings.madhab];
        const outsideDurationReference = groups.some(
          (group) =>
            group.length < rules.minHaidh || group.length > rules.maxHaidh,
        );
        const shortGap = groups.some((group, index) => {
          if (index === 0) return false;
          const previous = groups[index - 1];
          const gap = daysBetween(previous[previous.length - 1], group[0]) - 1;
          return gap >= 0 && gap < rules.minTuhr;
        });
        if (outsideDurationReference || shortGap) {
          showAlert(
            `Some selected dates fall outside the ${rules.name} reference ranges saved in NurAI. The app cannot classify this bleeding or decide your prayer and fasting duties. Save the dates as observations, then review them with a qualified scholar; seek clinical help too if the bleeding is unusual or concerning.`,
            [
              {
                label: "Save dates only",
                variant: "primary",
                onPress: async () => {
                  dismissAlert();
                  await doSaveCycleDates(dates);
                },
              },
              { label: "Cancel", variant: "secondary", onPress: dismissAlert },
            ],
          );
          return;
        }
      }

      await doSaveCycleDates(dates);
    },
    [
      replaceCyclesFromDates,
      showToast,
      activeCycle,
      todayDateStr,
      completedCycleDatesSet,
      completedCycles,
      settings.madhab,
      settings.madhabConfirmed,
      showAlert,
      dismissAlert,
      groupConsecutiveDates,
      daysBetween,
      doSaveCycleDates,
    ],
  );

  const handleCalendarDiscard = useCallback(() => {
    showToast("Changes discarded");
  }, [showToast]);

  const handleLogQadaFasts = async (dates: string[]) => {
    let errorMsg: string | undefined;
    for (const dateStr of dates) {
      const error = await handleCalendarTap(dateStr, "qada");
      if (error) {
        errorMsg = error;
        break;
      }
    }
    if (errorMsg) {
      showAlert(errorMsg);
    } else {
      showToast(
        `${dates.length} make-up fast${dates.length > 1 ? "s" : ""} logged`,
      );
    }
  };

  const handleUnlogQadaFast = async (dateStr: string) => {
    const error = await handleCalendarTap(dateStr, "qada");
    if (error) {
      showAlert(error);
    } else {
      showToast("Fast unlogged");
    }
  };

  const handleSaveMood = async () => {
    if (!selectedMood) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addMoodEntry({
      date: todayDateStr,
      mood: selectedMood,
      tags: selectedMoodTags,
      energyLevel: moodEnergyLevel,
      notes: moodNotes,
    });
    setSelectedMood("");
    setSelectedMoodTags([]);
    setMoodEnergyLevel(3);
    setMoodNotes("");
  };

  const handleExportJSON = async () => {
    if (!isPremium) {
      await Haptics.selectionAsync();
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }
    await Haptics.selectionAsync();
    try {
      const { json } = await exportData();
      if (!json || json.length < 10) {
        showToast("No data to export.");
        return;
      }
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!dir) {
        showToast("Storage not available on this device.");
        return;
      }
      const fileUri = dir + "nurai-womens-health.json";
      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Export Women's Health Data",
          UTI: "public.json",
        });
      } else {
        showToast("Data exported successfully.");
      }
    } catch (err: any) {
      console.log("Export JSON error:", err);
      if (err?.message?.includes("cancel") || err?.message?.includes("dismiss"))
        return;
      showToast("Export failed. Please try again.");
    }
  };

  const handleExportCSV = async () => {
    if (!isPremium) {
      await Haptics.selectionAsync();
      navigation.navigate("Subscription", { initialTab: "premium" });
      return;
    }
    await Haptics.selectionAsync();
    try {
      const { csv } = await exportData();
      if (!csv || csv.length < 10) {
        showToast("No data to export.");
        return;
      }
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!dir) {
        showToast("Storage not available on this device.");
        return;
      }
      const fileUri = dir + "nurai-womens-health.csv";
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Export Women's Health Data",
          UTI: "public.comma-separated-values-text",
        });
      } else {
        showToast("Data exported successfully.");
      }
    } catch (err: any) {
      console.log("Export CSV error:", err);
      if (err?.message?.includes("cancel") || err?.message?.includes("dismiss"))
        return;
      showToast("Export failed. Please try again.");
    }
  };

  const [importing, setImporting] = useState(false);

  const handleImportData = async () => {
    await Haptics.selectionAsync();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/json",
          "text/csv",
          "text/comma-separated-values",
          "text/plain",
          "*/*",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0)
        return;

      const file = result.assets[0];
      setImporting(true);

      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: (FileSystem.EncodingType?.UTF8 ?? "utf8") as any,
      });

      const trimmed = content.trim();
      const looksLikeJson = trimmed.startsWith("{") || trimmed.startsWith("[");
      const fileName = (file.name || "").toLowerCase();
      const format: "json" | "csv" =
        fileName.endsWith(".json") || looksLikeJson ? "json" : "csv";

      console.log(
        "[Import] File:",
        file.name,
        "Size:",
        content.length,
        "Format:",
        format,
      );

      const importResult = await importData(content, format);

      setImporting(false);

      if (importResult.error) {
        showToast(importResult.error);
      } else {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        showToast(
          `Successfully imported ${importResult.cyclesImported} cycle${importResult.cyclesImported === 1 ? "" : "s"}. Your predictions and calendar have been updated.`,
        );
      }
    } catch (err: any) {
      setImporting(false);
      console.log("[Import] Error:", err?.message || err, err?.stack);
      if (err?.message?.includes("cancel") || err?.message?.includes("dismiss"))
        return;
      showToast(
        "Import failed. Make sure the file contains valid cycle data and try again.",
      );
    }
  };

  const handleDeleteAll = async () => {
    if (deleteConfirmText !== "DELETE") return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await deleteAllData();
    setDeleteConfirmText("");
    setShowDeleteConfirm(false);
  };

  const handleSaveQadaPlan = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const total = parseInt(wizardTotal) || 0;
    if (total <= 0) return;
    const bd = {
      menstruation: parseInt(breakdownValues.menstruation) || 0,
      pregnancy: parseInt(breakdownValues.pregnancy) || 0,
      breastfeeding: parseInt(breakdownValues.breastfeeding) || 0,
      illness: parseInt(breakdownValues.illness) || 0,
      travel: parseInt(breakdownValues.travel) || 0,
      other: parseInt(breakdownValues.other) || 0,
    };
    await updateQadaPlan({
      totalRequired: total,
      breakdown: bd,
      completedCount: 0,
    });
  };

  const cycleProgress = useMemo(() => {
    if (cycleState === "ON_CYCLE" && activeCycle) {
      const maxDays = settings.typicalPeriodLength || 7;
      return Math.min(currentCycleDay / maxDays, 1);
    }
    if (cycleState === "NOT_ON_CYCLE" && completedCycles.length > 0) {
      const last = completedCycles[completedCycles.length - 1];
      if (last.endDate) {
        const daysSince = daysBetween(last.endDate, todayDateStr);
        const cycleLen = avgCycleLength || settings.typicalCycleLength;
        return Math.min(daysSince / cycleLen, 1);
      }
    }
    return 0;
  }, [
    cycleState,
    currentCycleDay,
    activeCycle,
    completedCycles,
    todayDateStr,
    avgCycleLength,
    daysBetween,
    settings,
  ]);

  const ringColor =
    cycleState === "CYCLE_COMPLETED" ? theme.scholar : theme.primary;

  const renderCycleStatusRing = () => {
    const svgSize = 132;
    const strokeWidth = 5;
    const radius = (svgSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - cycleProgress);
    const trackColor = theme.backgroundTertiary;
    const statusTitle =
      cycleState === "ON_CYCLE"
        ? `Cycle day ${currentCycleDay}`
        : cycleState === "CYCLE_COMPLETED"
          ? "Ghusl is the next step"
          : "In a state of purity";
    const statusBody =
      cycleState === "ON_CYCLE"
        ? "Salah and fasting are paused. Gentle dhikr, dua, learning, and rest remain open to you."
        : cycleState === "CYCLE_COMPLETED"
          ? "Complete ghusl before resuming prayer and fasting."
          : "Your worship rhythm is active. Alhamdulillah.";

    return (
      <Animated.View entering={entrance()} style={styles.cycleHeroWrap}>
        <NuraiGlass
          radius={24}
          tint={`${ringColor}12`}
          style={styles.cycleHero}
        >
          <View
            style={styles.cycleHeroContent}
            accessible
            accessibilityRole="summary"
            accessibilityLabel={`${statusTitle}. ${statusBody}`}
          >
            <View style={styles.compactRing}>
              <View
                style={[
                  styles.ringHalo,
                  {
                    width: svgSize + 22,
                    height: svgSize + 22,
                    backgroundColor: ringColor,
                  },
                ]}
              />
              <Svg width={svgSize} height={svgSize}>
                <Defs>
                  <SvgLinearGradient
                    id="ringGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor={ringColor} stopOpacity="1" />
                    <Stop
                      offset="100%"
                      stopColor={ringColor}
                      stopOpacity="0.52"
                    />
                  </SvgLinearGradient>
                </Defs>
                <Circle
                  cx={svgSize / 2}
                  cy={svgSize / 2}
                  r={radius}
                  stroke={trackColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <Circle
                  cx={svgSize / 2}
                  cy={svgSize / 2}
                  r={radius}
                  stroke="url(#ringGrad)"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
                />
              </Svg>
              <View
                style={[
                  styles.ringInner,
                  {
                    width: svgSize - 28,
                    height: svgSize - 28,
                    borderRadius: BorderRadius.full,
                  },
                ]}
              >
                {cycleState === "ON_CYCLE" ? (
                  <>
                    <ThemedText type="h1" style={{ color: ringColor }}>
                      {currentCycleDay}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted, marginTop: 1 }}
                    >
                      day
                    </ThemedText>
                  </>
                ) : (
                  <AppIcon
                    name={
                      cycleState === "CYCLE_COMPLETED"
                        ? "droplet"
                        : "check-circle"
                    }
                    size={32}
                    color={ringColor}
                    decorative
                  />
                )}
              </View>
            </View>

            <View style={styles.cycleHeroCopy}>
              <ThemedText
                type="caption"
                style={[styles.heroEyebrow, { color: ringColor }]}
              >
                TODAY'S RHYTHM
              </ThemedText>
              <ThemedText type="h3" style={styles.cycleHeroTitle}>
                {statusTitle}
              </ThemedText>
              <ThemedText
                type="caption"
                style={[styles.cycleHeroBody, { color: theme.textSecondary }]}
              >
                {statusBody}
              </ThemedText>
              <View
                style={[
                  styles.privateBadge,
                  { backgroundColor: theme.primaryMuted },
                ]}
              >
                <AppIcon
                  name="shield"
                  size={12}
                  color={theme.primary}
                  decorative
                />
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "700" }}
                >
                  Private on this device
                </ThemedText>
              </View>
            </View>
          </View>
        </NuraiGlass>
      </Animated.View>
    );
  };

  const renderQuickActions = () => (
    <Animated.View entering={entrance(100)}>
      <NuraiGlassGroup spacing={10} style={styles.quickActionsRow}>
        {cycleState === "ON_CYCLE" ? (
          <Pressable
            onPress={() => handleEndCycle()}
            style={styles.quickActionBtn}
            accessibilityRole="button"
            accessibilityLabel="Mark period as ended"
            testID="button-period-ended"
          >
            <NuraiGlass
              pointerEvents="none"
              radius={18}
              tint={theme.primaryMuted}
              style={StyleSheet.absoluteFillObject}
            />
            <AppIcon name="check-circle" size={21} color={theme.primary} />
            <ThemedText type="caption" style={styles.quickActionLabel}>
              End period
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => handleStartCycle()}
            style={styles.quickActionBtn}
            accessibilityRole="button"
            accessibilityLabel="Mark period as started"
            testID="button-period-started"
          >
            <NuraiGlass
              pointerEvents="none"
              radius={18}
              tint={theme.primaryMuted}
              style={StyleSheet.absoluteFillObject}
            />
            <AppIcon name="heart" size={21} color={theme.primary} />
            <ThemedText type="caption" style={styles.quickActionLabel}>
              Start period
            </ThemedText>
          </Pressable>
        )}

        {cycleState === "CYCLE_COMPLETED" ? (
          <Pressable
            onPress={handleAcknowledgeGhusl}
            style={styles.quickActionBtn}
            accessibilityRole="button"
            accessibilityLabel="Mark ghusl as completed"
            testID="button-ghusl-completed"
          >
            <NuraiGlass
              pointerEvents="none"
              radius={18}
              tint={theme.scholarSoft}
              style={StyleSheet.absoluteFillObject}
            />
            <AppIcon name="droplet" size={21} color={theme.scholar} />
            <ThemedText
              type="caption"
              style={[styles.quickActionLabel, { color: theme.scholar }]}
            >
              Ghusl done
            </ThemedText>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => {
            setActiveTab("Track");
            Haptics.selectionAsync();
          }}
          style={styles.quickActionBtn}
          accessibilityRole="button"
          accessibilityLabel="Log symptoms and mood"
          testID="button-log-symptoms"
        >
          <NuraiGlass
            pointerEvents="none"
            radius={18}
            tint={theme.primaryMuted}
            style={StyleSheet.absoluteFillObject}
          />
          <AppIcon name="edit-3" size={21} color={theme.primary} />
          <ThemedText type="caption" style={styles.quickActionLabel}>
            Log today
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => {
            setActiveTab("Calendar");
            Haptics.selectionAsync();
          }}
          style={styles.quickActionBtn}
          accessibilityRole="button"
          accessibilityLabel="Open cycle calendar"
          testID="button-view-calendar"
        >
          <NuraiGlass
            pointerEvents="none"
            radius={18}
            tint={theme.primaryMuted}
            style={StyleSheet.absoluteFillObject}
          />
          <AppIcon name="calendar" size={21} color={theme.primary} />
          <ThemedText type="caption" style={styles.quickActionLabel}>
            Calendar
          </ThemedText>
        </Pressable>
      </NuraiGlassGroup>
    </Animated.View>
  );

  const renderInsights = () => {
    if (insights.length === 0 && !fertileWindow) return null;
    const toneColor = (tone: string) =>
      tone === "watch"
        ? theme.warning
        : tone === "scholar"
          ? theme.scholar
          : theme.primary;
    return (
      <Animated.View
        entering={entrance(140)}
        style={[
          styles.privateCareCard,
          {
            backgroundColor: "transparent",
            borderColor: `${theme.primary}28`,
          },
        ]}
      >
        <NuraiGlass
          pointerEvents="none"
          radius={22}
          tint={theme.primarySubtle}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.privateCareHeader}>
          <View
            style={[
              styles.privateCareIcon,
              { backgroundColor: `${theme.primary}16` },
            ]}
          >
            <AppIcon name="activity" size={18} color={theme.primary} />
          </View>
          <ThemedText type="h4">Your insights</ThemedText>
        </View>

        {fertileWindow ? (
          <View
            style={[styles.insightRow, { borderColor: `${theme.scholar}30` }]}
          >
            <AppIcon name="sun" size={18} color={theme.scholar} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText type="body" style={{ fontWeight: "700" }}>
                Calendar planning estimate
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {formatDateDisplay(fertileWindow.fertileStart)} –{" "}
                {formatDateDisplay(fertileWindow.fertileEnd)} · possible
                ovulation {formatDateDisplay(fertileWindow.ovulationStart)} –{" "}
                {formatDateDisplay(fertileWindow.ovulationEnd)}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Based on logged dates only. Do not use this estimate as
                contraception or to confirm or exclude pregnancy.
              </ThemedText>
            </View>
          </View>
        ) : null}

        {insights.map((insight) => {
          const accent = toneColor(insight.tone);
          return (
            <View
              key={insight.id}
              style={[styles.insightRow, { borderColor: `${accent}26` }]}
              accessibilityLabel={`${insight.title}. ${insight.body}`}
            >
              <View
                style={[styles.insightIcon, { backgroundColor: `${accent}16` }]}
              >
                <AppIcon
                  name={insight.icon}
                  size={16}
                  color={accent}
                  decorative
                />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText type="body" style={{ fontWeight: "700" }}>
                  {insight.title}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, lineHeight: 17 }}
                >
                  {insight.body}
                </ThemedText>
              </View>
            </View>
          );
        })}
      </Animated.View>
    );
  };

  const renderHomeTab = () => (
    <>
      {renderCycleStatusRing()}
      {renderQuickActions()}
      {renderInsights()}

      <Animated.View
        entering={entrance(160)}
        style={[
          styles.privateCareCard,
          {
            backgroundColor: "transparent",
            borderColor: `${theme.primary}28`,
          },
        ]}
      >
        <NuraiGlass
          pointerEvents="none"
          radius={22}
          tint={theme.primarySubtle}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.privateCareHeader}>
          <View
            style={[
              styles.privateCareIcon,
              { backgroundColor: `${theme.primary}16` },
            ]}
          >
            <AppIcon name="shield" size={19} color={theme.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText type="h4">Private care rhythm</ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              Local-first tracking with worship-aware pauses and respectful
              guidance.
            </ThemedText>
          </View>
        </View>
        <View style={styles.privateCareGrid}>
          <View style={styles.privateCareMetric}>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              State
            </ThemedText>
            <ThemedText type="small" style={{ fontWeight: "800" }}>
              {cycleState === "ON_CYCLE"
                ? "Protected"
                : cycleState === "CYCLE_COMPLETED"
                  ? "Ghusl due"
                  : "Clear"}
            </ThemedText>
          </View>
          <View style={styles.privateCareMetric}>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Qada
            </ThemedText>
            <ThemedText type="small" style={{ fontWeight: "800" }}>
              {remainingQada} left
            </ThemedText>
          </View>
          <View style={styles.privateCareMetric}>
            <ThemedText type="caption" style={{ color: theme.textMuted }}>
              Madhab
            </ThemedText>
            <ThemedText
              type="small"
              style={{ fontWeight: "800" }}
              numberOfLines={1}
            >
              {settings.madhabConfirmed
                ? MADHAB_RULES[settings.madhab].name
                : "Not selected"}
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      {cycleLengthHistory.length >= 2 ? (
        <Animated.View
          entering={entrance(180)}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: Spacing.sm,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <ThemedText
                type="caption"
                style={{
                  color: theme.primary,
                  letterSpacing: 1.4,
                  fontWeight: "800",
                }}
              >
                CYCLE HISTORY
              </ThemedText>
              <ThemedText type="h4" style={{ marginTop: 2 }}>
                Cycle length trend
              </ThemedText>
            </View>
            {avgCycleLength > 0 ? (
              <View
                style={{
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: 4,
                  borderRadius: BorderRadius.full,
                  backgroundColor: theme.primaryMuted,
                }}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "800" }}
                >
                  {`avg ${avgCycleLength}d`}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <NuraiTrendChart
            data={cycleLengthHistory}
            accent={theme.primary}
            unit="d"
            height={82}
          />
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, marginTop: Spacing.sm }}
          >
            {cycleStdDev !== undefined && cycleStdDev < 3
              ? "Your cycles are running steady and regular."
              : cycleStdDev !== undefined && cycleStdDev < 6
                ? "Slight natural variation — well within a normal range."
                : "Your cycles vary a fair bit; keep tracking to learn your rhythm."}
          </ThemedText>
        </Animated.View>
      ) : null}

      {derived.streakProtection.active ? (
        <Animated.View entering={entrance(260)}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: emerald.text,
                borderLeftWidth: 3,
              },
            ]}
          >
            <View style={styles.statusRow}>
              <View
                style={[styles.educationIcon, { backgroundColor: emerald.bg }]}
              >
                <AppIcon name="shield" size={18} color={emerald.text} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={{ fontWeight: "700" }}>
                  {derived.streakProtection.title}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    marginTop: 2,
                    lineHeight: 18,
                  }}
                >
                  {derived.streakProtection.body}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.symptomsWrap, { marginTop: Spacing.md }]}>
              {derived.streakProtection.suggestedActions.map((action) => (
                <View
                  key={action}
                  style={[
                    styles.badge,
                    {
                      backgroundColor: emerald.bg,
                      borderWidth: 1,
                      borderColor: `${emerald.text}35`,
                    },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: emerald.text, fontWeight: "600" }}
                  >
                    {action}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      ) : null}

      {prediction ? (
        <Animated.View entering={entrance(300)}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
                borderLeftWidth: 3,
                borderLeftColor: emerald.text,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: Spacing.sm,
              }}
            >
              <AppIcon name="trending-up" size={16} color={emerald.text} />
              <ThemedText
                type="small"
                style={{ fontWeight: "600", marginLeft: Spacing.sm }}
              >
                {"Next Period Prediction"}
              </ThemedText>
            </View>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {prediction.confidence === "high"
                ? "Predicted"
                : prediction.confidence === "medium"
                  ? "Estimated"
                  : "Approximate"}
              {": "}
              {nextPrediction ? nextPrediction.start : "N/A"}
              {prediction.rangeStart && prediction.rangeEnd
                ? ` (range: ${formatDate(prediction.rangeStart)} - ${formatDate(prediction.rangeEnd)})`
                : ""}
            </ThemedText>
            <View
              style={[
                styles.confidenceBadge,
                {
                  backgroundColor:
                    prediction.confidence === "high"
                      ? `${emerald.text}20`
                      : prediction.confidence === "medium"
                        ? `${theme.warning}20`
                        : `${theme.error}20`,
                  paddingHorizontal: Spacing.md,
                  paddingVertical: 5,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{
                  fontSize: 11,
                  color:
                    prediction.confidence === "high"
                      ? emerald.text
                      : prediction.confidence === "medium"
                        ? theme.warning
                        : theme.error,
                }}
              >
                {prediction.confidence === "high"
                  ? "High confidence"
                  : prediction.confidence === "medium"
                    ? "Medium confidence"
                    : "Low confidence"}
                {completedCycles.length >= 3
                  ? ` (based on ${completedCycles.length} cycles)`
                  : " (need more data)"}
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={entrance(400)}>
        <Pressable
          onPress={() => {
            setActiveTab("Settings");
            Haptics.selectionAsync();
          }}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
          testID="button-qada-summary-home"
        >
          <View style={styles.qadaSummaryRow}>
            <AppIcon name="calendar" size={18} color={emerald.text} />
            <ThemedText
              type="small"
              style={{ marginLeft: Spacing.sm, fontWeight: "600" }}
            >
              {remainingQada === 0 && qadaPlan.totalRequired > 0
                ? "All make-up fasts completed"
                : `Remaining make-up fasts: ${remainingQada}`}
            </ThemedText>
          </View>
          <View
            style={[
              styles.progressBg,
              {
                backgroundColor: isDark
                  ? theme.backgroundTertiary
                  : theme.backgroundSecondary,
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: emerald.text,
                  width:
                    qadaPlan.totalRequired > 0
                      ? `${Math.min((qadaPlan.completedCount / qadaPlan.totalRequired) * 100, 100)}%`
                      : "0%",
                },
              ]}
            />
          </View>
        </Pressable>
      </Animated.View>

      {istihadhaWarning ? (
        <Animated.View entering={entrance(450)}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: `${theme.warning}12`,
                borderColor: `${theme.warning}66`,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: Spacing.sm,
              }}
            >
              <AppIcon name="alert-triangle" size={18} color={theme.warning} />
              <ThemedText
                type="small"
                style={{
                  fontWeight: "600",
                  marginLeft: Spacing.sm,
                  color: theme.warning,
                }}
              >
                {"Pattern needs review"}
              </ThemedText>
            </View>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, lineHeight: 18 }}
            >
              {istihadhaWarning.message}
            </ThemedText>
          </View>
        </Animated.View>
      ) : null}

      {derived.careSignal.level !== "normal" ? (
        <Animated.View entering={entrance(440)}>
          <View
            style={[
              styles.card,
              {
                backgroundColor:
                  derived.careSignal.level === "medical"
                    ? `${theme.error}12`
                    : `${theme.warning}12`,
                borderColor:
                  derived.careSignal.level === "medical"
                    ? theme.error
                    : theme.warning,
              },
            ]}
          >
            <View style={styles.statusRow}>
              <AppIcon
                name={
                  derived.careSignal.level === "medical"
                    ? "alert-triangle"
                    : "info"
                }
                size={18}
                color={
                  derived.careSignal.level === "medical"
                    ? theme.error
                    : theme.warning
                }
              />
              <ThemedText
                type="small"
                style={{
                  fontWeight: "700",
                  marginLeft: Spacing.sm,
                  color:
                    derived.careSignal.level === "medical"
                      ? theme.error
                      : theme.warning,
                }}
              >
                {derived.careSignal.title}
              </ThemedText>
            </View>
            <ThemedText
              type="caption"
              style={{
                color: theme.textSecondary,
                lineHeight: 18,
                marginTop: Spacing.xs,
              }}
            >
              {derived.careSignal.body}
            </ThemedText>
            {derived.careSignal.reasons.length > 0 ? (
              <View style={{ marginTop: Spacing.sm, gap: Spacing.xs }}>
                {derived.careSignal.reasons.slice(0, 3).map((reason) => (
                  <ThemedText
                    key={reason}
                    type="caption"
                    style={{ color: theme.textMuted, lineHeight: 17 }}
                  >
                    {`- ${reason}`}
                  </ThemedText>
                ))}
              </View>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={entrance(500)}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: Spacing.sm,
            }}
          >
            <AppIcon name="info" size={16} color={theme.textMuted} />
            <ThemedText
              type="small"
              style={{ fontWeight: "600", marginLeft: Spacing.sm }}
            >
              {"Scholarly Disclaimer"}
            </ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, lineHeight: 18 }}
          >
            {
              "General education only. NurAI uses your selected madhhab for tracking prompts, keeps cycle data local by default, and sends only minimal anonymized context to AI guidance. Personal rulings need a qualified scholar; health concerns need a healthcare professional."
            }
          </ThemedText>
        </View>
      </Animated.View>
    </>
  );

  const renderSymptomCategory = (
    title: string,
    catKey: string,
    symptoms: readonly { key: string; label: string; icon: string }[],
    color: { bg: string; text: string },
  ) => {
    const isExpanded = expandedSymptomCat === catKey;
    return (
      <View style={{ marginBottom: Spacing.md }}>
        <Pressable
          onPress={() => {
            setExpandedSymptomCat(isExpanded ? null : catKey);
            Haptics.selectionAsync();
          }}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: isExpanded ? color.text : theme.borderSubtle,
              paddingBottom: isExpanded ? Spacing.sm : Spacing.lg,
            },
          ]}
          testID={`button-symptom-cat-${catKey}`}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <ThemedText type="small" style={{ fontWeight: "600" }}>
              {title}
            </ThemedText>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: Spacing.sm,
              }}
            >
              <View style={[styles.badge, { backgroundColor: color.bg }]}>
                <ThemedText
                  type="caption"
                  style={{ color: color.text, fontSize: 10 }}
                >
                  {
                    symptoms.filter((s) =>
                      activeMetadata?.symptoms.some((as) => as.key === s.key),
                    ).length
                  }
                  {"/"}
                  {symptoms.length}
                </ThemedText>
              </View>
              <AppIcon
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.textMuted}
              />
            </View>
          </View>
        </Pressable>
        {isExpanded ? (
          <View style={[styles.symptomsWrap, { marginTop: Spacing.sm }]}>
            {symptoms.map((sym) => {
              const isSelected =
                activeMetadata?.symptoms.some((s) => s.key === sym.key) ||
                false;
              return (
                <Pressable
                  key={sym.key}
                  onPress={() => handleToggleSymptom(sym.key)}
                  style={[
                    styles.symptomChip,
                    { borderColor: theme.borderSubtle },
                    isSelected
                      ? { backgroundColor: color.bg, borderColor: color.text }
                      : { backgroundColor: theme.surfaceGlass },
                  ]}
                  testID={`button-symptom-${sym.key}`}
                >
                  <AppIcon
                    name={sym.icon as any}
                    size={14}
                    color={isSelected ? color.text : theme.textMuted}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.symptomChipText,
                      {
                        color: isSelected ? color.text : theme.textSecondary,
                        fontFamily: isSelected
                          ? Fonts?.sansSemiBold
                          : Fonts?.sans,
                      },
                    ]}
                  >
                    {sym.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  };

  const renderTrackTab = () => (
    <>
      {cycleState === "ON_CYCLE" ? (
        <>
          <Animated.View entering={entrance(100)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              {"Flow Intensity"}
            </ThemedText>
            <View style={styles.flowRow}>
              {FLOW_LEVELS.map((level) => {
                const isSelected =
                  level === "spotting"
                    ? activeMetadata?.flowLevel === "light"
                    : activeMetadata?.flowLevel === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() => handleFlowSelect(level)}
                    style={[
                      styles.flowPill,
                      { borderColor: rose.text },
                      isSelected
                        ? { backgroundColor: rose.bg }
                        : { backgroundColor: theme.surfaceGlass },
                    ]}
                    testID={`button-flow-${level}`}
                  >
                    <Text
                      style={[
                        styles.flowPillText,
                        {
                          color: isSelected ? rose.text : theme.textSecondary,
                          fontFamily: Fonts?.sansSemiBold,
                          fontSize: 14,
                        },
                      ]}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={entrance(150)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              {"Flow Color"}
            </ThemedText>
            <View style={styles.flowRow}>
              {FLOW_COLORS.map((fc) => (
                <Pressable
                  key={fc.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                  }}
                  style={[styles.colorDot, { borderColor: theme.borderSubtle }]}
                  testID={`button-color-${fc.key}`}
                >
                  <View
                    style={[
                      styles.colorDotInner,
                      { backgroundColor: fc.color },
                    ]}
                  />
                  <Text
                    style={[
                      {
                        fontSize: 10,
                        color: theme.textSecondary,
                        marginTop: 2,
                        fontFamily: Fonts?.sans,
                      },
                    ]}
                  >
                    {fc.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={entrance(200)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              {"Symptoms"}
            </ThemedText>
            {renderSymptomCategory(
              "Physical",
              "physical",
              PHYSICAL_SYMPTOMS,
              rose,
            )}
            {renderSymptomCategory(
              "Emotional",
              "emotional",
              EMOTIONAL_SYMPTOMS,
              purple,
            )}
            {renderSymptomCategory(
              "Discharge",
              "discharge",
              DISCHARGE_SYMPTOMS,
              teal,
            )}
            {renderSymptomCategory(
              "Spiritual",
              "spiritual",
              SPIRITUAL_SYMPTOMS,
              emerald,
            )}
          </Animated.View>
        </>
      ) : (
        <Animated.View entering={entrance(100)}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
                alignItems: "center",
                paddingVertical: Spacing["2xl"],
              },
            ]}
          >
            <AppIcon name="edit-3" size={32} color={theme.textMuted} />
            <ThemedText
              type="small"
              style={{
                color: theme.textMuted,
                marginTop: Spacing.md,
                textAlign: "center",
              }}
            >
              {
                "Flow and symptom tracking is available during an active cycle. Start a new cycle to begin tracking."
              }
            </ThemedText>
            <Pressable
              onPress={() => handleStartCycle()}
              style={[
                styles.actionBtnGradient,
                {
                  backgroundColor: theme.primary,
                  marginTop: Spacing.lg,
                  paddingHorizontal: Spacing["2xl"],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Start a new cycle"
              testID="button-start-cycle-track"
            >
              <AppIcon
                name="plus-circle"
                size={18}
                color={theme.primaryForeground}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  {
                    color: theme.primaryForeground,
                    fontFamily: Fonts?.sansBold,
                  },
                ]}
              >
                {"Start Cycle"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      <Animated.View entering={entrance(300)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {"Mood Check-in"}
        </ThemedText>
        {todayMood ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: Spacing.sm,
              }}
            >
              <View style={[styles.moodIconBg, { backgroundColor: purple.bg }]}>
                <AppIcon
                  name={
                    (MOOD_OPTIONS.find((m) => m.key === todayMood.mood)?.icon ||
                      "smile") as any
                  }
                  size={22}
                  color={purple.text}
                />
              </View>
              <View>
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  {"Today: "}
                  {MOOD_OPTIONS.find((m) => m.key === todayMood.mood)?.label ||
                    todayMood.mood}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  {"Energy: "}
                  {todayMood.energyLevel}
                  {"/5"}
                </ThemedText>
              </View>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{ fontWeight: "600", marginBottom: Spacing.md }}
            >
              {"How are you feeling?"}
            </ThemedText>
            <View style={styles.moodGrid}>
              {MOOD_OPTIONS.map((m) => {
                const isSelected = selectedMood === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => {
                      setSelectedMood(m.key);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.moodOption,
                      isSelected
                        ? {
                            backgroundColor: purple.bg,
                            borderColor: purple.text,
                            borderWidth: 2,
                          }
                        : { borderColor: theme.borderSubtle },
                    ]}
                    testID={`button-mood-${m.key}`}
                  >
                    <AppIcon
                      name={m.icon}
                      size={24}
                      color={isSelected ? purple.text : theme.textMuted}
                    />
                    <Text
                      style={[
                        styles.moodOptionLabel,
                        {
                          color: isSelected ? purple.text : theme.textSecondary,
                          fontFamily: isSelected
                            ? Fonts?.sansSemiBold
                            : Fonts?.sans,
                        },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {selectedMood ? (
              <>
                <ThemedText
                  type="small"
                  style={{
                    fontWeight: "600",
                    marginTop: Spacing.lg,
                    marginBottom: Spacing.sm,
                  }}
                >
                  {"Tags"}
                </ThemedText>
                <View style={styles.symptomsWrap}>
                  {MOOD_TAGS.map((tag) => {
                    const isSelected = selectedMoodTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedMoodTags((prev) =>
                            prev.includes(tag)
                              ? prev.filter((t) => t !== tag)
                              : [...prev, tag],
                          );
                        }}
                        style={[
                          styles.symptomChip,
                          { borderColor: theme.borderSubtle },
                          isSelected
                            ? {
                                backgroundColor: purple.bg,
                                borderColor: purple.text,
                              }
                            : { backgroundColor: theme.surfaceGlass },
                        ]}
                        testID={`button-mood-tag-${tag}`}
                      >
                        <Text
                          style={[
                            styles.symptomChipText,
                            {
                              color: isSelected
                                ? purple.text
                                : theme.textSecondary,
                              fontFamily: Fonts?.sans,
                            },
                          ]}
                        >
                          {tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <ThemedText
                  type="small"
                  style={{
                    fontWeight: "600",
                    marginTop: Spacing.lg,
                    marginBottom: Spacing.sm,
                  }}
                >
                  {"Energy Level"}
                </ThemedText>
                <View style={styles.energyRow}>
                  {ENERGY_LEVELS.map((e) => {
                    const isSelected = moodEnergyLevel === e.value;
                    return (
                      <Pressable
                        key={e.value}
                        onPress={() => {
                          setMoodEnergyLevel(e.value);
                          Haptics.selectionAsync();
                        }}
                        style={[
                          styles.energyDot,
                          { borderColor: purple.text },
                          isSelected
                            ? { backgroundColor: purple.bg }
                            : { backgroundColor: theme.surfaceGlass },
                        ]}
                        testID={`button-mood-energy-${e.value}`}
                      >
                        <Text
                          style={[
                            styles.energyDotText,
                            {
                              color: isSelected
                                ? purple.text
                                : theme.textSecondary,
                              fontFamily: Fonts?.sansBold,
                            },
                          ]}
                        >
                          {e.value}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, marginTop: Spacing.xs }}
                >
                  {ENERGY_LEVELS.find((e) => e.value === moodEnergyLevel)
                    ?.label || ""}
                </ThemedText>

                <TextInput
                  style={[
                    styles.notesInput,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.borderSubtle,
                      color: theme.text,
                      fontFamily: Fonts?.sans,
                      marginTop: Spacing.md,
                    },
                  ]}
                  placeholder="Notes (optional)"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  value={moodNotes}
                  onChangeText={setMoodNotes}
                  testID="input-mood-notes"
                />

                <Pressable
                  onPress={handleSaveMood}
                  style={[
                    styles.actionBtnGradient,
                    {
                      backgroundColor: theme.primary,
                      marginTop: Spacing.md,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Save today's mood check-in"
                  testID="button-save-mood"
                >
                  <AppIcon
                    name="check"
                    size={20}
                    color={theme.primaryForeground}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      {
                        color: theme.primaryForeground,
                        fontFamily: Fonts?.sansBold,
                      },
                    ]}
                  >
                    {"Save Mood"}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        )}
      </Animated.View>

      <Animated.View entering={entrance(400)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {"Salah Tracker"}
        </ThemedText>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: Spacing.sm,
              marginBottom: Spacing.md,
            }}
          >
            <AppIcon name="clock" size={18} color={emerald.text} />
            <ThemedText type="small" style={{ fontWeight: "600" }}>
              {"Prayer Exemption Summary"}
            </ThemedText>
          </View>

          {cycleState === "ON_CYCLE" && activeCycle ? (
            <View style={[styles.salahInfoBox, { backgroundColor: rose.bg }]}>
              <ThemedText
                type="small"
                style={{ color: rose.text, fontWeight: "600" }}
              >
                {"NurAI has paused prayer-completion prompts for "}
                {currentCycleDay}
                {" day"}
                {currentCycleDay !== 1 ? "s" : ""}
                {
                  " based on your cycle entry. Follow your personal fiqh guidance."
                }
              </ThemedText>
            </View>
          ) : (
            <View
              style={[styles.salahInfoBox, { backgroundColor: emerald.bg }]}
            >
              <ThemedText type="small" style={{ color: emerald.text }}>
                {
                  "No cycle pause is active in NurAI. Follow your personal fiqh guidance for prayer."
                }
              </ThemedText>
            </View>
          )}

          {completedCycles.length > 0 ? (
            <View style={{ marginTop: Spacing.md }}>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}
              >
                {"Total exempt days from recent cycles: "}
                {(() => {
                  const total = completedCycles.slice(-6).reduce((sum, c) => {
                    if (c.endDate)
                      return sum + daysBetween(c.startDate, c.endDate);
                    return sum;
                  }, 0);
                  return `${total} ${total === 1 ? "day" : "days"}`;
                })()}
              </ThemedText>
            </View>
          ) : null}

          <View
            style={[
              styles.scholarNote,
              {
                backgroundColor: theme.backgroundTertiary,
                marginTop: Spacing.md,
              },
            ]}
          >
            <AppIcon name="book-open" size={14} color={theme.textMuted} />
            <ThemedText
              type="caption"
              style={{
                color: theme.textSecondary,
                marginLeft: Spacing.sm,
                flex: 1,
                lineHeight: 18,
              }}
            >
              {
                "General education: many Sunni fiqh summaries distinguish between missed prayers and missed Ramadan fasts during haidh. Details can vary by school and circumstance, so ask a qualified scholar for your case."
              }
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      {renderJournalSection()}
    </>
  );

  const renderJournalSection = () => {
    const indigo = primaryAccent;
    const phaseKey = cycleState || "NOT_ON_CYCLE";
    const prompts = PHASE_PROMPTS[phaseKey] || PHASE_PROMPTS.NOT_ON_CYCLE;
    const dailyPrompt =
      prompts[Math.floor(new Date().getDate() % prompts.length)];

    const handleSaveJournal = async () => {
      if (!journalContent.trim()) return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await addJournalEntry({
        date: todayDateStr,
        title:
          journalTitle.trim() ||
          new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          }),
        content: journalContent.trim(),
        tags: journalTags.length > 0 ? journalTags : undefined,
        phase: phaseKey,
      });
      setJournalTitle("");
      setJournalContent("");
      setJournalTags([]);
    };

    const toggleJournalTag = (tag: string) => {
      Haptics.selectionAsync();
      setJournalTags((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
      );
    };

    const filteredEntries = journalSearch.trim()
      ? journalEntries.filter(
          (e) =>
            e.title.toLowerCase().includes(journalSearch.toLowerCase()) ||
            e.content.toLowerCase().includes(journalSearch.toLowerCase()) ||
            (e.tags || []).some((t) =>
              t.toLowerCase().includes(journalSearch.toLowerCase()),
            ),
        )
      : journalEntries;

    return (
      <>
        <Animated.View entering={entrance(500)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            {"Private Journal"}
          </ThemedText>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: Spacing.sm,
                marginBottom: Spacing.md,
              }}
            >
              <AppIcon name="edit-3" size={18} color={indigo.text} />
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                {"Write an Entry"}
              </ThemedText>
            </View>

            <View
              style={[
                styles.journalPromptCard,
                { backgroundColor: theme.primaryMuted },
              ]}
            >
              <AppIcon name="message-circle" size={14} color={indigo.text} />
              <ThemedText
                type="caption"
                style={{
                  color: indigo.text,
                  marginLeft: Spacing.sm,
                  flex: 1,
                  fontStyle: "italic",
                }}
              >
                {dailyPrompt}
              </ThemedText>
            </View>

            <TextInput
              style={[
                styles.journalTitleInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.borderSubtle,
                  color: theme.text,
                  fontFamily: Fonts?.sansSemiBold,
                },
              ]}
              placeholder="Title (optional)"
              placeholderTextColor={theme.textMuted}
              value={journalTitle}
              onChangeText={setJournalTitle}
              testID="input-journal-title"
            />
            <TextInput
              style={[
                styles.journalContentInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.borderSubtle,
                  color: theme.text,
                  fontFamily: Fonts?.sans,
                },
              ]}
              placeholder="Write your private thoughts"
              placeholderTextColor={theme.textMuted}
              multiline
              value={journalContent}
              onChangeText={setJournalContent}
              testID="input-journal-content"
            />

            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginBottom: Spacing.sm }}
            >
              {"Tags"}
            </ThemedText>
            <View style={styles.symptomsWrap}>
              {JOURNAL_TAGS.map((tag) => {
                const isSelected = journalTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleJournalTag(tag)}
                    style={[
                      styles.symptomChip,
                      { borderColor: theme.borderSubtle },
                      isSelected
                        ? {
                            backgroundColor: indigo.bg,
                            borderColor: indigo.text,
                          }
                        : { backgroundColor: theme.surfaceGlass },
                    ]}
                    testID={`button-journal-tag-${tag}`}
                  >
                    <Text
                      style={[
                        styles.symptomChipText,
                        {
                          color: isSelected ? indigo.text : theme.textSecondary,
                          fontFamily: Fonts?.sans,
                        },
                      ]}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={[
                styles.journalPhaseBadge,
                {
                  backgroundColor: isDark
                    ? theme.backgroundTertiary
                    : theme.backgroundSecondary,
                  marginTop: Spacing.md,
                },
              ]}
            >
              <AppIcon name="tag" size={12} color={theme.textMuted} />
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, marginLeft: Spacing.xs }}
              >
                {"Phase: "}
                {phaseKey === "ON_CYCLE"
                  ? "During Cycle"
                  : phaseKey === "CYCLE_COMPLETED"
                    ? "Post-Cycle"
                    : "Purity"}
              </ThemedText>
            </View>

            <Pressable
              onPress={handleSaveJournal}
              disabled={!journalContent.trim()}
              style={[
                styles.actionBtnGradient,
                {
                  backgroundColor: theme.primary,
                  marginTop: Spacing.md,
                  opacity: journalContent.trim() ? 1 : 0.4,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save private journal entry"
              accessibilityState={{ disabled: !journalContent.trim() }}
              testID="button-save-journal"
            >
              <AppIcon name="save" size={18} color={theme.primaryForeground} />
              <Text
                style={[
                  styles.actionBtnText,
                  {
                    color: theme.primaryForeground,
                    fontFamily: Fonts?.sansBold,
                  },
                ]}
              >
                {"Save Entry"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={entrance(600)}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: Spacing.xl,
            }}
          >
            <ThemedText type="h4">{"Journal History"}</ThemedText>
            <Pressable
              onPress={() => {
                setShowJournalHistory(!showJournalHistory);
                Haptics.selectionAsync();
              }}
              testID="button-toggle-journal-history"
            >
              <ThemedText type="caption" style={{ color: indigo.text }}>
                {showJournalHistory
                  ? "Hide"
                  : `Show (${journalEntries.length})`}
              </ThemedText>
            </Pressable>
          </View>

          {showJournalHistory ? (
            <>
              {journalEntries.length > 3 ? (
                <TextInput
                  style={[
                    styles.journalTitleInput,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.borderSubtle,
                      color: theme.text,
                      fontFamily: Fonts?.sans,
                      marginTop: Spacing.sm,
                    },
                  ]}
                  placeholder="Search entries"
                  placeholderTextColor={theme.textMuted}
                  value={journalSearch}
                  onChangeText={setJournalSearch}
                  testID="input-journal-search"
                />
              ) : null}

              {filteredEntries.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <AppIcon name="book" size={24} color={theme.textMuted} />
                  <ThemedText
                    type="small"
                    style={{ color: theme.textMuted, marginTop: Spacing.sm }}
                  >
                    {journalSearch.trim()
                      ? "No matching entries"
                      : "No journal entries yet"}
                  </ThemedText>
                </View>
              ) : (
                filteredEntries.slice(0, 20).map((entry) => (
                  <View
                    key={entry.id}
                    style={[
                      styles.journalEntryCard,
                      {
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.journalEntryHeader}>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="small" style={{ fontWeight: "600" }}>
                          {entry.title}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textMuted, marginTop: 2 }}
                        >
                          {formatDate(entry.date)}
                        </ThemedText>
                      </View>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          deleteJournalEntry(entry.id);
                        }}
                        style={styles.headerBtn}
                        testID={`button-delete-journal-${entry.id}`}
                      >
                        <AppIcon
                          name="trash-2"
                          size={16}
                          color={theme.textMuted}
                        />
                      </Pressable>
                    </View>
                    <ThemedText
                      type="small"
                      style={{
                        color: theme.textSecondary,
                        marginTop: Spacing.sm,
                        lineHeight: 20,
                      }}
                    >
                      {entry.content.length > 150
                        ? `${entry.content.slice(0, 150)}...`
                        : entry.content}
                    </ThemedText>
                    {(entry.tags || []).length > 0 ? (
                      <View
                        style={[
                          styles.journalTagsRow,
                          { marginTop: Spacing.sm },
                        ]}
                      >
                        {(entry.tags || []).map((t) => (
                          <View
                            key={t}
                            style={[
                              styles.journalTagBadge,
                              { backgroundColor: indigo.bg },
                            ]}
                          >
                            <ThemedText
                              type="caption"
                              style={{ color: indigo.text, fontSize: 10 }}
                            >
                              {t}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {entry.phase ? (
                      <View
                        style={[
                          styles.journalTagBadge,
                          {
                            backgroundColor: isDark
                              ? theme.backgroundTertiary
                              : theme.backgroundSecondary,
                            marginTop: Spacing.xs,
                          },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textMuted, fontSize: 10 }}
                        >
                          {entry.phase === "ON_CYCLE"
                            ? "During Cycle"
                            : entry.phase === "CYCLE_COMPLETED"
                              ? "Post-Cycle"
                              : "Purity"}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </>
          ) : null}
        </Animated.View>

        <Animated.View entering={entrance(700)}>
          <View
            style={[
              styles.disclaimerCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <AppIcon name="lock" size={14} color={theme.textMuted} />
            <ThemedText
              type="caption"
              style={{
                color: theme.textMuted,
                marginLeft: Spacing.sm,
                flex: 1,
              }}
            >
              {
                "Your journal is saved locally by default. You can delete it anytime in Settings."
              }
            </ThemedText>
          </View>
        </Animated.View>
      </>
    );
  };

  const renderCalendarTab = () => (
    <>
      <Animated.View entering={entrance(100)}>
        <View style={styles.calendarModeRail}>
          <NuraiGlass
            pointerEvents="none"
            radius={18}
            tint={theme.primarySubtle}
            style={StyleSheet.absoluteFillObject}
          />
          <Pressable
            onPress={() => {
              setCalendarMode("cycle");
              Haptics.selectionAsync();
            }}
            style={styles.calModePill}
            accessible
            accessibilityRole="tab"
            accessibilityLabel="Cycle calendar"
            accessibilityState={{ selected: calendarMode === "cycle" }}
            accessibilityActions={[
              { name: "activate", label: "Show cycle calendar" },
            ]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === "activate") {
                setCalendarMode("cycle");
                Haptics.selectionAsync();
              }
            }}
            testID="button-cal-mode-cycle"
          >
            {calendarMode === "cycle" ? (
              <NuraiGlass
                pointerEvents="none"
                radius={15}
                tint={theme.primaryMuted}
                style={styles.calendarModeLens}
              />
            ) : null}
            <Text
              style={[
                {
                  fontSize: 13,
                  color:
                    calendarMode === "cycle"
                      ? theme.primary
                      : theme.textSecondary,
                  fontFamily: Fonts?.sansSemiBold,
                },
              ]}
            >
              {"Cycle Calendar"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setCalendarMode("qada");
              Haptics.selectionAsync();
            }}
            style={styles.calModePill}
            accessible
            accessibilityRole="tab"
            accessibilityLabel="Make-up fast calendar"
            accessibilityState={{ selected: calendarMode === "qada" }}
            accessibilityActions={[
              { name: "activate", label: "Show make-up fast calendar" },
            ]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === "activate") {
                setCalendarMode("qada");
                Haptics.selectionAsync();
              }
            }}
            testID="button-cal-mode-qada"
          >
            {calendarMode === "qada" ? (
              <NuraiGlass
                pointerEvents="none"
                radius={15}
                tint={theme.primaryMuted}
                style={styles.calendarModeLens}
              />
            ) : null}
            <Text
              style={[
                {
                  fontSize: 13,
                  color:
                    calendarMode === "qada"
                      ? theme.primary
                      : theme.textSecondary,
                  fontFamily: Fonts?.sansSemiBold,
                },
              ]}
            >
              {"Qada Calendar"}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.surfaceGlass,
            borderColor: theme.borderSubtle,
          },
        ]}
      >
        <View style={styles.calendarHeader}>
          <Pressable
            onPress={() => {
              if (calendarMonth === 0) {
                setCalendarMonth(11);
                setCalendarYear(calendarYear - 1);
              } else {
                setCalendarMonth(calendarMonth - 1);
              }
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: BorderRadius.full,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              alignItems: "center",
              justifyContent: "center",
            }}
            testID="button-calendar-prev"
          >
            <AppIcon name="chevron-left" size={20} color={theme.text} />
          </Pressable>
          <ThemedText type="h4">
            {getMonthName(calendarMonth)} {calendarYear}
          </ThemedText>
          <Pressable
            onPress={() => {
              if (calendarMonth === 11) {
                setCalendarMonth(0);
                setCalendarYear(calendarYear + 1);
              } else {
                setCalendarMonth(calendarMonth + 1);
              }
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: BorderRadius.full,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              alignItems: "center",
              justifyContent: "center",
            }}
            testID="button-calendar-next"
          >
            <AppIcon name="chevron-right" size={20} color={theme.text} />
          </Pressable>
        </View>
        {calendarMode === "cycle" ? (
          <CycleCalendarGrid
            key={`${calendarYear}-${calendarMonth}`}
            month={calendarMonth}
            year={calendarYear}
            savedDates={savedDatesArray}
            activeCycleDates={activeCycleDatesArray}
            completedCycleDates={completedCycleDatesArray}
            predictedDates={predictedDatesArray}
            todayStr={todayDateStr}
            roseColors={rose}
            emeraldTextColor={emerald.text}
            textColor={theme.text}
            mutedColor={theme.textMuted}
            isDark={isDark}
            onSave={handleCalendarSave}
            onDiscard={handleCalendarDiscard}
          />
        ) : (
          <QadaCalendarGrid
            key={`qada-${calendarYear}-${calendarMonth}`}
            month={calendarMonth}
            year={calendarYear}
            qadaDates={qadaDatesArray}
            todayStr={todayDateStr}
            emeraldColors={emerald}
            textColor={theme.text}
            mutedColor={theme.textMuted}
            isDark={isDark}
            onLogFasts={handleLogQadaFasts}
            onUnlogFast={handleUnlogQadaFast}
          />
        )}
      </View>

      {calendarMode === "cycle" ? (
        <Animated.View entering={entrance(170)}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
                marginTop: Spacing.sm,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{ fontWeight: "600", marginBottom: Spacing.sm }}
            >
              {"Legend"}
            </ThemedText>
            <View style={{ gap: Spacing.xs }}>
              <View style={styles.legendRow}>
                <View
                  style={[styles.legendDot, { backgroundColor: rose.bg }]}
                />
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  {"Period day (tap to select/deselect)"}
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: `${theme.warning}38` },
                  ]}
                />
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  {"Predicted period"}
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendDot,
                    { borderWidth: 2, borderColor: emerald.text },
                  ]}
                />
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  {"Today"}
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>
      ) : null}

      {calendarMode === "cycle" ? (
        <>
          {istihadhaWarning ? (
            <Animated.View entering={entrance(200)}>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: `${theme.warning}12`,
                    borderColor: `${theme.warning}66`,
                    marginTop: Spacing.md,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: Spacing.sm,
                  }}
                >
                  <AppIcon
                    name="alert-triangle"
                    size={18}
                    color={theme.warning}
                  />
                  <ThemedText
                    type="small"
                    style={{
                      fontWeight: "600",
                      marginLeft: Spacing.sm,
                      color: theme.warning,
                    }}
                  >
                    {"Pattern needs review"}
                  </ThemedText>
                </View>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, lineHeight: 18 }}
                >
                  {istihadhaWarning.message}
                </ThemedText>
              </View>
            </Animated.View>
          ) : null}

          <Animated.View entering={entrance(250)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              {"School of Thought (Madhab)"}
            </ThemedText>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                  padding: Spacing.sm,
                },
              ]}
            >
              {(
                Object.entries(MADHAB_RULES) as [
                  Madhab,
                  (typeof MADHAB_RULES)[Madhab],
                ][]
              ).map(([key, rules]) => {
                const isSelected =
                  settings.madhabConfirmed && settings.madhab === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      Haptics.selectionAsync();
                      updateSettings({ madhab: key, madhabConfirmed: true });
                    }}
                    style={[
                      styles.madhabOption,
                      {
                        backgroundColor: isSelected
                          ? `${emerald.text}15`
                          : "transparent",
                        borderColor: isSelected
                          ? emerald.text
                          : theme.borderSubtle,
                      },
                    ]}
                    testID={`button-madhab-${key}`}
                  >
                    <ThemedText
                      type="small"
                      style={{
                        fontWeight: isSelected ? "700" : "400",
                        color: isSelected ? emerald.text : theme.text,
                      }}
                    >
                      {rules.name}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{
                        color: isSelected ? emerald.text : theme.textMuted,
                        marginTop: 2,
                        fontSize: 10,
                        opacity: isSelected ? 0.8 : 0.7,
                      }}
                    >
                      {`Period: ${rules.minHaidh}-${rules.maxHaidh} ${rules.maxHaidh === 1 ? "day" : "days"} | Purity: ${rules.minTuhr}+ ${rules.minTuhr === 1 ? "day" : "days"} | Nifas: ${rules.maxNifas} ${rules.maxNifas === 1 ? "day" : "days"} max`}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={entrance(300)}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                  marginTop: Spacing.md,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={{ fontWeight: "600" }}>
                    {"Postpartum (Nifas) Mode"}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, marginTop: 2 }}
                  >
                    {"Track postpartum bleeding separately"}
                  </ThemedText>
                </View>
                <Switch
                  value={settings.nifasMode}
                  onValueChange={(v) =>
                    updateSettings({
                      nifasMode: v,
                      nifasStartDate: v ? todayDateStr : null,
                    })
                  }
                  trackColor={{ false: theme.switchTrack, true: emerald.text }}
                  thumbColor="#FFFFFF"
                  testID="switch-nifas-mode"
                />
              </View>
              {settings.nifasMode ? (
                <View
                  style={[
                    styles.salahInfoBox,
                    { backgroundColor: emerald.bg, marginTop: Spacing.md },
                  ]}
                >
                  <AppIcon name="info" size={14} color={emerald.text} />
                  <ThemedText
                    type="caption"
                    style={{
                      color: emerald.text,
                      marginLeft: Spacing.sm,
                      flex: 1,
                    }}
                  >
                    {"Nifas tracking active since "}
                    {settings.nifasStartDate
                      ? formatDate(settings.nifasStartDate)
                      : "today"}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </Animated.View>

          <Animated.View entering={entrance(350)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              {"Cycle History"}
            </ThemedText>
            {completedCycles.length === 0 ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                    alignItems: "center",
                  },
                ]}
              >
                <AppIcon name="clock" size={24} color={theme.textMuted} />
                <ThemedText
                  type="small"
                  style={{ color: theme.textMuted, marginTop: Spacing.sm }}
                >
                  {"No completed cycles yet"}
                </ThemedText>
              </View>
            ) : (
              completedCycles.slice(0, 10).map((c) => {
                const length = c.endDate
                  ? daysBetween(c.startDate, c.endDate)
                  : 0;
                const meta = getCycleMetadata(c.id);
                return (
                  <View
                    key={c.id}
                    style={[
                      styles.historyCard,
                      {
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.historyRow}>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="small" style={{ fontWeight: "600" }}>
                          {formatDate(c.startDate)}
                          {" - "}
                          {c.endDate ? formatDate(c.endDate) : "Ongoing"}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textMuted, marginTop: 2 }}
                        >
                          {length}
                          {length === 1 ? " day" : " days"}
                        </ThemedText>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: Spacing.sm,
                        }}
                      >
                        {meta.flowLevel ? (
                          <View
                            style={[
                              styles.badge,
                              {
                                backgroundColor: isDark
                                  ? theme.backgroundTertiary
                                  : theme.backgroundSecondary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                {
                                  fontSize: 11,
                                  fontWeight: "600",
                                  color: theme.textSecondary,
                                  fontFamily: Fonts?.sans,
                                },
                              ]}
                            >
                              {meta.flowLevel.charAt(0).toUpperCase() +
                                meta.flowLevel.slice(1)}
                            </Text>
                          </View>
                        ) : null}
                        <Pressable
                          onPress={() => {
                            Haptics.selectionAsync();
                            deleteCycleById(c.id);
                          }}
                          testID={`button-delete-cycle-${c.id}`}
                        >
                          <AppIcon
                            name="trash-2"
                            size={16}
                            color={theme.textMuted}
                          />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </Animated.View>
        </>
      ) : (
        <Animated.View entering={entrance(200)}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
                marginTop: Spacing.md,
              },
            ]}
          >
            <ThemedText type="small" style={{ fontWeight: "600" }}>
              {remainingQada === 0 && qadaPlan.totalRequired > 0
                ? "All make-up fasts completed"
                : `Remaining: ${remainingQada} fasts`}
            </ThemedText>
            <View
              style={[
                styles.progressBg,
                {
                  backgroundColor: isDark
                    ? theme.backgroundTertiary
                    : theme.backgroundSecondary,
                  marginTop: Spacing.sm,
                },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: emerald.text,
                    width:
                      qadaPlan.totalRequired > 0
                        ? `${Math.min((qadaPlan.completedCount / qadaPlan.totalRequired) * 100, 100)}%`
                        : "0%",
                  },
                ]}
              />
            </View>
          </View>
        </Animated.View>
      )}
    </>
  );

  const filteredModules = useMemo(() => {
    if (!learnSearch.trim()) return EDUCATION_MODULES;
    const q = learnSearch.toLowerCase();
    return EDUCATION_MODULES.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.subtitle.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q),
    );
  }, [learnSearch]);

  const renderLearnTab = () => {
    const categoryColors: Record<string, { bg: string; text: string }> = {
      biology: primaryAccent,
      worship: sacredAccent,
      fasting: sacredAccent,
      wellbeing: primaryAccent,
      "life-stage": primaryAccent,
    };

    return (
      <>
        <Animated.View entering={entrance(100)}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <AppIcon name="search" size={18} color={theme.textMuted} />
            <TextInput
              style={[
                styles.searchInput,
                { color: theme.text, fontFamily: Fonts?.sans },
              ]}
              placeholder="Search modules"
              placeholderTextColor={theme.textMuted}
              value={learnSearch}
              onChangeText={setLearnSearch}
              testID="input-learn-search"
            />
            {learnSearch.length > 0 ? (
              <Pressable
                onPress={() => setLearnSearch("")}
                testID="button-clear-search"
              >
                <AppIcon name="x" size={18} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

        <Animated.View entering={entrance(150)}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundTertiary,
                borderColor: theme.borderSubtle,
                marginBottom: Spacing.md,
                flexDirection: "row",
              },
            ]}
          >
            <AppIcon name="alert-circle" size={16} color={theme.textMuted} />
            <ThemedText
              type="caption"
              style={{
                color: theme.textSecondary,
                marginLeft: Spacing.sm,
                flex: 1,
              }}
            >
              {
                "Not medical advice. Not a fatwa service. Consult qualified professionals for specific rulings and health concerns."
              }
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={entrance(200)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            {"Ask About Rulings"}
          </ThemedText>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: Spacing.sm,
                marginBottom: Spacing.md,
              }}
            >
              <View
                style={[styles.educationIcon, { backgroundColor: teal.bg }]}
              >
                <AppIcon name="zap" size={20} color={teal.text} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={{ fontWeight: "700" }}>
                  {"Discreet Fiqh Guidance"}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  {"Madhab-aware, dignity-based answers"}
                </ThemedText>
              </View>
              {isPremium ? null : (
                <View
                  style={[styles.badge, { backgroundColor: theme.scholarSoft }]}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.scholar,
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                  >
                    {"Premium"}
                  </ThemedText>
                </View>
              )}
            </View>

            {FIQH_QUESTIONS.map((q) => (
              <Pressable
                key={q.key}
                onPress={() => handleAskFiqh(q.label)}
                style={({ pressed }) => [
                  styles.fiqhQuestionBtn,
                  {
                    backgroundColor: pressed
                      ? teal.bg
                      : theme.backgroundSecondary,
                    borderColor: theme.borderSubtle,
                  },
                ]}
                testID={`button-fiqh-${q.key}`}
              >
                <AppIcon name={q.icon} size={16} color={teal.text} />
                <ThemedText type="small" style={{ flex: 1, color: theme.text }}>
                  {q.label}
                </ThemedText>
                <AppIcon
                  name="chevron-right"
                  size={16}
                  color={theme.textMuted}
                />
              </Pressable>
            ))}

            <View style={{ marginTop: Spacing.md }}>
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, marginBottom: Spacing.sm }}
              >
                {"Or ask your own question"}
              </ThemedText>
              <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                <TextInput
                  style={[
                    styles.fiqhCustomInput,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.borderSubtle,
                      color: theme.text,
                      fontFamily: Fonts?.sans,
                    },
                  ]}
                  placeholder="Type your question"
                  placeholderTextColor={theme.textMuted}
                  value={customFiqhQuestion}
                  onChangeText={setCustomFiqhQuestion}
                  testID="input-fiqh-custom"
                />
                <Pressable
                  onPress={() => {
                    if (customFiqhQuestion.trim()) {
                      handleAskFiqh(customFiqhQuestion.trim());
                      setCustomFiqhQuestion("");
                    }
                  }}
                  style={({ pressed }) => [
                    styles.fiqhSendBtn,
                    {
                      backgroundColor: customFiqhQuestion.trim()
                        ? teal.text
                        : theme.borderSubtle,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  testID="button-fiqh-send"
                >
                  <AppIcon
                    name="send"
                    size={16}
                    color={
                      customFiqhQuestion.trim()
                        ? theme.primaryForeground
                        : theme.textMuted
                    }
                  />
                </Pressable>
              </View>
            </View>

            <View
              style={[
                styles.scholarNote,
                {
                  backgroundColor: theme.backgroundTertiary,
                  marginTop: Spacing.lg,
                },
              ]}
            >
              <AppIcon name="shield" size={14} color={theme.textMuted} />
              <ThemedText
                type="caption"
                style={{
                  color: theme.textMuted,
                  marginLeft: Spacing.sm,
                  flex: 1,
                  lineHeight: 16,
                }}
              >
                {
                  "For this request, NurAI sends only cycle duration, regularity, and current phase, not saved dates or journal text."
                }
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        {filteredModules.map((lesson, index) => {
          const isExpanded = expandedLesson === lesson.id;
          const catColor = categoryColors[lesson.category] || teal;

          return (
            <Animated.View
              key={lesson.id}
              entering={entrance(300 + index * 50)}
            >
              <Pressable
                onPress={() => {
                  setExpandedLesson(isExpanded ? null : lesson.id);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: isExpanded
                      ? catColor.text
                      : theme.borderSubtle,
                    marginBottom: Spacing.sm,
                  },
                ]}
                testID={`button-lesson-${lesson.id}`}
              >
                <View style={styles.educationHeader}>
                  <View
                    style={[
                      styles.educationIcon,
                      { backgroundColor: catColor.bg },
                    ]}
                  >
                    <AppIcon
                      name={lesson.icon}
                      size={20}
                      color={catColor.text}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="small" style={{ fontWeight: "700" }}>
                      {lesson.title}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {lesson.subtitle}
                    </ThemedText>
                  </View>
                  <AppIcon
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={theme.textMuted}
                  />
                </View>
                {isExpanded ? (
                  <View style={styles.educationContent}>
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary, lineHeight: 22 }}
                    >
                      {lesson.content}
                    </ThemedText>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: catColor.bg,
                          alignSelf: "flex-start",
                          marginTop: Spacing.sm,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          {
                            fontSize: 11,
                            fontWeight: "600",
                            color: catColor.text,
                            fontFamily: Fonts?.sans,
                            textTransform: "capitalize",
                          },
                        ]}
                      >
                        {lesson.category}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </Pressable>
            </Animated.View>
          );
        })}

        {filteredModules.length === 0 ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
                alignItems: "center",
                paddingVertical: Spacing["2xl"],
              },
            ]}
          >
            <AppIcon name="search" size={28} color={theme.textMuted} />
            <ThemedText
              type="small"
              style={{ color: theme.textMuted, marginTop: Spacing.md }}
            >
              {"No modules match your search"}
            </ThemedText>
          </View>
        ) : null}
      </>
    );
  };

  const renderSettingsTab = () => (
    <>
      <Animated.View entering={entrance(100)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {"Profile"}
        </ThemedText>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <ThemedText
            type="small"
            style={{ fontWeight: "600", marginBottom: Spacing.sm }}
          >
            {"Madhab"}
          </ThemedText>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }}
          >
            {(
              Object.entries(MADHAB_RULES) as [
                Madhab,
                (typeof MADHAB_RULES)[Madhab],
              ][]
            ).map(([key, rules]) => {
              const isSelected =
                settings.madhabConfirmed && settings.madhab === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    updateSettings({ madhab: key, madhabConfirmed: true });
                    showToast(`${rules.name} reference selected`);
                  }}
                  style={[
                    styles.symptomChip,
                    {
                      borderColor: isSelected
                        ? emerald.text
                        : theme.borderSubtle,
                    },
                    isSelected ? { backgroundColor: emerald.bg } : {},
                  ]}
                  testID={`button-settings-madhab-${key}`}
                >
                  <Text
                    style={[
                      styles.symptomChipText,
                      {
                        color: isSelected ? emerald.text : theme.textSecondary,
                        fontFamily: Fonts?.sansSemiBold,
                      },
                    ]}
                  >
                    {rules.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {settings.madhabConfirmed ? (
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginTop: Spacing.xs }}
            >
              {`${MADHAB_RULES[settings.madhab].name}: Period ${MADHAB_RULES[settings.madhab].minHaidh}-${MADHAB_RULES[settings.madhab].maxHaidh} days, Min purity ${MADHAB_RULES[settings.madhab].minTuhr} days, Max nifas ${MADHAB_RULES[settings.madhab].maxNifas} days`}
            </ThemedText>
          ) : (
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginTop: Spacing.xs }}
            >
              {
                "No school selected. NurAI will not apply fiqh duration ranges until you choose one."
              }
            </ThemedText>
          )}

          <ThemedText
            type="small"
            style={{
              fontWeight: "600",
              marginTop: Spacing.lg,
              marginBottom: Spacing.sm,
            }}
          >
            {"Life Stage"}
          </ThemedText>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }}
          >
            {LIFE_STAGES.map((ls) => {
              const isSelected = settings.lifeStage === ls.key;
              return (
                <Pressable
                  key={ls.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    updateSettings({ lifeStage: ls.key });
                  }}
                  style={[
                    styles.symptomChip,
                    {
                      borderColor: isSelected
                        ? emerald.text
                        : theme.borderSubtle,
                    },
                    isSelected ? { backgroundColor: emerald.bg } : {},
                  ]}
                  testID={`button-life-stage-${ls.key}`}
                >
                  <Text
                    style={[
                      styles.symptomChipText,
                      {
                        color: isSelected ? emerald.text : theme.textSecondary,
                        fontFamily: Fonts?.sans,
                      },
                    ]}
                  >
                    {ls.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: Spacing.lg }}>
            <View
              style={[
                styles.settingInfoRow,
                { borderLeftColor: theme.primaryBorder },
              ]}
            >
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {"Typical Cycle Length"}
              </ThemedText>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                {settings.typicalCycleLength}
                {settings.typicalCycleLength === 1 ? " day" : " days"}
              </ThemedText>
            </View>
            <View
              style={[
                styles.settingInfoRow,
                { borderLeftColor: theme.primaryBorder },
              ]}
            >
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {"Typical Period Length"}
              </ThemedText>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                {settings.typicalPeriodLength}
                {settings.typicalPeriodLength === 1 ? " day" : " days"}
              </ThemedText>
            </View>
            {avgCycleLength > 0 ? (
              <View
                style={[
                  styles.settingInfoRow,
                  { borderLeftColor: theme.primaryBorder },
                ]}
              >
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {"Avg Cycle (tracked)"}
                </ThemedText>
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  {avgCycleLength}
                  {avgCycleLength === 1 ? " day" : " days"}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={entrance(300)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {"Privacy"}
        </ThemedText>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                {"Face ID / Passcode Lock"}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, marginTop: 2 }}
              >
                {"Use NurAI's app lock to protect the whole app"}
              </ThemedText>
            </View>
            <Switch
              value={settings.lockEnabled}
              onValueChange={async (v) => {
                await updateSettings({ lockEnabled: v });
                await syncedSetItem("app_lock_enabled", v ? "true" : "false");
              }}
              trackColor={{ false: theme.switchTrack, true: emerald.text }}
              thumbColor="#FFFFFF"
              testID="switch-lock-enabled"
            />
          </View>
          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                {"Hide from Home Screen"}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, marginTop: 2 }}
              >
                {"Remove Women's Health tile from the home page"}
              </ThemedText>
            </View>
            <Switch
              value={settings.hideFromHome}
              onValueChange={(v) => updateSettings({ hideFromHome: v })}
              trackColor={{ false: theme.switchTrack, true: emerald.text }}
              thumbColor="#FFFFFF"
              testID="switch-hide-from-home"
            />
          </View>
        </View>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
              flexDirection: "row",
              marginTop: Spacing.sm,
            },
          ]}
        >
          <AppIcon name="shield" size={16} color={emerald.text} />
          <ThemedText
            type="caption"
            style={{
              color: theme.textSecondary,
              marginLeft: Spacing.sm,
              flex: 1,
            }}
          >
            {
              "Health data is saved locally by default. AI guidance, exports, or signed-in account features may use only the data needed for that action."
            }
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={entrance(400)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {"Data"}
        </ThemedText>
        <Pressable
          onPress={handleExportJSON}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: Spacing.sm,
            },
          ]}
          testID="button-export-json"
        >
          {isPremium ? (
            <AppIcon name="download" size={18} color={emerald.text} />
          ) : (
            <AppIcon name="lock" size={18} color={theme.textSecondary} />
          )}
          <ThemedText type="small" style={{ marginLeft: Spacing.sm, flex: 1 }}>
            {"Private Backup File"}
          </ThemedText>
          {isPremium ? null : (
            <ThemedText
              type="caption"
              style={{ color: theme.primary, fontWeight: "600" }}
            >
              {"(Premium)"}
            </ThemedText>
          )}
        </Pressable>
        <Pressable
          onPress={handleExportCSV}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: Spacing.sm,
            },
          ]}
          testID="button-export-csv"
        >
          {isPremium ? (
            <AppIcon name="download" size={18} color={emerald.text} />
          ) : (
            <AppIcon name="lock" size={18} color={theme.textSecondary} />
          )}
          <ThemedText type="small" style={{ marginLeft: Spacing.sm, flex: 1 }}>
            {"Spreadsheet Export"}
          </ThemedText>
          {isPremium ? null : (
            <ThemedText
              type="caption"
              style={{ color: theme.primary, fontWeight: "600" }}
            >
              {"(Premium)"}
            </ThemedText>
          )}
        </Pressable>

        <ThemedText
          type="h4"
          style={[styles.sectionTitle, { marginTop: Spacing.lg }]}
        >
          {"Import"}
        </ThemedText>
        <Pressable
          onPress={handleImportData}
          disabled={importing}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: Spacing.sm,
              opacity: importing ? 0.6 : 1,
            },
          ]}
          testID="button-import-data"
        >
          <AppIcon name="upload" size={18} color={emerald.text} />
          <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
            <ThemedText type="small" style={{ fontWeight: "600" }}>
              {importing ? "Importing..." : "Import Cycle Data"}
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textMuted, marginTop: 2 }}
            >
              {"From Flo, Clue, or other period tracking apps"}
            </ThemedText>
          </View>
          <AppIcon name="chevron-right" size={16} color={theme.textMuted} />
        </Pressable>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
              flexDirection: "row",
              marginBottom: Spacing.sm,
            },
          ]}
        >
          <AppIcon name="info" size={14} color={theme.textMuted} />
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, marginLeft: Spacing.sm, flex: 1 }}
          >
            {
              "Choose a supported backup or spreadsheet file from another app. Your existing data will be preserved and new cycles will be added automatically."
            }
          </ThemedText>
        </View>

        {showDeleteConfirm ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surfaceGlass, borderColor: theme.error },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: theme.error,
                fontWeight: "600",
                marginBottom: Spacing.sm,
              }}
            >
              {"Type DELETE to confirm"}
            </ThemedText>
            <TextInput
              style={[
                styles.deleteInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.error,
                  fontFamily: Fonts?.sans,
                },
              ]}
              placeholder="Type DELETE"
              placeholderTextColor={theme.textMuted}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
              testID="input-delete-confirm"
            />
            <View style={{ flexDirection: "row", gap: Spacing.sm }}>
              <Pressable
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                style={[
                  styles.deleteCancelBtn,
                  { borderColor: theme.borderSubtle },
                ]}
                testID="button-delete-cancel"
              >
                <ThemedText type="small">{"Cancel"}</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleDeleteAll}
                style={[
                  styles.deleteConfirmBtn,
                  {
                    backgroundColor: theme.error,
                    opacity: deleteConfirmText === "DELETE" ? 1 : 0.4,
                  },
                ]}
                testID="button-delete-confirm"
              >
                <Text
                  style={[
                    {
                      color: theme.buttonText,
                      fontSize: 14,
                      fontFamily: Fonts?.sansBold,
                    },
                  ]}
                >
                  {"Delete All"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowDeleteConfirm(true)}
            style={[styles.deleteBtn, { borderColor: theme.error }]}
            testID="button-delete-all"
          >
            <AppIcon name="trash-2" size={18} color={theme.error} />
            <Text
              style={[
                {
                  fontSize: 14,
                  color: theme.error,
                  fontFamily: Fonts?.sansSemiBold,
                },
              ]}
            >
              {"Delete All Women's Health Data"}
            </Text>
          </Pressable>
        )}
      </Animated.View>

      <Animated.View entering={entrance(500)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {"Qada Management"}
        </ThemedText>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: Spacing.sm,
              marginBottom: Spacing.md,
            }}
          >
            <AppIcon name="calendar" size={18} color={emerald.text} />
            <ThemedText type="small" style={{ fontWeight: "600" }}>
              {"Make-up Fasts"}
            </ThemedText>
          </View>

          {qadaPlan.totalRequired > 0 ? (
            <>
              <View
                style={[
                  styles.settingInfoRow,
                  { borderLeftColor: theme.primaryBorder },
                ]}
              >
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {"Total Required"}
                </ThemedText>
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  {qadaPlan.totalRequired}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.settingInfoRow,
                  { borderLeftColor: theme.primaryBorder },
                ]}
              >
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {"Completed"}
                </ThemedText>
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  {qadaPlan.completedCount}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.settingInfoRow,
                  { borderLeftColor: theme.primaryBorder },
                ]}
              >
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {"Remaining"}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{
                    fontWeight: "600",
                    color: remainingQada > 0 ? rose.text : emerald.text,
                  }}
                >
                  {remainingQada}
                </ThemedText>
              </View>
            </>
          ) : (
            <>
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary, marginBottom: Spacing.md }}
              >
                {"How many fasts do you need to make up?"}
              </ThemedText>
              <TextInput
                style={[
                  styles.wizardInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.borderSubtle,
                    fontFamily: Fonts?.sansBold,
                  },
                ]}
                placeholder="0"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                value={wizardTotal}
                onChangeText={setWizardTotal}
                testID="input-qada-total"
              />

              <Pressable
                onPress={() => setShowBreakdown(!showBreakdown)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: Spacing.xs,
                  marginTop: Spacing.lg,
                }}
                testID="button-toggle-breakdown"
              >
                <ThemedText type="small" style={{ color: emerald.text }}>
                  {showBreakdown ? "Hide breakdown" : "Optional: Add breakdown"}
                </ThemedText>
                <AppIcon
                  name={showBreakdown ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={emerald.text}
                />
              </Pressable>

              {showBreakdown ? (
                <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
                  {BREAKDOWN_KEYS.map((key) => (
                    <View
                      key={key}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: Spacing.md,
                      }}
                    >
                      <ThemedText
                        type="small"
                        style={{ flex: 1, textTransform: "capitalize" }}
                      >
                        {key}
                      </ThemedText>
                      <TextInput
                        style={[
                          styles.breakdownInput,
                          {
                            backgroundColor: theme.backgroundSecondary,
                            color: theme.text,
                            borderColor: theme.borderSubtle,
                            fontFamily: Fonts?.sans,
                          },
                        ]}
                        placeholder="0"
                        placeholderTextColor={theme.textMuted}
                        keyboardType="number-pad"
                        value={breakdownValues[key]}
                        onChangeText={(v) =>
                          setBreakdownValues((prev) => ({ ...prev, [key]: v }))
                        }
                        testID={`input-breakdown-${key}`}
                      />
                    </View>
                  ))}
                </View>
              ) : null}

              <Pressable
                onPress={handleSaveQadaPlan}
                style={[
                  styles.actionBtnGradient,
                  {
                    backgroundColor: theme.primary,
                    marginTop: Spacing.lg,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save make-up fast plan"
                testID="button-save-qada-plan"
              >
                <AppIcon
                  name="check"
                  size={20}
                  color={theme.primaryForeground}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    {
                      color: theme.primaryForeground,
                      fontFamily: Fonts?.sansBold,
                    },
                  ]}
                >
                  {"Save Plan"}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <Pressable
          onPress={() => {
            setShowFidyaCalc(!showFidyaCalc);
            Haptics.selectionAsync();
          }}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
              marginTop: Spacing.sm,
            },
          ]}
          testID="button-fidya-calculator"
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: Spacing.sm,
              }}
            >
              <AppIcon name="dollar-sign" size={18} color={amber.text} />
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                {"Fidya / Kaffarah Calculator"}
              </ThemedText>
            </View>
            <AppIcon
              name={showFidyaCalc ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.textMuted}
            />
          </View>

          {showFidyaCalc ? (
            <View style={{ marginTop: Spacing.md }}>
              <ThemedText
                type="caption"
                style={{
                  color: theme.textSecondary,
                  lineHeight: 18,
                  marginBottom: Spacing.md,
                }}
              >
                {
                  "Fidya is paid when someone is permanently unable to fast (elderly, chronic illness). Kaffarah is for deliberately breaking a fast without a valid excuse. Fidya = cost of one meal x missed fasts."
                }
              </ThemedText>

              <ThemedText
                type="small"
                style={{ fontWeight: "600", marginBottom: Spacing.sm }}
              >
                {"Local meal cost"}
              </ThemedText>
              <TextInput
                style={[
                  styles.breakdownInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.borderSubtle,
                    fontFamily: Fonts?.sans,
                    width: 120,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                value={fidyaMealCost}
                onChangeText={setFidyaMealCost}
                testID="input-fidya-meal-cost"
              />

              {parseFloat(fidyaMealCost) > 0 ? (
                <View
                  style={[
                    styles.salahInfoBox,
                    { backgroundColor: amber.bg, marginTop: Spacing.md },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: amber.text, fontWeight: "600" }}
                  >
                    {"Fidya total: "}
                    {(parseFloat(fidyaMealCost) * remainingQada).toFixed(2)}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: amber.text, marginTop: Spacing.xs }}
                  >
                    {fidyaMealCost}
                    {" x "}
                    {remainingQada}
                    {" missed fasts"}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </Animated.View>

      <Animated.View entering={entrance(600)}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
              flexDirection: "row",
              marginTop: Spacing.lg,
            },
          ]}
        >
          <AppIcon name="info" size={16} color={theme.textMuted} />
          <ThemedText
            type="caption"
            style={{ color: theme.textMuted, marginLeft: Spacing.sm, flex: 1 }}
          >
            {
              "This feature is for personal tracking purposes only. It is not a medical device and should not replace professional medical advice."
            }
          </ThemedText>
        </View>
      </Animated.View>
    </>
  );

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "Overview":
        return renderHomeTab();
      case "Track":
        return renderTrackTab();
      case "Calendar":
        return renderCalendarTab();
      case "Learn":
        return renderLearnTab();
      case "Settings":
        return renderSettingsTab();
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Aurora />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={handleBack}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={4}
          testID="button-back"
        >
          <NuraiGlass
            pointerEvents="none"
            radius={22}
            tint={theme.primarySubtle}
            style={StyleSheet.absoluteFillObject}
          />
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <ThemedText
            type="caption"
            style={[styles.headerEyebrow, { color: theme.primary }]}
          >
            PRIVATE WELLBEING
          </ThemedText>
          <ThemedText type="h3" accessibilityRole="header">
            {"Women's Health"}
          </ThemedText>
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={{ color: theme.textMuted }}
          >
            Cycle care with worship-aware guidance
          </ThemedText>
        </View>
        <Pressable
          onPress={() => navigation.navigate("WomensHealthSettings" as never)}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Women's Health privacy and preferences"
          hitSlop={4}
          testID="button-settings-header"
        >
          <NuraiGlass
            pointerEvents="none"
            radius={22}
            tint={theme.primarySubtle}
            style={StyleSheet.absoluteFillObject}
          />
          <AppIcon name="settings" size={22} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom:
            insets.bottom + WOMENS_HEALTH_TAB_BAR_HEIGHT + Spacing["2xl"],
        }}
      >
        {renderActiveTabContent()}
      </ScrollView>

      <View
        style={[
          styles.bottomTabBar,
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.xs,
          },
        ]}
      >
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={88}
            tint="dark"
            pointerEvents="none"
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: theme.surfaceGlassStrong },
            ]}
          />
        )}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: theme.primaryBorder,
          }}
        />
        {TAB_CONFIG.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                setActiveTab(tab.key);
                Haptics.selectionAsync();
              }}
              style={({ pressed }) => [
                styles.bottomTab,
                pressed && { opacity: 0.72 },
              ]}
              accessible
              accessibilityRole="tab"
              accessibilityLabel={`${tab.label} women's health tab`}
              accessibilityState={{ selected: isActive }}
              accessibilityActions={[
                { name: "activate", label: `Show ${tab.label} tab` },
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "activate") {
                  setActiveTab(tab.key);
                  Haptics.selectionAsync();
                }
              }}
              testID={`button-tab-${tab.key.toLowerCase()}`}
            >
              {isActive ? (
                <NuraiGlass
                  pointerEvents="none"
                  radius={18}
                  tint={theme.primaryMuted}
                  style={styles.bottomTabLens}
                />
              ) : null}
              <AppIcon
                name={tab.icon}
                size={22}
                color={isActive ? theme.primary : theme.textMuted}
              />
              <Text
                style={[
                  styles.bottomTabLabel,
                  {
                    color: isActive ? theme.primary : theme.textMuted,
                    fontFamily: isActive ? Fonts?.sansSemiBold : Fonts?.sans,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {toastMessage ? (
        <View style={styles.toastContainer}>
          <NuraiGlass
            radius={18}
            tint={theme.primaryMuted}
            style={styles.toast}
          >
            <AppIcon name="check-circle" size={18} color={theme.primary} />
            <Text style={[styles.toastText, { color: theme.text }]}>
              {toastMessage}
            </Text>
          </NuraiGlass>
        </View>
      ) : null}

      {alertMessage ? (
        <View style={styles.alertOverlay}>
          <View
            style={[
              styles.alertCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : theme.borderSubtle,
              },
            ]}
          >
            <AppIcon
              name="info"
              size={24}
              color={theme.primary}
              style={{ marginBottom: Spacing.md }}
            />
            <ThemedText
              type="small"
              style={{
                textAlign: "center",
                lineHeight: 20,
                marginBottom: Spacing.lg,
              }}
            >
              {alertMessage}
            </ThemedText>
            {alertActions.length > 0 ? (
              <View style={{ gap: Spacing.sm, width: "100%" }}>
                {alertActions.map((action, i) => (
                  <Pressable
                    key={i}
                    onPress={action.onPress}
                    style={[
                      styles.alertDismissBtn,
                      action.variant === "primary"
                        ? { backgroundColor: theme.primary }
                        : action.variant === "destructive"
                          ? { backgroundColor: theme.error }
                          : {
                              backgroundColor: theme.surfaceElevated,
                            },
                    ]}
                    testID={`button-alert-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Text
                      style={{
                        color:
                          action.variant === "secondary"
                            ? theme.textSecondary
                            : theme.buttonText,
                        fontWeight: "600",
                        fontFamily: Fonts?.sansBold,
                      }}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Pressable
                onPress={dismissAlert}
                style={[
                  styles.alertDismissBtn,
                  { backgroundColor: theme.primary },
                ]}
                testID="button-dismiss-alert"
              >
                <Text
                  style={{
                    color: theme.buttonText,
                    fontWeight: "600",
                    fontFamily: Fonts?.sansBold,
                  }}
                >
                  {"Understood"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}

      <AIResponseModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        state={aiModalState}
        data={aiModalData}
        onRetry={aiRetryFn}
        onFollowUp={handleAskFiqh}
        errorMessage={aiModalError}
        featureLabel="Women's Health Guidance"
        requiredTier="premium"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerEyebrow: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "800",
    letterSpacing: 1.25,
    marginBottom: 1,
  },
  cycleHeroWrap: {
    marginBottom: Spacing.md,
  },
  cycleHero: {
    overflow: "hidden",
  },
  cycleHeroContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  compactRing: {
    width: 132,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ringHalo: {
    position: "absolute",
    borderRadius: BorderRadius.full,
    opacity: 0.08,
  },
  ringInner: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  cycleHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroEyebrow: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "800",
    letterSpacing: 1.15,
  },
  cycleHeroTitle: {
    marginTop: 2,
  },
  cycleHeroBody: {
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  privateBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  quickActionBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  quickActionLabel: {
    textAlign: "center",
    fontWeight: "700",
  },
  privateCareCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    overflow: "hidden",
  },
  privateCareHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  privateCareIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  insightIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  privateCareGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  privateCareMetric: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    padding: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.045)",
    gap: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  qadaSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    marginTop: Spacing.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  confidenceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start" as const,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  flowRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  flowPill: {
    flex: 1,
    minWidth: 70,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
  },
  flowPillText: {
    fontSize: 13,
  },
  colorDot: {
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    minWidth: 56,
  },
  colorDotInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  symptomsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  symptomChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  symptomChipText: {
    fontSize: 13,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  moodOption: {
    width: 84,
    height: 76,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  moodOptionLabel: {
    fontSize: 11,
  },
  moodIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  energyRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  energyDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  energyDotText: {
    fontSize: 16,
  },
  notesInput: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    minHeight: 60,
    textAlignVertical: "top",
    fontSize: 14,
  },
  salahInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  scholarNote: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  actionBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  calendarModeRail: {
    flexDirection: "row",
    gap: Spacing.xs,
    padding: 4,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  calModePill: {
    flex: 1,
    minHeight: 48,
    paddingVertical: Spacing.sm,
    borderRadius: 15,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarModeLens: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  calendarDayLabels: {
    flexDirection: "row",
    marginBottom: Spacing.xs,
  },
  madhabOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  historyCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: Spacing.xs,
  },
  educationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  educationIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  educationContent: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.15)",
  },
  settingInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.12)",
    borderLeftWidth: 2,
    borderLeftColor: "transparent",
    paddingLeft: Spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.12)",
  },
  wizardInput: {
    width: 120,
    height: 64,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 28,
  },
  breakdownInput: {
    width: 60,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 16,
  },
  deleteBtn: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  deleteInput: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  deleteCancelBtn: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: "center",
  },
  deleteConfirmBtn: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: "center",
  },
  bottomTabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    borderTopWidth: 0,
    minHeight: WOMENS_HEALTH_TAB_BAR_HEIGHT,
    paddingTop: 6,
    paddingHorizontal: 8,
    overflow: "hidden",
  },
  bottomTab: {
    flex: 1,
    minHeight: 54,
    marginHorizontal: 2,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  bottomTabLens: {
    position: "absolute",
    top: 2,
    bottom: 2,
    left: 2,
    right: 2,
  },
  bottomTabLabel: {
    fontSize: 11,
  },
  alertOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing["2xl"],
  },
  alertCard: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    alignItems: "center" as const,
    width: "100%" as const,
    maxWidth: 340,
  },
  alertDismissBtn: {
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  emptyCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  disclaimerCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    flexDirection: "row",
    marginTop: Spacing.lg,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  toastContainer: {
    position: "absolute",
    bottom: 100,
    left: Spacing.xl,
    right: Spacing.xl,
    alignItems: "center",
    zIndex: 999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  journalPromptCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  journalTitleInput: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    marginBottom: Spacing.sm,
  },
  journalContentInput: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    minHeight: 130,
    textAlignVertical: "top",
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  journalEntryCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  journalEntryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  journalTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  journalTagBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  journalPhaseBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
  },
  fiqhQuestionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  fiqhCustomInput: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 14,
  },
  fiqhSendBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
});
