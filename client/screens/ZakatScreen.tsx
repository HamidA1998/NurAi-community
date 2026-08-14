import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { syncedSetItem } from "@/lib/progress-sync";
import {
  FinanceIconSvg,
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

interface Field {
  key: string;
  label: string;
  icon: AppIconName;
}

interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  nisab: number;
}

const FIELDS: Field[] = [
  { key: "cash", label: "Cash & Bank Savings", icon: "dollar-sign" },
  { key: "gold", label: "Gold Value", icon: "award" },
  { key: "silver", label: "Silver Value", icon: "circle" },
  { key: "stocks", label: "Stocks & Investments", icon: "trending-up" },
  { key: "business", label: "Business Assets", icon: "briefcase" },
  { key: "debts", label: "Debts Owed to You", icon: "file-text" },
];

const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", name: "US Dollar", symbol: "$", nisab: 5950 },
  { code: "GBP", name: "British Pound", symbol: "\u00A3", nisab: 4700 },
  { code: "EUR", name: "Euro", symbol: "\u20AC", nisab: 5450 },
  { code: "SAR", name: "Saudi Riyal", symbol: "\uFDFC", nisab: 22300 },
  { code: "AED", name: "UAE Dirham", symbol: "\u062F.\u0625", nisab: 21850 },
  { code: "PKR", name: "Pakistani Rupee", symbol: "\u20A8", nisab: 1660000 },
  { code: "INR", name: "Indian Rupee", symbol: "\u20B9", nisab: 497000 },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "\u09F3", nisab: 710000 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", nisab: 28200 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", nisab: 94000000 },
  { code: "TRY", name: "Turkish Lira", symbol: "\u20BA", nisab: 215000 },
  { code: "EGP", name: "Egyptian Pound", symbol: "E\u00A3", nisab: 291000 },
  { code: "QAR", name: "Qatari Riyal", symbol: "\u0631.\u0642", nisab: 21650 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "\u062F.\u0643", nisab: 1830 },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BD", nisab: 2240 },
  { code: "OMR", name: "Omani Rial", symbol: "\u0631.\u0639", nisab: 2290 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", nisab: 8150 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", nisab: 9250 },
  { code: "NGN", name: "Nigerian Naira", symbol: "\u20A6", nisab: 9250000 },
  { code: "ZAR", name: "South African Rand", symbol: "R", nisab: 108000 },
];

const STORAGE_KEY = "zakat_currency";

export default function ZakatScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [values, setValues] = useState<Record<string, string>>({});
  const [liabilities, setLiabilities] = useState("");
  const [currency, setCurrency] = useState<CurrencyInfo>(CURRENCIES[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        const found = CURRENCIES.find((c) => c.code === stored);
        if (found) setCurrency(found);
      }
    });
  }, []);

  const selectCurrency = useCallback((c: CurrencyInfo) => {
    setCurrency(c);
    syncedSetItem(STORAGE_KEY, c.code);
    setShowPicker(false);
    setSearchQuery("");
  }, []);

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) return CURRENCIES;
    const q = searchQuery.toLowerCase();
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.includes(q),
    );
  }, [searchQuery]);

  const updateField = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const result = useMemo(() => {
    let totalAssets = 0;
    let populatedAssetCount = 0;
    for (const f of FIELDS) {
      const fieldValue = parseFloat(values[f.key] || "0") || 0;
      if (fieldValue > 0) populatedAssetCount += 1;
      totalAssets += fieldValue;
    }
    const totalLiabilities = parseFloat(liabilities || "0") || 0;
    const netWealth = totalAssets - totalLiabilities;
    const zakatDue = netWealth >= currency.nisab ? netWealth * 0.025 : 0;
    const nisabGap = Math.max(currency.nisab - netWealth, 0);
    return {
      totalAssets,
      totalLiabilities,
      netWealth,
      zakatDue,
      eligible: netWealth >= currency.nisab,
      nisabGap,
      populatedAssetCount,
    };
  }, [values, liabilities, currency]);

  const handleReset = () => {
    setValues({});
    setLiabilities("");
  };

  const formatAmount = (amount: number) => {
    return `${currency.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h4" accessibilityRole="header">
          Zakat Calculator
        </ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && { opacity: 0.6 },
          ]}
          onPress={handleReset}
          hitSlop={8}
        >
          <AppIcon name="rotate-ccw" size={20} color={theme.error} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(280)}>
          <View
            style={[
              styles.zakatHeroCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: `${theme.scholar}38`,
              },
            ]}
          >
            <GeometricCardPattern color={theme.scholar} opacity={0.012} />
            <View style={styles.zakatHeroTop}>
              <View
                style={[
                  styles.zakatHeroIcon,
                  { backgroundColor: `${theme.scholar}18` },
                ]}
              >
                <FinanceIconSvg
                  size={25}
                  color={theme.scholar}
                  accentColor={theme.primary}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText type="h3">Zakat clarity</ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, marginTop: 2 }}
                >
                  A calm estimate with the numbers that shaped it.
                </ThemedText>
              </View>
            </View>
            <View style={styles.zakatHeroGrid}>
              <View style={styles.zakatHeroMetric}>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Net wealth
                </ThemedText>
                <ThemedText type="h4" numberOfLines={1}>
                  {formatAmount(result.netWealth)}
                </ThemedText>
              </View>
              <View style={styles.zakatHeroMetric}>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Nisab
                </ThemedText>
                <ThemedText type="h4" numberOfLines={1}>
                  {formatAmount(currency.nisab)}
                </ThemedText>
              </View>
              <View style={styles.zakatHeroMetric}>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Status
                </ThemedText>
                <ThemedText
                  type="h4"
                  style={{
                    color: result.eligible ? theme.primary : theme.scholar,
                  }}
                  numberOfLines={1}
                >
                  {result.eligible ? "Due" : "Below"}
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300)}>
          <Pressable
            style={[
              styles.currencySelector,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
            onPress={() => setShowPicker(true)}
            testID="button-currency-selector"
          >
            <GeometricCardPattern color={theme.primary} opacity={0.012} />
            <View
              style={[
                styles.currencyIcon,
                { backgroundColor: `${theme.primary}20` },
              ]}
            >
              <ThemedText
                style={{
                  fontSize: 18,
                  color: theme.primary,
                  fontWeight: "700",
                }}
              >
                {currency.symbol}
              </ThemedText>
            </View>
            <View style={styles.currencyInfo}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                {currency.code} - {currency.name}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Tap to change currency
              </ThemedText>
            </View>
            <AppIcon
              name="chevron-down"
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
        </Animated.View>

        <View
          style={[
            styles.disclaimerCard,
            {
              backgroundColor: isDark ? "#78350F20" : "#FEF3C7",
              borderColor: isDark ? "#78350F40" : "#F59E0B30",
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <AppIcon
            name="alert-circle"
            size={14}
            color={isDark ? "#FBBF24" : "#B45309"}
          />
          <ThemedText
            type="caption"
            style={{ color: isDark ? "#FDE68A" : "#92400E", flex: 1 }}
          >
            This calculator provides estimates only. Zakat obligations may vary
            based on your madhab and circumstances. Please consult a qualified
            Islamic scholar for a definitive ruling.
          </ThemedText>
        </View>

        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          style={[
            styles.nisabCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <View
            style={[
              styles.nisabIcon,
              { backgroundColor: `${theme.primary}20` },
            ]}
          >
            <FinanceIconSvg size={22} color={theme.primary} />
          </View>
          <View style={styles.nisabInfo}>
            <ThemedText type="small" style={{ fontWeight: "600" }}>
              Nisab Threshold (Gold)
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Approx. {currency.symbol}
              {currency.nisab.toLocaleString()} {currency.code} (85g of gold)
            </ThemedText>
          </View>
        </Animated.View>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Assets
        </ThemedText>
        {FIELDS.map((field, index) => (
          <Animated.View
            key={field.key}
            entering={FadeInDown.delay(100 + index * 40).duration(300)}
          >
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <View
                style={[
                  styles.inputIcon,
                  { backgroundColor: `${theme.primary}15` },
                ]}
              >
                <AppIcon name={field.icon} size={18} color={theme.primary} />
              </View>
              <View style={styles.inputContent}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {field.label}
                </ThemedText>
                <View style={styles.inputWithSymbol}>
                  <ThemedText style={{ color: theme.textMuted, fontSize: 16 }}>
                    {currency.symbol}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      { color: theme.text, borderColor: theme.borderSubtle },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={values[field.key] || ""}
                    onChangeText={(val) => updateField(field.key, val)}
                    testID={`input-${field.key}`}
                  />
                </View>
              </View>
            </View>
          </Animated.View>
        ))}

        <ThemedText type="h4" style={styles.sectionTitle}>
          Liabilities
        </ThemedText>
        <Animated.View entering={FadeInDown.delay(350).duration(300)}>
          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <View
              style={[
                styles.inputIcon,
                { backgroundColor: `${theme.error}15` },
              ]}
            >
              <AppIcon name="minus-circle" size={18} color={theme.error} />
            </View>
            <View style={styles.inputContent}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Debts & Liabilities
              </ThemedText>
              <View style={styles.inputWithSymbol}>
                <ThemedText style={{ color: theme.textMuted, fontSize: 16 }}>
                  {currency.symbol}
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, borderColor: theme.borderSubtle },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={liabilities}
                  onChangeText={setLiabilities}
                  testID="input-liabilities"
                />
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          {result.eligible ? (
            <LinearGradient
              colors={[theme.primary, "#0D9488"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.resultCard}
            >
              <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
              <View style={styles.resultRow}>
                <ThemedText
                  type="small"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  Total Assets
                </ThemedText>
                <ThemedText
                  style={{ color: theme.buttonText, fontWeight: "500" }}
                >
                  {formatAmount(result.totalAssets)}
                </ThemedText>
              </View>
              <View style={styles.resultRow}>
                <ThemedText
                  type="small"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  Liabilities
                </ThemedText>
                <ThemedText
                  style={{ color: theme.buttonText, fontWeight: "500" }}
                >
                  -{formatAmount(result.totalLiabilities)}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.resultDivider,
                  { backgroundColor: "rgba(255,255,255,0.2)" },
                ]}
              />
              <View style={styles.resultRow}>
                <ThemedText
                  type="small"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  Net Wealth
                </ThemedText>
                <ThemedText
                  style={{ color: theme.buttonText, fontWeight: "600" }}
                >
                  {formatAmount(result.netWealth)}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.resultDivider,
                  { backgroundColor: "rgba(255,255,255,0.2)" },
                ]}
              />
              <View style={styles.resultRow}>
                <ThemedText type="h4" style={{ color: theme.buttonText }}>
                  Zakat Due (2.5%)
                </ThemedText>
                <ThemedText type="h2" style={{ color: theme.buttonText }}>
                  {formatAmount(result.zakatDue)}
                </ThemedText>
              </View>
              <GoldDivider color="rgba(255,255,255,0.42)" />
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.resultCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                  borderWidth: 1,
                },
              ]}
            >
              <GeometricCardPattern color={theme.scholar} opacity={0.012} />
              <View style={styles.resultRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Total Assets
                </ThemedText>
                <ThemedText style={{ color: theme.text, fontWeight: "500" }}>
                  {formatAmount(result.totalAssets)}
                </ThemedText>
              </View>
              <View style={styles.resultRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Liabilities
                </ThemedText>
                <ThemedText style={{ color: theme.text, fontWeight: "500" }}>
                  -{formatAmount(result.totalLiabilities)}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.resultDivider,
                  { backgroundColor: theme.borderSubtle },
                ]}
              />
              <View style={styles.resultRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Net Wealth
                </ThemedText>
                <ThemedText style={{ color: theme.text, fontWeight: "600" }}>
                  {formatAmount(result.netWealth)}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.resultDivider,
                  { backgroundColor: theme.borderSubtle },
                ]}
              />
              <View style={styles.resultRow}>
                <ThemedText type="h4">Zakat Due (2.5%)</ThemedText>
                <ThemedText type="h2">
                  {formatAmount(result.zakatDue)}
                </ThemedText>
              </View>
              <ThemedText
                type="caption"
                style={{
                  color: theme.textMuted,
                  textAlign: "center",
                  marginTop: Spacing.sm,
                }}
              >
                Net wealth is below the Nisab threshold. No Zakat is due.
              </ThemedText>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(450).duration(350)}>
          <View
            style={[
              styles.explanationCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <GeometricCardPattern color={theme.primary} opacity={0.012} />
            <View style={styles.explanationHeader}>
              <View
                style={[
                  styles.explanationIcon,
                  { backgroundColor: `${theme.primary}16` },
                ]}
              >
                <AppIcon name="list" size={16} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={{ fontWeight: "700" }}>
                  What shaped this calculation
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, lineHeight: 18 }}
                >
                  Based on {result.populatedAssetCount} asset{" "}
                  {result.populatedAssetCount === 1 ? "entry" : "entries"},
                  liabilities, and the selected nisab threshold.
                </ThemedText>
              </View>
            </View>
            <View style={styles.explanationGrid}>
              <View
                style={[
                  styles.explanationMetric,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Nisab
                </ThemedText>
                <ThemedText type="small" style={{ fontWeight: "700" }}>
                  {formatAmount(currency.nisab)}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.explanationMetric,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Status
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{
                    color: result.eligible ? theme.primary : theme.text,
                    fontWeight: "700",
                  }}
                >
                  {result.eligible ? "Above nisab" : "Below nisab"}
                </ThemedText>
              </View>
            </View>
            {!result.eligible ? (
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, lineHeight: 18 }}
              >
                Net wealth is {formatAmount(result.nisabGap)} below the
                threshold for the selected currency.
              </ThemedText>
            ) : (
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, lineHeight: 18 }}
              >
                Zakat is estimated at 2.5% of net zakatable wealth. Keep this as
                a guide and check personal cases with a qualified scholar.
              </ThemedText>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showPicker}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowPicker(false);
          setSearchQuery("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.backgroundRoot,
                paddingBottom: insets.bottom + Spacing.lg,
              },
            ]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Select Currency</ThemedText>
              <Pressable
                onPress={() => {
                  setShowPicker(false);
                  setSearchQuery("");
                }}
                hitSlop={8}
                testID="button-close-currency"
              >
                <AppIcon name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

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
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search currencies"
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                testID="input-currency-search"
              />
            </View>

            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = item.code === currency.code;
                return (
                  <Pressable
                    style={[
                      styles.currencyRow,
                      {
                        backgroundColor: isSelected
                          ? `${theme.primary}15`
                          : theme.surfaceGlass,
                        borderColor: isSelected
                          ? theme.primary
                          : theme.borderSubtle,
                      },
                    ]}
                    onPress={() => selectCurrency(item)}
                    testID={`button-currency-${item.code}`}
                  >
                    <View
                      style={[
                        styles.currencyRowIcon,
                        { backgroundColor: `${theme.primary}20` },
                      ]}
                    >
                      <ThemedText
                        style={{
                          fontSize: 16,
                          color: theme.primary,
                          fontWeight: "700",
                        }}
                      >
                        {item.symbol}
                      </ThemedText>
                    </View>
                    <View style={styles.currencyRowInfo}>
                      <ThemedText style={{ fontWeight: "600" }}>
                        {item.code}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary }}
                      >
                        {item.name}
                      </ThemedText>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary }}
                      >
                        Nisab: {item.symbol}
                        {item.nisab.toLocaleString()}
                      </ThemedText>
                    </View>
                    {isSelected ? (
                      <View
                        style={[
                          styles.checkCircle,
                          { backgroundColor: theme.primary },
                        ]}
                      >
                        <AppIcon name="check" size={14} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  disclaimerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
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
  scrollContent: { paddingHorizontal: Spacing.lg },
  zakatHeroCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    overflow: "hidden",
  },
  zakatHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  zakatHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  zakatHeroGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  zakatHeroMetric: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    padding: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.045)",
    gap: 2,
  },
  currencySelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    overflow: "hidden",
  },
  currencyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyInfo: { flex: 1, gap: 2 },
  nisabCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    gap: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  nisabIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  nisabInfo: { flex: 1, gap: 2 },
  sectionTitle: { marginBottom: Spacing.md },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  inputIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  inputContent: { flex: 1, gap: 4 },
  inputWithSymbol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  resultCard: {
    padding: Spacing.xl,
    borderRadius: 24,
    marginTop: Spacing.xl,
    gap: Spacing.md,
    overflow: "hidden",
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultDivider: { height: 1 },
  explanationCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.md,
    overflow: "hidden",
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  explanationIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  explanationGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  explanationMetric: {
    flex: 1,
    borderRadius: 16,
    padding: Spacing.md,
    gap: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingHorizontal: Spacing.lg,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.4)",
    alignSelf: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  currencyRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyRowInfo: { flex: 1, gap: 1 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
