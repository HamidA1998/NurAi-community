import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, CategoryColors } from "@/constants/theme";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AppIcon } from "@/components/icons";

const WUDU_STEPS = [
  {
    id: 1,
    title: "Intention (Niyyah)",
    description:
      "Begin by making the intention in your heart to perform wudu for the sake of Allah. The intention does not need to be spoken aloud.",
    arabic: null,
  },
  {
    id: 2,
    title: "Wash Hands",
    description:
      "Wash both hands up to the wrists three times, making sure water reaches between the fingers.",
    arabic: null,
  },
  {
    id: 3,
    title: "Rinse Mouth",
    description:
      "Take water into your mouth and rinse it thoroughly three times, swirling it around before spitting it out.",
    arabic: null,
  },
  {
    id: 4,
    title: "Clean Nose",
    description:
      "Sniff water into your nostrils and blow it out three times, using your left hand to clean.",
    arabic: null,
  },
  {
    id: 5,
    title: "Wash Face",
    description:
      "Wash your entire face three times, from the hairline to the chin and from ear to ear.",
    arabic: null,
  },
  {
    id: 6,
    title: "Wash Right Arm",
    description:
      "Wash your right arm from the fingertips to the elbow three times, ensuring water covers the entire area.",
    arabic: null,
  },
  {
    id: 7,
    title: "Wash Left Arm",
    description:
      "Wash your left arm from the fingertips to the elbow three times in the same manner.",
    arabic: null,
  },
  {
    id: 8,
    title: "Wipe Head",
    description:
      "Wet your hands and wipe over your head once, from the front to the back and then back to the front.",
    arabic: null,
  },
  {
    id: 9,
    title: "Clean Ears",
    description:
      "Using wet fingers, wipe the inside of your ears with your index fingers and the outside with your thumbs, once.",
    arabic: null,
  },
  {
    id: 10,
    title: "Wash Right Foot",
    description:
      "Wash your right foot up to the ankle three times, making sure water reaches between the toes.",
    arabic: null,
  },
  {
    id: 11,
    title: "Wash Left Foot",
    description:
      "Wash your left foot up to the ankle three times, ensuring water passes between the toes.",
    arabic: null,
  },
  {
    id: 12,
    title: "Dua After Wudu",
    description:
      "Recite the supplication after completing wudu. This completes the ablution and earns extra reward.",
    arabic:
      "\u0623\u0634\u0647\u062F \u0623\u0646 \u0644\u0627 \u0625\u0644\u0647 \u0625\u0644\u0627 \u0627\u0644\u0644\u0647 \u0648\u062D\u062F\u0647 \u0644\u0627 \u0634\u0631\u064A\u0643 \u0644\u0647\u060C \u0648\u0623\u0634\u0647\u062F \u0623\u0646 \u0645\u062D\u0645\u062F\u0627\u064B \u0639\u0628\u062F\u0647 \u0648\u0631\u0633\u0648\u0644\u0647",
  },
];

const SALAH_STEPS = [
  {
    id: 1,
    title: "Standing (Qiyam)",
    description:
      "Stand facing the Qibla (direction of the Kaaba). Make your intention for the specific prayer you are about to perform.",
    arabic: null,
  },
  {
    id: 2,
    title: "Opening Takbir",
    description:
      "Raise both hands to ear level and say the opening Takbir to begin the prayer.",
    arabic: "\u0627\u0644\u0644\u0647 \u0623\u0643\u0628\u0631",
  },
  {
    id: 3,
    title: "Opening Dua (Thana)",
    description:
      "Place your right hand over your left on your chest and recite the opening supplication.",
    arabic:
      "\u0633\u0628\u062D\u0627\u0646\u0643 \u0627\u0644\u0644\u0647\u0645 \u0648\u0628\u062D\u0645\u062F\u0643\u060C \u0648\u062A\u0628\u0627\u0631\u0643 \u0627\u0633\u0645\u0643\u060C \u0648\u062A\u0639\u0627\u0644\u0649 \u062C\u062F\u0643\u060C \u0648\u0644\u0627 \u0625\u0644\u0647 \u063A\u064A\u0631\u0643",
  },
  {
    id: 4,
    title: "Recite Al-Fatihah",
    description:
      "Recite Surah Al-Fatihah, the opening chapter of the Quran. This is an essential pillar of every unit (rak'ah) of prayer.",
    arabic:
      "\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062D\u0645\u0646 \u0627\u0644\u0631\u062D\u064A\u0645",
  },
  {
    id: 5,
    title: "Recite Another Surah",
    description:
      "After Al-Fatihah, recite any other surah or verses from the Quran. This is done in the first two units of prayer.",
    arabic: null,
  },
  {
    id: 6,
    title: "Ruku (Bowing)",
    description:
      "Say 'Allahu Akbar' and bow down, placing your hands on your knees. Keep your back straight and say the dhikr three times.",
    arabic:
      "\u0633\u0628\u062D\u0627\u0646 \u0631\u0628\u064A \u0627\u0644\u0639\u0638\u064A\u0645",
  },
  {
    id: 7,
    title: "Standing from Ruku",
    description:
      "Rise from bowing to a standing position while saying the dhikr. Stand straight and still for a moment.",
    arabic:
      "\u0633\u0645\u0639 \u0627\u0644\u0644\u0647 \u0644\u0645\u0646 \u062D\u0645\u062F\u0647\u060C \u0631\u0628\u0646\u0627 \u0648\u0644\u0643 \u0627\u0644\u062D\u0645\u062F",
  },
  {
    id: 8,
    title: "First Sujud (Prostration)",
    description:
      "Say 'Allahu Akbar' and prostrate with your forehead, nose, palms, knees, and toes touching the ground. Say the dhikr three times.",
    arabic:
      "\u0633\u0628\u062D\u0627\u0646 \u0631\u0628\u064A \u0627\u0644\u0623\u0639\u0644\u0649",
  },
  {
    id: 9,
    title: "Sitting Between Sujud",
    description:
      "Rise from prostration to a sitting position saying 'Allahu Akbar.' Sit upright briefly and ask for forgiveness.",
    arabic: "\u0631\u0628 \u0627\u063A\u0641\u0631 \u0644\u064A",
  },
  {
    id: 10,
    title: "Second Sujud",
    description:
      "Perform the second prostration in the same manner as the first, saying the dhikr three times.",
    arabic:
      "\u0633\u0628\u062D\u0627\u0646 \u0631\u0628\u064A \u0627\u0644\u0623\u0639\u0644\u0649",
  },
  {
    id: 11,
    title: "Tashahhud (Sitting)",
    description:
      "In the final sitting (or after every two rak'ahs), recite the Tashahhud while pointing the index finger.",
    arabic:
      "\u0627\u0644\u062A\u062D\u064A\u0627\u062A \u0644\u0644\u0647 \u0648\u0627\u0644\u0635\u0644\u0648\u0627\u062A \u0648\u0627\u0644\u0637\u064A\u0628\u0627\u062A",
  },
  {
    id: 12,
    title: "Salawat upon the Prophet",
    description:
      "In the final sitting, after the Tashahhud, send blessings upon Prophet Muhammad and his family.",
    arabic:
      "\u0627\u0644\u0644\u0647\u0645 \u0635\u0644\u0651 \u0639\u0644\u0649 \u0645\u062D\u0645\u062F \u0648\u0639\u0644\u0649 \u0622\u0644 \u0645\u062D\u0645\u062F",
  },
  {
    id: 13,
    title: "Tasleem (Salam)",
    description:
      "End the prayer by turning your head to the right and then to the left, saying the salam each time.",
    arabic:
      "\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064A\u0643\u0645 \u0648\u0631\u062D\u0645\u0629 \u0627\u0644\u0644\u0647",
  },
];

export default function SalahGuideScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<"wudu" | "salah">("wudu");

  const steps = activeTab === "wudu" ? WUDU_STEPS : SALAH_STEPS;
  const emerald = isDark ? CategoryColors.emerald.dark : CategoryColors.emerald;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3" style={styles.headerTitle}>
          Salah & Wudu Guide
        </ThemedText>
        <View style={styles.backButton} />
      </View>

      <Animated.View
        entering={FadeInDown.duration(400)}
        style={styles.tabContainer}
      >
        <View
          style={[
            styles.tabBar,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Pressable
            onPress={() => setActiveTab("wudu")}
            style={[
              styles.tab,
              activeTab === "wudu" ? { backgroundColor: theme.primary } : null,
            ]}
            testID="tab-wudu"
          >
            <ThemedText
              type="small"
              style={{
                color:
                  activeTab === "wudu" ? theme.buttonText : theme.textSecondary,
                fontWeight: "600",
              }}
            >
              Wudu
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("salah")}
            style={[
              styles.tab,
              activeTab === "salah" ? { backgroundColor: theme.primary } : null,
            ]}
            testID="tab-salah"
          >
            <ThemedText
              type="small"
              style={{
                color:
                  activeTab === "salah"
                    ? theme.buttonText
                    : theme.textSecondary,
                fontWeight: "600",
              }}
            >
              Salah
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
      >
        {steps.map((step, index) => (
          <Animated.View
            key={`${activeTab}-${step.id}`}
            entering={FadeInDown.delay(index * 50).duration(400)}
          >
            <View
              style={[
                styles.stepCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <View style={styles.stepHeader}>
                <View
                  style={[styles.stepBadge, { backgroundColor: emerald.bg }]}
                >
                  <ThemedText
                    type="caption"
                    style={[styles.stepBadgeText, { color: emerald.text }]}
                  >
                    {step.id}
                  </ThemedText>
                </View>
                <ThemedText type="h4" style={styles.stepTitle}>
                  {step.title}
                </ThemedText>
              </View>
              <ThemedText
                type="small"
                style={[styles.stepDescription, { color: theme.textSecondary }]}
              >
                {step.description}
              </ThemedText>
              {step.arabic ? (
                <View
                  style={[
                    styles.arabicContainer,
                    {
                      backgroundColor: isDark
                        ? theme.backgroundSecondary
                        : theme.surfaceElevated,
                    },
                  ]}
                >
                  <ThemedText
                    type="body"
                    style={[styles.arabicText, { color: theme.primary }]}
                  >
                    {step.arabic}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </Animated.View>
        ))}
      </ScrollView>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    textAlign: "center",
    flex: 1,
  },
  tabContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  stepCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  stepBadgeText: {
    fontWeight: "700",
  },
  stepTitle: {
    flex: 1,
  },
  stepDescription: {
    lineHeight: 20,
    marginLeft: 44,
  },
  arabicContainer: {
    marginTop: Spacing.md,
    marginLeft: 44,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  arabicText: {
    fontSize: 18,
    textAlign: "right",
    lineHeight: 28,
    fontWeight: "600",
  },
});
