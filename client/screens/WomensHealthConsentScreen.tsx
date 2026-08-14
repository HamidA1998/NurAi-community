import React, { useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useWomensHealth } from "@/context/WomensHealthContext";
import { MADHAB_RULES, type Madhab } from "@/modules/womensHealth/types";
import { GeometricCardPattern } from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";
import { Aurora, NuraiGlass } from "@/design-system";

const TOTAL_STEPS = 6;

const MADHAB_OPTIONS: { key: Madhab | "unsure"; label: string }[] = [
  { key: "hanafi", label: "Hanafi" },
  { key: "maliki", label: "Maliki" },
  { key: "shafii", label: "Shafi'i" },
  { key: "hanbali", label: "Hanbali" },
  { key: "jafari", label: "Jafari" },
  { key: "unsure", label: "I'm not sure" },
];

const LIFE_STAGES: {
  key: string;
  label: string;
  icon: AppIconName;
}[] = [
  { key: "regular", label: "Regular cycles", icon: "repeat" },
  { key: "irregular", label: "Irregular cycles", icon: "shuffle" },
  { key: "ttc", label: "Trying to conceive", icon: "heart" },
  { key: "pregnant", label: "Pregnant", icon: "star" },
  { key: "postpartum", label: "Postpartum (Nifas)", icon: "sunrise" },
  { key: "perimenopause", label: "Perimenopause", icon: "sun" },
  { key: "first_period", label: "First period", icon: "zap" },
  {
    key: "recently_practicing",
    label: "Recently started practicing",
    icon: "book-open",
  },
];

const PRIVACY_CARDS: {
  icon: AppIconName;
  title: string;
  description: string;
}[] = [
  {
    icon: "smartphone",
    title: "Stored locally",
    description: "Health entries are saved on this device by default",
  },
  {
    icon: "eye-off",
    title: "Controlled sharing",
    description: "AI guidance only sends the context you choose to ask about",
  },
  {
    icon: "slash",
    title: "No ads",
    description: "No advertising or third-party tracking",
  },
  {
    icon: "lock",
    title: "Device protected",
    description: "Kept inside NurAI's device storage and app protections",
  },
  {
    icon: "settings",
    title: "You control everything",
    description: "Export or delete your data anytime",
  },
];

export default function WomensHealthConsentScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { giveConsent, updateSettings } = useWomensHealth();

  const [step, setStep] = useState(0);
  const [selectedMadhab, setSelectedMadhab] = useState<Madhab | "unsure">(
    "unsure",
  );
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(6);
  const [irregularCycle, setIrregularCycle] = useState(false);
  const [lifeStage, setLifeStage] = useState("regular");
  const [notifications, setNotifications] = useState({
    periodPrediction: true,
    ghuslReminders: true,
    qadaFasting: false,
    dailyMood: false,
  });
  const [agreed, setAgreed] = useState(false);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNext = () => {
    triggerHaptic();
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    triggerHaptic();
    if (step > 0) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleBegin = async () => {
    triggerHaptic();
    const madhab: Madhab =
      selectedMadhab === "unsure" ? "hanafi" : selectedMadhab;
    await giveConsent();
    await updateSettings({
      enabled: true,
      madhab,
      madhabConfirmed: selectedMadhab !== "unsure",
      typicalCycleLength: cycleLength,
      typicalPeriodLength: periodLength,
      lifeStage,
      nifasMode: lifeStage === "postpartum",
    });
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const resolvedMadhab: Madhab =
    selectedMadhab === "unsure" ? "hanafi" : selectedMadhab;
  const currentRules = MADHAB_RULES[resolvedMadhab];

  const roseColor = theme.primary;
  const emeraldColor = theme.primary;

  const renderProgressDots = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            {
              backgroundColor:
                i === step
                  ? emeraldColor
                  : i < step
                    ? `${emeraldColor}60`
                    : `${theme.textMuted}30`,
              width: i === step ? 28 : 8,
            },
          ]}
        />
      ))}
    </View>
  );

  const renderWelcome = () => (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={styles.stepContent}
    >
      <View style={styles.heroSection}>
        <View
          style={{
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: `${roseColor}12`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <NuraiGlass
            radius={56}
            tint={theme.primaryMuted}
            style={styles.heroGradient}
          >
            <AppIcon name="heart" size={50} color={theme.primary} />
          </NuraiGlass>
        </View>
      </View>

      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <ThemedText
          type="h1"
          style={[styles.welcomeTitle, { marginTop: Spacing.lg }]}
        >
          {"Bismillah. Welcome to your private health companion"}
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <ThemedText
          type="body"
          style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}
        >
          {
            "This space is designed with your faith and privacy in mind. Health entries are saved locally by default with clear delete controls."
          }
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).duration(400)}
        style={styles.welcomeFeatures}
      >
        {[
          { icon: "shield" as const, text: "Private & secure" },
          { icon: "book" as const, text: "Faith-aligned guidance" },
          { icon: "activity" as const, text: "Cycle tracking" },
        ].map((item, index) => (
          <View
            key={index}
            style={[
              styles.featureRow,
              {
                backgroundColor: `${emeraldColor}10`,
                borderColor: theme.primaryBorder,
              },
            ]}
          >
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: `${emeraldColor}15` },
              ]}
            >
              <AppIcon name={item.icon} size={20} color={emeraldColor} />
            </View>
            <ThemedText type="body" style={{ fontFamily: Fonts?.sansSemiBold }}>
              {item.text}
            </ThemedText>
          </View>
        ))}
      </Animated.View>
    </Animated.View>
  );

  const renderMadhabSelection = () => (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={styles.stepContent}
    >
      <Animated.View entering={FadeInDown.delay(0).duration(400)}>
        <ThemedText type="h2" style={styles.stepTitle}>
          {"Which school of thought do you follow?"}
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.stepSubtitle, { color: theme.textSecondary }]}
        >
          {
            "This selects the reference table shown in the tracker. NurAI does not issue a personal ruling from dates, and you can change this anytime."
          }
        </ThemedText>
      </Animated.View>

      <View style={styles.optionsGrid}>
        {MADHAB_OPTIONS.map((option, index) => {
          const isSelected = selectedMadhab === option.key;
          return (
            <Animated.View
              key={option.key}
              entering={FadeInDown.delay(80 + index * 50).duration(400)}
            >
              <Pressable
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected
                      ? `${emeraldColor}12`
                      : theme.surfaceGlass,
                    borderColor: isSelected ? emeraldColor : theme.borderSubtle,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => {
                  triggerHaptic();
                  setSelectedMadhab(option.key);
                }}
                testID={`button-madhab-${option.key}`}
              >
                <GeometricCardPattern
                  color={emeraldColor}
                  opacity={isSelected ? 0.035 : 0.018}
                />
                <View
                  style={[
                    styles.radioOuter,
                    {
                      borderColor: isSelected ? emeraldColor : theme.textMuted,
                    },
                  ]}
                >
                  {isSelected ? (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: emeraldColor },
                      ]}
                    />
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    type="body"
                    style={{
                      fontFamily: isSelected
                        ? Fonts?.sansSemiBold
                        : Fonts?.sans,
                      color: isSelected ? emeraldColor : theme.text,
                    }}
                  >
                    {option.label}
                  </ThemedText>
                  {option.key !== "unsure" ? (
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.textMuted,
                        marginTop: 2,
                        fontSize: 11,
                      }}
                    >
                      {`Period: ${MADHAB_RULES[option.key].minHaidh}-${MADHAB_RULES[option.key].maxHaidh} days, Purity: ${MADHAB_RULES[option.key].minTuhr}+ days`}
                    </ThemedText>
                  ) : null}
                </View>
                {option.key === "unsure" ? (
                  <AppIcon
                    name="help-circle"
                    size={16}
                    color={theme.textMuted}
                    style={{ marginLeft: "auto" }}
                  />
                ) : null}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {selectedMadhab !== "unsure" ? (
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <View
            style={[
              styles.rulesCard,
              {
                backgroundColor: `${roseColor}08`,
                borderColor: `${roseColor}20`,
                overflow: "hidden",
              },
            ]}
          >
            <GeometricCardPattern color={roseColor} opacity={0.012} />
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                backgroundColor: theme.primary,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }}
            />
            <View style={styles.rulesHeader}>
              <AppIcon name="info" size={16} color={roseColor} />
              <ThemedText
                type="small"
                style={{ color: roseColor, fontFamily: Fonts?.sansSemiBold }}
              >
                {`${currentRules.name} reference`}
              </ThemedText>
            </View>
            <View style={styles.rulesGrid}>
              <View style={styles.ruleItem}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, fontSize: 13 }}
                >
                  {"Min Haidh"}
                </ThemedText>
                <ThemedText
                  type="body"
                  style={{ fontFamily: Fonts?.sansBold, fontSize: 17 }}
                >{`${currentRules.minHaidh}d`}</ThemedText>
              </View>
              <View style={styles.ruleItem}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, fontSize: 13 }}
                >
                  {"Max Haidh"}
                </ThemedText>
                <ThemedText
                  type="body"
                  style={{ fontFamily: Fonts?.sansBold, fontSize: 17 }}
                >{`${currentRules.maxHaidh}d`}</ThemedText>
              </View>
              <View style={styles.ruleItem}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, fontSize: 13 }}
                >
                  {"Min Tuhr"}
                </ThemedText>
                <ThemedText
                  type="body"
                  style={{ fontFamily: Fonts?.sansBold, fontSize: 17 }}
                >{`${currentRules.minTuhr}d`}</ThemedText>
              </View>
              <View style={styles.ruleItem}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, fontSize: 13 }}
                >
                  {"Max Nifas"}
                </ThemedText>
                <ThemedText
                  type="body"
                  style={{ fontFamily: Fonts?.sansBold, fontSize: 17 }}
                >{`${currentRules.maxNifas}d`}</ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );

  const renderCycleInfo = () => (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={styles.stepContent}
    >
      <Animated.View entering={FadeInDown.delay(0).duration(400)}>
        <ThemedText type="h2" style={styles.stepTitle}>
          {"Tell us about your cycle"}
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.stepSubtitle, { color: theme.textSecondary }]}
        >
          {"Approximate is fine"}
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <View
          style={[
            styles.counterCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View style={styles.counterHeader}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: `${emeraldColor}15`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppIcon name="calendar" size={20} color={emeraldColor} />
            </View>
            <ThemedText type="body" style={{ fontFamily: Fonts?.sansSemiBold }}>
              {"Cycle Length"}
            </ThemedText>
          </View>
          <View style={styles.counterRow}>
            <Pressable
              style={[
                styles.counterButton,
                { backgroundColor: `${emeraldColor}15` },
              ]}
              onPress={() => {
                triggerHaptic();
                setCycleLength(Math.max(21, cycleLength - 1));
              }}
              testID="button-cycle-minus"
            >
              <AppIcon name="minus" size={20} color={emeraldColor} />
            </Pressable>
            <View style={styles.counterValue}>
              <ThemedText
                type="h1"
                style={{ fontFamily: Fonts?.sansBold }}
              >{`${cycleLength}`}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {"days"}
              </ThemedText>
            </View>
            <Pressable
              style={[
                styles.counterButton,
                { backgroundColor: `${emeraldColor}15` },
              ]}
              onPress={() => {
                triggerHaptic();
                setCycleLength(Math.min(45, cycleLength + 1));
              }}
              testID="button-cycle-plus"
            >
              <AppIcon name="plus" size={20} color={emeraldColor} />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <View
          style={[
            styles.counterCard,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View style={styles.counterHeader}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: `${roseColor}15`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppIcon name="droplet" size={20} color={roseColor} />
            </View>
            <ThemedText type="body" style={{ fontFamily: Fonts?.sansSemiBold }}>
              {"Period Length"}
            </ThemedText>
          </View>
          <View style={styles.counterRow}>
            <Pressable
              style={[
                styles.counterButton,
                { backgroundColor: `${roseColor}15` },
              ]}
              onPress={() => {
                triggerHaptic();
                setPeriodLength(Math.max(1, periodLength - 1));
              }}
              testID="button-period-minus"
            >
              <AppIcon name="minus" size={20} color={roseColor} />
            </Pressable>
            <View style={styles.counterValue}>
              <ThemedText
                type="h1"
                style={{ fontFamily: Fonts?.sansBold }}
              >{`${periodLength}`}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {"days"}
              </ThemedText>
            </View>
            <Pressable
              style={[
                styles.counterButton,
                { backgroundColor: `${roseColor}15` },
              ]}
              onPress={() => {
                triggerHaptic();
                setPeriodLength(Math.min(15, periodLength + 1));
              }}
              testID="button-period-plus"
            >
              <AppIcon name="plus" size={20} color={roseColor} />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <Pressable
          style={[
            styles.checkboxRow,
            {
              backgroundColor: theme.surfaceGlass,
              borderWidth: 1,
              borderColor: theme.borderSubtle,
            },
          ]}
          onPress={() => {
            triggerHaptic();
            setIrregularCycle(!irregularCycle);
          }}
          testID="button-irregular-cycle"
        >
          <AppIcon
            name={irregularCycle ? "check-square" : "square"}
            size={22}
            color={irregularCycle ? emeraldColor : theme.textSecondary}
          />
          <ThemedText type="body" style={{ color: theme.text, flex: 1 }}>
            {"I'm not sure / irregular"}
          </ThemedText>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );

  const renderLifeStage = () => (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={styles.stepContent}
    >
      <Animated.View entering={FadeInDown.delay(0).duration(400)}>
        <ThemedText type="h2" style={styles.stepTitle}>
          {"What best describes you right now?"}
        </ThemedText>
      </Animated.View>

      <View style={styles.lifeStageGrid}>
        {LIFE_STAGES.map((stage, index) => {
          const isSelected = lifeStage === stage.key;
          return (
            <Animated.View
              key={stage.key}
              entering={FadeInDown.delay(60 + index * 40).duration(400)}
            >
              <Pressable
                style={[
                  styles.lifeStageCard,
                  {
                    backgroundColor: isSelected
                      ? `${emeraldColor}15`
                      : theme.surfaceGlass,
                    borderColor: isSelected ? emeraldColor : theme.borderSubtle,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => {
                  triggerHaptic();
                  setLifeStage(stage.key);
                }}
                testID={`button-stage-${stage.key}`}
              >
                <View
                  style={[
                    styles.lifeStageIcon,
                    {
                      backgroundColor: isSelected
                        ? `${emeraldColor}20`
                        : `${theme.textMuted}15`,
                    },
                  ]}
                >
                  <AppIcon
                    name={stage.icon}
                    size={20}
                    color={isSelected ? emeraldColor : theme.textSecondary}
                  />
                </View>
                <ThemedText
                  type="small"
                  style={{
                    fontFamily: isSelected ? Fonts?.sansSemiBold : Fonts?.sans,
                    color: isSelected ? emeraldColor : theme.text,
                    textAlign: "center",
                  }}
                >
                  {stage.label}
                </ThemedText>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );

  const renderNotifications = () => (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={styles.stepContent}
    >
      <Animated.View entering={FadeInDown.delay(0).duration(400)}>
        <ThemedText type="h2" style={styles.stepTitle}>
          {"Would you like gentle reminders?"}
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.stepSubtitle, { color: theme.textSecondary }]}
        >
          {"You can adjust these anytime"}
        </ThemedText>
      </Animated.View>

      {[
        {
          key: "periodPrediction" as const,
          label: "Period prediction alerts",
          icon: "bell" as const,
        },
        {
          key: "ghuslReminders" as const,
          label: "Ghusl reminders",
          icon: "droplet" as const,
        },
        {
          key: "qadaFasting" as const,
          label: "Qada fasting reminders",
          icon: "moon" as const,
        },
        {
          key: "dailyMood" as const,
          label: "Daily mood check-in",
          icon: "smile" as const,
        },
      ].map((item, index) => (
        <Animated.View
          key={item.key}
          entering={FadeInDown.delay(80 + index * 60).duration(400)}
        >
          <View
            style={[
              styles.toggleCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <View
              style={[
                styles.toggleIcon,
                { backgroundColor: `${emeraldColor}12` },
              ]}
            >
              <AppIcon name={item.icon} size={22} color={emeraldColor} />
            </View>
            <ThemedText
              type="body"
              style={{ flex: 1, fontFamily: Fonts?.sans }}
            >
              {item.label}
            </ThemedText>
            <Switch
              value={notifications[item.key]}
              onValueChange={(value) => {
                triggerHaptic();
                setNotifications({ ...notifications, [item.key]: value });
              }}
              trackColor={{
                false: theme.switchTrack,
                true: `${emeraldColor}50`,
              }}
              thumbColor={notifications[item.key] ? emeraldColor : "#f4f3f4"}
              testID={`switch-${item.key}`}
            />
          </View>
        </Animated.View>
      ))}
    </Animated.View>
  );

  const renderPrivacy = () => (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={styles.stepContent}
    >
      <Animated.View entering={FadeInDown.delay(0).duration(400)}>
        <ThemedText type="h2" style={styles.stepTitle}>
          {"Your data is your amanah (trust)"}
        </ThemedText>
      </Animated.View>

      <View style={styles.privacyCards}>
        {PRIVACY_CARDS.map((card, index) => (
          <Animated.View
            key={card.title}
            entering={FadeInDown.delay(60 + index * 50).duration(400)}
          >
            <View
              style={[
                styles.privacyCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  top: 12,
                  bottom: 12,
                  width: 3,
                  borderRadius: 2,
                  backgroundColor: `${emeraldColor}33`,
                }}
              />
              <View
                style={[
                  styles.privacyCardIcon,
                  { backgroundColor: `${emeraldColor}12` },
                ]}
              >
                <AppIcon name={card.icon} size={18} color={emeraldColor} />
              </View>
              <View style={styles.privacyCardContent}>
                <ThemedText
                  type="body"
                  style={{ fontFamily: Fonts?.sansSemiBold }}
                >
                  {card.title}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  {card.description}
                </ThemedText>
              </View>
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeInDown.delay(380).duration(400)}>
        <View
          style={[
            styles.privacyCard,
            {
              backgroundColor: `${roseColor}08`,
              borderColor: `${roseColor}20`,
            },
          ]}
        >
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 12,
              bottom: 12,
              width: 3,
              borderRadius: 2,
              backgroundColor: `${roseColor}33`,
            }}
          />
          <View
            style={[
              styles.privacyCardIcon,
              { backgroundColor: `${roseColor}12` },
            ]}
          >
            <AppIcon name="alert-circle" size={18} color={roseColor} />
          </View>
          <View style={styles.privacyCardContent}>
            <ThemedText type="body" style={{ fontFamily: Fonts?.sansSemiBold }}>
              {"Important Disclaimer"}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {
                "This tool is for personal tracking only. It is not medical advice and does not replace consultation with a qualified healthcare provider or Islamic scholar."
              }
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(460).duration(400)}>
        <Pressable
          style={[
            styles.checkboxRow,
            {
              backgroundColor: theme.surfaceGlass,
              borderWidth: 1,
              borderColor: theme.borderSubtle,
            },
          ]}
          onPress={() => {
            triggerHaptic();
            setAgreed(!agreed);
          }}
          accessible
          accessibilityRole="checkbox"
          accessibilityLabel="I understand and agree to use Women's Health for personal tracking"
          accessibilityState={{ checked: agreed }}
          accessibilityActions={[
            { name: "activate", label: "Toggle agreement" },
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "activate") {
              triggerHaptic();
              setAgreed((current) => !current);
            }
          }}
          testID="button-agree-consent"
        >
          <AppIcon
            name={agreed ? "check-square" : "square"}
            size={24}
            color={agreed ? emeraldColor : theme.textSecondary}
          />
          <ThemedText
            type="body"
            style={{
              color: theme.text,
              flex: 1,
              fontFamily: Fonts?.sansSemiBold,
            }}
          >
            {"I understand and agree"}
          </ThemedText>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 0:
        return renderWelcome();
      case 1:
        return renderMadhabSelection();
      case 2:
        return renderCycleInfo();
      case 3:
        return renderLifeStage();
      case 4:
        return renderNotifications();
      case 5:
        return renderPrivacy();
      default:
        return null;
    }
  };

  const isLastStep = step === TOTAL_STEPS - 1;
  const canProceed = isLastStep ? agreed : true;
  const buttonLabel =
    step === 0 ? "Get Started" : isLastStep ? "Begin" : "Continue";

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Aurora />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        {step > 0 ? (
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Previous setup step"
            testID="button-back"
          >
            <NuraiGlass
              pointerEvents="none"
              radius={20}
              tint={theme.primarySubtle}
              style={StyleSheet.absoluteFillObject}
            />
            <AppIcon name="arrow-left" size={24} color={theme.text} />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
        {renderProgressDots()}
        <Pressable
          onPress={() => {
            triggerHaptic();
            navigation.goBack();
          }}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close Women's Health setup"
          testID="button-close"
        >
          <NuraiGlass
            pointerEvents="none"
            radius={20}
            tint={theme.primarySubtle}
            style={StyleSheet.absoluteFillObject}
          />
          <AppIcon name="x" size={22} color={theme.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        key={step}
      >
        {renderCurrentStep()}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.md,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            !canProceed && styles.primaryButtonDisabled,
            pressed && canProceed && { opacity: 0.9 },
          ]}
          onPress={
            canProceed ? (isLastStep ? handleBegin : handleNext) : undefined
          }
          disabled={!canProceed}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
          accessibilityState={{ disabled: !canProceed }}
          testID={isLastStep ? "button-begin" : "button-next"}
        >
          <View
            style={[
              styles.primaryButtonGradient,
              {
                backgroundColor: canProceed
                  ? theme.primary
                  : theme.disabledBackground,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.primaryButtonText,
                {
                  color: canProceed ? theme.primaryForeground : theme.textMuted,
                },
              ]}
            >
              {buttonLabel}
            </ThemedText>
            {!isLastStep ? (
              <AppIcon
                name="arrow-right"
                size={18}
                color={canProceed ? theme.primaryForeground : theme.textMuted}
              />
            ) : null}
          </View>
        </Pressable>
      </View>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    overflow: "hidden",
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    overflow: "hidden",
  },
  progressContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  stepContent: {
    gap: Spacing.xl,
  },
  heroSection: {
    alignItems: "center",
    marginTop: Spacing["2xl"],
    marginBottom: Spacing.md,
  },
  heroGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  welcomeTitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.sm,
  },
  welcomeSubtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.md,
    lineHeight: 22,
  },
  welcomeFeatures: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "transparent",
    overflow: "hidden",
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    marginBottom: Spacing.xs,
  },
  stepSubtitle: {
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  optionsGrid: {
    gap: Spacing.sm,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: Spacing.md,
    overflow: "hidden",
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  rulesCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.md,
    overflow: "hidden",
  },
  rulesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  rulesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ruleItem: {
    alignItems: "center",
    gap: 2,
  },
  counterCard: {
    padding: Spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.lg,
    overflow: "hidden",
  },
  counterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing["2xl"],
  },
  counterButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: {
    alignItems: "center",
    minWidth: 70,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  lifeStageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  lifeStageCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: Spacing.md,
  },
  lifeStageIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.md,
  },
  toggleIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyCards: {
    gap: Spacing.sm,
  },
  privacyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.md,
  },
  privacyCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyCardContent: {
    flex: 1,
    gap: 2,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  primaryButton: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: Spacing.sm,
    borderRadius: 20,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: Fonts?.sansSemiBold,
  },
});
