import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useNurAI } from "@/context/NurAIContext";
import { Spacing, BorderRadius, CategoryColors } from "@/constants/theme";
import { trackSadaqah } from "@/services/achievementsTracker";
import { recordGardenAction } from "@/services/gardenService";
import { syncedSetItem } from "@/lib/progress-sync";
import {
  FinanceIconSvg,
  GeometricCardPattern,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

type TabKey = "sadaqah" | "investments" | "debt";

interface SadaqahEntry {
  id: string;
  amount: number;
  category: string;
  date: string;
}

interface DebtEntry {
  id: string;
  amount: number;
  lenderName: string;
  dueDate: string;
  payments: number[];
  createdAt: string;
}

const SADAQAH_KEY = "sadaqah_log";
const DEBT_KEY = "islamic_debts";
const GOAL_KEY = "sadaqah_monthly_goal";

const SADAQAH_CATEGORIES = [
  "Food",
  "Education",
  "Masjid",
  "Orphans",
  "Medical",
  "Emergency",
  "Dawah",
  "Other",
];

const QUICK_SADAQAH_AMOUNTS = [1, 5, 10, 20];

const CATEGORY_COLOR_MAP: Record<string, keyof typeof CategoryColors> = {
  Food: "emerald",
  Education: "blue",
  Masjid: "amber",
  Orphans: "rose",
  Medical: "purple",
  Emergency: "orange",
  Dawah: "teal",
  Other: "indigo",
};

const CATEGORY_ICON_MAP: Record<string, AppIconName> = {
  Food: "coffee",
  Education: "book-open",
  Masjid: "home",
  Orphans: "heart",
  Medical: "activity",
  Emergency: "alert-circle",
  Dawah: "message-circle",
  Other: "gift",
};

const TABS: {
  key: TabKey;
  label: string;
  icon: AppIconName;
}[] = [
  { key: "sadaqah", label: "Sadaqah", icon: "heart" },
  { key: "investments", label: "Investments", icon: "trending-up" },
  { key: "debt", label: "Debt Planner", icon: "file-text" },
];

const INVESTMENT_CARDS = [
  {
    title: "Riba (Interest)",
    icon: "slash" as AppIconName,
    color: "rose" as keyof typeof CategoryColors,
    summary: "What it is and why it is prohibited",
    details:
      "Riba refers to any guaranteed interest or return on a loan or investment. It is strictly prohibited in Islam because it leads to exploitation and inequality. The Quran explicitly forbids riba in multiple verses, and the Prophet (peace be upon him) warned against all forms of interest-based transactions.",
  },
  {
    title: "Gharar (Uncertainty)",
    icon: "alert-triangle" as AppIconName,
    color: "amber" as keyof typeof CategoryColors,
    summary: "Excessive risk and speculation",
    details:
      "Gharar refers to excessive uncertainty or ambiguity in a contract. Transactions where the outcome is unknown or excessively risky are not permissible. This includes speculative trading, gambling-like instruments, and contracts with unclear terms. Some degree of uncertainty is natural, but excessive gharar invalidates a contract.",
  },
  {
    title: "Haram Industries",
    icon: "x-circle" as AppIconName,
    color: "purple" as keyof typeof CategoryColors,
    summary: "Industries Muslims should avoid investing in",
    details:
      "Muslims must avoid investing in companies primarily engaged in alcohol production, gambling, pork products, conventional banking and insurance (interest-based), adult entertainment, weapons manufacturing for aggression, and tobacco. Shariah screening services help identify compliant companies.",
  },
  {
    title: "Sukuk (Islamic Bonds)",
    icon: "layers" as AppIconName,
    color: "blue" as keyof typeof CategoryColors,
    summary: "Islamic bonds explained",
    details:
      "Sukuk are Islamic financial certificates similar to bonds but structured to comply with Shariah law. Instead of paying interest, sukuk represent ownership in a tangible asset or project and generate returns through profit-sharing or rental income. They provide a halal alternative to conventional bonds.",
  },
  {
    title: "Shariah-Compliant Funds",
    icon: "pie-chart" as AppIconName,
    color: "emerald" as keyof typeof CategoryColors,
    summary: "How they work",
    details:
      "These are investment funds that operate according to Islamic principles. A Shariah board of scholars reviews and approves all holdings. Funds screen out non-compliant companies and purify any incidental haram income through charitable donations. They offer diversification while maintaining compliance.",
  },
  {
    title: "Takaful (Islamic Insurance)",
    icon: "shield" as AppIconName,
    color: "teal" as keyof typeof CategoryColors,
    summary: "Cooperative risk-sharing",
    details:
      "Takaful is an Islamic insurance concept based on mutual cooperation. Participants contribute to a shared pool to protect against loss or damage. Unlike conventional insurance, takaful avoids interest, excessive uncertainty, and gambling elements. Surplus funds may be redistributed to participants.",
  },
  {
    title: "Mudarabah",
    icon: "users" as AppIconName,
    color: "indigo" as keyof typeof CategoryColors,
    summary: "Profit-sharing partnership",
    details:
      "Mudarabah is a partnership where one party provides capital (rabb al-mal) and the other provides expertise and management (mudarib). Profits are shared according to a pre-agreed ratio. Losses are borne by the capital provider unless caused by the manager's negligence. This is a key Islamic finance structure.",
  },
  {
    title: "Murabaha",
    icon: "shopping-bag" as AppIconName,
    color: "orange" as keyof typeof CategoryColors,
    summary: "Cost-plus financing",
    details:
      "Murabaha is a sale contract where the seller discloses the cost and adds a known profit margin. It is widely used in Islamic banking for home and vehicle financing. The bank purchases the asset and sells it to the customer at a marked-up price payable in installments. Unlike a loan, it involves an actual sale of goods.",
  },
];

const HALAL_CHECKLIST = [
  "The company does not deal primarily in haram products or services",
  "Interest-based debt is below 33% of total assets",
  "Interest-bearing investments are below 33% of total assets",
  "Revenue from non-compliant activities is below 5%",
  "The business model does not involve excessive uncertainty (gharar)",
  "Products or services provide genuine benefit to society",
  "The company follows ethical business practices",
];

const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

const DEBT_GUIDANCE = [
  {
    icon: "alert-circle" as AppIconName,
    title: "Debt is Serious in Islam",
    text: "Debt deserves care and urgency. The Prophet (peace be upon him) sought refuge from debt, and a hadith warns that a believer's soul is held back by debt until it is paid off. See Sahih al-Bukhari 832 and Jami at-Tirmidhi 1078.",
  },
  {
    icon: "arrow-up" as AppIconName,
    title: "Priority of Debt Repayment",
    text: "Pay debts before giving optional charity. Obligatory duties like Zakat still apply, but voluntary sadaqah should wait until debts are settled.",
  },
  {
    icon: "clock" as AppIconName,
    title: "Pay the Oldest First",
    text: "Islamic guidance encourages settling the oldest debts first, as they have been owed the longest.",
  },
  {
    icon: "check-circle" as AppIconName,
    title: "Document Your Debts",
    text: "The Quran (2:282) instructs believers to write down debts and have witnesses. Proper documentation protects both parties.",
  },
];

export default function IslamicFinanceScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { getFinanceInsightFn } = useNurAI();

  const [activeTab, setActiveTab] = useState<TabKey>("sadaqah");
  const [showInsight, setShowInsight] = useState(true);

  const [sadaqahAmount, setSadaqahAmount] = useState("");
  const [sadaqahCategory, setSadaqahCategory] = useState("Food");
  const [sadaqahEntries, setSadaqahEntries] = useState<SadaqahEntry[]>([]);
  const [monthlyGoal, setMonthlyGoal] = useState("");
  const [savedGoal, setSavedGoal] = useState(0);

  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>(
    {},
  );
  const [checklist, setChecklist] = useState<Record<number, boolean>>({});

  const [debts, setDebts] = useState<DebtEntry[]>([]);
  const [debtAmount, setDebtAmount] = useState("");
  const [debtLender, setDebtLender] = useState("");
  const [debtDueDate, setDebtDueDate] = useState("");
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>(
    {},
  );

  const loadSadaqah = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(SADAQAH_KEY);
      if (data) setSadaqahEntries(JSON.parse(data));
    } catch {}
  }, []);

  const saveSadaqah = useCallback(async (entries: SadaqahEntry[]) => {
    try {
      await syncedSetItem(SADAQAH_KEY, JSON.stringify(entries));
    } catch {}
  }, []);

  const loadDebts = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(DEBT_KEY);
      if (data) setDebts(JSON.parse(data));
    } catch {}
  }, []);

  const saveDebts = useCallback(async (entries: DebtEntry[]) => {
    try {
      await syncedSetItem(DEBT_KEY, JSON.stringify(entries));
    } catch {}
  }, []);

  const loadGoal = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(GOAL_KEY);
      if (data) setSavedGoal(parseFloat(data) || 0);
    } catch {}
  }, []);

  const saveGoal = useCallback(async (goal: number) => {
    try {
      await syncedSetItem(GOAL_KEY, goal.toString());
      setSavedGoal(goal);
    } catch {}
  }, []);

  useEffect(() => {
    loadSadaqah();
    loadDebts();
    loadGoal();
  }, [loadSadaqah, loadDebts, loadGoal]);

  const addSadaqah = useCallback(() => {
    const amount = parseFloat(sadaqahAmount);
    if (!amount || amount <= 0) return;
    const entry: SadaqahEntry = {
      id: Date.now().toString(),
      amount,
      category: sadaqahCategory,
      date: new Date().toISOString(),
    };
    const updated = [entry, ...sadaqahEntries];
    setSadaqahEntries(updated);
    saveSadaqah(updated);
    setSadaqahAmount("");
    trackSadaqah(updated.length);
    recordGardenAction("charity").catch(() => {});
  }, [sadaqahAmount, sadaqahCategory, sadaqahEntries, saveSadaqah]);

  const deleteSadaqah = useCallback(
    (id: string) => {
      const updated = sadaqahEntries.filter((e) => e.id !== id);
      setSadaqahEntries(updated);
      saveSadaqah(updated);
    },
    [sadaqahEntries, saveSadaqah],
  );

  const addDebt = useCallback(() => {
    const amount = parseFloat(debtAmount);
    if (!amount || amount <= 0 || !debtLender.trim()) return;
    const entry: DebtEntry = {
      id: Date.now().toString(),
      amount,
      lenderName: debtLender.trim(),
      dueDate: debtDueDate.trim() || "Not specified",
      payments: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [...debts, entry].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    setDebts(updated);
    saveDebts(updated);
    setDebtAmount("");
    setDebtLender("");
    setDebtDueDate("");
  }, [debtAmount, debtLender, debtDueDate, debts, saveDebts]);

  const addPayment = useCallback(
    (debtId: string) => {
      const payAmount = parseFloat(paymentAmounts[debtId] || "0");
      if (!payAmount || payAmount <= 0) return;
      const updated = debts.map((d) =>
        d.id === debtId ? { ...d, payments: [...d.payments, payAmount] } : d,
      );
      setDebts(updated);
      saveDebts(updated);
      setPaymentAmounts((prev) => ({ ...prev, [debtId]: "" }));
    },
    [debts, paymentAmounts, saveDebts],
  );

  const deleteDebt = useCallback(
    (id: string) => {
      const updated = debts.filter((d) => d.id !== id);
      setDebts(updated);
      saveDebts(updated);
    },
    [debts, saveDebts],
  );

  const financeInsight = getFinanceInsightFn(
    sadaqahEntries.length,
    sadaqahEntries.reduce((s, e) => s + e.amount, 0),
    debts.length > 0,
  );

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyTotal = sadaqahEntries
    .filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const monthlyEntries = sadaqahEntries.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const allTimeTotal = sadaqahEntries.reduce((sum, e) => sum + e.amount, 0);

  const goalProgress =
    savedGoal > 0 ? Math.min(monthlyTotal / savedGoal, 1) : 0;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemainingInMonth = Math.max(1, daysInMonth - now.getDate() + 1);
  const weeksRemainingInMonth = Math.max(
    1,
    Math.ceil(daysRemainingInMonth / 7),
  );
  const remainingGoal =
    savedGoal > 0 ? Math.max(savedGoal - monthlyTotal, 0) : 0;
  const weeklyPaceAmount =
    savedGoal > 0 ? remainingGoal / weeksRemainingInMonth : 0;
  const averageGift =
    monthlyEntries.length > 0 ? monthlyTotal / monthlyEntries.length : 0;
  const lastGiftDate = sadaqahEntries[0]?.date
    ? new Date(sadaqahEntries[0].date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Not yet";
  const mostUsedCategory = monthlyEntries.reduce<Record<string, number>>(
    (acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + 1;
      return acc;
    },
    {},
  );
  const topCategory =
    Object.entries(mostUsedCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "Choose a cause";
  const sadaqahReflection =
    savedGoal === 0
      ? {
          icon: "target" as AppIconName,
          title: "Set a calm monthly intention",
          body: "Choose a realistic monthly amount, then NurAI will show the weekly pace needed to stay consistent without pressure.",
        }
      : goalProgress >= 1
        ? {
            icon: "check-circle" as AppIconName,
            title: "Monthly intention reached",
            body: "You have reached this month’s sadaqah goal. Keep logging small acts so the habit stays visible and easy to repeat.",
          }
        : monthlyEntries.length === 0
          ? {
              icon: "heart" as AppIconName,
              title: "Start with one small gift",
              body: "One recorded act is enough to restart momentum. Pick a quick amount and attach it to a cause you care about.",
            }
          : {
              icon: "trending-up" as AppIconName,
              title: "You are building a giving rhythm",
              body: `${formatMoney(weeklyPaceAmount)} per week keeps this month on track. Your most used cause is ${topCategory.toLowerCase()}.`,
            };

  const totalDebt = debts.reduce((sum, d) => {
    const paid = d.payments.reduce((s, p) => s + p, 0);
    return sum + Math.max(d.amount - paid, 0);
  }, 0);

  const toggleCard = (index: number) => {
    setExpandedCards((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleCheck = (index: number) => {
    setChecklist((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const getCategoryColor = (category: string) => {
    const colorKey = CATEGORY_COLOR_MAP[category] || "indigo";
    const colors = CategoryColors[colorKey];
    return isDark ? colors.dark : colors;
  };

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const renderSadaqahTab = () => (
    <>
      <Animated.View entering={FadeInDown.duration(300)}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <GeometricCardPattern color={theme.primary} opacity={0.012} />
          <ThemedText type="h4" style={styles.cardTitle}>
            Log Sadaqah
          </ThemedText>
          <View style={styles.inputRow}>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.input,
                  borderColor: theme.inputBorder,
                },
              ]}
            >
              <AppIcon name="dollar-sign" size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder="Amount"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                value={sadaqahAmount}
                onChangeText={setSadaqahAmount}
                testID="input-sadaqah-amount"
              />
            </View>
          </View>
          <View style={styles.quickAmountRow}>
            {QUICK_SADAQAH_AMOUNTS.map((amount) => {
              const isSelected = parseFloat(sadaqahAmount) === amount;
              return (
                <Pressable
                  key={amount}
                  testID={`button-quick-sadaqah-${amount}`}
                  style={[
                    styles.quickAmountChip,
                    {
                      backgroundColor: isSelected
                        ? `${theme.primary}20`
                        : theme.backgroundSecondary,
                      borderColor: isSelected
                        ? theme.primary
                        : theme.borderSubtle,
                    },
                  ]}
                  onPress={() => setSadaqahAmount(String(amount))}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color: isSelected ? theme.primary : theme.textSecondary,
                      fontWeight: "700",
                    }}
                  >
                    {formatMoney(amount)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}
          >
            Category
          </ThemedText>
          <View style={styles.categoryGrid}>
            {SADAQAH_CATEGORIES.map((cat) => {
              const catColor = getCategoryColor(cat);
              const isSelected = sadaqahCategory === cat;
              return (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected
                        ? catColor.bg
                        : theme.backgroundSecondary,
                      borderColor: isSelected
                        ? catColor.text
                        : theme.borderSubtle,
                    },
                  ]}
                  onPress={() => setSadaqahCategory(cat)}
                  testID={`button-category-${cat}`}
                >
                  <AppIcon
                    name={CATEGORY_ICON_MAP[cat]}
                    size={14}
                    color={isSelected ? catColor.text : theme.textMuted}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: isSelected ? catColor.text : theme.textSecondary,
                      fontWeight: isSelected ? "600" : "400",
                    }}
                  >
                    {cat}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={addSadaqah}
            testID="button-add-sadaqah"
          >
            <AppIcon name="plus" size={18} color={theme.primaryForeground} />
            <ThemedText
              type="small"
              style={{ color: theme.primaryForeground, fontWeight: "600" }}
            >
              Add Sadaqah
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(300)}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <ThemedText type="h4" style={styles.cardTitle}>
            Monthly Goal
          </ThemedText>
          <View style={styles.inputRow}>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.input,
                  borderColor: theme.inputBorder,
                  flex: 1,
                },
              ]}
            >
              <AppIcon name="target" size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder="Set monthly goal"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                value={monthlyGoal}
                onChangeText={setMonthlyGoal}
                testID="input-monthly-goal"
              />
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.smallButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => {
                const g = parseFloat(monthlyGoal);
                if (g > 0) {
                  saveGoal(g);
                  setMonthlyGoal("");
                }
              }}
              testID="button-set-goal"
            >
              <AppIcon name="check" size={18} color={theme.primaryForeground} />
            </Pressable>
          </View>
          {savedGoal > 0 ? (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  ${monthlyTotal.toFixed(2)} / ${savedGoal.toFixed(2)}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: theme.primary, fontWeight: "600" }}
                >
                  {(goalProgress * 100).toFixed(0)}%
                </ThemedText>
              </View>
              <View
                style={[
                  styles.progressBarBg,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <LinearGradient
                  colors={[theme.gradientMid, theme.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressBarFill,
                    { width: `${goalProgress * 100}%` as any },
                  ]}
                />
              </View>
              <View style={styles.paceGrid}>
                <View
                  style={[
                    styles.pacePill,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    Left this month
                  </ThemedText>
                  <ThemedText type="small" style={{ fontWeight: "700" }}>
                    {formatMoney(remainingGoal)}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.pacePill,
                    {
                      backgroundColor: `${theme.primary}12`,
                      borderColor: `${theme.primary}55`,
                    },
                  ]}
                >
                  <ThemedText type="caption" style={{ color: theme.primary }}>
                    Weekly pace
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: theme.primary, fontWeight: "700" }}
                  >
                    {formatMoney(weeklyPaceAmount)}
                  </ThemedText>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(300)}>
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <AppIcon name="calendar" size={20} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              This Month
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.primary }}>
              ${monthlyTotal.toFixed(2)}
            </ThemedText>
          </View>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <AppIcon name="award" size={20} color={theme.secondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              All Time
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.secondary }}>
              ${allTimeTotal.toFixed(2)}
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(175).duration(300)}>
        <View
          style={[
            styles.reflectionCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <GeometricCardPattern color={theme.primary} opacity={0.012} />
          <View style={styles.reflectionHeader}>
            <View
              style={[
                styles.reflectionIcon,
                { backgroundColor: `${theme.primary}18` },
              ]}
            >
              <AppIcon
                name={sadaqahReflection.icon}
                size={18}
                color={theme.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="small" style={{ fontWeight: "700" }}>
                {sadaqahReflection.title}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, lineHeight: 19 }}
              >
                {sadaqahReflection.body}
              </ThemedText>
            </View>
          </View>
          <View style={styles.reflectionMetricGrid}>
            <View
              style={[
                styles.reflectionMetric,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Acts logged
              </ThemedText>
              <ThemedText type="small" style={{ fontWeight: "700" }}>
                {monthlyEntries.length}
              </ThemedText>
            </View>
            <View
              style={[
                styles.reflectionMetric,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Average gift
              </ThemedText>
              <ThemedText type="small" style={{ fontWeight: "700" }}>
                {formatMoney(averageGift)}
              </ThemedText>
            </View>
            <View
              style={[
                styles.reflectionMetric,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Last logged
              </ThemedText>
              <ThemedText type="small" style={{ fontWeight: "700" }}>
                {lastGiftDate}
              </ThemedText>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(190).duration(300)}>
        <Pressable
          testID="button-open-zakat-from-finance"
          onPress={() => navigation.navigate("Zakat")}
          style={({ pressed }) => [
            styles.zakatBridgeCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <View
            style={[
              styles.reflectionIcon,
              { backgroundColor: `${theme.secondary}18` },
            ]}
          >
            <FinanceIconSvg size={22} color={theme.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="small" style={{ fontWeight: "700" }}>
              Check Zakat when wealth changes
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, lineHeight: 19 }}
            >
              Estimate nisab, liabilities, and 2.5% due from the dedicated
              calculator.
            </ThemedText>
          </View>
          <AppIcon name="arrow-right" size={18} color={theme.textMuted} />
        </Pressable>
      </Animated.View>

      {sadaqahEntries.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Recent Entries
          </ThemedText>
          {sadaqahEntries.slice(0, 20).map((entry, index) => {
            const catColor = getCategoryColor(entry.category);
            return (
              <View
                key={entry.id}
                style={[
                  styles.entryRow,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                <View
                  style={[styles.entryIcon, { backgroundColor: catColor.bg }]}
                >
                  <AppIcon
                    name={CATEGORY_ICON_MAP[entry.category] || "gift"}
                    size={16}
                    color={catColor.text}
                  />
                </View>
                <View style={styles.entryInfo}>
                  <ThemedText type="small" style={{ fontWeight: "600" }}>
                    {entry.category}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    {formatDate(entry.date)}
                  </ThemedText>
                </View>
                <ThemedText
                  type="small"
                  style={{ fontWeight: "600", color: theme.primary }}
                >
                  ${entry.amount.toFixed(2)}
                </ThemedText>
                <Pressable
                  onPress={() => deleteSadaqah(entry.id)}
                  hitSlop={8}
                  testID={`button-delete-sadaqah-${index}`}
                >
                  <AppIcon name="x" size={16} color={theme.textMuted} />
                </Pressable>
              </View>
            );
          })}
        </Animated.View>
      ) : null}
    </>
  );

  const renderInvestmentsTab = () => (
    <>
      <Animated.View entering={FadeInDown.duration(300)}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <AppIcon name="book-open" size={20} color={theme.primary} />
            <ThemedText type="h4">Islamic Investment Principles</ThemedText>
          </View>
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
          >
            Understanding the foundations of halal investing is essential for
            every Muslim. Learn about key concepts that guide Shariah-compliant
            finance.
          </ThemedText>
        </View>
      </Animated.View>

      {INVESTMENT_CARDS.map((card, index) => {
        const colors = isDark
          ? CategoryColors[card.color].dark
          : CategoryColors[card.color];
        const isExpanded = expandedCards[index] === true;
        return (
          <Animated.View
            key={index}
            entering={FadeInDown.delay(50 + index * 40).duration(300)}
          >
            <Pressable
              style={[
                styles.card,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
              onPress={() => toggleCard(index)}
              testID={`button-investment-card-${index}`}
            >
              <View style={styles.investmentCardHeader}>
                <View
                  style={[
                    styles.investmentIcon,
                    { backgroundColor: colors.bg },
                  ]}
                >
                  <AppIcon name={card.icon} size={18} color={colors.text} />
                </View>
                <View style={styles.investmentCardInfo}>
                  <ThemedText type="small" style={{ fontWeight: "600" }}>
                    {card.title}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    {card.summary}
                  </ThemedText>
                </View>
                <AppIcon
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.textMuted}
                />
              </View>
              {isExpanded ? (
                <ThemedText
                  type="small"
                  style={{
                    color: theme.textSecondary,
                    marginTop: Spacing.md,
                    lineHeight: 22,
                  }}
                >
                  {card.details}
                </ThemedText>
              ) : null}
            </Pressable>
          </Animated.View>
        );
      })}

      <Animated.View entering={FadeInDown.delay(400).duration(300)}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <AppIcon name="check-square" size={20} color={theme.primary} />
            <ThemedText type="h4">Is My Investment Halal?</ThemedText>
          </View>
          <ThemedText
            type="small"
            style={{
              color: theme.textSecondary,
              marginTop: Spacing.sm,
              marginBottom: Spacing.md,
            }}
          >
            Review these criteria to assess whether an investment is
            Shariah-compliant.
          </ThemedText>
          {HALAL_CHECKLIST.map((item, index) => {
            const checked = checklist[index] === true;
            return (
              <Pressable
                key={index}
                style={[
                  styles.checklistItem,
                  {
                    backgroundColor: checked
                      ? `${theme.primary}10`
                      : theme.backgroundSecondary,
                    borderColor: checked ? theme.primary : theme.borderSubtle,
                  },
                ]}
                onPress={() => toggleCheck(index)}
                testID={`button-checklist-${index}`}
              >
                <View
                  style={[
                    styles.checkBox,
                    {
                      backgroundColor: checked ? theme.primary : "transparent",
                      borderColor: checked ? theme.primary : theme.textMuted,
                    },
                  ]}
                >
                  {checked ? (
                    <AppIcon name="check" size={12} color="#FFFFFF" />
                  ) : null}
                </View>
                <ThemedText
                  type="small"
                  style={{
                    flex: 1,
                    color: checked ? theme.text : theme.textSecondary,
                  }}
                >
                  {item}
                </ThemedText>
              </Pressable>
            );
          })}
          {(() => {
            const checkedCount =
              Object.values(checklist).filter(Boolean).length;
            if (checkedCount === 0) return null;
            const verdict =
              checkedCount === 7
                ? {
                    label: "Likely Halal",
                    icon: "check-circle" as AppIconName,
                    bgColor: `${theme.primary}15`,
                    borderColor: theme.primary,
                    iconColor: theme.primary,
                    explanation:
                      "Based on the criteria above, this investment appears to meet Shariah compliance standards. For a definitive ruling, consult a qualified Islamic scholar.",
                  }
                : checkedCount >= 5
                  ? {
                      label: "Possibly Halal - Review Needed",
                      icon: "alert-triangle" as AppIconName,
                      bgColor: "rgba(245,158,11,0.1)",
                      borderColor: "#F59E0B",
                      iconColor: "#F59E0B",
                      explanation:
                        "Most criteria are met, but some areas need review. Consider consulting a Shariah advisor for the unchecked items.",
                    }
                  : checkedCount >= 3
                    ? {
                        label: "Caution - May Not Be Halal",
                        icon: "alert-circle" as AppIconName,
                        bgColor: "rgba(249,115,22,0.1)",
                        borderColor: "#F97316",
                        iconColor: "#F97316",
                        explanation:
                          "Several important criteria are not met. This investment may not be Shariah-compliant. Seek scholarly guidance.",
                      }
                    : {
                        label: "Likely Haram",
                        icon: "x-circle" as AppIconName,
                        bgColor: "rgba(239,68,68,0.1)",
                        borderColor: "#EF4444",
                        iconColor: "#EF4444",
                        explanation:
                          "Most criteria are not met. This investment is unlikely to be Shariah-compliant. Avoid unless a qualified scholar confirms otherwise.",
                      };
            return (
              <View
                style={{
                  borderRadius: 20,
                  padding: Spacing.xl,
                  alignItems: "center" as const,
                  gap: Spacing.md,
                  marginTop: Spacing.lg,
                  backgroundColor: verdict.bgColor,
                  borderWidth: 1.5,
                  borderColor: verdict.borderColor,
                }}
                testID="verdict-card"
              >
                <AppIcon
                  name={verdict.icon}
                  size={48}
                  color={verdict.iconColor}
                />
                <ThemedText
                  type="h3"
                  style={{
                    fontWeight: "700",
                    textAlign: "center",
                    color: verdict.iconColor,
                  }}
                >
                  {verdict.label}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{
                    textAlign: "center",
                    color: theme.textSecondary,
                    lineHeight: 22,
                  }}
                >
                  {verdict.explanation}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, textAlign: "center" }}
                >
                  {checkedCount} of {HALAL_CHECKLIST.length} criteria met
                </ThemedText>
                <Pressable
                  style={({ pressed }) => ({
                    flexDirection: "row" as const,
                    alignItems: "center" as const,
                    gap: Spacing.sm,
                    paddingVertical: Spacing.sm,
                    paddingHorizontal: Spacing.lg,
                    borderRadius: 12,
                    backgroundColor: theme.backgroundSecondary,
                    borderWidth: 1,
                    borderColor: theme.borderSubtle,
                    marginTop: Spacing.xs,
                    opacity: pressed ? 0.7 : 1,
                  })}
                  onPress={() => setChecklist({})}
                  testID="button-reset-checklist"
                >
                  <AppIcon
                    name="refresh-cw"
                    size={16}
                    color={theme.textSecondary}
                  />
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary, fontWeight: "600" }}
                  >
                    Reset Checklist
                  </ThemedText>
                </Pressable>
              </View>
            );
          })()}
        </View>
      </Animated.View>
    </>
  );

  const renderDebtTab = () => (
    <>
      <Animated.View entering={FadeInDown.duration(300)}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <ThemedText type="h4" style={styles.cardTitle}>
            Add Debt
          </ThemedText>
          <View style={styles.debtInputGroup}>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.input,
                  borderColor: theme.inputBorder,
                },
              ]}
            >
              <AppIcon name="user" size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder="Lender name"
                placeholderTextColor={theme.textMuted}
                value={debtLender}
                onChangeText={setDebtLender}
                testID="input-debt-lender"
              />
            </View>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.input,
                  borderColor: theme.inputBorder,
                },
              ]}
            >
              <AppIcon name="dollar-sign" size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder="Amount"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                value={debtAmount}
                onChangeText={setDebtAmount}
                testID="input-debt-amount"
              />
            </View>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.input,
                  borderColor: theme.inputBorder,
                },
              ]}
            >
              <AppIcon name="calendar" size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder="Due date YYYY-MM-DD"
                placeholderTextColor={theme.textMuted}
                value={debtDueDate}
                onChangeText={setDebtDueDate}
                testID="input-debt-due-date"
              />
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={addDebt}
            testID="button-add-debt"
          >
            <AppIcon name="plus" size={18} color={theme.primaryForeground} />
            <ThemedText
              type="small"
              style={{ color: theme.primaryForeground, fontWeight: "600" }}
            >
              Add Debt
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(300)}>
        <LinearGradient
          colors={
            totalDebt > 0
              ? ["#EF4444", "#DC2626"]
              : [theme.gradientMid, theme.gradientEnd]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.totalDebtCard}
        >
          <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
          <AppIcon name="file-text" size={24} color="rgba(255,255,255,0.8)" />
          <View>
            <ThemedText type="small" style={{ color: "rgba(255,255,255,0.7)" }}>
              Total Outstanding Debt
            </ThemedText>
            <ThemedText type="h2" style={{ color: theme.buttonText }}>
              ${totalDebt.toFixed(2)}
            </ThemedText>
          </View>
        </LinearGradient>
      </Animated.View>

      {debts.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(150).duration(300)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Debts (Oldest First)
          </ThemedText>
          {debts.map((debt, index) => {
            const totalPaid = debt.payments.reduce((s, p) => s + p, 0);
            const remaining = Math.max(debt.amount - totalPaid, 0);
            const paidPercent =
              debt.amount > 0 ? Math.min(totalPaid / debt.amount, 1) : 0;
            const isPaidOff = remaining <= 0;
            return (
              <View
                key={debt.id}
                style={[
                  styles.debtCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: isPaidOff ? theme.primary : theme.borderSubtle,
                  },
                ]}
              >
                <View style={styles.debtHeader}>
                  <View style={styles.debtHeaderLeft}>
                    <AppIcon
                      name={isPaidOff ? "check-circle" : "circle"}
                      size={20}
                      color={isPaidOff ? theme.primary : theme.error}
                    />
                    <View>
                      <ThemedText type="small" style={{ fontWeight: "600" }}>
                        {debt.lenderName}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary }}
                      >
                        Due: {debt.dueDate}
                      </ThemedText>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => deleteDebt(debt.id)}
                    hitSlop={8}
                    testID={`button-delete-debt-${index}`}
                  >
                    <AppIcon name="trash-2" size={16} color={theme.textMuted} />
                  </Pressable>
                </View>

                <View style={styles.debtAmounts}>
                  <View>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      Original
                    </ThemedText>
                    <ThemedText type="small" style={{ fontWeight: "600" }}>
                      ${debt.amount.toFixed(2)}
                    </ThemedText>
                  </View>
                  <View>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      Paid
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{ fontWeight: "600", color: theme.primary }}
                    >
                      ${totalPaid.toFixed(2)}
                    </ThemedText>
                  </View>
                  <View>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      Remaining
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{
                        fontWeight: "600",
                        color: isPaidOff ? theme.primary : theme.error,
                      }}
                    >
                      ${remaining.toFixed(2)}
                    </ThemedText>
                  </View>
                </View>

                <View
                  style={[
                    styles.progressBarBg,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${paidPercent * 100}%` as any,
                        backgroundColor: isPaidOff
                          ? theme.primary
                          : theme.warning,
                      },
                    ]}
                  />
                </View>

                {!isPaidOff ? (
                  <View style={styles.paymentRow}>
                    <View
                      style={[
                        styles.inputContainer,
                        {
                          backgroundColor: theme.input,
                          borderColor: theme.inputBorder,
                          flex: 1,
                        },
                      ]}
                    >
                      <AppIcon
                        name="dollar-sign"
                        size={16}
                        color={theme.textMuted}
                      />
                      <TextInput
                        style={[
                          styles.textInput,
                          { color: theme.text, fontSize: 14 },
                        ]}
                        placeholder="Payment amount"
                        placeholderTextColor={theme.textMuted}
                        keyboardType="numeric"
                        value={paymentAmounts[debt.id] || ""}
                        onChangeText={(v) =>
                          setPaymentAmounts((prev) => ({
                            ...prev,
                            [debt.id]: v,
                          }))
                        }
                        testID={`input-payment-${index}`}
                      />
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.smallButton,
                        {
                          backgroundColor: theme.primary,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                      onPress={() => addPayment(debt.id)}
                      testID={`button-pay-${index}`}
                    >
                      <AppIcon
                        name="plus"
                        size={18}
                        color={theme.primaryForeground}
                      />
                    </Pressable>
                  </View>
                ) : null}

                {debt.payments.length > 0 ? (
                  <View style={styles.paymentHistory}>
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.textMuted,
                        marginBottom: Spacing.xs,
                      }}
                    >
                      Payment history:
                    </ThemedText>
                    {debt.payments.map((p, pi) => (
                      <View key={pi} style={styles.paymentHistoryItem}>
                        <AppIcon name="check" size={12} color={theme.primary} />
                        <ThemedText
                          type="caption"
                          style={{ color: theme.textSecondary }}
                        >
                          ${p.toFixed(2)}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(200).duration(300)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Islamic Guidance on Debt
        </ThemedText>
        {DEBT_GUIDANCE.map((item, index) => (
          <View
            key={index}
            style={[
              styles.guidanceCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <GeometricCardPattern color={theme.scholar} opacity={0.012} />
            <View
              style={[
                styles.guidanceIcon,
                { backgroundColor: `${theme.primary}15` },
              ]}
            >
              <AppIcon name={item.icon} size={18} color={theme.primary} />
            </View>
            <View style={styles.guidanceInfo}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                {item.title}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, lineHeight: 18 }}
              >
                {item.text}
              </ThemedText>
            </View>
          </View>
        ))}
      </Animated.View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h4">Islamic Finance</ThemedText>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.financeHeroWrap}>
        <Animated.View
          entering={FadeInDown.duration(280)}
          style={[
            styles.financeHeroCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: `${theme.scholar}34`,
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <View
            style={[
              styles.financeHeroIcon,
              { backgroundColor: `${theme.primary}16` },
            ]}
          >
            <FinanceIconSvg
              size={25}
              color={theme.primary}
              accentColor={theme.scholar}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText type="h3">Halal money habits</ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              Track giving, understand Islamic finance, and keep debt visible.
            </ThemedText>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Zakat")}
            style={({ pressed }) => [
              styles.financeHeroAction,
              { borderColor: theme.primaryBorder },
              pressed ? { opacity: 0.7 } : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open Zakat calculator"
            testID="button-finance-open-zakat"
          >
            <ThemedText
              type="caption"
              style={{ color: theme.primary, fontWeight: "800" }}
            >
              Zakat
            </ThemedText>
            <AppIcon name="chevron-right" size={14} color={theme.primary} />
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.tabButton,
                {
                  backgroundColor: isActive
                    ? theme.primary
                    : theme.backgroundSecondary,
                  borderColor: isActive ? theme.primary : theme.borderSubtle,
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
              testID={`button-tab-${tab.key}`}
            >
              <AppIcon
                name={tab.icon}
                size={16}
                color={isActive ? theme.primaryForeground : theme.textSecondary}
              />
              <ThemedText
                type="caption"
                style={{
                  color: isActive
                    ? theme.primaryForeground
                    : theme.textSecondary,
                  fontWeight: isActive ? "600" : "400",
                }}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={{ paddingHorizontal: Spacing.lg }}>
        {showInsight ? (
          <Animated.View
            entering={FadeInDown.delay(50).duration(300)}
            style={{ marginBottom: Spacing.sm }}
          >
            <LinearGradient
              colors={
                isDark
                  ? [theme.gradientStart, theme.gradientMid]
                  : [theme.gradientLightBg, theme.gradientLightBg2]
              }
              style={styles.nuraiCard}
            >
              <GeometricCardPattern color={theme.primaryText} opacity={0.012} />
              <View style={styles.nuraiHeader}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    flex: 1,
                  }}
                >
                  <View
                    style={[
                      styles.nuraiDot,
                      { backgroundColor: theme.primaryText },
                    ]}
                  />
                  <ThemedText
                    style={[styles.nuraiLabel, { color: theme.primaryText }]}
                  >
                    NurAI
                  </ThemedText>
                </View>
                <Pressable onPress={() => setShowInsight(false)} hitSlop={8}>
                  <AppIcon name="x" size={14} color={theme.primaryText} />
                </Pressable>
              </View>
              <View style={styles.nuraiBody}>
                <AppIcon
                  name={financeInsight.icon as AppIconName}
                  size={18}
                  color={theme.primaryText}
                />
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[styles.nuraiTitle, { color: theme.primaryText }]}
                  >
                    {financeInsight.title}
                  </ThemedText>
                  <ThemedText
                    style={[styles.nuraiText, { color: theme.primaryText }]}
                  >
                    {financeInsight.body}
                  </ThemedText>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === "sadaqah" ? renderSadaqahTab() : null}
        {activeTab === "investments" ? renderInvestmentsTab() : null}
        {activeTab === "debt" ? renderDebtTab() : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  financeHeroWrap: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  financeHeroCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  financeHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  financeHeroAction: {
    minHeight: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  cardTitle: {
    marginBottom: Spacing.md,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
    flex: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickAmountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.md,
  },
  quickAmountChip: {
    minHeight: 38,
    minWidth: 72,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 44,
    borderRadius: BorderRadius.sm,
  },
  smallButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  progressSection: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  paceGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  pacePill: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  reflectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    overflow: "hidden",
  },
  reflectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  reflectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  reflectionMetricGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  reflectionMetric: {
    flex: 1,
    minHeight: 68,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    justifyContent: "center",
    gap: 2,
  },
  zakatBridgeCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  entryInfo: {
    flex: 1,
    gap: 2,
  },
  investmentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  investmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  investmentCardInfo: {
    flex: 1,
    gap: 2,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  debtInputGroup: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  totalDebtCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: 24,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  debtCard: {
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    overflow: "hidden",
  },
  debtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  debtHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  debtAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  paymentRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  paymentHistory: {
    paddingTop: Spacing.xs,
  },
  paymentHistoryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  guidanceCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    alignItems: "flex-start",
    overflow: "hidden",
  },
  guidanceIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  guidanceInfo: {
    flex: 1,
    gap: 4,
  },
  nuraiCard: {
    borderRadius: 20,
    padding: Spacing.md,
    overflow: "hidden",
  },
  nuraiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  nuraiDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  nuraiLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  nuraiBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  nuraiTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  nuraiText: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.9,
  },
});
